import { SEARCH_ENGINES, type SearchEngine } from "./data";

export const ENGINE_KEY = "startpage:engine";
export const ENGINES_KEY = "startpage:engines";
export const HISTORY_KEY = "startpage:searchHistory";
export const SHOW_HISTORY_KEY = "startpage:showSearchHistory";

export function loadEngines(): SearchEngine[] {
  if (typeof window === "undefined") return SEARCH_ENGINES;
  try {
    const raw = localStorage.getItem(ENGINES_KEY);
    if (raw) {
      const arr = JSON.parse(raw) as SearchEngine[];
      if (Array.isArray(arr) && arr.length) return arr;
    }
  } catch {}
  return SEARCH_ENGINES;
}

export function loadEngineId(): string {
  if (typeof window === "undefined") return SEARCH_ENGINES[0].id;
  return localStorage.getItem(ENGINE_KEY) || SEARCH_ENGINES[0].id;
}

export function resolveEngine(engines: SearchEngine[], id: string): SearchEngine {
  return engines.find((e) => e.id === id) ?? engines[0] ?? SEARCH_ENGINES[0];
}

/** 引擎列表持久化：设置页与搜索框下拉共用同一份存储与事件 */
export function saveEngines(engines: SearchEngine[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(ENGINES_KEY, JSON.stringify(engines));
  window.dispatchEvent(new Event("engine-change"));
}

/** 由弹窗表单数据构造自定义引擎，id/图标规则与设置页新增一致 */
export function createCustomEngine(input: { label: string; url: string; icon?: string }): SearchEngine {
  const label = input.label.trim();
  return {
    id: `custom_${Date.now()}`,
    label,
    url: input.url.trim(),
    icon: (input.icon?.trim() || label.slice(0, 1)).slice(0, 2),
    color: "#18181b",
  };
}

export function loadHistory(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function loadShowHistory(): boolean {
  if (typeof window === "undefined") return true;
  const raw = localStorage.getItem(SHOW_HISTORY_KEY);
  return raw === null ? true : raw === "true";
}

export function saveHistory(query: string) {
  const q = query.trim();
  if (!q) return;
  const next = [q, ...loadHistory().filter((x) => x !== q)].slice(0, 20);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event("search-history-change"));
}

export function removeHistory(query: string): string[] {
  const next = loadHistory().filter((x) => x !== query);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event("search-history-change"));
  return next;
}

export function clearHistory() {
  localStorage.removeItem(HISTORY_KEY);
  window.dispatchEvent(new Event("search-history-change"));
}
