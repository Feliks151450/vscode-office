/*!
 * ios-callout-killer.js v1.0.0
 *
 * 抑制 iOS 文本选中编辑菜单（拷贝/查询/翻译/查找/搜索网页），同时保留选区。
 *
 * 原理（仅 iOS Safari / WKWebView 适用，实测参数）：
 *   用户选中文本后，在菜单呈现后 50ms 清除选区（菜单随选区消失），
 *   再在 0ms 后程序化补回同一个 Range（高亮/选区复活，菜单不会重新唤起）。
 *   菜单只响应"用户手势"，不响应程序化选区变化 —— 这是补回后菜单不复活的原因。
 *
 * 手势区分（智能拦截，解决滚动误触发）：
 *   只有"本次手势期间出现了真实新选区"（selectionchange 且非空、非我们自己的清/补引发）
 *   才执行拦截；纯滚动（即使页面残留旧选区）直接放行，页面不闪。
 *
 * v1.0.1（拖选收尾）：iOS 文本选择手势经常吞掉 touchend（系统接管），
 *   因此非空 selectionchange 也会挂"静止收尾"：每次重置拦截计时，
 *   选区静止 settleDelay 后即执行清选区；touchstart 一律取消挂起
 *   （滚动前必有新的 touchstart），滚动仍不误触发。
 *
 * v1.0.2（拖选护盾修复）：
 *   - 清/补引发的 selectionchange 用"范围相同"精确识别（相同才忽略，
 *     不同即用户接续操作），不再把用户变化长期屏蔽到下一次 touchstart；
 *   - 新增 settleDelay（默认 250ms）：拖选静止收尾的判决窗口，明显大于
 *     菜单弹出时间与拖动中常见停顿，避免手势中途停车就提前清补（闪烁）。
 *
 * v1.0.3：新增 onTouch 回调（touchstart / touchend / touchcancel），
 *   用于对齐触摸事件与选区事件的时间线，方便调试。
 *
 * v1.0.4（静止轮询兜底）：iOS 手柄拖动全程吞掉 touchend 且可能不派发
 *   selectionchange——结束信号完全缺失。在 touchstart 后启动静止轮询：
 *   每 125ms 探测选区，连续 settleDelay 未变化（且无 touchmove 活动）即
 *   判定手势静止、执行清选区；明确的排定（touchend 等）或新的触摸开始
 *   会接管/重启轮询。滚动：touchmove 立即停止轮询，不误触发。
 *
 * v1.0.5（触摸活动窗口 + 幂等执行）：
 *   - 收尾判定 = 触摸静止 settleDelay 且选区静止 settleDelay：touchmove 到达
 *   时取消快速挂起并刷新最后活动时间，"拖动中停顿"不会再执行清补；
 * v1.0.6（延迟语义统一）：
 *   - clearDelay 对全部执行路径生效：静止判定完成（=手势结束信号，菜单已
 *   在呈现）后再等 clearDelay 才清选区，与 touchend 快速路径同一语义；
 *   - 活动窗口由 touchstart/touchmove/真实 selectionchange 共同刷新
 *   （拖动中每次选区变化都是活动），收尾 = 触摸活动 + 选区都静止
 *   settleDelay 后，再按 clearDelay 执行。
 *
 * 使用：
 *   <script src="ios-callout-killer.js"></script>
 *   <script>
 *     IosCalloutKiller.init({
 *       clearDelay: 50,          // 清选区延迟(ms)，实测下限约 50
 *       restoreDelay: 0,         // 补回延迟(ms)
 *       onTouch:     function (name) { ... },  // 触摸层事件（touchstart/touchmove/touchend/touchcancel）
 *       onIntercept: function (text) { ... },  // 菜单被掐灭时通知（text = 选中内容）
 *       onRestore:   function (text) { ... },  // 选区补回后通知
 *     });
 *   </script>
 *
 * 注意：
 *   - 输入框 / contenteditable 内的选中默认不拦截（ignoreEditable: true，不破坏编辑体验）；
 *     设为 false 后，可编辑区域内的选中同样执行“清选区 + 补回”，菜单同样被抑制。
 *   - 每个 iframe 是独立的 document，需在各子帧各自引入（或各帧注入）。
 *   - 本库不做任何 UI，回调里可自由叠你自己的划词面板。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) { module.exports = factory(); }
  else { root.IosCalloutKiller = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var VERSION = '1.0.6';

  var DEFAULTS = {
    clearDelay: 50,        // 清选区延迟(ms)（touchend/touchstart 后菜单出现时的清补时机）
    restoreDelay: 0,       // 补回延迟(ms)
    settleDelay: 250,      // 拖选静止收尾判决窗口(ms)：最后选区变化后静止这么久视为松手
    restore: true,         // 是否补回选区（false = 只清不补，仅调试用）
    smart: true,           // 智能拦截：仅"选择手势"触发（推荐，避免滚动误触发）
    trigger: 'touchend',   // 触发时机：'touchend' | 'selectionchange'
    ignoreEditable: true,  // 跳过输入框/可编辑区域（false = 可编辑区内同样拦截菜单）
    verbose: false,        // console 输出事件日志
    onTouch: null,         // function(evName)  触摸层事件（touchstart/touchmove/touchend/touchcancel）
    onSchedule: null,      // function(evName)  排定拦截（延迟计时器已挂上，尚未清选区）
    onIntercept: null,     // function(text)  菜单被掐灭时
    onRestore: null,       // function(text)  选区补回后
    onIgnored: null        // function(text)  残留选区但被智能拦截放行（滚动场景）
  };

  var listeners = null;    // 已注册的事件监听器句柄（destroy 用）
  var state = {
    cfg: null,
    enabled: false,
    installed: false,
    selfMutating: false,      // 我们自己的清/补引发的 selectionchange 需忽略
    gestureHadSelection: false,
    timers: { clear: null, restore: null },
    pending: null,            // { range, text } 清选区时暂存的原始选区
    lastRange: null,          // 最近一次我们/用户触发比较用的参考 Range
    pollTimer: null,          // 静止轮询句柄（touchstart 后启动，见 v1.0.4）
    pollStill: 0,             // 静止轮询：选区连续未变的探测次数
    pollLast: null,           // 静止轮询：上一次探测的选区文本
    lastActivity: 0,          // 最后一次触摸活动时间戳（touchstart/touchmove/touchend/touchcancel）
    executed: false           // 本手势是否已执行过清选区（幂等，防止多路径重复）
  };

  function log() {
    if (!state.cfg || !state.cfg.verbose) return;
    if (typeof console !== 'undefined' && console.log) {
      console.log.apply(console, ['[IosCalloutKiller]'].concat([].slice.call(arguments)));
    }
  }

  function safeCall(fn, arg) {
    if (typeof fn === 'function') {
      try { fn(arg); } catch (e) { /* 用户回调出错不影响拦截主流程 */ }
    }
  }

  function isEditableNode(node) {
    if (!node || !node.parentElement) return false;
    var el = node.nodeType === 3 ? node.parentElement : node;
    return !!(el.closest && el.closest('input, textarea, [contenteditable]'));
  }

  // 当前选区与参考 Range 是否完全相同（相同 = 我们清/补引发的，忽略）
  function rangesEqual(sel, r) {
    if (!r || sel.rangeCount < 1) return false;
    var q = sel.getRangeAt(0);
    return q.startContainer === r.startContainer && q.startOffset === r.startOffset &&
           q.endContainer === r.endContainer && q.endOffset === r.endOffset;
  }

  // ---------- 静止轮询（v1.0.4：结束事件缺失时的兜底判定） ----------
  var POLL_MS = 125;   // 探测间隔；settleDelay / POLL_MS 次未变即判定静止

  function startPoll() {
    if (state.pollTimer || !state.enabled) return;
    state.pollStill = 0;
    state.pollLast = null;
    state.pollTimer = setInterval(pollTick, POLL_MS);
  }

  function stopPoll() {
    clearInterval(state.pollTimer);
    state.pollTimer = null;
  }

  function pollTick() {
    var sel = window.getSelection();
    if (!sel || sel.isCollapsed) { state.pollStill = 0; state.pollLast = null; return; }
    if (Date.now() - state.lastActivity < state.cfg.settleDelay) return; // 仍在活动窗口内（拖动/滚动）
    var text = sel.toString();
    if (state.pollLast === text && rangesEqual(sel, state.lastRange)) {
      state.pollStill++;
      if (state.pollStill * POLL_MS >= state.cfg.settleDelay) {
        stopPoll();
        // 静止判定完成（= 手势结束信号，此时菜单正在/已呈现），
        // 再按 clearDelay 执行 —— 与 touchend 路径同一语义，滑块全局生效
        state.timers.clear = setTimeout(function () {
          state.timers.clear = null;
          doClear('poll(静止收尾)');
        }, state.cfg.clearDelay);
      }
    } else {
      // 选区仍在变（手柄拖动等）→ 更新参考并重新计静止时长
      state.pollLast = text;
      state.lastRange = sel.getRangeAt(0).cloneRange();
      state.pollStill = 1;
    }
  }

  // ---------- 核心动作 ----------
  function doClear(tag) {
    stopPoll(); // 清选区路径一旦执行，轮询让位
    if (state.executed) return; // 本手势已清理过，防止轮询与事件两条路径各清一次
    var sel = window.getSelection();
    if (!sel || sel.isCollapsed) { log('clear: 无选区，跳过'); return; }
    if (state.cfg.ignoreEditable && isEditableNode(sel.anchorNode)) { log('clear: 可编辑区域，跳过'); return; }

    state.selfMutating = true;   // 之后的 selectionchange 先按我们引发处理
    state.pending = {
      range: sel.getRangeAt(0).cloneRange(),  // clone：Range 必须独立保存
      text: sel.toString()
    };
    state.lastRange = state.pending.range;  // 参考范围：后续用户变化与其比较
    sel.removeAllRanges();       // 菜单随选区消失
    state.executed = true;       // 幂等：同一手势不再重复清补
    log('clear(' + state.pending.text.length + '字)@' + tag);
    safeCall(state.cfg.onIntercept, state.pending.text);  // 菜单被掐灭时通知（无论是否补回）

    if (state.cfg.restore) {
      state.timers.restore = setTimeout(doRestore, state.cfg.restoreDelay);
    } else {
      state.pending = null;
    }
  }

  function doRestore() {
    if (!state.pending) return;
    window.getSelection().addRange(state.pending.range);  // 程序化补回 → 菜单不会重新唤起
    var text = state.pending.text;
    state.pending = null;
    log('restore(' + text.length + '字)');
    safeCall(state.cfg.onRestore, text);
    // selfMutating 与 lastRange 保持到下一次用户真实变化（范围不同即解除，
    // 见 onSelectionChange）——"补回"引发的 selectionchange 与此范围相同，被忽略
  }

  function scheduleIntercept(evName, delay, forceNotify) {
    if (!state.enabled) return;
    stopPoll(); // 明确排定后轮询让位（单一路径执行）
    // 已在挂起时（拖选过程连续 selectionchange/收尾与 touchend 重叠）只重置计时，
    // 避免拖选期间刷日志；forceNotify 用于 touchend 等"手势最终信号"重新命名日志链首条。
    var isNew = !state.timers.clear;
    if (isNew || forceNotify) {
      log('触发 ' + evName + '（清选区延迟 ' + delay + 'ms）');
      safeCall(state.cfg.onSchedule, evName);
    }
    clearTimeout(state.timers.clear);
    state.timers.clear = setTimeout(function () {
      state.timers.clear = null;
      log('清选区延迟完成，执行清选区操作');
      doClear(evName + '+' + delay + 'ms');
    }, delay);
  }

  // ---------- 事件 ----------
  function onTouchStart() {
    log('touchstart');
    safeCall(state.cfg.onTouch, 'touchstart');
    state.lastActivity = Date.now();
    state.executed = false;       // 新手势开始，重新允许执行一次清选区
    state.gestureHadSelection = false;
    state.selfMutating = false;   // 新手势开始，用户对选区的真实修改重新放行
    state.lastRange = null;
    clearTimeout(state.timers.clear);   // 新触摸开始 → 取消上一手势的待执行拦截
    state.timers.clear = null;
    startPoll();                  // 静止轮询兜底：结束事件缺失时依然能判定静止
  }

  function onTouchMove() {
    log('touchmove');
    safeCall(state.cfg.onTouch, 'touchmove');
    if (!state.enabled) return;
    // 触摸运动 = 手法仍在进行（拖动/滚动）：刷新活动时间并确保轮询在跑。
    state.lastActivity = Date.now();
    startPoll();
  }

  function onTouchEnd() {
    log('touchend');
    safeCall(state.cfg.onTouch, 'touchend');
    state.lastActivity = Date.now();
    stopPoll();   // 明确的手势结束信号 → 轮询让位
    if (!state.enabled || state.cfg.trigger !== 'touchend') return;
    if (state.cfg.smart) {
      if (state.gestureHadSelection) {
        log('本手势期间出现了真实新选区，执行拦截');
        scheduleIntercept('touchend(选择手势)', state.cfg.clearDelay, true);
      } else {
        var sel = window.getSelection();
        if (sel && !sel.isCollapsed && !state.selfMutating) {
          log('跳过：非选择手势（残留选区 ' + sel.toString().length + ' 字）');
          safeCall(state.cfg.onIgnored, sel.toString());
        }
      }
    } else {
      scheduleIntercept('touchend(粗暴)', state.cfg.clearDelay, true);
    }
  }

  function onTouchCancel() {
    log('touchcancel');
    safeCall(state.cfg.onTouch, 'touchcancel');
    state.lastActivity = Date.now();
    // 注意：不能在这里作废手势。iOS 的文本选择由系统接管，本身就可能以
    // touchcancel 结束（touchend 被吞）；gestureHadSelection 由下一次
    // touchstart 复位，待执行的静止收尾计时器也保留（到点后按实时选区决定）。
  }

  function onSelectionChange() {
    var sel = window.getSelection();
    if (!sel) return;
    if (sel.isCollapsed) return;
    if (state.cfg.ignoreEditable && isEditableNode(sel.anchorNode)) return; // 可编辑区域不拦截
    // 只有"范围与我们清/补引发的一次变化相同"才忽略；范围不同 = 用户接续操作
    //（如拖选中途停顿后继续拖），解除屏蔽并继续手势节奏。
    if (state.selfMutating && rangesEqual(sel, state.lastRange)) return;
    state.selfMutating = false;
    state.executed = false; // 用户在变化选区 → 解除幂等，允许本手势再次执行
    state.gestureHadSelection = true; // 真实用户选中 → 本手势标记为"选择手势"
    state.lastRange = sel.getRangeAt(0).cloneRange();
    state.lastActivity = Date.now();  // 选区变化也是活动：拖动中持续刷新静止窗口
    clearTimeout(state.timers.clear); // 取消刚排定的清选区，交回活动窗口重新判定
    state.timers.clear = null;
    if (state.cfg.trigger === 'selectionchange') {
      scheduleIntercept('selectionchange', state.cfg.clearDelay);
    }
    // touchend 触发模式下不再单独排定：统一由静止轮询收尾
  }

  // ---------- 生命周期 ----------
  function buildListeners() {
    return {
      touchstart: onTouchStart,
      touchmove: onTouchMove,
      touchend: onTouchEnd,
      touchcancel: onTouchCancel,
      selectionchange: onSelectionChange
    };
  }

  function install() {
    if (state.installed) return;
    listeners = buildListeners();
    document.addEventListener('touchstart', listeners.touchstart, { capture: true, passive: true });
    document.addEventListener('touchmove', listeners.touchmove, { capture: true, passive: true });
    document.addEventListener('touchend', listeners.touchend, { capture: true, passive: true });
    document.addEventListener('touchcancel', listeners.touchcancel, { capture: true, passive: true });
    document.addEventListener('selectionchange', listeners.selectionchange, true);
    state.installed = true;
  }

  function destroy() {
    if (!state.installed || !listeners) return;
    document.removeEventListener('touchstart', listeners.touchstart, true);
    document.removeEventListener('touchmove', listeners.touchmove, true);
    document.removeEventListener('touchend', listeners.touchend, true);
    document.removeEventListener('touchcancel', listeners.touchcancel, true);
    document.removeEventListener('selectionchange', listeners.selectionchange, true);
    stopPoll();
    clearTimeout(state.timers.clear);
    clearTimeout(state.timers.restore);
    listeners = null;
    state.installed = false;
    state.enabled = false;
    state.pending = null;
    state.lastRange = null;
  }

  function init(options) {
    destroy();                                  // 重复 init 安全
    state.cfg = {};
    for (var k in DEFAULTS) { if (Object.prototype.hasOwnProperty.call(DEFAULTS, k)) state.cfg[k] = DEFAULTS[k]; }
    if (options) {
      for (var k2 in options) { if (Object.prototype.hasOwnProperty.call(options, k2)) state.cfg[k2] = options[k2]; }
    }
    state.enabled = true;
    install();
    return api;
  }

  function setOptions(partial) {
    if (!state.cfg) return api;
    if (partial) {
      for (var k in partial) { if (Object.prototype.hasOwnProperty.call(partial, k)) state.cfg[k] = partial[k]; }
    }
    return api;
  }

  function enable() { state.enabled = true; log('已启用'); return api; }
  function disable() { state.enabled = false; log('已禁用'); return api; }

  var api = {
    init: init,
    destroy: destroy,
    enable: enable,
    disable: disable,
    setOptions: setOptions,
    version: VERSION
  };

  return api;
});
