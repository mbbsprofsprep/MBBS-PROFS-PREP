// ============================================================================
// js/qbank-engine.js
// Unified QBank Engine for BOTH review.html and clinical.html
// Features: Table + Deck View, Two-Way Filter Sync, Saved Filter, Bookmark
// Ribbons, Resume Practice + Solved DB, 3D Answer Cards & Teen Patti Deck
// ============================================================================
import {
    db,
    APP_LOGO_URL,
    MPPStore,
    isUserAdmin,
    getUniqueQuestionId,
    onStoreChange,
    saveOrRemoveBookmark,
    ref,
    get,
    set,
    onValue
} from "./core-firebase.js";
import { resolveSubjectMeta, resolveCollegeName } from "./subject-registry.js";
import { escapeHtml, stripHtml, formatInlineMathAndBold, renderContent } from "./content-renderer.js";
import { initUIShell, userPanelApp, showModal, closeModal } from "./ui-shell.js";
import {
    getVaultKeys,
    loadReviewBank,
    subscribeReviewAnswers,
    subscribeReviewEdits,
    subscribeClinicalData,
    subscribeSubjectSettings,
    saveAnswer
} from "./data-adapter.js";

const OPTION_LETTERS = ["A", "B", "C", "D", "E"];

// Single Clean State Object (No global `let` bridge hacks needed)
export const QB = {
    mode: "review", // "review" | "clinical"
    collegeCode: "deoghar",
    collegeName: "AIIMS Deoghar",
    subjectSlug: "cfm",
    subjectCode: "CFM",
    subjectName: "Community Medicine",
    bridgeSlug: "cfm",
    versionCode: "",
    dataSourceTag: "",

    isDataLoaded: false,
    qnaData: [],
    curriculumData: [],
    displayData: [],
    liveAnswers: {},
    subjectSettings: { showAnswers: false },
    editsState: { overrides: {}, undoStack: [], redoStack: [] },

    // Filters (Unified across Table & Deck)
    filters: {
        search: "",
        savedOnly: false,
        attempt: "all", // "all" | "unsolved" | "correct" | "wrong"
        types: new Set(),
        chapters: new Set(),
        exams: new Set()
    },

    // Deck & Solved State
    isDeckMode: false,
    initialViewConfigured: false,
    activeDeck: [],
    deckIndex: 0,
    userSolved: {},       // { [qId]: "A"|"B"|... }
    deckStatus: {},       // { [qId]: "correct"|"wrong" }
    resumeChecked: false,
    tempSavedIndex: 0,

    // Teen Patti Cross-Link State
    tp: {
        overrideQid: null,
        fanOpen: false,
        activeTopicSlug: null,
        examFilter: "all",
        fanPosMap: {},
        clusters: {},
        nodeTopics: {},
        nodes: {},
        history: [],
        sharedCache: {},
        externalLookup: {} // Populated by Admin MedPYQ Bridge if connected
    },

    _unsubs: []
};

// ============================================================================
// 1. BOOT ENGINE (Called once by review.html or clinical.html)
// ============================================================================
export function bootQBankEngine({ mode = "review" } = {}) {
    initUIShell();
    injectQBankStyles();
    injectDeckAndResumeDOM();

    const params = new URLSearchParams(window.location.search);
    const collegeCode = (params.get("college") || "deoghar").toLowerCase().trim();
    const subjectSlug = (params.get("subject") || "cfm").toLowerCase().trim();
    const versionCode = mode === "review" ? (params.get("version") || "").toLowerCase().trim() : "";
    const meta = resolveSubjectMeta(subjectSlug);
    const collegeName = resolveCollegeName(collegeCode);

    QB.mode = mode;
    QB.collegeCode = collegeCode;
    QB.collegeName = collegeName;
    QB.subjectSlug = meta.slug;
    QB.subjectCode = meta.code;
    QB.subjectName = meta.name;
    QB.bridgeSlug = meta.bridgeSlug;
    QB.versionCode = versionCode;

    // Sync active page metadata into core store
    MPPStore.page = {
        mode,
        collegeCode,
        collegeName,
        subjectSlug: meta.slug,
        subjectCode: meta.code,
        subjectName: meta.name,
        versionCode
    };

    // Update Page Headers
    const verLabel = versionCode ? ` (${versionCode.toUpperCase()})` : "";
    const titleSuffix = mode === "clinical" ? "Clinical Cases" : `PYQs${verLabel}`;
    const pageTitle = `MBBS Profs Prep - ${meta.name} ${titleSuffix} (${collegeName})`;
    document.title = pageTitle;
    const tEl = document.getElementById("dynamic-page-title");
    if (tEl) tEl.textContent = pageTitle;
    const h1 = document.getElementById("dynamic-subject-title");
    if (h1) h1.textContent = `${meta.name} ${titleSuffix}`;
    const h2 = document.getElementById("dynamic-college-header");
    if (h2) h2.textContent = `${collegeName} | Professional Examinations`;

    // Store Subscriptions
    onStoreChange("auth", () => handleAuthOrReload());
    onStoreChange("bookmarks", () => {
        updateBookmarkButtonsUI();
        if (QB.filters.savedOnly) applyFiltersAndRender();
    });
    onStoreChange("flags", () => {
        if (QB.displayData.length) {
            renderTable();
            if (QB.isDeckMode) renderDeckCard();
        }
    });
    onStoreChange("adminReady", () => {
        syncAdminHeaderControls();
        if (QB.displayData.length) {
            renderTable();
            if (QB.isDeckMode) renderDeckCard();
        }
    });

    window.addEventListener("mpp:katex-ready", () => {
        if (QB.displayData.length) {
            renderTable();
            if (QB.isDeckMode) renderDeckCard();
        }
    });

    window.addEventListener("mpp:global-search", (e) => {
        QB.filters.search = String(e.detail?.query || "").toLowerCase().trim();
        applyFiltersAndRender();
    });

    // Click outside closes multiselect dropdowns
    document.addEventListener("click", (e) => {
        if (!e.target.closest(".multiselect-container")) {
            document.querySelectorAll(".multiselect-menu").forEach(m => m.classList.remove("show"));
        }
    });

    if (MPPStore.authReady) handleAuthOrReload();
}

function clearPageSubscriptions() {
    QB._unsubs.forEach(u => { try { u(); } catch (_) {} });
    QB._unsubs = [];
}

async function handleAuthOrReload() {
    clearPageSubscriptions();
    syncAdminHeaderControls();

    const tbody = document.getElementById("tableBody");
    if (!MPPStore.user) {
        QB.qnaData = [];
        QB.displayData = [];
        QB.liveAnswers = {};
        QB.isDataLoaded = true;
        processAccessAndRender();
        return;
    }

    if (tbody && !QB.qnaData.length) {
        tbody.innerHTML = `<tr><td colspan="6" class="p-12 text-center text-slate-500 dark:text-slate-400"><div class="w-8 h-8 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin mx-auto mb-3"></div><p class="font-bold">Loading ${escapeHtml(QB.subjectName)}...</p></td></tr>`;
    }

    // 1. Subscribe to Subject Settings (Student Answers Toggle)
    QB._unsubs.push(
        subscribeSubjectSettings((settings) => {
            QB.subjectSettings = settings;
            const chk = document.getElementById("global-answer-toggle");
            if (chk) chk.checked = Boolean(settings.showAnswers);
            if (QB.displayData.length) {
                renderTable();
                if (QB.isDeckMode) renderDeckCard();
            }
        })
    );

    // 2. Subscribe to Cross-Links (Teen Patti Deck)
    QB._unsubs.push(
        onValue(ref(db, `cross_links/${QB.bridgeSlug}`), (snap) => {
            if (snap.exists()) ingestCrossLinks(snap.val());
        })
    );

    // 3. Load Data Based on Mode
    if (QB.mode === "clinical") {
        QB._unsubs.push(
            subscribeClinicalData(({ qnaData, liveAnswers }) => {
                QB.qnaData = qnaData;
                QB.liveAnswers = liveAnswers;
                QB.dataSourceTag = "firebase-clinical";
                QB.isDataLoaded = true;
                processAccessAndRender();
                loadSolvedAndResumeState();
            })
        );
    } else {
        // Review Mode: Live Answers + Live Edits + Cloud Vault/Cache Bank
        QB._unsubs.push(
            subscribeReviewAnswers((ansMap) => {
                QB.liveAnswers = ansMap;
                if (QB.displayData.length) {
                    renderTable();
                    if (QB.isDeckMode) renderDeckCard();
                }
            })
        );

        QB._unsubs.push(
            subscribeReviewEdits((edits) => {
                QB.editsState = edits;
                applyOverridesToQna(edits.overrides);
                if (QB.displayData.length) {
                    renderTable();
                    if (QB.isDeckMode && !document.getElementById("mpp-inline-rt-editor")?.classList.contains("open")) {
                        renderDeckCard();
                    }
                }
            })
        );

        const bank = await loadReviewBank();
        QB.qnaData = bank.qnaData || [];
        QB.curriculumData = bank.curriculumData || [];
        QB.dataSourceTag = bank.sourceTag || "";
        QB.isDataLoaded = true;
        applyOverridesToQna(QB.editsState.overrides);
        processAccessAndRender();
        await loadSolvedAndResumeState();
    }
}

function applyOverridesToQna(overrides = {}) {
    if (!overrides || typeof overrides !== "object") return;
    QB.qnaData.forEach(item => {
        const up = String(item.q).trim().toUpperCase();
        const ov = overrides[up];
        if (!ov) return;
        if (ov.ans_key) item.ans_key = String(ov.ans_key).trim().toUpperCase();
        if (Array.isArray(ov.options) && ov.options.length) item.options = ov.options.map(String);
        if (ov.stem) item.stem = String(ov.stem);
        if (ov.explanation !== undefined) {
            QB.liveAnswers[item.q] = { text: String(ov.explanation) };
        }
    });
}

function syncAdminHeaderControls() {
    const isAdmin = isUserAdmin();
    const bar = document.getElementById("admin-controls");
    if (bar) {
        bar.classList.toggle("hidden", !isAdmin);
        bar.classList.toggle("flex", isAdmin);
    }
    const coffee = document.getElementById("summaryButton");
    if (coffee) coffee.style.display = isAdmin ? "inline-block" : "none";
}

function processAccessAndRender() {
    if (!QB.isDataLoaded) return;

    if (MPPStore.accessLevel === "guest") {
        QB.displayData = [];
    } else if (MPPStore.accessLevel === "free" && QB.mode === "clinical") {
        QB.displayData = QB.qnaData.slice(0, 10);
    } else {
        QB.displayData = [...QB.qnaData];
    }

    buildFilterDropdowns();
    buildDeckFilterDrawer();
    applyFiltersAndRender();

    if (!QB.initialViewConfigured) {
        QB.initialViewConfigured = true;
        if (window.innerWidth < 768 && !QB.isDeckMode) {
            toggleDeckMode();
        }
    }
}

// ============================================================================
// 2. UNIFIED TWO-WAY FILTERING (TABLE <-> DECK)
// ============================================================================
function getUniqueValues(field) {
    const setObj = new Set();
    QB.qnaData.forEach(item => {
        const val = field === "exam" ? item.examBatch : item[field];
        if (Array.isArray(val)) val.forEach(v => v && setObj.add(String(v)));
        else if (val) setObj.add(String(val));
    });
    return Array.from(setObj).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));
}

function isItemBookmarked(qId) {
    return Boolean(MPPStore.bookmarks[getUniqueQuestionId(qId)]);
}

function matchesFilters(item) {
    const f = QB.filters;
    if (f.savedOnly && !isItemBookmarked(item.q)) return false;

    if (f.attempt !== "all") {
        const st = QB.deckStatus[item.q];
        if (f.attempt === "unsolved" && st) return false;
        if (f.attempt === "correct" && st !== "correct") return false;
        if (f.attempt === "wrong" && st !== "wrong") return false;
    }

    if (f.search) {
        const ch = Array.isArray(item.chapter) ? item.chapter.join(" ") : (item.chapter || "");
        const ex = Array.isArray(item.examBatch) ? item.examBatch.join(" ") : (item.examBatch || "");
        const hay = `${item.q} ${stripHtml(item.stem)} ${ch} ${ex}`.toLowerCase();
        if (!hay.includes(f.search)) return false;
    }

    if (f.types.size > 0 && !f.types.has(item.type)) return false;

    if (f.chapters.size > 0) {
        const chs = Array.isArray(item.chapter) ? item.chapter : [item.chapter];
        if (!chs.some(c => f.chapters.has(c))) return false;
    }

    if (f.exams.size > 0) {
        const exs = Array.isArray(item.examBatch) ? item.examBatch : [item.examBatch];
        if (!exs.some(e => f.exams.has(e))) return false;
    }

    return true;
}

function buildFilterDropdowns() {
    const createSelect = (wrapId, dropId, label, items, key) => {
        const wrap = document.getElementById(wrapId);
        if (!wrap) return;
        const list = items.map(it => {
            const safe = escapeHtml(it);
            return `<label class="multiselect-option"><input type="checkbox" class="table-filter-cb" data-fkey="${key}" value="${safe}" ${QB.filters[key].has(it) ? "checked" : ""} onchange="window.QBankEngine.toggleSetFilter('${key}', this.value, this.checked)"><span>${safe}</span></label>`;
        }).join("");
        wrap.innerHTML = `
            <div class="multiselect-container">
                <button type="button" class="multiselect-btn" onclick="window.QBankEngine.toggleDropdown('${dropId}')">
                    <span id="${dropId}Text" class="text-slate-400">All ${label}s</span>
                    <svg class="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
                </button>
                <div id="${dropId}Menu" class="multiselect-menu">${list || `<div class="p-3 text-xs text-slate-400">None</div>`}</div>
            </div>`;
    };

    const isClin = QB.mode === "clinical";
    createSelect("typeFilterWrapper", "typeSelect", isClin ? "Format" : "Type", getUniqueValues("type"), "types");
    createSelect("chapterFilterWrapper", "chapterSelect", isClin ? "Topic" : "Chapter", getUniqueValues("chapter"), "chapters");
    createSelect("examFilterWrapper", "examSelect", isClin ? "Source" : "Batch", getUniqueValues("exam"), "exams");
    syncFilterButtonsUI();
}

function buildDeckFilterDrawer() {
    const container = document.getElementById("deck-filter-content");
    if (!container) return;
    const isClin = QB.mode === "clinical";

    const group = (label, key, opts) => {
        if (!opts.length) return "";
        return `
        <details class="mb-4" open>
            <summary class="font-bold text-xs text-slate-500 uppercase tracking-wider mb-2 px-1 cursor-pointer flex justify-between">${label}<span>▼</span></summary>
            <div class="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                ${opts.map(o => {
                    const safe = escapeHtml(o);
                    return `<label class="flex items-start gap-2.5 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
                        <input type="checkbox" class="deck-filter-cb mt-0.5 w-4 h-4 accent-sky-500" data-fkey="${key}" value="${safe}" ${QB.filters[key].has(o) ? "checked" : ""} onchange="window.QBankEngine.toggleSetFilter('${key}', this.value, this.checked)">
                        <span class="text-xs font-medium text-slate-700 dark:text-slate-300 leading-snug">${safe}</span>
                    </label>`;
                }).join("")}
            </div>
        </details>`;
    };

    container.innerHTML = `
        <div class="mb-4 pb-3 border-b border-slate-200 dark:border-slate-800 space-y-2.5">
            <label class="flex items-center gap-2.5 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/60 cursor-pointer">
                <input type="checkbox" id="deck-chk-saved" ${QB.filters.savedOnly ? "checked" : ""} onchange="window.QBankEngine.toggleSavedFilter(this.checked)" class="w-4 h-4 accent-amber-500">
                <span class="text-xs font-extrabold text-amber-800 dark:text-amber-300">🔖 Saved Bookmarks Only</span>
            </label>
            <div>
                <label class="text-[10px] font-bold text-slate-400 uppercase block mb-1">Attempt Status</label>
                <select id="deck-attempt-filter" onchange="window.QBankEngine.setAttemptFilter(this.value)" class="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold dark:text-white">
                    <option value="all" ${QB.filters.attempt === "all" ? "selected" : ""}>All Questions</option>
                    <option value="unsolved" ${QB.filters.attempt === "unsolved" ? "selected" : ""}>Unsolved Only</option>
                    <option value="correct" ${QB.filters.attempt === "correct" ? "selected" : ""}>Correct Only</option>
                    <option value="wrong" ${QB.filters.attempt === "wrong" ? "selected" : ""}>Incorrect Only</option>
                </select>
            </div>
            <button type="button" onclick="window.QBankEngine.resetAllProgress()" class="w-full py-2 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 text-[11px] font-extrabold cursor-pointer">
                🔄 Reset Subject Progress
            </button>
        </div>
        ${group(isClin ? "Topic" : "Chapter", "chapters", getUniqueValues("chapter"))}
        ${group(isClin ? "Format" : "Type", "types", getUniqueValues("type"))}
        ${group(isClin ? "Source" : "Exam Batch", "exams", getUniqueValues("exam"))}`;
}

function syncFilterButtonsUI() {
    const saved = QB.filters.savedOnly;
    const tBtn = document.getElementById("btn-filter-saved");
    if (tBtn) {
        tBtn.className = saved
            ? "px-3.5 py-2.5 rounded-lg border border-amber-400 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 font-bold text-xs flex items-center gap-1.5 shrink-0 ring-2 ring-amber-400/30 cursor-pointer"
            : "px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-dark-surface text-slate-600 dark:text-slate-300 font-bold text-xs flex items-center gap-1.5 hover:border-amber-400 shrink-0 cursor-pointer";
    }
    const dBtn = document.getElementById("deck-header-saved-btn");
    if (dBtn) {
        dBtn.className = saved
            ? "flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-700 text-xs font-extrabold cursor-pointer"
            : "flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs font-bold cursor-pointer";
    }
    const dChk = document.getElementById("deck-chk-saved");
    if (dChk) dChk.checked = saved;

    const tblAtt = document.getElementById("attemptFilterSelect");
    if (tblAtt) tblAtt.value = QB.filters.attempt;
    const dckAtt = document.getElementById("deck-attempt-filter");
    if (dckAtt) dckAtt.value = QB.filters.attempt;

    ["types", "chapters", "exams"].forEach(k => {
        document.querySelectorAll(`.table-filter-cb[data-fkey="${k}"], .deck-filter-cb[data-fkey="${k}"]`).forEach(cb => {
            cb.checked = QB.filters[k].has(cb.value);
        });
    });

    const isClin = QB.mode === "clinical";
    const setLabel = (id, size, noun) => {
        const el = document.getElementById(id + "Text");
        if (!el) return;
        el.textContent = size ? `${size} ${noun}(s)` : `All ${noun}s`;
        el.className = size ? "text-brand-600 dark:text-brand-400 font-bold" : "text-slate-400";
    };
    setLabel("typeSelect", QB.filters.types.size, isClin ? "Format" : "Type");
    setLabel("chapterSelect", QB.filters.chapters.size, isClin ? "Topic" : "Chapter");
    setLabel("examSelect", QB.filters.exams.size, isClin ? "Source" : "Batch");
}

function applyFiltersAndRender() {
    syncFilterButtonsUI();
    QB.activeDeck = QB.displayData.filter(matchesFilters);
    if (QB.deckIndex >= QB.activeDeck.length) QB.deckIndex = 0;

    const sub = document.getElementById("deck-subtitle");
    if (sub) {
        if (QB.filters.savedOnly) sub.textContent = `${QB.activeDeck.length} Saved`;
        else sub.textContent = QB.activeDeck.length === QB.displayData.length
            ? `${QB.activeDeck.length} ${QB.mode === "clinical" ? "Cases" : "Questions"}`
            : `${QB.activeDeck.length} Filtered`;
    }

    renderTable();
    if (QB.isDeckMode) renderDeckCard();
}

// ============================================================================
// 3. TABLE VIEW RENDERER (Read-Only for Users; Admin Controls for 3 Admins)
// ============================================================================
function renderTable() {
    const tbody = document.getElementById("tableBody");
    if (!tbody) return;
    tbody.innerHTML = "";

    const isAdmin = isUserAdmin();
    const showAnsCards = isAdmin || Boolean(MPPStore.featureFlags.showAnswerCards);
    const filtered = QB.displayData.filter(matchesFilters);

    filtered.forEach((item) => {
        const realIdx = QB.displayData.indexOf(item);
        const row = tbody.insertRow();
        row.className = "hover:bg-brand-50/70 dark:hover:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 transition-colors";
        row.setAttribute("data-index", String(realIdx));
        row.setAttribute("data-qid", item.q);

        // Col 1: ID (+ Admin Drag Handle)
        const c1 = row.insertCell();
        c1.className = "px-4 py-4 text-center font-bold text-brand-600 dark:text-brand-400 border-r border-slate-200 dark:border-slate-800 align-middle relative";
        const dragHtml = isAdmin ? `<span class="drag-handle cursor-grab absolute left-1 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 p-1" title="Drag to reorder">⋮⋮</span>` : "";
        c1.innerHTML = `${dragHtml}<span class="${isAdmin ? "pl-3" : ""}">${escapeHtml(item.q)}</span>`;

        // Col 2: Stem + MCQ Options + Notes + 3D Answer Card
        const c2 = row.insertCell();
        c2.className = "px-6 py-4 align-top";

        const cleanStem = formatInlineMathAndBold(item.stem);
        let qHtml = "";
        if (item.type === "MCQ") {
            qHtml += `<div class="font-semibold mb-2 text-slate-900 dark:text-white leading-relaxed">${cleanStem}</div><div class="space-y-1 mb-2">`;
            (item.options || []).forEach((opt, i) => {
                const l = OPTION_LETTERS[i] || "-";
                const isCorr = l === String(item.ans_key || "").toUpperCase();
                const fmtOpt = formatInlineMathAndBold(opt);
                qHtml += isCorr
                    ? `<div class="text-sm text-slate-600 dark:text-slate-400 ml-2"><span class="correct-option">${l}) ${fmtOpt}</span></div>`
                    : `<div class="text-sm text-slate-600 dark:text-slate-400 ml-2">${l}) ${fmtOpt}</div>`;
            });
            qHtml += `</div>`;
        } else {
            qHtml += `<div class="theory-question shadow-sm text-left mb-2">${cleanStem}</div>`;
        }

        if (item.img && !cleanStem.includes(item.img)) {
            qHtml += `<img src="${escapeHtml(item.img)}" class="max-h-60 rounded-xl my-2 border border-slate-200 dark:border-slate-700 cursor-zoom-in" alt="Question Image" loading="lazy">`;
        }

        // Answer Modal Button + Admin Edit/Delete
        const liveAns = QB.liveAnswers[item.q]?.text || "";
        const canViewAns = isAdmin || (Boolean(liveAns) && QB.subjectSettings.showAnswers);
        if (canViewAns || isAdmin) {
            const btnText = isAdmin ? (liveAns ? "✍️ Edit Answer" : "➕ Add Answer") : "👁️ View Answer";
            const btnStyle = isAdmin && !liveAns
                ? "border-dashed border-brand-300 text-brand-500 bg-transparent hover:bg-brand-50 dark:border-slate-700"
                : "bg-brand-50 text-brand-600 border-brand-200 hover:bg-brand-100 dark:bg-slate-800 dark:text-brand-400 dark:border-slate-700";

            const adminBtns = isAdmin ? `
                <button type="button" onclick="window.MPPAdmin?.openEditQuestionModal('${escapeHtml(item.q)}')" class="px-3.5 py-2 font-bold rounded-xl border border-blue-200 text-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-400 text-xs uppercase cursor-pointer">✏️ Edit</button>
                <button type="button" onclick="window.MPPAdmin?.confirmDeleteQuestion('${escapeHtml(item.q)}')" class="px-3.5 py-2 font-bold rounded-xl border border-red-200 text-red-600 bg-red-50 dark:bg-red-900/30 dark:border-red-800 dark:text-red-400 text-xs uppercase cursor-pointer">🗑️ Delete</button>` : "";

            qHtml += `
                <div class="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-2">
                    <button type="button" onclick="window.QBankEngine.openAnswerModal('${escapeHtml(item.q)}')" class="px-5 py-2 font-bold rounded-xl border text-xs uppercase tracking-wider cursor-pointer ${btnStyle}">${btnText}</button>
                    ${adminBtns}
                </div>`;
        }

        // 3D Answer Card Image (ans_image)
        if (item.ans_image && showAnsCards) {
            const safeQ = escapeHtml(item.q);
            qHtml += `
                <div class="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <button type="button" onclick="document.getElementById('ans-img-box-${safeQ}').classList.toggle('hidden')" class="px-4 py-1.5 bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold rounded-lg border-none cursor-pointer">🖼️ Toggle Visual Answer Card</button>
                    <div id="ans-img-box-${safeQ}" class="hidden mt-3">
                        <img src="${escapeHtml(item.ans_image)}" class="max-h-96 rounded-xl border border-brand-200 dark:border-slate-700 cursor-zoom-in" alt="Answer Card" loading="lazy">
                    </div>
                </div>`;
        }
        c2.innerHTML = qHtml;

        // Col 3: Type Badge
        const c3 = row.insertCell();
        c3.className = "px-4 py-4 text-center align-middle";
        const badgeCls = item.type === "Theory"
            ? "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700"
            : "bg-brand-100 text-brand-800 border-brand-200 dark:bg-brand-900/30 dark:text-brand-200 dark:border-brand-700";
        c3.innerHTML = `<span class="${badgeCls} border px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap">${escapeHtml(item.type)}</span>`;

        // Col 4: Chapter / Topic
        const c4 = row.insertCell();
        c4.className = "px-4 py-4 text-left align-middle border-l border-slate-100 dark:border-slate-800";
        const chs = Array.isArray(item.chapter) ? item.chapter : [item.chapter];
        c4.innerHTML = chs.map(ch => `<div class="text-xs font-medium text-slate-700 dark:text-slate-300">${escapeHtml(ch)}</div>`).join("");

        // Col 5: Source / Batch
        const c5 = row.insertCell();
        c5.className = "px-4 py-4 text-xs text-slate-500 dark:text-slate-400 border-l border-slate-100 dark:border-slate-800 align-middle";
        const batch = Array.isArray(item.examBatch) ? item.examBatch.join(", ") : (item.examBatch || "");
        c5.innerHTML = `<div class="uppercase font-bold text-[10px] text-slate-400 mb-0.5">${escapeHtml(QB.collegeName)}</div><div class="font-semibold text-brand-600 dark:text-brand-400">${escapeHtml(batch)}</div>`;

        // Col 6: Bookmark & Ask AI
        const c6 = row.insertCell();
        c6.className = "px-4 py-4 text-center align-middle border-l border-slate-100 dark:border-slate-800";
        const saved = isItemBookmarked(item.q);
        const bmkCls = saved
            ? "bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-700"
            : "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700";
        c6.innerHTML = `
            <div class="flex flex-col gap-1.5 items-center">
                <button type="button" onclick="window.QBankEngine.askAI('${escapeHtml(item.q)}')" class="w-full max-w-[84px] bg-green-500/10 text-green-600 dark:text-green-400 font-semibold py-1.5 px-2 rounded-lg text-[10px] uppercase border border-green-500/20 hover:bg-green-500 hover:text-white cursor-pointer">AI Help</button>
                <button type="button" id="bmk-table-${escapeHtml(item.q)}" onclick="window.QBankEngine.toggleBookmark('${escapeHtml(item.q)}')" class="w-full max-w-[84px] ${bmkCls} font-semibold py-1.5 px-2 rounded-lg text-[10px] uppercase border cursor-pointer">${saved ? "⭐ Saved" : "🔖 Save"}</button>
            </div>`;
    });

    // Empty / Access Gate Rows
    if (MPPStore.accessLevel === "guest") {
        appendGateRow(tbody, "Login Required", "Sign in to access questions and sync your progress.", `<button type="button" onclick="window.userPanelApp.open(); window.userPanelApp.setAuthMode('login')" class="px-8 py-3.5 bg-brand-500 text-white font-bold rounded-xl border-none cursor-pointer shadow-lg">Sign In to Continue</button>`);
    } else if (filtered.length === 0) {
        const emptyRow = tbody.insertRow();
        const cell = emptyRow.insertCell();
        cell.colSpan = 6;
        cell.className = "p-12 text-center text-slate-400";
        const adminVaultBtn = isAdmin && QB.dataSourceTag === "not-found"
            ? `<button type="button" onclick="window.MPPAdmin?.openControlHub?.()" class="mt-3 px-5 py-2.5 bg-sky-500 text-white text-xs font-extrabold rounded-xl border-none cursor-pointer">⚙️ Open Cloud Vault &amp; Upload</button>`
            : `<button type="button" onclick="window.QBankEngine.resetAllFilters()" class="mt-3 px-5 py-2 bg-brand-500 text-white text-xs font-bold rounded-xl border-none cursor-pointer">Reset Filters</button>`;
        cell.innerHTML = `<div class="text-3xl mb-2">🔍</div><p class="font-bold text-slate-600 dark:text-slate-300">No questions match your current view.</p>${adminVaultBtn}`;
    }

    if (MPPStore.accessLevel === "free") {
        appendGateRow(tbody, "Unlock Full Pro Access", "You are viewing a free preview. Upgrade to unlock all questions & explanations.", `<a href="checkout.html" class="inline-block px-8 py-3.5 bg-brand-500 text-white font-bold rounded-xl no-underline shadow-lg">Upgrade to Pro</a>`);
    }

    // Admin-only SortableJS Drag-to-Reorder hook
    if (isAdmin && window.MPPAdmin?.attachTableSortable) {
        window.MPPAdmin.attachTableSortable(tbody);
    }
}

function appendGateRow(tbody, title, desc, ctaHtml) {
    const row = tbody.insertRow();
    row.setAttribute("data-locked-row", "true");
    const cell = row.insertCell();
    cell.colSpan = 6;
    cell.className = "p-10 text-center bg-slate-50 dark:bg-slate-800/30 border-t border-slate-200 dark:border-slate-700";
    cell.innerHTML = `<div class="text-4xl mb-3">🔒</div><h3 class="text-2xl font-black text-slate-900 dark:text-white mb-2">${title}</h3><p class="text-slate-500 dark:text-slate-400 mb-5 text-sm">${desc}</p>${ctaHtml}`;
}

// ============================================================================
// 4. ANSWER MODAL (Read-Only for Students; Live Visual Editor for 3 Admins)
// ============================================================================
export function openAnswerModal(qId) {
    const q = findQuestionByQid(qId);
    if (!q) return;

    const liveAns = QB.liveAnswers[q.q]?.text || "";
    const isAdmin = isUserAdmin();
    const safeQ = escapeHtml(q.q);

    let html = `
        <div class="mb-5 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Reference (${safeQ})</span>
            <div class="text-sm font-semibold text-slate-800 dark:text-slate-200 leading-relaxed">${formatInlineMathAndBold(q.stem)}</div>
        </div>`;

    if (isAdmin) {
        html += `
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-5 min-h-[420px]">
            <div class="flex flex-col border border-brand-200 dark:border-brand-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900">
                <div class="bg-brand-50 dark:bg-slate-800/60 px-4 py-2.5 border-b border-brand-100 dark:border-brand-800 flex justify-between items-center">
                    <span class="text-xs font-black text-brand-700 dark:text-brand-400 uppercase">Admin Markdown Editor</span>
                    <button type="button" onclick="window.MPPAdmin?.openMediaPickerFor('admin-ans-modal-${safeQ}', 'admin-preview-modal-${safeQ}', 'upload')" class="px-2.5 py-1 rounded-lg bg-sky-500 text-white text-[10px] font-extrabold border-none cursor-pointer">📤 Upload / 🔍 Search Media</button>
                </div>
                <textarea id="admin-ans-modal-${safeQ}" oninput="window.QBankEngine.updateAnswerPreview('modal', '${safeQ}')" class="flex-1 w-full p-4 bg-transparent text-sm text-slate-800 dark:text-slate-200 outline-none resize-none custom-scrollbar" placeholder="Write Markdown, KaTeX, or use Visual Edit Mode on the right...">${escapeHtml(liveAns)}</textarea>
                <div class="p-3 bg-brand-50/50 dark:bg-slate-800/50 border-t border-brand-100 dark:border-brand-800">
                    <button type="button" onclick="window.QBankEngine.publishAnswer('${safeQ}', this, 'modal')" class="w-full py-3 bg-brand-500 hover:bg-brand-600 text-white font-extrabold rounded-xl text-xs uppercase tracking-wider border-none cursor-pointer shadow">Publish Answer</button>
                </div>
            </div>
            <div class="flex flex-col border border-green-200 dark:border-green-900/50 rounded-2xl overflow-hidden bg-white dark:bg-slate-900">
                <div class="bg-green-50 dark:bg-green-900/20 px-4 py-2.5 border-b border-green-200 dark:border-green-900/50">
                    <span class="text-xs font-black text-green-700 dark:text-green-400 uppercase">Live Student Preview</span>
                </div>
                <div id="admin-preview-modal-${safeQ}" class="flex-1 p-5 overflow-y-auto custom-scrollbar markdown-body">${renderContent(liveAns)}</div>
            </div>
        </div>`;
    } else {
        html += `
        <div class="border border-green-200 dark:border-green-900/50 rounded-2xl overflow-hidden bg-white dark:bg-slate-900">
            <div class="bg-green-50 dark:bg-green-900/20 px-4 py-2.5 border-b border-green-200 dark:border-green-900/50">
                <span class="text-xs font-black text-green-700 dark:text-green-400 uppercase">Model Answer &amp; Explanation</span>
            </div>
            <div class="p-5 markdown-body">${renderContent(liveAns)}</div>
        </div>`;
    }

    document.getElementById("ans-modal-body").innerHTML = html;
    document.getElementById("answerModal").classList.remove("hidden");

    if (isAdmin && window.MPPAdmin?.attachPreviewVisualToolbar) {
        const pv = document.getElementById(`admin-preview-modal-${q.q}`);
        if (pv) window.MPPAdmin.attachPreviewVisualToolbar(pv, `admin-ans-modal-${q.q}`);
    }
}

// ============================================================================
// 5. FULLSCREEN DECK VIEW + TEEN PATTI FANNED DECK + SOLVED PROGRESS
// ============================================================================
function renderDeckCard() {
    const container = document.getElementById("deck-card-container");
    if (!container) return;

    container.classList.toggle("tp-fan-open", Boolean(QB.tp.fanOpen));

    if (MPPStore.accessLevel === "guest") {
        container.innerHTML = `<div class="deck-card glass-card items-center justify-center text-center p-8"><div class="text-5xl mb-4">🔒</div><h2 class="text-2xl font-black mb-2">Login Required</h2><p class="text-slate-500 mb-6 text-sm">Sign in to study in Deck Mode.</p><button type="button" onclick="window.QBankEngine.toggleDeckMode(); window.userPanelApp.open(); window.userPanelApp.setAuthMode('login')" class="px-8 py-3.5 bg-brand-500 text-white font-bold rounded-xl border-none cursor-pointer">Sign In</button></div>`;
        document.getElementById("deck-counter").textContent = "🔒";
        return;
    }

    if (MPPStore.accessLevel === "free" && QB.deckIndex === QB.activeDeck.length && QB.activeDeck.length > 0) {
        container.innerHTML = `<div class="deck-card glass-card items-center justify-center text-center p-8"><div class="text-5xl mb-4">🔒</div><h2 class="text-2xl font-black mb-2">End of Free Preview</h2><p class="text-slate-500 mb-6 text-sm">Upgrade to Pro to unlock all questions.</p><a href="checkout.html" class="px-8 py-3.5 bg-brand-500 text-white font-bold rounded-xl no-underline">Upgrade to Pro</a></div>`;
        document.getElementById("deck-counter").textContent = "🔒";
        return;
    }

    if (!QB.activeDeck.length) {
        container.innerHTML = `<div class="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400"><div class="text-4xl mb-3">${QB.filters.savedOnly ? "🔖" : "🔍"}</div><p class="font-bold text-slate-600 dark:text-slate-300">No questions match these filters.</p><button type="button" onclick="window.QBankEngine.resetAllFilters()" class="mt-3 px-5 py-2.5 bg-brand-500 text-white text-xs font-bold rounded-xl border-none cursor-pointer">Reset Filters</button></div>`;
        document.getElementById("deck-counter").textContent = "0/0";
        return;
    }

    const anchorQ = QB.activeDeck[QB.deckIndex];
    const displayedQ = QB.tp.overrideQid ? (findQuestionByQid(QB.tp.overrideQid) || anchorQ) : anchorQ;
    const safeQ = escapeHtml(displayedQ.q);
    document.getElementById("deck-counter").textContent = `${QB.deckIndex + 1}/${QB.activeDeck.length}`;

    const isAdmin = isUserAdmin();
    const showTP = isAdmin || Boolean(MPPStore.featureFlags.showTeenPatti);
    const showPG = isAdmin || Boolean(MPPStore.featureFlags.showCrossExamPG);
    const showAnsCards = isAdmin || Boolean(MPPStore.featureFlags.showAnswerCards);

    // Teen Patti Cluster Info
    const clusterInfo = getActiveClusterInfo(anchorQ.q, displayedQ.q, (showPG && QB.tp.fanOpen) ? QB.tp.examFilter : null);
    const seq = clusterInfo.sequence;
    const curUp = String(displayedQ.q).trim().toUpperCase();
    let pos = seq.findIndex(id => String(id).trim().toUpperCase() === curUp);
    if (pos === -1) pos = 0;

    const tpPillHtml = showTP ? `
        <div class="mpp-cluster-pill ${QB.tp.fanOpen ? "pill-fan-active" : ""}"
             data-tp-pill="${safeQ}" title="Tap to fan cards${isAdmin ? " • Long-press to link sub-topics" : ""}">
            <button type="button" class="mpp-cluster-btn" onclick="window.QBankEngine.stepCluster(-1, event)" ${pos <= 0 ? "disabled" : ""}>&lt;</button>
            <span class="mpp-cluster-count" id="mpp-pill-center-text" onclick="window.QBankEngine.toggleFanView(event)">${pos + 1}/${Math.max(1, seq.length)}</span>
            <button type="button" class="mpp-cluster-btn" onclick="window.QBankEngine.stepCluster(1, event)" ${pos >= seq.length - 1 ? "disabled" : ""}>&gt;</button>
        </div>` : "";

    const topicBarHtml = (showTP && (clusterInfo.topics.length > 1 || (clusterInfo.topics.length === 1 && clusterInfo.topics[0].title !== "Linked Concept")))
        ? `<div class="mpp-topic-dims-bar">${clusterInfo.topics.map(t => {
            const act = clusterInfo.activeTopic?.slug === t.slug;
            const tSeq = filterSequenceByRole(t.qids, displayedQ.q);
            return `<button type="button" class="mpp-topic-dim-pill ${act ? "active" : ""}" onclick="window.QBankEngine.switchTopic('${escapeHtml(t.slug)}')"><span>🏷️ ${escapeHtml(t.title)}</span><span class="mpp-topic-dim-count">${tSeq.length}</span></button>`;
        }).join("")}</div>` : "";

    const saved = isItemBookmarked(displayedQ.q);
    const bmkCls = saved
        ? "bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-700"
        : "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700";

    // Question Body + Options
    const cleanStem = formatInlineMathAndBold(displayedQ.stem);
    const imgHtml = (displayedQ.img && !cleanStem.includes(displayedQ.img))
        ? `<img src="${escapeHtml(displayedQ.img)}" class="max-h-64 rounded-xl mx-auto my-3 border border-slate-200 dark:border-slate-700 cursor-zoom-in" alt="Question Image">`
        : "";

    let bodyHtml = "";
    const pickedOpt = QB.userSolved[displayedQ.q];
    if (displayedQ.type === "MCQ") {
        const key = String(displayedQ.ans_key || "").trim().toUpperCase();
        const optsHtml = (displayedQ.options || []).map((opt, i) => {
            const l = OPTION_LETTERS[i] || "-";
            let cls = "deck-option-btn group";
            if (pickedOpt) {
                if (l === key) cls += " deck-opt-correct";
                else if (l === pickedOpt) cls += " deck-opt-wrong";
            }
            return `<button type="button" onclick="window.QBankEngine.answerDeckMCQ(this, '${safeQ}', '${l}', '${key}')" class="${cls}" ${pickedOpt ? "disabled" : ""}>
                <div class="flex items-start gap-3">
                    <span class="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-500 text-xs font-extrabold flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-600">${l}</span>
                    <span class="text-sm font-medium pt-0.5 text-left">${formatInlineMathAndBold(opt)}</span>
                </div>
            </button>`;
        }).join("");

        const resetBtn = pickedOpt
            ? `<div class="flex justify-end mb-2"><button type="button" onclick="window.QBankEngine.resetSingleAnswer('${safeQ}')" class="text-[11px] font-bold text-slate-500 hover:text-brand-500 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer">🔄 Reset Attempt</button></div>`
            : "";

        bodyHtml = `<div class="mb-4 text-lg font-bold text-slate-900 dark:text-white leading-snug text-left">${cleanStem}</div>${imgHtml}<div class="pb-1">${optsHtml}</div>${resetBtn}`;
    } else {
        bodyHtml = `<div class="mb-4"><div class="theory-question text-left">${cleanStem}</div>${imgHtml}</div>`;
    }

    // Answer Panel
    const liveAns = QB.liveAnswers[displayedQ.q]?.text || "";
    const canViewAns = isAdmin || (Boolean(liveAns) && QB.subjectSettings.showAnswers);
    let ansPanelHtml = "";

    if (canViewAns || isAdmin) {
        const btnText = isAdmin ? (liveAns ? "✍️ Edit Answer" : "➕ Add Answer") : "👁️ View Answer";
        const btnStyle = isAdmin && !liveAns
            ? "border-dashed border-brand-300 text-brand-500 bg-transparent"
            : "bg-brand-50 text-brand-600 border-brand-200 dark:bg-slate-800 dark:text-brand-400 dark:border-slate-700";

        const panelInner = isAdmin
            ? `<div class="flex flex-col gap-4">
                <div class="bg-brand-50/50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-dashed border-brand-300 dark:border-brand-700">
                    <div class="flex justify-between items-center mb-2">
                        <label class="text-[10px] font-black text-brand-600 dark:text-brand-400 uppercase">Markdown Editor</label>
                        <button type="button" onclick="window.MPPAdmin?.openMediaPickerFor('admin-ans-deck-${safeQ}', 'admin-preview-deck-${safeQ}', 'upload')" class="px-2.5 py-1 rounded-lg bg-sky-500 text-white text-[10px] font-extrabold border-none cursor-pointer">📤 Upload / 🔍 Search Media</button>
                    </div>
                    <textarea id="admin-ans-deck-${safeQ}" oninput="window.QBankEngine.updateAnswerPreview('deck', '${safeQ}')" class="w-full p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm h-44 outline-none dark:text-white resize-y">${escapeHtml(liveAns)}</textarea>
                    <button type="button" onclick="window.QBankEngine.publishAnswer('${safeQ}', this, 'deck')" class="mt-2.5 w-full py-2.5 bg-brand-500 hover:bg-brand-600 text-white text-xs font-extrabold rounded-xl border-none cursor-pointer uppercase">Publish Answer</button>
                </div>
                <div class="bg-white dark:bg-dark-surface rounded-xl border border-green-200 dark:border-green-900/50 overflow-hidden">
                    <div class="px-3.5 py-2 bg-green-50 dark:bg-green-900/20 text-[10px] font-black text-green-600 uppercase">Live Student Preview</div>
                    <div id="admin-preview-deck-${safeQ}" class="p-4 markdown-body">${renderContent(liveAns)}</div>
                </div>
            </div>`
            : `<div class="bg-green-50 dark:bg-green-900/10 p-4 rounded-xl border border-green-200 dark:border-green-900/30"><div class="markdown-body">${renderContent(liveAns)}</div></div>`;

        const adminRowBtns = isAdmin ? `
            <button type="button" onclick="window.MPPAdmin?.openEditQuestionModal('${safeQ}')" class="px-3.5 py-2.5 font-bold rounded-xl border border-blue-200 text-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-400 text-xs cursor-pointer">✏️ Edit</button>
            <button type="button" onclick="window.MPPAdmin?.confirmDeleteQuestion('${safeQ}')" class="px-3.5 py-2.5 font-bold rounded-xl border border-red-200 text-red-600 bg-red-50 dark:bg-red-900/30 dark:border-red-800 dark:text-red-400 text-xs cursor-pointer">🗑️</button>` : "";

        ansPanelHtml = `
            <div class="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div class="flex gap-2">
                    <button type="button" id="btn-deck-ans-${safeQ}" onclick="window.QBankEngine.toggleDeckAnswerPanel('${safeQ}')" class="flex-1 py-2.5 font-bold rounded-xl border text-xs uppercase cursor-pointer ${btnStyle}">${btnText}</button>
                    ${adminRowBtns}
                </div>
                <div id="deck-ans-panel-${safeQ}" class="hidden mt-4">${panelInner}</div>
            </div>`;
    }

    const ansImgHtml = (displayedQ.ans_image && showAnsCards)
        ? `<div class="mt-3"><button type="button" onclick="document.getElementById('deck-ans-img-${safeQ}').classList.toggle('hidden')" class="w-full py-2 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/30 text-xs font-extrabold cursor-pointer">🖼️ Toggle Visual Answer Card</button><div id="deck-ans-img-${safeQ}" class="hidden mt-2"><img src="${escapeHtml(displayedQ.ans_image)}" class="max-h-96 mx-auto rounded-xl cursor-zoom-in" alt="Answer Card"></div></div>`
        : "";

    // Teen Patti Fan Overlay
    const fanOverlayHtml = (showTP && QB.tp.fanOpen) ? buildTeenPattiOverlayHTML(anchorQ, displayedQ, clusterInfo, pos, showPG) : "";

    const chs = Array.isArray(displayedQ.chapter) ? displayedQ.chapter : [displayedQ.chapter];
    const idDisplay = displayedQ.q !== anchorQ.q ? `${escapeHtml(anchorQ.q)} → ${safeQ}` : safeQ;

    container.innerHTML = `
        <div class="deck-card glass-card w-full h-full flex flex-col question-card" data-qid="${safeQ}">
            <div class="mb-3 flex justify-between items-center gap-1.5 flex-nowrap shrink-0">
                <div class="flex items-center gap-1.5 min-w-0">
                    <span class="px-2.5 py-1 bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 rounded-full text-[11px] font-extrabold border border-brand-200 dark:border-brand-800 whitespace-nowrap">${idDisplay}</span>
                    ${tpPillHtml}
                </div>
                <div class="flex items-center gap-1.5 shrink-0">
                    <button type="button" id="bmk-deck-${safeQ}" onclick="window.QBankEngine.toggleBookmark('${safeQ}')" class="px-2.5 py-1 rounded-lg ${bmkCls} text-[11px] font-bold border cursor-pointer whitespace-nowrap">${saved ? "⭐ Saved" : "🔖 Save"}</button>
                    <button type="button" onclick="window.QBankEngine.askAI('${safeQ}')" class="px-2.5 py-1 rounded-lg bg-green-500/10 text-green-600 dark:text-green-400 text-[11px] font-bold border border-green-500/20 cursor-pointer whitespace-nowrap">Ask AI</button>
                </div>
            </div>
            <div class="flex-1 overflow-y-auto custom-scrollbar pr-1">
                ${topicBarHtml}
                <div class="${QB.tp.fanOpen ? "mpp-body-under-fan" : ""}">
                    ${bodyHtml}
                    ${ansImgHtml}
                    ${ansPanelHtml}
                </div>
                ${fanOverlayHtml}
            </div>
            <div class="mt-auto pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-1.5 shrink-0">
                ${chs.map(c => `<span class="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-500 uppercase border border-slate-200 dark:border-slate-700">${escapeHtml(c)}</span>`).join("")}
            </div>
        </div>`;
    container.scrollTop = 0;

    if (QB.tp.fanOpen) attachFanSwipeInteractions();

    // Admin-only hooks: Visual Preview Toolbar + Long-Press Cross-Linker
    if (isAdmin && window.MPPAdmin) {
        const pv = document.getElementById(`admin-preview-deck-${displayedQ.q}`);
        if (pv && window.MPPAdmin.attachPreviewVisualToolbar) {
            window.MPPAdmin.attachPreviewVisualToolbar(pv, `admin-ans-deck-${displayedQ.q}`);
        }
        const pillEl = container.querySelector("[data-tp-pill]");
        if (pillEl && window.MPPAdmin.bindSafeLongPress && window.MPPAdmin.openCrossLinkModal) {
            window.MPPAdmin.bindSafeLongPress(pillEl, () => window.MPPAdmin.openCrossLinkModal(displayedQ.q), 500);
        }
    }
}

// ============================================================================
// 6. TEEN PATTI SUB-TOPIC CLUSTERS & FAN RENDERING
// ============================================================================
function inferExamFromQid(qid) {
    const clean = String(qid || "").trim().toUpperCase();
    if (QB.qnaData.some(x => String(x.q).trim().toUpperCase() === clean)) return "aiims-profs";
    const ext = QB.tp.externalLookup[clean] || QB.tp.sharedCache[clean];
    if (ext?.examKey) return ext.examKey;
    if (clean.startsWith("INI") || clean.startsWith("IN")) return "inicet";
    if (clean.startsWith("CMS") || clean.startsWith("UPSC")) return "upsc-cms";
    if (clean.startsWith("FMGE") || clean.startsWith("F")) return "fmge";
    if (clean.startsWith("N")) return "neet-pg";
    return "aiims-profs";
}

function getExamColor(qid) {
    const ex = inferExamFromQid(qid);
    if (ex === "neet-pg") return "#2563eb";
    if (ex === "inicet") return "#9333ea";
    if (ex === "upsc-cms") return "#eab308";
    if (ex === "fmge") return "#22c55e";
    return "#0ea5e9";
}

function ingestCrossLinks(val) {
    const clusters = {};
    const rawC = val.clusters || {};
    Object.keys(rawC).forEach(slug => {
        const c = rawC[slug];
        if (!c?.qids) return;
        const qids = (Array.isArray(c.qids) ? c.qids : Object.values(c.qids)).map(x => String(x).trim()).filter(Boolean);
        if (qids.length) clusters[slug] = { slug, title: String(c.title || "Linked Concept").trim(), qids };
    });

    const nodeTopics = {};
    const rawNT = val.node_topics || {};
    Object.keys(rawNT).forEach(k => {
        const arr = (Array.isArray(rawNT[k]) ? rawNT[k] : Object.values(rawNT[k] || {})).filter(s => Boolean(clusters[s]));
        if (arr.length) nodeTopics[String(k).trim().toUpperCase()] = arr;
    });

    const nodes = {};
    const rawN = val.nodes || {};
    Object.keys(rawN).forEach(k => {
        const up = String(k).trim().toUpperCase();
        const arr = (Array.isArray(rawN[k]) ? rawN[k] : Object.values(rawN[k] || {})).map(x => String(x).trim()).filter(Boolean);
        nodes[up] = arr;
        if (!nodeTopics[up] && arr.length > 1) {
            const slug = "cluster-" + arr[0].toLowerCase().replace(/[^a-z0-9]+/g, "");
            if (!clusters[slug]) clusters[slug] = { slug, title: "Linked Concept", qids: arr };
            nodeTopics[up] = [slug];
        }
    });

    QB.tp.clusters = clusters;
    QB.tp.nodeTopics = nodeTopics;
    QB.tp.nodes = nodes;
    QB.tp.history = (Array.isArray(val.history) ? val.history : Object.values(val.history || {})).filter(Boolean).slice(0, 10);

    if (val.shared_q_cache && typeof val.shared_q_cache === "object") {
        QB.tp.sharedCache = val.shared_q_cache;
        Object.values(val.shared_q_cache).forEach(rec => {
            if (rec?.q && rec.explanation && !QB.liveAnswers[rec.q]) {
                QB.liveAnswers[rec.q] = { text: rec.explanation };
            }
        });
    }

    if (QB.isDeckMode) renderDeckCard();
}

function filterSequenceByRole(rawSeq, fallbackQid, examFilter = null) {
    const fb = String(fallbackQid || "").trim();
    if (!Array.isArray(rawSeq) || !rawSeq.length) return fb ? [fb] : [];
    const canSeePG = isUserAdmin() || Boolean(MPPStore.featureFlags.showCrossExamPG);
    if (!canSeePG) {
        const aiimsOnly = rawSeq.filter(id => inferExamFromQid(id) === "aiims-profs");
        return aiimsOnly.length ? aiimsOnly : (fb ? [fb] : []);
    }
    if (examFilter && examFilter !== "all") {
        return rawSeq.filter(id => inferExamFromQid(id) === examFilter);
    }
    return [...rawSeq];
}

function getActiveClusterInfo(anchorQid, displayedQid, examFilter = null) {
    const seen = new Set();
    const topics = [];
    const canSeePG = isUserAdmin() || Boolean(MPPStore.featureFlags.showCrossExamPG);

    [displayedQid, anchorQid].forEach(qid => {
        if (!qid) return;
        const slugs = QB.tp.nodeTopics[String(qid).trim().toUpperCase()] || [];
        slugs.forEach(s => {
            const c = QB.tp.clusters[s];
            if (!c || seen.has(s)) return;
            if (!canSeePG && !c.qids.some(id => inferExamFromQid(id) === "aiims-profs")) return;
            seen.add(s);
            topics.push(c);
        });
    });

    const fb = displayedQid || anchorQid;
    if (!topics.length) return { topics: [], activeTopic: null, sequence: fb ? [String(fb).trim()] : [] };
    let active = topics.find(t => t.slug === QB.tp.activeTopicSlug) || topics[0];
    QB.tp.activeTopicSlug = active.slug;
    return { topics, activeTopic: active, sequence: filterSequenceByRole(active.qids, fb, examFilter) };
}

function buildFanStageHTML(deckKey, qidList, colorOverride, activePos, topicTitle) {
    const fbColor = (!colorOverride || colorOverride === "auto") ? "#0ea5e9" : colorOverride;
    if (!qidList.length) {
        return `<div class="tp-fan-stage" data-deck-key="${deckKey}" style="height:190px;"><div class="tp-empty-fan-box" style="border-color:${fbColor};">No linked cards in this exam</div></div>`;
    }

    const total = qidList.length;
    const safePos = Math.min(Math.max(0, activePos), total - 1);
    QB.tp.fanPosMap[deckKey] = safePos;

    const lCnt = safePos, rCnt = total - 1 - safePos;
    const lAng = lCnt ? Math.min(48, lCnt * 10) / lCnt : 0;
    const lShf = lCnt ? Math.min(22, 110 / lCnt) : 0;
    const rAng = rCnt ? Math.min(48, rCnt * 10) / rCnt : 0;
    const rShf = rCnt ? Math.min(22, 110 / rCnt) : 0;

    const cards = qidList.map((qid, idx) => {
        const qObj = findQuestionByQid(qid) || { q: qid, type: "Theory", stem: `Question ${qid}`, examBatch: inferExamFromQid(qid).toUpperCase() };
        const color = (!colorOverride || colorOverride === "auto") ? getExamColor(qid) : colorOverride;
        const off = idx - safePos, d = Math.abs(off);
        const tr = off < 0
            ? `rotate(${-(d * lAng).toFixed(2)}deg) translateX(${-(d * lShf).toFixed(2)}px) translateY(${(d * 3).toFixed(2)}px)`
            : off > 0
                ? `rotate(${(d * rAng).toFixed(2)}deg) translateX(${(d * rShf).toFixed(2)}px) translateY(${(d * 3).toFixed(2)}px)`
                : "translate3d(0,0,0)";

        const stemText = escapeHtml(stripHtml(qObj.stem) || qid);
        const batch = escapeHtml(Array.isArray(qObj.examBatch) ? qObj.examBatch[0] : (qObj.examBatch || QB.collegeName));
        const safeId = escapeHtml(qid);

        const optsMini = (qObj.type === "MCQ" && Array.isArray(qObj.options))
            ? qObj.options.slice(0, 4).map((o, i) => `<div class="tp-mini-opt"><span class="tp-mini-opt-char">${OPTION_LETTERS[i]}</span><span class="truncate">${escapeHtml(stripHtml(o))}</span></div>`).join("")
            : `<div class="p-2 rounded-lg text-[10px] border border-dashed" style="border-color:${color};">📝 Theory / Clinical — Tap to open</div>`;

        return `
        <div class="tp-patti" data-qid="${safeId}" data-idx="${idx}" data-color="${color}" style="border-color:${color}; transform:${tr}; z-index:${100 - d};">
            <div style="opacity:${off === 0 ? "1" : "0.25"}; display:flex; flex-direction:column; justify-content:space-between; height:100%;">
                <div>
                    <div class="flex justify-between items-center mb-1.5">
                        <span class="px-2 py-0.5 rounded-full text-white text-[10px] font-extrabold" style="background:${color};">${idx + 1}/${total}</span>
                        <span class="px-2 py-0.5 rounded text-[10px] font-extrabold border" style="border-color:${color}; color:${color};">${safeId}</span>
                    </div>
                    ${topicTitle && topicTitle !== "Linked Concept" ? `<div class="text-[9.5px] font-extrabold text-sky-700 bg-sky-100 px-1.5 py-0.5 rounded mb-1 truncate">🏷️ ${escapeHtml(topicTitle)}</div>` : ""}
                    <div class="tp-center-stem">${stemText}</div>
                </div>
                <div class="flex flex-col gap-1 my-1">${optsMini}</div>
                <div class="pt-1 border-t border-dashed border-slate-300 dark:border-slate-700 text-center">
                    <div class="text-[9.5px] font-extrabold truncate" style="color:${color};">${batch}</div>
                    <div class="text-[9px] text-slate-400">Tap card to open</div>
                </div>
            </div>
        </div>`;
    }).join("");

    return `<div class="tp-fan-stage" data-deck-key="${deckKey}">${cards}</div>`;
}

function buildTeenPattiOverlayHTML(anchorQ, displayedQ, clusterInfo, pos, showPG) {
    const title = clusterInfo.activeTopic?.title || "";
    const mainFan = buildFanStageHTML("main", clusterInfo.sequence, "auto", pos, title);

    let extended = "";
    if (showPG) {
        const fullSeq = getActiveClusterInfo(anchorQ.q, displayedQ.q, "all").sequence;
        const exams = [
            ["aiims-profs", "AIIMS PROFS PYQ", "#0ea5e9"],
            ["neet-pg", "NEET-PG", "#2563eb"],
            ["inicet", "INI-CET", "#9333ea"],
            ["upsc-cms", "UPSC CMS", "#eab308"],
            ["fmge", "FMGE", "#22c55e"]
        ];
        const f = QB.tp.examFilter;
        const sw = [["all", "All"], ["aiims-profs", "AIIMS"], ["neet-pg", "NEET"], ["inicet", "INI"], ["upsc-cms", "CMS"], ["fmge", "FMGE"]]
            .map(([k, lbl]) => `<button type="button" class="tp-switch-btn ${f === k ? "active" : ""}" onclick="window.QBankEngine.setTPExamFilter('${k}')">${lbl}</button>`).join("");

        extended = `
            <div class="w-full max-w-[560px] mx-auto mt-2">
                <div class="tp-admin-switcher">${sw}</div>
                ${exams.map(([key, label, col]) => {
                    const list = fullSeq.filter(id => inferExamFromQid(id) === key);
                    return `${buildFanStageHTML("ex-" + key, list, col, QB.tp.fanPosMap["ex-" + key] || 0, title)}<div class="tp-exam-label-box">${label}</div>`;
                }).join("")}
            </div>`;
    }

    return `<div class="tp-parent-overlay" onclick="if(event.target===this) window.QBankEngine.toggleFanView()">${mainFan}${extended}</div>`;
}

function attachFanSwipeInteractions() {
    document.querySelectorAll(".tp-fan-stage").forEach(stage => {
        const key = stage.dataset.deckKey;
        let sx = 0, sy = 0, dx = 0, dy = 0, dragging = false;

        const start = (x, y) => { sx = x; sy = y; dx = 0; dy = 0; dragging = true; };
        const move = (x, y) => { if (dragging) { dx = x - sx; dy = y - sy; } };
        const end = (target) => {
            if (!dragging) return;
            dragging = false;
            const cards = stage.querySelectorAll(".tp-patti");
            if (!cards.length) return;
            const cur = QB.tp.fanPosMap[key] || 0;
            if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 35) {
                const next = dx < -35 ? Math.min(cards.length - 1, cur + 1) : Math.max(0, cur - 1);
                if (next !== cur) {
                    QB.tp.fanPosMap[key] = next;
                    if (key === "main") QB.tp.overrideQid = cards[next]?.dataset.qid || null;
                    renderDeckCard();
                }
                return;
            }
            if (Math.abs(dx) < 10 && Math.abs(dy) < 10) {
                const card = target?.closest?.(".tp-patti");
                if (card?.dataset.qid) {
                    QB.tp.overrideQid = card.dataset.qid;
                    QB.tp.fanOpen = false;
                    renderDeckCard();
                }
            }
        };

        stage.addEventListener("touchstart", e => e.touches[0] && start(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
        stage.addEventListener("touchmove", e => e.touches[0] && move(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
        stage.addEventListener("touchend", e => end(e.target));
        stage.addEventListener("mousedown", e => start(e.clientX, e.clientY));
        stage.addEventListener("mousemove", e => move(e.clientX, e.clientY));
        stage.addEventListener("mouseup", e => end(e.target));
    });
}

// ============================================================================
// 7. SOLVED PROGRESS & RESUME PRACTICE ENGINE
// ============================================================================
function getSolvedStorageKeys() {
    const uid = MPPStore.user?.uid || "guest";
    const { college, settingsKey } = getVaultKeys();
    return {
        uid,
        cacheKey: `mpp_solved_${uid}_${college}_${settingsKey}`,
        indexKey: `mpp_index_${uid}_${college}_${settingsKey}`,
        fbSolvedPath: `users/${uid}/solved/${college}/${settingsKey}`,
        fbIndexPath: `users/${uid}/last_index/${college}/${settingsKey}`
    };
}

function saveCurrentDeckIndex() {
    const { uid, indexKey, fbIndexPath } = getSolvedStorageKeys();
    if (!QB.activeDeck.length || QB.activeDeck.length !== QB.displayData.length) return;
    localStorage.setItem(indexKey, String(QB.deckIndex));
    if (uid !== "guest") set(ref(db, fbIndexPath), QB.deckIndex).catch(() => {});
}

async function loadSolvedAndResumeState() {
    const { uid, cacheKey, indexKey, fbSolvedPath, fbIndexPath } = getSolvedStorageKeys();
    try { QB.userSolved = JSON.parse(localStorage.getItem(cacheKey) || "{}") || {}; } catch (_) { QB.userSolved = {}; }
    let savedIndex = parseInt(localStorage.getItem(indexKey), 10);

    if (uid !== "guest") {
        const [sSnap, iSnap] = await Promise.all([
            get(ref(db, fbSolvedPath)).catch(() => null),
            get(ref(db, fbIndexPath)).catch(() => null)
        ]);
        if (sSnap && sSnap.exists()) {
            const cloud = sSnap.val() || {};
            Object.keys(cloud).forEach(qid => { if (cloud[qid]?.ans) QB.userSolved[qid] = cloud[qid].ans; });
            localStorage.setItem(cacheKey, JSON.stringify(QB.userSolved));
        }
        if ((isNaN(savedIndex) || savedIndex <= 0) && iSnap && iSnap.exists()) {
            const cIdx = parseInt(iSnap.val(), 10);
            if (!isNaN(cIdx) && cIdx > 0) { savedIndex = cIdx; localStorage.setItem(indexKey, String(cIdx)); }
        }
    }

    QB.deckStatus = {};
    Object.keys(QB.userSolved).forEach(qid => {
        const q = findQuestionByQid(qid);
        if (q) {
            const corr = String(QB.userSolved[qid]).toUpperCase() === String(q.ans_key || "A").toUpperCase();
            QB.deckStatus[qid] = corr ? "correct" : "wrong";
        }
    });

    if (QB.isDeckMode) renderDeckCard();

    if (!QB.resumeChecked && QB.displayData.length > 0 && MPPStore.accessLevel !== "guest") {
        QB.resumeChecked = true;
        if (!isNaN(savedIndex) && savedIndex > 0 && savedIndex < QB.displayData.length) {
            QB.tempSavedIndex = savedIndex;
            const num = document.getElementById("resume-q-num");
            if (num) num.textContent = String(savedIndex + 1);
            const ov = document.getElementById("resume-prompt-overlay");
            if (ov) ov.style.display = "flex";
        }
    }
}

// ============================================================================
// 8. SHARED DOM & CSS INJECTION FOR DECK + RESUME MODAL
// ============================================================================
function injectQBankStyles() {
    if (document.getElementById("mpp-qbank-css")) return;
    document.head.insertAdjacentHTML("beforeend", `
    <style id="mpp-qbank-css">
        .mpp-cluster-pill {
            border-radius: 999px; border: 1.5px solid #0284c7; background: #f0f9ff; color: #0369a1;
            font-weight: 800; font-size: 11.5px; display: inline-flex; align-items: center; overflow: hidden; user-select: none;
        }
        html.dark .mpp-cluster-pill { background: #0f172a; border-color: #38bdf8; color: #38bdf8; }
        .mpp-cluster-pill.pill-fan-active { background: #0284c7 !important; color: #fff !important; }
        .mpp-cluster-btn { background: transparent; border: none; color: inherit; font-weight: 900; padding: 3px 8px; cursor: pointer; }
        .mpp-cluster-btn:disabled { opacity: 0.35; cursor: default; }
        .mpp-cluster-count { padding: 3px 8px; cursor: pointer; border-left: 1px solid rgba(14,165,233,0.3); border-right: 1px solid rgba(14,165,233,0.3); }
        .mpp-topic-dims-bar { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 10px; padding: 6px 8px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; }
        html.dark .mpp-topic-dims-bar { background: rgba(15,23,42,0.7); border-color: #1e293b; }
        .mpp-topic-dim-pill { display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 999px; border: 1.5px solid #cbd5e1; background: #fff; color: #475569; font-size: 11px; font-weight: 800; cursor: pointer; }
        html.dark .mpp-topic-dim-pill { background: #1e293b; border-color: #334155; color: #cbd5e1; }
        .mpp-topic-dim-pill.active { background: #0284c7; border-color: #0284c7; color: #fff; }
        .mpp-topic-dim-count { font-size: 9.5px; padding: 1px 6px; border-radius: 999px; background: rgba(0,0,0,0.08); }
        .mpp-body-under-fan { opacity: 0.25; filter: blur(0.4px); pointer-events: none; }
        .tp-parent-overlay { position: relative; margin-top: 8px; z-index: 60; display: flex; flex-direction: column; align-items: center; }
        .tp-fan-stage { position: relative; width: 100%; max-width: 520px; height: 390px; margin: 8px auto 16px; display: flex; align-items: center; justify-content: center; touch-action: pan-y; user-select: none; }
        .tp-patti { position: absolute; width: 235px; height: 340px; background: #fff; color: #0f172a; border: 2.5px solid #0ea5e9; border-radius: 14px; box-shadow: 0 12px 28px rgba(15,23,42,0.22); padding: 12px; cursor: pointer; transform-origin: 50% 105%; transition: transform 0.25s ease; overflow: hidden; }
        html.dark .tp-patti { background: #0f172a; color: #f8fafc; }
        .tp-center-stem { overflow: hidden; display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; font-size: 11.5px; font-weight: 600; line-height: 1.35; text-align: left; }
        .tp-mini-opt { display: flex; align-items: center; gap: 5px; padding: 3px 6px; border: 1px solid #cbd5e1; border-radius: 6px; background: #f8fafc; font-size: 10px; font-weight: 600; overflow: hidden; }
        html.dark .tp-mini-opt { background: #1e293b; border-color: #334155; color: #cbd5e1; }
        .tp-mini-opt-char { width: 15px; height: 15px; border-radius: 50%; background: #e2e8f0; color: #0f172a; font-size: 9px; font-weight: 800; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .tp-admin-switcher { border: 2px solid #ea580c; border-radius: 10px; background: #fff7ed; padding: 6px; display: flex; justify-content: center; gap: 5px; flex-wrap: wrap; margin-bottom: 18px; }
        html.dark .tp-admin-switcher { background: #1e293b; }
        .tp-switch-btn { background: #fff; border: 1.5px solid #fdba74; color: #9a3412; font-weight: 800; font-size: 11px; padding: 3px 8px; border-radius: 6px; cursor: pointer; }
        .tp-switch-btn.active { background: #ea580c; color: #fff; border-color: #ea580c; }
        .tp-exam-label-box { border: 2px solid #ea580c; background: #fff; color: #0f172a; font-weight: 800; font-size: 11px; padding: 4px 18px; border-radius: 6px; margin: -6px auto 22px; width: fit-content; }
        html.dark .tp-exam-label-box { background: #0f172a; color: #f8fafc; }
        .tp-empty-fan-box { width: 230px; height: 160px; border: 2px dashed #94a3b8; border-radius: 14px; display: flex; align-items: center; justify-content: center; color: #64748b; font-weight: 700; font-size: 12px; text-align: center; padding: 14px; }
    </style>`);
}

function injectDeckAndResumeDOM() {
    if (!document.getElementById("universal-deck-layer")) {
        document.body.insertAdjacentHTML("beforeend", `
        <div id="universal-deck-layer">
            <div class="px-3 py-2.5 bg-white dark:bg-dark-surface border-b border-slate-200 dark:border-slate-800 flex justify-between items-center gap-2 shadow-sm z-10 shrink-0">
                <div class="flex items-center gap-1.5 min-w-0">
                    <button type="button" onclick="window.userPanelApp.toggle()" class="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 bg-transparent border-none cursor-pointer shrink-0" title="Account">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
                    </button>
                    <a href="index.html" class="shrink-0" title="Home">
                        <img src="${APP_LOGO_URL}" referrerpolicy="no-referrer" class="w-7 h-7 rounded-lg object-cover ring-1 ring-accent-yellow" alt="Logo">
                    </a>
                    <button type="button" onclick="window.QBankEngine.toggleDeckDrawer('filter')" class="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 bg-transparent border-none cursor-pointer shrink-0" title="Filters">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"/></svg>
                    </button>
                    <div class="min-w-0">
                        <div class="font-bold text-sm text-brand-600 dark:text-brand-400 leading-tight truncate">Review Mode</div>
                        <div id="deck-subtitle" class="text-[10px] text-slate-500 font-semibold truncate">Loading...</div>
                    </div>
                </div>
                <div class="flex items-center gap-1.5 shrink-0">
                    <button type="button" id="deck-header-saved-btn" onclick="window.QBankEngine.toggleSavedFilter()" class="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs font-bold cursor-pointer" title="Saved Only">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/></svg>
                    </button>
                    <button type="button" onclick="window.QBankEngine.toggleDeckMode()" class="px-2 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs font-bold cursor-pointer" title="Switch to Table View">📋</button>
                    <button type="button" onclick="window.QBankEngine.toggleDeckDrawer('nav')" class="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 cursor-pointer">
                        <span id="deck-counter">0/0</span><span>☰</span>
                    </button>
                </div>
            </div>

            <div id="deck-card-container" class="flex-1 p-3 sm:p-4 overflow-hidden relative bg-slate-50 dark:bg-dark-bg"></div>

            <div class="px-4 pt-3 bg-white dark:bg-dark-surface border-t border-slate-200 dark:border-slate-800 flex gap-3 z-10 shrink-0" style="padding-bottom: max(14px, env(safe-area-inset-bottom));">
                <button type="button" onclick="window.QBankEngine.deckPrev()" class="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 font-bold text-slate-600 dark:text-slate-300 border-none cursor-pointer">Previous</button>
                <button type="button" onclick="window.QBankEngine.deckNext()" class="flex-1 py-3 rounded-xl bg-brand-500 text-white font-bold shadow-lg border-none cursor-pointer">Next</button>
            </div>

            <div id="deck-nav-drawer" class="deck-drawer">
                <div class="deck-drawer-bg" onclick="window.QBankEngine.toggleDeckDrawer(null)"></div>
                <div class="deck-drawer-content">
                    <div class="p-4 border-b border-slate-200 dark:border-slate-700 font-bold flex justify-between items-center text-slate-800 dark:text-white">
                        <div><span>Navigator</span><span class="block text-[10px] font-semibold text-amber-500">🔖 = Bookmarked</span></div>
                        <button type="button" onclick="window.QBankEngine.toggleDeckDrawer(null)" class="bg-transparent border-none text-lg cursor-pointer dark:text-white">✕</button>
                    </div>
                    <div id="deck-nav-grid" class="nav-grid"></div>
                </div>
            </div>

            <div id="deck-filter-drawer" class="deck-drawer">
                <div class="deck-drawer-bg" onclick="window.QBankEngine.toggleDeckDrawer(null)"></div>
                <div class="deck-drawer-content">
                    <div class="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                        <span class="font-bold text-lg text-slate-800 dark:text-white">Filters</span>
                        <button type="button" onclick="window.QBankEngine.resetAllFilters()" class="text-xs text-brand-600 font-bold bg-brand-50 dark:bg-brand-900/30 px-3 py-1 rounded-full border border-brand-200 cursor-pointer">RESET</button>
                    </div>
                    <div id="deck-filter-content" class="p-4 overflow-y-auto flex-1 custom-scrollbar"></div>
                    <div class="p-4 border-t border-slate-200 dark:border-slate-700">
                        <button type="button" onclick="window.QBankEngine.toggleDeckDrawer(null)" class="w-full py-3 bg-brand-500 text-white rounded-xl font-bold border-none cursor-pointer">Done</button>
                    </div>
                </div>
            </div>
        </div>

        <button id="view-toggle-btn" type="button" onclick="window.QBankEngine.toggleDeckMode()" title="Switch Table / Deck View">🎴</button>
        <button id="floating-eye-btn" type="button" onclick="window.QBankEngine.toggleTableAnswers()" class="fixed bottom-[96px] right-6 z-[10000] w-12 h-12 rounded-full bg-white dark:bg-slate-800 text-slate-400 shadow-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center cursor-pointer" title="Reveal MCQ Keys in Table">👁️</button>

        <!-- RESUME PRACTICE MODAL -->
        <div id="resume-prompt-overlay" style="position:fixed;inset:0;background:rgba(15,23,42,0.85);z-index:39000;display:none;align-items:center;justify-content:center;backdrop-filter:blur(5px);">
            <div class="bg-white dark:bg-slate-900 w-[90%] max-w-sm rounded-3xl p-7 text-center shadow-2xl border border-slate-200 dark:border-slate-700">
                <div class="w-14 h-14 rounded-full bg-sky-100 dark:bg-sky-900/40 text-sky-600 dark:text-sky-400 mx-auto mb-4 flex items-center justify-center text-2xl">⏱️</div>
                <h3 class="text-xl font-black text-slate-900 dark:text-white mb-2">Resume Practice?</h3>
                <p class="text-sm text-slate-500 dark:text-slate-400 mb-6">You left off at Question <span id="resume-q-num" class="font-extrabold text-brand-500"></span>. Continue from there or start fresh?</p>
                <div class="flex gap-2.5">
                    <button type="button" onclick="window.QBankEngine.startFresh()" class="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-sm border-none cursor-pointer">Start Fresh</button>
                    <button type="button" onclick="window.QBankEngine.resumeSession()" class="flex-1 py-3 rounded-xl bg-brand-500 text-white font-bold text-sm border-none cursor-pointer shadow-lg">Continue</button>
                </div>
            </div>
        </div>`);
    }
}

// ============================================================================
// 9. HELPERS & PUBLIC API (window.QBankEngine)
// ============================================================================
export function findQuestionByQid(qId) {
    if (!qId) return null;
    const up = String(qId).trim().toUpperCase();
    return QB.qnaData.find(x => String(x.q).trim().toUpperCase() === up)
        || QB.tp.externalLookup[up]
        || QB.tp.sharedCache[up]
        || null;
}

function updateBookmarkButtonsUI() {
    QB.displayData.forEach(item => {
        const saved = isItemBookmarked(item.q);
        const cls = saved
            ? "bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-700"
            : "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700";
        const t = document.getElementById(`bmk-table-${item.q}`);
        if (t) { t.className = `w-full max-w-[84px] ${cls} font-semibold py-1.5 px-2 rounded-lg text-[10px] uppercase border cursor-pointer`; t.textContent = saved ? "⭐ Saved" : "🔖 Save"; }
        const d = document.getElementById(`bmk-deck-${item.q}`);
        if (d) { d.className = `px-3 py-1.5 rounded-lg ${cls} text-xs font-bold border cursor-pointer`; d.textContent = saved ? "⭐ Saved" : "🔖 Save"; }
    });
}

export function toggleDeckMode() {
    QB.isDeckMode = !QB.isDeckMode;
    const main = document.getElementById("main-wrapper");
    const deck = document.getElementById("universal-deck-layer");
    const fab = document.getElementById("view-toggle-btn");
    const eye = document.getElementById("floating-eye-btn");

    if (main) main.style.display = QB.isDeckMode ? "none" : "block";
    if (deck) deck.style.display = QB.isDeckMode ? "flex" : "none";
   if (fab) fab.style.display = QB.isDeckMode ? "none" : "flex";
    if (eye) eye.style.display = QB.isDeckMode ? "none" : "flex";
    if (QB.isDeckMode) renderDeckCard();
}

export const QBankEngine = {
    state: QB,
    findQuestionByQid,
    openAnswerModal,
    toggleDeckMode,
    reload: handleAuthOrReload,
    refreshUI: () => applyFiltersAndRender(),

    setSearch(val) {
        QB.filters.search = String(val || "").toLowerCase().trim();
        applyFiltersAndRender();
    },

    toggleDropdown(id) {
        document.querySelectorAll(".multiselect-menu").forEach(m => { if (m.id !== id + "Menu") m.classList.remove("show"); });
        document.getElementById(id + "Menu")?.classList.toggle("show");
    },

    toggleSetFilter(key, val, checked) {
        if (!QB.filters[key]) return;
        if (checked) QB.filters[key].add(val); else QB.filters[key].delete(val);
        applyFiltersAndRender();
    },

    toggleSavedFilter(force) {
        if (!MPPStore.user) { userPanelApp.open(); userPanelApp.setAuthMode("login"); return; }
        QB.filters.savedOnly = typeof force === "boolean" ? force : !QB.filters.savedOnly;
        applyFiltersAndRender();
    },

    setAttemptFilter(val) {
        QB.filters.attempt = val || "all";
        applyFiltersAndRender();
    },

    resetAllFilters() {
        QB.filters.search = "";
        QB.filters.savedOnly = false;
        QB.filters.attempt = "all";
        QB.filters.types.clear();
        QB.filters.chapters.clear();
        QB.filters.exams.clear();
        const s = document.getElementById("searchInput");
        if (s) s.value = "";
        applyFiltersAndRender();
    },

    toggleTableAnswers() {
        document.body.classList.toggle("show-answers");
        const eye = document.getElementById("floating-eye-btn");
        if (eye) eye.classList.toggle("ring-2", document.body.classList.contains("show-answers"));
    },

    async toggleBookmark(qId) {
        if (!MPPStore.user) {
            showModal("Login Required", "<p>Sign in to save cloud bookmarks.</p>", `<button type="button" onclick="window.MPPUI.closeModal(); window.userPanelApp.open(); window.userPanelApp.setAuthMode('login')" class="px-5 py-2.5 bg-brand-500 text-white rounded-xl font-bold text-xs border-none cursor-pointer">Sign In</button>`, "🔒");
            return;
        }
        const item = findQuestionByQid(qId);
        if (!item) return;
        const uniqueId = getUniqueQuestionId(item.q);
        const ch = Array.isArray(item.chapter) ? item.chapter[0] : item.chapter;
        const isSaved = isItemBookmarked(item.q);

        const data = {
            q: item.q,
            type: item.type || "Theory",
            text: stripHtml(item.stem) || "Saved Question",
            stemHtml: item.stem || "",
            subject: `${QB.collegeName} - ${QB.subjectName}${QB.mode === "clinical" ? " Clinical" : ""} - ${ch || "General"}`,
            url: window.location.href
        };
        if (item.options) data.options = item.options;
        if (item.ans_key) data.ans_key = item.ans_key;
        if (item.img) data.img = item.img;
        if (item.ans_image) data.ans_image = item.ans_image;
        if (QB.liveAnswers[item.q]?.text) data.explanation = QB.liveAnswers[item.q].text;

        const nowSaved = await saveOrRemoveBookmark(uniqueId, data, isSaved);
        showModal(
            nowSaved ? "Saved to Cloud! ☁️" : "Bookmark Removed",
            `<p>${nowSaved ? "Synced across all your devices." : "Removed from your saved items."}</p>`,
            "",
            nowSaved ? "⭐" : "🗑️"
        );
    },

    askAI(qId) {
        const item = findQuestionByQid(qId);
        if (!item) return;
        const stem = stripHtml(item.stem);
        const ch = Array.isArray(item.chapter) ? item.chapter.join(", ") : (item.chapter || "");
        const promptText = item.type === "MCQ"
            ? `Explain this MBBS ${QB.subjectName} MCQ:\n\nQ: ${stem}\nOptions:\n${(item.options || []).map((o, i) => `${OPTION_LETTERS[i]}) ${stripHtml(o)}`).join("\n")}\nKey: ${item.ans_key}`
            : `Provide a structured MBBS ${QB.subjectName} exam model answer:\n\n"${stem}"\nTopic: ${ch}`;
        navigator.clipboard?.writeText(promptText).then(() => {
            showModal("Copied for AI!", "<p>Question copied to clipboard.</p>", `<button type="button" onclick="window.open('https://chatgpt.com/','_blank'); window.MPPUI.closeModal();" class="px-5 py-2.5 bg-brand-500 text-white rounded-xl font-bold text-xs border-none cursor-pointer">Open ChatGPT</button>`, "✅");
        });
    },

    // Answer Modal / Deck Panel Helpers
    closeAnswerModal() { document.getElementById("answerModal")?.classList.add("hidden"); },

    updateAnswerPreview(ctx, qId) {
        const ta = document.getElementById(`admin-ans-${ctx}-${qId}`);
        const pv = document.getElementById(`admin-preview-${ctx}-${qId}`);
        if (ta && pv) pv.innerHTML = renderContent(ta.value);
    },

    async publishAnswer(qId, btn, ctx) {
        if (!isUserAdmin()) return;
        const ta = document.getElementById(`admin-ans-${ctx}-${qId}`);
        if (!ta) return;
        const text = ta.value.trim();
        if (!text && !confirm("Delete the current answer?")) return;
        const orig = btn.textContent;
        btn.disabled = true; btn.textContent = "Publishing...";
        try {
            await saveAnswer(qId, text);
            btn.textContent = "Published! ✅";
            setTimeout(() => { btn.textContent = orig; btn.disabled = false; }, 1100);
        } catch (err) {
            alert("Publish failed: " + err.message);
            btn.textContent = orig; btn.disabled = false;
        }
    },

    toggleDeckAnswerPanel(qId) {
        const panel = document.getElementById(`deck-ans-panel-${qId}`);
        const btn = document.getElementById(`btn-deck-ans-${qId}`);
        if (!panel || !btn) return;
        const opening = panel.classList.contains("hidden");
        panel.classList.toggle("hidden");
        btn.textContent = opening ? "🙈 Hide Answer" : (isUserAdmin() ? (QB.liveAnswers[qId]?.text ? "✍️ Edit Answer" : "➕ Add Answer") : "👁️ View Answer");
    },

    // Deck Navigation & MCQ Solving
    answerDeckMCQ(btn, qId, picked, correct) {
        const p = picked.toUpperCase(), c = correct.toUpperCase();
        QB.userSolved[qId] = p;
        QB.deckStatus[qId] = p === c ? "correct" : "wrong";

        const { uid, cacheKey, fbSolvedPath } = getSolvedStorageKeys();
        localStorage.setItem(cacheKey, JSON.stringify(QB.userSolved));
        if (uid !== "guest") {
            set(ref(db, `${fbSolvedPath}/${qId}`), { ans: p, correct: p === c, ts: Date.now() }).catch(() => {});
        }
        renderDeckCard();
        const panel = document.getElementById(`deck-ans-panel-${qId}`);
        if (panel && panel.classList.contains("hidden") && (isUserAdmin() || QB.subjectSettings.showAnswers)) {
            this.toggleDeckAnswerPanel(qId);
        }
    },

    resetSingleAnswer(qId) {
        delete QB.userSolved[qId];
        delete QB.deckStatus[qId];
        const { uid, cacheKey, fbSolvedPath } = getSolvedStorageKeys();
        localStorage.setItem(cacheKey, JSON.stringify(QB.userSolved));
        if (uid !== "guest") set(ref(db, `${fbSolvedPath}/${qId}`), null).catch(() => {});
        renderDeckCard();
    },

    async resetAllProgress() {
        const { uid, cacheKey, indexKey, fbSolvedPath, fbIndexPath } = getSolvedStorageKeys();
        if (uid === "guest") return alert("Sign in to reset progress.");
        if (!confirm(`Reset all solved answers & bookmark position for ${QB.subjectName}?`)) return;
        QB.userSolved = {};
        QB.deckStatus = {};
        QB.deckIndex = 0;
        localStorage.removeItem(cacheKey);
        localStorage.removeItem(indexKey);
        await Promise.all([
            set(ref(db, fbSolvedPath), null).catch(() => {}),
            set(ref(db, fbIndexPath), null).catch(() => {})
        ]);
        applyFiltersAndRender();
    },

    deckNext() {
        QB.tp.overrideQid = null; QB.tp.fanOpen = false; QB.tp.activeTopicSlug = null;
        if (QB.deckIndex < QB.activeDeck.length - 1) { QB.deckIndex++; saveCurrentDeckIndex(); renderDeckCard(); }
        else if (MPPStore.accessLevel === "free" && QB.deckIndex === QB.activeDeck.length - 1) { QB.deckIndex++; renderDeckCard(); }
    },

    deckPrev() {
        QB.tp.overrideQid = null; QB.tp.fanOpen = false; QB.tp.activeTopicSlug = null;
        if (QB.deckIndex > 0) { QB.deckIndex--; saveCurrentDeckIndex(); renderDeckCard(); }
    },

    jumpToDeckIndex(i) {
        QB.deckIndex = i;
        QB.tp.overrideQid = null; QB.tp.fanOpen = false; QB.tp.activeTopicSlug = null;
        saveCurrentDeckIndex();
        this.toggleDeckDrawer(null);
        renderDeckCard();
    },

    toggleDeckDrawer(type) {
        const nav = document.getElementById("deck-nav-drawer");
        const filt = document.getElementById("deck-filter-drawer");
        nav?.classList.remove("open");
        filt?.classList.remove("open");
        if (type === "nav") {
            document.getElementById("deck-nav-grid").innerHTML = QB.activeDeck.map((q, i) => {
                let cls = "deck-nav-btn";
                if (QB.deckStatus[q.q] === "correct") cls += " correct";
                if (QB.deckStatus[q.q] === "wrong") cls += " wrong";
                if (i === QB.deckIndex) cls += " active";
                const saved = isItemBookmarked(q.q);
                if (saved) cls += " ring-2 ring-amber-400/70";
                const ribbon = saved ? `<span class="absolute -top-1.5 -right-1.5 text-amber-400 text-xs pointer-events-none">🔖</span>` : "";
                return `<button type="button" onclick="window.QBankEngine.jumpToDeckIndex(${i})" class="${cls}">${escapeHtml(q.q)}${ribbon}</button>`;
            }).join("");
            nav?.classList.add("open");
        } else if (type === "filter") {
            syncFilterButtonsUI();
            filt?.classList.add("open");
        }
    },

    // Resume Modal Actions
    startFresh() {
        document.getElementById("resume-prompt-overlay").style.display = "none";
        QB.deckIndex = 0;
        saveCurrentDeckIndex();
        if (!QB.isDeckMode) toggleDeckMode(); else renderDeckCard();
    },

    resumeSession() {
        document.getElementById("resume-prompt-overlay").style.display = "none";
        QB.deckIndex = QB.tempSavedIndex || 0;
        if (!QB.isDeckMode) toggleDeckMode(); else renderDeckCard();
    },

    // Teen Patti Pill Controls
    toggleFanView(e) {
        if (e) e.stopPropagation();
        QB.tp.fanOpen = !QB.tp.fanOpen;
        renderDeckCard();
    },

    stepCluster(delta, e) {
        if (e) { e.stopPropagation(); e.preventDefault(); }
        const anchor = QB.activeDeck[QB.deckIndex];
        if (!anchor) return;
        const disp = QB.tp.overrideQid ? (findQuestionByQid(QB.tp.overrideQid) || anchor) : anchor;
        const seq = getActiveClusterInfo(anchor.q, disp.q).sequence;
        const idx = Math.max(0, seq.findIndex(id => id.toUpperCase() === String(disp.q).toUpperCase()));
        const next = idx + delta;
        if (next >= 0 && next < seq.length) {
            QB.tp.overrideQid = seq[next];
            QB.tp.fanOpen = false;
            renderDeckCard();
        }
    },

    switchTopic(slug) {
        QB.tp.activeTopicSlug = slug;
        const c = QB.tp.clusters[slug];
        if (c?.qids?.length) {
            const seq = filterSequenceByRole(c.qids, QB.activeDeck[QB.deckIndex]?.q);
            if (seq.length) QB.tp.overrideQid = seq[0];
        }
        renderDeckCard();
    },

    setTPExamFilter(val) {
        QB.tp.examFilter = val;
        renderDeckCard();
    }
};

window.QBankEngine = QBankEngine;
