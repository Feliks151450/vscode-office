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

// 修复后的 renderHtmlInlineFromMd
const fixShellDisplayForApply = (shell) => {
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
        fixShellDisplayForApply(childShell);
    }
};

const renderHtmlInlineFromMd = (md) => {
    const trimmed = md.trim();
    if (!trimmed) return "";
    const wrapper = `${ZWSP}${trimmed}${ZWSP}`;
    const html = lute.Md2VditorDOM(wrapper);
    const temp = document.createElement("div");
    temp.innerHTML = html;
    const paragraph = temp.querySelector("p[data-block]") ?? temp.firstElementChild;
    if (!paragraph) return "";
    const anchorShell = paragraph.querySelector('[data-type="html-inline"]');
    if (!anchorShell) return "";
    anchorShell.setAttribute("data-md-source", trimmed);
    const openTag = trimmed.match(/^<[a-zA-Z][^>]*>/);
    if (openTag) anchorShell.setAttribute("data-open-tag", openTag[0]);
    anchorShell.classList.remove("vditor-html-inline--readonly");
    anchorShell.classList.remove("vditor-html-inline");
    anchorShell.removeAttribute("contenteditable");
    fixShellDisplayForApply(anchorShell);
    return anchorShell.outerHTML;
};

const md = `<span style="background-color: rgb(253, 230, 138);">示例<span style="color: rgb(220, 38, 38);">页面</span></span>`;
const result = renderHtmlInlineFromMd(md);
console.log("修复后 renderHtmlInlineFromMd 输出:");
console.log(result);
console.log();

// 检查 display 内容
const dom2 = new JSDOM(`<div>${result}</div>`);
const doc = dom2.window.document;
const outer = doc.querySelector('[data-type="html-inline"]');
console.log("\n外壳 data-md-source:", outer.getAttribute("data-md-source"));
const display = outer.querySelector('.vditor-html-inline__display');
console.log("\ndisplay 子节点:");
for (const c of Array.from(display.childNodes)) {
    if (c.nodeType === 3) console.log(`  TEXT: "${c.textContent}"`);
    else if (c.getAttribute('data-type') === 'html-inline') {
        console.log(`  INNER SHELL: data-md-source=${c.getAttribute('data-md-source')}`);
        const innerDisplay = c.querySelector('.vditor-html-inline__display');
        if (innerDisplay) {
            console.log(`    inner display 子节点:`);
            for (const cc of Array.from(innerDisplay.childNodes)) {
                if (cc.nodeType === 3) console.log(`      TEXT: "${cc.textContent}"`);
                else console.log(`      ELEMENT: <${cc.tagName.toLowerCase()} ${cc.getAttribute('style') || ''}>`);
            }
        }
    } else {
        console.log(`  ELEMENT: <${c.tagName.toLowerCase()} ${c.getAttribute('style') || ''}>`);
        console.log(`    内容: "${c.textContent}"`);
    }
}

// 现在 execCommand("insertHTML", false, result) 后编辑器处理
console.log("\n=== 模拟 execCommand 插入到编辑器 ===");
const editor = document.createElement("div");
editor.innerHTML = `<p data-block="0">这是一个 <span data-type="html-inline" data-md-source="<span>old</span>">old</span>。</p>`;
const oldShell = editor.querySelector('[data-type="html-inline"]');

// 直接 innerHTML 替换（模拟 execCommand）
const temp2 = document.createElement("div");
temp2.innerHTML = result;
oldShell.replaceWith(...Array.from(temp2.childNodes));

console.log("替换后 editor.innerHTML:");
console.log(editor.innerHTML.slice(0, 600));
console.log();

const newShells = editor.querySelectorAll('[data-type="html-inline"]');
console.log(`html-inline shell 数量: ${newShells.length}`);
for (const s of newShells) {
    console.log(`  data-md-source: ${s.getAttribute('data-md-source')?.slice(0, 100)}`);
}

// getValue
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