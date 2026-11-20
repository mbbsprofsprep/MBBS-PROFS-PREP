// ============================================================================
// js/content-renderer.js (Complete Updated Version)
// Unified Content Renderer for ALL Pages (Portal, Review, Clinical, Bookmarks
// & Neuro-Recall): KaTeX + Flowcharts + Multimedia + Docs + Collapsible Inline
// Galleries ("See images (N)") + Safe Highlights + Hotlink-Safe Images
// ============================================================================

const GALLERY_REGISTRY = new Map();

// 1. Auto-load Marked, KaTeX, JetBrains Mono, DOMPurify & Scoped Styles (Once)
(function ensureDependenciesAndStyles() {
    if (!document.querySelector('link[href*="JetBrains+Mono"]')) {
        const font = document.createElement("link");
        font.rel = "stylesheet";
        font.href = "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap";
        document.head.appendChild(font);
    }

    if (!document.querySelector('link[href*="katex.min.css"]')) {
        const kCss = document.createElement("link");
        kCss.rel = "stylesheet";
        kCss.href = "https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css";
        document.head.appendChild(kCss);
    }

    if (typeof window.marked === "undefined" && !document.querySelector('script[src*="marked.min.js"]')) {
        const mScript = document.createElement("script");
        mScript.src = "https://cdn.jsdelivr.net/npm/marked/marked.min.js";
        document.head.appendChild(mScript);
    }

    if (typeof window.DOMPurify === "undefined" && !document.querySelector('script[src*="purify.min.js"]')) {
        const dpScript = document.createElement("script");
        dpScript.src = "https://cdn.jsdelivr.net/npm/dompurify@3.1.6/dist/purify.min.js";
        document.head.appendChild(dpScript);
    }

    if (typeof window.katex === "undefined" && !document.querySelector('script[src*="katex.min.js"]')) {
        const kScript = document.createElement("script");
        kScript.src = "https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js";
        kScript.onload = () => {
            window.dispatchEvent(new CustomEvent("mpp:katex-ready"));
        };
        document.head.appendChild(kScript);
    }

    if (!document.getElementById("mpp-content-renderer-css")) {
        document.head.insertAdjacentHTML("beforeend", `
        <style id="mpp-content-renderer-css">
            /* Core Markdown Typography */
            .markdown-body { font-size: 0.925rem; line-height: 1.7; color: inherit; word-wrap: break-word; }
            .markdown-body h1 { font-size: 1.4rem; font-weight: 800; margin: 1.4em 0 0.6em; color: #0284c7; border-bottom: 2px solid #e0f2fe; padding-bottom: 0.25em; }
            .markdown-body h2 { font-size: 1.22rem; font-weight: 800; margin: 1.3em 0 0.5em; color: #0284c7; border-bottom: 1px solid #e0f2fe; padding-bottom: 0.2em; }
            .markdown-body h3 { font-size: 1.08rem; font-weight: 800; margin: 1.2em 0 0.45em; color: #0284c7; }
            .markdown-body h4 { font-size: 0.96rem; font-weight: 800; margin: 1.05em 0 0.35em; color: #0369a1; text-transform: uppercase; letter-spacing: 0.02em; }
            .markdown-body h5, .markdown-body h6 { font-size: 0.9rem; font-weight: 700; margin: 0.9em 0 0.35em; color: #0284c7; }
            html.dark .markdown-body h1, html.dark .markdown-body h2, html.dark .markdown-body h3 { color: #38bdf8; border-color: #1e293b; }
            html.dark .markdown-body h4, html.dark .markdown-body h5, html.dark .markdown-body h6 { color: #7dd3fc; }

            .markdown-body p { margin-bottom: 0.9em; }
            .markdown-body ul { list-style-type: disc; margin: 0 0 1em 1.5em; }
            .markdown-body ol { list-style-type: decimal; margin: 0 0 1em 1.5em; }
            .markdown-body ul ul, .markdown-body ol ul { list-style-type: circle; margin: 0.35em 0 0.35em 1.4em; }
            .markdown-body ol ol, .markdown-body ul ol { list-style-type: lower-alpha; margin: 0.35em 0 0.35em 1.4em; }
            .markdown-body li { margin-bottom: 0.35em; }
            .markdown-body strong { font-weight: 800; color: #0f172a; }
            html.dark .markdown-body strong { color: #ffffff; }
            .markdown-body em { font-style: italic; }
            .markdown-body hr { border: 0; border-top: 2px dashed #cbd5e1; margin: 1.6rem 0; }
            html.dark .markdown-body hr { border-top-color: #334155; }

            .markdown-body blockquote {
                border-left: 4px solid #0ea5e9; background: #f0f9ff;
                padding: 0.85rem 1.15rem; border-radius: 0 0.75rem 0.75rem 0;
                margin: 1rem 0; color: #0c4a6e; font-style: italic;
            }
            html.dark .markdown-body blockquote { background: rgba(14, 165, 233, 0.1); color: #bae6fd; border-left-color: #38bdf8; }

            /* ASCII Flowcharts & Code */
            .markdown-body pre {
                font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace !important;
                font-size: 0.78rem !important; line-height: 1.45 !important;
                background: #f8fafc !important; color: #0f172a !important;
                padding: 1rem 1.2rem !important; border-radius: 0.75rem !important;
                border: 1px solid #cbd5e1 !important; overflow-x: auto !important;
                white-space: pre !important; margin: 1.15rem 0 !important;
            }
            html.dark .markdown-body pre { background: #020617 !important; color: #38bdf8 !important; border-color: #1e293b !important; }
            .markdown-body code {
                font-family: 'JetBrains Mono', monospace; font-size: 0.84em;
                background: #f1f5f9; color: #0284c7; padding: 0.15rem 0.4rem;
                border-radius: 0.375rem; border: 1px solid #e2e8f0;
            }
            html.dark .markdown-body code { background: #1e293b; color: #38bdf8; border-color: #334155; }
            .markdown-body pre code { background: transparent !important; color: inherit !important; padding: 0 !important; border: none !important; }

            /* Responsive Tables */
            .markdown-table-wrapper { overflow-x: auto; width: 100%; margin: 1.1rem 0 1.4rem; border-radius: 10px; border: 1px solid #e2e8f0; background: #ffffff; }
            html.dark .markdown-table-wrapper { border-color: #334155; background: #0f172a; }
            .markdown-body table { width: 100%; border-collapse: collapse; text-align: left; min-width: 520px; }
            .markdown-body th, .markdown-body td { border: 1px solid #cbd5e1; padding: 10px 12px; font-size: 0.85rem; }
            html.dark .markdown-body th, html.dark .markdown-body td { border-color: #334155; }
            .markdown-body th { background: #f1f5f9; font-weight: 800; color: #0f172a; }
            html.dark .markdown-body th { background: #1e293b; color: #f8fafc; }

            /* Media inside Markdown */
            .markdown-body img {
                max-width: 100%; height: auto; max-height: 360px; object-fit: contain;
                border-radius: 0.75rem; margin: 0.9rem auto; display: block;
                border: 1px solid #e2e8f0; cursor: zoom-in;
                box-shadow: 0 4px 10px rgba(0, 0, 0, 0.08);
            }
            html.dark .markdown-body img { border-color: #334155; }
            .markdown-body audio, .markdown-body video {
                width: 100%; max-width: 100%; margin: 0.75rem 0; border-radius: 0.75rem; outline: none;
            }

            /* KaTeX Display Box */
            .katex-display {
                overflow-x: auto; overflow-y: hidden; padding: 0.75rem 0.5rem; margin: 0.85rem 0 !important;
                background: #f8fafc; border-radius: 0.75rem; border: 1px solid #e2e8f0;
            }
            html.dark .katex-display { background: rgba(15, 23, 42, 0.7); border-color: #1e293b; }
            .katex { font-size: 1.05em; }

            /* Safe Inline Highlights & Font Sizes (Read-only for users, editable by Admin) */
            .markdown-body mark.hl-yellow { background: #fef08a; color: #0f172a; padding: 1px 4px; border-radius: 4px; }
            .markdown-body mark.hl-green  { background: #bbf7d0; color: #0f172a; padding: 1px 4px; border-radius: 4px; }
            .markdown-body mark.hl-blue   { background: #bae6fd; color: #0f172a; padding: 1px 4px; border-radius: 4px; }
            .markdown-body mark.hl-pink   { background: #fbcfe8; color: #0f172a; padding: 1px 4px; border-radius: 4px; }
            html.dark .markdown-body mark.hl-yellow { background: rgba(250, 204, 21, 0.35); color: #fef9c3; }
            html.dark .markdown-body mark.hl-green  { background: rgba(74, 222, 128, 0.30); color: #dcfce7; }
            html.dark .markdown-body mark.hl-blue   { background: rgba(56, 189, 248, 0.30); color: #e0f2fe; }
            html.dark .markdown-body mark.hl-pink   { background: rgba(244, 114, 182, 0.30); color: #fce7f3; }

            .markdown-body .fs-sm { font-size: 0.80rem; }
            .markdown-body .fs-md { font-size: 0.95rem; }
            .markdown-body .fs-lg { font-size: 1.15rem; }
            .markdown-body .fs-xl { font-size: 1.35rem; font-weight: 700; }

            /* Inline Collapsible Media Button ("See images (3)") & Carousel ("2/3") */
            .mpp-inline-media-btn {
                display: inline-flex; align-items: center; gap: 4px;
                margin-left: 6px; padding: 2px 10px; border-radius: 999px;
                background: #e0f2fe; color: #0369a1; border: 1px solid #7dd3fc;
                font-size: 0.74rem; font-weight: 800; cursor: pointer;
                vertical-align: middle; transition: all 0.15s ease;
            }
            .mpp-inline-media-btn:hover { background: #0284c7; color: #ffffff; border-color: #0284c7; }
            html.dark .mpp-inline-media-btn { background: rgba(14, 165, 233, 0.18); color: #38bdf8; border-color: #0369a1; }
            html.dark .mpp-inline-media-btn:hover { background: #0284c7; color: #ffffff; }

            .mpp-inline-gallery-box {
                margin: 10px 0 14px; padding: 12px; border-radius: 14px;
                background: #f8fafc; border: 1.5px solid #bae6fd;
                box-shadow: 0 4px 12px rgba(15, 23, 42, 0.06);
            }
            html.dark .mpp-inline-gallery-box { background: #0f172a; border-color: #1e293b; }

            .mpp-gallery-viewport {
                display: flex; align-items: center; justify-content: center;
                min-height: 180px; max-height: 320px; overflow: hidden;
                border-radius: 10px; background: #ffffff; border: 1px solid #e2e8f0;
            }
            html.dark .mpp-gallery-viewport { background: #020617; border-color: #1e293b; }
            .mpp-gallery-viewport img {
                max-width: 100% !important; max-height: 300px !important; object-fit: contain;
                margin: 0 !important; border: none !important; box-shadow: none !important; cursor: zoom-in;
            }
            .mpp-gallery-thumbs {
                display: flex; gap: 6px; overflow-x: auto; padding-top: 8px; justify-content: center;
            }
            .mpp-gallery-thumb {
                width: 48px; height: 48px; border-radius: 8px; overflow: hidden;
                border: 2px solid transparent; cursor: pointer; opacity: 0.65;
                transition: all 0.15s; flex-shrink: 0; background: #e2e8f0;
            }
            html.dark .mpp-gallery-thumb { background: #1e293b; }
            .mpp-gallery-thumb.active { border-color: #0ea5e9; opacity: 1; transform: scale(1.06); }
            .mpp-gallery-thumb img { width: 100% !important; height: 100% !important; object-fit: cover; margin: 0 !important; border: none !important; }
        </style>`);
    }
})();

// ============================================================================
// 2. SHARED SANITIZATION & URL UTILITIES
// ============================================================================
export function escapeHtml(str) {
    return String(str ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

export function stripHtml(htmlStr) {
    if (!htmlStr) return "";
    const tmp = document.createElement("div");
    tmp.innerHTML = String(htmlStr);
    return (tmp.textContent || tmp.innerText || "").trim();
}

export function normalizeMediaUrl(rawUrl) {
    if (!rawUrl) return "";
    const u = String(rawUrl).trim();
    if (!u || u === "null" || u === "undefined") return "";

    // Convert Google Drive share links into direct image URLs
    const gd = u.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/)
        || u.match(/drive\.google\.com\/uc\?.*id=([a-zA-Z0-9_-]+)/);
    if (gd) return `https://lh3.googleusercontent.com/d/${gd[1]}`;

    // Allow https://, http://, and safe relative GitHub Pages asset paths (assets/...)
    if (/^https?:\/\//i.test(u)) return u;
    if (/^\.?\/?assets\//i.test(u)) return u.replace(/^\.\//, "");
    return "";
}

function classifyMediaUrl(url) {
    const u = String(url || "").toLowerCase();
    if (/(youtube\.com|youtu\.be)/.test(u)) return "youtube";
    if (/\.(mp4|webm|ogg|mov|m4v)(\?|$)/.test(u)) return "video";
    if (/\.(mp3|wav|m4a|aac|flac)(\?|$)/.test(u)) return "audio";
    return "image";
}

function extractYouTubeId(url) {
    const m = String(url || "").match(/(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?|shorts|live)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return m ? m[1] : "";
}

function uid(prefix) {
    return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

// ============================================================================
// 3. LAZY-LOADED MEDIA & INLINE GALLERY CONTROLLERS (Read-Only for All Users)
// ============================================================================
function renderGallerySlideHtml(url) {
    const safeUrl = escapeHtml(url);
    const kind = classifyMediaUrl(url);
    if (kind === "audio") {
        return `<div class="p-4 w-full"><audio controls class="w-full m-0"><source src="${safeUrl}"></audio></div>`;
    }
    if (kind === "video") {
        return `<video controls class="max-h-[300px] w-full m-0 rounded-lg"><source src="${safeUrl}"></video>`;
    }
    if (kind === "youtube") {
        const vid = extractYouTubeId(url);
        return vid
            ? `<iframe class="w-full h-[260px] rounded-lg" src="https://www.youtube.com/embed/${escapeHtml(vid)}" frameborder="0" allowfullscreen></iframe>`
            : `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer" class="text-sky-500 font-bold underline">Open Video</a>`;
    }
    return `<img src="${safeUrl}" referrerpolicy="no-referrer" alt="Medical Reference Image" loading="lazy" onclick="window.openImageLightbox?.('${safeUrl}')">`;
}

export const MPPRenderer = {
    toggleGallery(galleryId) {
        const box = document.getElementById(galleryId);
        if (!box) return;
        const opening = box.classList.contains("hidden");
        box.classList.toggle("hidden");
        if (opening && !box.dataset.initialized) {
            box.dataset.initialized = "1";
            this.setGallerySlide(galleryId, 0);
        }
    },

    setGallerySlide(galleryId, index) {
        const entry = GALLERY_REGISTRY.get(galleryId);
        const box = document.getElementById(galleryId);
        if (!entry || !box) return;
        const total = entry.urls.length;
        const safeIdx = ((index % total) + total) % total;
        entry.index = safeIdx;

        const vp = box.querySelector(".mpp-gallery-viewport");
        const counter = box.querySelector(".mpp-gallery-counter");
        if (vp) vp.innerHTML = renderGallerySlideHtml(entry.urls[safeIdx]);
        if (counter) counter.textContent = `${safeIdx + 1}/${total}`;

        box.querySelectorAll(".mpp-gallery-thumb").forEach((t, i) => {
            t.classList.toggle("active", i === safeIdx);
        });
    },

    stepGallerySlide(galleryId, delta) {
        const entry = GALLERY_REGISTRY.get(galleryId);
        if (!entry) return;
        this.setGallerySlide(galleryId, entry.index + delta);
    },

    toggleYT(containerId, videoId) {
        const el = document.getElementById(containerId);
        if (!el) return;
        if (el.classList.contains("hidden")) {
            el.classList.remove("hidden");
            if (!el.innerHTML.trim()) {
                el.innerHTML = `<iframe class="absolute top-0 left-0 w-full h-full" src="https://www.youtube.com/embed/${escapeHtml(videoId)}?autoplay=1" title="YouTube video" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
            }
        } else {
            el.classList.add("hidden");
            el.innerHTML = "";
        }
    },

    toggleVideo(containerId, videoUrl) {
        const el = document.getElementById(containerId);
        if (!el) return;
        if (el.classList.contains("hidden")) {
            el.classList.remove("hidden");
            if (!el.innerHTML.trim()) {
                el.innerHTML = `<video controls autoplay class="w-full max-h-[500px] m-0 rounded-xl outline-none"><source src="${escapeHtml(videoUrl)}"></video>`;
            }
        } else {
            el.classList.add("hidden");
            el.innerHTML = "";
        }
    },

    toggleAudio(containerId, audioUrl) {
        const el = document.getElementById(containerId);
        if (!el) return;
        if (el.classList.contains("hidden")) {
            el.classList.remove("hidden");
            if (!el.innerHTML.trim()) {
                el.innerHTML = `<audio controls autoplay class="w-full m-0 rounded-xl outline-none"><source src="${escapeHtml(audioUrl)}"></audio>`;
            }
        } else {
            el.classList.add("hidden");
            el.innerHTML = "";
        }
    },

    toggleDoc(containerId, docUrl, ext) {
        const el = document.getElementById(containerId);
        if (!el) return;
        if (el.classList.contains("hidden")) {
            el.classList.remove("hidden");
            if (!el.innerHTML.trim()) {
                let embedUrl = "";
                const gd = String(docUrl).match(/\/d\/([a-zA-Z0-9_-]+)/);
                if (gd && (docUrl.includes("drive.google.com") || docUrl.includes("docs.google.com"))) {
                    const id = gd[1];
                    if (docUrl.includes("/document/")) embedUrl = `https://docs.google.com/document/d/${id}/preview`;
                    else if (docUrl.includes("/presentation/")) embedUrl = `https://docs.google.com/presentation/d/${id}/preview`;
                    else if (docUrl.includes("/spreadsheets/")) embedUrl = `https://docs.google.com/spreadsheets/d/${id}/preview`;
                    else embedUrl = `https://drive.google.com/file/d/${id}/preview`;
                } else if (["doc", "docx", "ppt", "pptx", "xls", "xlsx"].includes(ext)) {
                    embedUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(docUrl)}`;
                } else {
                    embedUrl = `https://docs.google.com/gview?url=${encodeURIComponent(docUrl)}&embedded=true`;
                }
                el.innerHTML = `<iframe src="${escapeHtml(embedUrl)}" class="w-full h-[500px] md:h-[650px] border-0" allow="autoplay" loading="lazy"></iframe>`;
            }
        } else {
            el.classList.add("hidden");
            el.innerHTML = "";
        }
    }
};

window.MPPRenderer = MPPRenderer;

// ============================================================================
// 4. EMBED CARD BUILDERS
// ============================================================================
function buildYouTubeCard(title, videoId) {
    const id = uid("yt");
    return `<div class="yt-container my-3">
        <button type="button" onclick="window.MPPRenderer.toggleYT('${id}', '${escapeHtml(videoId)}')" class="flex items-center gap-2 text-red-600 dark:text-red-400 font-bold text-sm bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 px-4 py-2.5 rounded-xl transition-colors border border-red-100 dark:border-red-900/50 w-full sm:w-auto shadow-sm cursor-pointer">
            <span>▶ Play: ${escapeHtml(title)}</span>
        </button>
        <div id="${id}" class="hidden mt-3 rounded-xl overflow-hidden shadow-lg border border-slate-200 dark:border-slate-700 relative bg-slate-900 w-full" style="padding-top:56.25%;"></div>
    </div>`;
}

function buildVideoCard(title, url) {
    const id = uid("vid");
    return `<div class="vid-container my-3">
        <button type="button" onclick="window.MPPRenderer.toggleVideo('${id}', '${escapeHtml(url)}')" class="flex items-center gap-2 text-brand-600 dark:text-brand-400 font-bold text-sm bg-brand-50 hover:bg-brand-100 dark:bg-brand-900/20 px-4 py-2.5 rounded-xl transition-colors border border-brand-200 dark:border-brand-800/50 w-full sm:w-auto shadow-sm cursor-pointer">
            <span>🎬 Play Video: ${escapeHtml(title)}</span>
        </button>
        <div id="${id}" class="hidden mt-3 rounded-xl overflow-hidden shadow-lg border border-slate-200 dark:border-slate-700 bg-slate-900 w-full"></div>
    </div>`;
}

function buildAudioCard(title, url) {
    const id = uid("aud");
    const safeUrl = escapeHtml(url);
    return `<div class="aud-container my-3">
        <div class="flex flex-wrap items-center gap-2">
            <button type="button" onclick="window.MPPRenderer.toggleAudio('${id}', '${safeUrl}')" class="flex items-center gap-2 text-purple-600 dark:text-purple-400 font-bold text-sm bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/20 px-4 py-2.5 rounded-xl border border-purple-200 dark:border-purple-800/50 shadow-sm cursor-pointer">
                <span>🔊 Listen: ${escapeHtml(title)}</span>
            </button>
            <a href="${safeUrl}" target="_blank" rel="noopener noreferrer" class="text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 no-underline">↗️ Open</a>
        </div>
        <div id="${id}" class="hidden mt-3"></div>
    </div>`;
}

function buildDocCard(title, url, ext) {
    const id = uid("doc");
    const safeUrl = escapeHtml(url);
    const meta = {
        pdf: ["📕", "PDF"], gdoc: ["📘", "GOOGLE DOC"], gslides: ["📙", "SLIDES"],
        gsheets: ["📗", "SHEETS"], gdrive: ["📁", "DRIVE FILE"]
    };
    let [icon, badge] = meta[ext] || ["📄", ext.toUpperCase()];
    if (["doc", "docx", "odt", "rtf"].includes(ext)) [icon, badge] = ["📘", "WORD"];
    if (["ppt", "pptx", "odp"].includes(ext)) [icon, badge] = ["📙", "PPT"];
    if (["xls", "xlsx", "ods", "csv"].includes(ext)) [icon, badge] = ["📗", "EXCEL"];

    return `<div class="doc-container my-3">
        <div class="flex flex-wrap items-center gap-2">
            <button type="button" onclick="window.MPPRenderer.toggleDoc('${id}', '${safeUrl}', '${escapeHtml(ext)}')" class="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-bold text-sm bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/20 px-4 py-2.5 rounded-xl border border-amber-200 dark:border-amber-800/50 shadow-sm cursor-pointer">
                <span>${icon} View ${badge}: ${escapeHtml(title)}</span>
            </button>
            <a href="${safeUrl}" target="_blank" rel="noopener noreferrer" class="text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 no-underline">↗️ Open</a>
        </div>
        <div id="${id}" class="hidden mt-3 rounded-xl overflow-hidden shadow-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 w-full"></div>
    </div>`;
}

function buildInlineGalleryHtml(label, urls) {
    const gid = uid("mpp-gal");
    GALLERY_REGISTRY.set(gid, { label, urls, index: 0 });

    const hasNonImage = urls.some(u => classifyMediaUrl(u) !== "image");
    const noun = hasNonImage ? "media" : (urls.length === 1 ? "image" : "images");
    const safeLabel = escapeHtml(label);

    const thumbsHtml = urls.length > 1
        ? `<div class="mpp-gallery-thumbs">${urls.map((u, idx) => {
            const k = classifyMediaUrl(u);
            const inner = k === "image"
                ? `<img src="${escapeHtml(u)}" referrerpolicy="no-referrer" alt="Thumb ${idx + 1}" loading="lazy">`
                : `<div class="w-full h-full flex items-center justify-center text-xs font-bold">${k === "audio" ? "🔊" : "🎬"}</div>`;
            return `<div class="mpp-gallery-thumb ${idx === 0 ? "active" : ""}" onclick="window.MPPRenderer.setGallerySlide('${gid}', ${idx})">${inner}</div>`;
        }).join("")}</div>`
        : "";

    const navHtml = urls.length > 1
        ? `<button type="button" onclick="window.MPPRenderer.stepGallerySlide('${gid}', -1)" class="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-xs font-black border-none cursor-pointer">‹</button>
           <span class="mpp-gallery-counter text-[11px] font-black text-slate-600 dark:text-slate-300 px-1.5">1/${urls.length}</span>
           <button type="button" onclick="window.MPPRenderer.stepGallerySlide('${gid}', 1)" class="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-xs font-black border-none cursor-pointer">›</button>`
        : `<span class="mpp-gallery-counter text-[11px] font-black text-slate-600 dark:text-slate-300 px-1.5">1/1</span>`;

    return `<button type="button" class="mpp-inline-media-btn" onclick="window.MPPRenderer.toggleGallery('${gid}')">🖼️ See ${noun} (${urls.length})</button>` +
        `<div id="${gid}" class="mpp-inline-gallery-box hidden">
            <div class="flex items-center justify-between gap-2 mb-2">
                <span class="text-xs font-extrabold text-sky-700 dark:text-sky-400 truncate">🖼️ ${safeLabel}</span>
                <div class="flex items-center gap-1.5 shrink-0">
                    ${navHtml}
                    <button type="button" onclick="window.MPPRenderer.toggleGallery('${gid}')" class="ml-1 text-slate-400 hover:text-red-500 text-xs font-bold bg-transparent border-none cursor-pointer">✕</button>
                </div>
            </div>
            <div class="mpp-gallery-viewport"></div>
            ${thumbsHtml}
        </div>`;
}

// ============================================================================
// 5. MAIN EXPORTED RENDERERS
// ============================================================================

// Lightweight inline formatter for Question Stems & MCQ Options
export function formatInlineMathAndBold(str) {
    if (!str) return "";
    let s = String(str)
        .replace(/[\u200B-\u200D\uFEFF]/g, "")
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

    if (typeof window.katex !== "undefined") {
        s = s.replace(/\\\\\(([\s\S]*?)\\\\\)|\\\(([\s\S]*?)\\\)/g, (m, g1, g2) => {
            try { return window.katex.renderToString((g1 ?? g2).trim(), { throwOnError: false }); } catch (_) { return m; }
        });
        s = s.replace(/\$([^\$\n]+?)\$/g, (m, g1) => {
            try { return window.katex.renderToString(g1.trim(), { throwOnError: false }); } catch (_) { return m; }
        });
    }
    return s;
}

// Full Unified Markdown + Math + Media + Gallery Renderer
export function renderContent(text) {
    if (!text) return "<em class='text-slate-400'>No answer provided yet.</em>";
    let s = String(text).replace(/[\u200B-\u200D\uFEFF]/g, "");

    const codeBlocks = [];
    const mathBlocks = [];
    const embedBlocks = [];
    const galleryBlocks = [];

    const pushEmbed = (html) => {
        embedBlocks.push(html);
        return `@@EMBED_${embedBlocks.length - 1}@@`;
    };

    // Step 1: Protect fenced code blocks (ASCII flowcharts)
    s = s.replace(/```[\s\S]*?```/g, (m) => {
        codeBlocks.push(m);
        return `@@CODE_${codeBlocks.length - 1}@@`;
    });

    // Step 2: Extract [[gallery:Label|url1|url2|...]] inline media shortcodes
    s = s.replace(/\[\[gallery:([^\]]+)\]\]/gi, (_, inner) => {
        const parts = inner.split("|").map(x => x.trim()).filter(Boolean);
        if (parts.length < 2) return "";
        const label = parts[0];
        const urls = parts.slice(1).map(normalizeMediaUrl).filter(Boolean);
        if (!urls.length) return "";
        galleryBlocks.push(buildInlineGalleryHtml(label, urls));
        return `@@GALLERY_${galleryBlocks.length - 1}@@`;
    });

    // Step 3: Extract & render KaTeX Math
    const storeMath = (latex, displayMode) => {
        let rendered = escapeHtml(latex);
        if (typeof window.katex !== "undefined") {
            try {
                rendered = window.katex.renderToString(latex.trim(), { displayMode, throwOnError: false, strict: false });
            } catch (_) {
                rendered = `<code>${escapeHtml(latex)}</code>`;
            }
        }
        mathBlocks.push(rendered);
        return `@@MATH_${mathBlocks.length - 1}@@`;
    };
    s = s.replace(/\\\\\[([\s\S]*?)\\\\\]|\\\[([\s\S]*?)\\\]/g, (_, a, b) => storeMath(a ?? b, true));
    s = s.replace(/\$\$([\s\S]*?)\$\$/g, (_, a) => storeMath(a, true));
    s = s.replace(/\\\\\(([\s\S]*?)\\\\\)|\\\(([\s\S]*?)\\\)/g, (_, a, b) => storeMath(a ?? b, false));
    s = s.replace(/\$([^\$\n]+?)\$/g, (_, a) => storeMath(a, false));

    // Step 4: Normalize Google Drive image markdown ![Alt](drive_url)
    s = s.replace(/!\[([^\]]*)\]\(https?:\/\/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)[^\)]*\)/gi, (_, alt, id) =>
        `![${alt || "Medical Image"}](https://lh3.googleusercontent.com/d/${id})`
    );

    // Step 5: Extract Markdown-wrapped Media & Docs (Safely skips ![...] images)
    s = s.replace(/(!?)\[([^\]]+)\]\((https?:\/\/[^\s\)]+|assets\/[^\s\)]+)\)/gi, (full, bang, title, url) => {
        if (bang === "!") return full;
        const ytId = extractYouTubeId(url);
        if (ytId) return pushEmbed(buildYouTubeCard(title, ytId));
        if (/\.(mp4|webm|ogg|mov|m4v)(?:\?|$)/i.test(url)) return pushEmbed(buildVideoCard(title, url));
        if (/\.(mp3|wav|m4a|aac|flac)(?:\?|$)/i.test(url)) return pushEmbed(buildAudioCard(title, url));
        const docM = url.match(/\.(pdf|docx?|pptx?|xlsx?|csv|txt|rtf|od[tps])(?:\?|$)/i);
        if (docM) return pushEmbed(buildDocCard(title, url, docM[1].toLowerCase()));
        if (/^https?:\/\/(?:drive|docs)\.google\.com\/(?:file|document|presentation|spreadsheets)\/d\/[a-zA-Z0-9_-]+/i.test(url)) {
            const dt = url.includes("/document/") ? "gdoc" : url.includes("/presentation/") ? "gslides" : url.includes("/spreadsheets/") ? "gsheets" : "gdrive";
            return pushEmbed(buildDocCard(title, url, dt));
        }
        return full;
    });

    // Step 6: Extract Raw Media & Doc URLs (Markdown links are already protected above)
    s = s.replace(/(^|\s)(https?:\/\/[^\s<"']+)/gi, (full, space, url) => {
        const ytId = extractYouTubeId(url);
        if (ytId) return `${space}${pushEmbed(buildYouTubeCard("YouTube Video", ytId))}`;
        if (/\.(mp4|webm|ogg|mov|m4v)(?:\?|$)/i.test(url)) {
            const name = decodeURIComponent(url.split("/").pop().split("?")[0]) || "Video";
            return `${space}${pushEmbed(buildVideoCard(name, url))}`;
        }
        if (/\.(mp3|wav|m4a|aac|flac)(?:\?|$)/i.test(url)) {
            const name = decodeURIComponent(url.split("/").pop().split("?")[0]) || "Audio Clip";
            return `${space}${pushEmbed(buildAudioCard(name, url))}`;
        }
        const docM = url.match(/\.(pdf|docx?|pptx?|xlsx?|csv|txt|rtf|od[tps])(?:\?|$)/i);
        if (docM) {
            const name = decodeURIComponent(url.split("/").pop().split("?")[0]) || "Document";
            return `${space}${pushEmbed(buildDocCard(name, url, docM[1].toLowerCase()))}`;
        }
        if (/^https?:\/\/(?:drive|docs)\.google\.com\/(?:file|document|presentation|spreadsheets)\/d\/[a-zA-Z0-9_-]+/i.test(url)) {
            const dt = url.includes("/document/") ? "gdoc" : url.includes("/presentation/") ? "gslides" : url.includes("/spreadsheets/") ? "gsheets" : "gdrive";
            const label = dt === "gdoc" ? "Google Doc" : dt === "gslides" ? "Google Slides" : dt === "gsheets" ? "Google Sheet" : "Google Drive File";
            return `${space}${pushEmbed(buildDocCard(label, url, dt))}`;
        }
        return full;
    });

    // Step 7: Restore code blocks, parse Markdown, wrap tables & sanitize with DOMPurify
    s = s.replace(/@@CODE_(\d+)@@/g, (_, i) => codeBlocks[Number(i)]);
    let html = typeof window.marked !== "undefined" ? window.marked.parse(s) : s;
    html = html
        .replace(/<table>/g, '<div class="markdown-table-wrapper"><table>')
        .replace(/<\/table>/g, "</table></div>");

    if (typeof window.DOMPurify !== "undefined") {
        html = window.DOMPurify.sanitize(html, {
            ADD_TAGS: ["mark"],
            ADD_ATTR: ["class", "target", "rel", "loading", "referrerpolicy"]
        });
    }

    // Ensure all Markdown-rendered <img> tags bypass external hotlink blocks
    html = html.replace(/<img(?![^>]*referrerpolicy)/gi, '<img referrerpolicy="no-referrer" loading="lazy"');

    // Step 8: Restore safe, pre-escaped Math, Media Embeds & Inline Galleries
    html = html.replace(/@@MATH_(\d+)@@/g, (_, i) => mathBlocks[Number(i)]);
    html = html.replace(/@@EMBED_(\d+)@@/g, (_, i) => embedBlocks[Number(i)]);
    html = html.replace(/@@GALLERY_(\d+)@@/g, (_, i) => galleryBlocks[Number(i)]);

    return html;
}
