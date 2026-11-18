// Legal Diary • Modern Mobile-Centric Architecture
// Things 3 & iOS 18 Design: No Pills • No Card Borders • Seamless Timeline Flow

class LegalDiaryApp {
  constructor() {
    this.cases = [];
    this.currentTab = 'all';
    this.quickFilter = 'all';
    this.searchQuery = '';
    this.selectedCourt = 'all';
    this.expandedCardIds = new Set();
    this.supabaseClient = null;
    this.isSupabaseConnected = false;
    this.currentTheme = localStorage.getItem('legal_diary_theme') || 'dark';

    // Storage Keys
    this.STORAGE_KEY_CASES = 'legal_diary_cases_v2';
    this.STORAGE_KEY_URL = 'legal_diary_supabase_url';
    this.STORAGE_KEY_KEY = 'legal_diary_supabase_key';

    this.init();
  }

  async init() {
    this.applyTheme(this.currentTheme);
    this.renderTodayDate();
    this.initSupabase();
    await this.loadCases();
    this.updateCounters();
    this.render();
    this.initScrollListener();
    if (window.lucide) {
      lucide.createIcons();
    }
  }

  // Dynamic Header Scroll Collapse Listener
  initScrollListener() {
    window.addEventListener('scroll', () => {
      const scrollY = window.scrollY || document.documentElement.scrollTop;
      const topSection = document.getElementById('collapsibleHeaderTop');
      const bottomSection = document.getElementById('collapsibleHeaderBottom');

      // Scroll collapse: hides utility row & filter rail, keeping strictly 3 items inline
      if (scrollY > 20) {
        if (topSection && !topSection.classList.contains('collapsed')) {
          topSection.classList.add('collapsed');
        }
        if (bottomSection && !bottomSection.classList.contains('collapsed')) {
          bottomSection.classList.add('collapsed');
        }
      } else {
        if (topSection && topSection.classList.contains('collapsed')) {
          topSection.classList.remove('collapsed');
        }
        if (bottomSection && bottomSection.classList.contains('collapsed')) {
          bottomSection.classList.remove('collapsed');
        }
      }
    }, { passive: true });
  }

  // Theme Toggle
  toggleTheme() {
    this.currentTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
    this.applyTheme(this.currentTheme);
    localStorage.setItem('legal_diary_theme', this.currentTheme);
  }

  applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const themeIcon = document.getElementById('themeIcon');
    if (themeIcon) {
      themeIcon.setAttribute('data-lucide', theme === 'dark' ? 'sun' : 'moon');
      if (window.lucide) lucide.createIcons();
    }
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', theme === 'dark' ? '#0b0e14' : '#f8fafc');
    }
  }

  // Today Date String
  renderTodayDate() {
    const el = document.getElementById('todayDateStr');
    if (el) {
      const now = new Date();
      el.textContent = now.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      });
    }
  }

  // Supabase Client Initialization
  initSupabase() {
    const url = localStorage.getItem(this.STORAGE_KEY_URL) || '';
    const key = localStorage.getItem(this.STORAGE_KEY_KEY) || '';

    const urlInput = document.getElementById('cfgUrl');
    const keyInput = document.getElementById('cfgKey');
    if (urlInput) urlInput.value = url;
    if (keyInput) keyInput.value = key;

    const badge = document.getElementById('supabaseBadge');

    if (url && key && window.supabase) {
      try {
        this.supabaseClient = window.supabase.createClient(url, key);
        this.isSupabaseConnected = true;
        if (badge) {
          badge.textContent = 'Cloud Connected';
          badge.style.color = 'var(--color-primary)';
        }
      } catch (e) {
        console.error('Supabase init error:', e);
        this.isSupabaseConnected = false;
        if (badge) badge.textContent = 'Device Storage';
      }
    } else {
      this.isSupabaseConnected = false;
      if (badge) badge.textContent = 'Device Storage';
    }
  }

  // 23 Sample Court Cases (Realistic Advocate Cause List)
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
        senior_instructions: 'Pairokar to appear with verification',
        file_drive_link: '',
        status: 'Active',
        priority: 'Normal'
      },
      {
        id: 'case-2',
        case_number: 'Case #2',
        parties: 'Jafar Ali v. State of U.P.',
        court_name: 'CO-IInd',
        judge_name: '',
        next_hearing_date: formatDate(-1),
        hearing_stage: 'Police Report / CD',
        senior_instructions: '2 files',
        file_drive_link: '',
        status: 'Active',
        priority: 'Normal'
      },
      {
        id: 'case-3',
        case_number: 'Case #3',
        parties: 'Pawan Gupta v. Raman Gupta',
        court_name: 'CJSD',
        judge_name: '',
        next_hearing_date: formatDate(0),
        hearing_stage: 'Written Statement',
        senior_instructions: 'Order / Judgment',
        file_drive_link: '',
        status: 'Active',
        priority: 'Urgent'
      },
      {
        id: 'case-4',
        case_number: 'Case #4',
        parties: 'Smt. Chhavi Rastogi v. Aman',
        court_name: 'FTC-41',
        judge_name: '',
        next_hearing_date: formatDate(0),
        hearing_stage: 'Mediation / Settlement',
        senior_instructions: 'Warrant to issue',
        file_drive_link: '',
        status: 'Active',
        priority: 'Urgent'
      },
      {
        id: 'case-5',
        case_number: 'Case #5',
        parties: 'Mumtaz v. Unknown',
        court_name: 'ACJM-3',
        judge_name: '',
        next_hearing_date: formatDate(0),
        hearing_stage: 'Admission / Notice',
        senior_instructions: 'FR',
        file_drive_link: '',
        status: 'Active',
        priority: 'Urgent'
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
        priority: 'Normal'
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
        priority: 'Normal'
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
        priority: 'Normal'
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
        priority: 'Normal'
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
        priority: 'Normal'
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
        priority: 'Normal'
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
        priority: 'Normal'
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
        priority: 'Normal'
      },
      {
        id: 'case-14',
        case_number: 'Case #14',
        parties: 'Release – Pramod Kumar',
        court_name: 'ACJM-5',
        judge_name: '',
        next_hearing_date: formatDate(6),
        hearing_stage: 'Order / Judgment',
        senior_instructions: 'Sampoorna Nagar',
        file_drive_link: '',
        status: 'Active',
        priority: 'Urgent'
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
        priority: 'Normal'
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
        priority: 'Normal'
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
        priority: 'Normal'
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
        priority: 'Normal'
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
        priority: 'Normal'
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
        priority: 'Normal'
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
        priority: 'Normal'
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
        priority: 'Normal'
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
        priority: 'Normal'
      }
    ];
  }

  // Load cases from Cloud or Local
  async loadCases() {
    if (this.isSupabaseConnected && this.supabaseClient) {
      try {
        const { data, error } = await this.supabaseClient
          .from('court_cases')
          .select('*')
          .order('next_hearing_date', { ascending: true });

        if (error) throw error;
        if (data && data.length > 0) {
          this.cases = data;
          localStorage.setItem(this.STORAGE_KEY_CASES, JSON.stringify(this.cases));
          return;
        }
      } catch (err) {
        console.warn('Supabase fetch failed:', err);
        this.showToast('Offline Mode Active', 'warning');
      }
    }

    const local = localStorage.getItem(this.STORAGE_KEY_CASES);
    if (local) {
      try {
        this.cases = JSON.parse(local);
      } catch (e) {
        this.cases = this.getSampleCases();
        this.saveToLocal();
      }
    } else {
      this.cases = this.getSampleCases();
      this.saveToLocal();
    }
  }

  saveToLocal() {
    localStorage.setItem(this.STORAGE_KEY_CASES, JSON.stringify(this.cases));
  }

  // Refresh
  async refreshData() {
    const btn = document.getElementById('refreshBtn');
    if (btn) btn.style.transform = 'rotate(180deg)';
    await this.loadCases();
    this.updateCounters();
    this.render();
    if (btn) btn.style.transform = 'none';
    this.showToast('List Refreshed', 'success');
  }

  // Date calculation
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

  // Clean Typography Status (NO PILLS)
  getHearingStatusInfo(targetDateStr, status) {
    if (status === 'Disposed') {
      return {
        statusKey: 'passed',
        text: 'Disposed',
        dateClass: 'time-passed'
      };
    }

    const diff = this.getDateDifference(targetDateStr);

    if (diff < 0) {
      return {
        statusKey: 'passed',
        text: `Passed (${Math.abs(diff)}d)`,
        dateClass: 'time-passed'
      };
    } else if (diff === 0) {
      return {
        statusKey: 'today',
        text: '<span class="pulse-bullet"></span> TODAY',
        dateClass: 'time-today'
      };
    } else if (diff === 1) {
      return {
        statusKey: 'tomorrow',
        text: 'Tomorrow',
        dateClass: 'time-tomorrow'
      };
    } else if (diff <= 7) {
      return {
        statusKey: 'upcoming',
        text: `In ${diff} Days`,
        dateClass: 'time-upcoming'
      };
    } else {
      return {
        statusKey: 'upcoming',
        text: `In ${diff} Days`,
        dateClass: 'time-upcoming'
      };
    }
  }

  formatDisplayDate(dateStr) {
    if (!dateStr) return 'No Date';
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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
  }

  // Bottom Dock Navigation Switcher
  switchTab(tab) {
    this.currentTab = tab;
    document.querySelectorAll('.dock-tab').forEach(el => {
      if (el.dataset.tab === tab) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    });

    const titleEl = document.getElementById('viewTitle');
    if (tab === 'today') {
      this.setQuickFilter('today');
      if (titleEl) titleEl.textContent = "Today's Cause List";
    } else if (tab === 'upcoming') {
      this.setQuickFilter('this_week');
      if (titleEl) titleEl.textContent = "Upcoming (Next 7 Days)";
    } else {
      this.setQuickFilter('all');
      if (titleEl) titleEl.textContent = "All Registered Cases";
    }
  }

  // Segment Filter Tab Click
  setQuickFilter(filter) {
    this.quickFilter = filter;
    document.querySelectorAll('.segment-tab').forEach(btn => {
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
        clearBtn.classList.add('active');
      } else {
        clearBtn.classList.remove('active');
      }
    }
    this.render();
  }

  clearSearch() {
    const input = document.getElementById('searchInput');
    if (input) input.value = '';
    this.searchQuery = '';
    const clearBtn = document.getElementById('clearSearchBtn');
    if (clearBtn) clearBtn.classList.remove('active');
    this.render();
  }

  // Court Dropdown Filter
  filterByCourt(court) {
    this.selectedCourt = court;
    this.render();
    if (court !== 'all') {
      this.showToast(`Filtered: ${court}`, 'info');
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

  // Copy to clipboard helper
  copyToClipboard(text, label = 'Copied') {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      this.showToast(`${label} Copied`, 'success');
    }
  }

  // Quick Presets
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

  // Toggle Card Accordion
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

  // RENDER THE TIMELINE STREAM (NO PILLS, NO CARD BORDERS)
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

      return `
        <article class="case-item status-${statusInfo.statusKey}" style="--item-delay: ${Math.min(idx, 12)};">
          
          <!-- Clickable Header Row -->
          <div onclick="app.toggleCard('${c.id}')" class="case-row-header">
            
            <!-- Line 1: Court & Room (Left) vs Relative Time (Right) -->
            <div class="row-meta-line">
              <div class="court-label">
                <i data-lucide="scale" style="width: 12px; height: 12px;"></i>
                <span>${c.court_name || 'Court/Forum'}</span>
                ${c.judge_name ? `<span class="judge-sub">(${c.judge_name})</span>` : ''}
              </div>

              <!-- Relative Time Badge (Clean Typography) -->
              <div class="time-badge ${statusInfo.dateClass}">
                ${statusInfo.text}
              </div>
            </div>

            <!-- Line 2: Parties Title vs Chevron -->
            <div class="row-main-line">
              <h3 class="parties-name">
                ${c.parties}
              </h3>
              
              <!-- Chevron Box -->
              <div id="card-chevron-${c.id}" class="chevron-icon ${isExpanded ? 'expanded' : ''}">
                <i data-lucide="chevron-down" style="width: 16px; height: 16px;"></i>
              </div>
            </div>

            <!-- Line 3: Case Number & Hearing Stage -->
            <div class="row-sub-line">
              <span class="case-num-text">${c.case_number}</span>
              <span class="dot-separator">•</span>
              <span class="stage-text">${c.hearing_stage || 'General'}</span>
              ${isUrgent ? `
                <span class="dot-separator">•</span>
                <span class="urgent-indicator">
                  <i data-lucide="flame" style="width: 11px; height: 11px;"></i>
                  <span>Urgent</span>
                </span>
              ` : ''}
            </div>

          </div>

          <!-- Seamless Inset Expansion Dossier -->
          <div id="card-details-${c.id}" class="case-expansion ${isExpanded ? 'expanded' : ''}">
            <div class="expansion-content">
              
              <!-- Case Info Grid -->
              <div class="detail-grid">
                <div class="detail-cell">
                  <span class="detail-title">Case Number</span>
                  <div class="detail-value">
                    <span>${c.case_number}</span>
                    <button 
                      onclick="event.stopPropagation(); app.copyToClipboard('${c.case_number}', 'Case No.')" 
                      class="copy-btn-clean"
                      title="Tap to copy"
                    >
                      <i data-lucide="copy" style="width: 13px; height: 13px;"></i>
                    </button>
                  </div>
                </div>

                <div class="detail-cell">
                  <span class="detail-title">Next Hearing Date (NDOH)</span>
                  <div class="detail-value" style="color: ${statusInfo.statusKey === 'today' ? 'var(--accent-today)' : 'var(--text-main)'};">
                    <span>${displayDate}</span>
                  </div>
                </div>
              </div>

              <div class="detail-grid">
                <div class="detail-cell">
                  <span class="detail-title">Court / Bench</span>
                  <div class="detail-value" style="font-size: 12px; font-weight: 500;">
                    ${c.court_name || 'N/A'}${c.judge_name ? ` • ${c.judge_name}` : ''}
                  </div>
                </div>

                <div class="detail-cell">
                  <span class="detail-title">Current Stage</span>
                  <div class="detail-value" style="font-size: 12px; font-weight: 500;">
                    ${c.hearing_stage || 'General'}
                  </div>
                </div>
              </div>

              <!-- Senior Directive / Instructions (Apple Notes style) -->
              ${c.senior_instructions ? `
                <div class="directive-card">
                  <div class="directive-header">
                    <i data-lucide="message-square" style="width: 12px; height: 12px;"></i>
                    <span>Senior's Directive</span>
                  </div>
                  <div class="directive-quote">"${c.senior_instructions}"</div>
                </div>
              ` : ''}

              <!-- Modern Flat Action Toolbar -->
              <div class="action-toolbar" onclick="event.stopPropagation()">
                <!-- 1. Quick NDOH Update -->
                <button 
                  onclick="app.openNdohModal('${c.id}')"
                  class="btn-action-primary"
                >
                  <i data-lucide="calendar" style="width: 14px; height: 14px;"></i>
                  <span>Update Date</span>
                </button>

                <!-- 2. WhatsApp Share -->
                <button 
                  onclick="app.shareOnWhatsApp('${c.id}')"
                  class="btn-action-whatsapp"
                  title="Send update to Senior on WhatsApp"
                >
                  <i data-lucide="share-2" style="width: 14px; height: 14px;"></i>
                  <span>WhatsApp</span>
                </button>

                <!-- 3. Drive Link -->
                ${c.file_drive_link ? `
                  <a 
                    href="${c.file_drive_link}" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    class="btn-action-icon"
                    title="Open Dossier / Drive"
                  >
                    <i data-lucide="folder" style="width: 15px; height: 15px; color: var(--color-primary);"></i>
                  </a>
                ` : ''}

                <!-- 4. Edit & Delete -->
                <button onclick="app.editCase('${c.id}')" class="btn-action-icon" title="Edit File">
                  <i data-lucide="edit-3" style="width: 15px; height: 15px;"></i>
                </button>
                <button onclick="app.deleteCase('${c.id}')" class="btn-action-icon danger" title="Delete File">
                  <i data-lucide="trash-2" style="width: 15px; height: 15px;"></i>
                </button>
              </div>

            </div>
          </div>

        </article>
      `;
    }).join('');

    if (window.lucide) {
      lucide.createIcons();
    }
  }

  // MODAL 1: ADD / EDIT CASE
  openCaseModal(id = null) {
    const modal = document.getElementById('caseModal');
    const form = document.getElementById('caseForm');
    const title = document.getElementById('caseModalTitle');
    form.reset();

    if (id) {
      const item = this.cases.find(c => c.id === id);
      if (!item) return;
      title.textContent = 'Edit Case File';
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
      title.textContent = 'New Case File';
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
      status: document.getElementById('caseStatus').value
    };

    if (id) {
      const idx = this.cases.findIndex(c => c.id === id);
      if (idx !== -1) this.cases[idx] = caseData;
    } else {
      this.cases.unshift(caseData);
    }

    if (this.isSupabaseConnected && this.supabaseClient) {
      try {
        await this.supabaseClient.from('court_cases').upsert([caseData]);
      } catch (err) {
        console.warn('Supabase upsert failed:', err);
      }
    }

    this.saveToLocal();
    this.closeCaseModal();
    this.updateCounters();
    this.render();
    this.showToast(id ? 'File Updated' : 'New File Created', 'success');
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

    item.next_hearing_date = document.getElementById('ndohDate').value;
    const stage = document.getElementById('ndohStage').value.trim();
    const notes = document.getElementById('ndohNotes').value.trim();
    if (stage) item.hearing_stage = stage;
    if (notes) item.senior_instructions = notes;

    if (this.isSupabaseConnected && this.supabaseClient) {
      try {
        await this.supabaseClient
          .from('court_cases')
          .update({
            next_hearing_date: item.next_hearing_date,
            hearing_stage: item.hearing_stage,
            senior_instructions: item.senior_instructions
          })
          .eq('id', id);
      } catch (err) {
        console.warn('Supabase date update failed:', err);
      }
    }

    this.saveToLocal();
    this.closeNdohModal();
    this.updateCounters();
    this.render();
    this.showToast('NDOH Updated', 'success');
  }

  editCase(id) {
    this.openCaseModal(id);
  }

  async deleteCase(id) {
    if (!confirm('Are you sure you want to delete this case file?')) return;

    this.cases = this.cases.filter(c => c.id !== id);

    if (this.isSupabaseConnected && this.supabaseClient) {
      try {
        await this.supabaseClient.from('court_cases').delete().eq('id', id);
      } catch (err) {
        console.warn('Supabase delete failed:', err);
      }
    }

    this.saveToLocal();
    this.updateCounters();
    this.render();
    this.showToast('Deleted', 'info');
  }

  // WhatsApp Share Formatter
  shareOnWhatsApp(id) {
    const item = this.cases.find(c => c.id === id);
    if (!item) return;

    const displayDate = this.formatDisplayDate(item.next_hearing_date);
    const message = 
`⚖️ *COURT CASE UPDATE*
*Case No:* ${item.case_number}
*Parties:* ${item.parties}
*Court:* ${item.court_name || 'N/A'}${item.judge_name ? ` (${item.judge_name})` : ''}
*Next Hearing Date (NDOH):* ${displayDate}
*Stage:* ${item.hearing_stage || 'General'}
${item.senior_instructions ? `*Senior Directive:* ${item.senior_instructions}\n` : ''}${item.file_drive_link ? `*Dossier:* ${item.file_drive_link}\n` : ''}
_Sent via Legal Diary_`;

    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  }

  // Print Daily Cause List
  printDailyBoard() {
    const list = this.getFilteredCases();
    const dateStr = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const printWin = window.open('', '_blank');
    if (!printWin) {
      alert('Please allow popups to print the daily cause list.');
      return;
    }

    const rows = list.map((c, i) => `
      <tr>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${i + 1}</td>
        <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">${c.case_number}</td>
        <td style="padding: 8px; border: 1px solid #ddd;"><b>${c.parties}</b></td>
        <td style="padding: 8px; border: 1px solid #ddd;">${c.court_name || '—'}<br><small>${c.judge_name || ''}</small></td>
        <td style="padding: 8px; border: 1px solid #ddd;">${this.formatDisplayDate(c.next_hearing_date)}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${c.hearing_stage || '—'}</td>
        <td style="padding: 8px; border: 1px solid #ddd; font-style: italic;">${c.senior_instructions || '—'}</td>
      </tr>
    `).join('');

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Daily Cause List • ${dateStr}</title>
        <style>
          body { font-family: -apple-system, system-ui, sans-serif; padding: 20px; color: #111; }
          h1 { margin: 0 0 4px 0; font-size: 20px; }
          p { margin: 0 0 16px 0; font-size: 13px; color: #555; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th { background: #f0f0f0; padding: 8px; border: 1px solid #ddd; text-align: left; }
          @media print {
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px;">
          <div>
            <h1>Advocate Case Diary • Daily Cause List</h1>
            <p>Generated on: ${dateStr} | Total Files: ${list.length}</p>
          </div>
          <button onclick="window.print()" style="padding: 8px 16px; background: #000; color: #fff; border: none; border-radius: 4px; cursor: pointer;">Print List</button>
        </div>
        <table>
          <thead>
            <tr>
              <th style="width: 35px; text-align: center;">#</th>
              <th>Case No.</th>
              <th>Parties</th>
              <th>Court & Bench</th>
              <th>NDOH Date</th>
              <th>Stage</th>
              <th>Senior Remarks</th>
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
    document.getElementById('settingsModal').classList.add('active');
  }

  closeSettingsModal() {
    document.getElementById('settingsModal').classList.remove('active');
  }

  saveSupabaseConfig() {
    const url = document.getElementById('cfgUrl').value.trim();
    const key = document.getElementById('cfgKey').value.trim();

    if (url && key) {
      localStorage.setItem(this.STORAGE_KEY_URL, url);
      localStorage.setItem(this.STORAGE_KEY_KEY, key);
      this.initSupabase();
      this.showToast('Cloud Connected', 'success');
      this.closeSettingsModal();
      this.refreshData();
    } else {
      localStorage.removeItem(this.STORAGE_KEY_URL);
      localStorage.removeItem(this.STORAGE_KEY_KEY);
      this.isSupabaseConnected = false;
      this.supabaseClient = null;
      document.getElementById('supabaseBadge').textContent = 'Device Storage';
      this.showToast('Reverted to Device Storage', 'info');
      this.closeSettingsModal();
    }
  }

  useDemoMode() {
    if (confirm('Reset to standard 23 advocate cases? Any custom edits will be replaced.')) {
      this.cases = this.getSampleCases();
      this.saveToLocal();
      this.updateCounters();
      this.render();
      this.closeSettingsModal();
      this.showToast('Reset to 23 Cases', 'info');
    }
  }

  // Toast Notification
  showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast-pill';
    toast.textContent = message;

    if (type === 'success') {
      toast.style.borderColor = 'var(--color-success)';
      toast.style.color = 'var(--color-success)';
    } else if (type === 'warning') {
      toast.style.borderColor = 'var(--color-warning)';
      toast.style.color = 'var(--color-warning)';
    }

    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-10px)';
      toast.style.transition = 'all 0.25s ease';
      setTimeout(() => toast.remove(), 250);
    }, 2000);
  }
}

// Instantiate on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.app = new LegalDiaryApp();
});
