/** Browser regression for the immersive portfolio.
 * PLAYWRIGHT_MODULE may point to a locally installed Playwright module.
 * Run against tools/serve.mjs: node tests/portfolio.browser.mjs http://127.0.0.1:8901
 */
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.argv[2] || 'http://127.0.0.1:8901';
const browser = await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const results = [];
try {
 for (const lang of ['/', '/en/']) {
  for (const width of [320,390,768,1440]) {
   const context = await browser.newContext({viewport:{width,height:900},permissions:['clipboard-read','clipboard-write']});
   const page = await context.newPage(), errors = [], failed = [];
   page.on('pageerror',e=>errors.push(e.message));
   page.on('response',r=>{if(r.status()>=400 && r.url().startsWith(base)) failed.push(r.url());});
   await page.addInitScript(() => {
    window.loadingCLS = 0;
    new PerformanceObserver(list => {for(const entry of list.getEntries()) if(!entry.hadRecentInput) window.loadingCLS += entry.value;}).observe({type:'layout-shift',buffered:true});
   });
   if(lang === '/' && width === 390) {
    const cdp = await context.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:200000,uploadThroughput:100000});
   }
   await page.goto(base+lang,{waitUntil:'networkidle'});
   await page.waitForFunction(()=>document.querySelector('.hero').dataset.field === 'ready' && document.querySelector('.hero').dataset.earth === 'ready');
   assert.ok(await page.evaluate(() => window.loadingCLS) < .01, `loading layout shift ${lang} ${width}`);
   const overlap = await page.evaluate(() => {
    const a = document.querySelector('#field').getBoundingClientRect();
    return ['.hero-copy','.hero h1','.hero-caption','.motion-toggle'].some(selector => {
      const b = document.querySelector(selector).getBoundingClientRect();
      return Math.min(a.right,b.right)>Math.max(a.left,b.left)+1 && Math.min(a.bottom,b.bottom)>Math.max(a.top,b.top)+1;
    });
   });
   assert.equal(overlap,false,`orbit overlaps content ${lang} ${width}`);
   assert.equal(await page.locator('h1').count(),1);
   assert.equal(await page.locator('.work-card').count(),2);
   const overflow = await page.evaluate(()=>document.documentElement.scrollWidth > innerWidth);
   assert.equal(overflow,false,`page overflow ${lang} ${width}`);
   if(width<1001){
    await page.locator('.menu-toggle').click();assert.equal(await page.locator('.menu-toggle').getAttribute('aria-expanded'),'true');
    await page.keyboard.press('Escape');assert.equal(await page.locator('.menu-toggle').getAttribute('aria-expanded'),'false');
    await page.locator('.menu-toggle').click();
   }
   await page.locator('#nav a[href="#works"]').click();await page.waitForTimeout(1000);
   assert.equal(new URL(page.url()).hash,'#works');
   assert.ok(await page.locator('#works').evaluate(e=>e.getBoundingClientRect().top)>=75,'anchor covered by header');
   assert.equal(await page.locator('.menu-toggle').getAttribute('aria-expanded'),'false');
   await page.locator('.project-switch button').nth(1).click();
   assert.equal(await page.locator('.work-card').nth(1).isVisible(),true);
   assert.equal(await page.locator('.work-card').first().isVisible(),false);
   await page.locator('.project-switch button').first().click();
   await page.locator('.lang-btn').click();assert.equal(await page.locator('.lang-menu').isVisible(),true);
   await page.keyboard.press('Escape');assert.equal(await page.locator('.lang-menu').isVisible(),false);
   await page.locator('.copy-mail').click();
   assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),'xxc200707@gmail.com');
   await page.locator('.brand').click();await page.waitForTimeout(1000);
   await page.locator('.motion-toggle').click();assert.equal(await page.locator('.motion-toggle').getAttribute('aria-pressed'),'true');
   assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
   console.log(`Checking ${lang} ${width}px complete`);
   results.push(`${lang} ${width}px: WebGL, overflow, menu, anchors, language, clipboard, pause OK`);
   await context.close();
  }
 }
 for (const mode of ['no-js','reduced','no-webgl','texture-failure']) {
  const context = await browser.newContext({viewport:{width:390,height:844},javaScriptEnabled:mode!=='no-js',reducedMotion:mode==='reduced'?'reduce':'no-preference'});
  if(mode==='no-webgl')await context.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return type.startsWith('webgl')?null:original.call(this,type,...args);};});
  const p=await context.newPage();
  if(mode==='texture-failure') await p.route('**/earth-200408-*.webp', route => route.abort());
  await p.goto(base,{waitUntil:'networkidle'});
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await p.locator('#works').scrollIntoViewIfNeeded();await p.waitForTimeout(800);
  assert.equal(await p.locator('.work-card').first().evaluate(e=>getComputedStyle(e).opacity),'1');
  assert.equal(await p.locator('.btn-live').first().isVisible(),true);
  if(mode==='reduced')assert.equal(await p.locator('.motion-toggle').isDisabled(),true);
  if(mode==='texture-failure') {assert.equal(await p.locator('.hero').getAttribute('data-earth'),'error');assert.equal(await p.locator('.orbit-fallback img').evaluate(e=>e.naturalWidth),800);assert.equal(await p.locator('.orbit-fallback').evaluate(e=>getComputedStyle(e).visibility),'visible');}
  if(mode==='no-webgl')assert.equal(await p.locator('.hero').getAttribute('data-field'),'off');
  results.push(`${mode}: readable content and fallback OK`);await context.close();
 }
 console.log(results.join('\n'));
} finally {await browser.close();}
