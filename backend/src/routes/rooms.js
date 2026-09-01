const express = require('express');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const multer = require('multer');
const { db } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const fs = require('fs');

// Configure multer storage with guaranteed directory existence
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = 'file-' + Date.now() + '-' + Math.round(Math.random() * 1E6) + ext;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB max
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
    return res.status(400).json({ error: 'No file uploaded or file exceeds 25MB limit.' });
  }

  const fileUrl = `/uploads/${req.file.filename}`;
  const mimeType = req.file.mimetype || 'application/octet-stream';
  let detectedType = 'file';

  if (mimeType.startsWith('image/')) detectedType = 'image';
  else if (mimeType.startsWith('video/')) detectedType = 'video';
  else if (mimeType.startsWith('audio/')) detectedType = 'audio';
  else if (mimeType === 'application/pdf' || req.file.originalname.toLowerCase().endsWith('.pdf')) detectedType = 'file';

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

  if (channel.startsWith('dm:') || channel.startsWith('private:')) {
    const parts = channel.split(':');
    if (!parts.includes(userId)) {
      return res.status(403).json({ error: 'Access denied to this conversation.' });
    }
  }

  const messages = db.prepare(`
    SELECT m.*, u.username, u.avatar_url,
           orig.text as reply_to_text, orig_u.username as reply_to_username,
           (SELECT COUNT(*) FROM starred_messages sm WHERE sm.message_id = m.id AND sm.user_id = ?) as is_starred,
           (SELECT COUNT(*) FROM pinned_messages pm WHERE pm.message_id = m.id AND pm.room_id = m.room_id) as is_pinned
    FROM messages m
    LEFT JOIN users u ON m.sender_id = u.id
    LEFT JOIN messages orig ON m.reply_to_id = orig.id AND IFNULL(orig.is_deleted, 0) = 0
    LEFT JOIN users orig_u ON orig.sender_id = orig_u.id
    WHERE m.room_id = ? AND IFNULL(m.channel_type, 'normal') = ? AND IFNULL(m.is_deleted, 0) = 0
    ORDER BY m.created_at ASC
    LIMIT 400
  `).all(userId, roomId, channel);

  res.json({ messages, channel });
});

// Post Message to 1v1 or Vault Channel (Supports Text, Media, Location, Music Cards)
router.post('/:roomId/messages', requireAuth, (req, res) => {
  const { roomId } = req.params;
  const { text, type = 'text', channel = 'normal', replyToId, reply_to_id, metadata = {} } = req.body;
  const effectiveReplyId = reply_to_id || replyToId || null;
  const userId = req.user.id;

  if (!text && !metadata?.fileUrl && !metadata?.latitude && !metadata?.song) {
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

  let effectiveType = type || 'text';
  if (metadata?.fileUrl) {
    if (metadata.fileType?.startsWith('image/')) effectiveType = 'image';
    else if (metadata.fileType?.startsWith('audio/')) effectiveType = 'audio';
    else if (metadata.fileType?.startsWith('video/')) effectiveType = 'video';
    else effectiveType = 'file';
  } else if (metadata?.song) {
    effectiveType = 'music';
  } else if (metadata?.latitude) {
    effectiveType = 'location';
  }

  db.prepare(`
    INSERT INTO messages (id, room_id, sender_id, text, type, channel_type, metadata, reply_to_id, is_read, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
  `).run(
    msgId,
    roomId,
    userId,
    (text || '').trim(),
    effectiveType,
    channel || 'normal',
    JSON.stringify(metadata || {}),
    effectiveReplyId,
    now
  );

  const savedMsg = db.prepare(`
    SELECT m.*, u.username, u.avatar_url,
           orig.text as reply_to_text, orig_u.username as reply_to_username
    FROM messages m
    JOIN users u ON m.sender_id = u.id
    LEFT JOIN messages orig ON m.reply_to_id = orig.id
    LEFT JOIN users orig_u ON orig.sender_id = orig_u.id
    WHERE m.id = ?
  `).get(msgId);

  // Broadcast via Socket.IO
  const io = req.app.get('io');
  if (io) {
    io.to(roomId).emit('chat:new_message', savedMsg);
  }

  // Trigger async cloud sync for messages
  const { syncTableToCloud } = require('../db/cloudSync');
  syncTableToCloud(db, 'messages').catch(() => {});

  res.status(201).json({ message: 'Message sent', data: savedMsg });
});

// Mark Room Messages as Read
router.post('/:roomId/messages/read', requireAuth, (req, res) => {
  const { roomId } = req.params;
  const { channel = 'normal', senderId } = req.body;
  const userId = req.user.id;

  if (!isUserInActiveRoom(userId, roomId)) {
    return res.status(403).json({ error: 'Access denied.' });
  }

  const now = new Date().toISOString();

  if (senderId) {
    db.prepare(`
      UPDATE messages
      SET is_read = 1
      WHERE room_id = ? AND channel_type = ? AND sender_id = ? AND is_read = 0
    `).run(roomId, channel, senderId);
  } else {
    db.prepare(`
      UPDATE messages
      SET is_read = 1
      WHERE room_id = ? AND channel_type = ? AND sender_id != ? AND is_read = 0
    `).run(roomId, channel, userId);
  }

  const io = req.app.get('io');
  if (io) {
    io.to(roomId).emit('chat:messages_read', {
      roomId,
      channel,
      readBy: userId,
      readAt: now
    });
  }

  res.json({ success: true });
});

// Clear Entire Chat (Remove all conversation history for this room)
router.delete('/:roomId/messages', requireAuth, (req, res) => {
  const { roomId } = req.params;
  const { channel = 'normal' } = req.query;
  const userId = req.user.id;

  if (!isUserInActiveRoom(userId, roomId)) {
    return res.status(403).json({ error: 'Access denied.' });
  }

  const result = db.prepare(`
    UPDATE messages
    SET is_deleted = 1, text = '', metadata = '{}'
    WHERE room_id = ? AND IFNULL(channel_type, 'normal') = ? AND IFNULL(is_deleted, 0) = 0
  `).run(roomId, channel);

  // Clean up starred and pinned references for this room
  db.prepare('DELETE FROM starred_messages WHERE room_id = ?').run(roomId);
  db.prepare('DELETE FROM pinned_messages WHERE room_id = ?').run(roomId);

  const io = req.app.get('io');
  if (io) {
    io.to(roomId).emit('chat:room_cleared', { roomId, channel, clearedBy: userId });
  }

  const { syncTableToCloud } = require('../db/cloudSync');
  syncTableToCloud(db, 'messages').catch(() => {});
  syncTableToCloud(db, 'starred_messages').catch(() => {});
  syncTableToCloud(db, 'pinned_messages').catch(() => {});

  res.json({ success: true, cleared: result.changes });
});

// Delete Single Message (Delete for Everyone)
router.delete('/:roomId/messages/:messageId', requireAuth, (req, res) => {
  const { roomId, messageId } = req.params;
  const userId = req.user.id;

  if (!isUserInActiveRoom(userId, roomId)) {
    return res.status(403).json({ error: 'Access denied.' });
  }

  const msg = db.prepare('SELECT * FROM messages WHERE id = ? AND room_id = ?').get(messageId, roomId);
  if (!msg) {
    return res.status(404).json({ error: 'Message not found.' });
  }

  if (msg.sender_id !== userId) {
    const room = db.prepare('SELECT created_by FROM rooms WHERE id = ?').get(roomId);
    if (room?.created_by !== userId) {
      return res.status(403).json({ error: 'You can only delete your own messages.' });
    }
  }

  db.prepare(`
    UPDATE messages
    SET is_deleted = 1, text = '', metadata = '{}'
    WHERE id = ?
  `).run(messageId);

  db.prepare('DELETE FROM starred_messages WHERE message_id = ?').run(messageId);
  db.prepare('DELETE FROM pinned_messages WHERE message_id = ?').run(messageId);

  const io = req.app.get('io');
  if (io) {
    io.to(roomId).emit('chat:message_deleted', {
      messageId,
      roomId,
      channel: msg.channel_type || 'normal',
      deletedBy: userId
    });
  }

  const { syncTableToCloud } = require('../db/cloudSync');
  syncTableToCloud(db, 'messages').catch(() => {});
  syncTableToCloud(db, 'starred_messages').catch(() => {});
  syncTableToCloud(db, 'pinned_messages').catch(() => {});

  res.json({ message: 'Message deleted', messageId });
});

// Panic clear: used only after the owner has enabled the failed-PIN safety rule.
router.post('/:roomId/panic-clear', requireAuth, (req, res) => {
  const { roomId } = req.params;
  const userId = req.user.id;

  if (!isUserInActiveRoom(userId, roomId)) {
    return res.status(403).json({ error: 'Access denied.' });
  }

  const result = db.prepare(`
    UPDATE messages
    SET is_deleted = 1, text = '', metadata = '{}'
    WHERE room_id = ? AND IFNULL(is_deleted, 0) = 0
  `).run(roomId);

  db.prepare('DELETE FROM starred_messages WHERE room_id = ?').run(roomId);
  db.prepare('DELETE FROM pinned_messages WHERE room_id = ?').run(roomId);

  const io = req.app.get('io');
  if (io) io.to(roomId).emit('chat:room_cleared', { roomId, clearedBy: userId });

  const { syncTableToCloud } = require('../db/cloudSync');
  syncTableToCloud(db, 'messages').catch(() => {});
  syncTableToCloud(db, 'starred_messages').catch(() => {});
  syncTableToCloud(db, 'pinned_messages').catch(() => {});

  res.json({ success: true, cleared: result.changes });
});

/* ========================================================================= */
/* STARRED & PINNED MESSAGES                                                 */
/* ========================================================================= */

// Star a Message
router.post('/:roomId/messages/:messageId/star', requireAuth, (req, res) => {
  const { roomId, messageId } = req.params;
  const userId = req.user.id;

  if (!isUserInActiveRoom(userId, roomId)) return res.status(403).json({ error: 'Access denied.' });

  const id = 'star-' + uuidv4().slice(0, 8);
  const now = new Date().toISOString();

  try {
    db.prepare(`
      INSERT OR REPLACE INTO starred_messages (id, user_id, message_id, room_id, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, userId, messageId, roomId, now);

    res.json({ success: true, message: 'Message starred' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to star message' });
  }
});

// Unstar a Message
router.delete('/:roomId/messages/:messageId/star', requireAuth, (req, res) => {
  const { roomId, messageId } = req.params;
  const userId = req.user.id;

  try {
    db.prepare('DELETE FROM starred_messages WHERE user_id = ? AND message_id = ?').run(userId, messageId);
    res.json({ success: true, message: 'Message unstarred' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to unstar message' });
  }
});

// Get All Starred Messages
router.get('/:roomId/starred', requireAuth, (req, res) => {
  const { roomId } = req.params;
  const userId = req.user.id;

  try {
    const starred = db.prepare(`
      SELECT sm.id as star_id, sm.created_at as starred_at, m.*, u.username, u.avatar_url
      FROM starred_messages sm
      JOIN messages m ON sm.message_id = m.id
      LEFT JOIN users u ON m.sender_id = u.id
      WHERE sm.user_id = ? AND sm.room_id = ? AND m.is_deleted = 0
      ORDER BY sm.created_at DESC
    `).all(userId, roomId);

    res.json({ starred });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch starred messages', starred: [] });
  }
});

// Pin a Message in Room
router.post('/:roomId/messages/:messageId/pin', requireAuth, (req, res) => {
  const { roomId, messageId } = req.params;
  const userId = req.user.id;

  if (!isUserInActiveRoom(userId, roomId)) return res.status(403).json({ error: 'Access denied.' });

  const id = 'pin-' + uuidv4().slice(0, 8);
  const now = new Date().toISOString();

  try {
    db.prepare(`
      INSERT OR REPLACE INTO pinned_messages (id, room_id, message_id, pinned_by, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, roomId, messageId, userId, now);

    const msg = db.prepare(`
      SELECT m.*, u.username, u.avatar_url FROM messages m LEFT JOIN users u ON m.sender_id = u.id WHERE m.id = ?
    `).get(messageId);

    const io = req.app.get('io');
    if (io) {
      io.to(roomId).emit('chat:message_pinned', { message: msg, pinnedBy: userId });
    }

    res.json({ success: true, message: 'Message pinned' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to pin message' });
  }
});

// Unpin a Message
router.delete('/:roomId/messages/:messageId/pin', requireAuth, (req, res) => {
  const { roomId, messageId } = req.params;
  const userId = req.user.id;

  if (!isUserInActiveRoom(userId, roomId)) return res.status(403).json({ error: 'Access denied.' });

  try {
    db.prepare('DELETE FROM pinned_messages WHERE room_id = ? AND message_id = ?').run(roomId, messageId);

    const io = req.app.get('io');
    if (io) {
      io.to(roomId).emit('chat:message_unpinned', { messageId });
    }

    res.json({ success: true, message: 'Message unpinned' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to unpin message' });
  }
});

// Get Pinned Messages
router.get('/:roomId/pinned', requireAuth, (req, res) => {
  const { roomId } = req.params;
  const userId = req.user.id;

  try {
    const pinned = db.prepare(`
      SELECT pm.id as pin_id, pm.created_at as pinned_at, m.*, u.username, u.avatar_url
      FROM pinned_messages pm
      JOIN messages m ON pm.message_id = m.id
      LEFT JOIN users u ON m.sender_id = u.id
      WHERE pm.room_id = ? AND m.is_deleted = 0
      ORDER BY pm.created_at DESC
    `).all(roomId);

    res.json({ pinned });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch pinned messages', pinned: [] });
  }
});

/* ========================================================================= */
/* CHAT SEARCH & MEDIA GALLERY                                               */
/* ========================================================================= */

// Search inside Chat
router.get('/:roomId/search', requireAuth, (req, res) => {
  const { roomId } = req.params;
  const query = String(req.query.q || '').trim();
  const userId = req.user.id;

  if (!query) return res.json({ results: [] });
  if (!isUserInActiveRoom(userId, roomId)) return res.status(403).json({ error: 'Access denied.' });

  try {
    const results = db.prepare(`
      SELECT m.*, u.username, u.avatar_url
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.room_id = ? AND m.is_deleted = 0 AND (m.text LIKE ? OR u.username LIKE ?)
      ORDER BY m.created_at DESC
      LIMIT 50
    `).all(roomId, `%${query}%`, `%${query}%`);

    res.json({ results });
  } catch (err) {
    res.status(500).json({ error: 'Search failed', results: [] });
  }
});

// Media Gallery
router.get('/:roomId/media', requireAuth, (req, res) => {
  const { roomId } = req.params;
  const userId = req.user.id;

  if (!isUserInActiveRoom(userId, roomId)) return res.status(403).json({ error: 'Access denied.' });

  try {
    const rawMessages = db.prepare(`
      SELECT m.*, u.username
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.room_id = ? AND m.is_deleted = 0 AND (m.metadata LIKE '%fileUrl%' OR m.text LIKE '%http%')
      ORDER BY m.created_at DESC
      LIMIT 200
    `).all(roomId);

    const photos = [];
    const videos = [];
    const audio = [];
    const documents = [];
    const links = [];

    for (const msg of rawMessages) {
      let meta = {};
      try { meta = JSON.parse(msg.metadata || '{}'); } catch {}

      if (meta.fileUrl) {
        const item = { id: msg.id, url: meta.fileUrl, fileName: meta.fileName || 'Attachment', date: msg.created_at, sender: msg.username };
        if (meta.fileType?.startsWith('image/') || msg.type === 'image') photos.push(item);
        else if (meta.fileType?.startsWith('video/') || msg.type === 'video') videos.push(item);
        else if (meta.fileType?.startsWith('audio/') || msg.type === 'audio') audio.push(item);
        else documents.push(item);
      } else if (msg.text?.includes('http')) {
        const urls = msg.text.match(/https?:\/\/[^\s]+/g) || [];
        urls.forEach(u => links.push({ id: msg.id, url: u, text: msg.text, date: msg.created_at, sender: msg.username }));
      }
    }

    res.json({ photos, videos, audio, documents, links });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch media gallery' });
  }
});

/* ========================================================================= */
/* CALL HISTORY                                                              */
/* ========================================================================= */

// Log a Call
router.post('/:roomId/calls', requireAuth, (req, res) => {
  const { roomId } = req.params;
  const { receiverId, type = 'audio', status = 'completed', durationSeconds = 0 } = req.body;
  const userId = req.user.id;

  const id = 'call-' + uuidv4().slice(0, 8);
  const now = new Date().toISOString();

  try {
    db.prepare(`
      INSERT INTO call_history (id, room_id, caller_id, receiver_id, type, status, duration_seconds, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, roomId, userId, receiverId || userId, type, status, Number(durationSeconds || 0), now);

    res.json({ success: true, callId: id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to log call' });
  }
});

// Get Call History
router.get('/:roomId/calls', requireAuth, (req, res) => {
  const { roomId } = req.params;
  const userId = req.user.id;

  try {
    const calls = db.prepare(`
      SELECT ch.*, u1.username as caller_name, u2.username as receiver_name
      FROM call_history ch
      LEFT JOIN users u1 ON ch.caller_id = u1.id
      LEFT JOIN users u2 ON ch.receiver_id = u2.id
      WHERE ch.room_id = ?
      ORDER BY ch.created_at DESC
      LIMIT 30
    `).all(roomId);

    res.json({ calls });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch call history', calls: [] });
  }
});

module.exports = router;
