# 两站安全与访问性能升级计划

目标：保留两站内容、设计及交互，修复核实的安全与发布缺口，改善缓存和关键资源加载，使用适用的免费能力。
架构：继续静态 HTML/CSS/JS 与自托管 Artalk；共享 nginx 和 Cloudflare 分步加固，不重构 GEOHOT、不迁移生产托管。变更先备份，语法检查通过后平滑 reload，每批都做源站/公网/浏览器验证。
技术栈：Node.js 原生测试、Playwright、nginx、systemd、Cloudflare Free、GitHub Actions/CodeQL。

## 独立审核与取舍
- [x] 独立审查确认 MapLibre 依赖风险，v6 ESM 迁移必须匹配 worker/CSS，不能只换 UMD 文件。
- [x] GitHub API 备用发布器不保留本地 commit/删除语义，停用不可靠备用，以标准 git push 快速失败。
- [x] wall.js 超时必须覆盖正文读取，并保留后端错误消息；权限修复同时落到部署脚本。
- [x] 未经证据不安装额外监控代理；不为领取优惠新增域名、数据库或重复托管。新服务需零收费边界，协议/验证最后交给用户。

## 任务 1：回滚与基线
- [x] 在服务器 /var/backups/site-upgrade-20261016 保存 nginx、Artalk 单元/配置、站点和 SQLite 一致性备份；记录当前服务与权限。
- [x] 基线：Node 原生测试、两站关键页状态/字节、冷暖请求耗时与浏览器关键交互。

## 任务 2：代码、依赖与发布
文件：tools/gh-publish.mjs、scripts/deploy.sh、tests/publish.test.mjs；纪念站 assets/wall.js、assets/map-loader.js、10 语 HTML、maplibre/、scripts/deploy.sh、tests/。
- [x] 增加证明发布语义、响应头后正文超时/JSON 错误的失败测试，确认红灯。
- [x] 停用 API 伪造提交备用，标准 push 失败即停止；部署目录归 root，增加明确失败与回滚策略。
- [x] 移出重复内联地图加载器为同源按需模块，迁移到固定版本 MapLibre ESM/worker/CSS，保留双触发与降级。
- [x] 修复留言请求清理时机、HTTP/JSON 错误传播，不发布测试留言。
- [ ] 通过原生测试、资源预算、HTML 链接检查及地图/地球/视频/导航的桌面和移动浏览器测试。

## 任务 3：基础设施
- [x] 先验证外部直连源站证书，再 Cloudflare Full(strict) 与 always HTTPS，最低 TLS1.2；每步检查两站与共享路径健康。
- [x] nginx 改为只允许可信 CF 回源，保留 localhost 与 ACME；部署 Real-IP 精确可信来源、写接口限速及共享头。严格 CSP 先 report-only，适配确认后再 enforce。
- [x] 静态发布物及 Artalk binary/config root 持有；保留 Artalk data 可写；restart 仅 Artalk，nginx syntax 后 reload。
- [ ] 为可版本化小资源生成 gzip 静态压缩，设置正确缓存与 ETag；视频支持 Range，HTML 短边缘缓存按两站路径精确匹配并绕过评论。
- [x] 使用现有备份账户/传输身份时只最小读取授权，不接触 GEOHOT 应用；新建独立两站备份定时器、保留策略与离线恢复检查。

## 任务 4：免费能力
- [ ] 两仓库增加只读最小权限 GitHub Actions 检查、CodeQL、依赖清单和安全文档；开通可用免费依赖安全更新与防推送/删分支规则。
- [ ] 核实 Azure Monitor/Advisor/CSPM、预算与免费量；保留已有费用提醒，不能将付费 Defender/日志计划当免费开通。
- [ ] 检查学生包相关监控/工具是否可无付费安全兑换，遇协议/身份验证保留精确操作页，不自动签署。

## 任务 5：发布验收
- [ ] 独立变更审查后修复 Important 项；先推送正常提交，再版本化部署与回滚。
- [ ] 10 语纪念站与中英个人站、地球任意方向、地图标记/漫游、视频播放/Range、留言加载、头像现有资源、语言切换、键盘/无 JS/reduced-motion 验证。
- [ ] 核验公开响应头、源站绕过被拒、最小权限、CDN 与部署字节、CI 状态。对未执行的业务写测试明确列边界。
- [ ] 报告实际前后耗时、免费服务已用/不适用/等待用户，保留回滚备份和证据，清理本次可替代临时物。
