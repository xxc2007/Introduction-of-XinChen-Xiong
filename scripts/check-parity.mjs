// 中英双页防漂移：结构数量与资源集合必须一一对应。
// 语言互链（./en/ 与 ../）按设计就是不同的，因此比较一律用 basename。
// 用法：node scripts/check-parity.mjs
import { readFileSync } from "node:fs";

const load = p => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const pages = { ZH: load("index.html"), EN: load("en/index.html") };

const grab = (h, re) => [...h.matchAll(re.global ? re : new RegExp(re.source, re.flags + "g"))].map(m => m[1]);
const base = u => u.replace(/[?#].*$/, "").split("/").filter(Boolean).pop() || "/";
const uniq = a => [...new Set(a)].sort();
const same = (a, b) => { const x = uniq(a), y = uniq(b); return x.length === y.length && x.every((v, i) => v === y[i]); };
const diff = (a, b) => { const y = new Set(uniq(b)); return uniq(a).filter(v => !y.has(v)); };

let fail = 0;
const eq = (name, a, b, cmp = same, show = v => uniq(v).join(",")) => {
  if (cmp(a, b)) { console.log(`  ✓ ${name}`); return; }
  console.log(`  ✗ ${name}\n      ZH: ${show(a)}\n      EN: ${show(b)}`);
  fail = 1;
};
const count = (h, re) => (h.match(re) || []).length;

console.log("── 结构数量");
for (const [k, h] of Object.entries(pages)) {
  const n = {
    "h2.sec-title": count(h, /<h2 class="sec-title/g),
    section: count(h, /<section/g),
    "nav 链接": count(h, /<nav id="nav"[\s\S]*?<\/nav>/g) ? (h.match(/<nav id="nav"[\s\S]*?<\/nav>/)[0].match(/href="#/g) || []).length : 0,
    "work-card": count(h, /class="work-card/g),
    "social li": (h.match(/<ul class="social[\s\S]*?<\/ul>/) || [""])[0].match(/<li>/g)?.length ?? 0,
    img: count(h, /<img\b/g),
    blockquote: count(h, /<blockquote/g),
    "dl.facts 行": (h.match(/<dl class="facts[\s\S]*?<\/dl>/) || [""])[0].match(/<div>/g)?.length ?? 0,
    "ol.steps 项": (h.match(/<ol class="steps[\s\S]*?<\/ol>/) || [""])[0].match(/<li>/g)?.length ?? 0,
    reveal: count(h, /class="[^"]*\breveal\b/g),
  };
  pages[`${k}_n`] = n;
  console.log(`  ${k}: ${Object.entries(n).map(([a, b]) => `${a}=${b}`).join(" ")}`);
}
const keys = Object.keys(pages.ZH_n);
for (const k of keys) {
  if (pages.ZH_n[k] !== pages.EN_n[k]) { console.log(`  ✗ 数量不一致：${k} ZH=${pages.ZH_n[k]} EN=${pages.EN_n[k]}`); fail = 1; }
}
if (!fail) console.log(`  ✓ 全部 ${keys.length} 项数量一致`);

console.log("── 资源与链接（按 basename 比较）");
const assets = h => grab(h, /(?:href|src)="(?!#|https?:|mailto:|data:)([^"]+)"/g)
  .filter(u => !["./", "../", "./en/", "../en/", "./index.html", "../index.html"].includes(u.replace(/\?.*$/, "")));
const imgs = h => grab(h, /<img[^>]+src="([^"]+)"/g);
const ext = h => grab(h, /href="(https?:\/\/[^"]+)"/);
const anchors = h => grab(h, /href="#([^"]+)"/);
const ids = h => grab(h, /\bid="([^"]+)"/);
eq("站内资源", assets(pages.ZH).map(base), assets(pages.EN).map(base));
eq("图片", imgs(pages.ZH).map(base), imgs(pages.EN).map(base));
eq("外链集合", ext(pages.ZH), ext(pages.EN));
eq("页内锚点", anchors(pages.ZH), anchors(pages.EN));
eq("id 集合", ids(pages.ZH), ids(pages.EN));

console.log("── 语言元信息");
eq("中文页 lang=zh-CN", /<html lang="zh-CN"/.test(pages.ZH), true, (a, b) => a === b);
eq("英文页 lang=en", /<html lang="en"/.test(pages.EN), true, (a, b) => a === b);
for (const [k, h] of Object.entries({ ZH: pages.ZH, EN: pages.EN })) {
  const canon = grab(h, /<link rel="canonical" href="([^"]+)"/g);
  eq(`${k} canonical 恰好一条`, canon.length, 1, (a, b) => a === b);
  const hl = grab(h, /hreflang="([^"]+)"/g);
  eq(`${k} hreflang 齐备`, ["zh-Hans", "en", "x-default"].every(v => hl.includes(v)), true, (a, b) => a === b);
  eq(`${k} 版本串一致`, new Set(grab(h, /\?v=([0-9a-z]+)"/g)).size, 1, (a, b) => a === b);
}
console.log(fail ? "PARITY FAILED" : "PARITY OK");
process.exit(fail);
