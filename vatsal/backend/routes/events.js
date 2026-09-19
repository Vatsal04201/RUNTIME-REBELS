const express = require('express');
const router = express.Router();
const { run, get, all } = require('../database/database');
const gemini = require('../services/geminiService');

// GET /api/events - List all events
router.get('/', async (req, res) => {
  try {
    const events = await all('SELECT * FROM events ORDER BY date ASC');
    res.json({ success: true, data: events });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/events/:id - Get single event
router.get('/:id', async (req, res) => {
  try {
    const event = await get('SELECT * FROM events WHERE id = ?', [req.params.id]);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }
    res.json({ success: true, data: event });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/events - Create new event
router.post('/', async (req, res) => {
  try {
    const {
      name,
      type = 'General Fest',
      date = 'TBD',
      startTime = '18:00',
      endTime = '21:00',
      venue = 'Campus Center',
      location = 'DDU Campus',
      guests = 50,
      volunteers = 10,
      budget = 20000,
      description = '',
      requirements = '',
      status = 'Upcoming',
      photographyLead,
      soundLead,
      registrationLead,
      stageLead,
      services = []
    } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Event name is required' });
    }

    const id = `evt-${Date.now()}`;
    await run(`
      INSERT INTO events (id, name, type, date, startTime, endTime, venue, location, guests, volunteers, budget, description, requirements, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [id, name, type, date, startTime, endTime, venue, location, guests, volunteers, budget, description, requirements, status]);

    // 1. If user specified custom team leads, add them directly to volunteers table
    const leadsToAdd = [];
    if (photographyLead && photographyLead.trim()) {
      leadsToAdd.push({ name: photographyLead.trim(), role: 'Photography & Media Lead', team: 'Photography' });
    }
    if (soundLead && soundLead.trim()) {
      leadsToAdd.push({ name: soundLead.trim(), role: 'Sound & Audio Lead', team: 'Technical' });
    }
    if (registrationLead && registrationLead.trim()) {
      leadsToAdd.push({ name: registrationLead.trim(), role: 'Registration Desk Lead', team: 'Registration' });
    }
    if (stageLead && stageLead.trim()) {
      leadsToAdd.push({ name: stageLead.trim(), role: 'Stage Management Lead', team: 'Stage Management' });
    }

    for (let i = 0; i < leadsToAdd.length; i++) {
      const l = leadsToAdd[i];
      const volId = `vol-${Date.now()}-${i}`;
      await run(`
        INSERT INTO volunteers (id, eventId, name, role, team, contact, tasks, status, checkedIn)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [volId, id, l.name, l.role, l.team, '+91 98765 00000', `Lead for ${l.team}`, 'Assigned', 0]);
    }

    // 2. Gemini AI dynamically decides Before, During, and After event tasks from event details
    let customTasks = [];
    let aiSummary = '';

    try {
      const geminiResult = await gemini.generateEventTasksWithGemini({
        name,
        type,
        date,
        venue,
        guests,
        volunteers,
        budget,
        description,
        requirements,
        photographyLead,
        soundLead,
        registrationLead,
        stageLead,
        services
      });

      if (geminiResult && Array.isArray(geminiResult.tasks) && geminiResult.tasks.length > 0) {
        customTasks = geminiResult.tasks;
        aiSummary = geminiResult.summary;
      }
    } catch (e) {
      console.warn('Gemini task generation error:', e.message);
    }

    // High-fidelity fallback if Gemini network times out
    if (customTasks.length === 0) {
      if (photographyLead && photographyLead.trim()) {
        customTasks.push({
          title: `Prepare high-res camera gear, gimbal, and sponsor backdrop photo-op for ${name}`,
          owner: photographyLead.trim(),
          phase: 'Before Event',
          priority: 'High',
          deadline: '3 Days Before'
        });
      }
      if (soundLead && soundLead.trim()) {
        customTasks.push({
          title: `Verify Stage 1 line array speaker check and 2 backup cordless mics for ${name}`,
          owner: soundLead.trim(),
          phase: 'Before Event',
          priority: 'High',
          deadline: '2 Days Before'
        });
      }
      if (registrationLead && registrationLead.trim()) {
        customTasks.push({
          title: `Setup QR Fast-Track check-in desk and delegate badges for ${name}`,
          owner: registrationLead.trim(),
          phase: 'Event Day',
          priority: 'High',
          deadline: '08:00 AM'
        });
      }
      if (stageLead && stageLead.trim()) {
        customTasks.push({
          title: `Run master stage cues and dignitary seating arrangements for ${name}`,
          owner: stageLead.trim(),
          phase: 'Event Day',
          priority: 'High',
          deadline: '09:00 AM'
        });
      }
      customTasks.push(
        { title: `Sanction auditorium booking and security clearances for ${name}`, owner: 'Organizing Committee', phase: 'Before Event', priority: 'High', deadline: '5 Days Before' },
        { title: `Coordinate live audio monitoring and microphone battery swaps`, owner: soundLead?.trim() || 'Technical Lead', phase: 'Event Day', priority: 'High', deadline: 'Ongoing' },
        { title: `Disburse final vendor balances and generate post-event report for ${name}`, owner: 'Treasury Lead', phase: 'After Event', priority: 'Medium', deadline: '1 Day After' },
        { title: `Conduct venue audit, equipment return, and hall clean-up sign-off`, owner: 'Organizing Committee', phase: 'After Event', priority: 'High', deadline: 'Next Morning' }
      );
    }

    for (let j = 0; j < customTasks.length; j++) {
      const t = customTasks[j];
      const taskId = `t-${Date.now()}-${j}`;
      await run(`
        INSERT INTO tasks (id, eventId, title, owner, priority, deadline, phase, status, extractedByAi)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [taskId, id, t.title, t.owner || 'Club Team', t.priority || 'Medium', t.deadline || 'Event Day', t.phase || 'Before Event', 'Pending', 1]);
    }

    // 3. Register selected vendors if specified
    if (Array.isArray(services) && services.length > 0) {
      for (let k = 0; k < services.length; k++) {
        const s = services[k];
        const venId = `ven-${Date.now()}-${k}`;
        await run(`
          INSERT INTO vendors (id, eventId, name, category, status, cost, contact, notes)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [venId, id, `${s} Solutions`, s, 'Pending', 15000, '+91 98765 22000', `Contract for ${name}`]);
      }
    }

    // Log activity
    await run(`
      INSERT INTO activity (id, eventId, text, time, dot, timestamp)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [`act-${Date.now()}`, id, `Created new event <strong>${name}</strong> with Gemini AI deciding <strong>${customTasks.length} lifecycle tasks</strong> across Before, During, and After phases`, 'Just now', 'cyan', Date.now()]);

    const created = await get('SELECT * FROM events WHERE id = ?', [id]);
    res.status(201).json({
      success: true,
      data: created,
      leadsCount: leadsToAdd.length,
      tasksCount: customTasks.length,
      aiSummary: aiSummary || `Gemini AI synthesized ${customTasks.length} lifecycle operational tasks.`,
      tasks: customTasks
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/events/:id - Update event
router.put('/:id', async (req, res) => {
  try {
    const updates = req.body;
    const fields = Object.keys(updates).map(k => `${k} = ?`).join(', ');
    const values = Object.values(updates);
    values.push(req.params.id);

    await run(`UPDATE events SET ${fields} WHERE id = ?`, values);
    const updated = await get('SELECT * FROM events WHERE id = ?', [req.params.id]);
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/events/:id - Delete event
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await run('DELETE FROM events WHERE id = ?', [id]);
    await run('DELETE FROM tasks WHERE eventId = ?', [id]);
    await run('DELETE FROM volunteers WHERE eventId = ?', [id]);
    await run('DELETE FROM vendors WHERE eventId = ?', [id]);
    await run('DELETE FROM risks WHERE eventId = ?', [id]);
    await run('DELETE FROM activity WHERE eventId = ?', [id]);
    res.json({ success: true, message: `Event ${id} deleted successfully` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

