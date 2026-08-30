const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

function generateInviteCode() {
  const num = Math.floor(100 + Math.random() * 900);
  return `DUO-${num}`;
}

// Create / Retrieve Pending Invite (Supports Multi-Friend Squad Invites)
router.post('/create', requireAuth, (req, res) => {
  const userId = req.user.id;
  const now = new Date();
  const nowIso = now.toISOString();

  // 1. Check if user already has an active room
  const userRoom = db.prepare(`
    SELECT r.id, r.code, r.name
    FROM room_members rm
    JOIN rooms r ON rm.room_id = r.id
    WHERE rm.user_id = ? AND r.is_active = 1
    LIMIT 1
  `).get(userId);

  if (userRoom) {
    // Check if an unexpired invite already exists for this room/user
    let existingInvite = db.prepare(`
      SELECT id, code, expires_at, status, created_at
      FROM duo_invites
      WHERE sender_id = ? AND status = 'pending' AND expires_at > ?
      ORDER BY created_at DESC
      LIMIT 1
    `).get(userId, nowIso);

    if (!existingInvite) {
      const expiresAt = new Date(now.getTime() + 72 * 60 * 60 * 1000).toISOString();
      const inviteId = 'inv-' + uuidv4().slice(0, 8);
      db.prepare(`
        INSERT INTO duo_invites (id, code, sender_id, recipient_id, status, expires_at, created_at)
        VALUES (?, ?, ?, NULL, 'pending', ?, ?)
      `).run(inviteId, userRoom.code, userId, expiresAt, nowIso);

      existingInvite = db.prepare('SELECT * FROM duo_invites WHERE id = ?').get(inviteId);
    }

    return res.json({
      message: 'Squad invite retrieved',
      invite: existingInvite,
      roomCode: userRoom.code
    });
  }

  // 2. If no active room yet, check existing pending invite
  const existingInvite = db.prepare(`
    SELECT id, code, expires_at, status, created_at
    FROM duo_invites
    WHERE sender_id = ? AND status = 'pending' AND expires_at > ?
    ORDER BY created_at DESC
    LIMIT 1
  `).get(userId, nowIso);

  if (existingInvite) {
    return res.json({
      message: 'Active invite retrieved',
      invite: existingInvite
    });
  }

  // 3. Generate new invite
  const expiresAt = new Date(now.getTime() + 72 * 60 * 60 * 1000).toISOString();
  let code = generateInviteCode();

  let attempts = 0;
  while (attempts < 10) {
    const clash = db.prepare("SELECT id FROM duo_invites WHERE code = ? AND status = 'pending'").get(code);
    if (!clash) break;
    code = generateInviteCode();
    attempts++;
  }

  const inviteId = 'inv-' + uuidv4().slice(0, 8);
  db.prepare(`
    INSERT INTO duo_invites (id, code, sender_id, recipient_id, status, expires_at, created_at)
    VALUES (?, ?, ?, NULL, 'pending', ?, ?)
  `).run(inviteId, code, userId, expiresAt, nowIso);

  const newInvite = db.prepare('SELECT * FROM duo_invites WHERE id = ?').get(inviteId);

  res.status(201).json({
    message: 'Invite created successfully',
    invite: newInvite
  });
});

// Validate Invite Code (Check before accepting)
router.get('/code/:code', requireAuth, (req, res) => {
  const { code } = req.params;
  const userId = req.user.id;

  if (!code) {
    return res.status(400).json({ error: 'Invite code is required.' });
  }

  let cleanCode = code.trim().toUpperCase();
  if (!cleanCode.startsWith('DUO-') && /^\d+$/.test(cleanCode)) {
    cleanCode = `DUO-${cleanCode}`;
  }

  // 1. Check in duo_invites
  let invite = db.prepare(`
    SELECT di.*, u.username as sender_username, u.avatar_url as sender_avatar, u.level as sender_level
    FROM duo_invites di
    JOIN users u ON di.sender_id = u.id
    WHERE di.code = ?
    ORDER BY di.created_at DESC
    LIMIT 1
  `).get(cleanCode);

  // 2. Fallback check in rooms table directly
  if (!invite) {
    const room = db.prepare(`
      SELECT r.id, r.code, r.name, r.created_by as sender_id, u.username as sender_username, u.avatar_url as sender_avatar
      FROM rooms r
      JOIN users u ON r.created_by = u.id
      WHERE (r.code = ? OR r.code = ?) AND r.is_active = 1
      LIMIT 1
    `).get(cleanCode, cleanCode.replace('DUO-', ''));

    if (room) {
      invite = {
        id: 'room-' + room.id,
        code: room.code,
        sender_id: room.sender_id,
        sender_username: room.sender_username,
        sender_avatar: room.sender_avatar,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      };
    }
  }

  if (!invite) {
    return res.status(404).json({ error: 'Invalid invite code. Please check the code with your friend.' });
  }

  res.json({
    valid: true,
    invite: {
      id: invite.id,
      code: invite.code,
      senderId: invite.sender_id,
      senderUsername: invite.sender_username,
      senderAvatar: invite.sender_avatar,
      senderLevel: invite.sender_level || 1,
      expiresAt: invite.expires_at
    }
  });
});

// Accept Invite Code & Join Duo Squad Room
router.post('/accept', requireAuth, (req, res) => {
  const { code } = req.body;
  const userId = req.user.id;

  if (!code) {
    return res.status(400).json({ error: 'Invite code is required.' });
  }

  let cleanCode = code.trim().toUpperCase();
  if (!cleanCode.startsWith('DUO-') && /^\d+$/.test(cleanCode)) {
    cleanCode = `DUO-${cleanCode}`;
  }
  const now = new Date().toISOString();

  // 1. Look for existing room with this code (active or inactive)
  let room = db.prepare('SELECT * FROM rooms WHERE (code = ? OR code = ?)').get(cleanCode, cleanCode.replace('DUO-', ''));
  let senderId = null;
  let senderUsername = 'Partner';

  if (!room) {
    // 2. Look in duo_invites table
    const invite = db.prepare(`
      SELECT di.*, u.username as sender_username
      FROM duo_invites di
      JOIN users u ON di.sender_id = u.id
      WHERE di.code = ?
      ORDER BY di.created_at DESC
      LIMIT 1
    `).get(cleanCode);

    if (!invite) {
      return res.status(400).json({ error: `Invalid code "${cleanCode}". Please verify your friend's 1v1 code.` });
    }
    senderId = invite.sender_id;
    senderUsername = invite.sender_username;
  } else {
    senderId = room.created_by;
    // Reactivate room
    db.prepare('UPDATE rooms SET is_active = 1 WHERE id = ?').run(room.id);
  }

  let roomId;
  const tx = db.transaction(() => {
    if (!room) {
      roomId = 'room-duo-' + uuidv4().slice(0, 8);
      const roomName = `${senderUsername}'s Duo Room`;

      db.prepare(`
        INSERT OR REPLACE INTO rooms (id, code, name, passcode_hash, created_by, is_active, created_at)
        VALUES (?, ?, ?, '', ?, 1, ?)
      `).run(roomId, cleanCode, roomName, senderId, now);

      db.prepare(`
        INSERT OR IGNORE INTO room_members (id, room_id, user_id, role, joined_at, last_seen, current_subject, current_topic, is_studying, study_started_at)
        VALUES (?, ?, ?, 'creator', ?, ?, 'General', 'Duo Chat', 0, '')
      `).run('rm-' + uuidv4().slice(0, 8), roomId, senderId, now, now);

      room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(roomId);
    } else {
      roomId = room.id;
    }

    // Add current user to room
    const existingMember = db.prepare('SELECT id FROM room_members WHERE room_id = ? AND user_id = ?').get(roomId, userId);
    if (!existingMember) {
      db.prepare(`
        INSERT INTO room_members (id, room_id, user_id, role, joined_at, last_seen, current_subject, current_topic, is_studying, study_started_at)
        VALUES (?, ?, ?, 'member', ?, ?, 'General', 'Duo Chat', 0, '')
      `).run('rm-' + uuidv4().slice(0, 8), roomId, userId, now, now);
    }

    // Clean up any prior solo rooms that current user was in
    try {
      db.prepare(`
        DELETE FROM room_members 
        WHERE user_id = ? AND room_id != ? AND room_id IN (
          SELECT r.id FROM rooms r 
          WHERE (SELECT COUNT(*) FROM room_members rm2 WHERE rm2.room_id = r.id) <= 1
        )
      `).run(userId, roomId);
    } catch (err) {}

    // Record permanent partnership in duo_partnerships table
    if (senderId && senderId !== userId) {
      db.prepare(`
        INSERT OR REPLACE INTO duo_partnerships (id, user1_id, user2_id, status, established_at)
        VALUES (?, ?, ?, 'active', ?)
      `).run('part-' + uuidv4().slice(0, 8), senderId, userId, now);
    }
  });

  tx();

  const members = db.prepare(`
    SELECT u.id, u.username, u.email, u.avatar_url, u.bio, u.xp, u.level, u.streak
    FROM room_members rm
    JOIN users u ON rm.user_id = u.id
    WHERE rm.room_id = ?
  `).all(roomId);

  // Notify everyone via socket
  const io = req.app.get('io');
  if (io) {
    io.to(roomId).emit('room:member_joined', {
      roomId,
      user: req.user
    });
    if (senderId) {
      io.to(`user:${senderId}`).emit('duo:connected', {
        room,
        partner: req.user
      });
    }
  }

  res.json({
    message: 'Successfully connected to Duo Room!',
    room,
    members
  });
});

// Cancel Pending Invite
router.post('/cancel', requireAuth, (req, res) => {
  const userId = req.user.id;

  db.prepare(`
    UPDATE duo_invites
    SET status = 'cancelled'
    WHERE sender_id = ? AND status = 'pending'
  `).run(userId);

  res.json({ message: 'Pending invite cancelled.' });
});

module.exports = router;
