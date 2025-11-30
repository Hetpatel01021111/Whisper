// Vercel API endpoint - proxy to backend server
const express = require('express');
const cors = require('cors');
const { createServer } = require('http');
const { Server } = require('socket.io');

// Import all modules from backend
const authModule = require('../backend/auth');
const boardsModule = require('../backend/boards');
const chatModule = require('../backend/chat');
const directMessagesModule = require('../backend/directMessages');
const playersModule = require('../backend/players');

// Import key storage
const { SecureKeyStorage } = require('../backend/keyStorage');

const app = express();
const server = createServer(app);

// CORS configuration
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://session-messenger-hrl8c1d5b-het-patels-projects-70a38283.vercel.app'
  ],
  credentials: true
}));

app.use(express.json());

// Initialize secure key storage
const keyStorage = new SecureKeyStorage();

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'Session Messenger API'
  });
});

// Auth routes
app.post('/api/auth/register', authModule.register);
app.post('/api/auth/login', authModule.login);

// Board routes
app.get('/api/boards', boardsModule.getBoards);
app.post('/api/boards', boardsModule.createBoard);
app.get('/api/boards/:id/messages', boardsModule.getBoardMessages);
app.post('/api/boards/:id/messages', boardsModule.postMessage);

// Chat routes
app.get('/api/chat/conversations', chatModule.getConversations);
app.post('/api/chat/send', chatModule.sendMessage);

// Direct messages routes
app.get('/api/dm/conversations', directMessagesModule.getConversations);
app.post('/api/dm/send', directMessagesModule.sendMessage);

// Players routes
app.get('/api/players', playersModule.getPlayers);

// Key storage routes
app.post('/api/keys/store-public', async (req, res) => {
  try {
    const { userId, keyBundle } = req.body;
    await keyStorage.storePublicKeyBundle(userId, keyBundle);
    res.json({ success: true });
  } catch (error) {
    console.error('Store public key error:', error);
    res.status(500).json({ error: 'Failed to store public key' });
  }
});

app.get('/api/keys/public/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const keyBundle = await keyStorage.getPublicKeyBundle(userId);
    res.json(keyBundle);
  } catch (error) {
    console.error('Get public key error:', error);
    res.status(404).json({ error: 'Public key not found' });
  }
});

app.post('/api/keys/store-prekey', async (req, res) => {
  try {
    const { userId, preKeyBundle } = req.body;
    await keyStorage.storePreKeyBundle(userId, preKeyBundle);
    res.json({ success: true });
  } catch (error) {
    console.error('Store prekey error:', error);
    res.status(500).json({ error: 'Failed to store prekey bundle' });
  }
});

app.get('/api/keys/prekey/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const preKeyBundle = await keyStorage.getPreKeyBundle(userId);
    res.json(preKeyBundle);
  } catch (error) {
    console.error('Get prekey error:', error);
    res.status(404).json({ error: 'Prekey bundle not found' });
  }
});

app.get('/api/keys/users', async (req, res) => {
  try {
    const users = await keyStorage.listUsers();
    res.json({ users });
  } catch (error) {
    console.error('List users error:', error);
    res.status(500).json({ error: 'Failed to list users' });
  }
});

// Socket.IO setup for real-time features
const io = new Server(server, {
  cors: {
    origin: [
      'http://localhost:5173',
      'http://localhost:3000',
      'https://session-messenger-hrl8c1d5b-het-patels-projects-70a38283.vercel.app'
    ],
    methods: ['GET', 'POST']
  }
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  // Handle different socket events
  chatModule.handleSocket(socket, io);
  directMessagesModule.handleSocket(socket, io);
  
  // File Transfer Events - Relay between users
  socket.on('file-transfer-request', (data) => {
    console.log('📁 Relaying file transfer request to:', data.targetId);
    io.to(`user:${data.targetId}`).emit('file-transfer-request', data);
  });
  
  socket.on('file-transfer-response', (data) => {
    console.log('📁 Relaying file transfer response to:', data.targetId);
    io.to(`user:${data.targetId}`).emit('file-transfer-response', data);
  });
  
  socket.on('file-chunk', (data) => {
    // Relay file chunks directly to target user (no logging to avoid spam)
    io.to(`user:${data.targetId}`).emit('file-chunk', data);
  });
  
  socket.on('file-chunk-ack', (data) => {
    io.to(`user:${data.targetId}`).emit('file-chunk-ack', data);
  });
  
  socket.on('file-transfer-complete', (data) => {
    console.log('📁 Relaying file transfer complete to:', data.targetId);
    io.to(`user:${data.targetId}`).emit('file-transfer-complete', data);
  });
  
  socket.on('file-transfer-cancel', (data) => {
    console.log('📁 Relaying file transfer cancel to:', data.targetId);
    io.to(`user:${data.targetId}`).emit('file-transfer-cancel', data);
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Export for Vercel
module.exports = app;
