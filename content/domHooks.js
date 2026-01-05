

(() => {
    'use strict';

    const log = (...args) => console.debug('[CF-LL][domHooks]', ...args);
    const warn = (...args) => console.warn('[CF-LL][domHooks]', ...args);

    let lastProblemKey = null;
    let observer = null;
    let debounceTimer = null;

  

    function getProblemKeyFromUrl() {
        const path = location.pathname.split('/').filter(Boolean);

        if (path[0] === 'contest' && path[2] === 'problem') {
            return `${path[1]}_${path[3]}`;
        }

        if (path[0] === 'problemset' && path[1] === 'problem') {
            return `${path[2]}_${path[3]}`;
        }

        return null;
    }

    function debounceRun(fn, delay = 300) {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(fn, delay);
    }

    

    function handlePossibleNavigation() {
        const currentKey = getProblemKeyFromUrl();
        if (!currentKey) return;

        // First run
        if (!lastProblemKey) {
            lastProblemKey = currentKey;
            log('Initial problem detected:', currentKey);
            return;
        }

        if (currentKey !== lastProblemKey) {
            log('Detected problem change:', lastProblemKey, '→', currentKey);
            lastProblemKey = currentKey;

           
            if (window.__cfll?.saveNow) {
             
                window.__cfll.saveNow().catch(() => { });
            }

     
            debounceRun(() => {
                log('Reloading page to reinitialize editor for new problem');
                location.reload();
            }, 200);
        }
    }

  

    function startObserver() {
        if (observer) return;

        observer = new MutationObserver((mutations) => {
          
            debounceRun(handlePossibleNavigation, 150);
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        log('MutationObserver started');
    }

    function stopObserver() {
        if (observer) {
            observer.disconnect();
            observer = null;
            log('MutationObserver stopped');
        }
    }

    

    function onVisibilityChange() {
        if (document.visibilityState === 'visible') {
            debounceRun(handlePossibleNavigation, 200);
        }
    }

  

    function boot() {
        lastProblemKey = getProblemKeyFromUrl();
        startObserver();
        document.addEventListener('visibilitychange', onVisibilityChange);
        log('DOM hooks active');
    }

  
    try {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', boot);
        } else {
            boot();
        }
    } catch (e) {
        warn('Failed to initialize domHooks', e);
    }

})();
