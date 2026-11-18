// Legal Diary - Modern Court Case & Hearing Date Tracker
// Supports Supabase Realtime & Offline/Demo Mode

class LegalDiaryApp {
  constructor() {
    this.cases = [];
    this.currentTab = 'all';
    this.quickFilter = 'all';
    this.searchQuery = '';
    this.supabaseClient = null;
    this.isSupabaseConnected = false;

    // Storage Keys
    this.STORAGE_KEY_CASES = 'legal_diary_cases_cache';
    this.STORAGE_KEY_URL = 'legal_diary_supabase_url';
    this.STORAGE_KEY_KEY = 'legal_diary_supabase_key';

    this.init();
  }

  async init() {
    this.renderTodayDate();
    this.initSupabase();
    await this.loadCases();
    this.updateCounters();
    this.render();
    if (window.lucide) {
      lucide.createIcons();
    }
  }

  // Format today's date for header
  renderTodayDate() {
    const today = new Date();
    const options = { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' };
    const dateStr = today.toLocaleDateString('en-IN', options);
    const dateEl = document.getElementById('todayDateStr');
    if (dateEl) {
      dateEl.innerHTML = `<span class="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> ${dateStr}`;
    }
  }

  // Initialize Supabase Client
  initSupabase() {
    const url = localStorage.getItem(this.STORAGE_KEY_URL);
    const key = localStorage.getItem(this.STORAGE_KEY_KEY);

    if (url && key && window.supabase) {
      try {
        this.supabaseClient = window.supabase.createClient(url, key);
        this.isSupabaseConnected = true;
        this.updateBadge(true);
      } catch (err) {
        console.error('Supabase init error:', err);
        this.isSupabaseConnected = false;
        this.updateBadge(false);
      }
    } else {
      this.isSupabaseConnected = false;
      this.updateBadge(false);
    }
  }

  updateBadge(connected) {
    const badge = document.getElementById('supabaseBadge');
    if (!badge) return;
    if (connected) {
      badge.textContent = 'Cloud Synced';
      badge.className = 'text-[9px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
    } else {
      badge.textContent = 'Demo Mode';
      badge.className = 'text-[9px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20';
    }
  }

  // Realistic sample cases for initial demo
  getSampleCases() {
    const today = new Date();
    const formatDate = (offsetDays) => {
      const d = new Date(today);
      d.setDate(d.getDate() + offsetDays);
      return d.toISOString().split('T')[0];
    };

    return [
      {
        id: 'sample-1',
        case_number: 'WP(C) 1042/2024',
        parties: 'Ramesh Kumar vs State of UP & Ors.',
        court_name: 'High Court of Judicature',
        judge_name: 'Courtroom 4 • Justice Sharma',
        next_hearing_date: formatDate(0), // Today!
        hearing_stage: 'Final Arguments',
        senior_instructions: 'Senior will argue item #12 post-lunch. Keep citation (2021) 4 SCC 12 flagged.',
        file_drive_link: 'https://drive.google.com',
        status: 'Active',
        priority: 'Urgent'
      },
      {
        id: 'sample-2',
        case_number: 'CS (OS) 88/2023',
        parties: 'Apex Builders Ltd vs Verma Enterprises',
        court_name: 'District Court Saket',
        judge_name: 'Commercial Court 2',
        next_hearing_date: formatDate(1), // Tomorrow!
        hearing_stage: 'Evidence / Cross',
        senior_instructions: 'Cross-examination of PW-1. Prepare question checklist on bank statements.',
        file_drive_link: '',
        status: 'Active',
        priority: 'Urgent'
      },
      {
        id: 'sample-3',
        case_number: 'Bail Appln 412/2024',
        parties: 'Mohit Sharma vs State (NCT of Delhi)',
        court_name: 'Patiala House Court',
        judge_name: 'Special Court 3',
        next_hearing_date: formatDate(4), // This week
        hearing_stage: 'Bail Hearing',
        senior_instructions: 'File rejoinder to IO status report before 10:30 AM.',
        file_drive_link: '',
        status: 'Active',
        priority: 'Urgent'
      },
      {
        id: 'sample-4',
        case_number: 'Civil Appeal 230/2022',
        parties: 'Smt. Kamla Devi vs Municipal Corp',
        court_name: 'Tis Hazari Court',
        judge_name: 'Civil Judge Sr. Div.',
        next_hearing_date: formatDate(18), // Future
        hearing_stage: 'Framing of Issues',
        senior_instructions: 'Draft proposed issues already served. Awaiting court order.',
        file_drive_link: '',
        status: 'Active',
        priority: 'Normal'
      },
      {
        id: 'sample-5',
        case_number: 'CRL. M.C. 19/2023',
        parties: 'Sunil Mehta vs State & Anr.',
        court_name: 'High Court',
        judge_name: 'Courtroom 14',
        next_hearing_date: formatDate(-2), // Passed
        hearing_stage: 'Admission / Notice',
        senior_instructions: 'Hearing concluded, update new NDOH from master order sheet.',
        file_drive_link: '',
        status: 'Active',
        priority: 'Normal'
      }
    ];
  }

  // Load cases from Supabase or Cache
  async loadCases() {
    if (this.isSupabaseConnected && this.supabaseClient) {
      try {
        const { data, error } = await this.supabaseClient
          .from('court_cases')
          .select('*')
          .order('next_hearing_date', { ascending: true });

        if (error) throw error;
        this.cases = data || [];
        localStorage.setItem(this.STORAGE_KEY_CASES, JSON.stringify(this.cases));
        return;
      } catch (err) {
        console.warn('Supabase fetch failed:', err);
        this.showToast('Supabase offline, using local cache', 'warning');
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
    if (btn) btn.classList.add('animate-spin');
    await this.loadCases();
    this.updateCounters();
    this.render();
    if (btn) btn.classList.remove('animate-spin');
    this.showToast('Cases refreshed', 'success');
  }

  // Date difference relative to today
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

  // Visual Badges
  getHearingBadgeInfo(targetDateStr, status) {
    if (status === 'Disposed') {
      return {
        text: 'DISPOSED',
        badgeClass: 'bg-slate-800 text-slate-400 border-white/5',
        cardBorder: 'border-white/5'
      };
    }

    const diff = this.getDateDifference(targetDateStr);

    if (diff < 0) {
      return {
        text: `⚠️ PASSED (${Math.abs(diff)}d ago)`,
        badgeClass: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
        cardBorder: 'border-rose-500/40 bg-gradient-to-br from-rose-950/20 via-slate-900/90 to-slate-900'
      };
    } else if (diff === 0) {
      return {
        text: '🔴 TODAY\'S BOARD',
        badgeClass: 'bg-rose-600 text-white font-extrabold border-rose-500 shadow-md shadow-rose-600/40',
        cardBorder: 'border-rose-500/60 bg-gradient-to-br from-rose-950/30 via-slate-900/90 to-slate-900 ring-1 ring-rose-500/20'
      };
    } else if (diff === 1) {
      return {
        text: '🟡 TOMORROW',
        badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/30 font-bold',
        cardBorder: 'border-amber-500/40 bg-gradient-to-br from-amber-950/20 via-slate-900/90 to-slate-900'
      };
    } else if (diff <= 7) {
      return {
        text: `IN ${diff} DAYS`,
        badgeClass: 'bg-sky-500/15 text-sky-300 border-sky-500/30 font-semibold',
        cardBorder: 'border-sky-500/30'
      };
    } else {
      return {
        text: `IN ${diff} DAYS`,
        badgeClass: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20 font-medium',
        cardBorder: 'border-white/5'
      };
    }
  }

  // Format date display
  formatDisplayDate(dateStr) {
    if (!dateStr) return 'No Date';
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  // Update counters and hero metrics
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

    // Hero metrics
    setSafe('metricToday', todayCount);
    setSafe('metricTomorrow', tomorrowCount);
    setSafe('metricWeek', weekCount);
    setSafe('metricAll', this.cases.length);
  }

  // Switch Bottom Tab
  switchTab(tab) {
    this.currentTab = tab;
    document.querySelectorAll('.nav-tab').forEach(el => {
      if (el.dataset.tab === tab) {
        el.className = 'nav-tab flex flex-col items-center py-1 text-indigo-400 transition';
      } else {
        el.className = 'nav-tab flex flex-col items-center py-1 text-slate-400 hover:text-indigo-400 transition';
      }
    });

    const titleEl = document.getElementById('viewTitle');
    if (tab === 'today') {
      this.setQuickFilter('today');
      if (titleEl) titleEl.textContent = "Today's Cause List Board";
    } else if (tab === 'upcoming') {
      this.setQuickFilter('this_week');
      if (titleEl) titleEl.textContent = "Upcoming Hearings (Next 7 Days)";
    } else {
      this.setQuickFilter('all');
      if (titleEl) titleEl.textContent = "All Registered Cases";
    }
  }

  // Set Quick Filter Chip
  setQuickFilter(filter) {
    this.quickFilter = filter;
    document.querySelectorAll('.filter-chip').forEach(btn => {
      if (btn.dataset.filter === filter) {
        btn.className = 'filter-chip px-3 py-1.5 rounded-xl font-semibold transition whitespace-nowrap bg-indigo-600 text-white shadow-md shadow-indigo-600/30';
      } else {
        btn.className = 'filter-chip px-3 py-1.5 rounded-xl font-semibold transition whitespace-nowrap bg-slate-800/90 text-slate-300 hover:bg-slate-700/80 border border-white/5';
      }
    });
    this.render();
  }

  // Search
  handleSearch(query) {
    this.searchQuery = query.toLowerCase().trim();
    const clearBtn = document.getElementById('clearSearchBtn');
    if (clearBtn) {
      if (this.searchQuery.length > 0) {
        clearBtn.classList.remove('hidden');
      } else {
        clearBtn.classList.add('hidden');
      }
    }
    this.render();
  }

  clearSearch() {
    const input = document.getElementById('searchInput');
    if (input) input.value = '';
    this.searchQuery = '';
    const clearBtn = document.getElementById('clearSearchBtn');
    if (clearBtn) clearBtn.classList.add('hidden');
    this.render();
  }

  // Filter & Sort
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
      this.showToast(`${label} copied to clipboard`, 'success');
    }
  }

  // Quick preset helper in NDOH modal
  setNdohPreset(days) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    const dateInput = document.getElementById('ndohDate');
    if (dateInput) {
      dateInput.value = d.toISOString().split('T')[0];
    }
  }

  // Render Case Cards
  render() {
    const container = document.getElementById('casesList');
    const emptyState = document.getElementById('emptyState');
    const filtered = this.getFilteredCases();

    if (filtered.length === 0) {
      container.innerHTML = '';
      emptyState.classList.remove('hidden');
      return;
    }

    emptyState.classList.add('hidden');

    container.innerHTML = filtered.map(c => {
      const badge = this.getHearingBadgeInfo(c.next_hearing_date, c.status);
      const displayDate = this.formatDisplayDate(c.next_hearing_date);
      const isUrgent = c.priority === 'Urgent';

      return `
        <div class="glass-card ${badge.cardBorder} rounded-2xl p-4 shadow-xl transition-all relative overflow-hidden group">
          
          <!-- Top Row: Case Number with Copy Button & Hearing Date Status -->
          <div class="flex items-start justify-between gap-2 mb-2">
            <div class="flex-1">
              <div class="flex items-center gap-1.5 flex-wrap">
                <!-- Case No Tag -->
                <button 
                  onclick="app.copyToClipboard('${c.case_number}', 'Case No.')" 
                  class="inline-flex items-center gap-1 text-xs font-mono font-bold text-indigo-300 bg-indigo-950/60 hover:bg-indigo-900/80 px-2.5 py-0.5 rounded-lg border border-indigo-700/50 active:scale-95 transition"
                  title="Click to copy case number"
                >
                  <span>${c.case_number}</span>
                  <i data-lucide="copy" class="w-3 h-3 text-indigo-400"></i>
                </button>

                ${isUrgent ? `
                  <span class="text-[9px] font-black tracking-wider uppercase bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded-md">
                    URGENT
                  </span>
                ` : ''}
              </div>

              <!-- Parties Title -->
              <h3 class="text-sm font-bold text-white mt-2 leading-snug tracking-tight">
                ${c.parties}
              </h3>
            </div>
            
            <!-- Date Pill Badge -->
            <div class="flex flex-col items-end shrink-0">
              <span class="text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${badge.badgeClass}">
                ${badge.text}
              </span>
              <span class="text-xs font-extrabold text-slate-200 mt-1.5 flex items-center gap-1">
                <i data-lucide="calendar" class="w-3.5 h-3.5 text-indigo-400"></i>
                ${displayDate}
              </span>
            </div>
          </div>

          <!-- Court, Judge & Stage Details -->
          <div class="bg-slate-900/70 rounded-xl p-3 my-3 space-y-2 text-xs border border-white/5">
            ${c.court_name ? `
              <div class="flex items-center gap-1.5 text-slate-200">
                <i data-lucide="landmark" class="w-3.5 h-3.5 text-indigo-400 shrink-0"></i>
                <span class="font-semibold truncate">${c.court_name}</span>
                ${c.judge_name ? `<span class="text-slate-500">•</span><span class="text-slate-400 truncate text-[11px]">${c.judge_name}</span>` : ''}
              </div>
            ` : ''}

            <div class="flex items-center gap-1.5 text-amber-300">
              <i data-lucide="target" class="w-3.5 h-3.5 text-amber-400 shrink-0"></i>
              <span class="font-semibold">Stage: ${c.hearing_stage || 'General'}</span>
            </div>

            <!-- Senior Instructions Directive Box -->
            ${c.senior_instructions ? `
              <div class="mt-2.5 pt-2 border-t border-white/5">
                <div class="flex items-center gap-1 mb-1">
                  <i data-lucide="message-square" class="w-3 h-3 text-amber-400"></i>
                  <span class="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Senior Directive:</span>
                </div>
                <div class="relative bg-slate-800/60 p-2.5 rounded-lg border-l-2 border-amber-400 text-xs italic text-amber-100/90 leading-relaxed font-sans">
                  "${c.senior_instructions}"
                </div>
              </div>
            ` : ''}
          </div>

          <!-- Bottom Action Buttons (Touch-Optimized) -->
          <div class="flex items-center justify-between pt-2 border-t border-white/10 gap-2 flex-wrap">
            
            <!-- Quick NDOH Update Button -->
            <button 
              onclick="app.openNdohModal('${c.id}')"
              class="flex-1 bg-gradient-to-r from-indigo-600/20 to-sky-600/20 hover:from-indigo-600/30 hover:to-sky-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 active:scale-95 transition"
            >
              <i data-lucide="calendar-plus" class="w-3.5 h-3.5 text-indigo-400"></i>
              Update NDOH
            </button>

            <!-- WhatsApp Share with Senior -->
            <button 
              onclick="app.shareOnWhatsApp('${c.id}')"
              class="bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold py-2.5 px-3 rounded-xl flex items-center gap-1.5 active:scale-95 transition"
              title="Share brief with Senior on WhatsApp"
            >
              <i data-lucide="share-2" class="w-3.5 h-3.5 text-emerald-400"></i>
              WhatsApp
            </button>

            <!-- Drive File Link -->
            ${c.file_drive_link ? `
              <a 
                href="${c.file_drive_link}" 
                target="_blank" 
                rel="noopener noreferrer"
                class="bg-slate-800 hover:bg-slate-700 text-slate-300 p-2.5 rounded-xl border border-white/5 active:scale-95 transition"
                title="Open Dossier / Drive"
              >
                <i data-lucide="external-link" class="w-4 h-4 text-sky-400"></i>
              </a>
            ` : ''}

            <!-- Edit & Delete -->
            <div class="flex items-center space-x-0.5">
              <button onclick="app.editCase('${c.id}')" class="p-2 text-slate-400 hover:text-white rounded-lg active:scale-90 transition" title="Edit Case">
                <i data-lucide="edit-2" class="w-3.5 h-3.5"></i>
              </button>
              <button onclick="app.deleteCase('${c.id}')" class="p-2 text-slate-400 hover:text-rose-400 rounded-lg active:scale-90 transition" title="Delete Case">
                <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
              </button>
            </div>

          </div>

        </div>
      `;
    }).join('');

    if (window.lucide) {
      lucide.createIcons();
    }
  }

  // Open Modal to Add New Case
  openCaseModal() {
    document.getElementById('caseModalTitle').textContent = 'Add Court Case File';
    document.getElementById('saveBtnText').textContent = 'Save Court Case';
    document.getElementById('caseForm').reset();
    document.getElementById('caseId').value = '';
    
    const d = new Date();
    d.setDate(d.getDate() + 1);
    document.getElementById('caseNextDate').value = d.toISOString().split('T')[0];

    document.getElementById('caseModal').classList.remove('hidden');
    if (window.lucide) lucide.createIcons();
  }

  closeCaseModal() {
    document.getElementById('caseModal').classList.add('hidden');
  }

  // Edit Case
  editCase(id) {
    const item = this.cases.find(c => c.id === id);
    if (!item) return;

    document.getElementById('caseModalTitle').textContent = 'Edit Court Case';
    document.getElementById('saveBtnText').textContent = 'Update Case';
    document.getElementById('caseId').value = item.id;
    document.getElementById('caseNumber').value = item.case_number || '';
    document.getElementById('caseParties').value = item.parties || '';
    document.getElementById('caseCourt').value = item.court_name || '';
    document.getElementById('caseJudge').value = item.judge_name || '';
    document.getElementById('caseNextDate').value = item.next_hearing_date || '';
    document.getElementById('caseStage').value = item.hearing_stage || 'Final Arguments';
    document.getElementById('caseInstructions').value = item.senior_instructions || '';
    document.getElementById('caseDriveLink').value = item.file_drive_link || '';
    document.getElementById('casePriority').value = item.priority || 'Normal';
    document.getElementById('caseStatus').value = item.status || 'Active';

    document.getElementById('caseModal').classList.remove('hidden');
    if (window.lucide) lucide.createIcons();
  }

  // Save Case
  async saveCase(event) {
    event.preventDefault();

    const id = document.getElementById('caseId').value;
    const caseData = {
      case_number: document.getElementById('caseNumber').value.trim(),
      parties: document.getElementById('caseParties').value.trim(),
      court_name: document.getElementById('caseCourt').value.trim(),
      judge_name: document.getElementById('caseJudge').value.trim(),
      next_hearing_date: document.getElementById('caseNextDate').value,
      hearing_stage: document.getElementById('caseStage').value,
      senior_instructions: document.getElementById('caseInstructions').value.trim(),
      file_drive_link: document.getElementById('caseDriveLink').value.trim(),
      priority: document.getElementById('casePriority').value,
      status: document.getElementById('caseStatus').value
    };

    if (id) {
      if (this.isSupabaseConnected && this.supabaseClient) {
        try {
          const { error } = await this.supabaseClient
            .from('court_cases')
            .update(caseData)
            .eq('id', id);
          if (error) throw error;
        } catch (err) {
          this.showToast('Supabase update error: ' + err.message, 'error');
        }
      }
      const index = this.cases.findIndex(c => c.id === id);
      if (index !== -1) {
        this.cases[index] = { ...this.cases[index], ...caseData };
      }
      this.showToast('Case updated', 'success');
    } else {
      const newId = (this.isSupabaseConnected) ? undefined : 'local-' + Date.now();
      if (this.isSupabaseConnected && this.supabaseClient) {
        try {
          const { data, error } = await this.supabaseClient
            .from('court_cases')
            .insert([caseData])
            .select();
          if (error) throw error;
          if (data && data[0]) {
            this.cases.unshift(data[0]);
          }
        } catch (err) {
          this.showToast('Supabase insert error: ' + err.message, 'error');
          this.cases.unshift({ id: newId, ...caseData });
        }
      } else {
        this.cases.unshift({ id: newId, ...caseData });
      }
      this.showToast('New case file added', 'success');
    }

    this.saveToLocal();
    this.closeCaseModal();
    this.updateCounters();
    this.render();
  }

  // Open Quick NDOH Modal
  openNdohModal(id) {
    const item = this.cases.find(c => c.id === id);
    if (!item) return;

    document.getElementById('ndohCaseId').value = item.id;
    document.getElementById('ndohCaseTitle').textContent = `${item.case_number} • ${item.parties}`;
    document.getElementById('ndohStage').value = item.hearing_stage || '';
    document.getElementById('ndohNotes').value = '';

    const d = new Date();
    d.setDate(d.getDate() + 14);
    document.getElementById('ndohDate').value = d.toISOString().split('T')[0];

    document.getElementById('ndohModal').classList.remove('hidden');
    if (window.lucide) lucide.createIcons();
  }

  closeNdohModal() {
    document.getElementById('ndohModal').classList.add('hidden');
  }

  // Save New NDOH
  async saveNdoh(event) {
    event.preventDefault();
    const id = document.getElementById('ndohCaseId').value;
    const newDate = document.getElementById('ndohDate').value;
    const newStage = document.getElementById('ndohStage').value.trim();
    const proceedings = document.getElementById('ndohNotes').value.trim();

    const item = this.cases.find(c => c.id === id);
    if (!item) return;

    let updatedInstructions = item.senior_instructions || '';
    if (proceedings) {
      const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
      updatedInstructions = `[${today} Order: ${proceedings}] ` + updatedInstructions;
    }

    const updates = {
      next_hearing_date: newDate,
      hearing_stage: newStage || item.hearing_stage,
      senior_instructions: updatedInstructions
    };

    if (this.isSupabaseConnected && this.supabaseClient) {
      try {
        const { error } = await this.supabaseClient
          .from('court_cases')
          .update(updates)
          .eq('id', id);
        if (error) throw error;
      } catch (err) {
        this.showToast('Supabase update failed: ' + err.message, 'error');
      }
    }

    Object.assign(item, updates);
    this.saveToLocal();
    this.closeNdohModal();
    this.updateCounters();
    this.render();
    this.showToast(`NDOH fixed for ${this.formatDisplayDate(newDate)}`, 'success');
  }

  // Delete Case
  async deleteCase(id) {
    const item = this.cases.find(c => c.id === id);
    if (!confirm(`Delete case record:\n${item?.case_number} - ${item?.parties}?`)) {
      return;
    }

    if (this.isSupabaseConnected && this.supabaseClient) {
      try {
        const { error } = await this.supabaseClient
          .from('court_cases')
          .delete()
          .eq('id', id);
        if (error) throw error;
      } catch (err) {
        this.showToast('Supabase delete error: ' + err.message, 'error');
      }
    }

    this.cases = this.cases.filter(c => c.id !== id);
    this.saveToLocal();
    this.updateCounters();
    this.render();
    this.showToast('Case removed', 'info');
  }

  // WhatsApp Share
  shareOnWhatsApp(id) {
    const item = this.cases.find(c => c.id === id);
    if (!item) return;

    const displayDate = this.formatDisplayDate(item.next_hearing_date);
    const message = 
`🏛️ *COURT CASE UPDATE*
*Case No:* ${item.case_number}
*Parties:* ${item.parties}
*Court:* ${item.court_name || 'N/A'} (${item.judge_name || 'Room N/A'})
*Next Hearing Date (NDOH):* ${displayDate}
*Stage:* ${item.hearing_stage || 'General'}
${item.senior_instructions ? `*Senior Directive:* ${item.senior_instructions}\n` : ''}${item.file_drive_link ? `*Dossier:* ${item.file_drive_link}\n` : ''}
_Sent via Legal Diary_`;

    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  }

  // Print Daily Cause List
  printDailyBoard() {
    const todayCases = this.cases.filter(c => {
      if (c.status === 'Disposed') return false;
      return this.getDateDifference(c.next_hearing_date) === 0;
    });

    const casesToPrint = todayCases.length > 0 ? todayCases : this.getFilteredCases();
    const title = todayCases.length > 0 ? "TODAY'S CAUSE LIST BOARD" : "COURT CASES SCHEDULE";

    const printWindow = window.open('', '_blank');
    const rows = casesToPrint.map((c, i) => `
      <tr style="border-bottom: 1px solid #ddd;">
        <td style="padding: 8px; text-align: center;">${i + 1}</td>
        <td style="padding: 8px; font-weight: bold; font-family: monospace;">${c.case_number}</td>
        <td style="padding: 8px;">${c.parties}</td>
        <td style="padding: 8px;">${c.court_name || ''} <br><small style="color: #666;">${c.judge_name || ''}</small></td>
        <td style="padding: 8px;"><b>${c.hearing_stage || ''}</b></td>
        <td style="padding: 8px; font-weight: bold;">${this.formatDisplayDate(c.next_hearing_date)}</td>
        <td style="padding: 8px; font-size: 11px;">${c.senior_instructions || '-'}</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 25px; color: #111; }
          h2 { margin-bottom: 4px; text-align: center; font-size: 18px; letter-spacing: 0.5px; }
          p { text-align: center; color: #666; font-size: 12px; margin-top: 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 13px; }
          th { background: #f8fafc; border-bottom: 2px solid #0f172a; padding: 10px 8px; text-align: left; font-size: 12px; text-transform: uppercase; }
          @media print {
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <h2>${title}</h2>
        <p>Generated on ${new Date().toLocaleString('en-IN')}</p>
        <div style="text-align: right; margin-bottom: 12px;">
          <button onclick="window.print()" style="padding: 8px 16px; background: #4f46e5; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;">Print / Save PDF</button>
        </div>
        <table>
          <thead>
            <tr>
              <th style="width: 35px; text-align: center;">#</th>
              <th>Case No.</th>
              <th>Parties</th>
              <th>Court / Room</th>
              <th>Stage</th>
              <th>NDOH</th>
              <th>Senior Directive</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </body>
      </html>
    `);
    printWindow.document.close();
  }

  // Settings Modal Handlers
  openSettingsModal() {
    document.getElementById('cfgUrl').value = localStorage.getItem(this.STORAGE_KEY_URL) || '';
    document.getElementById('cfgKey').value = localStorage.getItem(this.STORAGE_KEY_KEY) || '';
    document.getElementById('settingsModal').classList.remove('hidden');
    if (window.lucide) lucide.createIcons();
  }

  closeSettingsModal() {
    document.getElementById('settingsModal').classList.add('hidden');
  }

  async saveSupabaseConfig() {
    const url = document.getElementById('cfgUrl').value.trim();
    const key = document.getElementById('cfgKey').value.trim();

    if (!url || !key) {
      this.showToast('Please enter Supabase URL and Anon Key', 'error');
      return;
    }

    localStorage.setItem(this.STORAGE_KEY_URL, url);
    localStorage.setItem(this.STORAGE_KEY_KEY, key);

    this.initSupabase();
    await this.loadCases();
    this.updateCounters();
    this.render();
    this.closeSettingsModal();

    if (this.isSupabaseConnected) {
      this.showToast('Connected to Supabase Cloud!', 'success');
    }
  }

  useDemoMode() {
    localStorage.removeItem(this.STORAGE_KEY_URL);
    localStorage.removeItem(this.STORAGE_KEY_KEY);
    this.supabaseClient = null;
    this.isSupabaseConnected = false;
    this.updateBadge(false);
    this.cases = this.getSampleCases();
    this.saveToLocal();
    this.updateCounters();
    this.render();
    this.closeSettingsModal();
    this.showToast('Switched to Demo Mode', 'info');
  }

  // Toast System
  showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const colors = {
      success: 'bg-emerald-600/95 text-white border-emerald-500/50 shadow-emerald-500/20',
      error: 'bg-rose-600/95 text-white border-rose-500/50 shadow-rose-500/20',
      warning: 'bg-amber-600/95 text-white border-amber-500/50 shadow-amber-500/20',
      info: 'bg-slate-800/95 text-slate-100 border-white/10 shadow-slate-900/50'
    };

    const toast = document.createElement('div');
    toast.className = `p-3.5 rounded-2xl shadow-2xl text-xs font-semibold border flex items-center justify-between pointer-events-auto transition-all transform duration-300 translate-y-[-10px] opacity-0 backdrop-blur-md ${colors[type] || colors.info}`;
    toast.innerHTML = `
      <span>${message}</span>
      <button onclick="this.parentElement.remove()" class="ml-2 text-white/80 hover:text-white p-0.5">&times;</button>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.remove('translate-y-[-10px]', 'opacity-0');
      toast.classList.add('translate-y-0', 'opacity-100');
    }, 10);

    setTimeout(() => {
      toast.classList.add('opacity-0', 'translate-y-[-10px]');
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }
}

// Instantiate and expose globally
const app = new LegalDiaryApp();
window.app = app;
