// 链接与内容红线检查：站内链接必须可达、不得泄露主机信息、不得出现科研内容。
// 用法：node scripts/check-links.mjs [--net]   （--net 会对外链做 HEAD 探测，网络抖动时会有噪声）
import { readFileSync, existsSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, resolve, join } from "node:path";

const ROOT = resolve(process.cwd());
/* SSH 登录名不写进仓库：从本地 .deploy.env 读；读不到就没有这条规则 */
const sshUser = (() => {
  try { return (readFileSync(join(ROOT, ".deploy.env"), "utf8").match(/DEPLOY_USER=(\S+)/) || [])[1] || ""; } catch { return ""; }
})();
/* 先转义登录名里的正则元字符，再拼出「user@」这条规则。 */
const sshUserRe = sshUser ? new RegExp(sshUser.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '@') : null;
const files = execFileSync("git", ["ls-files"], { cwd: ROOT }).toString().trim().split("\n")
  .filter(f => /\.(html|css|js|mjs|md|xml|json|svg)$/.test(f));

const SECRET = [
  [/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/, "疑似源站公网 IP"],
  [/ssh\s+-i\s+\S+/, "SSH 登录命令"],
  /* 规则源码里不能出现触发串本身，否则这条规则会命中自己这个文件。
     拆成两个片段拼接：读代码的人一眼能看懂，规则源码里也不含完整触发串。 */
  [new RegExp("\\.pe" + "m\\b"), "私钥文件名"],
  [sshUserRe, "SSH 登录名"],
];
const RESEARCH = [/论文|期刊|开题|毕业论文|文献|课题|青藏高原|气候变化研究|thesis|dissertation|journal|peer-review/i];
/* .deploy.env 不在仓库里：换机器跑时 sshUserRe 会是 null，不过滤掉会让规则循环抛 TypeError */
const SECRET_RULES = SECRET.filter((r) => r[0]);
/* 但"过滤掉"不能让这条规则静默消失——那样绿灯会被读成"三条红线都查过"。
   干净克隆里没有登录名可泄（.deploy.env 不随仓库走），所以这里只报状态、不判失败。 */
if (!sshUser) console.log("  ! 未读到 .deploy.env：SSH 登录名这条红线本次未生效（其余规则照常）。部署机上有这个文件，所以在真正会推上线的那次运行里它是生效的。");

let fail = 0;
const bad = (f, msg) => { console.log(`  ✗ ${f}: ${msg}`); fail = 1; };
const external = new Map();

for (const f of files) {
  /* 已删除但尚未提交的文件仍在 git ls-files 里；这里必须跳过而不是抛异常——
     异常会让整条红线检查在崩溃前的一条规则上静默中止（曾经真实发生）。 */
  if (!existsSync(join(ROOT, f))) { console.log(`  ! ${f}: 在工作区缺失（等待提交的删除），跳过`); continue; }
  const text = readFileSync(join(ROOT, f), "utf8");
  const lines = text.split("\n");

  lines.forEach((line, i) => {
    // 占位符行（含尖括号形式的占位符）与 .example 模板文件本身就该带占位符，不参与泄露判定
    if (/[^\s"']<[^>]+>/.test(line) || f.endsWith(".example")) return;
    /* certbot 的标准证书路径不是泄密：那行证书指令指向的是服务器上的证书目录，
       任何人装完 certbot 都会写下同样的一行，路径本身不含密钥内容。
       要防的是把访客身份绑进仓库——登录命令带着自己的密钥文件名那种。 */
    if (/\/etc\/letsencrypt\//.test(line)) return;
    // 本脚本自己写着这些正则，扫自己必然命中
    for (const [re, why] of SECRET_RULES) {
      if (re.test(line) && !/DEPLOY_HOST=<server-ip>/.test(line)) {
        // 允许占位符与 0.0.0.0 / 127.0.0.1 这类回环说明
        const ip = line.match(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/);
        if (ip && ["127.0.0.1", "0.0.0.0"].includes(ip[0])) continue;
        bad(f, `第 ${i + 1} 行含${why}（公开仓库不得出现）`);
      }
    }
    // 科研红线只管读者会看到的文件；docs/ 里的「不写什么」清单必须点出这些词才管得住后来人
    if (/^(index\.html|en\/index\.html|404\.html|README\.md|README\.en\.md)$/.test(f))
      for (const re of RESEARCH) if (re.test(line)) bad(f, `第 ${i + 1} 行出现科研表述`);
  });

  if (!/\.html$/.test(f)) continue;
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
    // 邻站与后端：这些前缀不在本仓库里，由 nginx 路由到别处，只要求写成绝对路径
    if (/^\/(nc15|geohot|comment|promo)(\/|$)/.test(clean)) continue;
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
