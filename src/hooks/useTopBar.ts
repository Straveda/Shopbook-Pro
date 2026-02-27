// FILE: src/hooks/useTopBar.ts
// ============================================
// ALL TOPBAR HOOKS IN ONE FILE
// ============================================

import { useState, useEffect } from 'react';
import { topbarApi } from '@/services/topbarApi';

// ============================================
// TYPES
// ============================================

export interface User {
  _id: string;
  name: string;
  email: string;
  createdAt?: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  icon: string;
  count: number;
  read: boolean;
  timestamp: Date;
}

export interface SearchResultItem {
  _id: string;
  name?: string;
  phone?: string;
  saleNumber?: string;
  customerName?: string;
  totalAmount?: number;
  status?: string;
  invoiceNo?: string;
  outstanding?: number;
  type: 'customer' | 'sale' | 'invoice';
}

export interface SearchResult {
  customers: SearchResultItem[];
  invoices: SearchResultItem[];
  sales: SearchResultItem[];
  results: SearchResultItem[];
}

export interface QuickSaleItem {
  itemName: string;
  quantity: number;
  price: number;
}

// ============================================
// HOOK 1: useTopBar
// ============================================

export interface UseTopBarReturn {
  user: User | null;
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  updateProfile: (name?: string, email?: string) => Promise<User>;
  logout: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
}

export function useTopBar(): UseTopBarReturn {
  const [user, setUser] = useState<User | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch user profile on mount
  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        const userData = await topbarApi.getUserProfile();
        setUser(userData);
      } catch (error) {
        console.error('Failed to load user profile:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUserProfile();
  }, []);

  // Fetch notifications on mount and setup interval
  useEffect(() => {
    const loadNotifications = async () => {
      try {
        const data = await topbarApi.getNotifications();
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
      } catch (error) {
        console.error('Failed to load notifications:', error);
      }
    };

    loadNotifications();

    // Refresh notifications every 30 seconds
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const updateProfile = async (name?: string, email?: string): Promise<User> => {
    try {
      const updatedUser = await topbarApi.updateUserProfile(name, email);
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      return updatedUser;
    } catch (error) {
      console.error('Failed to update profile:', error);
      throw error;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await topbarApi.logout();
    } catch (error) {
      console.error('Logout error:', error);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  };

  const refreshNotifications = async (): Promise<void> => {
    try {
      const data = await topbarApi.getNotifications();
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch (error) {
      console.error('Failed to refresh notifications:', error);
    }
  };

  return {
    user,
    notifications,
    unreadCount,
    isLoading,
    updateProfile,
    logout,
    refreshNotifications,
  };
}

// ============================================
// HOOK 2: useSearch
// ============================================

export interface UseSearchReturn {
  results: SearchResult;
  isSearching: boolean;
  search: (query: string) => Promise<void>;
}

export function useSearch(): UseSearchReturn {
  const [results, setResults] = useState<SearchResult>({
    customers: [],
    invoices: [],
    sales: [],
    results: [],
  });
  const [isSearching, setIsSearching] = useState(false);

  const search = async (query: string): Promise<void> => {
    if (!query.trim()) {
      setResults({
        customers: [],
        invoices: [],
        sales: [],
        results: [],
      });
      return;
    }

    setIsSearching(true);
    try {
      const searchResults = await topbarApi.search(query);
      setResults(searchResults);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  return {
    results,
    isSearching,
    search,
  };
}

// ============================================
// HOOK 3: useQuickSale
// ============================================

export interface UseQuickSaleReturn {
  isLoading: boolean;
  error: string | null;
  createSale: (
    customerName: string | undefined,
    items: QuickSaleItem[],
    totalAmount: number,
    paidAmount?: number,
    notes?: string
  ) => Promise<any>;
}

export function useQuickSale(): UseQuickSaleReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createSale = async (
    customerName: string | undefined,
    items: QuickSaleItem[],
    totalAmount: number,
    paidAmount?: number,
    notes?: string
  ): Promise<any> => {
    setIsLoading(true);
    setError(null);

    try {
      if (!items || items.length === 0) {
        throw new Error('At least one item is required');
      }

      if (!totalAmount || totalAmount <= 0) {
        throw new Error('Total amount must be greater than 0');
      }

      const sale = await topbarApi.createQuickSale({
        customerName,
        items,
        totalAmount,
        paidAmount,
        notes,
      });

      return sale;
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.message || err.message || 'Failed to create quick sale';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    error,
    createSale,
  };
}