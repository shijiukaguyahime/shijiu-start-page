"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { CopyIcon, MagnifyingGlassIcon, DotsThreeIcon } from "@phosphor-icons/react";
import { SEARCH_ENGINES } from "@/lib/data";
import { cn } from "@/lib/utils";
import { limeDropdownMotion, useClickOutside } from "@/lib/hooks";

type Hitokoto = {
  hitokoto: string;
  from: string;
  from_who: string | null;
};

export function Hitokoto() {
  const [data, setData] = useState<Hitokoto | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    let cancelled = false;
    fetch("https://v1.hitokoto.cn/?encode=json")
      .then((r) => r.json())
      .then((j) => {
        if (!cancelled) setData({ hitokoto: j.hitokoto, from: j.from, from_who: j.from_who });
      })
      .catch(() => {
        if (!cancelled) setData({ hitokoto: "愿你遍历山河，觉得人间值得。", from: "人间值得", from_who: null });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // 统一点击外部关闭：判定以整个一言容器（含按钮与下拉）为边界，外部 mousedown 即收起
  useClickOutside(
    containerRef as React.RefObject<HTMLElement | null>,
    () => setShowMenu(false),
    showMenu,
  );

  if (!data) return null;

  const source = data.from_who ? `${data.from} · ${data.from_who}` : data.from;
  const fullText = data.hitokoto;

  function handleCopy(e: React.MouseEvent) {
    e.stopPropagation();
    navigator.clipboard.writeText(fullText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      setShowMenu(false);
    });
  }

  function handleSearch(e: React.MouseEvent) {
    e.stopPropagation();
    const saved = typeof window !== "undefined" ? localStorage.getItem("startpage:engine") : null;
    const eng = SEARCH_ENGINES.find((x) => x.id === saved) ?? SEARCH_ENGINES[0];
    window.open(eng.url.replace("{q}", encodeURIComponent(fullText)), "_blank", "noopener");
    setShowMenu(false);
  }

  return (
    <div
      ref={containerRef}
      className="group relative w-full"
      onMouseLeave={() => setShowMenu(false)}
      // 关键：点击一言任意区域不让搜索输入框失焦（左键点击下拉框不再取消聚焦），通过 preventDefault 阻止 mousedown 抢焦点
      onMouseDown={(e) => e.preventDefault()}
      data-hitokoto-menu
    >
      <div
        className={cn(
          "relative w-full rounded-2xl px-4 py-4 text-center transition-all duration-500",
          "bg-transparent",
          "group-hover:bg-white/20 group-hover:backdrop-blur-[18px] group-hover:backdrop-saturate-[160%] group-hover:shadow-[0_8px_32px_rgba(0,0,0,0.12)] dark:group-hover:bg-white/10 dark:group-hover:shadow-[0_8px_32px_rgba(0,0,0,0.4)]",
        )}
      >
        <p className="text-center text-sm font-medium leading-relaxed text-white drop-shadow-[0_1px_8px_rgba(0,0,0,0.35)]">
          {fullText}
        </p>
        <p className="pointer-events-none mt-1.5 text-center text-xs font-medium tracking-wide text-white/80 opacity-0 drop-shadow-[0_1px_6px_rgba(0,0,0,0.3)] transition-opacity duration-500 group-hover:opacity-100">
          -- {source}
        </p>

        <div className="absolute right-2 top-2 z-20">
          <button
            type="button"
            aria-label="一言选项"
            aria-haspopup="menu"
            aria-expanded={showMenu}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu((v) => !v);
            }}
            className="relative z-20 flex size-7 items-center justify-center rounded-full bg-white/70 text-zinc-600 opacity-0 shadow-sm ring-1 ring-black/5 transition-all duration-300 hover:bg-white hover:text-zinc-900 group-hover:opacity-100"
          >
            <DotsThreeIcon weight="bold" className="size-4" aria-hidden />
          </button>

          <AnimatePresence>
            {showMenu && (
              <motion.ul
                role="menu"
                initial={reduce ? { opacity: 0 } : (limeDropdownMotion.initial as unknown as never)}
                animate={reduce ? { opacity: 1 } : (limeDropdownMotion.animate as unknown as never)}
                exit={reduce ? { opacity: 0 } : (limeDropdownMotion.exit as unknown as never)}
                transition={reduce ? ({ duration: 0.14 } as unknown as never) : (limeDropdownMotion.transition as unknown as never)}
                style={{ transformOrigin: "top right" }}
                // 阻止点击下拉内部冒泡到 document/page 的空白处收起宫格逻辑
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                className="dropdown-panel gpu absolute bottom-auto left-auto right-[calc(100%+8px)] top-0 z-30 w-[148px] origin-top-right overflow-hidden rounded-2xl p-1.5 md:bottom-auto md:left-auto md:right-0 md:top-[calc(100%+8px)]"
              >
                <li role="none">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleCopy}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-900/5 dark:text-zinc-300 dark:hover:bg-white/10 dark:hover:text-zinc-100"
                  >
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-white/70 text-zinc-600 shadow-sm ring-1 ring-black/5">
                      <CopyIcon weight="bold" className="size-3.5" aria-hidden />
                    </span>
                    {copied ? "已复制" : "复制"}
                  </button>
                </li>
                <li role="none">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleSearch}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-900/5 dark:text-zinc-300 dark:hover:bg-white/10 dark:hover:text-zinc-100"
                  >
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-white/70 text-zinc-600 shadow-sm ring-1 ring-black/5">
                      <MagnifyingGlassIcon weight="bold" className="size-3.5" aria-hidden />
                    </span>
                    搜索
                  </button>
                </li>
              </motion.ul>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
