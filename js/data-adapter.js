// ============================================================================
// js/data-adapter.js
// Unified Data & Cache Layer for BOTH review.html and clinical.html
// - IndexedDB Cache (0 KB repeat loads when version unchanged)
// - Read-Only Loaders for Students
// - 3-Admin-Only CRUD: Add/Edit/Delete, Bulk Delete, Reorder, Anki Import,
//   Cloud Vault Sync, 777 Firebase-First JSON Export & Feature Flag Toggles
// ============================================================================
import { db, MPPStore, isUserAdmin, ref, get, set, update, remove, onValue } from "./core-firebase.js";
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

// ============================================================================
// 3. READ OPERATIONS (Safe for All Authenticated Users)
// ============================================================================
export async function loadReviewBank() {
    if (!MPPStore.user) {
        return { collegeName: MPPStore.page.collegeName, curriculumData: [], qnaData: [], sourceTag: "guest" };
    }

    const { college, subjectKey, candidateKeys, candidateFileNames } = getVaultKeys({ mode: "review" });
    const isPro = MPPStore.isAdmin || MPPStore.accessLevel === "premium";

    // 1. Pro / Admin: Check IndexedDB against Firebase bank_meta version, then question_banks
    if (isPro) {
        let remoteVersion = null;
        for (const k of candidateKeys) {
            const snap = await get(ref(db, `bank_meta/${college}/${k}/version`)).catch(() => null);
            if (snap && snap.exists()) { remoteVersion = snap.val(); break; }
        }

        const idbKey = `pro_${college}_${subjectKey}`;
        if (remoteVersion) {
            const cached = await idbGet(idbKey);
            if (cached && cached.version === remoteVersion && Array.isArray(cached.qnaData) && cached.qnaData.length) {
                return { ...sanitizeBankPayload(cached, college), sourceTag: "firebase-cache" };
            }
        }

        for (const k of candidateKeys) {
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
        // 2. Free Plan: Read only question_previews node
        for (const k of candidateKeys) {
            const snap = await get(ref(db, `question_previews/${college}/${k}`)).catch(() => null);
            if (snap && snap.exists()) {
                const clean = sanitizeBankPayload(snap.val(), college);
                if (clean && clean.qnaData.length) {
                    return { ...clean, sourceTag: "firebase-preview" };
                }
            }
        }
    }

    // 3. Fallback to legacy GitHub JSON file (sliced for Free users)
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

export function subscribeReviewAnswers(callback) {
    const { college, rawSub, ver, subjectKey } = getVaultKeys({ mode: "review" });
    let baseAns = {}, verAns = {};
    const emit = () => callback({ ...baseAns, ...verAns });

    const u1 = onValue(ref(db, `answers/${college}/${rawSub}`), (s) => { baseAns = s.val() || {}; emit(); });
    const u2 = ver
        ? onValue(ref(db, `answers/${college}/${subjectKey}`), (s) => { verAns = s.val() || {}; emit(); })
        : () => {};
    return () => { u1(); u2(); };
}

export function subscribeReviewEdits(callback) {
    const { college, rawSub } = getVaultKeys({ mode: "review" });
    return onValue(ref(db, `question_edits/${college}/${rawSub}`), (snap) => {
        const val = snap.val() || {};
        callback({
            overrides: val.overrides || {},
            undoStack: (Array.isArray(val.undoStack) ? val.undoStack : Object.values(val.undoStack || {})).filter(Boolean).slice(0, 10),
            redoStack: (Array.isArray(val.redoStack) ? val.redoStack : Object.values(val.redoStack || {})).filter(Boolean).slice(0, 10)
        });
    });
}

export function subscribeClinicalData(callback) {
    const { college, rawSub } = getVaultKeys({ mode: "clinical" });
    return onValue(ref(db, `clinical_data/${college}/${rawSub}`), (snap) => {
        const data = snap.val() || {};
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

        callback({ qnaData, liveAnswers });
    });
}

export function subscribeSubjectSettings(callback) {
    const { college, settingsKey } = getVaultKeys();
    return onValue(ref(db, `settings/${college}/${settingsKey}`), (snap) => {
        callback({ showAnswers: Boolean(snap.val()?.showAnswers) });
    });
}

// ============================================================================
// 4. ADMIN-ONLY WRITE OPERATIONS (Strictly Guarded for the 3 Admins)
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
        [`bank_meta/${normCol}/${normSubKey}`]: {
            version: versionStamp,
            totalQuestions: cleanQna.length,
            updatedAt: new Date().toISOString(),
            updatedBy: MPPStore.user.email
        }
    });

    await idbSet(`pro_${normCol}_${normSubKey}`, {
        version: versionStamp, collegeName: clean.collegeName, curriculumData, qnaData: cleanQna
    });

    return { versionStamp, count: cleanQna.length, normSubKey, collegeName: clean.collegeName, curriculumData, qnaData: cleanQna };
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
        return null;
    }

    // REVIEW / PYQ MODE
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
    if (Object.keys(ansUpdates).length) await update(ref(db), ansUpdates);

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
        return null;
    }

    const nextList = currentQna.filter(x => String(x.q) !== String(qId));
    await remove(ref(db, `answers/${college}/${subjectKey}/${qId}`)).catch(() => {});
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
        return;
    }

    const ansRef = ref(db, `answers/${college}/${subjectKey}/${qId}`);
    if (text) {
        await set(ansRef, { text, updatedAt: new Date().toISOString(), updatedBy: MPPStore.user.email });
    } else {
        await remove(ansRef);
    }
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
    if (Object.keys(ansUpdates).length) await update(ref(db), ansUpdates);

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
}

export async function toggleGlobalFeatureFlag(flagName, currentVal) {
    requireAdmin();
    if (flagName === "showNeuroRecall") {
        await set(ref(db, "settings/global/showNeuroRecall"), !Boolean(currentVal));
    } else {
        await set(ref(db, `settings/global/features/${flagName}`), !Boolean(currentVal));
    }
}

// Firebase-First JSON Export (Powers 777calm / 777pankaj admin export)
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
// ============================================================================
// 5. SYNC GITHUB JSON OR CURRENTLY LOADED PAGE -> FIREBASE CLOUD VAULT
// ============================================================================
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
    if (isClinical) {
        throw new Error("Clinical pages are already synced live to Firebase.");
    }
    if (!Array.isArray(qnaData) || !qnaData.length) {
        return syncGitHubJsonToFirebase();
    }
    const res = await uploadFullBank(college, subjectKey, {
        collegeName: MPPStore.page.collegeName,
        curriculumData,
        qnaData
    });
    return { ...res, matchedFile: "Currently Loaded Page", college };
}
