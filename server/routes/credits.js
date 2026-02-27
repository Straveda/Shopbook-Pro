// FILE: routes/credits.js (CREDIT BOOK - COMPLETE & ADAPTED)
import express from 'express';
import { getDatabase } from '../api/db.js';
import { ObjectId } from 'mongodb';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// âœ… Authenticate all credit routes
router.use(authenticateToken);

// ============================================
// GET ALL CREDITS (with search & filters)
// ============================================
router.get('/', async (req, res) => {
  try {
    const {
      search,
      status,
      customerId,
      startDate,
      endDate,
      page = 1,
      limit = 50
    } = req.query;

    const db = await getDatabase();
    const query = { userId: req.user.userId, isActive: true };

    // ðŸ” Search by customer name or phone
    if (search) {
      query.$or = [
        { customerName: { $regex: search, $options: 'i' } },
        { customerPhone: { $regex: search, $options: 'i' } }
      ];
    }

    // ðŸ“Š Filter by status
    if (status && status !== 'all') {
      if (status === 'overdue') {
        query.dueDate = { $lt: new Date() };
        query.balance = { $gt: 0 };
      } else {
        query.status = status;
      }
    }

    // ðŸ‘¤ Filter by customer
    if (customerId) {
      query.customerId = customerId;
    }

    // ðŸ“… Filter by date range
    if (startDate || endDate) {
      query.givenOn = {};
      if (startDate) query.givenOn.$gte = new Date(startDate);
      if (endDate) query.givenOn.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [credits, total] = await Promise.all([
      db.collection('credits')
        .find(query)
        .sort({ givenOn: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .toArray(),
      db.collection('credits').countDocuments(query)
    ]);

    // Calculate days overdue for each credit
    const creditsWithOverdue = credits.map(credit => {
      const daysOverdue = credit.dueDate 
        ? Math.max(0, Math.floor((new Date() - new Date(credit.dueDate)) / (1000 * 60 * 60 * 24)))
        : 0;
      return { ...credit, daysOverdue };
    });

    console.log('âœ… Fetched credits:', creditsWithOverdue.length);

    res.json({
      success: true,
      data: creditsWithOverdue,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('âŒ Get credits error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// ============================================
// GET SINGLE CREDIT BY ID
// ============================================
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid credit ID' 
      });
    }

    const db = await getDatabase();
    const credit = await db.collection('credits').findOne({
      _id: new ObjectId(id),
      userId: req.user.userId,
      isActive: true
    });

    if (!credit) {
      return res.status(404).json({
        success: false,
        message: 'Credit not found'
      });
    }

    res.json({
      success: true,
      data: credit
    });
  } catch (error) {
    console.error('âŒ Get credit error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// ============================================
// CREATE NEW CREDIT
// ============================================
router.post('/', async (req, res) => {
  try {
    const {
      customerId,
      amount,
      service,
      dueDate,
      note,
      givenOn
    } = req.body;

    console.log('ðŸ“ Creating credit:', { customerId, amount, service });

    // âœ… Validate required fields
    if (!customerId || !amount || !service) {
      return res.status(400).json({
        success: false,
        message: 'Customer, amount, and service are required'
      });
    }

    if (parseFloat(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be greater than 0'
      });
    }

    const db = await getDatabase();

    // âœ… Fetch customer details
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

    // âœ… Create credit entry
    const creditData = {
      userId: req.user.userId,
      customerId: customerId,
      customerName: customer.name,
      customerPhone: customer.phone,
      amount: parseFloat(amount),
      balance: parseFloat(amount),
      givenOn: givenOn ? new Date(givenOn) : new Date(),
      dueDate: dueDate ? new Date(dueDate) : null,
      status: 'pending',
      service: service.trim(),
      note: note?.trim() || null,
      payments: [],
      reminders: [],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // âœ… Auto-set status based on due date
    if (creditData.dueDate && new Date() > creditData.dueDate) {
      creditData.status = 'overdue';
    }

    const result = await db.collection('credits').insertOne(creditData);
    console.log('âœ… Credit created:', result.insertedId);

    res.status(201).json({
      success: true,
      message: 'Credit added successfully',
      data: { _id: result.insertedId, ...creditData }
    });
  } catch (error) {
    console.error('âŒ Create credit error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// ============================================
// UPDATE CREDIT
// ============================================
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, service, dueDate, note } = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid credit ID'
      });
    }

    const db = await getDatabase();

    const credit = await db.collection('credits').findOne({
      _id: new ObjectId(id),
      userId: req.user.userId,
      isActive: true
    });

    if (!credit) {
      return res.status(404).json({
        success: false,
        message: 'Credit not found'
      });
    }

    // âœ… Build update data
    const updateData = {
      updatedAt: new Date()
    };

    if (amount !== undefined) {
      const newAmount = parseFloat(amount);
      const paidAmount = credit.amount - credit.balance;
      updateData.amount = newAmount;
      updateData.balance = Math.max(0, newAmount - paidAmount);
    }

    if (service !== undefined) updateData.service = service.trim();
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;
    if (note !== undefined) updateData.note = note?.trim() || null;

    // âœ… Auto-update status
    if (updateData.balance === 0) {
      updateData.status = 'cleared';
    } else if (updateData.balance < credit.amount) {
      updateData.status = 'partial';
    } else if (updateData.dueDate && new Date() > updateData.dueDate) {
      updateData.status = 'overdue';
    } else {
      updateData.status = 'pending';
    }

    const result = await db.collection('credits').updateOne(
      { _id: new ObjectId(id), userId: req.user.userId },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Credit not found'
      });
    }

    console.log('âœ… Credit updated:', id);

    res.json({
      success: true,
      message: 'Credit updated successfully'
    });
  } catch (error) {
    console.error('âŒ Update credit error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// ============================================
// DELETE CREDIT (soft delete)
// ============================================
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid credit ID'
      });
    }

    const db = await getDatabase();

    const credit = await db.collection('credits').findOne({
      _id: new ObjectId(id),
      userId: req.user.userId,
      isActive: true
    });

    if (!credit) {
      return res.status(404).json({
        success: false,
        message: 'Credit not found'
      });
    }

    // âœ… Soft delete
    const result = await db.collection('credits').updateOne(
      { _id: new ObjectId(id), userId: req.user.userId },
      { $set: { isActive: false, updatedAt: new Date() } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Credit not found'
      });
    }

    console.log('âœ… Credit deleted:', id);

    res.json({
      success: true,
      message: 'Credit deleted successfully'
    });
  } catch (error) {
    console.error('âŒ Delete credit error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// ============================================
// RECORD PAYMENT
// ============================================
router.post('/:id/payment', async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, paymentMethod, note } = req.body;

    console.log('ðŸ’³ Payment request:', { creditId: id, amount, paymentMethod });

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid credit ID'
      });
    }

    if (!amount || parseFloat(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid payment amount is required'
      });
    }

    const db = await getDatabase();

    const credit = await db.collection('credits').findOne({
      _id: new ObjectId(id),
      userId: req.user.userId,
      isActive: true
    });

    if (!credit) {
      return res.status(404).json({
        success: false,
        message: 'Credit not found'
      });
    }

    const paymentAmount = parseFloat(amount);

    if (paymentAmount > credit.balance) {
      return res.status(400).json({
        success: false,
        message: `Payment amount cannot exceed outstanding balance of â‚¹${credit.balance}`
      });
    }

    // âœ… Create payment record
    const payment = {
      amount: paymentAmount,
      paymentDate: new Date(),
      paymentMethod: paymentMethod || 'cash',
      note: note?.trim() || null
    };

    // âœ… Calculate new balance and status
    const newBalance = credit.balance - paymentAmount;
    let newStatus = 'pending';
    
    if (newBalance === 0) {
      newStatus = 'cleared';
    } else if (newBalance < credit.amount) {
      newStatus = 'partial';
    } else if (credit.dueDate && new Date() > new Date(credit.dueDate)) {
      newStatus = 'overdue';
    }

    // âœ… Update credit with payment
    const result = await db.collection('credits').updateOne(
      { _id: new ObjectId(id), userId: req.user.userId },
      {
        $push: { payments: payment },
        $set: {
          balance: newBalance,
          status: newStatus,
          updatedAt: new Date()
        }
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Credit not found'
      });
    }

    console.log('âœ… Payment recorded:', { newBalance, newStatus });

    res.status(201).json({
      success: true,
      message: 'Payment recorded successfully',
      data: {
        creditId: id,
        customerName: credit.customerName,
        previousBalance: credit.balance,
        paymentAmount: paymentAmount,
        newBalance: newBalance,
        status: newStatus
      }
    });
  } catch (error) {
    console.error('âŒ Record payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// ============================================
// SEND REMINDER
// ============================================
router.post('/:id/reminder', async (req, res) => {
  try {
    const { id } = req.params;
    const { channel, message } = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid credit ID'
      });
    }

    const db = await getDatabase();

    const credit = await db.collection('credits').findOne({
      _id: new ObjectId(id),
      userId: req.user.userId,
      isActive: true
    });

    if (!credit) {
      return res.status(404).json({
        success: false,
        message: 'Credit not found'
      });
    }

    if (credit.balance === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot send reminder for cleared credit'
      });
    }

    // âœ… Create reminder record
    const reminderMessage = message || 
      `Payment reminder: â‚¹${credit.balance} outstanding for ${credit.service}. Due date: ${credit.dueDate ? new Date(credit.dueDate).toLocaleDateString() : 'Not set'}`;

    const reminder = {
      sentAt: new Date(),
      channel: channel || 'whatsapp',
      status: 'sent',
      message: reminderMessage
    };

    // âœ… Add reminder to credit
    const result = await db.collection('credits').updateOne(
      { _id: new ObjectId(id), userId: req.user.userId },
      {
        $push: { reminders: reminder },
        $set: { updatedAt: new Date() }
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Credit not found'
      });
    }

    // ðŸ“± Here you would integrate with WhatsApp/SMS API
    console.log(`ðŸ“± Reminder sent to ${credit.customerPhone}: ${reminderMessage}`);

    res.json({
      success: true,
      message: `Reminder sent to ${credit.customerName}`,
      data: {
        creditId: id,
        customerName: credit.customerName,
        customerPhone: credit.customerPhone,
        reminder: reminder
      }
    });
  } catch (error) {
    console.error('âŒ Send reminder error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// ============================================
// SEND BULK REMINDERS
// ============================================
router.post('/reminders/bulk', async (req, res) => {
  try {
    const { filter } = req.body;

    console.log('ðŸ“¨ Bulk reminder request:', filter);

    const db = await getDatabase();
    const query = { 
      userId: req.user.userId, 
      isActive: true, 
      balance: { $gt: 0 } 
    };

    // âœ… Filter by overdue if specified
    if (filter === 'overdue') {
      query.dueDate = { $lt: new Date() };
    }

    const credits = await db.collection('credits').find(query).toArray();

    if (credits.length === 0) {
      return res.json({
        success: true,
        message: 'No credits found to send reminders',
        count: 0
      });
    }

    // âœ… Send reminders to all matching credits
    const reminder = {
      sentAt: new Date(),
      channel: 'whatsapp',
      status: 'sent',
      message: 'Payment reminder - bulk sent'
    };

    const bulkOps = credits.map(credit => ({
      updateOne: {
        filter: { _id: credit._id },
        update: {
          $push: { reminders: reminder },
          $set: { updatedAt: new Date() }
        }
      }
    }));

    const result = await db.collection('credits').bulkWrite(bulkOps);

    console.log('âœ… Bulk reminders sent:', result.modifiedCount);

    res.json({
      success: true,
      message: `Reminders sent to ${result.modifiedCount} customers`,
      count: result.modifiedCount,
      total: credits.length
    });
  } catch (error) {
    console.error('âŒ Bulk reminders error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// ============================================
// GET SUMMARY STATISTICS
// ============================================
router.get('/summary/stats', async (req, res) => {
  try {
    const { customerId, startDate, endDate } = req.query;

    const db = await getDatabase();
    const matchQuery = { 
      userId: req.user.userId, 
      isActive: true 
    };

    if (customerId) matchQuery.customerId = customerId;
    if (startDate || endDate) {
      matchQuery.givenOn = {};
      if (startDate) matchQuery.givenOn.$gte = new Date(startDate);
      if (endDate) matchQuery.givenOn.$lte = new Date(endDate);
    }

    const credits = await db.collection('credits').find(matchQuery).toArray();

    // âœ… Calculate summary
    const summary = credits.reduce((acc, credit) => {
      acc.totalOutstanding += credit.balance;
      acc.totalCredits += 1;
      acc.totalAmountGiven += credit.amount;
      acc.totalAmountReceived += (credit.amount - credit.balance);

      if (credit.balance > 0) acc.activeCredits += 1;
      if (credit.balance === 0) acc.clearedCredits += 1;
      
      if (credit.dueDate && new Date() > new Date(credit.dueDate) && credit.balance > 0) {
        acc.overdueAmount += credit.balance;
        acc.overdueCount += 1;
      }

      return acc;
    }, {
      totalOutstanding: 0,
      totalCredits: 0,
      activeCredits: 0,
      clearedCredits: 0,
      overdueAmount: 0,
      overdueCount: 0,
      totalAmountGiven: 0,
      totalAmountReceived: 0
    });

    console.log('âœ… Summary calculated:', summary);

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('âŒ Get summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// ============================================
// GET CUSTOMER-WISE SUMMARY
// ============================================
router.get('/customer/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;

    const db = await getDatabase();
    const credits = await db.collection('credits')
      .find({ 
        userId: req.user.userId,
        customerId: customerId,
        isActive: true 
      })
      .sort({ givenOn: -1 })
      .toArray();

    const summary = credits.reduce((acc, credit) => {
      acc.totalOutstanding += credit.balance;
      acc.totalAmount += credit.amount;
      acc.totalPaid += (credit.amount - credit.balance);
      acc.creditCount += 1;
      if (credit.balance > 0) acc.activeCount += 1;
      if (credit.status === 'overdue') {
        acc.overdueAmount += credit.balance;
        acc.overdueCount += 1;
      }
      return acc;
    }, {
      totalOutstanding: 0,
      totalAmount: 0,
      totalPaid: 0,
      creditCount: 0,
      activeCount: 0,
      overdueAmount: 0,
      overdueCount: 0
    });

    res.json({
      success: true,
      data: { summary, credits }
    });
  } catch (error) {
    console.error('âŒ Get customer summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// ============================================
// GET PAYMENT HISTORY
// ============================================
router.get('/:id/payments', async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid credit ID'
      });
    }

    const db = await getDatabase();
    const credit = await db.collection('credits').findOne(
      {
        _id: new ObjectId(id),
        userId: req.user.userId,
        isActive: true
      },
      { projection: { payments: 1, customerName: 1, service: 1 } }
    );

    if (!credit) {
      return res.status(404).json({
        success: false,
        message: 'Credit not found'
      });
    }

    res.json({
      success: true,
      data: {
        customerName: credit.customerName,
        service: credit.service,
        payments: credit.payments || []
      }
    });
  } catch (error) {
    console.error('âŒ Get payment history error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

export default router;