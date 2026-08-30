const { db } = require('../db');
const { isRoomMember } = require('../utils/roomAuth');

function setupPresenceHandler(io, socket) {
  socket.on('room:join', ({ roomId }) => {
    if (!roomId) return;
    if (!isRoomMember(roomId, socket.user.id)) return;
    socket.join(roomId);
    const now = new Date().toISOString();

    db.prepare('UPDATE room_members SET last_seen = ? WHERE room_id = ? AND user_id = ?').run(now, roomId, socket.user.id);

    io.to(roomId).emit('room:partner_joined', {
      userId: socket.user.id,
      username: socket.user.username,
      timestamp: now
    });
  });

  socket.on('room:leave', ({ roomId }) => {
    if (!roomId) return;
    socket.leave(roomId);
    io.to(roomId).emit('room:partner_left', {
      userId: socket.user.id,
      username: socket.user.username
    });
  });

  socket.on('presence:status_update', ({ roomId, subject, topic, isStudying }) => {
    if (!roomId) return;
    if (!isRoomMember(roomId, socket.user.id)) return;
    const now = new Date().toISOString();

    db.prepare(`
      UPDATE room_members
      SET current_subject = ?, current_topic = ?, is_studying = ?, last_seen = ?
      WHERE room_id = ? AND user_id = ?
    `).run(subject, topic, isStudying ? 1 : 0, now, roomId, socket.user.id);

    io.to(roomId).emit('presence:partner_status', {
      userId: socket.user.id,
      username: socket.user.username,
      subject,
      topic,
      isStudying: !!isStudying,
      lastSeen: now
    });
  });
}

module.exports = { setupPresenceHandler };
