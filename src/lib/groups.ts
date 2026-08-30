import { DEFAULT_GROUPS, type Group, type Shortcut } from "./data";

export const GROUPS_KEY = "startpage:groups";
export const ITEMS_KEY = "startpage:items";

function uid() {
  return `s_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

export function loadGroups(): Group[] {
  if (typeof window === "undefined") return DEFAULT_GROUPS;
  try {
    const raw = localStorage.getItem(GROUPS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Group[];
      if (Array.isArray(parsed) && parsed.length && parsed[0]?.shortcuts) return parsed;
    }
  } catch {}
  return DEFAULT_GROUPS;
}

export function saveGroups(groups: Group[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(GROUPS_KEY, JSON.stringify(groups));
    const flat = groups.flatMap((g) => g.shortcuts);
    localStorage.setItem(ITEMS_KEY, JSON.stringify(flat));
    window.dispatchEvent(new Event("groups-change"));
    // 兼容旧监听
    window.dispatchEvent(new Event("storage"));
  } catch {}
}

export function addShortcut(
  groups: Group[],
  targetGroupIndex: number,
  data: { name: string; url: string; color?: string },
): { next: Group[]; shortcut: Shortcut } {
  const next = groups.map((g) => ({ ...g, shortcuts: [...g.shortcuts] }));
  const idx = Math.max(0, Math.min(targetGroupIndex, next.length - 1));
  const shortcut: Shortcut = {
    id: uid(),
    name: data.name,
    url: data.url,
    color: data.color ?? pickColor(data.name),
  };
  next[idx].shortcuts.push(shortcut);
  return { next, shortcut };
}

export function updateShortcut(
  groups: Group[],
  shortcutId: string,
  data: { name: string; url: string },
): Group[] {
  return groups.map((g) => ({
    ...g,
    shortcuts: g.shortcuts.map((s) => (s.id === shortcutId ? { ...s, name: data.name, url: data.url } : s)),
  }));
}

export function removeShortcut(groups: Group[], shortcutId: string): Group[] {
  return groups.map((g) => ({
    ...g,
    shortcuts: g.shortcuts.filter((s) => s.id !== shortcutId),
  }));
}

function pickColor(name: string): string {
  const palette = ["#4D6BFE", "#FF3B30", "#1A1A1A", "#7B68EE", "#4285F4", "#00A1D6", "#C20C0C", "#2BAE2D", "#FF6A00", "#06B6D4", "#24292F", "#F48024"];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return palette[hash % palette.length];
}

export function getTargetGroupIdxForAdd(currentGroupIdx: number, groups: Group[]): number {
  // 全部(0) 时添加到第一个分组（除全部外的首个）
  if (currentGroupIdx === 0) return 0;
  // 否则添加到当前分组对应的索引
  const idx = currentGroupIdx - 1;
  if (idx < 0 || idx >= groups.length) return 0;
  return idx;
}
