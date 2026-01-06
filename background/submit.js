
'use strict';

(function () {

    self.__cfll_submitWorker = async function (payload, sender) {
        if (!sender || !sender.tab || typeof sender.tab.id === 'undefined') {
            return { error: 'No tab context available for submission.' };
        }
        const tabId = sender.tab.id;
        const inTabSubmit = async (pl) => {
            try {
                const code = pl.code || '';
                const langId = pl.langId || '';
                const problem = pl.problem || {};
                const contestId = problem.contestId;
                const problemIndex = problem.problemIndex;

           
                let submitUrl;
                if (contestId && contestId !== 'problemset' && contestId !== 'unknown') {
                    submitUrl = `${location.origin}/contest/${contestId}/submit`;
                } else {
                    submitUrl = `${location.origin}/problemset/submit`;
                }

               
                let csrfToken = window.csrfToken;
                if (!csrfToken) {
                    const meta = document.querySelector('meta[name="X-Csrf-Token"]') || document.querySelector('meta[name="csrf-token"]');
                    if (meta) csrfToken = meta.content;
                }
                if (!csrfToken) {
                 
                }

                if (!csrfToken) {
                    return { error: 'Could not find CSRF token on the page.' };
                }

             
                const form = document.createElement('form');
                form.method = 'POST';
                form.action = submitUrl;
                form.style.display = 'none';

                const addInput = (name, value) => {
                    const input = document.createElement('input');
                    input.type = 'hidden';
                    input.name = name;
                    input.value = value;
                    form.appendChild(input);
                };

                addInput('csrf_token', csrfToken);
                addInput('action', 'submitSolutionFormSubmitted');
                addInput('contestId', contestId);
                addInput('submittedProblemIndex', problemIndex);
                addInput('programTypeId', langId);
                addInput('source', code);

       
                document.body.appendChild(form);
                form.submit();

                return {
                    ok: true,
                    status: 200,
                    message: 'Submission initiated via form. Redirecting...',
                    url: null
                };

            } catch (err) {
                return { error: 'Form submission error: ' + (err.message || String(err)) };
            }
        }; 

        try {
         
            const execRes = await chrome.scripting.executeScript({
                target: { tabId: tabId },
                func: inTabSubmit,
                args: [payload],
            });

            if (!Array.isArray(execRes) || execRes.length === 0) {
                return { error: 'No response from tab script execution.' };
            }
            const result = execRes[0].result;

            
            if (result && result.error) {
                return { error: result.error, details: result };
            }

            try {
                if (result && result.url) {
                  
                    const final = result.url;
                    
                    await chrome.tabs.create({ url: final });
                }
            } catch (openErr) {
                
                console.warn('[CF-LL] Could not open results tab', openErr);
            }


            return {
                ok: !!result.ok,
                status: result.status,
                url: result.url,
                message: result.message || 'Submitted (see opened tab)',
            };
        } catch (e) {
            console.error('[CF-LL][submitWorker] Execution error', e);
            return { error: e?.message || String(e) };
        }
    }; 

})();
