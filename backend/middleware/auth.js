import jwt from 'jsonwebtoken';

export const requireAuth = (req, res, next) => {
  try {
    // 1. Check HttpOnly cookie first, then Bearer token header
    let token = req.cookies?.admin_token || req.cookies?.token;

    if (!token && req.headers.authorization) {
      const parts = req.headers.authorization.split(' ');
      if (parts.length === 2 && parts[0] === 'Bearer') {
        token = parts[1];
      }
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. Please log in as admin.',
      });
    }

    const secret = process.env.JWT_SECRET || 'asian_crackers_secret_jwt_key_2026';
    const decoded = jwt.verify(token, secret);

    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired session token. Please log in again.',
    });
  }
};
