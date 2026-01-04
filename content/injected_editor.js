

(() => {
    'use strict';


    const EDITOR_CONTAINER_ID = 'cf-ll-editor-root';
    const AUTO_SAVE_DEBOUNCE_MS = 800;

    const log = (...args) => console.debug('[CF-LL][Main]', ...args);
    const err = (...args) => console.error('[CF-LL][Main]', ...args);
    const debounce = (fn, wait) => {
        let t;
        return (...args) => {
            clearTimeout(t);
            t = setTimeout(() => fn(...args), wait);
        };
    };

   
    function sendBg(action, payload) {
        return new Promise((resolve, reject) => {
            const requestId = Math.random().toString(36).slice(2);

            const listener = (event) => {
                if (event.source !== window) return;
                if (event.data?.type === 'CFLL_BG_RESPONSE' && event.data.requestId === requestId) {
                    window.removeEventListener('message', listener);
                    if (event.data.error) reject(event.data.error);
                    else resolve(event.data.response);
                }
            };

            window.addEventListener('message', listener);
            window.postMessage({
                type: 'CFLL_BG_REQUEST',
                requestId,
                action,
                payload
            }, '*');

            // Timeout safety
            setTimeout(() => {
                window.removeEventListener('message', listener);
                // Don't reject for fire-and-forget
              
            }, 30000);
        });
    }

  
    function parseProblemFromUrl() {
        // Same logic as before
        const path = location.pathname.split('/').filter(Boolean);
        let contestId = null;
        let problemIndex = null;

        if (path[0] === 'problemset' && path[1] === 'problem' && path.length >= 4) {
            contestId = path[2];
            problemIndex = path[3];
        } else if (path[0] === 'contest' && path.length >= 4 && (path[2] === 'problem' || path[2] === 'problems')) {
            contestId = path[1];
            problemIndex = path[3];
        } else {
            contestId = 'problemset';
            problemIndex = document.querySelector('.problemindexholder .contestId')?.textContent?.trim() || 'unknown';
        }

        return { contestId, problemIndex, key: `${contestId}_${problemIndex}` };
    }



    function waitForGlobal(name, timeoutMs = 8000) {
        return new Promise((resolve, reject) => {
            if (window[name]) return resolve(window[name]);
            const start = Date.now();
            const i = setInterval(() => {
                if (window[name]) {
                    clearInterval(i);
                    resolve(window[name]);
                } else if (Date.now() - start > timeoutMs) {
                    clearInterval(i);
                    reject(new Error(`Timeout waiting for ${name}`));
                }
            }, 100);
        });
    }

    

    async function bootstrap() {
        log('Initializing in Main World...');

        // Wait for critical globals
        // __cfll_persistence, __cfll_monaco_loader are injected as separate scripts
        await waitForGlobal('__cfll_monaco_loader');

        //  Ensure Editor DOM exists (created by isolated script, but accessible here)
        const mount = document.getElementById('cf-ll-editor-mount');
        if (!mount) {
            throw new Error('#cf-ll-editor-mount not found. Injector failed?');
        }

 
        // We can try to use  background map via bridge
        await populateLanguageSelector();

       
        renderSamplesPanel();

    
        const simpleLang = getInitialLang();
        const editor = await createEditor(mount, simpleLang);

      
        await restoreCode(editor, simpleLang);

       
        wireAutosave(editor);
        wireButtons(editor);

        log('Ready.');
    }


    async function createEditor(mount, lang) {
        // Load monaco
        const loader = window.__cfll_monaco_loader;
        const monaco = await loader(); // loads monaco instance

        mount.innerHTML = '';

        const editor = monaco.editor.create(mount, {
            value: '',
            language: mapLang(lang),
            automaticLayout: true,
            minimap: { enabled: false },
            lineNumbers: 'on',
            theme: document.body.classList.contains('dark') ? 'vs-dark' : 'vs-light',
            fontSize: 13,
            wordWrap: 'on',
            scrollBeyondLastLine: false,
        });

       
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
            document.getElementById('cf-ll-run-btn')?.click();
        });

        return editor;
    }

    function mapLang(simple) {
        switch ((simple || '').toLowerCase()) {
            case 'cpp': case 'c++': return 'cpp';
            case 'python': case 'python3': return 'python';
            case 'java': return 'java';
            case 'kotlin': return 'kotlin';
            case 'rust': return 'rust';
            case 'javascript': case 'js': return 'javascript';
            default: return 'plaintext';
        }
    }

    function getInitialLang() {
        const sel = document.getElementById('cf-ll-lang-select');
        const id = sel?.value || '54';
        return mapLangIdToSimple(id);
    }

    function mapLangIdToSimple(id) {
        const map = {
            '54': 'cpp', '62': 'cpp',
            '31': 'python', '32': 'python',
            '36': 'java',
            '49': 'kotlin',
            '69': 'rust',
            '63': 'javascript'
        };
        return map[id] || 'cpp';
    }

   
    async function populateLanguageSelector() {
        const select = document.getElementById('cf-ll-lang-select');
        if (!select) return;

        try {
            // Ask background via bridge
            const resp = await sendBg('getLangMap');
            if (resp && resp.langMap) {
                fillLangSelect(select, resp.langMap);
                return;
            }
        } catch (e) {  }

        // Fallback: internal or existing
        const remoteSelect = document.querySelector('select[name="programTypeId"]');
        if (remoteSelect) {
            for (const opt of Array.from(remoteSelect.options)) {
                const o = document.createElement('option');
                o.value = opt.value;
                o.textContent = opt.textContent;
                select.appendChild(o);
            }
            select.value = remoteSelect.value;
        } else {
            // Static fallback
            const fallback = { '54': 'C++ 17', '31': 'Python 3', '36': 'Java', '63': 'JS' };
            fillLangSelect(select, fallback);
        }

        // Restore local selection
        const parsed = parseProblemFromUrl();
        const saved = localStorage.getItem(`cf-ll-lang_${parsed.key}`) || localStorage.getItem('cf-ll-lang_global');
        if (saved) select.value = saved;

        select.addEventListener('change', () => {
            localStorage.setItem(`cf-ll-lang_${parsed.key}`, select.value);
            localStorage.setItem('cf-ll-lang_global', select.value);
        });
    }

    function fillLangSelect(select, map) {
        select.innerHTML = '';
        if (Array.isArray(map)) {
            map.forEach(m => {
                const o = document.createElement('option');
                o.value = m.id;
                o.textContent = m.name;
                select.appendChild(o);
            });
        } else {
            for (const k in map) {
                const o = document.createElement('option');
                o.value = k;
                o.textContent = map[k];
                select.appendChild(o);
            }
        }
    }



    async function restoreCode(editor, lang) {
        const parsed = parseProblemFromUrl();
        const persistence = window.__cfll_persistence; // expected global

        //  Try saved
        if (persistence) {
            const saved = await persistence.loadCode(); // handles keys internally
        
            if (saved) {
                editor.setValue(saved);
                log('Restored.');
                return;
            }
        }

        // Template
        const tKey = `cf-ll-template_${lang}`;
        let tVal = localStorage.getItem(tKey);
        if (!tVal) tVal = getDefaultTemplate(lang);

        const cursor = tVal.indexOf('|');
        editor.setValue(tVal.replace('|', ''));

        if (cursor >= 0) {
            editor.setPosition(editor.getModel().getPositionAt(cursor));
        }
    }

    function getDefaultTemplate(lang) {
       
        switch ((lang || 'cpp').toLowerCase()) {
            case 'python': return `def main():\n    |\n\nif __name__ == "__main__":\n    main()\n`;
            case 'java': return `public class Main {\n    public static void main(String[] args) {\n        // |\n    }\n}\n`;
            default: return `#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    |\n    return 0;\n}\n`;
        }
    }

    function wireAutosave(editor) {
        const persistence = window.__cfll_persistence;
        if (!persistence) return;

        const d = debounce(async () => {
            const code = editor.getValue();
            await persistence.saveCode(code);
        }, AUTO_SAVE_DEBOUNCE_MS);
        editor.onDidChangeModelContent(d);
    }

 

    function extractSamples() {
        if (window.__cfll_testcase_extractor) {
            return window.__cfll_testcase_extractor.extract();
        }
        // Basic fallback
        const samples = [];
        document.querySelectorAll('.sample-test').forEach(st => {
            const i = st.querySelector('.input pre')?.textContent || '';
            const o = st.querySelector('.output pre')?.textContent || '';
            samples.push({ input: i.trim(), output: o.trim() });
        });
        return samples;
    }

    function renderSamplesPanel() {
        const div = document.getElementById('cf-ll-samples');
        if (!div) return;
        const s = extractSamples();
        if (!s.length) { div.innerHTML = 'No samples'; return; }

        div.innerHTML = s.map((x, i) => `
            <div style="margin-top:5px;border-top:1px dashed #ccc;padding-top:5px">
               <strong>Sample ${i + 1}</strong>
               <div>In: <pre>${x.input}</pre></div>
               <div>Out: <pre>${x.output}</pre></div>
            </div>
        `).join('');
    }

    function wireButtons(editor) {
        const btnRun = document.getElementById('cf-ll-run-btn');
        const btnSub = document.getElementById('cf-ll-submit-btn');
        const out = document.getElementById('cf-ll-run-result');

        btnRun?.addEventListener('click', async () => {
            out.textContent = 'Running...';
            const code = editor.getValue();
            const langId = document.getElementById('cf-ll-lang-select').value;
            const samples = extractSamples();

            try {
                const res = await sendBg('run', {
                    code, langId, samples, problem: parseProblemFromUrl()
                });
                renderResults(out, res);
            } catch (e) {
                out.textContent = 'Error: ' + e;
            }
        });

        btnSub?.addEventListener('click', async () => {
            btnSub.disabled = true;
            try {
                const code = editor.getValue();
                const langId = document.getElementById('cf-ll-lang-select').value;
                await sendBg('submit', {
                    code, langId, problem: parseProblemFromUrl()
                });
                alert('Submitted!');
            } catch (e) {
                alert('Error: ' + e);
            } finally {
                btnSub.disabled = false;
            }
        });
    }

    function renderResults(container, resp) {
        if (!resp) return container.textContent = 'No response';
        if (resp.error) return container.textContent = resp.error;

        const res = resp.results || [];
        container.innerHTML = res.map((r, i) => `
            <div>
               <strong>Test ${i + 1}</strong>: ${r.passed ? 'PASS' : 'FAIL'}
               <div>Got: <pre>${r.stdout}</pre></div>
               ${r.stderr ? `<div style="color:red">Err: ${r.stderr}</div>` : ''}
            </div>
        `).join('<hr/>');
    }

    // Start
    bootstrap().catch(e => err('FATAL', e));

})();
