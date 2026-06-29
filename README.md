# RainmeoX · 技术博客

> 个人博客 SPA - 大模型微调 · 推理部署 · 嵌入式 AI · 全栈开发

> 参考 cnkirito.moe 卡片式布局 + canirun.ai 极简风格，GitHub 风格深色主题

## 功能

- **首页** - 英雄区 + 技能标签 + 最新文章 + 精选项目（自动拉取 GitHub stars）
- **博客** - Markdown 文章列表，卡片式布局，含日期/标题/摘要/标签
- **项目** - GitHub 项目卡片网格，语言标签 + Star 数
- **标签** - 按标签聚合文章
- **关于** - 个人简介 + 技能清单 + 联系方式
- **搜索** - 标题/摘要/标签全文搜索（Ctrl+K 快捷键）
- **主题切换** - 深色/浅色（GitHub 风格配色）
- **响应式** - 桌面/平板/手机三档适配，移动端汉堡菜单

## 结构

```
anime-site/
├── index.html              # SPA 入口
├── assets/
│   ├── style.css           # 样式（GitHub 风格 + 主题变量）
│   └── app.js              # 路由 + 博客逻辑
├── posts/                  # 博客文章
│   ├── posts.json          # 文章索引
│   └── *.md                # Markdown 文章
├── CNAME                   # 自定义域名
└── README.md
```

## 部署

### GitHub Pages（当前部署）

1. 仓库 Settings → Pages → Source: main 分支
2. 自定义域名：www.rainmeo.xyz（CNAME 文件配置）
3. 访问 https://www.rainmeo.xyz

### 本地预览

```bash
python -m http.server 8000
# 或
npx serve
```
访问 `http://localhost:8000`

## 写新文章

1. 在 `posts/` 目录新建 `我的文章.md`，用 Markdown 写内容
2. 编辑 `posts/posts.json`，添加索引：
   ```json
   {
     "title": "我的文章",
     "date": "2026-06-27",
     "category": "AI 微调",
     "tags": ["AI", "LoRA"],
     "file": "我的文章.md",
     "excerpt": "文章摘要，显示在列表里..."
   }
   ```
3. 推送到 GitHub，网站自动更新

## 自定义

编辑 `assets/app.js` 顶部的配置：

```javascript
const PROFILE = {
  name: 'RainmeoX',
  bio: '大模型微调 · 推理部署 · 嵌入式 AI · 全栈开发',
  github: 'https://github.com/RainmeoX',
  csdn: 'https://blog.csdn.net/m0_67166125',
  blog: 'https://www.rainmeo.xyz',
  location: '中国 · 深圳',
  skills: ['Python', 'PyTorch', 'LoRA 微调', 'vLLM', ...],
  interests: ['大模型微调', '推理部署', 'RAG 应用', ...]
};

const PROJECTS = [
  { name: '仓库名', desc: '描述', lang: '语言', stars: 0 },
  // ...
];
```

## 技术栈

- 纯 HTML/CSS/JS，无框架依赖，零构建工具
- [marked.js](https://github.com/markedjs/marked) - Markdown 渲染
- [highlight.js](https://highlightjs.org/) - 代码高亮（github-dark 主题）
- Hash 路由（SPA）
- localStorage 主题持久化
- GitHub API 动态拉取 stars

## License

MIT
