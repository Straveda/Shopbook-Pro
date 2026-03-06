// FILE: src/services/reportsService.ts
import api from './api';

export interface ReportResponse {
  success: boolean;
  data?: any[];
  stats?: any;
  message?: string;
}

export interface ReportFilters {
  fromDate?: string;
  toDate?: string;
  category?: string;
}

const reportsService = {
  // Get inventory/stock report
  getInventoryReport: async (filters?: ReportFilters): Promise<ReportResponse> => {
    try {
      const params: any = {};
      if (filters?.fromDate) params.fromDate = filters.fromDate;
      if (filters?.toDate) params.toDate = filters.toDate;
      const response = await api.get<ReportResponse>('/reports/inventory', { params });
      return response.data || { success: true, data: [] };
    } catch (error: any) {
      console.error('Error fetching inventory report:', error);
      return {
        success: false,
        data: [],
        message: error.response?.data?.message || 'Failed to fetch inventory report'
      };
    }
  },

  // Get daily sales report
  getDailyReport: async (filters?: ReportFilters): Promise<ReportResponse> => {
    try {
      const params: any = {};
      if (filters?.fromDate) params.fromDate = filters.fromDate;
      if (filters?.toDate) params.toDate = filters.toDate;
      const response = await api.get<ReportResponse>('/reports/daily', { params });
      return response.data || { success: true, data: [] };
    } catch (error: any) {
      console.error('Error fetching daily report:', error);
      return {
        success: false,
        data: [],
        message: error.response?.data?.message || 'Failed to fetch daily report'
      };
    }
  },

  // Get aging report (customer outstanding)
  getAgingReport: async (filters?: ReportFilters): Promise<ReportResponse> => {
    try {
      const params: any = {};
      if (filters?.fromDate) params.fromDate = filters.fromDate;
      if (filters?.toDate) params.toDate = filters.toDate;
      if (filters?.category && filters.category !== 'all') params.category = filters.category;
      const response = await api.get<ReportResponse>('/reports/aging', { params });
      return response.data || { success: true, data: [] };
    } catch (error: any) {
      console.error('Error fetching aging report:', error);
      return {
        success: false,
        data: [],
        message: error.response?.data?.message || 'Failed to fetch aging report'
      };
    }
  },

  // Get services report
  getServicesReport: async (filters?: ReportFilters): Promise<ReportResponse> => {
    try {
      const params: any = {};
      if (filters?.fromDate) params.fromDate = filters.fromDate;
      if (filters?.toDate) params.toDate = filters.toDate;
      const response = await api.get<ReportResponse>('/reports/services', { params });
      return response.data || { success: true, data: [] };
    } catch (error: any) {
      console.error('Error fetching services report:', error);
      return {
        success: false,
        data: [],
        message: error.response?.data?.message || 'Failed to fetch services report'
      };
    }
  },

  // Get dashboard statistics
  getDashboardStats: async (): Promise<ReportResponse> => {
    try {
      const response = await api.get<ReportResponse>('/reports/stats');
      return response.data || { success: false, message: 'No data received' };
    } catch (error: any) {
      console.error('Error fetching stats:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch statistics'
      };
    }
  }
};

export default reportsService;