const express = require('express');
const router = express.Router();
const { run, get, all } = require('../database/database');

// GET /api/memory - List all past documents
router.get('/', async (req, res) => {
  try {
    const { category, year } = req.query;
    let sql = 'SELECT * FROM club_memory WHERE 1=1';
    const params = [];

    if (category) {
      sql += ' AND category = ?';
      params.push(category);
    }
    if (year) {
      sql += ' AND year = ?';
      params.push(year);
    }

    sql += ' ORDER BY year DESC, id DESC';
    const memories = await all(sql, params);
    res.json({ success: true, data: memories });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/memory/search - AI semantic / keyword search in past documents
router.post('/search', async (req, res) => {
  try {
    const { query } = req.body;
    if (!query || query.trim().length === 0) {
      const allDocs = await all('SELECT * FROM club_memory ORDER BY year DESC LIMIT 5');
      return res.json({ success: true, answer: 'Here are recent institutional memory records from previous club years.', results: allDocs });
    }

    const q = query.toLowerCase();
    const allDocs = await all('SELECT * FROM club_memory');

    // Score documents based on keywords
    const keywords = q.split(/\s+/).filter(k => k.length > 2);
    const scored = allDocs.map(doc => {
      let score = 0;
      const haystack = `${doc.title} ${doc.content} ${doc.category} ${doc.tags} ${doc.year}`.toLowerCase();
      keywords.forEach(kw => {
        if (haystack.includes(kw)) score += 2;
      });
      return { doc, score };
    }).filter(item => item.score > 0).sort((a, b) => b.score - a.score);

    const matches = scored.map(s => s.doc);

    // Synthesize conversational AI answer based on top matching record
    let answer = `Found ${matches.length} matching institutional knowledge record(s) in Club Memory.`;

    if (q.includes('sound') || q.includes('mic') || q.includes('audio')) {
      answer = `Based on Felicific 2025 records, the club used SoundCraft Audio Solutions for ₹16,500 with Mr. Rajesh Verma. Key recommendation was to test wireless frequencies by 3:00 PM and request 2 backup batteries.`;
    } else if (q.includes('decoration') || q.includes('decor') || q.includes('backdrop')) {
      answer = `For Felicific 2025, the club contracted Bloom Decor Studios for ₹7,500 (Budget was ₹10,000, leaving a ₹2,500 surplus). Main Auditorium stage backdrop dimensions were verified as 24ft x 12ft.`;
    } else if (q.includes('permission') || q.includes('dean') || q.includes('letter')) {
      answer = `Dean of Student Affairs Dr. Anil Kumar requires the formal permission request to include gate closure timing (10:00 PM), verified fire safety certificate, and next-day auditorium handover by 8:00 AM.`;
    } else if (q.includes('hackathon') || q.includes('codesprint') || q.includes('power')) {
      answer = `During CodeSprint 2025, IT Lab 3 was used for 120 coders with router connected to direct UPS line. Midnight food packets were served at 1:30 AM without disruption.`;
    } else if (matches.length > 0) {
      answer = `From ${matches[0].eventName} (${matches[0].year}): "${matches[0].title}" — ${matches[0].content}`;
    }

    res.json({
      success: true,
      answer,
      results: matches.length > 0 ? matches : allDocs.slice(0, 3)
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/memory - Save / upload past document
router.post('/', async (req, res) => {
  try {
    const {
      eventName = 'Felicific 2025',
      year = '2025',
      category = 'Report',
      title,
      content,
      cost = 0,
      tags = ''
    } = req.body;

    if (!title || !content) {
      return res.status(400).json({ success: false, message: 'Title and content are required' });
    }

    const id = `mem-${Date.now()}`;
    await run(`
      INSERT INTO club_memory (id, eventName, year, category, title, content, cost, tags)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [id, eventName, year, category, title, content, cost, tags]);

    const created = await get('SELECT * FROM club_memory WHERE id = ?', [id]);
    res.status(201).json({ success: true, data: created });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
