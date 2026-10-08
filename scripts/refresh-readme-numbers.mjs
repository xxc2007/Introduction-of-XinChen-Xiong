#!/usr/bin/env node
/* 把两份 README「现状」表里抄着的测量值重新算一遍。
   为什么要这个脚本：tests/quality.test.mjs 有一条断言会逐个比对 README 的数字与
   git ls-files / statSync / gzipSync 的实测值——这是故意的（文档抄测量值必然过期）。
   但每次改一行 CSS 都要手工重算六个数、还要保证中英两份一致，容易出错：
   本轮就把 35.3 KB 误写成过 352.6 KB。所以算的事交给脚本，判断留给断言。

   跑法：node scripts/refresh-readme-numbers.mjs [--check]
     默认写回文件；--check 只报告哪些数过期（不改文件），退出码 1。 */
import { readFileSync, writeFileSync, statSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { execFileSync } from "node:child_process";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const KB = (n) => Math.round(n / 102.4) / 10;                 // 与 check-bytes.mjs 同一口径
const bytes = (p) => statSync(join(ROOT, p)).size;
const gz = (p) => gzipSync(readFileSync(join(ROOT, p))).length;
const grp = (n) => n.toLocaleString("en-US");
const tracked = execFileSync("git", ["ls-files"], { cwd: ROOT, encoding: "utf8" })
  .trim().split("\n").filter(Boolean).length;

const V = {
  tracked,
  zh: bytes("index.html"), en: bytes("en/index.html"),
  css: bytes("assets/css/style.css"), cssKb: KB(bytes("assets/css/style.css")),
  cssGzKb: KB(gz("assets/css/style.css")),
};

/* 每份 README 的写法不同（中文用「（N B）」、英文用 "(N bytes)"），
   所以按行标签定位、用各自的模板替换。 */
const SPEC = {
  "README.md": [
    { label: "仓库文件", re: /(git ls-files \\\| wc -l`? = )[\d,]+/, out: `$1${grp(V.tracked)}` },
    { label: "仓库文件", re: /索引与工作区同为 \*\*[\d,]+\*\* 个/, out: `索引与工作区同为 **${grp(V.tracked)}** 个` },
    { label: "中英两页字节", re: /\*\*[\d.]+ KB \/ [\d.]+ KB\*\*（`[\d,]+` \/ `[\d,]+` B）/,
      out: `**${KB(V.zh)} KB / ${KB(V.en)} KB**（\`${grp(V.zh)}\` / \`${grp(V.en)}\` B）` },
    { label: "全站 CSS", re: /\*\*[\d.]+ KB\*\*（`[\d,]+` B）· gzip \*\*[\d.]+ KB\*\*/,
      out: `**${V.cssKb} KB**（\`${grp(V.css)}\` B）· gzip **${V.cssGzKb} KB**` },
  ],
  "README.en.md": [
    { label: "Repository files", re: /\*\*[\d,]+\*\*, identical/, out: `**${grp(V.tracked)}**, identical` },
    { label: "Repository files", re: /(git ls-files \\\| wc -l`? = )[\d,]+/, out: `$1${grp(V.tracked)}` },
    { label: "HTML size", re: /\*\*[\d.]+ KB \/ [\d.]+ KB\*\* \(`[\d,]+` \/ `[\d,]+` bytes\)/,
      out: `**${KB(V.zh)} KB / ${KB(V.en)} KB** (\`${grp(V.zh)}\` / \`${grp(V.en)}\` bytes)` },
    { label: "Site CSS", re: /\*\*[\d.]+ KB\*\* \(`[\d,]+` bytes\) · gzip \*\*[\d.]+ KB\*\*/,
      out: `**${V.cssKb} KB** (\`${grp(V.css)}\` bytes) · gzip **${V.cssGzKb} KB**` },
  ],
};

const check = process.argv.includes("--check");
let stale = 0, applied = 0;
for (const [file, rules] of Object.entries(SPEC)) {
  const path = join(ROOT, file);
  const lines = readFileSync(path, "utf8").split("\n");
  for (const r of rules) {
    const i = lines.findIndex(l => l.startsWith("|") && l.includes(r.label));
    if (i < 0) { console.log(`  ! ${file}：找不到「${r.label}」这一行，模板可能变了`); stale++; continue; }
    if (!r.re.test(lines[i])) { console.log(`  ! ${file} / ${r.label}：格子里的数式对不上，需要人工看一眼`); stale++; continue; }
    const next = lines[i].replace(r.re, r.out);
    if (next === lines[i]) { console.log(`  ✓ ${file} / ${r.label}`); continue; }
    console.log(`  ~ ${file} / ${r.label}\n      旧 ${lines[i].trim().slice(0, 74)}\n      新 ${next.trim().slice(0, 74)}`);
    stale++;
    if (!check) { lines[i] = next; applied++; }
  }
  if (!check && applied) writeFileSync(path, lines.join("\n"));
}
console.log(stale
  ? (check ? `\n${stale} 处与实测不符（--check 未写回）` : `\n已刷新 ${applied} 处；跑 node --test "tests/*.test.mjs" 复验`)
  : "\nREADME 的数字全部与实测一致");
process.exit(stale && check ? 1 : 0);
