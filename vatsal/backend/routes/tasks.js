const express = require('express');
const router = express.Router();
const { readData, writeData } = require('../dataStore');

// GET /api/tasks
router.get('/', (req, res) => {
  let tasks = readData('tasks');
  const { eventId, isToday } = req.query;

  if (eventId) {
    tasks = tasks.filter(t => t.eventId === eventId);
  }
  if (isToday === 'true') {
    tasks = tasks.filter(t => t.isToday === true);
  }

  const completed = tasks.filter(t => t.status === 'completed').length;
  const pending = tasks.length - completed;

  res.json({
    success: true,
    total: tasks.length,
    completed,
    pending,
    data: tasks
  });
});

// POST /api/tasks
router.post('/', (req, res) => {
  const tasks = readData('tasks');
  const newTask = {
    id: req.body.id || `task-${Date.now()}`,
    name: req.body.name || 'Untitled Task',
    assignee: req.body.assignee || 'Unassigned',
    status: req.body.status || 'pending',
    priority: req.body.priority || 'medium',
    dueDate: req.body.dueDate || 'Today',
    isToday: req.body.isToday !== undefined ? Boolean(req.body.isToday) : true,
    eventId: req.body.eventId || 'felicific-2026'
  };

  tasks.push(newTask);
  writeData('tasks', tasks);
  res.status(201).json({ success: true, data: newTask });
});

// PUT /api/tasks/:id (toggle completion, update details)
router.put('/:id', (req, res) => {
  const tasks = readData('tasks');
  const taskIndex = tasks.findIndex(t => t.id === req.params.id);

  if (taskIndex === -1) {
    return res.status(404).json({ success: false, message: 'Task not found' });
  }

  // Merge updates
  const existing = tasks[taskIndex];
  const updatedTask = {
    ...existing,
    ...req.body,
    id: existing.id // preserve ID
  };

  tasks[taskIndex] = updatedTask;
  writeData('tasks', tasks);

  // If status changed to completed, record to activity log!
  if (req.body.status === 'completed' && existing.status !== 'completed') {
    const activities = readData('activity');
    activities.unshift({
      id: `act-${Date.now()}`,
      text: `<strong>${updatedTask.assignee || 'Team member'}</strong> completed task: "${updatedTask.name}"`,
      time: 'Just now',
      dot: 'cyan',
      timestamp: Date.now()
    });
    writeData('activity', activities.slice(0, 20));
  }

  res.json({ success: true, data: updatedTask });
});

// DELETE /api/tasks/:id
router.delete('/:id', (req, res) => {
  let tasks = readData('tasks');
  const exists = tasks.some(t => t.id === req.params.id);

  if (!exists) {
    return res.status(404).json({ success: false, message: 'Task not found' });
  }

  tasks = tasks.filter(t => t.id !== req.params.id);
  writeData('tasks', tasks);

  res.json({ success: true, message: 'Task deleted successfully' });
});

module.exports = router;
