<sub><b>简体中文</b> · <a href="README.en.md">English</a></sub>

<div align="center">

# 熊鑫晨 · 个人展示网站

*「我还没写出改变世界的代码。」*

[![线上访问](https://img.shields.io/badge/线上访问-xxc2007.me-48583D)](https://xxc2007.me/)
[![技术栈](https://img.shields.io/badge/技术栈-HTML_CSS_JavaScript-24251E)](#技术实现)
[![MIT](https://img.shields.io/badge/License-MIT-FF8B48)](LICENSE)

**把想法做成网页，把过程留在作品里。**

这里是熊鑫晨的个人介绍，也是两个已上线项目的共同入口：一个保存校园记忆的纪念册，一个追踪地理变化的资讯站。
从作品、做事方法到个人信念，这个中英双语网站记录了我怎样与 AI 协作，把一个想法逐步做成可以访问、体验和继续维护的网页。

[走进网站](https://xxc2007.me/) · [观看宣传片](#-宣传片展示) · [两个作品](#两个作品) · [交互与体验](#交互与体验) · [技术实现](#技术实现) · [本地运行](#本地运行) · [License](#-license) · [Star History](#-star-history)

</div>

![桌面首屏：大字姓名、个人介绍与可自由旋转的真实地球](assets/images/readme-hero-desktop.png?v=4430820db066)

## 🎬 宣传片展示

用 44 秒认识这个网站：从大字姓名和旋转的地球出发，走进校园纪念册与 GEOHOT，再看看作品背后的构思与建造过程。真实网页画面配合轻柔配乐与自然转场，呈现网站的内容、层次和交互节奏。

点击下方播放器即可在本页观看。

https://github.com/user-attachments/assets/674f7e9e-a87c-4235-b784-5ac5c5f1c822

[▶ 打开 1080p 高清播放器](https://xxc2007.me/assets/video/) · [直接打开 MP4](https://xxc2007.me/assets/video/intro-promo.mp4) · [无配乐版](https://xxc2007.me/assets/video/intro-promo-nobgm.mp4)

## 两个作品

**一个保存记忆，一个整理信息。** 两个项目有不同的内容与技术选择，也共同体现了我对设计、前端、地图与持续维护的实践。

| 作品 | 内容与实现 | 访问入口 |
|---|---|---|
| **青山湖畔的纪念册** | 以 25 张亲自拍摄的校园实景、八机位时光漫游、中文定位图和留言墙，记录南昌市第十五中学。采用原生前端与自托管留言服务，提供十种语言。 | [走进纪念册](https://xxc2007.me/nc15/) · [开源代码](https://github.com/xxc2007/In-memory-of-Nanchang-No.-15-Middle-School) |
| **GEOHOT · 地理热点** | 采集公开地理信源，经过预筛、两次评分与事件归并，组织精选资讯和地理日报。基于 AIHOT 框架建设，采用服务端渲染与后台任务队列。 | [阅读地理热点](https://xxc2007.me/geohot/) · [开源代码](https://github.com/xxc2007/GeoHot) |

![作品区：校园纪念册与 GEOHOT 的切换展示和内容对照](assets/images/readme-works-desktop.png?v=ddaf350d481d)

## 交互与体验

橄榄绿与暖白构成页面底色，大字排版、章节留白和滚动联动串起整段阅读。视觉体验围绕现有内容展开：先认识我，再看作品，最后了解做事方法、信念与联系方式。

- **可以亲手转动的地球**：以 NASA Blue Marble 影像还原地表，支持任意方向的 360° 拖动与翻转、键盘方向键控制和视角重置。
- **始终可见的章节入口**：桌面与移动端均直接显示文字导航，当前章节以虚线标记；手机窄屏自然换行，中英文可随时切换。
- **可探索的制作过程**：通过四个步骤及对应的视觉分镜，呈现从用途构思、设计建造、地图组织到上线维护的过程。
- **照顾不同的浏览方式**：适配桌面与触屏，保留键盘操作、静态地球后备画面与减少动态效果支持；宣传片在点击后加载。

### 移动端页面

<p align="center"><img src="assets/images/readme-hero-mobile.png?v=9c30c784e83b" width="390" alt="移动端：展开的文字导航、个人介绍、影片入口与真实地球"></p>

<sub>展示截图采集于 2026 年 10 月 16 日。宣传片记录制作时的页面；其中的资讯画面不会随 GEOHOT 的日常更新而变化。</sub>

## 技术实现

| 层面 | 实现与取舍 |
|---|---|
| 页面结构 | 静态 HTML，中英文各有独立页面与 SEO 元数据，共享样式和交互脚本，无应用构建步骤。 |
| 样式与交互 | CSS 负责响应式布局和视觉状态，原生 JavaScript 负责章节识别、作品切换、语言菜单与滚动联动。 |
| 三维地球 | 本地托管 Three.js 与地球贴图，以四元数组合拖动旋转，支持连续翻转，并处理 WebGL 上下文丢失与恢复。 |
| 资源加载 | 地球模块与制作分镜按需加载，影片点击后请求；主要视觉资源本地托管，提供静态后备内容。 |
| 质量检查 | 中英文结构对照、本地链接、资源体积和静态规则检查，配合浏览器交互回归。具体命令见下文。 |

## 本地运行

```sh
node tools/serve.mjs 8901
```

打开 http://127.0.0.1:8901/ 即可浏览，英文版位于 `/en/`。网站无需应用构建；主体使用系统无衬线字体，配套页面保留本地字体资产。

检查内容、结构与资源：

```sh
node scripts/check-parity.mjs
node scripts/check-links.mjs
node scripts/check-bytes.mjs
node --test "tests/*.test.mjs"
```

## 当前源码体积

以下数值由质量检查与文件实测对照。首屏 JS 包含本地 Three.js，后续按需加载的制作分镜单列；图片、地球贴图和影片不计入 JS。这些源码数值不代表 Lighthouse 得分或访问者网络下的加载耗时。

| 项目 | 当前测量 | 复算方式 |
|---|---|---|
| 仓库文件 | **219** | `git ls-files \| wc -l` = 219 |
| 中英两页字节 | `24,135` / `24,621` B | index.html / en/index.html |
| 全站 CSS | **51.4 KB** (`52,612` B), gzip **11.7 KB** | assets/css/style.css |
| 首屏 JS（含 Three.js） | gzip **195.7 KB** | scripts/check-bytes.mjs |
| 图片（头像 + 两张作品截图） | **112.5 KB** (`115,154` B) | scripts/check-bytes.mjs |
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

新版宣传片使用真实网页素材与原创合成轻柔配乐，制作记录和核验见 [影片发布记录](docs/promo-release-20261016.md)。

## 📄 License

[MIT](LICENSE) © 2026 熊鑫晨（Xiong Xinchen）· 第三方素材遵循各自许可，详见[图像出处](docs/image-provenance.md)。

## 📈 Star History

<p align="center">
  <img src="https://api.star-history.com/svg?repos=xxc2007/Introduction-of-XinChen-Xiong&type=Date" alt="个人展示网站仓库的 GitHub Star 历史" width="100%">
</p>
<p align="center"><sub>曲线由 <a href="https://star-history.com">star-history.com</a> 动态生成，GitHub 图片缓存可能使更新稍有延迟。</sub></p>
