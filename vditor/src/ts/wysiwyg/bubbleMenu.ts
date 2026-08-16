import {codicon} from "../util/codicon";
import {hasClosestByMatchTag} from "../util/hasClosest";
import {getEditorRange, selectIsEditor, setSelectionFocus} from "../util/selection";
import {genAPopover, highlightToolbarWYSIWYG} from "./highlightToolbarWYSIWYG";
import {getModePopover} from "../codeBlock/codeBlockLanguagePopover";
import {afterRenderEvent} from "./afterRenderEvent";
import {setSelectionColor} from "./setSelectionColor";
import {TEXT_COLORS, BG_COLORS} from "../util/colorPalette";
import {wrapSelectionWithHtmlInline} from "../htmlInline/htmlInlineEditor";

const BUBBLE_MENU_CLASS = "vditor-bubble-menu";
const BUBBLE_MENU_VISIBLE_CLASS = "vditor-bubble-menu--visible";
const BUBBLE_PALETTE_CLASS = "vditor-bubble-palette";
const BUBBLE_PALETTE_VISIBLE_CLASS = "vditor-bubble-palette--visible";

interface IBubbleMenuState {
    element: HTMLElement;
    visible: boolean;
    hideTimer: number | null;
    editorElement: HTMLElement;
    isSelecting: boolean;
}

interface IBubblePaletteState {
    element: HTMLElement;
    visible: boolean;
    anchorButton: HTMLElement | null;
}

const menuMap = new WeakMap<IVditor, IBubbleMenuState>();
const paletteMap = new WeakMap<IVditor, IBubblePaletteState>();

const FORMAT_ITEMS = [
    { name: "copy", icon: "copy" },
    { name: "bold", icon: "bold" },
    { name: "italic", icon: "italic" },
    { name: "strike", icon: "strikethrough" },
    { name: "text-color", icon: "symbol-color" },
    { name: "highlight", icon: "paintcan" },
    { name: "inline-code", icon: "symbol-text" },
    { name: "code", icon: "code" },
    { name: "link", icon: "link" },
    { name: "html-inline", icon: "symbol-structure" },
];

const clickToolbarButton = (vditor: IVditor, name: string) => {
    const toolbarBtn = vditor.toolbar.elements?.[name]?.firstElementChild as HTMLElement;
    if (toolbarBtn) {
        toolbarBtn.click();
    }
};

const insertLink = (vditor: IVditor) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    if (range.collapsed) return;

    const selectedText = selection.toString();

    const a = document.createElement("a");
    a.href = "";
    a.textContent = selectedText;
    range.deleteContents();
    range.insertNode(a);

    const newRange = document.createRange();
    newRange.selectNodeContents(a);
    selection.removeAllRanges();
    selection.addRange(newRange);

    genAPopover(vditor, a);
    const popover = getModePopover(vditor);
    if (popover) {
        popover.style.display = "block";
        const hrefInput = popover.querySelector(".vditor-link-popover__href") as HTMLInputElement;
        if (hrefInput) {
            hrefInput.focus();
        }
    }
};

const unwrapMarkElement = (mark: HTMLElement) => {
    const parent = mark.parentNode;
    if (!parent) return;
    while (mark.firstChild) {
        parent.insertBefore(mark.firstChild, mark);
    }
    parent.removeChild(mark);
};

const findMarksInRange = (range: Range): HTMLElement[] => {
    const marks: HTMLElement[] = [];
    const seen = new Set<HTMLElement>();

    // Determine the root for TreeWalker: start from commonAncestor, then walk
    // up past text nodes and include any ancestor <mark> so that marks wrapping
    // the entire selection are also discovered.
    let root = range.commonAncestorContainer;
    while (root.nodeType === Node.TEXT_NODE || root.nodeType === Node.COMMENT_NODE) {
        root = root.parentElement!;
    }
    const ancestorMark = (root as Element).closest("mark");
    if (ancestorMark) {
        root = ancestorMark;
    }

    // If the root itself is a <mark>, add it — it always intersects the range.
    if ((root as Element).tagName === "MARK") {
        marks.push(root as HTMLElement);
        seen.add(root as HTMLElement);
    }

    const walker = document.createTreeWalker(
        root,
        NodeFilter.SHOW_ELEMENT,
        {
            acceptNode: (node: Element) =>
                node.tagName === "MARK" ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP,
        },
    );
    let walkerNode: Element | null;
    while ((walkerNode = walker.nextNode() as Element | null)) {
        if (!seen.has(walkerNode as HTMLElement) && range.intersectsNode(walkerNode)) {
            marks.push(walkerNode as HTMLElement);
            seen.add(walkerNode as HTMLElement);
        }
    }

    return marks;
};

const isRangeFullyContainedBy = (range: Range, element: Element): boolean => {
    const nodeContainer = (node: Node): Node =>
        node.nodeType === Node.TEXT_NODE ? node.parentElement! : node;
    return element.contains(nodeContainer(range.startContainer)) &&
        element.contains(nodeContainer(range.endContainer));
};

const insertMark = (vditor: IVditor) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    if (range.collapsed) return;

    const marksInRange = findMarksInRange(range);

    // Toggle off: only when the entire selection is inside a single <mark>
    if (marksInRange.length === 1 && isRangeFullyContainedBy(range, marksInRange[0])) {
        unwrapMarkElement(marksInRange[0]);
        marksInRange[0].parentNode?.normalize();
    } else {
        // Unwrap any existing marks in the range first to prevent nesting.
        // Process in reverse so nested marks are handled correctly.
        marksInRange.reverse().forEach(unwrapMarkElement);

        // Apply the new mark
        const mark = document.createElement("mark");
        try {
            range.surroundContents(mark);
        } catch {
            const fragment = range.extractContents();
            // Remove any remaining <mark> from the fragment as a defense-in-depth
            fragment.querySelectorAll("mark").forEach(m => unwrapMarkElement(m as HTMLElement));
            mark.appendChild(fragment);
            range.insertNode(mark);
        }
    }

    highlightToolbarWYSIWYG(vditor);
    afterRenderEvent(vditor);
};

const createBubbleMenuElement = (vditor: IVditor): HTMLElement => {
    const menu = document.createElement("div");
    menu.className = BUBBLE_MENU_CLASS;

    FORMAT_ITEMS.forEach(item => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = `${BUBBLE_MENU_CLASS}__btn`;
        btn.setAttribute("aria-label", item.name);
        btn.setAttribute("data-type", item.name);
        btn.innerHTML = codicon(item.icon);
        btn.addEventListener("mousedown", (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (item.name === "link") {
                insertLink(vditor);
                hideBubbleMenu(vditor);
            } else if (item.name === "copy") {
                const selection = window.getSelection();
                if (selection) {
                    navigator.clipboard.writeText(selection.toString());
                }
                hideBubbleMenu(vditor);
            } else if (item.name === "highlight") {
                insertMark(vditor);
                hideBubbleMenu(vditor);
            } else if (item.name === "html-inline") {
                // 包选中文本为 html-inline shell，立即打开弹窗编辑
                // 折叠选区时函数返回 false，气泡菜单照常隐藏即可
                wrapSelectionWithHtmlInline(vditor);
                hideBubbleMenu(vditor);
            } else if (item.name === "text-color") {
                showColorPalette(vditor, btn);
                // 气泡菜单保持显示，等待调色板操作
            } else {
                clickToolbarButton(vditor, item.name);
                hideBubbleMenu(vditor);
            }
        });
        menu.appendChild(btn);
    });

    document.body.appendChild(menu);
    return menu;
};

const createColorPaletteElement = (vditor: IVditor): HTMLElement => {
    const palette = document.createElement("div");
    palette.className = BUBBLE_PALETTE_CLASS;

    const buildRow = (label: string, swatches: string[], apply: (color: string) => void) => {
        const row = document.createElement("div");
        row.className = `${BUBBLE_PALETTE_CLASS}__row`;
        const titleEl = document.createElement("span");
        titleEl.className = `${BUBBLE_PALETTE_CLASS}__title`;
        titleEl.textContent = label;
        row.appendChild(titleEl);

        swatches.forEach(color => {
            const sw = document.createElement("button");
            sw.type = "button";
            sw.className = `${BUBBLE_PALETTE_CLASS}__swatch`;
            sw.style.backgroundColor = color;
            sw.setAttribute("aria-label", color);
            sw.setAttribute("data-color", color);
            sw.addEventListener("mousedown", (e) => {
                e.preventDefault();
                e.stopPropagation();
                apply(color);
                hideColorPalette(vditor);
                hideBubbleMenu(vditor);
            });
            row.appendChild(sw);
        });
        return row;
    };

    const clearBtn = document.createElement("button");
    clearBtn.type = "button";
    clearBtn.className = `${BUBBLE_PALETTE_CLASS}__clear`;
    clearBtn.textContent = "清除颜色";
    clearBtn.addEventListener("mousedown", (e) => {
        e.preventDefault();
        e.stopPropagation();
        clearSelectionColors(vditor);
        hideColorPalette(vditor);
        hideBubbleMenu(vditor);
    });
    palette.appendChild(clearBtn);

    const textRow = buildRow("文字", TEXT_COLORS, (color) => {
        setSelectionColor(vditor, { color });
    });
    palette.appendChild(textRow);

    const bgRow = buildRow("背景", BG_COLORS, (color) => {
        setSelectionColor(vditor, { backgroundColor: color });
    });
    palette.appendChild(bgRow);

    document.body.appendChild(palette);
    return palette;
};

const positionBubbleMenu = (menu: HTMLElement, range: Range) => {
    const rect = range.getBoundingClientRect();
    const menuRect = menu.getBoundingClientRect();

    let left = rect.left + (rect.width - menuRect.width) / 2;
    let top = rect.top - menuRect.height - 8;

    if (left < 8) left = 8;
    if (left + menuRect.width > window.innerWidth - 8) {
        left = window.innerWidth - menuRect.width - 8;
    }
    if (top < 8) {
        top = rect.bottom + 8;
    }

    menu.style.left = `${left + window.scrollX}px`;
    menu.style.top = `${top + window.scrollY}px`;
};

const showBubbleMenu = (vditor: IVditor, range: Range) => {
    const state = menuMap.get(vditor);
    if (!state) {
        return;
    }

    if (state.hideTimer !== null) {
        clearTimeout(state.hideTimer);
        state.hideTimer = null;
    }

    state.element.classList.add(BUBBLE_MENU_VISIBLE_CLASS);
    state.visible = true;
    positionBubbleMenu(state.element, range);
};

const hideBubbleMenu = (vditor: IVditor) => {
    const state = menuMap.get(vditor);
    if (!state) return;

    if (state.hideTimer !== null) {
        clearTimeout(state.hideTimer);
    }

    state.hideTimer = window.setTimeout(() => {
        state.element.classList.remove(BUBBLE_MENU_VISIBLE_CLASS);
        state.visible = false;
        state.hideTimer = null;
        // 气泡菜单收起时一并收起调色板
        hideColorPalette(vditor);
    }, 100);
};

const showColorPalette = (
    vditor: IVditor,
    anchorButton: HTMLElement,
) => {
    const state = paletteMap.get(vditor);
    if (!state) return;

    state.anchorButton = anchorButton;
    state.element.classList.add(BUBBLE_PALETTE_VISIBLE_CLASS);
    state.visible = true;

    // 定位：紧贴气泡菜单下方，左对齐
    const menuState = menuMap.get(vditor);
    if (menuState) {
        const menuRect = menuState.element.getBoundingClientRect();
        const paletteRect = state.element.getBoundingClientRect();
        let left = menuRect.left;
        let top = menuRect.bottom + 6;
        if (left + paletteRect.width > window.innerWidth - 8) {
            left = window.innerWidth - paletteRect.width - 8;
        }
        if (left < 8) left = 8;
        state.element.style.left = `${left + window.scrollX}px`;
        state.element.style.top = `${top + window.scrollY}px`;
    }

    // 高亮当前按钮
    anchorButton.classList.add(`${BUBBLE_MENU_CLASS}__btn--active`);
};

const hideColorPalette = (vditor: IVditor) => {
    const state = paletteMap.get(vditor);
    if (!state) return;
    state.element.classList.remove(BUBBLE_PALETTE_VISIBLE_CLASS);
    state.visible = false;
    if (state.anchorButton) {
        state.anchorButton.classList.remove(`${BUBBLE_MENU_CLASS}__btn--active`);
        state.anchorButton = null;
    }
};

/**
 * 清除选区中的文字色 / 背景色。
 *
 * 选区里可能是两种结构：
 *   1. setSelectionColor 包出来的 html-inline shell（<span data-type="html-inline" ...>）
 *      → 改 data-md-source 把 style="..." 剥掉，再调 Md2VditorDOM 重渲染 shell
 *   2. 直接写 Markdown 解析出来的裸 <span style="...">（在 display 之外）
 *      → 直接 unwrap
 *
 * 不能用「unwrap 然后指望 data-md-source 同步」——shell 在下次 SpinVditorDOM 时会还原样式。
 */
const clearSelectionColors = (vditor: IVditor): boolean => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return false;
    const range = selection.getRangeAt(0);
    if (range.collapsed) return false;
    if (vditor.currentMode !== "wysiwyg") return false;

    const root = range.commonAncestorContainer.nodeType === Node.TEXT_NODE
        ? range.commonAncestorContainer.parentElement!
        : range.commonAncestorContainer as HTMLElement;

    let didSomething = false;

    // 1) 处理选区内的 html-inline shells
    const shells = Array.from(root.querySelectorAll('[data-type="html-inline"]'))
        .filter(s => range.intersectsNode(s));

    shells.forEach(shell => {
        const source = shell.getAttribute("data-md-source") || "";
        // 去掉所有 style="..." 属性（不区分单/双引号，稳妥起见手写）
        const cleaned = source
            .replace(/\s+style="[^"]*"/gi, "")
            .replace(/\s+style='[^']*'/gi, "");
        if (cleaned === source) return;

        const wrapper = `​${cleaned}​`;
        const newHtml = vditor.lute.Md2VditorDOM(wrapper);
        const temp = document.createElement("div");
        temp.innerHTML = newHtml;
        const newShell = temp.querySelector('[data-type="html-inline"]') as HTMLElement | null;
        if (!newShell) return;
        shell.replaceWith(newShell.cloneNode(true));
        didSomething = true;
    });

    // 2) 处理选区内剩余的裸 <span style>（不在 shell 内的）
    const bareSpans = Array.from(root.querySelectorAll("span[style]"))
        .filter(s => range.intersectsNode(s)
            && !s.closest('[data-type="html-inline"]')
            && /color|background/i.test(s.getAttribute("style") || ""));

    bareSpans.forEach(span => {
        const parent = span.parentNode;
        if (!parent) return;
        while (span.firstChild) {
            parent.insertBefore(span.firstChild, span);
        }
        parent.removeChild(span);
        didSomething = true;
    });

    if (!didSomething) return false;

    vditor.wysiwyg.preventInput = true;
    afterRenderEvent(vditor);
    return true;
};

const checkSelection = (vditor: IVditor) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
        hideBubbleMenu(vditor);
        return;
    }

    // 右键菜单打开时禁止显示气泡菜单
    if ((vditor as IVditor & { _contextMenuOpen?: boolean })._contextMenuOpen) {
        return;
    }

    const range = selection.getRangeAt(0);
    const isEditor = selectIsEditor(vditor.wysiwyg.element);
    if (!isEditor) {
        hideBubbleMenu(vditor);
        return;
    }

    const isInPre = range.startContainer.nodeType === 3 &&
        range.startContainer.parentElement?.closest("pre:not(.vditor-reset)");
    if (isInPre) {
        hideBubbleMenu(vditor);
        return;
    }

    try {
        showBubbleMenu(vditor, range);
    } catch (e) {
        // silently fail
    }
};

export const initBubbleMenu = (vditor: IVditor, editorElement: HTMLElement) => {
    if (menuMap.has(vditor)) {
        return;
    }

    const element = createBubbleMenuElement(vditor);

    const state: IBubbleMenuState = {
        element,
        visible: false,
        hideTimer: null,
        editorElement,
        isSelecting: false,
    };
    menuMap.set(vditor, state);

    // 调色板状态
    const paletteElement = createColorPaletteElement(vditor);
    paletteMap.set(vditor, {
        element: paletteElement,
        visible: false,
        kind: null,
        anchorButton: null,
    });

    document.addEventListener("selectionchange", () => {
        if (!state.isSelecting) {
            checkSelection(vditor);
        }
    });

    editorElement.addEventListener("mousedown", (e) => {
        const target = e.target as HTMLElement;
        if (target?.closest?.(`.${BUBBLE_MENU_CLASS}`) ||
            target?.closest?.(`.${BUBBLE_PALETTE_CLASS}`)) {
            return;
        }
        state.isSelecting = true;
        hideBubbleMenu(vditor);
    });

    editorElement.addEventListener("mouseup", () => {
        state.isSelecting = false;
        checkSelection(vditor);
    });

    document.addEventListener("mousedown", (e) => {
        const target = e.target as HTMLElement;
        if (!target) return;
        const paletteState = paletteMap.get(vditor);
        if (paletteState?.visible
            && !target.closest?.(`.${BUBBLE_PALETTE_CLASS}`)
            && !target.closest?.(`.${BUBBLE_MENU_CLASS}`)) {
            hideColorPalette(vditor);
        }
    });

    document.addEventListener("scroll", () => {
        if (state.visible) {
            const selection = window.getSelection();
            if (selection && selection.rangeCount > 0) {
                positionBubbleMenu(state.element, selection.getRangeAt(0));
            }
        }
        const paletteState = paletteMap.get(vditor);
        if (paletteState?.visible && paletteState.anchorButton) {
            // 滚动时重新贴齐按钮
            const menuState = menuMap.get(vditor);
            if (menuState) {
                const menuRect = menuState.element.getBoundingClientRect();
                paletteState.element.style.left = `${menuRect.left + window.scrollX}px`;
            }
        }
    }, { passive: true });
};

export const destroyBubbleMenu = (vditor: IVditor) => {
    const state = menuMap.get(vditor);
    if (state) {
        if (state.hideTimer !== null) {
            clearTimeout(state.hideTimer);
        }
        state.element.remove();
        menuMap.delete(vditor);
    }
    const paletteState = paletteMap.get(vditor);
    if (paletteState) {
        paletteState.element.remove();
        paletteMap.delete(vditor);
    }
};
