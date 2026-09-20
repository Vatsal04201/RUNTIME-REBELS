# ClubOps AI — Run the Event. Not the Chaos.

> **Hackathon Problem Statement PS 3**  
> Team: **Runtime Rebels**

ClubOps AI is an intelligent event operations platform designed for college clubs and fests. It transforms unorganized student meetings, tasks, volunteers, vendors, and unexpected crisis situations into one streamlined operational control center.

---

## 🚀 Quick Start: How to Run

## BEFORE STEP 1 YOU NEED TO DOWNLOAD THE ZIP AND EXTRACT IT SOMEWHERE 
## THEN FOLLOW THE STEPS AFTER OPENING ANY TERMINAL

### Step 1: Open Terminal in the project folder
```bash
cd backend
```
## YOUR LAPTOP MUST ALSO HAVE NODE JS FOR RUNNING THE FILE

### Step 2: Install dependencies (first time only)
```bash
npm install
```

### Step 3: Start the server
```bash
npm start
```
*(Runs on `http://localhost:5000`)*

### Step 4: Open in your browser
* **Landing Page:** [http://localhost:5000/index.html](http://localhost:5000/index.html)
* **Operational Dashboard:** [http://localhost:5000/dashboard.html](http://localhost:5000/dashboard.html)
* **Live APIs:** [http://localhost:5000/api/dashboard/summary](http://localhost:5000/api/dashboard/summary)

---

## 🎯 Key Operational Features

1. **AI Meeting Transcript to Tasks**: Paste WhatsApp audio notes or meeting transcripts; AI extracts assignees, due dates, and priority levels.
2. **One-Click Official Documents**: Instantly generate formal Dean permission letters, WhatsApp team broadcasts, and vendor purchase contracts.
3. **Event Day Command Room**: Live stage timeline run-sheet and one-click dispatch triggers (Gate reinforcement, Sound checks, Emergency generator backup).
4. **Dynamic Mathematical Readiness**: Real-time event readiness formula calculated from completed tasks (40%), confirmed vendors (25%), volunteer allocations (25%), and baseline readiness (15%).
5. **Deterministic Risk Radar**: Automatically flags unconfirmed critical vendors and unallocated volunteer teams with actionable mitigation buttons.

---

## 📁 Repository Structure
```text
Runtime-Rebels/
├── frontend/             # Client application
│   ├── index.html        # Landing page
│   ├── style.css         # Landing page design system
│   ├── app.js            # Landing page client logic & simulations
│   ├── dashboard.html    # DeepSeek operational dashboard
│   ├── dashboard.css     # Glassmorphic dashboard styles & modals
│   └── dashboard.js      # Live REST API integration & reactive state
├── backend/              # Node.js + Express REST API
│   ├── server.js         # Server entry point & static file server
│   ├── dataStore.js      # Data access layer & dynamic readiness engine
│   ├── routes/           # REST endpoints (events, tasks, risks, ai, etc.)
│   └── data/             # Persistent JSON seed files
```

