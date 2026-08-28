"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import {
  XIcon,
  PaletteIcon,
  ImageIcon,
  MagnifyingGlassIcon,
  SquaresFourIcon,
  DatabaseIcon,
  InfoIcon,
  CheckIcon,
  TrashIcon,
  PlusIcon,
  CaretUpIcon,
  CaretDownIcon,
  PencilSimpleIcon,
} from "@phosphor-icons/react";
import { BING_WALLPAPER, getWallpaper, setWallpaper, type WallpaperValue } from "@/components/wallpaper";
import { DEFAULT_GROUPS, SEARCH_ENGINES, type Group, type SearchEngine } from "@/lib/data";

type TabId = "appearance" | "wallpaper" | "search" | "grid" | "data" | "about";

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "appearance", label: "外观", icon: PaletteIcon },
  { id: "wallpaper", label: "壁纸", icon: ImageIcon },
  { id: "search", label: "搜索", icon: MagnifyingGlassIcon },
  { id: "grid", label: "图标", icon: SquaresFourIcon },
  { id: "data", label: "数据", icon: DatabaseIcon },
  { id: "about", label: "关于", icon: InfoIcon },
];

type Props = {
  open: boolean;
  onClose: () => void;
  initialTab?: TabId;
  onTabChange?: (tab: TabId) => void;
};

export function SettingsPanel({ open, onClose, initialTab = "appearance", onTabChange }: Props) {
  const [internalActive, setInternalActive] = useState<TabId>(initialTab);
  const active = onTabChange ? initialTab : internalActive;
  const setActive = (t: TabId) => {
    if (onTabChange) onTabChange(t);
    else setInternalActive(t);
  };
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (open) closeRef.current?.focus();
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <div data-settings className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-zinc-900/20 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="设置"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] as unknown as never }}
            className="relative flex h-[min(640px,85vh)] w-full max-w-[820px] overflow-hidden rounded-[20px] glass-panel shadow-[0_24px_64px_rgba(0,0,0,0.22)] max-md:flex-col"
          >
            {/* 移动端顶部栏：标题与关闭左右布局，避免与横向 Tab 重叠 */}
            <div className="hidden max-md:flex items-center justify-between border-b border-zinc-900/5 bg-white/40 px-4 py-3 backdrop-blur dark:border-white/10 dark:bg-zinc-800/50">
              <div className="flex items-center gap-2">
                <div className="flex size-7 items-center justify-center rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-900">
                  <PaletteIcon weight="bold" className="size-3.5" />
                </div>
                <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">设置</span>
              </div>
              <button
                type="button"
                aria-label="关闭设置"
                onClick={onClose}
                className="flex size-8 items-center justify-center rounded-full bg-zinc-900/5 text-zinc-600 hover:bg-zinc-900/10 dark:bg-white/10 dark:text-zinc-300 dark:hover:bg-white/15"
              >
                <XIcon weight="bold" className="size-4" />
              </button>
            </div>

            <button
              ref={closeRef}
              type="button"
              aria-label="关闭设置"
              onClick={onClose}
              className="absolute right-3 top-3 z-10 hidden size-8 items-center justify-center rounded-full bg-zinc-900/5 text-zinc-500 backdrop-blur transition-colors hover:bg-zinc-900/10 hover:text-zinc-900 dark:bg-white/10 dark:text-zinc-400 dark:hover:bg-white/15 dark:hover:text-zinc-100 md:flex"
            >
              <XIcon weight="bold" className="size-4" />
            </button>

            <aside className="flex w-full shrink-0 flex-col border-zinc-900/5 bg-white/30 backdrop-blur dark:border-white/10 dark:bg-zinc-900/20 md:w-[220px] md:border-r max-md:border-b-0 max-md:py-0">
              <div className="hidden items-center gap-2 px-4 pb-3 pt-4 md:flex">
                <div className="flex size-8 items-center justify-center rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900">
                  <PaletteIcon weight="bold" className="size-4" />
                </div>
                <span className="text-sm font-semibold tracking-wide text-zinc-700 dark:text-zinc-200">设置</span>
              </div>
              <nav className="flex gap-1 overflow-x-auto px-2 py-2 md:flex-col md:gap-1 md:px-2 md:py-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {TABS.map((t) => {
                  const activeNow = active === t.id;
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setActive(t.id)}
                      aria-current={activeNow ? "true" : undefined}
                      className={`flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors max-md:px-3.5 max-md:py-2 ${
                        activeNow ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow dark:bg-white dark:text-zinc-900" : "text-zinc-600 hover:bg-white/60 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-zinc-100"
                      }`}
                    >
                      <Icon weight={activeNow ? "fill" : "regular"} className="size-[18px] shrink-0" aria-hidden />
                      {t.label}
                    </button>
                  );
                })}
              </nav>
            </aside>

            <div className="flex min-h-0 flex-1 flex-col bg-white/55 backdrop-blur dark:bg-zinc-900/10">
              {/* 固定标题区 */}
              <div className="shrink-0 border-b border-white/40 bg-white/40 px-6 py-4 backdrop-blur dark:border-white/10 dark:bg-zinc-800/40 md:px-7 md:py-5">
                <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                  {TABS.find((t) => t.id === active)?.label}
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                  {active === "appearance" && "主题与毛玻璃效果"}
                  {active === "wallpaper" && "默认 / 必应每日 / 列表 / 自定义上传"}
                  {active === "search" && "搜索引擎与历史记录"}
                  {active === "grid" && "按分组管理图标"}
                  {active === "data" && "本地 JSON 同步"}
                  {active === "about" && "关于本项目"}
                </p>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto p-6 md:p-7">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={active}
                    initial={reduce ? { opacity: 0 } : { opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] as unknown as never }}
                  >
                    {active === "appearance" && <AppearancePane />}
                    {active === "wallpaper" && <WallpaperPane />}
                    {active === "search" && <SearchPane />}
                    {active === "grid" && <IconsPane />}
                    {active === "data" && <DataPane />}
                    {active === "about" && <AboutPane />}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function Section({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/40 bg-white p-4 shadow-sm md:p-5 dark:border-zinc-700/50 dark:bg-zinc-800">
      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{title}</h3>
      {desc && <p className="mt-1 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">{desc}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function AppearancePane() {
  const [theme, setTheme] = useState<"system" | "light" | "dark">(() => {
    if (typeof window === "undefined") return "system";
    return (localStorage.getItem("startpage:theme") as never) || "system";
  });
  const [glass, setGlass] = useState<number>(() => {
    if (typeof window === "undefined") return 40;
    const raw = localStorage.getItem("startpage:glassOpacity");
    if (raw === null) return 40;
    const v = Number(raw);
    if (!Number.isFinite(v)) return 40;
    return Math.min(80, Math.max(0, v));
  });
  const [brightness, setBrightness] = useState<number>(() => {
    if (typeof window === "undefined") return 90;
    const v = Number(localStorage.getItem("startpage:wallpaperBrightness"));
    if (!Number.isFinite(v) || v === 0) return 90;
    return Math.min(120, Math.max(70, v));
  });
  const [blur, setBlur] = useState<number>(() => {
    if (typeof window === "undefined") return 100;
    const raw = localStorage.getItem("startpage:wallpaperBlur");
    if (raw === null) return 100;
    const v = Number(raw);
    // 旧默认 0 迁移至 100
    if (!Number.isFinite(v) || v === 0) return 100;
    return Math.min(100, Math.max(0, v));
  });

  useEffect(() => {
    localStorage.setItem("startpage:theme", theme);
    const root = document.documentElement;
    const mql2 = window.matchMedia("(prefers-color-scheme: dark)");
    const resolved2 = theme === "system" ? (mql2.matches ? "dark" : "light") : theme;
    root.setAttribute("data-theme", resolved2);
    window.dispatchEvent(new Event("theme-change"));
    // 同步刷新毛玻璃基色以立即适配深浅
    const glassRaw2 = localStorage.getItem("startpage:glassOpacity");
    let glassVal: number;
    if (glassRaw2 === null) glassVal = 40;
    else {
      const vv = Number(glassRaw2);
      glassVal = !Number.isFinite(vv) || vv === 0 ? 40 : Math.min(80, Math.max(0, vv));
    }
    const isDarkNow = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    const base = isDarkNow ? "30,30,30" : "255,255,255";
    const baseFocus = isDarkNow ? "40,40,40" : "255,255,255";
    document.documentElement.style.setProperty("--glass-bg", `rgba(${base},${glassVal / 100})`);
    document.documentElement.style.setProperty("--glass-bg-focus", `rgba(${baseFocus},${Math.min(0.72, glassVal / 100 + 0.16).toFixed(2)})`);
    document.documentElement.style.setProperty("--glass-border", isDarkNow ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.5)");
  }, [theme]);

  useEffect(() => {
    const onTheme = () => {
      const saved = localStorage.getItem("startpage:theme") as typeof theme | null;
      if (saved === "light" || saved === "dark" || saved === "system") setTheme(saved);
    };
    window.addEventListener("storage", onTheme);
    window.addEventListener("theme-change" as never, onTheme);
    return () => {
      window.removeEventListener("storage", onTheme);
      window.removeEventListener("theme-change" as never, onTheme);
    };
  }, []);

  const isDark = theme === "dark" || (theme === "system" && typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  useEffect(() => {
    localStorage.setItem("startpage:glassOpacity", String(glass));
    document.documentElement.style.setProperty("--glass-opacity", String(glass / 100));
    const base = isDark ? "30,30,30" : "255,255,255";
    const baseFocus = isDark ? "40,40,40" : "255,255,255";
    const border = isDark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.5)";
    document.documentElement.style.setProperty("--glass-bg", `rgba(${base},${glass / 100})`);
    document.documentElement.style.setProperty("--glass-bg-focus", `rgba(${baseFocus},${Math.min(0.72, glass / 100 + 0.16).toFixed(2)})`);
    document.documentElement.style.setProperty("--glass-border", border);
  }, [glass, isDark]);

  useEffect(() => {
    localStorage.setItem("startpage:wallpaperBrightness", String(brightness));
    document.documentElement.style.setProperty("--wallpaper-brightness", String(brightness / 100));
    window.dispatchEvent(new Event("wallpaper-brightness-change"));
  }, [brightness]);

  useEffect(() => {
    localStorage.setItem("startpage:wallpaperBlur", String(blur));
    window.dispatchEvent(new Event("wallpaper-blur-change"));
  }, [blur]);

  const themes: { id: typeof theme; label: string }[] = [
    { id: "system", label: "跟随系统" },
    { id: "light", label: "浅色" },
    { id: "dark", label: "深色" },
  ];

  return (
    <div className="space-y-4">
      <Section title="主题">
        <div className="flex flex-wrap gap-2">
          {themes.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTheme(t.id)}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                theme === t.id ? "border-zinc-900 bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow" : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </Section>
      <Section title="毛玻璃透明度">
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={0}
            max={80}
            value={glass}
            onChange={(e) => {
              const v = Number(e.target.value);
              setGlass(v);
              localStorage.setItem("startpage:glassOpacity", String(v));
              const isDarkNow = document.documentElement.getAttribute("data-theme") === "dark";
              const base = isDarkNow ? "30,30,30" : "255,255,255";
              const baseFocus = isDarkNow ? "40,40,40" : "255,255,255";
              document.documentElement.style.setProperty("--glass-bg", `rgba(${base},${v / 100})`);
              document.documentElement.style.setProperty("--glass-bg-focus", `rgba(${baseFocus},${Math.min(0.72, v / 100 + 0.16).toFixed(2)})`);
            }}
            className="flex-1"
            style={{ accentColor: "var(--accent)" }}
          />
          <span className="w-10 shrink-0 text-right text-xs font-medium text-zinc-600 dark:text-zinc-400">{glass}%</span>
        </div>
      </Section>
      <Section title="壁纸亮度">
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={70}
            max={120}
            value={brightness}
            onChange={(e) => {
              const v = Number(e.target.value);
              setBrightness(v);
              localStorage.setItem("startpage:wallpaperBrightness", String(v));
              document.documentElement.style.setProperty("--wallpaper-brightness", String(v / 100));
              window.dispatchEvent(new Event("wallpaper-brightness-change"));
            }}
            className="flex-1"
            style={{ accentColor: "var(--accent)" }}
          />
          <span className="w-10 shrink-0 text-right text-xs font-medium text-zinc-600 dark:text-zinc-400">{brightness}%</span>
        </div>
      </Section>
      <Section title="遮罩模糊" desc="聚焦搜索或打开宫格时的额外模糊">
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={0}
            max={100}
            value={blur}
            onChange={(e) => {
              const v = Number(e.target.value);
              setBlur(v);
              localStorage.setItem("startpage:wallpaperBlur", String(v));
              window.dispatchEvent(new Event("wallpaper-blur-change"));
            }}
            className="flex-1"
            style={{ accentColor: "var(--accent)" }}
          />
          <span className="w-10 shrink-0 text-right text-xs font-medium text-zinc-600 dark:text-zinc-400">{blur}%</span>
        </div>
      </Section>
    </div>
  );
}

function WallpaperPane() {
  const [curr, setCurr] = useState<WallpaperValue>(() => getWallpaper());

  useEffect(() => {
    setCurr(getWallpaper());
    const onChange = () => setCurr(getWallpaper());
    window.addEventListener("wallpaper-change", onChange);
    return () => window.removeEventListener("wallpaper-change", onChange);
  }, []);

  const pick = (type: WallpaperValue["type"]) => {
    const map: Record<string, string> = {
      default: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=2400&auto=format&fit=crop",
      unsplash: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=2400&auto=format&fit=crop",
      bing: BING_WALLPAPER,
    };
    const v: WallpaperValue = { type, url: map[type] };
    setWallpaper(v);
    setCurr(v);
  };

  const isActive = (t: string) => curr.type === t;

  const [bingList, setBingList] = useState<string[]>([]);
  const [bingLoading, setBingLoading] = useState(false);
  const [bingPage, setBingPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const listRef = useRef<HTMLDivElement>(null);

  const loadBing = (page: number, append = false) => {
    if (bingLoading) return;
    setBingLoading(true);
    const idxs = Array.from({ length: 12 }, (_, i) => page * 12 + i);
    Promise.all(
      idxs.map((idx) =>
        fetch(`https://bing.biturl.top/?resolution=1920&format=json&index=${idx}&mkt=zh-CN`)
          .then((r) => r.json())
          .then((j) => (j.url as string) || null)
          .catch(() => null),
      ),
    )
      .then((urls) => {
        const filtered = (urls.filter(Boolean) as string[]).filter((u, i, arr) => arr.indexOf(u) === i);
        // 去重：过滤已在列表中的重复图
        setBingList((prev) => {
          const deduped = filtered.filter((u) => !prev.includes(u));
          if (!deduped.length) {
            setHasMore(false);
            return prev;
          }
          return append ? [...prev, ...deduped] : deduped;
        });
        if (!filtered.length) setHasMore(false);
      })
      .finally(() => setBingLoading(false));
  };

  useEffect(() => {
    loadBing(0, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onScrollBing = () => {
    const el = listRef.current;
    if (!el || bingLoading || !hasMore) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 80) {
      const next = bingPage + 1;
      setBingPage(next);
    }
  };

  useEffect(() => {
    if (bingPage === 0) return;
    loadBing(bingPage, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bingPage]);

  return (
    <div className="space-y-4">
      {/* 当前壁纸大预览，类青柠壁纸切换 */}
      <div className="overflow-hidden rounded-2xl border border-white/40 bg-zinc-900 shadow-sm">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={curr.url} alt="当前壁纸预览" className="h-40 w-full object-cover sm:h-48" loading="eager" />
        <div className="flex items-center justify-between bg-white/90 px-3 py-2 text-xs backdrop-blur dark:bg-zinc-800/90">
          <span className="font-medium text-zinc-700 dark:text-zinc-300">当前预览</span>
          <span className="rounded-full bg-zinc-900 px-2 py-0.5 text-[11px] font-medium text-white dark:bg-white dark:text-zinc-900">{curr.type}</span>
        </div>
      </div>

      <Section title="选择壁纸">
        <div className="grid grid-cols-2 gap-3">
          {[
            { id: "default", label: "默认", sub: "Unsplash" },
            { id: "bing", label: "Bing 每日", sub: "每日更新" },
          ].map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => pick(o.id as never)}
              className={`group relative overflow-hidden rounded-xl border p-3 text-left transition-all ${
                isActive(o.id) ? "border-zinc-900 bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow" : "border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700"
              }`}
            >
              <div className={`text-sm font-medium ${isActive(o.id) ? "text-white dark:text-zinc-900" : "text-zinc-800 dark:text-zinc-100"}`}>{o.label}</div>
              <div className={`text-xs ${isActive(o.id) ? "text-white/70 dark:text-zinc-600" : "text-zinc-500 dark:text-zinc-400"}`}>{o.sub}</div>
              {isActive(o.id) && <CheckIcon weight="bold" className="absolute right-2 top-2 size-4 text-white dark:text-zinc-900" />}
            </button>
          ))}
        </div>
      </Section>

      <Section title="必应壁纸列表">
        <p className="mb-3 text-xs text-zinc-500 dark:text-zinc-400">点击直接设为壁纸。</p>
        <div ref={listRef} onScroll={onScrollBing} className="max-h-52 overflow-y-auto rounded-xl border border-zinc-200 bg-zinc-50 p-2 dark:border-zinc-700 dark:bg-zinc-800 sm:max-h-64">
          {bingList.length ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {bingList.map((url) => {
                const active = curr.url === url;
                return (
                  <button
                    key={url}
                    type="button"
                    onClick={() => {
                      const v: WallpaperValue = { type: "bing", url };
                      setWallpaper(v);
                      setCurr(v);
                    }}
                    className={`group relative overflow-hidden rounded-xl border-2 transition-all ${active ? "border-zinc-900 dark:border-white" : "border-transparent hover:border-zinc-300 dark:hover:border-zinc-600"}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="Bing" className="aspect-[16/10] w-full object-cover" loading="lazy" />
                    {active && (
                      <span className="absolute right-1 top-1 flex size-5 items-center justify-center rounded-full bg-zinc-900 text-white dark:bg-white dark:text-zinc-900">
                        <CheckIcon weight="bold" className="size-3" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ) : null}
          {bingLoading && (
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="aspect-[16/10] animate-pulse rounded-xl bg-zinc-100" />
              ))}
            </div>
          )}
          {!bingLoading && hasMore && bingList.length > 0 && (
            <button type="button" onClick={() => setBingPage((p) => p + 1)} className="mt-3 w-full rounded-xl border border-zinc-200 bg-white py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600">
              加载更多
            </button>
          )}
          {!bingLoading && !hasMore && bingList.length > 0 && <p className="mt-2 text-center text-xs text-zinc-400 dark:text-zinc-500">已加载全部</p>}
          {!bingLoading && !bingList.length && <p className="text-xs text-zinc-500 dark:text-zinc-400">加载失败，请稍后重试。</p>}
        </div>
      </Section>
    </div>
  );
}

function SearchPane() {
  const [engineId, setEngineId] = useState<string>(() => {
    if (typeof window === "undefined") return "bing";
    return localStorage.getItem("startpage:engine") || "bing";
  });
  const [engines, setEngines] = useState<SearchEngine[]>(() => {
    if (typeof window === "undefined") return SEARCH_ENGINES;
    try {
      const raw = localStorage.getItem("startpage:engines");
      if (raw) {
        const arr = JSON.parse(raw) as SearchEngine[];
        if (Array.isArray(arr) && arr.length) return arr;
      }
    } catch {}
    return SEARCH_ENGINES;
  });
  const [newEngine, setNewEngine] = useState({ label: "", url: "", icon: "" });
  const [editing, setEditing] = useState<string | null>(null);
  const [editVal, setEditVal] = useState({ label: "", url: "", icon: "" });
  const [history, setHistory] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem("startpage:searchHistory");
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  });
  const [showHistory, setShowHistory] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const v = localStorage.getItem("startpage:showSearchHistory");
    return v === null ? true : v === "true";
  });

  useEffect(() => {
    localStorage.setItem("startpage:showSearchHistory", String(showHistory));
    window.dispatchEvent(new Event("search-history-change"));
  }, [showHistory]);

  useEffect(() => {
    const onStorage = () => {
      try {
        const raw = localStorage.getItem("startpage:searchHistory");
        setHistory(raw ? (JSON.parse(raw) as string[]) : []);
      } catch {}
      setEngineId(localStorage.getItem("startpage:engine") || "bing");
      try {
        const rawE = localStorage.getItem("startpage:engines");
        if (rawE) setEngines(JSON.parse(rawE) as SearchEngine[]);
      } catch {}
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("search-history-change" as never, onStorage);
    window.addEventListener("engine-change" as never, onStorage);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("search-history-change" as never, onStorage);
      window.removeEventListener("engine-change" as never, onStorage);
    };
  }, []);

  const persistEngines = (next: SearchEngine[]) => {
    setEngines(next);
    localStorage.setItem("startpage:engines", JSON.stringify(next));
    window.dispatchEvent(new Event("engine-change"));
  };

  const pickEngine = (id: string) => {
    localStorage.setItem("startpage:engine", id);
    setEngineId(id);
    window.dispatchEvent(new Event("engine-change"));
  };

  const addEngine = () => {
    if (!newEngine.label.trim() || !newEngine.url.trim()) {
      alert("请填写名称与 URL（需含 {q}）");
      return;
    }
    if (!newEngine.url.includes("{q}")) {
      alert("URL 需包含 {q} 占位");
      return;
    }
    const id = `custom_${Date.now()}`;
    const e: SearchEngine = { id, label: newEngine.label.trim(), url: newEngine.url.trim(), icon: (newEngine.icon.trim() || newEngine.label.trim().slice(0, 1)).slice(0, 2), color: "#18181b" };
    persistEngines([...engines, e]);
    setNewEngine({ label: "", url: "", icon: "" });
  };

  const startEdit = (e: SearchEngine) => {
    setEditing(e.id);
    setEditVal({ label: e.label, url: e.url, icon: e.icon });
  };

  const saveEdit = () => {
    if (!editing) return;
    if (!editVal.label.trim() || !editVal.url.trim() || !editVal.url.includes("{q}")) {
      alert("请检查名称与 URL（需含 {q}）");
      return;
    }
    const next = engines.map((x) => (x.id === editing ? { ...x, label: editVal.label.trim(), url: editVal.url.trim(), icon: (editVal.icon.trim() || editVal.label.trim().slice(0, 1)).slice(0, 2) } : x));
    persistEngines(next);
    setEditing(null);
  };

  const removeEngine = (id: string) => {
    if (engines.length <= 1) {
      alert("至少保留一个搜索引擎");
      return;
    }
    if (!confirm("确定删除该搜索引擎？")) return;
    const next = engines.filter((x) => x.id !== id);
    persistEngines(next);
    if (engineId === id) pickEngine(next[0].id);
  };

  const clearHistory = () => {
    localStorage.removeItem("startpage:searchHistory");
    setHistory([]);
    window.dispatchEvent(new Event("search-history-change"));
  };

  const removeOne = (q: string) => {
    const next = history.filter((x) => x !== q);
    localStorage.setItem("startpage:searchHistory", JSON.stringify(next));
    setHistory(next);
    window.dispatchEvent(new Event("search-history-change"));
  };

  return (
    <div className="space-y-4">
      <Section title="搜索引擎">
        <div className="space-y-1.5">
          {engines.map((e) => (
            <div
              key={e.id}
              onClick={() => {
                if (editing === e.id) return;
                pickEngine(e.id);
              }}
              className={`group flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 transition-colors ${engineId === e.id ? "border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-900 shadow" : "border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700"}`}
            >
              <input
                type="radio"
                name="engine"
                checked={engineId === e.id}
                onChange={() => pickEngine(e.id)}
                onClick={(ev) => ev.stopPropagation()}
                className="size-4 shrink-0 cursor-pointer accent-zinc-900 dark:accent-white"
                style={{ accentColor: "var(--accent)" }}
              />
              <span className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${engineId === e.id ? "bg-white text-zinc-900 dark:bg-zinc-900 dark:text-white" : "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"}`}>{e.icon.slice(0, 1)}</span>
              {editing === e.id ? (
                <div className="flex min-w-0 flex-1 flex-col gap-1" onClick={(ev) => ev.stopPropagation()}>
                  <input value={editVal.label} onChange={(ev) => setEditVal((s) => ({ ...s, label: ev.target.value }))} placeholder="名称" onClick={(ev) => ev.stopPropagation()} className="min-w-0 rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-900 placeholder:text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100" />
                  <input value={editVal.url} onChange={(ev) => setEditVal((s) => ({ ...s, url: ev.target.value }))} placeholder="URL 需含 {q}" onClick={(ev) => ev.stopPropagation()} className="min-w-0 rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-900 placeholder:text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100" />
                  <input value={editVal.icon} onChange={(ev) => setEditVal((s) => ({ ...s, icon: ev.target.value }))} placeholder="图标文字" onClick={(ev) => ev.stopPropagation()} className="min-w-0 rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-900 placeholder:text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100" />
                  <div className="flex gap-1">
                    <button type="button" onClick={saveEdit} className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-zinc-900">
                      保存
                    </button>
                    <button type="button" onClick={() => setEditing(null)} className="rounded-full border border-white/40 px-2.5 py-1 text-xs text-white">
                      取消
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <span className={`min-w-0 flex-1 truncate text-sm font-medium ${engineId === e.id ? "text-white dark:text-zinc-900" : "text-zinc-700 dark:text-zinc-200"}`}>{e.label}</span>
                  <span className={`hidden min-w-0 flex-1 truncate text-xs md:block ${engineId === e.id ? "text-white/60 dark:text-zinc-900/60" : "text-zinc-400 dark:text-zinc-500"}`}>{e.url}</span>
                  <button
                    type="button"
                    onClick={(ev) => {
                      ev.stopPropagation();
                      startEdit(e);
                    }}
                    className={`shrink-0 rounded-full px-2 py-1 text-xs ${engineId === e.id ? "text-white hover:bg-white/10 dark:text-zinc-900 dark:hover:bg-zinc-900/10" : "text-zinc-500 hover:bg-zinc-900/5 dark:text-zinc-400 dark:hover:bg-white/10"}`}
                  >
                    编辑
                  </button>
                  <button
                    type="button"
                    onClick={(ev) => {
                      ev.stopPropagation();
                      removeEngine(e.id);
                    }}
                    className="shrink-0 rounded-full p-1 text-zinc-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                  >
                    <TrashIcon weight="bold" className="size-3.5" />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-xl border border-dashed border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-800/50">
          <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">新增搜索引擎</p>
          <div className="mt-2 grid gap-2">
            <input value={newEngine.label} onChange={(e) => setNewEngine((s) => ({ ...s, label: e.target.value }))} placeholder="名称（如 MySearch）" className="w-full min-w-0 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500" />
            <input value={newEngine.url} onChange={(e) => setNewEngine((s) => ({ ...s, url: e.target.value }))} placeholder="URL，需含 {q}" className="w-full min-w-0 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500" />
            <input value={newEngine.icon} onChange={(e) => setNewEngine((s) => ({ ...s, icon: e.target.value }))} placeholder="图标文字（可选）" className="w-full min-w-0 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500" />
            <button type="button" onClick={addEngine} className="inline-flex w-full items-center justify-center gap-1 rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100 sm:w-auto">
              <PlusIcon weight="bold" className="size-4" /> 新增
            </button>
          </div>
        </div>
      </Section>

      <Section title="搜索历史">
        <div className="flex items-center justify-between">
          <label className="flex cursor-pointer items-center gap-3">
            <button
              type="button"
              role="switch"
              aria-checked={showHistory}
              onClick={() => setShowHistory((v) => !v)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2 dark:focus-visible:ring-white ${showHistory ? "bg-zinc-900 dark:bg-white" : "bg-zinc-200 dark:bg-zinc-700"}`}
            >
              <span
                className={`inline-block size-4 transform rounded-full shadow transition-all duration-200 ${showHistory ? "translate-x-5 bg-white dark:bg-zinc-900" : "translate-x-0 bg-white dark:bg-white"}`}
              />
            </button>
            <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">展示搜索历史</span>
          </label>
          {history.length > 0 && (
            <button type="button" onClick={clearHistory} className="text-xs font-medium text-red-600 hover:text-red-700">
              清空
            </button>
          )}
        </div>
        {history.length ? (
          <ul className="mt-3 max-h-48 space-y-1 overflow-y-auto rounded-xl border border-zinc-200 bg-zinc-50 p-2 dark:border-zinc-700 dark:bg-zinc-800">
            {history.map((q) => (
              <li key={q} className="group flex items-center justify-between gap-2 rounded-lg bg-white px-2.5 py-1.5 text-sm text-zinc-700 shadow-sm dark:bg-zinc-900 dark:text-zinc-300">
                <span className="min-w-0 truncate">{q}</span>
                <button type="button" onClick={() => removeOne(q)} className="shrink-0 rounded-full p-1 text-zinc-400 opacity-0 transition-opacity hover:bg-zinc-900/5 hover:text-zinc-900 group-hover:opacity-100 dark:text-zinc-500 dark:hover:bg-white/10 dark:hover:text-zinc-100" aria-label={`删除 ${q}`}>
                  <XIcon weight="bold" className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">暂无历史，搜索后自动记录（最多 20 条）。</p>
        )}
      </Section>
    </div>
  );
}

function IconsPane() {
  const [groups, setGroups] = useState<Group[]>(() => {
    if (typeof window === "undefined") return DEFAULT_GROUPS;
    try {
      const raw = localStorage.getItem("startpage:groups") || localStorage.getItem("startpage:items");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed[0]?.shortcuts) return parsed as Group[];
        if (Array.isArray(parsed) && parsed[0]?.url) {
          return DEFAULT_GROUPS;
        }
      }
    } catch {}
    return DEFAULT_GROUPS;
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  useEffect(() => {
    localStorage.setItem("startpage:groups", JSON.stringify(groups));
    // 同步扁平 items 供 AppGrid 读取
    const flat = groups.flatMap((g) => g.shortcuts);
    localStorage.setItem("startpage:items", JSON.stringify(flat));
    window.dispatchEvent(new Event("groups-change"));
  }, [groups]);

  const moveGroup = (idx: number, dir: -1 | 1) => {
    const next = [...groups];
    const j = idx + dir;
    if (j < 0 || j >= next.length) return;
    const [m] = next.splice(idx, 1);
    next.splice(j, 0, m);
    setGroups(next);
  };

  const removeGroup = (idx: number) => {
    if (!confirm(`确定删除分组“${groups[idx].title}”？`)) return;
    setGroups((prev) => prev.filter((_, i) => i !== idx));
  };

  const addGroup = () => {
    const title = prompt("新分组名");
    if (!title?.trim()) return;
    setGroups((prev) => [...prev, { id: `g_${Date.now()}`, title: title.trim(), shortcuts: [] }]);
  };

  const startEdit = (g: Group) => {
    setEditingId(g.id);
    setEditTitle(g.title);
  };

  const saveEdit = () => {
    if (!editingId || !editTitle.trim()) return;
    setGroups((prev) => prev.map((x) => (x.id === editingId ? { ...x, title: editTitle.trim() } : x)));
    setEditingId(null);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-4">
        {groups.map((g, gi) => (
          <section key={g.id} className="rounded-2xl border border-white/40 bg-white p-3 shadow-sm dark:border-zinc-700/50 dark:bg-zinc-800">
            <div className="group flex items-center gap-2">
              {editingId === g.id ? (
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="min-w-0 flex-1 rounded-lg border border-zinc-200 bg-white px-2 py-1 text-sm text-zinc-900 placeholder:text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100" autoFocus />
                  <button type="button" onClick={saveEdit} className="shrink-0 rounded-full bg-zinc-900 px-3 py-1 text-xs font-medium text-white dark:bg-white dark:text-zinc-900">
                    保存
                  </button>
                  <button type="button" onClick={() => setEditingId(null)} className="shrink-0 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs text-zinc-700 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                    取消
                  </button>
                </div>
              ) : (
                <>
                  <h3 className="min-w-0 flex-1 truncate text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                    {g.title} <span className="font-normal text-zinc-400 dark:text-zinc-500">- {g.shortcuts.length}项</span>
                  </h3>
                  <div className="flex items-center gap-1 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
                    <button type="button" onClick={() => startEdit(g)} className="flex size-7 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600" aria-label="编辑分组名">
                      <PencilSimpleIcon weight="bold" className="size-3.5" />
                    </button>
                    <button type="button" onClick={() => moveGroup(gi, -1)} disabled={gi === 0} className="flex size-7 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600 disabled:opacity-40">
                      <CaretUpIcon weight="bold" className="size-3.5" />
                    </button>
                    <button type="button" onClick={() => moveGroup(gi, 1)} disabled={gi === groups.length - 1} className="flex size-7 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600 disabled:opacity-40">
                      <CaretDownIcon weight="bold" className="size-3.5" />
                    </button>
                    <button type="button" onClick={() => removeGroup(gi)} className="flex size-7 items-center justify-center rounded-full border border-red-200 bg-white text-red-600 hover:bg-red-50 dark:border-red-900/50 dark:bg-zinc-800 dark:text-red-400 dark:hover:bg-red-500/10">
                      <TrashIcon weight="bold" className="size-3.5" />
                    </button>
                  </div>
                </>
              )}
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
              {g.shortcuts.map((s) => (
                <div key={s.id} data-draggable data-id={s.id} className="group/item flex flex-col items-center gap-1 rounded-xl border border-transparent p-2 hover:border-zinc-200 hover:bg-zinc-50 dark:hover:border-zinc-600 dark:hover:bg-zinc-700/50">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-700 dark:ring-zinc-600">
                    <span className="text-xs font-bold text-zinc-700 dark:text-zinc-200">{s.name.slice(0, 1)}</span>
                  </span>
                  <span className="line-clamp-1 w-full truncate text-center text-xs text-zinc-600 dark:text-zinc-400">{s.name}</span>
                </div>
              ))}
              {g.shortcuts.length === 0 && <p className="col-span-full py-6 text-center text-xs text-zinc-400 dark:text-zinc-500">暂无图标，拖拽或新建添加</p>}
            </div>
          </section>
        ))}
      </div>
      <button type="button" onClick={addGroup} className="flex w-full items-center justify-center gap-1 rounded-xl border border-dashed border-zinc-300 bg-white/60 px-4 py-3 text-sm font-medium text-zinc-600 hover:bg-white dark:border-zinc-600 dark:bg-zinc-800/50 dark:text-zinc-300 dark:hover:bg-zinc-800">
        <PlusIcon weight="bold" className="size-4" /> 新建分组
      </button>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">图标新增/编辑/删除后续接入弹窗与跨组拖拽落盘。</p>
    </div>
  );
}

function DataPane() {
  const exportJson = () => {
    const payload: Record<string, unknown> = { at: new Date().toISOString(), version: 1 };
    const keys = ["startpage:wallpaper", "startpage:items", "startpage:groups", "startpage:gridGroup", "startpage:engine", "startpage:engines", "startpage:searchHistory", "startpage:showSearchHistory", "startpage:theme", "startpage:glassOpacity", "startpage:wallpaperBrightness", "startpage:wallpaperBlur"];
    for (const k of keys) {
      const v = localStorage.getItem(k);
      if (v !== null) {
        try {
          payload[k] = JSON.parse(v);
        } catch {
          payload[k] = v;
        }
      }
    }
    if (!payload["startpage:items"] && payload["startpage:groups"]) {
      payload["startpage:items"] = payload["startpage:groups"];
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `start-page-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const j = JSON.parse(String(reader.result)) as Record<string, unknown>;
        if (j["startpage:wallpaper"] !== undefined || j["startpage:items"] !== undefined) {
          for (const k of ["startpage:wallpaper", "startpage:items", "startpage:groups", "startpage:gridGroup", "startpage:engine", "startpage:engines", "startpage:searchHistory", "startpage:showSearchHistory", "startpage:theme", "startpage:glassOpacity", "startpage:wallpaperBrightness", "startpage:wallpaperBlur"]) {
            if (j[k] !== undefined) {
              const v = j[k];
              localStorage.setItem(k, typeof v === "string" ? v : JSON.stringify(v));
            }
          }
          window.dispatchEvent(new Event("wallpaper-change"));
          window.dispatchEvent(new Event("wallpaper-brightness-change"));
          window.dispatchEvent(new Event("wallpaper-blur-change"));
          window.dispatchEvent(new Event("search-history-change"));
          window.dispatchEvent(new Event("engine-change"));
          window.dispatchEvent(new Event("groups-change"));
          alert("已导入，刷新后生效");
        } else {
          const toSave = (j as { groups?: unknown }).groups ?? j;
          localStorage.setItem("startpage:items", JSON.stringify(toSave));
          alert("已导入（兼容模式），刷新后生效");
        }
      } catch {
        alert("JSON 解析失败");
      }
    };
    reader.readAsText(f);
    e.target.value = "";
  };

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">数据</h2>
      <p className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">采用本地 JSON 文件同步，无后端。导出后在另一设备导入即可。</p>
      <Section title="JSON 同步" desc="导出/导入包含壁纸、分组、搜索引擎与历史的 JSON 文件">
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={exportJson} className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white shadow hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100">
            导出 JSON
          </button>
          <label className="cursor-pointer rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700">
            导入 JSON
            <input type="file" accept="application/json" className="hidden" onChange={importJson} />
          </label>
        </div>
      </Section>
      <Section title="重置">
        <button
          type="button"
          onClick={() => {
            if (confirm("确定恢复默认？此操作将清空本地数据并刷新。")) {
              for (const k of ["startpage:groups", "startpage:items", "startpage:gridGroup", "startpage:engine", "startpage:engines", "startpage:wallpaper", "startpage:searchHistory", "startpage:showSearchHistory", "startpage:theme", "startpage:glassOpacity", "startpage:wallpaperBrightness", "startpage:wallpaperBlur"]) {
                localStorage.removeItem(k);
              }
              // 清理已废弃的玻璃模糊与 baseBlur 键
              localStorage.removeItem("startpage:glassBlur");
              localStorage.removeItem("startpage:wallpaperBaseBlur");
              location.reload();
            }
          }}
          className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
        >
          恢复默认
        </button>
      </Section>
    </div>
  );
}

function AboutPane() {
  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">关于</h2>
      <Section title="start-page" desc="Next.js 16 · React 19 · Tailwind · motion · 拟物玻璃">
        <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">Dock 已去快捷化，改为 壁纸 / 组件 / 设置 入口，后续组件可按需扩展。</p>
      </Section>
    </div>
  );
}
