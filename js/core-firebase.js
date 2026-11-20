// ============================================================================
// js/core-firebase.js (Phase 1 — Near-₹0 Blaze Cost Optimized)
// Single Firebase v11 Instance: Auth, 3-Admin Guard, Session-Cached Store,
// Cloud Bookmarks, 2-Device Session Guard & Lazy Admin Suite Loader
// ============================================================================
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import {
    getAuth,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    sendPasswordResetEmail,
    signOut,
    onAuthStateChanged,
    updateProfile
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import {
    getDatabase,
    ref,
    get,
    set,
    update,
    remove,
    onValue
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";

export const PROFS_FIREBASE_CONFIG = {
    apiKey: "AIzaSyDvPdEhkK1VDkuAqIhlSXPL2MXxlv7Mo9c",
    authDomain: "mbbs-profs-prep48c.firebaseapp.com",
    databaseURL: "https://mbbs-profs-prep48c-default-rtdb.firebaseio.com",
    projectId: "mbbs-profs-prep48c",
    storageBucket: "mbbs-profs-prep48c.firebasestorage.app",
    messagingSenderId: "378639777472",
    appId: "1:378639777472:web:9c2dcb689d97025f6ff725"
};

// STRICT ADMIN LIST (Must match database.rules.json)
export const ADMIN_EMAILS = Object.freeze([
    "pankajmahto109@gmail.com",
    "educateindiainstitute@gmail.com",
    "pankajkumarmahto1009@gmail.com"
]);

export const APP_LOGO_URL = "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEgFbo8CVZSf-ejwVGTTTGeu1B5bJj4JGloqdh70o21Tf_895kWYOvNmyE9cnAAR66r77ZFZZKTslF6QIp4F-bWxPsXjGsAWzwc75D6VnXqFMbi-4NgUazELmmMWeyX3ApASZncrHUFjni62u4spE3g19Pfcbsy-h5iUTfxTXWWTEYPgaD47kLMDA43e1SMQ/s678/1000126459.jpg";

const fbApp = getApps().find(a => a.name === "[DEFAULT]") || initializeApp(PROFS_FIREBASE_CONFIG);
export const auth = getAuth(fbApp);
export const db = getDatabase(fbApp);

const SESSION_PREFIX = "mpp_sc_v2_";
const DEFAULT_TTL_MS = 15 * 60 * 1000; // 15 minutes

// ============================================================================
// SESSION STORAGE CACHE HELPERS (Eliminates redundant RTDB downloads across pages)
// ============================================================================
export function readSessionCache(key, ttlMs = DEFAULT_TTL_MS) {
    try {
        const raw = sessionStorage.getItem(SESSION_PREFIX + key);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed.ts !== "number") return null;
        if (Date.now() - parsed.ts > ttlMs) {
            sessionStorage.removeItem(SESSION_PREFIX + key);
            return null;
        }
        return parsed.val;
    } catch (_) {
        return null;
    }
}

export function writeSessionCache(key, val) {
    try {
        sessionStorage.setItem(SESSION_PREFIX + key, JSON.stringify({ ts: Date.now(), val }));
    } catch (_) {}
}

export function invalidateSessionCache(keyPrefix = "") {
    try {
        const target = SESSION_PREFIX + keyPrefix;
        for (let i = sessionStorage.length - 1; i >= 0; i--) {
            const k = sessionStorage.key(i);
            if (k && k.startsWith(target)) sessionStorage.removeItem(k);
        }
    } catch (_) {}
}

export async function getSessionCached(key, ttlMs, fetcher) {
    const hit = readSessionCache(key, ttlMs);
    if (hit !== null) return hit;
    const fresh = await fetcher();
    writeSessionCache(key, fresh);
    return fresh;
}

// ============================================================================
// CENTRALIZED REACTIVE STORE
// ============================================================================
export const MPPStore = {
    authReady: false,
    user: null,
    isAdmin: false,
    accessLevel: "guest", // "guest" | "free" | "premium"
    userStatus: { isVIP: false, daysLeft: 0, validUntil: null, expired: false },
    profile: {},
    bookmarks: {},
    featureFlags: {
        showNeuroRecall: false,
        showTeenPatti: true,
        showCrossExamPG: false,
        showAnswerCards: false
    },
    appConfig: {
        bannerText: "",
        bannerActive: false,
        maintenanceMode: false,
        pricing: null
    },
    page: {
        mode: "portal", // "portal" | "review" | "clinical"
        collegeCode: "deoghar",
        collegeName: "AIIMS Deoghar",
        subjectSlug: "",
        subjectCode: "",
        subjectName: "",
        versionCode: ""
    },
    adminModule: null,
    _userUnsubs: [],
    _listeners: {
        auth: new Set(),
        profile: new Set(),
        bookmarks: new Set(),
        flags: new Set(),
        appConfig: new Set(),
        adminReady: new Set()
    }
};

export function isUserAdmin(user = MPPStore.user) {
    return Boolean(user && user.email && ADMIN_EMAILS.includes(user.email.toLowerCase().trim()));
}

export function canAccessNeuroRecall() {
    return isUserAdmin() || Boolean(MPPStore.featureFlags.showNeuroRecall);
}

export function onStoreChange(channel, callback) {
    const setObj = MPPStore._listeners[channel];
    if (!setObj) return () => {};
    setObj.add(callback);
    return () => setObj.delete(callback);
}

function emit(channel, payload) {
    const setObj = MPPStore._listeners[channel];
    if (!setObj) return;
    setObj.forEach(fn => {
        try { fn(payload); } catch (e) { console.error(`[MPPStore:${channel}]`, e); }
    });
}

// Collision-free Bookmark Key (supports Standard, Ed8/Ed9, and Clinical)
export function getUniqueQuestionId(qId, overrides = {}) {
    const p = { ...MPPStore.page, ...overrides };
    const isClin = p.mode === "clinical";
    const scope = isClin
        ? `${p.subjectCode}_CLINICAL`
        : (p.versionCode ? `${p.subjectCode}_${String(p.versionCode).toUpperCase()}` : p.subjectCode);
    const raw = `${p.collegeName}_${scope}_${qId}`;
    return raw.replace(/[\.#$\[\]\/]/g, "").replace(/\s+/g, "_");
}

function clearUserListeners() {
    MPPStore._userUnsubs.forEach(u => { try { u(); } catch (_) {} });
    MPPStore._userUnsubs = [];
}

function parseFeatureFlags(val = {}) {
    const f = val.features || {};
    return {
        showNeuroRecall: Boolean(val.showNeuroRecall),
        showTeenPatti: f.showTeenPatti !== undefined ? Boolean(f.showTeenPatti) : true,
        showCrossExamPG: Boolean(f.showCrossExamPG),
        showAnswerCards: Boolean(f.showAnswerCards)
    };
}

function parseSubscription(raw) {
    let sub = { isVIP: false, daysLeft: 0, validUntil: null, expired: false };
    if (raw && raw.validUntil) {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const exp = new Date(raw.validUntil); exp.setHours(0, 0, 0, 0);
        const diff = Math.ceil((exp - today) / 86400000);
        if (diff >= 0 && raw.status === "active") {
            sub = { isVIP: true, daysLeft: diff, validUntil: raw.validUntil, expired: false };
        } else {
            sub = { isVIP: false, daysLeft: diff, validUntil: raw.validUntil, expired: true };
        }
    }
    return sub;
}

// 2-Device Session Guard (Only persistent listener kept for students: ~80 bytes)
async function startSessionGuard(user) {
    if (isUserAdmin(user)) return;
    try {
        const token = localStorage.getItem("my_session_token")
            || (crypto.randomUUID ? crypto.randomUUID().slice(0, 14) : Math.random().toString(36).slice(2, 15));
        localStorage.setItem("my_session_token", token);

        await set(ref(db, `users/${user.uid}/active_sessions/${token}`), Date.now());

        const unsub = onValue(ref(db, `users/${user.uid}/active_sessions`), (snap) => {
            const sessions = snap.val() || {};
            const keys = Object.keys(sessions);

            if (keys.length > 0 && !sessions[token]) {
                localStorage.removeItem("my_session_token");
                invalidateSessionCache();
                signOut(auth).then(() => {
                    document.body.innerHTML = `
                        <div class="fixed inset-0 z-[50000] bg-slate-900 flex flex-col items-center justify-center p-6 text-center">
                            <div class="w-20 h-20 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center text-4xl mb-6 border border-red-500/50">🔒</div>
                            <h2 class="text-3xl font-black text-white mb-3">Session Terminated</h2>
                            <p class="text-slate-400 max-w-md mb-8 font-medium leading-relaxed">You logged in on a new device. To maintain your 2-device limit, this older session was signed out.</p>
                            <button onclick="window.location.reload()" class="px-8 py-4 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-xl shadow-lg text-lg border-none cursor-pointer">Return to Login</button>
                        </div>`;
                });
                return;
            }

            if (keys.length > 2) {
                keys.sort((a, b) => sessions[a] - sessions[b]);
                keys.slice(0, keys.length - 2).forEach(oldKey => {
                    remove(ref(db, `users/${user.uid}/active_sessions/${oldKey}`)).catch(() => {});
                });
            }
        });
        MPPStore._userUnsubs.push(unsub);
    } catch (e) {
        console.error("Session guard error:", e);
    }
}

// One-Time Session-Cached Load for Global Flags & App Config (Zero persistent socket)
async function loadGlobalMeta(forceLive = false) {
    if (forceLive) {
        MPPStore._userUnsubs.push(
            onValue(ref(db, "settings/global"), (snap) => {
                MPPStore.featureFlags = parseFeatureFlags(snap.val() || {});
                writeSessionCache("global_flags", MPPStore.featureFlags);
                emit("flags", MPPStore.featureFlags);
            }),
            onValue(ref(db, "portal_config/app"), (snap) => {
                const v = snap.val() || {};
                MPPStore.appConfig = {
                    bannerText: String(v.bannerText || ""),
                    bannerActive: Boolean(v.bannerActive),
                    maintenanceMode: Boolean(v.maintenanceMode),
                    pricing: v.pricing || null
                };
                writeSessionCache("app_config", MPPStore.appConfig);
                emit("appConfig", MPPStore.appConfig);
            })
        );
        return;
    }

    const [flags, appCfg] = await Promise.all([
        getSessionCached("global_flags", DEFAULT_TTL_MS, async () => {
            const snap = await get(ref(db, "settings/global")).catch(() => null);
            return parseFeatureFlags(snap?.val() || {});
        }),
        getSessionCached("app_config", DEFAULT_TTL_MS, async () => {
            const snap = await get(ref(db, "portal_config/app")).catch(() => null);
            const v = snap?.val() || {};
            return {
                bannerText: String(v.bannerText || ""),
                bannerActive: Boolean(v.bannerActive),
                maintenanceMode: Boolean(v.maintenanceMode),
                pricing: v.pricing || null
            };
        })
    ]);

    MPPStore.featureFlags = flags;
    MPPStore.appConfig = appCfg;
    emit("flags", MPPStore.featureFlags);
    emit("appConfig", MPPStore.appConfig);
}

loadGlobalMeta(false);

// Single Unified Auth Listener
onAuthStateChanged(auth, async (user) => {
    clearUserListeners();
    MPPStore.authReady = true;
    MPPStore.user = user;
    MPPStore.isAdmin = isUserAdmin(user);

    if (!user) {
        MPPStore.profile = {};
        MPPStore.bookmarks = {};
        MPPStore.userStatus = { isVIP: false, daysLeft: 0, validUntil: null, expired: false };
        MPPStore.accessLevel = "guest";
        emit("auth", MPPStore);
        return;
    }

    const forceRefreshSub = new URLSearchParams(window.location.search).has("refreshSub");
    if (forceRefreshSub) invalidateSessionCache(`sub_${user.uid}`);

    if (MPPStore.isAdmin) {
        // Admins keep live listeners for instant authoring feedback
        loadGlobalMeta(true);
        MPPStore.userStatus = { isVIP: true, daysLeft: 999, validUntil: "Lifetime Access", expired: false };
        MPPStore.accessLevel = "premium";

        const [profSnap, bmkSnap] = await Promise.all([
            get(ref(db, `users/${user.uid}/profile`)).catch(() => null),
            get(ref(db, `users/${user.uid}/bookmarks`)).catch(() => null)
        ]);
        MPPStore.profile = profSnap?.val() || {};
        MPPStore.bookmarks = bmkSnap?.exists() ? bmkSnap.val() : {};
        emit("profile", MPPStore.profile);
        emit("bookmarks", MPPStore.bookmarks);
        emit("auth", MPPStore);

        if (!MPPStore.adminModule) {
            try {
                const mod = await import("./admin-suite.js");
                MPPStore.adminModule = mod;
                if (typeof mod.initAdminSuite === "function") mod.initAdminSuite();
                emit("adminReady", mod);
            } catch (e) {
                console.warn("[core-firebase] admin-suite load warning:", e.message);
            }
        }
        return;
    }

    // Non-admin students: 1-time session-cached gets + tiny 2-device session listener
    startSessionGuard(user);

    const [profile, bookmarks, subRaw] = await Promise.all([
        getSessionCached(`prof_${user.uid}`, DEFAULT_TTL_MS, async () => {
            const s = await get(ref(db, `users/${user.uid}/profile`)).catch(() => null);
            return s?.val() || {};
        }),
        getSessionCached(`bmk_${user.uid}`, DEFAULT_TTL_MS, async () => {
            const s = await get(ref(db, `users/${user.uid}/bookmarks`)).catch(() => null);
            return s?.exists() ? s.val() : {};
        }),
        getSessionCached(`sub_${user.uid}`, 10 * 60 * 1000, async () => {
            const s = await get(ref(db, `users/${user.uid}/subscription`)).catch(() => null);
            return s?.exists() ? s.val() : null;
        })
    ]);

    MPPStore.profile = profile;
    MPPStore.bookmarks = bookmarks;
    MPPStore.userStatus = parseSubscription(subRaw);
    MPPStore.accessLevel = MPPStore.userStatus.isVIP ? "premium" : "free";

    emit("profile", MPPStore.profile);
    emit("bookmarks", MPPStore.bookmarks);
    emit("auth", MPPStore);
});

// ============================================================================
// AUTH, PROFILE & BOOKMARK ACTIONS (Optimistically update cache & store)
// ============================================================================
export async function loginWithEmail(email, password) {
    invalidateSessionCache();
    return signInWithEmailAndPassword(auth, email.trim(), password);
}

export async function signUpWithEmail({ fullName, email, password, joinYear, college, country, city, phone }) {
    invalidateSessionCache();
    const uc = await createUserWithEmailAndPassword(auth, email.trim(), password);
    await updateProfile(uc.user, { displayName: fullName.trim() });
    const profileObj = {
        fullName: fullName.trim(),
        email: email.trim(),
        joinYear,
        college: college.trim(),
        country: country || "India",
        city: (city || "").trim() || "Not provided",
        phone: (phone || "").trim() || "Not provided",
        createdAt: new Date().toISOString()
    };
    await set(ref(db, `users/${uc.user.uid}/profile`), profileObj);
    writeSessionCache(`prof_${uc.user.uid}`, profileObj);
    return uc.user;
}

export async function sendResetEmail(email) {
    return sendPasswordResetEmail(auth, email.trim());
}

export async function logoutUser() {
    localStorage.removeItem("my_session_token");
    invalidateSessionCache();
    await signOut(auth);
    window.location.reload();
}

export async function updateUserProfile({ fullName, joinYear, college, city, phone }) {
    if (!MPPStore.user) throw new Error("Not signed in.");
    const patch = { fullName, joinYear, college, city, phone };
    await update(ref(db, `users/${MPPStore.user.uid}/profile`), patch);
    if (MPPStore.user.displayName !== fullName) {
        await updateProfile(MPPStore.user, { displayName: fullName });
    }
    MPPStore.profile = { ...MPPStore.profile, ...patch };
    writeSessionCache(`prof_${MPPStore.user.uid}`, MPPStore.profile);
    emit("profile", MPPStore.profile);
}

export async function saveOrRemoveBookmark(uniqueId, bookmarkData, isCurrentlySaved) {
    if (!MPPStore.user) throw new Error("Sign in required.");
    const uid = MPPStore.user.uid;
    const dbRef = ref(db, `users/${uid}/bookmarks/${uniqueId}`);

    if (isCurrentlySaved) {
        await remove(dbRef);
        const next = { ...MPPStore.bookmarks };
        delete next[uniqueId];
        MPPStore.bookmarks = next;
        writeSessionCache(`bmk_${uid}`, next);
        emit("bookmarks", next);
        return false;
    }

    const payload = {
        ...bookmarkData,
        collegeCode: MPPStore.page.collegeCode || "deoghar",
        subjectCode: MPPStore.page.subjectCode || "",
        versionCode: MPPStore.page.versionCode || "",
        current_step: 1,
        next_review_date: Date.now(),
        timestamp: new Date().toISOString()
    };
    await set(dbRef, payload);
    const next = { ...MPPStore.bookmarks, [uniqueId]: payload };
    MPPStore.bookmarks = next;
    writeSessionCache(`bmk_${uid}`, next);
    emit("bookmarks", next);
    return true;
}

export async function deleteBookmarkByKey(keyOrQid) {
    if (!MPPStore.user) return;
    const uid = MPPStore.user.uid;
    let targetKey = keyOrQid;
    if (!MPPStore.bookmarks[keyOrQid]) {
        const found = Object.keys(MPPStore.bookmarks).find(k => MPPStore.bookmarks[k]?.q === keyOrQid);
        if (found) targetKey = found;
    }
    await remove(ref(db, `users/${uid}/bookmarks/${targetKey}`));
    const next = { ...MPPStore.bookmarks };
    delete next[targetKey];
    MPPStore.bookmarks = next;
    writeSessionCache(`bmk_${uid}`, next);
    emit("bookmarks", next);
}

export async function updateBookmarkSRS(key, step, nextReviewDate) {
    if (!MPPStore.user) return;
    const uid = MPPStore.user.uid;
    await update(ref(db, `users/${uid}/bookmarks/${key}`), {
        current_step: step,
        next_review_date: nextReviewDate
    });
    if (MPPStore.bookmarks[key]) {
        MPPStore.bookmarks[key] = { ...MPPStore.bookmarks[key], current_step: step, next_review_date: nextReviewDate };
        writeSessionCache(`bmk_${uid}`, MPPStore.bookmarks);
        emit("bookmarks", MPPStore.bookmarks);
    }
}

export { ref, get, set, update, remove, onValue };
