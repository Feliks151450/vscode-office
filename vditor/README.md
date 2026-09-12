<p align="center">
<img alt="Vditor" src="https://b3log.org/images/brand/vditor-128.png" />

<br>
易于使用的 Markdown 编辑器，为适配不同的应用场景而生
<br><br>
<a title="MIT" target="_blank" href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/license-MIT-orange.svg?style=flat-square"></a>
<a title="npm bundle size" target="_blank" href="https://www.npmjs.com/package/vditor"><img alt="npm bundle size" src="https://img.shields.io/bundlephobia/minzip/vditor?style=flat-square&color=blueviolet"></a>
<a title="Version" target="_blank" href="https://www.npmjs.com/package/vditor"><img src="https://img.shields.io/npm/v/vditor.svg?style=flat-square"></a><br>
<a title="Downloads" target="_blank" href="https://www.npmjs.com/package/vditor"><img src="https://img.shields.io/npm/dt/vditor.svg?style=flat-square&color=97ca00"></a>
<a title="jsdelivr" target="_blank" href="https://www.jsdelivr.com/package/npm/vditor"><img src="https://data.jsdelivr.com/v1/package/npm/vditor/badge"/></a>
<a title="Hits" target="_blank" href="https://github.com/88250/hits"><img src="https://hits.b3log.org/Vanessa219/vditor.svg"></a> <br><br>
<a title="GitHub Watchers" target="_blank" href="https://github.com/Vanessa219/vditor/watchers"><img src="https://img.shields.io/github/watchers/Vanessa219/vditor.svg?label=Watchers&style=social"></a>
<a title="GitHub Stars" target="_blank" href="https://github.com/Vanessa219/vditor/stargazers"><img src="https://img.shields.io/github/stars/Vanessa219/vditor.svg?label=Stars&style=social"></a>
<a title="GitHub Forks" target="_blank" href="https://github.com/Vanessa219/vditor/network/members"><img src="https://img.shields.io/github/forks/Vanessa219/vditor.svg?label=Forks&style=social"></a>
<a title="Author GitHub Followers" target="_blank" href="https://github.com/vanessa219"><img src="https://img.shields.io/github/followers/vanessa219.svg?label=Followers&style=social"></a>
</p>

<p align="center">
<a href="https://github.com/Vanessa219/vditor/blob/master/README_en_US.md">English</a> &nbsp;|&nbsp; <a href="https://b3log.org/vditor/demo/index.html">Demo</a>
</p>

<p align="center">
🔥 欢迎观摩我们的另一个开源项目 <a href="https://github.com/siyuan-note/siyuan">思源笔记</a>
<p>

## 🚀 本地开发（vscode-office 集成版）

> 本目录是基于上游 Vditor 定制后的 `vscode-vditor`（v4.x），作为 [vscode-office](../) 的 Markdown 编辑器使用。下面的命令与 README 后半段描述的上游 Vditor 默认流程不同，请以本节为准。

### 环境要求

* Node.js LTS

### 安装与启动

```bash
cd vditor
npm install          # 首次安装依赖（vditor/node_modules 当前为空时执行）
npm run dev          # 启动 Vite 开发服务器
```

启动后浏览器访问 **http://127.0.0.1:3135**（端口在 [`vite.config.ts`](vite.config.ts) 中定义，非上游默认的 9000）。

### 其它脚本

| 命令 | 作用 |
| --- | --- |
| `npm run dev` | 启动 Vite 开发服务器（端口 3135），支持热更新 |
| `npm run build:dev` | 开发模式构建：产物输出到 `vditor/dist/`，同时拷贝到 `../resource/markdown/dist/` 供主扩展使用 |
| `npm run build` | 生产模式构建：压缩并输出单文件 `index.min.js` / `index.css` |
| `npm run lint` | 对 `src/**/*.ts` 运行 ESLint 自动修复 |

### 调试小贴士

* 直接修改 `vditor/src/**` 下的源文件，Vite 会热更新。
* 编辑器扩展运行时实际加载的是 `../resource/markdown/dist/` 下的产物；`npm run build` / `npm run build:dev` 会自动同步过去。
* 如果本地有 `../test/output/lute/`，构建时会优先使用其中的 Lute 引擎覆盖到 `../resource/markdown/dist/js/lute/`，方便调试 Markdown 解析。
* Vite dev server 内置中间件会把 `/dist/js/i18n/`、`/dist/css/`、`/dist/js/lute/` 代理到 `vditor/src/` 下对应的源文件，便于断点调试。

## 💡 简介

[Vditor](https://b3log.org/vditor) 是一款浏览器端的 Markdown 编辑器，支持所见即所得、即时渲染（类似 Typora）和分屏预览模式。它使用 TypeScript 实现，支持原生 JavaScript 以及 Vue、React、Angular 和 Svelte 等框架。

欢迎到 [Vditor 官方讨论区](https://ld246.com/tag/vditor)了解更多。同时也欢迎关注 B3log 开源社区微信公众号 `B3log开源`：

![b3logos.jpg](https://b3logfile.com/file/2020/08/b3logos-032af045.jpg)

## 🗺️ 背景

随着 Markdown 排版方式的普及，越来越多的应用开始集成 Markdown 编辑器。目前主流可集成的 Markdown 编辑器现状如下：

* 有的仅支持分屏预览，即编辑区和预览区分离
* 有的同时支持所见即所得和分屏预览，但所见即所得模式下不能完整支持 Markdown 语法排版
* 几乎没有类似 Typora 的即时渲染

而这三点恰好对应了三种应用场景：

* 分屏预览：适配传统的 Markdown 使用场景，适合大屏下编辑排版
* 所见即所得：对不熟悉 Markdown 的用户友好，熟悉 Markdown 的用户也可以无缝使用
* 即时渲染：理论上这是最为优雅的 Markdown 编辑方式，让熟悉 Markdown 的用户能够更专注于内容创作

所以，一个能够**适配应用场景**的 Markdown 编辑器至关重要，它需要考虑到：

* 传统 Markdown 用户的使用场景，提供分屏预览
* 富文本编辑用户的使用场景，提供所见即所得
* 高阶 Markdown 用户的使用场景，提供即时渲染

Vditor 在这些方面做了努力，希望能为现代化的通用 Markdown 编辑领域做出一些贡献。

## ✨  特性

* 支持三种编辑模式：所见即所得（wysiwyg）、即时渲染（ir）、分屏预览（sv）
* 支持大纲、数学公式、脑图、图表、流程图、甘特图、时序图、五线谱、[多媒体](https://ld246.com/article/1589813914768)、语音阅读、标题锚点、代码高亮及复制、graphviz 渲染、[plantuml](https://plantuml.com)UML图
* 导出、图片懒加载、任务列表、多平台预览、多主题切换、复制到微信公众号/知乎功能
* 实现 CommonMark 和 GFM 规范，可对 Markdown 进行格式化和语法树查看，并支持[10+项](https://ld246.com/article/1549638745630#options-preview-markdown)配置
* 工具栏包含 36+ 项操作，除支持扩展外还可对每一项中的[快捷键](https://ld246.com/article/1582778815353)、提示、提示位置、图标、点击事件、类名、子工具栏进行自定义
* 表情/at/话题等自动补全扩展
* 可使用拖拽、剪切板粘贴上传，显示实时上传进度，支持 CORS 跨域上传
* 实时保存内容，防止意外丢失
* 录音支持，用户可直接发布语音
* 粘贴 HTML 自动转换为 Markdown，如粘贴中包含外链图片可通过指定接口上传到服务器
* 支持主窗口大小拖拽、字符计数
* 多主题支持，内置黑白绿三套主题
* 多语言支持，内置中、英、韩文本地化
* 支持主流浏览器，对移动端友好

![editor.png](https://b3logfile.com/file/2020/07/editor-b304aa97.png)

![preview.png](https://b3logfile.com/file/2020/05/preview-80846f66.png)

## 🔮 编辑模式

### 所见即所得（WYSIWYG）

*所见即所得*模式对不熟悉 Markdown 的用户较为友好，熟悉 Markdown 的话也可以无缝使用。

![vditor-wysiwyg](https://b3logfile.com/file/2020/07/wysiwyg-4f216b9b.gif)

### 即时渲染（IR）

*即时渲染*模式对熟悉 Typora 的用户应该不会感到陌生，理论上这是最优雅的 Markdown 编辑方式。

![vditor-ir](https://b3logfile.com/file/2020/07/ir-67cd956c.gif)

### 分屏预览（SV）

传统的*分屏预览*模式适合大屏下的 Markdown 编辑。

![vditor-sv](https://b3logfile.com/file/2020/07/sv-595dcb28.gif)

## 🍱 语法支持

* 所有 CommonMark 语法：分隔线、ATX 标题、Setext 标题、缩进代码块、围栏代码块、HTML 块、链接引用定义、段落、块引用、列表、反斜杠转义、HTML 实体、行级代码、强调、加粗、链接、图片、行级 HTML、硬换行、软换行和纯文本。
* 所有 GFM 语法：表格、任务列表项、删除线、自动链接、XSS 过滤
* 常用 Markdown 扩展语法：脚注、ToC、自定义标题 ID
* 图表语法
  * 流程图、时序图、甘特图，通过 Mermaid 支持
  * Graphviz
  * 折线图、饼图、脑图等，通过 ECharts 支持
* 五线谱：通过 abc.js 支持
* 数学公式：数学公式块、行级数学公式，通过 MathJax 和 KaTeX 支持
* YAML Front Matter
* 中文语境优化
  * 中西文之间插入空格
  * 术语拼写修正
  * 中文后跟英文逗号句号等标点替换为中文对应标点

以上大部分特性可以通过开关配置是否启用，开发者可根据自己的应用场景选择搭配。

## ⌨️ 快捷键

> 源码中用 `⌘` 统一表示 **Mac = Cmd / Win·Linux = Ctrl**（由 `compatibility.isCtrl()` 解析）。下文同时列出两种写法。

### 工具栏快捷键（基于默认 toolbar 配置）

| Mac | Win / Linux | 功能 |
| - | - | - |
| ⌘B | Ctrl+B | 加粗 |
| ⌘I | Ctrl+I | 斜体 |
| ⌘D | Ctrl+D | 删除线 |
| ⌘K | Ctrl+K | 插入链接 |
| ⌘H | Ctrl+H | 标题 |
| ⌘O | Ctrl+O | 有序列表 |
| ⌘J | Ctrl+J | 任务列表 |
| ⌘; | Ctrl+; | 引用 |
| ⌘M | Ctrl+M | 插入表格 |
| ⌘G | Ctrl+G | 行内代码 |
| ⌘Z | Ctrl+Z | 撤销 |
| ⌘Y | Ctrl+Y | 重做 |
| ⇧⌘U | Ctrl+Shift+U | 代码块 |
| ⇧⌘H | Ctrl+Shift+H | 分隔线 |
| ⇧⌘I | Ctrl+Shift+I | 减少缩进 |
| ⇧⌘O | Ctrl+Shift+O | 增加缩进 |
| ⇧⌘B | Ctrl+Shift+B | 起始插入行 |
| ⇧⌘E | Ctrl+Shift+E | 末尾插入行 |

### 查找 / 替换

| 快捷键 | 位置 | 功能 |
| - | - | - |
| ⌘F / Ctrl+F | 全局 | 打开查找（再按一次聚焦输入框） |
| ⌘R / Ctrl+R | 全局 | 打开替换面板 |
| Enter | 查找输入框 | 下一个匹配 |
| Shift+Enter | 查找输入框 | 上一个匹配 |
| Enter | 替换输入框 | 替换当前 |
| Shift+Enter | 替换输入框 | 替换全部 |
| Esc | 任一输入框 | 关闭查找面板 |

### VS Code 风格编辑快捷键

光标在 WYSIWYG / IR 编辑区且**不在 CodeMirror 代码块内**时生效，IME 组合输入时不生效：

| 快捷键 | 功能 |
| - | - |
| Alt+↑ | 当前块上移 |
| Alt+↓ | 当前块下移 |
| Shift+Alt+↑ | 复制当前块到上方 |
| Shift+Alt+↓ | 复制当前块到下方 |
| ⌘L / Ctrl+L | 选中当前块 |
| ⌘⇧K / Ctrl+Shift+K | 删除当前块 |
| ⌘Enter / Ctrl+Enter | 在下方插入空块 |
| ⌘⇧Enter / Ctrl+Shift+Enter | 在上方插入空块 |

### 自动配对

| 输入 | 自动补全 |
| - | - |
| `(` | `)` |
| `[` | `]`（不影响 `{`） |

### 对话框通用

| 快捷键 | 场景 |
| - | - |
| Esc | 关闭公式弹窗 / AI 对话框 / AI 审阅面板 / 确认对话框 |
| Enter | 确认对话框确认 |

### 用户可配置 / 扩展

* `options.ctrlEnter`：`⌘Enter` / `Ctrl+Enter` 在编辑器里触发用户回调（注意：会被上述 VS Code 风格的"插入空块"快捷键**优先**拦截）
* 工具栏项的 `hotkey` 字段可被自定义 toolbar 配置覆盖，写法支持 `⌘X` / `⇧⌘X` / `⌥X` / `⌥⌘X` / `⇧Tab` / `Ctrl+Alt+Shift+Key`（`^` = Ctrl，`!` = Alt，`+` = Shift）

### 边界条件（容易踩的坑）

* **⌘F / ⌘R 是全局监听**，无视焦点、无视模式、无视 IME；宿主 app **不要再把这两个组合挂到自己的功能**上。⌘R 在浏览器默认是刷新页面，被 Vditor 拦下后宿主不再拿到该事件。
* **VS Code 风格快捷键在 CodeMirror 代码块内不响应**（[vscodeShortcut.ts:170-172](vditor/src/ts/util/vscodeShortcut.ts#L170-L172) `isInsideCodeMirror` 守卫）。同理 [editorCommonEvent.ts:219-222](vditor/src/ts/util/editorCommonEvent.ts#L219-L222) 让整条 keydown 链在 CodeMirror 内直接 return。
* **IME 组合输入中（`event.isComposing`）所有内置快捷键不响应**——VS Code 风格快捷键、Ctrl+Alt+1-6 切标题、toolbar hotkey 全部走 `isComposing` 守卫；宿主自己接 IME 也要照做。
* **`Ctrl+Enter` 在 wysiwyg/ir 模式是"插入空块"（[vscodeShortcut.ts:227-232](vditor/src/ts/util/vscodeShortcut.ts#L227-L232)），在 preview 模式才是 `options.ctrlEnter` 回调**——同一组合键在不同模式下行为不同。
* **Esc 在 IME 组合中也会触发 `options.esc()`**（[editorCommonEvent.ts:285](vditor/src/ts/util/editorCommonEvent.ts#L285) 不检查 isComposing）——若宿主的 ESC 用来"取消 IME 组字"，会被劫持。可以在自己的 esc 回调里 `if (event.isComposing) return;` 兜底。

## 🗃 案例

* [Sym](https://github.com/88250/symphony) 一款用 Java 实现的现代化社区（论坛/BBS/社交网络/博客）平台
* [Solo](https://github.com/88250/solo) & [Pipe](https://github.com/88250/pipe) B3log 分布式社区的博客端节点，欢迎加入下一代社区网络
* [Tditor](https://tditor.com) 基于React、Vditor、Springboot，一款打造极致文字创作体验的在线Markdown编辑平台
* [Arya](https://github.com/nicejade/markdown-online-editor) 基于 Vue、Vditor，所构建的在线 Markdown 编辑器
* [更多案例](https://github.com/Vanessa219/vditor/network/dependents?package_id=UGFja2FnZS0zMTY2Mzg4MzE%3D)

## 🛠️ 使用文档

### CommonJS

* 安装依赖

```shell
npm install vditor --save
```

* 在代码中引入并初始化对象，可参考 [index.js](https://github.com/Vanessa219/vditor/blob/master/demo/index.js)

```ts
import Vditor from 'vditor'
import "~vditor/src/assets/less/index"

const vditor = new Vditor(id, {options...})
```

### HTML script

* 在 HTML 中插入 CSS 和 JavaScript，可参考 [demo](https://b3log.org/vditor/demo/index.html)

```html
<!-- ⚠️生产环境请指定版本号，如 https://unpkg.com/vditor@x.x.x/dist... -->
<link rel="stylesheet" href="https://unpkg.com/vditor/dist/index.css" />
<script src="https://unpkg.com/vditor/dist/index.min.js"></script>
```

### 示例代码

* [官方示例](https://b3log.org/vditor/demo/index.html) / [示例源码](https://github.com/Vanessa219/b3log-index/tree/master/src/vditor)
* [CommonJS Editor](https://github.com/Vanessa219/vditor/blob/master/demo/index.js)
* [CommonJS Render](https://github.com/Vanessa219/vditor/blob/master/demo/render.js)
* [在Svelte中使用](https://github.com/HerbertHe/svelte-vditor-demo)

#### 等待异步就绪（必读）

`new Vditor()` 是**异步构造**：lute.js 需要动态加载、`initUI` 在加载完之后才执行。在 `after()` 回调触发之前，**`this.vditor` 是 `undefined`**，所以 `setValue / focus / getValue / openSettings / setEditorSettings` 等所有 API 调用都会抛 NPE。

```js
// ❌ 错误：在构造外立刻调 API
const vd = new Vditor("vditor", { value: "..." });
vd.setValue("new");          // TypeError: Cannot read properties of undefined
vd.focus();                  // 同上

// ✅ 正确：用 after() 等待 lute + initUI 完成
new Vditor("vditor", {
  value: "...",
  after() {
    this.setValue("new");    // this 在 after() 内指 Vditor 实例
    this.focus();
  },
});

// ✅ 或用 Promise 包装一层（便于 async/await 集成）
function createVditor(options) {
  return new Promise((resolve) => {
    new Vditor(options.id, {
      ...options,
      after() {
        options.after?.call(this);
        resolve(this);
      },
    });
  });
}

const vd = await createVditor({ id: "vditor", value: "..." });
vd.setValue("new");
```

`options.after` 触发的时机（[index.ts:638-704](vditor/src/index.ts#L638-L704)）：lute.js 加载 → `initUI()` 跑完 → `setEditMode(...)` 执行 → DOM 全部就绪。**传入 `i18n` 对象 vs 传入 `lang` 字符串**时 `after()` 节奏不同（前者早一拍，因为 i18n 注入与 lute 加载并行；后者串行等待 i18n）。

### 主题

#### 编辑器主题

编辑器所展现的外观。内置classic，dark 2 套主题。

* 编辑器初始化时可通过 `options.theme` 设置内置主题
* 初始化完成后可通过 `setTheme` 更新编辑器主题
* 可通过修改 [index.less](https://github.com/Vanessa219/vditor/blob/master/src/assets/less/index.less) 中的变量对主题颜色进行定制
* 可参考现有结构和类名在原有基础上进行修改

#### 内容主题

Markdown 输出的 HTML 所展现的外观。内置 ant-design, light，dark，wechat 4 套主题。支持内容主题扩展接口。

* 需在显示元素上添加 `class="vditor-reset"`
* 编辑器初始化时可通过 `options.preview.theme` 设置内置或自己开发的主题列表
* 内容渲染初始化时可通过 `IPreviewOptions.theme` 设置内置或自己开发的主题
* 初始化完成后可通过 `setTheme` 或 `setContentTheme` 更新内容主题

#### 代码主题

代码块所展现的外观。内置 github 等 36 套主题。

* 编辑器初始化时可通过 `options.preview.hljs` 对代码块样式、行号、是否启用进行设置
* 内容渲染初始化时可通过 `IPreviewOptions.hljs` 对代码块样式、行号、是否启用进行设置
* 初始化完成后可通过 `setTheme` 或 `setCodeTheme` 更新代码主题

#### 主题系统细节

**编辑器主题（`setEditorTheme` / `data-editor-theme`）**

* **10 个内置主题 ID** 分 3 组（来源 [editorThemeCatalog.ts:6-29](vditor/src/ts/ui/editorThemeCatalog.ts#L6-L29)）：
  * Auto（1 个）：跟随系统 / VSCode
  * Light（4 个）：Ant Design、Light、GitHub、Idea
  * Dark（5 个）：Dark、One Dark、Monokai、Dracula、Nord
* **CSS 全部打包进 `index.css`**，无外部主题 CSS 文件——主题 ID 只是切换 `data-editor-theme` 属性 + 注入对应的 scoped 样式块
* **三套独立的 localStorage 持久化键**（[globalLocalStorageSettings.ts:60-62](vditor/src/ts/util/globalLocalStorageSettings.ts#L60-L62)）：
  * `lastNonAutoEditorTheme`
  * `lastLightEditorTheme`
  * `lastDarkEditorTheme`

  目的是：用户在 Light 选了 GitHub、切到 Dark 选了 One Dark，再切回 Light 时仍能恢复 GitHub。Auto 切换**不丢历史**。
* **Auto 主题双轨监听**（[setEditorTheme.ts:75-132](vditor/src/ts/ui/setEditorTheme.ts#L75-L132)）：
  1. VSCode 环境：监听 `document.body` 的 `data-vscode-theme-kind` MutationObserver
  2. 浏览器环境：监听 `prefers-color-scheme` 的 matchMedia

  两套监听器**全局只注册一次**（模块级静态变量），所有 vditor 实例共享——宿主不要在编辑器就绪前 toggle `data-vscode-theme-kind`，会触发整个编辑器 + Mermaid 重渲染。

**内容主题（`setTheme` / `vditor--dark`）**

`setTheme("dark")` 与编辑器主题**完全解耦**：它只切 `vditor.element` 上的 `vditor--dark` 类（[setTheme.ts:1-7](vditor/src/ts/ui/setTheme.ts#L1-L7)），对自定义 CSS 而言只是一个作用域 hook。要真正换编辑器外观用 `setEditorTheme(...)`。

**API 通知断点**

`setEditorTheme` 与 `setMermaidTheme` 公开方法固定 `notify=false`（[setEditorTheme.ts:177](vditor/src/ts/ui/setEditorTheme.ts#L177)）——监听 `options.changeEditorTheme` / `options.changeMermaidTheme` 想捕获外部 API 调用是**捕获不到的**，只能捕获工具栏 UI 操作。要么改用工具栏，要么自己在调用方手动通知。

### API

#### id

可填入元素 `id` 或元素自身 `HTMLElement`

⚠️：当填入元素自身的 `HTMLElement` 时需设置 `options.cache.id` 或将 `options.cache.enable` 设置为 `false`

#### options

|   | 说明 | 默认值 |
| - | - | - |
| i18n | 多语言，参见 ITips | - |
| undoDelay | 历史记录间隔 | - |
| after | 编辑器异步渲染完成后的回调方法 | - |
| height | 编辑器总高度 | 'auto' |
| minHeight | 编辑区域最小高度 | - |
| width | 编辑器总宽度，支持 % | 'auto' |
| placeholder | 输入区域为空时的提示 | '' |
| lang | 语言种类：de_DE, en_US, es_ES, fr_FR, ja_JP, ko_KR, pt_BR, ru_RU, sv_SE, vi_VN, zh_CN, zh_TW | 'zh_CN' |
| input(value: string) | 输入后触发  | - |
| focus(value: string) | 聚焦后触发 | - |
| blur(value: string) | 失焦后触发 | - |
| keydown(event: KeyboardEvent) | 按下后触发 | - |
| esc(value: string) | <kbd>esc</kbd> 按下后触发 | - |
| ctrlEnter(value: string) | <kbd>⌘/ctrl+enter</kbd> 按下后触发 | - |
| select(value: string) | 编辑器中选中文字后触发 | - |
| unSelect() | 编辑器中未选中文字后触发 | - |
| tab | <kbd>tab</kbd> 键操作字符串，支持 `\t` 及任意字符串 | - |
| typewriterMode | 是否启用打字机模式 | false |
| cdn | 配置自建 CDN 地址 | `https://unpkg.com/vditor@${VDITOR_VERSION}` |
| mode | 可选模式：sv, ir, wysiwyg | 'ir' |

> ⚠️ **mode 的隐式行为**（[Options.ts:120-122](vditor/src/ts/util/Options.ts#L120-L122) + [initUI.ts:85-86](vditor/src/ts/ui/initUI.ts#L85-L86)）：
>
> * `"sv"`（旧 split-view）静默 alias → `"ir"`，**无任何 warning**；业务方拿到的 `vditor.currentMode` 是 `"ir"`
> * 非法值（如 `"abc"`）静默回退到 `"wysiwyg"`
> * 切模式会触发 8+ 个副作用（重新解析 Markdown、刷新大纲、清 undo 栈、`outline.toggle`），大文档下肉眼可见卡顿
| debugger | 是否显示日志 | false |
| value | 编辑器初始化值 | '' |
| theme | 主题：classic, dark | 'classic' |
| icon | 图标风格：ant, material | 'ant' |
| customRenders: {language: string, render: (element: HTMLElement, vditor: IVditor) => void}[] | 自定义渲染器 | [] |
| customWysiwygToolbar(type: TWYSISYGToolbar, element: HTMLElement): void | 对 wysiwyg 模式下的工具栏进行自定义 | - |

#### options.toolbar

* 工具栏，可使用 name 进行简写： `toolbar: ['emoji', 'br', 'bold', '|', 'line']` 。默认值参见 [src/ts/util/Options.ts](https://github.com/Vanessa219/vditor/blob/master/src/ts/util/Options.ts)
* name 可枚举为： `emoji`，`headings`，`bold`，`italic`，`strike`，`|`，`line`，`quote`，`list`，`ordered-list`，`check` ,`outdent` ,`indent`，`code`，`inline-code`，`insert-after`，`insert-before` ,`undo`，`redo`，`upload`，`link`，`table`，`record`，`edit-mode`，`both`，`preview`，`fullscreen`，`outline`，`code-theme`，`content-theme`，`export`, `devtools`，`info`，`help`，`br`
* 当 `name` 不在枚举中时，可以添加自定义按钮，格式如下：

```js
new Vditor('vditor', {
  toolbar: [
    {
      hotkey: '⇧⌘S',
      name: 'sponsor',
      tipPosition: 's',
      tip: '成为赞助者',
      className: 'right',
      icon: '<svg t="1589994565028" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="2808" width="32" height="32"><path d="M506.6 423.6m-29.8 0a29.8 29.8 0 1 0 59.6 0 29.8 29.8 0 1 0-59.6 0Z" fill="#0F0F0F" p-id="2809"></path><path d="M717.8 114.5c-83.5 0-158.4 65.4-211.2 122-52.7-56.6-127.7-122-211.2-122-159.5 0-273.9 129.3-273.9 288.9C21.5 562.9 429.3 913 506.6 913s485.1-350.1 485.1-509.7c0.1-159.5-114.4-288.8-273.9-288.8z" fill="#FAFCFB" p-id="2810"></path><path d="M506.6 926c-22 0-61-20.1-116-59.6-51.5-37-109.9-86.4-164.6-139-65.4-63-217.5-220.6-217.5-324 0-81.4 28.6-157.1 80.6-213.1 53.2-57.2 126.4-88.8 206.3-88.8 40 0 81.8 14.1 124.2 41.9 28.1 18.4 56.6 42.8 86.9 74.2 30.3-31.5 58.9-55.8 86.9-74.2 42.5-27.8 84.3-41.9 124.2-41.9 79.9 0 153.2 31.5 206.3 88.8 52 56 80.6 131.7 80.6 213.1 0 103.4-152.1 261-217.5 324-54.6 52.6-113.1 102-164.6 139-54.8 39.5-93.8 59.6-115.8 59.6zM295.4 127.5c-72.6 0-139.1 28.6-187.3 80.4-47.5 51.2-73.7 120.6-73.7 195.4 0 64.8 78.3 178.9 209.6 305.3 53.8 51.8 111.2 100.3 161.7 136.6 56.1 40.4 88.9 54.8 100.9 54.8s44.7-14.4 100.9-54.8c50.5-36.3 108-84.9 161.7-136.6 131.2-126.4 209.6-240.5 209.6-305.3 0-74.9-26.2-144.2-73.7-195.4-48.2-51.9-114.7-80.4-187.3-80.4-61.8 0-127.8 38.5-201.7 117.9-2.5 2.6-5.9 4.1-9.5 4.1s-7.1-1.5-9.5-4.1C423.2 166 357.2 127.5 295.4 127.5z" fill="#141414" p-id="2811"></path><path d="M353.9 415.6m-33.8 0a33.8 33.8 0 1 0 67.6 0 33.8 33.8 0 1 0-67.6 0Z" fill="#0F0F0F" p-id="2812"></path><path d="M659.3 415.6m-33.8 0a33.8 33.8 0 1 0 67.6 0 33.8 33.8 0 1 0-67.6 0Z" fill="#0F0F0F" p-id="2813"></path><path d="M411.6 538.5c0 52.3 42.8 95 95 95 52.3 0 95-42.8 95-95v-31.7h-190v31.7z" fill="#5B5143" p-id="2814"></path><path d="M506.6 646.5c-59.6 0-108-48.5-108-108v-31.7c0-7.2 5.8-13 13-13h190.1c7.2 0 13 5.8 13 13v31.7c0 59.5-48.5 108-108.1 108z m-82-126.7v18.7c0 45.2 36.8 82 82 82s82-36.8 82-82v-18.7h-164z" fill="#141414" p-id="2815"></path><path d="M450.4 578.9a54.7 27.5 0 1 0 109.4 0 54.7 27.5 0 1 0-109.4 0Z" fill="#EA64F9" p-id="2816"></path><path d="M256 502.7a32.1 27.5 0 1 0 64.2 0 32.1 27.5 0 1 0-64.2 0Z" fill="#EFAFF9" p-id="2817"></path><path d="M703.3 502.7a32.1 27.5 0 1 0 64.2 0 32.1 27.5 0 1 0-64.2 0Z" fill="#EFAFF9" p-id="2818"></path></svg>',
      click () {alert('捐赠地址：https://ld246.com/sponsor')},
    }],
})
```

|   | 说明 | 默认值 |
| - | - | - |
| name | 唯一标示 | - |
| icon | svg 图标 | - |
| tip | 提示 | - |
| tipPosition | 提示位置：'n', 'ne', 'nw', 's', 'se', 'sw', 'w', 'e' | - |
| hotkey | 快捷键，格式为<kbd>⇧⌘</kbd>/<kbd>⌘</kbd>/<kbd>⌥⌘</kbd>| - |
| suffix | 插入编辑器中的后缀 | - |
| prefix | 插入编辑器中的前缀 | - |
| click(event: Event, vditor: IVditor) | 自定义按钮点击时触发的事件 | - |
| className | 样式名 | '' |
| toolbar?: Array<options.toolbar> | 子菜单 | - |

> ⚠️ **字符串 vs 对象合并是浅合并**（[Options.ts:133-301](vditor/src/ts/util/Options.ts#L133-L301)）：
>
> * `toolbar: ['bold']` → 继承默认（含 ⌘B、prefix/suffix、icon 等）
> * `toolbar: [{ name: 'bold' }]` → `Object.assign({}, 默认, 自定义)`，**自定义字段覆盖默认字段**
> * 只声明 `icon` 或 `hotkey` 会保留其它默认字段；**未声明的 `prefix` / `suffix` 会被默认完全保留**（不声明不等于"清空"）
> * 覆盖 `hotkey = "F1"` 会丢掉原来的 ⌘B，等于删掉原热键；想"额外加"只能覆盖而不能叠加

#### options.toolbarConfig

|   | 说明 | 默认值 |
| - | - | - |
| hide | 是否隐藏工具栏 | false |
| pin | 是否固定工具栏 | false |

#### options.counter

|   | 说明 | 默认值 |
| - | - | - |
| enable | 是否启用计数器 | false |
| after(length: number, counter: options.counter): void | 字数统计回调 | - |
| max | 允许输入的最大值 | - |
| type | 统计类型：'markdown', 'text' | 'markdown' |

#### options.cache

|   | 说明 | 默认值 |
| - | - | - |
| enable | 是否使用 localStorage 进行缓存 | true |
| id | 缓存 key，第一个参数为元素且启用缓存时**必填** | - |
| after(html: string): string | 缓存后的回调 | - |
| focusHost | 焦点持久化模式：'browser'（默认）/ 'vscode' | 'browser' |

> ⚠️ **cache 字段的隐式行为**（[Options.ts:120-128](vditor/src/ts/util/Options.ts#L120-L128)）：
>
> * `new Vditor('vditor')` 不传 options 时 → 自动注入 `{ cache: { id: "vditor" } }`
> * `cache.id` 显式为空字符串也会被覆盖成 `"vditor"`
> * **`cache.enable` 默认是 `true`**（与"未传 cache"是**不同**的状态）；但若只传 `cache: {}` 没有 id，`merge()` 会抛 `need options.cache.id`
> * **未传 `cache` 字段**时 `vditor.upload` 实例不会被构造，所有 `cache.*` API 都不可用

> ⚠️ **`cache.focusHost: 'vscode'` 会注册全局事件**（[cacheFocus.ts:469-480](vditor/src/ts/util/cacheFocus.ts#L469-L480)）：
>
> * `vscode` 模式自动挂 `pagehide / blur / focus` 三个 document 级监听，用于在 VSCode WebView 失焦时持久化光标位置
> * `browser` 模式（默认）**不持久化光标**——宿主若需要持久化必须自己接管（或者构造时显式设 `focusHost: 'vscode'`）

#### options.comment

⚠️：仅支持 wysiwyg 模式

|   | 说明 | 默认值 |
| - | - | - |
| enable | 是否启用评论模式 | false |
| add(id: string, text: string, commentsData: ICommentsData[]) | 添加评论回调 | - |
| remove(ids: string[]) | 删除评论回调 | - |
| scroll(top: number) | 滚动回调 | - |
| adjustTop(commentsData: ICommentsData[]) | 文档修改时，适配评论高度 | - |

#### options.i18n

|   | 说明 | 默认值 |
| - | - | - |
| lang | 语言：'en_US', 'ja_JP', 'ko_KR', 'ru_RU', 'zh_CN', 'zh_TW' | 'zh_CN' |
| i18n | 自定义 i18n 对象（key-value 字符串对），传入后会挂到 `window.VditorI18n` | 内置 6 种 |

> ⚠️ **i18n 的隐式行为**（[index.ts:139-159](vditor/src/index.ts#L139-L159)）：
>
> * **6 种内置 lang** 之外的 lang 值**直接抛错**（`lang not supported`）
> * 传入 `i18n` 对象时直接挂 `window.VditorI18n`；不传时按 `lang` 异步注入 `<script id="vditorI18nScript">`——**两种用法下 `after()` 触发节奏不同**（前者早一拍，因为 i18n 注入与 lute 加载并行）
> * 多实例共用 `vditorI18nScript` ID，有去重防护
> * **大量 fallback 是英文默认值**：自定义 i18n 不填某个 key 时 UI 会显示英文（与项目里"显示 undefined"是两回事——Vditor 内部已对每个 key 设了英文兜底）
> * emoji / at 等 hint 的 i18n 文案也走这一套

#### options.preview

|   | 说明 | 默认值 |
| - | - | - |
| delay | 预览 debounce 毫秒间隔 | 1000 |
| maxWidth | 预览区域最大宽度 | 800 |
| mode | 显示模式：both, editor | 'both' |
| url | md 解析请求 | - |
| parse(element: HTMLElement) | 预览回调 | - |
| transform(html: string): string | 渲染之前回调 | - |

#### options.preview.hljs

|   | 说明 | 默认值 |
| - | - | - |
| defaultLang | 未指定语言时默认使用该语言 | '' |
| enable | 是否启用代码高亮 | true |
| style | 可选值参见[Chroma](https://xyproto.github.io/splash/docs/longer/all.html) | `github` |
| lineNumber | 是否启用行号 | false |
| langs | 自定义指定语言 | [CODE_LANGUAGES](https://github.com/Vanessa219/vditor/blob/53ca8f9a0e511b37b5dae7c6b15eb933e9e02ccd/src/ts/constants.ts#L20) |
| renderMenu(code: HTMLElement, copy: HTMLElement) | 渲染菜单按钮 | - |

#### options.preview.markdown

|   | 说明 | 默认值 |
| - | - | - |
| autoSpace | 自动空格 | false |
| gfmAutoLink | 自动链接 | true |
| fixTermTypo | 自动矫正术语 | false |
| toc | 插入目录 | false |
| footnotes | 脚注 | true |
| codeBlockPreview | wysiwyg 和 ir 模式下是否对代码块进行渲染 | true |
| mathBlockPreview | wysiwyg 和 ir 模式下是否对数学公式进行渲染 | true |
| paragraphBeginningSpace | 段落开头空两个 | false |
| sanitize | 是否启用过滤 XSS | true |
| listStyle | 为列表添加 data-style 属性 | false |
| linkBase | 链接相对路径前缀 | '' |
| linkPrefix | 链接强制前缀 | '' |
| mark | 启用 mark 标记 | false |
| sup | 上标 | false |
| sub | 下标 | false |

#### options.preview.theme

|   | 说明 | 默认值 |
| - | - | - |
| current | 当前主题 | "light" |
| list | 可选主题列表 | { "ant-design": "Ant Design", dark: "Dark", light: "Light", wechat: "WeChat" } |
| path | 主题样式地址 | `https://unpkg.com/vditor@${VDITOR_VERSION}/dist/css/content-theme` |

#### options.preview.math

|   | 说明 | 默认值 |
| - | - | - |
| inlineDigit | 内联数学公式起始 $ 后是否允许数字 | false |
| macros | 使用 MathJax 渲染时传入的宏定义 | {} |
| engine | 数学公式渲染引擎：KaTeX, MathJax | 'KaTeX' |
| mathJaxOptions | 数学公式渲染引擎为 MathJax 时的参数 | - |

#### options.preview.actions?: Array<IPreviewAction | IPreviewActionCustom>

默认值为 ["desktop", "tablet", "mobile", "mp-wechat", "zhihu"]。
可从默认值中挑选进行配置，也可使用以下字段进行自定制开发。

|   | 说明 | 默认值 |
| - | - | - |
| key | 按钮唯一标识，不能为空 | - |
| text | 按钮文字 | - |
| tooltip | 提示 | - |
| className | 按钮类名 | - |
| click(key: string) | 按钮点击回调事件 | - |

#### options.preview.render.media

|        | 说明        | 默认值  |
|--------|-----------|------|
| enable | 是否启用多媒体渲染 | true |

#### options.image

|   | 说明 | 默认值 |
| - | - | - |
| isPreview | 是否预览图片 | true |
| preview(bom: Element) => void | 图片预览处理 | - |

#### options.link

|   | 说明 | 默认值 |
| - | - | - |
| isOpen | 是否打开链接地址 | true |
| click(bom: Element) => void | 点击链接事件 | - |

#### options.hint

|   | 说明 | 默认值 |
| - | - | - |
| parse | 是否进行 md 解析 | true |
| delay | 提示 debounce 毫秒间隔 | 200 |
| emoji | 默认表情，可从[lute/emoji_map](https://github.com/88250/lute/blob/master/parse/emoji_map.go) 中选取，也可自定义 | { '+1': '👍', '-1': '👎', 'heart': '❤️', 'cold_sweat': '😰' } |
| emojiTail | 常用表情提示 | - |
| emojiPath | 表情图片地址 | `https://unpkg.com/vditor@${VDITOR_VERSION}/dist/images/emoji` |
| extend: IHintExtend[] | 对 @/话题等关键字自动补全的扩展 | [] |

```ts
interface IHintData {
  html: string;
  value: string;
}

interface IHintExtend {
    key: string;

    hint?(value: string): IHintData[] | Promise<IHintData[]>;
}
```

#### options.upload

* 文件上传的数据结构如下。后端返回的数据结构不一致时，可使用 `format` 进行转换。

```js
// POST data
xhr.send(formData);  // formData = FormData.append("file[]", File)
// return data
{
 "msg": "",
 "code": 0,
 "data": {
 "errFiles": ['filename', 'filename2'],
 "succMap": {
   "filename3": "filepath3",
   "filename3": "filepath3"
   }
 }
}
```

* 为了防止站外图片失效，`linkToImgUrl` 可将剪贴板中的站外图片地址传到服务器端进行保存处理，其数据结构如下：

```js
// POST data
xhr.send(JSON.stringify({url: src})); // src 为站外图片地址
// return data
{
 msg: '',
 code: 0,
 data : {
   originalURL: '',
   url: ''
 }
}
```

* `success`，`format`，`error` 不会同时触发，具体调用情况如下：

```js
if (xhr.status === 200) {
    if (vditor.options.upload.success) {
        vditor.options.upload.success(editorElement, xhr.responseText);
    } else {
        let responseText = xhr.responseText;
        if (vditor.options.upload.format) {
            responseText = vditor.options.upload.format(files as File [], xhr.responseText);
        }
        genUploadedLabel(responseText, vditor);
    }
} else {
    if (vditor.options.upload.error) {
        vditor.options.upload.error(xhr.responseText);
    } else {
        vditor.tip.show(xhr.responseText);
    }
}
```

|   | 说明 | 默认值 |
| - | - | - |
| xhr | 上传时使用的 XMLHttpRequest | - |
| url | 上传 url，为空则不会触发上传相关事件 | '' |
| max | 上传文件最大 Byte | 10 * 1024 * 1024 |
| linkToImgUrl | 剪切板中包含图片地址时，使用此 url 重新上传 | '' |
| linkToImgCallback(responseText: string) | 图片地址上传回调 | - |
| linkToImgFormat(responseText: string): string | 对图片地址上传的返回值进行格式化 | - |
| success(editor: HTMLPreElement, msg: string) | 上传成功回调 | - |
| error(msg: string) | 上传失败回调 | - |
| token | CORS 上传验证，头为 X-Upload-Token | - |
| withCredentials | 跨站点访问控制 | false |
| headers | 请求头设置 | - |
| filename(name: string): string | 文件名安全处理 | name => name.replace(/\W/g, '') |
| accept | 文件上传类型，同[input accept](https://www.w3schools.com/tags/att_input_accept.asp) | - |
| validate(files: File[]) => string \| boolean | 校验，成功时返回 true 否则返回错误信息 | - |
| handler(files: File[]) => string \| null \| Promise<string> \| Promise<null> | 自定义上传，当发生错误时返回错误信息 | - |
| format(files: File[], responseText: string): string | 对服务端返回的数据进行转换，以满足内置的数据结构 | - |
| file(files: File[]): File[] \| Promise<File[]> | 将上传的文件处理后再返回 | - |
| cancel(files: File[]): void | 取消正在上传的文件 | - |
| setHeaders(): { [key: string]: string } | 上传前使用返回值设置头 | - |
| extraData: { [key: string]: string \| Blob } | 为 FormData 添加额外的参数 | - |
| multiple | 上传文件是否为多个 | true |
| fieldName | 上传字段名称 | 'file[]' |
| renderLinkDest?(vditor: IVditor, node: ILuteNode, entering: boolean): [string, number] | 处理剪贴板中的图片地址 | '' |

> ⚠️ **`url` 或 `handler` 二选一才会构造 `vditor.upload` 实例**（[index.ts:659-661](vditor/src/index.ts#L659-L661)）。如果只想要剪贴板图片拦截但没配 `url`/`handler`，`vditor.upload` 是 `undefined`；此时调用 `isUploading()` 会因读 `undefined.isUploading` 抛 `TypeError`。

#### options.resize

|   | 说明 | 默认值 |
| - | - | - |
| enable | 是否支持大小拖拽 | false |
| position | 拖拽栏位置：'top', 'bottom' | 'bottom' |
| after(height: number) | 拖拽结束的回调 | - |

#### options.classes

|   | 说明 | 默认值 |
| - | - | - |
| preview | 预览元素上的 className | '' |

#### options.fullscreen

|   | 说明 | 默认值 |
| - | - | - |
| index | 全屏层级 | 90 |

#### options.outline

|   | 说明 | 默认值 |
| - | - | - |
| enable | 初始化是否展现大纲 | false |
| position | 大纲位置：'left', 'right' | 'left' |

#### options.onSettingsChange

设置变更回调，参数为当前全量快照（`ViewerSettingsExport`，含 `globalSettings` 与 `aiPreferences`）。**默认不触发**，必须配合 `vd.setViewerSettingsSyncEnabled(true)` 才生效。详见[监听设置变化](#监听设置变化)。

```ts
onSettingsChange?(settings: ViewerSettingsExport): void;
```

#### methods

|   | 说明 |
| - | - |
| exportJSON(markdown: string) | 根据 Markdown 获取对应 JSON |
| getValue() | 获取 Markdown 内容 |
| getHTML() | 获取 HTML 内容 |
| insertValue(value: string, render = true) | 在焦点处插入内容，并默认进行 Markdown 渲染 |
| focus() | 聚焦到编辑器 |
| blur() | 让编辑器失焦 |
| disabled() | 禁用编辑器 |
| enable() | 解除编辑器禁用 |
| getSelection(): string | 返回选中的字符串（纯文本，**会丢 html-inline / 行内 math / 颜色 span**）。需要结构化 markdown 用 `getSelectionMarkdown()` |
| getSelectionMarkdown(): string | 返回选区的结构化 markdown。**保留** `<html-inline>` shell / 行内 math `$...$` / 颜色 `<span style>` |
| setValue(markdown: string, clearStack = false) | 设置编辑器内容且选中清空历史栈 |
| setValue(markdown: string, clearStack = false) | 设置编辑器内容且选中清空历史栈 |
| clearStack() | 清空撤销和重做记录栈|
| renderPreview(value?: string) | 设置预览区域内容 |
| getCursorPosition():{top: number, left: number} | 获取焦点位置 |
| deleteValue() | 删除选中内容 |
| updateValue(value: string) | 更新选中内容 |
| isUploading() | 上传是否还在进行中 |
| clearCache() | 清除缓存 |
| disabledCache() | 禁用缓存 |
| enableCache() | 启用缓存 |
| html2md(value: string) | HTML 转 md |
| tip(text: string, time: number) | 消息提示。time 为 0 将一直显示 |
| setPreviewMode(mode: "both" \| "editor") | 设置预览模式 |
| setTheme(theme: "dark" \| "classic", contentTheme?: string, codeTheme?: string, contentThemePath?: string) | 设置主题、内容主题及代码块风格 |
| getCurrentMode(): string | 获取编辑器当前编辑模式 |
| destroy() | 销毁编辑器 |
| getCommentIds(): {id: string, top: number}[] | 获取所有评论 |
| hlCommentIds(ids: string[]) | 高亮评论 |
| unHlCommentIds(ids: string[]) | 取消评论高亮 |
| removeCommentIds(removeIds: string[]) | 删除评论 |
| updateToolbarConfig(config: {hide?: boolean, pin?: boolean}) | 更新工具栏配置 |
| insertEmptyBlock(position: InsertPosition) | 插入空快 |
| getEditorSettings(): EditorSettings | 获取当前编辑器外观设置快照（已合并默认值）。详见[编辑器设置 API](#编辑器设置-api) |
| setEditorSettings(partial: Partial\<EditorSettings>) | 修改编辑器外观设置。立即写入 localStorage 并应用 CSS 变量；传 `undefined` 表示清除该项恢复默认。**不会触发 `onSettingsChange` 回调** |
| setViewerSettingsSyncEnabled(enabled: boolean) | 开启 / 关闭 `onSettingsChange` 回调通知（默认关闭）。详见[监听设置变化](#监听设置变化) |
| exportViewerSettings(): ViewerSettingsExport | 导出当前全局设置快照（用于写入配置文件） |
| importViewerSettings(data: ViewerSettingsExport) | 从配置文件导入并应用全局设置（导入过程会抑制回调） |
| openSettings() | 打开设置面板。若已打开或 toolbar 不含 settings 项则 no-op。详见[从外部打开弹窗](#从外部打开弹窗) |
| closeSettings() | 关闭设置面板。若未打开则 no-op |
| openAIPolishDialog() | 打开 AI 润色弹窗，传入当前选区或全文。详见[从外部打开弹窗](#从外部打开弹窗) |

> ⚠️ **AI 相关方法依赖 `options.ai.onPolish`**（[index.ts:690-699](vditor/src/index.ts#L690-L699)）：不配置 `onPolish` 时 `aiDialog` 不会被实例化，下列方法全部**静默 no-op**，**无任何报错**：
>
> * `openAIPolishDialog()`
> * `setCopilotAvailable(available)`
> * `setVSCodeModels(models)`
> * `triggerAIPolish(options?, capturedMarkdown?, isSelection?)`
>
> 业务方若 `ai: {}` 但忘了写 `onPolish`，整套 AI 接口失效且无法察觉。

#### 方法实现细节

下列方法的行为契约与表面对签名不完全一致，集成时容易踩坑：

* **`getValue() / getHTML()`** — 每次都从**当前 mode 的 DOM** 经 `lute.VditorDOM2Md / VditorIRDOM2Md` 重新解析，**不走缓存**（[getMarkdown.ts:1-28](vditor/src/ts/markdown/getMarkdown.ts#L1-L28)）。高频轮询（如每 100ms）是大文档的性能瓶颈；`options.debugger = true` 会打 `[vditor markdown] getMarkdown` 日志。

* **`setValue(markdown, clearStack = false)`** — 三重隐式行为（[index.ts:413-449](vditor/src/index.ts#L413-L449)）：
  1. **不更新 dirty 状态**——既不调用 `fireContentInput` 也不调 `markSaved`，`isDirty()` 保持上一次值；如果之前 `markSaved` 过则仍为 false
  2. **`clearStack = true`** 还会**重算** `historyMaxWaitFactor`（按新文档长度，>5 万字进入"仅 debounce 不强制 flush"档）
  3. **`markdown === ""`（空字符串）会顺手 `clearCache()`**——删除 `cache.id` 对应的 localStorage 缓存（content / focus / scroll 三块）

* **`setValue(_, false)`**（默认）—— **不**清 undo 栈、**也不**记新内容入栈；老历史能一路撤销回到 setValue 之前的内容。这是 vscode-office "载入新文档" 场景的常见坑：**必须传 `true`**。

* **`insertValue(value, render = true)` vs `updateValue(value)`**：
  * `insertValue` 走 `lute` 解析（markdown → DOM），是**渲染插入**
  * `updateValue` 走 `document.execCommand("insertHTML", false, value)`——**仅插入字面 HTML**，不会解析 markdown；如果传 `# title` 给 `updateValue`，用户看到的是字面 `# title`

* **`markSaved(markdown?) / isDirty()`** — 内部用 `WeakMap<IVditor, boolean>` 跟踪（[saveToolbarState.ts:5](vditor/src/ts/util/saveToolbarState.ts#L5)），**与 save 工具栏按钮完全解耦**。默认 toolbar **没有** `save` 项（[Options.ts](vditor/src/ts/util/Options.ts) 的默认 toolbar 不含它），所以视觉反馈"灰按钮"在默认配置下不可见——需要把 `{ name: 'save' }` 加到 `options.toolbar`。

* **`clearStack()`** — 不只是清空，**还顺手 `addToUndoStack` 推入一个初始快照**（[index.ts:451-455](vditor/src/index.ts#L451-L455)）。`clearStack()` 后栈长度 = 1，且 `undo()` 守卫 `length < 2` 直接 return，所以**第一次 ⌘Z 直接被吞**。

* **Undo / Redo 栈按 mode 分别存储**（[undo/index.ts:27-37](vditor/src/ts/undo/index.ts#L27-L37)）—— `ir` / `wysiwyg` 各一份独立栈；切模式后 ⌘Z **不会**撤销另一个 mode 的操作。这是用户"我刚才的操作 ⌘Z 撤销不掉"的根本原因。

* **`focus() / blur()`** — 只对 `wysiwyg.element` / `ir.element` 主元素生效，**不**下钻到 CodeMirror（[index.ts:236-251](vditor/src/index.ts#L236-L251)）。光标在 CodeMirror 内时 `focus()` 不会切回去；需要自己 `view.contentDOM.blur()`。

* **`getCursorPosition() / getSelection()`** — 同上，只读当前 mode 的 element。CodeMirror 内选中一段代码时 `getSelection()` 返回空字符串。

* **`tip(text, time = 0)`** — `time = 0` 表示**一直显示**，不会超时关闭（与 `time > 0` 语义对立）。想"立即关闭"必须传 `1` 或正数。

* **`destroy()`** — 内部**仅**解绑 `wysiwyg.unbindListener()`（[index.ts:628-636](vditor/src/index.ts#L628-L636)），IR / hint / outline / tip / toolbar / CodeMirror 实例的监听器**没有显式解绑**；全局 `matchMedia` 监听（[setEditorTheme.ts:97-132](vditor/src/ts/ui/setEditorTheme.ts#L97-L132)）使用模块级 `systemThemeVditor` 永远指向最后一个实例，**多实例 + SPA 路由切换时容易泄漏引用**。

* **`clearCache()`** — 只清 `cache.id` 对应键（content / focus / scroll 三块），**不动** `vditor-global-settings` 与 AI preference localStorage key（[index.ts:317-326](vditor/src/index.ts#L317-L326)）。以为"清缓存"会重置全局配置的实际只清当前实例的文档状态。

* **`switchEditMode(mode)`** — 切到相同 mode 早返回（[index.ts:185-191](vditor/src/index.ts#L185-L191)），且整条 `changeEditMode` 回调链被跳过（走 string 路径）；监听 `options.changeEditMode` 期望捕获 API 调用**捕获不到**，必须自己读 `getCurrentMode()`。

* **`setEditorTheme / setMermaidTheme`** 公开方法固定 `notify = false`，**不会**触发 `options.changeEditorTheme` / `options.changeMermaidTheme`（[setEditorTheme.ts:177](vditor/src/ts/ui/setEditorTheme.ts#L177) / [index.ts:181-183](vditor/src/index.ts#L181-L183)）；这两个回调只对工具栏 UI 操作生效。

#### static methods

> ⚠️ **本 fork 实际存在的静态方法清单**（[index.ts:81-104](vditor/src/index.ts#L81-L104)）：
>
> ```
> adapterRender, previewImage, codeRender, codeMirrorPreviewRender,
> mathRender, mermaidRender, plantumlRender, outlineRender,
> setCodeTheme, setEditorTheme,
> DEFAULT_EDITOR_SETTINGS
> ```
>
> **上游文档里的 `Vditor.preview` / `Vditor.md2html` / `Vditor.chartRender` / `Vditor.mindmapRender` 在本 fork 中不存在**——调用会 `TypeError: Vditor.xxx is not a function`。如需"无实例转换 markdown → html"，请使用 `setLute({...}).Md2HTML(md)` 自建。

> ⚠️ **`Vditor.setCodeTheme` 写 `<html data-code-theme>` 是全局副作用**（[setCodeTheme.ts:37-38](vditor/src/ts/ui/setCodeTheme.ts#L37-L38)）—— 不止影响当前 vditor，还会污染页面其它 CodeMirror 实例。多编辑器 / 多视图场景下，主题切换彼此覆盖。

* 不需要进行编辑操作时，仅需引入 [`method.min.js`](https://unpkg.com/vditor/dist/) 后如下直接调用

```js
Vditor.mermaidRender(document)
```

```js
import VditorPreview from 'vditor/dist/method.min'
VditorPreview.mermaidRender(document)
```

* 需要对页面中的 Markdown 进行渲染时可直接调用 `preview` 方法，参数如下：

```ts
previewElement: HTMLDivElement,   // 使用该元素进行渲染
markdown: string,  // 需要渲染的 markdown 原文
options?: IPreviewOptions {
  mode: "dark" | "light";
  anchor?: number;  // 为标题添加锚点 0：不渲染；1：渲染于标题前；2：渲染于标题后，默认 0
  customEmoji?: { [key: string]: string };    // 自定义 emoji，默认为 {}
  lang?: (keyof II18nLang);    // 语言，默认为 'zh_CN'
  emojiPath?: string;    // 表情图片路径
  hljs?: IHljs; // 参见 options.preview.hljs
  speech?: {  // 对选中后的内容进行阅读
    enable?: boolean,
  };
  math?: IMath; // 数学公式渲染配置
  cdn?: string; // 自建 CDN 地址
  transform?(html: string): string; // 在渲染前进行的回调方法
  after?(); // 渲染完成后的回调
  lazyLoadImage?: string; // 设置为 Loading 图片地址后将启用图片的懒加载
  markdown?: options.preview.markdown;
  theme?: options.preview.theme;
  render?: options.preview.render;
  renderers?: ILuteRender; // 自定义渲染 https://ld246.com/article/1588412297062
}
```

* ⚠️ `method.min.js`  和 `index.min.js` 不可同时引入

|   | 说明 |
| - | - |
| previewImage(oldImgElement: HTMLImageElement, lang: keyof II18n = "zh_CN", theme = "classic") | 点击图片预览 |
| mermaidRender(element: HTMLElement, cdn = options.cdn, theme = options.theme) | 流程图/时序图/甘特图 |
| SMILESRender(element: HTMLElement, cdn = options.cdn, theme = options.theme) | 化学物质结构 |
| markmapRender(element: HTMLElement, cdn = options.cdn) | markdown 思维导图 |
| flowchartRender(element: HTMLElement, cdn = options.cdn) | flowchart 渲染 |
| codeRender(element: HTMLElement, option?: IHljs) | 为 element 中的代码块添加复制按钮 |
| chartRender(element: (HTMLElement \| Document) = document, cdn = options.cdn, theme = options.theme) | 图表渲染 |
| mindmapRender(element: (HTMLElement \| Document) = document, cdn = options.cdn, theme = options.theme) | 脑图渲染 |
| plantumlRender(element: (HTMLElement \| Document) = document, cdn = options.cdn) | plantuml 渲染 |
| abcRender(element: (HTMLElement \| Document) = document, cdn = options.cdn) | 五线谱渲染 |
| md2html(mdText: string, options?: IPreviewOptions): Promise\<string> | Markdown 文本转换为 HTML，该方法需使用[异步编程](https://ld246.com/article/1546828434083?r=Vanessa#toc_h3_1) |
| preview(previewElement: HTMLDivElement, markdown: string, options?: IPreviewOptions) | 页面 Markdown 文章渲染 |
| highlightRender(hljsOption?: IHljs, element?: HTMLElement \| Document, cdn = options.cdn) | 为 element 中的代码块进行高亮渲染 |
| mediaRender(element: HTMLElement) | 为[特定链接](https://ld246.com/article/1589813914768)分别渲染为视频、音频、嵌入的 iframe |
| mathRender(element: HTMLElement, options?: {cdn?: string, math?: IMath}) | 对数学公式进行渲染 |
| speechRender(element: HTMLElement, lang?: (keyof II18nLang)) | 对选中的文字进行阅读 |
| graphvizRender(element: HTMLElement, cdn?: string) | 对 graphviz 进行渲染 |
| outlineRender(contentElement: HTMLElement, targetElement: Element) | 对大纲进行渲染 |
| lazyLoadImageRender(element: (HTMLElement \| Document) = document) | 对启用懒加载的图片进行渲染 |
| setCodeTheme(codeTheme: string, cdn = options.cdn) | 设置代码主题，codeTheme 参见 options.preview.hljs.style |
| setContentTheme(contentTheme: string, path: string) | 设置内容主题，contentTheme 参见 options.preview.theme.list |
| DEFAULT_EDITOR_SETTINGS | 编辑器外观设置默认值常量，见下 |

### 编辑器设置 API

这套 API 用于以编程方式读写设置面板里的所有项（UI 字号、正文字体、页面宽度、代码块最大高度、是否打字机模式等），绕开面板直接控制：

```ts
interface EditorSettings {
    uiFontSize: number;          // UI 字号 (px)，影响 hint / outline / 工具栏标签
    editorFontSize: number;      // 正文字号 (px)，仅影响 WYSIWYG / IR 内容区
    lineHeight: number;          // 行高 (1.0–3.0)
    fontFamily: string;          // 正文字体，'inherit' 表示继承
    codeFontFamily: string;      // 代码字体
    boldColor: string;           // 'default' / 'plain' / CSS 颜色
    pageWidth: string;           // '100%' / '210mm' / '768px' 等
    codeBlockMaxHeight: string;  // 'none' / '300px' / '400px' / '600px' / '800px'
    imageMaxWidth: number;       // % (10–100)
    imageMaxHeight: number;      // vh (10–100)
    typewriterMode: boolean;
}
```

```js
const vd = new Vditor('vditor', {/* ... */});

// 读取当前生效设置（已合并默认值，永远返回完整对象）
const s = vd.getEditorSettings();
console.log(s.pageWidth, s.lineHeight, s.typewriterMode);

// 修改一项
vd.setEditorSettings({ uiFontSize: 15 });

// 批量修改
vd.setEditorSettings({
    pageWidth: '210mm',      // A4
    lineHeight: 1.9,
    typewriterMode: true,
});

// 恢复默认（传 undefined 清除该 key）
vd.setEditorSettings({ typewriterMode: undefined });

// 取默认值
console.log(Vditor.DEFAULT_EDITOR_SETTINGS);
```

> `setEditorSettings()` 是"程序化配置"语义，**不会**触发 `onSettingsChange` 回调。如果你需要宿主感知这次写入，可以自己写：`vd.setEditorSettings({...}); vd.exportViewerSettings(); // 拿到新快照自己分发`。

设置会立即生效：写入 `localStorage`（key 前缀 `vditor-global-settings`）→ 应用到 `#vditor` 的对应 CSS 变量 → 若设置面板已打开则 UI 同步刷新。未传字段保持不变；写过的字段会持久化，刷新页面后仍生效。

> ⚠️ `setEditorSettings()` 是**程序化 API 调用**，**不会**触发 `onSettingsChange` 回调。`onSettingsChange` 只对**面板 UI 操作**（+/-、下拉、Toggle、Reset）生效。两者职责分离：API 写是"配置注入"语义，不应反向通知宿主；UI 操作是"用户意图"语义，需要持久化同步。

#### 监听设置变化

通过 `onSettingsChange` 选项挂回调，监听**面板 UI 操作**（+/-、下拉、Toggle、Reset）。注意**默认是关闭的**，必须显式调一次 `setViewerSettingsSyncEnabled(true)` 才会触发回调：`setEditorSettings()` 写入不触发本回调（见上方说明）：

```js
const vd = new Vditor('vditor', {
  /* ... */
  onSettingsChange: (settings) => {
    // settings 是全量快照，需要自己 diff
    syncToConfigFile(settings);
  },
});

// 必须！否则回调不会触发
vd.setViewerSettingsSyncEnabled(true);
```

回调收到的是 [`ViewerSettingsExport`](#static-methods) 格式（`{ globalSettings, aiPreferences }`），不是 diff：

```js
let prev = null;
const vd = new Vditor('vditor', {
  onSettingsChange: (cur) => {
    if (prev) {
      for (const k of Object.keys(cur.globalSettings)) {
        if (cur.globalSettings[k] !== prev.globalSettings[k]) {
          console.log('changed', k, '→', cur.globalSettings[k]);
        }
      }
    }
    prev = JSON.parse(JSON.stringify(cur));
  },
});
vd.setViewerSettingsSyncEnabled(true);
```

批量导入场景下会自动抑制回调（避免导入自己触发回调），见 `importViewerSettings`。

### AI 配置 API

AI 对话面板涉及 4 类持久化数据 + 当前选中项，提供**扁平方法**（`vd.getAIPrompts()` 等）、**`vd.ai.*` 命名空间**（与扁平方法 1:1 对应，便于聚合调用风格），以及**批量接口**（`vd.getAISettings()` / `vd.setAISettings()`）。所有 setter 在写入后会自动刷新已打开的 AI 弹窗 UI 和工具栏设置面板。

#### 数据类型

```ts
interface AIPrompt {
    id: string;          // 由 addAIPrompt 自动生成；外部 setAIPrompts 也可自填
    name: string;        // 显示名
    content: string;     // 注入 LLM 的 system 文本
}

interface AIModel {
    id: string;
    name: string;        // 可为空，UI 用 nameFromUrl(url) 兜底
    url: string;         // API 端点
    key: string;
    model: string;       // 支持 "gpt-4o,gpt-4o-mini" 逗号分隔多模型
    format: "auto" | "openai" | "anthropic" | "gemini" | "ollama";
}

interface AIPreset {
    key: string;         // 内置 preset 用固定 key（"polish"/"shorten" 等）；自定义用 "custom-<ts>"
    label: string;       // 默认显示标签
    i18nKey?: string;    // 可选 i18n key（内置 preset 用此做多语言）
    goal: string;        // 点击后写入 goal textarea 的文本
}

type AIEngine = "vscode" | "custom";

interface IAISelections {
    engine: AIEngine;                // 当前引擎 tab
    selectedPrompt: string;          // AIPrompt.id；空串表示"未选"
    selectedModel: string;           // AIModel.id；空串表示"未选"
    outputLanguage: "auto" | "en_US" | "zh_CN" | "zh_TW" | "ja_JP" | "ko_KR" | "ru_RU";
}

interface IAISettings {
    prompts: AIPrompt[];
    models: AIModel[];
    presets: AIPreset[];
    selections: IAISelections;
}

interface IAISettingsPatch {
    prompts?: AIPrompt[];
    models?: AIModel[];
    presets?: AIPreset[];
    selections?: Partial<IAISelections>;
}
```

#### 方法清单

| 类别 | 方法 | 说明 |
| - | - | - |
| Prompts | `getAIPrompts()` / `setAIPrompts(prompts)` | 整体读写；首次返回内置 3 个默认 |
| Prompts | `addAIPrompt(input)` → `AIPrompt` | 自动生成 id；返回新对象 |
| Prompts | `updateAIPrompt(id, patch)` → `AIPrompt \| null` | 找不到返回 null |
| Prompts | `removeAIPrompt(id)` → `boolean` | 是否真的删了 |
| Models | `getAIModels()` / `setAIModels(models)` | 整体读写；首次返回空数组 |
| Models | `addAIModel(input)` / `updateAIModel(id, patch)` / `removeAIModel(id)` | CRUD，同上 |
| Presets | `getAIPresets()` / `setAIPresets(presets)` | 整体读写；首次返回内置 6 个默认 |
| Presets | `addAIPreset(input)` / `updateAIPreset(key, patch)` / `removeAIPreset(key)` | CRUD，同上 |
| Presets | `resetAIPresets()` | 清空用户自定义，恢复内置默认 |
| Selections | `getAISelections()` / `setAISelections(partial)` | 整体读写选中项；partial 字段可选 |
| Selections | `getAIEngine()` / `setAIEngine(engine)` | 引擎单值读写 |
| Selections | `getAISelectedPrompt()` / `setAISelectedPrompt(id)` | 选中 prompt 单值 |
| Selections | `getAISelectedModel()` / `setAISelectedModel(id)` | 选中 model 单值 |
| Selections | `getAIOutputLanguage()` / `setAIOutputLanguage(lang)` | 输出语言单值 |
| 批量 | `getAISettings()` → `IAISettings` | 一次读全部 |
| 批量 | `setAISettings(patch: IAISettingsPatch)` | 一次写（partial），触发一次 `onSettingsChange` 通知 |

所有方法在 `Vditor` 实例上**同时提供扁平和 `vd.ai.*` 两种调用形态**，例如：

```js
// 扁平风格（与 vd.getEditorSettings 等已有方法风格一致）
vd.getAIPrompts();
vd.setAIPrompts([{ id: 'p1', name: 'Polite tone', content: 'Rewrite in polite tone' }]);

// 命名空间风格（聚合，便于链式 / 命名空间管理）
vd.ai.getPrompts();
vd.ai.addPrompt({ name: 'Polite tone', content: 'Rewrite in polite tone' });
vd.ai.setSettings({ presets: [{ key: 'polish-cn', label: '润色', goal: '润色文本，保持原意' }] });
```

> ⚠️ **变更通知**：以上 setter 是程序化 API 调用，**不会逐字段**触发 `onSettingsChange` 回调；只有 `setAISettings()` 会在末尾统一触发一次。如需宿主感知：
>
> ```js
> vd.setViewerSettingsSyncEnabled(true); // 开启同步
> // 然后 vd.setAIPrompts([...]) / vd.setAISettings({...}) 都会触发 onSettingsChange
> ```

#### 完整示例

```js
const vd = new Vditor('vditor', { /* ... */ });

// 1) 增加 1 个提示词并选中
const newPrompt = vd.addAIPrompt({ name: 'Polite tone', content: 'Rewrite in polite tone' });
vd.setAISelectedPrompt(newPrompt.id);

// 2) 增加 1 个自定义模型
const newModel = vd.addAIModel({
    name: 'My OpenAI',
    url: 'https://api.example.com/v1',
    key: 'sk-...',
    model: 'gpt-4o',
    format: 'openai',
});
vd.setAISelectedModel(newModel.id);

// 3) 增加 1 个自定义快捷操作
vd.addAIPreset({ label: '润色为正式语气', goal: 'Rewrite in formal tone while preserving meaning' });

// 4) 一次性导出/导入（用于配置文件同步）
const snapshot = vd.getAISettings();
fs.writeFileSync('ai-config.json', JSON.stringify(snapshot, null, 2));
// 之后想恢复：
const restored = JSON.parse(fs.readFileSync('ai-config.json', 'utf-8'));
vd.setAISettings(restored);

// 5) 重置 presets 为内置默认
vd.resetAIPresets();
```

存储位置：

- Prompts / Models / Presets 列表 → `localStorage.vditor-global-settings.aiPrompts|aiModels|aiPresets`（JSON 字符串）
- 选中项 4 个 key → `localStorage.aiEngine|aiSelectedModel|aiSelectedPrompt|aiOutputLanguage`（顶层 key）
- 已被 `setViewerSettingsSyncEnabled(true) + onSettingsChange` 链路感知，见上方"监听设置变化"小节

### 从外部打开弹窗

某些场景需要在编辑器外（右键菜单、命令面板、自定义快捷键、宿主菜单栏）主动打开 Vditor 的内置弹窗。Vditor 对这类调用方提供了 3 个公开方法，**已经处理了选区捕获、关其它弹层、面板定位等细节**，不需要再操作内部 DOM。

| 方法 | 用途 |
| - | - |
| `openSettings()` | 打开设置面板（已开则 no-op；toolbar 不含 settings 项时也无操作） |
| `closeSettings()` | 关闭设置面板（未开则 no-op） |
| `openAIPolishDialog()` | 打开 AI 润色弹窗，传入当前选区或全文 |

#### 在右键菜单里调用

实现思路是：右键菜单的 click handler 拿到 `editor` 实例，按 `data-action` 分发对应调用。典型实现（来自 vscode-office 的 `resource/markdown/util.js`）：

```js
menu.addEventListener('click', e => {
    const item = e.target.closest('[data-action]');
    if (!item) return;
    closeMenu();
    const action = item.dataset.action;
    switch (action) {
        case 'aiPolish':
            editor.openAIPolishDialog();      // 选中文本 → 润色选区；否则润色全文
            break;
        case 'openSettings':
            editor.openSettings();            // 任意位置唤起设置面板
            break;
        case 'closeSettings':
            editor.closeSettings();
            break;
    }
});
```

#### 实现细节 / 调用注意

1. **事件复用**：`openSettings()` / `closeSettings()` 内部是给 settings toolbar 按钮 `dispatchEvent` 一个 `MouseEvent`，让 `toggleSubMenu` 现有逻辑处理"关其它弹层 + 算位置"等副作用，**不会**绕过 UI 一致性检查
2. **状态查询**：两个方法都先查 `panel.style.display === "block"`，所以重复调用或错序调用都是安全的（开对开 = no-op，关对关 = no-op）
3. **选区处理**：`openAIPolishDialog()` 内部捕获选区（[index.ts:499-507](vditor/src/index.ts#L499-L507)）：
   * 有选区 → 润色选区
   * 无选区 → 润色全文
   * 调用前**不要**自己 `blur()`，否则选区丢失后只能润色全文
4. **不需要 toolbar settings 项也能调**：如果你的 toolbar 配置里**没有** `'settings'`，调 `openSettings()` 是 no-op，不报错
5. **AI 对话框关闭**：AI 弹窗自己绑定 Esc 关闭（[aiDialog.ts:658-660](vditor/src/ts/ui/aiDialog.ts#L658-L660)），不需要外部调用关

### 生命周期

Vditor 实例的完整生命周期与状态机：

```
new Vditor(id, options)
    │
    ├─ 同步：构造 Vditor 包装类 + 合并 options
    │
    ├─ 异步 1：注入 i18n script（仅当未传 options.i18n）
    │
    ├─ 异步 2：注入 lute.js（与 i18n 并行）
    │
    ├─ lute 加载完成 → this.vditor = 内部实例（之前都是 undefined）
    │
    ├─ initUI() 跑完 → DOM / toolbar / outline / hint / CodeMirror 就绪
    │
    ├─ setEditMode(options.mode) → 当前模式编辑器渲染
    │
    └─ options.after() 触发 ← 唯一保证所有 API 可用的回调
```

**关键点**：

* **`after()` 之前所有 API 都不可用**——任何 `setValue / focus / getValue / openSettings / setEditorSettings` 调用都会 NPE。详见 [示例代码 - 等待异步就绪](#等待异步就绪必读)。
* `destroy()` 之后实例不可复用——`window.vditor` 引用需要宿主自己清掉。

#### Dirty 状态机

| 触发 | `isDirty()` 变化 | `options.input` 触发 | 备注 |
| - | - | - | - |
| 用户键入 / 粘贴 / IME 输入 | → `true` | ✅ | 走 `fireContentInput` |
| `setValue(md, _)` | 不变 | ❌ | 既不 `markSaved` 也不标 dirty；监听 `options.input` 持久化会漏 |
| `updateValue(value)` | → `true` | ✅ | 走浏览器原生 input event |
| `insertValue(value, true)` | → `true` | ✅ | `preventInput=true` 但显式调 `input(vditor, range)` |
| `markSaved(value?)` | → `false` | ❌ | 同时清掉 `vditor.options.input` 状态 |

**与 save 工具栏按钮解耦**：`isDirty()` 状态由 WeakMap 跟踪，但视觉反馈（灰按钮）需要 toolbar 里存在 `{ name: 'save' }` 项。默认 toolbar 不含 save，**默认配置下看不见任何"已保存"反馈**。

#### Undo / Redo 行为

* **栈容量**：`stackSize = 50`（[undo/index.ts](vditor/src/ts/undo/index.ts)），超出后丢弃最旧
* **按 mode 分别存储**：`ir` 与 `wysiwyg` 各一份独立栈，**切模式后 ⌘Z 不会撤销另一个 mode 的操作**
* **`historyMaxWaitFactor` 按文档长度分级**（[historySchedule.ts:32-55](vditor/src/ts/util/historySchedule.ts#L32-L55)）：
  * < 800 字：1× undoDelay（最快）
  * 800 / 2500 / 6000 / 12000 / 20000 / 30000：1× ~ 5×
  * ≥ 50000 字：返回 -1（仅 debounce，不强制 flush）
* **`recordHistoryChange` 是 debounced**——连续输入时计时器不断被重置，**停笔才入栈**；宿主想"立刻落栈"得直接调 `vditor.undo.addToUndoStack(vditor)` 或 `recordHistoryChange(vditor)`
* **`undoDelay` 默认值** 100ms

#### 大纲渲染时机

* **连续输入时**：`scheduleRenderToc`（[toc.ts:24-30](vditor/src/ts/util/toc.ts#L24-L30)）debounced 渲染——`setTimeout` 延迟 = `max(100, undoDelay)`，**停笔才刷新**
* **立即刷新**（`renderTocNow`）：undo、redo、`setHeading`、删块、拖块、切模式、设置面板的设置变化
* **active 项跳动抑制**：`markOutlineEditing(vditor)` 设置 `editingUntil = Date.now() + undoDelay + 50`（[updateOutlineActive.ts:107-109](vditor/src/ts/outline/updateOutlineActive.ts#L107-L109)），这段时间不更新 active 高亮，避免编辑过程中闪烁
* **outline.toggle 故意不 focus 编辑器**（[outline/index.ts:225-233](vditor/src/ts/outline/index.ts#L225-L233)）—— 注释说 "focus 会清空滚动位置"

### 选区与焦点

Vditor 内部维护选区有多套机制，宿主接入时容易混淆：

#### `savedRange`（宿主层模块变量）

`vditorProFunc.js:8` 的 `let savedRange = null` 是**宿主层**的状态机：

* `window.blur()` 时如果当前 range 在 `.vditor-wysiwyg` 内 → 写入 `savedRange`
* `window.focus()` 时如果 `savedRange` 存在 → `removeAllRanges() + addRange(savedRange)`
* 跨 iframe / shadow root 时失准（因为是 `window.getSelection()`）

Vditor 公开 `focus / blur` **不返回任何 flag、不维护 savedRange**——宿主包装层必须自己做。

#### 选区丢失的所有兜底链

`vditor[mode].insert` 之前调 `getEditorRange`（[selection.ts:6-36](vditor/src/ts/selection.ts#L6-L36)）会依次尝试：

1. `selection.getRangeAt(0)`（前提：range.startContainer 在编辑器内）
2. `vditor[mode].range`（`blurEvent` 里存的兜底）
3. 自动 `focus()` 到 0 位

宿主如果在编辑器外 set selection，下一次 insert 会自动跳回编辑器。

#### `frozenSelection`（AI 弹窗必备）

AI 弹窗打开时会调用 `captureEditorSelection`（[frozenSelection.ts:72-102](vditor/src/ts/frozenSelection.ts#L72-L102)）冻结当前选区 + `showFrozenSelection` 高亮：

* **优先用 CSS Highlight API**（浏览器支持 `CSS.highlights` 时），无 overlay div
* **降级方案**：插入 `<div class="vditor-frozen-selection">` overlay
* **仅 non-collapsed range 才存**——collapsed 状态时返回 `null`

宿主实现"AI 弹窗打开后仍高亮原文"应该用这套 API，**不要**自己保存 `getSelection()`——点菜单会触发 blur，原生选区丢失。

#### `setSelectionFocus` 会清掉多 range

`setSelectionFocus(range)` = `selection.removeAllRanges() + addRange(range)`。**关键**：会清掉页面上其它选中态，宿主别指望同时多选。

#### CodeMirror 内的特殊行为

公开 `focus / blur / getCursorPosition / getSelection` 都**只对 wysiwyg / ir 主元素生效，不下钻到 CodeMirror**：

* 光标在 CodeMirror 内调 `focus()` 不会切回 wysiwyg
* 在 CodeMirror 里选中一段代码时 `getSelection()` 返回空字符串

需要自己 `view.contentDOM.focus() / blur()`。

### 渲染管线

#### MathJax / KaTeX 加载差异

| 引擎 | 加载方式 | 文件 | 同步性 |
| - | - | - | - |
| MathJax | `addScriptSync` | `tex-svg.js` / `tex-mml-chtml.js` | 同步 |
| KaTeX | `addScript` | `katex.min.js` + `auto-render.min.js` | 异步 |

切引擎必须配置 `options.preview.math.engine`。

#### CodeMirror 接管边界

* **仅 `data-type=code-block | math-block`** 被 CodeMirror 接管（[codeMirrorManager.ts](vditor/src/ts/codeBlock/codeMirrorManager.ts)），其它代码块（`mermaid` / `plantuml` / `chart` 等）走普通预览
* **屏外懒加载**有 3 个常量：可视区 / 200px 缓冲 / 5000px 之外的代码块延迟挂载
* **mermaid / plantuml 不入懒加载**——它们图大但解析本身异步

#### math 源元素保护

`isSourceMathElement()`（[mathRender.ts:58-70](vditor/src/ts/markdown/mathRender.ts#L58-L70)）判断"这是不是数学源码元素"，**防止源码被清空塞进 SVG**。宿主手动改 DOM 时不要破坏 `data-type="math-inline" | "math-block"` 父结构，否则渲染会跳过。

#### Mermaid 主题

5 个内置色板：`Ocean` / `Sunset` / `Dracula` / `Monokai` / `Nord`（[mermaid.less](vditor/src/assets/less/_mermaid.less)）；加上 4 个属性选择器驱动的：`Light` / `Forest` / `Dark` / `Auto`。

#### PlantUML 硬编码公共服务器

`http://www.plantuml.com/plantuml/svg/~1...`（[plantumlRender.ts](vditor/src/ts/markdown/plantumlRender.ts)）—— 企业内网无法访问外网时所有 plantuml 图全挂。

### Markdown 内容保真度

Vditor 在 DOM 中维护一套**专属结构**让 Markdown 渲染保持可逆：

| 结构 | 关键属性 / 约定 |
|---|---|
| html-inline shell | `<span data-type="html-inline" data-md-source="..." contenteditable="false">` —— `data-md-source` 是**唯一可信源** |
| 行内 math | `<code data-type="math-inline">` 开头有 ZWSP 防 CodeMirror 把整段当空段 |
| 块 math | `<div data-type="math-block">` + `<pre><code>` 隐藏源 |
| 代码块 | `<pre data-type="code-block">` + `<code class="language-X">` 双轨（隐藏源 + CM 实例） |
| 嵌套色 / 嵌套 span | 内层 `<span style="...">` 包在外层 shell 内 |

所有"取 markdown"的出口都通过统一 helper `cleanFragmentForMarkdown`（[cleanFragmentForMarkdown.ts](vditor/src/ts/markdown/cleanFragmentForMarkdown.ts)）保证不丢这些结构：

```
                          DOM                  提取流程
                            │
   getValue() ─────────────►│  buildEditorHtmlForMarkdown + VditorDOM2Md   ──► markdown
                            │
   blockToMarkdown() ──────►│  clone + cleanFragmentForMarkdown + VditorDOM2Md
                            │
   rangeToMarkdown() ──────►│  range.cloneContents + cleanFragmentForMarkdown + VditorDOM2Md
                            │
   applyAIResult(...) ─────►│  markdown → Md2VditorDOM（html-inline 保护） + 插入
```

**统一规则**：

* **入口**（取 markdown）：永远走 `cleanFragmentForMarkdown`，不要直接 `selection.toString()` / `range.toString()`
* **出口**（写 markdown）：永远走 `Md2VditorDOM`（已被 `setLute` 的 `wrapMdRender` 包裹，自动保护 html-inline）
* **嵌套**：每次 `applyStyleInPreview` 在 html-inline shell 内创建嵌套 span 后立即调 `flattenNestedHtmlInline`，让外层 shell 的 `data-md-source` 同步。`setSelectionColor` 通过 html-inline shell 间接实现，自身不调 flattenNestedHtmlInline（依赖 applyStyleInPreview 的链路）。
* **`data-md-source` 编码**（C4 细节）：html-inline shell 的 `data-md-source` 属性值由 `escapeAttr` + `_esc_newline_` 占位符编码，与 `renderHtmlInlineShell` 写时一致。`flattenNestedHtmlInline` 写时也走这个编码——visualHost 文本出现 `<` `>` `"` 换行时不会破坏 attribute。

**容易踩坑的场景**：

| 场景 | 错误做法 | 正确做法 |
|---|---|---|
| 拿到选区 markdown | `selection.toString()` 丢全部结构 | `vd.getSelectionMarkdown()` |
| 块菜单"复制 Markdown" | 直接 `VditorDOM2Md(block.outerHTML)` | `vd` 内部已用 `blockToMarkdown` |
| 编程注入 markdown | `vd.insertValue(md)` 当 html 走 | `vd.insertMarkdown(md)` |
| AI 回写 | 手动 `execCommand('delete')` 撕结构 | `vd.applyAIResult`（带 Range 校验 + 安全降级） |

### 宿主集成 / 自定义 URL 协议（vscode-office）

本 fork 与宿主 App 通信**不走 postMessage**，而是 5 个**自定义 URL scheme**（用 `window.location.href = "scheme://..."` 触发）。宿主在 WKWebView / WebView 拦截 scheme 即可：

| 协议 | 触发位置 | Payload | 宿主处理建议 |
| - | - | - | - |
| `editorimage://content=<base64>` | upload.handler 上传完成 | base64 dataURL | 上传到自己存储 + `vditor.insertValue("![image](url)")` 回写 |
| `editordroptext://content?text=...&content=...` | 文本拖入编辑器 | URL 编码的拖入文本 + 当前编辑器全文 | `content=` 可选；只关心拖入文本可省略 |
| `nativeCopy://content=<text>` | `copyToClipboard()` 或 block 菜单复制 | URL 编码的复制内容 | 写入系统剪贴板 |
| `nativeCommand://save` | 工具栏 save 按钮 / `⌘S` | 无参数 | 触发宿主保存；**协议本身无去重 / 节流**，宿主侧应防抖 |
| `editorexit://content=123` | `options.esc()` 回调 | 当前固定为 `123`（**未回传内容**） | 若要 ESC 退出带走文本须改 `esc` 配置 |
| `aipolish://content=<json>` | `options.ai.onPolish` 回调（AI 润色请求） | URL 编码 JSON：`{ markdown, isSelection, replaceAll, options }` | 宿主解析后发起 LLM 请求；回写方式见下方 |
| `aipolishcancel://content=1` | `options.ai.onCancelPolish`（用户点 Stop） | 固定 `1` | 宿主侧中断在飞的 LLM 请求 |

**所有协议都通过 `window.location.href` 触发**，宿主在 WKWebView 拦截 `scheme:` URL 即可，不是 postMessage。详见 [vditorProFunc.js](vditor/vditorProFunc.js) 实现。

#### AI 润色回写协议

`aipolish://` 只是请求信号，宿主拦截后发起 LLM 请求，结果通过 WebView 的 `evaluateJavaScript` 调以下三个全局函数回写（vditorProFunc.js 已挂到 `window`）：

| 函数 | 用途 |
| - | - |
| `window.applyAIResult(markdown, replaceAll?, range?)` | 一次性写入。`replaceAll = true` 全量替换；`false` 替换选区（`range` 需用 `{ startOffset, endOffset, startText, endText }` 序列化） |
| `window.streamAIChunk(chunk)` | 流式推送一段增量，实时更新审阅面板 diff |
| `window.endAIStream()` | 流式结束，启用审阅面板的 Accept 按钮 |

**推荐流式**（用户体验更好）：

```js
// 宿主侧（伪代码，WKWebView evaluateJavaScript）
onChunkFromLLM(chunk) {
  webView.evaluateJavaScript(`window.streamAIChunk(${JSON.stringify(chunk)})`);
}
onStreamDone(fullMarkdown) {
  webView.evaluateJavaScript(`
    window.endAIStream();
    // 不需要主动 applyAIResult —— 用户在审阅面板点 Accept 才触发
  `);
}
```

**一次性回写**（LLM 不支持流式时）：

```js
webView.evaluateJavaScript(
  `window.applyAIResult(${JSON.stringify(rewrittenMarkdown)}, true)`
);
```

### 集成陷阱速查

按"踩坑代价 × 文档完整度"排序的 20 条最容易踩的坑：

1. **`after()` 之前调任何 API 都会 NPE**（`this.vditor` 未赋值）。
2. **`setValue(_, true)` 隐式三重行为**：空字符串**清 localStorage cache**、不更新 dirty、按新长度**重算** debounce 因子。
3. **`switchEditMode` 切到相同 mode 早返回**，且**不触发** `changeEditMode`。
4. **`setEditorTheme` / `setMermaidTheme` 公开方法固定 `notify=false`**，不会触发 `changeEditorTheme` / `changeMermaidTheme`。
5. **`setEditorSettings({key: undefined})` 是清除字段**（恢复默认），**不是**"保留不变"。
6. **`onSettingsChange` 默认关闭**，必须 `setViewerSettingsSyncEnabled(true)` 才会触发。
7. **`setEditorSettings` / `importViewerSettings` 都抑制 `onSettingsChange`**（用 `suppressSettingsNotify` 包住）。
8. **`Ctrl+F` / `Ctrl+R` 是全局拦截、无视焦点**；宿主别再挂这两个组合。
9. **`Ctrl+Enter` 模式相关**：wysiwyg/ir 是"插入空行"，preview 是 `options.ctrlEnter`。
10. **VS Code 风格快捷键在 CodeMirror 内 / IME 组字中不响应**。
11. **Undo 栈按 mode 分存**——切模式后 ⌘Z 不会撤销另一个 mode 的操作。
12. **`clearStack()` 顺手 push 一个初始快照**，第一次 ⌘Z 直接被吞。
13. **`setValue` 不触发 `options.input`**；监听它来持久化会漏。
14. **`markSaved / isDirty` 与 save 工具栏按钮解耦**——默认 toolbar 没有 save，视觉反馈不可见。
15. **`cache.focusHost: 'vscode'` 会注册 `pagehide/blur/focus` 全局监听**；`'browser'` 不持久化光标。
16. **`options.ai` 没 `onPolish`** → 所有 AI API 静默 no-op，无任何报错。
17. **`destroy()` 不解绑 IR/hint/outline/tip 监听器** + 全局 `matchMedia` 泄漏引用 → 单页多实例注意。
18. **`openSettings` / `closeSettings` 强依赖 toolbar 含 `settings` 项**；删掉后失效。
19. **`setCodeTheme` 写 `<html data-code-theme>` 是全局副作用**，影响其它 CodeMirror 实例。
20. **`options.toolbar` 用对象形式覆盖时只 shallow merge**，不声明的 `prefix` / `suffix` 不会被清，但只声明 `icon` / `hotkey` 会清掉其它默认。
21. **`getSelection()` 返回纯文本，丢所有 Vditor 专属结构**（html-inline / 行内 math / 颜色 span）。AI 场景必须用 `getSelectionMarkdown()`——见 [Markdown 内容保真度](#markdown-内容保真度)。
22. **`openAIPolishDialog()` 内部已走结构化提取**（`rangeToMarkdown`）——AI 看到的原文不再是裸文本。但要求 `options.ai.onPolish` 已配置（见 #16）。
23. **`applyAIResult(markdown, replaceAll=false, range?)` 的 `range` 必须含真实 DOM 节点引用**，不能只传 offset + textContent（详情见 [AI 回写协议](#ai-润色回写协议)）。
24. **嵌套 html-inline 写入后没调 `flattenNestedHtmlInline`**：用户在已着色文字上再加颜色，外层 shell 的 `data-md-source` 仍只有原始 source，内层样式丢。`getValue()` / `AI 润色` 都会读到这个不一致。
25. **`insertValue` / `updateValue` 已支持智能识别**：传 HTML（含 `<xxx>`）走 insertHTML 路径；传纯 Markdown 走 Lute 解析路径。不要再手动 `execCommand('insertHTML')`。

## 🏗 开发文档

### 原理相关

* [关于所见即所得 Markdown 编辑器的讨论](https://ld246.com/article/1579414663700)
* [Vditor 实现 Markdown 所见即所得](https://ld246.com/article/1577370404903)
* [Lute 一款对中文语境优化的 Markdown 引擎，支持 Go 和 JavaScript](https://ld246.com/article/1567047822949)

### 环境

1. 安装 [node](https://nodejs.org/) LTS 版本
2. [下载](https://github.com/Vanessa219/vditor/archive/master.zip)最新代码并解压
3. 根目录运行 `npm install`
4. `npm run start` 启动本地服务器，打开 http://localhost:9000
5. 修改代码
6. `npm run build` 打包代码到 dist 目录

### CDN 切换

由于使用了按需加载的机制，默认 CDN 为 [https://unpkg.com/vditor](https://unpkg.com/vditor)@版本号

如果代码有修改或需要使用自建 CDN 的话，可按以下步骤进行操作：

* 初始化时，需对 `options` 及 `IPreviewOptions` 中的 `cdn`，`emojiPath`, `themes` 进行配置
* `highlightRender`，`mathRender`，`abcRender`，`chartRender`，`mermaidRender`，`SMILESRender`，`markmapRender`，`flowchartRender`，`mindmapRender`，`plantumlRender`，`graphvizRender`，`setCodeTheme`，`setContentTheme` 方法中需添加 cdn 参数
* 将 build 成功的 dist 目录或 [jsDelivr](https://www.jsdelivr.com/package/npm/vditor?path=dist) 中的 dist 目录拷贝至正确的位置

### 升级

版本升级时请**仔细阅读** [CHANGELOG](https://github.com/Vanessa219/vditor/blob/master/CHANGELOG.md) 中的**升级**部分

## Ⓜ️ Markdown 使用指南

* [基础语法](https://ld246.com/article/1583129520165)
* [扩展语法](https://ld246.com/article/1583305480675)
* [速查手册](https://ld246.com/article/1583308420519)

## 🏘️ 社区

* [官网](https://b3log.org/vditor)
* [讨论区](https://ld246.com/tag/vditor)
* [报告问题](https://github.com/Vanessa219/vditor/issues/new)

## 📄 授权

Vditor 使用 [MIT](https://opensource.org/licenses/MIT) 开源协议。

## 🙏 鸣谢

* [Lute](https://github.com/88250/lute)：🎼 一款结构化的 Markdown 引擎，支持 Go 和 JavaScript
* [highlight.js](https://github.com/highlightjs/highlight.js)：JavaScript syntax highlighter
* [mermaid](https://github.com/knsv/mermaid)：Generation of diagram and flowchart from text in a similar manner as Markdown
* [incubator-echarts](https://github.com/apache/incubator-echarts)：A powerful, interactive charting and visualization library for browser
* [abcjs](https://github.com/paulrosen/abcjs)：JavaScript library for rendering standard music notation in a browser

## 📽️ 历史

我们在开发 [Sym](https://github.com/88250/symphony) 的初期是直接使用 WYSIWYG 富文本编辑器的。那时候基于 HTML 的编辑器非常流行，项目中引用起来也很方便，也符合用户当时的使用习惯。

后来，Markdown 的崛起逐步改变了大家的排版方式。再加上我们其他几个项目都是面向程序员用户的，所以迁移到 md 上也是大势所趋。我们选择了 [CodeMirror](https://github.com/codemirror/CodeMirror)，这是一款优秀的编辑器，它对开发者提供了丰富的编程接口，对各种浏览器的兼容性也比较好。

再后来，随着我们项目业务需求方面的沉淀，使用 CodeMirror 有时候会感到比较“笨重”。比如要实现 @自动完成用户名列表、插入 Emoji、上传文件等就需要比较深入的二次开发，而这些业务需求恰恰是很多项目场景共有且必备的。

终于，我们决定开始在 Sym 中自己实现编辑器。随着几个版本的迭代，Sym 的编辑器也日趋成熟。在我们运营的社区[链滴](https://ld246.com)上陆续有人问我们是否能将编辑器单独抽离出来提供给大家使用。与此同时，我们的前端主程 [V](https://ld246.com/member/Vanessa) 同学对于维护分散在各个项目中的编辑器也感到有点力不从心，外加对 TypeScript 的好感，所以就决定使用 ts 来实现一个全新的浏览器端 md 编辑器。

于是，Vditor 就这样诞生了。
