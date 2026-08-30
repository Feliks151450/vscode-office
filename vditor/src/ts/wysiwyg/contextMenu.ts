import { getEditorRange, selectIsEditor } from "../util/selection";
import { afterRenderEvent } from "./afterRenderEvent";

const CONTEXT_MENU_CLASS = "vditor-contextmenu";
const CONTEXT_MENU_VISIBLE_CLASS = "vditor-contextmenu--visible";

interface IContextMenuState {
    element: HTMLElement;
    visible: boolean;
    editorElement: HTMLElement;
}

const menuMap = new WeakMap<IVditor, IContextMenuState>();

const FORMAT_ITEMS = [
    { name: "bold", label: "加粗" },
    { name: "italic", label: "斜体" },
    { name: "strike", label: "删除线" },
    { name: "h1", label: "标题 1" },
    { name: "h2", label: "标题 2" },
    { name: "inline-code", label: "行内代码" },
    { name: "code", label: "代码块" },
    { name: "quote", label: "引用" },
    { name: "list", label: "无序列表" },
    { name: "ordered-list", label: "有序列表" },
    { name: "link", label: "插入链接" },
    { name: "upload", label: "插入图片" },
    { name: "line", label: "分割线" },
    { name: "copy", label: "复制" },
    { name: "cut", label: "剪切" },
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

    const popover = vditor.wysiwyg.popover;
    if (popover) {
        popover.style.display = "block";
        const hrefInput = popover.querySelector(".vditor-link-popover__href") as HTMLInputElement;
        if (hrefInput) {
            hrefInput.focus();
        }
    }
};

const createContextMenuElement = (vditor: IVditor): HTMLElement => {
    const menu = document.createElement("div");
    menu.className = CONTEXT_MENU_CLASS;

    FORMAT_ITEMS.forEach((item) => {
        const btn = document.createElement("div");
        btn.type = "button";
        btn.className = `${CONTEXT_MENU_CLASS}__item`;
        btn.setAttribute("data-menu-action", item.name);
        btn.innerHTML = '<span class="vditor-contextmenu__item-label">' + item.label + '</span>';
        btn.addEventListener("mousedown", (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (item.name === "link") {
                insertLink(vditor);
            } else {
                clickToolbarButton(vditor, item.name);
            }
            hideContextMenu(vditor);
        });
        menu.appendChild(btn);
    });

    menu.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        e.stopPropagation();
    });

    document.body.appendChild(menu);
    return menu;
};

const positionContextMenu = (menu: HTMLElement, x: number, y: number) => {
    const menuWidth = 220;
    const menuHeight = menu.offsetHeight || 300;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    if (x + menuWidth > viewportWidth) {
        x = viewportWidth - menuWidth - 8;
    }
    if (y + menuHeight > viewportHeight) {
        y = y - menuHeight;
    }
    if (x < 0) x = 8;
    if (y < 0) y = 8;

    menu.style.left = x + "px";
    menu.style.top = y + "px";
};

const showContextMenu = (vditor: IVditor, menu: HTMLElement, x: number, y: number) => {
    const state = menuMap.get(vditor);
    if (!state) {
        return;
    }

    // 标记右键菜单已打开，阻止气泡菜单显示
    (vditor as IVditor & { _contextMenuOpen?: boolean })._contextMenuOpen = true;

    positionContextMenu(menu, x, y);
    menu.offsetHeight;
    menu.classList.add(CONTEXT_MENU_VISIBLE_CLASS);
    state.visible = true;
};

const hideContextMenu = (vditor: IVditor) => {
    const state = menuMap.get(vditor);
    if (!state) return;

    state.element.classList.remove(CONTEXT_MENU_VISIBLE_CLASS);
    state.visible = false;
};

export const initContextMenu = (vditor: IVditor, editorElement: HTMLElement) => {
    if (menuMap.has(vditor)) {
        return;
    }

    const element = createContextMenuElement(vditor);

    const state: IContextMenuState = {
        element,
        visible: false,
        editorElement,
    };
    menuMap.set(vditor, state);

    editorElement.addEventListener("contextmenu", (e: MouseEvent) => {
        if (window.vditorDebug) {
            console.log("[contextMenu] right-click, enableContextMenu =", vditor.options.enableContextMenu);
        }
        if (!vditor.options.enableContextMenu) {
            return;
        }
        e.preventDefault();
        e.stopPropagation();

        if (!vditor.wysiwyg?.element) {
            return;
        }
        if (!selectIsEditor(vditor.wysiwyg.element)) {
            return;
        }

        showContextMenu(vditor, element, e.clientX, e.clientY);
    });

    document.addEventListener("mousedown", (e) => {
        if (!element.contains(e.target)) {
            hideContextMenu(vditor);
            // 延迟清空标志位，确保 mouseup → checkSelection 能读到
            setTimeout(() => {
                (vditor as IVditor & { _contextMenuOpen?: boolean })._contextMenuOpen = false;
            }, 200);
        }
    });

    document.addEventListener("scroll", () => {
        if (state.visible) {
            hideContextMenu(vditor);
        }
    }, true);

    window.addEventListener("resize", () => {
        if (state.visible) {
            hideContextMenu(vditor);
        }
    });
};

export const destroyContextMenu = (vditor: IVditor) => {
    const state = menuMap.get(vditor);
    if (!state) return;

    state.element.remove();
    menuMap.delete(vditor);
};
