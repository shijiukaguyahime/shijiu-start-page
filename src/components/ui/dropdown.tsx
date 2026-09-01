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
  selectedKey?: string;
  id?: string;
  ariaLabel?: string;
};

/** portal 到 body，避免被父级 transform 截获 fixed */
export function DropdownMenu({ open, onClose, items, anchor, className, selectedKey, id, ariaLabel }: Props) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useClickOutside(ref as React.RefObject<HTMLElement | null>, () => onClose(), open);

  useLayoutEffect(() => {
    if (!open || !ref.current) return;
    const tryFocus = () => {
      if (!ref.current) return;
      const escape = typeof CSS !== "undefined" && CSS.escape ? CSS.escape : (s: string) => s.replace(/"/g, '\\"');
      const key = selectedKey ?? items[0]?.key;
      if (!key) return;
      const el = ref.current.querySelector<HTMLElement>(`[data-key="${escape(key)}"]`);
      if (el) {
        el.focus();
        el.scrollIntoView({ block: "nearest", inline: "nearest" });
      }
    };
    // 等待定位与动画后聚焦
    const id = requestAnimationFrame(() => requestAnimationFrame(tryFocus));
    return () => cancelAnimationFrame(id);
  }, [open, selectedKey, items]);

  useLayoutEffect(() => {
    if (!open || !anchor) {
      setPos(null);
      return;
    }
    const rawLeft = anchor.x + 8;
    const rawTop = anchor.y + 8;
    setPos({ left: rawLeft, top: rawTop });

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
      left = Math.min(Math.max(pad, left), window.innerWidth - rect.width - pad);
      top = Math.min(Math.max(pad, top), window.innerHeight - rect.height - pad);
      setPos({ left, top });
    });
  }, [open, anchor]);

  if (!mounted) return null;

  const node = (
    <AnimatePresence>
      {open && anchor && (
          <motion.div
            ref={ref}
            id={id}
            role="menu"
            aria-label={ariaLabel ?? "下拉菜单"}
            aria-orientation="vertical"
            tabIndex={-1}
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
            onKeyDown={(e) => {
              const target = e.currentTarget as HTMLElement;
              const items = Array.from(target.querySelectorAll<HTMLElement>('[role="menuitem"]'));
              const idx = items.indexOf(document.activeElement as HTMLElement);
              if (e.key === "ArrowDown") {
                e.preventDefault();
                const next = items[(idx + 1) % items.length] ?? items[0];
                next?.focus();
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                const prev = items[(idx - 1 + items.length) % items.length] ?? items[items.length - 1];
                prev?.focus();
              } else if (e.key === "Home") {
                e.preventDefault();
                items[0]?.focus();
              } else if (e.key === "End") {
                e.preventDefault();
                items[items.length - 1]?.focus();
              } else if (e.key === "Escape") {
                e.preventDefault();
                onClose();
              }
            }}
            className={cn(
              "dropdown-panel gpu max-h-[min(60vh,340px)] w-[168px] overflow-y-auto overscroll-contain rounded-2xl p-1.5",
              className,
            )}
          >
          <ul className="space-y-0.5">
            {items.map((it) => {
              const isSelected = selectedKey != null && it.key === selectedKey;
              return (
                <li key={it.key} role="none">
                  <button
                    type="button"
                    role="menuitem"
                    data-key={it.key}
                    aria-current={isSelected ? "true" : undefined}
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
                      isSelected
                        ? "bg-zinc-900 text-white hover:bg-zinc-900 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
                        : it.danger
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
              );
            })}
          </ul>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(node, document.body);
}

/** 内联版下拉 */
export function InlineDropdown({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("dropdown-panel gpu overflow-hidden rounded-2xl p-1.5", className)}>{children}</div>;
}
