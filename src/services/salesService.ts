import api from './api';

export interface SaleItem {
  id: string;
  itemName: string;
  itemCode: string;
  quantity: number;
  price: number;
  total: number;
  unit: string;
}

export interface Sale {
  _id: string;
  saleNumber: string;
  customerId?: string;
  customerName: string;
  saleDate: string;
  items: SaleItem[];
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  outstandingAmount: number;
  status: 'paid' | 'partial' | 'unpaid';
  notes?: string;
  isWalkIn: boolean;
  createdAt?: string;
  updatedAt?: string;
  isLedgerBill?: boolean;
}

export interface SalesResponse {
  success: boolean;
  data?: Sale | Sale[] | any;
  message?: string;
}

const salesService = {
  // Get all sales
  getAllSales: async (): Promise<SalesResponse> => {
    try {
      const response = await api.get<SalesResponse>('/sales');
      return response.data || { success: true, data: [] };
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
  getSaleById: async (id: string): Promise<SalesResponse> => {
    try {
      const response = await api.get<SalesResponse>(`/sales/${id}`);
      return response.data || { success: false, message: 'No data received' };
    } catch (error: any) {
      console.error('Error fetching sale:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch sale'
      };
    }
  },

  // Create sale (registered customer)
  createSale: async (data: Partial<Sale>): Promise<SalesResponse> => {
    try {
      const response = await api.post<SalesResponse>('/sales', data);
      return response.data || { success: true };
    } catch (error: any) {
      console.error('Error creating sale:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to create sale'
      };
    }
  },

  // ✅ NEW: Create walk-in sale (no customer linkage)
  createWalkInSale: async (data: Partial<Sale>): Promise<SalesResponse> => {
    try {
      const response = await api.post<SalesResponse>('/sales/walk-in', data);
      return response.data || { success: true };
    } catch (error: any) {
      console.error('Error creating walk-in sale:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to create walk-in sale'
      };
    }
  },

  // Record payment on sale
  recordPayment: async (id: string, paymentData: { amount: number; paymentMode: string; remarks?: string }): Promise<SalesResponse> => {
    try {
      const response = await api.post<SalesResponse>(`/sales/${id}/payment`, paymentData);
      return response.data || { success: true };
    } catch (error: any) {
      console.error('Error recording payment:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to record payment'
      };
    }
  },

  // Delete sale
  deleteSale: async (id: string): Promise<SalesResponse> => {
    try {
      const response = await api.delete<SalesResponse>(`/sales/${id}`);
      return response.data || { success: true };
    } catch (error: any) {
      console.error('Error deleting sale:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to delete sale'
      };
    }
  },

  // Get customer sales
  getCustomerSales: async (customerId: string): Promise<SalesResponse> => {
    try {
      const response = await api.get<SalesResponse>(`/sales/customer/${customerId}`);
      return response.data || { success: true, data: [] };
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
  getSalesStats: async (): Promise<SalesResponse> => {
    try {
      const response = await api.get<SalesResponse>('/sales/stats/summary');
      return response.data || { success: false, message: 'No data received' };
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