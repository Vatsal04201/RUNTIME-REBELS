const express = require('express');
const router = express.Router();
const { run, get, all } = require('../database/database');

// GET /api/volunteers - List volunteers
router.get('/', async (req, res) => {
  try {
    const { eventId, team, status } = req.query;
    let sql = 'SELECT * FROM volunteers WHERE 1=1';
    const params = [];

    if (eventId) {
      sql += ' AND eventId = ?';
      params.push(eventId);
    }
    if (team) {
      sql += ' AND team = ?';
      params.push(team);
    }
    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }

    sql += ' ORDER BY team ASC, name ASC';
    const volunteers = await all(sql, params);
    res.json({ success: true, data: volunteers });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/volunteers - Add volunteer
router.post('/', async (req, res) => {
  try {
    const {
      eventId = 'felicific-2026',
      name,
      role = 'Volunteer',
      team = 'Registration',
      contact = '+91 98765 00000',
      tasks = 1,
      status = 'Assigned'
    } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Volunteer name is required' });
    }

    const id = `v-${Date.now()}`;
    await run(`
      INSERT INTO volunteers (id, eventId, name, role, team, contact, tasks, status, checkedIn, checkInTime)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, NULL)
    `, [id, eventId, name, role, team, contact, tasks, status]);

    const created = await get('SELECT * FROM volunteers WHERE id = ?', [id]);
    res.status(201).json({ success: true, data: created });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/volunteers/:id - Update volunteer details or assign
router.put('/:id', async (req, res) => {
  try {
    const { name, role, team, contact, status, tasks } = req.body;
    const vol = await get('SELECT * FROM volunteers WHERE id = ?', [req.params.id]);
    if (!vol) {
      return res.status(404).json({ success: false, message: 'Volunteer not found' });
    }

    await run(`
      UPDATE volunteers
      SET name = COALESCE(?, name),
          role = COALESCE(?, role),
          team = COALESCE(?, team),
          contact = COALESCE(?, contact),
          status = COALESCE(?, status),
          tasks = COALESCE(?, tasks)
      WHERE id = ?
    `, [name, role, team, contact, status, tasks, req.params.id]);

    const updated = await get('SELECT * FROM volunteers WHERE id = ?', [req.params.id]);
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/volunteers/:id/checkin - Event Day Check-in
router.post('/:id/checkin', async (req, res) => {
  try {
    const vol = await get('SELECT * FROM volunteers WHERE id = ?', [req.params.id]);
    if (!vol) {
      return res.status(404).json({ success: false, message: 'Volunteer not found' });
    }

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    await run(`
      UPDATE volunteers
      SET checkedIn = 1, checkInTime = ?
      WHERE id = ?
    `, [timeStr, req.params.id]);

    await run(`
      INSERT INTO activity (id, eventId, text, time, dot, timestamp)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [`act-${Date.now()}`, vol.eventId, `Volunteer <strong>${vol.name}</strong> checked in via QR scanner`, 'Just now', 'green', Date.now()]);

    const updated = await get('SELECT * FROM volunteers WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: `Volunteer ${vol.name} successfully checked in!`, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
