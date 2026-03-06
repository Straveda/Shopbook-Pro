// FILE: routes/sales.js (WITH DIAGNOSTICS)
import express from 'express';
import { getDatabase, getUserQuery } from '../api/db.js';
import { ObjectId } from 'mongodb';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// ✅ Log all routes when file loads
console.log('==========================================');
console.log('📋 LOADING SALES ROUTES');
console.log('==========================================');

// ✅ Authenticate all routes
router.use(authenticateToken);

// ============================================
// SPECIFIC ROUTES FIRST
// ============================================

// 1. GET /stats/summary (Unified with Ledger)
router.get('/stats/summary', async (req, res) => {
  console.log('📊 Route hit: GET /stats/summary (Unified)');
  try {
    const db = await getDatabase();
    const userFilter = getUserQuery(req);

    // Fetch regular sales
    const sales = await db.collection('sales')
      .find(userFilter)
      .toArray();

    // Fetch ledger bills (Directly created bills)
    const ledgerBills = await db.collection('ledger')
      .find({
        ...userFilter,
        type: 'Credit',
        saleNumber: { $exists: false },
        creditId: { $exists: false } // Only manual/direct entries that aren't from Credit Book
      })
      .toArray();

    // Map ledger bills for stat calculation
    const mappedBills = ledgerBills.map(bill => ({
      totalAmount: bill.debit || 0,
      paidAmount: bill.credit || 0,
      balanceAmount: (bill.debit || 0) - (bill.credit || 0),
      status: (bill.debit || 0) === (bill.credit || 0) ? 'paid' : (bill.credit > 0 ? 'partial' : 'unpaid')
    }));

    const allTransactions = [...sales, ...mappedBills];

    const totalSales = allTransactions.reduce((sum, item) => sum + (item.totalAmount || 0), 0);
    const paidAmount = allTransactions.reduce((sum, item) => sum + (item.paidAmount || 0), 0);
    const outstanding = allTransactions.reduce((sum, item) => sum + (item.outstandingAmount || 0), 0);

    const totalCost = totalSales * 0.30;
    const profit = paidAmount - totalCost;
    const profitMargin = paidAmount > 0 ? ((profit / paidAmount) * 100).toFixed(1) : 0;

    const stats = {
      totalInvoices: allTransactions.length,
      totalSales: totalSales,
      paidAmount: paidAmount,
      outstanding: outstanding,
      profit: profit,
      totalCost: totalCost,
      profitMargin: profitMargin,
      unpaidCount: allTransactions.filter(s => s.status === 'unpaid').length,
      partialCount: allTransactions.filter(s => s.status === 'partial').length,
      paidCount: allTransactions.filter(s => s.status === 'paid').length
    };

    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('❌ Get stats error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});
console.log('✅ Route registered: GET /api/sales/stats/summary');

// 2. GET /customer/:customerId
router.get('/customer/:customerId', async (req, res) => {
  console.log('👤 Route hit: GET /customer/:customerId');
  try {
    const { customerId } = req.params;
    const db = await getDatabase();
    const userFilter = getUserQuery(req, { customerId: customerId });
    const sales = await db.collection('sales')
      .find(userFilter)
      .sort({ saleDate: -1 })
      .toArray();

    const formattedSales = sales.map(sale => ({
      ...sale,
      outstandingAmount: sale.balanceAmount || 0
    }));

    res.json({ success: true, data: formattedSales });
  } catch (error) {
    console.error('❌ Get customer sales error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});
console.log('✅ Route registered: GET /api/sales/customer/:customerId');

// 3. POST /walk-in - THIS IS THE CRITICAL ONE
router.post('/walk-in', async (req, res) => {
  console.log('🚶 Route hit: POST /walk-in');
  console.log('📦 Request body:', req.body);

  try {
    const { customerName, items, totalAmount, paidAmount, balanceAmount, status, saleDate, notes } = req.body;

    // ✅ Validation
    if (!items || !totalAmount) {
      console.error('❌ Missing required fields');
      return res.status(400).json({
        success: false,
        message: 'Items and total amount are required'
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      console.error('❌ Invalid items array');
      return res.status(400).json({
        success: false,
        message: 'At least one item is required'
      });
    }

    const userIdStr = req.user.userId;
    const userId = ObjectId.isValid(userIdStr) ? new ObjectId(userIdStr) : userIdStr;
    const db = await getDatabase();
    const userFilter = getUserQuery(req);

    // ✅ Generate sale number
    const count = await db.collection('sales').countDocuments(userFilter);
    const saleNumber = `SALE-${String(count + 1).padStart(5, '0')}`;

    console.log('📨 Creating walk-in sale:', { saleNumber });

    // ✅ Create walk-in sale data
    const saleData = {
      userId: userId,
      customerId: null,
      customerName: customerName || "Walk-in Customer",
      saleNumber: saleNumber,
      saleDate: saleDate ? new Date(saleDate) : new Date(),
      items: items,
      totalAmount: parseFloat(totalAmount),
      paidAmount: parseFloat(paidAmount || 0),
      balanceAmount: parseFloat(balanceAmount || 0),
      outstandingAmount: parseFloat(balanceAmount || 0),
      status: status || 'paid',
      notes: notes || null,
      isWalkIn: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // ✅ Insert sale
    const result = await db.collection('sales').insertOne(saleData);
    console.log('✅ Walk-in sale created:', saleNumber);

    res.status(201).json({
      success: true,
      message: 'Walk-in sale created successfully',
      data: { _id: result.insertedId, ...saleData }
    });
  } catch (error) {
    console.error('❌ Create walk-in sale error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});
console.log('✅ Route registered: POST /api/sales/walk-in');

// ============================================
// GENERAL ROUTES
// ============================================

// 4. GET / - All sales (Unified with Ledger)
router.get('/', async (req, res) => {
  console.log('📋 Route hit: GET / (Unified)');
  try {
    const db = await getDatabase();
    const userFilter = getUserQuery(req);

    // Fetch regular sales
    const sales = await db.collection('sales')
      .find(userFilter)
      .sort({ saleDate: -1 })
      .toArray();

    // Fetch ledger bills (Directly created bills)
    const ledgerBills = await db.collection('ledger')
      .find({
        ...userFilter,
        type: 'Credit',
        saleNumber: { $exists: false },
        creditId: { $exists: false }
      })
      .sort({ date: -1 })
      .toArray();

    // Map ledger bills to sale-like objects
    const mappedBills = ledgerBills.map(bill => {
      const totalAmount = bill.debit || 0;
      // Use paidAmount (allocated via FIFO) or credit (original payment)
      const paidAmount = (bill.paidAmount || 0) + (bill.credit || 0);
      const balanceAmount = Math.max(0, totalAmount - paidAmount);

      return {
        _id: bill._id,
        saleNumber: bill.description || 'DIRECT-BILL',
        customerName: 'Customer', // Would need lookup for full name if available
        customerId: bill.customerId,
        totalAmount: totalAmount,
        paidAmount: paidAmount,
        balanceAmount: balanceAmount,
        status: balanceAmount <= 0 ? 'paid' : (paidAmount > 0 ? 'partial' : 'unpaid'),
        saleDate: bill.date,
        createdAt: bill.createdAt,
        isLedgerBill: true
      };
    });

    const combinedSales = [...sales, ...mappedBills].sort((a, b) =>
      new Date(b.saleDate || b.createdAt) - new Date(a.saleDate || a.createdAt)
    );

    const formattedSales = combinedSales.map(sale => ({
      ...sale,
      outstandingAmount: sale.balanceAmount || 0
    }));

    res.json({ success: true, data: formattedSales });
  } catch (error) {
    console.error('❌ Get sales error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});
console.log('✅ Route registered: GET /api/sales');

// 5. POST / - Create regular sale
router.post('/', async (req, res) => {
  console.log('📝 Route hit: POST /');
  try {
    const { customerId, customerName, items, totalAmount, saleDate, notes } = req.body;

    if (!customerId || !customerName || !items || !totalAmount) {
      return res.status(400).json({
        success: false,
        message: 'Customer ID, name, items, and total amount are required'
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one item is required'
      });
    }

    const userIdStr = req.user.userId;
    const userId = ObjectId.isValid(userIdStr) ? new ObjectId(userIdStr) : userIdStr;
    const db = await getDatabase();
    const userFilter = getUserQuery(req);
    const count = await db.collection('sales').countDocuments(userFilter);
    const saleNumber = `SALE-${String(count + 1).padStart(5, '0')}`;

    if (!ObjectId.isValid(customerId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid customer ID format'
      });
    }

    const customer = await db.collection('customers').findOne({
      _id: new ObjectId(customerId),
      ...userFilter
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    const saleData = {
      userId: userId,
      customerId: customerId,
      customerName: customerName,
      saleNumber: saleNumber,
      saleDate: saleDate ? new Date(saleDate) : new Date(),
      items: items,
      totalAmount: parseFloat(totalAmount),
      paidAmount: 0,
      balanceAmount: parseFloat(totalAmount),
      outstandingAmount: parseFloat(totalAmount),
      status: 'unpaid',
      notes: notes || null,
      isWalkIn: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.collection('sales').insertOne(saleData);

    const ledgerEntry = {
      customerId: customerId,
      userId: userId,
      saleNumber: saleNumber, // Added for robust tracking
      date: saleData.saleDate,
      type: 'Credit',
      description: `Sale ${saleNumber}`,
      debit: parseFloat(totalAmount),
      credit: 0,
      balance: (customer.outstandingAmount || 0) + parseFloat(totalAmount),
      createdAt: new Date()
    };

    await db.collection('ledger').insertOne(ledgerEntry);

    await db.collection('customers').updateOne(
      { _id: new ObjectId(customerId), ...userFilter },
      {
        $inc: { outstanding: parseFloat(totalAmount) },
        $set: { updatedAt: new Date() }
      }
    );

    res.status(201).json({
      success: true,
      message: 'Sale created successfully',
      data: { _id: result.insertedId, ...saleData }
    });
  } catch (error) {
    console.error('❌ Create sale error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});
console.log('✅ Route registered: POST /api/sales');

// 6. POST /:id/payment
router.post('/:id/payment', async (req, res) => {
  console.log('💰 Route hit: POST /:id/payment');
  try {
    const { id } = req.params;
    const { amount, paymentMode, remarks } = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid sale ID' });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Valid payment amount required' });
    }

    const db = await getDatabase();
    const userFilter = getUserQuery(req);
    const sale = await db.collection('sales').findOne({
      _id: new ObjectId(id),
      ...userFilter
    });

    if (!sale) {
      return res.status(404).json({ success: false, message: 'Sale not found' });
    }

    const paymentAmount = parseFloat(amount);
    const newPaidAmount = sale.paidAmount + paymentAmount;
    const newBalanceAmount = Math.max(0, sale.totalAmount - newPaidAmount);

    let newStatus = 'unpaid';
    if (newBalanceAmount === 0) {
      newStatus = 'paid';
    } else if (newPaidAmount > 0) {
      newStatus = 'partial';
    }

    await db.collection('sales').updateOne(
      { _id: new ObjectId(id), ...userFilter },
      {
        $set: {
          paidAmount: newPaidAmount,
          balanceAmount: newBalanceAmount,
          outstandingAmount: newBalanceAmount,
          status: newStatus,
          updatedAt: new Date()
        }
      }
    );

    if (sale.customerId && !sale.isWalkIn) {
      const customer = await db.collection('customers').findOne({
        _id: new ObjectId(sale.customerId),
        ...userFilter
      });

      const userIdStr = req.user.userId;
      const userId = ObjectId.isValid(userIdStr) ? new ObjectId(userIdStr) : userIdStr;
      const ledgerEntry = {
        customerId: sale.customerId,
        userId: userId,
        saleNumber: sale.saleNumber,
        date: new Date(),
        type: 'Payment',
        description: `Payment for ${sale.saleNumber}`,
        debit: 0,
        credit: paymentAmount,
        balance: (customer.outstandingAmount || 0) - paymentAmount,
        paymentMode: paymentMode || 'Cash',
        remarks: remarks || null,
        createdAt: new Date()
      };

      await db.collection('ledger').insertOne(ledgerEntry);

      await db.collection('customers').updateOne(
        { _id: new ObjectId(sale.customerId), ...userFilter },
        {
          $inc: {
            outstanding: -paymentAmount,
            outstandingAmount: -paymentAmount
          },
          $set: { updatedAt: new Date() }
        }
      );
    }

    res.json({
      success: true,
      message: 'Payment recorded successfully',
      data: { newPaidAmount, newBalanceAmount, outstandingAmount: newBalanceAmount, status: newStatus }
    });
  } catch (error) {
    console.error('❌ Record payment error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});
console.log('✅ Route registered: POST /api/sales/:id/payment');

// ============================================
// PARAMETERIZED ROUTES LAST
// ============================================

// 7. GET /:id - MUST BE LAST
router.get('/:id', async (req, res) => {
  console.log('🔍 Route hit: GET /:id');
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid sale ID' });
    }

    const db = await getDatabase();
    const userFilter = getUserQuery(req);

    // 1. Try to find in regular sales
    let sale = await db.collection('sales').findOne({
      _id: new ObjectId(id),
      ...userFilter
    });

    if (sale) {
      const formattedSale = {
        ...sale,
        outstandingAmount: sale.balanceAmount || 0
      };
      return res.json({ success: true, data: formattedSale });
    }

    // 2. Not found in sales, try to find in ledger (Direct Bills)
    const ledgerBill = await db.collection('ledger').findOne({
      _id: new ObjectId(id),
      ...userFilter,
      type: 'Credit'
    });

    if (ledgerBill) {
      const totalAmount = ledgerBill.debit || 0;
      const paidAmount = (ledgerBill.paidAmount || 0) + (ledgerBill.credit || 0);
      const balanceAmount = Math.max(0, totalAmount - paidAmount);

      const formattedSale = {
        _id: ledgerBill._id,
        saleNumber: ledgerBill.description || 'DIRECT-BILL',
        customerName: 'Customer', // Would ideally need a lookup if we want full name here
        customerId: ledgerBill.customerId,
        totalAmount: totalAmount,
        paidAmount: paidAmount,
        balanceAmount: balanceAmount,
        outstandingAmount: balanceAmount,
        status: balanceAmount <= 0 ? 'paid' : (paidAmount > 0 ? 'partial' : 'unpaid'),
        saleDate: ledgerBill.date,
        createdAt: ledgerBill.createdAt,
        isLedgerBill: true
      };
      return res.json({ success: true, data: formattedSale });
    }

    return res.status(404).json({ success: false, message: 'Sale not found' });
  } catch (error) {
    console.error('❌ Get sale error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});
console.log('✅ Route registered: GET /api/sales/:id');

// 8. DELETE /:id
router.delete('/:id', async (req, res) => {
  console.log('🗑️ Route hit: DELETE /:id');
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid sale ID' });
    }

    const db = await getDatabase();
    const userFilter = getUserQuery(req);

    // 1. Check sales collection first
    const sale = await db.collection('sales').findOne({
      _id: new ObjectId(id),
      ...userFilter
    });

    if (sale) {
      await db.collection('sales').deleteOne({
        _id: new ObjectId(id),
        ...userFilter
      });

      if (sale.customerId && !sale.isWalkIn) {
        // Soft delete associated ledger entries
        await db.collection('ledger').updateMany(
          {
            ...userFilter,
            customerId: sale.customerId,
            $or: [
              { saleNumber: sale.saleNumber },
              { description: { $regex: sale.saleNumber } }
            ]
          },
          { $set: { isActive: false, description: 'DELETED: ' + (sale.saleNumber || 'Sale') } }
        );

        const balanceToReverse = sale.outstandingAmount || sale.balanceAmount || 0;
        await db.collection('customers').updateOne(
          { _id: new ObjectId(sale.customerId), ...userFilter },
          {
            $inc: {
              outstanding: -balanceToReverse,
              outstandingAmount: -balanceToReverse
            },
            $set: { updatedAt: new Date() }
          }
        );
      }
      return res.json({ success: true, message: 'Sale deleted successfully' });
    }

    // 2. If not in sales, check ledger collection (Direct Bills)
    const ledgerBill = await db.collection('ledger').findOne({
      _id: new ObjectId(id),
      ...userFilter,
      type: 'Credit'
    });

    if (ledgerBill) {
      // For ledger bills, we "soft delete" or just delete it
      await db.collection('ledger').deleteOne({
        _id: new ObjectId(id),
        ...userFilter
      });

      if (ledgerBill.customerId) {
        const balanceToReverse = (ledgerBill.debit || 0) - (ledgerBill.credit || 0);
        await db.collection('customers').updateOne(
          { _id: new ObjectId(ledgerBill.customerId), ...userFilter },
          {
            $inc: {
              outstanding: -balanceToReverse,
              outstandingAmount: -balanceToReverse
            },
            $set: { updatedAt: new Date() }
          }
        );
      }
      return res.json({ success: true, message: 'Bill deleted successfully' });
    }

    return res.status(404).json({ success: false, message: 'Sale record not found' });
  } catch (error) {
    console.error('❌ Delete sale error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});
console.log('✅ Route registered: DELETE /api/sales/:id');

console.log('==========================================');
console.log('✅ ALL SALES ROUTES LOADED SUCCESSFULLY');
console.log('==========================================');

export default router;