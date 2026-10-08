# 设计语言记录 · xxc2007.me 个人介绍站

> 这份文件回答两个问题：**为什么长这样**，以及**代码实际做到了什么**。
> 前者抄不走（它是取舍），后者必须每次改完重新核。凡本文写的比值、字节、毫秒、粒子数，
> 都来自实际跑过的命令，复算式记在仓库外的 `readme-numbers.md`（同目录 `raw.txt` 是原始输出）。

核对时刻：**2026-10-07 09:35–09:53（+0800）**，`main` 分支，`git ls-files | wc -l` = **144**（09:35 时是 138）。10:21 重跑同一条命令 = **145**：索引里仍算着 4 项已从工作区删除、尚未提交的条目（`git ls-files -d` 可查），那四项提交后这一计数会是 **141**。
站点仍在构建：`assets/images/` 与 `assets/js/` 在这十几分钟里被改写过数次，所以**字节类数字都是那一刻的快照**，
唯一一次闸门翻脸也照实记：09:35 `node scripts/check-bytes.mjs` 报 `BUDGET FAILED`（「头像 + 两张作品截图」92.1 KB / 87.9 KB），
09:53 同一行变成 **64.8 KB → `BUDGET OK`**——图片被重压过，不是数字写错了。

---

## 壹 · TOKENS 令牌与它们的算式

令牌逐字继承纪念册母本（`D:\nanchang15-website\site\assets\style.css` 的 `:root`），值一个都没改；
本站另加五条只为排版服务的派生尺度（`--maxw` `--gut` `--bar` `--dur` `--lift`），**没有新增颜色**。

| 令牌 | 值 | 用在哪 | 对 cream 实测对比度 | 对 paper 实测对比度 |
|---|---|---|---|---|
| `--cream` | `#F0EEE6` | 页面底色、顶栏底、`.shot` 底 | — | 1.060:1（纯装饰层，不作文字底） |
| `--paper` | `#FAF9F5` | 卡片白、`.lang-menu` 底、`<code>` 底 | 1.094:1 | — |
| `--ink` | `#1F1E1D` | 正文、标题、深色区 | **14.328:1** | **15.799:1** |
| `--muted` | `#6E6A5E` | 辅助文字（只允许 ≥14px） | **4.652:1** | **5.129:1** |
| `--terra` | `#D97757` | 填充、描边、装饰——**永不做文字** | 2.687:1 | 2.963:1 |
| `--terra-deep` | `#C15F3C` | hover 边框、强调描边 | 3.638:1 | 3.997:1 |
| `--terra-ink` | `#A8492A` | **文字专用赤陶橙**（链接、节号、焦点环） | **4.951:1** | **5.459:1** |
| `--terra-ink-2` | `#9A4226` | **落在被赤陶橙染过的底上的文字**（导航当前项、语言 pill hover/展开、hero CTA hover 等） | **5.682:1** | 6.266:1 |
| `--line` | `#E4DFD3` | 发丝线（全站唯一分层手段） | 装饰元素，不在 1.4.3 的范围内 | — |
| `--ease` | `cubic-bezier(.16,.84,.28,1)` | 全站唯一缓动 | — | — |

### `--terra-ink` 的算式（自己算的，不是引用别人的结论）

WCAG 2.1 相对亮度：把 sRGB 每通道除以 255，`v ≤ 0.03928` 走 `v/12.92`，否则走 `((v+0.055)/1.055)^2.4`；
`L = 0.2126R + 0.7152G + 0.0722B`；对比度 `(L₁+0.05)/(L₂+0.05)`。

```
#A8492A  sRGB 168,73,42    → linear 0.39157 0.06663 0.02315  → L = 0.13257
#F0EEE6  sRGB 240,238,230  → linear 0.87137 0.85499 0.79130  → L = 0.85388
#FAF9F5  sRGB 250,249,245  → linear 0.95597 0.94731 0.91310  → L = 0.94668
#D97757  sRGB 217,119,87   → linear 0.69387 0.18447 0.09531  → L = 0.28633
#C15F3C  sRGB 193,95,60    → linear 0.53328 0.11444 0.04519  → L = 0.19848
#6E6A5E  sRGB 110,106,94   → linear 0.15593 0.14413 0.11193  → L = 0.14431
#1F1E1D  sRGB 31,30,29     → linear 0.01370 0.01298 0.01229  → L = 0.01309

L(168,73,42) = 0.2126×0.39157 + 0.7152×0.06663 + 0.0722×0.02315 = 0.13257

terra-ink / cream = (0.85388 + 0.05) / (0.13257 + 0.05) = 0.90388 / 0.18257 = 4.951:1
terra-ink / paper = (0.94668 + 0.05) / (0.13257 + 0.05) = 0.99668 / 0.18257 = 5.459:1
terra      / cream = 0.90388 / 0.33633 = 2.687:1     ← 不够 3:1，连大字也不达标
terra-deep / cream = 0.90388 / 0.24848 = 3.638:1     ← 只够 1.4.11 非文本控件，不够正文
```

结论不止一句，是**三条**（比值以 `tests/quality.test.mjs` 为准，别在文档里各抄一份）：

1. **赤陶橙要做文字，落在 `--cream` / `--paper` 这类没被染过的底上，用 `--terra-ink`（#A8492A，4.951 / 5.459）。** 亮两档的 `--terra`（2.687）与 `--terra-deep` 够不着 4.5:1，所以它们的权限被写死成"填充、描边、装饰"。
2. **凡把底色染上赤陶橙（`background:rgba(217,119,87,.NN)`）的规则，文字一律降到 `--terra-ink-2`（#9A4226，对 cream 5.682）。** 染色底本身吃掉 0.3–0.6 档对比：`--terra-ink` 对 cream 是 4.951，对 `cream+12% 赤陶`只剩 **4.443**，掉出 AA。代码里命中这条的：`#nav a[aria-current="true"]`、`.lang-btn:hover` / `[aria-expanded="true"]`、`.lang-menu a:hover` / 选中项、`.hero-cta:hover` / `.btn-live:hover`、`.btn-repo:hover` / `.copy-mail:hover`——它们都是 `--terra-ink-2` 文字 + 染色底，**不是** `--terra-ink`。基态的 `a`、`.sec-index`、`.brand:hover span`、`.mail`、`.social a` 承的是没染过的 cream/paper，仍是 `--terra-ink`。
3. **任何赤陶橙文字都不许直接压在 WebGL 粒子场上。** 一颗 12% 墨色纸屑落到字下，`--terra-ink` 只剩 **3.916**、`--terra-ink-2` 也只有 **4.495**，两档都够不着 4.5。所以：压在场上的 `hero-sub`、`scroll-cue` 用 `--ink`；`.hero-cta` 自带一张不透光的 `--paper` 底把文字与画布解耦（`--terra-ink` 对 `--paper` 是 5.459）；`.scroll-cue` 干脆**不给 hover 态**——它是 `aria-hidden` 的装饰，实测点下去什么都不做，任何 hover 反馈都是假的「我可点」暗示。

这三条都由 `tests/quality.test.mjs` 从 CSS 反推核对——它扫每条"染色底 + 赤陶文字"的组合并逐个量比值，写成 `--terra-ink` 放在染色底上会直接判红。`--terra` 只出现在 `background:rgba(217,119,87,…)`、`border-color`、`.progress` 的填充、`.scroll-cue::after` 的 1px 竖线、`blockquote` 的 2px 左竖线这些地方。

焦点环同理：`:focus-visible{outline:2px solid var(--terra-ink)}`——亮 `--terra` 只有 **2.687:1**，低视力读者看不见它，所以环也用文字级的那个橙。

### 一处注释与算术不符（已修）

`assets/css/style.css` 的注释、以及 `docs/site-spec.md` 曾写 `--muted` 对 cream「5.0:1」。
实测算得 **4.652:1**——5.129 是对 `--paper` 的值，那句话是在错误的底色上量的。
仍然过 AA 的 4.5:1，所以**没有改令牌值**：`--muted` 是从纪念册母本继承的语言，为一个写错的注释去动它、
顺带改变全站观感，是拿视觉去迁就笔误。改的是注释与契约文本，并且把对比度的**唯一出处**
移进 `tests/quality.test.mjs`——今后改任何令牌，只要跌破 4.5 就直接红，不再靠人抄数。

---

## 贰 · TYPOGRAPHY 字体（代码实际做的事）

**正文是无衬线，标题与展示字才是衬线。** 这不是转述设计意图，是 CSS 第一行排版规则的字面内容：

```css
body{ font-family:var(--sans); … }                    /* style.css 第 48–49 行 */
```

纪念册母本同一处也是 `body{font-family:var(--sans)}`（母本 `assets/style.css` 第 25–26 行）。
本站没有另起一套：`--sans` 与 `--serif` 两条栈与母本逐字符相同。

`--serif` 只被点名给了这些元素（每条都在 `style.css` 里能 grep 到）：
`.hero h1`、`.motto`、`.sec-head h2`、`.work-card h3`、`.steps li::before` 的节号、`.steps li strong/b`、
`.closing`、`#beliefs blockquote p`、`.mail`、`.foot-sign`、`.brand`、`.lang-menu a`。
标签类一律回 `--sans` 并加大字距：`.eyebrow`（`font-size:14px; letter-spacing:.3em; text-transform:uppercase`）、
`#nav a`、各按钮（`font-size:15px; letter-spacing:.04em`）、`.facts dt`、`cite`、`.scroll-cue`。
`<code>` 走等宽栈 `ui-monospace,SFMono-Regular,Menlo,Consolas,"Liberation Mono",monospace`（贰 · WORKS 事实条里的 `industry/` 用它）。

衬线本体是**自托管可变字体**：`assets/fonts/noto-serif-sc/wght.css` 里 **101** 条 `@font-face`
（`grep -c '@font-face'` = 101，`grep -c 'unicode-range'` = 101，与 `find assets/fonts -name '*.woff2' | wc -l` = **101** 一致），
每条都写 `font-family:'Noto Serif SC Variable'` / `font-weight:200 900` / `font-display:swap`，
`src` 是 `format('woff2-variations')`。切片合计 **6,027,992 B**，但浏览器按 `unicode-range` 只拉正文真用到的那几片，
所以 `check-bytes.mjs` 明确把它们排除在首屏预算之外（输出末行「字体切片 101 个（按 unicode-range 惰性加载，不计入首屏预算）」）。
回退链 `Georgia → Times New Roman → Songti SC / STSong / SimSun → serif`，远端字体拿不到也只换字形不塌版面。

**斜体只给拉丁页。** 中文没有真正的斜体字面，`font-style:italic` 只会得到机器伪斜、笔画发糊，
所以 CSS 把它限定在 `html[lang^="en"] .motto{font-style:italic}`（`grep -n 'html[lang^="en"] .motto' assets/css/style.css` 定位）。
中文页 `motto` 的层次靠衬线 + `clamp(23px,3.5vw,42px)` + `line-height:1.62` 拉开。

尺度全部是流形的：`body` `clamp(15.5px,.55vw + 14px,17px)` / `line-height:1.95`，
`h1` `clamp(40px,7.4vw,86px)`，节标题 `.sec-head h1,.sec-head h2` `clamp(27px,3.6vw,44px)`，≤420px 再钉死小档
（`h1` `clamp(32px,10.5vw,44px)`、`.motto` `21px`）。`p{text-wrap:pretty}`、`h1,h2,h3{text-wrap:balance}`。

**冷加载时有一次 0.078 的 CLS，这是 `font-display: swap` 的代价，不是缺陷。**
101 个可变字体切片全部 `swap`：先用 Georgia/宋体画出来，Noto Serif SC 到位后换字——首屏那行 `clamp(40px,7.4vw,86px)` 的
`h1` 因此会重排一次。Lighthouse 移动跑的 `cumulative-layout-shift` 就是这个数（0.078 < 0.1，Google 判"良好"，
是它 57 项里唯一没拿满分的一项；桌面与热加载实测为 0 次位移）。
改成 `optional` 或给回退字加度量覆盖能把这个数压下去，但代价分别是"慢网络下这一趟干脆不用他的字体"
和"要替 101 个切片各写一份 size-adjust"——两者都比 0.078 更贵，所以**不动**。

---

## 叁 · HAIRLINE 发丝线，不是投影

分层只靠 `1px solid var(--line)`。全库审计（命令见复算记录第 9 节）：

```
grep -c 'box-shadow'  assets/css/style.css   → 0
grep -c 'gradient'    assets/css/style.css   → 0
grep -o 'border-radius:[^;}]*' … | uniq -c   → 8 处 2px  +  1 处 50%（圆形：WebGL 拿不到时 hero 的同心发丝环 `.hero[data-field="off"]::before/::after`；一处声明画两圈，头像与光标都没有圆角/圆形）
```

圆角全站只有一个值 **2px**（按钮、卡片、`<code>`、语言菜单、404 卡片），另有一处 `50%` 是**圆**（ WebGL 失败时那两圈环），不是"大圆角"。头像 `avatar.jpg` 原图直出，**不加圆框、不加外环、不加描边**。
`--bar` 64px 顶栏下沿、`.facts>div` 上边线 + 最后一项下边线、`blockquote` 上边线 + 左 2px 竖线、
`.work-card` 外框、`.social a` 的 40×40 卡框、`footer.foot` 上边线——层级全部由这些线撑出来。
hover 也不引入阴影：`.work-card:hover` 只把边框从 `#E4DFD3` 收到 `#DCD5C6`，`.shot` 边框转成
`rgba(217,119,87,.5)`。

唯一接近"氛围"的东西仍不是阴影：`#works` 背景那四条内联等高线（`stroke-width:1`、`color:var(--line)`，
其中 scene 里对应的是 10 环 × 96 段 `LineBasicMaterial`，opacity 0.42），以及拿不到 WebGL 时
`.hero[data-field="off"]::before/::after` 画的两圈同心环——**大色块的层次靠线，不靠影**。

单强调色纪律的另一面是"不许有第二种颜色"：粒子场只有墨、纸、赤陶橙三色 + `--line` 的等高线；
`::selection` 用 `background:var(--terra); color:var(--paper)`（反白是填充场景，不算文字色）。
禁止清单原样继承 `docs/site-spec.md` §1：玻璃拟态、彩色阴影、霓虹、蓝紫渐变、emoji 堆砌、默认 Three.js 打光。

---

## 肆 · SECTIONS 壹/贰/叁 节标系统

> 本节 2026-10-08 重写。旧版写的 `<h2 class="sec-title"><span class="num">…</span><span class="eyebrow">…</span><span class="zh">…</span></h2>`
> 这套 DOM **在 CSS 与两页 HTML 里一处都不存在**——`.sec-title` 与 `.num` 从来没有被**任何**样式表定义过
> （`404.html` 自带的 `<style>` 只定义了 `.nf-note` / `.nf-links` / 其中的 `.zh` `.en`，没有这两个类；
> 早先一句「只在 404 的 style 里活着」的说法是我自己写错的，已核）。
> 所以那行 `<h1 class="sec-title">` 一直是个裸 h1，只有浏览器默认字号撑着，肉眼看不出丢了样式。
> 404 页现在与首页同结构，走 `.sec-head` + `.sec-index`。
> 还声称 `check-parity.mjs` 断言 `h2.sec-title=5`——那也不成立，parity 打印的是 `h2 = 5`。
> 描述一份不存在的实现，比不写更容易误导改代码的人。

真实结构是**两行**：节标行 + 一根独立的发丝线。

```html
<div class="sec-head reveal"><span class="sec-index">壹 · ABOUT</span><h2>关于我</h2></div>
<hr class="sec-rule reveal">
```

- `.sec-index` 装的是**整串**「壹 · ABOUT」——节号与眉标不再拆成两个元素。
  衬线 700、`color:var(--terra-ink)`、`letter-spacing:.18em`、`white-space:nowrap`。
  这一串与纪念册母本同一度量，是两站看着像同一套系统的直接原因。
- `h2` 只放标题本身：衬线 900、`clamp(27px,3.6vw,44px)`。
- `.sec-head` 是 `display:flex; align-items:baseline; flex-wrap:wrap; gap:6px 18px`。
- 发丝线是**兄弟元素** `<hr class="sec-rule">`，不是 `::after`。
  它用 `@keyframes ruleIn`（`scale:0 1 → 1 1`，`1.1s .1s`）画出来；
  **静止态是"已画完"**：`html.no-js` 与 `@media (scripting:none)` 都不播放动画，线直接在那儿——
  这是这套系统的通用做法（等高线 `contourDraw` 同理：`from{stroke-dasharray:2600;stroke-dashoffset:2600}`，
  无脚本时直接显示终态）。

节数不抄在这里，当场数：`grep -c 'class="sec-head' index.html`。
`check-parity.mjs` 实际断言的是 `sec-head`、`sec-index`、`sec-rule`、`h2` 四项在两页相等且都非零，
外加一条「承重类名必须同时出现在 CSS 与两页 HTML」——把 `sec-head` 改名成 `sec-heading` 也会红。

锚点跳转不被 sticky 顶栏压住，靠 `html{scroll-padding-top:calc(var(--bar) + 24px)}`；
`--bar` 在 ≤768px 变 **104px**（顶栏折成两行）、≤420px 变 **112px**，留白跟着走。
≥1200px 才把 ABOUT 拉成"正文 1.45fr / 事实表 1fr"两栏、把 `ol.steps` 排成 2×2；
≤1024px 收导航字号并把 `.brand span` 藏掉；≤768px 让 `#nav` 独占一行、5 项 `flex:1 0 auto` 均分
（注释里写了原因：藏滚动条的窄 nav 会把末位入口彻底推出屏幕）；≤420px 把 `.social` 钉成 4 列网格（**4 + 3** 两行），
按钮 `min-height:44px`，`body` 字号回到 16px。

---

## 伍 · INTERACTIONS 交互清单（效果 / 成本 / 三档降级）

全站只有 **3** 个每帧写入者挂在同一条 rAF 链上（`grep -c 'updaters.push' assets/js/main.js` = 3：
进度条、纸屑场取能缓动、弹性跟随组——后者同时跑磁吸与卡片倾斜），滚动与 resize 事件只调 `schedule()`，
一个帧里跑完所有写入——**没有第二个循环**。

| 效果 | 实现 | 实测成本 | `prefers-reduced-motion` | 无 WebGL | 无 JS |
|---|---|---|---|---|---|
| 纸屑粒子场 | `scene.js`：`Points` + `ShaderMaterial`（顶点算漂移与闪烁，片元用 `gl_PointCoord` 现算软圆盘，无贴图） | 字节不抄在这里——`node scripts/check-bytes.mjs` 现量（自有 JS 与 Three.js vendor 分两档预算） | `initField` 在减弱动效下只 `render()` **一帧**，永不启动 RAF | `getContext("webgl2")` 探不到就 `throw new Error("no-webgl")`，`main.js` 在 `.hero` 上写 `data-field="off"` → 画布撤出布局，只留两圈同心发丝环 | `bootField` 是动态 `import`，脚本被拦时 canvas 空白、hero 照常排版 |
| 粒子性能护栏 | 上限 **1200 / 700 / 400** 三档（`(pointer:coarse)` 或宽 <768 → 400；<1200 → 700；其余 1200），下限 `Math.max(64,…)`；DPR 钉 **1.75**；`camera.position.z` 由 `6.6 + progress × 1.9` 推进；指针视差最大 **0.35** 世界单位，仅 `(hover:hover) and (pointer:fine)` | 单向降级：跳过热身 10 帧后取 **60 帧均值**，> **22 ms** 就 `setDrawRange(0, count >> 1)` 且只减一次 | 同上一行：不动 | — | resize 合并 **120 ms** 后才 `setSize`，绝不逐帧重建 |
| hero 出视口即停 | `IntersectionObserver` 观察 hero + `visibilitychange` | 零额外字节 | `sync()` 直接返回，不启动 | 不相关 | 观察器不存在时 `io=null` 静默跳过 |
| 等高线（贰 节背景） | HTML 内联 4 条 `<path>` + `.is-in` 触发 `contourDraw 2.6s`；scene 侧另有 10 环 × 96 段 `LineSegments`，`rotation.z += dt × 0.0055`（≈19 分钟一圈） | 内联 SVG 记在页面自己的字节里（不抄数：`wc -c index.html` 与 `node -e "console.log(require('zlib').gzipSync(require('fs').readFileSync('index.html')).length)"` 现量；README 的实测表由 `node scripts/refresh-readme-numbers.mjs` 同步） | 动画关掉，`stroke-dasharray:none` 直接显示完整线 | 只剩 HTML 那 4 条，静态可读 | 静止态即终态 |
| 逐节揭示 | `IntersectionObserver`（`threshold:.12`、`rootMargin:'0px 0px -4% 0px'`）加 `.is-in`；CSS `--dur:.52s`（**520 ms**）、`--lift:14px`、错峰 `min(同级序号, 8) × 60ms` | 每元素 1 次 class 写；无逐帧成本 | `RM` 时一次给所有 `.reveal` 加 `.is-in`，等于直接呈现 | 不受影响 | `.reveal{opacity:0}` 由 `html.no-js .reveal{opacity:1}` 与 `@media (scripting:none){.reveal{opacity:1}}` 两条兜底改回可见，内容不缺字 |
| 滚动进度条 | `.progress`（`height:2px`、`background:var(--terra)`）宽度每帧由 `window.scrollY / (scrollHeight - innerHeight)` 写百分比，先读后写 | 每帧 1 次 style 写 | `transition` 无，跟手；`scroll-behavior` 变 `auto` | 不相关 | CSS 里 `html.no-js .progress{display:none}` |
| 当前节高亮 | scrollspy：`IntersectionObserver` `rootMargin:'-45% 0px -50% 0px'`，命中项写 `aria-current="true"`，CSS 用 `--terra-ink-2` + `rgba(217,119,87,.13)` 染底（染色底必须降到 ink-2，见「壹」那条纪律） | 观察 5 个 section | 与动效无关，照常工作 | 不相关 | 无 JS 时导航仍是 5 个可点锚点 |
| 作品卡 3D 倾斜 | 只在 `FINE && !COARSE && !RM` 绑定：`nx,ny ∈ [-.5,.5]`，`×10` → **±5 deg**；插值系数 0.2，`|d| ≤ 0.05` 即归零并停帧 | 每卡 2 个 transform 分量，最多 2 张卡 | 不绑定（`CSS` 里 `.work-card{transform:none}` 兜住） | 不相关 | `.work-card` 静止态无 transform |
| 磁吸按钮 | `if (HOVER && !RM)` 遍历 `[data-magnetic]`（两页各 **6** 处：hero CTA、两张卡的 live/repo、复制邮箱），位移上限 **6 px**，写的是 `--mx/--my`（px）交给 CSS 的独立 `translate` 属性 | 0 字节增量 | 不绑定 | — | 不生效 |
| 语言菜单 | 复刻母本 AMD 式样：地球图标 + 当前语言名 + chevron，`listbox/option` 语义，`Esc` 关闭并焦点归位，`↑↓ Home End Enter Tab` 全可达，选中项 `--terra-ink-2`（染了赤陶底）+ `✓`；`localStorage` 键 `intro-lang` **只提示不代跳** | 无额外请求（两份 HTML 各自带完整菜单） | `.lang-menu` 的 `langIn .18s` 入场动画关掉 | 不相关 | `html.no-js` 把 `.lang-btn` 隐藏、`.lang-menu` 摊平成两个 `<a>`（另有 `<noscript>` 兜底样式），两页互链始终可点 |
| 复制邮箱 | `navigator.clipboard.writeText` → 失败退回隐藏 `<textarea>` + `execCommand`；回显写进 `aria-live="polite"` 的 `.copy-status`，**1800 ms** 后清空；再失败提示"已选中，按 Ctrl+C" | 无 | 不相关 | 不相关 | 按钮无 JS 不出现，但 `<a href="mailto:">` 一直是明文地址 |
| 锚点平滑滚动 | 事件委托，`behavior: RM ? 'auto' : 'smooth'`，含 `#top` 回顶；跳转后给目标补 `tabindex="-1"` 并 `focus({preventScroll:true})` | 零字节 | 直接跳（`auto`） | 不相关 | 浏览器原生锚点跳转仍然工作 |

### 降级是三档的，不是"有动画/没动画"两档

1. **减弱动效**：RAF 不启动、粒子静止成一张图、揭示与等高线直接给终态、`scroll-behavior:auto`。
   CSS 侧用一条 `@media (prefers-reduced-motion:reduce)` 把 `*` 的 `animation-duration` /
   `transition-duration` 压到 `.001ms` 并 `iteration-count:1`，再逐条点名把 `.reveal`、
   `.scroll-cue::after`、`.work-card`、`.mail::after` 拉回静止终态。
2. **拿不到 WebGL**：`scene.js` 抛 `no-webgl`，`main.js` 兜住并把 hero 退化为两圈发丝环——**粒子是装饰，不是内容**。
3. **关掉 JavaScript**：`html.no-js`（`main.js` 开头第一句 `root.classList.replace('no-js', 'js')` 才换掉）+ `<noscript>` 样式 + `@media (scripting:none)`
   三重兜底：全部内容可读、5 个锚点可点、语言菜单摊平成两个链接、进度条干脆不出现。

### 一处必须写下来的事实：减弱动效**不省字节**

`bootField()` 是无条件调用的动态 `import`，所以即使用户开了"减弱动态效果"，Three.js 那两个文件
（gzip **180,633 B**）仍会被拉下来，只是只画一帧。当前它只在渲染层降级，没在网络层降级。
要真正做到"减弱动效就不下载 3D"，得在 `import('./scene.js')` 之前用 `RM` 短路——**这条改动还没做**。
<!-- 待核对：是否要做（取舍是"给减弱动效读者省 180 KB"还是"保持 DOM 与状态单一"），需站长拍板 -->

### 代码里几处"写了两遍"的不一致（照实记，不掩盖）

| 现象 | 证据 | 现在实际生效的是哪一个 |
|---|---|---|
| 磁吸：一处写、一处读，已收敛成一条路径 | `main.js` 遍历 `[data-magnetic]`（两页各 **6** 处），`setProperty('--mx'/'--my', … + 'px')`；CSS `.hero-cta,.btn-live,.btn-repo,.copy-mail{translate:var(--mx,0px) var(--my,0px)}` 消费它。旧版 JS 覆盖 `style.transform=translate3d(…)`、CSS 读 `translate:var(--mx)`，两套各写各的 | **JS 写 `--mx/--my`、CSS 读 `translate`**——同一通道，位移按 px 生效（唯 `.hero-cta` 被 `animation:rise … both` 的 `translate:none` 终态钉住，`style.css` 注释记此条待办） |
| 卡片倾斜：两套写法已合并为一套 | 旧版 CSS `.work-card{transform:perspective(1200px) rotateX(var(--rx))…}` + `#works{perspective:1200px}`，而 JS 直接覆盖 `style.transform` 并自带 `perspective(720px)`，三份透视互相打架 | **只剩 CSS 一条**：`.work-card{transform:perspective(1200px) rotateX(var(--rx,0deg)) rotateY(var(--ry,0deg))}`，`main.js` 只写 `--rx/--ry`（deg），`#works` 不再设 perspective；±5 deg |
| `.progress` 静止值写在变量里 | CSS `width:var(--p,0)`，JS 直接改 `progress.style.width` | 生效的是 JS 直写；`--p` 通道闲置 |
| 几个为骨架预留的选择器还没有宿主 | `.hero-body`、`.works-stack`、`.sec-lede`、`.contact-line`、`.sr-only` 在 CSS 里各 1–2 处，两页 HTML 里 **0** 次 | 间距目前由 `.work-card+.work-card{margin-top}`、`.work-card>*+*{margin-top}` 这类兜底规则撑起（这是刻意的：注释说"任何一层没被显式 margin 覆盖的都靠这条撑开"） |

这些不影响读者看到的东西，但**改样式的人必须先知道**，否则会把"两套写法"当一套来调。

---

## 陆 · 双语与 SEO 的视觉后果

- 两页的字节数不抄在这里（README 的实测表是唯一定点，由 `node scripts/refresh-readme-numbers.mjs` 刷新、`tests/quality.test.mjs` 核对）；
  `check-parity.mjs` 断言两页的结构数量与若干组集合相等——它每打一行 `✓` 是一项，项数随断言增减，不在文档里记死数。
  互链（`./en/` 与 `../`）按设计就不同，所以比较一律取 basename。
- 版本串：每一个被 HTML 直接取用的资源引用都带 `?v=`，且全站只有同一个值（它是 `git rev-parse --short=6 HEAD` 的 **6 位**十六进制，
  跟着 HEAD 走，`deploy.sh` 每次部署重算，所以别在文档里写死具体值）。
  钉这件事的是 `tests/quality.test.mjs`「每个被 HTML 直接取用的资源都带 ?v=」与 `check-parity.mjs` 的集合比较两处。
  nginx 的长缓存是按**扩展名**命中的、跟查询串无关，所以 `?v=` 是唯一的换版本手段：内容变了不换串，
  浏览器与 CDN 就继续端旧字节（实测：不带 `?v=` 的 `/assets/css/style.css` 至今仍回旧副本）。
- 顶栏是双语共用的预算：英文页品牌行写 `Xiong Xinchen`，语言按钮在 ≤420px 收成只剩地球图标（母本站同一手法），
  `.brand` 不再按中文胶囊的宽度做 `calc()` 预算——之前那么写时，英文页实测 213.8px 会把语言菜单挤出 390px 边界，
  且定高让品牌名被裁到视口上方。现在是 `min-height` + 允许换行。
- `html[lang^="en"] .motto{font-style:italic}` 是唯一按语言分叉的视觉（原因见「贰」）。

## 柒 · 支持矩阵与红线

- 面向现代常青浏览器（Chrome / Edge / Firefox / Safari 近两年版本），**明确不支持 IE 与 Legacy Edge，全站无 polyfill**；
  `min-height:min(calc(100svh - var(--bar)),880px)` 外面还包了一条 `@supports not (min-height:100svh)` 兜底。
- 正文对比度实测 **14.328:1**（ink / cream），远高于 7:1 的红线；辅助文字下限字号 14px 与 `--muted` 绑在一起。
- 缓存与安全头以 `deploy/nginx.conf.example` 为准：**HTML 一律 `no-cache`**（`/index.html`、`/en/index.html`、
  `/404.html`、`/nc15/` 与其 `robots.txt`/`sitemap.xml`），**按扩展名匹配的静态资源 `public, max-age=31536000, immutable`**
  （含 `woff2/ttf/otf/mp4`），`X-Content-Type-Options: nosniff`、`Referrer-Policy`、`Permissions-Policy` 与一份 CSP 在每个声明了 add_header 的
  location 里重抄一遍——nginx 的 `add_header` 不会被子 location 继承，漏抄就等于子层丢头。
  示例配置**已声明一条 CSP**（`default-src 'self'; script-src 'self'; …`，`frame-ancestors 'none'` 顶掉了 `X-Frame-Options` 的活）；
  但线上此刻**还没有下发这条 CSP**（公网只回 `Referrer-Policy`）——照「五」把示例整份挂上去时才会生效。
  **一条要拍板的冲突**：这条 CSP 的 `script-src 'self'` 会**挡住 Cloudflare 注入的 `static.cloudflareinsights.com/beacon.min.js`**（跨源，非 `'self'`），
  同源的 `email-decode.min.js` 则不受影响。启用 CSP 前若还开着 Cloudflare Web Analytics，取数脚本会被拦掉——这属于生产配置，交给站长定，不在文档里擅改 CSP 值。
  `/assets/fonts/` 不再有独立的 1 年规则，它由扩展名正则统一覆盖。
- 想新增效果之前先量字节：`node scripts/check-bytes.mjs` 的逐类预算行就是闸门本身。2026-10-07 09:53 全绿，
  但 09:35 那次图片行是红的——**闸门随构建变动，别把一次绿当成永久的**。
