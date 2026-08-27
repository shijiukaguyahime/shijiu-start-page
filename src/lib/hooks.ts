"use client";

import { useEffect, useRef } from "react";

type Ref = React.RefObject<HTMLElement | null>;

/**
 * 统一的点击外部关闭 hook
 * - 监听 mousedown/touchstart，判定 target 是否在 ref(s) 之外
 * - 支持 Escape 关闭
 * - enabled=false 时不监听，适合受控显隐
 * 设计要点：handler 通过 ref 保持最新，避免闭包过期；监听在 capture 前的 bubble 阶段，配合组件内 e.stopPropagation() 可精确控制冒泡
 */
export function useClickOutside(
  refs: Ref | Ref[],
  handler: (e?: MouseEvent | TouchEvent | KeyboardEvent) => void,
  enabled = true,
  options?: { ignoreSelectors?: string[] },
) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!enabled) return;

    const list = Array.isArray(refs) ? refs : [refs];

    function isInside(target: Node) {
      return list.some((r) => r.current && r.current.contains(target));
    }

    function isIgnored(target: Node) {
      if (!(target instanceof HTMLElement)) return false;
      const sels = options?.ignoreSelectors;
      if (!sels || sels.length === 0) return false;
      return sels.some((sel) => target.closest(sel));
    }

    function onPointerDown(e: MouseEvent | TouchEvent) {
      const target = e.target as Node | null;
      if (!target) return;
      if (isInside(target)) return;
      if (isIgnored(target)) return;
      handlerRef.current(e);
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") handlerRef.current(e);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown, { passive: true });
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [refs, enabled, options?.ignoreSelectors?.join(",")]);
}

/**
 * 单独的 Escape 监听，便于无外部点击需求的场景
 */
export function useEscapeKey(handler: () => void, enabled = true) {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    if (!enabled) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") ref.current();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [enabled]);
}

/**
 * 青柠起始页风格的下拉动效参数
 * - 与页面其他 AnimatePresence 保持同曲线 [0.22,1,0.36,1]
 * - 含轻微位移 + 缩放 + 模糊，避免生硬的 opacity only
 */
export const limeDropdownMotion = {
  initial: { opacity: 0, y: 6, scale: 0.97, filter: "blur(6px)" } as unknown as Record<string, unknown>,
  animate: { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" } as unknown as Record<string, unknown>,
  exit: { opacity: 0, y: 4, scale: 0.97, filter: "blur(4px)" } as unknown as Record<string, unknown>,
  transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] } as unknown as Record<string, unknown>,
};
