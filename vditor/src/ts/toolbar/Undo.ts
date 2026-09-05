import {MenuItem} from "./MenuItem";
import {disableToolbar} from "./setToolbar";

export class Undo extends MenuItem {
    constructor(vditor: IVditor, menuItem: IMenuItem) {
        super(vditor, menuItem);
        disableToolbar({undo: this.element}, ["undo"]);
        // 直接绑 click，不走 getEventName()（iPhone 用 touchstart 那种）——
        // 移动端 Safari 在 contenteditable 区域里对 touchstart 的派发不可靠，
        // 经常被 Safari 的文本选择/双击放大手势"吃掉"，导致按钮点了没反应。
        // click 在现代 iOS Safari（iOS 13+）已经无 300ms 延迟，配合 button 上
        // touch-action: manipulation 可以即时触发。
        // 也不 bail out on CLASS_MENU_DISABLED —— undo() 内部本身就会在栈为空
        // 时直接返回，少一道闸门可避免"按钮看着 enabled 但点击没反应"的视觉/状态错位。
        this.element.children[0].addEventListener("click", (event) => {
            event.preventDefault();
            vditor.undo.undo(vditor);
        });
    }
}