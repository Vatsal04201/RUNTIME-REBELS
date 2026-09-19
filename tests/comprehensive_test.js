// Comprehensive End-to-End Test Suite for ClubOps AI
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5000';
let passed = 0;
let failed = 0;
const failures = [];

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`  \x1b[32m✔\x1b[0m ${message}`);
  } else {
    failed++;
    failures.push(message);
    console.log(`  \x1b[31m✖\x1b[0m ${message}`);
  }
}

async function testPages() {
  console.log('\n--- 1. TESTING ALL 22 HTML PAGES ---');
  const pages = [
    'index.html',
    'dashboard.html',
    'create-event.html',
    'event-planner.html',
    'meeting-tasks.html',
    'forgot-check.html',
    'ai-actions.html',
    'volunteers.html',
    'volunteer-checkin.html',
    'guests.html',
    'vendors.html',
    'vendor-finder.html',
    'risk-radar.html',
    'readiness.html',
    'timeline.html',
    'event-day.html',
    'event-sos.html',
    'what-if.html',
    'club-memory.html',
    'post-event.html',
    'invitation.html',
    'message-generator.html'
  ];

  for (const page of pages) {
    try {
      const res = await fetch(`${BASE_URL}/${page}`);
      assert(res.status === 200, `Page /${page} returns HTTP 200 (Got ${res.status})`);
      const text = await res.text();
      assert(text.length > 500, `Page /${page} content size is substantial (${text.length} bytes)`);
      assert(text.includes('ClubOps AI') || text.includes('ClubOps'), `Page /${page} contains ClubOps branding`);
    } catch (e) {
      assert(false, `Page /${page} failed with network error: ${e.message}`);
    }
  }
}

async function testStaticAssets() {
  console.log('\n--- 2. TESTING CSS & JS ASSETS ON DISK & SERVER ---');
  const assetFiles = [
    'style.css',
    'dashboard.css',
    'dashboard.js',
    'shared.css',
    'shared.js',
    'app.js'
  ];

  for (const asset of assetFiles) {
    try {
      const res = await fetch(`${BASE_URL}/${asset}`);
      assert(res.status === 200, `Asset /${asset} is served successfully (HTTP 200)`);
      const text = await res.text();
      assert(text.length > 100, `Asset /${asset} is not empty (${text.length} bytes)`);
    } catch (e) {
      assert(false, `Asset /${asset} failed: ${e.message}`);
    }
  }
}

async function testRestApis() {
  console.log('\n--- 3. TESTING ALL REST API ENDPOINTS & CRUD ---');

  // Summary
  const summaryRes = await fetch(`${BASE_URL}/api/dashboard/summary`);
  const summary = await summaryRes.json();
  assert(summary.success === true, 'GET /api/dashboard/summary returns success: true');
  assert(typeof summary.data.upcomingEventsCount === 'number', 'Summary has numeric upcomingEventsCount');
  assert(typeof summary.data.nextEventName === 'string', `Summary has nextEventName: "${summary.data.nextEventName}"`);
  assert(summary.data.tasks.total > 0, `Summary reports ${summary.data.tasks.total} total tasks`);

  // Events
  const eventsRes = await fetch(`${BASE_URL}/api/events`);
  const events = await eventsRes.json();
  assert(events.success === true, 'GET /api/events returns success: true');
  assert(Array.isArray(events.data) && events.data.length >= 2, `GET /api/events has ${events.data?.length} events`);
  
  // Verify upcoming events have 'Upcoming' status
  const techfest = events.data.find(e => e.id === 'techfest-2026');
  assert(techfest && techfest.status === 'Upcoming', 'TechFest 2026 has status="Upcoming"');

  // Create new event test
  const testEventId = `test-evt-${Date.now()}`;
  const createEvtRes = await fetch(`${BASE_URL}/api/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Automated Test Symposium',
      type: 'Technical Symposium',
      date: '2026-11-15',
      venue: 'Auditorium 2',
      budget: 15000,
      status: 'Upcoming',
      photographyLead: 'Test Lead',
      soundLead: 'Sound Lead',
      registrationLead: 'Reg Lead',
      stageLead: 'Stage Lead',
      services: ['stage-lighting', 'fast-registration']
    })
  });
  const createdEvt = await createEvtRes.json();
  assert(createdEvt.success === true, 'POST /api/events creates event with leads & services');
  assert(createdEvt.data.status === 'Upcoming', 'POST /api/events defaults or sets status="Upcoming"');

  // Delete test event
  if (createdEvt.data?.id) {
    const delRes = await fetch(`${BASE_URL}/api/events/${createdEvt.data.id}`, { method: 'DELETE' });
    const delData = await delRes.json();
    assert(delData.success === true, `DELETE /api/events/${createdEvt.data.id} cleans up test event`);
  }

  // Tasks
  const tasksRes = await fetch(`${BASE_URL}/api/tasks?eventId=felicific-2026`);
  const tasks = await tasksRes.json();
  assert(tasks.success === true && Array.isArray(tasks.data), 'GET /api/tasks returns tasks array');

  // Volunteers
  const volRes = await fetch(`${BASE_URL}/api/volunteers?eventId=felicific-2026`);
  const vols = await volRes.json();
  assert(vols.success === true && vols.data.length > 0, `GET /api/volunteers returns ${vols.data?.length} volunteers`);

  // Guests
  const guestRes = await fetch(`${BASE_URL}/api/guests?eventId=felicific-2026`);
  const guests = await guestRes.json();
  assert(guestRes.status === 200, 'GET /api/guests returns HTTP 200');

  // Vendors
  const vendorRes = await fetch(`${BASE_URL}/api/vendors?eventId=felicific-2026`);
  const vendors = await vendorRes.json();
  assert(vendors.success === true, 'GET /api/vendors returns vendors list');

  // Risks
  const riskRes = await fetch(`${BASE_URL}/api/risks?eventId=felicific-2026`);
  const risks = await riskRes.json();
  assert(risks.success === true, 'GET /api/risks returns risks list');

  // Readiness
  const readyRes = await fetch(`${BASE_URL}/api/readiness?eventId=felicific-2026`);
  const readiness = await readyRes.json();
  assert(readiness.success === true, 'GET /api/readiness returns readiness score');

  // Activity
  const actRes = await fetch(`${BASE_URL}/api/activity?eventId=felicific-2026`);
  const activity = await actRes.json();
  assert(activity.success === true, 'GET /api/activity returns recent activity');

  // Memory
  const memRes = await fetch(`${BASE_URL}/api/memory?query=sound`);
  const memory = await memRes.json();
  assert(memRes.status === 200, 'GET /api/memory returns memory search results');

  // Reports
  const repRes = await fetch(`${BASE_URL}/api/reports?eventId=felicific-2026`);
  const rep = await repRes.json();
  assert(repRes.status === 200, 'GET /api/reports returns reports');
}

async function testAiActions() {
  console.log('\n--- 4. TESTING AI INTELLIGENCE ACTIONS ---');

  // Meeting to tasks
  const meetingRes = await fetch(`${BASE_URL}/api/ai/meeting-to-tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      transcript: 'Vatsal needs to confirm sound vendor by Friday. Priya should arrange 200 participant badges.',
      eventId: 'felicific-2026'
    })
  });
  const meetingData = await meetingRes.json();
  assert(meetingData.success === true && Array.isArray(meetingData.tasks), 'AI meeting-to-tasks extracts actionable tasks');

  // Forgot check
  const forgotRes = await fetch(`${BASE_URL}/api/ai/forgot-check`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ eventId: 'felicific-2026' })
  });
  const forgotData = await forgotRes.json();
  assert(forgotData.success === true && Array.isArray(forgotData.gaps), 'AI forgot-check analyzes operational gaps');

  // Dean Letter via generate-letter
  const letterRes = await fetch(`${BASE_URL}/api/ai/generate-letter`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'dean_permission',
      eventId: 'felicific-2026'
    })
  });
  const letterData = await letterRes.json();
  assert(letterData.success === true && letterData.content.includes('Dean'), 'AI generate-letter generates formal Dean permission letter');

  // WhatsApp Broadcast via generate-letter
  const blastRes = await fetch(`${BASE_URL}/api/ai/generate-letter`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'whatsapp_broadcast',
      eventId: 'felicific-2026'
    })
  });
  const blastData = await blastRes.json();
  assert(blastData.success === true && blastData.content.includes('CLUBOPS'), 'AI generate-letter creates tailored volunteer broadcast');

  // Vendor PO via generate-letter
  const poRes = await fetch(`${BASE_URL}/api/ai/generate-letter`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'vendor_po',
      eventId: 'felicific-2026'
    })
  });
  const poData = await poRes.json();
  assert(poData.success === true && poData.content.includes('PURCHASE ORDER'), 'AI generate-letter generates official vendor work contract');

  // AI Master Plan
  const planRes = await fetch(`${BASE_URL}/api/ai/generate-plan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      eventName: 'Felicific 2026',
      type: 'Cultural & Tech'
    })
  });
  const planData = await planRes.json();
  assert(planData.success === true && Array.isArray(planData.plan.phases), 'AI generate-plan generates 3-phase execution roadmap');

  // What-If Simulator
  const whatIfRes = await fetch(`${BASE_URL}/api/ai/what-if`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      scenario: 'heavy_rain',
      eventId: 'felicific-2026'
    })
  });
  const whatIfData = await whatIfRes.json();
  assert(whatIfData.success === true && whatIfData.data.scenario.includes('Rain'), 'AI what-if analyzes scenario impact and contingency plan');

  // AI Invitation
  const inviteRes = await fetch(`${BASE_URL}/api/ai/invitation`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      eventName: 'Felicific 2026',
      theme: 'Ignite The Night'
    })
  });
  const inviteData = await inviteRes.json();
  assert(inviteData.success === true && inviteData.data.headline.includes('FELICIFIC'), 'AI invitation generates invitation pass');

  // AI Messages
  const msgRes = await fetch(`${BASE_URL}/api/ai/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: 'remind volunteers to arrive by 8 am',
      audience: 'volunteers'
    })
  });
  const msgData = await msgRes.json();
  assert(msgData.success === true && msgData.message.includes('8:00 AM'), 'AI messages generates instant targeted message');
}

async function testDashboardDomIntegrity() {
  console.log('\n--- 5. TESTING DASHBOARD DOM ID INTEGRITY ---');
  const dashboardHtml = fs.readFileSync(path.join(__dirname, '../frontend/dashboard.html'), 'utf8');

  const requiredIds = [
    'topbarEventName',
    'valUpcomingEvents',
    'nextEventFoot',
    'upcomingEventsSection',
    'eventsListContainer',
    'eventsCountSub',
    'valTasksFraction',
    'valTasksCompleted',
    'valTasksTotal',
    'tasksBarFill',
    'valTasksRemaining',
    'navTaskCount',
    'valGaugePct',
    'gaugeCircleFill',
    'gaugeEventName',
    'valActiveRisksCount',
    'pillHighCount',
    'pillMedCount',
    'spotlightTitle',
    'spotlightDate',
    'spotlightLocation',
    'spotlightLivePill',
    'taskListContainer',
    'activityListContainer',
    'deadlineListContainer',
    'aiInsightText'
  ];

  for (const id of requiredIds) {
    const exists = dashboardHtml.includes(`id="${id}"`);
    assert(exists, `dashboard.html contains element with id="${id}"`);
  }
}

async function run() {
  console.log('====================================================');
  console.log('   CLUBOPS AI COMPLETE WEBSITE AUTOMATED TEST SUITE  ');
  console.log('====================================================');

  await testPages();
  await testStaticAssets();
  await testRestApis();
  await testAiActions();
  await testDashboardDomIntegrity();

  console.log('\n====================================================');
  console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('====================================================');

  if (failed > 0) {
    console.log('\nFailed Tests:');
    failures.forEach(f => console.log(` - ${f}`));
    process.exit(1);
  } else {
    console.log('\n\x1b[32mALL TESTS PASSED WITH 100% SUCCESS!\x1b[0m\n');
    process.exit(0);
  }
}

run().catch(e => {
  console.error('Test suite uncaught exception:', e);
  process.exit(1);
});
