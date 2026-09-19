const express = require('express');
const router = express.Router();
const { readData, writeData } = require('../dataStore');

// GET /api/volunteers
router.get('/', (req, res) => {
  const volunteers = readData('volunteers');
  const assigned = volunteers.filter(v => v.status === 'assigned' && v.name).length;
  const unassigned = volunteers.length - assigned;

  res.json({
    success: true,
    total: volunteers.length,
    assigned,
    unassigned,
    data: volunteers
  });
});

// POST /api/volunteers
router.post('/', (req, res) => {
  const volunteers = readData('volunteers');
  const newVol = {
    id: req.body.id || `vol-${Date.now()}`,
    name: req.body.name || null,
    role: req.body.role || 'Volunteer',
    department: req.body.department || 'Operations',
    status: req.body.status || (req.body.name ? 'assigned' : 'unassigned'),
    eventId: req.body.eventId || 'felicific-2026'
  };

  volunteers.push(newVol);
  writeData('volunteers', volunteers);
  res.status(201).json({ success: true, data: newVol });
});

// PUT /api/volunteers/:id (assign or update)
router.put('/:id', (req, res) => {
  const volunteers = readData('volunteers');
  const index = volunteers.findIndex(v => v.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Volunteer entry not found' });
  }

  const existing = volunteers[index];
  const updated = {
    ...existing,
    ...req.body,
    id: existing.id
  };

  // If assigned with a name, mark status as assigned
  if (updated.name && updated.status === 'unassigned') {
    updated.status = 'assigned';
  }

  volunteers[index] = updated;
  writeData('volunteers', volunteers);
  res.json({ success: true, data: updated });
});

module.exports = router;
