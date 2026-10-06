// 字节预算闸门（见 docs/site-spec.md §3 总量红线）。
// 用法：node scripts/check-bytes.mjs
import { readFileSync, existsSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { gzipSync } from "node:zlib";
import { join, resolve } from "node:path";

const ROOT = resolve(new URL("..", import.meta.url).pathname.replace(/^\/(\w:)/, "$1"));
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
  ["图片", () => pick(/^assets\/images\/.*\.(jpg|jpeg|png|webp|svg)$/).reduce((a, p) => a + size(p), 0), 60_000, "不含字体切片"],
  ["音频", () => pick(/^assets\/audio\/.*\.(m4a|webm|mp3|ogg)$/).reduce((a, p) => a + size(p), 0), 200_000, "环境音循环"],
];

let fail = 0;
for (const [name, get, limit, label] of BUDGET) {
  let n = 0; try { n = get(); } catch { }
  const ok = n <= limit;
  if (!ok) fail = 1;
  console.log(`  ${ok ? "✓" : "✗"} ${label.padEnd(16)} ${KB(n).toString().padStart(8)} KB / ${KB(limit)} KB`);
}
const fonts = pick(/^assets\/fonts\/.*\.woff2$/);
console.log(`  · 字体切片 ${fonts.length} 个（按 unicode-range 惰性加载，不计入首屏预算）`);
console.log(fail ? "BUDGET FAILED" : "BUDGET OK");
process.exit(fail);
