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

const test = (label, irHtml) => {
    console.log(`\n=== ${label} ===`);
    console.log("输入:", irHtml.replace(/\s+/g, " ").slice(0, 200));
    const result = lute.VditorIRDOM2Md(irHtml);
    console.log("输出:", JSON.stringify(result));
    console.log("内层 color 保留?", result.includes("color:#dc2626") ? "✅ 是" : "❌ 否");
};

// 1. 同色嵌套：外层红 + 内层红
test("同色嵌套（外红+内红）", `<p data-block="0"><span data-type="html-inline" data-md-source="&lt;span style=&quot;color:red&quot;&gt;hello &lt;/span&gt;"><span class="vditor-html-inline__display"><span style="color:red">hello <span data-type="html-inline" data-md-source="&lt;span style=&quot;color:red&quot;&gt;world&lt;/span&gt;"><span class="vditor-html-inline__display"><span style="color:red">world</span></span></span></span></span></span></p>`);

// 2. 不同色嵌套：外背景 + 内文字色
test("外背景+内文字色（用户场景）", `<p data-block="0"><span data-type="html-inline" data-md-source="&lt;span style=&quot;background-color:#fed7aa&quot;&gt;示例页面&lt;/span&gt;"><span class="vditor-html-inline__display"><span style="background-color:#fed7aa">示例<span data-type="html-inline" data-md-source="&lt;span style=&quot;color:#dc2626&quot;&gt;页面&lt;/span&gt;"><span class="vditor-html-inline__display"><span style="color:#dc2626">页面</span></span></span></span></span></span></p>`);

// 3. 内层 html-inline 但不是嵌套
test("并列（非嵌套）", `<p data-block="0"><span data-type="html-inline" data-md-source="&lt;span style=&quot;background-color:#fed7aa&quot;&gt;a&lt;/span&gt;"><span class="vditor-html-inline__display"><span style="background-color:#fed7aa">a</span></span></span><span data-type="html-inline" data-md-source="&lt;span style=&quot;color:red&quot;&gt;b&lt;/span&gt;"><span class="vditor-html-inline__display"><span style="color:red">b</span></span></span></p>`);

// 4. 检查 Lute 是否会自己处理嵌套 HTML span（非 html-inline）
test("普通 HTML span 嵌套（无 data-type）", `<p data-block="0"><span style="background-color:#fed7aa">示例<span style="color:#dc2626">页面</span></span></p>`);