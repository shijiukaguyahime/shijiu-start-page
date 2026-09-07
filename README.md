# Start — 极简浏览器起始页

仿 [limestart.cn](https://www.limestart.cn/) 的极简起始页，纯前端实现（Next.js App Router + TypeScript + Tailwind + motion）。
目前正在开发中。。。

## 在线地址
https://start.shijiucode.cn

## 截图
<img width="1920" height="915" alt="d7092f02fa1c6e8d24b4d117e77066a9" src="https://github.com/user-attachments/assets/dc7dd080-5c84-4d44-807d-07c6aa769e12" />
<img width="1920" height="917" alt="1184f1df7f6a0db86b188c3354b33b4a" src="https://github.com/user-attachments/assets/aeb28748-facb-4cbd-a4d7-5a1ee021f3f7" />
<img width="1920" height="917" alt="92e1bf8cc17b8011f41504e6444e6bbb" src="https://github.com/user-attachments/assets/9796bcd2-989e-409d-af3b-636ce8a2088c" />
<img width="975" height="848" alt="749bfb2441002dad26b26814a7863382" src="https://github.com/user-attachments/assets/d903095a-d2d7-468d-894e-a9be4373559c" />
<img width="1919" height="914" alt="9a04c94e3a0158b9bddd56b57dfed1e7" src="https://github.com/user-attachments/assets/2ec7e286-5e75-42b9-a589-2867b4c2fe93" />
<img width="1920" height="917" alt="0c83a2fea59d403bdbeaf74679842471" src="https://github.com/user-attachments/assets/3b6d70cb-7b64-4fa8-9c99-99b9c661185d" />



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
