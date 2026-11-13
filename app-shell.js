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
    "indrajeet91434@gmail.com",
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
