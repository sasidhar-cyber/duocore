const express = require('express');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const multer = require('multer');
const { db } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = 'file-' + Date.now() + '-' + Math.round(Math.random() * 1E6) + ext;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB max
});

// Helper: check if user is in active room
function isUserInActiveRoom(userId, roomId) {
  const member = db.prepare('SELECT * FROM room_members WHERE room_id = ? AND user_id = ?').get(roomId, userId);
  return !!member;
}

// Upload Media / Document Attachment (Photos, PDFs, Videos, Audios)
router.post('/:roomId/upload', requireAuth, upload.single('file'), (req, res) => {
  const { roomId } = req.params;
  const userId = req.user.id;

  if (!isUserInActiveRoom(userId, roomId)) {
    return res.status(403).json({ error: 'Access denied. You are not a member of this room.' });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }

  const fileUrl = `/uploads/${req.file.filename}`;
  const mimeType = req.file.mimetype;
  let detectedType = 'file';

  if (mimeType.startsWith('image/')) detectedType = 'image';
  else if (mimeType.startsWith('video/')) detectedType = 'video';
  else if (mimeType.startsWith('audio/')) detectedType = 'audio';
  else if (mimeType === 'application/pdf' || req.file.originalname.endsWith('.pdf')) detectedType = 'file';

  res.json({
    fileUrl,
    fileName: req.file.originalname,
    fileSize: req.file.size,
    mimeType,
    type: detectedType
  });
});

// Get Room Messages for a specific 1v1 conversation or private vault
router.get('/:roomId/messages', requireAuth, (req, res) => {
  const { roomId } = req.params;
  const channel = req.query.channel || 'normal';
  const userId = req.user.id;

  if (!isUserInActiveRoom(userId, roomId)) {
    return res.status(403).json({ error: 'Access denied. You are not a member of this room.' });
  }

  // If DM channel, ensure caller is one of the participants
  if (channel.startsWith('dm:') || channel.startsWith('private:')) {
    const parts = channel.split(':');
    if (!parts.includes(userId)) {
      return res.status(403).json({ error: 'Access denied to this conversation.' });
    }
  }

  const messages = db.prepare(`
    SELECT m.*, u.username, u.avatar_url
    FROM messages m
    LEFT JOIN users u ON m.sender_id = u.id
    WHERE m.room_id = ? AND IFNULL(m.channel_type, 'normal') = ?
    ORDER BY m.created_at ASC
    LIMIT 400
  `).all(roomId, channel);

  res.json({ messages, channel });
});

// Post Message to 1v1 or Vault Channel
router.post('/:roomId/messages', requireAuth, (req, res) => {
  const { roomId } = req.params;
  const { text, type = 'text', channel = 'normal', replyToId, metadata = {} } = req.body;
  const userId = req.user.id;

  if (!text && !metadata?.fileUrl && !metadata?.latitude) {
    return res.status(400).json({ error: 'Message content or attachment is required.' });
  }

  if (!isUserInActiveRoom(userId, roomId)) {
    return res.status(403).json({ error: 'Access denied. You are not a member of this room.' });
  }

  if (channel.startsWith('dm:') || channel.startsWith('private:')) {
    const parts = channel.split(':');
    if (!parts.includes(userId)) {
      return res.status(403).json({ error: 'Unauthorized direct message.' });
    }
  }

  const msgId = 'msg-' + uuidv4().slice(0, 10);
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO messages (id, room_id, sender_id, text, type, channel_type, metadata, reply_to_id, is_read, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
  `).run(
    msgId,
    roomId,
    userId,
    (text || '').trim(),
    type || 'text',
    channel || 'normal',
    JSON.stringify(metadata || {}),
    replyToId || null,
    now
  );

  const savedMsg = db.prepare(`
    SELECT m.*, u.username, u.avatar_url
    FROM messages m
    JOIN users u ON m.sender_id = u.id
    WHERE m.id = ?
  `).get(msgId);

  // Broadcast via Socket.IO
  const io = req.app.get('io');
  if (io) {
    io.to(roomId).emit('chat:new_message', savedMsg);
  }

  res.status(201).json({ message: 'Message sent', data: savedMsg });
});

// Update Study Status in Room
router.patch('/:roomId/status', requireAuth, (req, res) => {
  const { roomId } = req.params;
  const { subject, topic, is_studying } = req.body;
  const userId = req.user.id;
  const now = new Date().toISOString();

  if (!isUserInActiveRoom(userId, roomId)) {
    return res.status(403).json({ error: 'Access denied.' });
  }

  db.prepare(`
    UPDATE room_members
    SET current_subject = COALESCE(?, current_subject),
        current_topic = COALESCE(?, current_topic),
        is_studying = COALESCE(?, is_studying),
        last_seen = ?
    WHERE room_id = ? AND user_id = ?
  `).run(subject, topic, is_studying !== undefined ? (is_studying ? 1 : 0) : null, now, roomId, userId);

  // Broadcast presence update
  const io = req.app.get('io');
  if (io) {
    io.to(roomId).emit('presence:partner_status', {
      userId,
      current_subject: subject,
      current_topic: topic,
      is_studying: is_studying ? 1 : 0,
      last_seen: now
    });
  }

  res.json({ message: 'Status updated' });
});

module.exports = router;
