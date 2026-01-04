

(function () {
    'use strict';

    // Prevent double-loading
    if (window.__cfll_monaco_loader) {
        return;
    }

    let monacoPromise = null;

    // CDN primary, local vendor fallback
    const CDN_BASE = 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min';
    const LOCAL_BASE = (() => {
        try {
            return chrome.runtime.getURL('vendor/monaco/min');
        } catch (_) {
            return null;
        }
    })();

    function loadScript(src) {
        return new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = src;
            s.async = true;
            s.onload = () => resolve();
            s.onerror = (e) => reject(e);
            (document.head || document.documentElement).appendChild(s);
        });
    }

    function configureRequire(base) {
        if (!window.require) {
            throw new Error('RequireJS not found after loader injection');
        }
        window.require.config({
            paths: {
                vs: base + '/vs'
            }
        });
    }

    async function initMonaco(base) {
        configureRequire(base);

        return new Promise((resolve, reject) => {
            window.require(['vs/editor/editor.main'], () => {
                // Register themes only once
                try {
                    if (!monaco.editor._cfllThemesRegistered) {
                        registerThemes(monaco);
                        monaco.editor._cfllThemesRegistered = true;
                    }
                } catch (_) { }

                resolve(window.monaco);
            }, reject);
        });
    }

    function registerThemes(monaco) {

        monaco.editor.defineTheme('vs-light', {
            base: 'vs',
            inherit: true,
            rules: [],
            colors: {
                'editor.background': '#ffffff'
            }
        });

        monaco.editor.defineTheme('vs-dark', {
            base: 'vs-dark',
            inherit: true,
            rules: [],
            colors: {
                'editor.background': '#1e1e1e'
            }
        });
    }

    async function loadFromCDN() {
        // Load RequireJS bundled with Monaco
        await loadScript(`${CDN_BASE}/vs/loader.js`);
        return initMonaco(CDN_BASE);
    }

    async function loadFromLocal() {
        if (!LOCAL_BASE) throw new Error('Local Monaco base not available');
        await loadScript(`${LOCAL_BASE}/vs/loader.js`);
        return initMonaco(LOCAL_BASE);
    }

    // Public loader function
    window.__cfll_monaco_loader = function () {
        if (monacoPromise) {
            return monacoPromise;
        }

        monacoPromise = (async () => {
            // Monaco already loaded
            if (window.monaco && window.monaco.editor) {
                return window.monaco;
            }

            // Try CDN first
            try {
                return await loadFromCDN();
            } catch (cdnErr) {
                console.warn('[CF-LL] Monaco CDN load failed, trying local fallback', cdnErr);
            }

            // Fallback to bundled version
            try {
                return await loadFromLocal();
            } catch (localErr) {
                console.error('[CF-LL] Monaco local fallback failed', localErr);
                throw new Error('Failed to load Monaco Editor');
            }
        })();

        return monacoPromise;
    };

})();
