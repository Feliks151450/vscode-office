import {codicon} from "../util/codicon";
import {hasClosestByMatchTag} from "../util/hasClosest";
import {getEditorRange, selectIsEditor, setSelectionFocus} from "../util/selection";
import {genAPopover, highlightToolbarWYSIWYG} from "./highlightToolbarWYSIWYG";
import {getModePopover} from "../codeBlock/codeBlockLanguagePopover";
import {afterRenderEvent} from "./afterRenderEvent";
import {setSelectionColor} from "./setSelectionColor";
import {resolveTextColors, resolveBgColors} from "../util/colorPalette";
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
    renderText: (colors: readonly string[]) => void;
    renderBg: (colors: readonly string[]) => void;
    /** Pin 模式下不会随气泡菜单一起关闭，也不会被外部点击关闭 */
    pinned: boolean;
}

const menuMap = new WeakMap<IVditor, IBubbleMenuState>();
const paletteMap = new WeakMap<IVditor, IBubblePaletteState>();

const FORMAT_ITEMS = [
    { name: "copy", icon: "copy" },
    { name: "bold", icon: "bold" },
    { name: "italic", icon: "italic" },
    { name: "strike", icon: "strikethrough" },
    { name: "text-color", icon: "symbol-color" },
    { name: "inline-code", icon: "symbol-text" },
    { name: "code", icon: "code" },
    { name: "link", icon: "link" },
    { name: "html-inline", icon: "symbol-structure" },
];

/**
 * 一次性闭锁：检测页面是否收到过任何触控手势（touchstart）。
 * iOS Safari 才会触发自带的选中文本菜单，纯鼠标设备永远不需要走移除再恢复的流程。
 * capture 阶段挂监听，保证即使被其它 handler `preventDefault` 也能先收到。
 */
let hasReceivedTouchEvent = false;
const markTouchReceived = () => {
    hasReceivedTouchEvent = true;
    document.removeEventListener("touchstart", markTouchReceived, true);
};

if (typeof document !== "undefined") {
    document.addEventListener("touchstart", markTouchReceived, { passive: true, capture: true });
}

/**
 * iOS 端：先移除选区再恢复，能消除 iOS 自带的选中文本菜单（复制 / 查词等）。
 * 清除和恢复之间用 50ms 延时，给 Safari 足够时间确认选区已清空、收起浮层菜单——
 * 同步执行时 Safari 会判定选区未变、菜单不消失。
 *
 * - `afterRestore` 回调在恢复选区之后再执行；适用于后续操作需要原选区的场景
 *   （比如包成 html-inline shell、打开编辑弹窗）。不传则视为纯"消屏"场景
 *   （如点击颜色按钮后立即展示调色板，色块点击会自行读最新选区）。
 */
const bypassIosSelectionMenu = (afterRestore?: () => void) => {
    if (!hasReceivedTouchEvent) {
        // 页面从未收到过触控手势——纯鼠标设备，不需要走清选区流程，直接原样执行
        afterRestore?.();
        return;
    }
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
        afterRestore?.();
        return;
    }
    const savedRange = selection.getRangeAt(0).cloneRange();
    if (savedRange.collapsed) {
        afterRestore?.();
        return;
    }
    selection.removeAllRanges();
    setTimeout(() => {
        try {
            selection.addRange(savedRange);
        } catch (e) {
            // range 所属节点在 50ms 内被外部改动时 addRange 会抛错；
            // 吞掉即可——调用方仍按当前选区自行决定是否继续。
        }
        afterRestore?.();
    }, 50);
};

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
                // iOS 端先把选区清掉再恢复以消除自带选中文本菜单；
                // 包 shell、隐藏气泡菜单这些用选区的操作都得在恢复后再做
                bypassIosSelectionMenu(() => {
                    wrapSelectionWithHtmlInline(vditor);
                    hideBubbleMenu(vditor);
                });
            } else if (item.name === "text-color") {
                // iOS 端：点击颜色按钮时先移除选区再恢复，能消除 iOS 自带的选中文本菜单
                //（复制 / 查词等）——调色板本身展示不依赖选区，色块点击时会再读最新选区
                bypassIosSelectionMenu();
                showColorPalette(vditor, btn);
                // 气泡菜单保持显示，等待调色板操作
            } else {
                clickToolbarButton(vditor, item.name);
                hideBubbleMenu(vditor);
            }
        });
        menu.appendChild(btn);
    });

    // 不挂到 body：initUI 会重置 vditor.element.innerHTML，且 body 下继承不到
    // vditor 根元素上的主题变量（--panel-background-color 等），深色模式会失效。
    // 首次显示时由 showBubbleMenu 挂到 vditor.element 内。
    return menu;
};

const createColorPaletteElement = (vditor: IVditor): {
    element: HTMLElement;
    renderText: (colors: readonly string[]) => void;
    renderBg: (colors: readonly string[]) => void;
} => {
    const palette = document.createElement("div");
    palette.className = BUBBLE_PALETTE_CLASS;

    // 顶部三段式：清除颜色（左）+ 拖拽抓手（中）+ close（右），参考 html-inline popover 的 header 布局。
    // 不再有独立的 pin 按钮——点击拖拽抓手或实际拖动面板都会自动进入 pin 模式，
    // 视觉态由拖拽抓手本身的 --pinned class 体现。
    const header = document.createElement("div");
    header.className = `${BUBBLE_PALETTE_CLASS}__header`;

    // 清除颜色按钮：icon-only，跟 ×close 同一行，避免单独占一行
    const clearBtn = document.createElement("button");
    clearBtn.type = "button";
    clearBtn.className = `${BUBBLE_PALETTE_CLASS}__clear`;
    clearBtn.setAttribute("aria-label", "清除颜色");
    clearBtn.innerHTML = `<span class="${BUBBLE_PALETTE_CLASS}__button-icon">${codicon("trash")}</span>`;
    clearBtn.addEventListener("mousedown", (e) => {
        e.preventDefault();
        e.stopPropagation();
        clearSelectionColors(vditor);
        hideColorPalette(vditor);
        hideBubbleMenu(vditor);
    });

    const dragHandle = document.createElement("div");
    dragHandle.className = `${BUBBLE_PALETTE_CLASS}__drag`;
    dragHandle.setAttribute("aria-label", "抓取面板（点击或拖动会自动锁定面板）");

    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = `${BUBBLE_PALETTE_CLASS}__close`;
    closeBtn.setAttribute("aria-label", "关闭面板（同时退出锁定）");
    closeBtn.innerHTML = `<span class="${BUBBLE_PALETTE_CLASS}__button-icon">${codicon("close")}</span>`;
    closeBtn.addEventListener("mousedown", (e) => {
        e.preventDefault();
        e.stopPropagation();
        // 关闭按钮无视 pin 状态，强制关闭；同时清掉 --pinned class，
        // 不然下次打开面板时抓手还带着锁定高亮
        const state = paletteMap.get(vditor);
        if (state) {
            state.pinned = false;
            palette.classList.remove(`${BUBBLE_PALETTE_CLASS}__pinned`);
            state.element.classList.remove(BUBBLE_PALETTE_VISIBLE_CLASS);
            state.visible = false;
            if (state.anchorButton) {
                state.anchorButton.classList.remove(`${BUBBLE_MENU_CLASS}__btn--active`);
                state.anchorButton = null;
            }
        }
        hideBubbleMenu(vditor);
    });

    header.append(clearBtn, dragHandle, closeBtn);
    palette.appendChild(header);

    // 拖拽逻辑：参考 htmlInlineEditor.ts 的 makePopoverDraggable
    makePaletteDraggable(palette, dragHandle, vditor);

    /** 构建一行（标题 + 可重绘的色块区），render 在每次显示时用最新颜色数组重绘色块 */
    const buildRow = (label: string, apply: (color: string) => void) => {
        const row = document.createElement("div");
        row.className = `${BUBBLE_PALETTE_CLASS}__row`;
        const titleEl = document.createElement("span");
        titleEl.className = `${BUBBLE_PALETTE_CLASS}__title`;
        titleEl.textContent = label;
        row.appendChild(titleEl);

        const render = (colors: readonly string[]) => {
            row.querySelectorAll(`.${BUBBLE_PALETTE_CLASS}__swatch`).forEach((el) => el.remove());
            colors.forEach(color => {
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
        };
        return { row, render };
    };

    const textRow = buildRow("文字", (color) => {
        setSelectionColor(vditor, { color });
    });
    palette.appendChild(textRow.row);

    const bgRow = buildRow("背景", (color) => {
        setSelectionColor(vditor, { backgroundColor: color });
    });
    palette.appendChild(bgRow.row);

    // 同气泡菜单：首次显示时由 showColorPalette 挂到 vditor.element 内
    return {
        element: palette,
        renderText: textRow.render,
        renderBg: bgRow.render,
    };
};

/**
 * 让 palette 面板可以拖拽移动。逻辑参考 htmlInlineEditor.ts 的 makePopoverDraggable：
 * 拖动时切换到 position: fixed 让面板固定在视口某点，松手后保留新位置。
 * 拖动期间会顺手把面板标记为 pinned——抓一下或拖一下就锁定，跟外层关闭逻辑解耦。
 */
const makePaletteDraggable = (palette: HTMLElement, handle: HTMLElement, vditor: IVditor) => {
    let offsetX = 0;
    let offsetY = 0;
    let activePointerId: number | null = null;
    let didMove = false;

    const lockPalette = () => {
        const state = paletteMap.get(vditor);
        if (state && !state.pinned) {
            state.pinned = true;
            palette.classList.add(`${BUBBLE_PALETTE_CLASS}__pinned`);
        }
    };

    const onPointerMove = (e: PointerEvent) => {
        if (e.pointerId !== activePointerId) return;
        if (!didMove) {
            // 第一次真的移动时锁定面板（pointerdown 时已经锁了一次，这里是兜底）
            lockPalette();
            didMove = true;
        }
        // 真正开始拖了就切到 fixed，避免 absolute 跟随容器坐标系
        if (palette.style.position !== "fixed") {
            const rect = palette.getBoundingClientRect();
            palette.style.position = "fixed";
            palette.style.left = `${rect.left}px`;
            palette.style.top = `${rect.top}px`;
            palette.style.right = "auto";
            offsetX = e.clientX - rect.left;
            offsetY = e.clientY - rect.top;
        }
        const maxLeft = window.innerWidth - 40;
        const maxTop = window.innerHeight - 30;
        const newLeft = Math.max(
            -palette.offsetWidth / 2,
            Math.min(e.clientX - offsetX, maxLeft),
        );
        const newTop = Math.max(
            0,
            Math.min(e.clientY - offsetY, maxTop),
        );
        palette.style.left = `${newLeft}px`;
        palette.style.top = `${newTop}px`;
    };

    const endDrag = (e: PointerEvent) => {
        if (e.pointerId !== activePointerId) return;
        activePointerId = null;
        handle.removeEventListener("pointermove", onPointerMove);
        handle.removeEventListener("pointerup", endDrag);
        handle.removeEventListener("pointercancel", endDrag);
    };

    handle.addEventListener("pointerdown", (e: PointerEvent) => {
        if (e.button !== 0) return;
        // 抓手上的 button 等元素不被吞掉
        if ((e.target as HTMLElement).closest("button, input, textarea, [contenteditable]")) {
            return;
        }
        e.preventDefault();
        activePointerId = e.pointerId;
        try {
            handle.setPointerCapture(e.pointerId);
        } catch {
            // 旧浏览器或非 pointer 场景兜底
        }
        // 点击拖拽抓手 → 自动进入 pin 模式（也保证"光点不拖"也是 pin）
        lockPalette();
        // 记录初始偏移
        const rect = palette.getBoundingClientRect();
        offsetX = e.clientX - rect.left;
        offsetY = e.clientY - rect.top;
        handle.addEventListener("pointermove", onPointerMove);
        handle.addEventListener("pointerup", endDrag);
        handle.addEventListener("pointercancel", endDrag);
    });
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

    if (!state.element.isConnected) {
        // 挂到 vditor 根元素内，继承主题变量（深色模式下 --panel-background-color 等为深色值）
        vditor.element.appendChild(state.element);
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

    if (!state.element.isConnected) {
        // 同气泡菜单：挂到 vditor 根元素内继承主题变量
        vditor.element.appendChild(state.element);
    }

    // 每次显示时重绘色块，读取最新的 window.TEXT_COLORS / window.BG_COLORS
    state.renderText(resolveTextColors());
    state.renderBg(resolveBgColors());

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
    // Pin 模式下不响应外部关闭请求（点击空白处、滚动、气泡菜单消失等）
    if (state.pinned) {
        return;
    }
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
    const paletteResult = createColorPaletteElement(vditor);
    paletteMap.set(vditor, {
        element: paletteResult.element,
        visible: false,
        kind: null,
        anchorButton: null,
        renderText: paletteResult.renderText,
        renderBg: paletteResult.renderBg,
        pinned: false,
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
