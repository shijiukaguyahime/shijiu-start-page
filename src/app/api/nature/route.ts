import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    // 先尝试以 manual 方式获取 302 的 Location，避免直接下载 2MB 图片
    const manual = await fetch("https://wp.upx8.com/api.php?category=nature", {
      redirect: "manual",
      cache: "no-store",
    });
    const loc = manual.headers.get("location");
    if (loc && loc.startsWith("http")) {
      return NextResponse.json({ url: loc }, { headers: { "Cache-Control": "no-store" } });
    }
    // 某些环境 manual 会被自动跟随或不暴露 location，降级为跟随重定向后取最终 url
    // 此时会实际下载图片，但仅在服务端，无 CORS 限制
    const followed = await fetch("https://wp.upx8.com/api.php?category=nature", {
      redirect: "follow",
      cache: "no-store",
    });
    if (followed.url && followed.url !== "https://wp.upx8.com/api.php?category=nature" && followed.url.startsWith("http")) {
      return NextResponse.json({ url: followed.url }, { headers: { "Cache-Control": "no-store" } });
    }
  } catch {}
  return NextResponse.json({ error: "failed to resolve nature wallpaper" }, { status: 500, headers: { "Cache-Control": "no-store" } });
}
