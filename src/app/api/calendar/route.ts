import { NextRequest, NextResponse } from "next/server";
import { Solar } from "lunar-javascript";
import { getLunarInfo, isValidCalendarYear, isValidDateString, type HolidayInfo } from "@/lib/calendar";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// 国内免费日历/节假日 API
// 1) timor.tech  https://timor.tech/api/holiday/info/2025-01-01  (国内，无需Key，免费)
// 2) vvhan      https://api.vvhan.com/api/holiday?date=2025-01-01
// 3) 本地兜底：Intl农历 + lunar-javascript 节日推算（保证离线可用，任意年份有效）
// 注：不提供宜忌——免费接口均无宜忌字段（timor 只有节假日，oioweb/8i5/tenapi 已实测失效），
// 无权威来源的数据不编造展示。

async function fetchWithTimeout(url: string, ms = 3500) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  try {
    const r = await fetch(url, { signal: c.signal, cache: "no-store", headers: { "User-Agent": "Mozilla/5.0 start-page calendar" } });
    clearTimeout(t);
    return r;
  } catch (e) {
    clearTimeout(t);
    throw e;
  }
}

// 法定节假日不硬编码年份：国务院每年底才公布次年调休安排，写死 2025/2026 到 2027 就失效。
// 策略：线上 timor/vvhan 优先（有准确调休）；离线用 lunar-javascript 按农历/阳历/节气推正统节日名，任意年份有效。

// 只保留法定节假日正日（洋节如圣诞不收录，避免网格误标“休”）
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
    // 农历节日优先（春节/端午/中秋）
    const lunarHits = [...(lunar.getFestivals() ?? []), ...(lunar.getOtherFestivals() ?? [])];
    for (const f of lunarHits) {
      if (FESTIVAL_ALIAS[f]) return FESTIVAL_ALIAS[f];
    }
    // 阳历节日（元旦/劳动/国庆）
    for (const f of (solar.getFestivals() ?? []) as string[]) {
      if (FESTIVAL_ALIAS[f]) return FESTIVAL_ALIAS[f];
    }
    // 清明是节气不是节日，单独判断
    try {
      const jieqi = (lunar.getJieQi() ?? "") as string;
      if (jieqi === "清明") return "清明";
    } catch {}
    return null;
  } catch {
    return null;
  }
}

// 任意日期的离线兜底：节日正日标休，否则按周末/工作日划分；不伪造“调休上班”（只有国务院能定）
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

export async function GET(req: NextRequest) {
  const dateParam = req.nextUrl.searchParams.get("date")?.trim();
  const yearParam = req.nextUrl.searchParams.get("year")?.trim();

  // 批量模式：?year=2025 返回全年节假日
  if (yearParam) {
    const year = Number(yearParam);
    if (!isValidCalendarYear(year)) {
      return NextResponse.json({ error: "invalid year" }, { status: 400 });
    }
    // 尝试 timor 年接口
    try {
      const r = await fetchWithTimeout(`https://timor.tech/api/holiday/year/${year}`, 3000);
      if (r.ok) {
        const j = (await r.json()) as unknown;
        // timor 返回 {code:0, holiday:{ "01-01":{holiday:true, name:"元旦", wage:1, date:"...", rest:1}, ...}}
        // rest: 1=休息(放假) 0=调休上班；holiday: true=法定节假日
        if (j && typeof j === "object" && (j as { code?: number }).code === 0) {
          const raw = (j as { holiday?: Record<string, unknown> }).holiday;
          if (raw && typeof raw === "object") {
            const data: Record<string, { name?: string; type?: string; rest?: number; wage?: number }> = {};
            for (const [k, v] of Object.entries(raw)) {
              const it = (v ?? {}) as { holiday?: boolean; name?: string; rest?: number; wage?: number };
              const type = it.rest === 1 ? "holiday" : it.rest === 0 ? "workday" : it.holiday === true ? "holiday" : it.holiday === false ? "workday" : undefined;
              data[k] = { name: it.name ?? undefined, type, rest: it.rest, wage: it.wage };
            }
            return NextResponse.json({ year, data, source: "timor.tech", updateTime: new Date().toISOString() }, { headers: { "Cache-Control": "public, s-maxage=3600" } });
          }
        }
      }
    } catch {}
    // 降级：按农历/阳历/节气逐日推算节日正日，任意年份有效（只标正日，不伪造调休连休）
    const map: Record<string, unknown> = {};
    for (let m = 1; m <= 12; m++) {
      const daysInMonth = new Date(year, m, 0).getDate();
      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        const festival = pickLocalFestival(year, m, d);
        if (festival) map[dateStr.slice(5)] = { name: festival, type: "holiday" };
      }
    }
    return NextResponse.json({ year, data: map, source: "local", updateTime: new Date().toISOString() }, { headers: { "Cache-Control": "public, s-maxage=3600" } });
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

  let holiday: HolidayInfo | null = null;
  let source = "local";

  // 1. 尝试 timor.tech 单日
  try {
    const r = await fetchWithTimeout(`https://timor.tech/api/holiday/info/${dateStr}`, 3000);
    if (r.ok) {
      const j = (await r.json()) as { code?: number; type?: { type: number; name: string; week: number }; holiday?: unknown };
      if (j && typeof j.type === "object" && j.type) {
        // timor: type 0 工作日 1 休息 2 节假日 3 调休
        const t = j.type.type;
        const name = t === 0 ? null : (j.type.name ?? null);
        const isHoliday = t === 1 || t === 2;
        const isWorkday = t === 0 || t === 3;
        holiday = { name, isHoliday, isWorkday, type: String(t) };
        source = "timor.tech";
      }
    }
  } catch {}

  // 2. 若 timor 未命中，尝试 vvhan
  if (!holiday) {
    try {
      const r = await fetchWithTimeout(`https://api.vvhan.com/api/holiday?date=${dateStr}`, 2500);
      if (r.ok) {
        const j = (await r.json()) as { success?: boolean; data?: { type?: string; name?: string; isHoliday?: boolean } };
        if (j?.data) {
          const d = j.data as { type?: string; name?: string; isHoliday?: boolean; holiday?: boolean };
          if (d.name || typeof d.isHoliday === "boolean") {
            holiday = { name: d.name ?? null, isHoliday: !!d.isHoliday || !!d.holiday, isWorkday: d.type === "workday", type: d.type ?? null };
            source = "vvhan";
          }
        }
      }
    } catch {}
  }

  // 3. 本地兜底 + 线上校准：timor 没公布的年份只会回“周X”，此时用农历节日名覆盖（如 2027 春节）
  {
    const local = getLocalHoliday(dateStr);
    if (!holiday || (isWeekdayName(holiday.name) && local.name)) {
      holiday = local;
    }
  }

  const lunar = getLunarInfo(dateStr);

  return NextResponse.json(
    {
      date: dateStr,
      lunar,
      holiday,
      source,
      updateTime: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200" } },
  );
}
