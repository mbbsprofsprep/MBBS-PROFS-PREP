// ============================================================================
// js/ui-shell.js (Phase 2A — Exact Old UI + Android Back Stack + Full Bookmarks/Neuro-Recall)
// Shared Shell for index.html, review.html, and clinical.html
// ============================================================================
import {
    MPPStore,
    APP_LOGO_URL,
    isUserAdmin,
    canAccessNeuroRecall,
    onStoreChange,
    loginWithEmail,
    signUpWithEmail,
    sendResetEmail,
    logoutUser,
    updateUserProfile,
    deleteBookmarkByKey,
    updateBookmarkSRS
} from "./core-firebase.js";
import { clearLocalBankCache } from "./data-adapter.js";
import * as ContentRenderer from "./content-renderer.js";

// Safe Rich Renderer Helper (Works regardless of content-renderer export naming)
function renderRichText(raw) {
    if (!raw) return "";
    const fn = ContentRenderer.renderRichContent || ContentRenderer.renderMarkdown || ContentRenderer.formatRichText;
    if (typeof fn === "function") {
        try { return fn(String(raw)); } catch (_) {}
    }
    return escapeHtml(String(raw)).replace(/\n/g, "<br>");
}

export function escapeHtml(str) {
    return String(str ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

// ============================================================================
// 1. ANDROID HARDWARE / GESTURE BACK BUTTON OVERLAY STACK (popstate)
// ============================================================================
const _overlayStack = [];
let _ignorePopCount = 0;

export function pushOverlayHistory(key, onCloseCallback) {
    const idx = _overlayStack.findIndex(o => o.key === key);
    if (idx !== -1) _overlayStack.splice(idx, 1);
    _overlayStack.push({ key, onClose: onCloseCallback });
    try {
        window.history.pushState({ mppOverlay: key, ts: Date.now() }, "");
    } catch (_) {}
}

export function popOverlayHistory(key, fromPopState = false) {
    const idx = _overlayStack.findIndex(o => o.key === key);
    if (idx === -1) return;
    const isTop = idx === _overlayStack.length - 1;
    _overlayStack.splice(idx, 1);

    if (!fromPopState && isTop && window.history.state?.mppOverlay === key) {
        _ignorePopCount++;
        try { window.history.back(); } catch (_) { _ignorePopCount = Math.max(0, _ignorePopCount - 1); }
    }
}

window.addEventListener("popstate", () => {
    if (_ignorePopCount > 0) {
        _ignorePopCount--;
        return;
    }
    if (_overlayStack.length > 0) {
        const top = _overlayStack.pop();
        if (top && typeof top.onClose === "function") {
            try { top.onClose(true); } catch (e) { console.error("[popstate]", e); }
        }
    }
});

// ============================================================================
// 2. TOASTS & UNIVERSAL MODAL SYSTEM (Zero Native alert/prompt in Student Flows)
// ============================================================================
export function showToast(message, type = "info", duration = 3000) {
    let root = document.getElementById("mpp-toast-root");
    if (!root) {
        root = document.createElement("div");
        root.id = "mpp-toast-root";
        root.className = "fixed bottom-5 left-1/2 -translate-x-1/2 z-[6000] flex flex-col items-center gap-2 pointer-events-none w-[92vw] max-w-md";
        document.body.appendChild(root);
    }
    const palette = {
        success: "bg-emerald-600 text-white border-emerald-500",
        error: "bg-red-600 text-white border-red-500",
        warning: "bg-amber-500 text-slate-950 border-amber-400",
        info: "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-700 dark:border-slate-300"
    };
    const el = document.createElement("div");
    el.className = `pointer-events-auto px-4 py-2.5 rounded-xl shadow-xl border text-xs sm:text-sm font-bold animate-fade-in ${palette[type] || palette.info}`;
    el.textContent = String(message || "");
    root.appendChild(el);
    setTimeout(() => {
        el.style.opacity = "0";
        el.style.transition = "opacity 0.25s ease";
        setTimeout(() => el.remove(), 260);
    }, duration);
}

const _activeModals = new Map();

export function showModal(arg1, arg2 = null) {
    let opts = {};
    if (typeof arg1 === "string") {
        opts = { title: arg1, bodyHtml: typeof arg2 === "string" ? arg2 : "" };
    } else if (arg1 && typeof arg1 === "object") {
        opts = arg1;
    }

    const id = opts.id || `mpp-modal-${Date.now()}`;
    const sizeMap = {
        sm: "max-w-md",
        md: "max-w-xl",
        lg: "max-w-3xl",
        xl: "max-w-5xl",
        full: "max-w-6xl"
    };
    const maxW = sizeMap[opts.size || "md"] || "max-w-xl";

    closeModal(id, true);

    let root = document.getElementById("mpp-modal-root");
    if (!root) {
        root = document.createElement("div");
        root.id = "mpp-modal-root";
        document.body.appendChild(root);
    }

    const wrap = document.createElement("div");
    wrap.id = id;
    wrap.className = "fixed inset-0 z-[4500] bg-slate-950/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in";
    wrap.innerHTML = `
        <div class="w-full ${maxW} max-h-[92dvh] bg-white dark:bg-dark-900 rounded-t-2xl sm:rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden" style="padding-bottom: env(safe-area-inset-bottom, 0px);">
            <div class="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
                <h3 class="font-display text-base sm:text-lg font-extrabold text-slate-900 dark:text-white truncate">${opts.title || ""}</h3>
                <button type="button" data-close-modal="${id}" aria-label="Close" class="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-dark-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-xl leading-none">&times;</button>
            </div>
            <div class="p-5 overflow-y-auto flex-1 text-sm text-slate-700 dark:text-slate-200">${opts.bodyHtml || ""}</div>
            ${opts.footerHtml ? `<div class="px-5 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-dark-800/40 flex items-center justify-end gap-2 flex-shrink-0">${opts.footerHtml}</div>` : ""}
        </div>
    `;

    wrap.addEventListener("click", (e) => {
        if (e.target === wrap || e.target.closest(`[data-close-modal="${id}"]`)) {
            closeModal(id);
        }
    });

    root.appendChild(wrap);
    _activeModals.set(id, { el: wrap, onClose: opts.onClose });
    pushOverlayHistory(`modal:${id}`, (fromPop) => closeModal(id, fromPop));
    return wrap;
}

export function closeModal(id = null, fromPopState = false) {
    if (!id) {
        const lastKey = [..._activeModals.keys()].pop();
        if (lastKey) closeModal(lastKey, fromPopState);
        return;
    }
    const entry = _activeModals.get(id);
    if (!entry) return;
    _activeModals.delete(id);
    entry.el.remove();
    popOverlayHistory(`modal:${id}`, fromPopState);
    if (typeof entry.onClose === "function") {
        try { entry.onClose(); } catch (_) {}
    }
}

export function showConfirmModal({ title = "Confirm", message = "", confirmText = "Confirm", cancelText = "Cancel", danger = false } = {}) {
    return new Promise((resolve) => {
        let settled = false;
        const finish = (val) => {
            if (settled) return;
            settled = true;
            closeModal("mpp-confirm-modal");
            resolve(val);
        };
        const modal = showModal({
            id: "mpp-confirm-modal",
            size: "sm",
            title,
            bodyHtml: `<p class="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">${escapeHtml(message)}</p>`,
            footerHtml: `
                <button id="mpp-confirm-cancel" type="button" class="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-dark-800 text-slate-700 dark:text-slate-200">${escapeHtml(cancelText)}</button>
                <button id="mpp-confirm-ok" type="button" class="px-4 py-2 rounded-xl text-xs font-bold text-white ${danger ? "bg-red-600 hover:bg-red-700" : "bg-brand-600 hover:bg-brand-700"}">${escapeHtml(confirmText)}</button>
            `,
            onClose: () => { if (!settled) { settled = true; resolve(false); } }
        });
        modal.querySelector("#mpp-confirm-cancel")?.addEventListener("click", () => finish(false));
        modal.querySelector("#mpp-confirm-ok")?.addEventListener("click", () => finish(true));
    });
}

// Universal Lightbox with Android Back Support
export function openImageLightbox(url, caption = "") {
    if (!url) return;
    const id = "mpp-lightbox-overlay";
    document.getElementById(id)?.remove();
    const el = document.createElement("div");
    el.id = id;
    el.className = "fixed inset-0 z-[5500] bg-black/95 flex flex-col items-center justify-center p-4 animate-fade-in";
    el.innerHTML = `
        <button type="button" id="mpp-lb-close" aria-label="Close image" class="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 text-white text-2xl flex items-center justify-center">&times;</button>
        <img src="${escapeHtml(url)}" alt="${escapeHtml(caption || "Figure")}" class="max-w-full max-h-[82dvh] object-contain rounded-lg shadow-2xl" />
        ${caption ? `<p class="mt-3 text-xs sm:text-sm text-slate-300 text-center max-w-2xl">${escapeHtml(caption)}</p>` : ""}
    `;
    const closeLb = (fromPop = false) => {
        el.remove();
        popOverlayHistory("lightbox", fromPop);
    };
    el.addEventListener("click", (e) => {
        if (e.target === el || e.target.id === "mpp-lb-close") closeLb(false);
    });
    document.body.appendChild(el);
    pushOverlayHistory("lightbox", closeLb);
}

// ============================================================================
// 3. ANDROID-SAFE EXTERNAL BROWSER CHECKOUT (Preserves UPI GPay/PhonePe Intents)
// ============================================================================
export function openSecureCheckout() {
    const user = MPPStore.user;
    const params = new URLSearchParams();
    if (user?.email) params.set("email", user.email);
    if (user?.uid) params.set("uid", user.uid);
    const targetUrl = `checkout.html${params.toString() ? "?" + params.toString() : ""}`;
    const ua = navigator.userAgent || "";
    const isAndroidWebView = /; wv\)/i.test(ua) || /\bAndroid\b.*Version\/\d+/i.test(ua);

    if (isAndroidWebView) {
        const opened = window.open(targetUrl, "_blank", "noopener");
        if (!opened) window.location.href = targetUrl;
    } else {
        window.location.href = targetUrl;
    }
}

// ============================================================================
// 4. THEME TOGGLE, ANNOUNCEMENT BANNER & NAVBAR
// ============================================================================
export function toggleDarkMode() {
    const isDark = document.documentElement.classList.toggle("dark");
    localStorage.setItem("mpp_theme", isDark ? "dark" : "light");
    renderNavbar();
}

function renderAnnouncementBanner() {
    const root = document.getElementById("mpp-banner-root");
    if (!root) return;
    const cfg = MPPStore.appConfig || {};
    if (!cfg.bannerActive || !cfg.bannerText?.trim()) {
        root.innerHTML = "";
        return;
    }
    const dismissKey = "mpp_banner_dismissed_" + cfg.bannerText.trim().slice(0, 32);
    if (localStorage.getItem(dismissKey) === "1") {
        root.innerHTML = "";
        return;
    }
    root.innerHTML = `
        <div class="fixed top-0 left-0 right-0 z-[1100] bg-gradient-to-r from-brand-600 via-sky-600 to-indigo-600 text-white text-xs font-bold px-4 py-2 flex items-center justify-center gap-3 shadow-md">
            <span class="truncate text-center">${escapeHtml(cfg.bannerText)}</span>
            <button id="mpp-banner-dismiss" type="button" aria-label="Dismiss announcement" class="text-white/80 hover:text-white text-base leading-none flex-shrink-0">&times;</button>
        </div>
    `;
    root.querySelector("#mpp-banner-dismiss")?.addEventListener("click", () => {
        localStorage.setItem(dismissKey, "1");
        root.innerHTML = "";
    });
}

function renderNavbar() {
    const root = document.getElementById("mpp-navbar-root");
    if (!root) return;

    const user = MPPStore.user;
    const isAdmin = MPPStore.isAdmin;
    const bmkCount = Object.keys(MPPStore.bookmarks || {}).length;
    const isDark = document.documentElement.classList.contains("dark");
    const displayName = MPPStore.profile?.fullName || user?.displayName || (user?.email ? user.email.split("@")[0] : "");
    const hasBanner = Boolean(MPPStore.appConfig?.bannerActive && MPPStore.appConfig?.bannerText && localStorage.getItem("mpp_banner_dismissed_" + MPPStore.appConfig.bannerText.trim().slice(0, 32)) !== "1");

    root.innerHTML = `
        <nav class="fixed ${hasBanner ? "top-8" : "top-0"} left-0 right-0 z-[1000] bg-white/90 dark:bg-dark-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 transition-all">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2">
                <a href="index.html" class="flex items-center gap-2.5 min-w-0">
                    <img src="${APP_LOGO_URL}" alt="MBBS Profs Prep" class="w-9 h-9 rounded-xl object-cover shadow-sm border border-slate-200 dark:border-slate-700 flex-shrink-0" />
                    <div class="min-w-0">
                        <div class="font-display font-extrabold text-sm sm:text-base text-slate-900 dark:text-white leading-tight truncate">MBBS Profs Prep</div>
                        <div class="text-[10px] font-semibold text-brand-600 dark:text-brand-400 tracking-wide hidden sm:block">AIIMS University PYQ Vault</div>
                    </div>
                </a>

                <div class="flex items-center gap-1.5 sm:gap-2">
                    <!-- Dark Mode Toggle -->
                    <button id="nav-theme-btn" type="button" aria-label="Toggle theme" class="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-dark-800 text-slate-600 dark:text-slate-300 transition">
                        ${isDark
                            ? `<svg class="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 3v1m0 16v1m8.66-13.66l-.71.71M4.05 19.95l-.71.71M21 12h-1M4 12H3m16.95 7.95l-.71-.71M4.05 4.05l-.71-.71M12 8a4 4 0 100 8 4 4 0 000-8z"/></svg>`
                            : `<svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>`}
                    </button>

                    <!-- Bookmarks Sidebar Button -->
                    <button id="nav-bookmarks-btn" type="button" class="relative inline-flex items-center gap-1.5 px-2.5 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-dark-800 text-slate-700 dark:text-slate-200 text-xs font-bold transition">
                        <span>🔖</span>
                        <span class="hidden sm:inline">Saved</span>
                        ${bmkCount > 0 ? `<span class="px-1.5 py-0.5 text-[10px] font-extrabold rounded-full bg-brand-600 text-white">${bmkCount}</span>` : ""}
                    </button>

                    <!-- Admin Console Link (Admins Only) -->
                    ${isAdmin ? `
                        <button id="nav-admin-hub-btn" type="button" class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 text-xs font-extrabold hover:bg-amber-200 transition">
                            ⚙️ <span class="hidden sm:inline">Admin</span>
                        </button>
                    ` : ""}

                    <!-- Profile / Sign In -->
                    ${user ? `
                        <button id="nav-profile-btn" type="button" class="inline-flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-dark-800 hover:border-brand-400 transition">
                            <span class="w-6 h-6 rounded-full bg-brand-600 text-white text-xs font-extrabold flex items-center justify-center">${escapeHtml((displayName || "U")[0].toUpperCase())}</span>
                            <span class="text-xs font-bold text-slate-800 dark:text-slate-100 max-w-[90px] truncate hidden sm:inline">${escapeHtml(displayName)}</span>
                            ${MPPStore.userStatus.isVIP ? `<span class="text-[10px] font-black px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300">PRO</span>` : ""}
                        </button>
                    ` : `
                        <button id="nav-signin-btn" type="button" class="px-3.5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-sm transition">
                            Sign In
                        </button>
                    `}
                </div>
            </div>
        </nav>
    `;

    root.querySelector("#nav-theme-btn")?.addEventListener("click", toggleDarkMode);
    root.querySelector("#nav-bookmarks-btn")?.addEventListener("click", () => openSidebar());
    root.querySelector("#nav-signin-btn")?.addEventListener("click", () => openAuthModal("login"));
    root.querySelector("#nav-profile-btn")?.addEventListener("click", () => openProfileModal());
    root.querySelector("#nav-admin-hub-btn")?.addEventListener("click", () => {
        if (window.MPPAdmin && typeof window.MPPAdmin.openControlHub === "function") {
            window.MPPAdmin.openControlHub();
        } else {
            window.location.href = "admin.html";
        }
    });
}

// ============================================================================
// 5. AUTH & PROFILE MODALS (Zero Native Alerts)
// ============================================================================
export function openAuthModal(initialTab = "login") {
    let tab = initialTab;

    const renderBody = () => {
        if (tab === "signup") {
            return `
                <form id="mpp-signup-form" class="space-y-3">
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label class="block text-xs font-bold mb-1">Full Name *</label>
                            <input name="fullName" required class="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-dark-800 text-sm" placeholder="Dr. / Student Name" />
                        </div>
                        <div>
                            <label class="block text-xs font-bold mb-1">MBBS Join Year *</label>
                            <input name="joinYear" required class="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-dark-800 text-sm" placeholder="e.g. 2022" />
                        </div>
                    </div>
                    <div>
                        <label class="block text-xs font-bold mb-1">Email *</label>
                        <input name="email" type="email" required class="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-dark-800 text-sm" placeholder="you@example.com" />
                    </div>
                    <div>
                        <label class="block text-xs font-bold mb-1">Password (min 6 chars) *</label>
                        <input name="password" type="password" minlength="6" required class="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-dark-800 text-sm" placeholder="••••••••" />
                    </div>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label class="block text-xs font-bold mb-1">Medical College *</label>
                            <input name="college" required class="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-dark-800 text-sm" placeholder="AIIMS Deoghar" />
                        </div>
                        <div>
                            <label class="block text-xs font-bold mb-1">Phone (WhatsApp)</label>
                            <input name="phone" class="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-dark-800 text-sm" placeholder="+91 ..." />
                        </div>
                    </div>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label class="block text-xs font-bold mb-1">Country</label>
                            <input name="country" value="India" class="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-dark-800 text-sm" />
                        </div>
                        <div>
                            <label class="block text-xs font-bold mb-1">City</label>
                            <input name="city" class="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-dark-800 text-sm" placeholder="City" />
                        </div>
                    </div>
                    <div id="mpp-auth-err" class="hidden text-xs font-bold text-red-600 bg-red-50 dark:bg-red-950/40 p-2.5 rounded-lg"></div>
                    <button type="submit" class="w-full py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm">Create Account</button>
                    <p class="text-center text-xs text-slate-500">Already have an account? <button type="button" data-auth-tab="login" class="text-brand-600 font-bold hover:underline">Sign In</button></p>
                </form>
            `;
        }

        if (tab === "reset") {
            return `
                <form id="mpp-reset-form" class="space-y-3">
                    <p class="text-xs text-slate-500 dark:text-slate-400">Enter your registered email to receive a password reset link.</p>
                    <div>
                        <label class="block text-xs font-bold mb-1">Email</label>
                        <input name="email" type="email" required class="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-dark-800 text-sm" placeholder="you@example.com" />
                    </div>
                    <div id="mpp-auth-err" class="hidden text-xs font-bold text-red-600 bg-red-50 dark:bg-red-950/40 p-2.5 rounded-lg"></div>
                    <button type="submit" class="w-full py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm">Send Reset Link</button>
                    <p class="text-center text-xs text-slate-500"><button type="button" data-auth-tab="login" class="text-brand-600 font-bold hover:underline">Back to Sign In</button></p>
                </form>
            `;
        }

        return `
            <form id="mpp-login-form" class="space-y-3.5">
                <div>
                    <label class="block text-xs font-bold mb-1">Email</label>
                    <input name="email" type="email" required class="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-dark-800 text-sm" placeholder="you@example.com" />
                </div>
                <div>
                    <div class="flex items-center justify-between mb-1">
                        <label class="text-xs font-bold">Password</label>
                        <button type="button" data-auth-tab="reset" class="text-xs font-semibold text-brand-600 hover:underline">Forgot password?</button>
                    </div>
                    <input name="password" type="password" required class="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-dark-800 text-sm" placeholder="••••••••" />
                </div>
                <div id="mpp-auth-err" class="hidden text-xs font-bold text-red-600 bg-red-50 dark:bg-red-950/40 p-2.5 rounded-lg"></div>
                <button type="submit" class="w-full py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm">Sign In</button>
                <p class="text-center text-xs text-slate-500">New here? <button type="button" data-auth-tab="signup" class="text-brand-600 font-bold hover:underline">Create an account</button></p>
            </form>
        `;
    };

    const mount = () => {
        const titles = { login: "Sign In to MBBS Profs Prep", signup: "Create Student Account", reset: "Reset Password" };
        const modal = showModal({ id: "mpp-auth-modal", size: "sm", title: titles[tab], bodyHtml: renderBody() });

        modal.querySelectorAll("[data-auth-tab]").forEach(btn => {
            btn.addEventListener("click", () => { tab = btn.dataset.authTab; mount(); });
        });

        const errEl = modal.querySelector("#mpp-auth-err");
        const setErr = (msg) => {
            if (!errEl) return;
            errEl.textContent = msg;
            errEl.classList.remove("hidden");
        };

        modal.querySelector("#mpp-login-form")?.addEventListener("submit", async (e) => {
            e.preventDefault();
            const fd = new FormData(e.target);
            const btn = e.target.querySelector("button[type='submit']");
            btn.disabled = true; btn.textContent = "Signing in...";
            try {
                await loginWithEmail(fd.get("email"), fd.get("password"));
                closeModal("mpp-auth-modal");
                showToast("Signed in successfully!", "success");
            } catch (err) {
                setErr(err.message || "Invalid email or password.");
                btn.disabled = false; btn.textContent = "Sign In";
            }
        });

        modal.querySelector("#mpp-signup-form")?.addEventListener("submit", async (e) => {
            e.preventDefault();
            const fd = new FormData(e.target);
            const btn = e.target.querySelector("button[type='submit']");
            btn.disabled = true; btn.textContent = "Creating account...";
            try {
                await signUpWithEmail(Object.fromEntries(fd.entries()));
                closeModal("mpp-auth-modal");
                showToast("Account created! Welcome.", "success");
            } catch (err) {
                setErr(err.message || "Could not create account.");
                btn.disabled = false; btn.textContent = "Create Account";
            }
        });

        modal.querySelector("#mpp-reset-form")?.addEventListener("submit", async (e) => {
            e.preventDefault();
            const fd = new FormData(e.target);
            try {
                await sendResetEmail(fd.get("email"));
                showToast("Password reset link sent to your email.", "success", 4000);
                tab = "login"; mount();
            } catch (err) {
                setErr(err.message || "Failed to send reset email.");
            }
        });
    };

    mount();
}

export function openProfileModal() {
    if (!MPPStore.user) return openAuthModal("login");
    const p = MPPStore.profile || {};
    const st = MPPStore.userStatus || {};

    const modal = showModal({
        id: "mpp-profile-modal",
        size: "sm",
        title: "Student Profile & Access",
        bodyHtml: `
            <div class="space-y-4">
                <div class="p-3.5 rounded-xl border ${st.isVIP ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800" : "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800"} flex items-center justify-between gap-3">
                    <div>
                        <div class="text-xs font-extrabold uppercase tracking-wider ${st.isVIP ? "text-emerald-700 dark:text-emerald-300" : "text-amber-700 dark:text-amber-300"}">
                            ${MPPStore.isAdmin ? "Admin Lifetime Access" : (st.isVIP ? "PRO Member Active" : (st.expired ? "Subscription Expired" : "Free Preview Account"))}
                        </div>
                        <div class="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                            ${st.isVIP ? `Valid until: ${escapeHtml(st.validUntil || "Active")} (${st.daysLeft}d left)` : "Upgrade to unlock full university PYQ vaults & answers."}
                        </div>
                    </div>
                    ${!MPPStore.isAdmin ? `<button id="prof-upgrade-btn" type="button" class="px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold flex-shrink-0">${st.isVIP ? "Extend" : "Upgrade"}</button>` : ""}
                </div>

                <form id="mpp-profile-form" class="space-y-3">
                    <div>
                        <label class="block text-xs font-bold mb-1">Full Name</label>
                        <input name="fullName" value="${escapeHtml(p.fullName || MPPStore.user.displayName || "")}" required class="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-dark-800 text-sm" />
                    </div>
                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="block text-xs font-bold mb-1">Join Year</label>
                            <input name="joinYear" value="${escapeHtml(p.joinYear || "")}" class="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-dark-800 text-sm" />
                        </div>
                        <div>
                            <label class="block text-xs font-bold mb-1">Phone</label>
                            <input name="phone" value="${escapeHtml(p.phone || "")}" class="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-dark-800 text-sm" />
                        </div>
                    </div>
                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="block text-xs font-bold mb-1">College</label>
                            <input name="college" value="${escapeHtml(p.college || "")}" class="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-dark-800 text-sm" />
                        </div>
                        <div>
                            <label class="block text-xs font-bold mb-1">City</label>
                            <input name="city" value="${escapeHtml(p.city || "")}" class="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-dark-800 text-sm" />
                        </div>
                    </div>
                    <button type="submit" class="w-full py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold">Save Profile</button>
                </form>

                <div class="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                    <button id="prof-clear-cache-btn" type="button" class="text-xs font-semibold text-slate-500 hover:text-brand-600">Refresh Offline Cache</button>
                    <button id="prof-logout-btn" type="button" class="px-3.5 py-1.5 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-xs font-bold hover:bg-red-100">Sign Out</button>
                </div>
            </div>
        `
    });

    modal.querySelector("#prof-upgrade-btn")?.addEventListener("click", () => openSecureCheckout());
    modal.querySelector("#prof-logout-btn")?.addEventListener("click", () => logoutUser());
    modal.querySelector("#prof-clear-cache-btn")?.addEventListener("click", async () => {
        await clearLocalBankCache();
        showToast("Offline cache cleared. Reloading...", "success");
        setTimeout(() => window.location.reload(), 600);
    });
    modal.querySelector("#mpp-profile-form")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        try {
            await updateUserProfile(Object.fromEntries(fd.entries()));
            showToast("Profile updated!", "success");
            renderNavbar();
        } catch (err) {
            showToast(err.message || "Update failed.", "error");
        }
    });
}

// ============================================================================
// 6. SIDEBAR BOOKMARKS (Interactive MCQs + ans_image + Legacy Recovery)
// ============================================================================
let _sidebarOpen = false;
let _sidebarSubjectFilter = "ALL";
let _sidebarMcqState = {};

// Recovers missing options/stem/images on legacy bookmarks from active loaded QBank
function recoverRichQuestionData(bm) {
    if (!bm) return {};
    const out = { ...bm };
    if ((!out.options || !out.ans_image || !out.stem) && window.QBankEngine?.getQuestionById) {
        const live = window.QBankEngine.getQuestionById(bm.q);
        if (live) {
            if (!out.stem && live.stem) out.stem = live.stem;
            if ((!out.options || !out.options.length) && Array.isArray(live.options)) out.options = live.options;
            if (!out.ans_key && live.ans_key) out.ans_key = live.ans_key;
            if (!out.image && live.image) out.image = live.image;
            if (!out.ans_image && live.ans_image) out.ans_image = live.ans_image;
        }
    }
    return out;
}

function buildDeepLinkUrl(bm) {
    const isClin = String(bm.mode || "").toLowerCase() === "clinical" || String(bm.subject || "").includes("CLINICAL");
    const page = isClin ? "clinical.html" : "review.html";
    const col = bm.collegeCode || "deoghar";
    const sub = (bm.subjectCode || bm.subject || "cfm").toLowerCase().replace(/_clinical$/i, "");
    const p = new URLSearchParams({ college: col, subject: sub });
    if (bm.versionCode) p.set("version", bm.versionCode);
    if (bm.q) p.set("qid", bm.q);
    return `${page}?${p.toString()}`;
}

export function openSidebar() {
    _sidebarOpen = true;
    renderSidebar();
    pushOverlayHistory("sidebar", (fromPop) => closeSidebar(fromPop));
}

export function closeSidebar(fromPopState = false) {
    if (!_sidebarOpen) return;
    _sidebarOpen = false;
    const root = document.getElementById("mpp-sidebar-root");
    if (root) root.innerHTML = "";
    popOverlayHistory("sidebar", fromPopState);
}

function renderSidebar() {
    const root = document.getElementById("mpp-sidebar-root");
    if (!root || !_sidebarOpen) return;

    const allEntries = Object.entries(MPPStore.bookmarks || {}).sort((a, b) => {
        return new Date(b[1]?.timestamp || 0) - new Date(a[1]?.timestamp || 0);
    });

    const subjects = [...new Set(allEntries.map(([, v]) => v.subject || v.subjectCode || "General"))].sort();
    const filtered = _sidebarSubjectFilter === "ALL"
        ? allEntries
        : allEntries.filter(([, v]) => (v.subject || v.subjectCode || "General") === _sidebarSubjectFilter);

    const canNeuro = canAccessNeuroRecall();
    const dueCount = allEntries.filter(([, v]) => (Number(v.next_review_date || 0) <= Date.now())).length;

    root.innerHTML = `
        <div id="mpp-sidebar-backdrop" class="fixed inset-0 z-[3600] bg-slate-950/60 backdrop-blur-xs flex justify-end">
            <aside class="w-full max-w-md h-full bg-white dark:bg-dark-900 shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col" style="padding-bottom: env(safe-area-inset-bottom, 0px);">
                <!-- Header -->
                <div class="px-4 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2" style="padding-top: calc(0.875rem + var(--safe-top));">
                    <div>
                        <h2 class="font-display font-extrabold text-base text-slate-900 dark:text-white">🔖 Saved Bookmarks (${allEntries.length})</h2>
                        <p class="text-[11px] text-slate-500 dark:text-slate-400">Tap any card to flip &amp; review</p>
                    </div>
                    <button id="sb-close-btn" type="button" class="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-dark-800 text-slate-500 text-xl leading-none">&times;</button>
                </div>

                <!-- Neuro-Recall Launcher + Subject Filter -->
                <div class="px-4 py-3 border-b border-slate-100 dark:border-slate-800 space-y-2.5 bg-slate-50/70 dark:bg-dark-800/40">
                    ${canNeuro && allEntries.length > 0 ? `
                        <button id="sb-neuro-btn" type="button" class="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white text-xs font-extrabold shadow-sm flex items-center justify-between">
                            <span>🧠 Launch Neuro-Recall 3D SRS</span>
                            <span class="px-2 py-0.5 rounded-full bg-white/20 text-[11px]">${dueCount} Due</span>
                        </button>
                    ` : ""}

                    <select id="sb-subject-filter" class="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-dark-900 text-slate-800 dark:text-slate-100">
                        <option value="ALL">All Subjects (${allEntries.length})</option>
                        ${subjects.map(s => `<option value="${escapeHtml(s)}" ${_sidebarSubjectFilter === s ? "selected" : ""}>${escapeHtml(s)}</option>`).join("")}
                    </select>
                </div>

                <!-- Cards List -->
                <div class="flex-1 overflow-y-auto p-4 space-y-3.5" id="sb-cards-list">
                    ${!MPPStore.user ? `
                        <div class="text-center py-12 space-y-3">
                            <p class="text-sm text-slate-500">Sign in to sync your saved questions across devices.</p>
                            <button id="sb-signin-btn" type="button" class="px-5 py-2 rounded-xl bg-brand-600 text-white text-xs font-bold">Sign In</button>
                        </div>
                    ` : (filtered.length === 0 ? `
                        <div class="text-center py-12 text-slate-400 text-sm">No bookmarked questions in this filter yet.</div>
                    ` : filtered.map(([key, rawBm]) => {
                        const bm = recoverRichQuestionData(rawBm);
                        const hasOpts = Array.isArray(bm.options) && bm.options.length > 0;
                        const correctLetter = String(bm.ans_key || "").trim().toUpperCase();
                        const chosen = _sidebarMcqState[key];
                        const deepUrl = buildDeepLinkUrl(bm);

                        const optsHtml = hasOpts ? `
                            <div class="mt-2.5 space-y-1.5" data-no-flip="true">
                                ${bm.options.map((opt, idx) => {
                                    const letter = String.fromCharCode(65 + idx);
                                    const cleanOpt = String(opt).replace(/^[A-E][\.\)\:]\s*/i, "");
                                    let cls = "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-dark-800 text-slate-700 dark:text-slate-200";
                                    if (chosen) {
                                        if (letter === correctLetter) cls = "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-200 font-bold";
                                        else if (letter === chosen) cls = "border-red-500 bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300 font-bold";
                                    } else if (!canNeuro && letter === correctLetter) {
                                        // Highlight correct option directly when Neuro-Recall is disabled (Old UI Parity)
                                        cls = "border-emerald-400 bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-200 font-semibold";
                                    }
                                    return `
                                        <button type="button" data-sb-opt="${escapeHtml(key)}" data-letter="${letter}"
                                            class="w-full text-left px-2.5 py-1.5 rounded-lg border text-xs transition ${cls}">
                                            <span class="font-extrabold mr-1">${letter})</span>${escapeHtml(cleanOpt)}
                                        </button>
                                    `;
                                }).join("")}
                            </div>
                        ` : "";

                        const correctOptIdx = correctLetter ? correctLetter.charCodeAt(0) - 65 : -1;
                        const correctOptText = (hasOpts && correctOptIdx >= 0 && bm.options[correctOptIdx])
                            ? `${correctLetter}) ${String(bm.options[correctOptIdx]).replace(/^[A-E][\.\)\:]\s*/i, "")}`
                            : (correctLetter ? `Key: ${correctLetter}` : "");

                        return `
                            <div class="flashcard-container" data-sb-card="${escapeHtml(key)}">
                                <div class="flashcard-inner rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-dark-800/80 shadow-sm">
                                    <!-- Front -->
                                    <div class="flashcard-front p-3.5">
                                        <div class="flex items-center justify-between gap-2 mb-2">
                                            <div class="flex items-center gap-1.5 min-w-0">
                                                <span class="px-2 py-0.5 rounded bg-brand-100 dark:bg-brand-900/50 text-brand-700 dark:text-brand-300 text-[10px] font-extrabold">${escapeHtml(bm.q || "Q")}</span>
                                                <span class="text-[11px] font-bold text-slate-500 dark:text-slate-400 truncate">${escapeHtml(bm.subject || bm.subjectCode || "")}</span>
                                            </div>
                                            <button type="button" data-sb-flip="${escapeHtml(key)}" class="text-[11px] font-bold text-brand-600 dark:text-brand-400 hover:underline flex-shrink-0">Flip Answer &rarr;</button>
                                        </div>
                                        <div class="text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-100 leading-relaxed">${renderRichText(bm.stem || "Saved Question")}</div>
                                        ${bm.image ? `<img src="${escapeHtml(bm.image)}" alt="Question figure" data-lightbox-src="${escapeHtml(bm.image)}" class="mt-2 max-h-40 rounded-lg border border-slate-200 dark:border-slate-700 cursor-zoom-in" />` : ""}
                                        ${optsHtml}
                                        <div class="mt-3 pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between gap-2">
                                            <a href="${escapeHtml(deepUrl)}" class="text-[11px] font-bold text-brand-600 dark:text-brand-400 hover:underline">Open Source &nearr;</a>
                                            <button type="button" data-sb-del="${escapeHtml(key)}" class="text-[11px] font-bold text-red-500 hover:text-red-700">Remove</button>
                                        </div>
                                    </div>

                                    <!-- Back (Hidden unless flipped via JS toggle for dynamic height) -->
                                    <div class="hidden p-3.5 bg-slate-50 dark:bg-dark-900 rounded-2xl" data-sb-back="${escapeHtml(key)}">
                                        <div class="flex items-center justify-between gap-2 mb-2">
                                            <span class="text-[11px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Answer &amp; Notes</span>
                                            <button type="button" data-sb-unflip="${escapeHtml(key)}" class="text-[11px] font-bold text-brand-600 dark:text-brand-400 hover:underline">&larr; Question</button>
                                        </div>
                                        ${correctOptText ? `<div class="mb-2.5 p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-xs font-extrabold text-emerald-800 dark:text-emerald-200">✓ ${escapeHtml(correctOptText)}</div>` : ""}
                                        ${bm.ans_image ? `<img src="${escapeHtml(bm.ans_image)}" alt="Answer card" data-lightbox-src="${escapeHtml(bm.ans_image)}" class="mb-2.5 w-full rounded-lg border border-slate-200 dark:border-slate-700 cursor-zoom-in" />` : ""}
                                        <div class="mpp-prose text-xs text-slate-700 dark:text-slate-200 leading-relaxed">${bm.answer ? renderRichText(bm.answer) : `<span class="text-slate-400 italic">Open source question to load full model answer.</span>`}</div>
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join(""))}
                </div>
            </aside>
        </div>
    `;

    root.querySelector("#mpp-sidebar-backdrop")?.addEventListener("click", (e) => {
        if (e.target.id === "mpp-sidebar-backdrop") closeSidebar();
    });
    root.querySelector("#sb-close-btn")?.addEventListener("click", () => closeSidebar());
    root.querySelector("#sb-signin-btn")?.addEventListener("click", () => { closeSidebar(); openAuthModal("login"); });
    root.querySelector("#sb-neuro-btn")?.addEventListener("click", () => { closeSidebar(); openNeuroRecallModal(); });
    root.querySelector("#sb-subject-filter")?.addEventListener("change", (e) => {
        _sidebarSubjectFilter = e.target.value;
        renderSidebar();
    });

    root.querySelectorAll("[data-sb-opt]").forEach(btn => {
        btn.addEventListener("click", (e) => {
            e.stopPropagation();
            _sidebarMcqState[btn.dataset.sbOpt] = btn.dataset.letter;
            renderSidebar();
        });
    });

    root.querySelectorAll("[data-sb-flip]").forEach(btn => {
        btn.addEventListener("click", () => {
            const card = root.querySelector(`[data-sb-card="${CSS.escape(btn.dataset.sbFlip)}"]`);
            card?.querySelector(".flashcard-front")?.classList.add("hidden");
            card?.querySelector(`[data-sb-back]`)?.classList.remove("hidden");
        });
    });

    root.querySelectorAll("[data-sb-unflip]").forEach(btn => {
        btn.addEventListener("click", () => {
            const card = root.querySelector(`[data-sb-card="${CSS.escape(btn.dataset.sbUnflip)}"]`);
            card?.querySelector(".flashcard-front")?.classList.remove("hidden");
            card?.querySelector(`[data-sb-back]`)?.classList.add("hidden");
        });
    });

    root.querySelectorAll("[data-sb-del]").forEach(btn => {
        btn.addEventListener("click", async () => {
            await deleteBookmarkByKey(btn.dataset.sbDel);
            showToast("Bookmark removed.", "info");
            renderSidebar();
        });
    });

    root.querySelectorAll("[data-lightbox-src]").forEach(img => {
        img.addEventListener("click", (e) => {
            e.stopPropagation();
            openImageLightbox(img.dataset.lightboxSrc);
        });
    });
}

// ============================================================================
// 7. NEURO-RECALL 3D SRS ENGINE (Restores Full Correct Option Text on Back Face)
// ============================================================================
const neuroRecallApp = {
    queue: [],
    index: 0,
    flipped: false,
    selectedLetter: null,

    open() {
        const entries = Object.entries(MPPStore.bookmarks || {}).map(([key, val]) => ({
            key,
            ...recoverRichQuestionData(val)
        }));
        if (!entries.length) {
            showToast("Bookmark some questions first to start Neuro-Recall.", "info");
            return;
        }
        const due = entries.filter(x => Number(x.next_review_date || 0) <= Date.now());
        this.queue = due.length ? due : entries;
        this.index = 0;
        this.flipped = false;
        this.selectedLetter = null;
        this.render();
    },

    selectMCQ(letter) {
        this.selectedLetter = letter;
        this.flipped = true;
        this.render();
    },

    flip() {
        this.flipped = !this.flipped;
        this.render();
    },

    async rate(rating) {
        const card = this.queue[this.index];
        if (!card) return;
        const step = Number(card.current_step || 1);
        const dayMs = 86400000;
        let nextStep = step;
        let delayMs = dayMs;

        if (rating === "again") { nextStep = 1; delayMs = 10 * 60 * 1000; }
        else if (rating === "hard") { nextStep = Math.max(1, step); delayMs = 1 * dayMs; }
        else if (rating === "good") { nextStep = step + 1; delayMs = (step <= 1 ? 3 : 7) * dayMs; }
        else if (rating === "easy") { nextStep = step + 2; delayMs = (step <= 1 ? 7 : 21) * dayMs; }

        await updateBookmarkSRS(card.key, nextStep, Date.now() + delayMs);
        this.index++;
        this.flipped = false;
        this.selectedLetter = null;

        if (this.index >= this.queue.length) {
            closeModal("mpp-neuro-modal");
            showToast("Neuro-Recall session complete!", "success");
            return;
        }
        this.render();
    },

    render() {
        const card = this.queue[this.index];
        if (!card) return;

        const hasOpts = Array.isArray(card.options) && card.options.length > 0;
        const correctLetter = String(card.ans_key || "").trim().toUpperCase();
        const correctIdx = correctLetter ? correctLetter.charCodeAt(0) - 65 : -1;
        const fullCorrectOptionText = (hasOpts && correctIdx >= 0 && card.options[correctIdx])
            ? `${correctLetter}) ${String(card.options[correctIdx]).replace(/^[A-E][\.\)\:]\s*/i, "")}`
            : (correctLetter ? `Correct Key: ${correctLetter}` : "");

        const isCorrect = this.selectedLetter && correctLetter && this.selectedLetter === correctLetter;

        const frontHtml = `
            <div class="space-y-4">
                <div class="flex items-center justify-between text-xs text-slate-500">
                    <span class="font-extrabold text-indigo-600 dark:text-indigo-400">${escapeHtml(card.subject || "")} • ${escapeHtml(card.q || "")}</span>
                    <span class="font-bold">Card ${this.index + 1} / ${this.queue.length}</span>
                </div>
                <div class="text-sm sm:text-base font-semibold text-slate-900 dark:text-white leading-relaxed">${renderRichText(card.stem || "")}</div>
                ${card.image ? `<img src="${escapeHtml(card.image)}" class="max-h-56 mx-auto rounded-xl border border-slate-200 dark:border-slate-700" />` : ""}
                ${hasOpts ? `
                    <div class="space-y-2 pt-1">
                        ${card.options.map((opt, i) => {
                            const letter = String.fromCharCode(65 + i);
                            const clean = String(opt).replace(/^[A-E][\.\)\:]\s*/i, "");
                            return `<button type="button" data-nr-opt="${letter}" class="w-full text-left px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-dark-800 hover:border-indigo-500 text-xs sm:text-sm font-medium transition"><span class="font-extrabold mr-1.5">${letter})</span>${escapeHtml(clean)}</button>`;
                        }).join("")}
                    </div>
                ` : `
                    <button id="nr-reveal-btn" type="button" class="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-sm">Reveal Answer</button>
                `}
            </div>
        `;

        const backHtml = `
            <div class="space-y-3.5">
                <div class="flex items-center justify-between text-xs">
                    <span class="font-extrabold text-indigo-600 dark:text-indigo-400">Card ${this.index + 1} / ${this.queue.length}</span>
                    <button id="nr-show-front" type="button" class="font-bold text-slate-500 hover:text-brand-600">&larr; View Question</button>
                </div>

                ${this.selectedLetter ? `
                    <div class="p-3 rounded-xl border font-extrabold text-sm ${isCorrect ? "bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300" : "bg-red-50 dark:bg-red-950/50 border-red-300 dark:border-red-800 text-red-700 dark:text-red-300"}">
                        ${isCorrect ? `✓ Correct! You chose ${this.selectedLetter}` : `✗ Incorrect — You chose ${this.selectedLetter}`}
                    </div>
                ` : ""}

                ${fullCorrectOptionText ? `
                    <div class="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 text-xs sm:text-sm font-extrabold">
                        ✓ Correct Answer: ${escapeHtml(fullCorrectOptionText)}
                    </div>
                ` : ""}

                ${card.ans_image ? `<img src="${escapeHtml(card.ans_image)}" data-nr-lb="${escapeHtml(card.ans_image)}" class="w-full max-h-64 object-contain rounded-xl border border-slate-200 dark:border-slate-700 cursor-zoom-in" />` : ""}

                <div class="mpp-prose text-xs sm:text-sm leading-relaxed text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-dark-800/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700">
                    ${card.answer ? renderRichText(card.answer) : `<span class="text-slate-400 italic">No saved explanation attached.</span>`}
                </div>

                <div class="grid grid-cols-4 gap-2 pt-2">
                    <button type="button" data-nr-rate="again" class="py-2 rounded-xl bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 text-xs font-extrabold">Again<br><span class="font-normal opacity-75">10m</span></button>
                    <button type="button" data-nr-rate="hard" class="py-2 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-xs font-extrabold">Hard<br><span class="font-normal opacity-75">1d</span></button>
                    <button type="button" data-nr-rate="good" class="py-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-xs font-extrabold">Good<br><span class="font-normal opacity-75">3-7d</span></button>
                    <button type="button" data-nr-rate="easy" class="py-2 rounded-xl bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 text-xs font-extrabold">Easy<br><span class="font-normal opacity-75">14d+</span></button>
                </div>
            </div>
        `;

        const modal = showModal({
            id: "mpp-neuro-modal",
            size: "md",
            title: "🧠 Neuro-Recall 3D Spaced Repetition",
            bodyHtml: this.flipped ? backHtml : frontHtml
        });

        modal.querySelectorAll("[data-nr-opt]").forEach(btn => {
            btn.addEventListener("click", () => this.selectMCQ(btn.dataset.nrOpt));
        });
        modal.querySelector("#nr-reveal-btn")?.addEventListener("click", () => this.flip());
        modal.querySelector("#nr-show-front")?.addEventListener("click", () => this.flip());
        modal.querySelectorAll("[data-nr-rate]").forEach(btn => {
            btn.addEventListener("click", () => this.rate(btn.dataset.nrRate));
        });
        modal.querySelector("[data-nr-lb]")?.addEventListener("click", (e) => {
            openImageLightbox(e.currentTarget.dataset.nrLb, "Answer Card");
        });
    }
};

export function openNeuroRecallModal() {
    neuroRecallApp.open();
}

// ============================================================================
// 8. SHELL INITIALIZER & GLOBAL EXPORTS
// ============================================================================
let _shellBooted = false;

export function initUIShell(opts = {}) {
    if (opts.mode) MPPStore.page.mode = opts.mode;

    renderAnnouncementBanner();
    renderNavbar();

    if (!_shellBooted) {
        _shellBooted = true;
        onStoreChange("auth", () => { renderNavbar(); if (_sidebarOpen) renderSidebar(); });
        onStoreChange("profile", () => renderNavbar());
        onStoreChange("bookmarks", () => { renderNavbar(); if (_sidebarOpen) renderSidebar(); });
        onStoreChange("flags", () => { if (_sidebarOpen) renderSidebar(); });
        onStoreChange("appConfig", () => { renderAnnouncementBanner(); renderNavbar(); });
    }

    // Backwards-compatible globals for inline handlers & admin-suite.js
    window.MPPShell = {
        showModal, closeModal, showConfirmModal, showToast, openImageLightbox,
        openAuthModal, openProfileModal, openSidebar, closeSidebar, openNeuroRecallModal,
        openSecureCheckout, toggleDarkMode, pushOverlayHistory, popOverlayHistory,
        renderRichText, escapeHtml
    };
    window.showModal = showModal;
    window.closeModal = closeModal;
    window.showToast = showToast;
    window.openAuthModal = openAuthModal;
    window.openSecureCheckout = openSecureCheckout;
    window.toggleSidebar = () => (_sidebarOpen ? closeSidebar() : openSidebar());
    window.neuroRecallApp = neuroRecallApp;
}
