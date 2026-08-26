"use client";

import { useEffect, useRef, useState } from "react";
import { MagnifyingGlassIcon } from "@phosphor-icons/react";
import { SEARCH_ENGINES, type SearchEngine } from "@/lib/data";
import { cn } from "@/lib/utils";

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

  useEffect(() => {
    const saved = localStorage.getItem(ENGINE_KEY);
    const found = SEARCH_ENGINES.find((e) => e.id === saved);
    if (found) setEngine(found);
  }, []);

  const isActive = focused || showEngines;
  useEffect(() => {
    onFocusChange?.(isActive);
  }, [isActive, onFocusChange]);

  // 点击外部收起并失焦，判定以整个 wrapper（含下拉）为准
  useEffect(() => {
    if (!isActive) return;
    function onDown(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (wrapperRef.current?.contains(target)) return;
      setShowEngines(false);
      setFocused(false);
      inputRef.current?.blur();
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [isActive]);

  function pickEngine(e: SearchEngine) {
    setEngine(e);
    localStorage.setItem(ENGINE_KEY, e.id);
    setShowEngines(false);
    setTimeout(() => inputRef.current?.focus(), 0);
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
          "flex items-center gap-1.5 rounded-full glass-search p-1 will-change-transform [transform:translateZ(0)] [backface-visibility:hidden]",
          "transition-[background-color,box-shadow,transform,border-color] duration-[380ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
          isActive && "glass-search--focused -translate-y-[3px] shadow-[0_12px_40px_rgba(0,0,0,0.14)]"
        )}
      >
        <button
          type="button"
          aria-label={`搜索引擎：${engine.label}`}
          aria-haspopup="listbox"
          aria-expanded={showEngines}
          tabIndex={isActive ? 0 : -1}
          onClick={() => setShowEngines((v) => !v)}
          className={cn(
            "flex shrink-0 items-center justify-center overflow-hidden rounded-full will-change-transform [backface-visibility:hidden]",
            "transition-[width,opacity,transform,filter] duration-[340ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
            isActive
              ? "w-9 opacity-100 scale-100 blur-0 translate-x-0"
              : "w-0 opacity-0 scale-[0.82] blur-[5px] -translate-x-1 pointer-events-none"
          )}
          style={{ willChange: "transform, opacity, filter, width" }}
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
              if (!wrapperRef.current?.contains(document.activeElement)) {
                setFocused(false);
              }
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
          aria-label="搜索"
          tabIndex={isActive ? 0 : -1}
          onClick={submit}
          className={cn(
            "flex shrink-0 items-center justify-center overflow-hidden rounded-full text-black/50 shadow-sm will-change-transform [backface-visibility:hidden] hover:bg-black/20 hover:text-white active:scale-[0.96]",
            "transition-[width,opacity,transform,filter] duration-[340ms] ease-[cubic-bezier(0.22,1,0.36,1)] delay-[28ms]",
            isActive
              ? "w-9 opacity-100 scale-100 blur-0 translate-x-0"
              : "w-0 opacity-0 scale-[0.82] blur-[5px] translate-x-1 pointer-events-none"
          )}
          style={{ willChange: "transform, opacity, filter, width" }}
        >
          <MagnifyingGlassIcon weight="bold" className="size-[18px] shrink-0" aria-hidden />
        </button>
      </div>

      {showEngines && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setShowEngines(false)} aria-hidden />
          <ul
            role="listbox"
            aria-label="选择搜索引擎"
            className="absolute left-0 top-[calc(100%+8px)] z-20 w-[168px] overflow-hidden rounded-2xl border border-zinc-200 bg-white p-1.5 shadow-lg"
          >
            {SEARCH_ENGINES.map((eng) => (
              <li key={eng.id} role="option" aria-selected={eng.id === engine.id}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pickEngine(eng)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm font-medium transition-colors",
                    eng.id === engine.id
                      ? "bg-zinc-900 text-white"
                      : "text-zinc-700 hover:bg-zinc-900/5"
                  )}
                >
                  <span
                    className={cn(
                      "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold shadow-sm ring-1",
                      eng.id === engine.id
                        ? "bg-white text-zinc-900 ring-white/20"
                        : "bg-white/70 text-zinc-600 ring-black/5"
                    )}
                    aria-hidden
                  >
                    {eng.icon.slice(0, 1)}
                  </span>
                  {eng.label}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
