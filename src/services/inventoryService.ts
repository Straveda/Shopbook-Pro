// FILE: src/services/inventoryService.ts
import api from './api';

export interface InventoryItem {
  _id?: string;
  itemName: string;
  itemCode: string;
  quantity: number;
  reorderLevel: number;
  purchasePrice: number;
  sellingPrice: number;
  unit: string;
  totalValue?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface InventoryResponse {
  success: boolean;
  data?: InventoryItem | InventoryItem[];
  message?: string;
  count?: number;
}

const inventoryService = {
  // Get all inventory items
  getAllInventory: async (params?: {
    search?: string;
    lowStockOnly?: boolean;
  }): Promise<InventoryResponse> => {
    try {
      const response = await api.get('/inventory', { params });
      console.log('API Response:', response);
      
      // Handle different response formats
      if (response.data && response.data.success) {
        return response.data;
      } else if (Array.isArray(response.data)) {
        // If response is directly an array
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
      console.error('Error fetching inventory:', error);
      return {
        success: false,
        data: [],
        message: error.response?.data?.message || 'Failed to fetch inventory'
      };
    }
  },

  // Get single inventory item by ID
  getInventoryById: async (id: string): Promise<InventoryResponse> => {
    try {
      const response = await api.get(`/inventory/${id}`);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching inventory item:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch item'
      };
    }
  },

  // Add new inventory item
  addInventory: async (itemData: Omit<InventoryItem, '_id'>): Promise<InventoryResponse> => {
    try {
      const response = await api.post('/inventory', itemData);
      return response.data;
    } catch (error: any) {
      console.error('Error adding inventory:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to add item'
      };
    }
  },

  // Update inventory item
  updateInventory: async (id: string, itemData: Partial<InventoryItem>): Promise<InventoryResponse> => {
    try {
      const response = await api.put(`/inventory/${id}`, itemData);
      return response.data;
    } catch (error: any) {
      console.error('Error updating inventory:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to update item'
      };
    }
  },

  // Delete inventory item
  deleteInventory: async (id: string): Promise<InventoryResponse> => {
    try {
      const response = await api.delete(`/inventory/${id}`);
      return response.data;
    } catch (error: any) {
      console.error('Error deleting inventory:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to delete item'
      };
    }
  },

  // Get low stock items
  getLowStockItems: async (): Promise<InventoryResponse> => {
    try {
      const response = await api.get('/inventory/alerts/low-stock');
      return response.data;
    } catch (error: any) {
      console.error('Error fetching low stock items:', error);
      return {
        success: false,
        data: [],
        message: error.response?.data?.message || 'Failed to fetch low stock items'
      };
    }
  },

  // Get inventory statistics
  getStatistics: async (): Promise<any> => {
    try {
      const response = await api.get('/inventory/stats/summary');
      return response.data;
    } catch (error: any) {
      console.error('Error fetching statistics:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch statistics'
      };
    }
  },

  // Update stock quantity
  updateStock: async (id: string, quantity: number): Promise<InventoryResponse> => {
    try {
      const response = await api.patch(`/inventory/${id}/stock`, { quantity });
      return response.data;
    } catch (error: any) {
      console.error('Error updating stock:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to update stock'
      };
    }
  }
};

export default inventoryService;