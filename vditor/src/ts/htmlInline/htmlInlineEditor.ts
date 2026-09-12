import { indentLess } from "@codemirror/commands";
import { Compartment } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";

import { getModeEditorElement, getModePopover } from "../codeBlock/codeBlockLanguagePopover";
import { loadCodeMirrorHighlightLanguage } from "../codeBlock/codeBlockHighlightLanguages";
import { stopHandledCodeMirrorKeymap, vditorCodeMirrorSetup } from "../codeBlock/codeMirrorSetup";
import { Constants } from "../constants";
import { hasClosestByAttribute, hasClosestByClassName } from "../util/hasClosest";
import { resolveAdjacentElementFromRange } from "../util/rangeAdjacentElement";
import { getEditorRange, setSelectionFocus } from "../util/selection";
import { formatAltEnterHotkeyTip } from "../util/compatibility";
import { codicon } from "../util/codicon";
import {
    getGlobalLocalStorageSetting,
    HTML_EDITOR_LINE_WRAP_KEY,
    setGlobalLocalStorageSetting,
} from "../util/globalLocalStorageSettings";
import { afterRenderEvent } from "../wysiwyg/afterRenderEvent";
import { processAfterRender } from "../ir/process";
import { telemetry } from "../util/telemetry";
import { resolveTextColors, resolveBgColors } from "../util/colorPalette";
import {
    decodeHtmlInlineSource,
    escapeAttr,
    MD_SOURCE_ESC_NEWLINE,
    renderHtmlInlineShell,
} from "./htmlInlineShell";

const HTML_EDITOR_POPOVER_CLASS = "vditor-popover--html-inline";
const HTML_EDITOR_PANEL_CLASS = "vditor-panel--html-inline";
const POPOVER_INSET = 8;
const VIEWPORT_MARGIN = 12;

const decodeMdSourceAttr = (raw: string | null): string => decodeHtmlInlineSource(raw);

type HtmlEditTarget = {
    anchorElement: HTMLElement;
    focusElement: HTMLElement;
    getSource: () => string;
    applySource: (source: string) => HTMLElement | null;
    remove: () => void;
    /** 取消时执行（如清理"待包裹"锚点、还原选区） */
    onCancel?: () => void;
    /** 强制按行内类型处理（"待包裹"目标没有 data-type 属性） */
    inlineType?: boolean;
};

type HtmlEditorPopoverBinding = {
    view: EditorView;
    languageCompartment: Compartment;
    wrapCompartment: Compartment;
    lineWrapEnabled: boolean;
};

let activeHtmlEditorPopover: HtmlEditorPopoverBinding | null = null;
let positionAnchor: HTMLElement | null = null;
let positionVditor: IVditor | null = null;
let scrollRepositionHandler: (() => void) | null = null;
// 用户拖动 html 编辑器弹窗后此 flag 为 true，下一次 scroll-reposition 跳过
// 重新贴齐锚点的逻辑，避免把用户拖动后的位置又拽回去。
let htmlEditorPopoverDragged = false;

/**
 * "待包裹"状态：气泡菜单点"行内 html"按钮时只插入零宽锚点定位弹窗，
 * 真正把选中文本包成 shell 要等用户点保存（取消则原样保留）。
 */
let pendingHtmlWrap: { marker: HTMLElement; range: Range } | null = null;

const abortPendingHtmlWrap = (restoreSelection: boolean) => {
    if (!pendingHtmlWrap) {
        return;
    }
    pendingHtmlWrap.marker.remove();
    if (restoreSelection) {
        const selection = window.getSelection();
        if (selection && pendingHtmlWrap.range) {
            selection.removeAllRanges();
            selection.addRange(pendingHtmlWrap.range);
        }
    }
    pendingHtmlWrap = null;
};

const destroyHtmlEditorCodeMirror = () => {
    if (!activeHtmlEditorPopover) {
        return;
    }
    activeHtmlEditorPopover.view.destroy();
    activeHtmlEditorPopover = null;
};

const detachPopoverReposition = () => {
    if (scrollRepositionHandler) {
        window.removeEventListener("scroll", scrollRepositionHandler, true);
        if (positionVditor) {
            getModeEditorElement(positionVditor)?.removeEventListener("scroll", scrollRepositionHandler);
        }
    }
    scrollRepositionHandler = null;
    positionAnchor = null;
    positionVditor = null;
};

const getPopoverContainer = (editorElement: HTMLElement) => editorElement.parentElement as HTMLElement;

const isAnchorVisible = (editorElement: HTMLElement, anchorElement: HTMLElement) => {
    const anchorRect = anchorElement.getClientRects()[0] || anchorElement.getBoundingClientRect();
    const editorRect = editorElement.getBoundingClientRect();
    const viewportTop = Math.max(0, editorRect.top);
    const viewportBottom = Math.min(window.innerHeight, editorRect.bottom);
    const viewportLeft = Math.max(0, editorRect.left);
    const viewportRight = Math.min(window.innerWidth, editorRect.right);

    return anchorRect.bottom > viewportTop &&
        anchorRect.top < viewportBottom &&
        anchorRect.right > viewportLeft &&
        anchorRect.left < viewportRight;
};

const clampHtmlEditorPopoverPosition = (vditor: IVditor, anchorElement: HTMLElement) => {
    const popover = getModePopover(vditor);
    const editorElement = getModeEditorElement(vditor);
    if (!popover || !editorElement || !anchorElement.isConnected) {
        return;
    }
    const container = getPopoverContainer(editorElement);
    if (!container) {
        return;
    }

    popover.style.display = "block";
    const anchorRect = anchorElement.getClientRects()[0] || anchorElement.getBoundingClientRect();
    const popoverWidth = popover.offsetWidth;
    const popoverHeight = popover.offsetHeight;
    const containerRect = container.getBoundingClientRect();

    let viewportTop = anchorRect.bottom + POPOVER_INSET;
    let viewportLeft = anchorRect.left + POPOVER_INSET;

    if (viewportTop + popoverHeight > window.innerHeight - VIEWPORT_MARGIN) {
        const aboveTop = anchorRect.top - popoverHeight - POPOVER_INSET;
        if (aboveTop >= VIEWPORT_MARGIN) {
            viewportTop = aboveTop;
        } else {
            viewportTop = Math.max(
                VIEWPORT_MARGIN,
                window.innerHeight - popoverHeight - VIEWPORT_MARGIN,
            );
        }
    }
    if (viewportTop < VIEWPORT_MARGIN) {
        viewportTop = VIEWPORT_MARGIN;
    }

    if (viewportLeft + popoverWidth > window.innerWidth - VIEWPORT_MARGIN) {
        viewportLeft = window.innerWidth - popoverWidth - VIEWPORT_MARGIN;
    }
    if (viewportLeft < VIEWPORT_MARGIN) {
        viewportLeft = VIEWPORT_MARGIN;
    }

    const maxLeft = containerRect.left + container.clientWidth - popoverWidth - VIEWPORT_MARGIN;
    if (viewportLeft > maxLeft) {
        viewportLeft = Math.max(containerRect.left + VIEWPORT_MARGIN, maxLeft);
    }

    popover.style.position = "absolute";
    popover.style.top = `${Math.round(viewportTop - containerRect.top)}px`;
    popover.style.left = `${Math.round(viewportLeft - containerRect.left)}px`;

    const editorRect = editorElement.getBoundingClientRect();
    const anchorTopInEditor = anchorRect.top - editorRect.top + editorElement.scrollTop;
    popover.setAttribute("data-top", String(anchorTopInEditor + POPOVER_INSET));
};

const attachPopoverReposition = (vditor: IVditor, anchorElement: HTMLElement) => {
    detachPopoverReposition();
    positionAnchor = anchorElement;
    positionVditor = vditor;
    scrollRepositionHandler = () => {
        if (positionAnchor?.isConnected && positionVditor) {
            const editorElement = getModeEditorElement(positionVditor);
            if (!editorElement || !isAnchorVisible(editorElement, positionAnchor)) {
                hideHtmlEditorPopover(positionVditor);
                return;
            }
            // 用户拖动过之后，弹窗位置由用户控制，不再被 scroll 拽回锚点
            if (htmlEditorPopoverDragged) {
                return;
            }
            clampHtmlEditorPopoverPosition(positionVditor, positionAnchor);
        }
    };
    window.addEventListener("scroll", scrollRepositionHandler, true);
    getModeEditorElement(vditor)?.addEventListener("scroll", scrollRepositionHandler);
};

/**
 * 把 html 编辑器弹窗顶部 `handle` 做成可拖动抓手。
 *
 * 行为：
 *  - 拖拽时把 popover 从 `position: absolute`（依附容器坐标系，会跟着滚动）切到
 *    `position: fixed`（视口坐标系，拖到哪里就停在哪里）。
 *  - 真正移动过（didMove）才会标记 htmlEditorPopoverDragged，并取消后续
 *    scroll-reposition —— 否则点一下但没拖，popover 仍贴齐锚点。
 *  - 用 pointer 事件统一覆盖鼠标 / 触摸 + `setPointerCapture` 让指针离开 handle
 *    时仍能继续接收 move / up，不用再挂 window 级监听。
 */
const makePopoverDraggable = (popover: HTMLElement, handle: HTMLElement) => {
    let offsetX = 0;
    let offsetY = 0;
    let activePointerId: number | null = null;
    let didMove = false;

    const onPointerMove = (e: PointerEvent) => {
        if (e.pointerId !== activePointerId) {
            return;
        }
        didMove = true;
        const maxLeft = window.innerWidth - 40;
        const maxTop = window.innerHeight - 30;
        // 允许 popover 一半超出左侧（用户想往屏幕外拖时不会到一半就卡住），
        // 但要求右侧至少露出 40px 的拖动抓手；顶部不允许为负、下方同理。
        const newLeft = Math.max(
            -popover.offsetWidth / 2,
            Math.min(e.clientX - offsetX, maxLeft),
        );
        const newTop = Math.max(
            0,
            Math.min(e.clientY - offsetY, maxTop),
        );
        popover.style.left = `${newLeft}px`;
        popover.style.top = `${newTop}px`;
    };

    const endDrag = (e: PointerEvent) => {
        if (e.pointerId !== activePointerId) {
            return;
        }
        activePointerId = null;
        if (didMove) {
            // 真正拖过了，标记并取消锚点贴齐
            htmlEditorPopoverDragged = true;
            detachPopoverReposition();
        }
        handle.removeEventListener("pointermove", onPointerMove);
        handle.removeEventListener("pointerup", endDrag);
        handle.removeEventListener("pointercancel", endDrag);
    };

    handle.addEventListener("pointerdown", (e: PointerEvent) => {
        if (e.button !== 0) {
            return;
        }
        // 保留扩展位：未来如果头栏放了小按钮，让按钮自身的事件不被吞掉
        if ((e.target as HTMLElement).closest("button, input, textarea, [contenteditable]")) {
            return;
        }
        e.preventDefault();
        try {
            handle.setPointerCapture(e.pointerId);
        } catch {
            // 旧浏览器或非 pointer 场景兜底
        }
        activePointerId = e.pointerId;
        didMove = false;

        const rect = popover.getBoundingClientRect();
        offsetX = e.clientX - rect.left;
        offsetY = e.clientY - rect.top;

        // 切换到 fixed：从这一刻起坐标以视口为参照，
        // top / left 直接复用当前 rect 的视口位置
        popover.style.position = "fixed";
        popover.style.top = `${rect.top}px`;
        popover.style.left = `${rect.left}px`;
        popover.style.right = "";
        popover.style.bottom = "";

        handle.addEventListener("pointermove", onPointerMove);
        handle.addEventListener("pointerup", endDrag);
        handle.addEventListener("pointercancel", endDrag);
    });
};

const scheduleHtmlEditorPopoverPosition = (vditor: IVditor, anchorElement: HTMLElement) => {
    requestAnimationFrame(() => {
        if (!anchorElement.isConnected) {
            return;
        }
        clampHtmlEditorPopoverPosition(vditor, anchorElement);
        attachPopoverReposition(vditor, anchorElement);
    });
};

const hideHtmlEditorPopover = (vditor: IVditor) => {
    const popover = getModePopover(vditor);
    if (!popover) {
        return;
    }
    detachPopoverReposition();
    destroyHtmlEditorCodeMirror();
    htmlEditorPopoverDragged = false;
    popover.style.position = "";
    popover.style.display = "none";
    popover.classList.remove(HTML_EDITOR_POPOVER_CLASS, HTML_EDITOR_PANEL_CLASS);
    popover.innerHTML = "";
    // 弹窗关闭（取消 / 保存已先行清理 / 滚动移出视口）时废弃"待包裹"状态
    abortPendingHtmlWrap(true);
};

const restoreFocusAfterHtmlRemove = (
    vditor: IVditor,
    parent: HTMLElement | null,
    next: Node | null,
) => {
    const editorElement = getModeEditorElement(vditor);
    if (!editorElement) {
        return;
    }
    editorElement.focus({ preventScroll: true });
    if (!parent?.isConnected) {
        return;
    }
    const range = getEditorRange(vditor);
    if (next && parent.contains(next)) {
        if (next.nodeType === 3) {
            range.setStart(next, 0);
        } else {
            range.setStartBefore(next);
        }
    } else {
        parent.insertAdjacentHTML("beforeend", Constants.ZWSP);
        range.selectNodeContents(parent);
        range.collapse(false);
    }
    range.collapse(true);
    setSelectionFocus(range);
};

const restoreFocusToHtmlElement = (vditor: IVditor, element: HTMLElement | null) => {
    if (element?.tagName === "DIV") {
        return;
    }
    const editorElement = getModeEditorElement(vditor);
    if (!editorElement) {
        return;
    }
    editorElement.focus({ preventScroll: true });
    if (!element?.isConnected) {
        return;
    }
    const range = getEditorRange(vditor);
    element.insertAdjacentHTML("afterend", Constants.ZWSP);
    range.setStartAfter(element.nextSibling as Node);
    range.collapse(true);
    setSelectionFocus(range);
};

const closeHtmlEditorPopover = (
    vditor: IVditor,
    focusElement: HTMLElement | null,
    removedParent?: HTMLElement | null,
    removedNext?: Node | null,
) => {
    hideHtmlEditorPopover(vditor);
    if (removedParent !== undefined) {
        restoreFocusAfterHtmlRemove(vditor, removedParent, removedNext ?? null);
        return;
    }
    restoreFocusToHtmlElement(vditor, focusElement);
};

const notifyAfterHtmlEditorChange = (vditor: IVditor) => {
    if (vditor.currentMode === "ir") {
        processAfterRender(vditor);
        return;
    }
    afterRenderEvent(vditor);
};

/**
 * 把新的 color/background-color 合并到 Markdown 源里：
 *   - 如果最外层是 <span ... style="...">...</span>，合并到现有的 style 属性
 *   - 否则在最外层包一层新的 <span style="...">...</span>
 *
 * 为什么不走 save() 链路自动保存：用户在弹窗里可能想连续点击多个色块微调，
 * 改 CodeMirror 文档但保留手动 Save 入口更可控。
 */
/**
 * 把 CSS style 字符串解析为 key→value Map（同 key 后写覆盖前写）。
 * 抽出来给"源码模式合并"和"预览模式合并"两处共用，避免重复实现。
 */
const parseStyleAttr = (styleStr: string): Map<string, string> => {
    const map = new Map<string, string>();
    if (!styleStr) return map;
    styleStr.split(";").forEach(part => {
        const colonIdx = part.indexOf(":");
        if (colonIdx === -1) return;
        const k = part.slice(0, colonIdx).trim().toLowerCase();
        const v = part.slice(colonIdx + 1).trim();
        if (k && v) map.set(k, normalizeRgbToHex(v));
    });
    return map;
};

const serializeStyleMap = (map: Map<string, string>): string =>
    Array.from(map.entries())
        .map(([k, v]) => `${k}:${v}`)
        .join(";");

/**
 * 把 CSS 颜色里的 rgb(r, g, b) 转成 6 位 hex，其他格式（rgba、named、百分比等）原样保留。
 *
 * 为什么需要：CSSOM 赋值（el.style.color = "#dc2626"）后浏览器序列化 style 属性
 * 会归一化成 rgb(220, 38, 38)；字符串路径（setAttribute / mergeStyleIntoSource）
 * 则保留 hex。这里统一成 hex，避免同一份 markdown 里两种格式混用。
 */
const normalizeRgbToHex = (s: string): string =>
    s.replace(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/gi, (_match, r: string, g: string, b: string) => {
        const toHex = (n: string) => Math.min(255, Math.max(0, Number(n))).toString(16).padStart(2, "0");
        return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    });

const mergeStyleIntoSource = (
    source: string,
    newStyle: { color?: string; backgroundColor?: string },
): string => {
    const hasIncoming = newStyle.color || newStyle.backgroundColor;
    if (!hasIncoming) return source;

    const trimmed = source.trim();
    if (!trimmed) return source;

    const outerSpanMatch = trimmed.match(/^<span\b([^>]*)>([\s\S]*)<\/span>$/i);
    if (outerSpanMatch) {
        const attrs = outerSpanMatch[1];
        const inner = outerSpanMatch[2];
        const styleMatch = attrs.match(/\bstyle\s*=\s*"([^"]*)"/i);
        const styleMap = parseStyleAttr(styleMatch ? styleMatch[1] : "");
        // 用新值覆盖同名的旧值（color / background-color），而不是追加
        if (newStyle.color) styleMap.set("color", newStyle.color);
        if (newStyle.backgroundColor) styleMap.set("background-color", newStyle.backgroundColor);
        const merged = serializeStyleMap(styleMap);
        const newAttrs = attrs.replace(/\s*style\s*=\s*"[^"]*"/i, "").trim();
        const space = newAttrs ? " " : "";
        return `<span${space}${newAttrs} style="${merged}">${inner}</span>`;
    }
    // 没有外层 span：包一个新的，style 里只有新传入的色
    const parts: string[] = [];
    if (newStyle.color) parts.push(`color:${newStyle.color}`);
    if (newStyle.backgroundColor) parts.push(`background-color:${newStyle.backgroundColor}`);
    return `<span style="${parts.join(";")}">${trimmed}</span>`;
};

/**
 * 把 Markdown 源渲染成"预览模式"用的 HTML：调 Lute 的 Md2VditorDOM，
 * 剥掉 html-inline 外壳和 display 包装层，只留可编辑的内容。
 */
const renderInlineHtmlForPreview = (vditor: IVditor, md: string): string => {
    const trimmed = md.trim();
    if (!trimmed) return "";
    const wrapper = `${Constants.ZWSP}${trimmed}${Constants.ZWSP}`;
    const html = vditor.lute.Md2VditorDOM(wrapper);
    const temp = document.createElement("div");
    temp.innerHTML = html;
    const display = temp.querySelector(".vditor-html-inline__display");
    return display?.innerHTML ?? "";
};

/**
 * 把预览区的 DOM 树走一遍，生成 Markdown 源。
 *   - 跳过 ZWSP（边界标记）
 *   - span[style] → `<span style="...">...</span>`
 *   - 其他元素 → 透传子内容（剥外壳）
 *   - 文本节点 → 原样输出
 */
const visualHostToMarkdown = (host: HTMLElement): string => {
    const walk = (node: Node): string => {
        if (node.nodeType === Node.TEXT_NODE) {
            return (node.textContent || "").replace(/​/g, "");
        }
        if (node.nodeType !== Node.ELEMENT_NODE) return "";
        const el = node as HTMLElement;
        const children = Array.from(el.childNodes).map(walk).join("");
        if (el.tagName === "SPAN") {
            // 保留所有 span 结构（无 style 的 `<span>` 也不能丢，否则包裹就失效了）；
            // 浏览器 CSSOM 会把 hex 序列化成 rgb，这里统一回 hex
            const styleAttr = el.hasAttribute("style")
                ? ` style="${normalizeRgbToHex(el.getAttribute("style") || "")}"`
                : "";
            return `<span${styleAttr}>${children}</span>`;
        }
        return children;
    };
    return walk(host).trim();
};

/**
 * MED-3 修复：把 html-inline shell 内 visualHost 的"当前完整结构"重新写回 data-md-source。
 *
 * 背景：用户在 shell 内的某些字符上加颜色 → 产生嵌套 <span style="...">。
 * 外层 shell 的 data-md-source 没有更新，所以 getValue / AI 读到的 markdown 仍是
 * 原始 source，丢失内层嵌套。
 *
 * 解决：在 applyStyleInPreview 嵌套包 span 之后，立刻重序列化 visualHost，
 * 把更新后的 markdown 写回 data-md-source。
 *
 * 不递归处理嵌套的 html-inline shell（Vditor 不允许 shell 嵌套 shell）。
 */
/**
 * C4 修复：data-md-source 是 HTML 属性，必须 escapeAttr + MD_SOURCE_ESC_NEWLINE 编码
 * （与 renderHtmlInlineShell 写 data-md-source 时的约定一致）。
 */
export const flattenNestedHtmlInline = (root: HTMLElement | Document = document.body) => {
    root.querySelectorAll('[data-type="html-inline"]').forEach((shell) => {
        const visualHost = shell.querySelector(".vditor-html-inline__display");
        if (!visualHost) {
            return;
        }
        const newMd = visualHostToMarkdown(visualHost as HTMLElement)
            .replaceAll("\n", MD_SOURCE_ESC_NEWLINE);
        shell.setAttribute("data-md-source", escapeAttr(newMd));
    });
};


const renderHtmlBlockFromMd = (vditor: IVditor, md: string): string => {
    const trimmed = md.trim();
    if (!trimmed) {
        return "";
    }
    const html = vditor.currentMode === "ir"
        ? vditor.lute.Md2VditorIRDOM(trimmed)
        : vditor.lute.Md2VditorDOM(trimmed);
    const temp = document.createElement("div");
    temp.innerHTML = html;
    const node = temp.querySelector('[data-type="html-block"]') as HTMLElement | null;
    return node?.outerHTML ?? "";
};

const getHtmlBlockSource = (blockElement: HTMLElement): string => {
    const mdSource = blockElement.getAttribute("data-md-source");
    if (mdSource) {
        return decodeMdSourceAttr(mdSource);
    }
    const code = blockElement.querySelector("code[data-type='html-block'], pre code") as HTMLElement | null;
    return (code?.textContent || "").replaceAll(Constants.ZWSP, "");
};

const getHtmlBlockAnchor = (blockElement: HTMLElement): HTMLElement => {
    const display = blockElement.querySelector(".vditor-html-block__display") as HTMLElement | null;
    if (display) {
        return display;
    }
    const preview = blockElement.querySelector(
        ".vditor-wysiwyg__preview, .vditor-ir__preview",
    ) as HTMLElement | null;
    return preview || blockElement;
};

const createHtmlInlineTargetWithVditor = (element: HTMLElement): HtmlEditTarget => ({
    anchorElement: element,
    focusElement: element,
    getSource: () => decodeMdSourceAttr(element.getAttribute("data-md-source")),
    applySource: (source: string) => {
        if (!source) {
            element.remove();
            return null;
        }
        console.log("source:", source);
        // 把 source 包成手写 html-inline shell 后直接 DOM 替换。
        // 不能用 execCommand('insertHTML')：编辑器的可编辑宿主是 <pre>，
        // Chromium 在 pre 宿主里执行 insertHTML 会剥掉 shell 外壳并把嵌套
        // span 拆平（实测：`<span bg>示例<span red>页面</span></span>`
        // 变成两个兄弟 span，内层丢失背景色）。
        // 记账（undo 栈、input 回调）由 save() 里的 addToUndoStack /
        // notifyAfterHtmlEditorChange 负责，不需要 input 事件。
        const wrappedHtml = renderHtmlInlineShell(source);
        if (!wrappedHtml) {
            element.remove();
            return null;
        }
        const wrapper = document.createElement("div");
        wrapper.innerHTML = wrappedHtml;
        const newNode = wrapper.firstElementChild as HTMLElement | null;
        if (!newNode) {
            return null;
        }
        element.replaceWith(newNode);
        return newNode;
    },
    remove: () => element.remove(),
});

const createHtmlBlockTarget = (vditor: IVditor, blockElement: HTMLElement): HtmlEditTarget => ({
    anchorElement: getHtmlBlockAnchor(blockElement),
    focusElement: blockElement,
    getSource: () => getHtmlBlockSource(blockElement),
    applySource: (source: string) => {
        const newHtml = renderHtmlBlockFromMd(vditor, source);
        if (newHtml) {
            const wrapper = document.createElement("div");
            wrapper.innerHTML = newHtml;
            const newNode = wrapper.firstElementChild as HTMLElement | null;
            if (!newNode) {
                return null;
            }
            blockElement.replaceWith(newNode);
            return newNode;
        }
        return blockElement;
    },
    remove: () => blockElement.remove(),
});

const insertLiteralTab = (view: EditorView) => {
    view.dispatch(view.state.update(view.state.replaceSelection("\t"), {
        scrollIntoView: true,
        userEvent: "input",
    }));
    return true;
};

const focusHtmlEditorAtStart = (view: EditorView) => {
    if (!view.dom.isConnected) {
        return;
    }
    view.dispatch({
        selection: { anchor: 0, head: 0 },
        scrollIntoView: false,
    });
    view.contentDOM.focus({ preventScroll: true });
};

const scheduleFocusHtmlEditorAtStart = (view: EditorView) => {
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            focusHtmlEditorAtStart(view);
        });
    });
};

const mountHtmlEditorCodeMirror = (
    host: HTMLElement,
    initialSource: string,
    onSave: () => void,
    onCancel: () => void,
) => {
    destroyHtmlEditorCodeMirror();
    const languageCompartment = new Compartment();
    const wrapCompartment = new Compartment();
    const view = new EditorView({
        doc: initialSource,
        parent: host,
        extensions: [
            vditorCodeMirrorSetup,
            languageCompartment.of([]),
            wrapCompartment.of([]),
            keymap.of(stopHandledCodeMirrorKeymap([
                { key: "Tab", run: insertLiteralTab, shift: indentLess },
                {
                    key: "Alt-Enter",
                    run: () => {
                        onSave();
                        return true;
                    },
                },
                {
                    key: "Escape",
                    run: () => {
                        onCancel();
                        return true;
                    },
                },
            ])),
            EditorView.domEventHandlers({
                mousedown: (event) => {
                    event.stopPropagation();
                    return false;
                },
            }),
        ],
    });
    activeHtmlEditorPopover = { view, languageCompartment, wrapCompartment, lineWrapEnabled: false };
    loadCodeMirrorHighlightLanguage("html").then((lang) => {
        if (!lang || activeHtmlEditorPopover?.view !== view) {
            scheduleFocusHtmlEditorAtStart(view);
            return;
        }
        view.dispatch({
            effects: languageCompartment.reconfigure(lang),
        });
        scheduleFocusHtmlEditorAtStart(view);
    });
    return view;
};

const readHtmlEditorLineWrapEnabled = (): boolean =>
    getGlobalLocalStorageSetting<boolean>(HTML_EDITOR_LINE_WRAP_KEY, false) === true;

const persistHtmlEditorLineWrapEnabled = (enabled: boolean) => {
    setGlobalLocalStorageSetting(HTML_EDITOR_LINE_WRAP_KEY, enabled);
};

const applyHtmlEditorLineWrap = (wrapButton: HTMLButtonElement, enabled: boolean) => {
    const binding = activeHtmlEditorPopover;
    if (!binding) {
        return;
    }
    binding.lineWrapEnabled = enabled;
    binding.view.dispatch({
        effects: binding.wrapCompartment.reconfigure(
            enabled ? EditorView.lineWrapping : [],
        ),
    });
    wrapButton.classList.toggle("vditor-html-inline-popover__button--wrap-active", enabled);
    wrapButton.setAttribute("aria-pressed", String(enabled));
};

const toggleHtmlEditorLineWrap = (wrapButton: HTMLButtonElement) => {
    const binding = activeHtmlEditorPopover;
    if (!binding) {
        return;
    }
    const enabled = !binding.lineWrapEnabled;
    applyHtmlEditorLineWrap(wrapButton, enabled);
    persistHtmlEditorLineWrapEnabled(enabled);
};

export const showHtmlEditorPopover = (vditor: IVditor, target: HtmlEditTarget) => {
    const popover = getModePopover(vditor);
    if (!popover || !target.anchorElement.isConnected) {
        return;
    }
    // 打开新弹窗时，废弃上一个未完成的"待包裹"状态（其锚点不是本次目标）
    if (pendingHtmlWrap && pendingHtmlWrap.marker !== target.anchorElement) {
        abortPendingHtmlWrap(false);
    }

    popover.classList.add(HTML_EDITOR_POPOVER_CLASS, HTML_EDITOR_PANEL_CLASS);
    popover.innerHTML = "";

    const panel = document.createElement("div");
    panel.className = "vditor-html-inline-popover";

    // 顶部拖拽胶囊：空 div，靠 cursor + 自身圆角作为视觉提示。
    const dragHeader = document.createElement("div");
    dragHeader.className = "vditor-html-inline-popover__header";
    dragHeader.setAttribute("aria-label", "拖动窗口");

    // 顶部右上角关闭按钮（复用原 cancel 行为：丢弃编辑、关闭弹窗、恢复焦点）
    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.className = "vditor-html-inline-popover__close";
    closeButton.setAttribute("aria-label", window.VditorI18n?.aiCancel ?? "Cancel");
    closeButton.innerHTML = `<span class="vditor-html-inline-popover__button-icon">${codicon("close")}</span>`;
    // click 监听放在 cancel 函数定义之后注册（见下方），避免 TDZ

    // 顶部颜色栏（仅 html-inline 显示，html-block 没意义）
    const isInlineType = target.inlineType
        ?? target.anchorElement.getAttribute("data-type") === "html-inline";
    const colorBar = document.createElement("div");
    colorBar.className = "vditor-html-inline-popover__color-bar";
    if (!isInlineType) {
        colorBar.style.display = "none";
    }

    const cmHost = document.createElement("div");
    cmHost.className = "vditor-html-inline-popover__cm-host vditor-cm-host";

    const visualHost = document.createElement("div");
    visualHost.className = "vditor-html-inline-popover__visual-host vditor-cm-host";
    visualHost.setAttribute("contenteditable", "true");
    visualHost.setAttribute("spellcheck", "false");

    // 模式切换按钮：左上角单按钮，文案显示"目标模式"——当前是 preview，按钮写"源码"
// （点一下进入源码模式）。把原本的"源码 / 预览"双 tab 合一个，少占一行纵向空间。
    const modeToggleButton = document.createElement("button");
    modeToggleButton.type = "button";
    modeToggleButton.className = "vditor-html-inline-popover__mode-toggle";
    modeToggleButton.textContent = "源码";

    // html-block 不显示模式切换（视觉编辑没意义）
    if (!isInlineType) {
        modeToggleButton.style.display = "none";
        visualHost.style.display = "none";
    }

    const actions = document.createElement("div");
    actions.className = "vditor-html-inline-popover__actions";

    const hint = document.createElement("span");
    hint.className = "vditor-html-inline-popover__hint";
    hint.textContent = formatAltEnterHotkeyTip();

    const actionsButtons = document.createElement("div");
    actionsButtons.className = "vditor-html-inline-popover__actions-buttons";

    const wrapButton = document.createElement("button");
    wrapButton.type = "button";
    wrapButton.className = "vditor-html-inline-popover__button vditor-html-inline-popover__button--wrap";
    wrapButton.setAttribute("aria-label", "Toggle line wrap");
    wrapButton.setAttribute("aria-pressed", "false");
    wrapButton.innerHTML = `<span class="vditor-html-inline-popover__button-icon">${codicon("word-wrap")}</span>`;

    const saveButton = document.createElement("button");
    saveButton.type = "button";
    saveButton.className = "vditor-html-inline-popover__button vditor-html-inline-popover__button--primary";
    saveButton.textContent = window.VditorI18n?.aiSave ?? "Save";

    const clearInlineHtmlButton = document.createElement("button");
    clearInlineHtmlButton.type = "button";
    clearInlineHtmlButton.className = "vditor-html-inline-popover__button vditor-html-inline-popover__button--clear";
    clearInlineHtmlButton.textContent = "还原";

    const initialSource = target.getSource();
    const targetRef = target;
    // 仅当源码含 HTML 标签时显示，且只对 html-inline 起作用（html-block 不一样）
    const sourceHasTags = /<[a-zA-Z\/!][^>]*>/i.test(initialSource);
    clearInlineHtmlButton.hidden = !sourceHasTags
        || targetRef.anchorElement.getAttribute("data-type") !== "html-inline";

    const save = () => {
        // 当前模式决定内容来源：预览 → DOM walk，源码 → CodeMirror 文档
        const newMd = (currentMode === "preview" && isInlineType
            ? visualHostToMarkdown(visualHost)
            : (activeHtmlEditorPopover?.view.state.doc.toString() ?? initialSource)
        ).trim();
        const htmlType = targetRef.anchorElement.getAttribute("data-type") === "html-block" ? "block" : "inline";
        telemetry(vditor, "markdown.html.save", { type: htmlType, isEmpty: !newMd });
        vditor.undo.addToUndoStack(vditor);
        if (!newMd) {
            const parent = targetRef.focusElement.parentElement;
            const next = targetRef.focusElement.nextSibling;
            targetRef.remove();
            notifyAfterHtmlEditorChange(vditor);
            closeHtmlEditorPopover(vditor, null, parent, next);
            return;
        }
        const focusElement = targetRef.applySource(newMd) ?? targetRef.focusElement;
        notifyAfterHtmlEditorChange(vditor);
        closeHtmlEditorPopover(vditor, focusElement);
    };

    const cancel = () => {
        targetRef.onCancel?.();
        closeHtmlEditorPopover(vditor, targetRef.focusElement);
    };

    const stripToPlainText = () => {
        const anchorEl = targetRef.anchorElement;
        if (anchorEl.classList.contains("vditor-html-inline__pending-anchor")) {
            // "待包裹"状态还没有任何 HTML，没有可还原的；按取消处理
            targetRef.onCancel?.();
            closeHtmlEditorPopover(vditor, targetRef.focusElement);
            return;
        }
        const parent = anchorEl.parentElement;
        if (!parent) return;
        const view = activeHtmlEditorPopover?.view;
        if (!view) return;
        const cur = view.state.doc.toString();
        // 剥掉所有 HTML 标签，保留文本内容
        const stripped = cur.replace(/<[^>]*>/g, "").trim();
        if (stripped === cur.trim()) {
            // 源码本来就没 HTML 标签，关掉弹窗即可
            closeHtmlEditorPopover(vditor, targetRef.focusElement);
            return;
        }
        // 把 html-inline shell 直接换成纯文本节点
        const textNode = document.createTextNode(stripped);
        parent.replaceChild(textNode, anchorEl);
        // 复用 save() 的记账链路（undo 栈、IR 处理、关闭弹窗）
        vditor.undo.addToUndoStack(vditor);
        notifyAfterHtmlEditorChange(vditor);
        // 走 "removed" 路径而非 "focusElement" 路径：
        // focusElement 路径会调 element.insertAdjacentHTML()，但文本节点没这个方法；
        // removed 路径用 restoreFocusAfterHtmlRemove，专门处理这种替换场景（含文本节点分支）
        closeHtmlEditorPopover(vditor, null, parent, textNode);
    };

    saveButton.addEventListener("click", save);
    closeButton.addEventListener("click", cancel);
    wrapButton.addEventListener("click", () => toggleHtmlEditorLineWrap(wrapButton));
    clearInlineHtmlButton.addEventListener("click", stripToPlainText);

    // 把新样式合并到 CodeMirror 当前文档（不自动保存，留给用户点 Save 决定）
    const applyStyleToSource = (newStyle: { color?: string; backgroundColor?: string }) => {
        const view = activeHtmlEditorPopover?.view;
        if (!view) return;
        const cur = view.state.doc.toString();
        const merged = mergeStyleIntoSource(cur, newStyle);
        if (merged === cur) return;
        view.dispatch({
            changes: { from: 0, to: cur.length, insert: merged },
        });
    };

    // 预览模式下应用样式：
//   1. 如果 visualHost 内有非折叠选区 → 只对选区包一个新 span（不动外层 span 的样式，
//      这样只改选中部分的格式，保持原有"嵌套"语义）
//   2. 否则（折叠 / 选区不在 visualHost）→ 应用到整个 visualHost 内容
//
// 为什么这样做：popover 默认聚焦的是 CodeMirror（在 hidden 状态下），用户的选区
// 几乎总是在 CodeMirror 而不是 visualHost，强行要求 visualHost.contains() 会导致
// 看起来"点了色块没反应"。这里主动 fallthrough 到整个内容，更符合用户直觉。
    const applyStyleInPreview = (newStyle: { color?: string; backgroundColor?: string }) => {
        const selection = window.getSelection();
        let inHostRange: Range | null = null;
        if (selection && selection.rangeCount > 0) {
            const r = selection.getRangeAt(0);
            if (visualHost.contains(r.startContainer) && visualHost.contains(r.endContainer) && !r.collapsed) {
                inHostRange = r;
            }
        }

        if (inHostRange) {
            // 路径 1：visualHost 内有非折叠选区 — 只对选区包新 span
            // 不再"合并到外层 span"，那样会把整段文字的样式都改了，与用户的选区意图不符。
            // 嵌套的 span 由 buildEditorHtmlForMarkdown 的 flattenNestedHtmlInline 处理。
            const range = inHostRange;
            const span = document.createElement("span");
            // 用字符串方式写 style，避免 CSSOM 把 hex 序列化成 rgb
            const wrapStyle = new Map<string, string>();
            if (newStyle.color) wrapStyle.set("color", newStyle.color);
            if (newStyle.backgroundColor) wrapStyle.set("background-color", newStyle.backgroundColor);
            span.setAttribute("style", serializeStyleMap(wrapStyle));
            try {
                range.surroundContents(span);
            } catch {
                const fragment = range.extractContents();
                span.appendChild(fragment);
                range.insertNode(span);
            }
            selection!.removeAllRanges();
            const newRange = document.createRange();
            newRange.selectNodeContents(span);
            newRange.collapse(false);
            selection!.addRange(newRange);
            // MED-3：嵌套 span 创建后立刻把 visualHost 重序列化到 data-md-source，
            // 否则 getValue / AI 拿到的 markdown 还是原始 source（丢内层色）
            flattenNestedHtmlInline(visualHost.closest('[data-type="html-inline"]')?.parentElement ?? document);
            return;
        }

        // 路径 2：默认应用整个 visualHost 内容
        if (!visualHost.firstChild) return;
        // 找到 visualHost 下的最外层 span[style]（如果有），直接合并
        let outermost: HTMLElement | null = null;
        for (const child of Array.from(visualHost.children)) {
            if (child.tagName === "SPAN" && child.hasAttribute("style")) {
                outermost = child as HTMLElement;
                break;
            }
        }
        if (outermost) {
            const styleMap = parseStyleAttr(outermost.getAttribute("style") || "");
            if (newStyle.color) styleMap.set("color", newStyle.color);
            if (newStyle.backgroundColor) styleMap.set("background-color", newStyle.backgroundColor);
            outermost.setAttribute("style", serializeStyleMap(styleMap));
            return;
        }
        // 没有外层 span → 把所有 children 包到一个新 span 里
        const wrapper = document.createElement("span");
        // 用字符串方式写 style，避免 CSSOM 把 hex 序列化成 rgb
        const wrapperStyle = new Map<string, string>();
        if (newStyle.color) wrapperStyle.set("color", newStyle.color);
        if (newStyle.backgroundColor) wrapperStyle.set("background-color", newStyle.backgroundColor);
        wrapper.setAttribute("style", serializeStyleMap(wrapperStyle));
        while (visualHost.firstChild) {
            wrapper.appendChild(visualHost.firstChild);
        }
        visualHost.appendChild(wrapper);
        // MED-3：同步 outer shell 的 data-md-source（whole-content 路径也可能产生嵌套）
        flattenNestedHtmlInline(visualHost.closest('[data-type="html-inline"]')?.parentElement ?? document);
    };

    // 模式状态：默认预览（更符合用户直觉）
    type EditMode = "raw" | "preview";
    let currentMode: EditMode = "preview";

    const switchToPreview = () => {
        if (!isInlineType) return;
        const view = activeHtmlEditorPopover?.view;
        const md = view?.state.doc.toString() ?? initialSource;
        const html = renderInlineHtmlForPreview(vditor, md);
        visualHost.innerHTML = html;
        cmHost.style.display = "none";
        visualHost.style.display = "";
        // 切换后按钮文案指向"目标模式"——现在已是 preview，下一点就回 preview
        modeToggleButton.textContent = "源码";
        currentMode = "preview";
    };

    const switchToRaw = () => {
        // 预览 → 源码：先把预览区 DOM 走成 Markdown 串，再灌进 CodeMirror
        const md = visualHostToMarkdown(visualHost);
        const view = activeHtmlEditorPopover?.view;
        if (view) {
            view.dispatch({
                changes: { from: 0, to: view.state.doc.length, insert: md },
            });
        }
        cmHost.style.display = "";
        visualHost.style.display = "none";
        // 文案指向目标模式——现在已是 raw，下一点回 preview
        modeToggleButton.textContent = "预览";
        currentMode = "raw";
        // 切到源码后让 CodeMirror 拿到焦点，光标移到末尾
        view?.focus();
        view?.dispatch({ selection: { anchor: md.length } });
    };

    modeToggleButton.addEventListener("click", () => {
        // 单按钮 toggle：当前 preview → 切 raw；当前 raw → 切 preview。
        // switchToPreview 自身在非 inline 类型时是 no-op，正面路径只走 isInlineType。
        if (currentMode === "preview") {
            switchToRaw();
        } else {
            switchToPreview();
        }
    });

    const buildColorRow = (label: string, swatches: readonly string[], apply: (color: string) => void) => {
        const row = document.createElement("div");
        row.className = "vditor-html-inline-popover__color-row";
        const labelEl = document.createElement("span");
        labelEl.className = "vditor-html-inline-popover__color-label";
        labelEl.textContent = label;
        row.appendChild(labelEl);
        swatches.forEach(color => {
            const sw = document.createElement("button");
            sw.type = "button";
            sw.className = "vditor-html-inline-popover__color-swatch";
            sw.style.backgroundColor = color;
            sw.setAttribute("aria-label", color);
            sw.title = color;
            sw.addEventListener("mousedown", (e) => {
                // 阻止 CodeMirror 失焦
                e.preventDefault();
                e.stopPropagation();
                apply(color);
            });
            row.appendChild(sw);
        });
        return row;
    };

    colorBar.appendChild(buildColorRow("文字", resolveTextColors(), (color) => {
        if (currentMode === "raw") {
            applyStyleToSource({ color });
        } else {
            applyStyleInPreview({ color });
        }
    }));
    colorBar.appendChild(buildColorRow("背景", resolveBgColors(), (color) => {
        if (currentMode === "raw") {
            applyStyleToSource({ backgroundColor: color });
        } else {
            applyStyleInPreview({ backgroundColor: color });
        }
    }));

    actionsButtons.appendChild(wrapButton);
    actionsButtons.appendChild(clearInlineHtmlButton);
    actionsButtons.appendChild(saveButton);
    actions.appendChild(hint);
    actions.appendChild(actionsButtons);
    panel.appendChild(dragHeader);
    panel.appendChild(closeButton);
    panel.appendChild(modeToggleButton);
    panel.appendChild(colorBar);
    panel.appendChild(visualHost);
    panel.appendChild(cmHost);
    panel.appendChild(actions);
    popover.appendChild(panel);
    // 启用头部拖拽：每次新建 panel 都重新挂上；scroll-reposition 由 helper
    // 内部在首轮真正移动后才会被取消，避免一次"误触"就锁死贴齐行为
    makePopoverDraggable(popover, dragHeader);
    const view = mountHtmlEditorCodeMirror(cmHost, initialSource, save, cancel);
    applyHtmlEditorLineWrap(wrapButton, readHtmlEditorLineWrapEnabled());
    scheduleHtmlEditorPopoverPosition(vditor, target.anchorElement);
    // 默认进预览模式（仅 inline 类型；html-block 没意义）
    if (isInlineType) {
        switchToPreview();
    } else {
        // html-block：固定源码模式；modeToggleButton 已在上面 `if (!isInlineType)`
        // 块里隐藏，visualHost 也已隐藏，无需额外处理。
        currentMode = "raw";
    }
    scheduleFocusHtmlEditorAtStart(view);
};

const resolveHtmlBlockFromClick = (target: HTMLElement): HTMLElement | false => {
    const block = hasClosestByAttribute(target, "data-type", "html-block") as HTMLElement | false;
    if (!block) {
        return false;
    }
    if (block.getAttribute("contenteditable") === "false") {
        return block;
    }
    const preview = hasClosestByClassName(target, "vditor-wysiwyg__preview")
        || hasClosestByClassName(target, "vditor-ir__preview");
    if (!preview || !block.contains(preview)) {
        return false;
    }
    return block;
};

export const handleHtmlEditorClick = (
    vditor: IVditor,
    event: MouseEvent & { target: HTMLElement },
): boolean => {
    const htmlInline = hasClosestByAttribute(event.target, "data-type", "html-inline") as HTMLElement | false;
    if (htmlInline && htmlInline.getAttribute("contenteditable") === "false") {
        event.preventDefault();
        event.stopPropagation();
        showHtmlEditorPopover(vditor, createHtmlInlineTargetWithVditor(htmlInline));
        return true;
    }

    const htmlBlock = resolveHtmlBlockFromClick(event.target);
    if (htmlBlock) {
        event.preventDefault();
        event.stopPropagation();
        showHtmlEditorPopover(vditor, createHtmlBlockTarget(vditor, htmlBlock));
        return true;
    }

    return false;
};

const isReadonlyHtmlInline = (el: Element | null): el is HTMLElement =>
    !!el && el.nodeType === 1 &&
    (el as HTMLElement).getAttribute("data-type") === "html-inline" &&
    (el as HTMLElement).getAttribute("contenteditable") === "false";

const isReadonlyHtmlBlock = (el: Element | null): el is HTMLElement =>
    !!el && el.nodeType === 1 &&
    (el as HTMLElement).getAttribute("data-type") === "html-block" &&
    (el as HTMLElement).getAttribute("contenteditable") === "false";

const htmlInlineFromSibling = (node: Node | null): HTMLElement | null =>
    node?.nodeType === 1 && isReadonlyHtmlInline(node as Element) ? node as HTMLElement : null;

const htmlBlockFromSibling = (node: Node | null): HTMLElement | null =>
    node?.nodeType === 1 && isReadonlyHtmlBlock(node as Element) ? node as HTMLElement : null;

const resolveReadonlyHtmlFromRange = (
    range: Range,
    typeAttr: "html-inline" | "html-block",
    matcher: (node: Node | null) => HTMLElement | null,
): HTMLElement | null => {
    const insideResolver = (currentRange: Range) => {
        const inside = hasClosestByAttribute(currentRange.startContainer, "data-type", typeAttr) as HTMLElement | false;
        if (inside && inside.getAttribute("contenteditable") === "false") {
            return inside;
        }
        return null;
    };
    return resolveAdjacentElementFromRange(range, insideResolver, matcher);
};

const resolveReadonlyHtmlInlineFromRange = (range: Range): HTMLElement | null =>
    resolveReadonlyHtmlFromRange(range, "html-inline", htmlInlineFromSibling);

const resolveReadonlyHtmlBlockFromRange = (range: Range): HTMLElement | null =>
    resolveReadonlyHtmlFromRange(range, "html-block", htmlBlockFromSibling);

export const handleHtmlEditorAltEnter = (vditor: IVditor, range: Range): boolean => {
    const popover = getModePopover(vditor);
    if (popover?.classList.contains(HTML_EDITOR_PANEL_CLASS) && popover.style.display !== "none") {
        return false;
    }

    const htmlInline = resolveReadonlyHtmlInlineFromRange(range);
    if (htmlInline) {
        showHtmlEditorPopover(vditor, createHtmlInlineTargetWithVditor(htmlInline));
        return true;
    }

    const htmlBlock = resolveReadonlyHtmlBlockFromRange(range);
    if (htmlBlock) {
        showHtmlEditorPopover(vditor, createHtmlBlockTarget(vditor, htmlBlock));
        return true;
    }

    return false;
};

/** @deprecated use handleHtmlEditorClick */
export const handleHtmlInlineClick = handleHtmlEditorClick;

export const showHtmlInlinePopover = (vditor: IVditor, htmlInlineElement: HTMLElement) => {
    showHtmlEditorPopover(vditor, createHtmlInlineTargetWithVditor(htmlInlineElement));
};

/**
 * 把当前选中文本包成 html-inline shell，立即打开弹窗让用户编辑。
 *
 * 用法：气泡菜单"行内 html"按钮的点击处理。
 * 与 setSelectionColor（wysiwyg/setSelectionColor.ts）的不同：
 *   - 这里包成"通用 inline HTML"（任意标签都行），由用户在弹窗里精细编辑
 *   - setSelectionColor 专门用于加 color/background-color，不开弹窗
 *
 * 仅 wysiwyg 模式有效；折叠选区时直接返回 false（让按钮"无效"，需要先选中文本）。
 */
/**
 * "待包裹"目标的 applySource：把原始选区替换成新 shell（此时才真正改动文本）。
 */
const createPendingHtmlInlineTarget = (
    marker: HTMLElement,
    range: Range,
    initialMd: string,
): HtmlEditTarget => ({
    anchorElement: marker,
    focusElement: marker,
    getSource: () => initialMd,
    applySource: (source: string) => {
        // 清理锚点（range 是活引用，去掉 marker 后仍指向原文本）
        abortPendingHtmlWrap(false);
        if (!source) {
            return null;
        }
        const wrappedHtml = renderHtmlInlineShell(source);
        if (!wrappedHtml) {
            return null;
        }
        const wrapper = document.createElement("div");
        wrapper.innerHTML = wrappedHtml;
        const newNode = wrapper.firstElementChild as HTMLElement | null;
        if (!newNode) {
            return null;
        }
        // 重新选中原始选区（弹窗打开时选区已被 CodeMirror 移走），用 shell 替换
        const selection = window.getSelection();
        if (selection) {
            selection.removeAllRanges();
            selection.addRange(range);
        }
        range.deleteContents();
        range.insertNode(newNode);
        return newNode;
    },
    remove: () => abortPendingHtmlWrap(false),
    onCancel: () => abortPendingHtmlWrap(true),
    inlineType: true,
});

export const wrapSelectionWithHtmlInline = (vditor: IVditor): boolean => {
    if (vditor.currentMode !== "wysiwyg") return false;
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return false;
    const range = selection.getRangeAt(0);
    if (range.collapsed) return false;
    if (!vditor.wysiwyg.element.contains(range.startContainer)) return false;

    // 清理上一个残留的"待包裹"状态
    abortPendingHtmlWrap(false);

    // 选区文本转义后塞进 <span>...</span> 作为弹窗的初始源码
    const selectedText = range.toString();
    const escapedText = selectedText
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
    const initialMd = `<span>${escapedText}</span>`;

    // 点击按钮时不动选中文本：只插入一个零宽锚点（插在选区起点）用于弹窗定位，
    // 保存时才把选区替换成 shell；取消（含 Esc / 还原 / 滚动移出视口）则原样保留。
    const marker = document.createElement("span");
    marker.className = "vditor-html-inline__pending-anchor";
    marker.textContent = Constants.ZWSP;
    range.insertNode(marker);
    pendingHtmlWrap = { marker, range };

    showHtmlEditorPopover(vditor, createPendingHtmlInlineTarget(marker, range, initialMd));
    return true;
};
