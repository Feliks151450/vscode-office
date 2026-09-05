import {setSelectionFocus} from "../util/selection";
import {renderTocNow} from "../util/toc";
import {afterRenderEvent} from "./afterRenderEvent";
import {isCmCodeBlock, removeCmCodeBlock, renderCodeBlocks} from "../codeBlock/codeMirrorManager";
import {insertEmptyBlock, listToggle} from "../util/fixBrowserBehavior";
import {setHeading, removeHeading} from "./setHeading";
import {processHeading} from "../ir/process";
import {codicon} from "../util/codicon";

const BLOCK_MENU_CLASS = "vditor-block-menu";
const BLOCK_MENU_VISIBLE_CLASS = "vditor-block-menu--visible";

interface IBlockMenuState {
    element: HTMLElement;
    visible: boolean;
    /** 当菜单打开时缓存的 activeBlock，点击动作时使用 */
    currentBlock: HTMLElement | null;
    /** 用于定位的拖拽按钮根节点（在 initBlockMenu 时拿到） */
    handleRoot: HTMLElement | null;
}

const menuMap = new WeakMap<IVditor, IBlockMenuState>();

type BlockAction =
    | "paragraph"
    | "h1" | "h2" | "h3" | "h4" | "h5" | "h6"
    | "list" | "ordered-list" | "check"
    | "quote" | "code"
    | "insert-before" | "insert-after"
    | "duplicate" | "copy" | "delete";

interface IBlockMenuItem {
    type?: "divider" | "label";
    text?: string;
    action?: BlockAction;
    label?: string;
    icon?: string;
}

const BLOCK_MENU_ITEMS: IBlockMenuItem[] = [
    { action: "insert-before", label: "在前插入", icon: "arrow-up" },
    { action: "insert-after", label: "在后插入", icon: "arrow-down" },
    { type: "divider" },
    { type: "label", text: "转为" },
    { action: "paragraph", label: "段落", icon: "paragraph" },
    { action: "h1", label: "标题 1", icon: "type-h1" },
    { action: "h2", label: "标题 2", icon: "type-h2" },
    { action: "h3", label: "标题 3", icon: "type-h3" },
    { action: "h4", label: "标题 4", icon: "type-h4" },
    { action: "h5", label: "标题 5", icon: "type-h5" },
    { action: "h6", label: "标题 6", icon: "type-h6" },
    { action: "list", label: "无序列表", icon: "list-unordered" },
    { action: "ordered-list", label: "有序列表", icon: "list-ordered" },
    { action: "check", label: "任务列表", icon: "tasklist" },
    { action: "quote", label: "引用", icon: "quote" },
    { action: "code", label: "代码块", icon: "code" },
    { type: "divider" },
    { action: "duplicate", label: "复制块", icon: "copy" },
    { action: "copy", label: "复制 Markdown", icon: "clippy" },
    { action: "delete", label: "删除块", icon: "trash" },
];

/**
 * 内置 BlockAction 集合，用于校验 window.BLOCK_MENU_ITEMS 的合法性。
 * 仅支持覆盖/重排/重命名内置动作；新增动作需扩展 BlockAction + dispatchBlockAction。
 */
const BLOCK_MENU_ACTIONS: readonly string[] = [
    "paragraph", "h1", "h2", "h3", "h4", "h5", "h6",
    "list", "ordered-list", "check", "quote", "code",
    "insert-before", "insert-after", "duplicate", "copy", "delete",
];

declare global {
    interface Window {
        /**
         * 自定义块操作菜单项，覆盖内置 BLOCK_MENU_ITEMS。
         * - 支持 divider / label / 内置 action 项，可调整顺序、文案、图标
         * - 未设置（或为空数组）时使用内置默认项
         * - 每次 show 时读取，因此支持动态改 window.BLOCK_MENU_ITEMS 后重开菜单生效
         */
        BLOCK_MENU_ITEMS?: IBlockMenuItem[];
    }
}

/**
 * 读取最新的块菜单项：window.BLOCK_MENU_ITEMS 未设置或非法时回退到内置。
 * 过滤掉未知 action 的项并打印警告（仅 divier / label 项无需 action）。
 */
export const resolveBlockMenuItems = (): IBlockMenuItem[] => {
    const custom = window.BLOCK_MENU_ITEMS;
    if (!Array.isArray(custom) || custom.length === 0) {
        return BLOCK_MENU_ITEMS;
    }
    return custom.filter((item) => {
        if (item.type === "divider" || item.type === "label") {
            return true;
        }
        const action = item.action;
        if (typeof action !== "string" || !BLOCK_MENU_ACTIONS.includes(action)) {
            console.warn("[blockMenu] ignored item with unknown action:", item);
            return false;
        }
        return true;
    });
};

const placeRangeInBlock = (block: HTMLElement, editorElement?: HTMLElement) => {
    const range = document.createRange();
    range.selectNodeContents(block);
    range.collapse(false);
    // 先 focus 编辑器再设选区，避免 Safari/某些浏览器在编辑器失焦时
    // addRange 被随后立即触发的 selectionchange 覆盖掉
    if (editorElement && document.activeElement !== editorElement) {
        editorElement.focus({ preventScroll: true });
    }
    setSelectionFocus(range);
};

/**
 * 把块转为代码块 —— WYSIWYG / IR 模式共用同一套 DOM 结构，只是承载容器标签不同
 * （wysiwyg 用 div.vditor-wysiwyg__block，ir 用 div.vditor-ir__node）。
 */
const convertToCodeBlock = (vditor: IVditor, block: HTMLElement) => {
    const isWysiwyg = vditor.currentMode === "wysiwyg";
    const node = document.createElement("div");
    node.className = isWysiwyg ? "vditor-wysiwyg__block" : "vditor-ir__node";
    node.setAttribute("data-type", "code-block");
    node.setAttribute("data-block", "0");
    node.setAttribute("data-marker", "```");
    node.innerHTML = "<pre><code><wbr>\n</code></pre>";
    block.parentElement?.insertBefore(node, block.nextSibling);
    block.remove();
    renderCodeBlocks(vditor);
    afterRenderEvent(vditor);
};

const convertToQuote = (vditor: IVditor, block: HTMLElement) => {
    const isWysiwyg = vditor.currentMode === "wysiwyg";
    const wrapper = document.createElement(isWysiwyg ? "div" : "p");
    wrapper.className = isWysiwyg ? "vditor-wysiwyg__block" : "vditor-ir__node";
    const quote = document.createElement("blockquote");
    quote.setAttribute("data-block", "0");
    quote.innerHTML = block.innerHTML;
    wrapper.appendChild(quote);
    block.parentElement?.insertBefore(wrapper, block.nextSibling);
    block.remove();
    afterRenderEvent(vditor);
};

const duplicateBlock = (vditor: IVditor, block: HTMLElement) => {
    const clone = block.cloneNode(true) as HTMLElement;
    block.parentElement?.insertBefore(clone, block.nextSibling);
    afterRenderEvent(vditor);
};

/**
 * 把块的 HTML 转成 Markdown 后写入剪贴板。
 * 优先走宿主注入的 window.copyToClipboard（用 nativeCopy:// URL scheme
 * 让原生宿主接管，避免 WebView 沙箱里 clipboard API 不可用）；
 * 未注入时再降级 navigator.clipboard.writeText → execCommand("copy")。
 */
const copyBlockAsMarkdown = async (vditor: IVditor, block: HTMLElement) => {
    // 必须先预处理块 HTML，否则 Lute 在转 markdown 时会把渲染产物当内容读：
    //   1) <code data-type="math-inline"> 内联公式源：HTML2Md 不认识 data-type="math-inline"，
    //      会把 <code> 当 inline code 输出 `` `latex` ``（带反引号），且不会丢掉紧随其后的
    //      <mjx-container> SVG 内容，于是 $asdf$ 被复制成 `` asdf`asdf `` 这种样子；
    //   2) <code> 文本开头按约定带 ZWSP（防 CodeMirror 把整段当空段），不属于 markdown 输出；
    //   3) code-block / math-block 的预览容器（vditor-wysiwyg__preview 里的 SVG）必须整段剥掉。
    const clone = block.cloneNode(true) as HTMLElement;
    // 块级预览（已渲染的 math/code 块）：整段移除，只保留源 code
    clone.querySelectorAll(".vditor-wysiwyg__preview, .vditor-ir__preview").forEach((el) => el.remove());
    // 行内公式的 CodeMirror 编辑实例化容器
    clone.querySelectorAll(".vditor-math-inline__cm-host, .cm-editor, .vditor-cm-chrome, .vditor-editor-boundary").forEach((el) => el.remove());
    // 行内公式 editing 态：清掉 class 让 <code> 重新可见（display:none）
    clone.querySelectorAll(".vditor-math-inline--editing").forEach((el) => el.classList.remove("vditor-math-inline--editing"));
    // 行内公式源 <code> 的 ZWSP 前缀是 Vditor 内部约定（防止 CodeMirror 把整段当成空文档），
    // 不属于 markdown 内容；剥离后输出 $latex$ 才干净。
    clone.querySelectorAll("code[data-type='math-inline']").forEach((el) => {
        // Constants.ZWSP = "​"：行内公式源 codeEl 的开头约定塞一个 ZWSP，避免 CodeMirror
        // 把整段当成空文档；不属于 markdown 输出，剥离后 VditorDOM2Md 才能输出干净的 $latex$。
        el.textContent = (el.textContent || "").replaceAll("​", "");
    });
    const html = clone.outerHTML;
    let markdown = "";
    try {
        // 走 VditorDOM2Md / VditorIRDOM2Md 而非 HTML2Md：前者认 data-type="math-inline"、
        // data-type="math-block" 等 Vditor 专属属性，能把内联 / 行间公式正确转回 $...$ / ```math```。
        // HTML2Md 是通用 HTML→MD，不感知这些 data-type，对 <code data-type="math-inline"> 退化成反引号。
        markdown = vditor.currentMode === "ir"
            ? (vditor.lute?.VditorIRDOM2Md(html) ?? "")
            : (vditor.lute?.VditorDOM2Md(html) ?? "");
    } catch (err) {
        console.error("[blockMenu] VditorDOM2Md failed", err);
    }
    // 1) 宿主接管：vditorProFunc.js 注入的 nativeCopy:// 桥
    const hostCopy = (window as Window & {
        copyToClipboard?: (text: string) => void;
    }).copyToClipboard;
    if (typeof hostCopy === "function") {
        try {
            hostCopy(markdown);
            vditor.tip.show("已复制", 1200);
            return;
        } catch (err) {
            console.warn("[blockMenu] host copyToClipboard failed, fall back", err);
        }
    }
    // 2) 浏览器 Clipboard API
    if (navigator.clipboard?.writeText) {
        try {
            await navigator.clipboard.writeText(markdown);
            vditor.tip.show("已复制", 1200);
            return;
        } catch {
            // fall through to execCommand fallback
        }
    }
    // 3) execCommand 兜底（WKWebView / 旧浏览器）
    const textarea = document.createElement("textarea");
    textarea.value = markdown;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    textarea.style.pointerEvents = "none";
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand("copy");
    textarea.remove();
    vditor.tip.show(ok ? "已复制" : "复制失败", 1500);
};

const deleteBlock = (vditor: IVditor, block: HTMLElement) => {
    if (isCmCodeBlock(block)) {
        removeCmCodeBlock(vditor, block);
    } else {
        block.remove();
        renderTocNow(vditor);
        vditor.undo.addToUndoStack(vditor);
        afterRenderEvent(vditor);
    }
};

const dispatchBlockAction = (vditor: IVditor, block: HTMLElement, action: BlockAction) => {
    if (!block.isConnected) {
        return;
    }
    const isWysiwyg = vditor.currentMode === "wysiwyg";
    const editorElement = isWysiwyg ? vditor.wysiwyg?.element : vditor.ir?.element;

    // 头部操作需要光标在块内
    if (action === "paragraph") {
        placeRangeInBlock(block, editorElement);
        if (isWysiwyg) {
            removeHeading(vditor);
        } else {
            processHeading(vditor, "");
        }
        return;
    }

    if (/^h[1-6]$/.test(action)) {
        placeRangeInBlock(block, editorElement);
        if (isWysiwyg) {
            setHeading(vditor, action);
        } else {
            processHeading(vditor, "#".repeat(parseInt(action[1])) + " ");
        }
        return;
    }

    if (action === "list" || action === "ordered-list" || action === "check") {
        placeRangeInBlock(block, editorElement);
        const range = window.getSelection()?.getRangeAt(0);
        if (range) {
            listToggle(vditor, range, action, false);
            afterRenderEvent(vditor);
        }
        return;
    }

    if (action === "quote") {
        convertToQuote(vditor, block);
        return;
    }

    if (action === "code") {
        convertToCodeBlock(vditor, block);
        return;
    }

    if (action === "duplicate") {
        duplicateBlock(vditor, block);
        return;
    }

    if (action === "copy") {
        // 异步操作，内部已处理 clipboard 异常与降级，单独 fire-and-forget
        copyBlockAsMarkdown(vditor, block);
        return;
    }

    if (action === "delete") {
        deleteBlock(vditor, block);
        return;
    }

    if (action === "insert-before" || action === "insert-after") {
        const position: InsertPosition = action === "insert-before" ? "beforebegin" : "afterend";
        // 编辑器需要先获得焦点，setRangeByWbr 才能成功设置光标
        if (editorElement && document.activeElement !== editorElement) {
            editorElement.focus({ preventScroll: true });
        }
        insertEmptyBlock(vditor, position, block);
        return;
    }
};

const renderMenuItems = (menu: HTMLElement) => {
    menu.innerHTML = "";
    for (const item of resolveBlockMenuItems()) {
        if (item.type === "divider") {
            const div = document.createElement("div");
            div.className = `${BLOCK_MENU_CLASS}__divider`;
            menu.appendChild(div);
            continue;
        }
        if (item.type === "label") {
            const lbl = document.createElement("div");
            lbl.className = `${BLOCK_MENU_CLASS}__label`;
            lbl.textContent = item.text || "";
            menu.appendChild(lbl);
            continue;
        }
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = `${BLOCK_MENU_CLASS}__item`;
        btn.setAttribute("data-action", item.action || "");
        btn.innerHTML = `
            <span class="${BLOCK_MENU_CLASS}__item-icon">${item.icon ? codicon(item.icon) : ""}</span>
            <span class="${BLOCK_MENU_CLASS}__item-label">${item.label || ""}</span>
        `;
        btn.addEventListener("mousedown", (e) => {
            e.preventDefault();
            e.stopPropagation();
            // findStateFromMenu 返回的是 { vditor, state } 包装对象
            const entry = findStateFromMenu(menu);
            if (!entry) {
                console.warn("[blockMenu] no state for menu", menu, menuToState.has(menu));
                return;
            }
            const vditor = entry.vditor;
            const state = entry.state;
            if (!state.currentBlock) {
                console.warn("[blockMenu] no currentBlock", state.visible);
                return;
            }
            const action = item.action as BlockAction;
            const block = state.currentBlock;
            hideBlockMenu(vditor);
            try {
                dispatchBlockAction(vditor, block, action);
            } catch (err) {
                console.error("[blockMenu] dispatch error", err, action);
            }
        });
        menu.appendChild(btn);
    }
};

// 反查 helper：因为 menu 元素的 click 闭包拿不到 state，靠 DOM 关联
// 这里用一个简单的 module-level 映射把 menu → state 关联起来
const menuToState = new WeakMap<HTMLElement, { vditor: IVditor; state: IBlockMenuState }>();

const findStateFromMenu = (menu: HTMLElement) => menuToState.get(menu) || null;

const vditorForState = (s: { vditor: IVditor; state: IBlockMenuState }) => s.vditor;

const createBlockMenuElement = (vditor: IVditor): {
    element: HTMLElement;
    handleRoot: HTMLElement | null;
} => {
    const root = document.createElement("div");
    root.className = BLOCK_MENU_CLASS;
    renderMenuItems(root);
    // 不挂到 body：vditor 的主题变量（--bg-color 等）在 html 级别可用，但保险起见也放在 vditor.element 内
    // 实际这里用 document.body，因为要 fixed 定位且要避免被编辑器 overflow 裁剪
    document.body.appendChild(root);

    // 占位 — 真正的 handleRoot 在 initBlockMenu 里通过参数传入
    return { element: root, handleRoot: null };
};

/**
 * 把 vditor 元素当前计算出的主题色变量同步到菜单元素上。
 *
 * Auto 主题的深色变量定义在 `#vditor[data-editor-theme="Auto"].vditor--dark`
 * 上，不在 html 级；菜单挂在 body 拿不到。手动复制 inline style 让菜单在所有
 * 主题下（包括 Auto 深浅切换）都跟 vditor 同步。
 */
const syncBlockMenuTheme = (menu: HTMLElement) => {
    const vditorElement = document.getElementById("vditor");
    if (!vditorElement) return;
    const source = getComputedStyle(vditorElement);
    const vars = ["--bg-color", "--front-color", "--second-bg-color", "--second-color", "--border-color"];
    for (const name of vars) {
        const value = source.getPropertyValue(name).trim();
        if (value) {
            menu.style.setProperty(name, value);
        }
    }
};

const positionBlockMenu = (menu: HTMLElement, handleRoot: HTMLElement | null, block: HTMLElement | null) => {
    // 拿锚点矩形（优先用拖拽按钮根节点；fallback 用块本身）
    const anchor = handleRoot || block;
    if (!anchor) {
        menu.style.left = "50%";
        menu.style.top = "50%";
        return;
    }
    const rect = anchor.getBoundingClientRect();
    const gap = 8;          // 菜单离锚点的间距
    const margin = 8;       // 菜单离视口边缘的最小间距

    // 显示前菜单是 display: none，offsetWidth/Height = 0；先临时放到屏幕外
    // 测量一次真实尺寸，再还原
    const prevVisibility = menu.style.visibility;
    const prevDisplay = menu.style.display;
    const prevLeft = menu.style.left;
    const prevTop = menu.style.top;
    menu.style.visibility = "hidden";
    menu.style.display = "flex";
    menu.style.left = "-9999px";
    menu.style.top = "-9999px";
    const menuWidth = menu.offsetWidth;
    const menuHeight = menu.offsetHeight;
    menu.style.visibility = prevVisibility;
    menu.style.display = prevDisplay;
    menu.style.left = prevLeft;
    menu.style.top = prevTop;

    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // ---- 横向定位 ----
    // 偏好：默认放右侧（紧贴拖拽按钮右边）
    // 如果右边放不下（菜单右沿会超出 viewport），翻到左边（贴按钮左沿）
    // 两侧都放不下 → 贴视口右边 clamp
    let left = rect.right + gap;
    if (left + menuWidth > vw - margin) {
        const flipLeft = rect.left - menuWidth - gap;
        if (flipLeft >= margin) {
            left = flipLeft;
        } else {
            // 两侧都不够 → 选能放下更多的一侧，并贴 viewport clamp
            const rightSpace = vw - margin - rect.right - gap;
            const leftSpace = rect.left - gap - margin;
            if (rightSpace >= leftSpace) {
                left = Math.max(margin, vw - margin - menuWidth);
            } else {
                left = margin;
            }
        }
    }
    left = Math.max(margin, Math.min(left, vw - margin - menuWidth));

    // ---- 纵向定位 ----
    // 偏好：默认顶对齐 handle.top
    // 如果下面放不下，翻到上方（底对齐 handle.bottom）
    // 上下都不够 → 选能放下更多的一侧，clamp 到 viewport
    let top = rect.top;
    if (top + menuHeight > vh - margin) {
        const flipTop = rect.bottom - menuHeight;
        if (flipTop >= margin) {
            top = flipTop;
        } else {
            const belowSpace = vh - margin - rect.top;
            const aboveSpace = rect.bottom - margin;
            if (belowSpace >= aboveSpace) {
                top = Math.max(margin, vh - margin - menuHeight);
            } else {
                top = margin;
            }
        }
    }
    top = Math.max(margin, Math.min(top, vh - margin - menuHeight));

    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
};

export const showBlockMenu = (vditor: IVditor, block: HTMLElement, handleRoot?: HTMLElement) => {
    const state = menuMap.get(vditor);
    if (!state || !block) {
        return;
    }
    state.currentBlock = block;
    state.handleRoot = handleRoot || null;
    // 先同步主题变量再定位、显示，避免出现一次"亮 → 暗"的闪烁
    syncBlockMenuTheme(state.element);
    positionBlockMenu(state.element, state.handleRoot, block);
    state.element.offsetHeight;  // force reflow for transition
    state.element.classList.add(BLOCK_MENU_VISIBLE_CLASS);
    state.visible = true;
};

export const hideBlockMenu = (vditor: IVditor) => {
    const state = menuMap.get(vditor);
    if (!state) return;
    state.element.classList.remove(BLOCK_MENU_VISIBLE_CLASS);
    state.visible = false;
    state.currentBlock = null;
    state.handleRoot = null;
};

export const isBlockMenuOpen = (vditor: IVditor): boolean => {
    return menuMap.get(vditor)?.visible ?? false;
};

export const initBlockMenu = (vditor: IVditor, _editorElement: HTMLElement, handleRoot?: HTMLElement) => {
    if (menuMap.has(vditor)) {
        return;
    }

    const { element } = createBlockMenuElement(vditor);
    const state: IBlockMenuState = {
        element,
        visible: false,
        currentBlock: null,
        handleRoot: handleRoot || null,
    };
    menuMap.set(vditor, state);
    menuToState.set(element, { vditor, state });

    // 菜单元素自身的 mousedown 防止冒泡到 document 触发隐藏
    element.addEventListener("mousedown", (e) => {
        e.stopPropagation();
    });

    document.addEventListener("mousedown", (e) => {
        if (!state.visible) return;
        if (element.contains(e.target as Node)) return;
        hideBlockMenu(vditor);
    });

    document.addEventListener("scroll", () => {
        if (state.visible) hideBlockMenu(vditor);
    }, true);

    window.addEventListener("resize", () => {
        if (state.visible) hideBlockMenu(vditor);
    });
};

export const destroyBlockMenu = (vditor: IVditor) => {
    const state = menuMap.get(vditor);
    if (!state) return;
    menuToState.delete(state.element);
    state.element.remove();
    menuMap.delete(vditor);
};