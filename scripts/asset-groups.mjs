import {readdirSync} from 'node:fs';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
// Files are counted before git add too. Only explicitly deferred modules are excluded from first paint.
export const ownJS=readdirSync(join(root,'assets/js')).filter(name=>name.endsWith('.js')).map(name=>'assets/js/'+name);
const deferred=new Set(['assets/js/process-scene.js']);
export const initialJS=[...ownJS.filter(path=>!deferred.has(path)),...readdirSync(join(root,'assets/vendor')).filter(name=>name.endsWith('.js')).map(name=>'assets/vendor/'+name)];
