import { Constants } from "../constants";
import { addScript, addScriptSync } from "../util/addScript";
import { addStyle } from "../util/addStyle";
import { code160to32 } from "../util/code160to32";
import { mathRenderAdapter } from "./adapterRender";

declare const katex: {
    renderToString(math: string, option: {
        displayMode?: boolean | undefined;
        output?: 'html' | 'mathml' | 'htmlAndMathml' | undefined;
        leqno?: boolean | undefined;
        fleqn?: boolean | undefined;
        throwOnError?: boolean | undefined;
        errorColor?: string | undefined;
        macros?: any;
        minRuleThickness?: number | undefined;
        colorIsTextColor?: boolean | undefined;
        maxSize?: number | undefined;
        maxExpand?: number | undefined;
        strict?: boolean | string | undefined;
        globalGroup?: boolean | undefined;
    }): string;
};

declare global {
    interface Window {
        MathJax: any;
    }
}

export const mathRender = (element: HTMLElement, options?: { cdn?: string, extPath?: string, math?: IMath }) => {
    const mathElements = mathRenderAdapter.getElements(element);

    if (mathElements.length === 0) {
        return;
    }

    const defaultOptions = {
        cdn: Constants.CDN,
        math: {
            engine: "KaTeX",
            inlineDigit: false,
            macros: {},
        },
    };

    if (options && options.math) {
        options.math =
            Object.assign({}, defaultOptions.math, options.math);
    }
    options = Object.assign({}, defaultOptions, options);

    // 公式源元素（编辑器源码）不应被渲染：
    //   - ```math 围栏：源在 pre.vditor-wysiwyg__pre / pre.vditor-ir__marker--pre 里
    //   - $$ 双美元：源是裸 <pre style="display:none"> 里的 <code data-type="math-block">
    //     （ensureMathBlockPreviewMode 会给它也加上 language-math 类，若只靠父级 class
    //     判断会漏掉它，mathRender 会把源清空塞进 SVG，导致 getMarkdown 输出空公式）
    const isSourceMathElement = (mathElement: Element) => {
        const parent = mathElement.parentElement;
        if (!parent) {
            return false;
        }
        if (parent.classList.contains("vditor-wysiwyg__pre") ||
            parent.classList.contains("vditor-ir__marker--pre")) {
            return true;
        }
        return parent.tagName === "PRE" &&
            !parent.classList.contains("vditor-wysiwyg__preview") &&
            !parent.classList.contains("vditor-ir__preview");
    };

    if (options.math.engine === "KaTeX") {
        const baseUrl = options.extPath || options.cdn;
        addStyle(`${baseUrl}/dist/js/katex/katex.min.css`, "vditorKatexStyle");
        addScript(`${baseUrl}/dist/js/katex/katex.min.js`, "vditorKatexScript").then(() => {
            addScript(`${baseUrl}/dist/js/katex/mhchem.min.js`, "vditorKatexChemScript").then(() => {
                mathElements.forEach((mathElement) => {
                    if (isSourceMathElement(mathElement)) {
                        return;
                    }
                    if (mathElement.getAttribute("data-math")) {
                        return;
                    }
                    const math = code160to32(mathRenderAdapter.getCode(mathElement));
                    mathElement.setAttribute("data-math", math);
                    try {
                        mathElement.innerHTML = katex.renderToString(math, {
                            displayMode: mathElement.tagName === "DIV" ||
                                !!mathElement.closest("[data-type='math-block'], [data-type='code-block']"),
                            strict: false,
                            throwOnError: false,
                            output: "html",
                            macros: options.math.macros,
                            trust: true,
                        });
                    } catch (e) {
                        mathElement.innerHTML = e.message;
                        mathElement.className = "language-math vditor-reset--error";
                    }

                    mathElement.addEventListener("copy", (event: ClipboardEvent) => {
                        event.stopPropagation();
                        event.preventDefault();
                        const vditorMathElement = (event.currentTarget as HTMLElement).closest(".language-math");
                        event.clipboardData.setData("text/html", vditorMathElement.innerHTML);
                        event.clipboardData.setData("text/plain",
                            vditorMathElement.getAttribute("data-math"));
                    });
                });
            });
        });
    } else if (options.math.engine === "MathJax") {
        const chainAsync = (fns: any) => {
            if (fns.length === 0) {
                return;
            }
            let curr = 0;
            const last = fns[fns.length - 1];
            const next = () => {
                const fn = fns[curr++];
                fn === last ? fn() : fn(next);
            };
            next();
        };
        if (!window.MathJax) {
            window.MathJax = {
                loader: {
                    paths: { mathjax: `${options.cdn}/dist/js/mathjax` },
                },
                startup: {
                    typeset: false,
                },
                tex: {
                    macros: options.math.macros,
                },
            };
        }
        // 循环加载会抛异常
        addScriptSync(`${options.cdn}/dist/js/mathjax/tex-svg-full.js`, "protyleMathJaxScript");
        const renderMath = (mathElement: Element, next?: () => void) => {
            const math = code160to32(mathElement.textContent).trim();
            const mathOptions = window.MathJax.getMetricsFor(mathElement);
            mathOptions.display = mathElement.tagName === "DIV" ||
                !!mathElement.closest("[data-type='math-block'], [data-type='code-block']");
            window.MathJax.tex2svgPromise(math, mathOptions).then((node: Element) => {
                mathElement.innerHTML = "";
                mathElement.setAttribute("data-math", math);
                mathElement.append(node);
                window.MathJax.startup.document.clear();
                window.MathJax.startup.document.updateDocument();
                const errorTextElement = node.querySelector('[data-mml-node="merror"]');
                if (errorTextElement && errorTextElement.textContent.trim() !== "") {
                    mathElement.innerHTML = errorTextElement.textContent.trim();
                    mathElement.className = "vditor-reset--error";
                }
                if (next) {
                    next();
                }
            });
        };
        window.MathJax.startup.promise.then(() => {
            const chains: any[] = [];
            for (let i = 0; i < mathElements.length; i++) {
                const mathElement = mathElements[i];
                if (!isSourceMathElement(mathElement) &&
                    !mathElement.getAttribute("data-math") && code160to32(mathElement.textContent).trim()) {
                    chains.push((next: () => void) => {
                        if (i === mathElements.length - 1) {
                            renderMath(mathElement);
                        } else {
                            renderMath(mathElement, next);
                        }
                    });
                }
            }
            chainAsync(chains);
        });
    }
};