const express = require('express');
const router = express.Router();
const { readData, writeData } = require('../dataStore');

// GET /api/events
router.get('/', (req, res) => {
  const events = readData('events');
  res.json({ success: true, count: events.length, data: events });
});

// GET /api/events/:id
router.get('/:id', (req, res) => {
  const events = readData('events');
  const event = events.find(e => e.id === req.params.id);
  if (!event) {
    return res.status(404).json({ success: false, message: 'Event not found' });
  }
  res.json({ success: true, data: event });
});

// POST /api/events
router.post('/', (req, res) => {
  const events = readData('events');
  const newEvent = {
    id: req.body.id || `event-${Date.now()}`,
    name: req.body.name || 'New Event',
    tagline: req.body.tagline || '',
    date: req.body.date || 'TBD',
    time: req.body.time || 'TBD',
    location: req.body.location || 'Campus',
    totalGuests: Number(req.body.totalGuests) || 0,
    totalVolunteers: Number(req.body.totalVolunteers) || 0,
    status: req.body.status || 'UPCOMING',
    isFeatured: Boolean(req.body.isFeatured),
    readiness: 0,
    readinessStatus: 'Initial'
  };

  events.push(newEvent);
  writeData('events', events);
  res.status(201).json({ success: true, data: newEvent });
});

module.exports = router;
