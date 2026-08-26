"use client";

import { useEffect, useRef, useState } from "react";
import { CopyIcon, MagnifyingGlassIcon, DotsThreeIcon } from "@phosphor-icons/react";
import { SEARCH_ENGINES } from "@/lib/data";
import { cn } from "@/lib/utils";

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

  useEffect(() => {
    if (!showMenu) return;
    function onDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [showMenu]);

  if (!data) return null;

  const source = data.from_who ? `${data.from} · ${data.from_who}` : data.from;
  const fullText = data.hitokoto;

  function handleCopy(e: React.MouseEvent) {
    navigator.clipboard.writeText(fullText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      setShowMenu(false);
    });
  }

  function handleSearch(e: React.MouseEvent) {
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
      data-hitokoto-menu
    >
      <div
        className={cn(
          "relative w-full rounded-2xl px-4 py-4 text-center transition-all duration-500",
          "bg-transparent",
          "group-hover:bg-white/20 group-hover:backdrop-blur-[18px] group-hover:backdrop-saturate-[160%] group-hover:shadow-[0_8px_32px_rgba(0,0,0,0.12)]"
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
            onClick={() => setShowMenu((v) => !v)}
            className="relative z-20 flex size-7 items-center justify-center rounded-full bg-white/70 text-zinc-600 opacity-0 shadow-sm ring-1 ring-black/5 transition-all duration-300 hover:bg-white hover:text-zinc-900 group-hover:opacity-100"
          >
            <DotsThreeIcon weight="bold" className="size-4" aria-hidden />
          </button>

          {showMenu && (
            <ul
              role="menu"
              className="absolute bottom-auto left-auto right-[calc(100%+8px)] top-0 z-30 w-[148px] overflow-hidden rounded-2xl border border-zinc-200 bg-white p-1.5 shadow-lg md:bottom-auto md:left-auto md:right-0 md:top-[calc(100%+8px)]"
            >
              <li role="none">
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleCopy}
                  className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-900/5"
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
                  className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-900/5"
                >
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-white/70 text-zinc-600 shadow-sm ring-1 ring-black/5">
                    <MagnifyingGlassIcon weight="bold" className="size-3.5" aria-hidden />
                  </span>
                  搜索
                </button>
              </li>
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
