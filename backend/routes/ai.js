const express = require('express');
const router = express.Router();
const { readData, writeData } = require('../dataStore');

// Common club members for entity extraction
const KNOWN_MEMBERS = ['Rahul', 'Vrunda', 'Helli', 'Kunal', 'Priya', 'Suresh', 'Pooja', 'Amit', 'Kavya'];

// POST /api/ai/meeting-to-tasks
router.post('/meeting-to-tasks', (req, res) => {
  const { transcript, eventId = 'felicific-2026' } = req.body;

  if (!transcript || transcript.trim().length === 0) {
    return res.status(400).json({ success: false, message: 'Please provide meeting transcript text.' });
  }

  const lines = transcript.split(/\r?\n|[.;]/).map(l => l.trim()).filter(l => l.length > 8);
  const extracted = [];
  const tasks = readData('tasks');

  lines.forEach((line, index) => {
    // Detect assignee
    let assignee = 'Club Team';
    for (const member of KNOWN_MEMBERS) {
      if (new RegExp(`\\b${member}\\b`, 'i').test(line)) {
        assignee = member;
        break;
      }
    }

    // Detect priority
    let priority = 'medium';
    if (/urgent|asap|critical|immediately|emergency|high/i.test(line)) {
      priority = 'high';
    } else if (/low|whenever|optional|fyi/i.test(line)) {
      priority = 'low';
    }

    // Detect deadline
    let dueDate = 'Tomorrow';
    if (/today|tonight/i.test(line)) {
      dueDate = 'Today';
    } else if (/friday/i.test(line)) {
      dueDate = 'Friday';
    } else if (/monday/i.test(line)) {
      dueDate = 'Monday';
    } else if (/sep \d+|oct \d+/i.test(line)) {
      const match = line.match(/(sep \d+|oct \d+)/i);
      if (match) dueDate = match[1];
    }

    // Clean task title
    let taskName = line
      .replace(new RegExp(`\\b(${KNOWN_MEMBERS.join('|')})\\s+(will|should|to|needs to|is handling|handle|take care of|please)\\s*`, 'gi'), '')
      .replace(/^[-\d.)\s]+/, '')
      .trim();

    if (taskName.length < 5) return;
    taskName = taskName.charAt(0).toUpperCase() + taskName.slice(1);

    const newTask = {
      id: `task-ai-${Date.now()}-${index}`,
      name: taskName,
      assignee,
      status: 'pending',
      priority,
      dueDate,
      isToday: dueDate === 'Today',
      eventId,
      extractedByAi: true
    };

    extracted.push(newTask);
  });

  // Default fallback if no lines matched
  if (extracted.length === 0) {
    extracted.push({
      id: `task-ai-${Date.now()}-1`,
      name: 'Review meeting action points and sync with core committee',
      assignee: 'Helli',
      status: 'pending',
      priority: 'high',
      dueDate: 'Today',
      isToday: true,
      eventId,
      extractedByAi: true
    });
  }

  // Save new tasks
  const updatedTasks = [...tasks, ...extracted];
  writeData('tasks', updatedTasks);

  // Log activity
  const activities = readData('activity');
  activities.unshift({
    id: `act-${Date.now()}`,
    text: `<strong>ClubOps AI</strong> extracted <strong>${extracted.length} tasks</strong> from meeting transcript`,
    time: 'Just now',
    dot: 'purple',
    timestamp: Date.now()
  });
  writeData('activity', activities.slice(0, 20));

  res.json({
    success: true,
    count: extracted.length,
    tasks: extracted
  });
});

// POST /api/ai/generate-letter (Dean Permission / WhatsApp / PO)
router.post('/generate-letter', (req, res) => {
  const { type = 'dean_permission', eventId = 'felicific-2026' } = req.body;
  const events = readData('events');
  const event = events.find(e => e.id === eventId) || events[0];

  if (type === 'dean_permission') {
    const letter = `TO:
The Dean of Student Affairs,
Dharamsinh Desai University (DDU),
Nadiad, Gujarat.

DATE: 19 September 2026
SUBJECT: Formal Permission Request for Conducting "${event.name}"

Respected Sir,

We, the student organizing committee of the club Runtime Rebels, hereby formally request permission to conduct our annual flagship event "${event.name}" on the university campus.

EVENT SCHEDULE & VENUE DETAILS:
• Event Name: ${event.name} (${event.tagline || 'Annual Cultural & Tech Extravaganza'})
• Proposed Date: ${event.date}
• Operational Timings: ${event.time} onwards (Gate closure at 10:00 PM)
• Location: ${event.location} (Main Auditorium & Courtyard)
• Expected Attendance: ${event.totalGuests} attendees & delegates
• Student Volunteers on Duty: ${event.totalVolunteers} verified student leads

SAFETY & COMPLIANCE UNDERTAKING:
1. Campus discipline, cleanliness, and sound limits (<65 dB at boundary) will be strictly maintained.
2. Fire extinguishers and designated emergency exit routes have been verified.
3. First-aid booth will be stationed at Entrance Gate B with volunteer supervision.
4. Clean and complete handover of the auditorium premises will be done by 8:00 AM the following morning.

We request you to kindly grant us permission and instruct campus security and the electrical department to extend their cooperation.

Sincerely,
Student Organizing Core Lead: Helli Mehta
Faculty Advisor Sign-off: Prof. S. K. Joshi`;

    return res.json({ success: true, type, title: `Official Dean Permission Letter — ${event.name}`, content: letter });
  }

  if (type === 'whatsapp_broadcast') {
    const message = `🚨 *CLUBOPS AI OPERATIONAL DISPATCH: ${event.name.toUpperCase()}* 🚨
━━━━━━━━━━━━━━━━━━━━━━━━
📍 *Location:* ${event.location}
📅 *Date & Time:* ${event.date} at ${event.time}
👥 *Volunteers on Duty:* ${event.totalVolunteers} Leads

📢 *CRITICAL INSTRUCTIONS FOR ALL LEADS:*
1️⃣ *Registration Desk:* Vrunda & Amit — Open QR fast-track gates at 5:00 PM sharp.
2️⃣ *Technical & Sound:* Rahul — Stage 1 sound line check with SoundCraft Audio at 4:30 PM.
3️⃣ *Hospitality:* Kavya & Sneha — Escort Chief Guest Prof. S. K. Joshi to VIP Green Room at 5:45 PM.
4️⃣ *Safety Protocol:* Any crowd congestion or sound delays must be logged directly into ClubOps AI.

Let's make this fest unforgettable! Run the event, not the chaos! 🔥`;

    return res.json({ success: true, type, title: `Volunteer Emergency Broadcast`, content: message });
  }

  if (type === 'vendor_po') {
    const po = `PURCHASE ORDER & WORK CONTRACT
━━━━━━━━━━━━━━━━━━━━━━━━
VENDOR: SoundCraft Audio Solutions
ATTN: Mr. Rajesh Verma (+91 98765 43210)
EVENT: ${event.name} — ${event.location}
DATE OF SETUP: ${event.date} by 12:00 PM

DELIVERABLES & SPECIFICATIONS:
1. 2x Line-Array Speaker Stacks (Stage 1 Main Auditorium)
2. 4x Cordless UHF Vocal Microphones with backup receivers
3. 1x 16-Channel Yamaha Digital Sound Mixer + 2 Stage Monitor Wedges
4. 1x Dedicated on-site sound engineer on standby throughout event

COMMERCIAL TERMS:
• Total Agreed Amount: ₹18,500 (Inclusive of setup, freight, and operator)
• Advance Paid: 30% upon approval
• Balance Payment: Immediate upon satisfactory sound handover

Authorized By: Student Council Treasury & ClubOps Operations Lead`;

    return res.json({ success: true, type, title: `Vendor Work Order — SoundCraft Audio`, content: po });
  }

  res.status(400).json({ success: false, message: 'Unknown document type requested.' });
});

// POST /api/ai/generate-plan
router.post('/generate-plan', (req, res) => {
  const { eventName = 'Felicific 2026', type = 'Cultural & Tech Fest' } = req.body;
  const plan = {
    title: `AI Master Execution Plan: ${eventName}`,
    type,
    phases: [
      { phase: 'Phase 1: Pre-Event Approvals', status: 'completed', tasks: ['Dean permission submission', 'Auditorium booking confirmed', 'Club budget sanctioned'] },
      { phase: 'Phase 2: Vendor Logistics', status: 'in-progress', tasks: ['Sound & Mic setup (In negotiation)', 'LED Stage Backdrops confirmed', 'Food catering token system'] },
      { phase: 'Phase 3: Team Deployments', status: 'in-progress', tasks: ['18/20 Leads assigned to zones', 'Stage 2 sound rehearsal at 4:30 PM', 'Green room hospitality team setup'] },
      { phase: 'Phase 4: Live Event Day Control', status: 'ready', tasks: ['Fast-track QR attendee desk', 'Live stage run-sheet tracking', 'Emergency generator backup unit'] },
      { phase: 'Phase 5: Post-Event Wrap', status: 'scheduled', tasks: ['Auditorium handover protocol', 'Vendor balance disbursement', '100 Attendee feedback dispatch'] }
    ]
  };

  // Log activity
  const activities = readData('activity');
  activities.unshift({
    id: `act-${Date.now()}`,
    text: `<strong>ClubOps AI</strong> synthesized <strong>Master Execution Plan</strong> for ${eventName}`,
    time: 'Just now',
    dot: 'cyan',
    timestamp: Date.now()
  });
  writeData('activity', activities.slice(0, 20));

  res.json({ success: true, plan });
});

module.exports = router;
