const express = require('express');
const router = express.Router();
const { readData, writeData } = require('../dataStore');

// GET /api/vendors
router.get('/', (req, res) => {
  const vendors = readData('vendors');
  const confirmed = vendors.filter(v => v.status === 'confirmed').length;
  const unconfirmed = vendors.length - confirmed;

  res.json({
    success: true,
    total: vendors.length,
    confirmed,
    unconfirmed,
    data: vendors
  });
});

// POST /api/vendors
router.post('/', (req, res) => {
  const vendors = readData('vendors');
  const newVendor = {
    id: req.body.id || `ven-${Date.now()}`,
    name: req.body.name || 'Vendor Name',
    category: req.body.category || 'General',
    status: req.body.status || 'unconfirmed',
    contactPerson: req.body.contactPerson || '',
    phone: req.body.phone || '',
    estimatedCost: req.body.estimatedCost || '',
    isCritical: Boolean(req.body.isCritical),
    eventId: req.body.eventId || 'felicific-2026'
  };

  vendors.push(newVendor);
  writeData('vendors', vendors);
  res.status(201).json({ success: true, data: newVendor });
});

// PUT /api/vendors/:id
router.put('/:id', (req, res) => {
  const vendors = readData('vendors');
  const index = vendors.findIndex(v => v.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Vendor not found' });
  }

  const existing = vendors[index];
  const updated = { ...existing, ...req.body, id: existing.id };
  vendors[index] = updated;
  writeData('vendors', vendors);

  // If vendor became confirmed, log activity
  if (req.body.status === 'confirmed' && existing.status !== 'confirmed') {
    const activities = readData('activity');
    activities.unshift({
      id: `act-${Date.now()}`,
      text: `<strong>Helli</strong> confirmed vendor: ${updated.name}`,
      time: 'Just now',
      dot: 'cyan',
      timestamp: Date.now()
    });
    writeData('activity', activities.slice(0, 20));
  }

  res.json({ success: true, data: updated });
});

module.exports = router;
