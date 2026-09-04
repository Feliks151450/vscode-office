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

const escapeAttr = (s) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const escapeHtml = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const findMatchingClose = (md, startPos, closeTag) => {
    const tagName = closeTag.slice(2, -1);
    const openRe = new RegExp(`<${tagName}(\\s[^>]*?)?>`, "gi");
    const closeRe = new RegExp(`</${tagName}\\s*>`, "gi");
    let depth = 1;
    let pos = startPos;
    while (pos < md.length) {
        openRe.lastIndex = pos;
        closeRe.lastIndex = pos;
        const openMatch = openRe.exec(md);
        const closeMatch = closeRe.exec(md);
        if (!closeMatch) return -1;
        if (!openMatch || openMatch.index > closeMatch.index) {
            depth--;
            pos = closeMatch.index + closeMatch[0].length;
            if (depth === 0) return closeMatch.index;
        } else {
            depth++;
            pos = openMatch.index + openMatch[0].length;
        }
    }
    return -1;
};

const mdToStyledSpanHtml = (md) => {
    let result = "";
    let pos = 0;
    while (pos < md.length) {
        const openMatch = md.slice(pos).match(/^<([a-zA-Z][^>]*?)>/);
        if (openMatch) {
            const attrs = openMatch[1];
            const tagEnd = pos + openMatch[0].length;
            const tagName = attrs.split(/\s/)[0];
            const closeTag = `</${tagName}>`;
            const closeIdx = findMatchingClose(md, tagEnd, closeTag);
            if (closeIdx === -1) {
                result += escapeHtml(md.slice(pos));
                break;
            }
            const innerMd = md.slice(tagEnd, closeIdx);
            const innerHtml = mdToStyledSpanHtml(innerMd);
            const styleMatch = attrs.match(/\bstyle\s*=\s*"([^"]*)"/i);
            const styleAttr = styleMatch ? ` style="${escapeAttr(styleMatch[1])}"` : "";
            result += `<${tagName}${styleAttr}>${innerHtml}${closeTag}`;
            pos = closeIdx + closeTag.length;
        } else {
            const nextOpen = md.slice(pos).search(/<[a-zA-Z]/);
            if (nextOpen === -1) {
                result += escapeHtml(md.slice(pos));
                break;
            }
            result += escapeHtml(md.slice(pos, pos + nextOpen));
            pos += nextOpen;
        }
    }
    return result;
};

const renderHtmlInlineFromMd = (md) => {
    const trimmed = md.trim();
    if (!trimmed) return "";
    const displayHtml = mdToStyledSpanHtml(trimmed);
    const openTagMatch = trimmed.match(/^<([a-zA-Z][^>]*?)>/);
    const openTag = openTagMatch ? `<${openTagMatch[1]}>` : "";
    return (
        `<span class="vditor-ir__node" contenteditable="false" ` +
        `data-type="html-inline" data-open-tag="${escapeAttr(openTag)}" ` +
        `data-md-source="${escapeAttr(trimmed)}">` +
        `<span class="vditor-html-inline__display">${displayHtml}</span>` +
        `</span>`
    );
};

// 用户场景测试
const md = `<span style="background-color: rgb(253, 230, 138);">示例<span style="color: rgb(220, 38, 38);">页面</span></span>`;
const result = renderHtmlInlineFromMd(md);
console.log("=== 手写包装输出 ===");
console.log(result);
console.log();

// 解析后看 display 内容
const dom2 = new JSDOM(`<div>${result}</div>`);
const doc = dom2.window.document;
const outer = doc.querySelector('[data-type="html-inline"]');
console.log("外壳 data-md-source:", outer.getAttribute("data-md-source"));
console.log("\ndisplay 子节点:");
const display = outer.querySelector('.vditor-html-inline__display');
for (const c of Array.from(display.childNodes)) {
    if (c.nodeType === 3) console.log(`  TEXT: "${c.textContent}"`);
    else console.log(`  ELEMENT: <${c.tagName.toLowerCase()} ${c.getAttribute("style") || ''}> 内容:"${c.textContent}"`);
}

// 模拟 execCommand 插入到编辑器
console.log("\n=== 模拟编辑器 replaceWith ===");
const editor = document.createElement("div");
editor.innerHTML = `<p data-block="0">这是一个 <span data-type="html-inline" data-md-source="<span>old</span>">old</span>。</p>`;
const oldShell = editor.querySelector('[data-type="html-inline"]');
const temp = document.createElement("div");
temp.innerHTML = result;
oldShell.replaceWith(...Array.from(temp.childNodes));

console.log("editor.innerHTML:");
console.log(editor.innerHTML.slice(0, 600));
console.log();

const newShells = editor.querySelectorAll('[data-type="html-inline"]');
console.log(`html-inline shell 数量: ${newShells.length}`);
for (const s of newShells) {
    console.log(`  data-md-source: ${s.getAttribute('data-md-source')?.slice(0, 100)}`);
}

const finalMd = lute.VditorDOM2Md(editor.innerHTML);
console.log("\n=== getValue 输出 ===");
console.log(JSON.stringify(finalMd));

const checks = {
    "包含 background-color": finalMd.includes("background-color"),
    "包含 color: rgb(220": finalMd.includes("color: rgb(220"),
    "包含 '示例'": finalMd.includes("示例"),
    "包含 '页面'": finalMd.includes("页面"),
};
for (const [k, v] of Object.entries(checks)) {
    console.log(`  ${v ? "✅" : "❌"} ${k}`);
}
if (!Object.values(checks).every(Boolean)) process.exitCode = 1;