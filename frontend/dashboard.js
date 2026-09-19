/* =========================================================
   CLUBOPS AI — DASHBOARD CLIENT LOGIC
   Connects to Backend REST APIs & Powers Dynamic UI
   ========================================================= */

// Auto-detect API base (works whether served from backend on :5000 or frontend on :3000)
const API_BASE = window.location.port === '5000' ? '' : 'http://localhost:5000';

document.addEventListener('DOMContentLoaded', () => {
  loadDashboardData();

  // Quick action alerts
  setupQuickActions();

  // Poll for updates every 10 seconds
  setInterval(loadDashboardData, 10000);
});

// Main data loader
async function loadDashboardData() {
  try {
    const [summaryRes, tasksRes, activityRes] = await Promise.all([
      fetch(`${API_BASE}/api/dashboard/summary`),
      fetch(`${API_BASE}/api/tasks`),
      fetch(`${API_BASE}/api/activity`)
    ]);

    if (!summaryRes.ok || !tasksRes.ok || !activityRes.ok) {
      throw new Error(`API returned non-200 status`);
    }

    const summaryData = await summaryRes.json();
    const tasksData = await tasksRes.json();
    const activityData = await activityRes.json();

    hideConnectionBanner();

    // 1. Update Metrics & Spotlight from Summary
    if (summaryData.success) {
      renderSummary(summaryData.data);
    }

    // 2. Update Tasks & Deadlines
    if (tasksData.success) {
      renderTasks(tasksData.data);
      renderDeadlines(tasksData.data);
    }

    // 3. Update Activity Feed
    if (activityData.success) {
      renderActivity(activityData.data);
    }

  } catch (err) {
    console.warn('Backend connection error:', err);
    showConnectionBanner();
  }
}

// 1. Render Summary & Spotlight
function renderSummary(data) {
  // Topbar
  const topbarEvent = document.getElementById('topbarEventName');
  if (topbarEvent && data.featuredEvent) topbarEvent.textContent = data.featuredEvent.name;

  // Upcoming Events Metric
  const valEvents = document.getElementById('valUpcomingEvents');
  const footEvents = document.getElementById('nextEventFoot');
  if (valEvents) valEvents.textContent = data.upcomingEventsCount;
  if (footEvents) footEvents.textContent = data.nextEventName;

  // Tasks Metric
  const valCompleted = document.getElementById('valTasksCompleted');
  const valTotal = document.getElementById('valTasksTotal');
  const barFill = document.getElementById('tasksBarFill');
  const footRemaining = document.getElementById('valTasksRemaining');
  const navTaskCount = document.getElementById('navTaskCount');

  if (valCompleted) valCompleted.textContent = data.tasks.completed;
  if (valTotal) valTotal.textContent = `/${data.tasks.total}`;
  if (barFill) barFill.style.width = `${data.tasks.percentage}%`;
  if (footRemaining) footRemaining.textContent = `${data.tasks.pending} remaining`;
  if (navTaskCount) navTaskCount.textContent = data.tasks.pending;

  // Event Readiness Metric
  const valGauge = document.getElementById('valGaugePct');
  const gaugeFill = document.getElementById('gaugeCircleFill');
  const gaugeEvent = document.getElementById('gaugeEventName');
  const gaugeStatus = document.getElementById('gaugeStatusText');

  const pct = data.readiness.percentage;
  if (valGauge) valGauge.textContent = `${pct}%`;
  if (gaugeEvent && data.featuredEvent) gaugeEvent.textContent = data.featuredEvent.name;
  if (gaugeStatus) gaugeStatus.textContent = data.readiness.status;

  // SVG circle stroke-dashoffset calculation:
  // Circumference = 2 * PI * 24 ≈ 150.796
  // offset = 150.796 * (1 - pct / 100)
  if (gaugeFill) {
    const circumference = 150.796;
    const offset = circumference * (1 - pct / 100);
    gaugeFill.style.strokeDashoffset = offset.toFixed(1);
  }

  // Active Risks Metric
  const valRisks = document.getElementById('valActiveRisksCount');
  const pillHigh = document.getElementById('pillHighCount');
  const pillMed = document.getElementById('pillMedCount');
  const navRiskCount = document.getElementById('navRiskCount');

  if (valRisks) valRisks.textContent = data.risks.total;
  if (pillHigh) pillHigh.textContent = `${data.risks.high} High`;
  if (pillMed) pillMed.textContent = `${data.risks.medium} Medium`;
  if (navRiskCount) navRiskCount.textContent = data.risks.total;

  // Spotlight Featured Event
  if (data.featuredEvent) {
    const fe = data.featuredEvent;
    const spTitle = document.getElementById('spotlightTitle');
    const spDate = document.getElementById('spotlightDate');
    const spTime = document.getElementById('spotlightTime');
    const spLoc = document.getElementById('spotlightLocation');
    const spGuests = document.getElementById('spotlightGuests');
    const spVols = document.getElementById('spotlightVolunteers');
    const spProgText = document.getElementById('spotlightReadinessText');
    const spProgBar = document.getElementById('spotlightReadinessBar');

    if (spTitle) spTitle.textContent = fe.name;
    if (spDate) spDate.innerHTML = `<i class="fa-solid fa-calendar"></i> ${fe.date}`;
    if (spTime) spTime.innerHTML = `<i class="fa-solid fa-clock"></i> ${fe.time}`;
    if (spLoc) spLoc.innerHTML = `<i class="fa-solid fa-location-dot"></i> ${fe.location}`;
    if (spGuests) spGuests.innerHTML = `<i class="fa-solid fa-users"></i> ${fe.totalGuests} Guests`;
    if (spVols) spVols.innerHTML = `<i class="fa-solid fa-handshake"></i> ${fe.totalVolunteers} Volunteers`;
    if (spProgText) spProgText.textContent = `${pct}% completed`;
    if (spProgBar) spProgBar.style.width = `${pct}%`;
  }

  // AI Attention Engine Alerts
  renderAiAlerts(data.risks.list);

  // AI Insight Card
  const insightText = document.getElementById('aiInsightText');
  if (insightText && data.aiInsight) {
    insightText.innerHTML = data.aiInsight.text;
  }
}

// 2. Render Today's Tasks
function renderTasks(tasks) {
  const container = document.getElementById('taskListContainer');
  const attentionText = document.getElementById('tasksAttentionText');
  if (!container) return;

  // Filter tasks marked for Today or the top 3 critical tasks
  let todayTasks = tasks.filter(t => t.isToday);
  if (todayTasks.length === 0) {
    todayTasks = tasks.slice(0, 3);
  }

  const pendingCount = todayTasks.filter(t => t.status !== 'completed').length;
  if (attentionText) {
    attentionText.textContent = `${pendingCount} task${pendingCount === 1 ? '' : 's'} need your attention`;
  }

  container.innerHTML = todayTasks.map(task => {
    const isDone = task.status === 'completed';
    const priorityClass = task.priority || 'medium';
    const priorityLabel = isDone ? 'Completed' : capitalize(task.priority || 'medium');
    const pillClass = isDone ? 'low' : priorityClass;

    return `
      <div class="task-row ${isDone ? 'done' : ''}" data-task-id="${task.id}">
        <div class="task-check ${isDone ? 'checked' : ''}" onclick="toggleTaskStatus('${task.id}', '${isDone ? 'pending' : 'completed'}')">
          ${isDone ? '<i class="fa-solid fa-check"></i>' : ''}
        </div>
        <div class="task-body">
          <div class="task-name">${escapeHtml(task.name)}</div>
          <div class="task-meta">
            <span><i class="fa-solid fa-user"></i> ${escapeHtml(task.assignee)}</span>
            <span><i class="fa-solid fa-clock"></i> ${escapeHtml(task.dueDate || 'Today')}</span>
          </div>
        </div>
        <span class="priority-pill ${pillClass}">${priorityLabel}</span>
      </div>
    `;
  }).join('');
}

// Interactive Task Checkbox Toggle
async function toggleTaskStatus(taskId, nextStatus) {
  try {
    // Optimistic UI state toggle
    const row = document.querySelector(`.task-row[data-task-id="${taskId}"]`);
    if (row) {
      row.style.opacity = '0.5';
    }

    const res = await fetch(`${API_BASE}/api/tasks/${taskId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status: nextStatus })
    });

    if (!res.ok) {
      throw new Error('Failed to update task');
    }

    // Refresh dashboard data and recalculate statistics
    await loadDashboardData();

  } catch (err) {
    console.error('Error updating task:', err);
    alert('Unable to update task. Please ensure the backend is running on port 5000.');
    loadDashboardData();
  }
}

// 3. Render AI Attention Engine
function renderAiAlerts(risks) {
  const container = document.getElementById('aiAlertsContainer');
  if (!container) return;

  if (!risks || risks.length === 0) {
    container.innerHTML = `
      <div class="ai-alert info">
        <div class="alert-icon"><i class="fa-solid fa-circle-check"></i></div>
        <div class="alert-body">
          <div class="alert-title">ALL CLEAR</div>
          <div class="alert-text">No active operational risks detected!</div>
        </div>
      </div>
    `;
    return;
  }

  container.innerHTML = risks.map(r => {
    let iconClass = 'fa-solid fa-circle-exclamation';
    if (r.level === 'info') iconClass = 'fa-solid fa-circle-info';

    return `
      <div class="ai-alert ${r.level}">
        <div class="alert-icon"><i class="${iconClass}"></i></div>
        <div class="alert-body">
          <div class="alert-title">${escapeHtml(r.title || r.level.toUpperCase() + ' ALERT')}</div>
          <div class="alert-text">${escapeHtml(r.message)}</div>
        </div>
        <button class="btn-ghost" onclick="handleRiskAction('${r.id}', '${r.actionText || 'Review'}')">
          ${escapeHtml(r.actionText || 'Review Risk')}
        </button>
      </div>
    `;
  }).join('');
}

// 4. Render Upcoming Deadlines from pending tasks
function renderDeadlines(tasks) {
  const container = document.getElementById('deadlineListContainer');
  if (!container) return;

  // Filter tasks that are pending, sorted by importance
  const pendingTasks = tasks.filter(t => t.status !== 'completed').slice(0, 3);

  if (pendingTasks.length === 0) {
    container.innerHTML = `<div style="font-size:0.8rem; color:#64748b; padding:10px;">No pending deadlines today!</div>`;
    return;
  }

  container.innerHTML = pendingTasks.map(t => {
    return `
      <div class="deadline-item">
        <div class="deadline-date">${escapeHtml(t.dueDate || 'Soon')}</div>
        <div class="deadline-body">
          <div class="deadline-title">${escapeHtml(t.name)}</div>
          <div class="deadline-tag ${t.priority || 'medium'}">${capitalize(t.priority || 'medium')}</div>
        </div>
      </div>
    `;
  }).join('');
}

// 5. Render Live Activity Feed
function renderActivity(activities) {
  const container = document.getElementById('activityListContainer');
  if (!container) return;

  container.innerHTML = activities.slice(0, 5).map(act => {
    return `
      <div class="activity-item">
        <div class="activity-dot ${act.dot || 'cyan'}"></div>
        <div class="activity-body">
          <div class="activity-text">${act.text}</div>
          <div class="activity-time">${escapeHtml(act.time || 'recently')}</div>
        </div>
      </div>
    `;
  }).join('');
}

// Risk action handler (e.g. auto-assigning or reviewing)
async function handleRiskAction(riskId, actionText) {
  if (riskId.includes('risk-vendor')) {
    const confirmChoice = confirm('Confirm SoundCraft Audio Solutions for Felicific 2026? This will boost event readiness!');
    if (confirmChoice) {
      try {
        await fetch(`${API_BASE}/api/vendors/ven-1`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'confirmed' })
        });
        alert('Sound vendor confirmed! Readiness updated.');
        loadDashboardData();
      } catch (e) {
        console.error(e);
      }
    }
  } else if (riskId.includes('risk-vol')) {
    const volName = prompt('Enter name of volunteer to assign to Stage Management:', 'Pooja Trivedi');
    if (volName) {
      try {
        await fetch(`${API_BASE}/api/volunteers/vol-19`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: volName, status: 'assigned' })
        });
        alert(`Assigned ${volName} to Stage Management!`);
        loadDashboardData();
      } catch (e) {
        console.error(e);
      }
    }
  } else {
    alert(`Triggered: ${actionText}`);
  }
}

// Quick action buttons
function setupQuickActions() {
  const actions = {
    qaCreateEvent: 'Create Event modal',
    qaGeneratePlan: 'AI Event Planner',
    qaConvertMeeting: 'Meeting Transcript Parser',
    qaAiActions: 'One-Click Official Letter / PDF Generator',
    btnOpenOps: 'Event Operations Console',
    btnTakeInsightAction: 'Sound Vendor Confirmation & Readiness Booster'
  };

  for (const [id, label] of Object.entries(actions)) {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('click', () => {
        if (id === 'btnTakeInsightAction') {
          handleRiskAction('risk-vendor-ven-1', 'Review');
        } else {
          alert(`${label} will open here.`);
        }
      });
    }
  }
}

// Helpers
function showConnectionBanner() {
  const banner = document.getElementById('connection-banner');
  if (banner) {
    banner.style.display = 'block';
    banner.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> Backend server is offline. Please start it with <code>npm start</code> in the <code>backend/</code> folder.`;
  }
}

function hideConnectionBanner() {
  const banner = document.getElementById('connection-banner');
  if (banner) {
    banner.style.display = 'none';
  }
}

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
