# 图片溯源 · `assets/images` 每一个文件的来历

核对日期：**2026-10-07**。下面每一个尺寸与字节数都是今天在这台机器上重新量出来的，
命令一并写在各节里，任何人都能重跑一遍对上号。

> **这份文件为什么在 `docs/` 而不是 `assets/`。** 它的前身是 `assets/images/README.md`（2026-10-07 已删）。
> `scripts/deploy.sh` 里的归档清单是
> `git archive --format=tar HEAD index.html en 404.html robots.txt sitemap.xml assets`——
> `assets` 是整目录打包的，所以放在 `assets/` 里的任何 `.md` 都会变成一个公网 URL。
> 这条清单**不含 `docs`**，本文件因此不进部署包。
> 往后规矩照此：**仓库内部文档一律写在 `docs/`，不要写进 `assets/`。**
>
> 本文件里出现的本机路径和工具版本，是重跑命令要用的，不是页面内容，也不含任何主机地址或登录凭据。

---

## 一 · 一览（现存 12 个文件，全部实测）

| 文件 | 实测尺寸 | 实测字节 | 怎么来的 | 用在哪 |
| --- | --- | --- | --- | --- |
| `avatar.jpg` | 300×300 | 26,762 | 站长本人提供的原图，逐字节搬进来，没重编码、没裁切、没做圆形遮罩（见「三」） | index.html、en/index.html 首屏头像 |
| `favicon.ico` | 32×32（内嵌 PNG） | 1,336 | 由 `tools/make-favicon.mjs` 把 `favicon-32.png` 原样装进合法 ICO 容器（不重新编码像素）；**是真正的 ICO 容器、内嵌一张 32×32 PNG**（见「四」） | index.html、en/index.html（`type="image/x-icon"`，带 `?v=`） |
| `favicon-32.png` | 32×32 | 1,314 | 由 `avatar.jpg` 缩放 32×32，ffmpeg 封装 PNG | index.html、en/index.html |
| `apple-touch-icon.png` | 180×180 | 17,524 | 由 `avatar.jpg` 缩放 180×180，ffmpeg 封装 PNG | index.html、en/index.html |
| `shot-nc15.webp` | 1200×750 | 28,624 | 线上站点实拍 → 裁成 1200×750 → `ffmpeg -c:v libwebp -quality 72`（**逐字节复现成功**，见「六」） | index.html、en/index.html 作品卡一 |
| `shot-geohot.webp` | **1000×626** | 32,500 | 同一趟实拍的 GEOHOT 那张，母图 1200×750，交付时缩到 1000×626 再编 WebP；**编码参数没能复现** | index.html、en/index.html 作品卡二 |
| `og-card.svg` | 1200×630（viewBox `0 0 1200 630`） | 1,663 | 手写 SVG，没有任何外链资源 | 不被任何页面引用，是 `og-card.png` 的母文件 |
| `og-card.png` | 1200×630 | 74,866 | `og-card.svg` 在 Chrome 里 1:1 栅格化，再经 ffmpeg 封装（**逐字节复现成功**，见「五」） | `og:image`：index.html、en/index.html |
| `banner.svg` | 1200×400（viewBox `0 0 1200 400`） | 1,803 | 手写 SVG，同上 | **不被任何 HTML 引用**，仓库横幅素材 |
| `readme-hero-desktop.png` | 2880×1800 | 321,551 | 本地预览实拍（1440×900 @2），Chrome 154 headless 走 CDP `Page.captureScreenshot` | `README.md:59` |
| `readme-works-desktop.png` | 2880×1800 | 434,385 | 同上，滚到 `#works` | `README.md:66` |
| `readme-hero-mobile.png` | 1170×2532 | 243,352 | 本地预览移动仿真实拍（390×844 @3） | `README.md:73` |

`404.html` 不引用任何图片。

## 二 · 总量

| 口径 | 字节 | 说明 |
| --- | --- | --- |
| 目录合计（删掉旧 README 之后） | 1,185,239 | 删之前 1,191,999（旧 `assets/images/README.md` 占 6,760） |
| `check-bytes.mjs`「头像 + 两张作品截图」 | 以脚本输出为准 | `avatar.jpg` + `shot-nc15.webp` + `shot-geohot.webp`（上限 90,000）；具体占用跑 `node scripts/check-bytes.mjs`，别在此抄数 |
| `check-bytes.mjs`「不进首屏的分享素材」 | 以脚本输出为准 | `og-card.png` + `og-card.svg` + `banner.svg` + `favicon-32.png` + `favicon.ico`（上限 200,000，`favicon.ico` 现是 32×32 ICO）；同上，占用看脚本 |
| **两条预算都没盖到的** | 1,016,812 | 三张 README 配图 999,288 + `apple-touch-icon.png` 17,524。今天确实占了目录体积的 86%，但 `check-bytes.mjs` 的两条正则都匹配不到它们 |

复算：`wc -c assets/images/*`；预算口径看 `node scripts/check-bytes.mjs`（2026-10-07 跑通，`BUDGET OK`）。

## 三 · `avatar.jpg`：站长原图，逐字节相同

- 尺寸 300×300，26,762 字节。
- **与站长提供的那张原图是同一份字节**：他给的是 `%USERPROFILE%/Desktop/头像.jpg`（26,762 B）。
  我没有把它复制进仓库，只做了只读比对：
  ```bash
  cmp assets/images/avatar.jpg "$USERPROFILE/Desktop/头像.jpg"          # 无输出＝逐字节相同
  git hash-object assets/images/avatar.jpg "$USERPROFILE/Desktop/头像.jpg"
  # 两个哈希都是 a94f687c8fb3832315ee2fda514601b2bc896f79
  ```
  同一个 blob 哈希同时等于工作区文件与桌面原图 ⇒ **没有重编码、没有裁切、没有圆形遮罩**。
- 文件内部的旁证：baseline JPEG（SOF0 `0xC0`）、单次扫描（非 progressive）、JFIF APP0、**没有 EXIF、没有 XMP、没有注释段**。
  `ffprobe` 报 `pix_fmt=yuvj420p`。两张 PNG 图标（`favicon-32.png`、`apple-touch-icon.png`）是 ffmpeg 封装的，
  `favicon.ico` 现在是 `tools/make-favicon.mjs` 把那张 32×32 PNG 装进 ICO 容器得来的——三者都不是从 `avatar.jpg` 重新编码 JPEG 得来的。
- 显示成方的，不是圆的：`.hero .avatar`（assets/css/style.css）只有宽度与入场动画，注释写着
  「原图直出：不加圆框、不加外环、不加描边」；style.css 在窄屏只改宽度。全站唯一的 `border-radius:50%`
  在 style.css，管的是 hero 那两个装饰同心环的 `::before/::after`，跟头像无关。
- 与 `92e48b3` 那次提交里的 `avatar.jpg`（旧清单记的 9,814 B 那版）**不是同一个 blob**：当前值是 `6856bc0`
  「头像回归原图无装饰」换进来的，旧版已不在工作区。

## 四 · 三枚图标都出自 `avatar.jpg`；`favicon.ico` 现由 `tools/make-favicon.mjs` 生成

三枚都是正方形，`avatar.jpg` 也是正方形，所以是等比缩放、不需要裁切。两张 PNG（`favicon-32.png` 32×32、`apple-touch-icon.png` 180×180）
是从 `avatar.jpg` 缩放后由这台机器上的 ffmpeg 封装出来的，派生关系用像素比对确认，不是靠猜：把 `avatar.jpg` 缩到目标尺寸，
再和仓库里那两个文件的解码像素比平均绝对差（满量程 255）。`favicon.ico` 则**不再单独编码**——它由 `tools/make-favicon.mjs`
把 `favicon-32.png` 那张真 32×32 PNG 原样装进一个合法 ICO 容器（头六字节 `00 00 01 00 01 00`，内嵌 PNG），字节可复现。

| 对比 | MAD | 结论 |
| --- | --- | --- |
| `favicon-32.png` vs `avatar.jpg`→32×32 | 0.71 / 255 | 同一张图 |
| `apple-touch-icon.png` vs `avatar.jpg`→180×180 | 0.43 / 255 | 同一张图 |
| `favicon.ico` 内嵌的 PNG vs `favicon-32.png` | 逐字节相同 | ICO 里装的就是这张 PNG（`make-favicon.mjs` 不重新编码像素） |
| `apple-touch-icon.png`→32×32 vs `favicon-32.png` | 1.07 / 255 | 两个尺寸出自同一母图 |

另外两条实测事实：

1. **`favicon.ico` 的扩展名与内容过去不一致，现已修好。** 早先那份 `.ico` 头四字节其实是 `FF D8 FF E0`（JPEG），不是 `00 00 01 00`（ICO 容器），
   浏览器靠内容嗅探才画得出来——这是个已知缺陷。现在它由 `node tools/make-favicon.mjs` 从 `favicon-32.png` 重建：合法 ICO 容器 + 内嵌 32×32 PNG，
   HTML 那边 `type="image/x-icon"` 与内容终于对得上，四条图标引用（`.ico/.png/apple-touch`）都带 `?v=` 指纹。
2. **两张 PNG 都没有 alpha 通道**（IHDR colorType=2，纯 RGB）。`apple-touch-icon.png` 左上角像素是 `[39,11,12]`，
   是照片本身的颜色，不是透明像素 ⇒ 图标里**同样没烤进圆形遮罩**。

没能复现的部分：两张 **PNG** 图标（`favicon-32.png`、`apple-touch-icon.png`）的**确切 ffmpeg 缩放/编码命令**——
我按 `scale=32:32` / `scale=180:180` 加 `-update 1` 跑过，像素对得上（上表），字节数对不上（多出 94 B、以及 PNG 那两枚各差若干字节）。
差的是缩放算法与 PNG 过滤器选择，没留下记录，**这两枚的参数：provenance unknown**。但 `favicon.ico` 现在是**逐字节可复现**的：
`node tools/make-favicon.mjs` 从 `favicon-32.png` 重跑一次即得到仓库里那 1,336 B。

## 五 · `og-card.png`：这条链路我逐字节复现成功了

```bash
FF="$HOME/.workbuddy-ai/binaries/ffmpeg/bin"                    # ffmpeg 9.0.1-full_build
CH="/c/Program Files/Google/Chrome/Application/chrome.exe"      # 154.0.8037.93 / .98
mkdir -p /d/tmp/imgprov                                         # 中间产物一律写在仓库外
cp assets/images/og-card.svg /d/tmp/imgprov/r-og.svg

"$CH" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
  --user-data-dir="D:\\tmp\\imgprov\\ud" --window-size=1200,630 \
  --screenshot="D:\\tmp\\imgprov\\raw-og.png" "file:///D:/tmp/imgprov/r-og.svg"
                                                              # -> 72,739 B
"$FF/ffmpeg" -y -i /d/tmp/imgprov/raw-og.png -update 1 /d/tmp/imgprov/og-rewrap.png
                                                              # -> 74,866 B
git hash-object assets/images/og-card.png /d/tmp/imgprov/og-rewrap.png
# 278b5d6e8c463cd71917b58b1a128bc96f9c0862  两个都是这个
```

Chrome 直出的那张 PNG 是 72,739 B，仓库里是 74,866 B。ffmpeg `-update 1` 重新封装之后：
**`git hash-object` 两边一致，`Buffer.equals` 为 true，逐字节相同**。差别是 Chrome 直出的 PNG 只有
`IHDR/IDAT/IEND`，封装后多了一个 `pHYs` 块。

再补一道像素核对：把仓库里的 `og-card.png` 与今天新渲染的那张解码后逐通道比——
**MAD 0.0000 / 255，最大差 0，2,268,000 个采样值没有一个不同**。所以「`og-card.png` 就是 `og-card.svg`
在 Chrome 里 1:1 栅格化的结果」这句是复现过的，不是继承来的说法。

`favicon-32.png` / `apple-touch-icon.png` 也带同一个 `pHYs` 特征，符合「同一条 ffmpeg 封装路」，但如上所述没能逐字节复现。

## 六 · 两张作品截图

实拍过程（这一趟的中间产物还在 `D:/tmp/resume-site/shots/`，仓库外，脚本 `shot.cjs` 也在那儿）：
Playwright 驱动本机 Chrome，`viewport 1280×800`、`deviceScaleFactor 1`、`waitUntil networkidle` 后再等 5 秒
让入场动画和数字滚动跑完，然后截图。本机 DNS 会把域名解析到代理侧的假 IP，所以「通不通」不作证据；
判定是否真打到线上看响应头。这台机器上的 Playwright 现在是 `1.64.0-alpha-1789764292000`
（旧清单写的是 1.63，那版本已经查不到了）。

实测的中间产物与关系：

| 文件 | 实测 |
| --- | --- |
| `cap-nc15.png` / `cap-geohot.png` | 1280×800 PNG 母图 |
| `crop-nc15.png` / `crop-geohot.png` | 1200×750 PNG |
| `final-nc15.jpg` / `final-geohot.jpg` | 1200×750，23,411 B / 23,351 B。**这两个 jpg 今天已从仓库删掉**，只剩仓库外的中间产物，所以旧清单里那一行不是笔误，是记录已经过期 |

- `shot-nc15.webp` **逐字节复现成功**：
  `"$FF/ffmpeg" -y -i /d/tmp/resume-site/shots/crop-nc15.png -c:v libwebp -quality 72 out.webp`
  → 28,624 B，`git hash-object` 与仓库里那份同为 `53f3b0c98c2f094a0a5580370a7b0d1a097388d2`。
  quality 72 这个数是复现出来的，不是抄的。
- `shot-geohot.webp` 的来源**由像素确认，参数没能复现**：
  它与 `crop-geohot.png` 缩到 1000×626 的结果 MAD 1.740 / 255 ⇒ 母图就是那次实拍的 1200×750。
  但按 `-quality 72` 跑出来是 37,710 B，我从 q70 一路试到 q40（37,006 / 36,340 / … / 29,112），
  没有一个命中 32,500 B。缩放算法与质量参数都没记录。**这张的编码参数：provenance unknown。**
- ⚠️ **`shot-geohot.webp` 实际是 1000×626，index.html 与 en/index.html 上写的却是 `width="1200" height="750"`。**
  宽高比 1.5974 对 1.6000，差 0.2%，肉眼看不出来，但声明与实物不符，浏览器只能靠 `aspect-ratio` 兜。
  改 `index.html` 不在我这次的动手范围，留给站长。
- 裁切口径修正一条：旧清单说纪念册取 `x=40`、GEOHOT 取 `x=0`。用 `cap-geohot.png` 分别按 x=40 和 x=0 裁出 1200×750
  再和 `crop-geohot.png` 比：**x=0 差值 0.000，x=40 差值 10.059** ⇒ GEOHOT 确实是 x=0，那句是对的；
  而 `shot.cjs` 里写死的 `CLIP.x` 是 40，对两张图都成立——说明 `crop-geohot.png` 不是 `shot.cjs` 直接产的那张，
  是另外裁的。

## 七 · README 的三张配图

来源由 `README.md` 的「图录」一节自己记着（拍的是本地预览 `node tools/serve.mjs`，不是线上，
因为线上部署滞后于工作区；时间 2026-10-07 10:28–10:32 +0800；工具 Chrome 154 headless 经 CDP
`Emulation.setDeviceMetricsOverride` + `Page.captureScreenshot`）。我核到的部分：
尺寸与字节全部与那张表一致（2880×1800 / 321,551；2880×1800 / 434,385；1170×2532 / 243,352），
而且像素尺寸正好等于标称视口乘 DPR（1440×2、900×2、390×3、844×3）；
三张都是 colorType=2 的 PNG 且**没有 `pHYs` 块**，与第五节 Chrome 直出的形态一致，和 ffmpeg 封装过的三枚图标不同。
重跑一遍 CDP 抓取不是这次的活儿，**逐字节级别没有复现**。

## 八 · 两张手写 SVG 的实测约束

`og-card.svg`、`banner.svg` 今天都重新读了一遍：

- 没有 `@import`、没有引 woff2、没有引 CSS、没有任何 `http` 资源——全部资源内联。
- 没有 XML 注释，正文里也没有裸的 `--`（GitHub 的 SVG 解析器会直接拒收整张图）。
- 字体一律写死成通用衬线栈 `Georgia, 'Times New Roman', 'Songti SC', 'Noto Serif CJK SC', SimSun, serif`。
- 文字是真 `<text>`，`<svg>` 带 `role="img"` 和 `aria-label`。
- 只用 `docs/build-contract.md` §1 的令牌色：`#F0EEE6` 底、`#E4DFD3` 发丝线、`#1F1E1D` 墨、`#6E6A5E` 弱文、`#D97757` 赤陶；
  等高线一组细线里只有一条着赤陶色。分层靠 1 px 发丝线，没有阴影、没有渐变、圆角只有 2 px。

## 九 · 今天已经从仓库里消失的文件（旧清单还在列它们）

`git log` 实测：`avatar.webp`、`favicon.svg` 在 `6856bc0` 删除，`shot-nc15.jpg`、`shot-geohot.jpg` 在 `4f6e6fd` 删除。
工作区和索引里都查不到这四个（`git ls-files assets/images` 13 项、`ls` 13 项，其中一项就是本文件的前身）。
它们的尺寸、来源、Pillow/libjpeg 那段取舍过程，本文一律不再描述——**文件不在了，描述就不该留着**。

顺带四条由这次实测翻出来的账，前三条不属于本文的动手范围：

1. ~~`index.html` 与 `en/index.html` 的 JSON-LD `"image"` 指着已经删掉的 `avatar.webp`。~~
   **本文写完之前已被并行提交 `38f86e8` 修掉**，复查现状：index.html 与 en/index.html 现在都是
   `https://xxc2007.me/assets/images/avatar.jpg`。留这句是为了说明本文核对到的时刻。
2. ~~`docs/build-contract.md` §0 那行还写着 `avatar.jpg (9.8 KB) / avatar.webp (5.3 KB)`，两个数字都是旧版；
   同一文件 `.avatar(圆框)` 那句与「不加圆框」相冲。~~ **现已改到 §0**：`avatar.jpg` 26,762 B、`avatar.webp 已删`、
   `.avatar(原图直出，无圆框/描边/底色)`，与 style.css 那条注释一致——本文这条账已了结。
3. `README.md:156` / `README.en.md:157` 的目录树注释还写着「另有实测清单 README.md」/ "a measured asset manifest"，
   指的是本文搬走之前的那份。
4. **线上还有个缓存尾巴**：`avatar.webp` 与 `favicon.svg` 早已从仓库删除，公网
   `https://xxc2007.me/assets/images/avatar.webp` 却仍然返回 200——那是 Cloudflare 边缘缓存的旧副本。
   同一批地址在源站上带 `Host` 头请求 `http://127.0.0.1/…` 实测都是 **404**（2026-10-07 复核）。
   所以这类「仓库里没有、线上还回 200」先按边缘缓存处理，别当成部署漏了文件，也别急着把文件加回去。

第 2、3 两条落在别人正在审的文件里，等站长或对应负责方处理。

## 十 · 本文前身那个公网 URL 现在是什么状态

`https://xxc2007.me/assets/images/README.md` 曾经能直接取到全文（它就躺在 `assets/` 里，被归档清单整目录带上去的）。
2026-10-07 处理：文件从仓库删除（本文取代它），服务器上的那一份单独删掉，实测
源站 `http://127.0.0.1/assets/images/README.md`（带 `Host` 头）与公网
`https://xxc2007.me/assets/images/README.md` 都是 **404**，同期 `/assets/images/avatar.jpg` 仍是 **200**。
机制上真正的闸门是 `scripts/deploy.sh:60` 的归档清单——它只打 `index.html en 404.html robots.txt sitemap.xml assets`，
`docs` 从来不在里面，所以本文（以及 `docs/` 下其它内部文档）不会被部署到公网。**要往 `docs/` 放东西，不要往 `assets/` 放。**

## 十一 · 这台机器上当前的工具版本

写在这是为了让上面每条命令可追。旧清单里那两个版本号今天都对不上了：
Playwright 实测已是 `1.64.0-alpha`（旧写 1.63）；Pillow `12.3` 无法核对——本机 PATH 上没有 python，
而且它加工的那两张 `shot-*.jpg` 也已经不在仓库里了。

| 工具 | 今天实测 | 位置 |
| --- | --- | --- |
| ffmpeg | `9.0.1-full_build-www.gyan.dev`；libavcodec 注释串 `Lavc63.1.101` | `$HOME/.workbuddy-ai/binaries/ffmpeg/bin` |
| Chrome | `154.0.8037.93` 与 `154.0.8037.98` 两个版本目录 | `C:/Program Files/Google/Chrome/Application/` |
| Playwright | `1.64.0-alpha-1789764292000` | `D:/npm-cache/_npx/31e32ef8478fbf80/node_modules/playwright` |
| Python / Pillow | **本机 PATH 上没有 python**，`shot-*.jpg` 也已从仓库删除 | — 那条 Pillow/libjpeg 管线无法复核，本文不再描述 |

---

## 附 · 本文的字节是怎么量出来的

```bash
cd "$(git rev-parse --show-toplevel)"
wc -c assets/images/*                          # 字节
"$FF/ffprobe" -v error -select_streams v:0 \
  -show_entries stream=width,height,pix_fmt -of csv=p=0 <文件>
node scripts/check-bytes.mjs                   # 预算口径，今天 BUDGET OK
```

尺寸我是直接读文件头，不依赖外部库（这台机器上没有 python，也没有 `node_modules`）：

- PNG：`readUInt32BE(16)` × `readUInt32BE(20)`，顺带看 IHDR 第 25 字节 colorType（2 = RGB 无 alpha，6 = RGBA）。
- JPEG：从偏移 2 起扫标记段，遇到 SOF0–SOF15（`0xC0`–`0xCF`，但跳过 `0xC4`/`0xC8`/`0xCC`）取
  `readUInt16BE(+7)` × `readUInt16BE(+5)`；其余段按段长短跳。
- WebP：`RIFF` 头 12 字节 + `WEBP` 4 字节 + `VP8 ` FourCC 4 字节 + 块长 4 字节 ⇒ 载荷从偏移 20 起；
  帧标签 3 字节、同步码 `9D 01 2A` 3 字节，宽和高各是偏移 26 与 28 上的 16 位小端再 `& 0x3FFF`。
- 解码像素做比对时，PNG 用 `zlib.inflateSync` 解开 IDAT 再按 filter 0–4 还原；JPEG 与 WebP 交给 ffmpeg 出 PPM。
