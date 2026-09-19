const express = require('express');
const router = express.Router();
const { run, get, all } = require('../database/database');

// GET /api/guests - List guests
router.get('/', async (req, res) => {
  try {
    const { eventId, category, rsvp, checkedIn } = req.query;
    let sql = 'SELECT * FROM guests WHERE 1=1';
    const params = [];

    if (eventId) {
      sql += ' AND eventId = ?';
      params.push(eventId);
    }
    if (category) {
      sql += ' AND category = ?';
      params.push(category);
    }
    if (rsvp) {
      sql += ' AND rsvp = ?';
      params.push(rsvp);
    }
    if (checkedIn !== undefined) {
      sql += ' AND checkedIn = ?';
      params.push(checkedIn === '1' || checkedIn === 'true' ? 1 : 0);
    }

    sql += ' ORDER BY category ASC, name ASC';
    const guests = await all(sql, params);
    res.json({ success: true, data: guests });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/guests - Add guest
router.post('/', async (req, res) => {
  try {
    const {
      eventId = 'felicific-2026',
      name,
      contact = '+91 98765 00000',
      category = 'Student',
      rsvp = 'Invited',
      special = ''
    } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Guest name is required' });
    }

    const id = `g-${Date.now()}`;
    await run(`
      INSERT INTO guests (id, eventId, name, contact, category, rsvp, checkedIn, special)
      VALUES (?, ?, ?, ?, ?, ?, 0, ?)
    `, [id, eventId, name, contact, category, rsvp, special]);

    const created = await get('SELECT * FROM guests WHERE id = ?', [id]);
    res.status(201).json({ success: true, data: created });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/guests/:id - Update RSVP status or info
router.put('/:id', async (req, res) => {
  try {
    const { rsvp, contact, category, special } = req.body;
    const guest = await get('SELECT * FROM guests WHERE id = ?', [req.params.id]);
    if (!guest) {
      return res.status(404).json({ success: false, message: 'Guest not found' });
    }

    await run(`
      UPDATE guests
      SET rsvp = COALESCE(?, rsvp),
          contact = COALESCE(?, contact),
          category = COALESCE(?, category),
          special = COALESCE(?, special)
      WHERE id = ?
    `, [rsvp, contact, category, special, req.params.id]);

    const updated = await get('SELECT * FROM guests WHERE id = ?', [req.params.id]);
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/guests/:id/checkin - Mark guest arrival
router.post('/:id/checkin', async (req, res) => {
  try {
    const guest = await get('SELECT * FROM guests WHERE id = ?', [req.params.id]);
    if (!guest) {
      return res.status(404).json({ success: false, message: 'Guest not found' });
    }

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    await run(`
      UPDATE guests
      SET checkedIn = 1, checkInTime = ?, rsvp = 'Accepted'
      WHERE id = ?
    `, [timeStr, req.params.id]);

    await run(`
      INSERT INTO activity (id, eventId, text, time, dot, timestamp)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [`act-${Date.now()}`, guest.eventId, `Guest <strong>${guest.name}</strong> (${guest.category}) arrived at venue`, 'Just now', 'green', Date.now()]);

    const updated = await get('SELECT * FROM guests WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: `${guest.name} marked as arrived!`, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
