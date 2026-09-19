const express = require('express');
const router = express.Router();
const { readData } = require('../dataStore');

// GET /api/activity
router.get('/', (req, res) => {
  const activities = readData('activity');
  res.json({
    success: true,
    count: activities.length,
    data: activities
  });
});

module.exports = router;
