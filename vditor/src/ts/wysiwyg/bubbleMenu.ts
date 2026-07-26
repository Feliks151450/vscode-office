import {codicon} from "../util/codicon";
import {hasClosestByMatchTag} from "../util/hasClosest";
import {getEditorRange, selectIsEditor, setSelectionFocus} from "../util/selection";
import {genAPopover, highlightToolbarWYSIWYG} from "./highlightToolbarWYSIWYG";
import {getModePopover} from "../codeBlock/codeBlockLanguagePopover";
import {afterRenderEvent} from "./afterRenderEvent";

const BUBBLE_MENU_CLASS = "vditor-bubble-menu";
const BUBBLE_MENU_VISIBLE_CLASS = "vditor-bubble-menu--visible";

interface IBubbleMenuState {
    element: HTMLElement;
    visible: boolean;
    hideTimer: number | null;
    editorElement: HTMLElement;
    isSelecting: boolean;
}

const menuMap = new WeakMap<IVditor, IBubbleMenuState>();

const FORMAT_ITEMS = [
    { name: "copy", icon: "copy" },
    { name: "bold", icon: "bold" },
    { name: "italic", icon: "italic" },
    { name: "strike", icon: "strikethrough" },
    { name: "highlight", icon: "paintcan" },
    { name: "inline-code", icon: "symbol-text" },
    { name: "code", icon: "code" },
    { name: "link", icon: "link" },
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
            } else if (item.name === "copy") {
                const selection = window.getSelection();
                if (selection) {
                    navigator.clipboard.writeText(selection.toString());
                }
            } else if (item.name === "highlight") {
                insertMark(vditor);
            } else {
                clickToolbarButton(vditor, item.name);
            }
            hideBubbleMenu(vditor);
        });
        menu.appendChild(btn);
    });

    document.body.appendChild(menu);
    return menu;
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
    }, 100);
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

    document.addEventListener("selectionchange", () => {
        if (!state.isSelecting) {
            checkSelection(vditor);
        }
    });

    editorElement.addEventListener("mousedown", (e) => {
        if (e.target && (e.target as HTMLElement).closest?.(`.${BUBBLE_MENU_CLASS}`)) {
            return;
        }
        state.isSelecting = true;
        hideBubbleMenu(vditor);
    });

    editorElement.addEventListener("mouseup", () => {
        state.isSelecting = false;
        checkSelection(vditor);
    });

    document.addEventListener("scroll", () => {
        if (state.visible) {
            const selection = window.getSelection();
            if (selection && selection.rangeCount > 0) {
                positionBubbleMenu(state.element, selection.getRangeAt(0));
            }
        }
    }, { passive: true });
};

export const destroyBubbleMenu = (vditor: IVditor) => {
    const state = menuMap.get(vditor);
    if (!state) return;

    if (state.hideTimer !== null) {
        clearTimeout(state.hideTimer);
    }
    state.element.remove();
    menuMap.delete(vditor);
};
