import {hasClosestBlock, hasClosestByMatchTag} from "../util/hasClosest";
import {getEditorRange, setRangeByWbr} from "../util/selection";
import {renderTocNow} from "../util/toc";

export const setHeading = (vditor: IVditor, tagName: string) => {
    const range = getEditorRange(vditor);
    let blockElement = hasClosestBlock(range.startContainer);
    if (!blockElement) {
        blockElement = range.startContainer.childNodes[range.startOffset] as HTMLElement;
    }
    if (!blockElement && vditor.wysiwyg.element.children.length === 0) {
        blockElement = vditor.wysiwyg.element;
    }
    if (blockElement && !blockElement.classList.contains("vditor-wysiwyg__block")) {
        let targetElement = blockElement;
        let listParent: HTMLElement | null = null;
        if (blockElement.tagName === "UL" || blockElement.tagName === "OL") {
            const liElement = hasClosestByMatchTag(range.startContainer, "LI") as HTMLElement;
            if (liElement) {
                targetElement = liElement;
                listParent = blockElement;
            }
        }
        range.insertNode(document.createElement("wbr"));
        if (targetElement.innerHTML.trim() === "<wbr>") {
            targetElement.innerHTML = "<wbr><br>";
        }
        const headingHtml = `<${tagName} data-block="0">${targetElement.innerHTML.trim()}</${tagName}>`;
        if (targetElement.tagName === "BLOCKQUOTE" || targetElement.classList.contains("vditor-reset")) {
            targetElement.innerHTML = headingHtml;
        } else if (listParent) {
            const heading = document.createElement(tagName);
            heading.setAttribute("data-block", "0");
            heading.innerHTML = targetElement.innerHTML.trim();
            listParent.parentElement?.insertBefore(heading, listParent.nextSibling);
            targetElement.remove();
            if (listParent.children.length === 0) {
                listParent.remove();
            }
        } else {
            targetElement.outerHTML = headingHtml;
        }
        setRangeByWbr(vditor.wysiwyg.element, range);
        renderTocNow(vditor);
    }
};

export const removeHeading = (vditor: IVditor) => {
    const range = getSelection().getRangeAt(0);
    let blockElement = hasClosestBlock(range.startContainer);
    if (!blockElement) {
        blockElement = range.startContainer.childNodes[range.startOffset] as HTMLElement;
    }
    if (blockElement) {
        range.insertNode(document.createElement("wbr"));
        blockElement.outerHTML = `<p data-block="0">${blockElement.innerHTML}</p>`;
        setRangeByWbr(vditor.wysiwyg.element, range);
    }
    vditor.wysiwyg.popover.style.display = "none";
};
