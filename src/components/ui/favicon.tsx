"use client";

import { useState } from "react";

type Props = {
  url?: string;
  domain?: string;
  name: string;
  color?: string;
  size?: number;
  className?: string;
};

export function Favicon({ url, domain: domainProp, name, color, size = 22, className }: Props) {
  const [failed, setFailed] = useState(false);

  const domain = (() => {
    if (domainProp) return domainProp;
    if (!url) return "";
    try {
      return new URL(url).hostname;
    } catch {
      return "";
    }
  })();

  // 优先走同源代理，国内服务器可直连 yandex/iowen，避免浏览器直连 google 被墙
  const src = domain ? `/api/favicon?domain=${encodeURIComponent(domain)}` : null;

  if (src && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        width={size}
        height={size}
        className={className ?? "object-contain"}
        style={{ width: size, height: size }}
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <span
      className="flex size-7 items-center justify-center rounded-lg text-xs font-bold text-white"
      style={{ background: color ?? "#18181b", width: size + 6, height: size + 6 }}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

// 兼容旧调用：直接传 url/name/color 的简易版本
export function FaviconImage({ url, name, color }: { url?: string; name: string; color?: string }) {
  return <Favicon url={url} name={name} color={color} size={22} className="size-[22px] object-contain" />;
}
