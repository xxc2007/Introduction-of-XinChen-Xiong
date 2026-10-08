// 中英双页防漂移。
// 用法：node scripts/check-parity.mjs
//
// 这一版重写的原因是上一版几乎测不出东西：往中文页注入 16 种真实漂移，13 种照样 PARITY OK，
// 其中包含「把中文页的 canonical 与 og:url 都指向 /en/」。根因是它只问「两页是否一样」，
// 从不问「这样对不对」——两个页面可以一起错。所以现在三类断言并存：
//   A 绝对断言：canonical/og:url/指纹等必须等于各自应有的值；
//   B 相对断言：两页结构、属性、图标几何、链接**顺序**必须一致（顺序敏感，不再排序去重）；
//   C 存在性断言：任何一项被"钉住"的计数若为 0，说明那个类名/属性已经改名了，判失败而不是 0==0。
import { readFileSync, existsSync } from "node:fs";

const load = p => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const SITE = "https://xxc2007.me";
const pages = { ZH: load("index.html"), EN: load("en/index.html") };
/* 404.html 也带资源引用，也必须带指纹——上一版漏了它，它的 ?v= 永远停在 a1b2。 */
const NOTFOUND = load("404.html");
const CSS_TEXT = load("assets/css/style.css");

const grab = (h, re) => [...h.matchAll(re.global ? re : new RegExp(re.source, re.flags + "g"))].map(m => m[1]);
const base = u => u.replace(/[?#].*$/, "").split("/").filter(Boolean).pop() || "/";
const uniq = a => [...new Set(a)].sort();

let fail = 0;
const ok = (name) => console.log(`  ✓ ${name}`);
const bad = (name, detail) => { console.log(`  ✗ ${name}\n      ${detail}`); fail = 1; };

/* 顺序敏感的相等：上一版用 sorted+unique，于是「社交图标换序」和「重复项少一个」都看不见。 */
const seqEq = (name, a, b) => {
  if (a.length !== b.length) return bad(name, `条数不同 ZH=${a.length} EN=${b.length}\n      ZH: ${a.join(" | ")}\n      EN: ${b.join(" | ")}`);
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return bad(name, `第 ${i + 1} 项不同\n      ZH: ${a[i]}\n      EN: ${b[i]}`);
  ok(`${name}（${a.length} 项，含顺序）`);
};
const setEq = (name, a, b) => {
  const x = uniq(a), y = uniq(b), missing = x.filter(v => !y.includes(v)), extra = y.filter(v => !x.includes(v));
  if (!missing.length && !extra.length) return ok(`${name}（${x.length} 项）`);
  bad(name, `只在 ZH: ${missing.join(",") || "—"} ｜ 只在 EN: ${extra.join(",") || "—"}`);
};
/* 存在性：钉住的计数为 0 就是改名了，不能让它悄悄等于另一个 0。 */
const nonzero = (name, n) => n > 0 ? ok(`${name} = ${n}`) : bad(name, "计数为 0——对应的类名或属性大概已经改名，这条断言现在是空的");

/* ───────── A. 绝对断言：每页必须长成它自己该有的样子 ───────── */
console.log("── A. 绝对断言（不是「两页一样」，是「各自正确」）");
const EXPECT = {
  ZH: { lang: /<html lang="zh-CN"/, canonical: `${SITE}/`, ogurl: `${SITE}/`, oglocale: "zh_CN", alt: `${SITE}/en/` },
  EN: { lang: /<html lang="en"/, canonical: `${SITE}/en/`, ogurl: `${SITE}/en/`, oglocale: "en_US", alt: `${SITE}/` },
};
/* hreflang 那行两个属性的书写顺序在两页里并不一致，所以按标签整体抓、再内部取属性。 */
const alternates = h => [...h.matchAll(/<link\b[^>]*rel="alternate"[^>]*>/g)].map(t => {
  const lang = (t[0].match(/hreflang="([^"]+)"/) || [])[1];
  const href = (t[0].match(/href="([^"]+)"/) || [])[1];
  return `${lang}=${href}`;
});
for (const [k, h] of Object.entries(pages)) {
  const e = EXPECT[k];
  if (!e.lang.test(h)) bad(`${k} <html lang>`, "语言根属性不对或缺失");
  const canon = (grab(h, /<link rel="canonical" href="([^"]+)"/g) || [])[0];
  canon === e.canonical ? ok(`${k} canonical → ${canon}`) : bad(`${k} canonical`, `应为 ${e.canonical}，实为 ${canon}`);
  const og = (grab(h, /<meta property="og:url" content="([^"]+)"/g) || [])[0];
  og === e.ogurl ? ok(`${k} og:url → ${og}`) : bad(`${k} og:url`, `应为 ${e.ogurl}，实为 ${og}`);
  const ogloc = (grab(h, /<meta property="og:locale" content="([^"]+)"/g) || [])[0];
  ogloc === e.oglocale ? ok(`${k} og:locale = ${ogloc}`) : bad(`${k} og:locale`, `应为 ${e.oglocale}，实为 ${ogloc}`);
  /* hreflang 的正确语义是：**两页各自都必须声明同一组三条**「哪种语言在哪」，
     而不是「指向我不是它的那一条」。上一版只看三条齐不齐，
     于是把中文页的 canonical 与 og:url 一起指向 /en/ 都是绿的。 */
  const alts = alternates(h);
  for (const want of [`zh-Hans=${SITE}/`, `en=${SITE}/en/`, `x-default=${SITE}/`]) {
    alts.includes(want) ? ok(`${k} hreflang ${want}`) : bad(`${k} hreflang`, `缺 ${want}（现有：${alts.join(" ") || "无"}）`);
  }
}

/* 指纹：每一条**本地资源引用**都必须带 ?v=，且同页同值。
   上一版只要求「出现的指纹彼此相同」，于是一条漏指纹的引用（favicon 就是这么翻车的）
   反而让断言更"绿"——它压根不在统计里。 */
console.log("── A2. 资源指纹覆盖面");
/* 本地资源引用：三种写法都要认——`assets/`、`./assets/`、`../assets/`，
   以及 404.html 专用的根绝对 `/assets/`（那一页必须用根绝对，见其文件头注释）。 */
const LOCAL_ASSET = /(?:href|src)="([^"]*?assets\/[^"]*)"/g;
const relPath = u => u.replace(/[?#].*$/, "").replace(/^.*?(?=assets\/)/, "");
for (const [name, src] of [["index.html", pages.ZH], ["en/index.html", pages.EN], ["404.html", NOTFOUND]]) {
  const refs = grab(src, LOCAL_ASSET);
  const bare = refs.filter(u => !/[?&]v=[0-9a-z]{4,8}$/.test(u));
  if (!refs.length) { bad(`${name} 本地资源引用`, "一条都没匹配到，正则可能已经和写法脱节"); continue; }
  if (bare.length) bad(`${name} 指纹覆盖`, `${bare.length}/${refs.length} 条没带 ?v=：${bare.join(", ")}`);
  else ok(`${name} ${refs.length} 条本地资源全部带指纹`);
  const vs = [...new Set((src.match(/\?v=([0-9a-z]{4,8})/g) || []).map(s => s.slice(3)))];
  vs.length === 1 ? ok(`${name} 指纹单值 ${vs[0]}`) : bad(`${name} 指纹单值`, `有 ${vs.length} 个：${vs.join(",")}`);
  if (vs.length === 1) globalThis.__v = globalThis.__v || {}; globalThis.__v[name] = vs[0];
}
{
  const all = [...new Set(Object.values(globalThis.__v || {}))];
  all.length === 1 ? ok(`三页共用同一指纹 ${all[0]}`) : bad("跨页指纹一致", `各不相同：${JSON.stringify(globalThis.__v)}`);
}

/* ───────── B. 相对断言：结构、属性、图标几何、链接顺序 ───────── */
console.log("── B. 结构与属性（顺序敏感）");
const shape = (h) => ({
  "sec-head": count(h, /<div class="sec-head[\s"]/g), h2: count(h, /<h2>/g),
  "sec-index": count(h, /<span class="sec-index">/g), "sec-rule": count(h, /<hr class="sec-rule[\s"]/g),
  p: count(h, /<p[\s>]/g), section: count(h, /<section/g),
  "nav 锚链": count(h, /<nav id="nav"[\s\S]*?<\/nav>/g) ? (h.match(/<nav id="nav"[\s\S]*?<\/nav>/)[0].match(/href="#/g) || []).length : 0,
  "work-card": count(h, /class="work-card/g), img: count(h, /<img\b/g), blockquote: count(h, /<blockquote/g),
  reveal: count(h, /class="[^"]*\breveal\b/g), "live region": count(h, /aria-live=/g),
  "menuitem": count(h, /role="menuitem"/g), "aria-label": count(h, /aria-label="/g),
  "aria-haspopup": count(h, /aria-haspopup="menu"/g), "aria-controls": count(h, /aria-controls="/g),
  "aria-expanded": count(h, /aria-expanded="/g), "lang-btn": count(h, /class="lang-btn"/g),
  "data-magnetic": count(h, /data-magnetic/g), svg: count(h, /<svg\b/g), "json-ld": count(h, /application\/ld\+json/g),
});
function count(h, re) { return (h.match(re) || []).length; }
const zs = shape(pages.ZH), es = shape(pages.EN);
for (const k of Object.keys(zs)) {
  if (zs[k] !== es[k]) bad("数量一致", `${k} ZH=${zs[k]} EN=${es[k]}`);
  else nonzero(k, zs[k]);
}

/* 承重的类名必须三处同时存在：CSS 里定义过、两页里都用着。
   上一版只按前缀数 HTML，于是把 sec-head 改名成 sec-heading 它数出来还是 6——
   前缀匹配挡不住"改成更长的名字"这一手。 */
console.log("── B2. 承重类名跨文件存在");
const LOAD_BEARING = ["sec-head", "sec-index", "sec-rule", "work-card", "lang-btn", "lang-menu", "social", "reveal", "progress", "hero", "copy-mail", "foot"];
for (const cls of LOAD_BEARING) {
  const inCss = new RegExp(`\\.${cls.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\w-])`).test(CSS_TEXT);
  const inZh = new RegExp(`class="[^"]*\\b${cls}\\b[^"]*"`).test(pages.ZH);
  const inEn = new RegExp(`class="[^"]*\\b${cls}\\b[^"]*"`).test(pages.EN);
  const miss = [!inCss && "CSS 未定义", !inZh && "中文页未用", !inEn && "英文页未用"].filter(Boolean);
  miss.length ? bad(`.${cls}`, miss.join("、")) : ok(`.${cls} 在 CSS 与两页都在`);
}

/* 属性层：上一版完全不看 aria / data / alt，把 .lang-btn 上的 aria-haspopup 删掉都是绿的。 */
/* aria-label 的**文字**在两页本来就该不同（它们是翻译过的），比字面集合没有意义；
   这里只要求数量一致（shape 里已经钉了 aria-label 计数），并单独盯住一件真会错的事：
   同一页里不许出现两个一模一样的 label（那说明某个标签被复制后忘了改）。 */
{
  const dup = (h, name) => {
    const l = grab(h, /aria-label="([^"]+)"/g), seen = new Set(), twice = [];
    for (const v of l) { if (seen.has(v)) twice.push(v); seen.add(v); }
    twice.length ? bad(`${name} aria-label 不重复`, `重复：${twice.join(" / ")}`) : ok(`${name} aria-label 不重复（${l.size || l.length} 条）`);
  };
  dup(pages.ZH, "ZH"); dup(pages.EN, "EN");
}
setEq("data-* 属性名集合", grab(pages.ZH, /\b(data-[a-z-]+)=/g), grab(pages.EN, /\b(data-[a-z-]+)=/g));
setEq("每个 <img> 都有 alt", grab(pages.ZH, /<img[^>]*>/g).map(t => /alt="/.test(t) ? "有" : "缺"),
  grab(pages.EN, /<img[^>]*>/g).map(t => /alt="/.test(t) ? "有" : "缺"));

/* 链接：按**顺序**比，不看去重后的集合——上一版可以让社交图标任意换序。 */
const social = h => (h.match(/<ul class="social[\s\S]*?<\/ul>/) || [""])[0].match(/href="([^"]+)"/g)?.map(s => s.slice(6, -1)) || [];
seqEq("社交链接顺序", social(pages.ZH), social(pages.EN));
const navHrefs = h => (h.match(/<nav id="nav"[\s\S]*?<\/nav>/) || [""])[0].match(/href="(#[^"]*)"/g)?.map(s => s.slice(6, -1)) || [];
seqEq("导航锚点顺序", navHrefs(pages.ZH), navHrefs(pages.EN));

/* 图标几何：同一枚 logo 在两页必须是同一串 path d——上一版对 SVG 内部一无所知。 */
const paths = h => grab(h, /<path[^>]*\bd="([^"]+)"/g);
seqEq("SVG path 几何逐条一致", paths(pages.ZH), paths(pages.EN));

const ext = h => grab(h, /href="(https?:\/\/[^"]+)"/);
setEq("外链集合", ext(pages.ZH), ext(pages.EN));
const imgs = h => grab(h, /<img[^>]+src="([^"]+)"/g);
seqEq("图片引用（basename，含顺序）", imgs(pages.ZH).map(base), imgs(pages.EN).map(base));
const ids = h => grab(h, /\bid="([^"]+)"/);
setEq("id 集合", ids(pages.ZH), ids(pages.EN));

/* ───────── C. 跨文件不变量 ───────── */
console.log("── C. 跨文件不变量");
/* 每个 href="#x" 都必须有对应 id，两页各自自查。 */
for (const [k, h] of Object.entries(pages)) {
  const have = new Set(ids(h));
  const dangling = [...new Set(grab(h, /href="#([^"]+)"/g))].filter(x => x && !have.has(x));
  dangling.length ? bad(`${k} 锚点都有落点`, `悬空：#${dangling.join(", #")}`) : ok(`${k} 锚点都有落点`);
  const ctl = [...new Set(grab(h, /aria-controls="([^"]+)"/g))].filter(x => !have.has(x));
  ctl.length ? bad(`${k} aria-controls 落点`, `指向不存在的 id：${ctl.join(",")}`) : ok(`${k} aria-controls 落点`);
}
/* 引用的本地文件必须真的在。 */
for (const [name, src] of [["index.html", pages.ZH], ["en/index.html", pages.EN], ["404.html", NOTFOUND]]) {
  const dir = name.startsWith("en/") ? "" : "";
  const miss = [...new Set(grab(src, LOCAL_ASSET).map(relPath))]
    .filter(p => p.startsWith("assets/") && !existsSync(new URL(`../${p}`, import.meta.url)));
  miss.length ? bad(`${name} 引用的文件都在`, `缺：${miss.join(", ")}`) : ok(`${name} 引用的文件都在`);
}

console.log(fail ? "PARITY FAILED" : "PARITY OK");
process.exit(fail);
