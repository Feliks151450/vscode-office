// 直接测试 wrap 逻辑（绕过 jsdom 的 selection API 限制）
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
const { document } = window;
const ZWSP = "";

// 直接复现修复后的 wrap 行为（不通过 selection API）
const wrapSelection = (visualHost, startContainer, startOffset, endContainer, endOffset, newStyle) => {
    const range = document.createRange();
    range.setStart(startContainer, startOffset);
    range.setEnd(endContainer, endOffset);

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
    return span;
};

const test = (label, setupVisualHost, getRange, newStyle, assertions) => {
    console.log(`\n=== ${label} ===`);
    const vh = document.createElement("div");
    vh.setAttribute("contenteditable", "true");
    setupVisualHost(vh);
    console.log("初始:", vh.innerHTML);

    const { startContainer, startOffset, endContainer, endOffset } = getRange(vh);
    wrapSelection(vh, startContainer, startOffset, endContainer, endOffset, newStyle);
    console.log("应用后:", vh.innerHTML);

    let pass = true;
    for (const [name, expected] of Object.entries(assertions.contains || {})) {
        const ok = vh.innerHTML.includes(expected);
        console.log(`  ${ok ? "✅" : "❌"} 应包含 '${expected}' (${name})`);
        if (!ok) pass = false;
    }
    for (const expected of assertions.notContains || []) {
        const ok = !vh.innerHTML.includes(expected);
        console.log(`  ${ok ? "✅" : "❌"} 不应包含 '${expected}'`);
        if (!ok) pass = false;
    }
    if (!pass) process.exitCode = 1;
};

// === 测试 1：单层背景色，选中 'world' 设文字色 ===
test(
    "场景 1：单层背景色 [bg:orange]Hello world[/bg]，选 'world' 应用文字色 red",
    (vh) => {
        vh.innerHTML = `<span style="background-color:orange">Hello world</span>`;
    },
    (vh) => {
        const textNode = vh.querySelector("span").firstChild;
        return {
            startContainer: textNode, startOffset: 6,
            endContainer: textNode, endOffset: 11,
        };
    },
    { color: "red" },
    {
        contains: {
            "外层仍是 bg:orange": `background-color:orange`,
            "新增内层包了 color:red 和 world": `color: red;">world`,
        },
    },
);

// === 测试 2：嵌套，选 'world' 改背景色 ===
test(
    "场景 2：[bg:orange]Hello [color:blue]world[/color][/bg]，选 'world' 改 background-color:green",
    (vh) => {
        vh.innerHTML = `<span style="background-color:orange">Hello <span style="color:blue">world</span></span>`;
    },
    (vh) => {
        const textNode = vh.querySelector("span span").firstChild;
        return {
            startContainer: textNode, startOffset: 0,
            endContainer: textNode, endOffset: 5,
        };
    },
    { backgroundColor: "green" },
    {
        contains: {
            "外层 bg:orange 仍在": `background-color:orange`,
            "内层 color:blue 仍在": `color:blue`,
            "新增 bg:green 包裹 world": `background-color: green`,
        },
    },
);

// === 测试 3：纯文本，选 'world' 应用背景色 ===
test(
    "场景 3：纯文本 'Hello world'，选 'world' 应用 background-color:yellow",
    (vh) => {
        vh.innerHTML = `Hello world`;
    },
    (vh) => {
        const textNode = vh.firstChild;
        return {
            startContainer: textNode, startOffset: 6,
            endContainer: textNode, endOffset: 11,
        };
    },
    { backgroundColor: "yellow" },
    {
        contains: {
            "新增 span 包 world": `background-color: yellow;">world`,
            "保留 'Hello ' 在前": `Hello `,
        },
        notContains: [`background-color: yellow;">Hello`],
    },
);

// === 测试 4：在嵌套结构里选跨边界 ===
test(
    "场景 4：[bg:orange]Hello [color:blue]world[/color] test[/bg]，选 'world test' 改 color:green",
    (vh) => {
        vh.innerHTML = `<span style="background-color:orange">Hello <span style="color:blue">world</span> test</span>`;
    },
    (vh) => {
        const outer = vh.querySelector("span");
        const innerSpan = outer.querySelector("span");
        const innerText = innerSpan.firstChild;
        const outerText = outer.lastChild;
        const r = { startContainer: innerText, startOffset: 0, endContainer: outerText, endOffset: 5 };
        return r;
    },
    { color: "green" },
    {
        contains: {
            "外层 bg:orange 仍在": `background-color:orange`,
            "应用了 color:green": `color: green`,
        },
    },
);

console.log("\n=== 全部测试完成 ===");
console.log(process.exitCode ? "❌ 有失败" : "✅ 全部通过");