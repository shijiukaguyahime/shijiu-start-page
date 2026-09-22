"use client";

import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { XIcon } from "@phosphor-icons/react";
import { useBodyScrollLock, useFocusTrap } from "@/lib/hooks";
import { ESC_PRIORITY, useArrowNavigation, useEscapeLayer } from "@/lib/keyboard";

/** 弹窗内参与方向键导航的元素：表单控件与按钮（隐藏的 file input 会被可见性过滤掉） */
const MODAL_NAV_SELECTOR =
  "input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), a[href], [data-nav-item]";

type Props = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: number | string;
};

export function Modal({ open, onClose, title, children, footer, width = 440 }: Props) {
  const reduce = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);
  const uid = useId();

  // Esc 走层栈：设置面板上叠弹窗时只关弹窗，不会连带关掉设置
  useEscapeLayer(`modal-${uid}`, open, onClose, ESC_PRIORITY.modal);
  useBodyScrollLock(open);
  // Tab 不再跑出弹窗（注意必须在下方 autofocus 之前注册，这样表单弹窗的最终焦点仍落在输入框）
  useFocusTrap(panelRef as React.RefObject<HTMLElement | null>, open);

  // Esc 兜底：全局层栈处理过 Esc 时会 preventDefault，这里不会重复触发；
  // 万一层栈因故没接管，最上层的弹窗仍能关掉，不会出现「按 Esc 没反应」。
  // 判定用 DOM 里最后一个 dialog，天然只关最上层。
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      const panel = panelRef.current;
      if (!panel) return;
      const nodes = document.querySelectorAll<HTMLElement>('[role="dialog"][aria-modal="true"]');
      if (nodes[nodes.length - 1] !== panel) return;
      e.preventDefault();
      onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // 弹窗内上下键/左右键等价：在表单控件、头部关闭按钮与底部按钮间移动焦点
  // （含“添加自定义搜索引擎”这类表单弹窗）。输入框的 ←→ 仍留给光标，
  // 多行文本与下拉框保持原生行为。
  useArrowNavigation(panelRef, { enabled: open, orientation: "vertical", selector: MODAL_NAV_SELECTOR });

  // 自动聚焦：data-autofocus > 输入框 > 首个可聚焦元素
  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => {
      const el = panelRef.current;
      if (!el) return;
      const focusable =
        el.querySelector<HTMLElement>("[data-autofocus]") ??
        el.querySelector<HTMLElement>("input:not([disabled]), textarea:not([disabled])") ??
        el.querySelector<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      (focusable ?? el).focus();
    });
    return () => cancelAnimationFrame(id);
  }, [open]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div data-modal className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/30"
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={title ?? "对话框"}
            tabIndex={-1}
            initial={
              reduce ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.98, filter: "blur(6px)" }
            }
            animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
            exit={
              reduce ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.98, filter: "blur(4px)" }
            }
            transition={
              reduce
                ? ({ duration: 0.16 } as unknown as never)
                : ({ duration: 0.28, ease: [0.16, 1, 0.3, 1] } as unknown as never)
            }
            style={{ width: typeof width === "number" ? `${width}px` : width, maxWidth: "calc(100vw - 32px)" }}
            className="gpu glass-panel relative flex max-h-[min(86vh,640px)] w-full flex-col overflow-hidden rounded-[20px] shadow-[0_24px_64px_rgba(0,0,0,0.22)] outline-none"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between bg-white px-5 py-4 dark:bg-zinc-800">
              {title ? (
                <h2 className="pr-2 text-[15px] font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                  {title}
                </h2>
              ) : (
                <span />
              )}
              <button
                type="button"
                aria-label="关闭"
                onClick={onClose}
                className="flex size-8 shrink-0 items-center justify-center rounded-full bg-zinc-900/5 text-zinc-500 transition-colors hover:bg-zinc-900/10 hover:text-zinc-900 dark:bg-white/10 dark:text-zinc-400 dark:hover:bg-white/15 dark:hover:text-zinc-100"
              >
                <XIcon weight="bold" className="size-4" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto bg-white px-5 py-3 dark:bg-zinc-900 md:px-6 md:py-4">
              {children}
            </div>
            {footer && (
              <div className="flex shrink-0 items-center justify-end gap-2 bg-white px-5 py-3 dark:bg-zinc-800">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
