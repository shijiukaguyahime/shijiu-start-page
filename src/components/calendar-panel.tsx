"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { XIcon, CaretLeftIcon, CaretRightIcon, CaretDownIcon } from "@phosphor-icons/react";
import { limeDropdownMotion, useClickOutside, useFocusTrap } from "@/lib/hooks";
import { ESC_PRIORITY, useEscapeLayer } from "@/lib/keyboard";
import { DropdownMenu } from "@/components/ui/dropdown";
import {
  CALENDAR_MAX_YEAR,
  CALENDAR_MIN_YEAR,
  daysInMonth,
  formatDate,
  getLunarInfo,
  parseDate,
  type HolidayInfo,
  type LunarInfo,
} from "@/lib/calendar";

type HolidayYearEntry = { name?: string; type?: string; rest?: number; holiday?: boolean };
type HolidayYearResponse = { data?: Record<string, HolidayYearEntry> };
type CalendarView = { year: number; month: number };

const WEEK_LABELS = ["一", "二", "三", "四", "五", "六", "日"];
const YEARS = Array.from({ length: CALENDAR_MAX_YEAR - CALENDAR_MIN_YEAR + 1 }, (_, index) => CALENDAR_MIN_YEAR + index);
const MONTHS = Array.from({ length: 12 }, (_, index) => index + 1);

export const CalendarPanel = memo(function CalendarPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const reduce = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<CalendarView>(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [selected, setSelected] = useState<string>(() => formatDate(new Date()));
  const [holidayCache, setHolidayCache] = useState<Record<string, HolidayInfo>>({});
  const [detail, setDetail] = useState<{ lunar: LunarInfo; holiday: HolidayInfo | null } | null>(null);
  const holidayYearsRef = useRef(new Set<number>());
  const detailSourceRef = useRef<"cache" | "single">("cache");
  const [yearAnchor, setYearAnchor] = useState<{ x: number; y: number } | null>(null);
  const [monthAnchor, setMonthAnchor] = useState<{ x: number; y: number } | null>(null);
  const [yearOpen, setYearOpen] = useState(false);
  const [monthOpen, setMonthOpen] = useState(false);
  const yearButtonRef = useRef<HTMLButtonElement>(null);
  const monthButtonRef = useRef<HTMLButtonElement>(null);
  const [todayStr, setTodayStr] = useState(() => formatDate(new Date()));

  // 每次打开默认回到今天，避免关闭再打开仍停留上次选中的日期
  useEffect(() => {
    if (!open) return;
    const now = new Date();
    setView({ year: now.getFullYear(), month: now.getMonth() });
    setSelected(formatDate(now));
    setTodayStr(formatDate(now));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const id = window.setInterval(() => {
      const next = formatDate(new Date());
      setTodayStr((current) => (current === next ? current : next));
    }, 60_000);
    return () => window.clearInterval(id);
  }, [open]);

  useEffect(() => {
    if (open) return;
    setYearOpen(false);
    setMonthOpen(false);
    setYearAnchor(null);
    setMonthAnchor(null);
  }, [open]);

  const titleId = "calendar-title";
  const gridLabelId = "calendar-grid-label";

  const monthDays = useMemo(() => {
    const { year, month } = view;
    const first = new Date(year, month, 1);
    const firstDay = first.getDay();
    const offset = (firstDay + 6) % 7;
    const monthLength = daysInMonth(year, month);
    const previousMonthLength = daysInMonth(year, month - 1);
    const cells: Array<{ dateStr: string; day: number; isCurrent: boolean; date: Date }> = [];
    for (let i = offset - 1; i >= 0; i--) {
      const day = previousMonthLength - i;
      const d = new Date(year, month - 1, day, 12, 0, 0);
      cells.push({ dateStr: formatDate(d), day, isCurrent: false, date: d });
    }
    for (let d = 1; d <= monthLength; d++) {
      const dt = new Date(year, month, d, 12, 0, 0);
      cells.push({ dateStr: formatDate(dt), day: d, isCurrent: true, date: dt });
    }
    const remain = 42 - cells.length;
    for (let d = 1; d <= remain; d++) {
      const dt = new Date(year, month + 1, d, 12, 0, 0);
      cells.push({ dateStr: formatDate(dt), day: d, isCurrent: false, date: dt });
    }
    return cells;
  }, [view.year, view.month]);
  const monthRows = useMemo(() => Array.from({ length: 6 }, (_, row) => monthDays.slice(row * 7, row * 7 + 7)), [monthDays]);

  // 获取节假日（按年，覆盖前后年溢出格；同一生命周期内每年只请求一次）
  useEffect(() => {
    if (!open) return;
    const years = new Set<number>([view.year]);
    for (const c of monthDays) {
      const y = c.date.getFullYear();
      years.add(y);
    }
    const yearsToLoad = [...years].filter((year) => year >= CALENDAR_MIN_YEAR && year <= CALENDAR_MAX_YEAR && !holidayYearsRef.current.has(year));
    if (yearsToLoad.length === 0) return;

    const controller = new AbortController();
    const loadYear = async (year: number): Promise<Record<string, HolidayInfo> | null> => {
      try {
        const r = await fetch(`/api/calendar?year=${year}`, { cache: "no-store", signal: controller.signal });
        if (!r.ok) return null;
        const j = (await r.json()) as HolidayYearResponse;
        if (!j.data) return null;

        const next: Record<string, HolidayInfo> = {};
        for (const [monthDay, value] of Object.entries(j.data)) {
          const name = value.name ?? null;
          const type = value.type ?? null;
          const isHoliday = type === "holiday" || type === "1" || type === "2" || value.rest === 1 || value.holiday === true;
          const isWorkday = type === "workday" || type === "0" || type === "3" || value.rest === 0;
          const dateStr = `${year}-${monthDay}`;
          next[dateStr] = { name, isHoliday, isWorkday, type: type ?? (isHoliday ? "holiday" : isWorkday ? "workday" : null) };
        }
        return next;
      } catch {
        return null;
      }
    };

    void Promise.all(yearsToLoad.map(async (year) => ({ year, data: await loadYear(year) }))).then((results) => {
      if (controller.signal.aborted) return;
      const next: Record<string, HolidayInfo> = {};
      for (const result of results) {
        if (!result.data) continue;
        holidayYearsRef.current.add(result.year);
        Object.assign(next, result.data);
      }
      if (Object.keys(next).length > 0) setHolidayCache((prev) => ({ ...prev, ...next }));
    });

    return () => controller.abort();
  }, [open, view.year, monthDays]);

  // 选中详情（本地优先，避免 holidayCache 触发循环；不因单日接口更新网格样式）
  useEffect(() => {
    if (!open) return;
    detailSourceRef.current = "cache";
    const controller = new AbortController();
    const lunarLocal = getLunarInfo(selected);
    const cached = holidayCache[selected] ?? null;
    setDetail({ lunar: lunarLocal, holiday: cached });
    (async () => {
      try {
        const r = await fetch(`/api/calendar?date=${selected}`, { cache: "no-store", signal: controller.signal });
        if (!r.ok) return;
        const j = (await r.json()) as { lunar?: LunarInfo; holiday?: HolidayInfo };
        if (j.lunar || j.holiday) {
          // 保持本地中文农历，不被服务端阿拉伯数字覆盖；holiday 独立不替换农历，且不回写 holidayCache（避免点击周末才出现“休”）
          const mergedLunar = j.lunar ? { ...lunarLocal, ...j.lunar, text: lunarLocal.text, day: lunarLocal.day, monthDay: lunarLocal.monthDay, month: lunarLocal.month } : lunarLocal;
          detailSourceRef.current = "single";
          setDetail({ lunar: mergedLunar, holiday: (j.holiday as HolidayInfo) ?? cached });
        }
      } catch {}
    })();
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, selected]);

  // year 数据返回后（晚于选中），同步详情卡节假日，不重复请求单日接口
  useEffect(() => {
    if (!open) return;
    const cached = holidayCache[selected];
    if (!cached || detailSourceRef.current === "single") return;
    setDetail((prev) =>
      prev &&
      prev.holiday?.name === cached.name &&
      prev.holiday?.isHoliday === cached.isHoliday &&
      prev.holiday?.isWorkday === cached.isWorkday &&
      prev.holiday?.type === cached.type
        ? prev
        : { lunar: prev?.lunar ?? getLunarInfo(selected), holiday: cached },
    );
  }, [open, selected, holidayCache]);

  const closeMenus = () => {
    setYearOpen(false);
    setMonthOpen(false);
    setYearAnchor(null);
    setMonthAnchor(null);
  };
  const closeFromOutside = () => {
    if (yearOpen || monthOpen) {
      closeMenus();
      return;
    }
    onClose();
  };

  useClickOutside(panelRef as React.RefObject<HTMLElement | null>, closeFromOutside, open, {
    ignoreSelectors: ["[data-dock]", "[role='menu']"],
  });

  // Esc 分层：先收起年份/月份下拉，再关闭整个日历
  useEscapeLayer("calendar", open, closeFromOutside, ESC_PRIORITY.panel);
  useFocusTrap(panelRef as React.RefObject<HTMLElement | null>, open);

  const selectedDate = parseDate(selected);
  const isTodaySelected = selected === todayStr;
  const canGoPrev = view.year > CALENDAR_MIN_YEAR || view.month > 0;
  const canGoNext = view.year < CALENDAR_MAX_YEAR || view.month < 11;

  const selectDate = (date: Date): boolean => {
    const year = date.getFullYear();
    if (year < CALENDAR_MIN_YEAR || year > CALENDAR_MAX_YEAR) return false;
    setSelected(formatDate(date));
    setView((current) => (current.year === year && current.month === date.getMonth() ? current : { year, month: date.getMonth() }));
    return true;
  };

  const selectView = (year: number, month: number) => {
    const day = Math.min(selectedDate.getDate(), daysInMonth(year, month));
    selectDate(new Date(year, month, day, 12, 0, 0));
  };

  const goPrev = () => {
    const target = new Date(view.year, view.month - 1, 1, 12, 0, 0);
    selectView(target.getFullYear(), target.getMonth());
  };
  const goNext = () => {
    const target = new Date(view.year, view.month + 1, 1, 12, 0, 0);
    selectView(target.getFullYear(), target.getMonth());
  };
  const goToday = () => selectDate(new Date());

  const handleDayKeyDown = (e: React.KeyboardEvent, dateStr: string) => {
    const d = parseDate(dateStr);
    let target: Date | null = null;
    if (e.key === "ArrowLeft") target = new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1, 12, 0, 0);
    else if (e.key === "ArrowRight") target = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 12, 0, 0);
    else if (e.key === "ArrowUp") target = new Date(d.getFullYear(), d.getMonth(), d.getDate() - 7, 12, 0, 0);
    else if (e.key === "ArrowDown") target = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 7, 12, 0, 0);
    else if (e.key === "Home") {
      const mondayOffset = (d.getDay() + 6) % 7;
      target = new Date(d.getFullYear(), d.getMonth(), d.getDate() - mondayOffset, 12, 0, 0);
    } else if (e.key === "End") {
      const mondayOffset = (d.getDay() + 6) % 7;
      target = new Date(d.getFullYear(), d.getMonth(), d.getDate() + (6 - mondayOffset), 12, 0, 0);
    } else if (e.key === "PageUp" || e.key === "PageDown") {
      const monthOffset = e.key === "PageUp" ? -1 : 1;
      const targetMonth = new Date(d.getFullYear(), d.getMonth() + monthOffset, 1, 12, 0, 0);
      const day = Math.min(d.getDate(), daysInMonth(targetMonth.getFullYear(), targetMonth.getMonth()));
      target = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), day, 12, 0, 0);
    }
    if (target) {
      e.preventDefault();
      const nextStr = formatDate(target);
      if (!selectDate(target)) return;
      requestAnimationFrame(() => {
        const el = panelRef.current?.querySelector<HTMLElement>(`[data-date="${nextStr}"]`);
        el?.focus();
      });
    }
  };

  const openYear = (e: React.MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const nextOpen = !yearOpen;
    setMonthOpen(false);
    setMonthAnchor(null);
    setYearAnchor(nextOpen ? { x: rect.left, y: rect.bottom } : null);
    setYearOpen(nextOpen);
  };
  const openMonth = (e: React.MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const nextOpen = !monthOpen;
    setYearOpen(false);
    setYearAnchor(null);
    setMonthAnchor(nextOpen ? { x: rect.left, y: rect.bottom } : null);
    setMonthOpen(nextOpen);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-30 bg-black/20 backdrop-blur-[2px] md:hidden"
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            ref={panelRef}
            data-calendar
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={gridLabelId}
            initial={reduce ? { opacity: 0 } : (limeDropdownMotion.initial as unknown as never)}
            animate={reduce ? { opacity: 1 } : (limeDropdownMotion.animate as unknown as never)}
            exit={reduce ? { opacity: 0 } : (limeDropdownMotion.exit as unknown as never)}
            transition={reduce ? ({ duration: 0.14 } as unknown as never) : (limeDropdownMotion.transition as unknown as never)}
            className="gpu fixed inset-x-0 bottom-[76px] z-40 mx-auto max-h-[min(92vh,760px)] w-[min(620px,calc(100vw-16px))] overflow-hidden rounded-[20px] glass-panel shadow-[0_20px_56px_rgba(0,0,0,0.18)] max-[360px]:max-h-[min(94vh,760px)]"
            onClick={(e) => e.stopPropagation()}
            style={{ transformOrigin: "bottom center" }}
          >
            <h2 id={titleId} className="sr-only">日历 - {view.year}年{view.month + 1}月</h2>
            <div className="flex items-center justify-between gap-2 bg-white px-3 py-3 dark:bg-zinc-800 sm:px-5 sm:py-4">
              <div className="flex items-center gap-2 sm:gap-2.5">
                <button
                  type="button"
                  ref={yearButtonRef}
                  onClick={openYear}
                  aria-haspopup="menu"
                  aria-expanded={yearOpen}
                  aria-controls="calendar-year-menu"
                  aria-label={`选择年份，当前${view.year}年`}
                  className="flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-[13px] font-semibold text-zinc-900 transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-600 sm:gap-2 sm:px-4 sm:py-2 sm:text-base"
                >
                  {view.year}年 <CaretDownIcon weight="bold" className={`size-3.5 text-zinc-500 transition-transform dark:text-zinc-400 sm:size-4 ${yearOpen ? "rotate-180" : ""}`} aria-hidden />
                </button>
                <button
                  type="button"
                  ref={monthButtonRef}
                  onClick={openMonth}
                  aria-haspopup="menu"
                  aria-expanded={monthOpen}
                  aria-controls="calendar-month-menu"
                  aria-label={`选择月份，当前${view.month + 1}月`}
                  className="flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-[13px] font-semibold text-zinc-900 transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-600 sm:gap-2 sm:px-4 sm:py-2 sm:text-base"
                >
                  {view.month + 1}月 <CaretDownIcon weight="bold" className={`size-3.5 text-zinc-500 transition-transform dark:text-zinc-400 sm:size-4 ${monthOpen ? "rotate-180" : ""}`} aria-hidden />
                </button>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <button type="button" onClick={goToday} aria-label="回到今天" className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-200 sm:px-3.5 sm:py-1.5 sm:text-sm">
                  今天
                </button>
                <button type="button" aria-label="关闭日历弹框" onClick={onClose} className="flex size-8 shrink-0 items-center justify-center rounded-full bg-zinc-900/5 text-zinc-600 hover:bg-zinc-900/10 dark:bg-white/10 dark:text-zinc-300 sm:size-9">
                  <XIcon weight="bold" className="size-4 sm:size-[18px]" aria-hidden />
                </button>
              </div>
            </div>

            <div
              className="max-h-[min(84vh,700px)] overflow-y-auto overscroll-contain bg-white px-3 pb-3 dark:bg-zinc-900 max-[360px]:max-h-[min(88vh,740px)] sm:px-4 sm:pb-4 md:max-h-[min(70vh,620px)]"
              onWheel={(e) => e.stopPropagation()}
              onTouchMove={(e) => e.stopPropagation()}
            >
              <div id={gridLabelId} className="sr-only" aria-live="polite" aria-atomic="true">
                {selectedDate.getFullYear()}年{selectedDate.getMonth() + 1}月{selectedDate.getDate()}日 {detail?.lunar.monthDay ?? ""} {isTodaySelected ? "今天" : ""}
              </div>
              <div className="sticky top-0 z-10 -mx-3 flex items-center justify-between bg-white px-3 py-2 dark:bg-zinc-900 sm:-mx-4 sm:px-4 sm:py-3" role="toolbar" aria-label="月份导航">
                 <button type="button" disabled={!canGoPrev} aria-label={`上一月，${view.month === 0 ? view.year - 1 : view.year}年${view.month === 0 ? 12 : view.month}月`} onClick={goPrev} className="flex size-8 items-center justify-center rounded-full bg-zinc-900/5 text-zinc-600 transition-colors hover:bg-zinc-900/10 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white/10 dark:text-zinc-300 sm:size-9">
                  <CaretLeftIcon weight="bold" className="size-4 sm:size-[18px]" aria-hidden />
                </button>
                <div className="flex min-w-0 flex-col items-center" aria-live="polite" aria-atomic="true">
                  <span className="truncate text-base font-semibold leading-tight tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-lg">
                    {selectedDate.getMonth() + 1}月{selectedDate.getDate()}日
                    <span className="mx-1.5 font-light text-zinc-300 dark:text-zinc-600 sm:mx-2" aria-hidden>/</span>
                    <span className="text-sm font-medium text-zinc-600 dark:text-zinc-300 sm:text-base">{detail?.lunar.monthDay ?? getLunarInfo(selected).monthDay}</span>
                  </span>
                  <span className="mt-0.5 text-[11px] font-medium text-zinc-500 dark:text-zinc-400 sm:mt-1 sm:text-xs">
                    {selectedDate.getFullYear()}年 · {selectedDate.toLocaleDateString("zh-CN", { weekday: "long" })}
                  </span>
                </div>
                 <button type="button" disabled={!canGoNext} aria-label={`下一月，${view.month === 11 ? view.year + 1 : view.year}年${view.month === 11 ? 1 : view.month + 2}月`} onClick={goNext} className="flex size-8 items-center justify-center rounded-full bg-zinc-900/5 text-zinc-600 transition-colors hover:bg-zinc-900/10 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white/10 dark:text-zinc-300 sm:size-9">
                  <CaretRightIcon weight="bold" className="size-4 sm:size-[18px]" aria-hidden />
                </button>
              </div>

              <div className="mt-1 flex flex-col gap-3 sm:gap-4">
                <div className="min-w-0 w-full">
                  <div className="grid grid-cols-7 gap-x-1 gap-y-0 text-center sm:gap-x-2 sm:gap-y-0" role="row">
                    {WEEK_LABELS.map((w, idx) => (
                      <div key={w} role="columnheader" aria-label={`星期${w}`} className={`py-1.5 text-[11px] font-semibold tracking-tight sm:py-2 sm:text-[13px] ${idx >= 5 ? "text-red-500/90 dark:text-red-400" : "text-zinc-500 dark:text-zinc-400"}`}>
                        {w}
                      </div>
                    ))}
                  </div>

                   <div className="mt-1 flex flex-col gap-y-1 sm:gap-y-2" role="grid" aria-label={`${view.year}年${view.month + 1}月日历`} aria-rowcount={6} aria-colcount={7}>
                     {monthRows.map((row, rowIndex) => (
                       <div key={rowIndex} role="row" className="grid grid-cols-7 gap-x-1 sm:gap-x-2.5">
                         {row.map((c) => {
                           const isToday = c.dateStr === todayStr;
                           const isSelected = c.dateStr === selected;
                           const isSupportedDate = c.date.getFullYear() >= CALENDAR_MIN_YEAR && c.date.getFullYear() <= CALENDAR_MAX_YEAR;
                           const h = holidayCache[c.dateStr];
                           const lunar = getLunarInfo(c.dateStr);
                           const isWeekend = c.date.getDay() === 0 || c.date.getDay() === 6;
                           const isHoliday = h?.isHoliday;
                           const isWorkday = h?.isWorkday;
                           const subText = lunar.text;
                           const ariaLabel = `${c.dateStr} 星期${["日", "一", "二", "三", "四", "五", "六"][c.date.getDay()]} 农历${lunar.monthDay}${h?.name ? ` ${h.name}` : ""}${isSelected ? " 已选中" : ""}${isToday ? " 今天" : ""}${!c.isCurrent ? " 非本月" : ""}`.trim();
                           return (
                             <div key={c.dateStr} role="gridcell" aria-selected={isSelected} className="min-w-0">
                               <button
                                 type="button"
                                 data-date={c.dateStr}
                                 disabled={!isSupportedDate}
                                 aria-label={ariaLabel}
                                 aria-current={isToday ? "date" : undefined}
                                 tabIndex={isSelected ? 0 : -1}
                                 onClick={() => selectDate(c.date)}
                                 onKeyDown={(e) => handleDayKeyDown(e, c.dateStr)}
                                 className={`relative flex min-h-[58px] w-full flex-col items-center justify-center overflow-hidden rounded-xl px-0.5 py-2 text-center transition-all max-[360px]:min-h-[56px] sm:min-h-14 sm:px-1 sm:py-2.5 ${!c.isCurrent ? "opacity-35" : ""} ${isSelected ? "bg-zinc-900 text-white shadow-md dark:bg-white dark:text-zinc-900" : isToday ? "ring-2 ring-[var(--accent)] text-[var(--accent)]" : isHoliday ? "bg-red-50 text-red-600 ring-1 ring-red-200 dark:bg-red-500/10 dark:text-red-400 dark:ring-red-500/20" : "hover:bg-zinc-50 dark:hover:bg-zinc-800"}`}
                               >
                                 {isHoliday && !isSelected && !isToday && <span className="absolute right-1 top-1 rounded bg-red-500 px-0.5 py-px text-[8px] font-bold leading-none text-white" aria-hidden>休</span>}
                                 {isWorkday && !isSelected && !isToday && <span className="absolute right-1 top-1 rounded bg-zinc-500 px-0.5 py-px text-[8px] font-bold leading-none text-white" aria-hidden>班</span>}
                                 <span className={`flex h-[18px] items-center justify-center whitespace-nowrap text-[15px] font-bold tabular-nums leading-none tracking-tight sm:h-[20px] sm:text-[15px] md:text-lg ${!isSelected && !isToday && isWeekend ? "text-red-500 dark:text-red-400" : ""} ${isSelected ? "text-white dark:text-zinc-900" : isToday ? "text-[var(--accent)]" : !c.isCurrent ? "text-zinc-400" : "text-zinc-900 dark:text-zinc-100"}`} aria-hidden>{c.day}</span>
                                 <span className={`mt-1 w-full max-w-full truncate whitespace-nowrap px-0.5 text-center text-[9px] font-medium leading-none tracking-tight sm:mt-1.5 sm:max-w-[56px] sm:text-xs ${isSelected ? "text-white/80 dark:text-zinc-600" : isToday ? "text-[var(--accent)]/60" : isHoliday ? "text-red-600 dark:text-red-400" : "text-zinc-500 dark:text-zinc-400"}`} aria-hidden>{subText}</span>
                               </button>
                             </div>
                           );
                         })}
                       </div>
                     ))}
                   </div>
                </div>

                <div className="hidden w-full shrink-0 rounded-2xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-800/60 sm:p-4 md:block" role="region" aria-live="polite" aria-atomic="true" aria-label={`选中日期详情 ${selected} ${detail?.lunar.monthDay ?? ""}`}>
                  <div className="flex items-baseline gap-1.5 sm:gap-2">
                    <span className="text-3xl font-light tabular-nums tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-5xl" aria-hidden>{selectedDate.getDate()}</span>
                    <span className="text-sm font-semibold tracking-tight text-zinc-700 dark:text-zinc-300 sm:text-base">{selectedDate.toLocaleDateString("zh-CN", { weekday: "long" })}</span>
                    {isTodaySelected && <span className="rounded-full ring-2 ring-[var(--accent)] px-2 py-0.5 text-[11px] font-bold leading-none text-[var(--accent)] sm:text-xs" aria-label="今天">今天</span>}
                  </div>
                  <div className="mt-1 text-xs font-medium tracking-tight text-zinc-600 dark:text-zinc-300 sm:mt-1.5 sm:text-sm">{selectedDate.toLocaleDateString("zh-CN", { year: "numeric", month: "long" })}</div>
                  <p className="mt-1.5 whitespace-nowrap text-xs font-medium leading-relaxed tracking-tight text-zinc-600 dark:text-zinc-400 sm:mt-2.5 sm:text-sm">
                     农历 {detail?.lunar.monthDay ?? getLunarInfo(selected).monthDay}
                    {detail?.lunar.ganzhi ? ` · ${detail.lunar.ganzhi}${detail.lunar.zodiac ? `(${detail.lunar.zodiac})` : ""}` : ""}
                  </p>
                  {detail?.holiday?.name ? (
                    <p className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium sm:mt-2.5 sm:text-sm ${detail.holiday.isHoliday ? "bg-red-500 text-white" : detail.holiday.isWorkday ? "bg-zinc-600 text-white" : "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"}`} aria-label={`节假日 ${detail.holiday.name}`}>
                      {detail.holiday.name} {detail.holiday.isHoliday ? "休" : detail.holiday.isWorkday ? "班" : ""}
                    </p>
                  ) : (
                    <p className="mt-2 whitespace-nowrap text-xs tracking-tight text-zinc-500 dark:text-zinc-500 sm:mt-2.5 sm:text-sm">{detail?.holiday?.isHoliday ? "休息日" : detail?.holiday?.isWorkday ? "工作日" : (selectedDate.getDay() === 0 || selectedDate.getDay() === 6) ? "休息日" : "工作日"}</p>
                  )}
                </div>
              </div>
            </div>
          </motion.div>

           <DropdownMenu
             open={yearOpen}
             onClose={() => {
               setYearOpen(false);
               setYearAnchor(null);
             }}
             anchor={yearAnchor}
             triggerRef={yearButtonRef}
             selectedKey={String(view.year)}
             id="calendar-year-menu"
             ariaLabel="年份选择"
             items={YEARS.map((y) => ({
               key: String(y),
               label: `${y}年`,
               onClick: () => selectView(y, view.month),
             }))}
           />
           <DropdownMenu
             open={monthOpen}
             onClose={() => {
               setMonthOpen(false);
               setMonthAnchor(null);
             }}
             anchor={monthAnchor}
             triggerRef={monthButtonRef}
             selectedKey={String(view.month + 1)}
             id="calendar-month-menu"
             ariaLabel="月份选择"
             items={MONTHS.map((m) => ({
               key: String(m),
               label: `${m}月`,
               onClick: () => selectView(view.year, m - 1),
             }))}
          />
        </>
      )}
    </AnimatePresence>
  );
});
