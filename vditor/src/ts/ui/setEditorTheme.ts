import {refreshMermaidTheme} from "../markdown/mermaidRender";
import {
    DEFAULT_DARK_EDITOR_THEME,
    DEFAULT_LIGHT_EDITOR_THEME,
    EDITOR_DARK_THEMES,
    EDITOR_THEME_IDS,
    resolveEditorTheme,
} from "./editorThemeCatalog";
import {resolveMermaidTheme} from "./setMermaidTheme";
import {updateEditorThemeToggle} from "./editorThemeToggle";
import {initMobileOutlineMenu, prepareEditorThemeMobileOutline} from "./mobileOutlineMenu";
import {
    getGlobalLocalStorageSetting,
    LAST_DARK_EDITOR_THEME_KEY,
    LAST_LIGHT_EDITOR_THEME_KEY,
    LAST_NON_AUTO_EDITOR_THEME_KEY,
    setGlobalLocalStorageSetting,
} from "../util/globalLocalStorageSettings";

const LEGACY_THEME_LINK_ID = "vditor-editor-theme-css";

let vscodeThemeObserverStarted = false;
let systemColorSchemeObserverStarted = false;
// matchMedia 监听只注册一次；回调里读取最新的实例，避免多实例/销毁重建后指向旧 vditor
let systemThemeVditor: IVditor | null = null;

const isVscodeDarkTheme = () => {
    const kind = document.body.getAttribute("data-vscode-theme-kind");
    if (kind === "vscode-dark" || kind === "vscode-high-contrast") {
        return true;
    }
    if (kind === "vscode-light" || kind === "vscode-high-contrast-light") {
        return false;
    }
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
};

const resolveStoredManualTheme = (
    key: string,
    fallback: string,
    legacyFallback: string,
) => {
    const stored = resolveEditorTheme(
        getGlobalLocalStorageSetting<string>(key, fallback) ?? fallback,
    );
    return stored === "Auto" ? legacyFallback : stored;
};

export const syncEditorDarkClass = (element: HTMLElement, theme: string) => {
    const useDark = theme === "Auto" ? isVscodeDarkTheme() : EDITOR_DARK_THEMES.has(theme);
    element.classList.toggle("vditor--dark", useDark);
    if (window.vditorDebug) {
        console.log("[vditor theme] syncEditorDarkClass theme=", theme, "useDark=", useDark,
            "vscode-kind=", document.body.getAttribute("data-vscode-theme-kind"),
            "prefers-dark=", window.matchMedia("(prefers-color-scheme: dark)").matches,
            "vditor--dark=", element.classList.contains("vditor--dark"));
    }
};

export const resolvePreferredManualEditorTheme = (vditor: IVditor, preferDark: boolean) => {
    const fallback = preferDark ? DEFAULT_DARK_EDITOR_THEME : DEFAULT_LIGHT_EDITOR_THEME;
    const candidate = preferDark
        ? resolveEditorTheme(vditor.options.lastDarkEditorTheme || fallback)
        : resolveEditorTheme(vditor.options.lastLightEditorTheme || fallback);
    return candidate === "Auto" ? fallback : candidate;
};

const applyEditorThemeAttribute = (vditor: IVditor, theme: string) => {
    document.documentElement.setAttribute("data-editor-theme", theme);
    vditor.element.setAttribute("data-editor-theme", theme);
    prepareEditorThemeMobileOutline(vditor);
    document.getElementById(LEGACY_THEME_LINK_ID)?.remove();
};

const observeVscodeTheme = (vditor: IVditor) => {
    if (vscodeThemeObserverStarted || typeof MutationObserver === "undefined") {
        return;
    }
    vscodeThemeObserverStarted = true;
    const observer = new MutationObserver(() => {
        if (window.vditorDebug) {
            console.log("[vditor theme] vscode-theme-kind 变化:", document.body.getAttribute("data-vscode-theme-kind"));
        }
        const theme = vditor.element.getAttribute("data-editor-theme");
        if (theme === "Auto") {
            syncEditorDarkClass(vditor.element, "Auto");
            if (resolveMermaidTheme(vditor.options) === "Auto") {
                refreshMermaidTheme(vditor.element, vditor.options.cdn, vditor);
            }
        }
    });
    observer.observe(document.body, {attributes: true, attributeFilter: ["data-vscode-theme-kind"]});
};

/** 浏览器环境：监听系统深浅色偏好变化，Auto 模式下自动跟随（VSCode 环境由
 *  observeVscodeTheme 的 data-vscode-theme-kind 观察覆盖，两者互补）。 */
const observeSystemColorScheme = (vditor: IVditor) => {
    systemThemeVditor = vditor;
    if (systemColorSchemeObserverStarted || typeof window.matchMedia === "undefined") {
        return;
    }
    systemColorSchemeObserverStarted = true;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    if (window.vditorDebug) {
        console.log("[vditor theme] 注册 prefers-color-scheme 监听, 当前 matches=", mediaQuery.matches);
    }
    const applyAutoTheme = () => {
        const current = systemThemeVditor;
        if (!current) {
            if (window.vditorDebug) {
                console.log("[vditor theme] prefers-color-scheme 变化但无 vditor 实例, matches=", mediaQuery.matches);
            }
            return;
        }
        const attr = current.element.getAttribute("data-editor-theme");
        if (window.vditorDebug) {
            console.log("[vditor theme] prefers-color-scheme 变化: matches=", mediaQuery.matches,
                "data-editor-theme=", attr);
        }
        if (attr === "Auto") {
            syncEditorDarkClass(current.element, "Auto");
            if (resolveMermaidTheme(current.options) === "Auto") {
                refreshMermaidTheme(current.element, current.options.cdn, current);
            }
        }
    };
    if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener("change", applyAutoTheme);
    } else {
        mediaQuery.addListener(applyAutoTheme);
    }
};

/** Apply bundled editor theme via data-editor-theme (css bundled in index.css). */
export const setEditorTheme = (
    vditor: IVditor,
    theme: string,
    notify = true,
    telemetryKind: "editor" | "toggle" = "editor",
) => {
    const resolved = resolveEditorTheme(theme);
    if (!EDITOR_THEME_IDS.includes(resolved)) {
        return;
    }
    const previous = resolveEditorTheme(vditor.options.editorTheme);
    if (resolved !== "Auto") {
        vditor.options.lastNonAutoEditorTheme = resolved;
        setGlobalLocalStorageSetting(LAST_NON_AUTO_EDITOR_THEME_KEY, resolved);
        if (EDITOR_DARK_THEMES.has(resolved)) {
            vditor.options.lastDarkEditorTheme = resolved;
            setGlobalLocalStorageSetting(LAST_DARK_EDITOR_THEME_KEY, resolved);
        } else {
            vditor.options.lastLightEditorTheme = resolved;
            setGlobalLocalStorageSetting(LAST_LIGHT_EDITOR_THEME_KEY, resolved);
        }
    }

    applyEditorThemeAttribute(vditor, resolved);
    vditor.options.editorTheme = resolved;
    if (window.vditorDebug) {
        console.log("[vditor theme] setEditorTheme resolved=", resolved,
            "data-editor-theme=", vditor.element.getAttribute("data-editor-theme"),
            "documentElement=", document.documentElement.getAttribute("data-editor-theme"));
    }
    syncEditorDarkClass(vditor.element, resolved);
    updateEditorThemeToggle(resolved);
    observeVscodeTheme(vditor);
    observeSystemColorScheme(vditor);
    if (resolveMermaidTheme(vditor.options) === "Auto") {
        refreshMermaidTheme(vditor.element, vditor.options.cdn, vditor);
    }

    if (notify) {
        if (vditor.options.changeEditorTheme) {
            vditor.options.changeEditorTheme(resolved);
        }
    }
};

export const initEditorTheme = (vditor: IVditor) => {
    const storedLastTheme = resolveEditorTheme(
        getGlobalLocalStorageSetting<string>(LAST_NON_AUTO_EDITOR_THEME_KEY, DEFAULT_LIGHT_EDITOR_THEME) ?? DEFAULT_LIGHT_EDITOR_THEME,
    );
    const normalizedLastTheme = storedLastTheme === "Auto" ? DEFAULT_LIGHT_EDITOR_THEME : storedLastTheme;
    vditor.options.lastNonAutoEditorTheme = normalizedLastTheme;
    vditor.options.lastLightEditorTheme = resolveStoredManualTheme(
        LAST_LIGHT_EDITOR_THEME_KEY,
        DEFAULT_LIGHT_EDITOR_THEME,
        EDITOR_DARK_THEMES.has(normalizedLastTheme) ? DEFAULT_LIGHT_EDITOR_THEME : normalizedLastTheme,
    );
    vditor.options.lastDarkEditorTheme = resolveStoredManualTheme(
        LAST_DARK_EDITOR_THEME_KEY,
        DEFAULT_DARK_EDITOR_THEME,
        EDITOR_DARK_THEMES.has(normalizedLastTheme) ? normalizedLastTheme : DEFAULT_DARK_EDITOR_THEME,
    );
    const theme = resolveEditorTheme(vditor.options.editorTheme);
    setEditorTheme(vditor, theme, false);
    initMobileOutlineMenu(vditor);
};

export {resolveEditorTheme};
