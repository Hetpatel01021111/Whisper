const express = require('express');
const { nanoid } = require('nanoid');
const db = require('../../config/db');
const { requireAuth } = require('../auth');

const router = express.Router();

// Create agent hook
router.post('/', requireAuth, (req, res) => {
  const { name, description, trigger, code } = req.body;
  
  const agentId = nanoid();
  const agent = {
    id: agentId,
    name,
    description,
    trigger,
    code,
    creatorId: req.user.id,
    enabled: true,
    createdAt: new Date().toISOString()
  };
  
  db.agents.set(agentId, agent);
  res.json({ agent });
});

// List agents
router.get('/', requireAuth, (req, res) => {
  const agents = Array.from(db.agents.values())
    .filter(a => a.creatorId === req.user.id);
  
  res.json({ agents });
});

// Execute agent
router.post('/:agentId/execute', requireAuth, (req, res) => {
  const agent = db.agents.get(req.params.agentId);
  
  if (!agent || agent.creatorId !== req.user.id) {
    return res.status(404).json({ error: 'Agent not found' });
  }
  
  if (!agent.enabled) {
    return res.status(400).json({ error: 'Agent is disabled' });
  }
  
  try {
    const context = { user: req.user, data: req.body.data };
    const fn = new Function('context', agent.code);
    const result = fn(context);
    
    res.json({ result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = { router };
