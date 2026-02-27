// FILE: server/middleware/auth.js
// UPDATED AUTH MIDDLEWARE WITH COMPLETE FUNCTIONALITY

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const TOKEN_EXPIRY = '7d';

// ============================================
// AUTHENTICATE TOKEN MIDDLEWARE
// ============================================
export const authenticateToken = (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      console.warn('⚠️ No token provided');
      return res.status(401).json({
        success: false,
        message: 'Access token required'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Attach user info to request
    req.user = decoded;
    console.log('✅ Token verified for user:', decoded.email);
    
    next();
  } catch (error) {
    console.error('❌ Token verification failed:', error.message);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired. Please login again.',
        code: 'TOKEN_EXPIRED'
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    
    res.status(401).json({
      success: false,
      message: 'Authentication failed'
    });
  }
};

// ============================================
// OPTIONAL: REFRESH TOKEN FUNCTIONALITY
// ============================================
export const refreshAccessToken = (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token required'
      });
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, JWT_SECRET);

    // Generate new access token
    const newAccessToken = jwt.sign(
      {
        userId: decoded.userId,
        email: decoded.email,
        name: decoded.name
      },
      JWT_SECRET,
      { expiresIn: TOKEN_EXPIRY }
    );

    console.log('✅ Access token refreshed');

    res.json({
      success: true,
      message: 'Access token refreshed',
      token: newAccessToken
    });
  } catch (error) {
    console.error('❌ Token refresh failed:', error.message);
    res.status(401).json({
      success: false,
      message: 'Failed to refresh token'
    });
  }
};

// ============================================
// GENERATE JWT TOKEN (For Auth Routes)
// ============================================
export const generateToken = (user) => {
  try {
    const token = jwt.sign(
      {
        userId: user._id,
        email: user.email,
        name: user.name
      },
      JWT_SECRET,
      { expiresIn: TOKEN_EXPIRY }
    );
    
    console.log('✅ Token generated for:', user.email);
    return token;
  } catch (error) {
    console.error('❌ Token generation failed:', error.message);
    throw error;
  }
};

// ============================================
// VERIFY TOKEN (Utility Function)
// ============================================
export const verifyToken = (token) => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return { valid: true, decoded };
  } catch (error) {
    return { 
      valid: false, 
      error: error.message,
      expired: error.name === 'TokenExpiredError'
    };
  }
};

// ============================================
// GET USER FROM TOKEN
// ============================================
export const getUserFromToken = (token) => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
  } catch (error) {
    console.error('❌ Failed to get user from token:', error.message);
    return null;
  }
};

// ============================================
// OPTIONAL: ROLE-BASED ACCESS CONTROL
// ============================================
export const authorizeRole = (allowedRoles) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      }

      if (allowedRoles.includes(req.user.role)) {
        next();
      } else {
        console.warn(`❌ Unauthorized access attempt by user: ${req.user.email}`);
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions'
        });
      }
    } catch (error) {
      console.error('❌ Authorization check failed:', error.message);
      res.status(500).json({
        success: false,
        message: 'Authorization failed'
      });
    }
  };
};

// ============================================
// ERROR HANDLING MIDDLEWARE
// ============================================
export const authErrorHandler = (err, req, res, next) => {
  console.error('🔴 Auth Error:', err.message);

  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized access'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired',
      code: 'TOKEN_EXPIRED'
    });
  }

  next(err);
};

// ============================================
// EXPORT DEFAULT
// ============================================
export default {
  authenticateToken,
  refreshAccessToken,
  generateToken,
  verifyToken,
  getUserFromToken,
  authorizeRole,
  authErrorHandler
};