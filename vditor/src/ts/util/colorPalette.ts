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
    "#fef2f2", // red-50
    "#fff7ed", // orange-50
    "#fefce8", // yellow-50
    "#f0fdf4", // green-50
    "#eff6ff", // blue-50
    "#f5f3ff", // violet-50
    "#f1f5f9", // slate-100
    "#fafafa", // neutral-50
];