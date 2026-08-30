const { isRoomMember } = require('../utils/roomAuth');

function setupQuizHandler(io, socket) {
  socket.on('quiz:challenge_friend', ({ roomId, levelId, levelTitle }) => {
    if (!roomId) return;
    if (!isRoomMember(roomId, socket.user.id)) return;
    io.to(roomId).emit('quiz:challenge_received', {
      challengerId: socket.user.id,
      challengerName: socket.user.username,
      levelId,
      levelTitle
    });
  });

  socket.on('quiz:answer_lock', ({ roomId, questionId, selectedIndex }) => {
    if (!roomId) return;
    if (!isRoomMember(roomId, socket.user.id)) return;
    // Tell partner that opponent locked their answer without revealing option
    socket.to(roomId).emit('quiz:opponent_locked', {
      userId: socket.user.id,
      username: socket.user.username,
      questionId
    });
  });
}

module.exports = { setupQuizHandler };
