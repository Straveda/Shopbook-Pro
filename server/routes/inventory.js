// FILE: server/routes/inventory.js
import express from 'express';
import { getDatabase, getUserQuery } from '../api/db.js';
import { ObjectId } from 'mongodb';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Authenticate all inventory routes
router.use(authenticateToken);

// ============================================
// HELPER FUNCTIONS
// ============================================

const calculateTotalValue = (quantity, purchasePrice) => {
  return quantity * purchasePrice;
};

const isLowStock = (quantity, reorderLevel) => {
  return quantity <= reorderLevel;
};

// ============================================
// GET ALL INVENTORY ITEMS
// ============================================
router.get('/', async (req, res) => {
  console.log('🔥 GET /api/inventory');
  try {
    const { search, lowStockOnly } = req.query;
    const userIdStr = req.user.userId;
    const userId = ObjectId.isValid(userIdStr) ? new ObjectId(userIdStr) : userIdStr;
    const db = await getDatabase();
    const userFilter = getUserQuery(req);
    let query = { ...userFilter };

    // Search by item name or code
    if (search) {
      query.$or = [
        { itemName: { $regex: search, $options: 'i' } },
        { itemCode: { $regex: search, $options: 'i' } }
      ];
    }

    // Filter low stock items only
    if (lowStockOnly === 'true') {
      query.$expr = { $lte: ['$quantity', '$reorderLevel'] };
    }

    const items = await db.collection('inventory')
      .find(query)
      .sort({ itemName: 1 })
      .toArray();

    // Add calculated fields
    const itemsWithCalculations = items.map(item => ({
      ...item,
      totalValue: calculateTotalValue(item.quantity, item.purchasePrice),
      isLowStock: isLowStock(item.quantity, item.reorderLevel)
    }));

    console.log(`✅ Found ${itemsWithCalculations.length} inventory items`);

    res.json({
      success: true,
      data: itemsWithCalculations,
      count: itemsWithCalculations.length
    });
  } catch (error) {
    console.error('❌ Error fetching inventory:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch inventory',
      error: error.message
    });
  }
});

// ============================================
// GET SINGLE INVENTORY ITEM BY ID
// ============================================
router.get('/:id', async (req, res) => {
  console.log('🔥 GET /api/inventory/:id');
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid inventory ID'
      });
    }

    const userIdStr = req.user.userId;
    const userId = ObjectId.isValid(userIdStr) ? new ObjectId(userIdStr) : userIdStr;
    const db = await getDatabase();
    const item = await db.collection('inventory').findOne({
      _id: new ObjectId(id),
      ...getUserQuery(req)
    });

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }

    // Add calculated fields
    item.totalValue = calculateTotalValue(item.quantity, item.purchasePrice);
    item.isLowStock = isLowStock(item.quantity, item.reorderLevel);

    console.log('✅ Item found:', item.itemName);

    res.json({
      success: true,
      data: item
    });
  } catch (error) {
    console.error('❌ Error fetching item:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch item',
      error: error.message
    });
  }
});

// ============================================
// CREATE NEW INVENTORY ITEM
// ============================================
router.post('/', async (req, res) => {
  console.log('🔥 POST /api/inventory');
  try {
    const { itemName, itemCode, quantity, reorderLevel, purchasePrice, sellingPrice, unit } = req.body;

    console.log('📝 Creating inventory item:', { itemName, itemCode, quantity });

    // Validate required fields
    if (!itemName || !itemCode || quantity === undefined || !purchasePrice) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: itemName, itemCode, quantity, purchasePrice'
      });
    }

    // Validate numbers
    if (isNaN(quantity) || isNaN(reorderLevel) || isNaN(purchasePrice) || isNaN(sellingPrice)) {
      return res.status(400).json({
        success: false,
        message: 'Quantity, prices must be valid numbers'
      });
    }

    const db = await getDatabase();
    const userIdStr = req.user.userId;
    const userId = ObjectId.isValid(userIdStr) ? new ObjectId(userIdStr) : userIdStr;
    const codeUpper = itemCode.toUpperCase().trim();

    // Check for duplicate code
    const existing = await db.collection('inventory').findOne({
      itemCode: codeUpper,
      ...getUserQuery(req)
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Item code '${codeUpper}' already exists`
      });
    }

    // Create new inventory item
    const newItem = {
      userId: userId,
      itemName: itemName.trim(),
      itemCode: codeUpper,
      quantity: parseInt(quantity),
      reorderLevel: parseInt(reorderLevel),
      purchasePrice: parseFloat(purchasePrice),
      sellingPrice: parseFloat(sellingPrice),
      unit: unit || 'piece',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.collection('inventory').insertOne(newItem);

    // Add calculated fields
    newItem._id = result.insertedId;
    newItem.totalValue = calculateTotalValue(newItem.quantity, newItem.purchasePrice);
    newItem.isLowStock = isLowStock(newItem.quantity, newItem.reorderLevel);

    console.log('✅ Item created:', result.insertedId);

    res.status(201).json({
      success: true,
      message: 'Item added successfully',
      data: newItem
    });
  } catch (error) {
    console.error('❌ Error creating item:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add item',
      error: error.message
    });
  }
});

// ============================================
// UPDATE INVENTORY ITEM
// ============================================
router.put('/:id', async (req, res) => {
  console.log('🔥 PUT /api/inventory/:id');
  try {
    const { id } = req.params;
    const { itemName, itemCode, quantity, reorderLevel, purchasePrice, sellingPrice, unit } = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid inventory ID'
      });
    }

    const userId = new ObjectId(req.user.userId);
    const db = await getDatabase();

    // Check if item exists
    const item = await db.collection('inventory').findOne({
      _id: new ObjectId(id),
      userId: { $in: [req.user.userId, userId] }
    });

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }

    // Check for duplicate code if code is being changed
    if (itemCode && itemCode.toUpperCase().trim() !== item.itemCode) {
      const existing = await db.collection('inventory').findOne({
        itemCode: itemCode.toUpperCase().trim(),
        _id: { $ne: new ObjectId(id) },
        ...getUserQuery(req)
      });

      if (existing) {
        return res.status(400).json({
          success: false,
          message: `Item code '${itemCode.toUpperCase().trim()}' already exists`
        });
      }
    }

    // Build update object
    const updateData = {
      updatedAt: new Date()
    };

    if (itemName !== undefined) updateData.itemName = itemName.trim();
    if (itemCode !== undefined) updateData.itemCode = itemCode.toUpperCase().trim();
    if (quantity !== undefined) updateData.quantity = parseInt(quantity);
    if (reorderLevel !== undefined) updateData.reorderLevel = parseInt(reorderLevel);
    if (purchasePrice !== undefined) updateData.purchasePrice = parseFloat(purchasePrice);
    if (sellingPrice !== undefined) updateData.sellingPrice = parseFloat(sellingPrice);
    if (unit !== undefined) updateData.unit = unit;

    // Update item
    const result = await db.collection('inventory').updateOne(
      { _id: new ObjectId(id), ...getUserQuery(req) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }

    // Fetch updated item
    const updatedItem = await db.collection('inventory').findOne({
      _id: new ObjectId(id),
      ...getUserQuery(req)
    });

    updatedItem.totalValue = calculateTotalValue(updatedItem.quantity, updatedItem.purchasePrice);
    updatedItem.isLowStock = isLowStock(updatedItem.quantity, updatedItem.reorderLevel);

    console.log('✅ Item updated:', id);

    res.json({
      success: true,
      message: 'Item updated successfully',
      data: updatedItem
    });
  } catch (error) {
    console.error('❌ Error updating item:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update item',
      error: error.message
    });
  }
});

// ============================================
// DELETE INVENTORY ITEM
// ============================================
router.delete('/:id', async (req, res) => {
  console.log('🔥 DELETE /api/inventory/:id');
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid inventory ID'
      });
    }

    const userId = new ObjectId(req.user.userId);
    const db = await getDatabase();

    // Check if item exists
    const item = await db.collection('inventory').findOne({
      _id: new ObjectId(id),
      userId: { $in: [req.user.userId, userId] }
    });

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }

    // Delete item
    const result = await db.collection('inventory').deleteOne({
      _id: new ObjectId(id),
      ...getUserQuery(req)
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }

    console.log('✅ Item deleted:', id);

    res.json({
      success: true,
      message: 'Item deleted successfully'
    });
  } catch (error) {
    console.error('❌ Error deleting item:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete item',
      error: error.message
    });
  }
});

// ============================================
// GET LOW STOCK ITEMS (ALERTS)
// ============================================
router.get('/alerts/low-stock', async (req, res) => {
  console.log('🔥 GET /api/inventory/alerts/low-stock');
  try {
    const userId = new ObjectId(req.user.userId);
    const db = await getDatabase();

    const lowStockItems = await db.collection('inventory')
      .find({
        ...getUserQuery(req),
        $expr: { $lte: ['$quantity', '$reorderLevel'] }
      })
      .sort({ quantity: 1 })
      .toArray();

    console.log(`✅ Found ${lowStockItems.length} low stock items`);

    res.json({
      success: true,
      data: lowStockItems,
      count: lowStockItems.length
    });
  } catch (error) {
    console.error('❌ Error fetching low stock items:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch low stock items',
      error: error.message
    });
  }
});

// ============================================
// UPDATE STOCK QUANTITY
// ============================================
router.patch('/:id/stock', async (req, res) => {
  console.log('🔥 PATCH /api/inventory/:id/stock');
  try {
    const { id } = req.params;
    const { quantity } = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid inventory ID'
      });
    }

    if (quantity === undefined || isNaN(quantity)) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be a valid number'
      });
    }

    const userId = new ObjectId(req.user.userId);
    const db = await getDatabase();

    const result = await db.collection('inventory').updateOne(
      { _id: new ObjectId(id), ...getUserQuery(req) },
      {
        $set: {
          quantity: parseInt(quantity),
          updatedAt: new Date()
        }
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }

    const updatedItem = await db.collection('inventory').findOne({
      _id: new ObjectId(id),
      ...getUserQuery(req)
    });

    updatedItem.totalValue = calculateTotalValue(updatedItem.quantity, updatedItem.purchasePrice);
    updatedItem.isLowStock = isLowStock(updatedItem.quantity, updatedItem.reorderLevel);

    console.log('✅ Stock updated:', id);

    res.json({
      success: true,
      message: 'Stock updated successfully',
      data: updatedItem
    });
  } catch (error) {
    console.error('❌ Error updating stock:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update stock',
      error: error.message
    });
  }
});

// ============================================
// GET INVENTORY STATISTICS
// ============================================
router.get('/stats/summary', async (req, res) => {
  console.log('🔥 GET /api/inventory/stats/summary');
  try {
    const userId = new ObjectId(req.user.userId);
    const db = await getDatabase();

    const stats = await db.collection('inventory').aggregate([
      { $match: getUserQuery(req) },
      {
        $group: {
          _id: null,
          totalItems: { $sum: 1 },
          totalQuantity: { $sum: '$quantity' },
          totalValue: {
            $sum: { $multiply: ['$quantity', '$purchasePrice'] }
          },
          lowStockCount: {
            $sum: {
              $cond: [{ $lte: ['$quantity', '$reorderLevel'] }, 1, 0]
            }
          }
        }
      }
    ]).toArray();

    const summary = stats[0] || {
      totalItems: 0,
      totalQuantity: 0,
      totalValue: 0,
      lowStockCount: 0
    };

    console.log('✅ Statistics fetched');

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('❌ Error fetching statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: error.message
    });
  }
});

console.log('✅ Inventory routes loaded');

export default router;