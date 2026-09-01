import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function fetchWithTimeout(url: string, ms = 3500) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  try {
    const r = await fetch(url, { signal: c.signal, cache: "no-store", headers: { "User-Agent": "Mozilla/5.0 start-page ip" } });
    clearTimeout(t);
    return r;
  } catch (e) {
    clearTimeout(t);
    throw e;
  }
}

export async function GET(req: NextRequest) {
  // 优先从请求头取真实 IP
  const forwarded = req.headers.get("x-forwarded-for");
  const realIp = req.headers.get("x-real-ip");
  const ip = forwarded?.split(",")[0]?.trim() || realIp?.trim() || "unknown";

  // 1. 高德 IP 定位（国内，需Key，免费）
  const amapKey = process.env.AMAP_KEY || process.env.NEXT_PUBLIC_AMAP_KEY;
  if (amapKey) {
    try {
      const r = await fetchWithTimeout(`https://restapi.amap.com/v3/ip?key=${amapKey}&ip=${ip !== "unknown" ? ip : ""}`, 3500);
      if (r.ok) {
        const j = (await r.json()) as { status?: string; city?: string; province?: string; adcode?: string; info?: string };
        if (j.status === "1" && j.city) {
          let city = j.city as string;
          if (Array.isArray(city)) city = city[0];
          // 高德空数组表示直辖市，取 province
          if (!city || (Array.isArray(city) && city.length === 0)) city = (j.province as string) || "";
          if (city) {
            city = city.replace(/市$/, "");
            return NextResponse.json({ city, province: j.province, ip, source: "amap", updateTime: new Date().toISOString() }, { headers: { "Cache-Control": "public, s-maxage=1800" } });
          }
        }
      }
    } catch {}
  }

  // 2. http://ip-api.com （国际，免费，无需Key，http 在服务端可达）
  try {
    const r = await fetchWithTimeout(`http://ip-api.com/json/${ip !== "unknown" && ip !== "::1" && ip !== "127.0.0.1" ? encodeURIComponent(ip) : ""}?lang=zh-CN`, 3500);
    if (r.ok) {
      const j = (await r.json()) as { status?: string; city?: string; regionName?: string; country?: string };
      if (j.status === "success" && j.city) {
        return NextResponse.json({ city: j.city, region: j.regionName, country: j.country, ip, source: "ip-api", updateTime: new Date().toISOString() }, { headers: { "Cache-Control": "public, s-maxage=1800" } });
      }
    }
  } catch {}

  // 3. vvhan ipInfo（国内）
  try {
    const r = await fetchWithTimeout(`https://api.vvhan.com/api/ipInfo`, 3000);
    if (r.ok) {
      const j = (await r.json()) as { success?: boolean; info?: { city?: string; prov?: string }; city?: string };
      const city = (j.info?.city || (j as { city?: string }).city) as string | undefined;
      if (city) {
        return NextResponse.json({ city: city.replace(/市$/, ""), ip, source: "vvhan", updateTime: new Date().toISOString() }, { headers: { "Cache-Control": "public, s-maxage=1800" } });
      }
    }
  } catch {}

  return NextResponse.json({ city: "上海", ip, source: "fallback", updateTime: new Date().toISOString() }, { headers: { "Cache-Control": "public, s-maxage=600" } });
}
