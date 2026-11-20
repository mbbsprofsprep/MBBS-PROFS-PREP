// ==========================================
// app-shell.js - Centralized UI, Auth, Security, Math/Flowchart Renderer,
// Neuro-Recall Engine & Cross-Firebase Teen Patti Deck (MBBS Profs Prep <-> MedPYQ)
// ==========================================

// 0. AUTO-LOAD MARKED.JS, KATEX (MATH ENGINE) & JETBRAINS MONO FONT ON ALL PAGES
(function ensureDependencies() {
    if (typeof marked === 'undefined') {
        const markedScript = document.createElement('script');
        markedScript.src = "https://cdn.jsdelivr.net/npm/marked/marked.min.js";
        document.head.appendChild(markedScript);
    }

    if (!document.querySelector('link[href*="JetBrains+Mono"]')) {
        const fontLink = document.createElement('link');
        fontLink.rel = "stylesheet";
        fontLink.href = "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap";
        document.head.appendChild(fontLink);
    }

    if (!document.querySelector('link[href*="katex.min.css"]')) {
        const katexCss = document.createElement('link');
        katexCss.rel = "stylesheet";
        katexCss.href = "https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css";
        document.head.appendChild(katexCss);
    }

    if (typeof katex === 'undefined' && !document.querySelector('script[src*="katex.min.js"]')) {
        const katexScript = document.createElement('script');
        katexScript.src = "https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js";
        katexScript.onload = () => {
            if (window.displayData && window.displayData.length > 0) {
                if (typeof window.populateTable === 'function') window.populateTable();
                if (window.isDeckMode && typeof window.renderDeckCard === 'function') window.renderDeckCard();
            }
            if (window.neuroRecallApp && window.neuroRecallApp.isOpen && window.neuroRecallApp.currentItem) {
                window.neuroRecallApp.renderCard();
            }
        };
        document.head.appendChild(katexScript);
    }
})();

// 1. INJECT SCOPED CSS FOR 3D NEURO-RECALL FLASHCARDS, KATEX MATH, ASCII FLOWCHARTS & TEEN PATTI DECK
const neuroRecallAndMarkdownCSS = `
<style id="neuro-recall-styles">
    #neuro-recall-layer {
        display: none;
        position: fixed;
        inset: 0;
        background: #020617;
        color: #f8fafc;
        z-index: 25000;
        flex-direction: column;
        font-family: 'Plus Jakarta Sans', sans-serif;
        overflow: hidden;
    }
    #neuro-recall-layer.active {
        display: flex;
    }
    .nr-perspective {
        perspective: 1400px;
        -webkit-perspective: 1400px;
    }
    .nr-flipper {
        position: relative;
        width: 100%;
        height: 100%;
        transition: transform 0.6s cubic-bezier(0.4, 0.2, 0.2, 1);
        transform-style: preserve-3d;
        -webkit-transform-style: preserve-3d;
    }
    .nr-flipper.is-flipped {
        transform: rotateY(180deg);
        -webkit-transform: rotateY(180deg);
    }
    .nr-face {
        position: absolute;
        inset: 0;
        backface-visibility: hidden;
        -webkit-backface-visibility: hidden;
        background: #ffffff;
        color: #0f172a;
        border-radius: 20px;
        padding: 24px;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.45);
        border: 1px solid #e2e8f0;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        -webkit-transform: translate3d(0, 0, 0);
    }
    html.dark .nr-face {
        background: #0f172a;
        color: #f8fafc;
        border-color: #1e293b;
    }
    .nr-face-back {
        transform: rotateY(180deg) translate3d(0, 0, 0);
        -webkit-transform: rotateY(180deg) translate3d(0, 0, 0);
    }
    .nr-face img, .bm-flip-card img {
        max-width: 100% !important;
        height: auto !important;
        max-height: 260px !important;
        object-fit: contain;
        border-radius: 12px;
        margin: 12px auto;
        display: block;
        border: 1px solid #cbd5e1;
        background: #f8fafc;
        cursor: zoom-in;
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.08);
    }
    html.dark .nr-face img, html.dark .bm-flip-card img {
        border-color: #334155;
        background: #1e293b;
    }
    .nr-opt-btn {
        width: 100%;
        padding: 14px 16px;
        margin-bottom: 10px;
        border: 2px solid #e2e8f0;
        border-radius: 12px;
        background: #f8fafc;
        color: #334155;
        text-align: left;
        font-size: 0.95rem;
        font-weight: 600;
        cursor: pointer;
        display: flex;
        align-items: flex-start;
        gap: 12px;
        transition: all 0.2s ease;
    }
    html.dark .nr-opt-btn {
        background: rgba(30, 41, 59, 0.6);
        border-color: #1e293b;
        color: #e2e8f0;
    }
    .nr-opt-btn:hover {
        border-color: #0ea5e9;
        background: #f0f9ff;
    }
    html.dark .nr-opt-btn:hover {
        border-color: #38bdf8;
        background: rgba(14, 165, 233, 0.15);
    }
    .nr-grade-btn {
        flex: 1;
        padding: 14px 10px;
        border: none;
        border-radius: 14px;
        font-weight: 800;
        color: white;
        cursor: pointer;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        transition: transform 0.15s ease, filter 0.15s ease;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.25);
    }
    .nr-grade-btn:hover {
        transform: translateY(-2px);
        filter: brightness(1.08);
    }
    .nr-grade-btn:active {
        transform: scale(0.97);
    }
    .nr-brain-glow {
        text-shadow: 0 0 16px rgba(56, 189, 248, 0.9);
        transform: scale(1.15);
    }
    .bm-flip-scene {
        perspective: 1000px;
        -webkit-perspective: 1000px;
    }
    .bm-flip-card {
        position: relative;
        width: 100%;
        transition: transform 0.55s cubic-bezier(0.4, 0.2, 0.2, 1);
        transform-style: preserve-3d;
        -webkit-transform-style: preserve-3d;
        display: grid;
    }
    .bm-flip-card.is-flipped {
        transform: rotateY(180deg);
        -webkit-transform: rotateY(180deg);
    }
    .bm-flip-front, .bm-flip-back {
        grid-area: 1 / 1;
        backface-visibility: hidden;
        -webkit-backface-visibility: hidden;
        -webkit-transform: translate3d(0, 0, 0);
    }
    .bm-flip-back {
        transform: rotateY(180deg) translate3d(0, 0, 0);
        -webkit-transform: rotateY(180deg) translate3d(0, 0, 0);
    }

    /* ====================================================================
       GLOBAL MARKDOWN, LATEX MATH & ASCII FLOWCHART STYLES (ALL PAGES)
       ==================================================================== */
    .markdown-body { font-size: 0.925rem; line-height: 1.7; color: inherit; word-wrap: break-word; }
    .markdown-body h1 { font-size: 1.4rem; font-weight: 800; margin-top: 1.5em; margin-bottom: 0.6em; color: #0284c7; border-bottom: 2px solid #e0f2fe; padding-bottom: 0.3em; }
    .markdown-body h2 { font-size: 1.25rem; font-weight: 800; margin-top: 1.4em; margin-bottom: 0.5em; color: #0284c7; border-bottom: 1px solid #e0f2fe; padding-bottom: 0.25em; }
    .markdown-body h3 { font-size: 1.1rem; font-weight: 800; margin-top: 1.3em; margin-bottom: 0.5em; color: #0284c7; }
    .markdown-body h4 { font-size: 0.98rem; font-weight: 800; margin-top: 1.1em; margin-bottom: 0.4em; color: #0369a1; text-transform: uppercase; letter-spacing: 0.02em; }
    .markdown-body h5, .markdown-body h6 { font-size: 0.9rem; font-weight: 700; margin-top: 1em; margin-bottom: 0.4em; color: #0284c7; }
    
    html.dark .markdown-body h1, html.dark .markdown-body h2, html.dark .markdown-body h3 { color: #38bdf8; border-color: #1e293b; }
    html.dark .markdown-body h4, html.dark .markdown-body h5, html.dark .markdown-body h6 { color: #7dd3fc; }

    .markdown-body p { margin-bottom: 0.9em; }
    .markdown-body ul { list-style-type: disc; margin-left: 1.5em; margin-bottom: 1em; }
    .markdown-body ol { list-style-type: decimal; margin-left: 1.5em; margin-bottom: 1em; }
    .markdown-body ul ul, .markdown-body ol ul { list-style-type: circle; margin-top: 0.35em; margin-bottom: 0.35em; }
    .markdown-body ol ol, .markdown-body ul ol { list-style-type: lower-alpha; margin-top: 0.35em; margin-bottom: 0.35em; }
    .markdown-body li { margin-bottom: 0.35em; }
    .markdown-body li > p { margin-bottom: 0.35em; }

    .markdown-body strong { font-weight: 800; color: #0f172a; }
    html.dark .markdown-body strong { color: #ffffff; }
    .markdown-body em { font-style: italic; }

    .markdown-body hr { border: 0; border-top: 2px dashed #cbd5e1; margin: 1.75rem 0; }
    html.dark .markdown-body hr { border-top-color: #334155; }

    .markdown-body blockquote {
        border-left: 4px solid #0ea5e9;
        background: #f0f9ff;
        padding: 0.85rem 1.15rem;
        border-radius: 0 0.75rem 0.75rem 0;
        margin: 1rem 0;
        color: #0c4a6e;
        font-style: italic;
    }
    html.dark .markdown-body blockquote {
        background: rgba(14, 165, 233, 0.1);
        color: #bae6fd;
        border-left-color: #38bdf8;
    }

    .markdown-body pre {
        font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important;
        font-size: 0.78rem !important;
        line-height: 1.45 !important;
        background-color: #f8fafc !important;
        color: #0f172a !important;
        padding: 1rem 1.25rem !important;
        border-radius: 0.75rem !important;
        border: 1px solid #cbd5e1 !important;
        overflow-x: auto !important;
        white-space: pre !important;
        margin: 1.25rem 0 !important;
        box-shadow: inset 0 2px 4px 0 rgba(0, 0, 0, 0.03);
    }
    html.dark .markdown-body pre {
        background-color: #020617 !important;
        color: #38bdf8 !important;
        border-color: #1e293b !important;
    }
    .markdown-body code {
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.84em;
        background-color: #f1f5f9;
        color: #0284c7;
        padding: 0.15rem 0.4rem;
        border-radius: 0.375rem;
        border: 1px solid #e2e8f0;
    }
    html.dark .markdown-body code {
        background-color: #1e293b;
        color: #38bdf8;
        border-color: #334155;
    }
    .markdown-body pre code {
        background: transparent !important;
        color: inherit !important;
        padding: 0 !important;
        border: none !important;
        font-size: inherit !important;
    }

    .katex-display {
        overflow-x: auto;
        overflow-y: hidden;
        padding: 0.75rem 0.5rem;
        margin: 0.85rem 0 !important;
        background: #f8fafc;
        border-radius: 0.75rem;
        border: 1px solid #e2e8f0;
    }
    html.dark .katex-display {
        background: rgba(15, 23, 42, 0.7);
        border-color: #1e293b;
    }
    .katex { font-size: 1.05em; }

    /* ====================================================================
       < 1/16 > SUB-TOPIC PILL, TEEN PATTI FAN & REAL-TIME ADMIN EDITOR
       ==================================================================== */
    .mpp-cluster-pill {
        border-radius: 999px;
        border: 1.5px solid #0284c7;
        background: #f0f9ff;
        color: #0369a1;
        font-weight: 800;
        font-size: 11.5px;
        display: inline-flex;
        align-items: center;
        overflow: hidden;
        user-select: none;
        -webkit-user-select: none;
        box-shadow: 0 1px 2px rgba(2, 132, 199, 0.12);
    }
    html.dark .mpp-cluster-pill {
        background: #0f172a;
        border-color: #38bdf8;
        color: #38bdf8;
    }
    .mpp-cluster-pill.pill-fan-active {
        background: #0284c7 !important;
        color: #ffffff !important;
        border-color: #0284c7 !important;
    }
    .mpp-cluster-pill.pill-fan-active .mpp-cluster-btn,
    .mpp-cluster-pill.pill-fan-active .mpp-cluster-count {
        color: #ffffff !important;
    }
    .mpp-cluster-btn {
        background: transparent;
        border: none;
        color: inherit;
        font-weight: 900;
        font-size: 12px;
        padding: 3px 8px;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        line-height: 1;
        transition: background 0.15s;
    }
    .mpp-cluster-btn:hover:not(:disabled) { background: rgba(14, 165, 233, 0.15); }
    .mpp-cluster-btn:disabled { opacity: 0.35; cursor: default; }
    .mpp-cluster-count {
        padding: 3px 8px;
        cursor: pointer;
        font-weight: 800;
        font-size: 11.5px;
        color: inherit;
        line-height: 1;
        border-left: 1px solid rgba(14, 165, 233, 0.3);
        border-right: 1px solid rgba(14, 165, 233, 0.3);
        transition: background 0.15s;
    }
    .mpp-cluster-count:hover { background: rgba(14, 165, 233, 0.2); }

    /* Multi-Dimensional Topic Bar */
    .mpp-topic-dims-bar {
        display: flex;
        align-items: center;
        gap: 6px;
        flex-wrap: wrap;
        margin: 0 0 12px 0;
        padding: 6px 10px;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 10px;
    }
    html.dark .mpp-topic-dims-bar {
        background: rgba(15, 23, 42, 0.7);
        border-color: #1e293b;
    }
    .mpp-topic-dim-pill {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 4px 10px;
        border-radius: 999px;
        border: 1.5px solid #cbd5e1;
        background: #ffffff;
        color: #475569;
        font-size: 11px;
        font-weight: 800;
        cursor: pointer;
        transition: all 0.15s ease;
    }
    html.dark .mpp-topic-dim-pill {
        background: #1e293b;
        border-color: #334155;
        color: #cbd5e1;
    }
    .mpp-topic-dim-pill.active {
        background: #0284c7;
        border-color: #0284c7;
        color: #ffffff;
        box-shadow: 0 2px 6px rgba(2, 132, 199, 0.25);
    }
    .mpp-topic-dim-count {
        font-size: 9.5px;
        padding: 1px 6px;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.25);
        font-weight: 900;
    }
    .mpp-topic-dim-pill:not(.active) .mpp-topic-dim-count {
        background: #f1f5f9;
        color: #0284c7;
    }
    html.dark .mpp-topic-dim-pill:not(.active) .mpp-topic-dim-count {
        background: #0f172a;
        color: #38bdf8;
    }

    /* Teen Patti Stage & Cards */
    .mpp-body-under-fan {
        opacity: 0.28;
        filter: blur(0.4px);
        pointer-events: none;
        transition: opacity 0.22s ease;
    }
    .tp-parent-overlay {
        position: relative;
        margin-top: -190px;
        margin-bottom: 16px;
        z-index: 40;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: flex-start;
        animation: tpFadeIn 0.22s ease;
    }
    @keyframes tpFadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }

    .tp-fan-stage {
        position: relative;
        width: 100%;
        max-width: 520px;
        height: 420px;
        margin: 10px auto 22px auto;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: visible;
        touch-action: pan-y;
        user-select: none;
        -webkit-user-select: none;
    }
    .tp-patti {
        position: absolute;
        width: 240px;
        height: 355px;
        background: #ffffff;
        color: #0f172a;
        border: 2.5px solid var(--tp-border-color, #0ea5e9);
        border-radius: 14px;
        box-shadow: 0 12px 30px rgba(15, 23, 42, 0.22);
        padding: 14px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        cursor: pointer;
        transform-origin: 50% 105%;
        transition: transform 0.28s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.28s ease;
        will-change: transform;
        overflow: hidden;
    }
    html.dark .tp-patti {
        background: #0f172a;
        color: #f8fafc;
        box-shadow: 0 12px 30px rgba(0, 0, 0, 0.55);
    }
    .tp-wing-strip {
        position: absolute;
        top: 8px;
        bottom: 12px;
        width: 34px;
        display: flex;
        flex-direction: column;
        align-items: center;
        pointer-events: none;
    }
    .tp-wing-strip.left { left: 4px; align-items: flex-start; }
    .tp-wing-strip.right { right: 4px; align-items: flex-end; }
    .tp-wing-seq {
        font-size: 9.5px;
        font-weight: 800;
        color: #0f172a;
        background: #f1f5f9;
        border: 1px solid #cbd5e1;
        border-radius: 4px;
        padding: 1px 4px;
        line-height: 1.1;
        margin-bottom: 3px;
        white-space: nowrap;
    }
    html.dark .tp-wing-seq {
        background: #1e293b;
        color: #f8fafc;
        border-color: #334155;
    }
    .tp-wing-uid {
        font-size: 9.5px;
        font-weight: 800;
        color: var(--tp-border-color, #0ea5e9);
        margin-bottom: 6px;
        white-space: nowrap;
    }
    .tp-wing-lines {
        display: flex;
        flex-direction: column;
        gap: 5px;
        width: 22px;
        margin-top: 2px;
    }
    .tp-wing-line {
        height: 3px;
        background: #cbd5e1;
        border-radius: 2px;
        width: 100%;
    }
    html.dark .tp-wing-line { background: #334155; }
    .tp-wing-box {
        height: 13px;
        border: 1.5px solid #cbd5e1;
        border-radius: 3px;
        width: 18px;
        margin-top: 3px;
        background: #f8fafc;
    }
    html.dark .tp-wing-box { border-color: #334155; background: #1e293b; }

    .tp-center-top {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 6px;
        gap: 6px;
    }
    .tp-seq-badge {
        background: #0284c7;
        color: #ffffff;
        font-weight: 800;
        font-size: 10.5px;
        padding: 2px 8px;
        border-radius: 999px;
    }
    .tp-qid-badge {
        background: #f8fafc;
        border: 1.5px solid var(--tp-border-color, #0ea5e9);
        color: #0f172a;
        font-weight: 800;
        font-size: 10.5px;
        padding: 2px 7px;
        border-radius: 6px;
    }
    html.dark .tp-qid-badge { background: #1e293b; color: #f8fafc; }

    .tp-center-stem {
        overflow: hidden;
        display: -webkit-box;
        -webkit-line-clamp: 5;
        -webkit-box-orient: vertical;
        font-size: 12px;
        font-weight: 600;
        color: inherit;
        line-height: 1.38;
        margin-bottom: 6px;
        text-align: left;
    }
    .tp-center-opts {
        display: flex;
        flex-direction: column;
        gap: 4px;
        flex: 1;
        justify-content: center;
    }
    .tp-mini-opt {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 4px 7px;
        border: 1.5px solid #cbd5e1;
        border-radius: 7px;
        background: #f8fafc;
        font-size: 10.5px;
        color: #334155;
        font-weight: 600;
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
    }
    html.dark .tp-mini-opt {
        background: #1e293b;
        border-color: #334155;
        color: #cbd5e1;
    }
    .tp-mini-opt-char {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #e2e8f0;
        color: #0f172a;
        font-weight: 800;
        font-size: 9.5px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
    }
    html.dark .tp-mini-opt-char { background: #334155; color: #f8fafc; }

    .tp-center-bottom {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 3px;
        margin-top: 6px;
        padding-top: 5px;
        border-top: 1px dashed #cbd5e1;
    }
    html.dark .tp-center-bottom { border-top-color: #334155; }
    .tp-exam-pill {
        font-size: 9.5px;
        font-weight: 800;
        padding: 2px 8px;
        border-radius: 999px;
        max-width: 100%;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    .tp-tap-hint {
        font-size: 9.5px;
        font-weight: 700;
        color: #64748b;
    }

    .tp-admin-extended-section {
        width: 100%;
        max-width: 560px;
        margin: 5px auto 12px auto;
        padding: 12px 8px 10px 8px;
        background: rgba(255, 255, 255, 0.94);
        border: 1.5px dashed #cbd5e1;
        border-radius: 16px;
    }
    html.dark .tp-admin-extended-section {
        background: rgba(15, 23, 42, 0.94);
        border-color: #334155;
    }
    .tp-admin-switcher {
        border: 2px solid #ea580c;
        border-radius: 10px;
        background: #fff7ed;
        padding: 6px 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 5px;
        flex-wrap: wrap;
        max-width: 500px;
        margin: 0 auto 25px auto;
    }
    html.dark .tp-admin-switcher { background: #1e293b; }
    .tp-switch-btn {
        background: #ffffff;
        border: 1.5px solid #fdba74;
        color: #9a3412;
        font-weight: 800;
        font-size: 11px;
        padding: 4px 9px;
        border-radius: 6px;
        cursor: pointer;
    }
    .tp-switch-btn.active {
        background: #ea580c;
        color: #ffffff;
        border-color: #ea580c;
    }
    .tp-exam-label-box {
        border: 2px solid #ea580c;
        background: #ffffff;
        color: #0f172a;
        font-weight: 800;
        font-size: 12px;
        letter-spacing: 0.8px;
        padding: 5px 24px;
        border-radius: 6px;
        margin: -8px auto 30px auto;
        width: fit-content;
        text-align: center;
        text-transform: uppercase;
    }
    html.dark .tp-exam-label-box { background: #0f172a; color: #f8fafc; }
    .tp-empty-fan-box {
        width: 240px;
        height: 200px;
        border: 2px dashed var(--tp-border-color, #94a3b8);
        border-radius: 14px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        color: #64748b;
        font-weight: 700;
        font-size: 12px;
        background: rgba(255,255,255,0.75);
        padding: 18px;
        text-align: center;
    }
    html.dark .tp-empty-fan-box { background: rgba(15, 23, 42, 0.75); color: #94a3b8; }

    /* Real-Time Admin MCQ & Explanation Editor */
    .admin-rt-toolbar {
        margin-top: 14px;
        padding: 10px 12px;
        background: #fff7ed;
        border: 1.5px solid #fdba74;
        border-radius: 12px;
    }
    html.dark .admin-rt-toolbar {
        background: rgba(30, 41, 59, 0.85);
        border-color: #ea580c;
    }
    .admin-rt-btn-toggle {
        background: #ea580c;
        color: white;
        border: none;
        padding: 6px 12px;
        border-radius: 7px;
        font-size: 11.5px;
        font-weight: 800;
        cursor: pointer;
    }
    .admin-rt-btn-hist {
        background: white;
        color: #9a3412;
        border: 1.5px solid #fdba74;
        padding: 5px 9px;
        border-radius: 7px;
        font-size: 11px;
        font-weight: 800;
        cursor: pointer;
    }
    html.dark .admin-rt-btn-hist { background: #0f172a; color: #fdba74; }
    .admin-rt-btn-hist:disabled { opacity: 0.4; cursor: default; }
    .admin-key-pill {
        width: 32px;
        height: 28px;
        border-radius: 6px;
        border: 1.5px solid #cbd5e1;
        background: white;
        color: #0f172a;
        font-weight: 800;
        font-size: 12px;
        cursor: pointer;
    }
    html.dark .admin-key-pill { background: #0f172a; color: #f8fafc; border-color: #334155; }
    .admin-key-pill.active {
        background: #16a34a !important;
        color: white !important;
        border-color: #16a34a !important;
    }
    .admin-topic-chip-btn {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        background: #f0f9ff;
        border: 1px solid #bae6fd;
        color: #0369a1;
        font-size: 11px;
        font-weight: 800;
        padding: 4px 9px;
        border-radius: 999px;
        cursor: pointer;
    }
    html.dark .admin-topic-chip-btn { background: #1e293b; border-color: #0284c7; color: #38bdf8; }
</style>
`;
document.head.insertAdjacentHTML('beforeend', neuroRecallAndMarkdownCSS);

// 2. INJECT THE NAVBAR, SIDEBAR, LIGHTBOX, NEURO-RECALL LAYER & ADMIN LINKER MODAL HTML
const appShellHTML = `
    <nav class="fixed top-0 w-full z-50 border-b border-brand-100 dark:border-slate-800 bg-white/90 dark:bg-dark-bg/95 backdrop-blur-md transition-colors">
        <div class="w-full px-4 md:px-6 py-3 flex justify-between items-center max-w-7xl mx-auto">
            <div class="flex items-center gap-3 md:gap-4">
                <button onclick="window.userPanelApp.toggle()" class="p-2 -ml-2 rounded-xl hover:bg-brand-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
                </button>
                <a href="index.html" class="flex items-center gap-3 group cursor-pointer">
                    <img class="w-9 h-9 md:w-10 md:h-10 rounded-xl shadow-lg shadow-accent-yellow/20 object-cover ring-2 ring-offset-2 ring-accent-yellow transition-transform group-hover:scale-105" src="https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEgFbo8CVZSf-ejwVGTTTGeu1B5bJj4JGloqdh70o21Tf_895kWYOvNmyE9cnAAR66r77ZFZZKTslF6QIp4F-bWxPsXjGsAWzwc75D6VnXqFMbi-4NgUazELmMWeyX3ApASZncrHUFjni62u4spE3g19Pfcbsy-h5iUTfxTXWWTEYPgaD47kLMDA43e1SMQ/s678/1000126459.jpg" alt="Logo">
                    <div class="leading-tight">
                        <h1 class="font-bold text-base md:text-lg tracking-tight text-slate-900 dark:text-white">MBBS <span class="text-brand-400">Profs Prep</span></h1>
                        <p class="text-[9px] md:text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mt-0.5">Central Portal</p>
                    </div>
                </a>
            </div>
            <div class="hidden md:block flex-1 max-w-md mx-8">
                <input oninput="window.handleGlobalSearch(this.value)" class="w-full px-4 py-2 bg-brand-50 dark:bg-dark-surface border border-brand-100 dark:border-slate-700 rounded-full focus:ring-2 focus:ring-brand-400 outline-none transition-all text-sm text-slate-900 dark:text-white placeholder-slate-400" id="globalSearch" placeholder="Search Institute or Questions..." type="text"/>
            </div>
            <div class="flex items-center gap-2 md:gap-3">
                <button id="nav-neuro-due-btn" onclick="window.neuroRecallApp.open('due')" class="hidden items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/15 hover:bg-amber-500/25 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-xs font-extrabold transition-all shadow-sm">
                    <span>🧠</span>
                    <span><span id="nav-neuro-due-count">0</span> Due</span>
                </button>
                <button class="w-10 h-10 rounded-full flex items-center justify-center hover:bg-brand-50 dark:hover:bg-white/10 text-xl transition-all text-accent-yellow" onclick="window.toggleTheme()">
                    <span id="theme-icon">🌙</span>
                </button>
            </div>
        </div>
    </nav>

    <aside class="fixed top-0 left-0 h-full z-[10005] bg-white dark:bg-dark-surface shadow-2xl transform -translate-x-full transition-transform duration-300 flex flex-col border-r border-brand-100 dark:border-slate-800 w-full sm:w-[350px] lg:w-[400px]" id="user-panel-drawer">
        <div class="px-4 py-4 border-b border-brand-100 dark:border-slate-800 flex justify-between items-center bg-brand-50 dark:bg-dark-bg shrink-0">
            <h2 class="font-bold text-lg text-slate-900 dark:text-white tracking-tight">My Account</h2>
            <button onclick="window.userPanelApp.close()" class="p-2 rounded-lg text-slate-400 hover:bg-white dark:hover:bg-slate-800 hover:text-red-500 transition-colors">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
        </div>
        <div class="flex-1 overflow-y-auto p-4 custom-scrollbar bg-slate-50 dark:bg-dark-bg" id="user-panel-body"></div>
        <div class="p-4 border-t border-brand-100 dark:border-slate-800 bg-brand-50 dark:bg-dark-bg shrink-0" id="user-panel-footer"></div>
    </aside>
    <div class="fixed inset-0 z-[10004] bg-slate-900/60 backdrop-blur-sm opacity-0 pointer-events-none transition-opacity duration-300" id="user-panel-backdrop" onclick="window.userPanelApp.close()"></div>

    <!-- FULL-SCREEN NEURO-ADAPTIVE RECALL OVERLAY -->
    <div id="neuro-recall-layer">
        <header class="px-4 md:px-6 pt-5 pb-3 flex justify-between items-center border-b border-slate-800 bg-slate-950/80 shrink-0">
            <div class="flex items-center gap-2.5">
                <span class="text-2xl">🧠</span>
                <div>
                    <h2 class="font-extrabold text-base md:text-lg text-white tracking-tight leading-none">Neuro-Recall</h2>
                    <p class="text-[10px] text-sky-400 font-bold uppercase tracking-widest mt-1">Spaced Repetition Flashcards</p>
                </div>
            </div>
            <div class="flex items-center gap-2">
                <div id="nr-admin-header-toggle" class="hidden items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-700 mr-1">
                    <span class="text-[10px] font-black text-amber-400 uppercase tracking-wider">Public Access</span>
                    <label class="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" id="nr-header-toggle-input" class="sr-only peer" onchange="window.toggleGlobalNeuroRecall()">
                        <div class="w-8 h-4 bg-slate-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-500"></div>
                    </label>
                </div>
                <button onclick="window.neuroRecallApp.promptExamDate()" class="px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 transition-colors" title="Set Target Exam Date">
                    📅 <span id="nr-exam-days-label">90d to Exam</span>
                </button>
                <button onclick="window.neuroRecallApp.close()" class="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors">
                    Save & Exit ✕
                </button>
            </div>
        </header>

        <div class="px-4 pt-3 pb-2 max-w-3xl w-full mx-auto flex gap-2.5 shrink-0">
            <button id="nr-mode-due" onclick="window.neuroRecallApp.setMode('due')" class="flex-1 py-2.5 rounded-xl font-extrabold text-xs uppercase tracking-wider transition-all bg-sky-500 text-white shadow-lg shadow-sky-500/25">
                Due Today (<span id="nr-due-count">0</span>)
            </button>
            <button id="nr-mode-all" onclick="window.neuroRecallApp.setMode('all')" class="flex-1 py-2.5 rounded-xl font-extrabold text-xs uppercase tracking-wider transition-all bg-slate-800/80 text-slate-400 hover:text-white">
                Full Vault (<span id="nr-all-count">0</span>)
            </button>
        </div>

        <div id="nr-progress-section" class="px-4 py-1 max-w-3xl w-full mx-auto shrink-0">
            <div class="flex items-center gap-3">
                <span id="nr-brain-icon" class="text-xl transition-all duration-300">⚡</span>
                <div class="h-2 flex-1 bg-slate-800 rounded-full overflow-hidden">
                    <div id="nr-prog-fill" class="h-full bg-gradient-to-r from-sky-500 to-cyan-300 w-0 transition-all duration-300"></div>
                </div>
                <span id="nr-prog-text" class="text-xs font-bold text-slate-400">0 / 0 Synapses</span>
            </div>
        </div>

        <div id="nr-done-state" class="hidden flex-1 flex-col items-center justify-center text-center p-6 max-w-md mx-auto">
            <div class="w-24 h-24 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center text-4xl mb-5 shadow-lg shadow-emerald-500/20">
                ⚡
            </div>
            <h3 class="text-2xl font-black text-white mb-2" id="nr-done-title">Synapses Strengthened!</h3>
            <p class="text-sm text-slate-400 leading-relaxed mb-6" id="nr-done-desc">You have completed all due active recall flashcards for today.</p>
            <div class="flex flex-col sm:flex-row gap-3 w-full">
                <button onclick="window.neuroRecallApp.setMode('all')" class="flex-1 py-3.5 px-6 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-extrabold text-sm shadow-lg shadow-sky-500/25 transition-all">
                    Cram Full Vault
                </button>
                <button onclick="window.neuroRecallApp.close()" class="flex-1 py-3.5 px-6 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm transition-all">
                    Return to Study
                </button>
            </div>
        </div>

        <div id="nr-card-stage" class="flex-1 px-4 py-3 max-w-3xl w-full mx-auto flex flex-col min-h-0 nr-perspective">
            <div id="nr-flipper" class="nr-flipper flex-1">
                <div id="nr-card-front" class="nr-face custom-scrollbar"></div>
                <div id="nr-card-back" class="nr-face nr-face-back custom-scrollbar"></div>
            </div>
        </div>

        <footer id="nr-footer" class="px-4 py-3 pb-6 bg-slate-950/90 border-t border-slate-800 shrink-0">
            <div class="max-w-3xl mx-auto">
                <div id="nr-footer-prompt" class="text-center text-xs font-bold text-slate-400 py-2">
                    Select an option or reveal the answer to test your active recall.
                </div>
                <div id="nr-footer-wrong" class="hidden gap-3">
                    <button onclick="window.neuroRecallApp.grade(0)" class="nr-grade-btn bg-red-600">
                        <span class="text-sm md:text-base">🔄 Review Later</span>
                        <span class="text-[10px] opacity-90 uppercase tracking-wider mt-0.5 font-semibold">Synaptic strength reset (Re-queue)</span>
                    </button>
                </div>
                <div id="nr-footer-correct" class="hidden gap-2.5 md:gap-3">
                    <button onclick="window.neuroRecallApp.grade(0)" class="nr-grade-btn bg-red-600">
                        <span class="text-xs md:text-sm">🔄 Again</span>
                        <span class="text-[10px] opacity-90 uppercase tracking-wider mt-0.5 font-semibold">Reset Step</span>
                    </button>
                    <button onclick="window.neuroRecallApp.grade(1)" class="nr-grade-btn bg-amber-500">
                        <span class="text-xs md:text-sm">🤔 Hard / Guessed</span>
                        <span id="nr-time-guess" class="text-[10px] opacity-90 uppercase tracking-wider mt-0.5 font-semibold">+1d</span>
                    </button>
                    <button onclick="window.neuroRecallApp.grade(2)" class="nr-grade-btn bg-emerald-600">
                        <span class="text-xs md:text-sm">⚡ Nailed It</span>
                        <span id="nr-time-mastered" class="text-[10px] opacity-90 uppercase tracking-wider mt-0.5 font-semibold">+4d</span>
                    </button>
                </div>
            </div>
        </footer>
    </div>

    <!-- ADMIN MULTI-DIMENSIONAL SUB-TOPIC & CROSS-FIREBASE LINKER MODAL -->
    <div id="mpp-admin-link-modal" onclick="if(event.target===this) this.classList.add('hidden')" class="hidden fixed inset-0 z-[32000] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 w-full max-w-md shadow-2xl flex flex-col max-h-[90vh] text-left">
            <div class="flex justify-between items-center mb-2">
                <h3 class="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <span class="text-orange-500">🔗</span> Multi-Topic &amp; MedPYQ Linker
                </h3>
                <button onclick="document.getElementById('mpp-admin-link-modal').classList.add('hidden')" class="text-slate-400 hover:text-red-500 font-bold text-xl leading-none bg-transparent border-none cursor-pointer">&times;</button>
            </div>
            <div class="flex items-center justify-between gap-2 mb-3">
                <p id="mpp-admin-link-subtitle" class="text-xs font-bold text-slate-500 dark:text-slate-400 m-0"></p>
                <span id="mpp-bridge-status-badge" onclick="window.MPP_promptBridgeAuth()" class="text-[10px] font-extrabold px-2 py-0.5 rounded-full cursor-pointer bg-amber-100 text-amber-700 border border-amber-300" title="Click to connect MedPYQ Bridge if needed">⚡ MedPYQ Bridge</span>
            </div>

            <div class="mb-2.5">
                <div class="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">Existing Sub-Topics in Subject (Tap to Load / Append):</div>
                <div id="mpp-admin-topic-chips" class="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto p-1 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700"></div>
            </div>

            <label class="text-[10px] font-extrabold text-slate-600 dark:text-slate-300 uppercase tracking-wider block mb-1">
                One Topic Per Line (<span class="text-sky-500">Topic Name: DGT1, DGM17, N27, IN45...</span>)
            </label>
            <textarea id="mpp-admin-link-input" rows="4" placeholder="Otosclerosis: DGT5, DGT21, DGM17, N45, IN12, CMS8&#10;Audiometry: DGT8, DGM7, N88" class="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-sky-500 resize-y mb-2"></textarea>
            <p class="text-[10px] text-slate-500 dark:text-slate-400 mb-3 leading-snug">
                ⚡ Normal users see AIIMS Profs QIDs (<code class="px-1 bg-slate-100 dark:bg-slate-800 rounded">DGT</code>/<code class="px-1 bg-slate-100 dark:bg-slate-800 rounded">DGM</code>). Admins see AIIMS + NEET-PG (<code class="px-1 bg-slate-100 dark:bg-slate-800 rounded">N</code>), INI-CET (<code class="px-1 bg-slate-100 dark:bg-slate-800 rounded">IN</code>), CMS (<code class="px-1 bg-slate-100 dark:bg-slate-800 rounded">CMS</code>) &amp; FMGE (<code class="px-1 bg-slate-100 dark:bg-slate-800 rounded">F</code>) synced across both apps!
            </p>

            <div class="flex gap-2 mb-3">
                <button onclick="document.getElementById('mpp-admin-link-modal').classList.add('hidden')" class="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs border-none cursor-pointer">Cancel</button>
                <button id="btn-mpp-save-links" onclick="window.MPP_saveCrossLinks()" class="flex-1 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-extrabold text-xs border-none cursor-pointer shadow-md">Apply &amp; Sync Both Apps</button>
            </div>

            <div class="border-t border-slate-200 dark:border-slate-800 pt-2.5 flex-1 overflow-y-auto min-h-[100px]">
                <div class="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-2">🔄 Last 10 Changes (1-Click Undo)</div>
                <div id="mpp-admin-link-history" class="space-y-1.5"></div>
            </div>
        </div>
    </div>

    <!-- IMAGE ZOOM LIGHTBOX FOR FLASHCARDS -->
    <div id="nr-image-lightbox" onclick="if(event.target===this) this.classList.add('hidden')" class="hidden fixed inset-0 z-[35000] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
        <button onclick="document.getElementById('nr-image-lightbox').classList.add('hidden')" class="absolute top-5 right-5 w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 text-white text-xl font-bold flex items-center justify-center border-none cursor-pointer">✕</button>
        <img id="nr-lightbox-img" src="" class="max-w-[95vw] max-h-[90vh] object-contain rounded-xl shadow-2xl" alt="Zoomed Medical Image">
    </div>
`;

document.body.insertAdjacentHTML('afterbegin', appShellHTML);

// 3. GLOBALS & CONSTANTS
const APP_LOGO_URL = "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEgFbo8CVZSf-ejwVGTTTGeu1B5bJj4JGloqdh70o21Tf_895kWYOvNmyE9cnAAR66r77ZFZZKTslF6QIp4F-bWxPsXjGsAWzwc75D6VnXqFMbi-4NgUazELmMWeyX3ApASZncrHUFjni62u4spE3g19Pfcbsy-h5iUTfxTXWWTEYPgaD47kLMDA43e1SMQ/s678/1000126459.jpg";
window.ADMIN_EMAILS = [
    "pankajmahto109@gmail.com",
    "educateindiainstitute@gmail.com",
    "pankajkumarmahto1009@gmail.com"
];

window.globalNeuroRecallEnabled = false;
window.subjectJsonCache = {};

window.isUserAdmin = function(user = window.currentUserObj) {
    return Boolean(user && user.email && window.ADMIN_EMAILS.includes(user.email.toLowerCase().trim()));
};

window.canAccessNeuroRecall = function() {
    return window.isUserAdmin() || Boolean(window.globalNeuroRecallEnabled);
};

window.openNrLightbox = function(imgSrc) {
    if (!imgSrc) return;
    const lb = document.getElementById('nr-image-lightbox');
    const img = document.getElementById('nr-lightbox-img');
    if (lb && img) {
        img.src = imgSrc;
        lb.classList.remove('hidden');
    }
};

document.addEventListener('click', (e) => {
    const checkoutLink = e.target.closest('a[href*="checkout.html"]');
    if (checkoutLink) {
        e.preventDefault();
        window.openSecureCheckout(e);
        return;
    }

    if (e.target && e.target.tagName === 'IMG' && (e.target.closest('.nr-face') || e.target.closest('.bm-flip-card'))) {
        e.stopPropagation();
        window.openNrLightbox(e.target.src);
    }
});

if (localStorage.getItem('theme') === 'dark') {
    document.documentElement.classList.add('dark');
    const icon = document.getElementById('theme-icon');
    if (icon) icon.innerText = '☀️';
}

// ====================================================
// 4. SPACED REPETITION MATH & ADMIN TOGGLE ENGINE
// ====================================================
window.toggleGlobalNeuroRecall = async function() {
    if (!window.isUserAdmin() || !window.db) return;
    const newState = !window.globalNeuroRecallEnabled;
    try {
        const { ref, set } = await import("https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js");
        await set(ref(window.db, `settings/global/showNeuroRecall`), newState);
    } catch (e) {
        console.error("Failed to toggle Neuro-Recall setting:", e);
        alert("Failed to update setting: " + e.message);
    }
};

window.getDaysToExam = function() {
    const targetDateStr = localStorage.getItem('mbbs_target_date');
    if (targetDateStr) {
        const targetTime = new Date(targetDateStr).getTime();
        const diffDays = Math.ceil((targetTime - Date.now()) / 86400000);
        if (!isNaN(diffDays) && diffDays >= 1) return diffDays;
    }
    return 90;
};

window.calculateNextReviewDate = function(currentStep) {
    const now = Date.now();
    const msPerDay = 86400000;
    const daysRemaining = window.getDaysToExam();
    let nextIntervalDays = 1;
    if (currentStep <= 1) nextIntervalDays = 1;
    else if (currentStep === 2) nextIntervalDays = Math.max(1, Math.round(daysRemaining * 0.10));
    else if (currentStep === 3) nextIntervalDays = Math.max(1, Math.round(daysRemaining * 0.20));
    else if (currentStep >= 4) nextIntervalDays = 21;
    return now + (nextIntervalDays * msPerDay);
};

window.getDueBookmarksCount = function() {
    const bookmarks = window.userBookmarks || {};
    const now = Date.now();
    let due = 0;
    Object.values(bookmarks).forEach(bm => {
        if (!bm) return;
        const nextRev = bm.next_review_date || 0;
        if (now >= nextRev) due++;
    });
    return due;
};

window.updateNeuroDueBadges = function() {
    const dueCount = window.getDueBookmarksCount();
    const totalCount = Object.keys(window.userBookmarks || {}).length;
    const navBtn = document.getElementById('nav-neuro-due-btn');
    const navCount = document.getElementById('nav-neuro-due-count');

    const headerAdminWrap = document.getElementById('nr-admin-header-toggle');
    const headerToggleInput = document.getElementById('nr-header-toggle-input');
    if (headerAdminWrap) {
        const isAdm = window.isUserAdmin();
        headerAdminWrap.classList.toggle('hidden', !isAdm);
        headerAdminWrap.classList.toggle('flex', isAdm);
    }
    if (headerToggleInput) {
        headerToggleInput.checked = Boolean(window.globalNeuroRecallEnabled);
    }

    if (navBtn && navCount) {
        if (window.currentUserObj && totalCount > 0 && window.canAccessNeuroRecall()) {
            navCount.innerText = dueCount > 0 ? dueCount : totalCount;
            navBtn.onclick = () => window.neuroRecallApp.open(dueCount > 0 ? 'due' : 'all');
            navBtn.classList.remove('hidden');
            navBtn.classList.add('flex');
        } else {
            navBtn.classList.add('hidden');
            navBtn.classList.remove('flex');
        }
    }
};

// ====================================================
// 5. IMAGE & RICH STEM RECOVERY FOR BOOKMARKS
// ====================================================
window.recoverRichQuestionData = async function(bm) {
    if (!bm) return { stemHtml: "Saved Question", ansImage: null, img: null };

    let stemHtml = bm.stemHtml || bm.text || "Saved Question";
    let ansImage = bm.ans_image || null;
    let img = bm.img || null;

    if (Array.isArray(window.qnaData) && bm.q) {
        const localMatch = window.qnaData.find(x => x && x.q === bm.q);
        if (localMatch) {
            if (localMatch.stem) stemHtml = localMatch.stem;
            if (localMatch.ans_image) ansImage = localMatch.ans_image;
            if (localMatch.img) img = localMatch.img;
            return { stemHtml, ansImage, img };
        }
    }

    if (!stemHtml.includes('<img') && bm.q) {
        try {
            let colCode = bm.collegeCode;
            let subCode = bm.subjectCode;
            if ((!colCode || !subCode) && bm.subject) {
                const parts = bm.subject.split(' - ');
                if (parts[0]) colCode = parts[0].replace(/^AIIMS\s+/i, '').trim().toLowerCase().replace(/\s+/g, '-');
                if (parts[1]) subCode = parts[1].replace(/\s+Clinical$/i, '').trim().toLowerCase();
            }
            if (colCode && subCode && !subCode.includes('clinical')) {
                const fileName = `${subCode.toLowerCase()}_aiims_${colCode.toLowerCase()}_data.json`;
                if (!window.subjectJsonCache[fileName]) {
                    const res = await fetch(fileName);
                    if (res.ok) {
                        const json = await res.json();
                        window.subjectJsonCache[fileName] = json.qnaData || [];
                    } else {
                        window.subjectJsonCache[fileName] = [];
                    }
                }
                const found = window.subjectJsonCache[fileName].find(x => x && x.q === bm.q);
                if (found) {
                    if (found.stem) stemHtml = found.stem;
                    if (found.ans_image) ansImage = found.ans_image;
                    if (found.img) img = found.img;
                }
            }
        } catch (e) {}
    }

    return { stemHtml, ansImage, img };
};
// ====================================================
// 6. NEURO-ADAPTIVE RECALL FLASHCARD ENGINE
// ====================================================
window.neuroRecallApp = {
    isOpen: false,
    isCramMode: false,
    queue: [],
    totalInSession: 0,
    sessionAnswered: new Set(),
    currentItem: null,
    calcGuessDays: 1,
    calcMasteredDays: 4,

    open: function(mode = 'due') {
        if (!window.currentUserObj) {
            window.userPanelApp.open();
            window.toggleAuthMode('login');
            return;
        }
        if (!window.canAccessNeuroRecall()) {
            if (window.showModal) {
                window.showModal("Coming Soon", "<p class='text-sm text-slate-500'>Neuro-Recall Flashcards are currently being prepared by the academic team and will be unlocked soon!</p>", `<button onclick="window.closeModal()" class="w-full py-2.5 bg-brand-500 text-white rounded-xl font-bold border-none">Got it</button>`, "🧠");
            }
            return;
        }

        const totalSaved = Object.keys(window.userBookmarks || {}).length;
        const dueCount = window.getDueBookmarksCount();
        if (mode === 'due' && dueCount === 0 && totalSaved > 0) {
            this.isCramMode = true;
        } else {
            this.isCramMode = (mode === 'all');
        }

        if (window.userPanelApp && window.userPanelApp.isOpen) {
            window.userPanelApp.close();
        }

        this.isOpen = true;
        this.sessionAnswered.clear();
        document.getElementById('neuro-recall-layer').classList.add('active');
        window.updateNeuroDueBadges();
        this.updateExamDaysUI();
        this.syncModeButtons();
        this.buildQueue();
    },

    close: function() {
        this.isOpen = false;
        document.getElementById('neuro-recall-layer').classList.remove('active');
        window.updateNeuroDueBadges();
    },

    promptExamDate: function() {
        const current = localStorage.getItem('mbbs_target_date') || new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0];
        const input = prompt("Enter your Target Professional Exam Date (YYYY-MM-DD) to optimize spaced repetition intervals:", current);
        if (input && /^\d{4}-\d{2}-\d{2}$/.test(input.trim())) {
            localStorage.setItem('mbbs_target_date', input.trim());
            this.updateExamDaysUI();
            if (this.currentItem) this.renderCard();
        }
    },

    updateExamDaysUI: function() {
        const el = document.getElementById('nr-exam-days-label');
        if (el) el.innerText = `${window.getDaysToExam()}d to Exam`;
    },

    setMode: function(mode) {
        this.isCramMode = (mode === 'all');
        this.sessionAnswered.clear();
        this.syncModeButtons();
        this.buildQueue();
    },

    syncModeButtons: function() {
        const btnDue = document.getElementById('nr-mode-due');
        const btnAll = document.getElementById('nr-mode-all');
        if (!btnDue || !btnAll) return;

        if (this.isCramMode) {
            btnAll.className = "flex-1 py-2.5 rounded-xl font-extrabold text-xs uppercase tracking-wider transition-all bg-sky-500 text-white shadow-lg shadow-sky-500/25";
            btnDue.className = "flex-1 py-2.5 rounded-xl font-extrabold text-xs uppercase tracking-wider transition-all bg-slate-800/80 text-slate-400 hover:text-white";
        } else {
            btnDue.className = "flex-1 py-2.5 rounded-xl font-extrabold text-xs uppercase tracking-wider transition-all bg-sky-500 text-white shadow-lg shadow-sky-500/25";
            btnAll.className = "flex-1 py-2.5 rounded-xl font-extrabold text-xs uppercase tracking-wider transition-all bg-slate-800/80 text-slate-400 hover:text-white";
        }
    },

    buildQueue: function() {
        const bookmarks = window.userBookmarks || {};
        const now = Date.now();
        const entries = Object.entries(bookmarks);

        let strictlyDue = 0;
        const filtered = [];

        entries.forEach(([key, bm]) => {
            if (!bm) return;
            const step = bm.current_step || 1;
            const nextRev = bm.next_review_date || 0;
            const isDue = (now >= nextRev);
            if (isDue) strictlyDue++;

            if (this.sessionAnswered.has(key)) return;

            if (this.isCramMode || isDue) {
                filtered.push({
                    key: key,
                    data: {
                        ...bm,
                        current_step: step,
                        next_review_date: nextRev
                    }
                });
            }
        });

        document.getElementById('nr-due-count').innerText = strictlyDue;
        document.getElementById('nr-all-count').innerText = entries.length;

        if (this.isCramMode) {
            filtered.sort((a, b) => (a.data.current_step || 1) - (b.data.current_step || 1));
        } else {
            filtered.sort((a, b) => (a.data.next_review_date || 0) - (b.data.next_review_date || 0));
        }

        this.queue = filtered;
        this.totalInSession = filtered.length;

        if (this.queue.length === 0) {
            this.showDoneState(entries.length === 0);
        } else {
            document.getElementById('nr-done-state').classList.add('hidden');
            document.getElementById('nr-done-state').classList.remove('flex');
            document.getElementById('nr-card-stage').classList.remove('hidden');
            document.getElementById('nr-footer').classList.remove('hidden');
            document.getElementById('nr-progress-section').classList.remove('hidden');
            this.loadNextCard();
        }
    },

    showDoneState: function(noBookmarksAtAll) {
        document.getElementById('nr-card-stage').classList.add('hidden');
        document.getElementById('nr-footer').classList.add('hidden');
        document.getElementById('nr-progress-section').classList.add('hidden');

        const doneEl = document.getElementById('nr-done-state');
        doneEl.classList.remove('hidden');
        doneEl.classList.add('flex');

        const titleEl = document.getElementById('nr-done-title');
        const descEl = document.getElementById('nr-done-desc');
        if (noBookmarksAtAll) {
            titleEl.innerText = "Your Neuro-Vault is Empty";
            descEl.innerText = "Bookmark any MCQ, Theory Question, or Clinical Case across the platform to build your personal spaced-repetition flashcard deck.";
        } else if (this.isCramMode) {
            titleEl.innerText = "Vault Complete!";
            descEl.innerText = "You have reviewed every single saved flashcard in your vault. Outstanding work!";
        } else {
            titleEl.innerText = "Synapses Strengthened!";
            descEl.innerText = "You have completed all due active recall sessions for today. Tap 'Cram Full Vault' below if you want to practice ahead of schedule.";
        }
    },

    loadNextCard: function() {
        if (this.queue.length === 0) {
            this.showDoneState(false);
            return;
        }

        const flipper = document.getElementById('nr-flipper');
        if (flipper) flipper.classList.remove('is-flipped');

        const completed = this.totalInSession - this.queue.length;
        const pct = this.totalInSession > 0 ? Math.round((completed / this.totalInSession) * 100) : 0;
        document.getElementById('nr-prog-text').innerText = `${completed} / ${this.totalInSession} Synapses Fired`;
        document.getElementById('nr-prog-fill').style.width = `${pct}%`;

        const brain = document.getElementById('nr-brain-icon');
        if (brain) {
            brain.classList.add('nr-brain-glow');
            setTimeout(() => brain.classList.remove('nr-brain-glow'), 500);
        }

        this.currentItem = this.queue[0];
        this.renderCard();
    },

    getExplanationForBookmark: async function(bm) {
        if (bm.explanation) return bm.explanation;
        if (window.liveAnswers && bm.q && window.liveAnswers[bm.q] && window.liveAnswers[bm.q].text) {
            return window.liveAnswers[bm.q].text;
        }
        if (window.db && bm.q) {
            try {
                const { ref, get } = await import("https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js");
                let colCode = bm.collegeCode;
                let subCode = bm.subjectCode;
                if (!colCode && bm.subject) {
                    const parts = bm.subject.split(' - ');
                    if (parts[0]) colCode = parts[0].replace(/^AIIMS\s+/i, '').trim().toLowerCase().replace(/\s+/g, '-');
                    if (parts[1]) subCode = parts[1].replace(/\s+Clinical$/i, '').trim().toUpperCase();
                }
                if (colCode && subCode) {
                    const isClin = (bm.subject && bm.subject.includes('Clinical')) || String(bm.q).startsWith('CLIN-');
                    const path = isClin
                        ? `clinical_data/${colCode}/${subCode}/${bm.q}/answer`
                        : `answers/${colCode}/${subCode}/${bm.q}/text`;
                    const snap = await get(ref(window.db, path));
                    if (snap.exists()) return snap.val();
                }
            } catch (e) {}
        }
        return "";
    },

    renderCard: async function() {
        const bm = this.currentItem.data;
        const step = bm.current_step || 1;
        const daysToExam = window.getDaysToExam();

        this.calcGuessDays = Math.max(1, Math.round(step * 1.5));
        this.calcMasteredDays = Math.max(3, Math.round((daysToExam * 0.15) * step));

        document.getElementById('nr-time-guess').innerText = `+${this.calcGuessDays}d`;
        document.getElementById('nr-time-mastered').innerText = `+${this.calcMasteredDays}d`;

        document.getElementById('nr-footer-prompt').classList.remove('hidden');
        document.getElementById('nr-footer-wrong').classList.add('hidden');
        document.getElementById('nr-footer-wrong').classList.remove('flex');
        document.getElementById('nr-footer-correct').classList.add('hidden');
        document.getElementById('nr-footer-correct').classList.remove('flex');

        const rich = await window.recoverRichQuestionData(bm);
        this.currentItem.rich = rich;

        const cleanStem = window.formatInlineMathAndBold(rich.stemHtml);

        const extraImgHtml = (rich.img && !cleanStem.includes(rich.img))
            ? `<img src="${rich.img}" alt="Question Image">`
            : '';

        const isMCQ = bm.type === 'MCQ' && Array.isArray(bm.options) && bm.options.length > 0;

        let interactionHtml = '';
        if (isMCQ) {
            interactionHtml = `<div class="space-y-2.5 mt-4">` + bm.options.map((opt, idx) => {
                const letter = String.fromCharCode(65 + idx);
                const cleanOpt = window.formatInlineMathAndBold(opt);
                return `
                    <button type="button" onclick="window.neuroRecallApp.selectMCQ('${letter}')" class="nr-opt-btn group">
                        <span class="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-extrabold text-xs flex items-center justify-center shrink-0 group-hover:bg-sky-500 group-hover:text-white transition-colors">${letter}</span>
                        <span class="leading-snug pt-0.5">${cleanOpt}</span>
                    </button>`;
            }).join('') + `</div>`;
        } else {
            interactionHtml = `
                <div class="mt-auto pt-6">
                    <div class="p-4 rounded-xl bg-sky-50 dark:bg-slate-800/60 border border-sky-200 dark:border-slate-700 mb-4 text-xs text-sky-800 dark:text-sky-300 font-medium">
                        💡 Mentally structure your key points, headings, or clinical management plan before flipping the card.
                    </div>
                    <button type="button" onclick="window.neuroRecallApp.flipTheoryCard()" class="w-full py-4 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-extrabold text-sm uppercase tracking-wider shadow-lg shadow-sky-500/25 transition-all active:scale-95">
                        👁️ Flip Card & Reveal Answer
                    </button>
                </div>`;
        }

        const frontEl = document.getElementById('nr-card-front');
        frontEl.innerHTML = `
            <div class="flex justify-between items-center gap-2 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
                <span class="text-[11px] font-extrabold uppercase tracking-wider text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-900/30 px-3 py-1 rounded-lg border border-sky-200 dark:border-sky-800 truncate">${bm.subject || 'Saved Question'} (${bm.q || ''})</span>
                <span class="text-[11px] font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-2.5 py-1 rounded-lg border border-amber-200 dark:border-amber-800 shrink-0">⚡ Level ${step}</span>
            </div>
            <div class="text-base md:text-lg font-bold leading-relaxed mb-3">${cleanStem}</div>
            ${extraImgHtml}
            ${interactionHtml}
        `;
        frontEl.scrollTop = 0;
    },

    selectMCQ: async function(selectedLetter) {
        const bm = this.currentItem.data;
        const correctLetter = String(bm.ans_key || 'A').trim().toUpperCase();
        const isCorrect = (selectedLetter === correctLetter);
        const ansIndex = Math.max(0, correctLetter.charCodeAt(0) - 65);
        const correctText = (bm.options && bm.options[ansIndex]) ? window.formatInlineMathAndBold(bm.options[ansIndex]) : `Option ${correctLetter}`;

        const bannerHtml = isCorrect
            ? `<div class="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/25 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 font-extrabold text-sm flex items-center gap-2.5 mb-4"><span>✅</span> <span>Correct! Excellent synaptic retrieval.</span></div>`
            : `<div class="p-4 rounded-xl bg-red-50 dark:bg-red-900/25 border border-red-300 dark:border-red-700 text-red-800 dark:text-red-300 font-extrabold text-sm flex items-center gap-2.5 mb-4"><span>❌</span> <span>Incorrect. You picked ${selectedLetter}; correct answer is ${correctLetter}.</span></div>`;

        await this.populateBackFace(bm, bannerHtml, `<div class="p-4 rounded-xl bg-slate-100 dark:bg-slate-800 font-bold text-sm mb-4 border border-slate-200 dark:border-slate-700"><span class="text-emerald-600 dark:text-emerald-400 mr-2">${correctLetter})</span>${correctText}</div>`);

        document.getElementById('nr-flipper').classList.add('is-flipped');
        document.getElementById('nr-footer-prompt').classList.add('hidden');

        if (isCorrect) {
            document.getElementById('nr-footer-correct').classList.remove('hidden');
            document.getElementById('nr-footer-correct').classList.add('flex');
        } else {
            document.getElementById('nr-footer-wrong').classList.remove('hidden');
            document.getElementById('nr-footer-wrong').classList.add('flex');
        }
    },

    flipTheoryCard: async function() {
        const bm = this.currentItem.data;
        const bannerHtml = `<div class="p-3.5 rounded-xl bg-sky-50 dark:bg-sky-900/25 border border-sky-200 dark:border-sky-800 text-sky-800 dark:text-sky-300 font-extrabold text-xs uppercase tracking-wider flex items-center justify-between mb-4"><span>📝 Model Answer & Explanation</span><span>Self-Grade Below</span></div>`;

        await this.populateBackFace(bm, bannerHtml, '');

        document.getElementById('nr-flipper').classList.add('is-flipped');
        document.getElementById('nr-footer-prompt').classList.add('hidden');
        document.getElementById('nr-footer-correct').classList.remove('hidden');
        document.getElementById('nr-footer-correct').classList.add('flex');
    },

    populateBackFace: async function(bm, bannerHtml, correctBoxHtml) {
        const backEl = document.getElementById('nr-card-back');
        const rich = this.currentItem.rich || await window.recoverRichQuestionData(bm);
        const cleanStem = window.formatInlineMathAndBold(rich.stemHtml || bm.text || "");

        const ansImgHtml = rich.ansImage
            ? `<div class="my-3"><div class="text-[10px] font-black uppercase tracking-widest text-amber-500 mb-1">Answer Card Image (Tap to Zoom)</div><img src="${rich.ansImage}" alt="Answer Card"></div>`
            : '';

        backEl.innerHTML = `
            ${bannerHtml}
            <div class="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-3 leading-relaxed">${cleanStem}</div>
            ${correctBoxHtml}
            ${ansImgHtml}
            <div class="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border-l-4 border-sky-500 text-sm leading-relaxed flex-1 markdown-body" id="nr-back-expl">
                <span class="text-slate-400 animate-pulse">Loading explanation...</span>
            </div>
            <div class="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center gap-2 shrink-0">
                <button type="button" onclick="document.getElementById('nr-flipper').classList.remove('is-flipped')" class="px-3.5 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold hover:opacity-80">
                    🔙 View Question
                </button>
                <button type="button" onclick="window.neuroRecallApp.askAIForCurrent()" class="px-3.5 py-2 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs font-bold hover:bg-emerald-500 hover:text-white transition-colors">
                    🤖 Copy for ChatGPT
                </button>
            </div>
        `;
        backEl.scrollTop = 0;

        const explText = await this.getExplanationForBookmark(bm);
        const explContainer = document.getElementById('nr-back-expl');
        if (explContainer) {
            if (explText) {
                explContainer.innerHTML = `<div class="text-[10px] font-black uppercase tracking-widest text-sky-500 mb-2">Neuro-Link (Explanation)</div>` + window.sharedRenderMarkdown(explText);
            } else if (rich.ansImage) {
                explContainer.innerHTML = `<em class="text-slate-400 text-xs">Refer to the visual Answer Card above, or tap <b>Copy for ChatGPT</b> below for extra text notes.</em>`;
            } else {
                explContainer.innerHTML = `<em class="text-slate-400 text-xs">No saved explanation yet for this question. Tap <b>Copy for ChatGPT</b> below for an instant structured model answer.</em>`;
            }
        }
    },

    askAIForCurrent: function() {
        if (!this.currentItem) return;
        const bm = this.currentItem.data;
        let prompt = `I am studying for ${bm.subject || 'my MBBS Professional Exam'}. Please provide a high-yield model answer / explanation for:\n\nQ: ${bm.text}`;
        if (bm.type === 'MCQ' && bm.options) {
            prompt += `\nOptions:\n` + bm.options.map((o, i) => `${String.fromCharCode(65 + i)}) ${o}`).join('\n') + `\nCorrect Key: ${bm.ans_key}`;
        }
        if (navigator.clipboard) {
            navigator.clipboard.writeText(prompt).then(() => {
                window.open('https://chatgpt.com/', '_blank');
            });
        }
    },

    grade: async function(gradeCode) {
        if (!this.currentItem || !window.currentUserObj) return;

        const { key, data } = this.currentItem;
        let step = data.current_step || 1;
        let nextIntervalDays = 0;

        if (gradeCode === 0) {
            step = 1;
            nextIntervalDays = 0;
        } else if (gradeCode === 1) {
            step = step + 1;
            nextIntervalDays = this.calcGuessDays;
        } else if (gradeCode === 2) {
            step = step + 2;
            nextIntervalDays = this.calcMasteredDays;
        }

        const nextReview = Date.now() + (nextIntervalDays * 86400000);
        const shifted = this.queue.shift();

        data.current_step = step;
        data.next_review_date = nextReview;

        if (window.userBookmarks && window.userBookmarks[key]) {
            window.userBookmarks[key].current_step = step;
            window.userBookmarks[key].next_review_date = nextReview;
        }

        if (gradeCode === 0) {
            this.queue.push(shifted);
        } else {
            this.sessionAnswered.add(key);
        }

        try {
            if (window.db) {
                const { ref, update } = await import("https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js");
                await update(ref(window.db, `users/${window.currentUserObj.uid}/bookmarks/${key}`), {
                    current_step: step,
                    next_review_date: nextReview
                });
            }
        } catch (e) {
            console.error("Failed to sync neuro-grade:", e);
        }

        window.updateNeuroDueBadges();
        this.loadNextCard();
    }
};

// ====================================================
// 7. GLOBAL SEARCH ROUTER (Index & Review/Clinical Pages)
// ====================================================
window.handleGlobalSearch = function(query) {
    const q = (query || "").toLowerCase().trim();

    const localSearch = document.getElementById('searchInput');
    if (localSearch && typeof window.filterTable === 'function') {
        localSearch.value = query;
        window.filterTable();
        if (window.isDeckMode && typeof window.syncDeckWithFilters === 'function') {
            window.syncDeckWithFilters();
        }
        return;
    }

    const grids = ['institutes-grid', 'years-grid', 'subjects-grid', 'resources-grid'];
    grids.forEach(gridId => {
        const gridEl = document.getElementById(gridId);
        if (gridEl && gridEl.parentElement && !gridEl.parentElement.classList.contains('hidden')) {
            Array.from(gridEl.children).forEach(card => {
                const text = (card.textContent || "").toLowerCase();
                card.style.display = text.includes(q) ? "" : "none";
            });
        }
    });
};

// ====================================================
// 8. PANZOOM FLASHCARD HELPERS
// ====================================================
window.zoomInCard = function(qId) {
    if (window[`panzoom_${qId}`]) window[`panzoom_${qId}`].zoomIn();
};
window.zoomOutCard = function(qId) {
    if (window[`panzoom_${qId}`]) window[`panzoom_${qId}`].zoomOut();
};
window.resetZoomCard = function(qId) {
    if (window[`panzoom_${qId}`]) window[`panzoom_${qId}`].reset();
};

// ====================================================
// 9. UNIFIED MATH (KaTeX) + FLOWCHART + MEDIA MARKDOWN ENGINE
// ====================================================
window.toggleYT = function(containerId, videoId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    if (container.classList.contains('hidden')) {
        container.classList.remove('hidden');
        if (container.innerHTML.trim() === '') {
            container.innerHTML = `<iframe class="absolute top-0 left-0 w-full h-full" src="https://www.youtube.com/embed/${videoId}?autoplay=1" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
        }
    } else {
        container.classList.add('hidden');
        container.innerHTML = '';
    }
};

window.toggleWebVideo = function(containerId, videoUrl) {
    const container = document.getElementById(containerId);
    if (!container) return;
    if (container.classList.contains('hidden')) {
        container.classList.remove('hidden');
        if (container.innerHTML.trim() === '') {
            container.innerHTML = `<video controls autoplay class="w-full max-h-[500px] m-0 rounded-xl outline-none"><source src="${videoUrl}">Your browser does not support HTML5 video.</video>`;
        }
    } else {
        container.classList.add('hidden');
        container.innerHTML = '';
    }
};

window.formatInlineMathAndBold = function(str) {
    if (!str) return "";
    let s = String(str).replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    if (typeof katex !== 'undefined') {
        s = s.replace(/\\\\\(([\s\S]*?)\\\\\)|\\\(([\s\S]*?)\\\)/g, (m, g1, g2) => {
            try { return katex.renderToString((g1 !== undefined ? g1 : g2).trim(), { throwOnError: false }); } catch (e) { return m; }
        });
        s = s.replace(/\$([^\$\n]+?)\$/g, (m, g1) => {
            try { return katex.renderToString(g1.trim(), { throwOnError: false }); } catch (e) { return m; }
        });
    }
    return s;
};

window.sharedRenderMarkdown = function(text) {
    if (!text) return "<em class='text-slate-400'>No answer provided yet.</em>";
    
    let processedText = String(text).replace(/[\u200B-\u200D\uFEFF]/g, '');

    const codeBlocks = [];
    processedText = processedText.replace(/```[\s\S]*?```/g, (match) => {
        const token = `@@CODEBLOCK_${codeBlocks.length}@@`;
        codeBlocks.push(match);
        return token;
    });

    const mathBlocks = [];
    const storeMath = (latex, displayMode) => {
        const token = `@@MATH_${mathBlocks.length}@@`;
        let rendered = latex;
        if (typeof katex !== 'undefined') {
            try {
                rendered = katex.renderToString(latex.trim(), {
                    displayMode: displayMode,
                    throwOnError: false,
                    strict: false
                });
            } catch (e) {
                rendered = `<code>${latex}</code>`;
            }
        }
        mathBlocks.push(rendered);
        return token;
    };

    processedText = processedText.replace(/\\\\\[([\s\S]*?)\\\\\]|\\\[([\s\S]*?)\\\]/g, (m, g1, g2) => {
        return storeMath(g1 !== undefined ? g1 : g2, true);
    });

    processedText = processedText.replace(/\$\$([\s\S]*?)\$\$/g, (m, g1) => {
        return storeMath(g1, true);
    });

    processedText = processedText.replace(/\\\\\(([\s\S]*?)\\\\\)|\\\(([\s\S]*?)\\\)/g, (m, g1, g2) => {
        return storeMath(g1 !== undefined ? g1 : g2, false);
    });

    processedText = processedText.replace(/\$([^\$\n]+?)\$/g, (m, g1) => {
        return storeMath(g1, false);
    });

    processedText = processedText.replace(/@@CODEBLOCK_(\d+)@@/g, (m, idx) => codeBlocks[Number(idx)]);

    const ytMarkdownRegex = /\[([^\]]+)\]\((?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?|shorts)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})[^\)]*\)/g;
    processedText = processedText.replace(ytMarkdownRegex, (match, title, videoId) => {
        const uniqueId = 'yt-' + Math.random().toString(36).substring(2, 11);
        return `<div class="yt-container my-4">
                    <button type="button" onclick="window.toggleYT('${uniqueId}', '${videoId}')" class="flex items-center gap-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-bold text-sm bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 px-4 py-2.5 rounded-xl transition-colors border border-red-100 dark:border-red-900/50 w-full sm:w-auto shadow-sm">
                        <svg class="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/></svg>
                        <span class="yt-title text-left line-clamp-1 flex-1">▶ Play: ${title}</span>
                    </button>
                    <div id="${uniqueId}" class="hidden mt-3 rounded-xl overflow-hidden shadow-lg border border-slate-200 dark:border-slate-700 relative bg-slate-900 w-full" style="padding-top: 56.25%;"></div>
                </div>`;
    });

    const ytRawRegex = /(^|\s)(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?|shorts)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})(?:\S*)?/g;
    processedText = processedText.replace(ytRawRegex, (match, space, videoId) => {
        const uniqueId = 'yt-' + Math.random().toString(36).substring(2, 11);
        return `${space}<div class="yt-container my-4">
                    <button type="button" onclick="window.toggleYT('${uniqueId}', '${videoId}')" class="flex items-center gap-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-bold text-sm bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 px-4 py-2.5 rounded-xl transition-colors border border-red-100 dark:border-red-900/50 w-full sm:w-auto shadow-sm">
                        <svg class="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/></svg>
                        <span class="yt-title text-left line-clamp-1 flex-1">▶ Play YouTube Video</span>
                    </button>
                    <div id="${uniqueId}" class="hidden mt-3 rounded-xl overflow-hidden shadow-lg border border-slate-200 dark:border-slate-700 relative bg-slate-900 w-full" style="padding-top: 56.25%;"></div>
                </div>`;
    });

    const vidMarkdownRegex = /\[([^\]]+)\]\((https?:\/\/[^\s\)]+\.(?:mp4|webm|ogg)(?:\?[^\s\)]*)?)\)/gi;
    processedText = processedText.replace(vidMarkdownRegex, (match, title, videoUrl) => {
        const uniqueId = 'vid-' + Math.random().toString(36).substring(2, 11);
        return `<div class="vid-container my-4">
                    <button type="button" onclick="window.toggleWebVideo('${uniqueId}', '${videoUrl}')" class="flex items-center gap-2 text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 font-bold text-sm bg-brand-50 hover:bg-brand-100 dark:bg-brand-900/20 dark:hover:bg-brand-900/40 px-4 py-2.5 rounded-xl transition-colors border border-brand-200 dark:border-brand-800/50 w-full sm:w-auto shadow-sm">
                        <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                        <span class="vid-title text-left line-clamp-1 flex-1">🎬 Play Video: ${title}</span>
                    </button>
                    <div id="${uniqueId}" class="hidden mt-3 rounded-xl overflow-hidden shadow-lg border border-slate-200 dark:border-slate-700 bg-slate-900 w-full"></div>
                </div>`;
    });

    let rawHtml = typeof marked !== 'undefined' ? marked.parse(processedText) : processedText;
    rawHtml = rawHtml.replace(/<table>/g, '<div class="markdown-table-wrapper"><table>').replace(/<\/table>/g, '</table></div>');

    rawHtml = rawHtml.replace(/@@MATH_(\d+)@@/g, (m, idx) => mathBlocks[Number(idx)]);

    return rawHtml;
};

// ====================================================
// 10. SECURE CHECKOUT LOADER
// ====================================================
window.openSecureCheckout = function(e) {
    if (e) e.preventDefault();
    
    const loader = document.createElement('div');
    loader.id = 'secure-checkout-loader';
    loader.className = 'fixed inset-0 z-[30000] bg-slate-900/90 backdrop-blur-md flex flex-col items-center justify-center transition-opacity duration-300 text-center px-4';
    loader.innerHTML = `
        <div class="w-12 h-12 border-4 border-slate-700 border-t-brand-500 rounded-full animate-spin mb-6 mx-auto"></div>
        <h2 class="text-xl md:text-2xl font-black text-white mb-2">Preparing Checkout</h2>
        <p class="text-slate-300 text-sm font-medium animate-pulse">Opening secure browser for secure payment...</p>
    `;
    document.body.appendChild(loader);

    const checkoutUrl = "https://mbbsprofsprep.github.io/MBBS-PROFS-PREP/checkout.html";
    const checkoutWindow = window.open(checkoutUrl, "_blank");

    if (!checkoutWindow) {
        loader.innerHTML = `
            <div class="w-12 h-12 bg-red-500/20 text-red-500 border border-red-500/50 rounded-full flex items-center justify-center text-xl mb-6 mx-auto shadow-[0_0_15px_rgba(239,68,68,0.3)]">🛡️</div>
            <h2 class="text-xl font-black text-white mb-2">Adblocker Detected</h2>
            <p class="text-slate-300 text-sm font-medium mb-6 leading-relaxed max-w-sm mx-auto">Your browser or adblocker prevented the secure checkout from opening.<br><br><span class="text-brand-400 font-bold">Please disable your adblocker or popup blocker for this site and try again.</span></p>
            <div class="flex flex-col gap-3 w-full max-w-xs mx-auto">
                <button onclick="document.getElementById('secure-checkout-loader').remove(); window.openSecureCheckout();" class="w-full px-6 py-3 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-xl transition-colors shadow-lg">Try Again</button>
                <button onclick="document.getElementById('secure-checkout-loader').remove()" class="w-full px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-colors">Cancel</button>
            </div>
        `;
    } else {
        setTimeout(() => {
            loader.classList.add('opacity-0');
            setTimeout(() => loader.remove(), 300);
        }, 2500);
    }
};

// ====================================================
// 11. AUTH UI & THEME HELPERS
// ====================================================
window.toggleAuthMode = function(mode) {
    window.userPanelApp.authMode = mode;
    window.userPanelApp.renderState();
};

window.togglePassword = function() {
    const input = document.getElementById('login-pass') || document.getElementById('reg-pass');
    const icon = document.getElementById('eye-icon');
    if (!input) return;
    if (input.type === "password") {
        input.type = "text";
        if (icon) icon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a10.059 10.059 0 011.591-2.714M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M1.5 1.5l22.5 22.5" />`;
    } else {
        input.type = "password";
        if (icon) icon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />`;
    }
};

window.showAuthError = function(msg) {
    const errDiv = document.getElementById('auth-error-msg');
    if (errDiv) {
        errDiv.innerText = msg;
        errDiv.classList.remove('hidden', 'bg-green-50', 'text-green-600', 'border-green-200');
        errDiv.classList.add('bg-red-50', 'text-red-600', 'border-red-200');
        setTimeout(() => errDiv.classList.add('hidden'), 5000);
    } else {
        alert(msg);
    }
};

window.toggleTheme = function() {
    const d = document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', d ? 'dark' : 'light');
    const icon = document.getElementById('theme-icon');
    if (icon) icon.innerText = d ? '☀️' : '🌙';
    if (typeof window.update3D === 'function') window.update3D();
};
// ====================================================
// 12. THE MULTI-VIEW USER PANEL APP (WITH ADMIN TOGGLE & 3D BOOKMARKS)
// ====================================================
window.userPanelApp = {
    isOpen: false,
    authMode: 'login',
    viewMode: 'menu',

    els: function() {
        return {
            drawer: document.getElementById('user-panel-drawer'),
            backdrop: document.getElementById('user-panel-backdrop'),
            body: document.getElementById('user-panel-body'),
            footer: document.getElementById('user-panel-footer')
        };
    },

    toggle: function() { this.isOpen ? this.close() : this.open(); },

    open: function() {
        this.isOpen = true;
        this.viewMode = 'menu';
        this.renderState();
        const e = this.els();
        if (e.drawer) e.drawer.classList.remove('-translate-x-full');
        if (e.backdrop) e.backdrop.classList.remove('opacity-0', 'pointer-events-none');
    },

    close: function() {
        this.isOpen = false;
        const e = this.els();
        if (e.drawer) e.drawer.classList.add('-translate-x-full');
        if (e.backdrop) e.backdrop.classList.add('opacity-0', 'pointer-events-none');
    },

    setView: function(view) {
        this.viewMode = view;
        this.renderState();
    },

    renderState: function() {
        const user = window.currentUserObj;
        const pData = window.currentUserProfileData || {};
        const els = this.els();
        if (!els.body || !els.footer) return;

        const legalFooterHtml = `
            <div class="flex flex-wrap justify-center gap-x-3 gap-y-2 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide w-full px-2 mb-2 mt-4">
                <a href="legal.html?page=about" class="hover:text-brand-500 transition-colors">About Us</a> • 
                <a href="legal.html?page=contact" class="hover:text-brand-500 transition-colors">Contact</a> • 
                <a href="legal.html?page=terms" class="hover:text-brand-500 transition-colors">Terms</a> • 
                <a href="legal.html?page=privacy" class="hover:text-brand-500 transition-colors">Privacy</a> • 
                <a href="legal.html?page=refunds" class="hover:text-brand-500 transition-colors">Refunds</a>
            </div>`;

        if (user) {
            const totalSaved = Object.keys(window.userBookmarks || {}).length;
            const dueCount = window.getDueBookmarksCount();
            const isAdmin = window.isUserAdmin(user);
            const canUseNeuro = window.canAccessNeuroRecall();

            if (this.viewMode === 'menu') {
                let badgeHtml = '';
                let daysHtml = '';
                if (window.globalUserStatus && window.globalUserStatus.isVIP) {
                    badgeHtml = `<span class="px-3 py-1 mt-3 bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 text-[10px] font-extrabold rounded-full uppercase tracking-wider border border-brand-200 dark:border-brand-800">PRO / VIP ACCESS</span>`;
                    const fd = window.globalUserStatus.validUntil === 'Lifetime Access' ? 'Lifetime Access' : new Date(window.globalUserStatus.validUntil).toLocaleDateString('en-US');
                    daysHtml = `<div class="w-full mt-4 p-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 flex flex-col items-center"><span class="text-2xl font-black text-green-600 dark:text-green-400">${window.globalUserStatus.daysLeft === 999 ? '∞' : window.globalUserStatus.daysLeft}</span><span class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Days Left</span><span class="text-[10px] font-medium text-slate-400 mt-1">Valid until ${fd}</span></div>`;
                } else if (window.globalUserStatus && window.globalUserStatus.expired) {
                    const daysAgo = Math.abs(window.globalUserStatus.daysLeft);
                    badgeHtml = `<span class="px-3 py-1 mt-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-[10px] font-extrabold rounded-full uppercase tracking-wider border border-red-200 dark:border-red-800">EXPIRED</span>`;
                    daysHtml = `<div class="w-full mt-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex flex-col items-center text-center"><span class="text-xs font-bold text-red-600 dark:text-red-400">Oops! Your subscription ended ${daysAgo} days ago.</span><a onclick="window.openSecureCheckout(event)" class="mt-2 text-xs font-bold bg-red-600 text-white px-3 py-1.5 rounded-lg shadow-sm cursor-pointer">Renew Now</a></div>`;
                } else {
                    badgeHtml = `<span class="px-3 py-1 mt-3 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-extrabold rounded-full uppercase tracking-wider border border-slate-300 dark:border-slate-700">FREE PLAN</span>`;
                    daysHtml = `<div class="w-full mt-4 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 flex flex-col items-center text-center"><span class="text-xs font-bold text-blue-600 dark:text-blue-400">Membership Required</span><a onclick="window.openSecureCheckout(event)" class="mt-2 text-xs font-bold bg-brand-500 text-white px-3 py-1.5 rounded-lg shadow-sm hover:bg-brand-600 cursor-pointer">Unlock QBank</a></div>`;
                }

                const nameToDisplay = user.displayName || pData.fullName || "User";
                const initial = (user.email || "U").charAt(0).toUpperCase();

                const adminNeuroControlHtml = isAdmin ? `
                    <div class="p-3.5 bg-amber-50/80 dark:bg-slate-900 rounded-2xl border border-amber-200 dark:border-amber-800/60 flex items-center justify-between shadow-sm">
                        <div>
                            <div class="text-[10px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-widest">Admin Control: Neuro-Recall</div>
                            <div class="text-xs font-bold text-slate-600 dark:text-slate-300 mt-0.5">${window.globalNeuroRecallEnabled ? '🟢 Visible to All Students' : '🔒 Admin-Only (Hidden for Students)'}</div>
                        </div>
                        <label class="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" class="sr-only peer" ${window.globalNeuroRecallEnabled ? 'checked' : ''} onchange="window.toggleGlobalNeuroRecall()">
                            <div class="w-10 h-5 bg-slate-300 dark:bg-slate-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                        </label>
                    </div>
                ` : '';

                const neuroRecallCardHtml = canUseNeuro ? `
                    <a onclick="window.neuroRecallApp.open('${dueCount > 0 ? 'due' : 'all'}')" class="flex items-center justify-between p-4 bg-gradient-to-r from-sky-500 to-brand-600 text-white rounded-2xl cursor-pointer transition-all shadow-md hover:shadow-lg group">
                        <div class="flex items-center gap-3.5 font-extrabold text-sm">
                            <span class="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">🧠</span>
                            <div>
                                <div>Neuro-Recall Flashcards</div>
                                <div class="text-[10px] font-semibold text-sky-100">${dueCount} Due Today • ${totalSaved} Saved</div>
                            </div>
                        </div>
                        <span class="text-white/80 text-xs font-bold bg-white/20 px-2.5 py-1 rounded-full">Practice ❯</span>
                    </a>
                ` : '';

                els.body.innerHTML = `
                    <div class="flex flex-col items-center justify-center p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 mb-6 shadow-sm">
                        <div class="w-20 h-20 rounded-full bg-brand-50 dark:bg-slate-800 flex items-center justify-center text-3xl font-bold text-brand-600 dark:text-brand-400 mb-3 shadow-md border border-brand-100 dark:border-slate-700">${initial}</div>
                        <h3 class="font-bold text-slate-900 dark:text-white text-center w-full truncate px-2 text-sm">${nameToDisplay}</h3>
                        <p class="text-xs text-slate-500 truncate w-full text-center mt-1">${user.email}</p>
                        ${badgeHtml}
                        ${daysHtml}
                    </div>
                    <div class="flex flex-col gap-3">
                        ${adminNeuroControlHtml}
                        ${neuroRecallCardHtml}
                        <a onclick="window.userPanelApp.setView('bookmarks')" class="flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-accent-yellow/50 cursor-pointer transition-all shadow-sm hover:shadow group"><div class="flex items-center gap-4 text-slate-700 dark:text-slate-300 font-semibold text-sm"><span class="w-10 h-10 rounded-xl bg-accent-yellow/10 dark:bg-slate-800 flex items-center justify-center text-accent-yellow text-xl group-hover:scale-110 transition-transform">🔖</span> Bookmarks & Saved (${totalSaved})</div><span class="text-slate-400 text-xs">❯</span></a>
                        <a onclick="window.userPanelApp.setView('edit_profile')" class="flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-brand-300 dark:hover:border-brand-700 cursor-pointer transition-all shadow-sm hover:shadow group"><div class="flex items-center gap-4 text-slate-700 dark:text-slate-300 font-semibold text-sm"><span class="w-10 h-10 rounded-xl bg-brand-50 dark:bg-slate-800 flex items-center justify-center text-brand-500 text-xl group-hover:scale-110 transition-transform">👤</span> My Profile</div><span class="text-slate-400 text-xs">❯</span></a>
                        <a onclick="window.openSecureCheckout(event)" class="flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-700 cursor-pointer transition-all shadow-sm hover:shadow group"><div class="flex items-center gap-4 text-slate-700 dark:text-slate-300 font-semibold text-sm"><span class="w-10 h-10 rounded-xl bg-purple-50 dark:bg-slate-800 flex items-center justify-center text-purple-500 text-xl group-hover:scale-110 transition-transform">💳</span> Subscription & Billing</div><span class="text-slate-400 text-xs">❯</span></a>
                    </div>`;
                els.footer.innerHTML = `${legalFooterHtml}<button onclick="window.firebaseSignOut()" class="w-full py-3.5 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-bold hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors flex items-center justify-center gap-2 mt-2 border border-red-200 dark:border-red-800 shadow-sm"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg> Logout</button>`;

            } else if (this.viewMode === 'bookmarks') {
                const bookmarkEntries = Object.entries(window.userBookmarks || {}).sort((a, b) => new Date(b[1].timestamp) - new Date(a[1].timestamp));
                let bookmarksHtml = '';

                if (bookmarkEntries.length === 0) {
                    bookmarksHtml = `<div class="flex flex-col items-center justify-center py-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm mt-4"><span class="text-5xl mb-4 opacity-70">🔖</span><h4 class="font-bold text-lg text-slate-700 dark:text-slate-300">No Saved Questions Yet</h4><p class="text-sm text-slate-500 mt-2 px-4 leading-relaxed">Questions you bookmark inside the QBank will automatically sync here.</p><button onclick="window.userPanelApp.setView('menu')" class="mt-6 px-6 py-2.5 bg-brand-50 text-brand-600 dark:bg-brand-900/20 dark:text-brand-400 rounded-lg font-bold text-sm hover:bg-brand-100 dark:hover:bg-brand-900/40 transition-colors border border-brand-200 dark:border-brand-800">Go Back</button></div>`;
                } else {
                    const launchBannerHtml = canUseNeuro ? `
                        <button onclick="window.neuroRecallApp.open('${dueCount > 0 ? 'due' : 'all'}')" class="w-full mt-3 mb-4 p-4 rounded-2xl bg-gradient-to-r from-sky-500 to-brand-600 text-white font-extrabold text-sm shadow-lg shadow-sky-500/20 flex items-center justify-between hover:opacity-95 transition-all">
                            <span class="flex items-center gap-2"><span>⚡</span> Start Fullscreen Neuro-Recall</span>
                            <span class="text-xs bg-white/20 px-2.5 py-1 rounded-full">${dueCount} Due / ${totalSaved} Total</span>
                        </button>` : '';

                    bookmarksHtml = `${launchBannerHtml}<div class="space-y-5 mt-3 pb-10">`;

                    bookmarkEntries.forEach(([bmKey, bm], idx) => {
                        const richText = window.formatInlineMathAndBold(bm.stemHtml || bm.text || 'Saved Question');
                        const step = bm.current_step || 1;
                        const isDue = Date.now() >= (bm.next_review_date || 0);
                        const cardDomId = `bm-card-${idx}`;

                        if (!canUseNeuro) {
                            let optionsHtml = '';
                            if (bm.type === 'MCQ' && bm.options) {
                                optionsHtml = `<div class="mt-4 space-y-2.5">`;
                                bm.options.forEach((opt, oIdx) => {
                                    const letter = String.fromCharCode(65 + oIdx);
                                    const isCorrect = String(bm.ans_key || '').toUpperCase() === letter;
                                    let btnClass = "w-full text-left p-3.5 rounded-xl border transition-colors flex items-start gap-3 shadow-sm";
                                    if (isCorrect) btnClass += " bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-800 text-green-800 dark:text-green-300 font-bold";
                                    else btnClass += " bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400";
                                    let formattedOpt = window.formatInlineMathAndBold(opt);
                                    const letterBadgeClass = isCorrect ? "bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-100 border-green-300 dark:border-green-700" : "bg-white dark:bg-slate-700 text-slate-500 border-slate-200 dark:border-slate-600";
                                    const letterBadge = `<span class="flex-shrink-0 w-7 h-7 rounded-lg ${letterBadgeClass} text-xs font-bold flex items-center justify-center border">${letter}</span>`;
                                    optionsHtml += `<div class="${btnClass}">${letterBadge}<span class="pt-0.5 text-sm font-medium leading-snug">${formattedOpt}</span></div>`;
                                });
                                optionsHtml += `</div>`;
                            }
                            bookmarksHtml += `
                                <div class="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 relative group transition-all shadow-sm">
                                    <div class="flex justify-between items-start mb-4">
                                        <div class="text-[10px] text-brand-600 dark:text-brand-400 font-extrabold uppercase tracking-widest bg-brand-50 dark:bg-brand-900/30 px-2.5 py-1 rounded-md border border-brand-200 dark:border-brand-800">${bm.subject || 'QBank'}</div>
                                        <span class="text-[10px] text-slate-500 dark:text-slate-400 font-bold bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700">${new Date(bm.timestamp).toLocaleDateString()}</span>
                                    </div>
                                    <div class="text-sm font-bold text-slate-900 dark:text-white mb-2 leading-relaxed bm-flip-card">${richText}</div>${optionsHtml}
                                    <div class="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center gap-2">
                                        <button onclick="window.deleteBookmark('${bmKey}')" class="text-[10px] font-bold text-red-500 hover:text-red-600 px-3 py-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors uppercase tracking-wide">🗑️ Remove</button>
                                        <a href="${bm.url || '#'}" class="text-xs font-bold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/20 px-4 py-2.5 rounded-xl border border-brand-200 dark:border-brand-800">Review ➝</a>
                                    </div>
                                </div>`;
                            return;
                        }

                        let frontOptionsHtml = '';
                        let backAnswerHtml = '';

                        if (bm.type === 'MCQ' && bm.options) {
                            frontOptionsHtml = `<div class="mt-3 space-y-2">`;
                            bm.options.forEach((opt, oIdx) => {
                                const letter = String.fromCharCode(65 + oIdx);
                                let formattedOpt = window.formatInlineMathAndBold(opt);
                                frontOptionsHtml += `
                                    <div onclick="document.getElementById('${cardDomId}').classList.add('is-flipped')" class="w-full text-left p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 hover:border-brand-400 text-slate-700 dark:text-slate-300 flex items-start gap-2.5 cursor-pointer transition-colors">
                                        <span class="w-6 h-6 rounded-md bg-white dark:bg-slate-700 text-slate-500 text-xs font-bold flex items-center justify-center border border-slate-200 dark:border-slate-600 shrink-0">${letter}</span>
                                        <span class="text-xs font-medium leading-snug pt-0.5">${formattedOpt}</span>
                                    </div>`;
                            });
                            frontOptionsHtml += `</div>`;

                            const correctLetter = String(bm.ans_key || 'A').toUpperCase();
                            const ansIdx = Math.max(0, correctLetter.charCodeAt(0) - 65);
                            const correctOptText = bm.options[ansIdx] ? window.formatInlineMathAndBold(bm.options[ansIdx]) : `Option ${correctLetter}`;
                            backAnswerHtml = `
                                <div class="p-3.5 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-800 text-green-800 dark:text-green-300 font-bold text-xs mb-3">
                                    ✅ Correct Answer: ${correctLetter}) ${correctOptText}
                                </div>`;
                        }

                        const ansImageBack = bm.ans_image ? `<img src="${bm.ans_image}" alt="Answer Card">` : '';
                        const savedExpl = bm.explanation
                            ? `<div class="text-xs text-slate-600 dark:text-slate-300 leading-relaxed markdown-body mt-2">${window.sharedRenderMarkdown(bm.explanation)}</div>`
                            : `<p class="text-xs text-slate-400 italic mt-2">Open in Fullscreen Neuro-Recall to view live synced notes.</p>`;

                        bookmarksHtml += `
                            <div class="bm-flip-scene">
                                <div id="${cardDomId}" class="bm-flip-card">
                                    <div class="bm-flip-front p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
                                        <div>
                                            <div class="flex justify-between items-start gap-2 mb-3">
                                                <span class="text-[10px] text-brand-600 dark:text-brand-400 font-extrabold uppercase tracking-widest bg-brand-50 dark:bg-brand-900/30 px-2.5 py-1 rounded-md border border-brand-200 dark:border-brand-800 truncate">${bm.subject || 'QBank'}</span>
                                                <span class="text-[10px] font-extrabold px-2 py-0.5 rounded-md border shrink-0 ${isDue ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800' : 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'}">⚡ Lvl ${step}</span>
                                            </div>
                                            <div class="text-sm font-bold text-slate-900 dark:text-white mb-2 leading-relaxed">${richText}</div>${frontOptionsHtml}
                                        </div>
                                        <div class="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center gap-2">
                                            <button onclick="window.deleteBookmark('${bmKey}')" class="text-[10px] font-bold text-red-500 hover:text-red-600 px-2.5 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors uppercase tracking-wide">
                                                🗑️ Remove
                                            </button>
                                            <button onclick="document.getElementById('${cardDomId}').classList.add('is-flipped')" class="text-xs font-extrabold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/20 hover:bg-brand-100 px-3.5 py-2 rounded-xl border border-brand-200 dark:border-brand-800 transition-colors">
                                                🔄 Flip Card
                                            </button>
                                        </div>
                                    </div>

                                    <div class="bm-flip-back p-5 bg-white dark:bg-slate-900 rounded-2xl border-2 border-brand-400 dark:border-brand-600 shadow-md flex flex-col justify-between">
                                        <div>
                                            <div class="flex justify-between items-center mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">
                                                <span class="text-[10px] font-black uppercase tracking-widest text-brand-500">🧠 Flashcard Back (${bm.q || ''})</span>
                                                <button onclick="document.getElementById('${cardDomId}').classList.remove('is-flipped')" class="text-xs font-bold text-slate-400 hover:text-slate-600">✕ Flip Back</button>
                                            </div>
                                            ${backAnswerHtml}
                                            ${ansImageBack}${savedExpl}
                                        </div>
                                        <div class="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center gap-2">
                                            <button onclick="document.getElementById('${cardDomId}').classList.remove('is-flipped')" class="text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-xl">
                                                🔙 Question
                                            </button>
                                            <a href="${bm.url || '#'}" class="text-xs font-bold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/20 px-3.5 py-2 rounded-xl border border-brand-200 dark:border-brand-800">
                                                Open Source ➝
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            </div>`;
                    });
                    bookmarksHtml += `</div>`;
                }

                els.body.innerHTML = `
                    <div class="mb-2">
                        <div class="flex items-center justify-between mb-4 sticky top-0 bg-slate-50 dark:bg-dark-bg z-10 py-2 border-b border-slate-200 dark:border-slate-800">
                            <button onclick="window.userPanelApp.setView('menu')" class="p-2 -ml-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors flex items-center gap-1 font-bold text-sm"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg> Back</button>
                        </div>
                        <h3 class="text-2xl font-black text-slate-900 dark:text-white mb-1">${canUseNeuro ? 'Saved Flashcards' : 'Saved Items'}</h3>
                        <p class="text-xs text-slate-500 font-medium">${canUseNeuro ? 'Tap any card to flip it in 3D or launch Neuro-Recall.' : 'Quickly access your saved questions synced from the cloud.'}</p>
                        ${bookmarksHtml}
                    </div>`;
                els.footer.innerHTML = ``;

            } else if (this.viewMode === 'edit_profile') {
                const currentYear = pData.joinYear || '';
                const isS = (v, t) => (v === t) ? 'selected' : '';
                els.body.innerHTML = `
                    <div class="mb-4">
                        <div class="flex items-center justify-between mb-6 sticky top-0 bg-slate-50 dark:bg-dark-bg z-10 py-2 border-b border-slate-200 dark:border-slate-800">
                            <button onclick="window.userPanelApp.setView('menu')" class="p-2 -ml-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors flex items-center gap-1 font-bold text-sm"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg> Back</button>
                        </div>
                        <h3 class="text-2xl font-black text-slate-900 dark:text-white mb-6">Edit Profile</h3>
                        <div class="space-y-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                            <div><label class="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Full Name</label><input type="text" id="edit-name" value="${pData.fullName || ''}" class="w-full mt-1 px-4 py-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none dark:text-white text-sm font-medium focus:ring-2 focus:ring-brand-500 transition-shadow" /></div>
                            <div><label class="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">College Name</label><input type="text" id="edit-college" value="${pData.college || ''}" class="w-full mt-1 px-4 py-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none dark:text-white text-sm font-medium focus:ring-2 focus:ring-brand-500 transition-shadow" /></div>
                            <div><label class="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Join Year / Batch</label><select id="edit-join-year" class="w-full mt-1 px-4 py-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium outline-none focus:ring-2 focus:ring-brand-500 transition-shadow"><option value="">Select</option><option value="2025 Batch" ${isS(currentYear, '2025 Batch')}>2025 Batch</option><option value="2024 Batch" ${isS(currentYear, '2024 Batch')}>2024 Batch</option><option value="2023 Batch" ${isS(currentYear, '2023 Batch')}>2023 Batch</option><option value="2022 Batch" ${isS(currentYear, '2022 Batch')}>2022 Batch</option><option value="2021 Batch" ${isS(currentYear, '2021 Batch')}>2021 Batch (Intern)</option><option value="Post-Grad / JR" ${isS(currentYear, 'Post-Grad / JR')}>Post-Grad / JR</option></select></div>
                            <div class="grid grid-cols-2 gap-3">
                                <div><label class="text-[10px] font-bold text-slate-500 uppercase ml-1">City</label><input type="text" id="edit-city" value="${pData.city || ''}" class="w-full mt-1 px-4 py-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none dark:text-white text-sm font-medium focus:ring-2 focus:ring-brand-500 transition-shadow" /></div>
                                <div><label class="text-[10px] font-bold text-slate-500 uppercase ml-1">Phone</label><input type="tel" id="edit-phone" value="${pData.phone || ''}" class="w-full mt-1 px-4 py-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none dark:text-white text-sm font-medium focus:ring-2 focus:ring-brand-500 transition-shadow" /></div>
                            </div>
                            <button onclick="window.saveEditedProfile(this)" class="w-full py-4 mt-6 rounded-xl text-sm font-bold bg-brand-500 text-white shadow-lg shadow-brand-500/30 active:scale-95 transition-all">Save Changes</button>
                        </div>
                    </div>`;
                els.footer.innerHTML = ``;
            }
        } else {
            if (this.authMode === 'login') {
                els.body.innerHTML = `
                    <div class="flex flex-col items-center justify-center min-h-[calc(100vh-250px)]">
                        <img src="${APP_LOGO_URL}" class="w-20 h-20 rounded-2xl shadow-xl ring-4 ring-offset-4 ring-brand-400/30 mb-6 object-cover" alt="Logo">
                        <h3 class="text-2xl font-black text-slate-900 dark:text-white mb-2">Welcome Back</h3>
                        <p class="text-sm text-slate-500 dark:text-slate-400 mb-6">Log in to sync your progress.</p>
                        <div id="auth-error-msg" class="hidden w-full bg-red-50 text-red-600 border border-red-200 text-xs p-3 rounded-xl mb-4 text-center font-bold"></div>
                        <div class="w-full space-y-3 mb-6 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                            <input type="email" id="login-email" placeholder="Email Address" class="w-full px-4 py-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none dark:text-white text-sm font-medium focus:ring-2 focus:ring-brand-500 transition-shadow" />
                            <div class="relative w-full">
                                <input type="password" id="login-pass" placeholder="Password" class="w-full pl-4 pr-10 py-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none dark:text-white text-sm font-medium focus:ring-2 focus:ring-brand-500 transition-shadow" />
                                <button type="button" onclick="window.togglePassword()" class="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><svg id="eye-icon" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg></button>
                            </div>
                            <div class="text-right w-full pt-1"><button onclick="window.handleForgotPass()" class="text-[10px] font-bold text-brand-500 uppercase tracking-wider hover:text-brand-600 transition-colors">Forgot Password?</button></div>
                        </div>
                        <button onclick="window.handleEmailLogin(this)" class="w-full py-4 rounded-xl text-sm font-bold bg-brand-500 text-white shadow-lg shadow-brand-500/30 active:scale-95 transition-all hover:bg-brand-600">Sign In</button>
                        <div class="text-center mt-6"><span class="text-sm text-slate-500">Don't have an account?</span> <button onclick="window.toggleAuthMode('register')" class="text-sm font-bold text-brand-600 dark:text-brand-400 hover:underline ml-1">Create One</button></div>
                    </div>`;
            } else {
                els.body.innerHTML = `
                    <div class="flex flex-col items-center justify-start min-h-[calc(100vh-250px)] pb-4">
                        <img src="${APP_LOGO_URL}" class="w-16 h-16 rounded-2xl shadow-xl ring-2 ring-offset-2 ring-brand-400/50 mb-4 object-cover mt-2" alt="Logo">
                        <h3 class="text-xl font-black text-slate-900 dark:text-white mb-1">Create Global Profile</h3>
                        <p class="text-sm text-slate-500 mb-6">Join the community.</p>
                        <div id="auth-error-msg" class="hidden w-full bg-red-50 text-red-600 border border-red-200 text-xs p-3 rounded-xl mb-4 text-center font-bold"></div>
                        <div class="w-full space-y-3 mb-6 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                            <select id="reg-country" class="w-full px-4 py-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-sm outline-none focus:ring-2 focus:ring-brand-500 transition-shadow font-medium"><option value="">Select Country</option><option value="India" selected>India</option></select>
                            <input type="text" id="reg-city" placeholder="City" class="w-full px-4 py-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none text-sm dark:text-white font-medium focus:ring-2 focus:ring-brand-500 transition-shadow" />
                            <input type="text" id="reg-name" placeholder="Full Name" class="w-full px-4 py-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none text-sm dark:text-white font-medium focus:ring-2 focus:ring-brand-500 transition-shadow" />
                            <input type="email" id="reg-email" placeholder="Email Address" class="w-full px-4 py-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none text-sm dark:text-white font-medium focus:ring-2 focus:ring-brand-500 transition-shadow" />
                            <input type="password" id="reg-pass" placeholder="Create Password (Min 6)" class="w-full px-4 py-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none text-sm dark:text-white font-medium focus:ring-2 focus:ring-brand-500 transition-shadow" />
                            <div class="grid grid-cols-2 gap-3">
                                <select id="reg-join-year" class="w-full px-4 py-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-sm outline-none font-medium focus:ring-2 focus:ring-brand-500 transition-shadow"><option value="">Batch</option><option value="2025 Batch">2025 Batch</option><option value="2024 Batch">2024 Batch</option><option value="2023 Batch">2023 Batch</option><option value="2022 Batch">2022 Batch</option><option value="Intern">Intern</option><option value="JR/SR">JR / SR</option></select>
                                <input type="text" id="reg-college" placeholder="College Name" class="w-full px-4 py-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none text-sm dark:text-white font-medium focus:ring-2 focus:ring-brand-500 transition-shadow" />
                            </div>
                            <input type="tel" id="reg-phone" placeholder="Phone Number" class="w-full px-4 py-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none text-sm dark:text-white font-medium focus:ring-2 focus:ring-brand-500 transition-shadow" />
                        </div>
                        <button onclick="window.handleEmailSignUp(this)" class="w-full py-4 rounded-xl text-sm font-bold bg-green-600 text-white shadow-lg shadow-green-600/30 active:scale-95 transition-all hover:bg-green-700">Create Account</button>
                        <div class="text-center mt-6"><span class="text-sm text-slate-500">Already have an account?</span><button onclick="window.toggleAuthMode('login')" class="text-sm font-bold text-brand-600 dark:text-brand-400 hover:underline ml-1">Sign In</button></div>
                    </div>`;
            }
            els.footer.innerHTML = legalFooterHtml;
        }
    }
};

// ====================================================
// 13. AUTO-PATCH REVIEW & CLINICAL PAGES ON DOM LOAD
// ====================================================
document.addEventListener('DOMContentLoaded', () => {
    window.renderMarkdown = window.sharedRenderMarkdown;

    if (typeof window.toggleBookmark === 'function') {
        window.toggleBookmark = async function(btn, index) {
            if (!window.currentUserObj) {
                return window.showModal("Login Required", "<p class='text-sm text-slate-500 dark:text-slate-400'>Please sign in to save questions to your cloud profile.</p>", `<button onclick="window.closeModal(); window.userPanelApp.open(); window.toggleAuthMode('login')" class="w-full py-3 bg-brand-500 text-white rounded-xl font-bold border-none">Sign In</button>`, "🔒");
            }

            const item = (window.MPP_overrideQObj && index === -1)
                ? window.MPP_overrideQObj
                : window.displayData[index];
            if (!item) return;

            const uniqueId = window.getUniqueQuestionId(item.q);
            const chArray = Array.isArray(item.chapter) ? item.chapter : [item.chapter];
            const chapterString = chArray.length > 0 ? chArray[0] : 'General';

            const bookmarkData = {
                q: item.q,
                type: item.type || "General",
                text: item.stem || "Saved Question",
                stemHtml: item.stem || "Saved Question",
                subject: window.COLLEGE_NAME + " - " + window.SUBJECT_CODE + " - " + chapterString,
                url: window.location.href,
                timestamp: new Date().toISOString()
            };

            if (item.options) bookmarkData.options = item.options;
            if (item.ans_key) bookmarkData.ans_key = item.ans_key;
            if (item.ans_image) bookmarkData.ans_image = item.ans_image;
            if (item.img) bookmarkData.img = item.img;

            const isSaved = window.isBookmarked(item.q);
            if (window.executeBookmarkToggle) {
                window.executeBookmarkToggle(uniqueId, bookmarkData, isSaved);
            }
        };
    }

    if (typeof window.submitReportToForm === 'function' && window.REPORT_CONFIG) {
        window.submitReportToForm = function(qid, btn) {
            const descEl = document.getElementById('report-desc');
            const desc = descEl ? descEl.value : "";
            if (btn) { btn.innerText = "Sending..."; btn.disabled = true; }

            const iframeName = 'hidden_iframe_' + Date.now();
            const iframe = document.createElement('iframe');
            iframe.name = iframeName;
            iframe.style.display = 'none';
            document.body.appendChild(iframe);

            const form = document.createElement('form');
            form.method = 'POST';
            form.action = `https://docs.google.com/forms/d/e/${window.REPORT_CONFIG.formID}/formResponse`;
            form.target = iframeName;
            form.style.display = 'none';

            const inputs = [
                { name: window.REPORT_CONFIG.entryID_QID, value: `${qid} | ${window.location.href}` },
                { name: window.REPORT_CONFIG.entryID_Type, value: window.selectedReportType || "Other" },
                { name: window.REPORT_CONFIG.entryID_Desc, value: desc }
            ];

            inputs.forEach(data => {
                const input = document.createElement('input');
                input.type = 'hidden';
                input.name = data.name;
                input.value = data.value;
                form.appendChild(input);
            });

            document.body.appendChild(form);
            form.submit();

            setTimeout(() => {
                const bodyEl = document.getElementById('modal-body-content');
                const footerEl = document.getElementById('modal-footer-buttons');
                if (bodyEl) {
                    bodyEl.innerHTML = `
                        <div class="text-center py-4">
                            <div class="w-12 h-12 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl border border-green-200 dark:border-green-800">✅</div>
                            <h3 class="font-bold text-slate-900 dark:text-white">Report Sent!</h3>
                            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Thank you. We will review this shortly.</p>
                        </div>`;
                }
                if (footerEl) {
                    footerEl.innerHTML = `<button onclick="window.closeModal()" class="w-full py-3 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 rounded-xl font-bold text-slate-700 dark:text-slate-300 transition-colors">Close</button>`;
                }
                setTimeout(() => { iframe.remove(); form.remove(); }, 2000);
            }, 1000);
        };
    }

    if (typeof window.handleSecretClick === 'function') {
        window.handleSecretClick = function() {
            if (!window.isUserAdmin()) {
                if (window.showModal) {
                    window.showModal("Access Denied", "<p class='text-red-500 font-semibold'>This tool is strictly restricted to administrators only.</p>", `<button onclick="window.closeModal()" class="w-full bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-white font-bold py-3 rounded-xl border-none">Close</button>`, `🚫`);
                }
                return;
            }
            window.showModal("Welcome Admin!", `<p class="text-slate-700 dark:text-slate-300 font-medium">Enter authorization code:</p><input type="text" id="nameInput" class="w-full border dark:border-slate-700 p-3 rounded-xl bg-white dark:bg-slate-800 dark:text-white mt-3 focus:outline-none">`, `<button onclick="window.handleNameSubmission()" class="w-full bg-brand-500 text-white font-bold px-3 py-3 rounded-xl border-none">Execute</button>`, `☕️`);
        };
    }

     // =========================================================================
    // FIREBASE-FIRST (FALLBACK TO GITHUB) EXPORT & CHATGPT HELPER FOR 777 CODES
    // =========================================================================
    window.MPP_syncLexicalGlobals = function(bank) {
        if (!bank) return;
        window.COLLEGE_NAME = bank.collegeName || window.COLLEGE_NAME;
        window.curriculumData = bank.curriculumData || [];
        window.qnaData = bank.qnaData || [];
        try {
            // Sync top-level `let` variables declared inside the HTML page's inline <script>
            const syncFn = new Function('b', `
                try { if (typeof COLLEGE_NAME !== 'undefined') COLLEGE_NAME = b.collegeName; } catch(e) {}
                try { if (typeof curriculumData !== 'undefined') curriculumData = b.curriculumData; } catch(e) {}
                try { if (typeof qnaData !== 'undefined') qnaData = b.qnaData; } catch(e) {}
            `);
            syncFn(bank);
        } catch (e) {}
    };

    window.MPP_getFirebaseFirstBankData = async function() {
        const { college, rawSub, subjectKey, candidateKeys, fileName, candidateFileNames } =
            typeof window.MPP_getVaultKeys === 'function'
                ? window.MPP_getVaultKeys()
                : {
                    college: String(window.COLLEGE_CODE || 'deoghar').toLowerCase(),
                    rawSub: String(window.SUBJECT_CODE || 'CFM').toUpperCase(),
                    subjectKey: String(window.SUBJECT_CODE || 'CFM').toUpperCase(),
                    candidateKeys: [String(window.SUBJECT_CODE || 'CFM').toUpperCase(), String(window.SUBJECT_CODE || 'cfm').toLowerCase()],
                    fileName: `${String(window.SUBJECT_CODE || 'cfm').toLowerCase()}_aiims_${String(window.COLLEGE_CODE || 'deoghar').toLowerCase()}_data.json`,
                    candidateFileNames: [`${String(window.SUBJECT_CODE || 'cfm').toLowerCase()}_aiims_${String(window.COLLEGE_CODE || 'deoghar').toLowerCase()}_data.json`]
                };

        let loadedBank = null;
        let sourceType = '';
        let sourceDetail = '';

        // 1. TRY FIREBASE CLOUD FIRST
        try {
            const { dbInstance } = await window.MPP_ensureProfsFirebase();
            const { ref, get } = await import("https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js");

            for (const k of candidateKeys) {
                const snap = await get(ref(dbInstance, `question_banks/${college}/${k}`)).catch(() => null);
                if (snap && snap.exists()) {
                    const sanitized = window.MPP_sanitizeBankData(snap.val(), college);
                    if (sanitized && Array.isArray(sanitized.qnaData) && sanitized.qnaData.length > 0) {
                        loadedBank = sanitized;
                        sourceType = 'firebase';
                        sourceDetail = `Firebase Cloud (question_banks/${college}/${k})`;
                        break;
                    }
                }
            }

            // Merge any live admin edits from question_edits so the downloaded file has the latest changes
            if (loadedBank) {
                const subUpper = String(window.SUBJECT_CODE || rawSub || 'CFM').toUpperCase().trim();
                const editsSnap = await get(ref(dbInstance, `question_edits/${college}/${subUpper}/overrides`)).catch(() => null);
                const overrides = (editsSnap && editsSnap.exists()) ? editsSnap.val() : (window.MPP_questionEditsMap || {});
                if (overrides && typeof overrides === 'object') {
                    loadedBank.qnaData = loadedBank.qnaData.map(item => {
                        if (!item || !item.q) return item;
                        const up = String(item.q).trim().toUpperCase();
                        const ov = overrides[up];
                        if (!ov) return item;
                        const updated = { ...item };
                        if (ov.ans_key) updated.ans_key = ov.ans_key;
                        if (Array.isArray(ov.options) && ov.options.length > 0) {
                            updated.options = ov.options.map(o => String(o ?? ""));
                        }
                        if (ov.stem) updated.stem = ov.stem;
                        return updated;
                    });
                }
            }
        } catch (fbErr) {
            console.warn("Firebase fetch unavailable, falling back to GitHub:", fbErr);
        }

        // 2. FALLBACK TO GITHUB JSON FILE IF FIREBASE IS NOT AVAILABLE
        if (!loadedBank) {
            for (const fname of candidateFileNames) {
                try {
                    const response = await fetch(fname, { cache: 'no-store' });
                    if (response.ok) {
                        const jsonData = await response.json();
                        const sanitized = window.MPP_sanitizeBankData(jsonData, college);
                        if (sanitized && Array.isArray(sanitized.qnaData) && sanitized.qnaData.length > 0) {
                            loadedBank = sanitized;
                            sourceType = 'github';
                            sourceDetail = `GitHub Fallback (${fname})`;
                            break;
                        }
                    }
                } catch (ghErr) {}
            }
        }

        // 3. LAST RESORT FALLBACK TO INDEXEDDB CACHE OR IN-MEMORY DATA
        if (!loadedBank) {
            const idbKey = `pro_${college}_${subjectKey}`;
            const cached = typeof window.MPP_idbGet === 'function' ? await window.MPP_idbGet(idbKey) : null;
            if (cached && Array.isArray(cached.qnaData) && cached.qnaData.length > 0) {
                loadedBank = window.MPP_sanitizeBankData(cached, college);
                sourceType = 'cache';
                sourceDetail = `IndexedDB Cache (${idbKey})`;
            } else if (Array.isArray(window.qnaData) && window.qnaData.length > 0) {
                loadedBank = {
                    collegeName: window.COLLEGE_NAME || `AIIMS ${college.toUpperCase()}`,
                    curriculumData: window.curriculumData || [],
                    qnaData: window.qnaData
                };
                sourceType = 'memory';
                sourceDetail = 'In-Memory Page Data';
            }
        }

        if (loadedBank) {
            window.MPP_syncLexicalGlobals(loadedBank);
        }

        return { loadedBank, sourceType, sourceDetail, fileName };
    };

    // Keep reference to the page's original copyForChatGPT if defined
    const origPageCopyForChatGPT = typeof window.copyForChatGPT === 'function' ? window.copyForChatGPT : null;

    // Override downloadDataAsJSON (777calm / 777call) -> Firebase First, then GitHub
    window.downloadDataAsJSON = async function() {
        if (window.showModal) {
            window.showModal(
                "Preparing Download...",
                `<div class="flex items-center gap-3 py-2"><div class="w-6 h-6 border-3 border-sky-500 border-t-transparent rounded-full animate-spin shrink-0"></div><p class="text-xs font-bold text-slate-600 dark:text-slate-300">Checking Firebase Cloud first (fallback: GitHub)...</p></div>`,
                ``,
                `☁️`
            );
        }

        const { loadedBank, sourceType, sourceDetail, fileName } = await window.MPP_getFirebaseFirstBankData();
        if (!loadedBank || !Array.isArray(loadedBank.qnaData) || loadedBank.qnaData.length === 0) {
            if (window.showModal) {
                window.showModal(
                    "Download Failed",
                    `<p class="text-xs text-red-500 font-bold">Could not load question bank from Firebase or GitHub.</p>`,
                    `<button onclick="window.closeModal()" class="w-full py-2.5 bg-slate-200 dark:bg-slate-800 rounded-xl font-bold text-xs border-none">Close</button>`,
                    `❌`
                );
            } else {
                alert("Could not load question bank from Firebase or GitHub.");
            }
            return;
        }

        // Strip internal runtime properties before exporting JSON
        const cleanQna = loadedBank.qnaData.map(item => {
            const copy = { ...item };
            delete copy._imgMerged;
            delete copy._origAnsKey;
            delete copy._origOptions;
            delete copy._origStem;
            return copy;
        });

        const exportPayload = {
            collegeName: loadedBank.collegeName,
            curriculumData: loadedBank.curriculumData,
            qnaData: cleanQna
        };

        const dataStr = JSON.stringify(exportPayload, null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1500);

        if (window.showModal) {
            const badgeColor = sourceType === 'firebase'
                ? 'bg-emerald-100 text-emerald-700 border-emerald-300'
                : 'bg-amber-100 text-amber-700 border-amber-300';
            const badgeIcon = sourceType === 'firebase' ? '🟢 Firebase Cloud' : '⚠️ GitHub Fallback';
            window.showModal(
                "JSON File Downloaded!",
                `<div class="space-y-2 text-left">
                    <div class="inline-block text-[11px] font-extrabold px-2.5 py-1 rounded-full border ${badgeColor}">${badgeIcon}</div>
                    <p class="text-xs text-slate-600 dark:text-slate-300 font-semibold">File: <code class="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded">${fileName}</code></p>
                    <p class="text-[11px] text-slate-500 dark:text-slate-400">Source: <b>${sourceDetail}</b><br>Total Questions: <b>${cleanQna.length}</b></p>
                </div>`,
                `<button onclick="window.closeModal()" class="w-full py-2.5 bg-brand-500 text-white rounded-xl font-bold text-xs border-none">Done</button>`,
                `📥`
            );
        }
    };

    // Override copyForChatGPT (777pankaj) -> Syncs Firebase First (fallback: GitHub) before running
    window.copyForChatGPT = async function() {
        const { loadedBank, sourceType, sourceDetail } = await window.MPP_getFirebaseFirstBankData();
        if (origPageCopyForChatGPT) {
            origPageCopyForChatGPT();
        } else if (loadedBank && typeof window.MPP_buildExamTranscriberPrompt === 'function') {
            const promptText = window.MPP_buildExamTranscriberPrompt({ autoSolveMcq: true });
            if (navigator.clipboard) await navigator.clipboard.writeText(promptText);
            if (window.showModal) {
                window.showModal(
                    "Copied for ChatGPT!",
                    `<p class="text-xs text-slate-600 dark:text-slate-300">Prompt synced from <b>${sourceDetail}</b> (${loadedBank.qnaData.length} questions).</p>`,
                    `<div class="flex gap-2 w-full">
                        <button onclick="window.downloadDataAsJSON()" class="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-xs border-none">⬇️ Download JSON</button>
                        <button onclick="window.closeModal()" class="flex-1 py-2.5 bg-brand-500 text-white rounded-xl font-bold text-xs border-none">Done</button>
                    </div>`,
                    `🤖`
                );
            }
            return;
        }

        // Append a 1-click Download JSON button + source badge into the modal opened by origPageCopyForChatGPT
        setTimeout(() => {
            const footerEl = document.getElementById('modal-footer-buttons');
            const bodyEl = document.getElementById('modal-body-content');
            if (bodyEl && sourceDetail) {
                const badge = sourceType === 'firebase' ? '🟢 Synced from Firebase Cloud' : '⚠️ Synced from GitHub Fallback';
                bodyEl.insertAdjacentHTML('afterbegin', `<div class="mb-2 text-[11px] font-extrabold text-sky-600 dark:text-sky-400">${badge} (${loadedBank ? loadedBank.qnaData.length : 0} Qs)</div>`);
            }
            if (footerEl && !footerEl.querySelector('#btn-777-dl-json')) {
                footerEl.insertAdjacentHTML('afterbegin', `<button id="btn-777-dl-json" onclick="window.downloadDataAsJSON()" class="w-full mb-2 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs border-none cursor-pointer shadow-sm">⬇️ Download JSON File (Firebase First)</button>`);
            }
        }, 50);
    };

    if (typeof window.handleNameSubmission === 'function') {
        window.handleNameSubmission = function() {
            const name = document.getElementById('nameInput') ? document.getElementById('nameInput').value.trim() : "";
            const normalized = name.toLowerCase().replace(/\s+/g, '');
            const secretNorm = String(window.SECRET_CODE || "777pankaj").toLowerCase().replace(/\s+/g, '');

            if (normalized === secretNorm || normalized === "777pankaj") {
                window.closeModal();
                window.copyForChatGPT();
            } else if (normalized === "777calm" || normalized === "777call") {
                window.closeModal();
                window.downloadDataAsJSON();
            } else if (name && Array.isArray(window.motivationalMessages)) {
                const randomIndex = Math.floor(Math.random() * window.motivationalMessages.length);
                const message = window.motivationalMessages[randomIndex].replace(/\[Name\]/g, name);
                window.showModal("Motivation!", `<p class="font-semibold text-slate-900 dark:text-white">${message}</p>`, `<button onclick="window.closeModal()" class="w-full bg-green-500 text-white font-bold py-3 rounded-xl border-none">Back to Study</button>`, `💪`);
            }
        };
    }


    const clinIdInput = document.getElementById('clin-q-id');
    if (clinIdInput && window.SUBJECT_CODE) {
        clinIdInput.placeholder = `e.g. ${window.SUBJECT_CODE}-001`;
    }
});

// ====================================================
// 14. CENTRALIZED FIREBASE SYNC, NEURAL BOOKMARKS & 2-DEVICE GUARD
// ====================================================
(async function initCentralizedFirebaseSync() {
    try {
        const { getApp } = await import("https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js");
        const { getAuth, onAuthStateChanged, signOut, sendPasswordResetEmail } = await import("https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js");
        const { getDatabase, ref, set, update, onValue, remove } = await import("https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js");

        setTimeout(() => {
            let fbApp;
            try { fbApp = getApp(); } catch (e) { return; }
            const auth = getAuth(fbApp);
            const db = getDatabase(fbApp);
            window.db = db;

            // Hook handleEmailLogin so Admin credentials also sign into the MedPYQ Bridge automatically
            const origEmailLogin = window.handleEmailLogin;
            if (typeof origEmailLogin === 'function') {
                window.handleEmailLogin = function(btn) {
                    const eEl = document.getElementById('login-email');
                    const pEl = document.getElementById('login-pass');
                    if (eEl && pEl && window.ADMIN_EMAILS.includes(eEl.value.toLowerCase().trim())) {
                        try {
                            localStorage.setItem('medpyq_bridge_creds', JSON.stringify({
                                e: eEl.value.trim(),
                                p: pEl.value
                            }));
                        } catch (err) {}
                    }
                    return origEmailLogin(btn);
                };
            }

            // 1. Listen to Global Neuro-Recall Public Toggle
            onValue(ref(db, 'settings/global/showNeuroRecall'), (snap) => {
                window.globalNeuroRecallEnabled = Boolean(snap.val());
                window.updateNeuroDueBadges();
                if (window.userPanelApp && window.userPanelApp.isOpen) {
                    window.userPanelApp.renderState();
                }
            });

            // 2. Boot the Teen Patti + Multi-Topic + MedPYQ Bridge Engine on all Review & Clinical pages
            if (window.SUBJECT_CODE && typeof window.MPP_initCrossExamTeenPattiEngine === 'function') {
                window.MPP_initCrossExamTeenPattiEngine(db, auth);
            }

            // 3. Upgrade executeBookmarkToggle to preserve full HTML stems (<img>/<table>) & Spaced-Repetition metadata
            window.executeBookmarkToggle = async function(uniqueId, bookmarkData, isSaved) {
                try {
                    const dbRef = ref(db, `users/${window.currentUserObj.uid}/bookmarks/${uniqueId}`);
                    if (isSaved) {
                        await remove(dbRef);
                        if (window.showModal) window.showModal("Removed", `<p class="text-sm text-slate-500 dark:text-slate-400">Question removed from your saved items.</p>`, `<button onclick="window.closeModal()" class="w-full py-2 bg-slate-200 dark:bg-slate-800 rounded-lg font-bold text-slate-700 dark:text-slate-300 border-none">Close</button>`, `🗑️`);
                    } else {
                        const fullItem = (window.qnaData || window.displayData || []).find(x => x && x.q === bookmarkData.q) || window.MPP_overrideQObj;
                        const enrichedBookmark = {
                            ...bookmarkData,
                            text: (fullItem && fullItem.stem) ? fullItem.stem : bookmarkData.text,
                            stemHtml: (fullItem && fullItem.stem) ? fullItem.stem : (bookmarkData.stemHtml || bookmarkData.text),
                            ans_image: (fullItem && fullItem.ans_image) ? fullItem.ans_image : (bookmarkData.ans_image || null),
                            img: (fullItem && fullItem.img) ? fullItem.img : (bookmarkData.img || null),
                            collegeCode: window.COLLEGE_CODE || 'deoghar',
                            subjectCode: window.SUBJECT_CODE || '',
                            current_step: 1,
                            next_review_date: Date.now()
                        };
                        if (window.liveAnswers && bookmarkData.q && window.liveAnswers[bookmarkData.q] && window.liveAnswers[bookmarkData.q].text) {
                            enrichedBookmark.explanation = window.liveAnswers[bookmarkData.q].text;
                        }
                        await set(dbRef, enrichedBookmark);

                        if (window.showModal) {
                            if (window.canAccessNeuroRecall()) {
                                window.showModal(
                                    "Added to Neuro-Recall! 🧠",
                                    `<p class="text-sm text-slate-500 dark:text-slate-400">Question saved as a 3D Spaced-Repetition Flashcard (with images & math preserved).</p>`,
                                    `<div class="flex gap-2 w-full"><button onclick="window.closeModal(); window.neuroRecallApp.open('due');" class="flex-1 py-2.5 bg-sky-500 text-white rounded-xl font-bold border-none text-xs">Practice Now ⚡</button><button onclick="window.closeModal()" class="flex-1 py-2.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold border-none text-xs">Keep Studying</button></div>`,
                                    `☁️`
                                );
                            } else {
                                window.showModal("Cloud Synced!", `<p class="text-sm text-slate-500 dark:text-slate-400">Question saved to your account. Access it from any device.</p>`, `<button onclick="window.closeModal()" class="w-full py-2 bg-brand-500 text-white rounded-lg font-bold border-none">Awesome</button>`, `☁️`);
                            }
                        }
                    }
                } catch (e) {
                    console.error(e);
                    alert("Error syncing bookmark: " + e.message);
                }
            };

            // 4. Upgrade deleteBookmark
            window.deleteBookmark = async function(qIdOrKey) {
                if (!window.currentUserObj) return;
                if (!confirm("Remove this question from your saved items?")) return;

                let targetKey = qIdOrKey;
                if (window.userBookmarks && !window.userBookmarks[qIdOrKey]) {
                    const foundKey = Object.keys(window.userBookmarks).find(key => window.userBookmarks[key].q === qIdOrKey);
                    if (foundKey) targetKey = foundKey;
                }

                if (window.userBookmarks && window.userBookmarks[targetKey]) {
                    delete window.userBookmarks[targetKey];
                }
                if (window.userPanelApp && window.userPanelApp.isOpen) {
                    window.userPanelApp.renderState();
                }
                if (typeof window.updateBookmarkUI === 'function') {
                    window.updateBookmarkUI();
                }
                window.updateNeuroDueBadges();

                try {
                    await remove(ref(db, `users/${window.currentUserObj.uid}/bookmarks/${targetKey}`));
                } catch (e) {
                    console.error(e);
                    alert("Failed to remove bookmark from cloud: " + e.message);
                }
            };

            // 5. Upgrade Forgot Password handler
            window.handleForgotPass = () => {
                const e = document.getElementById('login-email') ? document.getElementById('login-email').value.trim() : "";
                if (!e) return window.showAuthError("Enter email first");
                sendPasswordResetEmail(auth, e)
                    .then(() => {
                        const errDiv = document.getElementById('auth-error-msg');
                        if (errDiv) {
                            errDiv.innerText = "Reset link sent! Check your inbox.";
                            errDiv.classList.remove('hidden', 'bg-red-50', 'text-red-600', 'border-red-200');
                            errDiv.classList.add('bg-green-50', 'text-green-600', 'border-green-200');
                        }
                    })
                    .catch(err => {
                        if (err.code === 'auth/user-not-found') {
                            window.showAuthError("Your email is not registered with us, please register.");
                        } else {
                            window.showAuthError(err.message);
                        }
                    });
            };

            // 6. Ensure sign-out always clears local session token
            window.firebaseSignOut = () => {
                localStorage.removeItem('my_session_token');
                signOut(auth).then(() => window.location.reload());
            };

            // 7. Listen to Auth & Bookmarks
            onAuthStateChanged(auth, async (user) => {
                if (user) {
                    onValue(ref(db, 'users/' + user.uid + '/bookmarks'), (snapshot) => {
                        window.userBookmarks = snapshot.exists() ? snapshot.val() : {};
                        window.updateNeuroDueBadges();
                    });
                } else {
                    window.updateNeuroDueBadges();
                }

                // Multi-version (standard vs ed8) shared answer fallback for Pathology & Microbiology
                if (user && window.VERSION_CODE && window.COLLEGE_CODE && window.SUBJECT_CODE) {
                    const baseAnswersRef = ref(db, `answers/${window.COLLEGE_CODE}/${window.SUBJECT_CODE}`);
                    const versionAnswersRef = ref(db, `answers/${window.COLLEGE_CODE}/${window.SUBJECT_CODE}_${window.VERSION_CODE}`);
                    let baseAns = {};
                    let verAns = {};
                    const mergeAnswers = () => {
                        window.liveAnswers = { ...baseAns, ...verAns };
                        if (window.displayData && window.displayData.length > 0) {
                            if (typeof window.populateTable === 'function') window.populateTable();
                            if (window.isDeckMode && typeof window.renderDeckCard === 'function') window.renderDeckCard();
                        }
                    };
                    onValue(baseAnswersRef, (s) => { baseAns = s.val() || {}; mergeAnswers(); });
                    onValue(versionAnswersRef, (s) => { verAns = s.val() || {}; mergeAnswers(); });
                }

                // Enforce 2-Device Session Limit on all non-index pages
                const isIndexPage = Boolean(document.getElementById('view-institutes'));
                if (isIndexPage || !user || window.isUserAdmin(user)) return;

                try {
                    const sessionsRef = ref(db, 'users/' + user.uid + '/active_sessions');
                    const myToken = localStorage.getItem('my_session_token') || Math.random().toString(36).substring(2, 15);
                    localStorage.setItem('my_session_token', myToken);

                    await update(ref(db, 'users/' + user.uid), {
                        ['active_sessions/' + myToken]: Date.now()
                    });

                    onValue(sessionsRef, (snap) => {
                        const sessions = snap.val() || {};
                        const sessionKeys = Object.keys(sessions);

                        if (sessionKeys.length > 0 && !sessions[myToken]) {
                            localStorage.removeItem('my_session_token');
                            signOut(auth).then(() => {
                                document.body.innerHTML = `
                                    <div class="fixed inset-0 z-[50000] bg-slate-900 flex flex-col items-center justify-center p-6 text-center">
                                        <div class="w-20 h-20 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center text-4xl mb-6 border border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.3)]">🔒</div>
                                        <h2 class="text-3xl font-black text-white mb-3">Session Terminated</h2>
                                        <p class="text-slate-400 max-w-md mb-8 font-medium leading-relaxed">You logged into your account on a new device. To maintain your 2-device limit, this older session has been automatically signed out.</p>
                                        <button onclick="window.location.reload()" class="px-8 py-4 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-xl shadow-lg shadow-brand-500/30 transition-all active:scale-95 text-lg">Return to Login</button>
                                    </div>
                                `;
                            });
                            return;
                        }

                        if (sessionKeys.length > 2) {
                            sessionKeys.sort((a, b) => sessions[a] - sessions[b]);
                            const keysToRemove = sessionKeys.slice(0, sessionKeys.length - 2);
                            keysToRemove.forEach(key => {
                                remove(ref(db, 'users/' + user.uid + '/active_sessions/' + key));
                            });
                        }
                    });
                } catch (err) {
                    console.error("Session guard error:", err);
                }
            });
        }, 300);
    } catch (e) {
        // Ignore on static pages without Firebase
    }
})();
// ====================================================
// 15. CROSS-FIREBASE TEEN PATTI DECK, MULTI-TOPIC LINKER & REAL-TIME EDITOR
// ====================================================
window.PROFS_FIREBASE_CONFIG = {
    apiKey: "AIzaSyDvPdEhkK1VDkuAqIhlSXPL2MXxlv7Mo9c",
    authDomain: "mbbs-profs-prep48c.firebaseapp.com",
    databaseURL: "https://mbbs-profs-prep48c-default-rtdb.firebaseio.com",
    projectId: "mbbs-profs-prep48c",
    storageBucket: "mbbs-profs-prep48c.firebasestorage.app",
    messagingSenderId: "378639777472",
    appId: "1:378639777472:web:9c2dcb689d97025f6ff725"
};

window.globalFeatureFlags = {
    showTeenPatti: true,
    showCrossExamPG: false,
    showAnswerCards: false
};

window.MPP_medpyqExplanations = window.MPP_medpyqExplanations || {};
window.MPP_allExamLookup = window.MPP_allExamLookup || {};
window.MPP_questionEditsMap = window.MPP_questionEditsMap || {};

// Sanitize any loaded question bank so numeric options (e.g. 120, 7.4 in Physiology) or Firebase objects never crash populateTable()
window.MPP_sanitizeBankData = function(rawPayload, collegeFallback) {
    if (!rawPayload) return null;
    let rawList = [];
    let collegeName = `AIIMS ${(collegeFallback || 'deoghar').toUpperCase()}`;
    let rawCurr = [];

    if (Array.isArray(rawPayload)) {
        rawList = rawPayload;
    } else if (rawPayload && typeof rawPayload === 'object') {
        if (rawPayload.collegeName) collegeName = String(rawPayload.collegeName);
        if (rawPayload.curriculumData) {
            rawCurr = Array.isArray(rawPayload.curriculumData)
                ? rawPayload.curriculumData
                : Object.values(rawPayload.curriculumData);
        }
        if (rawPayload.qnaData) {
            rawList = Array.isArray(rawPayload.qnaData)
                ? rawPayload.qnaData
                : Object.values(rawPayload.qnaData);
        }
    }

    const curriculumData = rawCurr.filter(Boolean).map(group => {
        if (typeof group === 'string') return group;
        if (group && typeof group === 'object') {
            return {
                ...group,
                unit: String(group.unit || ''),
                chapters: Array.isArray(group.chapters)
                    ? group.chapters.map(c => String(c))
                    : Object.values(group.chapters || {}).map(c => String(c))
            };
        }
        return String(group);
    });

    const qnaData = rawList.filter(Boolean).map((item, idx) => {
        const cleanItem = { ...item };
        cleanItem.q = String(item.q || `Q${idx + 1}`).trim();
        cleanItem.stem = String(item.stem ?? "");
        cleanItem.type = String(item.type || (item.options ? "MCQ" : "Theory"));
        cleanItem.ans_key = String(item.ans_key ?? "").trim();
        cleanItem.examBatch = item.examBatch || "Prof Exam";
        cleanItem.chapter = item.chapter || "General";

        if (item.options) {
            const optArr = Array.isArray(item.options) ? item.options : Object.values(item.options);
            cleanItem.options = optArr.map(o => String(o ?? ""));
        }
        return cleanItem;
    });

    return { collegeName, curriculumData, qnaData };
};

window.MPP_initCrossExamTeenPattiEngine = async function(profsDb, profsAuth) {
    if (window.MPP_engineInitialized) return;
    window.MPP_engineInitialized = true;

    try {
        if (!document.getElementById('tp-unboxed-floating-styles')) {
            const unboxedStyles = `
            <style id="tp-unboxed-floating-styles">
                #deck-card-container.tp-fan-open {
                    overflow-y: auto !important;
                    overflow-x: hidden !important;
                    display: block !important;
                    padding-bottom: 60px !important;
                }
                #deck-card-container.tp-fan-open .flashcard-container,
                #deck-card-container.tp-fan-open .flashcard-inner,
                #deck-card-container.tp-fan-open .flashcard-front {
                    position: static !important;
                    height: auto !important;
                    min-height: 0 !important;
                    overflow: visible !important;
                    transform: none !important;
                    -webkit-transform: none !important;
                }
                #deck-card-container.tp-fan-open .deck-card {
                    height: auto !important;
                    min-height: 0 !important;
                    overflow: visible !important;
                    position: relative !important;
                }
                #deck-card-container.tp-fan-open .deck-card > div {
                    overflow: visible !important;
                    max-height: none !important;
                }
                .tp-parent-overlay {
                    position: relative !important;
                    margin-top: 8px !important;
                    margin-bottom: 10px !important;
                    z-index: 120 !important;
                    display: flex !important;
                    flex-direction: column !important;
                    align-items: center !important;
                    justify-content: flex-start !important;
                    background: transparent !important;
                    border: none !important;
                    box-shadow: none !important;
                    overflow: visible !important;
                    pointer-events: auto !important;
                }
                .tp-parent-overlay.overlap-mcq {
                    margin-top: -230px !important;
                }
                .tp-admin-extended-section {
                    width: 100% !important;
                    max-width: 560px !important;
                    margin: 0 auto !important;
                    padding: 4px 0 20px 0 !important;
                    background: transparent !important;
                    border: none !important;
                    box-shadow: none !important;
                    overflow: visible !important;
                }
                .tp-fan-stage {
                    overflow: visible !important;
                    background: transparent !important;
                    border: none !important;
                    box-shadow: none !important;
                }
                .tp-patti-thumb-box {
                    width: 100%;
                    height: 68px;
                    margin: 2px 0 5px 0;
                    border-radius: 8px;
                    overflow: hidden;
                    background: #f8fafc;
                    border: 1px solid #cbd5e1;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }
                html.dark .tp-patti-thumb-box {
                    background: #1e293b;
                    border-color: #334155;
                }
                .tp-patti-thumb-box img {
                    max-width: 100% !important;
                    max-height: 100% !important;
                    width: auto !important;
                    height: auto !important;
                    object-fit: contain !important;
                    display: block !important;
                    margin: 0 !important;
                }
                .deck-card img, #qnaTable img {
                    cursor: zoom-in;
                }
            </style>`;
            document.head.insertAdjacentHTML('beforeend', unboxedStyles);
        }

        if (!window.MPP_imgZoomBound) {
            window.MPP_imgZoomBound = true;
            document.addEventListener('click', (e) => {
                const imgEl = e.target.closest('.deck-card img, #qnaTable img, #ans-modal-body img');
                if (imgEl && !imgEl.closest('.tp-patti')) {
                    e.stopPropagation();
                    window.openNrLightbox(imgEl.src);
                }
            });
        }

        const { initializeApp, getApps } = await import("https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js");
        const { getAuth, signInWithEmailAndPassword, onAuthStateChanged } = await import("https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js");
        const { getDatabase, ref, get, set, update, onValue } = await import("https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js");

        const SUBJECT_BRIDGE_MAP = {
            'psm': 'cfm',
            'cfm': 'cfm',
            'community-medicine': 'cfm',
            'ophthal': 'ophthalmology',
            'ophthalmology': 'ophthalmology',
            'pediatrics': 'paediatrics',
            'paediatrics': 'paediatrics',
            'anesthesiology': 'anaesthesia',
            'anesthesia': 'anaesthesia',
            'anaesthesia': 'anaesthesia',
            'orthopedics': 'orthopaedics',
            'orthopaedics': 'orthopaedics',
            'physio': 'physiology',
            'physiology': 'physiology'
        };
        let detectedSub = window.SUBJECT_CODE;
        if (!detectedSub) {
            const m = window.location.pathname.match(/\/([a-z0-9-]+?)-(?:review|clinical)\.html/i);
            if (m) detectedSub = m[1];
        }
        const rawSub = String(detectedSub || 'cfm').toLowerCase().trim();
        const activeSubjectSlug = SUBJECT_BRIDGE_MAP[rawSub] || rawSub;
        const collegeCode = String(window.COLLEGE_CODE || 'deoghar').toLowerCase().trim();
        const subjectCodeUpper = String(detectedSub || 'CFM').toUpperCase().trim();

        window.MPP_state = {
            subjectSlug: activeSubjectSlug,
            overrideQid: null,
            fanViewOpen: false,
            activeTopicSlug: null,
            adminTopFilter: 'all',
            fanPosMap: {},
            medpyqConnected: false,
            banksPreloaded: false
        };
        window.MPP_overrideQObj = null;
        window.MPP_crossLinksMap = {};
        window.MPP_crossClustersMap = {};
        window.MPP_nodeTopicsMap = {};
        window.MPP_crossLinksHistory = [];
        window.MPP_undoStack = [];
        window.MPP_redoStack = [];
        window.MPP_longPressTimer = null;
        window.MPP_longPressTriggered = false;
        window.MPP_editingAnchorQid = null;

        window.MPP_normalizeImgUrl = function(rawUrl) {
            if (!rawUrl) return "";
            let u = String(rawUrl).trim();
            if (!u || u === "null" || u === "undefined") return "";
            const gDriveMatch = u.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/) || u.match(/drive\.google\.com\/uc\?.*id=([a-zA-Z0-9_-]+)/);
            if (gDriveMatch) return `https://lh3.googleusercontent.com/d/${gDriveMatch[1]}`;
            if (!/^https?:\/\//i.test(u) && !u.startsWith('data:')) {
                u = 'https://medpyq.github.io/' + u.replace(/^\/+/, '');
            }
            return u;
        };

        window.MPP_extractQuestionImage = function(qObj) {
            if (!qObj) return "";
            const directImg = qObj.img || qObj.image || qObj.q_img || qObj.imgUrl || "";
            if (directImg && String(directImg).trim() !== "") {
                return window.MPP_normalizeImgUrl(directImg);
            }
            if (qObj.stem) {
                const m = String(qObj.stem).match(/<img[^>]+src=['"]([^'"]+)['"]/i);
                if (m && m[1]) return window.MPP_normalizeImgUrl(m[1]);
            }
            return "";
        };

        window.MPP_buildStemWithImage = function(stemHtml, imgUrl) {
            let s = String(stemHtml || "");
            const normImg = window.MPP_normalizeImgUrl(imgUrl);
            if (normImg && !s.includes(normImg) && !/<img[^>]+src=/i.test(s)) {
                s += `<div class="my-3 text-center"><img src="${normImg}" class="max-w-full max-h-72 w-auto h-auto mx-auto rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm cursor-zoom-in" alt="Question Image"></div>`;
            }
            return s;
        };

        window.MPP_buildExplanationWithImages = function(rawExpl, item) {
            let expl = String(rawExpl || "");
            const extraImg = (item && (item.expl_img || item.explanation_img || item.ans_image)) ? window.MPP_normalizeImgUrl(item.expl_img || item.explanation_img || item.ans_image) : "";
            expl = expl.replace(/(^|[\s>])(https?:\/\/[^\s<"')]+\.(?:png|jpe?g|webp|gif|svg)(?:\?[^\s<"')]*)?)/gi, (match, prefix, url) => {
                return `${prefix}<div class="my-3 text-center"><img src="${url}" class="max-w-full max-h-80 w-auto h-auto mx-auto rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm cursor-zoom-in" alt="Explanation Image"></div>`;
            });
            if (extraImg && !expl.includes(extraImg)) {
                expl = `<div class="my-3 text-center"><img src="${extraImg}" class="max-w-full max-h-80 w-auto h-auto mx-auto rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm cursor-zoom-in" alt="Explanation Image"></div>\n` + expl;
            }
            return expl;
        };

        const medpyqConfig = {
            apiKey: "AIzaSyAp8tKgVyc6PC-yt0Nv4nOOtH8B8jCaSYE",
            authDomain: "medpyq-elearning.firebaseapp.com",
            databaseURL: "https://medpyq-elearning-default-rtdb.firebaseio.com",
            projectId: "medpyq-elearning"
        };

        let medpyqApp = getApps().find(a => a.name === "MedPYQBridge");
        if (!medpyqApp) medpyqApp = initializeApp(medpyqConfig, "MedPYQBridge");
        const medpyqAuth = getAuth(medpyqApp);
        const medpyqDb = getDatabase(medpyqApp);
        window.medpyqDb = medpyqDb;
        window.medpyqAuth = medpyqAuth;

        window.MPP_updateBridgeBadgeUI = function() {
            const badge = document.getElementById('mpp-bridge-status-badge');
            if (!badge) return;
            if (window.MPP_state.medpyqConnected) {
                const count = Object.keys(window.MPP_allExamLookup || {}).length;
                badge.className = "text-[10px] font-extrabold px-2.5 py-0.5 rounded-full cursor-pointer bg-emerald-100 text-emerald-700 border border-emerald-300";
                badge.innerHTML = `🟢 MedPYQ Synced (${count} Qs)`;
            } else {
                badge.className = "text-[10px] font-extrabold px-2.5 py-0.5 rounded-full cursor-pointer bg-amber-100 text-amber-700 border border-amber-300 animate-pulse";
                badge.innerHTML = "⚡ Tap to Connect MedPYQ Bridge";
            }
        };

        window.MPP_promptBridgeAuth = async function() {
            if (!window.isUserAdmin()) return;
            const defaultEmail = (window.currentUserObj && window.currentUserObj.email) ? window.currentUserObj.email : "educateindiainstitute@gmail.com";
            const email = prompt("MedPYQ Admin Email (for NEET-PG / INI-CET / CMS / FMGE sync):", defaultEmail);
            if (!email) return;
            const pass = prompt(`Enter your MedPYQ password for ${email}:`);
            if (!pass) return;
            try {
                await signInWithEmailAndPassword(medpyqAuth, email.trim(), pass);
                localStorage.setItem('medpyq_bridge_creds', JSON.stringify({ e: email.trim(), p: pass }));
                window.MPP_state.medpyqConnected = true;
                window.MPP_state.banksPreloaded = false;
                await window.MPP_preloadMedPYQBanks();
                window.MPP_updateBridgeBadgeUI();
                alert(`MedPYQ Bridge connected! Loaded ${Object.keys(window.MPP_allExamLookup).length} cross-exam questions.`);
            } catch (e) {
                alert("MedPYQ Bridge login failed: " + e.message);
            }
        };

        const tryConnectAndPreloadMedPYQ = async () => {
            if (!window.isUserAdmin()) return;
            if (medpyqAuth.currentUser) {
                window.MPP_state.medpyqConnected = true;
                window.MPP_updateBridgeBadgeUI();
                if (!window.MPP_state.banksPreloaded) await window.MPP_preloadMedPYQBanks();
            } else {
                try {
                    const cached = JSON.parse(localStorage.getItem('medpyq_bridge_creds') || 'null');
                    if (cached && cached.e && cached.p) {
                        await signInWithEmailAndPassword(medpyqAuth, cached.e, cached.p);
                    } else {
                        await window.MPP_preloadMedPYQBanks();
                    }
                } catch (e) {}
            }
        };

        onAuthStateChanged(medpyqAuth, (mUser) => {
            if (mUser) {
                window.MPP_state.medpyqConnected = true;
                window.MPP_updateBridgeBadgeUI();
                tryConnectAndPreloadMedPYQ();
            }
        });

        onAuthStateChanged(profsAuth, (pUser) => {
            window.currentUserObj = pUser;
            if (window.isUserAdmin(pUser)) tryConnectAndPreloadMedPYQ();
        });

        window.MPP_inferExamFromQid = function(qid) {
            if (!qid) return 'aiims-profs';
            const clean = String(qid).trim().toUpperCase();
            if (Array.isArray(window.qnaData) && window.qnaData.some(x => x && String(x.q).trim().toUpperCase() === clean)) {
                return 'aiims-profs';
            }
            if (window.MPP_allExamLookup[clean] && window.MPP_allExamLookup[clean].examKey) {
                return window.MPP_allExamLookup[clean].examKey;
            }
            if (clean.startsWith('INI') || clean.startsWith('IN')) return 'inicet';
            if (clean.startsWith('CMS') || clean.startsWith('UPSC')) return 'upsc-cms';
            if (clean.startsWith('FMGE') || clean.startsWith('F')) return 'fmge';
            if (clean.startsWith('N')) return 'neet-pg';
            return 'aiims-profs';
        };

        window.MPP_getExamBorderColor = function(qid) {
            const ex = window.MPP_inferExamFromQid(qid);
            if (ex === 'neet-pg') return '#2563eb';
            if (ex === 'inicet') return '#9333ea';
            if (ex === 'upsc-cms') return '#eab308';
            if (ex === 'fmge') return '#22c55e';
            return '#0ea5e9';
        };

        window.MPP_preloadMedPYQBanks = async function() {
            const pgExams = [
                { key: 'neet-pg', prefix: 'N' },
                { key: 'inicet', prefix: 'IN' },
                { key: 'upsc-cms', prefix: 'CMS' },
                { key: 'fmge', prefix: 'F' }
            ];
            let loadedAny = false;
            await Promise.all(pgExams.map(async ({ key: ex, prefix }) => {
                try {
                    const snap = await get(ref(medpyqDb, `question_banks/${ex}/${activeSubjectSlug}`));
                    if (snap.exists()) {
                        loadedAny = true;
                        const raw = snap.val();
                        const arr = (Array.isArray(raw) ? raw : Object.values(raw)).filter(Boolean);
                        arr.forEach((item, idx) => {
                            const rawUid = String(item.q || `${prefix}${idx + 1}`).trim();
                            const up = rawUid.toUpperCase();
                            const numMatch = up.match(/(\d+)$/);
                            const numPart = numMatch ? numMatch[1] : String(idx + 1);
                            const prefixedAlias = `${prefix}${numPart}`;

                            let fullYear = item.exam || ex.toUpperCase();
                            if (item.year_paper) fullYear += " " + item.year_paper;
                            const ch = Array.isArray(item.topic) ? item.topic : [item.topic || item.subject || ex.toUpperCase()];

                            const normImg = window.MPP_normalizeImgUrl(item.img || item.image || item.q_img || "");
                            const enrichedStem = window.MPP_buildStemWithImage(item.stem || "", normImg);
                            const enrichedExpl = window.MPP_buildExplanationWithImages(item.explanation || "", item);

                            const qRecord = {
                                q: rawUid,
                                uid: rawUid,
                                type: 'MCQ',
                                rawStem: String(item.stem || ""),
                                stem: enrichedStem,
                                options: Array.isArray(item.options) ? item.options.map(o => String(o ?? "")) : ["Option A", "Option B", "Option C", "Option D"],
                                ans_key: String(item.ans_key || "A"),
                                chapter: ch,
                                examBatch: fullYear,
                                explanation: enrichedExpl,
                                img: normImg || null,
                                examKey: ex,
                                isMedPYQ: true
                            };

                            window.MPP_allExamLookup[up] = qRecord;
                            window.MPP_allExamLookup[prefixedAlias] = qRecord;
                            if (ex === 'inicet') window.MPP_allExamLookup[`INI${numPart}`] = qRecord;

                            if (enrichedExpl) {
                                window.MPP_medpyqExplanations[up] = enrichedExpl;
                                window.MPP_medpyqExplanations[prefixedAlias] = enrichedExpl;
                                if (ex === 'inicet') window.MPP_medpyqExplanations[`INI${numPart}`] = enrichedExpl;
                                if (!window.liveAnswers) window.liveAnswers = {};
                                window.liveAnswers[rawUid] = { text: enrichedExpl };
                                window.liveAnswers[prefixedAlias] = { text: enrichedExpl };
                            }
                        });
                    }
                } catch (e) {}
            }));

            if (loadedAny) {
                window.MPP_state.banksPreloaded = true;
                window.MPP_state.medpyqConnected = true;
            }
            window.MPP_updateBridgeBadgeUI();

            try {
                onValue(ref(medpyqDb, `question_edits/${activeSubjectSlug}/overrides`), (snap) => {
                    const ovs = snap.val() || {};
                    Object.keys(ovs).forEach(upKey => {
                        if (window.MPP_allExamLookup[upKey]) {
                            const rec = window.MPP_allExamLookup[upKey];
                            if (ovs[upKey].ans_key) rec.ans_key = ovs[upKey].ans_key;
                            if (ovs[upKey].explanation !== undefined) {
                                const enriched = window.MPP_buildExplanationWithImages(ovs[upKey].explanation, rec);
                                rec.explanation = enriched;
                                window.MPP_medpyqExplanations[upKey] = enriched;
                                if (!window.liveAnswers) window.liveAnswers = {};
                                window.liveAnswers[rec.q] = { text: enriched };
                            }
                        }
                    });
                });
                onValue(ref(medpyqDb, `cross_links/${activeSubjectSlug}`), (snap) => {
                    if (snap.exists()) ingestCrossLinksData(snap.val());
                });
            } catch (e) {}

            if (window.isDeckMode && typeof window.renderDeckCard === 'function') {
                window.renderDeckCard();
            }
        };

        onValue(ref(profsDb, `clinical_data/${collegeCode}/${subjectCodeUpper}`), (snap) => {
            const data = snap.val() || {};
            Object.keys(data).forEach(k => {
                const up = String(k).trim().toUpperCase();
                const d = data[k];
                if (d && !window.MPP_allExamLookup[up]) {
                    const normImg = window.MPP_normalizeImgUrl(d.img || "");
                    const enrichedStem = window.MPP_buildStemWithImage(d.stem || "", normImg);
                    const enrichedExpl = window.MPP_buildExplanationWithImages(d.answer || "", d);
                    window.MPP_allExamLookup[up] = {
                        q: k,
                        uid: k,
                        type: d.type || "Theory",
                        rawStem: String(d.stem || ""),
                        stem: enrichedStem,
                        options: Array.isArray(d.options) ? d.options.map(o => String(o ?? "")) : null,
                        ans_key: String(d.ans_key || ""),
                        chapter: Array.isArray(d.chapter) ? d.chapter : [d.chapter || "Clinical Case"],
                        examBatch: d.examBatch || "Clinical Wards",
                        explanation: enrichedExpl,
                        img: normImg || null,
                        examKey: 'aiims-profs'
                    };
                    if (enrichedExpl) {
                        window.MPP_medpyqExplanations[up] = enrichedExpl;
                        if (!window.liveAnswers) window.liveAnswers = {};
                        if (!window.liveAnswers[k]) window.liveAnswers[k] = { text: enrichedExpl };
                    }
                }
            });
        });

        window.MPP_resolveQuestionByQid = function(qid) {
            if (!qid) return null;
            const clean = String(qid).trim();
            const up = clean.toUpperCase();

            if (Array.isArray(window.qnaData)) {
                const localMatch = window.qnaData.find(x => x && String(x.q).trim().toUpperCase() === up);
                if (localMatch) {
                    if (localMatch.img && !localMatch._imgMerged) {
                        localMatch.stem = window.MPP_buildStemWithImage(localMatch.stem, localMatch.img);
                        localMatch._imgMerged = true;
                    }
                    const ov = window.MPP_questionEditsMap[up];
                    if (ov) {
                        if (ov.stem) localMatch.stem = window.MPP_buildStemWithImage(ov.stem, localMatch.img);
                        if (ov.ans_key) localMatch.ans_key = ov.ans_key;
                        if (Array.isArray(ov.options)) localMatch.options = ov.options.map(o => String(o ?? ""));
                    }
                    return localMatch;
                }
            }

            if (window.MPP_allExamLookup[up]) {
                const found = window.MPP_allExamLookup[up];
                const ov = window.MPP_questionEditsMap[up];
                if (ov) {
                    if (ov.stem) found.stem = window.MPP_buildStemWithImage(ov.stem, found.img);
                    if (ov.ans_key) found.ans_key = ov.ans_key;
                    if (Array.isArray(ov.options)) found.options = ov.options.map(o => String(o ?? ""));
                }
                const savedExpl = window.MPP_medpyqExplanations[up] || found.explanation;
                if (savedExpl) {
                    if (!window.liveAnswers) window.liveAnswers = {};
                    window.liveAnswers[found.q] = { text: savedExpl };
                    window.liveAnswers[clean] = { text: savedExpl };
                }
                return found;
            }

            if (window.isUserAdmin() && !window.MPP_state.banksPreloaded) {
                tryConnectAndPreloadMedPYQ();
            }

            const guessedExam = window.MPP_inferExamFromQid(clean);
            return {
                q: clean,
                uid: clean,
                type: 'MCQ',
                stem: window.MPP_state.medpyqConnected
                    ? `Question ${clean} not found in ${activeSubjectSlug.toUpperCase()} (${guessedExam.toUpperCase()}).`
                    : `Tap "⚡ Connect MedPYQ Bridge" inside the Admin Linker (long-press pill) to load ${clean} from MedPYQ.`,
                options: ["Option A", "Option B", "Option C", "Option D"],
                ans_key: "A",
                chapter: ["MedPYQ Cross-Link"],
                examBatch: guessedExam.toUpperCase(),
                examKey: guessedExam
            };
        };

        window.MPP_makeTopicSlug = function(rawTitle, fallbackSeedQid) {
            const clean = String(rawTitle || '').trim();
            if (!clean || clean.toLowerCase() === 'linked concept') {
                const seed = String(fallbackSeedQid || 'general').trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
                return 'cluster-' + (seed || 'default');
            }
            return 'topic-' + clean.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        };

        function ingestCrossLinksData(val) {
            if (!val) return;
            const rawNodes = val.nodes || {};
            const normNodes = {};
            Object.keys(rawNodes).forEach(k => {
                const arr = Array.isArray(rawNodes[k]) ? rawNodes[k] : Object.values(rawNodes[k] || {});
                normNodes[String(k).trim().toUpperCase()] = arr.map(x => String(x).trim()).filter(Boolean);
            });

            const rawClusters = val.clusters || {};
            const normClusters = {};
            Object.keys(rawClusters).forEach(slug => {
                const cObj = rawClusters[slug];
                if (cObj && cObj.qids) {
                    const qArr = (Array.isArray(cObj.qids) ? cObj.qids : Object.values(cObj.qids)).map(x => String(x).trim()).filter(Boolean);
                    if (qArr.length > 0) {
                        normClusters[slug] = {
                            slug: slug,
                            title: String(cObj.title || 'Linked Concept').trim(),
                            qids: qArr
                        };
                    }
                }
            });

            const rawNodeTopics = val.node_topics || {};
            const normNodeTopics = {};
            Object.keys(rawNodeTopics).forEach(upKey => {
                const sArr = (Array.isArray(rawNodeTopics[upKey]) ? rawNodeTopics[upKey] : Object.values(rawNodeTopics[upKey] || {}))
                    .map(s => String(s).trim())
                    .filter(s => Boolean(s) && Boolean(normClusters[s]));
                if (sArr.length > 0) {
                    normNodeTopics[String(upKey).trim().toUpperCase()] = sArr;
                }
            });

            Object.keys(normNodes).forEach(upKey => {
                if (!normNodeTopics[upKey] || normNodeTopics[upKey].length === 0) {
                    const seq = normNodes[upKey];
                    if (seq && seq.length > 1) {
                        const seedSlug = window.MPP_makeTopicSlug('Linked Concept', seq[0]);
                        if (!normClusters[seedSlug]) {
                            normClusters[seedSlug] = { slug: seedSlug, title: 'Linked Concept', qids: seq };
                        }
                        normNodeTopics[upKey] = [seedSlug];
                    }
                }
            });

            window.MPP_crossLinksMap = { ...window.MPP_crossLinksMap, ...normNodes };
            window.MPP_crossClustersMap = { ...window.MPP_crossClustersMap, ...normClusters };
            window.MPP_nodeTopicsMap = { ...window.MPP_nodeTopicsMap, ...normNodeTopics };

            if (val.history) {
                const rawHist = val.history;
                window.MPP_crossLinksHistory = (Array.isArray(rawHist) ? rawHist : Object.values(rawHist)).filter(Boolean).slice(0, 10);
            }

            if (val.shared_q_cache && typeof val.shared_q_cache === 'object') {
                Object.keys(val.shared_q_cache).forEach(upKey => {
                    const rec = val.shared_q_cache[upKey];
                    if (rec) {
                        if (!window.MPP_allExamLookup[upKey]) window.MPP_allExamLookup[upKey] = rec;
                        if (rec.explanation) {
                            window.MPP_medpyqExplanations[upKey] = rec.explanation;
                            if (!window.liveAnswers) window.liveAnswers = {};
                            if (!window.liveAnswers[rec.q]) window.liveAnswers[rec.q] = { text: rec.explanation };
                        }
                    }
                });
            }

            const modalEl = document.getElementById('mpp-admin-link-modal');
            if (modalEl && !modalEl.classList.contains('hidden')) {
                window.MPP_renderTopicChips();
                window.MPP_renderLinkHistory();
            }
            if (window.isDeckMode && typeof window.renderDeckCard === 'function') {
                window.renderDeckCard();
            }
        }

        onValue(ref(profsDb, `cross_links/${activeSubjectSlug}`), (snap) => {
            if (snap.exists()) ingestCrossLinksData(snap.val());
        });

        window.MPP_applyOverrideToMemory = function(qid, ov) {
            if (!qid) return;
            const up = String(qid).trim().toUpperCase();
            const applyFn = (item) => {
                if (!item || String(item.q).trim().toUpperCase() !== up) return;
                if (item._origAnsKey === undefined) item._origAnsKey = item.ans_key || '';
                if (item._origOptions === undefined && Array.isArray(item.options)) item._origOptions = [...item.options];
                if (item._origStem === undefined) item._origStem = item.stem || '';

                if (ov) {
                    if (ov.ans_key) item.ans_key = ov.ans_key;
                    if (Array.isArray(ov.options) && ov.options.length > 0) item.options = ov.options.map(o => String(o ?? ""));
                    if (ov.stem) item.stem = window.MPP_buildStemWithImage(ov.stem, item.img);
                    if (ov.explanation !== undefined) {
                        const enriched = window.MPP_buildExplanationWithImages(ov.explanation, item);
                        item.explanation = enriched;
                        window.MPP_medpyqExplanations[up] = enriched;
                        if (!window.liveAnswers) window.liveAnswers = {};
                        window.liveAnswers[item.q] = { text: enriched };
                    }
                }
            };
            (window.qnaData || []).forEach(applyFn);
            (window.displayData || []).forEach(applyFn);
            (window.activeDeckQuestions || []).forEach(applyFn);
            if (window.MPP_allExamLookup[up]) applyFn(window.MPP_allExamLookup[up]);
        };

        onValue(ref(profsDb, `question_edits/${collegeCode}/${subjectCodeUpper}`), (snap) => {
            const val = snap.val() || {};
            const ovs = val.overrides || {};
            window.MPP_questionEditsMap = ovs;
            Object.keys(ovs).forEach(upKey => window.MPP_applyOverrideToMemory(upKey, ovs[upKey]));

            const rawU = val.undoStack || [];
            const rawR = val.redoStack || [];
            window.MPP_undoStack = (Array.isArray(rawU) ? rawU : Object.values(rawU)).filter(Boolean).slice(0, 10);
            window.MPP_redoStack = (Array.isArray(rawR) ? rawR : Object.values(rawR)).filter(Boolean).slice(0, 10);

            if (window.displayData && window.displayData.length > 0 && typeof window.populateTable === 'function') {
                try { window.populateTable(); } catch (e) {}
            }
            if (window.isDeckMode && typeof window.renderDeckCard === 'function') {
                const editBox = document.getElementById('mpp-inline-rt-editor');
                if (!editBox || editBox.classList.contains('hidden')) {
                    try { window.renderDeckCard(); } catch (e) {}
                } else {
                    window.MPP_updateUndoRedoUI();
                }
            }
        });
        // 8. Multi-Dimensional Sub-Topic Sequence Filtering
        window.MPP_filterSequenceByRole = function(rawSeq, fallbackQid, examFilterOverride = null) {
            const cleanFallback = String(fallbackQid || '').trim();
            if (!Array.isArray(rawSeq) || rawSeq.length === 0) {
                return cleanFallback ? [cleanFallback] : [];
            }
            const list = [...rawSeq];
            const canSeePG = window.isUserAdmin() || Boolean(window.globalFeatureFlags && window.globalFeatureFlags.showCrossExamPG);

            if (!canSeePG) {
                const aiimsOnly = list.filter(qid => window.MPP_inferExamFromQid(qid) === 'aiims-profs');
                return aiimsOnly.length > 0 ? aiimsOnly : (cleanFallback ? [cleanFallback] : []);
            }

            if (examFilterOverride && examFilterOverride !== 'all') {
                return list.filter(qid => window.MPP_inferExamFromQid(qid) === examFilterOverride);
            }

            return list;
        };

        window.MPP_getAvailableTopicsForCard = function(anchorQid, displayedQid) {
            const seenSlugs = new Set();
            const topics = [];
            const canSeePG = window.isUserAdmin() || Boolean(window.globalFeatureFlags && window.globalFeatureFlags.showCrossExamPG);

            const collect = (qid) => {
                if (!qid) return;
                const up = String(qid).trim().toUpperCase();
                const slugs = window.MPP_nodeTopicsMap[up] || [];
                slugs.forEach(s => {
                    if (!seenSlugs.has(s) && window.MPP_crossClustersMap[s]) {
                        const c = window.MPP_crossClustersMap[s];
                        if (!canSeePG) {
                            const hasAiims = (c.qids || []).some(id => window.MPP_inferExamFromQid(id) === 'aiims-profs');
                            if (!hasAiims) return;
                        }
                        seenSlugs.add(s);
                        topics.push(c);
                    }
                });
            };
            collect(displayedQid);
            collect(anchorQid);
            return topics;
        };

        window.MPP_getActiveClusterInfo = function(anchorQid, displayedQid, examFilterOverride = null) {
            const topics = window.MPP_getAvailableTopicsForCard(anchorQid, displayedQid);
            const fallbackQid = displayedQid || anchorQid;

            if (topics.length === 0) {
                return {
                    topics: [],
                    activeTopic: null,
                    sequence: fallbackQid ? [String(fallbackQid).trim()] : []
                };
            }

            let activeTopic = topics.find(t => t.slug === window.MPP_state.activeTopicSlug);
            if (!activeTopic) {
                activeTopic = topics[0];
                window.MPP_state.activeTopicSlug = activeTopic.slug;
            }

            const seq = window.MPP_filterSequenceByRole(activeTopic.qids, fallbackQid, examFilterOverride);
            return { topics, activeTopic, sequence: seq };
        };

        window.MPP_getAnchorAndDisplayedQ = function() {
            if (!window.activeDeckQuestions || window.activeDeckQuestions.length === 0) {
                return { anchorQ: null, displayedQ: null };
            }
            const anchorQ = window.activeDeckQuestions[window.deckIndex];
            if (!anchorQ) return { anchorQ: null, displayedQ: null };

            let displayedQ = anchorQ;
            if (window.MPP_state.overrideQid) {
                const resolved = window.MPP_resolveQuestionByQid(window.MPP_state.overrideQid);
                if (resolved) displayedQ = resolved;
            }
            window.MPP_overrideQObj = (displayedQ !== anchorQ) ? displayedQ : null;
            return { anchorQ, displayedQ };
        };

        // 9. Pill Navigation, Topic Switcher & Long-Press Handlers
        window.MPP_stepCluster = function(delta, event) {
            if (event) { event.stopPropagation(); event.preventDefault(); }
            if (window.MPP_longPressTriggered) { window.MPP_longPressTriggered = false; return; }

            const { anchorQ, displayedQ } = window.MPP_getAnchorAndDisplayedQ();
            if (!anchorQ || !displayedQ) return;

            const info = window.MPP_getActiveClusterInfo(anchorQ.q, displayedQ.q);
            const seq = info.sequence;
            const curUpper = String(displayedQ.q).trim().toUpperCase();
            let curIdx = seq.findIndex(id => String(id).trim().toUpperCase() === curUpper);
            if (curIdx === -1) curIdx = 0;

            const nextIdx = curIdx + delta;
            if (nextIdx >= 0 && nextIdx < seq.length) {
                window.MPP_state.overrideQid = seq[nextIdx];
                window.MPP_state.fanViewOpen = false;
                window.renderDeckCard();
            }
        };

        window.MPP_switchTopicDimension = function(slug, event) {
            if (event) { event.stopPropagation(); event.preventDefault(); }
            window.MPP_state.activeTopicSlug = slug;
            const cluster = window.MPP_crossClustersMap[slug];
            if (cluster && Array.isArray(cluster.qids) && cluster.qids.length > 0) {
                const { anchorQ, displayedQ } = window.MPP_getAnchorAndDisplayedQ();
                const filteredSeq = window.MPP_filterSequenceByRole(cluster.qids, anchorQ ? anchorQ.q : null);
                const curUpper = String((displayedQ || anchorQ || {}).q || '').trim().toUpperCase();
                if (!filteredSeq.some(id => String(id).trim().toUpperCase() === curUpper) && filteredSeq.length > 0) {
                    window.MPP_state.overrideQid = filteredSeq[0];
                }
            }
            window.renderDeckCard();
        };

        window.MPP_startPillPress = function(event, qid) {
            if (!window.isUserAdmin()) return;
            window.MPP_longPressTriggered = false;
            clearTimeout(window.MPP_longPressTimer);
            window.MPP_longPressTimer = setTimeout(() => {
                window.MPP_longPressTriggered = true;
                window.MPP_openAdminLinkModal(qid);
            }, 500);
        };

        window.MPP_cancelPillPress = function() {
            clearTimeout(window.MPP_longPressTimer);
        };

        window.MPP_onPillContextMenu = function(event, qid) {
            if (!window.isUserAdmin()) return;
            event.preventDefault();
            event.stopPropagation();
            clearTimeout(window.MPP_longPressTimer);
            window.MPP_longPressTriggered = true;
            window.MPP_openAdminLinkModal(qid);
        };

        window.MPP_onPillCenterClick = function(event) {
            if (event) event.stopPropagation();
            clearTimeout(window.MPP_longPressTimer);
            if (window.MPP_longPressTriggered) {
                window.MPP_longPressTriggered = false;
                return;
            }
            window.MPP_state.fanViewOpen = !window.MPP_state.fanViewOpen;
            window.renderDeckCard();
        };

        // 10. Teen Patti Fanned Card Deck Builder
        window.MPP_stripHtml = function(htmlStr) {
            if (!htmlStr) return "";
            const tmp = document.createElement("div");
            tmp.innerHTML = String(htmlStr);
            return (tmp.textContent || tmp.innerText || "").trim();
        };

        window.MPP_buildFanDeckHTML = function(deckKey, qidList, borderColor, activePos, topicTitle = '') {
            const stageFallbackColor = (!borderColor || borderColor === 'auto') ? '#0ea5e9' : borderColor;
            if (!qidList || qidList.length === 0) {
                return `
                <div class="tp-fan-stage" data-deck-key="${deckKey}" style="--tp-border-color: ${stageFallbackColor}; height: 220px;">
                    <div class="tp-empty-fan-box" style="--tp-border-color: ${stageFallbackColor};">
                        No linked cards in this exam
                    </div>
                </div>`;
            }

            const total = qidList.length;
            const safeActivePos = Math.min(Math.max(0, activePos), total - 1);
            window.MPP_state.fanPosMap[deckKey] = safeActivePos;

            const leftCount = safeActivePos;
            const rightCount = total - 1 - safeActivePos;

            const leftMaxAngle = Math.min(48, leftCount * 10);
            const leftAngleStep = leftCount > 0 ? leftMaxAngle / leftCount : 0;
            const leftShiftStep = leftCount > 0 ? Math.min(22, 110 / leftCount) : 0;

            const rightMaxAngle = Math.min(48, rightCount * 10);
            const rightAngleStep = rightCount > 0 ? rightMaxAngle / rightCount : 0;
            const rightShiftStep = rightCount > 0 ? Math.min(22, 110 / rightCount) : 0;

            const cleanTopicBadge = (topicTitle && topicTitle !== 'Linked Concept')
                ? `<div style="font-size:9.5px; font-weight:800; color:#0369a1; background:#e0f2fe; padding:2px 7px; border-radius:4px; margin-bottom:4px; display:inline-block; max-width:100%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">🏷️ ${topicTitle}</div>`
                : '';

            let cardsHtml = '';
            qidList.forEach((qid, idx) => {
                const qObj = window.MPP_resolveQuestionByQid(qid);
                const displayQid = String(qid).trim();
                const cardColor = (!borderColor || borderColor === 'auto')
                    ? window.MPP_getExamBorderColor(displayQid)
                    : borderColor;

                const offset = idx - safeActivePos;
                const d = Math.abs(offset);

                let transformRule = 'translate3d(0px, 0px, 0px) rotate(0deg) scale(1)';
                let zIdx = 100;

                if (offset < 0) {
                    const rot = -(d * leftAngleStep).toFixed(2);
                    const tx = -(d * leftShiftStep).toFixed(2);
                    const ty = (d * 3).toFixed(2);
                    transformRule = `rotate(${rot}deg) translateX(${tx}px) translateY(${ty}px)`;
                    zIdx = 100 - d;
                } else if (offset > 0) {
                    const rot = (d * rightAngleStep).toFixed(2);
                    const tx = (d * rightShiftStep).toFixed(2);
                    const ty = (d * 3).toFixed(2);
                    transformRule = `rotate(${rot}deg) translateX(${tx}px) translateY(${ty}px)`;
                    zIdx = 100 - d;
                }

                const cleanStem = window.MPP_stripHtml(qObj.rawStem || qObj.stem) || `Question ${displayQid}`;
                const cardImgUrl = window.MPP_extractQuestionImage(qObj);
                const isMCQ = qObj.type === 'MCQ' && Array.isArray(qObj.options) && qObj.options.length > 0;

                const thumbHtml = cardImgUrl
                    ? `<div class="tp-patti-thumb-box"><img src="${cardImgUrl}" alt="Q Image"></div>`
                    : '';
                const stemClampLines = cardImgUrl ? 2 : 5;

                let middleContentHtml = '';
                if (isMCQ) {
                    const opts = qObj.options.slice(0, 4);
                    const status = window.deckStatus ? window.deckStatus[qObj.q] : null;
                    middleContentHtml = opts.map((o, oIdx) => {
                        const char = String.fromCharCode(65 + oIdx);
                        const cleanOpt = window.MPP_stripHtml(o);
                        let statusStyle = '';
                        let charStyle = '';
                        if (status && char === String(qObj.ans_key || '').trim().toUpperCase()) {
                            statusStyle = 'background:#dcfce7; border-color:#22c55e; color:#14532d; font-weight:700;';
                            charStyle = 'background:#22c55e; color:white;';
                        }
                        return `
                        <div class="tp-mini-opt" style="${statusStyle}">
                            <span class="tp-mini-opt-char" style="${charStyle}">${char}</span>
                            <span style="overflow:hidden; text-overflow:ellipsis;">${cleanOpt}</span>
                        </div>`;
                    }).join('');
                } else {
                    const upKey = String(qObj.q).trim().toUpperCase();
                    const rawAns = (window.liveAnswers && window.liveAnswers[qObj.q] && window.liveAnswers[qObj.q].text)
                        || window.MPP_medpyqExplanations[upKey]
                        || qObj.explanation
                        || '';
                    const liveAnsText = rawAns
                        ? window.MPP_stripHtml(rawAns).slice(0, 140) + '...'
                        : 'Tap card to view full Theory question & model answer notes.';
                    middleContentHtml = `
                        <div style="padding:8px 10px; border-radius:8px; background:rgba(14,165,233,0.08); border:1px dashed ${cardColor}; font-size:10.5px; line-height:1.4; color:inherit;">
                            <div style="font-weight:800; color:${cardColor}; text-transform:uppercase; font-size:9.5px; margin-bottom:3px;">📝 Theory / SAQ-LAQ</div>
                            <div style="opacity:0.85; display:-webkit-box; -webkit-line-clamp:${cardImgUrl ? 2 : 4}; -webkit-box-orient:vertical; overflow:hidden;">${liveAnsText}</div>
                        </div>`;
                }

                const batchLabel = Array.isArray(qObj.examBatch) ? qObj.examBatch[0] : (qObj.examBatch || window.COLLEGE_NAME || 'Exam');

                const leftWingHtml = offset < 0 ? `
                    <div class="tp-wing-strip left">
                        <div class="tp-wing-seq">${idx + 1}/${total}</div>
                        <div class="tp-wing-uid" style="color:${cardColor};">${displayQid}</div>
                        <div class="tp-wing-lines">
                            <div class="tp-wing-line"></div>
                            <div class="tp-wing-line" style="width:75%;"></div>
                            <div class="tp-wing-line"></div>
                            <div class="tp-wing-box"></div>
                            <div class="tp-wing-box"></div>
                            <div class="tp-wing-box"></div>
                        </div>
                    </div>` : '';

                const rightWingHtml = offset > 0 ? `
                    <div class="tp-wing-strip right">
                        <div class="tp-wing-seq">${idx + 1}/${total}</div>
                        <div class="tp-wing-uid" style="color:${cardColor};">${displayQid}</div>
                        <div class="tp-wing-lines" style="align-items:flex-end;">
                            <div class="tp-wing-line"></div>
                            <div class="tp-wing-line" style="width:75%;"></div>
                            <div class="tp-wing-line"></div>
                            <div class="tp-wing-box"></div>
                            <div class="tp-wing-box"></div>
                            <div class="tp-wing-box"></div>
                        </div>
                    </div>` : '';

                cardsHtml += `
                <div class="tp-patti"
                     data-qid="${displayQid}"
                     data-idx="${idx}"
                     data-card-color="${cardColor}"
                     style="--tp-border-color: ${cardColor}; border-color: ${cardColor}; transform: ${transformRule}; z-index: ${zIdx};">
                    ${leftWingHtml}
                    ${rightWingHtml}
                    <div style="opacity: ${offset === 0 ? '1' : '0.22'}; transition: opacity 0.2s; display:flex; flex-direction:column; justify-content:space-between; height:100%;">
                        <div>
                            <div class="tp-center-top">
                                <span class="tp-seq-badge" style="background:${cardColor};">${idx + 1}/${total}</span>
                                <span class="tp-qid-badge" style="border-color:${cardColor}; color:${cardColor};">${displayQid}</span>
                            </div>
                            ${cleanTopicBadge}
                            <div class="tp-center-stem" style="-webkit-line-clamp:${stemClampLines};">${cleanStem}</div>
                            ${thumbHtml}
                        </div>
                        <div class="tp-center-opts">${middleContentHtml}</div>
                        <div class="tp-center-bottom">
                            <span class="tp-exam-pill" style="background:rgba(14,165,233,0.08); border:1px solid ${cardColor}; color:${cardColor};">${batchLabel}</span>
                            <span class="tp-tap-hint">Tap card to open full view</span>
                        </div>
                    </div>
                </div>`;
            });

            return `
            <div class="tp-fan-stage" data-deck-key="${deckKey}" style="--tp-border-color: ${stageFallbackColor};">
                ${cardsHtml}
            </div>`;
        };

        window.MPP_updateStageActiveCard = function(stageEl, newPos) {
            const pattis = Array.from(stageEl.querySelectorAll('.tp-patti'));
            const total = pattis.length;
            if (total === 0) return;

            const safePos = Math.min(Math.max(0, newPos), total - 1);
            const deckKey = stageEl.getAttribute('data-deck-key');
            window.MPP_state.fanPosMap[deckKey] = safePos;

            const leftCount = safePos;
            const rightCount = total - 1 - safePos;

            const leftMaxAngle = Math.min(48, leftCount * 10);
            const leftAngleStep = leftCount > 0 ? leftMaxAngle / leftCount : 0;
            const leftShiftStep = leftCount > 0 ? Math.min(22, 110 / leftCount) : 0;

            const rightMaxAngle = Math.min(48, rightCount * 10);
            const rightAngleStep = rightCount > 0 ? rightMaxAngle / rightCount : 0;
            const rightShiftStep = rightCount > 0 ? Math.min(22, 110 / rightCount) : 0;

            pattis.forEach((cardEl, idx) => {
                const offset = idx - safePos;
                const d = Math.abs(offset);
                const qid = cardEl.getAttribute('data-qid');
                const cardColor = cardEl.getAttribute('data-card-color') || window.MPP_getExamBorderColor(qid);

                let transformRule = 'translate3d(0px, 0px, 0px) rotate(0deg) scale(1)';
                let zIdx = 100;

                if (offset < 0) {
                    const rot = -(d * leftAngleStep).toFixed(2);
                    const tx = -(d * leftShiftStep).toFixed(2);
                    const ty = (d * 3).toFixed(2);
                    transformRule = `rotate(${rot}deg) translateX(${tx}px) translateY(${ty}px)`;
                    zIdx = 100 - d;
                } else if (offset > 0) {
                    const rot = (d * rightAngleStep).toFixed(2);
                    const tx = (d * rightShiftStep).toFixed(2);
                    const ty = (d * 3).toFixed(2);
                    transformRule = `rotate(${rot}deg) translateX(${tx}px) translateY(${ty}px)`;
                    zIdx = 100 - d;
                }

                cardEl.style.transform = transformRule;
                cardEl.style.zIndex = zIdx;

                cardEl.querySelectorAll('.tp-wing-strip').forEach(w => w.remove());
                if (offset < 0) {
                    cardEl.insertAdjacentHTML('afterbegin', `
                        <div class="tp-wing-strip left">
                            <div class="tp-wing-seq">${idx + 1}/${total}</div>
                            <div class="tp-wing-uid" style="color:${cardColor};">${qid}</div>
                            <div class="tp-wing-lines">
                                <div class="tp-wing-line"></div>
                                <div class="tp-wing-line" style="width:75%;"></div>
                                <div class="tp-wing-line"></div>
                                <div class="tp-wing-box"></div>
                                <div class="tp-wing-box"></div>
                                <div class="tp-wing-box"></div>
                            </div>
                        </div>`);
                } else if (offset > 0) {
                    cardEl.insertAdjacentHTML('afterbegin', `
                        <div class="tp-wing-strip right">
                            <div class="tp-wing-seq">${idx + 1}/${total}</div>
                            <div class="tp-wing-uid" style="color:${cardColor};">${qid}</div>
                            <div class="tp-wing-lines" style="align-items:flex-end;">
                                <div class="tp-wing-line"></div>
                                <div class="tp-wing-line" style="width:75%;"></div>
                                <div class="tp-wing-line"></div>
                                <div class="tp-wing-box"></div>
                                <div class="tp-wing-box"></div>
                                <div class="tp-wing-box"></div>
                            </div>
                        </div>`);
                }

                const innerBody = cardEl.lastElementChild;
                if (innerBody) innerBody.style.opacity = offset === 0 ? '1' : '0.22';
            });

            if (deckKey === 'main') {
                const activePatti = pattis[safePos];
                if (activePatti) {
                    window.MPP_state.overrideQid = activePatti.getAttribute('data-qid');
                    const pillCountEl = document.getElementById('mpp-pill-center-text');
                    if (pillCountEl) pillCountEl.innerText = `${safePos + 1}/${total}`;
                }
            }
        };

        window.MPP_attachFanInteractions = function() {
            document.querySelectorAll('.tp-fan-stage').forEach(stageEl => {
                const deckKey = stageEl.getAttribute('data-deck-key');
                let startX = 0, startY = 0, deltaX = 0, deltaY = 0, isDragging = false;

                const onStart = (cx, cy) => { startX = cx; startY = cy; deltaX = 0; deltaY = 0; isDragging = true; };
                const onMove = (cx, cy) => { if (!isDragging) return; deltaX = cx - startX; deltaY = cy - startY; };
                const onEnd = (targetEl) => {
                    if (!isDragging) return;
                    isDragging = false;
                    const pattis = stageEl.querySelectorAll('.tp-patti');
                    const total = pattis.length;
                    if (total === 0) return;

                    const curPos = window.MPP_state.fanPosMap[deckKey] || 0;
                    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 35) {
                        if (deltaX < -35 && curPos < total - 1) window.MPP_updateStageActiveCard(stageEl, curPos + 1);
                        else if (deltaX > 35 && curPos > 0) window.MPP_updateStageActiveCard(stageEl, curPos - 1);
                        return;
                    }
                    if (Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10) {
                        const clickedCard = targetEl ? targetEl.closest('.tp-patti') : null;
                        if (clickedCard) {
                            const clickedQid = clickedCard.getAttribute('data-qid');
                            if (clickedQid) {
                                window.MPP_state.overrideQid = clickedQid;
                                window.MPP_state.fanViewOpen = false;
                                window.renderDeckCard();
                            }
                        }
                    }
                };

                stageEl.addEventListener('touchstart', e => { if (e.touches.length === 1) onStart(e.touches[0].clientX, e.touches[0].clientY); }, { passive: true });
                stageEl.addEventListener('touchmove', e => { if (e.touches.length === 1) onMove(e.touches[0].clientX, e.touches[0].clientY); }, { passive: true });
                stageEl.addEventListener('touchend', e => onEnd(e.target));
                stageEl.addEventListener('mousedown', e => onStart(e.clientX, e.clientY));
                stageEl.addEventListener('mousemove', e => onMove(e.clientX, e.clientY));
                stageEl.addEventListener('mouseup', e => onEnd(e.target));
            });
        };

        window.MPP_setAdminTopFilter = function(filterVal) {
            window.MPP_state.adminTopFilter = filterVal;
            window.renderDeckCard();
        };

        // 11. Admin Multi-Topic Linker Modal + Dual-Firebase Sync + 10-Step Undo
        window.MPP_renderTopicChips = function() {
            const listEl = document.getElementById('mpp-admin-topic-chips');
            if (!listEl) return;
            const allClusters = Object.values(window.MPP_crossClustersMap || {}).filter(c => c && c.qids && c.qids.length > 0);
            if (allClusters.length === 0) {
                listEl.innerHTML = `<span class="text-[10px] text-slate-400">No sub-topics yet. Type <b>Topic Name: DGT1, N23</b> below!</span>`;
                return;
            }
            listEl.innerHTML = allClusters.map(c => {
                const safeSlug = c.slug.replace(/'/g, "\\'");
                return `<button type="button" onclick="window.MPP_appendTopicChip('${safeSlug}')" class="admin-topic-chip-btn">➕ ${c.title} (${c.qids.length})</button>`;
            }).join('');
        };

        window.MPP_appendTopicChip = function(slug) {
            const cluster = window.MPP_crossClustersMap[slug];
            const inputEl = document.getElementById('mpp-admin-link-input');
            if (!cluster || !inputEl) return;

            const anchorQid = String(window.MPP_editingAnchorQid || '').trim();
            const anchorUpper = anchorQid.toUpperCase();
            const updatedQids = [...cluster.qids];
            if (anchorQid && !updatedQids.some(id => String(id).trim().toUpperCase() === anchorUpper)) {
                updatedQids.push(anchorQid);
            }
            const formattedLine = `${cluster.title}: ${updatedQids.join(', ')}`;

            const currentLines = inputEl.value.split('\n').map(l => l.trim()).filter(Boolean);
            const existingIdx = currentLines.findIndex(line => {
                if (!line.includes(':')) return false;
                const lineTitle = line.slice(0, line.indexOf(':')).trim();
                return window.MPP_makeTopicSlug(lineTitle, anchorQid) === slug;
            });

            if (existingIdx !== -1) currentLines[existingIdx] = formattedLine;
            else if (currentLines.length === 1 && currentLines[0].toUpperCase() === anchorUpper) currentLines[0] = formattedLine;
            else currentLines.push(formattedLine);

            inputEl.value = currentLines.join('\n');
            inputEl.focus();
        };

        window.MPP_openAdminLinkModal = function(qid) {
            if (!window.isUserAdmin()) return;
            const { displayedQ } = window.MPP_getAnchorAndDisplayedQ();
            const targetQid = String((displayedQ && displayedQ.q) ? displayedQ.q : qid).trim();
            window.MPP_editingAnchorQid = targetQid;

            const up = targetQid.toUpperCase();
            const topicSlugs = window.MPP_nodeTopicsMap[up] || [];
            const lines = [];

            topicSlugs.forEach(s => {
                const cObj = window.MPP_crossClustersMap[s];
                if (cObj && Array.isArray(cObj.qids) && cObj.qids.length > 0) {
                    if (cObj.title && cObj.title !== 'Linked Concept') lines.push(`${cObj.title}: ${cObj.qids.join(', ')}`);
                    else lines.push(cObj.qids.join(', '));
                }
            });

            if (lines.length === 0) {
                const fallbackSeq = window.MPP_crossLinksMap[up] || [targetQid];
                lines.push(fallbackSeq.join(', '));
            }

            document.getElementById('mpp-admin-link-subtitle').innerText = `Subject: ${subjectCodeUpper} (${activeSubjectSlug}) | QID: ${targetQid}`;
            document.getElementById('mpp-admin-link-input').value = lines.join('\n');
            window.MPP_updateBridgeBadgeUI();
            window.MPP_renderTopicChips();
            window.MPP_renderLinkHistory();
            document.getElementById('mpp-admin-link-modal').classList.remove('hidden');
        };

        window.MPP_renderLinkHistory = function() {
            const container = document.getElementById('mpp-admin-link-history');
            if (!container) return;
            if (!window.MPP_crossLinksHistory || window.MPP_crossLinksHistory.length === 0) {
                container.innerHTML = `<div class="text-[11px] text-slate-400 text-center py-2">No recent link history.</div>`;
                return;
            }
            container.innerHTML = window.MPP_crossLinksHistory.map((h, idx) => {
                const timeStr = h.timestamp ? new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
                const summary = h.summaryText || (Array.isArray(h.newSequence) ? h.newSequence.join(', ') : 'Cleared');
                return `
                <div class="flex justify-between items-center gap-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5">
                    <div class="overflow-hidden flex-1">
                        <div class="text-[11px] font-extrabold text-slate-800 dark:text-slate-200 truncate">${summary}</div>
                        <div class="text-[9.5px] text-slate-400">Anchor: ${h.anchorQid || '-'} • ${timeStr}</div>
                    </div>
                    <button onclick="window.MPP_undoCrossLinks(${idx})" class="px-2.5 py-1 rounded bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 text-[10px] font-extrabold cursor-pointer shrink-0">Undo</button>
                </div>`;
            }).join('');
        };

        window.MPP_saveCrossLinks = async function() {
            if (!window.isUserAdmin()) return;
            const rawText = document.getElementById('mpp-admin-link-input').value || '';
            const btn = document.getElementById('btn-mpp-save-links');
            const anchorQid = String(window.MPP_editingAnchorQid || '').trim();
            const anchorUpper = anchorQid.toUpperCase();
            if (!anchorQid) return;

            const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
            const parsedTopics = [];
            const seenSlugsInModal = new Set();

            lines.forEach(line => {
                let rawTitle = 'Linked Concept';
                let qidsPart = line;
                const colonIdx = line.indexOf(':');
                if (colonIdx !== -1) {
                    rawTitle = line.slice(0, colonIdx).trim() || 'Linked Concept';
                    qidsPart = line.slice(colonIdx + 1).trim();
                }
                const seenQidUpper = new Set();
                const orderedQids = [];
                qidsPart.split(',').forEach(token => {
                    const t = token.trim();
                    if (t) {
                        const up = t.toUpperCase();
                        if (!seenQidUpper.has(up)) {
                            seenQidUpper.add(up);
                            orderedQids.push(t);
                        }
                    }
                });
                if (orderedQids.length > 0) {
                    const slug = window.MPP_makeTopicSlug(rawTitle, orderedQids[0]);
                    if (!seenSlugsInModal.has(slug)) {
                        seenSlugsInModal.add(slug);
                        parsedTopics.push({ slug, title: rawTitle, qids: orderedQids });
                    }
                }
            });

            const prevAnchorSlugs = [...(window.MPP_nodeTopicsMap[anchorUpper] || [])];
            const affectedSlugs = new Set([...prevAnchorSlugs, ...parsedTopics.map(t => t.slug)]);
            const affectedQidsUpper = new Set([anchorUpper]);

            affectedSlugs.forEach(s => {
                const c = window.MPP_crossClustersMap[s];
                if (c && Array.isArray(c.qids)) c.qids.forEach(q => affectedQidsUpper.add(String(q).trim().toUpperCase()));
            });
            parsedTopics.forEach(t => t.qids.forEach(q => affectedQidsUpper.add(String(q).trim().toUpperCase())));

            const beforeClusters = {};
            affectedSlugs.forEach(s => {
                beforeClusters[s] = window.MPP_crossClustersMap[s]
                    ? { slug: s, title: window.MPP_crossClustersMap[s].title, qids: [...window.MPP_crossClustersMap[s].qids] }
                    : null;
            });

            const beforeNodeTopics = {};
            const beforeNodes = {};
            affectedQidsUpper.forEach(upKey => {
                beforeNodeTopics[upKey] = window.MPP_nodeTopicsMap[upKey] ? [...window.MPP_nodeTopicsMap[upKey]] : null;
                beforeNodes[upKey] = window.MPP_crossLinksMap[upKey] ? [...window.MPP_crossLinksMap[upKey]] : null;
            });

            const nextClusters = {};
            Object.keys(window.MPP_crossClustersMap).forEach(s => {
                nextClusters[s] = { slug: s, title: window.MPP_crossClustersMap[s].title, qids: [...window.MPP_crossClustersMap[s].qids] };
            });
            const nextNodeTopics = {};
            Object.keys(window.MPP_nodeTopicsMap).forEach(upKey => {
                nextNodeTopics[upKey] = [...window.MPP_nodeTopicsMap[upKey]];
            });

            const removeSlugFromQid = (upKey, slugToRemove) => {
                if (!nextNodeTopics[upKey]) return;
                nextNodeTopics[upKey] = nextNodeTopics[upKey].filter(s => s !== slugToRemove);
                if (nextNodeTopics[upKey].length === 0) delete nextNodeTopics[upKey];
            };
            const addSlugToQid = (upKey, slugToAdd) => {
                if (!nextNodeTopics[upKey]) nextNodeTopics[upKey] = [];
                if (!nextNodeTopics[upKey].includes(slugToAdd)) nextNodeTopics[upKey].push(slugToAdd);
            };

            prevAnchorSlugs.forEach(oldSlug => {
                if (!seenSlugsInModal.has(oldSlug)) {
                    removeSlugFromQid(anchorUpper, oldSlug);
                    if (nextClusters[oldSlug]) {
                        nextClusters[oldSlug].qids = nextClusters[oldSlug].qids.filter(id => String(id).trim().toUpperCase() !== anchorUpper);
                        if (nextClusters[oldSlug].qids.length <= 1) {
                            nextClusters[oldSlug].qids.forEach(remId => removeSlugFromQid(String(remId).trim().toUpperCase(), oldSlug));
                            delete nextClusters[oldSlug];
                        }
                    }
                }
            });

            parsedTopics.forEach(topicObj => {
                const { slug, title, qids } = topicObj;
                const prevQidsInCluster = nextClusters[slug] ? [...nextClusters[slug].qids] : [];
                const newUpperSet = new Set(qids.map(x => String(x).trim().toUpperCase()));
                prevQidsInCluster.forEach(oldId => {
                    const up = String(oldId).trim().toUpperCase();
                    if (!newUpperSet.has(up)) removeSlugFromQid(up, slug);
                });
                if (qids.length <= 1) {
                    qids.forEach(id => removeSlugFromQid(String(id).trim().toUpperCase(), slug));
                    delete nextClusters[slug];
                } else {
                    nextClusters[slug] = { slug, title, qids };
                    qids.forEach(id => addSlugToQid(String(id).trim().toUpperCase(), slug));
                }
            });

            const updates = {};
            affectedSlugs.forEach(s => { updates[`clusters/${s}`] = nextClusters[s] || null; });
            affectedQidsUpper.forEach(upKey => {
                const slugsForQid = nextNodeTopics[upKey] || null;
                updates[`node_topics/${upKey}`] = (slugsForQid && slugsForQid.length > 0) ? slugsForQid : null;
                if (slugsForQid && slugsForQid.length > 0 && nextClusters[slugsForQid[0]]) {
                    updates[`nodes/${upKey}`] = nextClusters[slugsForQid[0]].qids;
                } else {
                    updates[`nodes/${upKey}`] = null;
                }
            });

            const summaryText = parsedTopics.length > 0
                ? parsedTopics.map(t => `${t.title} (${t.qids.join(', ')})`).join(' | ')
                : 'Cleared Links';

            const newHistoryEntry = {
                id: 'H_' + Date.now(),
                timestamp: Date.now(),
                anchorQid: anchorQid,
                summaryText: summaryText,
                newSequence: parsedTopics[0] ? parsedTopics[0].qids : [],
                beforeClusters,
                beforeNodeTopics,
                beforeNodes
            };
            updates['history'] = [newHistoryEntry, ...(window.MPP_crossLinksHistory || [])].slice(0, 10);

            if (parsedTopics.length > 0) window.MPP_state.activeTopicSlug = parsedTopics[0].slug;

            btn.innerText = "Syncing...";
            btn.disabled = true;

            try {
                await update(ref(profsDb, `cross_links/${activeSubjectSlug}`), updates);
                if (window.MPP_state.medpyqConnected) {
                    await update(ref(medpyqDb, `cross_links/${activeSubjectSlug}`), updates).catch(() => {});
                }
                if (typeof window.MPP_syncSharedPGCacheForStudents === 'function') {
                    await window.MPP_syncSharedPGCacheForStudents();
                }
                document.getElementById('mpp-admin-link-modal').classList.add('hidden');
            } catch (err) {
                alert("Failed to sync cross-links: " + err.message);
            } finally {
                btn.innerText = "Apply & Sync Both Apps";
                btn.disabled = false;
            }
        };

        window.MPP_undoCrossLinks = async function(historyIndex) {
            if (!window.isUserAdmin()) return;
            const entry = (window.MPP_crossLinksHistory || [])[historyIndex];
            if (!entry) return;

            const updates = {};
            if (entry.beforeClusters) {
                Object.keys(entry.beforeClusters).forEach(s => { updates[`clusters/${s}`] = entry.beforeClusters[s] || null; });
            }
            if (entry.beforeNodeTopics) {
                Object.keys(entry.beforeNodeTopics).forEach(upKey => {
                    const prevSlugs = entry.beforeNodeTopics[upKey];
                    updates[`node_topics/${upKey}`] = (Array.isArray(prevSlugs) && prevSlugs.length > 0) ? prevSlugs : null;
                });
            }
            if (entry.beforeNodes) {
                Object.keys(entry.beforeNodes).forEach(upKey => {
                    const prevVal = entry.beforeNodes[upKey];
                    updates[`nodes/${upKey}`] = (Array.isArray(prevVal) && prevVal.length > 1) ? prevVal : null;
                });
            }
            updates['history'] = window.MPP_crossLinksHistory.filter((_, idx) => idx !== historyIndex);

            try {
                await update(ref(profsDb, `cross_links/${activeSubjectSlug}`), updates);
                if (window.MPP_state.medpyqConnected) {
                    await update(ref(medpyqDb, `cross_links/${activeSubjectSlug}`), updates).catch(() => {});
                }
                if (window.MPP_editingAnchorQid) {
                    setTimeout(() => window.MPP_openAdminLinkModal(window.MPP_editingAnchorQid), 80);
                }
            } catch (err) {
                alert("Undo failed: " + err.message);
            }
        };

        // 12. Real-Time Admin MCQ Option, Key & Explanation Editor
        window.MPP_toggleInlineEditor = function() {
            const box = document.getElementById('mpp-inline-rt-editor');
            if (box) box.classList.toggle('hidden');
        };

        window.MPP_selectEditKey = function(ltr) {
            document.querySelectorAll('.admin-key-pill').forEach(btn => {
                btn.classList.toggle('active', btn.getAttribute('data-key') === ltr);
            });
            const inp = document.getElementById('mpp-edit-ans-input');
            if (inp) inp.value = ltr;
        };

        window.MPP_saveQuestionEdit = async function(qid) {
            if (!window.isUserAdmin()) return;
            const qObj = window.MPP_resolveQuestionByQid(qid);
            if (!qObj) return;

            const isMCQ = qObj.type === 'MCQ';
            const newAnsKey = isMCQ ? (document.getElementById('mpp-edit-ans-input')?.value || qObj.ans_key || 'A').trim().toUpperCase() : '';
            const newOptions = isMCQ
                ? [0, 1, 2, 3].map(i => {
                    const el = document.getElementById(`mpp-edit-opt-${i}`);
                    return el ? el.value.trim() : String((qObj.options && qObj.options[i]) || '');
                })
                : null;
            const upKey = String(qObj.q).trim().toUpperCase();
            const newExpl = document.getElementById('mpp-edit-expl-input')?.value
                ?? ((window.liveAnswers && window.liveAnswers[qObj.q] && window.liveAnswers[qObj.q].text) || window.MPP_medpyqExplanations[upKey] || '');

            const prevAnsKey = qObj.ans_key || '';
            const prevOptions = Array.isArray(qObj.options) ? [...qObj.options] : null;
            const prevExpl = (window.liveAnswers && window.liveAnswers[qObj.q] && window.liveAnswers[qObj.q].text)
                || window.MPP_medpyqExplanations[upKey]
                || qObj.explanation
                || '';

            const btn = document.getElementById('btn-mpp-save-qe');
            if (btn) { btn.innerText = "Saving Live..."; btn.disabled = true; }

            const examType = window.MPP_inferExamFromQid(qObj.q);

            const actionRecord = {
                id: 'QE_' + Date.now(),
                qid: qObj.q,
                upKey: upKey,
                examType: examType,
                prevAnsKey,
                prevOptions,
                prevExplanation: prevExpl,
                newAnsKey,
                newOptions,
                newExplanation: newExpl,
                timestamp: Date.now()
            };

            const newUndoStack = [actionRecord, ...(window.MPP_undoStack || [])].slice(0, 10);
            const newRedoStack = [];

            const overridePayload = {
                ans_key: newAnsKey,
                options: newOptions,
                explanation: newExpl,
                updatedAt: Date.now()
            };

            try {
                window.MPP_applyOverrideToMemory(upKey, overridePayload);

                await update(ref(profsDb, `question_edits/${collegeCode}/${subjectCodeUpper}`), {
                    [`overrides/${upKey}`]: overridePayload,
                    undoStack: newUndoStack,
                    redoStack: newRedoStack
                });

                if (examType === 'aiims-profs') {
                    await set(ref(profsDb, `answers/${collegeCode}/${subjectCodeUpper}/${qObj.q}`), {
                        text: newExpl,
                        updatedAt: new Date().toISOString(),
                        updatedBy: window.currentUserObj.email
                    });
                } else if (window.MPP_state.medpyqConnected) {
                    await update(ref(medpyqDb, `question_edits/${activeSubjectSlug}`), {
                        [`overrides/${upKey}`]: overridePayload
                    }).catch(() => {});
                }

                window.renderDeckCard();
            } catch (err) {
                alert("Failed to save live edit: " + err.message);
            } finally {
                if (btn) { btn.innerText = "⚡ Save Live"; btn.disabled = false; }
            }
        };

        window.MPP_undoQuestionEdit = async function() {
            if (!window.isUserAdmin() || !window.MPP_undoStack || window.MPP_undoStack.length === 0) return;
            const [latest, ...remUndo] = window.MPP_undoStack;
            const newRedo = [latest, ...(window.MPP_redoStack || [])].slice(0, 10);

            const restored = {
                ans_key: latest.prevAnsKey,
                options: latest.prevOptions,
                explanation: latest.prevExplanation,
                updatedAt: Date.now()
            };

            try {
                window.MPP_applyOverrideToMemory(latest.upKey, restored);
                await update(ref(profsDb, `question_edits/${collegeCode}/${subjectCodeUpper}`), {
                    [`overrides/${latest.upKey}`]: restored,
                    undoStack: remUndo,
                    redoStack: newRedo
                });
                if (latest.examType === 'aiims-profs') {
                    await set(ref(profsDb, `answers/${collegeCode}/${subjectCodeUpper}/${latest.qid}/text`), latest.prevExplanation || "");
                }
                window.renderDeckCard();
            } catch (e) {
                alert("Undo failed: " + e.message);
            }
        };

        window.MPP_redoQuestionEdit = async function() {
            if (!window.isUserAdmin() || !window.MPP_redoStack || window.MPP_redoStack.length === 0) return;
            const [latest, ...remRedo] = window.MPP_redoStack;
            const newUndo = [latest, ...(window.MPP_undoStack || [])].slice(0, 10);

            const reapplied = {
                ans_key: latest.newAnsKey,
                options: latest.newOptions,
                explanation: latest.newExplanation,
                updatedAt: Date.now()
            };

            try {
                window.MPP_applyOverrideToMemory(latest.upKey, reapplied);
                await update(ref(profsDb, `question_edits/${collegeCode}/${subjectCodeUpper}`), {
                    [`overrides/${latest.upKey}`]: reapplied,
                    undoStack: newUndo,
                    redoStack: remRedo
                });
                if (latest.examType === 'aiims-profs') {
                    await set(ref(profsDb, `answers/${collegeCode}/${subjectCodeUpper}/${latest.qid}/text`), latest.newExplanation || "");
                }
                window.renderDeckCard();
            } catch (e) {
                alert("Redo failed: " + e.message);
            }
        };

        window.MPP_updateUndoRedoUI = function() {
            const uBtn = document.getElementById('btn-mpp-qe-undo');
            const rBtn = document.getElementById('btn-mpp-qe-redo');
            const uCount = (window.MPP_undoStack || []).length;
            const rCount = (window.MPP_redoStack || []).length;
            if (uBtn) { uBtn.disabled = uCount === 0; uBtn.innerHTML = `↩️ Undo (${uCount}/10)`; }
            if (rBtn) { rBtn.disabled = rCount === 0; rBtn.innerHTML = `↪️ Redo (${rCount}/10)`; }
        };

        // 13. Hook Deck Navigation & Wrap renderDeckCard
        const hookDeckFunctions = () => {
            if (typeof window.renderDeckCard !== 'function' || window.MPP_deckHooked) return;
            window.MPP_deckHooked = true;

            const origDeckNext = window.deckNext;
            if (typeof origDeckNext === 'function') {
                window.deckNext = function() {
                    window.MPP_state.overrideQid = null;
                    window.MPP_state.fanViewOpen = false;
                    window.MPP_state.activeTopicSlug = null;
                    return origDeckNext.apply(this, arguments);
                };
            }

            const origDeckPrev = window.deckPrev;
            if (typeof origDeckPrev === 'function') {
                window.deckPrev = function() {
                    window.MPP_state.overrideQid = null;
                    window.MPP_state.fanViewOpen = false;
                    window.MPP_state.activeTopicSlug = null;
                    return origDeckPrev.apply(this, arguments);
                };
            }

            const origCheckDeckAns = window.checkDeckAnswer;
            if (typeof origCheckDeckAns === 'function') {
                window.checkDeckAnswer = function(btn, picked, correct) {
                    const { displayedQ } = window.MPP_getAnchorAndDisplayedQ();
                    const p = String(picked).toUpperCase();
                    const c = String(correct).toUpperCase();
                    btn.parentElement.querySelectorAll('button').forEach(b => b.disabled = true);
                    if (p === c) {
                        btn.classList.add('deck-opt-correct');
                        if (displayedQ) window.deckStatus[displayedQ.q] = 'correct';
                    } else {
                        btn.classList.add('deck-opt-wrong');
                        if (displayedQ) window.deckStatus[displayedQ.q] = 'wrong';
                        btn.parentElement.querySelectorAll('button').forEach((b, i) => {
                            if (window.optionLetters[i] === c) b.classList.add('deck-opt-correct');
                        });
                    }
                    if (displayedQ) {
                        const panel = document.getElementById(`deck-ans-panel-${displayedQ.q}`);
                        if (panel && panel.classList.contains('hidden') && typeof window.toggleDeckAnswerPanel === 'function') {
                            window.toggleDeckAnswerPanel(displayedQ.q);
                        }
                    }
                };
            }

            const origRenderDeckCard = window.renderDeckCard;
            window.renderDeckCard = function() {
                const anchorQ = (window.activeDeckQuestions && window.activeDeckQuestions.length > 0)
                    ? window.activeDeckQuestions[window.deckIndex]
                    : null;

                let displayedQ = anchorQ;
                if (anchorQ && window.MPP_state.overrideQid) {
                    const resolved = window.MPP_resolveQuestionByQid(window.MPP_state.overrideQid);
                    if (resolved) {
                        displayedQ = resolved;
                        window.activeDeckQuestions[window.deckIndex] = displayedQ;
                    }
                }

                if (displayedQ) {
                    displayedQ.stem = String(displayedQ.stem ?? "");
                    if (Array.isArray(displayedQ.options)) {
                        displayedQ.options = displayedQ.options.map(o => String(o ?? ""));
                    }
                    const upKey = String(displayedQ.q).trim().toUpperCase();
                    const medExpl = window.MPP_medpyqExplanations[upKey] || displayedQ.explanation;
                    if (medExpl) {
                        if (!window.liveAnswers) window.liveAnswers = {};
                        if (!window.liveAnswers[displayedQ.q] || !window.liveAnswers[displayedQ.q].text) {
                            window.liveAnswers[displayedQ.q] = { text: medExpl };
                        }
                    }
                    if (displayedQ.img && !displayedQ._imgMerged) {
                        displayedQ.stem = window.MPP_buildStemWithImage(displayedQ.stem, displayedQ.img);
                        displayedQ._imgMerged = true;
                    }
                }

                origRenderDeckCard.apply(this, arguments);

                if (anchorQ && displayedQ !== anchorQ) {
                    window.activeDeckQuestions[window.deckIndex] = anchorQ;
                }

                const container = document.getElementById('deck-card-container');
                if (container) {
                    container.classList.toggle('tp-fan-open', Boolean(window.MPP_state.fanViewOpen));
                }

                if (!anchorQ || !displayedQ || window.accessLevel === 'guest') return;

                const deckCard = container ? container.querySelector('.deck-card') : null;
                if (!deckCard) return;

                const isAdmin = window.isUserAdmin();
                const showTPForUser = isAdmin || Boolean(window.globalFeatureFlags && window.globalFeatureFlags.showTeenPatti);
                const showPGForUser = isAdmin || Boolean(window.globalFeatureFlags && window.globalFeatureFlags.showCrossExamPG);

                const clusterInfo = window.MPP_getActiveClusterInfo(
                    anchorQ.q,
                    displayedQ.q,
                    (showPGForUser && window.MPP_state.fanViewOpen) ? window.MPP_state.adminTopFilter : null
                );
                const clusterSeq = clusterInfo.sequence;
                const availableTopics = clusterInfo.topics;
                const activeTopicObj = clusterInfo.activeTopic;

                const curUpper = String(displayedQ.q).trim().toUpperCase();
                let clusterPos = clusterSeq.findIndex(id => String(id).trim().toUpperCase() === curUpper);
                if (clusterPos === -1) clusterPos = 0;
                const totalInCluster = Math.max(1, clusterSeq.length);
                const pillCenterLabel = `${Math.min(clusterPos + 1, totalInCluster)}/${totalInCluster}`;

                const headerRow = deckCard.firstElementChild;
                const qBadge = headerRow ? headerRow.querySelector('span') : null;
                if (showTPForUser && headerRow && qBadge && !headerRow.querySelector('.mpp-cluster-pill')) {
                    const leftWrap = document.createElement('div');
                    leftWrap.className = 'flex items-center gap-2 flex-wrap';
                    qBadge.parentNode.insertBefore(leftWrap, qBadge);
                    leftWrap.appendChild(qBadge);

                    if (displayedQ.q !== anchorQ.q) {
                        qBadge.innerHTML = `${anchorQ.q} <span class="opacity-70">→</span> ${displayedQ.q}`;
                    }

                    const pillHtml = `
                        <div class="mpp-cluster-pill ${window.MPP_state.fanViewOpen ? 'pill-fan-active' : ''}"
                             onmousedown="window.MPP_startPillPress(event, '${displayedQ.q}')"
                             onmouseup="window.MPP_cancelPillPress()"
                             onmouseleave="window.MPP_cancelPillPress()"
                             ontouchstart="window.MPP_startPillPress(event, '${displayedQ.q}')"
                             ontouchend="window.MPP_cancelPillPress()"
                             oncontextmenu="window.MPP_onPillContextMenu(event, '${displayedQ.q}')">
                            <button type="button" class="mpp-cluster-btn" onclick="window.MPP_stepCluster(-1, event)" ${clusterPos <= 0 ? 'disabled' : ''}>&lt;</button>
                            <span class="mpp-cluster-count" id="mpp-pill-center-text" onclick="window.MPP_onPillCenterClick(event)" title="Tap to toggle Teen Patti Fanned Deck">${pillCenterLabel}</span>
                            <button type="button" class="mpp-cluster-btn" onclick="window.MPP_stepCluster(1, event)" ${clusterPos >= clusterSeq.length - 1 ? 'disabled' : ''}>&gt;</button>
                        </div>`;
                    leftWrap.insertAdjacentHTML('beforeend', pillHtml);
                }

                const scrollArea = deckCard.children[1];
                if (!scrollArea) return;

                const showTopicBar = showTPForUser && (availableTopics.length > 1 || (availableTopics.length === 1 && availableTopics[0].title !== 'Linked Concept'));
                if (showTopicBar) {
                    const pillsHtml = availableTopics.map(tObj => {
                        const isAct = activeTopicObj && activeTopicObj.slug === tObj.slug;
                        const tSeq = window.MPP_filterSequenceByRole(tObj.qids, displayedQ.q);
                        const posInT = tSeq.findIndex(id => String(id).trim().toUpperCase() === curUpper);
                        const countLabel = posInT !== -1 ? `${posInT + 1}/${tSeq.length}` : `${tSeq.length}`;
                        const safeSlug = tObj.slug.replace(/'/g, "\\'");
                        return `
                        <button type="button" class="mpp-topic-dim-pill ${isAct ? 'active' : ''}" onclick="window.MPP_switchTopicDimension('${safeSlug}', event)">
                            <span>🏷️ ${tObj.title}</span>
                            <span class="mpp-topic-dim-count">${countLabel}</span>
                        </button>`;
                    }).join('');
                    scrollArea.insertAdjacentHTML('afterbegin', `<div class="mpp-topic-dims-bar">${pillsHtml}</div>`);
                }

                if (showTPForUser && window.MPP_state.fanViewOpen) {
                    const stemBlockIndex = showTopicBar ? 1 : 0;
                    Array.from(scrollArea.children).forEach((child, idx) => {
                        if (idx > stemBlockIndex) {
                            child.classList.add('mpp-body-under-fan');
                        }
                    });

                    const activeTopicTitle = activeTopicObj ? activeTopicObj.title : '';
                    const mainFanHtml = window.MPP_buildFanDeckHTML('main', clusterSeq, 'auto', clusterPos, activeTopicTitle);

                    let adminExtendedHtml = '';
                    if (showPGForUser) {
                        const fullCrossInfo = window.MPP_getActiveClusterInfo(anchorQ.q, displayedQ.q, 'all');
                        const fullSeq = fullCrossInfo.sequence;
                        const aiimsSeq = fullSeq.filter(id => window.MPP_inferExamFromQid(id) === 'aiims-profs');
                        const neetSeq = fullSeq.filter(id => window.MPP_inferExamFromQid(id) === 'neet-pg');
                        const iniSeq = fullSeq.filter(id => window.MPP_inferExamFromQid(id) === 'inicet');
                        const cmsSeq = fullSeq.filter(id => window.MPP_inferExamFromQid(id) === 'upsc-cms');
                        const fmgeSeq = fullSeq.filter(id => window.MPP_inferExamFromQid(id) === 'fmge');
                        const curFilter = window.MPP_state.adminTopFilter || 'all';

                        adminExtendedHtml = `
                        <div class="tp-admin-extended-section">
                            <div class="tp-admin-switcher">
                                <span style="font-size:11px; font-weight:900; color:#ea580c;">&larr;</span>
                                <button type="button" class="tp-switch-btn ${curFilter === 'all' ? 'active' : ''}" onclick="window.MPP_setAdminTopFilter('all')">All Exam</button>
                                <button type="button" class="tp-switch-btn ${curFilter === 'aiims-profs' ? 'active' : ''}" onclick="window.MPP_setAdminTopFilter('aiims-profs')">AIIMS PYQ</button>
                                <button type="button" class="tp-switch-btn ${curFilter === 'neet-pg' ? 'active' : ''}" onclick="window.MPP_setAdminTopFilter('neet-pg')">NEET-PG</button>
                                <button type="button" class="tp-switch-btn ${curFilter === 'inicet' ? 'active' : ''}" onclick="window.MPP_setAdminTopFilter('inicet')">INI</button>
                                <button type="button" class="tp-switch-btn ${curFilter === 'upsc-cms' ? 'active' : ''}" onclick="window.MPP_setAdminTopFilter('upsc-cms')">CMS</button>
                                <button type="button" class="tp-switch-btn ${curFilter === 'fmge' ? 'active' : ''}" onclick="window.MPP_setAdminTopFilter('fmge')">FMGE</button>
                                <span style="font-size:11px; font-weight:900; color:#ea580c;">&rarr;</span>
                            </div>

                            ${window.MPP_buildFanDeckHTML('admin-aiims', aiimsSeq, '#0ea5e9', window.MPP_state.fanPosMap['admin-aiims'] ?? 0, activeTopicTitle)}
                            <div class="tp-exam-label-box">AIIMS PROFS PYQ</div>

                            ${window.MPP_buildFanDeckHTML('admin-neet-pg', neetSeq, '#2563eb', window.MPP_state.fanPosMap['admin-neet-pg'] ?? 0, activeTopicTitle)}
                            <div class="tp-exam-label-box">NEETPG</div>

                            ${window.MPP_buildFanDeckHTML('admin-inicet', iniSeq, '#9333ea', window.MPP_state.fanPosMap['admin-inicet'] ?? 0, activeTopicTitle)}
                            <div class="tp-exam-label-box">INICET</div>

                            ${window.MPP_buildFanDeckHTML('admin-upsc-cms', cmsSeq, '#eab308', window.MPP_state.fanPosMap['admin-upsc-cms'] ?? 0, activeTopicTitle)}
                            <div class="tp-exam-label-box">CMS</div>

                            ${window.MPP_buildFanDeckHTML('admin-fmge', fmgeSeq, '#22c55e', window.MPP_state.fanPosMap['admin-fmge'] ?? 0, activeTopicTitle)}
                            <div class="tp-exam-label-box">FMGE</div>
                        </div>`;
                    }

                    const overlapClass = displayedQ.type === 'MCQ' ? 'overlap-mcq' : '';
                    scrollArea.insertAdjacentHTML('beforeend', `
                        <div class="tp-parent-overlay ${overlapClass}" onclick="if(event.target === this){ window.MPP_state.fanViewOpen=false; window.renderDeckCard(); }">
                            ${mainFanHtml}
                            ${adminExtendedHtml}
                        </div>
                    `);
                    window.MPP_attachFanInteractions();
                }

                if (isAdmin) {
                    const uCount = (window.MPP_undoStack || []).length;
                    const rCount = (window.MPP_redoStack || []).length;
                    const isMCQ = displayedQ.type === 'MCQ';
                    const curKey = String(displayedQ.ans_key || 'A').trim().toUpperCase();
                    const curExpl = (window.liveAnswers && window.liveAnswers[displayedQ.q] && window.liveAnswers[displayedQ.q].text)
                        || window.MPP_medpyqExplanations[curUpper]
                        || displayedQ.explanation
                        || '';
                    const safeExpl = curExpl.replace(/</g, '&lt;').replace(/>/g, '&gt;');

                    let mcqEditorFieldsHtml = '';
                    if (isMCQ) {
                        const opts = Array.isArray(displayedQ.options) ? displayedQ.options : ['', '', '', ''];
                        mcqEditorFieldsHtml = `
                            <div class="flex items-center justify-between flex-wrap gap-2 mb-2.5">
                                <span class="text-[11px] font-extrabold text-orange-800 dark:text-orange-300 uppercase">Correct Answer Key:</span>
                                <div class="flex gap-1.5">
                                    ${['A', 'B', 'C', 'D'].map(ltr => `
                                        <button type="button" class="admin-key-pill ${curKey === ltr ? 'active' : ''}" data-key="${ltr}" onclick="window.MPP_selectEditKey('${ltr}')">${ltr}</button>
                                    `).join('')}
                                </div>
                                <input type="hidden" id="mpp-edit-ans-input" value="${curKey}">
                            </div>
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2.5">
                                ${[0, 1, 2, 3].map(i => {
                                    const char = String.fromCharCode(65 + i);
                                    const val = String(opts[i] || '').replace(/"/g, '&quot;');
                                    return `
                                    <div class="flex items-center gap-1.5">
                                        <span class="text-xs font-black text-orange-700 dark:text-orange-400 w-4">${char})</span>
                                        <input type="text" id="mpp-edit-opt-${i}" value="${val}" class="flex-1 px-2.5 py-1.5 rounded-lg border border-orange-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-white outline-none">
                                    </div>`;
                                }).join('')}
                            </div>`;
                    }

                    const rtToolbarHtml = `
                        <div class="admin-rt-toolbar">
                            <div class="flex justify-between items-center flex-wrap gap-2">
                                <button type="button" onclick="window.MPP_toggleInlineEditor()" class="admin-rt-btn-toggle">
                                    ✏️ Edit ${isMCQ ? `MCQ Options, Key (${curKey}) &` : ''} Explanation (${displayedQ.q})
                                </button>
                                <div class="flex gap-1.5">
                                    <button type="button" id="btn-mpp-qe-undo" onclick="window.MPP_undoQuestionEdit()" class="admin-rt-btn-hist" ${uCount === 0 ? 'disabled' : ''}>↩️ Undo (${uCount}/10)</button>
                                    <button type="button" id="btn-mpp-qe-redo" onclick="window.MPP_redoQuestionEdit()" class="admin-rt-btn-hist" ${rCount === 0 ? 'disabled' : ''}>↪️ Redo (${rCount}/10)</button>
                                </div>
                            </div>
                            <div id="mpp-inline-rt-editor" class="hidden mt-3 pt-3 border-t border-dashed border-orange-300 dark:border-slate-700">
                                ${mcqEditorFieldsHtml}
                                <label class="text-[10px] font-extrabold text-orange-800 dark:text-orange-300 uppercase block mb-1">Explanation / Model Answer (Markdown, Math &amp; Media — Syncs Live):</label>
                                <textarea id="mpp-edit-expl-input" rows="4" class="w-full p-2.5 rounded-lg border border-orange-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-white outline-none resize-y mb-2">${safeExpl}</textarea>
                                <div class="flex justify-end gap-2">
                                    <button type="button" onclick="window.MPP_toggleInlineEditor()" class="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold border-none cursor-pointer">Close</button>
                                    <button type="button" id="btn-mpp-save-qe" onclick="window.MPP_saveQuestionEdit('${displayedQ.q}')" class="px-4 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-xs font-extrabold border-none cursor-pointer shadow">⚡ Save Live</button>
                                </div>
                            </div>
                        </div>`;
                    scrollArea.insertAdjacentHTML('beforeend', rtToolbarHtml);
                }
            };
        };

        hookDeckFunctions();
        window.addEventListener('load', hookDeckFunctions);
        setTimeout(hookDeckFunctions, 600);

    } catch (err) {
        console.error("Failed to initialize Teen Patti & MedPYQ Bridge engine:", err);
    }
};

// ====================================================
// 16. REGISTER SERVICE WORKER
// ====================================================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then((registration) => {
                registration.update().catch(() => {});
            })
            .catch(() => {});
    });
}
// ====================================================
// 17. SELF-INITIALIZING FIREBASE CLOUD VAULT, ADMIN HUB & CACHE ENGINE
// ====================================================
(function initFirebaseCloudVault() {
    // Upgrade sanitizer so chapter & examBatch arrays/numbers never crash older HTML templates
    const baseSanitizer = window.MPP_sanitizeBankData;
    window.MPP_sanitizeBankData = function(rawPayload, collegeFallback) {
        const res = baseSanitizer ? baseSanitizer(rawPayload, collegeFallback) : null;
        if (!res || !Array.isArray(res.qnaData)) return res;
        res.qnaData = res.qnaData.map(item => {
            const clean = { ...item };
            clean.chapter = Array.isArray(item.chapter)
                ? item.chapter.filter(Boolean).map(c => String(c))
                : String(item.chapter || "General");
            clean.examBatch = Array.isArray(item.examBatch)
                ? item.examBatch.filter(Boolean).map(e => String(e))
                : String(item.examBatch || "Prof Exam");
            return clean;
        });
        return res;
    };

    window.MPP_ensureProfsFirebase = async function() {
        const { initializeApp, getApps } = await import("https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js");
        const { getDatabase } = await import("https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js");
        const { getAuth } = await import("https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js");

        const existingApps = getApps();
        const defaultApp = existingApps.find(a => a.name === '[DEFAULT]') || initializeApp(window.PROFS_FIREBASE_CONFIG);
        const dbInstance = getDatabase(defaultApp);
        const authInstance = getAuth(defaultApp);
        window.db = dbInstance;
        window.profsAuth = authInstance;

        if (!window.MPP_engineInitialized && typeof window.MPP_initCrossExamTeenPattiEngine === 'function') {
            window.MPP_initCrossExamTeenPattiEngine(dbInstance, authInstance);
        }

        return { appInstance: defaultApp, dbInstance, authInstance };
    };

    const vaultModalHTML = `
    <div id="mpp-cloud-vault-modal" onclick="if(event.target===this) this.classList.add('hidden')" class="hidden fixed inset-0 z-[33000] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 w-full max-w-lg shadow-2xl flex flex-col max-h-[92vh] text-left">
            <div class="flex justify-between items-center mb-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                    <h3 class="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                        <span>⚙️</span> Admin Control Hub &amp; Cloud Vault
                    </h3>
                    <p id="mpp-vault-status-sub" class="text-[11px] font-bold text-sky-600 dark:text-sky-400 mt-0.5">Checking cloud status...</p>
                </div>
                <button onclick="document.getElementById('mpp-cloud-vault-modal').classList.add('hidden')" class="text-slate-400 hover:text-red-500 font-bold text-2xl leading-none bg-transparent border-none cursor-pointer">&times;</button>
            </div>

            <div class="space-y-4 overflow-y-auto pr-1 custom-scrollbar">
                <div class="p-4 rounded-xl bg-amber-50/70 dark:bg-slate-800/80 border border-amber-200 dark:border-amber-800/60 space-y-3">
                    <div class="text-xs font-black text-amber-800 dark:text-amber-400 uppercase tracking-wider flex items-center justify-between">
                        <span>🎛️ Extend Admin Features to Normal Users</span>
                        <span class="text-[10px] bg-amber-200/70 dark:bg-amber-900/50 px-2 py-0.5 rounded-full">Live Sync</span>
                    </div>

                    <div class="flex items-center justify-between gap-3 pt-1">
                        <div>
                            <div class="text-xs font-extrabold text-slate-800 dark:text-white">📝 Student Answers (This Subject)</div>
                            <div class="text-[10px] text-slate-500 dark:text-slate-400">Unlock model answers &amp; explanations for students</div>
                        </div>
                        <label class="relative inline-flex items-center cursor-pointer shrink-0">
                            <input type="checkbox" id="vault-toggle-answers" class="sr-only peer" onchange="window.toggleGlobalAnswers()">
                            <div class="w-10 h-5 bg-slate-300 dark:bg-slate-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                        </label>
                    </div>

                    <div class="flex items-center justify-between gap-3 pt-2 border-t border-amber-200/60 dark:border-slate-700">
                        <div>
                            <div class="text-xs font-extrabold text-slate-800 dark:text-white">🧠 Neuro-Recall 3D Flashcards</div>
                            <div class="text-[10px] text-slate-500 dark:text-slate-400">Unlock spaced-repetition flashcard mode for students</div>
                        </div>
                        <label class="relative inline-flex items-center cursor-pointer shrink-0">
                            <input type="checkbox" id="vault-toggle-neuro" class="sr-only peer" onchange="window.toggleGlobalNeuroRecall()">
                            <div class="w-10 h-5 bg-slate-300 dark:bg-slate-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                        </label>
                    </div>

                    <div class="flex items-center justify-between gap-3 pt-2 border-t border-amber-200/60 dark:border-slate-700">
                        <div>
                            <div class="text-xs font-extrabold text-slate-800 dark:text-white">🃏 Teen Patti &amp; &lt; 1/16 &gt; Sub-Topic Pill</div>
                            <div class="text-[10px] text-slate-500 dark:text-slate-400">Show &lt; 1/16 &gt; pill &amp; fanned card deck to normal users</div>
                        </div>
                        <label class="relative inline-flex items-center cursor-pointer shrink-0">
                            <input type="checkbox" id="vault-toggle-teenpatti" class="sr-only peer" onchange="window.MPP_toggleFeatureFlag('showTeenPatti')">
                            <div class="w-10 h-5 bg-slate-300 dark:bg-slate-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                        </label>
                    </div>

                    <div class="flex items-center justify-between gap-3 pt-2 border-t border-amber-200/60 dark:border-slate-700">
                        <div>
                            <div class="text-xs font-extrabold text-slate-800 dark:text-white">🔥 PG Cross-Exam Cards (NEET / INI / CMS / FMGE)</div>
                            <div class="text-[10px] text-slate-500 dark:text-slate-400">Allow students to view linked PG MCQs &amp; 5-exam Teen Patti fans</div>
                        </div>
                        <label class="relative inline-flex items-center cursor-pointer shrink-0">
                            <input type="checkbox" id="vault-toggle-pgcross" class="sr-only peer" onchange="window.MPP_toggleFeatureFlag('showCrossExamPG')">
                            <div class="w-10 h-5 bg-slate-300 dark:bg-slate-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                        </label>
                    </div>

                    <div class="flex items-center justify-between gap-3 pt-2 border-t border-amber-200/60 dark:border-slate-700">
                        <div>
                            <div class="text-xs font-extrabold text-slate-800 dark:text-white">🖼️ 3D Visual Answer Cards (ans_image)</div>
                            <div class="text-[10px] text-slate-500 dark:text-slate-400">Unlock "👁️ View Answer Card" Panzoom image flip for students</div>
                        </div>
                        <label class="relative inline-flex items-center cursor-pointer shrink-0">
                            <input type="checkbox" id="vault-toggle-anscards" class="sr-only peer" onchange="window.MPP_toggleFeatureFlag('showAnswerCards')">
                            <div class="w-10 h-5 bg-slate-300 dark:bg-slate-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                        </label>
                    </div>
                </div>

                <div class="p-4 rounded-xl bg-emerald-50/70 dark:bg-slate-800/70 border border-emerald-200 dark:border-slate-700">
                    <div class="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider mb-1">
                        📦 1. Upload .JSON File(s) from Your Device to Firebase
                    </div>
                    <input type="file" id="mpp-bulk-json-input" multiple class="hidden" onchange="window.MPP_handleBulkJsonFiles(this.files)">
                    <button onclick="document.getElementById('mpp-bulk-json-input').click()" class="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs uppercase tracking-wider border-none cursor-pointer shadow-md transition-all">
                        📂 Select JSON File(s) to Upload...
                    </button>
                    <div id="mpp-bulk-upload-log" class="hidden mt-3 p-3 rounded-lg bg-slate-900 text-emerald-400 font-mono text-[11px] max-h-40 overflow-y-auto space-y-1"></div>
                </div>

                <div class="p-4 rounded-xl bg-sky-50/70 dark:bg-slate-800/70 border border-sky-200 dark:border-slate-700">
                    <div class="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider mb-1">
                        ⚡ 2. Sync Currently Loaded Page to Firebase
                    </div>
                    <button id="btn-vault-sync-current" onclick="window.MPP_syncCurrentPageToFirebase(this)" class="w-full py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-extrabold text-xs uppercase tracking-wider border-none cursor-pointer shadow-md transition-all">
                        ☁️ Sync This Subject to Firebase Now
                    </button>
                </div>

                <div class="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
                    <div>
                        <div class="text-xs font-bold text-slate-700 dark:text-slate-200">Local IndexedDB Cache</div>
                        <div class="text-[10px] text-slate-500">Clears cached banks on this device &amp; reloads from Firebase</div>
                    </div>
                    <button onclick="window.MPP_clearLocalBankCache()" class="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 text-xs font-bold cursor-pointer">
                        🔄 Force Refresh
                    </button>
                </div>
            </div>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', vaultModalHTML);

    window.MPP_syncFeatureTogglesUI = function() {
        const tAns = document.getElementById('vault-toggle-answers');
        if (tAns && window.globalPlatformSettings) tAns.checked = Boolean(window.globalPlatformSettings.showAnswers);
        const tNeuro = document.getElementById('vault-toggle-neuro');
        if (tNeuro) tNeuro.checked = Boolean(window.globalNeuroRecallEnabled);
        const tTP = document.getElementById('vault-toggle-teenpatti');
        if (tTP) tTP.checked = Boolean(window.globalFeatureFlags.showTeenPatti);
        const tPG = document.getElementById('vault-toggle-pgcross');
        if (tPG) tPG.checked = Boolean(window.globalFeatureFlags.showCrossExamPG);
        const tCards = document.getElementById('vault-toggle-anscards');
        if (tCards) tCards.checked = Boolean(window.globalFeatureFlags.showAnswerCards);
    };

    window.MPP_openCloudVaultModal = function() {
        window.MPP_updateVaultBadgeUI();
        window.MPP_syncFeatureTogglesUI();
        document.getElementById('mpp-cloud-vault-modal').classList.remove('hidden');
    };

    window.MPP_toggleFeatureFlag = async function(flagName) {
        if (!window.isUserAdmin()) return;
        await window.MPP_ensureProfsFirebase();
        const newState = !window.globalFeatureFlags[flagName];
        window.globalFeatureFlags[flagName] = newState;
        window.MPP_syncFeatureTogglesUI();

        try {
            const { ref, set } = await import("https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js");
            await set(ref(window.db, `settings/global/features/${flagName}`), newState);
            if (flagName === 'showCrossExamPG' && newState && typeof window.MPP_syncSharedPGCacheForStudents === 'function') {
                await window.MPP_syncSharedPGCacheForStudents();
            }
        } catch (e) {
            alert("Failed to update setting: " + e.message);
        }
    };

    window.MPP_syncSharedPGCacheForStudents = async function() {
        if (!window.isUserAdmin() || !window.MPP_state) return;
        await window.MPP_ensureProfsFirebase();
        const subjectSlug = window.MPP_state.subjectSlug;
        if (!subjectSlug) return;

        const allClusters = Object.values(window.MPP_crossClustersMap || {});
        const sharedCache = {};
        let count = 0;

        allClusters.forEach(c => {
            (c.qids || []).forEach(qid => {
                const ex = window.MPP_inferExamFromQid ? window.MPP_inferExamFromQid(qid) : 'aiims-profs';
                if (ex !== 'aiims-profs') {
                    const up = String(qid).trim().toUpperCase();
                    const qObj = window.MPP_allExamLookup ? window.MPP_allExamLookup[up] : null;
                    if (qObj) {
                        sharedCache[up] = {
                            q: qObj.q || qid,
                            uid: qObj.uid || qid,
                            type: 'MCQ',
                            rawStem: qObj.rawStem || qObj.stem || "",
                            stem: qObj.stem || "",
                            options: qObj.options || ["Option A", "Option B", "Option C", "Option D"],
                            ans_key: qObj.ans_key || "A",
                            chapter: qObj.chapter || [ex.toUpperCase()],
                            examBatch: qObj.examBatch || ex.toUpperCase(),
                            explanation: (window.MPP_medpyqExplanations && window.MPP_medpyqExplanations[up]) || qObj.explanation || "",
                            img: qObj.img || null,
                            examKey: ex,
                            isMedPYQ: true
                        };
                        count++;
                    }
                }
            });
        });

        if (count > 0) {
            try {
                const { ref, set } = await import("https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js");
                await set(ref(window.db, `cross_links/${subjectSlug}/shared_q_cache`), JSON.parse(JSON.stringify(sharedCache)));
            } catch (e) {}
        }
    };

    const IDB_NAME = 'MBBSProfsPrepVaultDB';
    const IDB_STORE = 'question_banks_cache';

    function openVaultIDB() {
        return new Promise((resolve) => {
            if (!window.indexedDB) return resolve(null);
            const req = window.indexedDB.open(IDB_NAME, 1);
            req.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(IDB_STORE)) db.createObjectStore(IDB_STORE);
            };
            req.onsuccess = (e) => resolve(e.target.result);
            req.onerror = () => resolve(null);
        });
    }

    window.MPP_idbGet = async function(key) {
        try {
            const db = await openVaultIDB();
            if (!db) return null;
            return await new Promise((resolve) => {
                const tx = db.transaction(IDB_STORE, 'readonly');
                const req = tx.objectStore(IDB_STORE).get(key);
                req.onsuccess = () => resolve(req.result || null);
                req.onerror = () => resolve(null);
            });
        } catch (e) { return null; }
    };

    window.MPP_idbSet = async function(key, val) {
        try {
            const db = await openVaultIDB();
            if (!db) return;
            await new Promise((resolve) => {
                const tx = db.transaction(IDB_STORE, 'readwrite');
                tx.objectStore(IDB_STORE).put(val, key);
                tx.oncomplete = () => resolve();
                tx.onerror = () => resolve();
            });
        } catch (e) {}
    };

    window.MPP_clearLocalBankCache = async function() {
        try {
            const db = await openVaultIDB();
            if (db) {
                await new Promise((resolve) => {
                    const tx = db.transaction(IDB_STORE, 'readwrite');
                    tx.objectStore(IDB_STORE).clear();
                    tx.oncomplete = () => resolve();
                });
            }
            window.subjectJsonCache = {};
            window.location.reload();
        } catch (e) {}
    };

    const SUBJECT_ALIASES = {
        'PHYSIOLOGY': ['PHYSIOLOGY', 'physiology', 'PHYSIO', 'physio'],
        'PHYSIO': ['PHYSIOLOGY', 'physiology', 'PHYSIO', 'physio'],
        'ANATOMY': ['ANATOMY', 'anatomy', 'ANAT', 'anat'],
        'BIOCHEMISTRY': ['BIOCHEMISTRY', 'biochemistry', 'BIOCHEM', 'biochem'],
        'PATHOLOGY': ['PATHOLOGY', 'pathology', 'PATHO', 'patho'],
        'PATHO': ['PATHOLOGY', 'pathology', 'PATHO', 'patho'],
        'PHARMACOLOGY': ['PHARMACOLOGY', 'pharmacology', 'PHARMA', 'pharma'],
        'MICROBIOLOGY': ['MICROBIOLOGY', 'microbiology', 'MICRO', 'micro'],
        'MICRO': ['MICROBIOLOGY', 'microbiology', 'MICRO', 'micro'],
        'FMT': ['FMT', 'fmt', 'FORENSIC', 'forensic'],
        'CFM': ['CFM', 'cfm', 'PSM', 'psm'],
        'PSM': ['CFM', 'cfm', 'PSM', 'psm'],
        'ENT': ['ENT', 'ent'],
        'OPHTHALMOLOGY': ['OPHTHALMOLOGY', 'ophthalmology', 'OPHTHAL', 'ophthal'],
        'OPHTHAL': ['OPHTHAL', 'ophthal', 'OPHTHALMOLOGY', 'ophthalmology'],
        'PSYCHIATRY': ['PSYCHIATRY', 'psychiatry', 'PSYCH', 'psych'],
        'ORTHOPAEDICS': ['ORTHOPAEDICS', 'orthopaedics', 'ORTHO', 'ortho'],
        'MEDICINE': ['MEDICINE', 'medicine', 'MED', 'med'],
        'SURGERY': ['SURGERY', 'surgery', 'SURG', 'surg'],
        'OBG': ['OBG', 'obg'],
        'PAEDIATRICS': ['PAEDIATRICS', 'paediatrics', 'PEDIATRICS', 'pediatrics', 'PEDS', 'peds'],
        'DERMATOLOGY': ['DERMATOLOGY', 'dermatology', 'DERMA', 'derma'],
        'ANAESTHESIA': ['ANAESTHESIA', 'anaesthesia', 'ANESTHESIA', 'anesthesia'],
        'RADIOLOGY': ['RADIOLOGY', 'radiology', 'RADIO', 'radio']
    };

    // Multi-Version Aware Vault Key & Filename Resolver (Handles Pathology & Microbiology Standard + Ed 8!)
    window.MPP_getVaultKeys = function(customCollege, customSubject, customVersion) {
        const params = new URLSearchParams(window.location.search);
        const college = String(customCollege || window.COLLEGE_CODE || params.get('college') || 'deoghar').toLowerCase().trim();

        let detectedSub = customSubject || window.SUBJECT_CODE;
        if (!detectedSub) {
            const pathMatch = window.location.pathname.match(/\/([a-z0-9-]+?)-(?:review|clinical)\.html/i);
            if (pathMatch) detectedSub = pathMatch[1];
        }

        // Strip any accidental _ED8 or _STANDARD already appended to window.SUBJECT_CODE so we never double-append!
        let cleanSub = String(detectedSub || 'CFM').toUpperCase().trim();
        let embeddedVer = '';
        const embMatch = cleanSub.match(/^(.*?)_(ED\d+|STANDARD)$/i);
        if (embMatch) {
            cleanSub = embMatch[1].toUpperCase();
            embeddedVer = embMatch[2].toLowerCase();
        }
        if (cleanSub === 'PATHO') cleanSub = 'PATHOLOGY';
        if (cleanSub === 'MICRO') cleanSub = 'MICROBIOLOGY';

        let rawVer = String(customVersion !== undefined ? customVersion : (params.get('version') || window.VERSION_CODE || embeddedVer || '')).toLowerCase().trim();
        // Treat "standard" or "default" as standard (empty version suffix)
        const isStandard = !rawVer || rawVer === 'standard' || rawVer === 'default' || rawVer === 'std';
        const ver = isStandard ? '' : rawVer;
        const verUpper = ver.toUpperCase();

        // Always normalize primary subjectKey to UPPERCASE (e.g. PATHOLOGY or PATHOLOGY_ED8) to match upload key!
        const subjectKey = ver ? `${cleanSub}_${verUpper}` : cleanSub;

        const baseCandidates = SUBJECT_ALIASES[cleanSub] || [cleanSub, cleanSub.toLowerCase()];
        const candidateKeys = [];
        const addCand = (k) => { if (k && !candidateKeys.includes(k)) candidateKeys.push(k); };

        if (ver) {
            // Check BOTH uppercase (_ED8) and lowercase (_ed8) and prefix variations in Firebase!
            baseCandidates.forEach(k => {
                addCand(`${k}_${verUpper}`);
                addCand(`${k}_${ver}`);
                addCand(`${k}-${verUpper}`);
                addCand(`${k}-${ver}`);
                addCand(`${verUpper}_${k}`);
                addCand(`${ver}_${k}`);
            });
        } else {
            // Standard mode: check base keys AND _STANDARD / _standard keys in Firebase
            baseCandidates.forEach(k => {
                addCand(k);
                addCand(`${k}_STANDARD`);
                addCand(`${k}_standard`);
            });
        }

        // Build all possible GitHub .json fallback filenames so whichever naming convention was used on GitHub is found!
        const subLower = cleanSub.toLowerCase();
        const shortLower = subLower === 'pathology' ? 'patho' : (subLower === 'microbiology' ? 'micro' : subLower);
        const candidateFileNames = [];
        const addFile = (f) => { if (f && !candidateFileNames.includes(f)) candidateFileNames.push(f); };

        if (ver) {
            addFile(`${subLower}_aiims_${college}_${ver}_data.json`);
            addFile(`${subLower}_${ver}_aiims_${college}_data.json`);
            addFile(`${subLower}_aiims_${college}_data_${ver}.json`);
            addFile(`${subLower}_aiims_${college}_${ver}.json`);
            if (shortLower !== subLower) {
                addFile(`${shortLower}_aiims_${college}_${ver}_data.json`);
                addFile(`${shortLower}_${ver}_aiims_${college}_data.json`);
                addFile(`${shortLower}_aiims_${college}_data_${ver}.json`);
            }
        } else {
            addFile(`${subLower}_aiims_${college}_data.json`);
            if (shortLower !== subLower) addFile(`${shortLower}_aiims_${college}_data.json`);
            addFile(`${subLower}_aiims_${college}_standard_data.json`);
            addFile(`${subLower}_standard_aiims_${college}_data.json`);
            addFile(`${subLower}_aiims_${college}_data_standard.json`);
        }

        return {
            college,
            rawSub: cleanSub,
            ver,
            subjectKey,
            candidateKeys,
            fileName: candidateFileNames[0],
            candidateFileNames
        };
    };

    window.MPP_uploadBankPayloadToFirebase = async function(college, subjectKey, jsonData) {
        await window.MPP_ensureProfsFirebase();
        const { ref, update } = await import("https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js");

        const sanitized = window.MPP_sanitizeBankData(JSON.parse(JSON.stringify(jsonData || {})), college);
        if (!sanitized || sanitized.qnaData.length === 0) {
            throw new Error("No questions found in the JSON payload to upload.");
        }

        const { collegeName, curriculumData, qnaData } = sanitized;
        const previewTheory = qnaData.filter(q => q && q.type === 'Theory').slice(0, 10);
        const previewMcq = qnaData.filter(q => q && q.type === 'MCQ').slice(0, 10);
        const previewQna = [...previewTheory, ...previewMcq];

        const versionStamp = Date.now();
        const normSubKey = String(subjectKey).toUpperCase().trim().replace(/_STANDARD$/i, '');
        const updates = {};

        updates[`question_banks/${college}/${normSubKey}`] = {
            collegeName,
            curriculumData,
            qnaData,
            version: versionStamp
        };
        updates[`question_previews/${college}/${normSubKey}`] = {
            collegeName,
            curriculumData,
            qnaData: previewQna,
            version: versionStamp
        };
        updates[`bank_meta/${college}/${normSubKey}`] = {
            version: versionStamp,
            totalQuestions: qnaData.length,
            updatedAt: new Date().toISOString(),
            updatedBy: (window.currentUserObj && window.currentUserObj.email) ? window.currentUserObj.email : 'admin'
        };

        await update(ref(window.db), updates);

        const idbKey = `pro_${college}_${normSubKey}`;
        await window.MPP_idbSet(idbKey, {
            version: versionStamp,
            collegeName,
            curriculumData,
            qnaData
        });

        return { versionStamp, count: qnaData.length, normSubKey };
    };

    window.MPP_syncCurrentPageToFirebase = async function(btn) {
        if (!window.isUserAdmin()) return alert("Admin access required.");
        const { college, subjectKey, candidateFileNames } = window.MPP_getVaultKeys();
        const origText = btn ? btn.innerText : "";
        if (btn) { btn.innerText = "⏳ Uploading to Firebase Cloud..."; btn.disabled = true; }

        try {
            let payload = null;
            if (Array.isArray(window.qnaData) && window.qnaData.length > 0) {
                payload = {
                    collegeName: window.COLLEGE_NAME || `AIIMS ${college.toUpperCase()}`,
                    curriculumData: window.curriculumData || [],
                    qnaData: window.qnaData
                };
            } else {
                for (const fname of candidateFileNames) {
                    const res = await fetch(fname).catch(() => null);
                    if (res && res.ok) {
                        payload = await res.json();
                        break;
                    }
                }
                if (!payload) throw new Error(`Could not fetch JSON from GitHub. Use "📂 Select JSON File(s) to Upload..." above!`);
            }

            const resInfo = await window.MPP_uploadBankPayloadToFirebase(college, subjectKey, payload);
            window.MPP_DataSourceTag = 'firebase-pro';
            window.MPP_updateVaultBadgeUI();
            alert(`✅ Synced ${resInfo.count} questions to Firebase at question_banks/${college}/${resInfo.normSubKey}!`);
            if (window.fetchQuestions) await window.fetchQuestions();
        } catch (err) {
            alert(err.message);
        } finally {
            if (btn) { btn.innerText = origText; btn.disabled = false; }
        }
    };

    // Smart Multi-File JSON Uploader (Detects ed8 anywhere in filename: before _aiims_, before _data, or after _data!)
    window.MPP_handleBulkJsonFiles = async function(fileList) {
        if (!fileList || fileList.length === 0) return;
        const logEl = document.getElementById('mpp-bulk-upload-log');
        if (logEl) {
            logEl.classList.remove('hidden');
            logEl.innerHTML = `<div>🚀 Starting upload of ${fileList.length} file(s)...</div>`;
        }

        let successFiles = 0;
        for (const file of Array.from(fileList)) {
            try {
                const text = await file.text();
                const json = JSON.parse(text);

                const cleanName = file.name.replace(/\s*\(\d+\)\s*/g, '').replace(/\.(json|txt)$/i, '');
                let { college, subjectKey } = window.MPP_getVaultKeys();

                // Detect version tag (e.g. ed8) anywhere in the filename
                const verMatch = cleanName.match(/(?:^|_|-)(ed\d+)(?:_|-|$)/i);
                const detectedVer = verMatch ? verMatch[1].toUpperCase() : '';

                // Strip version and _data/timestamps to isolate {subject}_aiims_{college}
                const strippedName = cleanName
                    .replace(/(?:^|_|-)(?:ed\d+|standard)(?=_|-|$)/gi, '')
                    .replace(/_data.*$/i, '');

                const match = strippedName.match(/^([a-z0-9-]+?)_aiims_([a-z0-9-]+?)$/i);
                if (match) {
                    let rawSub = match[1].toUpperCase();
                    if (rawSub === 'PATHO') rawSub = 'PATHOLOGY';
                    if (rawSub === 'MICRO') rawSub = 'MICROBIOLOGY';
                    college = match[2].toLowerCase();
                    subjectKey = detectedVer ? `${rawSub}_${detectedVer}` : rawSub;
                } else {
                    const manual = prompt(`Confirm target college/SUBJECT for "${file.name}" (e.g. deoghar/PATHOLOGY or deoghar/PATHOLOGY_ED8):`, `${college}/${subjectKey}`);
                    if (!manual || !manual.includes('/')) continue;
                    const parts = manual.split('/');
                    college = parts[0].trim().toLowerCase();
                    subjectKey = parts[1].trim().toUpperCase();
                }

                if (logEl) logEl.insertAdjacentHTML('beforeend', `<div>⏳ Uploading <b>${file.name}</b> &rarr; <code>${college}/${subjectKey}</code>...</div>`);
                const info = await window.MPP_uploadBankPayloadToFirebase(college, subjectKey, json);
                successFiles++;
                if (logEl) logEl.insertAdjacentHTML('beforeend', `<div class="text-emerald-300">✅ Done: <code>${college}/${info.normSubKey}</code> (${info.count} Qs)</div>`);
                logEl.scrollTop = logEl.scrollHeight;
            } catch (e) {
                if (logEl) logEl.insertAdjacentHTML('beforeend', `<div class="text-red-400">❌ Error in ${file.name}: ${e.message}</div>`);
            }
        }

        if (logEl) {
            logEl.insertAdjacentHTML('beforeend', `<div class="text-amber-300 font-bold pt-1 border-t border-slate-700">🎉 Uploaded ${successFiles}/${fileList.length} file(s)! Reloading page...</div>`);
        }
        if (successFiles > 0 && typeof window.fetchQuestions === 'function') {
            setTimeout(() => window.fetchQuestions(), 500);
        }
    };

    window.MPP_updateVaultBadgeUI = function() {
        const subEl = document.getElementById('mpp-vault-status-sub');
        const btnEl = document.getElementById('admin-vault-trigger-btn');
        const navBtnEl = document.getElementById('nav-admin-vault-btn');
        const { college, subjectKey } = window.MPP_getVaultKeys();

        const isAdm = window.isUserAdmin();
        if (navBtnEl) {
            navBtnEl.classList.toggle('hidden', !isAdm);
            navBtnEl.classList.toggle('flex', isAdm);
        }

        let statusText = `Target: question_banks/${college}/${subjectKey}`;
        if (window.MPP_DataSourceTag === 'firebase-cache') statusText = `⚡ Loaded from IndexedDB Cache (0 KB used) • ${college}/${subjectKey}`;
        else if (window.MPP_DataSourceTag === 'firebase-pro') statusText = `🟢 Live on Firebase Cloud • ${college}/${subjectKey}`;
        else if (window.MPP_DataSourceTag === 'firebase-preview') statusText = `🔒 Free Preview Node • ${college}/${subjectKey}`;
        else if (window.MPP_DataSourceTag === 'github-fallback') statusText = `⚠️ Using GitHub JSON Fallback (Not in Firebase yet) • ${college}/${subjectKey}`;

        if (subEl) subEl.innerText = statusText;
        if (btnEl) {
            btnEl.className = "bg-sky-500 hover:bg-sky-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-extrabold uppercase shadow-sm transition-all cursor-pointer border-none";
            btnEl.innerHTML = "⚙️ Vault & Controls";
        }
    };

    function injectAdminVaultButtons() {
        const themeBtn = document.getElementById('theme-icon')?.parentElement;
        if (themeBtn && themeBtn.parentElement && !document.getElementById('nav-admin-vault-btn')) {
            const navVaultBtn = document.createElement('button');
            navVaultBtn.id = 'nav-admin-vault-btn';
            navVaultBtn.type = 'button';
            navVaultBtn.onclick = window.MPP_openCloudVaultModal;
            navVaultBtn.className = `${window.isUserAdmin() ? 'flex' : 'hidden'} items-center gap-1 px-2.5 py-1.5 rounded-full bg-sky-500/15 hover:bg-sky-500/25 text-sky-600 dark:text-sky-400 border border-sky-500/30 text-xs font-extrabold transition-all cursor-pointer`;
            navVaultBtn.title = "Open Admin Control Hub & Cloud Vault";
            navVaultBtn.innerHTML = `<span>⚙️</span><span class="hidden sm:inline">Controls</span>`;
            themeBtn.parentElement.insertBefore(navVaultBtn, themeBtn);
        }

        const adminControls = document.getElementById('admin-controls');
        if (adminControls && !document.getElementById('admin-vault-trigger-btn')) {
            const btn = document.createElement('button');
            btn.id = 'admin-vault-trigger-btn';
            btn.type = 'button';
            btn.onclick = window.MPP_openCloudVaultModal;
            btn.className = "bg-sky-500 hover:bg-sky-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-extrabold uppercase shadow-sm transition-all cursor-pointer border-none";
            btn.innerHTML = "⚙️ Vault & Controls";
            adminControls.insertBefore(btn, adminControls.firstChild);
        }
    }

    // 8. SYNCHRONOUSLY Hook Review Page Loader FIRST (So window.onload never runs un-hooked!)
    function hookFeatureFlagsAndDataLoader() {
        injectAdminVaultButtons();

        const isClinicalPage = Boolean(document.getElementById('uploadClinicalModal')) || window.location.pathname.includes('-clinical');
        const isReviewPage = Boolean(document.getElementById('qnaTable')) && !isClinicalPage;

        if (isReviewPage && !window.MPP_fetchHooked) {
            window.MPP_fetchHooked = true;

            const origProcessData = window.processDataForAccess;
            if (typeof origProcessData === 'function') {
                window.processDataForAccess = function() {
                    if (Array.isArray(window.qnaData) && window.qnaData.length > 0) {
                        const sanitized = window.MPP_sanitizeBankData({
                            collegeName: window.COLLEGE_NAME,
                            curriculumData: window.curriculumData,
                            qnaData: window.qnaData
                        }, window.COLLEGE_CODE);
                        if (sanitized) {
                            window.curriculumData = sanitized.curriculumData;
                            window.qnaData = sanitized.qnaData;
                        }
                    }
                    Object.keys(window.MPP_questionEditsMap || {}).forEach(upKey => {
                        if (window.MPP_applyOverrideToMemory) {
                            window.MPP_applyOverrideToMemory(upKey, window.MPP_questionEditsMap[upKey]);
                        }
                    });
                    try {
                        return origProcessData.apply(this, arguments);
                    } catch (renderErr) {
                        console.error("Render error caught safely in processDataForAccess:", renderErr);
                    }
                };
            }

            const origPopTable = window.populateTable;
            if (typeof origPopTable === 'function') {
                window.populateTable = function() {
                    origPopTable.apply(this, arguments);
                    if (!window.isUserAdmin() && window.globalFeatureFlags && window.globalFeatureFlags.showAnswerCards && window.displayData) {
                        const tbody = document.getElementById('tableBody');
                        if (!tbody) return;
                        Array.from(tbody.querySelectorAll('tr[data-index]')).forEach(row => {
                            const idx = Number(row.getAttribute('data-index'));
                            const item = window.displayData[idx];
                            if (item && item.ans_image && row.cells[1] && !row.cells[1].querySelector(`#container-${item.q}`)) {
                                row.cells[1].insertAdjacentHTML('beforeend', `
                                    <div class="mt-4 border-t border-brand-100 dark:border-slate-800 pt-4">
                                        <div class="flex items-center justify-end mb-3">
                                            <button onclick="window.toggleFlashcard('${item.q}')" class="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-bold py-2 px-4 rounded-lg transition-transform active:scale-95 shadow-lg shadow-brand-500/30">
                                                <span>👁️ View Answer Card</span>
                                            </button>
                                        </div>
                                        <div class="flashcard-container hidden w-full" id="container-${item.q}">
                                            <div class="flashcard-inner" id="card-${item.q}">
                                                <div class="flashcard-front bg-slate-100 dark:bg-slate-800 rounded-xl p-4 flex items-center justify-center min-h-[100px] border border-slate-200 dark:border-slate-700">
                                                    <p class="text-slate-400 font-bold animate-pulse">Flipping page...</p>
                                                </div>
                                                <div class="flashcard-back">
                                                    <img src="${item.ans_image}" class="w-full h-auto rounded-xl shadow-2xl border border-brand-200 dark:border-brand-800" alt="Answer for ${item.q}" loading="lazy">
                                                </div>
                                            </div>
                                        </div>
                                    </div>`);
                            }
                        });
                    }
                };
            }

            const applyLoadedBank = (rawBankData, sourceTag, tier) => {
                const { college, rawSub, ver } = window.MPP_getVaultKeys();
                const sanitized = window.MPP_sanitizeBankData(rawBankData, college);
                if (!sanitized) return false;

                window.MPP_DataSourceTag = sourceTag;
                window.MPP_loadedTier = tier;
                window.accessLevel = tier;
                window.COLLEGE_NAME = sanitized.collegeName || window.COLLEGE_NAME;
window.curriculumData = sanitized.curriculumData || [];
window.qnaData = sanitized.qnaData || [];
if (typeof window.MPP_syncLexicalGlobals === 'function') {
    window.MPP_syncLexicalGlobals(sanitized);
}

                window.isDataLoaded = true;

                const verLabel = ver ? ` (${ver.toUpperCase()})` : '';
                const titleEl = document.getElementById('dynamic-page-title');
                if (titleEl) titleEl.innerText = `MBBS PROFS PREP - ${rawSub}${verLabel} Review (${window.COLLEGE_NAME})`;
                const headerEl = document.getElementById('dynamic-college-header');
                if (headerEl) headerEl.innerText = window.COLLEGE_NAME;

                window.MPP_updateVaultBadgeUI();
                if (typeof window.processDataForAccess === 'function') {
                    window.processDataForAccess();
                }
                return true;
            };

            window.fetchQuestions = async function() {
                const tableBody = document.getElementById('tableBody');
                if (tableBody && (!window.qnaData || window.qnaData.length === 0)) {
                    tableBody.innerHTML = `<tr><td colspan="6" class="p-12 text-center text-slate-500 dark:text-slate-400"><div class="w-8 h-8 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin mx-auto mb-3"></div><p class="font-bold">Loading ${window.COLLEGE_NAME || 'AIIMS'} Question Bank...</p></td></tr>`;
                }

                let dbInstance = window.db;
                let authInstance = window.profsAuth;
                try {
                    const ens = await window.MPP_ensureProfsFirebase();
                    dbInstance = ens.dbInstance;
                    authInstance = ens.authInstance;
                    const { onAuthStateChanged } = await import("https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js");

                    if (typeof authInstance.authStateReady === 'function') {
                        await authInstance.authStateReady();
                    } else if (!authInstance.currentUser) {
                        await new Promise((resolve) => {
                            const timer = setTimeout(resolve, 1500);
                            const unsub = onAuthStateChanged(authInstance, () => {
                                clearTimeout(timer);
                                unsub();
                                resolve();
                            });
                        });
                    }
                } catch (e) {}

                const activeUser = (authInstance && authInstance.currentUser) || window.currentUserObj;
                if (activeUser) window.currentUserObj = activeUser;

                const isAdm = window.isUserAdmin(activeUser);
                const { college, subjectKey, candidateKeys, candidateFileNames } = window.MPP_getVaultKeys();
                window.MPP_updateVaultBadgeUI();

                if (!activeUser) {
                    window.accessLevel = 'guest';
                    window.qnaData = [];
                    window.isDataLoaded = true;
                    window.MPP_loadedTier = 'guest';
                    if (typeof window.processDataForAccess === 'function') window.processDataForAccess();
                    return;
                }

                let tier = isAdm ? 'premium' : (window.accessLevel && window.accessLevel !== 'guest' ? window.accessLevel : 'free');
                if (!isAdm) {
                    try {
                        const { ref, get } = await import("https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js");
                        const subSnap = await get(ref(dbInstance, `users/${activeUser.uid}/subscription`));
                        if (subSnap.exists()) {
                            const d = subSnap.val();
                            const today = new Date(); today.setHours(0, 0, 0, 0);
                            const exp = new Date(d.validUntil); exp.setHours(0, 0, 0, 0);
                            tier = (Math.ceil((exp - today) / 86400000) >= 0 && d.status === 'active') ? 'premium' : 'free';
                        }
                    } catch (e) {}
                }
                window.accessLevel = tier;

                let loadedPayload = null;
                let loadedSource = '';

                // 1. Check Firebase Cloud Vault (IndexedDB Cache -> All Candidate Keys in question_banks / question_previews)
                try {
                    const { ref, get } = await import("https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js");

                    if (tier === 'premium' || isAdm) {
                        let remoteVersion = null;
                        for (const k of candidateKeys) {
                            const metaSnap = await get(ref(dbInstance, `bank_meta/${college}/${k}/version`)).catch(() => null);
                            if (metaSnap && metaSnap.exists()) {
                                remoteVersion = metaSnap.val();
                                break;
                            }
                        }

                        const idbKey = `pro_${college}_${subjectKey}`;
                        if (remoteVersion) {
                            const cached = await window.MPP_idbGet(idbKey);
                            if (cached && cached.version === remoteVersion && Array.isArray(cached.qnaData) && cached.qnaData.length > 0) {
                                loadedPayload = cached;
                                loadedSource = 'firebase-cache';
                            }
                        }

                        if (!loadedPayload) {
                            for (const k of candidateKeys) {
                                const snap = await get(ref(dbInstance, `question_banks/${college}/${k}`)).catch(() => null);
                                if (snap && snap.exists()) {
                                    const sanitized = window.MPP_sanitizeBankData(snap.val(), college);
                                    if (sanitized && sanitized.qnaData.length > 0) {
                                        await window.MPP_idbSet(idbKey, {
                                            version: remoteVersion || Date.now(),
                                            ...sanitized
                                        });
                                        loadedPayload = sanitized;
                                        loadedSource = 'firebase-pro';
                                        break;
                                    }
                                }
                            }
                        }
                    } else if (tier === 'free') {
                        for (const k of candidateKeys) {
                            const prevSnap = await get(ref(dbInstance, `question_previews/${college}/${k}`)).catch(() => null);
                            if (prevSnap && prevSnap.exists()) {
                                const sanitized = window.MPP_sanitizeBankData(prevSnap.val(), college);
                                if (sanitized && sanitized.qnaData.length > 0) {
                                    loadedPayload = sanitized;
                                    loadedSource = 'firebase-preview';
                                    break;
                                }
                            }
                        }
                    }
                } catch (cloudErr) {
                    console.warn("Firebase read warning:", cloudErr);
                }

                // 2. If Not in Firebase Yet -> Try All Possible GitHub .json Filenames (Handles Ed 8 & Standard naming variations!)
                if (!loadedPayload) {
                    for (const fname of candidateFileNames) {
                        try {
                            const response = await fetch(fname);
                            if (response.ok) {
                                const jsonData = await response.json();
                                loadedPayload = jsonData;
                                loadedSource = 'github-fallback';
                                break;
                            }
                        } catch (ghErr) {}
                    }
                }

                // 3. Render Loaded Bank
                if (loadedPayload) {
                    applyLoadedBank(loadedPayload, loadedSource, tier);
                    return;
                }

                // 4. Only if neither Firebase nor any GitHub filename had the bank
                window.isDataLoaded = true;
                if (tableBody) {
                    const adminActionBtn = isAdm
                        ? `<button type="button" onclick="window.MPP_openCloudVaultModal()" class="mt-4 px-6 py-3 bg-sky-500 hover:bg-sky-600 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-lg border-none cursor-pointer">⚙️ Open Cloud Vault &amp; Controls</button>`
                        : '';
                    tableBody.innerHTML = `
                        <tr>
                            <td colspan="6" class="p-12 text-center">
                                <p class="font-extrabold text-lg text-red-500 mb-1">⚠️ Question Bank Not Found (${college}/${subjectKey})</p>
                                <p class="text-xs text-slate-400">Checked Firebase keys: <code>${candidateKeys.slice(0, 4).join(', ')}</code> &amp; GitHub files: <code>${candidateFileNames.slice(0, 3).join(', ')}</code></p>
                                ${adminActionBtn}
                            </td>
                        </tr>`;
                }
            };

            if (Array.isArray(window.qnaData) && window.qnaData.length > 0) {
                window.processDataForAccess();
            } else {
                window.fetchQuestions();
            }
        }

        // Connect Firebase listeners in background
        window.MPP_ensureProfsFirebase().then(async ({ dbInstance, authInstance }) => {
            const { ref, onValue } = await import("https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js");
            const { onAuthStateChanged } = await import("https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js");

            onValue(ref(dbInstance, 'settings/global/features'), (snap) => {
                const val = snap.val() || {};
                window.globalFeatureFlags = {
                    showTeenPatti: val.showTeenPatti !== undefined ? Boolean(val.showTeenPatti) : true,
                    showCrossExamPG: Boolean(val.showCrossExamPG),
                    showAnswerCards: Boolean(val.showAnswerCards)
                };
                window.MPP_syncFeatureTogglesUI();
                if (window.displayData && window.displayData.length > 0 && typeof window.populateTable === 'function') {
                    try { window.populateTable(); } catch (e) {}
                }
                if (window.isDeckMode && typeof window.renderDeckCard === 'function') {
                    try { window.renderDeckCard(); } catch (e) {}
                }
            });

            onAuthStateChanged(authInstance, (u) => {
                window.currentUserObj = u;
                injectAdminVaultButtons();
                window.MPP_updateVaultBadgeUI();
                if (u && (!window.qnaData || window.qnaData.length === 0) && typeof window.fetchQuestions === 'function') {
                    window.fetchQuestions();
                }
            });
        }).catch(() => {});
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', hookFeatureFlagsAndDataLoader);
    } else {
        hookFeatureFlagsAndDataLoader();
    }
    window.addEventListener('load', hookFeatureFlagsAndDataLoader);
    setTimeout(hookFeatureFlagsAndDataLoader, 300);
})();
// ====================================================
// 18. SMART JS / PAPER SNIPPET INJECTOR (APPEND / MERGE TO FIREBASE)
// ====================================================
(function initSmartSnippetInjector() {
    window.MPP_lastBatchBackup = null;

    // 1. Parse Raw JS Object Literal Snippets (Supports // comments, unquoted keys, trailing commas & backticks)
    window.MPP_parseRawQuestionSnippet = function(rawText, splitSlashChapters = true) {
        if (!rawText || !rawText.trim()) return [];
        let cleaned = rawText.trim();

        // Strip leading/trailing array brackets if user pasted a full [...] array
        if (cleaned.startsWith('[') && cleaned.endsWith(']')) {
            cleaned = cleaned.slice(1, -1).trim();
        }

        let parsedArr = [];
        try {
            // Evaluate inside an array literal so // comments, unquoted keys (q:, stem:) & trailing commas work natively
            const fn = new Function(`"use strict"; return [\n${cleaned}\n];`);
            const res = fn();
            if (Array.isArray(res)) {
                parsedArr = res.length === 1 && Array.isArray(res[0]) ? res[0] : res;
            }
        } catch (jsErr) {
            try {
                const jsonAttempt = JSON.parse(`[${cleaned.replace(/,\s*$/, '')}]`);
                parsedArr = Array.isArray(jsonAttempt) ? jsonAttempt : [];
            } catch (jsonErr) {
                throw new Error(`Syntax error in snippet: ${jsErr.message}`);
            }
        }

        return parsedArr.filter(Boolean).map((item, idx) => {
            const qObj = { ...item };
            qObj.q = String(item.q || `Q${idx + 1}`).trim();
            qObj.type = String(item.type || (item.options ? "MCQ" : "Theory")).trim();
            qObj.stem = String(item.stem ?? "").trim();
            qObj.ans_key = String(item.ans_key ?? "").trim();
            qObj.examBatch = item.examBatch || "Prof Exam";

            // Auto-split "Chapter A / Chapter B" into ["Chapter A", "Chapter B"] for multi-chapter filtering
            if (splitSlashChapters && typeof item.chapter === 'string' && item.chapter.includes(' / ')) {
                qObj.chapter = item.chapter.split(' / ').map(c => c.trim()).filter(Boolean);
            } else {
                qObj.chapter = item.chapter || "General";
            }

            if (item.options) {
                const optArr = Array.isArray(item.options) ? item.options : Object.values(item.options);
                qObj.options = optArr.map(o => String(o ?? ""));
            }
            return qObj;
        });
    };

    // 2. Live Preview Counter as Admin Pastes Code
    window.MPP_previewSnippetCount = function() {
        const statusEl = document.getElementById('mpp-snippet-parse-status');
        const rawText = document.getElementById('mpp-snippet-textarea')?.value || '';
        if (!statusEl) return;

        if (!rawText.trim()) {
            statusEl.className = "text-[11px] font-bold text-slate-400";
            statusEl.innerText = "Waiting for snippet...";
            return;
        }

        try {
            const splitCh = document.getElementById('mpp-snippet-split-chap')?.checked !== false;
            const items = window.MPP_parseRawQuestionSnippet(rawText, splitCh);
            const tCount = items.filter(x => x.type === 'Theory').length;
            const mCount = items.filter(x => x.type === 'MCQ').length;
            const firstId = items[0] ? items[0].q : '-';
            const lastId = items[items.length - 1] ? items[items.length - 1].q : '-';
            statusEl.className = "text-[11px] font-extrabold text-emerald-600 dark:text-emerald-400";
            statusEl.innerText = `✅ Ready: ${items.length} Questions (${tCount} Theory, ${mCount} MCQ) • IDs: ${firstId} → ${lastId}`;
        } catch (err) {
            statusEl.className = "text-[11px] font-extrabold text-red-500";
            statusEl.innerText = `❌ ${err.message}`;
        }
    };

    // 3. Inject & Merge Pasted Snippet into Firebase Cloud Vault
    window.MPP_injectSnippetToFirebase = async function(btn) {
        if (!window.isUserAdmin()) return alert("Admin access required.");
        const rawText = document.getElementById('mpp-snippet-textarea')?.value || '';
        if (!rawText.trim()) return alert("Please paste your question objects first!");

        const splitCh = document.getElementById('mpp-snippet-split-chap')?.checked !== false;
        const mode = document.getElementById('mpp-snippet-merge-mode')?.value || 'merge';
        const targetInput = document.getElementById('mpp-snippet-target-path')?.value || '';

        let newItems = [];
        try {
            newItems = window.MPP_parseRawQuestionSnippet(rawText, splitCh);
        } catch (e) {
            return alert(e.message);
        }
        if (newItems.length === 0) return alert("No valid question objects found in snippet.");

        let { college, subjectKey, candidateKeys } = window.MPP_getVaultKeys();
        if (targetInput && targetInput.includes('/')) {
            const [cPart, sPart] = targetInput.split('/');
            if (cPart && sPart) {
                college = cPart.trim().toLowerCase();
                subjectKey = sPart.trim().toUpperCase();
                candidateKeys = [subjectKey, subjectKey.toLowerCase()];
            }
        }

        const origBtnText = btn ? btn.innerText : "";
        if (btn) { btn.innerText = "⏳ Merging into Firebase..."; btn.disabled = true; }

        try {
            const { dbInstance } = await window.MPP_ensureProfsFirebase();
            const { ref, get, update } = await import("https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js");

            // 1. Fetch existing bank from Firebase (or fall back to currently loaded window.qnaData)
            let existingBank = null;
            for (const k of candidateKeys) {
                const snap = await get(ref(dbInstance, `question_banks/${college}/${k}`)).catch(() => null);
                if (snap && snap.exists()) {
                    existingBank = window.MPP_sanitizeBankData(snap.val(), college);
                    break;
                }
            }

            if (!existingBank && Array.isArray(window.qnaData) && window.qnaData.length > 0 && college === (window.COLLEGE_CODE || 'deoghar').toLowerCase()) {
                existingBank = {
                    collegeName: window.COLLEGE_NAME || `AIIMS ${college.toUpperCase()}`,
                    curriculumData: window.curriculumData || [],
                    qnaData: [...window.qnaData]
                };
            }

            if (!existingBank) {
                existingBank = {
                    collegeName: `AIIMS ${college.toUpperCase()}`,
                    curriculumData: window.curriculumData || [],
                    qnaData: []
                };
            }

            // Save backup for 1-Click Undo
            window.MPP_lastBatchBackup = {
                college,
                subjectKey,
                bankSnapshot: JSON.parse(JSON.stringify(existingBank))
            };
            const undoBtn = document.getElementById('btn-mpp-undo-snippet');
            if (undoBtn) undoBtn.classList.remove('hidden');

            let finalQna = [...existingBank.qnaData];
            let addedCount = 0;
            let updatedCount = 0;

            if (mode === 'auto-number') {
                // Find highest existing Theory (e.g. DGT114) and MCQ (e.g. DGM90) numbers
                let maxT = 0, maxM = 0;
                let prefixT = "DGT", prefixM = "DGM";
                finalQna.forEach(item => {
                    const mT = String(item.q).match(/^([A-Z]*T)(\d+)$/i);
                    if (mT) { prefixT = mT[1].toUpperCase(); maxT = Math.max(maxT, parseInt(mT[2], 10)); }
                    const mM = String(item.q).match(/^([A-Z]*M)(\d+)$/i);
                    if (mM) { prefixM = mM[1].toUpperCase(); maxM = Math.max(maxM, parseInt(mM[2], 10)); }
                });

                newItems.forEach(item => {
                    if (item.type === 'MCQ') {
                        maxM++;
                        item.q = `${prefixM}${maxM}`;
                    } else {
                        maxT++;
                        item.q = `${prefixT}${maxT}`;
                    }
                    finalQna.push(item);
                    addedCount++;
                });
            } else {
                // Smart Merge by QID: Update existing QID in-place or append new QID at the end
                const indexMap = new Map();
                finalQna.forEach((item, idx) => {
                    indexMap.set(String(item.q).trim().toUpperCase(), idx);
                });

                newItems.forEach(item => {
                    const up = String(item.q).trim().toUpperCase();
                    if (indexMap.has(up)) {
                        const existingIdx = indexMap.get(up);
                        finalQna[existingIdx] = { ...finalQna[existingIdx], ...item };
                        updatedCount++;
                    } else {
                        indexMap.set(up, finalQna.length);
                        finalQna.push(item);
                        addedCount++;
                    }
                });
            }
// 1. Natural-sort finalQna so Theory (DGT1..DGT999) always comes first, then MCQ (DGM1..DGM999)
            finalQna.sort((a, b) => {
                const aIsMcq = a.type === 'MCQ' ? 1 : 0;
                const bIsMcq = b.type === 'MCQ' ? 1 : 0;
                if (aIsMcq !== bIsMcq) return aIsMcq - bIsMcq;
                return String(a.q || '').localeCompare(String(b.q || ''), undefined, { numeric: true, sensitivity: 'base' });
            });

            // 2. Auto-register any new chapters into both flat and nested ({ unit, chapters }) curriculumData
            let updatedCurriculum = JSON.parse(JSON.stringify(existingBank.curriculumData || []));
            const existingChapSet = new Set();
            updatedCurriculum.forEach(g => {
                if (typeof g === 'string') existingChapSet.add(g);
                else if (g && Array.isArray(g.chapters)) g.chapters.forEach(c => existingChapSet.add(c));
            });

            const newlyDiscoveredChaps = [];
            finalQna.forEach(item => {
                const chList = Array.isArray(item.chapter) ? item.chapter : [item.chapter];
                chList.forEach(ch => {
                    if (ch && !existingChapSet.has(ch)) {
                        existingChapSet.add(ch);
                        newlyDiscoveredChaps.push(ch);
                    }
                });
            });

            if (newlyDiscoveredChaps.length > 0) {
                newlyDiscoveredChaps.sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' }));
                if (updatedCurriculum.length === 0 || typeof updatedCurriculum[0] === 'string') {
                    updatedCurriculum.push(...newlyDiscoveredChaps);
                    updatedCurriculum.sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' }));
                } else {
                    let extraUnit = updatedCurriculum.find(u => u && u.unit === 'Additional Chapters');
                    if (!extraUnit) {
                        extraUnit = { unit: 'Additional Chapters', chapters: [] };
                        updatedCurriculum.push(extraUnit);
                    }
                    extraUnit.chapters.push(...newlyDiscoveredChaps);
                    extraUnit.chapters.sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' }));
                }
            }
            // Also sync any embedded explanation/answer fields directly to answers/${college}/${subjectKey}
            const answerUpdates = {};
            let syncedAnswers = 0;
            newItems.forEach(item => {
                const explText = item.explanation || item.answer || "";
                if (explText) {
                    answerUpdates[`answers/${college}/${subjectKey}/${item.q}`] = {
                        text: String(explText),
                        updatedAt: new Date().toISOString(),
                        updatedBy: (window.currentUserObj && window.currentUserObj.email) ? window.currentUserObj.email : 'admin'
                    };
                    syncedAnswers++;
                }
            });
            if (syncedAnswers > 0) {
                await update(ref(dbInstance), answerUpdates);
            }

            // Upload merged bank to Firebase + update IndexedDB cache
            const uploadRes = await window.MPP_uploadBankPayloadToFirebase(college, subjectKey, {
                collegeName: existingBank.collegeName,
                curriculumData: updatedCurriculum,
                qnaData: finalQna
            });

            document.getElementById('mpp-snippet-textarea').value = '';
            window.MPP_previewSnippetCount();

            alert(`🎉 Injected into Firebase (${college}/${uploadRes.normSubKey})!\n\n• Added: ${addedCount} new questions\n• Updated: ${updatedCount} existing questions\n• Total in Bank: ${uploadRes.count} questions`);

            if (typeof window.fetchQuestions === 'function') {
                await window.fetchQuestions();
            }
        } catch (err) {
            console.error(err);
            alert("Injection failed: " + err.message);
        } finally {
            if (btn) { btn.innerText = origBtnText; btn.disabled = false; }
        }
    };

    // 4. 1-Click Undo Last Batch Injection
    window.MPP_undoLastSnippetInjection = async function(btn) {
        if (!window.MPP_lastBatchBackup) return;
        const { college, subjectKey, bankSnapshot } = window.MPP_lastBatchBackup;
        if (!confirm(`Restore ${college}/${subjectKey} to its state before the last snippet injection (${bankSnapshot.qnaData.length} questions)?`)) return;

        if (btn) { btn.innerText = "Restoring..."; btn.disabled = true; }
        try {
            await window.MPP_uploadBankPayloadToFirebase(college, subjectKey, bankSnapshot);
            window.MPP_lastBatchBackup = null;
            if (btn) btn.classList.add('hidden');
            alert("✅ Previous bank state restored!");
            if (typeof window.fetchQuestions === 'function') await window.fetchQuestions();
        } catch (e) {
            alert("Undo failed: " + e.message);
        } finally {
            if (btn) { btn.innerText = "↩️ Undo Last Injection"; btn.disabled = false; }
        }
    };

    // 5. Inject the Snippet Injector UI Card Inside #mpp-cloud-vault-modal
    function attachSnippetUI() {
        const modal = document.getElementById('mpp-cloud-vault-modal');
        const scrollContainer = modal ? modal.querySelector('.space-y-4.overflow-y-auto') : null;
        if (!scrollContainer || document.getElementById('mpp-snippet-injector-card')) return;

        const { college, subjectKey } = window.MPP_getVaultKeys();

        const injectorHtml = `
        <div id="mpp-snippet-injector-card" class="p-4 rounded-xl bg-indigo-50/80 dark:bg-slate-800/90 border-2 border-indigo-300 dark:border-indigo-700 space-y-2.5">
            <div class="flex items-center justify-between gap-2">
                <div class="text-xs font-black text-indigo-900 dark:text-indigo-300 uppercase tracking-wider">
                    📝 Paste Exam Paper JS Snippet (Append / Merge)
                </div>
                <button id="btn-mpp-undo-snippet" onclick="window.MPP_undoLastSnippetInjection(this)" class="hidden px-2.5 py-1 rounded-lg bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-300 text-[10px] font-extrabold border border-red-300 dark:border-red-700 cursor-pointer">
                    ↩️ Undo Last Injection
                </button>
            </div>
            <p class="text-[11px] text-slate-600 dark:text-slate-400 leading-snug m-0">
                Paste your <code class="px-1 bg-white dark:bg-slate-900 rounded">{ q: "DGT115", type: "Theory", stem: "...", ... },</code> lines (including <code class="px-1 bg-white dark:bg-slate-900 rounded">// comments</code>) directly below:
            </p>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                    <label class="text-[9.5px] font-extrabold text-slate-500 uppercase block mb-0.5">Target (college/SUBJECT)</label>
                    <input type="text" id="mpp-snippet-target-path" value="${college}/${subjectKey}" class="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-extrabold text-indigo-700 dark:text-indigo-300 outline-none">
                </div>
                <div>
                    <label class="text-[9.5px] font-extrabold text-slate-500 uppercase block mb-0.5">ID Handling Mode</label>
                    <select id="mpp-snippet-merge-mode" class="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-white outline-none">
                        <option value="merge">Smart Merge / Append by QID</option>
                        <option value="auto-number">Auto-Number from Last DGT/DGM</option>
                    </select>
                </div>
            </div>

            <textarea id="mpp-snippet-textarea" rows="5" oninput="window.MPP_previewSnippetCount()" placeholder='// --- 2021 Batch Prof Paper I ---&#10;{ q: "DGT115", type: "Theory", stem: "...", ans_key: "", chapter: "58. The breast", examBatch: "2021 Batch Prof Paper I" },' class="w-full p-2.5 rounded-xl bg-white dark:bg-slate-950 border border-indigo-200 dark:border-slate-700 font-mono text-[11px] text-slate-800 dark:text-emerald-300 outline-none focus:ring-2 focus:ring-indigo-500 resize-y"></textarea>

            <div class="flex items-center justify-between flex-wrap gap-2">
                <label class="flex items-center gap-1.5 text-[10.5px] font-bold text-slate-600 dark:text-slate-300 cursor-pointer">
                    <input type="checkbox" id="mpp-snippet-split-chap" checked onchange="window.MPP_previewSnippetCount()" class="w-3.5 h-3.5 accent-indigo-600 rounded">
                    <span>Auto-split <code class="px-1 bg-white dark:bg-slate-900 rounded">" / "</code> multi-chapters</span>
                </label>
                <div id="mpp-snippet-parse-status" class="text-[11px] font-bold text-slate-400">Waiting for snippet...</div>
            </div>

            <button type="button" onclick="window.MPP_injectSnippetToFirebase(this)" class="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs uppercase tracking-wider border-none cursor-pointer shadow-md transition-all">
                🚀 Inject &amp; Append Snippet to Firebase
            </button>
        </div>`;

        scrollContainer.insertAdjacentHTML('afterbegin', injectorHtml);

        // Keep target path updated whenever modal opens
        const origOpenModal = window.MPP_openCloudVaultModal;
        if (typeof origOpenModal === 'function') {
            window.MPP_openCloudVaultModal = function() {
                origOpenModal.apply(this, arguments);
                const { college: c, subjectKey: s } = window.MPP_getVaultKeys();
                const targetEl = document.getElementById('mpp-snippet-target-path');
                if (targetEl) targetEl.value = `${c}/${s}`;
            };
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', attachSnippetUI);
    } else {
        attachSnippetUI();
    }
    window.addEventListener('load', attachSnippetUI);
    setTimeout(attachSnippetUI, 500);
})();
/* ============================================================================
   SECTION 18B: AI VISION EXAM SCANNER, MULTI-KEY ROTATOR & BATCH SYNC
   Automatically mounts inside #mpp-cloud-vault-modal above #mpp-snippet-textarea
   ============================================================================ */

(function () {
    const AI_CONFIG_STORAGE_KEY = 'mpp_ai_scanner_config_v1';
    const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';

    // 1. Load & Save AI Config (Firebase settings/ai_config + localStorage fallback)
    window.MPP_getAIConfig = async function () {
        let localCfg = {};
        try {
            localCfg = JSON.parse(localStorage.getItem(AI_CONFIG_STORAGE_KEY) || '{}');
        } catch (e) {}

        if (window.firebase && firebase.database) {
            try {
                const snap = await firebase.database().ref('settings/ai_config').once('value');
                const cloudCfg = snap.val();
                if (cloudCfg && (cloudCfg.apiKeys || cloudCfg.model)) {
                    const merged = {
                        apiKeys: Array.isArray(cloudCfg.apiKeys) ? cloudCfg.apiKeys : (localCfg.apiKeys || []),
                        model: cloudCfg.model || localCfg.model || DEFAULT_GEMINI_MODEL
                    };
                    localStorage.setItem(AI_CONFIG_STORAGE_KEY, JSON.stringify(merged));
                    return merged;
                }
            } catch (err) {
                console.warn('[MPP AI Scanner] Using localStorage AI config fallback:', err.message);
            }
        }
        return {
            apiKeys: Array.isArray(localCfg.apiKeys) ? localCfg.apiKeys : [],
            model: localCfg.model || DEFAULT_GEMINI_MODEL
        };
    };

    window.MPP_saveAIConfig = async function (rawKeysText, modelName) {
        const keys = String(rawKeysText || '')
            .split(/[\n,]+/)
            .map(k => k.trim())
            .filter(k => k.length > 10);
        const model = String(modelName || DEFAULT_GEMINI_MODEL).trim() || DEFAULT_GEMINI_MODEL;
        const cfg = { apiKeys: keys, model: model, updatedAt: Date.now() };

        localStorage.setItem(AI_CONFIG_STORAGE_KEY, JSON.stringify(cfg));

        if (window.firebase && firebase.database) {
            try {
                await firebase.database().ref('settings/ai_config').set(cfg);
                return { savedToCloud: true, count: keys.length, model };
            } catch (err) {
                console.warn('[MPP AI Scanner] Cloud save blocked, saved locally:', err.message);
            }
        }
        return { savedToCloud: false, count: keys.length, model };
    };

    // 2. Scan window.qnaData for Existing Exam Batches & Next Question IDs
    window.MPP_getExistingExamBatches = function () {
        const list = Array.isArray(window.qnaData) ? window.qnaData : [];
        const batches = new Set();
        list.forEach(item => {
            if (item && item.examBatch && String(item.examBatch).trim()) {
                batches.add(String(item.examBatch).trim());
            }
        });
        return Array.from(batches).sort((a, b) => b.localeCompare(a));
    };
    // 2. Universal College Prefix & Next ID Detector (Supports T/M, DGT/DGM, KLT/KLM, DT/DM, PT/PM, etc.)
    window.MPP_getNextQuestionIds = function () {
        const list = Array.isArray(window.qnaData) ? window.qnaData : [];
        let maxTheory = 0;
        let maxMcq = 0;
        const theoryPrefixCounts = {};
        const mcqPrefixCounts = {};

        list.forEach(item => {
            const qId = String(item?.q || '').trim();
            // [A-Z]*T matches "T78", "DGT12", "KLT5", "DT9", "PT1", etc.
            const tMatch = qId.match(/^([A-Z]*T)(\d+)$/i);
            const mMatch = qId.match(/^([A-Z]*M)(\d+)$/i);

            if (tMatch) {
                const pfx = tMatch[1].toUpperCase();
                const num = parseInt(tMatch[2], 10);
                theoryPrefixCounts[pfx] = (theoryPrefixCounts[pfx] || 0) + 1;
                if (num > maxTheory) maxTheory = num;
            } else if (mMatch) {
                const pfx = mMatch[1].toUpperCase();
                const num = parseInt(mMatch[2], 10);
                mcqPrefixCounts[pfx] = (mcqPrefixCounts[pfx] || 0) + 1;
                if (num > maxMcq) maxMcq = num;
            }
        });

        // Pick the dominant prefix already used in this subject's question bank
        const getDominantPrefix = (countsObj) => {
            const entries = Object.entries(countsObj);
            if (!entries.length) return null;
            entries.sort((a, b) => b[1] - a[1]);
            return entries[0][0];
        };

        let theoryPrefix = getDominantPrefix(theoryPrefixCounts);
        let mcqPrefix = getDominantPrefix(mcqPrefixCounts);

        // If a bank only has Theory so far (e.g., "KLT" or "T"), derive the MCQ prefix ("KLM" or "M") automatically
        if (theoryPrefix && !mcqPrefix) {
            mcqPrefix = theoryPrefix.replace(/T$/i, 'M');
        } else if (mcqPrefix && !theoryPrefix) {
            theoryPrefix = mcqPrefix.replace(/M$/i, 'T');
        }

        // Fallback if creating a brand-new empty subject bank
        if (!theoryPrefix || !mcqPrefix) {
            const pathHint = String(
                window.currentCollege ||
                document.querySelector('#mpp-cloud-vault-modal')?.innerText ||
                location.pathname
            ).toLowerCase();

            let base = '';
            if (pathHint.includes('kalyani')) base = 'KL';
            else if (pathHint.includes('patna')) base = 'P';
            else if (pathHint.includes('delhi')) base = 'D';
            else if (pathHint.includes('deoghar')) base = 'DG';

            theoryPrefix = theoryPrefix || (base + 'T');
            mcqPrefix = mcqPrefix || (base + 'M');
        }

        return {
            theoryPrefix,
            mcqPrefix,
            nextTheoryNum: maxTheory + 1,
            nextMcqNum: maxMcq + 1
        };
    };

    // 3. Extract Valid Chapters from window.curriculumData or window.qnaData
    window.MPP_getValidChaptersList = function () {
        const chapters = new Set();
        if (window.curriculumData) {
            if (Array.isArray(window.curriculumData)) {
                window.curriculumData.forEach(c => {
                    if (typeof c === 'string') chapters.add(c.trim());
                    else if (c && (c.chapter || c.name || c.title)) chapters.add(String(c.chapter || c.name || c.title).trim());
                });
            } else if (typeof window.curriculumData === 'object') {
                Object.keys(window.curriculumData).forEach(k => {
                    const val = window.curriculumData[k];
                    if (typeof val === 'string') chapters.add(val.trim());
                    else if (val && (val.chapter || val.name || val.title)) chapters.add(String(val.chapter || val.name || val.title).trim());
                    else chapters.add(k.trim());
                });
            }
        }
        if (Array.isArray(window.qnaData)) {
            window.qnaData.forEach(q => {
                if (q && q.chapter) {
                    String(q.chapter).split('/').forEach(part => {
                        if (part.trim()) chapters.add(part.trim());
                    });
                }
            });
        }
        return Array.from(chapters).filter(Boolean);
    };

    // 4. Client-Side Image Compressor (JPG/PNG -> max 1600px JPEG) & PDF Base64 Loader
    window.MPP_fileToGeminiPart = function (file) {
        return new Promise((resolve, reject) => {
            if (file.type === 'application/pdf') {
                const reader = new FileReader();
                reader.onload = () => {
                    const base64 = String(reader.result).split(',')[1];
                    resolve({ inline_data: { mime_type: 'application/pdf', data: base64 } });
                };
                reader.onerror = reject;
                reader.readAsDataURL(file);
                return;
            }

            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const img = new Image();
                    img.onload = () => {
                        const MAX_DIM = 1600;
                        let width = img.width;
                        let height = img.height;
                        if (width > MAX_DIM || height > MAX_DIM) {
                            if (width > height) {
                                height = Math.round((height * MAX_DIM) / width);
                                width = MAX_DIM;
                            } else {
                                width = Math.round((width * MAX_DIM) / height);
                                height = MAX_DIM;
                            }
                        }
                        const canvas = document.createElement('canvas');
                        canvas.width = width;
                        canvas.height = height;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0, width, height);
                        const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
                        const base64 = dataUrl.split(',')[1];
                        resolve({ inline_data: { mime_type: 'image/jpeg', data: base64 } });
                    };
                    img.onerror = reject;
                    img.src = e.target.result;
                };
                reader.onerror = reject;
                reader.readAsDataURL(file);
                return;
            }

            reject(new Error(`Unsupported file type: ${file.type}`));
        });
    };

    // 5. Build Master System Prompt (Used for both API Call & 1-Click Argon Copy)
    window.MPP_buildExamTranscriberPrompt = function (options = {}) {
        const chapters = window.MPP_getValidChaptersList();
        const ids = window.MPP_getNextQuestionIds();
        const forcedBatch = String(options.examBatch || '').trim();
        const autoSolveMcq = Boolean(options.autoSolveMcq);

        return `You are an expert medical university exam parser for MBBS PROFS PREP.
Transcribe all exam questions from the uploaded question paper page(s) into JavaScript object lines ready for direct injection.

STRICT OUTPUT FORMAT RULES:
1. Return ONLY raw JavaScript object lines (and "// --- Section ... ---" comments). Do NOT wrap in markdown code fences (\`\`\`), do NOT include an outer array "[", and do NOT add conversational text.
2. Each question MUST be on a single line in one of these exact schemas:
   - For Theory questions:
     { q: "${ids.theoryPrefix}${ids.nextTheoryNum}", type: "Theory", stem: "<b>[LAQ]</b> Question text...", ans_key: "", chapter: "Exact Chapter Name", examBatch: "${forcedBatch || '2024 Batch Pre-Prof'}" },
   - For MCQ questions:
     { q: "${ids.mcqPrefix}${ids.nextMcqNum}", type: "MCQ", stem: "Question stem...", options: ["Option A text", "Option B text", "Option C text", "Option D text"], ans_key: "${autoSolveMcq ? 'A' : ''}", chapter: "Exact Chapter Name", examBatch: "${forcedBatch || '2024 Batch Pre-Prof'}" },
3. NUMBERING:
   - Start Theory IDs at ${ids.theoryPrefix}${ids.nextTheoryNum} and increment sequentially.
   - Start MCQ IDs at ${ids.mcqPrefix}${ids.nextMcqNum} and increment sequentially.
4. CLEAN SHORT LABELS ([LAQ], [SAQ], [VSAQ]):
   - NEVER include verbose headers like "Short Essay Question:", "Long Answer Question:", or "Short Answer Question:" inside the stem.
   - Instead, keep type: "Theory" and prepend ONLY a bold tag at the start of the stem based on marks:
     * <b>[LAQ]</b> for long / structured clinical vignette questions (>= 6 marks, or multi-part i, ii, iii questions).
     * <b>[SAQ]</b> for short essay / short notes (3 to 5 marks, such as items under [5 x 3 = 15]).
     * <b>[VSAQ]</b> for 1 to 2 mark questions.
5. MARKS & SUB-PARTS:
   - Keep multi-part sub-questions (i., ii., iii., iv.) inside the same single "stem" separated by <br>.
   - Place the marks in bold at the end of the main stem or question, e.g., <b>(2+2+3 = 7 Marks)</b> or <b>(3 Marks)</b>.
   - If a group header says "[5 x 3=15]" or "[5x3=15]", assign <b>(3 Marks)</b> to each individual question under that header.
6. EXAM BATCH CONSISTENCY:
   - ${forcedBatch
        ? `You MUST set examBatch: "${forcedBatch}" on EVERY single question so Theory and MCQ papers match the exact same filter.`
        : `Read the exam batch and exam name from Page 1 (e.g., "2024 Batch Pre-Prof") and apply that exact same examBatch string across all pages, even if Page 2+ has no header.`}
7. CHAPTER MAPPING:
   - Map every question's "chapter" field strictly to the closest matching chapter from this active subject list (if a question spans two chapters, join them with " / "):
     ${chapters.length ? JSON.stringify(chapters) : '["General", "Forensic Medicine", "Toxicology"]'}
8. NOISE & UNCERTAIN OCR HANDLING:
   - Ignore fingers on margins, "PTO...", page numbers, college location footers (e.g., "Deoghar, Jharkhand 814152"), and background notebook handwriting.
   - Fix obvious printing typos (e.g., "Antidots" -> "Antidotes"), and if any word is genuinely blurry or cut off, wrap it in ⚠️[word?] so the admin can spot and edit it.
   - ${autoSolveMcq ? 'For MCQs where no answer key is printed, solve the medical MCQ accurately and set ans_key to "A", "B", "C", or "D".' : 'For MCQs, set ans_key to "A"/"B"/"C"/"D" only if marked on the paper, otherwise leave ans_key: "".'}`;
    };

    // 6. Call Gemini API with Automatic Multi-Key Failover (Rotates Gmail Keys on 429/403)
    window.MPP_callGeminiWithFailover = async function (parts, statusCallback) {
        const cfg = await window.MPP_getAIConfig();
        if (!cfg.apiKeys || cfg.apiKeys.length === 0) {
            throw new Error('No Gemini API key configured. Click "🔑 AI Keys & Model" above to paste at least one free Google AI Studio key.');
        }

        const model = cfg.model || DEFAULT_GEMINI_MODEL;
        let lastError = null;

        for (let i = 0; i < cfg.apiKeys.length; i++) {
            const key = cfg.apiKeys[i];
            const maskedKey = '...' + key.slice(-4);
            if (statusCallback) {
                statusCallback(`⏳ Scanning with ${model} (Key #${i + 1}/${cfg.apiKeys.length} ${maskedKey})...`);
            }

            try {
                const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ role: 'user', parts: parts }],
                        generationConfig: {
                            temperature: 0.15,
                            maxOutputTokens: 65536
                        }
                    })
                });

                if (!response.ok) {
                    const errBody = await response.json().catch(() => ({}));
                    const errMsg = errBody?.error?.message || `HTTP ${response.status}`;
                    // Rotate to next Gmail API key on quota limit (429), key error (400/403), or overload (503)
                    if ([400, 403, 429, 500, 503].includes(response.status) && i < cfg.apiKeys.length - 1) {
                        console.warn(`[MPP AI Scanner] Key #${i + 1} (${maskedKey}) failed (${errMsg}). Rotating to Key #${i + 2}...`);
                        continue;
                    }
                    throw new Error(`Key #${i + 1} (${maskedKey}): ${errMsg}`);
                }

                const data = await response.json();
                const text = (data?.candidates?.[0]?.content?.parts || [])
                    .map(p => p.text || '')
                    .join('\n')
                    .replace(/^```(?:javascript|js|json)?\s*/i, '')
                    .replace(/\s*```$/i, '')
                    .trim();

                if (!text) throw new Error('Gemini returned an empty transcription.');
                return { text, usedKeyIndex: i + 1, maskedKey, model };
            } catch (err) {
                lastError = err;
                if (i === cfg.apiKeys.length - 1) break;
            }
        }
        throw lastError || new Error('All configured Gemini API keys failed.');
    };

        // 7. Auto-Sanitize Mobile Paste, Clean [LAQ]/[SAQ] Tags & Sync Batch
        // 7. Bulletproof Auto-Healer: Fixes Truncated Lines, Multiline Stems, Tags & Batch Sync
    window.MPP_cleanAndSyncSnippetText = function (rawText, forcedBatch) {
        if (!rawText) return '';

        // Step A: Strip markdown fences, zero-width tokens & normalize smart quotes
        let sanitized = String(rawText)
            .replace(/^```(?:javascript|js|json)?\s*/gim, '')
            .replace(/```$/gim, '')
            .replace(/[\u200B-\u200D\uFEFF]/g, '')
            .replace(/\u00A0/g, ' ')
            .replace(/[“”]/g, '"')
            .replace(/[‘’]/g, "'");

        // Step B: Separate comments and objects that got glued onto the same line
        sanitized = sanitized
            .replace(/(\/\/[^\n]*?---)\s*(\{)/g, '$1\n$2')
            .replace(/\},\s*(\/\/)/g, '},\n\n$1')
            .replace(/\},\s*(\{\s*q\s*:)/g, '},\n$1');

        // Step C: Collapse accidental multiline breaks inside { q: ... } objects into <br>
        const rawLines = sanitized.split('\n');
        const mergedLines = [];
        let buffer = '';

        for (let i = 0; i < rawLines.length; i++) {
            const l = rawLines[i].trim();
            if (!l) {
                if (!buffer) mergedLines.push('');
                continue;
            }
            if (l.startsWith('//')) {
                if (buffer) {
                    mergedLines.push(buffer);
                    buffer = '';
                }
                mergedLines.push(l);
                continue;
            }
            if (l.startsWith('{') && buffer) {
                // Previous object line was never closed before a new { started
                mergedLines.push(buffer);
                buffer = l;
            } else if (l.startsWith('{')) {
                buffer = l;
            } else if (buffer) {
                buffer += '<br>' + l;
            } else {
                mergedLines.push(l);
            }

            if (buffer && /\}\s*,?\s*$/.test(buffer)) {
                mergedLines.push(buffer);
                buffer = '';
            }
        }
        if (buffer) mergedLines.push(buffer);

        const idInfo = window.MPP_getNextQuestionIds();
        let tCounter = idInfo.nextTheoryNum;
        let mCounter = idInfo.nextMcqNum;

        return mergedLines
            .map(line => {
                const trimmed = line.trim();
                if (!trimmed || !trimmed.startsWith('{')) return trimmed;

                let updated = trimmed;

                // Auto-heal truncated last line if AI cut off before closing },
                if (!/\}\s*,?\s*$/.test(updated)) {
                    const quoteCount = (updated.match(/(?<!\\)"/g) || []).length;
                    if (quoteCount % 2 !== 0) updated += '"';
                    if (!/ans_key\s*:/i.test(updated)) updated += ', ans_key: ""';
                    if (!/chapter\s*:/i.test(updated)) updated += ', chapter: "General"';
                    if (!/examBatch\s*:/i.test(updated)) {
                        updated += `, examBatch: "${(forcedBatch || '2024 Batch Pre-Prof').replace(/"/g, '\\"')}"`;
                    }
                    updated += ' },';
                }

                // Strip verbose "Short Essay Question:" / "Long Answer Question:"
                updated = updated.replace(/(stem\s*:\s*")(?:\s*<b>\[(LAQ|SAQ|VSAQ)\]<\/b>\s*)?(?:Short\s+Essay\s+Question\s*[:\-]?\s*)/i, '$1<b>[SAQ]</b> ');
                updated = updated.replace(/(stem\s*:\s*")(?:\s*<b>\[(LAQ|SAQ|VSAQ)\]<\/b>\s*)?(?:Long\s+(?:Answer|Essay)\s+Question\s*[:\-]?\s*)/i, '$1<b>[LAQ]</b> ');
                updated = updated.replace(/(stem\s*:\s*")(?:\s*<b>\[(LAQ|SAQ|VSAQ)\]<\/b>\s*)?(?:Very\s+Short\s+Answer\s+Question\s*[:\-]?\s*)/i, '$1<b>[VSAQ]</b> ');

                // Auto-insert <br> before inline sub-questions (i., ii., iii., iv., a), b), c))
                updated = updated.replace(/\s+(?=(?:i|ii|iii|iv|v)\.\s+[A-Z])/g, '<br>');
                updated = updated.replace(/\s+(?=[a-f][\.\)]\s+[A-Z])/g, '<br>');

                // Ensure Theory items without a tag get [LAQ] or [SAQ]
                if (/type\s*:\s*"Theory"/i.test(updated) && !/<b>\[(LAQ|SAQ|VSAQ)\]<\/b>/i.test(updated)) {
                    const isLong = /<br>\s*(?:i\.|a[\.\)]|1\.)/i.test(updated) || /=\s*(?:[6-9]|1\d|2\d)\s*Marks?/i.test(updated);
                    updated = updated.replace(/(stem\s*:\s*")/i, `$1<b>[${isLong ? 'LAQ' : 'SAQ'}]</b> `);
                }

                // Force synchronize examBatch if selected in dropdown
                if (forcedBatch) {
                    const safeBatch = forcedBatch.replace(/"/g, '\\"');
                    if (/examBatch\s*:\s*"[^"]*"/i.test(updated)) {
                        updated = updated.replace(/examBatch\s*:\s*"[^"]*"/i, `examBatch: "${safeBatch}"`);
                    } else {
                        updated = updated.replace(/\}\s*,?\s*$/, `, examBatch: "${safeBatch}" },`);
                    }
                }

                // Rewrite q: "..." to match active bank's exact Theory/MCQ prefix and continue numbering
                if (/type\s*:\s*"MCQ"/i.test(updated)) {
                    updated = updated.replace(/(\{\s*q\s*:\s*")[^"]*(")/i, `$1${idInfo.mcqPrefix}${mCounter++}$2`);
                } else if (/type\s*:\s*"Theory"/i.test(updated)) {
                    updated = updated.replace(/(\{\s*q\s*:\s*")[^"]*(")/i, `$1${idInfo.theoryPrefix}${tCounter++}$2`);
                }

                if (!updated.endsWith(',')) updated += ',';
                return updated;
            })
            .join('\n');
    };

    // Normalize stem words for duplicate detection
    function normalizeStemForDupCheck(str) {
        return String(str || '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\[(LAQ|SAQ|VSAQ)\]/gi, ' ')
            .replace(/\(\s*[\d+\s=x×*]+Marks?\s*\)/gi, ' ')
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    window.MPP_auditSnippetQuality = function (rawText) {
        const lines = String(rawText || '').split('\n').filter(l => l.trim().startsWith('{'));
        const uncertainMatches = String(rawText || '').match(/⚠️\[[^\]]+\]/g) || [];
        const existingNorms = (Array.isArray(window.qnaData) ? window.qnaData : []).map(q => ({
            id: q.q,
            batch: String(q.examBatch || '').trim(),
            norm: normalizeStemForDupCheck(q.stem)
        })).filter(x => x.norm.length > 8);

        const duplicates = [];
        lines.forEach((line, idx) => {
            const stemMatch = line.match(/stem\s*:\s*"((?:[^"\\]|\\.)*)"/i);
            const batchMatch = line.match(/examBatch\s*:\s*"([^"]*)"/i);
            if (!stemMatch) return;
            const norm = normalizeStemForDupCheck(stemMatch[1]);
            const incomingBatch = batchMatch ? batchMatch[1].trim() : '';
            if (norm.length < 8) return;

            for (const ex of existingNorms) {
                if (ex.norm === norm || (norm.length > 25 && (ex.norm.includes(norm) || norm.includes(ex.norm)))) {
                    if (incomingBatch && ex.batch && incomingBatch.toLowerCase() === ex.batch.toLowerCase()) {
                        duplicates.push(`🚨 SAME-BATCH DUPLICATE: Line ${idx + 1} already exists in ${ex.batch} (${ex.id})`);
                    } else {
                        duplicates.push(`🔁 Repeat PYQ from ${ex.batch || 'Earlier Batch'} (${ex.id}) on Line ${idx + 1} (Safe to add)`);
                    }
                    break;
                }
            }
        });

        return { uncertainMatches, duplicates };
    };


    // 8. Wrap window.MPP_previewSnippetCount to Display Duplicate & Uncertain OCR Alerts
    const originalPreviewFn = window.MPP_previewSnippetCount;
    window.MPP_previewSnippetCount = function () {
        if (typeof originalPreviewFn === 'function') {
            originalPreviewFn.apply(this, arguments);
        }
        const textarea = document.getElementById('mpp-snippet-textarea');
        const auditBox = document.getElementById('mpp-ai-audit-banner');
        if (!textarea || !auditBox) return;

        const { uncertainMatches, duplicates } = window.MPP_auditSnippetQuality(textarea.value);
        if (uncertainMatches.length === 0 && duplicates.length === 0) {
            auditBox.style.display = 'none';
            auditBox.innerHTML = '';
            return;
        }

        const warnings = [];
        if (uncertainMatches.length > 0) {
            warnings.push(`<div>🔍 <b>Uncertain OCR Words (${uncertainMatches.length}):</b> ${uncertainMatches.join(', ')} — please check & edit inside the box below.</div>`);
        }
        if (duplicates.length > 0) {
            warnings.push(`<div>⚠️ <b>Possible Duplicates (${duplicates.length}):</b> ${duplicates.slice(0, 3).join(' | ')}${duplicates.length > 3 ? '...' : ''}</div>`);
        }
        auditBox.style.display = 'block';
        auditBox.innerHTML = warnings.join('');
    };

    // 9. Mount the AI Vision Scanner UI inside #mpp-cloud-vault-modal
    window.MPP_mountAIScannerUI = async function () {
        const textarea = document.getElementById('mpp-snippet-textarea');
        if (!textarea || document.getElementById('mpp-ai-scanner-panel')) return;

        // Default merge mode to auto-number so delayed uploads never collide
        const mergeSelect = document.getElementById('mpp-snippet-merge-mode');
        if (mergeSelect && mergeSelect.querySelector('option[value="auto-number"]')) {
            mergeSelect.value = 'auto-number';
        }

        const batches = window.MPP_getExistingExamBatches();
        const cfg = await window.MPP_getAIConfig();

        const panel = document.createElement('div');
        panel.id = 'mpp-ai-scanner-panel';
        panel.style.cssText = 'background:linear-gradient(135deg,rgba(15,23,42,0.96),rgba(30,41,59,0.96));border:1px solid rgba(56,189,248,0.35);border-radius:12px;padding:12px;margin-bottom:10px;color:#f8fafc;font-size:12.5px;box-shadow:0 6px 20px rgba(0,0,0,0.25);';

        panel.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:10px;">
                <div style="font-weight:700;font-size:13.5px;color:#38bdf8;display:flex;align-items:center;gap:6px;">
                    <span>📸 AI Exam Paper Scanner (JPG / PNG / PDF)</span>
                    <span id="mpp-ai-key-badge" style="font-size:11px;padding:2px 7px;border-radius:99px;background:${cfg.apiKeys.length ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.25)'};color:${cfg.apiKeys.length ? '#4ade80' : '#fca5a5'};">
                        ${cfg.apiKeys.length ? `${cfg.apiKeys.length} Key(s) • ${cfg.model}` : 'No Key Set'}
                    </span>
                </div>
                <div style="display:flex;gap:6px;flex-wrap:wrap;">
                    <button type="button" id="mpp-ai-toggle-keys-btn" style="background:#334155;color:#e2e8f0;border:1px solid #475569;border-radius:7px;padding:4px 9px;font-size:11.5px;cursor:pointer;">
                        🔑 AI Keys & Model
                    </button>
                    <button type="button" id="mpp-ai-copy-prompt-btn" title="Copy prompt + active chapters to use inside Gemini Pro / Argon web chat" style="background:#1e293b;color:#93c5fd;border:1px solid #3b82f6;border-radius:7px;padding:4px 9px;font-size:11.5px;cursor:pointer;">
                        📋 Copy Argon Prompt
                    </button>
                </div>
            </div>

            <!-- Collapsible Multi-Gmail API Key & Model Manager -->
            <div id="mpp-ai-key-drawer" style="display:none;background:rgba(2,6,23,0.75);border:1px solid #334155;border-radius:9px;padding:10px;margin-bottom:10px;">
                <div style="font-size:11.5px;color:#cbd5e1;margin-bottom:6px;">
                    Paste 1 or more <b>Google AI Studio API Keys</b> (comma or newline separated). If Key #1 hits quota or you switch Gmail accounts, the scanner automatically rotates to Key #2.
                </div>
                <textarea id="mpp-ai-keys-input" rows="2" placeholder="AIzaSy... (Gmail 1)\nAIzaSy... (Backup Gmail 2)" style="width:100%;background:#0f172a;color:#f8fafc;border:1px solid #475569;border-radius:6px;padding:6px;font-family:monospace;font-size:11.5px;margin-bottom:6px;">${cfg.apiKeys.join('\n')}</textarea>
                <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
                    <label style="font-size:11.5px;color:#94a3b8;">Model ID:</label>
                    <input type="text" id="mpp-ai-model-input" value="${cfg.model}" placeholder="gemini-2.5-flash" style="flex:1;min-width:160px;background:#0f172a;color:#38bdf8;border:1px solid #475569;border-radius:6px;padding:4px 8px;font-family:monospace;font-size:12px;" />
                    <button type="button" id="mpp-ai-save-keys-btn" style="background:#0284c7;color:#fff;border:none;border-radius:6px;padding:5px 12px;font-weight:600;font-size:11.5px;cursor:pointer;">
                        💾 Save Keys & Model
                    </button>
                </div>
            </div>

            <!-- Exam Batch Linker (Matches Delayed MCQ + Theory Uploads) -->
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:8px;margin-bottom:9px;">
                <div>
                    <label style="display:block;font-size:11px;color:#94a3b8;margin-bottom:3px;">🎯 Target Exam Batch (Links Theory + Later MCQ Papers):</label>
                    <select id="mpp-ai-batch-select" style="width:100%;background:#0f172a;color:#f8fafc;border:1px solid #475569;border-radius:7px;padding:6px 8px;font-size:12px;">
                        <option value="">✨ Auto-Detect Batch from Page 1 Header</option>
                        <option value="__CUSTOM__">➕ Type New / Custom Exam Batch...</option>
                        ${batches.map(b => `<option value="${b.replace(/"/g, '&quot;')}">📌 ${b}</option>`).join('')}
                    </select>
                </div>
                <div id="mpp-ai-custom-batch-wrap" style="display:none;">
                    <label style="display:block;font-size:11px;color:#94a3b8;margin-bottom:3px;">✏️ Custom Exam Batch Name:</label>
                    <input type="text" id="mpp-ai-custom-batch-input" placeholder="e.g., 2024 Batch Pre-Prof" style="width:100%;background:#0f172a;color:#f8fafc;border:1px solid #38bdf8;border-radius:7px;padding:6px 8px;font-size:12px;" />
                </div>
            </div>

            <!-- Options & Action Row -->
            <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;">
                <label style="display:flex;align-items:center;gap:6px;font-size:11.5px;color:#cbd5e1;cursor:pointer;">
                    <input type="checkbox" id="mpp-ai-autosolve-mcq" checked />
                    <span>Auto-solve MCQs if answer key missing</span>
                </label>

                <div style="display:flex;gap:7px;flex-wrap:wrap;">
                    <input type="file" id="mpp-ai-file-input" accept="image/*,application/pdf" multiple style="display:none;" />
                    <button type="button" id="mpp-ai-upload-btn" style="background:linear-gradient(135deg,#0284c7,#2563eb);color:#fff;border:none;border-radius:8px;padding:7px 13px;font-weight:700;font-size:12px;cursor:pointer;box-shadow:0 3px 10px rgba(37,99,235,0.35);">
                        📤 Upload & Transcribe Paper (JPG/PNG/PDF)
                    </button>
                    <button type="button" id="mpp-ai-clean-sync-btn" title="Convert verbose Short/Long Question labels to [SAQ]/[LAQ] and sync selected Exam Batch" style="background:#0f766e;color:#fff;border:none;border-radius:8px;padding:7px 11px;font-weight:600;font-size:11.5px;cursor:pointer;">
                        ✨ Clean [SAQ]/[LAQ] & Sync Batch
                    </button>
                </div>
            </div>

            <!-- Live Scan Status & Audit Banner -->
            <div id="mpp-ai-scan-status" style="display:none;margin-top:8px;padding:6px 9px;border-radius:7px;background:rgba(15,23,42,0.9);border:1px solid #334155;font-size:11.5px;color:#38bdf8;"></div>
            <div id="mpp-ai-audit-banner" style="display:none;margin-top:8px;padding:7px 10px;border-radius:7px;background:rgba(120,53,15,0.35);border:1px solid #f59e0b;font-size:11.5px;color:#fde68a;line-height:1.45;"></div>
        `;

        textarea.parentNode.insertBefore(panel, textarea);

        // Helper to read active batch selection
        const getSelectedBatch = () => {
            const sel = document.getElementById('mpp-ai-batch-select');
            if (!sel) return '';
            if (sel.value === '__CUSTOM__') {
                return String(document.getElementById('mpp-ai-custom-batch-input')?.value || '').trim();
            }
            return sel.value.trim();
        };

        // Wire UI Events
        document.getElementById('mpp-ai-toggle-keys-btn').onclick = () => {
            const drawer = document.getElementById('mpp-ai-key-drawer');
            drawer.style.display = drawer.style.display === 'none' ? 'block' : 'none';
        };

        document.getElementById('mpp-ai-batch-select').onchange = (e) => {
            const customWrap = document.getElementById('mpp-ai-custom-batch-wrap');
            customWrap.style.display = e.target.value === '__CUSTOM__' ? 'block' : 'none';
        };

        document.getElementById('mpp-ai-save-keys-btn').onclick = async () => {
            const rawKeys = document.getElementById('mpp-ai-keys-input').value;
            const modelVal = document.getElementById('mpp-ai-model-input').value;
            const res = await window.MPP_saveAIConfig(rawKeys, modelVal);
            const badge = document.getElementById('mpp-ai-key-badge');
            badge.textContent = res.count ? `${res.count} Key(s) • ${res.model}` : 'No Key Set';
            badge.style.background = res.count ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.25)';
            badge.style.color = res.count ? '#4ade80' : '#fca5a5';
            document.getElementById('mpp-ai-key-drawer').style.display = 'none';
        };

        document.getElementById('mpp-ai-copy-prompt-btn').onclick = async () => {
            const promptText = window.MPP_buildExamTranscriberPrompt({
                examBatch: getSelectedBatch(),
                autoSolveMcq: document.getElementById('mpp-ai-autosolve-mcq').checked
            });
            await navigator.clipboard.writeText(promptText);
            const btn = document.getElementById('mpp-ai-copy-prompt-btn');
            const old = btn.textContent;
            btn.textContent = '✅ Master Prompt Copied!';
            setTimeout(() => (btn.textContent = old), 2200);
        };

        document.getElementById('mpp-ai-clean-sync-btn').onclick = () => {
            textarea.value = window.MPP_cleanAndSyncSnippetText(textarea.value, getSelectedBatch());
            if (typeof window.MPP_previewSnippetCount === 'function') window.MPP_previewSnippetCount();
        };

        const fileInput = document.getElementById('mpp-ai-file-input');
        document.getElementById('mpp-ai-upload-btn').onclick = () => fileInput.click();

        fileInput.onchange = async (e) => {
            const files = Array.from(e.target.files || []);
            if (!files.length) return;

            const statusEl = document.getElementById('mpp-ai-scan-status');
            statusEl.style.display = 'block';
            statusEl.style.color = '#38bdf8';

            try {
                statusEl.textContent = `⏳ Compressing & preparing ${files.length} file(s)...`;
                const mediaParts = [];
                for (const f of files) {
                    const part = await window.MPP_fileToGeminiPart(f);
                    mediaParts.push(part);
                }

                const targetBatch = getSelectedBatch();
                const sysPrompt = window.MPP_buildExamTranscriberPrompt({
                    examBatch: targetBatch,
                    autoSolveMcq: document.getElementById('mpp-ai-autosolve-mcq').checked
                });

                const result = await window.MPP_callGeminiWithFailover(
                    [{ text: sysPrompt }, ...mediaParts],
                    (msg) => { statusEl.textContent = msg; }
                );

                const cleaned = window.MPP_cleanAndSyncSnippetText(result.text, targetBatch);
                textarea.value = textarea.value.trim()
                    ? `${textarea.value.trim()}\n\n${cleaned}`
                    : cleaned;

                statusEl.style.color = '#4ade80';
                statusEl.textContent = `✅ Transcribed ${files.length} page(s) via ${result.model} (Key #${result.usedKeyIndex} ${result.maskedKey}). Review & edit below before clicking Inject!`;

                if (typeof window.MPP_previewSnippetCount === 'function') {
                    window.MPP_previewSnippetCount();
                }
            } catch (err) {
                statusEl.style.color = '#fca5a5';
                statusEl.textContent = `❌ Scan Error: ${err.message}`;
            } finally {
                fileInput.value = '';
            }
        };
    };

    // Auto-mount whenever #mpp-snippet-textarea appears in the DOM
    const observer = new MutationObserver(() => {
        if (document.getElementById('mpp-snippet-textarea') && !document.getElementById('mpp-ai-scanner-panel')) {
            window.MPP_mountAIScannerUI();
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    if (document.getElementById('mpp-snippet-textarea')) {
        window.MPP_mountAIScannerUI();
    }
})();
/* ============================================================================
   SECTION 18C: LONG-TAP SELECT & DELETE FROM DECK (IGNORES TEEN PATTI CARDS)
   ============================================================================ */
(function () {
    let isSelectMode = false;
    let selectedQuestionIds = new Set();

    window.MPP_initCardLongPress = function () {
        document.addEventListener('touchstart', handleTouchStart, { passive: true });
        document.addEventListener('touchend', handleTouchEnd, { passive: true });
        document.addEventListener('touchmove', handleTouchEnd, { passive: true });
        document.addEventListener('contextmenu', (e) => {
            // Do NOT trigger bulk delete on Teen Patti cards or the < 1/16 > pill
            if (e.target.closest('.tp-patti, .mpp-cluster-pill, #mpp-admin-link-modal')) return;
            const card = e.target.closest('.question-card');
            if (card && window.isUserAdmin && window.isUserAdmin()) {
                e.preventDefault();
                const qId = card.getAttribute('data-qid') || card.dataset.qId;
                if (qId) window.MPP_toggleCardSelection(qId, card);
            }
        });
    };

    let touchTimer = null;

    function handleTouchStart(e) {
        if (e.target.closest('.tp-patti, .mpp-cluster-pill, #mpp-admin-link-modal')) return;
        const card = e.target.closest('.question-card');
        if (!card || !(window.isUserAdmin && window.isUserAdmin())) return;
        touchTimer = setTimeout(() => {
            const qId = card.getAttribute('data-qid') || card.dataset.qId;
            if (qId) {
                window.MPP_toggleCardSelection(qId, card);
                if (navigator.vibrate) navigator.vibrate(50);
            }
        }, 500);
    }

    function handleTouchEnd() {
        if (touchTimer) clearTimeout(touchTimer);
        touchTimer = null;
    }

    window.MPP_toggleCardSelection = function (qId, cardElement) {
        isSelectMode = true;
        if (selectedQuestionIds.has(qId)) {
            selectedQuestionIds.delete(qId);
            if (cardElement) cardElement.style.border = '';
        } else {
            selectedQuestionIds.add(qId);
            if (cardElement) cardElement.style.border = '3px solid #ef4444';
        }
        window.MPP_renderBulkDeleteBar();
    };

    window.MPP_renderBulkDeleteBar = function () {
        let bar = document.getElementById('mpp-bulk-delete-bar');
        if (!bar) {
            bar = document.createElement('div');
            bar.id = 'mpp-bulk-delete-bar';
            bar.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#0f172a;color:#fff;padding:12px 20px;border-radius:14px;box-shadow:0 10px 25px rgba(0,0,0,0.5);display:flex;align-items:center;gap:15px;z-index:99999;border:1px solid #ef4444;font-size:13px;';
            document.body.appendChild(bar);
        }

        if (selectedQuestionIds.size === 0) {
            bar.style.display = 'none';
            isSelectMode = false;
            return;
        }

        bar.style.display = 'flex';
        bar.innerHTML = `
            <div>🗑️ <b>${selectedQuestionIds.size}</b> question(s) selected</div>
            <button onclick="window.MPP_confirmBulkDelete()" style="background:#ef4444;color:#fff;border:none;padding:6px 12px;border-radius:8px;font-weight:700;cursor:pointer;">Delete Selected</button>
            <button onclick="window.MPP_cancelBulkDelete()" style="background:#334155;color:#cbd5e1;border:none;padding:6px 10px;border-radius:8px;cursor:pointer;">Cancel</button>
        `;
    };

    window.MPP_cancelBulkDelete = function () {
        selectedQuestionIds.clear();
        isSelectMode = false;
        document.querySelectorAll('.question-card').forEach(c => c.style.border = '');
        window.MPP_renderBulkDeleteBar();
    };

    window.MPP_confirmBulkDelete = async function () {
        if (!confirm(`Are you sure you want to delete ${selectedQuestionIds.size} selected question(s)?`)) return;
        const { college, subjectKey } = typeof window.MPP_getVaultKeys === 'function'
            ? window.MPP_getVaultKeys()
            : { college: 'deoghar', subjectKey: window.SUBJECT_CODE || 'CFM' };

        window.qnaData = (Array.isArray(window.qnaData) ? window.qnaData : []).filter(q => !selectedQuestionIds.has(String(q.q)));
        try {
            await window.MPP_uploadBankPayloadToFirebase(college, subjectKey, {
                collegeName: window.COLLEGE_NAME || `AIIMS ${college.toUpperCase()}`,
                curriculumData: window.curriculumData || [],
                qnaData: window.qnaData
            });
            alert('✅ Successfully deleted from Firebase!');
        } catch (err) {
            alert('❌ Firebase delete error: ' + err.message);
        }

        selectedQuestionIds.clear();
        isSelectMode = false;
        window.MPP_renderBulkDeleteBar();
        if (typeof window.fetchQuestions === 'function') window.fetchQuestions();
        else location.reload();
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', window.MPP_initCardLongPress);
    } else {
        window.MPP_initCardLongPress();
    }
})();

/* ============================================================================
   SECTION 19: MEDPYQ-STYLE RESUME PRACTICE MODAL, SAVED RESPONSES (SOLVED DB),
   RESET QUESTION & ATTEMPT STATUS FILTER (FIXED LAYOUT & LEXICAL SYNC)
   ============================================================================ */
(function initMedPYQResumeAndSolvedEngine() {
    // 1. Inject the MedPYQ "Resume Practice?" Modal Overlay into DOM
    if (!document.getElementById('resume-prompt-overlay')) {
        const resumeModalHTML = `
        <div id="resume-prompt-overlay" style="position: fixed; inset: 0; background: rgba(15, 23, 42, 0.85); z-index: 9999999; display: none; align-items: center; justify-content: center; backdrop-filter: blur(5px); font-family: 'Plus Jakarta Sans', 'Roboto', sans-serif;">
            <div style="background: white; width: 90%; max-width: 400px; border-radius: 20px; padding: 30px; text-align: center; box-shadow: 0 20px 40px rgba(0,0,0,0.2);">
                <div style="color:#0f2b52; background:#e0f2fe; border-radius: 50%; width: 60px; height: 60px; margin: 0 auto 15px; display:flex; align-items:center; justify-content:center; font-size: 24px;">
                    <svg class="w-7 h-7" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path stroke-linecap="round" stroke-linejoin="round" d="M3 3v5h5"/><path stroke-linecap="round" stroke-linejoin="round" d="M12 7v5l4 2"/></svg>
                </div>
                <h3 style="color:#0f172a; font-size:1.4rem; margin:0 0 8px 0; font-weight:800;">Resume Practice?</h3>
                <p style="color:#64748b; font-size:0.9rem; margin:0 0 25px 0; line-height:1.5;">You left off at Question <span id="resume-q-num" style="font-weight:800; color:#0f2b52;"></span> in your last session. Would you like to resume or start fresh?</p>
                <div style="display:flex; gap:10px;">
                    <button type="button" style="background:#f1f5f9; color:#64748b; flex:1; padding:14px; border-radius:12px; border:none; font-weight:700; font-size:15px; cursor:pointer;" onclick="window.startFresh()">Start Fresh</button>
                    <button type="button" style="background:#0f2b52; color:white; flex:1; padding:14px; border-radius:12px; border:none; font-weight:700; font-size:15px; cursor:pointer;" onclick="window.resumeSession()">Continue</button>
                </div>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', resumeModalHTML);
    }

    window.MPP_userSolved = {};
    window.MPP_attemptFilter = 'all';
    window.tempSavedIndex = 0;
    window.MPP_resumeCheckedForSubject = false;

    // Bridge top-level `let` variables in HTML inline scripts by injecting a <script> tag into document.body
    function installLexicalBridgeScript() {
        if (document.getElementById('mpp-lexical-bridge-script')) return;
        const s = document.createElement('script');
        s.id = 'mpp-lexical-bridge-script';
        s.textContent = `
            window.MPP_readLexicalState = function() {
                return {
                    deckIndex: typeof deckIndex !== 'undefined' ? deckIndex : (window.deckIndex || 0),
                    isDeckMode: typeof isDeckMode !== 'undefined' ? isDeckMode : Boolean(window.isDeckMode),
                    deckStatus: typeof deckStatus !== 'undefined' ? deckStatus : (window.deckStatus || {}),
                    activeDeckQuestions: typeof activeDeckQuestions !== 'undefined' ? activeDeckQuestions : (window.activeDeckQuestions || []),
                    displayData: typeof displayData !== 'undefined' ? displayData : (window.displayData || []),
                    qnaData: typeof qnaData !== 'undefined' ? qnaData : (window.qnaData || [])
                };
            };
            window.MPP_writeLexicalState = function(p) {
                if (!p) return;
                if (p.deckIndex !== undefined) {
                    window.deckIndex = p.deckIndex;
                    try { if (typeof deckIndex !== 'undefined') deckIndex = p.deckIndex; } catch(e){}
                }
                if (p.isDeckMode !== undefined) {
                    window.isDeckMode = p.isDeckMode;
                    try { if (typeof isDeckMode !== 'undefined') isDeckMode = p.isDeckMode; } catch(e){}
                }
                if (p.deckStatus !== undefined) {
                    window.deckStatus = p.deckStatus;
                    try { if (typeof deckStatus !== 'undefined') deckStatus = p.deckStatus; } catch(e){}
                }
                if (p.activeDeckQuestions !== undefined) {
                    window.activeDeckQuestions = p.activeDeckQuestions;
                    try { if (typeof activeDeckQuestions !== 'undefined') activeDeckQuestions = p.activeDeckQuestions; } catch(e){}
                }
                if (p.displayData !== undefined) {
                    window.displayData = p.displayData;
                    try { if (typeof displayData !== 'undefined') displayData = p.displayData; } catch(e){}
                }
                if (p.qnaData !== undefined) {
                    window.qnaData = p.qnaData;
                    try { if (typeof qnaData !== 'undefined') qnaData = p.qnaData; } catch(e){}
                }
                if (p.curriculumData !== undefined) {
                    window.curriculumData = p.curriculumData;
                    try { if (typeof curriculumData !== 'undefined') curriculumData = p.curriculumData; } catch(e){}
                }
                if (p.collegeName !== undefined) {
                    window.COLLEGE_NAME = p.collegeName;
                    try { if (typeof COLLEGE_NAME !== 'undefined') COLLEGE_NAME = p.collegeName; } catch(e){}
                }
            };
        `;
        document.body.appendChild(s);
    }

    // Upgrade MPP_syncLexicalGlobals so 777pankaj and 777calm also use the real <script> bridge
    window.MPP_syncLexicalGlobals = function(bank) {
        if (!bank) return;
        installLexicalBridgeScript();
        if (typeof window.MPP_writeLexicalState === 'function') {
            window.MPP_writeLexicalState({
                collegeName: bank.collegeName || window.COLLEGE_NAME,
                curriculumData: bank.curriculumData || [],
                qnaData: bank.qnaData || []
            });
        }
    };

    function getPageDeckState() {
        installLexicalBridgeScript();
        if (typeof window.MPP_readLexicalState === 'function') {
            return window.MPP_readLexicalState();
        }
        return {
            deckIndex: window.deckIndex || 0,
            isDeckMode: Boolean(window.isDeckMode),
            deckStatus: window.deckStatus || {},
            activeDeckQuestions: window.activeDeckQuestions || [],
            displayData: window.displayData || [],
            qnaData: window.qnaData || []
        };
    }

    function setPageDeckIndex(newIdx) {
        installLexicalBridgeScript();
        if (typeof window.MPP_writeLexicalState === 'function') {
            window.MPP_writeLexicalState({ deckIndex: newIdx });
        } else {
            window.deckIndex = newIdx;
        }
    }

    function ensureDeckModeOpen() {
        const st = getPageDeckState();
        if (!st.isDeckMode) {
            if (typeof window.toggleDeckMode === 'function') {
                window.toggleDeckMode();
            } else if (typeof window.toggleViewMode === 'function') {
                window.toggleViewMode('deck');
            } else {
                const deckBtn = document.querySelector('[onclick*="toggleDeckMode"], #deckModeBtn, #btn-deck-mode');
                if (deckBtn) deckBtn.click();
            }
        }
    }

    // 2. Compute Storage Keys for Current User + College + Subject
    window.MPP_getSolvedKeys = function() {
        const uid = (window.currentUserObj && window.currentUserObj.uid) ? window.currentUserObj.uid : 'guest';
        const { college, subjectKey } = typeof window.MPP_getVaultKeys === 'function'
            ? window.MPP_getVaultKeys()
            : {
                college: String(window.COLLEGE_CODE || 'deoghar').toLowerCase(),
                subjectKey: String(window.SUBJECT_CODE || 'CFM').toUpperCase()
            };
        return {
            uid,
            college,
            subjectKey,
            cacheKey: `mpp_solved_${uid}_${college}_${subjectKey}`,
            indexKey: `mpp_index_${uid}_${college}_${subjectKey}`,
            fbSolvedPath: `users/${uid}/solved/${college}/${subjectKey}`,
            fbIndexPath: `users/${uid}/last_index/${college}/${subjectKey}`
        };
    };

    // 3. Save Current Deck Question Index
    window.saveCurrentIndex = function() {
        const st = getPageDeckState();
        const { uid, indexKey, fbIndexPath } = window.MPP_getSolvedKeys();
        const deckLen = (st.activeDeckQuestions && st.activeDeckQuestions.length) || 0;
        const totalLen = (st.qnaData && st.qnaData.length) || 0;

        if (deckLen > 0 && (totalLen === 0 || deckLen === totalLen)) {
            localStorage.setItem(indexKey, String(st.deckIndex));
            if (uid !== 'guest' && window.db) {
                import("https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js").then(({ ref, set }) => {
                    set(ref(window.db, fbIndexPath), st.deckIndex).catch(() => {});
                });
            }
        }
    };

    // 4. MedPYQ `startFresh()` and `resumeSession()` Handlers
    window.startFresh = function() {
        document.getElementById('resume-prompt-overlay').style.display = 'none';
        setPageDeckIndex(0);
        if (window.MPP_state) {
            window.MPP_state.overrideQid = null;
            window.MPP_state.fanViewOpen = false;
            window.MPP_state.activeTopicSlug = null;
        }
        window.saveCurrentIndex();
        ensureDeckModeOpen();
        if (typeof window.renderDeckCard === 'function') window.renderDeckCard();
    };

    window.resumeSession = function() {
        document.getElementById('resume-prompt-overlay').style.display = 'none';
        ensureDeckModeOpen();
        setPageDeckIndex(window.tempSavedIndex || 0);
        if (window.MPP_state) {
            window.MPP_state.overrideQid = null;
            window.MPP_state.fanViewOpen = false;
            window.MPP_state.activeTopicSlug = null;
        }
        if (typeof window.renderDeckCard === 'function') window.renderDeckCard();
    };

    // 5. Load Solved Responses & Last Question Index from localStorage + Firebase
    window.MPP_loadSolvedAndResumeState = async function() {
        if (!document.getElementById('qnaTable')) return;
        const { uid, cacheKey, indexKey, fbSolvedPath, fbIndexPath } = window.MPP_getSolvedKeys();

        const localCache = localStorage.getItem(cacheKey);
        if (localCache) {
            try { window.MPP_userSolved = JSON.parse(localCache) || {}; } catch (e) {}
        }

        let savedIndex = parseInt(localStorage.getItem(indexKey), 10);

        if (uid !== 'guest') {
            try {
                const { dbInstance } = await window.MPP_ensureProfsFirebase();
                const { ref, get } = await import("https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js");

                const [solvedSnap, idxSnap] = await Promise.all([
                    get(ref(dbInstance, fbSolvedPath)).catch(() => null),
                    get(ref(dbInstance, fbIndexPath)).catch(() => null)
                ]);

                if (solvedSnap && solvedSnap.exists()) {
                    const cloudSolved = solvedSnap.val() || {};
                    for (const qid in cloudSolved) {
                        if (cloudSolved[qid] && cloudSolved[qid].ans) {
                            window.MPP_userSolved[qid] = cloudSolved[qid].ans;
                        }
                    }
                    localStorage.setItem(cacheKey, JSON.stringify(window.MPP_userSolved));
                }

                if ((isNaN(savedIndex) || savedIndex <= 0) && idxSnap && idxSnap.exists()) {
                    const cloudIdx = parseInt(idxSnap.val(), 10);
                    if (!isNaN(cloudIdx) && cloudIdx > 0) {
                        savedIndex = cloudIdx;
                        localStorage.setItem(indexKey, String(cloudIdx));
                    }
                }
            } catch (e) {}
        }

        const st = getPageDeckState();
        const qMap = new Map();
        (st.qnaData || []).forEach(q => { if (q && q.q) qMap.set(String(q.q).trim(), q); });

        const nextStatus = { ...(st.deckStatus || {}) };
        Object.keys(window.MPP_userSolved).forEach(qid => {
            const picked = window.MPP_userSolved[qid];
            const qObj = qMap.get(qid) || (window.MPP_resolveQuestionByQid ? window.MPP_resolveQuestionByQid(qid) : null);
            if (qObj && picked) {
                const isCorr = String(picked).toUpperCase() === String(qObj.ans_key || 'A').trim().toUpperCase();
                nextStatus[qid] = isCorr ? 'correct' : 'wrong';
            }
        });
        if (typeof window.MPP_writeLexicalState === 'function') {
            window.MPP_writeLexicalState({ deckStatus: nextStatus });
        }

        if (st.isDeckMode && typeof window.renderDeckCard === 'function') {
            window.renderDeckCard();
        }

        // Show MedPYQ's "#resume-prompt-overlay" if savedIndex > 0
        const deckLen = (st.activeDeckQuestions && st.activeDeckQuestions.length) || (st.qnaData && st.qnaData.length) || 0;
        if (!window.MPP_resumeCheckedForSubject && deckLen > 0 && window.accessLevel !== 'guest') {
            window.MPP_resumeCheckedForSubject = true;
            if (!isNaN(savedIndex) && savedIndex > 0 && savedIndex < deckLen) {
                window.tempSavedIndex = savedIndex;
                const numEl = document.getElementById('resume-q-num');
                if (numEl) numEl.innerText = savedIndex + 1;
                document.getElementById('resume-prompt-overlay').style.display = 'flex';
            }
        }
    };

    // 6. Reset Single Question
    window.MPP_resetAnswer = function(qid) {
        if (!qid) return;
        const cleanQid = String(qid).trim();
        delete window.MPP_userSolved[cleanQid];

        const st = getPageDeckState();
        if (st.deckStatus && st.deckStatus[cleanQid]) {
            delete st.deckStatus[cleanQid];
            if (typeof window.MPP_writeLexicalState === 'function') {
                window.MPP_writeLexicalState({ deckStatus: st.deckStatus });
            }
        }

        const { uid, cacheKey, fbSolvedPath } = window.MPP_getSolvedKeys();
        localStorage.setItem(cacheKey, JSON.stringify(window.MPP_userSolved));

        if (uid !== 'guest' && window.db) {
            import("https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js").then(({ ref, set }) => {
                set(ref(window.db, `${fbSolvedPath}/${cleanQid}`), null).catch(() => {});
            });
        }

        if (typeof window.renderDeckCard === 'function') window.renderDeckCard();
    };

    // 7. Reset All Progress
    window.resetAllProgress = async function() {
        const { uid, subjectKey, cacheKey, indexKey, fbSolvedPath, fbIndexPath } = window.MPP_getSolvedKeys();
        if (uid === 'guest') {
            alert("You must be logged in to reset progress.");
            return;
        }

        if (!confirm(`Are you sure you want to delete all your answers for ${subjectKey}? This cannot be undone.`)) return;

        window.MPP_userSolved = {};
        if (typeof window.MPP_writeLexicalState === 'function') {
            window.MPP_writeLexicalState({ deckIndex: 0, deckStatus: {} });
        }

        localStorage.removeItem(cacheKey);
        localStorage.removeItem(indexKey);

        if (window.MPP_state) {
            window.MPP_state.overrideQid = null;
            window.MPP_state.fanViewOpen = false;
            window.MPP_state.activeTopicSlug = null;
        }

        try {
            const { dbInstance } = await window.MPP_ensureProfsFirebase();
            const { ref, set } = await import("https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js");
            await Promise.all([
                set(ref(dbInstance, fbSolvedPath), null),
                set(ref(dbInstance, fbIndexPath), null)
            ]);
            alert("Progress successfully reset!");
        } catch (err) {
            alert("Failed to reset progress in the database. Please try again.");
        }

        const statusSel = document.getElementById('filter-attempt-status');
        if (statusSel) statusSel.value = 'all';
        window.MPP_attemptFilter = 'all';

        if (typeof window.filterTable === 'function') window.filterTable();
        if (typeof window.syncDeckWithFilters === 'function') window.syncDeckWithFilters();
        if (typeof window.renderDeckCard === 'function') window.renderDeckCard();
    };

    // 8. Inject Attempt Status Dropdown & Reset Progress into the Outer Filter Row (NOT inside the Search Input wrapper!)
    function injectMedPYQControls() {
        if (document.getElementById('filter-attempt-status')) return;
        const typeFilter = document.getElementById('typeFilter');
        const chapterFilter = document.getElementById('chapterFilter');
        const anchorEl = typeFilter || chapterFilter;
        if (!anchorEl || !anchorEl.parentElement) return;

        const bar = anchorEl.parentElement;

        const statusSelect = document.createElement('select');
        statusSelect.id = 'filter-attempt-status';
        statusSelect.className = anchorEl.className || 'px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold outline-none cursor-pointer';
        statusSelect.innerHTML = `
            <option value="all">All Questions</option>
            <option value="unattempted">Unattempted Only</option>
            <option value="incorrect">Incorrect Only</option>
            <option value="correct">Correct Only</option>
        `;
        statusSelect.onchange = function() {
            window.MPP_attemptFilter = this.value;
            if (typeof window.filterTable === 'function') window.filterTable();
            if (typeof window.syncDeckWithFilters === 'function') window.syncDeckWithFilters();
        };

        const resetBtn = document.createElement('button');
        resetBtn.type = 'button';
        resetBtn.id = 'btn-medpyq-reset-progress';
        resetBtn.onclick = window.resetAllProgress;
        resetBtn.className = 'px-3 py-2.5 rounded-xl border border-red-200 dark:border-red-800/80 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs font-extrabold cursor-pointer inline-flex items-center justify-center gap-1.5 hover:bg-red-100 transition-colors shrink-0';
        resetBtn.innerHTML = `<span>🗑️</span> <span>Reset Progress</span>`;

        bar.insertBefore(statusSelect, anchorEl);
        bar.appendChild(resetBtn);
    }

    // 9. Install Hooks AFTER Section 15 (`MPP_deckHooked`) so Section 15 never overwrites them
    function installMedPYQDeckHooks() {
        if (!document.getElementById('qnaTable')) return;
        installLexicalBridgeScript();
        injectMedPYQControls();

        // Wait until Section 15 has finished hooking renderDeckCard/checkDeckAnswer
        if (!window.MPP_deckHooked && typeof window.renderDeckCard === 'function') {
            setTimeout(installMedPYQDeckHooks, 250);
            return;
        }
        if (window.MPP_medpyqHooksInstalled) return;
        window.MPP_medpyqHooksInstalled = true;

        // A. Hook deckNext, deckPrev & jumpToDeckQuestion to call saveCurrentIndex()
        ['deckNext', 'deckPrev', 'jumpToDeckQuestion'].forEach(fnName => {
            const origFn = window[fnName];
            if (typeof origFn === 'function') {
                window[fnName] = function() {
                    const res = origFn.apply(this, arguments);
                    window.saveCurrentIndex();
                    return res;
                };
            }
        });

        // B. Hook checkDeckAnswer to Save Selected Option Letter to localStorage & Firebase
        const prevCheckAns = window.checkDeckAnswer;
        if (typeof prevCheckAns === 'function') {
            window.checkDeckAnswer = function(btn, picked, correct) {
                const { displayedQ, anchorQ } = typeof window.MPP_getAnchorAndDisplayedQ === 'function'
                    ? window.MPP_getAnchorAndDisplayedQ()
                    : { displayedQ: null, anchorQ: null };
                const st = getPageDeckState();
                const fallbackQ = (st.activeDeckQuestions && st.activeDeckQuestions[st.deckIndex]) || null;
                const targetQ = displayedQ || anchorQ || fallbackQ;
                const qid = targetQ ? String(targetQ.q).trim() : null;

                if (qid && window.MPP_userSolved[qid]) return;

                const p = String(picked).trim().toUpperCase();
                const c = String(correct).trim().toUpperCase();

                if (qid) {
                    window.MPP_userSolved[qid] = p;
                    const { uid, cacheKey, fbSolvedPath } = window.MPP_getSolvedKeys();
                    localStorage.setItem(cacheKey, JSON.stringify(window.MPP_userSolved));

                    if (uid !== 'guest' && window.db) {
                        const isCorrect = (p === c);
                        import("https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js").then(({ ref, set }) => {
                            set(ref(window.db, `${fbSolvedPath}/${qid}`), {
                                ans: p,
                                correct: isCorrect,
                                timestamp: Date.now()
                            }).catch(() => {});
                        });
                    }
                }

                const res = prevCheckAns.apply(this, arguments);
                window.saveCurrentIndex();
                if (typeof window.renderDeckCard === 'function') window.renderDeckCard();
                return res;
            };
        }

        // C. Hook renderDeckCard to Restore Saved Option Highlights, Explanation & "Reset Question" Button
        const prevRenderCard = window.renderDeckCard;
        if (typeof prevRenderCard === 'function') {
            window.renderDeckCard = function() {
                const res = prevRenderCard.apply(this, arguments);

                const { anchorQ, displayedQ } = typeof window.MPP_getAnchorAndDisplayedQ === 'function'
                    ? window.MPP_getAnchorAndDisplayedQ()
                    : { anchorQ: null, displayedQ: null };
                const st = getPageDeckState();
                const fallbackQ = (st.activeDeckQuestions && st.activeDeckQuestions[st.deckIndex]) || null;
                const q = displayedQ || anchorQ || fallbackQ;
                if (!q || !q.q) return res;

                const qid = String(q.q).trim();
                const userAns = window.MPP_userSolved[qid];
                if (!userAns) return res;

                const container = document.getElementById('deck-card-container');
                if (!container) return res;

                const correctLetter = String(q.ans_key || 'A').trim().toUpperCase();
                const letters = window.optionLetters || ['A', 'B', 'C', 'D'];
                const optBtns = Array.from(container.querySelectorAll('button[onclick*="checkDeckAnswer"]'));

                optBtns.forEach((btn, idx) => {
                    const char = letters[idx] || String.fromCharCode(65 + idx);
                    btn.disabled = true;
                    btn.classList.remove('deck-opt-correct', 'deck-opt-wrong');
                    if (char === correctLetter) {
                        btn.classList.add('deck-opt-correct');
                    } else if (char === userAns) {
                        btn.classList.add('deck-opt-wrong');
                    }
                });

                const ansPanel = document.getElementById(`deck-ans-panel-${qid}`);
                if (ansPanel && ansPanel.classList.contains('hidden') && typeof window.toggleDeckAnswerPanel === 'function') {
                    window.toggleDeckAnswerPanel(qid);
                }

                if (!container.querySelector('#btn-mpp-reset-single-q')) {
                    const resetWrap = document.createElement('div');
                    resetWrap.className = 'flex justify-end mt-3';
                    resetWrap.innerHTML = `
                        <button type="button" id="btn-mpp-reset-single-q" onclick="window.MPP_resetAnswer('${qid}')" style="background:none; border:none; color:#ef4444; font-size:0.8rem; font-weight:bold; cursor:pointer; text-decoration:underline; display:inline-flex; align-items:center; gap:4px;">
                            <span>↺ Reset Question</span>
                        </button>`;
                    if (ansPanel && ansPanel.parentElement) {
                        ansPanel.parentElement.insertBefore(resetWrap, ansPanel);
                    }
                }

                return res;
            };
        }

        // D. Hook filterTable to Support Attempt Status Filtering (Unattempted / Incorrect / Correct)
        const prevFilterTable = window.filterTable;
        if (typeof prevFilterTable === 'function') {
            window.filterTable = function() {
                const res = prevFilterTable.apply(this, arguments);
                if (window.MPP_attemptFilter && window.MPP_attemptFilter !== 'all') {
                    const st = getPageDeckState();
                    const rawDisp = st.displayData || [];
                    const filteredDisp = rawDisp.filter(item => {
                        if (!item || !item.q) return false;
                        const userAns = window.MPP_userSolved[String(item.q).trim()];
                        const corrAns = String(item.ans_key || 'A').trim().toUpperCase();
                        if (window.MPP_attemptFilter === 'unattempted') return !userAns;
                        if (window.MPP_attemptFilter === 'incorrect') return Boolean(userAns && userAns !== corrAns);
                        if (window.MPP_attemptFilter === 'correct') return Boolean(userAns && userAns === corrAns);
                        return true;
                    });
                    if (typeof window.MPP_writeLexicalState === 'function') {
                        window.MPP_writeLexicalState({ displayData: filteredDisp });
                    }
                    if (typeof window.populateTable === 'function') window.populateTable();
                }
                return res;
            };
        }

        // E. Hook processDataForAccess so Solved Responses & Resume Modal Run as Soon as Bank Loads
        const prevProcess = window.processDataForAccess;
        if (typeof prevProcess === 'function') {
            window.processDataForAccess = function() {
                const res = prevProcess.apply(this, arguments);
                injectMedPYQControls();
                setTimeout(() => window.MPP_loadSolvedAndResumeState(), 150);
                return res;
            };
        }

        const stNow = getPageDeckState();
        if (window.isDataLoaded && Array.isArray(stNow.qnaData) && stNow.qnaData.length > 0) {
            window.MPP_loadSolvedAndResumeState();
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(installMedPYQDeckHooks, 400));
    } else {
        setTimeout(installMedPYQDeckHooks, 400);
    }
    window.addEventListener('load', () => setTimeout(installMedPYQDeckHooks, 400));
})();
/* ============================================================================
   SECTION 20: TEEN PATTI LINKER EXPORT — COPY ONLY Qs & OPTIONS (777PANKAJ)
   & DOWNLOAD LINKED Qs AS JSON (777CALM) (NO EXPLANATIONS • FIREBASE-FIRST)
   ============================================================================ */
(function initTeenPattiAdminExport() {

    // 1. Parse All Topics & QIDs Currently Listed in #mpp-admin-link-input
    window.MPP_parseTeenPattiModalInput = function() {
        const inputEl = document.getElementById('mpp-admin-link-input');
        let rawText = inputEl ? inputEl.value.trim() : '';

        if (!rawText && typeof window.MPP_getAnchorAndDisplayedQ === 'function') {
            const { anchorQ, displayedQ } = window.MPP_getAnchorAndDisplayedQ();
            if (anchorQ || displayedQ) {
                const info = window.MPP_getActiveClusterInfo(
                    anchorQ ? anchorQ.q : null,
                    displayedQ ? displayedQ.q : null,
                    'all'
                );
                if (info && Array.isArray(info.sequence) && info.sequence.length > 0) {
                    const title = (info.activeTopic && info.activeTopic.title) ? info.activeTopic.title : 'Linked Concept';
                    rawText = `${title}: ${info.sequence.join(', ')}`;
                }
            }
        }

        const topicGroups = [];
        const allOrderedQids = [];
        const seenGlobalUpper = new Set();

        rawText.split('\n').map(l => l.trim()).filter(Boolean).forEach(line => {
            let topicTitle = 'Linked Concept';
            let qidsPart = line;
            const colonIdx = line.indexOf(':');
            if (colonIdx !== -1) {
                topicTitle = line.slice(0, colonIdx).trim() || 'Linked Concept';
                qidsPart = line.slice(colonIdx + 1).trim();
            }

            const lineQids = [];
            qidsPart.split(',').forEach(token => {
                const cleanId = token.trim();
                if (!cleanId) return;
                lineQids.push(cleanId);
                const up = cleanId.toUpperCase();
                if (!seenGlobalUpper.has(up)) {
                    seenGlobalUpper.add(up);
                    allOrderedQids.push(cleanId);
                }
            });

            if (lineQids.length > 0) {
                topicGroups.push({ topicTitle, qids: lineQids });
            }
        });

        return { topicGroups, allOrderedQids };
    };

    // 2. Resolve All Teen Patti QIDs (Strictly Questions & Options — NO Explanations)
    window.MPP_resolveTeenPattiQuestionsFirebaseFirst = async function() {
        const { topicGroups, allOrderedQids } = window.MPP_parseTeenPattiModalInput();
        if (allOrderedQids.length === 0) {
            return { topicGroups: [], resolvedList: [], sourceSummary: 'None' };
        }

        let sourceSummary = 'Firebase Cloud';

        if (typeof window.MPP_getFirebaseFirstBankData === 'function') {
            try {
                const fbRes = await window.MPP_getFirebaseFirstBankData();
                if (fbRes && fbRes.sourceDetail) sourceSummary = fbRes.sourceDetail;
            } catch (e) {}
        }

        const hasPGQids = allOrderedQids.some(id => {
            const ex = typeof window.MPP_inferExamFromQid === 'function' ? window.MPP_inferExamFromQid(id) : 'aiims-profs';
            return ex !== 'aiims-profs';
        });
        if (hasPGQids && window.MPP_state && !window.MPP_state.banksPreloaded && typeof window.MPP_preloadMedPYQBanks === 'function') {
            try {
                await window.MPP_preloadMedPYQBanks();
            } catch (e) {}
        }

        const qidToTopics = {};
        topicGroups.forEach(group => {
            group.qids.forEach(id => {
                const up = id.toUpperCase();
                if (!qidToTopics[up]) qidToTopics[up] = [];
                if (!qidToTopics[up].includes(group.topicTitle)) {
                    qidToTopics[up].push(group.topicTitle);
                }
            });
        });

        const resolvedList = allOrderedQids.map(rawId => {
            const up = rawId.toUpperCase();
            const qObj = typeof window.MPP_resolveQuestionByQid === 'function'
                ? window.MPP_resolveQuestionByQid(rawId)
                : ((window.qnaData || []).find(x => x && String(x.q).trim().toUpperCase() === up) || null);

            const cleanStemHtml = qObj ? (qObj.rawStem || qObj.stem || '') : `Question ${rawId}`;
            const cleanStemText = typeof window.MPP_stripHtml === 'function'
                ? window.MPP_stripHtml(cleanStemHtml)
                : String(cleanStemHtml).replace(/<[^>]+>/g, ' ').trim();

            const isMcq = qObj && (qObj.type === 'MCQ' || (Array.isArray(qObj.options) && qObj.options.length > 0));
            const options = (isMcq && Array.isArray(qObj.options))
                ? qObj.options.map(o => String(o ?? ''))
                : undefined;

            const itemRecord = {
                q: qObj && qObj.q ? String(qObj.q) : rawId,
                type: isMcq ? 'MCQ' : (qObj && qObj.type ? qObj.type : 'Theory'),
                stem: qObj && qObj.stem ? String(qObj.stem) : cleanStemText,
                stemText: cleanStemText,
                ans_key: qObj && qObj.ans_key ? String(qObj.ans_key).trim() : '',
                chapter: qObj && qObj.chapter ? qObj.chapter : 'General',
                examBatch: qObj && qObj.examBatch ? qObj.examBatch : 'Prof Exam'
            };

            if (options) itemRecord.options = options;
            if (qObj && qObj.img) itemRecord.img = qObj.img;

            return itemRecord;
        });

        return { topicGroups, resolvedList, sourceSummary };
    };

    // 3. 777pankaj for Teen Patti: Copy ONLY Questions + Options (Zero Explanations)
    window.MPP_copyTeenPattiForChatGPT = async function(btn) {
        if (!window.isUserAdmin()) return;
        const origHtml = btn ? btn.innerHTML : '';
        if (btn) {
            btn.innerHTML = `⏳ Loading...`;
            btn.disabled = true;
        }

        try {
            const { topicGroups, resolvedList } = await window.MPP_resolveTeenPattiQuestionsFirebaseFirst();
            if (resolvedList.length === 0) {
                alert("No Question IDs found in the Teen Patti linker box.");
                return;
            }

            const byUpper = {};
            resolvedList.forEach(item => { byUpper[String(item.q).trim().toUpperCase()] = item; });

            const promptLines = [];

            topicGroups.forEach(group => {
                if (group.topicTitle && group.topicTitle !== 'Linked Concept') {
                    promptLines.push(`=== ${group.topicTitle.toUpperCase()} ===`);
                }

                group.qids.forEach((qid, idx) => {
                    const item = byUpper[qid.toUpperCase()];
                    if (!item) return;

                    promptLines.push(`${idx + 1}. [${item.q}] ${item.stemText || item.stem}`);

                    if (item.type === 'MCQ' && Array.isArray(item.options) && item.options.length > 0) {
                        item.options.forEach((opt, oIdx) => {
                            const letter = String.fromCharCode(65 + oIdx);
                            const cleanOpt = typeof window.MPP_stripHtml === 'function'
                                ? window.MPP_stripHtml(opt)
                                : String(opt).replace(/<[^>]+>/g, '').trim();
                            promptLines.push(`${letter}) ${cleanOpt}`);
                        });
                    }
                    promptLines.push(``);
                });
            });

            const finalPrompt = promptLines.join('\n').trim();

            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(finalPrompt);
            } else {
                const ta = document.createElement('textarea');
                ta.value = finalPrompt;
                ta.style.position = 'fixed';
                ta.style.left = '-9999px';
                document.body.appendChild(ta);
                ta.focus();
                ta.select();
                document.execCommand('copy');
                document.body.removeChild(ta);
            }

            if (btn) {
                btn.innerHTML = `✅ Copied ${resolvedList.length} Qs + Options!`;
                setTimeout(() => { btn.innerHTML = origHtml; }, 2200);
            }
        } catch (err) {
            alert("Failed to copy questions: " + err.message);
            if (btn) btn.innerHTML = origHtml;
        } finally {
            if (btn) btn.disabled = false;
        }
    };

    // 4. 777calm for Teen Patti: Download ONLY Linked Questions + Options as .JSON (No Explanations)
    window.MPP_downloadTeenPattiJSON = async function(btn) {
        if (!window.isUserAdmin()) return;
        const origHtml = btn ? btn.innerHTML : '';
        if (btn) {
            btn.innerHTML = `⏳ Preparing JSON...`;
            btn.disabled = true;
        }

        try {
            const { topicGroups, resolvedList, sourceSummary } = await window.MPP_resolveTeenPattiQuestionsFirebaseFirst();
            if (resolvedList.length === 0) {
                alert("No Question IDs found in the Teen Patti linker box.");
                return;
            }

            const { college, subjectKey } = typeof window.MPP_getVaultKeys === 'function'
                ? window.MPP_getVaultKeys()
                : { college: 'deoghar', subjectKey: window.SUBJECT_CODE || 'SUBJECT' };

            const cleanQna = resolvedList.map(item => {
                const copy = {
                    q: item.q,
                    type: item.type,
                    stem: item.stem,
                    ...(item.options ? { options: item.options } : {}),
                    ans_key: item.ans_key || "",
                    chapter: item.chapter,
                    examBatch: item.examBatch
                };
                if (item.img) copy.img = item.img;
                return copy;
            });

            const firstTopicSlug = (topicGroups[0] && topicGroups[0].topicTitle)
                ? topicGroups[0].topicTitle.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
                : (window.MPP_editingAnchorQid || 'cluster').toLowerCase();

            const downloadFileName = `${subjectKey.toLowerCase()}_aiims_${college}_teenpatti_${firstTopicSlug}.json`;

            const exportPayload = {
                collegeName: window.COLLEGE_NAME || `AIIMS ${college.toUpperCase()}`,
                subject: subjectKey,
                source: sourceSummary,
                totalQuestions: cleanQna.length,
                qnaData: cleanQna
            };

            const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = downloadFileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 1500);

            if (btn) {
                btn.innerHTML = `✅ Downloaded (${cleanQna.length} Qs)!`;
                setTimeout(() => { btn.innerHTML = origHtml; }, 2200);
            }
        } catch (err) {
            alert("Failed to download JSON: " + err.message);
            if (btn) btn.innerHTML = origHtml;
        } finally {
            if (btn) btn.disabled = false;
        }
    };

    // 5. Inject the 777pankaj Copy & 777calm JSON Download Bar into #mpp-admin-link-modal
    function injectTeenPattiExportButtons() {
        const modal = document.getElementById('mpp-admin-link-modal');
        const saveBtn = document.getElementById('btn-mpp-save-links');
        if (!modal || !saveBtn || document.getElementById('mpp-tp-export-bar')) return;

        const actionRow = saveBtn.parentElement;
        const exportBar = document.createElement('div');
        exportBar.id = 'mpp-tp-export-bar';
        exportBar.className = 'flex gap-2 mb-2.5';
        exportBar.innerHTML = `
            <button type="button" onclick="window.MPP_copyTeenPattiForChatGPT(this)" class="flex-1 py-2 px-3 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 font-extrabold text-[11px] cursor-pointer flex items-center justify-center gap-1.5 transition-all" title="Copy only linked questions and options (no explanations)">
                <span>📋</span> <span>Copy Qs + Options Only</span>
            </button>
            <button type="button" onclick="window.MPP_downloadTeenPattiJSON(this)" class="flex-1 py-2 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/30 font-extrabold text-[11px] cursor-pointer flex items-center justify-center gap-1.5 transition-all" title="Download linked questions + options as JSON (no explanations)">
                <span>📥</span> <span>Download JSON (777calm)</span>
            </button>
        `;
        actionRow.parentNode.insertBefore(exportBar, actionRow);
    }

    // 6. Allow Long-Press (500ms) or Right-Click on Any Teen Patti Fanned Card (.tp-patti) to Open the Linker Modal
    function enableLongPressOnTeenPattiCards() {
        if (window.MPP_tpCardLongPressBound) return;
        window.MPP_tpCardLongPressBound = true;

        let tpPressTimer = null;

        document.addEventListener('touchstart', (e) => {
            if (!window.isUserAdmin()) return;
            const patti = e.target.closest('.tp-patti');
            if (!patti) return;
            const qid = patti.getAttribute('data-qid');
            if (!qid) return;

            clearTimeout(tpPressTimer);
            tpPressTimer = setTimeout(() => {
                window.MPP_longPressTriggered = true;
                if (navigator.vibrate) navigator.vibrate(40);
                if (typeof window.MPP_openAdminLinkModal === 'function') {
                    window.MPP_openAdminLinkModal(qid);
                }
            }, 500);
        }, { passive: true });

        document.addEventListener('touchend', () => clearTimeout(tpPressTimer), { passive: true });
        document.addEventListener('touchmove', () => clearTimeout(tpPressTimer), { passive: true });

        document.addEventListener('contextmenu', (e) => {
            if (!window.isUserAdmin()) return;
            const patti = e.target.closest('.tp-patti');
            if (!patti) return;
            const qid = patti.getAttribute('data-qid');
            if (qid && typeof window.MPP_openAdminLinkModal === 'function') {
                e.preventDefault();
                e.stopPropagation();
                clearTimeout(tpPressTimer);
                window.MPP_openAdminLinkModal(qid);
            }
        }, true);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            injectTeenPattiExportButtons();
            enableLongPressOnTeenPattiCards();
        });
    } else {
        injectTeenPattiExportButtons();
        enableLongPressOnTeenPattiCards();
    }
    setTimeout(() => {
        injectTeenPattiExportButtons();
        enableLongPressOnTeenPattiCards();
    }, 500);
})();
/* ============================================================================
   ADD-ON MODULE FOR OLD app-shell.js
   Rich Text Editor Toolbar + 3-Tab Media Hub (Serper / Wikimedia / GitHub WebP)
   + Highlight & [[gallery:...]] Carousel Renderer
   Paste at the VERY BOTTOM of your old app-shell.js (No HTML edits needed)
   ============================================================================ */
(function () {
    if (window.__MPP_RICH_MEDIA_ADDON_LOADED__) return;
    window.__MPP_RICH_MEDIA_ADDON_LOADED__ = true;

    const CFG_KEY = "mpp_old_mediahub_cfg_v1";
    const ADMIN_EMAILS = [
        "pankajmahto109@gmail.com",
        "educateindiainstitute@gmail.com",
        "pankajkumarmahto1009@gmail.com"
    ];

    // ------------------------------------------------------------------------
    // 1. INJECT SCOPED CSS (Light + Dark Mode + Android Touch Friendly)
    // ------------------------------------------------------------------------
    const style = document.createElement("style");
    style.id = "mpp-rich-addon-css";
    style.textContent = `
        /* Highlight Marks (Visible to Students & Admins) */
        mark.mpp-hl { padding: 0.08em 0.32em; border-radius: 4px; font-weight: 600; color: #0f172a; }
        mark.mpp-hl-yellow { background: #fef08a; }
        mark.mpp-hl-green  { background: #bbf7d0; }
        mark.mpp-hl-pink   { background: #fbcfe8; }
        mark.mpp-hl-blue   { background: #bae6fd; }
        mark.mpp-hl-orange { background: #fed7aa; }
        .dark mark.mpp-hl-yellow { background: rgba(250, 204, 21, 0.32); color: #fef9c3; }
        .dark mark.mpp-hl-green  { background: rgba(34, 197, 94, 0.30);  color: #dcfce7; }
        .dark mark.mpp-hl-pink   { background: rgba(236, 72, 153, 0.30); color: #fce7f3; }
        .dark mark.mpp-hl-blue   { background: rgba(56, 189, 248, 0.30); color: #e0f2fe; }
        .dark mark.mpp-hl-orange { background: rgba(249, 115, 22, 0.32); color: #ffedd5; }

        /* [[gallery:...]] Carousel Widget */
        .mpp-gal-box { margin: 12px 0; border-radius: 12px; border: 1px solid #cbd5e1; background: #f8fafc; overflow: hidden; }
        .dark .mpp-gal-box { border-color: #334155; background: #0f172a; }
        .mpp-gal-stage { position: relative; background: #020617; min-height: 220px; display: flex; align-items: center; justify-content: center; overflow: hidden; }
        .mpp-gal-stage img { max-height: 360px; max-width: 100%; object-fit: contain; cursor: zoom-in; display: block; margin: 0 auto; }
        .mpp-gal-nav { position: absolute; top: 50%; transform: translateY(-50%); width: 34px; height: 34px; border-radius: 999px; border: none; background: rgba(15,23,42,0.75); color: #fff; font-size: 18px; font-weight: 800; cursor: pointer; display: flex; align-items: center; justify-content: center; }
        .mpp-gal-prev { left: 8px; }
        .mpp-gal-next { right: 8px; }
        .mpp-gal-cap { padding: 8px 12px; font-size: 12px; font-weight: 600; color: #334155; display: flex; align-items: center; justify-content: space-between; gap: 8px; border-top: 1px solid #e2e8f0; }
        .dark .mpp-gal-cap { color: #cbd5e1; border-color: #1e293b; }
        .mpp-gal-thumbs { display: flex; gap: 6px; padding: 8px; overflow-x: auto; background: #f1f5f9; }
        .dark .mpp-gal-thumbs { background: #1e293b; }
        .mpp-gal-thumbs img { width: 52px; height: 40px; object-fit: cover; border-radius: 6px; cursor: pointer; opacity: 0.6; border: 2px solid transparent; flex-shrink: 0; }
        .mpp-gal-thumbs img.active { opacity: 1; border-color: #0284c7; }

        /* Admin Rich Formatting Toolbar */
        .mpp-rt-bar { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; padding: 6px 8px; margin-bottom: 6px; border-radius: 10px; border: 1px solid #cbd5e1; background: #f8fafc; font-family: system-ui, sans-serif; }
        .dark .mpp-rt-bar { border-color: #334155; background: #1e293b; }
        .mpp-rt-btn { display: inline-flex; align-items: center; justify-content: center; gap: 3px; padding: 4px 8px; border-radius: 7px; border: 1px solid #cbd5e1; background: #ffffff; color: #0f172a; font-size: 11px; font-weight: 700; cursor: pointer; line-height: 1.2; transition: background 0.15s; }
        .dark .mpp-rt-btn { border-color: #475569; background: #0f172a; color: #e2e8f0; }
        .mpp-rt-btn:hover { background: #e0f2fe; border-color: #0284c7; }
        .dark .mpp-rt-btn:hover { background: #0c4a6e; border-color: #38bdf8; }
        .mpp-rt-btn.primary { background: #0284c7; border-color: #0284c7; color: #fff; }
        .mpp-rt-btn.primary:hover { background: #0369a1; }
        .mpp-rt-btn.active { background: #7c3aed; border-color: #7c3aed; color: #fff; }
        .mpp-rt-sep { width: 1px; height: 18px; background: #cbd5e1; margin: 0 2px; }
        .dark .mpp-rt-sep { background: #475569; }
        .mpp-rt-swatch { width: 14px; height: 14px; border-radius: 4px; display: inline-block; border: 1px solid rgba(0,0,0,0.2); }
        .mpp-rt-preview { display: none; padding: 12px; margin-bottom: 6px; border-radius: 10px; border: 1px solid #94a3b8; background: #fff; color: #0f172a; max-height: 320px; overflow-y: auto; font-size: 13px; line-height: 1.6; }
        .dark .mpp-rt-preview { background: #0f172a; color: #e2e8f0; border-color: #475569; }
        .mpp-rt-preview img { max-width: 100%; border-radius: 8px; margin: 6px 0; }
        .mpp-rt-preview table { width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 12px; }
        .mpp-rt-preview th, .mpp-rt-preview td { border: 1px solid #cbd5e1; padding: 5px 8px; }
        .dark .mpp-rt-preview th, .dark .mpp-rt-preview td { border-color: #334155; }

        /* Media Hub Modal */
        #mpp-mh-backdrop { position: fixed; inset: 0; z-index: 99990; background: rgba(2, 6, 23, 0.78); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; padding: 12px; font-family: system-ui, sans-serif; }
        #mpp-mh-card { width: 100%; max-width: 920px; max-height: 90vh; background: #fff; color: #0f172a; border-radius: 16px; border: 1px solid #cbd5e1; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.45); }
        .dark #mpp-mh-card { background: #0f172a; color: #f1f5f9; border-color: #334155; }
        .mpp-mh-head { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-bottom: 1px solid #e2e8f0; }
        .dark .mpp-mh-head { border-color: #1e293b; }
        .mpp-mh-tabs { display: flex; flex-wrap: wrap; gap: 6px; padding: 10px 16px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; }
        .dark .mpp-mh-tabs { background: #1e293b; border-color: #334155; }
        .mpp-mh-tab { padding: 7px 12px; border-radius: 9px; border: 1px solid #cbd5e1; background: #fff; color: #334155; font-size: 12px; font-weight: 700; cursor: pointer; }
        .dark .mpp-mh-tab { background: #0f172a; border-color: #475569; color: #cbd5e1; }
        .mpp-mh-tab.active { background: #0284c7; border-color: #0284c7; color: #fff; }
        .mpp-mh-body { flex: 1; overflow-y: auto; padding: 14px 16px; }
        .mpp-mh-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(155px, 1fr)); gap: 10px; margin-top: 12px; }
        .mpp-mh-item { border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; background: #f8fafc; display: flex; flex-direction: column; }
        .dark .mpp-mh-item { border-color: #334155; background: #1e293b; }
        .mpp-mh-thumb { height: 118px; background: #020617; display: flex; align-items: center; justify-content: center; overflow: hidden; position: relative; }
        .mpp-mh-thumb img { width: 100%; height: 100%; object-fit: cover; cursor: zoom-in; }
        .mpp-mh-dim { position: absolute; bottom: 4px; right: 4px; background: rgba(0,0,0,0.75); color: #fff; font-size: 9px; font-weight: 700; padding: 2px 5px; border-radius: 4px; }
        .mpp-mh-meta { padding: 7px; display: flex; flex-direction: column; gap: 5px; flex: 1; }
        .mpp-mh-title { font-size: 11px; font-weight: 600; line-height: 1.25; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
        .mpp-mh-actions { display: flex; gap: 4px; margin-top: auto; flex-wrap: wrap; }
        .mpp-mh-btn { flex: 1; padding: 5px 6px; border-radius: 6px; border: none; font-size: 10px; font-weight: 800; cursor: pointer; text-align: center; }
        .mpp-mh-btn.ins { background: #0284c7; color: #fff; }
        .mpp-mh-btn.gh  { background: #059669; color: #fff; }
        .mpp-mh-btn.gal { background: #7c3aed; color: #fff; }
        .mpp-mh-basket { padding: 10px 16px; border-top: 1px solid #e2e8f0; background: #f8fafc; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px; }
        .dark .mpp-mh-basket { background: #1e293b; border-color: #334155; }
        .mpp-mh-input { padding: 8px 11px; border-radius: 9px; border: 1px solid #cbd5e1; background: #fff; color: #0f172a; font-size: 13px; }
        .dark .mpp-mh-input { background: #020617; border-color: #475569; color: #f1f5f9; }
        .mpp-mh-drop { border: 2px dashed #38bdf8; border-radius: 12px; padding: 24px 14px; text-align: center; cursor: pointer; background: rgba(14,165,233,0.06); }
        #mpp-mh-lightbox { position: fixed; inset: 0; z-index: 99999; background: rgba(0,0,0,0.94); display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 16px; }
    `;
    document.head.appendChild(style);

    // ------------------------------------------------------------------------
    // 2. HELPERS: CONFIG, ESCAPE, TOAST, LIGHTBOX & TEXTAREA INSERTION
    // ------------------------------------------------------------------------
    function esc(s) {
        return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    }

    function loadCfg() {
        try {
            return Object.assign({
                serperKey: "",
                ghOwner: "",
                ghRepo: "",
                ghBranch: "main",
                ghFolder: "assets/media",
                ghToken: "",
                urlMode: "jsdelivr" // "jsdelivr" | "raw"
            }, JSON.parse(localStorage.getItem(CFG_KEY) || "{}"));
        } catch (_) {
            return { serperKey: "", ghOwner: "", ghRepo: "", ghBranch: "main", ghFolder: "assets/media", ghToken: "", urlMode: "jsdelivr" };
        }
    }

    function saveCfg(patch) {
        const next = Object.assign(loadCfg(), patch);
        localStorage.setItem(CFG_KEY, JSON.stringify(next));
        return next;
    }

    function toast(msg, bg = "#0f172a") {
        const el = document.createElement("div");
        el.textContent = msg;
        el.style.cssText = `position:fixed;bottom:18px;left:50%;transform:translateX(-50%);z-index:999999;background:${bg};color:#fff;padding:9px 16px;border-radius:10px;font:700 12px system-ui,sans-serif;box-shadow:0 10px 25px rgba(0,0,0,0.35);max-width:90vw;text-align:center;`;
        document.body.appendChild(el);
        setTimeout(() => { el.style.opacity = "0"; el.style.transition = "opacity .25s"; setTimeout(() => el.remove(), 260); }, 2600);
    }

    function openLightbox(url, caption) {
        document.getElementById("mpp-mh-lightbox")?.remove();
        const box = document.createElement("div");
        box.id = "mpp-mh-lightbox";
        box.innerHTML = `
            <button type="button" style="position:absolute;top:14px;right:14px;width:38px;height:38px;border-radius:999px;border:none;background:rgba(255,255,255,0.18);color:#fff;font-size:22px;cursor:pointer;">&times;</button>
            <img src="${esc(url)}" style="max-width:95vw;max-height:82vh;object-fit:contain;border-radius:10px;" />
            ${caption ? `<div style="margin-top:10px;color:#e2e8f0;font:600 13px system-ui;text-align:center;max-width:680px;">${esc(caption)}</div>` : ""}
        `;
        box.addEventListener("click", (e) => { if (e.target === box || e.target.tagName === "BUTTON") box.remove(); });
        document.body.appendChild(box);
    }

    function insertAtCursor(ta, before, after = "", placeholder = "") {
        if (!ta) return;
        ta.focus();
        const start = ta.selectionStart ?? ta.value.length;
        const end = ta.selectionEnd ?? ta.value.length;
        const sel = ta.value.slice(start, end) || placeholder;
        const replacement = before + sel + after;
        ta.value = ta.value.slice(0, start) + replacement + ta.value.slice(end);
        const caretStart = start + before.length;
        const caretEnd = caretStart + sel.length;
        ta.setSelectionRange(caretStart, caretEnd);
        ta.dispatchEvent(new Event("input", { bubbles: true }));
        ta.dispatchEvent(new Event("change", { bubbles: true }));
    }

    function isLikelyAdmin() {
        if (window.isAdmin === true || window.MPP_isAdmin === true) return true;
        const email = (
            window.currentUser?.email ||
            window.auth?.currentUser?.email ||
            window.firebase?.auth?.()?.currentUser?.email ||
            ""
        ).toLowerCase().trim();
        if (email && ADMIN_EMAILS.includes(email)) return true;

        const adminEl = document.getElementById("admin-controls") || document.querySelector("[data-admin-only], .admin-only");
        if (adminEl && !adminEl.classList.contains("hidden") && adminEl.offsetParent !== null) return true;
        return false;
    }

    function isEligibleEditorTextarea(ta) {
        if (!ta || ta.tagName !== "TEXTAREA") return false;
        if (ta.dataset.mppRichAttached === "1" || ta.readOnly || ta.disabled) return false;
        if (ta.closest("#mpp-mh-backdrop, #reportModal, #mpp-report-modal, #authModal, #profileModal, .no-rich-toolbar")) return false;

        const sig = `${ta.id} ${ta.name} ${ta.className} ${ta.placeholder}`.toLowerCase();
        if (/report|feedback|reason|search|filter|crosslink|cluster|json|anki/.test(sig)) return false;

        // Match known admin answer/stem/explanation textareas in old pages, or any textarea when admin is logged in
        if (/answer|explanation|stem|markdown|editor|content|notes|clinical|model/.test(sig)) return true;
        return isLikelyAdmin();
    }

    // ------------------------------------------------------------------------
    // 3. RICH RENDERER: ==HIGHLIGHTS== & [[gallery:...]] FOR STUDENTS & ADMINS
    // ------------------------------------------------------------------------
    function parseMiniMarkdownForPreview(text) {
        let html = String(text || "");
        if (window.marked && typeof window.marked.parse === "function") {
            html = window.marked.parse(html);
        } else {
            html = esc(html)
                .replace(/^###\s+(.+)$/gm, "<h4 style='font-weight:800;margin:8px 0 4px;'>$1</h4>")
                .replace(/^##\s+(.+)$/gm, "<h3 style='font-weight:800;font-size:15px;margin:10px 0 4px;'>$1</h3>")
                .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
                .replace(/\*(.+?)\*/g, "<em>$1</em>")
                .replace(/~~(.+?)~~/g, "<del>$1</del>")
                .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />')
                .replace(/\n/g, "<br>");
        }
        return html;
    }

    function buildGalleryDOM(rawSpec) {
        // Strip <a href="..."> auto-links that old marked.js may have injected inside [[gallery:...]]
        const cleaned = rawSpec
            .replace(/<a\b[^>]*href="([^"]+)"[^>]*>[\s\S]*?<\/a>/gi, "$1")
            .replace(/<[^>]+>/g, "")
            .trim();

        const items = cleaned.split(";;").map(part => {
            const [u, ...capParts] = part.split("|");
            return { url: (u || "").trim(), caption: capParts.join("|").trim() };
        }).filter(x => /^https?:\/\//i.test(x.url));

        if (!items.length) return null;

        let idx = 0;
        const box = document.createElement("div");
        box.className = "mpp-gal-box";
        box.dataset.mppGalleryMounted = "1";

        const render = () => {
            const cur = items[idx];
            box.innerHTML = `
                <div class="mpp-gal-stage">
                    ${items.length > 1 ? `<button type="button" class="mpp-gal-nav mpp-gal-prev" aria-label="Previous">&lsaquo;</button>` : ""}
                    <img src="${esc(cur.url)}" alt="${esc(cur.caption || "Figure")}" loading="lazy" />
                    ${items.length > 1 ? `<button type="button" class="mpp-gal-nav mpp-gal-next" aria-label="Next">&rsaquo;</button>` : ""}
                </div>
                <div class="mpp-gal-cap">
                    <span>${esc(cur.caption || `Image ${idx + 1}`)}</span>
                    <span style="opacity:.65;flex-shrink:0;">${idx + 1} / ${items.length}</span>
                </div>
                ${items.length > 1 ? `
                    <div class="mpp-gal-thumbs">
                        ${items.map((it, i) => `<img src="${esc(it.url)}" class="${i === idx ? "active" : ""}" data-gi="${i}" loading="lazy" />`).join("")}
                    </div>
                ` : ""}
            `;
            box.querySelector(".mpp-gal-stage img")?.addEventListener("click", () => openLightbox(cur.url, cur.caption));
            box.querySelector(".mpp-gal-prev")?.addEventListener("click", () => { idx = (idx - 1 + items.length) % items.length; render(); });
            box.querySelector(".mpp-gal-next")?.addEventListener("click", () => { idx = (idx + 1) % items.length; render(); });
            box.querySelectorAll("[data-gi]").forEach(t => t.addEventListener("click", () => { idx = Number(t.dataset.gi); render(); }));
        };

        render();
        return box;
    }

    function enhanceRenderedElement(root) {
        if (!root || root.nodeType !== 1) return;
        if (root.closest?.("#mpp-mh-backdrop, .mpp-rt-bar, script, style, textarea")) return;

        // A. Upgrade [[gallery:...]] blocks
        if (root.innerHTML && root.innerHTML.includes("[[gallery:")) {
            const candidates = root.querySelectorAll("p, div, li, td, section, article");
            const targets = candidates.length ? [...candidates, root] : [root];
            targets.forEach(el => {
                if (el.dataset.mppGalleryMounted || el.querySelector("textarea, input, .mpp-gal-box")) return;
                if (!el.innerHTML.includes("[[gallery:")) return;
                // Only process the innermost element containing the tag
                if ([...el.children].some(ch => ch.innerHTML && ch.innerHTML.includes("[[gallery:"))) return;

                const match = el.innerHTML.match(/\[\[gallery:([\s\S]*?)\]\]/);
                if (!match) return;
                const gal = buildGalleryDOM(match[1]);
                if (!gal) return;

                const remainder = el.innerHTML.replace(match[0], "").trim();
                if (!remainder || remainder === "<br>") {
                    el.innerHTML = "";
                    el.appendChild(gal);
                } else {
                    el.innerHTML = remainder;
                    el.appendChild(gal);
                }
            });
        }

        // B. Upgrade ==highlight== and ==color:highlight== safely via Text Nodes only
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
            acceptNode(node) {
                if (!node.nodeValue || !node.nodeValue.includes("==")) return NodeFilter.FILTER_REJECT;
                const p = node.parentElement;
                if (!p) return NodeFilter.FILTER_REJECT;
                if (/^(SCRIPT|STYLE|TEXTAREA|INPUT|CODE|PRE|MARK)$/.test(p.tagName)) return NodeFilter.FILTER_REJECT;
                if (p.closest(".katex, .mpp-rt-bar, #mpp-mh-backdrop")) return NodeFilter.FILTER_REJECT;
                return NodeFilter.FILTER_ACCEPT;
            }
        });

        const textNodes = [];
        let n;
        while ((n = walker.nextNode())) textNodes.push(n);

        const hlRegex = /==(yellow|green|pink|blue|orange)?:([^=\n][^=\n]*?)==|==([^=\n][^=\n]*?)==/gi;
        textNodes.forEach(tn => {
            const val = tn.nodeValue;
            if (!hlRegex.test(val)) return;
            hlRegex.lastIndex = 0;

            const frag = document.createDocumentFragment();
            let last = 0, m;
            while ((m = hlRegex.exec(val)) !== null) {
                if (m.index > last) frag.appendChild(document.createTextNode(val.slice(last, m.index)));
                const color = (m[1] || "yellow").toLowerCase();
                const content = m[2] !== undefined ? m[2] : m[3];
                const mark = document.createElement("mark");
                mark.className = `mpp-hl mpp-hl-${color}`;
                mark.textContent = content;
                frag.appendChild(mark);
                last = m.index + m[0].length;
            }
            if (last < val.length) frag.appendChild(document.createTextNode(val.slice(last)));
            tn.parentNode.replaceChild(frag, tn);
        });
    }

    // ------------------------------------------------------------------------
    // 4. ADMIN TEXT EDITOR TOOLBAR (Auto-attaches above Admin Textareas)
    // ------------------------------------------------------------------------
    function attachToolbarToTextarea(ta) {
        if (!isEligibleEditorTextarea(ta)) return;
        ta.dataset.mppRichAttached = "1";

        const bar = document.createElement("div");
        bar.className = "mpp-rt-bar";
        bar.innerHTML = `
            <button type="button" class="mpp-rt-btn" data-act="bold" title="Bold (Ctrl+B)"><b>B</b></button>
            <button type="button" class="mpp-rt-btn" data-act="italic" title="Italic (Ctrl+I)"><i>I</i></button>
            <button type="button" class="mpp-rt-btn" data-act="underline" title="Underline"><u>U</u></button>
            <button type="button" class="mpp-rt-btn" data-act="strike" title="Strikethrough"><s>S</s></button>
            <span class="mpp-rt-sep"></span>
            <button type="button" class="mpp-rt-btn" data-hl="yellow" title="Yellow Highlight (Ctrl+H)"><span class="mpp-rt-swatch" style="background:#fef08a;"></span></button>
            <button type="button" class="mpp-rt-btn" data-hl="green" title="Green Highlight"><span class="mpp-rt-swatch" style="background:#bbf7d0;"></span></button>
            <button type="button" class="mpp-rt-btn" data-hl="pink" title="Pink Highlight"><span class="mpp-rt-swatch" style="background:#fbcfe8;"></span></button>
            <button type="button" class="mpp-rt-btn" data-hl="blue" title="Blue Highlight"><span class="mpp-rt-swatch" style="background:#bae6fd;"></span></button>
            <button type="button" class="mpp-rt-btn" data-hl="orange" title="Orange Highlight"><span class="mpp-rt-swatch" style="background:#fed7aa;"></span></button>
            <span class="mpp-rt-sep"></span>
            <button type="button" class="mpp-rt-btn" data-color="#dc2626" title="Red Text" style="color:#dc2626;">A</button>
            <button type="button" class="mpp-rt-btn" data-color="#2563eb" title="Blue Text" style="color:#2563eb;">A</button>
            <button type="button" class="mpp-rt-btn" data-color="#059669" title="Green Text" style="color:#059669;">A</button>
            <span class="mpp-rt-sep"></span>
            <button type="button" class="mpp-rt-btn" data-act="h3" title="Heading">H3</button>
            <button type="button" class="mpp-rt-btn" data-act="bullet" title="Bullet List">&bull; List</button>
            <button type="button" class="mpp-rt-btn" data-act="callout" title="High-Yield Callout Box">💡 Box</button>
            <button type="button" class="mpp-rt-btn" data-act="table" title="Insert 2-Column Table">⊞ Table</button>
            <span class="mpp-rt-sep"></span>
            <button type="button" class="mpp-rt-btn primary" data-act="media" title="Search & Upload Images / Galleries">🖼️ Media</button>
            <button type="button" class="mpp-rt-btn" data-act="preview" title="Toggle Live Preview">👁️ Preview</button>
        `;

        const preview = document.createElement("div");
        preview.className = "mpp-rt-preview";

        ta.parentNode.insertBefore(bar, ta);
        ta.parentNode.insertBefore(preview, ta);

        const updatePreview = () => {
            preview.innerHTML = parseMiniMarkdownForPreview(ta.value);
            enhanceRenderedElement(preview);
            if (typeof window.renderMathInElement === "function") {
                try { window.renderMathInElement(preview, { throwOnError: false }); } catch (_) {}
            }
        };

        bar.addEventListener("click", (e) => {
            const btn = e.target.closest("button");
            if (!btn) return;
            e.preventDefault();

            if (btn.dataset.hl) {
                const c = btn.dataset.hl;
                insertAtCursor(ta, c === "yellow" ? "==" : `==${c}:`, "==", "highlighted point");
                return;
            }
            if (btn.dataset.color) {
                insertAtCursor(ta, `<span style="color:${btn.dataset.color};font-weight:700;">`, "</span>", "colored text");
                return;
            }

            switch (btn.dataset.act) {
                case "bold":      insertAtCursor(ta, "**", "**", "bold text"); break;
                case "italic":    insertAtCursor(ta, "*", "*", "italic text"); break;
                case "underline": insertAtCursor(ta, "<u>", "</u>", "underlined text"); break;
                case "strike":    insertAtCursor(ta, "~~", "~~", "struck text"); break;
                case "h3":        insertAtCursor(ta, "\n### ", "\n", "Heading"); break;
                case "bullet":    insertAtCursor(ta, "\n- ", "", "Key point"); break;
                case "callout":   insertAtCursor(ta, "\n> **High-Yield Pearl:** ", "\n", "Important exam point"); break;
                case "table":     insertAtCursor(ta, "\n| Feature | Condition A | Condition B |\n| :--- | :--- | :--- |\n| Key Point | Detail 1 | Detail 2 |\n", ""); break;
                case "media":     openMediaHub(ta); break;
                case "preview": {
                    const showing = preview.style.display === "block";
                    if (showing) {
                        preview.style.display = "none";
                        ta.style.display = "";
                        btn.classList.remove("active");
                    } else {
                        updatePreview();
                        preview.style.display = "block";
                        ta.style.display = "none";
                        btn.classList.add("active");
                    }
                    break;
                }
            }
        });

        // Keyboard shortcuts: Ctrl+B, Ctrl+I, Ctrl+H
        ta.addEventListener("keydown", (e) => {
            if (!(e.ctrlKey || e.metaKey)) return;
            const k = e.key.toLowerCase();
            if (k === "b") { e.preventDefault(); insertAtCursor(ta, "**", "**", "bold"); }
            else if (k === "i") { e.preventDefault(); insertAtCursor(ta, "*", "*", "italic"); }
            else if (k === "h") { e.preventDefault(); insertAtCursor(ta, "==", "==", "highlight"); }
        });
    }

    // ------------------------------------------------------------------------
    // 5. 3-TAB MEDIA HUB (Serper Google + Wikimedia + GitHub WebP Uploader)
    // ------------------------------------------------------------------------
    let activeTargetTextarea = null;
    let galleryBasket = [];

    function buildGitHubUrl(cfg, path) {
        const cleanPath = path.replace(/^\/+/, "");
        if (cfg.urlMode === "raw") {
            return `https://raw.githubusercontent.com/${cfg.ghOwner}/${cfg.ghRepo}/${cfg.ghBranch}/${cleanPath}`;
        }
        return `https://cdn.jsdelivr.net/gh/${cfg.ghOwner}/${cfg.ghRepo}@${cfg.ghBranch}/${cleanPath}`;
    }

    async function compressBlobToWebP(blob, maxDim = 1400, quality = 0.82) {
        const imgUrl = URL.createObjectURL(blob);
        try {
            const img = await new Promise((res, rej) => {
                const el = new Image();
                el.onload = () => res(el);
                el.onerror = rej;
                el.src = imgUrl;
            });
            let w = img.naturalWidth, h = img.naturalHeight;
            if (w > maxDim || h > maxDim) {
                const ratio = Math.min(maxDim / w, maxDim / h);
                w = Math.round(w * ratio);
                h = Math.round(h * ratio);
            }
            const canvas = document.createElement("canvas");
            canvas.width = w; canvas.height = h;
            canvas.getContext("2d").drawImage(img, 0, 0, w, h);

            const webpBlob = await new Promise(res => canvas.toBlob(res, "image/webp", quality));
            const finalBlob = webpBlob || blob;
            const dataUrl = await new Promise((res, rej) => {
                const fr = new FileReader();
                fr.onload = () => res(fr.result);
                fr.onerror = rej;
                fr.readAsDataURL(finalBlob);
            });
            return {
                base64: String(dataUrl).split(",")[1],
                ext: webpBlob ? "webp" : "jpg",
                sizeKB: Math.round(finalBlob.size / 1024),
                dims: `${w}x${h}`
            };
        } finally {
            URL.revokeObjectURL(imgUrl);
        }
    }

    async function uploadBlobToGitHub(blob, baseName = "med_img") {
        const cfg = loadCfg();
        if (!cfg.ghToken || !cfg.ghOwner || !cfg.ghRepo) {
            throw new Error("Configure GitHub Owner, Repo & Token in the ⚙️ Setup tab first.");
        }
        const comp = await compressBlobToWebP(blob);
        const safeName = baseName.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 36) || "med";
        const folder = (cfg.ghFolder || "assets/media").replace(/^\/+|\/+$/g, "");
        const filePath = `${folder}/${safeName}_${Date.now()}.${comp.ext}`;

        const resp = await fetch(`https://api.github.com/repos/${cfg.ghOwner}/${cfg.ghRepo}/contents/${filePath}`, {
            method: "PUT",
            headers: {
                "Authorization": `Bearer ${cfg.ghToken}`,
                "Accept": "application/vnd.github+json",
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                message: `Upload ${filePath} via MBBS Profs Prep Media Hub`,
                content: comp.base64,
                branch: cfg.ghBranch || "main"
            })
        });
        if (!resp.ok) {
            const err = await resp.json().catch(() => ({}));
            throw new Error(err.message || `GitHub upload failed (${resp.status})`);
        }
        return { url: buildGitHubUrl(cfg, filePath), sizeKB: comp.sizeKB, dims: comp.dims };
    }

    async function searchSerper(query) {
        const cfg = loadCfg();
        if (!cfg.serperKey) throw new Error("Add your Serper API key in the ⚙️ Setup tab (or use the free Wikimedia tab).");
        const res = await fetch("https://google.serper.dev/images", {
            method: "POST",
            headers: { "X-API-KEY": cfg.serperKey, "Content-Type": "application/json" },
            body: JSON.stringify({ q: query, num: 20 })
        });
        if (!res.ok) throw new Error(`Serper search error (${res.status})`);
        const data = await res.json();
        return (data.images || []).map(x => ({
            title: x.title || "Medical Image",
            url: x.imageUrl,
            thumb: x.thumbnailUrl || x.imageUrl,
            dim: x.imageWidth && x.imageHeight ? `${x.imageWidth}x${x.imageHeight}` : ""
        })).filter(x => x.url);
    }

    async function searchWikimedia(query) {
        const endpoint = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrlimit=20&gsrsearch=${encodeURIComponent(query)}&prop=imageinfo&iiprop=url|size|mime&iiurlwidth=400&format=json&origin=*`;
        const res = await fetch(endpoint);
        if (!res.ok) throw new Error("Wikimedia request failed.");
        const data = await res.json();
        const pages = Object.values(data?.query?.pages || {});
        return pages.map(p => {
            const info = p.imageinfo?.[0];
            if (!info || !/^image\/(jpeg|png|webp|gif|svg)/i.test(info.mime || "")) return null;
            return {
                title: (p.title || "").replace(/^File:/i, "").replace(/\.[^.]+$/, ""),
                url: info.url,
                thumb: info.thumburl || info.url,
                dim: info.width && info.height ? `${info.width}x${info.height}` : ""
            };
        }).filter(Boolean);
    }

    async function listGitHubAssets() {
        const cfg = loadCfg();
        if (!cfg.ghOwner || !cfg.ghRepo) throw new Error("Set GitHub Owner & Repo in ⚙️ Setup first.");
        const folder = (cfg.ghFolder || "assets/media").replace(/^\/+|\/+$/g, "");
        const headers = { "Accept": "application/vnd.github+json" };
        if (cfg.ghToken) headers["Authorization"] = `Bearer ${cfg.ghToken}`;
        const res = await fetch(`https://api.github.com/repos/${cfg.ghOwner}/${cfg.ghRepo}/contents/${folder}?ref=${encodeURIComponent(cfg.ghBranch || "main")}`, { headers });
        if (!res.ok) throw new Error(`Could not list folder "${folder}" (${res.status}).`);
        const arr = await res.json();
        if (!Array.isArray(arr)) return [];
        return arr
            .filter(f => f.type === "file" && /\.(webp|png|jpe?g|gif|svg)$/i.test(f.name))
            .reverse()
            .slice(0, 40)
            .map(f => ({
                title: f.name,
                url: buildGitHubUrl(cfg, f.path),
                thumb: buildGitHubUrl(cfg, f.path),
                dim: `${Math.round((f.size || 0) / 1024)} KB`
            }));
    }

    function openMediaHub(targetTextarea = null) {
        activeTargetTextarea = targetTextarea;
        galleryBasket = [];
        document.getElementById("mpp-mh-backdrop")?.remove();

        let currentTab = "wiki"; // Defaults to free Wikimedia so it works out of the box; switchable to Google/Upload/Setup
        if (loadCfg().serperKey) currentTab = "serper";

        const backdrop = document.createElement("div");
        backdrop.id = "mpp-mh-backdrop";
        backdrop.innerHTML = `
            <div id="mpp-mh-card">
                <div class="mpp-mh-head">
                    <div>
                        <div style="font-size:16px;font-weight:800;">🖼️ Medical Media Hub</div>
                        <div style="font-size:11px;opacity:.7;">Search Google / Wikimedia or upload compressed WebP to GitHub CDN</div>
                    </div>
                    <button type="button" id="mpp-mh-close" style="border:none;background:transparent;color:inherit;font-size:24px;cursor:pointer;line-height:1;">&times;</button>
                </div>
                <div class="mpp-mh-tabs">
                    <button type="button" class="mpp-mh-tab" data-tab="serper">🌐 Google Images</button>
                    <button type="button" class="mpp-mh-tab" data-tab="wiki">📚 Wikimedia (Free)</button>
                    <button type="button" class="mpp-mh-tab" data-tab="upload">☁️ Upload / Repo</button>
                    <button type="button" class="mpp-mh-tab" data-tab="setup">⚙️ Setup</button>
                </div>
                <div class="mpp-mh-body" id="mpp-mh-body"></div>
                <div class="mpp-mh-basket" id="mpp-mh-basket"></div>
            </div>
        `;
        document.body.appendChild(backdrop);

        const bodyEl = backdrop.querySelector("#mpp-mh-body");
        const basketEl = backdrop.querySelector("#mpp-mh-basket");

        const closeHub = () => backdrop.remove();
        backdrop.querySelector("#mpp-mh-close").addEventListener("click", closeHub);
        backdrop.addEventListener("click", (e) => { if (e.target === backdrop) closeHub(); });

        const insertMarkdown = (md) => {
            if (activeTargetTextarea) {
                insertAtCursor(activeTargetTextarea, `\n${md}\n`, "");
                toast("Inserted into editor!", "#059669");
                closeHub();
            } else {
                navigator.clipboard?.writeText(md);
                toast("Copied Markdown to clipboard!", "#0284c7");
            }
        };

        const renderBasket = () => {
            if (!galleryBasket.length) {
                basketEl.innerHTML = `<span style="font-size:11px;opacity:.7;">Tip: Click <b>+ Gallery</b> on 2+ images to insert a swipeable carousel.</span>`;
                return;
            }
            basketEl.innerHTML = `
                <div style="font-size:12px;font-weight:700;">🎞️ Gallery Basket: ${galleryBasket.length} image(s)</div>
                <div style="display:flex;gap:6px;">
                    <button type="button" id="mh-clear-gal" class="mpp-rt-btn">Clear</button>
                    <button type="button" id="mh-ins-gal" class="mpp-rt-btn primary">Insert Carousel [[gallery:...]]</button>
                </div>
            `;
            basketEl.querySelector("#mh-clear-gal").addEventListener("click", () => { galleryBasket = []; renderBasket(); });
            basketEl.querySelector("#mh-ins-gal").addEventListener("click", () => {
                const spec = galleryBasket.map(x => `${x.url}|${(x.caption || "").replace(/[|;]/g, " ").slice(0, 60)}`).join(";;");
                insertMarkdown(`[[gallery:${spec}]]`);
            });
        };

        const renderGridResults = (container, items, allowClone = false) => {
            if (!items.length) {
                container.innerHTML = `<div style="text-align:center;padding:30px;opacity:.65;font-size:13px;">No images found. Try a broader medical keyword.</div>`;
                return;
            }
            container.innerHTML = `<div class="mpp-mh-grid">${items.map((it, i) => `
                <div class="mpp-mh-item">
                    <div class="mpp-mh-thumb">
                        <img src="${esc(it.thumb)}" alt="${esc(it.title)}" loading="lazy" data-lb="${i}" />
                        ${it.dim ? `<span class="mpp-mh-dim">${esc(it.dim)}</span>` : ""}
                    </div>
                    <div class="mpp-mh-meta">
                        <div class="mpp-mh-title" title="${esc(it.title)}">${esc(it.title)}</div>
                        <div class="mpp-mh-actions">
                            <button type="button" class="mpp-mh-btn ins" data-ins="${i}">Insert</button>
                            ${allowClone ? `<button type="button" class="mpp-mh-btn gh" data-clone="${i}" title="Save WebP to your GitHub">☁️ Save</button>` : ""}
                            <button type="button" class="mpp-mh-btn gal" data-gal="${i}">+ Gal</button>
                        </div>
                    </div>
                </div>
            `).join("")}</div>`;

            container.querySelectorAll("[data-lb]").forEach(el => {
                el.addEventListener("click", () => { const it = items[Number(el.dataset.lb)]; openLightbox(it.url, it.title); });
            });
            container.querySelectorAll("[data-ins]").forEach(el => {
                el.addEventListener("click", () => {
                    const it = items[Number(el.dataset.ins)];
                    insertMarkdown(`![${it.title.replace(/[\[\]]/g, "").slice(0, 70)}](${it.url})`);
                });
            });
            container.querySelectorAll("[data-gal]").forEach(el => {
                el.addEventListener("click", () => {
                    const it = items[Number(el.dataset.gal)];
                    galleryBasket.push({ url: it.url, caption: it.title });
                    renderBasket();
                    toast(`Added to Gallery (${galleryBasket.length})`, "#7c3aed");
                });
            });
            container.querySelectorAll("[data-clone]").forEach(el => {
                el.addEventListener("click", async () => {
                    const it = items[Number(el.dataset.clone)];
                    el.disabled = true; el.textContent = "...";
                    try {
                        const r = await fetch(it.url);
                        if (!r.ok) throw new Error("Blocked by remote server");
                        const blob = await r.blob();
                        const up = await uploadBlobToGitHub(blob, it.title);
                        insertMarkdown(`![${it.title.replace(/[\[\]]/g, "").slice(0, 70)}](${up.url})`);
                    } catch (err) {
                        toast(`Clone blocked (${err.message}). Use Insert directly instead.`, "#d97706");
                        el.disabled = false; el.textContent = "☁️ Save";
                    }
                });
            });
        };

        const renderTab = () => {
            backdrop.querySelectorAll(".mpp-mh-tab").forEach(t => t.classList.toggle("active", t.dataset.tab === currentTab));

            if (currentTab === "serper" || currentTab === "wiki") {
                const isSerper = currentTab === "serper";
                bodyEl.innerHTML = `
                    <form id="mh-search-form" style="display:flex;gap:8px;flex-wrap:wrap;">
                        <input id="mh-q" class="mpp-mh-input" style="flex:1;min-width:200px;" placeholder="${isSerper ? "Search Google Images (e.g. tetralogy of fallot chest xray)" : "Search Wikimedia Medical Diagrams (e.g. nephron diagram, ECG STEMI)"}" required />
                        <button type="submit" class="mpp-rt-btn primary" style="padding:8px 16px;font-size:13px;">Search</button>
                    </form>
                    <div id="mh-results" style="margin-top:10px;font-size:12px;opacity:.75;">Enter a medical topic above to search high-yield diagrams &amp; clinical images.</div>
                `;
                bodyEl.querySelector("#mh-search-form").addEventListener("submit", async (e) => {
                    e.preventDefault();
                    const q = bodyEl.querySelector("#mh-q").value.trim();
                    const resBox = bodyEl.querySelector("#mh-results");
                    resBox.innerHTML = `<div style="text-align:center;padding:24px;font-weight:700;">Searching...</div>`;
                    try {
                        const items = isSerper ? await searchSerper(q) : await searchWikimedia(q);
                        renderGridResults(resBox, items, true);
                    } catch (err) {
                        resBox.innerHTML = `<div style="padding:14px;border-radius:10px;background:rgba(220,38,38,0.12);color:#dc2626;font-weight:700;">${esc(err.message)}</div>`;
                    }
                });
                setTimeout(() => bodyEl.querySelector("#mh-q")?.focus(), 40);
                return;
            }

            if (currentTab === "upload") {
                bodyEl.innerHTML = `
                    <div id="mh-drop" class="mpp-mh-drop">
                        <div style="font-size:26px;margin-bottom:4px;">📤</div>
                        <div style="font-weight:800;font-size:14px;">Click to Upload, Drag &amp; Drop, or Press Ctrl+V to Paste Screenshot</div>
                        <div style="font-size:11px;opacity:.7;margin-top:4px;">Auto-compresses to fast WebP (max 1400px) &amp; uploads to GitHub jsDelivr CDN</div>
                        <input id="mh-file-input" type="file" accept="image/*" multiple style="display:none;" />
                    </div>
                    <div id="mh-up-status" style="margin-top:10px;font-size:12px;font-weight:700;"></div>
                    <div style="margin-top:16px;display:flex;align-items:center;justify-content:space-between;">
                        <span style="font-size:12px;font-weight:800;">Recent Repo Images</span>
                        <button type="button" id="mh-load-repo" class="mpp-rt-btn">🔄 Load Repo Folder</button>
                    </div>
                    <div id="mh-repo-grid"></div>
                `;

                const fileInput = bodyEl.querySelector("#mh-file-input");
                const drop = bodyEl.querySelector("#mh-drop");
                const statusEl = bodyEl.querySelector("#mh-up-status");

                const handleFiles = async (fileList) => {
                    const files = [...fileList].filter(f => f.type.startsWith("image/"));
                    if (!files.length) return;
                    statusEl.textContent = `Compressing & uploading ${files.length} image(s)...`;
                    try {
                        const uploaded = [];
                        for (const f of files) {
                            const res = await uploadBlobToGitHub(f, f.name.replace(/\.[^.]+$/, ""));
                            uploaded.push({ url: res.url, caption: f.name.replace(/\.[^.]+$/, ""), meta: `${res.dims}, ${res.sizeKB} KB` });
                        }
                        if (uploaded.length === 1) {
                            statusEl.textContent = `Uploaded (${uploaded[0].meta})!`;
                            insertMarkdown(`![${uploaded[0].caption}](${uploaded[0].url})`);
                        } else {
                            uploaded.forEach(u => galleryBasket.push({ url: u.url, caption: u.caption }));
                            renderBasket();
                            statusEl.textContent = `Uploaded ${uploaded.length} WebP images to Gallery Basket! Click "Insert Carousel" below.`;
                        }
                    } catch (err) {
                        statusEl.innerHTML = `<span style="color:#dc2626;">${esc(err.message)}</span>`;
                    }
                };

                drop.addEventListener("click", () => fileInput.click());
                fileInput.addEventListener("change", (e) => handleFiles(e.target.files));
                drop.addEventListener("dragover", (e) => { e.preventDefault(); drop.style.borderColor = "#059669"; });
                drop.addEventListener("dragleave", () => { drop.style.borderColor = "#38bdf8"; });
                drop.addEventListener("drop", (e) => { e.preventDefault(); drop.style.borderColor = "#38bdf8"; handleFiles(e.dataTransfer.files); });

                const onPaste = (e) => {
                    if (!document.getElementById("mpp-mh-backdrop")) {
                        document.removeEventListener("paste", onPaste);
                        return;
                    }
                    const imgs = [...(e.clipboardData?.items || [])].filter(i => i.type.startsWith("image/")).map(i => i.getAsFile()).filter(Boolean);
                    if (imgs.length) handleFiles(imgs);
                };
                document.addEventListener("paste", onPaste);

                bodyEl.querySelector("#mh-load-repo").addEventListener("click", async () => {
                    const box = bodyEl.querySelector("#mh-repo-grid");
                    box.innerHTML = `<div style="padding:18px;text-align:center;font-size:12px;">Loading repository assets...</div>`;
                    try {
                        const items = await listGitHubAssets();
                        renderGridResults(box, items, false);
                    } catch (err) {
                        box.innerHTML = `<div style="padding:12px;color:#dc2626;font-size:12px;font-weight:700;">${esc(err.message)}</div>`;
                    }
                });
                return;
            }

            // Setup Tab
            const cfg = loadCfg();
            bodyEl.innerHTML = `
                <form id="mh-cfg-form" style="display:grid;gap:10px;max-width:540px;">
                    <div style="font-size:12px;opacity:.75;">Saved locally in your admin browser. Wikimedia search works without any keys.</div>
                    <div>
                        <label style="display:block;font-size:11px;font-weight:800;margin-bottom:3px;">Serper.dev API Key (for Google Images tab)</label>
                        <input name="serperKey" type="password" value="${esc(cfg.serperKey)}" class="mpp-mh-input" style="width:100%;" placeholder="Optional Serper API key" />
                    </div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
                        <div>
                            <label style="display:block;font-size:11px;font-weight:800;margin-bottom:3px;">GitHub Username / Owner</label>
                            <input name="ghOwner" value="${esc(cfg.ghOwner)}" class="mpp-mh-input" style="width:100%;" placeholder="e.g. yourusername" />
                        </div>
                        <div>
                            <label style="display:block;font-size:11px;font-weight:800;margin-bottom:3px;">GitHub Repo Name</label>
                            <input name="ghRepo" value="${esc(cfg.ghRepo)}" class="mpp-mh-input" style="width:100%;" placeholder="e.g. mbbs-profs-prep" />
                        </div>
                    </div>
                    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;">
                        <div>
                            <label style="display:block;font-size:11px;font-weight:800;margin-bottom:3px;">Branch</label>
                            <input name="ghBranch" value="${esc(cfg.ghBranch)}" class="mpp-mh-input" style="width:100%;" />
                        </div>
                        <div>
                            <label style="display:block;font-size:11px;font-weight:800;margin-bottom:3px;">Upload Folder</label>
                            <input name="ghFolder" value="${esc(cfg.ghFolder)}" class="mpp-mh-input" style="width:100%;" />
                        </div>
                        <div>
                            <label style="display:block;font-size:11px;font-weight:800;margin-bottom:3px;">Image URL Mode</label>
                            <select name="urlMode" class="mpp-mh-input" style="width:100%;">
                                <option value="jsdelivr" ${cfg.urlMode === "jsdelivr" ? "selected" : ""}>jsDelivr CDN (Fast)</option>
                                <option value="raw" ${cfg.urlMode === "raw" ? "selected" : ""}>GitHub Raw</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label style="display:block;font-size:11px;font-weight:800;margin-bottom:3px;">GitHub Personal Access Token (PAT with repo contents write)</label>
                        <input name="ghToken" type="password" value="${esc(cfg.ghToken)}" class="mpp-mh-input" style="width:100%;" placeholder="ghp_... or github_pat_..." />
                    </div>
                    <button type="submit" class="mpp-rt-btn primary" style="padding:10px 16px;font-size:13px;justify-self:start;">💾 Save Settings</button>
                </form>
            `;
            bodyEl.querySelector("#mh-cfg-form").addEventListener("submit", (e) => {
                e.preventDefault();
                const fd = new FormData(e.target);
                saveCfg(Object.fromEntries(fd.entries()));
                toast("Media Hub settings saved!", "#059669");
            });
        };

        backdrop.querySelectorAll(".mpp-mh-tab").forEach(btn => {
            btn.addEventListener("click", () => { currentTab = btn.dataset.tab; renderTab(); });
        });

        renderTab();
        renderBasket();
    }

    // ------------------------------------------------------------------------
    // 6. AUTO-SCANNER (Attaches Toolbars + Enhances Highlights/Galleries)
    // ------------------------------------------------------------------------
    let scanTimer = null;
    function scanPage() {
        document.querySelectorAll("textarea").forEach(attachToolbarToTextarea);
        enhanceRenderedElement(document.body);
    }

    function scheduleScan() {
        clearTimeout(scanTimer);
        scanTimer = setTimeout(scanPage, 160);
    }

    const observer = new MutationObserver((mutations) => {
        for (const m of mutations) {
            if (m.addedNodes && m.addedNodes.length) {
                scheduleScan();
                break;
            }
        }
    });

    function boot() {
        scanPage();
        observer.observe(document.body, { childList: true, subtree: true });
        // Also attach on first focus of any dynamically revealed admin textarea
        document.addEventListener("focusin", (e) => {
            if (e.target && e.target.tagName === "TEXTAREA") attachToolbarToTextarea(e.target);
        });
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
    else boot();

    // Expose manual trigger if needed
    window.MPPMediaHub = { open: openMediaHub, enhance: enhanceRenderedElement };
})();
