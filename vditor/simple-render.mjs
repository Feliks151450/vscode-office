import { JSDOM } from "jsdom";
import { readFileSync } from "fs";
const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/", runScripts: "outside-only" });
const { window } = dom;
window.eval(readFileSync("/Users/linlifei/templateWithNode/vscode-office/vditor/src/js/lute/lute.min.js", "utf8"));
const lute = window.Lute.New();
lute.SetSanitize(false);
const ZWSP = "​";

for (const md of [
  '<span style="background-color:#fde68a">示例页面</span>',
]) {
  const html = lute.Md2VditorDOM(`${ZWSP}${md}${ZWSP}`);
  console.log("=== 简单（无嵌套）===");
  console.log(html);
  const temp = document.createElement("div");
  temp.innerHTML = html;
  const display = temp.querySelector(".vditor-html-inline__display");
  console.log("display.innerHTML:", display?.innerHTML ?? "null");
  const shell = temp.querySelector('[data-type="html-inline"]');
  console.log("shell outerHTML:", shell?.outerHTML);
}
