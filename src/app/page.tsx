"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { Wallpaper } from "@/components/wallpaper";
import { SearchBox } from "@/components/search-box";
import { DockBar } from "@/components/dock-bar";
import { Hitokoto } from "@/components/hitokoto";
import { AppGrid } from "@/components/app-grid";

export default function Home() {
  const [now, setNow] = useState<Date | null>(null);
  const [searchFocused, setSearchFocused] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const reduce = useReducedMotion();

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

  // 全局禁用右键菜单
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
        if (target.closest("[data-search]") || target.closest("[data-dock]") || target.closest("[data-hitokoto]") || target.closest("[data-grid]")) {
          return;
        }
        setShowGrid(true);
      }}
      onClick={(e) => {
        if (!showGrid) return;
        const target = e.target as HTMLElement;
        if (target.closest("[data-grid]") || target.closest("[data-dock]")) return;
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
                initial={
                  reduce ? false : { opacity: 0, y: 10, filter: "blur(8px)" }
                }
                animate={
                  reduce ? { opacity: 1 } : { opacity: 1, y: 0, filter: "blur(0px)" }
                }
                exit={
                  reduce ? { opacity: 0 } : { opacity: 0, y: -8, filter: "blur(6px)" }
                }
                transition={
                  reduce
                    ? { duration: 0.18 }
                    : {
                        opacity: { duration: 0.28, ease: [0.22, 1, 0.36, 1] },
                        y: { duration: 0.34, ease: [0.22, 1, 0.36, 1] },
                        filter: { duration: 0.3, ease: "easeOut" },
                      }
                }
                style={{ willChange: "transform, opacity, filter" }}
                className="absolute inset-x-0 top-0 mx-auto w-full max-w-[520px] will-change-transform [backface-visibility:hidden]"
                data-search
              >
                <SearchBox onFocusChange={setSearchFocused} />
              </motion.div>
            ) : (
              <motion.div
                key="grid"
                initial={
                  reduce ? false : { opacity: 0, y: 12, filter: "blur(10px)" }
                }
                animate={
                  reduce ? { opacity: 1 } : { opacity: 1, y: 0, filter: "blur(0px)" }
                }
                exit={
                  reduce ? { opacity: 0 } : { opacity: 0, y: 8, filter: "blur(8px)" }
                }
                transition={
                  reduce
                    ? { duration: 0.18 }
                    : {
                        opacity: { duration: 0.28, ease: [0.22, 1, 0.36, 1] },
                        y: { duration: 0.36, ease: [0.22, 1, 0.36, 1] },
                        filter: { duration: 0.32, ease: "easeOut" },
                      }
                }
                style={{ willChange: "transform, opacity, filter" }}
                className="absolute inset-x-0 top-0 mx-auto flex w-full max-w-[880px] flex-col items-center will-change-transform [backface-visibility:hidden]"
                data-grid
              >
                <AppGrid open={showGrid} onClose={() => setShowGrid(false)} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* 一言：仅聚焦时展示，常驻挂载避免重复请求，带位移与模糊的柔和渐变 */}
      <div
        data-hitokoto
        className={`pointer-events-none fixed inset-x-0 bottom-[84px] z-40 flex justify-center px-4 transition-[opacity,transform,filter] duration-[520ms] ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform [backface-visibility:hidden] ${searchFocused && !showGrid ? "opacity-100 translate-y-0 blur-0" : "pointer-events-none opacity-0 translate-y-2 blur-[6px]"}`}
        style={{ willChange: "transform, opacity, filter" }}
      >
        <div className="w-full max-w-[520px] pointer-events-auto">
          <Hitokoto />
        </div>
      </div>

      <div data-dock>
        <DockBar isGridOpen={showGrid} onToggleGrid={() => setShowGrid((v) => !v)} />
      </div>
    </div>
  );
}
