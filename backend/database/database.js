const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbDir = path.join(__dirname);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'clubops.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening SQLite database:', err.message);
  } else {
    console.log('Connected to SQLite database at:', dbPath);
  }
});

// Promisified query helpers
const run = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
};

const get = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

const all = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

// Initialize schema
const initSchema = async () => {
  // 1. events
  await run(`
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT,
      date TEXT,
      startTime TEXT,
      endTime TEXT,
      venue TEXT,
      location TEXT,
      guests INTEGER DEFAULT 0,
      volunteers INTEGER DEFAULT 0,
      budget REAL DEFAULT 0,
      description TEXT,
      requirements TEXT,
      status TEXT DEFAULT 'Planning',
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 2. tasks
  await run(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      eventId TEXT,
      title TEXT NOT NULL,
      owner TEXT,
      priority TEXT DEFAULT 'Medium',
      deadline TEXT,
      phase TEXT DEFAULT 'Before Event',
      status TEXT DEFAULT 'Pending',
      extractedByAi INTEGER DEFAULT 0,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (eventId) REFERENCES events(id) ON DELETE CASCADE
    )
  `);

  // 3. volunteers
  await run(`
    CREATE TABLE IF NOT EXISTS volunteers (
      id TEXT PRIMARY KEY,
      eventId TEXT,
      name TEXT NOT NULL,
      role TEXT,
      team TEXT,
      contact TEXT,
      tasks INTEGER DEFAULT 0,
      status TEXT DEFAULT 'Unassigned',
      checkedIn INTEGER DEFAULT 0,
      checkInTime TEXT,
      FOREIGN KEY (eventId) REFERENCES events(id) ON DELETE CASCADE
    )
  `);

  // 4. guests
  await run(`
    CREATE TABLE IF NOT EXISTS guests (
      id TEXT PRIMARY KEY,
      eventId TEXT,
      name TEXT NOT NULL,
      contact TEXT,
      category TEXT DEFAULT 'Student',
      rsvp TEXT DEFAULT 'Invited',
      checkedIn INTEGER DEFAULT 0,
      checkInTime TEXT,
      special TEXT,
      FOREIGN KEY (eventId) REFERENCES events(id) ON DELETE CASCADE
    )
  `);

  // 5. vendors
  await run(`
    CREATE TABLE IF NOT EXISTS vendors (
      id TEXT PRIMARY KEY,
      eventId TEXT,
      name TEXT NOT NULL,
      category TEXT,
      status TEXT DEFAULT 'Not Contacted',
      cost REAL DEFAULT 0,
      contact TEXT,
      notes TEXT,
      FOREIGN KEY (eventId) REFERENCES events(id) ON DELETE CASCADE
    )
  `);

  // 6. risks
  await run(`
    CREATE TABLE IF NOT EXISTS risks (
      id TEXT PRIMARY KEY,
      eventId TEXT,
      title TEXT NOT NULL,
      severity TEXT DEFAULT 'Medium',
      probability TEXT,
      impact TEXT,
      action TEXT,
      resolved INTEGER DEFAULT 0,
      category TEXT,
      FOREIGN KEY (eventId) REFERENCES events(id) ON DELETE CASCADE
    )
  `);

  // 7. activity
  await run(`
    CREATE TABLE IF NOT EXISTS activity (
      id TEXT PRIMARY KEY,
      eventId TEXT,
      text TEXT NOT NULL,
      time TEXT,
      dot TEXT DEFAULT 'cyan',
      timestamp INTEGER
    )
  `);

  // 8. club_memory
  await run(`
    CREATE TABLE IF NOT EXISTS club_memory (
      id TEXT PRIMARY KEY,
      eventName TEXT,
      year TEXT,
      category TEXT,
      title TEXT NOT NULL,
      content TEXT,
      cost REAL DEFAULT 0,
      tags TEXT
    )
  `);

  // 9. reports
  await run(`
    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      eventId TEXT,
      title TEXT NOT NULL,
      summary TEXT,
      stats TEXT,
      issues TEXT,
      recommendations TEXT,
      generatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (eventId) REFERENCES events(id) ON DELETE CASCADE
    )
  `);

  console.log('All 9 SQLite tables successfully verified / created.');
};

module.exports = {
  db,
  run,
  get,
  all,
  initSchema
};
