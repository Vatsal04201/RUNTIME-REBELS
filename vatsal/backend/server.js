const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for frontend development
app.use(cors());

// Parse JSON request bodies
app.use(express.json());

// Serve static frontend files (dashboard.html, dashboard.css, dashboard.js, index.html, style.css)
const frontendPath = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontendPath));

// Healthcheck
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'ClubOps AI Backend', timestamp: new Date().toISOString() });
});

// Mount Routes
const eventsRouter = require('./routes/events');
const tasksRouter = require('./routes/tasks');
const volunteersRouter = require('./routes/volunteers');
const guestsRouter = require('./routes/guests');
const vendorsRouter = require('./routes/vendors');
const risksRouter = require('./routes/risks');
const readinessRouter = require('./routes/readiness');
const summaryRouter = require('./routes/summary');
const activityRouter = require('./routes/activity');
const aiRouter = require('./routes/ai');

// API Mount points
app.use('/api/events', eventsRouter);
app.use('/api/events', readinessRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/volunteers', volunteersRouter);
app.use('/api/guests', guestsRouter);
app.use('/api/vendors', vendorsRouter);
app.use('/api/risks', risksRouter);
app.use('/api/dashboard/summary', summaryRouter);
app.use('/api/activity', activityRouter);
app.use('/api/ai', aiRouter);

// Start Server
app.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(` ClubOps AI Backend Server Running!`);
  console.log(` Port: http://localhost:${PORT}`);
  console.log(` APIs: http://localhost:${PORT}/api/dashboard/summary`);
  console.log(` Dashboard: http://localhost:${PORT}/dashboard.html`);
  console.log(`=========================================`);
});
