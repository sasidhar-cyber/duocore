const { db } = require('../db');

function isRoomMember(roomId, userId) {
  if (!roomId || !userId) return false;
  const row = db.prepare(
    'SELECT id FROM room_members WHERE room_id = ? AND user_id = ?'
  ).get(roomId, userId);
  return !!row;
}

function assertRoomMember(roomId, userId) {
  return isRoomMember(roomId, userId);
}

module.exports = { isRoomMember, assertRoomMember };
