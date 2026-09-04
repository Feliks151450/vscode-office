// 最终验证:用真实编译出的 htmlInlineShell 模块 + 真实 lute.min.js，
// 复刻 setLute 的包裹逻辑，覆盖全部关键场景。
import { JSDOM } from "jsdom";
import { readFileSync } from "fs";

const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/", runScripts: "outside-only" });
const { window } = dom;
window.eval(readFileSync("src/js/lute/lute.min.js", "utf8"));
const { document } = window;
// 编译后的模块访问全局 document（浏览器中本来就有）
globalThis.document = document;

// 真实模块
const shell = await import("/tmp/htmlInlineShell.mjs");

// 复刻 setLute 包裹
const lute = window.Lute.New();
lute.SetSanitize(false);
const wrapMdRender = (fn) => (md) => {
  const extracted = shell.extractHtmlInlineFromMd(md);
  if (extracted.shells.length === 0) return fn(md);
  return shell.restoreHtmlInlineShells(fn(extracted.md), extracted.shells);
};
const wrapSpin = (fn) => (html) => {
  const p = shell.protectHtmlInlineShellsInHtml(html);
  if (p.shells.length === 0) return fn(html);
  return shell.restoreHtmlInlineShells(fn(p.html), p.shells);
};
lute.Md2VditorDOM = wrapMdRender(lute.Md2VditorDOM.bind(lute));
lute.Md2VditorIRDOM = wrapMdRender(lute.Md2VditorIRDOM.bind(lute));
lute.SpinVditorDOM = wrapSpin(lute.SpinVditorDOM.bind(lute));
lute.SpinVditorIRDOM = wrapSpin(lute.SpinVditorIRDOM.bind(lute));

let pass = 0, fail = 0;
const check = (name, cond, detail = "") => {
  if (cond) { pass++; console.log(`✅ ${name}`); }
  else { fail++; console.log(`❌ ${name} ${detail}`); }
};

const roundtrip = (md, mode = "ir") => {
  const domHtml = mode === "ir" ? lute.Md2VditorIRDOM(md) : lute.Md2VditorDOM(md);
  const back = mode === "ir" ? lute.VditorIRDOM2Md(domHtml) : lute.VditorDOM2Md(domHtml);
  return { domHtml, back };
};

const MD = '这是一个 **Vditor** <span style="background-color: rgb(254, 215, 170);">示例<span style="color: rgb(220, 38, 38);">页面</span></span>';

// 1. IR 初始渲染
const { domHtml, back } = roundtrip(MD, "ir");
console.log("=== IR setValue DOM ===");
console.log(domHtml);
check("IR: 嵌套 html 渲染为一个 shell", (domHtml.match(/data-type="html-inline"/g) || []).length === 1);
check("IR: data-md-source 是完整嵌套源", domHtml.includes("示例&lt;span style=&quot;color: rgb(220, 38, 38);&quot;&gt;页面&lt;/span&gt;&lt;/span&gt;"));
check("IR: display 含嵌套 styled span", domHtml.includes(`<span style="background-color: rgb(254, 215, 170);">示例<span style="color: rgb(220, 38, 38);">页面</span></span>`));
check("IR: getValue 往返一致", back.trim() === MD, `got: ${back}`);

// 2. WYSIWYG 初始渲染
const w = roundtrip(MD, "wysiwyg");
check("WYSIWYG: 单 shell", (w.domHtml.match(/data-type="html-inline"/g) || []).length === 1);
check("WYSIWYG: getValue 往返一致", w.back.trim() === MD, `got: ${w.back}`);

// 3. typing 后(spin 保护)仍然单 shell 且往返一致
const spun = lute.SpinVditorIRDOM(domHtml);
console.log("\n=== typing(spin)后 ===");
console.log(spun);
check("spin 后: 单 shell", (spun.match(/data-type="html-inline"/g) || []).length === 1);
check("spin 后: display 样式仍在(重建)", spun.includes('style="background-color: rgb(254, 215, 170);"'));
const backAfterSpin = lute.VditorIRDOM2Md(spun);
check("spin 后: getValue 往返一致", backAfterSpin.trim() === MD, `got: ${backAfterSpin}`);

// 4. 简单(无嵌套) span 也统一为手写 shell
const simple = roundtrip('<span style="color:red">x</span>', "ir");
check("简单 span: 单 shell", (simple.domHtml.match(/data-type="html-inline"/g) || []).length === 1);
check("简单 span: 往返一致", simple.back.trim() === '<span style="color:red">x</span>', `got: ${simple.back}`);

// 5. 代码块里的 HTML 不被提取（围栏内容转义为 code，只有正文的嵌套 span 成为 shell）
const fenceMd = "```html\n<span style=\"color:red\"><b>x</b></span>\n```\n\n正文 <span style=\"color:blue\">a<span style=\"color:red\">b</span></span>";
const f = roundtrip(fenceMd, "ir");
check("代码围栏: 正文 1 个 shell（围栏内容无 shell）", (f.domHtml.match(/data-type="html-inline"/g) || []).length === 1);
check("代码围栏: 往返一致", f.back.trim() === fenceMd, `got: ${f.back}`);

// 6. 行内代码里的 HTML 不被提取（只有正文的嵌套 span 成为 shell）
const codeMd = 'a `<span style="color:red"><b>x</b></span>` b <span style="color:blue">c<sub>d</sub></span>';
const c = roundtrip(codeMd, "ir");
check("行内代码: 正文 1 个 shell（行内代码无 shell）", (c.domHtml.match(/data-type="html-inline"/g) || []).length === 1);
check("行内代码: 往返一致", c.back.trim() === codeMd, `got: ${c.back}`);

// 7. 多个嵌套 run
const multi = '<span style="color:red">a<span style="color:blue">b</span></span> 与 <span style="color:green">c<span style="color:red">d</span></span>';
const m = roundtrip(multi, "ir");
check("多 run: 2 个 shell", (m.domHtml.match(/data-type="html-inline"/g) || []).length === 2);
check("多 run: 往返一致", m.back.trim() === multi, `got: ${m.back}`);

// 8. 属性值带 & 和引号
const quoteMd = '<span style="color:red; font-family: \'A&B\'">x<span style="color:blue">y</span></span>';
const q = roundtrip(quoteMd, "ir");
check("属性转义: 往返一致", q.back.trim() === quoteMd, `got: ${q.back}`);

// 9. autolink 不受影响（Lute 原生会把 autolink 归一化为 [...]()，非本次修改引入）
const auto = '<https://example.com> 和 <span style="color:red">x</span>';
const a = roundtrip(auto, "ir");
check("autolink: 归一化为 Lute 原生形态", a.back.trim() === '[https://example.com](https://example.com) 和 <span style="color:red">x</span>', `got: ${a.back}`);

// 10. 没有 html 时零开销路径
const plain = "hello **world**";
const p = roundtrip(plain, "ir");
check("纯文本: 往返一致", p.back.trim() === plain);

console.log(`\n${pass} 通过, ${fail} 失败`);
process.exit(fail ? 1 : 0);
