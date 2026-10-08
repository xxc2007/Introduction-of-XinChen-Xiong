/* 从 assets/images/favicon-32.png 生成一个合法的 favicon.ico。
   用法：node tools/make-favicon.mjs

   为什么要有这个脚本：仓库里原来那份 favicon.ico 其实是 JPEG 字节
   （文件头 FF D8 … JFIF），只是被起了 .ico 的名字——浏览器靠嗅探大多还能画出来，
   但它不是一个 ICO 容器，严格的客户端可以不认。
   ICO 从 Vista 起允许直接内嵌 PNG，所以这里不重新编码像素，
   只把那张真正的 32×32 PNG 原样装进容器：字节可复现，也不会引入第二次压缩损失。 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "assets/images/favicon-32.png");
const OUT = join(ROOT, "assets/images/favicon.ico");

const png = readFileSync(SRC);
if (!(png[0] === 0x89 && png[1] === 0x50 && png[2] === 0x4e && png[3] === 0x47)) {
  throw new Error(`${SRC} 不是 PNG，拒绝继续`);
}
const w = png.readUInt32BE(16), h = png.readUInt32BE(20);
if (w > 256 || h > 256) throw new Error(`ICO 单帧最大 256，当前是 ${w}×${h}`);

const HEADER = 6, ENTRY = 16;
const buf = Buffer.alloc(HEADER + ENTRY + png.length);
buf.writeUInt16LE(0, 0);          // 保留，必须为 0
buf.writeUInt16LE(1, 2);          // 类型 1 = 图标
buf.writeUInt16LE(1, 4);          // 帧数
// 宽高：0 表示 256；这里是 32
buf.writeUInt8(w === 256 ? 0 : w, HEADER + 0);
buf.writeUInt8(h === 256 ? 0 : h, HEADER + 1);
buf.writeUInt8(0, HEADER + 2);    // 调色板颜色数：0 = 没有
buf.writeUInt8(0, HEADER + 3);    // 保留
buf.writeUInt16LE(1, HEADER + 4); // 颜色平面
buf.writeUInt16LE(32, HEADER + 6);// 位深
buf.writeUInt32LE(png.length, HEADER + 8);          // 这一帧的字节数
buf.writeUInt32LE(HEADER + ENTRY, HEADER + 12);     // 像素数据偏移
png.copy(buf, HEADER + ENTRY);

writeFileSync(OUT, buf);
console.log(`✓ favicon.ico ← favicon-32.png（${w}×${h}，内嵌 PNG）共 ${buf.length} 字节`);
