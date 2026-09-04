// Test with the user's EXACT data-md-source values
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

console.log("=== 用户精确 DOM（data-md-source 已是完整源）===");
const userDom = `<p data-block="0"><span class="vditor-ir__node vditor-html-inline vditor-html-inline--readonly" contenteditable="false" data-type="html-inline" data-open-tag="${esc('<span style="background-color:#fed7aa">')}" data-md-source="${esc('<span style="background-color:#fed7aa">示例页面</span>')}"><span class="vditor-html-inline__display"><span style="background-color:#fed7aa">示例<span class="vditor-ir__node vditor-html-inline vditor-html-inline--readonly" contenteditable="false" data-type="html-inline" data-open-tag="${esc('<span style="color:#dc2626">')}" data-md-source="${esc('<span style="color:#dc2626">页面</span>')}"><span class="vditor-html-inline__display"><span style="color:#dc2626">页面</span></span></span></span></span></span></p>`;
console.log("用户 DOM 序列化:", JSON.stringify(lute.VditorIRDOM2Md(userDom)));

console.log("\n=== 简化版本：data-md-source 是完整外层源（包含整个外层 text），内层 shell 在 display 里 ===");
const ir1 = `<p data-block="0"><span data-type="html-inline" data-md-source="${esc('<span style="background-color:#fed7aa">示例页面</span>')}"><span class="vditor-html-inline__display"><span style="background-color:#fed7aa">示例<span data-type="html-inline" data-md-source="${esc('<span style="color:#dc2626">页面</span>')}"><span class="vditor-html-inline__display"><span style="color:#dc2626">页面</span></span></span></span></span></span></p>`;
console.log("输出:", JSON.stringify(lute.VditorIRDOM2Md(ir1)));

console.log("\n=== 反过来：data-md-source 是 open tag only + 内容在 children（用户 HTML 实际结构的变体）===");
const ir2 = `<p data-block="0"><span data-type="html-inline" data-md-source="${esc('<span style="background-color:#fed7aa">')}"><span class="vditor-html-inline__display"><span style="background-color:#fed7aa">示例<span data-type="html-inline" data-md-source="${esc('<span style="color:#dc2626">')}"><span class="vditor-html-inline__display"><span style="color:#dc2626">页面</span></span></span></span></span></span></p>`;
console.log("输出:", JSON.stringify(lute.VditorIRDOM2Md(ir2)));

console.log("\n=== 把内层 shell 移除，但保留内层 styled span，data-md-source 是 open tag only ===");
const ir3 = `<p data-block="0"><span data-type="html-inline" data-md-source="${esc('<span style="background-color:#fed7aa">')}"><span class="vditor-html-inline__display"><span style="background-color:#fed7aa">示例<span style="color:#dc2626">页面</span></span></span></span></p>`;
console.log("输出:", JSON.stringify(lute.VditorIRDOM2Md(ir3)));

console.log("\n=== 和 ir3 一样但 data-md-source 是完整嵌套源 ===");
const ir4 = `<p data-block="0"><span data-type="html-inline" data-md-source="${esc('<span style="background-color:#fed7aa">示例<span style="color:#dc2626">页面</span></span>')}"><span class="vditor-html-inline__display"><span style="background-color:#fed7aa">示例<span style="color:#dc2626">页面</span></span></span></span></p>`;
console.log("输出:", JSON.stringify(lute.VditorIRDOM2Md(ir4)));