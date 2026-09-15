export type ThemeMode = "system" | "light" | "dark";

export const THEME_KEY = "startpage:theme";
export const GLASS_OPACITY_KEY = "startpage:glassOpacity";
export const WALLPAPER_BRIGHTNESS_KEY = "startpage:wallpaperBrightness";
export const WALLPAPER_BLUR_KEY = "startpage:wallpaperBlur";

export function readTheme(): ThemeMode {
  if (typeof window === "undefined") return "system";
  const raw = localStorage.getItem(THEME_KEY);
  return raw === "light" || raw === "dark" ? raw : "system";
}

/** system 跟随系统解析为实际明暗 */
export function resolveTheme(theme: ThemeMode): "light" | "dark" {
  if (theme !== "system") return theme;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function readGlassOpacity(): number {
  if (typeof window === "undefined") return 40;
  const raw = localStorage.getItem(GLASS_OPACITY_KEY);
  if (raw === null) return 40;
  const value = Number(raw);
  return Number.isFinite(value) ? Math.min(80, Math.max(0, value)) : 40;
}

// 遮罩模糊默认值：旧版本既不落盘也无此设置，键缺失时按满强度处理
export const WALLPAPER_BLUR_DEFAULT = 100;

/**
 * 遮罩模糊强度 0-100（聚焦搜索或打开宫格时叠加到壁纸上）
 * 0 是合法值（不额外模糊），仅键缺失或非法时才回退默认值，
 * 否则用户拖到 0 会被“旧默认迁移”改写成满强度，表现为设置时好时坏
 */
export function readWallpaperBlur(): number {
  if (typeof window === "undefined") return WALLPAPER_BLUR_DEFAULT;
  const raw = localStorage.getItem(WALLPAPER_BLUR_KEY);
  if (raw === null) return WALLPAPER_BLUR_DEFAULT;
  const value = Number(raw);
  return Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : WALLPAPER_BLUR_DEFAULT;
}

/** 将毛玻璃令牌写入根元素（亮暗基色 + 透明度），各处主题切换共用 */
export function applyGlassTokens(isDark: boolean, opacity: number) {
  const base = isDark ? "30,30,30" : "255,255,255";
  const baseFocus = isDark ? "40,40,40" : "255,255,255";
  const root = document.documentElement;
  root.style.setProperty("--glass-bg", `rgba(${base},${opacity / 100})`);
  root.style.setProperty("--glass-bg-focus", `rgba(${baseFocus},${Math.min(0.72, opacity / 100 + 0.16).toFixed(2)})`);
  root.style.setProperty("--glass-border", isDark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.5)");
}
