export type Shortcut = {
  id: string;
  name: string;
  url: string;
  icon?: string; // favicon or emoji fallback
  color?: string; // bg for letter fallback
};

export type Group = {
  id: string;
  title: string;
  shortcuts: Shortcut[];
};

export const DEFAULT_GROUPS: Group[] = [
  {
    id: "ai",
    title: "AI",
    shortcuts: [
      { id: "1", name: "DeepSeek", url: "https://chat.deepseek.com", color: "#4D6BFE" },
      { id: "2", name: "豆包", url: "https://www.doubao.com/chat", color: "#FF3B30" },
      { id: "3", name: "Kimi", url: "https://kimi.moonshot.cn", color: "#1A1A1A" },
      { id: "4", name: "千问", url: "https://qianwen.aliyun.com", color: "#7B68EE" },
      { id: "5", name: "Gemini", url: "https://gemini.google.com", color: "#4285F4" },
      { id: "6", name: "Grok", url: "https://grok.x.ai", color: "#000000" },
      { id: "7", name: "ChatGPT", url: "https://chat.openai.com", color: "#74AA9C" },
    ],
  },
  {
    id: "entertainment",
    title: "娱乐",
    shortcuts: [
      { id: "8", name: "摸鱼岛", url: "https://yucoder.cn/", color: "#FF6B35" },
      { id: "9", name: "摸鱼TV", url: "https://tv.yucoder.cn/", color: "#E50914" },
      { id: "10", name: "今日热榜", url: "https://tophub.today/", color: "#FF3B30" },
      { id: "11", name: "哔哩哔哩", url: "https://www.bilibili.com", color: "#00A1D6" },
      { id: "12", name: "抖音", url: "https://www.douyin.com", color: "#000000" },
      { id: "13", name: "微博", url: "https://weibo.com", color: "#E6162D" },
      { id: "14", name: "知乎", url: "https://www.zhihu.com", color: "#056DE8" },
      { id: "15", name: "豆瓣", url: "https://www.douban.com", color: "#2BAE2D" },
      { id: "16", name: "网易云音乐", url: "https://music.163.com", color: "#C20C0C" },
      { id: "17", name: "什么值得买", url: "https://www.smzdm.com", color: "#FF5A00" },
    ],
  },
  {
    id: "dev",
    title: "开发",
    shortcuts: [
      { id: "18", name: "GitHub", url: "https://github.com", color: "#24292F" },
      { id: "19", name: "Gitee", url: "https://gitee.com", color: "#C71D23" },
      { id: "20", name: "Stack Overflow", url: "https://stackoverflow.com", color: "#F48024" },
      { id: "21", name: "npm", url: "https://www.npmjs.com", color: "#CB3837" },
      { id: "22", name: "Tailwind", url: "https://tailwindcss.com", color: "#06B6D4" },
      { id: "23", name: "Cloudflare", url: "https://www.cloudflare.com", color: "#F38020" },
      { id: "24", name: "OpenAI", url: "https://openai.com", color: "#412991" },
    ],
  },
  {
    id: "design",
    title: "设计",
    shortcuts: [
      { id: "25", name: "即时设计", url: "https://js.design", color: "#FF4A00" },
      { id: "26", name: "花瓣", url: "https://huaban.com", color: "#E60012" },
      { id: "27", name: "500px", url: "https://500px.com", color: "#0099E5" },
      { id: "28", name: "视觉中国", url: "https://www.vcg.com", color: "#000000" },
      { id: "29", name: "100font", url: "https://www.100font.com", color: "#1A1A1A" },
      { id: "30", name: "蓝湖", url: "https://lanhuapp.com", color: "#00A0FF" },
      { id: "31", name: "阿里图标库", url: "https://www.iconfont.cn", color: "#FF6A00" },
      { id: "32", name: "墨刀", url: "https://modao.cc", color: "#1A1A1A" },
      { id: "33", name: "在线配色", url: "https://icolorpalette.com/", color: "#7B68EE" },
    ],
  },
];

export type SearchEngine = {
  id: string;
  label: string;
  url: string; // with {q}
  icon: string;
  color: string;
};

export const SEARCH_ENGINES: SearchEngine[] = [
  { id: "bing", label: "Bing", url: "https://www.bing.com/search?q={q}", icon: "B", color: "#0a7ce4" },
  { id: "google", label: "Google", url: "https://www.google.com/search?q={q}", icon: "G", color: "#4285f4" },
  { id: "baidu", label: "百度", url: "https://www.baidu.com/s?wd={q}", icon: "百", color: "#2932e1" },
  { id: "baidu-translate", label: "百度翻译", url: "https://fanyi.baidu.com/#auto/zh/{q}", icon: "译", color: "#2932e1" },
  { id: "github", label: "GitHub", url: "https://github.com/search?q={q}", icon: "G", color: "#181717" },
];
