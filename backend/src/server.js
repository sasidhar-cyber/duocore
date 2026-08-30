const http = require('http');
const express = require('express');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

const { initDb } = require('./db');
const { initSockets } = require('./sockets');
const { apiLimiter } = require('./middleware/rateLimiter');
const { errorHandler } = require('./middleware/errorHandler');

// Route imports
const authRoutes = require('./routes/auth');
const partnerRoutes = require('./routes/partners');
const inviteRoutes = require('./routes/invites');
const roomsRoutes = require('./routes/rooms');
const cyberRoutes = require('./routes/cyber');
const linuxRoutes = require('./routes/linux');
const quizzesRoutes = require('./routes/quizzes');
const revisionRoutes = require('./routes/revision');
const communityRoutes = require('./routes/community');
const musicRoutes = require('./routes/music');

// Initialize database schema and seeds
initDb();

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || '*';

// Socket.IO Server Configuration
const io = new Server(server, {
  cors: {
    origin: CLIENT_ORIGIN,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
    credentials: true
  },
  pingTimeout: 30000,
  pingInterval: 10000
});

// Attach io instance to app
app.set('io', io);

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: false
}));
app.use(cors({
  origin: CLIENT_ORIGIN,
  credentials: true
}));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Static uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  let dbOk = true;
  try {
    require('./db').db.prepare('SELECT 1 as ok').get();
  } catch {
    dbOk = false;
  }
  res.json({
    status: dbOk ? 'healthy' : 'degraded',
    service: 'DUOCORE Backend Server',
    tagline: 'Learn. Practice. Challenge. Together.',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: dbOk ? 'ok' : 'error'
  });
});

// Apply rate limiter to API routes
app.use('/api', apiLimiter);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/partners', partnerRoutes);
app.use('/api/invites', inviteRoutes);
app.use('/api/rooms', roomsRoutes);
app.use('/api/cyber', cyberRoutes);
app.use('/api/linux', linuxRoutes);
app.use('/api/quizzes', quizzesRoutes);
app.use('/api/revision', revisionRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/music', musicRoutes);

// Socket.IO Handlers
initSockets(io);

// Serve built frontend assets in production
const frontendDist = path.join(__dirname, '../../frontend/dist');
const altFrontendDist = path.join(__dirname, '../../../frontend/dist');
const activeDist = fs.existsSync(frontendDist) ? frontendDist : (fs.existsSync(altFrontendDist) ? altFrontendDist : null);

if (activeDist) {
  app.use(express.static(activeDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads') || req.path.startsWith('/socket.io')) {
      return next();
    }
    res.sendFile(path.join(activeDist, 'index.html'));
  });
}

// Centralized error handler
app.use(errorHandler);

// Catch unhandled 404s
app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`
  ╔════════════════════════════════════════════════════════════════════╗
  ║                      DUOCORE BACKEND SERVER                        ║
  ║         "Learn. Practice. Challenge. Together."                    ║
  ╠════════════════════════════════════════════════════════════════════╣
  ║  📡 HTTP Server running on: http://localhost:${PORT}                 ║
  ║  ⚡ Socket.IO listening on: ws://localhost:${PORT}                   ║
  ║  🛡️ Health Check:          http://localhost:${PORT}/api/health        ║
  ╚════════════════════════════════════════════════════════════════════╝
  `);
});

module.exports = { app, server };
