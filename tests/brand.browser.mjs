import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({channel:'chrome',headless:true});
const base=process.argv[2]||'http://127.0.0.1:8901';
try {
 for(const lang of ['/', '/en/']) for(const width of [390,1440]) {
  const page=await browser.newPage({viewport:{width,height:900}});
  await page.goto(base+lang,{waitUntil:'networkidle'});
  const original=await page.locator('.hero h1').textContent();
  const bounds=await page.locator('.hero h1').boundingBox();
  const geometry=await page.evaluate(()=>{
   const box=document.querySelector('.hero h1').getBoundingClientRect();
   return {start:Math.max(0,box.top+scrollY-document.querySelector('.topbar').offsetHeight-100),distance:Math.min(360,box.height*.75+60)};
  });
  for(const p of [.1,.5,.9,1.02]) {
   await page.evaluate(y=>scrollTo({top:y,behavior:'instant'}),geometry.start+geometry.distance*p);
   await page.waitForFunction(p=>Math.abs(Number(document.querySelector('.brand-flight').dataset.progress)-Math.min(p,1))<.015,p);
   assert.equal(await page.locator('.brand-flight').getAttribute('aria-hidden'),'true');
   assert.equal(await page.locator('.hero h1').textContent(),original);
   const box=await page.locator('.hero h1').boundingBox();
   assert.equal(box.width,bounds.width);assert.equal(box.height,bounds.height);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  }
  assert.equal(await page.locator('.brand-flight').evaluate(e=>getComputedStyle(e).visibility),'hidden');
  assert.equal(await page.locator('.brand b').evaluate(e=>e.style.opacity),'1');
  await page.evaluate(y=>scrollTo({top:y,behavior:'instant'}),geometry.start+geometry.distance*.5);
  await page.waitForFunction(()=>getComputedStyle(document.querySelector('.brand-flight')).visibility==='visible');
  // Dispatch without scrolling the control into view: pause must reset immediately.
  await page.locator('.motion-toggle').dispatchEvent('click');
  await page.waitForFunction(()=>getComputedStyle(document.querySelector('.brand-flight')).visibility==='hidden');
  assert.equal(await page.locator('.hero h1').evaluate(e=>e.style.opacity),'');
  await page.locator('.motion-toggle').dispatchEvent('click');
  await page.waitForFunction(()=>getComputedStyle(document.querySelector('.brand-flight')).visibility==='visible');
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.waitForFunction(()=>getComputedStyle(document.querySelector('.brand-flight')).visibility==='hidden');
  await page.emulateMedia({reducedMotion:'no-preference'});
  if(width===390){
   await page.locator('.menu-toggle').click();
   await page.waitForFunction(()=>getComputedStyle(document.querySelector('.brand-flight')).visibility==='hidden');
   await page.keyboard.press('Escape');
   await page.waitForFunction(()=>getComputedStyle(document.querySelector('.brand-flight')).visibility==='visible');
  }
  await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
  await page.waitForFunction(()=>document.querySelector('.brand-flight').dataset.progress==='0');
  assert.equal(await page.locator('.hero h1').evaluate(e=>e.style.opacity),'');
  console.log(`${lang} ${width}: transfer, reverse, stable heading geometry, pause, reduced motion and menu OK`);
  await page.close();
 }
}finally{await browser.close();}
