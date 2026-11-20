// ============================================================================
// js/ui-shell.js
// Centralized UI Shell: Navbar, Auth/Profile/Bookmarks Drawer, Neuro-Recall
// 3D Flashcards, Global Image Lightbox, Utility Modal & Secure Checkout
// ============================================================================
import {
    db,
    APP_LOGO_URL,
    MPPStore,
    isUserAdmin,
    canAccessNeuroRecall,
    onStoreChange,
    loginWithEmail,
    signUpWithEmail,
    sendResetEmail,
    logoutUser,
    updateUserProfile,
    deleteBookmarkByKey,
    updateBookmarkSRS,
    ref,
    get,
    set
} from "./core-firebase.js";
import { normalizeLegacyUrl } from "./subject-registry.js";
import { escapeHtml, formatInlineMathAndBold, renderContent } from "./content-renderer.js";

let shellMounted = false;

// ============================================================================
// 1. BOOT & INJECT SHARED SHELL HTML + CSS
// ============================================================================
export function initUIShell() {
    if (shellMounted) return;
    shellMounted = true;

    applySavedTheme();
    injectShellStyles();
    injectShellDOM();
    bindGlobalShellEvents();
    registerServiceWorker();

    onStoreChange("auth", () => {
        updateNavbarBadges();
        if (userPanelApp.isOpen) userPanelApp.renderState();
    });
    onStoreChange("profile", () => {
        if (userPanelApp.isOpen && userPanelApp.viewMode !== "bookmarks") userPanelApp.renderState();
    });
    onStoreChange("bookmarks", () => {
        updateNavbarBadges();
        if (userPanelApp.isOpen && userPanelApp.viewMode === "bookmarks") userPanelApp.renderState();
    });
    onStoreChange("flags", () => {
        updateNavbarBadges();
        if (userPanelApp.isOpen) userPanelApp.renderState();
    });
    onStoreChange("adminReady", () => {
        updateNavbarBadges();
        if (userPanelApp.isOpen) userPanelApp.renderState();
    });

    window.addEventListener("mpp:katex-ready", () => {
        if (neuroRecallApp.isOpen && neuroRecallApp.currentItem) {
            neuroRecallApp.renderCard();
        }
    });

    updateNavbarBadges();
}

function applySavedTheme() {
    const isDark = localStorage.getItem("theme") === "dark";
    document.documentElement.classList.toggle("dark", isDark);
}

export function toggleTheme() {
    const isDark = document.documentElement.classList.toggle("dark");
    localStorage.setItem("theme", isDark ? "dark" : "light");
    const icon = document.getElementById("theme-icon");
    if (icon) icon.textContent = isDark ? "☀️" : "🌙";
    if (typeof window.update3D === "function") window.update3D();
}

function injectShellStyles() {
    if (document.getElementById("mpp-ui-shell-css")) return;
    document.head.insertAdjacentHTML("beforeend", `
    <style id="mpp-ui-shell-css">
        #neuro-recall-layer {
            display: none; position: fixed; inset: 0; background: #020617; color: #f8fafc;
            z-index: 25000; flex-direction: column; font-family: 'Plus Jakarta Sans', sans-serif; overflow: hidden;
        }
        #neuro-recall-layer.active { display: flex; }
        .nr-perspective { perspective: 1400px; -webkit-perspective: 1400px; }
        .nr-flipper {
            position: relative; width: 100%; height: 100%;
            transition: transform 0.55s cubic-bezier(0.4, 0.2, 0.2, 1);
            transform-style: preserve-3d; -webkit-transform-style: preserve-3d;
        }
        .nr-flipper.is-flipped { transform: rotateY(180deg); -webkit-transform: rotateY(180deg); }
        .nr-face {
            position: absolute; inset: 0; backface-visibility: hidden; -webkit-backface-visibility: hidden;
            background: #ffffff; color: #0f172a; border-radius: 20px; padding: 24px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.45); border: 1px solid #e2e8f0;
            overflow-y: auto; display: flex; flex-direction: column;
        }
        html.dark .nr-face { background: #0f172a; color: #f8fafc; border-color: #1e293b; }
        .nr-face-back { transform: rotateY(180deg); -webkit-transform: rotateY(180deg); }
        .nr-opt-btn {
            width: 100%; padding: 14px 16px; margin-bottom: 10px; border: 2px solid #e2e8f0;
            border-radius: 12px; background: #f8fafc; color: #334155; text-align: left;
            font-size: 0.95rem; font-weight: 600; cursor: pointer; display: flex; align-items: flex-start; gap: 12px;
            transition: all 0.2s ease;
        }
        html.dark .nr-opt-btn { background: rgba(30,41,59,0.6); border-color: #1e293b; color: #e2e8f0; }
        .nr-opt-btn:hover { border-color: #0ea5e9; background: #f0f9ff; }
        html.dark .nr-opt-btn:hover { border-color: #38bdf8; background: rgba(14,165,233,0.15); }
        .nr-grade-btn {
            flex: 1; padding: 13px 10px; border: none; border-radius: 14px; font-weight: 800; color: #fff;
            cursor: pointer; display: flex; flex-direction: column; align-items: center; justify-content: center;
            transition: transform 0.15s ease; box-shadow: 0 4px 15px rgba(0,0,0,0.25);
        }
        .nr-grade-btn:active { transform: scale(0.97); }
        .bm-flip-scene { perspective: 1000px; }
        .bm-flip-card {
            position: relative; width: 100%; display: grid;
            transition: transform 0.55s cubic-bezier(0.4, 0.2, 0.2, 1);
            transform-style: preserve-3d; -webkit-transform-style: preserve-3d;
        }
        .bm-flip-card.is-flipped { transform: rotateY(180deg); -webkit-transform: rotateY(180deg); }
        .bm-flip-front, .bm-flip-back { grid-area: 1 / 1; backface-visibility: hidden; -webkit-backface-visibility: hidden; }
        .bm-flip-back { transform: rotateY(180deg); -webkit-transform: rotateY(180deg); }
    </style>`);
}

function injectShellDOM() {
    if (document.getElementById("mpp-top-nav")) return;
    const isDark = document.documentElement.classList.contains("dark");

    document.body.insertAdjacentHTML("afterbegin", `
    <nav id="mpp-top-nav" class="fixed top-0 w-full z-50 border-b border-brand-100 dark:border-slate-800 bg-white/90 dark:bg-dark-bg/95 backdrop-blur-md transition-colors">
        <div class="w-full px-4 md:px-6 py-3 flex justify-between items-center max-w-7xl mx-auto">
            <div class="flex items-center gap-3 md:gap-4">
                <button type="button" onclick="window.userPanelApp.toggle()" class="p-2 -ml-2 rounded-xl hover:bg-brand-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors bg-transparent border-none cursor-pointer" title="Account &amp; Saved">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
                </button>
                <a href="index.html" class="flex items-center gap-3 group cursor-pointer no-underline">
                    <img class="w-9 h-9 md:w-10 md:h-10 rounded-xl shadow-lg object-cover ring-2 ring-offset-2 ring-accent-yellow transition-transform group-hover:scale-105" src="${APP_LOGO_URL}" referrerpolicy="no-referrer" alt="MBBS Profs Prep">
                    <div class="leading-tight">
                        <h1 class="font-bold text-base md:text-lg tracking-tight text-slate-900 dark:text-white m-0">MBBS <span class="text-brand-400">Profs Prep</span></h1>
                        <p class="text-[9px] md:text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mt-0.5 m-0">Central Portal</p>
                    </div>
                </a>
            </div>

            <div class="hidden md:block flex-1 max-w-md mx-8">
                <input id="globalSearch" type="text" oninput="window.MPPUI.handleGlobalSearch(this.value)" placeholder="Search Institute or Questions..." class="w-full px-4 py-2 bg-brand-50 dark:bg-dark-surface border border-brand-100 dark:border-slate-700 rounded-full focus:ring-2 focus:ring-brand-400 outline-none transition-all text-sm text-slate-900 dark:text-white placeholder-slate-400"/>
            </div>

            <div class="flex items-center gap-2 md:gap-3">
                <button id="nav-neuro-due-btn" type="button" onclick="window.neuroRecallApp.open('due')" class="hidden items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/15 hover:bg-amber-500/25 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-xs font-extrabold transition-all shadow-sm cursor-pointer">
                    <span>🧠</span><span><span id="nav-neuro-due-count">0</span> Due</span>
                </button>
                <button id="nav-admin-hub-btn" type="button" onclick="window.MPPAdmin?.openControlHub?.()" class="hidden items-center gap-1 px-2.5 py-1.5 rounded-full bg-sky-500/15 hover:bg-sky-500/25 text-sky-600 dark:text-sky-400 border border-sky-500/30 text-xs font-extrabold transition-all cursor-pointer" title="Admin Control Hub">
                    <span>⚙️</span><span class="hidden sm:inline">Admin</span>
                </button>
                <button type="button" onclick="window.MPPUI.toggleTheme()" class="w-10 h-10 rounded-full flex items-center justify-center hover:bg-brand-50 dark:hover:bg-white/10 text-xl transition-all bg-transparent border-none cursor-pointer" title="Toggle Theme">
                    <span id="theme-icon">${isDark ? "☀️" : "🌙"}</span>
                </button>
            </div>
        </div>
    </nav>

    <!-- ACCOUNT / PROFILE / BOOKMARKS SIDEBAR -->
    <aside id="user-panel-drawer" class="fixed top-0 left-0 h-full z-[10005] bg-white dark:bg-dark-surface shadow-2xl transform -translate-x-full transition-transform duration-300 flex flex-col border-r border-brand-100 dark:border-slate-800 w-full sm:w-[360px] lg:w-[400px]">
        <div class="px-4 py-4 border-b border-brand-100 dark:border-slate-800 flex justify-between items-center bg-brand-50 dark:bg-dark-bg shrink-0">
            <h2 class="font-bold text-lg text-slate-900 dark:text-white tracking-tight m-0">My Account</h2>
            <button type="button" onclick="window.userPanelApp.close()" class="p-2 rounded-lg text-slate-400 hover:bg-white dark:hover:bg-slate-800 hover:text-red-500 transition-colors bg-transparent border-none cursor-pointer">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
        </div>
        <div id="user-panel-body" class="flex-1 overflow-y-auto p-4 custom-scrollbar bg-slate-50 dark:bg-dark-bg"></div>
        <div id="user-panel-footer" class="p-4 border-t border-brand-100 dark:border-slate-800 bg-brand-50 dark:bg-dark-bg shrink-0"></div>
    </aside>
    <div id="user-panel-backdrop" onclick="window.userPanelApp.close()" class="fixed inset-0 z-[10004] bg-slate-900/60 backdrop-blur-sm opacity-0 pointer-events-none transition-opacity duration-300"></div>

    <!-- NEURO-RECALL FULLSCREEN FLASHCARDS -->
    <div id="neuro-recall-layer">
        <header class="px-4 md:px-6 pt-5 pb-3 flex justify-between items-center border-b border-slate-800 bg-slate-950/90 shrink-0">
            <div class="flex items-center gap-2.5">
                <span class="text-2xl">🧠</span>
                <div>
                    <h2 class="font-extrabold text-base md:text-lg text-white leading-none m-0">Neuro-Recall</h2>
                    <p class="text-[10px] text-sky-400 font-bold uppercase tracking-widest mt-1 m-0">Spaced Repetition Flashcards</p>
                </div>
            </div>
            <div class="flex items-center gap-2">
                <div id="nr-admin-header-toggle" class="hidden items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-700">
                    <span class="text-[10px] font-black text-amber-400 uppercase tracking-wider">Public</span>
                    <label class="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" id="nr-header-toggle-input" class="sr-only peer" onchange="window.MPPUI.toggleGlobalNeuroRecall()">
                        <div class="w-8 h-4 bg-slate-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-500"></div>
                    </label>
                </div>
                <button type="button" onclick="window.neuroRecallApp.promptExamDate()" class="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 cursor-pointer">
                    📅 <span id="nr-exam-days-label">90d to Exam</span>
                </button>
                <button type="button" onclick="window.neuroRecallApp.close()" class="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border-none cursor-pointer">
                    Exit ✕
                </button>
            </div>
        </header>

        <div class="px-4 pt-3 pb-2 max-w-3xl w-full mx-auto flex gap-2.5 shrink-0">
            <button id="nr-mode-due" type="button" onclick="window.neuroRecallApp.setMode('due')" class="flex-1 py-2.5 rounded-xl font-extrabold text-xs uppercase tracking-wider bg-sky-500 text-white border-none cursor-pointer">
                Due Today (<span id="nr-due-count">0</span>)
            </button>
            <button id="nr-mode-all" type="button" onclick="window.neuroRecallApp.setMode('all')" class="flex-1 py-2.5 rounded-xl font-extrabold text-xs uppercase tracking-wider bg-slate-800 text-slate-400 border-none cursor-pointer">
                Full Vault (<span id="nr-all-count">0</span>)
            </button>
        </div>

        <div id="nr-progress-section" class="px-4 py-1 max-w-3xl w-full mx-auto shrink-0">
            <div class="flex items-center gap-3">
                <span class="text-lg">⚡</span>
                <div class="h-2 flex-1 bg-slate-800 rounded-full overflow-hidden">
                    <div id="nr-prog-fill" class="h-full bg-gradient-to-r from-sky-500 to-cyan-300 w-0 transition-all duration-300"></div>
                </div>
                <span id="nr-prog-text" class="text-xs font-bold text-slate-400">0 / 0</span>
            </div>
        </div>

        <div id="nr-done-state" class="hidden flex-1 flex-col items-center justify-center text-center p-6 max-w-md mx-auto">
            <div class="w-24 h-24 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center text-4xl mb-5">⚡</div>
            <h3 id="nr-done-title" class="text-2xl font-black text-white mb-2">Synapses Strengthened!</h3>
            <p id="nr-done-desc" class="text-sm text-slate-400 leading-relaxed mb-6">All due flashcards completed for today.</p>
            <div class="flex flex-col sm:flex-row gap-3 w-full">
                <button type="button" onclick="window.neuroRecallApp.setMode('all')" class="flex-1 py-3.5 px-6 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-extrabold text-sm border-none cursor-pointer">Cram Full Vault</button>
                <button type="button" onclick="window.neuroRecallApp.close()" class="flex-1 py-3.5 px-6 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm border-none cursor-pointer">Return</button>
            </div>
        </div>

        <div id="nr-card-stage" class="flex-1 px-4 py-3 max-w-3xl w-full mx-auto flex flex-col min-h-0 nr-perspective">
            <div id="nr-flipper" class="nr-flipper flex-1">
                <div id="nr-card-front" class="nr-face custom-scrollbar"></div>
                <div id="nr-card-back" class="nr-face nr-face-back custom-scrollbar"></div>
            </div>
        </div>

        <footer id="nr-footer" class="px-4 py-3 pb-6 bg-slate-950/90 border-t border-slate-800 shrink-0">
            <div class="max-w-3xl mx-auto">
                <div id="nr-footer-prompt" class="text-center text-xs font-bold text-slate-400 py-2">Select an option or flip the card to test active recall.</div>
                <div id="nr-footer-wrong" class="hidden gap-3">
                    <button type="button" onclick="window.neuroRecallApp.grade(0)" class="nr-grade-btn bg-red-600">
                        <span class="text-sm">🔄 Review Later</span>
                        <span class="text-[10px] opacity-90 uppercase mt-0.5">Re-queue this session</span>
                    </button>
                </div>
                <div id="nr-footer-correct" class="hidden gap-2.5">
                    <button type="button" onclick="window.neuroRecallApp.grade(0)" class="nr-grade-btn bg-red-600">
                        <span class="text-xs md:text-sm">🔄 Again</span>
                        <span class="text-[10px] opacity-90 mt-0.5">Reset Step</span>
                    </button>
                    <button type="button" onclick="window.neuroRecallApp.grade(1)" class="nr-grade-btn bg-amber-500">
                        <span class="text-xs md:text-sm">🤔 Hard</span>
                        <span id="nr-time-guess" class="text-[10px] opacity-90 mt-0.5">+1d</span>
                    </button>
                    <button type="button" onclick="window.neuroRecallApp.grade(2)" class="nr-grade-btn bg-emerald-600">
                        <span class="text-xs md:text-sm">⚡ Nailed It</span>
                        <span id="nr-time-mastered" class="text-[10px] opacity-90 mt-0.5">+4d</span>
                    </button>
                </div>
            </div>
        </footer>
    </div>

    <!-- GLOBAL IMAGE LIGHTBOX -->
    <div id="mpp-image-lightbox" onclick="if(event.target===this) this.classList.add('hidden')" class="hidden fixed inset-0 z-[40000] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
        <button type="button" onclick="document.getElementById('mpp-image-lightbox').classList.add('hidden')" class="absolute top-5 right-5 w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 text-white text-xl font-bold flex items-center justify-center border-none cursor-pointer">✕</button>
        <img id="mpp-lightbox-img" src="" class="max-w-[95vw] max-h-[90vh] object-contain rounded-xl shadow-2xl" alt="Zoomed Image">
    </div>

    <!-- GLOBAL UTILITY MODAL -->
    <div id="mpp-action-modal" class="fixed inset-0 z-[38000] hidden overflow-y-auto">
        <div class="fixed inset-0 bg-slate-900/75 backdrop-blur-sm" onclick="window.MPPUI.closeModal()"></div>
        <div class="flex min-h-full items-center justify-center p-4">
            <div class="relative rounded-2xl bg-white dark:bg-dark-surface text-left shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div class="p-6 flex items-start gap-4">
                    <div id="mpp-modal-icon" class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900/30 text-xl"></div>
                    <div class="w-full min-w-0">
                        <h3 id="mpp-modal-title" class="text-lg font-bold text-slate-900 dark:text-white m-0"></h3>
                        <div id="mpp-modal-body" class="mt-2 text-sm text-slate-500 dark:text-slate-400"></div>
                    </div>
                </div>
                <div id="mpp-modal-footer" class="bg-slate-50 dark:bg-dark-bg px-6 py-3 flex justify-end gap-2"></div>
            </div>
        </div>
    </div>`);
}

// ============================================================================
// 2. LIGHTBOX, UTILITY MODAL & SECURE CHECKOUT
// ============================================================================
export function openImageLightbox(src) {
    if (!src) return;
    const lb = document.getElementById("mpp-image-lightbox");
    const img = document.getElementById("mpp-lightbox-img");
    if (lb && img) {
        img.src = src;
        lb.classList.remove("hidden");
    }
}

export function showModal(title, bodyHtml, footerHtml = "", iconHtml = "ℹ️") {
    const modal = document.getElementById("mpp-action-modal");
    if (!modal) return;
    document.getElementById("mpp-modal-title").textContent = title;
    document.getElementById("mpp-modal-body").innerHTML = bodyHtml;
    document.getElementById("mpp-modal-footer").innerHTML = footerHtml || `<button type="button" onclick="window.MPPUI.closeModal()" class="px-5 py-2 bg-slate-200 dark:bg-slate-800 rounded-xl font-bold text-xs text-slate-700 dark:text-slate-200 border-none cursor-pointer">Close</button>`;
    document.getElementById("mpp-modal-icon").innerHTML = iconHtml;
    modal.classList.remove("hidden");
}

export function closeModal() {
    document.getElementById("mpp-action-modal")?.classList.add("hidden");
}

export function openSecureCheckout(e) {
    if (e) e.preventDefault();
    const loader = document.createElement("div");
    loader.id = "secure-checkout-loader";
    loader.className = "fixed inset-0 z-[41000] bg-slate-900/90 backdrop-blur-md flex flex-col items-center justify-center text-center px-4";
    loader.innerHTML = `
        <div class="w-12 h-12 border-4 border-slate-700 border-t-brand-500 rounded-full animate-spin mb-5"></div>
        <h2 class="text-xl font-black text-white mb-2">Preparing Checkout</h2>
        <p class="text-slate-300 text-sm font-medium">Opening secure payment window...</p>`;
    document.body.appendChild(loader);

    const win = window.open("checkout.html", "_blank");
    if (!win) {
        loader.innerHTML = `
            <div class="w-12 h-12 bg-red-500/20 text-red-500 border border-red-500/50 rounded-full flex items-center justify-center text-xl mb-4">🛡️</div>
            <h2 class="text-xl font-black text-white mb-2">Popup Blocked</h2>
            <p class="text-slate-300 text-sm mb-6 max-w-sm">Your browser or adblocker blocked the checkout tab. You can open it directly below.</p>
            <div class="flex flex-col gap-2.5 w-full max-w-xs">
                <a href="checkout.html" class="w-full py-3 bg-brand-500 text-white font-bold rounded-xl no-underline">Open Checkout Here</a>
                <button type="button" onclick="document.getElementById('secure-checkout-loader').remove()" class="w-full py-3 bg-slate-800 text-slate-300 font-bold rounded-xl border-none cursor-pointer">Cancel</button>
            </div>`;
    } else {
        setTimeout(() => loader.remove(), 1800);
    }
}

function bindGlobalShellEvents() {
    document.addEventListener("click", (e) => {
        const checkoutLink = e.target.closest('a[href*="checkout.html"]');
        if (checkoutLink && !e.target.closest("#secure-checkout-loader")) {
            e.preventDefault();
            openSecureCheckout(e);
            return;
        }
        const img = e.target.closest(".markdown-body img, .nr-face img, .bm-flip-card img, .deck-card img, #qnaTable img");
        if (img && !img.closest(".tp-patti") && !img.closest(".mpp-media-card")) {
            e.stopPropagation();
            openImageLightbox(img.src);
        }
    });
}

// ============================================================================
// 3. NAVBAR BADGES & GLOBAL SEARCH
// ============================================================================
export function getDueBookmarksCount() {
    const now = Date.now();
    return Object.values(MPPStore.bookmarks || {}).filter(bm => bm && now >= (bm.next_review_date || 0)).length;
}

export function updateNavbarBadges() {
    const isAdmin = isUserAdmin();
    const totalSaved = Object.keys(MPPStore.bookmarks || {}).length;
    const dueCount = getDueBookmarksCount();

    const adminBtn = document.getElementById("nav-admin-hub-btn");
    if (adminBtn) {
        adminBtn.classList.toggle("hidden", !isAdmin);
        adminBtn.classList.toggle("flex", isAdmin);
    }

    const nrWrap = document.getElementById("nr-admin-header-toggle");
    const nrChk = document.getElementById("nr-header-toggle-input");
    if (nrWrap) {
        nrWrap.classList.toggle("hidden", !isAdmin);
        nrWrap.classList.toggle("flex", isAdmin);
    }
    if (nrChk) nrChk.checked = Boolean(MPPStore.featureFlags.showNeuroRecall);

    const dueBtn = document.getElementById("nav-neuro-due-btn");
    const dueLabel = document.getElementById("nav-neuro-due-count");
    if (dueBtn && dueLabel) {
        const show = Boolean(MPPStore.user && totalSaved > 0 && canAccessNeuroRecall());
        dueBtn.classList.toggle("hidden", !show);
        dueBtn.classList.toggle("flex", show);
        if (show) {
            dueLabel.textContent = String(dueCount > 0 ? dueCount : totalSaved);
            dueBtn.onclick = () => neuroRecallApp.open(dueCount > 0 ? "due" : "all");
        }
    }
}

export function handleGlobalSearch(query) {
    const localSearch = document.getElementById("searchInput");
    if (localSearch) {
        localSearch.value = query;
        localSearch.dispatchEvent(new Event("input", { bubbles: true }));
        return;
    }
    window.dispatchEvent(new CustomEvent("mpp:global-search", { detail: { query } }));
}

// ============================================================================
// 4. USER ACCOUNT / AUTH / BOOKMARKS SIDEBAR
// ============================================================================
export const userPanelApp = {
    isOpen: false,
    authMode: "login",
    viewMode: "menu",

    toggle() { this.isOpen ? this.close() : this.open(); },

    open(initialView = "menu") {
        this.isOpen = true;
        this.viewMode = initialView;
        this.renderState();
        document.getElementById("user-panel-drawer")?.classList.remove("-translate-x-full");
        document.getElementById("user-panel-backdrop")?.classList.remove("opacity-0", "pointer-events-none");
    },

    close() {
        this.isOpen = false;
        document.getElementById("user-panel-drawer")?.classList.add("-translate-x-full");
        document.getElementById("user-panel-backdrop")?.classList.add("opacity-0", "pointer-events-none");
    },

    setView(view) { this.viewMode = view; this.renderState(); },
    setAuthMode(mode) { this.authMode = mode; this.renderState(); },

    renderState() {
        const body = document.getElementById("user-panel-body");
        const footer = document.getElementById("user-panel-footer");
        if (!body || !footer) return;

        const legalHtml = `
            <div class="flex flex-wrap justify-center gap-x-3 gap-y-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wide w-full mb-2 mt-2">
                <a href="legal.html?page=about" class="hover:text-brand-500">About</a> •
                <a href="legal.html?page=contact" class="hover:text-brand-500">Contact</a> •
                <a href="legal.html?page=terms" class="hover:text-brand-500">Terms</a> •
                <a href="legal.html?page=privacy" class="hover:text-brand-500">Privacy</a> •
                <a href="legal.html?page=refunds" class="hover:text-brand-500">Refunds</a>
            </div>`;

        const user = MPPStore.user;
        const pData = MPPStore.profile || {};
        const status = MPPStore.userStatus;

        if (!user) {
            body.innerHTML = this.authMode === "login" ? renderLoginHTML() : renderRegisterHTML();
            footer.innerHTML = legalHtml;
            return;
        }

        const isAdmin = isUserAdmin();
        const canNeuro = canAccessNeuroRecall();
        const totalSaved = Object.keys(MPPStore.bookmarks || {}).length;
        const dueCount = getDueBookmarksCount();

        if (this.viewMode === "menu") {
            const name = escapeHtml(user.displayName || pData.fullName || "Student");
            const email = escapeHtml(user.email || "");
            const initial = (user.email || "U").charAt(0).toUpperCase();

            let badgeHtml = "", daysHtml = "";
            if (status.isVIP) {
                badgeHtml = `<span class="px-3 py-1 mt-3 bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 text-[10px] font-extrabold rounded-full uppercase border border-brand-200 dark:border-brand-800">${isAdmin ? "ADMIN • PRO ACCESS" : "PRO / VIP ACCESS"}</span>`;
                const fd = status.validUntil === "Lifetime Access" ? "Lifetime Access" : new Date(status.validUntil).toLocaleDateString("en-US");
                daysHtml = `<div class="w-full mt-4 p-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 flex flex-col items-center"><span class="text-2xl font-black text-green-600 dark:text-green-400">${status.daysLeft === 999 ? "∞" : status.daysLeft}</span><span class="text-xs font-bold text-slate-500 uppercase">Days Left</span><span class="text-[10px] text-slate-400 mt-0.5">Valid until ${escapeHtml(fd)}</span></div>`;
            } else if (status.expired) {
                badgeHtml = `<span class="px-3 py-1 mt-3 bg-red-100 dark:bg-red-900/30 text-red-600 text-[10px] font-extrabold rounded-full uppercase border border-red-200">EXPIRED</span>`;
                daysHtml = `<div class="w-full mt-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 text-center"><div class="text-xs font-bold text-red-600">Subscription ended ${Math.abs(status.daysLeft)} days ago.</div><button type="button" onclick="window.MPPUI.openSecureCheckout(event)" class="mt-2 text-xs font-bold bg-red-600 text-white px-3.5 py-1.5 rounded-lg border-none cursor-pointer">Renew Now</button></div>`;
            } else {
                badgeHtml = `<span class="px-3 py-1 mt-3 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-extrabold rounded-full uppercase">FREE PLAN</span>`;
                daysHtml = `<div class="w-full mt-4 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-center"><div class="text-xs font-bold text-blue-600 dark:text-blue-400">Membership Required for Full QBank</div><button type="button" onclick="window.MPPUI.openSecureCheckout(event)" class="mt-2 text-xs font-bold bg-brand-500 text-white px-3.5 py-1.5 rounded-lg border-none cursor-pointer">Unlock QBank</button></div>`;
            }

            const adminToggleHtml = isAdmin ? `
                <div class="p-3.5 bg-amber-50/80 dark:bg-slate-900 rounded-2xl border border-amber-200 dark:border-amber-800/60 flex items-center justify-between">
                    <div>
                        <div class="text-[10px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-widest">Admin: Neuro-Recall</div>
                        <div class="text-xs font-bold text-slate-600 dark:text-slate-300 mt-0.5">${MPPStore.featureFlags.showNeuroRecall ? "🟢 Visible to Students" : "🔒 Admin-Only"}</div>
                    </div>
                    <label class="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" class="sr-only peer" ${MPPStore.featureFlags.showNeuroRecall ? "checked" : ""} onchange="window.MPPUI.toggleGlobalNeuroRecall()">
                        <div class="w-10 h-5 bg-slate-300 dark:bg-slate-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                    </label>
                </div>` : "";

            const neuroCardHtml = canNeuro ? `
                <button type="button" onclick="window.neuroRecallApp.open('${dueCount > 0 ? "due" : "all"}')" class="w-full text-left flex items-center justify-between p-4 bg-gradient-to-r from-sky-500 to-brand-600 text-white rounded-2xl border-none cursor-pointer shadow-md">
                    <div class="flex items-center gap-3 font-extrabold text-sm">
                        <span class="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-xl">🧠</span>
                        <div><div>Neuro-Recall Flashcards</div><div class="text-[10px] font-semibold text-sky-100">${dueCount} Due • ${totalSaved} Saved</div></div>
                    </div>
                    <span class="text-xs font-bold bg-white/20 px-2.5 py-1 rounded-full">Go ❯</span>
                </button>` : "";

            body.innerHTML = `
                <div class="flex flex-col items-center p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 mb-5 shadow-sm">
                    <div class="w-16 h-16 rounded-full bg-brand-50 dark:bg-slate-800 flex items-center justify-center text-2xl font-black text-brand-600 dark:text-brand-400 mb-2 border border-brand-100 dark:border-slate-700">${initial}</div>
                    <h3 class="font-bold text-slate-900 dark:text-white text-sm truncate w-full text-center m-0">${name}</h3>
                    <p class="text-xs text-slate-500 truncate w-full text-center mt-1 m-0">${email}</p>
                    ${badgeHtml}${daysHtml}
                </div>
                <div class="flex flex-col gap-3">
                    ${adminToggleHtml}${neuroCardHtml}
                    <button type="button" onclick="window.userPanelApp.setView('bookmarks')" class="w-full flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-sm cursor-pointer">
                        <span class="flex items-center gap-3"><span class="text-xl">🔖</span> Bookmarks &amp; Saved (${totalSaved})</span><span class="text-slate-400 text-xs">❯</span>
                    </button>
                    <button type="button" onclick="window.userPanelApp.setView('edit_profile')" class="w-full flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-sm cursor-pointer">
                        <span class="flex items-center gap-3"><span class="text-xl">👤</span> My Profile</span><span class="text-slate-400 text-xs">❯</span>
                    </button>
                    <button type="button" onclick="window.MPPUI.openSecureCheckout(event)" class="w-full flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-sm cursor-pointer">
                        <span class="flex items-center gap-3"><span class="text-xl">💳</span> Subscription &amp; Billing</span><span class="text-slate-400 text-xs">❯</span>
                    </button>
                </div>`;
            footer.innerHTML = `${legalHtml}<button type="button" onclick="window.MPPUI.logout()" class="w-full py-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-bold text-sm border border-red-200 dark:border-red-800 cursor-pointer mt-1">Logout</button>`;

        } else if (this.viewMode === "bookmarks") {
            body.innerHTML = renderBookmarksViewHTML(canNeuro, dueCount, totalSaved);
            footer.innerHTML = "";
        } else if (this.viewMode === "edit_profile") {
            body.innerHTML = renderEditProfileHTML(pData);
            footer.innerHTML = "";
        }
    }
};

function renderLoginHTML() {
    return `
        <div class="flex flex-col items-center justify-center min-h-[70vh]">
            <img src="${APP_LOGO_URL}" referrerpolicy="no-referrer" class="w-16 h-16 rounded-2xl shadow-lg mb-5 object-cover" alt="Logo">
            <h3 class="text-2xl font-black text-slate-900 dark:text-white mb-1">Welcome Back</h3>
            <p class="text-xs text-slate-500 mb-5">Log in to sync your progress &amp; bookmarks.</p>
            <div id="auth-error-msg" class="hidden w-full text-xs p-3 rounded-xl mb-4 text-center font-bold border"></div>
            <div class="w-full space-y-3 mb-5 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
                <input type="email" id="login-email" placeholder="Email Address" class="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none dark:text-white text-sm"/>
                <div class="relative">
                    <input type="password" id="login-pass" placeholder="Password" onkeydown="if(event.key==='Enter') window.MPPUI.submitLogin(document.getElementById('btn-login-go'))" class="w-full pl-4 pr-10 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none dark:text-white text-sm"/>
                    <button type="button" onclick="window.MPPUI.togglePassVisibility('login-pass')" class="absolute right-3 top-3 text-slate-400 bg-transparent border-none cursor-pointer">👁️</button>
                </div>
                <div class="text-right"><button type="button" onclick="window.MPPUI.submitForgotPass()" class="text-[10px] font-bold text-brand-500 uppercase bg-transparent border-none cursor-pointer">Forgot Password?</button></div>
            </div>
            <button id="btn-login-go" type="button" onclick="window.MPPUI.submitLogin(this)" class="w-full py-3.5 rounded-xl text-sm font-bold bg-brand-500 hover:bg-brand-600 text-white border-none cursor-pointer shadow-lg">Sign In</button>
            <div class="text-center mt-5 text-xs text-slate-500">Don't have an account? <button type="button" onclick="window.userPanelApp.setAuthMode('register')" class="font-bold text-brand-500 bg-transparent border-none cursor-pointer underline">Create One</button></div>
        </div>`;
}

function renderRegisterHTML() {
    return `
        <div class="flex flex-col items-center pb-4">
            <img src="${APP_LOGO_URL}" referrerpolicy="no-referrer" class="w-14 h-14 rounded-2xl shadow-lg mb-3 object-cover mt-1" alt="Logo">
            <h3 class="text-xl font-black text-slate-900 dark:text-white mb-1">Create Global Profile</h3>
            <p class="text-xs text-slate-500 mb-4">Sync bookmarks &amp; progress across devices.</p>
            <div id="auth-error-msg" class="hidden w-full text-xs p-3 rounded-xl mb-3 text-center font-bold border"></div>
            <div class="w-full space-y-2.5 mb-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                <select id="reg-country" class="w-full px-3.5 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm dark:text-white"><option value="India" selected>India</option><option value="Other">Other</option></select>
                <input type="text" id="reg-name" placeholder="Full Name *" class="w-full px-3.5 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm dark:text-white"/>
                <input type="email" id="reg-email" placeholder="Email Address *" class="w-full px-3.5 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm dark:text-white"/>
                <input type="password" id="reg-pass" placeholder="Password (Min 6 chars) *" class="w-full px-3.5 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm dark:text-white"/>
                <div class="grid grid-cols-2 gap-2">
                    <select id="reg-join-year" class="w-full px-3 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm dark:text-white">
                        <option value="">Batch *</option><option value="2026 Batch">2026 Batch</option><option value="2025 Batch">2025 Batch</option>
                        <option value="2024 Batch">2024 Batch</option><option value="2023 Batch">2023 Batch</option><option value="2022 Batch">2022 Batch</option>
                        <option value="Intern">Intern</option><option value="JR/SR">JR / SR</option>
                    </select>
                    <input type="text" id="reg-college" placeholder="College Name *" class="w-full px-3 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm dark:text-white"/>
                </div>
                <div class="grid grid-cols-2 gap-2">
                    <input type="text" id="reg-city" placeholder="City" class="w-full px-3 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm dark:text-white"/>
                    <input type="tel" id="reg-phone" placeholder="Phone" class="w-full px-3 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm dark:text-white"/>
                </div>
            </div>
            <button type="button" onclick="window.MPPUI.submitSignUp(this)" class="w-full py-3.5 rounded-xl text-sm font-bold bg-green-600 hover:bg-green-700 text-white border-none cursor-pointer shadow-lg">Create Account</button>
            <div class="text-center mt-4 text-xs text-slate-500">Already registered? <button type="button" onclick="window.userPanelApp.setAuthMode('login')" class="font-bold text-brand-500 bg-transparent border-none cursor-pointer underline">Sign In</button></div>
        </div>`;
}

function renderEditProfileHTML(pData) {
    const yrs = ["2026 Batch", "2025 Batch", "2024 Batch", "2023 Batch", "2022 Batch", "2021 Batch (Intern)", "Post-Grad / JR"];
    const opts = yrs.map(y => `<option value="${y}" ${pData.joinYear === y ? "selected" : ""}>${y}</option>`).join("");
    return `
        <div>
            <button type="button" onclick="window.userPanelApp.setView('menu')" class="mb-4 text-sm font-bold text-slate-600 dark:text-slate-300 bg-transparent border-none cursor-pointer">← Back</button>
            <h3 class="text-xl font-black text-slate-900 dark:text-white mb-4">Edit Profile</h3>
            <div class="space-y-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                <div><label class="text-[10px] font-bold text-slate-500 uppercase">Full Name</label><input id="edit-name" value="${escapeHtml(pData.fullName || "")}" class="w-full mt-1 px-3.5 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm dark:text-white"/></div>
                <div><label class="text-[10px] font-bold text-slate-500 uppercase">College</label><input id="edit-college" value="${escapeHtml(pData.college || "")}" class="w-full mt-1 px-3.5 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm dark:text-white"/></div>
                <div><label class="text-[10px] font-bold text-slate-500 uppercase">Batch</label><select id="edit-join-year" class="w-full mt-1 px-3.5 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm dark:text-white"><option value="">Select</option>${opts}</select></div>
                <div class="grid grid-cols-2 gap-2">
                    <div><label class="text-[10px] font-bold text-slate-500 uppercase">City</label><input id="edit-city" value="${escapeHtml(pData.city || "")}" class="w-full mt-1 px-3 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm dark:text-white"/></div>
                    <div><label class="text-[10px] font-bold text-slate-500 uppercase">Phone</label><input id="edit-phone" value="${escapeHtml(pData.phone || "")}" class="w-full mt-1 px-3 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm dark:text-white"/></div>
                </div>
                <button type="button" onclick="window.MPPUI.submitProfileEdit(this)" class="w-full py-3.5 mt-2 rounded-xl text-sm font-bold bg-brand-500 text-white border-none cursor-pointer shadow-lg">Save Changes</button>
            </div>
        </div>`;
}

function renderBookmarksViewHTML(canNeuro, dueCount, totalSaved) {
    const entries = Object.entries(MPPStore.bookmarks || {}).sort((a, b) => new Date(b[1]?.timestamp || 0) - new Date(a[1]?.timestamp || 0));
    const header = `
        <button type="button" onclick="window.userPanelApp.setView('menu')" class="mb-3 text-sm font-bold text-slate-600 dark:text-slate-300 bg-transparent border-none cursor-pointer">← Back</button>
        <h3 class="text-xl font-black text-slate-900 dark:text-white mb-1">${canNeuro ? "Saved Flashcards" : "Saved Items"}</h3>`;

    if (entries.length === 0) {
        return `${header}<div class="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 mt-3"><div class="text-4xl mb-3">🔖</div><p class="text-sm font-bold text-slate-600 dark:text-slate-300">No saved questions yet.</p></div>`;
    }

    const launchBtn = canNeuro
        ? `<button type="button" onclick="window.neuroRecallApp.open('${dueCount > 0 ? "due" : "all"}')" class="w-full my-3 p-3.5 rounded-2xl bg-gradient-to-r from-sky-500 to-brand-600 text-white font-extrabold text-xs flex justify-between items-center border-none cursor-pointer shadow-md"><span>⚡ Launch Fullscreen Neuro-Recall</span><span class="bg-white/20 px-2 py-0.5 rounded-full">${dueCount} Due / ${totalSaved}</span></button>`
        : "";

    const cards = entries.map(([key, bm], idx) => {
        const stemHtml = formatInlineMathAndBold(bm.stemHtml || bm.text || "Saved Question");
        const safeUrl = escapeHtml(normalizeLegacyUrl(bm.url || "#"));
        const safeKey = escapeHtml(key);
        const cardId = `bm-card-${idx}`;

        if (!canNeuro) {
            return `
            <div class="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <div class="text-[10px] font-extrabold text-brand-600 dark:text-brand-400 uppercase mb-2">${escapeHtml(bm.subject || "QBank")}</div>
                <div class="text-sm font-bold text-slate-900 dark:text-white leading-relaxed">${stemHtml}</div>
                <div class="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                    <button type="button" onclick="window.MPPUI.removeBookmark('${safeKey}')" class="text-[10px] font-bold text-red-500 bg-transparent border-none cursor-pointer">🗑️ Remove</button>
                    <a href="${safeUrl}" class="text-xs font-bold text-brand-500 no-underline">Open ➝</a>
                </div>
            </div>`;
        }

        const step = bm.current_step || 1;
        const backAns = bm.type === "MCQ" && bm.ans_key
            ? `<div class="p-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-800 text-green-700 dark:text-green-300 font-bold text-xs mb-2">✅ Key: ${escapeHtml(bm.ans_key)}</div>`
            : "";
        const backExpl = bm.explanation
            ? `<div class="markdown-body text-xs">${renderContent(bm.explanation)}</div>`
            : `<p class="text-xs text-slate-400 italic">Open Fullscreen Neuro-Recall to load live notes.</p>`;

        return `
        <div class="bm-flip-scene">
            <div id="${cardId}" class="bm-flip-card">
                <div class="bm-flip-front p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div class="flex justify-between items-center gap-2 mb-2">
                        <span class="text-[10px] font-extrabold text-brand-600 dark:text-brand-400 uppercase truncate">${escapeHtml(bm.subject || "QBank")}</span>
                        <span class="text-[10px] font-extrabold px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-900/30 text-amber-600 shrink-0">⚡ Lvl ${step}</span>
                    </div>
                    <div class="text-sm font-bold text-slate-900 dark:text-white leading-relaxed">${stemHtml}</div>
                    <div class="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                        <button type="button" onclick="window.MPPUI.removeBookmark('${safeKey}')" class="text-[10px] font-bold text-red-500 bg-transparent border-none cursor-pointer">🗑️ Remove</button>
                        <button type="button" onclick="document.getElementById('${cardId}').classList.add('is-flipped')" class="text-xs font-extrabold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/20 px-3 py-1.5 rounded-xl border border-brand-200 dark:border-brand-800 cursor-pointer">🔄 Flip</button>
                    </div>
                </div>
                <div class="bm-flip-back p-4 bg-white dark:bg-slate-900 rounded-2xl border-2 border-brand-400 shadow-md">
                    <div class="flex justify-between items-center mb-2 pb-1.5 border-b border-slate-100 dark:border-slate-800">
                        <span class="text-[10px] font-black text-brand-500 uppercase">Back (${escapeHtml(bm.q || "")})</span>
                        <button type="button" onclick="document.getElementById('${cardId}').classList.remove('is-flipped')" class="text-xs font-bold text-slate-400 bg-transparent border-none cursor-pointer">✕ Flip Back</button>
                    </div>
                    ${backAns}${backExpl}
                    <div class="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-right">
                        <a href="${safeUrl}" class="text-xs font-bold text-brand-500 no-underline">Open Source ➝</a>
                    </div>
                </div>
            </div>
        </div>`;
    }).join("");

    return `${header}${launchBtn}<div class="space-y-4 mt-2 pb-10">${cards}</div>`;
}

// ============================================================================
// 5. NEURO-RECALL SPACED REPETITION ENGINE
// ============================================================================
function getDaysToExam() {
    const s = localStorage.getItem("mbbs_target_date");
    if (s) {
        const diff = Math.ceil((new Date(s).getTime() - Date.now()) / 86400000);
        if (!isNaN(diff) && diff >= 1) return diff;
    }
    return 90;
}

export const neuroRecallApp = {
    isOpen: false,
    isCramMode: false,
    queue: [],
    totalInSession: 0,
    sessionAnswered: new Set(),
    currentItem: null,
    calcGuessDays: 1,
    calcMasteredDays: 4,

    open(mode = "due") {
        if (!MPPStore.user) { userPanelApp.open(); userPanelApp.setAuthMode("login"); return; }
        if (!canAccessNeuroRecall()) {
            showModal("Coming Soon", "<p>Neuro-Recall Flashcards will be unlocked soon!</p>", "", "🧠");
            return;
        }
        const total = Object.keys(MPPStore.bookmarks || {}).length;
        const due = getDueBookmarksCount();
        this.isCramMode = (mode === "all") || (mode === "due" && due === 0 && total > 0);
        if (userPanelApp.isOpen) userPanelApp.close();

        this.isOpen = true;
        this.sessionAnswered.clear();
        document.getElementById("neuro-recall-layer")?.classList.add("active");
        updateNavbarBadges();
        this.updateExamDaysUI();
        this.syncModeButtons();
        this.buildQueue();
    },

    close() {
        this.isOpen = false;
        document.getElementById("neuro-recall-layer")?.classList.remove("active");
        updateNavbarBadges();
    },

    promptExamDate() {
        const cur = localStorage.getItem("mbbs_target_date") || new Date(Date.now() + 90 * 86400000).toISOString().split("T")[0];
        const inp = prompt("Target Professional Exam Date (YYYY-MM-DD):", cur);
        if (inp && /^\d{4}-\d{2}-\d{2}$/.test(inp.trim())) {
            localStorage.setItem("mbbs_target_date", inp.trim());
            this.updateExamDaysUI();
            if (this.currentItem) this.renderCard();
        }
    },

    updateExamDaysUI() {
        const el = document.getElementById("nr-exam-days-label");
        if (el) el.textContent = `${getDaysToExam()}d to Exam`;
    },

    setMode(mode) {
        this.isCramMode = mode === "all";
        this.sessionAnswered.clear();
        this.syncModeButtons();
        this.buildQueue();
    },

    syncModeButtons() {
        const bDue = document.getElementById("nr-mode-due");
        const bAll = document.getElementById("nr-mode-all");
        if (!bDue || !bAll) return;
        const on = "flex-1 py-2.5 rounded-xl font-extrabold text-xs uppercase tracking-wider bg-sky-500 text-white border-none cursor-pointer shadow-lg";
        const off = "flex-1 py-2.5 rounded-xl font-extrabold text-xs uppercase tracking-wider bg-slate-800 text-slate-400 border-none cursor-pointer";
        bDue.className = this.isCramMode ? off : on;
        bAll.className = this.isCramMode ? on : off;
    },

    buildQueue() {
        const entries = Object.entries(MPPStore.bookmarks || {});
        const now = Date.now();
        let strictlyDue = 0;
        const list = [];

        entries.forEach(([key, bm]) => {
            if (!bm) return;
            const isDue = now >= (bm.next_review_date || 0);
            if (isDue) strictlyDue++;
            if (this.sessionAnswered.has(key)) return;
            if (this.isCramMode || isDue) list.push({ key, data: { ...bm, current_step: bm.current_step || 1 } });
        });

        document.getElementById("nr-due-count").textContent = String(strictlyDue);
        document.getElementById("nr-all-count").textContent = String(entries.length);

        list.sort((a, b) => this.isCramMode
            ? (a.data.current_step - b.data.current_step)
            : ((a.data.next_review_date || 0) - (b.data.next_review_date || 0)));

        this.queue = list;
        this.totalInSession = list.length;

        if (list.length === 0) {
            this.showDoneState(entries.length === 0);
        } else {
            document.getElementById("nr-done-state").classList.add("hidden");
            document.getElementById("nr-done-state").classList.remove("flex");
            document.getElementById("nr-card-stage").classList.remove("hidden");
            document.getElementById("nr-footer").classList.remove("hidden");
            document.getElementById("nr-progress-section").classList.remove("hidden");
            this.loadNextCard();
        }
    },

    showDoneState(empty) {
        document.getElementById("nr-card-stage").classList.add("hidden");
        document.getElementById("nr-footer").classList.add("hidden");
        document.getElementById("nr-progress-section").classList.add("hidden");
        const done = document.getElementById("nr-done-state");
        done.classList.remove("hidden");
        done.classList.add("flex");
        document.getElementById("nr-done-title").textContent = empty ? "Your Neuro-Vault is Empty" : "Synapses Strengthened!";
        document.getElementById("nr-done-desc").textContent = empty
            ? "Bookmark any MCQ, Theory Question, or Clinical Case to build your flashcard deck."
            : "All due cards finished! Tap 'Cram Full Vault' to review ahead of schedule.";
    },

    loadNextCard() {
        if (!this.queue.length) return this.showDoneState(false);
        document.getElementById("nr-flipper")?.classList.remove("is-flipped");
        const done = this.totalInSession - this.queue.length;
        const pct = this.totalInSession ? Math.round((done / this.totalInSession) * 100) : 0;
        document.getElementById("nr-prog-text").textContent = `${done} / ${this.totalInSession}`;
        document.getElementById("nr-prog-fill").style.width = `${pct}%`;
        this.currentItem = this.queue[0];
        this.renderCard();
    },

    renderCard() {
        const bm = this.currentItem.data;
        const step = bm.current_step || 1;
        this.calcGuessDays = Math.max(1, Math.round(step * 1.5));
        this.calcMasteredDays = Math.max(3, Math.round(getDaysToExam() * 0.15 * step));
        document.getElementById("nr-time-guess").textContent = `+${this.calcGuessDays}d`;
        document.getElementById("nr-time-mastered").textContent = `+${this.calcMasteredDays}d`;

        document.getElementById("nr-footer-prompt").classList.remove("hidden");
        document.getElementById("nr-footer-wrong").classList.add("hidden");
        document.getElementById("nr-footer-wrong").classList.remove("flex");
        document.getElementById("nr-footer-correct").classList.add("hidden");
        document.getElementById("nr-footer-correct").classList.remove("flex");

        const stem = formatInlineMathAndBold(bm.stemHtml || bm.text || "Saved Question");
        const isMCQ = bm.type === "MCQ" && Array.isArray(bm.options) && bm.options.length > 0;

        const interaction = isMCQ
            ? `<div class="mt-4">${bm.options.map((o, i) => {
                const l = String.fromCharCode(65 + i);
                return `<button type="button" onclick="window.neuroRecallApp.selectMCQ('${l}')" class="nr-opt-btn"><span class="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 font-extrabold text-xs flex items-center justify-center shrink-0">${l}</span><span>${formatInlineMathAndBold(o)}</span></button>`;
            }).join("")}</div>`
            : `<div class="mt-auto pt-6"><button type="button" onclick="window.neuroRecallApp.flipTheory()" class="w-full py-4 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-extrabold text-sm uppercase border-none cursor-pointer shadow-lg">👁️ Flip Card &amp; Reveal Answer</button></div>`;

        const front = document.getElementById("nr-card-front");
        front.innerHTML = `
            <div class="flex justify-between items-center gap-2 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                <span class="text-[11px] font-extrabold uppercase text-sky-600 dark:text-sky-400 truncate">${escapeHtml(bm.subject || "Saved")} (${escapeHtml(bm.q || "")})</span>
                <span class="text-[11px] font-extrabold text-amber-600 bg-amber-50 dark:bg-amber-900/30 px-2.5 py-1 rounded-lg shrink-0">⚡ Lvl ${step}</span>
            </div>
            <div class="text-base md:text-lg font-bold leading-relaxed">${stem}</div>
            ${bm.img ? `<img src="${escapeHtml(bm.img)}" class="max-h-60 rounded-xl mx-auto my-3" alt="Question Image">` : ""}
            ${interaction}`;
        front.scrollTop = 0;
    },

    async selectMCQ(picked) {
        const bm = this.currentItem.data;
        const correct = String(bm.ans_key || "A").trim().toUpperCase();
        const isRight = picked === correct;
        const banner = isRight
            ? `<div class="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/25 border border-emerald-300 text-emerald-700 dark:text-emerald-300 font-extrabold text-sm mb-3">✅ Correct!</div>`
            : `<div class="p-3.5 rounded-xl bg-red-50 dark:bg-red-900/25 border border-red-300 text-red-700 dark:text-red-300 font-extrabold text-sm mb-3">❌ Incorrect (Picked ${picked}; Key: ${correct})</div>`;
        await this.populateBack(bm, banner);
        document.getElementById("nr-flipper").classList.add("is-flipped");
        document.getElementById("nr-footer-prompt").classList.add("hidden");
        const target = document.getElementById(isRight ? "nr-footer-correct" : "nr-footer-wrong");
        target.classList.remove("hidden"); target.classList.add("flex");
    },

    async flipTheory() {
        await this.populateBack(this.currentItem.data, `<div class="p-3 rounded-xl bg-sky-50 dark:bg-sky-900/25 border border-sky-200 text-sky-700 dark:text-sky-300 font-extrabold text-xs uppercase mb-3">📝 Model Answer — Self-Grade Below</div>`);
        document.getElementById("nr-flipper").classList.add("is-flipped");
        document.getElementById("nr-footer-prompt").classList.add("hidden");
        const c = document.getElementById("nr-footer-correct");
        c.classList.remove("hidden"); c.classList.add("flex");
    },

    async populateBack(bm, bannerHtml) {
        const back = document.getElementById("nr-card-back");
        back.innerHTML = `
            ${bannerHtml}
            ${bm.ans_image ? `<img src="${escapeHtml(bm.ans_image)}" class="max-h-64 rounded-xl mx-auto mb-3" alt="Answer Card">` : ""}
            <div id="nr-back-expl" class="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border-l-4 border-sky-500 text-sm flex-1 markdown-body">Loading explanation...</div>
            <div class="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between gap-2">
                <button type="button" onclick="document.getElementById('nr-flipper').classList.remove('is-flipped')" class="px-3.5 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold border-none cursor-pointer">🔙 Question</button>
                <button type="button" onclick="window.neuroRecallApp.askAI()" class="px-3.5 py-2 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-xs font-bold border border-emerald-500/30 cursor-pointer">🤖 Copy for ChatGPT</button>
            </div>`;
        back.scrollTop = 0;

        let expl = bm.explanation || "";
        if (!expl && bm.collegeCode && bm.subjectCode && bm.q) {
            const isClin = String(bm.subject || "").includes("Clinical");
            const path = isClin
                ? `clinical_data/${bm.collegeCode}/${bm.subjectCode}/${bm.q}/answer`
                : `answers/${bm.collegeCode}/${bm.subjectCode}/${bm.q}/text`;
            const snap = await get(ref(db, path)).catch(() => null);
            if (snap && snap.exists()) expl = snap.val();
        }
        const box = document.getElementById("nr-back-expl");
        if (box) box.innerHTML = expl ? renderContent(expl) : `<em class="text-slate-400 text-xs">No saved explanation yet. Tap Copy for ChatGPT below.</em>`;
    },

    askAI() {
        const bm = this.currentItem?.data;
        if (!bm) return;
        const promptText = `MBBS Prof Exam explanation needed for:\n\nQ: ${bm.text}` + (bm.options ? `\nOptions:\n${bm.options.map((o, i) => `${String.fromCharCode(65 + i)}) ${o}`).join("\n")}\nKey: ${bm.ans_key}` : "");
        navigator.clipboard?.writeText(promptText).then(() => window.open("https://chatgpt.com/", "_blank"));
    },

    async grade(code) {
        if (!this.currentItem || !MPPStore.user) return;
        const { key, data } = this.currentItem;
        let step = data.current_step || 1;
        let days = 0;
        if (code === 0) { step = 1; days = 0; }
        else if (code === 1) { step += 1; days = this.calcGuessDays; }
        else { step += 2; days = this.calcMasteredDays; }

        const nextRev = Date.now() + days * 86400000;
        const shifted = this.queue.shift();
        data.current_step = step;
        data.next_review_date = nextRev;

        if (code === 0) this.queue.push(shifted);
        else this.sessionAnswered.add(key);

        await updateBookmarkSRS(key, step, nextRev).catch(console.error);
        updateNavbarBadges();
        this.loadNextCard();
    }
};

function registerServiceWorker() {
    if ("serviceWorker" in navigator) {
        window.addEventListener("load", () => {
            navigator.serviceWorker.register("./sw.js").then(r => r.update().catch(() => {})).catch(() => {});
        });
    }
}

// ============================================================================
// 6. AUTH FORM HANDLERS & WINDOW BINDINGS
// ============================================================================
function showAuthMsg(msg, isSuccess = false) {
    const el = document.getElementById("auth-error-msg");
    if (!el) return alert(msg);
    el.textContent = msg;
    el.className = isSuccess
        ? "w-full bg-green-50 text-green-700 border border-green-200 text-xs p-3 rounded-xl mb-4 text-center font-bold"
        : "w-full bg-red-50 text-red-600 border border-red-200 text-xs p-3 rounded-xl mb-4 text-center font-bold";
}

window.userPanelApp = userPanelApp;
window.neuroRecallApp = neuroRecallApp;
window.openImageLightbox = openImageLightbox;
window.openNrLightbox = openImageLightbox;

window.MPPUI = {
    toggleTheme,
    showModal,
    closeModal,
    openSecureCheckout,
    handleGlobalSearch,

    togglePassVisibility(id) {
        const inp = document.getElementById(id);
        if (inp) inp.type = inp.type === "password" ? "text" : "password";
    },

    async submitLogin(btn) {
        const email = document.getElementById("login-email")?.value || "";
        const pass = document.getElementById("login-pass")?.value || "";
        if (!email || !pass) return showAuthMsg("Email and password are required.");
        const orig = btn.textContent;
        btn.disabled = true; btn.textContent = "Verifying...";
        try {
            await loginWithEmail(email, pass);
        } catch (err) {
            btn.disabled = false; btn.textContent = orig;
            showAuthMsg(err.message);
        }
    },

    async submitSignUp(btn) {
        const payload = {
            fullName: document.getElementById("reg-name")?.value || "",
            email: document.getElementById("reg-email")?.value || "",
            password: document.getElementById("reg-pass")?.value || "",
            joinYear: document.getElementById("reg-join-year")?.value || "",
            college: document.getElementById("reg-college")?.value || "",
            country: document.getElementById("reg-country")?.value || "India",
            city: document.getElementById("reg-city")?.value || "",
            phone: document.getElementById("reg-phone")?.value || ""
        };
        if (!payload.fullName || !payload.email || !payload.password || !payload.joinYear || !payload.college) {
            return showAuthMsg("Please fill all required (*) fields.");
        }
        if (payload.password.length < 6) return showAuthMsg("Password must be at least 6 characters.");
        const orig = btn.textContent;
        btn.disabled = true; btn.textContent = "Creating...";
        try {
            await signUpWithEmail(payload);
        } catch (err) {
            btn.disabled = false; btn.textContent = orig;
            showAuthMsg(err.message);
        }
    },

    async submitForgotPass() {
        const email = document.getElementById("login-email")?.value || "";
        if (!email) return showAuthMsg("Enter your email address first.");
        try {
            await sendResetEmail(email);
            showAuthMsg("Reset link sent! Check your inbox.", true);
        } catch (err) {
            showAuthMsg(err.code === "auth/user-not-found" ? "Email not registered. Please create an account." : err.message);
        }
    },

    async submitProfileEdit(btn) {
        const fullName = document.getElementById("edit-name")?.value?.trim();
        if (!fullName) return alert("Name is required.");
        const orig = btn.textContent;
        btn.disabled = true; btn.textContent = "Saving...";
        try {
            await updateUserProfile({
                fullName,
                joinYear: document.getElementById("edit-join-year")?.value || "",
                college: document.getElementById("edit-college")?.value?.trim() || "",
                city: document.getElementById("edit-city")?.value?.trim() || "",
                phone: document.getElementById("edit-phone")?.value?.trim() || ""
            });
            btn.textContent = "Saved! ✅";
            setTimeout(() => { btn.textContent = orig; btn.disabled = false; userPanelApp.setView("menu"); }, 800);
        } catch (e) {
            alert(e.message);
            btn.textContent = orig; btn.disabled = false;
        }
    },

    async removeBookmark(key) {
        if (!confirm("Remove this saved item?")) return;
        await deleteBookmarkByKey(key);
    },

    async toggleGlobalNeuroRecall() {
        if (!isUserAdmin()) return;
        await set(ref(db, "settings/global/showNeuroRecall"), !MPPStore.featureFlags.showNeuroRecall);
    },

    logout: logoutUser
};
