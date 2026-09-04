// Verify exactly what Lute.VditorIRDOM2Md does with various data-md-source formats
import { JSDOM } from "jsdom";
import { readFileSync } from "fs";

const LUTE_PATH = "/Users/linlifei/templateWithNode/vscode-office/vditor/src/js/lute/lute.min.js";
const luteSource = readFileSync(LUTE_PATH, "utf8");

const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/", runScripts: "outside-only" });
const { window } = dom;
window.eval(luteSource);
const Lute = window.Lute;
const lute = Lute.New();

const esc = (s) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

console.log("=== 测试 A：data-md-source 是完整源 + 无嵌套 shell ===");
const irA = `<p data-block="0"><span data-type="html-inline" data-md-source="${esc('<span style="color:red">red</span>')}"><span class="vditor-html-inline__display"><span style="color:red">red</span></span></span></p>`;
console.log("输出:", JSON.stringify(lute.VditorIRDOM2Md(irA)));

console.log("\n=== 测试 B：data-md-source 只是 open tag + 文本子节点 ===");
const irB = `<p data-block="0"><span data-type="html-inline" data-md-source="${esc('<span style="color:red">')}"><span class="vditor-html-inline__display"><span style="color:red"></span></span>red</span></p>`;
console.log("输出:", JSON.stringify(lute.VditorIRDOM2Md(irB)));

console.log("\n=== 测试 C：data-md-source 是完整嵌套源 + display 内含嵌套 span ===");
const irC = `<p data-block="0"><span data-type="html-inline" data-md-source="${esc('<span style="background-color:#fed7aa">示例<span style="color:#dc2626">页面</span></span>')}"><span class="vditor-html-inline__display"><span style="background-color:#fed7aa">示例<span style="color:#dc2626">页面</span></span></span></span></p>`;
console.log("输出:", JSON.stringify(lute.VditorIRDOM2Md(irC)));

console.log("\n=== 测试 D：data-md-source 是完整嵌套源 + 嵌套 shell 存在 ===");
const irD = `<p data-block="0"><span data-type="html-inline" data-md-source="${esc('<span style="background-color:#fed7aa">示例<span style="color:#dc2626">页面</span></span>')}"><span class="vditor-html-inline__display"><span style="background-color:#fed7aa">示例<span data-type="html-inline" data-md-source="${esc('<span style="color:#dc2626">页面</span>')}"><span class="vditor-html-inline__display"><span style="color:#dc2626">页面</span></span></span></span></span></span></p>`;
console.log("输出:", JSON.stringify(lute.VditorIRDOM2Md(irD)));

console.log("\n=== 测试 E：把嵌套 shell 移除，只保留 display + 外层 data-md-source 是完整嵌套源 ===");
const irE = `<p data-block="0"><span data-type="html-inline" data-md-source="${esc('<span style="background-color:#fed7aa">示例<span style="color:#dc2626">页面</span></span>')}"><span class="vditor-html-inline__display"><span style="background-color:#fed7aa">示例<span style="color:#dc2626">页面</span></span></span></span></p>`;
console.log("输出:", JSON.stringify(lute.VditorIRDOM2Md(irE)));

console.log("\n=== 测试 F：把嵌套 shell 移除 + data-md-source 是 open tag only（不修复）===");
const irF = `<p data-block="0"><span data-type="html-inline" data-md-source="${esc('<span style="background-color:#fed7aa">')}"><span class="vditor-html-inline__display"><span style="background-color:#fed7aa">示例<span style="color:#dc2626">页面</span></span></span></span></p>`;
console.log("输出:", JSON.stringify(lute.VditorIRDOM2Md(irF)));