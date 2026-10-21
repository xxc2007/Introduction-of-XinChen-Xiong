import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.argv[2]||'http://127.0.0.1:8901';
const bytes=readFileSync('assets/video/intro-promo.mp4');
for(const [range,start,end] of [['bytes=0-99',0,99],['bytes=-64',bytes.length-64,bytes.length-1],['bytes=100-',100,bytes.length-1]]){
 const response=await fetch(base+'/assets/video/intro-promo.mp4',{headers:{Range:range}});
 assert.equal(response.status,206);assert.equal(response.headers.get('content-type'),'video/mp4');
 assert.equal(response.headers.get('content-range'),`bytes ${start}-${end}/${bytes.length}`);
 assert.deepEqual(Buffer.from(await response.arrayBuffer()),bytes.subarray(start,end+1));
}
assert.equal((await fetch(base+'/assets/video/intro-promo.mp4',{headers:{Range:'bytes=99999999-'}})).status,416);
const head=await fetch(base+'/assets/video/intro-promo.mp4',{method:'HEAD'});
assert.equal(head.headers.get('content-length'),String(bytes.length));
assert.equal((await fetch(base+'/assets/video/intro-promo.mp4',{method:'HEAD',headers:{Range:'bytes=0-99','If-Range':head.headers.get('etag')}})).status,200);
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 for(const lang of ['/', '/en/'])for(const width of [390,1440]){
  const page=await browser.newPage({viewport:{width,height:900}}),requests=[],errors=[];
  page.on('request',r=>requests.push(r.url()));page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+lang,{waitUntil:'networkidle'});
  assert.equal(requests.some(url=>url.includes('.mp4')),false,'film must not download before activation');
  await page.locator('.film-entry').click();
  await page.waitForFunction(()=>document.querySelector('.film-dialog video').currentTime>.2);
  assert.equal(new URL(await page.locator('.film-dialog video').evaluate(e=>e.currentSrc)).pathname,lang==='/'?'/assets/video/intro-promo.mp4':'/assets/video/intro-promo-en.mp4');
  assert.equal(await page.locator('.film-dialog').evaluate(e=>e.open),true);
  assert.equal(await page.evaluate(()=>document.body.style.overflow),'hidden','menu click handler must not unlock the video backdrop');
  assert.equal(await page.locator('video').evaluate(e=>e.videoWidth),1920);
  await page.locator('video').evaluate(e=>e.currentTime=20);
  await page.waitForFunction(()=>document.querySelector('video').currentTime>20.2&&!document.querySelector('video').seeking);
  for(let i=0;i<6;i++){await page.keyboard.press('Tab');assert.ok(await page.evaluate(()=>document.querySelector('.film-dialog').contains(document.activeElement)));}
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  if(process.env.SHOTS)await page.screenshot({path:`${process.env.SHOTS}/film-${lang==='/'?'zh':'en'}-${width}.png`});
  await page.keyboard.press('Escape');
  assert.deepEqual(await page.evaluate(()=>({open:document.querySelector('.film-dialog').open,paused:document.querySelector('video').paused,src:document.querySelector('video').getAttribute('src'),focus:document.activeElement.className,overflow:document.body.style.overflow})),{open:false,paused:true,src:null,focus:'film-entry',overflow:''});
  await page.locator('.film-entry').click();await page.waitForFunction(()=>document.querySelector('video').currentTime>.1);
  await page.locator('.film-close').click();assert.equal(await page.locator('video').evaluate(e=>e.paused),true);
  assert.deepEqual(errors,[]);console.log(`${lang} ${width}: on-demand load, real playback/seek, keyboard containment, close/cleanup and reopen OK`);await page.close();
 }
 const failed=await browser.newPage();await failed.route('**/*.mp4?*',r=>r.fulfill({status:404,body:'missing'}));
 await failed.goto(base);await failed.locator('.film-entry').click();await failed.waitForFunction(()=>document.querySelector('.film-note').textContent.includes('加载失败'));
 assert.equal(await failed.locator('.film-dialog a[download]').isVisible(),true);await failed.close();
 const nojs=await browser.newPage({javaScriptEnabled:false});await nojs.goto(base);
 assert.ok((await nojs.locator('.film-entry').getAttribute('href')).includes('.mp4'));
 assert.equal(await nojs.locator('.film-dialog').isVisible(),false);await nojs.close();
 console.log('Range bytes, missing-media feedback and no-script direct link OK');
}finally{await browser.close();}
