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
  { name: "图片缺 alt", file: ZH,
    from: `avatar.jpg?v=4019bf" alt="`, to: `avatar.jpg?v=4019bf" data-alt="`,
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
  { name: "英文页改回直撇号", file: EN,
    from: `I haven’t written code`, to: `I haven't written code`, expect: /直撇号/ },
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
    from: `width="300" height="300"`, to: `width="299" height="300"`,
    expect: /声明/ },
  { name: "aria-controls 指向不存在的 id", file: ZH,
    from: `aria-controls="`, to: `aria-controls="nope-`, expect: /不存在的 id/ },

  { name: "挂了一个没有样式定义的 class（404 的 .sec-title 就是这个）", file: "404.html",
    from: `<div class="sec-head">`, to: `<div class="sec-title">`, expect: /没有任何样式表定义它/ },
  { name: "README 抄的测量值过期了（数字与代码脱节）", file: "README.md",
    from: "`git ls-files \\| wc -l` = 150", to: "`git ls-files \\| wc -l` = 146",
    expect: /跟踪文件数：README 写 146/ },
  { name: "注释引用了一条不存在的 CSS 规则", file: "assets/js/main.js",
    from: `/* 触屏与 reduced-motion 一律不绑定倾斜`,
    to: `/* 透视由 #works{perspective:1200px} 提供 */\n/* 触屏与 reduced-motion 一律不绑定倾斜`,
    expect: /引用的 CSS 规则必须真的存在|不存在的规则/ },

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
  { name: "文档里的 <server-ip> 占位符不该误报", file: "README.md", gate: "links",
    from: `DEPLOY_HOST=<server-ip>`, to: `DEPLOY_HOST=<server-ip>`, expect: null },
  { name: "SVG path 里的连写数字不该当成 IP", file: ZH, gate: "links",
    from: `class="hero" id="top"`, to: `class="hero" id="top" data-d="M5.243.002.03"`,
    expect: null },

  /* ── check-parity 那道关 ── */
  { name: "两页 aria-label 全删光（旧版会报「✓ 不重复（0 条）」）", file: ZH, gate: "parity",
    from: `aria-label="`, to: `data-x="`, expect: /一条 aria-label 都没抓到|不重复/ },
  { name: "parity 的 data-* 集合两页不对称必须报", file: ZH, gate: "parity", all: true,
    from: `data-magnetic`, to: `dataMag`, expect: /只在|两侧都抽出 0 项/ },
  { name: "英文页漏掉一个资源指纹", file: EN, gate: "parity",
    from: `style.css?v=`, to: `style.css?x=`, expect: /指纹|v=/ },
  { name: "英文页删掉一条 hreflang", file: EN, gate: "parity",
    from: `<link rel="alternate" hreflang="zh-Hans"`, to: `<link rel="alternate" hreflang="zh-TW"`,
    expect: /hreflang/ },
];

/* 整仓复制（剔掉 .git 与站点无关的目录）。只挑几个文件带会漏，
   漏了「本地图都要存在」就会在每个沙箱里先红，把该看的那条盖掉。 */
const SKIP = /(^|[\\/])(\.git|node_modules|docs|tools)(\b|$)/;
const sandbox = (withGit = false) => {
  const dir = mkdtempSync(join(tmpdir(), "qamut-"));
  const re = withGit ? /(^|[\\/])(node_modules|docs|tools)(\b|$)/ : SKIP;
  cpSync(ROOT, dir, { recursive: true, filter: (src) => !re.test(src.slice(ROOT.length + 1)) });
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
    if (!m.append && !src.includes(m.from)) { console.log(`⚠️  ${m.name}: 注入锚点零命中 → "${m.from}"`); missed++; continue; }
    // 四种注入姿势：追加到文件尾 / 插在锚点前 / 只替换第一处 / 替换每一处。
    const patched = m.append ? src + m.to
      : m.insert ? src.replace(m.from, m.to + m.from)
      : m.all ? src.split(m.from).join(m.to)
      : src.replace(m.from, m.to);
    writeFileSync(p, patched);

    const out = run(dir, gate, m.only), green = out === null;

    if (m.expect === null) {           // 反向对照：这条不该报警
      if (green) console.log(`✅ ${m.name}: 正确地没有误报`);
      else { console.log(`🟠 ${m.name}: 不该红却红了（误报）\n     ${out.split("\n").filter(l => /✗|✖/.test(l))[0] || ""}`); wrong++; }
      continue;
    }
    if (green) { console.log(`🔴 ${m.name}: 注入了缺陷但全绿——这条断言是死的`); red++; }
    else if (!m.expect.test(out)) {
      const who = [...out.matchAll(/^✖ (.+?) \(/gm)].map(x => x[1])
        .concat(out.match(/✗ [^\n]{0,70}/g) || []);
      console.log(`🟠 ${m.name}: 变红了，但不是该抓的那条（红了：${who.join(" | ") || "解析失败"}）`); wrong++;
    } else console.log(`✅ ${m.name}: 正确变红 [${gate}]`);
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

const total = MUTS.length;
console.log(`\n${total} 条负向对照：${total - red - wrong - missed} 通过 / ${red} 死断言 / ${wrong} 抓错或误报 / ${missed} 锚点失效`);
process.exit(red + wrong + missed ? 1 : 0);
