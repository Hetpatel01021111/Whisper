// Get connections endpoint for Vercel

module.exports = (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    // Return empty connections for now (in production, fetch from database)
    res.status(200).json({
      connections: []
    });
  } catch (error) {
    console.error('Get connections error:', error);
    res.status(500).json({ error: 'Failed to get connections' });
  }
};
