# stage015 本地验证记录

2026-10-14，Windows Chrome headless，软件 WebGL，本地 http://127.0.0.1:8901。未部署生产。

- 改前 1440×900 首页子资源 transferSize 合计 2,799,180 B；改后 405,564 B。比较含本地服务器 gzip，不能解读成线上同幅度提速。
- 改后 390×844 首页子资源 313,168 B，字体请求 0。数字不含 HTML 文档与滚动后加载的项目图。
- 150 ms 延迟、200,000 B/s 下载、100,000 B/s 上传、禁用缓存：一次手机模拟 FCP 780 ms，完整地球就绪约 2,584 ms，加载 CLS 0；非真实手机或公网性能承诺。
- 1440×900、390×844、2560×1390、1280×720：画布与说明、姓名、底部说明矩形交集均为 0。
- 地球贴图请求主动中断：data-earth=error，800 像素静态预览保留可见，正文 opacity=1。
- 本地 CSS 压缩响应 Content-Encoding=gzip；ETag 条件请求返回 304。
- 回归入口：node --test tests/quality.test.mjs；node scripts/check-parity.mjs；node scripts/check-bytes.mjs；node scripts/check-links.mjs；PLAYWRIGHT_MODULE 指向已安装 Playwright 后 node tests/portfolio.browser.mjs。

对标范围是布局、视觉层级、3D 主视觉、菜单、作品切换和浏览节奏。未声称复刻参考站全部私有着色器、视频或交互，也未完成 Safari/Firefox/实体手机测试。
