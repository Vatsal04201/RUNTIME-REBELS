const express = require('express');
const router = express.Router();
const { run, all } = require('../database/database');

// GET /api/activity - List recent audit logs
router.get('/', async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const activities = await all('SELECT * FROM activity ORDER BY timestamp DESC LIMIT ?', [parseInt(limit)]);
    res.json({ success: true, data: activities });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/activity - Log action
router.post('/', async (req, res) => {
  try {
    const { eventId = 'felicific-2026', text, dot = 'cyan' } = req.body;
    if (!text) {
      return res.status(400).json({ success: false, message: 'Text is required' });
    }

    const id = `act-${Date.now()}`;
    await run(`
      INSERT INTO activity (id, eventId, text, time, dot, timestamp)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [id, eventId, text, 'Just now', dot, Date.now()]);

    res.status(201).json({ success: true, message: 'Activity logged' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
