// FILE: src/services/serviceService.ts (UPDATED)
import api from './api';

export interface Service {
  _id: string;
  name: string;
  code: string;
  category: 'Printing' | 'Photocopy' | 'Lamination' | 'Binding' | 'Scanning' | 'Other';
  price: number;
  tax: number;
  isActive?: boolean;
  priceWithTax?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateServiceData {
  name: string;
  code: string;
  category: string;
  price: number;
  tax: number;
}

export interface ServiceResponse {
  success: boolean;
  data?: Service | Service[];
  message?: string;
  count?: number;
}

const serviceService = {
  // Get all services
  getAllServices: async (params?: {
    category?: string;
    search?: string;
    isActive?: boolean;
  }): Promise<ServiceResponse> => {
    try {
      const response = await api.get('/services', { params });
      return response.data;
    } catch (error: any) {
      console.error('Error fetching services:', error);
      return {
        success: false,
        data: [],
        message: error.response?.data?.message || 'Failed to fetch services'
      };
    }
  },

  // Get a single service by ID
  getServiceById: async (id: string): Promise<ServiceResponse> => {
    try {
      const response = await api.get(`/services/${id}`);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching service:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch service'
      };
    }
  },

  // Get services by category
  getServicesByCategory: async (category: string): Promise<ServiceResponse> => {
    try {
      const response = await api.get(`/services/category/${category}`);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching services by category:', error);
      return {
        success: false,
        data: [],
        message: error.response?.data?.message || 'Failed to fetch services'
      };
    }
  },

  // Create a new service
  createService: async (serviceData: CreateServiceData): Promise<ServiceResponse> => {
    try {
      const response = await api.post('/services', serviceData);
      return response.data;
    } catch (error: any) {
      console.error('Error creating service:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to create service'
      };
    }
  },

  // Update an existing service
  updateService: async (id: string, serviceData: any): Promise<ServiceResponse> => {
    try {
      const response = await api.put(`/services/${id}`, serviceData);
      return response.data;
    } catch (error: any) {
      console.error('Error updating service:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to update service'
      };
    }
  },

  // Delete a service
  deleteService: async (id: string): Promise<ServiceResponse> => {
    try {
      const response = await api.delete(`/services/${id}`);
      return response.data;
    } catch (error: any) {
      console.error('Error deleting service:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to delete service'
      };
    }
  },

  // Calculate total price with tax
  calculatePriceWithTax: (price: number, tax: number): number => {
    return price * (1 + tax / 100);
  }
};

export default serviceService;