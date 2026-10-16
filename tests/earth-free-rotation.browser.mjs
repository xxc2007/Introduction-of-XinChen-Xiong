import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.BASE_URL||'http://127.0.0.1:8901';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 for(const lang of (process.env.TEST_LANG?[process.env.TEST_LANG]:['/','/en/']))for(const width of (process.env.TEST_WIDTH?[Number(process.env.TEST_WIDTH)]:[390,1440])){
  const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'});
  await page.goto(base+lang,{waitUntil:'domcontentloaded',timeout:60000});
  const field=page.locator('#field');await field.scrollIntoViewIfNeeded();
  await page.waitForFunction(()=>document.querySelector('.hero').dataset.field==='ready');
  await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(300);await field.focus();const initial=await field.screenshot();
  await page.keyboard.press('ArrowUp');await page.waitForTimeout(100);
  assert.ok(!(await field.screenshot()).equals(initial),'up arrow rotates the rendered globe vertically');
  await page.locator('.orbit-tools button').click();await field.scrollIntoViewIfNeeded();
  const drag=async(dx,dy)=>{
   await field.scrollIntoViewIfNeeded();const b=await field.boundingBox();
   const x=b.x+b.width*(dx===0?.5:dx<0?.75:.25),y=b.y+b.height*(dy===0?.5:dy<0?.75:.25);
   await page.mouse.move(x,y);await page.mouse.down();
   await page.mouse.move(x+dx*b.width,y+dy*b.height,{steps:24});await page.mouse.up();
   await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  };
  // Every vertical swipe must visibly turn, including after crossing either pole.
  for(const direction of [1,-1])for(let turn=0;turn<8;turn++){
   const before=await field.screenshot();await drag(0,direction*.5);
   assert.ok(!(await field.screenshot()).equals(before),`vertical dragging keeps turning through multiple full revolutions: ${direction}, ${turn}, ${await field.getAttribute('aria-description')}`);
  }
  for(const [dx,dy] of [[.5,.5],[-.5,.5],[.5,-.5],[-.5,-.5]]){
   const before=await field.screenshot();await drag(dx,dy);
   assert.ok(!(await field.screenshot()).equals(before),'diagonal dragging rotates the rendered globe');
  }
  await page.locator('.orbit-tools button').click();await field.scrollIntoViewIfNeeded();await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const resetPixels=await field.screenshot();if(process.env.SHOT_DIR){const {writeFileSync}=await import('node:fs');writeFileSync(process.env.SHOT_DIR+'/initial.png',initial);writeFileSync(process.env.SHOT_DIR+'/reset.png',resetPixels);}
  const sharp=require(require.resolve('sharp',{paths:[process.env.PLAYWRIGHT_MODULE||process.cwd()]}));
  const a=await sharp(initial).raw().toBuffer(),z=await sharp(resetPixels).raw().toBuffer();
  assert.equal(a.length,z.length);
  let changed=0,max=0;for(let i=0;i<a.length;i++){const delta=Math.abs(a[i]-z[i]);if(delta)changed++;max=Math.max(max,delta);}
  // GPU rasterisation may round a few texture-edge channels by one level.
  assert.ok(max<=2&&changed<a.length*.001,`reset restores the original globe after arbitrary rotations: ${lang} ${width} max=${max} changed=${changed}/${a.length}`);
  console.log(lang,width,'vertical, diagonal, multiple pole crossings and reset OK');await page.close();
 }
}catch(error){console.error(error.message);process.exitCode=1;}finally{await Promise.race([browser.close(),new Promise(resolve=>setTimeout(resolve,5000))]);process.exit(process.exitCode||0);}
