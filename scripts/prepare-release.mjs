// Run before committing; CI and deployment use --check to reject stale immutable URLs.
import {readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const files=execFileSync('git',['ls-files'],{encoding:'utf8'}).trim().split('\n');
const hash=createHash('sha256');
for(const path of files.filter(p=>/^(assets|images|maplibre)\//.test(p)&&!p.endsWith('.html')).sort()){hash.update(path);hash.update(readFileSync(path));}
const version=hash.digest('hex').slice(0,8);let stale=[];
for(const path of files.filter(p=>p.endsWith('.html'))){const old=readFileSync(path,'utf8');const next=old.replace(/([?&]v=)[0-9a-z]{4,12}(?=["'&])/g,'$1'+version);if(old!==next){stale.push(path);if(!process.argv.includes('--check'))writeFileSync(path,next);}}
if(process.argv.includes('--check')&&stale.length)throw Error('Stale immutable resource URLs: run node scripts/prepare-release.mjs before committing: '+stale.join(', '));
console.log('Resource fingerprint',version,stale.length?'updated':'current');

const changingHTML=execFileSync('git',['diff','HEAD','--name-only'],{encoding:'utf8'}).split('\n').some(p=>['index.html','en/index.html'].includes(p));
const date=!process.argv.includes('--check')&&(stale.length||changingHTML)?new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai'}).format(new Date()):execFileSync('git',['log','-1','--format=%cs','--','index.html','en/index.html'],{encoding:'utf8'}).trim();
const sitemap=readFileSync('sitemap.xml','utf8'),updated=sitemap.replace(/<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/g,'<lastmod>'+date+'</lastmod>');
if(sitemap!==updated){if(process.argv.includes('--check'))throw Error('Stale sitemap date: run node scripts/prepare-release.mjs before committing');writeFileSync('sitemap.xml',updated);}
