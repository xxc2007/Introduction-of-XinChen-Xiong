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
LOCAL="$(while read -r f; do printf '%s  %s\n' "$(sha256sum "$f" | cut -d' ' -f1)" "$f"; done <<< "$LIST" | sort -k2)"
REMOTE="$(ssh $SSH_OPTS "$DEPLOY_USER@$DEPLOY_HOST" "cd $DEPLOY_ROOT && while read -r f; do [ -f \"\$f\" ] && printf '%s  %s\n' \"\$(sha256sum \"\$f\" | cut -d' ' -f1)\" \"\$f\"; done" <<< "$LIST" | sort -k2)"
if [ "$LOCAL" = "$REMOTE" ]; then echo "  ✓ $N 个文件全部一致"
else echo "  ✗ 差异："; diff <(printf '%s\n' "$LOCAL") <(printf '%s\n' "$REMOTE") | head -20; FAIL=1; fi

echo "── B. 本地 HEAD ↔ GitHub 仓库树"
LOCAL_TREE="$(git rev-parse HEAD^{tree})"
GH_TREE="$(gh api "repos/$REPO/git/trees/HEAD" --jq '.sha' 2>/dev/null || true)"
if [ -z "$GH_TREE" ]; then echo "  ! 取不到远端树（网络或仓库未建）"; FAIL=1
elif [ "$LOCAL_TREE" = "$GH_TREE" ]; then echo "  ✓ 树哈希相同 $LOCAL_TREE"
else
  echo "  ! 树哈希不同（本地 $LOCAL_TREE / 远端 $GH_TREE），逐文件比对："
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
for f in index.html en/index.html assets/css/style.css assets/js/main.js; do
  [ -f "$f" ] || continue
  l="$(sha256sum "$f" | cut -d' ' -f1)"
  case "$f" in index.html) u="/";; en/index.html) u="/en/";; *) u="/$f";; esac
  r="$(ssh $SSH_OPTS "$DEPLOY_USER@$DEPLOY_HOST" "curl -s -H 'Host: $DEPLOY_SITE' 'http://127.0.0.1$u'" | sha256sum | cut -d' ' -f1)"
  if [ "$l" = "$r" ]; then echo "  ✓ $u 与仓库字节一致"
  else echo "  ✗ $u 源站取回与仓库不一致"; FAIL=1; fi
done

echo "── D. 本地 ↔ 公网（经 Cloudflare）"
UA="Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126 Safari/537.36"
# Cloudflare 的 Email Address Obfuscation 会改写 mailto: 并注入 email-decode.min.js，
# 这是站点级功能不是缓存陈旧，比对前先归一化掉。
# 归一化只有 tools/normalize-cf.mjs 这一份实现：这里以前另写了一串 sed，
# 结果是「脚本说公网不一致、手工比对说一致」——两份规则各自漂移，谁也不知道该信谁。
cf_norm() { node tools/normalize-cf.mjs --diff -; }
for f in index.html en/index.html; do
  [ -f "$f" ] || continue
  case "$f" in index.html) u="/";; *) u="/en/";; esac
  l="$(cf_norm < "$f" | tr -d '\n' | sha256sum | cut -d' ' -f1)"
  r="$(curl -sL -A "$UA" "https://$DEPLOY_SITE$u" | cf_norm | tr -d '\n' | sha256sum | cut -d' ' -f1)"
  if [ "$l" = "$r" ]; then echo "  ✓ $u 公网取回与仓库一致（已忽略 CF 邮箱混淆）"
  else echo "  ✗ $u 公网与仓库不一致（CDN 命中旧副本）"; FAIL=1; fi
done

echo "── E. 公网逐个取回「浏览器真正会去取的那些资源 URL」"
# 这一段是补出来的洞：原来 D 只比两份 HTML，assets 一条都不查，于是 favicon 少了 ?v=
# 时脚本全绿、标签页图标却还是旧字节（公网 3,290 B / 仓库 895 B）。
# 判据必须是 HTML 里写的那条 URL 本身（含 ?v=）——Cloudflare 按 path+query 分缓存键，
# 拿裸路径去比会命中指纹方案之前的孤儿副本，比出假红。
ASSETS="$(node -e '
const fs = require("fs");
const out = new Set();
for (const p of ["index.html", "en/index.html"]) {
  const t = fs.readFileSync(p, "utf8");
  for (const m of t.matchAll(/(?:href|src)="(\.\.?\/(assets\/[^"?]+)(\?v=[0-9a-z]+)?)"/g)) {
    out.add("/" + m[2] + (m[3] || ""));
  }
}
for (const v of ["three.module.min.js", "three.core.min.js"]) out.add("/assets/vendor/" + v);
process.stdout.write([...out].sort().join("\n"));
')"
NA=$(printf '%s\n' "$ASSETS" | grep -c .)
BADASSET=0
while IFS= read -r u; do
  [ -n "$u" ] || continue
  lp="${u%%\?*}"; lp="${lp#/}"
  [ -f "$lp" ] || { echo "  ! $u 在仓库里没有对应文件"; BADASSET=1; continue; }
  l="$(sha256sum "$lp" | cut -d' ' -f1)"
  r="$(curl -sL -A "$UA" "https://$DEPLOY_SITE$u" | sha256sum | cut -d' ' -f1)"
  if [ "$l" = "$r" ]; then printf '  ✓ %-52s 字节一致\n' "$u"
  else printf '  ✗ %-52s 公网与仓库不一致（边缘命中旧副本）\n' "$u"; BADASSET=1; fi
done <<< "$ASSETS"
[ "$BADASSET" = 0 ] && echo "  ✓ $NA 条资源引用逐个对上" || FAIL=1

echo "── F. 邻站未受影响"
for u in "/nc15/" "/geohot/"; do
  code=$(curl -sL -o /dev/null -w '%{http_code}' -A "$UA" "https://$DEPLOY_SITE$u")
  [ "$code" = 200 ] && echo "  ✓ $u HTTP 200" || { echo "  ✗ $u HTTP $code"; FAIL=1; }
done

[ "$FAIL" = 0 ] && { echo "ALL CHECKS PASSED"; exit 0; } || { echo "FAILED"; exit 1; }
