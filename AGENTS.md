# AGENTS.md — start-page 代码编写规范

> 面向 AI / 人工协作者的工程约束。所有改动需保持与现有设计语言、动效、交互一致，并通过 `npx tsc --noEmit` 与 `npm run build`。

## 1. 项目概览
- 浏览器起始页（Next.js App Router），单页 `src/app/page.tsx` 承载时间、搜索、宫格、一言、壁纸、Dock。
- 核心交互：搜索聚焦⇄一言显隐、右键/点击壁纸⇄宫格、宫格分页、Dock 快捷、拖拽排序（仅桌面）。

## 2. 技术栈
- Next.js 16.3 (webpack), React 19, TypeScript `strict`, Tailwind CSS 3.4, `motion` (motion/react), `sortablejs`, `@phosphor-icons/react`。
- 路径别名 `@/* -> ./src/*`（`tsconfig.json:22`）。

## 3. 目录
```
src/app/          # page.tsx / layout.tsx / globals.css
src/components/   # search-box / hitokoto / dock-bar / app-grid / wallpaper
src/lib/          # data.ts / hooks.ts / utils.ts
public/
```

## 4. 常用命令
```bash
npm run dev      # --webpack
npm run build    # --webpack 含 tsc
npx tsc --noEmit --pretty false
```
`eslint` 目前因 hermes-parser 在此环境不可用可忽略，`tsc` 为准。

## 5. 通用原则
- **小范围替换**：`oldString` 精确到最小可唯一上下文，保留周边缩进与空行。
- **可维护优先**：抽 `useClickOutside`、`limeDropdownMotion`、`gpu` 等公共能力，避免在组件内重复 `addEventListener`。
- **单向数据**：宫格 `groupIdx` 受控于 `page.tsx:16` 并 `localStorage["startpage:gridGroup"]` 持久化，不得在 `AppGrid` 内 `useState(0)` 后卸载丢失。
- **注释精简**：仅解释“为什么”（如 `fixed` 被 `transform` 截获），不写流水账。

## 6. React / TypeScript
- 函数组件 + hooks，`useReducedMotion()` 必须处理，`initial={reduce?false:{...}}`。
- Props 用显式 `type`，`Dispatch<SetStateAction<number>>` 用于受控分页。
- `useRef<HTMLDivElement>(null)` + `as RefObject<HTMLElement|null>` 传入 hooks。
- 避免 `any`；`motion` 的 `ease: [0.22,1,0.36,1]` 需 `as unknown as never` 绕过 `Easing` 类型。

## 7. 样式（Tailwind + globals.css）
### 7.1 设计变量 `src/app/globals.css:5`
```css
:root{ --spring:cubic-bezier(0.22,1,0.36,1); --glass-bg:rgba(255,255,255,0.56); --glass-bg-focus:rgba(255,255,255,0.72); --glass-border:rgba(255,255,255,0.5); }
```
CSS 过渡统一 `ease-[var(--spring)]`，JS 动效统一 `ease:[0.22,1,0.36,1]`。

### 7.2 玻璃拟态
- 基类合并：`.glass-search,.glass-dock,.glass-panel,.dropdown-panel` 共享 `border/will-change/transform/isolate/contain`。
- `glass-search/dock` 同 `background:var(--glass-bg)` + `blur(20px) saturate(160%)`，聚焦 `var(--glass-bg-focus)`。
- `dropdown-panel` `rgba(255,255,255,0.96) blur(16px)`，`glass-panel` `0.88 blur(24px)`。

### 7.3 GPU 加速
- 统一 `.gpu{will-change:transform,opacity,filter; backface-visibility:hidden; transform:translateZ(0)}`，替代分散的 `will-change-transform [backface-visibility:hidden] [transform:translateZ(0)]`。
- `wallpaper.tsx:24`、`page.tsx:120`、`search-box.tsx:104`、`app-grid.tsx:112` 等均用 `gpu`。

### 7.4 布局
- 中央区 `relative mt-6 min-h-[280px] max-w-[880px]`，搜索 `max-w-[520px]` 居中，宫格 `max-w-[880px]` 网格 `grid-cols-4 gap-4 md:grid-cols-6 lg:grid-cols-8 lg:gap-5`，`gap-4` 上下左右一致，`px-2` 与分页点对齐。
- 分页点**必须**置于 `page.tsx` 根 `fixed inset-x-0 bottom-[72px] z-20`（紧贴 Dock `fixed bottom-2.5` 高≈56px），不得置于 `AppGrid` 内（其祖先 `motion.div.gpu` 的 `transform` 会截获 `fixed` 为相对定位）。

## 8. 动效
- `src/lib/hooks.ts:83` `limeDropdownMotion` 为下拉统一预设（`y 6→0 scale 0.97→1 blur 6→0 duration 0.22`），`search-box`/`hitokoto` 共用。
- `page` 搜索/宫格切换 `opacity/y/filter` 28-36ms，`reduce` 时仅 `opacity` 0.18s。

## 9. 事件与 `data-*` 隔离（防冒泡核心）
- 统一 `useClickOutside(refs, handler, enabled, {ignoreSelectors})`（`src/lib/hooks.ts:14`），`handler` 接收原生事件以便 `target.closest("[data-hitokoto]")` 判别。
- **点击外部**：`search-box.tsx:44` 点击一言仅收起引擎列表并 `focus()`，不 `setFocused(false)`；`onBlur` 120ms 后检查 `wrapper.contains(active) || active.closest("[data-hitokoto]")`。
- **一言**：容器 `onMouseDown={preventDefault}` 保持输入框焦点，`DotsThree` 与下拉项 `onMouseDown {preventDefault; stopPropagation}` + `onClick {stopPropagation}`。
- **页面级**：`page.tsx:53` 根 `onContextMenu/onClick` 以 `closest("[data-search]")/[data-dock]/[data-grid]/[data-pagination]/[data-hitokoto]` 为白名单，未命中才 `setShowGrid(true/false)`。分页点容器加 `data-pagination` 且按钮 `stopPropagation`，否则会冒泡至根 `onClick` 导致收起回首页。
- 禁用原生右键：`document.addEventListener("contextmenu", e=>e.preventDefault())`。

## 10. 状态持久化
- `localStorage["startpage:engine"]` 搜索引擎 `SEARCH_ENGINES` id
- `localStorage["startpage:gridGroup"]` 0..`DEFAULT_GROUPS.length`，读写在 `page.tsx:20`
- `localStorage` 读写包 `try` 语义，SSR 时 `typeof window !== "undefined"` 守卫。

## 11. 宫格拖拽与滚动
- `AppGrid` `Sortable.create` 仅桌面：`src/components/app-grid.tsx:44` 先判 `matchMedia("(pointer:coarse)").matches || matchMedia("(max-width:768px)").matches` 则 `return`，避免移动端与垂直滚动冲突。
- `gridScrollRef` 的 `onWheel` 仅在 `!gridScroll.contains(target)` 且 `|deltaX|<|deltaY|` 时切换分组并 `preventDefault`。

## 12. 可访问性
- `aria-label`/`aria-current`/`aria-expanded`/`aria-haspopup` 必填；分页点 `aria-label` 为分组名；Dock 图标 `aria-label="${name}，在新标签页打开"`。
- 气泡提示 `role` 仅装饰，`pointer-events-none` 不抢焦点，`whitespace-nowrap`。

## 13. 性能
- 壁纸单图层 `absolute -inset-6` 避免 `blur` 白边，`loaded` 后淡入，`blur(18px) brightness` + `scale(1.06)` 过渡 620ms `ease-[var(--spring)]`。
- 减少 `backdrop-filter` 层：`*` 已全局 `scrollbar-width:none`，仅玻璃三件套使用。

## 14. 常见坑位
- `fixed` 在 `transform` 祖先内失效 → 分页点、`Dropdown` 若需视口固定必须置于 `page` 根或无 `gpu` 祖先外。
- `w-9` 按钮无 `aspect-square` 会椭圆 → 搜索/清空按钮统一 `aspect-square + w-9⇆w-0`。
- 未 `stopPropagation` 的 Dot/引擎切换会触发根 `onClick` 收起宫格。
- 移动端 `Sortable` 与 `overflow-y-auto` 冲突 → 按 11. 节禁用。

## 15. 提交前自检
1. `npx tsc --noEmit --pretty false` 0 报错
2. `npm run build` `✓ Compiled` 且 `○ /` 静态
3. 交互：聚焦搜索→一言出现→点击一言下拉不失焦→清空按钮显隐→分页点点击不回首页且 hover 下气泡→Dock 上气泡→移动端不可拖拽但可滚动
