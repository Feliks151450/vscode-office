import {Constants} from "../constants";
import {afterRenderEvent} from "./afterRenderEvent";

export interface IColorStyle {
    color?: string;
    backgroundColor?: string;
}

/**
 * 把当前选区包成 html-inline 外壳（<span data-type="html-inline" contenteditable="false"
 * data-md-source="..."><span class="vditor-html-inline__display">...</span></span>）。
 *
 * 完全复用 htmlInlineEditor.ts 里 renderHtmlInlineFromMd 的渲染路径，让 Lute 负责：
 *   1. Md2VditorDOM 解析 <span style="...">text</span> → 生成完整的 html-inline shell
 *   2. VditorDOM2Md 读 data-md-source → 序列化为 <span style="...">text</span>
 *   3. 后续用户点选 → handleHtmlEditorClick 自动弹出已存在的 HTML 编辑弹窗
 *   4. input() 触发的 SpinVditorDOM 也会原样保留 shell（contenteditable=false 是原子单元）
 *
 * 返回 true 表示成功，false 表示无可用选区或参数无效。
 */
export const setSelectionColor = (
    vditor: IVditor,
    style: IColorStyle,
): boolean => {
    const css: string[] = [];
    if (style.color) css.push(`color:${style.color}`);
    if (style.backgroundColor) css.push(`background-color:${style.backgroundColor}`);
    if (css.length === 0) return false;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return false;
    const range = selection.getRangeAt(0);
    if (range.collapsed) return false;
    if (vditor.currentMode !== "wysiwyg") return false;

    // 选区内的纯文本（HTML 转义后用于嵌入 Markdown 源）
    const rawText = range.toString();
    if (!rawText) return false;
    const escapedText = escapeHtmlText(rawText);

    const cssAttr = css.join(";");
    const mdSource = `<span style="${cssAttr}">${escapedText}</span>`;

    // 复用 htmlInlineEditor.ts 的渲染套路：两端加 ZWSP 让 Lute 识别为内联 HTML
    const wrapper = `${Constants.ZWSP}${mdSource}${Constants.ZWSP}`;
    const html = vditor.lute.Md2VditorDOM(wrapper);

    const temp = document.createElement("div");
    temp.innerHTML = html;
    const shell = temp.querySelector('[data-type="html-inline"]') as HTMLElement | null;
    if (!shell) {
        return false;
    }

    // 用真实的 DOM 节点（不能直接 insertNode(shell) — 节点还属于 temp，会被一起销毁）
    const shellClone = shell.cloneNode(true) as HTMLElement;

    // 替换选区内容
    range.deleteContents();
    range.insertNode(shellClone);

    // 标记 preventInput，避免浏览器 input 事件把新节点当成用户输入的副作用抹掉
    vditor.wysiwyg.preventInput = true;
    afterRenderEvent(vditor);

    // 光标移到 shell 之后，DOM 没变、原 selection 已被 deleteContents 清空，需要补一个
    selection.removeAllRanges();
    const newRange = document.createRange();
    newRange.setStartAfter(shellClone);
    newRange.collapse(true);
    selection.addRange(newRange);

    return true;
};

const escapeHtmlText = (text: string): string => text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");