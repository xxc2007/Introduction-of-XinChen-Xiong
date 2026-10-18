import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {existsSync,readFileSync} from 'node:fs';
import {join} from 'node:path';
import {homedir} from 'node:os';
const bundled=join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe');
const python=process.env.PYTHON||(existsSync(bundled)?bundled:'python3');
const staticLine=String.raw`location ~* \.(css|js|mjs|map|woff2?|ttf|otf|png|jpe?g|gif|svg|ico|webp|avif)$ {`;
const headers='add_header Cache-Control "public, max-age=31536000, immutable" always;\nadd_header X-Content-Type-Options "nosniff" always;\nadd_header Referrer-Policy "strict-origin-when-cross-origin" always;\nadd_header Content-Security-Policy "default-src \'self\'; frame-ancestors \'none\'" always;';
const protectedBlocks=String.raw`location ^~ /nc15/ { location ~* \.(css|mp4)$ { add_header Cache-Control "NC15"; } }
location ^~ /geohot/ { proxy_pass http://127.0.0.1:3000; }
location ^~ /comment/ { proxy_pass http://127.0.0.1:23366; }`;
const server=port=>`server {\nlisten ${port};\n${protectedBlocks}\n    ${staticLine}\n${headers}\n    }\n}\n`;
const fixture=server(80)+server('443 ssl');
const run=input=>spawnSync(python,['tools/patch-media-policy.py'],{input,encoding:'utf8'});
test('media patch adds only two scoped blocks, retains security headers and is idempotent',()=>{
 const first=run(fixture);assert.equal(first.status,0,first.stderr);
 assert.equal(first.stdout.split('location ~* ^/assets/(video|promo)/.*\\.(mp4|webm)$ {').length-1,2);
 assert.equal(first.stdout.split('add_header Cache-Control $site_video_cache always;').length-1,2);
 assert.equal(first.stdout.split('default-src').length-1,4);
 assert.equal(first.stdout.split(protectedBlocks).length-1,2,'nested/proxied blocks must remain byte-for-byte');
 const second=run(first.stdout);assert.equal(second.status,0,second.stderr);assert.equal(second.stdout,first.stdout);
});
test('media patch rejects missing/extra/static body drift and modified generated blocks without output',()=>{
 for(const input of [server(80),fixture+server(8080),fixture.replace('nosniff','changed'),fixture.replace(headers,headers+'\nproxy_pass http://bad.invalid;'),fixture.replace('css|js','scss|js'),fixture.slice(0,-2)]){
  const result=run(input);assert.notEqual(result.status,0);assert.equal(result.stdout,'');
 }
 const good=run(fixture);assert.equal(good.status,0,good.stderr);
 const changed=run(good.stdout.replace('$site_video_cache','"public"'));assert.notEqual(changed.status,0);assert.equal(changed.stdout,'');
});
test('media patch copies HTTPS-only headers without leaking them to HTTP and handles CRLF',()=>{
 const tls=server('443 ssl').replace(headers,headers+'\nadd_header Strict-Transport-Security "max-age=31536000" always;');
 const source=(server(80)+tls).replaceAll('\n','\r\n');
 const first=run(source);assert.equal(first.status,0,first.stderr);
 const split=first.stdout.indexOf('listen 443 ssl;');
 assert.equal(first.stdout.slice(0,split).includes('Strict-Transport-Security'),false);
 assert.equal(first.stdout.slice(split).split('Strict-Transport-Security').length-1,2);
 const second=run(first.stdout);assert.equal(second.status,0,second.stderr);assert.equal(second.stdout,first.stdout);
});
test('media map grants immutable only to an eight-hex version and retains original default',()=>{
 const map=readFileSync('deploy/site-video-cache.conf','utf8');
 assert.match(map,/map \$arg_v \$site_video_cache/);
 const pattern=map.match(/"(~\^.*\$)"\s+"public, max-age=31536000, immutable";/);assert.ok(pattern);
 const re=new RegExp(pattern[1].slice(1));
 for(const version of ['1234abcd','ABCD1234'])assert.ok(re.test(version));
 for(const version of ['', 'dev','1234567','123456789','1234567g','1234abcd&x=1'])assert.equal(re.test(version),false);
 assert.match(map,/default "max-age=14400";/);
});
