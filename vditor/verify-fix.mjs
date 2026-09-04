// End-to-end verification of the nested html-inline fix
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

// 复制的 flattenNestedHtmlInline 实现（与 codeMirrorManager.ts 一致）
const depthOf = (el) => {
    let d = 0;
    let n = el;
    while (n?.parentElement) { d++; n = n.parentElement; }
    return d;
};

const buildNestedHtmlInlineMd = (outerShell) => {
    const display = outerShell.querySelector(":scope > .vditor-html-inline__display");
    if (!display) return "";
    const walk = (node) => {
        if (node.nodeType === 3) return (node.textContent || "").replaceAll(ZWSP, "");
        if (node.nodeType !== 1) return "";
        const el = node;
        if (el.getAttribute("data-type") === "html-inline") {
            return el.getAttribute("data-md-source") || "";
        }
        const children = Array.from(el.childNodes).map(walk).join("");
        if (el.tagName === "SPAN" && el.hasAttribute("style")) {
            return `<span style="${el.getAttribute("style")}">${children}</span>`;
        }
        return children;
    };
    return walk(display).trim();
};

const flattenNestedHtmlInline = (root) => {
    const allShells = Array.from(root.querySelectorAll('[data-type="html-inline"]'));
    if (allShells.length === 0) return;
    allShells.sort((a, b) => depthOf(b) - depthOf(a));
    for (const shell of allShells) {
        if (!shell.querySelector('[data-type="html-inline"]')) continue;
        const fullMd = buildNestedHtmlInlineMd(shell);
        if (!fullMd) continue;
        shell.classList.remove("vditor-html-inline--readonly");
        shell.removeAttribute("contenteditable");
        shell.setAttribute("data-md-source", fullMd);
        const openTagMatch = fullMd.match(/^<[a-zA-Z][^>]*>/);
        if (openTagMatch && shell.hasAttribute("data-open-tag")) {
            shell.setAttribute("data-open-tag", openTagMatch[0]);
        }
    }
};

// 测试
const runTest = (label, html, expectations) => {
    console.log(`\n=== ${label} ===`);
    const dom2 = new JSDOM(html);
    const doc = dom2.window.document;
    flattenNestedHtmlInline(doc.body);
    const result = lute.VditorIRDOM2Md(doc.body.innerHTML);
    console.log("Lute 输出:", JSON.stringify(result));
    for (const [name, expected] of Object.entries(expectations)) {
        const pass = expected(result);
        console.log(`  ${pass ? "✅" : "❌"} ${name}: ${pass ? "通过" : "失败"}`);
        if (!pass) process.exitCode = 1;
    }
};

runTest("嵌套 html-inline（背景色 + 文字色，用户场景）", `
<p data-block="0">
    <span class="vditor-ir__node vditor-html-inline--readonly" contenteditable="false" data-type="html-inline"
        data-md-source="&lt;span style=&quot;background-color:#fed7aa&quot;&gt;示例页面&lt;/span&gt;">
        <span class="vditor-html-inline__display">
            <span style="background-color:#fed7aa">示例
                <span class="vditor-ir__node vditor-html-inline--readonly" contenteditable="false" data-type="html-inline"
                    data-md-source="&lt;span style=&quot;color:#dc2626&quot;&gt;页面&lt;/span&gt;">
                    <span class="vditor-html-inline__display">
                        <span style="color:#dc2626">页面</span>
                    </span>
                </span>
            </span>
        </span>
    </span>
</p>`.trim(), {
    "包含 background-color 外层": (md) => md.includes('background-color:#fed7aa'),
    "包含 color 内层": (md) => md.includes('color:#dc2626'),
    "包含 '示例'": (md) => md.includes('示例'),
    "包含 '页面'": (md) => md.includes('页面'),
});

runTest("三层嵌套", `
<p data-block="0">
    <span class="vditor-ir__node vditor-html-inline--readonly" contenteditable="false" data-type="html-inline"
        data-md-source="&lt;span style=&quot;background-color:#fed7aa&quot;&gt;A&lt;/span&gt;">
        <span class="vditor-html-inline__display">
            <span style="background-color:#fed7aa">A
                <span class="vditor-ir__node vditor-html-inline--readonly" contenteditable="false" data-type="html-inline"
                    data-md-source="&lt;span style=&quot;color:red&quot;&gt;B&lt;/span&gt;">
                    <span class="vditor-html-inline__display">
                        <span style="color:red">B
                            <span class="vditor-ir__node vditor-html-inline--readonly" contenteditable="false" data-type="html-inline"
                                data-md-source="&lt;span style=&quot;text-decoration:underline&quot;&gt;C&lt;/span&gt;">
                                <span class="vditor-html-inline__display">
                                    <span style="text-decoration:underline">C</span>
                                </span>
                            </span>
                        </span>
                    </span>
                </span>
            </span>
        </span>
    </span>
</p>`.trim(), {
    "包含 background-color": (md) => md.includes('background-color:#fed7aa'),
    "包含 color:red": (md) => md.includes('color:red'),
    "包含 text-decoration": (md) => md.includes('text-decoration:underline'),
    "包含 'A' 'B' 'C'": (md) => md.includes('A') && md.includes('B') && md.includes('C'),
});

runTest("并列（非嵌套），不应被修改", `
<p data-block="0">
    <span class="vditor-ir__node vditor-html-inline--readonly" contenteditable="false" data-type="html-inline"
        data-md-source="&lt;span style=&quot;color:red&quot;&gt;a&lt;/span&gt;">
        <span class="vditor-html-inline__display"><span style="color:red">a</span></span>
    </span>
    <span class="vditor-ir__node vditor-html-inline--readonly" contenteditable="false" data-type="html-inline"
        data-md-source="&lt;span style=&quot;color:blue&quot;&gt;b&lt;/span&gt;">
        <span class="vditor-html-inline__display"><span style="color:blue">b</span></span>
    </span>
</p>`.trim(), {
    "包含 color:red": (md) => md.includes('color:red'),
    "包含 color:blue": (md) => md.includes('color:blue'),
    "包含 'a' 和 'b'": (md) => md.includes('a') && md.includes('b'),
});

console.log("\n=== 全部测试完成 ===");
console.log(process.exitCode ? "❌ 有失败用例" : "✅ 全部通过");