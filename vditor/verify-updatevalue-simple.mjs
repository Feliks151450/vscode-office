// 验证：vditor.updateValue(原始 markdown) 直接替换
import { JSDOM } from "jsdom";
import { readFileSync } from "fs";

const LUTE_PATH = "/Users/linlifei/templateWithNode/vscode-office/vditor/src/js/lute/lute.min.js";
const luteSource = readFileSync(LUTE_PATH, "utf8");

const dom = new JSDOM("<!doctype html><html><body><div id='editor'></div></body></html>", { url: "http://localhost/", runScripts: "outside-only" });
const { window } = dom;
window.eval(luteSource);
const Lute = window.Lute;
const lute = Lute.New();
lute.SetSanitize(false);
const { document } = window;
const ZWSP = "";

const editor = document.getElementById("editor");
editor.innerHTML = `<p data-block="0">这是一个 <span class="vditor-ir__node vditor-html-inline--readonly" contenteditable="false" data-type="html-inline" data-md-source="<span>示例页面</span>"><span class="vditor-html-inline__display"><span>示例页面</span></span></span>。</p>`;

const shell = editor.querySelector('[data-type="html-inline"]');

// 用户场景的 markdown（visualHostToMarkdown 的输出）
const newMd = `<span style="background-color: rgb(253, 230, 138);">示例<span style="color: rgb(220, 38, 38);">页面</span></span>`;

// 1. 选中 shell
const range = document.createRange();
range.setStartBefore(shell);
range.setEndAfter(shell);
const sel = window.getSelection();
sel.removeAllRanges();
sel.addRange(range);

// 2. 把 markdown 包成 html-inline shell HTML（这样 input 管道能正确处理）
const shellHtml = lute.Md2VditorDOM(ZWSP + newMd + ZWSP);
const shellWrapper = document.createElement("div");
shellWrapper.innerHTML = shellHtml;
const shellNode = shellWrapper.querySelector('[data-type="html-inline"]');
const newHtml = shellNode.outerHTML;
console.log("=== 用 Lute 渲染后的 newHtml (含 html-inline shell) ===");
console.log(newHtml.slice(0, 200) + "...");
console.log();

// 3. 用 updateValue 替换
const r = document.createRange();
r.setStartBefore(shell);
r.setEndAfter(shell);
sel.removeAllRanges();
sel.addRange(r);
sel.getRangeAt(0).deleteContents();
const wrapper = document.createElement("div");
wrapper.innerHTML = newHtml;
const fragment = document.createDocumentFragment();
while (wrapper.firstChild) fragment.appendChild(wrapper.firstChild);
sel.getRangeAt(0).insertNode(fragment);

console.log("=== updateValue 后编辑器 ===");
console.log(editor.innerHTML);
console.log();

// 3. 模拟编辑器 IR 模式的 input 处理（wysiwyg/ir 模式在 input 事件后调 SpinVditorIRDOM 重新处理）
// 实际编辑器在 updateValue 触发的 input 事件后会执行这个
const spun = lute.SpinVditorIRDOM(editor.innerHTML);
editor.innerHTML = spun;
console.log("=== SpinVditorIRDOM 后（模拟编辑器 input 处理）===");
console.log(editor.innerHTML);
console.log();

const newShells = editor.querySelectorAll('[data-type="html-inline"]');
console.log(`html-inline shell 数量: ${newShells.length}`);
for (const s of newShells) {
    console.log(`  data-md-source: ${s.getAttribute("data-md-source")?.slice(0, 80)}`);
}

const allStyledSpans = editor.querySelectorAll('span[style]');
console.log(`\n所有 styled span 数量: ${allStyledSpans.length}`);
for (const s of allStyledSpans) {
    console.log(`  <span style="${s.getAttribute("style")}"> 内容: "${s.textContent}"`);
}

// getValue 模拟：buildEditorHtmlForMarkdown 调 Lute 序列化
console.log("\n=== getValue 输出（直接 Lute 序列化）===");
const finalMd = lute.VditorDOM2Md(editor.innerHTML);
console.log(JSON.stringify(finalMd));

const checks = {
    "包含 background-color:rgb(253": finalMd.includes("background-color: rgb(253"),
    "包含 color:rgb(220": finalMd.includes("color: rgb(220"),
    "包含 '示例'": finalMd.includes("示例"),
    "包含 '页面'": finalMd.includes("页面"),
    "不为空": finalMd.trim() !== "",
};
for (const [k, v] of Object.entries(checks)) {
    console.log(`  ${v ? "✅" : "❌"} ${k}`);
}
if (!Object.values(checks).every(Boolean)) process.exitCode = 1;