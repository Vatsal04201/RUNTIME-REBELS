const express = require('express');
const router = express.Router();
const { run, get, all } = require('../database/database');

// GET /api/readiness or /api/events/:id/readiness
router.get(['/', '/:id', '/:id/readiness'], async (req, res) => {
  try {
    const eventId = req.params.id || req.query.eventId || 'felicific-2026';

    const event = await get('SELECT * FROM events WHERE id = ?', [eventId]);
    const tasks = await all('SELECT * FROM tasks WHERE eventId = ?', [eventId]);
    const vendors = await all('SELECT * FROM vendors WHERE eventId = ?', [eventId]);
    const volunteers = await all('SELECT * FROM volunteers WHERE eventId = ?', [eventId]);

    // Tasks calculation (40 points max)
    const totalTasks = tasks.length || 1;
    const completedTasks = tasks.filter(t => t.status && t.status.toLowerCase() === 'completed').length;
    const taskScore = (completedTasks / totalTasks) * 40;

    // Vendors calculation (25 points max)
    const totalVendors = vendors.length || 1;
    const confirmedVendors = vendors.filter(v => v.status && (v.status.toLowerCase() === 'confirmed' || v.status.toLowerCase() === 'arrived')).length;
    const vendorScore = (confirmedVendors / totalVendors) * 25;

    // Volunteers calculation (25 points max)
    const totalVolunteers = volunteers.length || 1;
    const assignedVolunteers = volunteers.filter(v => v.status && v.status.toLowerCase() === 'assigned').length;
    const volunteerScore = (assignedVolunteers / totalVolunteers) * 25;

    // Baseline points (10 points)
    const baselineScore = event ? 10 : 0;

    const rawPercentage = Math.round(taskScore + vendorScore + volunteerScore + baselineScore);
    const percentage = Math.min(100, Math.max(0, rawPercentage));

    let status = 'Needs attention';
    if (percentage >= 90) status = 'Ready for Launch';
    else if (percentage >= 80) status = 'On track';
    else if (percentage >= 60) status = 'In progress';

    res.json({
      success: true,
      data: {
        percentage,
        status,
        breakdown: {
          tasks: {
            total: totalTasks,
            completed: completedTasks,
            pending: totalTasks - completedTasks,
            score: Math.round(taskScore),
            weight: 40
          },
          vendors: {
            total: totalVendors,
            confirmed: confirmedVendors,
            unconfirmed: totalVendors - confirmedVendors,
            score: Math.round(vendorScore),
            weight: 25
          },
          volunteers: {
            total: totalVolunteers,
            assigned: assignedVolunteers,
            unassigned: totalVolunteers - assignedVolunteers,
            score: Math.round(volunteerScore),
            weight: 25
          },
          baseline: {
            score: baselineScore,
            weight: 10
          }
        }
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
