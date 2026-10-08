/* 质量闸门：把「大家都会看一眼、但没人会去核对」的约定钉成断言。
   跑法：node --test tests/          （无依赖、无浏览器、不联网、不碰服务器）

   为什么要有这个文件：这个仓库没有构建步骤也没有测试，全部正确性靠人眼。
   下面每条断言都对应一个真实存在过或可能存在过的缺陷类别——
   JS 与 CSS 各说各话、注释描述的功能已经被删掉、reduced-motion 漏掉某个动画。 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, statSync, readdirSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { execFileSync } from "node:child_process";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(ROOT, p), "utf8");

const CSS = read("assets/css/style.css");
const MAIN = read("assets/js/main.js");
const SCENE = read("assets/js/scene.js");
const HTML_ZH = read("index.html");
const HTML_EN = read("en/index.html");
const README_MD = read("README.md");
const README_EN = read("README.en.md");
const CONTRACT_MD = read("docs/build-contract.md");
const SPEC_MD = read("docs/site-spec.md");
const PAGES = { "index.html": HTML_ZH, "en/index.html": HTML_EN };

/* 把 CSS 按块切开，方便区分「令牌声明」和「使用处」。
   先剥掉注释：注释里会引用历史写法（「早先这里读的是 var(--p,0)」），
   不剥的话解析器会把散文当成代码，报出一个并不存在的孤儿变量。 */
const CSS_CODE = CSS.replace(/\/\*[\s\S]*?\*\//g, "");
const cssDecls = [...CSS_CODE.matchAll(/(--[a-z0-9-]+)\s*:/g)].map((m) => m[1]);
const cssUses = [...CSS_CODE.matchAll(/var\(\s*(--[a-z0-9-]+)/g)].map((m) => m[1]);
const jsWrites = [...(MAIN + SCENE).matchAll(/setProperty\(\s*['"](--[a-z0-9-]+)['"]/g)].map((m) => m[1]);
const htmlSets = [...(HTML_ZH + HTML_EN).matchAll(/style="[^"]*?(--[a-z0-9-]+)\s*:/g)].map((m) => m[1]);

test("CSS 里每个 var(--x) 都要有出处：要么 CSS/HTML 声明过，要么 JS 会写进去", () => {
  const produced = new Set([...cssDecls, ...jsWrites, ...htmlSets]);
  const orphans = [...new Set(cssUses)].filter((v) => !produced.has(v));
  // 孤儿变量永远取的是 fallback，等于一条静默失效的规则——写的人和读的人对不上。
  assert.deepEqual(orphans, [], `这些自定义属性只被读取、从没被写入：${orphans.join(", ")}`);
});

test("JS 写进 DOM 的每个自定义属性都要被 CSS 用到", () => {
  const used = new Set(cssUses);
  const dead = [...new Set(jsWrites)].filter((v) => !used.has(v));
  assert.deepEqual(dead, [], `JS 写了但 CSS 从不读取：${dead.join(", ")}`);
});

test("reduced-motion 块必须真的把动画与迟到都压掉", () => {
  const at = CSS_CODE.indexOf("@media (prefers-reduced-motion:reduce)");
  assert.ok(at > 0, "找不到 prefers-reduced-motion 块");
  const body = CSS_CODE.slice(at);
  // ① 对所有元素生效的总兜底
  assert.ok(/\*\s*,[^{]*\{[^}]*animation-duration\s*:\s*\.?0/.test(body),
    "块里没有 *{animation-duration:0} 这一类总兜底");
  // ② 时延必须一起归零：只归零 duration 的话内容不是"不动"而是"迟到"
  assert.ok(/animation-delay\s*:\s*0s\s*!important/.test(body), "没归零 animation-delay");
  assert.ok(/transition-delay\s*:\s*0s\s*!important/.test(body), "没归零 transition-delay");
  // ③ 块后面不许再出现任何规则——它是文件最后一段，写在它后面的同特异度规则会反压它。
  //   不能写成「body 里删掉 @media 之后有没有 {」：那个 replace 一路删到文件尾，
  //   把块之后的规则一起删干净了，于是这条永远不可能失败（上一版就是这样）。
  const blockOpen = CSS_CODE.indexOf("{", at);
  let depth = 0, close = -1;
  for (let i = blockOpen; i < CSS_CODE.length; i++) {
    if (CSS_CODE[i] === "{") depth++;
    else if (CSS_CODE[i] === "}" && --depth === 0) { close = i; break; }
  }
  assert.ok(close > 0, "reduced-motion 块的括号没配上，后面的检查无从谈起");
  const after = CSS_CODE.slice(close + 1);
  const laterRule = after.match(/([^{}]+)\{[^}]*\}/);
  assert.ok(!laterRule,
    `reduced-motion 块之后还有规则，同特异度的会反过来盖掉它：${(laterRule ? laterRule[1] : "").trim()}`);
  /* ④ 原先是「每个动画名要么被显式 animation:none，要么落进总兜底」，
     但末尾带了 `|| 总兜底存在` 这个析取支——而 ① 已经要求总兜底存在并且会先抛，
     所以 ④ 在任何输入下都不可能失败。攻门代理实测：注入一个既没显式关闭、
     又确实被总兜底罩住的动画，全绿；把那个析取支删掉，同一个注入立刻变红。
     留着一条永不失败的断言比删掉更糟——它让人以为这一维被查过了。
     换成一条真能倒下的：总兜底的选择器必须是**通用**的。
     有人把它从 `*` 收窄成 `*,:where(...)` 之外的具体标签时，
     duration 归零就只覆盖一部分元素，而 ① 那条正则照样过得去。 */
  const blanket = (body.match(/([^{}*]*\*[^{}]*)\{[^}]*animation-duration\s*:\s*\.?0/) || [])[1] || "";
  assert.ok(/\*/.test(blanket), "找不到带 * 的总兜底选择器");
  assert.ok(!/(^|[\s,])(div|span|p|section|a|button|h1|h2|h3|img|li)\s*([,{\s])/.test(blanket.replace(/[^{}]*\*/g, "")),
    `总兜底被收窄到具体标签了（"${blanket.trim()}"）——不在名单里的元素仍会动`);
});

test("设计令牌纪律：颜色字面量只能出现在令牌声明里", () => {
  const withoutRootVars = CSS_CODE.replace(/:root\s*\{[\s\S]*?\}/g, "");
  const literals = [...withoutRootVars.matchAll(/#[0-9a-fA-F]{3,8}\b/g)].map((m) => m[0]);
  // 允许 rgba()/rgb() 里的 0-255 分量与 0/1 归一值，那不属于「绕开令牌的颜色」。
  assert.equal(
    literals.length, 0,
    `有 ${literals.length} 处硬编码色值绕开了令牌：${literals.slice(0, 8).join(" ")}`
  );
});

test("圆角只有 2px 这一档（外加 50% 的圆与 0）", () => {
  const vals = [...CSS_CODE.matchAll(/border-radius\s*:\s*([^;}]+)/g)].flatMap((m) => m[1].split(/\s+/));
  const allowed = new Set(["2px", "50%", "0", "0px", "0%"]);
  const bad = [...new Set(vals)].filter((v) => v && !allowed.has(v));
  assert.deepEqual(bad, [], `出现了契约外的圆角：${bad.join(", ")}`);
});

test("中英两页结构对称", () => {
  const shape = (html) => ({
    h1: (html.match(/<h1[\s>]/g) || []).length,
    h2: (html.match(/<h2[\s>]/g) || []).length,
    h3: (html.match(/<h3[\s>]/g) || []).length,
    section: (html.match(/<section[\s>]/g) || []).length,
    img: (html.match(/<img[\s>]/g) || []).length,
    a: (html.match(/<a[\s>]/g) || []).length,
    button: (html.match(/<button[\s>]/g) || []).length,
    reveal: (html.match(/class="[^"]*\breveal\b[^"]*"/g) || []).length,
    fingerprinted: (html.match(/\?v=[0-9a-z]+/g) || []).length,
  });
  const zh = shape(HTML_ZH), en = shape(HTML_EN);
  for (const k of Object.keys(zh)) {
    assert.equal(zh[k], en[k], `结构不对称：${k} 中文页 ${zh[k]} / 英文页 ${en[k]}`);
  }
  assert.equal(zh.h1, 1, "每页必须恰好一个 h1");
});

test("HTML 引用的每个本地图都要在仓库里存在", () => {
  const missing = [];
  for (const [name, html] of Object.entries(PAGES)) {
    const base = name.startsWith("en") ? "en/" : "";
    for (const m of html.matchAll(/(?:src|href|content)="(\.\.?\/[^"?#]+)/g)) {
      const p = m[1].replace(/^\.\.\//, "").replace(/^\.\//, "");
      if (!p.startsWith("assets/") && !p.startsWith("http")) continue;
      if (!existsSync(join(ROOT, base ? "" : "", p)) && !existsSync(join(ROOT, p))) missing.push(`${name} → ${m[1]}`);
    }
  }
  assert.deepEqual(missing, [], `引用了不存在的文件：${missing.join(", ")}`);
});

test("aria-controls 指向的 id 必须存在", () => {
  const bad = [];
  for (const [name, html] of Object.entries(PAGES)) {
    const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]));
    for (const m of html.matchAll(/aria-controls="([^"]+)"/g)) {
      for (const id of m[1].trim().split(/\s+/)) if (!ids.has(id)) bad.push(`${name}: aria-controls=${id}`);
    }
  }
  assert.deepEqual(bad, [], `指向了不存在的 id：${bad.join(", ")}`);
});

test("每张 img 都有 alt；每个图标按钮都有可访问名字", () => {
  const problems = [];
  for (const [name, html] of Object.entries(PAGES)) {
    // 不能用 /\balt=/：`-` 也是词边界，data-alt= 会被当成有 alt，删掉 alt 的注入因此走绿。
    for (const m of html.matchAll(/<img\b[^>]*>/g)) if (!/(?:^|\s)alt=/.test(m[0])) problems.push(`${name}: <img> 无 alt`);
    for (const m of html.matchAll(/<a\b[^>]*>(?:(?!<\/a>)[\s\S])*?<\/a>/g)) {
      const tag = m[0];
      const inner = tag.replace(/<[^>]+>/g, "").trim();
      const hasName = inner.length > 0 || /aria-label="[^"]+"/.test(tag) || /title="[^"]+"/.test(tag);
      if (!hasName) problems.push(`${name}: 链接无可访问名字 → ${tag.slice(0, 70)}`);
    }
  }
  assert.deepEqual(problems, [], problems.join("\n"));
});

test("标题层级不许跳级", () => {
  for (const [name, html] of Object.entries(PAGES)) {
    const stripped = html.replace(/<!--[\s\S]*?-->/g, "");
    const levels = [...stripped.matchAll(/<h([1-6])\b/g)].map((m) => +m[1]);
    let prev = 0;
    for (const l of levels) {
      assert.ok(l - prev <= 1, `${name}: 标题从 h${prev || "∅"} 跳到 h${l}`);
      prev = l;
    }
  }
});

test("无障碍名必须包含可见文字（WCAG 2.5.3）", () => {
  const bad = [];
  for (const [page, html] of Object.entries(PAGES)) {
    for (const m of html.matchAll(/<a\b[^>]*aria-label="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)) {
      const name = m[1];
      for (const t of m[2].matchAll(/<span>([^<]+)<\/span>/g)) {
        const visible = t[1].trim();
        if (visible && !name.includes(visible)) bad.push(`${page}: aria-label「${name}」不含可见文字「${visible}」`);
      }
    }
  }
  assert.deepEqual(bad, [], bad.join("\n"));
});

test("不许留下 JS 从不写入的空 live region", () => {
  // 空的 role="status" / aria-live 容器是第二个安静播报区：读屏会为其存在而等待，
  // 而它永远不会被填。上一轮那个 .copy-hint 就是这么个东西。
  const bad = [];
  for (const [page, html] of Object.entries(PAGES)) {
    for (const m of html.matchAll(/<(p|div|span)\b[^>]*(?:role="status"|aria-live="[^"]+")[^>]*>\s*<\/\1>/g)) {
      const cls = (m[0].match(/class="([^"]*)"/) || [])[1] || "(无 class)";
      bad.push(`${page}: 空的 live region .${cls}`);
    }
  }
  assert.deepEqual(bad, [], bad.join("\n"));
});

/* ── 对比度：数字只有一个出处，就是这条断言。
   文档里以前写着「--muted 对 cream 有 5.0:1」，实测是 4.652:1——5.129 是对 --paper 的值，
   也就是说那句话是在错误的底色上量的。所以这里把 WCAG 相对亮度公式实现一遍，
   让 docs 只许指向本文件，不许再各自抄一份数。 */
function relLum(hex) {
  const h = hex.replace("#", "");
  const c = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16) / 255)
    .map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
function ratio(a, b) { const [x, y] = [relLum(a), relLum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); }
/* 从 style.css 的 :root 里读令牌实际值——文档说「值未改动」，那就用代码验一次。 */
const TOKENS = {};
for (const m of CSS_CODE.matchAll(/(--[a-z0-9-]+)\s*:\s*(#[0-9a-fA-F]{6})/g)) TOKENS[m[1]] = m[2];

/* fg 以 alpha a 合成到 bg 上（sRGB 空间近似着色器的预乘合成）。 */
const over = (bg, fg, a) => {
  const p = (h, i) => parseInt(h.replace("#", "").slice(i, i + 2), 16);
  const mix = (i) => Math.round(p(bg, i) * (1 - a) + p(fg, i) * a);
  return "#" + [0, 2, 4].map(i => mix(i).toString(16).padStart(2, "0")).join("");
};

test("令牌对比度：承载正文的色档必须过 AA，装饰色档必须被识别为不可承载文字", () => {
  /* 只量两条真正承托文字的表面：--cream（全站底）与 --paper（卡/菜单/代码片底）。
     画布上那种「底不确定」的情况不在这里凭空造最坏底，
     由下面「压在粒子场上的文字」一条按 CSS 真实写法逐条量。 */
  const BACKGROUNDS = { cream: TOKENS["--cream"], paper: TOKENS["--paper"] };
  for (const t of ["--ink", "--terra-ink", "--terra-ink-2"]) {
    assert.ok(TOKENS[t], `style.css 的 :root 里找不到 ${t}`);
    for (const [bn, bg] of Object.entries(BACKGROUNDS)) {
      const r = ratio(TOKENS[t], bg);
      assert.ok(r >= 4.5, `${t}(${TOKENS[t]}) 对 ${bn}(${bg}) 只有 ${r.toFixed(3)}:1，低于 AA 的 4.5`);
    }
  }
  // 亮赤陶橙只能当线、点、底色用；它当文字一定不达标，这条把「为什么另设 --terra-ink」钉住。
  const rt = ratio(TOKENS["--terra"], TOKENS["--cream"]);
  assert.ok(rt < 3, `--terra 对 cream 有 ${rt.toFixed(3)}:1，与「不可承载文字」的约定不再一致，注释要重写`);
});

/* 上一轮 --dark 的来历：它与 --ink 逐字符同值、从未被任何 var() 读过，
   而两份文档都把它抄在令牌表里——于是"文档描述了一份不存在的实现"。
   口头纪律管不住这个，所以改成三条能倒下的断言：不闲置、不重名、文档不超售。 */
test("自定义属性不许闲置：声明了却没有一处 var() 读取，就是死代码", () => {
  const used = new Set(cssUses);
  const idle = [...new Set(cssDecls)].filter((t) => !used.has(t));
  assert.deepEqual(idle, [], `从未被读取的自定义属性：${idle.join(", ")}`);
});

test("颜色令牌不许两个名字同值：改一个必漏另一个", () => {
  const byValue = {};
  for (const [t, v] of Object.entries(TOKENS)) (byValue[v.toLowerCase()] ??= []).push(t);
  const dup = Object.entries(byValue).filter(([, ts]) => ts.length > 1);
  assert.deepEqual(dup, [], `同值双名：${dup.map(([v, ts]) => `${v} → ${ts.join(" / ")}`).join("；")}`);
});

test("文档里的令牌表必须与 CSS 一致：不许点名一个已删除的令牌，也不许抄错值", () => {
  /* 只挑「令牌名 + 色值」成对出现的地方——那就是文档在替 CSS 报数。
     分隔符类里故意不放中日韩标点：`--cream #F0EEE6   页面底色  --paper …` 这种
     一行两列的表格里，`--cream` 不能隔着一串汉字去认领下一个色号。 */
  const CLAIM = /(--[a-z][a-z0-9-]*)[\s|:`]{0,8}(#[0-9a-fA-F]{6})/g;
  for (const [name, doc] of Object.entries({ "build-contract.md": CONTRACT_MD, "site-spec.md": SPEC_MD })) {
    const bad = [];
    for (const [all, token, hex] of [...doc.matchAll(CLAIM)]) {
      if (!TOKENS[token]) bad.push(`${all.trim()} —— CSS 里没有这个令牌`);
      else if (TOKENS[token].toLowerCase() !== hex.toLowerCase()) bad.push(`${token} 文档写 ${hex}，CSS 是 ${TOKENS[token]}`);
    }
    assert.deepEqual(bad, [], `${name} 的令牌表与 CSS 不符：\n  ${bad.join("\n  ")}`);
  }
});

test("压在粒子场上的文字必须过 AA（--muted 与裸 --terra-ink 都不许）", () => {
  /* 首屏文字直接压在 WebGL 画布上，一颗墨色纸屑就能把底压暗：
     cream+一颗 12% 墨屑 = #d7d5ce，--terra-ink 在这上面只剩 3.916、--muted 只剩 4.286。
     所以场上文字要么用 --ink，要么自己带一张不透光的纸（.hero-cta 就是这么解决的）。 */
  const speck = over(TOKENS["--cream"], TOKENS["--ink"], 0.12);
  assert.ok(ratio(TOKENS["--muted"], speck) < 4.5,
    `--muted 对最坏画布底已有 ${ratio(TOKENS["--muted"], speck).toFixed(3)}:1，若达标可放宽 hero 的限制`);

  /* 哪些选择器算「画布上」：.hero 前缀、下滑提示，以及首页那块 motto——
     它在 HTML 里就在 .hero 内，但 CSS 写的是裸 `.motto`，只按 `^\.hero` 筛会整个漏掉。
     这是一份「谁压在画布上」的名册，新增首屏元素时要在这里登记一行。 */
  const ON_CANVAS = /^(\.hero[\w-]*|\.hero\b|\.motto|\.scroll-cue)/;
  const bySel = new Map();
  for (const m of CSS_CODE.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
    for (const raw of m[1].split(",")) {
      const sel = raw.trim().replace(/\s+/g, " ");
      if (!ON_CANVAS.test(sel)) continue;
      bySel.set(sel, (bySel.get(sel) || "") + ";" + m[2]);
    }
  }
  assert.ok(bySel.size >= 3, `只认出 ${bySel.size} 条首屏规则，选择器解析大概脱节了`);

  /* .hero-cta:hover 继承基类 .hero-cta 的不透明背景——CSS 层叠里伪类不重新声明背景。
     不逐层剥伪类再合并，悬停态会被当成"裸在画布上"，报出一个并不存在的缺陷。 */
  const merged = (sel) => {
    let out = "", s = sel;
    const seen = new Set();
    while (s && !seen.has(s)) {
      seen.add(s);
      out += ";" + (bySel.get(s) || "");
      const next = s.replace(/:[\w-]+(\([^)]*\))?$/, "");
      if (next === s) break;
      s = next;
    }
    return out;
  };
  // 颜色既可能写 var(--token)，也可能直接写字面量（#6e6a5e 就是 --muted 的值，不能放过）
  const resolve = (decl) => {
    const v = (decl.match(/var\(\s*(--[\w-]+)/) || [])[1];
    if (v) return { tok: v, hex: TOKENS[v] };
    const hex = (decl.match(/#[0-9a-fA-F]{6}\b/) || [])[0];
    return hex ? { tok: hex, hex } : null;
  };
  const bad = [];
  for (const sel of bySel.keys()) {
    const decls = merged(sel);
    // 取最后一条命中：同一块里后面的声明压过前面的，取第一条会让「后加一条 muted」溜过去。
    const colors = [...decls.matchAll(/(?:^|;)\s*color\s*:\s*([^;]+)/g)].map(x => resolve(x[1])).filter(Boolean);
    const fg = colors[colors.length - 1];
    if (!fg || !fg.hex) continue;
    const solid = [...decls.matchAll(/(?:^|;)\s*background(?:-color)?\s*:\s*(var\(--[\w-]+\)|#[0-9a-fA-F]{6})/g)]
      .map(x => resolve(x[1])).filter(Boolean).pop();
    const bg = solid && solid.hex ? solid.hex : speck;
    const r = ratio(fg.hex, bg);
    if (r < 4.5) bad.push(`${sel}: ${fg.tok} 对 ${bg} 只有 ${r.toFixed(3)}:1`);
  }
  assert.deepEqual(bad, [], "画布上的文字掉出 AA：\n" + bad.join("\n"));
});

/* 从一条声明块里抽出「赤陶橙染色背景」的 alpha。
   三种写法都要认：background / background-color、逗号式 rgba(217,119,87,.12)、
   空格式 rgba(217 119 87 / .12)。上一版只认 `background:` + 逗号式，
   而且数值捕获写成 \.?(\d+)——碰上 0.28 只取到 "0"，alpha 变成 0，
   那条规则被当成「没有染色底」直接跳过：真实的 4.393:1 被报成 5.682。 */
const TINT_RE = /background(?:-color)?\s*:\s*rgba?\(\s*217[,\s]+119[,\s]+87[,\s/]*\s*(0?\.\d+|\d+(?:\.\d+)?|\.?\d+)\s*\)/;
function tintAlpha(body) {
  const m = body.match(TINT_RE);
  if (!m) return null;
  let a = parseFloat(m[1]);
  if (!isFinite(a)) return null;
  if (a > 1) a = a / 100;                       // 写成 12 表示 .12 的那种老式百分数
  return a;
}

/* 染色底与文字档位的配对：从 CSS 里反推真实存在的组合，而不是凭空造一个最坏情况。
   上一版把 --terra-ink 放在 cream+12% 的合成底上量到 4.443 报了红——但那条组合
   其实是 .lang-menu 悬停（底色是 --paper 不是 --cream，真实值 4.840，是过的）。
   与其守一个不存在的合成底，不如把「染色底必须降档」写成可直接扫 CSS 的规则。 */
test("染上赤陶橙底的规则不许再用 --terra-ink 承载文字（必须降到 --terra-ink-2）", () => {
  /* 按选择器合并规则再判：染色底与文字色常常不在同一条规则里
     （.hero-cta 的背景在一条、颜色在另一条），只看单条规则会漏掉这种跨规则的配对。 */
  const bySel = new Map();
  for (const m of CSS_CODE.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
    for (const raw of m[1].split(",")) {
      const sel = raw.trim().replace(/\s+/g, " ");
      if (!sel) continue;
      bySel.set(sel, (bySel.get(sel) || "") + ";" + m[2]);
    }
  }
  const TINTED_INK = [];
  const pairs = [];
  for (const [sel, body] of bySel) {
    const alpha = tintAlpha(body);
    if (alpha === null || alpha === 0) continue;
    const inks = [...body.matchAll(/color:\s*var\(--(terra-ink(?:-2)?)\)/g)].map(x => x[1]);
    const ink = inks[inks.length - 1];          // 后面那条压过前面那条
    if (!ink) continue;
    pairs.push({ sel, ink, alpha });
    if (ink === "terra-ink") TINTED_INK.push(`${sel}（alpha ${alpha}）`);
  }
  assert.ok(pairs.length >= 1, "一条「染色底 + 赤陶文字」都没扫到，正则大概又脱节了");
  assert.deepEqual(TINTED_INK, [],
    `这些规则把 --terra-ink 放在被赤陶橙染过的底上，对比度会掉出 AA：${TINTED_INK.join("；")}`);
  // 降过档的每一条，用实测数复核一遍（取两种底色里更暗的 cream 当保守基线）。
  for (const p of pairs) {
    const bg = over(TOKENS["--cream"], TOKENS["--terra"], p.alpha);
    const r = ratio(TOKENS[`--${p.ink}`], bg);
    assert.ok(r >= 4.5, `${p.sel}：--${p.ink} 对染色底 ${bg} 只有 ${r.toFixed(3)}:1`);
  }
});

test("磁吸按钮不许被任何 animate translate 的关键帧占用", () => {
  /* translate 与 transform 是两个独立属性。设计约定 translate 归磁吸。
     谁被一个 animate translate 的 @keyframes 命中、还带 fill:both，
     就会在层叠里被永久钉死——.hero-cta 的磁吸就这么坏了很久。
     注意不能一刀切禁止"关键帧动 translate"：.lang-menu 的 langIn 就合法，它不是磁吸元素。 */
  // 磁吸元素从 CSS 反推，不写死类名：写死的话换个选择器写法就绕过了。
  // 但「反推自 translate:var(--mx」也不够——一条只写 [data-magnetic]{animation:…} 的规则
  // 会把四枚磁吸按钮全钉住，却一个磁吸类名都不提。HTML 上真正的磁吸标记是 data-magnetic，
  // 所以两种来源都要认。
  const MAGNETIC = [...new Set(
    [...CSS_CODE.matchAll(/([^{}]+)\{[^}]*translate\s*:[^}]*var\(\s*--mx/g)].map(m => m[1])
      .flatMap(sel => sel.split(",").map(s => s.trim()).filter(Boolean))
  )];
  assert.ok(MAGNETIC.length >= 3, `只从 CSS 认出 ${MAGNETIC.length} 个磁吸选择器，解析大概脱节了：${MAGNETIC.join(",")}`);
  const isMagnetic = (sel) => MAGNETIC.some(c => sel.includes(c)) || /data-magnetic/.test(sel);
  const badKf = new Set(
    [...CSS_CODE.matchAll(/@keyframes\s+([\w-]+)\s*\{([\s\S]*?\})\s*\}/g)]
      .filter(m => /(^|[;{\s])translate\s*:/.test(m[2])).map(m => m[1])
  );
  const hits = [];
  for (const m of CSS_CODE.matchAll(/([^{}]+)\{([^}]*animation[^}]*)\}/g)) {
    const sels = m[1].split(",").map(s => s.trim()).filter(Boolean);
    // 简写 animation: fade 2s 和长写 animation-name: fade 都要认——只认简写等于留了个后门。
    const decls = [...m[2].matchAll(/animation(?:-name)?\s*:\s*([^;]+)/g)].map(a => a[1]);
    // 反斜杠必须成双：模板字符串里 "\s" 会被吞成 "s"，正则退化成 [s,] 这种永远匹配不上的东西。
    const used = [...badKf].filter(k => decls.some(a => new RegExp(`(^|[\\s,])${k}(\\s|,|$)`).test(a)));
    if (used.length && sels.some(isMagnetic)) {
      hits.push(`${sels.join(" / ")} 用了动画 ${used.join("/")}，它会覆盖磁吸的 translate`);
    }
  }
  assert.deepEqual(hits, [], hits.join("\n"));
});

test("注释里引用的 CSS 规则必须真的存在（JS 与 CSS 两侧都查）", () => {
  /* 注释写「透视交给 #works{perspective:1200px} 提供」而那条规则已被删除——
     这种背离不会让页面出错，但会让下一个人去改一条不存在的规则。
     只认「.选择器{属性:…}」这种硬引用形式；散文式提及（.lang-menu 的 langIn）不管。 */
  const rules = [...CSS_CODE.matchAll(/([^{}]+)\{([^}]*)\}/g)]
    .flatMap(m => m[1].split(",").map(s => ({ sel: s.trim().replace(/\s+/g, " "), body: m[2] })));
  assert.ok(rules.length > 20, `只解析出 ${rules.length} 条 CSS 规则，解析脱节了`);

  /* 块注释与行注释都要扫。上一版只认块注释，于是
     「// 透视交给 #gallery{perspective:1200px} 提供」这种行注释里的假引用整个看不见。 */
  const commentsOf = (text) => [
    ...[...text.matchAll(/\/\*([\s\S]*?)\*\//g)].map(m => m[1]),
    ...[...text.matchAll(/(^|[^:\w])\/\/([^\n]*)/g)].map(m => m[2]),
  ];
  const refs = (text) => commentsOf(text)
    .flatMap(c => [...c.matchAll(/([#.][\w-]+(?:\[[^\]]*\])?(?::[\w-]+)?)\s*\{([-a-z]+\s*:[^}]*)\}/g)]
      .map(r => ({ sel: r[1], decl: r[2] })));

  const audit = (list) => list.flatMap(({ sel, decl }) => {
    const prop = (decl.match(/([-a-z]+)\s*:/) || [])[1];
    const hit = rules.find(r => r.sel === sel || r.sel.split(/\s+/).includes(sel));
    if (!hit) return [`注释引用了不存在的规则 ${sel}{${decl.trim()}}`];
    if (prop && !hit.body.includes(prop)) return [`注释说 ${sel} 上有 ${prop}，CSS 里这条规则没有`];
    return [];
  });

  const bad = [...audit(refs(MAIN)), ...audit(refs(SCENE)), ...audit(refs(CSS))];
  assert.deepEqual(bad, [], bad.join("\n"));

  /* 当前代码库里可能一条硬引用都没有——那这条断言就空跑了。
     所以自带一次活化证明：喂给它一条不存在的引用，它必须报出来。
     没有这一段，「注释与 CSS 脱节」这类缺陷又会像上一版那样静默穿过。 */
  const live = audit(refs("/* 假引用 #nope{perspective:1200px} */"));
  assert.equal(live.length, 1, `自检失效：引用了不存在的规则却没报（报了 ${live.length} 条）`);
  const live2 = audit(refs("/* 假引用 .work-card{zoom:1} */"));
  assert.equal(live2.length, 1, `自检失效：规则在但声明不符的引用没被报（报了 ${live2.length} 条）`);
});

/* ── class 溯源的两份公共数据 ────────────────────────────────────────────
   两条 class 断言原先各自实现一遍抽取，结果各自漏：
   ① 使用侧不剥注释——`<!-- <p class="zombie"> -->` 能把一条真正的死规则「救活」；
   ② 只认 class="…"，写成 class='…' 或 class=裸值 的元素整个看不见；
   ③ 定义侧把三个页面的内联 <style> 合成一个全局集合——于是 index.html 用了
      404 独有的 .nf-links 也算「有出处」。
   现在统一在这里算好，两条断言共用。 */
const stripComments = (s) => s.replace(/<!--[\s\S]*?-->/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
const ALL_PAGES = { ...PAGES, "404.html": read("404.html") };
// class 属性三种写法都要认（HTML 规范允许未加引号的属性值）
const CLASS_ATTR = /\bclass\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>"'=]+))/g;
const usedIn = (html) => [...stripComments(html).matchAll(CLASS_ATTR)]
  .flatMap(m => (m[1] || m[2] || m[3] || "").trim().split(/\s+/)).filter(Boolean);

const CSS_DEFINED = new Set([...CSS_CODE.matchAll(/\.-?[_a-zA-Z][\w-]*/g)].map(m => m[0].slice(1)));
const INLINE_DEFINED = {};                       // 按页作用域，不合并成全局
for (const [name, html] of Object.entries(ALL_PAGES)) {
  const inline = stripComments((html.match(/<style>([\s\S]*?)<\/style>/) || [])[1] || "");
  INLINE_DEFINED[name] = new Set([...inline.matchAll(/\.-?[_a-zA-Z][\w-]*/g)].map(m => m[0].slice(1)));
}
// JS 加上去的类名：必须先剥注释，否则 /* classList.add("zombie2") */ 这种注释里的话能救活死规则
const JS_CODE = stripComments(MAIN + "\n" + SCENE);
const JS_ADDED = new Set();
for (const m of JS_CODE.matchAll(/classList\.(?:add|remove|toggle|contains|replace)\(([^)]*)\)/g))
  for (const lit of m[1].matchAll(/['"`]([^'"`]+)['"`]/g)) for (const c of lit[1].split(/\s+/)) JS_ADDED.add(c);
for (const m of JS_CODE.matchAll(/\.className\s*=\s*['"`]([^'"`]+)['"`]/g))
  for (const c of m[1].split(/\s+/)) JS_ADDED.add(c);

test("HTML 上挂的每个 class 都必须有出处（style.css 或本页自己的内联 <style>）", () => {
  /* 404 页的 <h1 class="sec-title"> 就是个例子：.sec-title 与 .num 从来没被任何样式表定义过，
     于是那行标题一直是裸的——但页面「看起来没问题」，因为浏览器给了 h1 默认字号。
     这类缺陷人眼看不出来，只能反过来查：从 HTML 收集类名，逐个问 CSS 认不认。 */
  const bad = [];
  let scanned = 0;
  for (const [name, html] of Object.entries(ALL_PAGES)) {
    const local = new Set([...CSS_DEFINED, ...INLINE_DEFINED[name]]);
    for (const c of usedIn(html)) {
      scanned++;
      if (!local.has(c)) bad.push(`${name}: .${c}（没有任何样式表定义它）`);
    }
  }
  assert.ok(scanned >= 40, `只扫到 ${scanned} 个类名使用处，解析大概脱节了`);
  assert.deepEqual([...new Set(bad)], [], [...new Set(bad)].join("\n"));
});

test("CSS 里定义的每个 class 都必须有人用（HTML 挂着它，或 JS 会加上去）", () => {
  /* .sr-only 定义了却没有任何元素挂过它；.eyebrow 只被 404 那个坏掉的标题用过。
     死规则不会让页面出错，但它让下一个读 CSS 的人以为存在另一条路径。 */
  const used = new Set([...Object.values(ALL_PAGES).flatMap(usedIn), ...JS_ADDED]);
  assert.ok(used.size >= 20, `使用侧只认出 ${used.size} 个类名，解析脱节了`);
  const dead = [...CSS_DEFINED].filter(c => !used.has(c)).sort();
  assert.deepEqual(dead, [], `这些类在任何样式表里定义了，却没有任何元素使用：${dead.join(", ")}`);
});

test("衬线斜体的 motto 里不许用印刷体撇号（实测会豁出 16.7px 的空洞）", () => {
  /* 上一轮我把英文页的直撇号统一改成印刷体 ’，理由是「英文排版惯例」。
     真机量下来这条理由是错的：motto 走 Noto Serif SC Variable 的斜体，
     该字体的 U+2019 前后进距极大——measureText("haven't")=73.8px，
     measureText("haven’t")=90.5px，一个字符多出 16.7px（字号才 21px），
     渲染出来 "haven’ t" 中间像被塞了个空格。
     同一枚字符在 .hero-sub 的系统无衬线里 delta = 0，完全无害。
     所以规则不是「英文该用哪种撇号」，而是「这个字体这一档撑不撑得住」：
     衬线斜体那一处退回直撇号，其余保留印刷体。 */
  const motto = (html) => (html.match(/<p class="motto">([\s\S]*?)<\/p>/) || [])[1] || "";
  const zh = motto(HTML_ZH), en = motto(HTML_EN);
  assert.ok(zh.length > 0 && en.length > 0, "没抓到两页的 .motto，正则脱节了");
  assert.ok(!/’|&#8217;|&rsquo;/i.test(en),
    `英文 motto 里出现了印刷体撇号，会在斜体衬线中豁出约 16.7px 的空洞：${en}`);
  assert.ok(/haven't/.test(en), `英文 motto 的缩写撇号应当是直撇号：${en}`);
  // 其余英文正文仍用印刷体（那里字体正常），这条别整个退回去
  const curly = [...HTML_EN.matchAll(/[A-Za-z]’[A-Za-z]/g)].map(m => m[0]);
  assert.ok(curly.length >= 2, `英文页只剩 ${curly.length} 处印刷体撇号，改动可能被整体回退了`);
});

test("不挂脚本的页面必须带 html.no-js，否则 .reveal 会永久隐形", () => {
  /* .reveal 的静止态是 opacity:0，把它抬回来只有两条路：main.js 加 .is-in，
     或 CSS 的 html.no-js / @media (scripting:none) 兜底。
     404 页刻意零脚本，早先 <html> 上却没有 no-js 类——那时它恰好没用 .reveal 才没出事。
     「恰好没事」不是设计：谁在这页加一个 .reveal 元素，就会得到一个永久不可见的元素，
     而页面看起来一切正常（内容还在 DOM 里，读屏也能读到，只是眼睛看不见）。 */
  for (const [name, html] of Object.entries({ ...PAGES, "404.html": read("404.html") })) {
    const hasScript = /<script\b/i.test(html);
    const hasNoJsClass = /<html[^>]*class="[^"]*\bno-js\b/.test(html);
    const usesReveal = /class="[^"]*\breveal\b/.test(html);
    if (!hasScript) {
      assert.ok(hasNoJsClass, `${name} 没有脚本却缺 class="no-js"：.reveal 无人抬升`);
    }
    if (usesReveal) {
      assert.ok(hasScript || hasNoJsClass,
        `${name} 用了 .reveal，却既没有脚本也没有 html.no-js——内容会停在 opacity:0`);
    }
  }
});

/* 2026-10-08 实测出来的：`html.no-js .lang-menu[hidden]{display:flex}` 从来没生效过——
   §01 的 [hidden]{display:none!important} 会盖掉任何不带 !important 的 display。
   文档却把这条记成 html.no-js 的职责（design.md「三重兜底」），也就是说被记下来的那道兜底是假的。
   通则：谁想「让一个 hidden 的元素显示出来」，就必须打赢那条 !important。 */
test("CSS 里想把 [hidden] 的元素显出来，display 就必须带 !important", () => {
  const offenders = [];
  let considered = 0;
  for (const m of CSS_CODE.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const sel = m[1].trim();
    if (!sel.includes("[hidden]")) continue;
    const decl = m[2];
    const disp = (decl.match(/(?:^|;)\s*display\s*:\s*([^;]+)/) || [])[1];
    if (!disp || disp.trim() === "none") continue;   // 全局兜底自己，和「本来就藏起来」的规则
    considered++;
    if (!/!important/.test(disp)) offenders.push(sel);
  }
  assert.ok(considered > 0, "一条「让 [hidden] 显出来」的规则都没扫到——写法大概变了，这条等于没跑");
  assert.deepEqual(offenders, [], `这些规则会被 [hidden]{{display:none!important}} 盖掉：${offenders.join(" | ")}`);
});

test("scene.js 的每个 export 都必须真的被 main.js 用掉", () => {
  /* prefersReducedMotion 曾经挂着 export 却没人 import：main.js 自己算 RM 再传进来。
     两个模块各自读同一个媒体查询、还各留一个导出口，就会有「谁负责判断 reduced」的歧义。
     main.js 走的是 await import("./scene.js?v=…")，没有静态 import 语句可解析，
     所以这里判的是「导出名在 main.js 里有没有出现过」——两个文件的规模撑得起这个近似。 */
  const exports = [...SCENE.matchAll(/export\s+(?:function|const|let|class)\s+([\w$]+)/g)].map(m => m[1]);
  assert.ok(exports.length >= 1, "没解析出 scene.js 的 export，正则脱节了");
  assert.ok(exports.includes("initField"), "scene.js 不再导出 initField？main.js 会静默退回静态底纹");
  const dead = exports.filter(e => !new RegExp(`\\b${e}\\b`).test(MAIN));
  assert.deepEqual(dead, [], `scene.js 导出了但 main.js 从没用过：${dead.join(", ")}`);
});

test("带 nowrap 的 flex 项不许被 flex:1 1 0 + min-width:0 压到内容宽度以下", () => {
  /* 390px 上英文导航五个标签撞成 "How I workWhat I believeFind me" 的成因就是这一组：
     链接带 white-space:nowrap（文字不许断），却又 flex:1 1 0 + min-width:0
     （盒子可以被压到比文字还窄）。文字溢出自己的盒子，而 flex 行本身没有溢出，
     于是旁边配的 overflow-x:auto 兜底永远不触发——量出来 docSW 仍等于视口宽，
     看起来"没有横向滚动就没有溢出"，实际字都压在一起了。
     这条是静态代理：真机重叠只能靠浏览器量，但这个组合本身就是碰撞发生器。 */
  const bad = [];
  for (const m of CSS_CODE.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
    const sel = m[1].trim().replace(/\s+/g, " ");
    const d = m[2];
    const nowrap = /white-space\s*:\s*nowrap/.test(d);
    const shrinkToZero = /flex\s*:\s*1\s+1\s+0\b/.test(d) || /flex-basis\s*:\s*0\b/.test(d);
    const noMin = /min-width\s*:\s*0\b/.test(d);
    if (nowrap && shrinkToZero && noMin) bad.push(`${sel}（nowrap + flex:1 1 0 + min-width:0）`);
  }
  assert.deepEqual(bad, [], "这些规则能让文字溢出自己的盒子：\n" + bad.join("\n"));
});

test("CSS 里按属性选中的每个属性都必须真的被写上（aria-selected 那组就是死的）", () => {
  /* .lang-menu 的选中态每个选择器都并列写了 [aria-selected="true"] 和 [aria-current="true"]
     两种口径，但 aria-selected 从来没被任何代码写过——两页与 main.js 只用 aria-current
     （main.js:233、:344）。这条死规则不会出错，只是让人以为还有第二条选中路径要照顾。
     class 那条闸门看不见属性选择器，所以单独查一遍属性。 */
  const HTML_JS = Object.values(ALL_PAGES).map(stripComments).join("\n") + "\n" + JS_CODE;
  const written = new Set(
    [...HTML_JS.matchAll(/\b(?:aria-[a-z-]+|data-[a-z-]+|role|lang|hreflang|type|hidden|dir)\b/g)].map(m => m[0])
  );
  /* JS 还常常走 el.dataset.someKey = …，源码里根本不出现 data-some-key 这个串。
     不认 dataset 的话，data-field（scene.js 写 hero.dataset.field）与
     data-state（main.js 写 btn.dataset.state）会被当成死规则——
     新断言第一次跑就红，有两种可能：抓到真 bug，或者断言写宽了。这次是后者。 */
  const kebab = (s) => s.replace(/[A-Z]/g, c => "-" + c.toLowerCase());
  for (const m of JS_CODE.matchAll(/\.dataset\.([A-Za-z_$][\w$]*)/g)) written.add("data-" + kebab(m[1]));
  for (const m of JS_CODE.matchAll(/dataset\s*=\s*\{([^}]*)\}/g))
    for (const k of m[1].matchAll(/([A-Za-z_$][\w$]*)\s*:/g)) written.add("data-" + kebab(k[1]));
  assert.ok(written.size >= 8, `使用侧只认出 ${written.size} 个属性名，解析脱节了`);
  const asked = new Set(
    [...CSS_CODE.matchAll(/\[\s*(aria-[a-z-]+|data-[a-z-]+|role|lang|hreflang)\s*(?:[=~^$*|]?=([^\]]*))?\]/g)]
      .map(m => m[1])
  );
  // 排除掉「写在 JS 里但用 setAttribute 拼接」的情况：再扫一遍字符串常量
  const dead = [...asked].filter(a => !written.has(a)).sort();
  assert.deepEqual(dead, [], `CSS 按这些属性选中样式，但没有任何地方写上它们：${dead.join(", ")}`);
});

test("文档说 verify-sync 有几段，就必须真的有几段", () => {
  /* 「六段 A–F」这种话每加一段就会过期一次——本轮就是我自己加了 G 段之后发现的。
     所以不靠记性：数脚本里真实的 `echo "── X. …"` 段数，和文档里写的字母表、
     段数中文写法同时对一遍。 */
  const VS = read("scripts/verify-sync.sh");
  const letters = [...VS.matchAll(/echo "── ([A-Z])\./g)].map(m => m[1]);
  assert.ok(letters.length >= 4, `只从 verify-sync.sh 认出 ${letters.length} 段，解析脱节了`);
  const want = letters.join("–");                       // 例如 A–B-C-D-E-F-G
  const span = `${letters[0]}–${letters[letters.length - 1]}`;
  const CN = ["一","二","三","四","五","六","七","八","九","十"];
  const countWord = `${CN[letters.length - 1]}段`;
  for (const f of ["docs/migration.md", "README.md"]) {
    const doc = read(f);
    if (!/A–[A-Z] 跑|分\*\*[一二三四五六七八九十]段\*\*/.test(doc)) continue;
    assert.ok(doc.includes(span), `${f} 写的段字母表不是 ${span}（脚本实际是 ${letters.join(", ")}）`);
    assert.ok(doc.includes(countWord), `${f} 写的段数不是 ${countWord}`);
  }
  // migration.md 的表格必须为每一段都留一行，否则「有 G 段」只写在标题里、读的人看不到判据
  const mig = read("docs/migration.md");
  const rows = letters.filter(L => new RegExp(`^\\| ${L} \\|`, "m").test(mig));
  assert.equal(rows.length, letters.length,
    `verify-sync 有 ${letters.join(",")} 段，但 migration.md 的表只列了 ${rows.join(",") || "无"}`);
});

test("README 两张现状表里抄下来的数字必须与实测一致", () => {
  /* 这一轮审出的 docs 缺陷几乎全是同一个形状：文档抄了一份测量值，代码继续走，
     数字就悄悄过期（146 个文件、20,110 B、31,806 B、`h2.sec-title=5`）。
     靠人记得去更新是失败的——所以把这几个数钉成断言：改了文件而没改 README，这里就红。
     只钉「能唯一对上某个真实测量」的那几个数，散文里的数量词不管。 */
  const bytes = (p) => statSync(join(ROOT, p)).size;
  const gz = (p) => gzipSync(readFileSync(join(ROOT, p))).length;
  const KB = (n) => Math.round(n / 102.4) / 10;          // 与 check-bytes.mjs 同一个口径
  const tracked = execFileSync("git", ["ls-files"], { cwd: ROOT, encoding: "utf8" })
    .trim().split("\n").filter(Boolean).length;
  const num = (s) => +s.replace(/,/g, "");
  // 按行取，不用全文正则：`20,621` / `36,107` 这种「数字 + B」的形状在好几行里都有，
  // 全文匹配会串台（第一版就把 CSS 那格匹配到了中英两页那格上）。
  /* 两份 README 都要查。上一版只查中文那份，于是英文那份的 `36,036` 在我改了 CSS
     之后仍写着旧值而全绿——同一张表抄两遍，就只有一半会被盯住。 */
  const DOCS = { "README.md": README_MD, "README.en.md": README_EN };
  /* 行标签可能是「中文或英文那一份的说法」，所以按正则匹配。
     第一版把 "中英两页字节|HTML size" 整串塞给 String.includes()，
     竖号被当字面量，于是四格全部「找不到这一格」——报的是版式变了，其实是匹配器写错。 */
  const rowOf = (doc, label) => {
    const re = label instanceof RegExp ? label : new RegExp(label);
    return doc.split("\n").find(l => l.startsWith("|") && re.test(l)) || "";
  };
  const checks = [
    ["跟踪文件数", tracked, "wc -l", false, /wc -l`? = ([\d,]+)/],
    ["中文页字节", bytes("index.html"), "中英两页字节|HTML size", false, /`([\d,]+)`[^\d]*`?[\d,]*`?/],
    ["英文页字节", bytes("en/index.html"), "中英两页字节|HTML size", false, /`[\d,]+`[^\d]+`([\d,]+)`/],
    ["CSS 字节", bytes("assets/css/style.css"), "全站 CSS|Site CSS", false, /`([\d,]+)` B/i],
    // 显示用的 KB 值也要查：改 CSS 那天我把 35.3 KB 误写成 352.6 KB，只比字节的版本放行了
    ["CSS 显示 KB", KB(bytes("assets/css/style.css")), "全站 CSS|Site CSS", true, /\*\*([\d.]+) KB\*\*\s*[（(]/],
    ["CSS gzip KB", KB(gz("assets/css/style.css")), "全站 CSS|Site CSS", true, /gzip \*\*([\d.]+) KB\*\*/],
  ];
  const bad = [];
  let done = 0;
  for (const [docName, doc] of Object.entries(DOCS)) {
    for (const [what, real, label, isKb, re] of checks) {
      const m = rowOf(doc, label).match(re);
      if (!m) { bad.push(`${docName} / ${what}：找不到这一格（行标签或版式变了）`); continue; }
      done++;
      const got = +num(m[1]);
      const okv = isKb ? Math.abs(got - real) <= 0.05 : got === real;
      if (!okv) bad.push(`${docName} / ${what}：README 写 ${m[1]}，实测 ${isKb ? real : real.toLocaleString("en-US")}`);
    }
  }
  assert.deepEqual(bad, [], bad.join("\n"));
  assert.equal(done, checks.length * Object.keys(DOCS).length,
    `只核对了 ${done} / ${checks.length * Object.keys(DOCS).length} 个数，README 表格大概改了版式`);
});

test("注释里不许留下已经被删掉的功能名（墨点 / 环境音 / 音量斜坡）", () => {
  const dead = ["墨点", "环境音", "音量斜坡", "sound-toggle", "ambient(", "fieldEnergy", "inkDot"];
  const hits = [];
  for (const [f, src] of [["assets/js/main.js", MAIN], ["assets/js/scene.js", SCENE], ["assets/css/style.css", CSS]]) {
    for (const d of dead) if (src.includes(d)) hits.push(`${f} 仍提到「${d}」`);
  }
  assert.deepEqual(hits, [], hits.join("；"));
});

/* ---- 下面四条是 2026-10-08 那轮评审查出来的缺陷类别，各自钉一条 ---- */

/* 这一条吸收了原先的「页面里所有 ?v= 是同一个值」：那条只看中英两页、
   且拿 <=1 判等，两个页面可以「一起没有指纹」而全绿。
   改成逐页要求 href/src 必须带指纹，再要求全站只有一个值。
   为什么这么严：nginx 长缓存按扩展名命中、与查询串无关，
   少一个 ?v= 就等于把旧字节钉一年——favicon 就是这么被 3,290 B 的旧图占住的。 */
test("每个被 HTML 直接取用的资源都带 ?v=，且全站只有同一个指纹", () => {
  const seen = {};
  for (const f of ["index.html", "en/index.html", "404.html"]) {
    const html = read(f);
    const refs = [...html.matchAll(/(?:href|src)="((?:\.\/|\.\.\/|\/)assets\/[^"]*)"/g)].map((m) => m[1]);
    const bare = refs.filter((u) => !/\?v=[0-9a-z]+/.test(u));
    assert.deepEqual(bare, [], `${f} 里这些资源没带指纹，改了内容也会被长缓存钉住：${bare.join(", ")}`);
    const vs = [...new Set(refs.map((u) => (u.match(/\?v=([0-9a-z]+)/) || [])[1]))];
    assert.equal(vs.length, 1, `${f} 上有 ${vs.length} 个指纹值：${vs.join(", ")}`);
    seen[f] = vs[0];
  }
  const uniq = [...new Set(Object.values(seen))];
  assert.equal(uniq.length, 1, `各页指纹不一致，说明有文件不在重写名单里：${JSON.stringify(seen)}`);
});

/* 行号是文档里最容易悄悄失效的一种引用：任何一次编辑都会让它指向别处，
   而它看起来仍然像证据。2026-10-08 抽查 design.md 的四处内部行号，三处已指错。
   上游仓库（profile / 纪念册 / GeoHot 的 README）的行号允许保留——那些是**带日期的取证快照**，
   本仓库里的文件则要求按引文或 `grep -n` 定位。 */
test("文档不许用行号指向本仓库的文件", () => {
  const OWN = /`((?:en\/)?index\.html|404\.html|assets\/[a-z0-9./-]+\.(?:js|css)|docs\/[a-z0-9.-]+\.md|[a-z-]+\.(?:md|sh|mjs|json|example)|LICENSE|style\.css|main\.js|scene\.js):\d+(?:[–-]\d+)?`/g;
  /* 中文那一式「`scripts/deploy.sh` 第 60 行」同一种病。这一式必须再验一步路径是否真的在本仓库里——
     「纪念册 `assets/map.js` 第 324–327 行」「`assets/style.css` 第 25 行」那些是**别的产品**的取证快照，
     行号钉在对方那天的字节上，本来就不该被本站的编辑冲掉。 */
  const CN = /`(\/?[a-z0-9./_-]+\/[a-z0-9._-]+|[a-z0-9._-]+\.(?:md|sh|mjs|js|css|json|example|html))`\s*第\s*\d+(?:[–-]\d+)?\s*行/g;
  const hits = [];
  for (const f of [...readdirSync(join(ROOT, "docs")).filter((x) => x.endsWith(".md")).map((x) => `docs/${x}`), "README.md", "README.en.md"]) {
    const doc = read(f);
    for (const m of doc.matchAll(OWN)) hits.push(`${f} → ${m[0]}`);
    for (const m of doc.matchAll(CN)) if (existsSync(join(ROOT, m[1]))) hits.push(`${f} → ${m[0]}`);
  }
  assert.deepEqual(hits, [], `这些地方在用行号引用本仓库文件，改一次代码就会指错：\n  ${hits.join("\n  ")}`);
});

/* design.md 把等宽栈逐字符抄了一遍。抄来的东西会烂——同一轮里令牌表就是这么错的。
   不要求它抄，只要求「抄了就必须对」。 */
test("文档里逐字抄的 CSS 片段必须仍在 CSS 里", () => {
  const cssPlain = CSS.replace(/\s+/g, "");
  const DOCS = { "design.md": read("docs/design.md"), "site-spec.md": SPEC_MD, "build-contract.md": CONTRACT_MD };
  const bad = [], quoted = [];
  for (const [name, doc] of Object.entries(DOCS))
    for (const m of doc.matchAll(/`([^`]*ui-monospace[^`]*)`/g)) {
      quoted.push(name);
      if (!cssPlain.includes(m[1].replace(/\s+/g, ""))) bad.push(`${name} 抄的等宽栈在 style.css 里已找不到：${m[1]}`);
    }
  // 一处都没抄的时候这条等于没跑——它保护的是「抄了就得对」，不是「可以不抄」。
  assert.ok(quoted.length > 0, "三份文档里没有任何一处逐字抄等宽栈，这条断言是空的");
  assert.deepEqual(bad, [], bad.join("\n"));
});

test("404.html 必须只用根绝对路径（它会被重写到任意深度）", () => {
  const rel = [...read("404.html").matchAll(/(?:href|src)="(\.\/[^"]*|\.\.\/[^"]*)"/g)].map((m) => m[1]);
  assert.deepEqual(rel, [], `错误页里出现了相对路径，嵌套 URL 下会解析错：${rel.join(", ")}`);
});

/* 图片声明的宽高决定布局占位，写错就是 CLS 与「按声明尺寸裁切」的隐患。 */
function intrinsic(p) {
  const b = readFileSync(join(ROOT, p));
  if (b[0] === 0x89 && b[1] === 0x50) return [b.readUInt32BE(16), b.readUInt32BE(20)];
  if (b[0] === 0xff && b[1] === 0xd8) {
    let o = 2;
    while (o < b.length) {
      if (b[o] !== 0xff) { o++; continue; }
      const m = b[o + 1];
      if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) return [b.readUInt16BE(o + 7), b.readUInt16BE(o + 5)];
      o += 2 + b.readUInt16BE(o + 2);
    }
    throw new Error("JPEG 里找不到 SOF");
  }
  if (b.subarray(0, 4).toString() === "RIFF") {
    const f = b.subarray(12, 16).toString("latin1");
    if (f === "VP8X") return [1 + (b[24] | b[25] << 8 | b[26] << 16), 1 + (b[27] | b[28] << 8 | b[29] << 16)];
    if (f === "VP8 ") return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff];
    const n = b.readUInt32LE(21);
    return [1 + (n & 0x3fff), 1 + ((n >> 14) & 0x3fff)];
  }
  throw new Error(`不认识的图片格式：${p}`);
}

test("HTML 里每个 <img> 声明的 width/height 与文件真实尺寸一致", () => {
  const bad = [], seen = [];
  for (const [page, html] of Object.entries(PAGES)) {
    for (const m of html.matchAll(/<img\b[^>]*>/g)) {
      const tag = m[0];
      // 必须容得下 ?v=：实际 src 是 "…webp?v=4019bf"，把结尾锚在文件名后的引号上会一张都匹配不上，
      // 测试就静默空跑（上一版正是这样，0/6 张被查过）。
      const src = (tag.match(/src="[^"]*\/([^"?#]+\.(?:jpe?g|png|webp|svg|ico))(?:\?[^"]*)?"/i) || [])[1];
      const w = +(tag.match(/width="(\d+)"/) || [])[1];
      const h = +(tag.match(/height="(\d+)"/) || [])[1];
      if (!src) continue;
      seen.push(src);
      if (!w || !h) { bad.push(`${page}: ${src} 缺 width/height`); continue; }
      const [aw, ah] = intrinsic(join("assets/images", src));
      if (aw !== w || ah !== h) bad.push(`${page}: ${src} 声明 ${w}×${h}，实际 ${aw}×${ah}`);
    }
  }
  assert.ok(seen.length >= 3, `只查到 ${seen.length} 张图（${seen.join(",") || "无"}），正则大概又和写法脱节了`);
  assert.deepEqual(bad, [], bad.join("；"));
});

test("头像的 alt 不许声称它是本人照片（那是站长选的一张标语海报）", () => {
  for (const [page, html] of Object.entries(PAGES)) {
    const tag = (html.match(/<img[^>]*avatar\.jpg[^>]*>/) || [""])[0];
    const alt = (tag.match(/alt="([^"]*)"/) || [])[1] || "";
    assert.ok(alt.length > 0, `${page}: 头像缺 alt`);
    // 禁的是「声称这是本人照片」，不是「头像」这个词——它确实是站长指定的头像图。
    assert.ok(!/照片|摄影|portrait|\bphoto\b/i.test(alt),
      `${page}: 头像 alt 把它说成本人照片了，图上是标语与无脸剪影："${alt}"`);
    assert.ok(/剪影|silhouette/.test(alt) && /标语|深红|crimson/.test(alt),
      `${page}: 头像 alt 应当描述「标语 + 剪影」这件实物，现在是："${alt}"`);
  }
});
