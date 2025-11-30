// Generate Account ID endpoint for Vercel
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
    // Generate a 6-character account ID
    const accountId = crypto.randomBytes(3).toString('hex').toUpperCase();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutes
    
    res.status(200).json({
      accountId,
      expiresAt
    });
  } catch (error) {
    console.error('Generate account ID error:', error);
    res.status(500).json({ error: 'Failed to generate account ID' });
  }
};
