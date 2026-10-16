import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {join} from 'node:path';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try {
 for(const lang of ['/', '/en/']) for(const width of [390,1440]) {
  const page=await browser.newPage({viewport:{width,height:900}});
  await page.goto((process.argv[2] || 'http://127.0.0.1:8901')+lang,{waitUntil:'networkidle'});
  assert.ok(await page.locator('.hero-sub').evaluate(e=>parseFloat(getComputedStyle(e).fontSize)) >= (width<1000?16:19));
  const before=await page.locator('#field').boundingBox();
  await page.evaluate(()=>scrollTo({top:180,behavior:'instant'}));await page.waitForFunction(()=>{const t=document.querySelector('.hero-copy').style.transform;return t && t!=='translateY(0px)';});
  assert.notEqual(await page.locator('.hero-copy').evaluate(e=>e.style.transform),'translateY(0px)');
  const after=await page.locator('#field').boundingBox();assert.equal(before.width,after.width);assert.equal(before.height,after.height);
  const target=page.locator('#how .closing');
  assert.ok((await target.getAttribute('class')).includes('is-pending'));
  await target.scrollIntoViewIfNeeded();await page.waitForTimeout(1200);
  assert.equal(await target.evaluate(e=>getComputedStyle(e).opacity),'1');
  assert.ok(!(await target.getAttribute('class')).includes('is-pending'));
  await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await page.waitForTimeout(200);
  if(process.env.SCREENSHOT_DIR) await page.screenshot({path:join(process.env.SCREENSHOT_DIR, `motion16-${lang==='/'?'zh':'en'}-${width}.png`)});
  console.log(`${lang} ${width}: restored reveal, scroll typography, stable orbit size and larger type OK`);
  await page.close();
 }
}finally{await browser.close();}
