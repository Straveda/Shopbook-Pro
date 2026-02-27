// FILE: src/services/reportsService.ts
import api from './api';

export interface ReportResponse {
  success: boolean;
  data?: any[];
  stats?: any;
  message?: string;
}

const reportsService = {
  // Get inventory/stock report
  getInventoryReport: async (): Promise<ReportResponse> => {
    try {
      const response = await api.get('/reports/inventory');
      console.log('Inventory Report:', response.data);
      
      if (response.data && response.data.success) {
        return response.data;
      } else if (Array.isArray(response.data)) {
        return {
          success: true,
          data: response.data,
        };
      } else {
        return {
          success: false,
          data: [],
          message: 'Invalid response format'
        };
      }
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
  getDailyReport: async (): Promise<ReportResponse> => {
    try {
      const response = await api.get('/reports/daily');
      console.log('Daily Report:', response.data);
      
      if (response.data && response.data.success) {
        return response.data;
      } else if (Array.isArray(response.data)) {
        return {
          success: true,
          data: response.data,
        };
      } else {
        return {
          success: false,
          data: [],
          message: 'Invalid response format'
        };
      }
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
  getAgingReport: async (): Promise<ReportResponse> => {
    try {
      const response = await api.get('/reports/aging');
      console.log('Aging Report:', response.data);
      
      if (response.data && response.data.success) {
        return response.data;
      } else if (Array.isArray(response.data)) {
        return {
          success: true,
          data: response.data,
        };
      } else {
        return {
          success: false,
          data: [],
          message: 'Invalid response format'
        };
      }
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
  getServicesReport: async (): Promise<ReportResponse> => {
    try {
      const response = await api.get('/reports/services');
      console.log('Services Report:', response.data);
      
      if (response.data && response.data.success) {
        return response.data;
      } else if (Array.isArray(response.data)) {
        return {
          success: true,
          data: response.data,
        };
      } else {
        return {
          success: false,
          data: [],
          message: 'Invalid response format'
        };
      }
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
      const response = await api.get('/reports/stats');
      return response.data;
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