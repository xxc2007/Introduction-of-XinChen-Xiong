import {readFileSync,writeFileSync,statSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {gzipSync} from 'node:zlib';
import {initialJS} from './asset-groups.mjs';
const tracked=execFileSync('git',['ls-files'],{encoding:'utf8'}).trim().split('\n').filter(Boolean);
const kb=n=>(Math.round(n/102.4)/10).toFixed(1),fmt=n=>n.toLocaleString('en-US');
const size=p=>statSync(p).size,gz=p=>gzipSync(readFileSync(p)).length;
for(const file of ['README.md','README.en.md']){
 const english=file.includes('.en.');
 const rows=[
  `| ${english?'Repository files':'仓库文件'} | **${tracked.length}** | \`git ls-files \\| wc -l\` = ${tracked.length} |`,
  `| ${english?'HTML size':'中英两页字节'} | \`${fmt(size('index.html'))}\` / \`${fmt(size('en/index.html'))}\` B | index.html / en/index.html |`,
  `| ${english?'Site CSS':'全站 CSS'} | **${kb(size('assets/css/style.css'))} KB** (\`${fmt(size('assets/css/style.css'))}\` B), gzip **${kb(gz('assets/css/style.css'))} KB** | assets/css/style.css |`,
  `| ${english?'Hero JS':'首屏 JS（含 Three.js）'} | gzip **${kb(initialJS.reduce((s,p)=>s+gz(p),0))} KB** | scripts/check-bytes.mjs |`,
 ];
 for(const [re,zh,en] of [
  [/^assets\/images\/(avatar|shot)[^/]*\.(jpg|jpeg|png|webp)$/,'图片（头像 + 两张作品截图）','Images (avatar + two project shots)'],
  [/^assets\/images\/(og-card|banner|favicon)[^/]*\.(jpg|jpeg|png|webp|svg)$/,'不进首屏的分享素材','Social/share assets'],
 ]){const bytes=tracked.filter(p=>re.test(p)).reduce((s,p)=>s+size(p),0);rows.push(`| ${english?en:zh} | **${kb(bytes)} KB** (\`${fmt(bytes)}\` B) | scripts/check-bytes.mjs |`);}
 const content=readFileSync(file,'utf8').replace(/\r\n/g,'\n');
 const updated=content.replace(/(\|(?: 项目 | Item )[^\n]*\n\|---\|---\|---\|\n)[\s\S]*?(?=\n## )/,(_,header)=>header+rows.join('\n')+'\n');
 if(updated===content&&!content.includes(rows[0]))throw new Error('README measurement table not found: '+file);
 writeFileSync(file,updated);
}
console.log('README measurements updated from the current files and Git index.');
