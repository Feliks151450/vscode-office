import {
    flushCodeMirrorToSyncCode,
    buildEditorHtmlForMarkdown,
} from "../codeBlock/codeMirrorManager";
import {flushInlineMathToSyncCode} from "../math/inlineMathCodeMirror";
import {flushFrontMatterYamlToSyncCode} from "../codeBlock/frontMatterEditor";
import {Constants} from "../constants";

/**
 * 把编辑器**实时状态**同步到 DOM 节点。
 *
 * 这一步必须在 clone 之前完成 —— CodeMirror / 行内 math CM 的 sync 是把内存里的
 * 编辑缓冲写回 `<code>` / `<pre>` 节点；clone 之后这些节点已经被 snapshot，再
 * sync 写回的是 live editor，clone 里看到的是 stale 文本。
 *
 *   - CodeMirror 代码块 → `<code data-type="code-block">` textContent
 *   - 行内 math CM → `<code data-type="math-inline">` textContent
 *   - YAML front matter → 隐藏 code 节点 + 关闭 popover
 *
 * 高频调用：开 AI 弹窗、复制、剪切、块菜单都先调一次。
 * 低开销：no-op 时是简单的 querySelectorAll + Map.get。
 */
export const flushEditorState = (vditor: IVditor, opts: { flushFrontMatter?: boolean } = {}) => {
    flushCodeMirrorToSyncCode(vditor);
    flushInlineMathToSyncCode(vditor[vditor.currentMode].element);
    if (opts.flushFrontMatter !== false) {
        flushFrontMatterYamlToSyncCode(vditor);
    }
};

/**
 * 把编辑器 DOM 片段清理成"适合 VditorDOM2Md 的形式"。
 *
 * 这是所有"取 markdown"出口的统一入口：getValue / 块菜单复制 / AI 润色 / 复制粘贴 /
 * 编程 API 等都先调它，消除 5 个漂移实现各自维护的清理逻辑。
 *
 * **重要契约**：这是**只读**操作 —— 不修改 caller 传入的 root 元素指向的 DOM 树。
 * 不会 flush live editor 状态（那是 flushEditorState 的职责）；caller 负责在 clone
 * 之前调一次 flushEditorState。
 *
 * 清理步骤：
 *   1. 删 .vditor-wysiwyg__preview / .vditor-ir__preview（math/code 块的 SVG 预览）
 *   2. 删 .cm-editor / .vditor-cm-chrome / .vditor-cm-host / .vditor-editor-boundary
 *      / .vditor-math-inline__cm-host（CM 实例化容器）
 *   3. 删 .vditor-html-inline__preview / .vditor-html-inline__render
 *      （html-inline 内部渲染产物）
 *   4. 行内 math editing 态：清 class + 剥 contenteditable，让 <code> 重新可见
 *   5. 行内 math <code>：剥开头 ZWSP（CM 文档同步后可能带）
 *   6. html-inline shell：把 data-md-source 还原成 shell 内部 HTML，让 Lute 读 data-md-source 输出
 *   7. 屏外代码块复位：editPre.display = block / code 取消 hidden（防止屏外懒加载态
 *      下 <pre style="display:none"><code hidden> 的源码被吞）
 *
 * 返回值：清理后的 HTML 字符串（用于直接传给 lute.VditorDOM2Md）。
 */
export const cleanFragmentForMarkdown = (vditor: IVditor, root: HTMLElement): string => {
    // 1) 删块级预览（math/code 块的 SVG 预览）
    root.querySelectorAll(".vditor-wysiwyg__preview, .vditor-ir__preview").forEach((el) => el.remove());

    // 2) 删 CodeMirror 实例化容器
    root.querySelectorAll(
        ".vditor-math-inline__cm-host, .cm-editor, .vditor-cm-chrome, .vditor-cm-host, .vditor-editor-boundary",
    ).forEach((el) => el.remove());

    // 3) 删 html-inline 内部预览渲染层
    root.querySelectorAll(".vditor-html-inline__preview, .vditor-html-inline__render").forEach((el) => el.remove());

    // 4) 行内 math editing 态：清 class + 剥 contenteditable，让 <code> 重新可见
    root.querySelectorAll(".vditor-math-inline--editing").forEach((el) => {
        el.classList.remove("vditor-math-inline--editing");
        el.removeAttribute("contenteditable");
    });

    // 5) 行内 math <code>：剥开头 ZWSP（CM 文档同步后仍可能带）
    //    注意：替换目标必须是 Constants.ZWSP（U+200B），不是空字符串——之前版本写成
    //    `replaceAll("", "")` 是 ECMAScript 规范下的 no-op，两个参数都是空串。
    //    优先改 textNode 节点值（保留子结构），fallback 到 textContent（拍平）
    root.querySelectorAll("code[data-type='math-inline']").forEach((el) => {
        if (el.firstChild?.nodeType === 3) {
            (el.firstChild as Text).nodeValue =
                ((el.firstChild as Text).nodeValue || "").replaceAll(Constants.ZWSP, "");
        } else {
            el.textContent = (el.textContent || "").replaceAll(Constants.ZWSP, "");
        }
    });

    // 6) html-inline shell：把 data-md-source 还原成内部 HTML，让 Lute 读到原始 markdown 源
    root.querySelectorAll('[data-type="html-inline"]').forEach((el) => {
        const shell = el as HTMLElement;
        const source = shell.getAttribute("data-md-source");
        if (source !== null) {
            shell.innerHTML = source;
        }
    });

    // 7) 屏外代码块复位：屏外懒加载会把 editPre.display 设为空 / code 设为 hidden，
    //    不复位的话 Lute 看到空内容。修屏外代码块的 source 丢失。
    root.querySelectorAll("[data-type='code-block'], [data-type='math-block']").forEach((block) => {
        const editPre = block.querySelector(
            "pre.vditor-wysiwyg__pre, pre.vditor-ir__marker--pre",
        ) as HTMLElement | null;
        const code = editPre?.querySelector("code") as HTMLElement | null;
        if (editPre) {
            editPre.style.display = "block";
        }
        if (code) {
            code.removeAttribute("hidden");
            code.style.display = "";
        }
    });

    return root.innerHTML;
};

/**
 * 把选区 Range 转成结构化 Markdown。
 *
 * 这是所有"选区模式"的统一入口：AI 润色 / 复制粘贴 / 编程 API `getSelectionMarkdown` 都走这个。
 *
 * 与 `selection.toString()` 区别：
 *   - selection.toString() 返回 innerText，丢所有 Vditor 专属结构（html-inline / math-inline / color span）
 *   - rangeToMarkdown 返回结构化 markdown（保留 `<html-inline>` 块、行内公式 `$...$`、颜色 `<span style>`）
 *
 * 行为：
 *   - 折叠选区（光标）返回 ""
 *   - null/undefined range 返回 ""
 *   - 非折叠选区返回 markdown 字符串
 *
 * 不调 VditorDOM2Md 的 fallback 失败时返回 "" + console.error
 */
export const rangeToMarkdown = (vditor: IVditor, range: Range | null | undefined): string => {
    if (!range || range.collapsed) {
        return "";
    }
    // clone 之前先 flush live editor（caller 不需要关心这个时序）
    try {
        flushEditorState(vditor, { flushFrontMatter: false });
    } catch (err) {
        console.error("[rangeToMarkdown] flushEditorState failed:", err);
    }
    // n1 修复：cloneContents 在 range detached 时抛 InvalidStateError——快速点击场景
    // （bubble menu mousedown handler 期间 selectionchange 让 container 被 remove）会触发
    let fragment: DocumentFragment;
    try {
        fragment = range.cloneContents();
    } catch (err) {
        console.error("[rangeToMarkdown] cloneContents failed (range detached?):", err);
        return "";
    }
    const container = document.createElement("div");
    container.appendChild(fragment);
    const html = cleanFragmentForMarkdown(vditor, container);
    try {
        return vditor.currentMode === "ir"
            ? (vditor.lute?.VditorIRDOM2Md(html) ?? "")
            : (vditor.lute?.VditorDOM2Md(html) ?? "");
    } catch (err) {
        console.error("[rangeToMarkdown] lute convert failed:", err);
        return "";
    }
};

/**
 * 把整个编辑器 DOM 转成 markdown（getValue 的核心实现）。
 *
 * 这是 getValue() / setEditMode 切模式 / triggerAIPolish 无选区 fallback 共用的入口。
 * 等价于 buildEditorHtmlForMarkdown + VditorDOM2Md，但统一通过 cleanFragmentForMarkdown 走。
 */
export const rootToMarkdown = (vditor: IVditor): string => {
    const html = buildEditorHtmlForMarkdown(vditor);
    try {
        return vditor.currentMode === "ir"
            ? (vditor.lute?.VditorIRDOM2Md(html) ?? "")
            : (vditor.lute?.VditorDOM2Md(html) ?? "");
    } catch (err) {
        console.error("[rootToMarkdown] lute convert failed:", err);
        return "";
    }
};