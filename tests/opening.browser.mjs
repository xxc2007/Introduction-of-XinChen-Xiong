import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({channel:'chrome',headless:true});
const base=process.argv[2]||'http://127.0.0.1:8901';
try{
 for(const lang of ['/', '/en/'])for(const width of [390,1440]){
  const page=await browser.newPage({viewport:{width,height:900}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/scene.js?*',r=>r.abort());
  await page.goto(base+lang,{waitUntil:'domcontentloaded'});
  await page.waitForSelector('.opening-drawing');
  await page.waitForFunction(()=>{
   const c=document.querySelector('.opening-drawing canvas');if(!c)return false;
   const pixels=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
   let orange=0;for(let i=0;i<pixels.length;i+=4)if(pixels[i]>180 && pixels[i+1]>80 && pixels[i+2]<150 && pixels[i+3]>100)orange++;
   return orange>100;
  });
  if(process.env.SHOTS)await page.screenshot({path:`${process.env.SHOTS}/opening-${lang==='/'?'zh':'en'}-${width}.png`});
  await page.waitForSelector('.opening-drawing',{state:'detached',timeout:4000});
  assert.equal(await page.locator('.hero .motto').isVisible(),true);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  assert.deepEqual(errors,[]);
  console.log(`${lang} ${width}: construction drawing, bounded exit, readable hero and no overflow OK`);
  await page.close();
 }
 for(const mode of ['skip','keyboard','wheel','reduced','anchor','slow']){
  const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:mode==='reduced'?'reduce':'no-preference'});
  if(mode==='slow')await page.route('**/scene.js?*',async r=>{await new Promise(resolve=>setTimeout(resolve,4500));await r.abort().catch(()=>{});});
  else await page.route('**/scene.js?*',r=>r.abort());
  await page.goto(base+(mode==='anchor'?'/#works':'/'),{waitUntil:'domcontentloaded'});
  if(['skip','keyboard','wheel'].includes(mode)){
   await page.waitForSelector('.opening-drawing');
   if(mode==='skip')await page.locator('.opening-drawing button').click();
   if(mode==='keyboard')await page.keyboard.press('Tab');
   if(mode==='wheel')await page.mouse.wheel(0,10);
  }
  await page.waitForSelector('.opening-drawing',{state:'detached',timeout:4000});
  if(mode==='anchor')assert.equal(new URL(page.url()).hash,'#works');
  console.log(`${mode}: opening releases page OK`);await page.close();
 }
}finally{await browser.close();}
