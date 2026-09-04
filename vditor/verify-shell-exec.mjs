// 验证：用 Lute 渲染 markdown → execCommand 插入 → SpinVditorDOM 处理 → getValue 输出
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

// 模拟用户的场景 markdown
const newMd = `<span style="background-color: rgb(253, 230, 138);">示例<span style="color: rgb(220, 38, 38);">页面</span></span>`;

// 1. 用 Lute 渲染为 html-inline shell HTML
const luteRendered = lute.Md2VditorDOM(ZWSP + newMd + ZWSP);
console.log("=== Lute 渲染后的 HTML ===");
console.log(luteRendered.slice(0, 250) + "...");
console.log();

// 2. 选中 shell
const range = document.createRange();
range.setStartBefore(shell);
range.setEndAfter(shell);
const sel = window.getSelection();
sel.removeAllRanges();
sel.addRange(range);

// 3. 模拟 execCommand("insertHTML", false, luteRendered)
sel.getRangeAt(0).deleteContents();
const wrapper = document.createElement("div");
wrapper.innerHTML = luteRendered;
const fragment = document.createDocumentFragment();
while (wrapper.firstChild) fragment.appendChild(wrapper.firstChild);
sel.getRangeAt(0).insertNode(fragment);

console.log("=== execCommand 替换后 ===");
console.log(editor.innerHTML);
console.log();

// 4. 模拟编辑器 wysiwyg 模式的 input 处理（SpinVditorDOM）
const spun = lute.SpinVditorDOM(editor.innerHTML);
editor.innerHTML = spun;
console.log("=== SpinVditorDOM 后 ===");
console.log(editor.innerHTML);
console.log();

// 5. getValue
const finalMd = lute.VditorDOM2Md(editor.innerHTML);
console.log("=== getValue 输出 ===");
console.log(JSON.stringify(finalMd));

const checks = {
    "包含 background-color:rgb(253": finalMd.includes("background-color: rgb(253"),
    "包含 color:rgb(220": finalMd.includes("color: rgb(220"),
    "包含 '示例'": finalMd.includes("示例"),
    "包含 '页面'": finalMd.includes("页面"),
};
for (const [k, v] of Object.entries(checks)) {
    console.log(`  ${v ? "✅" : "❌"} ${k}`);
}
if (!Object.values(checks).every(Boolean)) process.exitCode = 1;