"use client";

import { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import Sortable from "sortablejs";
import { CalendarBlankIcon, FireIcon } from "@phosphor-icons/react";
import { DEFAULT_GROUPS, type Group, type Shortcut } from "@/lib/data";

type GridItem = Shortcut & {
  w?: 1 | 2;
  h?: 1 | 2 | 3;
  widget?: "calendar" | "hotlist";
};

function buildItems(): GridItem[] {
  const base = DEFAULT_GROUPS.flatMap((g) => g.shortcuts) as GridItem[];
  return base.map((b) => ({ ...b, w: 1 as const, h: 1 as const }));
}

type Props = {
  open: boolean;
  onClose: () => void;
  groupIdx: number;
  onGroupChange: React.Dispatch<React.SetStateAction<number>>;
};

const STORAGE_ITEMS = "startpage:items";

function loadItems(): GridItem[] {
  if (typeof window === "undefined") return buildItems();
  try {
    const raw = localStorage.getItem(STORAGE_ITEMS) || localStorage.getItem("startpage:groups");
    if (raw) {
      const parsed = JSON.parse(raw) as unknown;
      // 支持两种导入：直接 GridItem[] 或 {groups: Group[]} 或 Group[]
      if (Array.isArray(parsed) && parsed.length) {
        // 若是 Group[]（含 shortcuts），展平为 GridItem[]
        if ((parsed[0] as { shortcuts?: unknown })?.shortcuts) {
          const groups = parsed as { shortcuts: GridItem[] }[];
          return groups.flatMap((g) => g.shortcuts) as GridItem[];
        }
        return parsed as GridItem[];
      }
      if (parsed && typeof parsed === "object" && Array.isArray((parsed as { groups?: unknown }).groups)) {
        const g = (parsed as { groups: { shortcuts: GridItem[] }[] }).groups;
        return g.flatMap((x) => x.shortcuts) as GridItem[];
      }
    }
  } catch {}
  return buildItems();
}

export function AppGrid({ open, onClose, groupIdx, onGroupChange }: Props) {
  const [items, setItems] = useState<GridItem[]>(() => buildItems());
  const [groupsData, setGroupsData] = useState<Group[]>(() => {
    if (typeof window === "undefined") return DEFAULT_GROUPS;
    try {
      const raw = localStorage.getItem("startpage:groups");
      if (raw) {
        const parsed = JSON.parse(raw) as Group[];
        if (Array.isArray(parsed) && parsed.length && parsed[0]?.shortcuts) return parsed;
      }
    } catch {}
    return DEFAULT_GROUPS;
  });
  const reduce = useReducedMotion();
  const gridRef = useRef<HTMLDivElement>(null);
  const gridScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadGroups = () => {
      try {
        const raw = localStorage.getItem("startpage:groups");
        if (raw) {
          const parsed = JSON.parse(raw) as Group[];
          if (Array.isArray(parsed) && parsed.length) setGroupsData(parsed);
        }
      } catch {}
    };
    loadGroups();
    window.addEventListener("storage", loadGroups);
    window.addEventListener("groups-change" as never, loadGroups);
    return () => {
      window.removeEventListener("storage", loadGroups);
      window.removeEventListener("groups-change" as never, loadGroups);
    };
  }, []);

  // 首次挂载从 localStorage 恢复拖拽后的顺序
  useEffect(() => {
    setItems(loadItems());
  }, []);

  // 拖拽后落盘，支撑 JSON 导出与刷新保持
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_ITEMS, JSON.stringify(items));
    } catch {}
  }, [items]);

  const groups = ["全部", ...groupsData.map((g) => g.title)];
  const filtered =
    groupIdx === 0
      ? items
      : items.filter((it) => {
          const g = groupsData[groupIdx - 1];
          if (!g) return false;
          return g.shortcuts.some((s) => s.id === it.id);
        });
  const displayItems = groupIdx === 0 ? filtered : filtered.filter((it) => !it.widget);

  useEffect(() => {
    if (!open || !gridRef.current) return;
    // 移动端禁用拖拽，避免与垂直滚动手势冲突
    if (typeof window !== "undefined") {
      const isCoarse = window.matchMedia("(pointer: coarse)").matches;
      const isNarrow = window.matchMedia("(max-width: 768px)").matches;
      if (isCoarse || isNarrow) return;
    }
    const el = gridRef.current;
    const sortable = Sortable.create(el, {
      animation: 150,
      ghostClass: "opacity-40",
      chosenClass: "scale-[0.96]",
      dragClass: "opacity-90",
      draggable: "[data-draggable]",
      dataIdAttr: "data-id",
      onEnd: (evt) => {
        const { oldIndex, newIndex } = evt;
        if (oldIndex == null || newIndex == null || oldIndex === newIndex) return;
        setItems((prev) => {
          const visibleIds = displayItems.map((d) => d.id);
          const movedId = visibleIds[oldIndex];
          const targetId = visibleIds[newIndex];
          if (!movedId || !targetId) return prev;
          const fromIdx = prev.findIndex((i) => i.id === movedId);
          const toIdx = prev.findIndex((i) => i.id === targetId);
          if (fromIdx === -1 || toIdx === -1) return prev;
          const copy = [...prev];
          const [moved] = copy.splice(fromIdx, 1);
          copy.splice(toIdx, 0, moved);
          return copy;
        });
      },
    });
    return () => sortable.destroy();
  }, [open, displayItems, groupIdx]);

  useEffect(() => {
    if (!open) return;
    function onWheel(e: WheelEvent) {
      const target = e.target as HTMLElement;
      if (target.closest("[data-settings]")) return;
      if (gridScrollRef.current?.contains(target)) return;
      if (Math.abs(e.deltaX) < Math.abs(e.deltaY)) {
        if (e.deltaY > 8 || e.deltaY < -8) e.preventDefault();
        if (e.deltaY > 10) onGroupChange((i) => (i + 1) % groups.length);
        else if (e.deltaY < -10) onGroupChange((i) => (i - 1 + groups.length) % groups.length);
      }
    }
    window.addEventListener("wheel", onWheel, { passive: false });
    return () => window.removeEventListener("wheel", onWheel);
  }, [open, groups.length, onGroupChange]);

  if (!open) return null;

  return (
    <div ref={gridScrollRef} className="flex w-full max-w-[880px] flex-1 flex-col min-h-0" data-grid>
      {/* 图标宫格：gap 统一 */}
      <div className="relative flex-1 overflow-y-auto overscroll-contain px-2 py-2 md:max-h-[52vh] max-h-[56vh] [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={groupIdx}
            ref={gridRef}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8, filter: "blur(6px)" }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6, filter: "blur(6px)" }}
            transition={
              reduce
                ? { duration: 0.14 }
                : {
                    opacity: { duration: 0.22, ease: [0.22, 1, 0.36, 1] },
                    y: { duration: 0.26, ease: [0.22, 1, 0.36, 1] },
                    filter: { duration: 0.22, ease: "easeOut" },
                  }
            }
            className="grid auto-rows-fr grid-cols-4 gap-4 md:grid-cols-6 md:gap-4 lg:grid-cols-8 lg:gap-5 gpu"
          >
            {displayItems.map((item, idx) => {
              const spanClass =
                item.w === 2 && item.h === 2
                  ? "col-span-2 row-span-2 aspect-square"
                  : item.w === 2 && item.h === 1
                    ? "col-span-2 aspect-[2/1]"
                    : item.w === 1 && item.h === 2
                      ? "col-span-1 row-span-2 aspect-[1/2]"
                      : "col-span-1 aspect-square";

              if (item.widget) {
                return (
                  <motion.div
                    key={item.id}
                    data-draggable
                    data-id={item.id}
                    initial={reduce ? false : { opacity: 0, y: 8, filter: "blur(4px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    transition={
                      reduce
                        ? { duration: 0 }
                        : {
                            duration: 0.32,
                            delay: Math.min(idx * 0.012, 0.12),
                            ease: [0.22, 1, 0.36, 1],
                          }
                    }
                    className={`${spanClass} group/widget relative overflow-hidden rounded-[18px] border border-white/40 bg-white p-3 shadow-sm gpu`}
                  >
                    <WidgetContent item={item} />
                  </motion.div>
                );
              }

              return (
                <motion.a
                  key={item.id}
                  data-draggable
                  data-id={item.id}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  initial={reduce ? false : { opacity: 0, y: 8, filter: "blur(4px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  transition={
                    reduce
                      ? { duration: 0 }
                      : {
                          duration: 0.32,
                          delay: Math.min(idx * 0.012, 0.14),
                          ease: [0.22, 1, 0.36, 1],
                        }
                  }
                  className={`${spanClass} group/app flex flex-col items-center justify-center gap-2 py-1 text-center gpu`}
                >
                  <span className="flex size-16 items-center justify-center rounded-2xl bg-white shadow-[0_2px_10px_rgba(0,0,0,0.12)] transition-[transform,box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/app:shadow-md group-hover/app:scale-[1.02] md:size-16 gpu dark:bg-zinc-800 dark:shadow-[0_2px_10px_rgba(0,0,0,0.3)]">
                    <Favicon url={item.url} name={item.name} color={item.color} />
                  </span>
                  <span className="line-clamp-1 w-full truncate px-1 text-xs font-medium leading-tight text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.4)] dark:text-zinc-100">{item.name}</span>
                </motion.a>
              );
            })}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function Favicon({ url, name, color }: { url?: string; name: string; color?: string }) {
  const domain = (() => {
    try {
      return url ? new URL(url).hostname : "";
    } catch {
      return "";
    }
  })();
  const src = domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=64` : null;
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" width={22} height={22} className="size-[22px] object-contain" loading="lazy" />;
  }
  return (
    <span className="flex size-7 items-center justify-center rounded-lg text-xs font-bold text-white" style={{ background: color ?? "#18181b" }}>
      {name.charAt(0)}
    </span>
  );
}

function WidgetContent({ item }: { item: GridItem }) {
  if (item.widget === "calendar") {
    const today = new Date();
    return (
      <div className="flex h-full w-full flex-col">
        <div className="flex items-center gap-2 text-xs font-semibold text-zinc-500">
          <CalendarBlankIcon weight="duotone" className="size-4" /> 日历
          <span className="ml-auto text-[10px] font-normal">{today.toLocaleDateString("zh-CN", { month: "long" })}</span>
        </div>
        <div className="mt-2 grid flex-1 place-items-center">
          <div className="text-center">
            <div className="text-3xl font-light tracking-tight text-zinc-900">{today.getDate()}</div>
            <div className="text-xs text-zinc-500">{today.toLocaleDateString("zh-CN", { weekday: "long" })}</div>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-zinc-400">
          {["日", "一", "二", "三", "四", "五", "六"].map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>
      </div>
    );
  }
  if (item.widget === "hotlist") {
    const isWide = item.w === 2 && item.h === 1;
    return (
      <div className="flex h-full w-full flex-col">
        <div className="flex items-center gap-2 text-xs font-semibold text-zinc-700">
          <FireIcon weight="fill" className="size-3.5 text-orange-500" /> 热榜
          <span className="ml-auto text-[10px] font-normal text-zinc-400">2x{item.h}</span>
        </div>
        <ul className={`mt-2 flex-1 space-y-1 ${isWide ? "overflow-hidden" : ""}`}>
          {["AI 编程助手爆发", "Next.js 15 发布", "宫格布局重构", isWide ? null : "一言接口升级"].filter(Boolean).map((t, i) => (
            <li key={i} className="flex items-center gap-2 truncate rounded-lg bg-zinc-50 px-2 py-1 text-xs text-zinc-600">
              <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-[10px] font-bold text-white">{i + 1}</span>
              <span className="truncate">{t as string}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }
  return null;
}
