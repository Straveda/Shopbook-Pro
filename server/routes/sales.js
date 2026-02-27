// FILE: routes/sales.js (WITH DIAGNOSTICS)
import express from 'express';
import { getDatabase } from '../api/db.js';
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

// 1. GET /stats/summary
router.get('/stats/summary', async (req, res) => {
  console.log('📊 Route hit: GET /stats/summary');
  try {
    const db = await getDatabase();
    const sales = await db.collection('sales')
      .find({ userId: req.user.userId })
      .toArray();
    
    const totalSales = sales.reduce((sum, sale) => sum + (sale.totalAmount || 0), 0);
    const paidAmount = sales.reduce((sum, sale) => sum + (sale.paidAmount || 0), 0);
    const outstanding = sales.reduce((sum, sale) => sum + (sale.balanceAmount || sale.outstandingAmount || 0), 0);
    
    const totalCost = totalSales * 0.30;
    const profit = paidAmount - totalCost;
    const profitMargin = paidAmount > 0 ? ((profit / paidAmount) * 100).toFixed(1) : 0;

    const stats = {
      totalInvoices: sales.length,
      totalSales: totalSales,
      paidAmount: paidAmount,
      outstanding: outstanding,
      profit: profit,
      totalCost: totalCost,
      profitMargin: profitMargin,
      unpaidCount: sales.filter(s => s.status === 'unpaid').length,
      partialCount: sales.filter(s => s.status === 'partial').length,
      paidCount: sales.filter(s => s.status === 'paid').length
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
    const sales = await db.collection('sales')
      .find({ userId: req.user.userId, customerId: customerId })
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

    const db = await getDatabase();
    
    // ✅ Generate sale number
    const count = await db.collection('sales').countDocuments({ userId: req.user.userId });
    const saleNumber = `SALE-${String(count + 1).padStart(5, '0')}`;

    console.log('📨 Creating walk-in sale:', { saleNumber });

    // ✅ Create walk-in sale data
    const saleData = {
      userId: req.user.userId,
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

// 4. GET / - All sales
router.get('/', async (req, res) => {
  console.log('📋 Route hit: GET /');
  try {
    const db = await getDatabase();
    const sales = await db.collection('sales')
      .find({ userId: req.user.userId })
      .sort({ saleDate: -1 })
      .toArray();
    
    const formattedSales = sales.map(sale => ({
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

    const db = await getDatabase();
    const count = await db.collection('sales').countDocuments({ userId: req.user.userId });
    const saleNumber = `SALE-${String(count + 1).padStart(5, '0')}`;

    if (!ObjectId.isValid(customerId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid customer ID format' 
      });
    }

    const customer = await db.collection('customers').findOne({
      _id: new ObjectId(customerId),
      userId: req.user.userId
    });

    if (!customer) {
      return res.status(404).json({ 
        success: false, 
        message: 'Customer not found' 
      });
    }

    const saleData = {
      userId: req.user.userId,
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
      userId: req.user.userId,
      date: saleData.saleDate,
      type: 'Credit',
      description: `Sale ${saleNumber}`,
      debit: parseFloat(totalAmount),
      credit: 0,
      balance: (customer.outstanding || 0) + parseFloat(totalAmount),
      createdAt: new Date()
    };

    await db.collection('ledger').insertOne(ledgerEntry);

    await db.collection('customers').updateOne(
      { _id: new ObjectId(customerId), userId: req.user.userId },
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
    const sale = await db.collection('sales').findOne({
      _id: new ObjectId(id),
      userId: req.user.userId
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
      { _id: new ObjectId(id), userId: req.user.userId },
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
        userId: req.user.userId
      });

      const ledgerEntry = {
        customerId: sale.customerId,
        userId: req.user.userId,
        date: new Date(),
        type: 'Payment',
        description: `Payment for ${sale.saleNumber}`,
        debit: 0,
        credit: paymentAmount,
        balance: (customer.outstanding || 0) - paymentAmount,
        paymentMode: paymentMode || 'Cash',
        remarks: remarks || null,
        createdAt: new Date()
      };

      await db.collection('ledger').insertOne(ledgerEntry);

      await db.collection('customers').updateOne(
        { _id: new ObjectId(sale.customerId), userId: req.user.userId },
        { 
          $inc: { outstanding: -paymentAmount },
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
    const sale = await db.collection('sales').findOne({
      _id: new ObjectId(id),
      userId: req.user.userId
    });

    if (!sale) {
      return res.status(404).json({ success: false, message: 'Sale not found' });
    }

    const formattedSale = {
      ...sale,
      outstandingAmount: sale.balanceAmount || 0
    };

    res.json({ success: true, data: formattedSale });
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
    const sale = await db.collection('sales').findOne({
      _id: new ObjectId(id),
      userId: req.user.userId
    });

    if (!sale) {
      return res.status(404).json({ success: false, message: 'Sale not found' });
    }

    await db.collection('sales').deleteOne({
      _id: new ObjectId(id),
      userId: req.user.userId
    });

    if (sale.customerId && !sale.isWalkIn) {
      await db.collection('ledger').deleteMany({
        userId: req.user.userId,
        customerId: sale.customerId,
        description: { $regex: sale.saleNumber }
      });

      const balanceToReverse = sale.balanceAmount || sale.outstandingAmount || 0;
      await db.collection('customers').updateOne(
        { _id: new ObjectId(sale.customerId), userId: req.user.userId },
        { 
          $inc: { outstanding: -balanceToReverse },
          $set: { updatedAt: new Date() }
        }
      );
    }

    res.json({ success: true, message: 'Sale deleted successfully' });
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