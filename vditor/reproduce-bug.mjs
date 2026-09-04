// 复现 vditor 嵌套 html-inline 颜色丢失 bug
import { JSDOM } from "jsdom";
import { readFileSync } from "fs";
import { resolve } from "path";

const LUTE_PATH = "/Users/linlifei/templateWithNode/vscode-office/vditor/src/js/lute/lute.min.js";
const luteSource = readFileSync(LUTE_PATH, "utf8");

// 1) 起一个 jsdom 环境（提供 window/document）
const dom = new JSDOM("<!doctype html><html><body><div id='root'></div></body></html>", {
    url: "http://localhost/",
    runScripts: "outside-only",
});
const { window } = dom;
const { document } = window;

// 2) 在 jsdom 上下文里执行 Lute，触发它把 Lute 挂到 window 上
window.eval(luteSource);
const Lute = window.Lute;
if (!Lute) {
    throw new Error("Lute 没挂到 window 上，请检查 lute.min.js 是否兼容 jsdom");
}

// 3) 用 Lute.setLute 配出和 vditor 一致的实例
const lute = Lute.New();
console.log("--- 测试 1：背景色 + 文字色 嵌套场景 ---");

// 模拟 vditor 在 IR 模式下产生的 DOM：
// 外层：data-md-source 只记录背景色（被覆盖写入，但忘了更新子节点引用）
// 内层：data-md-source 记录文字色
const innerSource = `<span style="color:#dc2626">页面</span>`;
const outerSource = `<span style="background-color:#fed7aa">示例页面</span>`;

const irDom = `<div data-block="0">
    <span class="vditor-ir__node vditor-html-inline vditor-html-inline--readonly"
          contenteditable="false"
          data-type="html-inline"
          data-open-tag="&lt;span style=&quot;background-color:#fed7aa&quot;&gt;"
          data-md-source="${outerSource.replace(/"/g, "&quot;")}">
        <span class="vditor-html-inline__display">
            <span style="background-color:#fed7aa">示例<span
                class="vditor-ir__node vditor-html-inline vditor-html-inline--readonly"
                contenteditable="false"
                data-type="html-inline"
                data-open-tag="&lt;span style=&quot;color:#dc2626&quot;&gt;"
                data-md-source="${innerSource.replace(/"/g, "&quot;")}">
                <span class="vditor-html-inline__display">
                    <span style="color:#dc2626">页面</span>
                </span>
            </span></span>
        </span>
    </span>
</div>`;

const md = lute.VditorIRDOM2Md(irDom);
console.log("输出 Markdown：");
console.log(md);
console.log();

console.log("--- 测试 2：单层背景色（对照组）---");
const singleSource = `<span style="background-color:#fed7aa">示例页面</span>`;
const irDomSingle = `<div data-block="0">
    <span class="vditor-ir__node vditor-html-inline vditor-html-inline--readonly"
          contenteditable="false"
          data-type="html-inline"
          data-open-tag="&lt;span style=&quot;background-color:#fed7aa&quot;&gt;"
          data-md-source="${singleSource.replace(/"/g, "&quot;")}">
        <span class="vditor-html-inline__display">
            <span style="background-color:#fed7aa">示例页面</span>
        </span>
    </span>
</div>`;
const md2 = lute.VditorIRDOM2Md(irDomSingle);
console.log("输出 Markdown：");
console.log(md2);
console.log();

console.log("--- 测试 3：单层文字色（对照组）---");
const irDomColor = `<div data-block="0">
    <span class="vditor-ir__node vditor-html-inline vditor-html-inline--readonly"
          contenteditable="false"
          data-type="html-inline"
          data-open-tag="&lt;span style=&quot;color:#dc2626&quot;&gt;"
          data-md-source="${innerSource.replace(/"/g, "&quot;")}">
        <span class="vditor-html-inline__display">
            <span style="color:#dc2626">页面</span>
        </span>
    </span>
</div>`;
const md3 = lute.VditorIRDOM2Md(irDomColor);
console.log("输出 Markdown：");
console.log(md3);

console.log();
console.log("=== 结论 ===");
if (md.includes("color:#dc2626")) {
    console.log("✅ 文字色被保留，未复现 bug");
} else {
    console.log("❌ 文字色丢失，bug 复现！");
}