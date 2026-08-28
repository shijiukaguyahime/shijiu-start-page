"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { SquaresFourIcon, ImageIcon, GearIcon, SunIcon, MoonIcon, MagnifyingGlassIcon, TranslateIcon, MonitorIcon } from "@phosphor-icons/react";

/**
 * 底部 Dock：矩形圆角（外框与内部图标同一圆角体系），最左为"全部"菜单按钮
 * 点击触发宫格（与右键壁纸一致），事件已做冒泡隔离
 */
export function DockBar({
  isGridOpen,
  onToggleGrid,
  onOpenSettings,
}: {
  isGridOpen: boolean;
  onToggleGrid: () => void;
  onOpenSettings?: (tab?: string) => void;
}) {
  const reduce = useReducedMotion();

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-2.5 z-30 flex justify-center px-2">
      <motion.nav
        initial={reduce ? false : { y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
        aria-label="快捷方式 Dock 栏"
        className="pointer-events-auto flex max-w-[calc(100vw-16px)] items-center gap-2 overflow-visible rounded-[18px] glass-dock p-2 md:gap-2.5 [&::-webkit-scrollbar]:hidden"
        style={{ scrollbarWidth: "none" } as React.CSSProperties}
      >
        {/* 图标（展开收起） */}
        <div className="group/dock relative flex shrink-0">
          <button
            type="button"
            aria-label={isGridOpen ? "返回首页" : "图标"}
            aria-haspopup="dialog"
            aria-expanded={isGridOpen}
            onClick={onToggleGrid}
            className={`flex size-10 shrink-0 items-center justify-center rounded-xl shadow-sm transition-all active:scale-[0.95] ${isGridOpen ? "bg-white text-zinc-900 hover:bg-zinc-100 dark:bg-zinc-700 dark:text-white" : "bg-zinc-900 text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"}`}
          >
            <SquaresFourIcon weight="bold" className="size-5" aria-hidden />
          </button>
          <div className="pointer-events-none absolute bottom-[calc(100%+10px)] left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-zinc-900 px-2.5 py-1 text-xs font-medium text-white opacity-0 shadow-[0_4px_16px_rgba(0,0,0,0.2)] transition-all duration-200 ease-[var(--spring)] group-hover/dock:translate-y-0 translate-y-1 group-hover/dock:opacity-100 dark:bg-white dark:text-zinc-900">
            {isGridOpen ? "返回首页" : "图标"}
          </div>
        </div>

        <span className="mx-0.5 h-6 w-px shrink-0 bg-zinc-900/10 dark:bg-white/15" aria-hidden />

        {/* 翻译 */}
        <div className="group/dock relative flex shrink-0">
          <button
            type="button"
            aria-label="翻译"
            onClick={() => window.open("https://fanyi.baidu.com", "_blank", "noopener")}
            className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/85 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:bg-white hover:shadow-md active:scale-[0.95] dark:bg-zinc-800/85 dark:hover:bg-zinc-700"
          >
            <span className="flex size-7 items-center justify-center rounded-full bg-white text-xs font-bold text-zinc-700 shadow-sm ring-1 ring-black/5 dark:bg-zinc-700 dark:text-zinc-200 dark:ring-white/10">译</span>
          </button>
          <div className="pointer-events-none absolute bottom-[calc(100%+10px)] left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-zinc-900 px-2.5 py-1 text-xs font-medium text-white opacity-0 shadow-[0_4px_16px_rgba(0,0,0,0.2)] transition-all duration-200 ease-[var(--spring)] group-hover/dock:translate-y-0 translate-y-1 group-hover/dock:opacity-100 dark:bg-white dark:text-zinc-900">
            翻译
          </div>
        </div>

        {/* 相册 */}
        <div className="group/dock relative flex shrink-0">
          <button
            type="button"
            aria-label="相册"
            onClick={() => onOpenSettings?.("wallpaper")}
            className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/85 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:bg-white hover:shadow-md active:scale-[0.95] dark:bg-zinc-800/85 dark:hover:bg-zinc-700"
          >
            <ImageIcon weight="bold" className="size-5 text-zinc-700 dark:text-zinc-200" aria-hidden />
          </button>
          <div className="pointer-events-none absolute bottom-[calc(100%+10px)] left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-zinc-900 px-2.5 py-1 text-xs font-medium text-white opacity-0 shadow-[0_4px_16px_rgba(0,0,0,0.2)] transition-all duration-200 ease-[var(--spring)] group-hover/dock:translate-y-0 translate-y-1 group-hover/dock:opacity-100 dark:bg-white dark:text-zinc-900">
            相册
          </div>
        </div>

        {/* 搜索 */}
        <div className="group/dock relative flex shrink-0">
          <button
            type="button"
            aria-label="搜索"
            onClick={() => onOpenSettings?.("search")}
            className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/85 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:bg-white hover:shadow-md active:scale-[0.95] dark:bg-zinc-800/85 dark:hover:bg-zinc-700"
          >
            <MagnifyingGlassIcon weight="bold" className="size-5 text-zinc-700 dark:text-zinc-200" aria-hidden />
          </button>
          <div className="pointer-events-none absolute bottom-[calc(100%+10px)] left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-zinc-900 px-2.5 py-1 text-xs font-medium text-white opacity-0 shadow-[0_4px_16px_rgba(0,0,0,0.2)] transition-all duration-200 ease-[var(--spring)] group-hover/dock:translate-y-0 translate-y-1 group-hover/dock:opacity-100 dark:bg-white dark:text-zinc-900">
            搜索
          </div>
        </div>

        {/* 切换主题 */}
        <ThemeToggle />

        {/* 设置 */}
        <div className="group/dock relative flex shrink-0">
          <button
            type="button"
            aria-label="设置"
            onClick={() => onOpenSettings?.("appearance")}
            className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/85 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:bg-white hover:shadow-md active:scale-[0.95] dark:bg-zinc-800/85 dark:hover:bg-zinc-700"
          >
            <GearIcon weight="bold" className="size-5 text-zinc-700 dark:text-zinc-200" aria-hidden />
          </button>
          <div className="pointer-events-none absolute bottom-[calc(100%+10px)] left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-zinc-900 px-2.5 py-1 text-xs font-medium text-white opacity-0 shadow-[0_4px_16px_rgba(0,0,0,0.2)] transition-all duration-200 ease-[var(--spring)] group-hover/dock:translate-y-0 translate-y-1 group-hover/dock:opacity-100 dark:bg-white dark:text-zinc-900">
            设置
          </div>
        </div>
      </motion.nav>
    </div>
  );
}

function ThemeToggle() {
  const [theme, setTheme] = useState<"system" | "light" | "dark">("system");
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const getTheme = () => (localStorage.getItem("startpage:theme") as "system" | "light" | "dark" | null) || "system";
    const getIsDark = (t: string) => (t === "dark" ? true : t === "light" ? false : mql.matches);
    const sync = () => {
      const t = getTheme();
      setTheme(t);
      setIsDark(getIsDark(t));
    };
    sync();
    const onStorage = () => sync();
    const onThemeChange = () => sync();
    const onMql = () => {
      const t = getTheme();
      if (t === "system") setIsDark(mql.matches);
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("theme-change" as never, onThemeChange);
    mql.addEventListener("change", onMql);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("theme-change" as never, onThemeChange);
      mql.removeEventListener("change", onMql);
    };
  }, []);
  const cycle = () => {
    // system → light → dark → system
    const order: Array<"system" | "light" | "dark"> = ["system", "light", "dark"];
    const idx = order.indexOf(theme);
    const next = order[(idx + 1) % order.length];
    localStorage.setItem("startpage:theme", next);
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const resolved = next === "system" ? (mql.matches ? "dark" : "light") : next;
    document.documentElement.setAttribute("data-theme", resolved);
    const glassRaw2 = localStorage.getItem("startpage:glassOpacity");
    let glass: number;
    if (glassRaw2 === null) glass = 40;
    else {
      const v = Number(glassRaw2);
      glass = !Number.isFinite(v) ? 40 : Math.min(80, Math.max(0, v));
    }
    const isDarkNow = resolved === "dark";
    const base = isDarkNow ? "30,30,30" : "255,255,255";
    const baseFocus = isDarkNow ? "40,40,40" : "255,255,255";
    document.documentElement.style.setProperty("--glass-bg", `rgba(${base},${glass / 100})`);
    document.documentElement.style.setProperty("--glass-bg-focus", `rgba(${baseFocus},${Math.min(0.72, glass / 100 + 0.16).toFixed(2)})`);
    document.documentElement.style.setProperty("--glass-border", isDarkNow ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.5)");
    setTheme(next);
    setIsDark(resolved === "dark");
    window.dispatchEvent(new Event("theme-change"));
  };
  const label = theme === "system" ? "跟随系统" : theme === "light" ? "浅色" : "深色";
  const ariaLabel = theme === "system" ? "主题：跟随系统，点击切换" : theme === "light" ? "主题：浅色，点击切换" : "主题：深色，点击切换";
  return (
    <div className="group/dock relative flex shrink-0">
      <button
        type="button"
        aria-label={ariaLabel}
        onClick={cycle}
        className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/85 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:bg-white hover:shadow-md active:scale-[0.95] dark:bg-zinc-800/85 dark:hover:bg-zinc-700"
      >
        {theme === "system" ? (
          <MonitorIcon weight="bold" className="size-5 text-zinc-700 dark:text-zinc-200" aria-hidden />
        ) : isDark ? (
          <MoonIcon weight="bold" className="size-5 text-zinc-700 dark:text-zinc-200" aria-hidden />
        ) : (
          <SunIcon weight="bold" className="size-5 text-zinc-700 dark:text-zinc-200" aria-hidden />
        )}
      </button>
      <div className="pointer-events-none absolute bottom-[calc(100%+10px)] left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-zinc-900 px-2.5 py-1 text-xs font-medium text-white opacity-0 shadow-[0_4px_16px_rgba(0,0,0,0.2)] transition-all duration-200 ease-[var(--spring)] group-hover/dock:translate-y-0 translate-y-1 group-hover/dock:opacity-100 dark:bg-white dark:text-zinc-900">
        {label}
      </div>
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
      <div className="pointer-events-none absolute bottom-[calc(100%+10px)] left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-zinc-900 px-2.5 py-1 text-xs font-medium text-white opacity-0 shadow-[0_4px_16px_rgba(0,0,0,0.2)] transition-all duration-200 ease-[var(--spring)] group-hover/dock:translate-y-0 translate-y-1 group-hover/dock:opacity-100">
        {name}
      </div>
    </div>
  );
}
