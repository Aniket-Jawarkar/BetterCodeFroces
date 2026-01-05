

'use strict';

(function () {

    const PISTON_ENDPOINT = 'https://emkc.org/api/v2/piston/execute';


    function mapLangIdToPiston(langId) {
        const map = {
            // C++
            '54': { language: 'cpp', version: '17' },
            '62': { language: 'cpp', version: '20' },

            // Python
            '31': { language: 'python', version: '3.10' },

            // Java
            '36': { language: 'java', version: '17' },

            // Kotlin
            '49': { language: 'kotlin', version: '1.9' },

            // Rust
            '69': { language: 'rust', version: '1.74' },

            // JavaScript
            '63': { language: 'javascript', version: '18' }
        };

        return map[langId] || map['54']; //  C++17
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
            throw new Error(`Execution API failed: HTTP ${resp.status}`);
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
        const langId = payload.langId;

        const pistonLang = mapLangIdToPiston(langId);
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
