import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const reading=async(field,axis=0)=>String(Number((await field.getAttribute('aria-description')).match(/-?\d+/g)[axis]));
const base=process.env.BASE_URL||'http://127.0.0.1:8901';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 for(const lang of ['/','/en/'])for(const width of [390,1440]){
  const page=await browser.newPage({viewport:{width,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+lang,{waitUntil:'domcontentloaded'});
  const field=page.locator('#field');await field.scrollIntoViewIfNeeded();await page.waitForFunction(()=>document.querySelector('.hero').dataset.field==='ready');
  await field.focus();await page.keyboard.press('ArrowRight');assert.equal(await reading(field),'10');
  await page.keyboard.press('Home');assert.equal(await reading(field),'-180');
  await page.locator('.orbit-tools button').click();assert.equal(await reading(field),'0');
  const b=await field.boundingBox();await page.mouse.move(b.x+b.width*.4,b.y+b.height*.5);await page.mouse.down();
  await page.mouse.move(b.x+b.width*.6,b.y+b.height*.5,{steps:8});await page.mouse.up();
  assert.ok(Number(await reading(field))>20,'drag rotates model');
  await page.waitForTimeout(1800);const stopped=await reading(field);await page.waitForTimeout(250);assert.equal(await reading(field),stopped,'inertia settles');
  await page.emulateMedia({reducedMotion:'reduce'});await field.focus();await page.keyboard.press('ArrowLeft');
  const reduced=await reading(field);await page.waitForTimeout(250);assert.equal(await reading(field),reduced);
  const pixels=await field.screenshot();await page.keyboard.press('ArrowLeft');await page.waitForTimeout(100);assert.notDeepEqual(await field.screenshot(),pixels,'keyboard changes actual rendered globe');
  await page.locator('.orbit-tools button').click();await field.focus();
  await page.keyboard.press('End');await page.keyboard.press('ArrowRight');
  assert.equal(await reading(field),'-170','right rotation crosses +180 without sticking');
  await page.keyboard.press('Home');await page.keyboard.press('ArrowLeft');
  assert.equal(await reading(field),'170','left rotation crosses -180 without sticking');
  await page.locator('.orbit-tools button').click();await field.focus();
  for(let i=0;i<108;i++)await page.keyboard.press('ArrowRight');
  assert.equal(await reading(field),'0','keyboard can complete three uninterrupted turns');
  const track=await field.boundingBox();
  for(const direction of [1,-1]){
   let travelled=0;
   for(let turn=0;turn<4;turn++){
    const start=direction>0?.1:.9,end=direction>0?.9:.1,y=track.y+track.height*.5;
    await page.mouse.move(track.x+track.width*start,y);await page.mouse.down();
    let previous=Number(await reading(field));
    for(let step=1;step<=24;step++){
     await page.mouse.move(track.x+track.width*(start+(end-start)*step/24),y);
     const current=Number(await reading(field)),delta=((current-previous+540)%360)-180;
     assert.ok(delta*direction>0&&Math.abs(delta)<15,'every drag step keeps turning across both boundaries');
     travelled+=delta;previous=current;
    }
    await page.mouse.up();
   }
   assert.ok(travelled*direction>720,'pointer completes more than two full turns in either direction');
  }
  await page.locator('.orbit-tools button').click();assert.equal(await reading(field),'0');
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
 await page.goto(base+'/',{waitUntil:'domcontentloaded'});await page.locator('#field').scrollIntoViewIfNeeded();await page.waitForFunction(()=>document.querySelector('.hero').dataset.field==='ready');
 const cdp=await page.context().newCDPSession(page),b=await page.locator('#field').boundingBox(),x=b.x+b.width/2,y=b.y+b.height/2;
 const touch=(type,x,y)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'?[]:[{x,y}]});
 await page.emulateMedia({reducedMotion:'reduce'});
 const before=await page.evaluate(()=>scrollY);await touch('touchStart',x,y);
 await touch('touchMove',x,y-70);
 await page.waitForFunction(()=>document.querySelector('#field').getAttribute('aria-description').match(/-?\d+/g)[1]!=='0');
 await touch('touchMove',x,y-130);await touch('touchEnd');await page.waitForTimeout(100);
 assert.equal(await page.evaluate(()=>scrollY),before,'vertical touch on globe rotates without panning the document');
 assert.ok(Math.abs(Number(await reading(page.locator('#field'),1)))>30,'touch rotates vertically');
 await page.locator('.orbit-tools button').click();
 await page.locator('#field').scrollIntoViewIfNeeded();const box=await page.locator('#field').boundingBox();
 await touch('touchStart',box.x+box.width*.3,box.y+box.height*.5);await touch('touchMove',box.x+box.width*.5,box.y+box.height*.5);await touch('touchMove',box.x+box.width*.65,box.y+box.height*.5);await touch('touchEnd');
 assert.ok(Number(await reading(page.locator('#field')))>20,'horizontal touch rotates');await page.emulateMedia({reducedMotion:'reduce'});
 await page.locator('.orbit-tools button').click();
 await page.locator('#field').scrollIntoViewIfNeeded();const touchTrack=await page.locator('#field').boundingBox();
 for(const direction of [1,-1]){
  let travelled=0;
  for(let turn=0;turn<4;turn++){
   const start=direction>0?.1:.9,end=direction>0?.9:.1,y=touchTrack.y+touchTrack.height*.5;
   await touch('touchStart',touchTrack.x+touchTrack.width*start,y);let previous=Number(await reading(page.locator('#field')));
   for(let step=1;step<=12;step++){
    await touch('touchMove',touchTrack.x+touchTrack.width*(start+(end-start)*step/12),y);
    await page.waitForFunction(previous=>Number(document.querySelector('#field').getAttribute('aria-description').match(/-?\d+/g)[0])!==previous,previous,{timeout:2000});
    const current=Number(await reading(page.locator('#field'))),delta=((current-previous+540)%360)-180;
    assert.ok(delta*direction>0,'touch keeps rotating past the old limits: '+JSON.stringify({turn,step,direction,previous,current}));travelled+=delta;previous=current;
   }
   await touch('touchEnd');
  }
  assert.ok(travelled*direction>720,'touch completes more than two full turns in either direction');
 }
 await page.locator('.orbit-tools button').click();await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
 await touch('touchStart',20,400);await touch('touchMove',20,300);await touch('touchMove',20,220);await touch('touchEnd');
 await page.waitForTimeout(200);assert.ok(await page.evaluate(()=>scrollY)>30,'touch outside the globe still scrolls the page');
 console.log('Touch vertical rotation, continuous full turns and outside scrolling OK');await page.close();
}catch(error){console.error(error);process.exitCode=1;}finally{await Promise.race([browser.close(),new Promise(resolve=>setTimeout(resolve,5000))]);process.exit(process.exitCode||0);}
