// Login endpoint for Vercel
const crypto = require('crypto');

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
    const { accessKey } = req.body;
    
    if (!accessKey || accessKey.length !== 32) {
      return res.status(400).json({ error: 'Valid 32-character access key is required' });
    }
    
    // Generate session from access key
    // In production, you'd look up the user from database
    const userId = 'user_' + accessKey.substring(0, 8).toLowerCase();
    const sessionToken = 'session_' + crypto.randomBytes(16).toString('hex');
    
    const user = {
      id: userId,
      displayName: 'User_' + accessKey.substring(0, 4),
      createdAt: new Date().toISOString()
    };
    
    res.status(200).json({
      user,
      sessionToken
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
};
