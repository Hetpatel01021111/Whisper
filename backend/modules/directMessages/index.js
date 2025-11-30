const express = require('express');
const { nanoid } = require('nanoid');
const db = require('../../config/db');
const { requireAuth } = require('../auth');

const router = express.Router();

// Send direct message
router.post('/send', requireAuth, (req, res) => {
  const { recipientId, content } = req.body;
  
  if (!recipientId || !content) {
    return res.status(400).json({ error: 'Recipient and content are required' });
  }
  
  // Check if users are connected
  const isConnected = Array.from(db.connections.values()).some(conn => 
    (conn.user1Id === req.user.id && conn.user2Id === recipientId) ||
    (conn.user2Id === req.user.id && conn.user1Id === recipientId)
  );
  
  if (!isConnected) {
    return res.status(403).json({ error: 'You must be connected to send messages' });
  }
  
  const messageId = nanoid();
  const message = {
    id: messageId,
    senderId: req.user.id,
    senderName: req.user.displayName,
    recipientId,
    content,
    timestamp: new Date().toISOString()
  };
  
  if (!db.directMessages) {
    db.directMessages = new Map();
  }
  
  db.directMessages.set(messageId, message);
  
  res.json({ message });
});

// Get conversation messages
router.get('/conversation/:userId', requireAuth, (req, res) => {
  const { userId } = req.params;
  const limit = parseInt(req.query.limit) || 100;
  
  if (!db.directMessages) {
    db.directMessages = new Map();
  }
  
  const messages = Array.from(db.directMessages.values())
    .filter(msg => 
      (msg.senderId === req.user.id && msg.recipientId === userId) ||
      (msg.senderId === userId && msg.recipientId === req.user.id)
    )
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
    .slice(-limit);
  
  res.json({ messages });
});

// WebSocket handling for direct messages
function handleSocket(socket, io) {
  // User joins their personal room
  socket.on('join-user-room', (userId) => {
    socket.join(`user:${userId}`);
    console.log(`User ${userId} joined their room`);
  });
  
  // Send direct message via socket
  socket.on('send-dm', (data) => {
    const { senderId, senderName, recipientId, content } = data;
    
    const messageId = nanoid();
    const message = {
      id: messageId,
      senderId,
      senderName,
      recipientId,
      content,
      timestamp: new Date().toISOString()
    };
    
    if (!db.directMessages) {
      db.directMessages = new Map();
    }
    
    db.directMessages.set(messageId, message);
    
    // Send to recipient
    io.to(`user:${recipientId}`).emit('new-dm', message);
    
    // Confirm to sender
    socket.emit('dm-sent', message);
  });
}

module.exports = {
  router,
  handleSocket
};
