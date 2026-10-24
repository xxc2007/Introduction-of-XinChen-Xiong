import * as THREE from '../vendor/three-0.180.0/three.site.87639d42f226.min.js';

/** Four connected views of the existing workflow, driven only by local scroll progress. */
export function initProcess(canvas, screenshotURL) {
  const host=canvas.closest('#how');
  const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(35,1,.1,100);
  scene.add(new THREE.HemisphereLight(0xffeed6,0x35402d,3));
  const light=new THREE.DirectionalLight(0xffffff,4);light.position.set(-3,5,6);scene.add(light);
  const pages=new THREE.Group();scene.add(pages);
  const materials=[],panels=[];
  const geometry=new THREE.BoxGeometry(3.8,2.4,.065);
  for(let i=0;i<3;i++) {
    const material=new THREE.MeshStandardMaterial({color:i===1?0x48583d:0xffebd2,roughness:.65,transparent:true});
    const panel=new THREE.Mesh(geometry,material);pages.add(panel);panels.push(panel);materials.push(material);
    const edges=new THREE.LineSegments(new THREE.EdgesGeometry(geometry),new THREE.LineBasicMaterial({color:0x24251e,transparent:true}));panel.add(edges);
  }
  const screenMaterial=new THREE.MeshBasicMaterial({color:0xffffff,transparent:true});
  const screen=new THREE.Mesh(new THREE.PlaneGeometry(3.55,2.22),screenMaterial);screen.position.z=.04;panels[2].add(screen);
  const earthMaterial=new THREE.MeshBasicMaterial({transparent:true,color:0xffffff});
  const earth=new THREE.Mesh(new THREE.SphereGeometry(1.35,64,40),earthMaterial);earth.rotation.y=3.7;scene.add(earth);
  const orbitMaterial=new THREE.MeshStandardMaterial({color:0xffebd2,metalness:.3,roughness:.45,transparent:true});
  const orbit=new THREE.Mesh(new THREE.TorusGeometry(1.8,.025,8,100),orbitMaterial);orbit.rotation.set(1.15,.4,-.3);scene.add(orbit);
  let current=0,target=0,spread=1,frame=0,visible=true,lost=false,pending=2,textureFailed=false;
  const smooth=(a,b,x)=>{const t=THREE.MathUtils.clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
  const loader=new THREE.TextureLoader();
  loader.load(screenshotURL,texture=>{texture.colorSpace=THREE.SRGBColorSpace;screenMaterial.map=texture;screenMaterial.needsUpdate=true;pending--;request();},undefined,()=>{textureFailed=true;host.dataset.processRender='fallback';});
  loader.load(new URL('../images/earth-200408-1024.webp'+new URL(import.meta.url).search,import.meta.url).href,texture=>{texture.colorSpace=THREE.SRGBColorSpace;earthMaterial.map=texture;earthMaterial.needsUpdate=true;pending--;request();},undefined,()=>{textureFailed=true;host.dataset.processRender='fallback';});
  function draw() {
    frame=0;if(!visible||document.hidden||lost)return;
    current+=(target-current)*.14;if(Math.abs(target-current)<.001)current=target;
    const opening=smooth(0,1,current)*(1-smooth(1.3,2,current))*spread;
    const map=smooth(1.25,1.85,current)*(1-smooth(2.2,2.85,current));
    const publish=smooth(2.2,3,current);
    pages.rotation.set(-.12-opening*.3,.28-opening*.7+publish*.12,-.04+opening*.05);
    pages.scale.setScalar(1-map*.65);pages.position.x=-map*1.8;pages.visible=map<.999;
    panels.forEach((panel,i)=>{
      panel.position.set((i-1)*opening*.2,(i-1)*opening*.26,(i-1)*(.09+opening*.8));
      materials[i].opacity=1-map;
      panel.children[0].material.opacity=1-map;
    });
    screenMaterial.opacity=1-map;
    earth.scale.setScalar(Math.max(.001,map));earthMaterial.opacity=map;
    earth.rotation.y=3.7+map*.7;orbit.scale.setScalar(Math.max(.001,map));orbitMaterial.opacity=map;
    renderer.render(scene,camera);if(!pending&&!textureFailed)host.dataset.processRender='ready';
    if(current!==target)request();
  }
  function request(){if(!frame&&visible&&!document.hidden&&!lost)frame=requestAnimationFrame(draw);}
  const resize=()=>{
    const w=canvas.clientWidth,h=canvas.clientHeight;if(!w||!h)return;
    renderer.setSize(w,h,false);camera.aspect=w/h;
    camera.position.z=3.1/Math.sin(Math.min(THREE.MathUtils.degToRad(17.5),Math.atan(Math.tan(THREE.MathUtils.degToRad(17.5))*camera.aspect)));
    camera.updateProjectionMatrix();request();
  };
  new ResizeObserver(resize).observe(canvas);
  new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;if(visible)request();else{cancelAnimationFrame(frame);frame=0;}}).observe(canvas);
  document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;}else request();});
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();lost=true;cancelAnimationFrame(frame);frame=0;host.dataset.processRender='fallback';});
  canvas.addEventListener('webglcontextrestored',()=>{lost=false;request();});
  resize();
  return {
    setProgress(value,immediate=false){target=THREE.MathUtils.clamp(value,0,3);if(immediate)current=target;request();},
    setSpread(value){spread=THREE.MathUtils.clamp(value,0,1);request();}
  };
}
