import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 for(const lang of ['/','/en/'])for(const width of [390,1440]){
  const page=await browser.newPage({viewport:{width,height:900}});
  await page.addInitScript(()=>{
   const raf=window.requestAnimationFrame.bind(window);window.requestAnimationFrame=fn=>raf(()=>fn(0));
   const original=HTMLCanvasElement.prototype.getContext;
   HTMLCanvasElement.prototype.getContext=function(kind,options){return original.call(this,kind,kind.startsWith('webgl')?{...options,preserveDrawingBuffer:true}:options);};
  });
  await page.goto('http://127.0.0.1:8901'+lang+'#about',{waitUntil:'networkidle'});
  const start=await page.locator('.hero-visual').evaluate(e=>Math.max(0,e.getBoundingClientRect().top+scrollY-100));
  const move=async y=>{await page.evaluate(y=>scrollTo({top:y,behavior:'instant'}),y);await page.waitForTimeout(200);};
  await move(start);await page.waitForFunction(()=>document.querySelector('.hero').dataset.field==='ready');
  const pixels=()=>page.locator('#field').evaluate(e=>e.toDataURL());
  const first=await pixels(),height=await page.locator('.hero-visual').evaluate(e=>e.offsetHeight);
  await move(start+height*.3);const turned=await pixels();assert.notEqual(first,turned,'scroll changes actual rendered geometry with time frozen');
  await move(start);assert.equal(await pixels(),first,'reverse scroll returns the same orbital pose');
  await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(150);
  const still=await pixels();await move(start+height*.2);assert.equal(await pixels(),still,'dynamic reduced motion freezes the geometry');
  await page.emulateMedia({reducedMotion:'no-preference'});await page.waitForTimeout(150);
  assert.notEqual(await pixels(),still,'restoring motion restores scroll articulation');
  console.log(`${lang} ${width}: rendered exit, reversible pose and live reduced-motion preference OK`);await page.close();
 }
}finally{await browser.close();}
