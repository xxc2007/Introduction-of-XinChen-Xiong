#!/usr/bin/env python3
"""Two-site snapshots to the existing private Azure account, without reading other apps."""
import datetime, fcntl, hashlib, json, os, pathlib, sqlite3, subprocess, tarfile, tempfile
ROOT=pathlib.Path('/var/backups/site-snapshots')
ROOT.mkdir(mode=0o700,parents=True,exist_ok=True);os.chmod(ROOT,0o700)
lock=open(ROOT/'lock','w');fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
def run(*args):return subprocess.check_output(args,text=True,stderr=subprocess.PIPE).strip()
config=json.loads(run('rclone','config','dump')).get('azblob',{})
assert config.get('type')=='azureblob' and config.get('account')=='xxc2007backup','Unexpected backup destination'
remote='azblob:backups/websites/'
def checksum(path,kind):
    value=hashlib.new(kind)
    with path.open('rb') as stream:
        for chunk in iter(lambda:stream.read(1024*1024),b''):value.update(chunk)
    return value.hexdigest()
def upload(path,name):
    used=json.loads(run('rclone','size','azblob:backups','--json'))['bytes']
    assert used+path.stat().st_size < 4_000_000_000,'Backup ceiling reached; refusing further storage growth'
    run('rclone','copyto',str(path),remote+name,'--checksum','--retries','2')
    expected=checksum(path,'md5')
    actual=run('rclone','md5sum',remote+name).split()[0]
    assert actual==expected,'Remote backup checksum mismatch'
    return checksum(path,'sha256')
# Remove only objects already beyond this workflow's retention; never purge another prefix.
objects=json.loads(run('rclone','lsjson',remote,'--files-only'))
for prefix,keep in [('static-',2),('comments-',14)]:
    matches=sorted([o for o in objects if o['Name'].startswith(prefix)],key=lambda o:o['ModTime'],reverse=True)
    for item in matches[keep:]:run('rclone','deletefile',remote+item['Name'])
with tempfile.TemporaryDirectory(dir=ROOT) as td:
    td=pathlib.Path(td);today=datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ')
    fingerprint=hashlib.sha256()
    for base in ['/var/www/intro','/var/www/nc15']:
        for path in sorted(pathlib.Path(base).rglob('*')):
            if path.is_file():fingerprint.update((str(path)+str(path.stat().st_size)+str(path.stat().st_mtime_ns)).encode())
    name='static-'+fingerprint.hexdigest()[:16]+'.tar.gz'
    old=json.loads((ROOT/'status.json').read_text()) if (ROOT/'status.json').exists() else {}
    if old.get('static')!=name:
        archive=td/name
        with tarfile.open(archive,'w:gz',compresslevel=1,dereference=True) as out:
            for base in ['/var/www/intro','/var/www/nc15']:out.add(base,arcname=base.lstrip('/'))
        old['static_sha256']=upload(archive,name)
        old['static']=name
    db=td/'artalk.db';src=sqlite3.connect('file:/opt/artalk/data/artalk.db?mode=ro',uri=True);dst=sqlite3.connect(db);src.backup(dst)
    assert dst.execute('pragma integrity_check').fetchone()[0]=='ok';dst.close();src.close()
    dynamic=td/('comments-'+today+'.tar.gz')
    with tarfile.open(dynamic,'w:gz',compresslevel=1) as out:
        out.add(db,arcname='artalk.db')
        images=pathlib.Path('/opt/artalk/data/artalk-img')
        if images.exists():out.add(images,arcname='artalk-img')
    digest=upload(dynamic,dynamic.name)
    restored=td/'restored.tar.gz';run('rclone','copyto',remote+dynamic.name,str(restored),'--retries','2')
    assert checksum(restored,'sha256')==digest
    with tarfile.open(restored) as archive:
        member=archive.getmember('artalk.db');data=archive.extractfile(member).read()
        restored_db=td/'restored.db';restored_db.write_bytes(data)
    con=sqlite3.connect('file:'+str(restored_db)+'?mode=ro',uri=True);assert con.execute('pragma integrity_check').fetchone()[0]=='ok';con.close()
    objects=json.loads(run('rclone','lsjson',remote,'--files-only'))
    for prefix,keep in [('static-',2),('comments-',14)]:
        matches=sorted([o for o in objects if o['Name'].startswith(prefix)],key=lambda o:o['ModTime'],reverse=True)
        for item in matches[keep:]:run('rclone','deletefile',remote+item['Name'])
    old.update(last_success_utc=today,comments=dynamic.name,comments_sha256=digest,restore_integrity='ok')
    (ROOT/'status.json').write_text(json.dumps(old,indent=2)+'\n');os.chmod(ROOT/'status.json',0o600)
    print(json.dumps({'backup':'ok','remote_checksum':'ok','sqlite_restore':'ok','static':name,'comments':dynamic.name}))
