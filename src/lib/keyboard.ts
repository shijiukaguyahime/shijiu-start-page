"use client";

import { useEffect, useRef } from "react";

type Ref = React.RefObject<HTMLElement | null>;

/* ============================================================================
   键盘模式标记
   只有一种模式：按下方向键时给 html 打上 data-kbd="arrow"，Tab 或鼠标操作清空。
   它唯一的作用是让“脚本 focus() 落在宫格图标上”也显示焦点环——
   :focus-visible 对程序化聚焦不一定匹配，而宫格导航正是脚本聚焦。
   环的样式与 Tab 的 :focus-visible 完全一致（同一颜色、同一粗细），
   所以键盘用户看到的永远是同一个焦点环，不会出现两套。
   ========================================================================== */
let kbdMode: "arrow" | null = null;

function applyKbdMode() {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (kbdMode) root.dataset.kbd = kbdMode;
  else delete root.dataset.kbd;
}

export function setKbdMode(mode: "arrow" | null) {
  kbdMode = mode;
  applyKbdMode();
}

/* ============================================================================
   Esc 层栈：按优先级取最上层，只有它响应 Esc
   旧的 useEscapeKey 各自监听 document，弹窗叠在设置上时一次 Esc 会连带关掉两层。
   ========================================================================== */
export const ESC_PRIORITY = {
  home: 10,
  search: 20,
  grid: 60,
  panel: 70,
  settings: 80,
  modal: 90,
  menu: 100,
} as const;

type EscLayer = {
  id: string;
  priority: number;
  seq: number;
  onEscape: () => void;
};

const layers: EscLayer[] = [];
let seq = 0;

function pushLayer(id: string, priority: number, onEscape: () => void) {
  const i = layers.findIndex((l) => l.id === id);
  if (i >= 0) layers.splice(i, 1);
  layers.push({ id, priority, seq: ++seq, onEscape });
}

function removeLayer(id: string) {
  const i = layers.findIndex((l) => l.id === id);
  if (i >= 0) layers.splice(i, 1);
}

/** 优先级最高者胜出；同优先级时后注册者（更晚打开）在上 */
function topLayer(): EscLayer | null {
  let best: EscLayer | null = null;
  for (const l of layers) {
    if (!best || l.priority > best.priority || (l.priority === best.priority && l.seq > best.seq)) best = l;
  }
  return best;
}

let bound = false;

function bindGlobal() {
  if (bound || typeof document === "undefined") return;
  bound = true;

  document.addEventListener(
    "keydown",
    (e) => {
      if (e.key === "Escape") {
        const top = topLayer();
        if (!top) return;
        e.preventDefault();
        // capture 阶段截断，避免下层/其他组件的同键监听重复响应
        e.stopImmediatePropagation();
        top.onEscape();
        return;
      }
      if (e.key === "ArrowUp" || e.key === "ArrowDown" || e.key === "ArrowLeft" || e.key === "ArrowRight" || e.key === "Home" || e.key === "End") {
        setKbdMode("arrow");
      }
    },
    true,
  );

  const clear = () => setKbdMode(null);
  document.addEventListener("pointerdown", clear, true);
}

/** 是否存在优先级 >= min 的已打开层（面板/弹窗/菜单），用于阻止底层区域抢方向键 */
export function hasLayerAtLeast(min: number) {
  const top = topLayer();
  return !!top && top.priority >= min;
}

/**
 * 注册一个 Esc 层。enabled=false 时不入栈，天然让位给下层。
 */
export function useEscapeLayer(id: string, enabled: boolean, onEscape: () => void, priority: number) {
  const cb = useRef(onEscape);
  cb.current = onEscape;

  useEffect(() => {
    if (!enabled) return;
    bindGlobal();
    pushLayer(id, priority, () => cb.current());
    return () => removeLayer(id);
  }, [id, enabled, priority]);
}

/* ============================================================================
   方向键导航

   全站只有一条规则（唯一例外是宫格）：
     ↓ 或 → = 序列里的下一个
     ↑ 或 ← = 序列里的上一个
     Home / End = 首项 / 末项
   序列就是 DOM（= Tab）顺序。四个方向键在任何地方都有效，不存在
   “这个容器只认上下、那个容器只认左右”的差异。
   唯一例外：宫格是真二维网格，↑↓ 换行、←→ 左右移动才符合视觉直觉，
   行末继续按左右还会切换分组。
   输入框里的 ←→ 仍归光标（见 shouldSkip），这是可输入控件的天然约束。
   ========================================================================== */
export const NAV_ITEM = "[data-nav-item]";

export type NavDir = "up" | "down" | "left" | "right";

export type ArrowNavOptions = {
  enabled?: boolean;
  /** 可导航元素选择器，默认 [data-nav-item] */
  selector?: string;
  /** linear（默认，四个方向键等价走序列）/ grid（宫格的二维移动） */
  orientation?: "vertical" | "horizontal" | "grid";
  /** 到边界后是否环绕，默认 false（环绕时不触发 onExit） */
  loop?: boolean;
  /** 走到边界时触发，用于宫格左右切换分组 */
  onExit?: (dir: NavDir) => void;
  /**
   * 焦点不在容器内时，方向键是否直接落进容器首项。
   * 宫格靠它免去“必须先 Tab 进宫格”这一步。
   */
  autoEnter?: boolean;
  /** autoEnter 时额外允许“从这些元素出发”进入，例如 Dock 按钮、分页圆点 */
  enterFrom?: string;
  /**
   * 有面板/弹窗层级打开时整体不响应（设置面板、Modal、天气、日历）。
   * 宫格必须开：否则在设置页里按左右键会被背景里的宫格接走、把分组给切了。
   */
  blockWhenOverlay?: boolean;
};

function isVisible(el: HTMLElement) {
  return el.getClientRects().length > 0 && getComputedStyle(el).visibility !== "hidden";
}

const TEXT_INPUT_TYPES = new Set(["text", "search", "url", "email", "tel", "password", "number", ""]);
const VALUE_INPUT_TYPES = new Set(["date", "datetime-local", "month", "week", "time", "color", "file"]);
const ARROW_KEYS = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Home", "End"]);

/**
 * 焦点在表单控件时不抢按键：
 * - 多行文本、select、日期/颜色等取值控件完全不接管，保留原生行为
 * - 滑块只让出左右键（原生调值），上下键交给导航——否则焦点进了滑块就出不来
 * - 单行文本框只接管上下键，左右与 Home/End 留给光标移动
 */
function shouldSkip(active: HTMLElement, key: string) {
  if (active.isContentEditable) return true;
  const tag = active.tagName;
  if (tag === "TEXTAREA") return true;
  // 下拉框的上下键留给原生选项切换，左右键仍可用于导航（保证焦点出得来）
  if (tag === "SELECT") return key === "ArrowUp" || key === "ArrowDown";
  if (tag !== "INPUT") return false;
  const type = (active as HTMLInputElement).type;
  if (VALUE_INPUT_TYPES.has(type)) return true;
  // 单选/复选交给导航：原生 radio 组会把四个方向键全吃掉（表现为“怎么按都在切选项”），
  // 选中改用空格键——设置面板里每个引擎是一整行控件，方向键必须能走出来
  if (type === "radio" || type === "checkbox") return false;
  if (type === "range") return key === "ArrowLeft" || key === "ArrowRight";
  if (!TEXT_INPUT_TYPES.has(type)) return false;
  return key === "ArrowLeft" || key === "ArrowRight" || key === "Home" || key === "End";
}

/** 容器内可见的可导航项，按 DOM 顺序（= Tab 顺序） */
function collectNav(container: HTMLElement, selector: string) {
  return Array.from(container.querySelectorAll<HTMLElement>(selector)).filter(isVisible);
}

function moveTo(el: HTMLElement) {
  setKbdMode("arrow");
  el.focus({ preventScroll: true });
  el.scrollIntoView({ block: "nearest", inline: "nearest" });
}

function inferColumns(items: HTMLElement[], container: HTMLElement) {
  // 容器本身不是 grid 时（宫格传的是稳定外层，真正的网格是子元素），退一层找网格元素
  const gridEl = getComputedStyle(container).display.includes("grid") ? container : items[0]?.parentElement;
  if (gridEl) {
    const cs = getComputedStyle(gridEl);
    if (cs.display.includes("grid")) {
      const cols = cs.gridTemplateColumns.split(" ").filter(Boolean);
      if (cols.length > 1) return cols.length;
    }
  }
  if (!items.length) return 1;
  const firstTop = items[0].getBoundingClientRect().top;
  let n = 0;
  for (const it of items) {
    const r = it.getBoundingClientRect();
    if (Math.abs(r.top - firstTop) > 4) break;
    n += 1;
  }
  return Math.max(1, n);
}

/**
 * 容器内的方向键导航。监听挂在 document 上并每次动态读取 ref.current，
 * 这样分组切换 / AnimatePresence 重挂载后无需重新绑定。
 */
export function useArrowNavigation(ref: Ref, options: ArrowNavOptions = {}) {
  const {
    enabled = true,
    selector = NAV_ITEM,
    orientation = "vertical",
    loop = false,
    onExit,
    autoEnter = false,
    enterFrom,
    blockWhenOverlay = false,
  } = options;

  const optRef = useRef({ selector, orientation, loop, onExit, autoEnter, enterFrom, blockWhenOverlay });
  optRef.current = { selector, orientation, loop, onExit, autoEnter, enterFrom, blockWhenOverlay };

  useEffect(() => {
    if (!enabled) return;
    bindGlobal();

    function onKeyDown(e: KeyboardEvent) {
      const key = e.key;
      if (!ARROW_KEYS.has(key)) return;
      // 浮层（右键菜单、弹窗）内的导航已经处理过这次按键，不重复接管
      if (e.defaultPrevented) return;
      // 设置面板/弹窗打开时整个让位：背景里的宫格不该响应方向键
      if (optRef.current.blockWhenOverlay && hasLayerAtLeast(ESC_PRIORITY.panel)) return;

      const container = ref.current;
      if (!container) return;
      const active = document.activeElement as HTMLElement | null;
      // 焦点落在 body（刚打开宫格、或焦点被卸载掉）时也算“在这片区域外”
      const detached = !active || active === document.body || active === document.documentElement;
      if (active && !container.contains(active)) {
        const { autoEnter: canEnter, enterFrom: from } = optRef.current;
        if (!canEnter) return;
        // 设置面板/弹窗打开时焦点可能掉到 body，此时不该把焦点抢回宫格
        if (detached && hasLayerAtLeast(ESC_PRIORITY.panel)) return;
        const allowed = detached || (from ? !!active.closest(from) : false);
        if (!allowed) return;
      }
      if (!detached && active && shouldSkip(active, key)) return;

      const { selector: sel, orientation: dirMode, loop: wrap, onExit: exit } = optRef.current;
      const items = Array.from(container.querySelectorAll<HTMLElement>(sel)).filter(isVisible);
      if (items.length === 0) return;

      // 从页面空白处直接按方向键进入：免去先 Tab 到宫格
      if (detached) {
        e.preventDefault();
        setKbdMode("arrow");
        const entry = key === "End" || key === "ArrowUp" ? items[items.length - 1] : items[0];
        entry.focus({ preventScroll: true });
        entry.scrollIntoView({ block: "nearest", inline: "nearest" });
        return;
      }

      const current = items.indexOf(active);
      const last = items.length - 1;
      let next = -1;
      let boundary: NavDir | null = null;

      const stepVertical = (delta: number, dir: NavDir) => {
        if (current === -1) return delta > 0 ? 0 : last;
        const t = current + delta;
        if (t < 0 || t > last) {
          boundary = dir;
          return wrap ? (t < 0 ? last : 0) : -1;
        }
        return t;
      };

      if (key === "Home") next = 0;
      else if (key === "End") next = last;
      else if (dirMode === "grid") {
        // 宫格：按屏幕上的二维网格移动
        const cols = Math.max(1, inferColumns(items, container));
        if (key === "ArrowRight") next = stepVertical(1, "right");
        else if (key === "ArrowLeft") next = stepVertical(-1, "left");
        else if (key === "ArrowDown") next = stepVertical(cols, "down");
        else next = stepVertical(-cols, "up");
      } else {
        // 统一规则：↑/← 上一个，↓/→ 下一个
        if (key === "ArrowDown" || key === "ArrowRight") next = stepVertical(1, key === "ArrowDown" ? "down" : "right");
        else if (key === "ArrowUp" || key === "ArrowLeft") next = stepVertical(-1, key === "ArrowUp" ? "up" : "left");
      }

      if (next === -1 || next === current) {
        if (boundary && exit) {
          e.preventDefault();
          exit(boundary);
        }
        return;
      }

      e.preventDefault();
      setKbdMode("arrow");
      const target = items[next];
      target.focus({ preventScroll: true });
      target.scrollIntoView({ block: "nearest", inline: "nearest" });
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [ref, enabled]);
}

/** 容器内可见的导航项；取首/末项，用于跨容器或打开下拉时落焦 */
function edgeNavItem(ref: Ref, selector: string, last: boolean) {
  const container = ref.current;
  if (!container) return null;
  const list = Array.from(container.querySelectorAll<HTMLElement>(selector)).filter(isVisible);
  if (list.length === 0) return null;
  return list[last ? list.length - 1 : 0];
}

/** 聚焦容器内第一个可导航项，用于宫格切换分组后把焦点落到新分组首项 */
export function focusFirstNavItem(ref: Ref, selector = NAV_ITEM) {
  const el = edgeNavItem(ref, selector, false);
  if (el) moveTo(el);
}

/** 聚焦容器内最后一个可导航项，例如输入框按 ↑ 直接落到下拉末项 */
export function focusLastNavItem(ref: Ref, selector = NAV_ITEM) {
  const el = edgeNavItem(ref, selector, true);
  if (el) moveTo(el);
}

/* ============================================================================
   双栏导航：设置面板这类「侧栏 + 内容区」布局
   遵循与全站相同的统一规则：侧栏与内容区拼成一条序列，↓/→ 下一个、↑/← 上一个；
   走到侧栏末项继续按 ↓/→ 就进内容区，回到内容区首项按 ↑/← 就回侧栏，
   不存在「右键进内容区 / 左键回侧栏」这种只在双栏成立的专属键。
   焦点在面板内其它位置（关闭按钮、空白处）时，方向键直接落进侧栏，免去先 Tab。
   ========================================================================== */
export type PaneNavOptions = {
  enabled?: boolean;
  /** 侧栏容器与选择器（默认 [data-nav-item]） */
  side: { ref: Ref; selector?: string };
  /** 内容区容器与选择器 */
  main: { ref: Ref; selector?: string };
  /** 焦点不在两侧时，方向键是否直接落进面板 */
  autoEnter?: boolean;
  /** autoEnter 的判定范围：焦点必须在此容器（面板根）内，弹窗/页面其它区域不抢键 */
  root?: Ref;
  /** 侧栏内是否环绕，默认 false */
  loop?: boolean;
  /**
   * 侧栏焦点移动时是否立即激活（等同于点击该分类）。
   * 设置侧栏用 true：焦点走到哪、内容区就显示哪，不会出现“高亮 A 却显示 B”。
   */
  activateSide?: boolean;
};

export function usePaneNavigation(options: PaneNavOptions) {
  const { enabled = true, side, main, autoEnter = false, root, loop = false, activateSide = false } = options;

  const optRef = useRef({ side, main, autoEnter, root, loop, activateSide });
  optRef.current = { side, main, autoEnter, root, loop, activateSide };
  // 上一次成功落焦在「侧栏+内容」拼成序列里的位置，焦点被内容区卸载弄丢后按它恢复
  const lastPos = useRef(-1);
  // 最近一次侧栏切换分类：时间戳 + 当时内容区首项。内容真的换新了就不必再等
  const lastSwitch = useRef<{ at: number; first: HTMLElement | null }>({ at: 0, first: null });
  // 进行中的移动：等待内容区切换时（约一帧到几百毫秒），
  // 后续按键累加到它的步数上，而不是各自排队互相抢焦点
  const pendingNav = useRef<{ push: (d: number) => void } | null>(null);

  useEffect(() => {
    if (!enabled) return;
    bindGlobal();

    function onKeyDown(e: KeyboardEvent) {
      const key = e.key;
      if (!ARROW_KEYS.has(key)) return;
      if (e.defaultPrevented) return;

      const o = optRef.current;
      const sideEl = o.side.ref.current;
      const mainEl = o.main.ref.current;
      if (!sideEl || !mainEl) return;
      const sideSel = o.side.selector ?? NAV_ITEM;
      const mainSel = o.main.selector ?? NAV_ITEM;

      const active = document.activeElement as HTMLElement | null;
      const detached = !active || active === document.body || active === document.documentElement;
      // 归属用 contains 判定：内容区里刚挂载、还没被序列收录的元素也算“面板内”，
      // 否则会被当成面板外焦点，一次按键就把人拉回侧栏
      const inSide = !!active && sideEl.contains(active);
      const inMain = !!active && mainEl.contains(active);

      // 焦点不在两侧：面板刚打开落在关闭按钮，或被内容卸载掉到 body
      if (!inSide && !inMain) {
        if (!o.autoEnter) return;
        const rootEl = o.root?.current;
        if (!detached && active && rootEl && !rootEl.contains(active)) return;
        // 弹窗/菜单叠在面板之上时（焦点可能掉到 body），不抢它们的方向键
        if (detached && hasLayerAtLeast(ESC_PRIORITY.modal)) return;
      }
      if (!detached && active && shouldSkip(active, key)) return;

      /**
       * 序列内的一次移动：↓/→ 下一个、↑/← 上一个，Home/End 首末项。
       * 侧栏与内容区拼成一条序列（DOM 顺序 = Tab 顺序），走到侧栏末项自然进入内容区。
       */
      const navigate = (start: number, jump: null | "home" | "end") => {
        let delta = start;
        // 目标序号算一次就记下来，重试时沿用它；
        // 否则每帧按“当前焦点 + delta”重算，会在切换动画里连跳好几格
        let wanted = 0;
        let hasWanted = false;
        let switched = false;
        let tries = 0;
        let done = false;

        // 本次移动的基准位置
        const baseIndex = (seq: HTMLElement[], sList: HTMLElement[]) => {
          const live = document.activeElement;
          if (live && seq.includes(live as HTMLElement)) return seq.indexOf(live as HTMLElement);
          // 焦点被卸载（回到 body）时从上次位置接着走，而不是退回首项
          if (lastPos.current >= 0 && lastPos.current < seq.length) return lastPos.current;
          const curTab = sideEl.querySelector<HTMLElement>('[aria-current="true"]');
          const i = curTab ? sList.indexOf(curTab) : -1;
          return i >= 0 ? i : 0;
        };

        // 登记为“进行中的移动”：等待内容区切换期间到达的按键累加到它的步数上，
        // 各自排队只会互相抢焦点，表现为“按了好几次才动一下”
        const handle = {
          push: (d: number) => {
            delta += d;
            if (hasWanted) wanted += d;
          },
        };
        pendingNav.current = handle;

        /**
         * 落焦并在下一帧确认站得住。
         * 切换分类时旧内容要走 exit 动画才卸载，此刻算出来的目标可能马上消失，
         * 焦点跟着掉到 body —— 下一次按键就会被当成“面板外”，把用户拽回侧栏。
         */
        const land = (target: HTMLElement, idx: number, retry: () => void) => {
          moveTo(target);
          lastPos.current = idx;
          requestAnimationFrame(() => {
            if (done) return;
            if (document.activeElement === target && document.contains(target)) {
              done = true;
              if (pendingNav.current === handle) pendingNav.current = null;
              return;
            }
            retry();
          });
        };

        const attempt = () => {
          if (done || pendingNav.current !== handle || ++tries > 60) return;
          const sList = collectNav(sideEl, sideSel);
          const mList = collectNav(mainEl, mainSel);
          const seq = [...sList, ...mList];
          if (seq.length === 0) return requestAnimationFrame(attempt);
          if (jump === null && !hasWanted) {
            wanted = baseIndex(seq, sList) + delta;
            hasWanted = true;
          }

          // 目标是内容区时必须等它稳定：exit 动画期间旧内容还在但马上被卸载，
          // 此刻算出来的目标会跟着消失。内容首项一换新就放行，不必死等动画。
          const wantMain = jump ? jump === "end" : wanted >= sList.length;
          if (wantMain) {
            const sw = lastSwitch.current;
            const changed = !sw.first || (mList.length > 0 && mList[0] !== sw.first);
            if (mList.length === 0 || (!changed && performance.now() - sw.at < 400)) {
              return requestAnimationFrame(attempt);
            }
          }

          let idx: number;
          if (jump) idx = jump === "home" ? 0 : seq.length - 1;
          else if (o.loop && (wanted < 0 || wanted > seq.length - 1)) {
            const len = seq.length;
            idx = ((wanted % len) + len) % len;
          } else {
            // 走到边界就停在首/末项，不做“按键没反应”这种含糊的处理
            idx = Math.min(Math.max(wanted, 0), seq.length - 1);
          }

          const el = seq[idx];
          const isSide = sList.includes(el);
          // 侧栏会切换分类：先把内容切到位再落焦，避免焦点先挂上去又被动画卸载
          if (isSide && o.activateSide && !switched && el.getAttribute("aria-current") !== "true") {
            switched = true;
            lastSwitch.current = { at: performance.now(), first: mList[0] ?? null };
            el.click();
            return requestAnimationFrame(attempt);
          }
          land(el, idx, () => requestAnimationFrame(attempt));
        };
        attempt();
      };

      const jump = key === "Home" ? ("home" as const) : key === "End" ? ("end" as const) : null;
      const dir = key === "ArrowDown" || key === "ArrowRight" ? 1 : key === "ArrowUp" || key === "ArrowLeft" ? -1 : 0;
      const pending = pendingNav.current;

      e.preventDefault();
      // Home/End 语义独立：作废还没落地的逐步移动，重新瞄准首/末项
      if (jump) {
        pendingNav.current = null;
        navigate(0, jump);
        return;
      }
      // 上一次移动还在等内容区切换，这期间的按键累加到它的步数上
      if (pending) {
        pending.push(dir);
        return;
      }
      // 焦点在面板其它位置（关闭按钮等）时先落到当前分类上，不额外前进一格
      navigate(inSide || inMain ? dir : 0, null);
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      // 面板关闭复位，下次打开从当前分类重新开始
      pendingNav.current = null;
      lastPos.current = -1;
    };
  }, [enabled]);
}

