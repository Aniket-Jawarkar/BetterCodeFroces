

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
              
                let submitHref = null;
               
                try {
                    const anchors = Array.from(document.querySelectorAll('a[href*="/submit"]'));
                    if (anchors.length > 0) {
                       
                        const a = anchors.find(a => /\/contest\/\d+\/submit/.test(a.href)) || anchors[0];
                        submitHref = a.href;
                    }
                } catch (e) {
                    // ignore
                }
                if (!submitHref) {
                   
                    if (problem && problem.contestId && problem.contestId !== 'problemset' && problem.contestId !== 'unknown') {
                        submitHref = `${location.origin}/contest/${problem.contestId}/submit`;
                    } else {
                     
                        submitHref = `${location.origin}/problemset/submit`;
                    }
                }

               
                const getResp = await fetch(submitHref, { credentials: 'include', method: 'GET', redirect: 'follow' });
                if (!getResp.ok) {
                    return { error: `Failed to fetch submit page: HTTP ${getResp.status}` };
                }
                const htmlText = await getResp.text();

               
                const parser = new DOMParser();
                const doc = parser.parseFromString(htmlText, 'text/html');
      
                let form = Array.from(doc.querySelectorAll('form')).find(f => /\/submit/.test(f.getAttribute('action') || '')) || doc.querySelector('form');
                if (!form) {
                  
                    return { error: 'Submission form not found on submit page.' };
                }

              
                const params = {};
            
                const fields = Array.from(form.querySelectorAll('input, textarea, select'));
                fields.forEach((el) => {
                    const name = el.getAttribute('name');
                    if (!name) return;
                    // For select, get selected value
                    if (el.tagName.toLowerCase() === 'select') {
                        params[name] = el.value;
                    } else if (el.tagName.toLowerCase() === 'textarea') {
                        params[name] = el.value;
                    } else {
                        params[name] = el.getAttribute('value') || el.value || '';
                    }
                });

                
                let sourceField = null;
                const textareaCandidates = fields.filter(f => f.tagName.toLowerCase() === 'textarea' && f.getAttribute('name'));
                if (textareaCandidates.length > 0) {
                    sourceField = textareaCandidates[0].getAttribute('name');
                }
                if (!sourceField) {
                
                    const fallbacks = ['source', 'sourceCode', 'code'];
                    for (const n of fallbacks) {
                        if (Object.prototype.hasOwnProperty.call(params, n)) { sourceField = n; break; }
                    }
                }
                if (!sourceField) {
                   
                    sourceField = 'source';
                }

             
                params[sourceField] = code;
                if (langId) params['programTypeId'] = langId;
             
                if (problem && problem.problemIndex) {
                   
                    if (Object.prototype.hasOwnProperty.call(params, 'submittedProblemIndex')) {
                        params['submittedProblemIndex'] = problem.problemIndex;
                    } else if (Object.prototype.hasOwnProperty.call(params, 'problemIndex')) {
                        params['problemIndex'] = problem.problemIndex;
                    } else {
                        
                        params['submittedProblemIndex'] = problem.problemIndex;
                    }
                }

        
                if (!params['csrf_token']) {
                 
                    const meta = doc.querySelector('meta[name="csrf-token"]') || document.querySelector('meta[name="csrf-token"]');
                    if (meta && meta.getAttribute('content')) {
                        params['csrf_token'] = meta.getAttribute('content');
                    } else {
                       
                        const match = document.cookie.match(/csrf_token=([^;]+)/);
                        if (match) params['csrf_token'] = decodeURIComponent(match[1]);
                    }
                }

   
                const bodyPairs = [];
                for (const k in params) {
                    if (!Object.prototype.hasOwnProperty.call(params, k)) continue;
                
                    bodyPairs.push(`${encodeURIComponent(k)}=${encodeURIComponent(params[k] ?? '')}`);
                }
                const postBody = bodyPairs.join('&');

                let actionUrl = form.getAttribute('action') || submitHref;
         
                try {
                    actionUrl = new URL(actionUrl, submitHref).href;
                } catch (e) {
                    actionUrl = submitHref;
                }

           
                const postResp = await fetch(actionUrl, {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    body: postBody,
                    redirect: 'follow'
                });

               
                const finalUrl = postResp.url || null;
                const status = postResp.status;
                const ok = postResp.ok;
                const text = await postResp.text().catch(() => '');
              
                const lower = text.slice(0, 2048).toLowerCase();
                let userMessage = null;
                if (!ok) {
                    userMessage = `HTTP ${status} when submitting`;
                } else if (/csrf/i.test(lower) && /token/i.test(lower)) {
                    userMessage = 'CSRF token error detected in response body.';
                } else if (/login/i.test(lower) && /password/i.test(lower)) {
                    userMessage = 'Login required (session may have expired).';
                }

                return {
                    ok,
                    status,
                    url: finalUrl,
                    message: userMessage || 'Submission request completed. Opened final URL for details.',
                    bodySnippet: text.slice(0, 1024)
                };
            } catch (err) {
                return { error: (err && err.message) ? err.message : String(err) };
            }
        }; // end inTabSubmit

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
