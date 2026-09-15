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

/** 将毛玻璃令牌写入根元素（亮暗基色 + 透明度），各处主题切换共用 */
export function applyGlassTokens(isDark: boolean, opacity: number) {
  const base = isDark ? "30,30,30" : "255,255,255";
  const baseFocus = isDark ? "40,40,40" : "255,255,255";
  const root = document.documentElement;
  root.style.setProperty("--glass-bg", `rgba(${base},${opacity / 100})`);
  root.style.setProperty("--glass-bg-focus", `rgba(${baseFocus},${Math.min(0.72, opacity / 100 + 0.16).toFixed(2)})`);
  root.style.setProperty("--glass-border", isDark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.5)");
}
