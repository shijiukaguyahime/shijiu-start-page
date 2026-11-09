import { NextRequest, NextResponse } from "next/server";
import { createServerCache } from "@/lib/server-cache";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * 天气数据源：Open-Meteo（免费、无需 Key）。
 * 兜底策略：
 *  1) best_match 与 gfs_seamless 两个模型并发竞速，任一成功即用，避免单一模型冷启动超时；
 *  2) 超时从 5s 放宽到 9s（实测主站冷启动可达 5.6s，原值会误杀正常响应）；
 *  3) 上游全挂时返回本进程最后一次成功数据，并标 stale，前端显示「缓存」而不是空白；
 *  4) 坐标定位不再请求 Open-Meteo 的 /v1/reverse（该端点实测 404），改为本地主要城市就近匹配；
 *  5) 地理编码限定中国结果，避免中文同名城市被匹配到国外。
 * 数值预报的 current 是模型当前时刻值，不是气象站实况，返回体里如实标注。
 */

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

/** 常见区县名在开源地理编码里容易匹配到国外同名地，直接映射到所属主要城市 */
const CITY_ALIAS: Record<string, string> = {
  浦东新区: "上海",
  浦东: "上海",
  海淀区: "北京",
  朝阳区: "北京",
  南山区: "深圳",
  天河区: "广州",
  西湖区: "杭州",
  滨江区: "杭州",
  姑苏区: "苏州",
  渝中区: "重庆",
};

type DailyItem = { date: string; max: number; min: number; code: number; text: string; icon: string; precip: number | null };

type ForecastResponse = {
  current: {
    temperature_2m: number;
    weather_code: number;
    relative_humidity_2m: number;
    wind_speed_10m: number;
    apparent_temperature: number;
    time: string;
  };
  daily: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    weather_code: number[];
    precipitation_probability_max: (number | null)[];
  };
};

type WeatherPayload = {
  city: string;
  lat: number;
  lon: number;
  current: {
    temp: number;
    feelsLike: number;
    humidity: number;
    wind: number;
    code: number;
    text: string;
    icon: string;
    time: string;
  };
  daily: DailyItem[];
  source: string;
  updateTime: string;
  model: string;
  locationSource: "city" | "coords";
  stale?: boolean;
  notice?: string;
};

const WEATHER_TTL = 10 * 60_000;
const cache = createServerCache<WeatherPayload>(WEATHER_TTL, 64);

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** 逆地理：就近匹配主要城市，超过阈值就如实显示「当前位置」 */
function nearestCity(lat: number, lon: number): string | null {
  let best: { name: string; km: number } | null = null;
  for (const [name, p] of Object.entries(CITY_LATLNG)) {
    const km = haversineKm(lat, lon, p.lat, p.lon);
    if (!best || km < best.km) best = { name, km };
  }
  return best && best.km <= 120 ? best.name : null;
}

async function geocodeCity(city: string): Promise<{ lat: number; lon: number; name: string } | null> {
  const short = city.replace(/(市|省|自治区|特别行政区)$/g, "").trim();
  const mapped = CITY_ALIAS[short] ?? short;
  if (CITY_LATLNG[mapped]) {
    const v = CITY_LATLNG[mapped];
    return { lat: v.lat, lon: v.lon, name: mapped };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const r = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(short)}&count=5&language=zh&format=json`,
      { signal: controller.signal, cache: "no-store", headers: { "User-Agent": "Mozilla/5.0 start-page weather" } },
    );
    if (!r.ok) return null;
    const j = (await r.json()) as {
      results?: Array<{ latitude: number; longitude: number; name: string; country_code?: string }>;
    };
    const list = j.results ?? [];
    // 同一中文名在国外也有同名地，优先取中国结果
    const hit = list.find((x) => x.country_code === "CN") ?? list[0];
    if (!hit) return null;
    return { lat: hit.latitude, lon: hit.longitude, name: hit.name || short };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchForecast(
  lat: number,
  lon: number,
  model: string,
  signal: AbortSignal,
): Promise<{ data: ForecastResponse; model: string }> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,weather_code,relative_humidity_2m,wind_speed_10m,apparent_temperature` +
    `&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max` +
    `&timezone=Asia%2FShanghai&forecast_days=14&cell_selection=nearest&models=${model}`;
  const r = await fetch(url, {
    signal,
    cache: "no-store",
    headers: { "User-Agent": "Mozilla/5.0 start-page weather" },
  });
  if (!r.ok) throw new Error(`open-meteo ${r.status}`);
  const j = (await r.json()) as ForecastResponse;
  if (!j.current || !j.daily?.time) throw new Error("open-meteo 返回缺失 current/daily");
  return { data: j, model };
}

/** 两个模型并发，取首个成功结果；成功后立刻掐掉另一个，避免上游连接白白挂着 */
async function raceForecast(lat: number, lon: number) {
  const models = ["best_match", "gfs_seamless"];
  const controllers = models.map(() => new AbortController());
  const timer = setTimeout(() => controllers.forEach((c) => c.abort()), 9000);
  try {
    return await Promise.any(models.map((m, i) => fetchForecast(lat, lon, m, controllers[i].signal)));
  } finally {
    clearTimeout(timer);
    controllers.forEach((c) => c.abort());
  }
}

function buildPayload(
  data: ForecastResponse,
  city: string,
  lat: number,
  lon: number,
  model: string,
  locationSource: "city" | "coords",
): WeatherPayload {
  const cur = data.current;
  const daily = data.daily;
  return {
    city,
    lat,
    lon,
    current: {
      temp: Math.round(cur.temperature_2m),
      feelsLike: Math.round(cur.apparent_temperature ?? cur.temperature_2m),
      humidity: cur.relative_humidity_2m,
      wind: cur.wind_speed_10m,
      code: cur.weather_code,
      text: wmoToText(cur.weather_code),
      icon: wmoToIcon(cur.weather_code),
      time: cur.time,
    },
    daily: daily.time.map((d, i) => ({
      date: d,
      max: Math.round(daily.temperature_2m_max[i]),
      min: Math.round(daily.temperature_2m_min[i]),
      code: daily.weather_code[i],
      text: wmoToText(daily.weather_code[i]),
      icon: wmoToIcon(daily.weather_code[i]),
      precip: daily.precipitation_probability_max?.[i] ?? null,
    })),
    source: "open-meteo",
    updateTime: new Date().toISOString(),
    model,
    locationSource,
    notice: "数值预报的当前时刻值，与本地实况可能有偏差",
  };
}

export async function GET(req: NextRequest) {
  const cityParam = req.nextUrl.searchParams.get("city")?.trim() || "上海";
  const latParam = req.nextUrl.searchParams.get("lat");
  const lonParam = req.nextUrl.searchParams.get("lon");

  let lat = NaN;
  let lon = NaN;
  let resolvedCity = cityParam;
  let locationSource: "city" | "coords" = "city";

  try {
    const qLat = latParam ? Number(latParam) : NaN;
    const qLon = lonParam ? Number(lonParam) : NaN;
    if (Number.isFinite(qLat) && Number.isFinite(qLon)) {
      lat = qLat;
      lon = qLon;
      resolvedCity = nearestCity(lat, lon) ?? "当前位置";
      locationSource = "coords";
    } else {
      const geo = await geocodeCity(cityParam);
      if (!geo) {
        return NextResponse.json({ error: `未能解析城市“${cityParam}”，请检查名称或稍后重试` }, { status: 404 });
      }
      lat = geo.lat;
      lon = geo.lon;
      resolvedCity = geo.name;
    }

    const coordKey = `${lat.toFixed(2)},${lon.toFixed(2)}`;
    const cityKey = `city:${cityParam.toLowerCase()}`;
    const fresh = cache.fresh(coordKey);
    if (fresh) {
      return NextResponse.json(
        { ...fresh, city: resolvedCity, locationSource },
        { headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1200" } },
      );
    }

    const { data, model } = await raceForecast(lat, lon);
    const payload = buildPayload(data, resolvedCity, lat, lon, model, locationSource);
    cache.set(coordKey, payload);
    cache.set(cityKey, payload);
    return NextResponse.json(payload, {
      headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1200" },
    });
  } catch (e) {
    // 上游全挂：返回最后一次成功数据，让面板显示「缓存」而不是空白或编造天气
    const coordKey = Number.isFinite(lat) && Number.isFinite(lon) ? `${lat.toFixed(2)},${lon.toFixed(2)}` : "";
    const old = (coordKey && cache.stale(coordKey)) || cache.stale(`city:${cityParam.toLowerCase()}`);
    const age = coordKey ? cache.age(coordKey) : null;
    if (old) {
      return NextResponse.json(
        {
          ...old,
          city: resolvedCity === cityParam ? old.city : resolvedCity,
          source: `${old.source}·缓存`,
          stale: true,
          notice: age != null ? `天气服务暂不可用，显示 ${Math.round(age / 60000)} 分钟前的缓存数据` : "天气服务暂不可用，显示上次成功获取的数据",
        },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
    return NextResponse.json(
      { error: "天气获取失败，请稍后重试", detail: String(e) },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
