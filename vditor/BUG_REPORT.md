# 嵌套 html-inline 颜色丢失 Bug 复现报告

## 测试环境
- vditor 中嵌套的 Lute 引擎（`src/js/lute/lute.min.js`）
- jsdom 模拟 DOM 环境
- 调用 `lute.VditorIRDOM2Md(html)`（即 vditor `getValue()` 走的链路）

## 测试用例与结果

### ✅ 用例 1：两个 html-inline 并列（对照组）
**输入**：`<p><span data-type="html-inline" data-md-source="...背景...">a</span><span data-type="html-inline" data-md-source="...红...">b</span></p>`

**输出**：`<span style="background-color:#fed7aa">a</span><span style="color:red">b</span>\n`

✅ **正常**，两个 html-inline 都被正确输出。

---

### ❌ 用例 2：嵌套（同色）
**输入**：外层 `<span style="color:red">hello ` + 内层 `<span style="color:red">world</span>` + 闭合 `</span>`

**输出**：`<span style="color:red">hello </span>\n`

❌ **内层 `world` 丢失**。注意结尾还有个空格——`hello `（外层）保留，但内层 html-inline 完全被忽略。

---

### ❌ 用例 3：嵌套（不同色，用户报告的场景）
**输入**：外层 `<span style="background-color:#fed7aa">示例` + 内层 `<span style="color:#dc2626">页面</span>` + 闭合 `</span>`

**输出**：`<span style="background-color:#fed7aa">示例页面</span>\n`

❌ **内层文字色完全丢失**。"示例页面"全部使用外层的背景色。

---

### ❌ 用例 4：纯 HTML span 嵌套（无 html-inline shell）
**输入**：`<p><span style="background-color:#fed7aa">示例<span style="color:#dc2626">页面</span></span></p>`

**输出**：`示例页面\n`

❌ 整个 HTML span 都丢了——这是 Lute 的 sanitize 行为，不是 vditor 的问题（默认 sanitize=true 会清掉未知 span）。

---

## Bug 根因分析

`Lute.VditorIRDOM2Md()` 在解析 html-inline 节点时：

1. 遇到 `data-type="html-inline"` 的 span → 直接读 `data-md-source` 属性作为输出内容
2. **不会递归**进入这个 span 内部的 DOM 去处理嵌套的子 html-inline
3. 因此内层嵌套的 html-inline 节点（包括它的 `data-md-source`）被完全丢弃

这意味着：当用户在外层带背景色的文本里选部分字再加文字色时：
- 编辑器正确生成了嵌套的 DOM（外层背景色 + 内层文字色两段）
- 但 `data-md-source` **没有同步更新**——外层 data-md-source 仍然是原始的 `<span style="background-color">示例页面</span>`
- `getValue()` 输出外层 data-md-source → 内层文字色丢失

## 修复建议（两种思路）

### 思路 A：在生成嵌套时同步更新外层 data-md-source
`applyStyleInPreview` 创建新嵌套 span 后，需要：
1. 同步更新外层 html-inline 的 `data-md-source`，把内层 span 也包进去
2. 但这样会和内层自己的 html-inline shell 数据重复 → 可能需要避免重复保存内层

### 思路 B：让 `Lute.VditorIRDOM2Md` 处理嵌套
升级 Lute 或扩展它，让它识别嵌套的 html-inline 并递归输出。

### 思路 C：改 vditor 的 `getMarkdown`
在 `buildEditorHtmlForMarkdown` 之后调 Lute 之前，先把 DOM 走一遍，把嵌套 html-inline 合并成正确的多层 `<span>` HTML（去掉内层 `data-type="html-inline"`、只保留外层），让 Lute 看到一个"扁平"的结构。

---

## 复现脚本
- `reproduce-bug.mjs` — 主复现脚本
- `debug-ir2.mjs` ~ `debug-ir4.mjs` — 调试中间步骤

直接运行 `node reproduce-bug.mjs` 即可看到结果。