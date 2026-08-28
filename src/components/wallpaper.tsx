"use client";

import { useEffect, useState } from "react";

const DEFAULT_WALLPAPER =
  "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=2400&auto=format&fit=crop";
export const WALLPAPER_KEY = "startpage:wallpaper";
export const BING_WALLPAPER = "https://bing.biturl.top/?resolution=UHD&format=image&index=0&mkt=zh-CN";
export const NATURE_WALLPAPER = "https://wp.upx8.com/api.php?category=nature";

export type WallpaperValue = { type: "default" | "bing" | "unsplash" | "nature"; url: string };

export function getWallpaper(): WallpaperValue {
  if (typeof window === "undefined") return { type: "default", url: DEFAULT_WALLPAPER };
  try {
    const raw = localStorage.getItem(WALLPAPER_KEY);
    if (!raw) return { type: "default", url: DEFAULT_WALLPAPER };
    const j = JSON.parse(raw) as WallpaperValue;
    if (j?.url) {
      if ((j.type as string) === "custom") return { type: "default", url: DEFAULT_WALLPAPER };
      return j;
    }
  } catch {}
  return { type: "default", url: DEFAULT_WALLPAPER };
}

export const WALLPAPER_HISTORY_KEY = "startpage:wallpaperHistory";
export const WALLPAPER_HISTORY_MAX = 30;

export function getWallpaperHistory(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(WALLPAPER_HISTORY_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as unknown;
    if (Array.isArray(arr)) {
      const filtered = (arr as string[]).filter((s) => typeof s === "string" && s.length > 0);
      // 过滤掉旧的请求 url（非具体图片），避免随机风景历史去重失效
      const cleaned = filtered.filter((u) => !isWallpaperRequestUrl(u));
      if (cleaned.length !== filtered.length) {
        localStorage.setItem(WALLPAPER_HISTORY_KEY, JSON.stringify(cleaned.slice(0, WALLPAPER_HISTORY_MAX)));
        return cleaned;
      }
      return filtered;
    }
  } catch {}
  return [];
}

export function addWallpaperHistory(url: string) {
  if (!url || typeof window === "undefined") return;
  try {
    const list = getWallpaperHistory();
    const deduped = list.filter((u) => u !== url);
    deduped.unshift(url);
    const next = deduped.slice(0, WALLPAPER_HISTORY_MAX);
    localStorage.setItem(WALLPAPER_HISTORY_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event("wallpaper-history-change"));
  } catch {}
}

export function removeWallpaperHistory(url: string) {
  if (typeof window === "undefined") return;
  try {
    const list = getWallpaperHistory();
    const next = list.filter((u) => u !== url);
    localStorage.setItem(WALLPAPER_HISTORY_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event("wallpaper-history-change"));
  } catch {}
}

export function clearWallpaperHistory() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(WALLPAPER_HISTORY_KEY);
    window.dispatchEvent(new Event("wallpaper-history-change"));
  } catch {}
}

export async function fetchBingConcreteUrl(): Promise<string | null> {
  try {
    const res = await fetch(`https://bing.biturl.top/?resolution=UHD&format=json&index=0&mkt=zh-CN`, { cache: "no-store" });
    const j = (await res.json()) as { url?: string };
    if (j?.url && typeof j.url === "string" && j.url.startsWith("http")) return j.url;
  } catch {}
  return null;
}

export async function fetchNatureConcreteUrl(): Promise<string | null> {
  try {
    // 经由同源 API 代理获取，避免 CDN 无 CORS 导致 fetch 被拦（开发/生产均受影响）
    const res = await fetch("/api/nature", { cache: "no-store" });
    const j = (await res.json()) as { url?: string; error?: string };
    if (j?.url && typeof j.url === "string" && j.url.startsWith("http")) return j.url;
  } catch {}
  // 降级：直连（可能在部分环境因 CORS 失败，仅作兜底）
  try {
    const res = await fetch(NATURE_WALLPAPER, { cache: "no-store", redirect: "follow" });
    if (res.url && res.url !== NATURE_WALLPAPER && res.url.startsWith("http")) return res.url;
  } catch {}
  return null;
}

export function isWallpaperRequestUrl(url: string): boolean {
  return url === BING_WALLPAPER || url === NATURE_WALLPAPER || url.startsWith("https://wp.upx8.com/api.php?category=nature") || url.includes("bing.biturl.top") && url.includes("format=image");
}

export function setWallpaper(v: WallpaperValue) {
  localStorage.setItem(WALLPAPER_KEY, JSON.stringify(v));
  // 仅保存具体图片 url（非请求接口），请求 url 会在 pick 时已解析为具体 url
  const isRequest = isWallpaperRequestUrl(v.url);
  if (v?.url && !isRequest) addWallpaperHistory(v.url);
  else if (v?.url && isRequest) {
    // 对于旧历史中已存的请求 url，仍尝试加入但下次会迁移为具体 url
    // 不直接加入请求 url，避免历史去重失效
  }
  window.dispatchEvent(new Event("wallpaper-change"));
}

export function Wallpaper({ blurred = false }: { blurred?: boolean }) {
  const [url, setUrl] = useState(DEFAULT_WALLPAPER);
  const [loaded, setLoaded] = useState(false);
  const [brightness, setBrightness] = useState(90);
  const [blur, setBlur] = useState(100);

  useEffect(() => {
    const apply = () => {
      const w = getWallpaper();
      setUrl((prev) => {
        if (prev === w.url) return prev;
        setLoaded(false);
        return w.url;
      });
    };
    const applyBrightness = () => {
      const v = Number(localStorage.getItem("startpage:wallpaperBrightness"));
      if (Number.isFinite(v) && v !== 0) setBrightness(Math.min(120, Math.max(70, v)));
      else setBrightness(90);
    };
    const applyBlur = () => {
      const raw = localStorage.getItem("startpage:wallpaperBlur");
      if (raw === null) {
        setBlur(100);
        return;
      }
      const v = Number(raw);
      // 旧默认 0 迁移至 100
      if (!Number.isFinite(v) || v === 0) {
        setBlur(100);
        // 同步回写，避免下次仍为 0
        localStorage.setItem("startpage:wallpaperBlur", "100");
        return;
      }
      setBlur(Math.min(100, Math.max(0, v)));
    };
    apply();
    applyBrightness();
    applyBlur();
    const onChange = () => apply();
    const onBright = () => applyBrightness();
    const onBlur = () => applyBlur();
    window.addEventListener("wallpaper-change", onChange);
    window.addEventListener("storage", onChange);
    window.addEventListener("wallpaper-brightness-change" as never, onBright);
    window.addEventListener("wallpaper-blur-change" as never, onBlur);
    window.addEventListener("storage", onBright);
    window.addEventListener("storage", onBlur);
    return () => {
      window.removeEventListener("wallpaper-change", onChange);
      window.removeEventListener("storage", onChange);
      window.removeEventListener("wallpaper-brightness-change" as never, onBright);
      window.removeEventListener("wallpaper-blur-change" as never, onBlur);
      window.removeEventListener("storage", onBright);
      window.removeEventListener("storage", onBlur);
    };
  }, []);

  // 若当前存储的是请求接口（旧历史，随机风景/bing 每日），迁移为具体图片 url 避免每次刷新随机
  useEffect(() => {
    const w = getWallpaper();
    if (isWallpaperRequestUrl(w.url)) {
      (async () => {
        let concrete: string | null = null;
        if (w.type === "nature" || w.url.includes("wp.upx8.com")) {
          concrete = await fetchNatureConcreteUrl();
        } else if (w.type === "bing" || w.url.includes("bing.biturl.top")) {
          concrete = await fetchBingConcreteUrl();
        }
        if (concrete && concrete !== w.url) {
          const v: WallpaperValue = { type: w.type, url: concrete };
          localStorage.setItem(WALLPAPER_KEY, JSON.stringify(v));
          addWallpaperHistory(concrete);
          window.dispatchEvent(new Event("wallpaper-change"));
          setUrl((prev) => {
            if (prev === concrete) return prev;
            setLoaded(false);
            return concrete;
          });
        }
      })();
    }
  }, []);

  useEffect(() => {
    const img = new Image();
    img.src = url;
    img.onload = () => setLoaded(true);
  }, [url]);

  return (
    <div aria-hidden className="fixed inset-0 -z-10 bg-zinc-800 overflow-hidden">
      <div
        className="gpu absolute -inset-6 bg-cover bg-center transition-[filter,transform,opacity] duration-[620ms] ease-[var(--spring)]"
        style={{
          backgroundImage: `url(${url})`,
          opacity: loaded ? 1 : 0,
          filter: blurred ? `blur(${(blur * 0.2).toFixed(1)}px) brightness(${((brightness / 100) * 0.92).toFixed(2)})` : `blur(0px) brightness(${brightness / 100})`,
          transform: blurred ? "scale(1.06) translateZ(0)" : "scale(1) translateZ(0)",
        }}
      />
      <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-black/20 to-transparent" />
      <div className="absolute inset-0 backdrop-blur-[1px] transition-opacity duration-[620ms] ease-[var(--spring)]" style={{ opacity: blurred ? 1 : 0, pointerEvents: "none" }} />
    </div>
  );
}
