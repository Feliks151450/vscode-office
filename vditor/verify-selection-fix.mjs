// 验证 applyStyleInPreview 的新行为：选中部分文字时只改这部分
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
const { document } = window;
const ZWSP = "";

// === 复制的修复后的 applyStyleInPreview 核心逻辑 ===
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

const applyStyleInPreview = (visualHost, newStyle) => {
    const selection = window.getSelection();
    let inHostRange = null;
    console.log("  [debug] selection.rangeCount =", selection?.rangeCount);
    if (selection && selection.rangeCount > 0) {
        const r = selection.getRangeAt(0);
        console.log("  [debug] startContainer =", r.startContainer.nodeName, "startOffset =", r.startOffset);
        console.log("  [debug] endContainer =", r.endContainer.nodeName, "endOffset =", r.endOffset);
        console.log("  [debug] visualHost.contains(start) =", visualHost.contains(r.startContainer));
        console.log("  [debug] collapsed =", r.collapsed);
        if (visualHost.contains(r.startContainer) && visualHost.contains(r.endContainer) && !r.collapsed) {
            inHostRange = r;
        }
    }
    console.log("  [debug] inHostRange =", inHostRange !== null);

    if (inHostRange) {
        // 路径 1：只对选区包新 span（不再合并到外层）
        const range = inHostRange;
        const span = document.createElement("span");
        if (newStyle.color) span.style.color = newStyle.color;
        if (newStyle.backgroundColor) span.style.backgroundColor = newStyle.backgroundColor;
        try {
            range.surroundContents(span);
        } catch {
            const fragment = range.extractContents();
            span.appendChild(fragment);
            range.insertNode(span);
        }
        selection.removeAllRanges();
        const newRange = document.createRange();
        newRange.selectNodeContents(span);
        newRange.collapse(false);
        selection.addRange(newRange);
        return;
    }

    // 路径 2：默认应用整个 visualHost 内容
    if (!visualHost.firstChild) return;
    let outermost = null;
    for (const child of Array.from(visualHost.children)) {
        if (child.tagName === "SPAN" && child.hasAttribute("style")) {
            outermost = child;
            break;
        }
    }
    if (outermost) {
        const styleMap = parseStyleAttr(outermost.getAttribute("style") || "");
        if (newStyle.color) styleMap.set("color", newStyle.color);
        if (newStyle.backgroundColor) styleMap.set("background-color", newStyle.backgroundColor);
        outermost.setAttribute("style", serializeStyleMap(styleMap));
        return;
    }
    const wrapper = document.createElement("span");
    if (newStyle.color) wrapper.style.color = newStyle.color;
    if (newStyle.backgroundColor) wrapper.style.backgroundColor = newStyle.backgroundColor;
    while (visualHost.firstChild) wrapper.appendChild(visualHost.firstChild);
    visualHost.appendChild(wrapper);
};

// 测试：选 "world"，应用红色。应该只改 "world" 部分。
const test = (label, setupVisualHost, selectRange, applyStyle, expectContains, expectNotContains) => {
    console.log(`\n=== ${label} ===`);
    const vh = document.createElement("div");
    vh.setAttribute("contenteditable", "true");
    setupVisualHost(vh);
    console.log("初始 visualHost:", vh.innerHTML);

    // 模拟选区
    const sel = window.getSelection();
    sel.removeAllRanges();
    const range = document.createRange();
    selectRange(vh, range);
    sel.addRange(range);

    applyStyleInPreview(vh, applyStyle);
    console.log("应用样式后 visualHost:", vh.innerHTML);

    for (const [name, expected] of Object.entries(expectContains)) {
        const pass = vh.innerHTML.includes(expected);
        console.log(`  ${pass ? "✅" : "❌"} 应包含 '${expected}' (${name})`);
        if (!pass) process.exitCode = 1;
    }
    if (expectNotContains) {
        for (const expected of expectNotContains) {
            const pass = !vh.innerHTML.includes(expected);
            console.log(`  ${pass ? "✅" : "❌"} 不应包含 '${expected}'`);
            if (!pass) process.exitCode = 1;
        }
    }
};

// === 测试 1：单层背景色，选中部分设文字色 ===
test(
    "场景 1：单层背景色 [bg:orange]Hello world[/bg]，选 'world' 应用文字色 red",
    (vh) => {
        vh.innerHTML = `<span style="background-color:orange">Hello world</span>`;
    },
    (vh, range) => {
        // 选 "world"
        const textNode = vh.querySelector("span").firstChild;
        range.setStart(textNode, 6);
        range.setEnd(textNode, 11);
    },
    { color: "red" },
    {
        "外层 span 仍是 background-color:orange": `<span style="background-color:orange"`,
        "新建 span 包裹 'world' 含 color:red": `<span style="color:red">world</span>`,
    },
);

// === 测试 2：嵌套场景，选中内层进一步改色 ===
test(
    "场景 2：[bg:orange]Hello [color:blue]world[/color][/bg]，选 'world' 改 background-color:green",
    (vh) => {
        vh.innerHTML = `<span style="background-color:orange">Hello <span style="color:blue">world</span></span>`;
    },
    (vh, range) => {
        const textNode = vh.querySelector("span span").firstChild;
        range.setStart(textNode, 0);
        range.setEnd(textNode, 5);
    },
    { backgroundColor: "green" },
    {
        "最外层背景仍是 orange": `<span style="background-color:orange"`,
        "内层 color:blue 仍在": `<span style="color:blue"`,
        "新增了 background-color:green 在 'world' 附近": `background-color:green`,
    },
);

// === 测试 3：纯文本无 span，选中部分应用颜色 ===
test(
    "场景 3：纯文本 'Hello world'，选 'world' 应用 background-color:yellow",
    (vh) => {
        vh.innerHTML = `Hello world`;
    },
    (vh, range) => {
        const textNode = vh.firstChild;
        range.setStart(textNode, 6);
        range.setEnd(textNode, 11);
    },
    { backgroundColor: "yellow" },
    {
        "新增的 span 包裹 'world'": `<span style="background-color:yellow">world</span>`,
        "保留 'Hello' 在新 span 之前": `Hello `,
    },
    [`<span style="background-color:yellow">Hello`],  // 确保不是整个都被包了
);

console.log("\n=== 全部测试完成 ===");
console.log(process.exitCode ? "❌ 有失败" : "✅ 全部通过");