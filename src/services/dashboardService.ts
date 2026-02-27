// FILE: client/src/services/dashboardService.ts
import api from '@/services/api';

export interface DashboardSummary {
  summary: {
    totalOutstanding: number;
    overdueAmount: number;
    activeCredits: number;
    todaysCollection: number;
    totalCustomers: number;
    totalServices: number;
    lowStockItems: number;
    totalInventoryValue: number;
    totalSales: number;
    totalPaidAmount: number;
    totalRevenue: number;
  };
  overdueCustomers: Array<{
    _id: string;
    name: string;
    phone: string;
    amount: number;
    daysOverdue: number;
    lastTransaction: string;
  }>;
  recentTransactions: Array<{
    _id: string;
    date: string;
    type: 'Payment' | 'Credit';
    description: string;
    amount: number;
    customerName: string;
    icon: string;
  }>;
  inventoryAlerts: Array<{
    _id: string;
    itemName: string;
    itemCode: string;
    quantity: number;
    reorderLevel: number;
    unit: string;
  }>;
  quickStats: {
    paymentsReceived: number;
    creditsGiven: number;
    activeSales: number;
    clearedSales: number;
  };
  lastUpdated: Date;
}

export interface SalesTrend {
  date: string;
  amount: number;
}

export interface CollectionStats {
  collectionPercentage: number;
  recoveryPercentage: number;
  totalExpected: number;
  collected: number;
  pending: number;
}

export interface CustomerStats {
  totalCustomers: number;
  withBalance: number;
  cleared: number;
  newCustomers: number;
}

class DashboardService {
  // Get complete dashboard summary
  async getDashboardSummary(): Promise<{ success: boolean; data: DashboardSummary }> {
    try {
      console.log('📊 Fetching dashboard summary...');
      const response = await api.get('/dashboard/summary');
      console.log('✅ Dashboard summary fetched');
      return response.data;
    } catch (error: any) {
      console.error('❌ Error fetching dashboard summary:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch dashboard summary');
    }
  }

  // Get sales trend data
  async getSalesTrend(): Promise<{ success: boolean; data: SalesTrend[] }> {
    try {
      console.log('📈 Fetching sales trend...');
      const response = await api.get('/dashboard/sales-trend');
      console.log('✅ Sales trend fetched');
      return response.data;
    } catch (error: any) {
      console.error('❌ Error fetching sales trend:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch sales trend');
    }
  }

  // Get collection statistics
  async getCollectionStats(): Promise<{ success: boolean; data: CollectionStats }> {
    try {
      console.log('📊 Fetching collection stats...');
      const response = await api.get('/dashboard/collection-stats');
      console.log('✅ Collection stats fetched');
      return response.data;
    } catch (error: any) {
      console.error('❌ Error fetching collection stats:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch collection stats');
    }
  }

  // Get customer statistics
  async getCustomerStats(): Promise<{ success: boolean; data: CustomerStats }> {
    try {
      console.log('👥 Fetching customer stats...');
      const response = await api.get('/dashboard/customer-stats');
      console.log('✅ Customer stats fetched');
      return response.data;
    } catch (error: any) {
      console.error('❌ Error fetching customer stats:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch customer stats');
    }
  }

  // Combine all dashboard data
  async getCompleteDashboard() {
    try {
      console.log('📊 Fetching complete dashboard...');
      const [summary, trend, collection, customers] = await Promise.all([
        this.getDashboardSummary(),
        this.getSalesTrend(),
        this.getCollectionStats(),
        this.getCustomerStats()
      ]);

      console.log('✅ Complete dashboard data fetched');

      return {
        success: true,
        data: {
          summary: summary.data,
          trend: trend.data,
          collection: collection.data,
          customers: customers.data
        }
      };
    } catch (error: any) {
      console.error('❌ Error fetching complete dashboard:', error);
      throw new Error(error.message || 'Failed to fetch complete dashboard');
    }
  }
}

export default new DashboardService();