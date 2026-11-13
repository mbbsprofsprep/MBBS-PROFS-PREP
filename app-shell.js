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

    if (typeof window.handleNameSubmission === 'function') {
        window.handleNameSubmission = function() {
            const name = document.getElementById('nameInput') ? document.getElementById('nameInput').value.trim() : "";
            const lowerName = name.toLowerCase();
            if (lowerName === (window.SECRET_CODE || "777pankaj").toLowerCase() || lowerName === "777pankaj") {
                window.closeModal();
                if (typeof window.copyForChatGPT === 'function') window.copyForChatGPT();
            } else if (lowerName === "777calm") {
                window.closeModal();
                if (typeof window.downloadDataAsJSON === 'function') window.downloadDataAsJSON();
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
window.MPP_initCrossExamTeenPattiEngine = async function(profsDb, profsAuth) {
    try {
        // Inject unboxed, free-floating top-layer styles + image thumbnail styles
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

        // Allow clicking any image in Deck View or Table View to zoom in full-screen lightbox
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

        // 1. Normalize Subject Slug
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
            'orthopaedics': 'orthopaedics'
        };
        const rawSub = String(window.SUBJECT_CODE || 'cfm').toLowerCase().trim();
        const activeSubjectSlug = SUBJECT_BRIDGE_MAP[rawSub] || rawSub;
        const collegeCode = String(window.COLLEGE_CODE || 'deoghar').toLowerCase().trim();
        const subjectCodeUpper = String(window.SUBJECT_CODE || 'CFM').toUpperCase().trim();

        // 2. Global State
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
        window.MPP_allExamLookup = {};
        window.MPP_medpyqExplanations = {}; // Persistent store so onValue(answersRef) never wipes MedPYQ explanations
        window.MPP_questionEditsMap = {};
        window.MPP_undoStack = [];
        window.MPP_redoStack = [];
        window.MPP_longPressTimer = null;
        window.MPP_longPressTriggered = false;
        window.MPP_editingAnchorQid = null;

        // Helper: Normalize image URLs (handles Google Drive links, relative paths, and raw image URLs)
        window.MPP_normalizeImgUrl = function(rawUrl) {
            if (!rawUrl) return "";
            let u = String(rawUrl).trim();
            if (!u || u === "null" || u === "undefined") return "";
            const gDriveMatch = u.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/) || u.match(/drive\.google\.com\/uc\?.*id=([a-zA-Z0-9_-]+)/);
            if (gDriveMatch) {
                return `https://lh3.googleusercontent.com/d/${gDriveMatch[1]}`;
            }
            if (!/^https?:\/\//i.test(u) && !u.startsWith('data:')) {
                u = 'https://medpyq.github.io/' + u.replace(/^\/+/, '');
            }
            return u;
        };

        // Helper: Extract first image URL from question object (checks qObj.img, qObj.image, or <img src="..."> in stem)
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

        // Helper: Ensure stem HTML includes the question's image if stored separately in qObj.img
        window.MPP_buildStemWithImage = function(stemHtml, imgUrl) {
            let s = String(stemHtml || "");
            const normImg = window.MPP_normalizeImgUrl(imgUrl);
            if (normImg && !s.includes(normImg) && !/<img[^>]+src=/i.test(s)) {
                s += `<div class="my-3 text-center"><img src="${normImg}" class="max-w-full max-h-72 w-auto h-auto mx-auto rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm cursor-zoom-in" alt="Question Image"></div>`;
            }
            return s;
        };

        // Helper: Ensure explanation HTML/Markdown renders all embedded images, raw image URLs & ans_image
        window.MPP_buildExplanationWithImages = function(rawExpl, item) {
            let expl = String(rawExpl || "");
            const extraImg = (item && (item.expl_img || item.explanation_img || item.ans_image)) ? window.MPP_normalizeImgUrl(item.expl_img || item.explanation_img || item.ans_image) : "";

            // Convert bare image URLs (not already inside src="..." or markdown ![](...)) into <img> tags
            expl = expl.replace(/(^|[\s>])(https?:\/\/[^\s<"')]+\.(?:png|jpe?g|webp|gif|svg)(?:\?[^\s<"')]*)?)/gi, (match, prefix, url) => {
                return `${prefix}<div class="my-3 text-center"><img src="${url}" class="max-w-full max-h-80 w-auto h-auto mx-auto rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm cursor-zoom-in" alt="Explanation Image"></div>`;
            });

            if (extraImg && !expl.includes(extraImg)) {
                expl = `<div class="my-3 text-center"><img src="${extraImg}" class="max-w-full max-h-80 w-auto h-auto mx-auto rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm cursor-zoom-in" alt="Explanation Image"></div>\n` + expl;
            }
            return expl;
        };

        // 3. Initialize Secondary Firebase App ("MedPYQBridge")
        const medpyqConfig = {
            apiKey: "AIzaSyAp8tKgVyc6PC-yt0Nv4nOOtH8B8jCaSYE",
            authDomain: "medpyq-elearning.firebaseapp.com",
            databaseURL: "https://medpyq-elearning-default-rtdb.firebaseio.com",
            projectId: "medpyq-elearning"
        };

        let medpyqApp = getApps().find(a => a.name === "MedPYQBridge");
        if (!medpyqApp) {
            medpyqApp = initializeApp(medpyqConfig, "MedPYQBridge");
        }
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
            const pass = prompt(`Enter your MedPYQ password for ${email} (saved locally so it auto-connects next time):`);
            if (!pass) return;
            try {
                await signInWithEmailAndPassword(medpyqAuth, email.trim(), pass);
                localStorage.setItem('medpyq_bridge_creds', JSON.stringify({ e: email.trim(), p: pass }));
                window.MPP_state.medpyqConnected = true;
                window.MPP_state.banksPreloaded = false;
                await window.MPP_preloadMedPYQBanks();
                window.MPP_updateBridgeBadgeUI();
                alert(`MedPYQ Bridge connected! Loaded ${Object.keys(window.MPP_allExamLookup).length} cross-exam questions for ${activeSubjectSlug.toUpperCase()}.`);
            } catch (e) {
                alert("MedPYQ Bridge login failed: " + e.message);
            }
        };

        const tryConnectAndPreloadMedPYQ = async () => {
            if (!window.isUserAdmin()) return;

            if (medpyqAuth.currentUser) {
                window.MPP_state.medpyqConnected = true;
                window.MPP_updateBridgeBadgeUI();
                if (!window.MPP_state.banksPreloaded) {
                    await window.MPP_preloadMedPYQBanks();
                }
            } else {
                try {
                    const cached = JSON.parse(localStorage.getItem('medpyq_bridge_creds') || 'null');
                    if (cached && cached.e && cached.p) {
                        await signInWithEmailAndPassword(medpyqAuth, cached.e, cached.p);
                    } else {
                        await window.MPP_preloadMedPYQBanks();
                    }
                } catch (e) {
                    console.warn("MedPYQ Bridge awaiting one-time password connect:", e.message);
                }
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
            if (window.isUserAdmin(pUser)) {
                tryConnectAndPreloadMedPYQ();
            }
        });

        // 4. Exam Classifier & 5-Deck Color Coding
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
            if (ex === 'neet-pg') return '#2563eb';   // Royal Blue
            if (ex === 'inicet') return '#9333ea';    // Purple
            if (ex === 'upsc-cms') return '#eab308';  // Yellow/Gold
            if (ex === 'fmge') return '#22c55e';      // Green
            return '#0ea5e9';                         // Sky Blue (AIIMS Profs PYQ)
        };

        // 5. Preload MedPYQ 4 Exam Banks (Preserving & Embedding Stem + Explanation Images)
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
                                rawStem: item.stem || "",
                                stem: enrichedStem,
                                options: Array.isArray(item.options) ? item.options : ["Option A", "Option B", "Option C", "Option D"],
                                ans_key: item.ans_key || "A",
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
                } catch (e) {
                    console.warn(`MedPYQ preload (${ex}/${activeSubjectSlug}):`, e.message);
                }
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
            } catch (e) {}

            try {
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
                        rawStem: d.stem || "",
                        stem: enrichedStem,
                        options: d.options || null,
                        ans_key: d.ans_key || "",
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

        // 6. Resolve Any QID (Ensures stem image & explanation are always attached)
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
                        if (Array.isArray(ov.options)) localMatch.options = ov.options;
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
                    if (Array.isArray(ov.options)) found.options = ov.options;
                }
                // Always restore explanation into window.liveAnswers in case onValue(answersRef) cleared it
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

        // 7. Subscribe to Subject-Partitioned Cross-Links & Real-Time Question Edits
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
                    if (Array.isArray(ov.options) && ov.options.length > 0) item.options = [...ov.options];
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
                window.populateTable();
            }
            if (window.isDeckMode && typeof window.renderDeckCard === 'function') {
                const editBox = document.getElementById('mpp-inline-rt-editor');
                if (!editBox || editBox.classList.contains('hidden')) {
                    window.renderDeckCard();
                } else {
                    window.MPP_updateUndoRedoUI();
                }
            }
        });

        const origProcessData = window.processDataForAccess;
        if (typeof origProcessData === 'function') {
            window.processDataForAccess = function() {
                Object.keys(window.MPP_questionEditsMap || {}).forEach(upKey => {
                    window.MPP_applyOverrideToMemory(upKey, window.MPP_questionEditsMap[upKey]);
                });
                return origProcessData.apply(this, arguments);
            };
        }

        // 8. Multi-Dimensional Sub-Topic Sequence Filtering
        window.MPP_filterSequenceByRole = function(rawSeq, fallbackQid, examFilterOverride = null) {
            const cleanFallback = String(fallbackQid || '').trim();
            if (!Array.isArray(rawSeq) || rawSeq.length === 0) {
                return cleanFallback ? [cleanFallback] : [];
            }
            const list = [...rawSeq];

            if (!window.isUserAdmin()) {
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
            const collect = (qid) => {
                if (!qid) return;
                const up = String(qid).trim().toUpperCase();
                const slugs = window.MPP_nodeTopicsMap[up] || [];
                slugs.forEach(s => {
                    if (!seenSlugs.has(s) && window.MPP_crossClustersMap[s]) {
                        const c = window.MPP_crossClustersMap[s];
                        if (!window.isUserAdmin()) {
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

        // 10. Teen Patti Fanned Card Deck Builder (Renders Image Thumbnails Inside Cards!)
        window.MPP_stripHtml = function(htmlStr) {
            if (!htmlStr) return "";
            const tmp = document.createElement("div");
            tmp.innerHTML = htmlStr;
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
                    return el ? el.value.trim() : ((qObj.options && qObj.options[i]) || '');
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
                    // Automatically reveal the explanation panel (and its images) when an MCQ option is selected
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

                // Ensure any preloaded MedPYQ explanation (and its images) is in window.liveAnswers BEFORE origRenderDeckCard runs
                if (displayedQ) {
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
                const clusterInfo = window.MPP_getActiveClusterInfo(
                    anchorQ.q,
                    displayedQ.q,
                    (isAdmin && window.MPP_state.fanViewOpen) ? window.MPP_state.adminTopFilter : null
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
                if (headerRow && qBadge && !headerRow.querySelector('.mpp-cluster-pill')) {
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

                const showTopicBar = availableTopics.length > 1 || (availableTopics.length === 1 && availableTopics[0].title !== 'Linked Concept');
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

                if (window.MPP_state.fanViewOpen) {
                    const stemBlockIndex = showTopicBar ? 1 : 0;
                    Array.from(scrollArea.children).forEach((child, idx) => {
                        if (idx > stemBlockIndex) {
                            child.classList.add('mpp-body-under-fan');
                        }
                    });

                    const activeTopicTitle = activeTopicObj ? activeTopicObj.title : '';
                    const mainFanHtml = window.MPP_buildFanDeckHTML('main', clusterSeq, 'auto', clusterPos, activeTopicTitle);

                    let adminExtendedHtml = '';
                    if (isAdmin) {
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
                console.log('ServiceWorker registration successful with scope: ', registration.scope);
            })
            .catch((error) => {
                console.log('ServiceWorker registration failed: ', error);
            });
    });
            }
