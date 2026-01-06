'use strict';

importScripts(
    './runWorker.js',
    './submit.js'
);


function asyncResponse(handler) {
    return (message, sender, sendResponse) => {
        Promise.resolve(handler(message, sender))
            .then((res) => sendResponse(res))
            .catch((err) => {
                console.error('[CF-LL][BG] Error:', err);
                sendResponse({ error: err?.message || String(err) });
            });
        return true; 
    };
}


async function getLangMapFromTab(tabId) {
    const [{ result }] = await chrome.scripting.executeScript({
        target: { tabId },
        func: () => {
            const select = document.querySelector('select[name="programTypeId"]');
            if (!select) return null;
            const map = {};
            for (const opt of select.options) {
                map[opt.value] = opt.textContent.trim();
            }
            return map;
        }
    });

    return result;
}


chrome.runtime.onMessage.addListener(
    asyncResponse(async (message, sender) => {
        if (!message || !message.action) {
            return { error: 'Invalid message format' };
        }

        switch (message.action) {
          
            case 'run': {
                if (!self.__cfll_runWorker) {
                    throw new Error('Run worker not initialized');
                }
                return await self.__cfll_runWorker(message.payload);
            }

           
            case 'submit': {
                if (!self.__cfll_submitWorker) {
                    throw new Error('Submit worker not initialized');
                }
                return await self.__cfll_submitWorker(message.payload, sender);
            }

          
            case 'getLangMap': {
                if (!sender?.tab?.id) {
                    return { error: 'No tab context' };
                }
                const langMap = await getLangMapFromTab(sender.tab.id);
                return { langMap };
            }

            
            case 'getTemplate': {
                const langKey = message.payload.lang; 
                const storageKey = `cf-ll-template-${langKey}`;
                const res = await chrome.storage.local.get(storageKey);
                return { template: res[storageKey] };
            }

         
            case 'editorReady': {
         
                console.debug('[CF-LL][BG] Editor ready for', message.payload);
                return { ok: true };
            }

            default:
                return { error: `Unknown action: ${message.action}` };
        }
    })
);


self.addEventListener('install', () => {
    console.debug('[CF-LL][BG] Service worker installed');
});

self.addEventListener('activate', () => {
    console.debug('[CF-LL][BG] Service worker activated');
});
