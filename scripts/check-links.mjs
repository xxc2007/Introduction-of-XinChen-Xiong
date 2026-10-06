// 链接与内容红线检查：站内链接必须可达、不得泄露主机信息、不得出现科研内容。
// 用法：node scripts/check-links.mjs [--net]   （--net 会对外链做 HEAD 探测，网络抖动时会有噪声）
import { readFileSync, existsSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, resolve, join } from "node:path";

const ROOT = resolve(new URL("..", import.meta.url).pathname.replace(/^\/(\w:)/, "$1"));
const files = execFileSync("git", ["ls-files"], { cwd: ROOT }).toString().trim().split("\n")
  .filter(f => /\.(html|css|js|mjs|md|xml|json|svg)$/.test(f));

const SECRET = [
  [/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/, "疑似源站公网 IP"],
  [/ssh\s+-i\s+\S+/, "SSH 登录命令"],
  [/\.pem\b/, "私钥文件名"],
  [/xxc@/, "SSH 登录名"],
];
const RESEARCH = [/论文|期刊|开题|毕业论文|文献|课题|青藏高原|气候变化研究|thesis|dissertation|journal|peer-review/i];

let fail = 0;
const bad = (f, msg) => { console.log(`  ✗ ${f}: ${msg}`); fail = 1; };
const external = new Map();

for (const f of files) {
  const text = readFileSync(join(ROOT, f), "utf8");
  const lines = text.split("\n");

  lines.forEach((line, i) => {
    // 占位符行（含 <server-ip> / <ssh-user> / <你的密钥>.pem）与示例文件本身就是模板，不参与泄露判定
    if (/[^\s"']<[^>]+>/.test(line) || f.endsWith(".example")) return;
    for (const [re, why] of SECRET) {
      if (re.test(line) && !/DEPLOY_HOST=<server-ip>/.test(line)) {
        // 允许占位符与 0.0.0.0 / 127.0.0.1 这类回环说明
        const ip = line.match(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/);
        if (ip && ["127.0.0.1", "0.0.0.0"].includes(ip[0])) continue;
        bad(f, `第 ${i + 1} 行含${why}（公开仓库不得出现）`);
      }
    }
    if (/\.(html|md)$/.test(f)) for (const re of RESEARCH) if (re.test(line)) bad(f, `第 ${i + 1} 行出现科研表述`);
  });

  if (!/\.(html|md)$/.test(f)) continue;
  for (const m of text.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const u = m[1];
    if (u.startsWith("mailto:") || u.startsWith("tel:") || u.startsWith("data:") || u === "#") continue;
    if (/^https?:\/\//.test(u)) {
      if (u.startsWith("http://")) bad(f, `明文外链 ${u}`);
      external.set(u, (external.get(u) ?? 0) + 1);
      continue;
    }
    if (u.startsWith("#")) {
      const id = u.slice(1);
      if (!new RegExp(`id="${id}"`).test(text) && !/^(top|main)$/.test(id)) bad(f, `页内锚点缺失 #${id}`);
      continue;
    }
    const clean = u.replace(/[?#].*$/, "");
    if (!clean) continue;
    const target = clean.startsWith("/")
      ? join(ROOT, clean.replace(/^\/+/, ""))
      : resolve(dirname(join(ROOT, f)), clean);
    const ok = existsSync(target) && (statSync(target).isDirectory() ? existsSync(join(target, "index.html")) : true);
    if (!ok) bad(f, `站内链接指向不存在的文件 ${u}`);
  }
}

if (process.argv.includes("--net")) {
  console.log("── 外链探测");
  for (const u of external.keys()) {
    if (!/^(https:\/\/(x\.com|www\.youtube\.com|space\.bilibili\.com|www\.douyin\.com|www\.xiaohongshu\.com|github\.com|xxc2007\.me))/.test(u)) continue;
    const code = execFileSync("curl", ["-s", "-o", "/dev/null", "-w", "%{http_code}", "-L", "--max-time", "20", "-A", "Mozilla/5.0", u]).toString().trim();
    if (/^(200|302|403)$/.test(code)) console.log(`  ✓ ${code} ${u}`);
    else bad("net", `${code} ${u}`);
  }
}

console.log(fail ? "LINKS FAILED" : "LINKS OK");
process.exit(fail);
