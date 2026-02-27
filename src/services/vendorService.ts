// FILE: src/services/vendorService.ts
import api from './api';

export interface Vendor {
  _id?: string;
  vendorName: string;
  vendorCode: string;
  contactPerson?: string;
  email?: string;
  phone: string;
  alternatePhone?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  paymentTerms?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface VendorResponse {
  success: boolean;
  data?: Vendor | Vendor[];
  message?: string;
  count?: number;
}

const vendorService = {
  // Get all vendors
  getAllVendors: async (params?: {
    search?: string;
    isActive?: boolean;
  }): Promise<VendorResponse> => {
    try {
      const response = await api.get('/vendors', { params });
      console.log('Vendors response:', response);
      
      if (response.data && response.data.success) {
        return response.data;
      } else if (Array.isArray(response.data)) {
        return {
          success: true,
          data: response.data,
          count: response.data.length
        };
      } else {
        return {
          success: false,
          data: [],
          message: 'Invalid response format'
        };
      }
    } catch (error: any) {
      console.error('Error fetching vendors:', error);
      return {
        success: false,
        data: [],
        message: error.response?.data?.message || 'Failed to fetch vendors'
      };
    }
  },

  // Get single vendor by ID
  getVendorById: async (id: string): Promise<VendorResponse> => {
    try {
      const response = await api.get(`/vendors/${id}`);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching vendor:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch vendor'
      };
    }
  },

  // Add new vendor
  addVendor: async (vendorData: Omit<Vendor, '_id'>): Promise<VendorResponse> => {
    try {
      const response = await api.post('/vendors', vendorData);
      return response.data;
    } catch (error: any) {
      console.error('Error adding vendor:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to add vendor'
      };
    }
  },

  // Update vendor
  updateVendor: async (id: string, vendorData: Partial<Vendor>): Promise<VendorResponse> => {
    try {
      const response = await api.put(`/vendors/${id}`, vendorData);
      return response.data;
    } catch (error: any) {
      console.error('Error updating vendor:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to update vendor'
      };
    }
  },

  // Delete vendor
  deleteVendor: async (id: string): Promise<VendorResponse> => {
    try {
      const response = await api.delete(`/vendors/${id}`);
      return response.data;
    } catch (error: any) {
      console.error('Error deleting vendor:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to delete vendor'
      };
    }
  },

  // Search vendors
  searchVendors: async (query: string): Promise<VendorResponse> => {
    try {
      const response = await api.get(`/vendors/search/${query}`);
      return response.data;
    } catch (error: any) {
      console.error('Error searching vendors:', error);
      return {
        success: false,
        data: [],
        message: error.response?.data?.message || 'Failed to search vendors'
      };
    }
  }
};

export default vendorService;