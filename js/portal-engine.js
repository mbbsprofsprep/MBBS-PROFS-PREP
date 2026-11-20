// ============================================================================
// js/portal-engine.js
// Centralized Portal Engine for index.html:
// - Institutes -> Years -> Subjects -> Resources / Dynamic Subject Versions
// - Admin-Only Long-Press & Gear Button to Edit/Add Versions Live
// - VIP PDF Library Drawer, 3D Helix Background & Global Search
// ============================================================================
import {
    INSTITUTES,
    YEARS,
    SUBJECTS_BY_YEAR,
    DEFAULT_SUBJECT_VERSIONS,
    buildReviewUrl,
    buildClinicalUrl
} from "./subject-registry.js";
import { db, MPPStore, isUserAdmin, onStoreChange, ref, onValue } from "./core-firebase.js";
import { escapeHtml } from "./content-renderer.js";
import { initUIShell } from "./ui-shell.js";

const PDF_SMART_DB = {
    "AIIMS Deoghar": {
        "Pathology": "https://drive.google.com/file/d/1QROuWBHkNNGVsSlBBrWuW0BuKW87m79Y/preview",
        "CFM": "https://docs.google.com/document/d/1FxoWgI71WdNPrM8WSf1yAPPeeZhT4f9KuGvwaY779mE/edit?usp=drivesdk",
        "SURGERY": "https://docs.google.com/document/d/1xOOvLClxYhTLBGol8mxJBU0d8p7AO5V4dACoxn3o0Nc/edit?usp=drivesdk"
    }
};

let cloudVersions = {};

const state = {
    view: "institutes", // "institutes" | "years" | "subjects" | "resources"
    inst: null,
    year: null,
    sub: null
};

function getSubjectVersions(instId, yearId, subId) {
    const cloud = cloudVersions?.[instId]?.[yearId]?.[subId];
    if (Array.isArray(cloud) && cloud.length > 0) return cloud;
    const def = DEFAULT_SUBJECT_VERSIONS?.[instId]?.[yearId]?.[subId];
    return Array.isArray(def) ? def : null;
}

// ============================================================================
// 1. SUBJECT VERSION PICKER MODAL
// ============================================================================
function openSubjectVersionModal(title, options) {
    const modal = document.getElementById("subjectVersionModal");
    const card = document.getElementById("subjectVersionCard");
    const titleEl = document.getElementById("subjectVersionTitle");
    const optsEl = document.getElementById("subjectVersionOptions");
    if (!modal || !optsEl) return;

    if (titleEl) titleEl.textContent = title || "Select Version";
    optsEl.innerHTML = options.map(opt => `
        <a href="${escapeHtml(opt.url)}" class="block w-full p-4 text-left bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-700 dark:text-slate-200 hover:border-brand-500 transition-colors shadow-sm no-underline flex items-center justify-between">
            <span>${escapeHtml(opt.label)}</span>
            <span class="text-brand-500">↗</span>
        </a>`).join("");

    modal.classList.remove("hidden");
    setTimeout(() => {
        modal.classList.remove("opacity-0");
        card?.classList.remove("scale-95");
    }, 10);
}

function closeSubjectVersionModal() {
    const modal = document.getElementById("subjectVersionModal");
    const card = document.getElementById("subjectVersionCard");
    if (!modal) return;
    modal.classList.add("opacity-0");
    card?.classList.add("scale-95");
    setTimeout(() => modal.classList.add("hidden"), 250);
}

// ============================================================================
// 2. VIEW RENDERING & NAVIGATION
// ============================================================================
function toggleView(viewId) {
    ["institutes", "years", "subjects", "resources"].forEach(v => {
        const el = document.getElementById(`view-${v}`);
        if (!el) return;
        el.classList.toggle("hidden", v !== viewId);
        if (v === viewId) el.classList.add("animate-fade-in");
        else el.classList.remove("animate-fade-in");
    });
}

function updateBreadcrumbs() {
    const bc = document.getElementById("breadcrumbs");
    if (!bc) return;
    if (state.view === "institutes") {
        bc.classList.add("hidden");
        return;
    }
    bc.classList.remove("hidden");
    const instEl = document.getElementById("bc-institute");
    const slash1 = document.getElementById("bc-slash-1");
    const yearEl = document.getElementById("bc-year");

    if (instEl && state.inst) {
        instEl.textContent = state.inst.name;
        instEl.onclick = () => portalApp.goToYears(state.inst.id, state.inst.name);
    }
    const showYear = state.view === "subjects" || state.view === "resources";
    slash1?.classList.toggle("hidden", !showYear);
    yearEl?.classList.toggle("hidden", !showYear);
    if (showYear && yearEl && state.year) {
        yearEl.textContent = state.year.name;
        yearEl.onclick = () => portalApp.goToSubjects(state.year.id, state.year.name);
    }
}

export const portalApp = {
    state,

    goHome(push = true) {
        state.view = "institutes"; state.inst = null; state.year = null; state.sub = null;
        if (push) history.pushState({ view: "institutes" }, "");
        this.renderInstitutes();
    },

    goToYears(id, name, push = true) {
        state.view = "years"; state.inst = { id, name }; state.year = null; state.sub = null;
        if (push) history.pushState({ view: "years", inst: state.inst }, "");
        this.renderYears();
    },

    goToSubjects(id, name, push = true) {
        state.view = "subjects"; state.year = { id, name }; state.sub = null;
        if (push) history.pushState({ view: "subjects", inst: state.inst, year: state.year }, "");
        this.renderSubjects();
    },

    renderInstitutes() {
        toggleView("institutes");
        const grid = document.getElementById("institutes-grid");
        if (!grid) return;

        const visible = INSTITUTES.filter(i => i.visible !== false);
        grid.innerHTML = visible.map(inst => {
            if (inst.locked) {
                return `<div onclick="alert('Bank for ${escapeHtml(inst.name)} is coming soon!')" class="glass-card p-6 rounded-xl relative opacity-75 grayscale bg-slate-100 dark:bg-slate-800/50 cursor-not-allowed">
                    <div class="absolute top-3 right-3 bg-slate-200 text-slate-500 text-[10px] font-bold px-2 py-1 rounded-full">Soon</div>
                    <div class="w-12 h-12 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-400 flex items-center justify-center font-bold text-lg mb-4">${escapeHtml(inst.badge)}</div>
                    <h3 class="font-bold text-lg mb-1 text-slate-500">${escapeHtml(inst.name)}</h3>
                    <p class="text-sm text-slate-400">${escapeHtml(inst.city)}</p>
                </div>`;
            }
            return `<div onclick="window.portalApp.goToYears('${escapeHtml(inst.id)}', '${escapeHtml(inst.name)}')" class="glass-card p-6 rounded-xl cursor-pointer hover:scale-[1.02] transition-transform group">
                <div class="flex justify-between mb-4">
                    <div class="w-12 h-12 rounded-lg bg-brand-50 text-brand-400 flex items-center justify-center font-bold text-lg dark:bg-brand-900/30">${escapeHtml(inst.badge)}</div>
                    <span class="text-slate-300 group-hover:text-accent-yellow transition-colors">↗</span>
                </div>
                <h3 class="font-bold text-lg mb-1 text-slate-900 dark:text-white group-hover:text-brand-500 transition-colors">${escapeHtml(inst.name)}</h3>
                <p class="text-sm text-slate-500 dark:text-slate-400">${escapeHtml(inst.city)}</p>
            </div>`;
        }).join("");
        updateBreadcrumbs();
    },

    renderYears() {
        if (!state.inst) return this.goHome(false);
        toggleView("years");
        const titleEl = document.getElementById("selected-institute-name");
        if (titleEl) titleEl.textContent = state.inst.name;

        const grid = document.getElementById("years-grid");
        if (!grid) return;
        grid.innerHTML = YEARS.map(y => `
            <div onclick="window.portalApp.goToSubjects('${y.id}', '${escapeHtml(y.name)}')" class="glass-card p-8 rounded-2xl cursor-pointer hover:border-t-brand-400 border-t-4 border-transparent transition-all group">
                <div class="text-5xl font-black text-brand-100 dark:text-brand-900/40 mb-4 group-hover:text-brand-300 transition-colors">0${y.id}</div>
                <h3 class="text-2xl font-bold mb-2 text-slate-900 dark:text-white group-hover:text-brand-400 transition-colors">${escapeHtml(y.name)}</h3>
                <p class="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">${escapeHtml(y.sub)}</p>
            </div>`).join("");
        updateBreadcrumbs();
    },

    renderSubjects() {
        if (!state.inst || !state.year) return this.goHome(false);
        toggleView("subjects");
        document.getElementById("selected-year-name").textContent = state.year.name;
        document.getElementById("selected-inst-sub-name").textContent = state.inst.name;

        const list = SUBJECTS_BY_YEAR[state.year.id] || [];
        const isAdmin = isUserAdmin();
        const grid = document.getElementById("subjects-grid");
        if (!grid) return;

        grid.innerHTML = list.map((sub, idx) => {
            const vers = getSubjectVersions(state.inst.id, state.year.id, sub.id);
            const visCount = vers ? vers.filter(v => v.visible !== false).length : 0;
            const badge = visCount > 1
                ? `<span class="text-[10px] font-extrabold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-900/30 px-2 py-0.5 rounded-full ml-2">${visCount} Versions</span>`
                : "";
            const gear = isAdmin
                ? `<button type="button" data-ver-gear="${idx}" title="Edit Subject Versions (Admin)" class="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-sky-500 hover:text-white text-slate-500 flex items-center justify-center text-xs border-none cursor-pointer z-10">⚙️</button>`
                : "";

            return `
            <div data-sub-idx="${idx}" class="glass-card relative p-6 rounded-xl cursor-pointer group flex items-center gap-4 hover:border-accent-yellow transition-all">
                ${gear}
                <div class="text-4xl group-hover:scale-110 transition-transform">${sub.icon}</div>
                <div>
                    <h3 class="text-xl font-bold text-slate-900 dark:text-white group-hover:text-accent-yellow transition-colors flex items-center flex-wrap">${escapeHtml(sub.name)}${badge}</h3>
                    <p class="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest mt-1">Open ➝</p>
                </div>
            </div>`;
        }).join("");

        grid.querySelectorAll("[data-sub-idx]").forEach(cardEl => {
            const sub = list[Number(cardEl.dataset.subIdx)];

            const openVerEditor = () => {
                if (!isUserAdmin() || !window.MPPAdmin) return;
                const current = getSubjectVersions(state.inst.id, state.year.id, sub.id);
                window.MPPAdmin.openVersionEditor(state.inst.id, state.inst.name, state.year.id, state.year.name, sub, current);
            };

            if (isAdmin && window.MPPAdmin) {
                window.MPPAdmin.bindSafeLongPress(cardEl, openVerEditor, 500);
                cardEl.querySelector("[data-ver-gear]")?.addEventListener("click", (e) => {
                    e.stopPropagation();
                    openVerEditor();
                });
            }

            cardEl.addEventListener("click", () => {
                if (cardEl.dataset.lpFired && Date.now() - Number(cardEl.dataset.lpFired) < 450) return;
                this.handleSubjectClick(sub, true);
            });
        });

        updateBreadcrumbs();
    },

    handleSubjectClick(sub, push = true) {
        if (!state.inst || !state.year || !sub) return;
        const isAdmin = isUserAdmin();
        const allVers = getSubjectVersions(state.inst.id, state.year.id, sub.id);
        const visibleVers = allVers ? allVers.filter(v => v.visible !== false || isAdmin) : [];

        // Multi-version popup (e.g. Standard + Marrow Ed 8 + any custom admin versions)
        if (visibleVers.length > 1) {
            const opts = visibleVers.map(v => ({
                label: v.visible === false ? `${v.label} (Hidden)` : v.label,
                url: buildReviewUrl(sub.id, state.inst.id, v.versionCode)
            }));
            if (isAdmin) {
                opts.push({
                    label: "🩺 Clinical Cases (Admin Only)",
                    url: buildClinicalUrl(sub.id, state.inst.id)
                });
            }
            openSubjectVersionModal(`${sub.name} — Select Version`, opts);
            return;
        }

        // Single-version resource view
        const verCode = visibleVers[0]?.versionCode || "";
        const pyqLabel = visibleVers[0]?.label || "Chapter Wise PYQ";
        const links = [{ label: pyqLabel, url: buildReviewUrl(sub.id, state.inst.id, verCode) }];
        if (isAdmin) {
            links.push({ label: "Clinical Cases", url: buildClinicalUrl(sub.id, state.inst.id) });
        }

        state.sub = sub;
        state.view = "resources";
        if (push) history.pushState({ view: "resources", inst: state.inst, year: state.year, sub }, "");
        this.renderResources(links);
    },

    renderResources(links) {
        toggleView("resources");
        document.getElementById("selected-resource-subject").textContent = `${state.sub.name} (${state.inst.name})`;
        document.getElementById("resources-grid").innerHTML = links.map(link => `
            <a href="${escapeHtml(link.url)}" class="glass-card p-6 rounded-xl flex items-center justify-between group no-underline">
                <span class="font-bold text-lg text-slate-900 dark:text-white group-hover:text-brand-400 transition-colors">${escapeHtml(link.label)}</span>
                <span class="text-slate-300 dark:text-slate-600 group-hover:text-brand-400 font-bold text-xl">↗</span>
            </a>`).join("");
        updateBreadcrumbs();
    },

    rerenderCurrentView() {
        if (state.view === "subjects") this.renderSubjects();
        else if (state.view === "resources" && state.sub) this.handleSubjectClick(state.sub, false);
        else if (state.view === "years") this.renderYears();
        else this.renderInstitutes();
    }
};

// ============================================================================
// 3. VIP PDF SMART LIBRARY DRAWER
// ============================================================================
export const pdfSmartApp = {
    isOpen: false,
    stack: [],

    checkVisibility() {
        const btn = document.getElementById("pdf-trigger-btn");
        const isVIP = Boolean(MPPStore.userStatus?.isVIP);
        if (btn) btn.style.display = isVIP ? "flex" : "none";
        if (!isVIP && this.isOpen) this.close();
    },

    toggle() { this.isOpen ? this.close() : this.open(); },

    open() {
        this.isOpen = true;
        document.getElementById("pdf-smart-drawer")?.classList.remove("-translate-x-full");
        document.getElementById("pdf-smart-backdrop")?.classList.remove("opacity-0", "pointer-events-none");
        if (!this.stack.length) this.renderHome();
    },

    close() {
        this.isOpen = false;
        document.getElementById("pdf-smart-drawer")?.classList.add("-translate-x-full");
        document.getElementById("pdf-smart-backdrop")?.classList.add("opacity-0", "pointer-events-none");
    },

    goBack() {
        if (this.stack.length > 1) {
            this.stack.pop();
            const top = this.stack[this.stack.length - 1];
            if (top.type === "home") this.renderHome(false);
            else this.renderList(top.val, false);
        } else {
            this.close();
        }
    },

    renderHome(push = true) {
        if (push) this.stack.push({ type: "home" });
        document.getElementById("pdf-smart-title").textContent = "Library";
        document.getElementById("pdf-smart-body").innerHTML = Object.keys(PDF_SMART_DB).map(name => `
            <div onclick="window.pdfSmartApp.renderList('${escapeHtml(name)}')" class="p-4 mb-2 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 flex justify-between cursor-pointer font-bold dark:text-white hover:border-brand-500">
                <span>${escapeHtml(name)}</span><span class="text-brand-500">➝</span>
            </div>`).join("");
    },

    renderList(col, push = true) {
        if (push) this.stack.push({ type: "list", val: col });
        document.getElementById("pdf-smart-title").textContent = col;
        document.getElementById("pdf-smart-body").innerHTML = Object.entries(PDF_SMART_DB[col] || {}).map(([sub, url]) => `
            <div onclick="window.pdfSmartApp.renderViewer('${escapeHtml(url)}')" class="p-3 mb-2 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 cursor-pointer font-bold dark:text-white hover:border-brand-500">
                📄 ${escapeHtml(sub)}
            </div>`).join("");
    },

    renderViewer(url) {
        const preview = url.includes("drive.google") || url.includes("docs.google")
            ? url.replace(/\/view.*/, "/preview").replace(/\/edit.*/, "/preview")
            : url;
        this.stack.push({ type: "viewer" });
        document.getElementById("pdf-smart-title").textContent = "Viewing";
        document.getElementById("pdf-smart-body").innerHTML = `<iframe src="${escapeHtml(preview)}" class="w-full h-full rounded-xl bg-white border dark:border-slate-800" frameborder="0"></iframe>`;
    }
};

// ============================================================================
// 4. 3D DNA HELIX BACKGROUND
// ============================================================================
function init3DBackground() {
    const container = document.getElementById("canvas-container");
    if (!container || typeof window.THREE === "undefined") return;
    const THREE = window.THREE;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 40;
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);

    const group = new THREE.Group();
    scene.add(group);
    const geo = new THREE.SphereGeometry(0.3, 8, 8);
    const mb = new THREE.MeshBasicMaterial({ color: 0x3395ff });
    const my = new THREE.MeshBasicMaterial({ color: 0xffc107 });
    for (let i = 0; i < 150; i++) {
        const a = i * 0.4;
        const m = new THREE.Mesh(geo, i % 4 === 0 ? my : mb);
        m.translateOnAxis(new THREE.Vector3(i * 0.8 - 60, Math.sin(a) * 8, Math.cos(a) * 8), 1);
        group.add(m);
    }

    (function animate() {
        requestAnimationFrame(animate);
        group.rotation.x += 0.002;
        renderer.render(scene, camera);
    })();

    window.addEventListener("resize", () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    window.update3D = () => {
        container.style.opacity = document.documentElement.classList.contains("dark") ? "0.1" : "0.6";
    };
    window.update3D();
}

// ============================================================================
// 5. BOOT PORTAL ENGINE
// ============================================================================
export function bootPortalEngine() {
    MPPStore.page.mode = "portal";
    initUIShell();
    init3DBackground();

    window.portalApp = portalApp;
    window.pdfSmartApp = pdfSmartApp;
    window.closeSubjectVersionModal = closeSubjectVersionModal;

    history.replaceState({ view: "institutes" }, "");
    portalApp.renderInstitutes();

    // Live Subject Versions from Firebase (Read-only for students, editable by 3 Admins)
    onValue(ref(db, "portal_config/subject_versions"), (snap) => {
        cloudVersions = snap.val() || {};
        if (state.view === "subjects") portalApp.renderSubjects();
    });

    // Re-render when auth or admin-suite resolves (mounts Admin gear + long-press immediately)
    onStoreChange("auth", () => {
        pdfSmartApp.checkVisibility();
        portalApp.rerenderCurrentView();
    });
    onStoreChange("adminReady", () => {
        portalApp.rerenderCurrentView();
    });

    // Global Search Bar filter for visible cards
    window.addEventListener("mpp:global-search", (e) => {
        const q = String(e.detail?.query || "").toLowerCase().trim();
        ["institutes-grid", "years-grid", "subjects-grid", "resources-grid"].forEach(id => {
            const g = document.getElementById(id);
            if (!g || g.parentElement?.classList.contains("hidden")) return;
            Array.from(g.children).forEach(card => {
                card.style.display = (card.textContent || "").toLowerCase().includes(q) ? "" : "none";
            });
        });
    });

    // Browser Back/Forward support
    window.addEventListener("popstate", (e) => {
        const s = e.state;
        if (!s || s.view === "institutes") portalApp.goHome(false);
        else if (s.view === "years") { state.inst = s.inst; state.view = "years"; portalApp.renderYears(); }
        else if (s.view === "subjects") { state.inst = s.inst; state.year = s.year; state.view = "subjects"; portalApp.renderSubjects(); }
        else if (s.view === "resources") { state.inst = s.inst; state.year = s.year; portalApp.handleSubjectClick(s.sub, false); }
    });
}
