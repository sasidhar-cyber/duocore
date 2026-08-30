// Multi-User WebRTC Audio & Video Call Handler with Incoming Call Ringing
const roomCallMembers = {}; // roomId -> Array<{ socketId, userId, username, avatar_url, isMuted, isVideoOff, isScreenSharing }>

function setupCallHandler(io, socket) {
  // 1. Initiate 1v1 or Squad Call -> Rings the target user(s)
  socket.on('call:start_call', ({ targetUserId, roomId, callType = 'video' }) => {
    if (!roomId) return;

    if (targetUserId) {
      // Ring specific user
      io.to(`user:${targetUserId}`).emit('call:incoming_ring', {
        caller: {
          id: socket.user.id,
          username: socket.user.username,
          avatar_url: socket.user.avatar_url,
          socketId: socket.id
        },
        roomId,
        callType
      });
      console.log(`[Call Ring] ${socket.user.username} is calling user ${targetUserId} (${callType})`);
    } else {
      // Ring all other room members
      socket.to(roomId).emit('call:incoming_ring', {
        caller: {
          id: socket.user.id,
          username: socket.user.username,
          avatar_url: socket.user.avatar_url,
          socketId: socket.id
        },
        roomId,
        callType
      });
    }
  });

  // 2. Reject / Decline Call
  socket.on('call:decline_call', ({ callerSocketId, targetUserId, roomId }) => {
    if (callerSocketId) {
      io.to(callerSocketId).emit('call:declined', {
        userId: socket.user.id,
        username: socket.user.username
      });
    } else if (targetUserId) {
      io.to(`user:${targetUserId}`).emit('call:declined', {
        userId: socket.user.id,
        username: socket.user.username
      });
    }
  });

  // 3. Join Call Channel (Audio / Video Mesh)
  socket.on('call:join', ({ roomId, isMuted = false, isVideoOff = false }) => {
    if (!roomId) return;
    if (!roomCallMembers[roomId]) {
      roomCallMembers[roomId] = [];
    }

    roomCallMembers[roomId] = roomCallMembers[roomId].filter(m => m.userId !== socket.user.id);

    const newMember = {
      socketId: socket.id,
      userId: socket.user.id,
      username: socket.user.username,
      avatar_url: socket.user.avatar_url,
      isMuted: !!isMuted,
      isVideoOff: !!isVideoOff,
      isScreenSharing: false
    };

    roomCallMembers[roomId].push(newMember);
    socket.join(`call:${roomId}`);

    const otherMembers = roomCallMembers[roomId].filter(m => m.socketId !== socket.id);
    socket.emit('call:existing_peers', { peers: otherMembers, members: roomCallMembers[roomId] });
    socket.to(`call:${roomId}`).emit('call:peer_joined', { member: newMember, members: roomCallMembers[roomId] });

    console.log(`[WebRTC Call] ${socket.user.username} joined call in ${roomId}. Active count: ${roomCallMembers[roomId].length}`);
  });

  // 4. WebRTC Signaling: Offer
  socket.on('call:offer', ({ toSocketId, offer, isVideoOff, isMuted }) => {
    io.to(toSocketId).emit('call:offer_received', {
      fromSocketId: socket.id,
      fromUser: socket.user,
      offer,
      isVideoOff,
      isMuted
    });
  });

  // 5. WebRTC Signaling: Answer
  socket.on('call:answer', ({ toSocketId, answer }) => {
    io.to(toSocketId).emit('call:answer_received', {
      fromSocketId: socket.id,
      answer
    });
  });

  // 6. WebRTC Signaling: ICE Candidate
  socket.on('call:ice_candidate', ({ toSocketId, candidate }) => {
    io.to(toSocketId).emit('call:ice_candidate_received', {
      fromSocketId: socket.id,
      candidate
    });
  });

  // 7. Toggle Video Camera
  socket.on('call:toggle_video', ({ roomId, isVideoOff }) => {
    if (!roomId || !roomCallMembers[roomId]) return;
    const member = roomCallMembers[roomId].find(m => m.socketId === socket.id);
    if (member) member.isVideoOff = isVideoOff;

    io.to(`call:${roomId}`).emit('call:member_state_change', {
      socketId: socket.id,
      userId: socket.user.id,
      isVideoOff
    });
  });

  // 8. Toggle Audio Mic
  socket.on('call:toggle_audio', ({ roomId, isMuted }) => {
    if (!roomId || !roomCallMembers[roomId]) return;
    const member = roomCallMembers[roomId].find(m => m.socketId === socket.id);
    if (member) member.isMuted = isMuted;

    io.to(`call:${roomId}`).emit('call:member_state_change', {
      socketId: socket.id,
      userId: socket.user.id,
      isMuted
    });
  });

  // 9. Toggle Screen Share
  socket.on('call:toggle_screen', ({ roomId, isScreenSharing }) => {
    if (!roomId || !roomCallMembers[roomId]) return;
    const member = roomCallMembers[roomId].find(m => m.socketId === socket.id);
    if (member) member.isScreenSharing = isScreenSharing;

    io.to(`call:${roomId}`).emit('call:member_state_change', {
      socketId: socket.id,
      userId: socket.user.id,
      isScreenSharing
    });
  });

  // 10. Leave Call
  socket.on('call:leave', ({ roomId }) => {
    if (!roomId) return;
    handleLeaveCall(roomId, socket);
  });

  socket.on('disconnect', () => {
    Object.keys(roomCallMembers).forEach(roomId => {
      handleLeaveCall(roomId, socket);
    });
  });
}

function handleLeaveCall(roomId, socket) {
  if (!roomCallMembers[roomId]) return;
  const wasInCall = roomCallMembers[roomId].some(m => m.socketId === socket.id);
  if (!wasInCall) return;

  roomCallMembers[roomId] = roomCallMembers[roomId].filter(m => m.socketId !== socket.id);
  socket.leave(`call:${roomId}`);

  socket.to(`call:${roomId}`).emit('call:peer_left', {
    socketId: socket.id,
    userId: socket.user?.id,
    members: roomCallMembers[roomId]
  });

  if (roomCallMembers[roomId].length === 0) {
    delete roomCallMembers[roomId];
  }
}

module.exports = { setupCallHandler };
