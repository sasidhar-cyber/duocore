const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../db');
const { generateToken, requireAuth } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Register
router.post('/register', authLimiter, (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Username, email, and password are required.' });
  }

  const cleanEmail = String(email).trim().toLowerCase();
  const cleanUsername = String(username).trim();

  if (!EMAIL_REGEX.test(cleanEmail)) {
    return res.status(400).json({ error: 'Please enter a valid email address (e.g. name@domain.com).' });
  }
  if (cleanUsername.length < 2 || cleanUsername.length > 30) {
    return res.status(400).json({ error: 'Username must be between 2 and 30 characters.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
  }

  const existing = db.prepare('SELECT id, username, email FROM users WHERE username = ? OR email = ?').get(cleanUsername, cleanEmail);
  if (existing) {
    if (existing.email.toLowerCase() === cleanEmail) {
      return res.status(409).json({ error: 'Email address already registered. Please log in.' });
    }
    return res.status(409).json({ error: 'Username already in use. Please pick another one.' });
  }

  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync(password, salt);
  const id = 'user-' + uuidv4().slice(0, 8);
  const now = new Date().toISOString();
  const avatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(cleanUsername)}`;

  db.prepare(`
    INSERT INTO users (id, username, email, password_hash, avatar_url, bio, xp, level, streak, last_active_date, created_at)
    VALUES (?, ?, ?, ?, ?, 'Ready to study with DUOCORE', 100, 1, 1, ?, ?)
  `).run(id, cleanUsername, cleanEmail, hash, avatar, now.split('T')[0], now);

  const newUser = db.prepare('SELECT id, username, email, avatar_url, bio, xp, level, streak, sound_enabled, motion_reduced, theme FROM users WHERE id = ?').get(id);
  const token = generateToken(newUser);

  res.status(201).json({
    message: 'User registered successfully',
    token,
    user: newUser
  });
});

// Login
router.post('/login', authLimiter, (req, res) => {
  const target = String(req.body.usernameOrEmail || req.body.username || req.body.email || '').trim();
  const password = req.body.password;

  if (!target || !password) {
    return res.status(400).json({ error: 'Please enter your username/email and password.' });
  }

  const isEmail = EMAIL_REGEX.test(target);
  const user = isEmail
    ? db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)').get(target)
    : db.prepare('SELECT * FROM users WHERE LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?)').get(target, target);

  if (!user) {
    return res.status(401).json({ error: 'User account not found. Please click "Create Account" first.' });
  }
  if (!bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Incorrect password. Please try again.' });
  }

  const today = new Date().toISOString().split('T')[0];
  db.prepare('UPDATE users SET last_active_date = ? WHERE id = ?').run(today, user.id);

  const safeUser = {
    id: user.id,
    username: user.username,
    email: user.email,
    avatar_url: user.avatar_url,
    bio: user.bio,
    xp: user.xp,
    level: user.level,
    streak: user.streak,
    sound_enabled: user.sound_enabled,
    motion_reduced: user.motion_reduced,
    theme: user.theme
  };

  const token = generateToken(safeUser);
  res.json({
    message: 'Logged in successfully',
    token,
    user: safeUser
  });
});

// Demo Login
router.post('/demo-login', (req, res) => {
  const { role } = req.body;
  const targetUsername = role === 'sam' ? 'Sam' : 'Alex';
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(targetUsername);

  if (!user) {
    return res.status(404).json({ error: 'Demo user not found.' });
  }

  const safeUser = {
    id: user.id,
    username: user.username,
    email: user.email,
    avatar_url: user.avatar_url,
    bio: user.bio,
    xp: user.xp,
    level: user.level,
    streak: user.streak,
    sound_enabled: user.sound_enabled,
    motion_reduced: user.motion_reduced,
    theme: user.theme
  };

  const token = generateToken(safeUser);
  res.json({
    message: `Logged in as demo user ${targetUsername}`,
    token,
    user: safeUser
  });
});

// Current User Profile
router.get('/me', requireAuth, (req, res) => {
  const user = db.prepare(`
    SELECT id, username, email, phone_number, avatar_url, bio, xp, level, streak,
           sound_enabled, motion_reduced, theme, custom_wallpaper, read_receipts, last_seen_privacy, created_at
    FROM users WHERE id = ?
  `).get(req.user.id);
  res.json({ user: user || req.user });
});

// Update Profile & WhatsApp-style App Settings
router.patch('/profile', requireAuth, (req, res) => handleProfileUpdate(req, res));
router.put('/profile', requireAuth, (req, res) => handleProfileUpdate(req, res));

function handleProfileUpdate(req, res) {
  const { username, bio, avatar_url, phone_number, theme, custom_wallpaper, read_receipts, last_seen_privacy, sound_enabled } = req.body;
  
  if (username && (username.trim().length < 2 || username.trim().length > 30)) {
    return res.status(400).json({ error: 'Username must be between 2 and 30 characters.' });
  }

  if (username && username.trim() !== req.user.username) {
    const existing = db.prepare('SELECT id FROM users WHERE LOWER(username) = LOWER(?) AND id != ?').get(username.trim(), req.user.id);
    if (existing) {
      return res.status(409).json({ error: 'Username is already taken by another user.' });
    }
  }

  const currentUser = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  const newUsername = username ? username.trim() : currentUser.username;
  const newBio = bio !== undefined ? bio.trim() : currentUser.bio;
  const newAvatar = avatar_url || currentUser.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(newUsername)}`;
  const newPhone = phone_number !== undefined ? String(phone_number).trim() : (currentUser.phone_number || '');
  const newTheme = theme || currentUser.theme || 'dark';
  const newWallpaper = custom_wallpaper !== undefined ? custom_wallpaper : (currentUser.custom_wallpaper || '');
  const newReadReceipts = read_receipts !== undefined ? (read_receipts ? 1 : 0) : (currentUser.read_receipts ?? 1);
  const newLastSeenPrivacy = last_seen_privacy || currentUser.last_seen_privacy || 'everyone';
  const newSoundEnabled = sound_enabled !== undefined ? (sound_enabled ? 1 : 0) : (currentUser.sound_enabled ?? 0);

  db.prepare(`
    UPDATE users
    SET username = ?, bio = ?, avatar_url = ?, phone_number = ?, theme = ?,
        custom_wallpaper = ?, read_receipts = ?, last_seen_privacy = ?, sound_enabled = ?
    WHERE id = ?
  `).run(newUsername, newBio, newAvatar, newPhone, newTheme, newWallpaper, newReadReceipts, newLastSeenPrivacy, newSoundEnabled, req.user.id);

  const updatedUser = db.prepare(`
    SELECT id, username, email, phone_number, avatar_url, bio, xp, level, streak,
           sound_enabled, motion_reduced, theme, custom_wallpaper, read_receipts, last_seen_privacy
    FROM users WHERE id = ?
  `).get(req.user.id);
  const token = generateToken(updatedUser);

  res.json({
    message: 'Profile & Settings updated successfully',
    token,
    user: updatedUser
  });
}

// Change Password
router.post('/change-password', requireAuth, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Both current password and new password are required.' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found.' });
  }

  if (!bcrypt.compareSync(currentPassword, user.password_hash)) {
    return res.status(401).json({ error: 'Current password does not match.' });
  }

  const salt = bcrypt.genSaltSync(10);
  const newHash = bcrypt.hashSync(newPassword, salt);

  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newHash, req.user.id);

  res.json({ message: 'Password changed successfully! You can now log in with your new password.' });
});

module.exports = router;
