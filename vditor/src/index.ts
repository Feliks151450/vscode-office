import "./assets/less/index.less";
import * as adapterRender from "./ts/markdown/adapterRender";
import { codeRender } from "./ts/markdown/codeRender";
import { codeMirrorPreviewRender } from "./ts/codeBlock/codeMirrorPreviewRender";
import { renderCodeBlocks } from "./ts/codeBlock/codeMirrorManager";
import { mathRender } from "./ts/markdown/mathRender";
import { mermaidRender } from "./ts/markdown/mermaidRender";
import { outlineRender } from "./ts/markdown/outlineRender";
import { plantumlRender } from "./ts/markdown/plantumlRender";
import { previewImage } from "./ts/preview/image";
import { Constants, VDITOR_VERSION } from "./ts/constants";
import { Hint } from "./ts/hint/index";
import { IR } from "./ts/ir/index";
import { input as irInput } from "./ts/ir/input";
import { processAfterRender } from "./ts/ir/process";
import { getHTML } from "./ts/markdown/getHTML";
import { getMarkdown } from "./ts/markdown/getMarkdown";
import { setLute } from "./ts/markdown/setLute";
import { Outline } from "./ts/outline/index";
import { Tip } from "./ts/tip/index";
import { Toolbar } from "./ts/toolbar/index";
import { disableToolbar, hidePanel } from "./ts/toolbar/setToolbar";
import { enableToolbar } from "./ts/toolbar/setToolbar";
import { AIDialog } from "./ts/ui/aiDialog";
import { AIInputPanel } from "./ts/ui/aiInputPanel";
import { telemetry } from "./ts/util/telemetry";
import { AIReviewPanel } from "./ts/ui/aiReviewPanel";
import { initUI } from "./ts/ui/initUI";
import { setCodeTheme } from "./ts/ui/setCodeTheme";
import { setEditorTheme as applyEditorTheme } from "./ts/ui/setEditorTheme";
import { applyMermaidTheme } from "./ts/ui/setMermaidTheme";
import { setEditMode } from "./ts/toolbar/EditMode";
import { setTheme } from "./ts/ui/setTheme";
import { Undo } from "./ts/undo/index";
import { Upload } from "./ts/upload/index";
import { addScript, addScriptSync } from "./ts/util/addScript";
import { clearCacheFocus, restoreCacheFocus } from "./ts/util/cacheFocus";
import { accessLocalStorage } from "./ts/util/compatibility";
import { clearDocumentScroll, restoreDocumentScroll } from "./ts/util/documentState";
import { getSelectText } from "./ts/util/getSelectText";
import { Options } from "./ts/util/Options";
import { processCodeRender } from "./ts/util/processCode";
import { hasClosestBlock } from "./ts/util/hasClosest";
import { getCursorPosition, getEditorRange, insertHTML, insertMdForAIReplace, setSelectionFocus } from "./ts/util/selection";
import { rangeToMarkdown } from "./ts/markdown/cleanFragmentForMarkdown";
import { markOutlineEditing } from "./ts/outline/updateOutlineActive";
import { recordHistoryChange } from "./ts/util/instantHistory";
import {
    captureEditorSelection,
    hideFrozenSelection,
    restoreEditorSelection,
    showFrozenSelection,
} from "./ts/util/frozenSelection";
import { afterRenderEvent } from "./ts/wysiwyg/afterRenderEvent";
import { renderToc } from "./ts/util/toc";
import { scrollToBlock as scrollToBlockUtil } from "./ts/util/scrollToBlock";
import { configureHistoryDeferByDocumentLength } from "./ts/util/historySchedule";
import { isDocumentDirty, markDocumentSaved, updateSaveToolbarState } from "./ts/util/saveToolbarState";
import {
    applyEditorSettings,
    enableViewerSettingsSync,
    exportViewerSettings,
    getEditorSettings,
    getGlobalLocalStorageSetting,
    importViewerSettings,
    setEditorSettings,
    setOnViewerSettingsChange,
    AIPrompt,
    AIModel,
    AIPreset,
    AIEngine,
    IAISelections,
    IAISettings,
    IAISettingsPatch,
    ViewerSettingsExport,
    EditorSettings,
    getAIPrompts,
    setAIPrompts,
    getAIModels,
    setAIModels,
    getAIPresets,
    setAIPresets,
    resetAIPresets,
    getAISelections,
    setAISelections,
    getAIEngine,
    setAIEngine,
    getAISelectedPrompt,
    setAISelectedPrompt,
    getAISelectedModel,
    setAISelectedModel,
    getAIOutputLanguage,
    setAIOutputLanguage,
    getAISettings,
    setAISettings,
} from "./ts/util/globalLocalStorageSettings";
import { AIOutputLanguage } from "./ts/ai/aiOutputLanguage";
import { exportExportSettings, ExportThemeSettings } from "./ts/util/exportThemeSettings";
import {
    buildSettingsPanelHTML,
    refreshAISettingsToolbarPanel,
    refreshSettingsToolbarPanel,
} from "./ts/ui/settingsPanel";
import { WYSIWYG } from "./ts/wysiwyg/index";
import { input } from "./ts/wysiwyg/input";
import { ensureEditorBoundaryParagraphs, renderDomByMd } from "./ts/wysiwyg/renderDomByMd";
import { unbindTypewriterMode } from "./ts/ui/typewriterMode";
import { setBubbleMenuAIAvailable } from "./ts/wysiwyg/bubbleMenu";
import { setBlockMenuAIAvailable, blockToMarkdown } from "./ts/wysiwyg/blockMenu";

/**
 * 简易判断输入是不是 HTML（用于 insertValue / updateValue 智能分发）
 *  - M9 修复：用更严格的标签形态检测 — 必须以字母开头 + 字母数字 + 空白 / `/` / `>`
 *    避免 markdown 自动链接 `<user@email>` 被误判
 *  - 含 `&lt;` HTML 实体 → 当作 HTML（已经被 escape 过的）
 *  - 否则当作 Markdown，走 Lute 解析
 *
 * 注意：这不是严格的 HTML 解析，是工程实用的"启发式"。`< 100` 这种
 *  纯文本里的小于号会被正确识别为 markdown。
 */
const looksLikeHtml = (value: string): boolean => {
    if (!value) return false;
    // 必须以字母开头 + 字母数字 + 空白 / `>` / `/` 之一（HTML 标签格式）
    // 例如 `<div>` `<br/>` `<input type="text">` 都命中；`<user@email>` 不命中
    return /<[a-zA-Z][a-zA-Z0-9-]*[\s/>]/.test(value) || /&lt;/.test(value);
};

class Vditor {
    public static adapterRender = adapterRender;
    public static previewImage = previewImage;
    public static codeRender = codeRender;
    public static codeMirrorPreviewRender = codeMirrorPreviewRender;
    public static mathRender = mathRender;
    public static mermaidRender = mermaidRender;
    public static plantumlRender = plantumlRender;
    public static outlineRender = outlineRender;
    public static setCodeTheme = setCodeTheme;
    public static setEditorTheme = applyEditorTheme;
    /** 编辑器设置默认值 */
    public static DEFAULT_EDITOR_SETTINGS = {
        uiFontSize: 13,
        editorFontSize: 13,
        lineHeight: 1.7,
        fontFamily: "inherit",
        codeFontFamily: "inherit",
        boldColor: "default",
        pageWidth: "100%",
        codeBlockMaxHeight: "none",
        imageMaxWidth: 100,
        imageMaxHeight: 70,
        typewriterMode: false,
    } as const;

    public readonly version: string;
    public vditor: IVditor;
    /** AI 配置命名空间（vd.ai.getPrompts 等） */
    public ai!: IVditorAI;
    private aiDialog: AIDialog | null = null;
    public aiInputPanel: AIInputPanel | null = null;
    private aiSelectionRange: Range | null = null;
    private aiReviewPanel: AIReviewPanel = new AIReviewPanel();
    private aiReplaceAll = false;

    /**
     * @param id 要挂载 Vditor 的元素或者元素 ID。
     * @param options Vditor 参数
     */
    constructor(id: string | HTMLElement, options?: IOptions) {
        this.version = VDITOR_VERSION;

        // 提前初始化 AI 命名空间，让外部能在 init() 异步完成前就调用 API
        this.ai = this.buildAINamespace();

        if (typeof id === "string") {
            if (!options) {
                options = {
                    cache: {
                        id: `vditor${id}`,
                    },
                };
            } else if (!options.cache) {
                options.cache = { id: `vditor${id}` };
            } else if (!options.cache.id) {
                options.cache.id = `vditor${id}`;
            }
            id = document.getElementById(id);
        }

        const getOptions = new Options(options);
        const mergedOptions = getOptions.merge();

        // 支持自定义国际化
        if (!mergedOptions.i18n) {
            if (!["en_US", "ja_JP", "ko_KR", "ru_RU", "zh_CN", "zh_TW"].includes(mergedOptions.lang)) {
                throw new Error(
                    "options.lang error, see https://ld246.com/article/1549638745630#options",
                );
            } else {
                const i18nScriptPrefix = "vditorI18nScript";
                const i18nScriptID = i18nScriptPrefix + mergedOptions.lang;
                document.querySelectorAll(`head script[id^="${i18nScriptPrefix}"]`).forEach((el) => {
                    if (el.id !== i18nScriptID) {
                        document.head.removeChild(el);
                    }
                });
                addScript(`${mergedOptions.cdn}/dist/js/i18n/${mergedOptions.lang}.js`, i18nScriptID).then(() => {
                    this.init(id as HTMLElement, mergedOptions);
                });
            }
        } else {
            window.VditorI18n = mergedOptions.i18n;
            this.init(id, mergedOptions);
        }
    }

    /** 设置主题 */
    public setTheme(
        theme: "dark" | "classic",
        codeTheme?: string,
    ) {
        this.vditor.options.theme = theme;
        setTheme(this.vditor);
        if (codeTheme) {
            this.vditor.options.codeMirrorTheme = codeTheme;
            setCodeTheme(codeTheme, this.vditor.element);
        }
    }

    /** 设置 Markdown 编辑器主题（bundled in index.css） */
    public setEditorTheme(editorTheme: string) {
        applyEditorTheme(this.vditor, editorTheme, false);
    }

    /** 设置 Mermaid 主题（不触发 changeMermaidTheme 回调） */
    public setMermaidTheme(mermaidTheme: string) {
        applyMermaidTheme(this.vditor, mermaidTheme, false);
    }

    /** 切换编辑模式（不触发 changeEditMode 回调） */
    public switchEditMode(mode: "wysiwyg" | "ir") {
        if (this.vditor.currentMode === mode) {
            return;
        }
        setEditMode(this.vditor, mode, this.getValue());
    }

    /** 获取 Markdown 内容 */
    public getValue() {
        return getMarkdown(this.vditor);
    }

    /** 标记当前内容已保存，并禁用工具栏保存按钮 */
    public markSaved(markdown?: string) {
        markDocumentSaved(this.vditor, markdown);
    }

    /** 当前文档相对上次保存是否有变更 */
    public isDirty() {
        return isDocumentDirty(this.vditor);
    }

    /** 获取编辑器当前编辑模式 */
    public getCurrentMode() {
        return this.vditor.currentMode;
    }

    /**
     * 获取当前生效的编辑器设置快照（已合并默认值）。
     * 包含 uiFontSize / editorFontSize / lineHeight / fontFamily / codeFontFamily
     * / boldColor / pageWidth / codeBlockMaxHeight / imageMaxWidth / imageMaxHeight
     * / typewriterMode。
     */
    public getEditorSettings(): EditorSettings {
        return getEditorSettings();
    }

    /**
     * 修改编辑器设置。会立即写入 localStorage 并把对应 CSS 变量应用到 #vditor 上。
     * 若设置面板已打开，UI 会同步刷新；未传字段保持不变，传 undefined 表示清除该项（恢复默认）。
     *
     * 注意：本方法是程序化 API 调用，**不会**触发 onSettingsChange 回调。
     * 回调仅对面板 UI 操作（+/-、下拉、Toggle、Reset）生效。
     */
    public setEditorSettings(partial: Partial<EditorSettings>) {
        setEditorSettings(this.vditor.element, partial);
        refreshSettingsToolbarPanel(this.vditor);
    }

    /** 聚焦到编辑器 */
    public focus() {
        if (this.vditor.currentMode === "wysiwyg") {
            this.vditor.wysiwyg.element.focus();
        } else if (this.vditor.currentMode === "ir") {
            this.vditor.ir.element.focus();
        }
    }

    /** 让编辑器失焦 */
    public blur() {
        if (this.vditor.currentMode === "wysiwyg") {
            this.vditor.wysiwyg.element.blur();
        } else if (this.vditor.currentMode === "ir") {
            this.vditor.ir.element.blur();
        }
    }

    /** 禁用编辑器 */
    public disabled() {
        hidePanel(this.vditor, ["subToolbar", "hint", "popover"]);
        disableToolbar(
            this.vditor.toolbar.elements,
            Constants.EDIT_TOOLBARS.concat(["undo", "redo", "edit-mode"]),
        );
        this.vditor[this.vditor.currentMode].element.setAttribute(
            "contenteditable",
            "false",
        );
    }

    /** 解除编辑器禁用 */
    public enable() {
        enableToolbar(
            this.vditor.toolbar.elements,
            Constants.EDIT_TOOLBARS.concat(["undo", "redo", "edit-mode"]),
        );
        this.vditor.undo.resetIcon(this.vditor);
        this.vditor[this.vditor.currentMode].element.setAttribute("contenteditable", "true");
    }

    /** 返回选中的字符串 */
    public getSelection() {
        if (this.vditor.currentMode === "wysiwyg") {
            return getSelectText(this.vditor.wysiwyg.element);
        }
        if (this.vditor.currentMode === "ir") {
            return getSelectText(this.vditor.ir.element);
        }
    }

    /** 获取焦点位置 */
    public getCursorPosition() {
        return getCursorPosition(this.vditor[this.vditor.currentMode].element);
    }

    /** 恢复上次焦点位置；onLoad 用于页面首次加载 */
    public restoreFocus(onLoad = false) {
        restoreCacheFocus(this.vditor, { onLoad });
    }

    /** 恢复文档滚动位置 */
    public restoreScroll(scrollTop?: number) {
        restoreDocumentScroll(this.vditor, scrollTop);
    }

    /** 恢复滚动与焦点；onLoad 用于页面首次加载 */
    public restoreDocumentSession(onLoad = false, restoreCaret = true) {
        restoreCacheFocus(this.vditor, { onLoad, restoreCaret });
    }

    /** 滚动到块引用或标题 fragment（如 ^block-id 或标题 slug） */
    public scrollToBlock(fragment: string) {
        return scrollToBlockUtil(this.vditor, fragment);
    }

    /** 上传是否还在进行中 */
    public isUploading() {
        return this.vditor.upload.isUploading;
    }

    /** 清除缓存 */
    public clearCache() {
        if (accessLocalStorage()) {
            const cacheId = this.vditor.options.cache.id;
            if (cacheId) {
                localStorage.removeItem(cacheId);
                clearCacheFocus(cacheId);
                clearDocumentScroll(cacheId);
            }
        }
    }

    /** 禁用缓存 */
    public disabledCache() {
        this.vditor.options.cache.enable = false;
    }

    /** 启用缓存 */
    public enableCache() {
        if (!this.vditor.options.cache.id) {
            throw new Error(
                "need options.cache.id, see https://ld246.com/article/1549638745630#options",
            );
        }
        this.vditor.options.cache.enable = true;
    }

    /** HTML 转 md */
    public html2md(value: string) {
        return this.vditor.lute.HTML2Md(value);
    }

    /** markdown 转 JSON 输出 */
    public exportJSON(value: string) {
        return this.vditor.lute.RenderJSON(value);
    }

    /** 获取 HTML */
    public getHTML() {
        return getHTML(this.vditor);
    }

    /** 消息提示。time 为 0 将一直显示 */
    public tip(text: string, time?: number) {
        this.vditor.tip.show(text, time);
    }

    /** 删除选中内容 */
    public deleteValue() {
        if (window.getSelection().isCollapsed) {
            return;
        }
        document.execCommand("delete", false);
    }

    /** 更新选中内容。
     *  MED-4 修复：智能判断输入是 HTML 还是 Markdown。
     *  - 含 HTML 标签（`<xxx>` 或 `&lt;`）：走原 execCommand 路径（保留宿主显式传的 HTML）
     *  - 否则按 Markdown 解析：调 Md2VditorDOM/Md2VditorIRDOM 后插入，保证宿主通过
     *    nativeCommand:// 传 markdown 时结构不丢
     */
    public updateValue(value: string) {
        if (looksLikeHtml(value)) {
            document.execCommand("insertHTML", false, value);
            return;
        }
        // 走 Markdown 路径：让 Lute 解析后再插入
        const html = this.vditor.currentMode === "ir"
            ? this.vditor.lute.Md2VditorIRDOM(value)
            : this.vditor.lute.Md2VditorDOM(value);
        document.execCommand("insertHTML", false, html);
    }

    /** 在焦点处插入内容，并默认进行 Markdown 渲染。
     *  MED-4 修复：智能判断输入是 HTML 还是 Markdown（逻辑同 updateValue） */
    public insertValue(value: string, render = true) {
        if (looksLikeHtml(value)) {
            const range = getEditorRange(this.vditor);
            range.collapse(true);
            const tmpElement = document.createElement("template");
            tmpElement.innerHTML = value;
            range.insertNode(tmpElement.content.cloneNode(true));
        } else {
            // Markdown 路径：调 insertMarkdown 让 Lute 解析
            this.insertMarkdown(value);
            return;
        }
        if (this.vditor.currentMode === "wysiwyg") {
            this.vditor.wysiwyg.preventInput = true;
            if (render) {
                input(this.vditor, getSelection().getRangeAt(0));
            }
        } else if (this.vditor.currentMode === "ir") {
            this.vditor.ir.preventInput = true;
            if (render) {
                irInput(this.vditor, getSelection().getRangeAt(0), true);
            }
        }
    }

    /** 在焦点处插入 Markdown，行为与粘贴纯文本 Markdown 一致 */
    public insertMarkdown(markdown: string) {
        const vditor = this.vditor;
        vditor[vditor.currentMode].element.focus();
        if (vditor.currentMode === "ir") {
            insertHTML(vditor.lute.Md2VditorIRDOM(markdown), vditor);
        } else if (vditor.currentMode === "wysiwyg") {
            insertHTML(vditor.lute.Md2VditorDOM(markdown), vditor);
        } else {
            document.execCommand("insertText", false, markdown);
        }
        markOutlineEditing(vditor);
        vditor.outline.render(vditor);
        recordHistoryChange(vditor);
    }

    /** 设置编辑器内容 */
    public setValue(markdown: string, clearStack = false) {
        if (this.vditor.currentMode === "wysiwyg") {
            renderDomByMd(this.vditor, markdown, {
                enableAddUndoStack: true,
                enableHint: false,
                enableInput: false,
            });
        } else {
            this.vditor.ir.element.innerHTML = this.vditor.lute.Md2VditorIRDOM(markdown);
            this.vditor.ir.element
                .querySelectorAll(".vditor-ir__preview[data-render='2']")
                .forEach((item: HTMLElement) => {
                    processCodeRender(item, this.vditor);
                });
            ensureEditorBoundaryParagraphs(this.vditor.ir.element);
            processAfterRender(this.vditor, {
                enableAddUndoStack: true,
                enableHint: false,
                enableInput: false,
            });
        }

        renderToc(this.vditor);

        if (!markdown) {
            hidePanel(this.vditor, ["headings", "submenu", "hint"]);
            if (this.vditor.wysiwyg.popover) {
                this.vditor.wysiwyg.popover.style.display = "none";
            }
            this.clearCache();
        }
        if (clearStack) {
            this.clearStack();
            configureHistoryDeferByDocumentLength(this.vditor, markdown.length);
        }
        updateSaveToolbarState(this.vditor);
    }

    /** 清空 undo & redo 栈 */
    public clearStack() {
        this.vditor.undo.clearStack(this.vditor);
        this.vditor.undo.addToUndoStack(this.vditor);
    }

    /** 设置 Github Copilot（VS Code Language Model API）是否可选 */
    public setCopilotAvailable(available: boolean) {
        this.aiDialog?.setCopilotAvailable(available);
        // 同步控制气泡菜单 / 块菜单 AI 入口的显隐
        setBubbleMenuAIAvailable(this.vditor, available);
        setBlockMenuAIAvailable(available);
    }

    /** 设置可用的 VS Code 语言模型列表 */
    public setVSCodeModels(models: Array<{ id: string; name: string; family: string; vendor: string }>) {
        this.aiDialog?.setVSCodeModels(models);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // AI 配置公共 API — Prompts CRUD
    // ─────────────────────────────────────────────────────────────────────────

    /** 获取提示词列表（含 3 个内置默认） */
    public getAIPrompts(): AIPrompt[] {
        return getAIPrompts();
    }

    /** 整体替换提示词列表 */
    public setAIPrompts(prompts: AIPrompt[]) {
        setAIPrompts(prompts);
        this.aiDialog?.refreshPrompts();
        this.refreshAISettingsToolbar();
    }

    /**
     * 新增一个提示词。自动生成 id 并返回新对象，便于外部保存引用。
     */
    public addAIPrompt(input: Omit<AIPrompt, "id">): AIPrompt {
        const newPrompt: AIPrompt = { ...input, id: Date.now().toString() };
        setAIPrompts([...getAIPrompts(), newPrompt]);
        this.aiDialog?.refreshPrompts();
        this.refreshAISettingsToolbar();
        return newPrompt;
    }

    /**
     * 更新指定 id 的提示词。找不到时返回 null；找到则返回更新后的对象。
     */
    public updateAIPrompt(id: string, patch: Partial<Omit<AIPrompt, "id">>): AIPrompt | null {
        const prompts = getAIPrompts();
        const idx = prompts.findIndex((p) => p.id === id);
        if (idx === -1) return null;
        const updated = { ...prompts[idx], ...patch, id };
        prompts[idx] = updated;
        setAIPrompts(prompts);
        this.aiDialog?.refreshPrompts();
        this.refreshAISettingsToolbar();
        return updated;
    }

    /** 删除指定 id 的提示词；返回是否真的删除了 */
    public removeAIPrompt(id: string): boolean {
        const prompts = getAIPrompts();
        const next = prompts.filter((p) => p.id !== id);
        if (next.length === prompts.length) return false;
        setAIPrompts(next);
        this.aiDialog?.refreshPrompts();
        this.refreshAISettingsToolbar();
        return true;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // AI 配置公共 API — Models CRUD
    // ─────────────────────────────────────────────────────────────────────────

    /** 获取模型列表 */
    public getAIModels(): AIModel[] {
        return getAIModels();
    }

    /** 整体替换模型列表 */
    public setAIModels(models: AIModel[]) {
        setAIModels(models);
        this.aiDialog?.refreshModels();
        this.refreshAISettingsToolbar();
    }

    /** 新增一个模型 */
    public addAIModel(input: Omit<AIModel, "id">): AIModel {
        const newModel: AIModel = { ...input, id: Date.now().toString() };
        setAIModels([...getAIModels(), newModel]);
        this.aiDialog?.refreshModels();
        this.refreshAISettingsToolbar();
        return newModel;
    }

    /** 更新指定 id 的模型 */
    public updateAIModel(id: string, patch: Partial<Omit<AIModel, "id">>): AIModel | null {
        const models = getAIModels();
        const idx = models.findIndex((m) => m.id === id);
        if (idx === -1) return null;
        const updated = { ...models[idx], ...patch, id };
        models[idx] = updated;
        setAIModels(models);
        this.aiDialog?.refreshModels();
        this.refreshAISettingsToolbar();
        return updated;
    }

    /** 删除指定 id 的模型 */
    public removeAIModel(id: string): boolean {
        const models = getAIModels();
        const next = models.filter((m) => m.id !== id);
        if (next.length === models.length) return false;
        setAIModels(next);
        this.aiDialog?.refreshModels();
        this.refreshAISettingsToolbar();
        return true;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // AI 配置公共 API — Presets CRUD（快捷操作）
    // ─────────────────────────────────────────────────────────────────────────

    /** 获取快捷操作列表（含 6 个内置默认） */
    public getAIPresets(): AIPreset[] {
        return getAIPresets();
    }

    /** 整体替换快捷操作列表 */
    public setAIPresets(presets: AIPreset[]) {
        setAIPresets(presets);
        this.aiDialog?.refreshPresets();
        this.aiInputPanel?.refreshPresets();
        this.refreshAISettingsToolbar();
    }

    /** 新增一个快捷操作；自动生成唯一 key */
    public addAIPreset(input: Omit<AIPreset, "key">): AIPreset {
        const newPreset: AIPreset = { ...input, key: `custom-${Date.now()}` };
        setAIPresets([...getAIPresets(), newPreset]);
        this.aiDialog?.refreshPresets();
        this.aiInputPanel?.refreshPresets();
        this.refreshAISettingsToolbar();
        return newPreset;
    }

    /** 更新指定 key 的快捷操作 */
    public updateAIPreset(key: string, patch: Partial<Omit<AIPreset, "key">>): AIPreset | null {
        const presets = getAIPresets();
        const idx = presets.findIndex((p) => p.key === key);
        if (idx === -1) return null;
        const updated = { ...presets[idx], ...patch, key };
        presets[idx] = updated;
        setAIPresets(presets);
        this.aiDialog?.refreshPresets();
        this.aiInputPanel?.refreshPresets();
        this.refreshAISettingsToolbar();
        return updated;
    }

    /** 删除指定 key 的快捷操作 */
    public removeAIPreset(key: string): boolean {
        const presets = getAIPresets();
        const next = presets.filter((p) => p.key !== key);
        if (next.length === presets.length) return false;
        setAIPresets(next);
        this.aiDialog?.refreshPresets();
        this.aiInputPanel?.refreshPresets();
        this.refreshAISettingsToolbar();
        return true;
    }

    /** 重置快捷操作为内置默认（清空 localStorage 让 fallback 生效） */
    public resetAIPresets() {
        resetAIPresets();
        this.aiDialog?.refreshPresets();
        this.aiInputPanel?.refreshPresets();
        this.refreshAISettingsToolbar();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // AI 配置公共 API — Selections（当前选中项）
    // ─────────────────────────────────────────────────────────────────────────

    /** 获取当前选中项的完整快照 */
    public getAISelections(): IAISelections {
        return getAISelections();
    }

    /**
     * 批量更新选中项。未提供的字段保持不变。
     * 注意：与 setEditorSettings 类似，是程序化 API，**不会**逐字段触发 onSettingsChange；
     * 调用方需自行 setViewerSettingsSyncEnabled(true) 来桥接。
     */
    public setAISelections(partial: Partial<IAISelections>) {
        setAISelections(partial);
        this.aiDialog?.refreshEngine();
        this.aiDialog?.refreshOutputLanguage();
        this.aiDialog?.refreshPrompts();
        this.aiDialog?.refreshModels();
        this.refreshAISettingsToolbar();
    }

    /** 获取当前 AI 引擎：vscode（GitHub Copilot） 或 custom（用户自定义模型） */
    public getAIEngine(): AIEngine {
        return getAIEngine();
    }

    public setAIEngine(engine: AIEngine) {
        setAIEngine(engine);
        this.aiDialog?.refreshEngine();
        this.refreshAISettingsToolbar();
    }

    /** 获取当前选中的提示词 id（空串表示未选） */
    public getAISelectedPrompt(): string {
        return getAISelectedPrompt();
    }

    public setAISelectedPrompt(id: string) {
        setAISelectedPrompt(id);
        this.aiDialog?.refreshPrompts();
        this.refreshAISettingsToolbar();
    }

    /** 获取当前选中的模型 id（空串表示未选） */
    public getAISelectedModel(): string {
        return getAISelectedModel();
    }

    public setAISelectedModel(id: string) {
        setAISelectedModel(id);
        this.aiDialog?.refreshModels();
        this.refreshAISettingsToolbar();
    }

    /** 获取当前输出语言 */
    public getAIOutputLanguage(): AIOutputLanguage {
        return getAIOutputLanguage();
    }

    public setAIOutputLanguage(lang: AIOutputLanguage) {
        setAIOutputLanguage(lang);
        this.aiDialog?.refreshOutputLanguage();
        this.refreshAISettingsToolbar();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // AI 配置公共 API — 批量接口
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * 一次性读取全部 AI 配置：prompts / models / presets / selections。
     */
    public getAISettings(): IAISettings {
        return getAISettings();
    }

    /**
     * 一次性应用 AI 配置的 partial 更新。每个字段可选；未提供则保持不变。
     *
     * 注意：本方法是程序化 API 调用，**不会**逐字段触发 onSettingsChange 回调。
     * 但会触发一次 notifyViewerSettingsChange() 让宿主侧的 onSettingsChange 收到通知。
     */
    public setAISettings(patch: IAISettingsPatch) {
        setAISettings(patch);
        this.aiDialog?.refreshPrompts();
        this.aiDialog?.refreshModels();
        this.aiDialog?.refreshPresets();
        this.aiDialog?.refreshEngine();
        this.aiDialog?.refreshOutputLanguage();
        this.refreshAISettingsToolbar();
    }

    /** 工具栏 AI 设置面板若已挂载则重建 HTML */
    private refreshAISettingsToolbar() {
        const settingsItem = this.vditor?.toolbar?.elements?.settings;
        if (!settingsItem) return;
        const panelElement = settingsItem.querySelector(".vditor-hint") as HTMLElement | null;
        if (panelElement) {
            panelElement.innerHTML = buildSettingsPanelHTML(this.vditor);
        }
        refreshAISettingsToolbarPanel(this.vditor);
    }

    /** 构造 AI 命名空间（vd.ai.*），所有方法 1:1 委托给对应的扁平方法 */
    private buildAINamespace(): IVditorAI {
        return {
            // Prompts
            getPrompts: () => this.getAIPrompts(),
            setPrompts: (prompts) => this.setAIPrompts(prompts),
            addPrompt: (input) => this.addAIPrompt(input),
            updatePrompt: (id, patch) => this.updateAIPrompt(id, patch),
            removePrompt: (id) => this.removeAIPrompt(id),
            // Models
            getModels: () => this.getAIModels(),
            setModels: (models) => this.setAIModels(models),
            addModel: (input) => this.addAIModel(input),
            updateModel: (id, patch) => this.updateAIModel(id, patch),
            removeModel: (id) => this.removeAIModel(id),
            // Presets
            getPresets: () => this.getAIPresets(),
            setPresets: (presets) => this.setAIPresets(presets),
            addPreset: (input) => this.addAIPreset(input),
            updatePreset: (key, patch) => this.updateAIPreset(key, patch),
            removePreset: (key) => this.removeAIPreset(key),
            resetPresets: () => this.resetAIPresets(),
            // Selections
            getSelections: () => this.getAISelections(),
            setSelections: (partial) => this.setAISelections(partial),
            getEngine: () => this.getAIEngine(),
            setEngine: (engine) => this.setAIEngine(engine),
            getSelectedPrompt: () => this.getAISelectedPrompt(),
            setSelectedPrompt: (id) => this.setAISelectedPrompt(id),
            getSelectedModel: () => this.getAISelectedModel(),
            setSelectedModel: (id) => this.setAISelectedModel(id),
            getOutputLanguage: () => this.getAIOutputLanguage(),
            setOutputLanguage: (lang) => this.setAIOutputLanguage(lang),
            // 批量
            getSettings: () => this.getAISettings(),
            setSettings: (patch) => this.setAISettings(patch),
        };
    }

    /** 启用或禁用配置文件同步 */
    public setViewerSettingsSyncEnabled(enabled: boolean) {
        enableViewerSettingsSync(enabled);
    }

    /** 导出当前全局设置（用于写入配置文件） */
    public exportViewerSettings(): ViewerSettingsExport {
        return exportViewerSettings();
    }

    /** 从配置文件导入并应用全局设置 */
    public applyViewerSettings(data: ViewerSettingsExport) {
        importViewerSettings(data);
        applyEditorSettings(this.vditor.element);
        const outlineWidth = getGlobalLocalStorageSetting<number>("outlineWidth");
        if (outlineWidth && this.vditor.outline?.element) {
            this.vditor.outline.element.style.width = `${outlineWidth}px`;
        }
        const outlineEnable = getGlobalLocalStorageSetting<boolean>("outlineEnable");
        if (outlineEnable !== undefined) {
            this.vditor.options.outline.enable = outlineEnable === true || outlineEnable === "true";
        }
        const settingsItem = this.vditor.toolbar.elements.settings;
        const panelElement = settingsItem?.querySelector(".vditor-hint") as HTMLElement | null;
        if (panelElement) {
            panelElement.innerHTML = buildSettingsPanelHTML(this.vditor);
        }
        refreshSettingsToolbarPanel(this.vditor);
        refreshAISettingsToolbarPanel(this.vditor);
    }

    /** 打开 AI 润色弹窗，由外部（右键菜单等）调用。
     *  选区 / 全文 都用结构化 markdown 喂给 AI（rangeToMarkdown 内部处理 html-inline / math / color span） */
    public openAIPolishDialog() {
        if (!this.aiDialog) { return; }
        // 清理前一次的 frozen selection 高亮，避免叠加（LOW-8）
        hideFrozenSelection(this.vditor);
        // 捕获当前选区
        const range = captureEditorSelection(this.vditor);
        this.aiSelectionRange = range;
        if (range) {
            showFrozenSelection(this.vditor, range);
        }
        // 关键修复：用 rangeToMarkdown 取结构化 markdown（不是 selection.toString() 纯文本）
        const sel = rangeToMarkdown(this.vditor, range);
        this.aiDialog.open(sel || this.getValue(), !!sel);
    }

    /**
     * 获取当前选区的结构化 markdown。
     * 与 getSelection()（返回纯文本）区别：保留 html-inline shell / 行内 math / color span 等结构。
     * 折叠选区返回 ""。
     */
    public getSelectionMarkdown(): string {
        return rangeToMarkdown(this.vditor, getEditorRange(this.vditor));
    }

    /**
     * 触发 AI 润色，但用结构化 markdown（不是 getSelection 纯文本）作为原文。
     * 选区模式 / 全文模式由 isSelection 参数控制。
     * 适用于宿主脚本 / 编程调用场景。
     */
    public triggerAIPolishSelection(options?: IAIPolishOptions, isSelection?: boolean) {
        this.triggerAIPolish(options, this.getSelectionMarkdown(), isSelection);
    }

    /**
     * 打开 AI 浮动输入面板，位置跟随 target 元素（块或选区 Range）。
     * 面板显示在 target 下方，溢出则翻到上方。
     * 与 openAIPolishDialog（模态弹窗）并存，互不影响。
     */
    public openAIInputPanel(target: HTMLElement | Range) {
        this.aiInputPanel?.open(target);
    }

    /** 关闭 AI 浮动输入面板 */
    public closeAIInputPanel() {
        this.aiInputPanel?.close();
    }

    /** AI 浮动输入面板是否已打开 */
    public isAIInputPanelOpen(): boolean {
        return !!this.aiInputPanel?.isOpen();
    }

    /** 打开设置面板。若已打开则 no-op；面板未渲染（toolbar 不含 settings 项）也无操作 */
    public openSettings() {
        const settingsItem = this.vditor.toolbar.elements.settings;
        if (!settingsItem) { return; }
        const panel = settingsItem.querySelector<HTMLElement>(".vditor-hint");
        if (!panel || panel.style.display === "block") { return; }
        (settingsItem.children[0] as HTMLElement).dispatchEvent(
            new MouseEvent(getEventName(), { bubbles: true, cancelable: true }),
        );
    }

    /** 关闭设置面板。若未打开则 no-op */
    public closeSettings() {
        const settingsItem = this.vditor.toolbar.elements.settings;
        if (!settingsItem) { return; }
        const panel = settingsItem.querySelector<HTMLElement>(".vditor-hint");
        if (!panel || panel.style.display !== "block") { return; }
        (settingsItem.children[0] as HTMLElement).dispatchEvent(
            new MouseEvent(getEventName(), { bubbles: true, cancelable: true }),
        );
    }

    /**
     * 触发 AI 润色。capturedMarkdown/isSelection 由调用方在失焦前预先捕获，避免选区丢失。
     * @param target 可选目标元素（HTMLElement=块 / Range=选区）。传入时自动设置 aiSelectionRange，
     *               并强制按"selection"模式（replaceAll=false）走 in-place 替换。
     */
    public triggerAIPolish(
        options?: IAIPolishOptions,
        capturedMarkdown?: string,
        isSelection?: boolean,
        target?: HTMLElement | Range,
    ) {
        const onPolish = this.vditor.options.ai?.onPolish;
        if (!onPolish) { return; }
        // 根据 target 自动设置 selection range（用于 Accept 时 in-place 替换）
        if (target instanceof HTMLElement) {
            const range = document.createRange();
            range.selectNodeContents(target);
            this.aiSelectionRange = range;
            isSelection = true;  // 强制按 selection 模式
        } else if (target instanceof Range) {
            this.aiSelectionRange = target.cloneRange();
            isSelection = true;
        }
        const replaceAll = isSelection !== undefined ? !isSelection : !this.getSelection();
        this.aiReplaceAll = replaceAll;
        const markdown = capturedMarkdown ?? (this.getSelection() || this.getValue());
        // 重置工具调用流式累积 buffer（每次新触发清零）
        this.toolCallArgBuffer = "";
        this.lastStreamedMarkdown = "";
        this.disabled();
        if (this.aiSelectionRange) {
            showFrozenSelection(this.vditor, this.aiSelectionRange);
        }
        const finishReview = (cancel = false, restoreSelection = true) => {
            const range = this.aiSelectionRange;
            const hadSelection = !!range && !this.aiReplaceAll;
            this.enable();
            hideFrozenSelection(this.vditor);
            this.aiSelectionRange = null;
            this.aiReviewPanel.close();
            if (restoreSelection && hadSelection) {
                restoreEditorSelection(this.vditor, range);
            } else if (restoreSelection) {
                this.focus();
            }
            // M13 修复：只在 Stop 路径（cancel=true）abort，Reject 不再无意义 abort
            // Reject 时 LLM 已 settled（fetch 完成）→ AbortController.abort() 是 no-op
            if (cancel) {
                this.vditor.options.ai?.onCancelPolish?.();
            }
        };
        this.aiReviewPanel.open(
            markdown,
            {
                onAccept: (result) => {
                    const range = this.aiSelectionRange?.cloneRange() || null;
                    finishReview(false, false);
                    this.applyAIResult(result, this.aiReplaceAll, range);
                },
                onReject: () => finishReview(false),
                onStop: () => finishReview(true),
            },
        );
        telemetry(this.vditor, "markdown.ai.polish", {
            engine: options?.engine ?? "vscode",
            isSelection: !replaceAll,
        });
        onPolish(markdown, (_result: string) => { /* streaming via streamAIChunk/endAIStream */ }, options);
    }

    // 工具调用模式：从 tool_calls.function.arguments 流式累积 partial JSON 字符串
    // 每个 chunk 是 JSON 的一部分（"{\\"markdown\\": \\"Hel"  →  "lo world\\"}"）
    // 用正则从累积 buffer 提取 markdown 字段，stream delta 给审阅面板
    private toolCallArgBuffer = "";
    private lastStreamedMarkdown = "";

    /** 流式接收 AI chunk。兼容两种模式：
     *  1) 旧模式：chunk 是 markdown 文本（直接 stream）
     *  2) 工具调用模式：chunk 是 tool_calls.function.arguments 的 partial JSON 字符串
     *     → 用正则提取 "markdown" 字段，stream delta */
    public streamAIChunk(chunk: string) {
        this.toolCallArgBuffer += chunk;
        // 尝试完整 JSON.parse（流结束时能成功）
        let parsedMarkdown: string | null = null;
        try {
            const parsed = JSON.parse(this.toolCallArgBuffer);
            if (parsed && typeof parsed.markdown === "string") {
                parsedMarkdown = parsed.markdown;
            }
        } catch {
            // partial JSON，用正则尝试提取
            const match = this.toolCallArgBuffer.match(/"markdown"\s*:\s*"((?:[^"\\]|\\.)*)/);
            if (match) {
                parsedMarkdown = match[1]
                    .replace(/\\"/g, '"')
                    .replace(/\\n/g, '\n')
                    .replace(/\\t/g, '\t')
                    .replace(/\\r/g, '\r')
                    .replace(/\\\\/g, '\\');
            }
        }
        if (parsedMarkdown === null) return;
        if (parsedMarkdown.length > this.lastStreamedMarkdown.length) {
            const delta = parsedMarkdown.slice(this.lastStreamedMarkdown.length);
            this.aiReviewPanel.stream(delta);
            this.lastStreamedMarkdown = parsedMarkdown;
        }
    }

    /** AI 流结束，启用 Accept 按钮 */
    public endAIStream() {
        this.aiReviewPanel.endStream();
        this.toolCallArgBuffer = "";
        this.lastStreamedMarkdown = "";
    }

    /** AI 润色块：把整个块的 markdown 提取出来（保留 html-inline / 行内公式等结构）→ 走 triggerAIPolish。
     *  用户在审阅面板点 Accept 后，applyAIResult 会把块原位置替换为润色后的 markdown。
     *  与 openAIPolishDialog 不同：openAIPolishDialog 用 getSelection().toString() 取原文，
     *  会丢掉 <span style="..."> 这类 html-inline 包装；本方法用 blockToMarkdown 提取，
     *  保证原文是结构化的 markdown 文本。
     *
     * 简化：把 block 直接作为 target 传给 triggerAIPolish，由其内部设置 aiSelectionRange
     *       和显示 frozen selection。无需手动 focus / setSelectionFocus / captureEditorSelection。
     */
    public triggerAIPolishBlock(block: HTMLElement) {
        const vditor = this.vditor;
        const onPolish = vditor.options.ai?.onPolish;
        if (!onPolish) { return; }

        // 1. 提取块的干净 markdown（与"复制为 Markdown"使用同一逻辑）
        //    通过 vditor.lute.VditorDOM2Md 正确处理 data-type="html-inline" / "math-inline" 等
        const blockMarkdown = blockToMarkdown(vditor, block);
        if (!blockMarkdown) {
            vditor.tip?.show("无法提取块内容", 1500);
            return;
        }

        // 2. 走 triggerAIPolish 并把 block 作为 target：
        //    - 自动设置 aiSelectionRange（block 的 content range）
        //    - 强制 isSelection=true 走 in-place 替换（Accept 后只替换这块）
        //    - 显示 frozen selection 视觉反馈
        this.triggerAIPolish({}, blockMarkdown, true, block);
    }

    /** 接收 AI 润色结果：退出 loading 状态，将 markdown 并入正文 */
    public applyAIResult(markdown: string, replaceAll = false, selectionRange?: Range | null) {
        this.enable();
        hideFrozenSelection(this.vditor);
        if (replaceAll) {
            // C6 修复：full-text 替换必须入 undo 栈——之前 setValue 后直接 return，
            // 用户点 Accept 后按 Cmd+Z 不能撤销 AI 全文润色
            this.aiSelectionRange = null;
            this.setValue(markdown);
            recordHistoryChange(this.vditor);
            return;
        }
        const range = selectionRange ?? this.aiSelectionRange;
        this.aiSelectionRange = null;
        const editor = this.vditor[this.vditor.currentMode].element;
        // HIGH-4 / C7 安全网：range 不可用时不再盲目 execCommand("delete")（会撕 html-inline）
        // - range 是 null / collapsed
        // - range 的起止节点已不属于当前编辑器（被外部 DOM 操作移除）
        // - range.startContainer 等于 range.endContainer 但等于 editor（退化情形）
        // 这些情况都走"光标落到最近块首 + 整段替换该块"
        const rangeValid = !!range && !range.collapsed
            && editor.contains(range.startContainer)
            && editor.contains(range.endContainer);

        let didReplace = false;
        if (rangeValid) {
            const hostBlock = hasClosestBlock(range.startContainer) as HTMLElement | null;
            this.vditor[this.vditor.currentMode].preventInput = true;
            range.deleteContents();
            range.collapse(true);
            setSelectionFocus(range);
            this.vditor[this.vditor.currentMode].range = range;
            const editorHTML = this.vditor.currentMode === "wysiwyg"
                ? this.vditor.lute.Md2VditorDOM(markdown.trim())
                : this.vditor.lute.Md2VditorIRDOM(markdown.trim());
            insertMdForAIReplace(editorHTML, this.vditor, hostBlock);
            didReplace = true;
        } else {
            // C7 修复：fallback 路径必须显式提示用户——之前是"安全降级"但实际是
            // 静默替换第一个块（不是用户原选区所在的块）。现在 tip 告知 + console.warn。
            console.warn("[applyAIResult] selection range is invalid, falling back to first block");
            this.vditor.tip?.show("AI 范围失效，已替换首个块（请重新选择后重试）", 3000);
            const fallbackBlock = hasClosestBlock(editor) as HTMLElement | null
                || editor.querySelector(".vditor-wysiwyg__block, .vditor-ir__node") as HTMLElement | null;
            if (fallbackBlock) {
                const blockMarkdown = blockToMarkdown(this.vditor, fallbackBlock);
                const replacement = markdown.trim();
                if (blockMarkdown.trim() === replacement) {
                    // 内容没变，不做任何修改（避免无意义替换）
                    return;
                }
                const editorHTML = this.vditor.currentMode === "wysiwyg"
                    ? this.vditor.lute.Md2VditorDOM(replacement)
                    : this.vditor.lute.Md2VditorIRDOM(replacement);
                this.vditor[this.vditor.currentMode].preventInput = true;
                fallbackBlock.innerHTML = "";
                insertMdForAIReplace(editorHTML, this.vditor, fallbackBlock);
                didReplace = true;
            } else {
                // 完全没有块——走 setValue（极少见），同样要入栈
                this.setValue(markdown);
                recordHistoryChange(this.vditor);
                return;
            }
        }
        // 后续的 preview 渲染 / CM 重建 / undo 记录，valid + fallback 两个分支都需要
        if (didReplace) {
            editor.querySelectorAll(`.vditor-${this.vditor.currentMode}__preview[data-render='2']`)
                .forEach((item: HTMLElement) => {
                    processCodeRender(item, this.vditor);
                });
            if (this.vditor.currentMode === "wysiwyg") {
                renderCodeBlocks(this.vditor);
            }
            recordHistoryChange(this.vditor);
        }
    }

    /** 销毁编辑器 */
    public destroy() {
        this.vditor.element.innerHTML = this.vditor.originalInnerHTML;
        this.vditor.element.classList.remove("vditor");
        this.vditor.element.removeAttribute("style");
        this.clearCache();

        unbindTypewriterMode(this.vditor);
        this.vditor.wysiwyg.unbindListener();
    }

    private init(id: HTMLElement, mergedOptions: IOptions) {
        this.vditor = {
            currentMode: mergedOptions.mode,
            element: id,
            hint: new Hint(mergedOptions.hint.extend),
            lute: undefined,
            options: mergedOptions,
            originalInnerHTML: id.innerHTML,
            outline: new Outline(window.VditorI18n.outline),
            tip: new Tip(),
        };

        this.vditor.undo = new Undo();
        this.vditor.wysiwyg = new WYSIWYG(this.vditor);
        this.vditor.ir = new IR(this.vditor);
        this.vditor.toolbar = new Toolbar(this.vditor);

        if (typeof mergedOptions.onSettingsChange === "function") {
            setOnViewerSettingsChange((settings) => mergedOptions.onSettingsChange?.(settings));
        }

        if (mergedOptions.upload.url || mergedOptions.upload.handler) {
            this.vditor.upload = new Upload();
        }

        addScript(
            mergedOptions._lutePath ||
            `lutePro.min.js`,
            "vditorLuteScript",
        ).then(() => {
            this.vditor.lute = setLute({
                autoSpace: this.vditor.options.preview.markdown.autoSpace,
                codeBlockPreview: this.vditor.options.preview.markdown
                    .codeBlockPreview,
                fixTermTypo: this.vditor.options.preview.markdown.fixTermTypo,
                footnotes: this.vditor.options.preview.markdown.footnotes,
                headingAnchor: false,
                inlineMathDigit: this.vditor.options.preview.math.inlineDigit,
                linkBase: this.vditor.options.preview.markdown.linkBase,
                linkPrefix: this.vditor.options.preview.markdown.linkPrefix,
                listStyle: this.vditor.options.preview.markdown.listStyle,
                mark: this.vditor.options.preview.markdown.mark,
                mathBlockPreview: this.vditor.options.preview.markdown
                    .mathBlockPreview,
                paragraphBeginningSpace: this.vditor.options.preview.markdown
                    .paragraphBeginningSpace,
                sanitize: this.vditor.options.preview.markdown.sanitize,
                toc: this.vditor.options.preview.markdown.toc,
            });

            initUI(this.vditor);

            if (mergedOptions.ai?.onPolish) {
                this.aiDialog = new AIDialog(this.vditor, (markdown, isSelection, options) => {
                    this.triggerAIPolish(options, markdown, isSelection);
                }, (reason) => {
                    if (reason !== "submit") {
                        hideFrozenSelection(this.vditor);
                        this.aiSelectionRange = null;
                    }
                });
            }

            // AI 浮动输入面板（follow-target）。不需要 onPolish 即可实例化。
            if (!this.aiInputPanel) {
                this.aiInputPanel = new AIInputPanel(this.vditor);
            }

            if (mergedOptions.after) {
                mergedOptions.after();
            }
        });
    }
}

export default Vditor;
