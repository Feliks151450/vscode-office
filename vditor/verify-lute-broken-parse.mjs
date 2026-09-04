// 端到端测试：模拟 Lute 把嵌套 inline HTML 解析成"外壳 shell + 中间文本 + 内壳 shell"的情况
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

// 复制的修复后的 renderHtmlInlineFromMd
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
    const isOnlyZwsp = (n) => n.nodeType === 3 && (n.textContent || "").replaceAll(ZWSP, "") === "";
    const childNodes = Array.from(paragraph.childNodes);
    while (childNodes.length > 0 && isOnlyZwsp(childNodes[0])) childNodes.shift();
    while (childNodes.length > 0 && isOnlyZwsp(childNodes[childNodes.length - 1])) childNodes.pop();
    return childNodes.map((n) => {
        if (n.nodeType === 1) return n.outerHTML;
        return n.textContent || "";
    }).join("");
};

const vditorLike = { currentMode: "ir", lute };

// === 测试：用户场景 ===
console.log("=== 用户场景：嵌套背景色 + 文字色 ===");

// 用户在 visualHost 里的实际内容（带一个无属性的外层 span，是 wrapSelectionColor 副作用）
const visualHostHtml = `<span><span style="color: rgb(220, 38, 38);">示例<span style="background-color: rgb(253, 230, 138);">页面</span></span></span>`;

// visualHostToMarkdown：只输出带 style 的 span
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
const visualHost = document.createElement("div");
visualHost.innerHTML = visualHostHtml;
const newMd = walk(visualHost).trim();
console.log("visualHostToMarkdown 输出:");
console.log(JSON.stringify(newMd));
console.log();

// renderHtmlInlineFromMd
const newHtml = renderHtmlInlineFromMd(vditorLike, newMd);
console.log("renderHtmlInlineFromMd 返回的 HTML（应该包含外壳 shell + '示例' 文本 + 内壳 shell）:");
console.log(newHtml);
console.log();

// applySource：替换
const outerShell = document.createElement("span");
outerShell.outerHTML = `<span class="vditor-ir__node" data-type="html-inline" data-md-source="<span>old</span>">old shell</span>`;
const container = document.createElement("div");
container.innerHTML = `<p>这是一个 <span class="vditor-ir__node" data-type="html-inline" data-md-source="<span>old</span>">old shell</span>。</p>`;
const oldShell = container.querySelector('[data-type="html-inline"]');

const wrapper = document.createElement("div");
wrapper.innerHTML = newHtml;
const nodes = Array.from(wrapper.childNodes);
console.log("applySource 即将插入", nodes.length, "个节点:");
nodes.forEach((n, i) => {
    if (n.nodeType === 1) {
        console.log(`  [${i}] ELEMENT:`, n.outerHTML);
    } else {
        console.log(`  [${i}] TEXT:`, JSON.stringify(n.textContent));
    }
});
console.log();

oldShell.replaceWith(...nodes);
console.log("替换后编辑器段落内容:");
console.log(container.innerHTML);
console.log();

// getMarkdown → buildEditorHtmlForMarkdown → flattenNestedHtmlInline → Lute.VditorIRDOM2Md
console.log("=== getValue() 输出 ===");

// 修复后的 buildNestedHtmlInlineMd
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

const clone = container.cloneNode(true);
flattenNestedHtmlInline(clone);

console.log("修复后 clone:");
console.log(clone.innerHTML);
console.log();

const finalMd = lute.VditorIRDOM2Md(clone.innerHTML);
console.log("getValue() 最终输出:");
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