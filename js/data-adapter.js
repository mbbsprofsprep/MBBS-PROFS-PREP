// ============================================================================
// js/data-adapter.js (Phase 1 — Version-Gated Cache + On-Demand Answers + Delta Edits)
// Unified Data & Cache Layer for BOTH review.html and clinical.html
// ============================================================================
import {
    db,
    MPPStore,
    isUserAdmin,
    getSessionCached,
    invalidateSessionCache,
    ref,
    get,
    set,
    update,
    remove,
    onValue
} from "./core-firebase.js";
import { resolveSubjectMeta, resolveCollegeName } from "./subject-registry.js";

const IDB_NAME = "MBBSProfsPrepVaultDB";
const IDB_STORE = "question_banks_cache";

function requireAdmin() {
    if (!isUserAdmin()) throw new Error("Admin access strictly required.");
}

// ============================================================================
// 1. INDEXEDDB CACHE HELPERS
// ============================================================================
function openIDB() {
    return new Promise((resolve) => {
        if (!window.indexedDB) return resolve(null);
        const req = window.indexedDB.open(IDB_NAME, 1);
        req.onupgradeneeded = (e) => {
            const idb = e.target.result;
            if (!idb.objectStoreNames.contains(IDB_STORE)) idb.createObjectStore(IDB_STORE);
        };
        req.onsuccess = (e) => resolve(e.target.result);
        req.onerror = () => resolve(null);
    });
}

export async function idbGet(key) {
    try {
        const idb = await openIDB();
        if (!idb) return null;
        return await new Promise((resolve) => {
            const req = idb.transaction(IDB_STORE, "readonly").objectStore(IDB_STORE).get(key);
            req.onsuccess = () => resolve(req.result || null);
            req.onerror = () => resolve(null);
        });
    } catch (_) { return null; }
}

export async function idbSet(key, val) {
    try {
        const idb = await openIDB();
        if (!idb) return;
        await new Promise((resolve) => {
            const tx = idb.transaction(IDB_STORE, "readwrite");
            tx.objectStore(IDB_STORE).put(val, key);
            tx.oncomplete = resolve;
            tx.onerror = resolve;
        });
    } catch (_) {}
}

export async function clearLocalBankCache() {
    invalidateSessionCache();
    try {
        const idb = await openIDB();
        if (idb) {
            await new Promise((resolve) => {
                const tx = idb.transaction(IDB_STORE, "readwrite");
                tx.objectStore(IDB_STORE).clear();
                tx.oncomplete = resolve;
                tx.onerror = resolve;
            });
        }
    } catch (_) {}
}

// ============================================================================
// 2. VAULT KEY RESOLVER & DATA SANITIZER
// ============================================================================
export function getVaultKeys(custom = {}) {
    const p = MPPStore.page;
    const isClinical = (custom.mode || p.mode) === "clinical";
    const college = String(custom.collegeCode || p.collegeCode || "deoghar").toLowerCase().trim();
    const meta = resolveSubjectMeta(custom.subjectSlug || p.subjectSlug || p.subjectCode || "cfm");
    const rawSub = meta.code;

    let rawVer = String(custom.versionCode !== undefined ? custom.versionCode : (p.versionCode || "")).toLowerCase().trim();
    const ver = (!rawVer || rawVer === "standard" || rawVer === "default" || rawVer === "std") ? "" : rawVer;
    const verUpper = ver.toUpperCase();

    const subjectKey = (!isClinical && ver) ? `${rawSub}_${verUpper}` : rawSub;
    const settingsKey = isClinical ? `${rawSub}_CLINICAL` : subjectKey;

    const candidateKeys = [];
    const addKey = (k) => { if (k && !candidateKeys.includes(k)) candidateKeys.push(k); };
    const bases = meta.aliases || [rawSub, rawSub.toLowerCase()];

    if (ver) {
        bases.forEach(b => {
            addKey(`${b}_${verUpper}`); addKey(`${b}_${ver}`);
            addKey(`${b}-${verUpper}`); addKey(`${b}-${ver}`);
        });
    } else {
        bases.forEach(b => {
            addKey(b); addKey(`${b}_STANDARD`); addKey(`${b}_standard`);
        });
    }

    const subLower = rawSub.toLowerCase();
    const shortLower = subLower === "pathology" ? "patho" : (subLower === "microbiology" ? "micro" : subLower);
    const candidateFileNames = [];
    const addFile = (f) => { if (f && !candidateFileNames.includes(f)) candidateFileNames.push(f); };

    if (ver) {
        addFile(`${subLower}_aiims_${college}_${ver}_data.json`);
        addFile(`${subLower}_${ver}_aiims_${college}_data.json`);
        addFile(`${subLower}_aiims_${college}_data_${ver}.json`);
        if (shortLower !== subLower) addFile(`${shortLower}_aiims_${college}_${ver}_data.json`);
    } else {
        addFile(`${subLower}_aiims_${college}_data.json`);
        if (shortLower !== subLower) addFile(`${shortLower}_aiims_${college}_data.json`);
    }

    return {
        isClinical, college, rawSub, bridgeSlug: meta.bridgeSlug, ver, subjectKey, settingsKey,
        candidateKeys, fileName: candidateFileNames[0], candidateFileNames
    };
}

export function sanitizeBankPayload(rawPayload, collegeFallback = "deoghar") {
    if (!rawPayload) return null;
    let rawList = [], rawCurr = [];
    let collegeName = resolveCollegeName(collegeFallback);

    if (Array.isArray(rawPayload)) {
        rawList = rawPayload;
    } else if (typeof rawPayload === "object") {
        if (rawPayload.collegeName) collegeName = String(rawPayload.collegeName);
        if (rawPayload.curriculumData) {
            rawCurr = Array.isArray(rawPayload.curriculumData) ? rawPayload.curriculumData : Object.values(rawPayload.curriculumData);
        }
        if (rawPayload.qnaData) {
            rawList = Array.isArray(rawPayload.qnaData) ? rawPayload.qnaData : Object.values(rawPayload.qnaData);
        }
    }

    const curriculumData = rawCurr.filter(Boolean).map(g => {
        if (typeof g === "string") return g;
        if (typeof g === "object") {
            return {
                ...g,
                unit: String(g.unit || ""),
                chapters: (Array.isArray(g.chapters) ? g.chapters : Object.values(g.chapters || {})).map(String)
            };
        }
        return String(g);
    });

    const qnaData = rawList.filter(Boolean).map((item, idx) => {
        const clean = { ...item };
        clean.q = String(item.q || `Q${idx + 1}`).trim();
        clean.stem = String(item.stem ?? "");
        clean.type = String(item.type || (item.options ? "MCQ" : "Theory"));
        clean.ans_key = String(item.ans_key ?? "").trim().toUpperCase();
        clean.chapter = Array.isArray(item.chapter)
            ? item.chapter.filter(Boolean).map(String)
            : String(item.chapter || "General");
        clean.examBatch = Array.isArray(item.examBatch)
            ? item.examBatch.filter(Boolean).map(String)
            : String(item.examBatch || "Prof Exam");

        if (item.options) {
            const arr = Array.isArray(item.options) ? item.options : Object.values(item.options);
            clean.options = arr.map(o => String(o ?? ""));
        }
        return clean;
    });

    return { collegeName, curriculumData, qnaData };
}

// Fetch tiny ~120-byte bank_meta once per subject (cached 5 min in sessionStorage)
async function getSubjectMeta(college, candidateKeys, subjectKey) {
    return getSessionCached(`meta_${college}_${subjectKey}`, 5 * 60 * 1000, async () => {
        for (const k of candidateKeys) {
            const snap = await get(ref(db, `bank_meta/${college}/${k}`)).catch(() => null);
            if (snap && snap.exists()) return { matchedKey: k, ...snap.val() };
        }
        return { matchedKey: subjectKey, version: 0, answersVersion: 0, editsVersion: 0 };
    });
}

// ============================================================================
// 3. COST-OPTIMIZED READ OPERATIONS
// ============================================================================
export async function loadReviewBank() {
    if (!MPPStore.user) {
        return { collegeName: MPPStore.page.collegeName, curriculumData: [], qnaData: [], sourceTag: "guest" };
    }

    const { college, subjectKey, candidateKeys, candidateFileNames } = getVaultKeys({ mode: "review" });
    const isPro = MPPStore.isAdmin || MPPStore.accessLevel === "premium";

    if (isPro) {
        const meta = await getSubjectMeta(college, candidateKeys, subjectKey);
        const remoteVersion = meta.version || 0;
        const idbKey = `pro_${college}_${subjectKey}`;

        if (remoteVersion) {
            const cached = await idbGet(idbKey);
            if (cached && cached.version === remoteVersion && Array.isArray(cached.qnaData) && cached.qnaData.length) {
                return { ...sanitizeBankPayload(cached, college), sourceTag: "firebase-cache" };
            }
        }

        const keysToTry = meta.matchedKey ? [meta.matchedKey, ...candidateKeys.filter(k => k !== meta.matchedKey)] : candidateKeys;
        for (const k of keysToTry) {
            const snap = await get(ref(db, `question_banks/${college}/${k}`)).catch(() => null);
            if (snap && snap.exists()) {
                const clean = sanitizeBankPayload(snap.val(), college);
                if (clean && clean.qnaData.length) {
                    await idbSet(idbKey, { version: remoteVersion || Date.now(), ...clean });
                    return { ...clean, sourceTag: "firebase-pro" };
                }
            }
        }
    } else {
        const idbKey = `prev_${college}_${subjectKey}`;
        const meta = await getSubjectMeta(college, candidateKeys, subjectKey);
        const cached = await idbGet(idbKey);
        if (cached && meta.version && cached.version === meta.version && cached.qnaData?.length) {
            return { ...sanitizeBankPayload(cached, college), sourceTag: "firebase-preview-cache" };
        }
        for (const k of candidateKeys) {
            const snap = await get(ref(db, `question_previews/${college}/${k}`)).catch(() => null);
            if (snap && snap.exists()) {
                const clean = sanitizeBankPayload(snap.val(), college);
                if (clean && clean.qnaData.length) {
                    await idbSet(idbKey, { version: meta.version || Date.now(), ...clean });
                    return { ...clean, sourceTag: "firebase-preview" };
                }
            }
        }
    }

    // Fallback to static GitHub JSON file
    for (const fname of candidateFileNames) {
        try {
            const res = await fetch(fname);
            if (res.ok) {
                const clean = sanitizeBankPayload(await res.json(), college);
                if (clean && clean.qnaData.length) {
                    if (!isPro) {
                        clean.qnaData = [
                            ...clean.qnaData.filter(q => q.type === "Theory").slice(0, 10),
                            ...clean.qnaData.filter(q => q.type === "MCQ").slice(0, 10)
                        ];
                    }
                    return { ...clean, sourceTag: "github-fallback" };
                }
            }
        } catch (_) {}
    }

    return { collegeName: MPPStore.page.collegeName, curriculumData: [], qnaData: [], sourceTag: "not-found" };
}

// ON-DEMAND SINGLE-ANSWER LOADER (Phase 2 calls this on "View Answer" click -> ~85% less RTDB egress)
export async function getAnswerOnDemand(qId) {
    if (!qId) return "";
    const { isClinical, college, rawSub, subjectKey, candidateKeys } = getVaultKeys();
    const cacheKey = `ans_single_${college}_${isClinical ? rawSub + "_CLIN" : subjectKey}_${qId}`;

    let remoteVer = 0;
    if (isClinical) {
        const meta = await getSessionCached(`cmeta_${college}_${rawSub}`, 5 * 60 * 1000, async () => {
            const s = await get(ref(db, `clinical_meta/${college}/${rawSub}/version`)).catch(() => null);
            return s?.val() || 0;
        });
        remoteVer = Number(meta || 0);
    } else {
        const meta = await getSubjectMeta(college, candidateKeys, subjectKey);
        remoteVer = Number(meta.answersVersion || meta.version || 0);
    }

    const cached = await idbGet(cacheKey);
    if (cached && cached.ver === remoteVer) {
        return cached.text || "";
    }

    const primaryPath = isClinical
        ? `clinical_data/${college}/${rawSub}/${qId}/answer`
        : `answers/${college}/${subjectKey}/${qId}/text`;
    let snap = await get(ref(db, primaryPath)).catch(() => null);

    if ((!snap || !snap.exists()) && !isClinical && subjectKey !== rawSub) {
        snap = await get(ref(db, `answers/${college}/${rawSub}/${qId}/text`)).catch(() => null);
    }

    const text = snap?.exists() ? String(snap.val()) : "";
    await idbSet(cacheKey, { ver: remoteVer, text });
    return text;
}

// Backwards-compatible Answers Loader:
// - Admins get live onValue (instant publishing feedback)
// - Students get version-gated IndexedDB cache via 1-time get() (0 KB repeat loads)
export function subscribeReviewAnswers(callback) {
    const { college, rawSub, ver, subjectKey, candidateKeys } = getVaultKeys({ mode: "review" });

    if (isUserAdmin()) {
        let baseAns = {}, verAns = {};
        const emit = () => callback({ ...baseAns, ...verAns });
        const u1 = onValue(ref(db, `answers/${college}/${rawSub}`), (s) => { baseAns = s.val() || {}; emit(); });
        const u2 = ver
            ? onValue(ref(db, `answers/${college}/${subjectKey}`), (s) => { verAns = s.val() || {}; emit(); })
            : () => {};
        return () => { u1(); u2(); };
    }

    let cancelled = false;
    (async () => {
        const meta = await getSubjectMeta(college, candidateKeys, subjectKey);
        const ansVer = Number(meta.answersVersion || meta.version || 1);
        const idbKey = `ans_map_${college}_${subjectKey}`;
        const cached = await idbGet(idbKey);

        if (cached && cached.ver === ansVer && cached.data) {
            if (!cancelled) callback(cached.data);
            return;
        }

        const [s1, s2] = await Promise.all([
            get(ref(db, `answers/${college}/${rawSub}`)).catch(() => null),
            ver ? get(ref(db, `answers/${college}/${subjectKey}`)).catch(() => null) : Promise.resolve(null)
        ]);
        const merged = { ...(s1?.val() || {}), ...(s2?.val() || {}) };
        await idbSet(idbKey, { ver: ansVer, data: merged });
        if (!cancelled) callback(merged);
    })();

    return () => { cancelled = true; };
}

// Question Edits:
// - Students read ONLY `overrides` via version-gated IndexedDB (never download undoStack/redoStack!)
// - Admins get live `overrides` + `admin_private/question_edits_history`
export function subscribeReviewEdits(callback) {
    const { college, rawSub, subjectKey, candidateKeys } = getVaultKeys({ mode: "review" });

    if (isUserAdmin()) {
        let overrides = {}, undoStack = [], redoStack = [];
        const emit = () => callback({ overrides, undoStack, redoStack });

        const u1 = onValue(ref(db, `question_edits/${college}/${rawSub}/overrides`), (s) => {
            overrides = s.val() || {};
            emit();
        });
        const u2 = onValue(ref(db, `admin_private/question_edits_history/${college}/${rawSub}`), (s) => {
            const v = s.val() || {};
            undoStack = (Array.isArray(v.undoStack) ? v.undoStack : Object.values(v.undoStack || {})).filter(Boolean).slice(0, 10);
            redoStack = (Array.isArray(v.redoStack) ? v.redoStack : Object.values(v.redoStack || {})).filter(Boolean).slice(0, 10);
            emit();
        });
        return () => { u1(); u2(); };
    }

    let cancelled = false;
    (async () => {
        const meta = await getSubjectMeta(college, candidateKeys, subjectKey);
        const editsVer = Number(meta.editsVersion || meta.version || 1);
        const idbKey = `edits_${college}_${rawSub}`;
        const cached = await idbGet(idbKey);

        if (cached && cached.ver === editsVer && cached.overrides) {
            if (!cancelled) callback({ overrides: cached.overrides, undoStack: [], redoStack: [] });
            return;
        }

        const snap = await get(ref(db, `question_edits/${college}/${rawSub}/overrides`)).catch(() => null);
        const overrides = snap?.val() || {};
        await idbSet(idbKey, { ver: editsVer, overrides });
        if (!cancelled) callback({ overrides, undoStack: [], redoStack: [] });
    })();

    return () => { cancelled = true; };
}

// Clinical Data:
// - Admins keep live onValue for instant add/edit/reorder
// - Students use `clinical_meta` version-gated IndexedDB cache via 1-time get()
function parseClinicalSnapshot(data = {}) {
    const qnaData = Object.keys(data).map(key => ({
        q: key,
        stem: String(data[key].stem || ""),
        chapter: Array.isArray(data[key].chapter) ? data[key].chapter : [String(data[key].chapter || "General Clinical")],
        type: data[key].type || "Theory",
        examBatch: data[key].examBatch || "Clinical Wards",
        options: Array.isArray(data[key].options) ? data[key].options.map(String) : null,
        ans_key: String(data[key].ans_key || "").trim().toUpperCase(),
        order: Number(data[key].order || 0)
    })).sort((a, b) => a.order - b.order);

    const liveAnswers = {};
    Object.keys(data).forEach(k => {
        if (data[k]?.answer) liveAnswers[k] = { text: data[k].answer };
    });
    return { qnaData, liveAnswers };
}

export function subscribeClinicalData(callback) {
    const { college, rawSub } = getVaultKeys({ mode: "clinical" });

    if (isUserAdmin()) {
        return onValue(ref(db, `clinical_data/${college}/${rawSub}`), (snap) => {
            callback(parseClinicalSnapshot(snap.val() || {}));
        });
    }

    let cancelled = false;
    (async () => {
        const metaVer = await getSessionCached(`cmeta_${college}_${rawSub}`, 5 * 60 * 1000, async () => {
            const s = await get(ref(db, `clinical_meta/${college}/${rawSub}/version`)).catch(() => null);
            return Number(s?.val() || 1);
        });
        const idbKey = `clin_${college}_${rawSub}`;
        const cached = await idbGet(idbKey);

        if (cached && cached.ver === metaVer && cached.parsed) {
            if (!cancelled) callback(cached.parsed);
            return;
        }

        const snap = await get(ref(db, `clinical_data/${college}/${rawSub}`)).catch(() => null);
        const parsed = parseClinicalSnapshot(snap?.val() || {});
        await idbSet(idbKey, { ver: metaVer, parsed });
        if (!cancelled) callback(parsed);
    })();

    return () => { cancelled = true; };
}

// Subject Settings (showAnswers toggle):
// - Admins: live onValue
// - Students: 1-time get() cached 15 min in sessionStorage
export function subscribeSubjectSettings(callback) {
    const { college, settingsKey } = getVaultKeys();

    if (isUserAdmin()) {
        return onValue(ref(db, `settings/${college}/${settingsKey}`), (snap) => {
            callback({ showAnswers: Boolean(snap.val()?.showAnswers) });
        });
    }

    let cancelled = false;
    getSessionCached(`sset_${college}_${settingsKey}`, 15 * 60 * 1000, async () => {
        const snap = await get(ref(db, `settings/${college}/${settingsKey}`)).catch(() => null);
        return { showAnswers: Boolean(snap?.val()?.showAnswers) };
    }).then(val => { if (!cancelled) callback(val); });

    return () => { cancelled = true; };
}

// Cross-Links (Teen Patti) Version-Gated Loader (Skips heavy `shared_q_cache` & admin `history` for students)
export function subscribeCrossLinks(bridgeSlug, callback) {
    if (isUserAdmin()) {
        let base = {}, hist = [];
        const emit = () => callback({ ...base, history: hist });
        const u1 = onValue(ref(db, `cross_links/${bridgeSlug}`), (s) => {
            base = s.val() || {};
            if (!hist.length && base.history) {
                hist = (Array.isArray(base.history) ? base.history : Object.values(base.history)).filter(Boolean).slice(0, 10);
            }
            emit();
        });
        const u2 = onValue(ref(db, `admin_private/cross_links_history/${bridgeSlug}`), (s) => {
            if (s.exists()) {
                const v = s.val();
                hist = (Array.isArray(v) ? v : Object.values(v)).filter(Boolean).slice(0, 10);
                emit();
            }
        });
        return () => { u1(); u2(); };
    }

    let cancelled = false;
    (async () => {
        const clVer = await getSessionCached(`clmeta_${bridgeSlug}`, 10 * 60 * 1000, async () => {
            const s = await get(ref(db, `cross_links/${bridgeSlug}/version`)).catch(() => null);
            return Number(s?.val() || 1);
        });
        const idbKey = `cl_${bridgeSlug}`;
        const cached = await idbGet(idbKey);
        if (cached && cached.ver === clVer && cached.data) {
            if (!cancelled) callback(cached.data);
            return;
        }

        // Fetch ONLY clusters, node_topics, and nodes — NOT shared_q_cache or admin history
        const [cSnap, ntSnap, nSnap] = await Promise.all([
            get(ref(db, `cross_links/${bridgeSlug}/clusters`)).catch(() => null),
            get(ref(db, `cross_links/${bridgeSlug}/node_topics`)).catch(() => null),
            get(ref(db, `cross_links/${bridgeSlug}/nodes`)).catch(() => null)
        ]);
        const data = {
            clusters: cSnap?.val() || {},
            node_topics: ntSnap?.val() || {},
            nodes: nSnap?.val() || {},
            history: []
        };
        await idbSet(idbKey, { ver: clVer, data });
        if (!cancelled) callback(data);
    })();

    return () => { cancelled = true; };
}

// On-Demand Single PG Card Loader (Fetches 1 PG MCQ only when a student opens it)
export async function getSharedPGQuestion(bridgeSlug, qid) {
    if (!bridgeSlug || !qid) return null;
    const up = String(qid).trim().toUpperCase();
    const cacheKey = `pgq_${bridgeSlug}_${up}`;
    const cached = await idbGet(cacheKey);
    if (cached) return cached;

    const snap = await get(ref(db, `cross_links/${bridgeSlug}/shared_q_cache/${up}`)).catch(() => null);
    if (!snap || !snap.exists()) return null;
    const val = snap.val();
    await idbSet(cacheKey, val);
    return val;
}

// ============================================================================
// 4. STUDENT WRITES (Bug Reports & Personal Mnemonic Notes)
// ============================================================================
export async function submitQuestionReport({ qId, reportType, description }) {
    if (!MPPStore.user) throw new Error("Please sign in to report an issue.");
    const { isClinical, college, rawSub, subjectKey } = getVaultKeys();
    const reportId = `RPT_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const payload = {
        id: reportId,
        qid: String(qId || "").trim(),
        college,
        subject: isClinical ? `${rawSub}_CLINICAL` : subjectKey,
        subjectSlug: MPPStore.page.subjectSlug || rawSub.toLowerCase(),
        mode: isClinical ? "clinical" : "review",
        type: String(reportType || "Other"),
        description: String(description || "").trim().slice(0, 600),
        url: window.location.href,
        reportedBy: MPPStore.user.email || MPPStore.user.uid,
        uid: MPPStore.user.uid,
        status: "open",
        createdAt: Date.now()
    };
    await set(ref(db, `reports/${reportId}`), payload);
    return payload;
}

export async function loadUserNotes() {
    if (!MPPStore.user) return {};
    const uid = MPPStore.user.uid;
    return getSessionCached(`notes_${uid}`, 15 * 60 * 1000, async () => {
        const s = await get(ref(db, `users/${uid}/notes`)).catch(() => null);
        return s?.val() || {};
    });
}

export async function saveUserNote(uniqueId, text) {
    if (!MPPStore.user) throw new Error("Sign in required.");
    const uid = MPPStore.user.uid;
    const clean = String(text || "").trim().slice(0, 500);
    const noteRef = ref(db, `users/${uid}/notes/${uniqueId}`);
    if (clean) await set(noteRef, { text: clean, updatedAt: Date.now() });
    else await remove(noteRef);
    invalidateSessionCache(`notes_${uid}`);
    return clean;
}

// ============================================================================
// 5. ADMIN-ONLY WRITE OPERATIONS (Strictly Guarded for Admins)
// ============================================================================
function mergeNewChaptersIntoCurriculum(existingCurr, qnaList) {
    const updatedCurr = JSON.parse(JSON.stringify(existingCurr || []));
    const seen = new Set();
    updatedCurr.forEach(g => {
        if (typeof g === "string") seen.add(g);
        else if (g && Array.isArray(g.chapters)) g.chapters.forEach(c => seen.add(c));
    });

    const added = [];
    qnaList.forEach(item => {
        const list = Array.isArray(item.chapter) ? item.chapter : [item.chapter];
        list.forEach(ch => { if (ch && !seen.has(ch)) { seen.add(ch); added.push(ch); } });
    });

    if (added.length > 0) {
        added.sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" }));
        if (updatedCurr.length === 0 || typeof updatedCurr[0] === "string") {
            updatedCurr.push(...added);
        } else {
            let extra = updatedCurr.find(u => u && u.unit === "Additional Chapters");
            if (!extra) { extra = { unit: "Additional Chapters", chapters: [] }; updatedCurr.push(extra); }
            extra.chapters.push(...added);
        }
    }
    return updatedCurr;
}

async function bumpClinicalVersion(college, rawSub) {
    await set(ref(db, `clinical_meta/${college}/${rawSub}/version`), Date.now()).catch(() => {});
    invalidateSessionCache(`cmeta_${college}_${rawSub}`);
}

export async function uploadFullBank(college, subjectKey, rawPayload) {
    requireAdmin();
    const clean = sanitizeBankPayload(JSON.parse(JSON.stringify(rawPayload || {})), college);
    if (!clean || !clean.qnaData.length) throw new Error("No questions found in payload.");

    const cleanQna = clean.qnaData.map(item => {
        const copy = { ...item };
        delete copy._imgMerged; delete copy._origAnsKey; delete copy._origOptions; delete copy._origStem;
        return copy;
    });
    const curriculumData = mergeNewChaptersIntoCurriculum(clean.curriculumData, cleanQna);
    const previewQna = [
        ...cleanQna.filter(q => q.type === "Theory").slice(0, 10),
        ...cleanQna.filter(q => q.type === "MCQ").slice(0, 10)
    ];

    const versionStamp = Date.now();
    const normSubKey = String(subjectKey).toUpperCase().trim().replace(/_STANDARD$/i, "");
    const normCol = String(college).toLowerCase().trim();

    await update(ref(db), {
        [`question_banks/${normCol}/${normSubKey}`]: {
            collegeName: clean.collegeName, curriculumData, qnaData: cleanQna, version: versionStamp
        },
        [`question_previews/${normCol}/${normSubKey}`]: {
            collegeName: clean.collegeName, curriculumData, qnaData: previewQna, version: versionStamp
        },
        [`bank_meta/${normCol}/${normSubKey}/version`]: versionStamp,
        [`bank_meta/${normCol}/${normSubKey}/totalQuestions`]: cleanQna.length,
        [`bank_meta/${normCol}/${normSubKey}/updatedAt`]: new Date().toISOString(),
        [`bank_meta/${normCol}/${normSubKey}/updatedBy`]: MPPStore.user.email
    });

    invalidateSessionCache(`meta_${normCol}_${normSubKey}`);
    await idbSet(`pro_${normCol}_${normSubKey}`, {
        version: versionStamp, collegeName: clean.collegeName, curriculumData, qnaData: cleanQna
    });

    return { versionStamp, count: cleanQna.length, normSubKey, collegeName: clean.collegeName, curriculumData, qnaData: cleanQna };
}

// Lightweight ~200-byte Delta Override (Avoids rewriting 300 KB question_banks on typo/key fixes)
export async function saveQuestionDeltaOverride(qId, { stem, options, ans_key, explanation }, historyAction = null, currentUndo = []) {
    requireAdmin();
    const { college, rawSub, subjectKey } = getVaultKeys({ mode: "review" });
    const up = String(qId).trim().toUpperCase();
    const now = Date.now();

    const overridePayload = { updatedAt: now };
    if (stem !== undefined) overridePayload.stem = String(stem);
    if (ans_key !== undefined) overridePayload.ans_key = String(ans_key).trim().toUpperCase();
    if (Array.isArray(options)) overridePayload.options = options.map(String);
    if (explanation !== undefined) overridePayload.explanation = String(explanation);

    const updates = {
        [`question_edits/${college}/${rawSub}/overrides/${up}`]: overridePayload,
        [`bank_meta/${college}/${subjectKey}/editsVersion`]: now
    };

    if (explanation !== undefined) {
        updates[`answers/${college}/${subjectKey}/${qId}`] = explanation
            ? { text: explanation, updatedAt: new Date().toISOString(), updatedBy: MPPStore.user.email }
            : null;
        updates[`bank_meta/${college}/${subjectKey}/answersVersion`] = now;
    }

    if (historyAction) {
        updates[`admin_private/question_edits_history/${college}/${rawSub}/undoStack`] = [historyAction, ...currentUndo].slice(0, 10);
        updates[`admin_private/question_edits_history/${college}/${rawSub}/redoStack`] = [];
    }

    await update(ref(db), updates);
    invalidateSessionCache(`meta_${college}_${subjectKey}`);
    return overridePayload;
}

export async function saveQuestion({ qId, editId, stem, options, ans_key, chapter, type, examBatch, answer }, currentQna = [], currentCurriculum = []) {
    requireAdmin();
    const { isClinical, college, rawSub, subjectKey } = getVaultKeys();

    if (isClinical) {
        const existingOrder = editId
            ? (currentQna.find(x => x.q === editId)?.order || Date.now())
            : (currentQna.find(x => x.q === qId)?.order || Date.now());

        const payload = {
            stem,
            chapter: Array.isArray(chapter) ? chapter[0] : (chapter || "General Clinical"),
            type: type || "Theory",
            examBatch: examBatch || "Clinical Wards",
            order: existingOrder,
            timestamp: new Date().toISOString(),
            uploadedBy: MPPStore.user.email
        };
        if (type === "MCQ" && Array.isArray(options)) payload.options = options;
        if (type === "MCQ" && ans_key) payload.ans_key = ans_key;
        if (answer) payload.answer = answer;

        const updates = { [`clinical_data/${college}/${rawSub}/${qId}`]: payload };
        if (editId && editId !== qId) updates[`clinical_data/${college}/${rawSub}/${editId}`] = null;
        await update(ref(db), updates);
        await bumpClinicalVersion(college, rawSub);
        return null;
    }

    // REVIEW / PYQ MODE — Use ~200-byte delta override if editing same QID with unchanged metadata!
    const existingItem = editId && editId === qId
        ? currentQna.find(x => String(x.q).toLowerCase() === String(qId).toLowerCase())
        : null;

    if (existingItem) {
        const sameType = (existingItem.type || "Theory") === (type || "Theory");
        const sameChap = JSON.stringify(existingItem.chapter) === JSON.stringify(chapter || "General");
        const sameBatch = JSON.stringify(existingItem.examBatch) === JSON.stringify(examBatch || "Prof Exam");

        if (sameType && sameChap && sameBatch) {
            await saveQuestionDeltaOverride(qId, {
                stem,
                options: type === "MCQ" ? options : undefined,
                ans_key: type === "MCQ" ? (ans_key || "") : "",
                explanation: answer
            });
            return null;
        }
    }

    // Structural change (new QID, renamed QID, chapter/batch/type change) -> update full bank
    const nextList = [...currentQna];
    const newObj = {
        q: qId,
        type: type || "Theory",
        stem,
        ans_key: type === "MCQ" ? (ans_key || "") : "",
        chapter: chapter || "General",
        examBatch: examBatch || "Prof Exam"
    };
    if (type === "MCQ" && Array.isArray(options)) newObj.options = options;

    const matchKey = String(editId || qId).toLowerCase();
    const idx = nextList.findIndex(x => String(x.q).toLowerCase() === matchKey);
    if (idx !== -1) nextList[idx] = { ...nextList[idx], ...newObj };
    else nextList.push(newObj);

    const ansUpdates = {};
    if (answer) {
        ansUpdates[`answers/${college}/${subjectKey}/${qId}`] = {
            text: answer, updatedAt: new Date().toISOString(), updatedBy: MPPStore.user.email
        };
    } else if (editId) {
        ansUpdates[`answers/${college}/${subjectKey}/${qId}`] = null;
    }
    if (editId && editId !== qId) ansUpdates[`answers/${college}/${subjectKey}/${editId}`] = null;
    if (Object.keys(ansUpdates).length) {
        ansUpdates[`bank_meta/${college}/${subjectKey}/answersVersion`] = Date.now();
        await update(ref(db), ansUpdates);
    }

    return uploadFullBank(college, subjectKey, {
        collegeName: MPPStore.page.collegeName,
        curriculumData: currentCurriculum,
        qnaData: nextList
    });
}

export async function deleteQuestion(qId, currentQna = [], currentCurriculum = []) {
    requireAdmin();
    const { isClinical, college, rawSub, subjectKey } = getVaultKeys();

    if (isClinical) {
        await remove(ref(db, `clinical_data/${college}/${rawSub}/${qId}`));
        await bumpClinicalVersion(college, rawSub);
        return null;
    }

    const nextList = currentQna.filter(x => String(x.q) !== String(qId));
    await update(ref(db), {
        [`answers/${college}/${subjectKey}/${qId}`]: null,
        [`question_edits/${college}/${rawSub}/overrides/${String(qId).toUpperCase()}`]: null,
        [`bank_meta/${college}/${subjectKey}/answersVersion`]: Date.now()
    }).catch(() => {});

    return uploadFullBank(college, subjectKey, {
        collegeName: MPPStore.page.collegeName,
        curriculumData: currentCurriculum,
        qnaData: nextList
    });
}

export async function deleteQuestionsBulk(qidSet, currentQna = [], currentCurriculum = []) {
    requireAdmin();
    const { isClinical, college, rawSub, subjectKey } = getVaultKeys();

    if (isClinical) {
        const updates = {};
        qidSet.forEach(id => { updates[`clinical_data/${college}/${rawSub}/${id}`] = null; });
        await update(ref(db), updates);
        await bumpClinicalVersion(college, rawSub);
        return null;
    }

    const nextList = currentQna.filter(x => !qidSet.has(String(x.q)));
    return uploadFullBank(college, subjectKey, {
        collegeName: MPPStore.page.collegeName,
        curriculumData: currentCurriculum,
        qnaData: nextList
    });
}

export async function saveAnswer(qId, text) {
    requireAdmin();
    const { isClinical, college, rawSub, subjectKey } = getVaultKeys();

    if (isClinical) {
        const ansRef = ref(db, `clinical_data/${college}/${rawSub}/${qId}/answer`);
        if (text) await set(ansRef, text); else await remove(ansRef);
        await bumpClinicalVersion(college, rawSub);
        return;
    }

    const now = Date.now();
    await update(ref(db), {
        [`answers/${college}/${subjectKey}/${qId}`]: text
            ? { text, updatedAt: new Date().toISOString(), updatedBy: MPPStore.user.email }
            : null,
        [`bank_meta/${college}/${subjectKey}/answersVersion`]: now
    });
    invalidateSessionCache(`meta_${college}_${subjectKey}`);
}

export async function reorderQuestion(oldIndex, newIndex, currentQna = [], currentCurriculum = []) {
    requireAdmin();
    const { isClinical, college, rawSub, subjectKey } = getVaultKeys();
    const list = [...currentQna];
    if (oldIndex < 0 || newIndex < 0 || oldIndex >= list.length || newIndex >= list.length) return null;

    const [moved] = list.splice(oldIndex, 1);
    list.splice(newIndex, 0, moved);

    if (isClinical) {
        let prevOrder, nextOrder;
        if (newIndex === 0) {
            nextOrder = list[1]?.order || Date.now();
            prevOrder = nextOrder - 10000;
        } else if (newIndex === list.length - 1) {
            prevOrder = list[list.length - 2]?.order || Date.now();
            nextOrder = prevOrder + 10000;
        } else {
            prevOrder = list[newIndex - 1]?.order || Date.now();
            nextOrder = list[newIndex + 1]?.order || Date.now();
        }
        await update(ref(db, `clinical_data/${college}/${rawSub}/${moved.q}`), { order: (prevOrder + nextOrder) / 2 });
        await bumpClinicalVersion(college, rawSub);
        return null;
    }

    return uploadFullBank(college, subjectKey, {
        collegeName: MPPStore.page.collegeName,
        curriculumData: currentCurriculum,
        qnaData: list
    });
}

export async function importAnkiBatch(parsedItems, currentQna = [], currentCurriculum = []) {
    requireAdmin();
    if (!parsedItems.length) return { count: 0 };
    const { isClinical, college, rawSub, subjectKey } = getVaultKeys();

    if (isClinical) {
        const updates = {};
        const baseOrder = Date.now();
        parsedItems.forEach((item, idx) => {
            const payload = {
                stem: item.stem,
                chapter: item.chapter,
                type: item.type,
                examBatch: item.examBatch || "Clinical Wards",
                order: baseOrder + idx,
                timestamp: new Date().toISOString(),
                uploadedBy: MPPStore.user.email
            };
            if (item.type === "MCQ" && item.options) {
                payload.options = item.options;
                payload.ans_key = item.ans_key || "";
            }
            if (item.answer) payload.answer = item.answer;
            updates[`clinical_data/${college}/${rawSub}/${item.q}`] = payload;
        });
        await update(ref(db), updates);
        await bumpClinicalVersion(college, rawSub);
        return { count: parsedItems.length };
    }

    const nextList = [...currentQna];
    const ansUpdates = {};
    parsedItems.forEach(item => {
        const qObj = {
            q: item.q, type: item.type, stem: item.stem,
            ans_key: item.type === "MCQ" ? (item.ans_key || "") : "",
            chapter: item.chapter, examBatch: item.examBatch || "Anki Import"
        };
        if (item.type === "MCQ" && item.options) qObj.options = item.options;
        nextList.push(qObj);

        if (item.answer) {
            ansUpdates[`answers/${college}/${subjectKey}/${item.q}`] = {
                text: item.answer, updatedAt: new Date().toISOString(), updatedBy: MPPStore.user.email
            };
        }
    });
    if (Object.keys(ansUpdates).length) {
        ansUpdates[`bank_meta/${college}/${subjectKey}/answersVersion`] = Date.now();
        await update(ref(db), ansUpdates);
    }

    const res = await uploadFullBank(college, subjectKey, {
        collegeName: MPPStore.page.collegeName,
        curriculumData: currentCurriculum,
        qnaData: nextList
    });
    return { count: parsedItems.length, bank: res };
}

export async function toggleSubjectAnswers(currentVal) {
    requireAdmin();
    const { college, settingsKey } = getVaultKeys();
    await set(ref(db, `settings/${college}/${settingsKey}/showAnswers`), !Boolean(currentVal));
    invalidateSessionCache(`sset_${college}_${settingsKey}`);
}

export async function toggleGlobalFeatureFlag(flagName, currentVal) {
    requireAdmin();
    if (flagName === "showNeuroRecall") {
        await set(ref(db, "settings/global/showNeuroRecall"), !Boolean(currentVal));
    } else {
        await set(ref(db, `settings/global/features/${flagName}`), !Boolean(currentVal));
    }
    invalidateSessionCache("global_flags");
}

export async function exportFirebaseFirstBank() {
    requireAdmin();
    const { college, rawSub, subjectKey, candidateKeys, fileName, candidateFileNames } = getVaultKeys({ mode: "review" });
    let loaded = null, source = "";

    for (const k of candidateKeys) {
        const snap = await get(ref(db, `question_banks/${college}/${k}`)).catch(() => null);
        if (snap && snap.exists()) {
            const clean = sanitizeBankPayload(snap.val(), college);
            if (clean && clean.qnaData.length) { loaded = clean; source = `Firebase (${college}/${k})`; break; }
        }
    }

    if (loaded) {
        const editsSnap = await get(ref(db, `question_edits/${college}/${rawSub}/overrides`)).catch(() => null);
        const ovs = editsSnap?.val() || {};
        loaded.qnaData = loaded.qnaData.map(item => {
            const ov = ovs[String(item.q).toUpperCase()];
            if (!ov) return item;
            return {
                ...item,
                ans_key: ov.ans_key || item.ans_key,
                options: Array.isArray(ov.options) ? ov.options.map(String) : item.options,
                stem: ov.stem || item.stem
            };
        });
    } else {
        for (const fname of candidateFileNames) {
            try {
                const res = await fetch(fname, { cache: "no-store" });
                if (res.ok) {
                    loaded = sanitizeBankPayload(await res.json(), college);
                    source = `GitHub Fallback (${fname})`;
                    break;
                }
            } catch (_) {}
        }
    }

    return { loaded, source, fileName };
}

export async function syncGitHubJsonToFirebase(custom = {}) {
    requireAdmin();
    const { isClinical, college, subjectKey, candidateFileNames } = getVaultKeys({ ...custom, mode: "review" });
    if (isClinical) {
        throw new Error("GitHub JSON sync applies to Review/PYQ pages (Clinical pages already save live to Firebase).");
    }

    let payload = null;
    let matchedFile = "";
    for (const fname of candidateFileNames) {
        try {
            const res = await fetch(fname, { cache: "no-store" });
            if (res.ok) {
                payload = await res.json();
                matchedFile = fname;
                break;
            }
        } catch (_) {}
    }

    if (!payload) {
        throw new Error(`No GitHub JSON file found for ${college}/${subjectKey}. Checked: ${candidateFileNames.join(", ")}`);
    }

    const res = await uploadFullBank(college, subjectKey, payload);
    return { ...res, matchedFile, college };
}

export async function syncLoadedPageToFirebase(qnaData = [], curriculumData = []) {
    requireAdmin();
    const { isClinical, college, subjectKey } = getVaultKeys();
    if (isClinical) throw new Error("Clinical pages are already synced live to Firebase.");
    if (!Array.isArray(qnaData) || !qnaData.length) return syncGitHubJsonToFirebase();

    const res = await uploadFullBank(college, subjectKey, {
        collegeName: MPPStore.page.collegeName,
        curriculumData,
        qnaData
    });
    return { ...res, matchedFile: "Currently Loaded Page", college };
}
