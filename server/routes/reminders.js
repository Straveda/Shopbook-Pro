import express from 'express';
import { getDatabase } from '../api/db.js';
import { ObjectId } from 'mongodb';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Middleware to authenticate all reminder routes
router.use(authenticateToken);

// Get all reminders for logged-in user
router.get('/', async (req, res) => {
  try {
    const db = await getDatabase();
    const reminders = await db.collection('reminders')
      .find({ userId: req.user.userId })
      .sort({ reminderDate: 1 })
      .toArray();
    
    res.json({ success: true, data: reminders });
  } catch (error) {
    console.error('Get reminders error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Get single reminder by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid reminder ID' });
    }

    const db = await getDatabase();
    const reminder = await db.collection('reminders').findOne({
      _id: new ObjectId(id),
      userId: req.user.userId
    });

    if (!reminder) {
      return res.status(404).json({ success: false, message: 'Reminder not found' });
    }

    res.json({ success: true, data: reminder });
  } catch (error) {
    console.error('Get reminder error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Create new reminder
router.post('/', async (req, res) => {
  try {
    const { customerId, customerName, customerPhone, message, reminderDate, channel } = req.body;

    // Validation
    if (!customerId || !message || !reminderDate) {
      return res.status(400).json({ 
        success: false, 
        message: 'Customer ID, message, and reminder date are required' 
      });
    }

    const db = await getDatabase();
    
    // Fetch customer details if not provided
    let custName = customerName;
    let custPhone = customerPhone;
    
    if (!custName || !custPhone) {
      const customer = await db.collection('customers').findOne({
        _id: new ObjectId(customerId),
        userId: req.user.userId
      });
      
      if (!customer) {
        return res.status(404).json({ success: false, message: 'Customer not found' });
      }
      
      custName = customer.name;
      custPhone = customer.phone;
    }
    
    const reminderData = {
      userId: req.user.userId,
      customerId: customerId,
      customerName: custName,
      customerPhone: custPhone,
      message: message.trim(),
      reminderDate: new Date(reminderDate),
      channel: channel || 'whatsapp',
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.collection('reminders').insertOne(reminderData);

    res.status(201).json({
      success: true,
      message: 'Reminder created successfully',
      data: { _id: result.insertedId, ...reminderData }
    });
  } catch (error) {
    console.error('Create reminder error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Update reminder
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { message, reminderDate, status, channel } = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid reminder ID' });
    }

    const db = await getDatabase();

    const updateData = {
      updatedAt: new Date()
    };

    if (message) updateData.message = message.trim();
    if (reminderDate) updateData.reminderDate = new Date(reminderDate);
    if (status) updateData.status = status;
    if (channel) updateData.channel = channel;

    const result = await db.collection('reminders').updateOne(
      { _id: new ObjectId(id), userId: req.user.userId },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ success: false, message: 'Reminder not found' });
    }

    res.json({ success: true, message: 'Reminder updated successfully' });
  } catch (error) {
    console.error('Update reminder error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Delete reminder
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid reminder ID' });
    }

    const db = await getDatabase();
    const result = await db.collection('reminders').deleteOne({
      _id: new ObjectId(id),
      userId: req.user.userId
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, message: 'Reminder not found' });
    }

    res.json({ success: true, message: 'Reminder deleted successfully' });
  } catch (error) {
    console.error('Delete reminder error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Mark reminder as completed
router.patch('/:id/complete', async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid reminder ID' });
    }

    const db = await getDatabase();
    const result = await db.collection('reminders').updateOne(
      { _id: new ObjectId(id), userId: req.user.userId },
      { 
        $set: { 
          status: 'completed',
          completedAt: new Date(),
          updatedAt: new Date()
        }
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ success: false, message: 'Reminder not found' });
    }

    res.json({ success: true, message: 'Reminder marked as completed' });
  } catch (error) {
    console.error('Complete reminder error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Send reminder now (via WhatsApp/SMS)
router.post('/:id/send', async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid reminder ID' });
    }

    const db = await getDatabase();
    const reminder = await db.collection('reminders').findOne({
      _id: new ObjectId(id),
      userId: req.user.userId
    });

    if (!reminder) {
      return res.status(404).json({ success: false, message: 'Reminder not found' });
    }

    // TODO: Integrate with WhatsApp/SMS API
    // For now, we'll simulate sending
    console.log(`ðŸ“± Sending ${reminder.channel} to ${reminder.customerPhone}`);
    console.log(`Message: ${reminder.message}`);

    // Simulate API call
    const sendSuccess = true; // Replace with actual API call result

    if (sendSuccess) {
      // Update reminder status to sent
      await db.collection('reminders').updateOne(
        { _id: new ObjectId(id), userId: req.user.userId },
        { 
          $set: { 
            status: 'sent',
            sentAt: new Date(),
            updatedAt: new Date()
          }
        }
      );

      res.json({ 
        success: true, 
        message: `Reminder sent successfully via ${reminder.channel}`,
        data: {
          reminderId: id,
          customerName: reminder.customerName,
          channel: reminder.channel,
          sentAt: new Date()
        }
      });
    } else {
      // Update status to failed
      await db.collection('reminders').updateOne(
        { _id: new ObjectId(id), userId: req.user.userId },
        { 
          $set: { 
            status: 'failed',
            updatedAt: new Date()
          }
        }
      );

      res.status(500).json({ success: false, message: 'Failed to send reminder' });
    }
  } catch (error) {
    console.error('Send reminder error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Get upcoming reminders (next 7 days)
router.get('/upcoming/week', async (req, res) => {
  try {
    const db = await getDatabase();
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);

    const reminders = await db.collection('reminders')
      .find({ 
        userId: req.user.userId,
        status: 'pending',
        reminderDate: {
          $gte: today,
          $lte: nextWeek
        }
      })
      .sort({ reminderDate: 1 })
      .toArray();
    
    res.json({ success: true, data: reminders });
  } catch (error) {
    console.error('Get upcoming reminders error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Send bulk reminders to customers with outstanding payments
router.post('/bulk-send', async (req, res) => {
  try {
    const { filter } = req.body;
    const db = await getDatabase();

    // Get customers with outstanding amounts
    const query = { 
      userId: req.user.userId,
      outstandingAmount: { $gt: 0 }
    };

    // If filter is 'overdue', only get customers with no recent transactions
    if (filter === 'overdue') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      query.$or = [
        { lastTransaction: { $lt: thirtyDaysAgo } },
        { lastTransaction: null }
      ];
    }

    const customers = await db.collection('customers').find(query).toArray();

    if (customers.length === 0) {
      return res.json({
        success: true,
        message: 'No customers found to send reminders',
        count: 0
      });
    }

    let successCount = 0;
    let failedCount = 0;

    // Create reminders for each customer
    const bulkReminders = customers.map(customer => ({
      userId: req.user.userId,
      customerId: customer._id.toString(),
      customerName: customer.name,
      customerPhone: customer.phone,
      message: `Payment reminder: You have an outstanding balance of â‚¹${customer.outstandingAmount.toLocaleString()}. Please settle your payment. Thank you!`,
      reminderDate: new Date(),
      channel: 'whatsapp',
      status: 'sent',
      sentAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    }));

    // Insert all reminders
    const result = await db.collection('reminders').insertMany(bulkReminders);
    successCount = result.insertedCount;

    console.log(`âœ… Bulk reminders sent: ${successCount}`);

    res.json({
      success: true,
      message: `Reminders sent to ${successCount} customers`,
      count: successCount,
      failed: failedCount,
      total: customers.length
    });
  } catch (error) {
    console.error('Bulk send reminders error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Auto-create reminders for overdue customers (can be called by cron job)
router.post('/auto-create-overdue', async (req, res) => {
  try {
    const db = await getDatabase();
    
    // Get customers with outstanding amounts and no transaction in last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const customers = await db.collection('customers').find({
      userId: req.user.userId,
      outstandingAmount: { $gt: 0 },
      $or: [
        { lastTransaction: { $lt: thirtyDaysAgo } },
        { lastTransaction: null }
      ]
    }).toArray();

    if (customers.length === 0) {
      return res.json({
        success: true,
        message: 'No overdue customers found',
        count: 0
      });
    }

    // Check if reminders already exist for these customers (created today)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const existingReminders = await db.collection('reminders').find({
      userId: req.user.userId,
      createdAt: { $gte: today },
      status: 'pending'
    }).toArray();

    const existingCustomerIds = new Set(existingReminders.map(r => r.customerId));

    // Create reminders only for customers without existing reminders
    const newReminders = customers
      .filter(customer => !existingCustomerIds.has(customer._id.toString()))
      .map(customer => ({
        userId: req.user.userId,
        customerId: customer._id.toString(),
        customerName: customer.name,
        customerPhone: customer.phone,
        message: `Payment reminder: You have an outstanding balance of â‚¹${customer.outstandingAmount.toLocaleString()}. Please settle your payment at your earliest convenience. Thank you!`,
        reminderDate: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
        channel: 'whatsapp',
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      }));

    if (newReminders.length > 0) {
      const result = await db.collection('reminders').insertMany(newReminders);
      
      res.json({
        success: true,
        message: `Created ${result.insertedCount} reminders for overdue customers`,
        count: result.insertedCount
      });
    } else {
      res.json({
        success: true,
        message: 'All overdue customers already have pending reminders',
        count: 0
      });
    }
  } catch (error) {
    console.error('Auto-create reminders error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

export default router;