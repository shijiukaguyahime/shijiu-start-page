import { NextRequest, NextResponse } from "next/server";
import { Solar } from "lunar-javascript";
import { getLunarInfo, isValidCalendarYear, isValidDateString, type HolidayInfo } from "@/lib/calendar";
import { createServerCache } from "@/lib/server-cache";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * 节假日数据源（按可用性排序）：
 *  1) holiday-cn（jsDelivr 镜像的国务院放假安排 JSON，含调休上班，全年一次请求）
 *  2) timor.tech 年接口（实测常返回 403，仅作备用）
 *  3) 本地 lunar-javascript 推算（离线可用，任意年份有效）
 * 原单日模式依赖的 timor.tech / vvhan 实测返回 Cloudflare 挑战页或超时，已移除，
 * 改为复用同一年的全年数据 —— 更快，也不会同一天在网格和详情卡里出现两种结论。
 * 不提供宜忌：免费接口均无该字段，不编造。
 */

type YearEntry = { name?: string; type?: string; rest?: number; wage?: number; holiday?: boolean };
type YearData = { year: number; data: Record<string, YearEntry>; source: "holiday-cn" | "timor.tech" | "local" | "cache"; partial?: boolean };

const YEAR_TTL = 6 * 60 * 60_000;
const yearCache = createServerCache<YearData>(YEAR_TTL, 12);

const HOLIDAY_CN_URL = "https://cdn.jsdelivr.net/gh/NateScarlet/holiday-cn@master";

async function fetchJson<T>(url: string, ms: number): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    const r = await fetch(url, {
      signal: controller.signal,
      cache: "no-store",
      headers: { "User-Agent": "Mozilla/5.0 start-page calendar" },
    });
    if (!r.ok) throw new Error(`${new URL(url).hostname} ${r.status}`);
    return (await r.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

const FESTIVAL_ALIAS: Record<string, string> = {
  元旦节: "元旦",
  春节: "春节",
  清明: "清明",
  劳动节: "劳动节",
  端午节: "端午",
  中秋节: "中秋",
  国庆节: "国庆",
};

function pickLocalFestival(y: number, m: number, d: number): string | null {
  try {
    const solar = Solar.fromYmd(y, m, d);
    const lunar = solar.getLunar();
    const lunarHits = [...(lunar.getFestivals() ?? []), ...(lunar.getOtherFestivals() ?? [])];
    for (const f of lunarHits) {
      if (FESTIVAL_ALIAS[f]) return FESTIVAL_ALIAS[f];
    }
    for (const f of (solar.getFestivals() ?? []) as string[]) {
      if (FESTIVAL_ALIAS[f]) return FESTIVAL_ALIAS[f];
    }
    try {
      if ((lunar.getJieQi() ?? "") === "清明") return "清明";
    } catch {}
    return null;
  } catch {
    return null;
  }
}

/** 离线兜底：节日正日标休，其余按周末/工作日划分；不伪造调休 */
function getLocalHoliday(dateStr: string): HolidayInfo {
  const [y, m, d] = dateStr.split("-").map(Number);
  const festival = Number.isFinite(y) && Number.isFinite(m) && Number.isFinite(d) ? pickLocalFestival(y, m, d) : null;
  if (festival) return { name: festival, isHoliday: true, isWorkday: false, type: "holiday" };
  const w = new Date(dateStr + "T12:00:00").getDay();
  const isWeekend = w === 0 || w === 6;
  return { name: null, isHoliday: isWeekend, isWorkday: false, type: isWeekend ? "weekend" : "workday" };
}

function isWeekdayName(name: string | null): boolean {
  return !!name && /^周[一二三四五六日]$/.test(name);
}

/** 全年本地日历：哪怕所有上游都挂，也给出完整的周末与节日结构 */
function buildLocalYear(year: number): YearData {
  const data: Record<string, YearEntry> = {};
  for (let m = 1; m <= 12; m++) {
    const daysInMonth = new Date(year, m, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const key = dateStr.slice(5);
      const local = getLocalHoliday(dateStr);
      if (local.name) data[key] = { name: local.name, type: "holiday" };
      else if (local.isHoliday) data[key] = { type: "weekend" };
    }
  }
  return { year, data, source: "local", partial: true };
}

const inflight = new Map<number, Promise<YearData>>();

async function resolveYearData(year: number, key: string): Promise<YearData> {
  // 1. 国务院放假安排（含调休）
  try {
    const j = await fetchJson<{ days?: Array<{ name: string; date: string; isOffDay: boolean }> }>(
      `${HOLIDAY_CN_URL}/${year}.json`,
      5000,
    );
    if (Array.isArray(j.days) && j.days.length) {
      const data: Record<string, YearEntry> = {};
      for (const day of j.days) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(day.date) || !day.date.startsWith(String(year))) continue;
        data[day.date.slice(5)] = day.isOffDay
          ? { name: day.name, type: "holiday", rest: 1 }
          : { name: day.name, type: "workday", rest: 0 };
      }
      if (Object.keys(data).length) {
        const result: YearData = { year, data, source: "holiday-cn" };
        yearCache.set(key, result);
        return result;
      }
      // 空 days 不算成功，继续往下走降级链
    }
  } catch {}

  // 2. timor 年接口（多数时候 403，短超时避免拖慢首次打开）
  try {
    const j = await fetchJson<{ code?: number; holiday?: Record<string, YearEntry> }>(
      `https://timor.tech/api/holiday/year/${year}`,
      2500,
    );
    if (j?.code === 0 && j.holiday && typeof j.holiday === "object") {
      const data: Record<string, YearEntry> = {};
      for (const [k, v] of Object.entries(j.holiday)) {
        const it = (v ?? {}) as { holiday?: boolean; name?: string; rest?: number; wage?: number };
        const type = it.rest === 1 ? "holiday" : it.rest === 0 ? "workday" : it.holiday === true ? "holiday" : it.holiday === false ? "workday" : undefined;
        data[k] = { name: it.name ?? undefined, type, rest: it.rest, wage: it.wage };
      }
      // 该接口偶尔返回 code:0 但 holiday 为空，空数据不能算成功，否则整年日历没有休/班标记
      if (Object.keys(data).length) {
        const result: YearData = { year, data, source: "timor.tech" };
        yearCache.set(key, result);
        return result;
      }
    }
  } catch {}

  // 3. 上游全挂：最后一次成功数据优先，其次本地推算
  const stale = yearCache.stale(key);
  if (stale) return { ...stale, source: "cache" };
  const local = buildLocalYear(year);
  yearCache.set(key, local);
  return local;
}

/** 面板打开时全年请求与单日请求会并发，合并成一次上游调用 */
async function loadYearData(year: number): Promise<YearData> {
  const key = `year:${year}`;
  const fresh = yearCache.fresh(key);
  if (fresh) return fresh;
  const running = inflight.get(year);
  if (running) return running;
  const task = resolveYearData(year, key).finally(() => inflight.delete(year));
  inflight.set(year, task);
  return task;
}

export async function GET(req: NextRequest) {
  const dateParam = req.nextUrl.searchParams.get("date")?.trim();
  const yearParam = req.nextUrl.searchParams.get("year")?.trim();

  // 批量模式：?year=2026 返回全年节假日
  if (yearParam) {
    const year = Number(yearParam);
    if (!isValidCalendarYear(year)) {
      return NextResponse.json({ error: "invalid year" }, { status: 400 });
    }
    const result = await loadYearData(year);
    return NextResponse.json(
      { year, data: result.data, source: result.source, partial: result.partial ?? false, updateTime: new Date().toISOString() },
      { headers: { "Cache-Control": "public, s-maxage=3600" } },
    );
  }

  // 单日模式
  let dateStr = dateParam;
  if (!dateStr) {
    const now = new Date();
    dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  }
  if (!isValidDateString(dateStr)) {
    return NextResponse.json({ error: "invalid date, expected YYYY-MM-DD" }, { status: 400 });
  }

  const year = Number(dateStr.slice(0, 4));
  const yearData = await loadYearData(year);
  const entry = yearData.data[dateStr.slice(5)];

  let holiday: HolidayInfo;
  if (entry) {
    const isHoliday = entry.type === "holiday" || entry.rest === 1 || entry.holiday === true || entry.type === "1" || entry.type === "2";
    const isWorkday = entry.type === "workday" || entry.rest === 0 || entry.type === "0" || entry.type === "3";
    holiday = { name: entry.name ?? null, isHoliday, isWorkday, type: entry.type ?? (isHoliday ? "holiday" : null) };
  } else {
    holiday = getLocalHoliday(dateStr);
  }

  // 线上未公布该年调休时只会回「周X」，用农历节日名校准
  const local = getLocalHoliday(dateStr);
  if (isWeekdayName(holiday.name) && local.name) holiday = local;

  return NextResponse.json(
    {
      date: dateStr,
      lunar: getLunarInfo(dateStr),
      holiday,
      source: yearData.source,
      partial: yearData.partial ?? false,
      updateTime: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200" } },
  );
}
