// Test: if we strip html-inline shells and keep just display content
import { JSDOM } from "jsdom";
import { readFileSync } from "fs";

const LUTE_PATH = "/Users/linlifei/templateWithNode/vscode-office/vditor/src/js/lute/lute.min.js";
const luteSource = readFileSync(LUTE_PATH, "utf8");

const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/", runScripts: "outside-only" });
const { window } = dom;
window.eval(luteSource);
const Lute = window.Lute;
const lute = Lute.New();

const userDom = `<p data-block="0"><span class="vditor-ir__node vditor-html-inline--readonly" contenteditable="false" data-type="html-inline" data-md-source="&lt;span style=&quot;background-color:#fed7aa&quot;&gt;示例页面&lt;/span&gt;"><span class="vditor-html-inline__display"><span style="background-color:#fed7aa">示例<span class="vditor-ir__node vditor-html-inline--readonly" contenteditable="false" data-type="html-inline" data-md-source="&lt;span style=&quot;color:#dc2626&quot;&gt;页面&lt;/span&gt;"><span class="vditor-html-inline__display"><span style="color:#dc2626">页面</span></span></span></span></span></span></p>`;

console.log("=== 原始：剥壳前 ===");
console.log(JSON.stringify(lute.VditorIRDOM2Md(userDom)));

// 在 jsdom 里手动剥掉 html-inline shells
const dom2 = new JSDOM(userDom);
const doc = dom2.window.document;

// 先剥内层（深度优先）
const allShells = Array.from(doc.querySelectorAll('[data-type="html-inline"]'));
allShells.sort((a, b) => {
    if (a.contains(b)) return 1;
    if (b.contains(a)) return -1;
    return 0;
});

for (const shell of allShells) {
    const display = shell.querySelector(':scope > .vditor-html-inline__display');
    const parent = shell.parentNode;
    if (display) {
        const fragment = doc.createDocumentFragment();
        while (display.firstChild) fragment.appendChild(display.firstChild);
        parent.insertBefore(fragment, shell);
    } else {
        while (shell.firstChild) parent.insertBefore(shell.firstChild, shell);
    }
    shell.remove();
}

const stripped = doc.body.innerHTML;
console.log("\n=== 剥壳后的 DOM ===");
console.log(stripped);

console.log("\n=== 剥壳后 Lute 序列化 ===");
console.log(JSON.stringify(lute.VditorIRDOM2Md(stripped)));

// 单层场景
const singleDom = `<p data-block="0">before<span class="vditor-ir__node vditor-html-inline--readonly" contenteditable="false" data-type="html-inline" data-md-source="&lt;span style=&quot;color:red&quot;&gt;red&lt;/span&gt;"><span class="vditor-html-inline__display"><span style="color:red">red</span></span></span>after</p>`;
const dom3 = new JSDOM(singleDom);
const doc3 = dom3.window.document;
for (const shell of doc3.querySelectorAll('[data-type="html-inline"]')) {
    const display = shell.querySelector(':scope > .vditor-html-inline__display');
    const parent = shell.parentNode;
    if (display) {
        const fragment = doc3.createDocumentFragment();
        while (display.firstChild) fragment.appendChild(display.firstChild);
        parent.insertBefore(fragment, shell);
    } else {
        while (shell.firstChild) parent.insertBefore(shell.firstChild, shell);
    }
    shell.remove();
}
console.log("\n=== 单层剥壳后 DOM ===");
console.log(doc3.body.innerHTML);
console.log("\n=== 单层剥壳后 Lute 序列化 ===");
console.log(JSON.stringify(lute.VditorIRDOM2Md(doc3.body.innerHTML)));