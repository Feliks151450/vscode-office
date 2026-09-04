// 验证：replaceWith 直接改 DOM，绕过 SpinVditorDOM
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

const newMd = `<span style="background-color: rgb(253, 230, 138);">示例<span style="color: rgb(220, 38, 38);">页面</span></span>`;

// 用 Lute 渲染为 html-inline shell HTML
const luteRendered = lute.Md2VditorDOM(ZWSP + newMd + ZWSP);
const tempDiv = document.createElement("div");
tempDiv.innerHTML = luteRendered;
const nodes = Array.from(tempDiv.childNodes);

// 用 replaceWith 直接替换（不触发 input 事件）
shell.replaceWith(...nodes);

console.log("=== replaceWith 后 ===");
console.log(editor.innerHTML);
console.log();

// getValue（先调用 flattenNestedHtmlInline 模拟 buildEditorHtmlForMarkdown）
const flattenNestedHtmlInline = (root) => {
    const allShells = Array.from(root.querySelectorAll('[data-type="html-inline"]'));
    if (allShells.length === 0) return;
    allShells.sort((a, b) => {
        let da = 0, db = 0, na = a, nb = b;
        while (na?.parentElement) { da++; na = na.parentElement; }
        while (nb?.parentElement) { db++; nb = nb.parentElement; }
        return db - da;
    });
    const buildMd = (shell) => {
        const openTagMatch = (shell.getAttribute("data-md-source") || "").match(/^<[a-zA-Z][^>]*>/);
        const openTag = openTagMatch ? openTagMatch[0] : "";
        if (!openTag) return "";
        const openStyle = (openTag.match(/\bstyle\s*=\s*"([^"]*)"/i) || [, ""])[1];
        const normStyle = (s) => s.split(";").map(p => p.trim()).filter(Boolean).sort().join(";");
        const styleMatchesOpen = (el) => el.hasAttribute("style") && normStyle(el.getAttribute("style") || "") === normStyle(openStyle);
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
        const inner = Array.from(shell.childNodes).map(walk).join("").trim();
        return `${openTag}${inner}</span>`;
    };
    for (const shell of allShells) {
        const fullMd = buildMd(shell);
        if (!fullMd) continue;
        shell.classList.remove("vditor-html-inline--readonly");
        shell.classList.remove("vditor-html-inline");
        shell.removeAttribute("contenteditable");
        shell.setAttribute("data-md-source", fullMd);
    }
};

const clone = editor.cloneNode(true);
flattenNestedHtmlInline(clone);

const finalMd = lute.VditorDOM2Md(clone.innerHTML);
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