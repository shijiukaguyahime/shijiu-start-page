# Start — 极简浏览器起始页

一比一复刻 [limestart.cn](https://www.limestart.cn/) 的极简起始页，纯前端实现（Next.js App Router + TypeScript + Tailwind + motion）。

## 页面构成（仅四项）

1. **壁纸**：全屏 Unsplash 山岚背景，加载后淡入，底部轻压暗保证可读性
2. **时间组件**：搜索框正上方，大字时间（`text-7xl/8xl` 超细体），下方一行小字日期 + 星期
3. **毛玻璃搜索框**：`backdrop-blur` 玻璃卡片、矩形圆角 18px；左侧引擎切换（Bing / Google / 百度 / GitHub），输入网址直接跳转、关键词走搜索引擎
4. **底部 Dock 栏**：矩形圆角（外框与内部图标同一圆角体系：外 18px / 内 12px），**最左侧为"全部"菜单按钮**，点开玻璃面板展示全部分组快捷方式；图标 hover 上浮、active 按压

无其他任何文字、标签、徽章。

## 运行

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # 已带 --webpack（兼容 win32 WASM 环境）
```

## 结构

```
src/
  app/
    layout.tsx      # 字体 + metadata（html 带 suppressHydrationWarning）
    page.tsx        # 壁纸 + 时间 + 搜索 + Dock 编排
    globals.css     # Tailwind + 三档玻璃工具类
  components/
    wallpaper.tsx   # 全屏壁纸（单图层淡入）
    search-box.tsx  # 毛玻璃搜索（引擎切换 / URL 直跳）
    dock-bar.tsx    # 底部 Dock（菜单按钮 + 快捷图标）
    menu-panel.tsx  # "全部"快捷方式面板（ESC 关闭 / 焦点陷阱）
  lib/
    data.ts         # Dock 图标、分组数据、搜索引擎 mock
    utils.ts        # cn()
```

## 性能要点

- 动画仅 `transform` / `opacity`，入场各一次，无循环动画
- hover 用 CSS transition，不进 React 渲染周期
- backdrop-filter 仅作用于搜索框、Dock、菜单面板三处
- 无颗粒纹理、无多层图片叠加；壁纸单图层 + opacity 过渡

## 无障碍

- 全部交互元素含 `aria-label`，触摸目标 ≥ 44px
- 面板支持 ESC 关闭、焦点陷阱、背景滚动锁定
- 尊重 `prefers-reduced-motion` 与 `prefers-reduced-transparency`
