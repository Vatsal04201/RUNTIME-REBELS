const express = require('express');
const router = express.Router();
const { run, get, all } = require('../database/database');

// GET /api/vendors - List vendors
router.get('/', async (req, res) => {
  try {
    const { eventId, category, status } = req.query;
    let sql = 'SELECT * FROM vendors WHERE 1=1';
    const params = [];

    if (eventId) {
      sql += ' AND eventId = ?';
      params.push(eventId);
    }
    if (category) {
      sql += ' AND category = ?';
      params.push(category);
    }
    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }

    sql += ' ORDER BY category ASC, name ASC';
    const vendors = await all(sql, params);
    res.json({ success: true, data: vendors });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/vendors - Add vendor
router.post('/', async (req, res) => {
  try {
    const {
      eventId = 'felicific-2026',
      name,
      category = 'Sound',
      status = 'Not Contacted',
      cost = 0,
      contact = '+91 98765 00000',
      notes = ''
    } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Vendor name is required' });
    }

    const id = `ven-${Date.now()}`;
    await run(`
      INSERT INTO vendors (id, eventId, name, category, status, cost, contact, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [id, eventId, name, category, status, cost, contact, notes]);

    const created = await get('SELECT * FROM vendors WHERE id = ?', [id]);
    res.status(201).json({ success: true, data: created });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/vendors/:id - Update status / details
router.put('/:id', async (req, res) => {
  try {
    const { status, cost, contact, notes } = req.body;
    const vendor = await get('SELECT * FROM vendors WHERE id = ?', [req.params.id]);
    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor not found' });
    }

    let nextStatus = vendor.status;
    if (status) {
      if (status.toLowerCase() === 'confirmed') nextStatus = 'Confirmed';
      else if (status.toLowerCase() === 'arrived') nextStatus = 'Arrived';
      else if (status.toLowerCase() === 'pending') nextStatus = 'Pending';
      else nextStatus = status;
    }

    await run(`
      UPDATE vendors
      SET status = ?,
          cost = COALESCE(?, cost),
          contact = COALESCE(?, contact),
          notes = COALESCE(?, notes)
      WHERE id = ?
    `, [nextStatus, cost, contact, notes, req.params.id]);

    // If confirmed sound vendor, also mark any high risk associated with sound vendor as resolved!
    if (nextStatus === 'Confirmed' && vendor.category === 'Sound') {
      await run(`
        UPDATE risks
        SET resolved = 1
        WHERE category = 'Vendor' AND title LIKE '%Sound%'
      `);
      await run(`
        INSERT INTO activity (id, eventId, text, time, dot, timestamp)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [`act-${Date.now()}`, vendor.eventId, `Confirmed vendor <strong>${vendor.name}</strong> (${vendor.category}). Readiness boosted!`, 'Just now', 'green', Date.now()]);
    }

    const updated = await get('SELECT * FROM vendors WHERE id = ?', [req.params.id]);
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
