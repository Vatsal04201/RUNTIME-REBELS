const express = require('express');
const router = express.Router();
const { readData, writeData } = require('../dataStore');

// GET /api/guests
router.get('/', (req, res) => {
  const guests = readData('guests');
  let totalCount = 0;
  guests.forEach(g => {
    totalCount += g.count || 1;
  });

  res.json({
    success: true,
    total: totalCount,
    data: guests
  });
});

// POST /api/guests
router.post('/', (req, res) => {
  const guests = readData('guests');
  const newGuest = {
    id: req.body.id || `gst-${Date.now()}`,
    name: req.body.name || 'Guest',
    designation: req.body.designation || '',
    category: req.body.category || 'General',
    status: req.body.status || 'confirmed',
    count: Number(req.body.count) || 1,
    eventId: req.body.eventId || 'felicific-2026'
  };

  guests.push(newGuest);
  writeData('guests', guests);
  res.status(201).json({ success: true, data: newGuest });
});

// PUT /api/guests/:id
router.put('/:id', (req, res) => {
  const guests = readData('guests');
  const index = guests.findIndex(g => g.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Guest not found' });
  }

  guests[index] = { ...guests[index], ...req.body, id: guests[index].id };
  writeData('guests', guests);
  res.json({ success: true, data: guests[index] });
});

module.exports = router;
