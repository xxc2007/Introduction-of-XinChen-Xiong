/** Hero-only Earth globe; local Three.js and locally hosted NASA Blue Marble imagery; see docs/image-provenance.md. */
import * as THREE from '../vendor/three.module.min.js';
export function initField(canvas, { reducedMotion = false } = {}) {
  const hero = canvas.closest('.hero');
  const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.setClearColor(0x48583d, 0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(38, 1, .1, 100);
  camera.position.z = 9;
  scene.add(new THREE.HemisphereLight(0xffebce, 0x182118, 3));
  const key = new THREE.DirectionalLight(0xffe2b1, 5); key.position.set(-3, 5, 14); scene.add(key);
  key.castShadow=true;key.shadow.mapSize.set(512,512);
  Object.assign(key.shadow.camera,{left:-5,right:5,top:5,bottom:-5,near:.5,far:30});
  key.shadow.bias=-.0005;key.shadow.normalBias=.02;
  const draftingSurface=new THREE.Mesh(new THREE.PlaneGeometry(20,20),new THREE.ShadowMaterial({opacity:.3}));
  draftingSurface.position.z=-2.8;draftingSurface.receiveShadow=true;scene.add(draftingSurface);
  const rim = new THREE.DirectionalLight(0xff7d38, 3); rim.position.set(4, -1, 1); scene.add(rim);
  const sculpture = new THREE.Group(); scene.add(sculpture);
  // Neutral shading preserves the satellite imagery colours.
  const earthMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
  earthMaterial.onBeforeCompile = shader => {
    shader.vertexShader = 'varying vec3 earthNormal;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nearthNormal = normalize(normalMatrix * normal);');
    shader.fragmentShader = 'varying vec3 earthNormal;\n' + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', '#include <map_fragment>\ndiffuseColor.rgb *= 0.35 + 0.65 * max(dot(normalize(earthNormal), normalize(vec3(-0.5, 0.6, 1.0))), 0.0);');
  };
  const earth = new THREE.Mesh(new THREE.SphereGeometry(1.6, 96, 64), earthMaterial);
  earth.rotation.y = 3.7; earth.visible = false; sculpture.add(earth);
  hero.dataset.earth = 'loading';
  new THREE.TextureLoader().load(new URL('../images/earth-200408-' + (matchMedia('(max-width: 600px)').matches ? '1024' : '2048') + '.webp', import.meta.url).href, texture => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    earthMaterial.map = texture; earthMaterial.needsUpdate = true; earth.visible = true;
    hero.dataset.earth = 'ready'; requestDraw();
  }, undefined, () => {
    hero.dataset.earth = 'error'; hero.dataset.field = 'off';
    lost = true; cancelAnimationFrame(raf); raf = 0;
  });
  sculpture.traverse(object=>{if(object.isMesh)object.castShadow=true;});
  let visible = true, paused = reducedMotion, raf = 0, lost = false, phase = 0, last = 0;
  let px = 0, py = 0, tx = 0, ty = 0;
  let yaw=0,velocity=0,pointer=null,manual=false;
  const english=document.documentElement.lang.startsWith('en');
  const tools=document.createElement('div');tools.className='orbit-tools';
  const hint=document.createElement('span');hint.textContent=english?'Drag to explore · Arrow keys to turn':'拖动探索 · 方向键旋转';
  const reset=document.createElement('button');reset.type='button';reset.textContent=english?'Reset view':'重置视角';reset.hidden=true;
  tools.append(hint,reset);canvas.parentElement.appendChild(tools);
  canvas.classList.add('orbit-interactive');canvas.removeAttribute('aria-hidden');canvas.tabIndex=-1;
  canvas.setAttribute('role','slider');canvas.setAttribute('aria-label',english?'Earth model rotation':'地球模型旋转');
  canvas.setAttribute('aria-valuemin','-180');canvas.setAttribute('aria-valuemax','180');
  function angle(value){
    // Wrap the same spherical orientation instead of stopping at the meridian.
    yaw=value%360;if(yaw>180)yaw-=360;if(yaw<-180)yaw+=360;
    canvas.setAttribute('aria-valuenow',String(Math.round(yaw)));canvas.setAttribute('aria-valuetext',`${Math.round(yaw)}°`);requestDraw();
  }
  angle(0);
  const takeControl=()=>{manual=true;velocity=0;reset.hidden=false;};
  reset.addEventListener('click',()=>{manual=false;velocity=0;phase=0;angle(0);reset.hidden=true;canvas.focus({preventScroll:true});});
  canvas.addEventListener('keydown',event=>{
    if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
    event.preventDefault();takeControl();angle(event.key==='Home'?-180:event.key==='End'?180:yaw+(event.key==='ArrowLeft'?-10:10));
  });
  canvas.addEventListener('pointerdown',event=>{
    if(event.button!==0||pointer||hero.dataset.field!=='ready')return;
    pointer={id:event.pointerId,x:event.clientX,y:event.clientY,last:event.clientX,time:event.timeStamp,dragging:false};
  });
  canvas.addEventListener('pointermove',event=>{
    if(!pointer||event.pointerId!==pointer.id)return;
    const dx=event.clientX-pointer.x,dy=event.clientY-pointer.y;
    if(!pointer.dragging){
      if(Math.max(Math.abs(dx),Math.abs(dy))<6)return;
      if(event.pointerType==='touch'&&Math.abs(dy)>Math.abs(dx)){pointer=null;return;}
      pointer.dragging=true;takeControl();canvas.setPointerCapture(event.pointerId);
    }
    const delta=(event.clientX-pointer.last)/canvas.clientWidth*240;
    velocity=paused?0:THREE.MathUtils.clamp(delta/Math.max(8,event.timeStamp-pointer.time)*1000,-240,240);
    angle(yaw+delta);pointer.last=event.clientX;pointer.time=event.timeStamp;
  });
  const release=event=>{if(pointer&&event.pointerId===pointer.id){if(event.type!=='pointerup'||event.timeStamp-pointer.time>100)velocity=0;pointer=null;requestDraw();}};
  window.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);canvas.addEventListener('lostpointercapture',release);
  function draw(now = 0) {
    raf = 0;
    if (lost || document.hidden || !visible || !earth.visible) return;
    const dt=Math.min((now-last)/1000||0,.04);
    if (!paused&&!manual) phase += dt;
    if(!paused&&!pointer&&Math.abs(velocity)>.1){angle(yaw+velocity*dt);velocity*=Math.exp(-7*dt);}
    last = now;
    const progress = paused ? 0 : Math.max(0, Math.min(1, -hero.getBoundingClientRect().top / Math.max(1, hero.offsetHeight * .65)));
    px += (tx - px) * .045; py += (ty - py) * .045;
    sculpture.rotation.set(.15 + (paused||manual ? 0 : py * .15) + progress * .65, -.3 + phase * .12 + progress * 1.8+THREE.MathUtils.degToRad(yaw), -.22 + (paused||manual ? 0 : px * .12));
    sculpture.position.set(0, 0, 0);
    sculpture.scale.setScalar(.94 + progress * .06);
    renderer.render(scene, camera);
    if (earth.visible&&hero.dataset.field!=='ready') {hero.dataset.field = 'ready';canvas.tabIndex=0;canvas.setAttribute('aria-disabled','false');}
    if (!paused&&(!manual||Math.abs(velocity)>.1)) requestDraw();
  }
  function requestDraw() { if (!raf && !lost && visible && !document.hidden) raf = requestAnimationFrame(draw); }
  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false); camera.aspect = w / h;
    const vertical = THREE.MathUtils.degToRad(camera.fov / 2);
    const horizontal = Math.atan(Math.tan(vertical) * camera.aspect);
    // Leave a clear margin around the globe at every viewport ratio.
    camera.position.z = 2.05 / Math.sin(Math.min(vertical, horizontal));
    camera.updateProjectionMatrix(); requestDraw();
  }
  const ro = new ResizeObserver(resize); ro.observe(canvas);
  const io = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; if (visible) {last=performance.now();requestDraw();} else {cancelAnimationFrame(raf);raf=0;} }); io.observe(canvas);
  window.addEventListener('pointermove', e => { if (!paused && e.pointerType === 'mouse') {tx=e.clientX/innerWidth-.5;ty=e.clientY/innerHeight-.5;} }, { passive:true });
  window.addEventListener('scroll', requestDraw, { passive:true });
  motionPreference.addEventListener('change',()=>{
    reducedMotion=motionPreference.matches;paused=reducedMotion || document.querySelector('.motion-toggle')?.getAttribute('aria-pressed')==='true';
    velocity=0;cancelAnimationFrame(raf);raf=0;requestDraw();
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) {cancelAnimationFrame(raf);raf=0;} else {last=performance.now();requestDraw();} });
  canvas.addEventListener('webglcontextlost', e => {e.preventDefault();lost=true;pointer=null;velocity=0;cancelAnimationFrame(raf);raf=0;canvas.tabIndex=-1;canvas.setAttribute('aria-disabled','true');hero.dataset.field='lost';});
  canvas.addEventListener('webglcontextrestored', () => {lost=false;hero.dataset.field='loading';requestDraw();});
  hero.dataset.field='loading'; resize();
  return {
    setEnergy() { requestDraw(); },
    setPaused(value) { paused=value || reducedMotion;velocity=0;cancelAnimationFrame(raf);raf=0;requestDraw(); }
  };
}
