// 字节预算闸门（见 docs/site-spec.md §3 总量红线）。
// 用法：node scripts/check-bytes.mjs
import { readFileSync, existsSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { gzipSync } from "node:zlib";
import { join, resolve } from "node:path";

const ROOT = resolve(process.cwd());
const files = execFileSync("git", ["ls-files"], { cwd: ROOT }).toString().trim().split("\n");
const KB = n => Math.round(n / 102.4) / 10;
const gz = p => gzipSync(readFileSync(join(ROOT, p))).length;
const size = p => statSync(join(ROOT, p)).size;
const pick = re => files.filter(f => re.test(f));

const BUDGET = [
  ["index.html", () => size("index.html"), 60_000, "HTML 中文页"],
  ["en/index.html", () => size("en/index.html"), 60_000, "HTML 英文页"],
  ["assets/css/*.css", () => pick(/^assets\/css\/.*\.css$/).reduce((a, p) => a + size(p), 0), 45_000, "CSS 合计"],
  ["assets/js(自有)", () => pick(/^assets\/js\/.*\.js$/).reduce((a, p) => a + gz(p), 0), 30_000, "自有 JS gzip"],
  ["首屏 JS 合计", () => pick(/^assets\/(js|vendor)\/.*\.js$/).reduce((a, p) => a + gz(p), 0), 200_000, "含 Three.js gzip"],
  ["首屏图片", () => pick(/^assets\/images\/(avatar|shot)[^/]*\.(jpg|jpeg|png|webp)$/).reduce((a, p) => a + size(p), 0), 90_000, "头像 + 两张作品截图"],
  ["爬虫素材", () => pick(/^assets\/images\/(og-card|banner|favicon)[^/]*\.(jpg|jpeg|png|webp|svg)$/).reduce((a, p) => a + size(p), 0), 200_000, "不进首屏，只算仓库体积"],
];

let fail = 0;
for (const [name, get, limit, label] of BUDGET) {
  /* 读不到就是没测过，不能算 0 通过：上一版 try{...}catch{} 把异常咽了，
     n 停在 0，于是打印成「✓ 0 KB」再 BUDGET OK exit 0——
     被删掉或改名的文件反而给出最绿的一次运行。 */
  let n = null, err = null;
  try { n = get(); } catch (e) { err = e; }
  if (err !== null || n === 0) {
    fail = 1;
    console.log(`  ✗ ${label.padEnd(16)} ${"测不到".padStart(8)}    / ${KB(limit)} KB${err ? `  ← ${err.message}` : "  ← 命中 0 个文件，大概是路径或文件名变了"}`);
    continue;
  }
  const ok = n <= limit;
  if (!ok) fail = 1;
  console.log(`  ${ok ? "✓" : "✗"} ${label.padEnd(16)} ${KB(n).toString().padStart(8)} KB / ${KB(limit)} KB`);
}
const fonts = pick(/^assets\/fonts\/.*\.woff2$/);
if (!fonts.length) { fail = 1; console.log("  ✗ 字体切片 0 个——自托管字体大概整个丢了，不是「不计入预算」"); }
else console.log(`  · 字体切片 ${fonts.length} 个（按 unicode-range 惰性加载，不计入首屏预算）`);
console.log(fail ? "BUDGET FAILED" : "BUDGET OK");
process.exit(fail);
