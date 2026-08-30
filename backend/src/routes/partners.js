const express = require('express');
const { db } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Get Current Active Study Room & Squad Members
router.get('/current', requireAuth, (req, res) => {
  const userId = req.user.id;

  // 1. Find user's active room from room_members & rooms
  const memberRecord = db.prepare(`
    SELECT rm.room_id, r.code as room_code, r.name as room_name, r.is_active as room_active, r.created_at
    FROM room_members rm
    JOIN rooms r ON rm.room_id = r.id
    WHERE rm.user_id = ? AND r.is_active = 1
    ORDER BY rm.joined_at DESC
    LIMIT 1
  `).get(userId);

  if (memberRecord) {
    const roomId = memberRecord.room_id;

    // Fetch all members in this room squad
    const members = db.prepare(`
      SELECT u.id, u.username, u.email, u.avatar_url, u.bio, u.xp, u.level, u.streak,
             rm.role, rm.current_subject, rm.current_topic, rm.is_studying, rm.last_seen, rm.joined_at
      FROM room_members rm
      JOIN users u ON rm.user_id = u.id
      WHERE rm.room_id = ?
      ORDER BY rm.joined_at ASC
    `).all(roomId);

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
  }

  // 2. If no active room, check for pending invite
  const now = new Date().toISOString();
  const pendingInvite = db.prepare(`
    SELECT id, code, expires_at, status, created_at
    FROM duo_invites
    WHERE sender_id = ? AND status = 'pending' AND expires_at > ?
    ORDER BY created_at DESC
    LIMIT 1
  `).get(userId, now);

  res.json({
    hasPartner: false,
    hasRoom: false,
    partner: null,
    members: [],
    memberCount: 0,
    room: null,
    goals: [],
    pendingInvite: pendingInvite || null
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

  // Notify clients via Socket.IO if available
  const io = req.app.get('io');
  if (io) {
    io.to(roomId).emit('duo:partner_removed', {
      roomId,
      removedBy: userId
    });
  }

  res.json({
    message: 'Left room successfully. You can now invite friends or join a new squad anytime.',
    roomId
  });
});

module.exports = router;
