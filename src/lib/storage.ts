/**
 * 本地存储统一入口。
 * 隐私模式 / 配额溢出时静默降级，不让页面在写入时抛错中断。
 * 事件名集中在此，避免各处手写字符串拼错导致「设置改了但界面没更新」。
 */

export function safeGet(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function safeSet(key: string, value: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function safeRemove(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {}
}

export function readJson<T>(key: string, fallback: T): T {
  const raw = safeGet(key);
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeJson(key: string, value: unknown): boolean {
  return safeSet(key, JSON.stringify(value));
}

export function dispatchEvent(name: string): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(name));
}

/** 全站按键名（含历史遗留键，保持兼容） */
export const KEYS = {
  groups: "startpage:groups",
  items: "startpage:items",
  gridGroup: "startpage:gridGroup",
  engine: "startpage:engine",
  engines: "startpage:engines",
  searchHistory: "startpage:searchHistory",
  showSearchHistory: "startpage:showSearchHistory",
  wallpaper: "startpage:wallpaper",
  wallpaperHistory: "startpage:wallpaperHistory",
  theme: "startpage:theme",
  glassOpacity: "startpage:glassOpacity",
  wallpaperBrightness: "startpage:wallpaperBrightness",
  wallpaperBlur: "startpage:wallpaperBlur",
  weatherCity: "startpage:weatherCity",
  weatherCityPinned: "startpage:weatherCityPinned",
  weatherCache: "startpage:weatherCache",
} as const;

/** 本页自定义事件；原生 storage 事件由浏览器自己派发，不在此列 */
export const EVENTS = {
  groupsChange: "groups-change",
  engineChange: "engine-change",
  searchHistoryChange: "search-history-change",
  themeChange: "theme-change",
  wallpaperChange: "wallpaper-change",
  wallpaperHistoryChange: "wallpaper-history-change",
  wallpaperBrightnessChange: "wallpaper-brightness-change",
  wallpaperBlurChange: "wallpaper-blur-change",
} as const;

export type CacheEntry<T> = { at: number; value: T };

/** 读取带时间戳的缓存；不做过期判断，由调用方决定新鲜度（接口挂了也能用旧数据） */
export function readCacheEntry<T>(key: string): CacheEntry<T> | null {
  const raw = safeGet(key);
  if (raw === null) return null;
  try {
    const parsed = JSON.parse(raw) as CacheEntry<T>;
    return typeof parsed?.at === "number" && parsed.value != null ? parsed : null;
  } catch {
    return null;
  }
}

export function writeCacheEntry<T>(key: string, value: T): void {
  writeJson(key, { at: Date.now(), value } satisfies CacheEntry<T>);
}
