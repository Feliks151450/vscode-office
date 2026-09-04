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

// === 用户反馈的精确 HTML 结构（来自浏览器元素检查器）===
const userDom = `<p data-block="0"><span class="vditor-ir__node vditor-html-inline vditor-html-inline--readonly" contenteditable="false" data-type="html-inline" data-open-tag="&lt;span style=&quot;background-color:#fed7aa&quot;&gt;" data-md-source="&lt;span style=&quot;background-color:#fed7aa&quot;&gt;示例页面&lt;/span&gt;"><span class="vditor-html-inline__display"><span style="background-color:#fed7aa">示例<span class="vditor-ir__node vditor-html-inline vditor-html-inline--readonly" contenteditable="false" data-type="html-inline" data-open-tag="&lt;span style=&quot;color:#dc2626&quot;&gt;" data-md-source="&lt;span style=&quot;color:#dc2626&quot;&gt;页面&lt;/span&gt;"><span class="vditor-html-inline__display"><span style="color:#dc2626">页面</span></span></span></span></span></span></p>`;

console.log("=== 用户的精确 DOM → IR DOM 转 Markdown ===");
const result = lute.VditorIRDOM2Md(userDom);
console.log(JSON.stringify(result));
console.log();

console.log("=== 检查 IR DOM 内部结构 ===");
// 用 jsdom 解析，看一下实际结构
const dom2 = new JSDOM(userDom);
const { document } = dom2.window;
const root = document.querySelector("p[data-block='0']");
console.log("根节点:", root.tagName);
console.log("子节点结构:");
const printNode = (node, depth = 0) => {
    const indent = "  ".repeat(depth);
    if (node.nodeType === 3) {
        console.log(`${indent}#text "${node.textContent}"`);
        return;
    }
    if (node.nodeType !== 1) return;
    const el = node;
    const attrs = Array.from(el.attributes).map(a => `${a.name}="${a.value}"`).join(" ");
    console.log(`${indent}<${el.tagName.toLowerCase()} ${attrs}>`);
    Array.from(el.childNodes).forEach(c => printNode(c, depth + 1));
};
printNode(root);

console.log();
console.log("=== 单层 html-inline 测试 ===");
const singleIr = `<p data-block="0"><span class="vditor-ir__node vditor-html-inline vditor-html-inline--readonly" contenteditable="false" data-type="html-inline" data-open-tag="&lt;span style=&quot;background-color:#fed7aa&quot;&gt;" data-md-source="&lt;span style=&quot;background-color:#fed7aa&quot;&gt;示例页面&lt;/span&gt;"><span class="vditor-html-inline__display"><span style="background-color:#fed7aa">示例页面</span></span></span></p>`;
console.log("单层输出：", JSON.stringify(lute.VditorIRDOM2Md(singleIr)));

console.log();
console.log("=== 极简测试（无 vditor 类名）===");
const minimalIr = `<p data-block="0"><span data-type="html-inline" data-md-source="&lt;span style=&quot;color:red&quot;&gt;red&lt;/span&gt;"><span class="vditor-html-inline__display"><span style="color:red">red</span></span></span></p>`;
console.log("极简输出：", JSON.stringify(lute.VditorIRDOM2Md(minimalIr)));