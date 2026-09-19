const express = require('express');
const router = express.Router();
const { run, get, all } = require('../database/database');

// GET /api/tasks - List tasks (filter by eventId, phase, status)
router.get('/', async (req, res) => {
  try {
    const { eventId, status, phase } = req.query;
    let sql = 'SELECT * FROM tasks WHERE 1=1';
    const params = [];

    if (eventId) {
      sql += ' AND eventId = ?';
      params.push(eventId);
    }
    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }
    if (phase) {
      sql += ' AND phase = ?';
      params.push(phase);
    }

    sql += ' ORDER BY createdAt DESC';
    const tasks = await all(sql, params);

    // Map compatibility fields for DeepSeek dashboard
    const formatted = tasks.map(t => ({
      ...t,
      name: t.title,
      assignee: t.owner,
      dueDate: t.deadline,
      isToday: t.deadline === 'Today'
    }));

    res.json({ success: true, data: formatted });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/tasks - Create task
router.post('/', async (req, res) => {
  try {
    const {
      eventId = 'felicific-2026',
      title,
      name,
      owner = 'Club Team',
      assignee,
      priority = 'Medium',
      deadline = 'Tomorrow',
      dueDate,
      phase = 'Before Event',
      status = 'Pending',
      extractedByAi = 0
    } = req.body;

    const taskTitle = title || name;
    if (!taskTitle) {
      return res.status(400).json({ success: false, message: 'Task title is required' });
    }

    const taskOwner = owner || assignee || 'Club Team';
    const taskDeadline = deadline || dueDate || 'Tomorrow';
    const id = `t-${Date.now()}`;

    await run(`
      INSERT INTO tasks (id, eventId, title, owner, priority, deadline, phase, status, extractedByAi)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [id, eventId, taskTitle, taskOwner, priority, taskDeadline, phase, status, extractedByAi ? 1 : 0]);

    await run(`
      INSERT INTO activity (id, eventId, text, time, dot, timestamp)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [`act-${Date.now()}`, eventId, `Added task: <strong>${taskTitle}</strong> for ${taskOwner}`, 'Just now', 'purple', Date.now()]);

    const created = await get('SELECT * FROM tasks WHERE id = ?', [id]);
    res.status(201).json({ success: true, data: created });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/tasks/:id - Update task status / details
router.put('/:id', async (req, res) => {
  try {
    const { status, title, name, owner, assignee, priority, deadline, dueDate } = req.body;
    const task = await get('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    const nextStatus = status ? (status.toLowerCase() === 'completed' ? 'Completed' : 'Pending') : task.status;
    const nextTitle = title || name || task.title;
    const nextOwner = owner || assignee || task.owner;
    const nextPriority = priority || task.priority;
    const nextDeadline = deadline || dueDate || task.deadline;

    await run(`
      UPDATE tasks
      SET status = ?, title = ?, owner = ?, priority = ?, deadline = ?
      WHERE id = ?
    `, [nextStatus, nextTitle, nextOwner, nextPriority, nextDeadline, req.params.id]);

    // Log status toggle in activity
    if (status && nextStatus !== task.status) {
      await run(`
        INSERT INTO activity (id, eventId, text, time, dot, timestamp)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [`act-${Date.now()}`, task.eventId, `Task marked ${nextStatus.toLowerCase()}: <strong>${nextTitle}</strong>`, 'Just now', nextStatus === 'Completed' ? 'green' : 'cyan', Date.now()]);
    }

    const updated = await get('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
    res.json({
      success: true,
      data: {
        ...updated,
        name: updated.title,
        assignee: updated.owner,
        dueDate: updated.deadline,
        isToday: updated.deadline === 'Today'
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/tasks/:id
router.delete('/:id', async (req, res) => {
  try {
    await run('DELETE FROM tasks WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Task deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
