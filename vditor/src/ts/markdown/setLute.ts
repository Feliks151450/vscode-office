import {
    extractHtmlInlineFromMd,
    protectHtmlInlineShellsInHtml,
    restoreHtmlInlineShells,
} from "../htmlInline/htmlInlineShell";

/**
 * 修复 Lute 对（嵌套）inline HTML 的解析缺陷，见 htmlInlineShell.ts 顶部说明。
 * 在 lute 实例上统一包裹 4 个渲染/输入方法，覆盖 setValue、insertMarkdown、
 * AI 替换以及 IR / wysiwyg 的输入管道全部路径：
 *  - Md2Vtitor* 在 md → DOM 前提取内联 HTML run，渲染后回填手写 shell；
 *  - SpinVtitor* 在输入重排前把已有 shell 提取为占位符，重排后换回。
 */
const wrapHtmlInlineProtection = (lute: Lute): void => {
    const wrapMdRender = (fn: (md: string) => string) => (md: string): string => {
        const extracted = extractHtmlInlineFromMd(md);
        if (extracted.shells.length === 0) {
            return fn(md);
        }
        return restoreHtmlInlineShells(fn(extracted.md), extracted.shells);
    };
    const wrapSpin = (fn: (html: string) => string) => (html: string): string => {
        const protectedHtml = protectHtmlInlineShellsInHtml(html);
        if (protectedHtml.shells.length === 0) {
            return fn(html);
        }
        return restoreHtmlInlineShells(fn(protectedHtml.html), protectedHtml.shells);
    };

    lute.Md2VditorDOM = wrapMdRender(lute.Md2VditorDOM.bind(lute));
    lute.Md2VditorIRDOM = wrapMdRender(lute.Md2VditorIRDOM.bind(lute));
    lute.SpinVditorDOM = wrapSpin(lute.SpinVditorDOM.bind(lute));
    lute.SpinVditorIRDOM = wrapSpin(lute.SpinVditorIRDOM.bind(lute));
};

export const setLute = (options: ILuteOptions) => {
    const lute: Lute = Lute.New();
    lute.SetHeadingAnchor(options.headingAnchor);
    lute.SetInlineMathAllowDigitAfterOpenMarker(options.inlineMathDigit);
    lute.SetAutoSpace(options.autoSpace);
    lute.SetToC(options.toc);
    lute.SetFootnotes(options.footnotes);
    lute.SetFixTermTypo(options.fixTermTypo);
    lute.SetVditorCodeBlockPreview(options.codeBlockPreview);
    lute.SetVditorMathBlockPreview(options.mathBlockPreview);
    lute.SetSanitize(options.sanitize);
    lute.SetChineseParagraphBeginningSpace(options.paragraphBeginningSpace);
    lute.SetRenderListStyle(options.listStyle);
    lute.SetLinkBase(options.linkBase);
    lute.SetLinkPrefix(options.linkPrefix);
    lute.SetMark(options.mark);
    if (options.lazyLoadImage) {
        lute.SetImageLazyLoading(options.lazyLoadImage);
    }
    wrapHtmlInlineProtection(lute);
    return lute;
};
