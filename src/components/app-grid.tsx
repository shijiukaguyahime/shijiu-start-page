"use client";

import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import Sortable from "sortablejs";
import { CalendarBlankIcon, FireIcon, PlusIcon, PencilSimpleIcon, TrashIcon } from "@phosphor-icons/react";
import { DEFAULT_GROUPS, type Group, type Shortcut } from "@/lib/data";
import { DropdownMenu } from "@/components/ui/dropdown";
import { IconFormModal } from "@/components/ui/icon-form-modal";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { message } from "@/components/ui/message";
import { Favicon } from "@/components/ui/favicon";
import {
  addShortcut,
  removeShortcut,
  updateShortcut,
  getTargetGroupIdxForAdd,
  saveGroups,
} from "@/lib/groups";

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
      if (Array.isArray(parsed) && parsed.length) {
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

function mergeItemsWithGroups(prev: GridItem[], groupFlat: GridItem[]): GridItem[] {
  const groupMap = new Map(groupFlat.map((s) => [s.id, s]));
  const groupIds = new Set(groupFlat.map((s) => s.id));
  let next = prev.filter((p) => groupIds.has(p.id));
  next = next.map((p) => {
    const g = groupMap.get(p.id);
    if (g && (g.name !== p.name || g.url !== p.url || g.color !== p.color)) {
      return { ...p, name: g.name, url: g.url, color: g.color };
    }
    return p;
  });
  const existing = new Set(next.map((p) => p.id));
  const toAdd = groupFlat.filter((s) => !existing.has(s.id));
  // 新图标始终追加到当前展示顺序末尾，避免“拖拽到队尾后再新增”跑到被拖拽图标前面
  for (const add of toAdd) {
    next.push({ ...add, w: 1 as const, h: 1 as const });
  }
  if (next.length === 0 && groupFlat.length) {
    return groupFlat.map((s) => ({ ...s, w: 1 as const, h: 1 as const }));
  }
  return next;
}

export function AppGrid({ open, onClose, groupIdx, onGroupChange }: Props) {
  const [items, setItems] = useState<GridItem[]>(() => loadItems());
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

  // 宫格图标右键/长按菜单
  const [menu, setMenu] = useState<{ x: number; y: number; shortcut: GridItem } | null>(null);
  const [editTarget, setEditTarget] = useState<GridItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<GridItem | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const closeMenu = useCallback(() => setMenu(null), []);

  // 长按计时器（触屏）
  const longPressTimer = useRef<number | null>(null);
  const longPressPos = useRef<{ x: number; y: number } | null>(null);

  const handleContextMenu = useCallback((e: React.MouseEvent, item: GridItem) => {
    e.preventDefault();
    e.stopPropagation();
    setMenu({ x: e.clientX, y: e.clientY, shortcut: item });
  }, []);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent, item: GridItem) => {
      const t = e.touches[0];
      if (!t) return;
      longPressPos.current = { x: t.clientX, y: t.clientY };
      if (longPressTimer.current) window.clearTimeout(longPressTimer.current);
      longPressTimer.current = window.setTimeout(() => {
        setMenu({ x: t.clientX, y: t.clientY, shortcut: item });
        longPressPos.current = null;
      }, 560) as unknown as number;
    },
    [],
  );

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0];
    if (!t || !longPressPos.current) return;
    const dx = t.clientX - longPressPos.current.x;
    const dy = t.clientY - longPressPos.current.y;
    if (Math.hypot(dx, dy) > 12) {
      if (longPressTimer.current) window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
      longPressPos.current = null;
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer.current) window.clearTimeout(longPressTimer.current);
    longPressTimer.current = null;
    longPressPos.current = null;
  }, []);

  useEffect(() => {
    return () => {
      if (longPressTimer.current) window.clearTimeout(longPressTimer.current);
    };
  }, []);

  useEffect(() => {
    const loadGroups = () => {
      try {
        const raw = localStorage.getItem("startpage:groups");
        if (raw) {
          const parsed = JSON.parse(raw) as Group[];
          if (Array.isArray(parsed) && parsed.length) {
            setGroupsData(parsed);
            setItems((prev) => mergeItemsWithGroups(prev, parsed.flatMap((g) => g.shortcuts) as GridItem[]));
          }
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

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_ITEMS, JSON.stringify(items));
    } catch {}
  }, [items]);

  const groups = useMemo(() => ["全部", ...groupsData.map((g) => g.title)], [groupsData]);
  const filtered = useMemo(
    () =>
      groupIdx === 0
        ? items
        : items.filter((it) => {
            const g = groupsData[groupIdx - 1];
            if (!g) return false;
            return g.shortcuts.some((s) => s.id === it.id);
          }),
    [items, groupsData, groupIdx],
  );
  const displayItems = useMemo(() => (groupIdx === 0 ? filtered : filtered.filter((it) => !it.widget)), [filtered, groupIdx]);
  const displayItemsRef = useRef<GridItem[]>(displayItems);
  useEffect(() => {
    displayItemsRef.current = displayItems;
  }, [displayItems]);

  // 拖拽（仅桌面）
  useEffect(() => {
    if (!open || !gridRef.current) return;
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
      filter: "[data-no-drag]",
      preventOnFilter: false,
      onEnd: (evt) => {
        const { oldIndex, newIndex } = evt;
        if (oldIndex == null || newIndex == null || oldIndex === newIndex) return;
        setItems((prev) => {
          const visibleIds = displayItemsRef.current.map((d) => d.id);
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
  }, [open, groupIdx]);

  useEffect(() => {
    if (!open) return;
    function onWheel(e: WheelEvent) {
      const target = e.target as HTMLElement;
      if (target.closest("[data-settings]")) return;
      if (target.closest("[data-weather]") || target.closest("[data-calendar]")) return;
      if (target.closest(".dropdown-panel") || target.closest("[role='menu']")) return;
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

  useEffect(() => {
    if (!open) return;
    const el = gridScrollRef.current;
    if (!el) return;

    let startX = 0;
    let startY = 0;
    let startTime = 0;
    let isHorizontal: boolean | null = null;

    const onTouchStart = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      startX = t.clientX;
      startY = t.clientY;
      startTime = Date.now();
      isHorizontal = null;
    };

    const onTouchMove = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t || isHorizontal === false) return;
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;
      if (isHorizontal === null) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        isHorizontal = Math.abs(dx) > Math.abs(dy);
      }
      if (isHorizontal) {
        if (Math.abs(dx) > 12) e.preventDefault();
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      const t = e.changedTouches[0];
      if (!t) return;
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;
      const dt = Date.now() - startTime;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) && dt < 600) {
        if (dx < 0) onGroupChange((i) => (i + 1) % groups.length);
        else onGroupChange((i) => (i - 1 + groups.length) % groups.length);
      }
      isHorizontal = null;
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [open, groups.length, onGroupChange]);

  // 点击外部关闭菜单（点击壁纸空白不触发，因 DropdownMenu 内部已处理）
  useEffect(() => {
    if (!menu) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement;
      // 若点击在菜单内则忽略（由 DropdownMenu 内部处理）；否则关闭
      if (target.closest("[role='menu']")) return;
      setMenu(null);
    };
    const tid = setTimeout(() => {
      document.addEventListener("mousedown", onDown);
      document.addEventListener("touchstart", onDown, { passive: true });
    }, 80);
    return () => {
      clearTimeout(tid);
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, [menu]);

  const handleAdd = (data: { name: string; url: string }) => {
    const targetIdx = getTargetGroupIdxForAdd(groupIdx, groupsData);
    const { next } = addShortcut(groupsData, targetIdx, data);
    setGroupsData(next);
    saveGroups(next);
    setItems((prev) => mergeItemsWithGroups(prev, next.flatMap((g) => g.shortcuts) as GridItem[]));
  };

  const handleEdit = (data: { name: string; url: string }) => {
    if (!editTarget) return;
    const next = updateShortcut(groupsData, editTarget.id, data);
    setGroupsData(next);
    saveGroups(next);
    setItems((prev) => prev.map((p) => (p.id === editTarget.id ? { ...p, name: data.name, url: data.url } : p)));
    setEditTarget(null);
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    const next = removeShortcut(groupsData, deleteTarget.id);
    setGroupsData(next);
    saveGroups(next);
    setItems((prev) => prev.filter((p) => p.id !== deleteTarget.id));
    message.success("已删除");
    setDeleteTarget(null);
    setMenu(null);
  };

  if (!open) return null;

  return (
    <>
      <div ref={gridScrollRef} className="flex w-full max-w-[880px] flex-1 flex-col min-h-0" data-grid>
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
                            delay: Math.min(idx * 0.012, 0.14),
                            ease: [0.22, 1, 0.36, 1],
                          }
                    }
                    className={`${spanClass} group/app flex flex-col items-center justify-center gap-2 py-1 text-center gpu`}
                    onContextMenu={(e) => handleContextMenu(e, item)}
                    onTouchStart={(e) => handleTouchStart(e, item)}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                  >
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      draggable={false}
                      onDragStart={(e) => e.preventDefault()}
                      onClick={(e) => {
                        // 若菜单已打开，阻止跳转
                        if (menu) {
                          e.preventDefault();
                          e.stopPropagation();
                        }
                      }}
                      className="flex flex-col items-center justify-center gap-2 py-1 text-center w-full"
                    >
                      <span className="flex size-16 items-center justify-center rounded-2xl bg-white shadow-[0_2px_10px_rgba(0,0,0,0.12)] transition-[transform,box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/app:shadow-md group-hover/app:scale-[1.02] md:size-16 gpu dark:bg-zinc-800 dark:shadow-[0_2px_10px_rgba(0,0,0,0.3)]">
                        <Favicon url={item.url} name={item.name} color={item.color} />
                      </span>
                      <span className="line-clamp-1 w-full truncate px-1 text-xs font-medium leading-tight text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.4)] dark:text-zinc-100">
                        {item.name}
                      </span>
                    </a>
                  </motion.div>
                );
              })}

              {/* 末尾添加图标：结构与普通图标完全一致，保证对齐 */}
              <motion.div
                key="__add__"
                data-no-drag
                initial={reduce ? false : { opacity: 0, y: 8, filter: "blur(4px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={
                  reduce
                    ? { duration: 0 }
                    : {
                        duration: 0.32,
                        delay: Math.min(displayItems.length * 0.012, 0.14),
                        ease: [0.22, 1, 0.36, 1],
                      }
                }
                className="col-span-1 aspect-square group/app flex flex-col items-center justify-center gap-2 py-1 text-center gpu"
              >
                <button
                  type="button"
                  aria-label="添加图标"
                  onClick={() => setAddOpen(true)}
                  className="flex w-full flex-col items-center justify-center gap-2 py-1 text-center"
                >
                  <span className="flex size-16 items-center justify-center rounded-2xl border-2 border-dashed border-white/60 bg-white/20 shadow-[0_2px_10px_rgba(0,0,0,0.08)] backdrop-blur-[8px] transition-[transform,box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/app:shadow-md group-hover/app:scale-[1.02] md:size-16 gpu dark:bg-white/10 dark:border-white/30">
                    <PlusIcon weight="bold" className="size-6 text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.3)] dark:text-white" aria-hidden />
                  </span>
                  <span className="block h-[14px] w-full" aria-hidden />
                </button>
              </motion.div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <DropdownMenu
        open={!!menu}
        onClose={closeMenu}
        anchor={menu ? { x: menu.x, y: menu.y } : null}
        items={
          menu
            ? [
                {
                  key: "edit",
                  label: "编辑",
                  icon: <PencilSimpleIcon weight="bold" className="size-3.5" />,
                  onClick: () => setEditTarget(menu.shortcut),
                },
                {
                  key: "delete",
                  label: "删除",
                  danger: true,
                  icon: <TrashIcon weight="bold" className="size-3.5" />,
                  onClick: () => setDeleteTarget(menu.shortcut),
                },
              ]
            : []
        }
      />

      <IconFormModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        mode="add"
        onSubmit={handleAdd}
      />

      <IconFormModal
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        mode="edit"
        initialData={editTarget ? { name: editTarget.name, url: editTarget.url } : undefined}
        onSubmit={handleEdit}
      />

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="删除图标"
        description={deleteTarget ? `确定删除“${deleteTarget.name}”？此操作不可撤销。` : undefined}
        confirmText="删除"
        danger
        onConfirm={handleDelete}
      />
    </>
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
