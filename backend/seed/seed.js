const { db, run, get, all, initSchema } = require('../database/database');

const seedDatabase = async (force = false) => {
  await initSchema();

  const existingEvent = await get('SELECT id FROM events WHERE id = ?', ['felicific-2026']);
  if (existingEvent && !force) {
    console.log('Database already seeded. Skipping initial seed.');
    return;
  }

  console.log('Seeding SQLite database with demo data for Felicific 2026...');

  // Clean existing tables if force
  if (force) {
    await run('DELETE FROM tasks');
    await run('DELETE FROM volunteers');
    await run('DELETE FROM guests');
    await run('DELETE FROM vendors');
    await run('DELETE FROM risks');
    await run('DELETE FROM activity');
    await run('DELETE FROM club_memory');
    await run('DELETE FROM reports');
    await run('DELETE FROM events');
  }

  // 1. Seed Event: Felicific 2026
  await run(`
    INSERT INTO events (id, name, type, date, startTime, endTime, venue, location, guests, volunteers, budget, description, requirements, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    'felicific-2026',
    'Felicific 2026',
    'Cultural & Tech Festival',
    '25 September 2026',
    '18:00',
    '22:00',
    'Main Auditorium',
    'DDU Campus',
    100,
    20,
    50000,
    'Annual flagship cultural and tech festival featuring band battles, keynotes, dance competitions, and awards.',
    'Stage lighting, UHF cordless microphones, 2x line-array sound stacks, photography crew, fast-track registration.',
    'LIVE'
  ]);

  // Also seed a second upcoming event: TechFest 2026
  await run(`
    INSERT INTO events (id, name, type, date, startTime, endTime, venue, location, guests, volunteers, budget, description, requirements, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    'techfest-2026',
    'TechFest 2026',
    'Technical Symposium',
    '10 October 2026',
    '09:00',
    '17:00',
    'IT Seminar Hall 3',
    'DDU Campus',
    150,
    15,
    35000,
    'Inter-college hackathon, coding relays, and robotics exhibition.',
    'High-speed Wi-Fi hubs, projectors, power extension strips, participant kits.',
    'Upcoming'
  ]);

  // 2. Seed Tasks (22 tasks for Felicific 2026: 17 completed, 5 pending)
  const tasks = [
    // Pending (Today / Critical)
    { id: 't-1', title: 'Confirm photographer booking for stage 2', owner: 'Vrunda Patel', priority: 'Medium', deadline: 'Today', phase: 'Before Event', status: 'Pending' },
    { id: 't-2', title: 'Arrange backup microphone & UHF receiver', owner: 'Rahul Sharma', priority: 'High', deadline: 'Today', phase: 'Before Event', status: 'Pending' },
    { id: 't-3', title: 'Print 50 participation & winner certificates', owner: 'Operations Lead', priority: 'Medium', deadline: 'Tomorrow', phase: 'Before Event', status: 'Pending' },
    { id: 't-4', title: 'Assign 2 stage management volunteers', owner: 'Unassigned', priority: 'High', deadline: 'Tomorrow', phase: 'Before Event', status: 'Pending' },
    { id: 't-5', title: 'Final volunteer briefing and walkie-talkie distribution', owner: 'Operations Lead', priority: 'High', deadline: '24 Sep', phase: 'Before Event', status: 'Pending' },

    // Completed Before Event
    { id: 't-6', title: 'Book Main Auditorium with Dean Student Affairs', owner: 'Operations Lead', priority: 'High', deadline: '10 Sep', phase: 'Before Event', status: 'Completed' },
    { id: 't-7', title: 'Submit event proposal & budget sanctioned by Faculty Advisor', owner: 'Operations Lead', priority: 'High', deadline: '12 Sep', phase: 'Before Event', status: 'Completed' },
    { id: 't-8', title: 'Design event posters & banners for campus display', owner: 'Arjun Nair', priority: 'Medium', deadline: '14 Sep', phase: 'Before Event', status: 'Completed' },
    { id: 't-9', title: 'Deploy online attendee registration form', owner: 'Amit Shah', priority: 'Medium', deadline: '15 Sep', phase: 'Before Event', status: 'Completed' },
    { id: 't-10', title: 'Select anchor duo for inauguration ceremony', owner: 'Kavya Trivedi', priority: 'Low', deadline: '15 Sep', phase: 'Before Event', status: 'Completed' },
    { id: 't-11', title: 'Confirm Chief Guest Prof. S. K. Joshi attendance', owner: 'Operations Lead', priority: 'High', deadline: '16 Sep', phase: 'Before Event', status: 'Completed' },
    { id: 't-12', title: 'Finalize stage decoration & Royal Blue backdrop design', owner: 'Pooja Trivedi', priority: 'Medium', deadline: '16 Sep', phase: 'Before Event', status: 'Completed' },
    { id: 't-13', title: 'Distribute campus security notification letter', owner: 'Rahul Sharma', priority: 'High', deadline: '17 Sep', phase: 'Before Event', status: 'Completed' },
    { id: 't-14', title: 'Set up sound mixer & PA monitor line contract', owner: 'Rahul Sharma', priority: 'High', deadline: '17 Sep', phase: 'Before Event', status: 'Completed' },
    { id: 't-15', title: 'Procure mementos & floral bouquets for guests', owner: 'Sneha Rao', priority: 'Medium', deadline: '18 Sep', phase: 'Before Event', status: 'Completed' },

    // Event Day Tasks
    { id: 't-16', title: 'Main gate QR check-in & delegate kit handover', owner: 'Vrunda Patel', priority: 'High', deadline: 'Event Day', phase: 'Event Day', status: 'Completed' },
    { id: 't-17', title: 'Chief Guest reception & escort to VIP lounge', owner: 'Operations Lead', priority: 'High', deadline: 'Event Day', phase: 'Event Day', status: 'Completed' },
    { id: 't-18', title: 'Audio line level check & podium microphone test', owner: 'Rahul Sharma', priority: 'High', deadline: 'Event Day', phase: 'Event Day', status: 'Completed' },
    { id: 't-19', title: 'Lighting sequence test & stage spot control', owner: 'Dev Malhotra', priority: 'Medium', deadline: 'Event Day', phase: 'Event Day', status: 'Completed' },

    // After Event Tasks
    { id: 't-20', title: 'Collect participant feedback & satisfaction score', owner: 'Amit Shah', priority: 'Low', deadline: '26 Sep', phase: 'After Event', status: 'Completed' },
    { id: 't-21', title: 'Auditorium premise clean-up and handover sign-off', owner: 'Priya Singh', priority: 'High', deadline: '26 Sep', phase: 'After Event', status: 'Completed' },
    { id: 't-22', title: 'Vendor invoices & final accounts settlement', owner: 'Operations Lead', priority: 'High', deadline: '27 Sep', phase: 'After Event', status: 'Completed' }
  ];

  for (const t of tasks) {
    await run(`
      INSERT INTO tasks (id, eventId, title, owner, priority, deadline, phase, status, extractedByAi)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [t.id, 'felicific-2026', t.title, t.owner, t.priority, t.deadline, t.phase, t.status, 0]);
  }

  // 3. Seed Volunteers (20 total: 18 assigned, 2 unassigned)
  const volunteers = [
    { id: 'v-1', name: 'Rahul Sharma', role: 'Stage Tech Lead', team: 'Stage Management', contact: '+91 98765 11001', tasks: 4, status: 'Assigned', checkedIn: 1, checkInTime: '08:45 AM' },
    { id: 'v-2', name: 'Vrunda Patel', role: 'Photography Lead', team: 'Photography', contact: '+91 98765 11002', tasks: 3, status: 'Assigned', checkedIn: 1, checkInTime: '08:50 AM' },
    { id: 'v-3', name: 'Operations Lead', role: 'Operations & Event Lead', team: 'Registration', contact: '+91 98765 11003', tasks: 5, status: 'Assigned', checkedIn: 1, checkInTime: '08:30 AM' },
    { id: 'v-4', name: 'Arjun Nair', role: 'Audio-Visual Tech', team: 'Technical', contact: '+91 98765 11004', tasks: 2, status: 'Assigned', checkedIn: 0, checkInTime: null },
    { id: 'v-5', name: 'Sneha Rao', role: 'VIP Hospitality', team: 'Hospitality', contact: '+91 98765 11005', tasks: 3, status: 'Assigned', checkedIn: 1, checkInTime: '09:05 AM' },
    { id: 'v-6', name: 'Pooja Trivedi', role: 'Decoration Supervisor', team: 'Logistics', contact: '+91 98765 11006', tasks: 3, status: 'Assigned', checkedIn: 1, checkInTime: '09:00 AM' },
    { id: 'v-7', name: 'Aman Verma', role: 'Fast-Track Desk Lead', team: 'Registration', contact: '+91 98765 11007', tasks: 2, status: 'Assigned', checkedIn: 1, checkInTime: '08:55 AM' },
    { id: 'v-8', name: 'Kavya Trivedi', role: 'Emcee & Stage Cue Lead', team: 'Stage Management', contact: '+91 98765 11008', tasks: 3, status: 'Assigned', checkedIn: 1, checkInTime: '09:10 AM' },
    { id: 'v-9', name: 'Amit Shah', role: 'QR Verification Coordinator', team: 'Registration', contact: '+91 98765 11009', tasks: 2, status: 'Assigned', checkedIn: 1, checkInTime: '09:12 AM' },
    { id: 'v-10', name: 'Ishita Kapoor', role: 'Faculty Welcome Escort', team: 'Hospitality', contact: '+91 98765 11010', tasks: 2, status: 'Assigned', checkedIn: 0, checkInTime: null },
    { id: 'v-11', name: 'Rohan Shah', role: 'Entrance Security Liaison', team: 'Registration', contact: '+91 98765 11011', tasks: 2, status: 'Assigned', checkedIn: 1, checkInTime: '08:40 AM' },
    { id: 'v-12', name: 'Priya Patel', role: 'Delegate Badge Distributor', team: 'Registration', contact: '+91 98765 11012', tasks: 2, status: 'Assigned', checkedIn: 1, checkInTime: '08:52 AM' },
    { id: 'v-13', name: 'Kunal Dave', role: 'Emergency First-Aid Desk', team: 'Logistics', contact: '+91 98765 11013', tasks: 1, status: 'Assigned', checkedIn: 1, checkInTime: '09:15 AM' },
    { id: 'v-14', name: 'Suresh Menon', role: 'Equipment Transport', team: 'Logistics', contact: '+91 98765 11014', tasks: 2, status: 'Assigned', checkedIn: 1, checkInTime: '08:48 AM' },
    { id: 'v-15', name: 'Ananya Joshi', role: 'Social Media & Live Stories', team: 'Photography', contact: '+91 98765 11015', tasks: 2, status: 'Assigned', checkedIn: 1, checkInTime: '09:20 AM' },
    { id: 'v-16', name: 'Vikram Mehta', role: 'Stage Lighting Operator', team: 'Technical', contact: '+91 98765 11016', tasks: 2, status: 'Assigned', checkedIn: 1, checkInTime: '09:02 AM' },
    { id: 'v-17', name: 'Neha Gupta', role: 'Refreshment Counter Lead', team: 'Hospitality', contact: '+91 98765 11017', tasks: 2, status: 'Assigned', checkedIn: 1, checkInTime: '09:18 AM' },
    { id: 'v-18', name: 'Deepak Varma', role: 'Generator Fuel Monitor', team: 'Technical', contact: '+91 98765 11018', tasks: 1, status: 'Assigned', checkedIn: 1, checkInTime: '08:58 AM' },
    // 2 Unassigned Volunteers (triggers Risk Radar)
    { id: 'v-19', name: 'Candidate 1 (Unassigned)', role: 'Stage Management Backup', team: 'Stage Management', contact: '+91 98765 11019', tasks: 0, status: 'Unassigned', checkedIn: 0, checkInTime: null },
    { id: 'v-20', name: 'Candidate 2 (Unassigned)', role: 'Stage Management Backup', team: 'Stage Management', contact: '+91 98765 11020', tasks: 0, status: 'Unassigned', checkedIn: 0, checkInTime: null }
  ];

  for (const v of volunteers) {
    await run(`
      INSERT INTO volunteers (id, eventId, name, role, team, contact, tasks, status, checkedIn, checkInTime)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [v.id, 'felicific-2026', v.name, v.role, v.team, v.contact, v.tasks, v.status, v.checkedIn, v.checkInTime]);
  }

  // 4. Seed Guests
  const guests = [
    { id: 'g-1', name: 'Prof. S. K. Joshi', contact: '+91 98765 43210', category: 'Chief Guest', rsvp: 'Accepted', checkedIn: 0, special: 'VIP Front Row, Bouquet on arrival' },
    { id: 'g-2', name: 'Dr. Anil Kumar', contact: '+91 98765 43211', category: 'Dean Student Affairs', rsvp: 'Accepted', checkedIn: 0, special: 'Stage Seating' },
    { id: 'g-3', name: 'Prof. Meera Iyer', contact: '+91 98765 43212', category: 'Faculty Advisor', rsvp: 'Accepted', checkedIn: 1, special: 'Reserved Row B' },
    { id: 'g-4', name: 'Rohit Bansal', contact: '+91 98765 43213', category: 'Alumni President', rsvp: 'Called', checkedIn: 0, special: 'Car Parking Pass' },
    { id: 'g-5', name: 'Ananya Desai', contact: '+91 98765 43214', category: 'Student Delegate', rsvp: 'Accepted', checkedIn: 1, special: 'Main Hall A' },
    { id: 'g-6', name: 'Vikram Shah', contact: '+91 98765 43215', category: 'Industry Sponsor Lead', rsvp: 'Invited', checkedIn: 0, special: 'Foyer VIP counter' },
    { id: 'g-7', name: 'Suresh Menon', contact: '+91 98765 43216', category: 'Gold Sponsor', rsvp: 'Accepted', checkedIn: 0, special: 'Stage felicitation' }
  ];

  for (const g of guests) {
    await run(`
      INSERT INTO guests (id, eventId, name, contact, category, rsvp, checkedIn, special)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [g.id, 'felicific-2026', g.name, g.contact, g.category, g.rsvp, g.checkedIn, g.special]);
  }

  // 5. Seed Vendors (1 unconfirmed Sound vendor triggers Risk Radar)
  const vendors = [
    { id: 'ven-1', name: 'SoundCraft Audio Solutions', category: 'Sound', status: 'Pending', cost: 18500, contact: '+91 98765 22001', notes: 'Stage 1 PA & cordless microphones. Contract pending confirmation.' },
    { id: 'ven-2', name: 'GlowLights Pro Events', category: 'Lighting', status: 'Confirmed', cost: 12000, contact: '+91 98765 22002', notes: 'Auditorium RGB wash & stage spot illumination.' },
    { id: 'ven-3', name: 'Bloom Decor Studios', category: 'Decoration', status: 'Confirmed', cost: 8500, contact: '+91 98765 22003', notes: 'Royal Blue stage backdrop, red carpet, and podium florals.' },
    { id: 'ven-4', name: 'PixelStory Photography', category: 'Photography', status: 'Confirmed', cost: 9000, contact: '+91 98765 22004', notes: '2 DSLR photographers + 1 gimbal videographer for after-movie.' },
    { id: 'ven-5', name: 'Spice Route Catering', category: 'Catering', status: 'Confirmed', cost: 14000, contact: '+91 98765 22005', notes: 'VIP high-tea snacks and volunteer dinner packets.' },
    { id: 'ven-6', name: 'PrintFast Digital', category: 'Printing', status: 'Confirmed', cost: 3500, contact: '+91 98765 22006', notes: 'Gate standees, 100 ID lanyards, and certificates.' }
  ];

  for (const ven of vendors) {
    await run(`
      INSERT INTO vendors (id, eventId, name, category, status, cost, contact, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [ven.id, 'felicific-2026', ven.name, ven.category, ven.status, ven.cost, ven.contact, ven.notes]);
  }

  // 6. Seed Risks (Deterministic Risk Radar)
  const risks = [
    { id: 'r-1', title: 'Sound vendor SoundCraft Audio not confirmed - Event in 6 days', severity: 'High', probability: 'High', impact: 'Stage 1 performances and microphone audio may be compromised', action: 'Review and Confirm Vendor', resolved: 0, category: 'Vendor' },
    { id: 'r-2', title: '2 volunteers unassigned for Stage Management team', severity: 'Medium', probability: 'Medium', impact: 'Backstage cue coordination and award flow delays', action: 'Auto-Assign Volunteers', resolved: 0, category: 'Volunteers' },
    { id: 'r-3', title: 'Backup microphone arrangement scheduled for Today', severity: 'Low', probability: 'Low', impact: 'Podium speech interruption if primary wireless mic batteries drop', action: 'Check Details', resolved: 0, category: 'Schedule' }
  ];

  for (const r of risks) {
    await run(`
      INSERT INTO risks (id, eventId, title, severity, probability, impact, action, resolved, category)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [r.id, 'felicific-2026', r.title, r.severity, r.probability, r.impact, r.action, r.resolved, r.category]);
  }

  // 7. Seed Activity Feed
  const activities = [
    { id: 'act-1', text: '<strong>Vrunda Patel</strong> updated task <em>Confirm photographer booking</em>', time: '12m ago', dot: 'cyan', timestamp: Date.now() - 12 * 60000 },
    { id: 'act-2', text: '<strong>ClubOps AI</strong> detected potential risk: <em>Sound vendor stage 2 not confirmed</em>', time: '18m ago', dot: 'red', timestamp: Date.now() - 18 * 60000 },
    { id: 'act-3', text: '<strong>Rahul Sharma</strong> marked <em>Sound setup contract</em> as completed', time: '35m ago', dot: 'green', timestamp: Date.now() - 35 * 60000 },
    { id: 'act-4', text: '<strong>Operations Lead</strong> approved budget for <em>GlowLights Pro lighting</em>', time: '1h ago', dot: 'purple', timestamp: Date.now() - 60 * 60000 },
    { id: 'act-5', text: '<strong>ClubOps AI</strong> generated What-If contingency protocol for <em>Heavy Rain Relocation</em>', time: '2h ago', dot: 'cyan', timestamp: Date.now() - 120 * 60000 }
  ];

  for (const a of activities) {
    await run(`
      INSERT INTO activity (id, eventId, text, time, dot, timestamp)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [a.id, 'felicific-2026', a.text, a.time, a.dot, a.timestamp]);
  }

  // 8. Seed Club Memory (Knowledge Base of past events)
  const memoryDocs = [
    {
      id: 'mem-1',
      eventName: 'Felicific 2025',
      year: '2025',
      category: 'Sound',
      title: 'SoundCraft Audio 2025 Fest Contract & Equipment Scope',
      content: 'Contracted SoundCraft Audio for ₹16,500. Deliverables included 2 line-array speaker towers, 4 UHF cordless microphones, and 1 Yamaha mixer. Key learning: Always request 2 backup wireless batteries and test line signals at 3:00 PM before soundcheck.',
      cost: 16500,
      tags: 'sound, equipment, vendor, felicific-2025'
    },
    {
      id: 'mem-2',
      eventName: 'Felicific 2025',
      year: '2025',
      category: 'Budget',
      title: 'Stage Decoration & Backdrop Expense Ledger',
      content: 'Bloom Decor was hired for ₹7,500 for royal blue satin backdrop and entrance flower arches. Total decoration budget was ₹10,000, leaving ₹2,500 surplus. Backdrop dimensions for Main Auditorium are 24ft x 12ft.',
      cost: 7500,
      tags: 'decoration, budget, expenses, auditorium'
    },
    {
      id: 'mem-3',
      eventName: 'CodeSprint 2025',
      year: '2025',
      category: 'Report',
      title: '24-Hour Hackathon Operations & Power Backup Retrospective',
      content: 'Conducted in IT Lab 3 with 120 coders. Campus generator room was notified in advance with letter #DDU/CS/2025/14. Internet router was connected to direct UPS line. Food packets distributed at 1:30 AM without delay.',
      cost: 28000,
      tags: 'hackathon, power, internet, lab, food'
    },
    {
      id: 'mem-4',
      eventName: 'Annual Fest 2024',
      year: '2024',
      category: 'Permission',
      title: 'Approved Dean Permission Letter & Safety Undertaking Template',
      content: 'Standard approved format by Dean of Student Affairs Dr. Anil Kumar. Requires specifying gate closure timing (10:00 PM), noise threshold (<65dB), fire safety inspection clearance, and next-day auditorium handover by 8:00 AM.',
      cost: 0,
      tags: 'dean, permission, letter, compliance, safety'
    },
    {
      id: 'mem-5',
      eventName: 'TechExpo 2024',
      year: '2024',
      category: 'Sponsor',
      title: 'Industry Sponsorship Deliverables & VIP High-Tea Scope',
      content: 'Secured ₹40,000 sponsorship from TCS & Local IT Consortium. Mementos procured from TrophyHouse at ₹450/piece. High-tea catered by Spice Route at ₹120/plate for 30 delegates.',
      cost: 15000,
      tags: 'sponsorship, vip, catering, mementos'
    }
  ];

  for (const m of memoryDocs) {
    await run(`
      INSERT INTO club_memory (id, eventName, year, category, title, content, cost, tags)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [m.id, m.eventName, m.year, m.category, m.title, m.content, m.cost, m.tags]);
  }

  // 9. Seed Sample Post-Event Reports
  await run(`
    INSERT INTO reports (id, eventId, title, summary, stats, issues, recommendations)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [
    'rep-2026',
    'felicific-2026',
    'Felicific 2026 — Comprehensive Retrospective Report',
    'The annual flagship event "Felicific 2026" was conducted successfully on 25 September 2026 at DDU Campus. The event maintained strict administrative compliance, zero electrical blackouts, and achieved an overall attendee satisfaction score of 92%. Fast-track QR check-in desks processed arrival crowds in under 90 seconds per delegate.',
    JSON.stringify({ guestsAttended: '82/100', volunteersTurnout: '18/20', tasksCompleted: '17/22', vendorsContracted: '6/6' }),
    '1. Stage 2 Sound system delay of 25 minutes due to unconfirmed secondary connector line.\n2. Peak entrance congestion between 5:45 PM - 6:15 PM.\n3. Spot certificate printing demand exceeded pre-printed allotment by 12 certificates.',
    '1. Pre-test secondary sound lines at least 3 hours prior to inaugural address.\n2. Deploy a permanent buffer reserve of 3 volunteers at Registration Entrance Gate.\n3. Institute digital verifiable e-certificates via QR code to eliminate on-site printing bottlenecks.'
  ]);

  console.log('Database seeding successfully completed!');
};

// Allow standalone execution: node seed.js
if (require.main === module) {
  seedDatabase(true)
    .then(() => {
      console.log('Seed script finished successfully.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Seed script error:', err);
      process.exit(1);
    });
}

module.exports = { seedDatabase };
