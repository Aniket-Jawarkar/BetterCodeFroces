

'use strict';

(function () {

    const PISTON_ENDPOINT = 'https://emkc.org/api/v2/piston/execute';
    function mapFamilyToPiston(family) {
        const map = {
            'cpp': { language: 'c++', version: '10.2.0' },
            'python': { language: 'python', version: '3.10.0' },
            'python2': { language: 'python2', version: '2.7.18' },
            'java': { language: 'java', version: '15.0.2' },
            'kotlin': { language: 'kotlin', version: '1.8.20' },
            'rust': { language: 'rust', version: '1.68.2' },
            'javascript': { language: 'javascript', version: '18.15.0' }, // Node
            'go': { language: 'go', version: '1.16.2' },
            'ruby': { language: 'ruby', version: '3.0.1' },
        };
        // Normalize
        return map[family?.toLowerCase()] || null;
    }

    
    async function executeOnce(code, pistonLang, input) {
        const body = {
            language: pistonLang.language,
            version: pistonLang.version,
            files: [
                {
                    name: 'main',
                    content: code
                }
            ],
            stdin: input || '',
            args: [],
            compile_timeout: 10000,
            run_timeout: 3000,
            compile_memory_limit: -1,
            run_memory_limit: -1
        };

        const resp = await fetch(PISTON_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (!resp.ok) {
            let errMsg = `Execution API failed: HTTP ${resp.status}`;
            try {
                const errData = await resp.json();
                if (errData && errData.message) {
                    errMsg += ` - ${errData.message}`;
                }
            } catch (e) {
             
            }
            throw new Error(errMsg);
        }

        const data = await resp.json();

        return {
            stdout: (data.run?.stdout || '').trimEnd(),
            stderr: (data.run?.stderr || '').trimEnd(),
            exitCode: data.run?.code
        };
    }

    function normalize(s) {
        return (s || '')
            .replace(/\r\n/g, '\n')
            .trim()
            .split('\n')
            .map(line => line.trimEnd())
            .join('\n');
    }

    self.__cfll_runWorker = async function (payload) {
        if (!payload || !payload.code || !Array.isArray(payload.samples)) {
            return { error: 'Invalid run payload' };
        }

        const code = payload.code;
        const samples = payload.samples;

        
        let pistonLang = mapFamilyToPiston(payload.langFamily);

        
        if (!pistonLang && payload.langId) {
           
            if (payload.langId === '7' || payload.langId === '41') {
                pistonLang = { language: 'python2', version: '2.7.18' };
            }
        }

        if (!pistonLang) {
            return { error: `Unsupported Language Family: "${payload.langFamily || payload.langId}". Please contact support.` };
        }

        const results = [];

        for (let i = 0; i < samples.length; i++) {
            const sample = samples[i];
            const input = sample.input || '';
            const expected = sample.output || '';

            try {
                const exec = await executeOnce(code, pistonLang, input);

                const normOut = normalize(exec.stdout);
                const normExp = normalize(expected);

                results.push({
                    input,
                    expected,
                    stdout: exec.stdout,
                    stderr: exec.stderr,
                    exitCode: exec.exitCode,
                    passed: normOut === normExp
                });
            } catch (err) {
                results.push({
                    input,
                    expected,
                    stdout: '',
                    stderr: err.message || String(err),
                    exitCode: -1,
                    passed: false
                });
            }
        }

        return { results };
    };

})();
