import { JSDOM } from "jsdom";
import { readFileSync } from "fs";

const LUTE_PATH = "/Users/linlifei/templateWithNode/vscode-office/vditor/src/js/lute/lute.min.js";
const luteSource = readFileSync(LUTE_PATH, "utf8");

const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/", runScripts: "outside-only" });
const { window } = dom;
window.eval(luteSource);
const Lute = window.Lute;
const lute = Lute.New();
lute.SetSanitize(false);

const userDom = `<p data-block="0"><span class="vditor-ir__node vditor-html-inline--readonly" contenteditable="false" data-type="html-inline" data-md-source="&lt;span style=&quot;background-color:#fed7aa&quot;&gt;示例页面&lt;/span&gt;"><span class="vditor-html-inline__display"><span style="background-color:#fed7aa">示例<span class="vditor-ir__node vditor-html-inline--readonly" contenteditable="false" data-type="html-inline" data-md-source="&lt;span style=&quot;color:#dc2626&quot;&gt;页面&lt;/span&gt;"><span class="vditor-html-inline__display"><span style="color:#dc2626">页面</span></span></span></span></span></span></p>`;

const dom2 = new JSDOM(userDom);
const doc = dom2.window.document;

// 修复尝试：从外层 shell 移除 vditor-html-inline--readonly class（因为有嵌套）
const outerShell = doc.querySelector('[data-type="html-inline"]');
outerShell.classList.remove('vditor-html-inline--readonly');

console.log("=== 尝试 1：只从外层移除 class ===");
console.log("处理后 DOM:", doc.body.innerHTML);
console.log("Lute 输出:", JSON.stringify(lute.VditorIRDOM2Md(doc.body.innerHTML)));

// 重置并尝试：从所有 shell 移除 class
const dom3 = new JSDOM(userDom);
const doc3 = dom3.window.document;
for (const shell of doc3.querySelectorAll('[data-type="html-inline"]')) {
    shell.classList.remove('vditor-html-inline--readonly');
    // 也移除 contenteditable 看看
    shell.removeAttribute('contenteditable');
}

console.log("\n=== 尝试 2：从所有 shell 移除 class + contenteditable ===");
console.log("处理后 DOM:", doc3.body.innerHTML);
console.log("Lute 输出:", JSON.stringify(lute.VditorIRDOM2Md(doc3.body.innerHTML)));

// 尝试 3：外层 data-md-source 改成完整嵌套源 + 移除内层 shell
const dom4 = new JSDOM(userDom);
const doc4 = dom4.window.document;
const outer4 = doc4.querySelector('[data-type="html-inline"]');
outer4.classList.remove('vditor-html-inline--readonly');
outer4.removeAttribute('contenteditable');
outer4.setAttribute('data-md-source', '<span style="background-color:#fed7aa">示例<span style="color:#dc2626">页面</span></span>');
// 移除内层 shell
const innerShells = Array.from(outer4.querySelectorAll('[data-type="html-inline"]'));
innerShells.sort((a, b) => a.contains(b) ? 1 : (b.contains(a) ? -1 : 0));
for (const inner of innerShells) {
    const display = inner.querySelector(':scope > .vditor-html-inline__display');
    const parent = inner.parentNode;
    if (display) {
        while (display.firstChild) parent.insertBefore(display.firstChild, inner);
    }
    inner.remove();
}

console.log("\n=== 尝试 3：外层移除特殊 class + data-md-source 改成完整源 + 移除内层 shell ===");
console.log("处理后 DOM:", doc4.body.innerHTML);
console.log("Lute 输出:", JSON.stringify(lute.VditorIRDOM2Md(doc4.body.innerHTML)));