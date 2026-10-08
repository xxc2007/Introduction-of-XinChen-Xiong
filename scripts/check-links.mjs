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
/* 扩展名白名单必须含 example/conf：下面那条「.example 文件允许带占位符」的豁免
   一直落在一个从来没被扫过的文件上——deploy/nginx.conf.example 当时根本不在清单里，
   豁免是死代码，而那份文件里写个真 IP 或真私钥路径没人看。
   现在它被扫，豁免才真的只在「占位符形状」这一种情况生效。 */
const files = execFileSync("git", ["ls-files"], { cwd: ROOT }).toString().trim().split("\n")
  .filter(f => /\.(html|css|js|mjs|md|xml|json|svg|conf|example)$/.test(f));

/* 「四段点分数字」不能只按形状匹配：SVG 的 path d 数据里满是 5.243.002.03 这类连写数字，
   上一版的 \b 在点和数字之间也算边界，于是社交图标的 path 被当成公网 IP，
   而且占位符豁免（return）把整行跳过——两边一起漏。
   这里按 IPv4 的字面定义匹配：每段 0-255、不许有前导零、前后不挨数字或点。
   末尾多允许一个点：FQDN 的绝对写法（四段之后再跟一个点）浏览器照样解析，不该成为藏身处。
   注：本文件与 check-mutations.mjs 里不写任何完整的点分四段示例地址——
   写了就会被这条规则命中，而规则不该为「这只是注释」开口子，见下面的 SELF 说明。 */
const IPISH = /(?:^|[^0-9.])((?!0\d)(?:25[0-5]|2[0-4]\d|1?\d?\d)(?:\.(?!0\d)(?:25[0-5]|2[0-4]\d|1?\d?\d)){3})\.?(?![0-9.])/g;
const LOOPBACK = new Set(["127.0.0.1", "0.0.0.0"]);
/* 每条规则返回「本行所有命中的串」（数组，可为空），而不是布尔、也不是第一个匹配：
   只取第一个匹配的话，「本地回环 + 源站公网地址」写在同一行时第一个是回环、
   被豁免后真 IP 就跟着溜过去了。白名单必须逐串判。 */
const allOf = (re) => (line) => (line.match(re) || []).slice(0);
const firstGrp = (re) => (line) => [...line.matchAll(re)].map(m => m[1] ?? m[0]);
const SECRET = [
  [firstGrp(IPISH), "疑似源站公网 IP", (v) => LOOPBACK.has(v)],
  [firstGrp(/ssh\s+-i\s+(\S+)/g), "SSH 登录命令"],
  /* 规则源码里不能出现触发串本身，否则这条规则会命中自己这个文件。
     拆成两个片段拼接：读代码的人一眼能看懂，规则源码里也不含完整触发串。 */
  [firstGrp(new RegExp("([\\w./-]*\\.pe" + "m)\\b", "g")), "私钥文件名"],
  sshUserRe ? [allOf(new RegExp(sshUserRe.source + "@?", "g")), "SSH 登录名"] : null,
];
const RESEARCH = [/论文|期刊|开题|毕业论文|文献|课题|青藏高原|气候变化研究|thesis|dissertation|journal|peer-review/i];
/* 读者会看到的文件：科研红线只管这些（docs/ 里的「不写什么」清单必须点出这些词才管得住后来人）。 */
const READER_FILES = /^(index\.html|en\/index\.html|404\.html|README\.md|README\.en\.md)$/;
/* 允许出现占位符的文件：文档、部署模板。站点文件不在列——它们没有「模板占位符」这种豁免。 */
const DOC_FILES = /(^|\/)(docs|deploy)\//;
const PLACEHOLDER = /<[a-z][a-z0-9-]*>/;
/* .deploy.env 不在仓库里：换机器跑时 sshUserRe 会是 null，不过滤掉会让规则循环抛 TypeError */
/* 规则统一成 hit(line) → 命中的串 | null，外加一个可选的 allow(串) 豁免谓词。 */
const SECRET_RULES = SECRET.filter((r) => r).map(([hit, why, allow]) => ({ why, hit, allow: allow || null }));
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
    /* 科研红线不管占位符：它查的是读者看到的正文，正文里不存在「这行是模板所以豁免」。
       放在豁免之前判，是因为上一版的 return 把这两条一起跳过了。 */
    if (READER_FILES.test(f))
      for (const re of RESEARCH) if (re.test(line)) bad(f, `第 ${i + 1} 行出现科研表述`);

    /* 占位符豁免只给「本来就该写占位符」的文件，而且要求形状真是占位符（<server-ip> 这类小写标识）。
       以前判的是「这一行有尖括号」——HTML/SVG 几乎每行都有尖括号，
       于是 222 行里有 71 行整行免检：往正文或 SVG path 里塞一个可路由的公网 IP，它照绿。 */
    if ((DOC_FILES.test(f) || f.endsWith(".example")) && PLACEHOLDER.test(line)) return;
    /* certbot 的标准证书路径不是泄密：那行证书指令指向的是服务器上的证书目录，
       任何人装完 certbot 都会写下同样的一行，路径本身不含密钥内容。
       要防的是把访客身份绑进仓库——登录命令带着自己的密钥文件名那种。 */
    if (DOC_FILES.test(f) && /\/etc\/letsencrypt\//.test(line)) return;
    for (const rule of SECRET_RULES) {
      /* 白名单只作用于 IP 这一条，且只豁免它自己那一处匹配。
         旧写法是「这一行里有 127.0.0.1 就 continue」——放行的是整行：
         「本地回环 + 源站公网地址」同行时，真 IP 会跟着回环一起被放行，
         而且 continue 跳的是整行，连私钥文件名、SSH 登录名那两条也不再查。 */
      for (const hit of rule.hit(line)) {
        if (rule.allow && rule.allow(hit)) continue;
        bad(f, `第 ${i + 1} 行含${rule.why}（公开仓库不得出现）`);
        break;                       // 同一行同一规则只报一次，避免刷屏
      }
    }
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
