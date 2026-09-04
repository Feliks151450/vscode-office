// 调试：先看 Lute 渲染出的 IR DOM 长什么样
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

console.log("=== 渲染 1：仅背景色 ===");
const md1 = `<span style="background-color:#fed7aa">示例页面</span>`;
const ir1 = lute.Md2VditorIRDOM(md1);
console.log(ir1);
console.log();
console.log("转回 markdown：");
console.log(lute.VditorIRDOM2Md(ir1));
console.log();

console.log("=== 渲染 2：嵌套结构（先外层后内层） ===");
const md2 = `<span style="background-color:#fed7aa">示例<span style="color:#dc2626">页面</span></span>`;
const ir2 = lute.Md2VditorIRDOM(md2);
console.log(ir2);
console.log();
console.log("转回 markdown：");
console.log(lute.VditorIRDOM2Md(ir2));
console.log();

console.log("=== 渲染 3：先内层后外层 ===");
const md3 = `<span style="color:#dc2626">页面</span><span style="background-color:#fed7aa">示例</span>`;
const ir3 = lute.Md2VditorIRDOM(md3);
console.log(ir3);
console.log();
console.log("转回 markdown：");
console.log(lute.VditorIRDOM2Md(ir3));