import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './api/db.js';
import authRoutes from './routes/auth.js';
import customerRoutes from './routes/customers.js';
import reminderRoutes from './routes/reminders.js';
import creditRoutes from './routes/credits.js'; 
import servicesRoutes from './routes/services.js';  
import inventoryRoutes from './routes/inventory.js';
import vendorRoutes from './routes/vendors.js';
import reportRoutes from './routes/reports.js';
import salesRoutes from './routes/sales.js'; 
import dashboardRoutes from './routes/dashboard.js';
import topbarRoutes from './routes/topbar.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// CORS Configuration - SUPPORTS PORT 8080
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:8080',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:8080'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsers with increased limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Connect to database
console.log('🔌 Connecting to MongoDB...');
await connectDB();

// Health check - BEFORE routes (no auth required)
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'Backend is running!',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    port: PORT
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/credits', creditRoutes); 
app.use('/api/services', servicesRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/vendors', vendorRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/topbar', topbarRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'ShopBook API Server',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      dashboard: '/api/dashboard',
      customers: '/api/customers',
      reminders: '/api/reminders',
      credits: '/api/credits',
      services: '/api/services',
      inventory: '/api/inventory',
      vendors: '/api/vendors',
      reports: '/api/reports',  
      sales: '/api/sales',
      topbar:'/api/topbar'
    }
  });
});

// 404 handler
app.use((req, res) => {
  console.log('❌ 404 Not Found:', req.method, req.path);
  res.status(404).json({ 
    message: 'Route not found',
    path: req.path 
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('💥 Server Error:', err);
  
  // Handle specific error types
  if (err.name === 'ValidationError') {
    return res.status(400).json({ 
      message: 'Validation error', 
      error: err.message 
    });
  }
  
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({ 
      message: 'Unauthorized', 
      error: err.message 
    });
  }

  // Generic error response
  res.status(err.status || 500).json({ 
    message: err.message || 'Server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Start server
app.listen(PORT, () => {
  console.log('•••••••••••••••••••••••••••••••••••••••••••••••••');
  console.log('   🚀 ShopBook Backend Server Started');
  console.log('•••••••••••••••••••••••••••••••••••••••••••••••••');
  console.log(`   📡 Server: http://localhost:${PORT}`);
  console.log(`   🏥 Health: http://localhost:${PORT}/api/health`);
  console.log(`   📚 API Docs: http://localhost:${PORT}`);
  console.log(`   🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('   ✅ CORS Enabled for ports: 5173, 3000, 8080');
  console.log('•••••••••••••••••••••••••••••••••••••••••••••••••');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  process.exit(0);
});