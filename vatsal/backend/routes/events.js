const express = require('express');
const router = express.Router();
const { run, get, all } = require('../database/database');

// GET /api/events - List all events
router.get('/', async (req, res) => {
  try {
    const events = await all('SELECT * FROM events ORDER BY date ASC');
    res.json({ success: true, data: events });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/events/:id - Get single event
router.get('/:id', async (req, res) => {
  try {
    const event = await get('SELECT * FROM events WHERE id = ?', [req.params.id]);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }
    res.json({ success: true, data: event });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/events - Create new event
router.post('/', async (req, res) => {
  try {
    const {
      name,
      type = 'General Fest',
      date = 'TBD',
      startTime = '18:00',
      endTime = '21:00',
      venue = 'Campus Center',
      location = 'DDU Campus',
      guests = 50,
      volunteers = 10,
      budget = 20000,
      description = '',
      requirements = '',
      status = 'Planning'
    } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Event name is required' });
    }

    const id = `evt-${Date.now()}`;
    await run(`
      INSERT INTO events (id, name, type, date, startTime, endTime, venue, location, guests, volunteers, budget, description, requirements, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [id, name, type, date, startTime, endTime, venue, location, guests, volunteers, budget, description, requirements, status]);

    // Log activity
    await run(`
      INSERT INTO activity (id, eventId, text, time, dot, timestamp)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [`act-${Date.now()}`, id, `Created new event <strong>${name}</strong>`, 'Just now', 'cyan', Date.now()]);

    const created = await get('SELECT * FROM events WHERE id = ?', [id]);
    res.status(201).json({ success: true, data: created });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/events/:id - Update event
router.put('/:id', async (req, res) => {
  try {
    const updates = req.body;
    const fields = Object.keys(updates).map(k => `${k} = ?`).join(', ');
    const values = Object.values(updates);
    values.push(req.params.id);

    await run(`UPDATE events SET ${fields} WHERE id = ?`, values);
    const updated = await get('SELECT * FROM events WHERE id = ?', [req.params.id]);
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
