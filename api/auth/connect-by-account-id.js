// Connect by Account ID endpoint for Vercel

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
    const { accountId } = req.body;
    
    if (!accountId || accountId.length < 4) {
      return res.status(400).json({ error: 'Valid account ID is required' });
    }
    
    // Simulate connection (in production, look up the account ID)
    const connectedUser = {
      id: 'user_' + accountId.toLowerCase(),
      displayName: 'User_' + accountId.substring(0, 2).toUpperCase()
    };
    
    res.status(200).json({
      connectedUser,
      connectedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Connect by account ID error:', error);
    res.status(500).json({ error: 'Failed to connect' });
  }
};
