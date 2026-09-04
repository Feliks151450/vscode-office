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

// 直接用 Lute 自己生成的 IR DOM 来测试回转
console.log("=== 直接用 Lute 生成的 IR DOM 测试回转 ===");

// 嵌套场景
const mdNested = `<span style="background-color:#fed7aa">示例<span style="color:#dc2626">页面</span></span>`;
const irNested = lute.Md2VditorIRDOM(mdNested);
console.log("Lute 生成的 IR DOM：");
console.log(irNested);
console.log();

const mdBack = lute.VditorIRDOM2Md(irNested);
console.log("VditorIRDOM2Md 输出：");
console.log(JSON.stringify(mdBack));
console.log();

console.log("=== 简单文本回转测试 ===");
const simpleMd = "Hello";
const simpleIr = lute.Md2VditorIRDOM(simpleMd);
console.log("简单 IR DOM：", simpleIr);
console.log("回转：", JSON.stringify(lute.VditorIRDOM2Md(simpleIr)));

console.log("\n=== HTML 测试 ===");
const htmlMd = `<span style="color:red">red</span>`;
const htmlIr = lute.Md2VditorIRDOM(htmlMd);
console.log("HTML IR DOM：", htmlIr);
console.log("回转：", JSON.stringify(lute.VditorIRDOM2Md(htmlIr)));

// 列出实例的所有属性
console.log("\n=== Lute 实例属性 ===");
for (const k of Object.getOwnPropertyNames(lute)) {
    const t = typeof lute[k];
    if (t === "function") console.log("method:", k);
    else console.log("prop:", k, "=", lute[k]);
}