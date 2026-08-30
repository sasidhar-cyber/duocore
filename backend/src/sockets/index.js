const { verifyToken } = require('../middleware/auth');
const { db } = require('../db');
const { setupChatHandler } = require('./chatHandler');
const { setupPresenceHandler } = require('./presenceHandler');
const { setupTimerHandler } = require('./timerHandler');
const { setupQuizHandler } = require('./quizHandler');
const { setupVoiceHandler } = require('./voiceHandler');
const { setupCallHandler } = require('./callHandler');

function initSockets(io) {
  // Socket Authentication Middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
    if (!token) return next(new Error('Authentication error: Token missing'));

    const decoded = verifyToken(token);
    if (!decoded) return next(new Error('Authentication error: Invalid token'));

    const user = db.prepare('SELECT id, username, email, avatar_url FROM users WHERE id = ?').get(decoded.id);
    if (!user) return next(new Error('Authentication error: User not found'));

    socket.user = user;
    next();
  });

  io.on('connection', (socket) => {
    console.log(`[Socket] User connected: ${socket.user.username} (${socket.id})`);

    // Automatically join personal user room for direct user notifications
    socket.join(`user:${socket.user.id}`);

    // Setup modular socket handlers
    setupPresenceHandler(io, socket);
    setupChatHandler(io, socket);
    setupTimerHandler(io, socket);
    setupQuizHandler(io, socket);
    setupVoiceHandler(io, socket);
    setupCallHandler(io, socket);

    socket.on('disconnect', () => {
      console.log(`[Socket] User disconnected: ${socket.user.username} (${socket.id})`);
    });
  });
}

module.exports = { initSockets };
