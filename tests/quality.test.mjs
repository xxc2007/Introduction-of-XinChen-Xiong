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

test("reduced-motion 必须覆盖每一个 @keyframes", () => {
  const names = [...CSS.matchAll(/@keyframes\s+([a-zA-Z0-9_-]+)/g)].map((m) => m[1]);
  assert.ok(names.length > 0, "没解析出任何 @keyframes，说明这条断言本身失效了");
  const block = CSS.match(/@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{([\s\S]*)\}\s*$/);
  assert.ok(block, "找不到 prefers-reduced-motion 块");
  const body = block[1];
  // 块内那条 *{animation-duration:.001ms!important} 是总兜底；
  // 但只有兜底不够——用了 animation:none 之外的显式动画仍会留下位移，所以逐个查。
  const unneutralized = names.filter((n) => {
    const usedOutside = new RegExp(`animation[^;]*\\b${n}\\b`).test(body.replace(/@media[\s\S]*$/, ""));
    const handled = new RegExp(`animation[^;]*none`).test(body) || new RegExp(`\\b${n}\\b`).test(body);
    return usedOutside && !handled;
  });
  assert.deepEqual(unneutralized, [], `这些动画在 reduced-motion 下没被处理：${unneutralized.join(", ")}`);
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
    for (const m of html.matchAll(/<img\b[^>]*>/g)) if (!/\balt=/.test(m[0])) problems.push(`${name}: <img> 无 alt`);
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

test("令牌对比度：承载正文的色档必须过 AA，装饰色档必须被识别为不可承载文字", () => {
  for (const t of ["--ink", "--muted", "--terra-ink", "--terra-ink-2"]) {
    assert.ok(TOKENS[t], `style.css 的 :root 里找不到 ${t}`);
    for (const bg of ["--cream", "--paper"]) {
      const r = ratio(TOKENS[t], TOKENS[bg]);
      assert.ok(r >= 4.5, `${t}(${TOKENS[t]}) 对 ${bg} 只有 ${r.toFixed(3)}:1，低于 AA 的 4.5`);
    }
  }
  // 亮赤陶橙只能当线、点、底色用；它当文字一定不达标，这条把「为什么另设 --terra-ink」钉住。
  const rt = ratio(TOKENS["--terra"], TOKENS["--cream"]);
  assert.ok(rt < 3, `--terra 对 cream 有 ${rt.toFixed(3)}:1，与「不可承载文字」的约定不再一致，注释要重写`);
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
  const bad = [];
  for (const [page, html] of Object.entries(PAGES)) {
    const dir = page.startsWith("en") ? "en/" : "";
    for (const m of html.matchAll(/<img\b[^>]*>/g)) {
      const tag = m[0];
      const src = (tag.match(/src="[^"]*?\/([^"?]+\.(?:jpg|jpeg|png|webp|svg))"/i) || [])[1];
      const w = +(tag.match(/width="(\d+)"/) || [])[1];
      const h = +(tag.match(/height="(\d+)"/) || [])[1];
      if (!src || !w || !h) continue;
      const [aw, ah] = intrinsic(join("assets/images", src));
      if (aw !== w || ah !== h) bad.push(`${page}: ${src} 声明 ${w}×${h}，实际 ${aw}×${ah}`);
    }
  }
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
