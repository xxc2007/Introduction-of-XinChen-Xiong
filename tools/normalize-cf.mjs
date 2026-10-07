// 把 HTML 归一化到「去掉 Cloudflare 邮箱混淆后的等价形态」，用于源站↔公网比对。
// 用法：node tools/normalize-cf.mjs <文件>   （从 stdin 读则传 -）
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";

const src = process.argv.slice(2).find(a => a !== "--diff");
let t = src === "-" || !src ? readFileSync(0, "utf8") : readFileSync(src, "utf8");

t = t
  // CF 注入的解码脚本
  .replace(/<script data-cfasync="false" src="\/cdn-cgi\/scripts\/[^"]*email-decode\.min\.js"><\/script>/g, "")
  // CF 把 mailto 换成的保护链接（整段被替换成 span 占位的形式）
  .replace(/<a[^>]*href="\/cdn-cgi\/l\/email-protection#[0-9a-f]*"[^>]*><span class="__cf_email__" data-cfemail="[0-9a-f]*">\[[^\]]*\]<\/span><\/a>/g, "MAILTO")
  // 同一件事的另一种形态：仓库里的可见文本已经用实体编码（&#64;）写过，
  // CF 就只改 href、原样保留可见文本，所以这条也必须归一到 MAILTO。
  .replace(/<a[^>]*href="\/cdn-cgi\/l\/email-protection#[0-9a-f]*"[^>]*>(?:[^<]|&#\d+;)*<\/a>/g, "MAILTO")
  // 仓库里真实的 mailto
  .replace(/<a[^>]*href="mailto:([^"]+)"[^>]*>[^<]*<\/a>/g, "MAILTO");

const hash = createHash("sha256").update(t).digest("hex");
if (process.argv.includes("--diff")) process.stdout.write(t);
else console.log(hash);
