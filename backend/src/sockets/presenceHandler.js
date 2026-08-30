const { db } = require('../db');
const { isRoomMember } = require('../utils/roomAuth');

const onlineUsers = new Map(); // userId -> { count: number, lastSeen: string, socketIds: Set, rooms: Set }

function isUserOnline(userId) {
  const entry = onlineUsers.get(userId);
  return !!(entry && entry.count > 0);
}

function getUserLastSeen(userId) {
  const entry = onlineUsers.get(userId);
  if (entry && entry.count > 0) return 'now';
  if (entry && entry.lastSeen) return entry.lastSeen;
  try {
    const user = db.prepare('SELECT last_active_date FROM users WHERE id = ?').get(userId);
    return user?.last_active_date || null;
  } catch (e) {
    return null;
  }
}

function handleUserConnected(io, socket) {
  const userId = socket.user.id;
  const now = new Date().toISOString();

  if (!onlineUsers.has(userId)) {
    onlineUsers.set(userId, {
      count: 1,
      lastSeen: now,
      socketIds: new Set([socket.id]),
      rooms: new Set()
    });
  } else {
    const entry = onlineUsers.get(userId);
    entry.count++;
    entry.socketIds.add(socket.id);
    entry.lastSeen = now;
  }

  try {
    db.prepare('UPDATE users SET last_active_date = ? WHERE id = ?').run(now, userId);
  } catch (err) {}

  try {
    const userRooms = db.prepare('SELECT room_id FROM room_members WHERE user_id = ?').all(userId);
    for (const r of userRooms) {
      onlineUsers.get(userId)?.rooms.add(r.room_id);
      io.to(r.room_id).emit('presence:user_status_change', {
        userId,
        username: socket.user.username,
        isOnline: true,
        lastSeen: now
      });
    }
  } catch (err) {}
}

function handleUserDisconnected(io, socket) {
  const userId = socket.user.id;
  const now = new Date().toISOString();

  if (onlineUsers.has(userId)) {
    const entry = onlineUsers.get(userId);
    entry.count = Math.max(0, entry.count - 1);
    entry.socketIds.delete(socket.id);

    if (entry.count === 0) {
      entry.lastSeen = now;
      onlineUsers.delete(userId);

      try {
        db.prepare('UPDATE users SET last_active_date = ? WHERE id = ?').run(now, userId);
        db.prepare('UPDATE room_members SET last_seen = ? WHERE user_id = ?').run(now, userId);
      } catch (err) {}

      try {
        const userRooms = db.prepare('SELECT room_id FROM room_members WHERE user_id = ?').all(userId);
        for (const r of userRooms) {
          io.to(r.room_id).emit('presence:user_status_change', {
            userId,
            username: socket.user.username,
            isOnline: false,
            lastSeen: now
          });
        }
      } catch (err) {}
    }
  }
}

function setupPresenceHandler(io, socket) {
  handleUserConnected(io, socket);

  socket.on('disconnect', () => {
    handleUserDisconnected(io, socket);
  });

  socket.on('room:join', ({ roomId }) => {
    if (!roomId) return;
    if (!isRoomMember(roomId, socket.user.id)) return;
    socket.join(roomId);
    const now = new Date().toISOString();

    if (onlineUsers.has(socket.user.id)) {
      onlineUsers.get(socket.user.id).rooms.add(roomId);
    }

    try {
      db.prepare('UPDATE room_members SET last_seen = ? WHERE room_id = ? AND user_id = ?').run(now, roomId, socket.user.id);
    } catch (err) {}

    io.to(roomId).emit('room:partner_joined', {
      userId: socket.user.id,
      username: socket.user.username,
      isOnline: true,
      timestamp: now
    });

    try {
      const members = db.prepare('SELECT user_id, last_seen FROM room_members WHERE room_id = ?').all(roomId);
      const statuses = members.map(m => ({
        userId: m.user_id,
        isOnline: isUserOnline(m.user_id),
        lastSeen: isUserOnline(m.user_id) ? 'now' : (getUserLastSeen(m.user_id) || m.last_seen)
      }));

      socket.emit('presence:room_statuses', { roomId, statuses });
    } catch (err) {}
  });

  socket.on('room:leave', ({ roomId }) => {
    if (!roomId) return;
    socket.leave(roomId);
    const now = new Date().toISOString();
    io.to(roomId).emit('room:partner_left', {
      userId: socket.user.id,
      username: socket.user.username,
      isOnline: false,
      lastSeen: now
    });
  });

  socket.on('presence:heartbeat', ({ roomId }) => {
    const now = new Date().toISOString();
    if (onlineUsers.has(socket.user.id)) {
      onlineUsers.get(socket.user.id).lastSeen = now;
    }
    if (roomId && isRoomMember(roomId, socket.user.id)) {
      try {
        db.prepare('UPDATE room_members SET last_seen = ? WHERE room_id = ? AND user_id = ?').run(now, roomId, socket.user.id);
      } catch (err) {}
    }
  });

  socket.on('presence:status_update', ({ roomId, subject, topic, isStudying }) => {
    if (!roomId) return;
    if (!isRoomMember(roomId, socket.user.id)) return;
    const now = new Date().toISOString();

    try {
      db.prepare(`
        UPDATE room_members
        SET current_subject = ?, current_topic = ?, is_studying = ?, last_seen = ?
        WHERE room_id = ? AND user_id = ?
      `).run(subject, topic, isStudying ? 1 : 0, now, roomId, socket.user.id);
    } catch (err) {}

    io.to(roomId).emit('presence:partner_status', {
      userId: socket.user.id,
      username: socket.user.username,
      subject,
      topic,
      isStudying: !!isStudying,
      isOnline: true,
      lastSeen: now
    });
  });
}

module.exports = {
  setupPresenceHandler,
  isUserOnline,
  getUserLastSeen
};
