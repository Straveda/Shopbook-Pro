// FILE: src/services/topbarApi.ts
import axios, { AxiosInstance } from 'axios';

// ✅ Fixed: Use import.meta.env instead of process.env
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

console.log('🔌 API Base URL:', API_BASE_URL);

interface User {
  _id: string;
  name: string;
  email: string;
  createdAt?: string;
}

interface SearchResult {
  customers: any[];
  invoices: any[];
  sales: any[];
  results: any[];
}

interface NotificationsData {
  notifications: any[];
  unreadCount: number;
  totalCount: number;
}

interface QuickSale {
  customerName?: string;
  items: any[];
  totalAmount: number;
  paidAmount?: number;
  notes?: string;
}

class TopBarApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: `${API_BASE_URL}/topbar`,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add token to all requests
    this.api.interceptors.request.use((config) => {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Handle response errors
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          console.log('🔓 Unauthorized - Clearing auth data');
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // ============================================
  // USER ENDPOINTS
  // ============================================

  /**
   * Get current user profile
   * GET /api/topbar/user/profile
   */
  async getUserProfile(): Promise<User> {
    try {
      console.log('📤 GET /api/topbar/user/profile');
      const response = await this.api.get('/user/profile');
      console.log('✅ User profile received:', response.data.data.email);
      return response.data.data;
    } catch (error) {
      console.error('❌ Failed to fetch user profile:', error);
      throw error;
    }
  }

  /**
   * Update user profile
   * PUT /api/topbar/user/profile
   */
  async updateUserProfile(name?: string, email?: string): Promise<User> {
    try {
      console.log('📤 PUT /api/topbar/user/profile', { name, email });
      const response = await this.api.put('/user/profile', { name, email });
      console.log('✅ User profile updated');
      return response.data.data;
    } catch (error) {
      console.error('❌ Failed to update user profile:', error);
      throw error;
    }
  }

  // ============================================
  // SEARCH ENDPOINTS
  // ============================================

  /**
   * Global search across customers, sales, invoices
   * GET /api/topbar/search?q=query
   */
  async search(query: string): Promise<SearchResult> {
    try {
      console.log('📤 GET /api/topbar/search?q=' + query);
      const response = await this.api.get('/search', {
        params: { q: query },
      });
      console.log('✅ Search results received:', {
        customers: response.data.data.customers.length,
        sales: response.data.data.sales.length,
        invoices: response.data.data.invoices.length,
      });
      return response.data.data;
    } catch (error) {
      console.error('❌ Search failed:', error);
      throw error;
    }
  }

  // ============================================
  // NOTIFICATIONS ENDPOINTS
  // ============================================

  /**
   * Get all notifications with unread count
   * GET /api/topbar/notifications
   */
  async getNotifications(): Promise<NotificationsData> {
    try {
      console.log('📤 GET /api/topbar/notifications');
      const response = await this.api.get('/notifications');
      console.log('✅ Notifications received:', {
        count: response.data.data.notifications.length,
        unread: response.data.data.unreadCount,
      });
      return response.data.data;
    } catch (error) {
      console.error('❌ Failed to fetch notifications:', error);
      throw error;
    }
  }

  // ============================================
  // QUICK SALE ENDPOINTS
  // ============================================

  /**
   * Create a quick/walk-in sale
   * POST /api/topbar/quick-sale
   */
  async createQuickSale(saleData: QuickSale): Promise<any> {
    try {
      console.log('📤 POST /api/topbar/quick-sale', saleData);
      const response = await this.api.post('/quick-sale', saleData);
      console.log('✅ Quick sale created:', response.data.data.saleNumber);
      return response.data.data;
    } catch (error) {
      console.error('❌ Failed to create quick sale:', error);
      throw error;
    }
  }

  // ============================================
  // STATS ENDPOINTS
  // ============================================

  /**
   * Get quick dashboard statistics
   * GET /api/topbar/stats/quick
   */
  async getQuickStats(): Promise<any> {
    try {
      console.log('📤 GET /api/topbar/stats/quick');
      const response = await this.api.get('/stats/quick');
      console.log('✅ Stats received:', response.data.data);
      return response.data.data;
    } catch (error) {
      console.error('❌ Failed to fetch stats:', error);
      throw error;
    }
  }

  // ============================================
  // LOGOUT ENDPOINTS
  // ============================================

  /**
   * Logout user
   * POST /api/topbar/logout
   */
  async logout(): Promise<void> {
    try {
      console.log('📤 POST /api/topbar/logout');
      await this.api.post('/logout');
      console.log('✅ Logout successful');
    } catch (error) {
      console.error('❌ Logout error:', error);
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }
}

export const topbarApi = new TopBarApiService();