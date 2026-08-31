const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../db');
const { requireAuth } = require('../middleware/auth');
const { isUserOnline, getUserLastSeen } = require('../sockets/presenceHandler');

const router = express.Router();

// Get Current Active Study Room & Squad Members
router.get('/current', requireAuth, (req, res) => {
  const userId = req.user.id;
  const now = new Date().toISOString();

  // 1. Find user's active room from room_members & rooms
  let memberRecord = db.prepare(`
    SELECT rm.room_id, r.code as room_code, r.name as room_name, r.is_active as room_active, r.created_at
    FROM room_members rm
    JOIN rooms r ON rm.room_id = r.id
    WHERE rm.user_id = ? AND r.is_active = 1
    ORDER BY rm.joined_at DESC
    LIMIT 1
  `).get(userId);

  if (!memberRecord) {
    return res.json({
      hasPartner: false,
      hasRoom: false,
      room: null,
      partner: null,
      members: [],
      memberCount: 0,
      goals: []
    });
  }

  const roomId = memberRecord.room_id;

  // Fetch all members in this room squad
  const rawMembers = db.prepare(`
    SELECT u.id, u.username, u.email, u.phone_number, u.avatar_url, u.bio, u.xp, u.level, u.streak,
           rm.role, rm.current_subject, rm.current_topic, rm.is_studying, rm.last_seen, rm.joined_at
    FROM room_members rm
    JOIN users u ON rm.user_id = u.id
    WHERE rm.room_id = ?
    ORDER BY rm.joined_at ASC
  `).all(roomId);

  const members = rawMembers.map(m => ({
    ...m,
    is_online: isUserOnline(m.id),
    last_seen: isUserOnline(m.id) ? 'now' : (getUserLastSeen(m.id) || m.last_seen)
  }));

  const otherMembers = members.filter(m => m.id !== userId);
  const primaryPartner = otherMembers.length > 0 ? otherMembers[0] : null;

  const goals = db.prepare(`
    SELECT * FROM goals WHERE room_id = ? ORDER BY created_at ASC
  `).all(roomId);

  return res.json({
    hasPartner: members.length > 1,
    hasRoom: true,
    room: {
      id: roomId,
      code: memberRecord.room_code,
      name: memberRecord.room_name
    },
    partner: primaryPartner,
    members,
    memberCount: members.length,
    goals
  });
});

// Explicitly Create a New 1v1 Room (Option: "Create Room")
router.post('/create-room', requireAuth, (req, res) => {
  const userId = req.user.id;
  const now = new Date().toISOString();

  // Clear any existing solo rooms for this user first
  db.prepare(`
    DELETE FROM room_members 
    WHERE user_id = ? AND room_id IN (
      SELECT r.id FROM rooms r 
      WHERE (SELECT COUNT(*) FROM room_members rm2 WHERE rm2.room_id = r.id) <= 1
    )
  `).run(userId);

  const roomId = 'room-duo-' + uuidv4().slice(0, 8);
  let code = `DUO-${Math.floor(100 + Math.random() * 900)}`;

  let attempts = 0;
  while (attempts < 15) {
    const clash = db.prepare('SELECT id FROM rooms WHERE code = ?').get(code);
    if (!clash) break;
    code = `DUO-${Math.floor(100 + Math.random() * 900)}`;
    attempts++;
  }

  db.prepare(`
    INSERT OR REPLACE INTO rooms (id, code, name, passcode_hash, created_by, is_active, created_at)
    VALUES (?, ?, ?, '', ?, 1, ?)
  `).run(roomId, code, `${req.user.username}'s Duo Room`, userId, now);

  db.prepare(`
    INSERT OR IGNORE INTO room_members (id, room_id, user_id, role, joined_at, last_seen, current_subject, current_topic, is_studying, study_started_at)
    VALUES (?, ?, ?, 'creator', ?, ?, 'General', 'Duo Chat', 0, '')
  `).run('rm-' + uuidv4().slice(0, 8), roomId, userId, now, now);

  res.json({
    success: true,
    room: {
      id: roomId,
      code,
      name: `${req.user.username}'s Duo Room`
    }
  });
});

// Explicitly Join Room via Code (Option: "Join Room")
router.post('/join-room', requireAuth, (req, res) => {
  const { code } = req.body;
  const userId = req.user.id;

  if (!code) {
    return res.status(400).json({ error: 'Please enter a room code.' });
  }

  try {
    const rawClean = String(code).trim().toUpperCase();
    const digitsOnly = rawClean.replace(/[^0-9]/g, '');
    const fullDuoCode = digitsOnly ? `DUO-${digitsOnly}` : rawClean;
    const now = new Date().toISOString();

    // 1. Look for existing room matching any formatting variation or custom name
    let room = db.prepare(`
      SELECT * FROM rooms 
      WHERE code = ? OR code = ? OR code = ? OR code LIKE ?
      LIMIT 1
    `).get(fullDuoCode, digitsOnly, rawClean, `%${digitsOnly || rawClean}%`);

    let roomId;
    let hostId;

    if (room) {
      roomId = room.id;
      hostId = room.created_by;
      db.prepare('UPDATE rooms SET is_active = 1 WHERE id = ?').run(roomId);
    } else {
      // 2. If room doesn't exist yet, auto-create it with this code/name
      roomId = 'room-duo-' + uuidv4().slice(0, 8);
      hostId = userId;
      const roomCode = digitsOnly ? fullDuoCode : rawClean;
      const roomName = `${roomCode} Room`;

      db.prepare(`
        INSERT OR REPLACE INTO rooms (id, code, name, passcode_hash, created_by, is_active, created_at)
        VALUES (?, ?, ?, '', ?, 1, ?)
      `).run(roomId, roomCode, roomName, userId, now);

      room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(roomId);
    }

    // Clear user's other solo rooms
    try {
      db.prepare(`
        DELETE FROM room_members 
        WHERE user_id = ? AND room_id != ? AND room_id IN (
          SELECT r.id FROM rooms r 
          WHERE (SELECT COUNT(*) FROM room_members rm2 WHERE rm2.room_id = r.id) <= 1
        )
      `).run(userId, roomId);
    } catch (err) {}

    // Add current user to room
    db.prepare(`
      INSERT OR REPLACE INTO room_members (id, room_id, user_id, role, joined_at, last_seen, current_subject, current_topic, is_studying, study_started_at)
      VALUES (?, ?, ?, 'member', ?, ?, 'General', 'Duo Chat', 0, '')
    `).run('rm-' + uuidv4().slice(0, 8), roomId, userId, now, now);

    // Link permanent partnership
    if (hostId && hostId !== userId) {
      try {
        db.prepare(`
          INSERT OR REPLACE INTO duo_partnerships (id, user_a_id, user_b_id, room_id, status, created_at, updated_at)
          VALUES (?, ?, ?, ?, 'active', ?, ?)
        `).run('part-' + uuidv4().slice(0, 8), hostId, userId, roomId, now, now);
      } catch (err) {}
    }

    // Get all members
    const members = db.prepare(`
      SELECT u.id, u.username, u.email, u.avatar_url, u.bio, u.xp, u.level, u.streak
      FROM room_members rm
      JOIN users u ON rm.user_id = u.id
      WHERE rm.room_id = ?
    `).all(roomId);

    // Broadcast live event on WebSocket
    const io = req.app.get('io');
    if (io) {
      io.to(roomId).emit('room:member_joined', { roomId, user: req.user });
      io.emit('duo:connected', { roomId, partner: req.user });
    }

    return res.json({
      success: true,
      message: 'Connected to Duo Room successfully!',
      room,
      members
    });
  } catch (err) {
    console.error('[Join Room] Error:', err);
    return res.status(500).json({ error: 'Failed to join room. Please check code and try again.' });
  }
});

// Leave / Reset Room
router.post('/remove', requireAuth, (req, res) => {
  const userId = req.user.id;

  const memberRecord = db.prepare(`
    SELECT rm.room_id
    FROM room_members rm
    JOIN rooms r ON rm.room_id = r.id
    WHERE rm.user_id = ? AND r.is_active = 1
    LIMIT 1
  `).get(userId);

  if (!memberRecord) {
    return res.json({ message: 'No active room' });
  }

  const roomId = memberRecord.room_id;

  // Remove user from room members
  db.prepare('DELETE FROM room_members WHERE room_id = ? AND user_id = ?').run(roomId, userId);

  // Check remaining members
  const remaining = db.prepare('SELECT COUNT(*) as count FROM room_members WHERE room_id = ?').get(roomId).count;
  if (remaining <= 1) {
    db.prepare('UPDATE rooms SET is_active = 0 WHERE id = ?').run(roomId);
  }

  const io = req.app.get('io');
  if (io) {
    io.to(roomId).emit('duo:partner_removed');
  }

  res.json({ message: 'Disconnected from room successfully' });
});

module.exports = router;
