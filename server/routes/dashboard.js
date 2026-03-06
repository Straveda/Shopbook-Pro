// FILE: server/routes/dashboard.js - COMPLETE FIX
import express from 'express';
import { getDatabase, getUserQuery } from '../api/db.js';
import { ObjectId } from 'mongodb';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);

// ============================================
// MAIN DASHBOARD SUMMARY ENDPOINT
// ============================================
router.get('/summary', async (req, res) => {
  console.log('Dashboard summary request');

  try {
    const db = await getDatabase();
    const userFilter = getUserQuery(req);

    const [customers, inventory, services, sales, ledger] = await Promise.all([
      db.collection('customers').find(userFilter).toArray(),
      db.collection('inventory').find(userFilter).toArray(),
      db.collection('services').find({ ...userFilter, isActive: true }).toArray(),
      db.collection('sales').find(userFilter).toArray(),
      db.collection('ledger').find(userFilter).toArray()
    ]);

    console.log('Fetched data - Customers:', customers.length, 'Sales:', sales.length, 'Ledger:', ledger.length);

    // ========== TODAY'S COLLECTION ==========
    // FIXED: Use ledger Payment entries instead of sales.paidAmount
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Filter ledger for TODAY'S PAYMENTS (type === 'Payment')
    const todaysPayments = ledger.filter(entry => {
      if (entry.type !== 'Payment') return false;
      const entryDate = new Date(entry.date);
      return entryDate >= today && entryDate < tomorrow;
    });

    const todaysCollection = todaysPayments.reduce((sum, entry) => sum + (entry.credit || 0), 0);
    console.log('Today payments:', todaysPayments.length, 'Amount:', todaysCollection);

    // ========== TOTAL OUTSTANDING ==========
    const totalOutstanding = customers.reduce((sum, c) => sum + (c.outstandingAmount || 0), 0);
    console.log('Total outstanding:', totalOutstanding);

    // ========== OVERDUE PAYMENTS ==========
    // SIMPLIFIED: Any customer with outstanding balance is considered overdue
    // (since they have credit given and haven't paid yet)
    const overdueCustomers = customers.filter(c => {
      const outstanding = c.outstandingAmount || 0;
      return outstanding > 0;  // Simple: if they owe money, they're overdue
    });

    const overdueAmount = overdueCustomers.reduce((sum, c) => sum + (c.outstandingAmount || 0), 0);
    console.log('Overdue customers:', overdueCustomers.length, 'Amount:', overdueAmount);

    // ========== LOW STOCK ITEMS ==========
    const lowStockItems = inventory.filter(item => item.quantity <= item.reorderLevel).length;

    // Filter ledger for bills (Credit entries without sale reference)
    const ledgerBills = ledger.filter(entry =>
      entry.type === 'Credit' && !entry.saleReference && (entry.debit > 0)
    );

    const totalRevenue = sales.reduce((sum, sale) => sum + (sale.totalAmount || 0), 0) +
      ledgerBills.reduce((sum, bill) => sum + (bill.debit || 0), 0);

    // ========== SUMMARY STATS ==========
    const summaryStats = {
      totalOutstanding: totalOutstanding,
      overdueAmount: overdueAmount,
      activeCredits: customers.filter(c => (c.outstandingAmount || 0) > 0).length,
      todaysCollection: todaysCollection,
      totalCustomers: customers.length,
      totalServices: services.length,
      lowStockItems: lowStockItems,
      totalInventoryValue: inventory.reduce((sum, item) => sum + ((item.quantity || 0) * (item.purchasePrice || 0)), 0),
      totalSales: sales.length + ledgerBills.length,
      totalPaidAmount: ledger
        .filter(e => e.type === 'Payment')
        .reduce((sum, e) => sum + (e.credit || 0), 0),
      totalRevenue: totalRevenue
    };

    // ========== OVERDUE CUSTOMERS (TOP 4) ==========
    const overdueList = overdueCustomers
      .map(customer => {
        const lastTx = customer.lastTransaction ? new Date(customer.lastTransaction) : new Date();
        const daysOverdue = Math.floor((new Date() - lastTx) / (1000 * 60 * 60 * 24));

        return {
          _id: customer._id.toString(),
          name: customer.name,
          phone: customer.phone,
          amount: customer.outstandingAmount || 0,
          daysOverdue: Math.max(daysOverdue, customer.dueDate ? Math.floor((new Date() - new Date(customer.dueDate)) / (1000 * 60 * 60 * 24)) : 0),
          lastTransaction: lastTx.toLocaleDateString('en-GB')
        };
      })
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 4);

    console.log('Overdue list:', overdueList.length);

    // ========== RECENT TRANSACTIONS (TOP 4) ==========
    const recentTransactions = ledger
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 10)
      .map(entry => {
        const customer = customers.find(c => c._id.toString() === entry.customerId?.toString());
        return {
          _id: entry._id,
          date: new Date(entry.date).toLocaleDateString('en-GB'),
          type: entry.type,
          description: entry.description,
          amount: entry.debit > 0 ? entry.debit : entry.credit,
          customerName: customer?.name || 'Unknown',
          icon: entry.type === 'Payment' ? 'check' : 'alert'
        };
      })
      .slice(0, 4);

    console.log('Recent transactions:', recentTransactions.length);

    // ========== QUICK STATS ==========
    const quickStats = {
      paymentsReceived: ledger.filter(e => e.type === 'Payment').length,
      creditsGiven: ledger.filter(e => e.type === 'Credit').length,
      activeSales: sales.filter(s => s.status !== 'paid').length,
      clearedSales: sales.filter(s => s.status === 'paid').length
    };

    // ========== INVENTORY ALERTS ==========
    const inventoryAlerts = inventory
      .filter(item => item.quantity <= item.reorderLevel)
      .map(item => ({
        _id: item._id,
        itemName: item.itemName,
        itemCode: item.itemCode,
        quantity: item.quantity,
        reorderLevel: item.reorderLevel,
        unit: item.unit
      }))
      .slice(0, 5);

    // ========== RESPONSE ==========
    const responseData = {
      summary: summaryStats,
      overdueCustomers: overdueList,
      recentTransactions: recentTransactions,
      inventoryAlerts: inventoryAlerts,
      quickStats: quickStats,
      lastUpdated: new Date()
    };

    console.log('Dashboard summary generated successfully');

    res.json({
      success: true,
      data: responseData,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Dashboard summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard summary',
      error: error.message
    });
  }
});

// ============================================
// GET COLLECTION PERCENTAGES (for charts)
// ============================================
router.get('/collection-stats', async (req, res) => {
  console.log('GET /api/dashboard/collection-stats');

  try {
    const db = await getDatabase();
    const userFilter = getUserQuery(req);
    const customers = await db.collection('customers').find(userFilter).toArray();
    const ledger = await db.collection('ledger').find(userFilter).toArray();

    const totalOutstanding = customers.reduce((sum, c) => sum + (c.outstandingAmount || 0), 0);
    const totalExpected = customers.reduce((sum, c) => sum + (c.creditLimit || 0), 0);

    // FIXED: Calculate collected from ledger Payment entries
    const collected = ledger
      .filter(e => e.type === 'Payment')
      .reduce((sum, e) => sum + (e.credit || 0), 0);

    const collectionPercentage = totalExpected > 0 ? (collected / totalExpected) * 100 : 0;
    const recoveryPercentage = totalExpected > 0 ? ((totalExpected - totalOutstanding) / totalExpected) * 100 : 0;

    res.json({
      success: true,
      data: {
        collectionPercentage: parseFloat(collectionPercentage.toFixed(1)),
        recoveryPercentage: parseFloat(recoveryPercentage.toFixed(1)),
        totalExpected: totalExpected,
        collected: collected,
        pending: totalOutstanding
      }
    });
  } catch (error) {
    console.error('Collection stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch collection stats',
      error: error.message
    });
  }
});

// ============================================
// GET SALES TREND (last 7 days)
// ============================================
router.get('/sales-trend', async (req, res) => {
  console.log('GET /api/dashboard/sales-trend');

  try {
    const db = await getDatabase();
    const userFilter = getUserQuery(req);
    const sales = await db.collection('sales').find(userFilter).toArray();

    const salesByDay = {};
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const dateStr = date.toLocaleDateString('en-GB', { weekday: 'short', month: 'short', day: 'numeric' });
      salesByDay[dateStr] = 0;

      sales.forEach(sale => {
        const saleDate = new Date(sale.saleDate || sale.createdAt);
        saleDate.setHours(0, 0, 0, 0);

        if (saleDate.getTime() === date.getTime()) {
          salesByDay[dateStr] += sale.totalAmount || 0;
        }
      });
    }

    const trendData = Object.entries(salesByDay).map(([date, amount]) => ({
      date,
      amount: parseFloat(amount.toFixed(2))
    }));

    res.json({
      success: true,
      data: trendData
    });
  } catch (error) {
    console.error('Sales trend error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sales trend',
      error: error.message
    });
  }
});

// ============================================
// GET CUSTOMER STATISTICS
// ============================================
router.get('/customer-stats', async (req, res) => {
  console.log('GET /api/dashboard/customer-stats');

  try {
    const db = await getDatabase();
    const userFilter = getUserQuery(req);
    const customers = await db.collection('customers').find(userFilter).toArray();

    const stats = {
      totalCustomers: customers.length,
      withBalance: customers.filter(c => (c.outstandingAmount || 0) > 0).length,
      cleared: customers.filter(c => (c.outstandingAmount || 0) === 0).length,
      newCustomers: customers.filter(c => {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return new Date(c.createdAt || new Date()) > thirtyDaysAgo;
      }).length
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Customer stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch customer stats',
      error: error.message
    });
  }
});

console.log('Dashboard routes loaded');

// ============================================
// DEBUG ENDPOINT - Check database data
// ============================================
router.get('/debug/data', async (req, res) => {
  try {
    const db = await getDatabase();
    const userFilter = getUserQuery(req);

    const customers = await db.collection('customers').find(userFilter).toArray();
    const ledger = await db.collection('ledger').find(userFilter).toArray();
    const sales = await db.collection('sales').find(userFilter).toArray();

    const customerWithOutstanding = customers.filter(c => (c.outstandingAmount || 0) > 0);
    const paymentEntries = ledger.filter(e => e.type === 'Payment');

    res.json({
      success: true,
      debug: {
        totalCustomers: customers.length,
        customersWithOutstanding: customerWithOutstanding.length,
        customerData: customerWithOutstanding.slice(0, 3).map(c => ({
          name: c.name,
          outstanding: c.outstanding || c.outstandingAmount,
          lastTransaction: c.lastTransaction,
          dueDate: c.dueDate
        })),
        totalLedgerEntries: ledger.length,
        paymentEntries: paymentEntries.length,
        totalPayments: paymentEntries.reduce((sum, e) => sum + (e.credit || 0), 0),
        totalSales: sales.length,
        recentSales: sales.slice(0, 3).map(s => ({
          saleNumber: s.saleNumber,
          totalAmount: s.totalAmount,
          paidAmount: s.paidAmount,
          balanceAmount: s.balanceAmount
        }))
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Debug error',
      error: error.message
    });
  }
});

export default router;