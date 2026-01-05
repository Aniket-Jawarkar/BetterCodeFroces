

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

const els = {
    defaultLanguage: document.getElementById('defaultLanguage'),
    templateLanguage: document.getElementById('templateLanguage'),
    templateEditor: document.getElementById('templateEditor'),
    saveTemplate: document.getElementById('saveTemplate'),
    saveStatus: document.getElementById('saveStatus'),
    runner: document.getElementById('runner')
};



function get(key) {
    return new Promise((resolve) => {
        chrome.storage.local.get(key, (res) => {
            resolve(res[key]);
        });
    });
}

function set(obj) {
    return new Promise((resolve) => {
        chrome.storage.local.set(obj, resolve);
    });
}



async function init() {
    // Default language
    const defaultLang = await get('defaultLanguage');
    if (defaultLang && els.defaultLanguage) {
        els.defaultLanguage.value = defaultLang;
    }

    // Runner
    const runner = await get('runner');
    if (runner && els.runner) {
        els.runner.value = runner;
    }

   
    await loadTemplateForSelectedLanguage();
}



async function loadTemplateForSelectedLanguage() {
    const lang = els.templateLanguage.value;
    const key = `template_${lang}`;

    let template = await get(key);
    if (!template) {
        template = DEFAULT_TEMPLATES[lang] || '';
    }

    els.templateEditor.value = template;
    els.saveStatus.textContent = '';
}

async function saveTemplate() {
    const lang = els.templateLanguage.value;
    const code = els.templateEditor.value;

    await set({
        [`template_${lang}`]: code
    });

    els.saveStatus.textContent = 'Saved ✓';
    setTimeout(() => (els.saveStatus.textContent = ''), 1500);
}



els.defaultLanguage.addEventListener('change', async () => {
    await set({ defaultLanguage: els.defaultLanguage.value });
});

els.runner.addEventListener('change', async () => {
    await set({ runner: els.runner.value });
});

els.templateLanguage.addEventListener('change', loadTemplateForSelectedLanguage);

els.saveTemplate.addEventListener('click', saveTemplate);


document.addEventListener('DOMContentLoaded', init);
