const express = require('express');
const { nanoid } = require('nanoid');
const db = require('../../config/db');
const { generateAccessKey, hashAccessKey, generateSessionToken } = require('../../common/crypto');

const router = express.Router();

// Create account
router.post('/create', (req, res) => {
  const { displayName } = req.body;
  
  if (!displayName || displayName.trim().length === 0) {
    return res.status(400).json({ error: 'Display name is required' });
  }
  
  const userId = nanoid();
  const accessKey = generateAccessKey();
  const accessKeyHash = hashAccessKey(accessKey);
  
  const user = {
    id: userId,
    displayName: displayName.trim(),
    accessKeyHash,
    createdAt: new Date().toISOString()
  };
  
  db.users.set(userId, user);
  
  // Create initial session
  const sessionToken = generateSessionToken();
  db.sessions.set(sessionToken, {
    userId,
    createdAt: new Date().toISOString()
  });
  
  res.json({
    accessKey,
    sessionToken,
    user: {
      id: user.id,
      displayName: user.displayName,
      createdAt: user.createdAt
    }
  });
});

// Login with access key
router.post('/login', (req, res) => {
  const { accessKey } = req.body;
  
  if (!accessKey || accessKey.length !== 32) {
    return res.status(400).json({ error: 'Invalid access key format' });
  }
  
  const accessKeyHash = hashAccessKey(accessKey);
  
  // Find user by access key hash
  let foundUser = null;
  for (const user of db.users.values()) {
    if (user.accessKeyHash === accessKeyHash) {
      foundUser = user;
      break;
    }
  }
  
  if (!foundUser) {
    return res.status(401).json({ error: 'Invalid access key' });
  }
  
  // Create session
  const sessionToken = generateSessionToken();
  db.sessions.set(sessionToken, {
    userId: foundUser.id,
    createdAt: new Date().toISOString()
  });
  
  res.json({
    sessionToken,
    user: {
      id: foundUser.id,
      displayName: foundUser.displayName,
      createdAt: foundUser.createdAt
    }
  });
});

// Verify session middleware
function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'No session token' });
  }
  
  const session = db.sessions.get(token);
  if (!session) {
    return res.status(401).json({ error: 'Invalid session' });
  }
  
  const user = db.users.get(session.userId);
  if (!user) {
    return res.status(401).json({ error: 'User not found' });
  }
  
  req.user = user;
  req.sessionToken = token;
  next();
}

// Generate 5-minute Account ID
router.post('/generate-account-id', requireAuth, (req, res) => {
  const accountId = nanoid(10);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 5 * 60 * 1000);
  
  db.accountIds.set(accountId, {
    id: accountId,
    userId: req.user.id,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString()
  });
  
  res.json({
    accountId,
    expiresAt: expiresAt.toISOString()
  });
});

// Connect by Account ID
router.post('/connect-by-account-id', requireAuth, (req, res) => {
  const { accountId } = req.body;
  
  if (!accountId) {
    return res.status(400).json({ error: 'Account ID is required' });
  }
  
  const accountIdRecord = db.accountIds.get(accountId);
  
  if (!accountIdRecord) {
    return res.status(404).json({ error: 'Account ID not found' });
  }
  
  const now = new Date();
  const expiresAt = new Date(accountIdRecord.expiresAt);
  
  if (now > expiresAt) {
    return res.status(410).json({ error: 'Account ID has expired' });
  }
  
  const targetUserId = accountIdRecord.userId;
  
  if (targetUserId === req.user.id) {
    return res.status(400).json({ error: 'Cannot connect to yourself' });
  }
  
  // Create bidirectional connection
  const connectionId = nanoid();
  const connection = {
    id: connectionId,
    user1Id: req.user.id,
    user2Id: targetUserId,
    createdAt: now.toISOString()
  };
  
  db.connections.set(connectionId, connection);
  
  const targetUser = db.users.get(targetUserId);
  
  res.json({
    connection,
    connectedUser: {
      id: targetUser.id,
      displayName: targetUser.displayName
    }
  });
});

// Get my connections
router.get('/connections', requireAuth, (req, res) => {
  const connections = [];
  
  for (const conn of db.connections.values()) {
    if (conn.user1Id === req.user.id || conn.user2Id === req.user.id) {
      const otherUserId = conn.user1Id === req.user.id ? conn.user2Id : conn.user1Id;
      const otherUser = db.users.get(otherUserId);
      
      connections.push({
        id: conn.id,
        user: {
          id: otherUser.id,
          displayName: otherUser.displayName
        },
        createdAt: conn.createdAt
      });
    }
  }
  
  res.json({ connections });
});

module.exports = {
  router,
  requireAuth
};
