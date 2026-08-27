"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { Wallpaper } from "@/components/wallpaper";
import { SearchBox } from "@/components/search-box";
import { DockBar } from "@/components/dock-bar";
import { Hitokoto } from "@/components/hitokoto";
import { AppGrid } from "@/components/app-grid";
import { DEFAULT_GROUPS } from "@/lib/data";

export default function Home() {
  const [now, setNow] = useState<Date | null>(null);
  const [searchFocused, setSearchFocused] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [gridGroupIdx, setGridGroupIdx] = useState(0);
  const [dotTipIdx, setDotTipIdx] = useState<number | null>(null);
  const reduce = useReducedMotion();

  // 分页点标签：tab 切换（点击/滚动）时弹出 1s 后隐藏，修复移动端 hover 常驻不收回
  useEffect(() => {
    if (!showGrid) {
      setDotTipIdx(null);
      return;
    }
    setDotTipIdx(gridGroupIdx);
    const t = setTimeout(() => setDotTipIdx(null), 1000);
    return () => clearTimeout(t);
  }, [gridGroupIdx, showGrid]);

  // 宫格 Tab 持久化：展开收起保持选中态
  useEffect(() => {
    const saved = localStorage.getItem("startpage:gridGroup");
    if (saved !== null) {
      const n = Number(saved);
      if (!Number.isNaN(n) && n >= 0 && n <= DEFAULT_GROUPS.length) setGridGroupIdx(n);
    }
  }, []);
  useEffect(() => {
    localStorage.setItem("startpage:gridGroup", String(gridGroupIdx));
  }, [gridGroupIdx]);

  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const hours = now ? String(now.getHours()).padStart(2, "0") : "";
  const minutes = now ? String(now.getMinutes()).padStart(2, "0") : "";
  const date = now?.toLocaleDateString("zh-CN", { month: "long", day: "numeric" }) ?? "";
  const weekday = now?.toLocaleDateString("zh-CN", { weekday: "long" }) ?? "";

  const blurred = searchFocused || showGrid;
  const hitokotoVisible = searchFocused && !showGrid;

  // 全局禁用右键菜单（保留自定义右键宫格）
  useEffect(() => {
    const handler = (e: MouseEvent) => e.preventDefault();
    document.addEventListener("contextmenu", handler);
    return () => document.removeEventListener("contextmenu", handler);
  }, []);

  return (
    <div
      className="relative flex min-h-[100dvh] flex-col"
      onContextMenu={(e) => {
        e.preventDefault();
        if (showGrid) return;
        if (searchFocused) return;
        const target = e.target as HTMLElement;
        // 仅当一言可见时才拦截其区域的右键；隐藏时允许穿透到壁纸以打开宫格（修复 display/visibility 导致的误拦截）
        if (
          target.closest("[data-search]") ||
          target.closest("[data-dock]") ||
          target.closest("[data-grid]") ||
          target.closest("[data-pagination]")
        ) {
          return;
        }
        if (hitokotoVisible && target.closest("[data-hitokoto]")) return;
        setShowGrid(true);
      }}
      onClick={(e) => {
        if (!showGrid) return;
        const target = e.target as HTMLElement;
        if (target.closest("[data-grid]") || target.closest("[data-dock]") || target.closest("[data-pagination]")) return;
        // 点击壁纸空白处回退
        setShowGrid(false);
      }}
    >
      <Wallpaper blurred={blurred} />

      <main className="relative z-10 flex min-h-0 flex-1 flex-col items-center px-4 pt-24 pb-24">
        <div className="text-center" aria-live="off">
          <time
            className="block select-none text-7xl font-extralight tracking-tight text-white tabular-nums drop-shadow-[0_2px_14px_rgba(0,0,0,0.22)] sm:text-7xl"
            aria-label={now ? `${hours}:${minutes}` : undefined}
          >
            {now ? (
              <span className="inline-flex items-center justify-center">
                <span>{hours}</span>
                <span className="mx-2 inline-flex flex-col items-center justify-center gap-2">
                  <span className="size-1.5 rounded-full bg-white shadow-[0_1px_6px_rgba(0,0,0,0.35)]" aria-hidden />
                  <span className="size-1.5 rounded-full bg-white shadow-[0_1px_6px_rgba(0,0,0,0.35)]" aria-hidden />
                </span>
                <span>{minutes}</span>
              </span>
            ) : (
              <span className="opacity-0">00:00</span>
            )}
          </time>
          <p className="mt-1 text-sm font-medium tracking-wide text-white/85 drop-shadow-[0_1px_6px_rgba(0,0,0,0.25)]">
            {now ? `${date} ${weekday}` : "\u00A0"}
          </p>
        </div>

        {/* 中央区域：搜索与宫格在时间下方、Dock 上方之间切换，柔和渐变 */}
        <div className="relative mt-6 flex min-h-[280px] w-full max-w-[880px] flex-col items-center">
          <AnimatePresence initial={false}>
            {!showGrid ? (
              <motion.div
                key="search"
                initial={reduce ? false : { opacity: 0, y: 10, filter: "blur(8px)" }}
                animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8, filter: "blur(6px)" }}
                transition={
                  reduce
                    ? { duration: 0.18 }
                    : {
                        opacity: { duration: 0.28, ease: [0.22, 1, 0.36, 1] },
                        y: { duration: 0.34, ease: [0.22, 1, 0.36, 1] },
                        filter: { duration: 0.3, ease: "easeOut" },
                      }
                }
                className="absolute inset-x-0 top-0 mx-auto w-full max-w-[520px] gpu"
                data-search
              >
                <SearchBox onFocusChange={setSearchFocused} />
              </motion.div>
            ) : (
              <motion.div
                key="grid"
                initial={reduce ? false : { opacity: 0, y: 12, filter: "blur(10px)" }}
                animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, y: 8, filter: "blur(8px)" }}
                transition={
                  reduce
                    ? { duration: 0.18 }
                    : {
                        opacity: { duration: 0.28, ease: [0.22, 1, 0.36, 1] },
                        y: { duration: 0.36, ease: [0.22, 1, 0.36, 1] },
                        filter: { duration: 0.32, ease: "easeOut" },
                      }
                }
                className="absolute inset-x-0 top-0 mx-auto flex w-full max-w-[880px] flex-col items-center gpu"
                data-grid
              >
                <AppGrid open={showGrid} onClose={() => setShowGrid(false)} groupIdx={gridGroupIdx} onGroupChange={setGridGroupIdx} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* 分页圆点：固定于 Dock 顶部居中，不随图标高度变化（置于 page 根下避免被内部 gpu/transform 截获为包含块） */}
      {showGrid && (
        <div className="pointer-events-none fixed inset-x-0 bottom-[102px] z-20 flex justify-center px-4" data-pagination>
          <div className="pointer-events-auto flex items-center justify-center gap-2.5">
            {["全部", ...DEFAULT_GROUPS.map((g) => g.title)].map((title, idx) => (
              <div key={title} className="relative flex items-center justify-center">
                <button
                  aria-label={title}
                  aria-current={idx === gridGroupIdx ? "true" : undefined}
                  onClick={(e) => {
                    e.stopPropagation();
                    setGridGroupIdx(idx);
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  className={
                    idx === gridGroupIdx
                      ? "h-2 w-6 rounded-full bg-white shadow-[0_1px_6px_rgba(0,0,0,0.25)] transition-all duration-300 ease-[var(--spring)]"
                      : "size-2 rounded-full bg-white/45 backdrop-blur transition-all duration-300 ease-[var(--spring)] hover:bg-white/70"
                  }
                />
                <div
                  className={`pointer-events-none absolute left-1/2 top-[calc(100%+6px)] -translate-x-1/2 whitespace-nowrap rounded-full bg-zinc-900 px-2.5 py-1 text-xs font-medium text-white shadow-[0_4px_16px_rgba(0,0,0,0.2)] transition-all duration-200 ${
                    dotTipIdx === idx ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"
                  }`}
                >
                  {title}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 一言：仅聚焦时展示，常驻挂载避免重复请求，带位移与模糊的柔和渐变
          修复：隐藏时使用 visibility:hidden + pointer-events:none（而非仅 opacity），使右键可穿透到壁纸打开宫格；显示时恢复交互。不改变布局与动效，fixed定位不受 display/visibility 影响。 */}
      <div
        data-hitokoto
        {...(hitokotoVisible ? { "data-visible": "" } : {})}
        aria-hidden={!hitokotoVisible}
        className={`gpu pointer-events-none fixed inset-x-0 bottom-[84px] z-40 flex justify-center px-4 transition-[opacity,transform,filter,visibility] duration-[520ms] ease-[var(--spring)] ${
          hitokotoVisible ? "opacity-100 translate-y-0 blur-0" : "opacity-0 translate-y-2 blur-[6px]"
        }`}
        style={{ visibility: hitokotoVisible ? "visible" : "hidden" }}
      >
        <div className={`w-full max-w-[520px] ${hitokotoVisible ? "pointer-events-auto" : "pointer-events-none"}`}>
          <Hitokoto />
        </div>
      </div>

      <div data-dock>
        <DockBar isGridOpen={showGrid} onToggleGrid={() => setShowGrid((v) => !v)} />
      </div>
    </div>
  );
}
