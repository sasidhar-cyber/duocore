const { awardXP } = require('../services/xpEngine');
const { isRoomMember } = require('../utils/roomAuth');

const roomTimers = {};

function setupTimerHandler(io, socket) {
  socket.on('timer:start', ({ roomId, mode, durationSeconds, subject, topic }) => {
    if (!roomId) return;
    if (!isRoomMember(roomId, socket.user.id)) return;
    const now = Date.now();
    const endsAt = now + (durationSeconds || 25 * 60) * 1000;

    roomTimers[roomId] = {
      mode: mode || 'study',
      durationSeconds: durationSeconds || 25 * 60,
      startedAt: now,
      endsAt,
      isRunning: true,
      subject: subject || 'Cybersecurity',
      topic: topic || 'Level 1: Foundations'
    };

    io.to(roomId).emit('timer:state_sync', roomTimers[roomId]);
  });

  socket.on('timer:pause', ({ roomId }) => {
    if (!roomId || !roomTimers[roomId]) return;
    if (!isRoomMember(roomId, socket.user.id)) return;
    const timer = roomTimers[roomId];
    const remainingMs = Math.max(0, timer.endsAt - Date.now());

    timer.isRunning = false;
    timer.remainingSeconds = Math.floor(remainingMs / 1000);

    io.to(roomId).emit('timer:state_sync', timer);
  });

  socket.on('timer:reset', ({ roomId, mode, durationSeconds }) => {
    if (!roomId) return;
    if (!isRoomMember(roomId, socket.user.id)) return;
    roomTimers[roomId] = {
      mode: mode || 'study',
      durationSeconds: durationSeconds || 25 * 60,
      remainingSeconds: durationSeconds || 25 * 60,
      isRunning: false
    };
    io.to(roomId).emit('timer:state_sync', roomTimers[roomId]);
  });

  socket.on('timer:completed', ({ roomId }) => {
    if (!roomId) return;
    awardXP(socket.user.id, 50, 'Completed Focus Study Session');
    io.to(roomId).emit('timer:session_finished', {
      userId: socket.user.id,
      username: socket.user.username
    });
  });
}

module.exports = { setupTimerHandler };
