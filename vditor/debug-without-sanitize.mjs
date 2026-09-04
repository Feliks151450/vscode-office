import { JSDOM } from "jsdom";
import { readFileSync } from "fs";

const LUTE_PATH = "/Users/linlifei/templateWithNode/vscode-office/vditor/src/js/lute/lute.min.js";
const luteSource = readFileSync(LUTE_PATH, "utf8");

const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/", runScripts: "outside-only" });
const { window } = dom;
window.eval(luteSource);
const Lute = window.Lute;
const lute = Lute.New();
lute.SetSanitize(false);  // 关闭 sanitize

// 单层带样式 span
console.log("=== 单层 span + sanitize=false ===");
console.log(JSON.stringify(lute.VditorIRDOM2Md(
    `<p data-block="0"><span style="color:red">red</span></p>`
)));

console.log("\n=== 单层 span + sanitize=false，前后有文本 ===");
console.log(JSON.stringify(lute.VditorIRDOM2Md(
    `<p data-block="0">before<span style="color:red">red</span>after</p>`
)));

console.log("\n=== 嵌套 span + sanitize=false ===");
console.log(JSON.stringify(lute.VditorIRDOM2Md(
    `<p data-block="0"><span style="background-color:#fed7aa">示例<span style="color:#dc2626">页面</span></span></p>`
)));

// 剥壳 + sanitize=false
const strippedNested = `<p data-block="0"><span style="background-color:#fed7aa">示例<span style="color:#dc2626">页面</span></span></p>`;
console.log("\n=== 剥壳后嵌套（无内层 shell） + sanitize=false ===");
console.log(JSON.stringify(lute.VditorIRDOM2Md(strippedNested)));