import { JSDOM } from "jsdom";
import { readFileSync } from "fs";

const LUTE_PATH = "/Users/linlifei/templateWithNode/vscode-office/vditor/src/js/lute/lute.min.js";
const luteSource = readFileSync(LUTE_PATH, "utf8");

const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/", runScripts: "outside-only" });
const { window } = dom;
window.eval(luteSource);
const Lute = window.Lute;
const lute = Lute.New();

console.log("=== IR 模式（Md2VditorIRDOM）===");
console.log(lute.Md2VditorIRDOM("​<span style=\"color:red\">red</span>​"));

console.log("\n=== WYSIWYG 模式（Md2VditorDOM）===");
console.log(lute.Md2VditorDOM("​<span style=\"color:red\">red</span>​"));

console.log("\n=== 嵌套 IR 模式 ===");
console.log(lute.Md2VditorIRDOM("​<span style=\"background-color:#fed7aa\">示例<span style=\"color:#dc2626\">页面</span></span>​"));

console.log("\n=== 嵌套 WYSIWYG 模式 ===");
console.log(lute.Md2VditorDOM("​<span style=\"background-color:#fed7aa\">示例<span style=\"color:#dc2626\">页面</span></span>​"));