import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Start — 极简起始页",
  description: "参考 limestart.cn 与 nbtab.com 的个人浏览器起始页。毛玻璃搜索、Dock 与平铺网格双模式，本地持久化。",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="zh-CN"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[var(--background)] text-[var(--foreground)] selection:bg-zinc-900 selection:text-white dark:selection:bg-white dark:selection:text-zinc-900">
        {children}
      </body>
    </html>
  );
}
