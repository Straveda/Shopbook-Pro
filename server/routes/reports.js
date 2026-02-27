// FILE: server/routes/reports.js
import express from 'express';
import { getDatabase } from '../api/db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Authenticate all report routes
router.use(authenticateToken);

// ============================================
// INVENTORY/STOCK REPORT
// ============================================
router.get('/inventory', async (req, res) => {
  console.log('🔥 GET /api/reports/inventory');
  try {
    const db = await getDatabase();

    // Get inventory data
    const inventory = await db.collection('inventory')
      .find({})
      .sort({ quantity: 1 })
      .toArray();

    // Format data for report
    const reportData = inventory.map(item => ({
      'Item Name': item.itemName,
      'Item Code': item.itemCode,
      'Current Stock': item.quantity,
      'Reorder Level': item.reorderLevel,
      'Status': item.quantity <= item.reorderLevel ? 'Low Stock' : 'In Stock',
      'Unit': item.unit,
      'Unit Price': `₹${item.purchasePrice.toFixed(2)}`,
      'Total Value': `₹${(item.quantity * item.purchasePrice).toFixed(2)}`
    }));

    // Calculate statistics
    const stats = {
      totalItems: inventory.length,
      totalQuantity: inventory.reduce((sum, item) => sum + item.quantity, 0),
      totalValue: inventory.reduce((sum, item) => sum + (item.quantity * item.purchasePrice), 0),
      lowStockItems: inventory.filter(item => item.quantity <= item.reorderLevel).length
    };

    console.log('✅ Inventory report generated');

    res.json({
      success: true,
      data: reportData,
      stats: stats
    });
  } catch (error) {
    console.error('❌ Error generating inventory report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate inventory report',
      error: error.message
    });
  }
});

// ============================================
// DAILY SALES REPORT
// ============================================
router.get('/daily', async (req, res) => {
  console.log('🔥 GET /api/reports/daily');
  try {
    const db = await getDatabase();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get today's invoices
    const invoices = await db.collection('invoices')
      .find({
        createdAt: {
          $gte: today,
          $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
        }
      })
      .sort({ createdAt: -1 })
      .toArray();

    // Format data for report
    const reportData = invoices.map(invoice => ({
      'Invoice No': invoice.invoiceNo || invoice._id.toString().slice(-6),
      'Customer': invoice.customerName || 'N/A',
      'Total Amount': `₹${invoice.totalAmount?.toFixed(2) || 0}`,
      'Tax': `₹${invoice.tax?.toFixed(2) || 0}`,
      'Grand Total': `₹${invoice.grandTotal?.toFixed(2) || invoice.totalAmount?.toFixed(2) || 0}`,
      'Payment Status': invoice.paymentStatus || 'Pending',
      'Date': new Date(invoice.createdAt).toLocaleDateString()
    }));

    // Calculate statistics
    const stats = {
      totalSales: invoices.length,
      totalAmount: invoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0),
      totalTax: invoices.reduce((sum, inv) => sum + (inv.tax || 0), 0),
      grandTotal: invoices.reduce((sum, inv) => sum + (inv.grandTotal || inv.totalAmount || 0), 0)
    };

    console.log('✅ Daily report generated');

    res.json({
      success: true,
      data: reportData,
      stats: stats
    });
  } catch (error) {
    console.error('❌ Error generating daily report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate daily report',
      error: error.message
    });
  }
});

// ============================================
// AGING REPORT (CUSTOMER OUTSTANDING)
// ============================================
router.get('/aging', async (req, res) => {
  console.log('🔥 GET /api/reports/aging');
  try {
    const db = await getDatabase();

    // Get customers with outstanding amounts
    const customers = await db.collection('customers')
      .find({ outstanding: { $gt: 0 } })  // ✅ Changed from outstandingAmount to outstanding
      .sort({ outstanding: -1 })
      .toArray();

    // Format data for report
    const reportData = customers.map(customer => {
      const lastTransaction = customer.lastTransaction 
        ? new Date(customer.lastTransaction) 
        : new Date();
      const daysDiff = Math.floor((new Date() - lastTransaction) / (1000 * 60 * 60 * 24));

      return {
        'Customer Name': customer.name,
        'Phone': customer.phone,
        'Outstanding': `₹${customer.outstanding?.toFixed(2) || 0}`,
        'Credit Limit': `₹${customer.creditLimit?.toFixed(2) || 0}`,
        'Days Outstanding': daysDiff,
        'Aging': daysDiff > 60 ? '> 60 days' : daysDiff > 30 ? '30-60 days' : '< 30 days',
        'Status': daysDiff > 60 ? 'Critical' : daysDiff > 30 ? 'Overdue' : 'Current'
      };
    });

    // Calculate statistics
    const stats = {
      totalCustomers: customers.length,
      totalOutstanding: customers.reduce((sum, cust) => sum + (cust.outstanding || 0), 0),
      criticalCount: customers.filter(c => {
        const days = Math.floor((new Date() - new Date(c.lastTransaction || new Date())) / (1000 * 60 * 60 * 24));
        return days > 60;
      }).length,
      overdueCount: customers.filter(c => {
        const days = Math.floor((new Date() - new Date(c.lastTransaction || new Date())) / (1000 * 60 * 60 * 24));
        return days > 30 && days <= 60;
      }).length
    };

    console.log('✅ Aging report generated');

    res.json({
      success: true,
      data: reportData,
      stats: stats
    });
  } catch (error) {
    console.error('❌ Error generating aging report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate aging report',
      error: error.message
    });
  }
});

// ============================================
// SERVICES REPORT
// ============================================
router.get('/services', async (req, res) => {
  console.log('🔥 GET /api/reports/services');
  try {
    const db = await getDatabase();

    // Get all services
    const services = await db.collection('services')
      .find({})
      .sort({ name: 1 })
      .toArray();

    // Get invoices to calculate usage
    const invoices = await db.collection('invoices')
      .find({})
      .toArray();

    // Format data for report
    const reportData = services.map(service => {
      // Count how many times this service was used
      const usageCount = invoices.filter(inv => 
        inv.items && inv.items.some(item => item.serviceCode === service.code)
      ).length;

      return {
        'Service Name': service.name,
        'Service Code': service.code,
        'Category': service.category,
        'Price': `₹${service.price?.toFixed(2) || 0}`,
        'Tax': `${service.tax || 0}%`,
        'Total with Tax': `₹${(service.price * (1 + (service.tax || 0) / 100)).toFixed(2)}`,
        'Usage Count': usageCount,
        'Status': service.isActive ? 'Active' : 'Inactive'
      };
    });

    // Calculate statistics
    const stats = {
      totalServices: services.length,
      activeServices: services.filter(s => s.isActive !== false).length,
      inactiveServices: services.filter(s => s.isActive === false).length,
      avgPrice: (services.reduce((sum, s) => sum + (s.price || 0), 0) / (services.length || 1)).toFixed(2)
    };

    console.log('✅ Services report generated');

    res.json({
      success: true,
      data: reportData,
      stats: stats
    });
  } catch (error) {
    console.error('❌ Error generating services report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate services report',
      error: error.message
    });
  }
});

// ============================================
// DASHBOARD STATISTICS
// ============================================
router.get('/stats', async (req, res) => {
  console.log('🔥 GET /api/reports/stats');
  try {
    const db = await getDatabase();

    // Get all data
    const [customers, inventory, invoices, services] = await Promise.all([
      db.collection('customers').find({}).toArray(),
      db.collection('inventory').find({}).toArray(),
      db.collection('invoices').find({}).toArray(),
      db.collection('services').find({}).toArray()
    ]);

    // Calculate statistics
    const stats = {
      totalCustomers: customers.length,
      totalOutstanding: customers.reduce((sum, c) => sum + (c.outstandingAmount || 0), 0),
      totalInventoryValue: inventory.reduce((sum, i) => sum + (i.quantity * i.purchasePrice), 0),
      lowStockItems: inventory.filter(i => i.quantity <= i.reorderLevel).length,
      totalServices: services.length,
      totalSales: invoices.length,
      totalRevenue: invoices.reduce((sum, inv) => sum + (inv.grandTotal || inv.totalAmount || 0), 0)
    };

    console.log('✅ Statistics generated');

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('❌ Error generating statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate statistics',
      error: error.message
    });
  }
});

console.log('✅ Reports routes loaded');

export default router;