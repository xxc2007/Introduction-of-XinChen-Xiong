import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({channel:'chrome',headless:true});
const base=process.argv[2]||'http://127.0.0.1:8901';
try {
 for(const lang of ['/', '/en/']) {
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  await page.goto(base+lang,{waitUntil:'networkidle'});
  const link=page.locator('#nav a').first();
  assert.equal(await page.locator('.menu-toggle').isVisible(),false);
  assert.equal(await link.getAttribute('aria-current'),'true');
  assert.equal(await link.getAttribute('aria-label'),(await link.textContent()).replaceAll('\u00a0',' ').trim());
  await link.hover();
  await page.waitForFunction(()=>getComputedStyle(document.querySelector('.nav-roll')).transform!=='none');
  await page.waitForTimeout(700);
  assert.ok(await link.locator('.nav-roll').first().evaluate(e=>new DOMMatrix(getComputedStyle(e).transform).m42< -5));
  await page.mouse.move(700,400);await link.focus();await page.waitForTimeout(700);
  assert.ok(await link.locator('.nav-roll').first().evaluate(e=>new DOMMatrix(getComputedStyle(e).transform).m42< -5));
  for(const id of ['about','works','how','beliefs','contact']) {
   await page.evaluate(id=>{const e=document.getElementById(id);scrollTo({top:scrollY+e.getBoundingClientRect().top+110,behavior:'instant'});},id);
   const tone=['about','how','contact'].includes(id)?'ink':'sand';
   await page.waitForFunction(tone=>document.querySelector('.topbar').dataset.tone===tone,tone);
   assert.equal(await page.locator('.topbar').evaluate(e=>getComputedStyle(e).backgroundColor),'rgba(0, 0, 0, 0)');
  }
  await page.setViewportSize({width:390,height:844});
  assert.equal(await page.locator('.menu-toggle').isVisible(),false);
  for(const item of await page.locator('#nav a').all())assert.equal(await item.isVisible(),true,'mobile navigation stays expanded');
  assert.equal(await page.locator('main').evaluate(e=>e.inert),false);
  await page.setViewportSize({width:1440,height:900});
  await page.waitForFunction(()=>!document.querySelector('main').inert);
  await page.emulateMedia({reducedMotion:'reduce'});await link.hover();
  assert.equal(await link.locator('.nav-roll').first().evaluate(e=>getComputedStyle(e).transform),'none');
  console.log(`${lang}: horizontal menu, expanded mobile links, accessible labels, letter roll, focus, section tones, resize recovery and reduced motion OK`);
  await page.close();
 }
}finally{await browser.close();}
