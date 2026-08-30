import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 国内源优先，Google 仅最后兜底（墙外）— 并发尝试，首个成功即返回
function getSources(domain: string): string[] {
  const enc = encodeURIComponent(domain);
  return [
    // 国内可直连 - Yandex 最稳（对 stackoverflow 等均有效）
    `https://favicon.yandex.net/favicon/${enc}`,
    // 国内公益
    `https://api.iowen.cn/favicon/${enc}.png`,
    // 备用国内
    `https://favicon.im/${enc}`,
    // Google 中国镜像
    `https://t1.gstatic.cn/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://${enc}&size=64`,
    // Google 原源（海外）
    `https://www.google.com/s2/favicons?domain=${enc}&sz=64`,
  ];
}

function letterSvg(domain: string): string {
  const letter = (domain[0] || "?").toUpperCase();
  // 简单字母 SVG，避免 404 导致控制台报错
  return `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect width="64" height="64" rx="12" fill="#18181b"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-family="system-ui,sans-serif" font-size="28" font-weight="700" fill="#fff">${letter}</text></svg>`;
}

export async function GET(req: NextRequest) {
  const domain = req.nextUrl.searchParams.get("domain")?.trim().toLowerCase();
  if (!domain || !/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain)) {
    return NextResponse.json({ error: "invalid domain" }, { status: 400 });
  }

  const sources = getSources(domain);

  // 并发尝试所有源，带独立超时，任一成功即返回，避免串行等待
  const attempts = sources.map(async (url) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const res = await fetch(url, {
        signal: controller.signal,
        cache: "no-store",
        headers: {
          "User-Agent": "Mozilla/5.0 start-page favicon proxy",
          Accept: "image/*,*/*;q=0.8",
        },
      });
      clearTimeout(timeout);
      if (!res.ok) throw new Error(`status ${res.status}`);
      const ct = res.headers.get("content-type") || "";
      // 宽松判断：只要返回体看起来像图片或可展示
      const buf = await res.arrayBuffer();
      if (buf.byteLength < 80) throw new Error("too small");
      // 若 content-type 非 image 但为 octet-stream 等，也尝试按 png 返回
      const outCt = ct.startsWith("image/") ? ct : "image/png";
      return { buf, ct: outCt, url };
    } catch (e) {
      clearTimeout(timeout);
      throw e;
    }
  });

  try {
    const result = await Promise.any(attempts);
    return new NextResponse(result.buf, {
      status: 200,
      headers: {
        "Content-Type": result.ct,
        "Cache-Control": "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800",
        "X-Favicon-Source": new URL(result.url).hostname,
      },
    });
  } catch {
    // 全部失败则返回字母 SVG，避免浏览器 404 控制台报错
    const svg = letterSvg(domain);
    return new NextResponse(svg, {
      status: 200,
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=3600",
      },
    });
  }
}
