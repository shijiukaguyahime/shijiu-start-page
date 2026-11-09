"use client";

import { useEffect, useState } from "react";

/** 时钟自持状态：每秒只重渲染这一小块，避免整棵首页树跟着刷新 */
export function Clock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const hours = now ? String(now.getHours()).padStart(2, "0") : "";
  const minutes = now ? String(now.getMinutes()).padStart(2, "0") : "";
  const date = now?.toLocaleDateString("zh-CN", { month: "long", day: "numeric" }) ?? "";
  const weekday = now?.toLocaleDateString("zh-CN", { weekday: "long" }) ?? "";

  return (
    <div className="text-center" aria-live="off">
      <time
        className="block select-none text-7xl font-extralight tracking-tight text-white tabular-nums drop-shadow-[0_2px_14px_rgba(0,0,0,0.22)] sm:text-7xl"
        aria-label={now ? `${hours}:${minutes}` : undefined}
      >
        {now ? (
          <span className="inline-flex items-center justify-center">
            <span>{hours}</span>
            <span className="mx-2 inline-flex flex-col items-center justify-center gap-2">
              <span className="time-dot size-1.5 rounded-full bg-white shadow-[0_1px_6px_rgba(0,0,0,0.35)] dark:!bg-white" aria-hidden />
              <span className="time-dot size-1.5 rounded-full bg-white shadow-[0_1px_6px_rgba(0,0,0,0.35)] dark:!bg-white" aria-hidden />
            </span>
            <span>{minutes}</span>
          </span>
        ) : (
          <span className="opacity-0">00:00</span>
        )}
      </time>
      <p className="mt-1 text-sm font-medium tracking-wide text-white/85 drop-shadow-[0_1px_6px_rgba(0,0,0,0.25)]">
        {now ? `${date} ${weekday}` : "\u00A0"}
      </p>
    </div>
  );
}
