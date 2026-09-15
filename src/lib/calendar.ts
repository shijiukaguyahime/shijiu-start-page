export type LunarInfo = {
  text: string;
  full: string;
  month: string;
  day: string;
  monthDay: string;
  ganzhi: string;
  zodiac: string;
  isFirst: boolean;
};

export type HolidayInfo = {
  name: string | null;
  isHoliday: boolean;
  isWorkday: boolean;
  type: string | null;
};

export const CALENDAR_MIN_YEAR = 1900;
export const CALENDAR_MAX_YEAR = 2100;

const LUNAR_DAYS = [
  "初一",
  "初二",
  "初三",
  "初四",
  "初五",
  "初六",
  "初七",
  "初八",
  "初九",
  "初十",
  "十一",
  "十二",
  "十三",
  "十四",
  "十五",
  "十六",
  "十七",
  "十八",
  "十九",
  "二十",
  "廿一",
  "廿二",
  "廿三",
  "廿四",
  "廿五",
  "廿六",
  "廿七",
  "廿八",
  "廿九",
  "三十",
];

const ZODIAC: Record<string, string> = {
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

const lunarFormatter = new Intl.DateTimeFormat("zh-CN-u-ca-chinese", {
  year: "numeric",
  month: "long",
  day: "numeric",
});
const lunarCache = new Map<string, LunarInfo>();
const MAX_LUNAR_CACHE_SIZE = 512;

function toLunarDayText(dayPart: string): string {
  if (/^初|^十|^廿|^三十/.test(dayPart)) return dayPart;
  const n = Number(dayPart.replace(/[^\d]/g, ""));
  if (!Number.isFinite(n) || n < 1 || n > 30) return dayPart;
  return LUNAR_DAYS[n - 1];
}

function cacheLunarInfo(dateStr: string, lunar: LunarInfo): LunarInfo {
  if (lunarCache.size >= MAX_LUNAR_CACHE_SIZE) {
    const oldest = lunarCache.keys().next().value;
    if (oldest !== undefined) lunarCache.delete(oldest);
  }
  lunarCache.set(dateStr, lunar);
  return lunar;
}

export function getLunarInfo(dateStr: string): LunarInfo {
  const cached = lunarCache.get(dateStr);
  if (cached) return cached;

  try {
    const date = new Date(`${dateStr}T12:00:00`);
    const parts = lunarFormatter.formatToParts(date);
    const yearPart = parts.find((part) => part.type === "year")?.value ?? "";
    const monthPart = parts.find((part) => part.type === "month")?.value ?? "";
    const dayPart = parts.find((part) => part.type === "day")?.value ?? "";
    const day = toLunarDayText(dayPart);
    const ganzhi = yearPart.match(/([甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥])/)?.[1] ?? "";
    const zodiac = ganzhi ? (ZODIAC[ganzhi[1]] ?? "") : "";
    const isFirst = day === "初一";
    const monthDay = `${monthPart}${day}`;

    return cacheLunarInfo(dateStr, {
      text: isFirst ? `${monthPart}${day}` : day,
      full: `${yearPart} ${monthDay}`.trim(),
      month: monthPart,
      day,
      monthDay,
      ganzhi,
      zodiac,
      isFirst,
    });
  } catch {
    return cacheLunarInfo(dateStr, {
      text: "",
      full: "",
      month: "",
      day: "",
      monthDay: "",
      ganzhi: "",
      zodiac: "",
      isFirst: false,
    });
  }
}

export function formatDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function parseDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0);
}

export function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

export function isValidCalendarYear(year: number): boolean {
  return Number.isInteger(year) && year >= CALENDAR_MIN_YEAR && year <= CALENDAR_MAX_YEAR;
}

export function isValidDateString(dateStr: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!match) return false;

  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  if (!isValidCalendarYear(year) || month < 1 || month > 12 || day < 1) return false;

  const date = new Date(year, month - 1, day, 12, 0, 0);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}
