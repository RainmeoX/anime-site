# RainmeoX 个人主页 / 博客

纯静态 SPA，用来展示 GitHub 项目 + 写博客文章，部署在 GitHub Pages。

## 项目背景

我想要一个不依赖框架、零构建、能自己托管博客和项目展示的个人信息页，顺手练一下原生前端。

## 功能

- 首页 / 博客 / 项目 / 标签 / 关于 几个板块
- Markdown 文章 + 卡片式布局
- 深色 / 浅色主题切换（GitHub 风格配色）
- 响应式（桌面 / 平板 / 手机三档，移动端汉堡菜单）
- RSS（Atom 1.0），可被阅读器订阅
- GitHub API 动态拉取项目 stars

## 技术栈

- 纯 HTML / CSS / JS，无框架依赖，零构建工具
- [marked.js](https://github.com/markedjs/marked) 渲染 Markdown
- [highlight.js](https://highlightjs.org/) 代码高亮
- Hash 路由（SPA）+ localStorage 主题持久化

## 部署

GitHub Pages（main 分支），自定义域名 www.rainmeo.xyz（CNAME 文件）。

本地预览：

```bash
python -m http.server 8000
# 或
npx serve
```

## 我的工作

- 设计 SPA 路由与博客逻辑（`app.js`）
- 实现管理中心（文章管理 / 草稿 / 媒体库等）
- 实现 RSS 与主题切换

## 项目不足

- 文章管理靠手动编辑 `posts/posts.json`，不够顺手
- 无后端，评论需借助外部服务
- 部分交互在老浏览器上未充分测试

## 后续计划

- 考虑加 CI 自动构建 / 校验文章格式
- 优化移动端细节

## Reflection

这个项目让我练了"零依赖纯前端"的取舍：能用原生就别急着上框架，维护成本和心智负担都低很多。代价是有些功能要自己写，但写一遍更懂原理。

## License

MIT
