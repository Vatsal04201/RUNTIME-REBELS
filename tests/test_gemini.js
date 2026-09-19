const gemini = require('../backend/services/geminiService');

async function testGeminiIntegration() {
  console.log('--- Testing Gemini Event Tasks Generation ---');
  const res = await gemini.generateEventTasksWithGemini({
    name: 'Hackathon 2026',
    type: '24-Hour Codefest',
    date: '2026-11-20',
    venue: 'Main Seminar Hall',
    guests: 120,
    volunteers: 15,
    budget: 45000,
    photographyLead: 'Ananya Joshi',
    soundLead: 'Rahul Sharma',
    registrationLead: 'Vrunda & Amit',
    stageLead: 'Sneha Patel',
    description: 'Overnight technical hackathon with coding tracks, mentoring, and demo presentations.',
    requirements: 'Wi-Fi extension hubs, 20 multi-plug extension strips, backup mic, breakfast caterer.'
  });

  if (res && res.tasks) {
    console.log('Gemini Summary:', res.summary);
    console.log(`Generated ${res.tasks.length} tasks dynamically:`);
    res.tasks.forEach((t, i) => {
      console.log(`  ${i+1}. [${t.phase}] [${t.priority}] ${t.title} (Owner: ${t.owner}, Due: ${t.deadline})`);
    });
    console.log('GEMINI INTEGRATION SUCCESSFUL!');
  } else {
    console.error('Gemini test failed or returned null');
    process.exit(1);
  }
}

testGeminiIntegration();
