"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { MagnifyingGlassIcon, XIcon, ClockIcon, PlusIcon } from "@phosphor-icons/react";
import { SEARCH_ENGINES, type SearchEngine } from "@/lib/data";
import { cn } from "@/lib/utils";
import { limeDropdownMotion, useClickOutside } from "@/lib/hooks";
import { ESC_PRIORITY, focusFirstNavItem, focusLastNavItem, useArrowNavigation, useEscapeLayer } from "@/lib/keyboard";
import { EngineFormModal } from "@/components/ui/engine-form-modal";
import {
  ENGINE_KEY,
  clearHistory as clearStoredHistory,
  createCustomEngine,
  loadEngineId,
  loadEngines,
  loadHistory,
  loadShowHistory,
  removeHistory as removeStoredHistory,
  resolveEngine,
  saveEngines,
  saveHistory,
} from "@/lib/search";

const REVEAL_BASE = "gpu flex shrink-0 items-center justify-center overflow-hidden rounded-full aspect-square transition-[width,opacity,transform,filter] duration-[340ms] ease-[var(--spring)]";
const REVEAL_SHOWN = "opacity-100 scale-100 blur-0 translate-x-0";
const REVEAL_HIDDEN = "opacity-0 scale-[0.82] blur-[5px] pointer-events-none";

function isLikelyUrl(q: string) {
  return /^(https?:\/\/)?([\w-]+\.)+[a-z]{2,}(:\d+)?(\/\S*)?$/i.test(q.trim());
}

type Props = {
  onFocusChange?: (focused: boolean) => void;
};

export type SearchBoxHandle = {
  /** 供首页全局热键调用；prefill 会写入输入框 */
  focus: (prefill?: string) => void;
};

export const SearchBox = forwardRef<SearchBoxHandle, Props>(function SearchBox({ onFocusChange }, ref) {
  const [query, setQuery] = useState("");
  const [showEngines, setShowEngines] = useState(false);
  const [engines, setEngines] = useState<SearchEngine[]>(SEARCH_ENGINES);
  const [engine, setEngine] = useState<SearchEngine>(SEARCH_ENGINES[0]);
  const [focused, setFocused] = useState(false);
  const [history, setHistory] = useState<string[]>(() => loadHistory());
  const [showHistoryEnabled, setShowHistoryEnabled] = useState<boolean>(() => loadShowHistory());
  const [showAddEngine, setShowAddEngine] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const enginePanelRef = useRef<HTMLDivElement>(null);
  const historyPanelRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  useImperativeHandle(ref, () => ({
    focus(prefill?: string) {
      if (prefill !== undefined) setQuery(prefill);
      requestAnimationFrame(() => inputRef.current?.focus());
    },
  }));

  const applyEngineConfig = () => {
    const list = loadEngines();
    setEngines(list);
    setEngine(resolveEngine(list, loadEngineId()));
  };

  useEffect(() => {
    applyEngineConfig();
    setHistory(loadHistory());
    setShowHistoryEnabled(loadShowHistory());
    const onHistory = () => {
      setHistory(loadHistory());
      setShowHistoryEnabled(loadShowHistory());
    };
    const onEngine = () => applyEngineConfig();
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

  // 统一外部点击：以 wrapper（含输入框与下拉）为边界，外部 mousedown 即收起；点击一言/天气/日历区域仅收起引擎下拉但保持输入框聚焦
  useClickOutside(
    wrapperRef as React.RefObject<HTMLElement | null>,
    (e) => {
      if (!isActive) return;
      const target = (e?.target as HTMLElement | null) ?? null;
      const hitHitokoto = !!target?.closest?.("[data-hitokoto]") || !!target?.closest?.("[data-hitokoto-menu]");
      const hitWeatherCalendar = !!target?.closest?.("[data-weather]") || !!target?.closest?.("[data-calendar]");
      setShowEngines(false);
      if (hitHitokoto || hitWeatherCalendar) {
        // 天气/日历/一言区域的点击仅关闭引擎列表，不取消搜索聚焦；兜底重新聚焦输入框
        setTimeout(() => inputRef.current?.focus(), 0);
        return;
      }
      setFocused(false);
      inputRef.current?.blur();
    },
    isActive,
    // 弹窗经 portal 挂到 body，不在 wrapper 内；忽略其点击，避免打开表单时搜索框收起
    { ignoreSelectors: ["[data-modal]"] },
  );

  const focusInput = () => requestAnimationFrame(() => inputRef.current?.focus());
  const showHistory = !showEngines && !showAddEngine && isActive && !hasQuery && showHistoryEnabled && history.length > 0;

  // Esc 分层：先收下拉，再失焦回首页（不再一次 Esc 全退）
  // 下拉内上下键选引擎/历史项；走到顶端再往上或末端再往下，焦点还给输入框。
  // autoEnter + enterFrom：焦点还停在左侧引擎按钮或输入框上时（点开下拉后焦点不一定在 input），
  // 直接按上下键也能进入列表，否则会出现“下拉开着但方向键毫无反应”
  useArrowNavigation(enginePanelRef, {
    enabled: showEngines,
    orientation: "vertical",
    autoEnter: true,
    enterFrom: "[data-search]",
    onExit: (dir) => {
      if (dir === "up" || dir === "down") focusInput();
    },
  });
  useArrowNavigation(historyPanelRef, {
    enabled: showHistory,
    orientation: "vertical",
    autoEnter: true,
    enterFrom: "[data-search]",
    onExit: (dir) => {
      if (dir === "up" || dir === "down") focusInput();
    },
  });

  useEscapeLayer("search-engines", showEngines, () => {
    setShowEngines(false);
    focusInput();
  }, ESC_PRIORITY.menu);
  useEscapeLayer("search", isActive && !showEngines && !showAddEngine, () => {
    setFocused(false);
    inputRef.current?.blur();
  }, ESC_PRIORITY.search);

  function pickEngine(e: SearchEngine) {
    setEngine(e);
    localStorage.setItem(ENGINE_KEY, e.id);
    setShowEngines(false);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function addCustomEngine(data: { label: string; url: string; icon: string }) {
    const created = createCustomEngine(data);
    // 先写选中 id 再广播 engine-change，使监听方一次拿到新列表与选中项
    localStorage.setItem(ENGINE_KEY, created.id);
    saveEngines([...loadEngines(), created]);
    setShowAddEngine(false);
  }

  function closeAddEngine() {
    setShowAddEngine(false);
    requestAnimationFrame(() => inputRef.current?.focus());
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
    setHistory(removeStoredHistory(q));
  }

  function clearAllHistory(e?: React.MouseEvent) {
    e?.preventDefault();
    e?.stopPropagation();
    clearStoredHistory();
    setHistory([]);
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
          className={cn(REVEAL_BASE, isActive ? `w-9 ${REVEAL_SHOWN}` : `w-0 -translate-x-1 ${REVEAL_HIDDEN}`)}
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
              if (active?.closest?.("[data-weather]") || active?.closest?.("[data-calendar]")) return;
              setFocused(false);
            }, 120);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
            // ↓ 进列表首项、↑ 进列表末项；下拉关着时左右键仍留给光标，此处不处理
            if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
            const panel = showEngines ? enginePanelRef : showHistory ? historyPanelRef : null;
            if (!panel) return;
            e.preventDefault();
            if (e.key === "ArrowDown") focusFirstNavItem(panel);
            else focusLastNavItem(panel);
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
            REVEAL_BASE,
            "text-black/50 shadow-sm hover:bg-black/20 hover:text-white active:scale-[0.96] dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white",
            showClear ? `w-6 ${REVEAL_SHOWN}` : `w-0 translate-x-1 ${REVEAL_HIDDEN}`,
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
            REVEAL_BASE,
            "text-black/50 shadow-sm hover:bg-black/80 hover:text-white active:scale-[0.96] dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white delay-[28ms]",
            isActive ? `w-9 ${REVEAL_SHOWN}` : `w-0 translate-x-1 ${REVEAL_HIDDEN}`,
          )}
        >
          <MagnifyingGlassIcon weight="bold" className="size-[18px] shrink-0" aria-hidden />
        </button>
      </div>

      <AnimatePresence>
        {showEngines && (
          <motion.div
            ref={enginePanelRef}
            initial={reduce ? { opacity: 0 } : (limeDropdownMotion.initial as unknown as never)}
            animate={reduce ? { opacity: 1 } : (limeDropdownMotion.animate as unknown as never)}
            exit={reduce ? { opacity: 0 } : (limeDropdownMotion.exit as unknown as never)}
            transition={reduce ? ({ duration: 0.14 } as unknown as never) : (limeDropdownMotion.transition as unknown as never)}
            style={{ transformOrigin: "top left" }}
            onClick={(e) => e.stopPropagation()}
            className="dropdown-panel gpu absolute left-0 top-[calc(100%+8px)] z-20 flex max-h-[min(60vh,340px)] w-[168px] origin-top-left flex-col overflow-hidden rounded-2xl"
          >
            <ul role="listbox" aria-label="选择搜索引擎" className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1.5">
              {engines.map((eng) => (
                <li key={eng.id} role="option" aria-selected={eng.id === engine.id}>
                  <button
                    type="button"
                    data-nav-item
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
                    <span className="min-w-0 flex-1 truncate">{eng.label}</span>
                  </button>
                </li>
              ))}
            </ul>
            <div className="shrink-0 border-t border-zinc-200 p-1.5 dark:border-white/10">
              <button
                type="button"
                data-nav-item
                aria-haspopup="dialog"
                onMouseDown={(e) => e.preventDefault()}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowEngines(false);
                  setShowAddEngine(true);
                }}
                className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm font-medium text-zinc-500 transition-colors hover:bg-zinc-900/5 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-zinc-100"
              >
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-white/70 text-zinc-500 shadow-sm ring-1 ring-black/5 dark:bg-zinc-700 dark:text-zinc-300 dark:ring-white/10" aria-hidden>
                  <PlusIcon weight="bold" className="size-3.5" />
                </span>
                添加自定义
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showHistory && (
          <motion.div
            ref={historyPanelRef}
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
                data-nav-item
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
                    data-nav-item
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

      <EngineFormModal open={showAddEngine} onClose={closeAddEngine} onSubmit={addCustomEngine} />
    </div>
  );
});
