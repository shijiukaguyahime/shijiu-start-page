"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { MagnifyingGlassIcon, XIcon, ClockIcon } from "@phosphor-icons/react";
import { SEARCH_ENGINES, type SearchEngine } from "@/lib/data";
import { cn } from "@/lib/utils";
import { limeDropdownMotion, useClickOutside } from "@/lib/hooks";

const ENGINE_KEY = "startpage:engine";
const HISTORY_KEY = "startpage:searchHistory";

function isLikelyUrl(q: string) {
  return /^(https?:\/\/)?([\w-]+\.)+[a-z]{2,}(:\d+)?(\/\S*)?$/i.test(q.trim());
}

function loadHistory(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function saveHistory(q: string) {
  if (!q.trim()) return;
  const cur = loadHistory();
  const next = [q.trim(), ...cur.filter((x) => x !== q.trim())].slice(0, 20);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event("search-history-change"));
}

type Props = {
  onFocusChange?: (focused: boolean) => void;
};

export function SearchBox({ onFocusChange }: Props) {
  const [query, setQuery] = useState("");
  const [showEngines, setShowEngines] = useState(false);
  const [engines, setEngines] = useState<SearchEngine[]>(SEARCH_ENGINES);
  const [engine, setEngine] = useState<SearchEngine>(SEARCH_ENGINES[0]);
  const [focused, setFocused] = useState(false);
  const [history, setHistory] = useState<string[]>(() => loadHistory());
  const [showHistoryEnabled, setShowHistoryEnabled] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const v = localStorage.getItem("startpage:showSearchHistory");
    return v === null ? true : v === "true";
  });
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  const loadEngines = () => {
    try {
      const raw = localStorage.getItem("startpage:engines");
      if (raw) {
        const arr = JSON.parse(raw) as SearchEngine[];
        if (Array.isArray(arr) && arr.length) {
          setEngines(arr);
          const saved = localStorage.getItem(ENGINE_KEY);
          const found = arr.find((e) => e.id === saved);
          if (found) setEngine(found);
          else setEngine(arr[0]);
          return;
        }
      }
    } catch {}
    const saved = localStorage.getItem(ENGINE_KEY);
    const found = SEARCH_ENGINES.find((e) => e.id === saved);
    if (found) setEngine(found);
    else setEngines(SEARCH_ENGINES);
  };

  useEffect(() => {
    loadEngines();
    setHistory(loadHistory());
    const v = localStorage.getItem("startpage:showSearchHistory");
    setShowHistoryEnabled(v === null ? true : v === "true");
    const onHistory = () => {
      setHistory(loadHistory());
      const vv = localStorage.getItem("startpage:showSearchHistory");
      setShowHistoryEnabled(vv === null ? true : vv === "true");
    };
    const onEngine = () => loadEngines();
    window.addEventListener("storage", onHistory);
    window.addEventListener("search-history-change" as never, onHistory);
    window.addEventListener("engine-change" as never, onEngine);
    window.addEventListener("storage", onEngine);
    return () => {
      window.removeEventListener("storage", onHistory);
      window.removeEventListener("search-history-change" as never, onHistory);
      window.removeEventListener("engine-change" as never, onEngine);
      window.removeEventListener("storage", onEngine);
    };
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

  function pickHistory(q: string) {
    setQuery(q);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function removeHistory(q: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const next = history.filter((x) => x !== q);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
    setHistory(next);
    window.dispatchEvent(new Event("search-history-change"));
  }

  function clearAllHistory(e?: React.MouseEvent) {
    e?.preventDefault();
    e?.stopPropagation();
    localStorage.removeItem(HISTORY_KEY);
    setHistory([]);
    window.dispatchEvent(new Event("search-history-change"));
  }

  function submit() {
    const q = query.trim();
    if (!q) {
      inputRef.current?.focus();
      return;
    }
    saveHistory(q);
    setHistory(loadHistory());
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
            className="flex size-7 shrink-0 items-center justify-center rounded-full bg-white/70 text-[11px] font-bold tracking-wide text-zinc-600 shadow-sm ring-1 ring-black/5 dark:bg-zinc-700 dark:text-zinc-300 dark:ring-white/10"
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
          className="h-9 min-w-0 flex-1 bg-transparent px-2 text-[15px] font-medium text-zinc-800 placeholder:text-zinc-400 focus:outline-none dark:text-white dark:placeholder:text-white"
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
            "gpu flex shrink-0 items-center justify-center overflow-hidden rounded-full aspect-square text-black/50 shadow-sm hover:bg-black/20 hover:text-white active:scale-[0.96] dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white",
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
            "gpu flex shrink-0 items-center justify-center overflow-hidden rounded-full aspect-square text-black/50 shadow-sm hover:bg-black/80 hover:text-white active:scale-[0.96] dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white",
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
            {engines.map((eng) => (
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
                    eng.id === engine.id
                      ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                      : "text-zinc-700 hover:bg-zinc-900/5 dark:text-zinc-300 dark:hover:bg-white/10 dark:hover:text-zinc-100",
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

      <AnimatePresence>
        {!showEngines && isActive && !hasQuery && showHistoryEnabled && history.length > 0 && (
          <motion.div
            role="listbox"
            aria-label="搜索历史"
            initial={reduce ? { opacity: 0 } : (limeDropdownMotion.initial as unknown as never)}
            animate={reduce ? { opacity: 1 } : (limeDropdownMotion.animate as unknown as never)}
            exit={reduce ? { opacity: 0 } : (limeDropdownMotion.exit as unknown as never)}
            transition={reduce ? ({ duration: 0.14 } as unknown as never) : (limeDropdownMotion.transition as unknown as never)}
            style={{ transformOrigin: "top left" }}
            onClick={(e) => e.stopPropagation()}
            className="dropdown-panel gpu absolute left-0 top-[calc(100%+8px)] z-20 w-full origin-top-left overflow-hidden rounded-2xl p-1.5"
          >
            <div className="flex items-center justify-between px-2 py-1">
              <span className="text-xs font-medium text-zinc-500">搜索历史</span>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={clearAllHistory}
                className="rounded-full px-2 py-0.5 text-xs font-medium text-zinc-500 hover:bg-zinc-900/5 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-zinc-200"
              >
                清空
              </button>
            </div>
            <ul className="mt-1 space-y-1">
              {history.slice(0, 8).map((q) => (
                <li key={q} role="option">
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => pickHistory(q)}
                    className="group flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-900/5 dark:text-zinc-300 dark:hover:bg-white/10 dark:hover:text-zinc-100"
                  >
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-white/70 text-zinc-500 shadow-sm ring-1 ring-black/5">
                      <ClockIcon weight="regular" className="size-4" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1 truncate">{q}</span>
                    <span
                      role="button"
                      tabIndex={-1}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={(e) => removeHistory(q, e)}
                      className="flex size-6 shrink-0 items-center justify-center rounded-full text-zinc-400 opacity-0 transition-all hover:bg-zinc-900/10 hover:text-zinc-700 group-hover:opacity-100"
                      aria-label={`删除 ${q}`}
                    >
                      <XIcon weight="bold" className="size-3.5" />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
