"use client";

import { motion, useReducedMotion } from "motion/react";
import { SquaresFourIcon } from "@phosphor-icons/react";
import { DOCK_SHORTCUTS } from "@/lib/data";

/**
 * 底部 Dock：矩形圆角（外框与内部图标同一圆角体系），最左为"全部"菜单按钮
 * 点击触发宫格（与右键壁纸一致），事件已做冒泡隔离
 */
export function DockBar({ isGridOpen, onToggleGrid }: { isGridOpen: boolean; onToggleGrid: () => void }) {
  const reduce = useReducedMotion();

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-2.5 z-30 flex justify-center px-2">
      <motion.nav
        initial={reduce ? false : { y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
        aria-label="快捷方式 Dock 栏"
        className="pointer-events-auto flex max-w-[calc(100vw-16px)] items-center gap-2 overflow-x-auto overflow-y-visible rounded-[18px] glass-dock p-2 [-ms-overflow-style:none] [scrollbar-width:none] md:gap-2.5 md:overflow-visible [&::-webkit-scrollbar]:hidden"
      >
        {/* 全部菜单按钮（最左） */}
        <div className="group/dock relative flex shrink-0">
          <button
            type="button"
            aria-label={isGridOpen ? "返回首页" : "打开全部"}
            aria-haspopup="dialog"
            aria-expanded={isGridOpen}
            onClick={onToggleGrid}
            className={`flex size-10 shrink-0 items-center justify-center rounded-xl shadow-sm transition-all active:scale-[0.95] ${isGridOpen ? "bg-white text-zinc-900 hover:bg-zinc-100" : "bg-zinc-900 text-white hover:bg-zinc-700"}`}
          >
            <SquaresFourIcon weight="bold" className="size-5" aria-hidden />
          </button>
          <div className="pointer-events-none absolute bottom-[calc(100%+10px)] left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-zinc-900 px-2.5 py-1 text-xs font-medium text-white opacity-0 shadow-[0_4px_16px_rgba(0,0,0,0.2)] transition-all duration-200 group-hover/dock:translate-y-0 translate-y-1 group-hover/dock:opacity-100">
            {isGridOpen ? "返回首页" : "全部"}
          </div>
        </div>

        <span className="mx-0.5 h-6 w-px shrink-0 bg-zinc-900/10" aria-hidden />

        {/* 快捷图标 */}
        {DOCK_SHORTCUTS.map((item) => (
          <DockIcon key={item.id} id={item.id} name={item.name} url={item.url} color={item.color} />
        ))}
      </motion.nav>
    </div>
  );
}

function DockIcon({
  id,
  name,
  url,
  color,
}: {
  id: string;
  name: string;
  url: string;
  color?: string;
}) {
  const domain = (() => {
    try {
      return new URL(url).hostname;
    } catch {
      return "";
    }
  })();
  const favicon = domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=64` : null;

  return (
    <div className="group/dock relative flex shrink-0">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${name}，在新标签页打开`}
        className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/85 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:bg-white hover:shadow-md active:scale-[0.95]"
      >
        {favicon ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={favicon}
            alt=""
            width={20}
            height={20}
            loading="lazy"
            className="size-[20px] rounded object-contain"
            onError={(e) => {
              const t = e.target as HTMLImageElement;
              t.style.display = "none";
              const sib = t.nextElementSibling as HTMLElement | null;
              if (sib) sib.style.display = "flex";
            }}
          />
        ) : null}
        <span
          style={{ display: favicon ? "none" : "flex", background: color ?? "#18181b" }}
          className="hidden size-7 items-center justify-center rounded-lg text-xs font-bold text-white"
          aria-hidden
        >
          {name.charAt(0)}
        </span>
      </a>
      <div className="pointer-events-none absolute bottom-[calc(100%+10px)] left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-zinc-900 px-2.5 py-1 text-xs font-medium text-white opacity-0 shadow-[0_4px_16px_rgba(0,0,0,0.2)] transition-all duration-200 group-hover/dock:translate-y-0 translate-y-1 group-hover/dock:opacity-100">
        {name}
      </div>
    </div>
  );
}
