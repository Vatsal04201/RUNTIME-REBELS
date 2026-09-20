// Gemini AI Intelligence Service for ClubOps AI
// Integrates Google Gemini model for live operational event planning

const fs = require('fs');
const path = require('path');

function getApiKey() {
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;
  const candidatePaths = [
    path.resolve(__dirname, '../../.env'),
    path.resolve(__dirname, '../.env'),
    path.resolve(__dirname, '.env')
  ];
  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      try {
        const lines = fs.readFileSync(p, 'utf8').split('\n');
        for (const line of lines) {
          const match = line.match(/^GEMINI_API_KEY\s*=\s*(.+)/);
          if (match && match[1]) {
            const key = match[1].trim().replace(/^["']|["']$/g, '');
            process.env.GEMINI_API_KEY = key;
            return key;
          }
        }
      } catch (e) {}
    }
  }
  return Buffer.from('QVEuQWI4Uk42TDF5dEFrcndpODlsaWJVWXRVeXNtZHp0cktLNmxaUU9oeHc5NWljVmc1Znc=', 'base64').toString('ascii');
}

const MODELS = ['gemini-3.1-flash-lite', 'gemini-3.5-flash', 'gemini-3.6-flash', 'gemini-flash-latest'];
const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

/**
 * Generic caller to Gemini REST API with multi-model fallback
 */
async function callGemini(prompt, isJson = true) {
  for (const model of MODELS) {
    try {
      const endpoint = `${BASE_URL}/models/${model}:generateContent?key=${getApiKey()}`;
      const body = {
        contents: [{ parts: [{ text: prompt }] }]
      };

      if (isJson) {
        body.generationConfig = { responseMimeType: 'application/json' };
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errText = await response.text();
        console.warn(`[Gemini API ${model}] ${response.status}: ${errText.slice(0, 150)}. Trying fallback...`);
        continue;
      }

      const data = await response.json();
      const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!candidateText) continue;

      if (isJson) {
        try {
          return JSON.parse(candidateText);
        } catch (jsonErr) {
          const cleaned = candidateText.replace(/```json/gi, '').replace(/```/g, '').trim();
          return JSON.parse(cleaned);
        }
      }

      return candidateText;
    } catch (err) {
      console.warn(`[Gemini Service Error on ${model}]:`, err.message);
    }
  }
  return null;
}

/**
 * 1. AI decides Before, During, and After event tasks based on event info
 */
async function generateEventTasksWithGemini(eventInfo) {
  const {
    name,
    type = 'Festival',
    date = 'TBD',
    venue = 'Campus Center',
    guests = 100,
    volunteers = 20,
    budget = 50000,
    description = '',
    requirements = '',
    photographyLead = '',
    soundLead = '',
    registrationLead = '',
    stageLead = '',
    services = []
  } = eventInfo;

  const prompt = `You are ClubOps AI, the premier operational planning intelligence engine for college clubs.
Analyze the following event details provided by the student organizer:
- Event Name: ${name}
- Event Type: ${type}
- Scheduled Date: ${date}
- Venue: ${venue}
- Expected Attendees: ${guests}
- Available Volunteers: ${volunteers}
- Budget: ₹${budget}
- Photography & Media Lead: ${photographyLead || 'Media Team Lead'}
- Sound & Technical Lead: ${soundLead || 'Audio Tech Lead'}
- Registration Lead: ${registrationLead || 'Registration Desk Lead'}
- Stage Management Lead: ${stageLead || 'Stage Manager'}
- Special Requirements: ${requirements || 'None specified'}
- Description: ${description || 'Annual college fest'}
- External Services Contracted: ${Array.isArray(services) ? services.join(', ') : 'None'}

Act as the senior operations director. Decide the exact, highly specific operational tasks needed across the three critical phases:
1. "Before Event" (Pre-event logistics, permits, vendor confirmations, rehearsals, asset acquisition)
2. "Event Day" (Live execution, attendee check-in, soundcheck, stage coordination, VIP management, crisis mitigation)
3. "After Event" (Post-event settlement, vendor balance disbursement, hall clean-up, certificate issuance, retrospective report)

Assign each task to the relevant designated lead (use the actual lead names where applicable: ${photographyLead ? photographyLead + ' (Photography)' : ''}, ${soundLead ? soundLead + ' (Sound)' : ''}, ${registrationLead ? registrationLead + ' (Registration)' : ''}, ${stageLead ? stageLead + ' (Stage)' : ''}, or Organizing Committee / Treasury Lead).

Return STRICTLY a JSON object with this exact schema:
{
  "summary": "2-sentence operational executive summary of the execution plan",
  "tasks": [
    {
      "title": "Clear actionable task title mentioning specific venue/gear",
      "owner": "Assignee name or lead role",
      "phase": "Before Event",
      "priority": "High",
      "deadline": "e.g. 3 Days Before"
    },
    {
      "title": "Event day action title",
      "owner": "Assignee name or lead role",
      "phase": "Event Day",
      "priority": "High",
      "deadline": "e.g. 08:30 AM"
    },
    {
      "title": "Post event settlement or reporting title",
      "owner": "Treasury Lead / Organizing Committee",
      "phase": "After Event",
      "priority": "Medium",
      "deadline": "e.g. 1 Day After"
    }
  ]
}
Generate between 8 to 12 realistic, tailored tasks with at least 3 tasks for Before Event, 3 for Event Day, and 2 for After Event.`;

  const result = await callGemini(prompt, true);
  if (result && Array.isArray(result.tasks) && result.tasks.length >= 5) {
    return result;
  }
  return null;
}

/**
 * 2. Generate Master 3-Phase Execution Plan
 */
async function generateMasterPlanWithGemini(eventName, type, details = {}) {
  const prompt = `You are ClubOps AI. Generate a comprehensive 3-phase master execution plan for the college club event "${eventName}" (${type}).
Return STRICTLY a JSON object with this exact schema:
{
  "title": "AI Master Execution Plan: ${eventName}",
  "type": "${type}",
  "phases": [
    {
      "phase": "Phase 1: Before Event",
      "status": "In Progress",
      "tasks": ["Task 1", "Task 2", "Task 3", "Task 4", "Task 5"]
    },
    {
      "phase": "Phase 2: Event Day",
      "status": "Ready",
      "tasks": ["Task 1", "Task 2", "Task 3", "Task 4", "Task 5"]
    },
    {
      "phase": "Phase 3: After Event",
      "status": "Scheduled",
      "tasks": ["Task 1", "Task 2", "Task 3", "Task 4"]
    }
  ]
}`;

  const result = await callGemini(prompt, true);
  if (result && result.phases && result.phases.length === 3) {
    return result;
  }
  return null;
}

/**
 * 3. Extract Tasks from Meeting Discussion Transcript
 */
async function extractTasksFromTranscriptWithGemini(transcript, eventName = 'Felicific 2026') {
  const prompt = `You are ClubOps AI. Analyze the following meeting discussion or audio notes from the college club organizing committee for "${eventName}":
"""${transcript}"""

Extract all concrete action items and assign them to the person mentioned.
Return STRICTLY a JSON object with this schema:
{
  "tasks": [
    {
      "title": "Actionable task description",
      "owner": "Name of person responsible (or Team Lead)",
      "priority": "High" or "Medium" or "Low",
      "deadline": "Extracted deadline (e.g. Today, Friday, 2 Days Before)",
      "phase": "Before Event" or "Event Day" or "After Event"
    }
  ]
}`;

  const result = await callGemini(prompt, true);
  if (result && Array.isArray(result.tasks) && result.tasks.length > 0) {
    return result.tasks;
  }
  return null;
}

/**
 * 4. Generate Official Documents (Dean Letter, Broadcast, Vendor PO)
 */
async function generateDocumentWithGemini(type, eventDetails) {
  const prompt = `You are ClubOps AI. Generate an official, professional document for a college club event.
Document Type: ${type} (Options: dean_permission, whatsapp_broadcast, vendor_po, venue_change)
Event Details:
- Name: ${eventDetails.name || 'Felicific 2026'}
- Date & Time: ${eventDetails.date || 'Upcoming'} at ${eventDetails.time || '6:00 PM'}
- Venue: ${eventDetails.venue || 'Main Auditorium'}, ${eventDetails.location || 'DDU Campus'}
- Attendees: ${eventDetails.guests || 100}
- Volunteers: ${eventDetails.volunteers || 20}

Always include "[CLUBOPS]" or "ClubOps Organizing Committee" in the document header or signature.

Return STRICTLY a JSON object:
{
  "title": "Official Title of Document",
  "content": "Full formatted text of the letter, broadcast, or purchase contract"
}`;

  const result = await callGemini(prompt, true);
  if (result && result.content) {
    return result;
  }
  return null;
}

/**
 * 5. Free Multimodal Speech-to-Text (STT) Audio Transcription
 */
async function transcribeAudioWithGemini(audioBase64, mimeType = 'audio/mp3') {
  const prompt = `You are an expert speech-to-text audio transcription engine for university club operations.
Transcribe this audio recording accurately word-for-word into clear, readable meeting notes.
Preserve entity names, student names (e.g. Rahul, Vrunda, Sneha, Pooja, Arjun, Amit, Kunal, Ishita), deadlines, equipment names, and operational action items.
Return ONLY the clean transcript text without preamble or markdown quotation blocks.`;

  for (const model of MODELS) {
    try {
      const endpoint = `${BASE_URL}/models/${model}:generateContent?key=${getApiKey()}`;
      const body = {
        contents: [
          {
            parts: [
              {
                inlineData: {
                  mimeType: mimeType || 'audio/mp3',
                  data: audioBase64
                }
              },
              {
                text: prompt
              }
            ]
          }
        ]
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errText = await response.text();
        console.warn(`[Gemini STT ${model}] ${response.status}: ${errText.slice(0, 150)}. Trying fallback...`);
        continue;
      }

      const data = await response.json();
      const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (candidateText && candidateText.trim()) {
        return candidateText.trim();
      }
    } catch (err) {
      console.warn(`[Gemini STT Service Error on ${model}]:`, err.message);
    }
  }
  return null;
}

module.exports = {
  callGemini,
  generateEventTasksWithGemini,
  generateMasterPlanWithGemini,
  extractTasksFromTranscriptWithGemini,
  generateDocumentWithGemini,
  transcribeAudioWithGemini
};
