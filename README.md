# 🌸 RainmeoX 二次元博客

> 个人博客 SPA - 展示 GitHub 项目 + Markdown 博客 + 标签/归档/搜索
> 二次元风设计，暗色/亮色切换，樱花飘落动画

## ✨ 功能

- 🏠 **首页** - 个人介绍 + GitHub 项目卡片（自动拉取 stars）
- 📝 **博客** - Markdown 文章，自动渲染，代码高亮
- 🏷️ **标签** - 按标签筛选文章
- 📅 **归档** - 时间线展示
- 🔍 **搜索** - 标题/摘要/标签全文搜索（Ctrl+K 快捷键）
- 👤 **关于** - 个人简介
- 🌙 **主题切换** - 暗色/亮色
- 🌸 **樱花飘落** - 二次元氛围

## 📁 结构

```
anime-site/
├── index.html              # SPA 入口
├── assets/
│   ├── style.css           # 样式（二次元风 + 主题变量）
│   └── app.js              # 路由 + 博客逻辑
├── posts/                  # 博客文章
│   ├── posts.json          # 文章索引
│   ├── arknights-qwen-assistant.md
│   ├── note2-blog-journey.md
│   └── zzz-yixuan-assistant.md
└── README.md
```

## 🚀 部署

### 方式 1: GitHub Pages（推荐）

1. Fork 或 clone 本仓库
2. GitHub 仓库 Settings → Pages → Source: main 分支
3. 访问 `https://你的用户名.github.io/anime-site/`

### 方式 2: 本地预览

```bash
# 任意静态服务器
python -m http.server 8000
# 或
npx serve
```
访问 `http://localhost:8000`

### 方式 3: 部署到魅蓝 Note2

用 KSWeb 等 Android Web 服务器 App，把整个目录放到 `/sdcard/htdocs/`，启动服务即可。

## 📝 写新文章

1. 在 `posts/` 目录新建 `我的文章.md`，用 Markdown 写内容
2. 编辑 `posts/posts.json`，添加索引：
   ```json
   {
     "title": "我的文章",
     "date": "2026-06-27",
     "category": "随笔",
     "tags": ["生活", "思考"],
     "file": "我的文章.md",
     "excerpt": "文章摘要，显示在列表里..."
   }
   ```
3. 推送到 GitHub，网站自动更新

## 🎨 自定义

编辑 `assets/app.js` 顶部的配置：

```javascript
const PROFILE = {
  name: '你的名字',
  bio: '你的简介',
  github: '你的 GitHub',
  csdn: '你的 CSDN'
};

const PROJECTS = [
  { name: '仓库名', desc: '描述', lang: '语言', stars: 0 },
  // ...
];
```

## 🛠 技术栈

- 纯 HTML/CSS/JS，无框架依赖
- [marked.js](https://github.com/markedjs/marked) - Markdown 渲染
- Hash 路由（SPA）
- localStorage 主题持久化
- GitHub API 动态拉取 stars

## 📄 License

MIT
