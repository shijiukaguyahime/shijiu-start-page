# 拾玖起始页 · shijiu-start-page

仿 [limestart.cn](https://www.limestart.cn/) 的极简浏览器起始页，纯前端 + 少量服务端代理（Next.js App Router），数据全部保存在浏览器 `localStorage`，无账号、无后端数据库。

- 在线地址：https://start.shijiucode.cn
- 仓库地址：https://github.com/shijiukaguyahime/shijiu-start-page

## 截图

<img width="1920" height="915" alt="d7092f02fa1c6e8d24b4d117e77066a9" src="https://github.com/user-attachments/assets/dc7dd080-5c84-4d44-807d-07c6aa769e12" />
<img width="1920" height="917" alt="1184f1df7f6a0db86b188c3354b33b4a" src="https://github.com/user-attachments/assets/aeb28748-facb-4cbd-a4d7-5a1ee021f3f7" />
<img width="1920" height="917" alt="92e1bf8cc17b8011f41504e6444e6bbb" src="https://github.com/user-attachments/assets/9796bcd2-989e-409d-af3b-636ce8a2088c" />
<img width="975" height="848" alt="749bfb2441002dad26b26814a7863382" src="https://github.com/user-attachments/assets/d903095a-d2d7-468d-894e-a9be4373559c" />
<img width="1919" height="914" alt="9a04c94e3a0158b9bddd56b57dfed1e7" src="https://github.com/user-attachments/assets/2ec7e286-5e75-42b9-a589-2867b4c2fe93" />
<img width="1920" height="917" alt="0c83a2fea59d403bdbeaf74679842471" src="https://github.com/user-attachments/assets/3b6d70cb-7b64-4fa8-9c99-99b9c661185d" />

## 功能

- 时间与日期：大字时间，日期 / 星期，日历面板含农历与节假日
- 搜索框：多引擎切换、搜索历史、网址直达，下拉末尾可「添加自定义」搜索引擎（需含 `{q}` 占位符）
- 一言：聚焦搜索时出现，可切换、复制
- 宫格：右键进入 / 左键返回，分组分页，桌面拖拽排序，移动端滑动切页、长按菜单
- Dock：全部图标、天气、日历、壁纸、设置
- 壁纸：默认 / Bing 每日 / 随机风景，历史记录（去重，最多 30 张）
- 设置：主题（跟随系统 / 浅色 / 深色）、毛玻璃透明度、壁纸亮度与模糊、搜索引擎、图标分组、JSON 导入导出与重置
- 数据本地优先：所有配置存于 `localStorage`，可通过设置-数据导出 JSON 备份 / 换设备导入

## 技术栈

| 依赖 | 版本 | 说明 |
| --- | --- | --- |
| Next.js | 16.3.2 | App Router，构建使用 webpack（`--webpack`） |
| React | 19.2.8 | |
| TypeScript | 5.x | `strict` 模式 |
| Tailwind CSS | 3.4 | 设计令牌集中在 `globals.css` |
| motion | 13.x | 动效 |
| sortablejs | 1.15 | 宫格拖拽排序（仅桌面） |
| @phosphor-icons/react | 2.1 | 图标 |

## 环境要求

- Node.js **>= 20.9**（Next.js 16 要求，推荐 22 LTS）
- npm（仓库含 `package-lock.json`，推荐 `npm ci`）
- 构建时需要访问外网：`next/font/google` 会在构建期拉取 Geist 字体

## 本地开发

```bash
git clone https://github.com/shijiukaguyahime/shijiu-start-page.git
cd shijiu-start-page
npm ci          # 或 npm install
npm run dev     # http://localhost:3333
```

开发端口固定为 `3333`（见 `package.json` 的 `-p 3333`）。

## 构建与生产运行

```bash
npm ci
npm run build   # 已带 --webpack（兼容 win32 WASM 环境）
npm run start   # 生产模式，http://localhost:3333
```

如需更换端口，直接调用 Next CLI 或修改 `package.json` 中的脚本：

```bash
npx next start -p 8080
```

## 部署

项目包含 5 个服务端 API 路由（天气 / 日历 / IP 归属地 / favicon 代理 / 随机风景地址解析），**不能使用 `output: "export"` 纯静态导出**，需要 Node 运行环境或 Serverless 平台。

### 方式一：Vercel（最简单）

1. Fork / 导入本仓库
2. Framework Preset 选择 Next.js（自动识别），构建命令与输出目录保持默认
3. 无需任何环境变量，直接 Deploy

### 方式二：自建 Node 服务器

```bash
git clone https://github.com/shijiukaguyahime/shijiu-start-page.git
cd shijiu-start-page
npm ci
npm run build
npm run start   # 监听 3333
```

使用 pm2 常驻：

```bash
npm i -g pm2
pm2 start npm --name start-page -- run start
pm2 save
pm2 startup     # 按提示执行生成的命令，实现开机自启
```

Nginx 反向代理（`/api/ip` 依赖 `X-Forwarded-For` 获取真实 IP，务必带上请求头）：

```nginx
server {
    listen 80;
    server_name start.example.com;

    location / {
        proxy_pass http://127.0.0.1:3333;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 方式三：Docker

在仓库根目录新建 `Dockerfile`：

```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3333
CMD ["npm", "run", "start"]
```

```bash
docker build -t start-page .
docker run -d --name start-page --restart unless-stopped -p 3333:3333 start-page
```

构建时要拉取 Google 字体，建议为 Docker 配置镜像加速或保证构建机可访问 `fonts.googleapis.com`。

## 环境变量

均为可选，不配置也能正常运行（有内置降级源）：

| 变量 | 说明 |
| --- | --- |
| `AMAP_KEY` / `NEXT_PUBLIC_AMAP_KEY` | 高德 Web 服务 Key，用于 `/api/ip` 国内 IP 定位；未配置时依次降级到 ip-api、vvhan，最终兜底「上海」 |

在服务器上使用 `export AMAP_KEY=xxx` 或在 Vercel 项目设置中配置即可。

## 数据存储

所有个人数据仅存于浏览器 `localStorage`，服务端不落库。主要键：

| Key | 内容 |
| --- | --- |
| `startpage:wallpaper` / `startpage:wallpaperHistory` | 当前壁纸与历史 |
| `startpage:groups` / `startpage:items` | 图标分组与扁平列表 |
| `startpage:engine` / `startpage:engines` | 当前引擎与引擎列表 |
| `startpage:searchHistory` / `startpage:showSearchHistory` | 搜索历史与开关 |
| `startpage:theme` / `startpage:glassOpacity` / `startpage:wallpaperBrightness` / `startpage:wallpaperBlur` | 外观配置 |
| `startpage:gridGroup` | 宫格当前分组 |

换设备：设置 → 数据 → 导出 JSON，在新设备导入后刷新。恢复默认：设置 → 数据 → 恢复默认。

## 目录结构

```
src/
  app/
    layout.tsx           # 字体 / metadata
    page.tsx             # 主页编排（时间 / 搜索 / 宫格 / 一言 / Dock / 面板）
    globals.css          # Tailwind 入口 + 设计令牌 + 玻璃拟态
    api/
      calendar/route.ts  # 节假日（timor.tech / vvhan 代理）
      favicon/route.ts   # 站点图标代理（多源降级 + 字母兜底）
      ip/route.ts        # IP 归属地（高德 / ip-api / vvhan）
      nature/route.ts    # 随机风景壁纸地址解析
      weather/route.ts   # 天气（open-meteo）
  components/
    wallpaper.tsx        # 壁纸渲染、历史、缩略图工具
    search-box.tsx       # 搜索框（引擎切换 / 历史 / 自定义引擎）
    hitokoto.tsx         # 一言
    app-grid.tsx         # 宫格（分组 / 分页 / 拖拽 / 手势）
    dock-bar.tsx         # 底部 Dock
    settings-panel.tsx   # 设置面板（外观 / 壁纸 / 搜索 / 图标 / 数据 / 关于）
    weather-panel.tsx
    calendar-panel.tsx
    ui/                  # modal / confirm-modal / icon-form-modal / engine-form-modal / dropdown / message / favicon
  lib/
    data.ts              # 默认分组与搜索引擎
    groups.ts            # 分组 / 图标读写
    search.ts            # 引擎与搜索历史读写
    theme.ts             # 主题 / 玻璃 / 壁纸亮度
    hooks.ts             # useClickOutside / 焦点陷阱 / 滚动锁 / 下拉动效
    calendar.ts          # 农历与节假日
    utils.ts             # cn()
```

## 开发自检

```bash
npx tsc --noEmit --pretty false   # 类型检查（以它为准）
npm run build                     # 需要 ✓ Compiled 且 / 为静态页
npm run lint                      # 部分环境因 hermes-parser 不可用，可忽略
```

协作与代码规范见仓库根目录 `AGENTS.md`。

## 外部依赖服务

页面运行时会请求以下第三方免费接口，均不可用时对应模块会降级或隐藏（不影响页面主体）：

- 壁纸：`bing.biturl.top`、`wp.upx8.com`（经 `/api/nature` 代理）
- 一言：`v1.hitokoto.cn`
- 天气：`api.open-meteo.com`、`geocoding-api.open-meteo.com`
- 节假日：`timor.tech`、`api.vvhan.com`
- IP 归属地：`restapi.amap.com`、`ip-api.com`、`api.vvhan.com`
- 网站图标：Yandex / iowen / favicon.im / Google favicon（经 `/api/favicon` 代理）

## 常见问题

- **提示 Node 版本过低**：升级到 Node >= 20.9，再重新 `npm ci`。
- **Windows 构建出现 `@next/swc-win32-x64-msvc ... is not a valid Win32 application`**：本机 `node_modules` 来自其他平台（如拷贝了别人的目录）。删除 `node_modules` 后重新 `npm ci` 即可恢复原生 SWC；不处理也能构建，只是会退回 WASM 更慢。
- **构建卡在拉取字体 / 构建失败**：`next/font/google` 需要访问 `fonts.googleapis.com`，请配置代理或改用本地字体。
- **天气 / 日历 / 一言空白**：多为外网接口被网络环境拦截，换网络或自行替换数据源。
- **端口 3333 被占用**：`npx next start -p 8080`，或修改 `package.json` 中脚本端口。
- **想清空所有数据**：设置 → 数据 → 恢复默认，或在浏览器控制台执行 `Object.keys(localStorage).filter(k => k.startsWith("startpage:")).forEach(k => localStorage.removeItem(k))` 后刷新。

## 性能与无障碍

- 动效仅使用 `transform` / `opacity` / `filter`，无循环动画，尊重 `prefers-reduced-motion`
- `backdrop-filter` 仅用于搜索框、Dock、面板与下拉，统一 `.glass-*` 工具类
- 壁纸单图层渲染；设置页缩略图按需走 CDN 裁剪（Bing `th` 的 `w/h`、阿里 OSS `x-oss-process`），避免解码原图造成滚动卡顿
- 交互元素含 `aria-label` / `aria-current` / `aria-expanded`，弹窗支持 Esc 关闭与背景滚动锁定，兼容 `prefers-reduced-transparency`

## 声明

壁纸均来源于网络公开接口，本站不对壁纸内容负责；项目仅供学习交流使用。
