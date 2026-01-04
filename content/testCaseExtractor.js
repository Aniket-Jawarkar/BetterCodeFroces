
(function () {
    'use strict';

    
    function normalizeText(s) {
        if (!s) return '';
        return s
            .replace(/\r\n/g, '\n')
            .replace(/\u00a0/g, ' ') // non-breaking spaces
            .trim();
    }

 
    function extractBlockText(node) {
        if (!node) return '';

        const pre = node.querySelector('pre');
        if (pre) {
            return normalizeText(pre.textContent);
        }

       
        let text = '';
        const walker = document.createTreeWalker(
            node,
            NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
            null
        );

        let current;
        while ((current = walker.nextNode())) {
            if (current.nodeType === Node.TEXT_NODE) {
                text += current.nodeValue;
            } else if (current.nodeType === Node.ELEMENT_NODE) {
                if (current.tagName === 'BR') {
                    text += '\n';
                }
            }
        }

        return normalizeText(text);
    }

   
    function extractSamples() {
        const samples = [];

        
        const sampleBlocks = document.querySelectorAll('.sample-test');

        if (sampleBlocks.length > 0) {
            sampleBlocks.forEach((block) => {
                const inputNode = block.querySelector('.input');
                const outputNode = block.querySelector('.output');

                const input = extractBlockText(inputNode);
                const output = extractBlockText(outputNode);

                if (input !== '' || output !== '') {
                    samples.push({ input, output });
                }
            });

            return samples;
        }

      
        const problemStatement = document.querySelector('.problem-statement');
        if (!problemStatement) return samples;

        const pres = Array.from(problemStatement.querySelectorAll('pre'));
        if (pres.length >= 2) {
            // Heuristic: assume alternating input/output
            for (let i = 0; i + 1 < pres.length; i += 2) {
                const input = normalizeText(pres[i].textContent);
                const output = normalizeText(pres[i + 1].textContent);
                samples.push({ input, output });
            }
        }

        return samples;
    }

    function renderSamples(container) {
        if (!container) return;

        const samples = extractSamples();
        container.innerHTML = '';

        if (samples.length === 0) {
            container.innerHTML = `<div style="color:#666">No sample tests detected.</div>`;
            return;
        }

        samples.forEach((s, idx) => {
            const el = document.createElement('div');
            el.style.borderTop = '1px dashed rgba(0,0,0,0.08)';
            el.style.padding = '8px 0';

            el.innerHTML = `
        <div style="font-weight:600">Sample #${idx + 1}</div>
        <div>
          <strong>Input</strong>
          <pre style="white-space:pre-wrap;margin:6px 0;">${escapeHtml(s.input)}</pre>
        </div>
        <div>
          <strong>Expected Output</strong>
          <pre style="white-space:pre-wrap;margin:6px 0;">${escapeHtml(s.output)}</pre>
        </div>
      `;

            container.appendChild(el);
        });
    }

    function escapeHtml(s) {
        return (s || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    // Expose API
    window.__cfll_testcase_extractor = {
        extract: extractSamples,
        render: renderSamples
    };
})();
