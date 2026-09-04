/**
 * html-inline shell 的构造、提取与保护逻辑（不依赖 Lute）。
 *
 * 背景：Lute 的 InlineHTML 渲染器只支持单层标签。对嵌套 inline HTML
 * （如 `<span style="bg">示例<span style="color">页面</span></span>`），
 * Lute 会把外层拆成只含开标签的 shell、内层递归拆成新 shell，且拆分形状
 * 不稳定（"示例"有时在外壳内、有时在兄弟位），直接后处理无法可靠还原；
 * Lute 自己的 shell 只保存开标签源，getValue 时内层内容会丢失。
 *
 * 方案：不让 Lute 见到这些内联 HTML ——
 *  - md → DOM（Md2VtitorDOM / Md2VtitorIRDOM）：渲染前把内联 HTML run
 *    替换为不可见占位符，渲染完再换回手写 shell（data-md-source 保存完整源，
 *    getValue 时 Lute 直接输出该源）。
 *  - 输入管道（SpinVtitorDOM / SpinVtitorIRDOM）：spin 前把已有 shell
 *    提取为占位符，spin 完再换回。输入前编辑器会剥掉 [style]，
 *    所以手写 shell 在保护阶段从 data-md-source 重建 display。
 */

// data-md-source 属性里的换行占位（HTML 属性不能含字面换行）
export const MD_SOURCE_ESC_NEWLINE = "_esc_newline_";

// 会被提取为手写 shell 的内联标签白名单。
// 不含 a / img —— Lute 会把它们渲染为链接/图片节点，保持原行为。
export const INLINE_HTML_TAGS = new Set([
    "span", "kbd", "sub", "sup", "i", "b", "u", "em", "strong",
    "small", "mark", "s", "del", "ins", "abbr", "cite", "q", "time",
    "samp", "var", "data", "bdi", "bdo", "dfn", "code",
]);

const TOKEN_HEAD = "";
const TOKEN_TAIL = "";
const tokenOf = (index: number) => `${TOKEN_HEAD}HTML${index}${TOKEN_TAIL}`;

// HTML 标签转义：构造 data-md-source / data-open-tag 属性值时用
export const escapeAttr = (s: string): string => s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const escapeHtml = (s: string): string => s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

/** 还原 data-md-source 属性值（换行占位 → 换行；实体由浏览器 getAttribute 已解） */
export const decodeHtmlInlineSource = (raw: string | null): string =>
    (raw || "").replaceAll(MD_SOURCE_ESC_NEWLINE, "\n");

/**
 * 从 startPos 开始找与外层同标签的 closeTag，处理嵌套同名标签。
 * 返回的是 closeTag 在原字符串中的起始位置。
 */
export const findMatchingClose = (md: string, startPos: number, closeTag: string): number => {
    const tagName = closeTag.slice(2, -1); // "span"
    const openRe = new RegExp(`<${tagName}(\\s[^>]*?)?>`, "gi");
    const closeRe = new RegExp(`</${tagName}\\s*>`, "gi");
    let depth = 1;
    let pos = startPos;
    while (pos < md.length) {
        // 在剩余子串里找下一个开标签和闭标签
        openRe.lastIndex = pos;
        closeRe.lastIndex = pos;
        const openMatch = openRe.exec(md);
        const closeMatch = closeRe.exec(md);
        if (!closeMatch) return -1;
        if (!openMatch || openMatch.index > closeMatch.index) {
            // 下一个事件是闭标签
            depth--;
            pos = closeMatch.index + closeMatch[0].length;
            if (depth === 0) return closeMatch.index;
        } else {
            // 下一个事件是开标签
            depth++;
            pos = openMatch.index + openMatch[0].length;
        }
    }
    return -1;
};

/**
 * 把 markdown 源（如 `<span bg>示例<span color>页面</span></span>`）
 * 转换成纯 styled span HTML 字符串（用于 display）。
 * 保留嵌套结构但所有内层 span 都用 inline style 表达（不再嵌 html-inline shell）。
 */
export const mdToStyledSpanHtml = (md: string): string => {
    let result = "";
    let pos = 0;
    while (pos < md.length) {
        const openMatch = md.slice(pos).match(/^<([a-zA-Z][^>]*?)>/);
        if (openMatch) {
            const attrs = openMatch[1]; // e.g. "span style=\"...\""
            const tagEnd = pos + openMatch[0].length;
            // 找匹配的闭合标签（处理嵌套同标签的情况）
            const tagName = attrs.split(/\s/)[0];
            const closeTag = `</${tagName}>`;
            const closeIdx = findMatchingClose(md, tagEnd, closeTag);
            if (closeIdx === -1) {
                // 没找到匹配的闭合标签，原样输出剩余部分
                result += escapeHtml(md.slice(pos));
                break;
            }
            // 提取开闭标签之间的内容，递归处理
            const innerMd = md.slice(tagEnd, closeIdx);
            const innerHtml = mdToStyledSpanHtml(innerMd);
            // 只保留 style 属性（vditor 的 inline html 主要就是 style）
            const styleMatch = attrs.match(/\bstyle\s*=\s*"([^"]*)"/i);
            const styleAttr = styleMatch ? ` style="${escapeAttr(styleMatch[1])}"` : "";
            result += `<${tagName}${styleAttr}>${innerHtml}${closeTag}`;
            pos = closeIdx + closeTag.length;
        } else {
            // 普通文本直到下一个标签
            const nextOpen = md.slice(pos).search(/<[a-zA-Z]/);
            if (nextOpen === -1) {
                result += escapeHtml(md.slice(pos));
                break;
            }
            result += escapeHtml(md.slice(pos, pos + nextOpen));
            pos += nextOpen;
        }
    }
    return result;
};

/**
 * 手写 html-inline shell 包装（不依赖 Lute）。
 *
 * 为什么不依赖 Lute：Lute.Md2VtitorDOM 解析嵌套 inline HTML 时会丢内容
 * （例如 `<span bg>示例<span color>页面</span></span>` 解析后，"示例"和内壳 shell
 * 变成外壳的兄弟节点而不是子节点）。后续即使修复 data-md-source，display 内的
 * 内容会被编辑器的 input 管道（SpinVtitorDOM/VtitorDOM）破坏。
 *
 * 这里手写构造：单个 html-inline shell，data-md-source 是完整嵌套源，
 * display 内是纯 styled span（没有嵌套 shell），让 execCommand 和 input 管道
 * 都不会破坏结构。getValue 时 Lute 读 data-md-source 输出完整 markdown。
 */
export const renderHtmlInlineShell = (md: string): string => {
    const trimmed = md.trim();
    if (!trimmed) return "";

    // 解析 markdown 构造显示用的纯 styled span 结构（无嵌套 html-inline shell）
    const displayHtml = mdToStyledSpanHtml(trimmed);
    const openTagMatch = trimmed.match(/^<([a-zA-Z][^>]*?)>/);
    const openTag = openTagMatch ? `<${openTagMatch[1]}>` : "";
    const sourceAttr = escapeAttr(trimmed).replace(/\n/g, MD_SOURCE_ESC_NEWLINE);
    const openTagAttr = escapeAttr(openTag).replace(/\n/g, MD_SOURCE_ESC_NEWLINE);

    // 重要：不加 vditor-html-inline / vditor-html-inline--readonly class！
    // 这两个 class 是 Lute 用来识别 html-inline shell 的，但识别后它只输出外层开标签，
    // 会丢嵌套内容。我们用手写结构，data-md-source 已经是完整嵌套源，
    // 让 Lute 把整个 shell 当作普通 span 处理，直接输出 data-md-source 的内容。
    return (
        `<span class="vditor-ir__node" contenteditable="false" ` +
        `data-type="html-inline" data-open-tag="${openTagAttr}" ` +
        `data-md-source="${sourceAttr}">` +
        `<span class="vditor-html-inline__display">${displayHtml}</span>` +
        `</span>`
    );
};

/**
 * 把 ``` / ~~~ 围栏代码块的内容替换为等长空格（保留换行与围栏行），
 * 避免 md 级提取时把代码块里的 HTML 示例当成内联 HTML。
 */
const maskFencedCode = (md: string): string => {
    const lines = md.split("\n");
    let inFence = false;
    let fenceChar = "";
    return lines.map((line) => {
        const trimmed = line.trim();
        const fenceMatch = trimmed.match(/^(```+|~~~+)/);
        if (!inFence) {
            if (fenceMatch) {
                inFence = true;
                fenceChar = fenceMatch[1][0];
            }
            return line;
        }
        if (fenceMatch && fenceMatch[1][0] === fenceChar) {
            inFence = false;
            return line;
        }
        // 围栏内容：遮罩所有非空白字符（保留长度）
        return line.replace(/\S/g, " ");
    }).join("\n");
};

/**
 * 把 `...` / ``...`` 行内代码的内容替换为等长空格（保留空白），
 * 避免 md 级提取时把代码里的 HTML 示例当成内联 HTML。
 */
const maskInlineCode = (md: string): string => {
    let out = "";
    let pos = 0;
    while (pos < md.length) {
        if (md[pos] === "`") {
            let run = 1;
            while (md[pos + run] === "`") {
                run++;
            }
            const close = md.indexOf("`".repeat(run), pos + run);
            if (close !== -1) {
                out += md.slice(pos, pos + run); // 开标记
                // 内容遮罩：只保留空白
                out += md.slice(pos + run, close).replace(/\S/g, " ");
                pos = close;
                continue;
            }
        }
        out += md[pos];
        pos++;
    }
    return out;
};

/**
 * md 级提取：把白名单内联标签的完整 run（含嵌套）替换为不可见占位符，
 * 并返回每个 run 的原始 markdown 源。Lute 渲染完后再用
 * restoreHtmlInlineShells 换回手写 shell。
 *
 * 简单 run（无嵌套标签）也提取——统一成手写 shell，与 popover 应用样式
 * 生成的形态一致，且 Lute 自己的简单 shell 在 getValue 时也会丢内容。
 */
export const extractHtmlInlineFromMd = (md: string): { md: string; shells: string[] } => {
    // 遮罩代码块与行内代码后再扫描，避免提取到代码里的 HTML 示例
    const masked = maskInlineCode(maskFencedCode(md));
    const shells: string[] = [];
    let out = "";
    let pos = 0;
    while (pos < masked.length) {
        const tagMatch = masked.slice(pos).match(/^<([a-zA-Z][a-zA-Z0-9-]*)(\s[^>]*?)?>/);
        if (!tagMatch || !INLINE_HTML_TAGS.has(tagMatch[1])) {
            out += md[pos];
            pos++;
            continue;
        }
        const tagName = tagMatch[1];
        const tagEnd = pos + tagMatch[0].length;
        const closeTag = `</${tagName}>`;
        const closeIdx = findMatchingClose(masked, tagEnd, closeTag);
        if (closeIdx === -1) {
            // 没有匹配的闭合标签（如 void 标签、残缺写法），交给 Lute 处理
            out += md[pos];
            pos++;
            continue;
        }
        const run = md.slice(pos, closeIdx + closeTag.length);
        // 存渲染好的手写 shell（restore 直接换回）
        shells.push(renderHtmlInlineShell(run));
        out += tokenOf(shells.length - 1);
        pos = closeIdx + closeTag.length;
    }
    return { md: out, shells };
};

/**
 * DOM 级保护（输入管道用）：把 html 里所有 [data-type="html-inline"] shell
 * 替换为不可见占位符，返回 { html, shells }。
 *
 * 手写 shell（有 data-open-tag）从 data-md-source 重建——输入前编辑器会
 * 剥掉 [style]，重建可恢复 display 样式；Lute 原生 shell 保持原样。
 */
export const protectHtmlInlineShellsInHtml = (html: string): { html: string; shells: string[] } => {
    const temp = document.createElement("div");
    temp.innerHTML = html;
    const shells: string[] = [];
    temp.querySelectorAll('[data-type="html-inline"]').forEach((el, index) => {
        if (el.hasAttribute("data-open-tag")) {
            shells.push(renderHtmlInlineShell(decodeHtmlInlineSource(el.getAttribute("data-md-source"))));
        } else {
            shells.push(el.outerHTML);
        }
        el.replaceWith(document.createTextNode(tokenOf(index)));
    });
    return { html: temp.innerHTML, shells };
};

/** 把占位符换回 shell HTML（split/join 避免 $ 等替换模式字符被误解） */
export const restoreHtmlInlineShells = (html: string, shells: string[]): string => {
    let result = html;
    shells.forEach((shell, index) => {
        result = result.split(tokenOf(index)).join(shell);
    });
    return result;
};
