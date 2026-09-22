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
import { THEME_KEY, applyGlassTokens, readGlassOpacity, readTheme, resolveTheme, type ThemeMode } from "@/lib/theme";

const DOCK_BTN_BASE = "flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-xl shadow-sm transition-all duration-200";
const DOCK_BTN_IDLE = "bg-white/85 hover:bg-white hover:shadow-md hover:-translate-y-1 active:scale-[0.95] dark:bg-zinc-800/85 dark:hover:bg-zinc-700";
const DOCK_BTN_ACTIVE = "bg-zinc-900 text-white shadow-sm ring-1 ring-zinc-900/10 dark:bg-white dark:text-zinc-900 dark:ring-white/20";
const DOCK_ICON_CLS = "size-5 pointer-events-none";

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
  isWallpaperOpen,
  isSettingsOpen,
}: {
  isGridOpen: boolean;
  onToggleGrid: () => void;
  onOpenSettings?: (tab?: string) => void;
  isWeatherOpen?: boolean;
  isCalendarOpen?: boolean;
  onToggleWeather?: () => void;
  onToggleCalendar?: () => void;
  isWallpaperOpen?: boolean;
  isSettingsOpen?: boolean;
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
        <DockButton
          label={isGridOpen ? "返回首页" : "图标"}
          icon={SquaresFourIcon}
          active={isGridOpen}
          onToggle={onToggleGrid}
          touchToggle
          onShowTip={showTip}
          onHideTip={hideTip}
        />

        <span className="mx-0 h-6 w-px shrink-0 bg-zinc-900/10 dark:bg-white/15 md:mx-0.5" aria-hidden />

        {/* 天气 */}
        <DockButton label="天气" icon={CloudSunIcon} active={!!isWeatherOpen} onToggle={onToggleWeather} wrapperData="weather" onShowTip={showTip} onHideTip={hideTip} />

        {/* 日历 */}
        <DockButton label="日历" icon={CalendarDotsIcon} active={!!isCalendarOpen} onToggle={onToggleCalendar} wrapperData="calendar" onShowTip={showTip} onHideTip={hideTip} />

        {/* 壁纸 */}
        <DockButton label="壁纸" icon={ImageIcon} active={!!isWallpaperOpen} onToggle={() => onOpenSettings?.("wallpaper")} onShowTip={showTip} onHideTip={hideTip} />

        {/* 切换主题 */}
        <ThemeToggle onShowTip={showTip} onHideTip={hideTip} />

        {/* 设置 */}
        <DockButton label="设置" icon={GearIcon} active={!!isSettingsOpen} onToggle={() => onOpenSettings?.("appearance")} onShowTip={showTip} onHideTip={hideTip} />
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

function DockButton({
  label,
  icon: Icon,
  active = false,
  onToggle,
  touchToggle = false,
  wrapperData,
  onShowTip,
  onHideTip,
}: {
  label: string;
  icon: React.ElementType;
  active?: boolean;
  onToggle?: () => void;
  touchToggle?: boolean;
  wrapperData?: string;
  onShowTip: (e: React.MouseEvent<HTMLElement>, label: string) => void;
  onHideTip: () => void;
}) {
  const dataProps = wrapperData ? ({ [`data-${wrapperData}`]: "" } as Record<string, string>) : {};
  return (
    <div className="relative flex shrink-0" onMouseEnter={(e) => onShowTip(e, label)} onMouseLeave={onHideTip} {...dataProps}>
      <button
        type="button"
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={active}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onToggle?.();
        }}
        onTouchEnd={
          touchToggle
            ? (e) => {
                e.preventDefault();
                e.stopPropagation();
                onToggle?.();
              }
            : undefined
        }
        className={`${DOCK_BTN_BASE} ${touchToggle ? "touch-manipulation" : ""} ${active ? DOCK_BTN_ACTIVE : DOCK_BTN_IDLE}`}
      >
        <Icon weight="bold" className={`${DOCK_ICON_CLS} ${active ? "text-white dark:text-zinc-900" : "text-zinc-700 dark:text-zinc-200"}`} aria-hidden />
      </button>
    </div>
  );
}

function ThemeToggle({ onShowTip, onHideTip }: { onShowTip: (e: React.MouseEvent<HTMLElement>, label: string) => void; onHideTip: () => void }) {
  const [theme, setTheme] = useState<ThemeMode>("system");
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => {
      const t = readTheme();
      setTheme(t);
      setIsDark(resolveTheme(t) === "dark");
    };
    sync();
    const onStorage = () => sync();
    const onThemeChange = () => sync();
    const onMql = () => {
      if (readTheme() === "system") setIsDark(mql.matches);
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
    const order: ThemeMode[] = ["system", "light", "dark"];
    const next = order[(order.indexOf(theme) + 1) % order.length];
    localStorage.setItem(THEME_KEY, next);
    const resolved = resolveTheme(next);
    document.documentElement.setAttribute("data-theme", resolved);
    applyGlassTokens(resolved === "dark", readGlassOpacity());
    setTheme(next);
    setIsDark(resolved === "dark");
    window.dispatchEvent(new Event("theme-change"));
  };
  const label = theme === "system" ? "跟随系统" : theme === "light" ? "浅色" : "深色";
  const ariaLabel = `主题：${label}，点击切换`;
  return (
    <div className="relative flex shrink-0" onMouseEnter={(e) => onShowTip(e, label)} onMouseLeave={onHideTip}>
      <button type="button" aria-label={ariaLabel} onClick={cycle} className={`${DOCK_BTN_BASE} ${DOCK_BTN_IDLE}`}>
        {theme === "system" ? (
          <MonitorIcon weight="bold" className={`${DOCK_ICON_CLS} text-zinc-700 dark:text-zinc-200`} aria-hidden />
        ) : isDark ? (
          <MoonIcon weight="bold" className={`${DOCK_ICON_CLS} text-zinc-700 dark:text-zinc-200`} aria-hidden />
        ) : (
          <SunIcon weight="bold" className={`${DOCK_ICON_CLS} text-zinc-700 dark:text-zinc-200`} aria-hidden />
        )}
      </button>
    </div>
  );
}
