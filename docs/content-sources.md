# 内容出处与边界 · 这个站上每一句话是从哪儿来的

> 这份文件是给**以后改文案的人（或模型）**读的。规矩只有一条：**没有来源的句子不写。**
> 页面上任何一句话，你都在这里能找到它的出处、核实方式和核实日期；找不到出处的那句，就是不该存在的那句。

核对日期：**2026-10-07**。核对范围：GitHub 个人主页 README、两个已上线网站、两个仓库 README、
GitHub profile API 与仓库 commit 元数据。所有命令都是 `gh api` / `curl` / `grep`，可在任何一台机器上重跑。

允许的三类来源（`docs/build-contract.md` §3 定死的边界）：

1. GitHub 个人主页 README（`github.com/xxc2007/xxc2007`；**本地留档 `research/profile-README.md` 已不存在，改为实时取**：`gh api repos/xxc2007/xxc2007/readme --jq .content | base64 -d`——该 README 于 2026-10-07 02:59Z 被本人编辑过，行号会漂，故本表凡引它都按小节标题定位）；
2. 两个已上线网站自己（`xxc2007.me` 与 `xxc2007.me/geohot/`）；
3. 两个仓库 README（纪念册仓库、GeoHot 仓库）。

同一条规矩也管**本站自己的文件**：`index.html` / `main.js` / `style.css` 的行号漂得比上游更快
（2026-10-08 抽查 `docs/design.md` 四处内部行号，三处已经指错地方）。
所以 docs/ 与 README 里任何一处都不许用 `文件名:行号` 指向仓库内文件——要定位就写引文本身或一条 `grep -n`。
`tests/quality.test.mjs` 里有一条断言盯着这件事。

其余一律不许进文案——不推断、不补全、不美化、不"看起来合理"。

---

## 一 · 逐条出处（页面上看得见的每一句）

### 首屏 `#top`

| 页面上出现的 | 出处 | 怎么核 | 核实日期 |
|---|---|---|---|
| `熊鑫晨` / `Xiong Xinchen`（`h1` 与 `en` 页 `h1`） | profile README 第 1 行标题 `# 熊鑫晨 · Xiong Xinchen` | `gh api users/xxc2007 --jq .name` + profile README 第 1 行 | 2026-10-07 |
| `我还没写出改变世界的代码。` | profile README 顶部引言（`gh api` 取回后为第 3 行；这段在徽章统计块**之前**，今日改动未使其漂移），逐字 | `gh api repos/xxc2007/xxc2007/readme --jq .content \| base64 -d \| grep -n '改变世界'` → 第 3 行 | 2026-10-07 |
| `但用 AI 做出了自己的第一个网站——把母校装进一个可以随时回去的网页。` | profile README **第 5 行**开头一句，**逐字**（此前记录的「用 → 我和」改写已回退） | `grep -n '但用 AI 做出了' index.html`对照 profile README 第 5 行：`gh api repos/xxc2007/xxc2007/readme --jq .content \| base64 -d` → 第 5 行原文即「但用 AI 做出了」 | 2026-10-07 <!-- 已核对：页面与 README 同句，无改写 --> |
| 头像 `avatar.jpg`（HTML 声明 `width="300" height="300"`，本会话实测 **300×300 / 26,762 B**） | 站长本人提供的原图，逐字节搬入（`docs/image-provenance.md` §三）。**旧行记的 `avatar.webp`（5,282 B）连同 `favicon.svg` 已在提交 `6856bc0` 删除**，页面与 JSON-LD 现都指 `avatar.jpg`；`docs/build-contract.md` §0 也已同步到 `avatar.jpg` 26,762 B（早期那版「9,814 / avatar.webp 5,282」的旧数字已改掉，别再照抄） | `wc -c assets/images/avatar.jpg` → 26762；`node -e`（读 JPEG SOF 头）→ 300×300；`grep -o 'avatar[a-z.]*' index.html` → 只有 `avatar.jpg`；规格明确禁止"生成/使用不存在的人物照片" | 2026-10-07 |
| `canvas#field`：**装饰性粒子画布，现在是 `<canvas id="field" aria-hidden="true">`，不带任何标签**（旧行记的 `aria-label`／`role="img"` 已不存在——对读屏软件隐藏比给它编一句"浅色纸屑"标签更诚实，它本就不承载信息） | 本站自己的实现（index.html、en/index.html） | `grep -n 'id="field"' index.html en/index.html` → 两处均为 `<canvas id="field" aria-hidden="true"></canvas>`；`grep 'role="img"' index.html` → 0 命中 | 2026-10-07 |

### 壹 · ABOUT `#about`

| 页面上出现的 | 出处 | 怎么核 | 核实日期 |
|---|---|---|---|
| 「我放上线的还有两个站点——纪念母校的那本私人纪念册，和地理热点 GEOHOT。」（en：`Two other things of mine are live: a private memorial page for my school, and GEOHOT.`） | 本页自述当前在上线的两个站点（index.html／en/index.html）。**旧行的序数「第二个网站」已删——它没有来源，且被时间线证伪**：纪念册仓库建于 2026-09-05（profile README 顶部引言第 5 行也称它是他"第一个网站"），GEOHOT 于 2026-10-01 上线（GeoHot README「已部署」段，第 140 行），而本介绍页仓库直到 2026-10-07 才建——三个站里它是最晚的一个，"第二个"无从谈起；序数不是被新事实推翻，而是从来就没有来源支撑 | `gh api repos/xxc2007/GeoHot/readme --jq .content \| base64 -d \| grep -n '已部署'` → 第 140 行（2026-10-01）；三仓 `gh api repos/xxc2007/<repo> --jq .created_at` → 纪念册 2026-09-05 / GeoHot 2026-10-01 / 本站 2026-10-07；`grep -n '我放上线的还有两个站点' index.html` → 第 114 行 | 2026-10-07 |
| 「25 张校园照片全部是我自己拍的」 | profile README 顶部引言第 5 行「25 张校园实景摄影」；纪念册 README 第 26 行「**25 张校园实景摄影**」 | `gh api repos/xxc2007/In-memory-of-Nanchang-No.-15-Middle-School/readme --jq .content \| base64 -d \| grep -n '25 张'` → 第 26 行（本地 `nanchang15-website/site/README.md` 已不存在，旧 `grep` 作废） | 2026-10-07 |
| 「地图用的是中文标注」 | profile README 顶部引言第 5 行「一张中文定位图」；纪念册 README 第 71 行「高德地图（AutoNavi）中文栅格底图」——两处都只说底图来自高德，**从未主张中文标注是他画的**（职责拆分详见「叁 · HOW」地图行） | `gh api repos/xxc2007/In-memory-of-Nanchang-No.-15-Middle-School/readme --jq .content \| base64 -d \| grep -n '中文栅格底图'` → 第 71 行 | 2026-10-07 |
| 「留言墙不需要登录」 | profile README 顶部引言第 5 行「一面无需登录的留言墙」；纪念册 README 第 83 行「**无需登录**：不填昵称邮箱也能留言」 | `gh api repos/xxc2007/In-memory-of-Nanchang-No.-15-Middle-School/readme --jq .content \| base64 -d \| grep -n '无需登录'` → 第 83 行 | 2026-10-07 |
| 「整本站有十种语言」 | 纪念册 README 第 64 行「十种语言」段列出的十个子路径（`/` `/zh-Hant/` `/en/` `/ja/` `/ko/` `/ru/` `/es/` `/fr/` `/pt/` `/ar/`） | `gh api repos/xxc2007/In-memory-of-Nanchang-No.-15-Middle-School/readme --jq .content \| base64 -d \| grep -n '十种语言'` → 第 64 行（本地 `nanchang15-website/site/` 目录已不在，旧的 `ls -d` 计数命令已作废） | 2026-10-07 |
| 「我在国内」 | GitHub profile API 的 `.location` 字段值就是 `China`，**只有这一个字** | `gh api users/xxc2007 --jq .location` → `China` | 2026-10-07 |
| `dl.facts` 第一行 姓名 `熊鑫晨 · Xiong Xinchen` | profile README 第 1 行 | 同上 | 2026-10-07 |
| `dl.facts` 第二行 所在地 `中国` | profile API `.location`；页面写"中国/China"，**不写城市** | 同上；见「三 · 不写什么」第 2 条为什么不能写城市 | 2026-10-07 |
| `dl.facts` 第三行 邮箱 `xxc200707@gmail.com` | **GitHub profile API 的 `.email` 元数据**，以及三个仓库 commit 的作者邮箱（作者名 熊鑫晨 / XinChen Xiong） | `gh api users/xxc2007 --jq .email`；`gh api repos/xxc2007/GeoHot/commits --jq '.[0].commit.author.email'` | 2026-10-07 <!-- 待核对：这是它第一次出现在可见文案里，见「二 · 必须先问本人」 --> |

> 线上形态提醒：Cloudflare 开着 Email Address Obfuscation，公网取回的 HTML 里这一行 `mailto:` 会被换成
> `/cdn-cgi/l/email-protection#…` 的受保护链接，并注入一个 `email-decode.min.js`。
> 仓库里的字节仍是明文——`scripts/verify-sync.sh` 的 D 段与 `tools/normalize-cf.mjs` 就是因为这件事，
> 才把两边先归一化成同一个 `MAILTO` 记号再比哈希。**别把这种差异当成"邮箱被改了"去回滚。**
| `dl.facts` 第四行 正在做「两个已经上线的网站」 | profile README「### 我在做的事」一节的纪念册条 + GEOHOT 条，各带线上地址（该节今日因徽章重排整体下移，原记"第 17–46 行"作废，故按小节标题引用） | `gh api repos/xxc2007/xxc2007/readme --jq .content \| base64 -d \| grep -n '我在做的事'`；`curl -s -o /dev/null -w '%{http_code}' -A 'Mozilla/5.0' https://xxc2007.me/geohot/` → 2026-10-07 实测 200 | 2026-10-07 |

### 贰 · WORKS `#works`

| 页面上出现的 | 出处 | 怎么核 | 核实日期 |
|---|---|---|---|
| 卡一标题 `青山湖畔的纪念册 · 纪念南昌市第十五中学` | 纪念册页面标题与仓库名 `In-memory-of-Nanchang-No.-15-Middle-School` | `gh api repos/xxc2007/In-memory-of-Nanchang-No.-15-Middle-School --jq .full_name` | 2026-10-07 |
| 卡一自述 `把母校做成一个可以随时访问的地址。` | profile README「### 我在做的事」纪念册条标题「青山湖畔的纪念册 · 把一座校园做成可访问的地址」（原记"第 19 行"已随今日重排下移） | `gh api repos/xxc2007/xxc2007/readme --jq .content \| base64 -d \| grep -n '可访问的地址'` | 2026-10-07 |
| 卡一事实条①「纯 HTML / CSS / 原生 JS，结构、样式、行为三分离，没有构建步骤」 | 纪念册 README 第 28 行同句 | `gh api repos/xxc2007/In-memory-of-Nanchang-No.-15-Middle-School/readme --jq .content \| base64 -d \| grep -n '三分离'` → 第 28 行（本地 `nanchang15-website/` 路径已不存在） | 2026-10-07 |
| 卡一事实条②「25 张…八个机位的时光漫游」 | 纪念册 README 第 26 行、第 70 行「8 个机位、8 张全幅照片」 | `gh api repos/xxc2007/In-memory-of-Nanchang-No.-15-Middle-School/readme --jq .content \| base64 -d \| grep -n '机位'` → 第 26、70 行 | 2026-10-07 |
| 卡一事实条③「一张中文定位图、一面无需登录的自托管留言墙、十种语言」 | 纪念册 README 第 26 / 64 / 81–83 行 | `gh api repos/xxc2007/In-memory-of-Nanchang-No.-15-Middle-School/readme --jq .content \| base64 -d \| grep -n '自托管'` → 第 81 行「Artalk 自托管」 | 2026-10-07 |
| 卡一 `线上访问` 指向 `https://xxc2007.me/nc15/` | 目标路由（`deploy/nginx.conf.example` 里的「纪念册迁到 /nc15/」那条 location（`grep -n "纪念册迁到" deploy/nginx.conf.example`） + `docs/site-spec.md` §0 的子路径约定） | **2026-10-07 10:21（+0800）实测 HTTP 200**：`curl -s -o /dev/null -w '%{http_code}' -A 'Mozilla/5.0' https://xxc2007.me/nc15/` → `200`（此前记的 404 是域名根切换之前的状态，09:44 切换后已失效） | 2026-10-07 <!-- 已核对：`/nc15/` 现返回 200，见 migration.md「五」的切换记录 --> |
| 卡二标题 `GEOHOT · 地理热点` | GeoHot 仓库 README 首行与 `industry/site.ts` 的站名 | `gh api repos/xxc2007/GeoHot --jq .full_name` | 2026-10-07 |
| 卡二自述 `每天早上八点，出一份地理日报。` | profile README「### 我在做的事」GEOHOT 条「每天早上 8 点出一份地理日报」（原记"第 40 行"已随重排下移）；GeoHot README 第 28 行「每天早上 08:00…出一份日报」 | `gh api repos/xxc2007/xxc2007/readme --jq .content \| base64 -d \| grep -n '每天早上 8 点'`；`gh api repos/xxc2007/GeoHot/readme --jq .content \| base64 -d \| grep -n '每天早上 08:00'` | 2026-10-07 |
| 卡二事实条①「建在开源框架 AIHOT 之上，地理这一层全部收在 `industry/` 一个目录里」 | profile README「### 我在做的事」GEOHOT 条「它建在开源框架 AIHOT 之上…全在 `industry/` 一个文件夹里」（原记"第 40 行"已下移） | `gh api repos/xxc2007/xxc2007/readme --jq .content \| base64 -d \| grep -n '开源框架 AIHOT'`；`gh api repos/xxc2007/GeoHot/contents/industry --jq '.[].name'` | 2026-10-07 |
| 卡二事实条②「信源先采集、再预筛，然后两次独立打分；入选标准是空间显著性优先，门槛按信源分级。」（en：`spatial salience is the ranking criterion, while the admission threshold is set per source tier`；index.html／en/index.html） | GeoHot README 把两件事分开：**第 95 行**「入选标准只有一条：空间显著性优先」是**排序判据**；**第 105 行**「门槛按信源分级：`T1` 46 / `T1_5` 49 / `T2` 52」是**准入门槛**。旧行「门槛由空间显著性决定」把这两者混为一谈——上游从没说过门槛由显著性决定，门槛是按信源等级设的数值线；现已按上游把两件事分别写清 | `gh api repos/xxc2007/GeoHot/readme --jq .content \| base64 -d \| grep -nE '入选标准只有一条\|门槛按信源分级'` → 第 95、105 行（2026-10-07 实测） | 2026-10-07 |
| 卡二事实条③「前端 React Router 8 服务端渲染，网页、API 与跑采集/分析的 worker 分单元常驻。」（index.html；en：`the web app, the API and the worker that collects and analyses run as separate resident services`） | GeoHot README 目录树：第 189 行 `apps/api`（Fastify 读者接口）、**第 190 行 `apps/worker # pg-boss 队列与定时任务：采集、分析、归组、成刊（不监听端口）`**、第 191 行 `apps/web`（React Router 8 服务端渲染 + Tailwind v4，另见技术栈表第 213 行）；第 140 行「四个常驻单元」。**旧行「后端、采集与分析各自独立成服务」不成立——上游把采集与分析放进同一个 worker 进程（第 190 行），且明写四个常驻单元而非三个服务；已按上游改写** | `gh api repos/xxc2007/GeoHot/readme --jq .content \| base64 -d \| grep -nE '不监听端口\|四个常驻单元\|React Router 8 服务端渲染\|Fastify：读者接口'` → 第 190、140、191、189 行（2026-10-07 实测） | 2026-10-07 <!-- 本轮二次更正：上一版把服务拓扑写成"独立成服务"，与上游 worker 单进程采集+分析冲突，改为分单元常驻（四个常驻单元） --> |
| 两张作品截图 `shot-nc15.webp` / `shot-geohot.webp`，HTML 声明各自文件的真实尺寸（`shot-geohot` 是 1000×626） | **真实浏览器实拍线上站点**（Playwright 驱动本机 Chrome，1280×800 视口）；取证与逐字节复现过程记在 `docs/image-provenance.md`（旧路径 `assets/images/README.md` 已于 2026-10-07 删除并搬到此文件，§六） | 字节复算：`wc -c assets/images/shot-*.webp` → shot-nc15 **28,624 B**、shot-geohot **32,500 B**（与旧行一致，未变）。**像素尺寸本会话另用 `node -e` 读 WEBP `VP8 ` 帧头复测：shot-nc15 实测 1200×750（与 HTML 声明相符）；shot-geohot 实测 1000×626，而 index.html／en/index.html 仍写 `width="1200" height="750"`——声明与实物不符，是**已知未闭合**的差异（宽高比 1.5974 vs 1.6000，肉眼难辨；provenance 文档 §六 同记此条，其编码参数也未能逐字节复现）。改 `index.html` 不在本表动手范围，留站长定夺** | 2026-10-07 |
| 两个 `开源仓库` 链接 | `github.com/xxc2007/In-memory-of-Nanchang-No.-15-Middle-School`、`github.com/xxc2007/GeoHot` | `gh api repos/xxc2007/<repo> --jq .html_url` | 2026-10-07 |

### 叁 · HOW `#how`

| 页面上出现的 | 出处 | 怎么核 | 核实日期 |
|---|---|---|---|
| 四条步骤（先想清楚它是干什么的 / 设计与建造 / **地图这一层自己做** / 上线并且养着它；index.html） | 由 profile README 顶部引言的分工句 + 「### 我在做的事」纪念册条"照片全部自己拍摄"、纪念册 README 部署段展开；**这四句是本站的编辑性表述，不是逐字引用**。**第三条旧名「地图自己画」越界了——已按上游拆清职责**：底图与中文标注都来自**高德 AutoNavi 栅格瓦片**（瓦片 URL 带 `lang=zh_cn`，见纪念册线上 `assets/map.js` 第 324–327 行 `https://webrd0X.is.autonavi.com/appmaptile?lang=zh_cn…`）；**属于他的只有八个机位的摆放与这张定位图的组织**。纪念册 README 自己写的是「中文定位图：高德地图（AutoNavi）中文栅格底图」（第 71 行），从没主张标注是他画的，是介绍站此前擅自加码 | 底图来源：`curl -s -A 'Mozilla/5.0' https://xxc2007.me/nc15/assets/map.js \| grep -n 'lang=zh_cn'` → 第 324–327 行（响应头 `Server: cloudflare` + `CF-RAY`，取自线上而非本机副本）；纪念册口径：`gh api repos/xxc2007/In-memory-of-Nanchang-No.-15-Middle-School/readme --jq .content \| base64 -d \| grep -n '中文栅格底图'` → 第 71 行；分工句：`gh api repos/xxc2007/xxc2007/readme --jq .content \| base64 -d \| grep -n '设计、前端'` | 2026-10-07 |
| 收尾句 `设计、前端、GIS 制图、部署运维，全部 AI 协作完成。我负责想清楚要纪念什么。`（en：`Design, front end, GIS mapping, deployment and operations — all of it done in collaboration with AI. My job is to be clear about what to commemorate.`，en/index.html） | profile README 顶部引言第 7 行逐字，**零改动**。**「全部 AI 协作完成」是本人原话，标记为受保护字符串：只可整句原样引用，不得改写或译成别的说法**；英文侧同样表述为 collaboration with AI（AI 协作完成），并未把它说成他独立完成。此前记的两处改写「全部 AI 协作完成 → 全部**与** AI 协作完成」「要**纪念**什么 → 要**做**什么」**都已回退成原句** | 两侧同句对照：`grep -n '全部 AI 协作完成' index.html`（第 173 行）＝ profile README 第 7 行（`gh api repos/xxc2007/xxc2007/readme --jq .content \| base64 -d`，2026-10-07 实测逐字相同）；英文侧 `grep -n 'in collaboration with AI' en/index.html` → 第 174 行 | 2026-10-07 <!-- 已核对：改写已回退；注意 docs/site-spec.md §2 与 build-contract.md §3 仍写着「我负责想清楚要做什么」，与页面不一致，待站长定 --> |

### 肆 · BELIEFS `#beliefs`

| 页面上出现的 | 出处 | 怎么核 | 核实日期 |
|---|---|---|---|
| `地理不止是知识，是一种看世界的方式。` | profile README「### 我相信的几件事」第一条，**逐字**（原记"第 61 行"随今日重排下移到该节） | `gh api repos/xxc2007/xxc2007/readme --jq .content \| base64 -d \| grep -n '看世界'` | 2026-10-07 |
| `做出来比说出来有用。` | profile README「### 我相信的几件事」第二条，逐字 | `gh api repos/xxc2007/xxc2007/readme --jq .content \| base64 -d \| grep -n '做出来比说出来有用'` | 2026-10-07 |
| `实践是唯一的检验标准。` | profile README「### 我相信的几件事」第三条，逐字 | `gh api repos/xxc2007/xxc2007/readme --jq .content \| base64 -d \| grep -n '实践是唯一的检验标准'` | 2026-10-07 |
| 三处 `cite` 署名 `熊鑫晨 · Xiong Xinchen` | 同「首屏」姓名行出处；**不加"某某大学/某某职位"这类头衔** | build-contract §3 | 2026-10-07 |

### 伍 · CONTACT `#contact` 与页脚

| 页面上出现的 | 出处 | 怎么核 | 核实日期 |
|---|---|---|---|
| `写信最稳妥。` | 编辑性表述，依据是除邮箱外没有任何即时通讯渠道被公开（无微信/微博/知乎 handle） | `gh api users/xxc2007 --jq 'del(.email)'` 里没有这些字段；profile README 也只列了那 6 个 | 2026-10-07 |
| 7 个社媒入口与**顺序**（个人站 · GitHub · 抖音 · 小红书 · 哔哩哔哩 · X · YouTube） | profile README「### 找到我」一节的图标排（`<a>` 串）与「主要阵地 / 社交平台」两行文字排，URL 逐字照抄（原记"第 72 / 75 / 77 行"随重排下移） | `gh api repos/xxc2007/xxc2007/readme --jq .content \| base64 -d \| grep -o 'https://[^"]*' \| sort -u` | 2026-10-07 |
| X 与 YouTube 的 handle `@xxc2007` | profile README「### 找到我」一节「社交平台」行（`X @xxc2007` / `YouTube @xxc2007`）。**注意 GitHub API 的 `twitter_username` 是 null**，所以唯一来源是他自己的页面 | `gh api users/xxc2007 --jq .twitter_username` → 空；`gh api repos/xxc2007/xxc2007/readme --jq .content \| base64 -d \| grep -n '@xxc2007'` | 2026-10-07 |
| 页脚 `编辑标准与代码 · 熊鑫晨` | GEOHOT 仓库 README 页脚（第 310 行，本会话按实时 README 复核仍在此行）的署名式样；build-contract §3 把它定为本站页脚 | `gh api repos/xxc2007/GeoHot/readme --jq .content \| base64 -d \| grep -n '编辑标准'` → 第 310 行（本地 `research/geohot-README.md` 已不存在，旧 `grep` 作废） | 2026-10-07 |
| 页脚 `2026 · MIT 协议` | `LICENSE` 第 3 行 `Copyright (c) 2026 熊鑫晨 (Xiong Xinchen)` | `sed -n '3p' LICENSE` | 2026-10-07 |

### 元数据（读者看不见，但机器会引用）

| 字段 | 出处 | 核实 |
|---|---|---|
| `canonical` / `hreflang` / `og:url` = `https://xxc2007.me/` 与 `/en/` | `docs/site-spec.md` §5 | `grep -n 'canonical' index.html` |
| JSON-LD `Person`：`name` `alternateName` `url` `email` `image` `address.addressCountry: China` `sameAs` ×7 | 上面各行 | `sed -n '38,58p' index.html` |
| `og:image` = `https://xxc2007.me/assets/images/og-card.png`，配 `og:image:alt` 一句中文说明 | 分享卡由 `og-card.svg` 在 Chrome 里 1:1 栅格化（过程记在 `docs/image-provenance.md`） | `grep -n 'og:image' index.html`；`node -e "…readUInt32BE(16/20)…"` 实测 IHDR **1200×630**，PNG **74,866 B** | 2026-10-07 |

<!-- 已核对：09:35 那次 og:image 还指着 300×300 头像，09:53 复查已接到 1200×630 的 og-card.png——这条曾列在待核对里，现已闭合。 -->

---

## 二 · 必须先问本人，不能自己决定的一件事

**邮箱。** `xxc200707@gmail.com` 确实是他自己设成公开的 GitHub profile 邮箱（API `.email`），
也确实是三个仓库 commit 的作者邮箱——但它的"公开"只到**元数据**那一层：
纪念册与 GEOHOT 的页面上**一处 `mailto:` 都没有**（对两个站点 HTML 与线上页面 grep `mailto`/`gmail`/`qq.com`/`163` 全部 0 命中），
profile README 里也没写。而 GEOHOT 的代码里明写 `contactEmail: null as string | null`，
旁边那句注释是他的态度："这比挂一个没人看的假地址诚实"。
所以本站是**第一次把这个邮箱放进可见文案**。这不叫"泄露"，但也绝不能算"他早就公开发布了"——
将来有人想改这个地址、或把它从 `mailto:` 升级成带二维码的联系方式，先问本人，别照抄本表就动手。

---

## 三 · 不写什么（这份清单存在的唯一目的：管住后来人）

下面这些词**故意**写在这里。`scripts/check-links.mjs` 的科研红线只扫 `index.html`、`en/index.html`、`404.html`、
`README.md`、`README.en.md` 五个文件，就是为了让这份表能把话说清楚——**别把它"清理"掉，也别把它当模板抄进页面**。

1. **科研与学术内容**：论文、学位论文/毕设、开题、文献综述、课题组、导师、实验室、期刊投稿与审稿、引用、GPA/学业成绩。
   一条都不写。`docs/site-spec.md` §0 的原话是"内容边界：**不出现科研内容**"。
2. **研究方向那句话**——`关注青藏高原地区的气候变化及其带来的影响`（profile README「**GIS 学习与制图实践 · 让地理数据开口说话**」小节；原记"第 51 行"随今日重排已下移，故按小节标题引用）。
   那是他本人的原话，但它是**科研方向的表述**，站长明确排除。同理该「GIS 学习与制图实践」小节的
   `地理科学专业在读，方向是 GIS 与遥感`、`常用 ArcGIS / QGIS 做空间分析`、`正在把课程作业沉淀为可复现的开源工作流`
   也属学业/课程表述，不进这个站。
   注意：`docs/site-spec.md` §2 曾经允许"地理科学专业在读"进 ABOUT 段——**当前页面并没有写它**（页面只写"我在国内"）。
   如果将来要加，只能逐字取自该小节前半句，并且**绝不带上后半句的气候方向**。
3. **就学细节**：年级、班级、`2025届毕业生`、获奖、奖学金、实习、校园活动的具体时间线。
   `2022–2025` 属于纪念册那本册子的叙事，不是这个人的履历条目。
4. **学校坐标当住址**：`28.7208° N, 115.9322° E` 与 `28.72078/115.93216` 是纪念册**校园定位图**上的学校位置
   （纪念册 `index.html` 第 80、582 行），**不是他的居住地**。所在地只有一个来源、一个值：`China`。
   另一个诱惑来自 GitHub profile 的 `.company = "JiuJiang university"` 与 `.blog`——那是 profile 字符串，
   只能按原文引用，**不许写成校名+城市来推定他住在哪**。
5. **社交平台数字**：followers = 0、两个仓库各 1 star、`public_repos = 6`（2026-10-07 `gh api users/xxc2007 --jq .public_repos` → `6`；六个是 GeoHot、In-memory-of-Nanchang-No.-15-Middle-School、Introduction-of-XinChen-Xiong（本站）、xxc2007、xxc2007-me、xxc2007.github.io）、账号创建于 2026-03-30。
   这些是 API 数出来的，但它们不是成就，也不做徽章。profile README 里那个 `<!-- STATS-START -->` 统计块属于 profile 仓库，不进作品仓库。
6. **头衔膨胀**：`全栈工程师`、`资深开发者`、`专家`、`独立顾问`。他页面里只出现"我负责想清楚要做什么"这一种自我描述。
7. **上游署名**：GEOHOT 建在开源框架 AIHOT 之上，但 AIHOT 的名字、Logo、版权都不是他的（GeoHot 的 `LICENSE` 版权行仍是上游，站内不使用 AIHOT 名字与 Logo）。
   并且 **GEOHOT 站内不署他的真名**——`founder.name = '地理热点编辑部'`，代码注释写着"没有真名之前就用编辑部，不要替站点编一个人名"。
   介绍站提 GEOHOT 时，可以说"他做的"，但不能把 GEOHOT 站内的署名改成他。
8. **社媒 handle 编造**：抖音/小红书只有长串用户 ID URL，哔哩哔哩只有数字空间号；微信、微博、知乎**没有公开账号**，不许"补一个"。
9. **人物照片生成**：头像只能用本人提供的原图（`docs/build-contract.md` §0）。

---

## 四 · 上游资料互相打架的地方（照抄会写错，务必看这段）

profile README 已于 **2026-10-07 02:59Z** 由本人再次编辑（本表 profile 各行现按 `gh api repos/xxc2007/xxc2007/readme --jq .content | base64 -d` 实时取回，行号会漂故一律按小节标题引用），GEOHOT 仓库 README 亦于 **2026-10-07 03:07Z** 推过；同一天里 profile 的 GEOHOT 段仍写着下面这些旧说法，冲突依旧成立，
介绍站的文案按"更近的一侧"或"不写数字"处理：

| profile README 的说法 | 更新的事实 | 本站的处理 |
|---|---|---|
| 「站上没有配任何 LLM Key」（「### 我在做的事」GEOHOT 条；原记"第 40 行"随重排下移） | GeoHot README 第 112 行明写 2026-10-06 起接入第三方大模型服务 | 介绍站的卡二**不提** LLM Key 这件事 |
| 「教材式六分类」（「### 我在做的事」GEOHOT 条；原记"第 40 行"已下移） | GeoHot README 与其徽章都是**七个分类**（两个旧分类于 2026-10-03 删除） | 卡二不写分类数；要写只能写七个 |
| 「本地 173 项后端测试 / 16 项前端测试 / 30 项冒烟检查全绿」 | GeoHot README 自己拒绝硬抄数（"别抄数"），测试数每天在漂 | 介绍站**一个测试数字都不写** |
| 徽章 `Public Repos-6`（**profile README 里那枚原写"4"，今日已由本人改成"6"**，与 API 对齐）、`Total Stars-0` | profile API `.public_repos = 6`（2026-10-07 `gh api users/xxc2007 --jq .public_repos` → `6`；六个里含本站仓库 `Introduction-of-XinChen-Xiong`）；两个项目仓库各 1 star | 不写仓库数、不写星数（连 Star History 也不配星数徽章）——**即便 badge 今已跟 API 对齐，页面仍不引用这组数字** |
| GEOHOT 的「信源 98+1 个 / 收录 2842 / 事件 1627 / 精选 48 / 日报 4 期」 | 线上 about 渲染的是另一组每天在变的数（实测当时为 85 个信源、8,578 条、精选 54、2 期） | 卡二**不写任何 GEOHOT 计数**；那是 GEOHOT 自己的口径，归 `/api/site/stats` |

---

## 五 · 改文案之前 / 之后

**之前**：先在上面这张表里找到那句要改的话的出处。找不到出处——说明它本来就不该在页面上，删掉比改对更快。
新增任何一句，必须能填进表里三列（出处 / 怎么核 / 核实日期），并且**不落在「三 · 不写什么」九条里**。

**之后**：闸门会替你把关，但闸门管不了"编得像真的"。跑这三条：

```bash
node scripts/check-links.mjs    # 科研红线（只管 5 个读者文件）+ 主机信息红线 + 站内链接可达
node scripts/check-parity.mjs   # 中英两页的数量与集合必须一致：改中文一句就得改英文一句
bash scripts/deploy.sh "改了哪句"
```

`check-parity.mjs` 会钉住 `blockquote=3`、`dl.facts 行=4`、`ol.steps 项=4`、`social li=7`——
也就是说，**增删一条信条或一个社媒入口是一次结构变更**，不是改个字那么小。

> 这份表本身也要有日期。每次核完就把日期推到当天，并把你**真跑过的命令**留在表里。
> 上一个改文案的人如果只留下"这是事实"而没有留下命令，那这条事实从这一刻起就重新变成待核对。
