/**
 * 气泡菜单调色板 + html-inline 编辑器顶部颜色栏共用同一套调色板，
 * 避免两个 UI 各定义一份导致后续维护漂移。
 *
 * 颜色来源：Tailwind 调色板（red-600, orange-600 等），便于快速视觉对齐。
 */
export const TEXT_COLORS: readonly string[] = [
    "#dc2626", // red
    "#ea580c", // orange
    "#ca8a04", // yellow
    "#16a34a", // green
    "#2563eb", // blue
    "#7c3aed", // purple
    "#475569", // slate
    "#000000", // black
];

export const BG_COLORS: readonly string[] = [
    "#fecaca", // red-200
    "#fed7aa", // orange-200
    "#fde68a", // yellow-200
    "#bbf7d0", // green-200
    "#bfdbfe", // blue-200
    "#ddd6fe", // violet-200
    "#cbd5e1", // slate-300
    "#d6d3d1", // stone-300
];

declare global {
    interface Window {
        /** 自定义文字预设色数组，覆盖内置 TEXT_COLORS；每次显示调色板时读取 */
        TEXT_COLORS?: readonly string[];
        /** 自定义背景预设色数组，覆盖内置 BG_COLORS；每次显示调色板时读取 */
        BG_COLORS?: readonly string[];
    }
}

/** 读取最新的文字预设色：window.TEXT_COLORS 未设置（或为空数组）时用内置默认值 */
export const resolveTextColors = (): readonly string[] => {
    const custom = window.TEXT_COLORS;
    return Array.isArray(custom) && custom.length > 0 ? custom : TEXT_COLORS;
};

/** 读取最新的背景预设色：window.BG_COLORS 未设置（或为空数组）时用内置默认值 */
export const resolveBgColors = (): readonly string[] => {
    const custom = window.BG_COLORS;
    return Array.isArray(custom) && custom.length > 0 ? custom : BG_COLORS;
};