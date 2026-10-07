# 迁移手册 · 把 xxc2007.me 个人介绍站搬到新机器

目标只有一句：**克隆仓库 → 一条命令 → 站点在新机器上跑起来**。
这份文件证明它真的成立，并且把"跑起来"精确定义成：本机预览可打开、服务器文件与仓库**逐字节相同**、
公网经 CDN 取回的字节也相同、四个路径前缀互不踩踏。

核对时刻 **2026-10-07 09:35–09:40（+0800）**；文中每条命令都在同一台机器上真跑过。

> **占位符规则（不可协商）**：仓库与文档里永远不出现源站 IP、SSH 登录名、私钥文件名。
> 只有 `<server-ip>` 与 `<ssh-user>` 两种写法。`node scripts/check-links.mjs` 会扫每一行跟踪文件，
> 命中真实地址就**让构建失败**，所以这不是靠自觉维持的约定。

---

## 〇 · 前提（新机必须已经满足这五件事）

| 前提 | 为什么必须 | 怎么确认 |
|---|---|---|
| Cloudflare 托管 DNS，且**代理在前**，回源走明文 `:80` | 站点自己不管证书；任何跳转必须写死 `https://$host…`，相对 Location 会被拼成明文 `http://` 把访客送走 | 示例配置第 9–10 行的注释解释了这条；`:80` 那个 server 只做一件事——`return 301 https://$host$request_uri` |
| Let's Encrypt 证书 + certbot webroot `/var/www/certbot` | `:443` 上那份 `fullchain` / `privkey` 的路径在示例配置第 27–28 行；续签走 `/.well-known/acme-challenge/`，那个 location **不能**被重定向吞掉 | `nginx -t` 通过就说明证书路径存在且可读 |
| nginx（带 `alias`、`proxy_pass`、`error_page` 内部跳转） | 四个前缀的归属和优先级只在 nginx 配置里说得清 | `nginx -v` |
| Node（本次核对 `v24.19.0`）、`bash`、`git`、`curl`、`ssh`、`gh` CLI | `check-*.mjs` 与 `tools/*.mjs` 都是 Node；`verify-sync.sh` 的 B 段和备用发布通道都调 `gh api` | `node --version && git --version && gh --version` |
| 服务器上有 `www-data` 与 `sudo`；邻站已在原位 | `deploy.sh` 收尾会 `chown -R www-data:www-data $DEPLOY_ROOT`；纪念册目录 `/var/www/nc15`、GEOHOT 的本机 Node 服务 `:3000`、Artalk `:23366` 必须还活着 | `curl -s -o /dev/null -w '%{http_code}\n' -H 'Host: xxc2007.me' http://127.0.0.1/geohot/` |

本机**不需要** Python，也不要假设它有：这台机器上 `python --version` 与 `python3 --version` 都直接报
"Python was not found"，所以本站所有文档里的本地服务都写 `node tools/serve.mjs`，从不写 `python -m http.server`。
同样**不需要** `npm install`——仓库里没有构建清单，`git ls-files '*.json' | wc -l` 的实测结果是 **0**。

---

## 一 · 服务器物理布局

```text
/var/www/intro                    ← 本站，DEPLOY_ROOT（deploy.sh 逐项 rm + cp 的就是这六项）
/var/www/nc15                     ← 纪念册（切换脚本用 cp -a 从旧根复制过来，之后独立维护）
/var/www/nanchang15               ← 旧域名根内容；切换只读它、不删它（回滚的最后一条退路）
/var/www/certbot                  ← ACME 校验 webroot
/etc/nginx/sites-available/xxc2007.me   ← 生效配置（仓库里只有 deploy/nginx.conf.example）
/etc/nginx/sites-available/xxc2007.me.bak-nc15-<YYYYmmdd-HHMMSS>  ← 切换前自动留下的备份
```

`deploy.sh` 只搬运六个条目：`index.html en 404.html robots.txt sitemap.xml assets`。
其余一切（`docs/`、`scripts/`、`tools/`、`deploy/`、两个 README）是**仓库的东西**，不进 webroot——
这条边界同时写进了 `verify-sync.sh` 的 `DEPLOYED` 变量，核验也只按它取文件清单。

---

## 二 · 新机器上跑起来（三条命令）

```bash
git clone https://github.com/xxc2007/Introduction-of-XinChen-Xiong.git
cd Introduction-of-XinChen-Xiong
node tools/serve.mjs                     # 默认 8899，只监听 127.0.0.1
```

零构建、零依赖安装——这条预览服务器就是"构建产物"。实测过程（2026-10-07，同一台 Windows + Git Bash）：

```bash
netstat -ano | grep LISTENING | grep -E ':89[0-9][0-9]'   # 先看谁在听：8890 / 8899 / 8912 都被占着
node tools/serve.mjs 8907                                  # 挑一个空闲端口，别 kill 别人的进程
```

| 请求 | 结果 |
|---|---|
| `/`、`/en/` | **HTTP 200** |
| `/assets/css/style.css`、`/assets/js/main.js` | **HTTP 200** |
| `/assets/vendor/three.module.min.js`、`/assets/fonts/noto-serif-sc/wght.css` | **HTTP 200** |
| `/nc15/` | **HTTP 200**（预览器把纪念册仓库挂到这个前缀上；目录不存在时诚实返回 404） |
| `/nope.html` | **HTTP 404** |
| `curl -s http://127.0.0.1:8907/ \| wc -c` | 与磁盘上的 `index.html` 逐字节相等 |

收尾：**用 `taskkill //PID <pid> //F //T` 关掉，再用同一条 netstat 确认端口回到 FREE**。
预览器把纪念册挂在哪由 `NC15_DIR` 决定（默认指向母本仓库目录），迁移到新机器时要么设这个环境变量，
要么接受 `/nc15/` 本地 404——**它不影响本站**。这个服务只绑 `127.0.0.1`，并且对目录穿越一律 `403`。

浏览器直接双击 `index.html`（`file://`）也能读：文案与样式全在，但 `<script type="module">` 被本地跨源策略拦掉，
于是没有动效、没有语言菜单、粒子场退化成静态发丝环。**这不是"迁移失败"**，是渐进增强的设计后果。

---

## 三 · 接到新服务器上

```bash
cp .deploy.env.example .deploy.env      # .gitignore 第 10 行排除它，绝不入库
```

填六个键（`.deploy.env.example` 已经带着占位符写法）：`DEPLOY_HOST=<server-ip>`、`DEPLOY_USER=<ssh-user>`、
`DEPLOY_KEY`（指向私钥，示例里写的是家目录下的密钥文件；Windows 下路径由脚本 `cygpath -w` 转换）、
`DEPLOY_ROOT=/var/www/intro`、`DEPLOY_SITE=xxc2007.me`、`SITE_URL=https://xxc2007.me`。
中文用户名会让 OpenSSH 把 `known_hosts` 路径转义坏，所以另留了 `DEPLOY_KNOWN_HOSTS`，可以指到一个 ASCII 路径。

然后：

1. 把 `deploy/nginx.conf.example` 拷成 `/etc/nginx/sites-available/xxc2007.me`（它就是为这一步准备的，路径与真机一致），
   `ln -s` 进 `sites-enabled`，`nginx -t` 通过后 `systemctl reload nginx`。
2. 让 webroot 存在且属主对：`sudo mkdir -p /var/www/intro && sudo chown -R www-data:www-data /var/www/intro`。
3. 一条命令上线：`bash scripts/deploy.sh "首次迁移部署"`。它按五步走——
   闸门（`check-parity` / `check-links` / `check-bytes` + 对所有 `scripts/*.sh` 做 `bash -n`、对 `tools/*.mjs` 做 `node --check`）
   → 提交并 `git push`（重试 3 次）→ `git archive HEAD` 上服务器 → `verify-sync.sh` 四方核验 → 带 `Host` 头逐前缀探活。
4. 切域名根（见「五」）。

---

## 四 · nginx 的四块，为什么不能合并

| location | 干什么 | 不能动的理由 |
|---|---|---|
| `location / { try_files $uri $uri/ =404; error_page 404 /404.html; }` | 本站两页 + 无扩展名路径 | `location = /404.html { internal; }` 让 404 页不被直接索引 |
| `location = /nc15 { return 301 https://$host/nc15/; }` + `location ^~ /nc15/ { alias /var/www/nc15/; … error_page 404 = /nc15/404.html; }` | 纪念册 | `alias` 而不是 `root`；404 用**它自己的**页面，因为它的站内链接已经带 `/nc15` 前缀 |
| `location ^~ /geohot { proxy_pass http://127.0.0.1:3000; … }` | GEOHOT | 它有后端；`^~` 保住前缀优先级，别让正则 location 抢走 |
| `location ^~ /comment/ { proxy_pass http://127.0.0.1:23366; … }` | Artalk 留言墙后端 | **必须留在域名根。** 纪念册的 `wall.js` 用根绝对路径调它；跟着搬进 `/nc15/comment/` 会让留言墙整块失效 |

`/comment/` 这一条是三块里唯一的"跨站约束"：它服务的是**邻站**，却由这个域名的根路径承载。
`robots.txt` 里也留了同一段注释说明这一条既不 Disallow 也不挪走，`sitemap.xml` 与
`/nc15/sitemap.xml` 各管各的（`robots.txt` 里那 **2** 行 `Sitemap:` 就是这两个地址）。

缓存与压缩同样分三层：带 `?v=` 指纹的静态资源 30 天 `immutable`；`/assets/fonts/` 一年（切片文件名按内容编号）；
**HTML 一律 `no-cache`**，保证发布即时可见——`verify-sync.sh` 的 C 段正是靠这条才不会长期误报。
gzip 覆盖 `text/css`、`application/javascript`、`image/svg+xml`、JSON 与 XML，`gzip_min_length 1024`。

---

## 五 · 域名根切换（本站与纪念册换位置）

```bash
bash scripts/switch-routes.sh --dry-run    # 只读：打印 diff 与四条计数，不写任何东西
bash scripts/switch-routes.sh              # 备份 → 生成新配置 → nginx -t 预检 → 重载
bash scripts/switch-routes.sh --rollback   # 还原最近一份 .bak-nc15-* 备份
```

`apply` 模式下它在服务器上一口气做完：把当前配置备份成带时间戳的 `.bak-nc15-<STAMP>`；
`/var/www/nc15` 不存在就 `cp -a /var/www/nanchang15 /var/www/nc15`（**旧根不删**）；
用 `awk` 把 `root /var/www/nanchang15;` 改成 `root /var/www/intro;`，并在第一个 `location / {` 前插入 `/nc15/` 块；
打印四条计数自检（指向介绍站的 `root` 处数、`/nc15/` 块数、`/comment/` 仍在根、`/geohot` 仍在根）；
`nginx -t` **不通过就自动还原并重载**，宁可不上；通过后逐条探测 8 个前缀
（`/ /en/ /nc15/ /nc15/en/ /nc15/promo/ /geohot/ /robots.txt /sitemap.xml`）。
探测是**带重试的**：`systemctl reload nginx` 是优雅重载，老 worker 可能还在服务旧配置，
所以每条 URL 重试到 200 或超时——一次性采样会把"重载竞态"误报成"切换失败"。

已于 **2026-10-07 09:44:51 (+0800)** 执行 `bash scripts/switch-routes.sh`。切换后源站实测：`/` 200（介绍站）、`/en/` 200、`/nc15/` 200（纪念册）、`/nc15/en/` 200、`/nc15/promo/` 200、`/geohot/` 200、`/robots.txt` 200、`/sitemap.xml` 200。备份留在 `/etc/nginx/sites-available/xxc2007.me.bak-nc15-20261007-094451`，回滚一条命令：`bash scripts/switch-routes.sh --rollback`。
所以新机器接手时，"部署内容"和"切换路由"是两件事，必须分开做、分开验。
<!-- 已核对：2026-10-07 09:44:51 (+0800) 执行；/ 200 介绍站、/nc15/ 200 纪念册、/nc15/en/ 200、/nc15/promo/ 200、/geohot/ 200、/robots.txt 200、/sitemap.xml 200 -->

---

## 六 · 字节一致性怎么证明（四方来源，分五段跑）

`bash scripts/verify-sync.sh`（单独跑也行，它只读不写）证明**四个来源在同一段字节上对得上**：

| 段 | 比的双方 | 判据 |
|---|---|---|
| A | **本地 HEAD ↔ 服务器文件** | 部署集内每个文件两侧各算 `sha256sum`，`sort -k2` 后**整串相等**；不等就 `diff` 出前 20 行 |
| B | **本地 HEAD ↔ GitHub 仓库树** | 先比 `git rev-parse HEAD^{tree}` 与远端 tree sha；不同则逐个部署集文件比 git blob sha（与 GitHub blob sha 同源，可直接对） |
| C | **本地 ↔ 源站（绕过 CDN）** | 在服务器本机 `curl -H 'Host: …' http://127.0.0.1…` 取回 `/`、`/en/`、`assets/css/style.css`、`assets/js/main.js` 四条流再算 `sha256`——**这条不经过任何缓存**，问的是"部署到底落没落" |
| D | **本地 ↔ 公网（经 Cloudflare）** | 只抓 `/` 与 `/en/`，**比对前先归一化 Cloudflare 的邮箱混淆**（`mailto:` 会被换成受保护链接并注入 `email-decode.min.js`；那是站点级功能，不是缓存陈旧），去掉换行后算 `sha256` |
| E | **邻站未受影响** | `/nc15/` 与 `/geohot/` 必须仍是 200 |

C 与 D 分开跑是刻意的：合成一条就会被 Cloudflare 的改写制造假性差异。
归一化口径存在两份且必须一致——D 段里的 `sed`，以及独立脚本 `node tools/normalize-cf.mjs <文件>`
（它把仓库里真实的 `mailto:` 也归一化成同一个 `MAILTO` 记号）。

五段全过才打印 `ALL CHECKS PASSED`（退出码 0），任何一段失败是 `FAILED` + 退出码 1。
非部署文件（README、`docs/`）不参与 A/B 的文件清单——这点 B 段末行注释里写明了"README/docs 等非部署文件不计"。

**为什么坚持走 `git archive HEAD` 而不是 `scp` 工作区**：`.gitattributes` 写着 `* text=auto eol=lf`。
工作区若留着 CRLF，`tar` 上去之后服务器文件与仓库 blob 的字节就会不一样，逐字节核验会出现**假性差异**——
换行符是这个站唯一真正的字节级陷阱，所以闸门宁可绕远路也要用 blob。

手工快速自检（迁移当天值得各跑一次）：

```bash
git status --short                # 应该是空的；不空说明 deploy.sh 没帮你提交完
node scripts/check-parity.mjs     # 中英两页 10 项数量 + 5 组集合必须全 ✓
node scripts/check-links.mjs      # 链接可达 + 主机信息红线
node scripts/check-bytes.mjs      # 逐类字节预算（当前图片行仍在压 → 见下）
```

---

## 七 · 回滚

| 出了什么事 | 怎么办 | 依据 |
|---|---|---|
| nginx 配置切坏了 | `bash scripts/switch-routes.sh --rollback`——取最近一份备份、`nginx -t` 通过才 reload | 切换脚本在 `nginx -t` 失败时**自己就还原**了，`--rollback` 是事后手动退回 |
| 内容上错了一版 | `git revert --no-edit HEAD` 然后 `bash scripts/deploy.sh "回滚 <sha>"`；或者 `git checkout <好的提交> -- index.html en assets` 再 deploy | 部署是"六项整体 rm + cp"，所以任何一次成功部署都会把它们全部换成 HEAD 的字节，回滚一个提交 = 回滚整站内容 |
| GitHub 推不上去（TLS 抖动） | 不用手工重试：`deploy.sh` 第 2 步失败 3 次后自动改跑 `node tools/gh-publish.mjs "说明"`，用 Git Data API 建一个**原子提交**（逐 blob → tree → commit → `refs/heads/main` 以 `force:false` 前移） | 推送失败绝不会留下半个提交 |
| 公网还是旧副本 | 先看 `verify-sync.sh` C 段是哪条 URL 不一致；HTML 是 `no-cache`，通常要清的是带 `?v=` 之外的资源——按 URL 在 Cloudflare 刷新即可 | 版本串 `?v=` 一变，长缓存自然失效（`check-parity.mjs` 钉死四个引用必须是同一个值） |
| 纪念册整站不见了 | 旧根 `/var/www/nanchang15` 从没被删；把配置里的 `root` 换回它，或 `cp -a` 重建 `/var/www/nc15` | 切换脚本只做 `cp -a`，不做 `rm -rf` |
| 留言墙整块失效 | 九成是 `/comment/` 被搬走了。它**必须留在域名根**（`wall.js` 用根绝对路径调它），改回 `location ^~ /comment/` 反代到 `:23366` | 见「四」第三行 |

---

## 八 · 迁移成功清单

- [ ] `node tools/serve.mjs` 在本机起来，`/` `/en/` 两条 200，取回字节与磁盘一致
- [ ] `node scripts/check-parity.mjs` → `PARITY OK`（中英两页对齐）
- [ ] `node scripts/check-links.mjs` → `LINKS OK`（无死链、无主机信息）
- [ ] `node scripts/check-bytes.mjs` → `BUDGET OK`（2026-10-07 09:53 实测全绿；同一命令在 09:35 时图片行还是 92.1 KB 红的——图片被重压过，闸门随构建变动）
- [ ] `bash scripts/deploy.sh "…"` 五步全绿，末尾打印 9 个前缀的 HTTP 码
- [ ] `bash scripts/verify-sync.sh` → `ALL CHECKS PASSED`
- [ ] `bash scripts/switch-routes.sh --dry-run` 的四条计数符合预期，再 `apply`
- [ ] 线上 `/`、`/en/`、`/404.html`、`/nc15/`、`/nc15/en/`、`/geohot/`、`/comment/` 各回一次状态码
- [ ] 手机上 ≤420px 与 390px 无横向滚动（`main.js` 的溢出哨兵会把 `data-overflow="1"` 挂出来，验收时断言它永远不为 `1`）
- [ ] 仓库里没有真实主机信息：`.deploy.env` 仍是未跟踪状态（`git ls-files | grep -c deploy.env` 应为 **1**，即只有 `.deploy.env.example`）

## 九 · 迁移后第一件事

读 [docs/content-sources.md](content-sources.md)。路由和字节决定了站能不能跑，
那张表决定了**页面上哪句话还能不能改**——文案的出处和核实日期都在那里，改之前先看它。
