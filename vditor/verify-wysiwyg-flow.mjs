// 验证 WYSIWYG 流程下的修复：display 内的裸文本被包了 styled span
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

    const fixShellDisplay = (shell) => {
        const display = shell.querySelector(":scope > .vditor-html-inline__display");
        if (!display) return;
        const placeholder = display.querySelector(":scope > span[style]");
        if (placeholder && !placeholder.textContent) placeholder.remove();
        const siblings = Array.from(shell.childNodes);
        for (const node of siblings) {
            if (node === display) continue;
            display.appendChild(node);
        }
        const openTag = (shell.getAttribute("data-md-source") || "").match(/^<[a-zA-Z][^>]*>/);
        const openStyleMatch = openTag ? openTag[0].match(/\bstyle\s*=\s*"([^"]*)"/i) : null;
        const shellStyle = openStyleMatch ? openStyleMatch[1] : "";
        if (shellStyle) {
            for (const child of Array.from(display.childNodes)) {
                if (child.nodeType === 3 && (child.textContent || "").replaceAll(ZWSP, "") !== "") {
                    const wrapper = document.createElement("span");
                    wrapper.setAttribute("style", shellStyle);
                    display.insertBefore(wrapper, child);
                    wrapper.appendChild(child);
                }
            }
        }
        for (const childShell of Array.from(display.querySelectorAll(':scope > [data-type="html-inline"]'))) {
            fixShellDisplay(childShell);
        }
    };

    const anchorShell = paragraph.querySelector('[data-type="html-inline"]');
    if (anchorShell) fixShellDisplay(anchorShell);

    const childNodes = Array.from(paragraph.childNodes);
    while (childNodes.length > 0 && childNodes[0].nodeType === 3 && (childNodes[0].textContent || "").replaceAll(ZWSP, "") === "") childNodes.shift();
    while (childNodes.length > 0 && childNodes[childNodes.length - 1].nodeType === 3 && (childNodes[childNodes.length - 1].textContent || "").replaceAll(ZWSP, "") === "") childNodes.pop();
    return childNodes.map((n) => {
        if (n.nodeType === 1) return n.outerHTML;
        return n.textContent || "";
    }).join("");
};

const vditorLike = { currentMode: "wysiwyg", lute };

const md = `<span style="background-color: rgb(253, 230, 138);">示例<span style="color: rgb(220, 38, 38);">页面</span></span>`;

const result = renderHtmlInlineFromMd(vditorLike, md);
console.log("renderHtmlInlineFromMd 输出:");
console.log(result);
console.log();

// 把结果当作编辑器的 DOM
const dom2 = new JSDOM(`<div>${result}</div>`);
const doc = dom2.window.document;
const outerShell = doc.querySelector('[data-type="html-inline"]');
const display = outerShell.querySelector('.vditor-html-inline__display');
console.log("外壳 data-md-source:", outerShell.getAttribute("data-md-source"));
console.log("display 子节点:");
for (const c of Array.from(display.childNodes)) {
    if (c.nodeType === 3) {
        console.log(`  TEXT: "${c.textContent}"`);
    } else {
        console.log(`  ELEMENT: <${c.tagName.toLowerCase()} ${c.getAttribute("style") || ''}>`);
    }
}

// 验证 getMarkdown 输出
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

const editor = document.createElement("div");
editor.innerHTML = `<p data-block="0">${result}</p>`;
const clone = editor.cloneNode(true);
flattenNestedHtmlInline(clone);

const finalMd = lute.VditorDOM2Md(clone.innerHTML);
console.log();
console.log("getValue() 输出:", JSON.stringify(finalMd));

// 检查 display 是否包了 styled span
const display2 = clone.querySelector('.vditor-html-inline__display');
const styledSpans = display2.querySelectorAll('span[style]');
console.log();
console.log("所有 styled span 数量:", styledSpans.length);
for (const s of styledSpans) {
    console.log(`  <span style="${s.getAttribute("style")}"> 内容: "${s.textContent}"`);
}

const checks = {
    "display 内有 bg span 包住示例": Array.from(styledSpans).some(s => s.getAttribute("style").includes("background-color") && s.textContent.includes("示例")),
    "display 内有 color span 包住页面": Array.from(styledSpans).some(s => s.getAttribute("style").includes("color:") && s.textContent.includes("页面")),
    "getValue 含两种 style": finalMd.includes("background-color") && finalMd.includes("color: rgb"),
};
for (const [k, v] of Object.entries(checks)) {
    console.log(`  ${v ? "✅" : "❌"} ${k}`);
}
if (!Object.values(checks).every(Boolean)) process.exitCode = 1;