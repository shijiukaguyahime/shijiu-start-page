import { NextResponse } from "next/server";
import { createServerCache } from "@/lib/server-cache";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * 随机壁纸解析。三个开源源依次降级，任何一步拿到具体图片就返回；
 * 全挂时用本进程最后一次成功的图片，再不行给浏览器可直接跟随重定向的 Bing 图地址。
 * 保持每次刷新随机：lastGood 只在「失败兜底」时读取，正常路径不复用。
 */

const NATURE_API = "https://wp.upx8.com/api.php?category=nature";
const PICSUM_API = "https://picsum.photos/1920/1080";
const BING_JSON = "https://bing.biturl.top/?resolution=UHD&format=json&index=0&mkt=zh-CN";
// 与客户端 wallpaper.tsx 的 BING_WALLPAPER 一致，浏览器可直接跟随其 302
const BING_IMAGE = "https://bing.biturl.top/?resolution=UHD&format=image&index=0&mkt=zh-CN";

const lastGood = createServerCache<string>(24 * 60 * 60_000, 8);

async function fetchWithTimeout(url: string, init: RequestInit = {}, ms = 4000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: controller.signal, cache: "no-store" });
  } finally {
    clearTimeout(timer);
  }
}

/** 取 302 的 Location，避免服务端真的把 2-4MB 图片下载下来 */
async function resolveRedirect(url: string): Promise<string | null> {
  const manual = await fetchWithTimeout(url, { redirect: "manual", headers: { "User-Agent": "Mozilla/5.0 start-page wallpaper" } });
  const loc = manual.headers.get("location");
  if (loc && /^https?:\/\//.test(loc)) return loc;
  // 某些运行时 manual 会自动跟随或不暴露 Location，退化为跟随后的最终地址
  const followed = await fetchWithTimeout(url, { redirect: "follow" });
  return followed.url && followed.url !== url && /^https?:\/\//.test(followed.url) ? followed.url : null;
}

async function resolveBing(): Promise<string | null> {
  const r = await fetchWithTimeout(BING_JSON);
  if (!r.ok) return null;
  const j = (await r.json()) as { url?: string };
  return j.url && /^https?:\/\//.test(j.url) ? j.url : null;
}

export async function GET() {
  const sources: Array<{ name: string; run: () => Promise<string | null> }> = [
    { name: "upx8", run: () => resolveRedirect(NATURE_API) },
    { name: "picsum", run: () => resolveRedirect(PICSUM_API) },
    { name: "bing", run: resolveBing },
  ];

  for (const source of sources) {
    try {
      const url = await source.run();
      if (!url) continue;
      lastGood.set("nature", url);
      return NextResponse.json({ url, source: source.name }, { headers: { "Cache-Control": "no-store" } });
    } catch {}
  }

  const cached = lastGood.stale("nature");
  if (cached) {
    return NextResponse.json({ url: cached, source: "cache" }, { headers: { "Cache-Control": "no-store" } });
  }

  // 最后一层：Bing 的 image 端点本身会重定向到当日图片，浏览器可直接加载，不会出现空白壁纸
  return NextResponse.json({ url: BING_IMAGE, source: "fallback" }, { headers: { "Cache-Control": "no-store" } });
}
