"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  SquaresFourIcon,
  ImageIcon,
  GearIcon,
  SunIcon,
  MoonIcon,
  MonitorIcon,
  CloudSunIcon,
  CalendarDotsIcon,
} from "@phosphor-icons/react";

/**
 * 底部 Dock：矩形圆角（外框与内部图标同一圆角体系），最左为"全部"菜单按钮
 * 点击触发宫格（与右键壁纸一致），事件已做冒泡隔离
 */
export function DockBar({
  isGridOpen,
  onToggleGrid,
  onOpenSettings,
  isWeatherOpen,
  isCalendarOpen,
  onToggleWeather,
  onToggleCalendar,
}: {
  isGridOpen: boolean;
  onToggleGrid: () => void;
  onOpenSettings?: (tab?: string) => void;
  isWeatherOpen?: boolean;
  isCalendarOpen?: boolean;
  onToggleWeather?: () => void;
  onToggleCalendar?: () => void;
}) {
  const reduce = useReducedMotion();
  const [tip, setTip] = useState<{ label: string; x: number; y: number } | null>(null);
  const showTip = (e: React.MouseEvent<HTMLElement>, label: string) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setTip({ label, x: rect.left + rect.width / 2, y: rect.top });
  };
  const hideTip = () => setTip(null);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-2.5 z-30 flex justify-center px-2">
      <motion.nav
        initial={reduce ? false : { y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
        aria-label="快捷方式 Dock 栏"
        className="pointer-events-auto flex max-w-[calc(100vw-16px)] items-center gap-2 overflow-x-auto overflow-y-visible rounded-[18px] glass-dock p-2 [-ms-overflow-style:none] [scrollbar-width:none] md:gap-2.5 md:overflow-visible [&::-webkit-scrollbar]:hidden"
      >
        {/* 图标（展开收起） */}
        <div className="relative flex shrink-0" onMouseEnter={(e) => showTip(e, isGridOpen ? "返回首页" : "图标")} onMouseLeave={hideTip}>
          <button
            type="button"
            aria-label={isGridOpen ? "返回首页" : "图标"}
            aria-haspopup="dialog"
            aria-expanded={isGridOpen}
            onClick={(e) => {
              e.stopPropagation();
              onToggleGrid();
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleGrid();
            }}
            className={`flex size-10 shrink-0 cursor-pointer touch-manipulation items-center justify-center rounded-xl shadow-sm transition-all active:scale-[0.95] ${isGridOpen ? "bg-white text-zinc-900 hover:bg-zinc-100 dark:bg-zinc-700 dark:text-white" : "bg-zinc-900 text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"}`}
          >
            <SquaresFourIcon weight="bold" className="size-5" aria-hidden />
          </button>
        </div>

        <span className="mx-0 h-6 w-px shrink-0 bg-zinc-900/10 dark:bg-white/15 md:mx-0.5" aria-hidden />

        {/* 天气 */}
        <div className="relative flex shrink-0" onMouseEnter={(e) => showTip(e, "天气")} onMouseLeave={hideTip} data-weather>
          <button
            type="button"
            aria-label="天气"
            aria-haspopup="dialog"
            aria-expanded={!!isWeatherOpen}
            onClick={(e) => {
              e.stopPropagation();
              onToggleWeather?.();
            }}
            className={`flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-xl shadow-sm transition-all duration-200 hover:-translate-y-1 active:scale-[0.95] ${isWeatherOpen ? "bg-[var(--accent)] text-[var(--accent-fg)] hover:opacity-90" : "bg-white/85 hover:bg-white hover:shadow-md dark:bg-zinc-800/85 dark:hover:bg-zinc-700"}`}
          >
            <CloudSunIcon weight={isWeatherOpen ? "fill" : "bold"} className={`size-5 ${isWeatherOpen ? "text-[var(--accent-fg)]" : "text-zinc-700 dark:text-zinc-200"}`} aria-hidden />
          </button>
        </div>

        {/* 日历 */}
        <div className="relative flex shrink-0" onMouseEnter={(e) => showTip(e, "日历")} onMouseLeave={hideTip} data-calendar>
          <button
            type="button"
            aria-label="日历"
            aria-haspopup="dialog"
            aria-expanded={!!isCalendarOpen}
            onClick={(e) => {
              e.stopPropagation();
              onToggleCalendar?.();
            }}
            className={`flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-xl shadow-sm transition-all duration-200 hover:-translate-y-1 active:scale-[0.95] ${isCalendarOpen ? "bg-[var(--accent)] text-[var(--accent-fg)] hover:opacity-90" : "bg-white/85 hover:bg-white hover:shadow-md dark:bg-zinc-800/85 dark:hover:bg-zinc-700"}`}
          >
            <CalendarDotsIcon weight={isCalendarOpen ? "fill" : "bold"} className={`size-5 ${isCalendarOpen ? "text-[var(--accent-fg)]" : "text-zinc-700 dark:text-zinc-200"}`} aria-hidden />
          </button>
        </div>

        {/* 壁纸 */}
        <div className="relative flex shrink-0" onMouseEnter={(e) => showTip(e, "壁纸")} onMouseLeave={hideTip}>
          <button
            type="button"
            aria-label="壁纸"
            onClick={() => onOpenSettings?.("wallpaper")}
            className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-white/85 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:bg-white hover:shadow-md active:scale-[0.95] dark:bg-zinc-800/85 dark:hover:bg-zinc-700"
          >
            <ImageIcon weight="bold" className="size-5 text-zinc-700 dark:text-zinc-200" aria-hidden />
          </button>
        </div>

        {/* 切换主题 */}
        <ThemeToggle onShowTip={showTip} onHideTip={hideTip} />

        {/* 设置 */}
        <div className="relative flex shrink-0" onMouseEnter={(e) => showTip(e, "设置")} onMouseLeave={hideTip}>
          <button
            type="button"
            aria-label="设置"
            onClick={() => onOpenSettings?.("appearance")}
            className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-white/85 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:bg-white hover:shadow-md active:scale-[0.95] dark:bg-zinc-800/85 dark:hover:bg-zinc-700"
          >
            <GearIcon weight="bold" className="size-5 text-zinc-700 dark:text-zinc-200" aria-hidden />
          </button>
        </div>
        {/* 移动端右侧内边距占位，避免最右图标紧贴父容器 */}
        <span className="hidden shrink-0 w-2 max-md:block" aria-hidden />
      </motion.nav>
      {tip && (
        <div
          className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-1 whitespace-nowrap rounded-full bg-zinc-900 px-2.5 py-1 text-xs font-medium text-white opacity-100 shadow-[0_4px_16px_rgba(0,0,0,0.2)] transition-all duration-200 ease-[var(--spring)] dark:bg-white dark:text-zinc-900"
          style={{ left: tip.x, top: tip.y - 10, transform: "translate(-50%, -100%)" }}
        >
          {tip.label}
        </div>
      )}
    </div>
  );
}

function ThemeToggle({ onShowTip, onHideTip }: { onShowTip?: (e: React.MouseEvent<HTMLElement>, label: string) => void; onHideTip?: () => void } = {}) {
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
  const handleEnter = (e: React.MouseEvent<HTMLElement>) => {
    if (onShowTip) onShowTip(e, label);
  };
  const handleLeave = () => {
    if (onHideTip) onHideTip();
  };
  // 若父级未提供 tip 代理，则自行渲染 fixed tooltip 避免被 overflow 裁剪
  const [localTip, setLocalTip] = useState<{ x: number; y: number } | null>(null);
  const showLocal = (e: React.MouseEvent<HTMLElement>) => {
    if (onShowTip) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setLocalTip({ x: rect.left + rect.width / 2, y: rect.top });
  };
  const hideLocal = () => {
    if (onHideTip) return;
    setLocalTip(null);
  };
  return (
    <>
      <div className="relative flex shrink-0" onMouseEnter={onShowTip ? handleEnter : showLocal} onMouseLeave={onShowTip ? handleLeave : hideLocal}>
        <button
          type="button"
          aria-label={ariaLabel}
          onClick={cycle}
          className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-white/85 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:bg-white hover:shadow-md active:scale-[0.95] dark:bg-zinc-800/85 dark:hover:bg-zinc-700"
        >
          {theme === "system" ? (
            <MonitorIcon weight="bold" className="size-5 text-zinc-700 dark:text-zinc-200" aria-hidden />
          ) : isDark ? (
            <MoonIcon weight="bold" className="size-5 text-zinc-700 dark:text-zinc-200" aria-hidden />
          ) : (
            <SunIcon weight="bold" className="size-5 text-zinc-700 dark:text-zinc-200" aria-hidden />
          )}
        </button>
      </div>
      {localTip && !onShowTip && (
        <div
          className="pointer-events-none fixed z-50 -translate-x-1/2 whitespace-nowrap rounded-full bg-zinc-900 px-2.5 py-1 text-xs font-medium text-white shadow-[0_4px_16px_rgba(0,0,0,0.2)] dark:bg-white dark:text-zinc-900"
          style={{ left: localTip.x, top: localTip.y - 10, transform: "translate(-50%, -100%)" }}
        >
          {label}
        </div>
      )}
    </>
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
  const favicon = domain ? `/api/favicon?domain=${encodeURIComponent(domain)}` : null;

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
