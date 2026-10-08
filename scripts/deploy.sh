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
# 必须和 verify-sync.sh / switch-routes.sh 同一套展开：`.deploy.env.example` 教人写
# DEPLOY_KEY=~/.ssh/<key>.pem，而 shell 在赋值时不会展开波浪号——少了这一步，
# 换一台机器照示例填好就只会得到 "Identity file ~/.ssh/... not accessible"。
SSH_KEY="$(cygpath -w "${DEPLOY_KEY/#\~/$HOME}" 2>/dev/null || echo "$DEPLOY_KEY")"
KH="${DEPLOY_KNOWN_HOSTS:-$HOME/.ssh/known_hosts}"
SSH_OPTS="-o BatchMode=yes -o StrictHostKeyChecking=accept-new -i $SSH_KEY -o UserKnownHostsFile=$KH"
ssh_run() { ssh $SSH_OPTS "$DEPLOY_USER@$DEPLOY_HOST" "$@"; }

echo "== 0/5 资源指纹（?v=）自动跟随 HEAD =="
# CSS/JS 走的是 max-age=1 年 + immutable，只有 ?v= 变了浏览器才会重新取。
# 手工改容易漏，这里在跑闸门之前先按 HEAD 统一一次。
V="$(git rev-parse --short=6 HEAD)"
node - "$V" <<'NODE'
const fs = require("fs");
const v = process.argv[2];
for (const p of ["index.html", "en/index.html", "404.html"]) {
  if (!fs.existsSync(p)) continue;
  const t = fs.readFileSync(p, "utf8");
  const n = t.replace(/\?v=[0-9a-z]{4,8}/g, "?v=" + v);
  if (n !== t) { fs.writeFileSync(p, n); console.log(`  ${p} → ?v=${v}`); }
}
NODE

echo "== 1/5 质量闸门 =="
node scripts/check-parity.mjs
node scripts/check-links.mjs
node scripts/check-bytes.mjs
# 断言本身也可能失效（正则与写法脱节、匹配集为空），所以既要求「跑过 N 条」，
# 也要求每条断言都能被打红——后者是 check-mutations.mjs 唯一的职责。
node --test "tests/*.test.mjs"   # 必须带 glob：`node --test tests` 与 `tests/` 在 Node 24/Windows 下
                                 # 会把目录当模块去找，报 MODULE_NOT_FOUND 而不是跑测试。
NTEST="$(node --test --test-reporter=tap "tests/*.test.mjs" 2>/dev/null | grep -c '^ok ' || true)"
# 这条是 glob 失效的兜闸，不是覆盖率断言：Node 在匹配不到文件时退出码是 0，
# 「闸门通过」于是可能被读成「一条测试都没跑」。所以数一下实际执行了多少条。
# 下限定在 10：删测试不该拦部署，但「几乎没跑」必须拦。
if [ "${NTEST:-0}" -lt 10 ]; then
  echo "  ✗ 只跑了 ${NTEST:-0} 条断言。glob 匹配不到文件时 node --test 是退出 0 的，"
  echo "    也就是说「闸门通过」可能只是「一条测试都没跑」。停止部署。"
  exit 1
fi
echo "  ✓ ${NTEST} 条断言已执行"
node scripts/check-mutations.mjs
for s in scripts/*.sh tools/*.mjs; do [ -f "$s" ] && case "$s" in *.sh) bash -n "$s";; *) node --check "$s";; esac; done
echo "  ✓ 闸门通过"

echo "== 2/5 提交并推送 GitHub =="
if ! git diff --quiet || ! git diff --cached --quiet || [ -n "$(git ls-files --others --exclude-standard)" ]; then
  # 只暂存这个仓库真正会发布的文件。以前这里是 `git add -A`：
  # 一轮并行核查里，某个代理在仓库根留下了 wall2.json（Artalk 评论接口的一次响应转储），
  # 它就被连着提交并推到了公开仓库。临时产物应当留在仓库外，不能靠"顺手一起提交"进主干。
  git add -u
  for d in index.html en 404.html robots.txt sitemap.xml assets docs deploy scripts tools LICENSE README.md README.en.md .gitignore .gitattributes; do
    [ -e "$d" ] && git add -- "$d"
  done
  LEFT="$(git ls-files --others --exclude-standard)"
  if [ -n "$LEFT" ]; then
    echo "  ! 这些未跟踪文件不会被提交（多半是临时产物，请删掉或挪到仓库外）："
    echo "$LEFT" | sed 's/^/      /'
  fi
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
# 只打印状态码等于没检查：以前这一段把 404/500 也一并 ✅ 掉了。
# /404.html 期望 404（error_page ... =404 正是为了让它别返回 200），其余期望 200。
PATHS=("/" "/en/" "/404.html" "/assets/css/style.css" "/assets/js/main.js" "/robots.txt" "/sitemap.xml" "/nc15/" "/geohot/")
WANT=(200 200 404 200 200 200 200 200 200)
FAIL5=0
for idx in "${!PATHS[@]}"; do
  u="${PATHS[$idx]}"; want="${WANT[$idx]}"
  code=$(ssh_run "curl -s -o /dev/null -w '%{http_code}' -H 'Host: $DEPLOY_SITE' 'http://127.0.0.1$u'")
  if [ "$code" = "$want" ]; then printf '  %-22s HTTP %s\n' "$u" "$code"
  else printf '  %-22s HTTP %s  (期望 %s)\n' "$u" "$code" "$want"; FAIL5=$((FAIL5+1)); fi
done
[ "$FAIL5" = 0 ] || { echo "  ✗ $FAIL5 条线上可达性不符，部署未成功"; exit 1; }
echo "完成 ✅"
