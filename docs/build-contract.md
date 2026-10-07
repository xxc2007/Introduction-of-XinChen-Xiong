# 构建契约（所有构建智能体照此实现，不得自创第二套）

## 0. 已备好的资产（不要重复生成）

| 资产 | 路径 | 事实 |
| --- | --- | --- |
| 头像 | `assets/images/avatar.jpg`（26,762 B，唯一一份；`avatar.webp` 已删，站长要求原图直出） | 300×300，站长本人提供的原图，不转码、不裁切、不加圆框 |
| Three.js | `assets/vendor/three.module.min.js` | r0.180.0，338,908 B（gzip 79,147 B），MIT，文件头 license 注释保留 |
| 衬线字体 | `assets/fonts/noto-serif-sc/wght.css` + `files/`（101 个 woff2 切片） | 与纪念册同一份，按 `unicode-range` 惰性加载 |

引用写法一律**相对路径**（这样站点放在域名根或任何子路径都能跑）：

```html
<link rel="stylesheet" href="./assets/fonts/noto-serif-sc/wght.css">
<link rel="stylesheet" href="./assets/css/style.css?v=INTRO_VER">
<script type="module" src="./assets/js/main.js?v=INTRO_VER"></script>
<img src="./assets/images/avatar.jpg?v=INTRO_VER" ...>
```
```js
// assets/js/main.js 内：动态 import 也要带上同一个指纹
const VER = (import.meta.url.match(/[?&]v=([0-9a-z]{4,8})/) || [])[1] || 'dev';
await import('./scene.js?v=' + VER);
// assets/js/scene.js 内
import * as THREE from "../vendor/three.module.min.js";
```
只有 `canonical` / `hreflang` / `og:url` / `og:image` / JSON-LD 里的站址用绝对地址 `https://xxc2007.me/…`，
并且**不带** `?v=`——分享卡与结构化数据要的是规范地址。
`INTRO_VER` 是构建版本串（跟着 HEAD 走，`deploy.sh` 每次部署重算），
同一页里所有 `?v=` 必须是同一个值，`check-parity.mjs` 钉住这一点。

**为什么连图片与动态 import 也要带指纹**：nginx 的长缓存是**按扩展名**命中的，
跟查询串无关——`.css/.js/.webp/.jpg` 一律 `immutable, max-age=1年`。
所以「原地换内容」等于把旧字节钉一年：实测过两次，
一次是 `scene.js` 改了但线上 CDN 仍回 13,884 B 的旧版（HEAD 已是 14,384 B），
一次是头像按要求去掉圆框、换回原图后被旧缓存钉住。
结论写进契约：**凡是被 HTML 引用、且内容可能原地更新的资源，一律带 `?v=`**；
只有文件名本身会变的资源（字体切片）才允许不带。

## 1. 设计令牌（照抄，不改值）

```css
:root{
  --cream:#F0EEE6; --paper:#FAF9F5; --ink:#1F1E1D; --muted:#6E6A5E;
  --terra:#D97757; --terra-deep:#C15F3C; --terra-ink:#A8492A; --line:#E4DFD3;
  --dark:#1F1E1D;
  --serif:'Noto Serif SC Variable','Noto Serif SC',Georgia,"Times New Roman","Songti SC","STSong","Noto Serif CJK SC","SimSun",serif;
  --sans:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif;
  --ease:cubic-bezier(.16,.84,.28,1);
}
```
配色纪律：文字用赤陶橙**必须** `--terra-ink`；`--terra`/`--terra-deep` 只作填充、描边、装饰。
分层只靠 `1px solid var(--line)` 发丝线，**不用 box-shadow、不用渐变、不用圆角大于 2px**。

## 2. 页面骨架（中英两页必须逐一对应）

```
body
 a.skip → #main
 header.topbar
   .brand（熊鑫晨 / Xiong Xinchen）
   nav#nav  → 5 个 <a href="#…">：about works how beliefs contact
   .controls
     .lang（地球 svg + 当前语言名 + chevron；展开 .lang-menu 两项，选中项带 ✓）
   .progress（顶部 2px 滚动进度）
 main#main
   section#top.hero      ：canvas#field(aria-hidden) + .avatar(原图直出，无圆框/描边/底色) + h1 + p.motto + p.hero-sub + a.hero-cta(#about) + .scroll-cue
   section#about         ：div.sec-head（<span class=sec-index>壹 · ABOUT</span><h2>关于我</h2>）+ hr.sec-rule
                           p×3 + dl.facts（4 组：身份 / 所在地 / 邮箱 / 现在在做）
   section#works         ：h2（贰 · WORKS 两个网站）+ svg.contours（背景等高线装饰）
                           article.work-card ×2，各含：h3、p.lede、img.shot、ul.facts(3 li)、a.btn-live、a.btn-repo
   section#how           ：h2（叁 · HOW 我怎么做事）+ ol.steps(4 li) + p.closing
   section#beliefs       ：h2（肆 · BELIEFS 我相信的几件事）+ blockquote×3（各含 p + cite）
   section#contact       ：h2（伍 · CONTACT 找到我）+ p + a.mail(mailto:) + button.copy-mail + ul.social(7 li)
 footer.foot             ：p.foot-sign（署名行）+ p.foot-meta（年份 · MIT · 返回顶部 a#top）
```

**数量断言（parity 脚本会钉死）**：`h2.sec-title` = 5、 = 5、 = 5；`section` = 6；`nav a` = 5；
`.work-card` = 2；`.social li` = 7；`<img>` = 3（avatar + shot-nc15 + shot-geohot）；
`blockquote` = 3；`dl.facts div` = 4；`ol.steps li` = 4。

## 3. 允许出现在页面上的文案事实（逐字来自他的公开内容）

- 姓名：中文 `熊鑫晨`；英文 `Xiong Xinchen`（GitHub 显示名另一种写法 `XinChen Xiong` 仅用于仓库名与 `<title>` 的英文位）。
- 首屏引言（逐字）：`我还没写出改变世界的代码。`
- 身份（逐字改写自 profile README 第 5、7 行）：`但用 AI 做出了自己的第一个网站——把母校装进一个可以随时回去的网页。` / `设计、前端、GIS 制图、部署运维，全部 AI 协作完成。我负责想清楚要做什么。`
- 所在地：只写 `China`（GitHub profile 原文）。**不得**写南昌/九江为他的住址，**不得**使用 28.7208°N 115.9322°E（那是校园定位坐标）。
- 邮箱：`xxc200707@gmail.com`（来源 GitHub profile API 与各仓库 commit 作者）。
- 作品一：`青山湖畔的纪念册 · 纪念南昌市第十五中学`，线上 `https://xxc2007.me/nc15/`，仓库 `In-memory-of-Nanchang-No.-15-Middle-School`；事实条：纯 HTML/CSS/Vanilla JS、结构·样式·行为三分离、25 张自己拍摄的校园实景、八机位时光漫游、一张中文定位图、一面无需登录的自托管留言墙、10 种语言。
- 作品二：`GEOHOT 地理热点`，线上 `https://xxc2007.me/geohot/`，仓库 `GeoHot`（MIT）；事实条：建在开源框架 AIHOT 之上、行业层集中在 `industry/` 一个目录、信源采集→预筛→两次独立打分→按空间显著性定门槛、每天早上 8 点出一份地理日报、前端 React Router 8 服务端渲染、后端与采集分析各自独立成服务。
- 信条（逐字三条）：`地理不止是知识，是一种看世界的方式。` / `做出来比说出来有用。` / `实践是唯一的检验标准。`
- 社媒（顺序与 URL 逐字照抄）：个人站 `https://xxc2007.me/`、GitHub `https://github.com/xxc2007`、抖音 `https://www.douyin.com/user/MS4wLjABAAAA-AYW1RCpFjwJmoMTnZy1vKmOQopmBOUjPLN9phlDpjI`、小红书 `https://www.xiaohongshu.com/user/profile/63bac6500000000026006c47`、哔哩哔哩 `https://space.bilibili.com/31961476`、X `https://x.com/xxc2007`、YouTube `https://www.youtube.com/@xxc2007`。
- 页脚署名式样：`编辑标准与代码 · 熊鑫晨`，接 `· MIT License · 2026`。

## 4. 禁止出现（check-links.mjs 会扫，命中即失败）

1. 科研/学术：论文、期刊、开题、文献、课题组、导师、实验室、GPA、具体研究主题（一律不点名）。
2. 学业表述：`课程作业`、年级/班级、获奖、奖学金、实习、`2025届` 之外的任何就学细节。
3. 头衔膨胀：`全栈工程师`、`资深开发者`、`专家`；社交数字（stars/followers/账号创建时间）不得当成就展示。
4. 主机信息：源站 IP、`ssh -i`、`.pem` 文件名、`<ssh-user>@`（占位符 `<server-ip>`/`<ssh-user>` 除外）。
5. 上游署名：不得把 AIHOT 的名字/Logo/版权写成他的；GEOHOT 站内署名是「地理热点编辑部」。
6. 任何编造：没有来源的句子一律不写。宁可少一句，不可错一句。

## 5. 交互实现分工（文件所有权，不得越界改别人的文件）

| 文件 | 负责内容 |
| --- | --- |
| `assets/css/style.css` | 全部样式与组件、响应式（≥1200 / 768 / ≤420 三档）、`prefers-reduced-motion` 降级、发丝线图标卡 |
| `assets/js/scene.js` | Three.js 首屏粒子场（导出 `initField(canvas)`），无 WebGL 时抛错由 main.js 兜底 |
| `assets/js/main.js` | 揭示动画、磁吸、卡片倾斜、语言菜单、进度条、复制邮箱、光标墨点 |
| `index.html` / `en/index.html` | 结构与文案 |
| `404.html`、`robots.txt`、`sitemap.xml`、`assets/images/*` | 配套页与图 |
| `README*.md`、`docs/*` | 仓库展示与迁移文档 |

## 6. 无障碍硬指标

- 语言菜单：`button[aria-haspopup=menu][aria-expanded]` + `ul[role=menu]` + `li > a[role=menuitem]`（选中项标 `aria-current=true`，与纪念册同一套语义）；Esc 关闭并把焦点还给按钮；无 JS 时 `.lang-menu` 里两个 `<a>` 仍可点。
- `canvas#field`：`role="img"` + `aria-label`（中文页写装饰性说明，英文页对应翻译）。
- 焦点：`:focus-visible{outline:2px solid var(--terra-ink);outline-offset:3px}`。
- 正文对比度 ≥ 7:1；`--muted` 只用于 ≥14px 的辅助文字（对 cream 5.0:1）。
- 移动端：≤420px 无横向滚动；`.social` 换行成 4+3；语言菜单不溢出。
