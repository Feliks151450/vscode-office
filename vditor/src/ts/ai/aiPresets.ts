/**
 * AI 对话面板"快捷操作"(quick action presets) 模块
 *
 * 把原本硬编码在 aiDialog.ts:30-49 的 6 个内置预设抽出来，
 * 同时支持通过 setAIPresets() 持久化用户自定义预设。
 */

export interface AIPreset {
    /** 唯一标识（内置 preset 用 "polish"/"shorten" 等固定 key；自定义用 key-${ts}） */
    key: string;
    /** 显示标签；若 i18nKey 翻译命中则用翻译，否则用 label */
    label: string;
    /** 可选 i18n key（如 "aiPresetPolish"），用于内置 preset 的多语言 */
    i18nKey?: string;
    /** 点击后写入 goal textarea 的文本 */
    goal: string;
    /**
     * 顶部分组。仅 AI 浮动输入面板（AIInputPanel）使用。
     * - "writing" → 直接渲染为 chip（续写/伴写）
     * - "rewrite" → 归入 "AI 帮我改" 下拉子项
     * - 缺省 → aiDialog 旧 chip 路径
     */
    category?: "writing" | "rewrite";
}

export const DEFAULT_AI_PRESETS: AIPreset[] = [
    {
        key: "polish",
        label: "Polish",
        i18nKey: "aiPresetPolish",
        goal: "Polish and improve the writing while preserving meaning",
    },
    {
        key: "shorten",
        label: "Shorten",
        i18nKey: "aiPresetShorten",
        goal: "Make the text more concise without losing key information",
    },
    {
        key: "expand",
        label: "Expand",
        i18nKey: "aiPresetExpand",
        goal: "Expand the text with more detail and depth",
    },
    {
        key: "grammar",
        label: "Fix grammar",
        i18nKey: "aiPresetGrammar",
        goal: "Fix grammar, spelling, and punctuation errors",
    },
    {
        key: "clarity",
        label: "Improve clarity",
        i18nKey: "aiPresetClarity",
        goal: "Improve clarity and readability",
    },
    {
        key: "translate",
        label: "Translate",
        i18nKey: "aiPresetTranslate",
        goal: "Translate the text to the target output language while preserving meaning and Markdown structure",
    },
    // 新 4 个带 category，仅 AI 浮动输入面板（AIInputPanel）使用
    {
        key: "continue",
        label: "续写",
        i18nKey: "aiPresetContinue",
        goal: "Continue writing naturally from the end of the given text. Output ONLY the continuation, not the original text.",
        category: "writing",
    },
    {
        key: "cowrite",
        label: "伴写",
        i18nKey: "aiPresetCowrite",
        goal: "Write a collaborative continuation alongside the given text. Output both the original text and your continuation as a coherent whole.",
        category: "writing",
    },
    {
        key: "rewrite",
        label: "重写",
        i18nKey: "aiPresetRewrite",
        goal: "Rewrite the text completely with the same meaning but different wording and structure.",
        category: "rewrite",
    },
    {
        key: "synonym",
        label: "换同义词",
        i18nKey: "aiPresetSynonym",
        goal: "Replace words with their synonyms while keeping the original meaning, tone, and structure intact.",
        category: "rewrite",
    },
];

/**
 * 返回 6 个**内置默认** preset 的 key → goal 快速查表。
 * **不包含**用户自定义 preset；自定义的 goal 应从当前 getAIPresets() 列表里按 key 查找。
 * AIDialog.applyPreset() 在用户列表找不到时用此表作为 fallback。
 */
export const getDefaultPresetGoals = (): Record<string, string> => {
    const goals: Record<string, string> = {};
    for (const preset of DEFAULT_AI_PRESETS) {
        goals[preset.key] = preset.goal;
    }
    return goals;
};

/**
 * 解析 preset 的最终显示文案：优先用 i18n[key]，否则用 label。
 */
export const displayPresetLabel = (
    preset: AIPreset,
    i18n: Record<string, string> | undefined,
): string => {
    if (preset.i18nKey && i18n && i18n[preset.i18nKey]) {
        return i18n[preset.i18nKey];
    }
    return preset.label;
};
