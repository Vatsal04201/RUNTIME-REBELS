const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');

function getFilePath(collection) {
  return path.join(DATA_DIR, `${collection}.json`);
}

function readData(collection) {
  try {
    const filePath = getFilePath(collection);
    if (!fs.existsSync(filePath)) {
      return [];
    }
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error(`Error reading ${collection}:`, err);
    return [];
  }
}

function writeData(collection, data) {
  try {
    const filePath = getFilePath(collection);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error(`Error writing ${collection}:`, err);
    return false;
  }
}

// Calculate Deterministic Operational Readiness (0 - 100%)
function calculateReadiness(eventId = 'felicific-2026') {
  const tasks = readData('tasks').filter(t => !t.eventId || t.eventId === eventId);
  const vendors = readData('vendors').filter(v => !v.eventId || v.eventId === eventId);
  const volunteers = readData('volunteers').filter(v => !v.eventId || v.eventId === eventId);
  const events = readData('events');
  const event = events.find(e => e.id === eventId) || events[0];

  const totalTasks = tasks.length || 1;
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const tasksScore = (completedTasks / totalTasks) * 40; // 40% weight

  const totalVendors = vendors.length || 1;
  const confirmedVendors = vendors.filter(v => v.status === 'confirmed').length;
  const vendorsScore = (confirmedVendors / totalVendors) * 25; // 25% weight

  const totalVolunteers = volunteers.length || 1;
  const assignedVolunteers = volunteers.filter(v => v.status === 'assigned' && v.name).length;
  const volunteersScore = (assignedVolunteers / totalVolunteers) * 25; // 25% weight

  // 10% base for event location, date, time verified
  let eventScore = 15;
  if (!event || !event.location || !event.date) {
    eventScore = 5;
  }

  const rawPercentage = tasksScore + vendorsScore + volunteersScore + eventScore;
  const percentage = Math.min(100, Math.max(0, Math.round(rawPercentage)));

  let status = 'On track';
  if (percentage < 60) status = 'Needs attention';
  else if (percentage >= 95) status = 'Event ready';

  return {
    eventId,
    eventName: event ? event.name : 'Featured Event',
    percentage,
    status,
    breakdown: {
      tasks: {
        total: totalTasks,
        completed: completedTasks,
        pending: totalTasks - completedTasks,
        score: Math.round(tasksScore)
      },
      vendors: {
        total: totalVendors,
        confirmed: confirmedVendors,
        unconfirmed: totalVendors - confirmedVendors,
        score: Math.round(vendorsScore)
      },
      volunteers: {
        total: totalVolunteers,
        assigned: assignedVolunteers,
        unassigned: totalVolunteers - assignedVolunteers,
        score: Math.round(volunteersScore)
      }
    }
  };
}

// Calculate Deterministic Operational Risks
function calculateRisks(eventId = 'felicific-2026') {
  const vendors = readData('vendors').filter(v => !v.eventId || v.eventId === eventId);
  const volunteers = readData('volunteers').filter(v => !v.eventId || v.eventId === eventId);
  const tasks = readData('tasks').filter(t => !t.eventId || t.eventId === eventId);

  const risks = [];

  // 1. Unconfirmed Critical Vendor => HIGH RISK
  vendors.forEach(v => {
    if (v.status === 'unconfirmed') {
      risks.push({
        id: `risk-vendor-${v.id}`,
        level: 'high',
        title: 'HIGH ALERT',
        message: `${v.name} (${v.category}) not confirmed — Event in 6 days`,
        category: 'Vendor',
        actionText: 'Review Risk',
        targetId: v.id
      });
    }
  });

  // 2. Unassigned Volunteers => MEDIUM RISK
  const unassignedByRole = {};
  volunteers.forEach(v => {
    if (v.status === 'unassigned' || !v.name) {
      const role = v.role || 'General';
      unassignedByRole[role] = (unassignedByRole[role] || 0) + 1;
    }
  });

  for (const [role, count] of Object.entries(unassignedByRole)) {
    if (count > 0) {
      risks.push({
        id: `risk-vol-${role.toLowerCase().replace(/\s+/g, '-')}`,
        level: 'medium',
        title: 'MEDIUM ALERT',
        message: `${count} volunteers still unassigned for ${role}`,
        category: 'Volunteers',
        actionText: 'Auto-Assign',
        role
      });
    }
  }

  // 3. Pending High-Priority Task => INFO / MEDIUM ALERT
  const pendingHighTasks = tasks.filter(t => t.status !== 'completed' && t.priority === 'high');
  if (pendingHighTasks.length > 0) {
    risks.push({
      id: 'risk-tasks-high',
      level: 'info',
      title: 'INFO ALERT',
      message: `${pendingHighTasks[0].name} scheduled for ${pendingHighTasks[0].dueDate}`,
      category: 'Schedule',
      actionText: 'Check Details',
      taskId: pendingHighTasks[0].id
    });
  }

  const counts = {
    total: risks.length,
    high: risks.filter(r => r.level === 'high').length,
    medium: risks.filter(r => r.level === 'medium').length,
    info: risks.filter(r => r.level === 'info').length
  };

  return {
    risks,
    counts
  };
}

module.exports = {
  readData,
  writeData,
  calculateReadiness,
  calculateRisks
};
