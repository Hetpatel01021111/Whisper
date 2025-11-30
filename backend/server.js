const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const { nanoid } = require('nanoid');
const SecureKeyStorage = require('./keyStorage');

const authModule = require('./modules/auth');
const boardsModule = require('./modules/boards');
const chatModule = require('./modules/chat');
const widgetsModule = require('./modules/widgets');
const playerModule = require('./modules/player');
const agentsModule = require('./modules/agents');
const directMessagesModule = require('./modules/directMessages');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true
});

// Initialize secure key storage
const keyStorage = new SecureKeyStorage();

app.use(cors({
  origin: '*',
  credentials: true
}));
app.use(express.json());

// Mount module routes
app.use('/api/auth', authModule.router);
app.use('/api/boards', boardsModule.router);
app.use('/api/chat', chatModule.router);
app.use('/api/widgets', widgetsModule.router);
app.use('/api/player', playerModule.router);
app.use('/api/agents', agentsModule.router);
app.use('/api/dm', directMessagesModule.router);

// Secure Key Storage API Routes
app.post('/api/keys/store-public', async (req, res) => {
  try {
    const { userId, keyBundle } = req.body;
    if (!userId || !keyBundle) {
      return res.status(400).json({ error: 'Missing userId or keyBundle' });
    }
    
    const success = await keyStorage.storePublicKeyBundle(userId, keyBundle);
    if (success) {
      res.json({ success: true });
    } else {
      res.status(500).json({ error: 'Failed to store key bundle' });
    }
  } catch (error) {
    console.error('Store public key error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/keys/public/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const keyBundle = await keyStorage.getPublicKeyBundle(userId);
    
    if (keyBundle) {
      res.json(keyBundle);
    } else {
      res.status(404).json({ error: 'Key bundle not found' });
    }
  } catch (error) {
    console.error('Get public key error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/keys/store-prekeys', async (req, res) => {
  try {
    const { userId, preKeyBundle } = req.body;
    if (!userId || !preKeyBundle) {
      return res.status(400).json({ error: 'Missing userId or preKeyBundle' });
    }
    
    const success = await keyStorage.storePreKeyBundle(userId, preKeyBundle);
    if (success) {
      res.json({ success: true });
    } else {
      res.status(500).json({ error: 'Failed to store prekey bundle' });
    }
  } catch (error) {
    console.error('Store prekeys error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/keys/prekeys/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const preKeyBundle = await keyStorage.getPreKeyBundle(userId);
    
    if (preKeyBundle) {
      res.json(preKeyBundle);
    } else {
      res.status(404).json({ error: 'Prekey bundle not found' });
    }
  } catch (error) {
    console.error('Get prekeys error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/keys/users', async (req, res) => {
  try {
    const users = await keyStorage.listUsers();
    res.json({ users });
  } catch (error) {
    console.error('List users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// WebSocket handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  // Log ALL events for debugging (skip spam events)
  socket.onAny((eventName, ...args) => {
    if (!eventName.includes('chunk') && !eventName.includes('ice-candidate')) {
      console.log(`📨 Event received: ${eventName}`, args[0]?.senderId || args[0]?.targetId || '');
    }
  });
  
  // Test event handler
  socket.on('test-event', (data) => {
    console.log('🧪 Test event received:', data, 'from socket:', socket.id);
  });
  
  chatModule.handleSocket(socket, io);
  playerModule.handleSocket(socket, io);
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

  // ===== TYPING INDICATORS =====
  socket.on('typing-start', (data) => {
    console.log('⌨️ Typing start from:', data.senderId, 'to:', data.targetId);
    io.to(`user:${data.targetId}`).emit('typing-start', data);
  });

  socket.on('typing-stop', (data) => {
    console.log('⌨️ Typing stop from:', data.senderId, 'to:', data.targetId);
    io.to(`user:${data.targetId}`).emit('typing-stop', data);
  });

  // ===== MESSAGE FEATURES =====
  socket.on('message-reaction', (data) => {
    console.log('❤️ Reaction from:', data.senderId, 'to:', data.targetId, 'emoji:', data.emoji);
    io.to(`user:${data.targetId}`).emit('message-reaction', data);
  });

  socket.on('message-edit', (data) => {
    console.log('✏️ Edit from:', data.senderId, 'to:', data.targetId);
    io.to(`user:${data.targetId}`).emit('message-edit', data);
  });

  socket.on('message-delete', (data) => {
    console.log('🗑️ Delete from:', data.senderId, 'to:', data.targetId);
    io.to(`user:${data.targetId}`).emit('message-delete', data);
  });

  socket.on('read-receipt', (data) => {
    io.to(`user:${data.targetId}`).emit('read-receipt', data);
  });

  socket.on('delivery-receipt', (data) => {
    io.to(`user:${data.targetId}`).emit('delivery-receipt', data);
  });

  // ===== VOICE/VIDEO CALLS =====
  socket.on('call-offer', (data) => {
    console.log('📞 Call offer to:', data.targetId);
    io.to(`user:${data.targetId}`).emit('call-offer', data);
  });

  socket.on('call-answer', (data) => {
    console.log('📞 Call answer to:', data.targetId);
    io.to(`user:${data.targetId}`).emit('call-answer', data);
  });

  socket.on('call-ice-candidate', (data) => {
    io.to(`user:${data.targetId}`).emit('call-ice-candidate', data);
  });

  socket.on('call-end', (data) => {
    console.log('📞 Call ended:', data.callId);
    io.to(`user:${data.targetId}`).emit('call-end', data);
  });

  socket.on('call-busy', (data) => {
    io.to(`user:${data.targetId}`).emit('call-busy', data);
  });

  // ===== GROUP CHAT =====
  socket.on('group-created', (data) => {
    io.to(`user:${data.targetId}`).emit('group-created', data);
  });

  socket.on('group-updated', (data) => {
    io.to(`user:${data.targetId}`).emit('group-updated', data);
  });

  socket.on('group-member-added', (data) => {
    io.to(`user:${data.targetId}`).emit('group-member-added', data);
  });

  socket.on('group-member-removed', (data) => {
    io.to(`user:${data.targetId}`).emit('group-member-removed', data);
  });

  socket.on('group-message', (data) => {
    io.to(`user:${data.targetId}`).emit('group-message', data);
  });

  socket.on('group-deleted', (data) => {
    io.to(`user:${data.targetId}`).emit('group-deleted', data);
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;

// Always start the server for Railway
server.listen(PORT, () => {
  console.log(`🚀 Session backend running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Export for serverless platforms if needed
module.exports = app;
