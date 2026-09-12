/**
 * AI 浮动输入面板（follow-target 风格）
 *
 * 仿照 bubbleMenu 的定位策略（position: absolute + window.scroll 补偿），
 * 但默认显示在目标**下方**。可用于：
 *  - 块菜单的 "AI 帮我" 入口（target: HTMLElement）
 *  - 编程调用 vd.openAIInputPanel(target)（target: HTMLElement | Range）
 *
 * UI 由三部分组成：
 *  - card：顶部横条 + × + textarea + 底部 action 行（sparkle+ / + / BETA / 发送）
 *  - menu：card 下方独立浮层，分类列出快捷动作
 *  - submenu：菜单项"润色"hover 时右侧展开的二级菜单（格式 / 语气 / 详略）
 *
 * 共享 AIPreset 存储（与 aiDialog 相同），按 category 分组渲染：
 *  - category="writing" → menu 顶部直接项（续写/伴写）
 *  - category="rewrite" 或无 category → menu 底部"AI 帮我改"分组
 *  - submenu 3 项硬编码在 SUBMENU_ITEMS，不暴露为 AIPreset
 */

import {
    getAIPresets,
    getAISelections,
} from "../util/globalLocalStorageSettings";
import { AIPreset, DEFAULT_AI_PRESETS } from "../ai/aiPresets";
import { blockToMarkdown } from "../wysiwyg/blockMenu";
import { getEventName } from "../util/compatibility";

const PANEL_CLASS = "vditor-ai-input-panel";

interface ISubmenuItem {
    key: string;
    labelKey: string;
    icon: string;
    goal: string;
}

const SUBMENU_ITEMS: ISubmenuItem[] = [
    {
        key: "polish-format",
        labelKey: "aiPolishFormat",
        icon: "text-size",
        goal: "Polish the text focusing on formatting consistency (spacing, list style, code blocks, headings, links) while preserving meaning.",
    },
    {
        key: "polish-tone",
        labelKey: "aiPolishTone",
        icon: "symbol-color",
        goal: "Polish the text focusing on tone (more formal, casual, friendly, or professional as appropriate) while preserving meaning.",
    },
    {
        key: "polish-detail",
        labelKey: "aiPolishDetail",
        icon: "list-flat",
        goal: "Polish the text focusing on detail level (more concise or more detailed as appropriate) while preserving meaning.",
    },
];

const PRESET_ICONS: Record<string, string> = {
    continue: "pencil",
    cowrite: "copy",
    polish: "sparkle",
    expand: "list-flat",
    shorten: "collapse-all",
    rewrite: "pencil",
    synonym: "refresh",
    grammar: "check",
    clarity: "lightbulb",
    translate: "globe",
};

const displayPresetLabel = (preset: AIPreset, i18n: Record<string, string>): string => {
    if (preset.i18nKey && i18n[preset.i18nKey]) {
        return i18n[preset.i18nKey];
    }
    return preset.label;
};

const buildHTML = (i: Record<string, string>): string => {
    const placeholder = i.aiInputPanelPlaceholder ?? "问 AI";
    const sendLabel = i.aiInputPanelSend ?? "发送";
    const betaLabel = i.aiBeta ?? "Beta";
    return `<div class="${PANEL_CLASS}__card">
        <div class="${PANEL_CLASS}__header" data-ai-header>
            <div class="${PANEL_CLASS}__drag" data-ai-drag aria-label="拖动面板"></div>
            <button type="button" class="${PANEL_CLASS}__close" data-ai-close aria-label="关闭面板">
                <span class="codicon codicon-close"></span>
            </button>
        </div>
        <div class="${PANEL_CLASS}__textarea-wrap">
            <textarea class="${PANEL_CLASS}__textarea" rows="3"
                placeholder="${placeholder}"></textarea>
        </div>
        <div class="${PANEL_CLASS}__row ${PANEL_CLASS}__row--actions">
            <button type="button" class="${PANEL_CLASS}__action ${PANEL_CLASS}__action--menu"
                data-ai-menu title="快捷操作">
                <span class="codicon codicon-sparkle"></span>
                <span class="codicon codicon-add ${PANEL_CLASS}__action-plus"></span>
            </button>
            <button type="button" class="${PANEL_CLASS}__action ${PANEL_CLASS}__action--attach"
                data-ai-attach title="插入（预留）">
                <span class="codicon codicon-add"></span>
            </button>
            <span class="${PANEL_CLASS}__spacer"></span>
            <span class="${PANEL_CLASS}__beta">${betaLabel}</span>
            <button class="${PANEL_CLASS}__send" type="button" data-ai-send title="${sendLabel}">
                <span class="codicon codicon-arrow-up"></span>
            </button>
        </div>
    </div>
    <div class="${PANEL_CLASS}__menu" hidden data-ai-menu-panel></div>
    <div class="${PANEL_CLASS}__submenu" hidden data-ai-submenu-panel></div>`;
};

/**
 * 让 AI 浮动面板可拖拽。仿照 bubbleMenu.ts 的 makePaletteDraggable：
 *  - 拖动时切到 position: fixed，按视口坐标移动
 *  - 触发回调让调用方标记 pinned 状态，阻止后续 selectionchange/scroll 重定位
 */
const makePanelDraggable = (
    panel: HTMLElement,
    handle: HTMLElement,
    onLock: () => void,
    onDragTick?: () => void,
) => {
    let offsetX = 0;
    let offsetY = 0;
    let activePointerId: number | null = null;
    let didMove = false;

    const onPointerMove = (e: PointerEvent) => {
        if (e.pointerId !== activePointerId) return;
        if (!didMove) {
            onLock();
            didMove = true;
        }
        if (panel.style.position !== "fixed") {
            const rect = panel.getBoundingClientRect();
            panel.style.position = "fixed";
            panel.style.left = `${rect.left}px`;
            panel.style.top = `${rect.top}px`;
            panel.style.right = "auto";
            offsetX = e.clientX - rect.left;
            offsetY = e.clientY - rect.top;
        }
        const maxLeft = window.innerWidth - 40;
        const maxTop = window.innerHeight - 30;
        const newLeft = Math.max(
            -panel.offsetWidth / 2,
            Math.min(e.clientX - offsetX, maxLeft),
        );
        const newTop = Math.max(
            0,
            Math.min(e.clientY - offsetY, maxTop),
        );
        panel.style.left = `${newLeft}px`;
        panel.style.top = `${newTop}px`;
        onDragTick?.();
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
        if ((e.target as HTMLElement).closest("button, input, textarea")) {
            return;
        }
        e.preventDefault();
        activePointerId = e.pointerId;
        try {
            handle.setPointerCapture(e.pointerId);
        } catch {
            // 旧浏览器兜底
        }
        onLock();
        const rect = panel.getBoundingClientRect();
        offsetX = e.clientX - rect.left;
        offsetY = e.clientY - rect.top;
        handle.addEventListener("pointermove", onPointerMove);
        handle.addEventListener("pointerup", endDrag);
        handle.addEventListener("pointercancel", endDrag);
    });
};

export class AIInputPanel {
    private vditor: IVditor;
    private overlay: HTMLElement;
    private card: HTMLElement;
    private textarea: HTMLTextAreaElement;
    private menuBtn: HTMLElement;
    private attachBtn: HTMLElement;
    private sendBtn: HTMLElement;
    private dragHandle: HTMLElement;
    private closeBtn: HTMLElement;
    private menuEl: HTMLElement;
    private submenuEl: HTMLElement;
    private polishItem: HTMLElement | null = null;
    private currentTarget: HTMLElement | Range | null = null;
    private _isOpen = false;
    private menuOpen = false;
    private submenuOpen = false;
    /** 用户拖动过面板 → 锁定到当前位置，不再跟随 selectionchange/scroll 重定位 */
    private pinned = false;

    constructor(vditor: IVditor) {
        this.vditor = vditor;
        this.overlay = document.createElement("div");
        this.overlay.className = PANEL_CLASS;
        this.overlay.hidden = true;
        const i = (window.VditorI18n as Record<string, string>) || {};
        this.overlay.innerHTML = buildHTML(i);

        vditor.element.appendChild(this.overlay);

        this.card = this.overlay.querySelector<HTMLElement>(`.${PANEL_CLASS}__card`)!;
        this.textarea = this.overlay.querySelector<HTMLTextAreaElement>(`.${PANEL_CLASS}__textarea`)!;
        this.menuBtn = this.overlay.querySelector<HTMLElement>(`[data-ai-menu]`)!;
        this.attachBtn = this.overlay.querySelector<HTMLElement>(`[data-ai-attach]`)!;
        this.sendBtn = this.overlay.querySelector<HTMLElement>(`[data-ai-send]`)!;
        this.dragHandle = this.overlay.querySelector<HTMLElement>(`[data-ai-drag]`)!;
        this.closeBtn = this.overlay.querySelector<HTMLElement>(`[data-ai-close]`)!;
        this.menuEl = this.overlay.querySelector<HTMLElement>(`[data-ai-menu-panel]`)!;
        this.submenuEl = this.overlay.querySelector<HTMLElement>(`[data-ai-submenu-panel]`)!;

        this.renderMenu();
        this.renderSubmenu();
        this.bindEvents();
    }

    public isOpen(): boolean {
        return this._isOpen;
    }

    /** target: HTMLElement（如 block）或 Range（如选区） */
    public open(target: HTMLElement | Range) {
        this.currentTarget = target;
        this.overlay.hidden = false;
        this._isOpen = true;
        this.pinned = false;  // 每次重新打开都允许重定位
        this.overlay.classList.remove(`${PANEL_CLASS}--pinned`);
        this.position(target);
        this.closeMenu();
        requestAnimationFrame(() => this.textarea.focus());
    }

    public close() {
        this.overlay.hidden = true;
        this._isOpen = false;
        this.currentTarget = null;
        this.closeMenu();
    }

    public destroy() {
        this.overlay.remove();
    }

    /** 外部 API 修改 presets 后调此刷新菜单 */
    public refreshPresets() {
        this.renderMenu();
        this.renderSubmenu();
    }

    // ─────────────────────────────────────────────────────────────────────
    // 内部方法
    // ─────────────────────────────────────────────────────────────────────

    private position(target: HTMLElement | Range) {
        if (this.pinned) return;
        const rect = this.getTargetRect(target);
        if (!rect) return;
        const cardRect = this.card.getBoundingClientRect();
        let left = rect.left + (rect.width - cardRect.width) / 2;
        let top = rect.bottom + 8;
        if (top + cardRect.height > window.innerHeight - 8) {
            top = rect.top - cardRect.height - 8;
        }
        left = Math.max(8, Math.min(left, window.innerWidth - cardRect.width - 8));
        top = Math.max(8, Math.min(top, window.innerHeight - cardRect.height - 8));
        this.overlay.style.left = `${left + window.scrollX}px`;
        this.overlay.style.top = `${top + window.scrollY}px`;
    }

    private positionMenu() {
        // menuEl 是 position: fixed，用 viewport 坐标直接定位（不再 +scrollX/Y）
        const cardRect = this.card.getBoundingClientRect();
        const menuRect = this.menuEl.getBoundingClientRect();
        let left = cardRect.left;
        let top = cardRect.bottom + 4;
        // 下方溢出 → 翻到 card 上方
        if (top + menuRect.height > window.innerHeight - 8) {
            top = cardRect.top - menuRect.height - 4;
        }
        // 右侧溢出 → 左移
        if (left + menuRect.width > window.innerWidth - 8) {
            left = window.innerWidth - menuRect.width - 8;
        }
        left = Math.max(8, left);
        top = Math.max(8, top);
        this.menuEl.style.left = `${left}px`;
        this.menuEl.style.top = `${top}px`;
    }

    private positionSubmenu() {
        if (!this.polishItem) return;
        const itemRect = this.polishItem.getBoundingClientRect();
        const subRect = this.submenuEl.getBoundingClientRect();
        let left = itemRect.right + 4;
        let top = itemRect.top;
        if (left + subRect.width > window.innerWidth - 8) {
            left = itemRect.left - subRect.width - 4;
        }
        if (top + subRect.height > window.innerHeight - 8) {
            top = window.innerHeight - subRect.height - 8;
        }
        top = Math.max(8, top);
        left = Math.max(8, left);
        this.submenuEl.style.left = `${left}px`;
        this.submenuEl.style.top = `${top}px`;
    }

    private getTargetRect(target: HTMLElement | Range): DOMRect | null {
        try {
            return target.getBoundingClientRect();
        } catch {
            return null;
        }
    }

    private renderMenu() {
        const presets = getAIPresets();
        const i = (window.VditorI18n as Record<string, string>) || {};
        const writing = presets.filter((p) => p.category === "writing");
        const aiEdit = presets.filter((p) => p.category !== "writing");
        let html = "";
        for (const p of writing) {
            html += this.menuItemHTML(p, displayPresetLabel(p, i), false);
        }
        if (writing.length > 0 && aiEdit.length > 0) {
            html += `<div class="${PANEL_CLASS}__menu-divider"></div>`;
        }
        if (aiEdit.length > 0) {
            const groupLabel = i.aiCategoryRewrite ?? "AI 帮我改";
            html += `<div class="${PANEL_CLASS}__menu-group">${groupLabel}</div>`;
        }
        for (const p of aiEdit) {
            const hasSub = p.key === "polish";
            html += this.menuItemHTML(p, displayPresetLabel(p, i), hasSub);
        }
        this.menuEl.innerHTML = html;
        this.polishItem = this.menuEl.querySelector<HTMLElement>(`[data-preset="polish"]`);
    }

    private menuItemHTML(p: AIPreset, label: string, hasSub: boolean): string {
        const icon = PRESET_ICONS[p.key] ?? "circle";
        const chevron = hasSub
            ? `<span class="codicon codicon-chevron-right ${PANEL_CLASS}__menu-chevron"></span>`
            : "";
        return `<button type="button" class="${PANEL_CLASS}__menu-item" data-preset="${p.key}">
            <span class="codicon codicon-${icon} ${PANEL_CLASS}__menu-icon"></span>
            <span class="${PANEL_CLASS}__menu-label">${label}</span>
            ${chevron}
        </button>`;
    }

    private renderSubmenu() {
        const i = (window.VditorI18n as Record<string, string>) || {};
        this.submenuEl.innerHTML = SUBMENU_ITEMS.map((it) => {
            const label = i[it.labelKey] ?? it.key;
            return `<button type="button" class="${PANEL_CLASS}__submenu-item" data-submenu="${it.key}">
                <span class="codicon codicon-${it.icon} ${PANEL_CLASS}__menu-icon"></span>
                <span class="${PANEL_CLASS}__menu-label">${label}</span>
            </button>`;
        }).join("");
    }

    private handlePresetClick(preset: AIPreset) {
        const userText = this.textarea.value.trim();
        const selections = getAISelections();
        const options: IAIPolishOptions = {
            // goal = 预设的固定目标，userInput 单独传用户输入
            goal: preset.goal,
            engine: selections.engine,
            outputLanguage: selections.outputLanguage,
            uiLanguage: this.vditor.options.lang,
            userInput: userText || undefined,
        };
        const publicVd = (window as Window & {
            vditor?: {
                triggerAIPolish(
                    opts: IAIPolishOptions,
                    md: string,
                    isSel: boolean,
                    target?: HTMLElement | Range,
                ): void;
            };
        }).vditor;
        // 传入 currentTarget：block 走 in-place 替换，Range 走选区替换
        publicVd?.triggerAIPolish?.(
            options,
            this.captureMarkdown(),
            false,
            this.currentTarget ?? undefined,
        );
    }

    private handleSubmenuClick(item: ISubmenuItem) {
        const userText = this.textarea.value.trim();
        const selections = getAISelections();
        const options: IAIPolishOptions = {
            // goal = 预设的固定目标，userInput 单独传用户输入
            goal: item.goal,
            engine: selections.engine,
            outputLanguage: selections.outputLanguage,
            uiLanguage: this.vditor.options.lang,
            userInput: userText || undefined,
        };
        const publicVd = (window as Window & {
            vditor?: {
                triggerAIPolish(
                    opts: IAIPolishOptions,
                    md: string,
                    isSel: boolean,
                    target?: HTMLElement | Range,
                ): void;
            };
        }).vditor;
        publicVd?.triggerAIPolish?.(
            options,
            this.captureMarkdown(),
            false,
            this.currentTarget ?? undefined,
        );
    }

    private handleSend() {
        const polish = DEFAULT_AI_PRESETS.find((p) => p.key === "polish");
        if (polish) this.handlePresetClick(polish);
    }

    private captureMarkdown(): string {
        // 1) 块菜单入口：target 是 HTMLElement（block）→ 提取该块的 markdown
        if (this.currentTarget instanceof HTMLElement) {
            return blockToMarkdown(this.vditor, this.currentTarget);
        }
        // 2) 气泡菜单 / API Range 入口：取选区结构化 markdown
        const publicVd = (window as Window & {
            vditor?: { getSelectionMarkdown(): string; getValue(): string };
        }).vditor;
        return publicVd?.getSelectionMarkdown() || publicVd?.getValue() || "";
    }

    private openMenu() {
        if (this.menuOpen) return;
        this.menuOpen = true;
        this.menuEl.hidden = false;
        this.positionMenu();
    }

    private closeMenu() {
        if (!this.menuOpen) return;
        this.menuOpen = false;
        this.menuEl.hidden = true;
        this.closeSubmenu();
    }

    private toggleMenu() {
        if (this.menuOpen) this.closeMenu();
        else this.openMenu();
    }

    private openSubmenu() {
        if (this.submenuOpen) return;
        this.submenuOpen = true;
        this.submenuEl.hidden = false;
        this.positionSubmenu();
    }

    private closeSubmenu() {
        if (!this.submenuOpen) return;
        this.submenuOpen = false;
        this.submenuEl.hidden = true;
    }

    private bindEvents() {
        // 关闭按钮（顶部 ×）
        this.closeBtn.addEventListener(getEventName(), (e) => {
            e.stopPropagation();
            this.close();
        });

        // 拖拽抓手
        makePanelDraggable(
            this.overlay,
            this.dragHandle,
            // onLock：首次锁定，仅触发一次
            () => {
                this.pinned = true;
                this.overlay.classList.add(`${PANEL_CLASS}--pinned`);
            },
            // onDragTick：每帧 panel 位置变化后调用，菜单锚点失效需重定位
            () => {
                if (this.menuOpen) this.positionMenu();
                if (this.submenuOpen) this.positionSubmenu();
            },
        );

        // sparkle 按钮：打开/关闭菜单
        this.menuBtn.addEventListener(getEventName(), (e) => {
            e.stopPropagation();
            this.toggleMenu();
        });

        // + 按钮：预留，目前无操作（仅 UI 占位）
        this.attachBtn.addEventListener(getEventName(), (e) => {
            e.stopPropagation();
            // 预留：插入代码块 / 附件
        });

        // 发送按钮
        this.sendBtn.addEventListener(getEventName(), (e) => {
            e.stopPropagation();
            this.handleSend();
        });

        // textarea 内 Enter 直接发送；Esc 关闭
        this.textarea.addEventListener("keydown", (e) => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                this.handleSend();
            } else if (e.key === "Escape") {
                e.preventDefault();
                this.close();
            }
        });

        // 输入任意内容自动进入固定模式
        this.textarea.addEventListener("input", () => {
            if (!this.pinned) {
                this.pinned = true;
                this.overlay.classList.add(`${PANEL_CLASS}--pinned`);
            }
        });

        // 菜单项点击
        this.menuEl.addEventListener(getEventName(), (e) => {
            const target = e.target as HTMLElement;
            const item = target.closest<HTMLElement>(`[data-preset]`);
            if (!item?.dataset.preset) return;
            e.stopPropagation();
            if (item.dataset.preset === "polish") {
                // 润色 → 打开 submenu（不关闭主菜单）
                this.openSubmenu();
                return;
            }
            const preset = this.findPresetByKey(item.dataset.preset);
            this.closeMenu();
            if (preset) this.handlePresetClick(preset);
        });

        // hover 润色项 → 打开 submenu
        if (this.polishItem) {
            this.polishItem.addEventListener("mouseenter", () => this.openSubmenu());
        }

        // 鼠标离开 submenu → 关闭
        this.submenuEl.addEventListener("mouseleave", () => {
            // 延迟关闭：给用户时间移到 submenu 上
            // 简化处理：mouseleave 立即关，hover 子项 / 移回润色项会再开
            this.closeSubmenu();
        });

        // hover submenu 子项 → 保持打开
        this.submenuEl.addEventListener("mouseenter", () => {
            if (!this.submenuOpen) this.openSubmenu();
        });

        // submenu 子项点击
        this.submenuEl.addEventListener(getEventName(), (e) => {
            const target = e.target as HTMLElement;
            const item = target.closest<HTMLElement>(`[data-submenu]`);
            if (!item?.dataset.submenu) return;
            e.stopPropagation();
            const sub = SUBMENU_ITEMS.find((it) => it.key === item.dataset.submenu);
            this.closeMenu();
            if (sub) this.handleSubmenuClick(sub);
        });

        // 外部点击关闭
        document.addEventListener("mousedown", (e) => {
            if (!this._isOpen) return;
            if (this.pinned) return;
            const target = e.target as Node;
            if (this.overlay.contains(target)) return;
            this.close();
        });

        // 选区变化时重定位
        document.addEventListener("selectionchange", () => {
            if (!this._isOpen) return;
            if (this.currentTarget && this.currentTarget instanceof Range) {
                this.position(this.currentTarget);
            }
        });

        // 滚动/resize 时重定位
        window.addEventListener("scroll", () => {
            if (!this._isOpen) return;
            if (this.currentTarget) this.position(this.currentTarget);
            if (this.menuOpen) this.positionMenu();
            if (this.submenuOpen) this.positionSubmenu();
        }, true);

        window.addEventListener("resize", () => {
            if (!this._isOpen) return;
            if (this.currentTarget) this.position(this.currentTarget);
            if (this.menuOpen) this.positionMenu();
            if (this.submenuOpen) this.positionSubmenu();
        });

        // Esc 关闭
        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape" && this._isOpen) {
                this.close();
            }
        });
    }

    private findPresetByKey(key: string): AIPreset | undefined {
        return getAIPresets().find((p: AIPreset) => p.key === key);
    }
}
