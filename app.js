// Legal Diary • Swiss Minimalist UI Engine
// Offline-First Architecture & Auto-Sync Engine (Zero External Dependencies)

class LegalDiaryApp {
  constructor() {
    this.cases = [];
    this.currentTab = 'board'; // 'board' (today), 'all', 'chamber', 'settings'
    this.quickFilter = 'all';
    this.searchQuery = '';
    this.selectedCourt = 'all';
    this.expandedCardIds = new Set();
    this.modalChamberStatus = true;
    this.currentHistoryCaseId = null;
    this.chamberSearchQuery = '';
    this.chamberAlmirahFilter = 'all';
    this.historySearchQuery = '';
    this.editingHistoryIndex = -1;

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
    this.switchTab('board', false);
    this.initScrollListener();
    this.initCardSwipeListeners();

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
            case_type: item.data.case_type || 'Criminal',
            representing: item.data.representing || 'Petitioner',
            court_name: item.data.court_name || '',
            judge_name: item.data.judge_name || '',
            police_station_fir: item.data.police_station_fir || '',
            act_sections: item.data.act_sections || '',
            client_name: item.data.client_name || '',
            client_phone: item.data.client_phone || '',
            next_hearing_date: item.data.next_hearing_date,
            hearing_stage: item.data.hearing_stage || '',
            senior_instructions: item.data.senior_instructions || '',
            file_drive_link: item.data.file_drive_link || '',
            priority: item.data.priority || 'Normal',
            status: item.data.status || 'Active',
            file_in_chamber: item.data.file_in_chamber !== false,
            file_current_holder: item.data.file_current_holder || 'Chamber',
            chamber_almirah: item.data.chamber_almirah || 'Almirah-A',
            chamber_shelf: item.data.chamber_shelf || 'Shelf-1',
            chamber_bundle_no: item.data.chamber_bundle_no || '',
            file_last_moved_at: item.data.file_last_moved_at || null,
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
              case_type: c.case_type || 'Criminal',
              representing: c.representing || 'Petitioner',
              file_in_chamber: c.file_in_chamber !== false,
              file_current_holder: c.file_current_holder || 'Chamber',
              chamber_almirah: c.chamber_almirah || 'Almirah-A',
              chamber_shelf: c.chamber_shelf || 'Shelf-1',
              chamber_bundle_no: c.chamber_bundle_no || '',
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

  // Mobile Touch Swipe Gestures (Swipe Right = Chamber Toggle, Swipe Left = NDOH Update)
  initCardSwipeListeners() {
    const list = document.getElementById('casesList');
    if (!list) return;

    let startX = 0;
    let startY = 0;
    let targetCard = null;

    list.addEventListener('touchstart', (e) => {
      targetCard = e.target.closest('.case-card');
      if (!targetCard) return;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    }, { passive: true });

    list.addEventListener('touchend', (e) => {
      if (!targetCard) return;
      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;
      const diffX = endX - startX;
      const diffY = endY - startY;

      // Check for horizontal swipe gesture (> 80px horizontal, less vertical)
      if (Math.abs(diffX) > 80 && Math.abs(diffX) > Math.abs(diffY) * 1.8) {
        const cardId = targetCard.id.replace('card-', '');
        const item = this.cases.find(c => c.id === cardId);
        if (!item) return;

        if (diffX > 0) {
          // Swipe Right: Chamber toggle
          this.triggerHaptic('medium');
          if (item.file_in_chamber === false) {
            this.quickReturnToChamber(cardId);
          } else {
            this.openChamberModal(cardId);
          }
        } else {
          // Swipe Left: Quick NDOH Update
          this.triggerHaptic('medium');
          this.openNdohModal(cardId);
        }
      }
      targetCard = null;
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

  // Load cases (Offline First: always read local cache first)
  async loadCases() {
    const isCleaned = localStorage.getItem('legal_diary_clean_db_v1');
    if (!isCleaned) {
      // One-time purge of any previous hardcoded mock/sample cases from browser storage
      this.cases = [];
      this.saveToLocal();
      localStorage.setItem('legal_diary_clean_db_v1', 'true');
      return;
    }

    const local = localStorage.getItem(this.STORAGE_KEY_CASES);
    if (local) {
      try {
        this.cases = JSON.parse(local);
        this.ensureHistoryIntegrity();
      } catch (e) {
        this.cases = [];
        this.saveToLocal();
      }
    } else {
      this.cases = [];
      this.saveToLocal();
    }
  }

  // Ensure every case has valid hearing_history array and physical chamber tracking fields
  ensureHistoryIntegrity() {
    let modified = false;
    this.cases.forEach(c => {
      if (c.file_in_chamber === undefined) {
        c.file_in_chamber = true;
        modified = true;
      }
      if (!c.file_current_holder) {
        c.file_current_holder = 'Chamber';
        modified = true;
      }
      if (!Array.isArray(c.hearing_history)) {
        c.hearing_history = [];
        modified = true;
      }
    });
    if (modified) {
      this.saveToLocal();
    }
  }

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Dynamically populate court filter dropdown from user's registered cases
  populateCourtDropdown() {
    const select = document.getElementById('courtSelect');
    if (!select) return;
    const currentVal = this.selectedCourt || 'all';
    const courts = new Set();
    this.cases.forEach(c => {
      if (c.court_name && c.court_name.trim()) {
        courts.add(c.court_name.trim());
      }
    });
    const sorted = Array.from(courts).sort();
    
    let optionsHtml = '<option value="all">🏛 All Courts</option>';
    sorted.forEach(c => {
      optionsHtml += `<option value="${this.escapeHtml(c)}">${this.escapeHtml(c)}</option>`;
    });
    select.innerHTML = optionsHtml;
    select.value = sorted.includes(currentVal) ? currentVal : 'all';
    this.selectedCourt = select.value;

    // Also populate datalist in case modal
    const datalist = document.getElementById('courtsDatalist');
    if (datalist) {
      datalist.innerHTML = sorted.map(c => `<option value="${this.escapeHtml(c)}"></option>`).join('');
    }
  }

  // Dynamically populate chamber almirah filter pills from user's registered cases
  renderAlmirahFilterPills() {
    const bar = document.getElementById('chamberAlmirahFilterBar');
    if (!bar) return;
    const almirahs = new Set();
    this.cases.forEach(c => {
      if (c.chamber_almirah && c.chamber_almirah.trim()) {
        almirahs.add(c.chamber_almirah.trim());
      }
    });
    const sorted = Array.from(almirahs).sort();
    const current = this.chamberAlmirahFilter || 'all';

    let html = `
      <button type="button" class="segment-pill ${current === 'all' ? 'active' : ''}" onclick="app.setChamberAlmirahFilter('all')" data-alm="all">
        <span>All Racks (${this.cases.length})</span>
      </button>
    `;
    sorted.forEach(alm => {
      const active = current === alm ? 'active' : '';
      const count = this.cases.filter(c => c.chamber_almirah === alm).length;
      html += `
        <button type="button" class="segment-pill ${active}" onclick="app.setChamberAlmirahFilter('${this.escapeHtml(alm)}')" data-alm="${this.escapeHtml(alm)}">
          <span>${this.escapeHtml(alm)} (${count})</span>
        </button>
      `;
    });
    bar.innerHTML = html;
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
    let inChamberCount = 0;
    let outChamberCount = 0;

    this.cases.forEach(c => {
      if (c.status === 'Disposed') return;
      const diff = this.getDateDifference(c.next_hearing_date);
      if (diff === 0) todayCount++;
      else if (diff === 1) tomorrowCount++;
      else if (diff < 0) overdueCount++;

      if (diff >= 0 && diff <= 7) weekCount++;

      if (c.file_in_chamber !== false) inChamberCount++;
      else outChamberCount++;
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
    setSafe('countInChamber', inChamberCount);
    setSafe('countOutChamber', outChamberCount);

    // Mobile Bottom Nav Badges
    setSafe('navBadgeToday', todayCount);
    setSafe('navBadgeChamberOut', outChamberCount);

    setSafe('chamberStatIn', inChamberCount);
    setSafe('chamberStatOut', outChamberCount);
  }

  // Mobile Bottom Navigation Tab Switcher
  switchTab(tabName, shouldRender = true) {
    this.currentTab = tabName;

    // Update bottom nav active state
    const navButtons = {
      board: document.getElementById('btnNavBoard'),
      all: document.getElementById('btnNavCases'),
      chamber: document.getElementById('btnNavChamber'),
      settings: document.getElementById('btnNavSettings')
    };

    Object.keys(navButtons).forEach(key => {
      if (navButtons[key]) {
        if (key === tabName) navButtons[key].classList.add('active');
        else navButtons[key].classList.remove('active');
      }
    });

    const casesList = document.getElementById('casesList');
    const chamberView = document.getElementById('chamberView');
    const mainSectionBar = document.getElementById('mainSectionBar');
    const sectionTitleText = document.getElementById('sectionTitleText');
    const filterPillsBar = document.querySelector('.filters-segment-bar');
    const emptyState = document.getElementById('emptyState');

    if (tabName === 'chamber') {
      if (casesList) casesList.style.display = 'none';
      if (chamberView) chamberView.style.display = 'flex';
      if (filterPillsBar) filterPillsBar.style.display = 'none';
      if (mainSectionBar) mainSectionBar.style.display = 'none';
      if (emptyState) emptyState.style.display = 'none';
      this.renderChamberView();
    } else {
      if (casesList) casesList.style.display = 'grid';
      if (chamberView) chamberView.style.display = 'none';
      if (filterPillsBar) filterPillsBar.style.display = 'flex';
      if (mainSectionBar) mainSectionBar.style.display = 'flex';

      if (tabName === 'board') {
        this.setQuickFilter('today');
        if (sectionTitleText) sectionTitleText.textContent = "TODAY'S CAUSE LIST & HEARINGS";
      } else if (tabName === 'all') {
        this.setQuickFilter('all');
        if (sectionTitleText) sectionTitleText.textContent = "ALL REGISTERED CASES";
      }
    }
  }

  // Render Chamber Inventory & Outside Files View
  renderChamberView() {
    this.updateCounters();
    this.renderAlmirahFilterPills();
    const outsideListEl = document.getElementById('chamberOutsideList');
    const almirahListEl = document.getElementById('chamberAlmirahList');

    const q = (this.chamberSearchQuery || '').toLowerCase();
    const almFilter = this.chamberAlmirahFilter || 'all';

    // 1. Files Outside Chamber (Filtered by search)
    let outsideCases = this.cases.filter(c => c.file_in_chamber === false);
    if (q) {
      outsideCases = outsideCases.filter(c => 
        (c.case_number && c.case_number.toLowerCase().includes(q)) ||
        (c.parties && c.parties.toLowerCase().includes(q)) ||
        (c.file_current_holder && c.file_current_holder.toLowerCase().includes(q)) ||
        (c.chamber_almirah && c.chamber_almirah.toLowerCase().includes(q))
      );
    }

    if (outsideListEl) {
      if (outsideCases.length === 0) {
        outsideListEl.innerHTML = `
          <div style="padding: 16px; text-align: center; color: var(--success); background: var(--success-soft); border-radius: var(--radius-sm); font-size: 13px; font-weight: 600;">
            ${q ? 'No outside files match your search query.' : '✅ All physical case files are currently safely inside your chamber!'}
          </div>
        `;
      } else {
        outsideListEl.innerHTML = outsideCases.map(c => `
          <div class="chamber-outside-row">
            <div>
              <div style="font-weight: 750; font-size: 13px;">${c.case_number} • ${c.parties}</div>
              <div style="font-size: 12px; color: var(--warn); margin-top: 3px;">
                📍 Holder / Location: <strong>${c.file_current_holder || 'In Court / Junior'}</strong>
                ${c.chamber_almirah ? ` • <span class="text-muted">(Home: ${c.chamber_almirah} / ${c.chamber_shelf || 'Shelf-1'})</span>` : ''}
              </div>
            </div>
            <div style="display: flex; gap: 6px; flex-shrink: 0;">
              <button 
                type="button" 
                onclick="app.quickReturnToChamber('${c.id}')" 
                class="btn btn-primary btn-sm" 
                style="min-height: 28px; padding: 2px 10px; font-size: 11px; background: var(--success); border-color: var(--success);"
                title="Return file back to chamber"
              >
                ⏎ Return to Chamber
              </button>
              <button 
                type="button" 
                onclick="app.openChamberModal('${c.id}')" 
                class="btn btn-secondary btn-sm" 
                style="min-height: 28px; padding: 2px 8px; font-size: 11px;"
              >
                Edit
              </button>
            </div>
          </div>
        `).join('');
      }
    }

    // 2. Chamber Almirah & Rack Directory (Filtered by rack & search)
    if (almirahListEl) {
      let insideCases = this.cases.filter(c => c.file_in_chamber !== false);
      if (q) {
        insideCases = insideCases.filter(c => 
          (c.case_number && c.case_number.toLowerCase().includes(q)) ||
          (c.parties && c.parties.toLowerCase().includes(q)) ||
          (c.chamber_almirah && c.chamber_almirah.toLowerCase().includes(q)) ||
          (c.chamber_shelf && c.chamber_shelf.toLowerCase().includes(q)) ||
          (c.chamber_bundle_no && c.chamber_bundle_no.toLowerCase().includes(q))
        );
      }
      if (almFilter !== 'all') {
        insideCases = insideCases.filter(c => (c.chamber_almirah || '').includes(almFilter));
      }

      const almirahMap = {};
      insideCases.forEach(c => {
        const alm = c.chamber_almirah || 'Almirah-A';
        if (!almirahMap[alm]) almirahMap[alm] = [];
        almirahMap[alm].push(c);
      });

      const almirahs = Object.keys(almirahMap).sort();
      if (almirahs.length === 0) {
        almirahListEl.innerHTML = `<p class="text-muted" style="font-size: 13px;">No cases found matching your chamber filter.</p>`;
      } else {
        almirahListEl.innerHTML = almirahs.map(alm => {
          const files = almirahMap[alm];
          return `
            <div class="almirah-card">
              <div class="almirah-title">
                <span>🗄️ ${alm}</span>
                <span class="pill-count" style="background: var(--accent); color: #fff;">${files.length} Files</span>
              </div>
              <div style="display: flex; flex-direction: column; gap: 6px;">
                ${files.slice(0, 8).map(f => `
                  <div style="font-size: 12px; display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid var(--border);">
                    <span style="font-weight: 600;">${f.case_number}</span>
                    <span class="text-muted">${f.chamber_shelf || 'Shelf-1'}${f.chamber_bundle_no ? ` • ${f.chamber_bundle_no}` : ''}</span>
                  </div>
                `).join('')}
                ${files.length > 8 ? `
                  <div style="font-size: 11px; color: var(--accent); font-weight: 600; text-align: center; margin-top: 4px;">
                    + ${files.length - 8} more files in this rack
                  </div>
                ` : ''}
              </div>
            </div>
          `;
        }).join('');
      }
    }
  }

  // Chamber Search & Filter Handlers
  handleChamberSearch(query) {
    this.chamberSearchQuery = query.toLowerCase().trim();
    this.renderChamberView();
  }

  setChamberAlmirahFilter(alm) {
    this.chamberAlmirahFilter = alm;
    document.querySelectorAll('#chamberAlmirahFilterBar .segment-pill').forEach(btn => {
      if (btn.dataset.alm === alm) btn.classList.add('active');
      else btn.classList.remove('active');
    });
    this.renderChamberView();
  }

  // 1-Tap Daily Chamber Routines
  checkOutTodayFiles() {
    const todayCases = this.cases.filter(c => {
      if (c.status === 'Disposed') return false;
      return this.getDateDifference(c.next_hearing_date) === 0 && c.file_in_chamber !== false;
    });

    if (todayCases.length === 0) {
      this.showToast("No chamber files pending checkout for today's hearing", 'info');
      return;
    }

    todayCases.forEach(c => {
      c.file_in_chamber = false;
      c.file_current_holder = `In Courtroom (${c.court_name || 'Court'})`;
      c.file_last_moved_at = new Date().toISOString();
      this.enqueueSyncAction('upsert', c.id, c);
    });

    this.saveToLocal();
    this.updateCounters();
    this.render();
    this.renderChamberView();
    if (this.isOnline && this.isSupabaseConnected) this.autoSyncDatabase();

    this.triggerHaptic('success');
    this.showToast(`Checked out ${todayCases.length} files to Courtroom 📤`, 'success');
  }

  returnAllFilesToChamber() {
    const outsideCases = this.cases.filter(c => c.file_in_chamber === false);
    if (outsideCases.length === 0) {
      this.showToast('All files are already in chamber 🟢', 'info');
      return;
    }

    if (!confirm(`Return all ${outsideCases.length} files back to their chamber racks?`)) return;

    outsideCases.forEach(c => {
      c.file_in_chamber = true;
      c.file_current_holder = 'Chamber';
      c.file_last_moved_at = new Date().toISOString();
      this.enqueueSyncAction('upsert', c.id, c);
    });

    this.saveToLocal();
    this.updateCounters();
    this.render();
    this.renderChamberView();
    if (this.isOnline && this.isSupabaseConnected) this.autoSyncDatabase();

    this.triggerHaptic('success');
    this.showToast(`All ${outsideCases.length} files safely returned to Chamber 🟢`, 'success');
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
        if (this.quickFilter === 'in_chamber') {
          return item.file_in_chamber !== false;
        }
        if (this.quickFilter === 'out_chamber') {
          return item.file_in_chamber === false;
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
          (item.case_type && item.case_type.toLowerCase().includes(q)) ||
          (item.client_name && item.client_name.toLowerCase().includes(q)) ||
          (item.client_phone && item.client_phone.includes(q)) ||
          (item.police_station_fir && item.police_station_fir.toLowerCase().includes(q)) ||
          (item.act_sections && item.act_sections.toLowerCase().includes(q)) ||
          (item.chamber_almirah && item.chamber_almirah.toLowerCase().includes(q)) ||
          (item.chamber_shelf && item.chamber_shelf.toLowerCase().includes(q)) ||
          (item.chamber_bundle_no && item.chamber_bundle_no.toLowerCase().includes(q)) ||
          (item.file_current_holder && item.file_current_holder.toLowerCase().includes(q)) ||
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

  // RENDER (Mobile-First Agenda Stream with Chamber File Tracking & Hearing History)
  render() {
    this.populateCourtDropdown();
    const container = document.getElementById('casesList');
    const emptyState = document.getElementById('emptyState');
    const filtered = this.getFilteredCases();

    if (filtered.length === 0) {
      container.innerHTML = '';
      if (emptyState) {
        emptyState.style.display = 'block';
        const titleEl = document.getElementById('emptyStateTitle');
        const descEl = document.getElementById('emptyStateDesc');
        const actionsEl = document.getElementById('emptyStateActions');
        
        if (this.cases.length === 0) {
          if (titleEl) titleEl.textContent = 'Case Diary is Empty';
          if (descEl) descEl.textContent = 'No cases registered yet. Tap \'+ Case\' to add your first client case with chamber tracking and hearing history.';
          if (actionsEl) actionsEl.innerHTML = '<button type="button" onclick="app.openCaseModal()" class="btn btn-primary btn-sm">+ Add First Case</button>';
        } else {
          if (titleEl) titleEl.textContent = 'No Records Match Filter';
          if (descEl) descEl.textContent = 'No cases match your active filter or search query.';
          if (actionsEl) actionsEl.innerHTML = '<button type="button" onclick="app.clearSearch(); app.setQuickFilter(\'all\')" class="btn btn-secondary btn-sm">Reset All Filters</button>';
        }
      }
      return;
    }

    if (emptyState) emptyState.style.display = 'none';

    container.innerHTML = filtered.map((c, idx) => {
      const statusInfo = this.getHearingStatusInfo(c.next_hearing_date, c.status);
      const displayDate = this.formatDisplayDate(c.next_hearing_date);
      const isUrgent = c.priority === 'Urgent';
      const isExpanded = this.expandedCardIds.has(c.id);
      const historyList = Array.isArray(c.hearing_history) ? c.hearing_history : [];
      const isInChamber = c.file_in_chamber !== false;
      const cleanPhone = (c.client_phone || '').replace(/\D/g, '');

      return `
        <article class="case-card" id="card-${c.id}">
          
          <!-- Clickable Header Row -->
          <div onclick="app.toggleCard('${c.id}')" class="card-summary">
            
            <!-- Line 1: Court Badge vs Case Type vs Status Badge -->
            <div class="card-summary-top">
              <span class="court-badge">${c.court_name || 'Court'}</span>
              <span style="font-size: 11px; font-weight: 600; color: var(--text-muted); padding: 2px 7px; background: var(--surface-subtle); border-radius: var(--radius-sm);">
                ${c.case_type || 'Criminal'}${c.representing ? ` • ${c.representing}` : ''}
              </span>
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

            <!-- Line 3: Physical Chamber File Location Status (Always visible on mobile) -->
            ${isInChamber ? `
              <div class="chamber-status-box in-chamber" onclick="event.stopPropagation()">
                <span>🟢 <strong>In Chamber</strong>: ${c.chamber_almirah || 'Almirah-A'} • ${c.chamber_shelf || 'Shelf-1'} ${c.chamber_bundle_no ? `• ${c.chamber_bundle_no}` : ''}</span>
                <button type="button" onclick="app.openChamberModal('${c.id}')" class="chamber-quick-btn" title="Mark physical file issued out">
                  📤 Issue / Move
                </button>
              </div>
            ` : `
              <div class="chamber-status-box out-chamber" onclick="event.stopPropagation()">
                <span>🟠 <strong>Outside Chamber</strong>: With <strong>${c.file_current_holder || 'In Court'}</strong></span>
                <div style="display: flex; gap: 4px;">
                  <button type="button" onclick="app.quickReturnToChamber('${c.id}')" class="chamber-quick-btn" style="background: var(--success); color: #fff; border-color: var(--success);" title="Return file to chamber">
                    ⏎ Return
                  </button>
                  <button type="button" onclick="app.openChamberModal('${c.id}')" class="chamber-quick-btn" title="Change location">
                    Edit
                  </button>
                </div>
              </div>
            `}

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

              <!-- Stage & Court Room line -->
              <div class="stage-row" style="display: flex; flex-wrap: wrap; gap: 8px; justify-content: space-between;">
                <div>
                  <span class="stage-label">STAGE:</span>
                  <span class="stage-pill">${c.hearing_stage || 'General'}</span>
                </div>
                ${c.judge_name ? `
                  <div style="font-size: 11px; color: var(--text-muted); align-self: center;">
                    🏛️ <strong>${c.judge_name}</strong>
                  </div>
                ` : ''}
              </div>

              <!-- Police Station & FIR / Acts if present -->
              ${(c.police_station_fir || c.act_sections) ? `
                <div style="font-size: 12px; background: var(--surface-subtle); padding: 7px 10px; border-radius: var(--radius-sm); border-left: 2px solid var(--accent); margin-top: 6px;">
                  ${c.police_station_fir ? `<span>🚓 <strong>${c.police_station_fir}</strong></span> ` : ''}
                  ${c.act_sections ? `<span class="text-muted">• Sec: <strong>${c.act_sections}</strong></span>` : ''}
                </div>
              ` : ''}

              <!-- Client Details & 1-Tap Call/WhatsApp -->
              ${(c.client_name || c.client_phone) ? `
                <div style="display: flex; align-items: center; justify-content: space-between; font-size: 12px; margin-top: 6px; padding: 6px 10px; background: var(--surface-subtle); border-radius: var(--radius-sm);">
                  <div>
                    <span>👤 <strong>${c.client_name || 'Client'}</strong>${c.client_phone ? `: ${c.client_phone}` : ''}</span>
                  </div>
                  ${cleanPhone ? `
                    <div class="client-actions" onclick="event.stopPropagation()">
                      <a href="tel:${cleanPhone}" class="btn-call" title="Call Client">📞 Call</a>
                      <a href="https://wa.me/91${cleanPhone}?text=${encodeURIComponent(`Namaste, regarding case ${c.case_number} (${c.parties}), next hearing date is fixed for ${displayDate}.`)}" target="_blank" class="btn-wa" title="WhatsApp Client">💬 Chat</a>
                    </div>
                  ` : ''}
                </div>
              ` : ''}

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
                  <div style="display: flex; align-items: center; gap: 6px;">
                    <span class="history-count-badge">${historyList.length} Recorded</span>
                    <button 
                      type="button" 
                      onclick="event.stopPropagation(); app.openHistoryModal('${c.id}')" 
                      class="btn btn-secondary btn-sm" 
                      style="min-height: 24px; padding: 2px 8px; font-size: 11px;"
                    >
                      📜 View Timeline
                    </button>
                  </div>
                </div>

                ${historyList.length > 0 ? `
                  <div class="history-items-list">
                    ${[...historyList].reverse().slice(0, 2).map(h => `
                      <div class="history-item-entry">
                        <div class="history-item-meta">
                          <span class="history-date">${this.formatDisplayDate(h.date)}</span>
                          <span class="history-sep">•</span>
                          <span class="history-stage">Stage: <strong>${h.stage || 'Hearing'}</strong></span>
                        </div>
                        ${h.remarks ? `<p class="history-notes-text">“${h.remarks}”</p>` : ''}
                      </div>
                    `).join('')}
                    ${historyList.length > 2 ? `
                      <div style="text-align: center; margin-top: 4px;">
                        <a href="javascript:void(0)" onclick="event.stopPropagation(); app.openHistoryModal('${c.id}')" style="font-size: 11px; color: var(--accent); font-weight: 600; text-decoration: none;">
                          + View all ${historyList.length} hearings in timeline →
                        </a>
                      </div>
                    ` : ''}
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

  // Toggle Chamber Form Fields (In Chamber vs Outside)
  toggleChamberFormFields(val) {
    const isInChamber = val === 'true' || val === true;
    const holderWrap = document.getElementById('holderFieldWrap');
    const locWrap = document.getElementById('chamberLocationFieldsWrap');
    if (holderWrap) holderWrap.style.display = isInChamber ? 'none' : 'block';
    if (locWrap) locWrap.style.display = isInChamber ? 'grid' : 'none';
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
      document.getElementById('caseType').value = item.case_type || 'Criminal';
      document.getElementById('caseRepresenting').value = item.representing || 'Petitioner';
      document.getElementById('caseCourt').value = item.court_name || '';
      document.getElementById('caseJudge').value = item.judge_name || '';
      document.getElementById('casePoliceStation').value = item.police_station_fir || '';
      document.getElementById('caseSections').value = item.act_sections || '';
      document.getElementById('caseClientName').value = item.client_name || '';
      document.getElementById('caseClientPhone').value = item.client_phone || '';
      document.getElementById('caseNextDate').value = item.next_hearing_date;
      document.getElementById('casePriority').value = item.priority || 'Normal';
      document.getElementById('caseStage').value = item.hearing_stage || '';
      document.getElementById('caseStatus').value = item.status || 'Active';
      
      const inChamber = item.file_in_chamber !== false;
      document.getElementById('caseFileInChamber').value = String(inChamber);
      document.getElementById('caseChamberAlmirah').value = item.chamber_almirah || 'Almirah-A';
      document.getElementById('caseChamberShelf').value = item.chamber_shelf || 'Shelf-1';
      document.getElementById('caseChamberBundle').value = item.chamber_bundle_no || '';
      document.getElementById('caseCurrentHolder').value = item.file_current_holder || '';
      this.toggleChamberFormFields(inChamber);

      document.getElementById('caseInstructions').value = item.senior_instructions || '';
      document.getElementById('caseDriveLink').value = item.file_drive_link || '';
    } else {
      title.textContent = 'New Case Entry';
      document.getElementById('caseId').value = '';
      const today = new Date().toISOString().split('T')[0];
      document.getElementById('caseNextDate').value = today;
      document.getElementById('caseFileInChamber').value = 'true';
      document.getElementById('caseChamberAlmirah').value = 'Almirah-A';
      document.getElementById('caseChamberShelf').value = 'Shelf-1';
      document.getElementById('caseChamberBundle').value = '';
      document.getElementById('caseCurrentHolder').value = '';
      this.toggleChamberFormFields(true);
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
    const fileInChamber = document.getElementById('caseFileInChamber').value === 'true';

    const caseData = {
      id: id || 'case-' + Date.now(),
      case_number: document.getElementById('caseNumber').value.trim(),
      parties: document.getElementById('caseParties').value.trim(),
      case_type: document.getElementById('caseType').value,
      representing: document.getElementById('caseRepresenting').value,
      court_name: document.getElementById('caseCourt').value.trim(),
      judge_name: document.getElementById('caseJudge').value.trim(),
      police_station_fir: document.getElementById('casePoliceStation').value.trim(),
      act_sections: document.getElementById('caseSections').value.trim(),
      client_name: document.getElementById('caseClientName').value.trim(),
      client_phone: document.getElementById('caseClientPhone').value.trim(),
      next_hearing_date: document.getElementById('caseNextDate').value,
      hearing_stage: document.getElementById('caseStage').value.trim(),
      priority: document.getElementById('casePriority').value,
      status: document.getElementById('caseStatus').value,
      
      file_in_chamber: fileInChamber,
      file_current_holder: fileInChamber ? 'Chamber' : (document.getElementById('caseCurrentHolder').value.trim() || 'Outside Chamber'),
      chamber_almirah: document.getElementById('caseChamberAlmirah').value.trim() || 'Almirah-A',
      chamber_shelf: document.getElementById('caseChamberShelf').value.trim() || 'Shelf-1',
      chamber_bundle_no: document.getElementById('caseChamberBundle').value.trim(),
      file_last_moved_at: existing ? existing.file_last_moved_at : new Date().toISOString(),

      senior_instructions: document.getElementById('caseInstructions').value.trim(),
      file_drive_link: document.getElementById('caseDriveLink').value.trim(),
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
    if (this.currentTab === 'chamber') this.renderChamberView();

    // 2. Queue for database sync
    this.enqueueSyncAction('upsert', caseData.id, caseData);

    // 3. If online, immediately sync queue
    if (this.isOnline && this.isSupabaseConnected) {
      this.autoSyncDatabase();
    } else {
      this.showToast(id ? 'Case updated locally' : 'Case saved locally', 'success');
    }
  }

  // ==========================================================================
  // CHAMBER FILE TRACKING METHODS
  // ==========================================================================
  openChamberModal(id) {
    const item = this.cases.find(c => c.id === id);
    if (!item) return;

    document.getElementById('chamberModalCaseId').value = item.id;
    document.getElementById('chamberModalCaseTitle').textContent = `${item.case_number} • ${item.parties}`;
    document.getElementById('modalAlmirah').value = item.chamber_almirah || 'Almirah-A';
    document.getElementById('modalShelf').value = item.chamber_shelf || 'Shelf-1';
    document.getElementById('modalBundle').value = item.chamber_bundle_no || '';
    document.getElementById('modalHolderName').value = (item.file_current_holder && item.file_current_holder !== 'Chamber') ? item.file_current_holder : '';

    this.selectChamberModalStatus(item.file_in_chamber !== false);
    document.getElementById('chamberModal').classList.add('active');
  }

  closeChamberModal() {
    document.getElementById('chamberModal').classList.remove('active');
  }

  selectChamberModalStatus(isInChamber) {
    this.modalChamberStatus = Boolean(isInChamber);
    const inWrap = document.getElementById('modalChamberInWrap');
    const outWrap = document.getElementById('modalChamberOutWrap');
    const btnIn = document.getElementById('btnStatusInChamber');
    const btnOut = document.getElementById('btnStatusOutChamber');

    if (this.modalChamberStatus) {
      if (inWrap) inWrap.style.display = 'flex';
      if (outWrap) outWrap.style.display = 'none';
      if (btnIn) { btnIn.style.background = 'var(--success-soft)'; btnIn.style.boxShadow = '0 0 0 2px var(--success)'; }
      if (btnOut) { btnOut.style.background = 'transparent'; btnOut.style.boxShadow = 'none'; }
    } else {
      if (inWrap) inWrap.style.display = 'none';
      if (outWrap) outWrap.style.display = 'flex';
      if (btnOut) { btnOut.style.background = 'var(--warn-soft)'; btnOut.style.boxShadow = '0 0 0 2px var(--warn)'; }
      if (btnIn) { btnIn.style.background = 'transparent'; btnIn.style.boxShadow = 'none'; }
    }
  }

  handleHolderSelectChange(val) {
    const nameInput = document.getElementById('modalHolderName');
    if (!nameInput) return;
    if (val === 'Courtroom') nameInput.value = 'In Courtroom for Hearing';
    else if (val === 'Junior Advocate') nameInput.value = 'Junior Advocate';
    else if (val === 'Senior Advocate') nameInput.value = 'Senior Briefing';
    else if (val === 'Munshi / Clerk') nameInput.value = 'Munshi Ji (Photocopy/Filing)';
    else if (val === 'Client') nameInput.value = 'Given to Client';
    else nameInput.value = '';
    nameInput.focus();
  }

  handleChamberMovementSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('chamberModalCaseId').value;
    const item = this.cases.find(c => c.id === id);
    if (!item) return;

    item.file_in_chamber = this.modalChamberStatus;
    if (this.modalChamberStatus) {
      item.file_current_holder = 'Chamber';
      item.chamber_almirah = document.getElementById('modalAlmirah').value.trim() || 'Almirah-A';
      item.chamber_shelf = document.getElementById('modalShelf').value.trim() || 'Shelf-1';
      item.chamber_bundle_no = document.getElementById('modalBundle').value.trim();
    } else {
      const holder = document.getElementById('modalHolderName').value.trim() || document.getElementById('modalHolderSelect').value;
      item.file_current_holder = holder;
    }
    item.file_last_moved_at = new Date().toISOString();

    this.saveToLocal();
    this.closeChamberModal();
    this.updateCounters();
    this.render();
    if (this.currentTab === 'chamber') this.renderChamberView();

    this.enqueueSyncAction('upsert', item.id, item);
    if (this.isOnline && this.isSupabaseConnected) this.autoSyncDatabase();

    const msg = this.modalChamberStatus ? 'File marked In Chamber 🟢' : `File marked Outside: ${item.file_current_holder} 🟠`;
    this.showToast(msg, 'success');
  }

  quickReturnToChamber(id) {
    const item = this.cases.find(c => c.id === id);
    if (!item) return;

    item.file_in_chamber = true;
    item.file_current_holder = 'Chamber';
    item.file_last_moved_at = new Date().toISOString();

    this.saveToLocal();
    this.updateCounters();
    this.render();
    if (this.currentTab === 'chamber') this.renderChamberView();

    this.enqueueSyncAction('upsert', item.id, item);
    if (this.isOnline && this.isSupabaseConnected) this.autoSyncDatabase();

    this.triggerHaptic('success');
    this.showToast(`${item.case_number} returned to Chamber 🟢`, 'success');
  }

  // Haptic Feedback for Mobile App Feel
  triggerHaptic(type = 'light') {
    if ('vibrate' in navigator) {
      try {
        if (type === 'light') navigator.vibrate(20);
        else if (type === 'medium') navigator.vibrate(40);
        else if (type === 'success') navigator.vibrate([25, 35, 25]);
      } catch (e) {}
    }
  }

  // ==========================================================================
  // HEARING HISTORY METHODS
  // ==========================================================================
  openHistoryModal(id) {
    const item = this.cases.find(c => c.id === id);
    if (!item) return;

    this.currentHistoryCaseId = id;
    this.historySearchQuery = '';
    const searchInput = document.getElementById('historySearchInput');
    if (searchInput) searchInput.value = '';

    document.getElementById('manualHistCaseId').value = id;
    document.getElementById('manualHistIndex').value = '-1';
    document.getElementById('historyModalCaseTitle').textContent = `${item.case_number} • ${item.parties}`;
    this.toggleAddHistoryForm(false);
    this.renderHistoryTimeline(item);
    document.getElementById('historyModal').classList.add('active');
    this.triggerHaptic('light');
  }

  closeHistoryModal() {
    document.getElementById('historyModal').classList.remove('active');
    this.currentHistoryCaseId = null;
    this.historySearchQuery = '';
  }

  handleHistorySearch(query) {
    this.historySearchQuery = (query || '').toLowerCase().trim();
    if (this.currentHistoryCaseId) {
      const item = this.cases.find(c => c.id === this.currentHistoryCaseId);
      if (item) this.renderHistoryTimeline(item);
    }
  }

  toggleAddHistoryForm(forceState = null) {
    const wrap = document.getElementById('addHistoryFormWrap');
    if (!wrap) return;
    if (forceState !== null) {
      wrap.style.display = forceState ? 'block' : 'none';
    } else {
      wrap.style.display = wrap.style.display === 'none' ? 'block' : 'none';
    }
    if (wrap.style.display === 'block') {
      const idxInput = document.getElementById('manualHistIndex');
      if (!idxInput || idxInput.value === '-1') {
        document.getElementById('manualHistDate').value = new Date().toISOString().split('T')[0];
        document.getElementById('manualHistStage').value = '';
        document.getElementById('manualHistRemarks').value = '';
        const btnSave = document.getElementById('btnSaveManualHist');
        if (btnSave) btnSave.textContent = 'Save Entry';
      }
    }
  }

  editHistoryItem(caseId, index) {
    const item = this.cases.find(c => c.id === caseId);
    if (!item || !Array.isArray(item.hearing_history) || !item.hearing_history[index]) return;

    const entry = item.hearing_history[index];
    document.getElementById('manualHistCaseId').value = caseId;
    document.getElementById('manualHistIndex').value = index;
    document.getElementById('manualHistDate').value = entry.date;
    document.getElementById('manualHistStage').value = entry.stage || '';
    document.getElementById('manualHistRemarks').value = entry.remarks || '';
    const btnSave = document.getElementById('btnSaveManualHist');
    if (btnSave) btnSave.textContent = 'Update Entry';

    this.toggleAddHistoryForm(true);
  }

  handleManualHistorySubmit(e) {
    e.preventDefault();
    const id = document.getElementById('manualHistCaseId').value;
    const item = this.cases.find(c => c.id === id);
    if (!item) return;

    if (!Array.isArray(item.hearing_history)) item.hearing_history = [];

    const dateVal = document.getElementById('manualHistDate').value;
    const stageVal = document.getElementById('manualHistStage').value.trim() || 'Hearing';
    const remarksVal = document.getElementById('manualHistRemarks').value.trim() || 'Court proceedings logged';
    const index = parseInt(document.getElementById('manualHistIndex').value, 10);

    if (index >= 0 && index < item.hearing_history.length) {
      // Edit existing entry
      item.hearing_history[index].date = dateVal;
      item.hearing_history[index].stage = stageVal;
      item.hearing_history[index].remarks = remarksVal;
      item.hearing_history[index].updated_at = new Date().toISOString();
      this.showToast('Hearing entry updated', 'success');
    } else {
      // Add new entry
      item.hearing_history.push({
        date: dateVal,
        stage: stageVal,
        remarks: remarksVal,
        recorded_at: new Date().toISOString()
      });
      this.showToast('Hearing history entry added', 'success');
    }

    // Sort by date ascending
    item.hearing_history.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Reset index
    document.getElementById('manualHistIndex').value = '-1';

    this.saveToLocal();
    this.toggleAddHistoryForm(false);
    this.renderHistoryTimeline(item);
    this.render();

    this.enqueueSyncAction('upsert', item.id, item);
    if (this.isOnline && this.isSupabaseConnected) this.autoSyncDatabase();
    this.triggerHaptic('success');
  }

  deleteHistoryItem(caseId, index) {
    const item = this.cases.find(c => c.id === caseId);
    if (!item || !Array.isArray(item.hearing_history)) return;

    if (!confirm('Delete this hearing history entry?')) return;

    item.hearing_history.splice(index, 1);
    this.saveToLocal();
    this.renderHistoryTimeline(item);
    this.render();

    this.enqueueSyncAction('upsert', item.id, item);
    if (this.isOnline && this.isSupabaseConnected) this.autoSyncDatabase();
    this.showToast('History entry deleted', 'info');
  }

  renderHistoryTimeline(item) {
    const container = document.getElementById('historyTimelineContainer');
    if (!container) return;

    let list = Array.isArray(item.hearing_history) ? item.hearing_history : [];
    const q = this.historySearchQuery;
    if (q) {
      list = list.filter(h => 
        (h.stage && h.stage.toLowerCase().includes(q)) ||
        (h.remarks && h.remarks.toLowerCase().includes(q)) ||
        (h.date && h.date.includes(q))
      );
    }

    if (list.length === 0) {
      container.innerHTML = `
        <p class="text-muted" style="font-size: 13px;">${q ? 'No hearings match your search term.' : 'No past hearing dates recorded yet for this case. Use \'+ Add Past Date\' above or \'Update NDOH\' to log hearings.'}</p>
      `;
      return;
    }

    // Render in reverse chronological order
    const originalList = item.hearing_history || [];
    container.innerHTML = [...list].reverse().map(h => {
      const realIdx = originalList.indexOf(h);
      return `
        <div class="timeline-node">
          <div class="timeline-dot"></div>
          <div class="timeline-card">
            <div class="timeline-meta">
              <span>📅 ${this.formatDisplayDate(h.date)}</span>
              <span>•</span>
              <span class="timeline-stage">${h.stage || 'Hearing'}</span>
              <div style="margin-left: auto; display: flex; gap: 8px;">
                <button 
                  type="button" 
                  onclick="app.editHistoryItem('${item.id}', ${realIdx})" 
                  style="background: none; border: none; cursor: pointer; color: var(--accent); font-size: 11px; font-weight: 600;"
                  title="Edit Entry"
                >
                  ✏️ Edit
                </button>
                <button 
                  type="button" 
                  onclick="app.deleteHistoryItem('${item.id}', ${realIdx})" 
                  style="background: none; border: none; cursor: pointer; color: var(--danger); font-size: 11px;"
                  title="Delete Entry"
                >
                  ✕
                </button>
              </div>
            </div>
            ${h.remarks ? `<p class="timeline-remarks">“${h.remarks}”</p>` : ''}
          </div>
        </div>
      `;
    }).join('');
  }

  // Print Case History Order Sheet Dossier
  printCaseHistory() {
    if (!this.currentHistoryCaseId) return;
    const item = this.cases.find(c => c.id === this.currentHistoryCaseId);
    if (!item) return;

    const printWin = window.open('', '_blank');
    if (!printWin) {
      alert('Please allow popups to print case history.');
      return;
    }

    const list = Array.isArray(item.hearing_history) ? item.hearing_history : [];

    printWin.document.write(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <title>Order Sheet Dossier • ${item.case_number}</title>
        <style>
          body { font-family: ui-sans-serif, system-ui, sans-serif; padding: 28px; color: #0f172a; line-height: 1.5; font-size: 13px; }
          .header-box { border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; }
          h1 { margin: 0 0 6px 0; font-size: 20px; font-weight: 750; }
          .parties { font-size: 16px; font-weight: 650; margin: 4px 0 10px 0; }
          .meta-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; font-size: 12px; margin-bottom: 12px; }
          table { width: 100%; border-collapse: collapse; margin-top: 14px; }
          th { background: #f1f5f9; padding: 10px 8px; border: 1px solid #cbd5e1; text-align: left; font-size: 11px; text-transform: uppercase; }
          td { padding: 8px; border: 1px solid #cbd5e1; vertical-align: top; }
          @media print { button { display: none; } }
        </style>
      </head>
      <body>
        <div class="header-box">
          <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b;">Advocate Case History &amp; Order Sheet Dossier</div>
          <h1>${item.case_number}</h1>
          <div class="parties">${item.parties}</div>
          <div class="meta-grid">
            <div><strong>Court:</strong> ${item.court_name || 'N/A'}${item.judge_name ? ` (${item.judge_name})` : ''}</div>
            <div><strong>Case Type:</strong> ${item.case_type || 'Criminal'} • ${item.representing || 'Petitioner'}</div>
            <div><strong>Physical File:</strong> ${item.file_in_chamber ? `In Chamber (${item.chamber_almirah} / ${item.chamber_shelf})` : `Outside (${item.file_current_holder})`}</div>
            <div><strong>Next Hearing (NDOH):</strong> ${this.formatDisplayDate(item.next_hearing_date)}</div>
            <div><strong>Stage:</strong> ${item.hearing_stage || 'General'}</div>
            <div><strong>Priority:</strong> ${item.priority || 'Normal'}</div>
          </div>
          ${item.senior_instructions ? `<div style="background: #f8fafc; padding: 8px 12px; border-left: 3px solid #2563eb; font-style: italic;">“${item.senior_instructions}”</div>` : ''}
        </div>

        <h3 style="font-size: 14px; margin: 16px 0 8px 0;">CHRONOLOGICAL ORDER SHEET (${list.length} HEARINGS)</h3>
        <table>
          <thead>
            <tr>
              <th style="width: 40px; text-align: center;">#</th>
              <th style="width: 100px;">Hearing Date</th>
              <th style="width: 140px;">Stage / Purpose</th>
              <th>Court Proceedings / Order Summary</th>
            </tr>
          </thead>
          <tbody>
            ${list.map((h, i) => `
              <tr>
                <td style="text-align: center; font-weight: 600;">${i + 1}</td>
                <td style="font-weight: 600; font-variant-numeric: tabular-nums;">${this.formatDisplayDate(h.date)}</td>
                <td><span style="font-weight: 600;">${h.stage || 'Hearing'}</span></td>
                <td>${h.remarks || 'Proceeding recorded'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div style="margin-top: 30px; text-align: center;">
          <button onclick="window.print()" style="padding: 10px 24px; font-size: 14px; font-weight: 600; background: #2563eb; color: #fff; border: none; border-radius: 6px; cursor: pointer;">
            🖨️ Print / Save as PDF
          </button>
        </div>
      </body>
      </html>
    `);
    printWin.document.close();
  }

  // Share Full History Dossier to WhatsApp
  shareCaseHistoryWhatsApp() {
    if (!this.currentHistoryCaseId) return;
    const item = this.cases.find(c => c.id === this.currentHistoryCaseId);
    if (!item) return;

    const list = Array.isArray(item.hearing_history) ? item.hearing_history : [];
    const timelineText = list.map((h, i) => `${i + 1}. *${this.formatDisplayDate(h.date)}* (${h.stage || 'Hearing'}): ${h.remarks || 'Proceeding recorded'}`).join('\n');

    const msg = 
`*COMPLETE CASE TIMELINE DOSSIER*
*Case No:* ${item.case_number}
*Parties:* ${item.parties}
*Court:* ${item.court_name || 'N/A'}${item.judge_name ? ` (${item.judge_name})` : ''}
*Type:* ${item.case_type || 'General'} (${item.representing || 'Counsel'})
*Next Date (NDOH):* ${this.formatDisplayDate(item.next_hearing_date)} [${item.hearing_stage || 'Hearing'}]
*Physical File:* ${item.file_in_chamber ? `In Chamber (${item.chamber_almirah} / ${item.chamber_shelf})` : `Outside (${item.file_current_holder})`}

*HEARING HISTORY (${list.length} Dates):*
${timelineText || 'No past dates logged yet.'}

_Legal Diary System_`;

    const encoded = encodeURIComponent(msg);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
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
    if (this.currentTab === 'chamber') this.renderChamberView();

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
    if (this.currentTab === 'chamber') this.renderChamberView();

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

  clearAllCases() {
    if (confirm('Are you sure you want to clear all cases from this device? This will erase all local cases.')) {
      this.cases = [];
      this.syncQueue = [];
      this.saveSyncQueue();
      this.saveToLocal();
      this.updateCounters();
      this.render();
      if (this.currentTab === 'chamber') this.renderChamberView();
      this.closeSettingsModal();
      this.showToast('All local cases cleared', 'info');
    }
  }

  useDemoMode() {
    this.clearAllCases();
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
