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
console.log("Lute 静态方法：");
console.log(Object.getOwnPropertyNames(Lute).filter(n => typeof Lute[n] === "function" && !n.startsWith("_")));

console.log("\nLute 实例原型方法：");
const lute = Lute.New();
const proto = Object.getPrototypeOf(lute);
console.log(Object.getOwnPropertyNames(proto).filter(n => typeof lute[n] === "function"));