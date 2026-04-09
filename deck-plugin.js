(function() {
    function initExactThemeDeck() {
        if (!window.qnaData) return;

        // 1. EXACT CSS
        const style = document.createElement('style');
        style.innerHTML = `
            #universal-deck-layer { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100vh; background: #f8fafc; z-index: 9990; flex-direction: column; font-family: 'Inter', sans-serif; }
            .dark #universal-deck-layer { background: #111827; color: white; }
            .deck-card { background: white; border-radius: 16px; padding: 20px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); height: 100%; overflow-y: auto; display: flex; flex-direction: column; animation: fadeIn 0.3s ease-in-out; }
            .dark .deck-card { background: #1f2937; border: 1px solid #374151; }
            .option-btn { width: 100%; padding: 16px; margin-bottom: 12px; border: 2px solid #e5e7eb; border-radius: 12px; text-align: left; transition: all 0.2s; font-weight: 600; color: #374151; cursor: pointer; position: relative; }
            .dark .option-btn { border-color: #374151; background: rgba(31, 41, 55, 0.5); color: #d1d5db; }
            .opt-correct { border-color: #22c55e !important; background: #f0fdf4 !important; color: #15803d !important; }
            .dark .opt-correct { background: rgba(34, 197, 94, 0.15) !important; color: #4ade80 !important; }
            .opt-wrong { border-color: #ef4444 !important; background: #fef2f2 !important; color: #b91c1c !important; }
            .dark .opt-wrong { background: rgba(239, 68, 68, 0.15) !important; color: #f87171 !important; }
            #view-toggle-btn { position: fixed; bottom: 24px; right: 24px; z-index: 10000; width: 60px; height: 60px; border-radius: 50%; background: #2563eb; color: white; box-shadow: 0 4px 15px rgba(37, 99, 235, 0.4); border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 28px; transition: transform 0.2s; }
            #view-toggle-btn:active { transform: scale(0.90); }
            .univ-drawer { position: fixed; inset: 0; z-index: 10001; pointer-events: none; opacity: 0; transition: opacity 0.3s ease; }
            .univ-drawer.open { pointer-events: auto; opacity: 1; }
            .univ-drawer-bg { position: absolute; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(2px); }
            .univ-drawer-content { position: absolute; top: 0; right: 0; bottom: 0; width: 85%; max-width: 320px; background: white; transform: translateX(100%); transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1); display: flex; flex-direction: column; }
            .dark .univ-drawer-content { background: #111827; border-left: 1px solid #374151; }
            .univ-drawer.open .univ-drawer-content { transform: translateX(0); }
            .nav-grid-container { padding: 16px; overflow-y: auto; flex: 1; }
            .nav-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; }
            .nav-btn { aspect-ratio: 1; border-radius: 8px; font-weight: 800; font-size: 13px; background: #f3f4f6; color: #1f2937; border: 1px solid #d1d5db; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.1s; }
            .dark .nav-btn { background: #374151; color: #f3f4f6; border-color: #4b5563; }
            .nav-btn.active { background: #2563eb !important; color: white !important; border-color: #2563eb !important; box-shadow: 0 2px 4px rgba(37, 99, 235, 0.3); }
            .nav-btn.correct { background: #22c55e; color: white; border-color: #16a34a; }
            .nav-btn.wrong { background: #ef4444; color: white; border-color: #dc2626; }
            .filter-group { margin-bottom: 20px; }
            @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        `;
        document.head.appendChild(style);

        // 2. EXACT HTML WITH THE FILTER DRAWER
        const deckLayer = document.createElement('div');
        deckLayer.id = 'universal-deck-layer';
        deckLayer.innerHTML = `
            <div class="px-4 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center shadow-sm z-10 shrink-0">
                <div class="flex items-center gap-3 overflow-hidden">
                    <button onclick="window.toggleUnivDrawer('filter')" class="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"/></svg>
                    </button>
                    <div>
                        <h1 class="font-bold text-lg text-blue-600 dark:text-blue-400 truncate max-w-[160px]" id="univ-deck-title">Review</h1>
                        <div class="text-xs text-gray-500 truncate" id="univ-subtitle">Loading...</div>
                    </div>
                </div>
                <button onclick="window.toggleUnivDrawer('nav')" class="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-sm font-bold text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600">
                    <span id="univ-deck-counter">1/1</span>
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
                </button>
            </div>
            
            <div class="flex-1 p-4 overflow-hidden relative bg-gray-50 dark:bg-gray-900" id="univ-card-container"></div>
            
            <div class="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex gap-3 z-10 shrink-0 pb-20">
                <button onclick="window.univPrev()" class="flex-1 py-3 rounded-xl bg-gray-100 dark:bg-gray-700 font-bold text-gray-600 dark:text-gray-300 active:scale-95 transition-transform border border-gray-200 dark:border-gray-600">Previous</button>
                <button onclick="window.univNext()" class="flex-1 py-3 rounded-xl bg-blue-600 text-white font-bold shadow-lg shadow-blue-500/30 active:scale-95 transition-transform">Next</button>
            </div>
            
            <div id="univ-nav-drawer" class="univ-drawer">
                <div class="univ-drawer-bg" onclick="window.toggleUnivDrawer(null)"></div>
                <div class="univ-drawer-content">
                    <div class="p-4 border-b border-gray-200 dark:border-gray-700 font-bold text-lg flex justify-between items-center text-gray-800 dark:text-white">
                        <span>Navigator</span>
                        <button onclick="window.toggleUnivDrawer(null)" class="text-gray-400 p-2">✕</button>
                    </div>
                    <div class="nav-grid-container"><div class="nav-grid" id="univ-nav-grid"></div></div>
                </div>
            </div>
            
            <div id="univ-filter-drawer" class="univ-drawer">
                <div class="univ-drawer-bg" onclick="window.toggleUnivDrawer(null)"></div>
                <div class="univ-drawer-content">
                    <div class="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                        <span class="font-bold text-lg text-gray-800 dark:text-white">Filters</span>
                        <button onclick="window.resetFilters()" class="text-xs text-blue-600 font-bold bg-blue-50 dark:bg-gray-800 px-3 py-1 rounded-full border border-blue-100 dark:border-gray-700">RESET</button>
                    </div>
                    <div class="p-5 overflow-y-auto" id="univ-filter-content"></div>
                    <div class="p-4 border-t border-gray-200 dark:border-gray-700 mt-auto">
                        <button onclick="window.applyFilters(); window.toggleUnivDrawer(null);" class="w-full py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-500/30">Apply Filters</button>
                    </div>
                </div>
            </div>`;
        
        document.body.appendChild(deckLayer);

        const fab = document.createElement('button');
        fab.id = 'view-toggle-btn';
        fab.innerHTML = '🎴';
        fab.onclick = window.toggleUniversalMode;
        document.body.appendChild(fab);

        // 3. DATA MAPPING LOGIC
        window.isDeckMode = false; 
        window.allQuestions = []; 
        window.activeQuestions = []; 
        window.univIndex = 0; 
        window.univStatus = {}; 

        let typeCounters = {}; 
        window.allQuestions = window.qnaData.map((q, idx) => {
            const rawType = (q.Type || q.type || "MCQ").toString().trim();
            let label = q.q || q.qn || q.QN || q.No || q.ID || q.id;
            if (typeof label === 'string' && label.length > 8) label = null; 
            if (!label) {
                let prefix = "Q";
                const lowerType = rawType.toLowerCase();
                if (lowerType.includes('diagram') && lowerType.includes('theory')) prefix = "DGT"; else if (lowerType.includes('diagram')) prefix = "DGM"; else if (lowerType.includes('theory')) prefix = "T"; else if (lowerType.includes('mcq')) prefix = "M";
                if (!typeCounters[prefix]) typeCounters[prefix] = 0; typeCounters[prefix]++; label = prefix + typeCounters[prefix];
            }
            let finalOptions = Array.isArray(q.options) && q.options.length > 0 ? q.options : [q.A, q.B, q.C, q.D].filter(o => o != null && o !== "");
            
            let rawChapter = q.Chapter || q.chapter || q.Topic || q.topic || "General";
            let chapterArray = Array.isArray(rawChapter) ? rawChapter : [rawChapter.toString().trim()];

            return { 
                id: idx, 
                label: label, 
                question: q.Question || q.question || "", 
                options: finalOptions, 
                correct: q.ans_key || q.Answer || q.answer || "", 
                stem: q.Stem || q.stem || "", 
                chapter: chapterArray, 
                type: rawType, 
                batch: (q.Batch || q.batch || q.examBatch || q["Exam Batch"] || "General").toString().trim() 
            };
        });
        window.activeQuestions = [...window.allQuestions];

        // 4. FILTER POPULATION
        window.populateFilterUI = function() {
            const naturalSort = (a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
            const chapters = [...new Set(window.allQuestions.flatMap(q => q.chapter))].sort(naturalSort);
            const types = [...new Set(window.allQuestions.map(q => q.type))].sort(naturalSort);
            const batches = [...new Set(window.allQuestions.map(q => q.batch))].sort(naturalSort);
            
            const container = document.getElementById('univ-filter-content');
            const buildGroup = (label, category, opts) => {
                if (!opts || opts.length <= 1) return '';
                return `<div class="mb-6 filter-group">
                            <div class="font-bold text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 px-1">${label}</div>
                            <div class="space-y-2 max-h-48 overflow-y-auto custom-scrollbar p-1">
                                ${opts.map(opt => `<label class="flex items-start gap-3 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-gray-800 cursor-pointer transition-colors group"><input type="checkbox" value="${opt}" class="univ-filter-checkbox mt-1 w-4 h-4 text-blue-600 rounded border-gray-300 dark:border-gray-600 focus:ring-blue-500" data-category="${category}"><span class="text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white leading-snug">${opt}</span></label>`).join('')}
                            </div>
                        </div>`;
            };
            container.innerHTML = buildGroup('Chapters', 'chapter', chapters) + buildGroup('Type', 'type', types) + buildGroup('Exam Batch', 'batch', batches);
        };

        // 5. BULLETPROOF FILTER APPLICATION (Reads straight from the screen checkboxes)
        window.applyFilters = function() { 
            const getChecked = (category) => {
                const checkboxes = document.querySelectorAll(`.univ-filter-checkbox[data-category="${category}"]:checked`);
                return Array.from(checkboxes).map(cb => cb.value);
            };

            const selectedChapters = getChecked('chapter');
            const selectedTypes = getChecked('type');
            const selectedBatches = getChecked('batch');

            window.activeQuestions = window.allQuestions.filter(q => {
                let matchCh = selectedChapters.length === 0 || q.chapter.some(ch => selectedChapters.includes(ch));
                let matchTy = selectedTypes.length === 0 || selectedTypes.includes(q.type);
                let matchBat = selectedBatches.length === 0 || selectedBatches.includes(q.batch);
                return matchCh && matchTy && matchBat;
            });

            window.univIndex = 0; 
            window.updateDeckStats(); 
            window.renderUnivCard(); 
        };

        window.resetFilters = function() { 
            document.querySelectorAll('.univ-filter-checkbox').forEach(cb => cb.checked = false); 
            window.applyFilters(); 
        };

        // 6. RENDER AND NAVIGATION
        window.updateDeckStats = function() { 
            const sub = document.getElementById('univ-subtitle'); 
            if(sub) { 
                if(window.activeQuestions.length === window.allQuestions.length) { sub.innerText = `${window.activeQuestions.length} Questions`; } 
                else { sub.innerText = `${window.activeQuestions.length} of ${window.allQuestions.length} Filtered`; } 
            } 
        };

        window.renderUnivCard = function() {
            const container = document.getElementById('univ-card-container');
            if (window.activeQuestions.length === 0) { 
                container.innerHTML = `<div class="h-full flex flex-col items-center justify-center text-gray-400"><div class="text-4xl mb-4 opacity-50">🔍</div><p class="font-bold text-slate-600 dark:text-slate-400">No questions match these filters.</p><button onclick="window.resetFilters(); window.toggleUnivDrawer(null);" class="mt-4 text-blue-600 text-sm font-bold bg-blue-50 dark:bg-gray-800 px-4 py-2 rounded-lg">Clear Filters</button></div>`; 
                return; 
            }
            const q = window.activeQuestions[window.univIndex]; 
            document.getElementById('univ-deck-counter').innerText = `${window.univIndex + 1}/${window.activeQuestions.length}`;
            
            const cleanStem = q.stem.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            const cleanQuestion = q.question.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            
            const askAiBtnHtml = `<button onclick="window.triggerUnivAskAI(this)" class="px-3 py-1.5 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-xs font-bold hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors flex items-center gap-1.5 border border-green-200 dark:border-green-800 shadow-sm">Ask AI</button>`;

            container.innerHTML = `
                <div class="deck-card relative flex flex-col h-full">
                    <div class="flex-1 overflow-y-auto">
                        <div class="mb-3 flex justify-between items-center">
                            <span class="inline-block px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-extrabold border border-blue-200 dark:border-blue-800">${q.label}</span>
                            <div class="flex gap-2">
                                ${askAiBtnHtml}
                                <button onclick="window.openReportModal()" title="Report Error" class="p-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 border border-red-100 dark:border-red-900/50 shadow-sm">⚠️</button>
                            </div>
                        </div>
                        <div class="mb-6">
                            ${q.stem ? `<div class="text-xs font-bold text-blue-600 uppercase tracking-wider mb-2">Case Scenario</div><div class="text-sm text-gray-700 dark:text-gray-300 italic mb-4 bg-blue-50 dark:bg-gray-800/50 p-4 rounded-xl border-l-4 border-blue-600 shadow-sm">${cleanStem}</div>` : ''}
                            <h2 class="text-xl font-bold text-slate-900 dark:text-white leading-snug">${cleanQuestion || cleanStem}</h2>
                        </div>
                        <div class="space-y-3 pb-6">
                            ${q.type === 'MCQ' ? q.options.map((opt, i) => { 
                                const letter = String.fromCharCode(65 + i); 
                                const cleanOpt = opt.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                                return `<button onclick="window.checkUnivAnswer(this, '${letter}', '${q.correct}')" class="option-btn group"><div class="flex items-start gap-3"><span class="flex-shrink-0 w-7 h-7 rounded-lg bg-slate-100 dark:bg-gray-700 text-slate-500 text-sm font-bold flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors mt-0.5 border border-slate-200 dark:border-gray-600">${letter}</span><span class="text-slate-700 dark:text-slate-200 text-base leading-relaxed text-left pt-0.5 font-medium">${cleanOpt}</span></div></button>`; 
                            }).join('') : `<div class="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-200 dark:border-blue-800"><p class="text-sm text-blue-800 dark:text-blue-300 font-medium">This is a Subjective theory question. Tap Ask AI above for a model answer.</p></div>`}
                        </div>
                        <div class="mt-4 pt-4 border-t border-slate-100 dark:border-gray-800">
                            <div class="flex flex-wrap gap-2 opacity-80">
                                ${q.chapter.map(ch => `<span class="px-2 py-1 rounded-md bg-slate-100 dark:bg-gray-700 text-xs font-bold text-slate-500 uppercase tracking-wide">${ch}</span>`).join('')}
                                ${q.batch !== 'General' ? `<span class="px-2 py-1 rounded-md bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400 border border-purple-100 dark:border-purple-800 text-xs font-bold uppercase tracking-wide">${q.batch}</span>` : ''}
                            </div>
                        </div>
                    </div>
                </div>`;
            container.scrollTop = 0;
        };

        window.renderNavGrid = function() { 
            const grid = document.getElementById('univ-nav-grid'); 
            if(!grid) return; 
            grid.innerHTML = window.activeQuestions.map((q, arrayIdx) => { 
                const status = window.univStatus[q.id]; 
                let classes = "nav-btn"; 
                if (status === 'correct') classes += " correct"; 
                else if (status === 'wrong') classes += " wrong"; 
                if (arrayIdx === window.univIndex) classes += " active"; 
                return `<button onclick="window.jumpToUniv(${arrayIdx})" class="${classes}">${q.label}</button>`; 
            }).join(''); 
        };

        window.jumpToUniv = function(idx) { window.univIndex = idx; window.toggleUnivDrawer(null); window.renderUnivCard(); };
        
        window.checkUnivAnswer = function(btn, picked, correct) { 
            const q = window.activeQuestions[window.univIndex]; 
            const p = picked.trim().toUpperCase(); 
            const c = correct.toString().trim().toUpperCase(); 
            const btns = btn.parentElement.querySelectorAll('button'); 
            btns.forEach(b => b.disabled = true); 
            if (p === c || c.includes(p)) { 
                btn.classList.add('opt-correct'); window.univStatus[q.id] = 'correct'; 
                if(navigator.vibrate) navigator.vibrate(50); 
            } else { 
                btn.classList.add('opt-wrong'); window.univStatus[q.id] = 'wrong'; 
                if(navigator.vibrate) navigator.vibrate([50, 50]); 
                btns.forEach((b, i) => { const l = String.fromCharCode(65 + i); if (l === c || c.includes(l)) b.classList.add('opt-correct'); }); 
            } 
        };

        window.toggleUnivDrawer = function(type) { 
            const nav = document.getElementById('univ-nav-drawer'); 
            const filt = document.getElementById('univ-filter-drawer'); 
            nav.classList.remove('open'); filt.classList.remove('open'); 
            if (type === 'nav') { window.renderNavGrid(); nav.classList.add('open'); } 
            if (type === 'filter') { filt.classList.add('open'); } 
        };

        window.toggleUniversalMode = function() { 
            window.isDeckMode = !window.isDeckMode; 
            
            // Cleanly Hide the main table wrapper
            const mainContent = document.querySelector('.w-full.px-4.py-8') || document.getElementById('main-wrapper');
            if (mainContent) mainContent.style.display = window.isDeckMode ? 'none' : 'block';

            const deck = document.getElementById('universal-deck-layer'); 
            const fab = document.getElementById('view-toggle-btn'); 
            
            if (window.isDeckMode) { 
                deck.style.display = 'flex'; 
                fab.innerHTML = '📋'; fab.title = "Switch to Table View"; 
                // Apply whatever filters are currently checked in the deck
                window.applyFilters();
                window.dispatchEvent(new Event('resize')); 
            } else { 
                deck.style.display = 'none'; 
                fab.innerHTML = '🎴'; fab.title = "Switch to Deck View"; 
            } 
        };

        window.univNext = function() { if (window.univIndex < window.activeQuestions.length - 1) { window.univIndex++; window.renderUnivCard(); } };
        window.univPrev = function() { if (window.univIndex > 0) { window.univIndex--; window.renderUnivCard(); } };

        window.triggerUnivAskAI = function(btnElement) { 
            if (window.activeQuestions.length === 0 || !window.activeQuestions[window.univIndex]) return; 
            const originalIndex = window.activeQuestions[window.univIndex].id; 
            if (typeof window.askAI === 'function') { 
                window.askAI(btnElement, window.qnaData[originalIndex]); 
            } 
        };

        window.openReportModal = function() { 
            const q = window.activeQuestions[window.univIndex]; if (!q) return; 
            let m = document.getElementById('univ-report-modal'); 
            if (!m) { 
                m = document.createElement('div'); m.id = 'univ-report-modal'; 
                m.className = 'fixed inset-0 z-[10005] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in'; 
                document.body.appendChild(m); 
            } 
            m.innerHTML = `<div class="glass-card max-w-sm w-full p-6 rounded-2xl relative"><h3 class="text-lg font-bold text-slate-900 dark:text-white mb-1">Report Issue</h3><p class="text-xs text-slate-500 mb-4">Question ID: ${q.label || q.id}</p><label class="block text-xs font-bold text-slate-500 uppercase mb-2">What's wrong?</label><div class="grid grid-cols-2 gap-2 mb-4"><button onclick="window.selectReportType(this)" class="rep-type-btn py-2 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-colors" data-val="Wrong Answer">Wrong Answer</button><button onclick="window.selectReportType(this)" class="rep-type-btn py-2 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-orange-50 hover:border-orange-200 hover:text-orange-600 transition-colors" data-val="Typo/Error">Typo / Error</button><button onclick="window.selectReportType(this)" class="rep-type-btn py-2 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 transition-colors" data-val="Missing Content">Missing Img/Opt</button><button onclick="window.selectReportType(this)" class="rep-type-btn py-2 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-purple-50 hover:border-purple-200 hover:text-purple-600 transition-colors" data-val="Other">Other</button></div><textarea id="report-desc" rows="3" class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm focus:ring-2 focus:ring-red-400 focus:outline-none mb-4" placeholder="Briefly describe the error..."></textarea><div class="flex gap-3"><button onclick="document.getElementById('univ-report-modal').remove()" class="flex-1 py-2.5 rounded-xl bg-gray-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-sm">Cancel</button><button onclick="window.submitReport('${q.label || q.id}')" class="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-bold text-sm shadow-lg shadow-red-500/30">Submit Report</button></div></div>`; 
            m.style.display = 'flex'; 
        };
        
        window.selectedReportType = "Other"; 
        window.selectReportType = function(btn) { 
            document.querySelectorAll('.rep-type-btn').forEach(b => { b.classList.remove('ring-2', 'ring-offset-1', 'ring-red-400', 'bg-slate-100'); }); 
            btn.classList.add('ring-2', 'ring-offset-1', 'ring-red-400'); 
            window.selectedReportType = btn.getAttribute('data-val'); 
        };
        
        window.submitReport = function(qid) { 
            const desc = document.getElementById('report-desc').value; 
            const btn = document.querySelector('#univ-report-modal button:last-child'); 
            btn.innerText = "Sending..."; btn.disabled = true; 
            const combinedID = `${qid} | ${window.location.href}`;
            const REPORT_CONFIG = { formID: "1FAIpQLSelW2ekB-oEvl5h4tpteqUdpjFxtJRaWfWSkz_AiZWqYOC59A", entryID_QID: "entry.1044663891", entryID_Type: "entry.1296716381", entryID_Desc: "entry.621177596" };
            const url = `https://docs.google.com/forms/d/e/${REPORT_CONFIG.formID}/formResponse?${REPORT_CONFIG.entryID_QID}=${encodeURIComponent(combinedID)}&${REPORT_CONFIG.entryID_Type}=${encodeURIComponent(window.selectedReportType)}&${REPORT_CONFIG.entryID_Desc}=${encodeURIComponent(desc)}&submit=Submit`; 
            const iframe = document.createElement('iframe'); iframe.style.display = 'none'; iframe.src = url; document.body.appendChild(iframe); 
            setTimeout(() => { document.getElementById('univ-report-modal').innerHTML = `<div class="glass-card max-w-sm w-full p-6 rounded-2xl text-center"><div class="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl">✅</div><h3 class="font-bold text-slate-900 dark:text-white">Report Sent!</h3><p class="text-xs text-slate-500 mb-4">We will review this shortly.</p><button onclick="document.getElementById('univ-report-modal').remove()" class="w-full py-2 bg-slate-100 dark:bg-slate-800 rounded-lg font-bold text-sm">Close</button></div>`; setTimeout(() => iframe.remove(), 2000); }, 1200); 
        };

        // 7. INITIALIZATION
        window.populateFilterUI(); 
        window.updateDeckStats(); 
        window.renderUnivCard();
        
        const titleEl = document.getElementById('univ-deck-title'); 
        if(titleEl) titleEl.innerText = document.title.split('-')[1] ? document.title.split('-')[1].trim() : "Review";
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initExactThemeDeck);
    } else {
        initExactThemeDeck();
    }
})();
