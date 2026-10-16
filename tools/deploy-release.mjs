// Publish a clean Git revision as a root-owned release; retain the previous release.
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {homedir,platform} from 'node:os';
import {resolve} from 'node:path';
const root=resolve(process.cwd());
const site=process.argv[2];
if(!['intro','nc15'].includes(site))throw Error('Usage: node tools/deploy-release.mjs intro|nc15');
const env=Object.fromEntries(readFileSync(resolve(root,'.deploy.env'),'utf8').split(/\r?\n/).filter(l=>/^\s*[A-Z_]+=/.test(l)).map(l=>{const i=l.indexOf('=');return [l.slice(0,i).trim(),l.slice(i+1).replace(/^['"]|['"]$/g,'')];}));
const targetRoot='/var/www/'+site;
if(env.DEPLOY_ROOT!==targetRoot)throw Error('Deployment root does not match the selected website');
const git=(...args)=>execFileSync('git',args,{cwd:root,maxBuffer:512*1024*1024});
if(git('status','--porcelain').toString().trim())throw Error('Commit all reviewed changes before deploying');
const sha=git('rev-parse','HEAD').toString().trim();
const remote=execFileSync('gh',['api','repos/'+(site==='intro'?'xxc2007/Introduction-of-XinChen-Xiong':'xxc2007/In-memory-of-Nanchang-No.-15-Middle-School')+'/git/ref/heads/main','--jq','.object.sha'],{encoding:'utf8'}).trim();
if(sha!==remote)throw Error('GitHub main and the local release are not the same revision');
const ssh=platform()==='win32'?'C:/Program Files/Git/usr/bin/ssh.exe':'ssh';
const options=['-o','BatchMode=yes','-o','StrictHostKeyChecking=yes','-o','UserKnownHostsFile='+homedir()+'/.ssh/known_hosts','-i',env.DEPLOY_KEY.replace(/^~/,homedir()),env.DEPLOY_USER+'@'+env.DEPLOY_HOST];
const run=(command,input)=>execFileSync(ssh,[...options,command],{input,encoding:input instanceof Buffer?undefined:'utf8',timeout:180000,maxBuffer:4*1024*1024});
const id=sha.slice(0,12)+'-'+Date.now();
const release='/var/www/.site-releases/'+site+'/'+id;
const q=value=>"'"+value.replaceAll("'","'\\''")+"'";
run('sudo install -d -m 755 '+q(release));
const paths=site==='intro'?['index.html','en','404.html','robots.txt','sitemap.xml','assets']:['index.html','404.html','robots.txt','sitemap.xml','assets','images','maplibre','en','zh-Hant','ja','ko','ru','es','fr','pt','ar','docs/promo'];
run('sudo tar --no-same-owner -xf - -C '+q(release),git('archive','--format=tar','HEAD',...paths));
const code=`import os,pathlib,shutil,gzip,json,urllib.request,fcntl
site=${JSON.stringify(site)};release=pathlib.Path(${JSON.stringify(release)});live=pathlib.Path(${JSON.stringify(targetRoot)})
assert release.is_dir() and (release/'index.html').is_file()
if site=='nc15':
 (release/'docs'/'promo').rename(release/'promo');(release/'docs').rmdir()
else:
 old=live/'assets'/'promo';new=release/'assets'/'promo'
 if old.is_dir():
  for item in old.rglob('*'):
   rel=item.relative_to(old);dest=new/rel
   if item.is_dir():dest.mkdir(parents=True,exist_ok=True)
   elif not dest.exists():dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(item,dest)
for path in release.rglob('*'):
 assert not path.is_symlink(),'Unexpected release symlink'
 os.chown(path,0,0);os.chmod(path,0o755 if path.is_dir() else 0o644)
 if path.is_file() and path.suffix in ['.html','.css','.js','.mjs','.svg','.json'] and path.stat().st_size>1024:
  with path.open('rb') as src,gzip.open(str(path)+'.gz','wb',compresslevel=9) as dst:shutil.copyfileobj(src,dst)
  os.chmod(str(path)+'.gz',0o644)
lock=open('/var/lock/site-release-'+site+'.lock','w');fcntl.flock(lock,fcntl.LOCK_EX)
link=live.with_name('.'+site+'-next');assert not link.exists() and not link.is_symlink()
link.symlink_to(release,target_is_directory=True)
previous=str(live.resolve()) if live.is_symlink() else str(live)+'.before-'+${JSON.stringify(id)}
initial=not live.is_symlink()
try:
 if initial:live.rename(previous)
 os.replace(link,live)
 urls=['/','/en/','/assets/js/main.js'] if site=='intro' else ['/nc15/','/nc15/en/','/nc15/ar/','/nc15/assets/map-loader.js','/nc15/maplibre/maplibre-gl.mjs','/nc15/promo/']
 for url in urls:
  req=urllib.request.Request('http://127.0.0.1'+url,headers={'Host':'xxc2007.me'})
  with urllib.request.urlopen(req,timeout=15) as response:assert response.status==200,url
except Exception:
 if live.is_symlink() and live.resolve()==release:
  if initial:live.unlink();pathlib.Path(previous).rename(live)
  else:
   rollback=live.with_name('.'+site+'-rollback');rollback.symlink_to(previous,target_is_directory=True);os.replace(rollback,live)
 elif initial and not live.exists() and pathlib.Path(previous).is_dir():pathlib.Path(previous).rename(live)
 if link.is_symlink():link.unlink()
 raise
pathlib.Path('/var/backups/site-upgrade-20261016/'+site+'-release.json').write_text(json.dumps({'commit':${JSON.stringify(sha)},'release':str(release),'previous':previous}))
print(json.dumps({'site':site,'commit':${JSON.stringify(sha)},'origin_checks':'ok','previous_retained':True}))
`;
try{process.stdout.write(run('sudo python3 -',code));}
catch(error){process.stderr.write('Release verification failed. Inspect the retained release and rollback record.\n');process.exitCode=1;}
