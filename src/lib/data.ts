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
    id: "common",
    title: "常用",
    shortcuts: [
      { id: "1", name: "GitHub", url: "https://github.com", color: "#24292f" },
      { id: "2", name: "Gmail", url: "https://mail.google.com", color: "#EA4335" },
      { id: "3", name: "YouTube", url: "https://youtube.com", color: "#FF0000" },
      { id: "4", name: "Twitter", url: "https://x.com", color: "#000000" },
      { id: "5", name: "Notion", url: "https://notion.so", color: "#000000" },
      { id: "6", name: "Figma", url: "https://figma.com", color: "#9747FF" },
      { id: "7", name: "Vercel", url: "https://vercel.com", color: "#000000" },
      { id: "8", name: "MDN", url: "https://developer.mozilla.org", color: "#014099" },
    ],
  },
  {
    id: "dev",
    title: "开发",
    shortcuts: [
      { id: "9", name: "Stack Overflow", url: "https://stackoverflow.com", color: "#F48024" },
      { id: "10", name: "npm", url: "https://npmjs.com", color: "#CB3837" },
      { id: "11", name: "Next.js", url: "https://nextjs.org", color: "#000000" },
      { id: "12", name: "Tailwind", url: "https://tailwindcss.com", color: "#06B6D4" },
      { id: "13", name: "Linear", url: "https://linear.app", color: "#5E6AD2" },
      { id: "14", name: "Supabase", url: "https://supabase.com", color: "#3ECF8E" },
      { id: "15", name: "Cloudflare", url: "https://cloudflare.com", color: "#F38020" },
      { id: "16", name: "OpenAI", url: "https://openai.com", color: "#412991" },
    ],
  },
  {
    id: "design",
    title: "设计灵感",
    shortcuts: [
      { id: "17", name: "Dribbble", url: "https://dribbble.com", color: "#EA4C89" },
      { id: "18", name: "Behance", url: "https://behance.net", color: "#053EFF" },
      { id: "19", name: "Pinterest", url: "https://pinterest.com", color: "#E60023" },
      { id: "20", name: "Awwwards", url: "https://awwwards.com", color: "#000000" },
      { id: "21", name: "Unsplash", url: "https://unsplash.com", color: "#000000" },
      { id: "22", name: "Fontshare", url: "https://fontshare.com", color: "#000000" },
      { id: "23", name: "Coolors", url: "https://coolors.co", color: "#0066FF" },
      { id: "24", name: "Lime Start", url: "https://limestart.cn", color: "#2DD4BF" },
    ],
  },
  {
    id: "read",
    title: "阅读与工具",
    shortcuts: [
      { id: "25", name: "Medium", url: "https://medium.com", color: "#000000" },
      { id: "26", name: "掘金", url: "https://juejin.cn", color: "#1E80FF" },
      { id: "27", name: "知乎", url: "https://zhihu.com", color: "#056DE8" },
      { id: "28", name: "豆瓣", url: "https://douban.com", color: "#2BAE2D" },
      { id: "29", name: "Product Hunt", url: "https://producthunt.com", color: "#FF6154" },
      { id: "30", name: "NBTab", url: "https://nbtab.com", color: "#4F46E5" },
      { id: "31", name: "DeepL", url: "https://deepl.com", color: "#0F2B46" },
      { id: "32", name: "ChatGPT", url: "https://chat.openai.com", color: "#74AA9C" },
    ],
  },
];

export const DOCK_SHORTCUTS: Shortcut[] = [
  { id: "d1", name: "GitHub", url: "https://github.com", color: "#24292f" },
  { id: "d2", name: "Gmail", url: "https://mail.google.com", color: "#EA4335" },
  { id: "d3", name: "Figma", url: "https://figma.com", color: "#9747FF" },
  { id: "d4", name: "Notion", url: "https://notion.so", color: "#000" },
  { id: "d5", name: "YouTube", url: "https://youtube.com", color: "#FF0000" },
  { id: "d6", name: "Vercel", url: "https://vercel.com", color: "#000" },
  { id: "d7", name: "Linear", url: "https://linear.app", color: "#5E6AD2" },
  { id: "d8", name: "X", url: "https://x.com", color: "#000" },
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
