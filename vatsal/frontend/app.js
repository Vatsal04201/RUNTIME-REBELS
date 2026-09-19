/* ==========================================================================
   ClubOps AI — Interactive Client Logic
   Run the Event. Not the Chaos.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initHeroSimulation();
  initWhatIfSimulator();
  initMemorySearch();
  initSosEmergency();
  initLoginModal();
});

// Toast Notification Engine
function showToast(title, message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  let iconClass = 'fa-solid fa-sparkles';
  if (type === 'success') iconClass = 'fa-solid fa-circle-check';
  if (type === 'warning') iconClass = 'fa-solid fa-triangle-exclamation';
  if (type === 'danger') iconClass = 'fa-solid fa-shield-virus';

  toast.innerHTML = `
    <div class="toast-icon"><i class="${iconClass}"></i></div>
    <div class="toast-body">
      <div class="toast-title">${title}</div>
      <div class="toast-msg">${message}</div>
    </div>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// 1. Sticky Navbar & Mobile Menu
function initNavbar() {
  const navbar = document.getElementById('navbar');
  const toggle = document.getElementById('mobileMenuToggle');
  const menu = document.getElementById('mobileMenu');
  const links = document.querySelectorAll('.nav-link, .mobile-nav-link');

  // Scroll effect
  window.addEventListener('scroll', () => {
    if (window.scrollY > 30) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }

    // Scroll spy for active link
    const sections = document.querySelectorAll('section[id]');
    const scrollY = window.pageYOffset;

    sections.forEach(current => {
      const sectionHeight = current.offsetHeight;
      const sectionTop = current.offsetTop - 150;
      const sectionId = current.getAttribute('id');

      if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
        document.querySelectorAll(`.nav-link[href*="${sectionId}"]`).forEach(el => {
          document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
          el.classList.add('active');
        });
      }
    });
  });

  // Mobile Menu Toggle
  if (toggle && menu) {
    toggle.addEventListener('click', () => {
      menu.classList.toggle('open');
      const isOpen = menu.classList.contains('open');
      toggle.innerHTML = isOpen ? '<i class="fa-solid fa-xmark"></i>' : '<i class="fa-solid fa-bars"></i>';
    });

    // Close mobile menu on link click
    links.forEach(l => {
      l.addEventListener('click', () => {
        menu.classList.remove('open');
        toggle.innerHTML = '<i class="fa-solid fa-bars"></i>';
      });
    });
  }
}

// 2. Hero Control Panel Live Simulation
function initHeroSimulation() {
  const btnApply = document.getElementById('btnApplyBackup');
  const readinessPct = document.getElementById('readinessPct');
  const readinessFill = document.getElementById('readinessFill');
  const riskRadar = document.getElementById('riskCountBadge');
  const riskItemVols = document.getElementById('riskItemVols');
  const valVols = document.getElementById('valVolunteersActive');
  const valTasks = document.getElementById('valTasksDone');
  const aiRecCard = document.getElementById('aiRecCard');

  let isApplied = false;

  if (btnApply) {
    btnApply.addEventListener('click', () => {
      if (!isApplied) {
        // Execute Backup Plan Transition
        btnApply.disabled = true;
        btnApply.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Reallocating...';

        setTimeout(() => {
          // Update readiness
          readinessPct.textContent = '98%';
          readinessPct.style.color = '#10b981';
          readinessFill.style.width = '98%';

          // Update metrics
          if (valVols) valVols.textContent = '20';
          if (valTasks) valTasks.textContent = '22';

          // Update risk item
          if (riskItemVols) {
            riskItemVols.innerHTML = `
              <span class="risk-pill" style="background:#10b981; color:#fff;">RESOLVED</span>
              <span class="risk-text" style="text-decoration: line-through; color:#64748b;">2 volunteers reassigned to gate</span>
              <span class="risk-time">Just now</span>
            `;
          }

          if (riskRadar) {
            riskRadar.textContent = '1 Active';
            riskRadar.style.background = 'rgba(245, 158, 11, 0.2)';
            riskRadar.style.color = '#fbbf24';
          }

          // Update AI recommendation card
          aiRecCard.style.borderColor = 'rgba(16, 185, 129, 0.4)';
          btnApply.innerHTML = '<i class="fa-solid fa-check-double"></i> Plan Successfully Active';
          btnApply.style.background = 'linear-gradient(135deg, #10b981, #059669)';

          showToast('Contingency Plan Deployed', '2 volunteers moved from Decoration to Registration. Entrance bottleneck cleared!', 'success');
          isApplied = true;
        }, 800);
      } else {
        // Reset simulation
        readinessPct.textContent = '87%';
        readinessPct.style.color = '#10b981';
        readinessFill.style.width = '87%';

        if (valVols) valVols.textContent = '18';
        if (valTasks) valTasks.textContent = '20';

        if (riskItemVols) {
          riskItemVols.innerHTML = `
            <span class="risk-pill medium">MED</span>
            <span class="risk-text">2 volunteers unassigned at gate</span>
            <span class="risk-time">5m ago</span>
          `;
        }

        if (riskRadar) {
          riskRadar.textContent = '2 Active';
          riskRadar.style.background = 'rgba(239, 68, 68, 0.2)';
          riskRadar.style.color = '#fff';
        }

        aiRecCard.style.borderColor = 'rgba(99, 102, 241, 0.3)';
        btnApply.innerHTML = '<span class="btn-text">Apply Backup Plan</span> <i class="fa-solid fa-arrow-right"></i>';
        btnApply.style.background = 'var(--gradient-brand)';
        btnApply.disabled = false;

        showToast('Simulation Reset', 'Hero control panel metrics returned to initial live state.', 'info');
        isApplied = false;
      }
    });
  }

  // Launch Sandbox Button in CTA
  const btnLaunch = document.getElementById('btnLaunchSandbox');
  if (btnLaunch) {
    btnLaunch.addEventListener('click', () => {
      const heroMockup = document.querySelector('.hero-right');
      if (heroMockup) {
        heroMockup.scrollIntoView({ behavior: 'smooth', block: 'center' });
        heroMockup.style.transform = 'scale(1.03)';
        heroMockup.style.transition = 'transform 0.4s ease';
        setTimeout(() => {
          heroMockup.style.transform = 'none';
        }, 800);
        showToast('Operational Sandbox Active', 'Interact with the live readiness bar, risks, and backup plan buttons above!', 'success');
      }
    });
  }
}

// 3. Interactive What-If Simulator
function initWhatIfSimulator() {
  const scenarioBtns = document.querySelectorAll('.scenario-btn');
  const promptEl = document.getElementById('whatifPrompt');
  const impactEl = document.getElementById('whatifImpact');
  const planEl = document.getElementById('whatifPlan');
  const btnExecute = document.getElementById('btnExecuteWhatif');
  const whatifBox = document.getElementById('whatifBox');

  const scenarios = {
    volunteers: {
      prompt: '"What if 3 volunteers don\'t arrive for registration?"',
      domain: 'Crowd Control',
      impact: 'Registration currently has 4 volunteers for an estimated 600 attendees. Loss of 3 will create a 25-minute entrance bottleneck and spill into the main driveway.',
      plan: 'Reassign 2 volunteers from the Decoration buffer team + Keep 1 standby lead at the QR Check-in Desk. Divert fast-track VIP entries to Counter B.',
      action: 'Reallocate Volunteers & Notify WhatsApp Lead'
    },
    rain: {
      prompt: '"What if sudden rain hits the outdoor Open Air Stage?"',
      domain: 'Weather & Stage Safety',
      impact: 'High-voltage sound amplifiers & LED backdrop exposed to water damage within 6 minutes. Expected audience scramble toward cafeteria overhangs.',
      plan: 'Trigger Stage Rain Protocol: cut power to front arrays, dispatch 4 stagehands with heavy tarpaulins, and route acoustics to Seminar Hall B indoor speakers.',
      action: 'Activate Rain Protocol & Power Cutoff'
    },
    guest: {
      prompt: '"What if the Chief Guest is delayed by 45 minutes?"',
      domain: 'Ceremony Schedule',
      impact: 'Auditorium crowd of 450 students seated with no active program. Tension and restlessness will cause crowd leakage toward food stalls.',
      plan: 'Advance the Student Classical Music Intro by 20 mins, insert the Club Annual Highlight Video reel, and hold the lamp-lighting kit ready backstage.',
      action: 'Reshuffle Program Agenda & Cue AV Team'
    },
    sound: {
      prompt: '"What if the Stage 2 sound mixer experiences hardware failure?"',
      domain: 'Technical Production',
      impact: 'Battle of the Bands event halted for 3 registered rock bands. Acoustic feedback could damage speakers.',
      plan: 'Switch feed to secondary Yamaha 16-channel analog mixer on rack B. Page sound technician Rajesh (+91 98765 43210) who is on standby 200m away.',
      action: 'Switch to Backup Mixer & Dispatch Tech'
    }
  };

  scenarioBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      scenarioBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const scenarioKey = btn.getAttribute('data-scenario');
      const data = scenarios[scenarioKey];
      if (!data) return;

      // Animate text switch
      if (whatifBox) {
        whatifBox.style.opacity = '0.7';
        setTimeout(() => {
          promptEl.textContent = data.prompt;
          impactEl.textContent = data.impact;
          planEl.textContent = data.plan;
          const statPill = document.querySelector('.whatif-stats .stat-pill:first-child');
          if (statPill) statPill.innerHTML = `<span class="stat-lbl">Target Domain:</span> ${data.domain}`;
          if (btnExecute) {
            btnExecute.querySelector('#whatifBtnText').textContent = data.action;
          }
          whatifBox.style.opacity = '1';
        }, 150);
      }
    });
  });

  if (btnExecute) {
    btnExecute.addEventListener('click', () => {
      const activeBtn = document.querySelector('.scenario-btn.active');
      const name = activeBtn ? activeBtn.textContent.trim() : 'Scenario';
      showToast('Simulated Action Dispatched', `Executed contingency for: ${name}. All leads notified!`, 'success');
    });
  }
}

// 4. Club Knowledge Memory RAG Search
function initMemorySearch() {
  const input = document.getElementById('memorySearchInput');
  const btn = document.getElementById('btnQueryMemory');
  const ansTitle = document.getElementById('ansTitle');
  const ansContact = document.getElementById('ansContact');
  const ansDetails = document.getElementById('ansDetails');
  const chips = document.querySelectorAll('.chip-query');
  const docCards = document.querySelectorAll('.doc-card');

  const knowledgeBase = {
    "which sound vendor did we use last year?": {
      title: "SoundCraft Audio Solutions (Felicific 2025)",
      contact: "<strong>Key Contact:</strong> Rajesh Verma (Ph: +91 98765 43210)",
      details: "<strong>Package:</strong> ₹18,500 for Main Stage Line-Array, 4 Cordless Mics & Monitor Set. Arrived on time at 7:30 AM with zero feedback issues."
    },
    "what was our total budget in 2025?": {
      title: "Felicific 2025 Financial Statement Audit",
      contact: "<strong>Finance Lead:</strong> Kunal Shah (Treasurer)",
      details: "<strong>Total Expenditure:</strong> ₹3,42,800 across Stage, Sound, Security, Printing & Food. Surplus reserve of ₹24,500 deposited back to Student Council account."
    },
    "who approved the auditorium permission?": {
      title: "Dean Student Affairs Office Order #DS-2025/11",
      contact: "<strong>Signatory:</strong> Prof. S. K. Joshi (Dean of Student Affairs)",
      details: "<strong>Conditions:</strong> Allowed until 10:00 PM with approved fire safety certificate, security guards at all 4 emergency exits, and clean handover by 8:00 AM next day."
    },
    "how many food stalls did we have?": {
      title: "Food & Beverage Vendor Layout Plan 2025",
      contact: "<strong>Logistics Coordinator:</strong> Priya Nair",
      details: "<strong>Total Stalls:</strong> 8 licensed student stalls + 4 external commercial food trucks. Commercial vendors paid ₹7,500 stall sponsorship fee each."
    }
  };

  function executeSearch(query) {
    if (!query) return;
    const cleanQ = query.trim().toLowerCase();

    // Find best match or fallback
    let matched = null;
    for (const key in knowledgeBase) {
      if (cleanQ.includes(key) || key.includes(cleanQ) || cleanQ.includes('budget') && key.includes('budget') || cleanQ.includes('auditorium') && key.includes('auditorium') || cleanQ.includes('food') && key.includes('food')) {
        matched = knowledgeBase[key];
        break;
      }
    }

    if (!matched) {
      matched = {
        title: `Synthesizing Club Archives for "${query}"`,
        contact: "<strong>Vector Confidence:</strong> 92% across 14 archived club files",
        details: "Found relevant records in Felicific 2024 Blueprint and Student Council Minutes: Verified compliance with university fest policies."
      };
    }

    const card = document.getElementById('memoryAnswerCard');
    if (card) {
      card.style.opacity = '0.5';
      setTimeout(() => {
        ansTitle.textContent = matched.title;
        ansContact.innerHTML = matched.contact;
        ansDetails.innerHTML = matched.details;
        card.style.opacity = '1';
        showToast('Memory Retrieved', 'Vector RAG matched past club archives in 0.42s', 'info');
      }, 200);
    }
  }

  if (btn && input) {
    btn.addEventListener('click', () => executeSearch(input.value));
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') executeSearch(input.value);
    });
  }

  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      const q = chip.getAttribute('data-q');
      if (input) input.value = q;
      executeSearch(q);
    });
  });

  docCards.forEach(doc => {
    doc.addEventListener('click', () => {
      docCards.forEach(d => d.classList.remove('active'));
      doc.classList.add('active');
      const docName = doc.querySelector('.doc-name').textContent;
      showToast('Document Selected', `Browsing vector embeddings for: ${docName}`, 'info');
    });
  });
}

// 5. Event Day SOS Emergency Triggers
function initSosEmergency() {
  const btnVol = document.getElementById('btnSosVolunteers');
  const btnPwr = document.getElementById('btnSosPower');
  const btnRain = document.getElementById('btnSosRain');

  if (btnVol) {
    btnVol.addEventListener('click', () => {
      showToast('Emergency Recall Triggered', 'Push alert sent to all 20 volunteers: "Report immediately to Main Gate Entrance for crowd control dispatch."', 'danger');
    });
  }

  if (btnPwr) {
    btnPwr.addEventListener('click', () => {
      showToast('Generator Backup Dispatched', 'Power contingency alert sent to Campus Electrical Room and Stage Production Team.', 'warning');
    });
  }

  if (btnRain) {
    btnRain.addEventListener('click', () => {
      showToast('Weather Plan Activated', 'Indoor relocation protocol broadcast to Stage 2 leads. Hall B ventilation opened.', 'warning');
    });
  }
}

// 6. Login Modal Handlers
function initLoginModal() {
  const modal = document.getElementById('loginModal');
  const btnOpen = document.getElementById('loginBtn');
  const btnMobileOpen = document.getElementById('mobileLoginBtn');
  const btnClose = document.getElementById('modalClose');
  const form = document.getElementById('loginForm');

  function openModal() {
    if (modal) modal.classList.add('open');
  }

  function closeModal() {
    if (modal) modal.classList.remove('open');
  }

  if (btnOpen) btnOpen.addEventListener('click', openModal);
  if (btnMobileOpen) btnMobileOpen.addEventListener('click', openModal);
  if (btnClose) btnClose.addEventListener('click', closeModal);

  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
  }

  if (form) {
    form.addEventListener('submit', () => {
      const email = document.getElementById('collegeEmail').value;
      const role = document.getElementById('collegeRole').value;
      closeModal();
      showToast('Welcome to ClubOps AI', `Signed in as ${role.toUpperCase()} (${email}). Launching Dashboard...`, 'success');
      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 600);
    });
  }
}
