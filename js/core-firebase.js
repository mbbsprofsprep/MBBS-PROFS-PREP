// ============================================================================
// js/core-firebase.js
// Single Firebase v11 Instance: Auth, 3-Admin Guard, Reactive Store, Profile,
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

// STRICT 3-ADMIN LIST (Matches Firebase Realtime Database Rules)
export const ADMIN_EMAILS = Object.freeze([
    "pankajmahto109@gmail.com",
    "educateindiainstitute@gmail.com",
    "pankajkumarmahto1009@gmail.com"
]);

export const APP_LOGO_URL = "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEgFbo8CVZSf-ejwVGTTTGeu1B5bJj4JGloqdh70o21Tf_895kWYOvNmyE9cnAAR66r77ZFZZKTslF6QIp4F-bWxPsXjGsAWzwc75D6VnXqFMbi-4NgUazELmmMWeyX3ApASZncrHUFjni62u4spE3g19Pfcbsy-h5iUTfxTXWWTEYPgaD47kLMDA43e1SMQ/s678/1000126459.jpg";

const fbApp = getApps().find(a => a.name === "[DEFAULT]") || initializeApp(PROFS_FIREBASE_CONFIG);
export const auth = getAuth(fbApp);
export const db = getDatabase(fbApp);

// Centralized Reactive Application Store
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

// 2-Device Session Guard (Applies to non-admins on all pages)
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

// Global Feature Flags Listener (Read-only for everyone)
onValue(ref(db, "settings/global"), (snap) => {
    const val = snap.val() || {};
    const f = val.features || {};
    MPPStore.featureFlags = {
        showNeuroRecall: Boolean(val.showNeuroRecall),
        showTeenPatti: f.showTeenPatti !== undefined ? Boolean(f.showTeenPatti) : true,
        showCrossExamPG: Boolean(f.showCrossExamPG),
        showAnswerCards: Boolean(f.showAnswerCards)
    };
    emit("flags", MPPStore.featureFlags);
});

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

    startSessionGuard(user);

    // 1. User Profile
    MPPStore._userUnsubs.push(
        onValue(ref(db, `users/${user.uid}/profile`), (snap) => {
            MPPStore.profile = snap.val() || {};
            emit("profile", MPPStore.profile);
        })
    );

    // 2. Cloud Bookmarks
    MPPStore._userUnsubs.push(
        onValue(ref(db, `users/${user.uid}/bookmarks`), (snap) => {
            MPPStore.bookmarks = snap.exists() ? snap.val() : {};
            emit("bookmarks", MPPStore.bookmarks);
        })
    );

    // 3. Role & Subscription + Lazy-load Admin Suite ONLY for the 3 Admins
    if (MPPStore.isAdmin) {
        MPPStore.userStatus = { isVIP: true, daysLeft: 999, validUntil: "Lifetime Access", expired: false };
        MPPStore.accessLevel = "premium";
        emit("auth", MPPStore);

        if (!MPPStore.adminModule) {
            try {
                const mod = await import("./admin-suite.js");
                MPPStore.adminModule = mod;
                if (typeof mod.initAdminSuite === "function") {
                    mod.initAdminSuite();
                }
                emit("adminReady", mod);
            } catch (e) {
                console.warn("[core-firebase] admin-suite.js will load once created:", e.message);
            }
        }
    } else {
        MPPStore._userUnsubs.push(
            onValue(ref(db, `users/${user.uid}/subscription`), (snap) => {
                let sub = { isVIP: false, daysLeft: 0, validUntil: null, expired: false };
                if (snap.exists()) {
                    const d = snap.val();
                    const today = new Date(); today.setHours(0, 0, 0, 0);
                    const exp = new Date(d.validUntil); exp.setHours(0, 0, 0, 0);
                    const diff = Math.ceil((exp - today) / 86400000);
                    if (diff >= 0 && d.status === "active") {
                        sub = { isVIP: true, daysLeft: diff, validUntil: d.validUntil, expired: false };
                    } else {
                        sub = { isVIP: false, daysLeft: diff, validUntil: d.validUntil, expired: true };
                    }
                }
                MPPStore.userStatus = sub;
                MPPStore.accessLevel = sub.isVIP ? "premium" : "free";
                emit("auth", MPPStore);
            })
        );
    }
});

// ============================================================================
// AUTH, PROFILE & BOOKMARK ACTIONS
// ============================================================================
export async function loginWithEmail(email, password) {
    return signInWithEmailAndPassword(auth, email.trim(), password);
}

export async function signUpWithEmail({ fullName, email, password, joinYear, college, country, city, phone }) {
    const uc = await createUserWithEmailAndPassword(auth, email.trim(), password);
    await updateProfile(uc.user, { displayName: fullName.trim() });
    await set(ref(db, `users/${uc.user.uid}/profile`), {
        fullName: fullName.trim(),
        email: email.trim(),
        joinYear,
        college: college.trim(),
        country: country || "India",
        city: (city || "").trim() || "Not provided",
        phone: (phone || "").trim() || "Not provided",
        createdAt: new Date().toISOString()
    });
    return uc.user;
}

export async function sendResetEmail(email) {
    return sendPasswordResetEmail(auth, email.trim());
}

export async function logoutUser() {
    localStorage.removeItem("my_session_token");
    await signOut(auth);
    window.location.reload();
}

export async function updateUserProfile({ fullName, joinYear, college, city, phone }) {
    if (!MPPStore.user) throw new Error("Not signed in.");
    await update(ref(db, `users/${MPPStore.user.uid}/profile`), {
        fullName, joinYear, college, city, phone
    });
    if (MPPStore.user.displayName !== fullName) {
        await updateProfile(MPPStore.user, { displayName: fullName });
    }
}

export async function saveOrRemoveBookmark(uniqueId, bookmarkData, isCurrentlySaved) {
    if (!MPPStore.user) throw new Error("Sign in required.");
    const dbRef = ref(db, `users/${MPPStore.user.uid}/bookmarks/${uniqueId}`);
    if (isCurrentlySaved) {
        await remove(dbRef);
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
    return true;
}

export async function deleteBookmarkByKey(keyOrQid) {
    if (!MPPStore.user) return;
    let targetKey = keyOrQid;
    if (!MPPStore.bookmarks[keyOrQid]) {
        const found = Object.keys(MPPStore.bookmarks).find(k => MPPStore.bookmarks[k]?.q === keyOrQid);
        if (found) targetKey = found;
    }
    await remove(ref(db, `users/${MPPStore.user.uid}/bookmarks/${targetKey}`));
}

export async function updateBookmarkSRS(key, step, nextReviewDate) {
    if (!MPPStore.user) return;
    await update(ref(db, `users/${MPPStore.user.uid}/bookmarks/${key}`), {
        current_step: step,
        next_review_date: nextReviewDate
    });
}

// Re-export modular RTDB helpers so all other files use the exact same SDK version
export { ref, get, set, update, remove, onValue };
