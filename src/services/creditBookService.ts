// src/services/creditBookService.ts
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Get auth token from localStorage
const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export interface Credit {
  _id?: string;
  id?: number;
  customerId: string | number;
  customerName: string;
  customerPhone: string;
  amount: number;
  balance: number;
  givenOn: string;
  dueDate?: string;
  status: 'pending' | 'partial' | 'cleared' | 'overdue';
  service: string;
  note?: string;
  payments?: Payment[];
  reminders?: Reminder[];
  daysOverdue?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Payment {
  _id?: string;
  amount: number;
  paymentDate: string;
  paymentMethod: 'cash' | 'upi' | 'card' | 'bank_transfer' | 'other';
  note?: string;
}

export interface Reminder {
  _id?: string;
  sentAt: string;
  channel: 'whatsapp' | 'sms' | 'email';
  status: 'sent' | 'delivered' | 'failed' | 'read';
  message: string;
}

export interface CreditSummary {
  totalOutstanding: number;
  totalCredits: number;
  activeCredits: number;
  clearedCredits: number;
  overdueAmount: number;
  overdueCount: number;
  totalAmountGiven: number;
  totalAmountReceived: number;
}

export interface CreditFilters {
  search?: string;
  status?: string;
  customerId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

const creditBookService = {
  // Get all credits with filters
  getCredits: async (filters?: CreditFilters) => {
    try {
      const params = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== '') {
            params.append(key, String(value));
          }
        });
      }

      const response = await axios.get(`${API_BASE_URL}/credits?${params.toString()}`, {
        headers: getAuthHeader()
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch credits');
    }
  },

  // Get single credit by ID
  getCreditById: async (id: string) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/credits/${id}`, {
        headers: getAuthHeader()
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch credit');
    }
  },

  // Create new credit
  createCredit: async (creditData: Partial<Credit>) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/credits`, creditData, {
        headers: getAuthHeader()
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to create credit');
    }
  },

  // Update credit
  updateCredit: async (id: string, updates: Partial<Credit>) => {
    try {
      const response = await axios.put(`${API_BASE_URL}/credits/${id}`, updates, {
        headers: getAuthHeader()
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to update credit');
    }
  },

  // Delete credit
  deleteCredit: async (id: string) => {
    try {
      const response = await axios.delete(`${API_BASE_URL}/credits/${id}`, {
        headers: getAuthHeader()
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to delete credit');
    }
  },

  // Record payment
  recordPayment: async (creditId: string, paymentData: {
    amount: number;
    paymentMethod?: string;
    note?: string;
  }) => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/credits/${creditId}/payment`,
        paymentData,
        {
          headers: getAuthHeader()
        }
      );
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to record payment');
    }
  },

  // Send reminder
  sendReminder: async (creditId: string, reminderData?: {
    channel?: 'whatsapp' | 'sms' | 'email';
    message?: string;
  }) => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/credits/${creditId}/reminder`,
        reminderData || {},
        {
          headers: getAuthHeader()
        }
      );
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to send reminder');
    }
  },

  // Send bulk reminders
  sendBulkReminders: async (filter?: 'overdue' | 'all', channel: 'whatsapp' | 'sms' = 'whatsapp') => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/credits/reminders/bulk`,
        {
          filter: filter || 'overdue',
          channel
        },
        {
          headers: getAuthHeader()
        }
      );
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to send bulk reminders');
    }
  },

  // Get summary
  getSummary: async (filters?: {
    customerId?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    try {
      const params = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== '') {
            params.append(key, String(value));
          }
        });
      }

      const response = await axios.get(`${API_BASE_URL}/credits/summary/stats?${params.toString()}`, {
        headers: getAuthHeader()
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch summary');
    }
  },

  // Get customer summary
  getCustomerSummary: async (customerId: string) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/credits/customer/${customerId}`, {
        headers: getAuthHeader()
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch customer summary');
    }
  },

  // Get payment history
  getPaymentHistory: async (creditId: string) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/credits/${creditId}/payments`, {
        headers: getAuthHeader()
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch payment history');
    }
  }
};

export default creditBookService;