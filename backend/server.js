const express = require('express');
const cors = require('cors');
const path = require('path');
const { initSchema } = require('./database/database');
const { seedDatabase } = require('./seed/seed');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS
app.use(cors());

// Parse JSON and urlencoded request bodies with 50mb limit for audio data
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve static frontend files
const frontendPath = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontendPath));

// Healthcheck
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'ClubOps AI Backend (SQLite)', timestamp: new Date().toISOString() });
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
const memoryRouter = require('./routes/memory');
const reportsRouter = require('./routes/reports');
const aiRouter = require('./routes/ai');

// API Mount points
app.use('/api/events', eventsRouter);
app.use('/api/events', readinessRouter);
app.use('/api/readiness', readinessRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/volunteers', volunteersRouter);
app.use('/api/guests', guestsRouter);
app.use('/api/vendors', vendorsRouter);
app.use('/api/risks', risksRouter);
app.use('/api/dashboard/summary', summaryRouter);
app.use('/api/activity', activityRouter);
app.use('/api/memory', memoryRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/ai', aiRouter);

// Initialize SQLite database and seed on startup
initSchema().then(() => {
  return seedDatabase(false);
}).then(() => {
  app.listen(PORT, () => {
    console.log(`=========================================`);
    console.log(` ClubOps AI Backend Server Running! (SQLite)`);
    console.log(` Port: http://localhost:${PORT}`);
    console.log(` APIs: http://localhost:${PORT}/api/dashboard/summary`);
    console.log(` Dashboard: http://localhost:${PORT}/dashboard.html`);
    console.log(` Landing: http://localhost:${PORT}/index.html`);
    console.log(`=========================================`);
  });
}).catch(err => {
  console.error('Failed to initialize database on startup:', err);
});
