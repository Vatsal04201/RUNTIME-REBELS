const express = require('express');
const cors = require('cors');
const path = require('path');
const { initSchema } = require('./database/database');
const { seedDatabase } = require('./seed/seed');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS
app.use(cors());

// Parse JSON request bodies
app.use(express.json());

// Serve static frontend files
const frontendPath = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontendPath));

// Route alias for URLs with spaces
app.get(['/event planner.html', '/event%20planner.html'], (req, res) => {
  res.sendFile(path.join(frontendPath, 'event-planner.html'));
});

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
  function startServer() {
    const server = app.listen(PORT, () => {
      console.log(`=========================================`);
      console.log(` ClubOps AI Backend Server Running! (SQLite)`);
      console.log(` Port: http://localhost:${PORT}`);
      console.log(` APIs: http://localhost:${PORT}/api/dashboard/summary`);
      console.log(` Dashboard: http://localhost:${PORT}/dashboard.html`);
      console.log(` Landing: http://localhost:${PORT}/index.html`);
      console.log(`=========================================`);
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`\n⚠️  Port ${PORT} is occupied by an older instance. Releasing port ${PORT} automatically...`);
        try {
          if (process.platform === 'win32') {
            const out = require('child_process').execSync(`netstat -ano | findstr :${PORT}`, { encoding: 'utf8' });
            const lines = out.trim().split('\n');
            let killedAny = false;
            for (const line of lines) {
              const parts = line.trim().split(/\s+/);
              const pid = parts[parts.length - 1]?.trim();
              if (pid && pid !== '0' && pid !== process.pid.toString()) {
                try {
                  require('child_process').execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
                  killedAny = true;
                } catch (e) {}
              }
            }
            if (killedAny) {
              console.log(`✅ Freed port ${PORT}. Starting server now...`);
            }
          } else {
            require('child_process').execSync(`fuser -k ${PORT}/tcp`, { stdio: 'ignore' });
          }

          setTimeout(() => {
            startServer();
          }, 800);
        } catch (killErr) {
          console.error(`\n⚠️  Port ${PORT} is already in use by another instance.`);
          console.error(`👉 Close the previous terminal running on port ${PORT}, then run again.\n`);
        }
      } else {
        console.error('Server error:', err);
      }
    });
  }

  startServer();
}).catch(err => {
  console.error('Failed to initialize database on startup:', err);
});
