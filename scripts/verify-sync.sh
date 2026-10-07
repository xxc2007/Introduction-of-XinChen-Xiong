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
# 这是站点级功能不是缓存陈旧，比对前先把它归一化掉。
cf_norm() { sed -e 's|<script data-cfasync="false" src="/cdn-cgi/scripts/[^"]*email-decode\.min\.js"></script>||g' \
               -e 's|<a href="/cdn-cgi/l/email-protection#[0-9a-f]*"><span class="__cf_email__" data-cfemail="[0-9a-f]*">\[email&amp;#160;protected\]</span></a>|MAILTO|g'; }
for f in index.html en/index.html; do
  [ -f "$f" ] || continue
  case "$f" in index.html) u="/";; *) u="/en/";; esac
  l="$(cf_norm < "$f" | tr -d '\n' | sha256sum | cut -d' ' -f1)"
  r="$(curl -sL -A "$UA" "https://$DEPLOY_SITE$u" | cf_norm | tr -d '\n' | sha256sum | cut -d' ' -f1)"
  if [ "$l" = "$r" ]; then echo "  ✓ $u 公网取回与仓库一致（已忽略 CF 邮箱混淆）"
  else echo "  ✗ $u 公网与仓库不一致（CDN 命中旧副本）"; FAIL=1; fi
done

echo "── E. 邻站未受影响"
for u in "/nc15/" "/geohot/"; do
  code=$(curl -sL -o /dev/null -w '%{http_code}' -A "$UA" "https://$DEPLOY_SITE$u")
  [ "$code" = 200 ] && echo "  ✓ $u HTTP 200" || { echo "  ✗ $u HTTP $code"; FAIL=1; }
done

[ "$FAIL" = 0 ] && { echo "ALL CHECKS PASSED"; exit 0; } || { echo "FAILED"; exit 1; }
