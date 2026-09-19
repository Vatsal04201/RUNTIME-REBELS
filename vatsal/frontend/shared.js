/* ============================================================
   ClubOps AI — Shared Foundation Script
   Loaded on every internal page.
   Handles: sidebar, toasts, modals, AI loader, API client, helpers.
   ============================================================ */

(function (global) {
  'use strict';

  const API_BASE = window.location.port === '5000' ? '' : 'http://localhost:5000';

  /* ============================================================
     1. NAVIGATION MAP
     Single source of truth for the sidebar.
     `key` matches the data-page attribute on <body>.
     ============================================================ */
  const NAV = [
    {
      section: 'MAIN',
      items: [
        { key: 'dashboard',  label: 'Dashboard',  icon: 'fa-gauge-high',      href: 'dashboard.html' },
        { key: 'events',     label: 'Events',     icon: 'fa-calendar-days',   href: 'create-event.html' },
        { key: 'tasks',      label: 'Tasks',      icon: 'fa-list-check',      href: 'meeting-tasks.html' },
        { key: 'volunteers', label: 'Volunteers', icon: 'fa-people-group',    href: 'volunteers.html' },
        { key: 'guests',     label: 'Guests',     icon: 'fa-user-check',      href: 'guests.html' },
        { key: 'vendors',    label: 'Vendors',    icon: 'fa-truck-field',     href: 'vendors.html' }
      ]
    },
    {
      section: 'INTELLIGENCE',
      items: [
        { key: 'planner',    label: 'AI Event Planner',      icon: 'fa-wand-magic-sparkles', href: 'event-planner.html' },
        { key: 'meeting',    label: 'Meeting → Tasks',       icon: 'fa-microphone-lines',    href: 'meeting-tasks.html' },
        { key: 'forgot',     label: 'Did I Forget Anything?', icon: 'fa-circle-question',    href: 'forgot-check.html' },
        { key: 'risk',       label: 'Risk Radar',            icon: 'fa-triangle-exclamation', href: 'risk-radar.html' },
        { key: 'readiness',  label: 'Event Readiness',       icon: 'fa-gauge',               href: 'readiness.html' },
        { key: 'whatif',     label: 'What-If Simulator',     icon: 'fa-flask',               href: 'what-if.html' },
        { key: 'memory',     label: 'Club Memory',           icon: 'fa-brain',               href: 'club-memory.html' }
      ]
    },
    {
      section: 'EVENT DAY',
      items: [
        { key: 'timeline',   label: 'Event Timeline',  icon: 'fa-timeline',        href: 'timeline.html' },
        { key: 'eventday',   label: 'Event Day',       icon: 'fa-satellite-dish',  href: 'event-day.html' },
        { key: 'sos',        label: 'Event SOS',       icon: 'fa-kit-medical',     href: 'event-sos.html' },
        { key: 'checkin',    label: 'Volunteer Check-In', icon: 'fa-qrcode',       href: 'volunteer-checkin.html' }
      ]
    },
    {
      section: 'AI TOOLS',
      items: [
        { key: 'actions',    label: 'One-Click Actions',   icon: 'fa-bolt',           href: 'ai-actions.html' },
        { key: 'vendorfind', label: 'Vendor Directory',    icon: 'fa-magnifying-glass-dollar', href: 'vendor-finder.html' },
        { key: 'invitation', label: 'Invitation Generator', icon: 'fa-envelope-open-text', href: 'invitation.html' },
        { key: 'messages',   label: 'Message Generator',   icon: 'fa-comment-dots',   href: 'message-generator.html' },
        { key: 'postevent',  label: 'Post-Event Report',   icon: 'fa-file-lines',     href: 'post-event.html' }
      ]
    }
  ];

  /* ============================================================
     2. SIDEBAR RENDER
     ============================================================ */
  function renderSidebar() {
    const mount = document.getElementById('sidebar');
    if (!mount) return;

    const current = document.body.dataset.page || '';

    let html = `
      <div class="brand">
        <a href="index.html" style="display:flex; align-items:center; gap:10px;">
          <div class="brand-logo"><i class="fa-solid fa-cube"></i></div>
          <div class="brand-name">ClubOps <span>AI</span></div>
        </a>
      </div>
    `;

    NAV.forEach(group => {
      html += `<div class="nav-section">${group.section}</div>`;
      group.items.forEach(item => {
        const active = item.key === current ? ' active' : '';
        html += `
          <a class="nav-item${active}" href="${item.href}">
            <i class="fa-solid ${item.icon}"></i>
            <span>${item.label}</span>
          </a>
        `;
      });
    });

    html += `
      <div style="margin-top: 24px; padding-top: 14px; border-top: 1px solid var(--border);">
        <a class="nav-item" href="index.html">
          <i class="fa-solid fa-house"></i>
          <span>Landing Page</span>
        </a>
      </div>
    `;

    mount.innerHTML = html;
  }

  /* ============================================================
     3. TOAST NOTIFICATIONS
     ============================================================ */
  function ensureToastHost() {
    let host = document.getElementById('toast-host');
    if (!host) {
      host = document.createElement('div');
      host.id = 'toast-host';
      host.className = 'toast-host';
      document.body.appendChild(host);
    }
    return host;
  }

  function toast(message, type = 'info', duration = 3000) {
    const host = ensureToastHost();
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;

    const icons = {
      success: 'fa-circle-check',
      error:   'fa-circle-exclamation',
      info:    'fa-circle-info',
      warn:    'fa-triangle-exclamation'
    };

    el.innerHTML = `
      <i class="fa-solid ${icons[type] || icons.info}"></i>
      <span>${escapeHtml(message)}</span>
    `;
    host.appendChild(el);

    requestAnimationFrame(() => el.classList.add('show'));

    setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => el.remove(), 300);
    }, duration);
  }

  /* ============================================================
     4. MODAL SYSTEM
     ============================================================ */
  const modal = {
    open({ title = '', body = '', actions = [], size = 'md' } = {}) {
      this.close();

      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      overlay.id = 'clubops-modal';

      const actionHtml = actions.map((a, i) => `
        <button class="btn ${a.className || 'btn-ghost'}" data-action-index="${i}">
          ${a.icon ? `<i class="fa-solid ${a.icon}"></i>` : ''}
          ${escapeHtml(a.label)}
        </button>
      `).join('');

      overlay.innerHTML = `
        <div class="modal modal-${size}">
          <div class="modal-header">
            <h3>${escapeHtml(title)}</h3>
            <button class="modal-close" aria-label="Close">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
          <div class="modal-body">${body}</div>
          ${actions.length ? `<div class="modal-footer">${actionHtml}</div>` : ''}
        </div>
      `;

      document.body.appendChild(overlay);
      requestAnimationFrame(() => overlay.classList.add('show'));

      overlay.querySelector('.modal-close').onclick = () => this.close();
      overlay.onclick = (e) => { if (e.target === overlay) this.close(); };

      overlay.querySelectorAll('[data-action-index]').forEach(btn => {
        btn.onclick = () => {
          const action = actions[+btn.dataset.actionIndex];
          if (action && typeof action.onClick === 'function') action.onClick();
          if (action && action.closeOnClick !== false) this.close();
        };
      });

      return overlay;
    },

    close() {
      const existing = document.getElementById('clubops-modal');
      if (existing) {
        existing.classList.remove('show');
        setTimeout(() => existing.remove(), 200);
      }
    }
  };

  /* ============================================================
     5. AI PROCESSING OVERLAY
     ============================================================ */
  const aiLoader = {
    _el: null,
    _timer: null,

    show(steps = ['Analyzing event operational parameters...']) {
      this.hide();

      const el = document.createElement('div');
      el.className = 'ai-loader-overlay';
      el.id = 'ai-loader';
      el.innerHTML = `
        <div class="ai-loader-card">
          <div class="ai-loader-orb">
            <div class="ai-loader-ring"></div>
            <div class="ai-loader-ring delay-1"></div>
            <div class="ai-loader-ring delay-2"></div>
            <i class="fa-solid fa-brain"></i>
          </div>
          <div class="ai-loader-title">ClubOps AI Engine</div>
          <div class="ai-loader-step" id="ai-loader-step">${escapeHtml(steps[0])}</div>
          <div class="ai-loader-bar"><div class="ai-loader-bar-fill" id="ai-loader-fill"></div></div>
        </div>
      `;
      document.body.appendChild(el);
      this._el = el;

      requestAnimationFrame(() => el.classList.add('show'));

      const stepEl = el.querySelector('#ai-loader-step');
      const fillEl = el.querySelector('#ai-loader-fill');
      let i = 0;

      const advance = () => {
        if (i >= steps.length) return;
        stepEl.textContent = steps[i];
        stepEl.classList.remove('pulse');
        void stepEl.offsetWidth;
        stepEl.classList.add('pulse');
        fillEl.style.width = `${((i + 1) / steps.length) * 100}%`;
        i++;
      };

      advance();
      this._timer = setInterval(() => {
        if (i < steps.length) advance();
      }, 700);
    },

    hide() {
      if (this._timer) { clearInterval(this._timer); this._timer = null; }
      if (this._el) {
        this._el.classList.remove('show');
        const el = this._el;
        setTimeout(() => el.remove(), 250);
        this._el = null;
      }
    }
  };

  /* ============================================================
     6. API CLIENT (REST API wrapper)
     ============================================================ */
  const api = {
    async get(endpoint) {
      const res = await fetch(`${API_BASE}${endpoint}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      return await res.json();
    },

    async post(endpoint, data = {}) {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      return await res.json();
    },

    async put(endpoint, data = {}) {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      return await res.json();
    },

    async delete(endpoint) {
      const res = await fetch(`${API_BASE}${endpoint}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      return await res.json();
    }
  };

  /* ============================================================
     7. HELPERS
     ============================================================ */
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatCurrency(num) {
    return '₹' + Number(num || 0).toLocaleString('en-IN');
  }

  function getActiveEventId() {
    const urlParams = new URLSearchParams(window.location.search);
    const paramId = urlParams.get('eventId');
    if (paramId) {
      localStorage.setItem('clubops_active_event_id', paramId);
      return paramId;
    }
    return localStorage.getItem('clubops_active_event_id') || '';
  }

  function setActiveEventId(id) {
    if (id) {
      localStorage.setItem('clubops_active_event_id', id);
    }
  }

  async function loadEventSelector(selectId, onSelectCallback) {
    const select = document.getElementById(selectId);
    if (!select) return;
    try {
      const res = await api.get('/api/events');
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        select.innerHTML = '';
        let currentId = getActiveEventId();
        const exists = res.data.some(e => e.id === currentId);
        if (!currentId || !exists) {
          currentId = res.data[0].id;
          setActiveEventId(currentId);
        }

        res.data.forEach(ev => {
          const opt = document.createElement('option');
          opt.value = ev.id;
          opt.textContent = `${ev.name} (${ev.date || 'TBD'})`;
          if (ev.id === currentId) opt.selected = true;
          select.appendChild(opt);
        });

        select.onchange = (e) => {
          const newId = e.target.value;
          setActiveEventId(newId);
          if (typeof onSelectCallback === 'function') {
            const selectedEvent = res.data.find(ev => ev.id === newId);
            onSelectCallback(newId, selectedEvent);
          }
        };

        if (typeof onSelectCallback === 'function') {
          const selectedEvent = res.data.find(ev => ev.id === currentId);
          onSelectCallback(currentId, selectedEvent);
        }
      }
    } catch (e) {
      console.warn('Could not load events for selector:', e);
    }
  }

  // Export ClubOps global namespace
  global.ClubOps = {
    NAV,
    renderSidebar,
    toast,
    modal,
    aiLoader,
    api,
    escapeHtml,
    formatCurrency,
    getActiveEventId,
    setActiveEventId,
    loadEventSelector
  };

  document.addEventListener('DOMContentLoaded', () => {
    renderSidebar();
  });

})(window);
