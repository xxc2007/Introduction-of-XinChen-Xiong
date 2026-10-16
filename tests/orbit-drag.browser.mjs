import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 for(const lang of ['/','/en/'])for(const width of [390,1440]){
  const page=await browser.newPage({viewport:{width,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8901'+lang,{waitUntil:'networkidle'});
  const field=page.locator('#field');await field.scrollIntoViewIfNeeded();await page.waitForFunction(()=>document.querySelector('.hero').dataset.field==='ready');
  await field.focus();await page.keyboard.press('ArrowRight');assert.equal(await field.getAttribute('aria-valuenow'),'10');
  await page.keyboard.press('Home');assert.equal(await field.getAttribute('aria-valuenow'),'-180');
  await page.locator('.orbit-tools button').click();assert.equal(await field.getAttribute('aria-valuenow'),'0');
  const b=await field.boundingBox();await page.mouse.move(b.x+b.width*.4,b.y+b.height*.5);await page.mouse.down();
  await page.mouse.move(b.x+b.width*.6,b.y+b.height*.5,{steps:8});await page.mouse.up();
  assert.ok(Number(await field.getAttribute('aria-valuenow'))>20,'drag rotates model');
  await page.waitForTimeout(1800);const stopped=await field.getAttribute('aria-valuenow');await page.waitForTimeout(250);assert.equal(await field.getAttribute('aria-valuenow'),stopped,'inertia settles');
  await page.emulateMedia({reducedMotion:'reduce'});await field.focus();await page.keyboard.press('ArrowLeft');
  const reduced=await field.getAttribute('aria-valuenow');await page.waitForTimeout(250);assert.equal(await field.getAttribute('aria-valuenow'),reduced);
  const pixels=await field.screenshot();await page.keyboard.press('ArrowLeft');await page.waitForTimeout(100);assert.notDeepEqual(await field.screenshot(),pixels,'keyboard changes actual rendered globe');
  if(process.env.SHOT_DIR)await page.screenshot({path:`${process.env.SHOT_DIR}/drag-${lang==='/'?'zh':'en'}-${width}.png`});
  if(width===1440){
   await page.evaluate(()=>{window.orbitLoss=document.querySelector('#field').getContext('webgl2').getExtension('WEBGL_lose_context');window.orbitLoss.loseContext();});
   await page.waitForFunction(()=>document.querySelector('.hero').dataset.field==='lost');
   assert.equal(await field.getAttribute('tabindex'),'-1');
   assert.equal(await page.locator('.orbit-tools').evaluate(e=>getComputedStyle(e).visibility),'hidden');
   await page.waitForTimeout(150);await page.evaluate(()=>window.orbitLoss.restoreContext());
   await page.waitForFunction(()=>document.querySelector('.hero').dataset.field==='ready');
   assert.equal(await field.getAttribute('tabindex'),'0');
  }
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);
  console.log(`${lang} ${width}: keyboard, drag, reset, inertia and reduced motion OK`);await page.close();
 }
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 await page.goto('http://127.0.0.1:8901/',{waitUntil:'networkidle'});await page.locator('#field').scrollIntoViewIfNeeded();await page.waitForFunction(()=>document.querySelector('.hero').dataset.field==='ready');
 const cdp=await page.context().newCDPSession(page),b=await page.locator('#field').boundingBox(),x=b.x+b.width/2,y=b.y+b.height/2;
 const touch=(type,x,y)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'?[]:[{x,y}]});
 const before=await page.evaluate(()=>scrollY);await touch('touchStart',x,y);await touch('touchMove',x,y-70);await touch('touchMove',x,y-130);await touch('touchEnd');await page.waitForTimeout(350);
 assert.ok(await page.evaluate(()=>scrollY)>before+30,'vertical touch pans the document');
 await page.locator('#field').scrollIntoViewIfNeeded();const box=await page.locator('#field').boundingBox();
 await touch('touchStart',box.x+box.width*.3,box.y+box.height*.5);await touch('touchMove',box.x+box.width*.5,box.y+box.height*.5);await touch('touchMove',box.x+box.width*.65,box.y+box.height*.5);await touch('touchEnd');
 assert.ok(Number(await page.locator('#field').getAttribute('aria-valuenow'))>20,'horizontal touch rotates');console.log('Touch vertical pan and horizontal rotation OK');await page.close();
}finally{await browser.close();}
