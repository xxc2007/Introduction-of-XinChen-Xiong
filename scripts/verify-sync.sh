#!/usr/bin/env bash
# 四方逐字节核验：本地 HEAD ↔ GitHub 远端树 ↔ 服务器文件 ↔ 公网（CDN）取回的字节
# 用法：bash scripts/verify-sync.sh
set -uo pipefail
cd "$(dirname "$0")/.."
[ -f .deploy.env ] && { set -a; . ./.deploy.env; set +a; }
: "${DEPLOY_HOST:?缺少 .deploy.env}"; : "${DEPLOY_USER:?}"; : "${DEPLOY_ROOT:?}"
DEPLOY_SITE="${DEPLOY_SITE:-xxc2007.me}"
SSH_KEY="$(cygpath -w "${DEPLOY_KEY/#\~/$HOME}" 2>/dev/null || echo "$DEPLOY_KEY")"
KH="${DEPLOY_KNOWN_HOSTS:-$HOME/.ssh/known_hosts}"
SSH_OPTS="-o BatchMode=yes -o StrictHostKeyChecking=accept-new -i $SSH_KEY -o UserKnownHostsFile=$KH"
REPO="${GH_REPO:-xxc2007/Introduction-of-XinChen-Xiong}"
DEPLOYED="index.html en 404.html robots.txt sitemap.xml assets"
FAIL=0

files() { git ls-tree -r --name-only HEAD | grep -E '^('"$(echo "$DEPLOYED" | tr ' ' '|')"')(/|$)'; }

echo "── A. 本地 HEAD ↔ 服务器"
LIST="$(files)"; N=$(printf '%s\n' "$LIST" | grep -c .)
# 空清单必须判红：LIST 为空时 LOCAL 与 REMOTE 都是空串，下面的等式天然成立，
# 于是这一段会打印「✓ 0 个文件全部一致」并放绿——E 段早就堵了这个洞，A 段漏了。
# 触发条件很现实：DEPLOYED 改过一个名字、或部署集被 gitignore 掉，grep 就返回空。
if [ "$N" -eq 0 ]; then
  echo "  ✗ 部署集里一个文件都没列出来（DEPLOYED 与仓库结构对不上？），这一段等于没跑"
  FAIL=1
else
LOCAL="$(while read -r f; do printf '%s  %s\n' "$(sha256sum "$f" | cut -d' ' -f1)" "$f"; done <<< "$LIST" | sort -k2)"
REMOTE="$(ssh $SSH_OPTS "$DEPLOY_USER@$DEPLOY_HOST" "cd $DEPLOY_ROOT && while read -r f; do [ -f \"\$f\" ] && printf '%s  %s\n' \"\$(sha256sum \"\$f\" | cut -d' ' -f1)\" \"\$f\"; done" <<< "$LIST" | sort -k2)"
# 远端一条都没取回，通常是 ssh 通了但 DEPLOY_ROOT 指错了地方——那也是「没跑」，不是一致
if [ -z "$(printf '%s' "$REMOTE" | tr -d '[:space:]')" ]; then
  echo "  ✗ 服务器上没有返回任何文件的哈希（\$DEPLOY_ROOT 是否存在且可读？）"
  FAIL=1
elif [ "$LOCAL" = "$REMOTE" ]; then echo "  ✓ $N 个文件全部一致"
else echo "  ✗ 差异："; diff <(printf '%s\n' "$LOCAL") <(printf '%s\n' "$REMOTE") | head -20; FAIL=1; fi
fi

echo "── B. 本地 HEAD ↔ GitHub 仓库树"
# 原来这里比的是「本地 tree 哈希 ↔ gh api git/trees/HEAD 的 .sha」，而那个接口在 HEAD 这种
# 写法下回来的是 commit 的 sha（实测两次都是 0170a18…，等于 HEAD），于是永远报「树哈希不同」——
# 一条恒红的检查等于没有检查，还会把真差异埋进它的回退分支里。
# 现在两句话：先比 HEAD（判等就一句话），再逐个比部署集里每个文件的 git blob sha。
LOCAL_HEAD="$(git rev-parse HEAD)"
GH_HEAD="$(gh api "repos/$REPO/commits/HEAD" --jq '.sha' 2>/dev/null || true)"
if [ -z "$GH_HEAD" ]; then echo "  ! 取不到远端 HEAD（网络或仓库未建）"; FAIL=1
elif [ "$GH_HEAD" = "$LOCAL_HEAD" ]; then echo "  ✓ 远端 HEAD 与本地同一个提交 $LOCAL_HEAD"
else echo "  ✗ 远端 HEAD 是 $GH_HEAD，本地是 $LOCAL_HEAD（没推上去，或推上去的不是这一份）"; FAIL=1; fi
if [ -n "$GH_HEAD" ]; then
  echo "  └ 逐文件比对部署集："
  gh api "repos/$REPO/git/trees/HEAD?recursive=1" --jq '.tree[] | select(.type=="blob") | "\(.sha) \(.path)"' \
    | sort -k2 > /tmp/gh-blobs.txt
  BAD=0
  while read -r f; do
    l="$(git cat-file blob "HEAD:$f" | sha256sum | cut -d' ' -f1)"
    g="$(grep -m1 " $f\$" /tmp/gh-blobs.txt | cut -d' ' -f1)"
    [ -n "$g" ] || { echo "    缺 $f"; BAD=1; continue; }
    s="$(git rev-parse "HEAD:$f")"   # git blob sha == github blob sha
    [ "$s" = "$g" ] || { echo "    异 $f"; BAD=1; }
  done <<< "$LIST"
  [ "$BAD" = 0 ] && echo "  ✓ 部署集内 $N 个 blob 与远端一致（README/docs 等非部署文件不计）" || FAIL=1
fi

echo "── C. 本地 ↔ 源站（绕过 CDN，逐字节）"
NC=0
for f in index.html en/index.html assets/css/style.css assets/js/main.js; do
  [ -f "$f" ] || { echo "  ✗ 仓库里没有 $f，这一段本该比它"; FAIL=1; continue; }
  l="$(sha256sum "$f" | cut -d' ' -f1)"
  case "$f" in index.html) u="/";; en/index.html) u="/en/";; *) u="/$f";; esac
  r="$(ssh $SSH_OPTS "$DEPLOY_USER@$DEPLOY_HOST" "curl -s -H 'Host: $DEPLOY_SITE' 'http://127.0.0.1$u'" | sha256sum | cut -d' ' -f1)"
  NC=$((NC+1))
  if [ "$l" = "$r" ]; then echo "  ✓ $u 与仓库字节一致"
  else echo "  ✗ $u 源站取回与仓库不一致"; FAIL=1; fi
done
# 同上：一条都没比过就不许算绿
[ "$NC" -gt 0 ] || { echo "  ✗ C 段一条都没比（文件全不在仓库里）"; FAIL=1; }

echo "── D. 本地 ↔ 公网（经 Cloudflare）"
UA="Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126 Safari/537.36"
# Cloudflare 的 Email Address Obfuscation 会改写 mailto: 并注入 email-decode.min.js，
# 这是站点级功能不是缓存陈旧，比对前先归一化掉。
# 归一化只有 tools/normalize-cf.mjs 这一份实现：这里以前另写了一串 sed，
# 结果是「脚本说公网不一致、手工比对说一致」——两份规则各自漂移，谁也不知道该信谁。
cf_norm() { node tools/normalize-cf.mjs --diff -; }
# 两侧都过 cf_norm 有个致命后果：万一 normalize-cf.mjs 或 node 本身坏了，
# 两边都变成 sha256("") ——同一个值，于是无论 CDN 服务什么内容都报「一致」。
# 所以先自证归一化器是活的：给它一段确定含 mailto 的输入，必须吐出非空且不同于空串哈希的结果。
NORM_PROBE="$(printf 'mailto:a@b' | cf_norm | tr -d '\n')"
if [ -z "$NORM_PROBE" ]; then
  echo "  ✗ 归一化器 tools/normalize-cf.mjs 没有输出——D 段无从判断，本次不判绿"
  FAIL=1
else
for f in index.html en/index.html; do
  [ -f "$f" ] || continue
  case "$f" in index.html) u="/";; *) u="/en/";; esac
  l="$(cf_norm < "$f" | tr -d '\n' | sha256sum | cut -d' ' -f1)"
  net="$(curl -sL --max-time 25 -A "$UA" "https://$DEPLOY_SITE$u")"
  # 空响应既可能是网络死了也可能是 CDN 真给了空页；两种都不该被哈希成「一致」。
  if [ -z "$net" ]; then echo "  ✗ $u 公网取回为空（网络或 CDN 故障，不能判一致）"; FAIL=1; continue; fi
  r="$(printf '%s' "$net" | cf_norm | tr -d '\n' | sha256sum | cut -d' ' -f1)"
  if [ "$l" = "$r" ]; then echo "  ✓ $u 公网取回与仓库一致（已忽略 CF 邮箱混淆）"
  else echo "  ✗ $u 公网与仓库不一致（CDN 命中旧副本）"; FAIL=1; fi
done
fi

echo "── E. 公网逐个取回「浏览器真正会去取的那些资源 URL」"
# 这一段是补出来的洞：原来 D 只比两份 HTML，assets 一条都不查，于是 favicon 少了 ?v=
# 时脚本全绿、标签页图标却还是旧字节（公网 3,290 B / 仓库 895 B）。
# 判据必须是 HTML 里写的那条 URL 本身（含 ?v=）——Cloudflare 按 path+query 分缓存键，
# 拿裸路径去比会命中指纹方案之前的孤儿副本，比出假红。
ASSETS="$(node -e '
const fs = require("fs");
const out = new Set();
for (const p of ["index.html", "en/index.html", "404.html"]) {
  const t = fs.readFileSync(p, "utf8");
  // 三种前缀都要认：./ ../ 以及 404.html 专用的根绝对 /assets/
  for (const m of t.matchAll(/(?:href|src)="(?:\.\.?\/|\/)(assets\/[^"?]+)(\?v=[0-9a-z]+)?"/g)) {
    out.add("/" + m[1] + (m[2] || ""));
  }
}
for (const v of ["three.module.min.js", "three.core.min.js"]) out.add("/assets/vendor/" + v);
process.stdout.write([...out].sort().join("\n"));
')"
NA=$(printf '%s\n' "$ASSETS" | grep -c .)
BADASSET=0
# 空清单必须判红：上一版 ASSETS 为空时循环一次都不走，照样打印「✓ 0 条资源引用逐个对上」。
if [ "$NA" -eq 0 ]; then
  echo "  ✗ 一条资源引用都没抽到——要么 HTML 改名了，要么抽取用的 node 挂了；这一段等于没跑"
  FAIL=1
else
while IFS= read -r u; do
  [ -n "$u" ] || continue
  lp="${u%%\?*}"; lp="${lp#/}"
  [ -f "$lp" ] || { echo "  ! $u 在仓库里没有对应文件"; BADASSET=1; continue; }
  l="$(sha256sum "$lp" | cut -d' ' -f1)"
  # 换过一次 ?v= 之后每个 URL 都是全新的缓存键，第一次回源可能撞上 CF 正在填充（拿到半截或错误页），
  # 于是报出假红——实测过：同一份 main.js 紧接着手工比就是一致的。不一致时最多再取两次。
  r=""; n=0
  while [ "$n" -lt 3 ]; do
    n=$((n+1))
    r="$(curl -sL -A "$UA" "https://$DEPLOY_SITE$u" | sha256sum | cut -d' ' -f1)"
    [ "$l" = "$r" ] && break
    [ "$n" -lt 3 ] && sleep 3
  done
  if [ "$l" = "$r" ]; then printf '  ✓ %-52s 字节一致%s\n' "$u" "$([ "$n" -gt 1 ] && printf '（第 %s 次取回才对上）' "$n")"
  else printf '  ✗ %-52s 公网与仓库不一致（取回 %s 次仍不同，边缘命中旧副本）\n' "$u" "$n"; BADASSET=1; fi
done <<< "$ASSETS"
[ "$BADASSET" = 0 ] && echo "  ✓ $NA 条资源引用逐个对上" || FAIL=1
fi

echo "── F. 邻站未受影响"
for u in "/nc15/" "/geohot/"; do
  code=$(curl -sL -o /dev/null -w '%{http_code}' -A "$UA" "https://$DEPLOY_SITE$u")
  [ "$code" = 200 ] && echo "  ✓ $u HTTP 200" || { echo "  ✗ $u HTTP $code"; FAIL=1; }
done

echo "── G. 响应头：deploy/nginx.conf.example 声明的 vs 线上实际发的"
# 这一段的由来：migration.md 教人把 nginx.conf.example 拷成生效配置，而 example 里写着
# CSP / HSTS / Permissions-Policy；实测线上一个都没发。
# 查下去发现这是**有意的**：裸域在服务器上只有 listen 80 那一个服务块
# （注释写着「保留直服务，防 CF Flexible 回源被重定向循环」），443 块只管 www→裸域跳转。
# Cloudflare 处在 Flexible 模式：浏览器↔CF 是 HTTPS，CF↔源站是 HTTP，
# 于是源站即便写了 HSTS 也送不到——浏览器会忽略非安全来源的 STS 头。
# 所以本节分两档，不做「示例有、线上没有就一律判红」那种会永久红、很快没人看的闸门：
#   KNOWN-GAP  线上刻意不发（要改的是 CF 的 SSL 模式，不是这个仓库）→ 只报，不红
#   REGRESSION 线上本来在发的头不见了 → 判红
HDRS="$(curl -s -D - -o /dev/null -A "$UA" "https://$DEPLOY_SITE/" | tr -d '\r')"
# 线上当前确实发出的头（2026-10-08 实测）；这几个掉了就是回归。
SENT="X-Content-Type-Options Referrer-Policy"
H_BAD=0
for h in Strict-Transport-Security Content-Security-Policy X-Content-Type-Options Referrer-Policy Permissions-Policy X-Frame-Options; do
  want=$(grep -c "add_header $h" deploy/nginx.conf.example)
  got=$(printf '%s\n' "$HDRS" | grep -ci "^$h:" || true)
  case " $SENT " in *" $h "*) kind="REGRESSION";; *) kind="KNOWN-GAP";; esac
  if [ "$got" -eq 0 ] && [ "$kind" = "REGRESSION" ]; then
    printf '  ✗ %-28s 线上本来在发，现在 0 处（%s）\n' "$h" "$kind"; H_BAD=1
  elif [ "$want" -gt 0 ] && [ "$got" -eq 0 ]; then
    printf '  ! %-28s example %2s 处 / 线上 0 处 —— KNOWN-GAP：CF Flexible 下源站发不出去\n' "$h" "$want"
  else
    printf '  ✓ %-28s example %2s 处 / 线上 %s 处\n' "$h" "$want" "$got"
  fi
done
if [ "$H_BAD" = 1 ]; then
  echo "  ✗ 有线上本来在发的安全头消失了——这是回归，不是示例与生产的既有差异。"
  FAIL=1
fi

[ "$FAIL" = 0 ] && { echo "ALL CHECKS PASSED"; exit 0; } || { echo "FAILED"; exit 1; }
