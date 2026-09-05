let base64ToR2URL = true
let subscribed = false
let debug = true
let manualStatus = undefined
let autoStatus = undefined
let allowAutoShowOutline = true
var editor
let savedRange = null
let i18n = {
  'alignCenter': '居中',
  'alignLeft': '居左',
  'alignRight': '居右',
  'alternateText': '替代文本',
  'bold': '粗体',
  'both': '编辑 & 预览',
  'check': '任务列表',
  'close': '关闭',
  'code': '代码块',
  'code-theme': '代码块主题预览',
  'column': '列',
  'comment': '评论',
  'confirm': '确定',
  'content-theme': '内容主题预览',
  'copied': '已复制',
  'copy': '复制',
  'delete-column': '删除列',
  'delete-row': '删除行',
  'devtools': '开发者工具',
  'down': '下',
  'downloadTip': '该浏览器不支持下载功能',
  'edit': '编辑',
  'edit-mode': '切换编辑模式',
  'emoji': '表情',
  'export': '导出',
  'fileTypeError': '文件类型不允许上传，请压缩后再试',
  'footnoteRef': '脚注标识',
  'fullscreen': '全屏切换',
  'generate': '生成中',
  'headings': '标题',
  'heading1': '一级标题',
  'heading2': '二级标题',
  'heading3': '三级标题',
  'heading4': '四级标题',
  'heading5': '五级标题',
  'heading6': '六级标题',
  'help': '帮助',
  'imageURL': '图片地址',
  'imageSize': '图片尺寸',
  'imageMaxWidth': '图片最大宽度',
  'imageMaxHeight': '图片最大高度',
  'pageWidth': '页面宽度',
  'codeBlockHeight': '代码块高度',
  'editMode': '编辑模式',
  'fontSize': '字号',
  'fontSizeUI': '界面',
  'fontSizeEditor': '编辑器',
  'typography': '排版',
  'font': '字体',
  'lineHeight': '行高',
  'codeMirror': '代码编辑',
  'typewriterMode': '打字机模式',
  'boldColor': '加粗颜色',
  'indent': '列表缩进',
  'info': '关于',
  'inline-code': '行内代码',
  'insert-after': '末尾插入行',
  'insert-before': '起始插入行',
  'insertColumnLeft': '在左边插入一列',
  'insertColumnRight': '在右边插入一列',
  'insertRowAbove': '在上方插入一行',
  'insertRowBelow': '在下方插入一行',
  'instantRendering': '即时渲染',
  'italic': '斜体',
  'language': '语言',
  'line': '分隔线',
  'link': '链接',
  'linkRef': '引用标识',
  'list': '无序列表',
  'more': '更多',
  'nameEmpty': '文件名不能为空',
  'ordered-list': '有序列表',
  'outdent': '列表反向缩进',
  'outline': '大纲',
  'over': '超过',
  'performanceTip': '实时预览需 ${x}ms，可点击编辑 & 预览按钮进行关闭',
  'preview': '预览',
  'quote': '引用',
  'record': '开始录音/结束录音',
  'record-tip': '该设备不支持录音功能',
  'recording': '录音中...',
  'redo': '重做',
  'remove': '删除',
  'row': '行',
  'spin': '旋转',
  'splitView': '分屏预览',
  'strike': '删除线',
  'table': '表格',
  'textIsNotEmpty': '文本（不能为空）',
  'title': '标题',
  'tooltipText': '提示文本',
  'undo': '撤销',
  'up': '上',
  'update': '更新',
  'upload': '上传图片或文件',
  'uploadError': '上传错误',
  'uploading': '上传中...',
  'wysiwyg': '所见即所得',
}

        // 全局调试开关：window.vditorDebug = true 时才会打印日志
        const vdLog = (...args) => { if (window.vditorDebug) console.log(...args); };

        // ===== LatexEasy 弹窗控制器 =====
        // 状态：当前 Vditor 实例 + 当前 LatexEasy SDK 实例 + 打开模式
        const latexModalState = {
            vditor: null,        // 当前页面里唯一的 Vditor 实例
            editor: null,        // window.LatexEasy(iframe.contentWindow) 返回值
            seedLatex: "",       // 打开弹窗时预填的 LaTeX
            iframeReady: false,  // iframe 内 'latexeasy.ready' 是否触发过
            mode: "insert",      // "insert" = 工具栏按钮（写到光标）；"replace" = 点击现有公式（就地替换）
            targetMath: null,    // replace 模式下被点击的公式元素 {kind:'inline'|'block', el:HTMLElement}
        };
        window.vditorDebug =  true
        window.BG_COLORS = [
            "#ffffff", // red-200
            "#fed7aa", // orange-200
            "#fef08a", // yellow-200
            "#dcfce7", // green-200
            "#dbeafe", // blue-200
            "#fce7f3", // violet-200
            "#cbd5e1", // slate-300
            "#d6d3d1", // stone-300
        ];
        window.TEXT_COLORS = [
            "#ef4444", // red
            "#f97316", // orange
            "#ca8a04", // yellow
            "#10b981", // green
            "#3b82f6", // blue
            "#7c3aed", // purple
            "#475569", // slate
            "#000000", // black
        ];
        window.defaultValue = "# Hello Vditor\n\n这是一个 **Vditor** 示例页面。\n\n## 功能演示\n\n- **粗体** / *斜体* / ~~删除线~~\n- `行内代码`\n- [链接](https://github.com)\n\n```javascript\nconsole.log('Hello World');\n```\n\n> 引用内容\n\n| 列1 | 列2 | 列3 |\n|-----|-----|-----|\n| A   | B   | C   |\n\n## HTML 代码块\n\n行内 HTML（直接渲染）：这是一段 <span style=\"color: #dc2626;\">红色文字</span>，\n紧接 <span style=\"background-color: #fed7aa;\">橙色背景</span>，\n双击即可进入 html-inline 编辑。\n\n个人资料卡片（带统计）：\n\n```html\n<style>\n  body { margin: 0; font-family: system-ui, sans-serif; background: #f5f7fa; padding: 24px; }\n  .card { background: #fff; border-radius: 12px; padding: 24px; box-shadow: 0 4px 16px rgba(0,0,0,.08); max-width: 360px; }\n  .avatar { width: 64px; height: 64px; border-radius: 50%; background: linear-gradient(135deg, #667eea, #764ba2); display: inline-flex; align-items: center; justify-content: center; color: #fff; font-size: 24px; font-weight: bold; }\n  h2 { margin: 16px 0 4px; color: #1a202c; font-size: 18px; }\n  .role { color: #718096; font-size: 14px; }\n  .badge { display: inline-block; padding: 4px 10px; background: #c6f6d5; color: #22543d; border-radius: 12px; font-size: 12px; font-weight: 500; margin-top: 12px; }\n  .stats { display: flex; gap: 16px; margin-top: 16px; padding-top: 16px; border-top: 1px solid #e2e8f0; }\n  .stat { flex: 1; text-align: center; }\n  .stat-value { font-size: 20px; font-weight: 600; color: #2d3748; }\n  .stat-label { font-size: 12px; color: #a0aec0; text-transform: uppercase; letter-spacing: .5px; margin-top: 2px; }\n</style>\n<div class=\"card\">\n  <div class=\"avatar\">FL</div>\n  <h2>Feliks Lin</h2>\n  <div class=\"role\">前端工程师</div>\n  <span class=\"badge\">✓ 已认证</span>\n  <div class=\"stats\">\n    <div class=\"stat\"><div class=\"stat-value\">128</div><div class=\"stat-label\">文章</div></div>\n    <div class=\"stat\"><div class=\"stat-value\">2.4k</div><div class=\"stat-label\">关注者</div></div>\n    <div class=\"stat\"><div class=\"stat-value\">86</div><div class=\"stat-label\">获赞</div></div>\n  </div>\n</div>\n```\n\n价格卡片（三档对比，中间突出）：\n\n```html\n<style>\n  body { margin: 0; font-family: system-ui, sans-serif; background: #f5f7fa; padding: 24px; }\n  .pricing { display: flex; gap: 16px; align-items: stretch; }\n  .plan { background: #fff; border-radius: 12px; padding: 24px; flex: 1; box-shadow: 0 2px 8px rgba(0,0,0,.06); transition: transform .2s; }\n  .plan.featured { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #fff; transform: scale(1.05); box-shadow: 0 8px 24px rgba(102,126,234,.35); }\n  .plan-name { font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; opacity: .7; }\n  .price { font-size: 36px; font-weight: 700; margin: 8px 0 4px; color: inherit; }\n  .price small { font-size: 14px; opacity: .7; font-weight: 400; }\n  ul { list-style: none; padding: 0; margin: 16px 0 20px; }\n  li { padding: 6px 0; font-size: 14px; }\n  li::before { content: \"✓ \"; margin-right: 6px; font-weight: bold; }\n  button { width: 100%; padding: 10px; border: none; border-radius: 6px; background: #2d3748; color: #fff; font-weight: 600; cursor: pointer; font-size: 14px; }\n  .plan.featured button { background: #fff; color: #667eea; }\n  button:hover { opacity: .9; }\n</style>\n<div class=\"pricing\">\n  <div class=\"plan\">\n    <div class=\"plan-name\">基础版</div>\n    <div class=\"price\">¥29<small>/月</small></div>\n    <ul><li>5 个项目</li><li>10GB 存储</li><li>邮件支持</li></ul>\n    <button>选择</button>\n  </div>\n  <div class=\"plan featured\">\n    <div class=\"plan-name\">★ 推荐</div>\n    <div class=\"price\">¥99<small>/月</small></div>\n    <ul><li>无限项目</li><li>100GB 存储</li><li>24/7 优先支持</li><li>高级分析</li></ul>\n    <button>立即升级</button>\n  </div>\n  <div class=\"plan\">\n    <div class=\"plan-name\">企业版</div>\n    <div class=\"price\">¥299<small>/月</small></div>\n    <ul><li>所有功能</li><li>SSO 集成</li><li>专属客户经理</li><li>SLA 99.99%</li></ul>\n    <button>联系销售</button>\n  </div>\n</div>\n```\n\n消息通知（4 种状态，左边色条 + 圆形 icon）：\n\n```html\n<style>\n  body { margin: 0; font-family: system-ui, sans-serif; background: #f5f7fa; padding: 24px; max-width: 480px; }\n  .toast { background: #fff; border-radius: 8px; padding: 14px 18px; margin-bottom: 10px; box-shadow: 0 2px 12px rgba(0,0,0,.08); display: flex; align-items: center; gap: 12px; border-left: 4px solid; }\n  .toast.info    { border-color: #3182ce; }\n  .toast.success { border-color: #38a169; }\n  .toast.warning { border-color: #dd6b20; }\n  .toast.error   { border-color: #e53e3e; }\n  .icon { width: 30px; height: 30px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; color: #fff; flex-shrink: 0; font-weight: bold; font-size: 14px; }\n  .info .icon    { background: #3182ce; }\n  .success .icon { background: #38a169; }\n  .warning .icon { background: #dd6b20; }\n  .error .icon   { background: #e53e3e; }\n  .content { flex: 1; min-width: 0; }\n  .title { font-weight: 600; color: #1a202c; font-size: 14px; }\n  .desc  { color: #718096; font-size: 13px; margin-top: 2px; }\n  .close { color: #a0aec0; cursor: pointer; font-size: 20px; line-height: 1; padding: 0 4px; }\n</style>\n<div class=\"toast info\">\n  <div class=\"icon\">i</div>\n  <div class=\"content\"><div class=\"title\">新版本已发布</div><div class=\"desc\">Vditor 4.2 增加了多项新功能</div></div>\n  <div class=\"close\">×</div>\n</div>\n<div class=\"toast success\">\n  <div class=\"icon\">✓</div>\n  <div class=\"content\"><div class=\"title\">保存成功</div><div class=\"desc\">文档已自动保存到云端</div></div>\n  <div class=\"close\">×</div>\n</div>\n<div class=\"toast warning\">\n  <div class=\"icon\">!</div>\n  <div class=\"content\"><div class=\"title\">未保存的更改</div><div class=\"desc\">关闭窗口前请先保存你的编辑</div></div>\n  <div class=\"close\">×</div>\n</div>\n<div class=\"toast error\">\n  <div class=\"icon\">✕</div>\n  <div class=\"content\"><div class=\"title\">网络连接失败</div><div class=\"desc\">请检查网络后重试</div></div>\n  <div class=\"close\">×</div>\n</div>\n```\n\n## 数学公式 (MathJax)\n\n行内公式示例：欧拉恒等式 $e^{i\\pi} + 1 = 0$ 是数学里最优雅的等式之一；\n勾股定理 $a^2 + b^2 = c^2$ 描述直角三角形三边关系；\n正态分布概率密度 $f(x) = \\frac{1}{\\sqrt{2\\pi}\\sigma} e^{-\\frac{(x-\\mu)^2}{2\\sigma^2}}$ 在统计学里无处不在。\n\n行间公式示例（前两个为双美元形式，其余为代码块形式）：\n\n$$\n\\int_{-\\infty}^{\\infty} e^{-x^2} \\, dx = \\sqrt{\\pi}\n$$\n\n$$\n\\sum_{n=1}^{\\infty} \\frac{1}{n^2} = \\frac{\\pi^2}{6}\n$$\n\n```math\n\\begin{pmatrix}\na & b \\\\\nc & d\n\\end{pmatrix}\n\\begin{pmatrix}\nx \\\\\ny\n\\end{pmatrix}\n=\n\\begin{pmatrix}\nax + by \\\\\ncx + dy\n\\end{pmatrix}\n```\n\n```math\n\\nabla \\times \\vec{\\mathbf{B}} - \\frac{1}{c} \\frac{\\partial \\vec{\\mathbf{E}}}{\\partial t} = \\frac{4\\pi}{c} \\vec{\\mathbf{j}}\n```\n\n复杂嵌套：\n\n行内混合测试 — $E = mc^2$ 与 $\\sqrt[3]{x^2 + y^2}$ 紧邻，\n外加希腊字母 $\\alpha, \\beta, \\gamma, \\delta, \\theta, \\lambda, \\mu, \\pi, \\omega$，\n以及运算符 $\\sum, \\prod, \\int, \\partial, \\nabla, \\pm, \\times, \\div, \\neq, \\approx, \\equiv, \\Rightarrow, \\Leftrightarrow$。\n\n```math\n\\frac{\\partial}{\\partial t} \\left( \\rho \\vec{v} \\right) + \\nabla \\cdot \\left( \\rho \\vec{v} \\otimes \\vec{v} \\right) = -\\nabla p + \\mu \\nabla^2 \\vec{v} + \\rho \\vec{g}\n```\n\n化学方程式（mhchem 扩展）：\n\n行内 $\\ce{H2O}$ 与 $\\ce{CO2 + H2O -> H2CO3}$。\n\n```math\n\\ce{Zn^2+ + 2OH- ->[\\Delta] ZnO + H2O}\n```\n";
        // window.defaultValue = "这是一个 **Vditor** <span style=\"background-color: rgb(254, 215, 170);\">示例<span style=\"color: rgb(220, 38, 38);\">页面</span></span>";
window.BLOCK_MENU_ITEMS = [
    { action: "copy", label: "复制为 Markdown", icon: "clippy" },
    { action: "duplicate", label: "克隆块", icon: "copy" },
    { action: "delete", label: "删除块", icon: "trash" },
    { type: "divider" },
    { action: "insert-before", label: "在前插入", icon: "arrow-up" },
    { action: "insert-after", label: "在后插入", icon: "arrow-down" },
];


        function openLatexModal(vditor, seed, options) {
            options = options || {};
            latexModalState.vditor = vditor;
            latexModalState.seedLatex = (seed || "").trim();
            latexModalState.iframeReady = false;
            latexModalState.mode = options.mode || "insert";
            latexModalState.targetMath = options.targetMath || null;
            applyModalModeUI();
            // iframe 已存在 → 重置它的 src，触发重新加载，避免打开第二次后状态残留
            const iframe = document.getElementById("latexModalIframe");
            const mask = document.getElementById("latexModal");
            mask.classList.add("latex-modal-mask--open");
            // 用 about:blank 中转再切回原 URL，强制刷新 iframe 内容
            iframe.src = "about:blank";
            setTimeout(() => {
                iframe.src = "./latexEditor/latexEditor.html";
            }, 0);
        }
        window.openLatexModal = openLatexModal;

        function closeLatexModal() {
            document.getElementById("latexModal").classList.remove("latex-modal-mask--open");
            latexModalState.editor = null;
            latexModalState.iframeReady = false;
            latexModalState.targetMath = null;
        }

        // 根据 mode 切换底部按钮的显隐 / 标题 / 提示文案
        function applyModalModeUI() {
            const inlineBtn = document.getElementById("latexModalInsertInline");
            const codeBtn = document.getElementById("latexModalInsertCode");
            const saveBtn = document.getElementById("latexModalSave");
            const hint = document.getElementById("latexModalHint");
            const modeHint = document.getElementById("latexModalModeHint");
            const headerTitle = document.querySelector(".latex-modal__header > span:first-child");
            if (latexModalState.mode === "replace") {
                inlineBtn.style.display = "none";
                codeBtn.style.display = "none";
                saveBtn.style.display = "";
                const kind = latexModalState.targetMath && latexModalState.targetMath.kind;
                headerTitle.textContent = kind === "block"
                    ? "编辑行间公式（LatexEasy）"
                    : "编辑行内公式（LatexEasy）";
                hint.textContent = "编辑完成后点击「保存」覆盖原公式";
                modeHint.textContent = kind === "block" ? "修改的是行间公式" : "修改的是行内公式";
                modeHint.style.display = "";
            } else {
                inlineBtn.style.display = "";
                codeBtn.style.display = "";
                saveBtn.style.display = "none";
                headerTitle.textContent = "公式编辑器（LatexEasy）";
                hint.textContent = "编辑完成后选择插入方式";
                modeHint.textContent = "";
                modeHint.style.display = "none";
            }
        }

        // 把 LaTeX 通过 Vditor 公开 API 写回。
        function insertLatexIntoVditor(latex, wrapKind) {
            vdLog("[latex-modal] insertLatexIntoVditor called, wrapKind=", wrapKind);
            const vditorPublic = latexModalState.vditor;
            const vditorInternal = vditorPublic && vditorPublic.vditor;
            if (!vditorPublic || !vditorInternal) {
                console.warn("[latex-modal] insertLatexIntoVditor: vditor 不可用");
                return;
            }
            const trimmed = (latex || "").trim();
            if (!trimmed) {
                vditorPublic.tip("公式为空", 1500);
                return;
            }
            const wrapped = wrapKind === "block"
                ? "\n$$\n" + trimmed + "\n$$\n"
                : "$" + trimmed + "$";
            vdLog("[latex-modal] wrapped =", JSON.stringify(wrapped));
            const editorEl = vditorInternal[vditorInternal.currentMode].element;
            vditorPublic.insertMarkdown(wrapped);
            vditorPublic.focus();
            // 等 DOM 落地后找**未被渲染**的 .language-math 节点（没有 <mjx-container> 子节点的）。
            // 不能用 slice(beforeCount) —— querySelectorAll 是 document order，光标位置插入新节点
            // 会让已有节点索引后移，slice 拿到的是已有节点不是新节点。
            requestAnimationFrame(() => {
                const allMath = editorEl.querySelectorAll(".language-math");
                // 找出还没被 MathJax 渲染的节点（不含 mjx-container 子元素）
                const unrendered = Array.from(allMath).filter((el) => !el.querySelector("mjx-container"));
                vdLog("[latex-modal] after insert, .language-math count =", allMath.length,
                    "unrendered =", unrendered.length);
                if (unrendered.length === 0) {
                    console.warn("[latex-modal] 没找到未渲染的 math 节点");
                    return;
                }
                // 用打包后的 UMD 暴露的静态方法 window.Vditor.mathRender，
                // 避免 import("/src/...") 这种只在 Vite dev 时才能解析的路径。
                const { mathRender } = window.Vditor;
                vdLog("[latex-modal] window.Vditor.mathRender 已就绪, 对", unrendered.length, "个未渲染节点渲染");
                for (const node of unrendered) {
                    node.removeAttribute("data-math");
                    vdLog("[latex-modal] 渲染节点 textContent=", JSON.stringify(node.textContent.slice(0, 80)),
                        "tag=", node.tagName, "data-type=", node.getAttribute("data-type"));
                    mathRender(node, {
                        cdn: vditorInternal.options.cdn,
                        math: vditorInternal.options.preview.math,
                    });
                }
            });
        }

        // replace 模式：把新 LaTeX 回写到原公式位置，然后重渲染 SVG。
        // Vditor 行内公式源是 [data-type="math-inline"] > code[data-type="math-inline"]，
        // 行间公式源是 .language-math > pre > code.language-math（编辑器模式下可能被
        // CodeMirror 接管，但 preview 模式下就是直接 <pre><code>）。
        function replaceLatexInVditor(latex) {
            const target = latexModalState.targetMath;
            const vditorPublic = latexModalState.vditor;
            // options 在内部 IVditor 上（vditorPublic.vditor.options），
            // 公开包装类上没 options 字段——这就是之前报
            // "Cannot read properties of undefined (reading 'cdn')" 的根因。
            const vditorInternal = vditorPublic && vditorPublic.vditor;
            if (!target || !vditorPublic || !vditorInternal) return;
            const trimmed = (latex || "").trim();
            if (!trimmed) {
                vditorPublic.tip("公式为空", 1500);
                return;
            }
            try {
                if (target.kind === "inline") {
                    const codeEl = target.el.querySelector("code[data-type='math-inline']");
                    if (!codeEl) throw new Error("找不到行内公式源 <code>");
                    // 行内公式源约定：开头塞一个 ZWSP（避免 CodeMirror 把整段当成空文档），
                    // 真正给 LatexEasy 的 LaTeX 不能带 ZWSP，否则 MathJax 会拒绝。
                    codeEl.textContent = "​" + trimmed;
                    // 预览元素（.language-math）里还是旧公式文本且带旧 data-math 标记，
                    // 必须同步文本并清标记，否则 mathRender 会跳过它（或渲染旧文本）。
                    const previewMathEl = target.el.querySelector(
                        ".vditor-wysiwyg__preview .language-math, .vditor-ir__preview .language-math");
                    if (previewMathEl) {
                        previewMathEl.removeAttribute("data-math");
                        previewMathEl.textContent = trimmed;
                    }
                    // 触发渲染：mathRender(容器) 会重新挑出 .language-math 节点渲染。
                    const mathEl = codeEl.parentElement;  // [data-type="math-inline"]
                    // 走打包后的 window.Vditor.mathRender（同 insert 模式注释）
                    const { mathRender } = window.Vditor;
                    mathRender(mathEl, {
                        cdn: vditorInternal.options.cdn,
                        math: vditorInternal.options.preview.math,
                    });
                } else if (target.kind === "block") {
                    // 行间公式源：
                    //   - ```math 代码块形式：<pre><code class="language-math">
                    //   - $$...$$ 双美元形式：<div data-type="math-block"> 本身
                    // target.codeEl 由 findMathAtTarget 设好，要么是嵌套 <code>，要么是 blockEl 本身。
                    const codeEl = target.codeEl || target.el;
                    codeEl.textContent = trimmed;
                    // 清掉 data-math 让 mathRender 重新渲染
                    codeEl.removeAttribute("data-math");
                    // ```math 形式：源 <code>（pre.vditor-wysiwyg__pre 里）更新了，
                    // 但渲染元素（pre.vditor-wysiwyg__preview 里的 code.language-math）
                    // 还带着旧 data-math 标记会被 mathRender 跳过，必须同步文本并清标记；
                    // $$...$$ 形式预览元素就是 target.el 本身（已更新），这里幂等、安全。
                    const previewMathEl = target.el.querySelector(
                        ".vditor-wysiwyg__preview .language-math, .vditor-ir__preview .language-math");
                    if (previewMathEl) {
                        previewMathEl.removeAttribute("data-math");
                        previewMathEl.textContent = trimmed;
                    }
                    // 走打包后的 window.Vditor.mathRender（同 insert 模式注释）
                    const { mathRender } = window.Vditor;
                    mathRender(target.el, {
                        cdn: vditorInternal.options.cdn,
                        math: vditorInternal.options.preview.math,
                    });
                }
                vditorPublic.tip("已保存", 1200);
            } catch (e) {
                console.error("replaceLatexInVditor failed:", e);
                vditorPublic.tip("保存失败：" + e.message, 2000);
            }
        }

        // 弹窗底部按钮 → 读回 LaTeX → 按 mode 分发
        function bindLatexModalButtons() {
            document.getElementById("latexModalCancel").addEventListener("click", closeLatexModal);
            document.getElementById("latexModalInsertInline").addEventListener("click", () => {
                if (!latexModalState.editor) { closeLatexModal(); return; }
                latexModalState.editor.call("get.latex", {}, (data) => {
                    insertLatexIntoVditor(data && data.latex, "inline");
                    closeLatexModal();
                });
            });
            document.getElementById("latexModalInsertCode").addEventListener("click", () => {
                if (!latexModalState.editor) { closeLatexModal(); return; }
                latexModalState.editor.call("get.latex", {}, (data) => {
                    insertLatexIntoVditor(data && data.latex, "block");
                    closeLatexModal();
                });
            });
            document.getElementById("latexModalSave").addEventListener("click", () => {
                if (!latexModalState.editor) { closeLatexModal(); return; }
                latexModalState.editor.call("get.latex", {}, (data) => {
                    replaceLatexInVditor(data && data.latex);
                    closeLatexModal();
                });
            });
            // ESC 关闭
            document.addEventListener("keydown", (e) => {
                if (e.key === "Escape" &&
                    document.getElementById("latexModal").classList.contains("latex-modal-mask--open")) {
                    closeLatexModal();
                }
            });
            // 点遮罩关闭（但点弹窗本体不关）
            document.getElementById("latexModal").addEventListener("click", (e) => {
                if (e.target.id === "latexModal") closeLatexModal();
            });
        }

        // ===== 点击公式 → 打开编辑器（replace 模式）=====
        // inline: target = [data-type="math-inline"] (里面是 <code> 源 + <mjx-container> SVG)
        // block:  target = .language-math（里面是 <pre><code> 源 + <mjx-container> SVG）
        function findMathAtTarget(target) {
            vdLog("[latex-modal] findMathAtTarget, target:", target, "tag:", target && target.tagName);
            if (!(target instanceof Element)) return null;
            // 行内：最近带 data-type="math-inline" 的祖先（自身也算）
            const inlineEl = target.closest("[data-type='math-inline']");
            if (inlineEl) {
                const codeEl = inlineEl.querySelector("code[data-type='math-inline']");
                if (codeEl) {
                    // 行内公式源约定前缀一个 ZWSP（见 inlineMathCodeMirror.ts syncCodeFromView）
                    const latex = (codeEl.textContent || "").replace(/^​/, "");
                    return { kind: "inline", el: inlineEl, codeEl, latex };
                }
            }
            // 行间：最近 .language-math 祖先
            let blockEl = target.closest(".language-math");
            if (!blockEl) {
                // 点击落在公式块的预览容器空白处（公式上下边缘的 margin/padding，仍属
                // pre.vditor-wysiwyg__preview 但不在 .language-math 元素内）时 closest 落空，
                // 事件会漏给 Vditor 自带点击处理，触发内置 CodeMirror 编辑器。
                // 从预览容器兜底取其中的 .language-math；非数学块（代码/mermaid 等）的
                // 预览里没有 .language-math，查询为 null，仍走原有行为。
                const previewEl = target.closest(".vditor-wysiwyg__preview, .vditor-ir__preview");
                if (previewEl) {
                    blockEl = previewEl.querySelector(".language-math");
                }
            }
            vdLog("[latex-modal] inline match?", !!inlineEl, "block match?", !!blockEl, "target:", target.outerHTML ? target.outerHTML.slice(0, 120) : target);
            if (blockEl) {
                vdLog("[latex-modal] blockEl outerHTML (前 400):", blockEl.outerHTML.slice(0, 400));
                // Vditor 行间公式 DOM 结构（从日志 outerHTML 反推）：
                //   <div data-type="code-block" data-marker="```">
                //     <pre class="vditor-wysiwyg__pre">         ← 编辑态（CodeMirror 接管时）
                //       <code class="language-math" style="display:none">公式源</code>
                //       <div class="cm-editor">...</div>
                //     </pre>
                //     <pre class="vditor-wysiwyg__preview" data-render="1">
                //       <code class="language-math" data-math="...">   ← 渲染容器（命中）
                //         <mjx-container><svg>...</svg></mjx-container>
                //       </code>
                //     </pre>
                //   </div>
                // 命中的是渲染 <code> 本身（不是 pre>code 的容器），要爬到祖先
                // [data-type="code-block"] / [data-type="math-block"] 找兄弟源 <code>。
                // 注意：渲染元素自身也带 data-type="math-block"（如 <div data-type="math-block"
                // class="language-math">），closest 会先命中自己导致 blockContainer === blockEl，
                // 后续"找兄弟源 <code>"的分支不会执行。必须从父级往上找真正的 wrapper 容器。
                const blockContainer = (blockEl.parentElement
                    ? blockEl.parentElement.closest("[data-type='code-block'], [data-type='math-block']")
                    : null) || blockEl;
                vdLog("[latex-modal] blockContainer tag:", blockContainer.tagName, "data-type:", blockContainer.getAttribute("data-type"), "data-marker:", blockContainer.getAttribute("data-marker"));
                // 把容器里所有 code.language-math 都列出来，看到底有几个、谁是源谁是渲染
                const allCodes = blockContainer.querySelectorAll("code.language-math");
                vdLog("[latex-modal] found", allCodes.length, "code.language-math in container");
                allCodes.forEach((c, i) => {
                    vdLog(`  [${i}] data-math=${c.getAttribute("data-math") ? "yes" : "no"} display=${getComputedStyle(c).display} text=${JSON.stringify(c.textContent.slice(0, 100))}`);
                });
                let sourceCode = null;
                if (blockContainer !== blockEl) {
                    // ```math 形式：源在 pre.vditor-wysiwyg__pre > code.language-math（无 data-math）；
                    // $$ 双美元形式：源是 <code data-type="math-block">（没有 language-math 类，
                    // 藏在 display:none 的源 <pre> 里）——只查 code.language-math 会落空，
                    // 兜底会退到渲染元素（MathJax SVG），拿到的是 ∫−∞∞ 这类 Unicode 文本而非 LaTeX。
                    sourceCode = blockContainer.querySelector(
                        "pre.vditor-wysiwyg__pre code.language-math:not([data-math]), code[data-type='math-block']"
                    ) || blockContainer.querySelector("code.language-math:not([data-math])");
                }
                // 退化：找不到兄弟源 <code>，用命中的渲染 <code> 的 textContent
                if (!sourceCode) {
                    sourceCode = blockEl;
                }
                vdLog("[latex-modal] matched block math, sourceCode outerHTML:", sourceCode.outerHTML.slice(0, 400));
                vdLog("[latex-modal] sourceCode.textContent:", JSON.stringify(sourceCode.textContent));
                // LatexEasy 的 LaTeX 解析器对换行敏感——
                // `\begin{pmatrix}\n a & b \\` 这种多行写法会被吃掉 `\begin` 命令导致渲染失败。
                // 折叠成单行：去掉真换行 + 多余空白，但保留 `\\` (LaTeX 行分隔)。
                const normalizeLatex = (s) => s
                    .replace(/\r\n/g, "\n")
                    .replace(/\n/g, " ")
                    .replace(/[ \t]+/g, " ")
                    .trim();
                const normalizedLatex = normalizeLatex(sourceCode.textContent || "");
                return { kind: "block", el: blockContainer, codeEl: sourceCode, latex: normalizedLatex };
            }
            vdLog("[latex-modal] no math container found");
            return null;
        }

        function bindMathClickToOpenEditor() {
            const vditor = window.vditor;
            vdLog("[latex-modal] bindMathClickToOpenEditor, vditor:", !!vditor, "wysiwyg:", !!(vditor && vditor.vditor && vditor.vditor.wysiwyg));
            if (!vditor || !vditor.vditor || !vditor.vditor.wysiwyg) {
                console.warn("[latex-modal] vditor 或 wysiwyg 不可用，退出绑定");
                return;
            }
            const editorEl = vditor.vditor.wysiwyg.element;
            vdLog("[latex-modal] editorEl:", editorEl, "tag:", editorEl && editorEl.tagName);
            if (!editorEl) return;
            editorEl.addEventListener("click", (e) => {
                vdLog("[latex-modal] click captured, target:", e.target, "tag:", e.target && e.target.tagName);
                const target = e.target;
                const math = findMathAtTarget(target);
                if (!math) return;
                vdLog("[latex-modal] opening modal in replace mode, kind=", math.kind, "latex=", JSON.stringify(math.latex));
                // 单击行内/行间公式 → 阻止默认光标定位，弹窗编辑
                e.preventDefault();
                e.stopPropagation();
                openLatexModal(vditor, math.latex, { mode: "replace", targetMath: math });
            }, true);  // capture 阶段，避免 Vditor 内部 listener 抢先
        }

        // iframe 加载完成 → 建立 SDK 通道，监听 'ready' 事件
        function setupLatexSdkOnIframeLoad() {
            const iframe = document.getElementById("latexModalIframe");
            iframe.addEventListener("load", () => {
                // 同一 iframe 反复 load 时，先把旧 listener 解绑不现实（SDK 用闭包
                // 存 _callWait）。每次重新 new LatexEasy 实例即可拿到干净状态。
                if (!iframe.contentWindow) return;
                try {
                    const editor = new window.LatexEasy(iframe);  // iframe 模式
                    latexModalState.editor = editor;
                    // Kity 渲染器对以下 LaTeX 结构支持不全（render.check 会失败、自动切 code 也不稳），
                    // 一旦命中就走 code 模式（Ace Editor + MathJax）兜底。
                    const isComplexLatex = (latex) => {
                        if (!latex) return false;
                        return /\\(begin|end)\{/.test(latex)       // \begin{pmatrix} 等环境
                            || /\\\\/.test(latex)                   // 矩阵换行 \\（与 \\{ \\} 等转义有重叠，但公式场景下基本就是 \\）
                            || /\\(matrix|array|cases|aligned|pmatrix|bmatrix|vmatrix)\b/.test(latex)
                            || /\n/.test(latex);                    // 多行
                    };

                    editor.on("ready", () => {
                        latexModalState.iframeReady = true;
                        // replace 模式：只有复杂公式才强制切 code；简单公式保留 live（Kity 可视化编辑）
                        if (latexModalState.mode === "replace" && isComplexLatex(latexModalState.seedLatex)) {
                            try {
                                const kfe = iframe.contentWindow && iframe.contentWindow.kfe;
                                if (kfe && typeof kfe.requestService === "function") {
                                    vdLog("[latex-modal] complex formula → switch to code mode");
                                    kfe.requestService("ui.mode.switch", "code", () => {
                                        if (latexModalState.seedLatex) {
                                            editor.call("set.latex", { latex: latexModalState.seedLatex });
                                        }
                                    });
                                    return;
                                }
                            } catch (e) {
                                console.warn("[latex-modal] switch to code mode failed:", e);
                            }
                        }
                        if (latexModalState.seedLatex) {
                            editor.call("set.latex", { latex: latexModalState.seedLatex });
                        }
                    });
                    editor.init();
                } catch (err) {
                    console.error("LatexEasy SDK init failed:", err);
                    document.getElementById("latexModalHint").textContent =
                        "LatexEasy 初始化失败（请查看控制台）";
                }
            });
        }
        function initVditor() {
          try {
            console.log("initVditor");
            var vditor = new Vditor("vditor", {
                height: "100%",
                outline: { enable: true },
                cache: { enable: false },
                mode:"wysiwyg",
                preview: {
                  math: {
                    engine: "MathJax",
                    inlineDigit: true,
                    macros: {},
                    mathJaxOptions: {
                      tex: {
                        inlineMath: [ ["$", "$"], ["\\(", "\\)"] ],
                      },
                    },
                  },
                  markdown: {
                    mark: true,
                    // sup/sub 当前 preview API 未暴露，会被忽略
                  },
                },
                esc:(text)=>{
                    window.location.href = "editorexit://content=123"
                },
                onSettingsChange: (cur) => {
                  let config = JSON.parse(JSON.stringify(cur));
                  console.log("onSettingsChange", config);
                },
                i18n:i18n,
                tab:"\t",
                upload:{
                  handler:async (files)=>{
                    vditor.tip("Inserting image...")
                    let file = files[0]
                    var fileData = await fileToBase64(file)
                    let base64ToR2URL = true
                    if (base64ToR2URL) {
                      window.location.href = "editorimage://content="+encodeURIComponent(fileData)
                    }else{
                      vditor.insertValue(`![image](${fileData})`)
                    }
                    return null
                  },
                  error:(error)=>{
                    console.log(error)
                  }
                },
                enableContextMenu:false,
                toolbarConfig:{hide:!window.editorToolbar,pin:window.editorToolbar},
                placeholder: `Input here`,
                toolbar: [
                      'undo',
                      'redo',
                      'headings',
                      'check',
                      'list',
                      'ordered-list',
                      'bold',
                      'italic',
                      'strike',
                      'code',
                      'inline-code',
                      'link',
                      'table',
                      'quote',
                      'insert-after',
                      'insert-before',
                      'outdent',
                      'indent',
                    {
                        name: "latex-editor",
                        // Σ 公式图标 —— 直接用 SVG <text> 渲染 Unicode ∑ 字符
                        // 之前自己画 path 闭合多边形在中间自我交叉，按 nonzero fill
                        // 规则渲染出沙漏。改用 text 元素，字体的 Σ 字形自带均匀粗细。
                        icon: '<svg viewBox="0 0 24 24"><text x="12" y="17.5" text-anchor="middle" font-size="16" font-weight="700" font-family="Cambria, Georgia, serif" fill="currentColor" style="fill:currentColor">∑</text></svg>',
                        tip: "插入公式 (LatexEasy)",
                        click: () => {
                            // 工具栏 click 拿到的是内部 IVditor，没有 getSelection / insertValue；
                            // 公开 API 在我们挂到 window.vditor 上的 Vditor 包装类上。
                            const vd = window.vditor;
                            if (!vd) return;
                            const seed = (vd.getSelection() || "").trim();
                            openLatexModal(vd, seed);
                        },
                    },
                    {
                      hotkey: '⌘S',
                      name: 'save',
                      tipPosition: 's',
                      tip: '保存',
                      className: 'save',
                      icon: '',
                      click () {window.location.href = "nativeCommand://save"},
                    },
                    '|',
                    'settings',
                ],
                value: defaultValue,
                // 编辑器异步渲染完成后 vditor.vditor.wysiwyg.element 才挂载——必须在这时
                // 才能绑 click 监听，否则拿到的 editorEl 为 undefined。
                after() {
                    vdLog("[latex-modal] Vditor after() fired, binding math click now");
                    bindMathClickToOpenEditor();
                    const editorDOM = document.getElementById('vditor');

                    // dragover 必须 preventDefault，否则浏览器根本不派发 drop 事件
                    editorDOM.addEventListener('dragover', (event) => {
                      event.preventDefault();
                    }, true);

                    // capture 阶段拦截 + preventDefault + stopPropagation，
                    // 解决 Vditor 内层 stopPropagation 截断事件、以及浏览器默认插入文本的问题
                    editorDOM.addEventListener('drop', async (event) => {
                      console.log("drop", event);
                      const data = event.dataTransfer;
                      if (data && data.types.includes('text/plain')) {
                        const text = data.getData('text/plain');
                        let content = vditor.getValue();
                        sendDropNotification({type: "text", text: text, content: content});
                        // 无论是否走我们的逻辑，都阻止默认插入和冒泡，
                        // 防止 Vditor 内部继续处理并把文本塞进编辑器
                        event.preventDefault();
                        event.stopPropagation();
                        event.stopImmediatePropagation();
                      }
                    }, true);
                },
                ctrlEnter: ()=>{window.location.href = "nativeCopy://test" ;},
                image:{isPreview:false,preview:(element)=>{window.location.href = element.src}},
                hint: {
                  delay:20,
                  extend: [
                    {
                      key: '/',
                      hint: (key) => {
                        let items = []
                        if ('heading1h1'.indexOf(key.toLocaleLowerCase()) > -1) {
                          items = items.concat({
                              value: '#',
                              html: 'h1',
                            })
                        }
                        if ('heading2h2'.indexOf(key.toLocaleLowerCase()) > -1) {
                          items = items.concat({
                              value: '##',
                              html: 'h2',
                            })
                        }
                        if ('heading3h3'.indexOf(key.toLocaleLowerCase()) > -1) {
                          items = items.concat({
                              value: '###',
                              html: 'h3',
                            })
                        }
                        if ('heading4h4'.indexOf(key.toLocaleLowerCase()) > -1) {
                          items = items.concat({
                              value: '####',
                              html: 'h4',
                            })
                        }
                        if ('list'.indexOf(key.toLocaleLowerCase()) > -1) {
                          items = items.concat([{
                              value: '*',
                              html: 'Bullet list',
                            },{
                              value: '1.',
                              html: 'Ordered list',
                            }])
                        }
                        if ('table'.indexOf(key.toLocaleLowerCase()) > -1) {
                          items = items.concat([{
                              value:`|col1|col2|
| - | - |
|   |   |`,html:"2x2"
                  },{
                    value:`|col1|col2|col3|
| - | - | - |
|   |   |   |
|   |   |   |`,html:"3x3"
                  
                  },{
                    value:`|col1|col2|col3|col4|
| - | - | - | - |
|   |   |   |   |
|   |   |   |   |
|   |   |   |   |`,html:"4x4"
                  
                  },{
                    value:`|col1|col2|col3|col4|col5|
| - | - | - | - | - |
|   |   |   |   |   |
|   |   |   |   |   |
|   |   |   |   |   |
|   |   |   |   |   |`,html:"5x5"
                  
                        }])
                    }
                      return items
                    },
                    }
                  ],
                },
                customWysiwygToolbar:()=>{},
                cdn:window.cdn,

            });
            // 挂到全局，方便在控制台调试：window.vditor.getValue() / window.vditor.getHTML()
            window.vditor = vditor;
            console.log("vditor init done", vditor);
            vditor.setViewerSettingsSyncEnabled(true);

            bindLatexModalButtons();
            setupLatexSdkOnIframeLoad();

            // 弹窗跟随编辑器深浅色：vditor--dark 类在 → 弹窗也切深色
            const modalThemeObserver = new MutationObserver(() => {
                document.getElementById("latexModal").classList.toggle(
                    "latex-modal-mask--dark",
                    document.getElementById("vditor").classList.contains("vditor--dark"));
            });
            modalThemeObserver.observe(document.getElementById("vditor"), { attributes: true, attributeFilter: ["class"] });
          } catch(e) {
            console.error("Vditor init error:", e);
            document.getElementById("vditor").innerHTML = "<p style='color:red;padding:20px'>初始化失败: " + e.message + "</p>";
          }
        }
        
document.addEventListener('DOMContentLoaded', function () {
      initVditor()
  // updateVditorOutlineBreakpoint()
})
function getValue() {
  return vditor.getValue()
}
function setValue(content,needFocus = true) {
  vditor.clearCache()
  let decodedContent = decodeURIComponent(content)
  // let contentWithMarkdownLink = convertLinksToMarkdown(decodedContent)
  vditor.setValue(decodedContent,true)
  if (needFocus) {
    vditor.focus()
  }
}
function updateValue(content,needFocus = true) {
  if (needFocus) {
    vditor.focus()
  }
  let decodedContent = decodeURIComponent(content)
  // let contentWithMarkdownLink = convertLinksToMarkdown(decodedContent)
  vditor.setValue(decodedContent,false)
}
function replaceSelection(content,needFocus = true) {
  if (needFocus) {
    vditor.focus()
  }
  let decodedContent = decodeURIComponent(content)
  // let contentWithMarkdownLink = convertLinksToMarkdown(decodedContent)
  vditor.updateValue(decodedContent,false)
}
function focus(params) {
    vditor.focus()
    if (savedRange) {
      let sel = window.getSelection()
      sel.removeAllRanges()
      sel.addRange(savedRange)
    }
}
function insertValue(content,needFocus = true) {
  if (needFocus) {
    focus()
  }
  vditor.insertValue(decodeURIComponent(content),true)
}
// function removeExtraSpacesInLinks(text) {
//     return text.replace(/https?:\/\/[^\s]+/g, function(url) {
//         return url.replace(/\s+/g, '');
//     });
// }
// function removeExtraSpacesInLinks(text) {
//     return text.replace(/https?:\/\/[^\s]+\/\s+/g, function(url) {
//         return url.replace(/\s+/g, '');
//     });
// }

function convertLinksToMarkdown(text) {
    // 正则表达式用于匹配非 Markdown 格式的链接
        const urlRegex = /(?<!\[.*?\])(?<!\()(?<!")(https?:\/\/[^\s.]+(?:\.[^\s.]+)+)(?!")(?!\))/g;

    // const urlRegex = /(?<!\[.*?\])(?<!\()(?<!")(https?:\/\/[^\s]+)(?!")(?!\))/g;

    // 替换所有匹配的链接为 Markdown 格式
    return text.replace(urlRegex, (match) => {
        return `[${match}](${match})`;
    });
}
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0,
        v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
function sendDropNotification(obj){
  console.log("sendDropNotification",obj)
  if(obj.type === "text"){
    if ("content" in obj) {
      window.location.href = "editordroptext://content?text="+encodeURIComponent(obj.text)+"&content="+encodeURIComponent(obj.content);
    }else{
      window.location.href = "editordroptext://content?text="+encodeURIComponent(obj.text);
    }
  }

}
function copyToClipboard(text) {
  console.log("copyToClipboard",text)
  window.location.href = "nativeCopy://content="+encodeURIComponent(text);
}

async function createPresignedUrl(fileName) {
  const url = "https://api2.feliks.top/v1/chat/completions"
  let model = subscribed?"r2":"r2pro"
  let body = {
        model:"r2",
        messages:[
          {
            role:"user",
            content:fileName
          }
        ]
      }
  const response = await fetch(url, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer sk-VyHpUO731ovktpRHE3Cd39Af3627446eBaDb6c56411eA123"
      }
  });
  if (response.ok) {
    return await response.json()
      // console.log(await response.json());
  } else {
    return undefined
      console.log('failed');
  }
}
async function uploadFile(url,file) {
        const presignedUrl = url; // 替换为从服务器获取的预签名URL
        const response = await fetch(presignedUrl, {
            method: 'PUT',
            body: file,
            headers: {
                'Content-Type': 'image/png' // 根据你的文件类型调整
            }
        });
        if (response.ok) {
            console.log('File uploaded successfully');
        } else {
            console.log('Upload failed');
        }
    }
  async function uploadFileDirect(file,fileName) {
    let bucketName = subscribed?'pro':'test'
    var accessKeyId = 'a4dd38e9a43edd92e7c0a29d90fceb38';
    var secretAccessKey = 'c7f0d5fdf94a12e203762c1b536f49fd1accb9c9ea7bb0e4810e856bb27ac9e7';
    var endpointUrl = 'https://45485acd4578c553e0570e10e95105ef.r2.cloudflarestorage.com';
    var region = 'auto';
    var service = 's3';
    var urlString = endpointUrl + '/' + bucketName + '/' + fileName;
    var date = new Date();
    var amzDate = date.toISOString().replace(/[:-]|\.\d{3}/g, '');
    // amzDate = '20240614T154746Z'
    var shortDate = amzDate.substr(0, 8);
    var scope = shortDate + '/' + region + '/' + service + '/aws4_request';
    var host = '45485acd4578c553e0570e10e95105ef.r2.cloudflarestorage.com'
    // var payloadHash = CryptoJS.SHA256(imageData).toString(CryptoJS.enc.Hex);
    // payloadHash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
    var payloadHash = 'UNSIGNED-PAYLOAD'
    var canonicalUri = '/' + bucketName + '/' + fileName;
    var canonicalRequest = 'PUT\n' + canonicalUri + '\n\n' +
        'host:' + host + '\n' +
        'x-amz-content-sha256:'+payloadHash+'\n' +
        'x-amz-date:' + amzDate + '\n\n' +
        'host;x-amz-content-sha256;x-amz-date\n' +
        payloadHash;
    var hashedCanonicalRequest = CryptoJS.SHA256(canonicalRequest).toString(CryptoJS.enc.Hex);

    var stringToSign = 'AWS4-HMAC-SHA256\n' + amzDate + '\n' + scope + '\n' + hashedCanonicalRequest;
    var dateKey = CryptoJS.HmacSHA256(shortDate, 'AWS4' + secretAccessKey);
    var dateRegionKey = CryptoJS.HmacSHA256(region, dateKey);
    var dateRegionServiceKey = CryptoJS.HmacSHA256(service, dateRegionKey);
    var signingKey = CryptoJS.HmacSHA256('aws4_request', dateRegionServiceKey);
    var signature = CryptoJS.HmacSHA256(stringToSign, signingKey).toString(CryptoJS.enc.Hex);

    var authorizationHeader = 'AWS4-HMAC-SHA256 Credential=' + accessKeyId + '/' + scope + ', SignedHeaders=host;x-amz-content-sha256;x-amz-date, Signature=' + signature;

    var headers = {
        "Accept-Encoding":"identity",
        "Authorization": authorizationHeader,
        'X-Amz-Content-SHA256': payloadHash,
        'Host': host,
        "X-Amz-Date": amzDate
    }

        const response = await fetch(urlString, {
            method: 'PUT',
            body: file,
            headers: headers
        });
        if (response.ok) {
            console.log('File uploaded successfully');
            return
        } else {
            console.log('Upload failed');
            return
        }
    }
  /**
   * 获取当前选中的text/html
   * */
  function getCurrentSelect(){

    let selectionObj = null, rangeObj = null;
    let selectedText = "", selectedHtml = "";

    // 处理兼容性
    if(window.getSelection){
      // 现代浏览器
      // 获取text
      selectionObj = window.getSelection();
      //  获取html
      rangeObj = selectionObj.getRangeAt(0);
      var docFragment = rangeObj.cloneContents();
      var tempDiv = document.createElement("div");
      tempDiv.appendChild(docFragment);
      selectedHtml = tempDiv.innerHTML;
    } else if(document.selection){
        // 非主流浏览器IE
        selectionObj = document.selection;
        rangeObj = selectionObj.createRange();
        selectedHtml = rangeObj.htmlText;
    }
    let tem = vditor.html2md(selectedHtml);
    let md = tem.replace(/\*\*\\\*\\\*\*\*/g, "")
                .replace(/\*\*\\\*\*\*/g, "")
                .replace(/######\s######\s/g, "###### ")
                .replace(/#####\s#####\s/g, "##### ")
                .replace(/####\s####\s/g, "#### ")
                .replace(/###\s###\s/g, "### ")
                .replace(/##\s##\s/g, "## ")
                .replace(/#\s#\s/g, "# ")
                .replace(/\*\*\\\$\*\*`/g, "$")
                .replace(/`\\\$/g, "$")
    return md
  };
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}
function triggerEvent(key) {
  var event = new KeyboardEvent('keydown', {
    key: key,
    code: 'KeyZ',
    keyCode: 90,
    which: 90,
    ctrlKey: false, // 在Windows上是true，在macOS上是metaKey: true
    metaKey: true, // 在macOS上使用metaKey来表示Cmd键
    shiftKey: false,
    altKey: false,
    bubbles: true,
    cancelable: true
  });
  document.getElementsByClassName("vditor-reset")[0].dispatchEvent(event)
}

function triggerKey(key,code,keyCode,metaKey=false,shiftKey=false,altKey=false) {
  var event = new KeyboardEvent('keydown', {
    key: key,
    code: code,
    keyCode: keyCode,
    which: keyCode,
    ctrlKey: false, // 在Windows上是true，在macOS上是metaKey: true
    metaKey: metaKey, // 在macOS上使用metaKey来表示Cmd键
    shiftKey: shiftKey,
    altKey: altKey,
    bubbles: true,
    cancelable: true
  });
  document.getElementsByClassName("vditor-reset")[0].dispatchEvent(event)
}

function link() {
  var event = new KeyboardEvent('keydown', {
    key: 'k',
    code: 'KeyK',
    keyCode: 75,
    which: 75,
    ctrlKey: false, // 在Windows上是true，在macOS上是metaKey: true
    metaKey: true, // 在macOS上使用metaKey来表示Cmd键
    shiftKey: false,
    altKey: false,
    bubbles: true,
    cancelable: true
  });
  document.getElementsByClassName("vditor-reset")[0].dispatchEvent(event)
}
function refresh() {
  let content = vditor.getValue().trim()
  if (/^#\s/.test(content)) {
    vditor.setValue(content)
  }else{
    vditor.setValue(`# \n${content}`)
  }
}
function addLink(link,title="link"){
  let selection = vditor.getSelection()
  if(selection && selection.trim()){
    vditor.updateValue(`[${selection}](${link})`,true)
  }else{
    vditor.insertValue(`[${title}](${link})`,true)
  }
}
function toggleHighlight() {
  let selection = vditor.getSelection()
  if(!selection){
    return
  }
  selection = selection.trim()
  // copyToClipboard(selection)
  
  if (/====(.+?)====/.test(selection)) {
    let replaceSelection = selection.replace(/====(.+?)====/, '$1')
    vditor.updateValue(replaceSelection,false)
    // vditor.insertValue(replaceSelection,true)
  }else if (/==(.+?)==/.test(selection)) {
    let replaceSelection = selection.replace(/==(.+?)==/, '$1')
    vditor.updateValue("",false)
    vditor.insertValue(replaceSelection,true)
  }else {
    vditor.updateValue(`==${selection}==`,true)
  }
}
function addFootnote(title,c=""){
  let currentFootnoteIds = getFootnoteIds();
  vditor.insertValue(`[^${title}]`,true)
  if (currentFootnoteIds.includes(title)) {
    return
  }
  let content = vditor.getValue().trim()
  content = content + `\n[^${title}]: ${c}`
  vditor.setValue(content)
}
function getFootnoteIds() {
    let content = vditor.getValue().trim()
    if (!content) return [];
    
    const footnoteIds = new Set();
    
    // Match both reference-style footnotes [^1] and definition-style footnotes [^1]:
    const footnoteRegex = /\[\^(.+?)\](?:\:)?/g;
    
    let match;
    while ((match = footnoteRegex.exec(content)) !== null) {
        footnoteIds.add(match[1]);
    }
    
    return Array.from(footnoteIds);
}

/**
 * 根据视口宽度与缩放变量切换 #vditor 的 vditor--outline-wide。
 * 阈值 = max(base, base×scale)，不低于基准宽度（默认 base=800px）；scale 变大时阈值随之变宽。
 * 需在 changeZoomScale 后及 window resize 时调用。
 */
function updateVditorOutlineBreakpoint() {
  if (!allowAutoShowOutline) {
    return
  }
  const vditor = document.getElementById('vditor')
  if (!vditor) return
  const root = document.documentElement
  const cs = getComputedStyle(root)
  const base = parseFloat(String(cs.getPropertyValue('--vditor-outline-breakpoint-base') || '').trim()) || 800
  const page = parseFloat(String(cs.getPropertyValue('--page-zoom-scale') || '').trim())
  const font = parseFloat(String(cs.getPropertyValue('--vditor-font-scale') || '').trim())
  const p = Number.isFinite(page) && page > 0 ? page : 1
  const f = Number.isFinite(font) && font > 0 ? font : 1
  const scale = Math.max(p, f)
  const minW = Math.max(base, base * scale)
  let outlineStatus = window.innerWidth >= minW

  if (outlineStatus) {
    vditor.classList.add('vditor--outline-wide')
    autoStatus = {outline: outlineStatus}
  } else {
    vditor.classList.remove('vditor--outline-wide')
    autoStatus = {outline: outlineStatus}
  }
}
function isOutlineShown() {
  return document.getElementById('vditor').classList.contains('vditor--outline-wide')
}
function toggleOutline() {//一旦手动操作就把自动的关了
  let vditor = document.getElementById('vditor')
  if (!vditor) return
  vditor.classList.toggle('vditor--outline-wide')
  manualStatus = {outline: vditor.classList.contains('vditor--outline-wide')}
  allowAutoShowOutline = manualStatus.outline === autoStatus.outline
}
function showOutline() {//一旦手动操作就把自动的关了
  let vditor = document.getElementById('vditor')
  if (!vditor) return
  vditor.classList.add('vditor--outline-wide')
  manualStatus = {outline: true}
  allowAutoShowOutline = manualStatus.outline === autoStatus.outline
}
function hideOutline() {//一旦手动操作就把自动的关了
  let vditor = document.getElementById('vditor')
  if (!vditor) return
  vditor.classList.remove('vditor--outline-wide')
  manualStatus = {outline: false}
  allowAutoShowOutline = manualStatus.outline === autoStatus.outline
}

window.addEventListener('resize', updateVditorOutlineBreakpoint)

/**
 * 是否为 Safari 系（含 macOS Safari、iOS Safari / WKWebView），不含 Chrome/Chromium/Edge。
 */
function isSafariEngineWithoutChrome() {
  const ua = navigator.userAgent
  return /Safari\//.test(ua) && !/(Chrome|Chromium|Edg)\//.test(ua)
}

/**
 * 当前环境是否声明支持 CSS zoom（Chromium / Safari 15.4+ 等）。优先走 zoom 可避免 transform 缩放导致的文字发糊。
 */
function cssZoomSupported() {
  try {
    if (typeof CSS !== 'undefined' && typeof CSS.supports === 'function') {
      return CSS.supports('zoom', '1')
    }
  } catch (e) {}
  return false
}

/**
 * 设置页面缩放。
 * 默认仅通过 veditor.css 中的 --vditor-font-scale 控制字号（calc），适合 Safari / WKWebView；不与 body zoom 叠加，避免双重放大。
 * @param {number} scale 缩放系数，如 1、1.25、0.9
 * @param {object} [opts]
 * @param {number} [opts.baseFontPx=16] 仅当 applyBrowserZoom 为 true 时参与 html 根字号
 * @param {boolean} [opts.syncRootFont=true] 仅 applyBrowserZoom 时有效
 * @param {boolean} [opts.forceTransform=false] 仅 applyBrowserZoom 时有效
 * @param {boolean} [opts.applyBrowserZoom=false] 为 true 时用 body zoom/transform 整页缩放，且 --vditor-font-scale 固定为 1（字体只靠浏览器缩放）
 */
function changeZoomScale(scale, opts = {}) {
  const baseFontPx = opts.baseFontPx != null ? opts.baseFontPx : 16
  const syncRootFont = opts.syncRootFont !== false
  const forceTransform = opts.forceTransform === true
  const applyBrowserZoom = opts.applyBrowserZoom === true
  if (typeof scale !== 'number' || !isFinite(scale) || scale <= 0) {
    console.warn('changeZoomScale: invalid scale', scale)
    return
  }
  document.documentElement.style.setProperty('--page-zoom-scale', String(scale))
  document.documentElement.style.setProperty('-webkit-text-size-adjust', '100%')
  document.body.style.setProperty('-webkit-text-size-adjust', '100%')

  document.documentElement.style.setProperty(
    '--vditor-font-scale',
    applyBrowserZoom ? '1' : String(scale)
  )

  if (!applyBrowserZoom) {
    document.body.style.zoom = ''
    document.body.style.transform = ''
    document.body.style.transformOrigin = ''
    document.body.style.width = ''
    document.body.style.minHeight = ''
    document.documentElement.style.textRendering = ''
    document.body.style.removeProperty('-webkit-font-smoothing')
    document.documentElement.style.fontSize = ''
    updateVditorOutlineBreakpoint()
    return
  }

  const useTransform =
    forceTransform || (isSafariEngineWithoutChrome() && !cssZoomSupported())

  if (useTransform) {
    document.body.style.zoom = ''
    const s = Math.round(scale * 10000) / 10000
    if (scale === 1) {
      document.body.style.transform = ''
      document.body.style.transformOrigin = ''
      document.body.style.width = ''
      document.body.style.minHeight = ''
      document.documentElement.style.textRendering = ''
      document.body.style.removeProperty('-webkit-font-smoothing')
    } else {
      const inv = 1 / s
      document.body.style.transform = `scale(${s})`
      document.body.style.transformOrigin = 'top left'
      document.body.style.width = `${inv * 100}%`
      document.body.style.minHeight = `${inv * 100}vh`
      document.documentElement.style.textRendering = 'optimizeLegibility'
      document.body.style.setProperty('-webkit-font-smoothing', 'subpixel-antialiased')
    }
    if (syncRootFont) {
      document.documentElement.style.fontSize = `${baseFontPx}px`
    } else {
      document.documentElement.style.fontSize = ''
    }
  } else {
    document.body.style.transform = ''
    document.body.style.transformOrigin = ''
    document.body.style.width = ''
    document.body.style.minHeight = ''
    document.documentElement.style.textRendering = ''
    document.body.style.removeProperty('-webkit-font-smoothing')
    document.body.style.zoom = scale === 1 ? '' : String(scale)
    if (syncRootFont) {
      document.documentElement.style.fontSize = `${baseFontPx * scale}px`
    } else {
      document.documentElement.style.fontSize = ''
    }
  }
  updateVditorOutlineBreakpoint()
}
function getContentFrame() {
  try {
  let height = document.getElementsByClassName("vditor-reset")[0].scrollHeight
  let top = document.getElementsByClassName("vditor-content")[0].offsetTop
  return JSON.stringify({height,top})
  } catch (error) {
    return JSON.stringify({height:0,top:0,error:error.toString()})
  }
}
function blur() {
  let hasActiveElement = document.activeElement && document.activeElement.tagName !== 'BODY'
  if (!hasActiveElement) {
    return {needBlur:false}
  }
  let sel = window.getSelection()
  if (sel.rangeCount > 0) {
    let r = sel.getRangeAt(0)
    let el = document.querySelector('.vditor-wysiwyg')
    if (el && (el.isEqualNode(r.startContainer) || el.contains(r.startContainer))) {
      savedRange = r
    }
  }
  vditor.blur();
  document.activeElement.blur();
  return {needBlur:true}
}
function showHUD(content) {
  vditor.tip(content)
}
      // 快捷键 Debug Notify
      (function() {
        // 注入样式
        const style = document.createElement('style');
        style.textContent = `.debug-notify{position:fixed;top:20px;right:20px;background:#323232;color:#fff;padding:12px 24px;border-radius:6px;font-size:14px;font-family:'Menlo','Monaco','Courier New',monospace;z-index:99999;opacity:0;transform:translateX(100%);transition:all 0.3s ease;box-shadow:0 4px 12px rgba(0,0,0,0.3);max-width:400px;word-break:break-all}.debug-notify.show{opacity:1;transform:translateX(0)}.debug-notify .key{background:#555;padding:2px 8px;border-radius:4px;margin:0 2px;font-weight:bold}`;
        document.head.appendChild(style);
        let notifyTimeout = null;
        let notifyEl = null;

        function createNotifyEl() {
          if (!notifyEl) {
            notifyEl = document.createElement('div');
            notifyEl.className = 'debug-notify';
            document.body.appendChild(notifyEl);
          }
          return notifyEl;
        }

        function showNotify(html) {
          const el = createNotifyEl();
          el.innerHTML = html;
          el.classList.add('show');

          if (notifyTimeout) clearTimeout(notifyTimeout);
          notifyTimeout = setTimeout(() => {
            el.classList.remove('show');
          }, 2000);
        }

        function formatKeyCombo(e) {
          const parts = [];
          // 修饰键
          if (e.ctrlKey) parts.push('<span class="key">Ctrl</span>');
          if (e.metaKey) parts.push('<span class="key">⌘ Cmd</span>');
          if (e.altKey) parts.push('<span class="key">Alt</span>');
          if (e.shiftKey) parts.push('<span class="key">Shift</span>');
          // 主键
          const key = e.key || e.code;
          if (!['Control', 'Meta', 'Alt', 'Shift'].includes(key)) {
            parts.push('<span class="key">' + key.toUpperCase() + '</span>');
          }
          return parts.join(' + ');
        }

        function hasModifier(e) {
          return e.ctrlKey || e.metaKey || e.altKey || e.shiftKey;
        }


        document.addEventListener('keydown', function(e) {
          // debug 模式关闭时不触发
          if (!debug) return;
          // 必须有修饰键才触发
          if (!hasModifier(e)) return;
          // 忽略单独的修饰键按下
          if (['Control', 'Meta', 'Alt', 'Shift'].includes(e.key)) return;

          // const combo = formatKeyCombo(e);
          // showNotify('🎹 <strong>' + combo + '</strong>');
        }, true);
      })();
//b:加粗
//y:redo
//z:undo
//h:heading
//i:itali
//d:delete
//k:link
//l:unordered
//o:ordered
//j:todo
//;:refer
//u:code
//g:inlinecode
//m:table