# LatexEasy Editor

基于 Web 的 LaTeX 公式可视化编辑器，支持所见即所得的数学公式编辑与 LaTeX 代码实时预览。

## 项目简介

LatexEasy Editor 是一个开源的 Web 端 LaTeX 公式编辑器，提供两种编辑模式：

- **可视化编辑模式**：通过点击工具栏中的数学符号按钮，拖拽、组合构建数学公式
- **代码编辑模式**：直接编写 LaTeX 代码，实时预览渲染效果

## 主要功能

### 数学公式编辑
- 可视化公式构建器（所见即所得）
- LaTeX 代码编辑器（基于 Ace Editor）
- 实时 LaTeX 预览渲染（基于 MathJax SVG 输出）
- 丰富的数学符号面板：分数、根号、积分、求和、矩阵、极限、希腊字母、箭头、运算符等

### 编辑辅助
- 撤销 / 重做（Undo / Redo）
- 剪切 / 复制 / 粘贴
- 括号自动匹配与高亮
- 命令面板支持

### 导出与输出
- 导出为 PDF / PNG / SVG
- 复制公式为图片
- 打印支持

### 集成方式
- 支持 iframe 嵌入模式
- 支持直连模式（无 iframe，通过 postMessage 通信）
- 提供 JavaScript SDK 方便外部调用

## 技术栈

| 组件 | 技术 | 说明 |
|------|------|------|
| UI 框架 | [Vue.js](https://vuejs.org/) | 前端界面框架 |
| 组件库 | Element UI | Vue 组件库 |
| DOM 操作 | [jQuery](https://jquery.com/) | DOM 操作与事件处理 |
| 公式渲染 | [MathJax](https://www.mathjax.org/) | LaTeX 数学公式渲染（SVG 输出模式） |
| 代码编辑器 | [Ace Editor](https://ace.c9.io/) | LaTeX 代码编辑模式 |
| 数学核心 | Math.js | 数学计算与表达式解析 |

## 快速开始

### 环境要求

- 现代浏览器（Chrome、Firefox、Safari、Edge）
- 无需后端服务器，可直接在浏览器中打开使用

### 运行方式

1. 克隆本项目：

```bash
git clone <repository-url>
cd latexEditor
```

2. 在浏览器中打开 `lateEditor.html`：

```bash
# macOS
open lateEditor.html

# 或使用任意 HTTP 服务器
npx serve .
# 然后访问 http://localhost:3000/lateEditor.html
```

### 基本使用

在 `lateEditor.html` 中初始化编辑器：

```html
<script src="jquery.js"></script>
<script src="mathjax-tex-svg.js"></script>
<script src="latexeasy.js"></script>
<script src="vue.js"></script>
<script src="index.js"></script>
<script src="editor.js"></script>
<script src="sdk.js"></script>

<script>
    var letexeasy = new window.LatexEasy(document.getElementById('liveEditor'));

    letexeasy.on('ready', function () {
        console.log('LatexEasy.ready');
        // 设置初始 LaTeX 内容
        letexeasy.call('set.latex', {
            latex: 'x=\\frac {-b\\pm \\sqrt \\{\{b\}^\\{2\\}-4ac\\}\\} {2a}'
        });
    });

    letexeasy.init();
</script>
```

## 项目结构

```
latexEditor/
├── lateEditor.html          # 主页面（编辑器集成示例）
├── latexeasy.js             # LatexEasy 编辑器核心逻辑（~34K 行，压缩版）
├── latexeasy.css            # 编辑器样式表（工具栏、符号面板、布局等）
├── editor.js                # Ace Editor 代码编辑器集成（~32K 行，压缩版）
├── index.js                 # Vue.js + Element UI 组件库（~28K 行，压缩版）
├── sdk.js                   # 外部集成 SDK（postMessage 通信封装）
├── jquery.js                # jQuery 库
├── vue.js                   # Vue.js 框架
├── mathjax-tex-svg.js       # MathJax（TeX-SVG 插件，用于 LaTeX 渲染）
└── README.md                # 项目说明文档
```

## SDK 集成

LatexEasy 提供简单的 JavaScript SDK，方便在其他页面中嵌入和调用编辑器。

### 初始化

```javascript
// iframe 模式
var editor = new LatexEasy(iframeElement);

// 直连模式（推荐，无 iframe）
var editor = new LatexEasy(window);
```

### 事件监听

```javascript
editor.on('ready', function (data) {
    console.log('编辑器就绪', data);
});
```

### API 调用

```javascript
// 设置 LaTeX 内容
editor.call('set.latex', { latex: 'x^2 + y^2 = r^2' });

// 获取当前 LaTeX 内容
editor.call('get.latex', {}, function (data) {
    console.log(data.latex);
});
```

### 通信机制

编辑器与宿主页面之间通过 `postMessage` 进行异步通信，支持回调函数处理响应结果。

## 自定义配置

### CDN 配置

```javascript
window.__msCDN = "https://cdn.latexeasy.com/";
window.__msRoot = "/";
```

### 语言设置

```javascript
window.__data = {
    lang: "zh",  // 支持 "zh"（中文）、"en"（英文）等
    latex: ""
};
```

## 注意事项

- 项目中的 `.js` 文件为压缩后的生产版本，代码可读性较低
- 编辑器在非官方域名下运行时会触发 license 提示（通过 `latexeasy.com` 校验）
- 需要确保所有依赖文件（jQuery、Vue、MathJax 等）在正确的加载顺序下引入

## License

Copyright © [LatexEasy](https://latexeasy.com)

## 相关链接

- 官网：[https://latexeasy.com](https://latexeasy.com)
- GitHub：[https://github.com/latexeasy/latexeasy-editor](https://github.com/latexeasy/latexeasy-editor)
