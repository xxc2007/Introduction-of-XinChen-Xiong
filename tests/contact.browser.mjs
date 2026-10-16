import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({channel:'chrome',headless:true});
const base=process.argv[2]||'http://127.0.0.1:8901';
try{
 for(const lang of ['/', '/en/'])for(const width of [390,1440]){
  const page=await browser.newPage({viewport:{width,height:900},permissions:['clipboard-read','clipboard-write']}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+lang,{waitUntil:'networkidle'});
  await page.locator('.copy-url').click();
  await page.waitForFunction(()=>document.querySelector('.copy-url').dataset.state==='copied');
  assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),'https://xxc2007.me'+lang);
  await page.locator('.copy-mail').click();
  await page.waitForFunction(()=>document.querySelector('.copy-mail').dataset.state==='copied');
  assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),'xxc200707@gmail.com');
  const top=await page.locator('.foot-wordmark').evaluate(e=>scrollY+e.getBoundingClientRect().top);
  const y=top-900+40;
  await page.evaluate(y=>scrollTo({top:y,behavior:'instant'}),y);
  await page.waitForFunction(()=>new DOMMatrix(getComputedStyle(document.querySelector('.foot-glyph')).transform).m42>1);
  const before=await page.locator('.foot-glyph').first().evaluate(e=>new DOMMatrix(getComputedStyle(e).transform).m42);
  await page.evaluate(()=>scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'}));
  await page.waitForFunction(()=>[...document.querySelectorAll('.foot-glyph')].every(e=>new DOMMatrix(getComputedStyle(e).transform).m42===0));
  assert.ok(before>0);assert.equal(await page.locator('.foot-wordmark').textContent(),'XXC2007');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  if(process.env.SHOTS)await page.screenshot({path:`${process.env.SHOTS}/contact-${lang==='/'?'zh':'en'}-${width}.png`});
  await page.evaluate(y=>scrollTo({top:y,behavior:'instant'}),y);
  await page.waitForFunction(()=>new DOMMatrix(getComputedStyle(document.querySelector('.foot-glyph')).transform).m42>1);
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.waitForFunction(()=>[...document.querySelectorAll('.foot-glyph')].every(e=>new DOMMatrix(getComputedStyle(e).transform).m42===0));
  await page.locator('.foot-meta a').click();await page.waitForFunction(()=>scrollY<2);
  assert.equal(new URL(page.url()).hash,'#top');assert.deepEqual(errors,[]);
  console.log(`${lang} ${width}: canonical URL, email clipboard, reversible footer, reduced motion, back to top and overflow OK`);
  await page.close();
 }
 for(const mode of ['reject','throw','absent']){
  const page=await browser.newPage({viewport:{width:390,height:844}});
  await page.addInitScript(mode=>{
   Object.defineProperty(navigator,'clipboard',{value:mode==='absent'?undefined:{writeText:()=>{if(mode==='throw')throw Error('blocked');return Promise.reject(Error('denied'));}},configurable:true});
   document.execCommand=()=>false;
  },mode);
  await page.goto(base,{waitUntil:'networkidle'});
  for(const [selector,value] of [['.copy-url','https://xxc2007.me/'],['.copy-mail','xxc200707@gmail.com']]){
   await page.locator(selector).click();
   await page.waitForFunction(selector=>document.querySelector(selector).dataset.state==='manual',selector);
   assert.deepEqual(await page.evaluate(()=>{const el=document.activeElement;return {value:el.value,start:el.selectionStart,end:el.selectionEnd};}),{value,start:0,end:value.length});
   assert.ok(await page.locator('.copy-fallback').last().isVisible());
  }
  console.log(`${mode}: actual selectable fallback text for both copy actions OK`);await page.close();
 }
 const page=await browser.newPage({javaScriptEnabled:false});await page.goto(base);
 assert.equal(await page.locator('.copy-url').isVisible(),false);
 assert.equal(await page.locator('.share-row a').getAttribute('href'),'https://xxc2007.me/');
 assert.equal(await page.locator('.foot-wordmark').textContent(),'XXC2007');
 console.log('No JavaScript: public link and full footer remain available');await page.close();
}finally{await browser.close();}
