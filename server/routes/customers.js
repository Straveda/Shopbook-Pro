// FILE: server/routes/customers.js - WITH TEST ROUTE
import express from 'express';
import { getDatabase, getUserQuery } from '../api/db.js';
import { ObjectId } from 'mongodb';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Authenticate all routes
router.use(authenticateToken);

// Helper function to ensure both fields are synced
const syncOutstandingFields = (customer) => {
  if (!customer) return null;
  // Prioritize outstandingAmount if it exists, otherwise use legacy outstanding
  const amount = customer.outstandingAmount !== undefined ?
    customer.outstandingAmount :
    (customer.outstanding !== undefined ? customer.outstanding : 0);

  return {
    ...customer,
    outstanding: amount,
    outstandingAmount: amount
  };
};

// GET ALL CUSTOMERS
router.get('/', async (req, res) => {
  console.log('🔥 GET /api/customers');

  try {
    const { search, category, fromDate, toDate } = req.query;
    const db = await getDatabase();
    const userIdStr = req.user.userId;
    const userId = ObjectId.isValid(userIdStr) ? new ObjectId(userIdStr) : userIdStr;
    const userFilter = getUserQuery(req);
    let query = { ...userFilter };

    const andConditions = [];

    if (search) {
      andConditions.push({
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } }
        ]
      });
    }

    // Category filter
    if (category && String(category) !== 'all') {
      const normalizedCategory = String(category).toLowerCase().trim();
      console.log('🔍 Filtering by category:', normalizedCategory);

      if (normalizedCategory === 'regular') {
        // "regular" is the default — also include customers where category is missing/null/empty
        andConditions.push({
          $or: [
            { category: 'regular' },
            { category: { $exists: false } },
            { category: null },
            { category: '' }
          ]
        });
      } else {
        andConditions.push({ category: normalizedCategory });
      }
    }

    if (andConditions.length > 0) {
      query.$and = andConditions;
    }

    // Date range filter (based on createdAt)
    if ((fromDate && fromDate.trim() !== "") || (toDate && toDate.trim() !== "")) {
      query.createdAt = {};
      if (fromDate && fromDate.trim() !== "") {
        const start = new Date(fromDate);
        if (!isNaN(start.getTime())) {
          query.createdAt.$gte = start;
          console.log('📅 From Date Filter:', start.toISOString());
        }
      }
      if (toDate && toDate.trim() !== "") {
        const to = new Date(toDate);
        if (!isNaN(to.getTime())) {
          to.setHours(23, 59, 59, 999);
          query.createdAt.$lte = to;
          console.log('📅 To Date Filter:', to.toISOString());
        }
      }
    }

    console.log('🔍 MongoDB Final Query:', JSON.stringify(query));

    const customers = await db.collection('customers')
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    const syncedCustomers = customers.map(syncOutstandingFields);

    console.log(`✅ Found ${syncedCustomers.length} customers`);

    res.json({
      success: true,
      data: syncedCustomers,
      count: syncedCustomers.length
    });
  } catch (error) {
    console.error('❌ Error fetching customers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch customers',
      error: error.message
    });
  }
});

// CREATE CUSTOMER
router.post('/', async (req, res) => {
  console.log('🔥 POST /api/customers');

  try {
    const { name, phone, altPhone, address, city, creditLimit, category } = req.body;
    console.log('📝 New Customer Request Body:', req.body);

    if (!name || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Name and phone are required'
      });
    }

    if (phone.toString().length !== 10) {
      return res.status(400).json({
        success: false,
        message: 'Phone must be 10 digits'
      });
    }

    const db = await getDatabase();

    const userFilter = getUserQuery(req);
    const existing = await db.collection('customers').findOne({
      phone: phone.toString(),
      ...userFilter
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Customer with this phone number already exists'
      });
    }

    const normalizedCategory = category ? String(category).toLowerCase().trim() : 'regular';
    const validCategories = ['regular', 'retailer', 'wholesaler'];

    console.log('🔍 Normalized category to save:', normalizedCategory);

    const newCustomer = {
      userId: ObjectId.isValid(req.user.userId) ? new ObjectId(req.user.userId) : req.user.userId,
      name: name.trim(),
      phone: phone.toString(),
      altPhone: altPhone ? altPhone.toString() : '',
      address: address ? address.trim() : '',
      city: city ? city.trim() : '',
      creditLimit: creditLimit ? parseFloat(creditLimit) : 0,
      category: validCategories.includes(normalizedCategory) ? normalizedCategory : 'regular',
      outstanding: 0,
      outstandingAmount: 0,
      totalPaid: 0,
      lastTransaction: null,
      dueDate: null,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    console.log('💾 SAVING CUSTOMER TO DB:', JSON.stringify(newCustomer));

    const result = await db.collection('customers').insertOne(newCustomer);
    newCustomer._id = result.insertedId;

    console.log('✅ Customer created:', result.insertedId);

    res.status(201).json({
      success: true,
      message: 'Customer created successfully',
      data: newCustomer
    });
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create customer',
      error: error.message
    });
  }
});


// TEST DUE DATE ENDPOINT - for debugging
router.put('/:id/test-due-date', async (req, res) => {
  console.log('🔥 TEST PUT /api/customers/:id/test-due-date');
  console.log('📝 Params:', req.params);
  console.log('📝 Body:', req.body);
  console.log('📝 User:', req.user);

  try {
    const { id } = req.params;
    const { dueDate } = req.body;

    console.log('🔍 ID:', id);
    console.log('🔍 Due Date:', dueDate);

    if (!ObjectId.isValid(id)) {
      console.log('❌ Invalid ID');
      return res.status(400).json({
        success: false,
        message: 'Invalid customer ID'
      });
    }

    if (!dueDate) {
      console.log('❌ No due date provided');
      return res.status(400).json({
        success: false,
        message: 'Due date is required'
      });
    }

    const userFilter = getUserQuery(req);
    const db = await getDatabase();

    // First, check if customer exists
    const customer = await db.collection('customers').findOne({
      _id: new ObjectId(id),
      ...userFilter
    });

    console.log('🔍 Customer found:', customer ? 'YES' : 'NO');
    console.log('🔍 Customer data:', customer);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    // Now update
    const result = await db.collection('customers').updateOne(
      { _id: new ObjectId(id), ...userFilter },
      {
        $set: {
          dueDate: new Date(dueDate),
          updatedAt: new Date()
        }
      }
    );

    console.log('✅ Update result:', result);

    // Verify the update
    const updatedCustomer = await db.collection('customers').findOne({
      _id: new ObjectId(id)
    });

    console.log('✅ Updated customer dueDate:', updatedCustomer?.dueDate);

    res.json({
      success: true,
      message: 'Due date updated successfully (TEST)',
      data: {
        customerId: id,
        dueDate: updatedCustomer?.dueDate,
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount
      }
    });
  } catch (error) {
    console.error('❌ Error updating due date:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update due date',
      error: error.message
    });
  }
});

// UPDATE DUE DATE - MUST BE BEFORE PUT /:id
router.put('/:id/due-date', async (req, res) => {
  console.log('🔥 PUT /api/customers/:id/due-date');

  try {
    const { id } = req.params;
    const { dueDate } = req.body;

    console.log('📝 Updating due date for customer:', id, 'to:', dueDate);

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid customer ID'
      });
    }

    if (!dueDate) {
      return res.status(400).json({
        success: false,
        message: 'Due date is required'
      });
    }

    const userIdStr = req.user.userId;
    const userId = ObjectId.isValid(userIdStr) ? new ObjectId(userIdStr) : userIdStr;
    const db = await getDatabase();

    const result = await db.collection('customers').updateOne(
      { _id: new ObjectId(id), ...getUserQuery(req) },
      {
        $set: {
          dueDate: new Date(dueDate),
          updatedAt: new Date()
        }
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    console.log('✅ Due date updated successfully');

    res.json({
      success: true,
      message: 'Due date updated successfully'
    });
  } catch (error) {
    console.error('❌ Error updating due date:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update due date',
      error: error.message
    });
  }
});

// ADD TRANSACTION - MUST BE BEFORE PUT /:id
router.post('/:id/transaction', async (req, res) => {
  console.log('🔥 POST /api/customers/:id/transaction');

  try {
    const { id } = req.params;
    const { description, amount, paymentType = 'pending', paidAmount = 0, dueDate } = req.body;

    console.log('📝 Transaction Data:', { id, description, amount, paymentType, paidAmount, dueDate });

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid customer ID'
      });
    }

    if (!description || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Description and amount are required'
      });
    }

    const userIdStr = req.user.userId;
    const userId = ObjectId.isValid(userIdStr) ? new ObjectId(userIdStr) : userIdStr;
    const db = await getDatabase();
    const customer = await db.collection('customers').findOne({
      _id: new ObjectId(id),
      ...getUserQuery(req)
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    const transactionAmount = parseFloat(amount);
    const paid = parseFloat(paidAmount);
    const outstanding = transactionAmount - paid;

    const newOutstanding = (customer.outstanding || 0) + outstanding;
    const newTotalPaid = (customer.totalPaid || 0) + paid;

    // Create ledger entry for debit
    const debitEntry = {
      userId: userId,
      customerId: customer._id,
      date: new Date(),
      type: 'Credit',
      description: description,
      debit: transactionAmount,
      credit: 0,
      balance: (customer.outstanding || 0) + transactionAmount,
      paymentMode: '',
      remarks: '',
      createdAt: new Date()
    };

    await db.collection('ledger').insertOne(debitEntry);

    // If there's a payment, create payment entry
    if (paid > 0) {
      const paymentEntry = {
        userId: userId,
        customerId: customer._id,
        date: new Date(),
        type: 'Payment',
        description: `Payment for ${description}`,
        debit: 0,
        credit: paid,
        balance: newOutstanding,
        paymentMode: 'cash',
        remarks: '',
        createdAt: new Date()
      };

      await db.collection('ledger').insertOne(paymentEntry);
    }

    // Update customer with due date if provided
    const updateData = {
      outstanding: newOutstanding,
      outstandingAmount: newOutstanding,
      totalPaid: newTotalPaid,
      lastTransaction: new Date(),
      updatedAt: new Date()
    };

    // Only set dueDate if provided and there's outstanding balance
    if (dueDate && newOutstanding > 0) {
      updateData.dueDate = new Date(dueDate);
    }

    await db.collection('customers').updateOne(
      { _id: new ObjectId(id), userId: { $in: [req.user.userId, userId] } },
      { $set: updateData }
    );

    console.log('✅ Transaction completed');

    res.json({
      success: true,
      message: 'Transaction recorded successfully',
      data: {
        outstanding: newOutstanding,
        totalPaid: newTotalPaid,
        dueDate: dueDate || null
      }
    });
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add transaction',
      error: error.message
    });
  }
});

// ADD DEBIT - MUST BE BEFORE PUT /:id
router.post('/:id/debit', async (req, res) => {
  console.log('🔥 POST /api/customers/:id/debit');

  try {
    const { id } = req.params;
    const { amount, description, date } = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid customer ID'
      });
    }

    if (!amount || parseFloat(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid amount is required'
      });
    }

    const userIdStr = req.user.userId;
    const userId = ObjectId.isValid(userIdStr) ? new ObjectId(userIdStr) : userIdStr;
    const db = await getDatabase();
    const customer = await db.collection('customers').findOne({
      _id: new ObjectId(id),
      ...getUserQuery(req)
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    const debitAmount = parseFloat(amount);
    const newOutstanding = (customer.outstanding || 0) + debitAmount;

    const ledgerEntry = {
      userId: userId,
      customerId: customer._id,
      date: date ? new Date(date) : new Date(),
      type: 'Credit',
      description: description || 'Service provided',
      debit: debitAmount,
      credit: 0,
      balance: newOutstanding,
      paymentMode: '',
      remarks: '',
      createdAt: new Date()
    };

    await db.collection('customers').updateOne(
      { _id: new ObjectId(id), ...getUserQuery(req) },
      {
        $set: {
          outstanding: newOutstanding,
          outstandingAmount: newOutstanding,
          lastTransaction: new Date(),
          updatedAt: new Date()
        }
      }
    );

    await db.collection('ledger').insertOne(ledgerEntry);

    console.log('✅ Debit recorded');

    res.json({
      success: true,
      message: 'Transaction recorded successfully',
      data: {
        newOutstanding,
        transaction: ledgerEntry
      }
    });
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// ADD CREDIT/PAYMENT - MUST BE BEFORE PUT /:id
router.post('/:id/credit', async (req, res) => {
  console.log('🔥 POST /api/customers/:id/credit');

  try {
    const { id } = req.params;
    const { amount, description, date } = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid customer ID'
      });
    }

    if (!amount || parseFloat(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid amount is required'
      });
    }

    const userIdStr = req.user.userId;
    const userId = ObjectId.isValid(userIdStr) ? new ObjectId(userIdStr) : userIdStr;
    const db = await getDatabase();
    const customer = await db.collection('customers').findOne({
      _id: new ObjectId(id),
      ...getUserQuery(req)
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    const creditAmount = parseFloat(amount);
    const newOutstanding = Math.max(0, (customer.outstanding || 0) - creditAmount);
    const newTotalPaid = (customer.totalPaid || 0) + creditAmount;

    // --- FIFO ALLOCATION START ---
    let remainingPayment = creditAmount;

    // 1. Allocate to Sales
    const outstandingSales = await db.collection('sales').find({
      customerId: id,
      ...getUserQuery(req),
      status: { $in: ['unpaid', 'partial'] }
    }).sort({ saleDate: 1 }).toArray();

    for (const sale of outstandingSales) {
      if (remainingPayment <= 0) break;
      const saleOutstanding = sale.balanceAmount || 0;
      const allocation = Math.min(remainingPayment, saleOutstanding);

      if (allocation > 0) {
        const newPaidAmount = (sale.paidAmount || 0) + allocation;
        const newBalanceAmount = saleOutstanding - allocation;
        const newStatus = newBalanceAmount <= 0 ? 'paid' : 'partial';

        await db.collection('sales').updateOne(
          { _id: sale._id },
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
        remainingPayment -= allocation;
      }
    }

    // 2. Allocate to Ledger Direct Bills (if any payment remains)
    if (remainingPayment > 0) {
      const outstandingLedgerBills = await db.collection('ledger').find({
        customerId: new ObjectId(id),
        ...getUserQuery(req),
        type: 'Credit',
        isActive: { $ne: false }
      }).sort({ date: 1 }).toArray();

      for (const bill of outstandingLedgerBills) {
        if (remainingPayment <= 0) break;
        const billTotal = bill.debit || 0;
        const billPaid = bill.paidAmount || 0;
        const billOutstanding = billTotal - billPaid;
        const allocation = Math.min(remainingPayment, billOutstanding);

        if (allocation > 0) {
          await db.collection('ledger').updateOne(
            { _id: bill._id },
            {
              $inc: { paidAmount: allocation },
              $set: { updatedAt: new Date() }
            }
          );
          remainingPayment -= allocation;
        }
      }
    }
    // --- FIFO ALLOCATION END ---

    const ledgerEntry = {
      userId: userId,
      customerId: customer._id,
      date: date ? new Date(date) : new Date(),
      type: 'Payment',
      description: description || 'Payment received',
      debit: 0,
      credit: creditAmount,
      balance: newOutstanding,
      paymentMode: 'cash',
      remarks: '',
      createdAt: new Date()
    };

    const updateData = {
      outstanding: newOutstanding,
      outstandingAmount: newOutstanding,
      totalPaid: newTotalPaid,
      lastTransaction: new Date(),
      updatedAt: new Date()
    };

    if (newOutstanding === 0) {
      updateData.dueDate = null;
    }

    await db.collection('customers').updateOne(
      { _id: new ObjectId(id), userId: { $in: [req.user.userId, userId] } },
      { $set: updateData }
    );

    await db.collection('ledger').insertOne(ledgerEntry);

    console.log('✅ Payment recorded with FIFO allocation');

    res.json({
      success: true,
      message: 'Payment recorded successfully',
      data: {
        newOutstanding,
        transaction: ledgerEntry
      }
    });
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// RECEIVE PAYMENT - MUST BE BEFORE PUT /:id
router.post('/:id/receive-payment', async (req, res) => {
  console.log('🔥 POST /api/customers/:id/receive-payment');

  try {
    const { id } = req.params;
    const { amount, paymentMode, remarks } = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid customer ID'
      });
    }

    if (!amount || !paymentMode) {
      return res.status(400).json({
        success: false,
        message: 'Amount and payment mode are required'
      });
    }

    const userIdStr = req.user.userId;
    const userId = ObjectId.isValid(userIdStr) ? new ObjectId(userIdStr) : userIdStr;
    const db = await getDatabase();
    const customer = await db.collection('customers').findOne({
      _id: new ObjectId(id),
      ...getUserQuery(req)
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    const paymentAmount = parseFloat(amount);

    if (paymentAmount > (customer.outstanding || 0)) {
      return res.status(400).json({
        success: false,
        message: `Amount cannot exceed outstanding balance of ₹${customer.outstanding}`
      });
    }

    // --- FIFO ALLOCATION START ---
    let remainingPayment = paymentAmount;

    // 1. Allocate to Sales
    const outstandingSales = await db.collection('sales').find({
      customerId: id,
      ...getUserQuery(req),
      status: { $in: ['unpaid', 'partial'] }
    }).sort({ saleDate: 1 }).toArray();

    for (const sale of outstandingSales) {
      if (remainingPayment <= 0) break;
      const saleOutstanding = sale.balanceAmount || 0;
      const allocation = Math.min(remainingPayment, saleOutstanding);

      if (allocation > 0) {
        const newPaidAmount = (sale.paidAmount || 0) + allocation;
        const newBalanceAmount = saleOutstanding - allocation;
        const newStatus = newBalanceAmount <= 0 ? 'paid' : 'partial';

        await db.collection('sales').updateOne(
          { _id: sale._id },
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
        remainingPayment -= allocation;
      }
    }

    // 2. Allocate to Ledger Direct Bills (if any payment remains)
    if (remainingPayment > 0) {
      const outstandingLedgerBills = await db.collection('ledger').find({
        customerId: new ObjectId(id),
        ...getUserQuery(req),
        type: 'Credit',
        isActive: { $ne: false }
      }).sort({ date: 1 }).toArray();

      for (const bill of outstandingLedgerBills) {
        if (remainingPayment <= 0) break;
        const billTotal = bill.debit || 0;
        const billPaid = bill.paidAmount || 0;
        const billOutstanding = billTotal - billPaid;
        const allocation = Math.min(remainingPayment, billOutstanding);

        if (allocation > 0) {
          await db.collection('ledger').updateOne(
            { _id: bill._id },
            {
              $inc: { paidAmount: allocation },
              $set: { updatedAt: new Date() }
            }
          );
          remainingPayment -= allocation;
        }
      }
    }
    // --- FIFO ALLOCATION END ---

    const newOutstanding = (customer.outstanding || 0) - paymentAmount;
    const newTotalPaid = (customer.totalPaid || 0) + paymentAmount;

    const updateData = {
      outstanding: newOutstanding,
      outstandingAmount: newOutstanding,
      totalPaid: newTotalPaid,
      lastTransaction: new Date(),
      updatedAt: new Date()
    };

    if (newOutstanding === 0) {
      updateData.dueDate = null;
    }

    await db.collection('customers').updateOne(
      { _id: new ObjectId(id), ...getUserQuery(req) },
      { $set: updateData }
    );

    await db.collection('ledger').insertOne({
      userId: userId,
      customerId: customer._id,
      date: new Date(),
      type: 'Payment',
      description: `Payment Received - ${paymentMode}`,
      debit: 0,
      credit: paymentAmount,
      balance: newOutstanding,
      paymentMode,
      remarks: remarks || '',
      createdAt: new Date()
    });

    console.log('✅ Payment received with FIFO allocation');

    res.json({
      success: true,
      message: `Payment of ₹${paymentAmount} received successfully`,
      data: {
        outstanding: newOutstanding,
        totalPaid: newTotalPaid,
        paymentMode
      }
    });
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to receive payment',
      error: error.message
    });
  }
});

// ADD NOTE - MUST BE BEFORE PUT /:id
router.post('/:id/notes', async (req, res) => {
  console.log('🔥 POST /api/customers/:id/notes');

  try {
    const { id } = req.params;
    const { content } = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid customer ID'
      });
    }

    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Note content is required'
      });
    }

    const userIdStr = req.user.userId;
    const userId = ObjectId.isValid(userIdStr) ? new ObjectId(userIdStr) : userIdStr;
    const db = await getDatabase();

    const customer = await db.collection('customers').findOne({
      _id: new ObjectId(id),
      ...getUserQuery(req)
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    const newNote = {
      userId: userId,
      customerId: new ObjectId(id),
      content: content.trim(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.collection('notes').insertOne(newNote);
    newNote._id = result.insertedId;

    console.log('✅ Note added');

    res.status(201).json({
      success: true,
      message: 'Note added successfully',
      data: newNote
    });
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add note',
      error: error.message
    });
  }
});

// DELETE NOTE - MUST BE BEFORE DELETE /:id
router.delete('/:id/notes/:noteId', async (req, res) => {
  console.log('🔥 DELETE /api/customers/:id/notes/:noteId');

  try {
    const { id, noteId } = req.params;

    if (!ObjectId.isValid(id) || !ObjectId.isValid(noteId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid customer or note ID'
      });
    }

    const userFilter = getUserQuery(req);
    const db = await getDatabase();

    const result = await db.collection('notes').deleteOne({
      _id: new ObjectId(noteId),
      customerId: new ObjectId(id),
      ...userFilter
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Note not found'
      });
    }

    console.log('✅ Note deleted');

    res.json({
      success: true,
      message: 'Note deleted successfully'
    });
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete note',
      error: error.message
    });
  }
});

// GET SINGLE CUSTOMER
router.get('/:id', async (req, res) => {
  console.log('🔥 GET /api/customers/:id');

  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid customer ID'
      });
    }

    const userId = new ObjectId(req.user.userId);
    const db = await getDatabase();
    const customer = await db.collection('customers').findOne({
      _id: new ObjectId(id),
      ...getUserQuery(req)
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    const ledger = await db.collection('ledger')
      .find({ customerId: customer._id, ...getUserQuery(req) })
      .sort({ date: -1 })
      .toArray();

    const notes = await db.collection('notes')
      .find({ customerId: customer._id, ...getUserQuery(req) })
      .sort({ createdAt: -1 })
      .toArray();

    const syncedCustomer = syncOutstandingFields(customer);

    console.log('✅ Customer found');

    res.json({
      success: true,
      data: {
        ...syncedCustomer,
        ledger,
        notes
      }
    });
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch customer',
      error: error.message
    });
  }
});

// UPDATE CUSTOMER
router.put('/:id', async (req, res) => {
  console.log('🔥 PUT /api/customers/:id');

  try {
    const { id } = req.params;
    const { name, phone, altPhone, address, city, creditLimit, category } = req.body;
    console.log(`📝 Update Customer Request Body for ${id}:`, req.body);

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid customer ID'
      });
    }

    const db = await getDatabase();
    const userIdStr = req.user.userId;
    const userId = ObjectId.isValid(userIdStr) ? new ObjectId(userIdStr) : userIdStr;

    if (phone) {
      const existing = await db.collection('customers').findOne({
        phone: phone.toString(),
        _id: { $ne: new ObjectId(id) },
        ...getUserQuery(req)
      });

      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'Phone number already exists'
        });
      }
    }

    const normalizedCategory = category ? String(category).toLowerCase().trim() : undefined;
    const validCategories = ['regular', 'retailer', 'wholesaler'];
    const updateData = { updatedAt: new Date() };
    if (name) updateData.name = name.trim();
    if (phone) updateData.phone = phone.toString();
    if (altPhone !== undefined) updateData.altPhone = altPhone ? altPhone.toString() : '';
    if (address !== undefined) updateData.address = address ? address.trim() : '';
    if (city !== undefined) updateData.city = city ? city.trim() : '';
    if (creditLimit !== undefined) updateData.creditLimit = parseFloat(creditLimit);

    if (normalizedCategory) {
      if (validCategories.includes(normalizedCategory)) {
        updateData.category = normalizedCategory;
      } else {
        console.log('⚠️ Invalid category provided in update:', normalizedCategory);
      }
    }

    console.log('💾 Updating Customer Object:', JSON.stringify(updateData));

    const result = await db.collection('customers').updateOne(
      { _id: new ObjectId(id), ...getUserQuery(req) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    const updated = await db.collection('customers').findOne({
      _id: new ObjectId(id),
      ...getUserQuery(req)
    });

    const syncedCustomer = syncOutstandingFields(updated);

    console.log('✅ Customer updated');

    res.json({
      success: true,
      message: 'Customer updated successfully',
      data: syncedCustomer
    });
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update customer',
      error: error.message
    });
  }
});

// DELETE CUSTOMER
router.delete('/:id', async (req, res) => {
  console.log('🔥 DELETE /api/customers/:id');

  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid customer ID'
      });
    }

    const userId = new ObjectId(req.user.userId);
    const db = await getDatabase();

    const customer = await db.collection('customers').findOne({
      _id: new ObjectId(id),
      ...getUserQuery(req)
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    await db.collection('customers').deleteOne({
      _id: new ObjectId(id),
      ...getUserQuery(req)
    });

    await db.collection('ledger').deleteMany({
      customerId: new ObjectId(id),
      ...getUserQuery(req)
    });

    await db.collection('notes').deleteMany({
      customerId: new ObjectId(id),
      ...getUserQuery(req)
    });

    console.log('✅ Customer deleted');

    res.json({
      success: true,
      message: 'Customer deleted successfully'
    });
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete customer',
      error: error.message
    });
  }
});

console.log('✅ Customers route loaded with proper route ordering');

export default router;