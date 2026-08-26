"use client";

import { useEffect, useState } from "react";

/**
 * 全屏壁纸：单图层 + 加载后淡入，无颗粒/多层叠加，保证 GPU 开销最低
 */
const WALLPAPER_URL =
  "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=2400&auto=format&fit=crop";

export function Wallpaper({ blurred = false }: { blurred?: boolean }) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const img = new Image();
    img.src = WALLPAPER_URL;
    img.onload = () => setLoaded(true);
  }, []);

  return (
    <div aria-hidden className="fixed inset-0 -z-10 bg-zinc-800 overflow-hidden">
      {/* 底色 + 扩展 24px 的图片层，避免 blur 在 <320px 窄屏边缘采样到透明而出现白边 */}
      <div
        className="absolute -inset-6 bg-cover bg-center will-change-transform [backface-visibility:hidden] [transform:translateZ(0)] transition-[filter,transform,opacity] duration-[620ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{
          backgroundImage: `url(${WALLPAPER_URL})`,
          opacity: loaded ? 1 : 0,
          filter: blurred ? "blur(18px) brightness(0.92)" : "blur(0px) brightness(1)",
          transform: blurred ? "scale(1.06) translateZ(0)" : "scale(1) translateZ(0)",
        }}
      />
      {/* 底部轻微压暗，保证 Dock 与文字可读性 */}
      <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-black/20 to-transparent" />
      {/* 聚焦时的全局柔光叠加 */}
      <div
        className="absolute inset-0 backdrop-blur-[1px] transition-opacity duration-[620ms] ease-[cubic-bezier(0.22,1,0.36,1)] will-change-[opacity]"
        style={{ opacity: blurred ? 1 : 0, pointerEvents: "none" }}
      />
    </div>
  );
}
