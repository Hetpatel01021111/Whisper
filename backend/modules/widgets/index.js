const express = require('express');
const { nanoid } = require('nanoid');
const db = require('../../config/db');
const { requireAuth } = require('../auth');

const router = express.Router();

// Create widget
router.post('/', requireAuth, (req, res) => {
  const { name, description, code } = req.body;
  
  const widgetId = nanoid();
  const widget = {
    id: widgetId,
    name,
    description,
    code,
    creatorId: req.user.id,
    creatorName: req.user.displayName,
    createdAt: new Date().toISOString()
  };
  
  db.widgets.set(widgetId, widget);
  res.json({ widget });
});

// List widgets
router.get('/', (req, res) => {
  const widgets = Array.from(db.widgets.values());
  res.json({ widgets });
});

// Get widget
router.get('/:widgetId', (req, res) => {
  const widget = db.widgets.get(req.params.widgetId);
  
  if (!widget) {
    return res.status(404).json({ error: 'Widget not found' });
  }
  
  res.json({ widget });
});

module.exports = { router };
