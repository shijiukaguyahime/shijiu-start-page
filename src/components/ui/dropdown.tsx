"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { limeDropdownMotion, useClickOutside } from "@/lib/hooks";
import { cn } from "@/lib/utils";

export type DropdownItem = {
  key: string;
  label: string;
  icon?: React.ReactNode;
  danger?: boolean;
  onClick: () => void;
};

type Props = {
  open: boolean;
  onClose: () => void;
  items: DropdownItem[];
  anchor: { x: number; y: number } | null;
  className?: string;
};

/**
 * 公共下拉菜单 — 复用 search-box / hitokoto 的 dropdown-panel 视觉
 * - portal 到 body，避免被父级 transform 截获 fixed
 * - 以 anchor (clientX,clientY) 为锚点，自动防溢出
 * - 动画复用 limeDropdownMotion
 */
export function DropdownMenu({ open, onClose, items, anchor, className }: Props) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useClickOutside(ref as React.RefObject<HTMLElement | null>, () => onClose(), open);

  useLayoutEffect(() => {
    if (!open || !anchor) {
      setPos(null);
      return;
    }
    // 初次定位：锚点右下方 8px
    const rawLeft = anchor.x + 8;
    const rawTop = anchor.y + 8;
    setPos({ left: rawLeft, top: rawTop });

    // 下一帧校正溢出
    requestAnimationFrame(() => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      let left = rawLeft;
      let top = rawTop;
      const pad = 12;
      if (left + rect.width > window.innerWidth - pad) {
        left = Math.max(pad, anchor.x - rect.width - 8);
      }
      if (top + rect.height > window.innerHeight - pad) {
        top = Math.max(pad, anchor.y - rect.height - 8);
      }
      // 边界兜底
      left = Math.min(Math.max(pad, left), window.innerWidth - rect.width - pad);
      top = Math.min(Math.max(pad, top), window.innerHeight - rect.height - pad);
      setPos({ left, top });
    });
  }, [open, anchor]);

  // 失焦 esc 已由 useClickOutside 处理

  if (!mounted) return null;

  const node = (
    <AnimatePresence>
      {open && anchor && (
        <motion.div
          ref={ref}
          role="menu"
          initial={reduce ? { opacity: 0 } : (limeDropdownMotion.initial as unknown as never)}
          animate={reduce ? { opacity: 1 } : (limeDropdownMotion.animate as unknown as never)}
          exit={reduce ? { opacity: 0 } : (limeDropdownMotion.exit as unknown as never)}
          transition={
            reduce ? ({ duration: 0.14 } as unknown as never) : (limeDropdownMotion.transition as unknown as never)
          }
          style={{
            position: "fixed",
            left: pos?.left ?? anchor.x + 8,
            top: pos?.top ?? anchor.y + 8,
            transformOrigin: "top left",
            zIndex: 70,
            visibility: pos ? "visible" : "hidden",
          }}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "dropdown-panel gpu max-h-[min(60vh,340px)] w-[168px] overflow-y-auto overscroll-contain rounded-2xl p-1.5",
            className,
          )}
        >
          <ul className="space-y-0.5">
            {items.map((it) => (
              <li key={it.key} role="none">
                <button
                  type="button"
                  role="menuitem"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    it.onClick();
                    onClose();
                  }}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm font-medium transition-colors",
                    it.danger
                      ? "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                      : "text-zinc-700 hover:bg-zinc-900/5 dark:text-zinc-300 dark:hover:bg-white/10 dark:hover:text-zinc-100",
                  )}
                >
                  {it.icon && (
                    <span
                      className={cn(
                        "flex size-7 shrink-0 items-center justify-center rounded-full",
                        it.danger ? "bg-red-500/10 text-red-600 dark:bg-red-500/15 dark:text-red-400" : "bg-zinc-900/5 text-zinc-600 dark:bg-white/10 dark:text-zinc-300",
                      )}
                      aria-hidden
                    >
                      {it.icon}
                    </span>
                  )}
                  {it.label}
                </button>
              </li>
            ))}
          </ul>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(node, document.body);
}

/**
 * 内联版下拉（用于非 portal 场景，如搜索框内）— 保留同视觉但不使用 portal
 * 仅提供样式复用，逻辑由调用方自理
 */
export function InlineDropdown({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("dropdown-panel gpu overflow-hidden rounded-2xl p-1.5", className)}>{children}</div>;
}
