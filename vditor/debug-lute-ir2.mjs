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

// 用户场景的 IR class
const IR_CLASS = 'class="vditor-ir__node vditor-html-inline--readonly" contenteditable="false"';
const TYPE_ATTR = 'data-type="html-inline"';
const DISPLAY_CLASS = 'class="vditor-html-inline__display"';

console.log("=== 单层 + 完整 data-md-source + IR class ===");
console.log(lute.VditorIRDOM2Md(
    `<p data-block="0"><span ${IR_CLASS} ${TYPE_ATTR} data-md-source="${esc('<span style="color:red">red</span>')}"><span ${DISPLAY_CLASS}><span style="color:red">red</span></span></span></p>`
));

console.log("\n=== 单层 + 完整 data-md-source + IR class + display 之后有兄弟文本 ===");
console.log(lute.VditorIRDOM2Md(
    `<p data-block="0"><span ${IR_CLASS} ${TYPE_ATTR} data-md-source="${esc('<span style="color:red">red</span>')}"><span ${DISPLAY_CLASS}><span style="color:red"></span></span>red</span></p>`
));

console.log("\n=== 单层 + open tag data-md-source + IR class ===");
console.log(lute.VditorIRDOM2Md(
    `<p data-block="0"><span ${IR_CLASS} ${TYPE_ATTR} data-md-source="${esc('<span style="color:red">')}"><span ${DISPLAY_CLASS}><span style="color:red">red</span></span></span></p>`
));

console.log("\n=== 单层 + open tag + IR class + display 后有兄弟文本 ===");
console.log(lute.VditorIRDOM2Md(
    `<p data-block="0"><span ${IR_CLASS} ${TYPE_ATTR} data-md-source="${esc('<span style="color:red">')}"><span ${DISPLAY_CLASS}><span style="color:red"></span></span>red</span></p>`
));

console.log("\n=== 嵌套 + open tag data-md-source + IR class（与用户场景等价）===");
console.log(lute.VditorIRDOM2Md(
    `<p data-block="0"><span ${IR_CLASS} ${TYPE_ATTR} data-md-source="${esc('<span style="background-color:#fed7aa">')}"><span ${DISPLAY_CLASS}><span style="background-color:#fed7aa"></span></span>示例<span ${IR_CLASS} ${TYPE_ATTR} data-md-source="${esc('<span style="color:#dc2626">')}"><span ${DISPLAY_CLASS}><span style="color:#dc2626"></span></span>页面</span></span></p>`
));

console.log("\n=== 嵌套 + display 内嵌套 span + 完整 data-md-source ===");
console.log(lute.VditorIRDOM2Md(
    `<p data-block="0"><span ${IR_CLASS} ${TYPE_ATTR} data-md-source="${esc('<span style="background-color:#fed7aa">示例<span style="color:#dc2626">页面</span></span>')}"><span ${DISPLAY_CLASS}><span style="background-color:#fed7aa">示例<span style="color:#dc2626">页面</span></span></span></span></p>`
));

console.log("\n=== 嵌套 + 内层 shell 存在 + 完整 data-md-source（用户 HTML 的简化版）===");
console.log(lute.VditorIRDOM2Md(
    `<p data-block="0"><span ${IR_CLASS} ${TYPE_ATTR} data-md-source="${esc('<span style="background-color:#fed7aa">示例<span style="color:#dc2626">页面</span></span>')}"><span ${DISPLAY_CLASS}><span style="background-color:#fed7aa">示例<span ${IR_CLASS} ${TYPE_ATTR} data-md-source="${esc('<span style="color:#dc2626">页面</span>')}"><span ${DISPLAY_CLASS}><span style="color:#dc2626">页面</span></span></span></span></span></span></p>`
));