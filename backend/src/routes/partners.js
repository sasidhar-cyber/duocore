const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../db');
const { requireAuth } = require('../middleware/auth');
const { isUserOnline, getUserLastSeen } = require('../sockets/presenceHandler');

const router = express.Router();

// Get Current Active Study Room & Squad Members (Auto-creates personal room if none exists)
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

  // 2. If no room yet, automatically create one so user goes straight into the chat
  if (!memberRecord) {
    const roomId = 'room-duo-' + uuidv4().slice(0, 8);
    let code = `DUO-${Math.floor(100 + Math.random() * 900)}`;

    let attempts = 0;
    while (attempts < 10) {
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

    memberRecord = {
      room_id: roomId,
      room_code: code,
      room_name: `${req.user.username}'s Duo Room`
    };
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
    return res.status(400).json({ error: 'No active room found to leave.' });
  }

  const roomId = memberRecord.room_id;

  // Remove user from room members
  db.prepare('DELETE FROM room_members WHERE room_id = ? AND user_id = ?').run(roomId, userId);

  // Check remaining members
  const remaining = db.prepare('SELECT COUNT(*) as count FROM room_members WHERE room_id = ?').get(roomId).count;
  if (remaining === 0) {
    db.prepare('UPDATE rooms SET is_active = 0 WHERE id = ?').run(roomId);
  }

  res.json({ message: 'Disconnected from room successfully' });
});

module.exports = router;
