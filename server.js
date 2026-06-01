require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const path = require('path');
const { initDB } = require('./database');

const authRoutes = require('./routes/auth');
const chatRoutes = require('./routes/chat');
const adminRoutes = require('./routes/admin');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

// ─── Security Middleware ──────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json({ limit: '10kb' }));

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please slow down.' }
});
const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'Too many messages, please wait a moment.' }
});
app.use('/api/', apiLimiter);
app.use('/api/chat', chatLimiter);

// ─── Static Files ─────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));

// ─── Make io accessible in routes ────────────────────
app.set('io', io);

// ─── API Routes ───────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/admin', adminRoutes);

// ─── Socket.io ────────────────────────────────────────
const connectedUsers = new Map(); // userId → socketId

io.on('connection', (socket) => {
  socket.on('register', (userId) => {
    connectedUsers.set(String(userId), socket.id);
    socket.userId = String(userId);
    console.log(`📡 User ${userId} connected via Socket`);
  });

  socket.on('disconnect', () => {
    if (socket.userId) {
      connectedUsers.delete(socket.userId);
      console.log(`📡 User ${socket.userId} disconnected`);
    }
  });
});

// Helper to push real-time reply to a user
app.set('connectedUsers', connectedUsers);

// ─── SPA Fallback ─────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ─── Start ────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
initDB().then(() => {
  server.listen(PORT, () => {
    console.log(`\n🚀 KonnectAPI running  → http://localhost:${PORT}`);
    console.log(`🤖 HuggingFace AI     → ${process.env.HF_API_TOKEN ? '✅ ' + (process.env.HF_MODEL || 'Mistral-7B') : '⚠️  missing HF_API_TOKEN'}`);
    console.log(`📱 Twilio SMS          → ${process.env.TWILIO_ACCOUNT_SID ? '✅' : '⚠️  missing TWILIO creds'}`);
    console.log(`🔐 JWT Secret          → ${process.env.JWT_SECRET ? '✅' : '⚠️  using default (change in prod!)'}\n`);
  });
}).catch(err => { console.error('DB init failed:', err); process.exit(1); });
