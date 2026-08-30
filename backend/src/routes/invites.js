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

  const cleanCode = code.trim().toUpperCase();
  const invite = db.prepare(`
    SELECT di.*, u.username as sender_username, u.avatar_url as sender_avatar, u.level as sender_level
    FROM duo_invites di
    JOIN users u ON di.sender_id = u.id
    WHERE di.code = ?
    ORDER BY di.created_at DESC
    LIMIT 1
  `).get(cleanCode);

  if (!invite) {
    return res.status(404).json({ error: 'Invalid invite code. Please check with your friend.' });
  }

  const now = new Date().toISOString();
  if (invite.expires_at < now) {
    return res.status(400).json({ error: 'This invite code has expired. Ask your friend to create a fresh invite.' });
  }

  res.json({
    valid: true,
    invite: {
      id: invite.id,
      code: invite.code,
      senderId: invite.sender_id,
      senderUsername: invite.sender_username,
      senderAvatar: invite.sender_avatar,
      senderLevel: invite.sender_level,
      expiresAt: invite.expires_at
    }
  });
});

// Accept Invite Code & Join Study Squad
router.post('/accept', requireAuth, (req, res) => {
  const { code } = req.body;
  const userId = req.user.id;

  if (!code) {
    return res.status(400).json({ error: 'Invite code is required.' });
  }

  const cleanCode = code.trim().toUpperCase();
  const now = new Date().toISOString();

  // Find invite
  const invite = db.prepare(`
    SELECT di.*, u.username as sender_username, u.email as sender_email, u.avatar_url as sender_avatar,
           u.bio as sender_bio, u.xp as sender_xp, u.level as sender_level, u.streak as sender_streak
    FROM duo_invites di
    JOIN users u ON di.sender_id = u.id
    WHERE di.code = ? AND di.expires_at > ?
    ORDER BY di.created_at DESC
    LIMIT 1
  `).get(cleanCode, now);

  if (!invite) {
    return res.status(400).json({ error: 'Invalid or expired invite code. Please verify the code.' });
  }

  // Check if target room already exists for this code
  let room = db.prepare('SELECT * FROM rooms WHERE code = ? AND is_active = 1').get(cleanCode);
  let roomId;

  const tx = db.transaction(() => {
    if (!room) {
      // Create new Room
      roomId = 'room-duo-' + uuidv4().slice(0, 8);
      const roomName = `${invite.sender_username}'s Study Squad`;

      db.prepare(`
        INSERT INTO rooms (id, code, name, passcode_hash, created_by, is_active, created_at)
        VALUES (?, ?, ?, '', ?, 1, ?)
      `).run(roomId, cleanCode, roomName, invite.sender_id, now);

      // Add creator
      db.prepare(`
        INSERT OR IGNORE INTO room_members (id, room_id, user_id, role, joined_at, last_seen, current_subject, current_topic, is_studying, study_started_at)
        VALUES (?, ?, ?, 'creator', ?, ?, 'Cybersecurity', 'Level 1: Cyber World', 0, '')
      `).run('rm-' + uuidv4().slice(0, 8), roomId, invite.sender_id, now, now);

      room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(roomId);
    } else {
      roomId = room.id;
    }

    // Add joining user (if not already member)
    const existingMember = db.prepare('SELECT id FROM room_members WHERE room_id = ? AND user_id = ?').get(roomId, userId);
    if (!existingMember) {
      db.prepare(`
        INSERT INTO room_members (id, room_id, user_id, role, joined_at, last_seen, current_subject, current_topic, is_studying, study_started_at)
        VALUES (?, ?, ?, 'member', ?, ?, 'Linux', 'Level 1: Terminal Basics', 0, '')
      `).run('rm-' + uuidv4().slice(0, 8), roomId, userId, now, now);
    }
  });

  tx();

  const members = db.prepare(`
    SELECT u.id, u.username, u.email, u.avatar_url, u.bio, u.xp, u.level, u.streak
    FROM room_members rm
    JOIN users u ON rm.user_id = u.id
    WHERE rm.room_id = ?
  `).all(roomId);

  // Notify everyone in the room via Socket.IO
  const io = req.app.get('io');
  if (io) {
    io.to(roomId).emit('room:member_joined', {
      roomId,
      user: req.user
    });
    io.to(`user:${invite.sender_id}`).emit('duo:connected', {
      room,
      members
    });
    io.to(`user:${userId}`).emit('duo:connected', {
      room,
      members
    });
  }

  res.json({
    message: '🎉 Successfully joined the study room!',
    room,
    members,
    memberCount: members.length
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
