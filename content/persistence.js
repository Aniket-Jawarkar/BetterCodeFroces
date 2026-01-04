

(function () {
    'use strict';

    const DB_NAME = 'cf_ll_db';
    const DB_VERSION = 1;
    const STORE_NAME = 'solutions';

    let dbPromise = null;

    

    function openDB() {
        if (dbPromise) return dbPromise;

        dbPromise = new Promise((resolve, reject) => {
            const req = indexedDB.open(DB_NAME, DB_VERSION);

            req.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME, { keyPath: 'key' });
                }
            };

            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });

        return dbPromise;
    }

    async function idbGet(key) {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const req = store.get(key);
            req.onsuccess = () => resolve(req.result ? req.result.value : null);
            req.onerror = () => reject(req.error);
        });
    }

    async function idbSet(key, value) {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const req = store.put({
                key,
                value,
                updatedAt: Date.now()
            });
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        });
    }

    async function idbDelete(key) {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const req = store.delete(key);
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        });
    }

    

    function getProblemKey() {
        const path = location.pathname.split('/').filter(Boolean);

        // /contest/{id}/problem/{index}
        if (path[0] === 'contest' && path[2] === 'problem') {
            return `${path[1]}_${path[3]}`;
        }

        // /problemset/problem/{id}/{index}
        if (path[0] === 'problemset' && path[1] === 'problem') {
            return `${path[2]}_${path[3]}`;
        }

        // fallback
        return `unknown_${location.pathname}`;
    }

    /* ---------------- Public API ---------------- */

    async function loadCode() {
        const key = getProblemKey();
        try {
            const val = await idbGet(key);
            if (val !== null) return val;
        } catch (_) {
            // fall through
        }

        try {
            const raw = localStorage.getItem(`cfll_${key}`);
            return raw ? JSON.parse(raw) : null;
        } catch (_) {
            return null;
        }
    }

    async function saveCode(code) {
        const key = getProblemKey();
        try {
            await idbSet(key, code);
        } catch (_) {
            
        }

        try {
            localStorage.setItem(`cfll_${key}`, JSON.stringify(code));
        } catch (_) {
            
        }
    }

    async function clearCode() {
        const key = getProblemKey();
        try {
            await idbDelete(key);
        } catch (_) { }

        try {
            localStorage.removeItem(`cfll_${key}`);
        } catch (_) { }
    }

   

    window.__cfll_persistence = {
        getProblemKey,
        loadCode,
        saveCode,
        clearCode
    };
})();
