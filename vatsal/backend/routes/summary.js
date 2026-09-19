const express = require('express');
const router = express.Router();
const { run, get, all } = require('../database/database');

// GET /api/dashboard/summary
router.get('/', async (req, res) => {
  try {
    const eventId = 'felicific-2026';

    const events = await all('SELECT * FROM events');
    const featuredEvent = await get('SELECT * FROM events WHERE id = ?', [eventId]) || events[0];

    const tasks = await all('SELECT * FROM tasks WHERE eventId = ?', [eventId]);
    const vendors = await all('SELECT * FROM vendors WHERE eventId = ?', [eventId]);
    const volunteers = await all('SELECT * FROM volunteers WHERE eventId = ?', [eventId]);
    const risks = await all('SELECT * FROM risks WHERE eventId = ? AND resolved = 0', [eventId]);

    // Tasks metrics
    const totalTasks = tasks.length || 1;
    const completedTasks = tasks.filter(t => t.status && t.status.toLowerCase() === 'completed').length;
    const pendingTasks = totalTasks - completedTasks;
    const taskPct = Math.round((completedTasks / totalTasks) * 100);

    // Dynamic Readiness formula:
    // (completedTasks/totalTasks)*40 + (confirmedVendors/totalVendors)*25 + (assignedVolunteers/totalVolunteers)*25 + 10
    const confirmedVendors = vendors.filter(v => v.status && (v.status.toLowerCase() === 'confirmed' || v.status.toLowerCase() === 'arrived')).length;
    const assignedVolunteers = volunteers.filter(v => v.status && v.status.toLowerCase() === 'assigned').length;

    const taskScore = (completedTasks / totalTasks) * 40;
    const vendorScore = (confirmedVendors / (vendors.length || 1)) * 25;
    const volunteerScore = (assignedVolunteers / (volunteers.length || 1)) * 25;
    const baseline = 10;

    const readinessPct = Math.min(100, Math.round(taskScore + vendorScore + volunteerScore + baseline));

    let readinessStatus = 'On track';
    if (readinessPct >= 90) readinessStatus = 'Ready for Launch';
    else if (readinessPct < 75) readinessStatus = 'Needs attention';

    // Risks breakdown
    const formattedRisks = risks.map(r => ({
      id: r.id,
      title: r.severity === 'High' ? 'HIGH ALERT' : (r.severity === 'Medium' ? 'MEDIUM ALERT' : 'INFO ALERT'),
      message: r.title,
      level: r.severity.toLowerCase(),
      category: r.category,
      actionText: r.action,
      targetId: 'ven-1'
    }));

    const highRisks = formattedRisks.filter(r => r.level === 'high').length;
    const medRisks = formattedRisks.filter(r => r.level === 'medium').length;

    // AI Insight text
    let insightText = `You're <strong>${readinessPct}%</strong> ready.`;
    const soundVendor = vendors.find(v => v.category === 'Sound');
    if (soundVendor && soundVendor.status !== 'Confirmed') {
      insightText += ` Confirming the sound vendor will push readiness to <strong>${Math.min(100, readinessPct + 7)}%</strong>.`;
    } else {
      insightText += ` Excellent job! All critical vendor and logistical assets are confirmed.`;
    }

    const upcomingEvents = events.filter(e => (e.status || '').toLowerCase() !== 'completed');
    const nextUpcoming = events.find(e => e.id !== featuredEvent?.id && (e.status || '').toLowerCase() !== 'completed') || featuredEvent;

    res.json({
      success: true,
      data: {
        upcomingEventsCount: upcomingEvents.length,
        nextEventName: nextUpcoming ? nextUpcoming.name : 'TechFest 2026',
        featuredEvent: featuredEvent ? {
          id: featuredEvent.id,
          name: featuredEvent.name,
          tagline: featuredEvent.type || 'Annual Cultural & Tech Extravaganza',
          date: featuredEvent.date,
          time: featuredEvent.startTime || '6:00 PM',
          location: featuredEvent.location || 'DDU Campus',
          totalGuests: featuredEvent.guests || 100,
          totalVolunteers: featuredEvent.volunteers || 20,
          assignedVolunteers: assignedVolunteers,
          status: featuredEvent.status || 'LIVE'
        } : null,
        tasks: {
          total: totalTasks,
          completed: completedTasks,
          pending: pendingTasks,
          percentage: taskPct
        },
        readiness: {
          percentage: readinessPct,
          status: readinessStatus,
          breakdown: {
            tasks: { total: totalTasks, completed: completedTasks, pending: pendingTasks, score: Math.round(taskScore) },
            vendors: { total: vendors.length, confirmed: confirmedVendors, unconfirmed: vendors.length - confirmedVendors, score: Math.round(vendorScore) },
            volunteers: { total: volunteers.length, assigned: assignedVolunteers, unassigned: volunteers.length - assignedVolunteers, score: Math.round(volunteerScore) }
          }
        },
        risks: {
          total: formattedRisks.length,
          high: highRisks,
          medium: medRisks,
          list: formattedRisks
        },
        aiInsight: {
          text: insightText,
          actionPrompt: 'Take Action'
        }
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
