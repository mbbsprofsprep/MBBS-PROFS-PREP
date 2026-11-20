// ============================================================================
// js/admin-suite.js (Complete Updated Version)
// Strictly Lazy-Loaded for the 3 Admins Only:
// - Live Preview Visual Toolkit (Highlight, Bold, Italic, Font Size, Text Edit)
// - 3-Tab Media Hub: Google Search (Serper.dev) + Wikimedia + GitHub Assets
// - Universal Add/Edit/Delete Question Modal (Review + Clinical)
// - Sync GitHub JSON -> Firebase & Sync Loaded Page -> Firebase
// - AI Vision Exam Scanner + JS Snippet Injector + Bulk JSON + 777 Export
// - Anki Importer + SortableJS Reordering + Bulk Delete
// - Dynamic Subject Version Manager + Teen Patti Cross-Linker & MedPYQ Bridge
// ============================================================================
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";
import { db, MPPStore, isUserAdmin, ref, get, set, update } from "./core-firebase.js";
import { escapeHtml, renderContent } from "./content-renderer.js";
import { showModal, closeModal } from "./ui-shell.js";
import {
    getVaultKeys,
    uploadFullBank,
    saveQuestion,
    deleteQuestion,
    deleteQuestionsBulk,
    reorderQuestion,
    importAnkiBatch,
    toggleSubjectAnswers,
    toggleGlobalFeatureFlag,
    clearLocalBankCache,
    exportFirebaseFirstBank,
    sanitizeBankPayload,
    syncGitHubJsonToFirebase,
    syncLoadedPageToFirebase
} from "./data-adapter.js";
import {
    getGitHubAssetConfig,
    saveGitHubAssetConfig,
    testGitHubConnection,
    uploadFileToGitHub,
    mirrorImageUrlToGitHub,
    searchWikimediaMedia,
    getGoogleSearchConfig,
    saveGoogleSearchConfig,
    searchGoogleSerperMedia
} from "./admin-github-uploader.js";

let suiteMounted = false;
let sortableLoading = false;
const previewUndoMap = new Map();
let toolkitCtx = null; // { textareaId, previewId, selectedText, anchorText }
let searchResults = [];
let queuedMediaUrls = new Set();
let versionModalState = null;
let lastSnippetBackup = null;
let crossLinkAnchorQid = null;
let bulkSelectedQids = new Set();

let medpyqAuth = null;
let medpyqDb = null;

function getQB() { return window.QBankEngine?.state || null; }
function requireAdmin() { if (!isUserAdmin()) throw new Error("Admin access strictly required."); }

// ============================================================================
// 1. INITIALIZATION (Called automatically by core-firebase.js for 3 Admins)
// ============================================================================
export function initAdminSuite() {
    if (suiteMounted || !isUserAdmin()) return;
    suiteMounted = true;

    injectAdminCSS();
    injectAdminModals();
    injectPageAdminButtons();
    bindPreviewSelectionToolkit();
    initDeckBulkSelectLongPress();
    initMedPYQBridgeSilent();

    window.toggleGlobalAnswers = () => {
        const qb = getQB();
        if (qb) toggleSubjectAnswers(qb.subjectSettings?.showAnswers);
    };
    window.handleSecretClick = openSecretCodeModal;
}

// ============================================================================
// 2. ADMIN CSS, TOOLBAR & MODALS
// ============================================================================
function injectAdminCSS() {
    if (document.getElementById("mpp-admin-suite-css")) return;
    document.head.insertAdjacentHTML("beforeend", `
    <style id="mpp-admin-suite-css">
        .mpp-visual-edit-active { outline: 2px dashed #0ea5e9; outline-offset: 4px; border-radius: 10px; cursor: text; }
        #mpp-floating-toolkit {
            position: fixed; z-index: 42000; display: none; flex-wrap: wrap; gap: 5px; align-items: center;
            background: #0f172a; color: #f8fafc; border: 1px solid #334155; border-radius: 14px;
            padding: 8px; box-shadow: 0 14px 36px rgba(0,0,0,0.45); max-width: 94vw;
        }
        .mpp-tk-btn {
            padding: 5px 9px; border-radius: 8px; border: 1px solid #334155; background: #1e293b;
            color: #f8fafc; font-size: 11px; font-weight: 800; cursor: pointer; white-space: nowrap;
        }
        .mpp-tk-btn:hover { background: #0284c7; border-color: #38bdf8; }
        .mpp-media-card {
            position: relative; border-radius: 12px; overflow: hidden; border: 2.5px solid #e2e8f0;
            cursor: pointer; background: #f8fafc; transition: all 0.15s;
        }
        html.dark .mpp-media-card { border-color: #334155; background: #1e293b; }
        .mpp-media-card.selected { border-color: #0ea5e9; box-shadow: 0 0 0 3px rgba(14,165,233,0.3); }
        .mpp-media-badge {
            position: absolute; top: 6px; left: 6px; width: 22px; height: 22px; border-radius: 50%;
            background: rgba(15,23,42,0.85); color: #fff; font-size: 10px; font-weight: 900;
            display: flex; align-items: center; justify-content: center; z-index: 2;
        }
        .mpp-media-card.selected .mpp-media-badge { background: #0ea5e9; }
    </style>`);
}

function injectPageAdminButtons() {
    const bar = document.getElementById("admin-controls");
    if (!bar || document.getElementById("mpp-adm-add-btn")) return;

    bar.classList.remove("hidden");
    bar.classList.add("flex", "flex-wrap");
    bar.insertAdjacentHTML("afterbegin", `
        <button id="mpp-adm-hub-btn" type="button" onclick="window.MPPAdmin.openControlHub()" class="bg-sky-500 hover:bg-sky-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-extrabold uppercase border-none cursor-pointer shadow-sm">⚙️ Hub &amp; Vault</button>
        <button id="mpp-adm-add-btn" type="button" onclick="window.MPPAdmin.openAddQuestionModal()" class="bg-brand-500 hover:bg-brand-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-extrabold uppercase border-none cursor-pointer shadow-sm">➕ Add</button>
        <button id="mpp-adm-anki-btn" type="button" onclick="document.getElementById('mpp-adm-anki-file').click()" class="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-[10px] font-extrabold uppercase border-none cursor-pointer shadow-sm">📥 Anki</button>
        <input type="file" id="mpp-adm-anki-file" accept=".txt,.csv" class="hidden" onchange="window.MPPAdmin.handleAnkiFile(event)">`);
}

function injectAdminModals() {
    if (document.getElementById("mpp-admin-root")) return;
    document.body.insertAdjacentHTML("beforeend", `
    <div id="mpp-admin-root">
        <!-- 1. FLOATING SELECTION TOOLKIT FOR LIVE PREVIEW -->
        <div id="mpp-floating-toolkit">
            <button type="button" class="mpp-tk-btn" style="background:#0284c7;" onclick="window.MPPAdmin.openMediaPicker()">🖼️ + Media</button>
            <button type="button" class="mpp-tk-btn" style="background:#facc15;color:#0f172a;" onclick="window.MPPAdmin.applyFormat('hl-yellow')">🖍️ Yellow</button>
            <button type="button" class="mpp-tk-btn" style="background:#4ade80;color:#0f172a;" onclick="window.MPPAdmin.applyFormat('hl-green')">Green</button>
            <button type="button" class="mpp-tk-btn" style="background:#f472b6;color:#0f172a;" onclick="window.MPPAdmin.applyFormat('hl-pink')">Pink</button>
            <button type="button" class="mpp-tk-btn" style="background:#38bdf8;color:#0f172a;" onclick="window.MPPAdmin.applyFormat('hl-blue')">Blue</button>
            <button type="button" class="mpp-tk-btn" onclick="window.MPPAdmin.applyFormat('bold')"><b>B</b></button>
            <button type="button" class="mpp-tk-btn" onclick="window.MPPAdmin.applyFormat('italic')"><i>I</i></button>
            <select onchange="if(this.value){window.MPPAdmin.applyFormat(this.value); this.value='';}" class="mpp-tk-btn">
                <option value="">Size ▾</option>
                <option value="fs-sm">Small</option><option value="fs-md">Normal</option>
                <option value="fs-lg">Large</option><option value="fs-xl">XL Heading</option>
            </select>
            <button type="button" class="mpp-tk-btn" onclick="window.MPPAdmin.editSelectedText()">✏️ Edit Text</button>
            <button type="button" class="mpp-tk-btn" onclick="window.MPPAdmin.undoPreviewEdit()">↩️ Undo</button>
            <button type="button" class="mpp-tk-btn" style="color:#f87171;" onclick="window.MPPAdmin.hideToolkit()">✕</button>
        </div>

        <!-- 2. UNIFIED 3-TAB MEDIA HUB (GOOGLE SEARCH / WIKIMEDIA + GITHUB ASSETS + PASTE URL) -->
        <div id="mpp-media-picker-modal" onclick="if(event.target===this) this.classList.add('hidden')" class="hidden fixed inset-0 z-[43000] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 w-full max-w-2xl shadow-2xl flex flex-col max-h-[92vh] text-left">
                <div class="flex justify-between items-center mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">
                    <div>
                        <h3 class="text-base font-black text-slate-900 dark:text-white m-0">🖼️ Media Hub (Google Search / GitHub Assets / URL)</h3>
                        <p id="mpp-media-anchor-info" class="text-[11px] font-bold text-sky-600 dark:text-sky-400 mt-0.5 m-0"></p>
                    </div>
                    <button type="button" onclick="document.getElementById('mpp-media-picker-modal').classList.add('hidden')" class="text-slate-400 hover:text-red-500 text-xl font-bold bg-transparent border-none cursor-pointer">&times;</button>
                </div>

                <div class="flex gap-1.5 mb-3 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                    <button type="button" data-mtab="search" onclick="window.MPPAdmin.switchMediaTab('search')" class="mpp-mtab-btn flex-1 py-2 rounded-lg text-xs font-extrabold bg-white dark:bg-slate-900 text-sky-600 shadow-sm border-none cursor-pointer">🔍 Search Google</button>
                    <button type="button" data-mtab="upload" onclick="window.MPPAdmin.switchMediaTab('upload')" class="mpp-mtab-btn flex-1 py-2 rounded-lg text-xs font-bold text-slate-500 bg-transparent border-none cursor-pointer">📤 Upload to GitHub</button>
                    <button type="button" data-mtab="url" onclick="window.MPPAdmin.switchMediaTab('url')" class="mpp-mtab-btn flex-1 py-2 rounded-lg text-xs font-bold text-slate-500 bg-transparent border-none cursor-pointer">🔗 Paste URLs</button>
                </div>

                <!-- TAB 1: GOOGLE IMAGES / VIDEOS (SERPER) + WIKIMEDIA -->
                <div id="mpp-mtab-search" class="space-y-2.5">
                    <div class="flex flex-wrap gap-1.5">
                        <input type="text" id="mpp-media-query" placeholder="e.g. Wessely ring, hypopyon, fungal corneal ulcer..." onkeydown="if(event.key==='Enter') window.MPPAdmin.searchOnlineMedia()" class="flex-1 min-w-[150px] px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold dark:text-white outline-none">
                        <select id="mpp-media-provider" class="px-2.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold dark:text-white">
                            <option value="google" selected>🌐 Google</option>
                            <option value="wikimedia">📚 Wikimedia</option>
                        </select>
                        <select id="mpp-media-type" class="px-2.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold dark:text-white">
                            <option value="image" selected>Images</option><option value="video">Videos</option><option value="audio">Audio</option>
                        </select>
                        <select id="mpp-media-limit" class="px-2 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold dark:text-white">
                            <option value="10" selected>10</option><option value="15">15</option><option value="20">20</option>
                        </select>
                        <button type="button" onclick="window.MPPAdmin.searchOnlineMedia()" class="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-extrabold border-none cursor-pointer">🔍 Search</button>
                    </div>
                    <div id="mpp-media-results-grid" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 overflow-y-auto min-h-[160px] max-h-[34vh] p-1 custom-scrollbar">
                        <div class="col-span-full text-center py-8 text-xs text-slate-400 font-semibold">Search Google Images/Videos above and tap items to multi-select.</div>
                    </div>
                    <div class="flex flex-wrap items-center justify-between gap-2">
                        <label class="flex items-center gap-2 text-[11px] font-bold text-slate-600 dark:text-slate-300 cursor-pointer">
                            <input type="checkbox" id="mpp-mirror-to-gh" class="w-3.5 h-3.5 accent-sky-500">
                            <span>Mirror selected images to GitHub Assets</span>
                        </label>
                        <div class="flex gap-2">
                            <button type="button" onclick="window.open('https://www.google.com/search?tbm=isch&q=' + encodeURIComponent(document.getElementById('mpp-media-query').value || ''), '_blank')" class="text-[10px] font-extrabold text-slate-500 hover:text-sky-500 bg-transparent border-none cursor-pointer">↗️ Google Tab</button>
                            <button type="button" onclick="window.MPPAdmin.toggleSearchKeysBox()" class="text-[10px] font-extrabold text-sky-600 dark:text-sky-400 bg-transparent border-none cursor-pointer">🔑 Search Keys</button>
                        </div>
                    </div>
                    <div id="mpp-search-keys-box" class="hidden p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2 text-[11px]">
                        <div class="font-bold text-slate-600 dark:text-slate-300">Paste free <a href="https://serper.dev" target="_blank" rel="noopener noreferrer" class="text-sky-500 underline">serper.dev</a> API key(s) (1 per line — 2,500 free Google searches/key):</div>
                        <textarea id="mpp-serper-keys-input" rows="2" placeholder="serper_api_key_1&#10;serper_api_key_2" class="w-full p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-mono dark:text-white"></textarea>
                        <button type="button" onclick="window.MPPAdmin.saveSearchSettings()" class="px-3.5 py-1.5 rounded-lg bg-sky-600 text-white text-[10px] font-extrabold border-none cursor-pointer">💾 Save Google Search Keys</button>
                    </div>
                </div>

                <!-- TAB 2: GITHUB ASSETS UPLOAD -->
                <div id="mpp-mtab-upload" class="hidden space-y-3">
                    <div onclick="document.getElementById('mpp-gh-file-input').click()"
                         ondragover="event.preventDefault(); this.classList.add('border-sky-500')"
                         ondragleave="this.classList.remove('border-sky-500')"
                         ondrop="event.preventDefault(); this.classList.remove('border-sky-500'); window.MPPAdmin.handleGitHubFileUpload(event.dataTransfer.files)"
                         class="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-6 text-center cursor-pointer hover:border-sky-400 bg-slate-50 dark:bg-slate-800/50">
                        <div class="text-3xl mb-1.5">📤</div>
                        <div class="text-xs font-extrabold text-slate-700 dark:text-slate-200">Tap or Drop Images, Audio, Video, or PDFs</div>
                        <div class="text-[10px] text-slate-400 mt-1">Photos auto-compress to WebP (max 1600px) • Queued commits to GitHub <code>assets/</code></div>
                        <input type="file" id="mpp-gh-file-input" multiple accept="image/*,audio/*,video/*,.pdf" class="hidden" onchange="window.MPPAdmin.handleGitHubFileUpload(this.files); this.value='';">
                    </div>

                    <div id="mpp-gh-upload-log" class="space-y-1.5 max-h-[22vh] overflow-y-auto custom-scrollbar"></div>

                    <details class="text-[11px] bg-slate-50 dark:bg-slate-800/70 rounded-xl p-3 border border-slate-200 dark:border-slate-700">
                        <summary class="font-extrabold text-slate-700 dark:text-slate-200 cursor-pointer">⚙️ GitHub Asset Settings (Saved only to 3-Admin Firebase Node)</summary>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2.5">
                            <input type="text" id="mpp-gh-owner" placeholder="Owner (e.g. mbbsprofsprep)" class="px-2.5 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs dark:text-white">
                            <input type="text" id="mpp-gh-repo" placeholder="Repo (e.g. MBBS-PROFS-PREP)" class="px-2.5 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs dark:text-white">
                            <input type="text" id="mpp-gh-branch" placeholder="Branch (main)" class="px-2.5 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs dark:text-white">
                            <input type="text" id="mpp-gh-folder" placeholder="Folder (assets)" class="px-2.5 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs dark:text-white">
                            <select id="mpp-gh-urlmode" class="px-2.5 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold dark:text-white">
                                <option value="raw">Instant URL (raw.githubusercontent.com)</option>
                                <option value="jsdelivr">CDN URL (cdn.jsdelivr.net)</option>
                                <option value="pages">GitHub Pages URL</option>
                            </select>
                            <input type="password" id="mpp-gh-token" placeholder="Fine-Grained PAT (github_pat_...)" class="px-2.5 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono dark:text-white">
                        </div>
                        <div class="flex gap-2 mt-2.5">
                            <button type="button" onclick="window.MPPAdmin.saveGitHubSettings()" class="px-3.5 py-1.5 rounded-lg bg-sky-600 text-white text-[10px] font-extrabold border-none cursor-pointer">💾 Save Settings</button>
                            <button type="button" onclick="window.MPPAdmin.testGitHubSettings()" class="px-3.5 py-1.5 rounded-lg bg-slate-700 text-white text-[10px] font-extrabold border-none cursor-pointer">🧪 Test Connection</button>
                        </div>
                    </details>
                </div>

                <!-- TAB 3: DIRECT URLS -->
                <div id="mpp-mtab-url" class="hidden space-y-2">
                    <label class="text-[10px] font-extrabold text-slate-500 uppercase block">Direct Media URLs (Images, MP3, MP4, YouTube, Drive — 1 per line):</label>
                    <textarea id="mpp-media-custom-urls" rows="5" placeholder="https://raw.githubusercontent.com/.../image.webp&#10;https://youtu.be/..." class="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs dark:text-white outline-none resize-y"></textarea>
                </div>

                <div class="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input type="text" id="mpp-media-label" placeholder="Caption / Gallery Title (e.g. Wessely Ring)" class="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold dark:text-white outline-none">
                        <select id="mpp-media-insert-style" class="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold dark:text-white outline-none">
                            <option value="gallery" selected>🖼️ Collapsible Inline Button ("See images (N)")</option>
                            <option value="visible">📷 Always-Visible Image / Media Block</option>
                        </select>
                    </div>
                    <div class="flex items-center justify-between gap-2">
                        <span id="mpp-media-selected-count" class="text-xs font-black text-sky-600 dark:text-sky-400">Selected: 0</span>
                        <button id="mpp-media-insert-btn" type="button" onclick="window.MPPAdmin.insertSelectedMedia(this)" class="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold border-none cursor-pointer shadow">✅ Insert Inline</button>
                    </div>
                </div>
            </div>
        </div>

        <!-- 3. UNIVERSAL ADD / EDIT QUESTION MODAL (Works on Review & Clinical) -->
        <div id="mpp-uq-modal" onclick="if(event.target===this) this.classList.add('hidden')" class="hidden fixed inset-0 z-[36000] bg-slate-900/75 backdrop-blur-sm overflow-y-auto">
            <div class="flex min-h-full items-center justify-center p-4">
                <div class="relative w-full max-w-3xl rounded-2xl bg-white dark:bg-slate-900 text-left shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col">
                    <div class="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                        <h3 id="mpp-uq-title" class="text-lg font-black text-brand-600 dark:text-brand-400 m-0">➕ Add New Question</h3>
                        <button type="button" onclick="document.getElementById('mpp-uq-modal').classList.add('hidden')" class="text-slate-400 hover:text-red-500 p-1 rounded-lg bg-slate-100 dark:bg-slate-800 border-none cursor-pointer">✕</button>
                    </div>
                    <div class="p-5 space-y-4 max-h-[82vh] overflow-y-auto custom-scrollbar">
                        <div>
                            <div class="flex justify-between items-center mb-1">
                                <label class="text-[10px] font-black text-slate-500 uppercase">Question / Case ID</label>
                                <button type="button" onclick="window.MPPAdmin.fillSuggestedId()" class="text-[10px] font-extrabold text-brand-600 dark:text-brand-400 bg-transparent border-none cursor-pointer underline">⚡ Suggest Next ID</button>
                            </div>
                            <input type="text" id="mpp-uq-id" oninput="window.MPPAdmin.checkIdAvailability()" class="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl dark:text-white font-bold text-brand-600 dark:text-brand-400 outline-none">
                            <div id="mpp-uq-id-status" class="mt-1.5 text-xs font-bold hidden"></div>
                        </div>

                        <div>
                            <div class="flex justify-between items-center mb-1">
                                <label class="text-[10px] font-black text-slate-500 uppercase">Stem / Scenario (For MCQ, add A) B) C) D) on new lines)</label>
                                <button type="button" onclick="window.MPPAdmin.openMediaPickerFor('mpp-uq-stem', '', 'upload')" class="text-[10px] font-extrabold text-sky-600 dark:text-sky-400 bg-transparent border-none cursor-pointer underline">📤 Upload / 🔍 Search Image</button>
                            </div>
                            <textarea id="mpp-uq-stem" rows="4" class="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl dark:text-white text-sm outline-none"></textarea>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
                            <div class="md:col-span-2">
                                <label class="text-[10px] font-black text-slate-500 uppercase block mb-1">Chapter / Topic (use " / " for multi)</label>
                                <input type="text" id="mpp-uq-chap" class="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl dark:text-white text-sm outline-none">
                            </div>
                            <div>
                                <label class="text-[10px] font-black text-slate-500 uppercase block mb-1">Format</label>
                                <select id="mpp-uq-type" onchange="window.MPPAdmin.toggleMcqKeyField()" class="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl dark:text-white text-sm font-bold">
                                    <option value="Theory">Theory / Case</option><option value="MCQ">MCQ</option>
                                </select>
                            </div>
                            <div id="mpp-uq-key-wrap" class="hidden">
                                <label class="text-[10px] font-black text-slate-500 uppercase block mb-1">Correct Key</label>
                                <select id="mpp-uq-key" class="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl dark:text-white text-sm font-bold text-emerald-600">
                                    <option value="">-- Key --</option><option value="A">A</option><option value="B">B</option><option value="C">C</option><option value="D">D</option><option value="E">E</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label class="text-[10px] font-black text-slate-500 uppercase block mb-1">Exam Batch / Source</label>
                            <input type="text" id="mpp-uq-batch" class="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl dark:text-white text-sm outline-none">
                        </div>

                        <div>
                            <div class="flex justify-between items-center mb-1">
                                <label class="text-[10px] font-black text-slate-500 uppercase">Model Answer / Explanation</label>
                                <button type="button" onclick="window.MPPAdmin.openMediaPickerFor('mpp-uq-ans', 'mpp-uq-ans-preview', 'upload')" class="text-[10px] font-extrabold text-sky-600 dark:text-sky-400 bg-transparent border-none cursor-pointer underline">📤 Upload / 🔍 Search Media</button>
                            </div>
                            <textarea id="mpp-uq-ans" oninput="window.MPPAdmin.refreshModalAnsPreview()" rows="5" class="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl dark:text-white text-sm outline-none"></textarea>
                            <div class="mt-2 border border-green-200 dark:border-green-900/40 rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-950">
                                <div id="mpp-uq-ans-preview" class="p-4 markdown-body text-xs max-h-56 overflow-y-auto custom-scrollbar"></div>
                            </div>
                        </div>

                        <button id="mpp-uq-save-btn" type="button" onclick="window.MPPAdmin.saveQuestionFromModal(this, false)" class="w-full py-3.5 bg-brand-500 hover:bg-brand-600 text-white font-extrabold rounded-xl text-xs uppercase tracking-wider border-none cursor-pointer shadow-lg">💾 Publish to Database</button>
                    </div>
                </div>
            </div>
        </div>

        <!-- 4. ADMIN CONTROL HUB & CLOUD VAULT MODAL -->
        <div id="mpp-control-hub-modal" onclick="if(event.target===this) this.classList.add('hidden')" class="hidden fixed inset-0 z-[36000] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 w-full max-w-2xl shadow-2xl flex flex-col max-h-[92vh] text-left">
                <div class="flex justify-between items-center mb-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div>
                        <h3 class="text-lg font-black text-slate-900 dark:text-white m-0">⚙️ Admin Control Hub &amp; Cloud Vault</h3>
                        <p id="mpp-hub-status-sub" class="text-[11px] font-bold text-sky-600 dark:text-sky-400 mt-0.5 m-0"></p>
                    </div>
                    <button type="button" onclick="document.getElementById('mpp-control-hub-modal').classList.add('hidden')" class="text-slate-400 hover:text-red-500 text-2xl font-bold bg-transparent border-none cursor-pointer">&times;</button>
                </div>

                <div class="space-y-4 overflow-y-auto pr-1 custom-scrollbar">
                    <!-- Feature Flags -->
                    <div class="p-4 rounded-xl bg-amber-50/70 dark:bg-slate-800/80 border border-amber-200 dark:border-amber-800/60 space-y-2.5">
                        <div class="text-xs font-black text-amber-800 dark:text-amber-400 uppercase">🎛️ Extend Features to Normal Users</div>
                        ${[
                            ["hub-flag-neuro", "showNeuroRecall", "🧠 Neuro-Recall 3D Flashcards"],
                            ["hub-flag-tp", "showTeenPatti", "🃏 Teen Patti & < 1/16 > Pill"],
                            ["hub-flag-pg", "showCrossExamPG", "🔥 PG Cross-Exam Cards (NEET / INI / CMS / FMGE)"],
                            ["hub-flag-cards", "showAnswerCards", "🖼️ 3D Visual Answer Cards (ans_image)"]
                        ].map(([id, flag, label]) => `
                        <div class="flex items-center justify-between pt-2 border-t border-amber-200/50 dark:border-slate-700">
                            <span class="text-xs font-bold text-slate-800 dark:text-white">${label}</span>
                            <label class="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" id="${id}" class="sr-only peer" onchange="window.MPPAdmin.toggleFlag('${flag}')">
                                <div class="w-10 h-5 bg-slate-300 dark:bg-slate-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                            </label>
                        </div>`).join("")}
                    </div>

                    <!-- AI Vision Exam Paper Scanner + JS Snippet Injector -->
                    <div class="p-4 rounded-xl bg-indigo-50/80 dark:bg-slate-800/90 border border-indigo-300 dark:border-indigo-700 space-y-2.5">
                        <div class="flex justify-between items-center flex-wrap gap-2">
                            <span class="text-xs font-black text-indigo-900 dark:text-indigo-300 uppercase">📸 AI Exam Scanner &amp; JS Snippet Injector</span>
                            <div class="flex gap-1.5">
                                <button type="button" onclick="document.getElementById('mpp-ai-keys-box').classList.toggle('hidden')" class="px-2.5 py-1 rounded-lg bg-slate-700 text-white text-[10px] font-bold border-none cursor-pointer">🔑 AI Keys</button>
                                <button type="button" onclick="window.MPPAdmin.copyArgonPrompt()" class="px-2.5 py-1 rounded-lg bg-sky-600 text-white text-[10px] font-bold border-none cursor-pointer">📋 Copy Prompt</button>
                                <button id="mpp-undo-snippet-btn" type="button" onclick="window.MPPAdmin.undoLastSnippet()" class="hidden px-2.5 py-1 rounded-lg bg-red-500 text-white text-[10px] font-bold border-none cursor-pointer">↩️ Undo</button>
                            </div>
                        </div>

                        <div id="mpp-ai-keys-box" class="hidden p-3 rounded-xl bg-slate-900 text-white space-y-2">
                            <textarea id="mpp-ai-keys-input" rows="2" placeholder="Paste Gemini API keys (1 per line, rotates on quota)" class="w-full p-2 rounded-lg bg-slate-800 border border-slate-700 text-xs font-mono text-white"></textarea>
                            <div class="flex gap-2">
                                <input id="mpp-ai-model-input" value="gemini-2.5-flash" class="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs font-mono text-sky-400">
                                <button type="button" onclick="window.MPPAdmin.saveAIConfig()" class="px-3 py-1.5 rounded-lg bg-sky-500 text-white text-xs font-bold border-none cursor-pointer">💾 Save</button>
                            </div>
                        </div>

                        <div class="flex flex-wrap gap-2 items-center">
                            <input type="text" id="mpp-snippet-target" placeholder="college/SUBJECT (e.g. deoghar/PATHOLOGY_ED8)" class="flex-1 min-w-[160px] px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-bold dark:text-white">
                            <select id="mpp-snippet-mode" class="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-bold dark:text-white">
                                <option value="auto-number">Auto-Number</option><option value="merge">Merge by QID</option>
                            </select>
                            <input type="file" id="mpp-ai-scan-input" accept="image/*,application/pdf" multiple class="hidden" onchange="window.MPPAdmin.scanExamPaperFiles(this.files); this.value='';">
                            <button type="button" onclick="document.getElementById('mpp-ai-scan-input').click()" class="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-[11px] font-extrabold border-none cursor-pointer">📤 Scan Paper</button>
                        </div>

                        <div id="mpp-ai-scan-status" class="hidden text-[11px] font-bold text-sky-600 dark:text-sky-400"></div>
                        <textarea id="mpp-snippet-textarea" rows="5" placeholder='{ q: "DGT115", type: "Theory", stem: "<b>[LAQ]</b> ...", ans_key: "", chapter: "General", examBatch: "2024 Batch" },' class="w-full p-2.5 rounded-xl bg-white dark:bg-slate-950 border border-indigo-200 dark:border-slate-700 font-mono text-[11px] dark:text-emerald-300 outline-none resize-y"></textarea>
                        <button type="button" onclick="window.MPPAdmin.injectSnippetToFirebase(this)" class="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs uppercase border-none cursor-pointer shadow">🚀 Inject &amp; Append Snippet to Firebase</button>
                    </div>

                    <!-- Sync Current Subject / GitHub JSON -> Firebase -->
                    <div class="p-3.5 rounded-xl bg-sky-50/80 dark:bg-slate-800/80 border border-sky-200 dark:border-sky-800/60 space-y-2">
                        <div class="text-xs font-black text-sky-900 dark:text-sky-300 uppercase">☁️ Sync Subject to Firebase Cloud Vault</div>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <button type="button" onclick="window.MPPAdmin.syncFromGitHubToFirebase(this)" class="py-2.5 px-3 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-extrabold text-xs border-none cursor-pointer shadow-sm">
                                🐙 Sync GitHub JSON → Firebase
                            </button>
                            <button type="button" onclick="window.MPPAdmin.syncCurrentPageToFirebase(this)" class="py-2.5 px-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-extrabold text-xs border-none cursor-pointer shadow-sm">
                                ⚡ Sync Loaded Page → Firebase
                            </button>
                        </div>
                    </div>

                    <!-- Bulk JSON Upload + Export + Cache -->
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div class="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-slate-800/70 border border-emerald-200 dark:border-slate-700 space-y-2">
                            <div class="text-xs font-black text-slate-800 dark:text-white">📦 Bulk Upload .JSON File(s)</div>
                            <input type="file" id="mpp-bulk-json-input" multiple accept=".json,.txt" class="hidden" onchange="window.MPPAdmin.handleBulkJsonFiles(this.files); this.value='';">
                            <button type="button" onclick="document.getElementById('mpp-bulk-json-input').click()" class="w-full py-2 rounded-xl bg-emerald-600 text-white font-extrabold text-xs border-none cursor-pointer">📂 Select JSON File(s)</button>
                            <div id="mpp-bulk-json-log" class="hidden text-[10px] font-mono bg-slate-900 text-emerald-400 p-2 rounded-lg max-h-28 overflow-y-auto"></div>
                        </div>
                        <div class="p-3.5 rounded-xl bg-sky-50/70 dark:bg-slate-800/70 border border-sky-200 dark:border-slate-700 space-y-2">
                            <div class="text-xs font-black text-slate-800 dark:text-white">⬇️ Export &amp; Local Cache</div>
                            <button type="button" onclick="window.MPPAdmin.downloadCurrentBankJSON()" class="w-full py-2 rounded-xl bg-sky-500 text-white font-extrabold text-xs border-none cursor-pointer">📥 Download JSON (Firebase First)</button>
                            <button type="button" onclick="window.MPPAdmin.forceRefreshCache()" class="w-full py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs border-none cursor-pointer">🔄 Clear Cache &amp; Reload</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- 5. DYNAMIC SUBJECT VERSION MANAGER (index.html Long-Press Popup) -->
        <div id="mpp-version-editor-modal" onclick="if(event.target===this) this.classList.add('hidden')" class="hidden fixed inset-0 z-[37000] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl p-6 w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh] text-left">
                <div class="flex justify-between items-center mb-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div>
                        <h3 class="text-lg font-black text-slate-900 dark:text-white m-0">📚 Manage Subject Versions</h3>
                        <p id="mpp-ver-modal-sub" class="text-xs font-bold text-sky-600 dark:text-sky-400 mt-0.5 m-0"></p>
                    </div>
                    <button type="button" onclick="document.getElementById('mpp-version-editor-modal').classList.add('hidden')" class="text-slate-400 hover:text-red-500 text-2xl font-bold bg-transparent border-none cursor-pointer">&times;</button>
                </div>
                <div id="mpp-ver-rows" class="space-y-3 overflow-y-auto pr-1 max-h-[50vh] custom-scrollbar"></div>
                <button type="button" onclick="window.MPPAdmin.addVersionRow()" class="mt-4 w-full py-2.5 rounded-xl border-2 border-dashed border-sky-400 text-sky-600 dark:text-sky-400 font-extrabold text-xs bg-transparent cursor-pointer">➕ Add another version</button>
                <div class="flex gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <button type="button" onclick="document.getElementById('mpp-version-editor-modal').classList.add('hidden')" class="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs border-none cursor-pointer">Cancel</button>
                    <button type="button" id="mpp-ver-save-btn" onclick="window.MPPAdmin.saveSubjectVersions()" class="flex-1 py-3 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-extrabold text-xs border-none cursor-pointer shadow">💾 Save Live</button>
                </div>
            </div>
        </div>

        <!-- 6. TEEN PATTI MULTI-TOPIC CROSS-LINKER MODAL -->
        <div id="mpp-crosslink-modal" onclick="if(event.target===this) this.classList.add('hidden')" class="hidden fixed inset-0 z-[37000] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 w-full max-w-md shadow-2xl flex flex-col max-h-[90vh] text-left">
                <div class="flex justify-between items-center mb-2">
                    <h3 class="text-base font-black text-slate-900 dark:text-white m-0">🔗 Multi-Topic &amp; MedPYQ Linker</h3>
                    <button type="button" onclick="document.getElementById('mpp-crosslink-modal').classList.add('hidden')" class="text-slate-400 hover:text-red-500 text-xl font-bold bg-transparent border-none cursor-pointer">&times;</button>
                </div>
                <div class="flex justify-between items-center gap-2 mb-3">
                    <span id="mpp-cl-sub" class="text-[11px] font-bold text-slate-500"></span>
                    <button type="button" id="mpp-cl-bridge-btn" onclick="window.MPPAdmin.connectMedPYQBridge()" class="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-300 cursor-pointer">⚡ MedPYQ Bridge</button>
                </div>
                <div id="mpp-cl-chips" class="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto p-1.5 mb-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700"></div>
                <label class="text-[10px] font-extrabold text-slate-500 uppercase mb-1 block">One Topic Per Line (Topic Name: DGT1, DGM17, N27...)</label>
                <textarea id="mpp-cl-input" rows="4" class="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold dark:text-white mb-3 outline-none"></textarea>
                <div class="flex gap-2 mb-3">
                    <button type="button" onclick="document.getElementById('mpp-crosslink-modal').classList.add('hidden')" class="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs border-none cursor-pointer">Cancel</button>
                    <button id="mpp-cl-save-btn" type="button" onclick="window.MPPAdmin.saveCrossLinks()" class="flex-1 py-2.5 rounded-xl bg-sky-500 text-white font-extrabold text-xs border-none cursor-pointer">Apply &amp; Sync</button>
                </div>
                <div id="mpp-cl-history" class="border-t border-slate-200 dark:border-slate-800 pt-2 space-y-1.5 overflow-y-auto max-h-32"></div>
            </div>
        </div>
    </div>`);
}

// ============================================================================
// 3. LIVE PREVIEW VISUAL TOOLKIT (Highlight, Bold, Italic, Font Size, Text Edit)
// ============================================================================
export function attachPreviewVisualToolbar(previewEl, textareaId) {
    if (!isUserAdmin() || !previewEl || !textareaId) return;
    if (previewEl.dataset.toolkitBound === textareaId) return;
    previewEl.dataset.toolkitBound = textareaId;
    previewEl.dataset.textareaId = textareaId;

    const barId = `visual-bar-${previewEl.id}`;
    if (!document.getElementById(barId)) {
        previewEl.insertAdjacentHTML("beforebegin", `
        <div id="${barId}" class="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-sky-50 dark:bg-slate-800/80 border-b border-sky-100 dark:border-slate-700 text-[11px]">
            <label class="flex items-center gap-2 font-extrabold text-sky-700 dark:text-sky-400 cursor-pointer">
                <input type="checkbox" checked onchange="window.MPPAdmin.toggleVisualMode('${previewEl.id}', this.checked)" class="w-3.5 h-3.5 accent-sky-500">
                <span>✨ Visual Edit Mode (Select text for Toolkit)</span>
            </label>
            <div class="flex gap-1.5">
                <button type="button" onclick="window.MPPAdmin.openMediaPickerFor('${textareaId}', '${previewEl.id}', 'search')" class="px-2.5 py-1 rounded-lg bg-sky-500 text-white font-bold text-[10px] border-none cursor-pointer">🖼️ + Media</button>
                <button type="button" onclick="window.MPPAdmin.undoPreviewEdit('${textareaId}', '${previewEl.id}')" class="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-bold text-[10px] cursor-pointer">↩️ Undo</button>
            </div>
        </div>`);
    }
    previewEl.classList.add("mpp-visual-edit-active");
    previewEl.dataset.visualMode = "on";
}

function bindPreviewSelectionToolkit() {
    const checkSelection = () => {
        if (!isUserAdmin()) return;
        const sel = window.getSelection();
        if (!sel || sel.isCollapsed) return;
        const text = sel.toString().trim();
        if (text.length < 2) return;

        const node = sel.anchorNode?.nodeType === 1 ? sel.anchorNode : sel.anchorNode?.parentElement;
        const pv = node?.closest?.('[data-visual-mode="on"]');
        if (!pv?.dataset.textareaId) return;

        const rect = sel.getRangeAt(0).getBoundingClientRect();
        toolkitCtx = { textareaId: pv.dataset.textareaId, previewId: pv.id, selectedText: text, anchorText: text };
        const tk = document.getElementById("mpp-floating-toolkit");
        if (!tk) return;
        tk.style.display = "flex";
        const w = tk.offsetWidth || 340, h = tk.offsetHeight || 48;
        tk.style.left = `${Math.max(10, Math.min(window.innerWidth - w - 10, rect.left + rect.width / 2 - w / 2))}px`;
        tk.style.top = `${Math.max(10, rect.top - h - 10 < 10 ? rect.bottom + 10 : rect.top - h - 10)}px`;
    };
    document.addEventListener("mouseup", () => setTimeout(checkSelection, 25));
    document.addEventListener("touchend", () => setTimeout(checkSelection, 120));
}

function replaceInMarkdown(md, needle, replacer) {
    const idx = md.indexOf(needle);
    if (idx !== -1) return md.slice(0, idx) + replacer(needle) + md.slice(idx + needle.length);
    const rx = new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "[\\s*_`]+"));
    return rx.test(md) ? md.replace(rx, m => replacer(m)) : null;
}

function applyMarkdownEdit(textareaId, previewId, nextMd) {
    const ta = document.getElementById(textareaId);
    const pv = document.getElementById(previewId);
    if (!ta) return;
    if (!previewUndoMap.has(textareaId)) previewUndoMap.set(textareaId, []);
    const stack = previewUndoMap.get(textareaId);
    stack.push(ta.value);
    if (stack.length > 15) stack.shift();

    ta.value = nextMd;
    ta.dispatchEvent(new Event("input", { bubbles: true }));
    if (pv) pv.innerHTML = renderContent(nextMd);
}

// ============================================================================
// 4. SAFE LONG-PRESS HELPER (Scroll-safe >10px, blocks accidental click)
// ============================================================================
export function bindSafeLongPress(el, callback, ms = 500) {
    if (!el || !isUserAdmin()) return;
    let timer = null, sx = 0, sy = 0;
    const clear = () => { if (timer) { clearTimeout(timer); timer = null; } };
    const start = (x, y) => {
        clear(); sx = x; sy = y;
        timer = setTimeout(() => {
            el.dataset.lpFired = String(Date.now());
            if (navigator.vibrate) navigator.vibrate(35);
            callback();
        }, ms);
    };
    const move = (x, y) => { if (Math.hypot(x - sx, y - sy) > 10) clear(); };

    el.addEventListener("touchstart", e => e.touches[0] && start(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
    el.addEventListener("touchmove", e => e.touches[0] && move(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
    el.addEventListener("touchend", clear);
    el.addEventListener("mousedown", e => e.button === 0 && start(e.clientX, e.clientY));
    el.addEventListener("mousemove", e => move(e.clientX, e.clientY));
    el.addEventListener("mouseup", clear);
    el.addEventListener("mouseleave", clear);
    el.addEventListener("contextmenu", e => { e.preventDefault(); clear(); el.dataset.lpFired = String(Date.now()); callback(); });
}

// ============================================================================
// 5. LAZY SORTABLEJS & DECK LONG-PRESS BULK DELETE
// ============================================================================
function attachTableSortable(tbody) {
    if (!isUserAdmin() || !tbody) return;
    if (!window.Sortable) {
        if (!sortableLoading) {
            sortableLoading = true;
            const s = document.createElement("script");
            s.src = "https://cdn.jsdelivr.net/npm/sortablejs@1.15.0/Sortable.min.js";
            s.onload = () => attachTableSortable(document.getElementById("tableBody"));
            document.head.appendChild(s);
        }
        return;
    }

    if (window.tableSortable) { try { window.tableSortable.destroy(); } catch (_) {} }
    window.tableSortable = new window.Sortable(tbody, {
        animation: 150,
        handle: ".drag-handle",
        ghostClass: "sortable-ghost",
        onEnd: async (evt) => {
            if (evt.oldIndex === evt.newIndex) return;
            const qb = getQB();
            const f = qb?.filters;
            const filtered = Boolean(f?.search || f?.savedOnly || f?.attempt !== "all" || f?.types.size || f?.chapters.size || f?.exams.size);
            if (filtered) {
                alert("Clear search & filters before reordering.");
                window.QBankEngine?.refreshUI();
                return;
            }
            try {
                const res = await reorderQuestion(evt.oldIndex, evt.newIndex, qb.qnaData, qb.curriculumData);
                if (res) { qb.qnaData = res.qnaData; qb.curriculumData = res.curriculumData; window.QBankEngine?.reload(); }
            } catch (err) {
                alert("Reorder failed: " + err.message);
                window.QBankEngine?.refreshUI();
            }
        }
    });
}

function initDeckBulkSelectLongPress() {
    let timer = null;
    const clear = () => { if (timer) { clearTimeout(timer); timer = null; } };

    document.addEventListener("touchstart", (e) => {
        if (!isUserAdmin() || e.target.closest(".tp-patti, .mpp-cluster-pill, #mpp-admin-root")) return;
        const card = e.target.closest(".question-card");
        if (!card?.dataset.qid) return;
        timer = setTimeout(() => toggleBulkSelect(card.dataset.qid, card), 600);
    }, { passive: true });
    document.addEventListener("touchend", clear, { passive: true });
    document.addEventListener("touchmove", clear, { passive: true });
}

function toggleBulkSelect(qid, card) {
    if (bulkSelectedQids.has(qid)) {
        bulkSelectedQids.delete(qid);
        if (card) card.style.outline = "";
    } else {
        bulkSelectedQids.add(qid);
        if (card) card.style.outline = "3px solid #ef4444";
    }
    let bar = document.getElementById("mpp-bulk-del-bar");
    if (!bar) {
        bar = document.createElement("div");
        bar.id = "mpp-bulk-del-bar";
        bar.className = "fixed bottom-5 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-red-500 flex items-center gap-3 z-[41000] text-xs";
        document.body.appendChild(bar);
    }
    if (!bulkSelectedQids.size) { bar.style.display = "none"; return; }
    bar.style.display = "flex";
    bar.innerHTML = `<span>🗑️ <b>${bulkSelectedQids.size}</b> selected</span>
        <button type="button" onclick="window.MPPAdmin.executeBulkDelete()" class="px-3 py-1.5 bg-red-600 text-white rounded-lg font-bold border-none cursor-pointer">Delete</button>
        <button type="button" onclick="window.MPPAdmin.clearBulkSelect()" class="px-3 py-1.5 bg-slate-700 text-slate-200 rounded-lg font-bold border-none cursor-pointer">Cancel</button>`;
}

// ============================================================================
// 6. MEDPYQ SECONDARY FIREBASE BRIDGE (Session Persists via Firebase Auth)
// ============================================================================
function initMedPYQBridgeSilent() {
    try {
        const cfg = {
            apiKey: "AIzaSyAp8tKgVyc6PC-yt0Nv4nOOtH8B8jCaSYE",
            authDomain: "medpyq-elearning.firebaseapp.com",
            databaseURL: "https://medpyq-elearning-default-rtdb.firebaseio.com",
            projectId: "medpyq-elearning"
        };
        const app = getApps().find(a => a.name === "MedPYQBridge") || initializeApp(cfg, "MedPYQBridge");
        medpyqAuth = getAuth(app);
        medpyqDb = getDatabase(app);
        medpyqAuth.onAuthStateChanged(u => {
            if (u) preloadMedPYQSubjectBank();
        });
    } catch (_) {}
}

async function preloadMedPYQSubjectBank() {
    const qb = getQB();
    if (!qb || !medpyqDb || !medpyqAuth?.currentUser) return;
    const exams = [["neet-pg", "N"], ["inicet", "IN"], ["upsc-cms", "CMS"], ["fmge", "F"]];
    await Promise.all(exams.map(async ([ex, pfx]) => {
        const snap = await get(ref(medpyqDb, `question_banks/${ex}/${qb.bridgeSlug}`)).catch(() => null);
        if (!snap?.exists()) return;
        const arr = (Array.isArray(snap.val()) ? snap.val() : Object.values(snap.val())).filter(Boolean);
        arr.forEach((item, i) => {
            const rawId = String(item.q || `${pfx}${i + 1}`).trim();
            const up = rawId.toUpperCase();
            const num = up.match(/(\d+)$/)?.[1] || String(i + 1);
            const rec = {
                q: rawId, type: "MCQ", stem: String(item.stem || ""),
                options: Array.isArray(item.options) ? item.options.map(String) : ["A", "B", "C", "D"],
                ans_key: String(item.ans_key || "A"),
                chapter: Array.isArray(item.topic) ? item.topic : [item.topic || ex.toUpperCase()],
                examBatch: `${item.exam || ex.toUpperCase()} ${item.year_paper || ""}`.trim(),
                explanation: String(item.explanation || ""),
                img: item.img || null, examKey: ex
            };
            qb.tp.externalLookup[up] = rec;
            qb.tp.externalLookup[`${pfx}${num}`] = rec;
            if (rec.explanation) qb.liveAnswers[rawId] = { text: rec.explanation };
        });
    }));
}

// ============================================================================
// 7. 777 SECRET MODAL & AI SCANNER HELPERS
// ============================================================================
function openSecretCodeModal() {
    if (!isUserAdmin()) return;
    showModal(
        "Admin Quick Execute",
        `<p class="mb-2">Enter code (<code>777calm</code> = Download JSON, <code>777pankaj</code> = Copy AI Prompt):</p>
         <input id="mpp-secret-input" type="text" class="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:text-white outline-none">`,
        `<button type="button" onclick="window.MPPAdmin.runSecretCode()" class="px-5 py-2.5 bg-brand-500 text-white rounded-xl font-bold text-xs border-none cursor-pointer">Execute</button>`,
        "☕"
    );
}

function getNextIdPair() {
    const list = getQB()?.qnaData || [];
    let maxT = 0, maxM = 0;
    let pfxT = "DGT", pfxM = "DGM";
    list.forEach(it => {
        const mt = String(it.q).match(/^([A-Z]*T)(\d+)$/i);
        const mm = String(it.q).match(/^([A-Z]*M)(\d+)$/i);
        if (mt) { pfxT = mt[1].toUpperCase(); maxT = Math.max(maxT, parseInt(mt[2], 10)); }
        if (mm) { pfxM = mm[1].toUpperCase(); maxM = Math.max(maxM, parseInt(mm[2], 10)); }
    });
    return { pfxT, pfxM, nextT: maxT + 1, nextM: maxM + 1 };
}

function buildTranscriberPrompt() {
    const qb = getQB();
    const { pfxT, pfxM, nextT, nextM } = getNextIdPair();
    const chaps = Array.from(new Set((qb?.qnaData || []).flatMap(q => Array.isArray(q.chapter) ? q.chapter : [q.chapter]).filter(Boolean)));
    return `Transcribe all medical exam questions into raw JS object lines (no markdown fences, no outer array):
Theory schema: { q: "${pfxT}${nextT}", type: "Theory", stem: "<b>[LAQ]</b> Question text... <b>(8 Marks)</b>", ans_key: "", chapter: "Chapter", examBatch: "2024 Batch Prof" },
MCQ schema: { q: "${pfxM}${nextM}", type: "MCQ", stem: "Stem...", options: ["A", "B", "C", "D"], ans_key: "A", chapter: "Chapter", examBatch: "2024 Batch Prof" },
Start Theory at ${pfxT}${nextT} and MCQ at ${pfxM}${nextM}. Valid chapters: ${JSON.stringify(chaps.slice(0, 60))}`;
}

function parseSnippet(rawText) {
    let cleaned = String(rawText || "").trim()
        .replace(/^```(?:javascript|js|json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    if (cleaned.startsWith("[") && cleaned.endsWith("]")) cleaned = cleaned.slice(1, -1).trim();
    const fn = new Function(`"use strict"; return [\n${cleaned}\n];`);
    const res = fn();
    const arr = (Array.isArray(res) && res.length === 1 && Array.isArray(res[0])) ? res[0] : res;
    return arr.filter(Boolean).map((item, i) => ({
        ...item,
        q: String(item.q || `Q${i + 1}`).trim(),
        type: String(item.type || (item.options ? "MCQ" : "Theory")),
        stem: String(item.stem ?? "").trim(),
        ans_key: String(item.ans_key ?? "").trim().toUpperCase(),
        chapter: typeof item.chapter === "string" && item.chapter.includes(" / ")
            ? item.chapter.split(" / ").map(s => s.trim()).filter(Boolean)
            : (item.chapter || "General"),
        examBatch: item.examBatch || "Prof Exam",
        ...(item.options ? { options: (Array.isArray(item.options) ? item.options : Object.values(item.options)).map(String) } : {})
    }));
}

// ============================================================================
// 8. PUBLIC ADMIN API (window.MPPAdmin — Exists ONLY for the 3 Admins)
// ============================================================================
window.MPPAdmin = {
    attachPreviewVisualToolbar,
    bindSafeLongPress,
    attachTableSortable,

    // --- Visual Preview Toolkit ---
    toggleVisualMode(pvId, on) {
        const pv = document.getElementById(pvId);
        if (!pv) return;
        pv.dataset.visualMode = on ? "on" : "off";
        pv.classList.toggle("mpp-visual-edit-active", on);
        if (!on) this.hideToolkit();
    },

    hideToolkit() {
        const tk = document.getElementById("mpp-floating-toolkit");
        if (tk) tk.style.display = "none";
    },

    applyFormat(type) {
        if (!toolkitCtx) return;
        const { textareaId, previewId, selectedText } = toolkitCtx;
        const ta = document.getElementById(textareaId);
        if (!ta || !selectedText) return;

        const map = {
            "hl-yellow": s => `<mark class="hl-yellow">${s}</mark>`,
            "hl-green":  s => `<mark class="hl-green">${s}</mark>`,
            "hl-pink":   s => `<mark class="hl-pink">${s}</mark>`,
            "hl-blue":   s => `<mark class="hl-blue">${s}</mark>`,
            bold:        s => `**${s}**`,
            italic:      s => `*${s}*`,
            "fs-sm":     s => `<span class="fs-sm">${s}</span>`,
            "fs-md":     s => `<span class="fs-md">${s}</span>`,
            "fs-lg":     s => `<span class="fs-lg">${s}</span>`,
            "fs-xl":     s => `<span class="fs-xl">${s}</span>`
        };
        const next = replaceInMarkdown(ta.value, selectedText, map[type]);
        if (!next) return alert("Select a shorter single-line phrase to format.");
        applyMarkdownEdit(textareaId, previewId, next);
        this.hideToolkit();
    },

    editSelectedText() {
        if (!toolkitCtx) return;
        const { textareaId, previewId, selectedText } = toolkitCtx;
        const ta = document.getElementById(textareaId);
        if (!ta) return;
        const rep = prompt("Edit selected text:", selectedText);
        if (rep === null || rep === selectedText) return;
        const next = replaceInMarkdown(ta.value, selectedText, () => rep);
        if (!next) return alert("Could not locate exact text in Markdown.");
        applyMarkdownEdit(textareaId, previewId, next);
        this.hideToolkit();
    },

    undoPreviewEdit(taOverride, pvOverride) {
        const taId = taOverride || toolkitCtx?.textareaId;
        const pvId = pvOverride || toolkitCtx?.previewId;
        const stack = previewUndoMap.get(taId);
        if (!stack?.length) return alert("Nothing to undo.");
        const prev = stack.pop();
        const ta = document.getElementById(taId);
        const pv = document.getElementById(pvId);
        if (ta) { ta.value = prev; ta.dispatchEvent(new Event("input", { bubbles: true })); }
        if (pv) pv.innerHTML = renderContent(prev);
        this.hideToolkit();
    },

    // --- 3-Tab Media Hub (Google Search / Wikimedia + GitHub Upload + URLs) ---
    openMediaPickerFor(textareaId, previewId = "", defaultTab = "search") {
        const sel = window.getSelection()?.toString()?.trim() || "";
        toolkitCtx = { textareaId, previewId, selectedText: sel, anchorText: sel };
        this.openMediaPicker(defaultTab);
    },

    async openMediaPicker(defaultTab = "search") {
        if (!toolkitCtx) return;
        this.hideToolkit();
        queuedMediaUrls.clear();
        searchResults = [];

        const anchor = toolkitCtx.anchorText || "";
        document.getElementById("mpp-media-anchor-info").textContent = anchor
            ? `Inserts inline right after: "${anchor.slice(0, 60)}"`
            : "Appends inline at the end (or select a phrase first to anchor it).";
        document.getElementById("mpp-media-query").value = anchor.replace(/[().,:;]/g, "").trim();
        document.getElementById("mpp-media-label").value = anchor.replace(/[().,:;]/g, "").trim() || "Reference Images";
        document.getElementById("mpp-media-custom-urls").value = "";
        document.getElementById("mpp-gh-upload-log").innerHTML = "";
        document.getElementById("mpp-media-selected-count").textContent = "Selected: 0";
        document.getElementById("mpp-media-results-grid").innerHTML = `<div class="col-span-full text-center py-8 text-xs text-slate-400 font-semibold">Search Google Images/Videos above and tap items to multi-select.</div>`;
        document.getElementById("mpp-media-picker-modal").classList.remove("hidden");

        try {
            const sCfg = await getGoogleSearchConfig();
            const provEl = document.getElementById("mpp-media-provider");
            if (provEl && sCfg.provider) provEl.value = sCfg.provider;
        } catch (_) {}

        await this.switchMediaTab(defaultTab);
        if (defaultTab === "search" && anchor.length >= 3) this.searchOnlineMedia();
    },

    async switchMediaTab(tab) {
        ["search", "upload", "url"].forEach(t => {
            document.getElementById(`mpp-mtab-${t}`)?.classList.toggle("hidden", t !== tab);
        });
        document.querySelectorAll(".mpp-mtab-btn").forEach(btn => {
            const act = btn.dataset.mtab === tab;
            btn.className = act
                ? "mpp-mtab-btn flex-1 py-2 rounded-lg text-xs font-extrabold bg-white dark:bg-slate-900 text-sky-600 shadow-sm border-none cursor-pointer"
                : "mpp-mtab-btn flex-1 py-2 rounded-lg text-xs font-bold text-slate-500 bg-transparent border-none cursor-pointer";
        });
        if (tab === "upload") {
            const cfg = await getGitHubAssetConfig();
            document.getElementById("mpp-gh-owner").value = cfg.owner || "";
            document.getElementById("mpp-gh-repo").value = cfg.repo || "";
            document.getElementById("mpp-gh-branch").value = cfg.branch || "main";
            document.getElementById("mpp-gh-folder").value = cfg.folder || "assets";
            document.getElementById("mpp-gh-urlmode").value = cfg.urlMode || "raw";
            document.getElementById("mpp-gh-token").value = cfg.token || "";
        }
    },

    async toggleSearchKeysBox() {
        const box = document.getElementById("mpp-search-keys-box");
        if (!box) return;
        const opening = box.classList.contains("hidden");
        box.classList.toggle("hidden");
        if (opening) {
            const cfg = await getGoogleSearchConfig();
            document.getElementById("mpp-serper-keys-input").value = (cfg.serperKeys || []).join("\n");
        }
    },

    async saveSearchSettings() {
        try {
            const res = await saveGoogleSearchConfig({
                provider: document.getElementById("mpp-media-provider")?.value || "google",
                rawSerperKeys: document.getElementById("mpp-serper-keys-input")?.value || ""
            });
            document.getElementById("mpp-search-keys-box")?.classList.add("hidden");
            alert(`✅ Saved ${res.serperKeys.length} Google Search (Serper) key(s) securely.`);
        } catch (err) { alert(err.message); }
    },

    async saveGitHubSettings() {
        try {
            await saveGitHubAssetConfig({
                owner: document.getElementById("mpp-gh-owner").value,
                repo: document.getElementById("mpp-gh-repo").value,
                branch: document.getElementById("mpp-gh-branch").value,
                folder: document.getElementById("mpp-gh-folder").value,
                urlMode: document.getElementById("mpp-gh-urlmode").value,
                token: document.getElementById("mpp-gh-token").value
            });
            alert("✅ GitHub Asset settings saved securely (3-Admin-Only node).");
        } catch (err) { alert(err.message); }
    },

    async testGitHubSettings() {
        try {
            const res = await testGitHubConnection({
                owner: document.getElementById("mpp-gh-owner").value.trim(),
                repo: document.getElementById("mpp-gh-repo").value.trim(),
                token: document.getElementById("mpp-gh-token").value.trim()
            });
            alert(res.warning ? `⚠️ Connected with warning: ${res.warning}` : `✅ Connected! Default branch: ${res.defaultBranch}`);
        } catch (err) { alert("❌ Connection failed: " + err.message); }
    },

    async searchOnlineMedia() {
        const q = document.getElementById("mpp-media-query")?.value?.trim();
        const provider = document.getElementById("mpp-media-provider")?.value || "google";
        const mediaType = document.getElementById("mpp-media-type")?.value || "image";
        const limit = Number(document.getElementById("mpp-media-limit")?.value || 10);
        const grid = document.getElementById("mpp-media-results-grid");
        if (!q || !grid) return;

        if (!document.getElementById("mpp-media-label").value.trim()) document.getElementById("mpp-media-label").value = q;
        const engineLabel = provider === "google" ? "Google Search" : "Wikimedia Commons";
        grid.innerHTML = `<div class="col-span-full text-center py-8 text-xs font-bold text-sky-500 animate-pulse">Searching ${engineLabel} for "${escapeHtml(q)}"...</div>`;

        try {
            searchResults = provider === "google"
                ? await searchGoogleSerperMedia(q, { limit, mediaType })
                : await searchWikimediaMedia(q, { limit, mediaType });

            if (!searchResults.length) {
                grid.innerHTML = `<div class="col-span-full text-center py-8 text-xs text-amber-500 font-bold">No results found on ${engineLabel}. Try another keyword or switch provider.</div>`;
                return;
            }

            grid.innerHTML = searchResults.map((m, idx) => {
                const isSel = queuedMediaUrls.has(m.full);
                const preview = m.thumb
                    ? `<div class="relative"><img src="${escapeHtml(m.thumb)}" referrerpolicy="no-referrer" alt="${escapeHtml(m.title)}" loading="lazy" class="w-full h-24 object-cover">${m.isVideo ? `<span class="absolute bottom-1 right-1 bg-black/75 text-white text-[9px] font-black px-1.5 py-0.5 rounded">▶ VIDEO</span>` : ""}</div>`
                    : `<div class="w-full h-24 flex items-center justify-center text-3xl bg-slate-100 dark:bg-slate-800">${mediaType === "audio" ? "🔊" : "🎬"}</div>`;
                return `<div onclick="window.MPPAdmin.toggleSearchPick(${idx}, this)" class="mpp-media-card ${isSel ? "selected" : ""}">
                    <span class="mpp-media-badge">${idx + 1}</span>${preview}
                    <div class="p-1.5 text-[10px] font-semibold text-slate-600 dark:text-slate-300 truncate">${escapeHtml(m.title)}</div>
                </div>`;
            }).join("");
        } catch (err) {
            grid.innerHTML = `<div class="col-span-full text-center py-6 px-3 text-xs text-red-500 font-bold">${escapeHtml(err.message)}</div>`;
        }
    },

    toggleSearchPick(idx, el) {
        const item = searchResults[idx];
        if (!item) return;
        if (queuedMediaUrls.has(item.full)) { queuedMediaUrls.delete(item.full); el.classList.remove("selected"); }
        else { queuedMediaUrls.add(item.full); el.classList.add("selected"); }
        document.getElementById("mpp-media-selected-count").textContent = `Selected: ${queuedMediaUrls.size}`;
    },

    async handleGitHubFileUpload(fileList) {
        if (!fileList?.length) return;
        const log = document.getElementById("mpp-gh-upload-log");
        for (const file of Array.from(fileList)) {
            const rowId = "ghup-" + Math.random().toString(36).slice(2, 9);
            log.insertAdjacentHTML("beforeend", `<div id="${rowId}" class="flex justify-between items-center p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"><span class="truncate font-bold dark:text-white">⏳ ${escapeHtml(file.name)}</span><span class="pct font-mono font-black text-sky-500">0%</span></div>`);
            const row = document.getElementById(rowId);
            try {
                const res = await uploadFileToGitHub(file, {
                    onProgress: pct => { if (row?.querySelector(".pct")) row.querySelector(".pct").textContent = `${pct}%`; }
                });
                queuedMediaUrls.add(res.url);
                if (row) row.innerHTML = `<span class="truncate font-bold text-emerald-600 dark:text-emerald-400">✅ ${escapeHtml(res.name)} (${res.sizeKB} KB)</span><span class="text-[10px] font-black text-emerald-500">Ready</span>`;
                document.getElementById("mpp-media-selected-count").textContent = `Selected: ${queuedMediaUrls.size}`;
            } catch (err) {
                if (row) row.innerHTML = `<span class="text-red-500 font-bold">❌ ${escapeHtml(file.name)}: ${escapeHtml(err.message)}</span>`;
            }
        }
    },

    async insertSelectedMedia(btn) {
        if (!toolkitCtx) return;
        const { textareaId, previewId, anchorText } = toolkitCtx;
        const ta = document.getElementById(textareaId);
        if (!ta) return;

        const custom = (document.getElementById("mpp-media-custom-urls")?.value || "")
            .split(/\n+/).map(u => u.trim()).filter(u => /^https?:\/\/|^assets\//i.test(u));
        let urls = [...Array.from(queuedMediaUrls), ...custom];
        if (!urls.length) return alert("Select, upload, or paste at least one media item.");

        const label = (document.getElementById("mpp-media-label")?.value || "Reference Images").replace(/[\|\]]/g, "").trim();
        const mirror = Boolean(document.getElementById("mpp-mirror-to-gh")?.checked);

        if (mirror) {
            const orig = btn.textContent;
            btn.disabled = true; btn.textContent = "⏳ Mirroring to GitHub...";
            try {
                const mirrored = [];
                for (const u of urls) {
                    if (/raw\.githubusercontent\.com|cdn\.jsdelivr\.net|github\.io|youtu\.?be|vimeo\.com/i.test(u)) {
                        mirrored.push(u);
                        continue;
                    }
                    const hit = searchResults.find(r => r.full === u);
                    if (hit?.isVideo) { mirrored.push(u); continue; }
                    try {
                        const m = await mirrorImageUrlToGitHub(u, label, hit?.thumb || "");
                        mirrored.push(m.url);
                    } catch (_) {
                        mirrored.push(u); // Fallback to original Google image URL if source blocks CORS
                    }
                }
                urls = mirrored;
            } finally {
                btn.disabled = false; btn.textContent = orig;
            }
        }

        const style = document.getElementById("mpp-media-insert-style")?.value || "gallery";
        const insertion = style === "visible"
            ? "\n" + urls.map((u, i) => /\.(mp3|wav|m4a|mp4|webm|ogg|pdf)(\?|$)|youtu\.?be|drive\.google/i.test(u)
                ? `[${label}${urls.length > 1 ? ` ${i + 1}` : ""}](${u})`
                : `![${label}${urls.length > 1 ? ` ${i + 1}` : ""}](${u})`).join("\n") + "\n"
            : ` [[gallery:${label}|${urls.join("|")}]]`;

        const next = anchorText
            ? (replaceInMarkdown(ta.value, anchorText, m => `${m}${insertion}`) || `${ta.value.trimEnd()}${insertion}`)
            : `${ta.value.trimEnd()}${insertion}`;
        applyMarkdownEdit(textareaId, previewId, next);
        document.getElementById("mpp-media-picker-modal").classList.add("hidden");
    },

    // --- Universal Add / Edit / Delete Question Modal ---
    getNextAvailableId(base = "") {
        const qb = getQB();
        const existing = new Set((qb?.qnaData || []).map(x => String(x.q).toUpperCase()));
        const isClin = qb?.mode === "clinical";
        let prefix = isClin ? `${qb.subjectCode}-` : (document.getElementById("mpp-uq-type")?.value === "MCQ" ? getNextIdPair().pfxM : getNextIdPair().pfxT);
        let pad = isClin ? 3 : 0;

        if (base.trim()) {
            const m = base.trim().match(/^(.*?)(\d+)$/);
            if (m) { prefix = m[1]; pad = m[2].length; } else prefix = base.trim();
        }
        const rx = new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\d+)$`, "i");
        let max = 0;
        (qb?.qnaData || []).forEach(it => { const m = String(it.q).match(rx); if (m) max = Math.max(max, parseInt(m[1], 10)); });
        let n = max + 1;
        let cand = `${prefix}${pad ? String(n).padStart(pad, "0") : n}`;
        while (existing.has(cand.toUpperCase())) { n++; cand = `${prefix}${pad ? String(n).padStart(pad, "0") : n}`; }
        return cand;
    },

    fillSuggestedId() {
        const inp = document.getElementById("mpp-uq-id");
        inp.value = this.getNextAvailableId(inp.value);
        this.checkIdAvailability();
    },

    checkIdAvailability() {
        const val = document.getElementById("mpp-uq-id")?.value?.trim();
        const st = document.getElementById("mpp-uq-id-status");
        const editId = document.getElementById("mpp-uq-save-btn")?.getAttribute("data-edit-id");
        if (!st) return;
        if (!val) { st.classList.add("hidden"); return; }
        const found = (getQB()?.qnaData || []).find(x => String(x.q).toLowerCase() === val.toLowerCase());
        st.classList.remove("hidden");
        if (found && (!editId || editId.toLowerCase() !== val.toLowerCase())) {
            const nxt = this.getNextAvailableId(val);
            st.className = "mt-1.5 text-xs font-bold text-amber-600 flex justify-between bg-amber-50 dark:bg-amber-900/20 px-3 py-1.5 rounded-lg border border-amber-200";
            st.innerHTML = `<span>⚠️ "${escapeHtml(found.q)}" already exists!</span><button type="button" onclick="document.getElementById('mpp-uq-id').value='${escapeHtml(nxt)}'; window.MPPAdmin.checkIdAvailability();" class="underline font-extrabold bg-transparent border-none cursor-pointer text-amber-700">Use ${escapeHtml(nxt)}</button>`;
        } else {
            st.className = "mt-1.5 text-xs font-bold text-emerald-600 px-1";
            st.textContent = `✅ "${val}" is available.`;
        }
    },

    toggleMcqKeyField() {
        document.getElementById("mpp-uq-key-wrap")?.classList.toggle("hidden", document.getElementById("mpp-uq-type")?.value !== "MCQ");
    },

    refreshModalAnsPreview() {
        const pv = document.getElementById("mpp-uq-ans-preview");
        if (pv) pv.innerHTML = renderContent(document.getElementById("mpp-uq-ans")?.value || "");
    },

    openAddQuestionModal() {
        requireAdmin();
        const isClin = getQB()?.mode === "clinical";
        const btn = document.getElementById("mpp-uq-save-btn");
        btn.removeAttribute("data-edit-id");
        btn.textContent = "💾 Publish to Database";
        document.getElementById("mpp-uq-title").textContent = `➕ Add New ${isClin ? "Clinical Case" : "Question"}`;
        document.getElementById("mpp-uq-type").value = "Theory";
        document.getElementById("mpp-uq-id").value = this.getNextAvailableId();
        document.getElementById("mpp-uq-stem").value = "";
        document.getElementById("mpp-uq-chap").value = "";
        document.getElementById("mpp-uq-key").value = "";
        document.getElementById("mpp-uq-batch").value = isClin ? "Clinical Wards" : "";
        document.getElementById("mpp-uq-ans").value = "";
        this.toggleMcqKeyField(); this.checkIdAvailability(); this.refreshModalAnsPreview();
        document.getElementById("mpp-uq-modal").classList.remove("hidden");
        attachPreviewVisualToolbar(document.getElementById("mpp-uq-ans-preview"), "mpp-uq-ans");
    },

    openEditQuestionModal(qId) {
        requireAdmin();
        const qb = getQB();
        const q = window.QBankEngine?.findQuestionByQid(qId);
        if (!q) return;
        let stem = q.stem || "";
        if (q.type === "MCQ" && Array.isArray(q.options)) {
            stem += "\n" + q.options.map((o, i) => `\n${["A", "B", "C", "D", "E"][i] || "-"}) ${o}`).join("");
        }
        const btn = document.getElementById("mpp-uq-save-btn");
        btn.setAttribute("data-edit-id", q.q);
        btn.textContent = "💾 Update in Database";
        document.getElementById("mpp-uq-title").textContent = `✏️ Edit ${q.q}`;
        document.getElementById("mpp-uq-id").value = q.q;
        document.getElementById("mpp-uq-stem").value = stem;
        document.getElementById("mpp-uq-chap").value = Array.isArray(q.chapter) ? q.chapter.join(" / ") : (q.chapter || "");
        document.getElementById("mpp-uq-type").value = q.type || "Theory";
        document.getElementById("mpp-uq-key").value = q.ans_key || "";
        document.getElementById("mpp-uq-batch").value = Array.isArray(q.examBatch) ? q.examBatch.join(", ") : (q.examBatch || "");
        document.getElementById("mpp-uq-ans").value = qb?.liveAnswers?.[q.q]?.text || "";
        this.toggleMcqKeyField(); this.checkIdAvailability(); this.refreshModalAnsPreview();
        document.getElementById("mpp-uq-modal").classList.remove("hidden");
        attachPreviewVisualToolbar(document.getElementById("mpp-uq-ans-preview"), "mpp-uq-ans");
    },

    async saveQuestionFromModal(btn, force = false) {
        requireAdmin();
        const qb = getQB();
        const editId = btn.getAttribute("data-edit-id");
        const rawId = document.getElementById("mpp-uq-id").value.trim();
        const rawStem = document.getElementById("mpp-uq-stem").value.trim();
        const chapRaw = document.getElementById("mpp-uq-chap").value.trim() || "General";
        const type = document.getElementById("mpp-uq-type").value;
        const ans_key = document.getElementById("mpp-uq-key").value.trim().toUpperCase();
        const examBatch = document.getElementById("mpp-uq-batch").value.trim();
        const answer = document.getElementById("mpp-uq-ans").value.trim();
        if (!rawStem) return alert("Stem is required.");

        const qId = rawId || editId || this.getNextAvailableId();
        const exists = (qb?.qnaData || []).find(x => String(x.q).toLowerCase() === qId.toLowerCase());
        if (exists && (!editId || editId.toLowerCase() !== qId.toLowerCase()) && !force) {
            const nxt = this.getNextAvailableId(qId);
            if (confirm(`ID "${exists.q}" already exists!\nClick OK to save as ${nxt}, or Cancel to edit manually.`)) {
                document.getElementById("mpp-uq-id").value = nxt;
                return this.saveQuestionFromModal(btn, true);
            }
            return;
        }

        let stem = rawStem, options = null;
        if (type === "MCQ") {
            const m = rawStem.match(/(.*?)(?:<br\s*\/?>|\n|^)A\)\s*(.*?)(?:<br\s*\/?>|\n)B\)\s*(.*?)(?:<br\s*\/?>|\n)C\)\s*(.*?)(?:<br\s*\/?>|\n)D\)\s*(.*)/is);
            if (m) { stem = m[1].trim(); options = [m[2], m[3], m[4], m[5]].map(x => x.trim()); }
        }
        const chapter = chapRaw.includes(" / ") ? chapRaw.split(" / ").map(s => s.trim()).filter(Boolean) : chapRaw;

        const orig = btn.textContent;
        btn.disabled = true; btn.textContent = "⏳ Saving...";
        try {
            const res = await saveQuestion({ qId, editId, stem, options, ans_key, chapter, type, examBatch, answer }, qb.qnaData, qb.curriculumData);
            document.getElementById("mpp-uq-modal").classList.add("hidden");
            if (res) window.QBankEngine?.reload();
        } catch (err) { alert("Save failed: " + err.message); }
        finally { btn.disabled = false; btn.textContent = orig; }
    },

    async confirmDeleteQuestion(qId) {
        requireAdmin();
        if (!confirm(`Permanently delete "${qId}"?`)) return;
        const qb = getQB();
        const res = await deleteQuestion(qId, qb.qnaData, qb.curriculumData);
        if (res) window.QBankEngine?.reload();
    },

    async executeBulkDelete() {
        requireAdmin();
        if (!bulkSelectedQids.size || !confirm(`Delete ${bulkSelectedQids.size} selected item(s)?`)) return;
        const qb = getQB();
        const res = await deleteQuestionsBulk(bulkSelectedQids, qb.qnaData, qb.curriculumData);
        this.clearBulkSelect();
        if (res) window.QBankEngine?.reload();
    },

    clearBulkSelect() {
        bulkSelectedQids.clear();
        document.querySelectorAll(".question-card").forEach(c => c.style.outline = "");
        const bar = document.getElementById("mpp-bulk-del-bar");
        if (bar) bar.style.display = "none";
    },

    // --- Anki Importer ---
    async handleAnkiFile(ev) {
        requireAdmin();
        const file = ev.target.files?.[0];
        if (!file) return;
        const qb = getQB();
        const topic = prompt("Topic / Chapter for Anki import:", "General");
        if (topic === null) { ev.target.value = ""; return; }
        const prefix = prompt("Question ID Prefix:", `${qb?.subjectCode || "SUB"}-ANKI`);
        if (prefix === null) { ev.target.value = ""; return; }
        let num = parseInt(prompt("Starting number:", "1"), 10) || 1;

        const existing = new Set((qb?.qnaData || []).map(x => String(x.q).toUpperCase()));
        const text = await file.text();
        const items = [];

        for (const line of text.split("\n")) {
            if (!line.trim()) continue;
            let parts = line.split(";");
            if (parts.length < 2) parts = line.split("\t");
            if (parts.length < 2) continue;
            const front = parts[0].trim().replace(/&#59;/g, ";");
            const back = parts.slice(1).join(";").trim().replace(/&#59;/g, ";");
            let stem = front.replace(/<br\s*\/?>/gi, "\n").trim(), options = null, ans_key = "", type = "Theory";
            let answer = back.replace(/<br\s*\/?>/gi, "\n").trim();

            const m = front.match(/(.*?)(?:<br\s*\/?>|\n|^)A\)\s*(.*?)(?:<br\s*\/?>|\n)B\)\s*(.*?)(?:<br\s*\/?>|\n)C\)\s*(.*?)(?:<br\s*\/?>|\n)D\)\s*(.*)/is);
            if (m) {
                type = "MCQ"; stem = m[1].trim().replace(/<br\s*\/?>/gi, "\n");
                options = [m[2], m[3], m[4], m[5]].map(o => o.trim().replace(/<br\s*\/?>/gi, "\n"));
                const am = back.match(/(?:<b>)?Correct Answer:\s*([A-E])(?:<\/b>)?/i);
                if (am) {
                    ans_key = am[1].toUpperCase();
                    answer = back.replace(/(?:<b.*?>)?Correct Answer:\s*[A-E](?:<\/b>)?(?:<br\s*\/?>|\n)*/i, "").replace(/<br\s*\/?>/gi, "\n").trim();
                }
            }
            let qId = `${prefix.trim()}-${num}`;
            while (existing.has(qId.toUpperCase())) { num++; qId = `${prefix.trim()}-${num}`; }
            existing.add(qId.toUpperCase()); num++;
            items.push({ q: qId, type, stem, options, ans_key, chapter: topic.trim() || "General", answer });
        }
        ev.target.value = "";
        if (!items.length) return alert("No valid Anki rows found.");
        const res = await importAnkiBatch(items, qb.qnaData, qb.curriculumData);
        alert(`✅ Imported ${res.count} Anki cards!`);
        if (res.bank) window.QBankEngine?.reload();
    },

    // --- Control Hub, GitHub Sync, AI Scanner, Snippet Injector & Bulk JSON ---
    async openControlHub() {
        requireAdmin();
        const { college, subjectKey } = getVaultKeys();
        const f = MPPStore.featureFlags;
        document.getElementById("mpp-hub-status-sub").textContent = `Active Target: ${college}/${subjectKey} (${getQB()?.dataSourceTag || "Portal"})`;
        document.getElementById("hub-flag-neuro").checked = Boolean(f.showNeuroRecall);
        document.getElementById("hub-flag-tp").checked = Boolean(f.showTeenPatti);
        document.getElementById("hub-flag-pg").checked = Boolean(f.showCrossExamPG);
        document.getElementById("hub-flag-cards").checked = Boolean(f.showAnswerCards);
        document.getElementById("mpp-snippet-target").value = `${college}/${subjectKey}`;

        const aiSnap = await get(ref(db, "settings/ai_config")).catch(() => null);
        if (aiSnap?.exists()) {
            const v = aiSnap.val();
            document.getElementById("mpp-ai-keys-input").value = (v.apiKeys || []).join("\n");
            document.getElementById("mpp-ai-model-input").value = v.model || "gemini-2.5-flash";
        }
        document.getElementById("mpp-control-hub-modal").classList.remove("hidden");
    },

    async toggleFlag(flagName) {
        requireAdmin();
        await toggleGlobalFeatureFlag(flagName, MPPStore.featureFlags[flagName]);
    },

    async saveAIConfig() {
        requireAdmin();
        const apiKeys = document.getElementById("mpp-ai-keys-input").value.split(/[\n,]+/).map(k => k.trim()).filter(k => k.length > 10);
        const model = document.getElementById("mpp-ai-model-input").value.trim() || "gemini-2.5-flash";
        await set(ref(db, "settings/ai_config"), { apiKeys, model, updatedAt: Date.now() });
        document.getElementById("mpp-ai-keys-box").classList.add("hidden");
        alert(`✅ Saved ${apiKeys.length} Gemini key(s) securely.`);
    },

    async copyArgonPrompt() {
        await navigator.clipboard?.writeText(buildTranscriberPrompt());
        alert("✅ Master exam transcriber prompt copied!");
    },

    async scanExamPaperFiles(fileList) {
        requireAdmin();
        const files = Array.from(fileList || []);
        if (!files.length) return;
        const statusEl = document.getElementById("mpp-ai-scan-status");
        statusEl.classList.remove("hidden");
        statusEl.textContent = `⏳ Preparing ${files.length} file(s)...`;

        try {
            const aiSnap = await get(ref(db, "settings/ai_config"));
            const cfg = aiSnap.val() || {};
            if (!cfg.apiKeys?.length) throw new Error("Add at least one Gemini API key via '🔑 AI Keys' first.");

            const parts = [{ text: buildTranscriberPrompt() }];
            for (const f of files) {
                const b64 = await new Promise((res, rej) => {
                    const r = new FileReader();
                    r.onload = () => res(String(r.result).split(",")[1]);
                    r.onerror = rej;
                    r.readAsDataURL(f);
                });
                parts.push({ inline_data: { mime_type: f.type || "image/jpeg", data: b64 } });
            }

            let output = "";
            for (let i = 0; i < cfg.apiKeys.length; i++) {
                statusEl.textContent = `⏳ Scanning via ${cfg.model || "gemini-2.5-flash"} (Key #${i + 1}/${cfg.apiKeys.length})...`;
                const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(cfg.model || "gemini-2.5-flash")}:generateContent?key=${encodeURIComponent(cfg.apiKeys[i])}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ contents: [{ role: "user", parts }], generationConfig: { temperature: 0.15, maxOutputTokens: 65536 } })
                });
                if (res.ok) {
                    const d = await res.json();
                    output = (d.candidates?.[0]?.content?.parts || []).map(p => p.text || "").join("\n").trim();
                    break;
                }
                if (i === cfg.apiKeys.length - 1) throw new Error(`Gemini HTTP ${res.status}`);
            }

            const ta = document.getElementById("mpp-snippet-textarea");
            ta.value = ta.value.trim() ? `${ta.value.trim()}\n\n${output}` : output;
            statusEl.textContent = "✅ Transcribed! Review below and click Inject.";
        } catch (err) {
            statusEl.textContent = `❌ ${err.message}`;
        }
    },

    async injectSnippetToFirebase(btn) {
        requireAdmin();
        const raw = document.getElementById("mpp-snippet-textarea").value;
        if (!raw.trim()) return alert("Paste a JS snippet first.");
        const target = document.getElementById("mpp-snippet-target").value.trim();
        const mode = document.getElementById("mpp-snippet-mode").value;
        let { college, subjectKey } = getVaultKeys();
        if (target.includes("/")) { [college, subjectKey] = target.split("/").map(s => s.trim()); }

        const items = parseSnippet(raw);
        if (!items.length) return alert("No valid objects found.");

        const orig = btn.textContent;
        btn.disabled = true; btn.textContent = "⏳ Merging...";
        try {
            const snap = await get(ref(db, `question_banks/${college.toLowerCase()}/${subjectKey.toUpperCase()}`)).catch(() => null);
            const existing = snap?.exists() ? sanitizeBankPayload(snap.val(), college) : { collegeName: `AIIMS ${college.toUpperCase()}`, curriculumData: [], qnaData: [] };
            lastSnippetBackup = { college: college.toLowerCase(), subjectKey: subjectKey.toUpperCase(), snapshot: JSON.parse(JSON.stringify(existing)) };
            document.getElementById("mpp-undo-snippet-btn").classList.remove("hidden");

            const finalQna = [...existing.qnaData];
            if (mode === "auto-number") {
                let { pfxT, pfxM, nextT, nextM } = getNextIdPair();
                items.forEach(it => { it.q = it.type === "MCQ" ? `${pfxM}${nextM++}` : `${pfxT}${nextT++}`; finalQna.push(it); });
            } else {
                const idxMap = new Map(finalQna.map((q, i) => [String(q.q).toUpperCase(), i]));
                items.forEach(it => {
                    const up = String(it.q).toUpperCase();
                    if (idxMap.has(up)) finalQna[idxMap.get(up)] = { ...finalQna[idxMap.get(up)], ...it };
                    else finalQna.push(it);
                });
            }

            const upRes = await uploadFullBank(college, subjectKey, { ...existing, qnaData: finalQna });
            document.getElementById("mpp-snippet-textarea").value = "";
            alert(`🎉 Injected ${items.length} questions! Total in ${college}/${upRes.normSubKey}: ${upRes.count}`);
            window.QBankEngine?.reload();
        } catch (err) { alert("Injection failed: " + err.message); }
        finally { btn.disabled = false; btn.textContent = orig; }
    },

    async undoLastSnippet() {
        requireAdmin();
        if (!lastSnippetBackup || !confirm("Restore bank to state before last snippet injection?")) return;
        await uploadFullBank(lastSnippetBackup.college, lastSnippetBackup.subjectKey, lastSnippetBackup.snapshot);
        lastSnippetBackup = null;
        document.getElementById("mpp-undo-snippet-btn").classList.add("hidden");
        alert("✅ Restored!");
        window.QBankEngine?.reload();
    },

    async syncFromGitHubToFirebase(btn) {
        requireAdmin();
        const orig = btn.textContent;
        btn.disabled = true; btn.textContent = "⏳ Fetching GitHub JSON...";
        try {
            const res = await syncGitHubJsonToFirebase();
            alert(`✅ Synced ${res.count} questions from GitHub (${res.matchedFile}) → Firebase (${res.college}/${res.normSubKey})!`);
            window.QBankEngine?.reload();
        } catch (err) {
            alert("❌ GitHub Sync Failed: " + err.message);
        } finally {
            btn.disabled = false; btn.textContent = orig;
        }
    },

    async syncCurrentPageToFirebase(btn) {
        requireAdmin();
        const qb = getQB();
        const orig = btn.textContent;
        btn.disabled = true; btn.textContent = "⏳ Syncing Page...";
        try {
            const res = await syncLoadedPageToFirebase(qb?.qnaData || [], qb?.curriculumData || []);
            alert(`✅ Synced ${res.count} questions (${res.matchedFile}) → Firebase (${res.college}/${res.normSubKey})!`);
            window.QBankEngine?.reload();
        } catch (err) {
            alert("❌ Sync Failed: " + err.message);
        } finally {
            btn.disabled = false; btn.textContent = orig;
        }
    },

    async handleBulkJsonFiles(files) {
        requireAdmin();
        const log = document.getElementById("mpp-bulk-json-log");
        log.classList.remove("hidden"); log.innerHTML = "";
        for (const f of Array.from(files || [])) {
            try {
                const json = JSON.parse(await f.text());
                const clean = f.name.replace(/\s*\(\d+\)\s*/g, "").replace(/\.(json|txt)$/i, "");
                const ver = clean.match(/(?:^|_|-)(ed\d+)(?:_|-|$)/i)?.[1]?.toUpperCase() || "";
                const m = clean.replace(/(?:^|_|-)(?:ed\d+|standard)(?=_|-|$)/gi, "").replace(/_data.*$/i, "").match(/^([a-z0-9-]+?)_aiims_([a-z0-9-]+?)$/i);
                let { college, subjectKey } = getVaultKeys();
                if (m) {
                    let sub = m[1].toUpperCase();
                    if (sub === "PATHO") sub = "PATHOLOGY";
                    if (sub === "MICRO") sub = "MICROBIOLOGY";
                    college = m[2].toLowerCase();
                    subjectKey = ver ? `${sub}_${ver}` : sub;
                }
                const info = await uploadFullBank(college, subjectKey, json);
                log.insertAdjacentHTML("beforeend", `<div>✅ ${escapeHtml(f.name)} → ${college}/${info.normSubKey} (${info.count} Qs)</div>`);
            } catch (err) {
                log.insertAdjacentHTML("beforeend", `<div class="text-red-400">❌ ${escapeHtml(f.name)}: ${escapeHtml(err.message)}</div>`);
            }
        }
        window.QBankEngine?.reload();
    },

    async downloadCurrentBankJSON() {
        requireAdmin();
        const { loaded, source, fileName } = await exportFirebaseFirstBank();
        if (!loaded) return alert("Could not load question bank to export.");
        const blob = new Blob([JSON.stringify(loaded, null, 2)], { type: "application/json" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob); a.download = fileName; a.click();
        showModal("Export Complete", `<p>Downloaded <code>${escapeHtml(fileName)}</code> (${loaded.qnaData.length} Qs) from <b>${escapeHtml(source)}</b>.</p>`, "", "📥");
    },

    async forceRefreshCache() {
        await clearLocalBankCache();
        window.location.reload();
    },

    runSecretCode() {
        const val = (document.getElementById("mpp-secret-input")?.value || "").trim().toLowerCase();
        closeModal();
        if (val === "777calm" || val === "777call") this.downloadCurrentBankJSON();
        else if (val === "777pankaj") this.copyArgonPrompt();
    },

    // --- Dynamic Subject Version Manager (index.html) ---
    openVersionEditor(instId, instName, yearId, yearName, subObj, currentVersions) {
        requireAdmin();
        versionModalState = { instId, yearId, subObj };
        document.getElementById("mpp-ver-modal-sub").textContent = `${instName} • ${yearName} • ${subObj.name}`;
        const list = Array.isArray(currentVersions) && currentVersions.length
            ? currentVersions
            : [{ label: "Standard Chapterwise PYQ", versionCode: "", visible: true }];
        document.getElementById("mpp-ver-rows").innerHTML = list.map((r, i) => buildVerRow(r, i)).join("");
        document.getElementById("mpp-version-editor-modal").classList.remove("hidden");
    },

    addVersionRow() {
        const c = document.getElementById("mpp-ver-rows");
        c.insertAdjacentHTML("beforeend", buildVerRow({ label: "", versionCode: "", visible: true }, c.querySelectorAll(".mpp-ver-row").length));
    },

    async saveSubjectVersions() {
        requireAdmin();
        if (!versionModalState) return;
        const { instId, yearId, subObj } = versionModalState;
        const rows = Array.from(document.querySelectorAll("#mpp-ver-rows .mpp-ver-row"));
        const seen = new Set(), versions = [];
        for (const r of rows) {
            const label = r.querySelector(".ver-label").value.trim();
            if (!label) continue;
            const code = r.querySelector(".ver-code").value.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
            if (seen.has(code)) return alert(`Duplicate version code "${code || "standard"}".`);
            seen.add(code);
            versions.push({ label, versionCode: code, visible: Boolean(r.querySelector(".ver-visible").checked) });
        }
        await set(ref(db, `portal_config/subject_versions/${instId}/${yearId}/${subObj.id}`), versions.length ? versions : null);
        document.getElementById("mpp-version-editor-modal").classList.add("hidden");
    },

    // --- Teen Patti Multi-Topic Cross-Linker ---
    openCrossLinkModal(qid) {
        requireAdmin();
        const qb = getQB();
        if (!qb) return;
        crossLinkAnchorQid = String(qid).trim();
        const up = crossLinkAnchorQid.toUpperCase();
        const lines = (qb.tp.nodeTopics[up] || []).map(s => {
            const c = qb.tp.clusters[s];
            return c ? (c.title !== "Linked Concept" ? `${c.title}: ${c.qids.join(", ")}` : c.qids.join(", ")) : "";
        }).filter(Boolean);
        if (!lines.length) lines.push((qb.tp.nodes[up] || [crossLinkAnchorQid]).join(", "));

        document.getElementById("mpp-cl-sub").textContent = `${qb.subjectCode} • QID: ${crossLinkAnchorQid}`;
        document.getElementById("mpp-cl-input").value = lines.join("\n");
        document.getElementById("mpp-cl-chips").innerHTML = Object.values(qb.tp.clusters).map(c =>
            `<button type="button" onclick="window.MPPAdmin.appendTopicChip('${escapeHtml(c.slug)}')" class="px-2 py-0.5 rounded-full bg-sky-50 dark:bg-slate-700 text-sky-700 dark:text-sky-300 border border-sky-200 text-[10px] font-extrabold cursor-pointer">➕ ${escapeHtml(c.title)} (${c.qids.length})</button>`
        ).join("") || `<span class="text-[10px] text-slate-400">No sub-topics yet.</span>`;

        document.getElementById("mpp-cl-history").innerHTML = (qb.tp.history || []).map((h, i) =>
            `<div class="flex justify-between items-center text-[10px] bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded">
                <span class="truncate font-bold dark:text-slate-200">${escapeHtml(h.summaryText || "Edit")}</span>
                <button type="button" onclick="window.MPPAdmin.undoCrossLink(${i})" class="text-red-500 font-extrabold bg-transparent border-none cursor-pointer">Undo</button>
            </div>`
        ).join("");
        document.getElementById("mpp-crosslink-modal").classList.remove("hidden");
    },

    appendTopicChip(slug) {
        const c = getQB()?.tp.clusters[slug];
        const inp = document.getElementById("mpp-cl-input");
        if (!c || !inp) return;
        const list = [...c.qids];
        if (!list.some(x => x.toUpperCase() === crossLinkAnchorQid.toUpperCase())) list.push(crossLinkAnchorQid);
        inp.value = `${inp.value.trim()}\n${c.title}: ${list.join(", ")}`.trim();
    },

    async connectMedPYQBridge() {
        requireAdmin();
        if (!medpyqAuth) return;
        const email = prompt("MedPYQ Admin Email:", MPPStore.user?.email || "");
        if (!email) return;
        const pass = prompt(`MedPYQ Password for ${email}:`);
        if (!pass) return;
        try {
            await signInWithEmailAndPassword(medpyqAuth, email.trim(), pass);
            await preloadMedPYQSubjectBank();
            alert("✅ MedPYQ Bridge connected! Session persists automatically in this browser.");
        } catch (err) { alert("MedPYQ Bridge error: " + err.message); }
    },

    async saveCrossLinks() {
        requireAdmin();
        const qb = getQB();
        if (!qb || !crossLinkAnchorQid) return;
        const lines = document.getElementById("mpp-cl-input").value.split("\n").map(l => l.trim()).filter(Boolean);
        const updates = {};
        const summary = [];

        lines.forEach(line => {
            const ci = line.indexOf(":");
            const title = ci !== -1 ? (line.slice(0, ci).trim() || "Linked Concept") : "Linked Concept";
            const qids = (ci !== -1 ? line.slice(ci + 1) : line).split(",").map(s => s.trim()).filter(Boolean);
            if (qids.length < 2) return;
            const slug = "topic-" + title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
            updates[`clusters/${slug}`] = { slug, title, qids };
            qids.forEach(q => {
                const up = q.toUpperCase();
                const prev = Array.from(new Set([...(qb.tp.nodeTopics[up] || []), slug]));
                updates[`node_topics/${up}`] = prev;
                updates[`nodes/${up}`] = qids;
            });
            summary.push(`${title} (${qids.join(", ")})`);
        });

        updates.history = [{ timestamp: Date.now(), anchorQid: crossLinkAnchorQid, summaryText: summary.join(" | ") || "Updated", prevClusters: qb.tp.clusters }, ...(qb.tp.history || [])].slice(0, 10);
        await update(ref(db, `cross_links/${qb.bridgeSlug}`), updates);
        if (medpyqAuth?.currentUser && medpyqDb) await update(ref(medpyqDb, `cross_links/${qb.bridgeSlug}`), updates).catch(() => {});
        document.getElementById("mpp-crosslink-modal").classList.add("hidden");
    },

    async undoCrossLink(idx) {
        requireAdmin();
        const qb = getQB();
        const entry = qb?.tp.history?.[idx];
        if (!entry?.prevClusters) return;
        await set(ref(db, `cross_links/${qb.bridgeSlug}/clusters`), entry.prevClusters);
        document.getElementById("mpp-crosslink-modal").classList.add("hidden");
    }
};

function buildVerRow(opt, idx) {
    return `
    <div class="mpp-ver-row p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
        <div class="flex justify-between items-center text-[10px]">
            <span class="font-black text-slate-400 uppercase">Version #${idx + 1}</span>
            <div class="flex items-center gap-3">
                <label class="font-bold text-slate-600 dark:text-slate-300 cursor-pointer flex items-center gap-1"><input type="checkbox" class="ver-visible accent-emerald-500" ${opt.visible !== false ? "checked" : ""}> Visible</label>
                <button type="button" onclick="this.closest('.mpp-ver-row').remove()" class="text-red-500 font-bold bg-transparent border-none cursor-pointer">🗑️ Remove</button>
            </div>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <input type="text" class="ver-label sm:col-span-2 px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold dark:text-white" value="${escapeHtml(opt.label || "")}" placeholder="Label (e.g. Chapterwise PYQ (Marrow Ed 8))">
            <input type="text" class="ver-code px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-sky-600 dark:text-sky-400" value="${escapeHtml(opt.versionCode || "")}" placeholder="Code (blank=std, ed8)">
        </div>
    </div>`;
}
