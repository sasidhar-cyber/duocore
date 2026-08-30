const { isRoomMember } = require('../utils/roomAuth');

// In-memory tracking of active voice participants per room
const roomVoiceMembers = {}; // { roomId: { [socketId]: { userId, username, avatar_url, isMuted } } }

function setupVoiceHandler(io, socket) {
  // Join Voice Room
  socket.on('voice:join', ({ roomId }) => {
    if (!roomId || !isRoomMember(roomId, socket.user.id)) return;

    if (!roomVoiceMembers[roomId]) {
      roomVoiceMembers[roomId] = {};
    }

    const memberInfo = {
      socketId: socket.id,
      userId: socket.user.id,
      username: socket.user.username,
      avatar_url: socket.user.avatar_url,
      isMuted: false
    };

    // Notify existing voice members about the new user
    socket.to(`voice:${roomId}`).emit('voice:user_joined', memberInfo);

    // Join the voice socket room
    socket.join(`voice:${roomId}`);
    roomVoiceMembers[roomId][socket.id] = memberInfo;

    // Send the current list of voice participants to the joining user
    const currentMembers = Object.values(roomVoiceMembers[roomId]);
    socket.emit('voice:room_members', { members: currentMembers });
  });

  // Relay WebRTC Offer
  socket.on('voice:offer', ({ targetSocketId, offer }) => {
    io.to(targetSocketId).emit('voice:offer', {
      callerSocketId: socket.id,
      callerUserId: socket.user.id,
      callerUsername: socket.user.username,
      callerAvatar: socket.user.avatar_url,
      offer
    });
  });

  // Relay WebRTC Answer
  socket.on('voice:answer', ({ targetSocketId, answer }) => {
    io.to(targetSocketId).emit('voice:answer', {
      responderSocketId: socket.id,
      answer
    });
  });

  // Relay ICE Candidate
  socket.on('voice:ice_candidate', ({ targetSocketId, candidate }) => {
    io.to(targetSocketId).emit('voice:ice_candidate', {
      senderSocketId: socket.id,
      candidate
    });
  });

  // Mute / Unmute Broadcast
  socket.on('voice:mute_status', ({ roomId, isMuted }) => {
    if (!roomId || !roomVoiceMembers[roomId]?.[socket.id]) return;

    roomVoiceMembers[roomId][socket.id].isMuted = !!isMuted;
    io.to(`voice:${roomId}`).emit('voice:user_mute_changed', {
      socketId: socket.id,
      userId: socket.user.id,
      isMuted: !!isMuted
    });
  });

  // Speaking indicator (Audio Activity)
  socket.on('voice:speaking', ({ roomId, isSpeaking }) => {
    if (!roomId) return;
    socket.to(`voice:${roomId}`).emit('voice:user_speaking', {
      socketId: socket.id,
      userId: socket.user.id,
      isSpeaking: !!isSpeaking
    });
  });

  // Leave Voice Room
  const handleLeaveVoice = (roomId) => {
    if (!roomId && socket.rooms) {
      for (const r of socket.rooms) {
        if (r.startsWith('voice:')) {
          roomId = r.replace('voice:', '');
          break;
        }
      }
    }
    if (!roomId || !roomVoiceMembers[roomId]?.[socket.id]) return;

    delete roomVoiceMembers[roomId][socket.id];
    socket.leave(`voice:${roomId}`);

    io.to(`voice:${roomId}`).emit('voice:user_left', {
      socketId: socket.id,
      userId: socket.user.id,
      username: socket.user.username
    });
  };

  socket.on('voice:leave', ({ roomId }) => {
    handleLeaveVoice(roomId);
  });

  socket.on('disconnect', () => {
    for (const roomId in roomVoiceMembers) {
      if (roomVoiceMembers[roomId][socket.id]) {
        handleLeaveVoice(roomId);
      }
    }
  });
}

module.exports = { setupVoiceHandler };
