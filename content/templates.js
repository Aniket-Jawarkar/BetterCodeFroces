
(() => {
    'use strict';

    const DEFAULT_TEMPLATES = {
        cpp: `#include <bits/stdc++.h>
using namespace std;

int main() {
    |
    return 0;
}
`,
        python: `def main():
    |

if __name__ == "__main__":
    main()
`,
        java: `public class Main {
    public static void main(String[] args) {
        |
    }
}
`,
        kotlin: `fun main() {
    |
}
`,
        rust: `fn main() {
    |
}
`,
        javascript: `function main() {
    |
}

main();
`
    };

  

    function getFromChromeStorage(key) {
        return new Promise((resolve) => {
            try {
                chrome.storage?.local.get(key, (res) => resolve(res[key]));
            } catch (_) {
                resolve(undefined);
            }
        });
    }

    function getFromLocalStorage(key) {
        try {
            return localStorage.getItem(key);
        } catch (_) {
            return null;
        }
    }


    async function getTemplate(simpleLang = 'cpp') {
        const storageKey = `template_${simpleLang}`;

        
        let tpl = await getFromChromeStorage(storageKey);

   
        if (!tpl) {
            tpl = getFromLocalStorage(`cf-ll-template_${simpleLang}`);
        }

     
        if (!tpl) {
            tpl = DEFAULT_TEMPLATES[simpleLang] || DEFAULT_TEMPLATES.cpp;
        }

        const cursorIndex = tpl.indexOf('|');
        const code = tpl.replace('|', '');

        return {
            code,
            cursorIndex
        };
    }

    async function applyTemplate(editor, simpleLang = 'cpp') {
        if (!editor) return;

        const { code, cursorIndex } = await getTemplate(simpleLang);
        editor.setValue(code);

        const model = editor.getModel();
        if (!model) return;

        if (cursorIndex >= 0) {
            const pos = model.getPositionAt(cursorIndex);
            editor.setPosition(pos);
        } else {
            const pos = model.getPositionAt(model.getValueLength());
            editor.setPosition(pos);
        }
    }

    

    window.__cfll_templates = {
        getTemplate,
        applyTemplate
    };
})();
