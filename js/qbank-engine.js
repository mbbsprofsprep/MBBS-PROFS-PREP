// ============================================================================
// js/qbank-engine.js (Phase 2B — Full Chapter List, On-Demand Answers,
// Clean View Answer Card + Lazy Panzoom, Smooth Teen Patti & Android Polish)
// ============================================================================
import {
    MPPStore,
    isUserAdmin,
    onStoreChange,
    getUniqueQuestionId,
    saveOrRemoveBookmark
} from "./core-firebase.js";
import {
    getVaultKeys,
    loadReviewBank,
    getAnswerOnDemand,
    subscribeReviewAnswers,
    subscribeReviewEdits,
    subscribeClinicalData,
    subscribeSubjectSettings,
    subscribeCrossLinks,
    getSharedPGQuestion,
    submitQuestionReport,
    loadUserNotes,
    saveUserNote,
    toggleSubjectAnswers
} from "./data-adapter.js";
import { resolveSubjectMeta, resolveCollegeName } from "./subject-registry.js";
import {
    showModal,
    closeModal,
    showToast,
    openImageLightbox,
    openAuthModal,
    openSidebar,
    openSecureCheckout,
    pushOverlayHistory,
    popOverlayHistory,
    escapeHtml
} from "./ui-shell.js";
import * as ContentRenderer from "./content-renderer.js";

// ============================================================================
// 1. ENGINE STATE & CONSTANTS
// ============================================================================
const CHUNK_SIZE = 30;
const ANDROID_EDGE_GUARD_PX = 30;
const ATTEMPT_STORAGE_PREFIX = "mpp_attempts_v2_";

const QB = {
    mode: "review", // "review" | "clinical"
    collegeCode: "deoghar",
    collegeName: "AIIMS Deoghar",
    subjectSlug: "cfm",
    subjectCode: "CFM",
    subjectName: "Community Medicine (CFM)",
    bridgeSlug: "cfm",
    versionCode: "",

    curriculumData: [],
    qnaData: [],
    liveAnswers: {},        // Populated live for admins; lazily cached per-QID for students
    questionOverrides: {},  // Delta overrides from question_edits/{college}/{rawSub}/overrides
    undoStack: [],
    redoStack: [],
    subjectShowAnswers: false,
    userNotes: {},
    attempts: {},           // { [qId]: { chosen: "A", correct: true/false } }

    // Cross-Links (Teen Patti)
    crossLinks: { clusters: {}, node_topics: {}, nodes: {}, history: [] },
    repeatCountMap: {},     // { [QID_UPPER]: clusterSize }
    pgCardCache: {},        // On-demand fetched PG questions

    // Active Filters
    filters: {
        search: "",
        type: "ALL",
        chapters: new Set(), // Empty = All
        batches: new Set(),  // Empty = All
        attempt: "ALL",
        savedOnly: false,
        highYieldOnly: false
    },

    // Rendered Slices & Deck State
    activeDeck: [],
    renderedRowCount: 0,
    deckOpen: false,
    deckIndex: 0,
    deckFilterOpen: false,
    activeFanState: {},     // { [qId]: { topicSlug, pos } }
    ansCardOpenSet: new Set(),

    // Runtime handles
    _unsubs: [],
    _observer: null,
    _searchTimer: null,
    _deepLinkHandled: false,
    _panzoomLibPromise: null,
    _panzoomInstances: new Map(),
    _sourceTag: ""
};

// ============================================================================
// 2. RICH RENDERING, KATEX & LAZY PANZOOM HELPERS
// ============================================================================
function renderRich(raw) {
    if (!raw) return "";
    const fn = ContentRenderer.renderRichContent || ContentRenderer.renderMarkdown || ContentRenderer.formatRichText;
    if (typeof fn === "function") {
        try { return fn(String(raw)); } catch (_) {}
    }
    return escapeHtml(String(raw)).replace(/\n/g, "<br>");
}

function enhanceRichContainer(container) {
    if (!container) return;

    // Bind gallery / interactive hooks from content-renderer.js if exported
    const bindFn = ContentRenderer.bindRichInteractions || ContentRenderer.initGalleries || ContentRenderer.hydrateContent;
    if (typeof bindFn === "function") {
        try { bindFn(container); } catch (_) {}
    }

    // Bind KaTeX auto-render if loaded
    if (typeof window.renderMathInElement === "function") {
        try {
            window.renderMathInElement(container, {
                delimiters: [
                    { left: "$$", right: "$$", display: true },
                    { left: "$", right: "$", display: false },
                    { left: "\\(", right: "\\)", display: false },
                    { left: "\\[", right: "\\]", display: true }
                ],
                throwOnError: false
            });
        } catch (_) {}
    }

    // Lightbox click on prose images
    container.querySelectorAll(".mpp-prose img, [data-lightbox-src]").forEach(img => {
        if (img.dataset.lbBound) return;
        img.dataset.lbBound = "1";
        img.addEventListener("click", (e) => {
            e.stopPropagation();
            openImageLightbox(img.dataset.lightboxSrc || img.src, img.alt || "");
        });
    });
}

function loadPanzoomLib() {
    if (window.Panzoom) return Promise.resolve(window.Panzoom);
    if (QB._panzoomLibPromise) return QB._panzoomLibPromise;
    QB._panzoomLibPromise = new Promise((resolve, reject) => {
        const s = document.createElement("script");
        s.src = "https://cdn.jsdelivr.net/npm/@panzoom/panzoom@4.5.1/dist/panzoom.min.js";
        s.async = true;
        s.onload = () => resolve(window.Panzoom);
        s.onerror = () => reject(new Error("Could not load zoom library."));
        document.head.appendChild(s);
    });
    return QB._panzoomLibPromise;
}

function destroyPanzoom(key) {
    const inst = QB._panzoomInstances.get(key);
    if (inst) {
        try { inst.destroy(); } catch (_) {}
        QB._panzoomInstances.delete(key);
    }
}

async function mountAnswerCardPanzoom(hostEl, key, imgUrl) {
    if (!hostEl || !imgUrl) return;
    destroyPanzoom(key);

    hostEl.innerHTML = `
        <div class="mt-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-900 overflow-hidden animate-fade-in">
            <div class="flex items-center justify-between gap-2 px-3 py-2 bg-slate-800/90 border-b border-slate-700 text-xs text-slate-200">
                <span class="font-bold">Answer Card (Pinch / Drag to Zoom)</span>
                <div class="flex items-center gap-1">
                    <button type="button" data-pz="in" class="px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 font-bold" title="Zoom In">➕</button>
                    <button type="button" data-pz="out" class="px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 font-bold" title="Zoom Out">➖</button>
                    <button type="button" data-pz="reset" class="px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 font-bold" title="Reset Zoom">↺</button>
                    <button type="button" data-pz="full" class="px-2 py-1 rounded bg-brand-600 hover:bg-brand-500 text-white font-bold" title="Fullscreen">⛶</button>
                </div>
            </div>
            <div class="pz-viewport p-2">
                <img src="${escapeHtml(imgUrl)}" alt="Answer Card" class="max-h-[420px] w-auto object-contain select-none" draggable="false" />
            </div>
        </div>
    `;

    const imgEl = hostEl.querySelector("img");
    const viewport = hostEl.querySelector(".pz-viewport");

    hostEl.querySelector('[data-pz="full"]')?.addEventListener("click", () => openImageLightbox(imgUrl, "Answer Card"));

    try {
        const Panzoom = await loadPanzoomLib();
        if (!Panzoom || !imgEl.isConnected) return;
        const pz = Panzoom(imgEl, { maxScale: 10, minScale: 1, contain: "outside" });
        QB._panzoomInstances.set(key, pz);

        viewport.addEventListener("wheel", (e) => {
            if (e.ctrlKey || e.shiftKey) pz.zoomWithWheel(e);
        }, { passive: false });
        viewport.addEventListener("dblclick", () => pz.reset());
        hostEl.querySelector('[data-pz="in"]')?.addEventListener("click", () => pz.zoomIn());
        hostEl.querySelector('[data-pz="out"]')?.addEventListener("click", () => pz.zoomOut());
        hostEl.querySelector('[data-pz="reset"]')?.addEventListener("click", () => pz.reset());
    } catch (_) {
        imgEl?.addEventListener("click", () => openImageLightbox(imgUrl, "Answer Card"));
    }
}

// ============================================================================
// 3. DATA HELPERS (Overrides, Marks Extraction, Units, Attempts, High-Yield)
// ============================================================================
function getAttemptStorageKey() {
    return `${ATTEMPT_STORAGE_PREFIX}${QB.collegeCode}_${QB.subjectCode}_${QB.mode}_${QB.versionCode || "std"}`;
}

function loadLocalAttempts() {
    try {
        QB.attempts = JSON.parse(localStorage.getItem(getAttemptStorageKey()) || "{}") || {};
    } catch (_) {
        QB.attempts = {};
    }
}

function saveLocalAttempt(qId, chosen, correctKey) {
    QB.attempts[qId] = {
        chosen,
        isCorrect: Boolean(correctKey && chosen === correctKey),
        ts: Date.now()
    };
    try {
        localStorage.setItem(getAttemptStorageKey(), JSON.stringify(QB.attempts));
    } catch (_) {}
}

export function getDisplayedQuestion(rawQ) {
    if (!rawQ) return null;
    const up = String(rawQ.q || "").trim().toUpperCase();
    const ov = QB.questionOverrides[up];
    if (!ov) return rawQ;
    return {
        ...rawQ,
        stem: ov.stem !== undefined && ov.stem !== "" ? String(ov.stem) : rawQ.stem,
        ans_key: ov.ans_key !== undefined ? String(ov.ans_key).trim().toUpperCase() : rawQ.ans_key,
        options: Array.isArray(ov.options) && ov.options.length ? ov.options.map(String) : rawQ.options
    };
}

function extractTheoryMarks(stem, type) {
    const raw = String(stem || "");
    if (String(type || "").toUpperCase() === "MCQ") {
        return { cleanStem: raw, marksBadge: "" };
    }
    const regex = /(\(\s*\d+(?:\s*\+\s*\d+)*(?:\s*=\s*\d+)?\s*(?:Marks?|M)?\s*\)|\[\s*\d+(?:\s*\+\s*\d+)*(?:\s*=\s*\d+)?\s*(?:Marks?|M)?\s*\])\s*$/i;
    const m = raw.match(regex);
    if (!m) return { cleanStem: raw, marksBadge: "" };
    return {
        cleanStem: raw.slice(0, m.index).trim(),
        marksBadge: m[1].replace(/^[\(\[]|[\)\]]$/g, "").trim()
    };
}

function normalizeArr(val, fallback = "General") {
    if (Array.isArray(val)) return val.map(v => String(v || "").trim()).filter(Boolean);
    const s = String(val || "").trim();
    return s ? [s] : [fallback];
}

function getUnitForChapter(chapterName) {
    const target = String(chapterName || "").trim().toLowerCase();
    for (const entry of QB.curriculumData) {
        if (entry && typeof entry === "object" && Array.isArray(entry.chapters)) {
            if (entry.chapters.some(c => String(c).trim().toLowerCase() === target)) {
                return String(entry.unit || "");
            }
        }
    }
    return "";
}

function canShowAnswers() {
    return isUserAdmin() || Boolean(QB.subjectShowAnswers);
}

function canShowAnswerCards() {
    return isUserAdmin() || Boolean(MPPStore.featureFlags.showAnswerCards);
}

function canShowTeenPatti() {
    return isUserAdmin() || Boolean(MPPStore.featureFlags.showTeenPatti);
}

function canShowCrossExamPG() {
    return isUserAdmin() || Boolean(MPPStore.featureFlags.showCrossExamPG);
}

function recomputeRepeatCounts() {
    const counts = {};
    const clusters = QB.crossLinks?.clusters || {};
    Object.values(clusters).forEach(cl => {
        if (!cl) return;
        const profIds = Array.isArray(cl.profs) ? cl.profs : Object.values(cl.profs || {});
        const pgIds = Array.isArray(cl.medpyq) ? cl.medpyq : Object.values(cl.medpyq || {});
        const total = profIds.length + (canShowCrossExamPG() ? pgIds.length : 0);
        profIds.forEach(id => {
            const up = String(id).trim().toUpperCase();
            counts[up] = Math.max(counts[up] || 0, total);
        });
    });
    QB.repeatCountMap = counts;
}

function getClusterTopicsForQid(qId) {
    const up = String(qId || "").trim().toUpperCase();
    const nt = QB.crossLinks?.node_topics || {};
    const clusters = QB.crossLinks?.clusters || {};

    let slugs = [];
    if (nt[up]) {
        slugs = Array.isArray(nt[up]) ? nt[up] : Object.keys(nt[up]);
    } else {
        Object.keys(clusters).forEach(slug => {
            const profs = Array.isArray(clusters[slug]?.profs) ? clusters[slug].profs : Object.values(clusters[slug]?.profs || {});
            if (profs.some(x => String(x).trim().toUpperCase() === up)) slugs.push(slug);
        });
    }

    return [...new Set(slugs)]
        .map(slug => ({ slug, data: clusters[slug] }))
        .filter(x => x.data);
}

function buildAiHelpUrl(q) {
    const parts = [
        `MBBS Prof Exam Question (${QB.subjectName}, ${QB.collegeName}):`,
        q.stem || ""
    ];
    if (Array.isArray(q.options) && q.options.length) {
        parts.push("Options:\n" + q.options.map((o, i) => `${String.fromCharCode(65 + i)}) ${o}`).join("\n"));
    }
    parts.push("Give a concise, high-yield exam answer with key points, mnemonics, and standard textbook references.");
    return `https://chatgpt.com/?q=${encodeURIComponent(parts.join("\n\n"))}`;
}

// ============================================================================
// 4. FULL CHAPTER LIST (INCLUDING 0-QUESTION CHAPTERS) + UNIT GROUPING
// ============================================================================
function buildCompleteChapterStructure() {
    // Count questions per chapter across the loaded bank
    const counts = new Map();
    const extraChapters = [];
    const seenLower = new Set();

    QB.qnaData.forEach(q => {
        normalizeArr(q.chapter, "General").forEach(ch => {
            const key = ch.toLowerCase();
            counts.set(key, (counts.get(key) || 0) + 1);
        });
    });

    const groups = [];
    const hasUnitObjects = QB.curriculumData.some(g => g && typeof g === "object" && Array.isArray(g.chapters));

    if (hasUnitObjects) {
        QB.curriculumData.forEach(g => {
            if (g && typeof g === "object" && Array.isArray(g.chapters)) {
                const chList = [];
                g.chapters.forEach(c => {
                    const name = String(c || "").trim();
                    if (!name) return;
                    const low = name.toLowerCase();
                    if (!seenLower.has(low)) {
                        seenLower.add(low);
                        chList.push({ name, count: counts.get(low) || 0 });
                    }
                });
                if (chList.length) {
                    groups.push({ unit: String(g.unit || "General"), chapters: chList });
                }
            } else if (typeof g === "string" && g.trim()) {
                const name = g.trim();
                const low = name.toLowerCase();
                if (!seenLower.has(low)) {
                    seenLower.add(low);
                    extraChapters.push({ name, count: counts.get(low) || 0 });
                }
            }
        });
    } else {
        // Flat curriculumData strings — STILL include all chapters even with 0 questions
        const flatList = [];
        QB.curriculumData.forEach(c => {
            const name = String(c || "").trim();
            if (!name) return;
            const low = name.toLowerCase();
            if (!seenLower.has(low)) {
                seenLower.add(low);
                flatList.push({ name, count: counts.get(low) || 0 });
            }
        });
        if (flatList.length) groups.push({ unit: "", chapters: flatList });
    }

    // Also include any chapter present in qnaData that wasn't listed in curriculumData
    QB.qnaData.forEach(q => {
        normalizeArr(q.chapter, "General").forEach(ch => {
            const low = ch.toLowerCase();
            if (!seenLower.has(low)) {
                seenLower.add(low);
                extraChapters.push({ name: ch, count: counts.get(low) || 0 });
            }
        });
    });

    if (extraChapters.length) {
        extraChapters.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" }));
        if (groups.length && !groups[0].unit) {
            groups[0].chapters.push(...extraChapters);
        } else {
            groups.push({ unit: groups.length ? "Additional Chapters" : "", chapters: extraChapters });
        }
    }

    return groups;
}

function buildChapterMenuHTML(prefix = "tbl") {
    const groups = buildCompleteChapterStructure();
    const selected = QB.filters.chapters;

    const topBar = `
        <div class="sticky top-0 z-20 bg-white dark:bg-dark-900 border-b border-slate-200 dark:border-slate-700 px-3 py-2 flex items-center justify-between gap-2">
            <span class="text-[11px] font-bold text-slate-500">${selected.size ? `${selected.size} selected` : "All Chapters"}</span>
            <button type="button" data-clear-chapters="${prefix}" class="text-[11px] font-bold text-brand-600 dark:text-brand-400 hover:underline">Clear</button>
        </div>
    `;

    const body = groups.map((grp, gIdx) => {
        const chNames = grp.chapters.map(c => c.name);
        const allChecked = chNames.length > 0 && chNames.every(n => selected.has(n));
        const unitHeader = grp.unit ? `
            <label class="multiselect-group-header cursor-pointer">
                <span class="truncate">${escapeHtml(grp.unit)}</span>
                <span class="inline-flex items-center gap-1 text-[10px] font-bold normal-case flex-shrink-0">
                    <input type="checkbox" data-unit-toggle="${escapeHtml(grp.unit)}" data-unit-idx="${gIdx}" ${allChecked ? "checked" : ""} class="rounded text-brand-600 focus:ring-brand-500" />
                    <span>All</span>
                </span>
            </label>
        ` : "";

        const items = grp.chapters.map(ch => {
            const isChecked = selected.has(ch.name);
            const zeroCls = ch.count === 0 ? "text-slate-400 dark:text-slate-500" : "text-slate-700 dark:text-slate-200";
            return `
                <label class="flex items-center justify-between gap-2 px-3 py-2 hover:bg-slate-50 dark:hover:bg-dark-800 cursor-pointer text-xs ${zeroCls}">
                    <span class="flex items-center gap-2 min-w-0">
                        <input type="checkbox" data-chapter-opt="${escapeHtml(ch.name)}" ${isChecked ? "checked" : ""} class="rounded text-brand-600 focus:ring-brand-500 flex-shrink-0" />
                        <span class="truncate">${escapeHtml(ch.name)}</span>
                    </span>
                    <span class="text-[10px] font-bold px-1.5 py-0.5 rounded ${ch.count === 0 ? "bg-slate-100 dark:bg-dark-800 text-slate-400" : "bg-brand-50 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300"} flex-shrink-0">${ch.count}</span>
                </label>
            `;
        }).join("");

        return unitHeader + items;
    }).join("");

    return topBar + (body || `<div class="p-4 text-xs text-slate-400 text-center">No chapters loaded.</div>`);
}

function buildBatchMenuHTML() {
    const counts = new Map();
    QB.qnaData.forEach(q => {
        normalizeArr(q.examBatch, "Prof Exam").forEach(b => {
            counts.set(b, (counts.get(b) || 0) + 1);
        });
    });
    const batches = [...counts.keys()].sort((a, b) => b.localeCompare(a, undefined, { numeric: true, sensitivity: "base" }));
    const selected = QB.filters.batches;

    return `
        <div class="sticky top-0 z-20 bg-white dark:bg-dark-900 border-b border-slate-200 dark:border-slate-700 px-3 py-2 flex items-center justify-between gap-2">
            <span class="text-[11px] font-bold text-slate-500">${selected.size ? `${selected.size} selected` : "All Batches"}</span>
            <button type="button" data-clear-batches="1" class="text-[11px] font-bold text-brand-600 dark:text-brand-400 hover:underline">Clear</button>
        </div>
        ${batches.map(b => `
            <label class="flex items-center justify-between gap-2 px-3 py-2 hover:bg-slate-50 dark:hover:bg-dark-800 cursor-pointer text-xs text-slate-700 dark:text-slate-200">
                <span class="flex items-center gap-2 min-w-0">
                    <input type="checkbox" data-batch-opt="${escapeHtml(b)}" ${selected.has(b) ? "checked" : ""} class="rounded text-brand-600 focus:ring-brand-500 flex-shrink-0" />
                    <span class="truncate">${escapeHtml(b)}</span>
                </span>
                <span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-dark-800 text-slate-500">${counts.get(b)}</span>
            </label>
        `).join("") || `<div class="p-4 text-xs text-slate-400 text-center">No exam batches found.</div>`}
    `;
}

function bindChapterMenuEvents(container) {
    if (!container) return;
    const groups = buildCompleteChapterStructure();

    container.querySelector("[data-clear-chapters]")?.addEventListener("click", (e) => {
        e.stopPropagation();
        QB.filters.chapters.clear();
        refreshFilterUIAndRender();
    });

    container.querySelectorAll("[data-unit-toggle]").forEach(cb => {
        cb.addEventListener("change", () => {
            const idx = Number(cb.dataset.unitIdx);
            const grp = groups[idx];
            if (!grp) return;
            grp.chapters.forEach(c => {
                if (cb.checked) QB.filters.chapters.add(c.name);
                else QB.filters.chapters.delete(c.name);
            });
            refreshFilterUIAndRender();
        });
    });

    container.querySelectorAll("[data-chapter-opt]").forEach(cb => {
        cb.addEventListener("change", () => {
            const name = cb.dataset.chapterOpt;
            if (cb.checked) QB.filters.chapters.add(name);
            else QB.filters.chapters.delete(name);
            refreshFilterUIAndRender();
        });
    });
}

function bindBatchMenuEvents(container) {
    if (!container) return;
    container.querySelector("[data-clear-batches]")?.addEventListener("click", (e) => {
        e.stopPropagation();
        QB.filters.batches.clear();
        refreshFilterUIAndRender();
    });
    container.querySelectorAll("[data-batch-opt]").forEach(cb => {
        cb.addEventListener("change", () => {
            const name = cb.dataset.batchOpt;
            if (cb.checked) QB.filters.batches.add(name);
            else QB.filters.batches.delete(name);
            refreshFilterUIAndRender();
        });
    });
}

function updateFilterButtonLabels() {
    const chBtn = document.getElementById("chapterBtnLabel");
    if (chBtn) {
        const sz = QB.filters.chapters.size;
        chBtn.textContent = sz === 0
            ? (QB.mode === "clinical" ? "All Topics" : "All Chapters")
            : (sz === 1 ? [...QB.filters.chapters][0] : `${sz} Chapters Selected`);
    }

    const bBtn = document.getElementById("batchBtnLabel");
    if (bBtn) {
        const sz = QB.filters.batches.size;
        bBtn.textContent = sz === 0
            ? "All Exam Batches"
            : (sz === 1 ? [...QB.filters.batches][0] : `${sz} Batches Selected`);
    }

    // Active state styles for Saved & High-Yield buttons (Table + Deck)
    const setToggleStyle = (id, active, activeCls) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.classList.toggle("ring-2", active);
        activeCls.split(" ").forEach(c => el.classList.toggle(c, active));
    };
    setToggleStyle("savedOnlyBtn", QB.filters.savedOnly, "bg-brand-50 dark:bg-brand-900/40 border-brand-500 text-brand-700 dark:text-brand-300 ring-brand-500/30");
    setToggleStyle("deck-saved-btn", QB.filters.savedOnly, "bg-brand-600 text-white border-brand-600 ring-brand-500/30");
    setToggleStyle("highYieldOnlyBtn", QB.filters.highYieldOnly, "bg-orange-50 dark:bg-orange-950/50 border-orange-500 text-orange-700 dark:text-orange-300 ring-orange-500/30");
    setToggleStyle("deck-hy-btn", QB.filters.highYieldOnly, "bg-orange-500 text-white border-orange-500 ring-orange-500/30");

    // Deck filter active dot
    const hasFilters = Boolean(
        QB.filters.search || QB.filters.type !== "ALL" || QB.filters.chapters.size ||
        QB.filters.batches.size || QB.filters.attempt !== "ALL" ||
        QB.filters.savedOnly || QB.filters.highYieldOnly
    );
    document.getElementById("deck-filter-dot")?.classList.toggle("hidden", !hasFilters);
}

function buildFilterDropdowns() {
    const chMenu = document.getElementById("chapterMultiselectMenu");
    if (chMenu) {
        chMenu.innerHTML = buildChapterMenuHTML("tbl");
        bindChapterMenuEvents(chMenu);
    }
    const bMenu = document.getElementById("batchMultiselectMenu");
    if (bMenu) {
        bMenu.innerHTML = buildBatchMenuHTML();
        bindBatchMenuEvents(bMenu);
    }
    if (QB.deckFilterOpen) renderDeckFilterDrawer();
    updateFilterButtonLabels();
}

function refreshFilterUIAndRender() {
    buildFilterDropdowns();
    applyFiltersAndRender();
}

// ============================================================================
// 5. FILTERING PIPELINE
// ============================================================================
function applyFiltersAndRender() {
    const f = QB.filters;
    const term = f.search.trim().toLowerCase();

    QB.activeDeck = QB.qnaData.filter(rawItem => {
        const q = getDisplayedQuestion(rawItem);

        // Type filter
        if (f.type !== "ALL") {
            const isMcq = String(q.type || "").toUpperCase() === "MCQ";
            if (f.type === "MCQ" && !isMcq) return false;
            if (f.type === "Theory" && isMcq) return false;
        }

        // Chapter filter
        if (f.chapters.size > 0) {
            const chs = normalizeArr(q.chapter, "General");
            if (!chs.some(c => f.chapters.has(c))) return false;
        }

        // Batch filter
        if (f.batches.size > 0) {
            const bs = normalizeArr(q.examBatch, "Prof Exam");
            if (!bs.some(b => f.batches.has(b))) return false;
        }

        // Attempt status filter
        if (f.attempt !== "ALL") {
            const att = QB.attempts[q.q];
            if (f.attempt === "UNATTEMPTED" && att) return false;
            if (f.attempt === "CORRECT" && (!att || !att.isCorrect)) return false;
            if (f.attempt === "WRONG" && (!att || att.isCorrect)) return false;
        }

        // Saved filter
        if (f.savedOnly) {
            const uid = getUniqueQuestionId(q.q);
            if (!MPPStore.bookmarks?.[uid]) return false;
        }

        // High-Yield repeated questions filter (cluster size >= 2)
        if (f.highYieldOnly) {
            const cnt = QB.repeatCountMap[String(q.q || "").trim().toUpperCase()] || 0;
            if (cnt < 2) return false;
        }

        // Search keyword filter
        if (term) {
            const hay = [
                q.q,
                q.stem,
                ...(Array.isArray(q.options) ? q.options : []),
                ...normalizeArr(q.chapter, ""),
                ...normalizeArr(q.examBatch, "")
            ].join(" ").toLowerCase();
            if (!hay.includes(term)) return false;
        }

        return true;
    });

    const badge = document.getElementById("q-count-badge");
    if (badge) {
        const noun = QB.mode === "clinical" ? "Case" : "Question";
        const n = QB.activeDeck.length;
        badge.textContent = `${n} ${noun}${n === 1 ? "" : "s"}`;
    }

    renderTableFresh();

    if (QB.deckOpen) {
        if (QB.deckIndex >= QB.activeDeck.length) QB.deckIndex = Math.max(0, QB.activeDeck.length - 1);
        renderDeckCard();
    }
}

// ============================================================================
// 6. CHUNKED TABLE RENDERER (30 Rows/Chunk + Exact Original 6 Columns)
// ============================================================================
function renderTableRowHTML(rawQ, deckIdx) {
    const q = getDisplayedQuestion(rawQ);
    const isMcq = String(q.type || "").toUpperCase() === "MCQ";
    const { cleanStem, marksBadge } = extractTheoryMarks(q.stem, q.type);
    const chapters = normalizeArr(q.chapter, "General");
    const batches = normalizeArr(q.examBatch, "Prof Exam");
    const uniqueId = getUniqueQuestionId(q.q);
    const isSaved = Boolean(MPPStore.bookmarks?.[uniqueId]);
    const repeatCount = QB.repeatCountMap[String(q.q || "").trim().toUpperCase()] || 0;
    const att = QB.attempts[q.q];
    const showAnsBtn = canShowAnswers();
    const showCardBtn = Boolean(q.ans_image && canShowAnswerCards());
    const cardOpen = QB.ansCardOpenSet.has(`tbl_${q.q}`);

    // MCQ interactive options inside Table Col 2
    const mcqHtml = isMcq && Array.isArray(q.options) && q.options.length ? `
        <div class="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            ${q.options.map((opt, idx) => {
                const letter = String.fromCharCode(65 + idx);
                const cleanOpt = String(opt).replace(/^[A-E][\.\)\:]\s*/i, "");
                let cls = "border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-dark-800/60 hover:border-brand-400 text-slate-700 dark:text-slate-200";
                if (att) {
                    if (letter === q.ans_key) cls = "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-200 font-bold";
                    else if (letter === att.chosen) cls = "border-red-500 bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300 font-bold";
                }
                return `
                    <button type="button" data-tbl-mcq="${escapeHtml(q.q)}" data-letter="${letter}"
                        class="text-left px-2.5 py-1.5 rounded-lg border text-xs transition ${cls}">
                        <span class="font-extrabold mr-1">${letter})</span>${escapeHtml(cleanOpt)}
                    </button>
                `;
            }).join("")}
        </div>
    ` : "";

    // Col 4: Unit header above each chapter (Old UI Parity)
    const chapterColHtml = chapters.map(ch => {
        const unit = getUnitForChapter(ch);
        return `
            <div class="mb-1.5 last:mb-0">
                ${unit ? `<div class="text-[10px] font-extrabold uppercase tracking-wider text-brand-600 dark:text-brand-400 leading-tight">${escapeHtml(unit)}</div>` : ""}
                <div class="text-xs font-medium text-slate-700 dark:text-slate-200 leading-snug">${escapeHtml(ch)}</div>
            </div>
        `;
    }).join("");

    const batchColHtml = batches.map(b => `
        <span class="inline-block px-2 py-0.5 mr-1 mb-1 rounded-md bg-slate-100 dark:bg-dark-800 text-slate-600 dark:text-slate-300 text-[11px] font-semibold">${escapeHtml(b)}</span>
    `).join("");

    return `
        <tr data-qid-row="${escapeHtml(q.q)}" class="hover:bg-slate-50/70 dark:hover:bg-dark-800/40 transition-colors align-top">
            <!-- Col 1: Q No. -->
            <td class="py-3.5 px-3 whitespace-nowrap">
                <button type="button" data-open-deck-idx="${deckIdx}" title="Open in Deck Mode"
                    class="inline-flex items-center px-2 py-1 rounded-lg bg-slate-100 dark:bg-dark-800 hover:bg-brand-100 dark:hover:bg-brand-900/40 text-xs font-extrabold text-slate-800 dark:text-slate-100 transition">
                    ${escapeHtml(q.q)}
                </button>
                ${repeatCount >= 2 ? `<div class="mt-1.5"><span class="inline-flex items-center px-1.5 py-0.5 rounded bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 text-[10px] font-extrabold">🔥 ${repeatCount}&times;</span></div>` : ""}
            </td>

            <!-- Col 2: Question Content -->
            <td class="py-3.5 px-4">
                <div class="mpp-prose text-sm text-slate-800 dark:text-slate-100 leading-relaxed">${renderRich(cleanStem)}</div>
                ${marksBadge ? `<div class="mt-1.5"><span class="inline-flex items-center px-2 py-0.5 rounded-full bg-brand-100 dark:bg-brand-900/50 text-brand-700 dark:text-brand-300 text-[11px] font-extrabold">${escapeHtml(marksBadge)}</span></div>` : ""}
                ${q.image ? `<img src="${escapeHtml(q.image)}" alt="Question Figure" data-lightbox-src="${escapeHtml(q.image)}" loading="lazy" class="mt-2.5 max-h-48 rounded-xl border border-slate-200 dark:border-slate-700 cursor-zoom-in" />` : ""}
                ${mcqHtml}
                ${showCardBtn ? `
                    <div class="mt-2.5">
                        <button type="button" data-toggle-anscard="tbl_${escapeHtml(q.q)}" data-img="${escapeHtml(q.ans_image)}"
                            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 transition">
                            ${cardOpen ? "🙈 Hide Answer Card" : "👁️ View Answer Card"}
                        </button>
                        <div data-anscard-host="tbl_${escapeHtml(q.q)}"></div>
                    </div>
                ` : ""}
            </td>

            <!-- Col 3: Type -->
            <td class="py-3.5 px-3 whitespace-nowrap">
                <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-extrabold ${isMcq ? "bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300" : "bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300"}">
                    ${isMcq ? "MCQ" : "Theory"}
                </span>
            </td>

            <!-- Col 4: Unit & Chapter -->
            <td class="py-3.5 px-3">${chapterColHtml}</td>

            <!-- Col 5: Exam Batch -->
            <td class="py-3.5 px-3">${batchColHtml}</td>

            <!-- Col 6: Stacked Action Buttons (Exact Original Layout) -->
            <td class="py-3.5 px-3 text-right">
                <div class="flex flex-col items-end gap-1.5">
                    ${showAnsBtn ? `
                        <button type="button" data-view-ans="${escapeHtml(q.q)}"
                            class="w-full max-w-[116px] px-2.5 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-[11px] font-bold shadow-xs transition">
                            View Answer
                        </button>
                    ` : ""}
                    <a href="${escapeHtml(buildAiHelpUrl(q))}" target="_blank" rel="noopener noreferrer"
                        class="w-full max-w-[116px] text-center px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-dark-800 hover:border-brand-400 text-slate-700 dark:text-slate-200 text-[11px] font-bold transition">
                        AI Help &nearr;
                    </a>
                    <button type="button" data-save-bmk="${escapeHtml(q.q)}"
                        class="w-full max-w-[116px] px-2.5 py-1.5 rounded-lg border text-[11px] font-bold transition ${isSaved ? "border-amber-400 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300" : "border-slate-200 dark:border-slate-700 bg-white dark:bg-dark-800 text-slate-600 dark:text-slate-300 hover:border-amber-400"}">
                        ${isSaved ? "🔖 Saved" : "🔖 Save"}
                    </button>
                    <button type="button" data-report-q="${escapeHtml(q.q)}"
                        class="w-full max-w-[116px] px-2.5 py-1 rounded-lg text-[11px] font-semibold text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition">
                        🚩 Report
                    </button>
                </div>
            </td>
        </tr>
    `;
}

function renderTableFresh() {
    const tbody = document.getElementById("qTableBody");
    const sentinel = document.getElementById("table-sentinel");
    if (!tbody) return;

    // Clean up any table panzoom instances
    for (const k of QB._panzoomInstances.keys()) {
        if (k.startsWith("tbl_")) destroyPanzoom(k);
    }

    QB.renderedRowCount = 0;

    if (!MPPStore.user) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="py-16 px-4 text-center">
                    <div class="text-3xl mb-2">🔒</div>
                    <h3 class="font-display font-extrabold text-lg text-slate-900 dark:text-white mb-1">Sign In to View Questions</h3>
                    <p class="text-xs text-slate-500 dark:text-slate-400 mb-4">Sign in with your student account to access the AIIMS university question bank.</p>
                    <button id="tbl-signin-cta" type="button" class="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold shadow-sm">Sign In / Create Account</button>
                </td>
            </tr>`;
        tbody.querySelector("#tbl-signin-cta")?.addEventListener("click", () => openAuthModal("login"));
        sentinel?.classList.add("hidden");
        return;
    }

    if (!QB.activeDeck.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="py-14 px-4 text-center text-slate-400">
                    <div class="text-2xl mb-1">🔍</div>
                    <div class="text-sm font-semibold">No questions match your current filters.</div>
                    <button id="tbl-empty-reset" type="button" class="mt-3 px-4 py-1.5 rounded-lg bg-slate-100 dark:bg-dark-800 text-xs font-bold text-brand-600 dark:text-brand-400">Reset All Filters</button>
                </td>
            </tr>`;
        tbody.querySelector("#tbl-empty-reset")?.addEventListener("click", resetAllFilters);
        sentinel?.classList.add("hidden");
        return;
    }

    tbody.innerHTML = "";
    appendNextTableChunk();
    setupTableIntersectionObserver();
}

function appendNextTableChunk() {
    const tbody = document.getElementById("qTableBody");
    const sentinel = document.getElementById("table-sentinel");
    if (!tbody) return;

    const start = QB.renderedRowCount;
    if (start >= QB.activeDeck.length) {
        if (sentinel) sentinel.classList.add("hidden");
        return;
    }

    const end = Math.min(start + CHUNK_SIZE, QB.activeDeck.length);
    const fragHtml = [];
    for (let i = start; i < end; i++) {
        fragHtml.push(renderTableRowHTML(QB.activeDeck[i], i));
    }

    const temp = document.createElement("tbody");
    temp.innerHTML = fragHtml.join("");
    const addedRows = [...temp.children];
    addedRows.forEach(tr => {
        tbody.appendChild(tr);
        enhanceRichContainer(tr);
        // Re-mount open answer card if already toggled open
        tr.querySelectorAll("[data-anscard-host]").forEach(host => {
            const key = host.dataset.anscardHost;
            if (QB.ansCardOpenSet.has(key)) {
                const btn = tr.querySelector(`[data-toggle-anscard="${CSS.escape(key)}"]`);
                if (btn?.dataset.img) mountAnswerCardPanzoom(host, key, btn.dataset.img);
            }
        });
    });

    QB.renderedRowCount = end;

    if (sentinel) {
        if (end < QB.activeDeck.length) {
            sentinel.textContent = `Showing ${end} of ${QB.activeDeck.length} — scroll for more...`;
            sentinel.classList.remove("hidden");
        } else {
            sentinel.classList.add("hidden");
        }
    }
}

function setupTableIntersectionObserver() {
    if (QB._observer) QB._observer.disconnect();
    const sentinel = document.getElementById("table-sentinel");
    if (!sentinel || !("IntersectionObserver" in window)) return;

    QB._observer = new IntersectionObserver((entries) => {
        if (entries.some(e => e.isIntersecting)) {
            appendNextTableChunk();
        }
    }, { rootMargin: "250px" });
    QB._observer.observe(sentinel);
}

// Single Delegated Click Handler for Table Rows
function bindTableDelegation() {
    const tbody = document.getElementById("qTableBody");
    if (!tbody) return;

    tbody.addEventListener("click", async (e) => {
        const mcqBtn = e.target.closest("[data-tbl-mcq]");
        if (mcqBtn) {
            const qId = mcqBtn.dataset.tblMcq;
            const letter = mcqBtn.dataset.letter;
            const q = getDisplayedQuestion(QB.qnaData.find(x => x.q === qId));
            if (!q) return;
            saveLocalAttempt(qId, letter, q.ans_key);
            // Update just this row in-place
            const tr = mcqBtn.closest("tr");
            const deckIdx = QB.activeDeck.findIndex(x => x.q === qId);
            if (tr && deckIdx !== -1) {
                const temp = document.createElement("tbody");
                temp.innerHTML = renderTableRowHTML(QB.activeDeck[deckIdx], deckIdx);
                const newTr = temp.firstElementChild;
                tr.replaceWith(newTr);
                enhanceRichContainer(newTr);
            }
            return;
        }

        const deckBtn = e.target.closest("[data-open-deck-idx]");
        if (deckBtn) {
            openDeckAt(Number(deckBtn.dataset.openDeckIdx || 0));
            return;
        }

        const viewAnsBtn = e.target.closest("[data-view-ans]");
        if (viewAnsBtn) {
            openAnswerModal(viewAnsBtn.dataset.viewAns);
            return;
        }

        const cardBtn = e.target.closest("[data-toggle-anscard]");
        if (cardBtn) {
            const key = cardBtn.dataset.toggleAnscard;
            const img = cardBtn.dataset.img;
            const host = tbody.querySelector(`[data-anscard-host="${CSS.escape(key)}"]`);
            if (QB.ansCardOpenSet.has(key)) {
                QB.ansCardOpenSet.delete(key);
                destroyPanzoom(key);
                if (host) host.innerHTML = "";
                cardBtn.textContent = "👁️ View Answer Card";
            } else {
                QB.ansCardOpenSet.add(key);
                cardBtn.textContent = "🙈 Hide Answer Card";
                if (host) mountAnswerCardPanzoom(host, key, img);
            }
            return;
        }

        const saveBtn = e.target.closest("[data-save-bmk]");
        if (saveBtn) {
            await handleBookmarkToggle(saveBtn.dataset.saveBmk);
            return;
        }

        const repBtn = e.target.closest("[data-report-q]");
        if (repBtn) {
            openReportModal(repBtn.dataset.reportQ);
        }
    });
}

// ============================================================================
// 7. MODEL ANSWER MODAL (On-Demand Single-Answer Fetch + Admin Edit Hook)
// ============================================================================
export async function openAnswerModal(qId) {
    const rawQ = QB.qnaData.find(x => String(x.q) === String(qId));
    const q = getDisplayedQuestion(rawQ);
    if (!q) return;

    const modal = showModal({
        id: "mpp-answer-modal",
        size: "lg",
        title: `Model Answer — ${q.q}`,
        bodyHtml: `
            <div class="py-10 text-center text-slate-400">
                <div class="inline-block w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                <div class="text-xs font-semibold">Loading model answer...</div>
            </div>
        `,
        footerHtml: isUserAdmin()
            ? `<button id="ans-modal-edit-btn" type="button" class="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-extrabold">✏️ Edit Answer</button>`
            : ""
    });

    let ansText = QB.liveAnswers?.[q.q]?.text || "";
    if (!ansText && !isUserAdmin()) {
        try {
            ansText = await getAnswerOnDemand(q.q);
            if (ansText) QB.liveAnswers[q.q] = { text: ansText };
        } catch (_) {}
    }

    const correctKey = String(q.ans_key || "").trim().toUpperCase();
    const isMcq = String(q.type || "").toUpperCase() === "MCQ";
    const correctIdx = correctKey ? correctKey.charCodeAt(0) - 65 : -1;
    const correctLine = (isMcq && Array.isArray(q.options) && correctIdx >= 0 && q.options[correctIdx])
        ? `${correctKey}) ${String(q.options[correctIdx]).replace(/^[A-E][\.\)\:]\s*/i, "")}`
        : (correctKey ? `Key: ${correctKey}` : "");

    const bodyEl = modal.querySelector(".overflow-y-auto");
    if (!bodyEl) return;

    bodyEl.innerHTML = `
        <div class="space-y-4">
            <div class="p-3.5 rounded-xl bg-slate-50 dark:bg-dark-800/70 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-100 leading-relaxed">
                ${renderRich(q.stem)}
            </div>
            ${correctLine ? `
                <div class="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 text-xs sm:text-sm font-extrabold">
                    ✓ Correct Answer: ${escapeHtml(correctLine)}
                </div>
            ` : ""}
            <div class="mpp-prose text-sm leading-relaxed text-slate-800 dark:text-slate-100">
                ${ansText
                    ? renderRich(ansText)
                    : `<div class="py-6 text-center text-slate-400 italic text-xs">No written model answer uploaded for ${escapeHtml(q.q)} yet.</div>`}
            </div>
        </div>
    `;
    enhanceRichContainer(bodyEl);

    modal.querySelector("#ans-modal-edit-btn")?.addEventListener("click", () => {
        closeModal("mpp-answer-modal");
        if (window.MPPAdmin?.openAnswerEditor) {
            window.MPPAdmin.openAnswerEditor(q.q, ansText);
        } else {
            showToast("Admin editor still loading...", "info");
        }
    });
}

// ============================================================================
// 8. BOOKMARK TOGGLE, REPORT MODAL & PERSONAL MNEMONIC NOTES
// ============================================================================
async function handleBookmarkToggle(qId) {
    if (!MPPStore.user) {
        openAuthModal("login");
        return;
    }
    const rawQ = QB.qnaData.find(x => String(x.q) === String(qId));
    const q = getDisplayedQuestion(rawQ);
    if (!q) return;

    const uniqueId = getUniqueQuestionId(q.q);
    const isCurrentlySaved = Boolean(MPPStore.bookmarks?.[uniqueId]);

    try {
        const saved = await saveOrRemoveBookmark(uniqueId, {
            q: q.q,
            stem: q.stem,
            type: q.type,
            options: Array.isArray(q.options) ? q.options : null,
            ans_key: q.ans_key || "",
            image: q.image || "",
            ans_image: q.ans_image || "",
            chapter: normalizeArr(q.chapter, "General").join(", "),
            subject: QB.subjectName,
            mode: QB.mode,
            answer: QB.liveAnswers?.[q.q]?.text || ""
        }, isCurrentlySaved);

        showToast(saved ? `Saved ${q.q} to Bookmarks` : `Removed ${q.q} from Bookmarks`, "success", 2000);
        if (QB.filters.savedOnly) {
            applyFiltersAndRender();
        } else {
            // Update just the affected table row + deck if open
            const tr = document.querySelector(`tr[data-qid-row="${CSS.escape(q.q)}"]`);
            const deckIdx = QB.activeDeck.findIndex(x => x.q === q.q);
            if (tr && deckIdx !== -1) {
                const temp = document.createElement("tbody");
                temp.innerHTML = renderTableRowHTML(QB.activeDeck[deckIdx], deckIdx);
                const newTr = temp.firstElementChild;
                tr.replaceWith(newTr);
                enhanceRichContainer(newTr);
            }
            if (QB.deckOpen) renderDeckCard();
        }
    } catch (err) {
        showToast(err.message || "Could not update bookmark.", "error");
    }
}

export function openReportModal(qId) {
    if (!MPPStore.user) {
        openAuthModal("login");
        return;
    }
    const modal = showModal({
        id: "mpp-report-modal",
        size: "sm",
        title: `🚩 Report Issue — ${qId}`,
        bodyHtml: `
            <form id="mpp-report-form" class="space-y-3.5">
                <div>
                    <label class="block text-xs font-bold mb-1">Issue Type</label>
                    <select name="reportType" class="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-dark-800 text-sm">
                        <option value="Wrong Answer Key">Wrong Answer Key / Explanation</option>
                        <option value="Typo / Formatting">Typo or Formatting Error</option>
                        <option value="Wrong Chapter / Batch">Wrong Chapter or Exam Batch</option>
                        <option value="Missing / Broken Image">Missing or Broken Image</option>
                        <option value="Duplicate Question">Duplicate Question</option>
                        <option value="Other">Other</option>
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-bold mb-1">Details (optional)</label>
                    <textarea name="description" rows="3" maxlength="600" placeholder="Briefly describe what needs fixing..."
                        class="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-dark-800 text-sm"></textarea>
                </div>
                <button type="submit" class="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-extrabold shadow-sm">Submit Report</button>
            </form>
        `
    });

    modal.querySelector("#mpp-report-form")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const btn = e.target.querySelector("button[type='submit']");
        btn.disabled = true; btn.textContent = "Submitting...";
        try {
            await submitQuestionReport({
                qId,
                reportType: fd.get("reportType"),
                description: fd.get("description")
            });
            closeModal("mpp-report-modal");
            showToast("Thank you! Report sent to Admin queue.", "success");
        } catch (err) {
            showToast(err.message || "Failed to send report.", "error");
            btn.disabled = false; btn.textContent = "Submit Report";
        }
    });
}

// ============================================================================
// 9. DECK MODE (Smooth Teen Patti Wings + Edge-Safe Android Swipe + Notes)
// ============================================================================
export function openDeckAt(index = 0) {
    if (!MPPStore.user) {
        openAuthModal("login");
        return;
    }
    if (!QB.activeDeck.length) {
        showToast("No questions in current filter to review.", "info");
        return;
    }

    QB.deckIndex = Math.max(0, Math.min(index, QB.activeDeck.length - 1));
    QB.deckOpen = true;

    const layer = document.getElementById("deck-layer");
    layer?.classList.add("open");
    document.body.style.overflow = "hidden";

    renderDeckCard();
    pushOverlayHistory("deck", (fromPop) => closeDeck(fromPop));
}

export function closeDeck(fromPopState = false) {
    if (!QB.deckOpen) return;
    QB.deckOpen = false;
    QB.deckFilterOpen = false;

    document.getElementById("deck-layer")?.classList.remove("open");
    document.getElementById("deck-filter-drawer")?.classList.add("hidden");
    const eye = document.getElementById("floating-eye-btn");
    if (eye) eye.style.display = "none";
    document.body.style.overflow = "";

    for (const k of QB._panzoomInstances.keys()) {
        if (k.startsWith("deck_")) destroyPanzoom(k);
    }
    popOverlayHistory("deck", fromPopState);
}

function renderDeckFilterDrawer() {
    const drawer = document.getElementById("deck-filter-drawer");
    if (!drawer) return;
    if (!QB.deckFilterOpen) {
        drawer.classList.add("hidden");
        return;
    }
    drawer.classList.remove("hidden");
    drawer.innerHTML = `
        <div class="max-w-4xl mx-auto space-y-3">
            <div class="flex flex-wrap items-center justify-between gap-2">
                <span class="text-xs font-extrabold uppercase tracking-wider text-slate-500">Deck Filters</span>
                <div class="flex items-center gap-2">
                    <button id="df-reset-btn" type="button" class="text-xs font-bold text-red-500 hover:underline">Reset All</button>
                    <button id="df-done-btn" type="button" class="px-3 py-1 rounded-lg bg-brand-600 text-white text-xs font-bold">Done</button>
                </div>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <input id="df-search" type="text" value="${escapeHtml(QB.filters.search)}" placeholder="Search keyword or QID..."
                    class="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-dark-800" />
                <select id="df-type" class="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-dark-800">
                    <option value="ALL" ${QB.filters.type === "ALL" ? "selected" : ""}>All Types</option>
                    <option value="MCQ" ${QB.filters.type === "MCQ" ? "selected" : ""}>MCQ</option>
                    <option value="Theory" ${QB.filters.type === "Theory" ? "selected" : ""}>Theory</option>
                </select>
                <select id="df-attempt" class="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-dark-800">
                    <option value="ALL" ${QB.filters.attempt === "ALL" ? "selected" : ""}>Status: All</option>
                    <option value="UNATTEMPTED" ${QB.filters.attempt === "UNATTEMPTED" ? "selected" : ""}>Unattempted</option>
                    <option value="CORRECT" ${QB.filters.attempt === "CORRECT" ? "selected" : ""}>Correct</option>
                    <option value="WRONG" ${QB.filters.attempt === "WRONG" ? "selected" : ""}>Incorrect</option>
                </select>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div class="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden max-h-52 overflow-y-auto" id="df-chapter-list">
                    ${buildChapterMenuHTML("deck")}
                </div>
                <div class="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden max-h-52 overflow-y-auto" id="df-batch-list">
                    ${buildBatchMenuHTML()}
                </div>
            </div>
        </div>
    `;

    bindChapterMenuEvents(drawer.querySelector("#df-chapter-list"));
    bindBatchMenuEvents(drawer.querySelector("#df-batch-list"));

    let t = null;
    drawer.querySelector("#df-search")?.addEventListener("input", (e) => {
        clearTimeout(t);
        t = setTimeout(() => {
            QB.filters.search = e.target.value;
            const mainSearch = document.getElementById("searchInput");
            if (mainSearch) mainSearch.value = e.target.value;
            applyFiltersAndRender();
        }, 180);
    });
    drawer.querySelector("#df-type")?.addEventListener("change", (e) => {
        QB.filters.type = e.target.value;
        const mainType = document.getElementById("typeFilter");
        if (mainType) mainType.value = e.target.value;
        applyFiltersAndRender();
    });
    drawer.querySelector("#df-attempt")?.addEventListener("change", (e) => {
        QB.filters.attempt = e.target.value;
        const mainAtt = document.getElementById("attemptFilter");
        if (mainAtt) mainAtt.value = e.target.value;
        applyFiltersAndRender();
    });
    drawer.querySelector("#df-reset-btn")?.addEventListener("click", resetAllFilters);
    drawer.querySelector("#df-done-btn")?.addEventListener("click", () => {
        QB.deckFilterOpen = false;
        drawer.classList.add("hidden");
    });
}

function openJumpToModal() {
    if (!QB.activeDeck.length) return;
    const modal = showModal({
        id: "mpp-jump-modal",
        size: "sm",
        title: "Jump to Question",
        bodyHtml: `
            <form id="mpp-jump-form" class="space-y-3">
                <p class="text-xs text-slate-500">Enter a card number (1 – ${QB.activeDeck.length}) or exact QID (e.g. ${escapeHtml(QB.activeDeck[0]?.q || "DGT1")}).</p>
                <input name="target" required autofocus value="${QB.deckIndex + 1}"
                    class="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-dark-800 text-sm font-bold" />
                <button type="submit" class="w-full py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-extrabold">Go</button>
            </form>
        `
    });
    modal.querySelector("#mpp-jump-form")?.addEventListener("submit", (e) => {
        e.preventDefault();
        const raw = String(new FormData(e.target).get("target") || "").trim();
        let nextIdx = -1;
        if (/^\d+$/.test(raw)) {
            nextIdx = Number(raw) - 1;
        } else {
            nextIdx = QB.activeDeck.findIndex(x => String(x.q).toLowerCase() === raw.toLowerCase());
        }
        if (nextIdx >= 0 && nextIdx < QB.activeDeck.length) {
            QB.deckIndex = nextIdx;
            closeModal("mpp-jump-modal");
            renderDeckCard();
        } else {
            showToast("Question not found in current deck.", "warning");
        }
    });
}

// Smooth In-Place Teen Patti Card Class Updater (Zero DOM Rebuild on Swipe)
function updateStageActiveCard(stageEl, nextPos) {
    if (!stageEl) return;
    const cards = [...stageEl.querySelectorAll(".tp-patti")];
    if (!cards.length) return;
    const clamped = Math.max(0, Math.min(nextPos, cards.length - 1));
    stageEl.dataset.activePos = String(clamped);

    cards.forEach((el, idx) => {
        el.classList.remove("tp-active", "tp-prev", "tp-next", "tp-hidden-left", "tp-hidden-right");
        if (idx === clamped) el.classList.add("tp-active");
        else if (idx === clamped - 1) el.classList.add("tp-prev");
        else if (idx === clamped + 1) el.classList.add("tp-next");
        else if (idx < clamped) el.classList.add("tp-hidden-left");
        else el.classList.add("tp-hidden-right");
    });

    const counter = stageEl.closest(".tp-fan-section")?.querySelector(".tp-fan-counter");
    if (counter) counter.textContent = `${clamped + 1} / ${cards.length}`;

    // If newly active card is an external PG card not yet hydrated, fetch it on demand
    const activeCard = cards[clamped];
    if (activeCard?.dataset.pgQid && activeCard.dataset.pgLoaded !== "1") {
        hydrateExternalPGCard(activeCard, activeCard.dataset.pgQid);
    }
}

async function hydrateExternalPGCard(cardEl, pgQid) {
    cardEl.dataset.pgLoaded = "1";
    const bodyEl = cardEl.querySelector(".tp-pg-body");
    if (!bodyEl) return;

    let pg = QB.pgCardCache[pgQid];
    if (!pg) {
        pg = await getSharedPGQuestion(QB.bridgeSlug, pgQid);
        if (pg) QB.pgCardCache[pgQid] = pg;
    }

    if (!pg) {
        bodyEl.innerHTML = `<div class="text-xs text-slate-400 italic">PG card ${escapeHtml(pgQid)} not synced to shared cache yet.</div>`;
        return;
    }

    const opts = Array.isArray(pg.options) ? pg.options : [];
    const correctKey = String(pg.ans_key || pg.answer || "").trim().toUpperCase();
    bodyEl.innerHTML = `
        <div class="text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-100 leading-relaxed">${renderRich(pg.stem || pg.question || "")}</div>
        ${pg.image ? `<img src="${escapeHtml(pg.image)}" alt="PG Figure" data-lightbox-src="${escapeHtml(pg.image)}" class="mt-2 max-h-40 rounded-lg border border-slate-200 dark:border-slate-700 cursor-zoom-in" />` : ""}
        ${opts.length ? `
            <div class="mt-2 space-y-1">
                ${opts.map((o, i) => {
                    const l = String.fromCharCode(65 + i);
                    const isAns = l === correctKey;
                    return `<div class="px-2.5 py-1 rounded-lg text-xs border ${isAns ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 font-bold" : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"}"><span class="font-extrabold mr-1">${l})</span>${escapeHtml(String(o).replace(/^[A-E][\.\)\:]\s*/i, ""))}</div>`;
                }).join("")}
            </div>
        ` : ""}
        ${pg.explanation ? `<details class="mt-2 text-xs"><summary class="cursor-pointer font-bold text-indigo-600 dark:text-indigo-400">Show PG Explanation</summary><div class="mpp-prose mt-1.5 p-2.5 rounded-lg bg-slate-50 dark:bg-dark-900 border border-slate-200 dark:border-slate-700">${renderRich(pg.explanation)}</div></details>` : ""}
    `;
    enhanceRichContainer(bodyEl);
}

function buildTeenPattiSectionHTML(currentQ) {
    if (!canShowTeenPatti()) return "";
    const topics = getClusterTopicsForQid(currentQ.q);
    if (!topics.length && !isUserAdmin()) return "";

    if (!topics.length && isUserAdmin()) {
        return `
            <div class="mt-5 pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <span class="text-xs font-bold text-slate-400">🃏 No Teen Patti repeat links yet</span>
                <button type="button" data-admin-crosslink="${escapeHtml(currentQ.q)}" class="px-3 py-1.5 rounded-lg bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 text-xs font-extrabold">+ Link Repeat Topic</button>
            </div>
        `;
    }

    const fanState = QB.activeFanState[currentQ.q] || { topicSlug: topics[0].slug, pos: 0 };
    if (!topics.some(t => t.slug === fanState.topicSlug)) {
        fanState.topicSlug = topics[0].slug;
        fanState.pos = 0;
    }
    QB.activeFanState[currentQ.q] = fanState;

    const activeTopic = topics.find(t => t.slug === fanState.topicSlug) || topics[0];
    const cl = activeTopic.data;
    const profIds = (Array.isArray(cl.profs) ? cl.profs : Object.values(cl.profs || {})).map(x => String(x).trim().toUpperCase());
    const pgIds = canShowCrossExamPG()
        ? (Array.isArray(cl.medpyq) ? cl.medpyq : Object.values(cl.medpyq || {})).map(x => String(x).trim().toUpperCase())
        : [];

    // Build ordered list of sibling cards (Current Profs Q first, then other Profs Qs, then PG Qs)
    const upCurr = String(currentQ.q).trim().toUpperCase();
    const orderedProfs = [upCurr, ...profIds.filter(id => id !== upCurr)];
    const cardsData = [];

    orderedProfs.forEach(id => {
        const found = QB.qnaData.find(x => String(x.q).trim().toUpperCase() === id);
        if (found) cardsData.push({ kind: "profs", id, q: getDisplayedQuestion(found) });
    });
    pgIds.forEach(id => {
        cardsData.push({ kind: "pg", id });
    });

    if (cardsData.length <= 1 && !isUserAdmin()) return "";

    const activePos = Math.max(0, Math.min(fanState.pos || 0, cardsData.length - 1));
    fanState.pos = activePos;

    return `
        <div class="tp-fan-section mt-5 pt-4 border-t border-slate-200 dark:border-slate-800" data-tp-qid="${escapeHtml(currentQ.q)}">
            <div class="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                <div class="flex flex-wrap items-center gap-1.5">
                    <span class="text-xs font-extrabold text-slate-700 dark:text-slate-200">🃏 Related PYQs</span>
                    ${topics.map(t => `
                        <button type="button" data-tp-topic="${escapeHtml(t.slug)}"
                            class="px-2.5 py-1 rounded-full text-[11px] font-bold border transition ${t.slug === activeTopic.slug
                                ? "bg-brand-600 text-white border-brand-600"
                                : "bg-slate-100 dark:bg-dark-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"}">
                            ${escapeHtml(t.data.title || t.slug)}
                        </button>
                    `).join("")}
                </div>
                <div class="flex items-center gap-2">
                    <span class="tp-fan-counter text-[11px] font-extrabold text-slate-500">${activePos + 1} / ${cardsData.length}</span>
                    ${isUserAdmin() ? `<button type="button" data-admin-crosslink="${escapeHtml(currentQ.q)}" class="px-2 py-1 rounded-lg bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 text-[11px] font-extrabold">🔗 Edit Links</button>` : ""}
                </div>
            </div>

            <div class="tp-fan-wrap">
                <div class="tp-stage" data-active-pos="${activePos}">
                    ${cardsData.map((card, idx) => {
                        const posCls = idx === activePos ? "tp-active"
                            : (idx === activePos - 1 ? "tp-prev"
                            : (idx === activePos + 1 ? "tp-next"
                            : (idx < activePos ? "tp-hidden-left" : "tp-hidden-right")));

                        if (card.kind === "pg") {
                            return `
                                <div class="tp-patti ${posCls} bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-950/50 dark:to-dark-900 border border-indigo-200 dark:border-indigo-800 shadow-md p-4"
                                     data-tp-idx="${idx}" data-pg-qid="${escapeHtml(card.id)}">
                                    <!-- Peeking Left/Right Wing Strips -->
                                    <div class="tp-wing-strip wing-left"><span class="text-[10px] font-black text-indigo-600">#${idx + 1}</span><span class="text-[9px] font-extrabold writing-vertical text-indigo-500">${escapeHtml(card.id)}</span></div>
                                    <div class="tp-wing-strip wing-right"><span class="text-[10px] font-black text-indigo-600">#${idx + 1}</span><span class="text-[9px] font-extrabold text-indigo-500">${escapeHtml(card.id)}</span></div>

                                    <div class="flex items-center justify-between gap-2 mb-2">
                                        <span class="px-2 py-0.5 rounded bg-indigo-600 text-white text-[10px] font-extrabold">NEET-PG / INI-CET • ${escapeHtml(card.id)}</span>
                                        <span class="text-[10px] font-bold text-slate-400">Card ${idx + 1}</span>
                                    </div>
                                    <div class="tp-pg-body text-xs text-slate-400">Tap or swipe to load PG question...</div>
                                </div>
                            `;
                        }

                        const cq = card.q;
                        const isMcq = String(cq.type || "").toUpperCase() === "MCQ";
                        const rawAns = QB.liveAnswers?.[cq.q]?.text || "";
                        const snippet = rawAns ? rawAns.replace(/[#*_`>\[\]]/g, "").slice(0, 140) : "";

                        return `
                            <div class="tp-patti ${posCls} bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-700 shadow-md p-4"
                                 data-tp-idx="${idx}" data-patti-qid="${escapeHtml(cq.q)}">
                                <!-- Peeking Wing Strips (Original Old UI Polish) -->
                                <div class="tp-wing-strip wing-left">
                                    <span class="text-[10px] font-black text-brand-600 dark:text-brand-400">#${idx + 1}</span>
                                    <span class="text-[9px] font-extrabold text-slate-600 dark:text-slate-300 truncate max-w-[38px]">${escapeHtml(cq.q)}</span>
                                    <span class="w-4 h-0.5 bg-brand-400/60 rounded"></span>
                                    <span class="w-3 h-0.5 bg-brand-400/40 rounded"></span>
                                </div>
                                <div class="tp-wing-strip wing-right">
                                    <span class="text-[10px] font-black text-brand-600 dark:text-brand-400">#${idx + 1}</span>
                                    <span class="text-[9px] font-extrabold text-slate-600 dark:text-slate-300 truncate max-w-[38px]">${escapeHtml(cq.q)}</span>
                                    <span class="w-4 h-0.5 bg-brand-400/60 rounded"></span>
                                    <span class="w-3 h-0.5 bg-brand-400/40 rounded"></span>
                                </div>

                                <div class="flex items-center justify-between gap-2 mb-2">
                                    <div class="flex items-center gap-1.5 min-w-0">
                                        <span class="px-2 py-0.5 rounded bg-brand-100 dark:bg-brand-900/50 text-brand-700 dark:text-brand-300 text-[10px] font-extrabold">${escapeHtml(cq.q)}</span>
                                        <span class="text-[10px] font-bold text-slate-500 truncate">${escapeHtml(normalizeArr(cq.examBatch, "Prof").join(", "))}</span>
                                    </div>
                                    <span class="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded ${isMcq ? "bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300" : "bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300"}">${isMcq ? "MCQ" : "Theory"}</span>
                                </div>

                                <div class="flex items-start gap-3">
                                    <div class="flex-1 min-w-0">
                                        <div class="text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-100 leading-relaxed line-clamp-4">${renderRich(cq.stem)}</div>
                                        ${!isMcq && snippet ? `<div class="mt-2 p-2 rounded-lg bg-slate-50 dark:bg-dark-800 text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">${escapeHtml(snippet)}...</div>` : ""}
                                    </div>
                                    ${cq.image ? `<div class="tp-patti-thumb-box"><img src="${escapeHtml(cq.image)}" alt="Thumbnail" loading="lazy" /></div>` : ""}
                                </div>

                                <div class="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
                                    <span class="text-slate-400 truncate max-w-[60%]">${escapeHtml(normalizeArr(cq.chapter, "").join(", "))}</span>
                                    <div class="flex items-center gap-2">
                                        ${canShowAnswers() ? `<button type="button" data-tp-viewans="${escapeHtml(cq.q)}" class="font-bold text-brand-600 dark:text-brand-400 hover:underline">Answer</button>` : ""}
                                        ${cq.q !== currentQ.q ? `<button type="button" data-tp-jump="${escapeHtml(cq.q)}" class="font-bold text-slate-600 dark:text-slate-300 hover:text-brand-600">Open &rarr;</button>` : `<span class="text-emerald-600 font-bold">Current</span>`}
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join("")}
                </div>
            </div>
        </div>
    `;
}

function attachFanSwipeInteractions(sectionEl, currentQId) {
    if (!sectionEl) return;
    const stage = sectionEl.querySelector(".tp-stage");
    if (!stage) return;

    // Topic pill switchers
    sectionEl.querySelectorAll("[data-tp-topic]").forEach(btn => {
        btn.addEventListener("click", () => {
            QB.activeFanState[currentQId] = { topicSlug: btn.dataset.tpTopic, pos: 0 };
            renderDeckCard();
        });
    });

    // Click peeking prev/next wing card to slide smoothly in-place
    stage.querySelectorAll(".tp-patti").forEach(cardEl => {
        cardEl.addEventListener("click", (e) => {
            if (e.target.closest("button, a, summary")) return;
            const idx = Number(cardEl.dataset.tpIdx);
            const cur = Number(stage.dataset.activePos || 0);
            if (idx !== cur) {
                QB.activeFanState[currentQId].pos = idx;
                updateStageActiveCard(stage, idx);
            }
        });

        // Admin long-press on .tp-patti card opens Cross-Link Modal
        if (isUserAdmin()) {
            let lpTimer = null;
            cardEl.addEventListener("pointerdown", () => {
                lpTimer = setTimeout(() => {
                    const qid = cardEl.dataset.pattiQid || currentQId;
                    window.MPPAdmin?.openCrossLinkModal?.(qid);
                }, 650);
            });
            ["pointerup", "pointermove", "pointercancel"].forEach(ev => {
                cardEl.addEventListener(ev, () => { if (lpTimer) { clearTimeout(lpTimer); lpTimer = null; } });
            });
        }
    });

    sectionEl.querySelectorAll("[data-tp-viewans]").forEach(btn => {
        btn.addEventListener("click", (e) => { e.stopPropagation(); openAnswerModal(btn.dataset.tpViewans); });
    });

    sectionEl.querySelectorAll("[data-tp-jump]").forEach(btn => {
        btn.addEventListener("click", (e) => {
            e.stopPropagation();
            const targetIdx = QB.activeDeck.findIndex(x => x.q === btn.dataset.tpJump);
            if (targetIdx !== -1) {
                QB.deckIndex = targetIdx;
                renderDeckCard();
            } else {
                showToast("Question is outside your current filter.", "info");
            }
        });
    });

    sectionEl.querySelector("[data-admin-crosslink]")?.addEventListener("click", (e) => {
        window.MPPAdmin?.openCrossLinkModal?.(e.currentTarget.dataset.adminCrosslink);
    });

    // Edge-Safe Android Touch Swipe on Teen Patti Fan
    let startX = 0, startY = 0, tracking = false;
    stage.addEventListener("touchstart", (e) => {
        const t = e.touches[0];
        if (!t) return;
        if (t.clientX < ANDROID_EDGE_GUARD_PX || t.clientX > window.innerWidth - ANDROID_EDGE_GUARD_PX) {
            tracking = false;
            return;
        }
        startX = t.clientX;
        startY = t.clientY;
        tracking = true;
    }, { passive: true });

    stage.addEventListener("touchend", (e) => {
        if (!tracking) return;
        tracking = false;
        const t = e.changedTouches[0];
        if (!t) return;
        const dx = t.clientX - startX;
        const dy = t.clientY - startY;
        if (Math.abs(dx) > 42 && Math.abs(dx) > Math.abs(dy) * 1.25) {
            const cur = Number(stage.dataset.activePos || 0);
            const next = dx < 0 ? cur + 1 : cur - 1;
            const total = stage.querySelectorAll(".tp-patti").length;
            if (next >= 0 && next < total) {
                QB.activeFanState[currentQId].pos = next;
                updateStageActiveCard(stage, next);
            }
        }
    }, { passive: true });

    // Trigger initial PG hydration if active card is PG
    const initActive = stage.querySelector(".tp-patti.tp-active");
    if (initActive?.dataset.pgQid) {
        hydrateExternalPGCard(initActive, initActive.dataset.pgQid);
    }
}

export function renderDeckCard() {
    const stage = document.getElementById("deck-card-stage");
    const eyeBtn = document.getElementById("floating-eye-btn");
    if (!stage) return;

    for (const k of QB._panzoomInstances.keys()) {
        if (k.startsWith("deck_")) destroyPanzoom(k);
    }

    const total = QB.activeDeck.length;
    const counterBtn = document.getElementById("deck-counter-btn");
    const prevBtn = document.getElementById("deck-prev-btn");
    const nextBtn = document.getElementById("deck-next-btn");
    const fillEl = document.getElementById("deck-progress-fill");
    const lblEl = document.getElementById("deck-progress-label");

    if (!total) {
        if (counterBtn) counterBtn.textContent = "0 / 0";
        if (prevBtn) prevBtn.disabled = true;
        if (nextBtn) nextBtn.disabled = true;
        if (eyeBtn) eyeBtn.style.display = "none";
        stage.innerHTML = `<div class="py-16 text-center text-slate-400 text-sm">No questions match your current deck filters.</div>`;
        return;
    }

    const rawQ = QB.activeDeck[QB.deckIndex];
    const q = getDisplayedQuestion(rawQ);
    const isMcq = String(q.type || "").toUpperCase() === "MCQ";
    const { cleanStem, marksBadge } = extractTheoryMarks(q.stem, q.type);
    const chapters = normalizeArr(q.chapter, "General");
    const batches = normalizeArr(q.examBatch, "Prof Exam");
    const uniqueId = getUniqueQuestionId(q.q);
    const isSaved = Boolean(MPPStore.bookmarks?.[uniqueId]);
    const repeatCount = QB.repeatCountMap[String(q.q || "").trim().toUpperCase()] || 0;
    const att = QB.attempts[q.q];
    const personalNote = QB.userNotes?.[uniqueId]?.text || "";
    const showAnsCardBtn = Boolean(q.ans_image && canShowAnswerCards());
    const cardKey = `deck_${q.q}`;
    const ansCardOpen = QB.ansCardOpenSet.has(cardKey);

    if (counterBtn) counterBtn.textContent = `${QB.deckIndex + 1} / ${total}`;
    if (prevBtn) prevBtn.disabled = QB.deckIndex <= 0;
    if (nextBtn) nextBtn.disabled = QB.deckIndex >= total - 1;
    const pct = Math.round(((QB.deckIndex + 1) / total) * 100);
    if (fillEl) fillEl.style.width = `${pct}%`;
    if (lblEl) lblEl.textContent = `${pct}% reviewed`;

    if (eyeBtn) {
        eyeBtn.style.display = canShowAnswers() ? "flex" : "none";
        eyeBtn.onclick = () => openAnswerModal(q.q);
    }

    const mcqHtml = isMcq && Array.isArray(q.options) && q.options.length ? `
        <div class="mt-4 space-y-2.5">
            ${q.options.map((opt, idx) => {
                const letter = String.fromCharCode(65 + idx);
                const cleanOpt = String(opt).replace(/^[A-E][\.\)\:]\s*/i, "");
                let cls = "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-dark-800 hover:border-brand-400 text-slate-800 dark:text-slate-100";
                let badge = "";
                if (att) {
                    if (letter === q.ans_key) {
                        cls = "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-200 font-bold";
                        badge = `<span class="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">✓ Correct</span>`;
                    } else if (letter === att.chosen) {
                        cls = "border-red-500 bg-red-50 dark:bg-red-950/50 text-red-800 dark:text-red-200 font-bold";
                        badge = `<span class="text-xs font-extrabold text-red-600 dark:text-red-400">✗ Your Pick</span>`;
                    }
                }
                return `
                    <button type="button" data-deck-opt="${letter}"
                        class="w-full flex items-center justify-between gap-3 text-left px-4 py-3 rounded-xl border text-sm transition ${cls}">
                        <span><span class="font-extrabold mr-2">${letter})</span>${escapeHtml(cleanOpt)}</span>
                        ${badge}
                    </button>
                `;
            }).join("")}
        </div>
    ` : "";

    stage.innerHTML = `
        <article class="deck-card bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-4 sm:p-6 animate-fade-in">
            <!-- Card Header (Original Ask AI external-link SVG + 🚩 + 🔖) -->
            <div class="flex flex-wrap items-center justify-between gap-2 pb-3 mb-4 border-b border-slate-100 dark:border-slate-800">
                <div class="flex flex-wrap items-center gap-1.5">
                    <span class="px-2.5 py-1 rounded-lg bg-brand-100 dark:bg-brand-900/50 text-brand-700 dark:text-brand-300 text-xs font-extrabold">${escapeHtml(q.q)}</span>
                    <span class="px-2 py-0.5 rounded-full text-[11px] font-extrabold ${isMcq ? "bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300" : "bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300"}">${isMcq ? "MCQ" : "Theory"}</span>
                    ${repeatCount >= 2 ? `<span class="px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 text-[11px] font-extrabold">🔥 Asked ${repeatCount}&times;</span>` : ""}
                </div>

                <div class="flex items-center gap-1.5">
                    <a href="${escapeHtml(buildAiHelpUrl(q))}" target="_blank" rel="noopener noreferrer" title="Ask AI"
                        class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-dark-800 hover:border-brand-400 text-xs font-bold text-slate-700 dark:text-slate-200">
                        <span>Ask AI</span>
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
                    </a>
                    <button id="deck-card-report-btn" type="button" title="Report Question"
                        class="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-red-400 text-xs">🚩</button>
                    <button id="deck-card-bmk-btn" type="button" title="Bookmark Question"
                        class="px-2.5 py-1.5 rounded-lg border text-xs font-bold ${isSaved ? "border-amber-400 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300" : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"}">
                        ${isSaved ? "🔖 Saved" : "🔖"}
                    </button>
                </div>
            </div>

            <!-- Chapter & Batch Meta -->
            <div class="flex flex-wrap items-center gap-1.5 mb-3 text-[11px]">
                ${chapters.map(ch => {
                    const u = getUnitForChapter(ch);
                    return `<span class="px-2 py-0.5 rounded bg-slate-100 dark:bg-dark-800 text-slate-600 dark:text-slate-300 font-semibold">${u ? `<strong class="text-brand-600 dark:text-brand-400">${escapeHtml(u)}:</strong> ` : ""}${escapeHtml(ch)}</span>`;
                }).join("")}
                ${batches.map(b => `<span class="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold">${escapeHtml(b)}</span>`).join("")}
            </div>

            <!-- Stem & Marks -->
            <div class="mpp-prose text-base sm:text-[17px] font-medium text-slate-900 dark:text-white leading-relaxed">${renderRich(cleanStem)}</div>
            ${marksBadge ? `<div class="mt-2"><span class="inline-flex items-center px-2.5 py-0.5 rounded-full bg-brand-100 dark:bg-brand-900/50 text-brand-700 dark:text-brand-300 text-xs font-extrabold">${escapeHtml(marksBadge)}</span></div>` : ""}
            ${q.image ? `<img src="${escapeHtml(q.image)}" alt="Question Figure" data-lightbox-src="${escapeHtml(q.image)}" class="mt-3 max-h-72 mx-auto rounded-xl border border-slate-200 dark:border-slate-700 cursor-zoom-in" />` : ""}

            ${mcqHtml}

            <!-- Action Row: View Answer + Clean View Answer Card (No 3D Flip) -->
            <div class="mt-5 flex flex-wrap items-center gap-2.5">
                ${canShowAnswers() ? `
                    <button id="deck-view-ans-btn" type="button" class="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs sm:text-sm font-bold shadow-sm transition">
                        👁️ View Answer
                    </button>
                ` : ""}
                ${showAnsCardBtn ? `
                    <button id="deck-toggle-anscard-btn" type="button" class="px-4 py-2 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 text-xs sm:text-sm font-bold transition">
                        ${ansCardOpen ? "🙈 Hide Answer Card" : "🖼️ View Answer Card"}
                    </button>
                ` : ""}
            </div>

            <div id="deck-anscard-host"></div>

            <!-- Collapsible Personal Mnemonic / Note -->
            <details class="mt-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-dark-800/40 px-3.5 py-2.5" ${personalNote ? "open" : ""}>
                <summary class="cursor-pointer text-xs font-bold text-slate-600 dark:text-slate-300 select-none">
                    📝 Personal Mnemonic / Note ${personalNote ? "• Saved" : "(Tap to add)"}
                </summary>
                <div class="mt-2.5 flex items-center gap-2">
                    <input id="deck-personal-note-input" type="text" maxlength="500" value="${escapeHtml(personalNote)}"
                        placeholder="Jot a quick 1-line mnemonic or ward pearl..."
                        class="flex-1 px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-dark-900" />
                    <button id="deck-save-note-btn" type="button" class="px-3 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold">Save</button>
                </div>
            </details>

            <!-- Admin Inline MCQ & Explanation Editor Mount Point (Phase 3) -->
            <div id="deck-admin-inline-root"></div>

            <!-- Smooth Teen Patti Related PYQs Fan -->
            ${buildTeenPattiSectionHTML(q)}
        </article>
    `;

    enhanceRichContainer(stage);

    // Bind Card Interactions
    stage.querySelectorAll("[data-deck-opt]").forEach(btn => {
        btn.addEventListener("click", () => {
            saveLocalAttempt(q.q, btn.dataset.deckOpt, q.ans_key);
            renderDeckCard();
        });
    });

    stage.querySelector("#deck-card-bmk-btn")?.addEventListener("click", () => handleBookmarkToggle(q.q));
    stage.querySelector("#deck-card-report-btn")?.addEventListener("click", () => openReportModal(q.q));
    stage.querySelector("#deck-view-ans-btn")?.addEventListener("click", () => openAnswerModal(q.q));

    const ansCardBtn = stage.querySelector("#deck-toggle-anscard-btn");
    const ansCardHost = stage.querySelector("#deck-anscard-host");
    if (ansCardBtn && ansCardHost && q.ans_image) {
        if (ansCardOpen) mountAnswerCardPanzoom(ansCardHost, cardKey, q.ans_image);
        ansCardBtn.addEventListener("click", () => {
            if (QB.ansCardOpenSet.has(cardKey)) {
                QB.ansCardOpenSet.delete(cardKey);
                destroyPanzoom(cardKey);
                ansCardHost.innerHTML = "";
                ansCardBtn.textContent = "🖼️ View Answer Card";
            } else {
                QB.ansCardOpenSet.add(cardKey);
                ansCardBtn.textContent = "🙈 Hide Answer Card";
                mountAnswerCardPanzoom(ansCardHost, cardKey, q.ans_image);
            }
        });
    }

    stage.querySelector("#deck-save-note-btn")?.addEventListener("click", async () => {
        const input = stage.querySelector("#deck-personal-note-input");
        const val = input?.value || "";
        try {
            const savedText = await saveUserNote(uniqueId, val);
            if (savedText) QB.userNotes[uniqueId] = { text: savedText };
            else delete QB.userNotes[uniqueId];
            showToast(savedText ? "Mnemonic note saved!" : "Note cleared.", "success", 1800);
        } catch (err) {
            showToast(err.message || "Could not save note.", "error");
        }
    });

    // Teen Patti Fan Binding
    const tpSection = stage.querySelector(".tp-fan-section");
    if (tpSection) attachFanSwipeInteractions(tpSection, q.q);

    // Phase 3 Admin Inline Editor Hook
    if (isUserAdmin() && window.MPPAdmin?.renderInlineEditor) {
        const inlineRoot = stage.querySelector("#deck-admin-inline-root");
        if (inlineRoot) window.MPPAdmin.renderInlineEditor(inlineRoot, q, QB.liveAnswers?.[q.q]?.text || "");
    }

    stage.scrollTop = 0;
}

// ============================================================================
// 10. GLOBAL EVENTS (Debounce, Dropdowns, Android Edge-Safe Swipe, Keyboard)
// ============================================================================
function resetAllFilters() {
    QB.filters.search = "";
    QB.filters.type = "ALL";
    QB.filters.chapters.clear();
    QB.filters.batches.clear();
    QB.filters.attempt = "ALL";
    QB.filters.savedOnly = false;
    QB.filters.highYieldOnly = false;

    const sEl = document.getElementById("searchInput");
    if (sEl) sEl.value = "";
    document.getElementById("clearSearchBtn")?.classList.add("hidden");
    const tEl = document.getElementById("typeFilter");
    if (tEl) tEl.value = "ALL";
    const aEl = document.getElementById("attemptFilter");
    if (aEl) aEl.value = "ALL";

    refreshFilterUIAndRender();
}

function bindStaticUIControls() {
    // 180ms Debounced Search
    const searchInput = document.getElementById("searchInput");
    const clearSearchBtn = document.getElementById("clearSearchBtn");
    searchInput?.addEventListener("input", (e) => {
        const v = e.target.value;
        clearSearchBtn?.classList.toggle("hidden", !v);
        clearTimeout(QB._searchTimer);
        QB._searchTimer = setTimeout(() => {
            QB.filters.search = v;
            applyFiltersAndRender();
        }, 180);
    });
    clearSearchBtn?.addEventListener("click", () => {
        if (searchInput) searchInput.value = "";
        clearSearchBtn.classList.add("hidden");
        QB.filters.search = "";
        applyFiltersAndRender();
    });

    document.getElementById("typeFilter")?.addEventListener("change", (e) => {
        QB.filters.type = e.target.value;
        applyFiltersAndRender();
    });
    document.getElementById("attemptFilter")?.addEventListener("change", (e) => {
        QB.filters.attempt = e.target.value;
        applyFiltersAndRender();
    });

    // Multiselect Dropdown Toggle + Outside-Click Close
    const chMenu = document.getElementById("chapterMultiselectMenu");
    const bMenu = document.getElementById("batchMultiselectMenu");
    document.getElementById("chapterMultiselectBtn")?.addEventListener("click", (e) => {
        e.stopPropagation();
        bMenu?.classList.add("hidden");
        chMenu?.classList.toggle("hidden");
    });
    document.getElementById("batchMultiselectBtn")?.addEventListener("click", (e) => {
        e.stopPropagation();
        chMenu?.classList.add("hidden");
        bMenu?.classList.toggle("hidden");
    });
    document.addEventListener("click", (e) => {
        if (!e.target.closest("#chapterDropdownWrap")) chMenu?.classList.add("hidden");
        if (!e.target.closest("#batchDropdownWrap")) bMenu?.classList.add("hidden");
    });

    // Saved & High-Yield Toggles (Synced between Table & Deck)
    const toggleSaved = () => {
        QB.filters.savedOnly = !QB.filters.savedOnly;
        updateFilterButtonLabels();
        applyFiltersAndRender();
    };
    const toggleHighYield = () => {
        QB.filters.highYieldOnly = !QB.filters.highYieldOnly;
        updateFilterButtonLabels();
        applyFiltersAndRender();
    };
    document.getElementById("savedOnlyBtn")?.addEventListener("click", toggleSaved);
    document.getElementById("deck-saved-btn")?.addEventListener("click", toggleSaved);
    document.getElementById("highYieldOnlyBtn")?.addEventListener("click", toggleHighYield);
    document.getElementById("deck-hy-btn")?.addEventListener("click", toggleHighYield);
    document.getElementById("resetFiltersBtn")?.addEventListener("click", resetAllFilters);

    // Deck Controls
    document.getElementById("open-deck-btn")?.addEventListener("click", () => openDeckAt(0));
    document.getElementById("deck-close-btn")?.addEventListener("click", () => closeDeck(false));
    document.getElementById("deck-menu-btn")?.addEventListener("click", () => openSidebar());
    document.getElementById("deck-counter-btn")?.addEventListener("click", () => openJumpToModal());
    document.getElementById("deck-filter-btn")?.addEventListener("click", () => {
        QB.deckFilterOpen = !QB.deckFilterOpen;
        renderDeckFilterDrawer();
    });
    document.getElementById("deck-prev-btn")?.addEventListener("click", () => {
        if (QB.deckIndex > 0) { QB.deckIndex--; renderDeckCard(); }
    });
    document.getElementById("deck-next-btn")?.addEventListener("click", () => {
        if (QB.deckIndex < QB.activeDeck.length - 1) { QB.deckIndex++; renderDeckCard(); }
    });

    // Edge-Safe Android Horizontal Swipe on Deck Card Stage (Ignores Teen Patti & Panzoom)
    const deckStage = document.getElementById("deck-card-stage");
    let sx = 0, sy = 0, activeSwipe = false;
    deckStage?.addEventListener("touchstart", (e) => {
        if (e.target.closest(".tp-fan-wrap, .pz-viewport, input, textarea, select")) {
            activeSwipe = false;
            return;
        }
        const t = e.touches[0];
        if (!t || t.clientX < ANDROID_EDGE_GUARD_PX || t.clientX > window.innerWidth - ANDROID_EDGE_GUARD_PX) {
            activeSwipe = false;
            return;
        }
        sx = t.clientX; sy = t.clientY; activeSwipe = true;
    }, { passive: true });

    deckStage?.addEventListener("touchend", (e) => {
        if (!activeSwipe) return;
        activeSwipe = false;
        const t = e.changedTouches[0];
        if (!t) return;
        const dx = t.clientX - sx;
        const dy = t.clientY - sy;
        if (Math.abs(dx) > 65 && Math.abs(dx) > Math.abs(dy) * 1.45) {
            if (dx < 0 && QB.deckIndex < QB.activeDeck.length - 1) {
                QB.deckIndex++; renderDeckCard();
            } else if (dx > 0 && QB.deckIndex > 0) {
                QB.deckIndex--; renderDeckCard();
            }
        }
    }, { passive: true });

    // Deck Keyboard Shortcuts (Arrows, 1-4, Space)
    document.addEventListener("keydown", (e) => {
        if (!QB.deckOpen) return;
        if (["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)) return;
        if (document.getElementById("mpp-answer-modal") || document.getElementById("mpp-jump-modal") || document.getElementById("mpp-report-modal")) {
            if (e.key === "Escape") closeModal();
            return;
        }

        if (e.key === "ArrowRight" && QB.deckIndex < QB.activeDeck.length - 1) {
            QB.deckIndex++; renderDeckCard();
        } else if (e.key === "ArrowLeft" && QB.deckIndex > 0) {
            QB.deckIndex--; renderDeckCard();
        } else if (e.key === " " && canShowAnswers()) {
            e.preventDefault();
            const cur = QB.activeDeck[QB.deckIndex];
            if (cur) openAnswerModal(cur.q);
        } else if (["1", "2", "3", "4"].includes(e.key)) {
            const cur = getDisplayedQuestion(QB.activeDeck[QB.deckIndex]);
            if (cur && String(cur.type).toUpperCase() === "MCQ" && Array.isArray(cur.options)) {
                const letter = String.fromCharCode(64 + Number(e.key));
                if (Number(e.key) <= cur.options.length) {
                    saveLocalAttempt(cur.q, letter, cur.ans_key);
                    renderDeckCard();
                }
            }
        }
    });

    // Header Subject Answers Toggle (Admin Only)
    document.getElementById("header-subject-ans-toggle")?.addEventListener("click", async () => {
        try {
            await toggleSubjectAnswers(QB.subjectShowAnswers);
            showToast(`Subject answers turned ${!QB.subjectShowAnswers ? "ON" : "OFF"}`, "success");
        } catch (err) {
            showToast(err.message || "Toggle failed.", "error");
        }
    });
}

// ============================================================================
// 11. ADMIN FLOATING PILL & ACCESS NOTICE BANNER
// ============================================================================
function renderAdminFloatingPill() {
    const pill = document.getElementById("admin-controls");
    const headerToggle = document.getElementById("header-subject-ans-toggle");
    const admin = isUserAdmin();

    if (headerToggle) {
        headerToggle.classList.toggle("hidden", !admin);
        headerToggle.classList.toggle("inline-flex", admin);
        const span = headerToggle.querySelector("span");
        if (span) span.textContent = `Answers: ${QB.subjectShowAnswers ? "ON" : "OFF"}`;
    }

    if (!pill) return;
    if (!admin) {
        pill.classList.add("hidden");
        pill.innerHTML = "";
        return;
    }

    pill.classList.remove("hidden");
    pill.innerHTML = `
        <button id="pill-add-q" type="button" class="px-2 py-1 rounded-full bg-brand-600 hover:bg-brand-700 text-white">+ Add Q</button>
        <button id="pill-hub" type="button" class="px-2 py-1 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 hover:bg-amber-200">⚙️ Hub</button>
    `;
    pill.querySelector("#pill-add-q")?.addEventListener("click", () => window.MPPAdmin?.openQuestionEditor?.(null));
    pill.querySelector("#pill-hub")?.addEventListener("click", () => window.MPPAdmin?.openControlHub?.());
}

function renderAccessNotice() {
    const bar = document.getElementById("access-notice-bar");
    if (!bar) return;

    if (!MPPStore.user) {
        bar.classList.remove("hidden");
        bar.innerHTML = `
            <div class="text-xs sm:text-sm font-semibold text-amber-900 dark:text-amber-200">
                Sign in to access full university question banks, bookmarks, and model answers.
            </div>
            <button id="anb-signin" type="button" class="px-4 py-1.5 rounded-xl bg-brand-600 text-white text-xs font-bold flex-shrink-0">Sign In</button>
        `;
        bar.querySelector("#anb-signin")?.addEventListener("click", () => openAuthModal("login"));
        return;
    }

    if (MPPStore.accessLevel === "free" && !MPPStore.isAdmin) {
        bar.classList.remove("hidden");
        bar.innerHTML = `
            <div class="text-xs sm:text-sm font-semibold text-amber-900 dark:text-amber-200">
                <strong>Free Preview Mode:</strong> Showing sample Theory &amp; MCQ questions. Upgrade to Pro to unlock all ${escapeHtml(QB.subjectName)} PYQs &amp; model answers.
            </div>
            <button id="anb-upgrade" type="button" class="px-4 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-extrabold flex-shrink-0">Unlock Pro &rarr;</button>
        `;
        bar.querySelector("#anb-upgrade")?.addEventListener("click", () => openSecureCheckout());
        return;
    }

    bar.classList.add("hidden");
    bar.innerHTML = "";
}

// ============================================================================
// 12. DEEP-LINKING (&qid=DGT42 & optional &deck=1)
// ============================================================================
function handleDeepLinkIfPresent() {
    if (QB._deepLinkHandled || !QB.activeDeck.length) return;
    const params = new URLSearchParams(window.location.search);
    const targetQid = (params.get("qid") || "").trim();
    if (!targetQid) { QB._deepLinkHandled = true; return; }

    const idx = QB.activeDeck.findIndex(x => String(x.q).toLowerCase() === targetQid.toLowerCase());
    if (idx === -1) return;

    QB._deepLinkHandled = true;
    if (params.get("deck") === "1") {
        openDeckAt(idx);
        return;
    }

    // Ensure enough chunks are rendered to reach the target row
    while (QB.renderedRowCount <= idx && QB.renderedRowCount < QB.activeDeck.length) {
        appendNextTableChunk();
    }
    const row = document.querySelector(`tr[data-qid-row="${CSS.escape(QB.activeDeck[idx].q)}"]`);
    if (row) {
        row.scrollIntoView({ behavior: "smooth", block: "center" });
        row.classList.add("qid-deeplink-highlight");
        setTimeout(() => row.classList.remove("qid-deeplink-highlight"), 4600);
    }
}

// ============================================================================
// 13. BOOT & DATA SUBSCRIPTIONS
// ============================================================================
function clearDataSubscriptions() {
    QB._unsubs.forEach(u => { try { u(); } catch (_) {} });
    QB._unsubs = [];
}

async function loadAllSubjectData() {
    clearDataSubscriptions();
    renderAccessNotice();
    renderAdminFloatingPill();

    if (!MPPStore.user) {
        QB.qnaData = [];
        QB.curriculumData = [];
        applyFiltersAndRender();
        return;
    }

    // Load user personal notes (cached 15 min in sessionStorage)
    loadUserNotes().then(notes => { QB.userNotes = notes || {}; }).catch(() => {});

    // Subscribe subject settings (showAnswers)
    QB._unsubs.push(subscribeSubjectSettings(({ showAnswers }) => {
        QB.subjectShowAnswers = Boolean(showAnswers);
        renderAdminFloatingPill();
        renderTableFresh();
        if (QB.deckOpen) renderDeckCard();
    }));

    // Subscribe Cross-Links (Teen Patti) — version-gated IndexedDB for students
    QB._unsubs.push(subscribeCrossLinks(QB.bridgeSlug, (data) => {
        QB.crossLinks = data || { clusters: {}, node_topics: {}, nodes: {}, history: [] };
        recomputeRepeatCounts();
        renderTableFresh();
        if (QB.deckOpen) renderDeckCard();
    }));

    if (QB.mode === "clinical") {
        QB._unsubs.push(subscribeClinicalData(({ qnaData, liveAnswers }) => {
            QB.qnaData = qnaData || [];
            QB.liveAnswers = liveAnswers || {};
            QB.curriculumData = [];
            buildFilterDropdowns();
            applyFiltersAndRender();
            handleDeepLinkIfPresent();
        }));
        return;
    }

    // REVIEW MODE: Load Bank + Delta Overrides + (Admin-only live answers; students fetch on-demand!)
    const bank = await loadReviewBank();
    QB.curriculumData = bank.curriculumData || [];
    QB.qnaData = bank.qnaData || [];
    QB._sourceTag = bank.sourceTag || "";
    if (bank.collegeName) {
        QB.collegeName = bank.collegeName;
        MPPStore.page.collegeName = bank.collegeName;
    }

    buildFilterDropdowns();
    applyFiltersAndRender();
    handleDeepLinkIfPresent();

    // Subscribe lightweight delta overrides (students read ONLY overrides from IndexedDB cache)
    QB._unsubs.push(subscribeReviewEdits(({ overrides, undoStack, redoStack }) => {
        QB.questionOverrides = overrides || {};
        QB.undoStack = undoStack || [];
        QB.redoStack = redoStack || [];
        applyFiltersAndRender();
    }));

    // Admins subscribe live answers for instant preview; students rely on getAnswerOnDemand() -> 0 KB upfront!
    if (isUserAdmin()) {
        QB._unsubs.push(subscribeReviewAnswers((ansMap) => {
            QB.liveAnswers = ansMap || {};
            if (QB.deckOpen) renderDeckCard();
        }));
    }
}

export function bootQBankEngine({ mode = "review" } = {}) {
    const params = new URLSearchParams(window.location.search);
    QB.mode = mode === "clinical" ? "clinical" : "review";
    QB.collegeCode = (params.get("college") || "deoghar").toLowerCase().trim();
    QB.subjectSlug = (params.get("subject") || "cfm").toLowerCase().trim();
    QB.versionCode = (params.get("version") || "").trim();

    const meta = resolveSubjectMeta(QB.subjectSlug);
    QB.subjectCode = meta.code;
    QB.subjectName = meta.name || meta.title || meta.code;
    QB.bridgeSlug = meta.bridgeSlug || QB.subjectSlug;
    QB.collegeName = resolveCollegeName(QB.collegeCode);

    // Sync page metadata into shared store
    MPPStore.page = {
        mode: QB.mode,
        collegeCode: QB.collegeCode,
        collegeName: QB.collegeName,
        subjectSlug: QB.subjectSlug,
        subjectCode: QB.subjectCode,
        subjectName: QB.subjectName,
        versionCode: QB.versionCode
    };

    // Update page headings & badges
    document.title = `${QB.subjectName} (${QB.mode === "clinical" ? "Clinical" : "PYQs"}) — ${QB.collegeName}`;
    const titleEl = document.getElementById("page-subject-title");
    if (titleEl) titleEl.textContent = QB.mode === "clinical" ? `${QB.subjectName} — Clinical & Viva` : QB.subjectName;
    const colEl = document.getElementById("page-college-badge");
    if (colEl) colEl.textContent = QB.collegeName;
    const verEl = document.getElementById("page-version-badge");
    if (verEl && QB.versionCode) {
        verEl.textContent = QB.versionCode.toUpperCase();
        verEl.classList.remove("hidden");
    }
    const deckSub = document.getElementById("deck-header-subtitle");
    if (deckSub) deckSub.textContent = `${QB.subjectName} • ${QB.collegeName}`;

    loadLocalAttempts();
    bindStaticUIControls();
    bindTableDelegation();

    // React to Auth / Feature Flags / Bookmarks / Admin Ready
    onStoreChange("auth", () => loadAllSubjectData());
    onStoreChange("flags", () => {
        recomputeRepeatCounts();
        renderTableFresh();
        if (QB.deckOpen) renderDeckCard();
    });
    onStoreChange("bookmarks", () => {
        if (QB.filters.savedOnly) applyFiltersAndRender();
    });
    onStoreChange("adminReady", () => {
        renderAdminFloatingPill();
        if (QB.deckOpen) renderDeckCard();
    });

    // Expose clean API for ui-shell.js & Phase 3 admin-suite.js
    window.QBankEngine = {
        getState: () => QB,
        getQuestionById: (qId) => getDisplayedQuestion(QB.qnaData.find(x => String(x.q).toLowerCase() === String(qId).toLowerCase())),
        getDisplayedQuestion,
        openAnswerModal,
        openDeckAt,
        closeDeck,
        openReportModal,
        renderTable: renderTableFresh,
        renderDeckCard,
        applyFiltersAndRender,
        refreshData: loadAllSubjectData,
        setLiveBank: ({ qnaData, curriculumData }) => {
            if (Array.isArray(qnaData)) QB.qnaData = qnaData;
            if (Array.isArray(curriculumData)) QB.curriculumData = curriculumData;
            buildFilterDropdowns();
            applyFiltersAndRender();
        }
    };

    if (MPPStore.authReady) loadAllSubjectData();
}
