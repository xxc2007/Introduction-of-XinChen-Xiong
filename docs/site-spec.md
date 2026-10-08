# 站点规格 · xxc2007.me 个人介绍站

> 本文件是构建与验收的唯一依据。任何页面文案、配色、交互若与本文件冲突，以本文件为准；
> 本文件未覆盖的设计判断，一律向 `D:\nanchang15-website\site`（纪念册母本）的语言靠拢。

## 0. 定位与硬约束

| 项 | 决定 |
| --- | --- |
| 线上地址 | `https://xxc2007.me/`（中文）、`https://xxc2007.me/en/`（English） |
| 子路径关系 | 纪念册 → `/nc15/`；GEOHOT → `/geohot/`（不变）；Artalk → `/comment/`（**必须留在域名根**） |
| 技术形态 | 纯静态 HTML + CSS + Vanilla JS + 自托管 Three.js。**零构建步骤**、零外部 CDN 依赖 |
| 语言 | 仅两种：简体中文（默认）与 English。两页各为完整静态文件，不用 JS 切词典 |
| 内容边界 | 只写「个人基本信息 + 正在做的两个网站」。**不出现科研内容**（不提课题、论文、期刊、青藏高原气候变化研究方向） |
| 事实来源 | 一切履历/链接/邮箱/社媒只允许来自：GitHub 个人主页 README、两个已上线网站自身、两个仓库 README。禁止推断与编造 |
| 头像 | `assets/images/avatar.jpg`（站长提供的 300×300 原图，唯一一份，**原图直出：不转码、不裁切、不加圆框**；`avatar.webp` 已删。字节数以 `wc -c assets/images/avatar.jpg` 与 `node scripts/check-bytes.mjs` 为准，不在此抄写） |

## 1. 设计语言（Claude / Anthropic）

令牌承自纪念册 `assets/style.css` 的 `:root`，本站另加两档（见 `docs/build-contract.md` §1 补记）：`--terra-ink-2 #9A4226`（赤陶橙文字落在被赤陶橙染过的底上时用）与 `--line-strong #DCD5C6`（hover 重一档的发丝线）。对比度比值**一律以 `tests/quality.test.mjs` 为准，本文件不各自抄数**：

```
--cream #F0EEE6   页面底色        --paper #FAF9F5   卡片白
--ink   #1F1E1D   正文墨色        --muted #6E6A5E   弱文字（只 ≥14px）
--terra #D97757   赤陶橙（填充/描边/装饰，永不做文字）  --terra-deep #C15F3C
--terra-ink   #A8492A  文字专用赤陶橙（承 cream / paper 时）
--terra-ink-2 #9A4226  文字专用赤陶橙（承被赤陶橙染过的底时）
--line  #E4DFD3   发丝线          --line-strong #DCD5C6  hover 发丝线
--dark  #1F1E1D   深色区
--serif  Noto Serif SC Variable（自托管切片）→ Georgia → 宋体族
--sans   系统无衬线（标签、eyebrow、按钮）
```

规则：单一强调色；不用渐变、不用投影（分层只靠发丝线）；标题衬线、标签无衬线大写带字距；
中文数字节标 `壹 · ABOUT` 式；缓动 `cubic-bezier(.16,.84,.28,1)`。
**禁止**：玻璃拟态、彩色阴影、霓虹、蓝紫渐变、emoji 堆砌、默认 Three.js 打光。

字体：整份复用 `assets/fonts/noto-serif-sc/`（`wght.css` + `files/` 可变字体切片，
浏览器只按 `unicode-range` 拉用到的片）。

## 2. 页面结构（zh 与 en 逐节对齐）

| 节 | 锚点 | 内容 | 事实来源 |
| --- | --- | --- | --- |
| 顶栏 | — | 左：署名徽标「熊鑫晨」；中：锚点导航；右：语言 pill + 进度条 | — |
| 首屏 | `#top` | 头像（`avatar.jpg` 原图直出，无圆框/描边/底色）+ `熊鑫晨 · Xiong Xinchen` + 大字引言「我还没写出改变世界的代码。」+ 一行身份说明 + Three.js 纸屑粒子场 + 下滑提示 | profile README 原句 |
| 壹 · ABOUT | `#about` | 我是谁：地理科学专业在读、方向 GIS 与遥感、独立开发者、一个人 + AI 做完整站；坐标/所在地仅在已核实前提下写 | profile README |
| 贰 · WORKS | `#works` | 两张作品卡：① 青山湖畔的纪念册（→ `/nc15/`）② GEOHOT 地理热点（→ `/geohot/`）。每张含：一句话自述（引用他自己的原话）、事实条（栈/形态）、`线上访问` + `开源仓库` 两个入口 | 两站页面 + 两仓库 README |
| 叁 · HOW | `#how` | 我怎么做事：设计、前端、GIS 制图、部署运维全部 AI 协作；结构·样式·行为三分离、零框架；「我负责想清楚要做什么」 | profile README |
| 肆 · BELIEFS | `#beliefs` | 三条他已公开发表的信条，逐字引用，不改写 | profile README |
| 伍 · CONTACT | `#contact` | 邮箱（`mailto:`）+ 社媒发丝线图标卡一排：抖音 / 小红书 / 哔哩哔哩 / GitHub / X / YouTube（+ 个人站） | profile README 与纪念册页脚 |
| 页脚 | — | 署名行「编辑标准与代码 · 熊鑫晨」式 + 年份 + 版权 + 回到顶部 | 纪念册页脚式样 |

英文页为**独立完整译文**，不是机翻腔；节标 `壹 · ABOUT` → `I · ABOUT`（保留中文数字骨架的拉丁化对应，见 §5）。

## 3. 交互与动效清单（按优先级，含预算）

| # | 效果 | 实现 | 预算 / 降级 |
| --- | --- | --- | --- |
| 1 | 纸屑粒子场（首屏） | Three.js `Points` + 自定义 `ShaderMaterial`，米白底、赤陶橙少量点缀，指针视差 + 滚动缓慢推移 | 桌面 ≤1200 粒、移动 ≤400 粒；DPR 上限 1.75；无 WebGL 时退化为静态 CSS 发丝纹理 |
| 2 | 滚动逐节揭示 | `IntersectionObserver` + `--reveal` 变量，位移 ≤14px、时长 520ms、错峰 60ms | `prefers-reduced-motion` 下直接呈现 |
| 3 | 磁吸按钮 / 链接下划线扫过 | pointermove 位移 ≤6px，缓出；纯 CSS 下划线 `scaleX` | 触屏不绑定 |
| 4 | 作品卡 3D 倾斜 | `rotateX/Y ≤ 5deg` + 发丝高光边，`transform-style: preserve-3d` | 触屏/reduced-motion 关闭 |
| 5 | 语言切换 pill | 复刻纪念册：地球图标 + 当前语言名 + chevron，展开列表，选中项赤陶橙 + ✓；`localStorage` 记忆；键盘可达（Esc 关闭、焦点归位） | 无 JS 时是两个可点链接 |
| 6 | 滚动进度条 | 顶部 2px 赤陶橙进度条 | 纯 CSS 可降级 |
| 7 | 等高线装饰（贰 节背景） | 内联 SVG `stroke-dasharray` 揭示动画，单色 `--line` | 静态显示 |

（清单到 7 为止：早期规格写过的「右侧当前节标 / 节号计数」和「桌面自定义光标墨点」两项**从未实现、代码里也不存在**，已删除，不再作为验收依据。）

总量红线：**预算阈值与当前占用的唯一出处是 `node scripts/check-bytes.mjs`**（分类含 HTML/CSS/自有 JS/含 Three.js/图片/不进首屏分享素材，超限即 `BUDGET FAILED`），本文件不再抄一遍数字；要调阈值就改脚本里的预算表，别改这里。

## 4. 无障碍与降级（不可协商）

1. 关闭 JavaScript：全部内容与导航仍可读、可点（粒子/动效是增强，不是内容）。
2. `prefers-reduced-motion: reduce`：停止 RAF、粒子静止、揭示直接完成。
3. 键盘可达：跳过链接、焦点可见（`--terra-ink` 2px outline）、语言菜单 Esc 关闭并焦点归位。
4. 对比度：正文 ≥ 7:1；任何赤陶橙**作为文字**必须用 `--terra-ink`，且**两条下修例外不可省**——文字落在被赤陶橙染过的底（`rgba(217,119,87,.NN)`）上时降到 `--terra-ink-2`；任何赤陶橙文字都不许直接压在 WebGL 粒子场上（`hero-sub`/`scroll-cue` 用 `--ink`，`.hero-cta` 自带不透光 `--paper` 底）。两条不变量的比值与逐选择器核对都由 `tests/quality.test.mjs` 反推，细则见 `docs/build-contract.md` §1 与 `docs/design.md`。
5. `<canvas>` 给 `role="img"` + `aria-label`（说明这是装饰性粒子场）。
6. 移动端 ≤420px 与 390px 宽度不得出现横向滚动；语言菜单不超出视口。

## 5. 双语与 SEO

- 文件：`index.html`（zh-CN，默认）+ `en/index.html`（en）。
- `canonical`：`https://xxc2007.me/` 与 `https://xxc2007.me/en/`；`hreflang` 两条互为 + `x-default` 指向中文。
- `og:image` 1200×630（新站自有分享卡），`theme-color #F0EEE6`，JSON-LD `Person`（name/url/sameAs = 六个社媒 + 两个项目）。
- `sitemap.xml` 两条 URL；域名根 `robots.txt` 由本站拥有（含两条 Sitemap 行，并保留 `/geohot/*` 既有规则）。
- 防漂移：`scripts/check-parity.mjs` 断言两页的节标数量、锚点集合、链接集合、图片集合一一对应，数量不等即失败退出。
- 英文语气：与 `README.en.md` 一致——短句、第一人称、无营销腔；数字与事实与中文页完全一致。

## 6. 仓库与部署契约

- 仓库名（GitHub 不允许空格）：`Introduction-of-XinChen-Xiong`，展示标题 `Introduction of XinChen Xiong`，License **MIT**，`homepage` 设为 `https://xxc2007.me/`。
- 目录：`index.html`、`en/`、`assets/{css,js,vendor,fonts,images}`、`404.html`、`robots.txt`、`sitemap.xml`、`docs/`、`scripts/`、`tools/`、`README.md`、`README.en.md`、`LICENSE`、`.gitattributes`、`.gitignore`。
- 一键：`bash scripts/deploy.sh "说明"` = 提交 → 推 GitHub → `git archive HEAD` 上服务器 → 本机/仓库/服务器/CDN 四方逐字节核验。
- **仓库与文档里绝不出现源站 IP 与 SSH 登录名**：`scripts/deploy.sh` 从 gitignore 的 `.deploy.env` 读取 `DEPLOY_HOST/DEPLOY_USER/DEPLOY_KEY`，示例一律 `<server-ip>` / `<ssh-user>`。
- 迁移演练：`docs/migration.md` 必须证明「克隆仓库 → 一条命令 → 站点在新机器上跑起来」。
