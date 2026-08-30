"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { XIcon } from "@phosphor-icons/react";
import { useEscapeKey } from "@/lib/hooks";

type Props = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: number | string;
  closeOnOverlay?: boolean;
  hideClose?: boolean;
};

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  width = 440,
  closeOnOverlay = true,
  hideClose = false,
}: Props) {
  const reduce = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);

  useEscapeKey(onClose, open);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // 自动聚焦关闭按钮或面板
  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => {
      const el = panelRef.current;
      if (!el) return;
      const focusable = el.querySelector<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
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
            onClick={() => {
              if (closeOnOverlay) onClose();
            }}
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
            {(title || !hideClose) && (
              <div className="flex shrink-0 items-center justify-between bg-white px-5 py-4 dark:bg-zinc-800">
                {title ? (
                  <h2 className="pr-2 text-[15px] font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                    {title}
                  </h2>
                ) : (
                  <span />
                )}
                {!hideClose && (
                  <button
                    type="button"
                    aria-label="关闭"
                    onClick={onClose}
                    className="flex size-8 shrink-0 items-center justify-center rounded-full bg-zinc-900/5 text-zinc-500 transition-colors hover:bg-zinc-900/10 hover:text-zinc-900 dark:bg-white/10 dark:text-zinc-400 dark:hover:bg-white/15 dark:hover:text-zinc-100"
                  >
                    <XIcon weight="bold" className="size-4" />
                  </button>
                )}
              </div>
            )}
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
