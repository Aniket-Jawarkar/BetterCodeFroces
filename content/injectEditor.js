

(() => {
    'use strict';

    const EDITOR_CONTAINER_ID = 'cf-ll-editor-root';

    /* -------------------- Logger -------------------- */
    const log = (...args) => console.debug('[CF-LL][Bridge]', ...args);
    const err = (...args) => console.error('[CF-LL][Bridge]', ...args);

    /* -------------------- Injection -------------------- */
    function injectScript(path) {
        return new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = chrome.runtime.getURL(path);
            s.async = false; // Execute in order
            s.onload = () => {
                s.remove();
                resolve();
            };
            s.onerror = (e) => reject(new Error(`Failed to load ${path}`));
            (document.head || document.documentElement).appendChild(s);
        });
    }

    async function bootstrap() {
        log('Starting injection...');

      
        // We do this from Isolated World so it persists and we can control it.
        // But Main World script will populate it.
        let container = document.getElementById(EDITOR_CONTAINER_ID);
        if (!container) {
            container = document.createElement('div');
            container.id = EDITOR_CONTAINER_ID;

            // Basic strc
            container.innerHTML = `
                <div id="cf-ll-header">
                    <div style="font-weight:600">Editor</div>
                    <div class="controls">
                        <select id="cf-ll-lang-select" title="Select language"></select>
                        <button id="cf-ll-run-btn">Run</button>
                        <button id="cf-ll-submit-btn">Submit</button>
                    </div>
                </div>
                <div id="cf-ll-editor-mount"></div>
                <div id="cf-ll-samples"></div>
                <div id="cf-ll-run-result"></div>
            `;

            document.body.appendChild(container);

            // Inject dynamic style
            const style = document.createElement('style');
            style.textContent = `
                @media (min-width: 981px) {
                    body { margin-right: 450px !important; transition: margin-right 0.2s; }
                }
             `;
            document.head.appendChild(style);
        }

        try {
            // Shared utils 
            await injectScript('content/persistence.js');
            await injectScript('content/testCaseExtractor.js');

            // Monaco Loader
            await injectScript('editor/monaco-loader.js');

            // Main Logic
            await injectScript('content/injected_editor.js');

            log('Injection complete.');
        } catch (e) {
            err('Injection failed', e);
        }
    }

    /* -------------------- Bridge -------------------- */
    window.addEventListener('message', (event) => {
        // Only accept from same window
        if (event.source !== window) return;

        const data = event.data;
        if (data && data.type === 'CFLL_BG_REQUEST') {
            const { requestId, action, payload } = data;

            log('Forwarding request:', action);

            chrome.runtime.sendMessage({ action, payload }, (response) => {
                const lastErr = chrome.runtime.lastError;
                const result = {
                    type: 'CFLL_BG_RESPONSE',
                    requestId,
                    response: response,
                    error: lastErr ? lastErr.message : (response && response.error)
                };

                window.postMessage(result, '*');
            });
        }
    });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bootstrap);
    } else {
        bootstrap();
    }

})();
