// End-to-end test: simulate the REAL flow from applyStyleInPreview → save → getValue
import { JSDOM } from "jsdom";
import { readFileSync } from "fs";

const LUTE_PATH = "/Users/linlifei/templateWithNode/vscode-office/vditor/src/js/lute/lute.min.js";
const luteSource = readFileSync(LUTE_PATH, "utf8");

const dom = new JSDOM("<!doctype html><html><body><div id='editor'></div></body></html>", { url: "http://localhost/", runScripts: "outside-only", pretendToBeVisual: true });
const { window } = dom;
window.eval(luteSource);
const Lute = window.Lute;
const lute = Lute.New();
lute.SetSanitize(false);

const ZWSP = "";
const document = window.document;
const editor = document.getElementById("editor");

// === 复制的核心函数 ===
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
    }
};

const renderHtmlInlineFromMd = (md) => {
    const trimmed = md.trim();
    if (!trimmed) return "";
    const wrapper = `${ZWSP}${trimmed}${ZWSP}`;
    const html = lute.Md2VditorDOM(wrapper);  // 注意：编辑器用的是 Md2VditorDOM，不是 IRDOM
    const temp = document.createElement("div");
    temp.innerHTML = html;
    const node = temp.querySelector('[data-type="html-inline"]');
    return node?.outerHTML ?? "";
};

const visualHostToMarkdown = (host) => {
    const walk = (node) => {
        if (node.nodeType === 3) return (node.textContent || "").replaceAll(ZWSP, "");
        if (node.nodeType !== 1) return "";
        const el = node;
        const children = Array.from(el.childNodes).map(walk).join("");
        if (el.tagName === "SPAN" && el.hasAttribute("style")) {
            return `<span style="${el.getAttribute("style")}">${children}</span>`;
        }
        return children;
    };
    return walk(host).trim();
};

// === 模拟用户的真实流程 ===

// Step 1: 用户选中文本 "示例页面"，通过 setSelectionColor 设置背景色
const step1Md = '<span style="background-color:#fed7aa">示例页面</span>';
const step1Html = renderHtmlInlineFromMd(step1Md);
console.log("Step 1: 设置背景色后的 shell HTML:");
console.log(step1Html);
editor.innerHTML = step1Html;

const shellAfterStep1 = editor.querySelector('[data-type="html-inline"]');
console.log("\nStep 1: 外层 data-md-source =", shellAfterStep1.getAttribute("data-md-source"));
console.log("Step 1: 外层 class =", shellAfterStep1.className);

// Step 2: 用户打开弹窗 → 编辑 visualHost → 在 visualHost 里选 "页面" → 设置文字色
// visualHost 内容（来自 renderInlineHtmlForPreview）
const visualHost = document.createElement("div");
visualHost.setAttribute("contenteditable", "true");
visualHost.setAttribute("spellcheck", "false");
const visualHostHtml = (() => {
    const temp = document.createElement("div");
    temp.innerHTML = lute.Md2VditorDOM(ZWSP + step1Md + ZWSP);
    const display = temp.querySelector(".vditor-html-inline__display");
    return display?.innerHTML ?? "";
})();
visualHost.innerHTML = visualHostHtml;
console.log("\nStep 2: visualHost 初始内容 =", visualHost.innerHTML);

// 模拟 Branch B (wrap new span)：在 visualHost 里选 "页面" 包新 span
// 由于 visualHost 初始没有 styled span 包含文本，我们手动构造
// 实际场景中 processAfterRender 会把文本移入 styled span，但这里直接模拟
visualHost.innerHTML = `<span style="background-color:#fed7aa">示例页面</span>`;

// 用户选 "页面"（substring）并应用文字色
// Branch B: wrap
const newSpan = document.createElement("span");
newSpan.style.color = "#dc2626";
const range = document.createRange();
const textNode = visualHost.firstChild.firstChild.nextSibling;  // "页面" text node after "示例"
range.setStart(textNode, 0);
range.setEnd(textNode, 2);  // "页面"
range.surroundContents(newSpan);

console.log("\nStep 2: 应用文字色后的 visualHost =", visualHost.innerHTML);

// Step 3: 用户点击 Save → visualHostToMarkdown → applySource → renderHtmlInlineFromMd
const newMd = visualHostToMarkdown(visualHost);
console.log("\nStep 3: visualHostToMarkdown =", newMd);

const newShellHtml = renderHtmlInlineFromMd(newMd);
console.log("\nStep 3: Lute 渲染的 shell =");
console.log(newShellHtml);

// 替换 editor 内容
editor.innerHTML = newShellHtml;
const shellAfterStep3 = editor.querySelector('[data-type="html-inline"]');
console.log("\nStep 3: 替换后外层 data-md-source =", shellAfterStep3.getAttribute("data-md-source"));

// Step 4: 用户调用 getValue() → buildEditorHtmlForMarkdown → Lute.VditorIRDOM2Md
// 模拟 buildEditorHtmlForMarkdown 的逻辑
const clone = editor.cloneNode(true);
flattenNestedHtmlInline(clone);

console.log("\nStep 4: flatten 后的 DOM:");
console.log(clone.innerHTML);

const finalMd = lute.VditorIRDOM2Md(clone.innerHTML);
console.log("\nStep 4: 最终 getValue() 输出 =", JSON.stringify(finalMd));

// 验证
console.log("\n=== 验证 ===");
const checks = {
    "包含 background-color:#fed7aa": finalMd.includes("background-color:#fed7aa"),
    "包含 color:#dc2626": finalMd.includes("color:#dc2626"),
    "包含 '示例'": finalMd.includes("示例"),
    "包含 '页面'": finalMd.includes("页面"),
};
for (const [k, v] of Object.entries(checks)) {
    console.log(`  ${v ? "✅" : "❌"} ${k}`);
}
if (!Object.values(checks).every(Boolean)) process.exitCode = 1;