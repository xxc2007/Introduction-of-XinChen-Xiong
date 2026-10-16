<sub><b>简体中文</b> · <a href="README.en.md">English</a></sub>

<div align="center">

# 熊鑫晨 · 个人介绍站

*「我还没写出改变世界的代码。」*

[![线上访问](https://img.shields.io/badge/线上访问-xxc2007.me-48583D)](https://xxc2007.me/)
[![技术栈](https://img.shields.io/badge/技术栈-HTML_CSS_JavaScript-24251E)](#本地运行)
[![MIT](https://img.shields.io/badge/License-MIT-FF8B48)](LICENSE)

**一个人，与 AI 一起。**

一张中英双语个人介绍页，两个已经上线的网站，一套做事方法，三条信念，以及找到我的方式。橄榄绿、暖白、大字排版与真实地球组成入口，作品本身负责说明我做了什么。

</div>

## 🎬 新版宣传片

44 秒，1920 × 1080。使用 Video Shotcraft 制作，画面来自当前新版网页，包含首屏地球的真实旋转、两个作品和做事方法。参考南昌十五中纪念站宣传片的留白与运镜节奏，采用轻柔原创配乐、自然叠化，无换场音效。

[![点击观看新版个人站宣传片](assets/video/poster-hd.jpg)](https://xxc2007.me/assets/video/)

[▶ 打开 1080p 高清播放器](https://xxc2007.me/assets/video/) · [直接打开 MP4](https://xxc2007.me/assets/video/intro-promo.mp4) · [无配乐版](https://xxc2007.me/assets/video/intro-promo-nobgm.mp4)

## 当前网页

![桌面首屏：大字姓名、个人介绍与真实地球](assets/images/readme-hero-desktop.png)

![新版作品区：两个已上线网站与作品选择器](assets/images/readme-works-desktop.png)

<p align="center"><img src="assets/images/readme-hero-mobile.png" width="390" alt="新版移动端首屏和导航"></p>

截图于 2026 年 10 月 16 日从本地待发布版本更新。桌面首屏取自真实浏览器录屏，其他截图由 Chrome 直接采集；没有重新绘制界面。

## 网页里有什么

- **真实地球首屏**：使用本地 NASA Blue Marble 地球影像，支持拖动、方向键旋转、重置与减少动态效果。主地球仅属于首屏，不带外围轨道，也不进入“关于我”。
- **章节导航**：桌面横向导航、当前章节指示、移动菜单与中英文切换。
- **两个作品**：纪念南昌市第十五中学的网站与 GEOHOT 地理热点，支持切换查看，并对照两者的用途、内容和实现。
- **做事方法**：保留原有四个步骤，配合可操作的视觉分镜。
- **信念与联系**：原有三条信念、公开邮箱、社交入口与网址分享。
- **宣传视频**：点击后才加载影片，另提供独立播放器、封面和下载入口。

| 作品 | 线上访问 | 代码 |
|---|---|---|
| 青山湖畔的纪念册 · 纪念南昌市第十五中学 | [走进纪念册](https://xxc2007.me/nc15/) | [开源仓库](https://github.com/xxc2007/In-memory-of-Nanchang-No.-15-Middle-School) |
| GEOHOT 地理热点 | [阅读地理热点](https://xxc2007.me/geohot/) | [开源仓库](https://github.com/xxc2007/GeoHot) |

## 本地运行

```sh
node tools/serve.mjs 8901
node scripts/check-parity.mjs
node scripts/check-links.mjs
node scripts/check-bytes.mjs
node --test "tests/*.test.mjs"
```

打开 http://127.0.0.1:8901/。网站为静态 HTML / CSS / JavaScript，没有应用构建步骤。中英文页面共享样式与行为；Three.js 本地托管。配套页面保留本地字体资产，个人站主体使用系统无衬线字体。

## 当前源码体积

以下数值由质量检查与文件实测对照。首屏 JS 包含本地 Three.js，后续按需加载的制作分镜单列；图片、地球贴图和影片不计入 JS。这些源码数值不代表 Lighthouse 得分或访问者网络下的加载耗时。

| 项目 | 当前测量 | 复算方式 |
|---|---|---|
| 仓库文件 | **179** | `git ls-files \| wc -l` = 179 |
| 中英两页字节 | `24,135` / `24,566` B | index.html / en/index.html |
| 全站 CSS | **50.7 KB** (`51,962` B), gzip **11.5 KB** | assets/css/style.css |
| 首屏 JS（含 Three.js） | gzip **194.6 KB** | scripts/check-bytes.mjs |
| 图片（头像 + 两张作品截图） | **85.8 KB** (`87,886` B) | scripts/check-bytes.mjs |
| 不进首屏的分享素材 | **77.8 KB** (`79,646` B) | scripts/check-bytes.mjs |

## 发布与同步

现有发布流程会推送 GitHub、把已跟踪的网页文件发布到专属服务器目录，并核对本地、GitHub 文件、服务器与公网响应。部署凭据留在忽略的本地配置中。

```sh
bash scripts/deploy.sh "feat: publish the redesigned portfolio and new film"
bash scripts/verify-sync.sh
```

个人站负责 `/` 与 `/en/`；`/nc15/`、`/geohot/` 与评论服务各有自己的发布边界。

## 内容与署名

个人介绍、作品描述及外链以 [内容出处](docs/content-sources.md) 为准。[ORYZO](https://oryzo.ai/) 为设计参考，页面内容与实现属于本站。地球影像来自 NASA Earth Observatory / Blue Marble Next Generation，为 2004 年 8 月无云合成影像，非实时天气；详见 [图像出处](docs/image-provenance.md)。

新版宣传片使用真实网页素材与原创合成轻柔配乐，制作记录和核验见 [影片发布记录](docs/promo-release-20261016.md)。代码采用 [MIT](LICENSE)，第三方资产遵循各自原有条款。
