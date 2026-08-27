"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { MagnifyingGlassIcon, XIcon } from "@phosphor-icons/react";
import { SEARCH_ENGINES, type SearchEngine } from "@/lib/data";
import { cn } from "@/lib/utils";
import { limeDropdownMotion, useClickOutside } from "@/lib/hooks";

const ENGINE_KEY = "startpage:engine";

function isLikelyUrl(q: string) {
  return /^(https?:\/\/)?([\w-]+\.)+[a-z]{2,}(:\d+)?(\/\S*)?$/i.test(q.trim());
}

type Props = {
  onFocusChange?: (focused: boolean) => void;
};

export function SearchBox({ onFocusChange }: Props) {
  const [query, setQuery] = useState("");
  const [showEngines, setShowEngines] = useState(false);
  const [engine, setEngine] = useState<SearchEngine>(SEARCH_ENGINES[0]);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    const saved = localStorage.getItem(ENGINE_KEY);
    const found = SEARCH_ENGINES.find((e) => e.id === saved);
    if (found) setEngine(found);
  }, []);

  const isActive = focused || showEngines;
  const hasQuery = query.length > 0;
  const showClear = isActive && hasQuery;
  useEffect(() => {
    onFocusChange?.(isActive);
  }, [isActive, onFocusChange]);

  // 统一外部点击：以 wrapper（含输入框与下拉）为边界，外部 mousedown 即收起；点击一言区域仅收起引擎下拉但保持输入框聚焦（修复左键点击一言下拉导致失焦）
  useClickOutside(
    wrapperRef as React.RefObject<HTMLElement | null>,
    (e) => {
      if (!isActive) return;
      const target = (e?.target as HTMLElement | null) ?? null;
      const hitHitokoto = !!target?.closest?.("[data-hitokoto]") || !!target?.closest?.("[data-hitokoto-menu]");
      setShowEngines(false);
      if (hitHitokoto) {
        // 一言区域的点击仅关闭引擎列表，不取消搜索聚焦；兜底重新聚焦输入框
        setTimeout(() => inputRef.current?.focus(), 0);
        return;
      }
      setFocused(false);
      inputRef.current?.blur();
    },
    isActive,
  );

  function pickEngine(e: SearchEngine) {
    setEngine(e);
    localStorage.setItem(ENGINE_KEY, e.id);
    setShowEngines(false);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function clearQuery() {
    setQuery("");
    // 保持聚焦，避免触发一言隐藏
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function submit() {
    const q = query.trim();
    if (!q) {
      inputRef.current?.focus();
      return;
    }
    if (isLikelyUrl(q)) {
      const url = /^https?:\/\//i.test(q) ? q : `https://${q}`;
      window.open(url, "_blank", "noopener");
    } else {
      window.open(engine.url.replace("{q}", encodeURIComponent(q)), "_blank", "noopener");
    }
  }

  function handleContainerMouseDown(e: React.MouseEvent) {
    if (e.target === containerRef.current) {
      e.preventDefault();
      inputRef.current?.focus();
    }
  }

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div
        ref={containerRef}
        role="search"
        aria-label="搜索"
        onMouseDown={handleContainerMouseDown}
        className={cn(
          "flex items-center gap-1.5 rounded-full glass-search gpu p-1",
          "transition-[background-color,box-shadow,transform,border-color] duration-[380ms] ease-[var(--spring)]",
          isActive && "glass-search--focused -translate-y-[3px] shadow-[0_12px_40px_rgba(0,0,0,0.14)]",
        )}
      >
        <button
          type="button"
          aria-label={`搜索引擎：${engine.label}`}
          aria-haspopup="listbox"
          aria-expanded={showEngines}
          tabIndex={isActive ? 0 : -1}
          onClick={(e) => {
            e.stopPropagation();
            setShowEngines((v) => !v);
          }}
          className={cn(
            "gpu flex shrink-0 items-center justify-center overflow-hidden rounded-full aspect-square",
            "transition-[width,opacity,transform,filter] duration-[340ms] ease-[var(--spring)]",
            isActive ? "w-9 opacity-100 scale-100 blur-0 translate-x-0" : "w-0 opacity-0 scale-[0.82] blur-[5px] -translate-x-1 pointer-events-none",
          )}
        >
          <span
            className="flex size-7 shrink-0 items-center justify-center rounded-full bg-white/70 text-[11px] font-bold tracking-wide text-zinc-600 shadow-sm ring-1 ring-black/5"
            aria-hidden
          >
            {engine.icon.slice(0, 1)}
          </span>
        </button>

        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setTimeout(() => {
              const active = document.activeElement as HTMLElement | null;
              if (wrapperRef.current?.contains(active)) return;
              if (active?.closest?.("[data-hitokoto]") || active?.closest?.("[data-hitokoto-menu]")) return;
              setFocused(false);
            }, 120);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
            if (e.key === "Escape") {
              setShowEngines(false);
              (e.target as HTMLInputElement).blur();
            }
          }}
          placeholder="搜索"
          aria-label="搜索关键词或网址"
          autoComplete="off"
          spellCheck={false}
          className="h-9 min-w-0 flex-1 bg-transparent px-2 text-[15px] font-medium text-zinc-800 placeholder:text-zinc-400 focus:outline-none"
        />

        <button
          type="button"
          aria-label="清空搜索内容"
          tabIndex={showClear ? 0 : -1}
          aria-hidden={!showClear}
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => {
            e.stopPropagation();
            clearQuery();
          }}
          className={cn(
            "gpu flex shrink-0 items-center justify-center overflow-hidden rounded-full aspect-square text-black/50 shadow-sm hover:bg-black/20 hover:text-white active:scale-[0.96]",
            "transition-[width,opacity,transform,filter] duration-[340ms] ease-[var(--spring)]",
            showClear ? "w-6 opacity-100 scale-100 blur-0 translate-x-0" : "w-0 opacity-0 scale-[0.82] blur-[5px] translate-x-1 pointer-events-none",
          )}
        >
          <XIcon weight="bold" className="size-[12px] shrink-0" aria-hidden />
        </button>

        <button
          type="button"
          aria-label="搜索"
          tabIndex={isActive ? 0 : -1}
          onClick={submit}
          className={cn(
            "gpu flex shrink-0 items-center justify-center overflow-hidden rounded-full aspect-square text-black/50 shadow-sm hover:bg-black/80 hover:text-white active:scale-[0.96]",
            "transition-[width,opacity,transform,filter] duration-[340ms] ease-[var(--spring)] delay-[28ms]",
            isActive ? "w-9 opacity-100 scale-100 blur-0 translate-x-0" : "w-0 opacity-0 scale-[0.82] blur-[5px] translate-x-1 pointer-events-none",
          )}
        >
          <MagnifyingGlassIcon weight="bold" className="size-[18px] shrink-0" aria-hidden />
        </button>
      </div>

      <AnimatePresence>
        {showEngines && (
          <motion.ul
            role="listbox"
            aria-label="选择搜索引擎"
            initial={reduce ? { opacity: 0 } : (limeDropdownMotion.initial as unknown as never)}
            animate={reduce ? { opacity: 1 } : (limeDropdownMotion.animate as unknown as never)}
            exit={reduce ? { opacity: 0 } : (limeDropdownMotion.exit as unknown as never)}
            transition={reduce ? ({ duration: 0.14 } as unknown as never) : (limeDropdownMotion.transition as unknown as never)}
            style={{ transformOrigin: "top left" }}
            onClick={(e) => e.stopPropagation()}
            className="dropdown-panel gpu absolute left-0 top-[calc(100%+8px)] z-20 w-[168px] origin-top-left overflow-hidden rounded-2xl p-1.5"
          >
            {SEARCH_ENGINES.map((eng) => (
              <li key={eng.id} role="option" aria-selected={eng.id === engine.id}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => {
                    e.stopPropagation();
                    pickEngine(eng);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm font-medium transition-colors",
                    eng.id === engine.id ? "bg-zinc-900 text-white" : "text-zinc-700 hover:bg-zinc-900/5",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold shadow-sm ring-1",
                      eng.id === engine.id ? "bg-white text-zinc-900 ring-white/20" : "bg-white/70 text-zinc-600 ring-black/5",
                    )}
                    aria-hidden
                  >
                    {eng.icon.slice(0, 1)}
                  </span>
                  {eng.label}
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
