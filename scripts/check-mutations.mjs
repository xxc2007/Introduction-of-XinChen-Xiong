#!/usr/bin/env node
/* 负向对照（mutation testing）：把已知缺陷逐条注入一份仓库副本，
   确认对应断言真的会变红，而且红的是它该红的那条。
   为什么要这个脚本：上一轮攻门代理测出「69 条注入里 29 条走绿」，
   那种闸门比没有闸门更糟——它让人以为查过了。断言必须能失败才算数。

   跑法：node scripts/check-mutations.mjs       （只读写临时目录，不碰真仓库） */
import { cpSync, rmSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CSS = "assets/css/style.css", ZH = "index.html", EN = "en/index.html";

/* 每条：注入点 from（必须唯一命中）→ 替换成 to → 期望哪条断言报错。 */
/* 这个脚本自带「攻击载荷」，而 check-links.mjs 会扫 scripts/*.mjs 的每一行——
   于是它扫到自己写的假 IP 和假私钥名，报成泄密。和 check-links 自己一样，
   把触发串拆成两段拼接：运行时的值仍然是完整的，源码里不含完整触发串。
   拼接后的字面量必须仍然是「四段里少一段」的形状，否则这次拼接本身就绕过了红线规则。 */
const FAKE_IP = "203.0.113." + "19";          // TEST-NET-3 文档地址段，不指向任何机器
const FAKE_KEY = "aws-key." + "pem";
const MUTS = [
  { name: "JS 不再写 --mx，CSS 里成了孤儿变量", file: "assets/js/main.js",
    from: `setProperty('--mx'`, to: `setProperty('--qx'`,
    expect: /只被读取、从没被写入/ },
  { name: "JS 写了个 CSS 不读的自定义属性", file: "assets/js/main.js",
    from: `setProperty('--rx'`, to: `setProperty('--zzz'`,
    expect: /JS 写了但 CSS 从不读取/ },
  { name: "hero 文字用回 --muted（压画布会掉出 AA）", file: CSS,
    from: `.hero-sub{font-size:clamp(16px,1.1vw + 14px,19px);color:var(--ink)`,
    to: `.hero-sub{font-size:clamp(16px,1.1vw + 14px,19px);color:var(--muted)`,
    expect: /画布上的文字掉出 AA/ },
  { name: "染色底配裸 --terra-ink", file: CSS,
    from: `.lang-menu a:hover{background:rgba(217,119,87,.12);color:var(--terra-ink-2)}`,
    to: `.lang-menu a:hover{background:rgba(217,119,87,.12);color:var(--terra-ink)}`,
    expect: /赤陶橙底/ },
  { name: "硬编码色值绕开令牌", file: CSS, from: `.brand b{`, to: `.brand b{color:#123456;`,
    expect: /绕开了令牌/ },
  { name: "契约外圆角", file: CSS, from: `.brand b{`, to: `.brand b{border-radius:9px;`,
    expect: /契约外的圆角/ },
  { name: "中英结构不对称（EN 多一个 section）", file: EN,
    from: `<section`, to: `<section id="bogus"></section>\n  <section`,
    expect: /结构不对称/ },
  { name: "指纹漂移（中文页改了个 ?v=）", file: ZH, from: `?v=`, to: `?v=zzzzzz`,
    expect: /指纹/ },
  /* 锚点里绝不许出现 ?v= 的值：deploy.sh 第 0 步会按 HEAD 把三页的指纹统一换掉，
     写死 `avatar.jpg?v=4019bf" alt="` 的那一版在部署当场就「锚点零命中」，
     而锚点零命中算失败——闸门把一个正常的指纹轮换读成了一次注入攻击没抓到。
     锚点只能钉在不会随部署漂移的稳定文本上。 */
  { name: "图片缺 alt", file: ZH,
    from: `alt="站长选定的头像图`, to: `data-alt="站长选定的头像图`,
    expect: /无 alt/ },
  { name: "标题跳级", file: ZH, from: `<h2`, to: `<h4`, expect: /跳到/ },
  { name: "头像 alt 声称是本人照片", file: ZH,
    from: `深红底上两行白字`, to: `本人证件照片`, expect: /标语/ },
  { name: "@keyframes 占用磁吸 translate（简写形式）", file: CSS,
    from: `@media (prefers-reduced-motion:reduce)`, insert: true,
    to: `@keyframes magbug{from{translate:none}to{translate:0 6px}}
.hero-cta{animation:magbug .5s both}
`,
    expect: /覆盖磁吸的 translate/ },
  { name: "同一条 bug 的 animation-name 写法", file: CSS,
    from: `@media (prefers-reduced-motion:reduce)`, insert: true,
    to: `@keyframes magbug2{from{translate:none}to{translate:0 6px}}
.hero-cta{animation-name:magbug2;animation-fill-mode:both}
`,
    expect: /覆盖磁吸的 translate/ },
  { name: "磁吸元素换写法（data 属性）也该抓到", file: CSS,
    from: `@media (prefers-reduced-motion:reduce)`, insert: true,
    to: `@keyframes magbug3{from{translate:none}to{translate:0 6px}}
a[data-magnetic].copy-mail{animation:magbug3 .5s both}
`,
    expect: /覆盖磁吸的 translate/ },
  { name: "reduced-motion 块被改名（等于删掉）", file: CSS,
    from: `@media (prefers-reduced-motion:reduce)`, to: `@media (prefers-bogus-motion:reduce)`,
    expect: /找不到 prefers-reduced-motion/ },
  { name: "reduced-motion 后面又追加普通规则（反压）", file: CSS, append: true,
    from: "", to: `\n.late-rule{color:var(--ink);animation:bogus 2s}\n`,
    expect: /盖掉它/ },
  { name: "零脚本页去掉 no-js 类（.reveal 会永久隐形）", file: "404.html",
    from: `<html lang="zh-CN" dir="ltr" class="no-js">`, to: `<html lang="zh-CN" dir="ltr">`,
    expect: /缺 class="no-js"|停在 opacity:0/ },
  { name: "scene.js 多导出了一个 main.js 不用的东西", file: "assets/js/scene.js",
    from: `function prefersReducedMotion() {`, to: `export function prefersReducedMotion() {`,
    expect: /导出了但 main\.js 从没用过/ },
  { name: "往衬线斜体 motto 里塞回印刷体撇号", file: EN,
    re: /(class="motto">I haven)'t/, to: "$1’",
    expect: /印刷体撇号|直撇号/ },
  { name: "新增一条没人使用的 CSS 规则（死规则）", file: CSS, insert: true,
    from: `@media (prefers-reduced-motion:reduce)`,
    to: `.unused-orphan{color:var(--ink);border:1px solid var(--line)}\n`,
    expect: /没有任何元素使用/ },
  { name: "写在块之前的普通规则不该误报", file: CSS,
    from: `@media (prefers-reduced-motion:reduce)`, insert: true,
    to: `.skip{color:var(--ink);animation:bogus 2s}\n`,
    only: "reduced-motion 块必须真的把动画与迟到都压掉", expect: null },   // 只跑这一条：往 CSS 加行会改字节数，那是别的断言该管的
                      // 复用 .skip 而不是新造一个类名：新造的类没人挂，会先被「死规则」那条打掉
  { name: "404 页用相对路径", file: "404.html", from: `href="/`, to: `href="./`,
    expect: /相对路径/ },
  { name: "img 声明尺寸与真实不符", file: ZH,
    re: /(avatar\.jpg[^>]*?width=")\d{3}(")/, to: "$1299$2",
    expect: /声明/ },
  { name: "aria-controls 指向不存在的 id", file: ZH,
    from: `aria-controls="`, to: `aria-controls="nope-`, expect: /不存在的 id/ },

  { name: "挂了一个没有样式定义的 class（404 的 .sec-title 就是这个）", file: "404.html",
    from: `<div class="sec-head">`, to: `<div class="sec-title">`, expect: /没有任何样式表定义它/ },
  { name: "nav 那组「nowrap + flex:1 1 0 + min-width:0」碰撞发生器", file: CSS, insert: true,
    from: `@media (prefers-reduced-motion:reduce)`,
    to: `.nav-collide{white-space:nowrap;flex:1 1 0;min-width:0}\n`,
    expect: /溢出自己的盒子/ },
  { name: "CSS 里出现没人写过的属性选择器（aria-selected 那一族）", file: CSS, insert: true,
    from: `@media (prefers-reduced-motion:reduce)`,
    to: `.lang-menu a[aria-pressed="true"]{color:var(--terra-ink-2)}\n`,
    expect: /没有任何地方写上它们/ },
  { name: "给 verify-sync 再加一段而文档没跟上（段数说法过期）", file: "scripts/verify-sync.sh",
    append: true, to: `\necho "── H. 假想的新段"\n`, expect: /段字母表|但 migration\.md 的表只列了/ },
  { name: "README 抄的跟踪文件数过期了", file: "README.md",
    re: /(git ls-files \\\| wc -l`? = )\d+/, to: "$11",
    expect: /跟踪文件数：README 写/ },
  { name: "README 显示用的 KB 值算错（35.3 写成 352.6 那一类）", file: "README.md",
    re: /(\| 全站 CSS \| )\*\*[\d.]+ KB\*\*/, to: "$1**999.9 KB**",
    expect: /CSS 显示 KB：README 写/ },
  { name: "只改英文 README 的数字（旧版只查中文那份）", file: "README.en.md",
    re: /(\| Site CSS \| [^|]*\()`\d[\d,]*` bytes/, to: "`1` bytes",
    expect: /README\.en\.md \/ CSS 字节/ },
  { name: "注释引用了一条不存在的 CSS 规则", file: "assets/js/main.js",
    from: `/* 触屏与 reduced-motion 一律不绑定倾斜`,
    to: `/* 透视由 #works{perspective:1200px} 提供 */\n/* 触屏与 reduced-motion 一律不绑定倾斜`,
    expect: /引用的 CSS 规则必须真的存在|不存在的规则/ },

  /* ── round-4 攻门代理证出的洞，逐条钉住（这些先必须是红的，修完才允许变绿） ── */
  { name: "行注释里的假 CSS 引用（旧版只扫块注释）", file: "assets/js/main.js",
    from: `const root = document.documentElement;`,
    to: `// 透视交给 #gallery{perspective:1200px} 提供\nconst root = document.documentElement;`,
    expect: /引用的 CSS 规则必须真的存在|不存在的规则/ },
  { name: "只写 [data-magnetic] 不提任何磁吸类名", file: CSS, insert: true,
    from: `@media (prefers-reduced-motion:reduce)`,
    to: `@keyframes magpin{from{translate:none}to{translate:0 6px}}\n[data-magnetic]{animation:magpin .5s both}\n`,
    expect: /覆盖磁吸的 translate/ },
  /* 跨文件的一族：往 CSS 加一条没人用的规则，再到别处的**注释**里提一句那个类名。
     使用侧不剥注释的话，这句注释就把死规则「救活」了——旧版因此全绿。
     只改一个文件测不到，所以用 also 同时打两处。 */
  { name: "HTML 注释里提一句就救活一条死规则", file: CSS, insert: true,
    from: `@media (prefers-reduced-motion:reduce)`,
    to: `.zombie-html{color:var(--ink);border:1px solid var(--line)}\n`,
    also: { file: ZH, from: `<section class="hero" id="top">`,
      to: `<!-- <p class="zombie-html"> -->\n  <section class="hero" id="top">` },
    expect: /没有任何元素使用/ },
  { name: "JS 注释里写一句 classList.add 就救活死规则", file: CSS, insert: true,
    from: `@media (prefers-reduced-motion:reduce)`,
    to: `.zombie-js{color:var(--ink);border:1px solid var(--line)}\n`,
    also: { file: "assets/js/main.js", from: `const root = document.documentElement;`,
      to: `/* 以前这里跑过 root.classList.add("zombie-js") */\nconst root = document.documentElement;` },
    expect: /没有任何元素使用/ },
  { name: "class 用单引号写就不被扫", file: ZH,
    from: `<section class="hero" id="top">`,
    to: `<section class='not-defined-single' id="top">`,
    expect: /没有任何样式表定义它/ },
  { name: "跨页借用内联样式里定义的类", file: ZH,
    from: `<section class="hero" id="top">`,
    to: `<section class="nf-links" id="top">`,
    expect: /没有任何样式表定义它/ },
  { name: "染色底 alpha 写成 0.28（旧版解析成 0）", file: CSS,
    from: `.lang-btn:hover{color:var(--terra-ink-2);background:rgba(217,119,87,.12)}`,
    to: `.lang-btn:hover{color:var(--terra-ink);background:rgba(217,119,87,0.28)}`,
    expect: /赤陶橙底|掉出 AA/ },
  { name: "染色底用 background-color 就不被认", file: CSS,
    from: `.lang-menu a:hover{background:rgba(217,119,87,.12);color:var(--terra-ink-2)}`,
    to: `.lang-menu a:hover{background-color:rgba(217,119,87,.12);color:var(--terra-ink)}`,
    expect: /赤陶橙底|掉出 AA/ },
  { name: "首屏 .motto 用 --muted（不在 .hero 前缀下）", file: CSS,
    from: `.hero .motto{margin-bottom:18px`,
    to: `.hero .motto{color:var(--muted);margin-bottom:18px`,
    expect: /画布上的文字掉出 AA/ },
  { name: "同一条规则里后写的 color 压过前写的", file: CSS,
    from: `.hero-sub{font-size:clamp(16px,1.1vw + 14px,19px);color:var(--ink)`,
    to: `.hero-sub{font-size:clamp(16px,1.1vw + 14px,19px);color:var(--ink);color:var(--muted)`,
    expect: /画布上的文字掉出 AA/ },

  /* ── check-links 那道关：上一轮攻门测出「行里有尖括号就整行免检」，
      HTML 因此有 71/222 行根本没被扫过。下面四条就是那个洞的正反对照。 */
  { name: "正文里写死一个可路由 IP", file: ZH, gate: "links",
    from: `写信找我就可以`, to: `写信找我就可以（服务器 ${FAKE_IP}）`,
    expect: /疑似源站公网 IP/ },
  { name: "把 IP 藏进带尖括号的那一行", file: ZH, gate: "links",
    from: `class="hero" id="top"`, to: `class="hero" id="top" data-node="${FAKE_IP}"`,
    expect: /疑似源站公网 IP/ },
  { name: "私钥文件名写进页面", file: ZH, gate: "links",
    from: `class="hero" id="top"`, to: `class="hero" id="top" data-key="${FAKE_KEY}"`,
    expect: /私钥文件名/ },
  { name: "正文出现科研表述", file: ZH, gate: "links",
    from: `写信找我就可以`, to: `写信找我就可以，目前在做青藏高原气候变化研究的文献综述`,
    expect: /科研表述/ },
  { name: "回环地址同行藏一个真 IP（旧版整行放行）", file: ZH, gate: "links",
    from: `写信找我就可以`, to: `写信找我就可以（本地 127.0.0.1，源站 ${FAKE_IP}）`,
    expect: /疑似源站公网 IP/ },
  { name: "deploy/nginx.conf.example 也要被扫", file: "deploy/nginx.conf.example", gate: "links",
    from: `server_name`, to: `server_name # ${FAKE_IP}`, expect: /疑似源站公网 IP/ },
  { name: "真私钥文件名藏在一句带回环的话里", file: ZH, gate: "links",
    from: `写信找我就可以`, to: `写信找我就可以（127.0.0.1 上还有 ${FAKE_KEY}）`,
    expect: /私钥文件名/ },
  { name: "文档里的 <server-ip> 占位符不该误报", file: "README.md", gate: "links",
    from: `DEPLOY_HOST=<server-ip>`, to: `DEPLOY_HOST=<server-ip>`, expect: null },
  { name: "SVG path 里的连写数字不该当成 IP", file: ZH, gate: "links",
    from: `class="hero" id="top"`, to: `class="hero" id="top" data-d="M5.243.002.03"`,
    expect: null },

  /* ── check-parity 那道关 ── */
  { name: "两页 aria-label 全删光（旧版会报「✓ 不重复（0 条）」）", file: ZH, gate: "parity", all: true,
    from: `aria-label="`, to: `data-removed="`, expect: /一条 aria-label 都没抓到/ },
  { name: "parity 的 data-* 集合两页不对称必须报", file: ZH, gate: "parity", all: true,
    from: `data-magnetic`, to: `dataMag`, expect: /只在|两侧都抽出 0 项/ },
  { name: "英文页漏掉一个资源指纹", file: EN, gate: "parity",
    from: `style.css?v=`, to: `style.css?x=`, expect: /指纹|v=/ },
  { name: "英文页删掉一条 hreflang", file: EN, gate: "parity",
    from: `<link rel="alternate" hreflang="zh-Hans"`, to: `<link rel="alternate" hreflang="zh-TW"`,
    expect: /hreflang/ },

  /* ── 2026-10-08 精简轮新增的四条断言，逐条注入验红 ── */
  { name: "声明一个没人读的颜色令牌（--dark 那一类）", file: CSS, insert: true,
    from: `@media (prefers-reduced-motion:reduce)`, to: `:root{--idle-demo:#3C7A2E}\n`,
    expect: /从未被读取的自定义属性/ },
  { name: "同一个色值起两个名字", file: CSS, insert: true,
    from: `@media (prefers-reduced-motion:reduce)`,
    to: `:root{--ink-again:#1F1E1D}\n.brand b{color:var(--ink-again)}\n`,
    expect: /同值双名/ },
  { name: "文档令牌表里留着一个已删除的令牌", file: "docs/site-spec.md", append: true,
    to: `\n--idle-demo  #3C7A2E  注入演示用的假令牌\n`, expect: /令牌表与 CSS 不符/ },
  { name: "文档用行号指向本仓库的文件", file: "docs/design.md", append: true,
    to: `\n注入演示：透视见 \`style.css:12\`。\n`, expect: /行号引用本仓库文件/ },
  { name: "一条资源引用丢了 ?v=（favicon 那次事故）", file: ZH,
    from: `favicon.ico?v=`, to: `favicon.ico?x=`, expect: /没带指纹/ },
  { name: "文档抄的等宽栈与 CSS 脱节", file: "docs/design.md",
    re: /(ui-monospace),SFMono-Regular/, to: "$1,SFMonoRenamed",
    expect: /等宽栈在 style\.css 里已找不到/ },
  { name: "html.no-js 摊平菜单的 display 丢了 !important（实测过的假兜底）", file: CSS,
    re: /(\.lang-menu\[hidden\]\{[^{}]{0,60}?display:\s*flex)!important/, to: "$1",
    expect: /会被 \[hidden\]/ },
  { name: "契约的「数量断言」表抄错一项（work-card 2 写成 3）", file: "docs/build-contract.md",
    re: /(`\.work-card` = )2/, to: "$13", expect: /契约写 3/ },
  { name: "往契约的数量表里加一项、测试却没有量法", file: "docs/build-contract.md",
    re: /(`ol\.steps li` = 4)/, to: "$1、`.not-measured` = 9", expect: /没有这一项的量法/ },
];

/* 整仓复制（剔掉 .git 与站点无关的目录）。只挑几个文件带会漏，
   漏了「本地图都要存在」就会在每个沙箱里先红，把该看的那条盖掉。 */
/* 整仓复制，包括 .git：check-links 与 README 数字断言都要跑 git ls-files，
   少了 .git 它们不是「通过」而是当场崩掉。docs/ 也必须在——断言会读它。 */
const SKIP = /(^|[\\/])node_modules(\b|$)/;
const sandbox = () => {
  const dir = mkdtempSync(join(tmpdir(), "qamut-"));
  cpSync(ROOT, dir, { recursive: true, filter: (src) => !SKIP.test(src.slice(ROOT.length + 1)) });
  return dir;
};

/* 三道闸门都要能被攻击：只测 quality.test.mjs 的话，
   check-links 的占位符豁免、check-parity 的数量断言依旧是没验证过的黑箱。 */
const GATES = {
  test: ["node", ["--test", "tests/*.test.mjs"]],
  links: ["node", ["scripts/check-links.mjs"]],
  parity: ["node", ["scripts/check-parity.mjs"]],
};
/* only=<断言名> 的控制用例：只跑那一条。
   控制用例问的是「这条断言会不会误报」，而注入本身常常会碰到别的断言
   （往 CSS 加一行就改了字节数，README 那张抄了测量值的表立刻红），
   那些是副作用，不是这条控制用例要问的事。 */
const run = (dir, gate = "test", only = null) => {
  let cmd = GATES[gate][0], args = [...GATES[gate][1]];
  if (only) args = ["--test", `--test-name-pattern=${only}`, "tests/*.test.mjs"];
  try { execFileSync(cmd, args, { cwd: dir, encoding: "utf8" }); return null; }
  catch (e) { return String((e.stdout || "") + (e.stderr || "")); }
};

/* 结构自检：注入锚点不许钉在「会随正常工作改变的值」上。
   两类都真发生过：
   ① 钉 ?v=<指纹> —— deploy.sh 第 0 步按 HEAD 换指纹，锚点当场失配；
   ② 钉 README 里抄的测量值（35.3 KB / 36,107 bytes）—— 我改一行 CSS 它就变，
      于是两条对照同时「锚点零命中」。
   零命中算失败，所以这类锚点会把一次正常改动读成一次没抓到的攻击。
   规则：字面量锚点里不许出现指纹或 3 位以上的数字串；要钉值就用 re: 正则锚点。 */
/* 只钉真正会漂移的两类值：
   ① ?v=<指纹> —— deploy.sh 第 0 步按 HEAD 换它；
   ② README 抄的测量值 —— 写成 `36,107` 这种带反引号的千分位，或 35.3 KB 这种显示值，
      改一行 CSS 就变。
   注意别把设计令牌也算进去：rgba(217,119,87,.12) 里的 217/119 是赤陶橙的 RGB 分量，
   它是常量，钉上去是安全的。第一版用 \d{3,} 一刀切、第二版用「数字,三位数字」，
   两次都把这条 rgba 误报成漂移值——所以千分位必须连反引号一起认。 */
{
  const VOLATILE = /(\?v=[0-9a-z]{4,8}|`\d{1,3},\d{3}`|[\d.]+ ?KB)/;
  const bad = MUTS.filter(m => m.from && !m.re && VOLATILE.test(m.from));
  if (bad.length) {
    console.log("🛑 这些注入锚点钉在了会随正常工作漂移的值上，改 re: 正则锚点或换成稳定文本：");
    for (const m of bad) console.log(`   - ${m.name}  →  "${m.from}"`);
    process.exit(1);
  }
  const noop = MUTS.filter(m => m.from && m.from === m.to && m.expect !== null);
  if (noop.length) {
    console.log("🛑 这些用例 from === to 且期望变红，是字面意义上的空操作（不可能注入任何东西）：");
    for (const m of noop) console.log(`   - ${m.name}`);
    process.exit(1);
  }
  const noAnchor = MUTS.filter(m => !m.append && !m.from && !m.re);
  if (noAnchor.length) {
    console.log("🛑 这些用例既没有 from 也没有 re，注入无从发生：");
    for (const m of noAnchor) console.log(`   - ${m.name}`);
    process.exit(1);
  }
}

/* 基线：不打补丁的副本必须三道闸门全绿。副本文件带不全的话，
   下面每条都会「红了但不是该抓的那条」，整张表就成了噪音。 */
{
  const dir = sandbox(true);
  try {
    const bad = ["test", "links", "parity"].map((g) => [g, run(dir, g)]).filter(([, o]) => o);
    if (bad.length) {
      console.log("🛑 基线副本就不是全绿的，后面的对照都不可信：");
      for (const [g, o] of bad) console.log(`  [${g}] ` + o.split("\n").filter(l => /✗|FAILED|✖/.test(l)).slice(0, 4).join("\n        "));
      process.exit(1);
    }
    console.log("✅ 基线：未打补丁的副本 test / links / parity 三关全绿\n");
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

/* 归因必须只看「失败区」。
   直接把 expect 去 match 整段输出是错的：spec reporter 会为每条通过的断言打印
   「✔ 页面里所有 ?v= 指纹是同一个值」，于是注入一个让**别的**测试变红的缺陷、
   配一条 expect:/指纹/ 的用例，也会在通过测试的名字里撞上「指纹」两个字——
   打印「✅ 正确变红」，而真正该红的那条根本没跑。实测 37 条里有 9 条是这种假绿。
   node --test 的失败全部集中在末尾「✖ failing tests:」之后，切那一刀就干净了；
   links/parity 是自定义输出，只取带 ✗ 的行。 */
const failureText = (out, gate) => {
  if (!out) return "";
  if (gate === "test") {
    const i = out.lastIndexOf("failing tests:");
    return i >= 0 ? out.slice(i) : out;
  }
  /* links/parity 是自定义输出：✗ 那行只有断言名，具体判据在下一行的缩进里
     （`✗ data-* 属性名集合` / `      只在 ZH: …`）。只取带 ✗ 的行会把判据丢掉。 */
  const i = out.indexOf("✗");
  return i >= 0 ? out.slice(i) : "";
};

let red = 0, wrong = 0, missed = 0;
for (const m of MUTS) {
  if (!existsSync(join(ROOT, m.file))) { console.log(`⚠️  ${m.name}: 文件不在仓库里`); missed++; continue; }
  const gate = m.gate || "test";
  // 一直带 .git：README 那张表的断言要跑 git ls-files，links 那道关也要，
  // 少了它这些用例会以「git 报错」的形式变红——红是红了，但不是该抓的那条。
  const dir = sandbox(true);
  try {
    const p = join(dir, m.file);
    const src = readFileSync(p, "utf8");
    if (!m.append && !m.re && !src.includes(m.from)) { console.log(`⚠️  ${m.name}: 注入锚点零命中 → "${m.from}"`); missed++; continue; }
    if (m.re && !m.re.test(src)) { console.log(`⚠️  ${m.name}: 正则锚点零命中 → ${m.re}`); missed++; continue; }
    // 注入姿势：追加到文件尾 / 插在锚点前 / 正则替换 / 替换每一处 / 只替换第一处。
    const patched = m.append ? src + m.to
      : m.re ? src.replace(m.re, m.to)
      : m.insert ? src.replace(m.from, m.to + m.from)
      : m.all ? src.split(m.from).join(m.to)
      : src.replace(m.from, m.to);
    writeFileSync(p, patched);

    /* 有些洞是跨文件的：「注释救活死规则」要同时往 CSS 加一条没人用的规则、
       再往 HTML/JS 的注释里提一句那个类名。只改一个文件永远测不到它。 */
    if (m.also) {
      for (const a of (Array.isArray(m.also) ? m.also : [m.also])) {
        const ap = join(dir, a.file);
        const asrc = readFileSync(ap, "utf8");
        if (!asrc.includes(a.from)) { console.log(`⚠️  ${m.name}: 第二处锚点零命中 → ${a.file}`); missed++; continue; }
        writeFileSync(ap, a.all ? asrc.split(a.from).join(a.to) : asrc.replace(a.from, a.to));
      }
    }

    const out = run(dir, gate, m.only), green = out === null;

    if (m.expect === null) {           // 反向对照：这条不该报警
      if (green) console.log(`✅ ${m.name}: 正确地没有误报`);
      else { console.log(`🟠 ${m.name}: 不该红却红了（误报）\n     ${out.split("\n").filter(l => /✗|✖/.test(l))[0] || ""}`); wrong++; }
      continue;
    }
    if (green) { console.log(`🔴 ${m.name}: 注入了缺陷但全绿——这条断言是死的`); red++; }
    else {
      const ft = failureText(out, gate);
      if (!m.expect.test(ft)) {
        const who = [...ft.matchAll(/^✖ (.+?) \(/gm)].map(x => x[1])
          .concat(ft.match(/✗ [^\n]{0,70}/g) || []);
        console.log(`🟠 ${m.name}: 变红了，但不是该抓的那条（失败区只有：${[...new Set(who)].join(" | ") || "解析失败"}）`); wrong++;
      } else console.log(`✅ ${m.name}: 正确变红 [${gate}]`);
    }
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

const total = MUTS.length;
console.log(`\n${total} 条负向对照：${total - red - wrong - missed} 通过 / ${red} 死断言 / ${wrong} 抓错或误报 / ${missed} 锚点失效`);
process.exit(red + wrong + missed ? 1 : 0);
