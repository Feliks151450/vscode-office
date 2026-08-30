export const mathRenderAdapter = {
    getCode: (mathElement: Element) => mathElement.textContent,
    getElements: (element: HTMLElement) => {
        const elements = Array.from(element.querySelectorAll(".language-math"));
        // 调用方可能直接传入 .language-math 元素本身（如 latexEditor 插入后逐个渲染），
        // querySelectorAll 只匹配后代，需把自身也纳入
        if (element.classList.contains("language-math")) {
            elements.unshift(element);
        }
        return elements;
    },
};
export const mermaidRenderAdapter = {
    /** 不仅要返回code，并且需要将 code 设置为 el 的 innerHTML */
    getCode: (el: Element) => el.textContent,
    getElements: (element: HTMLElement) => element.querySelectorAll(".language-mermaid"),
};
export const plantumlRenderAdapter = {
    getCode: (el: Element) => el.textContent,
    getElements: (el: HTMLElement | Document) => el.querySelectorAll(".language-plantuml"),
};
