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
const ZWSP = "";

const md = `<span style="background-color: rgb(253, 230, 138);">示例<span style="color: rgb(220, 38, 38);">页面</span></span>`;
const html = lute.Md2VditorDOM(ZWSP + md + ZWSP);
console.log("WYSIWYG Lute 输出:");
console.log(html);
console.log();

const dom2 = new JSDOM(`<body>${html}</body>`);
const doc = dom2.window.document;
const p = doc.querySelector("p[data-block]");
console.log("p children:");
for (const c of p.childNodes) {
    console.log(`  ${c.nodeType === 1 ? 'ELEM:' + c.tagName : 'TEXT:' + JSON.stringify(c.textContent)}`);
}