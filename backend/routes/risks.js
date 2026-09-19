const express = require('express');
const router = express.Router();
const { calculateRisks } = require('../dataStore');

// GET /api/risks
router.get('/', (req, res) => {
  const eventId = req.query.eventId || 'felicific-2026';
  const result = calculateRisks(eventId);
  res.json({
    success: true,
    ...result
  });
});

module.exports = router;
