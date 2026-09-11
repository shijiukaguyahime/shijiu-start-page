import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// 天气数据源：Open-Meteo（国际开放、无需 Key，实测可用），地理编码走 open-meteo 自家接口。
// 注：曾尝试的 vvhan / oioweb 已实测失效（超时/断连），且从未参与组装数据——已删除，
// 避免白白增加延迟和误导性的 source 标注。取不到就如实报错，不编造天气。

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
  return WMO_TEXT[code] ?? "未知";
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
  if (code >= 95) return "⛈️";
  return "☁️";
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

export async function GET(req: NextRequest) {
  const cityParam = req.nextUrl.searchParams.get("city")?.trim() || "上海";
  const latParam = req.nextUrl.searchParams.get("lat");
  const lonParam = req.nextUrl.searchParams.get("lon");

  try {
    let lat: number;
    let lon: number;
    let resolvedCity: string;
    const qLat = latParam ? Number(latParam) : NaN;
    const qLon = lonParam ? Number(lonParam) : NaN;
    if (Number.isFinite(qLat) && Number.isFinite(qLon)) {
      lat = qLat;
      lon = qLon;
      // 逆解析失败不用默认城市名顶替，用坐标标注，避免张冠李戴
      resolvedCity = (await reverseGeocode(lat, lon)) ?? `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`;
    } else {
      const geo = await geocodeCity(cityParam);
      if (!geo) {
        return NextResponse.json({ error: `未能解析城市“${cityParam}”，请检查名称或稍后重试` }, { status: 404 });
      }
      lat = geo.lat;
      lon = geo.lon;
      resolvedCity = geo.name;
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
    // 上游缺字段就报错，不用 26°晴之类的假数据顶替
    if (!cur || !daily?.time) throw new Error("open-meteo 返回缺失 current/daily");

    const current = {
      temp: Math.round(cur.temperature_2m),
      feelsLike: Math.round(cur.apparent_temperature ?? cur.temperature_2m),
      humidity: cur.relative_humidity_2m,
      wind: cur.wind_speed_10m,
      code: cur.weather_code,
      text: wmoToText(cur.weather_code),
      icon: wmoToIcon(cur.weather_code),
      time: cur.time,
    };

    const dailyList: DailyItem[] = daily.time.map((d, i) => ({
      date: d,
      max: Math.round(daily.temperature_2m_max[i]),
      min: Math.round(daily.temperature_2m_min[i]),
      code: daily.weather_code[i],
      text: wmoToText(daily.weather_code[i]),
      icon: wmoToIcon(daily.weather_code[i]),
      precip: daily.precipitation_probability_max?.[i] ?? null,
    }));

    return NextResponse.json(
      {
        city: resolvedCity,
        lat,
        lon,
        current,
        daily: dailyList,
        source: "open-meteo",
        updateTime: new Date().toISOString(),
      },
      { headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1200" } },
    );
  } catch (e) {
    // 取不到就如实报错（前端会显示错误态），不返回假天气
    return NextResponse.json({ error: "天气获取失败，请稍后重试", detail: String(e) }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}
