import {formatMs, logPerf} from "../util/log";
import {rootToMarkdown} from "./cleanFragmentForMarkdown";

export const getMarkdown = (vditor: IVditor) => {
    const debug = vditor.options.debugger;
    const totalStart = debug ? performance.now() : 0;

    let stepStart = debug ? performance.now() : 0;
    const html = rootToMarkdown(vditor);
    const buildHtmlMs = debug ? performance.now() - stepStart : 0;

    logPerf(debug, "[vditor markdown] getMarkdown", {
        buildHtmlMs: formatMs(buildHtmlMs),
        totalMs: formatMs(debug ? performance.now() - totalStart : 0),
    });

    return html;
};
