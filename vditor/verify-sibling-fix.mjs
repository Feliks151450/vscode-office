// 验证 sibling-fix：外壳 + 中间文本 + 内壳 的兄弟结构
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
const { document } = window;
const ZWSP = "";

// 复制修复后的 renderHtmlInlineFromMd
const renderHtmlInlineFromMd = (vditor, md) => {
    const trimmed = md.trim();
    if (!trimmed) return "";
    const wrapper = `${ZWSP}${trimmed}${ZWSP}`;
    const html = vditor.currentMode === "ir"
        ? vditor.lute.Md2VditorIRDOM(wrapper)
        : vditor.lute.Md2VditorDOM(wrapper);
    const temp = document.createElement("div");
    temp.innerHTML = html;
    const paragraph = temp.querySelector("p[data-block]") ?? temp.firstElementChild;
    if (!paragraph) return "";

    // 新增：把外壳之后的兄弟移到外壳 display 内
    const paragraphChildren = Array.from(paragraph.childNodes);
    let anchorIdx = -1;
    for (let i = 0; i < paragraphChildren.length; i++) {
        const c = paragraphChildren[i];
        if (c.nodeType === 1 && c.getAttribute("data-type") === "html-inline") {
            anchorIdx = i;
            break;
        }
    }
    if (anchorIdx >= 0) {
        const anchorShell = paragraphChildren[anchorIdx];
        const display = anchorShell.querySelector(":scope > .vditor-html-inline__display");
        if (display) {
            const placeholder = display.querySelector(":scope > span[style]");
            if (placeholder && !placeholder.textContent) placeholder.remove();
            const trailing = paragraphChildren.slice(anchorIdx + 1);
            for (const node of trailing) display.appendChild(node);
        }
    }

    const childNodes = Array.from(paragraph.childNodes);
    while (childNodes.length > 0 && isOnlyZwsp(childNodes[0])) childNodes.shift();
    while (childNodes.length > 0 && isOnlyZwsp(childNodes[childNodes.length - 1])) childNodes.pop();
    return childNodes.map((n) => {
        if (n.nodeType === 1) return n.outerHTML;
        return n.textContent || "";
    }).join("");
};
const isOnlyZwsp = (n) => n.nodeType === 3 && (n.textContent || "").replaceAll(ZWSP, "") === "";

const vditorLike = { currentMode: "ir", lute };

// 用户场景：先背景色，再部分文字色
const md = `<span style="background-color: rgb(253, 230, 138);">示例<span style="color: rgb(220, 38, 38);">页面</span></span>`;

console.log("输入 md:", md);
console.log();

// 1. Lute 渲染
console.log("=== 1. Lute 输出 ===");
const html = lute.Md2VditorIRDOM(ZWSP + md + ZWSP);
console.log(html);
console.log();

// 2. renderHtmlInlineFromMd 修复后的输出
console.log("=== 2. renderHtmlInlineFromMd 输出 ===");
const fixed = renderHtmlInlineFromMd(vditorLike, md);
console.log(fixed);
console.log();

// 3. 编辑器 DOM
const editor = document.getElementById("editor");
const container = document.createElement("p");
container.innerHTML = `这是一个 ${fixed}。`;

// 4. buildEditorHtmlForMarkdown + flattenNestedHtmlInline
const buildNestedHtmlInlineMd = (outerShell) => {
    const openTagMatch = (outerShell.getAttribute("data-md-source") || "").match(/^<[a-zA-Z][^>]*>/);
    const openTag = openTagMatch ? openTagMatch[0] : "";
    if (!openTag) return "";
    const openStyle = (openTag.match(/\bstyle\s*=\s*"([^"]*)"/i) || [, ""])[1];
    const normStyle = (s) => s.split(";").map((p) => p.trim()).filter(Boolean).sort().join(";");
    const styleMatchesOpen = (el) => {
        if (!el.hasAttribute("style")) return false;
        return normStyle(el.getAttribute("style") || "") === normStyle(openStyle);
    };
    const walk = (node) => {
        if (node.nodeType === 3) return (node.textContent || "").replaceAll(ZWSP, "");
        if (node.nodeType !== 1) return "";
        const el = node;
        if (el.classList.contains("vditor-html-inline__display")) {
            return Array.from(el.childNodes).map(walk).join("");
        }
        if (el.getAttribute("data-type") === "html-inline") {
            return el.getAttribute("data-md-source") || "";
        }
        if (styleMatchesOpen(el)) {
            return Array.from(el.childNodes).map(walk).join("");
        }
        const children = Array.from(el.childNodes).map(walk).join("");
        if (el.tagName === "SPAN" && el.hasAttribute("style")) {
            return `<span style="${el.getAttribute("style")}">${children}</span>`;
        }
        return children;
    };
    const inner = Array.from(outerShell.childNodes).map(walk).join("").trim();
    return `${openTag}${inner}</span>`;
};

const depthOf = (el) => { let d = 0; let n = el; while (n?.parentElement) { d++; n = n.parentElement; } return d; };

const flattenNestedHtmlInline = (root) => {
    const allShells = Array.from(root.querySelectorAll('[data-type="html-inline"]'));
    if (allShells.length === 0) return;
    allShells.sort((a, b) => depthOf(b) - depthOf(a));
    for (const shell of allShells) {
        const fullMd = buildNestedHtmlInlineMd(shell);
        if (!fullMd) continue;
        shell.classList.remove("vditor-html-inline--readonly");
        shell.classList.remove("vditor-html-inline");
        shell.removeAttribute("contenteditable");
        shell.setAttribute("data-md-source", fullMd);
    }
};

editor.innerHTML = `<p data-block="0">${container.innerHTML}</p>`;
const clone = editor.cloneNode(true);
flattenNestedHtmlInline(clone);

console.log("=== 3. 修复后 clone ===");
console.log(clone.innerHTML.slice(0, 400));
console.log();

const finalMd = lute.VditorIRDOM2Md(clone.innerHTML);
console.log("=== 4. getValue() 输出 ===");
console.log(JSON.stringify(finalMd));
console.log();

const checks = {
    "包含 background-color:rgb(253": finalMd.includes("background-color: rgb(253"),
    "包含 color:rgb(220": finalMd.includes("color: rgb(220"),
    "包含 '示例'": finalMd.includes("示例"),
    "包含 '页面'": finalMd.includes("页面"),
    "示例 在 background-color 之后（嵌套）": finalMd.indexOf("background-color") < finalMd.indexOf("示例") && finalMd.indexOf("示例") < finalMd.indexOf("</span>"),
    "颜色 span 在 background 内": finalMd.indexOf("color") > finalMd.indexOf("background"),
    "不为空": finalMd.trim() !== "",
};
for (const [k, v] of Object.entries(checks)) {
    console.log(`  ${v ? "✅" : "❌"} ${k}`);
}
if (!Object.values(checks).every(Boolean)) process.exitCode = 1;