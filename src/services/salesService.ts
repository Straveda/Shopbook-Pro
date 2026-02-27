import api from './api';

const salesService = {
  // Get all sales
  getAllSales: async () => {
    try {
      const response = await api.get('/sales');
      return response.data;
    } catch (error: any) {
      console.error('Error fetching sales:', error);
      return {
        success: false,
        data: [],
        message: error.response?.data?.message || 'Failed to fetch sales'
      };
    }
  },

  // Get single sale
  getSaleById: async (id: string) => {
    try {
      const response = await api.get(`/sales/${id}`);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching sale:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch sale'
      };
    }
  },

  // Create sale (registered customer)
  createSale: async (data: any) => {
    try {
      const response = await api.post('/sales', data);
      return response.data;
    } catch (error: any) {
      console.error('Error creating sale:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to create sale'
      };
    }
  },

  // ✅ NEW: Create walk-in sale (no customer linkage)
  createWalkInSale: async (data: any) => {
    try {
      const response = await api.post('/sales/walk-in', data);
      return response.data;
    } catch (error: any) {
      console.error('Error creating walk-in sale:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to create walk-in sale'
      };
    }
  },

  // Record payment on sale
  recordPayment: async (id: string, paymentData: any) => {
    try {
      const response = await api.post(`/sales/${id}/payment`, paymentData);
      return response.data;
    } catch (error: any) {
      console.error('Error recording payment:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to record payment'
      };
    }
  },

  // Delete sale
  deleteSale: async (id: string) => {
    try {
      const response = await api.delete(`/sales/${id}`);
      return response.data;
    } catch (error: any) {
      console.error('Error deleting sale:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to delete sale'
      };
    }
  },

  // Get customer sales
  getCustomerSales: async (customerId: string) => {
    try {
      const response = await api.get(`/sales/customer/${customerId}`);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching customer sales:', error);
      return {
        success: false,
        data: [],
        message: error.response?.data?.message || 'Failed to fetch sales'
      };
    }
  },

  // Get sales statistics
  getSalesStats: async () => {
    try {
      const response = await api.get('/sales/stats/summary');
      return response.data;
    } catch (error: any) {
      console.error('Error fetching sales stats:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch stats'
      };
    }
  }
};

export default salesService;