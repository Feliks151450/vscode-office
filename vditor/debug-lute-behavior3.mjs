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

const innerShell = `<span data-type="html-inline" data-md-source="${esc('<span style="color:#dc2626">页面</span>')}"><span class="vditor-html-inline__display"><span style="color:#dc2626">页面</span></span></span>`;
const innerContent = `<span style="color:#dc2626">页面</span>`;

console.log("=== 测试不同 attrs 对 Lute 行为的影响 ===");

console.log("\n[T1] 极简外层 + data-md-source=完整源 + 内层 shell:");
console.log(JSON.stringify(lute.VditorIRDOM2Md(
    `<p data-block="0"><span data-type="html-inline" data-md-source="${esc('<span style="background-color:#fed7aa">示例页面</span>')}"><span class="vditor-html-inline__display"><span style="background-color:#fed7aa">示例${innerShell}</span></span></span></p>`
)));

console.log("\n[T2] 加 class vditor-ir__node:");
console.log(JSON.stringify(lute.VditorIRDOM2Md(
    `<p data-block="0"><span class="vditor-ir__node" data-type="html-inline" data-md-source="${esc('<span style="background-color:#fed7aa">示例页面</span>')}"><span class="vditor-html-inline__display"><span style="background-color:#fed7aa">示例${innerShell}</span></span></span></p>`
)));

console.log("\n[T3] 加 vditor-html-inline:");
console.log(JSON.stringify(lute.VditorIRDOM2Md(
    `<p data-block="0"><span class="vditor-ir__node vditor-html-inline" data-type="html-inline" data-md-source="${esc('<span style="background-color:#fed7aa">示例页面</span>')}"><span class="vditor-html-inline__display"><span style="background-color:#fed7aa">示例${innerShell}</span></span></span></p>`
)));

console.log("\n[T4] 加 vditor-html-inline--readonly:");
console.log(JSON.stringify(lute.VditorIRDOM2Md(
    `<p data-block="0"><span class="vditor-ir__node vditor-html-inline vditor-html-inline--readonly" data-type="html-inline" data-md-source="${esc('<span style="background-color:#fed7aa">示例页面</span>')}"><span class="vditor-html-inline__display"><span style="background-color:#fed7aa">示例${innerShell}</span></span></span></p>`
)));

console.log("\n[T5] 加 contenteditable=false:");
console.log(JSON.stringify(lute.VditorIRDOM2Md(
    `<p data-block="0"><span class="vditor-ir__node vditor-html-inline vditor-html-inline--readonly" contenteditable="false" data-type="html-inline" data-md-source="${esc('<span style="background-color:#fed7aa">示例页面</span>')}"><span class="vditor-html-inline__display"><span style="background-color:#fed7aa">示例${innerShell}</span></span></span></p>`
)));

console.log("\n[T6] 加 data-open-tag:");
console.log(JSON.stringify(lute.VditorIRDOM2Md(
    `<p data-block="0"><span class="vditor-ir__node vditor-html-inline vditor-html-inline--readonly" contenteditable="false" data-type="html-inline" data-open-tag="${esc('<span style="background-color:#fed7aa">')}" data-md-source="${esc('<span style="background-color:#fed7aa">示例页面</span>')}"><span class="vditor-html-inline__display"><span style="background-color:#fed7aa">示例${innerShell}</span></span></span></p>`
)));

console.log("\n[T7] T6 + 内层 shell 也带 class:");
console.log(JSON.stringify(lute.VditorIRDOM2Md(
    `<p data-block="0"><span class="vditor-ir__node vditor-html-inline vditor-html-inline--readonly" contenteditable="false" data-type="html-inline" data-open-tag="${esc('<span style="background-color:#fed7aa">')}" data-md-source="${esc('<span style="background-color:#fed7aa">示例页面</span>')}"><span class="vditor-html-inline__display"><span style="background-color:#fed7aa">示例<span class="vditor-ir__node vditor-html-inline vditor-html-inline--readonly" contenteditable="false" data-type="html-inline" data-open-tag="${esc('<span style="color:#dc2626">')}" data-md-source="${esc('<span style="color:#dc2626">页面</span>')}"><span class="vditor-html-inline__display"><span style="color:#dc2626">页面</span></span></span></span></span></span></p>`
)));