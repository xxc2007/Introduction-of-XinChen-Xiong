// 中英双页防漂移：节标数量、锚点集合、链接集合、图片集合必须一一对应。
// 用法：node scripts/check-parity.mjs
import { readFileSync } from "node:fs";

const ZH = "index.html", EN = "en/index.html";
const grab = (html, re) => [...html.matchAll(re)].map(m => m[1]);
const load = p => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

const pages = { ZH: load(ZH), EN: load(EN) };
const ids = h => grab(h, /\bid="([^"]+)"/g).filter(i => !i.startsWith("tpl-"));
const anchors = h => grab(h, /href="#([^"]+)"/g);
const internal = h => grab(h, /(?:href|src)="(?!#|https?:|mailto:|data:)([^"]+)"/g).map(u => u.replace(/[#?].*$/, ""));
const external = h => grab(h, /href="(https?:\/\/[^"]+)"/g);
const sections = h => grab(h, /<h2[^>]*>/g).length;
const images = h => grab(h, /<img[^>]+src="([^"]+)"/g);

let fail = 0;
const eq = (name, a, b, cmp = (x, y) => x === y, show = v => String(v)) => {
  if (cmp(a, b)) { console.log(`  ✓ ${name}`); return; }
  console.log(`  ✗ ${name}: ZH=${show(a)} EN=${show(b)}`); fail = 1;
};
const sameSet = (x, y) => {
  const sx = [...new Set(x)].sort(), sy = [...new Set(y)].sort();
  return sx.length === sy.length && sx.every((v, i) => v === sy[i]);
};
const diffSet = (x, y) => [...new Set(x)].filter(v => !new Set(y).has(v));

console.log("── 中英页结构对齐");
eq("h2 节标数量", sections(pages.ZH), sections(pages.EN));
eq("锚点 id 集合", ids(pages.ZH), ids(pages.EN), sameSet, v => [...new Set(v)].join(","));
eq("页内跳转集合", anchors(pages.ZH), anchors(pages.EN), sameSet, v => [...new Set(v)].join(","));
eq("站内资源集合", internal(pages.ZH).map(u => u.replace(/^(\.\.\/)+/, "")),
   internal(pages.EN).map(u => u.replace(/^(\.\.\/)+/, "")), sameSet,
   v => diffSet(internal(pages.ZH), internal(pages.EN)).join(",") || "…");
eq("外链集合（社媒/项目）", external(pages.ZH), external(pages.EN), sameSet,
   v => diffSet(external(pages.ZH), external(pages.EN)).join(" | ") || "…");
eq("图片集合", images(pages.ZH), images(pages.EN), sameSet, v => [...new Set(v)].join(","));

console.log("── 语言元信息");
eq("中文页 lang=zh-CN", /<html lang="zh-CN"/.test(pages.ZH), true);
eq("英文页 lang=en", /<html lang="en"/.test(pages.EN), true);
for (const [k, h] of Object.entries(pages)) {
  const canon = grab(h, /<link rel="canonical" href="([^"]+)"/);
  eq(`${k} canonical 恰好一条`, canon.length, 1);
  const hl = grab(h, /hreflang="([^"]+)"/g);
  eq(`${k} hreflang 含 zh-Hans / en / x-default`, ["zh-Hans", "en", "x-default"].every(v => hl.includes(v)), true);
}

console.log(fail ? "PARITY FAILED" : "PARITY OK");
process.exit(fail);
