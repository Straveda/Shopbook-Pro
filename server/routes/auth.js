// routes/auth.js - COMPLETE VERSION with password reset functionality

import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { getCollection, isConnected } from '../api/db.js';
import { sendPasswordResetEmail } from '../utils/email.js';

const router = express.Router();

// SIGNUP
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const usersCollection = await getCollection('users');

    const existingUser = await usersCollection.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await usersCollection.insertOne({
      name,
      email,
      password: hashedPassword,
      createdAt: new Date(),
    });

    const token = jwt.sign(
      { userId: result.insertedId, email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: { id: result.insertedId, name, email }
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// LOGIN
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password required' });
    }

    const usersCollection = await getCollection('users');

    const user = await usersCollection.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: { id: user._id, name: user.name, email: user.email }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// FORGOT PASSWORD - Request reset link
router.post('/forgot-password', async (req, res) => {
  try {
    if (!isConnected()) {
      return res.status(503).json({ message: 'Database connection unavailable' });
    }

    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const usersCollection = await getCollection('users');
    const user = await usersCollection.findOne({ email });

    if (!user) {
      return res.json({ 
        message: 'If an account exists with this email, a password reset link has been sent.'
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = await bcrypt.hash(resetToken, 10);

    // Store hashed token and expiry in database
    await usersCollection.updateOne(
      { _id: user._id },
      { 
        $set: {
          resetPasswordToken: resetTokenHash,
          resetPasswordExpires: new Date(Date.now() + 3600000) // 1 hour
        }
      }
    );

    // Create reset URL with plain token (user will send this back)
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    try {
      await sendPasswordResetEmail(email, resetUrl, user.name);
      console.log('✅ Password reset email sent to:', email);
    } catch (emailError) {
      console.error('❌ Failed to send email:', emailError);
      // Log the error but return success for security
    }

    res.json({ 
      message: 'Password reset link sent to your email',
      ...(process.env.NODE_ENV === 'development' && { resetUrl })
    });

  } catch (error) {
    console.error('❌ Forgot password error:', error);
    res.status(500).json({ 
      message: 'Server error occurred',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// VERIFY RESET TOKEN
router.post('/verify-reset-token', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ message: 'Token is required' });
    }

    const usersCollection = await getCollection('users');

    // Find user with valid reset token
    const user = await usersCollection.findOne({
      resetPasswordExpires: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Reset link has expired' });
    }

    // Compare plain token with hashed token
    const isValidToken = await bcrypt.compare(token, user.resetPasswordToken);

    if (!isValidToken) {
      return res.status(400).json({ message: 'Invalid reset token' });
    }

    res.json({ message: 'Token is valid' });

  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// RESET PASSWORD - Set new password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ message: 'Token and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const usersCollection = await getCollection('users');

    // Find user with valid reset token
    const user = await usersCollection.findOne({
      resetPasswordExpires: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Reset link has expired' });
    }

    // Verify token
    const isValidToken = await bcrypt.compare(token, user.resetPasswordToken);

    if (!isValidToken) {
      return res.status(400).json({ message: 'Invalid reset token' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update password and clear reset token
    await usersCollection.updateOne(
      { _id: user._id },
      {
        $set: { password: hashedPassword },
        $unset: { 
          resetPasswordToken: '',
          resetPasswordExpires: ''
        }
      }
    );

    console.log('✅ Password reset successful for:', user.email);

    res.json({ message: 'Password reset successful' });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ 
      message: 'Server error occurred',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// TEST DATABASE
router.get('/test-db', async (req, res) => {
  try {
    const usersCollection = await getCollection('users');
    const count = await usersCollection.countDocuments();
    
    res.json({ 
      success: true, 
      message: 'Database connected',
      userCount: count 
    });
  } catch (error) {
    console.error('Database test failed:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

export default router;