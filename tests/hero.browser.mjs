import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({channel:'chrome',headless:true});
const base=process.argv[2]||'http://127.0.0.1:8901';
try{
 for(const lang of ['/', '/en/'])for(const [width,height] of [[320,900],[390,900],[768,900],[1001,900],[1440,900],[1920,1080],[1280,600]]){
  const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});
  await page.goto(base+lang,{waitUntil:'networkidle'});
  const result=await page.evaluate(()=>{
   const b=s=>document.querySelector(s).getBoundingClientRect(),name=b('.hero h1'),copy=b('.hero-copy'),orbit=b('.hero-visual');
   const intersects=(a,b)=>Math.min(a.right,b.right)>Math.max(a.left,b.left)+1&&Math.min(a.bottom,b.bottom)>Math.max(a.top,b.top)+1;
   return {nameVisible:name.top>=document.querySelector('.topbar').offsetHeight&&name.bottom<=innerHeight,copyBottom:copy.bottom,overlap:intersects(name,orbit)||intersects(copy,orbit)||intersects(name,copy),orbitHeight:orbit.height,overflow:document.documentElement.scrollWidth>innerWidth,headingFirst:document.querySelector('.hero-stage').firstElementChild.tagName==='H1'};
  });
  assert.equal(result.nameVisible,true,`${lang} ${width}: name must be visible in the opening viewport`);
  assert.equal(result.overlap,false,`${lang} ${width}: content and orbit must not overlap`);
  assert.equal(result.overflow,false);assert.equal(result.headingFirst,true);
  assert.ok(Math.abs(result.orbitHeight-(width<=1000?width-44:Math.max(520,Math.min(width*.6,height*.84))))<1,'existing orbit dimensions must be retained');
  if(width>1000&&height>=900)assert.ok(result.copyBottom<=height,'desktop introduction must fit in first viewport');
  console.log(`${lang} ${width}x${height}: first-screen heading, semantic order, separate content and unchanged orbit height OK`);
  await page.close();
 }
}finally{await browser.close();}
