# 设计语言记录 · xxc2007.me 个人介绍站

> 这份文件回答两个问题：**为什么长这样**，以及**代码实际做到了什么**。
> 前者抄不走（它是取舍），后者必须每次改完重新核。凡本文写的比值、字节、毫秒、粒子数，
> 都来自实际跑过的命令，复算式记在仓库外的 `readme-numbers.md`（同目录 `raw.txt` 是原始输出）。

核对时刻：**2026-10-07 09:35–09:40（+0800）**，`main` 分支，`git ls-files | wc -l` = **138**。
站点仍在构建：`assets/images/` 与 `assets/js/` 在这几分钟里被改写过数次，所以**字节类数字都是那一刻的快照**，
唯一还没过的闸门是图片预算（`node scripts/check-bytes.mjs` 里「头像 + 两张作品截图」92.1 KB / 87.9 KB → `BUDGET FAILED`）。

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

结论只有一句：**赤陶橙要做文字，就必须是 `#A8492A`。** 亮两档的 `--terra` 与 `--terra-deep` 都够不着
4.5:1，所以它们的权限被写死成"填充、描边、装饰"。代码里这条纪律是看得见的：
`.hero-cta`、`.btn-live`、`.lang-btn`、`#nav a.active`、`.sec-title .num`、`a`、`:focus-visible`
全部用 `color:var(--terra-ink)`，而 `--terra` 只出现在 `background:rgba(217,119,87,.07–.14)`、
`border-color`、`.progress` 的填充、`.scroll-cue::after` 的 1px 竖线、`blockquote` 的 2px 左竖线这些地方。

焦点环同理：`::focus-visible{outline:2px solid var(--terra-ink)}`——注释里写得很直白，
亮 `--terra` 只有 **2.687:1**，低视力读者看不见它，所以环也用文字级的那个橙。

### 已知一处注释与算术不符

`assets/css/style.css` 第 85–86 行的注释、以及 `docs/site-spec.md` 都写 `--muted` 对 cream「5.0:1」。
实测算得 **4.652:1**——仍然过 AA 的 4.5:1，但比注释低。所以代码里"`--muted` 只用于 ≥14px 辅助文字"
这条限制比它自己声称的理由更必要，而不是更宽松。<!-- 待核对：改注释为 4.65:1，还是把 --muted 调深到真的 5:1？需站长定，两者都会改视觉 -->

---

## 贰 · TYPOGRAPHY 字体（代码实际做的事）

**正文是无衬线，标题与展示字才是衬线。** 这不是转述设计意图，是 CSS 第一行排版规则的字面内容：

```css
body{ font-family:var(--sans); … }                    /* style.css 第 48–49 行 */
```

纪念册母本同一处也是 `body{font-family:var(--sans)}`（母本 `assets/style.css` 第 25–26 行）。
本站没有另起一套：`--sans` 与 `--serif` 两条栈与母本逐字符相同。

`--serif` 只被点名给了这些元素（每条都在 `style.css` 里能 grep 到）：
`.hero h1`、`.motto`、`.sec-title .zh`、`.work-card h3`、`.steps li::before` 的节号、`.steps li strong/b`、
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
所以 CSS 把它限定在 `html[lang^="en"] .motto{font-style:italic}`（第 98 行）。
中文页 `motto` 的层次靠衬线 + `clamp(23px,3.5vw,42px)` + `line-height:1.62` 拉开。

尺度全部是流形的：`body` `clamp(15.5px,.55vw + 14px,17px)` / `line-height:1.95`，
`h1` `clamp(40px,7.4vw,86px)`，`.sec-title .zh` `clamp(27px,3.6vw,44px)`，≤420px 再钉死小档
（`h1` `clamp(32px,10.5vw,44px)`、`.motto` `21px`）。`p{text-wrap:pretty}`、`h1,h2,h3{text-wrap:balance}`。

---

## 叁 · HAIRLINE 发丝线，不是投影

分层只靠 `1px solid var(--line)`。全库审计（命令见复算记录第 9 节）：

```
grep -c 'box-shadow'  assets/css/style.css   → 0
grep -c 'gradient'    assets/css/style.css   → 0
grep -o 'border-radius:[^;}]*' … | uniq -c   → 8 处 2px  +  2 处 50%（圆形：头像框与光标墨点）
```

圆角全站只有一个值 **2px**（按钮、卡片、`<code>`、语言菜单、404 卡片），另外两处 `50%` 是圆的，不是"大圆角"。
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

DOM 结构三件套，中英两页同一形状，只有节号字符不同：

```html
<h2 class="sec-title reveal">
  <span class="num">壹</span><span class="eyebrow">ABOUT</span><span class="zh">关于我</span>
</h2>
```

中文页是 `壹 贰 叁 肆 伍`，英文页是 `I II III IV V`（`grep -o '<span class="num">…'` 各 **5** 个，
`check-parity.mjs` 断言 `h2.sec-title=5`、`section=6` 两页相等）。
`.num` 是衬线 700、`color:var(--terra-ink)`、`letter-spacing:.2em`；`.eyebrow` 是无衬线大写 `letter-spacing:.34em`；
`.zh` 是衬线 900 大字。三条排成一行、`align-items:baseline`、允许 `flex-wrap`。

每条 `.sec-title::after` 是一根 `flex:1 1 90px; height:1px; background:var(--line)` 的发丝线，
`.is-in` 时用 `@keyframes ruleIn`（`scaleX(0) → 1`，`1.1s .1s`）画出来。
**静止态是"已画完"**：`html.no-js` 与 `@media (scripting:none)` 都不播放动画，线直接在那儿——
这是这套系统的通用做法（等高线 `contourDraw` 同理：`from{stroke-dasharray:2600;stroke-dashoffset:2600}`，
无脚本时直接显示终态）。

锚点跳转不被 sticky 顶栏压住，靠 `html{scroll-padding-top:calc(var(--bar) + 24px)}`；
`--bar` 在 ≤768px 变 **104px**（顶栏折成两行）、≤420px 变 **112px**，留白跟着走。
≥1200px 才把 ABOUT 拉成"正文 1.45fr / 事实表 1fr"两栏、把 `ol.steps` 排成 2×2；
≤1024px 收导航字号并把 `.brand span` 藏掉；≤768px 让 `#nav` 独占一行、5 项 `flex:1 0 auto` 均分
（注释里写了原因：藏滚动条的窄 nav 会把末位入口彻底推出屏幕）；≤420px 把 `.social` 钉成 4 列网格（**4 + 3** 两行），
按钮 `min-height:44px`，`body` 字号回到 16px。

---

## 伍 · INTERACTIONS 交互清单（效果 / 成本 / 三档降级）

全站只有 **4** 个每帧写入者挂在同一条 rAF 链上（`grep -c 'updaters.push' assets/js/main.js` = 4：
进度条、弹性跟随组、音量斜坡、光标墨点），滚动与 resize 事件只调 `schedule()`，
一个帧里跑完所有写入——**没有第二个循环**。

| 效果 | 实现 | 实测成本 | `prefers-reduced-motion` | 无 WebGL | 无 JS |
|---|---|---|---|---|---|
| 纸屑粒子场 | `scene.js`：`Points` + `ShaderMaterial`（顶点算漂移与闪烁，片元用 `gl_PointCoord` 现算软圆盘，无贴图） | 文件 raw **13,884 B** / gzip **5,990 B**；外加 `three.module.min.js` gzip **79,328 B** + `three.core.min.js` gzip **101,305 B**（vendor 合计 gzip **180,633 B**） | `initField` 只 `render()` **一帧**，永不启动 RAF（`scene.js` 第 311 行） | `getContext("webgl2")` 探不到就 `throw new Error("no-webgl")`，`main.js` 在 `.hero` 上写 `data-field="off"` → 画布撤出布局，只留两圈同心发丝环 | `bootField` 是动态 `import`，脚本被拦时 canvas 空白、hero 照常排版 |
| 粒子性能护栏 | 上限 **1200 / 700 / 400** 三档（`(pointer:coarse)` 或宽 <768 → 400；<1200 → 700；其余 1200），下限 `Math.max(64,…)`；DPR 钉 **1.75**；`camera.position.z` 由 `6.6 + progress × 1.9` 推进；指针视差最大 **0.35** 世界单位，仅 `(hover:hover) and (pointer:fine)` | 单向降级：跳过热身 10 帧后取 **60 帧均值**，> **22 ms** 就 `setDrawRange(0, count >> 1)` 且只减一次 | 同上一行：不动 | — | resize 合并 **120 ms** 后才 `setSize`，绝不逐帧重建 |
| hero 出视口即停 | `IntersectionObserver` 观察 hero + `visibilitychange` | 零额外字节 | `sync()` 直接返回，不启动 | 不相关 | 观察器不存在时 `io=null` 静默跳过 |
| 等高线（贰 节背景） | HTML 内联 4 条 `<path>` + `.is-in` 触发 `contourDraw 2.6s`；scene 侧另有 10 环 × 96 段 `LineSegments`，`rotation.z += dt × 0.0055`（≈19 分钟一圈） | 内联 SVG 在 HTML 里（页面 gzip 合计 19.6 KB 之内） | 动画关掉，`stroke-dasharray:none` 直接显示完整线 | 只剩 HTML 那 4 条，静态可读 | 静止态即终态 |
| 逐节揭示 | `IntersectionObserver`（`threshold:.12`、`rootMargin:'0px 0px -4% 0px'`）加 `.is-in`；CSS `--dur:.52s`（**520 ms**）、`--lift:14px`、错峰 `min(同级序号, 8) × 60ms` | 每元素 1 次 class 写；无逐帧成本 | `RM` 时一次给所有 `.reveal` 加 `.is-in`，等于直接呈现 | 不受影响 | `.reveal{opacity:0}` 由 `html.no-js` 与 `@media (scripting:none)` 两条兜底改回可见（第 548、556 行），内容不缺字 |
| 滚动进度条 | `.progress`（`height:2px`、`background:var(--terra)`）宽度每帧由 `window.scrollY / (scrollHeight - innerHeight)` 写百分比，先读后写 | 每帧 1 次 style 写 | `transition` 无，跟手；`scroll-behavior` 变 `auto` | 不相关 | CSS 里 `html.no-js .progress{display:none}` |
| 当前节高亮 | scrollspy：`IntersectionObserver` `rootMargin:'-45% 0px -50% 0px'`，命中项写 `aria-current="true"`，CSS 用 `--terra-ink` + `rgba(217,119,87,.13)` 底 | 观察 5 个 section | 与动效无关，照常工作 | 不相关 | 无 JS 时导航仍是 5 个可点锚点 |
| 作品卡 3D 倾斜 | 只在 `FINE && !COARSE && !RM` 绑定：`nx,ny ∈ [-.5,.5]`，`×10` → **±5 deg**；插值系数 0.2，`|d| ≤ 0.05` 即归零并停帧 | 每卡 2 个 transform 分量，最多 2 张卡 | 不绑定（`CSS` 里 `.work-card{transform:none}` 兜住） | 不相关 | `.work-card` 静止态无 transform |
| 磁吸按钮 | `if (HOVER && !RM)` 遍历 `[data-magnetic]`，位移上限 **6 px**，写 `translate3d` | 0 字节增量 | 不绑定 | — | 不生效 |
| 语言菜单 | 复刻母本 AMD 式样：地球图标 + 当前语言名 + chevron，`listbox/option` 语义，`Esc` 关闭并焦点归位，`↑↓ Home End Enter Tab` 全可达，选中项 `--terra-ink` + `✓`；`localStorage` 键 `intro-lang` **只提示不代跳** | 无额外请求（两份 HTML 各自带完整菜单） | `.lang-menu` 的 `langIn .18s` 入场动画关掉 | 不相关 | `html.no-js` 把 `.lang-btn` 隐藏、`.lang-menu` 摊平成两个 `<a>`（另有 `<noscript>` 兜底样式），两页互链始终可点 |
| 环境音 | 自托管 12.000 s 无缝循环（`ambient.m4a` **96,326 B** / `ambient.ogg` **98,127 B**），`LEVEL = .5`，WebAudio `GainNode` 淡入 **1.2 s** / 淡出 **0.6 s** 后 `pause()`；m4a 不支持就换 ogg；两条都失败就 `btn.hidden = true` | 默认 **0 B**（`preload:'none'`，首次点击才建元素） | 与动效偏好无关（它是声音，不是动效），但 `aria-pressed` 默认 `false`，绝不自动播放 | 不相关 | 按钮不出现（CSS `html.no-js .sound{display:none}`） |
| 复制邮箱 | `navigator.clipboard.writeText` → 失败退回隐藏 `<textarea>` + `execCommand`；回显写进 `aria-live="polite"` 的 `.copy-status`，**1800 ms** 后清空；再失败提示"已选中，按 Ctrl+C" | 无 | 不相关 | 不相关 | 按钮无 JS 不出现，但 `<a href="mailto:">` 一直是明文地址 |
| 桌面光标墨点 | 仅 `FINE && !RM`；`8px` 圆点，`opacity .85`，命中热区 `scale(2.6)`，插值 0.22/0.18 | 运行时插入 1 个 `div`，`aria-hidden` | 不注入 | — | 不注入 |
| 锚点平滑滚动 | 事件委托，`behavior: RM ? 'auto' : 'smooth'`，含 `#top` 回顶；跳转后给目标补 `tabindex="-1"` 并 `focus({preventScroll:true})` | 零字节 | 直接跳（`auto`） | 不相关 | 浏览器原生锚点跳转仍然工作 |
| 横向溢出哨兵 | `root.dataset.overflow = '1'` 当 `scrollWidth > innerWidth + 1`；在 resize / load / `document.fonts.ready` 三处测 | 3 次事件绑定 | 不相关 | 不相关 | 不跑，但布局本身不依赖它 |

### 降级是三档的，不是"有动画/没动画"两档

1. **减弱动效**：RAF 不启动、粒子静止成一张图、揭示与等高线直接给终态、`scroll-behavior:auto`。
   CSS 侧用一条 `@media (prefers-reduced-motion:reduce)` 把 `*` 的 `animation-duration` /
   `transition-duration` 压到 `.001ms` 并 `iteration-count:1`，再逐条点名把 `.reveal`、
   `.scroll-cue::after`、`.work-card`、`.mail::after` 拉回静止终态。
2. **拿不到 WebGL**：`scene.js` 抛 `no-webgl`，`main.js` 兜住并把 hero 退化为两圈发丝环——**粒子是装饰，不是内容**。
3. **关掉 JavaScript**：`html.no-js`（`main.js` 第 5 行才换成 `js`）+ `<noscript>` 样式 + `@media (scripting:none)`
   三重兜底：全部内容可读、5 个锚点可点、语言菜单摊平成两个链接、声音按钮与进度条干脆不出现。

### 一处必须写下来的事实：减弱动效**不省字节**

`bootField()` 是无条件调用的动态 `import`，所以即使用户开了"减弱动态效果"，Three.js 那两个文件
（gzip **180,633 B**）仍会被拉下来，只是只画一帧。当前它只在渲染层降级，没在网络层降级。
要真正做到"减弱动效就不下载 3D"，得在 `import('./scene.js')` 之前用 `RM` 短路——**这条改动还没做**。
<!-- 待核对：是否要做（取舍是"给减弱动效读者省 180 KB"还是"保持 DOM 与状态单一"），需站长拍板 -->

### 代码里几处"写了两遍"的不一致（照实记，不掩盖）

| 现象 | 证据 | 现在实际生效的是哪一个 |
|---|---|---|
| 磁吸挂着但不跑 | `main.js` 只遍历 `[data-magnetic]`，而 `grep -c 'data-magnetic' index.html en/index.html` 两页都是 **0**；且 JS 写的是 `style.transform = translate3d(…)`，CSS 读的是 `translate:var(--mx,0px) var(--my,0px)` | **都不生效**：按钮位移实际是 0 px |
| 卡片倾斜有两套写法 | CSS `.work-card{transform:perspective(1200px) rotateX(var(--rx,0deg)) …}` + `#works{perspective:1200px}`；JS 却写 inline `perspective(720px) rotateX(…deg)` | **inline 那份生效**（后写者胜），±5 deg 的幅度是两份一致的 |
| `.work-card` 上的 `--mx/--my` 是百分比 | JS 写 `((nx+.5)*100).toFixed(1)+'%'`，而 CSS 只在按钮组上把 `--mx/--my` 当 **px** 位移读 | 卡片那两个变量当前没有被任何规则消费（注释说"发丝高光跟随"，实现尚未接上） |
| `.progress` 静止值写在变量里 | CSS `width:var(--p,0)`，JS 直接改 `progress.style.width` | 生效的是 JS 直写；`--p` 通道闲置 |
| 几个为骨架预留的选择器还没有宿主 | `.hero-body`、`.works-stack`、`.sec-lede`、`.contact-line`、`.sr-only` 在 CSS 里各 1–2 处，两页 HTML 里 **0** 次 | 间距目前由 `.work-card+.work-card{margin-top}`、`.work-card>*+*{margin-top}` 这类兜底规则撑起（这是刻意的：注释说"任何一层没被显式 margin 覆盖的都靠这条撑开"） |

这些不影响读者看到的东西，但**改样式的人必须先知道**，否则会把"两套写法"当一套来调。

---

## 陆 · 双语与 SEO 的视觉后果

- 两页各 **19.6 KB**（`20,083` / `20,107` B 那一刻的快照，复算记录里有命令），`check-parity.mjs` 断言 **10** 项结构数量与 **5** 组集合两页相等；
  互链（`./en/` 与 `../`）按设计就不同，所以比较一律取 basename。
- 版本串：四个资源引用 `?v=` 必须是同一个 4 位十六进制值（当前 `a1b2`），`check-parity.mjs` 用
  `new Set(grab(h, /\?v=([0-9a-z]+)"/g)).size === 1` 钉死——nginx 那边 30 天/1 年长缓存的合法性全靠这个指纹。
- 顶栏高度是双语共用的预算：英文页品牌行要写 `Xiong Xinchen`，≤420px 时 `.brand` 被限成
  `max-width:calc(100% - 196px)`，两枚 pill 的宽度是算过的，所以英文页不会把语言菜单挤出 390px 边界。
- `html[lang^="en"] .motto{font-style:italic}` 是唯一按语言分叉的视觉（原因见「贰」）。

## 柒 · 支持矩阵与红线

- 面向现代常青浏览器（Chrome / Edge / Firefox / Safari 近两年版本），**明确不支持 IE 与 Legacy Edge，全站无 polyfill**；
  `min-height:min(calc(100svh - var(--bar)),880px)` 外面还包了一条 `@supports not (min-height:100svh)` 兜底。
- 正文对比度实测 **14.328:1**（ink / cream），远高于 7:1 的红线；辅助文字下限字号 14px 与 `--muted` 绑在一起。
- 缓存与安全头由 nginx 提供（`X-Content-Type-Options` / `Referrer-Policy` / `X-Frame-Options`、HTML `no-cache`、
  带 `?v=` 的资源 30 天、`/assets/fonts/` 一年），见 `deploy/nginx.conf.example`。
- 想新增效果之前先量字节：`node scripts/check-bytes.mjs` 的七行预算就是闸门本身，它现在**是红的**（图片行）。
