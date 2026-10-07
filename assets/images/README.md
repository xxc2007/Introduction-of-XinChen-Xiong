# assets/images 资产清单

生成时间：2026-10-07。所有尺寸/字节数均为实测值（`ls -la` + `ffprobe`）。

## 一览

| 文件 | 尺寸 | 字节 | 来源 | 用在哪 |
| --- | --- | --- | --- | --- |
| `avatar.jpg` | 300×300 | 9,814 | 站长本人提供的原图（见 `docs/build-contract.md` §0） | 首屏圆形头像、JSON-LD `image` |
| `avatar.webp` | 300×300 | 5,282 | 同上的 WebP 转码 | 头像备用格式 |
| `shot-nc15.jpg` | 1200×750 | 23,411 | **线上站点实拍**：`https://xxc2007.me/` 首屏 | 作品卡一（`<img>` 当前引用的是 `.webp`） |
| `shot-nc15.webp` | 1200×750 | 28,624 | 同一次实拍的 WebP 编码（quality 72） | 作品卡一（HTML 实际引用） |
| `shot-geohot.jpg` | 1200×750 | 23,351 | **线上站点实拍**：`https://xxc2007.me/geohot/` 首页 | 作品卡二备用格式 |
| `shot-geohot.webp` | 1200×750 | 51,266 | 同一次实拍的 WebP 编码（quality 72） | 作品卡二（HTML 实际引用） |
| `og-card.svg` | 1200×630 | 1,663 | 手写 SVG（无 `@import`、无外链字体、无 `--`） | 分享卡源文件 |
| `og-card.png` | 1200×630 | 74,866 | 由 `og-card.svg` 在 Chrome 里 1:1 栅格化 | `og:image` / Twitter 卡 |
| `favicon.svg` | 24×24 viewBox | 278 | 手写 SVG | `<link rel="icon" type="image/svg+xml">` |
| `favicon-32.png` | 32×32 | 1,365 | 由 `favicon.svg` 在 Chrome 里栅格化 | `<link rel="icon" sizes="32x32">` |
| `banner.svg` | 1200×400 | 1,803 | 手写 SVG（无 `--`、无外链字体） | GitHub 仓库横幅 |

## 截图来源与取证（两张 shot）

- 拍摄方式：**真实浏览器渲染**，Playwright 1.63 驱动本机 Chrome（`C:/Program Files/Google/Chrome/Application/chrome.exe`），
  `viewport 1280×800`、`deviceScaleFactor 1`、`waitUntil networkidle` 后再等 5 s，让入场动画与数字滚动跑完，然后截图。
- 本机 DNS 把 `xxc2007.me` 解析到代理假 IP `198.18.0.104`（DoH 查到的真实记录是 Cloudflare `104.21.25.57` / `172.67.223.3`），
  但 HTTPS 请求确实打到了线上：响应头 `Server: cloudflare`、`Last-Modified: Wed, 23 Sep 2026 04:53:07 GMT`、`CF-RAY: a469197d2a9b8ec0-NRT`。
  **两张图都取自线上站点，未使用本地副本兜底**；`D:\nanchang15-website\site\index.html` 与线上首页逐字节相同（`cmp` 通过），可作交叉印证。
  GEOHOT 本地没有检出，只有线上版本，因此更不存在兜底替换。
- 裁切：1280×800 → 1200×750 用**裁**不用压。纪念册取 `x=40`（保住右上角语言胶囊，实测内容横向范围 61–1204）；
  GEOHOT 取 `x=0`（保住左上角 `• GEOHOT` 字标，代价是右下角搜索框被切掉 50 px）。
- JPEG 压到 24 KB 以内的取舍：这两页背景有细噪点（实测平坦区相邻像素平均绝对差 3.9），
  ffmpeg 自带 mjpeg 编码器即使开到最差 `-q:v 31` + `yuvj420p`，GEOHOT 仍是 27,948 B，进不了预算。
  最终用 libjpeg（Pillow 12.3）`optimize + progressive + 4:2:0`，并对截图做 0.35 px 高斯预处理消噪，
  取"仍 ≤ 24,000 B 的最高质量"：纪念册 quality 17 → 23,411 B；GEOHOT quality 11 → 23,351 B。
  文字在卡片实际显示宽度（约 600–700 px）下仍清晰可读；`.webp`（quality 72、不做模糊）是首选格式，`.jpg` 是兜底。

## 重新生成命令

`$FF` = `/c/Users/理想与现实/.workbuddy-ai/binaries/ffmpeg/bin`，`$CHROME` = `/c/Program Files/Google/Chrome/Application/chrome.exe`，
`$PY` = `/c/Users/理想与现实/AppData/Local/Programs/Python/Python312/python.exe`。中间产物一律写在仓库外（`D:/tmp/resume-site/shots`）。

```sh
# 1) 实拍：1280×800 PNG 母图（脚本见下文 shot.cjs，Playwright + 本机 Chrome）
node shot.cjs                       # -> cap-nc15.png / cap-geohot.png（1280×800）

# 2) 裁成 1200×750（裁，不缩）
"$FF/ffmpeg" -y -i cap-nc15.png  -vf "crop=1200:750:40:0" crop-nc15.png
"$FF/ffmpeg" -y -i cap-geohot.png -vf "crop=1200:750:0:0"  crop-geohot.png

# 3) WebP（quality 72，HTML 实际引用的格式）
"$FF/ffmpeg" -y -i crop-nc15.png   -c:v libwebp -quality 72 shot-nc15.webp
"$FF/ffmpeg" -y -i crop-geohot.png -c:v libwebp -quality 72 shot-geohot.webp

# 4) JPEG：0.35px 消噪后取"≤24000 B 的最高质量"（quality 从 50 往下试，命中即停）
"$PY" -c "
import os
from PIL import Image, ImageFilter
for name, q in (('nc15', 17), ('geohot', 11)):
    im = Image.open('crop-%s.png' % name).convert('RGB').filter(ImageFilter.GaussianBlur(0.35))
    im.save('shot-%s.jpg' % name, quality=q, optimize=True, progressive=True, subsampling='4:2:0')
"

# 5) og-card / favicon：SVG 手写后，用 Chrome 1:1 栅格化（窗口尺寸 = 目标像素尺寸）
"$CHROME" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
  --window-size=1200,630 --screenshot="D:\\tmp\\resume-site\\shots\\raw-og.png" \
  "file:///D:/tmp/resume-site/shots/r-og-card.svg"
"$FF/ffmpeg" -y -i raw-og.png -update 1 og-card.png
"$CHROME" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
  --window-size=32,32 --screenshot="D:\\tmp\\resume-site\\shots\\raw-fav32.png" \
  "file:///D:/tmp/resume-site/shots/r-favicon32.html"   # 该 html 只是 <img src=favicon.svg width=32 height=32>
"$FF/ffmpeg" -y -i raw-fav32.png -update 1 favicon-32.png

# 6) 校验：尺寸/像素格式 + SVG 是否合法 XML、有没有 -- 与外链字体
"$FF/ffprobe" -v error -select_streams v:0 -show_entries stream=width,height,pix_fmt -of csv=p=0 og-card.png
node svgcheck.mjs og-card.svg banner.svg favicon.svg    # 标签闭合 + 引号 + 禁 -- / @import / 外链字体
"$CHROME" --headless=new --window-size=1200,400 --screenshot=banner.png "file:///D:/tmp/resume-site/shots/r-banner.svg"
```

`shot.cjs`（实拍）与 `svgcheck.mjs`（SVG 体检）是过程脚本，按 `.gitignore` 的约定留在 `D:/tmp/resume-site/shots`，不入仓库。

## 设计约束（三张手写 SVG 共同遵守）

- 只允许 `docs/build-contract.md` §1 的令牌：`#F0EEE6` 米白底、`#FAF9F5` 纸白、`#1F1E1D` 墨、`#6E6A5E` 弱文、
  `#D97757`/`#A8492A` 赤陶、`#E4DFD3` 发丝线；分层只靠 1 px 发丝线，无阴影、无渐变、圆角 ≤2 px。
- 字体写死为通用衬线栈 `Georgia, 'Times New Roman', 'Songti SC', 'Noto Serif CJK SC', SimSun, serif`，
  **不写 `@import`、不引 woff2、不引 CSS**——OG 抓取器和 GitHub 都不执行外部资源，文字必须是真 `<text>`（可选中、可被读屏）。
- 注释里不出现 `--`（GitHub 的 SVG 解析器会直接拒绝整张图），因此三张图一律不写 XML 注释。
- 等高线母题与站内 `svg.contours` 同源：`#E4DFD3` 细线一组，只放**一条**赤陶 `#D97757` 作为唯一强调。
