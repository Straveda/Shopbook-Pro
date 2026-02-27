// FILE: server/routes/topbar.js - FIXED VERSION
import express from 'express';
import { getDatabase } from '../api/db.js';
import { ObjectId } from 'mongodb';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

console.log('==========================================');
console.log('📋 LOADING TOPBAR ROUTES');
console.log('==========================================');

// ✅ Authenticate all topbar routes
router.use(authenticateToken);

// ============================================
// GET USER PROFILE
// ============================================
router.get('/user/profile', async (req, res) => {
  console.log('🔥 GET /api/topbar/user/profile');
  console.log('User ID:', req.user.userId);
  
  try {
    const db = await getDatabase();
    
    // Handle both string and ObjectId formats
    let userId = req.user.userId;
    if (typeof userId === 'string' && ObjectId.isValid(userId)) {
      userId = new ObjectId(userId);
    }

    const user = await db.collection('users').findOne({
      _id: userId
    });

    if (!user) {
      console.log('❌ User not found:', userId);
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const { password: _, ...userWithoutPassword } = user;
    
    console.log('✅ User profile fetched:', user.email);

    res.json({
      success: true,
      data: userWithoutPassword
    });
  } catch (error) {
    console.error('❌ Get user profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user profile',
      error: error.message
    });
  }
});

// ============================================
// UPDATE USER PROFILE
// ============================================
router.put('/user/profile', async (req, res) => {
  console.log('🔥 PUT /api/topbar/user/profile');
  try {
    const { name, email } = req.body;
    const db = await getDatabase();

    // Validate input
    if (!name && !email) {
      return res.status(400).json({
        success: false,
        message: 'At least one field (name or email) is required'
      });
    }

    const updateData = { updatedAt: new Date() };

    // Handle both string and ObjectId formats
    let userId = req.user.userId;
    if (typeof userId === 'string' && ObjectId.isValid(userId)) {
      userId = new ObjectId(userId);
    }

    // Check if email already exists (if being changed)
    if (email) {
      const existingUser = await db.collection('users').findOne({
        email: email,
        _id: { $ne: userId }
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email already registered'
        });
      }
      updateData.email = email;
    }

    if (name) {
      updateData.name = name;
    }

    const result = await db.collection('users').updateOne(
      { _id: userId },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Fetch updated user
    const updatedUser = await db.collection('users').findOne({
      _id: userId
    });

    const { password: _, ...userWithoutPassword } = updatedUser;

    console.log('✅ User profile updated');

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: userWithoutPassword
    });
  } catch (error) {
    console.error('❌ Update user profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      error: error.message
    });
  }
});

// ============================================
// SEARCH FUNCTIONALITY
// ============================================
router.get('/search', async (req, res) => {
  console.log('🔥 GET /api/topbar/search');
  try {
    const { q } = req.query;

    if (!q || q.trim().length === 0) {
      return res.json({
        success: true,
        data: {
          customers: [],
          invoices: [],
          sales: [],
          results: []
        }
      });
    }

    const searchQuery = q.toLowerCase();
    const db = await getDatabase();

    // Handle userId format
    let userId = req.user.userId;
    if (typeof userId === 'string' && ObjectId.isValid(userId)) {
      userId = new ObjectId(userId);
    }

    // Search in parallel
    const [customers, sales, invoices] = await Promise.all([
      // Search Customers
      db.collection('customers')
        .find({
          $or: [
            { userId: userId },
            { userId: userId.toString() }
          ],
          $or: [
            { name: { $regex: searchQuery, $options: 'i' } },
            { phone: { $regex: searchQuery, $options: 'i' } },
            { address: { $regex: searchQuery, $options: 'i' } },
            { city: { $regex: searchQuery, $options: 'i' } }
          ]
        })
        .limit(5)
        .toArray()
        .catch(err => {
          console.error('Customer search error:', err);
          return [];
        }),

      // Search Sales
      db.collection('sales')
        .find({
          $or: [
            { userId: userId },
            { userId: userId.toString() }
          ],
          $or: [
            { saleNumber: { $regex: searchQuery, $options: 'i' } },
            { customerName: { $regex: searchQuery, $options: 'i' } }
          ]
        })
        .limit(5)
        .toArray()
        .catch(err => {
          console.error('Sales search error:', err);
          return [];
        }),

      // Search Invoices
      db.collection('invoices')
        .find({
          $or: [
            { userId: userId },
            { userId: userId.toString() }
          ],
          $or: [
            { invoiceNo: { $regex: searchQuery, $options: 'i' } },
            { customerName: { $regex: searchQuery, $options: 'i' } }
          ]
        })
        .limit(5)
        .toArray()
        .catch(err => {
          console.error('Invoices search error:', err);
          return [];
        })
    ]);

    // Format results
    const formattedCustomers = customers.map(c => ({
      _id: c._id,
      name: c.name,
      phone: c.phone,
      outstanding: c.outstanding || 0,
      type: 'customer'
    }));

    const formattedSales = sales.map(s => ({
      _id: s._id,
      saleNumber: s.saleNumber,
      customerName: s.customerName,
      totalAmount: s.totalAmount,
      status: s.status,
      type: 'sale'
    }));

    const formattedInvoices = invoices.map(i => ({
      _id: i._id,
      invoiceNo: i.invoiceNo,
      customerName: i.customerName,
      totalAmount: i.totalAmount,
      type: 'invoice'
    }));

    console.log('✅ Search results:', {
      customers: formattedCustomers.length,
      sales: formattedSales.length,
      invoices: formattedInvoices.length
    });

    res.json({
      success: true,
      data: {
        customers: formattedCustomers,
        invoices: formattedInvoices,
        sales: formattedSales,
        results: [...formattedCustomers, ...formattedSales, ...formattedInvoices]
      }
    });
  } catch (error) {
    console.error('❌ Search error:', error);
    res.status(500).json({
      success: false,
      message: 'Search failed',
      error: error.message
    });
  }
});

// ============================================
// GET NOTIFICATIONS
// ============================================
router.get('/notifications', async (req, res) => {
  console.log('🔥 GET /api/topbar/notifications');
  try {
    const db = await getDatabase();
    let userId = req.user.userId;
    
    if (typeof userId === 'string' && ObjectId.isValid(userId)) {
      userId = new ObjectId(userId);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get pending sales from today
    const pendingSales = await db.collection('sales')
      .countDocuments({
        $or: [
          { userId: userId },
          { userId: userId.toString() }
        ],
        status: { $in: ['unpaid', 'partial'] },
        saleDate: { $gte: today, $lt: tomorrow }
      })
      .catch(err => {
        console.error('Pending sales count error:', err);
        return 0;
      });

    // Get overdue customers
    const overdueCustomers = await db.collection('customers')
      .find({
        $or: [
          { userId: userId },
          { userId: userId.toString() }
        ],
        outstanding: { $gt: 0 },
        dueDate: { $exists: true, $lt: today }
      })
      .toArray()
      .catch(err => {
        console.error('Overdue customers error:', err);
        return [];
      });

    // Get low stock items
    let lowStockCount = 0;
    try {
      lowStockCount = await db.collection('inventory')
        .countDocuments({
          $expr: { $lte: ['$quantity', '$reorderLevel'] }
        });
    } catch (e) {
      console.log('Low stock check skipped (inventory collection may not exist)');
      lowStockCount = 0;
    }

    // Create notification objects
    const notifications = [];

    if (pendingSales > 0) {
      notifications.push({
        id: '1',
        title: `${pendingSales} Pending Sales`,
        message: `You have ${pendingSales} sales from today pending payment`,
        type: 'pending-sales',
        icon: 'AlertCircle',
        count: pendingSales,
        read: false,
        timestamp: new Date()
      });
    }

    if (overdueCustomers.length > 0) {
      const overdueAmount = overdueCustomers.reduce((sum, c) => sum + (c.outstanding || 0), 0);
      notifications.push({
        id: '2',
        title: `${overdueCustomers.length} Overdue Payments`,
        message: `₹${overdueAmount.toLocaleString()} outstanding from overdue customers`,
        type: 'overdue',
        icon: 'AlertTriangle',
        count: overdueCustomers.length,
        read: false,
        timestamp: new Date()
      });
    }

    if (lowStockCount > 0) {
      notifications.push({
        id: '3',
        title: `${lowStockCount} Low Stock Items`,
        message: `${lowStockCount} items are below reorder level`,
        type: 'low-stock',
        icon: 'Package',
        count: lowStockCount,
        read: false,
        timestamp: new Date()
      });
    }

    const unreadCount = notifications.filter(n => !n.read).length;

    console.log('✅ Notifications fetched:', notifications.length);

    res.json({
      success: true,
      data: {
        notifications: notifications,
        unreadCount: unreadCount,
        totalCount: notifications.length
      }
    });
  } catch (error) {
    console.error('❌ Get notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications',
      error: error.message
    });
  }
});

// ============================================
// QUICK SALE - CREATE WALK-IN SALE
// ============================================
router.post('/quick-sale', async (req, res) => {
  console.log('🔥 POST /api/topbar/quick-sale');
  console.log('Request body:', req.body);
  
  try {
    const { customerName, items, totalAmount, paidAmount, notes } = req.body;

    // Validation
    if (!items || !totalAmount) {
      return res.status(400).json({
        success: false,
        message: 'Items and total amount are required'
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one item is required'
      });
    }

    const db = await getDatabase();
    let userId = req.user.userId;
    
    if (typeof userId === 'string' && ObjectId.isValid(userId)) {
      userId = new ObjectId(userId);
    }

    // Generate sale number
    const count = await db.collection('sales').countDocuments({
      $or: [
        { userId: userId },
        { userId: userId.toString() }
      ]
    });
    const saleNumber = `SALE-${String(count + 1).padStart(5, '0')}`;

    const balanceAmount = parseFloat(totalAmount) - (parseFloat(paidAmount) || 0);

    // Create quick sale (walk-in)
    const saleData = {
      userId: userId.toString(),
      customerId: null,
      customerName: customerName || 'Walk-in Customer',
      saleNumber: saleNumber,
      saleDate: new Date(),
      items: items,
      totalAmount: parseFloat(totalAmount),
      paidAmount: parseFloat(paidAmount) || 0,
      balanceAmount: balanceAmount,
      outstandingAmount: balanceAmount,
      status: balanceAmount === 0 ? 'paid' : 'unpaid',
      notes: notes || null,
      isWalkIn: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.collection('sales').insertOne(saleData);

    console.log('✅ Quick sale created:', saleNumber);

    res.status(201).json({
      success: true,
      message: 'Quick sale created successfully',
      data: {
        _id: result.insertedId,
        ...saleData
      }
    });
  } catch (error) {
    console.error('❌ Create quick sale error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create quick sale',
      error: error.message
    });
  }
});

// ============================================
// GET QUICK STATS FOR DASHBOARD
// ============================================
router.get('/stats/quick', async (req, res) => {
  console.log('🔥 GET /api/topbar/stats/quick');
  try {
    const db = await getDatabase();
    let userId = req.user.userId;
    
    if (typeof userId === 'string' && ObjectId.isValid(userId)) {
      userId = new ObjectId(userId);
    }

    const [customers, sales, ledger] = await Promise.all([
      db.collection('customers').find({
        $or: [
          { userId: userId },
          { userId: userId.toString() }
        ]
      }).toArray().catch(err => {
        console.error('Customers query error:', err);
        return [];
      }),
      db.collection('sales').find({
        $or: [
          { userId: userId },
          { userId: userId.toString() }
        ]
      }).toArray().catch(err => {
        console.error('Sales query error:', err);
        return [];
      }),
      db.collection('ledger').find({
        $or: [
          { userId: userId },
          { userId: userId.toString() }
        ]
      }).toArray().catch(err => {
        console.error('Ledger query error:', err);
        return [];
      })
    ]);

    // Calculate stats
    const totalOutstanding = customers.reduce((sum, c) => sum + (c.outstanding || 0), 0);
    const totalRevenue = sales.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
    const totalPaid = ledger
      .filter(e => e.type === 'Payment')
      .reduce((sum, e) => sum + (e.credit || 0), 0);

    // Today's collection
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todaysCollection = ledger
      .filter(e => {
        const entryDate = new Date(e.date);
        return e.type === 'Payment' && entryDate >= today && entryDate < tomorrow;
      })
      .reduce((sum, e) => sum + (e.credit || 0), 0);

    const stats = {
      totalCustomers: customers.length,
      totalOutstanding: totalOutstanding,
      todaysCollection: todaysCollection,
      totalRevenue: totalRevenue,
      totalSales: sales.length,
      activeCredits: customers.filter(c => (c.outstanding || 0) > 0).length
    };

    console.log('✅ Quick stats calculated');

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('❌ Get quick stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch stats',
      error: error.message
    });
  }
});

// ============================================
// LOGOUT
// ============================================
router.post('/logout', async (req, res) => {
  console.log('🔥 POST /api/topbar/logout');
  try {
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('❌ Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Logout failed',
      error: error.message
    });
  }
});

console.log('==========================================');
console.log('✅ ALL TOPBAR ROUTES LOADED SUCCESSFULLY');
console.log('==========================================');

export default router;