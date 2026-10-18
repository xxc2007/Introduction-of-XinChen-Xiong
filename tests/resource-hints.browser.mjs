import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({channel:'chrome',headless:true});
const base=process.argv[2]||'http://127.0.0.1:8914';
try{
 for(const lang of ['/', '/en/'])for(const width of [390,1440]){
  const page=await browser.newPage({viewport:{width,height:900}}),requests=[];
  page.on('request',r=>requests.push(r.url()));
  await page.route('**/assets/js/scene.js*',async route=>{
   for(const name of ['three.module.min.js','three.core.min.js'])assert.ok(requests.some(u=>u.endsWith('/'+name)),`${name} must start before scene imports are parsed`);
   assert.ok(requests.some(u=>u.includes('earth-200408-')),'texture must start before scene initialization');
   await route.continue();
  });
  await page.goto(base+lang,{waitUntil:'networkidle'});
  await page.waitForFunction(()=>document.querySelector('.hero').dataset.field==='ready');
  const hints=await page.locator('link[rel="modulepreload"]').evaluateAll(els=>els.map(e=>e.href));
  for(const name of ['three.module.min.js','three.core.min.js']){
   assert.equal(hints.filter(u=>u.endsWith('/'+name)).length,1,`${name} needs one early hint`);
   assert.equal(requests.filter(u=>u.endsWith('/'+name)).length,1,`${name} must not download twice`);
  }
  const texture=width===390?'1024':'2048';
  assert.equal(requests.filter(u=>u.includes(`earth-200408-${texture}.webp`)).length,1,'preloaded texture must be reused');
  assert.equal(await page.locator('link[rel="prefetch"]').count(),0,'no speculative document fetch before intent');
  const button=page.locator('.lang > button');
  await button.click();await button.click();await button.click();
  assert.deepEqual(await page.locator('link[rel="prefetch"]').evaluateAll(els=>els.map(e=>new URL(e.href).pathname)),[lang==='/'?'/en/':'/']);
  await page.close();
 }
 for(const connection of [{saveData:true,effectiveType:'4g'},{saveData:false,effectiveType:'2g'},{saveData:false,effectiveType:'slow-2g'}]){
  const page=await browser.newPage(),requests=[];
  await page.addInitScript(value=>Object.defineProperty(navigator,'connection',{value}),connection);
  page.on('request',r=>requests.push(r.url()));
  await page.goto(base,{waitUntil:'networkidle'});await page.locator('.lang > button').click();
  assert.equal(await page.locator('link[rel="modulepreload"],link[rel="prefetch"],link[rel="preload"][as="image"]').count(),0);
  assert.equal(requests.some(u=>u.includes('/vendor/')||/earth-200408-\d/.test(u)),false,'constrained network must retain static fallback');
  await page.close();
 }
 for(const href of ['/geohot/','/geohot/api/items','https://example.invalid/']){
  const page=await browser.newPage();await page.goto(base,{waitUntil:'networkidle'});
  await page.locator('.lang a[hreflang="en"]').evaluate((a,href)=>a.href=href,href);
  await page.locator('.lang > button').click();
  assert.equal(await page.locator('link[rel="prefetch"]').count(),0,'only known language document paths may be prefetched');
  await page.close();
 }
 console.log('Resource hints: desktop/mobile reuse, language intent, constrained network and URL boundaries OK');
}finally{await browser.close();}
