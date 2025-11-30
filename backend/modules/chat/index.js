const express = require('express');
const { nanoid } = require('nanoid');
const db = require('../../config/db');
const { requireAuth } = require('../auth');

const router = express.Router();

// Create channel
router.post('/channels', requireAuth, (req, res) => {
  const { name, description } = req.body;
  
  const channelId = nanoid();
  const channel = {
    id: channelId,
    name,
    description,
    creatorId: req.user.id,
    createdAt: new Date().toISOString()
  };
  
  db.channels.set(channelId, channel);
  res.json({ channel });
});

// List channels
router.get('/channels', (req, res) => {
  const channels = Array.from(db.channels.values());
  res.json({ channels });
});

// Get channel messages
router.get('/channels/:channelId/messages', (req, res) => {
  const { channelId } = req.params;
  const limit = parseInt(req.query.limit) || 50;
  
  const messages = Array.from(db.messages.values())
    .filter(m => m.channelId === channelId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, limit)
    .reverse();
  
  res.json({ messages });
});

// WebSocket handling
function handleSocket(socket, io) {
  socket.on('join-channel', (channelId) => {
    socket.join(`channel:${channelId}`);
  });
  
  socket.on('leave-channel', (channelId) => {
    socket.leave(`channel:${channelId}`);
  });
  
  socket.on('send-message', (data) => {
    const { channelId, content, userId, userName } = data;
    
    const messageId = nanoid();
    const message = {
      id: messageId,
      channelId,
      content,
      authorId: userId,
      authorName: userName,
      createdAt: new Date().toISOString()
    };
    
    db.messages.set(messageId, message);
    
    io.to(`channel:${channelId}`).emit('new-message', message);
  });
}

module.exports = {
  router,
  handleSocket
};
