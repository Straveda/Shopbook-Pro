// FILE: server/routes/vendors.js
import express from 'express';
import { getDatabase, getUserQuery } from '../api/db.js';
import { ObjectId } from 'mongodb';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Authenticate all vendor routes
router.use(authenticateToken);

// ============================================
// GET ALL VENDORS
// ============================================
router.get('/', async (req, res) => {
  console.log('🔥 GET /api/vendors');
  try {
    const { search, isActive } = req.query;
    const userIdStr = req.user.userId;
    const userId = ObjectId.isValid(userIdStr) ? new ObjectId(userIdStr) : userIdStr;
    const db = await getDatabase();

    let query = { ...getUserQuery(req) };

    // Filter by active status
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    // Search by vendor name, code, or phone
    if (search) {
      query.$or = [
        { vendorName: { $regex: search, $options: 'i' } },
        { vendorCode: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    const vendorsList = await db.collection('vendors')
      .find(query)
      .sort({ vendorName: 1 })
      .toArray();

    console.log(`✅ Found ${vendorsList.length} vendors`);

    res.json({
      success: true,
      data: vendorsList,
      count: vendorsList.length
    });
  } catch (error) {
    console.error('❌ Error fetching vendors:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch vendors',
      error: error.message
    });
  }
});

// ============================================
// GET SINGLE VENDOR BY ID
// ============================================
router.get('/:id', async (req, res) => {
  console.log('🔥 GET /api/vendors/:id');
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid vendor ID'
      });
    }

    const userIdStr = req.user.userId;
    const userId = ObjectId.isValid(userIdStr) ? new ObjectId(userIdStr) : userIdStr;
    const db = await getDatabase();
    const vendor = await db.collection('vendors').findOne({
      _id: new ObjectId(id),
      ...getUserQuery(req)
    });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    console.log('✅ Vendor found:', vendor.vendorName);

    res.json({
      success: true,
      data: vendor
    });
  } catch (error) {
    console.error('❌ Error fetching vendor:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch vendor',
      error: error.message
    });
  }
});

// ============================================
// CREATE NEW VENDOR
// ============================================
router.post('/', async (req, res) => {
  console.log('🔥 POST /api/vendors');
  try {
    const { vendorName, vendorCode, contactPerson, email, phone, alternatePhone, address, city, state, pincode, paymentTerms, isActive } = req.body;

    console.log('📝 Creating vendor:', { vendorName, vendorCode, phone });

    // Validate required fields
    if (!vendorName || !vendorCode || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: vendorName, vendorCode, phone'
      });
    }

    const db = await getDatabase();
    const userIdStr = req.user.userId;
    const userId = ObjectId.isValid(userIdStr) ? new ObjectId(userIdStr) : userIdStr;
    const codeUpper = vendorCode.toUpperCase().trim();

    // Check for duplicate code
    const existing = await db.collection('vendors').findOne({
      vendorCode: codeUpper,
      ...getUserQuery(req)
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Vendor code '${codeUpper}' already exists`
      });
    }

    // Create new vendor
    const newVendor = {
      userId: userId,
      vendorName: vendorName.trim(),
      vendorCode: codeUpper,
      contactPerson: contactPerson?.trim() || '',
      email: email?.trim() || '',
      phone: phone.trim(),
      alternatePhone: alternatePhone?.trim() || '',
      address: address?.trim() || '',
      city: city?.trim() || '',
      state: state?.trim() || '',
      pincode: pincode?.trim() || '',
      paymentTerms: paymentTerms || 'Net 30',
      isActive: isActive !== false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.collection('vendors').insertOne(newVendor);

    newVendor._id = result.insertedId;

    console.log('✅ Vendor created:', result.insertedId);

    res.status(201).json({
      success: true,
      message: 'Vendor added successfully',
      data: newVendor
    });
  } catch (error) {
    console.error('❌ Error creating vendor:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add vendor',
      error: error.message
    });
  }
});

// ============================================
// UPDATE VENDOR
// ============================================
router.put('/:id', async (req, res) => {
  console.log('🔥 PUT /api/vendors/:id');
  try {
    const { id } = req.params;
    const { vendorName, vendorCode, contactPerson, email, phone, alternatePhone, address, city, state, pincode, paymentTerms, isActive } = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid vendor ID'
      });
    }

    const db = await getDatabase();
    const userId = new ObjectId(req.user.userId);

    // Check if vendor exists
    const vendor = await db.collection('vendors').findOne({
      _id: new ObjectId(id),
      ...getUserQuery(req)
    });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    // Check for duplicate code if code is being changed
    if (vendorCode && vendorCode.toUpperCase().trim() !== vendor.vendorCode) {
      const existing = await db.collection('vendors').findOne({
        vendorCode: vendorCode.toUpperCase().trim(),
        _id: { $ne: new ObjectId(id) },
        ...getUserQuery(req)
      });

      if (existing) {
        return res.status(400).json({
          success: false,
          message: `Vendor code '${vendorCode.toUpperCase().trim()}' already exists`
        });
      }
    }

    // Build update object
    const updateData = {
      updatedAt: new Date()
    };

    if (vendorName !== undefined) updateData.vendorName = vendorName.trim();
    if (vendorCode !== undefined) updateData.vendorCode = vendorCode.toUpperCase().trim();
    if (contactPerson !== undefined) updateData.contactPerson = contactPerson.trim();
    if (email !== undefined) updateData.email = email.trim();
    if (phone !== undefined) updateData.phone = phone.trim();
    if (alternatePhone !== undefined) updateData.alternatePhone = alternatePhone.trim();
    if (address !== undefined) updateData.address = address.trim();
    if (city !== undefined) updateData.city = city.trim();
    if (state !== undefined) updateData.state = state.trim();
    if (pincode !== undefined) updateData.pincode = pincode.trim();
    if (paymentTerms !== undefined) updateData.paymentTerms = paymentTerms;
    if (isActive !== undefined) updateData.isActive = isActive;

    // Update vendor
    const result = await db.collection('vendors').updateOne(
      { _id: new ObjectId(id), ...getUserQuery(req) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    // Fetch updated vendor
    const updatedVendor = await db.collection('vendors').findOne({
      _id: new ObjectId(id),
      ...getUserQuery(req)
    });

    console.log('✅ Vendor updated:', id);

    res.json({
      success: true,
      message: 'Vendor updated successfully',
      data: updatedVendor
    });
  } catch (error) {
    console.error('❌ Error updating vendor:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update vendor',
      error: error.message
    });
  }
});

// ============================================
// DELETE VENDOR
// ============================================
router.delete('/:id', async (req, res) => {
  console.log('🔥 DELETE /api/vendors/:id');
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid vendor ID'
      });
    }

    const db = await getDatabase();
    const userId = new ObjectId(req.user.userId);

    // Check if vendor exists
    const vendor = await db.collection('vendors').findOne({
      _id: new ObjectId(id),
      ...getUserQuery(req)
    });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    // Delete vendor
    const result = await db.collection('vendors').deleteOne({ _id: new ObjectId(id), ...getUserQuery(req) });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    console.log('✅ Vendor deleted:', id);

    res.json({
      success: true,
      message: 'Vendor deleted successfully'
    });
  } catch (error) {
    console.error('❌ Error deleting vendor:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete vendor',
      error: error.message
    });
  }
});

// ============================================
// SEARCH VENDORS
// ============================================
router.get('/search/:query', async (req, res) => {
  console.log('🔥 GET /api/vendors/search/:query');
  try {
    const { query } = req.params;
    const userId = new ObjectId(req.user.userId);
    const db = await getDatabase();

    const results = await db.collection('vendors')
      .find({
        ...getUserQuery(req),
        $or: [
          { vendorName: { $regex: query, $options: 'i' } },
          { vendorCode: { $regex: query, $options: 'i' } },
          { phone: { $regex: query, $options: 'i' } }
        ]
      })
      .toArray();

    console.log(`✅ Found ${results.length} vendors`);

    res.json({
      success: true,
      data: results,
      count: results.length
    });
  } catch (error) {
    console.error('❌ Error searching vendors:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search vendors',
      error: error.message
    });
  }
});

console.log('✅ Vendors routes loaded');

export default router;