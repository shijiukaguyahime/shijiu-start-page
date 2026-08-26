"use client";

import { useEffect, useRef } from "react";
import { motion, useReducedMotion } from "motion/react";
import { XIcon } from "@phosphor-icons/react";
import { DEFAULT_GROUPS, type Shortcut } from "@/lib/data";

type Props = {
  open: boolean;
  onClose: () => void;
};

function Favicon({ shortcut }: { shortcut: Shortcut }) {
  const domain = (() => {
    try {
      return new URL(shortcut.url).hostname;
    } catch {
      return "";
    }
  })();
  const src = domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=64` : null;
  return (
    <span
      className="flex size-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white"
      style={{ background: shortcut.color ?? "#3f3f46" }}
      aria-hidden
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          width={18}
          height={18}
          loading="lazy"
          className="size-[18px] rounded object-contain"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      ) : (
        shortcut.name.charAt(0)
      )}
    </span>
  );
}

/**
 * 全部快捷方式面板：Dock 最左菜单按钮触发，玻璃卡片 + 分组列表
 */
export function MenuPanel({ open, onClose }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && panelRef.current) {
        const items = Array.from(
          panelRef.current.querySelectorAll<HTMLElement>('button, [href]')
        );
        if (items.length === 0) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 背景遮罩 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
        className="absolute inset-0 bg-zinc-950/30 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      {/* 面板 */}
      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="全部快捷方式"
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        className="relative flex max-h-[72vh] w-full max-w-[560px] flex-col overflow-hidden rounded-[22px] glass-panel"
      >
        {/* 关闭按钮：右上角悬浮于内容上方 */}
        <button
          ref={closeRef}
          type="button"
          aria-label="关闭"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 flex size-9 items-center justify-center rounded-xl text-zinc-500 transition-colors hover:bg-zinc-900/5 hover:text-zinc-900 active:scale-[0.96]"
        >
          <XIcon weight="bold" className="size-4" aria-hidden />
        </button>

        {/* 分组列表 */}
        <div className="flex-1 space-y-6 overflow-y-auto px-6 pb-6 pt-6">
          {DEFAULT_GROUPS.map((group) => (
            <section key={group.id}>
              <h2 className="mb-2.5 text-xs font-semibold tracking-wide text-zinc-500">
                {group.title}
              </h2>
              <ul className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                {group.shortcuts.map((s) => (
                  <li key={s.id}>
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={onClose}
                      title={s.name}
                      className="flex min-h-12 items-center gap-2.5 rounded-xl bg-white/60 px-2.5 py-2 transition-all hover:bg-white hover:shadow-sm active:scale-[0.98]"
                    >
                      <Favicon shortcut={s} />
                      <span className="min-w-0 truncate text-[13px] font-medium text-zinc-700">
                        {s.name}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
