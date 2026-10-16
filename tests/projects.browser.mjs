import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({channel:'chrome',headless:true});
const base=process.argv[2]||'http://127.0.0.1:8901';
try {
 for(const lang of ['/', '/en/']) for(const width of [320,390,768,1440]) {
  const page=await browser.newPage({viewport:{width,height:900}}),errors=[],requests=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('request',r=>requests.push(r.url()));
  await page.goto(base+lang,{waitUntil:'networkidle'});
  assert.equal(requests.some(url=>url.includes('shot-geohot.webp')),false,'alternate image should not load in the hero');
  await page.locator('.project-switch').scrollIntoViewIfNeeded();
  const buttons=page.locator('.project-switch button'),cards=page.locator('.work-card');
  await page.waitForFunction(()=>[...document.querySelectorAll('.work-card .shot')].every(img=>img.complete));
  const height=await page.locator('.project-stage').evaluate(e=>e.offsetHeight);
  for(const index of [1,0,1]) {
   await buttons.nth(index).click();
   assert.equal(await buttons.nth(index).getAttribute('aria-controls'),await cards.nth(index).getAttribute('id'));
   assert.equal(await cards.nth(index).isVisible(),true);
   assert.equal(await cards.nth(1-index).isVisible(),false);
   assert.equal(await page.locator('.project-stage').evaluate(e=>e.offsetHeight),height,'switch must not move following section');
   assert.ok(await cards.nth(index).evaluate(e=>e.getAnimations({subtree:true}).some(a=>a.playState==='running')),'selection should animate');
  }
  await buttons.nth(1).focus();await page.keyboard.press('ArrowLeft');
  assert.equal(await buttons.first().getAttribute('aria-pressed'),'true');
  await page.keyboard.press('End');assert.equal(await buttons.nth(1).getAttribute('aria-pressed'),'true');
  // Rapid changes must settle on the last request, without stale animations or hidden links.
  await page.evaluate(()=>{const b=document.querySelectorAll('.project-switch button');for(let i=0;i<12;i++)b[i%2].click();});
  await page.waitForFunction(()=>document.querySelectorAll('.work-card')[1].getAnimations({subtree:true}).every(a=>a.playState==='finished'));
  assert.equal(await cards.nth(1).isVisible(),true);
  await page.locator('.motion-toggle').dispatchEvent('click');
  await buttons.first().click();
  assert.equal(await cards.first().evaluate(e=>e.getAnimations({subtree:true}).filter(a=>a.playState==='running').length),0);
  await page.locator('.motion-toggle').dispatchEvent('click');
  await page.emulateMedia({reducedMotion:'reduce'});await buttons.nth(1).click();
  assert.equal(await cards.nth(1).evaluate(e=>e.getAnimations({subtree:true}).filter(a=>a.playState==='running').length),0);
  assert.equal(await page.locator('.project-compare th[scope="col"]').count(),2);
  assert.equal(await page.locator('.project-compare a').count(),2);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'horizontal overflow');
  assert.deepEqual(errors,[]);
  if(process.env.SHOTS && [390,1440].includes(width)){
   await page.locator('.project-compare').scrollIntoViewIfNeeded();
   await page.screenshot({path:`${process.env.SHOTS}/projects-${lang==='/'?'zh':'en'}-${width}.png`});
  }
  if(width===390){
   await page.setViewportSize({width:1440,height:900});
   await buttons.first().click();
   await page.waitForFunction(()=>document.querySelector('.project-stage').offsetHeight>=document.querySelector('.work-card:not([hidden])').offsetHeight);
   const resized=await page.locator('.project-stage').evaluate(e=>e.offsetHeight);
   await buttons.nth(1).click();
   assert.equal(await page.locator('.project-stage').evaluate(e=>e.offsetHeight),resized,'live resize must preserve stable selection height');
  }
  console.log(`${lang} ${width}: stable stage, animated/rapid/keyboard switching, pause, reduced motion, comparison and overflow OK`);
  await page.close();
 }
 const page=await browser.newPage({javaScriptEnabled:false,viewport:{width:390,height:844}});
 await page.goto(base,{waitUntil:'networkidle'});
 assert.equal(await page.locator('.work-card').first().isVisible(),true);
 assert.equal(await page.locator('.work-card').nth(1).isVisible(),true);
 assert.equal(await page.locator('.project-compare').isVisible(),true);
 console.log('No JavaScript: both complete project descriptions and comparison remain readable');
 await page.close();
}finally{await browser.close();}
