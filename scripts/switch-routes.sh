#!/usr/bin/env bash
# 域名根切换：纪念册 → /nc15/，个人介绍站 → /（可回滚）
# 用法：bash scripts/switch-routes.sh --dry-run   # 只读：打印 diff，不写任何东西
#       bash scripts/switch-routes.sh             # 打补丁并生效（备份 → nginx -t → 失败自动回滚）
#       bash scripts/switch-routes.sh --rollback  # 还原最近一次备份
# 主机与登录名从 .deploy.env 读取，绝不写进仓库。
set -euo pipefail
cd "$(dirname "$0")/.."
[ -f .deploy.env ] || { echo "✗ 缺少 .deploy.env"; exit 1; }
# shellcheck disable=SC1091
set -a; . ./.deploy.env; set +a
: "${DEPLOY_HOST:?}"; : "${DEPLOY_USER:?}"
SSH_KEY="$(cygpath -w "${DEPLOY_KEY/#\~/$HOME}" 2>/dev/null || echo "$DEPLOY_KEY")"
KH="${DEPLOY_KNOWN_HOSTS:-$HOME/.ssh/known_hosts}"
SSH_OPTS="-o BatchMode=yes -o StrictHostKeyChecking=accept-new -i $SSH_KEY -o UserKnownHostsFile=$KH"
rsh() { ssh $SSH_OPTS "$DEPLOY_USER@$DEPLOY_HOST" "$@"; }
MODE="${1:-apply}"

if [ "$MODE" = "--rollback" ]; then
  rsh 'sudo bash -s' <<'RB'
set -e
CONF=/etc/nginx/sites-available/xxc2007.me
B=$(sudo ls -1t ${CONF}.bak-nc15-* 2>/dev/null | head -1)
[ -n "$B" ] || { echo "✗ 没有备份"; exit 1; }
sudo cp "$B" "$CONF"; sudo nginx -t && sudo systemctl reload nginx
echo "✓ 已还原到 $B"
RB
  exit 0
fi

# 远端一次性以 root 完成：备份 → 生成新配置 → diff → （可选）nginx -t → 装入 → 重载/回滚
rsh "sudo bash -s -- '$MODE'" <<'REMOTE' 2>&1 | sed 's/^/  /'
set -e
CONF=/etc/nginx/sites-available/xxc2007.me
MODE="${1:-apply}"
OLD=/var/www/nanchang15
INTRO=/var/www/intro
NC15=/var/www/nc15
STAMP=$(date +%Y%m%d-%H%M%S)
BAK="${CONF}.bak-nc15-${STAMP}"

echo "[1] 模式：$MODE"
if [ "$MODE" = "apply" ]; then
  cp "$CONF" "$BAK"; echo "    备份 → $BAK"
  [ -d "$NC15" ] || { cp -a "$OLD" "$NC15"; echo "    已复制 $OLD → $NC15"; }
  mkdir -p "$INTRO"; chown -R www-data:www-data "$NC15" "$INTRO"
else
  echo "    （dry-run：不建目录、不写文件）"
fi

cat > /tmp/nc15-block.conf <<'BLOCK'
    # 纪念册迁到 /nc15/：站内绝对路径已带 /nc15 前缀；/comment/ 与 /geohot/ 留在域名根
    location = /nc15 { return 308 https://$host/nc15/; }
    location ^~ /nc15/ {
        alias /var/www/nc15/;
        index index.html;
        try_files $uri $uri/ =404;
        error_page 404 =404 /nc15/404.html;
        location ~* \.(css|js|mjs|map|woff2?|png|jpe?g|gif|svg|ico|webp|avif|m4a|ogg)$ {
            add_header Cache-Control "public, max-age=31536000, immutable" always;
        }
    }

BLOCK

awk -v intro="$INTRO" -v blk=/tmp/nc15-block.conf '
  BEGIN { while ((getline l < blk) > 0) b = b l "\n"; close(blk) }
  /^server \{$/ { done = 0 }
  /^    root \/var\/www\/nanchang15;/ { sub(/\/var\/www\/nanchang15/, intro); print; next }
  /^    location \/ \{$/ && !done { printf "%s", b; done = 1 }
  { print }
' "$CONF" > /tmp/xxc.new

echo "[2] 变更摘要"
echo "    root 指向介绍站: $(grep -c "root $INTRO;" /tmp/xxc.new) 处（原 $(grep -c "root $OLD;" "$CONF") 处）"
echo "    /nc15 块: $(grep -c "location ^~ /nc15/" /tmp/xxc.new) 个"
echo "    /comment/ 仍在域名根: $(grep -c "location ^~ /comment/" /tmp/xxc.new) 处"
echo "    /geohot 仍在域名根: $(grep -c "location ^~ /geohot" /tmp/xxc.new) 处"
echo "[3] diff（前 40 行）"
diff -u "$CONF" /tmp/xxc.new | head -40 || true

if [ "$MODE" != "apply" ]; then echo "[4] dry-run 结束，未写入"; exit 0; fi

echo "[4] nginx -t 预检（用新文件试跑）"
cp "$CONF" /tmp/xxc.orig
cp /tmp/xxc.new "$CONF"
if ! nginx -t 2>&1 | sed 's/^/    /'; then
  echo "    ✗ 测试失败，还原"
  cp /tmp/xxc.orig "$CONF"; nginx -t >/dev/null 2>&1 && systemctl reload nginx
  rm -f /tmp/xxc.new; exit 1
fi
systemctl reload nginx
rm -f /tmp/xxc.orig
echo "    ✓ 已重载"

echo "[5] 线上验证"
# reload 是优雅的：老 worker 可能还在服务旧配置，所以每条 URL 重试到 200 或超时。
# 原来这里只把状态码打印出来就往下走——/ 变成 404 也照样 exit 0 报「完成」，
# 于是第 4 步那句「nginx -t 失败自动回滚」承诺的保护，恰好漏掉了它真正要防的那种失败：
# 配置语法没错、但站点已经打不开。现在探到不对就照原路退回。
BAD=0
probe() {
  local u="$1" want="$2" code=""
  for _ in 1 2 3 4 5 6 7 8 9 10; do
    code=$(curl -s -o /dev/null -w '%{http_code}' -H 'Host: xxc2007.me' "http://127.0.0.1$u")
    [ "$code" = "$want" ] && break
    sleep 1
  done
  printf "    %-18s HTTP %s\n" "$u" "$code"
  if [ "$code" != "$want" ]; then
    echo "    ✗ $u 期望 $want，实得 $code"
    BAD=$((BAD + 1))
  fi
}
probe / 200; probe /en/ 200; probe /nc15/ 200; probe /nc15/en/ 200
probe /nc15/promo/ 200; probe /geohot/ 200; probe /robots.txt 200; probe /sitemap.xml 200
if [ "$BAD" -gt 0 ]; then
  echo "    $BAD 条 URL 没回到期望状态 → 从 $BAK 还原并重载"
  cp "$BAK" "$CONF"
  if nginx -t 2>&1 | sed 's/^/    /'; then systemctl reload nginx; echo "    ✓ 已退回切换前的配置"; else echo "    ✗ 还原后的配置也没过 nginx -t，必须人工介入"; fi
  echo "    新配置留在 /tmp/xxc.new 供排查"
  exit 1
fi
rm -f /tmp/xxc.new
echo "    备份留在 $BAK"
REMOTE
echo "完成（模式：${MODE}）"
