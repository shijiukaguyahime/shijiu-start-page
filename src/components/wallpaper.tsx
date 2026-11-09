"use client";

import { useEffect, useRef, useState } from "react";
import { WALLPAPER_BLUR_DEFAULT, WALLPAPER_BRIGHTNESS_KEY, readWallpaperBlur } from "@/lib/theme";
import { KEYS, EVENTS, dispatchEvent, safeGet, writeJson } from "@/lib/storage";

const DEFAULT_WALLPAPER = "/default_bg.avif";
export const WALLPAPER_KEY = KEYS.wallpaper;
export const BING_WALLPAPER = "https://bing.biturl.top/?resolution=UHD&format=image&index=0&mkt=zh-CN";
export const NATURE_WALLPAPER = "https://wp.upx8.com/api.php?category=nature";

export type WallpaperValue = { type: "default" | "bing" | "unsplash" | "nature"; url: string; request?: string };

export function getWallpaper(): WallpaperValue {
  if (typeof window === "undefined") return { type: "default", url: DEFAULT_WALLPAPER };
  try {
    const raw = localStorage.getItem(WALLPAPER_KEY);
    if (!raw) return { type: "default", url: DEFAULT_WALLPAPER };
    const j = JSON.parse(raw) as WallpaperValue;
    if (j?.url) {
      // 旧版本曾允许上传自定义壁纸，本地文件地址已失效，统一回默认图
      if ((j.type as string) === "custom") return { type: "default", url: DEFAULT_WALLPAPER };
      return j;
    }
  } catch {}
  return { type: "default", url: DEFAULT_WALLPAPER };
}

export const WALLPAPER_HISTORY_KEY = KEYS.wallpaperHistory;
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
    dispatchEvent(EVENTS.wallpaperHistoryChange);
  } catch {}
}

export function removeWallpaperHistory(url: string) {
  if (typeof window === "undefined") return;
  try {
    const list = getWallpaperHistory();
    const next = list.filter((u) => u !== url);
    localStorage.setItem(WALLPAPER_HISTORY_KEY, JSON.stringify(next));
    dispatchEvent(EVENTS.wallpaperHistoryChange);
  } catch {}
}

export function clearWallpaperHistory() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(WALLPAPER_HISTORY_KEY);
    dispatchEvent(EVENTS.wallpaperHistoryChange);
  } catch {}
}

async function fetchJsonWithTimeout<T>(url: string, ms: number): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, { signal: controller.signal, cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchBingConcreteUrl(): Promise<string | null> {
  try {
    const j = await fetchJsonWithTimeout<{ url?: string }>(
      `https://bing.biturl.top/?resolution=UHD&format=json&index=0&mkt=zh-CN`,
      5000,
    );
    if (j?.url && typeof j.url === "string" && j.url.startsWith("http")) return j.url;
  } catch {}
  // json 接口挂了就返回 null：调用方会退回可跟随 302 的 image 地址，
  // 组件层还有「历史图 → 默认图」兜底，不会出现空白壁纸
  return null;
}

export async function fetchNatureConcreteUrl(): Promise<string | null> {
  try {
    // 经同源 API 代理：服务端已做多源降级，正常不会返回 5xx
    const j = await fetchJsonWithTimeout<{ url?: string }>("/api/nature", 8000);
    if (j?.url && typeof j.url === "string" && j.url.startsWith("http")) return j.url;
  } catch {}
  // 代理整体不可用时直连兜底（部分环境可能因 CORS 失败）
  try {
    const res = await fetch(NATURE_WALLPAPER, { cache: "no-store", redirect: "follow" });
    if (res.url && res.url !== NATURE_WALLPAPER && res.url.startsWith("http")) return res.url;
  } catch {}
  return null;
}

export function isWallpaperRequestUrl(url: string): boolean {
  return url === BING_WALLPAPER || url === NATURE_WALLPAPER || url.startsWith("https://wp.upx8.com/api.php?category=nature") || url.includes("bing.biturl.top") && url.includes("format=image");
}

/**
 * 列表缩略图地址：Bing th 与阿里 OSS（随机风景 CDN）均支持按宽裁剪返回小图。
 * 设置页若直接解码 UHD 原图（单张 3-4MB，历史 + 列表可达数十张），滚动会持续卡顿
 */
export function wallpaperThumbUrl(url: string, width = 480): string {
  if (!url) return url;
  try {
    const u = new URL(url);
    if (/(^|\.)bing\.com$/i.test(u.hostname)) {
      u.searchParams.set("w", String(width));
      u.searchParams.set("h", String(Math.round((width * 9) / 16)));
      u.searchParams.set("rs", "1");
      u.searchParams.set("c", "4");
      u.searchParams.set("qlt", "80");
      u.searchParams.set("pid", "hp");
      return u.toString();
    }
    if (u.hostname.endsWith("shanhutech.cn")) {
      u.searchParams.set("x-oss-process", `image/resize,w_${width}`);
      return u.toString();
    }
  } catch {}
  return url;
}

export function setWallpaper(v: WallpaperValue) {
  writeJson(WALLPAPER_KEY, v);
  // 仅保存具体图片 url（非请求接口），请求 url 会在 pick 时已解析为具体 url
  const isRequest = isWallpaperRequestUrl(v.url);
  if (v?.url && !isRequest) addWallpaperHistory(v.url);
  dispatchEvent(EVENTS.wallpaperChange);
}

export function Wallpaper({ blurred = false }: { blurred?: boolean }) {
  const [url, setUrl] = useState(DEFAULT_WALLPAPER);
  const [displayUrl, setDisplayUrl] = useState(DEFAULT_WALLPAPER);
  const [loaded, setLoaded] = useState(false);
  const [brightness, setBrightness] = useState(90);
  const [blur, setBlur] = useState(WALLPAPER_BLUR_DEFAULT);
  const requestSeqRef = useRef(0);

  useEffect(() => {
    const applyBrightness = () => {
      const v = Number(safeGet(WALLPAPER_BRIGHTNESS_KEY));
      if (Number.isFinite(v) && v !== 0) setBrightness(Math.min(120, Math.max(70, v)));
      else setBrightness(90);
    };
    const applyBlur = () => setBlur(readWallpaperBlur());

    // 仅全新页面加载时随机解析一次，storage/事件监听触发的二次加载只采用已解析的具体图，避免多窗口历史写入触发循环解析
    const applyWallpaper = async (initialMount: boolean) => {
      const w = getWallpaper();
      const seq = ++requestSeqRef.current;
      const requestUrl = w.request;
      const hasRequest = !!requestUrl && isWallpaperRequestUrl(requestUrl);

      if (hasRequest && initialMount) {
        // 随机风景 / Bing 每日：每次整页刷新请求一张新图
        setUrl((prev) => {
          if (prev === w.url) return prev;
          setLoaded(false);
          return w.url;
        });
        let concrete: string | null = null;
        if (w.type === "nature" || requestUrl.includes("wp.upx8.com")) {
          concrete = await fetchNatureConcreteUrl();
        } else {
          concrete = await fetchBingConcreteUrl();
        }
        if (seq !== requestSeqRef.current) return;
        const display = concrete || w.url;
        setUrl((prev) => {
          if (prev === display) return prev;
          setLoaded(false);
          return display;
        });
        if (concrete && concrete !== w.url) {
          // 将解析出的具体图写回（缩略图/历史/背景共用同一地址），并保留 request 标记供下次刷新重新随机
          writeJson(WALLPAPER_KEY, { ...w, url: concrete });
          addWallpaperHistory(concrete);
          dispatchEvent(EVENTS.wallpaperChange);
        }
        return;
      }

      // 固定壁纸或已解析的随机图：直接展示当前地址
      setUrl((prev) => {
        if (prev === w.url) return prev;
        setLoaded(false);
        return w.url;
      });
    };

    applyBrightness();
    applyBlur();
    applyWallpaper(true);
    const onChange = () => {
      void applyWallpaper(false);
    };
    const onBright = () => applyBrightness();
    const onBlur = () => applyBlur();
    window.addEventListener(EVENTS.wallpaperChange, onChange);
    window.addEventListener("storage", onChange);
    window.addEventListener(EVENTS.wallpaperBrightnessChange, onBright);
    window.addEventListener(EVENTS.wallpaperBlurChange, onBlur);
    window.addEventListener("storage", onBright);
    window.addEventListener("storage", onBlur);
    return () => {
      requestSeqRef.current++;
      window.removeEventListener(EVENTS.wallpaperChange, onChange);
      window.removeEventListener("storage", onChange);
      window.removeEventListener(EVENTS.wallpaperBrightnessChange, onBright);
      window.removeEventListener(EVENTS.wallpaperBlurChange, onBlur);
      window.removeEventListener("storage", onBright);
      window.removeEventListener("storage", onBlur);
    };
  }, []);

  /**
   * 图片探测 + 兜底链：开源壁纸源随时可能 404 / 被限流。
   * 依次尝试「当前地址 → 历史里最近两张 → 本地默认图」，成功后才淡入，
   * 避免加载失败时 loaded 永远为 false 导致整页只剩纯色背景。
   */
  useEffect(() => {
    let cancelled = false;
    const history = getWallpaperHistory()
      .filter((u) => u !== url && !isWallpaperRequestUrl(u))
      .slice(0, 2);
    const candidates = [url, ...history, DEFAULT_WALLPAPER];
    let index = 0;

    setLoaded(false);
    const tryNext = () => {
      if (cancelled) return;
      const candidate = candidates[index++];
      if (!candidate) return;
      const img = new Image();
      img.onload = () => {
        if (cancelled) return;
        setDisplayUrl(candidate);
        setLoaded(true);
      };
      img.onerror = tryNext;
      img.src = candidate;
    };
    tryNext();
    return () => {
      cancelled = true;
    };
  }, [url]);

  return (
    <div aria-hidden className="fixed inset-0 -z-10 bg-zinc-800 overflow-hidden">
      <div
        className="gpu absolute -inset-6 bg-cover bg-center transition-[filter,transform,opacity] duration-[620ms] ease-[var(--spring)]"
        style={{
          backgroundImage: `url(${displayUrl})`,
          opacity: loaded ? 1 : 0,
          filter: blurred ? `blur(${(blur * 0.2).toFixed(1)}px) brightness(${((brightness / 100) * 0.92).toFixed(2)})` : `blur(0px) brightness(${brightness / 100})`,
          transform: blurred ? "scale(1.06) translateZ(0)" : "scale(1) translateZ(0)",
        }}
      />
      <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-black/20 to-transparent" />
    </div>
  );
}
