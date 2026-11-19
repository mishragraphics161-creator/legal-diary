// Legal Diary • Swiss Minimalist UI Engine
// Offline-First Architecture & Auto-Sync Engine (Zero External Dependencies)

class LegalDiaryApp {
  constructor() {
    this.cases = [];
    this.currentTab = 'all';
    this.quickFilter = 'all';
    this.searchQuery = '';
    this.selectedCourt = 'all';
    this.expandedCardIds = new Set();

    // Supabase REST Config
    this.supabaseUrl = localStorage.getItem('legal_diary_supabase_url') || '';
    this.supabaseKey = localStorage.getItem('legal_diary_supabase_key') || '';
    this.isSupabaseConnected = Boolean(this.supabaseUrl && this.supabaseKey);

    // Sync State
    this.STORAGE_KEY_CASES = 'legal_diary_cases_v2';
    this.STORAGE_KEY_QUEUE = 'legal_diary_sync_queue_v1';
    this.syncQueue = this.loadSyncQueue();
    this.isSyncing = false;
    this.isOnline = navigator.onLine;

    this.currentTheme = localStorage.getItem('legal_diary_theme') || 'system';

    this.init();
  }

  async init() {
    this.applyTheme(this.currentTheme);
    this.renderTodayDate();
    this.initServiceWorker();
    this.initNetworkListeners();
    await this.loadCases();
    this.updateCounters();
    this.updateSyncBadge();
    this.render();
    this.initScrollListener();

    // If online on start, auto-check and sync any pending changes
    if (this.isOnline && this.isSupabaseConnected) {
      setTimeout(() => this.autoSyncDatabase(), 1000);
    }
  }

  // Register PWA Service Worker for 100% Offline Capability
  initServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(err => {
          console.warn('Offline service worker registration notice:', err);
        });
      });
    }
  }

  // Network Online / Offline Listeners
  initNetworkListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.updateSyncBadge();
      this.showToast('Internet connected • Syncing...', 'info');
      this.autoSyncDatabase();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.updateSyncBadge();
      this.showToast('Offline mode active • All changes saved locally', 'warning');
    });

    // Heartbeat: Auto-sync every 25 seconds if online and queue has items
    setInterval(() => {
      if (navigator.onLine && this.isSupabaseConnected && !this.isSyncing) {
        if (this.syncQueue.length > 0) {
          this.autoSyncDatabase();
        }
      }
    }, 25000);
  }

  // Offline Sync Queue Persistence
  loadSyncQueue() {
    try {
      return JSON.parse(localStorage.getItem(this.STORAGE_KEY_QUEUE) || '[]');
    } catch (e) {
      return [];
    }
  }

  saveSyncQueue() {
    localStorage.setItem(this.STORAGE_KEY_QUEUE, JSON.stringify(this.syncQueue));
    this.updateSyncBadge();
    const qCountEl = document.getElementById('syncQueueCount');
    if (qCountEl) qCountEl.textContent = this.syncQueue.length;
  }

  enqueueSyncAction(action, id, data) {
    // Deduplicate: replace older action for same record id
    this.syncQueue = this.syncQueue.filter(item => item.id !== id);
    this.syncQueue.push({
      action, // 'upsert' or 'delete'
      id,
      data,
      timestamp: Date.now()
    });
    this.saveSyncQueue();
  }

  // Auto Database Sync (Uses Native REST API - Zero External Libraries)
  async autoSyncDatabase(isManual = false) {
    if (!this.isSupabaseConnected) {
      if (isManual) this.showToast('Please configure Supabase credentials first', 'warning');
      this.updateSyncBadge();
      return;
    }

    if (!navigator.onLine) {
      if (isManual) this.showToast('Internet offline. Changes will auto-sync when connected.', 'warning');
      this.updateSyncBadge();
      return;
    }

    if (this.isSyncing) return;
    this.isSyncing = true;
    this.updateSyncBadge();

    let syncedCount = 0;

    try {
      // Step 1: Flush the offline sync queue
      while (this.syncQueue.length > 0) {
        const item = this.syncQueue[0];

        if (item.action === 'upsert') {
          const payload = {
            id: item.data.id,
            case_number: item.data.case_number,
            parties: item.data.parties,
            court_name: item.data.court_name,
            judge_name: item.data.judge_name,
            next_hearing_date: item.data.next_hearing_date,
            hearing_stage: item.data.hearing_stage,
            senior_instructions: item.data.senior_instructions,
            file_drive_link: item.data.file_drive_link,
            priority: item.data.priority,
            status: item.data.status,
            hearing_history: JSON.stringify(item.data.hearing_history || []),
            updated_at: new Date().toISOString()
          };

          const res = await fetch(`${this.supabaseUrl}/rest/v1/court_cases`, {
            method: 'POST',
            headers: {
              'apikey': this.supabaseKey,
              'Authorization': `Bearer ${this.supabaseKey}`,
              'Content-Type': 'application/json',
              'Prefer': 'resolution=merge-duplicates'
            },
            body: JSON.stringify(payload)
          });

          if (!res.ok && res.status !== 201 && res.status !== 200) {
            throw new Error(`Upsert error: ${res.statusText}`);
          }
        } else if (item.action === 'delete') {
          const res = await fetch(`${this.supabaseUrl}/rest/v1/court_cases?id=eq.${encodeURIComponent(item.id)}`, {
            method: 'DELETE',
            headers: {
              'apikey': this.supabaseKey,
              'Authorization': `Bearer ${this.supabaseKey}`
            }
          });

          if (!res.ok && res.status !== 204 && res.status !== 200) {
            throw new Error(`Delete error: ${res.statusText}`);
          }
        }

        // Successfully pushed item, shift from queue
        this.syncQueue.shift();
        this.saveSyncQueue();
        syncedCount++;
      }

      // Step 2: Fetch latest data from database & merge
      const fetchRes = await fetch(`${this.supabaseUrl}/rest/v1/court_cases?select=*&order=next_hearing_date.asc`, {
        headers: {
          'apikey': this.supabaseKey,
          'Authorization': `Bearer ${this.supabaseKey}`
        }
      });

      if (fetchRes.ok) {
        const cloudCases = await fetchRes.json();
        if (Array.isArray(cloudCases) && cloudCases.length > 0) {
          const parsed = cloudCases.map(c => {
            let hist = [];
            if (typeof c.hearing_history === 'string') {
              try { hist = JSON.parse(c.hearing_history); } catch (e) { hist = []; }
            } else if (Array.isArray(c.hearing_history)) {
              hist = c.hearing_history;
            }
            return {
              ...c,
              hearing_history: hist
            };
          });

          // Merge cloud with local
          this.cases = parsed;
          this.ensureHistoryIntegrity();
          this.saveToLocal();
          this.updateCounters();
          this.render();
        }
      }

      this.isSyncing = false;
      this.updateSyncBadge();

      if (syncedCount > 0) {
        this.showToast(`Auto-Sync Complete (${syncedCount} changes synced)`, 'success');
      } else if (isManual) {
        this.showToast('Database is up to date', 'success');
      }
    } catch (err) {
      console.warn('Sync attempt postponed:', err.message);
      this.isSyncing = false;
      this.updateSyncBadge();
      if (isManual) {
        this.showToast('Sync error: Check Supabase credentials', 'warning');
      }
    }
  }

  // Visual Sync Status Badge
  updateSyncBadge() {
    const badge = document.getElementById('supabaseBadge');
    const modalStatus = document.getElementById('networkStatusText');
    const queueCountEl = document.getElementById('syncQueueCount');
    if (queueCountEl) queueCountEl.textContent = this.syncQueue.length;

    if (!badge) return;

    if (this.isSyncing) {
      badge.textContent = `Syncing (${this.syncQueue.length})...`;
      badge.className = 'badge badge-warn';
      if (modalStatus) modalStatus.textContent = 'Auto-syncing in progress...';
    } else if (!navigator.onLine) {
      if (this.syncQueue.length > 0) {
        badge.textContent = `Offline (${this.syncQueue.length} pending)`;
        badge.className = 'badge badge-danger';
        if (modalStatus) modalStatus.textContent = `Offline (${this.syncQueue.length} offline changes queued)`;
      } else {
        badge.textContent = 'Offline (Saved Locally)';
        badge.className = 'badge badge-neutral';
        if (modalStatus) modalStatus.textContent = 'Offline (Local Storage Active)';
      }
    } else if (this.isSupabaseConnected) {
      if (this.syncQueue.length > 0) {
        badge.textContent = `Syncing (${this.syncQueue.length} pending)`;
        badge.className = 'badge badge-warn';
        if (modalStatus) modalStatus.textContent = `Online • ${this.syncQueue.length} changes queued to push`;
      } else {
        badge.textContent = 'Cloud Synced';
        badge.className = 'badge badge-success';
        if (modalStatus) modalStatus.textContent = 'Online & Cloud Synced';
      }
    } else {
      badge.textContent = 'Device Storage';
      badge.className = 'badge badge-neutral';
      if (modalStatus) modalStatus.textContent = 'Offline Device Storage';
    }
  }

  // Dynamic Scroll Listener
  initScrollListener() {
    window.addEventListener('scroll', () => {
      const scrollY = window.scrollY || document.documentElement.scrollTop;
      const topSection = document.getElementById('collapsibleHeaderTop');

      if (scrollY > 30) {
        if (topSection && !topSection.classList.contains('collapsed')) {
          topSection.classList.add('collapsed');
        }
      } else {
        if (topSection && topSection.classList.contains('collapsed')) {
          topSection.classList.remove('collapsed');
        }
      }
    }, { passive: true });
  }

  // Theme Toggle (Supports System, Dark, Light)
  toggleTheme() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark' || 
                   (!document.documentElement.getAttribute('data-theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    const nextTheme = isDark ? 'light' : 'dark';
    this.applyTheme(nextTheme);
    localStorage.setItem('legal_diary_theme', nextTheme);
  }

  applyTheme(theme) {
    if (theme === 'system') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }
    const themeLabel = document.getElementById('themeToggleText');
    if (themeLabel) {
      const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      themeLabel.textContent = isDark ? 'Light Mode' : 'Dark Mode';
    }
  }

  // Today Date Formatter
  renderTodayDate() {
    const el = document.getElementById('todayDateStr');
    if (el) {
      const now = new Date();
      el.textContent = now.toLocaleDateString('en-IN', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    }
  }

  // Realistic Advocate Cases
  getSampleCases() {
    const now = new Date();
    const formatDate = (offsetDays) => {
      const d = new Date(now);
      d.setDate(d.getDate() + offsetDays);
      return d.toISOString().split('T')[0];
    };

    return [
      {
        id: 'case-1',
        case_number: 'Case #1',
        parties: 'Pawan Gupta v. Vishwanath Pitariya',
        court_name: 'ACJM-5',
        judge_name: '',
        next_hearing_date: formatDate(-1),
        hearing_stage: 'Summons / Notice',
        senior_instructions: 'Pairokar to appear with verification affidavit',
        file_drive_link: '',
        status: 'Active',
        priority: 'Normal',
        hearing_history: [
          { date: formatDate(-45), stage: 'Institution / Plaint', remarks: 'Case filed and registered. Court ordered issue of preliminary notices.' },
          { date: formatDate(-22), stage: 'Service of Summons', remarks: 'Summons returned unserved due to incorrect address. Fresh registered notice ordered.' }
        ]
      },
      {
        id: 'case-2',
        case_number: 'Case #2',
        parties: 'Jafar Ali v. State of U.P.',
        court_name: 'CO-IInd',
        judge_name: '',
        next_hearing_date: formatDate(-1),
        hearing_stage: 'Police Report / CD',
        senior_instructions: 'Verify case diary and obtain status report',
        file_drive_link: '',
        status: 'Active',
        priority: 'Normal',
        hearing_history: [
          { date: formatDate(-60), stage: 'Bail Appearance', remarks: 'Interim protection extended till case diary inspection.' },
          { date: formatDate(-28), stage: 'Case Diary Inspection', remarks: 'Investigating Officer absent. Court directed warning notice to SSP.' }
        ]
      },
      {
        id: 'case-3',
        case_number: 'Case #3',
        parties: 'Pawan Gupta v. Raman Gupta',
        court_name: 'CJSD',
        judge_name: '',
        next_hearing_date: formatDate(0),
        hearing_stage: 'Written Statement',
        senior_instructions: 'File certified copy of order / judgment',
        file_drive_link: '',
        status: 'Active',
        priority: 'Urgent',
        hearing_history: [
          { date: formatDate(-40), stage: 'First Appearance', remarks: 'Vakalatnama filed by opposite counsel Sri Sharma.' },
          { date: formatDate(-14), stage: 'Time for WS', remarks: 'Defendant sought 2 weeks final adjournment for filing written statement on payment of ₹500 costs.' }
        ]
      },
      {
        id: 'case-4',
        case_number: 'Case #4',
        parties: 'Smt. Chhavi Rastogi v. Aman',
        court_name: 'FTC-41',
        judge_name: '',
        next_hearing_date: formatDate(0),
        hearing_stage: 'Mediation / Settlement',
        senior_instructions: 'Check report regarding execution of bailable warrant',
        file_drive_link: '',
        status: 'Active',
        priority: 'Urgent',
        hearing_history: [
          { date: formatDate(-50), stage: 'Section 125 Filing', remarks: 'Maintenance petition instituted. Notice issued to husband.' },
          { date: formatDate(-20), stage: 'Mediation Referral', remarks: 'Both parties appeared in court chamber and agreed for reconciliation attempts.' }
        ]
      },
      {
        id: 'case-5',
        case_number: 'Case #5',
        parties: 'Mumtaz v. Unknown',
        court_name: 'ACJM-3',
        judge_name: '',
        next_hearing_date: formatDate(0),
        hearing_stage: 'Admission / Notice',
        senior_instructions: 'File protest objection against Final Report (FR)',
        file_drive_link: '',
        status: 'Active',
        priority: 'Urgent',
        hearing_history: [
          { date: formatDate(-38), stage: 'FR Receipt', remarks: 'Police final closure report received in court office.' },
          { date: formatDate(-12), stage: 'Protest Filing', remarks: 'Complainant filed protest petition with supported evidence affidavits.' }
        ]
      },
      {
        id: 'case-6',
        case_number: 'Case #6',
        parties: 'Pawan Gupta v. Ashok Singh',
        court_name: 'ACJM-4',
        judge_name: '',
        next_hearing_date: formatDate(1),
        hearing_stage: 'Charge / Plea',
        senior_instructions: '',
        file_drive_link: '',
        status: 'Active',
        priority: 'Normal',
        hearing_history: [
          { date: formatDate(-30), stage: 'Supply of Copies', remarks: 'Section 207 CrPC compliance completed. Copies handed over to defense.' }
        ]
      },
      {
        id: 'case-7',
        case_number: 'Case #7',
        parties: 'Pawan Singh v. Kailash Singh',
        court_name: 'ACJJD-5',
        judge_name: '',
        next_hearing_date: formatDate(1),
        hearing_stage: 'Summons / Notice',
        senior_instructions: '',
        file_drive_link: '',
        status: 'Active',
        priority: 'Normal',
        hearing_history: [
          { date: formatDate(-25), stage: 'Suit Registered', remarks: 'Injunction application 39 Rule 1 & 2 CPC filed.' }
        ]
      },
      {
        id: 'case-8',
        case_number: 'Case #8',
        parties: 'Pawan Gupta v. Ashok Singh',
        court_name: 'ACJM-1',
        judge_name: '',
        next_hearing_date: formatDate(2),
        hearing_stage: 'Evidence / Cross',
        senior_instructions: '',
        file_drive_link: '',
        status: 'Active',
        priority: 'Normal',
        hearing_history: [
          { date: formatDate(-55), stage: 'Charges Framed', remarks: 'Charges framed under Section 138 NI Act. Accused pleaded not guilty.' },
          { date: formatDate(-18), stage: 'PW-1 Examination in Chief', remarks: 'Affidavit of complainant tendered in evidence.' }
        ]
      },
      {
        id: 'case-9',
        case_number: 'Case #9',
        parties: 'Vimal v. Komal Singh',
        court_name: 'AFC-1st',
        judge_name: '',
        next_hearing_date: formatDate(2),
        hearing_stage: 'Final Arguments',
        senior_instructions: '',
        file_drive_link: '',
        status: 'Active',
        priority: 'Normal',
        hearing_history: [
          { date: formatDate(-42), stage: 'Defendant Evidence Closed', remarks: 'DW-1 & DW-2 cross-examined and discharged.' },
          { date: formatDate(-15), stage: 'Part Heard Arguments', remarks: 'Plaintiff counsel completed initial citations.' }
        ]
      },
      {
        id: 'case-10',
        case_number: 'Case #10',
        parties: 'Pawan Gupta v. Ashok Singh',
        court_name: 'DJ',
        judge_name: '',
        next_hearing_date: formatDate(3),
        hearing_stage: 'Appeal Hearing',
        senior_instructions: '',
        file_drive_link: '',
        status: 'Active',
        priority: 'Normal',
        hearing_history: [
          { date: formatDate(-35), stage: 'Lower Court Record (LCR)', remarks: 'TCR summoned and received from trial court.' }
        ]
      },
      {
        id: 'case-11',
        case_number: 'Case #11',
        parties: 'Gyanendara Mishra',
        court_name: 'District Court',
        judge_name: '',
        next_hearing_date: formatDate(3),
        hearing_stage: 'Miscellaneous',
        senior_instructions: '',
        file_drive_link: '',
        status: 'Active',
        priority: 'Normal',
        hearing_history: [
          { date: formatDate(-20), stage: 'Application 7 Rule 11', remarks: 'Maintainability application filed by opposite side.' }
        ]
      },
      {
        id: 'case-12',
        case_number: 'Case #12',
        parties: 'Pooja v. Kaushal Singh',
        court_name: 'AFC-1st',
        judge_name: '',
        next_hearing_date: formatDate(4),
        hearing_stage: 'Evidence / Cross',
        senior_instructions: '',
        file_drive_link: '',
        status: 'Active',
        priority: 'Normal',
        hearing_history: [
          { date: formatDate(-45), stage: 'Interim Maintenance', remarks: 'Interim order of ₹8,000 per month passed.' }
        ]
      },
      {
        id: 'case-13',
        case_number: 'Case #13',
        parties: 'State v. Dharampal',
        court_name: 'ADJ/FTC',
        judge_name: '',
        next_hearing_date: formatDate(5),
        hearing_stage: 'Witness Examination',
        senior_instructions: '',
        file_drive_link: '',
        status: 'Active',
        priority: 'Normal',
        hearing_history: [
          { date: formatDate(-60), stage: 'Committal', remarks: 'Case committed to Sessions division.' },
          { date: formatDate(-20), stage: 'PW-1 & PW-2 Examination', remarks: 'Eye witness examination recorded in chief.' }
        ]
      },
      {
        id: 'case-14',
        case_number: 'Case #14',
        parties: 'Release – Pramod Kumar',
        court_name: 'ACJM-5',
        judge_name: '',
        next_hearing_date: formatDate(6),
        hearing_stage: 'Order / Judgment',
        senior_instructions: 'Sampoorna Nagar bail bond compliance',
        file_drive_link: '',
        status: 'Active',
        priority: 'Urgent',
        hearing_history: [
          { date: formatDate(-30), stage: 'Bail Arguments', remarks: 'Arguments completed, order reserved.' }
        ]
      },
      {
        id: 'case-15',
        case_number: 'Case #15',
        parties: 'Smt. Kishori Devi v. Pushpendra Kumar',
        court_name: 'Gram Nay. Gola',
        judge_name: '',
        next_hearing_date: formatDate(6),
        hearing_stage: 'Framing of Issues',
        senior_instructions: '',
        file_drive_link: '',
        status: 'Active',
        priority: 'Normal',
        hearing_history: [
          { date: formatDate(-24), stage: 'Admission & Denial', remarks: 'Documents admitted in evidence.' }
        ]
      },
      {
        id: 'case-16',
        case_number: 'Case #16',
        parties: 'Ram Gulam v. Sahab Dayal',
        court_name: 'Gram Nay. Gola',
        judge_name: '',
        next_hearing_date: formatDate(6),
        hearing_stage: 'Written Statement',
        senior_instructions: '',
        file_drive_link: '',
        status: 'Active',
        priority: 'Normal',
        hearing_history: [
          { date: formatDate(-18), stage: 'Notice Service', remarks: 'Defendant received copy of plaint.' }
        ]
      },
      {
        id: 'case-17',
        case_number: 'Case #17',
        parties: 'Daya Shankar Mishra v. Kulwant Singh',
        court_name: 'Gram Nay. Gola',
        judge_name: '',
        next_hearing_date: formatDate(6),
        hearing_stage: 'Evidence / Cross',
        senior_instructions: '',
        file_drive_link: '',
        status: 'Active',
        priority: 'Normal',
        hearing_history: [
          { date: formatDate(-32), stage: 'PW-1 Evidence', remarks: 'Cross-examination deferred on request.' }
        ]
      },
      {
        id: 'case-18',
        case_number: 'Case #18',
        parties: 'State v. Dharampal',
        court_name: 'ACJM-5',
        judge_name: '',
        next_hearing_date: formatDate(7),
        hearing_stage: 'Charge / Plea',
        senior_instructions: '',
        file_drive_link: '',
        status: 'Active',
        priority: 'Normal',
        hearing_history: [
          { date: formatDate(-28), stage: 'Cognizance', remarks: 'Court took cognizance on charge-sheet.' }
        ]
      },
      {
        id: 'case-19',
        case_number: 'Case #19',
        parties: 'Madhuri Devi v. Geeta Devi',
        court_name: 'ADJ-2nd',
        judge_name: '',
        next_hearing_date: formatDate(7),
        hearing_stage: 'Arguments on Injunction',
        senior_instructions: '',
        file_drive_link: '',
        status: 'Active',
        priority: 'Normal',
        hearing_history: [
          { date: formatDate(-25), stage: 'Interim Status Quo', remarks: 'Status quo granted till next date.' }
        ]
      },
      {
        id: 'case-20',
        case_number: 'Case #20',
        parties: 'Alok Verma v. Raunak Juneja',
        court_name: 'AJM-3',
        judge_name: '',
        next_hearing_date: formatDate(8),
        hearing_stage: 'Final Arguments',
        senior_instructions: '',
        file_drive_link: '',
        status: 'Active',
        priority: 'Normal',
        hearing_history: [
          { date: formatDate(-35), stage: 'Evidence Closed', remarks: 'Both parties concluded oral and documentary proofs.' }
        ]
      },
      {
        id: 'case-21',
        case_number: 'Case #21',
        parties: 'Shree Devi v. Janardan',
        court_name: 'FC',
        judge_name: '',
        next_hearing_date: formatDate(9),
        hearing_stage: 'Cross Examination',
        senior_instructions: '',
        file_drive_link: '',
        status: 'Active',
        priority: 'Normal',
        hearing_history: [
          { date: formatDate(-21), stage: 'Affidavit Tendered', remarks: 'Examination in chief concluded.' }
        ]
      },
      {
        id: 'case-22',
        case_number: 'Case #22',
        parties: 'Prathvi Pal v. Banvari',
        court_name: 'ACJM-3',
        judge_name: '',
        next_hearing_date: formatDate(11),
        hearing_stage: 'Summons / Notice',
        senior_instructions: '',
        file_drive_link: '',
        status: 'Active',
        priority: 'Normal',
        hearing_history: [
          { date: formatDate(-30), stage: 'Complaint Filed', remarks: 'Statement recorded under Section 200 CrPC.' }
        ]
      },
      {
        id: 'case-23',
        case_number: 'Case #23',
        parties: 'Shree Devi v. Janardan',
        court_name: 'ACJM/FTC',
        judge_name: '',
        next_hearing_date: formatDate(15),
        hearing_stage: 'Order / Judgment',
        senior_instructions: '',
        file_drive_link: '',
        status: 'Active',
        priority: 'Normal',
        hearing_history: [
          { date: formatDate(-40), stage: 'Arguments Heard', remarks: 'Written arguments submitted by Sri Mishra.' }
        ]
      }
    ];
  }

  // Load cases (Offline First: always read local cache first)
  async loadCases() {
    const local = localStorage.getItem(this.STORAGE_KEY_CASES);
    if (local) {
      try {
        this.cases = JSON.parse(local);
        this.ensureHistoryIntegrity();
      } catch (e) {
        this.cases = this.getSampleCases();
        this.saveToLocal();
      }
    } else {
      this.cases = this.getSampleCases();
      this.saveToLocal();
    }
  }

  // Ensure every case has valid hearing_history array
  ensureHistoryIntegrity() {
    let modified = false;
    const samples = this.getSampleCases();
    this.cases.forEach(c => {
      if (!Array.isArray(c.hearing_history) || c.hearing_history.length === 0) {
        const match = samples.find(s => s.id === c.id || s.case_number === c.case_number);
        if (match && match.hearing_history && match.hearing_history.length > 0) {
          c.hearing_history = [...match.hearing_history];
          modified = true;
        } else {
          c.hearing_history = c.hearing_history || [];
        }
      }
    });
    if (modified) {
      this.saveToLocal();
    }
  }

  saveToLocal() {
    localStorage.setItem(this.STORAGE_KEY_CASES, JSON.stringify(this.cases));
  }

  // Refresh
  async refreshData() {
    if (navigator.onLine && this.isSupabaseConnected) {
      await this.autoSyncDatabase(true);
    } else {
      await this.loadCases();
      this.updateCounters();
      this.render();
      this.showToast('Local Data Refreshed (Offline)', 'info');
    }
  }

  // Date difference
  getDateDifference(targetDateStr) {
    if (!targetDateStr) return 999;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [y, m, d] = targetDateStr.split('-').map(Number);
    const target = new Date(y, m - 1, d);
    target.setHours(0, 0, 0, 0);

    const diffTime = target.getTime() - today.getTime();
    return Math.round(diffTime / (1000 * 60 * 60 * 24));
  }

  // Semantic Status Info
  getHearingStatusInfo(targetDateStr, status) {
    if (status === 'Disposed') {
      return {
        badgeClass: 'badge badge-neutral',
        label: 'Disposed',
        rawDays: 999
      };
    }

    const diff = this.getDateDifference(targetDateStr);

    if (diff < 0) {
      return {
        badgeClass: 'badge badge-danger',
        label: `Passed (${Math.abs(diff)}d ago)`,
        rawDays: diff
      };
    } else if (diff === 0) {
      return {
        badgeClass: 'badge badge-danger',
        label: 'TODAY',
        rawDays: 0
      };
    } else if (diff === 1) {
      return {
        badgeClass: 'badge badge-warn',
        label: 'Tomorrow',
        rawDays: 1
      };
    } else if (diff <= 7) {
      return {
        badgeClass: 'badge badge-success',
        label: `In ${diff} Days`,
        rawDays: diff
      };
    } else {
      return {
        badgeClass: 'badge badge-neutral',
        label: `In ${diff} Days`,
        rawDays: diff
      };
    }
  }

  formatDisplayDate(dateStr) {
    if (!dateStr) return 'No Date';
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  // Counters
  updateCounters() {
    let todayCount = 0;
    let tomorrowCount = 0;
    let weekCount = 0;
    let overdueCount = 0;

    this.cases.forEach(c => {
      if (c.status === 'Disposed') return;
      const diff = this.getDateDifference(c.next_hearing_date);
      if (diff === 0) todayCount++;
      else if (diff === 1) tomorrowCount++;
      else if (diff < 0) overdueCount++;

      if (diff >= 0 && diff <= 7) weekCount++;
    });

    const setSafe = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };

    setSafe('countAll', this.cases.length);
    setSafe('countToday', todayCount);
    setSafe('countTomorrow', tomorrowCount);
    setSafe('countWeek', weekCount);
    setSafe('countOverdue', overdueCount);

    setSafe('metricToday', todayCount);
    setSafe('metricTomorrow', tomorrowCount);
    setSafe('metricWeek', weekCount);
    setSafe('metricTotal', this.cases.length);
  }

  // Segment Filter Tab Click
  setQuickFilter(filter) {
    this.quickFilter = filter;
    document.querySelectorAll('.segment-tab, .segment-pill').forEach(btn => {
      if (btn.dataset.filter === filter) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
    this.render();
  }

  // Search Filter
  handleSearch(query) {
    this.searchQuery = query.toLowerCase().trim();
    const clearBtn = document.getElementById('clearSearchBtn');
    if (clearBtn) {
      if (this.searchQuery.length > 0) {
        clearBtn.style.display = 'inline-flex';
      } else {
        clearBtn.style.display = 'none';
      }
    }
    this.render();
  }

  clearSearch() {
    const input = document.getElementById('searchInput');
    if (input) input.value = '';
    this.searchQuery = '';
    const clearBtn = document.getElementById('clearSearchBtn');
    if (clearBtn) clearBtn.style.display = 'none';
    this.render();
  }

  // Court Dropdown Filter
  filterByCourt(court) {
    this.selectedCourt = court;
    this.render();
    if (court !== 'all') {
      this.showToast(`Filter: ${court}`, 'info');
    }
  }

  // Filter & Sort Cases
  getFilteredCases() {
    return this.cases
      .filter(item => {
        if (this.quickFilter === 'today') {
          if (item.status === 'Disposed') return false;
          return this.getDateDifference(item.next_hearing_date) === 0;
        }
        if (this.quickFilter === 'tomorrow') {
          if (item.status === 'Disposed') return false;
          return this.getDateDifference(item.next_hearing_date) === 1;
        }
        if (this.quickFilter === 'this_week') {
          if (item.status === 'Disposed') return false;
          const diff = this.getDateDifference(item.next_hearing_date);
          return diff >= 0 && diff <= 7;
        }
        if (this.quickFilter === 'overdue') {
          if (item.status === 'Disposed') return false;
          return this.getDateDifference(item.next_hearing_date) < 0;
        }
        return true;
      })
      .filter(item => {
        if (this.selectedCourt && this.selectedCourt !== 'all') {
          if (!item.court_name || !item.court_name.toLowerCase().includes(this.selectedCourt.toLowerCase())) {
            return false;
          }
        }
        return true;
      })
      .filter(item => {
        if (!this.searchQuery) return true;
        const q = this.searchQuery;
        return (
          (item.case_number && item.case_number.toLowerCase().includes(q)) ||
          (item.parties && item.parties.toLowerCase().includes(q)) ||
          (item.court_name && item.court_name.toLowerCase().includes(q)) ||
          (item.hearing_stage && item.hearing_stage.toLowerCase().includes(q)) ||
          (item.senior_instructions && item.senior_instructions.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => {
        if (!a.next_hearing_date) return 1;
        if (!b.next_hearing_date) return -1;
        return new Date(a.next_hearing_date) - new Date(b.next_hearing_date);
      });
  }

  // Copy helper
  copyToClipboard(text, label = 'Copied') {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      this.showToast(`${label} copied to clipboard`, 'success');
    }
  }

  // Presets
  setCourtPreset(court) {
    const el = document.getElementById('caseCourt');
    if (el) el.value = court;
  }

  setStagePreset(stage) {
    const el = document.getElementById('caseStage');
    if (el) el.value = stage;
  }

  setNdohPreset(days) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    const dateInput = document.getElementById('ndohDate');
    if (dateInput) {
      dateInput.value = d.toISOString().split('T')[0];
    }
  }

  // Toggle Accordion
  toggleCard(id) {
    if (this.expandedCardIds.has(id)) {
      this.expandedCardIds.delete(id);
    } else {
      this.expandedCardIds.add(id);
    }
    const content = document.getElementById(`card-details-${id}`);
    const chevron = document.getElementById(`card-chevron-${id}`);
    if (content && chevron) {
      if (this.expandedCardIds.has(id)) {
        content.classList.add('expanded');
        chevron.classList.add('expanded');
      } else {
        content.classList.remove('expanded');
        chevron.classList.remove('expanded');
      }
    } else {
      this.render();
    }
  }

  // RENDER (Swiss Typographic Minimalist Agenda Stream with Past Hearing History)
  render() {
    const container = document.getElementById('casesList');
    const emptyState = document.getElementById('emptyState');
    const filtered = this.getFilteredCases();

    if (filtered.length === 0) {
      container.innerHTML = '';
      emptyState.style.display = 'flex';
      return;
    }

    emptyState.style.display = 'none';

    container.innerHTML = filtered.map((c, idx) => {
      const statusInfo = this.getHearingStatusInfo(c.next_hearing_date, c.status);
      const displayDate = this.formatDisplayDate(c.next_hearing_date);
      const isUrgent = c.priority === 'Urgent';
      const isExpanded = this.expandedCardIds.has(c.id);
      const historyList = Array.isArray(c.hearing_history) ? c.hearing_history : [];

      return `
        <article class="case-card" id="card-${c.id}">
          
          <!-- Clickable Header Row -->
          <div onclick="app.toggleCard('${c.id}')" class="card-summary">
            
            <!-- Line 1: Court Badge vs Status Badge -->
            <div class="card-summary-top">
              <span class="court-badge">${c.court_name || 'Court'}</span>
              <span class="${statusInfo.badgeClass}">
                ${statusInfo.label}
              </span>
            </div>

            <!-- Line 2: Parties Title vs Chevron -->
            <div class="card-summary-main">
              <h3 class="card-parties">${c.parties}</h3>
              <span id="card-chevron-${c.id}" class="chevron-arrow ${isExpanded ? 'expanded' : ''}" aria-hidden="true">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </span>
            </div>

          </div>

          <!-- Expansion Dossier -->
          <div id="card-details-${c.id}" class="card-details ${isExpanded ? 'expanded' : ''}">
            <div class="card-details-inner">
              
              <!-- Meta line: Case #, URGENT, NDOH Date -->
              <div class="details-meta-row">
                <span class="case-no-pill">
                  ${c.case_number}
                  <button 
                    type="button"
                    onclick="event.stopPropagation(); app.copyToClipboard('${c.case_number}', 'Case No.')" 
                    class="copy-icon-btn"
                    title="Copy Case Number"
                  >
                    📋
                  </button>
                </span>

                ${isUrgent ? `
                  <span class="urgent-badge">URGENT</span>
                ` : ''}

                <span class="hearing-date-pill">🗓 Hearing: <strong>${displayDate}</strong></span>
              </div>

              <!-- Stage line -->
              <div class="stage-row">
                <span class="stage-label">STAGE:</span>
                <span class="stage-pill">${c.hearing_stage || 'General'}</span>
              </div>

              <!-- Senior directive / yellow notes banner -->
              ${c.senior_instructions ? `
                <div class="notes-banner">
                  “${c.senior_instructions}”
                </div>
              ` : ''}

              <!-- Past Hearing History Section -->
              <div class="history-block">
                <div class="history-block-header">
                  <span class="history-label">Hearing History</span>
                  <span class="history-count-badge">${historyList.length} Recorded</span>
                </div>

                ${historyList.length > 0 ? `
                  <div class="history-items-list">
                    ${[...historyList].reverse().map(h => `
                      <div class="history-item-entry">
                        <div class="history-item-meta">
                          <span class="history-date">${this.formatDisplayDate(h.date)}</span>
                          <span class="history-sep">•</span>
                          <span class="history-stage">Stage: <strong>${h.stage || 'Hearing'}</strong></span>
                        </div>
                        ${h.remarks ? `<p class="history-notes-text">“${h.remarks}”</p>` : ''}
                      </div>
                    `).join('')}
                  </div>
                ` : `
                  <p class="history-empty-text">First hearing entry recorded. Click 'Update Date' to advance the date and record history.</p>
                `}
              </div>

              <!-- Action Buttons Row -->
              <div class="card-actions-row" onclick="event.stopPropagation()">
                <button 
                  type="button"
                  onclick="app.openNdohModal('${c.id}')"
                  class="btn-action-update"
                >
                  📅 Update Date
                </button>

                <button 
                  type="button"
                  onclick="app.shareOnWhatsApp('${c.id}')"
                  class="btn-action-whatsapp"
                  title="Send WhatsApp Update"
                >
                  📞 WhatsApp
                </button>

                ${c.file_drive_link ? `
                  <a 
                    href="${c.file_drive_link}" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    class="btn-action-ghost"
                    title="Open Drive Dossier"
                  >
                    📁
                  </a>
                ` : ''}

                <button 
                  type="button" 
                  onclick="app.editCase('${c.id}')" 
                  class="btn-action-ghost"
                  title="Edit Case"
                >
                  ✏️
                </button>

                <button 
                  type="button" 
                  onclick="app.deleteCase('${c.id}')" 
                  class="btn-action-danger"
                  title="Delete Case"
                >
                  🗑️
                </button>
              </div>

            </div>
          </div>

        </article>
      `;
    }).join('');
  }

  // MODAL 1: ADD / EDIT CASE (Offline First + Optimistic Local Update)
  openCaseModal(id = null) {
    const modal = document.getElementById('caseModal');
    const form = document.getElementById('caseForm');
    const title = document.getElementById('caseModalTitle');
    form.reset();

    if (id) {
      const item = this.cases.find(c => c.id === id);
      if (!item) return;
      title.textContent = 'Edit Case Entry';
      document.getElementById('caseId').value = item.id;
      document.getElementById('caseNumber').value = item.case_number;
      document.getElementById('caseParties').value = item.parties;
      document.getElementById('caseCourt').value = item.court_name || '';
      document.getElementById('caseJudge').value = item.judge_name || '';
      document.getElementById('caseNextDate').value = item.next_hearing_date;
      document.getElementById('caseStage').value = item.hearing_stage || '';
      document.getElementById('caseInstructions').value = item.senior_instructions || '';
      document.getElementById('caseDriveLink').value = item.file_drive_link || '';
      document.getElementById('casePriority').value = item.priority || 'Normal';
      document.getElementById('caseStatus').value = item.status || 'Active';
    } else {
      title.textContent = 'New Case Entry';
      document.getElementById('caseId').value = '';
      const today = new Date().toISOString().split('T')[0];
      document.getElementById('caseNextDate').value = today;
    }

    modal.classList.add('active');
  }

  closeCaseModal() {
    document.getElementById('caseModal').classList.remove('active');
  }

  async handleCaseSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('caseId').value;
    const existing = id ? this.cases.find(c => c.id === id) : null;
    const caseData = {
      id: id || 'case-' + Date.now(),
      case_number: document.getElementById('caseNumber').value.trim(),
      parties: document.getElementById('caseParties').value.trim(),
      court_name: document.getElementById('caseCourt').value.trim(),
      judge_name: document.getElementById('caseJudge').value.trim(),
      next_hearing_date: document.getElementById('caseNextDate').value,
      hearing_stage: document.getElementById('caseStage').value.trim(),
      senior_instructions: document.getElementById('caseInstructions').value.trim(),
      file_drive_link: document.getElementById('caseDriveLink').value.trim(),
      priority: document.getElementById('casePriority').value,
      status: document.getElementById('caseStatus').value,
      hearing_history: (existing && Array.isArray(existing.hearing_history)) ? existing.hearing_history : []
    };

    // 1. Instant Local Update (Optimistic UI)
    if (id) {
      const idx = this.cases.findIndex(c => c.id === id);
      if (idx !== -1) this.cases[idx] = caseData;
    } else {
      this.cases.unshift(caseData);
    }

    this.saveToLocal();
    this.closeCaseModal();
    this.updateCounters();
    this.render();

    // 2. Queue for database sync
    this.enqueueSyncAction('upsert', caseData.id, caseData);

    // 3. If online, immediately sync queue
    if (this.isOnline && this.isSupabaseConnected) {
      this.autoSyncDatabase();
    } else {
      this.showToast(id ? 'Case updated locally' : 'Case saved locally', 'success');
    }
  }

  // MODAL 2: NDOH QUICK UPDATE
  openNdohModal(id) {
    const item = this.cases.find(c => c.id === id);
    if (!item) return;

    document.getElementById('ndohCaseId').value = item.id;
    document.getElementById('ndohCaseTitle').textContent = `${item.case_number} • ${item.parties}`;
    document.getElementById('ndohDate').value = item.next_hearing_date || new Date().toISOString().split('T')[0];
    document.getElementById('ndohStage').value = item.hearing_stage || '';
    document.getElementById('ndohNotes').value = item.senior_instructions || '';

    document.getElementById('ndohModal').classList.add('active');
  }

  closeNdohModal() {
    document.getElementById('ndohModal').classList.remove('active');
  }

  async handleNdohSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('ndohCaseId').value;
    const item = this.cases.find(c => c.id === id);
    if (!item) return;

    if (!Array.isArray(item.hearing_history)) {
      item.hearing_history = [];
    }

    const previousDate = item.next_hearing_date;
    const previousStage = item.hearing_stage || 'General Hearing';
    const newDate = document.getElementById('ndohDate').value;
    const newStage = document.getElementById('ndohStage').value.trim();
    const notes = document.getElementById('ndohNotes').value.trim();

    // Auto-record the past hearing into history
    if (previousDate) {
      item.hearing_history.push({
        date: previousDate,
        stage: previousStage,
        remarks: notes || item.senior_instructions || 'Hearing concluded; next date fixed by court',
        recorded_at: new Date().toISOString()
      });
    }

    item.next_hearing_date = newDate;
    if (newStage) item.hearing_stage = newStage;
    if (notes) item.senior_instructions = notes;

    // 1. Instant Local Update
    this.saveToLocal();
    this.closeNdohModal();
    this.updateCounters();
    this.render();

    // 2. Queue for database sync
    this.enqueueSyncAction('upsert', item.id, item);

    // 3. Trigger background sync if online
    if (this.isOnline && this.isSupabaseConnected) {
      this.autoSyncDatabase();
    } else {
      this.showToast('Hearing date updated locally', 'success');
    }
  }

  editCase(id) {
    this.openCaseModal(id);
  }

  async deleteCase(id) {
    if (!confirm('Are you sure you want to delete this case?')) return;

    this.cases = this.cases.filter(c => c.id !== id);

    // 1. Instant Local Update
    this.saveToLocal();
    this.updateCounters();
    this.render();

    // 2. Queue delete for database
    this.enqueueSyncAction('delete', id, null);

    // 3. Trigger sync
    if (this.isOnline && this.isSupabaseConnected) {
      this.autoSyncDatabase();
    } else {
      this.showToast('Case deleted', 'info');
    }
  }

  // WhatsApp Share Formatter
  shareOnWhatsApp(id) {
    const item = this.cases.find(c => c.id === id);
    if (!item) return;

    const displayDate = this.formatDisplayDate(item.next_hearing_date);
    const historyCount = (item.hearing_history && item.hearing_history.length) || 0;
    const lastHearing = historyCount > 0 ? item.hearing_history[item.hearing_history.length - 1] : null;

    const message = 
`*COURT CASE UPDATE*
*Case No:* ${item.case_number}
*Parties:* ${item.parties}
*Court:* ${item.court_name || 'N/A'}${item.judge_name ? ` (${item.judge_name})` : ''}
*Next Hearing Date (NDOH):* ${displayDate}
*Current Stage:* ${item.hearing_stage || 'General'}
${lastHearing ? `*Last Order (${this.formatDisplayDate(lastHearing.date)}):* ${lastHearing.stage} - ${lastHearing.remarks}\n` : ''}${item.senior_instructions ? `*Senior Directive:* ${item.senior_instructions}\n` : ''}${item.file_drive_link ? `*Dossier:* ${item.file_drive_link}\n` : ''}
_Legal Diary Portal_`;

    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  }

  // Print Daily Cause List Table
  printDailyBoard() {
    const list = this.getFilteredCases();
    const dateStr = new Date().toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const printWin = window.open('', '_blank');
    if (!printWin) {
      alert('Please allow popups to print the Daily Cause List.');
      return;
    }

    const rows = list.map((c, i) => {
      const hist = (c.hearing_history && c.hearing_history.length > 0) ? c.hearing_history[c.hearing_history.length - 1] : null;
      return `
        <tr>
          <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: center;">${i + 1}</td>
          <td style="padding: 8px; border: 1px solid #cbd5e1; font-weight: 600;">${c.case_number}</td>
          <td style="padding: 8px; border: 1px solid #cbd5e1;"><b>${c.parties}</b></td>
          <td style="padding: 8px; border: 1px solid #cbd5e1;">${c.court_name || '—'}<br><small>${c.judge_name || ''}</small></td>
          <td style="padding: 8px; border: 1px solid #cbd5e1; font-variant-numeric: tabular-nums;">${this.formatDisplayDate(c.next_hearing_date)}</td>
          <td style="padding: 8px; border: 1px solid #cbd5e1;">${c.hearing_stage || '—'}</td>
          <td style="padding: 8px; border: 1px solid #cbd5e1; font-size: 11px;">
            ${hist ? `<b>Last (${this.formatDisplayDate(hist.date)}):</b> ${hist.stage}<br>` : ''}
            ${c.senior_instructions ? `<i>"${c.senior_instructions}"</i>` : '—'}
          </td>
        </tr>
      `;
    }).join('');

    printWin.document.write(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <title>Daily Cause List • ${dateStr}</title>
        <style>
          body { font-family: ui-sans-serif, system-ui, sans-serif; padding: 24px; color: #0f172a; line-height: 1.5; }
          h1 { margin: 0 0 4px 0; font-size: 20px; font-weight: 650; letter-spacing: -0.02em; }
          p { margin: 0 0 16px 0; font-size: 13px; color: #64748b; }
          table { width: 100%; border-collapse: collapse; font-size: 13px; }
          th { background: #f1f5f9; padding: 10px 8px; border: 1px solid #cbd5e1; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; }
          @media print { button { display: none; } }
        </style>
      </head>
      <body>
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px;">
          <div>
            <h1>Advocate Case Diary • Daily Cause List</h1>
            <p>Generated on: ${dateStr} | Total Files: ${list.length}</p>
          </div>
          <button onclick="window.print()" style="padding: 8px 16px; background: #2563eb; color: #fff; border: none; border-radius: 6px; font-weight: 600; cursor: pointer;">Print</button>
        </div>
        <table>
          <thead>
            <tr>
              <th scope="col" style="width: 35px; text-align: center;">#</th>
              <th scope="col">Case No.</th>
              <th scope="col">Parties</th>
              <th scope="col">Court &amp; Bench</th>
              <th scope="col">NDOH Date</th>
              <th scope="col">Stage</th>
              <th scope="col">Last Hearing &amp; Senior Remarks</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </body>
      </html>
    `);
    printWin.document.close();
  }

  // Settings & Cloud Sync
  openSettingsModal() {
    this.updateSyncBadge();
    const noteEl = document.getElementById('storageNoteText');
    if (noteEl) {
      noteEl.textContent = `${this.cases.length} court case${this.cases.length === 1 ? '' : 's'} saved locally on this device.`;
    }
    const urlInput = document.getElementById('cfgUrl');
    const keyInput = document.getElementById('cfgKey');
    if (urlInput) urlInput.value = this.supabaseUrl;
    if (keyInput) keyInput.value = this.supabaseKey;
    document.getElementById('settingsModal').classList.add('active');
  }

  closeSettingsModal() {
    document.getElementById('settingsModal').classList.remove('active');
  }

  saveSupabaseConfig() {
    const url = document.getElementById('cfgUrl').value.trim();
    const key = document.getElementById('cfgKey').value.trim();

    if (url && key) {
      localStorage.setItem('legal_diary_supabase_url', url);
      localStorage.setItem('legal_diary_supabase_key', key);
      this.supabaseUrl = url;
      this.supabaseKey = key;
      this.isSupabaseConnected = true;
      this.showToast('Cloud Credentials Saved', 'success');
      this.closeSettingsModal();
      this.autoSyncDatabase(true);
    } else {
      localStorage.removeItem('legal_diary_supabase_url');
      localStorage.removeItem('legal_diary_supabase_key');
      this.supabaseUrl = '';
      this.supabaseKey = '';
      this.isSupabaseConnected = false;
      this.updateSyncBadge();
      this.showToast('Reverted to Offline Device Storage', 'info');
      this.closeSettingsModal();
    }
  }

  useDemoMode() {
    if (confirm('Restore default sample cases and hearing history?')) {
      this.cases = this.getSampleCases();
      this.syncQueue = [];
      this.saveSyncQueue();
      this.saveToLocal();
      this.updateCounters();
      this.render();
      this.closeSettingsModal();
      this.showToast('Sample cases restored', 'info');
    }
  }

  // Minimal Toast
  showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast-box';
    toast.textContent = message;

    if (type === 'success') {
      toast.style.borderColor = 'var(--success)';
      toast.style.color = 'var(--success)';
    } else if (type === 'warning') {
      toast.style.borderColor = 'var(--warn)';
      toast.style.color = 'var(--warn)';
    }

    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-8px)';
      toast.style.transition = 'opacity 140ms ease, transform 140ms ease';
      setTimeout(() => toast.remove(), 150);
    }, 2400);
  }
}

// Ready
document.addEventListener('DOMContentLoaded', () => {
  window.app = new LegalDiaryApp();
});
