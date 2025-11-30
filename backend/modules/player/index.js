const express = require('express');
const { nanoid } = require('nanoid');
const db = require('../../config/db');
const { requireAuth } = require('../auth');

const router = express.Router();

// Create player room
router.post('/rooms', requireAuth, (req, res) => {
  const { name, description } = req.body;
  
  const roomId = nanoid();
  const room = {
    id: roomId,
    name,
    description,
    creatorId: req.user.id,
    currentTrack: null,
    isPlaying: false,
    createdAt: new Date().toISOString()
  };
  
  db.playerRooms.set(roomId, room);
  res.json({ room });
});

// List rooms
router.get('/rooms', (req, res) => {
  const rooms = Array.from(db.playerRooms.values());
  res.json({ rooms });
});

// Get room
router.get('/rooms/:roomId', (req, res) => {
  const room = db.playerRooms.get(req.params.roomId);
  
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  
  res.json({ room });
});

// WebSocket handling
function handleSocket(socket, io) {
  socket.on('join-player-room', (roomId) => {
    socket.join(`player:${roomId}`);
  });
  
  socket.on('leave-player-room', (roomId) => {
    socket.leave(`player:${roomId}`);
  });
  
  socket.on('player-control', (data) => {
    const { roomId, action, track } = data;
    const room = db.playerRooms.get(roomId);
    
    if (!room) return;
    
    if (action === 'play') {
      room.isPlaying = true;
      if (track) room.currentTrack = track;
    } else if (action === 'pause') {
      room.isPlaying = false;
    } else if (action === 'stop') {
      room.isPlaying = false;
      room.currentTrack = null;
    }
    
    io.to(`player:${roomId}`).emit('player-state', {
      currentTrack: room.currentTrack,
      isPlaying: room.isPlaying
    });
  });
}

module.exports = {
  router,
  handleSocket
};
