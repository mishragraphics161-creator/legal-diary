// Legal Diary - iOS 15 Design Pattern
// Authentic Apple Human Interface Guidelines for Web

class LegalDiaryApp {
  constructor() {
    this.cases = [];
    this.currentTab = 'all';
    this.quickFilter = 'all';
    this.searchQuery = '';
    this.supabaseClient = null;
    this.isSupabaseConnected = false;

    // Storage Keys (v2 for fresh real cases data)
    this.STORAGE_KEY_CASES = 'legal_diary_cases_v2';
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

  // Format today's date for iOS Navigation title
  renderTodayDate() {
    const today = new Date();
    const options = { weekday: 'long', month: 'long', day: 'numeric' };
    const dateStr = today.toLocaleDateString('en-US', options);
    const dateEl = document.getElementById('todayDateStr');
    if (dateEl) {
      dateEl.textContent = dateStr;
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
      badge.textContent = 'iCloud Synced';
      badge.className = 'text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-ios-green/15 text-ios-green border border-ios-green/30';
    } else {
      badge.textContent = 'Demo Mode';
      badge.className = 'text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-ios-orange/15 text-ios-orange border border-ios-orange/30';
    }
  }

  // 23 Actual Real Court Cases given by Senior
  getSampleCases() {
    const today = new Date();
    const formatDate = (offsetDays) => {
      const d = new Date(today);
      d.setDate(d.getDate() + offsetDays);
      return d.toISOString().split('T')[0];
    };

    return [
      {
        id: 'case-1',
        case_number: 'Case #01',
        parties: 'Pawan Gupta v. Vishvanath Pitariya',
        court_name: 'ACJM-5',
        judge_name: '',
        next_hearing_date: formatDate(0), // Today
        hearing_stage: 'Final Arguments',
        senior_instructions: '',
        file_drive_link: '',
        status: 'Active',
        priority: 'Urgent'
      },
      {
        id: 'case-2',
        case_number: 'Case #02',
        parties: 'Pawan Gupta v. Raman Gupta',
        court_name: 'CJSD',
        judge_name: '',
        next_hearing_date: formatDate(1), // Tomorrow
        hearing_stage: 'Evidence / Cross',
        senior_instructions: '',
        file_drive_link: '',
        status: 'Active',
        priority: 'Normal'
      },
      {
        id: 'case-3',
        case_number: 'Case #03',
        parties: 'Pawan Gupta v. Ashok Singh',
        court_name: 'ACJM-4',
        judge_name: '',
        next_hearing_date: formatDate(2),
        hearing_stage: 'Framing of Issues',
        senior_instructions: '',
        file_drive_link: '',
        status: 'Active',
        priority: 'Normal'
      },
      {
        id: 'case-4',
        case_number: 'Case #04',
        parties: 'Pawan Gupta v. Ashok Singh',
        court_name: 'ACJM-1',
        judge_name: '',
        next_hearing_date: formatDate(3),
        hearing_stage: 'Admission / Notice',
        senior_instructions: '',
        file_drive_link: '',
        status: 'Active',
        priority: 'Normal'
      },
      {
        id: 'case-5',
        case_number: 'Case #05',
        parties: 'Pawan Gupta v. Ashok Singh',
        court_name: 'DJ',
        judge_name: '',
        next_hearing_date: formatDate(4),
        hearing_stage: 'Final Arguments',
        senior_instructions: '',
        file_drive_link: '',
        status: 'Active',
        priority: 'Urgent'
      },
      {
        id: 'case-6',
        case_number: 'Case #06',
        parties: 'Jafar Ali v. State of U.P.',
        court_name: 'CO-IInd',
        judge_name: '',
        next_hearing_date: formatDate(0), // Today
        hearing_stage: 'Miscellaneous',
        senior_instructions: '2 files',
        file_drive_link: '',
        status: 'Active',
        priority: 'Urgent'
      },
      {
        id: 'case-7',
        case_number: 'Case #07',
        parties: 'Smt. Chhavi Rastogi v. Aman',
        court_name: 'FTC-41',
        judge_name: '',
        next_hearing_date: formatDate(1), // Tomorrow
        hearing_stage: 'Evidence / Cross',
        senior_instructions: '',
        file_drive_link: '',
        status: 'Active',
        priority: 'Normal'
      },
      {
        id: 'case-8',
        case_number: 'Case #08',
        parties: 'Pawan Singh v. Kailash Singh',
        court_name: 'ACJJD-5',
        judge_name: '',
        next_hearing_date: formatDate(2),
        hearing_stage: 'Framing of Issues',
        senior_instructions: '',
        file_drive_link: '',
        status: 'Active',
        priority: 'Normal'
      },
      {
        id: 'case-9',
        case_number: 'Case #09',
        parties: 'Vimal v. Komal Singh',
        court_name: 'AFC-1st',
        judge_name: '',
        next_hearing_date: formatDate(3),
        hearing_stage: 'Miscellaneous',
        senior_instructions: 'Skeleton',
        file_drive_link: '',
        status: 'Active',
        priority: 'Normal'
      },
      {
        id: 'case-10',
        case_number: 'Case #10',
        parties: 'Mumtaz v. Unknown',
        court_name: 'ACJM-3',
        judge_name: '',
        next_hearing_date: formatDate(1), // Tomorrow
        hearing_stage: 'Admission / Notice',
        senior_instructions: 'FR',
        file_drive_link: '',
        status: 'Active',
        priority: 'Urgent'
      },
      {
        id: 'case-11',
        case_number: 'Case #11',
        parties: 'Alok Verma v. Raunak Juneja',
        court_name: 'AJM-3',
        judge_name: '',
        next_hearing_date: formatDate(5),
        hearing_stage: 'Evidence / Cross',
        senior_instructions: '',
        file_drive_link: '',
        status: 'Active',
        priority: 'Normal'
      },
      {
        id: 'case-12',
        case_number: 'Case #12',
        parties: 'State v. Dharampal',
        court_name: 'ADJ/FTC',
        judge_name: '',
        next_hearing_date: formatDate(6),
        hearing_stage: 'Final Arguments',
        senior_instructions: '',
        file_drive_link: '',
        status: 'Active',
        priority: 'Urgent'
      },
      {
        id: 'case-13',
        case_number: 'Case #13',
        parties: 'State v. Dharampal',
        court_name: 'ACJM-5',
        judge_name: '',
        next_hearing_date: formatDate(8),
        hearing_stage: 'Evidence / Cross',
        senior_instructions: '',
        file_drive_link: '',
        status: 'Active',
        priority: 'Normal'
      },
      {
        id: 'case-14',
        case_number: 'Case #14',
        parties: 'Shree Devi v. Janardan',
        court_name: 'ACJM/FTC',
        judge_name: '',
        next_hearing_date: formatDate(9),
        hearing_stage: 'Framing of Issues',
        senior_instructions: '',
        file_drive_link: '',
        status: 'Active',
        priority: 'Normal'
      },
      {
        id: 'case-15',
        case_number: 'Case #15',
        parties: 'Shree Devi v. Janardan',
        court_name: 'FC',
        judge_name: '',
        next_hearing_date: formatDate(10),
        hearing_stage: 'Miscellaneous',
        senior_instructions: '',
        file_drive_link: '',
        status: 'Active',
        priority: 'Normal'
      },
      {
        id: 'case-16',
        case_number: 'Case #16',
        parties: 'Gyanendara Mishra',
        court_name: 'District Court',
        judge_name: '',
        next_hearing_date: formatDate(4),
        hearing_stage: 'Admission / Notice',
        senior_instructions: 'Notice',
        file_drive_link: '',
        status: 'Active',
        priority: 'Urgent'
      },
      {
        id: 'case-17',
        case_number: 'Case #17',
        parties: 'Prathvi Pal v. Banvari',
        court_name: 'ACJM-3',
        judge_name: '',
        next_hearing_date: formatDate(12),
        hearing_stage: 'Evidence / Cross',
        senior_instructions: '',
        file_drive_link: '',
        status: 'Active',
        priority: 'Normal'
      },
      {
        id: 'case-18',
        case_number: 'Case #18',
        parties: 'Madhuri Devi v. Geeta Devi',
        court_name: 'ADJ-2nd',
        judge_name: '',
        next_hearing_date: formatDate(14),
        hearing_stage: 'Final Arguments',
        senior_instructions: '',
        file_drive_link: '',
        status: 'Active',
        priority: 'Normal'
      },
      {
        id: 'case-19',
        case_number: 'Case #19',
        parties: 'Pooja v. Kaushal Singh',
        court_name: 'AFC-1st',
        judge_name: '',
        next_hearing_date: formatDate(5),
        hearing_stage: 'Miscellaneous',
        senior_instructions: '144(3) BNSS',
        file_drive_link: '',
        status: 'Active',
        priority: 'Urgent'
      },
      {
        id: 'case-20',
        case_number: 'Case #20',
        parties: 'Release – Pramod Kumar',
        court_name: 'ACJM-5',
        judge_name: '',
        next_hearing_date: formatDate(7),
        hearing_stage: 'Order / Judgment',
        senior_instructions: 'Sampoorna Nagar',
        file_drive_link: '',
        status: 'Active',
        priority: 'Urgent'
      },
      {
        id: 'case-21',
        case_number: 'Case #21',
        parties: 'Smt. Kishori Devi v. Pushpendra Kumar',
        court_name: 'Gram Nay. Gola',
        judge_name: '',
        next_hearing_date: formatDate(16),
        hearing_stage: 'Evidence / Cross',
        senior_instructions: '',
        file_drive_link: '',
        status: 'Active',
        priority: 'Normal'
      },
      {
        id: 'case-22',
        case_number: 'Case #22',
        parties: 'Ram Gulam v. Sahab Dayal',
        court_name: 'Gram Nay. Gola',
        judge_name: '',
        next_hearing_date: formatDate(18),
        hearing_stage: 'Framing of Issues',
        senior_instructions: '',
        file_drive_link: '',
        status: 'Active',
        priority: 'Normal'
      },
      {
        id: 'case-23',
        case_number: 'Case #23',
        parties: 'Daya Shankar Mishra v. Kulwant Singh',
        court_name: 'Gram Nay. Gola',
        judge_name: '',
        next_hearing_date: formatDate(20),
        hearing_stage: 'Final Arguments',
        senior_instructions: '',
        file_drive_link: '',
        status: 'Active',
        priority: 'Normal'
      }
    ];
  }

  // Load cases
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
        this.showToast('Offline • Local Cache', 'warning');
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
    this.showToast('Updated', 'success');
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

  // iOS 15 Status Pill Info
  getHearingBadgeInfo(targetDateStr, status) {
    if (status === 'Disposed') {
      return {
        text: 'Disposed',
        badgeClass: 'bg-[#2C2C2E] text-ios-gray',
        dateClass: 'text-ios-gray'
      };
    }

    const diff = this.getDateDifference(targetDateStr);

    if (diff < 0) {
      return {
        text: `Passed (${Math.abs(diff)}d ago)`,
        badgeClass: 'bg-ios-red/15 text-ios-red font-semibold',
        dateClass: 'text-ios-red'
      };
    } else if (diff === 0) {
      return {
        text: 'Today',
        badgeClass: 'bg-ios-red text-white font-bold',
        dateClass: 'text-ios-red font-bold'
      };
    } else if (diff === 1) {
      return {
        text: 'Tomorrow',
        badgeClass: 'bg-ios-orange/20 text-ios-orange font-semibold',
        dateClass: 'text-ios-orange font-semibold'
      };
    } else if (diff <= 7) {
      return {
        text: `In ${diff} Days`,
        badgeClass: 'bg-ios-blue/15 text-ios-blue font-medium',
        dateClass: 'text-ios-blue font-medium'
      };
    } else {
      return {
        text: `In ${diff} Days`,
        badgeClass: 'bg-[#2C2C2E] text-ios-gray font-medium',
        dateClass: 'text-white'
      };
    }
  }

  // Format date display
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

  // iOS Tab Switcher
  switchTab(tab) {
    this.currentTab = tab;
    document.querySelectorAll('.nav-tab').forEach(el => {
      if (el.dataset.tab === tab) {
        el.classList.add('text-ios-blue');
        el.classList.remove('text-ios-gray');
      } else {
        el.classList.remove('text-ios-blue');
        el.classList.add('text-ios-gray');
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

  // iOS Segmented Control Click
  setQuickFilter(filter) {
    this.quickFilter = filter;
    document.querySelectorAll('.ios-segmented-item').forEach(btn => {
      if (btn.dataset.filter === filter) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
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
      this.showToast(`${label} Copied`, 'success');
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

  // Render iOS 15 Inset Grouped Table Cards
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
        <div class="ios-card shadow-sm">
          
          <!-- Card Header Cell -->
          <div class="p-3.5">
            <div class="flex items-start justify-between gap-2">
              <div class="flex-1">
                <div class="flex items-center gap-1.5 flex-wrap">
                  <!-- iOS Case Number Pill -->
                  <button 
                    onclick="app.copyToClipboard('${c.case_number}', 'Case No.')" 
                    class="inline-flex items-center gap-1 text-[12px] font-mono font-semibold text-ios-blue bg-ios-blue/10 px-2 py-0.5 rounded-[6px] active:opacity-60 transition"
                    title="Tap to copy"
                  >
                    <span>${c.case_number}</span>
                    <i data-lucide="copy" class="w-3 h-3 text-ios-blue"></i>
                  </button>

                  ${isUrgent ? `
                    <span class="text-[10px] font-bold tracking-wide uppercase bg-ios-red/15 text-ios-red px-1.5 py-0.5 rounded-[5px]">
                      Urgent
                    </span>
                  ` : ''}
                </div>

                <!-- Case Title -->
                <h3 class="text-[15px] font-bold text-white mt-1.5 leading-snug">
                  ${c.parties}
                </h3>
              </div>
              
              <!-- iOS Status Badge -->
              <div class="flex flex-col items-end shrink-0">
                <span class="text-[11px] px-2 py-0.5 rounded-full ${badge.badgeClass}">
                  ${badge.text}
                </span>
                <span class="text-[12px] ${badge.dateClass} mt-1 font-semibold flex items-center gap-1">
                  <i data-lucide="calendar" class="w-3 h-3"></i>
                  ${displayDate}
                </span>
              </div>
            </div>
          </div>

          <!-- Divider -->
          <div class="ios-divider"></div>

          <!-- Information Cell (Court & Stage) -->
          <div class="p-3.5 bg-[#252528] space-y-2 text-[13px]">
            ${c.court_name ? `
              <div class="flex items-center gap-2 text-white">
                <div class="w-5 h-5 rounded-[5px] bg-ios-blue flex items-center justify-center shrink-0">
                  <i data-lucide="landmark" class="w-3 h-3 text-white"></i>
                </div>
                <span class="font-medium truncate">${c.court_name}</span>
                ${c.judge_name ? `<span class="text-ios-gray truncate text-[12px]">(${c.judge_name})</span>` : ''}
              </div>
            ` : ''}

            <div class="flex items-center gap-2 text-white">
              <div class="w-5 h-5 rounded-[5px] bg-ios-purple flex items-center justify-center shrink-0">
                <i data-lucide="gavel" class="w-3 h-3 text-white"></i>
              </div>
              <span class="font-medium">Stage: <span class="text-ios-orange font-semibold">${c.hearing_stage || 'General'}</span></span>
            </div>

            <!-- Senior Directive Row (Remarks) -->
            ${c.senior_instructions ? `
              <div class="flex items-start gap-2 pt-1">
                <div class="w-5 h-5 rounded-[5px] bg-ios-orange flex items-center justify-center shrink-0 mt-0.5">
                  <i data-lucide="message-square" class="w-3 h-3 text-white"></i>
                </div>
                <div class="flex-1 text-[13px] text-[#D1D1D6] leading-relaxed italic">
                  "${c.senior_instructions}"
                </div>
              </div>
            ` : ''}
          </div>

          <!-- Divider -->
          <div class="ios-divider"></div>

          <!-- Action Footer Cell -->
          <div class="p-2.5 bg-[#1C1C1E] flex items-center justify-between gap-2">
            
            <!-- Quick NDOH Update -->
            <button 
              onclick="app.openNdohModal('${c.id}')"
              class="flex-1 bg-ios-blue/15 text-ios-blue font-semibold text-[13px] py-2 px-3 rounded-[10px] flex items-center justify-center gap-1.5 active:opacity-60 transition"
            >
              <i data-lucide="calendar-plus" class="w-3.5 h-3.5"></i>
              Update Date
            </button>

            <!-- WhatsApp Share -->
            <button 
              onclick="app.shareOnWhatsApp('${c.id}')"
              class="bg-ios-green/15 text-ios-green font-semibold text-[13px] py-2 px-3 rounded-[10px] flex items-center gap-1.5 active:opacity-60 transition"
              title="Share on WhatsApp"
            >
              <i data-lucide="share-2" class="w-3.5 h-3.5"></i>
              WhatsApp
            </button>

            <!-- Drive Dossier Link -->
            ${c.file_drive_link ? `
              <a 
                href="${c.file_drive_link}" 
                target="_blank" 
                rel="noopener noreferrer"
                class="bg-[#2C2C2E] text-ios-blue p-2 rounded-[10px] active:opacity-60 transition"
                title="Open Dossier"
              >
                <i data-lucide="link" class="w-4 h-4"></i>
              </a>
            ` : ''}

            <!-- More / Edit / Delete -->
            <div class="flex items-center space-x-1">
              <button onclick="app.editCase('${c.id}')" class="p-2 text-ios-gray hover:text-white rounded-lg active:opacity-60 transition">
                <i data-lucide="edit-3" class="w-4 h-4"></i>
              </button>
              <button onclick="app.deleteCase('${c.id}')" class="p-2 text-ios-gray hover:text-ios-red rounded-lg active:opacity-60 transition">
                <i data-lucide="trash-2" class="w-4 h-4"></i>
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
    document.getElementById('caseModalTitle').textContent = 'New Case File';
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

    document.getElementById('caseModalTitle').textContent = 'Edit Case File';
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
          this.showToast('Supabase Error', 'error');
        }
      }
      const index = this.cases.findIndex(c => c.id === id);
      if (index !== -1) {
        this.cases[index] = { ...this.cases[index], ...caseData };
      }
      this.showToast('Saved', 'success');
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
          this.showToast('Supabase Error', 'error');
          this.cases.unshift({ id: newId, ...caseData });
        }
      } else {
        this.cases.unshift({ id: newId, ...caseData });
      }
      this.showToast('Added to Diary', 'success');
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
      const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      updatedInstructions = `[${today}: ${proceedings}] ` + updatedInstructions;
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
        this.showToast('Supabase Error', 'error');
      }
    }

    Object.assign(item, updates);
    this.saveToLocal();
    this.closeNdohModal();
    this.updateCounters();
    this.render();
    this.showToast('NDOH Updated', 'success');
  }

  // Delete Case
  async deleteCase(id) {
    const item = this.cases.find(c => c.id === id);
    if (!confirm(`Delete case record: ${item?.case_number}?`)) {
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
        this.showToast('Supabase Error', 'error');
      }
    }

    this.cases = this.cases.filter(c => c.id !== id);
    this.saveToLocal();
    this.updateCounters();
    this.render();
    this.showToast('Deleted', 'info');
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

  // Print Daily Board
  printDailyBoard() {
    const todayCases = this.cases.filter(c => {
      if (c.status === 'Disposed') return false;
      return this.getDateDifference(c.next_hearing_date) === 0;
    });

    const casesToPrint = todayCases.length > 0 ? todayCases : this.getFilteredCases();
    const title = todayCases.length > 0 ? "TODAY'S CAUSE LIST" : "COURT CASES SCHEDULE";

    const printWindow = window.open('', '_blank');
    const rows = casesToPrint.map((c, i) => `
      <tr style="border-bottom: 0.5px solid #d1d1d6;">
        <td style="padding: 10px; text-align: center;">${i + 1}</td>
        <td style="padding: 10px; font-weight: 600; font-family: -apple-system, monospace;">${c.case_number}</td>
        <td style="padding: 10px;">${c.parties}</td>
        <td style="padding: 10px;">${c.court_name || ''} <br><small style="color: #636366;">${c.judge_name || ''}</small></td>
        <td style="padding: 10px;"><b>${c.hearing_stage || ''}</b></td>
        <td style="padding: 10px; font-weight: 600;">${this.formatDisplayDate(c.next_hearing_date)}</td>
        <td style="padding: 10px; font-size: 11px;">${c.senior_instructions || '-'}</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif; padding: 30px; color: #000; }
          h2 { margin-bottom: 4px; text-align: center; font-size: 19px; }
          p { text-align: center; color: #8e8e93; font-size: 12px; margin-top: 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 13px; }
          th { background: #f2f2f7; border-bottom: 1px solid #c6c6c8; padding: 10px; text-align: left; font-size: 11px; text-transform: uppercase; color: #636366; }
          @media print {
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <h2>${title}</h2>
        <p>Generated on ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
        <div style="text-align: right; margin-bottom: 12px;">
          <button onclick="window.print()" style="padding: 8px 16px; background: #007aff; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;">Print</button>
        </div>
        <table>
          <thead>
            <tr>
              <th style="width: 30px; text-align: center;">#</th>
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

  // Settings
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
      this.showToast('Please enter both keys', 'error');
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
      this.showToast('Cloud Connected', 'success');
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
    this.showToast('Demo Mode', 'info');
  }

  // iOS 15 Pill HUD Notification (AirPods / Silent Mode style)
  showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `px-4 py-2 rounded-full shadow-2xl text-[13px] font-semibold flex items-center gap-2 pointer-events-auto transition-all transform duration-300 translate-y-[-20px] opacity-0 bg-[#2C2C2E]/95 backdrop-blur-xl border border-white/10 text-white`;
    
    let icon = 'check-circle-2';
    let iconColor = 'text-ios-green';
    if (type === 'error') {
      icon = 'alert-circle';
      iconColor = 'text-ios-red';
    } else if (type === 'warning') {
      icon = 'alert-triangle';
      iconColor = 'text-ios-orange';
    }

    toast.innerHTML = `
      <i data-lucide="${icon}" class="w-4 h-4 ${iconColor}"></i>
      <span>${message}</span>
    `;

    container.appendChild(toast);
    if (window.lucide) lucide.createIcons();

    setTimeout(() => {
      toast.classList.remove('translate-y-[-20px]', 'opacity-0');
      toast.classList.add('translate-y-0', 'opacity-100');
    }, 10);

    setTimeout(() => {
      toast.classList.add('opacity-0', 'translate-y-[-20px]');
      setTimeout(() => toast.remove(), 300);
    }, 2500);
  }
}

// Instantiate and expose globally
const app = new LegalDiaryApp();
window.app = app;
