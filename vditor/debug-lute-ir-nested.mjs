// Verify IR-mode Lute behavior with nested shells
import { JSDOM } from "jsdom";
import { readFileSync } from "fs";

const LUTE_PATH = "/Users/linlifei/templateWithNode/vscode-office/vditor/src/js/lute/lute.min.js";
const luteSource = readFileSync(LUTE_PATH, "utf8");

const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/", runScripts: "outside-only" });
const { window } = dom;
window.eval(luteSource);
const Lute = window.Lute;
const lute = Lute.New();

console.log("=== IR 模式下：单层（对照组）===");
console.log(lute.VditorIRDOM2Md(
    `<p data-block="0"><span class="vditor-ir__node vditor-html-inline--readonly" contenteditable="false" data-type="html-inline" data-md-source="&lt;span style=&quot;color:red&quot;&gt;red&lt;/span&gt;"><span class="vditor-html-inline__display"><span style="color:red">red</span></span></span></p>`
));

console.log("\n=== IR 模式下：嵌套（用户场景）===");
console.log(lute.VditorIRDOM2Md(
    `<p data-block="0"><span class="vditor-ir__node vditor-html-inline--readonly" contenteditable="false" data-type="html-inline" data-md-source="&lt;span style=&quot;background-color:#fed7aa&quot;&gt;示例页面&lt;/span&gt;"><span class="vditor-html-inline__display"><span style="background-color:#fed7aa">示例<span class="vditor-ir__node vditor-html-inline--readonly" contenteditable="false" data-type="html-inline" data-md-source="&lt;span style=&quot;color:#dc2626&quot;&gt;页面&lt;/span&gt;"><span class="vditor-html-inline__display"><span style="color:#dc2626">页面</span></span></span></span></span></span></p>`
));

console.log("\n=== IR 模式下：嵌套 + data-md-source 改成完整嵌套源（修复尝试 1）===");
console.log(lute.VditorIRDOM2Md(
    `<p data-block="0"><span class="vditor-ir__node vditor-html-inline--readonly" contenteditable="false" data-type="html-inline" data-md-source="&lt;span style=&quot;background-color:#fed7aa&quot;&gt;示例&lt;span style=&quot;color:#dc2626&quot;&gt;页面&lt;/span&gt;&lt;/span&gt;"><span class="vditor-html-inline__display"><span style="background-color:#fed7aa">示例<span class="vditor-ir__node vditor-html-inline--readonly" contenteditable="false" data-type="html-inline" data-md-source="&lt;span style=&quot;color:#dc2626&quot;&gt;页面&lt;/span&gt;"><span class="vditor-html-inline__display"><span style="color:#dc2626">页面</span></span></span></span></span></span></p>`
));

console.log("\n=== IR 模式下：嵌套 + data-md-source 完整源 + 移除内层 shell（修复尝试 2）===");
console.log(lute.VditorIRDOM2Md(
    `<p data-block="0"><span class="vditor-ir__node vditor-html-inline--readonly" contenteditable="false" data-type="html-inline" data-md-source="&lt;span style=&quot;background-color:#fed7aa&quot;&gt;示例&lt;span style=&quot;color:#dc2626&quot;&gt;页面&lt;/span&gt;&lt;/span&gt;"><span class="vditor-html-inline__display"><span style="background-color:#fed7aa">示例<span style="color:#dc2626">页面</span></span></span></span></p>`
));

console.log("\n=== IR 模式下：嵌套 + 保持内层 shell 但 data-md-source 是 open tag（原始 Lute 输出）===");
console.log(lute.VditorIRDOM2Md(
    `<p data-block="0"><span class="vditor-ir__node vditor-html-inline--readonly" contenteditable="false" data-type="html-inline" data-md-source="&lt;span style=&quot;background-color:#fed7aa&quot;&gt;"><span class="vditor-html-inline__display"><span style="background-color:#fed7aa"></span></span>示例<span class="vditor-ir__node vditor-html-inline--readonly" contenteditable="false" data-type="html-inline" data-md-source="&lt;span style=&quot;color:#dc2626&quot;&gt;"><span class="vditor-html-inline__display"><span style="color:#dc2626"></span></span>页面</span></span></p>`
));