"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import {
  XIcon,
  CaretDownIcon,
  CaretUpIcon,
  CaretLeftIcon,
  CaretRightIcon,
  ArrowsClockwiseIcon,
  MagnifyingGlassIcon,
  DropIcon,
  WindIcon,
  SunIcon,
  CloudSunIcon,
  CloudIcon,
  CloudRainIcon,
  CloudLightningIcon,
  SnowflakeIcon,
  CloudFogIcon,
} from "@phosphor-icons/react";
import { useClickOutside, useFocusTrap, limeDropdownMotion } from "@/lib/hooks";
// Esc 改走层栈：原来各自监听 document，层栈会先截获，否则会失效
import { ESC_PRIORITY, useEscapeLayer } from "@/lib/keyboard";
import { springEase } from "@/lib/motion";
import { KEYS, readCacheEntry, safeGet, safeRemove, safeSet, writeCacheEntry } from "@/lib/storage";

type WeatherCurrent = { temp: number; feelsLike: number; humidity: number; wind: number; text: string; icon: string; code: number; time: string };
type WeatherDaily = { date: string; max: number; min: number; text: string; icon: string; code: number; precip?: number | null };
type WeatherData = {
  city: string;
  current: WeatherCurrent;
  daily: WeatherDaily[];
  source: string;
  updateTime: string;
  model?: string;
  locationSource?: "city" | "coords";
  stale?: boolean;
  notice?: string;
};

const QUICK_CITIES = ["北京", "上海", "广州", "深圳", "杭州", "南京", "成都", "重庆", "武汉", "西安", "苏州", "天津"];

function getStoredCity(): string {
  return safeGet(KEYS.weatherCity) || "";
}

/** 用户手动选过城市后，不再被自动定位覆盖 */
function isPinnedCity(): boolean {
  return safeGet(KEYS.weatherCityPinned) === "1";
}

/** 本地日期，不能用 toISOString()（UTC 会让北京时间 0-8 点错一天） */
function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatAge(at: number): string {
  const minutes = Math.max(0, Math.round((Date.now() - at) / 60000));
  if (minutes < 1) return "刚刚";
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.round(minutes / 60);
  return hours < 24 ? `${hours} 小时前` : `${Math.round(hours / 24)} 天前`;
}

async function requestWeather(url: string): Promise<WeatherData> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const r = await fetch(url, { cache: "no-store", signal: controller.signal });
    if (!r.ok) {
      const detail = (await r.json().catch(() => null)) as { error?: string } | null;
      throw new Error(detail?.error ?? `请求失败 ${r.status}`);
    }
    return (await r.json()) as WeatherData;
  } finally {
    clearTimeout(timer);
  }
}

/** 接口全挂时展示上次成功数据，而不是空白面板 */
function cachedWeather(): WeatherData | null {
  const entry = readCacheEntry<WeatherData>(KEYS.weatherCache);
  if (!entry) return null;
  return {
    ...entry.value,
    stale: true,
    notice: `天气服务暂不可用，显示 ${formatAge(entry.at)} 的缓存数据`,
  };
}

function WeatherPhosphorIcon({ code, size = 20 }: { code: number; size?: number }) {
  const props = { className: "", style: { width: size, height: size } as React.CSSProperties, weight: "fill" as const, "aria-hidden": true };
  if (code === 0) return <SunIcon {...props} weight="fill" className="text-amber-500" />;
  if (code === 1) return <CloudSunIcon {...props} weight="fill" className="text-amber-500" />;
  if (code === 2) return <CloudIcon {...props} weight="fill" className="text-zinc-500" />;
  if (code === 3) return <CloudIcon {...props} weight="fill" className="text-zinc-600" />;
  if (code >= 45 && code <= 48) return <CloudFogIcon {...props} weight="fill" className="text-zinc-400" />;
  if (code >= 51 && code <= 57) return <CloudRainIcon {...props} weight="fill" className="text-sky-400" />;
  if (code >= 61 && code <= 67) return <CloudRainIcon {...props} weight="fill" className="text-sky-500" />;
  if (code >= 71 && code <= 77) return <SnowflakeIcon {...props} weight="fill" className="text-sky-300" />;
  if (code >= 80 && code <= 82) return <CloudRainIcon {...props} weight="fill" className="text-sky-500" />;
  if (code >= 85 && code <= 86) return <SnowflakeIcon {...props} weight="fill" className="text-sky-300" />;
  if (code >= 95) return <CloudLightningIcon {...props} weight="fill" className="text-amber-600" />;
  return <CloudIcon {...props} weight="fill" className="text-zinc-500" />;
}

export function WeatherPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const reduce = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);
  const [city, setCity] = useState<string>(() => getStoredCity() || "上海");
  const [inputCity, setInputCity] = useState("");
  const [data, setData] = useState<WeatherData | null>(null);
  // 初始即加载态，避免刷新后首次打开出现空内容导致的低高度闪烁
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [forecastPage, setForecastPage] = useState(0);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [autoLocateKey, setAutoLocateKey] = useState(0);
  const titleId = "weather-title";

  // 每次打开重置到“今天”，避免上次浏览的分页/选中日期残留
  useEffect(() => {
    if (!open) return;
    setForecastPage(0);
    setSelectedDate(null);
  }, [open]);

  const reqIdRef = useRef(0);

  /** 统一请求入口：只让最后一次请求生效，避免定位 / IP / 手动切换的结果互相覆盖 */
  const applyWeather = async (url: string, options: { pin?: boolean; closeSearch?: boolean } = {}) => {
    const id = ++reqIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const j = await requestWeather(url);
      if (id !== reqIdRef.current) return;
      const pinned = options.pin === true || isPinnedCity();
      const notices = [
        j.notice,
        !pinned && j.locationSource === "coords" ? "城市由定位推测，点上方城市名可手动切换" : null,
      ].filter(Boolean);
      setData({ ...j, notice: notices.join(" · ") || undefined });
      setCity(j.city);
      setSelectedDate(j.daily[0]?.date ?? null);
      setForecastPage(0);
      safeSet(KEYS.weatherCity, j.city);
      if (options.pin) safeSet(KEYS.weatherCityPinned, "1");
      writeCacheEntry(KEYS.weatherCache, j);
      if (options.closeSearch) setShowSearch(false);
    } catch (e) {
      if (id !== reqIdRef.current) return;
      const cached = cachedWeather();
      if (cached) {
        setData(cached);
        setCity(cached.city);
        setSelectedDate(cached.daily[0]?.date ?? null);
        if (options.closeSearch) setShowSearch(false);
      } else {
        setError(e instanceof Error ? e.message : "获取失败");
      }
    } finally {
      if (id === reqIdRef.current) setLoading(false);
    }
  };

  // 打开面板：用户手动选过城市就一直用它，不再被自动定位覆盖回去
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const stored = getStoredCity();

    const invalidate = () => {
      cancelled = true;
      reqIdRef.current++;
    };

    if (isPinnedCity() && stored) {
      void applyWeather(`/api/weather?city=${encodeURIComponent(stored)}`, { pin: false });
      return invalidate;
    }

    const fetchByCity = (c: string) => applyWeather(`/api/weather?city=${encodeURIComponent(c)}`, { pin: false });
    const fetchByCoords = (lat: number, lon: number) => applyWeather(`/api/weather?lat=${lat}&lon=${lon}`, { pin: false });

    const tryIp = async (): Promise<boolean> => {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 5000);
        const r = await fetch("/api/ip", { cache: "no-store", signal: controller.signal });
        clearTimeout(timer);
        const j = (await r.json()) as { city?: string; source?: string };
        // fallback 表示所有定位源都挂了，别把兜底的「上海」当成用户真实位置
        if (j.city && j.source !== "fallback" && !cancelled) {
          await fetchByCity(j.city.replace(/市$/, ""));
          return true;
        }
      } catch {}
      return false;
    };

    if (typeof navigator !== "undefined" && navigator.geolocation) {
      const geoTimeout = setTimeout(async () => {
        if (cancelled) return;
        const ipOk = await tryIp();
        if (!ipOk && !cancelled) await fetchByCity(stored || "上海");
      }, 3500);

      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          clearTimeout(geoTimeout);
          if (cancelled) return;
          await fetchByCoords(pos.coords.latitude, pos.coords.longitude);
        },
        async () => {
          clearTimeout(geoTimeout);
          if (cancelled) return;
          const ipOk = await tryIp();
          if (!ipOk && !cancelled) await fetchByCity(stored || "上海");
        },
        { enableHighAccuracy: false, timeout: 4000, maximumAge: 600000 },
      );
    } else {
      (async () => {
        const ipOk = await tryIp();
        if (!ipOk && !cancelled) await fetchByCity(stored || "上海");
      })();
    }

    return invalidate;
    // applyWeather 只依赖稳定的 setState 与 ref；autoLocateKey 用于「恢复自动定位」后重跑定位链
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, autoLocateKey]);

  /** 手动查询 / 切换城市：记住选择，之后打开面板不再自动定位 */
  const fetchWeather = (targetCity: string) => {
    void applyWeather(`/api/weather?city=${encodeURIComponent(targetCity)}`, { pin: true, closeSearch: true });
  };

  useClickOutside(panelRef as React.RefObject<HTMLElement | null>, () => onClose(), open, { ignoreSelectors: ["[data-dock]"] });
  useEscapeLayer("weather", open, onClose, ESC_PRIORITY.panel);
  useFocusTrap(panelRef as React.RefObject<HTMLElement | null>, open);

  const handleSearch = () => {
    const v = inputCity.trim();
    if (!v) return;
    fetchWeather(v);
    setInputCity("");
  };

  const totalPages = data ? Math.ceil(data.daily.length / 7) : 1;
  const pageDaily = data ? data.daily.slice(forecastPage * 7, forecastPage * 7 + 7) : [];
  const selectedDaily = data && selectedDate ? (data.daily.find((d) => d.date === selectedDate) ?? null) : null;
  const selectedDailyDate = selectedDaily ? new Date(`${selectedDaily.date}T12:00:00`) : null;
  const selectedDailyIsToday = selectedDaily ? localToday() === selectedDaily.date : false;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-30 bg-black/20 backdrop-blur-[2px] md:hidden"
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            ref={panelRef}
            data-weather
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-busy={loading ? "true" : undefined}
            initial={reduce ? { opacity: 0 } : (limeDropdownMotion.initial as unknown as never)}
            animate={reduce ? { opacity: 1 } : (limeDropdownMotion.animate as unknown as never)}
            exit={reduce ? { opacity: 0 } : (limeDropdownMotion.exit as unknown as never)}
            transition={reduce ? ({ duration: 0.14 } as unknown as never) : (limeDropdownMotion.transition as unknown as never)}
            className="gpu fixed inset-x-0 bottom-[76px] z-40 mx-auto max-h-[min(80vh,680px)] w-[min(620px,calc(100vw-16px))] overflow-hidden rounded-[20px] glass-panel shadow-[0_20px_56px_rgba(0,0,0,0.18)]"
            onClick={(e) => e.stopPropagation()}
            style={{ transformOrigin: "bottom center" }}
          >
            <h2 id={titleId} className="sr-only">天气 - {data?.city ?? city}</h2>
            <div className="flex items-center justify-between bg-white px-4 py-3 dark:bg-zinc-800">
              <button
                type="button"
                onClick={() => setShowSearch((v) => !v)}
                className="flex items-center gap-1.5 rounded-full bg-zinc-900/5 px-3.5 py-2 text-left transition-colors hover:bg-zinc-900/10 dark:bg-white/10 dark:hover:bg-white/15"
                aria-expanded={showSearch}
                aria-haspopup="dialog"
                aria-controls="weather-city-search"
                aria-label={showSearch ? "收起城市搜索" : "展开城市搜索"}
              >
                <span className="text-[15px] font-semibold leading-none text-zinc-900 dark:text-zinc-100" aria-hidden>{data?.city ?? city}</span>
                {showSearch ? <CaretUpIcon weight="bold" className="size-4 text-zinc-500 dark:text-zinc-400" aria-hidden /> : <CaretDownIcon weight="bold" className="size-4 text-zinc-500 dark:text-zinc-400" aria-hidden />}
              </button>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  aria-label={`刷新${data?.city ?? city}天气`}
                  onClick={() => fetchWeather(city)}
                  disabled={loading}
                  className="flex size-8 items-center justify-center rounded-full bg-zinc-900/5 text-zinc-600 transition-colors hover:bg-zinc-900/10 hover:text-zinc-900 disabled:opacity-50 dark:bg-white/10 dark:text-zinc-300 dark:hover:bg-white/15"
                >
                  <ArrowsClockwiseIcon weight="bold" className={`size-4 ${loading ? "animate-spin" : ""}`} aria-hidden />
                </button>
                <button
                  type="button"
                  aria-label="关闭天气弹框"
                  onClick={onClose}
                  className="flex size-8 items-center justify-center rounded-full bg-zinc-900/5 text-zinc-600 transition-colors hover:bg-zinc-900/10 hover:text-zinc-900 dark:bg-white/10 dark:text-zinc-300 dark:hover:bg-white/15"
                >
                  <XIcon weight="bold" className="size-4" aria-hidden />
                </button>
              </div>
            </div>

            <AnimatePresence initial={false}>
              {showSearch && (
                <motion.div
                  id="weather-city-search"
                  role="region"
                  aria-label="城市搜索"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.22, ease: springEase }}
                  className="overflow-hidden border-b border-zinc-100 bg-white dark:border-zinc-700/50 dark:bg-zinc-800"
                >
                  <div className="px-4 pb-3 pt-2">
                    <div className="flex items-center gap-2">
                      <div className="flex flex-1 items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 focus-within:border-zinc-300 focus-within:bg-white dark:border-zinc-700 dark:bg-zinc-900 dark:focus-within:bg-zinc-900">
                        <MagnifyingGlassIcon weight="bold" className="size-4 shrink-0 text-zinc-400" aria-hidden />
                        <input
                          id="weather-city-input"
                          value={inputCity}
                          onChange={(e) => setInputCity(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSearch();
                          }}
                          placeholder="输入城市，如 北京"
                          aria-label="输入城市名称"
                          autoComplete="off"
                          autoFocus
                          className="min-w-0 flex-1 bg-transparent text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none dark:text-zinc-100 dark:placeholder:text-zinc-500"
                        />
                        {inputCity && (
                          <button type="button" onClick={() => setInputCity("")} aria-label="清空输入" className="shrink-0 rounded-full p-1 text-zinc-400 hover:bg-zinc-900/5 hover:text-zinc-600">
                            <XIcon weight="bold" className="size-3.5" aria-hidden />
                          </button>
                        )}
                      </div>
                      <button type="button" onClick={handleSearch} aria-label="查询城市天气" className="shrink-0 rounded-full bg-zinc-900 px-4 py-2 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100">
                        查询
                      </button>
                    </div>
                    <div className="mt-2.5 flex flex-wrap gap-1.5" role="group" aria-label="快捷城市">
                      {QUICK_CITIES.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => fetchWeather(c)}
                          aria-pressed={city === c}
                          aria-label={`切换到${c}`}
                          className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${city === c ? "border-zinc-900 bg-zinc-900 text-white dark:bg-white dark:text-zinc-900" : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"}`}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                    {isPinnedCity() && (
                      <button
                        type="button"
                        onClick={() => {
                          safeRemove(KEYS.weatherCityPinned);
                          setShowSearch(false);
                          setAutoLocateKey((k) => k + 1);
                        }}
                        className="mt-2 text-[11px] font-medium text-zinc-500 underline decoration-zinc-300 underline-offset-2 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100"
                      >
                        恢复自动定位
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div
              id="weather-desc"
              className="max-h-[min(68vh,560px)] overflow-y-auto overscroll-contain bg-white px-3 pb-4 dark:bg-zinc-900 sm:px-4"
              onWheel={(e) => e.stopPropagation()}
              onTouchMove={(e) => e.stopPropagation()}
            >
              {error && <div role="alert" aria-live="assertive" className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-500/10 dark:text-red-400">{error}</div>}

              {loading && !data ? (
                <div className="py-10 text-center" role="status" aria-live="polite" aria-busy="true">
                  <div className="mx-auto size-6 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-900 dark:border-zinc-700 dark:border-t-white" aria-hidden />
                  <p className="mt-3 text-xs text-zinc-500">正在定位并获取天气…</p>
                </div>
              ) : data ? (
                <div className="space-y-4 pt-3">
                  <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-700 dark:bg-zinc-800" role="region" aria-label={`当前天气 ${data.city} ${data.current.temp}度 ${data.current.text}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-2">
                          <span className="text-5xl font-bold tabular-nums tracking-tight text-zinc-900 dark:text-zinc-100">{data.current.temp}</span>
                          <span className="text-xl font-medium text-zinc-600 dark:text-zinc-400">°C</span>
                          <span className="ml-2 truncate text-[15px] font-semibold text-zinc-700 dark:text-zinc-300">{data.current.text}</span>
                        </div>
                        <p className="mt-1.5 text-[13px] text-zinc-500 dark:text-zinc-400">体感 {data.current.feelsLike}° · 湿度 {data.current.humidity}% · 风速 {data.current.wind}km/h</p>
                        <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
                          {new Date(data.updateTime).toLocaleString("zh-CN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })} 更新 · {data.stale ? "离线缓存" : "数值预报"} · 来源 {(data.source ?? "").startsWith("open-meteo") ? "Open-Meteo" : data.source}
                        </p>
                        {data.notice && (
                          <p role="status" className="mt-1 text-[11px] leading-relaxed text-amber-600 dark:text-amber-400">
                            {data.notice}
                          </p>
                        )}
                      </div>
                      <span className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-700 dark:ring-zinc-600" aria-hidden>
                        <WeatherPhosphorIcon code={data.current.code} size={36} />
                      </span>
                    </div>
                    <div className="mt-3 flex items-center gap-4 text-[13px] text-zinc-600 dark:text-zinc-400">
                      <span className="inline-flex items-center gap-1.5">
                        <DropIcon weight="fill" className="size-4 text-sky-500/70" /> {data.current.humidity}%
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <WindIcon weight="bold" className="size-4 text-zinc-500" /> {data.current.wind} km/h
                      </span>
                    </div>
                  </div>

                  {selectedDaily && selectedDailyDate && (
                    <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800" role="region" aria-label={`${selectedDaily.date} 天气预报详情`}>
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                              {selectedDailyDate.toLocaleDateString("zh-CN", { month: "long", day: "numeric" })}
                            </span>
                            {selectedDailyIsToday && <span className="rounded-full px-2 py-0.5 text-[11px] font-bold leading-none text-[var(--accent)] ring-2 ring-[var(--accent)]">今天</span>}
                          </div>
                          <p className="mt-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">{selectedDaily.text}</p>
                          {selectedDaily.precip != null && <p className="mt-1 text-xs text-sky-600 dark:text-sky-400">降水概率 {selectedDaily.precip}%</p>}
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <WeatherPhosphorIcon code={selectedDaily.code} size={28} />
                          <span className="text-xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                            {selectedDaily.max}°<span className="text-sm font-normal text-zinc-500 dark:text-zinc-400">/{selectedDaily.min}°</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div role="region" aria-labelledby="weather-forecast-title" aria-live="polite">
                    <div className="mb-2.5 flex items-center justify-between">
                      <h3 id="weather-forecast-title" className="text-[13px] font-semibold tracking-wide text-zinc-700 dark:text-zinc-300">14日预报</h3>
                      <div className="flex items-center gap-1.5" role="group" aria-label="预报分页">
                        <button
                          type="button"
                          onClick={() => setForecastPage((p) => Math.max(0, p - 1))}
                          disabled={forecastPage === 0}
                          className="flex size-7 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                          aria-label={`上一页，第${forecastPage}页，共${totalPages}页`}
                        >
                          <CaretLeftIcon weight="bold" className="size-3.5" aria-hidden />
                        </button>
                        <span className="min-w-[36px] text-center text-xs tabular-nums text-zinc-500 dark:text-zinc-400" aria-live="polite" aria-atomic="true">
                          {forecastPage + 1}/{totalPages}
                        </span>
                        <button
                          type="button"
                          onClick={() => setForecastPage((p) => Math.min(totalPages - 1, p + 1))}
                          disabled={forecastPage >= totalPages - 1}
                          className="flex size-7 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                          aria-label={`下一页，第${forecastPage + 2}页，共${totalPages}页`}
                        >
                          <CaretRightIcon weight="bold" className="size-3.5" aria-hidden />
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-7 gap-[3px] sm:gap-1.5" role="group" aria-label="每日天气预报">
                      {pageDaily.map((d) => {
                        const dt = new Date(d.date);
                        const isToday = localToday() === d.date;
                        const isSelected = selectedDate === d.date;
                        const week = ["日", "一", "二", "三", "四", "五", "六"][dt.getDay()];
                        return (
                          <button
                            type="button"
                            key={d.date}
                            aria-label={`${d.date} 周${week} ${d.text} 最高${d.max}度 最低${d.min}度${isToday ? " 今天" : ""}`}
                            aria-current={isToday ? "date" : undefined}
                            aria-pressed={isSelected}
                            onClick={() => setSelectedDate(d.date)}
                            className={`flex min-w-0 cursor-pointer flex-col items-center gap-0.5 overflow-hidden rounded-xl border px-[3px] py-1.5 text-center transition-colors sm:gap-1 sm:px-1 sm:py-2.5 ${isToday ? "border-zinc-900 bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 dark:border-white" : "border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-800"} ${isSelected ? "ring-2 ring-[var(--accent)]" : ""}`}
                          >
                            <span className={`whitespace-nowrap text-[10px] font-medium leading-none tracking-tight max-[360px]:text-[9px] sm:text-xs ${isToday ? "text-white dark:text-zinc-900" : "text-zinc-500 dark:text-zinc-400"}`}>{isToday ? "今天" : `周${week}`}</span>
                            <span className={`whitespace-nowrap text-[10px] leading-none tracking-tight max-[360px]:text-[9px] sm:text-[11px] ${isToday ? "text-white/70 dark:text-zinc-600" : "text-zinc-400"}`}>{d.date.slice(5)}</span>
                            <span className="flex size-5 items-center justify-center sm:size-7">
                              <WeatherPhosphorIcon code={d.code} size={16} />
                            </span>
                            <span className={`w-full truncate whitespace-nowrap text-center text-[10px] font-medium leading-tight tracking-tight max-[360px]:text-[9px] sm:text-xs ${isToday ? "text-white dark:text-zinc-900" : "text-zinc-700 dark:text-zinc-200"}`}>{d.text}</span>
                            <span className={`whitespace-nowrap text-[10px] font-semibold tabular-nums leading-none tracking-tight max-[360px]:text-[9px] sm:text-xs ${isToday ? "text-white dark:text-zinc-900" : "text-zinc-900 dark:text-zinc-100"}`}>
                              {d.max}°<span className="font-normal opacity-60">/{d.min}°</span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
