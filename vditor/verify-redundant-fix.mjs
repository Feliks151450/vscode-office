// 验证 fix：内壳 styled span 与外壳样式相同时不再产生冗余嵌套
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

// 复制 buildNestedHtmlInlineMd 新版本
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
    const isRedundantStyleWrapper = (el) => {
        return el.tagName === "SPAN" && el.hasAttribute("style") && styleMatchesOpen(el);
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
        if (isRedundantStyleWrapper(el)) {
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
        const fullMd = buildNestedHtmlInlineMd(shell);
        if (!fullMd) continue;
        shell.classList.remove("vditor-html-inline--readonly");
        shell.classList.remove("vditor-html-inline");
        shell.removeAttribute("contenteditable");
        shell.setAttribute("data-md-source", fullMd);
    }
};

// === 用户场景：先背景色，再部分文字色 ===
console.log("=== 场景：先整段背景色 + 部分文字色 ===");

// Lute 渲染 markdown 后的 DOM（用户日志中已确认）
// 输入: <span style="background-color: rgb(253, 230, 138);">示例<span style="color: rgb(220, 38, 38);">页面</span></span>
const editor = document.getElementById("editor");
editor.innerHTML = `<p data-block="0">这是一个 <span class="vditor-ir__node vditor-html-inline vditor-html-inline--readonly" contenteditable="false" data-type="html-inline" data-open-tag="<span style=&quot;background-color: rgb(253, 230, 138);&gt;" data-md-source="<span style=&quot;background-color: rgb(253, 230, 138);&quot;&gt;</span>"><span class="vditor-html-inline__display"><span style="background-color: rgb(253, 230, 138);"></span></span></span>示例<span class="vditor-ir__node vditor-html-inline vditor-html-inline--readonly" contenteditable="false" data-type="html-inline" data-open-tag="<span style=&quot;color: rgb(220, 38, 38);&gt;" data-md-source="<span style=&quot;color: rgb(220, 38, 38);&quot;&gt;页面</span>"><span class="vditor-html-inline__display"><span style="color: rgb(220, 38, 38);">页面</span></span></span></span>。</p>`;

const clone = editor.cloneNode(true);
console.log("修复前 shell 数量:", clone.querySelectorAll('[data-type="html-inline"]').length);
for (const shell of clone.querySelectorAll('[data-type="html-inline"]')) {
    console.log("  修复前 data-md-source:", shell.getAttribute("data-md-source"));
}
console.log();

// 手动调用 buildNestedHtmlInlineMd 看下结果
const allShells = Array.from(clone.querySelectorAll('[data-type="html-inline"]'));
allShells.sort((a,b)=>depthOf(b)-depthOf(a));
for (const shell of allShells) {
    console.log(`  shell depth=${depthOf(shell)}, children=${shell.childNodes.length}, data-md-source=${shell.getAttribute("data-md-source")}`);
    for (const c of Array.from(shell.childNodes)) {
        console.log(`    child: ${c.nodeType === 1 ? c.tagName : '#text'} ${c.nodeType === 1 ? c.outerHTML.slice(0, 80) : JSON.stringify(c.textContent)}`);
    }
    const fm = buildNestedHtmlInlineMd(shell);
    console.log("  buildNestedHtmlInlineMd 输出:", fm);
}

flattenNestedHtmlInline(clone);
console.log("修复后 shell 数量:", clone.querySelectorAll('[data-type="html-inline"]').length);
console.log();

for (const shell of clone.querySelectorAll('[data-type="html-inline"]')) {
    console.log("shell data-md-source:", shell.getAttribute("data-md-source"));
}
console.log();

const md = lute.VditorIRDOM2Md(clone.innerHTML);
console.log("getValue() 输出:");
console.log(JSON.stringify(md));
console.log();

const checks = {
    "包含 background-color:rgb(253": md.includes("background-color: rgb(253"),
    "包含 color:rgb(220": md.includes("color: rgb(220"),
    "包含 '示例'": md.includes("示例"),
    "包含 '页面'": md.includes("页面"),
    "没有冗余 color 嵌套（只有一处 color:rgb）": (md.match(/color:\s*rgb\(220/g) || []).length <= 1,
    "没有冗余 background 嵌套（只有一处 background-color）": (md.match(/background-color:\s*rgb\(253/g) || []).length <= 1,
    "没有连续两个相同的 color span": !md.includes("<span style=\"color: rgb(220, 38, 38);\"><span style=\"color: rgb(220, 38, 38);"),
};
for (const [k, v] of Object.entries(checks)) {
    console.log(`  ${v ? "✅" : "❌"} ${k}`);
}
if (!Object.values(checks).every(Boolean)) process.exitCode = 1;