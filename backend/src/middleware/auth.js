const jwt = require('jsonwebtoken');
const { db } = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'duocore_jwt_super_secret_key_2026';

function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      email: user.email
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required. No token provided.' });
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid or expired session token.' });
  }

  const user = db.prepare('SELECT id, username, email, avatar_url, bio, xp, level, streak, sound_enabled, motion_reduced, theme FROM users WHERE id = ?').get(decoded.id);
  if (!user) {
    return res.status(401).json({ error: 'User not found in system.' });
  }

  req.user = user;
  next();
}

module.exports = {
  JWT_SECRET,
  generateToken,
  verifyToken,
  requireAuth
};
