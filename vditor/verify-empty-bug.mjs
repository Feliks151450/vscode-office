// 复现 bug：html 编辑器中嵌套背景色+文字色后，Save → getValue 为空
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

// 复制的辅助函数
const parseStyleAttr = (styleStr) => {
    const map = new Map();
    if (!styleStr) return map;
    styleStr.split(";").forEach(part => {
        const colonIdx = part.indexOf(":");
        if (colonIdx === -1) return;
        const k = part.slice(0, colonIdx).trim().toLowerCase();
        const v = part.slice(colonIdx + 1).trim();
        if (k && v) map.set(k, v);
    });
    return map;
};
const serializeStyleMap = (map) =>
    Array.from(map.entries()).map(([k, v]) => `${k}:${v}`).join(";");

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

const renderHtmlInlineFromMd = (vditor, md) => {
    const trimmed = md.trim();
    if (!trimmed) return "";
    const wrapper = `${ZWSP}${trimmed}${ZWSP}`;
    const html = vditor.currentMode === "ir"
        ? vditor.lute.Md2VditorIRDOM(wrapper)
        : vditor.lute.Md2VditorDOM(wrapper);
    const temp = document.createElement("div");
    temp.innerHTML = html;
    const node = temp.querySelector('[data-type="html-inline"]');
    return node?.outerHTML ?? "";
};
const vditorLike = { currentMode: "ir", lute };

const editor = document.getElementById("editor");

// === 模拟完整流程 ===

// Step 1: 用户输入背景色文本
console.log("=== Step 1: 输入背景色文本 ===");
const step1Md = '<span style="background-color:orange">示例页面</span>';
const step1Html = renderHtmlInlineFromMd(vditorLike, step1Md);
console.log("Lute 渲染:", step1Html.slice(0, 100) + "...");
editor.innerHTML = `<p data-block="0">${step1Html}</p>`;

// Step 2: 用户在 visualHost 里选中 "页面"，应用文字色（修复后的 wrap 行为）
console.log("\n=== Step 2: 选中 '页面' 应用文字色 ===");
const visualHost = document.createElement("div");
visualHost.innerHTML = `<span style="background-color:orange">示例页面</span>`;

// 修复后的 wrap 逻辑
const textNode = visualHost.querySelector("span").firstChild;
const range = document.createRange();
range.setStart(textNode, 2);  // "页面"
range.setEnd(textNode, 4);
const newSpan = document.createElement("span");
newSpan.style.color = "red";
range.surroundContents(newSpan);
console.log("wrap 后 visualHost:", visualHost.innerHTML);

// Step 3: 用户点 Save → visualHostToMarkdown → applySource
console.log("\n=== Step 3: 用户点 Save ===");
const newMd = visualHostToMarkdown(visualHost);
console.log("visualHostToMarkdown:", newMd);

const newHtml = renderHtmlInlineFromMd(vditorLike, newMd);
console.log("renderHtmlInlineFromMd:", newHtml.slice(0, 200) + "...");
if (!newHtml) {
    console.log("❌ renderHtmlInlineFromMd 返回空字符串！");
    process.exitCode = 1;
}

// 模拟 applySource
const oldShell = editor.querySelector('[data-type="html-inline"]');
if (newHtml) {
    const wrapper = document.createElement("div");
    wrapper.innerHTML = newHtml;
    const newNode = wrapper.firstElementChild;
    if (newNode) {
        oldShell.replaceWith(newNode);
        console.log("替换后编辑器内容:", editor.innerHTML);
    } else {
        console.log("❌ newNode 为空！");
        process.exitCode = 1;
    }
}

// Step 4: 用户调用 getValue() → buildEditorHtmlForMarkdown → flattenNestedHtmlInline → Lute
console.log("\n=== Step 4: getValue() ===");

const buildEditorHtmlForMarkdown = (root) => {
    const clone = root.cloneNode(true);
    // 这里调用我的 fix
    const depthOf = (el) => {
        let d = 0;
        let n = el;
        while (n?.parentElement) { d++; n = n.parentElement; }
        return d;
    };
    const buildNestedHtmlInlineMd = (outerShell) => {
        const openTagMatch = (outerShell.getAttribute("data-md-source") || "").match(/^<[a-zA-Z][^>]*>/);
        const openTag = openTagMatch ? openTagMatch[0] : "";
        if (!openTag) return "";
        const isEmptyPlaceholder = (el) => {
            if (el.tagName !== "SPAN" || !el.hasAttribute("style")) return false;
            for (const child of Array.from(el.childNodes)) {
                if (child.nodeType === 3 && (child.textContent || "").replaceAll(ZWSP, "") !== "") return false;
            }
            return true;
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
            if (isEmptyPlaceholder(el)) {
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
    const flattenNestedHtmlInline = (root) => {
        const allShells = Array.from(root.querySelectorAll('[data-type="html-inline"]'));
        if (allShells.length === 0) return;
        allShells.sort((a, b) => depthOf(b) - depthOf(a));
        for (const shell of allShells) {
            const fullMd = buildNestedHtmlInlineMd(shell);
            console.log("  [debug] fullMd =", fullMd);
            if (!fullMd) continue;
            shell.classList.remove("vditor-html-inline--readonly");
            shell.classList.remove("vditor-html-inline");
            shell.removeAttribute("contenteditable");
            shell.setAttribute("data-md-source", fullMd);
        }
    };
    flattenNestedHtmlInline(clone);
    return clone.innerHTML;
};

const cloneHtml = buildEditorHtmlForMarkdown(editor);
console.log("flatten 后 DOM:", cloneHtml.slice(0, 200) + "...");

const finalMd = lute.VditorIRDOM2Md(cloneHtml);
console.log("\ngetValue 输出:", JSON.stringify(finalMd));

const checks = {
    "包含 background-color:orange": finalMd.includes("background-color:orange"),
    "包含 color:red (含空格)": finalMd.includes("color: red"),
    "包含 '示例'": finalMd.includes("示例"),
    "包含 '页面'": finalMd.includes("页面"),
    "不为空字符串": finalMd.trim() !== "",
};
for (const [k, v] of Object.entries(checks)) {
    console.log(`  ${v ? "✅" : "❌"} ${k}`);
}
if (!Object.values(checks).every(Boolean)) process.exitCode = 1;