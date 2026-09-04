// 验证修复：display 内裸文本被包了外壳样式的 styled span
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
        console.log("[debug] anchorShell =", anchorShell.outerHTML.slice(0, 100));
        console.log("[debug] paragraphChildren 数量:", paragraphChildren.length);
        for (let i = 0; i < paragraphChildren.length; i++) {
            console.log(`  [${i}]`, paragraphChildren[i].nodeType === 1 ? paragraphChildren[i].tagName : '#text', paragraphChildren[i].nodeType === 1 ? '' : JSON.stringify(paragraphChildren[i].textContent));
        }
        const display = anchorShell.querySelector(":scope > .vditor-html-inline__display");
        console.log("[debug] display =", display ? display.outerHTML.slice(0, 100) : "null");
        if (display) {
            const placeholder = display.querySelector(":scope > span[style]");
            if (placeholder && !placeholder.textContent) placeholder.remove();
            const trailing = paragraphChildren.slice(anchorIdx + 1);
            console.log("[debug] trailing 数量:", trailing.length);
            for (const node of trailing) display.appendChild(node);
            console.log("[debug] display 后:", display.outerHTML.slice(0, 200));
            // 新增：给裸文本包 styled span
            const openTag = (anchorShell.getAttribute("data-md-source") || "").match(/^<[a-zA-Z][^>]*>/);
            const openStyleMatch = openTag ? openTag[0].match(/\bstyle\s*=\s*"([^"]*)"/i) : null;
            const anchorStyle = openStyleMatch ? openStyleMatch[1] : "";
            if (anchorStyle) {
                for (const child of Array.from(display.childNodes)) {
                    if (child.nodeType === 3 && (child.textContent || "").replaceAll(ZWSP, "") !== "") {
                        const wrapper = document.createElement("span");
                        wrapper.setAttribute("style", anchorStyle);
                        display.insertBefore(wrapper, child);
                        wrapper.appendChild(child);
                    }
                }
            }
        }
    }

    const childNodes = Array.from(paragraph.childNodes);
    while (childNodes.length > 0 && childNodes[0].nodeType === 3 && (childNodes[0].textContent || "").replaceAll(ZWSP, "") === "") childNodes.shift();
    while (childNodes.length > 0 && childNodes[childNodes.length - 1].nodeType === 3 && (childNodes[childNodes.length - 1].textContent || "").replaceAll(ZWSP, "") === "") childNodes.pop();
    return childNodes.map((n) => {
        if (n.nodeType === 1) return n.outerHTML;
        return n.textContent || "";
    }).join("");
};

const vditorLike = { currentMode: "ir", lute };

// 用户场景
const md = `<span style="background-color: rgb(253, 230, 138);">示例<span style="color: rgb(220, 38, 38);">页面</span></span>`;
console.log("输入 md:", md);
console.log();

const result = renderHtmlInlineFromMd(vditorLike, md);
console.log("renderHtmlInlineFromMd 输出:");
console.log(result);
console.log();

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
        console.log(`  ELEMENT: <${c.tagName.toLowerCase()} ${c.getAttribute("style") || ''}>`, c.outerHTML.slice(0, 100));
    }
}
console.log();

// 现在检查 getMarkdown 输出
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

// 把结果当作编辑器的 DOM
const editor = document.createElement("div");
editor.innerHTML = `<p data-block="0">${result}</p>`;
const clone = editor.cloneNode(true);
flattenNestedHtmlInline(clone);

const finalMd = lute.VditorIRDOM2Md(clone.innerHTML);
console.log("getValue() 输出:");
console.log(JSON.stringify(finalMd));

// 检查 display 内是否有 styled span 包住"示例"
const display2 = clone.querySelector('.vditor-html-inline__display');
const styledSpans = display2.querySelectorAll(':scope > span[style]');
console.log();
console.log("display 内的 styled span 数量:", styledSpans.length);
for (const s of styledSpans) {
    console.log(`  <span style="${s.getAttribute("style")}">`);
    console.log(`    内容: "${s.textContent}"`);
}