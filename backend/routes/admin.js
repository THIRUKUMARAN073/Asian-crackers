import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

const DEFAULT_HASH = '$2a$10$5rQkfw1kRy4JwjMoVjdqjOOGZaqp7T4ARlhPlWmxkO9Ha15xVoQiu'; // "Asian@2026"

// POST /api/admin/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Username and password are required.',
      });
    }

    const expectedUsername = process.env.ADMIN_USERNAME || 'asianadmin';
    const passwordHash = process.env.ADMIN_PASSWORD_HASH || DEFAULT_HASH;

    if (username.trim().toLowerCase() !== expectedUsername.toLowerCase()) {
      return res.status(401).json({
        success: false,
        error: 'Invalid username or password.',
      });
    }

    let isPasswordValid = false;
    if (passwordHash.startsWith('$2a$') || passwordHash.startsWith('$2b$')) {
      isPasswordValid = await bcrypt.compare(password, passwordHash);
    } else if (process.env.ADMIN_PASSWORD) {
      isPasswordValid = password === process.env.ADMIN_PASSWORD;
    }

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid username or password.',
      });
    }

    const secret = process.env.JWT_SECRET || 'asian_crackers_secret_jwt_key_2026';
    const token = jwt.sign(
      { username: expectedUsername, role: 'admin' },
      secret,
      { expiresIn: '7d' }
    );

    // Secure cookie configuration (support cross-site if on Render / separate domain)
    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('admin_token', token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.json({
      success: true,
      message: 'Authentication successful.',
      token,
      user: { username: expectedUsername },
    });
  } catch (err) {
    console.error('Admin Login Error:', err);
    return res.status(500).json({
      success: false,
      error: 'An internal error occurred during login.',
    });
  }
});

// POST /api/admin/logout
router.post('/logout', (req, res) => {
  const isProduction = process.env.NODE_ENV === 'production';
  res.clearCookie('admin_token', {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
  });
  return res.json({
    success: true,
    message: 'Logged out successfully.',
  });
});

// GET /api/admin/me
router.get('/me', requireAuth, (req, res) => {
  return res.json({
    success: true,
    authenticated: true,
    user: {
      username: req.admin.username,
    },
  });
});

export default router;
