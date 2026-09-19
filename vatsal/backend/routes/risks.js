const express = require('express');
const router = express.Router();
const { run, get, all } = require('../database/database');

// GET /api/risks - List active risks evaluated dynamically from real data
router.get('/', async (req, res) => {
  try {
    const { eventId = 'felicific-2026' } = req.query;

    // Fetch live state from SQLite
    const risks = await all('SELECT * FROM risks WHERE eventId = ? AND resolved = 0', [eventId]);
    const unassignedVols = await all('SELECT * FROM volunteers WHERE eventId = ? AND status = ?', [eventId, 'Unassigned']);
    const pendingVendors = await all("SELECT * FROM vendors WHERE eventId = ? AND status != 'Confirmed' AND status != 'Arrived'", [eventId]);

    // Format risk items with user-friendly level / badges
    const formatted = risks.map(r => ({
      id: r.id,
      title: r.severity === 'High' ? 'HIGH ALERT' : (r.severity === 'Medium' ? 'MEDIUM ALERT' : 'INFO ALERT'),
      message: r.title,
      level: r.severity.toLowerCase(),
      category: r.category,
      actionText: r.action,
      impact: r.impact,
      resolved: !!r.resolved
    }));

    const highCount = formatted.filter(r => r.level === 'high').length;
    const medCount = formatted.filter(r => r.level === 'medium').length;
    const lowCount = formatted.filter(r => r.level === 'low' || r.level === 'info').length;

    res.json({
      success: true,
      total: formatted.length,
      high: highCount,
      medium: medCount,
      info: lowCount,
      list: formatted,
      data: formatted
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/risks/:id/resolve - Resolve a risk
router.post('/:id/resolve', async (req, res) => {
  try {
    await run('UPDATE risks SET resolved = 1 WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Risk marked as resolved!' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
