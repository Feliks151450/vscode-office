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
const { document } = window;
const ZWSP = "";

// 模拟 renderHtmlInlineFromMd
function renderHtmlInlineFromMd(md) {
    const trimmed = md.trim();
    if (!trimmed) return "";
    const wrapper = `${ZWSP}${trimmed}${ZWSP}`;
    const html = lute.Md2VditorDOM(wrapper);  // wysiwyg 模式
    const temp = document.createElement("div");
    temp.innerHTML = html;
    const node = temp.querySelector('[data-type="html-inline"]');
    return node?.outerHTML ?? "";
}

// 用户场景
const md = `<span style="background-color: rgb(253, 230, 138);">示例<span style="color: rgb(220, 38, 38);">页面</span></span>`;
const shellHtml = renderHtmlInlineFromMd(md);
console.log("包出来的 html-inline shell:");
console.log(shellHtml);
console.log();
console.log("长度:", shellHtml.length);

// 验证 editor DOM 处理后，html-inline shell 是否保留
const editor = document.createElement("div");
editor.innerHTML = `<p data-block="0">这是一个 <span data-type="html-inline" data-md-source="<span>old</span>">old shell</span>。</p>`;
const oldShell = editor.querySelector('[data-type="html-inline"]');
const range = document.createRange();
range.setStartBefore(oldShell);
range.setEndAfter(oldShell);
const sel = window.getSelection();
sel.removeAllRanges();
sel.addRange(range);
sel.getRangeAt(0).deleteContents();

const wrapper = document.createElement("div");
wrapper.innerHTML = shellHtml;
const fragment = document.createDocumentFragment();
while (wrapper.firstChild) fragment.appendChild(wrapper.firstChild);
sel.getRangeAt(0).insertNode(fragment);

console.log("\n=== 替换后编辑器 ===");
console.log(editor.innerHTML.slice(0, 500));
console.log();

const newShells = editor.querySelectorAll('[data-type="html-inline"]');
console.log(`html-inline shell 数量: ${newShells.length}`);
for (const s of newShells) {
    console.log(`  data-md-source: ${s.getAttribute("data-md-source")?.slice(0, 100)}`);
}

// getValue
const finalMd = lute.VditorDOM2Md(editor.innerHTML);
console.log("\n=== getValue 输出 ===");
console.log(JSON.stringify(finalMd));

const checks = {
    "包含 background-color": finalMd.includes("background-color"),
    "包含 color: rgb(220": finalMd.includes("color: rgb(220"),
    "包含 '示例'": finalMd.includes("示例"),
    "包含 '页面'": finalMd.includes("页面"),
};
for (const [k, v] of Object.entries(checks)) {
    console.log(`  ${v ? "✅" : "❌"} ${k}`);
}
if (!Object.values(checks).every(Boolean)) process.exitCode = 1;