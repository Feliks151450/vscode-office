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

const userDom = `<p data-block="0"><span class="vditor-ir__node vditor-html-inline--readonly" contenteditable="false" data-type="html-inline" data-md-source="&lt;span style=&quot;background-color:#fed7aa&quot;&gt;示例页面&lt;/span&gt;"><span class="vditor-html-inline__display"><span style="background-color:#fed7aa">示例<span class="vditor-ir__node vditor-html-inline--readonly" contenteditable="false" data-type="html-inline" data-md-source="&lt;span style=&quot;color:#dc2626&quot;&gt;页面&lt;/span&gt;"><span class="vditor-html-inline__display"><span style="color:#dc2626">页面</span></span></span></span></span></span></p>`;

// 尝试 4：只更新外层 data-md-source + 移除 class + contenteditable（保留内层 shell）
const dom4 = new JSDOM(userDom);
const doc4 = dom4.window.document;
const outer4 = doc4.querySelector('[data-type="html-inline"]');
outer4.classList.remove('vditor-html-inline--readonly');
outer4.removeAttribute('contenteditable');
outer4.setAttribute('data-md-source', '<span style="background-color:#fed7aa">示例<span style="color:#dc2626">页面</span></span>');

console.log("=== 尝试 4：更新 data-md-source + 移除 class + 保留内层 shell ===");
console.log("DOM:", doc4.body.innerHTML);
console.log("Lute:", JSON.stringify(lute.VditorIRDOM2Md(doc4.body.innerHTML)));

// 尝试 5：只更新外层 data-md-source，class 和 contenteditable 不动
const dom5 = new JSDOM(userDom);
const doc5 = dom5.window.document;
const outer5 = doc5.querySelector('[data-type="html-inline"]');
outer5.setAttribute('data-md-source', '<span style="background-color:#fed7aa">示例<span style="color:#dc2626">页面</span></span>');

console.log("\n=== 尝试 5：仅更新 data-md-source，class 和 contenteditable 保持 ===");
console.log("Lute:", JSON.stringify(lute.VditorIRDOM2Md(doc5.body.innerHTML)));

// 尝试 6：单层对照
const singleDom = `<p data-block="0"><span class="vditor-ir__node vditor-html-inline--readonly" contenteditable="false" data-type="html-inline" data-md-source="&lt;span style=&quot;color:red&quot;&gt;red&lt;/span&gt;"><span class="vditor-html-inline__display"><span style="color:red">red</span></span></span></p>`;
console.log("\n=== 单层对照：原始 ===");
console.log("Lute:", JSON.stringify(lute.VditorIRDOM2Md(singleDom)));

const dom6 = new JSDOM(singleDom);
const doc6 = dom6.window.document;
const outer6 = doc6.querySelector('[data-type="html-inline"]');
outer6.classList.remove('vditor-html-inline--readonly');
outer6.removeAttribute('contenteditable');
console.log("\n=== 单层：移除 class + contenteditable ===");
console.log("DOM:", doc6.body.innerHTML);
console.log("Lute:", JSON.stringify(lute.VditorIRDOM2Md(doc6.body.innerHTML)));

// 尝试 7：嵌套修复后的 DOM（保留 nested html-inline shell）然后 test 三层嵌套
const tripleDom = `<p data-block="0"><span class="vditor-ir__node vditor-html-inline--readonly" contenteditable="false" data-type="html-inline" data-md-source="&lt;span style=&quot;background-color:#fed7aa&quot;&gt;A&lt;/span&gt;"><span class="vditor-html-inline__display"><span style="background-color:#fed7aa">A<span class="vditor-ir__node vditor-html-inline--readonly" contenteditable="false" data-type="html-inline" data-md-source="&lt;span style=&quot;color:red&quot;&gt;B&lt;/span&gt;"><span class="vditor-html-inline__display"><span style="color:red">B<span class="vditor-ir__node vditor-html-inline--readonly" contenteditable="false" data-type="html-inline" data-md-source="&lt;span style=&quot;text-decoration:underline&quot;&gt;C&lt;/span&gt;"><span class="vditor-html-inline__display"><span style="text-decoration:underline">C</span></span></span></span></span></span></span></span></p>`;
const dom7 = new JSDOM(tripleDom);
const doc7 = dom7.window.document;
// 找到最外层 shell
const outerShells = Array.from(doc7.querySelectorAll('[data-type="html-inline"]'));
outerShells.sort((a, b) => b.contains(a) ? 1 : (a.contains(b) ? -1 : 0));
// outerShells[0] 是最外层
const outermost = outerShells[0];
outermost.classList.remove('vditor-html-inline--readonly');
outermost.removeAttribute('contenteditable');
outermost.setAttribute('data-md-source', '<span style="background-color:#fed7aa">A<span style="color:red">B<span style="text-decoration:underline">C</span></span></span>');

console.log("\n=== 三层嵌套：更新最外层 + 移除 class ===");
console.log("DOM:", doc7.body.innerHTML);
console.log("Lute:", JSON.stringify(lute.VditorIRDOM2Md(doc7.body.innerHTML)));