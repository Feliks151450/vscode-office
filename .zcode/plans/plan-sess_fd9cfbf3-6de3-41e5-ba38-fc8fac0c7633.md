## 修复方案：AI 输入面板拖拽时菜单跟随

### 根因
`makePanelDraggable` 的 `onPointerMove` 只在第一帧（`!didMove`）调用了 `onLock` 回调，之后每一帧只更新 `panel.style.left/top`，**再也没调过 `positionMenu/positionSubmenu`**。所以拖拽过程中菜单停留在原地，松手时也只解绑事件，没有最后一次定位。

`pointerdown` 里也调了一次 `onLock`（line 178），这就是"刚开始拖那一帧菜单会动一下"的原因——是首次锁定的副作用。

### 修改范围
仅 `vditor/src/ts/ui/aiInputPanel.ts` 一个文件，**两处改动**：
1. `makePanelDraggable` 函数签名 + 内部逻辑（约 line 119-186）
2. 调用点的回调（line 495-501）

### 具体改动

**1. 扩展 `makePanelDraggable` 签名（line 119-123）**

```ts
const makePanelDraggable = (
    panel: HTMLElement,
    handle: HTMLElement,
    onLock: () => void,
    onDragTick?: () => void,   // 新增：每帧拖拽回调（panel 位置变化时）
) => { ... }
```

**2. 在 `onPointerMove` 末尾（line 155 后）调用 `onDragTick`**

```ts
panel.style.left = `${newLeft}px`;
panel.style.top = `${newTop}px`;
onDragTick?.();   // ← 新增
```

**3. 调用点（line 495-501）改为传两个回调**

```ts
makePanelDraggable(
    this.overlay,
    this.dragHandle,
    // onLock：首次锁定，仅触发一次
    () => {
        this.pinned = true;
        this.overlay.classList.add(`${PANEL_CLASS}--pinned`);
    },
    // onDragTick：每帧 panel 位置变化后调用，菜单锚点失效需重定位
    () => {
        if (this.menuOpen) this.positionMenu();
        if (this.submenuOpen) this.positionSubmenu();
    },
);
```

### 行为对照

| 场景 | 修复前 | 修复后 |
|---|---|---|
| pointerdown | onLock 跑一次（菜单跳到 card 当前位置） | 同左 |
| pointermove 第一帧 | onLock + 菜单重定位 | 同左 |
| pointermove 后续帧 | **只动 card，菜单不动** ❌ | 同步重定位 menu/submenu ✅ |
| pointerup | 解绑，菜单停留在最后位置 ❌ | 解绑，最后一帧已重定位 ✅ |

### 不需要改动的地方
- `pointerdown` 里那行 `onLock()`（line 178）保留——和 bubbleMenu.ts 一致，提供"按下不拖也算 pin"的兜底语义
- `didMove` 首次调用 `onLock` 的逻辑保留——双重保险
- `positionMenu/positionSubmenu` 内部实现不动——它们本来就是 viewport 坐标 + `card.getBoundingClientRect()` 锚点，逻辑正确
- `endDrag` 不需要补一次定位——最后一帧 `pointermove` 已经处理；多此一举反而会闪烁

### 验收
按 CLAUDE.md 要求，改完源码后运行 `npm run build:dev`（或 `npm run build`）让 `dist/index.min.js` 更新。然后在浏览器里：
1. 打开 AI 输入面板
2. 点击 sparkle+ 打开主菜单，hover 润色打开 submenu
3. 按住顶部胶囊拖拽
4. 预期：card、menu、submenu 三者整体平滑跟随鼠标，松手后保持在最终位置无错位