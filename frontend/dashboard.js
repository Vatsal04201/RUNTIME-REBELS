/* =========================================================
   CLUBOPS AI — DASHBOARD CLIENT LOGIC
   Connects to Backend REST APIs & Powers Dynamic UI
   ========================================================= */

// Auto-detect API base (works whether served from backend on :5000 or frontend on :3000)
const API_BASE = window.location.port === '5000' ? '' : 'http://localhost:5000';

let searchIndex = {
  events: [],
  tasks: [],
  vendors: []
};

document.addEventListener('DOMContentLoaded', () => {
  loadDashboardData();

  // Quick action alerts
  setupQuickActions();

  // Setup Live Global Search
  setupDashboardSearch();

  // Poll for updates every 10 seconds
  setInterval(loadDashboardData, 10000);
});

// Main data loader
async function loadDashboardData() {
  try {
    const activeEvId = localStorage.getItem('clubops_active_event_id') || '';
    const summaryUrl = activeEvId ? `${API_BASE}/api/dashboard/summary?eventId=${activeEvId}` : `${API_BASE}/api/dashboard/summary`;
    const tasksUrl = activeEvId ? `${API_BASE}/api/tasks?eventId=${activeEvId}` : `${API_BASE}/api/tasks`;

    const [summaryRes, tasksRes, activityRes, eventsRes, vendorsRes] = await Promise.all([
      fetch(summaryUrl),
      fetch(tasksUrl),
      fetch(`${API_BASE}/api/activity`),
      fetch(`${API_BASE}/api/events`),
      fetch(`${API_BASE}/api/vendors`).catch(() => ({ ok: false }))
    ]);

    if (!summaryRes.ok || !tasksRes.ok || !activityRes.ok) {
      throw new Error(`API returned non-200 status`);
    }

    const summaryData = await summaryRes.json();
    const tasksData = await tasksRes.json();
    const activityData = await activityRes.json();
    const eventsData = eventsRes.ok ? await eventsRes.json() : { success: false };
    const vendorsData = vendorsRes.ok ? await vendorsRes.json() : { success: false };

    // Update Global Search Index
    if (eventsData.success && Array.isArray(eventsData.data)) searchIndex.events = eventsData.data;
    if (tasksData.success && Array.isArray(tasksData.data)) searchIndex.tasks = tasksData.data;
    if (vendorsData.success && Array.isArray(vendorsData.data)) searchIndex.vendors = vendorsData.data;

    hideConnectionBanner();

    // 1. Update Metrics & Spotlight from Summary
    if (summaryData.success) {
      renderSummary(summaryData.data);
    }

    // 2. Update Upcoming Club Events
    if (eventsData.success && Array.isArray(eventsData.data)) {
      renderAllEvents(eventsData.data);
    }

    // 3. Update Tasks & Deadlines
    if (tasksData.success) {
      renderTasks(tasksData.data);
      renderDeadlines(tasksData.data);
    }

    // 4. Update Activity Feed
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

// Quick action buttons and modal management
function setupQuickActions() {
  // 1. Meeting Transcript to Tasks Modal
  const btnQaMeeting = document.getElementById('qaConvertMeeting');
  if (btnQaMeeting) {
    btnQaMeeting.addEventListener('click', () => {
      openModal('modalMeeting');
    });
  }

  const chipSample = document.getElementById('chipSampleMeeting');
  if (chipSample) {
    chipSample.addEventListener('click', () => {
      const textarea = document.getElementById('meetingTranscriptInput');
      if (textarea) {
        textarea.value = `Core Committee Meeting (18 Sep):\n- Rahul will inspect Stage 2 sound system today.\n- Vrunda to confirm photographer booking on Friday.\n- Helli needs to print 50 certificates tomorrow.\n- Pooja to coordinate backup generator fuel check ASAP.`;
      }
    });
  }

  const btnExtract = document.getElementById('btnExtractMeeting');
  if (btnExtract) {
    btnExtract.addEventListener('click', async () => {
      const textarea = document.getElementById('meetingTranscriptInput');
      const text = textarea ? textarea.value.trim() : '';
      if (!text) {
        alert('Please enter or load a meeting transcript first.');
        return;
      }

      const prevHtml = btnExtract.innerHTML;
      btnExtract.disabled = true;
      btnExtract.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Extracting Tasks...`;

      try {
        const res = await fetch(`${API_BASE}/api/ai/meeting-to-tasks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transcript: text, eventId: 'felicific-2026' })
        });

        const data = await res.json();
        if (data.success) {
          const resultsDiv = document.getElementById('aiExtractionResults');
          if (resultsDiv) {
            resultsDiv.style.display = 'block';
            resultsDiv.innerHTML = `
              <div class="ai-extracted-title">
                <i class="fa-solid fa-circle-check"></i>
                AI Extracted & Created ${data.count} New Actionable Tasks
              </div>
              <div style="margin-top: 0.5rem;">
                ${data.tasks.map(t => `
                  <span class="ai-task-tag">
                    <i class="fa-solid fa-bolt"></i>
                    <strong>${escapeHtml(t.assignee)}:</strong> ${escapeHtml(t.name)}
                    <span style="opacity:0.7">(${escapeHtml(t.dueDate)})</span>
                  </span>
                `).join('')}
              </div>
            `;
          }

          // Refresh dashboard metrics and task list
          await loadDashboardData();
        } else {
          alert(data.message || 'Could not extract tasks.');
        }
      } catch (err) {
        console.error('Error extracting tasks:', err);
        alert('Failed to connect to backend AI endpoint.');
      } finally {
        btnExtract.disabled = false;
        btnExtract.innerHTML = prevHtml;
      }
    });
  }

  // 2. One-Click AI Official Documents Modal
  const btnQaDocs = document.getElementById('qaAiActions');
  if (btnQaDocs) {
    btnQaDocs.addEventListener('click', () => {
      openModal('modalAiDocs');
      loadAiDocument('dean_permission');
    });
  }

  const docTabs = document.querySelectorAll('.doc-tab');
  docTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      docTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const docType = tab.getAttribute('data-doctype');
      loadAiDocument(docType);
    });
  });

  const btnCopyDoc = document.getElementById('btnCopyDoc');
  if (btnCopyDoc) {
    btnCopyDoc.addEventListener('click', async () => {
      const preview = document.getElementById('docPreviewContent');
      if (preview && preview.textContent) {
        try {
          await navigator.clipboard.writeText(preview.textContent);
          const oldText = btnCopyDoc.innerHTML;
          btnCopyDoc.innerHTML = `<i class="fa-solid fa-check"></i> Copied!`;
          setTimeout(() => {
            btnCopyDoc.innerHTML = oldText;
          }, 2000);
        } catch (e) {
          console.error(e);
        }
      }
    });
  }

  // 3. AI Master Plan Generator
  const btnQaPlan = document.getElementById('qaGeneratePlan');
  if (btnQaPlan) {
    btnQaPlan.addEventListener('click', async () => {
      openModal('modalAiDocs');
      const previewTitle = document.getElementById('docPreviewTitle');
      const previewContent = document.getElementById('docPreviewContent');
      if (previewTitle) previewTitle.textContent = 'AI Master Execution Plan — Felicific 2026';
      if (previewContent) previewContent.textContent = 'Generating 5-Phase Master Execution Plan with ClubOps AI...';

      try {
        const res = await fetch(`${API_BASE}/api/ai/generate-plan`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventName: 'Felicific 2026' })
        });
        const data = await res.json();
        if (data.success && data.plan) {
          let planText = `========================================================\n` +
            `🎯 ${data.plan.title.toUpperCase()}\n` +
            `Category: ${data.plan.type} | Generated by ClubOps AI Engine\n` +
            `========================================================\n\n`;

          data.plan.phases.forEach((p, idx) => {
            planText += `[PHASE ${idx + 1}: ${p.phase.toUpperCase()}]  •  Status: ${p.status.toUpperCase()}\n`;
            p.tasks.forEach(t => {
              planText += `  ✔ ${t}\n`;
            });
            planText += `\n`;
          });
          previewContent.textContent = planText;
          loadDashboardData();
        }
      } catch (err) {
        console.error(err);
      }
    });
  }

  // 4. Quick Create Event
  const btnQaCreate = document.getElementById('qaCreateEvent');
  if (btnQaCreate) {
    btnQaCreate.addEventListener('click', async () => {
      const eventName = prompt('Enter new event name to initialize in ClubOps AI:', 'CodeSprint Hackathon 2026');
      if (eventName) {
        try {
          const res = await fetch(`${API_BASE}/api/events`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: eventName,
              tagline: 'Annual 24-Hour Inter-College Hackathon',
              date: '15 October 2026',
              time: '10:00 AM',
              location: 'Main IT Lab 3',
              totalGuests: 120,
              totalVolunteers: 15
            })
          });
          const data = await res.json();
          if (data.success) {
            alert(`Event "${eventName}" successfully created and registered!`);
            loadDashboardData();
          }
        } catch (err) {
          console.error(err);
        }
      }
    });
  }

  // 5. Event Day Command Room
  const navEventDay = document.getElementById('navEventDay');
  const btnOpenOps = document.getElementById('btnOpenOps');

  if (navEventDay) {
    navEventDay.addEventListener('click', (e) => {
      e.preventDefault();
      openModal('modalEventDay');
    });
  }

  if (btnOpenOps) {
    btnOpenOps.addEventListener('click', () => {
      openModal('modalEventDay');
    });
  }

  // Event Day Dispatch Buttons
  const btnDispatchGate = document.getElementById('btnDispatchGate');
  if (btnDispatchGate) {
    btnDispatchGate.addEventListener('click', () => {
      alert('DISPATCH CONFIRMED:\n\n2 Buffer volunteers (Rohan Shah & Priya Patel) have been notified via WhatsApp to reinforce the Main Registration Gate.');
    });
  }

  const btnDispatchTech = document.getElementById('btnDispatchTech');
  if (btnDispatchTech) {
    btnDispatchTech.addEventListener('click', () => {
      alert('DISPATCH CONFIRMED:\n\nAudio alert dispatched to Rahul: Perform Stage 2 secondary microphone line check before 1:00 PM.');
    });
  }

  const btnDispatchPower = document.getElementById('btnDispatchPower');
  if (btnDispatchPower) {
    btnDispatchPower.addEventListener('click', () => {
      alert('🚨 EMERGENCY PROTOCOL TRIGGERED:\n\nCampus Electrical Substation and Backup Generator Unit on standby for Stage 1.');
    });
  }

  // 6. AI Insight Action (Sound Vendor confirmation)
  const btnInsight = document.getElementById('btnTakeInsightAction');
  if (btnInsight) {
    btnInsight.addEventListener('click', () => {
      handleRiskAction('risk-vendor-ven-1', 'Review');
    });
  }

  // Modal Close buttons
  setupModalCloser('closeModalMeeting', 'modalMeeting');
  setupModalCloser('btnCancelMeeting', 'modalMeeting');
  setupModalCloser('closeModalAiDocs', 'modalAiDocs');
  setupModalCloser('btnCloseAiDocs', 'modalAiDocs');
  setupModalCloser('closeModalEventDay', 'modalEventDay');

  // Close modals on clicking overlay backdrop
  document.querySelectorAll('.dash-modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.classList.remove('active');
        document.body.style.overflow = '';
      }
    });
  });

  // Close modals on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.dash-modal-overlay.active').forEach(m => {
        m.classList.remove('active');
      });
      document.body.style.overflow = '';
    }
  });
}

// Modal Helper Functions
function openModal(id) {
  const el = document.getElementById(id);
  if (el) {
    el.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) {
    el.classList.remove('active');
    document.body.style.overflow = '';
  }
}

function setupModalCloser(buttonId, modalId) {
  const btn = document.getElementById(buttonId);
  if (btn) {
    btn.addEventListener('click', () => closeModal(modalId));
  }
}

// Load AI Official Document
async function loadAiDocument(type) {
  const preview = document.getElementById('docPreviewContent');
  const title = document.getElementById('docPreviewTitle');
  if (!preview) return;

  preview.textContent = 'Generating official document with ClubOps AI...';

  try {
    const res = await fetch(`${API_BASE}/api/ai/generate-letter`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, eventId: 'felicific-2026' })
    });

    const data = await res.json();
    if (data.success) {
      if (title) title.textContent = data.title;
      preview.textContent = data.content;
    } else {
      preview.textContent = 'Error: ' + (data.message || 'Unable to generate document.');
    }
  } catch (err) {
    console.error('Error fetching AI document:', err);
    preview.textContent = 'Unable to connect to backend server. Please verify port 5000 is running.';
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

// Render All Upcoming Events Grid
function renderAllEvents(events) {
  const container = document.getElementById('eventsListContainer');
  const countSub = document.getElementById('eventsCountSub');
  if (!container) return;

  if (countSub) {
    countSub.textContent = `${events.length} active & upcoming club event${events.length === 1 ? '' : 's'} managed by ClubOps AI`;
  }

  if (!events || events.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 28px; background: rgba(255,255,255,0.02); border: 1px dashed var(--border-subtle); border-radius: var(--radius-md); color: var(--text-muted);">
        <i class="fa-solid fa-calendar-plus" style="font-size: 28px; color: var(--accent-cyan); margin-bottom: 8px; display: block;"></i>
        No upcoming events created yet. <a href="create-event.html" style="color: var(--accent-cyan); text-decoration: underline;">Click here to create an event</a>!
      </div>
    `;
    return;
  }

  container.innerHTML = events.map(ev => {
    let statusClass = 'low';
    let statusBg = 'rgba(16, 185, 129, 0.15)';
    let statusColor = 'var(--accent-green)';
    let statusLabel = 'Upcoming';

    if (/live/i.test(ev.status)) {
      statusClass = 'high';
      statusBg = 'rgba(168, 85, 247, 0.15)';
      statusColor = 'var(--accent-purple)';
      statusLabel = 'LIVE';
    } else if (/prep/i.test(ev.status)) {
      statusClass = 'medium';
      statusBg = 'rgba(245, 158, 11, 0.15)';
      statusColor = 'var(--accent-amber)';
      statusLabel = 'Prep Phase';
    } else {
      statusClass = 'low';
      statusBg = 'rgba(16, 185, 129, 0.15)';
      statusColor = 'var(--accent-green)';
      statusLabel = ev.status && !/plan/i.test(ev.status) ? ev.status : 'Upcoming';
    }

    return `
      <div class="glass-card" style="padding: 18px; border: 1px solid var(--border-subtle); border-radius: var(--radius-md); display: flex; flex-direction: column; justify-content: space-between; transition: all 0.2s ease; cursor: pointer;" onclick="localStorage.setItem('clubops_active_event_id', '${ev.id}'); window.location.href='event-planner.html?eventId=${ev.id}'" onmouseover="this.style.borderColor='var(--accent-cyan)'; this.style.transform='translateY(-2px)'" onmouseout="this.style.borderColor='var(--border-subtle)'; this.style.transform='none'">
        <div>
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
            <span style="font-size: 0.72rem; font-weight: 700; color: var(--text-secondary); background: rgba(255,255,255,0.06); padding: 3px 8px; border-radius: 4px; text-transform: uppercase;">
              ${escapeHtml(ev.type || 'Fest')}
            </span>
            <span style="font-size: 0.72rem; font-weight: 700; color: ${statusColor}; background: ${statusBg}; padding: 3px 8px; border-radius: 20px; display: inline-flex; align-items: center; gap: 5px;">
              <span class="pulse-dot" style="width: 5px; height: 5px; background: ${statusColor};"></span>
              ${escapeHtml(statusLabel)}
            </span>
          </div>

          <h4 style="font-size: 1.15rem; font-weight: 800; color: #fff; margin-bottom: 8px; line-height: 1.3;">
            ${escapeHtml(ev.name)}
          </h4>

          <div style="font-size: 0.8rem; color: var(--text-secondary); display: flex; flex-direction: column; gap: 5px; margin-bottom: 16px;">
            <div><i class="fa-solid fa-calendar" style="color: var(--accent-cyan); width: 16px;"></i> ${escapeHtml(ev.date)} • ${escapeHtml(ev.startTime || '6:00 PM')}</div>
            <div><i class="fa-solid fa-location-dot" style="color: var(--accent-purple); width: 16px;"></i> ${escapeHtml(ev.venue || 'Campus Venue')}</div>
            <div><i class="fa-solid fa-users" style="color: var(--accent-blue); width: 16px;"></i> ${ev.guests || 100} guests • ${ev.volunteers || 20} volunteers</div>
          </div>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(255, 255, 255, 0.06); padding-top: 12px; margin-top: 6px;">
          <span style="font-size: 0.8rem; color: var(--accent-cyan); font-weight: 600; display: inline-flex; align-items: center; gap: 5px;">
            Open Planner <i class="fa-solid fa-arrow-right" style="font-size: 0.7rem;"></i>
          </span>
          <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600;">
            ${ev.budget ? '₹' + Number(ev.budget).toLocaleString('en-IN') : ''}
          </span>
        </div>
      </div>
    `;
  }).join('');
}

// ==========================================
// 6. GLOBAL LIVE SPOTLIGHT SEARCH
// ==========================================
function setupDashboardSearch() {
  const searchInput = document.getElementById('dashboardSearchInput');
  const searchDropdown = document.getElementById('searchResultsDropdown');
  const searchWrapper = document.getElementById('dashboardSearchWrapper');
  const kbd = document.getElementById('kbdShortcut');

  if (!searchInput || !searchDropdown) return;

  const SYSTEM_TOOLS = [
    { title: 'Event Planner & 3-Phase Board', sub: 'Manage Before/During/After phases & team leads', url: 'event-planner.html', icon: 'fa-list-check', badge: 'Tool', bg: 'rgba(6, 182, 212, 0.15)', color: 'var(--accent-cyan)' },
    { title: 'Emergency SOS Crisis Solver', sub: '1-Click resolution protocols for live event emergencies', url: 'event-sos.html', icon: 'fa-triangle-exclamation', badge: 'Crisis', bg: 'rgba(239, 68, 68, 0.15)', color: 'var(--accent-red)' },
    { title: 'One-Click AI Actions & Letters', sub: 'Generate Dean letters, WhatsApp blasts, Vendor POs', url: 'ai-actions.html', icon: 'fa-bolt', badge: 'AI Action', bg: 'rgba(168, 85, 247, 0.15)', color: 'var(--accent-purple)' },
    { title: 'Event Readiness Score Audit', sub: 'Detailed mathematical breakdown of event health', url: 'readiness.html', icon: 'fa-gauge-high', badge: 'Audit', bg: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent-green)' },
    { title: 'Live Threat Risk Radar', sub: 'Identify and resolve potential bottlenecks', url: 'risk-radar.html', icon: 'fa-shield-halved', badge: 'Radar', bg: 'rgba(245, 158, 11, 0.15)', color: 'var(--accent-amber)' },
    { title: 'Master Event Timeline', sub: 'Minute-by-minute schedule and stage run-sheet', url: 'timeline.html', icon: 'fa-clock', badge: 'Timeline', bg: 'rgba(59, 130, 246, 0.15)', color: 'var(--accent-blue)' },
    { title: 'Event Day Live Command Room', sub: 'Real-time telemetry, crowd arrivals, vendor check-ins', url: 'event-day.html', icon: 'fa-satellite-dish', badge: 'Command', bg: 'rgba(6, 182, 212, 0.15)', color: 'var(--accent-cyan)' },
    { title: 'What-If Contingency Simulator', sub: 'Simulate rain, delayed leads, and absent volunteers', url: 'what-if.html', icon: 'fa-wand-magic-sparkles', badge: 'Sim', bg: 'rgba(168, 85, 247, 0.15)', color: 'var(--accent-purple)' },
    { title: 'Club Memory Institutional Archives', sub: 'Search past event budgets, bills & agreements', url: 'club-memory.html', icon: 'fa-brain', badge: 'Memory', bg: 'rgba(59, 130, 246, 0.15)', color: 'var(--accent-blue)' },
    { title: 'Volunteer Roster & Duty Chart', sub: 'Assign and track 20 student volunteer leads', url: 'volunteers.html', icon: 'fa-users', badge: 'Team', bg: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent-green)' },
    { title: 'QR Fast-Track Check-In Terminal', sub: 'Scan digital attendee passes at venue entrance', url: 'volunteer-checkin.html', icon: 'fa-qrcode', badge: 'Check-In', bg: 'rgba(6, 182, 212, 0.15)', color: 'var(--accent-cyan)' },
    { title: 'VIP Guest Tracker & RSVPs', sub: 'Manage delegates, keynote speakers, and badge access', url: 'guests.html', icon: 'fa-user-tie', badge: 'Guests', bg: 'rgba(245, 158, 11, 0.15)', color: 'var(--accent-amber)' },
    { title: 'Vendor Procurement Directory', sub: 'Sound, lighting, catering contracts and balances', url: 'vendors.html', icon: 'fa-truck-field', badge: 'Vendor', bg: 'rgba(168, 85, 247, 0.15)', color: 'var(--accent-purple)' },
    { title: 'Post-Event Retrospective Report', sub: 'Synthesize PDF summary, expenditure & learnings', url: 'post-event.html', icon: 'fa-file-invoice', badge: 'Report', color: 'rgba(59, 130, 246, 0.15)', color: 'var(--accent-blue)' },
    { title: 'Digital Pass & Invitation Card', sub: 'Generate shareable digital invitations with QR passes', url: 'invitation.html', icon: 'fa-id-card', badge: 'Pass', bg: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent-green)' },
    { title: 'Broadcast Message Studio', sub: 'Create tailored WhatsApp/Email messages with AI', url: 'message-generator.html', icon: 'fa-paper-plane', badge: 'Messages', bg: 'rgba(6, 182, 212, 0.15)', color: 'var(--accent-cyan)' },
    { title: 'Meeting Transcript to Auto Tasks', sub: 'Extract action items from audio or chat discussion', url: 'meeting-tasks.html', icon: 'fa-microphone-lines', badge: 'AI Action', bg: 'rgba(168, 85, 247, 0.15)', color: 'var(--accent-purple)' },
    { title: 'Did I Forget Anything? Gap Check', sub: 'Proactive sanity check on all logistics', url: 'forgot-check.html', icon: 'fa-circle-question', badge: 'AI Action', bg: 'rgba(245, 158, 11, 0.15)', color: 'var(--accent-amber)' },
    { title: 'Register New College Fest', sub: 'Create event with leads for photo, sound, stage', url: 'create-event.html', icon: 'fa-plus', badge: 'Create', bg: 'rgba(6, 182, 212, 0.15)', color: 'var(--accent-cyan)' }
  ];

  let selectedIndex = -1;

  function renderSearchResults(query) {
    const q = (query || '').trim().toLowerCase();
    selectedIndex = -1;

    if (!q) {
      // Show default top tools and suggestions
      const defaultTools = SYSTEM_TOOLS.slice(0, 5);
      searchDropdown.innerHTML = `
        <div class="search-group-header"><i class="fa-solid fa-sparkles"></i> Quick Jump Tools</div>
        ${defaultTools.map((t, idx) => `
          <div class="search-result-item" data-url="${t.url}" data-idx="${idx}">
            <div class="search-item-left">
              <div class="search-item-icon" style="background:${t.bg}; color:${t.color};">
                <i class="fa-solid ${t.icon}"></i>
              </div>
              <div class="search-item-info">
                <div class="search-item-title">${escapeHtml(t.title)}</div>
                <div class="search-item-sub">${escapeHtml(t.sub)}</div>
              </div>
            </div>
            <span class="search-item-badge" style="background:${t.bg}; color:${t.color};">${t.badge}</span>
          </div>
        `).join('')}
        <div style="border-top:1px solid rgba(255,255,255,0.06); padding:8px 16px; font-size:0.75rem; color:var(--text-muted); display:flex; justify-content:space-between;">
          <span>Type to search events, tasks, vendors...</span>
          <span><kbd style="background:rgba(255,255,255,0.06); padding:1px 5px; border-radius:3px;">ESC</kbd> to close</span>
        </div>
      `;
      searchDropdown.style.display = 'block';
      bindItemClicks();
      return;
    }

    // Filter tools
    const matchedTools = SYSTEM_TOOLS.filter(t => 
      t.title.toLowerCase().includes(q) || t.sub.toLowerCase().includes(q)
    );

    // Filter events
    const matchedEvents = (searchIndex.events || []).filter(e => 
      (e.name && e.name.toLowerCase().includes(q)) ||
      (e.type && e.type.toLowerCase().includes(q)) ||
      (e.venue && e.venue.toLowerCase().includes(q)) ||
      (e.description && e.description.toLowerCase().includes(q))
    );

    // Filter tasks
    const matchedTasks = (searchIndex.tasks || []).filter(t => 
      (t.title && t.title.toLowerCase().includes(q)) ||
      (t.owner && t.owner.toLowerCase().includes(q)) ||
      (t.priority && t.priority.toLowerCase().includes(q))
    );

    // Filter vendors
    const matchedVendors = (searchIndex.vendors || []).filter(v => 
      (v.name && v.name.toLowerCase().includes(q)) ||
      (v.category && v.category.toLowerCase().includes(q)) ||
      (v.contact && v.contact.toLowerCase().includes(q))
    );

    let html = '';
    let itemIndex = 0;

    // Events group
    if (matchedEvents.length > 0) {
      html += `<div class="search-group-header"><i class="fa-solid fa-calendar-days"></i> Events (${matchedEvents.length})</div>`;
      matchedEvents.slice(0, 3).forEach(ev => {
        html += `
          <div class="search-result-item" data-action="scroll-event" data-event-id="${escapeHtml(ev.id)}" data-url="dashboard.html#upcomingEventsSection" data-idx="${itemIndex++}">
            <div class="search-item-left">
              <div class="search-item-icon" style="background:rgba(6, 182, 212, 0.15); color:var(--accent-cyan);">
                <i class="fa-solid fa-calendar-star"></i>
              </div>
              <div class="search-item-info">
                <div class="search-item-title">${escapeHtml(ev.name)}</div>
                <div class="search-item-sub">${escapeHtml(ev.date || 'Upcoming')} • ${escapeHtml(ev.venue || 'Campus Venue')}</div>
              </div>
            </div>
            <span class="search-item-badge" style="background:rgba(16, 185, 129, 0.15); color:var(--accent-green);">${escapeHtml(ev.status || 'Upcoming')}</span>
          </div>
        `;
      });
    }

    // Tasks group
    if (matchedTasks.length > 0) {
      html += `<div class="search-group-header"><i class="fa-solid fa-list-check"></i> Tasks (${matchedTasks.length})</div>`;
      matchedTasks.slice(0, 4).forEach(t => {
        const isDone = t.status && t.status.toLowerCase() === 'completed';
        html += `
          <div class="search-result-item" data-url="event-planner.html" data-idx="${itemIndex++}">
            <div class="search-item-left">
              <div class="search-item-icon" style="background:${isDone ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.15)'}; color:${isDone ? 'var(--accent-green)' : 'var(--accent-blue)'};">
                <i class="fa-solid ${isDone ? 'fa-check' : 'fa-circle-dot'}"></i>
              </div>
              <div class="search-item-info">
                <div class="search-item-title">${escapeHtml(t.title)}</div>
                <div class="search-item-sub">Assigned: ${escapeHtml(t.owner || 'Club Team')} • Due: ${escapeHtml(t.deadline || 'Event Day')}</div>
              </div>
            </div>
            <span class="search-item-badge" style="background:rgba(255, 255, 255, 0.08); color:var(--text-secondary);">${escapeHtml(t.priority || 'Task')}</span>
          </div>
        `;
      });
    }

    // Vendors group
    if (matchedVendors.length > 0) {
      html += `<div class="search-group-header"><i class="fa-solid fa-truck-field"></i> Vendors (${matchedVendors.length})</div>`;
      matchedVendors.slice(0, 3).forEach(v => {
        html += `
          <div class="search-result-item" data-url="vendors.html" data-idx="${itemIndex++}">
            <div class="search-item-left">
              <div class="search-item-icon" style="background:rgba(168, 85, 247, 0.15); color:var(--accent-purple);">
                <i class="fa-solid fa-store"></i>
              </div>
              <div class="search-item-info">
                <div class="search-item-title">${escapeHtml(v.name)}</div>
                <div class="search-item-sub">${escapeHtml(v.category || 'Vendor')} • ${v.cost ? '₹' + Number(v.cost).toLocaleString('en-IN') : 'Quote Pending'}</div>
              </div>
            </div>
            <span class="search-item-badge" style="background:rgba(168, 85, 247, 0.15); color:var(--accent-purple);">${escapeHtml(v.status || 'Active')}</span>
          </div>
        `;
      });
    }

    // System Tools group
    if (matchedTools.length > 0) {
      html += `<div class="search-group-header"><i class="fa-solid fa-compass"></i> Features & Tools (${matchedTools.length})</div>`;
      matchedTools.slice(0, 3).forEach(t => {
        html += `
          <div class="search-result-item" data-url="${t.url}" data-idx="${itemIndex++}">
            <div class="search-item-left">
              <div class="search-item-icon" style="background:${t.bg}; color:${t.color};">
                <i class="fa-solid ${t.icon}"></i>
              </div>
              <div class="search-item-info">
                <div class="search-item-title">${escapeHtml(t.title)}</div>
                <div class="search-item-sub">${escapeHtml(t.sub)}</div>
              </div>
            </div>
            <span class="search-item-badge" style="background:${t.bg}; color:${t.color};">${t.badge}</span>
          </div>
        `;
      });
    }

    // Deep search in Club Memory RAG Archives
    html += `
      <div style="border-top:1px solid rgba(255,255,255,0.08); margin-top:6px;">
        <div class="search-result-item" data-url="club-memory.html?q=${encodeURIComponent(query)}" data-idx="${itemIndex++}">
          <div class="search-item-left">
            <div class="search-item-icon" style="background:rgba(59, 130, 246, 0.18); color:var(--accent-blue);">
              <i class="fa-solid fa-brain"></i>
            </div>
            <div class="search-item-info">
              <div class="search-item-title">Search Club Memory for "${escapeHtml(query)}"</div>
              <div class="search-item-sub">Vector search across past budgets, contracts & Dean letters</div>
            </div>
          </div>
          <span style="font-size:0.75rem; color:var(--accent-blue); font-weight:700;">Query RAG →</span>
        </div>
      </div>
    `;

    searchDropdown.innerHTML = html;
    searchDropdown.style.display = 'block';
    bindItemClicks();
  }

  function bindItemClicks() {
    searchDropdown.querySelectorAll('.search-result-item').forEach(item => {
      item.addEventListener('click', () => {
        const url = item.getAttribute('data-url');
        const action = item.getAttribute('data-action');
        if (action === 'scroll-event') {
          searchDropdown.style.display = 'none';
          searchInput.value = '';
          const sec = document.getElementById('upcomingEventsSection');
          if (sec) sec.scrollIntoView({ behavior: 'smooth' });
          return;
        }
        if (url) {
          window.location.href = url;
        }
      });
    });
  }

  // Input event
  searchInput.addEventListener('input', (e) => {
    renderSearchResults(e.target.value);
  });

  searchInput.addEventListener('focus', () => {
    renderSearchResults(searchInput.value);
  });

  // Keyboard navigation
  searchInput.addEventListener('keydown', (e) => {
    const items = searchDropdown.querySelectorAll('.search-result-item');
    if (!items.length || searchDropdown.style.display === 'none') return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      selectedIndex = (selectedIndex + 1) % items.length;
      updateSelected(items);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      selectedIndex = (selectedIndex - 1 + items.length) % items.length;
      updateSelected(items);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && items[selectedIndex]) {
        items[selectedIndex].click();
      } else if (items[0]) {
        items[0].click();
      }
    } else if (e.key === 'Escape') {
      searchDropdown.style.display = 'none';
      searchInput.blur();
    }
  });

  function updateSelected(items) {
    items.forEach((item, idx) => {
      if (idx === selectedIndex) {
        item.classList.add('selected');
        item.scrollIntoView({ block: 'nearest' });
      } else {
        item.classList.remove('selected');
      }
    });
  }

  // Global Ctrl+K / Cmd+K handler
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      searchInput.focus();
      searchInput.select();
      renderSearchResults(searchInput.value);
    }
  });

  if (kbd) {
    kbd.addEventListener('click', () => {
      searchInput.focus();
      renderSearchResults(searchInput.value);
    });
  }

  // Close on outside click
  document.addEventListener('click', (e) => {
    if (searchWrapper && !searchWrapper.contains(e.target)) {
      searchDropdown.style.display = 'none';
    }
  });
}


