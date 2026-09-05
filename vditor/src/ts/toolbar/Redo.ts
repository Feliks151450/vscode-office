import {MenuItem} from "./MenuItem";
import {disableToolbar} from "./setToolbar";

export class Redo extends MenuItem {
    constructor(vditor: IVditor, menuItem: IMenuItem) {
        super(vditor, menuItem);
        disableToolbar({redo: this.element}, ["redo"]);
        // 同 Undo：直接绑 click + 不依赖 CLASS_MENU_DISABLED。
        // redo() 自身会在 redoStack 为空时直接返回。
        this.element.children[0].addEventListener("click", (event) => {
            event.preventDefault();
            vditor.undo.redo(vditor);
        });
    }
}