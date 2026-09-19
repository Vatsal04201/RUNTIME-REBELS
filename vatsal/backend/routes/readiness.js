const express = require('express');
const router = express.Router();
const { calculateReadiness } = require('../dataStore');

// GET /api/events/:id/readiness
router.get('/:id/readiness', (req, res) => {
  const eventId = req.params.id || 'felicific-2026';
  const readiness = calculateReadiness(eventId);
  res.json({
    success: true,
    data: readiness
  });
});

module.exports = router;
