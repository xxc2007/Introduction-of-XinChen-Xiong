import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const base=process.argv[2]||'http://127.0.0.1:8901';
async function chapter(page,index){
 await page.evaluate(index=>{const r=document.querySelector('.process-runway'),s=document.querySelector('.process-stage'),bar=parseFloat(getComputedStyle(document.body).getPropertyValue('--bar'));scrollTo({top:scrollY+r.getBoundingClientRect().top-bar+index/3*(r.offsetHeight-s.offsetHeight),behavior:'instant'});},index);
 await page.waitForFunction(index=>document.querySelector('#how').dataset.processStep===String(index),index);
}
try {
 for(const lang of ['/', '/en/']) for(const width of [320,390,1440]){
  const page=await browser.newPage({viewport:{width,height:900}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+lang,{waitUntil:'networkidle'});
  assert.equal(await page.evaluate(()=>performance.getEntriesByType('resource').some(e=>e.name.includes('process-scene.js'))),false,'process module loaded before approaching section');
  const hashes=new Set();
  for(const index of [0,1,2,3]){
   await chapter(page,index);await page.waitForFunction(()=>document.querySelector('#how').dataset.processRender==='ready');await page.waitForTimeout(850);
   assert.equal(await page.locator('.steps li.is-current').count(),1);
   assert.equal(await page.locator('.process-controls button[aria-pressed=true]').getAttribute('data-step'),String(index));
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   assert.ok(await page.locator('.process-stage').evaluate(e=>Math.abs(e.getBoundingClientRect().top-parseFloat(getComputedStyle(document.body).getPropertyValue('--bar')))<2));
   assert.ok(await page.locator('.process-controls').evaluate(e=>e.getBoundingClientRect().bottom<=innerHeight+1));
   hashes.add(createHash('sha256').update(await page.locator('#process-field').screenshot()).digest('hex'));
   const slider=page.locator('#process-spread');
   assert.equal(await slider.isVisible(),index===1,'layer control only belongs to the build chapter');
   if(index===1){
    assert.equal(await slider.isEnabled(),true);
    const expanded=createHash('sha256').update(await page.locator('#process-field').screenshot()).digest('hex');
    await slider.focus();await page.keyboard.press('Home');
    await page.waitForTimeout(100);
    assert.equal(await slider.inputValue(),'0');
    const collapsed=createHash('sha256').update(await page.locator('#process-field').screenshot()).digest('hex');
    assert.notEqual(expanded,collapsed,'keyboard adjustment must change actual WebGL pixels');
    await page.keyboard.press('ArrowRight');assert.equal(await slider.inputValue(),'1');
    await page.keyboard.press('End');await page.waitForTimeout(100);
    assert.equal(await slider.inputValue(),'100');
    assert.equal(await slider.getAttribute('aria-valuetext'),lang==='/'?'展开 100%':'Expanded 100%');
    const track=await slider.boundingBox();
    await page.mouse.click(track.x+track.width*.5,track.y+track.height*.5);
    assert.ok(Number(await slider.inputValue())>40&&Number(await slider.inputValue())<60,'pointer adjusts range');
    await page.keyboard.press('End');
    await slider.blur();
    if(process.env.SHOT_DIR)await page.screenshot({path:`${process.env.SHOT_DIR}/layers-${lang==='/'?'zh':'en'}-${width}.png`});
   }
  }
  assert.equal(hashes.size,4,'four visually distinct rendered states');
  await page.locator('.process-controls button').first().focus();await page.keyboard.press('Enter');
  await page.waitForFunction(()=>document.querySelector('#how').dataset.processStep==='0');
  assert.deepEqual(errors,[]);console.log(`${lang} ${width}: lazy load, pinned chapters, four rendered states, text, keyboard, controls and overflow OK`);await page.close();
 }
 for(const mode of ['short','reduced','no-js','no-webgl','texture-failure']){
  const context=await browser.newContext({viewport:{width:390,height:mode==='short'?600:844},hasTouch:mode==='short',javaScriptEnabled:mode!=='no-js',reducedMotion:mode==='reduced'?'reduce':'no-preference'});
  if(mode==='no-webgl')await context.addInitScript(()=>{const native=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return type.startsWith('webgl')?null:native.call(this,type,...args);};});
  const page=await context.newPage();if(mode==='texture-failure')await page.route('**/earth-200408-*.webp',route=>route.abort());
  await page.goto(base,{waitUntil:'networkidle'});await page.locator('#how').scrollIntoViewIfNeeded();
  if(['reduced','no-js'].includes(mode)){
   assert.equal(await page.locator('#how').evaluate(e=>e.classList.contains('process-enabled')),false);
   for(const card of await page.locator('.steps li').all())assert.equal(await card.evaluate(e=>getComputedStyle(e).visibility),'visible');
  }else if(mode==='short'){
   assert.equal(await page.locator('.process-stage').evaluate(e=>getComputedStyle(e).position),'relative');
   await page.locator('.process-controls button').last().click();assert.equal(await page.locator('#how').getAttribute('data-process-step'),'3');
   await page.locator('.process-controls button').nth(1).click();
   await page.waitForFunction(()=>document.querySelector('#how').dataset.processRender==='ready');
   const slider=page.locator('#process-spread');await slider.scrollIntoViewIfNeeded();
   const box=await slider.boundingBox();await page.touchscreen.tap(box.x+box.width/2,box.y+box.height/2);
   assert.ok(Number(await slider.inputValue())>40&&Number(await slider.inputValue())<60,'touch adjusts range on short viewport');
  }else{
   await page.waitForFunction(()=>document.querySelector('#how').dataset.processRender==='fallback');
   assert.equal(await page.locator('.process-fallback').evaluate(e=>getComputedStyle(e).visibility),'visible');
   assert.equal(await page.locator('#process-spread').isEnabled(),false,'failed renderer cannot expose a working-looking control');
  }
  console.log(`${mode}: process fallback OK`);await context.close();
 }
}finally{await browser.close();}
