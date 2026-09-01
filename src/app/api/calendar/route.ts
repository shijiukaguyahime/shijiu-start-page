import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// 国内免费日历/节假日 API
// 1) timor.tech  https://timor.tech/api/holiday/info/2025-01-01  (国内，无需Key，免费)
// 2) vvhan      https://api.vvhan.com/api/holiday?date=2025-01-01
// 3) oioweb     https://api.oioweb.cn/api/common/calendar?date=2025-01-01  (含农历、宜忌)
// 4) 本地兜底：Intl农历 + 硬编码节假日库（保证离线可用）

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

// 2025-2026 法定节假日（国务院公布），用于离线兜底
// type: "holiday" | "workday" ; holiday 表示休，workday 表示调休上班
type HolidayEntry = { date: string; name: string; type: "holiday" | "workday" };
const HOLIDAY_2025: HolidayEntry[] = [
  { date: "2025-01-01", name: "元旦", type: "holiday" },
  { date: "2025-01-26", name: "春节调休", type: "workday" },
  { date: "2025-01-28", name: "春节", type: "holiday" },
  { date: "2025-01-29", name: "春节", type: "holiday" },
  { date: "2025-01-30", name: "春节", type: "holiday" },
  { date: "2025-01-31", name: "春节", type: "holiday" },
  { date: "2025-02-08", name: "春节调休", type: "workday" },
  { date: "2025-04-04", name: "清明", type: "holiday" },
  { date: "2025-04-05", name: "清明", type: "holiday" },
  { date: "2025-04-06", name: "清明", type: "holiday" },
  { date: "2025-05-01", name: "劳动节", type: "holiday" },
  { date: "2025-05-02", name: "劳动节", type: "holiday" },
  { date: "2025-05-03", name: "劳动节", type: "holiday" },
  { date: "2025-05-04", name: "劳动节", type: "holiday" },
  { date: "2025-05-05", name: "劳动节", type: "holiday" },
  { date: "2025-05-31", name: "端午", type: "holiday" },
  { date: "2025-06-01", name: "端午", type: "holiday" },
  { date: "2025-06-02", name: "端午", type: "holiday" },
  { date: "2025-09-28", name: "国庆调休", type: "workday" },
  { date: "2025-10-01", name: "国庆", type: "holiday" },
  { date: "2025-10-02", name: "国庆", type: "holiday" },
  { date: "2025-10-03", name: "国庆", type: "holiday" },
  { date: "2025-10-04", name: "国庆", type: "holiday" },
  { date: "2025-10-05", name: "国庆", type: "holiday" },
  { date: "2025-10-06", name: "国庆", type: "holiday" },
  { date: "2025-10-07", name: "国庆", type: "holiday" },
  { date: "2025-10-08", name: "国庆", type: "holiday" },
  { date: "2025-10-11", name: "国庆调休", type: "workday" },
];

const HOLIDAY_2026: HolidayEntry[] = [
  { date: "2026-01-01", name: "元旦", type: "holiday" },
  { date: "2026-01-02", name: "元旦", type: "holiday" },
  { date: "2026-01-03", name: "元旦", type: "holiday" },
  { date: "2026-02-15", name: "春节", type: "holiday" },
  { date: "2026-02-16", name: "春节", type: "holiday" },
  { date: "2026-02-17", name: "春节", type: "holiday" },
  { date: "2026-02-18", name: "春节", type: "holiday" },
  { date: "2026-02-19", name: "春节", type: "holiday" },
  { date: "2026-02-20", name: "春节", type: "holiday" },
  { date: "2026-02-21", name: "春节", type: "holiday" },
  { date: "2026-02-22", name: "春节", type: "holiday" },
  { date: "2026-02-23", name: "春节", type: "holiday" },
  { date: "2026-04-04", name: "清明", type: "holiday" },
  { date: "2026-04-05", name: "清明", type: "holiday" },
  { date: "2026-04-06", name: "清明", type: "holiday" },
  { date: "2026-05-01", name: "劳动节", type: "holiday" },
  { date: "2026-05-02", name: "劳动节", type: "holiday" },
  { date: "2026-05-03", name: "劳动节", type: "holiday" },
  { date: "2026-05-04", name: "劳动节", type: "holiday" },
  { date: "2026-05-05", name: "劳动节", type: "holiday" },
  { date: "2026-06-19", name: "端午", type: "holiday" },
  { date: "2026-06-20", name: "端午", type: "holiday" },
  { date: "2026-06-21", name: "端午", type: "holiday" },
  { date: "2026-09-25", name: "中秋", type: "holiday" },
  { date: "2026-09-26", name: "中秋", type: "holiday" },
  { date: "2026-09-27", name: "中秋", type: "holiday" },
  { date: "2026-10-01", name: "国庆", type: "holiday" },
  { date: "2026-10-02", name: "国庆", type: "holiday" },
  { date: "2026-10-03", name: "国庆", type: "holiday" },
  { date: "2026-10-04", name: "国庆", type: "holiday" },
  { date: "2026-10-05", name: "国庆", type: "holiday" },
  { date: "2026-10-06", name: "国庆", type: "holiday" },
  { date: "2026-10-07", name: "国庆", type: "holiday" },
];

const HOLIDAY_MAP = new Map<string, HolidayEntry>([...HOLIDAY_2025, ...HOLIDAY_2026].map((h) => [h.date, h]));

const LUNAR_DAYS = ["初一", "初二", "初三", "初四", "初五", "初六", "初七", "初八", "初九", "初十", "十一", "十二", "十三", "十四", "十五", "十六", "十七", "十八", "十九", "二十", "廿一", "廿二", "廿三", "廿四", "廿五", "廿六", "廿七", "廿八", "廿九", "三十"];

function toLunarDayText(dayPart: string): string {
  if (/^初|^十|^廿|^三十/.test(dayPart)) return dayPart;
  const n = Number(dayPart.replace(/[^\d]/g, ""));
  if (!Number.isFinite(n) || n < 1 || n > 30) return dayPart;
  return LUNAR_DAYS[n - 1];
}

function getLunar(dateStr: string) {
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
    const zodiacMap: Record<string, string> = {
      子: "鼠",
      丑: "牛",
      寅: "虎",
      卯: "兔",
      辰: "龙",
      巳: "蛇",
      午: "马",
      未: "羊",
      申: "猴",
      酉: "鸡",
      戌: "狗",
      亥: "猪",
    };
    const zodiac = ganzhi ? (zodiacMap[ganzhi[1]] ?? "") : "";
    const isFirst = dayText === "初一";
    // 文本：月初显示 月+日，否则仅日；full 包含年份
    const text = isFirst ? `${monthPartRaw}${dayText}` : dayText;
    const monthDay = `${monthPartRaw}${dayText}`;
    const full = `${yearPart} ${monthDay}`.trim();
    return {
      text,
      monthDay,
      full,
      month: monthPartRaw,
      day: dayText,
      ganzhi,
      zodiac,
      isFirst,
    };
  } catch {
    return { text: "", monthDay: "", full: "", month: "", day: "", ganzhi: "", zodiac: "", isFirst: false };
  }
}

export async function GET(req: NextRequest) {
  const dateParam = req.nextUrl.searchParams.get("date")?.trim();
  const yearParam = req.nextUrl.searchParams.get("year")?.trim();

  // 批量模式：?year=2025 返回全年节假日
  if (yearParam) {
    const year = Number(yearParam);
    if (!Number.isFinite(year) || year < 1970 || year > 2100) {
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
    // 降级：本地库
    const list = [...HOLIDAY_2025, ...HOLIDAY_2026].filter((h) => h.date.startsWith(String(year)));
    const map: Record<string, unknown> = {};
    for (const h of list) map[h.date.slice(5)] = { name: h.name, type: h.type };
    return NextResponse.json({ year, data: map, source: "local", updateTime: new Date().toISOString() }, { headers: { "Cache-Control": "public, s-maxage=3600" } });
  }

  // 单日模式
  let dateStr = dateParam;
  if (!dateStr) {
    const now = new Date();
    dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return NextResponse.json({ error: "invalid date, expected YYYY-MM-DD" }, { status: 400 });
  }

  let holiday: { name: string | null; isHoliday: boolean; isWorkday: boolean; type: string | null } | null = null;
  let source = "local";
  let raw: unknown = null;

  // 1. 尝试 timor.tech 单日
  try {
    const r = await fetchWithTimeout(`https://timor.tech/api/holiday/info/${dateStr}`, 3000);
    if (r.ok) {
      const j = (await r.json()) as { code?: number; type?: { type: number; name: string; week: number }; holiday?: unknown };
      if (j && typeof j.type === "object" && j.type) {
        // timor: type 0 工作日 1 休息 2 节假日 3 调休
        const t = j.type.type;
        const name = j.type.name ?? null;
        const isHoliday = t === 1 || t === 2;
        const isWorkday = t === 3;
        holiday = { name, isHoliday, isWorkday, type: String(t) };
        source = "timor.tech";
        raw = j;
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
            raw = j;
          }
        }
      }
    } catch {}
  }

  // 3. 尝试 oioweb 万年历（含农历与节假日）
  let oiowebLunar: unknown = null;
  if (!raw) {
    try {
      const r = await fetchWithTimeout(`https://api.oioweb.cn/api/common/calendar?date=${dateStr}`, 2500);
      if (r.ok) {
        const j = (await r.json()) as { code?: number; result?: unknown };
        if (j?.result) {
          oiowebLunar = j.result;
          // 若包含 holiday 信息则一并解析
          const res = j.result as Record<string, unknown>;
          if (res.holiday || res.festival) {
            const name = (res.holiday as string) || (res.festival as string) || null;
            if (name) {
              holiday = { name: String(name), isHoliday: true, isWorkday: false, type: "holiday" };
              source = "oioweb";
              raw = j;
            }
          }
        }
      }
    } catch {}
  }

  // 4. 本地兜底
  if (!holiday) {
    const hit = HOLIDAY_MAP.get(dateStr);
    if (hit) {
      holiday = { name: hit.name, isHoliday: hit.type === "holiday", isWorkday: hit.type === "workday", type: hit.type };
    } else {
      // 周末判断
      const d = new Date(dateStr + "T12:00:00");
      const w = d.getDay();
      const isWeekend = w === 0 || w === 6;
      holiday = { name: null, isHoliday: isWeekend, isWorkday: false, type: isWeekend ? "weekend" : "workday" };
    }
    if (source === "local" && !raw) source = "local";
  }

  const lunar = getLunar(dateStr);

  // 额外：若 oioweb 有更丰富的农历则覆盖，但保留 Intl 作为主
  if (oiowebLunar && typeof oiowebLunar === "object") {
    const o = oiowebLunar as Record<string, unknown>;
    // oioweb 字段：lunar_year, lunar_month, lunar_day, zodiac, ganzhi 等，保留作为补充
    // 不覆盖主 lunar.text，以 Intl 为准保证一致性
  }

  return NextResponse.json(
    {
      date: dateStr,
      lunar,
      holiday,
      raw: raw ?? oiowebLunar ?? null,
      source,
      updateTime: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200" } },
  );
}
