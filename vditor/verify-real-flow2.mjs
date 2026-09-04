// 更严谨的真实流程测试
import { JSDOM } from "jsdom";
import { readFileSync } from "fs";

const LUTE_PATH = "/Users/linlifei/templateWithNode/vscode-office/vditor/src/js/lute/lute.min.js";
const luteSource = readFileSync(LUTE_PATH, "utf8");

const dom = new JSDOM("<!doctype html><html><body><div id='editor'></div></body></html>", {
    url: "http://localhost/",
    runScripts: "outside-only",
});
const { window } = dom;
window.eval(luteSource);
const Lute = window.Lute;
const lute = Lute.New();
lute.SetSanitize(false);

const ZWSP = "​";
const document = window.document;
const editor = document.getElementById("editor");

// === 复制的辅助函数（与 codeMirrorManager.ts 完全一致）===
const buildNestedHtmlInlineMd = (outerShell) => {
    const display = outerShell.querySelector(":scope > .vditor-html-inline__display");
    if (!display) return "";
    const walk = (node) => {
        if (node.nodeType === 3) return (node.textContent || "").replaceAll(ZWSP, "");
        if (node.nodeType !== 1) return "";
        const el = node;
        if (el.getAttribute("data-type") === "html-inline") {
            return el.getAttribute("data-md-source") || "";
        }
        const children = Array.from(el.childNodes).map(walk).join("");
        if (el.tagName === "SPAN" && el.hasAttribute("style")) {
            return `<span style="${el.getAttribute("style")}">${children}</span>`;
        }
        return children;
    };
    return walk(display).trim();
};

const depthOf = (el) => {
    let d = 0;
    let n = el;
    while (n?.parentElement) { d++; n = n.parentElement; }
    return d;
};

const flattenNestedHtmlInline = (root) => {
    const allShells = Array.from(root.querySelectorAll('[data-type="html-inline"]'));
    if (allShells.length === 0) return;
    allShells.sort((a, b) => depthOf(b) - depthOf(a));
    for (const shell of allShells) {
        if (!shell.querySelector('[data-type="html-inline"]')) continue;
        const fullMd = buildNestedHtmlInlineMd(shell);
        if (!fullMd) continue;
        shell.classList.remove("vditor-html-inline--readonly");
        shell.removeAttribute("contenteditable");
        shell.setAttribute("data-md-source", fullMd);
        const openTagMatch = fullMd.match(/^<[a-zA-Z][^>]*>/);
        if (openTagMatch && shell.hasAttribute("data-open-tag")) {
            shell.setAttribute("data-open-tag", openTagMatch[0]);
        }
    }
};

// === 模拟编辑器的真实流程 ===
console.log("=== 真实流程测试 ===\n");

// Step 1: 用户在 IR 模式下输入原始文本 "示例页面"
console.log("Step 1: 用户输入纯文本 '示例页面'");
editor.innerHTML = `<p data-block="0">示例页面</p>`;

// Step 2: 用户选中文本，应用背景色（走 setSelectionColor 或 popover）
// setSelectionColor 通过 Md2VditorDOM + 替换选区实现
console.log("Step 2: 应用背景色 #fed7aa");
const bgHtml = lute.Md2VditorDOM(ZWSP + '<span style="background-color:#fed7aa">示例页面</span>' + ZWSP);
editor.innerHTML = `<p data-block="0">${bgHtml}</p>`;
// Lute 的 IR 模式下，html-inline 可能有不同输出
console.log("设置背景色后编辑器 DOM:");
console.log(editor.innerHTML);
console.log();

// 模拟 processAfterRender：SpinVditorIRDOM
let spun = lute.SpinVditorIRDOM(editor.innerHTML);
editor.innerHTML = spun;
console.log("SpinVditorIRDOM 后:");
console.log(editor.innerHTML);
console.log();

// Step 3: 用户选中部分文本 "页面"，打开 popover，再设置文字色
// 模拟 popover 流程：visualHost 包含 styled span（来自 renderInlineHtmlForPreview 的 display）
// 用户选 "页面" → applyStyleInPreview Branch B（wrap）→ nested
console.log("Step 3: 用户选 '页面'，应用文字色 #dc2626（Branch B wrap）");

// 直接构造：嵌套的 html-inline shell，由 Lute 生成
const nestedHtml = lute.Md2VditorIRDOM(ZWSP + '<span style="background-color:#fed7aa">示例<span style="color:#dc2626">页面</span></span>' + ZWSP);
editor.innerHTML = `<p data-block="0">${nestedHtml}</p>`;
console.log("嵌套后编辑器 DOM:");
console.log(editor.innerHTML);
console.log();

// Spin 一下（IR 模式 input 会调）
spun = lute.SpinVditorIRDOM(editor.innerHTML);
editor.innerHTML = spun;
console.log("SpinVditorIRDOM 后:");
console.log(editor.innerHTML);
console.log();

// Step 4: 用户调用 getValue() → buildEditorHtmlForMarkdown → Lute.VditorIRDOM2Md
console.log("Step 4: 用户调用 getValue()");
const clone = editor.cloneNode(true);
console.log("克隆后（修复前）:");
console.log(clone.innerHTML);
console.log();

flattenNestedHtmlInline(clone);
console.log("flatten 后:");
console.log(clone.innerHTML);
console.log();

const result = lute.VditorIRDOM2Md(clone.innerHTML);
console.log("getValue() 输出:", JSON.stringify(result));

// 验证
console.log("\n=== 验证 ===");
const checks = {
    "包含 background-color:#fed7aa": result.includes("background-color:#fed7aa"),
    "包含 color:#dc2626": result.includes("color:#dc2626"),
    "包含 '示例'": result.includes("示例"),
    "包含 '页面'": result.includes("页面"),
};
for (const [k, v] of Object.entries(checks)) {
    console.log(`  ${v ? "✅" : "❌"} ${k}`);
}
if (!Object.values(checks).every(Boolean)) process.exitCode = 1;