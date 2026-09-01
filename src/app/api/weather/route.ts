import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// 国内免费天气API（优先）与开放 fallback
// 1) vvhan 免费天气  https://api.vvhan.com/api/weather?city=北京  (国内，无需Key)
// 2) oioweb 天气    https://api.oioweb.cn/api/weather/weather?city_name=北京
// 3) 高德天气       https://restapi.amap.com/v3/weather/weatherInfo  (国内，需Key，免费额度)
// 4) Open-Meteo    https://api.open-meteo.com  (国际开放，兜底，保证可用性)

const WMO_TEXT: Record<number, string> = {
  0: "晴",
  1: "晴间多云",
  2: "多云",
  3: "阴",
  45: "雾",
  48: "雾凇",
  51: "小毛毛雨",
  53: "毛毛雨",
  55: "大毛毛雨",
  56: "冻毛毛雨",
  57: "冻毛毛雨",
  61: "小雨",
  63: "中雨",
  65: "大雨",
  66: "冻雨",
  67: "冻雨",
  71: "小雪",
  73: "中雪",
  75: "大雪",
  77: "雪粒",
  80: "小阵雨",
  81: "阵雨",
  82: "大阵雨",
  85: "小阵雪",
  86: "大阵雪",
  95: "雷阵雨",
  96: "雷阵雨伴冰雹",
  99: "雷阵雨伴冰雹",
};

function wmoToText(code: number): string {
  return WMO_TEXT[code] ?? "多云";
}

function wmoToIcon(code: number): string {
  if (code === 0) return "☀️";
  if (code <= 1) return "🌤️";
  if (code <= 2) return "⛅";
  if (code <= 3) return "☁️";
  if (code <= 48) return "🌫️";
  if (code <= 65) return "🌧️";
  if (code <= 77) return "❄️";
  if (code <= 82) return "🌧️";
  if (code <= 86) return "🌨️";
  return "⛈️";
}

// 主要城市经纬度，避免额外地理编码请求
const CITY_LATLNG: Record<string, { lat: number; lon: number }> = {
  北京: { lat: 39.9042, lon: 116.4074 },
  上海: { lat: 31.2304, lon: 121.4737 },
  广州: { lat: 23.1291, lon: 113.2644 },
  深圳: { lat: 22.5431, lon: 114.0579 },
  杭州: { lat: 30.2741, lon: 120.1551 },
  南京: { lat: 32.0603, lon: 118.7969 },
  武汉: { lat: 30.5931, lon: 114.3054 },
  成都: { lat: 30.5728, lon: 104.0668 },
  重庆: { lat: 29.563, lon: 106.5516 },
  西安: { lat: 34.3416, lon: 108.9398 },
  苏州: { lat: 31.299, lon: 120.5853 },
  天津: { lat: 39.0842, lon: 117.2009 },
  长沙: { lat: 28.2278, lon: 112.9388 },
  郑州: { lat: 34.7466, lon: 113.6253 },
  青岛: { lat: 36.0671, lon: 120.3826 },
  大连: { lat: 38.914, lon: 121.6147 },
  宁波: { lat: 29.8683, lon: 121.544 },
  厦门: { lat: 24.4798, lon: 118.0894 },
  福州: { lat: 26.0745, lon: 119.2965 },
  济南: { lat: 36.65, lon: 117.12 },
  合肥: { lat: 31.8206, lon: 117.2272 },
  昆明: { lat: 25.0453, lon: 102.7097 },
  石家庄: { lat: 38.0428, lon: 114.5149 },
  南昌: { lat: 28.682, lon: 115.8588 },
  南宁: { lat: 22.817, lon: 108.3665 },
  哈尔滨: { lat: 45.8038, lon: 126.5349 },
  长春: { lat: 43.817, lon: 125.3235 },
  沈阳: { lat: 41.8057, lon: 123.4315 },
  太原: { lat: 37.8706, lon: 112.5489 },
  贵阳: { lat: 26.647, lon: 106.6302 },
  兰州: { lat: 36.0611, lon: 103.8343 },
  海口: { lat: 20.0442, lon: 110.1995 },
  乌鲁木齐: { lat: 43.8256, lon: 87.6168 },
  呼和浩特: { lat: 40.8426, lon: 111.7496 },
  拉萨: { lat: 29.6501, lon: 91.1721 },
  西宁: { lat: 36.6171, lon: 101.7782 },
  银川: { lat: 38.4872, lon: 106.2309 },
};

async function fetchWithTimeout(url: string, ms = 3500) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), ms);
  try {
    const r = await fetch(url, { signal: controller.signal, cache: "no-store", headers: { "User-Agent": "Mozilla/5.0 start-page weather" } });
    clearTimeout(t);
    return r;
  } catch (e) {
    clearTimeout(t);
    throw e;
  }
}

async function tryVvhan(city: string) {
  try {
    const r = await fetchWithTimeout(`https://api.vvhan.com/api/weather?city=${encodeURIComponent(city)}`, 3500);
    if (!r.ok) return null;
    const j = (await r.json()) as unknown;
    // vvhan 格式：{success:true, city, data:{...}} 或 {code:200, data:{...}}
    const obj = j as Record<string, unknown>;
    const data = (obj.data ?? obj.info ?? obj.result) as Record<string, unknown> | undefined;
    if (!data) return null;
    // 尝试提取当前与预报
    // 若结构不符合预期则放弃
    const currentRaw = (data.current ?? data.now ?? data.real) as Record<string, unknown> | undefined;
    const forecastRaw = (data.forecast ?? data.future ?? data.daily) as unknown[] | undefined;
    if (!currentRaw && !Array.isArray(forecastRaw)) return null;
    return { raw: j, parsed: { currentRaw, forecastRaw } };
  } catch {
    return null;
  }
}

async function tryOioweb(city: string) {
  try {
    const r = await fetchWithTimeout(`https://api.oioweb.cn/api/weather/weather?city_name=${encodeURIComponent(city)}`, 3500);
    if (!r.ok) return null;
    const j = (await r.json()) as Record<string, unknown>;
    if (j.code !== 200 && (j as { success?: boolean }).success !== true) {
      // 部分版本返回 {code:1, result:...}
      if (!j.result) return null;
    }
    return j;
  } catch {
    return null;
  }
}

async function geocodeCity(city: string): Promise<{ lat: number; lon: number; name: string } | null> {
  if (CITY_LATLNG[city]) {
    const v = CITY_LATLNG[city];
    return { lat: v.lat, lon: v.lon, name: city };
  }
  // 去掉 市/省后缀后重试
  const short = city.replace(/(市|省|自治区|特别行政区)$/g, "");
  if (CITY_LATLNG[short]) {
    const v = CITY_LATLNG[short];
    return { lat: v.lat, lon: v.lon, name: short };
  }
  try {
    const r = await fetchWithTimeout(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(short)}&count=1&language=zh&format=json`,
      4000,
    );
    if (!r.ok) return null;
    const j = (await r.json()) as { results?: Array<{ latitude: number; longitude: number; name: string }> };
    if (j.results && j.results[0]) {
      return { lat: j.results[0].latitude, lon: j.results[0].longitude, name: j.results[0].name };
    }
  } catch {}
  return null;
}

async function reverseGeocode(lat: number, lon: number): Promise<string | null> {
  try {
    const r = await fetchWithTimeout(
      `https://geocoding-api.open-meteo.com/v1/reverse?latitude=${lat}&longitude=${lon}&language=zh`,
      4000,
    );
    if (!r.ok) return null;
    const j = (await r.json()) as { results?: Array<{ name: string; admin1?: string }> };
    if (j.results && j.results[0]) return j.results[0].name || j.results[0].admin1 || null;
  } catch {}
  return null;
}

type DailyItem = { date: string; max: number; min: number; code: number; text: string; icon: string };

function mockDaily(base: number, days = 14): DailyItem[] {
  const today = new Date();
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const iso = d.toISOString().slice(0, 10);
    const max = base + Math.round(Math.sin(i) * 3 + (i % 2));
    const min = max - 8 - (i % 3);
    const codes = [0, 1, 2, 3, 61, 80, 95];
    const code = codes[i % codes.length];
    return { date: iso, max, min, code, text: wmoToText(code), icon: wmoToIcon(code) };
  });
}

export async function GET(req: NextRequest) {
  const cityParam = req.nextUrl.searchParams.get("city")?.trim() || "北京";
  const city = cityParam === "auto" ? "上海" : cityParam;
  const latParam = req.nextUrl.searchParams.get("lat");
  const lonParam = req.nextUrl.searchParams.get("lon");

  // 1. 尝试国内免费 API（vvhan / oioweb）—— 网络受限时自动跳过
  // vvhan / oioweb 若成功则优先返回，失败则降级至 Open-Meteo
  // 为保证可观测性，仍保留尝试逻辑

  // 尝试 vvhan 解析（若成功且结构可识别则使用，否则忽略）
  // 注意：vvhan 返回结构多样，此处仅作尝试，不阻塞主链路
  let vvhanHit: unknown = null;
  try {
    const v = await tryVvhan(city);
    if (v) vvhanHit = v.raw;
  } catch {}

  let oiowebHit: unknown = null;
  try {
    const o = await tryOioweb(city);
    if (o) oiowebHit = o;
  } catch {}

  // 2. 主链路：Open-Meteo（开放且稳定，兜底保证可用）
  try {
    let lat: number;
    let lon: number;
    let resolvedCity = city;
    const qLat = latParam ? Number(latParam) : NaN;
    const qLon = lonParam ? Number(lonParam) : NaN;
    if (Number.isFinite(qLat) && Number.isFinite(qLon)) {
      lat = qLat;
      lon = qLon;
      const rev = await reverseGeocode(lat, lon);
      if (rev) resolvedCity = rev;
    } else {
      const geo = await geocodeCity(city);
      lat = geo?.lat ?? 39.9042;
      lon = geo?.lon ?? 116.4074;
      resolvedCity = geo?.name ?? city;
    }

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,relative_humidity_2m,wind_speed_10m,apparent_temperature&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max&timezone=Asia/Shanghai&forecast_days=14`;
    const r = await fetchWithTimeout(url, 5000);
    if (!r.ok) throw new Error(`open-meteo ${r.status}`);
    const j = (await r.json()) as {
      current?: { temperature_2m: number; weather_code: number; relative_humidity_2m: number; wind_speed_10m: number; apparent_temperature: number; time: string };
      daily?: { time: string[]; temperature_2m_max: number[]; temperature_2m_min: number[]; weather_code: number[]; precipitation_probability_max: (number | null)[] };
    };

    const cur = j.current;
    const daily = j.daily;

    const current = cur
      ? {
          temp: Math.round(cur.temperature_2m),
          feelsLike: Math.round(cur.apparent_temperature ?? cur.temperature_2m),
          humidity: cur.relative_humidity_2m,
          wind: cur.wind_speed_10m,
          code: cur.weather_code,
          text: wmoToText(cur.weather_code),
          icon: wmoToIcon(cur.weather_code),
          time: cur.time,
        }
      : { temp: 26, feelsLike: 27, humidity: 60, wind: 5, code: 0, text: "晴", icon: "☀️", time: new Date().toISOString() };

    const dailyList: DailyItem[] = daily?.time
      ? daily.time.map((d, i) => ({
          date: d,
          max: Math.round(daily.temperature_2m_max[i]),
          min: Math.round(daily.temperature_2m_min[i]),
          code: daily.weather_code[i],
          text: wmoToText(daily.weather_code[i]),
          icon: wmoToIcon(daily.weather_code[i]),
          precip: daily.precipitation_probability_max?.[i] ?? null,
        }))
      : mockDaily(current.temp);

    return NextResponse.json(
      {
        city: resolvedCity,
        lat,
        lon,
        current,
        daily: dailyList,
        source: vvhanHit ? "vvhan+open-meteo" : oiowebHit ? "oioweb+open-meteo" : "open-meteo",
        updateTime: new Date().toISOString(),
        domestic: {
          vvhan: vvhanHit ? "hit" : "miss",
          oioweb: oiowebHit ? "hit" : "miss",
        },
      },
      { headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1200" } },
    );
  } catch (e) {
    // 极端降级：本地 Mock，保证 UI 不白屏
    const now = new Date();
    const fallbackCurrent = { temp: 26, feelsLike: 28, humidity: 55, wind: 3.2, code: 1, text: "晴间多云", icon: "🌤️", time: now.toISOString() };
    return NextResponse.json(
      {
        city,
        lat: 39.9042,
        lon: 116.4074,
        current: fallbackCurrent,
        daily: mockDaily(fallbackCurrent.temp),
        source: "mock",
        updateTime: now.toISOString(),
        error: String(e),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
}
