

'use strict';

const DEFAULT_TEMPLATES = {
    cpp: `#include <bits/stdc++.h>
using namespace std;

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);
    |
    return 0;
}
`,

    python: `import sys

def solve():
    |

if __name__ == "__main__":
    solve()
`,
    java: `import java.util.*;
import java.io.*;

public class Main {
    static class FastReader {
        BufferedReader br;
        StringTokenizer st;

        public FastReader() {
            br = new BufferedReader(new InputStreamReader(System.in));
        }

        String next() {
            while (st == null || !st.hasMoreElements()) {
                try {
                    st = new StringTokenizer(br.readLine());
                } catch (IOException e) {
                    e.printStackTrace();
                }
            }
            return st.nextToken();
        }

        int nextInt() { return Integer.parseInt(next()); }
        long nextLong() { return Long.parseLong(next()); }
        double nextDouble() { return Double.parseDouble(next()); }
        String nextLine() {
            String str = "";
            try {
                str = br.readLine();
            } catch (IOException e) {
                e.printStackTrace();
            }
            return str;
        }
    }

    public static void main(String[] args) {
        FastReader sc = new FastReader();
        // |
    }
}
`,
    kotlin: `import java.util.Scanner

fun main() {
    val sc = Scanner(System.\`in\`)
    |
}
`,
    rust: `use std::io;

fn main() {
    let mut input = String::new();
    io::stdin().read_line(&mut input).expect("Failed to read line");
    |
}
`,
    javascript: `const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.on('line', (line) => {
    // |
    rl.close();
});
`,
    go: `package main

import (
    "bufio"
    "fmt"
    "os"
)

func main() {
    in := bufio.NewReader(os.Stdin)
    out := bufio.NewWriter(os.Stdout)
    defer out.Flush()
    
    // |
}
`,
    ruby: `#!/usr/bin/ruby

# |
`
};

const els = {
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
    // Runner
    const runner = await get('runner');
    if (runner && els.runner) {
        els.runner.value = runner;
    }

    //  initial template
    await loadTemplateForSelectedLanguage();
}



async function loadTemplateForSelectedLanguage() {
    const lang = els.templateLanguage.value;
    const key = `cf-ll-template-${lang}`; // Updated key format

    let template = await get(key);
    if (!template) {
        
        const legacy = await get(`template_${lang}`);
        if (legacy) {
            template = legacy;
          
        } else {
            template = DEFAULT_TEMPLATES[lang] || '';
        }
    }

    els.templateEditor.value = template;
    els.saveStatus.textContent = '';
}

async function saveTemplate() {
    const lang = els.templateLanguage.value;
    const code = els.templateEditor.value;

    const key = `cf-ll-template-${lang}`;
    await set({
        [key]: code
    });

    els.saveStatus.textContent = 'Saved ✓';
    setTimeout(() => (els.saveStatus.textContent = ''), 1500);
}



if (els.runner) {
    els.runner.addEventListener('change', async () => {
        await set({ runner: els.runner.value });
    });
}

els.templateLanguage.addEventListener('change', loadTemplateForSelectedLanguage);

els.saveTemplate.addEventListener('click', saveTemplate);


document.addEventListener('DOMContentLoaded', init);
