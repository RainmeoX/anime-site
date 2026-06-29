# 魅蓝 Note2 折腾记：从刷机失败到部署个人博客

> 一台 2015 年的魅蓝 Note2，一台刷废的 MX4 Pro，一段从刷机到部署个人博客的折腾之旅。

## 起因

手头有两台老设备：魅族 MX4 Pro 和魅蓝 Note2。MX4 Pro 刷机刷废了，一直重启循环。Note2 还能开机，但停留在 Android 5.0.2，卡得不行。

本来想给 MX4 Pro 刷 Ubuntu Touch 跑小模型，结果 bootloader 解锁那一步直接破防。于是转向 Note2，想做个个人博客网站。

## 第一关：Termux 装不上

Note2 是 Android 5.0.2，Termux 官方要求 Android 7.0+。试了 F-Droid 版、Play 版，全部提示"解析失败"。

查了一圈发现：
- Termux v0.118 之前支持 Android 5/6，但 F-Droid 已下架
- archive.org 有旧版，但官方说"仓库全挂，不能用了"
- GitHub Actions 有 debug build，但包仓库停止维护

**结论：Termux 这条路在 Android 5 上走死了。**

## 第二关：换 KSWeb

Termux 不行，换思路。Android 上有现成的 Web 服务器 App：

| App | 原理 | Android 5 支持 |
|---|---|---|
| KSWeb | Lighttpd + PHP | ✅ |
| Palapa | Nginx + PHP | ✅ |
| AndroPHP | Apache + PHP | ✅ |

选了 KSWeb，图形界面，点几下就能启动 Lighttpd，比 Termux 简单太多。

## 第三关：网站文件怎么传

KSWeb 装好了，但 index.html 怎么弄到手机上？

- **方案 A**：数据线从电脑拷 —— 最稳
- **方案 B**：Note2 浏览器从 GitHub raw 下载 —— 私有仓库要登录
- **方案 C**：建公开仓库，直接下载 —— 最终选择

于是有了这个 `anime-site` 仓库。

## 第四关：内网穿透

KSWeb 跑起来后，只有局域网能访问。要让公网访问，需要内网穿透：

| 方案 | 免费 | 速度 | 稳定性 |
|---|---|---|---|
| Cloudflare Tunnel | ✅ | 中 | 高 |
| cpolar | ✅（有限） | 快（国内） | 中 |
| ngrok | 有限制 | 慢 | 中 |
| frp 自建 | 需服务器 | 快 | 高 |

Note2 是 32 位 ARM，cloudflared 有 ARM 版本，cpolar 也有。最终选了 cpolar，国内访问快。

## 第五关：MIUI 后台清理

最大的坑 —— MIUI 省电策略会杀 KSWeb 和 cpolar 的后台进程。

解决方案：
1. 设置 → 电量和性能 → 应用配置 → KSWeb/cpolar → **无限制**
2. 最近任务里给两个 App **加锁**
3. 开发者选项 → 后台进程限制 → **标准限制**
4. 关闭 MIUI 优化（可选，但会更稳）

## 最终效果

```
Note2 (KSWeb + cpolar)
  ↓
https://xxx.cpolar.cn
  ↓
公网任何人可访问我的博客
```

虽然 Note2 只有 2GB RAM，但跑静态博客绰绰有余。访问速度比想象中好，cpolar 中转后延迟约 200ms。

## 教训

1. **老设备别死磕官方支持** —— Termux 不支持就换 KSWeb，条条大路通罗马
2. **刷机有风险** —— MX4 Pro 刷废一台，Note2 不敢再刷了
3. **内网穿透选国内的** —— Cloudflare 在国内时好时坏，cpolar 更稳
4. **MIUI 后台是最大敌人** —— 不设置白名单，服务跑半小时就被杀

## 后续

现在这个博客就在 Note2 上跑着。虽然慢，但能用。下一步想：
- 加评论系统（Giscus）
- 加访问统计
- 试试用 Note2 跑小模型（虽然大概率失败）

如果你也有老设备想折腾，欢迎交流！
