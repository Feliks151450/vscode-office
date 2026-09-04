// 用用户浏览器 DevTools 看到的精确 DOM 测试
import { JSDOM } from "jsdom";
import { readFileSync } from "fs";

const LUTE_PATH = "/Users/linlifei/templateWithNode/vscode-office/vditor/src/js/lute/lute.min.js";
const luteSource = readFileSync(LUTE_PATH, "utf8");

const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "http://localhost/",
    runScripts: "outside-only",
});
const { window } = dom;
window.eval(luteSource);
const Lute = window.Lute;
const lute = Lute.New();
lute.SetSanitize(false);

const ZWSP = "";

// 辅助函数
const depthOf = (el) => {
    let d = 0;
    let n = el;
    while (n?.parentElement) { d++; n = n.parentElement; }
    return d;
};

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

// 用户报告的精确 DOM（来自 DevTools 元素检查器）
const userExactDom = `<p data-block="0"><span class="vditor-ir__node vditor-html-inline vditor-html-inline--readonly" contenteditable="false" data-type="html-inline" data-open-tag="<span style=&quot;background-color:#fed7aa&quot;>" data-md-source="<span style=&quot;background-color:#fed7aa&quot;>示例页面</span>"><span class="vditor-html-inline__display"><span style="background-color:#fed7aa">示例<span class="vditor-ir__node vditor-html-inline vditor-html-inline--readonly" contenteditable="false" data-type="html-inline" data-open-tag="<span style=&quot;color:#dc2626&quot;>" data-md-source="<span style=&quot;color:#dc2626&quot;>页面</span>"><span class="vditor-html-inline__display"><span style="color:#dc2626">页面</span></span></span></span></span></span></p>`;

const d = new JSDOM(userExactDom);
const doc = d.window.document;
const clone = doc.body.cloneNode(true);

console.log("=== 修复前 ===");
const beforeMd = lute.VditorIRDOM2Md(clone.innerHTML);
console.log("getValue 输出:", JSON.stringify(beforeMd));
console.log("包含 color:#dc2626?", beforeMd.includes("color:#dc2626") ? "✅" : "❌ 不包含");
console.log();

console.log("=== 修复后 ===");
flattenNestedHtmlInline(clone);
console.log("flatten 后 DOM:");
console.log(clone.innerHTML);
console.log();
const afterMd = lute.VditorIRDOM2Md(clone.innerHTML);
console.log("getValue 输出:", JSON.stringify(afterMd));
console.log("包含 color:#dc2626?", afterMd.includes("color:#dc2626") ? "✅ 是" : "❌ 不包含");
console.log("包含 background-color:#fed7aa?", afterMd.includes("background-color:#fed7aa") ? "✅ 是" : "❌ 不包含");
console.log("包含 '示例页面'?", afterMd.includes("示例") && afterMd.includes("页面") ? "✅ 是" : "❌ 不包含");