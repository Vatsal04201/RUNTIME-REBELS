const express = require('express');
const router = express.Router();
const { run, get, all } = require('../database/database');
const gemini = require('../services/geminiService');

const KNOWN_MEMBERS = ['Rahul', 'Vrunda', 'Helli', 'Arjun', 'Sneha', 'Pooja', 'Aman', 'Kavya', 'Amit', 'Ishita', 'Rohan', 'Priya', 'Kunal', 'Suresh'];

// 0. POST /api/ai/transcribe-audio (Feature: Audio Import & Free AI STT)
router.post('/transcribe-audio', async (req, res) => {
  try {
    const { audioData, mimeType = 'audio/mp3' } = req.body;

    if (!audioData) {
      return res.status(400).json({ success: false, message: 'Audio data is required for transcription' });
    }

    const cleanBase64 = audioData.replace(/^data:[^;]+;base64,/, '');
    const transcript = await gemini.transcribeAudioWithGemini(cleanBase64, mimeType);

    if (!transcript) {
      return res.status(500).json({
        success: false,
        message: 'Could not transcribe audio with STT model. Please verify audio quality and retry.'
      });
    }

    res.json({
      success: true,
      transcript,
      message: 'Audio successfully transcribed into meeting text!'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 1. POST /api/ai/meeting-to-tasks (Feature 4)
router.post('/meeting-to-tasks', async (req, res) => {
  try {
    const { transcript, eventId = 'felicific-2026' } = req.body;

    if (!transcript || transcript.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Please provide meeting transcript or discussion text.' });
    }

    const lines = transcript.split(/\r?\n|[.;]/).map(l => l.trim()).filter(l => l.length > 6);
    const extracted = [];

    lines.forEach((line, index) => {
      let assignee = 'Club Team';
      for (const member of KNOWN_MEMBERS) {
        if (new RegExp(`\\b${member}\\b`, 'i').test(line)) {
          assignee = member;
          break;
        }
      }

      let priority = 'Medium';
      if (/urgent|asap|critical|immediately|emergency|high/i.test(line)) priority = 'High';
      else if (/low|optional|fyi/i.test(line)) priority = 'Low';

      let deadline = 'Tomorrow';
      if (/today|tonight/i.test(line)) deadline = 'Today';
      else if (/friday/i.test(line)) deadline = 'Friday';
      else if (/monday/i.test(line)) deadline = 'Monday';
      else if (/sep \d+|oct \d+/i.test(line)) {
        const m = line.match(/(sep \d+|oct \d+)/i);
        if (m) deadline = m[1];
      }

      let taskTitle = line
        .replace(new RegExp(`\\b(${KNOWN_MEMBERS.join('|')})\\s+(will|should|to|needs to|is handling|handle|take care of|please)\\s*`, 'gi'), '')
        .replace(/^[-\d.)\s]+/, '')
        .trim();

      if (taskTitle.length < 5) return;
      taskTitle = taskTitle.charAt(0).toUpperCase() + taskTitle.slice(1);

      extracted.push({
        id: `t-ai-${Date.now()}-${index}`,
        title: taskTitle,
        owner: assignee,
        priority,
        deadline,
        phase: 'Before Event',
        status: 'Pending',
        extractedByAi: 1
      });
    });

    if (extracted.length === 0) {
      extracted.push({
        id: `t-ai-${Date.now()}-1`,
        title: 'Review committee meeting action items and finalize schedule',
        owner: 'Helli Mehta',
        priority: 'High',
        deadline: 'Today',
        phase: 'Before Event',
        status: 'Pending',
        extractedByAi: 1
      });
    }

    // Save tasks to SQLite
    for (const t of extracted) {
      await run(`
        INSERT INTO tasks (id, eventId, title, owner, priority, deadline, phase, status, extractedByAi)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [t.id, eventId, t.title, t.owner, t.priority, t.deadline, t.phase, t.status, 1]);
    }

    await run(`
      INSERT INTO activity (id, eventId, text, time, dot, timestamp)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [`act-${Date.now()}`, eventId, `<strong>ClubOps AI</strong> extracted and saved <strong>${extracted.length} tasks</strong> from meeting notes`, 'Just now', 'purple', Date.now()]);

    res.json({
      success: true,
      count: extracted.length,
      tasks: extracted.map(t => ({
        ...t,
        name: t.title,
        assignee: t.owner,
        dueDate: t.deadline,
        isToday: t.deadline === 'Today'
      }))
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 2. POST /api/ai/forgot-check (Feature 5: "Did I Forget Anything?")
router.post('/forgot-check', async (req, res) => {
  try {
    const { eventId = 'felicific-2026' } = req.body;

    const tasks = await all('SELECT * FROM tasks WHERE eventId = ?', [eventId]);
    const volunteers = await all('SELECT * FROM volunteers WHERE eventId = ?', [eventId]);
    const vendors = await all('SELECT * FROM vendors WHERE eventId = ?', [eventId]);
    const guests = await all('SELECT * FROM guests WHERE eventId = ?', [eventId]);

    const gaps = [];

    // Check backup mic
    const hasMicBackup = tasks.some(t => /microphone|mic/i.test(t.title) && t.status.toLowerCase() === 'completed');
    if (!hasMicBackup) {
      gaps.push({
        area: 'Sound & Audio',
        severity: 'High',
        icon: 'fa-microphone',
        finding: 'No backup cordless microphone confirmed for Stage 1 podium speeches.',
        recommendation: 'Instruct SoundCraft Audio to supply 2 spare 9V batteries and 1 backup UHF handheld receiver.'
      });
    }

    // Check unassigned volunteers
    const unassignedCount = volunteers.filter(v => v.status === 'Unassigned').length;
    if (unassignedCount > 0) {
      gaps.push({
        area: 'Volunteers',
        severity: 'Medium',
        icon: 'fa-users',
        finding: `${unassignedCount} volunteer(s) currently unassigned on Stage Management.`,
        recommendation: 'Assign them to backstage queue management and VIP escort duties.'
      });
    }

    // Check unconfirmed vendors
    const pendingVendors = vendors.filter(v => v.status !== 'Confirmed' && v.status !== 'Arrived');
    if (pendingVendors.length > 0) {
      gaps.push({
        area: 'Vendor Logistics',
        severity: 'High',
        icon: 'fa-truck',
        finding: `${pendingVendors.map(v => v.name).join(', ')} contract is still marked as Pending.`,
        recommendation: 'Trigger one-click WhatsApp reminder or phone call to lock setup time before 12:00 PM.'
      });
    }

    // Check guest RSVPs
    const uncalledGuests = guests.filter(g => g.rsvp === 'Invited' || g.rsvp === 'Called');
    if (uncalledGuests.length > 0) {
      gaps.push({
        area: 'VIP Hospitality',
        severity: 'Low',
        icon: 'fa-user-clock',
        finding: `${uncalledGuests.length} VIP guest(s) have not confirmed arrival timings.`,
        recommendation: 'Send formal WhatsApp invitation reminder and request vehicle parking requirements.'
      });
    }

    res.json({
      success: true,
      totalGaps: gaps.length,
      gaps,
      summary: `AI analyzed ${tasks.length} tasks, ${volunteers.length} volunteers, ${vendors.length} vendors, and detected ${gaps.length} critical items needing immediate attention.`
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 3. POST /api/ai/what-if (Feature 16: What-If Simulator)
router.post('/what-if', async (req, res) => {
  try {
    const { scenario = 'volunteers_absent', customQuery, eventId = 'felicific-2026' } = req.body;

    let response = {};

    if (scenario === 'volunteers_absent' || (customQuery && /volunteer/i.test(customQuery))) {
      response = {
        scenario: '3 Volunteers Do Not Arrive',
        riskLevel: 'High Impact',
        possibleImpact: 'Main Registration Gate currently has 4 volunteers. If 3 are absent during peak arrival (5:30 PM - 6:15 PM), attendee wait time will spike to 12 minutes, causing courtyard queue spillover.',
        backupPlan: [
          'Instantly reassign 2 volunteers from Logistics & Decoration team (Pooja Trivedi & Kunal Dave) to Registration Gate A.',
          'Convert Helpdesk Counter into a secondary QR scan terminal.',
          'Send automated WhatsApp reminder with gate location to all volunteers.'
        ],
        readinessShift: '-12% (Recoverable to 95% with backup plan)',
        actionBtn: 'Apply Volunteer Reassignment'
      };
    } else if (scenario === 'sound_late' || (customQuery && /sound|audio/i.test(customQuery))) {
      response = {
        scenario: 'Sound Vendor Is Delayed By 1 Hour',
        riskLevel: 'Critical Impact',
        possibleImpact: 'Stage 1 inauguration requires podium sound at 6:00 PM. Delay past 5:00 PM cancels live band soundcheck and impairs faculty address acoustics.',
        backupPlan: [
          'Engage campus auditorium internal PA system as immediate primary backup.',
          'Instruct Rahul to connect Auditorium mixer board 2 to the stage monitors.',
          'Dispatch WhatsApp high-priority ping to SoundCraft Audio with updated stage arrival ETA.'
        ],
        readinessShift: '-18% (Podium speech secured via internal PA)',
        actionBtn: 'Activate Internal PA Backup'
      };
    } else if (scenario === 'heavy_rain' || (customQuery && /rain|weather/i.test(customQuery))) {
      response = {
        scenario: 'Heavy Rain & Outdoor Courtyard Unusable',
        riskLevel: 'Medium Impact',
        possibleImpact: 'Open courtyard food stalls and sponsor photo booth are exposed to rainfall. 45 outdoor attendees will crowd into the foyer.',
        backupPlan: [
          'Relocate food & refreshment distribution to Covered Corridor Section B.',
          'Move sponsor standees inside Auditorium Foyer East Wing.',
          'Deploy 2 volunteers with entrance umbrella mats to prevent slippery auditorium flooring.'
        ],
        readinessShift: '-8% (Full event safely indoors)',
        actionBtn: 'Trigger Indoor Relocation Protocol'
      };
    } else if (scenario === 'photographer_cancels' || (customQuery && /photo/i.test(customQuery))) {
      response = {
        scenario: 'Photographer Cancels Last Minute',
        riskLevel: 'Medium Impact',
        possibleImpact: 'Loss of official high-resolution keynote and award ceremony event documentation.',
        backupPlan: [
          'Activate student media team lead Ananya Joshi with 4K iPhone 15 Pro & DJI gimbal.',
          'Call backup studio PixelStory Studio (+91 98765 22004) from Club Memory list.',
          'Set up shared Google Drive QR code at registration desk for crowd-sourced attendee photos.'
        ],
        readinessShift: '-5% (Full ceremony captured)',
        actionBtn: 'Call Backup Studio & Deploy Media Team'
      };
    } else {
      response = {
        scenario: customQuery || 'General Operational Disruption',
        riskLevel: 'Analyzed by AI',
        possibleImpact: 'ClubOps AI evaluated active tasks and team allocations to model contingency risk.',
        backupPlan: [
          'Verify walkie-talkie communication channel 1 across all team leads.',
          'Ensure campus electrician is physically present at the generator switchboard.',
          'Maintain 15-minute buffer between opening ceremony and first performance.'
        ],
        readinessShift: 'Stable',
        actionBtn: 'Dispatch Protocol Update'
      };
    }

    res.json({ success: true, data: response });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 4. POST /api/ai/generate-letter (Feature 6: One-Click AI Actions)
router.post('/generate-letter', async (req, res) => {
  try {
    const { type = 'dean_permission', eventId = 'felicific-2026' } = req.body;
    const event = await get('SELECT * FROM events WHERE id = ?', [eventId]) || {
      name: 'Felicific 2026',
      date: '25 September 2026',
      time: '6:00 PM',
      location: 'DDU Campus',
      guests: 100,
      volunteers: 20
    };

    try {
      const geminiDoc = await gemini.generateDocumentWithGemini(type, event);
      if (geminiDoc && geminiDoc.content) {
        return res.json({ success: true, type, title: geminiDoc.title || `Official Document — ${event.name}`, content: geminiDoc.content });
      }
    } catch (gErr) {
      console.warn('Gemini generateDocument error:', gErr.message);
    }

    if (type === 'dean_permission') {
      const letter = `TO:
The Dean of Student Affairs,
Dharamsinh Desai University (DDU),
Nadiad, Gujarat.

DATE: 19 September 2026
SUBJECT: Formal Administrative Permission for "${event.name}"

Respected Sir,

We, the student organizing committee of Runtime Rebels, respectfully request formal permission to host our annual flagship fest "${event.name}" on university premises.

EVENT DETAILS:
• Event Name: ${event.name}
• Date & Timing: ${event.date} at ${event.startTime || '6:00 PM'} (Gate closure: 10:00 PM)
• Venue: ${event.venue || 'Main Auditorium'}, ${event.location || 'DDU Campus'}
• Expected Attendance: ${event.guests || 100} registered students & delegates
• Verified Volunteer Leads: ${event.volunteers || 20} student organizers on active duty

SAFETY & ADMINISTRATIVE UNDERTAKINGS:
1. Complete adherence to university noise thresholds (<65 dB at campus perimeter).
2. Campus security guards stationed at Entrance Gates A & B with fire extinguisher clearance.
3. Clean and complete handover of the auditorium premises by 8:00 AM the following morning.

We kindly request approval to proceed with campus infrastructure and electrical department support.

Sincerely,
Student Event Convener: Helli Mehta
Faculty Advisor Sign-off: Prof. S. K. Joshi`;

      return res.json({ success: true, type, title: `Official Dean Permission Letter — ${event.name}`, content: letter });
    }

    if (type === 'whatsapp_broadcast') {
      const msg = `🚨 *CLUBOPS AI OPERATIONAL DISPATCH: ${event.name.toUpperCase()}* 🚨
━━━━━━━━━━━━━━━━━━━━━━━━
📍 *Location:* ${event.venue || 'Main Auditorium'}, ${event.location || 'DDU Campus'}
📅 *Date & Time:* ${event.date} at ${event.startTime || '6:00 PM'}
👥 *Volunteers on Duty:* ${event.volunteers || 20} Leads

📢 *CRITICAL ZONE ASSIGNMENTS:*
1️⃣ *Registration Desk:* Vrunda & Amit — Open QR Fast-Track terminals at 5:00 PM sharp.
2️⃣ *Technical & Sound:* Rahul — Stage 1 sound line check with SoundCraft Audio at 4:30 PM.
3️⃣ *VIP Hospitality:* Sneha & Ishita — Escort Chief Guest Prof. S. K. Joshi to VIP Room at 5:45 PM.
4️⃣ *Safety Protocol:* Any crowd backlog or mic issues must be logged immediately into ClubOps AI.

Run the event, not the chaos! 🔥`;

      return res.json({ success: true, type, title: `Volunteer Emergency Broadcast`, content: msg });
    }

    if (type === 'vendor_po') {
      const po = `PURCHASE ORDER & WORK CONTRACT
━━━━━━━━━━━━━━━━━━━━━━━━
VENDOR: SoundCraft Audio Solutions
ATTN: Mr. Rajesh Verma (+91 98765 22001)
EVENT: ${event.name}
DATE OF SETUP: ${event.date} by 12:00 PM

DELIVERABLES & SCOPE OF SUPPLY:
1. 2x Line-Array Speaker Stacks (Auditorium Stage 1)
2. 4x UHF Cordless Handheld Microphones with fresh 9V batteries
3. 1x 16-Channel Yamaha Digital Sound Mixer + 2 Stage Monitor Wedges
4. 1x Dedicated on-site sound technician present throughout event

COMMERCIAL TERMS:
• Total Contract Value: ₹18,500 (Inclusive of freight, setup, and operator)
• Advance Paid: 30% on contract signing
• Balance Payment: Payable within 24 hours of successful handover

Authorized By: Student Council Treasury & ClubOps Operations Lead`;

      return res.json({ success: true, type, title: `Vendor Work Order — SoundCraft Audio`, content: po });
    }

    if (type === 'venue_change') {
      const notice = `📢 *URGENT VENUE UPDATE: ${event.name.toUpperCase()}*
━━━━━━━━━━━━━━━━━━━━━━━━
Due to unexpected weather considerations, the primary venue for today's event has been relocated:

❌ *Previous Venue:* Outdoor Courtyard
✅ *New Venue:* Main Auditorium (Covered Air-Conditioned Hall)
⏰ *Timings:* Unchanged (${event.date}, ${event.startTime || '6:00 PM'})

👉 *How to Reach:* Please enter through Main Gate B. Volunteer guides are stationed along Corridor 1 to assist you.

Thank you for your understanding!
— ${event.name} Organizing Committee`;

      return res.json({ success: true, type, title: `Emergency Venue Change Notice`, content: notice });
    }

    res.status(400).json({ success: false, message: 'Unknown document type requested' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 5. POST /api/ai/generate-plan (Feature 3: AI Event Planner)
router.post('/generate-plan', async (req, res) => {
  try {
    const { eventName = 'Felicific 2026', type = 'Cultural & Tech Festival', eventId = 'felicific-2026' } = req.body;

    let plan = null;
    try {
      plan = await gemini.generateMasterPlanWithGemini(eventName, type);
    } catch (e) {
      console.warn('Gemini generateMasterPlan error:', e.message);
    }

    if (!plan) {
      plan = {
        title: `AI Master Execution Plan: ${eventName}`,
        type,
        phases: [
          {
            phase: 'Phase 1: Before Event',
            status: 'In Progress',
            tasks: [
              'Book Main Auditorium & obtain Dean permission sign-off',
              'Finalize sound & lighting vendor contracts',
              'Assign 20 student volunteers across 6 operational zones',
              'Print 50 participation certificates and winner trophies',
              'Deploy QR fast-track registration link to all attendees'
            ]
          },
          {
            phase: 'Phase 2: Event Day',
            status: 'Ready',
            tasks: [
              'Open QR check-in desks at Main Entrance Gate A & B',
              'Escort Chief Guest and Faculty to VIP lounge',
              'Perform secondary microphone frequency audio test',
              'Oversee live stage cues and lighting transitions',
              'Monitor generator unit and electrical safety status'
            ]
          },
          {
            phase: 'Phase 3: After Event',
            status: 'Scheduled',
            tasks: [
              'Collect attendee satisfaction and feedback responses',
              'Conduct auditorium clean-up and damage inspection sign-off',
              'Disburse final payments and balance settlements to vendors',
              'Generate official ClubOps AI Post-Event Retrospective Report'
            ]
          }
        ]
      };
    }

    res.json({ success: true, plan });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 6. POST /api/ai/invitation (Feature 19: AI Invitation Card)
router.post('/invitation', async (req, res) => {
  try {
    const { eventName = 'Felicific 2026', theme = 'Ignite The Night', date = '25 September 2026', venue = 'DDU Main Auditorium' } = req.body;

    const invitation = {
      headline: `YOU'RE INVITED TO ${eventName.toUpperCase()}!`,
      theme,
      date,
      venue,
      description: `Join us for an unforgettable celebration of creativity, technology, and talent. Experience electrifying band performances, keynote sessions, and cultural showcases under one roof!`,
      rsvpDeadline: '23 September 2026',
      dressCode: 'Smart Casual / Festive',
      passType: 'VIP Guest All-Access Pass',
      shareableText: `🎉 You're invited to *${eventName}*!\nTheme: ${theme}\n📅 Date: ${date}\n📍 Venue: ${venue}\n\nReserve your pass today. Run the event, not the chaos!`
    };

    res.json({ success: true, data: invitation });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 7. POST /api/ai/messages (Feature 20: AI Message Generator)
router.post('/messages', async (req, res) => {
  try {
    const { prompt, audience = 'volunteers', tone = 'professional' } = req.body;
    let message = '';

    if (/8\s*am|morning|arrival/i.test(prompt || '')) {
      message = `👋 Hey Team! A quick reminder that all volunteers on duty for Felicific 2026 must report to the Main Auditorium by *8:00 AM sharp* for the morning briefing and walkie-talkie distribution. Breakfast will be ready at Counter 2. Let's make today phenomenal! 🚀`;
    } else if (/thank|appreciation/i.test(prompt || '')) {
      message = `✨ A heartfelt thank you to everyone who made Felicific 2026 an extraordinary success! Your dedication, late-night coordination, and operational energy brought our campus to life. Proud of our team! 🏆🎉`;
    } else if (/guest|invitation/i.test(prompt || '')) {
      message = `Respected Sir/Ma'am,\n\nWe cordially invite you as our honored guest for Felicific 2026 at Dharamsinh Desai University on 25 September 2026 at 6:00 PM. We would be privileged by your esteemed presence.\n\nWarm regards,\nStudent Organizing Committee`;
    } else {
      message = `📢 *CLUBOPS AI OPERATIONAL UPDATE:*\n\n${prompt || 'Please review your assigned zone and coordinate with your lead.'}\n\nFor any urgent support, ping the Event Operations command desk immediately.`;
    }

    res.json({ success: true, message });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
