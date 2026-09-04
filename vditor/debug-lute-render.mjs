// 验证 Lute 在 data-md-source 含 </span> 时的行为
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

const esc = (s) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

console.log("=== 测试 A：data-md-source = 完整源（含 </span>），无 class ===");
const irA = `<p data-block="0"><span data-type="html-inline" data-md-source="${esc('<span style="background-color:#fed7aa">示例<span style="color:#dc2626">页面</span></span>')}"><span class="vditor-html-inline__display"><span style="background-color:#fed7aa">示例<span style="color:#dc2626">页面</span></span></span></span></p>`;
console.log(JSON.stringify(lute.VditorIRDOM2Md(irA)));

console.log("\n=== 测试 B：data-md-source = 空 span（含 </span>），有 placeholder ===");
const irB = `<p data-block="0"><span data-type="html-inline" data-md-source="${esc('<span style="background-color:#fed7aa"></span>')}"><span class="vditor-html-inline__display"><span style="background-color:#fed7aa"></span></span>示例<span data-type="html-inline" data-md-source="${esc('<span style="color:#dc2626">页面</span>')}"><span class="vditor-html-inline__display"><span style="color:#dc2626">页面</span></span></span></span></span></p>`;
console.log(JSON.stringify(lute.VditorIRDOM2Md(irB)));

console.log("\n=== 测试 C：data-md-source = 仅开标签，children 是 text + inner shell ===");
const irC = `<p data-block="0"><span data-type="html-inline" data-md-source="${esc('<span style="background-color:#fed7aa">')}"><span class="vditor-html-inline__display"><span style="background-color:#fed7aa"></span></span>示例<span data-type="html-inline" data-md-source="${esc('<span style="color:#dc2626">页面</span>')}"><span class="vditor-html-inline__display"><span style="color:#dc2626">页面</span></span></span></span></span></p>`;
console.log(JSON.stringify(lute.VditorIRDOM2Md(irC)));

console.log("\n=== 测试 D：data-md-source = 仅开标签 + content inline（无 display、text）===");
const irD = `<p data-block="0"><span data-type="html-inline" data-md-source="${esc('<span style="background-color:#fed7aa">示例<span style="color:#dc2626">页面</span></span>')}"></span></p>`;
console.log(JSON.stringify(lute.VditorIRDOM2Md(irD)));