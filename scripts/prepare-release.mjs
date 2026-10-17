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
