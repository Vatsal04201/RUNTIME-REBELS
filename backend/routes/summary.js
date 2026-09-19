const express = require('express');
const router = express.Router();
const { readData, calculateReadiness, calculateRisks } = require('../dataStore');

// GET /api/dashboard/summary
router.get('/', (req, res) => {
  const eventId = req.query.eventId || 'felicific-2026';
  const events = readData('events');
  const tasks = readData('tasks').filter(t => !t.eventId || t.eventId === eventId);
  const volunteers = readData('volunteers').filter(v => !v.eventId || v.eventId === eventId);
  const vendors = readData('vendors').filter(v => !v.eventId || v.eventId === eventId);
  const guests = readData('guests').filter(g => !g.eventId || g.eventId === eventId);

  const featuredEvent = events.find(e => e.id === eventId) || events[0] || {};
  const upcomingEventsCount = events.length;

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const pendingTasks = totalTasks - completedTasks;
  const taskProgressPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const readiness = calculateReadiness(eventId);
  const risks = calculateRisks(eventId);

  // Dynamic AI insight text
  let insightText = `You're <strong>${readiness.percentage}%</strong> ready.`;
  const soundVendor = vendors.find(v => v.category === 'Sound');
  if (soundVendor && soundVendor.status === 'unconfirmed') {
    insightText += ` Confirming the sound vendor will push readiness to <strong>${Math.min(100, readiness.percentage + 7)}%</strong>.`;
  } else if (risks.counts.high > 0) {
    insightText += ` Resolving the top high risk will optimize event day operations.`;
  } else {
    insightText += ` All primary operational channels are on track for a flawless launch!`;
  }

  let totalGuestsCount = 0;
  guests.forEach(g => {
    totalGuestsCount += g.count || 1;
  });

  const assignedVolunteersCount = volunteers.filter(v => v.status === 'assigned' && v.name).length;

  res.json({
    success: true,
    data: {
      upcomingEventsCount,
      nextEventName: featuredEvent.name || 'Felicific 2026',
      featuredEvent: {
        id: featuredEvent.id,
        name: featuredEvent.name,
        tagline: featuredEvent.tagline,
        date: featuredEvent.date,
        time: featuredEvent.time,
        location: featuredEvent.location,
        totalGuests: totalGuestsCount || featuredEvent.totalGuests || 100,
        totalVolunteers: volunteers.length || featuredEvent.totalVolunteers || 20,
        assignedVolunteers: assignedVolunteersCount,
        status: featuredEvent.status || 'LIVE'
      },
      tasks: {
        total: totalTasks,
        completed: completedTasks,
        pending: pendingTasks,
        percentage: taskProgressPct
      },
      readiness: {
        percentage: readiness.percentage,
        status: readiness.status,
        breakdown: readiness.breakdown
      },
      risks: {
        total: risks.counts.total,
        high: risks.counts.high,
        medium: risks.counts.medium,
        info: risks.counts.info,
        list: risks.risks
      },
      aiInsight: {
        text: insightText,
        actionPrompt: 'Take Action'
      }
    }
  });
});

module.exports = router;
