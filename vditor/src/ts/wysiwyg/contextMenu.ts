import { getEditorRange, selectIsEditor } from "../util/selection";
import { afterRenderEvent } from "./afterRenderEvent";

const CONTEXT_MENU_CLASS = "vditor-contextmenu";
const CONTEXT_MENU_VISIBLE_CLASS = "vditor-contextmenu--visible";

interface IContextMenuState {
    element: HTMLElement;
    visible: boolean;
}

const menuMap = new WeakMap<IVditor, IContextMenuState>();

const clickToolbarButton = (vditor: IVditor, name: string) => {
    const toolbarBtn = vditor.toolbar.elements?.[name]?.firstElementChild as HTMLElement;
    if (toolbarBtn) {
        toolbarBtn.click();
    }
};

const buildMenuHTML = (): string => {
    const iconBold = "<b>B</b>";
    const iconItalic = "<i>I</i>";
    const iconStrike = "<s>S</s>";
    const iconH1 = "<b>H1</b>";
    const iconH2 = "<b>H2</b>";
    const iconCode = '<code>&lt;/&gt;</code>';
    const iconQuote = '<b>"</b>';
    const iconUL = "<b>&#8226;</b>";
    const iconOL = "<b>1.</b>";
    const iconLink = "<b>&#128279;</b>";
    const iconImage = "<b>&#127912;</b>";
    const iconHR = "<b>&mdash;</b>";
    const iconCopy = "<b>&#128203;</b>";
    const iconCut = "<b>&#9986;</b>";

    return [
        '<div class="vditor-contextmenu__group-label">文本格式</div>',
        menuItem("bold", iconBold, "加粗"),
        menuItem("italic", iconItalic, "斜体"),
        menuItem("strike", iconStrike, "删除线"),
        '<div class="vditor-contextmenu__divider"></div>',
        menuItem("h1", iconH1, "标题 1"),
        menuItem("h2", iconH2, "标题 2"),
        '<div class="vditor-contextmenu__divider"></div>',
        menuItem("inline-code", iconCode, "行内代码"),
        menuItem("code", iconCode, "代码块"),
        menuItem("quote", iconQuote, "引用"),
        '<div class="vditor-contextmenu__divider"></div>',
        menuItem("list", iconUL, "无序列表"),
        menuItem("ordered-list", iconOL, "有序列表"),
        '<div class="vditor-contextmenu__divider"></div>',
        menuItem("link", iconLink, "插入链接"),
        menuItem("upload", iconImage, "插入图片"),
        menuItem("line", iconHR, "分割线"),
        '<div class="vditor-contextmenu__divider"></div>',
        menuItem("copy", iconCopy, "复制"),
        menuItem("cut", iconCut, "剪切"),
    ].join("");
};

const menuItem = (action: string, icon: string, label: string): string => {
    return '<div class="vditor-contextmenu__item" data-menu-action="' + action + '">' +
        '<span class="vditor-contextmenu__item-icon">' + icon + '</span>' +
        '<span class="vditor-contextmenu__item-label">' + label + '</span>' +
        "</div>";
};

const createContextMenuElement = (vditor: IVditor): HTMLElement => {
    const menu = document.createElement("div");
    menu.className = CONTEXT_MENU_CLASS;
    menu.innerHTML = buildMenuHTML();
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
    if (!state) return;

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

const executeAction = (vditor: IVditor, action: string) => {
    vditor.wysiwyg.element.focus();

    if (action === "h1" || action === "h2") {
        const level = action === "h1" ? 1 : 2;
        const range = getEditorRange(vditor);
        const block = range.startContainer.parentElement;
        if (block) {
            const prefix = "#".repeat(level) + " ";
            const currentText = block.textContent || "";
            if (currentText.startsWith(prefix)) {
                block.textContent = currentText.substring(prefix.length);
            } else {
                const cleaned = currentText.replace(/^#{1,6}\s/, "");
                block.textContent = prefix + cleaned;
            }
            afterRenderEvent(vditor);
        }
        return;
    }

    clickToolbarButton(vditor, action);

    if (action === "code") {
        const range = getEditorRange(vditor);
        if (range.startContainer.nodeType === 3) {
            const text = range.startContainer.textContent || "";
            const parent = range.startContainer.parentElement;
            if (parent && parent.tagName === "PRE") {
                afterRenderEvent(vditor);
            }
        }
    }
};

export const initContextMenu = (vditor: IVditor, editorElement: HTMLElement) => {
    if (menuMap.has(vditor)) {
        return;
    }

    const element = createContextMenuElement(vditor);

    const state: IContextMenuState = {
        element,
        visible: false,
    };
    menuMap.set(vditor, state);

    editorElement.addEventListener("contextmenu", (e: MouseEvent) => {
        if (!selectIsEditor(editorElement)) {
            return;
        }

        e.preventDefault();
        e.stopPropagation();

        const range = getEditorRange(vditor);
        showContextMenu(vditor, element, e.clientX, e.clientY);
    });

    element.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        e.stopPropagation();
    });

    document.addEventListener("mousedown", (e) => {
        if (!element.contains(e.target)) {
            hideContextMenu(vditor);
        }
    });

    element.addEventListener("click", (e) => {
        const item = (e.target as HTMLElement).closest("[data-menu-action]");
        if (!item) return;

        const action = item.getAttribute("data-menu-action");
        if (action) {
            executeAction(vditor, action);
            hideContextMenu(vditor);
        }
    });

    window.addEventListener("scroll", () => {
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
