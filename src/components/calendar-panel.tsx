"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { XIcon, CaretLeftIcon, CaretRightIcon, CaretDownIcon } from "@phosphor-icons/react";
import { limeDropdownMotion, useClickOutside } from "@/lib/hooks";
import { DropdownMenu } from "@/components/ui/dropdown";

type HolidayInfo = { name: string | null; isHoliday: boolean; isWorkday: boolean; type: string | null };
type LunarInfo = { text: string; full: string; month: string; day: string; monthDay: string; ganzhi: string; zodiac: string; isFirst: boolean };

const LUNAR_DAYS = ["初一", "初二", "初三", "初四", "初五", "初六", "初七", "初八", "初九", "初十", "十一", "十二", "十三", "十四", "十五", "十六", "十七", "十八", "十九", "二十", "廿一", "廿二", "廿三", "廿四", "廿五", "廿六", "廿七", "廿八", "廿九", "三十"];

function toLunarDayText(dayPart: string): string {
  if (/^初|^十|^廿|^三十/.test(dayPart)) return dayPart;
  const n = Number(dayPart.replace(/[^\d]/g, ""));
  if (!Number.isFinite(n) || n < 1 || n > 30) return dayPart;
  return LUNAR_DAYS[n - 1];
}

function getLunarLocal(dateStr: string): LunarInfo {
  try {
    const d = new Date(dateStr + "T12:00:00");
    const fmt = new Intl.DateTimeFormat("zh-CN-u-ca-chinese", { year: "numeric", month: "long", day: "numeric" });
    const parts = fmt.formatToParts(d);
    const yearPart = parts.find((p) => p.type === "year")?.value ?? "";
    const monthPartRaw = parts.find((p) => p.type === "month")?.value ?? "";
    const dayPartRaw = parts.find((p) => p.type === "day")?.value ?? "";
    const dayText = toLunarDayText(dayPartRaw);
    const ganzhiMatch = yearPart.match(/([甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥])/);
    const ganzhi = ganzhiMatch ? ganzhiMatch[1] : "";
    const zodiacMap: Record<string, string> = { 子: "鼠", 丑: "牛", 寅: "虎", 卯: "兔", 辰: "龙", 巳: "蛇", 午: "马", 未: "羊", 申: "猴", 酉: "鸡", 戌: "狗", 亥: "猪" };
    const zodiac = ganzhi ? (zodiacMap[ganzhi[1]] ?? "") : "";
    const isFirst = dayText === "初一";
    const text = isFirst ? `${monthPartRaw}${dayText}` : dayText;
    const monthDay = `${monthPartRaw}${dayText}`;
    const full = `${yearPart} ${monthDay}`.trim();
    return { text, full, month: monthPartRaw, day: dayText, monthDay, ganzhi, zodiac, isFirst };
  } catch {
    return { text: "", full: "", month: "", day: "", monthDay: "", ganzhi: "", zodiac: "", isFirst: false };
  }
}

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function parseDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
}

const WEEK_LABELS = ["一", "二", "三", "四", "五", "六", "日"];

export function CalendarPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const reduce = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [selected, setSelected] = useState<string>(() => formatDate(new Date()));
  const [holidayCache, setHolidayCache] = useState<Record<string, HolidayInfo>>({});
  const [detail, setDetail] = useState<{ lunar: LunarInfo; holiday: HolidayInfo | null } | null>(null);
  const todayStr = useMemo(() => formatDate(new Date()), []);

  const [yearAnchor, setYearAnchor] = useState<{ x: number; y: number } | null>(null);
  const [monthAnchor, setMonthAnchor] = useState<{ x: number; y: number } | null>(null);
  const [yearOpen, setYearOpen] = useState(false);
  const [monthOpen, setMonthOpen] = useState(false);
  const titleId = "calendar-title";
  const gridLabelId = "calendar-grid-label";
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const monthDays = useMemo(() => {
    const { year, month } = view;
    const first = new Date(year, month, 1);
    const firstDay = first.getDay();
    const offset = (firstDay + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevDays = new Date(year, month, 0).getDate();
    const cells: Array<{ dateStr: string; day: number; isCurrent: boolean; date: Date }> = [];
    for (let i = offset - 1; i >= 0; i--) {
      const day = prevDays - i;
      const d = new Date(year, month - 1, day, 12, 0, 0);
      cells.push({ dateStr: formatDate(d), day, isCurrent: false, date: d });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dt = new Date(year, month, d, 12, 0, 0);
      cells.push({ dateStr: formatDate(dt), day: d, isCurrent: true, date: dt });
    }
    const remain = 42 - cells.length;
    for (let d = 1; d <= remain; d++) {
      const dt = new Date(year, month + 1, d, 12, 0, 0);
      cells.push({ dateStr: formatDate(dt), day: d, isCurrent: false, date: dt });
    }
    return cells;
  }, [view]);

  // 获取节假日（按年，覆盖前后年溢出格）
  useEffect(() => {
    if (!open) return;
    const years = new Set<number>([view.year]);
    for (const c of monthDays) {
      const y = c.date.getFullYear();
      years.add(y);
    }
    let cancelled = false;
    (async () => {
      for (const year of years) {
        try {
          const r = await fetch(`/api/calendar?year=${year}`, { cache: "no-store" });
          if (!r.ok) continue;
          const j = (await r.json()) as { data?: Record<string, { name?: string; type?: string; rest?: number; holiday?: boolean }> };
          if (cancelled || !j.data) continue;
          const next: Record<string, HolidayInfo> = {};
          for (const [k, v] of Object.entries(j.data)) {
            const dateStr = `${year}-${k}`;
            const name = (v as { name?: string })?.name ?? null;
            const type = (v as { type?: string })?.type ?? null;
            const rest = (v as { rest?: number })?.rest;
            const holidayFlag = (v as { holiday?: boolean })?.holiday;
            // timor year 格式（rest: 1=休 0=班）与本地格式（type: holiday/workday）统一解析
            const isHoliday = type === "holiday" || type === "1" || type === "2" || rest === 1 || holidayFlag === true;
            const isWorkday = type === "workday" || type === "3" || rest === 0;
            next[dateStr] = { name, isHoliday, isWorkday, type: type ?? (isHoliday ? "holiday" : isWorkday ? "workday" : null) };
          }
          if (!cancelled) setHolidayCache((prev) => ({ ...prev, ...next }));
        } catch {}
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, view.year, monthDays]);

  // 选中详情（本地优先，避免 holidayCache 触发循环；不因单日接口更新网格样式）
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const lunarLocal = getLunarLocal(selected);
    const cached = holidayCache[selected] ?? null;
    setDetail({ lunar: lunarLocal, holiday: cached });
    (async () => {
      try {
        const r = await fetch(`/api/calendar?date=${selected}`, { cache: "no-store" });
        if (!r.ok) return;
        const j = (await r.json()) as { lunar?: LunarInfo; holiday?: HolidayInfo };
        if (cancelled) return;
        if (j.lunar || j.holiday) {
          // 保持本地中文农历，不被服务端阿拉伯数字覆盖；holiday 独立不替换农历，且不回写 holidayCache（避免点击周末才出现“休”）
          const mergedLunar = j.lunar ? { ...lunarLocal, ...j.lunar, text: lunarLocal.text, day: lunarLocal.day, monthDay: lunarLocal.monthDay, month: lunarLocal.month } : lunarLocal;
          setDetail({ lunar: mergedLunar, holiday: (j.holiday as HolidayInfo) ?? cached });
        }
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, selected]);

  // year 数据返回后（晚于选中），同步详情卡节假日，不重复请求单日接口
  useEffect(() => {
    if (!open) return;
    const cached = holidayCache[selected];
    if (!cached) return;
    setDetail((prev) =>
      prev && prev.holiday?.name === cached.name && prev.holiday?.type === cached.type
        ? prev
        : { lunar: prev?.lunar ?? getLunarLocal(selected), holiday: cached },
    );
  }, [open, selected, holidayCache]);

  useClickOutside(panelRef as React.RefObject<HTMLElement | null>, () => onClose(), open, { ignoreSelectors: ["[data-dock]"] });

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (yearOpen || monthOpen) {
          setYearOpen(false);
          setMonthOpen(false);
          return;
        }
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose, yearOpen, monthOpen]);

  useEffect(() => {
    if (!open) return;
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    if (!panel) return;
    const focusable = panel.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    requestAnimationFrame(() => first?.focus());
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || focusable.length === 0) return;
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    panel.addEventListener("keydown", onKeyDown as unknown as EventListener);
    return () => {
      panel.removeEventListener("keydown", onKeyDown as unknown as EventListener);
      if (previousFocusRef.current && document.contains(previousFocusRef.current)) {
        previousFocusRef.current.focus();
      }
    };
  }, [open]);

  const selectedDate = parseDate(selected);
  const isTodaySelected = selected === todayStr;

  const goPrev = () => setView((v) => (v.month === 0 ? { year: v.year - 1, month: 11 } : { year: v.year, month: v.month - 1 }));
  const goNext = () => setView((v) => (v.month === 11 ? { year: v.year + 1, month: 0 } : { year: v.year, month: v.month + 1 }));
  const goToday = () => {
    const now = new Date();
    setView({ year: now.getFullYear(), month: now.getMonth() });
    setSelected(formatDate(now));
  };

  const years = useMemo(() => Array.from({ length: 200 }, (_, i) => 1900 + i), []);
  const months = useMemo(() => Array.from({ length: 12 }, (_, i) => i + 1), []);

  const handleDayKeyDown = (e: React.KeyboardEvent, dateStr: string) => {
    const d = parseDate(dateStr);
    let target: Date | null = null;
    if (e.key === "ArrowLeft") target = new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1, 12, 0, 0);
    else if (e.key === "ArrowRight") target = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 12, 0, 0);
    else if (e.key === "ArrowUp") target = new Date(d.getFullYear(), d.getMonth(), d.getDate() - 7, 12, 0, 0);
    else if (e.key === "ArrowDown") target = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 7, 12, 0, 0);
    else if (e.key === "Home") target = new Date(d.getFullYear(), d.getMonth(), d.getDate() - d.getDay() + 1, 12, 0, 0);
    else if (e.key === "End") target = new Date(d.getFullYear(), d.getMonth(), d.getDate() + (7 - d.getDay()), 12, 0, 0);
    else if (e.key === "PageUp") target = new Date(d.getFullYear(), d.getMonth() - 1, d.getDate(), 12, 0, 0);
    else if (e.key === "PageDown") target = new Date(d.getFullYear(), d.getMonth() + 1, d.getDate(), 12, 0, 0);
    if (target) {
      e.preventDefault();
      const nextStr = formatDate(target);
      setSelected(nextStr);
      setView({ year: target.getFullYear(), month: target.getMonth() });
      requestAnimationFrame(() => {
        const el = document.querySelector<HTMLElement>(`[data-date="${nextStr}"]`);
        el?.focus();
      });
    }
  };

  const openYear = (e: React.MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setMonthOpen(false);
    setYearAnchor({ x: rect.left, y: rect.bottom });
    setYearOpen((v) => !v);
  };
  const openMonth = (e: React.MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setYearOpen(false);
    setMonthAnchor({ x: rect.left, y: rect.bottom });
    setMonthOpen((v) => !v);
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
                <button type="button" aria-label={`上一月，${view.month === 0 ? view.year - 1 : view.year}年${view.month === 0 ? 12 : view.month}月`} onClick={goPrev} className="flex size-8 items-center justify-center rounded-full bg-zinc-900/5 text-zinc-600 transition-colors hover:bg-zinc-900/10 dark:bg-white/10 dark:text-zinc-300 sm:size-9">
                  <CaretLeftIcon weight="bold" className="size-4 sm:size-[18px]" aria-hidden />
                </button>
                <div className="flex min-w-0 flex-col items-center" aria-live="polite" aria-atomic="true">
                  <span className="truncate text-base font-semibold leading-tight tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-lg">
                    {selectedDate.getMonth() + 1}月{selectedDate.getDate()}日
                    <span className="mx-1.5 font-light text-zinc-300 dark:text-zinc-600 sm:mx-2" aria-hidden>/</span>
                    <span className="text-sm font-medium text-zinc-600 dark:text-zinc-300 sm:text-base">{detail?.lunar.monthDay ?? getLunarLocal(selected).monthDay}</span>
                  </span>
                  <span className="mt-0.5 text-[11px] font-medium text-zinc-500 dark:text-zinc-400 sm:mt-1 sm:text-xs">
                    {selectedDate.getFullYear()}年 · {selectedDate.toLocaleDateString("zh-CN", { weekday: "long" })}
                  </span>
                </div>
                <button type="button" aria-label={`下一月，${view.month === 11 ? view.year + 1 : view.year}年${view.month === 11 ? 1 : view.month + 2}月`} onClick={goNext} className="flex size-8 items-center justify-center rounded-full bg-zinc-900/5 text-zinc-600 transition-colors hover:bg-zinc-900/10 dark:bg-white/10 dark:text-zinc-300 sm:size-9">
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

                  <div className="mt-1 grid grid-cols-7 gap-x-1 gap-y-1 sm:gap-x-2.5 sm:gap-y-2" role="grid" aria-label={`${view.year}年${view.month + 1}月日历`} aria-rowcount={6} aria-colcount={7}>
                    {monthDays.map((c) => {
                      const isToday = c.dateStr === todayStr;
                      const isSelected = c.dateStr === selected;
                      const h = holidayCache[c.dateStr];
                      const lunar = getLunarLocal(c.dateStr);
                      const isWeekend = c.date.getDay() === 0 || c.date.getDay() === 6;
                      const isHoliday = h?.isHoliday;
                      const isWorkday = h?.isWorkday;
                      const subText = lunar.text;
                      const ariaLabel = `${c.dateStr} 星期${["日", "一", "二", "三", "四", "五", "六"][c.date.getDay()]} 农历${lunar.monthDay}${h?.name ? ` ${h.name}` : ""}${isSelected ? " 已选中" : ""}${isToday ? " 今天" : ""}${!c.isCurrent ? " 非本月" : ""}`.trim();
                      return (
                        <button
                          key={c.dateStr}
                          type="button"
                          data-date={c.dateStr}
                          role="gridcell"
                          aria-label={ariaLabel}
                          aria-selected={isSelected}
                          aria-current={isToday ? "date" : undefined}
                          tabIndex={isSelected ? 0 : -1}
                          onClick={() => setSelected(c.dateStr)}
                          onKeyDown={(e) => handleDayKeyDown(e, c.dateStr)}
                          className={`relative flex min-h-[58px] flex-col items-center justify-center overflow-hidden rounded-xl px-0.5 py-2 text-center transition-all max-[360px]:min-h-[56px] sm:min-h-14 sm:px-1 sm:py-2.5 ${!c.isCurrent ? "opacity-35" : ""} ${isSelected ? "bg-zinc-900 text-white shadow-md dark:bg-white dark:text-zinc-900" : isToday ? "ring-2 ring-[var(--accent)] text-[var(--accent)]" : isHoliday ? "bg-red-50 text-red-600 ring-1 ring-red-200 dark:bg-red-500/10 dark:text-red-400 dark:ring-red-500/20" : "hover:bg-zinc-50 dark:hover:bg-zinc-800"}`}
                        >
                          {isHoliday && !isSelected && !isToday && <span className="absolute right-1 top-1 rounded bg-red-500 px-0.5 py-px text-[8px] font-bold leading-none text-white" aria-hidden>休</span>}
                          {isWorkday && !isSelected && !isToday && <span className="absolute right-1 top-1 rounded bg-zinc-500 px-0.5 py-px text-[8px] font-bold leading-none text-white" aria-hidden>班</span>}
                          <span className={`flex h-[18px] items-center justify-center whitespace-nowrap text-[15px] font-bold tabular-nums leading-none tracking-tight sm:h-[20px] sm:text-[15px] md:text-lg ${!isSelected && !isToday && isWeekend ? "text-red-500 dark:text-red-400" : ""} ${isSelected ? "text-white dark:text-zinc-900" : isToday ? "text-[var(--accent)]" : !c.isCurrent ? "text-zinc-400" : "text-zinc-900 dark:text-zinc-100"}`} aria-hidden>{c.day}</span>
                          <span className={`mt-1 w-full max-w-full truncate whitespace-nowrap px-0.5 text-center text-[9px] font-medium leading-none tracking-tight sm:mt-1.5 sm:max-w-[56px] sm:text-xs ${isSelected ? "text-white/80 dark:text-zinc-600" : isToday ? "text-[var(--accent)]/60" : isHoliday ? "text-red-600 dark:text-red-400" : "text-zinc-500 dark:text-zinc-400"}`} aria-hidden>{subText}</span>
                        </button>
                      );
                    })}
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
                    农历 {detail?.lunar.monthDay ?? getLunarLocal(selected).monthDay}
                    {detail?.lunar.ganzhi ? ` · ${detail.lunar.ganzhi}${detail.lunar.zodiac ? `(${detail.lunar.zodiac})` : ""}` : ""}
                  </p>
                  {detail?.holiday?.name ? (
                    <p className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium sm:mt-2.5 sm:text-sm ${detail.holiday.isHoliday ? "bg-red-500 text-white" : detail.holiday.isWorkday ? "bg-zinc-600 text-white" : "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"}`} aria-label={`节假日 ${detail.holiday.name}`}>
                      {detail.holiday.name} {detail.holiday.isHoliday ? "休" : detail.holiday.isWorkday ? "班" : ""}
                    </p>
                  ) : (
                    <p className="mt-2 whitespace-nowrap text-xs tracking-tight text-zinc-500 dark:text-zinc-500 sm:mt-2.5 sm:text-sm">{detail?.holiday?.isHoliday ? "休息日" : detail?.holiday?.isWorkday ? "工作日" : (selectedDate.getDay() === 0 || selectedDate.getDay() === 6) ? "休息日" : "工作日"}</p>
                  )}
                  <div className="mt-3 border-t border-zinc-200 pt-2.5 dark:border-zinc-700 sm:mt-4 sm:pt-3">
                    <div className="text-xs font-semibold tracking-tight text-zinc-500 dark:text-zinc-400 sm:text-[13px]" id="calendar-yiji-title">宜忌</div>
                    <div className="mt-1 text-xs leading-relaxed tracking-tight text-zinc-600 dark:text-zinc-400 sm:mt-1.5 sm:text-[13px]" aria-labelledby="calendar-yiji-title">
                      宜：出行 嫁娶
                      <br />
                      忌：动土
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          <DropdownMenu
            open={yearOpen}
            onClose={() => setYearOpen(false)}
            anchor={yearAnchor}
            selectedKey={String(view.year)}
            id="calendar-year-menu"
            ariaLabel="年份选择"
            items={years.map((y) => ({
              key: String(y),
              label: `${y}年`,
              onClick: () => setView((v) => ({ ...v, year: y })),
            }))}
          />
          <DropdownMenu
            open={monthOpen}
            onClose={() => setMonthOpen(false)}
            anchor={monthAnchor}
            selectedKey={String(view.month + 1)}
            id="calendar-month-menu"
            ariaLabel="月份选择"
            items={months.map((m) => ({
              key: String(m),
              label: `${m}月`,
              onClick: () => setView((v) => ({ ...v, month: m - 1 })),
            }))}
          />
        </>
      )}
    </AnimatePresence>
  );
}
