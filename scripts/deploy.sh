#!/usr/bin/env bash
# 一键：质量闸门 → 提交 → 推 GitHub → git archive 上服务器 → 四方逐字节核验
# 用法：bash scripts/deploy.sh ["提交说明"]
# 需要 .deploy.env（见 .deploy.env.example）；本文件不含任何真实主机信息。
set -euo pipefail
cd "$(dirname "$0")/.."
ROOT="$PWD"

[ -f .deploy.env ] || { echo "✗ 缺少 .deploy.env（复制 .deploy.env.example 并填写）"; exit 1; }
# shellcheck disable=SC1091
set -a; . ./.deploy.env; set +a
: "${DEPLOY_HOST:?}"; : "${DEPLOY_USER:?}"; : "${DEPLOY_ROOT:?}"; : "${SITE_URL:?}"
DEPLOY_SITE="${DEPLOY_SITE:-xxc2007.me}"
SSH_KEY="$(cygpath -w "$DEPLOY_KEY" 2>/dev/null || echo "$DEPLOY_KEY")"
KH="${DEPLOY_KNOWN_HOSTS:-$HOME/.ssh/known_hosts}"
SSH_OPTS="-o BatchMode=yes -o StrictHostKeyChecking=accept-new -i $SSH_KEY -o UserKnownHostsFile=$KH"
ssh_run() { ssh $SSH_OPTS "$DEPLOY_USER@$DEPLOY_HOST" "$@"; }

echo "== 1/5 质量闸门 =="
node scripts/check-parity.mjs
node scripts/check-links.mjs
node scripts/check-bytes.mjs
for s in scripts/*.sh tools/*.mjs; do [ -f "$s" ] && case "$s" in *.sh) bash -n "$s";; *) node --check "$s";; esac; done
echo "  ✓ 闸门通过"

echo "== 2/5 提交并推送 GitHub =="
if ! git diff --quiet || ! git diff --cached --quiet || [ -n "$(git ls-files --others --exclude-standard)" ]; then
  git add -A
  MSG="${1:-站点更新 $(date +%F)}"
  case "$MSG" in feat*|fix*|docs*|chore*|refactor*|perf*|test*|style*|build*|ci*|update*) git commit -m "$MSG";; *) git commit -m "update: $MSG";; esac
  echo "  已提交 $(git log -1 --format='%h %s')"
fi
PUSHED=0
for i in 1 2 3; do
  if git push origin HEAD:main >/dev/null 2>&1; then PUSHED=1; break; fi
  echo "  ⚠️ git push 第 $i 次失败，重试…"; sleep 2
done
if [ "$PUSHED" != 1 ]; then
  echo "  → 改用 GitHub Contents API 发布（本机 TLS 抖动时的备用通道）"
  node tools/gh-publish.mjs "${1:-deploy $(date +%F)}"
fi

echo "== 3/5 部署到服务器（git archive HEAD = 仓库 blob 字节） =="
ssh_run "rm -rf ~/deploy-intro && mkdir -p ~/deploy-intro"
git archive --format=tar HEAD index.html en 404.html robots.txt sitemap.xml assets \
  | ssh_run "tar -xf - -C ~/deploy-intro"
ssh_run "
  set -e
  sudo mkdir -p $DEPLOY_ROOT
  for item in index.html en 404.html robots.txt sitemap.xml assets; do
    sudo rm -rf '$DEPLOY_ROOT/'\"\$item\"
    sudo cp -r ~/deploy-intro/\"\$item\" '$DEPLOY_ROOT/'\"\$item\"
  done
  sudo chown -R www-data:www-data $DEPLOY_ROOT
  rm -rf ~/deploy-intro
"
echo "  ✓ 服务器文件已替换"

echo "== 4/5 四方逐字节核验 =="
bash scripts/verify-sync.sh

echo "== 5/5 线上可达性 =="
for u in "/" "/en/" "/404.html" "/assets/css/style.css" "/assets/js/main.js" "/robots.txt" "/sitemap.xml" "/nc15/" "/geohot/"; do
  code=$(ssh_run "curl -s -o /dev/null -w '%{http_code}' -H 'Host: $DEPLOY_SITE' 'http://127.0.0.1$u'")
  printf '  %-22s HTTP %s\n' "$u" "$code"
done
echo "完成 ✅"
