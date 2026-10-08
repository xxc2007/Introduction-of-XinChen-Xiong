/* 质量闸门：把「大家都会看一眼、但没人会去核对」的约定钉成断言。
   跑法：node --test tests/          （无依赖、无浏览器、不联网、不碰服务器）

   为什么要有这个文件：这个仓库没有构建步骤也没有测试，全部正确性靠人眼。
   下面每条断言都对应一个真实存在过或可能存在过的缺陷类别——
   JS 与 CSS 各说各话、注释描述的功能已经被删掉、reduced-motion 漏掉某个动画。 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(ROOT, p), "utf8");

const CSS = read("assets/css/style.css");
const MAIN = read("assets/js/main.js");
const SCENE = read("assets/js/scene.js");
const HTML_ZH = read("index.html");
const HTML_EN = read("en/index.html");
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
  const before = CSS_CODE.slice(0, at);
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
  // ④ 每个被使用的动画名，都要么被显式 animation:none，要么落进总兜底
  const names = [...new Set([...before.matchAll(/@keyframes\s+([\w-]+)/g)].map(m => m[1]))];
  assert.ok(names.length > 0, "没解析出 @keyframes，这条断言本身失效了");
  const noneSelectors = [...body.matchAll(/([^{}]+)\{[^}]*animation\s*:\s*none/g)].map(m => m[1]);
  const uncovered = names.filter(n => {
    const usedBy = [...before.matchAll(new RegExp(`([^{}]+)\\{[^}]*animation[^}]*\\b${n}\\b`, "g"))].map(m => m[1].trim());
    return usedBy.length && !usedBy.every(sel =>
      noneSelectors.some(ns => ns.split(",").map(x => x.trim()).includes(sel)));
  });
  // 有总兜底时未显式关闭不算错（duration 已被压成 0）；但兜底一旦被人删掉，这条立刻指出是谁。
  assert.ok(uncovered.length === 0 || /animation-duration\s*:\s*\.?0/.test(body),
    `这些动画既没显式关闭、又没有总兜底：${uncovered.join(", ")}`);
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

test("页面里所有 ?v= 指纹是同一个值", () => {
  for (const [name, html] of Object.entries(PAGES)) {
    const vs = [...new Set((html.match(/\?v=([0-9a-z]+)/g) || []).map((s) => s.slice(3)))];
    assert.equal(vs.length, 1, `${name} 上有 ${vs.length} 个指纹值：${vs.join(", ")}`);
  }
  const zhV = (HTML_ZH.match(/\?v=([0-9a-z]+)/) || [])[1];
  const enV = (HTML_EN.match(/\?v=([0-9a-z]+)/) || [])[1];
  assert.equal(zhV, enV, "两页的指纹值必须相同，否则一次部署只刷新一边");
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

test("压在粒子场上的文字必须过 AA（--muted 与裸 --terra-ink 都不许）", () => {
  /* 首屏文字直接压在 WebGL 画布上，一颗墨色纸屑就能把底压暗：
     cream+一颗 12% 墨屑 = #d7d5ce，--terra-ink 在这上面只剩 3.916、--muted 只剩 4.286。
     所以场上文字要么用 --ink，要么自己带一张不透光的纸（.hero-cta 就是这么解决的）。 */
  const speck = over(TOKENS["--cream"], TOKENS["--ink"], 0.12);
  assert.ok(ratio(TOKENS["--muted"], speck) < 4.5,
    `--muted 对最坏画布底已有 ${ratio(TOKENS["--muted"], speck).toFixed(3)}:1，若达标可放宽 hero 的限制`);

  // 按选择器把规则合并：.hero-cta 的颜色在 124 行、背景在 127 行，分开看会误判它裸露。
  const bySel = new Map();
  for (const m of CSS_CODE.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
    for (const sel of m[1].split(",").map(s => s.trim().replace(/\s+/g, " ")).filter(Boolean)) {
      if (!/^\.(hero[\w-]*|scroll-cue)\b/.test(sel)) continue;
      bySel.set(sel, (bySel.get(sel) || "") + ";" + m[2]);
    }
  }
  assert.ok(bySel.size >= 2, `只认出 ${bySel.size} 条 hero 规则，选择器解析大概脱节了`);

  /* .hero-cta:hover  inherits the opaque background declared on plain .hero-cta —
     CSS 层叠里伪类规则并不重新声明背景，所以这里逐层剥掉伪类再合并一次。
     不剥的话悬停态会被当成"裸在画布上"，报出一个并不存在的缺陷。 */
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
  const bad = [];
  for (const sel of bySel.keys()) {
    const decls = merged(sel);
    // 取第一条命中 = 最贴近该选择器的那条规则；伪类自身的声明压得过基类。
    const tok = (decls.match(/(?:^|;)\s*color:\s*var\(--([\w-]+)\)/) || [])[1];
    if (!tok) continue;                       // 没显式写色 = 继承 --ink，本来就是最稳的一档
    const solid = (decls.match(/(?:^|;)\s*background:\s*var\(--([\w-]+)\)(?![\w-])/) || [])[1];
    const bg = solid ? TOKENS[`--${solid}`] : speck;
    const r = ratio(TOKENS[`--${tok}`], bg);
    if (r < 4.5) bad.push(`${sel}: --${tok} 对 ${bg} 只有 ${r.toFixed(3)}:1`);
  }
  assert.deepEqual(bad, [], "画布上的文字掉出 AA：\n" + bad.join("\n"));
});

/* 染色底与文字档位的配对：从 CSS 里反推真实存在的组合，而不是凭空造一个最坏情况。
   上一版把 --terra-ink 放在 cream+12% 的合成底上量到 4.443 报了红——但那条组合
   其实是 .lang-menu 悬停（底色是 --paper 不是 --cream，真实值 4.840，是过的）。
   与其守一个不存在的合成底，不如把「染色底必须降档」写成可直接扫 CSS 的规则。 */
test("染上赤陶橙底的规则不许再用 --terra-ink 承载文字（必须降到 --terra-ink-2）", () => {
  const TINTED_INK = [];
  const pairs = [];
  for (const m of CSS_CODE.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
    const sel = m[1].trim().replace(/\s+/g, " ");
    const ink = (m[2].match(/color:\s*var\(--(terra-ink(?:-2)?)\)/) || [])[1];
    const alpha = parseFloat((m[2].match(/background:\s*rgba\(\s*217,\s*119,\s*87,\s*\.?(\d+)/) || [])[1]);
    if (!ink || !alpha) continue;
    pairs.push({ sel, ink, alpha: alpha / 100 });
    if (ink === "terra-ink") TINTED_INK.push(`${sel}（alpha .${alpha}）`);
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
  // 磁吸元素从 CSS 反推，不写死类名：写死的话换个选择器写法（a[data-magnetic]）就绕过了。
  const MAGNETIC = [...new Set(
    [...CSS_CODE.matchAll(/([^{}]+)\{[^}]*translate\s*:[^}]*var\(\s*--mx/g)].map(m => m[1])
      .flatMap(sel => sel.split(",").map(s => s.trim()).filter(Boolean))
  )];
  assert.ok(MAGNETIC.length >= 3, `只从 CSS 认出 ${MAGNETIC.length} 个磁吸选择器，解析大概脱节了：${MAGNETIC.join(",")}`);
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
    if (used.length && sels.some(s => MAGNETIC.some(c => s.includes(c)))) {
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

  const refs = (text) => [...text.matchAll(/\/\*([\s\S]*?)\*\//g)]
    .flatMap(m => [...m[1].matchAll(/([#.][\w-]+(?:\[[^\]]*\])?(?::[\w-]+)?)\s*\{([-a-z]+\s*:[^}]*)\}/g)]
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

test("HTML 上挂的每个 class 都必须有出处（style.css 或本页内联 <style>）", () => {
  /* 404 页的 <h1 class="sec-title"> 就是个例子：.sec-title 与 .num 从来没被任何样式表定义过，
     于是那行标题一直是裸的——但页面「看起来没问题」，因为浏览器给了 h1 默认字号。
     这类缺陷人眼看不出来，只能反过来查：从 HTML 收集类名，逐个问 CSS 认不认。 */
  const defined = new Set(
    [...CSS_CODE.matchAll(/\.-?[_a-zA-Z][\w-]*/g)].map(m => m[0].slice(1))
  );
  // 三个页面都查（404 才是上次出问题的那页），内联 <style> 里定义的也算
  const ALL = { ...PAGES, "404.html": read("404.html") };
  for (const html of Object.values(ALL)) {
    const inline = (html.match(/<style>([\s\S]*?)<\/style>/) || [])[1] || "";
    for (const m of inline.matchAll(/\.-?[_a-zA-Z][\w-]*/g)) defined.add(m[0].slice(1));
  }
  const bad = [];
  const scanned = new Set();
  for (const [name, html] of Object.entries(ALL)) {
    for (const m of html.matchAll(/\bclass="([^"]+)"/g)) {
      for (const c of m[1].trim().split(/\s+/)) {
        if (!c) continue;
        scanned.add(`${name}::${c}`);
        if (defined.has(c)) continue;
        const k = `${name}:${c}`;
        if (!bad.some(b => b.includes(k))) bad.push(`${name}: .${c}（没有任何样式表定义它）`);
      }
    }
  }
  assert.ok(scanned.size > 40, `只扫到 ${scanned.size} 个类名，解析大概脱节了`);
  assert.deepEqual(bad, [], bad.join("\n"));
});

test("英文页的缩写用印刷体撇号（’），不用直撇号（'）", () => {
  /* 中文页全角标点本来就是对的；英文页早先混着直撇号（haven't / I'm / site's），
     与整站的排版取向不一致。这条只盯英文页，不碰属性分隔用的引号。 */
  const straight = [...HTML_EN.matchAll(/[A-Za-z]'[A-Za-z]/g)].map(m => m[0]);
  assert.deepEqual(straight, [], `英文页还有 ${straight.length} 处直撇号：${straight.join(", ")}`);
  const curly = [...HTML_EN.matchAll(/[A-Za-z]’[A-Za-z]/g)].map(m => m[0]);
  assert.ok(curly.length >= 3, `只找到 ${curly.length} 处印刷体撇号，正则或页面大概脱节了`);
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

test("CSS 里定义的每个 class 都必须有人用（HTML 挂着它，或 JS 会加上去）", () => {
  /* .sr-only 定义了却没有任何元素用它；.lang-menu 的 [aria-selected] 那一半也是死的——
     菜单只写 aria-current（main.js:233/344），从没写过 aria-selected。
     死规则不会让页面出错，但它让下一个读 CSS 的人以为存在另一条路径，
     于是「选中态有 aria-selected 和 aria-current 两种写法要照顾」这种负担会一直传下去。 */
  const ALL = { ...PAGES, "404.html": read("404.html") };
  const used = new Set();
  for (const html of Object.values(ALL)) {
    for (const m of html.matchAll(/\bclass="([^"]+)"/g)) for (const c of m[1].trim().split(/\s+/)) used.add(c);
  }
  // JS 会用 classList 或 className 加上去的类名同样算「有人用」
  for (const m of (MAIN + SCENE).matchAll(/classList\.(?:add|remove|toggle|contains|replace)\(([^)]*)\)/g)) {
    for (const lit of m[1].matchAll(/['"]([^'"]+)['"]/g)) for (const c of lit[1].split(/\s+/)) used.add(c);
  }
  for (const m of (MAIN + SCENE).matchAll(/\.className\s*=\s*['"]([^'"]+)['"]/g)) {
    for (const c of m[1].split(/\s+/)) used.add(c);
  }
  const defined = new Set(
    [...CSS_CODE.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)].map(m => m[1])
  );
  for (const html of Object.values(ALL)) {
    const inline = (html.match(/<style>([\s\S]*?)<\/style>/) || [])[1] || "";
    // 内联块里的注释是散文（404 那段就写着「style.css 加载成功时…」），
    // 不剥掉的话 "css" 会被当成一个定义过的类名。
    for (const m of inline.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)) defined.add(m[1]);
  }
  const dead = [...defined].filter(c => !used.has(c)).sort();
  assert.ok(defined.size > 30, `只解析出 ${defined.size} 个 class 定义，解析脱节了`);
  assert.deepEqual(dead, [], `这些类在任何样式表里定义了，却没有任何元素使用：${dead.join(", ")}`);
});

test("注释里不许留下已经被删掉的功能名（墨点 / 环境音 / 音量斜坡）", () => {  const dead = ["墨点", "环境音", "音量斜坡", "sound-toggle", "ambient(", "fieldEnergy", "inkDot"];
  const hits = [];
  for (const [f, src] of [["assets/js/main.js", MAIN], ["assets/js/scene.js", SCENE], ["assets/css/style.css", CSS]]) {
    for (const d of dead) if (src.includes(d)) hits.push(`${f} 仍提到「${d}」`);
  }
  assert.deepEqual(hits, [], hits.join("；"));
});

/* ---- 下面四条是 2026-10-08 那轮评审查出来的缺陷类别，各自钉一条 ---- */

test("三个 HTML 文件共用同一个 ?v= 指纹（404.html 曾被漏在重写名单外）", () => {
  const seen = {};
  for (const f of ["index.html", "en/index.html", "404.html"]) {
    const vs = [...new Set((read(f).match(/\?v=([0-9a-z]+)/g) || []).map((s) => s.slice(3)))];
    assert.ok(vs.length <= 1, `${f} 内部就有 ${vs.length} 个指纹值：${vs.join(", ")}`);
    if (vs.length) seen[f] = vs[0];
  }
  const uniq = [...new Set(Object.values(seen))];
  assert.equal(uniq.length, 1, `各页指纹不一致，说明有文件不在重写名单里：${JSON.stringify(seen)}`);
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
