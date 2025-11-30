// Create account endpoint for Vercel
const crypto = require('crypto');

// In-memory storage (for demo - use database in production)
const users = new Map();
const sessions = new Map();

// Generate 32-character access key
const generateAccessKey = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

module.exports = (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { displayName } = req.body;
    
    if (!displayName || !displayName.trim()) {
      return res.status(400).json({ error: 'Display name is required' });
    }
    
    // Generate user data
    const accessKey = generateAccessKey();
    const userId = 'user_' + crypto.randomBytes(8).toString('hex');
    const sessionToken = 'session_' + crypto.randomBytes(16).toString('hex');
    
    const user = {
      id: userId,
      displayName: displayName.trim(),
      createdAt: new Date().toISOString()
    };
    
    // Store user and session (in-memory for demo)
    users.set(accessKey, user);
    sessions.set(sessionToken, { userId, accessKey });
    
    res.status(200).json({
      accessKey,
      user,
      sessionToken
    });
  } catch (error) {
    console.error('Create account error:', error);
    res.status(500).json({ error: 'Failed to create account' });
  }
};
