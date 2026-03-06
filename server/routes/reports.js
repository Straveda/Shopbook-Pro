// FILE: server/routes/reports.js
import express from 'express';
import { getDatabase, getUserQuery } from '../api/db.js';
import { ObjectId } from 'mongodb';
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
    const userIdStr = req.user.userId;
    const userId = ObjectId.isValid(userIdStr) ? new ObjectId(userIdStr) : userIdStr;
    const db = await getDatabase();

    // Get inventory data
    const inventory = await db.collection('inventory')
      .find(getUserQuery(req))
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
    const userIdStr = req.user.userId;
    const userId = ObjectId.isValid(userIdStr) ? new ObjectId(userIdStr) : userIdStr;
    const db = await getDatabase();
    const { fromDate, toDate } = req.query;

    // Use provided date range or default to today
    let startDate, endDate;
    if (fromDate && fromDate.trim() !== "") {
      startDate = new Date(fromDate);
      if (isNaN(startDate.getTime())) {
        startDate = new Date();
      }
      startDate.setHours(0, 0, 0, 0);
    } else {
      startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
    }

    if (toDate && toDate.trim() !== "") {
      endDate = new Date(toDate);
      if (isNaN(endDate.getTime())) {
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 1);
      }
      endDate.setHours(23, 59, 59, 999);
    } else {
      endDate = new Date(startDate);
      if (fromDate && !toDate) {
        // If fromDate but no toDate, maybe we want a range? 
        // For now, default to end of that month or just +30 days if fromDate provided
        endDate.setMonth(endDate.getMonth() + 1);
      } else {
        endDate.setDate(endDate.getDate() + 1);
      }
      endDate.setHours(23, 59, 59, 999);
    }

    console.log('📊 Daily Report Range:', startDate, '-', endDate);

    // 1. Get SALES in date range
    const sales = await db.collection('sales')
      .find({
        ...getUserQuery(req),
        saleDate: { $gte: startDate, $lte: endDate }
      })
      .sort({ saleDate: -1 })
      .toArray();

    // 2. Get LEDGER entries in date range
    const ledger = await db.collection('ledger')
      .find({
        ...getUserQuery(req),
        date: { $gte: startDate, $lte: endDate }
      })
      .toArray();

    // 3. Identify "Bills" from ledger
    const ledgerBills = ledger.filter(entry =>
      entry.type === 'Credit' && !entry.saleReference && (entry.debit > 0)
    );

    // 4. Identify "Payments" from ledger
    const ledgerPayments = ledger.filter(entry => entry.type === 'Payment');

    // Format sales for report table
    const salesData = sales.map(sale => ({
      'Type': 'Sale',
      'Ref': sale.saleNumber,
      'Customer': sale.customerName || 'Walk-in',
      'Total': `₹${sale.totalAmount?.toLocaleString() || 0}`,
      'Paid': `₹${sale.paidAmount?.toLocaleString() || 0}`,
      'Outstanding': `₹${(sale.outstandingAmount || sale.balanceAmount || 0).toLocaleString()}`,
      'Status': (sale.status || 'Pending').charAt(0).toUpperCase() + (sale.status || 'Pending').slice(1),
      'Time': new Date(sale.saleDate || sale.createdAt).toLocaleTimeString('en-IN')
    }));

    // Format ledger bills for report table
    const billsData = ledgerBills.map(bill => ({
      'Type': 'Bill',
      'Ref': bill.description,
      'Customer': 'Direct Entry',
      'Total': `₹${bill.debit?.toLocaleString() || 0}`,
      'Paid': '₹0',
      'Outstanding': `₹${bill.debit?.toLocaleString() || 0}`,
      'Status': 'Unpaid',
      'Time': new Date(bill.date).toLocaleTimeString('en-IN')
    }));

    const reportData = [...salesData, ...billsData];

    // Calculate unified statistics
    const salesTotal = sales.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
    const billsTotal = ledgerBills.reduce((sum, b) => sum + (b.debit || 0), 0);
    const totalAmount = salesTotal + billsTotal;

    const paidToday = ledgerPayments.reduce((sum, e) => sum + (e.credit || 0), 0);
    const outstandingToday = sales.reduce((sum, s) => sum + (s.outstandingAmount || s.balanceAmount || 0), 0) + billsTotal;

    const stats = {
      totalSales: sales.length + ledgerBills.length,
      totalAmount: totalAmount,
      paidAmount: paidToday,
      outstanding: outstandingToday,
      paidCount: sales.filter(s => s.status === 'paid').length,
      partialCount: sales.filter(s => s.status === 'partial').length,
      unpaidCount: (sales.filter(s => s.status === 'unpaid').length) + ledgerBills.length,
      completionRate: totalAmount > 0 ? ((paidToday / totalAmount) * 100).toFixed(1) : 0
    };

    console.log('✅ Daily report generated:', { count: reportData.length, totalAmount, paidToday });

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
    const userIdStr = req.user.userId;
    const userId = ObjectId.isValid(userIdStr) ? new ObjectId(userIdStr) : userIdStr;
    const db = await getDatabase();
    const { fromDate, toDate, category } = req.query;

    let agingQuery = {
      ...getUserQuery(req),
      outstanding: { $gt: 0 }
    };

    // Category filter
    if (category && category !== 'all') {
      const normalizedCategory = category.toLowerCase().trim();
      console.log('🔍 Aging Report Filtering by category:', normalizedCategory);

      if (normalizedCategory === 'regular') {
        // "regular" is the default — also include customers where category is missing/null
        agingQuery.$or = [
          { category: 'regular' },
          { category: { $exists: false } },
          { category: null },
          { category: '' }
        ];
      } else {
        agingQuery.category = normalizedCategory;
      }
    }

    // Date range filter on lastTransaction
    if ((fromDate && fromDate.trim() !== "") || (toDate && toDate.trim() !== "")) {
      agingQuery.lastTransaction = {};
      if (fromDate && fromDate.trim() !== "") {
        const start = new Date(fromDate);
        if (!isNaN(start.getTime())) {
          agingQuery.lastTransaction.$gte = start;
        }
      }
      if (toDate && toDate.trim() !== "") {
        const to = new Date(toDate);
        if (!isNaN(to.getTime())) {
          to.setHours(23, 59, 59, 999);
          agingQuery.lastTransaction.$lte = to;
        }
      }
    }

    console.log('📊 Aging Query:', JSON.stringify(agingQuery));

    const customers = await db.collection('customers')
      .find(agingQuery)
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
        'Category': customer.category ? customer.category.charAt(0).toUpperCase() + customer.category.slice(1) : 'Regular',
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
});;

// ============================================
// SERVICES REPORT
// ============================================
router.get('/services', async (req, res) => {
  console.log('🔥 GET /api/reports/services');
  try {
    const userIdStr = req.user.userId;
    const userId = ObjectId.isValid(userIdStr) ? new ObjectId(userIdStr) : userIdStr;
    const db = await getDatabase();
    const { fromDate, toDate } = req.query;

    // Get all services
    const services = await db.collection('services')
      .find(getUserQuery(req))
      .sort({ name: 1 })
      .toArray();

    // Build sales query with optional date range
    let salesQuery = { ...getUserQuery(req) };
    if ((fromDate && fromDate.trim() !== "") || (toDate && toDate.trim() !== "")) {
      salesQuery.saleDate = {};
      if (fromDate && fromDate.trim() !== "") {
        const start = new Date(fromDate);
        if (!isNaN(start.getTime())) {
          salesQuery.saleDate.$gte = start;
        }
      }
      if (toDate && toDate.trim() !== "") {
        const to = new Date(toDate);
        if (!isNaN(to.getTime())) {
          to.setHours(23, 59, 59, 999);
          salesQuery.saleDate.$lte = to;
        }
      }
    }

    console.log('📊 Services Sales Query:', JSON.stringify(salesQuery));

    const sales = await db.collection('sales')
      .find(salesQuery)
      .toArray();

    // Format data for report
    const reportData = services.map(service => {
      const usageCount = sales.filter(sale =>
        sale.items && sale.items.some(item => (item.serviceCode === service.code || item.itemCode === service.code))
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
    const userIdStr = req.user.userId;
    const userId = ObjectId.isValid(userIdStr) ? new ObjectId(userIdStr) : userIdStr;
    const db = await getDatabase();

    // Get all data
    const [customers, inventory, sales, services, ledger] = await Promise.all([
      db.collection('customers').find(getUserQuery(req)).toArray(),
      db.collection('inventory').find(getUserQuery(req)).toArray(),
      db.collection('sales').find(getUserQuery(req)).toArray(),
      db.collection('services').find(getUserQuery(req)).toArray(),
      db.collection('ledger').find(getUserQuery(req)).toArray()
    ]);

    // Filter ledger for bills (Credit entries without sale reference)
    const ledgerBills = ledger.filter(entry =>
      entry.type === 'Credit' && !entry.saleReference && (entry.debit > 0)
    );

    // Calculate statistics
    const totalRevenue = sales.reduce((sum, s) => sum + (s.totalAmount || 0), 0) +
      ledgerBills.reduce((sum, b) => sum + (b.debit || 0), 0);

    const stats = {
      totalCustomers: customers.length,
      totalOutstanding: customers.reduce((sum, c) => sum + (c.outstanding || c.outstandingAmount || 0), 0),
      totalInventoryValue: inventory.reduce((sum, i) => sum + (i.quantity * (i.purchasePrice || 0)), 0),
      lowStockItems: inventory.filter(i => i.quantity <= i.reorderLevel).length,
      totalServices: services.length,
      totalSales: sales.length + ledgerBills.length,
      totalRevenue: totalRevenue,
      totalCollected: ledger.filter(e => e.type === 'Payment').reduce((sum, e) => sum + (e.credit || 0), 0)
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