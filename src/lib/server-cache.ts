/**
 * 进程内缓存，专为不稳定的开源接口做 stale-while-error。
 * 只依赖当前 Node/Edge 进程，多实例部署时各持一份，无需外部存储。
 * 正常路径由调用方决定是否读 fresh；上游失败时读 stale 作为最后一次成功结果。
 */
type Entry<T> = { value: T; at: number };

export type ServerCache<T> = {
  /** 只取新鲜数据，过期返回 null */
  fresh: (key: string) => T | null;
  /** 忽略过期时间，用于上游全挂时的兜底 */
  stale: (key: string) => T | null;
  /** 距上次成功写入的毫秒数，供调用方标注数据新鲜度 */
  age: (key: string) => number | null;
  set: (key: string, value: T) => void;
};

export function createServerCache<T>(ttlMs: number, maxEntries = 64): ServerCache<T> {
  const store = new Map<string, Entry<T>>();

  return {
    fresh(key) {
      const hit = store.get(key);
      return hit && Date.now() - hit.at < ttlMs ? hit.value : null;
    },
    stale(key) {
      return store.get(key)?.value ?? null;
    },
    age(key) {
      const hit = store.get(key);
      return hit ? Date.now() - hit.at : null;
    },
    set(key, value) {
      if (store.size >= maxEntries) {
        const oldest = store.keys().next().value;
        if (oldest !== undefined) store.delete(oldest);
      }
      store.set(key, { value, at: Date.now() });
    },
  };
}
