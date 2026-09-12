import { accessLocalStorage } from "./compatibility";
import { AIOutputLanguage } from "../ai/aiOutputLanguage";
import { DEFAULT_AI_PRESETS } from "../ai/aiPresets";
import type { AIPreset } from "../ai/aiPresets";

// 重新导出 AIPreset，让 index.ts 等可以从一处导入所有 AI 公共类型
export { AIPreset };

const GLOBAL_SETTINGS_STORAGE_KEY = "vditor-global-settings";

type GlobalLocalStorageSettings = {
    outlineEnable?: boolean;
    outlineWidth?: number;
    [key: string]: boolean | number | string | undefined;
};

const readGlobalSettings = (): GlobalLocalStorageSettings => {
    if (!accessLocalStorage()) {
        return {};
    }
    try {
        const raw = localStorage.getItem(GLOBAL_SETTINGS_STORAGE_KEY);
        if (!raw) {
            return {};
        }
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
        return {};
    }
};

const writeGlobalSettings = (settings: GlobalLocalStorageSettings) => {
    if (!accessLocalStorage()) {
        return;
    }
    try {
        localStorage.setItem(GLOBAL_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch {
        // ignore
    }
};

export const getGlobalLocalStorageSetting = <T extends GlobalLocalStorageSettings[keyof GlobalLocalStorageSettings]>(
    key: string,
    fallback?: T,
): T | undefined => {
    const settings = readGlobalSettings();
    const value = settings[key];
    return value === undefined ? fallback : value as T;
};

export const UI_FONT_SIZE_KEY = "uiFontSize";
export const EDITOR_FONT_SIZE_KEY = "editorFontSize";
export const UI_FONT_SIZE_DEFAULT = 13;
export const EDITOR_FONT_SIZE_DEFAULT = 13;
export const FONT_SIZE_MIN = 10;
export const FONT_SIZE_MAX = 24;

export const LINE_HEIGHT_KEY = "editorLineHeight";
export const FONT_FAMILY_KEY = "editorFontFamily";
export const CODE_FONT_FAMILY_KEY = "codeFontFamily";
export const BOLD_COLOR_KEY = "boldColor";
export const HTML_EDITOR_LINE_WRAP_KEY = "htmlEditorLineWrap";
export const TYPEWRITER_MODE_KEY = "typewriterMode";
export const LAST_NON_AUTO_EDITOR_THEME_KEY = "lastNonAutoEditorTheme";
export const LAST_LIGHT_EDITOR_THEME_KEY = "lastLightEditorTheme";
export const LAST_DARK_EDITOR_THEME_KEY = "lastDarkEditorTheme";

export const LINE_HEIGHT_MIN = 1.0;
export const LINE_HEIGHT_MAX = 3.0;
export const LINE_HEIGHT_DEFAULT = 1.7;

export const FONT_FAMILY_OPTIONS = [
    { label: "Default", value: "inherit" },
    { label: "Humanist", value: "Optima, Candara, 'Gill Sans', sans-serif" },
    { label: "Serif", value: "Georgia, 'Times New Roman', serif" },
    { label: "Old Style", value: "Palatino, 'Palatino Linotype', 'Book Antiqua', serif" },
    { label: "Garamond", value: "Garamond, 'EB Garamond', 'Cormorant Garamond', serif" },
    { label: "Charter", value: "Charter, 'Bitstream Charter', 'Sitka Text', serif" },
    { label: "Slab Serif", value: "Rockwell, Georgia, serif" },
    { label: "Narrow", value: "'Arial Narrow', 'Liberation Sans Narrow', sans-serif" },
    { label: "Mono", value: "Menlo, Monaco, Consolas, 'Liberation Mono', monospace" },
    { label: "JetBrains Mono", value: "'JetBrains Mono', 'Cascadia Code', 'Fira Code', Consolas, monospace" },
    { label: "Courier", value: "'Courier New', Courier, monospace" },
] as const;

export const BOLD_COLOR_DEFAULT = "color-mix(in srgb, var(--front-color, #b9b9b9) 80%, var(--chart-yellow, #9a6700) 20%)";
export const BOLD_COLOR_DEFAULT_OPTION = "default";
export const BOLD_COLOR_PLAIN = "plain";

const BOLD_COLOR_ACCENT_OPTIONS = [
    { i18nKey: "boldColorAccent", value: "var(--link-color, #0550ae)" },
    { i18nKey: "boldColorRed", value: "var(--error-color, #cf222e)" },
    { i18nKey: "boldColorOrange", value: "#bc4c00" },
    { i18nKey: "boldColorPurple", value: "#8250df" },
    { i18nKey: "boldColorTeal", value: "#1a7f64" },
] as const;

export const normalizeBoldColorValue = (value: string | undefined): string => {
    if (!value || value === "inherit") {
        return BOLD_COLOR_DEFAULT_OPTION;
    }
    return value;
};

export const getBoldColorOptions = (): { label: string; value: string }[] => {
    const i18n = window.VditorI18n;
    return [
        { label: i18n.boldColorDefault ?? "Default", value: BOLD_COLOR_DEFAULT_OPTION },
        { label: i18n.boldColorPlain ?? "Plain", value: BOLD_COLOR_PLAIN },
        ...BOLD_COLOR_ACCENT_OPTIONS.map((option) => ({
            label: i18n[option.i18nKey] ?? option.i18nKey,
            value: option.value,
        })),
    ];
};

export const applyBoldColorSetting = (vditorElement: HTMLElement, value: string | undefined) => {
    const normalized = normalizeBoldColorValue(value);
    if (normalized === BOLD_COLOR_DEFAULT_OPTION) {
        vditorElement.style.removeProperty("--bold-color");
        return;
    }
    if (normalized === BOLD_COLOR_PLAIN) {
        vditorElement.style.setProperty("--bold-color", "var(--textarea-text-color, inherit)");
        return;
    }
    vditorElement.style.setProperty("--bold-color", normalized);
};

export const PAGE_WIDTH_KEY = "pageWidth";
export const PAGE_WIDTH_DEFAULT = "100%";

export const PAGE_WIDTH_OPTIONS = [
    { label: "100%", value: "100%" },
    { label: "A4 (210mm)", value: "210mm" },
    { label: "A5 (148mm)", value: "148mm" },
    { label: "B5 (176mm)", value: "176mm" },
    { label: "Letter (8.5in)", value: "8.5in" },
    { label: "768px", value: "768px" },
    { label: "960px", value: "960px" },
] as const;

export const CODE_BLOCK_MAX_HEIGHT_KEY = "codeBlockMaxHeight";
export const CODE_BLOCK_MAX_HEIGHT_DEFAULT = "none";

export const CODE_BLOCK_MAX_HEIGHT_OPTIONS = [
    { label: "300px", value: "300px" },
    { label: "Default", value: "none" },
    { label: "400px", value: "400px" },
    { label: "600px", value: "600px" },
    { label: "800px", value: "800px" },
] as const;

export const IMAGE_MAX_WIDTH_KEY = "imageMaxWidth";
export const IMAGE_MAX_HEIGHT_KEY = "imageMaxHeight";
export const IMAGE_MAX_WIDTH_DEFAULT = 100;
export const IMAGE_MAX_HEIGHT_DEFAULT = 70;
export const IMAGE_MAX_WIDTH_MIN = 10;
export const IMAGE_MAX_WIDTH_MAX = 100;
export const IMAGE_MAX_HEIGHT_MIN = 10;
export const IMAGE_MAX_HEIGHT_MAX = 100;

export const AI_PROMPTS_KEY = "aiPrompts";
export const AI_MODELS_KEY = "aiModels";
export const AI_ENGINE_KEY = "aiEngine";
export const AI_CUSTOM_URL_KEY = "aiCustomUrl";
export const AI_CUSTOM_KEY_KEY = "aiCustomKey";
export const AI_CUSTOM_MODEL_KEY = "aiCustomModel";
export const AI_CUSTOM_FORMAT_KEY = "aiCustomApiFormat";
export const AI_SELECTED_MODEL_KEY = "aiSelectedModel";
export const AI_SELECTED_PROMPT_KEY = "aiSelectedPrompt";
export const AI_OUTPUT_LANGUAGE_KEY = "aiOutputLanguage";

const AI_PREFERENCE_KEYS = [
    AI_ENGINE_KEY,
    AI_SELECTED_MODEL_KEY,
    AI_SELECTED_PROMPT_KEY,
    AI_OUTPUT_LANGUAGE_KEY,
] as const;

export type ViewerSettingsExport = {
    globalSettings: GlobalLocalStorageSettings;
    aiPreferences: Partial<Record<typeof AI_PREFERENCE_KEYS[number], string>>;
};

let settingsSyncEnabled = false;
let suppressSettingsNotify = false;
let onViewerSettingsChange: ((settings: ViewerSettingsExport) => void) | undefined;

export const enableViewerSettingsSync = (enabled: boolean) => {
    settingsSyncEnabled = enabled;
};

export const isViewerSettingsSyncEnabled = () => settingsSyncEnabled;

export const setOnViewerSettingsChange = (
    callback: ((settings: ViewerSettingsExport) => void) | undefined,
) => {
    onViewerSettingsChange = callback;
};

const readAiPreferences = (): ViewerSettingsExport["aiPreferences"] => {
    if (!accessLocalStorage()) {
        return {};
    }
    const prefs: ViewerSettingsExport["aiPreferences"] = {};
    for (const key of AI_PREFERENCE_KEYS) {
        const value = localStorage.getItem(key);
        if (value) {
            prefs[key] = value;
        }
    }
    return prefs;
};

const writeAiPreferences = (prefs: ViewerSettingsExport["aiPreferences"] | undefined) => {
    if (!accessLocalStorage() || !prefs) {
        return;
    }
    for (const key of AI_PREFERENCE_KEYS) {
        const value = prefs[key];
        if (value) {
            localStorage.setItem(key, value);
        } else {
            localStorage.removeItem(key);
        }
    }
};

export const exportViewerSettings = (): ViewerSettingsExport => ({
    globalSettings: readGlobalSettings(),
    aiPreferences: readAiPreferences(),
});

const notifyViewerSettingsChange = () => {
    if (suppressSettingsNotify || !settingsSyncEnabled || !onViewerSettingsChange) {
        return;
    }
    onViewerSettingsChange(exportViewerSettings());
};

export const setAiPreference = (key: string, value: string | undefined) => {
    if (!accessLocalStorage()) {
        return;
    }
    if (value) {
        localStorage.setItem(key, value);
    } else {
        localStorage.removeItem(key);
    }
    notifyViewerSettingsChange();
};

const normalizeGlobalSettingsForStorage = (
    globalSettings: GlobalLocalStorageSettings | Record<string, unknown> | undefined,
): GlobalLocalStorageSettings => {
    const normalized: GlobalLocalStorageSettings = { ...(globalSettings ?? {}) };
    for (const key of [AI_PROMPTS_KEY, AI_MODELS_KEY]) {
        const value = normalized[key];
        if (value !== undefined && typeof value !== "string") {
            normalized[key] = JSON.stringify(value);
        }
    }
    return normalized;
};

export const importViewerSettings = (data: ViewerSettingsExport | null | undefined) => {
    if (!data || typeof data !== "object") {
        return;
    }
    suppressSettingsNotify = true;
    try {
        writeGlobalSettings(normalizeGlobalSettingsForStorage(data.globalSettings));
        writeAiPreferences(data.aiPreferences);
    } finally {
        suppressSettingsNotify = false;
    }
};

export interface AIPrompt {
    id: string;
    name: string;
    content: string;
}

const DEFAULT_AI_PROMPTS: AIPrompt[] = [
    {
        id: "default-1",
        name: "Polish Writing",
        content: "Polish the writing to make it clearer, more concise, and more engaging. Improve sentence structure, word choice, and flow while preserving the original meaning and tone.",
    },
    {
        id: "default-2",
        name: "Fix Grammar",
        content: "Fix any grammar, spelling, and punctuation errors. Ensure the text is grammatically correct and reads naturally.",
    },
    {
        id: "default-3",
        name: "Expand Content",
        content: "Expand this content with more detail, examples, and explanation. Make it more comprehensive while keeping it well-structured and easy to read.",
    },
];

export const getAIPrompts = (): AIPrompt[] => {
    const raw = getGlobalLocalStorageSetting<string>(AI_PROMPTS_KEY, "");
    if (!raw) return DEFAULT_AI_PROMPTS;
    try {
        const parsed = JSON.parse(raw as string) as AIPrompt[];
        return parsed.length ? parsed : DEFAULT_AI_PROMPTS;
    } catch { return DEFAULT_AI_PROMPTS; }
};

export const setAIPrompts = (prompts: AIPrompt[]) => {
    setGlobalLocalStorageSetting(AI_PROMPTS_KEY, JSON.stringify(prompts));
};

export interface AIModel {
    id: string;
    name: string;
    url: string;
    key: string;
    model: string;
    format: string;
}

export const getAIModels = (): AIModel[] => {
    const raw = getGlobalLocalStorageSetting<string>(AI_MODELS_KEY, "[]");
    try { return JSON.parse(raw as string) as AIModel[]; } catch { return []; }
};

export const setAIModels = (models: AIModel[]) => {
    setGlobalLocalStorageSetting(AI_MODELS_KEY, JSON.stringify(models));
};

// ─────────────────────────────────────────────────────────────────────────────
// Presets (快捷操作)
// ─────────────────────────────────────────────────────────────────────────────

export const AI_PRESETS_KEY = "aiPresets";

export const getAIPresets = (): AIPreset[] => {
    const raw = getGlobalLocalStorageSetting<string>(AI_PRESETS_KEY, "");
    if (!raw) return DEFAULT_AI_PRESETS;
    try {
        const parsed = JSON.parse(raw as string) as AIPreset[];
        return parsed.length ? parsed : DEFAULT_AI_PRESETS;
    } catch {
        return DEFAULT_AI_PRESETS;
    }
};

export const setAIPresets = (presets: AIPreset[]) => {
    for (const p of presets) {
        if (!p || typeof p.key !== "string" || !p.key
            || typeof p.label !== "string"
            || typeof p.goal !== "string" || !p.goal) {
            throw new Error("setAIPresets: each preset must have non-empty key, label, goal");
        }
    }
    setGlobalLocalStorageSetting(AI_PRESETS_KEY, JSON.stringify(presets));
};

/** 清空用户自定义预设，让下次 getAIPresets() 回退到内置默认 */
export const resetAIPresets = () => {
    setGlobalLocalStorageSetting(AI_PRESETS_KEY, undefined);
};

// ─────────────────────────────────────────────────────────────────────────────
// Selections (当前选中项)
// ─────────────────────────────────────────────────────────────────────────────

export type AIEngine = "vscode" | "custom";

export interface IAISelections {
    engine: AIEngine;
    /** AIPrompt.id；空串表示未选 */
    selectedPrompt: string;
    /** AIModel.id；空串表示未选 */
    selectedModel: string;
    outputLanguage: AIOutputLanguage;
}

const AI_SELECTION_DEFAULT: IAISelections = {
    engine: "vscode",
    selectedPrompt: "",
    selectedModel: "",
    outputLanguage: "auto",
};

const readAiPreferenceString = (key: string, fallback: string): string => {
    if (!accessLocalStorage()) return fallback;
    return localStorage.getItem(key) ?? fallback;
};

export const getAIEngine = (): AIEngine => {
    const v = readAiPreferenceString(AI_ENGINE_KEY, AI_SELECTION_DEFAULT.engine);
    return v === "custom" ? "custom" : "vscode";
};

export const setAIEngine = (engine: AIEngine) => {
    setAiPreference(AI_ENGINE_KEY, engine);
};

export const getAISelectedPrompt = (): string => {
    return readAiPreferenceString(AI_SELECTED_PROMPT_KEY, AI_SELECTION_DEFAULT.selectedPrompt);
};

export const setAISelectedPrompt = (id: string) => {
    setAiPreference(AI_SELECTED_PROMPT_KEY, id);
};

export const getAISelectedModel = (): string => {
    return readAiPreferenceString(AI_SELECTED_MODEL_KEY, AI_SELECTION_DEFAULT.selectedModel);
};

export const setAISelectedModel = (id: string) => {
    setAiPreference(AI_SELECTED_MODEL_KEY, id);
};

export const getAIOutputLanguage = (): AIOutputLanguage => {
    const v = readAiPreferenceString(AI_OUTPUT_LANGUAGE_KEY, AI_SELECTION_DEFAULT.outputLanguage);
    // 仅接受已知值；其他回退到 "auto"
    const known: AIOutputLanguage[] = ["auto", "en_US", "zh_CN", "zh_TW", "ja_JP", "ko_KR", "ru_RU"];
    return (known as string[]).includes(v) ? (v as AIOutputLanguage) : "auto";
};

export const setAIOutputLanguage = (lang: AIOutputLanguage) => {
    setAiPreference(AI_OUTPUT_LANGUAGE_KEY, lang);
};

export const getAISelections = (): IAISelections => ({
    engine: getAIEngine(),
    selectedPrompt: getAISelectedPrompt(),
    selectedModel: getAISelectedModel(),
    outputLanguage: getAIOutputLanguage(),
});

/**
 * 批量更新选中项的子集。未提供的字段保持不变。
 * 为避免对未变字段误触，本函数逐字段比较，仅对真实发生变化的字段写入。
 *
 * 注意：用 suppressSettingsNotify 包整段，try-finally 末尾统一调用一次
 * notifyViewerSettingsChange()——保证外部 setAISelections({...4 fields}) 只触发
 * 一次 onSettingsChange 通知（与 setAISettings 语义一致）。
 */
export const setAISelections = (partial: Partial<IAISelections>) => {
    suppressSettingsNotify = true;
    try {
        if (partial.engine !== undefined && partial.engine !== getAIEngine()) {
            setAIEngine(partial.engine);
        }
        if (partial.selectedPrompt !== undefined && partial.selectedPrompt !== getAISelectedPrompt()) {
            setAISelectedPrompt(partial.selectedPrompt);
        }
        if (partial.selectedModel !== undefined && partial.selectedModel !== getAISelectedModel()) {
            setAISelectedModel(partial.selectedModel);
        }
        if (partial.outputLanguage !== undefined && partial.outputLanguage !== getAIOutputLanguage()) {
            setAIOutputLanguage(partial.outputLanguage);
        }
    } finally {
        suppressSettingsNotify = false;
    }
    notifyViewerSettingsChange();
};

// ─────────────────────────────────────────────────────────────────────────────
// 批量 AI 配置
// ─────────────────────────────────────────────────────────────────────────────

export interface IAISettings {
    prompts: AIPrompt[];
    models: AIModel[];
    presets: AIPreset[];
    selections: IAISelections;
}

export interface IAISettingsPatch {
    prompts?: AIPrompt[];
    models?: AIModel[];
    presets?: AIPreset[];
    selections?: Partial<IAISelections>;
}

export const getAISettings = (): IAISettings => ({
    prompts: getAIPrompts(),
    models: getAIModels(),
    presets: getAIPresets(),
    selections: getAISelections(),
});

/**
 * 一次性应用 IAISettingsPatch。每个字段可选；未提供的字段保持不变。
 * 选择使用 suppressSettingsNotify 抑制逐字段通知，仅在末尾统一触发一次
 * onSettingsChange 回调——这样外部宿主一次 setAISettings 只会收到一次通知。
 */
export const setAISettings = (patch: IAISettingsPatch) => {
    suppressSettingsNotify = true;
    try {
        if (patch.prompts !== undefined) setAIPrompts(patch.prompts);
        if (patch.models !== undefined) setAIModels(patch.models);
        if (patch.presets !== undefined) setAIPresets(patch.presets);
        if (patch.selections !== undefined) setAISelections(patch.selections);
    } finally {
        suppressSettingsNotify = false;
    }
    notifyViewerSettingsChange();
};

export const applyPageWidthSetting = (vditorElement: HTMLElement, pageWidth?: string) => {
    if (pageWidth !== undefined && pageWidth !== PAGE_WIDTH_DEFAULT) {
        vditorElement.style.setProperty("--vditor-page-width", pageWidth);
        vditorElement.setAttribute("data-page-width-mode", "fixed");
        return;
    }
    vditorElement.style.removeProperty("--vditor-page-width");
    vditorElement.setAttribute("data-page-width-mode", "fluid");
};

export const applyEditorSettings = (vditorElement: HTMLElement) => {
    const uiSize = getGlobalLocalStorageSetting<number>(UI_FONT_SIZE_KEY);
    const editorSize = getGlobalLocalStorageSetting<number>(EDITOR_FONT_SIZE_KEY);
    const lineHeight = getGlobalLocalStorageSetting<number>(LINE_HEIGHT_KEY);
    const fontFamily = getGlobalLocalStorageSetting<string>(FONT_FAMILY_KEY);
    const codeFontFamily = getGlobalLocalStorageSetting<string>(CODE_FONT_FAMILY_KEY);
    const boldColor = getGlobalLocalStorageSetting<string>(BOLD_COLOR_KEY);
    const pageWidth = getGlobalLocalStorageSetting<string>(PAGE_WIDTH_KEY);
    const imgMaxWidth = getGlobalLocalStorageSetting<number>(IMAGE_MAX_WIDTH_KEY);
    const imgMaxHeight = getGlobalLocalStorageSetting<number>(IMAGE_MAX_HEIGHT_KEY);
    if (uiSize !== undefined) vditorElement.style.setProperty("--ui-font-size", `${uiSize}px`);
    if (editorSize !== undefined) vditorElement.style.setProperty("--editor-font-size", `${editorSize}px`);
    if (lineHeight !== undefined) vditorElement.style.setProperty("--editor-line-height", String(lineHeight));
    if (fontFamily !== undefined) vditorElement.style.setProperty("--editor-font-family", fontFamily);
    if (codeFontFamily !== undefined && codeFontFamily !== "inherit") {
        vditorElement.style.setProperty("--code-font-family", codeFontFamily);
    } else if (codeFontFamily === "inherit") {
        vditorElement.style.removeProperty("--code-font-family");
    }
    applyBoldColorSetting(vditorElement, boldColor);
    applyPageWidthSetting(vditorElement, pageWidth);
    if (imgMaxWidth !== undefined) vditorElement.style.setProperty("--vditor-image-max-width", `${imgMaxWidth}%`);
    if (imgMaxHeight !== undefined) vditorElement.style.setProperty("--vditor-image-max-height", `${imgMaxHeight}vh`);
    const codeBlockMaxHeight = getGlobalLocalStorageSetting<string>(CODE_BLOCK_MAX_HEIGHT_KEY);
    if (codeBlockMaxHeight !== undefined && codeBlockMaxHeight !== CODE_BLOCK_MAX_HEIGHT_DEFAULT) {
        vditorElement.style.setProperty("--cm-block-max-height", codeBlockMaxHeight);
    } else {
        vditorElement.style.removeProperty("--cm-block-max-height");
    }
    applyTypewriterModeClass(vditorElement);
};

// ===== Public settings API =====

export interface EditorSettings {
    /** UI 字号（px），影响 hint / outline / 工具栏标签等 */
    uiFontSize: number;
    /** 编辑器正文字号（px），仅影响 WYSIWYG / IR 内容区 */
    editorFontSize: number;
    /** 行高（1.0–3.0） */
    lineHeight: number;
    /** 正文字体族，'inherit' 表示继承 */
    fontFamily: string;
    /** 代码块字体族，'inherit' 表示继承 */
    codeFontFamily: string;
    /** 加粗颜色：'default' / 'plain' / CSS color string */
    boldColor: string;
    /** 页面宽度：'100%' / '210mm' / '768px' 等 */
    pageWidth: string;
    /** 代码块最大高度：'none' / '300px' / '400px' / '600px' / '800px' */
    codeBlockMaxHeight: string;
    /** 图片最大宽度（百分比，10–100） */
    imageMaxWidth: number;
    /** 图片最大高度（vh，10–100） */
    imageMaxHeight: number;
    /** 打字机模式 */
    typewriterMode: boolean;
}

export const DEFAULT_EDITOR_SETTINGS: EditorSettings = {
    uiFontSize: UI_FONT_SIZE_DEFAULT,
    editorFontSize: EDITOR_FONT_SIZE_DEFAULT,
    lineHeight: LINE_HEIGHT_DEFAULT,
    fontFamily: "inherit",
    codeFontFamily: "inherit",
    boldColor: BOLD_COLOR_DEFAULT_OPTION,
    pageWidth: PAGE_WIDTH_DEFAULT,
    codeBlockMaxHeight: CODE_BLOCK_MAX_HEIGHT_DEFAULT,
    imageMaxWidth: IMAGE_MAX_WIDTH_DEFAULT,
    imageMaxHeight: IMAGE_MAX_HEIGHT_DEFAULT,
    typewriterMode: false,
};

const EDITOR_SETTING_KEY_MAP: Record<keyof EditorSettings, string> = {
    uiFontSize: UI_FONT_SIZE_KEY,
    editorFontSize: EDITOR_FONT_SIZE_KEY,
    lineHeight: LINE_HEIGHT_KEY,
    fontFamily: FONT_FAMILY_KEY,
    codeFontFamily: CODE_FONT_FAMILY_KEY,
    boldColor: BOLD_COLOR_KEY,
    pageWidth: PAGE_WIDTH_KEY,
    codeBlockMaxHeight: CODE_BLOCK_MAX_HEIGHT_KEY,
    imageMaxWidth: IMAGE_MAX_WIDTH_KEY,
    imageMaxHeight: IMAGE_MAX_HEIGHT_KEY,
    typewriterMode: TYPEWRITER_MODE_KEY,
};

/** 读取当前生效的设置快照（已合并默认值） */
export const getEditorSettings = (): EditorSettings => {
    const result = { ...DEFAULT_EDITOR_SETTINGS };
    for (const key of Object.keys(EDITOR_SETTING_KEY_MAP) as Array<keyof EditorSettings>) {
        const storageKey = EDITOR_SETTING_KEY_MAP[key];
        const stored = getGlobalLocalStorageSetting<EditorSettings[keyof EditorSettings]>(storageKey);
        if (stored !== undefined) {
            (result[key] as EditorSettings[keyof EditorSettings]) = stored;
        }
    }
    return result;
};

/** 把单个 setting 写入 DOM。复用 applyXxx 系列，避免重复实现 CSS 副作用 */
const applyEditorSettingToElement = (vditorElement: HTMLElement, key: keyof EditorSettings, value: EditorSettings[keyof EditorSettings]) => {
    switch (key) {
        case "uiFontSize":
            vditorElement.style.setProperty("--ui-font-size", `${value}px`);
            break;
        case "editorFontSize":
            vditorElement.style.setProperty("--editor-font-size", `${value}px`);
            break;
        case "lineHeight":
            vditorElement.style.setProperty("--editor-line-height", String(value));
            break;
        case "fontFamily":
            vditorElement.style.setProperty("--editor-font-family", String(value));
            break;
        case "codeFontFamily":
            if (value === "inherit") {
                vditorElement.style.removeProperty("--code-font-family");
            } else {
                vditorElement.style.setProperty("--code-font-family", String(value));
            }
            break;
        case "boldColor":
            applyBoldColorSetting(vditorElement, value as string);
            break;
        case "pageWidth":
            applyPageWidthSetting(vditorElement, value as string);
            break;
        case "codeBlockMaxHeight":
            if (value !== CODE_BLOCK_MAX_HEIGHT_DEFAULT) {
                vditorElement.style.setProperty("--cm-block-max-height", String(value));
            } else {
                vditorElement.style.removeProperty("--cm-block-max-height");
            }
            break;
        case "imageMaxWidth":
            vditorElement.style.setProperty("--vditor-image-max-width", `${value}%`);
            break;
        case "imageMaxHeight":
            vditorElement.style.setProperty("--vditor-image-max-height", `${value}vh`);
            break;
        case "typewriterMode":
            applyTypewriterModeClass(vditorElement, value === true);
            break;
    }
};

/** 把部分 setting 写入存储并应用。传 undefined 会清除该 key（恢复默认）。
 *  注意：本函数是程序化 API 调用，**不会**触发 onSettingsChange 回调。
 *  UI 面板的修改（仍走 setGlobalLocalStorageSetting）会正常触发回调。 */
export const setEditorSettings = (vditorElement: HTMLElement, partial: Partial<EditorSettings>) => {
    suppressSettingsNotify = true;
    try {
        for (const key of Object.keys(partial) as Array<keyof EditorSettings>) {
            const value = partial[key];
            const storageKey = EDITOR_SETTING_KEY_MAP[key];
            setGlobalLocalStorageSetting(storageKey, value as GlobalLocalStorageSettings[keyof GlobalLocalStorageSettings]);
            applyEditorSettingToElement(vditorElement, key, value);
        }
    } finally {
        suppressSettingsNotify = false;
    }
};

export const applyTypewriterModeClass = (vditorElement: HTMLElement, enabled?: boolean) => {
    const on = enabled ?? getGlobalLocalStorageSetting<boolean>(TYPEWRITER_MODE_KEY, false) === true;
    vditorElement.classList.toggle("vditor--typewriter", on);
};

/** @deprecated use applyEditorSettings */
export const applyFontSizes = applyEditorSettings;

const PRESERVED_ON_RESET_KEYS = [AI_PROMPTS_KEY, AI_MODELS_KEY] as const;

export const resetGlobalSettings = () => {
    if (!accessLocalStorage()) return;
    const settings = readGlobalSettings();
    const preserved: GlobalLocalStorageSettings = {};
    for (const key of PRESERVED_ON_RESET_KEYS) {
        const value = settings[key];
        if (value !== undefined) {
            preserved[key] = value;
        }
    }
    try {
        if (Object.keys(preserved).length > 0) {
            writeGlobalSettings(preserved);
        } else {
            localStorage.removeItem(GLOBAL_SETTINGS_STORAGE_KEY);
        }
    } catch { /* ignore */ }
    notifyViewerSettingsChange();
};

export const setGlobalLocalStorageSetting = (
    key: string,
    value: GlobalLocalStorageSettings[keyof GlobalLocalStorageSettings],
) => {
    const settings = readGlobalSettings();
    if (value === undefined) {
        delete settings[key];
    } else {
        settings[key] = value;
    }
    writeGlobalSettings(settings);
    notifyViewerSettingsChange();
};
