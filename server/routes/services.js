// ============================================
// SERVICES ROUTE - FINAL VERSION
// FILE: server/routes/services.js
// ============================================

import express from 'express';
import { getDatabase } from '../api/db.js';
import { ObjectId } from 'mongodb';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Authenticate all service routes
router.use(authenticateToken);

// ============================================
// HELPER FUNCTIONS
// ============================================

const calculatePriceWithTax = (price, tax) => {
  return price * (1 + tax / 100);
};

// ============================================
// GET ALL SERVICES
// ============================================
router.get('/', async (req, res) => {
  console.log('📥 GET /api/services');
  try {
    const { category, search, isActive } = req.query;
    const db = await getDatabase();
    
    let query = {};
    
    // Filter by category
    if (category && category !== 'all') {
      query.category = category;
    }
    
    // Filter by active status
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }
    
    // Search by name or code
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } }
      ];
    }
    
    const servicesList = await db.collection('services')
      .find(query)
      .sort({ category: 1, name: 1 })
      .toArray();
    
    // Add priceWithTax to each service
    const servicesWithTax = servicesList.map(service => ({
      ...service,
      priceWithTax: calculatePriceWithTax(service.price, service.tax)
    }));
    
    console.log(`✅ Found ${servicesWithTax.length} services`);
    
    res.json({
      success: true,
      data: servicesWithTax,
      count: servicesWithTax.length
    });
  } catch (error) {
    console.error('❌ Error fetching services:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch services',
      error: error.message
    });
  }
});

// ============================================
// GET SINGLE SERVICE BY ID
// ============================================
router.get('/:id', async (req, res) => {
  console.log('📥 GET /api/services/:id');
  try {
    const { id } = req.params;
    
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid service ID'
      });
    }
    
    const db = await getDatabase();
    const service = await db.collection('services').findOne({
      _id: new ObjectId(id)
    });
    
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }
    
    // Add priceWithTax
    service.priceWithTax = calculatePriceWithTax(service.price, service.tax);
    
    console.log('✅ Service found:', service.name);
    
    res.json({
      success: true,
      data: service
    });
  } catch (error) {
    console.error('❌ Error fetching service:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch service',
      error: error.message
    });
  }
});

// ============================================
// CREATE NEW SERVICE
// ============================================
router.post('/', async (req, res) => {
  console.log('📥 POST /api/services');
  try {
    const { name, code, category, price, tax } = req.body;
    
    console.log('📝 Creating service:', { name, code, category, price, tax });
    
    // Validate required fields
    if (!name || !code || !category || price === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: name, code, category, price'
      });
    }
    
    // Validate category
    const validCategories = ['Printing', 'Photocopy', 'Lamination', 'Binding', 'Scanning', 'Other'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category. Must be one of: ' + validCategories.join(', ')
      });
    }
    
    // Validate price
    const servicePrice = parseFloat(price);
    if (isNaN(servicePrice) || servicePrice < 0) {
      return res.status(400).json({
        success: false,
        message: 'Price must be a non-negative number'
      });
    }
    
    const db = await getDatabase();
    const codeUpper = code.toUpperCase().trim();
    
    // Check for duplicate code
    const existing = await db.collection('services').findOne({
      code: codeUpper
    });
    
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Service code '${codeUpper}' already exists`
      });
    }
    
    // Create new service
    const newService = {
      name: name.trim(),
      code: codeUpper,
      category,
      price: servicePrice,
      tax: tax !== undefined ? parseFloat(tax) : 18,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const result = await db.collection('services').insertOne(newService);
    
    // Add priceWithTax
    newService._id = result.insertedId;
    newService.priceWithTax = calculatePriceWithTax(newService.price, newService.tax);
    
    console.log('✅ Service created:', result.insertedId);
    
    res.status(201).json({
      success: true,
      message: 'Service created successfully',
      data: newService
    });
  } catch (error) {
    console.error('❌ Error creating service:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create service',
      error: error.message
    });
  }
});

// ============================================
// UPDATE SERVICE
// ============================================
router.put('/:id', async (req, res) => {
  console.log('📥 PUT /api/services/:id');
  try {
    const { id } = req.params;
    const { name, code, category, price, tax, isActive } = req.body;
    
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid service ID'
      });
    }
    
    const db = await getDatabase();
    
    // Check if service exists
    const service = await db.collection('services').findOne({
      _id: new ObjectId(id)
    });
    
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }
    
    // Check for duplicate code if code is being changed
    if (code && code.toUpperCase().trim() !== service.code) {
      const existing = await db.collection('services').findOne({
        code: code.toUpperCase().trim(),
        _id: { $ne: new ObjectId(id) }
      });
      
      if (existing) {
        return res.status(400).json({
          success: false,
          message: `Service code '${code.toUpperCase().trim()}' already exists`
        });
      }
    }
    
    // Build update object
    const updateData = {
      updatedAt: new Date()
    };
    
    if (name !== undefined) updateData.name = name.trim();
    if (code !== undefined) updateData.code = code.toUpperCase().trim();
    if (category !== undefined) updateData.category = category;
    if (price !== undefined) updateData.price = parseFloat(price);
    if (tax !== undefined) updateData.tax = parseFloat(tax);
    if (isActive !== undefined) updateData.isActive = isActive;
    
    // Update service
    const result = await db.collection('services').updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );
    
    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }
    
    // Fetch updated service
    const updatedService = await db.collection('services').findOne({
      _id: new ObjectId(id)
    });
    
    updatedService.priceWithTax = calculatePriceWithTax(updatedService.price, updatedService.tax);
    
    console.log('✅ Service updated:', id);
    
    res.json({
      success: true,
      message: 'Service updated successfully',
      data: updatedService
    });
  } catch (error) {
    console.error('❌ Error updating service:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update service',
      error: error.message
    });
  }
});

// ============================================
// DELETE SERVICE (Soft Delete)
// ============================================
router.delete('/:id', async (req, res) => {
  console.log('📥 DELETE /api/services/:id');
  try {
    const { id } = req.params;
    
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid service ID'
      });
    }
    
    const db = await getDatabase();
    
    // Check if service exists
    const service = await db.collection('services').findOne({
      _id: new ObjectId(id)
    });
    
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }
    
    // Soft delete - set isActive to false
    const result = await db.collection('services').updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          isActive: false,
          updatedAt: new Date()
        }
      }
    );
    
    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }
    
    console.log('✅ Service deleted (soft delete):', id);
    
    res.json({
      success: true,
      message: 'Service deleted successfully'
    });
  } catch (error) {
    console.error('❌ Error deleting service:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete service',
      error: error.message
    });
  }
});

console.log('✅ Services route loaded');

export default router;