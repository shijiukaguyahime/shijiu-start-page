"use client";

import { useEffect, useState } from "react";

const DEFAULT_WALLPAPER =
  "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=2400&auto=format&fit=crop";
export const WALLPAPER_KEY = "startpage:wallpaper";
export const BING_WALLPAPER = "https://bing.biturl.top/?resolution=1920&format=image&index=0&mkt=zh-CN";

export type WallpaperValue = { type: "default" | "bing" | "unsplash"; url: string };

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

export function setWallpaper(v: WallpaperValue) {
  localStorage.setItem(WALLPAPER_KEY, JSON.stringify(v));
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
