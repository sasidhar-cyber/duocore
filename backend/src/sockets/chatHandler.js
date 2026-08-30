const { v4: uuidv4 } = require('uuid');
const { db } = require('../db');
const { awardXP } = require('../services/xpEngine');
const { isRoomMember } = require('../utils/roomAuth');

function setupChatHandler(io, socket) {
  // Send Message with multi-channel and unread notification dispatch
  socket.on('chat:send_message', async (data) => {
    const { roomId, text, type = 'text', channel = 'normal', metadata = {}, replyToId } = data;
    if (!roomId) return;
    if (!isRoomMember(roomId, socket.user.id)) {
      socket.emit('error', { message: 'Access denied. You are not a member of this room.' });
      return;
    }

    const cleanText = (text || '').trim();
    if (!cleanText && !metadata?.fileUrl && !metadata?.latitude) {
      return;
    }

    const messageId = 'msg-' + uuidv4().slice(0, 10);
    const now = new Date().toISOString();
    const targetChannel = channel || 'normal';

    db.prepare(`
      INSERT INTO messages (id, room_id, sender_id, text, type, channel_type, metadata, reply_to_id, is_read, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
    `).run(
      messageId,
      roomId,
      socket.user.id,
      cleanText,
      type || 'text',
      targetChannel,
      JSON.stringify(metadata || {}),
      replyToId || null,
      now
    );

    const savedMsg = {
      id: messageId,
      room_id: roomId,
      sender_id: socket.user.id,
      username: socket.user.username,
      avatar_url: socket.user.avatar_url,
      text: cleanText,
      type: type || 'text',
      channel_type: targetChannel,
      metadata: metadata || {},
      reply_to_id: replyToId || null,
      is_read: 0,
      created_at: now,
      reactions: {}
    };

    // Broadcast to room
    io.to(roomId).emit('chat:new_message', savedMsg);

    // If it's a DM, also target the recipient's personal room for guaranteed instant notification
    if (targetChannel.startsWith('dm:') || targetChannel.startsWith('private:')) {
      const parts = targetChannel.split(':');
      const recipientId = parts.find(id => id !== 'dm' && id !== 'private' && id !== socket.user.id);
      if (recipientId) {
        io.to(`user:${recipientId}`).emit('chat:new_message', savedMsg);
        io.to(`user:${recipientId}`).emit('chat:notification', {
          sender: socket.user,
          message: savedMsg,
          channel: targetChannel
        });
      }
    }

    awardXP(socket.user.id, 5, 'Chat message');
  });

  // Typing Indicator with instant dispatch
  socket.on('chat:typing', ({ roomId, channel = 'normal', isTyping }) => {
    if (!roomId) return;
    if (!isRoomMember(roomId, socket.user.id)) return;

    const payload = {
      userId: socket.user.id,
      username: socket.user.username,
      channel: channel || 'normal',
      isTyping: !!isTyping
    };

    socket.to(roomId).emit('chat:partner_typing', payload);

    if (channel.startsWith('dm:') || channel.startsWith('private:')) {
      const parts = channel.split(':');
      const recipientId = parts.find(id => id !== 'dm' && id !== 'private' && id !== socket.user.id);
      if (recipientId) {
        socket.to(`user:${recipientId}`).emit('chat:partner_typing', payload);
      }
    }
  });

  // Reaction Updates
  socket.on('chat:react', ({ roomId, messageId, emoji }) => {
    if (!roomId || !messageId || !emoji) return;
    if (!isRoomMember(roomId, socket.user.id)) return;

    const existing = db.prepare(
      'SELECT id FROM message_reactions WHERE message_id = ? AND user_id = ? AND emoji = ?'
    ).get(messageId, socket.user.id, emoji);

    if (existing) {
      db.prepare('DELETE FROM message_reactions WHERE id = ?').run(existing.id);
      io.to(roomId).emit('chat:reaction_updated', {
        messageId,
        userId: socket.user.id,
        emoji,
        action: 'removed'
      });
    } else {
      const reactionId = 'react-' + uuidv4().slice(0, 8);
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO message_reactions (id, message_id, user_id, emoji, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(reactionId, messageId, socket.user.id, emoji, now);

      io.to(roomId).emit('chat:reaction_updated', {
        messageId,
        userId: socket.user.id,
        emoji,
        action: 'added'
      });
    }
  });
}

module.exports = { setupChatHandler };
