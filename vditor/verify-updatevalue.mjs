// 验证用 vditor.updateValue 替换 shell 的方案
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

const vditorLike = {
    currentMode: "wysiwyg",
    lute,
    const vditorLike = {
    currentMode: "wysiwyg",
    lute,
    // 模拟 updateValue（之前用，但撤回）
    updateValue(value) {
        const selection = window.getSelection();
        const range = selection.getRangeAt(0);
        range.deleteContents();
        const wrapper = document.createElement("div");
        wrapper.innerHTML = value;
        const fragment = document.createDocumentFragment();
        while (wrapper.firstChild) fragment.appendChild(wrapper.firstChild);
        range.insertNode(fragment);
    },
    // 当前方案：直接 replaceWith（不走编辑器 input 管道）
    applySourceReplace(shell, newHtml) {
        const wrapper = document.createElement("div");
        wrapper.innerHTML = newHtml;
        const nodes = Array.from(wrapper.childNodes);
        shell.replaceWith(...nodes);
    }
};

// 模拟编辑器初始内容
const editor = document.getElementById("editor");
editor.innerHTML = `<p data-block="0">这是一个 <span class="vditor-ir__node vditor-html-inline--readonly" contenteditable="false" data-type="html-inline" data-md-source="<span>示例页面</span>"><span class="vditor-html-inline__display"><span>示例页面</span></span></span>。</p>`;

const shell = editor.querySelector('[data-type="html-inline"]');

const newMd = `<span style="background-color: rgb(253, 230, 138);">示例<span style="color: rgb(220, 38, 38);">页面</span></span>`;
console.log("newMd:", newMd);

const newHtml = renderHtmlInlineFromMd(vditorLike, newMd);
console.log("\nnewHtml:", newHtml);

// 用 replaceWith 直接替换
vditorLike.applySourceReplace(shell, newHtml);

console.log("\n=== 替换后编辑器 ===");
console.log("editor.innerHTML:", editor.innerHTML);

const newShell = editor.querySelector('[data-type="html-inline"]');
if (newShell) {
    console.log("\n新外壳 data-md-source:", newShell.getAttribute("data-md-source"));
    const display = newShell.querySelector('.vditor-html-inline__display');
    console.log("display 子节点:");
    for (const c of Array.from(display.childNodes)) {
        if (c.nodeType === 3) {
            console.log(`  TEXT: "${c.textContent}"`);
        } else {
            console.log(`  ELEMENT: <${c.tagName.toLowerCase()} ${c.getAttribute("style") || ''}>`);
        }
    }
}

// getValue（带 flattenNestedHtmlInline）
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

const clone = editor.cloneNode(true);
flattenNestedHtmlInline(clone);
console.log("\n=== flatten 后外壳 data-md-source ===");
for (const s of clone.querySelectorAll('[data-type="html-inline"]')) {
    console.log(`  ${s.getAttribute("data-md-source")}`);
}

const finalMd = lute.VditorDOM2Md(clone.innerHTML);
console.log("\n=== getValue 输出 ===");
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