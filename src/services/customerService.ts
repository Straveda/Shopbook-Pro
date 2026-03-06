// FILE: src/services/customerService.ts - WITH DUE DATE SUPPORT
import api from './api';

export interface Customer {
  _id: string;
  name: string;
  phone: string;
  altPhone?: string;
  address: string;
  city: string;
  creditLimit: number;
  category?: 'regular' | 'retailer' | 'wholesaler';
  outstanding: number;
  outstandingAmount: number;
  totalPaid: number;
  lastTransaction?: string;
  dueDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CustomerResponse {
  success: boolean;
  data?: Customer | Customer[] | any;
  message?: string;
  count?: number;
  pagination?: {
    total: number;
    page: number;
    limit: number;
  };
}

const customerService = {
  // Get all customers
  getAllCustomers: async (params?: {
    search?: string;
    category?: string;
    fromDate?: string;
    toDate?: string;
  }): Promise<CustomerResponse> => {
    try {
      const queryParams: any = {};
      if (params?.search) queryParams.search = params.search;
      if (params?.category && params.category !== 'all') queryParams.category = params.category;
      if (params?.fromDate) queryParams.fromDate = params.fromDate;
      if (params?.toDate) queryParams.toDate = params.toDate;
      const response = await api.get<CustomerResponse>('/customers', { params: queryParams });
      return response.data || { success: true, data: [] };
    } catch (error: any) {
      console.error('Error fetching customers:', error);
      return {
        success: false,
        data: [],
        message: error.response?.data?.message || 'Failed to fetch customers'
      };
    }
  },

  // Get a single customer by ID
  getCustomerById: async (id: string): Promise<CustomerResponse> => {
    try {
      const response = await api.get<CustomerResponse>(`/customers/${id}`);
      return response.data || { success: false, message: 'No data received' };
    } catch (error: any) {
      console.error('Error fetching customer:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch customer'
      };
    }
  },

  // Create a new customer
  addCustomer: async (customerData: {
    name: string;
    phone: string;
    altPhone?: string;
    address: string;
    city: string;
    creditLimit: number;
    category?: string;
  }): Promise<CustomerResponse> => {
    try {
      const response = await api.post<CustomerResponse>('/customers', customerData);
      console.log('✅ Customer created response:', response.data);
      return response.data || { success: true };
    } catch (error: any) {
      console.error('Error creating customer:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to create customer'
      };
    }
  },

  // Add transaction/bill to customer
  addTransaction: async (customerId: string, transactionData: {
    description: string;
    amount: number;
    paymentType?: 'full' | 'partial' | 'pending';
    paidAmount?: number;
    remarks?: string;
    dueDate?: string;
  }): Promise<CustomerResponse> => {
    try {
      console.log('📝 Adding transaction:', { customerId, ...transactionData });
      const response = await api.post<CustomerResponse>(`/customers/${customerId}/transaction`, transactionData);
      console.log('✅ Transaction response:', response.data);
      return response.data || { success: true };
    } catch (error: any) {
      console.error('Error adding transaction:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to add transaction'
      };
    }
  },

  // Receive payment from customer
  receivePayment: async (customerId: string, paymentData: {
    amount: number;
    paymentMode: string;
    remarks?: string;
  }): Promise<CustomerResponse> => {
    try {
      const response = await api.post<CustomerResponse>(`/customers/${customerId}/receive-payment`, paymentData);
      return response.data || { success: true };
    } catch (error: any) {
      console.error('Error receiving payment:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to receive payment'
      };
    }
  },

  // Record debit (customer owes money)
  recordDebit: async (customerId: string, amount: number, description: string): Promise<CustomerResponse> => {
    try {
      const response = await api.post<CustomerResponse>(`/customers/${customerId}/debit`, {
        amount,
        description
      });
      return response.data || { success: true };
    } catch (error: any) {
      console.error('Error recording debit:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to record debit'
      };
    }
  },

  // Update a customer
  updateCustomer: async (id: string, customerData: {
    name?: string;
    phone?: string;
    altPhone?: string;
    address?: string;
    city?: string;
    creditLimit?: number;
    category?: string;
  }): Promise<CustomerResponse> => {
    try {
      const response = await api.put<CustomerResponse>(`/customers/${id}`, customerData);
      return response.data || { success: true };
    } catch (error: any) {
      console.error('Error updating customer:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to update customer'
      };
    }
  },

  // Update customer due date
  updateDueDate: async (id: string, dueDate: string): Promise<CustomerResponse> => {
    try {
      const response = await api.put<CustomerResponse>(`/customers/${id}/due-date`, { dueDate });
      return response.data || { success: true };
    } catch (error: any) {
      console.error('Error updating due date:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to update due date'
      };
    }
  },

  // Delete a customer
  deleteCustomer: async (id: string): Promise<CustomerResponse> => {
    try {
      const response = await api.delete<CustomerResponse>(`/customers/${id}`);
      return response.data || { success: true };
    } catch (error: any) {
      console.error('Error deleting customer:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to delete customer'
      };
    }
  },

  // Add a note to customer
  addNote: async (customerId: string, noteData: {
    content: string;
  }): Promise<CustomerResponse> => {
    try {
      const response = await api.post<CustomerResponse>(`/customers/${customerId}/notes`, noteData);
      return response.data || { success: true };
    } catch (error: any) {
      console.error('Error adding note:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to add note'
      };
    }
  },

  // Delete a note from customer
  deleteNote: async (customerId: string, noteId: string): Promise<CustomerResponse> => {
    try {
      const response = await api.delete<CustomerResponse>(`/customers/${customerId}/notes/${noteId}`);
      return response.data || { success: true };
    } catch (error: any) {
      console.error('Error deleting note:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to delete note'
      };
    }
  }
};

export default customerService;