// 本地预览服务器：把仓库根挂成站点，并把纪念册仓库挂到 /nc15/，用于迁移前的真机验证。
// 用法：node tools/serve.mjs [端口]      默认 8899，只监听 127.0.0.1
import { createServer } from "node:http";
import { createReadStream, statSync, existsSync } from "node:fs";
import { extname, join, resolve, sep } from "node:path";

const PORT = Number(process.argv[2] || 8899);
const ROOT = resolve(process.cwd());
// 纪念册仓库（迁移后应为 /nc15/ 前缀）；不存在时该前缀直接 404
const NC15 = process.env.NC15_DIR ? resolve(process.env.NC15_DIR) : "D:\\nanchang15-website\\site";

const MIME = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml",
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp",
  ".ico": "image/x-icon", ".woff2": "font/woff2", ".woff": "font/woff",

  ".txt": "text/plain; charset=utf-8", ".xml": "application/xml; charset=utf-8",
  ".map": "application/json",
};

const send = (res, code, body, headers = {}) => {
  res.writeHead(code, { "Cache-Control": "no-store", ...headers });
  res.end(body);
};

const server = createServer((req, res) => {
  let path;
  try { path = decodeURIComponent(new URL(req.url, "http://x").pathname); }
  catch { return send(res, 400, "bad request"); }

  const fromNc15 = path === "/nc15" || path.startsWith("/nc15/");
  const rel = fromNc15 ? path.slice("/nc15".length) : path;
  const base = fromNc15 ? NC15 : ROOT;
  if (fromNc15 && !existsSync(NC15)) return send(res, 404, "nc15 source not mounted");

  let file = resolve(join(base, rel));
  // 目录穿越一律拒绝
  if (file !== base && !file.startsWith(base + sep)) return send(res, 403, "forbidden");
  if (statSync(file, { throwIfNoEntry: false })?.isDirectory()) file = join(file, "index.html");
  if (!existsSync(file)) return send(res, 404, `404 ${path}`);

  const ext = extname(file).toLowerCase();
  res.writeHead(200, {
    "Content-Type": MIME[ext] ?? "application/octet-stream",
    "Content-Length": statSync(file).size,
    "Cache-Control": "no-store",
  });
  createReadStream(file).pipe(res);
});

server.on("error", (e) => {
  console.log(e.code === "EADDRINUSE"
    ? `端口 ${PORT} 已被占用——换个端口：node tools/serve.mjs 8900`
    : `预览服务器启动失败：${e.message}`);
  process.exit(1);
});
server.listen(PORT, "127.0.0.1", () => {
  console.log(`预览： http://127.0.0.1:${PORT}/  （/nc15/ → ${NC15}）`);
});
