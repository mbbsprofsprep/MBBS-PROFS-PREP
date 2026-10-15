// ==========================================
// app-shell.js - Centralized UI, Auth, Security & Neuro-Recall Engine (MBBS Profs Prep)
// ==========================================

// 0. ENSURE MARKED.JS IS AVAILABLE ON ALL PAGES (INCLUDING INDEX.HTML)
if (typeof marked === 'undefined') {
    const markedScript = document.createElement('script');
    markedScript.src = "https://cdn.jsdelivr.net/npm/marked/marked.min.js";
    document.head.appendChild(markedScript);
}

// 1. INJECT SCOPED CSS FOR 3D NEURO-RECALL FLASHCARDS
const neuroRecallCSS = `
<style id="neuro-recall-styles">
    #neuro-recall-layer {
        display: none;
        position: fixed;
        inset: 0;
        background: #020617;
        color: #f8fafc;
        z-index: 25000;
        flex-direction: column;
        font-family: 'Plus Jakarta Sans', sans-serif;
        overflow: hidden;
    }
    #neuro-recall-layer.active {
        display: flex;
    }
    .nr-perspective {
        perspective: 1400px;
        -webkit-perspective: 1400px;
    }
    .nr-flipper {
        position: relative;
        width: 100%;
        height: 100%;
        transition: transform 0.6s cubic-bezier(0.4, 0.2, 0.2, 1);
        transform-style: preserve-3d;
        -webkit-transform-style: preserve-3d;
    }
    .nr-flipper.is-flipped {
        transform: rotateY(180deg);
        -webkit-transform: rotateY(180deg);
    }
    .nr-face {
        position: absolute;
        inset: 0;
        backface-visibility: hidden;
        -webkit-backface-visibility: hidden;
        background: #ffffff;
        color: #0f172a;
        border-radius: 20px;
        padding: 24px;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.45);
        border: 1px solid #e2e8f0;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        -webkit-transform: translate3d(0, 0, 0);
    }
    html.dark .nr-face {
        background: #0f172a;
        color: #f8fafc;
        border-color: #1e293b;
    }
    .nr-face-back {
        transform: rotateY(180deg) translate3d(0, 0, 0);
        -webkit-transform: rotateY(180deg) translate3d(0, 0, 0);
    }
    .nr-opt-btn {
        width: 100%;
        padding: 14px 16px;
        margin-bottom: 10px;
        border: 2px solid #e2e8f0;
        border-radius: 12px;
        background: #f8fafc;
        color: #334155;
        text-align: left;
        font-size: 0.95rem;
        font-weight: 600;
        cursor: pointer;
        display: flex;
        align-items: flex-start;
        gap: 12px;
        transition: all 0.2s ease;
    }
    html.dark .nr-opt-btn {
        background: rgba(30, 41, 59, 0.6);
        border-color: #1e293b;
        color: #e2e8f0;
    }
    .nr-opt-btn:hover {
        border-color: #0ea5e9;
        background: #f0f9ff;
    }
    html.dark .nr-opt-btn:hover {
        border-color: #38bdf8;
        background: rgba(14, 165, 233, 0.15);
    }
    .nr-grade-btn {
        flex: 1;
        padding: 14px 10px;
        border: none;
        border-radius: 14px;
        font-weight: 800;
        color: white;
        cursor: pointer;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        transition: transform 0.15s ease, filter 0.15s ease;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.25);
    }
    .nr-grade-btn:hover {
        transform: translateY(-2px);
        filter: brightness(1.08);
    }
    .nr-grade-btn:active {
        transform: scale(0.97);
    }
    .nr-brain-glow {
        text-shadow: 0 0 16px rgba(56, 189, 248, 0.9);
        transform: scale(1.15);
    }
    /* Mini 3D Flip Card inside Sidebar Bookmarks */
    .bm-flip-scene {
        perspective: 1000px;
        -webkit-perspective: 1000px;
    }
    .bm-flip-card {
        position: relative;
        width: 100%;
        transition: transform 0.55s cubic-bezier(0.4, 0.2, 0.2, 1);
        transform-style: preserve-3d;
        -webkit-transform-style: preserve-3d;
        display: grid;
    }
    .bm-flip-card.is-flipped {
        transform: rotateY(180deg);
        -webkit-transform: rotateY(180deg);
    }
    .bm-flip-front, .bm-flip-back {
        grid-area: 1 / 1;
        backface-visibility: hidden;
        -webkit-backface-visibility: hidden;
        -webkit-transform: translate3d(0, 0, 0);
    }
    .bm-flip-back {
        transform: rotateY(180deg) translate3d(0, 0, 0);
        -webkit-transform: rotateY(180deg) translate3d(0, 0, 0);
    }
</style>
`;
document.head.insertAdjacentHTML('beforeend', neuroRecallCSS);

// 2. INJECT THE NAVBAR, SIDEBAR & NEURO-RECALL LAYER HTML
const appShellHTML = `
    <nav class="fixed top-0 w-full z-50 border-b border-brand-100 dark:border-slate-800 bg-white/90 dark:bg-dark-bg/95 backdrop-blur-md transition-colors">
        <div class="w-full px-4 md:px-6 py-3 flex justify-between items-center max-w-7xl mx-auto">
            <div class="flex items-center gap-3 md:gap-4">
                <button onclick="window.userPanelApp.toggle()" class="p-2 -ml-2 rounded-xl hover:bg-brand-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
                </button>
                <a href="index.html" class="flex items-center gap-3 group cursor-pointer">
                    <img class="w-9 h-9 md:w-10 md:h-10 rounded-xl shadow-lg shadow-accent-yellow/20 object-cover ring-2 ring-offset-2 ring-accent-yellow transition-transform group-hover:scale-105" src="https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEgFbo8CVZSf-ejwVGTTTGeu1B5bJj4JGloqdh70o21Tf_895kWYOvNmyE9cnAAR66r77ZFZZKTslF6QIp4F-bWxPsXjGsAWzwc75D6VnXqFMbi-4NgUazELmMWeyX3ApASZncrHUFjni62u4spE3g19Pfcbsy-h5iUTfxTXWWTEYPgaD47kLMDA43e1SMQ/s678/1000126459.jpg" alt="Logo">
                    <div class="leading-tight">
                        <h1 class="font-bold text-base md:text-lg tracking-tight text-slate-900 dark:text-white">MBBS <span class="text-brand-400">Profs Prep</span></h1>
                        <p class="text-[9px] md:text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mt-0.5">Central Portal</p>
                    </div>
                </a>
            </div>
            <div class="hidden md:block flex-1 max-w-md mx-8">
                <input oninput="window.handleGlobalSearch(this.value)" class="w-full px-4 py-2 bg-brand-50 dark:bg-dark-surface border border-brand-100 dark:border-slate-700 rounded-full focus:ring-2 focus:ring-brand-400 outline-none transition-all text-sm text-slate-900 dark:text-white placeholder-slate-400" id="globalSearch" placeholder="Search Institute or Questions..." type="text"/>
            </div>
            <div class="flex items-center gap-2 md:gap-3">
                <button id="nav-neuro-due-btn" onclick="window.neuroRecallApp.open('due')" class="hidden items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/15 hover:bg-amber-500/25 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-xs font-extrabold transition-all shadow-sm">
                    <span>🧠</span>
                    <span><span id="nav-neuro-due-count">0</span> Due</span>
                </button>
                <button class="w-10 h-10 rounded-full flex items-center justify-center hover:bg-brand-50 dark:hover:bg-white/10 text-xl transition-all text-accent-yellow" onclick="window.toggleTheme()">
                    <span id="theme-icon">🌙</span>
                </button>
            </div>
        </div>
    </nav>

    <aside class="fixed top-0 left-0 h-full z-[10005] bg-white dark:bg-dark-surface shadow-2xl transform -translate-x-full transition-transform duration-300 flex flex-col border-r border-brand-100 dark:border-slate-800 w-full sm:w-[350px] lg:w-[400px]" id="user-panel-drawer">
        <div class="px-4 py-4 border-b border-brand-100 dark:border-slate-800 flex justify-between items-center bg-brand-50 dark:bg-dark-bg shrink-0">
            <h2 class="font-bold text-lg text-slate-900 dark:text-white tracking-tight">My Account</h2>
            <button onclick="window.userPanelApp.close()" class="p-2 rounded-lg text-slate-400 hover:bg-white dark:hover:bg-slate-800 hover:text-red-500 transition-colors">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
        </div>
        <div class="flex-1 overflow-y-auto p-4 custom-scrollbar bg-slate-50 dark:bg-dark-bg" id="user-panel-body"></div>
        <div class="p-4 border-t border-brand-100 dark:border-slate-800 bg-brand-50 dark:bg-dark-bg shrink-0" id="user-panel-footer"></div>
    </aside>
    <div class="fixed inset-0 z-[10004] bg-slate-900/60 backdrop-blur-sm opacity-0 pointer-events-none transition-opacity duration-300" id="user-panel-backdrop" onclick="window.userPanelApp.close()"></div>

    <!-- FULL-SCREEN NEURO-ADAPTIVE RECALL OVERLAY -->
    <div id="neuro-recall-layer">
        <header class="px-4 md:px-6 pt-5 pb-3 flex justify-between items-center border-b border-slate-800 bg-slate-950/80 shrink-0">
            <div class="flex items-center gap-2.5">
                <span class="text-2xl">🧠</span>
                <div>
                    <h2 class="font-extrabold text-base md:text-lg text-white tracking-tight leading-none">Neuro-Recall</h2>
                    <p class="text-[10px] text-sky-400 font-bold uppercase tracking-widest mt-1">Spaced Repetition Flashcards</p>
                </div>
            </div>
            <div class="flex items-center gap-2">
                <button onclick="window.neuroRecallApp.promptExamDate()" class="px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 transition-colors" title="Set Target Exam Date">
                    📅 <span id="nr-exam-days-label">90d to Exam</span>
                </button>
                <button onclick="window.neuroRecallApp.close()" class="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors">
                    Save & Exit ✕
                </button>
            </div>
        </header>

        <!-- MODE TOGGLES -->
        <div class="px-4 pt-3 pb-2 max-w-3xl w-full mx-auto flex gap-2.5 shrink-0">
            <button id="nr-mode-due" onclick="window.neuroRecallApp.setMode('due')" class="flex-1 py-2.5 rounded-xl font-extrabold text-xs uppercase tracking-wider transition-all bg-sky-500 text-white shadow-lg shadow-sky-500/25">
                Due Today (<span id="nr-due-count">0</span>)
            </button>
            <button id="nr-mode-all" onclick="window.neuroRecallApp.setMode('all')" class="flex-1 py-2.5 rounded-xl font-extrabold text-xs uppercase tracking-wider transition-all bg-slate-800/80 text-slate-400 hover:text-white">
                Full Vault (<span id="nr-all-count">0</span>)
            </button>
        </div>

        <!-- SYNAPTIC PROGRESS BAR -->
        <div id="nr-progress-section" class="px-4 py-1 max-w-3xl w-full mx-auto shrink-0">
            <div class="flex items-center gap-3">
                <span id="nr-brain-icon" class="text-xl transition-all duration-300">⚡</span>
                <div class="h-2 flex-1 bg-slate-800 rounded-full overflow-hidden">
                    <div id="nr-prog-fill" class="h-full bg-gradient-to-r from-sky-500 to-cyan-300 w-0 transition-all duration-300"></div>
                </div>
                <span id="nr-prog-text" class="text-xs font-bold text-slate-400">0 / 0 Synapses</span>
            </div>
        </div>

        <!-- EMPTY / COMPLETED STATE -->
        <div id="nr-done-state" class="hidden flex-1 flex-col items-center justify-center text-center p-6 max-w-md mx-auto">
            <div class="w-24 h-24 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center text-4xl mb-5 shadow-lg shadow-emerald-500/20">
                ⚡
            </div>
            <h3 class="text-2xl font-black text-white mb-2" id="nr-done-title">Synapses Strengthened!</h3>
            <p class="text-sm text-slate-400 leading-relaxed mb-6" id="nr-done-desc">You have completed all due active recall flashcards for today.</p>
            <div class="flex flex-col sm:flex-row gap-3 w-full">
                <button onclick="window.neuroRecallApp.setMode('all')" class="flex-1 py-3.5 px-6 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-extrabold text-sm shadow-lg shadow-sky-500/25 transition-all">
                    Cram Full Vault
                </button>
                <button onclick="window.neuroRecallApp.close()" class="flex-1 py-3.5 px-6 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm transition-all">
                    Return to Study
                </button>
            </div>
        </div>

        <!-- ACTIVE 3D FLASHCARD CONTAINER -->
        <div id="nr-card-stage" class="flex-1 px-4 py-3 max-w-3xl w-full mx-auto flex flex-col min-h-0 nr-perspective">
            <div id="nr-flipper" class="nr-flipper flex-1">
                <div id="nr-card-front" class="nr-face custom-scrollbar"></div>
                <div id="nr-card-back" class="nr-face nr-face-back custom-scrollbar"></div>
            </div>
        </div>

        <!-- NEURO-ADAPTIVE GRADING FOOTER -->
        <footer id="nr-footer" class="px-4 py-3 pb-6 bg-slate-950/90 border-t border-slate-800 shrink-0">
            <div class="max-w-3xl mx-auto">
                <div id="nr-footer-prompt" class="text-center text-xs font-bold text-slate-400 py-2">
                    Select an option or reveal the answer to test your active recall.
                </div>
                <div id="nr-footer-wrong" class="hidden gap-3">
                    <button onclick="window.neuroRecallApp.grade(0)" class="nr-grade-btn bg-red-600">
                        <span class="text-sm md:text-base">🔄 Review Later</span>
                        <span class="text-[10px] opacity-90 uppercase tracking-wider mt-0.5 font-semibold">Synaptic strength reset (Re-queue)</span>
                    </button>
                </div>
                <div id="nr-footer-correct" class="hidden gap-2.5 md:gap-3">
                    <button onclick="window.neuroRecallApp.grade(0)" class="nr-grade-btn bg-red-600">
                        <span class="text-xs md:text-sm">🔄 Again</span>
                        <span class="text-[10px] opacity-90 uppercase tracking-wider mt-0.5 font-semibold">Reset Step</span>
                    </button>
                    <button onclick="window.neuroRecallApp.grade(1)" class="nr-grade-btn bg-amber-500">
                        <span class="text-xs md:text-sm">🤔 Hard / Guessed</span>
                        <span id="nr-time-guess" class="text-[10px] opacity-90 uppercase tracking-wider mt-0.5 font-semibold">+1d</span>
                    </button>
                    <button onclick="window.neuroRecallApp.grade(2)" class="nr-grade-btn bg-emerald-600">
                        <span class="text-xs md:text-sm">⚡ Nailed It</span>
                        <span id="nr-time-mastered" class="text-[10px] opacity-90 uppercase tracking-wider mt-0.5 font-semibold">+4d</span>
                    </button>
                </div>
            </div>
        </footer>
    </div>
`;

document.body.insertAdjacentHTML('afterbegin', appShellHTML);

// 3. GLOBALS & CONSTANTS
const APP_LOGO_URL = "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEgFbo8CVZSf-ejwVGTTTGeu1B5bJj4JGloqdh70o21Tf_895kWYOvNmyE9cnAAR66r77ZFZZKTslF6QIp4F-bWxPsXjGsAWzwc75D6VnXqFMbi-4NgUazELmMWeyX3ApASZncrHUFjni62u4spE3g19Pfcbsy-h5iUTfxTXWWTEYPgaD47kLMDA43e1SMQ/s678/1000126459.jpg";
window.ADMIN_EMAILS = [
    "pankajmahto109@gmail.com",
    "educateindiainstitute@gmail.com",
    "indrajeet91434@gmail.com",
    "pankajkumarmahto1009@gmail.com"
];

window.isUserAdmin = function(user = window.currentUserObj) {
    return Boolean(user && user.email && window.ADMIN_EMAILS.includes(user.email.toLowerCase().trim()));
};

if (localStorage.getItem('theme') === 'dark') {
    document.documentElement.classList.add('dark');
    const icon = document.getElementById('theme-icon');
    if (icon) icon.innerText = '☀️';
}

// ====================================================
// 4. SPACED REPETITION MATH ENGINE (FROM MEDPYQ)
// ====================================================
window.getDaysToExam = function() {
    const targetDateStr = localStorage.getItem('mbbs_target_date');
    if (targetDateStr) {
        const targetTime = new Date(targetDateStr).getTime();
        const diffDays = Math.ceil((targetTime - Date.now()) / 86400000);
        if (!isNaN(diffDays) && diffDays >= 1) return diffDays;
    }
    return 90;
};

window.calculateNextReviewDate = function(currentStep) {
    const now = Date.now();
    const msPerDay = 86400000;
    const daysRemaining = window.getDaysToExam();
    let nextIntervalDays = 1;
    if (currentStep <= 1) nextIntervalDays = 1;
    else if (currentStep === 2) nextIntervalDays = Math.max(1, Math.round(daysRemaining * 0.10));
    else if (currentStep === 3) nextIntervalDays = Math.max(1, Math.round(daysRemaining * 0.20));
    else if (currentStep >= 4) nextIntervalDays = 21;
    return now + (nextIntervalDays * msPerDay);
};

window.getDueBookmarksCount = function() {
    const bookmarks = window.userBookmarks || {};
    const now = Date.now();
    let due = 0;
    Object.values(bookmarks).forEach(bm => {
        if (!bm) return;
        const nextRev = bm.next_review_date || 0;
        if (now >= nextRev) due++;
    });
    return due;
};

window.updateNeuroDueBadges = function() {
    const dueCount = window.getDueBookmarksCount();
    const totalCount = Object.keys(window.userBookmarks || {}).length;

    const navBtn = document.getElementById('nav-neuro-due-btn');
    const navCount = document.getElementById('nav-neuro-due-count');
    if (navBtn && navCount) {
        if (window.currentUserObj && totalCount > 0) {
            navCount.innerText = dueCount > 0 ? dueCount : totalCount;
            navBtn.onclick = () => window.neuroRecallApp.open(dueCount > 0 ? 'due' : 'all');
            navBtn.classList.remove('hidden');
            navBtn.classList.add('flex');
        } else {
            navBtn.classList.add('hidden');
            navBtn.classList.remove('flex');
        }
    }
};

// ====================================================
// 5. NEURO-ADAPTIVE RECALL FLASHCARD ENGINE
// ====================================================
window.neuroRecallApp = {
    isOpen: false,
    isCramMode: false,
    queue: [],
    totalInSession: 0,
    sessionAnswered: new Set(),
    currentItem: null,
    calcGuessDays: 1,
    calcMasteredDays: 4,

    open: function(mode = 'due') {
        if (!window.currentUserObj) {
            window.userPanelApp.open();
            window.toggleAuthMode('login');
            return;
        }
        const totalSaved = Object.keys(window.userBookmarks || {}).length;
        const dueCount = window.getDueBookmarksCount();
        // Auto-switch to Full Vault if no cards are strictly due right now but user has bookmarks
        if (mode === 'due' && dueCount === 0 && totalSaved > 0) {
            this.isCramMode = true;
        } else {
            this.isCramMode = (mode === 'all');
        }

        if (window.userPanelApp && window.userPanelApp.isOpen) {
            window.userPanelApp.close();
        }

        this.isOpen = true;
        this.sessionAnswered.clear();
        document.getElementById('neuro-recall-layer').classList.add('active');
        this.updateExamDaysUI();
        this.syncModeButtons();
        this.buildQueue();
    },

    close: function() {
        this.isOpen = false;
        document.getElementById('neuro-recall-layer').classList.remove('active');
        window.updateNeuroDueBadges();
    },

    promptExamDate: function() {
        const current = localStorage.getItem('mbbs_target_date') || new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0];
        const input = prompt("Enter your Target Professional Exam Date (YYYY-MM-DD) to optimize spaced repetition intervals:", current);
        if (input && /^\d{4}-\d{2}-\d{2}$/.test(input.trim())) {
            localStorage.setItem('mbbs_target_date', input.trim());
            this.updateExamDaysUI();
            if (this.currentItem) this.renderCard();
        }
    },

    updateExamDaysUI: function() {
        const el = document.getElementById('nr-exam-days-label');
        if (el) el.innerText = `${window.getDaysToExam()}d to Exam`;
    },

    setMode: function(mode) {
        this.isCramMode = (mode === 'all');
        this.sessionAnswered.clear();
        this.syncModeButtons();
        this.buildQueue();
    },

    syncModeButtons: function() {
        const btnDue = document.getElementById('nr-mode-due');
        const btnAll = document.getElementById('nr-mode-all');
        if (!btnDue || !btnAll) return;

        if (this.isCramMode) {
            btnAll.className = "flex-1 py-2.5 rounded-xl font-extrabold text-xs uppercase tracking-wider transition-all bg-sky-500 text-white shadow-lg shadow-sky-500/25";
            btnDue.className = "flex-1 py-2.5 rounded-xl font-extrabold text-xs uppercase tracking-wider transition-all bg-slate-800/80 text-slate-400 hover:text-white";
        } else {
            btnDue.className = "flex-1 py-2.5 rounded-xl font-extrabold text-xs uppercase tracking-wider transition-all bg-sky-500 text-white shadow-lg shadow-sky-500/25";
            btnAll.className = "flex-1 py-2.5 rounded-xl font-extrabold text-xs uppercase tracking-wider transition-all bg-slate-800/80 text-slate-400 hover:text-white";
        }
    },

    buildQueue: function() {
        const bookmarks = window.userBookmarks || {};
        const now = Date.now();
        const entries = Object.entries(bookmarks);

        let strictlyDue = 0;
        const filtered = [];

        entries.forEach(([key, bm]) => {
            if (!bm) return;
            const step = bm.current_step || 1;
            const nextRev = bm.next_review_date || 0;
            const isDue = (now >= nextRev);
            if (isDue) strictlyDue++;

            if (this.sessionAnswered.has(key)) return;

            if (this.isCramMode || isDue) {
                filtered.push({
                    key: key,
                    data: {
                        ...bm,
                        current_step: step,
                        next_review_date: nextRev
                    }
                });
            }
        });

        document.getElementById('nr-due-count').innerText = strictlyDue;
        document.getElementById('nr-all-count').innerText = entries.length;

        if (this.isCramMode) {
            filtered.sort((a, b) => (a.data.current_step || 1) - (b.data.current_step || 1));
        } else {
            filtered.sort((a, b) => (a.data.next_review_date || 0) - (b.data.next_review_date || 0));
        }

        this.queue = filtered;
        this.totalInSession = filtered.length;

        if (this.queue.length === 0) {
            this.showDoneState(entries.length === 0);
        } else {
            document.getElementById('nr-done-state').classList.add('hidden');
            document.getElementById('nr-done-state').classList.remove('flex');
            document.getElementById('nr-card-stage').classList.remove('hidden');
            document.getElementById('nr-footer').classList.remove('hidden');
            document.getElementById('nr-progress-section').classList.remove('hidden');
            this.loadNextCard();
        }
    },

    showDoneState: function(noBookmarksAtAll) {
        document.getElementById('nr-card-stage').classList.add('hidden');
        document.getElementById('nr-footer').classList.add('hidden');
        document.getElementById('nr-progress-section').classList.add('hidden');

        const doneEl = document.getElementById('nr-done-state');
        doneEl.classList.remove('hidden');
        doneEl.classList.add('flex');

        const titleEl = document.getElementById('nr-done-title');
        const descEl = document.getElementById('nr-done-desc');
        if (noBookmarksAtAll) {
            titleEl.innerText = "Your Neuro-Vault is Empty";
            descEl.innerText = "Bookmark any MCQ, Theory Question, or Clinical Case across the platform to build your personal spaced-repetition flashcard deck.";
        } else if (this.isCramMode) {
            titleEl.innerText = "Vault Complete!";
            descEl.innerText = "You have reviewed every single saved flashcard in your vault. Outstanding work!";
        } else {
            titleEl.innerText = "Synapses Strengthened!";
            descEl.innerText = "You have completed all due active recall sessions for today. Tap 'Cram Full Vault' below if you want to practice ahead of schedule.";
        }
    },

    loadNextCard: function() {
        if (this.queue.length === 0) {
            this.showDoneState(false);
            return;
        }

        const flipper = document.getElementById('nr-flipper');
        if (flipper) flipper.classList.remove('is-flipped');

        const completed = this.totalInSession - this.queue.length;
        const pct = this.totalInSession > 0 ? Math.round((completed / this.totalInSession) * 100) : 0;
        document.getElementById('nr-prog-text').innerText = `${completed} / ${this.totalInSession} Synapses Fired`;
        document.getElementById('nr-prog-fill').style.width = `${pct}%`;

        const brain = document.getElementById('nr-brain-icon');
        if (brain) {
            brain.classList.add('nr-brain-glow');
            setTimeout(() => brain.classList.remove('nr-brain-glow'), 500);
        }

        this.currentItem = this.queue[0];
        this.renderCard();
    },

    getExplanationForBookmark: async function(bm) {
        if (bm.explanation) return bm.explanation;
        if (window.liveAnswers && bm.q && window.liveAnswers[bm.q] && window.liveAnswers[bm.q].text) {
            return window.liveAnswers[bm.q].text;
        }
        // Try fetching live answer from Firebase if collegeCode and subjectCode are known or parseable
        if (window.db && bm.q) {
            try {
                const { ref, get } = await import("https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js");
                let colCode = bm.collegeCode;
                let subCode = bm.subjectCode;
                if (!colCode && bm.subject) {
                    const parts = bm.subject.split(' - ');
                    if (parts[0]) colCode = parts[0].replace(/^AIIMS\s+/i, '').trim().toLowerCase().replace(/\s+/g, '-');
                    if (parts[1]) subCode = parts[1].replace(/\s+Clinical$/i, '').trim().toUpperCase();
                }
                if (colCode && subCode) {
                    const isClin = (bm.subject && bm.subject.includes('Clinical')) || String(bm.q).startsWith('CLIN-');
                    const path = isClin
                        ? `clinical_data/${colCode}/${subCode}/${bm.q}/answer`
                        : `answers/${colCode}/${subCode}/${bm.q}/text`;
                    const snap = await get(ref(window.db, path));
                    if (snap.exists()) return snap.val();
                }
            } catch (e) {}
        }
        return "";
    },

    renderCard: function() {
        const bm = this.currentItem.data;
        const step = bm.current_step || 1;
        const daysToExam = window.getDaysToExam();

        this.calcGuessDays = Math.max(1, Math.round(step * 1.5));
        this.calcMasteredDays = Math.max(3, Math.round((daysToExam * 0.15) * step));

        document.getElementById('nr-time-guess').innerText = `+${this.calcGuessDays}d`;
        document.getElementById('nr-time-mastered').innerText = `+${this.calcMasteredDays}d`;

        // Reset footer to Front State
        document.getElementById('nr-footer-prompt').classList.remove('hidden');
        document.getElementById('nr-footer-wrong').classList.add('hidden');
        document.getElementById('nr-footer-wrong').classList.remove('flex');
        document.getElementById('nr-footer-correct').classList.add('hidden');
        document.getElementById('nr-footer-correct').classList.remove('flex');

        const cleanStem = (bm.text || "Saved Question").replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        const isMCQ = bm.type === 'MCQ' && Array.isArray(bm.options) && bm.options.length > 0;

        let interactionHtml = '';
        if (isMCQ) {
            interactionHtml = `<div class="space-y-2.5 mt-4">` + bm.options.map((opt, idx) => {
                const letter = String.fromCharCode(65 + idx);
                const cleanOpt = String(opt || '').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                return `
                    <button type="button" onclick="window.neuroRecallApp.selectMCQ('${letter}')" class="nr-opt-btn group">
                        <span class="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-extrabold text-xs flex items-center justify-center shrink-0 group-hover:bg-sky-500 group-hover:text-white transition-colors">${letter}</span>
                        <span class="leading-snug pt-0.5">${cleanOpt}</span>
                    </button>`;
            }).join('') + `</div>`;
        } else {
            interactionHtml = `
                <div class="mt-auto pt-6">
                    <div class="p-4 rounded-xl bg-sky-50 dark:bg-slate-800/60 border border-sky-200 dark:border-slate-700 mb-4 text-xs text-sky-800 dark:text-sky-300 font-medium">
                        💡 Mentally structure your key points, headings, or clinical management plan before flipping the card.
                    </div>
                    <button type="button" onclick="window.neuroRecallApp.flipTheoryCard()" class="w-full py-4 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-extrabold text-sm uppercase tracking-wider shadow-lg shadow-sky-500/25 transition-all active:scale-95">
                        👁️ Flip Card & Reveal Answer
                    </button>
                </div>`;
        }

        const frontEl = document.getElementById('nr-card-front');
        frontEl.innerHTML = `
            <div class="flex justify-between items-center gap-2 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
                <span class="text-[11px] font-extrabold uppercase tracking-wider text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-900/30 px-3 py-1 rounded-lg border border-sky-200 dark:border-sky-800 truncate">${bm.subject || 'Saved Question'} (${bm.q || ''})</span>
                <span class="text-[11px] font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-2.5 py-1 rounded-lg border border-amber-200 dark:border-amber-800 shrink-0">⚡ Level ${step}</span>
            </div>
            <div class="text-base md:text-lg font-bold leading-relaxed mb-4">${cleanStem}</div>
            ${interactionHtml}
        `;
        frontEl.scrollTop = 0;
    },

    selectMCQ: async function(selectedLetter) {
        const bm = this.currentItem.data;
        const correctLetter = String(bm.ans_key || 'A').trim().toUpperCase();
        const isCorrect = (selectedLetter === correctLetter);
        const ansIndex = Math.max(0, correctLetter.charCodeAt(0) - 65);
        const correctText = (bm.options && bm.options[ansIndex]) ? bm.options[ansIndex] : `Option ${correctLetter}`;

        const bannerHtml = isCorrect
            ? `<div class="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/25 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 font-extrabold text-sm flex items-center gap-2.5 mb-4"><span>✅</span> <span>Correct! Excellent synaptic retrieval.</span></div>`
            : `<div class="p-4 rounded-xl bg-red-50 dark:bg-red-900/25 border border-red-300 dark:border-red-700 text-red-800 dark:text-red-300 font-extrabold text-sm flex items-center gap-2.5 mb-4"><span>❌</span> <span>Incorrect. You picked ${selectedLetter}; correct answer is ${correctLetter}.</span></div>`;

        await this.populateBackFace(bm, bannerHtml, `<div class="p-4 rounded-xl bg-slate-100 dark:bg-slate-800 font-bold text-sm mb-4 border border-slate-200 dark:border-slate-700"><span class="text-emerald-600 dark:text-emerald-400 mr-2">${correctLetter})</span>${correctText}</div>`);

        document.getElementById('nr-flipper').classList.add('is-flipped');
        document.getElementById('nr-footer-prompt').classList.add('hidden');

        if (isCorrect) {
            document.getElementById('nr-footer-correct').classList.remove('hidden');
            document.getElementById('nr-footer-correct').classList.add('flex');
        } else {
            document.getElementById('nr-footer-wrong').classList.remove('hidden');
            document.getElementById('nr-footer-wrong').classList.add('flex');
        }
    },

    flipTheoryCard: async function() {
        const bm = this.currentItem.data;
        const bannerHtml = `<div class="p-3.5 rounded-xl bg-sky-50 dark:bg-sky-900/25 border border-sky-200 dark:border-sky-800 text-sky-800 dark:text-sky-300 font-extrabold text-xs uppercase tracking-wider flex items-center justify-between mb-4"><span>📝 Model Answer & Explanation</span><span>Self-Grade Below</span></div>`;

        await this.populateBackFace(bm, bannerHtml, '');

        document.getElementById('nr-flipper').classList.add('is-flipped');
        document.getElementById('nr-footer-prompt').classList.add('hidden');
        document.getElementById('nr-footer-correct').classList.remove('hidden');
        document.getElementById('nr-footer-correct').classList.add('flex');
    },

    populateBackFace: async function(bm, bannerHtml, correctBoxHtml) {
        const backEl = document.getElementById('nr-card-back');
        const cleanStem = (bm.text || "").replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

        backEl.innerHTML = `
            ${bannerHtml}
            <div class="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-3 leading-relaxed">${cleanStem}</div>
            ${correctBoxHtml}
            <div class="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border-l-4 border-sky-500 text-sm leading-relaxed flex-1 markdown-body" id="nr-back-expl">
                <span class="text-slate-400 animate-pulse">Loading explanation...</span>
            </div>
            <div class="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center gap-2 shrink-0">
                <button type="button" onclick="document.getElementById('nr-flipper').classList.remove('is-flipped')" class="px-3.5 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold hover:opacity-80">
                    🔙 View Question
                </button>
                <button type="button" onclick="window.neuroRecallApp.askAIForCurrent()" class="px-3.5 py-2 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs font-bold hover:bg-emerald-500 hover:text-white transition-colors">
                    🤖 Copy for ChatGPT
                </button>
            </div>
        `;
        backEl.scrollTop = 0;

        const explText = await this.getExplanationForBookmark(bm);
        const explContainer = document.getElementById('nr-back-expl');
        if (explContainer) {
            if (explText) {
                explContainer.innerHTML = `<div class="text-[10px] font-black uppercase tracking-widest text-sky-500 mb-2">Neuro-Link (Explanation)</div>` + window.sharedRenderMarkdown(explText);
            } else {
                explContainer.innerHTML = `<em class="text-slate-400 text-xs">No saved explanation yet for this question. Tap <b>Copy for ChatGPT</b> below for an instant structured model answer.</em>`;
            }
        }
    },

    askAIForCurrent: function() {
        if (!this.currentItem) return;
        const bm = this.currentItem.data;
        let prompt = `I am studying for ${bm.subject || 'my MBBS Professional Exam'}. Please provide a high-yield model answer / explanation for:\n\nQ: ${bm.text}`;
        if (bm.type === 'MCQ' && bm.options) {
            prompt += `\nOptions:\n` + bm.options.map((o, i) => `${String.fromCharCode(65 + i)}) ${o}`).join('\n') + `\nCorrect Key: ${bm.ans_key}`;
        }
        if (navigator.clipboard) {
            navigator.clipboard.writeText(prompt).then(() => {
                window.open('https://chatgpt.com/', '_blank');
            });
        }
    },

    grade: async function(gradeCode) {
        if (!this.currentItem || !window.currentUserObj) return;

        const { key, data } = this.currentItem;
        let step = data.current_step || 1;
        let nextIntervalDays = 0;

        if (gradeCode === 0) {
            step = 1;
            nextIntervalDays = 0;
        } else if (gradeCode === 1) {
            step = step + 1;
            nextIntervalDays = this.calcGuessDays;
        } else if (gradeCode === 2) {
            step = step + 2;
            nextIntervalDays = this.calcMasteredDays;
        }

        const nextReview = Date.now() + (nextIntervalDays * 86400000);
        const shifted = this.queue.shift();

        data.current_step = step;
        data.next_review_date = nextReview;

        if (window.userBookmarks && window.userBookmarks[key]) {
            window.userBookmarks[key].current_step = step;
            window.userBookmarks[key].next_review_date = nextReview;
        }

        if (gradeCode === 0) {
            // Re-queue at end of current session until mastered
            this.queue.push(shifted);
        } else {
            this.sessionAnswered.add(key);
        }

        // Persist updated synaptic step and next review timestamp to Firebase
        try {
            if (window.db) {
                const { ref, update } = await import("https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js");
                await update(ref(window.db, `users/${window.currentUserObj.uid}/bookmarks/${key}`), {
                    current_step: step,
                    next_review_date: nextReview
                });
            }
        } catch (e) {
            console.error("Failed to sync neuro-grade:", e);
        }

        window.updateNeuroDueBadges();
        this.loadNextCard();
    }
};

// ====================================================
// 6. GLOBAL SEARCH ROUTER (Index & Review/Clinical Pages)
// ====================================================
window.handleGlobalSearch = function(query) {
    const q = (query || "").toLowerCase().trim();

    const localSearch = document.getElementById('searchInput');
    if (localSearch && typeof window.filterTable === 'function') {
        localSearch.value = query;
        window.filterTable();
        if (window.isDeckMode && typeof window.syncDeckWithFilters === 'function') {
            window.syncDeckWithFilters();
        }
        return;
    }

    const grids = ['institutes-grid', 'years-grid', 'subjects-grid', 'resources-grid'];
    grids.forEach(gridId => {
        const gridEl = document.getElementById(gridId);
        if (gridEl && gridEl.parentElement && !gridEl.parentElement.classList.contains('hidden')) {
            Array.from(gridEl.children).forEach(card => {
                const text = (card.textContent || "").toLowerCase();
                card.style.display = text.includes(q) ? "" : "none";
            });
        }
    });
};

// ====================================================
// 7. PANZOOM FLASHCARD HELPERS
// ====================================================
window.zoomInCard = function(qId) {
    if (window[`panzoom_${qId}`]) window[`panzoom_${qId}`].zoomIn();
};
window.zoomOutCard = function(qId) {
    if (window[`panzoom_${qId}`]) window[`panzoom_${qId}`].zoomOut();
};
window.resetZoomCard = function(qId) {
    if (window[`panzoom_${qId}`]) window[`panzoom_${qId}`].reset();
};

// ====================================================
// 8. UNIFIED MEDIA-AWARE MARKDOWN & VIDEO PLAYERS
// ====================================================
window.toggleYT = function(containerId, videoId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    if (container.classList.contains('hidden')) {
        container.classList.remove('hidden');
        if (container.innerHTML.trim() === '') {
            container.innerHTML = `<iframe class="absolute top-0 left-0 w-full h-full" src="https://www.youtube.com/embed/${videoId}?autoplay=1" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
        }
    } else {
        container.classList.add('hidden');
        container.innerHTML = '';
    }
};

window.toggleWebVideo = function(containerId, videoUrl) {
    const container = document.getElementById(containerId);
    if (!container) return;
    if (container.classList.contains('hidden')) {
        container.classList.remove('hidden');
        if (container.innerHTML.trim() === '') {
            container.innerHTML = `<video controls autoplay class="w-full max-h-[500px] m-0 rounded-xl outline-none"><source src="${videoUrl}">Your browser does not support HTML5 video.</video>`;
        }
    } else {
        container.classList.add('hidden');
        container.innerHTML = '';
    }
};

window.sharedRenderMarkdown = function(text) {
    if (!text) return "<em class='text-slate-400'>No answer provided yet.</em>";
    let processedText = text;

    const ytMarkdownRegex = /\[([^\]]+)\]\((?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?|shorts)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})[^\)]*\)/g;
    processedText = processedText.replace(ytMarkdownRegex, (match, title, videoId) => {
        const uniqueId = 'yt-' + Math.random().toString(36).substring(2, 11);
        return `<div class="yt-container my-4">
                    <button type="button" onclick="window.toggleYT('${uniqueId}', '${videoId}')" class="flex items-center gap-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-bold text-sm bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 px-4 py-2.5 rounded-xl transition-colors border border-red-100 dark:border-red-900/50 w-full sm:w-auto shadow-sm">
                        <svg class="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/></svg>
                        <span class="yt-title text-left line-clamp-1 flex-1">▶ Play: ${title}</span>
                    </button>
                    <div id="${uniqueId}" class="hidden mt-3 rounded-xl overflow-hidden shadow-lg border border-slate-200 dark:border-slate-700 relative bg-slate-900 w-full" style="padding-top: 56.25%;"></div>
                </div>`;
    });

    const ytRawRegex = /(^|\s)(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?|shorts)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})(?:\S*)?/g;
    processedText = processedText.replace(ytRawRegex, (match, space, videoId) => {
        const uniqueId = 'yt-' + Math.random().toString(36).substring(2, 11);
        return `${space}<div class="yt-container my-4">
                    <button type="button" onclick="window.toggleYT('${uniqueId}', '${videoId}')" class="flex items-center gap-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-bold text-sm bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 px-4 py-2.5 rounded-xl transition-colors border border-red-100 dark:border-red-900/50 w-full sm:w-auto shadow-sm">
                        <svg class="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/></svg>
                        <span class="yt-title text-left line-clamp-1 flex-1">▶ Play YouTube Video</span>
                    </button>
                    <div id="${uniqueId}" class="hidden mt-3 rounded-xl overflow-hidden shadow-lg border border-slate-200 dark:border-slate-700 relative bg-slate-900 w-full" style="padding-top: 56.25%;"></div>
                </div>`;
    });

    const vidMarkdownRegex = /\[([^\]]+)\]\((https?:\/\/[^\s\)]+\.(?:mp4|webm|ogg)(?:\?[^\s\)]*)?)\)/gi;
    processedText = processedText.replace(vidMarkdownRegex, (match, title, videoUrl) => {
        const uniqueId = 'vid-' + Math.random().toString(36).substring(2, 11);
        return `<div class="vid-container my-4">
                    <button type="button" onclick="window.toggleWebVideo('${uniqueId}', '${videoUrl}')" class="flex items-center gap-2 text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 font-bold text-sm bg-brand-50 hover:bg-brand-100 dark:bg-brand-900/20 dark:hover:bg-brand-900/40 px-4 py-2.5 rounded-xl transition-colors border border-brand-200 dark:border-brand-800/50 w-full sm:w-auto shadow-sm">
                        <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                        <span class="vid-title text-left line-clamp-1 flex-1">🎬 Play Video: ${title}</span>
                    </button>
                    <div id="${uniqueId}" class="hidden mt-3 rounded-xl overflow-hidden shadow-lg border border-slate-200 dark:border-slate-700 bg-slate-900 w-full"></div>
                </div>`;
    });

    if (typeof marked !== 'undefined') {
        const rawHtml = marked.parse(processedText);
        return rawHtml.replace(/<table>/g, '<div class="markdown-table-wrapper"><table>').replace(/<\/table>/g, '</table></div>');
    }
    return processedText;
};

// ====================================================
// 9. SECURE CHECKOUT LOADER
// ====================================================
window.openSecureCheckout = function(e) {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();

    const existing = document.getElementById('secure-checkout-loader');
    if (existing) existing.remove();

    const loader = document.createElement('div');
    loader.id = 'secure-checkout-loader';
    loader.className = 'fixed inset-0 z-[30000] bg-slate-900/90 backdrop-blur-md flex flex-col items-center justify-center transition-opacity duration-300 text-center px-4';
    loader.innerHTML = `
        <div class="w-12 h-12 border-4 border-slate-700 border-t-brand-500 rounded-full animate-spin mb-6 mx-auto"></div>
        <h2 class="text-xl md:text-2xl font-black text-white mb-2">Preparing Checkout</h2>
        <p class="text-slate-300 text-sm font-medium animate-pulse">Opening secure browser for payment...</p>
    `;
    document.body.appendChild(loader);

    const checkoutUrl = "https://mbbsprofsprep.github.io/MBBS-PROFS-PREP/checkout.html";
    const checkoutWindow = window.open(checkoutUrl, "_blank");

    if (!checkoutWindow) {
        loader.innerHTML = `
            <div class="w-12 h-12 bg-red-500/20 text-red-500 border border-red-500/50 rounded-full flex items-center justify-center text-xl mb-6 mx-auto shadow-[0_0_15px_rgba(239,68,68,0.3)]">🛡️</div>
            <h2 class="text-xl font-black text-white mb-2">Popup Blocked</h2>
            <p class="text-slate-300 text-sm font-medium mb-6 leading-relaxed max-w-sm mx-auto">Your browser or adblocker prevented the secure checkout from opening.<br><br><span class="text-brand-400 font-bold">Please allow popups for this site or tap below to continue.</span></p>
            <div class="flex flex-col gap-3 w-full max-w-xs mx-auto">
                <a href="${checkoutUrl}" class="w-full px-6 py-3 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-xl transition-colors shadow-lg block">Continue to Checkout</a>
                <button onclick="document.getElementById('secure-checkout-loader').remove()" class="w-full px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-colors">Cancel</button>
            </div>
        `;
    } else {
        setTimeout(() => {
            loader.classList.add('opacity-0');
            setTimeout(() => loader.remove(), 300);
        }, 2500);
    }
};

// ====================================================
// 10. AUTH UI & THEME HELPERS
// ====================================================
window.toggleAuthMode = function(mode) {
    window.userPanelApp.authMode = mode;
    window.userPanelApp.renderState();
};

window.togglePassword = function() {
    const input = document.getElementById('login-pass') || document.getElementById('reg-pass');
    const icon = document.getElementById('eye-icon');
    if (!input) return;
    if (input.type === "password") {
        input.type = "text";
        if (icon) icon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a10.059 10.059 0 011.591-2.714M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M1.5 1.5l22.5 22.5" />`;
    } else {
        input.type = "password";
        if (icon) icon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />`;
    }
};

window.showAuthError = function(msg) {
    const errDiv = document.getElementById('auth-error-msg');
    if (errDiv) {
        errDiv.innerText = msg;
        errDiv.classList.remove('hidden', 'bg-green-50', 'text-green-600', 'border-green-200');
        errDiv.classList.add('bg-red-50', 'text-red-600', 'border-red-200');
        setTimeout(() => errDiv.classList.add('hidden'), 5000);
    } else {
        alert(msg);
    }
};

window.toggleTheme = function() {
    const d = document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', d ? 'dark' : 'light');
    const icon = document.getElementById('theme-icon');
    if (icon) icon.innerText = d ? '☀️' : '🌙';
    if (typeof window.update3D === 'function') window.update3D();
};

// ====================================================
// 11. THE MULTI-VIEW USER PANEL APP (WITH 3D BOOKMARKS & NEURO-RECALL)
// ====================================================
window.userPanelApp = {
    isOpen: false,
    authMode: 'login',
    viewMode: 'menu',

    els: function() {
        return {
            drawer: document.getElementById('user-panel-drawer'),
            backdrop: document.getElementById('user-panel-backdrop'),
            body: document.getElementById('user-panel-body'),
            footer: document.getElementById('user-panel-footer')
        };
    },

    toggle: function() { this.isOpen ? this.close() : this.open(); },

    open: function() {
        this.isOpen = true;
        this.viewMode = 'menu';
        this.renderState();
        const e = this.els();
        if (e.drawer) e.drawer.classList.remove('-translate-x-full');
        if (e.backdrop) e.backdrop.classList.remove('opacity-0', 'pointer-events-none');
    },

    close: function() {
        this.isOpen = false;
        const e = this.els();
        if (e.drawer) e.drawer.classList.add('-translate-x-full');
        if (e.backdrop) e.backdrop.classList.add('opacity-0', 'pointer-events-none');
    },

    setView: function(view) {
        this.viewMode = view;
        this.renderState();
    },

    renderState: function() {
        const user = window.currentUserObj;
        const pData = window.currentUserProfileData || {};
        const els = this.els();
        if (!els.body || !els.footer) return;

        const legalFooterHtml = `
            <div class="flex flex-wrap justify-center gap-x-3 gap-y-2 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide w-full px-2 mb-2 mt-4">
                <a href="legal.html?page=about" class="hover:text-brand-500 transition-colors">About Us</a> • 
                <a href="legal.html?page=contact" class="hover:text-brand-500 transition-colors">Contact</a> • 
                <a href="legal.html?page=terms" class="hover:text-brand-500 transition-colors">Terms</a> • 
                <a href="legal.html?page=privacy" class="hover:text-brand-500 transition-colors">Privacy</a> • 
                <a href="legal.html?page=refunds" class="hover:text-brand-500 transition-colors">Refunds</a>
            </div>`;

        if (user) {
            const totalSaved = Object.keys(window.userBookmarks || {}).length;
            const dueCount = window.getDueBookmarksCount();

            if (this.viewMode === 'menu') {
                let badgeHtml = '';
                let daysHtml = '';
                if (window.globalUserStatus && window.globalUserStatus.isVIP) {
                    badgeHtml = `<span class="px-3 py-1 mt-3 bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 text-[10px] font-extrabold rounded-full uppercase tracking-wider border border-brand-200 dark:border-brand-800">PRO / VIP ACCESS</span>`;
                    const fd = window.globalUserStatus.validUntil === 'Lifetime Access' ? 'Lifetime Access' : new Date(window.globalUserStatus.validUntil).toLocaleDateString('en-US');
                    daysHtml = `<div class="w-full mt-4 p-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 flex flex-col items-center"><span class="text-2xl font-black text-green-600 dark:text-green-400">${window.globalUserStatus.daysLeft === 999 ? '∞' : window.globalUserStatus.daysLeft}</span><span class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Days Left</span><span class="text-[10px] font-medium text-slate-400 mt-1">Valid until ${fd}</span></div>`;
                } else if (window.globalUserStatus && window.globalUserStatus.expired) {
                    const daysAgo = Math.abs(window.globalUserStatus.daysLeft);
                    badgeHtml = `<span class="px-3 py-1 mt-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-[10px] font-extrabold rounded-full uppercase tracking-wider border border-red-200 dark:border-red-800">EXPIRED</span>`;
                    daysHtml = `<div class="w-full mt-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex flex-col items-center text-center"><span class="text-xs font-bold text-red-600 dark:text-red-400">Oops! Your subscription ended ${daysAgo} days ago.</span><a onclick="window.openSecureCheckout(event)" class="mt-2 text-xs font-bold bg-red-600 text-white px-3 py-1.5 rounded-lg shadow-sm cursor-pointer">Renew Now</a></div>`;
                } else {
                    badgeHtml = `<span class="px-3 py-1 mt-3 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-extrabold rounded-full uppercase tracking-wider border border-slate-300 dark:border-slate-700">FREE PLAN</span>`;
                    daysHtml = `<div class="w-full mt-4 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 flex flex-col items-center text-center"><span class="text-xs font-bold text-blue-600 dark:text-blue-400">Membership Required</span><a onclick="window.openSecureCheckout(event)" class="mt-2 text-xs font-bold bg-brand-500 text-white px-3 py-1.5 rounded-lg shadow-sm hover:bg-brand-600 cursor-pointer">Unlock QBank</a></div>`;
                }

                const nameToDisplay = user.displayName || pData.fullName || "User";
                const initial = (user.email || "U").charAt(0).toUpperCase();

                els.body.innerHTML = `
                    <div class="flex flex-col items-center justify-center p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 mb-6 shadow-sm">
                        <div class="w-20 h-20 rounded-full bg-brand-50 dark:bg-slate-800 flex items-center justify-center text-3xl font-bold text-brand-600 dark:text-brand-400 mb-3 shadow-md border border-brand-100 dark:border-slate-700">${initial}</div>
                        <h3 class="font-bold text-slate-900 dark:text-white text-center w-full truncate px-2 text-sm">${nameToDisplay}</h3>
                        <p class="text-xs text-slate-500 truncate w-full text-center mt-1">${user.email}</p>
                        ${badgeHtml}${daysHtml}
                    </div>
                    <div class="flex flex-col gap-3">
                        <a onclick="window.neuroRecallApp.open('${dueCount > 0 ? 'due' : 'all'}')" class="flex items-center justify-between p-4 bg-gradient-to-r from-sky-500 to-brand-600 text-white rounded-2xl cursor-pointer transition-all shadow-md hover:shadow-lg group">
                            <div class="flex items-center gap-3.5 font-extrabold text-sm">
                                <span class="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">🧠</span>
                                <div>
                                    <div>Neuro-Recall Flashcards</div>
                                    <div class="text-[10px] font-semibold text-sky-100">${dueCount} Due Today • ${totalSaved} Saved</div>
                                </div>
                            </div>
                            <span class="text-white/80 text-xs font-bold bg-white/20 px-2.5 py-1 rounded-full">Practice ❯</span>
                        </a>
                        <a onclick="window.userPanelApp.setView('bookmarks')" class="flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-accent-yellow/50 cursor-pointer transition-all shadow-sm hover:shadow group"><div class="flex items-center gap-4 text-slate-700 dark:text-slate-300 font-semibold text-sm"><span class="w-10 h-10 rounded-xl bg-accent-yellow/10 dark:bg-slate-800 flex items-center justify-center text-accent-yellow text-xl group-hover:scale-110 transition-transform">🔖</span> Bookmarks & Saved (${totalSaved})</div><span class="text-slate-400 text-xs">❯</span></a>
                        <a onclick="window.userPanelApp.setView('edit_profile')" class="flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-brand-300 dark:hover:border-brand-700 cursor-pointer transition-all shadow-sm hover:shadow group"><div class="flex items-center gap-4 text-slate-700 dark:text-slate-300 font-semibold text-sm"><span class="w-10 h-10 rounded-xl bg-brand-50 dark:bg-slate-800 flex items-center justify-center text-brand-500 text-xl group-hover:scale-110 transition-transform">👤</span> My Profile</div><span class="text-slate-400 text-xs">❯</span></a>
                        <a onclick="window.openSecureCheckout(event)" class="flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-700 cursor-pointer transition-all shadow-sm hover:shadow group"><div class="flex items-center gap-4 text-slate-700 dark:text-slate-300 font-semibold text-sm"><span class="w-10 h-10 rounded-xl bg-purple-50 dark:bg-slate-800 flex items-center justify-center text-purple-500 text-xl group-hover:scale-110 transition-transform">💳</span> Subscription & Billing</div><span class="text-slate-400 text-xs">❯</span></a>
                    </div>`;
                els.footer.innerHTML = `${legalFooterHtml}<button onclick="window.firebaseSignOut()" class="w-full py-3.5 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-bold hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors flex items-center justify-center gap-2 mt-2 border border-red-200 dark:border-red-800 shadow-sm"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg> Logout</button>`;

            } else if (this.viewMode === 'bookmarks') {
                const bookmarkEntries = Object.entries(window.userBookmarks || {}).sort((a, b) => new Date(b[1].timestamp) - new Date(a[1].timestamp));
                let bookmarksHtml = '';

                if (bookmarkEntries.length === 0) {
                    bookmarksHtml = `<div class="flex flex-col items-center justify-center py-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm mt-4"><span class="text-5xl mb-4 opacity-70">🔖</span><h4 class="font-bold text-lg text-slate-700 dark:text-slate-300">No Saved Questions Yet</h4><p class="text-sm text-slate-500 mt-2 px-4 leading-relaxed">Questions you bookmark inside the QBank will automatically sync here as interactive flashcards.</p><button onclick="window.userPanelApp.setView('menu')" class="mt-6 px-6 py-2.5 bg-brand-50 text-brand-600 dark:bg-brand-900/20 dark:text-brand-400 rounded-lg font-bold text-sm hover:bg-brand-100 dark:hover:bg-brand-900/40 transition-colors border border-brand-200 dark:border-brand-800">Go Back</button></div>`;
                } else {
                    bookmarksHtml = `
                        <button onclick="window.neuroRecallApp.open('${dueCount > 0 ? 'due' : 'all'}')" class="w-full mt-3 mb-4 p-4 rounded-2xl bg-gradient-to-r from-sky-500 to-brand-600 text-white font-extrabold text-sm shadow-lg shadow-sky-500/20 flex items-center justify-between hover:opacity-95 transition-all">
                            <span class="flex items-center gap-2"><span>⚡</span> Start Fullscreen Neuro-Recall</span>
                            <span class="text-xs bg-white/20 px-2.5 py-1 rounded-full">${dueCount} Due / ${totalSaved} Total</span>
                        </button>
                        <div class="space-y-5 pb-10">`;

                    bookmarkEntries.forEach(([bmKey, bm], idx) => {
                        let formattedText = (bm.text || 'Saved Question').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                        const step = bm.current_step || 1;
                        const isDue = Date.now() >= (bm.next_review_date || 0);
                        const cardDomId = `bm-card-${idx}`;

                        let frontOptionsHtml = '';
                        let backAnswerHtml = '';

                        if (bm.type === 'MCQ' && bm.options) {
                            frontOptionsHtml = `<div class="mt-3 space-y-2">`;
                            bm.options.forEach((opt, oIdx) => {
                                const letter = String.fromCharCode(65 + oIdx);
                                let formattedOpt = opt.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                                frontOptionsHtml += `
                                    <div onclick="document.getElementById('${cardDomId}').classList.add('is-flipped')" class="w-full text-left p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 hover:border-brand-400 text-slate-700 dark:text-slate-300 flex items-start gap-2.5 cursor-pointer transition-colors">
                                        <span class="w-6 h-6 rounded-md bg-white dark:bg-slate-700 text-slate-500 text-xs font-bold flex items-center justify-center border border-slate-200 dark:border-slate-600 shrink-0">${letter}</span>
                                        <span class="text-xs font-medium leading-snug pt-0.5">${formattedOpt}</span>
                                    </div>`;
                            });
                            frontOptionsHtml += `</div>`;

                            const correctLetter = String(bm.ans_key || 'A').toUpperCase();
                            const ansIdx = Math.max(0, correctLetter.charCodeAt(0) - 65);
                            const correctOptText = bm.options[ansIdx] || `Option ${correctLetter}`;
                            backAnswerHtml = `
                                <div class="p-3.5 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-800 text-green-800 dark:text-green-300 font-bold text-xs mb-3">
                                    ✅ Correct Answer: ${correctLetter})${correctOptText}
                                </div>`;
                        }

                        const savedExpl = bm.explanation ? `<div class="text-xs text-slate-600 dark:text-slate-300 leading-relaxed markdown-body mt-2">${window.sharedRenderMarkdown(bm.explanation)}</div>` : `<p class="text-xs text-slate-400 italic mt-2">Open in Neuro-Recall or source page to view full notes.</p>`;

                        bookmarksHtml += `
                            <div class="bm-flip-scene">
                                <div id="${cardDomId}" class="bm-flip-card">
                                    <!-- FRONT OF SAVED FLASHCARD -->
                                    <div class="bm-flip-front p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
                                        <div>
                                            <div class="flex justify-between items-start gap-2 mb-3">
                                                <span class="text-[10px] text-brand-600 dark:text-brand-400 font-extrabold uppercase tracking-widest bg-brand-50 dark:bg-brand-900/30 px-2.5 py-1 rounded-md border border-brand-200 dark:border-brand-800 truncate">${bm.subject || 'QBank'}</span>
                                                <span class="text-[10px] font-extrabold px-2 py-0.5 rounded-md border shrink-0 ${isDue ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800' : 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'}">⚡ Lvl ${step}</span>
                                            </div>
                                            <div class="text-sm font-bold text-slate-900 dark:text-white mb-2 leading-relaxed">${formattedText}</div>${frontOptionsHtml}
                                        </div>
                                        <div class="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center gap-2">
                                            <button onclick="window.deleteBookmark('${bmKey}')" class="text-[10px] font-bold text-red-500 hover:text-red-600 px-2.5 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors uppercase tracking-wide">
                                                🗑️ Remove
                                            </button>
                                            <button onclick="document.getElementById('${cardDomId}').classList.add('is-flipped')" class="text-xs font-extrabold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/20 hover:bg-brand-100 px-3.5 py-2 rounded-xl border border-brand-200 dark:border-brand-800 transition-colors">
                                                🔄 Flip Card
                                            </button>
                                        </div>
                                    </div>

                                    <!-- BACK OF SAVED FLASHCARD -->
                                    <div class="bm-flip-back p-5 bg-white dark:bg-slate-900 rounded-2xl border-2 border-brand-400 dark:border-brand-600 shadow-md flex flex-col justify-between">
                                        <div>
                                            <div class="flex justify-between items-center mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">
                                                <span class="text-[10px] font-black uppercase tracking-widest text-brand-500">🧠 Flashcard Back (${bm.q || ''})</span>
                                                <button onclick="document.getElementById('${cardDomId}').classList.remove('is-flipped')" class="text-xs font-bold text-slate-400 hover:text-slate-600">✕ Flip Back</button>
                                            </div>
                                            ${backAnswerHtml}${savedExpl}
                                        </div>
                                        <div class="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center gap-2">
                                            <button onclick="document.getElementById('${cardDomId}').classList.remove('is-flipped')" class="text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-xl">
                                                🔙 Question
                                            </button>
                                            <a href="${bm.url || '#'}" class="text-xs font-bold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/20 px-3.5 py-2 rounded-xl border border-brand-200 dark:border-brand-800">
                                                Open Source ➝
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            </div>`;
                    });
                    bookmarksHtml += `</div>`;
                }

                els.body.innerHTML = `
                    <div class="mb-2">
                        <div class="flex items-center justify-between mb-4 sticky top-0 bg-slate-50 dark:bg-dark-bg z-10 py-2 border-b border-slate-200 dark:border-slate-800">
                            <button onclick="window.userPanelApp.setView('menu')" class="p-2 -ml-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors flex items-center gap-1 font-bold text-sm"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg> Back</button>
                        </div>
                        <h3 class="text-2xl font-black text-slate-900 dark:text-white mb-1">Saved Flashcards</h3>
                        <p class="text-xs text-slate-500 font-medium">Tap any card to flip it in 3D or launch Neuro-Recall.</p>
                        ${bookmarksHtml}
                    </div>`;
                els.footer.innerHTML = ``;

            } else if (this.viewMode === 'edit_profile') {
                const currentYear = pData.joinYear || '';
                const isS = (v, t) => (v === t) ? 'selected' : '';
                els.body.innerHTML = `
                    <div class="mb-4">
                        <div class="flex items-center justify-between mb-6 sticky top-0 bg-slate-50 dark:bg-dark-bg z-10 py-2 border-b border-slate-200 dark:border-slate-800">
                            <button onclick="window.userPanelApp.setView('menu')" class="p-2 -ml-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors flex items-center gap-1 font-bold text-sm"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg> Back</button>
                        </div>
                        <h3 class="text-2xl font-black text-slate-900 dark:text-white mb-6">Edit Profile</h3>
                        <div class="space-y-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                            <div><label class="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Full Name</label><input type="text" id="edit-name" value="${pData.fullName || ''}" class="w-full mt-1 px-4 py-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none dark:text-white text-sm font-medium focus:ring-2 focus:ring-brand-500 transition-shadow" /></div>
                            <div><label class="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">College Name</label><input type="text" id="edit-college" value="${pData.college || ''}" class="w-full mt-1 px-4 py-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none dark:text-white text-sm font-medium focus:ring-2 focus:ring-brand-500 transition-shadow" /></div>
                            <div><label class="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Join Year / Batch</label><select id="edit-join-year" class="w-full mt-1 px-4 py-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium outline-none focus:ring-2 focus:ring-brand-500 transition-shadow"><option value="">Select</option><option value="2025 Batch" ${isS(currentYear, '2025 Batch')}>2025 Batch</option><option value="2024 Batch" ${isS(currentYear, '2024 Batch')}>2024 Batch</option><option value="2023 Batch" ${isS(currentYear, '2023 Batch')}>2023 Batch</option><option value="2022 Batch" ${isS(currentYear, '2022 Batch')}>2022 Batch</option><option value="2021 Batch" ${isS(currentYear, '2021 Batch')}>2021 Batch (Intern)</option><option value="Post-Grad / JR" ${isS(currentYear, 'Post-Grad / JR')}>Post-Grad / JR</option></select></div>
                            <div class="grid grid-cols-2 gap-3">
                                <div><label class="text-[10px] font-bold text-slate-500 uppercase ml-1">City</label><input type="text" id="edit-city" value="${pData.city || ''}" class="w-full mt-1 px-4 py-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none dark:text-white text-sm font-medium focus:ring-2 focus:ring-brand-500 transition-shadow" /></div>
                                <div><label class="text-[10px] font-bold text-slate-500 uppercase ml-1">Phone</label><input type="tel" id="edit-phone" value="${pData.phone || ''}" class="w-full mt-1 px-4 py-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none dark:text-white text-sm font-medium focus:ring-2 focus:ring-brand-500 transition-shadow" /></div>
                            </div>
                            <button onclick="window.saveEditedProfile(this)" class="w-full py-4 mt-6 rounded-xl text-sm font-bold bg-brand-500 text-white shadow-lg shadow-brand-500/30 active:scale-95 transition-all">Save Changes</button>
                        </div>
                    </div>`;
                els.footer.innerHTML = ``;
            }
        } else {
            if (this.authMode === 'login') {
                els.body.innerHTML = `
                    <div class="flex flex-col items-center justify-center min-h-[calc(100vh-250px)]">
                        <img src="${APP_LOGO_URL}" class="w-20 h-20 rounded-2xl shadow-xl ring-4 ring-offset-4 ring-brand-400/30 mb-6 object-cover" alt="Logo">
                        <h3 class="text-2xl font-black text-slate-900 dark:text-white mb-2">Welcome Back</h3>
                        <p class="text-sm text-slate-500 dark:text-slate-400 mb-6">Log in to sync your progress.</p>
                        <div id="auth-error-msg" class="hidden w-full bg-red-50 text-red-600 border border-red-200 text-xs p-3 rounded-xl mb-4 text-center font-bold"></div>
                        <div class="w-full space-y-3 mb-6 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                            <input type="email" id="login-email" placeholder="Email Address" class="w-full px-4 py-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none dark:text-white text-sm font-medium focus:ring-2 focus:ring-brand-500 transition-shadow" />
                            <div class="relative w-full">
                                <input type="password" id="login-pass" placeholder="Password" class="w-full pl-4 pr-10 py-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none dark:text-white text-sm font-medium focus:ring-2 focus:ring-brand-500 transition-shadow" />
                                <button type="button" onclick="window.togglePassword()" class="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><svg id="eye-icon" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg></button>
                            </div>
                            <div class="text-right w-full pt-1"><button onclick="window.handleForgotPass()" class="text-[10px] font-bold text-brand-500 uppercase tracking-wider hover:text-brand-600 transition-colors">Forgot Password?</button></div>
                        </div>
                        <button onclick="window.handleEmailLogin(this)" class="w-full py-4 rounded-xl text-sm font-bold bg-brand-500 text-white shadow-lg shadow-brand-500/30 active:scale-95 transition-all hover:bg-brand-600">Sign In</button>
                        <div class="text-center mt-6"><span class="text-sm text-slate-500">Don't have an account?</span> <button onclick="window.toggleAuthMode('register')" class="text-sm font-bold text-brand-600 dark:text-brand-400 hover:underline ml-1">Create One</button></div>
                    </div>`;
            } else {
                els.body.innerHTML = `
                    <div class="flex flex-col items-center justify-start min-h-[calc(100vh-250px)] pb-4">
                        <img src="${APP_LOGO_URL}" class="w-16 h-16 rounded-2xl shadow-xl ring-2 ring-offset-2 ring-brand-400/50 mb-4 object-cover mt-2" alt="Logo">
                        <h3 class="text-xl font-black text-slate-900 dark:text-white mb-1">Create Global Profile</h3>
                        <p class="text-sm text-slate-500 mb-6">Join the community.</p>
                        <div id="auth-error-msg" class="hidden w-full bg-red-50 text-red-600 border border-red-200 text-xs p-3 rounded-xl mb-4 text-center font-bold"></div>
                        <div class="w-full space-y-3 mb-6 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                            <select id="reg-country" class="w-full px-4 py-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-sm outline-none focus:ring-2 focus:ring-brand-500 transition-shadow font-medium"><option value="">Select Country</option><option value="India" selected>India</option></select>
                            <input type="text" id="reg-city" placeholder="City" class="w-full px-4 py-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none text-sm dark:text-white font-medium focus:ring-2 focus:ring-brand-500 transition-shadow" />
                            <input type="text" id="reg-name" placeholder="Full Name" class="w-full px-4 py-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none text-sm dark:text-white font-medium focus:ring-2 focus:ring-brand-500 transition-shadow" />
                            <input type="email" id="reg-email" placeholder="Email Address" class="w-full px-4 py-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none text-sm dark:text-white font-medium focus:ring-2 focus:ring-brand-500 transition-shadow" />
                            <input type="password" id="reg-pass" placeholder="Create Password (Min 6)" class="w-full px-4 py-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none text-sm dark:text-white font-medium focus:ring-2 focus:ring-brand-500 transition-shadow" />
                            <div class="grid grid-cols-2 gap-3">
                                <select id="reg-join-year" class="w-full px-4 py-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-sm outline-none font-medium focus:ring-2 focus:ring-brand-500 transition-shadow"><option value="">Batch</option><option value="2025 Batch">2025 Batch</option><option value="2024 Batch">2024 Batch</option><option value="2023 Batch">2023 Batch</option><option value="2022 Batch">2022 Batch</option><option value="Intern">Intern</option><option value="JR/SR">JR / SR</option></select>
                                <input type="text" id="reg-college" placeholder="College Name" class="w-full px-4 py-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none text-sm dark:text-white font-medium focus:ring-2 focus:ring-brand-500 transition-shadow" />
                            </div>
                            <input type="tel" id="reg-phone" placeholder="Phone Number" class="w-full px-4 py-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none text-sm dark:text-white font-medium focus:ring-2 focus:ring-brand-500 transition-shadow" />
                        </div>
                        <button onclick="window.handleEmailSignUp(this)" class="w-full py-4 rounded-xl text-sm font-bold bg-green-600 text-white shadow-lg shadow-green-600/30 active:scale-95 transition-all hover:bg-green-700">Create Account</button>
                        <div class="text-center mt-6"><span class="text-sm text-slate-500">Already have an account?</span><button onclick="window.toggleAuthMode('login')" class="text-sm font-bold text-brand-600 dark:text-brand-400 hover:underline ml-1">Sign In</button></div>
                    </div>`;
            }
            els.footer.innerHTML = legalFooterHtml;
        }
    }
};

// ====================================================
// 12. AUTO-PATCH REVIEW & CLINICAL PAGES ON DOM LOAD
// ====================================================
document.addEventListener('DOMContentLoaded', () => {
    if (typeof window.renderMarkdown === 'function') {
        window.renderMarkdown = window.sharedRenderMarkdown;
    }

    if (typeof window.submitReportToForm === 'function' && window.REPORT_CONFIG) {
        window.submitReportToForm = function(qid, btn) {
            const descEl = document.getElementById('report-desc');
            const desc = descEl ? descEl.value : "";
            if (btn) { btn.innerText = "Sending..."; btn.disabled = true; }

            const iframeName = 'hidden_iframe_' + Date.now();
            const iframe = document.createElement('iframe');
            iframe.name = iframeName;
            iframe.style.display = 'none';
            document.body.appendChild(iframe);

            const form = document.createElement('form');
            form.method = 'POST';
            form.action = `https://docs.google.com/forms/d/e/${window.REPORT_CONFIG.formID}/formResponse`;
            form.target = iframeName;
            form.style.display = 'none';

            const inputs = [
                { name: window.REPORT_CONFIG.entryID_QID, value: `${qid} | ${window.location.href}` },
                { name: window.REPORT_CONFIG.entryID_Type, value: window.selectedReportType || "Other" },
                { name: window.REPORT_CONFIG.entryID_Desc, value: desc }
            ];

            inputs.forEach(data => {
                const input = document.createElement('input');
                input.type = 'hidden';
                input.name = data.name;
                input.value = data.value;
                form.appendChild(input);
            });

            document.body.appendChild(form);
            form.submit();

            setTimeout(() => {
                const bodyEl = document.getElementById('modal-body-content');
                const footerEl = document.getElementById('modal-footer-buttons');
                if (bodyEl) {
                    bodyEl.innerHTML = `
                        <div class="text-center py-4">
                            <div class="w-12 h-12 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl border border-green-200 dark:border-green-800">✅</div>
                            <h3 class="font-bold text-slate-900 dark:text-white">Report Sent!</h3>
                            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Thank you. We will review this shortly.</p>
                        </div>`;
                }
                if (footerEl) {
                    footerEl.innerHTML = `<button onclick="window.closeModal()" class="w-full py-3 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 rounded-xl font-bold text-slate-700 dark:text-slate-300 transition-colors">Close</button>`;
                }
                setTimeout(() => { iframe.remove(); form.remove(); }, 2000);
            }, 1000);
        };
    }

    if (typeof window.handleSecretClick === 'function') {
        window.handleSecretClick = function() {
            if (!window.isUserAdmin()) {
                if (window.showModal) {
                    window.showModal("Access Denied", "<p class='text-red-500 font-semibold'>This tool is strictly restricted to administrators only.</p>", `<button onclick="window.closeModal()" class="w-full bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-white font-bold py-3 rounded-xl border-none">Close</button>`, `🚫`);
                }
                return;
            }
            window.showModal("Welcome Admin!", `<p class="text-slate-700 dark:text-slate-300 font-medium">Enter authorization code:</p><input type="text" id="nameInput" class="w-full border dark:border-slate-700 p-3 rounded-xl bg-white dark:bg-slate-800 dark:text-white mt-3 focus:outline-none">`, `<button onclick="window.handleNameSubmission()" class="w-full bg-brand-500 text-white font-bold px-3 py-3 rounded-xl border-none">Execute</button>`, `☕️`);
        };
    }

    if (typeof window.handleNameSubmission === 'function') {
        window.handleNameSubmission = function() {
            const name = document.getElementById('nameInput') ? document.getElementById('nameInput').value.trim() : "";
            const lowerName = name.toLowerCase();
            if (lowerName === (window.SECRET_CODE || "777pankaj").toLowerCase() || lowerName === "777pankaj") {
                window.closeModal();
                if (typeof window.copyForChatGPT === 'function') window.copyForChatGPT();
            } else if (lowerName === "777calm") {
                window.closeModal();
                if (typeof window.downloadDataAsJSON === 'function') window.downloadDataAsJSON();
            } else if (name && Array.isArray(window.motivationalMessages)) {
                const randomIndex = Math.floor(Math.random() * window.motivationalMessages.length);
                const message = window.motivationalMessages[randomIndex].replace(/[Name]/g, name);
                window.showModal("Motivation!", `<p class="font-semibold text-slate-900 dark:text-white">${message}</p>`, `<button onclick="window.closeModal()" class="w-full bg-green-500 text-white font-bold py-3 rounded-xl border-none">Back to Study</button>`, `💪`);
            }
        };
    }

    const clinIdInput = document.getElementById('clin-q-id');
    if (clinIdInput && window.SUBJECT_CODE) {
        clinIdInput.placeholder = `e.g. ${window.SUBJECT_CODE}-001`;
    }
});

// ====================================================
// 13. CENTRALIZED FIREBASE SYNC, NEURAL BOOKMARKS & 2-DEVICE GUARD
// ====================================================
(async function initCentralizedFirebaseSync() {
    try {
        const { getApp } = await import("https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js");
        const { getAuth, onAuthStateChanged, signOut, sendPasswordResetEmail } = await import("https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js");
        const { getDatabase, ref, set, update, onValue, remove } = await import("https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js");

        setTimeout(() => {
            let fbApp;
            try { fbApp = getApp(); } catch (e) { return; }
            const auth = getAuth(fbApp);
            const db = getDatabase(fbApp);
            window.db = db;

            // 1. Upgrade executeBookmarkToggle to store Spaced-Repetition & Explanation Metadata
            window.executeBookmarkToggle = async function(uniqueId, bookmarkData, isSaved) {
                try {
                    const dbRef = ref(db, `users/${window.currentUserObj.uid}/bookmarks/${uniqueId}`);
                    if (isSaved) {
                        await remove(dbRef);
                        if (window.showModal) window.showModal("Removed", `<p class="text-sm text-slate-500 dark:text-slate-400">Question removed from your Neuro-Recall deck.</p>`, `<button onclick="window.closeModal()" class="w-full py-2 bg-slate-200 dark:bg-slate-800 rounded-lg font-bold text-slate-700 dark:text-slate-300 border-none">Close</button>`, `🗑️`);
                    } else {
                        const enrichedBookmark = {
                            ...bookmarkData,
                            collegeCode: window.COLLEGE_CODE || 'deoghar',
                            subjectCode: window.SUBJECT_CODE || '',
                            current_step: 1,
                            next_review_date: Date.now() // Immediately due for first active recall session
                        };
                        if (window.liveAnswers && bookmarkData.q && window.liveAnswers[bookmarkData.q] && window.liveAnswers[bookmarkData.q].text) {
                            enrichedBookmark.explanation = window.liveAnswers[bookmarkData.q].text;
                        }
                        await set(dbRef, enrichedBookmark);
                        if (window.showModal) {
                            window.showModal(
                                "Added to Neuro-Recall! 🧠",
                                `<p class="text-sm text-slate-500 dark:text-slate-400">Question saved as a 3D Spaced-Repetition Flashcard. Practice it anytime from your account or the top navbar.</p>`,
                                `<div class="flex gap-2 w-full"><button onclick="window.closeModal(); window.neuroRecallApp.open('due');" class="flex-1 py-2.5 bg-sky-500 text-white rounded-xl font-bold border-none text-xs">Practice Now ⚡</button><button onclick="window.closeModal()" class="flex-1 py-2.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold border-none text-xs">Keep Studying</button></div>`,
                                `☁️`
                            );
                        }
                    }
                } catch (e) {
                    console.error(e);
                    alert("Error syncing bookmark: " + e.message);
                }
            };

            // 2. Upgrade deleteBookmark to support both uniqueId keys and raw qId lookups
            window.deleteBookmark = async function(qIdOrKey) {
                if (!window.currentUserObj) return;
                if (!confirm("Remove this flashcard from your saved items?")) return;

                let targetKey = qIdOrKey;
                if (window.userBookmarks && !window.userBookmarks[qIdOrKey]) {
                    const foundKey = Object.keys(window.userBookmarks).find(key => window.userBookmarks[key].q === qIdOrKey);
                    if (foundKey) targetKey = foundKey;
                }

                if (window.userBookmarks && window.userBookmarks[targetKey]) {
                    delete window.userBookmarks[targetKey];
                }
                if (window.userPanelApp && window.userPanelApp.isOpen) {
                    window.userPanelApp.renderState();
                }
                if (typeof window.updateBookmarkUI === 'function') {
                    window.updateBookmarkUI();
                }
                window.updateNeuroDueBadges();

                try {
                    await remove(ref(db, `users/${window.currentUserObj.uid}/bookmarks/${targetKey}`));
                } catch (e) {
                    console.error(e);
                    alert("Failed to remove bookmark from cloud: " + e.message);
                }
            };

            // 3. Upgrade Forgot Password handler with user-not-found check
            window.handleForgotPass = () => {
                const e = document.getElementById('login-email') ? document.getElementById('login-email').value.trim() : "";
                if (!e) return window.showAuthError("Enter email first");
                sendPasswordResetEmail(auth, e)
                    .then(() => {
                        const errDiv = document.getElementById('auth-error-msg');
                        if (errDiv) {
                            errDiv.innerText = "Reset link sent! Check your inbox.";
                            errDiv.classList.remove('hidden', 'bg-red-50', 'text-red-600', 'border-red-200');
                            errDiv.classList.add('bg-green-50', 'text-green-600', 'border-green-200');
                        }
                    })
                    .catch(err => {
                        if (err.code === 'auth/user-not-found') {
                            window.showAuthError("Your email is not registered with us, please register.");
                        } else {
                            window.showAuthError(err.message);
                        }
                    });
            };

            // 4. Ensure sign-out always clears local session token
            window.firebaseSignOut = () => {
                localStorage.removeItem('my_session_token');
                signOut(auth).then(() => window.location.reload());
            };

            // 5. Listen to Auth & Bookmarks to keep Due Counter updated in real time
            onAuthStateChanged(auth, async (user) => {
                if (user) {
                    onValue(ref(db, 'users/' + user.uid + '/bookmarks'), (snapshot) => {
                        window.userBookmarks = snapshot.exists() ? snapshot.val() : {};
                        window.updateNeuroDueBadges();
                    });
                } else {
                    window.updateNeuroDueBadges();
                }

                // Multi-version (standard vs ed8) shared answer fallback for Pathology & Microbiology
                if (user && window.VERSION_CODE && window.COLLEGE_CODE && window.SUBJECT_CODE) {
                    const baseAnswersRef = ref(db, `answers/${window.COLLEGE_CODE}/${window.SUBJECT_CODE}`);
                    const versionAnswersRef = ref(db, `answers/${window.COLLEGE_CODE}/${window.SUBJECT_CODE}_${window.VERSION_CODE}`);
                    let baseAns = {};
                    let verAns = {};
                    const mergeAnswers = () => {
                        window.liveAnswers = { ...baseAns, ...verAns };
                        if (window.displayData && window.displayData.length > 0) {
                            if (typeof window.populateTable === 'function') window.populateTable();
                            if (window.isDeckMode && typeof window.renderDeckCard === 'function') window.renderDeckCard();
                        }
                    };
                    onValue(baseAnswersRef, (s) => { baseAns = s.val() || {}; mergeAnswers(); });
                    onValue(versionAnswersRef, (s) => { verAns = s.val() || {}; mergeAnswers(); });
                }

                // Enforce 2-Device Session Limit on all non-index pages
                const isIndexPage = Boolean(document.getElementById('view-institutes'));
                if (isIndexPage || !user || window.isUserAdmin(user)) return;

                try {
                    const sessionsRef = ref(db, 'users/' + user.uid + '/active_sessions');
                    const myToken = localStorage.getItem('my_session_token') || Math.random().toString(36).substring(2, 15);
                    localStorage.setItem('my_session_token', myToken);

                    await update(ref(db, 'users/' + user.uid), {
                        ['active_sessions/' + myToken]: Date.now()
                    });

                    onValue(sessionsRef, (snap) => {
                        const sessions = snap.val() || {};
                        const sessionKeys = Object.keys(sessions);

                        if (sessionKeys.length > 0 && !sessions[myToken]) {
                            localStorage.removeItem('my_session_token');
                            signOut(auth).then(() => {
                                document.body.innerHTML = `
                                    <div class="fixed inset-0 z-[50000] bg-slate-900 flex flex-col items-center justify-center p-6 text-center">
                                        <div class="w-20 h-20 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center text-4xl mb-6 border border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.3)]">🔒</div>
                                        <h2 class="text-3xl font-black text-white mb-3">Session Terminated</h2>
                                        <p class="text-slate-400 max-w-md mb-8 font-medium leading-relaxed">You logged into your account on a new device. To maintain your 2-device limit, this older session has been automatically signed out.</p>
                                        <button onclick="window.location.reload()" class="px-8 py-4 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-xl shadow-lg shadow-brand-500/30 transition-all active:scale-95 text-lg">Return to Login</button>
                                    </div>
                                `;
                            });
                            return;
                        }

                        if (sessionKeys.length > 2) {
                            sessionKeys.sort((a, b) => sessions[a] - sessions[b]);
                            const keysToRemove = sessionKeys.slice(0, sessionKeys.length - 2);
                            keysToRemove.forEach(key => {
                                remove(ref(db, 'users/' + user.uid + '/active_sessions/' + key));
                            });
                        }
                    });
                } catch (err) {
                    console.error("Session guard error:", err);
                }
            });
        }, 300);
    } catch (e) {
        // Ignore on static pages without Firebase
    }
})();

// ====================================================
// 14. REGISTER SERVICE WORKER
// ====================================================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then((registration) => {
                console.log('ServiceWorker registration successful with scope: ', registration.scope);
            })
            .catch((error) => {
                console.log('ServiceWorker registration failed: ', error);
            });
    });
}
