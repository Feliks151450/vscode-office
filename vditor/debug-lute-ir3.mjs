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

const IR_CLASS = 'class="vditor-ir__node vditor-html-inline--readonly" contenteditable="false"';
const TYPE_ATTR = 'data-type="html-inline"';
const DISPLAY_CLASS = 'class="vditor-html-inline__display"';

console.log("=== IR class + 单层 + display + text 兄弟 + 仅open tag data-md-source ===");
console.log(JSON.stringify(lute.VditorIRDOM2Md(
    `<p data-block="0"><span ${IR_CLASS} ${TYPE_ATTR} data-md-source="${esc('<span style="color:red">')}"><span ${DISPLAY_CLASS}><span style="color:red"></span></span>red</span></p>`
)));

console.log("\n=== IR class + 单层 + 只有 display，没兄弟 text + 仅open tag ===");
console.log(JSON.stringify(lute.VditorIRDOM2Md(
    `<p data-block="0"><span ${IR_CLASS} ${TYPE_ATTR} data-md-source="${esc('<span style="color:red">')}"><span ${DISPLAY_CLASS}><span style="color:red"></span></span></span></p>`
)));

console.log("\n=== IR class + 单层 + 只有 text 兄弟 + 仅open tag ===");
console.log(JSON.stringify(lute.VditorIRDOM2Md(
    `<p data-block="0"><span ${IR_CLASS} ${TYPE_ATTR} data-md-source="${esc('<span style="color:red">')}">red</span></p>`
)));

console.log("\n=== IR class + 单层 + 完整 data-md-source + 只有 display ===");
console.log(JSON.stringify(lute.VditorIRDOM2Md(
    `<p data-block="0"><span ${IR_CLASS} ${TYPE_ATTR} data-md-source="${esc('<span style="color:red">red</span>')}"><span ${DISPLAY_CLASS}><span style="color:red"></span></span></span></p>`
)));

console.log("\n=== IR class + 单层 + 完整 data-md-source + 完整 display ===");
console.log(JSON.stringify(lute.VditorIRDOM2Md(
    `<p data-block="0"><span ${IR_CLASS} ${TYPE_ATTR} data-md-source="${esc('<span style="color:red">red</span>')}"><span ${DISPLAY_CLASS}><span style="color:red">red</span></span></span></p>`
)));

console.log("\n=== 测试：是不是只有 vditor-html-inline--readonly 这个 class 触发？换成 vditor-html-block？===");
console.log(JSON.stringify(lute.VditorIRDOM2Md(
    `<p data-block="0"><span class="vditor-ir__node" contenteditable="false" data-type="html-inline" data-md-source="${esc('<span style="color:red">red</span>')}"><span ${DISPLAY_CLASS}><span style="color:red">red</span></span></span></p>`
)));