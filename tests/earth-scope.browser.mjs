import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
assert.doesNotMatch(readFileSync('assets/js/scene.js','utf8'),/TorusGeometry|attachOrbitBridge|InstancedMesh/);
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try {
 for(const lang of ['/','/en/'])for(const width of [390,1440]) {
  const page=await browser.newPage({viewport:{width,height:900}}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto('http://127.0.0.1:8901'+lang,{waitUntil:'networkidle'});
  await page.locator('#field').scrollIntoViewIfNeeded();
  await page.waitForFunction(()=>document.querySelector('.hero').dataset.field==='ready');
  for(const section of ['#about','#how','#beliefs','#contact']) {
   await page.locator(section).scrollIntoViewIfNeeded();
   await page.waitForTimeout(200);
   assert.equal(await page.locator('.hero-visual > #field').count(),1,'Earth stays in hero');
   assert.equal(await page.locator('#field').evaluate(el=>el.getBoundingClientRect().bottom<=0),true,'Earth leaves the viewport with hero');
  }
  assert.equal(await page.locator('.about-orbit,.ease-demo,.belief-demo').count(),0);
  assert.equal(await page.locator('#beliefs blockquote').count(),3);
  assert.equal(await page.locator('.steps li').count(),4);
  assert.equal(await page.locator('.work-card').count(),2);
  assert.deepEqual(errors,[]);
  console.log(`${lang} ${width}: hero-only Earth, removed demos, original content counts and no page errors OK`);
  await page.close();
 }
} finally {await browser.close();}
