/* xxc2007.me · 主交互（渐进增强）
   HTML 与本文件并行产出：所有查询做空值保护，节点缺失即静默跳过，绝不抛错。 */

const root = document.documentElement;
root.classList.replace('no-js', 'js');

const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.prototype.slice.call((r || document).querySelectorAll(s));
const mq = (q) => (window.matchMedia ? window.matchMedia(q) : { matches: false });
const RM = mq('(prefers-reduced-motion: reduce)').matches;
const HOVER = mq('(hover: hover)').matches;
const FINE = mq('(hover: hover) and (pointer: fine)').matches;
const COARSE = mq('(pointer: coarse)').matches;
const LANG = (root.lang || 'zh').toLowerCase().indexOf('en') === 0 ? 'en' : 'zh';
const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

/* ---------- 全站唯一的 rAF 链：滚动进度、磁吸、卡片倾斜都搭这条 ---------- */
const updaters = [];
let queued = false, redo = false;
function frame() {
  queued = false; redo = false;
  for (let i = 0; i < updaters.length; i++) updaters[i]();
  if (redo) schedule();
}
function schedule() { if (!queued) { queued = true; requestAnimationFrame(frame); } }
function keep() { redo = true; }
window.addEventListener('scroll', schedule, { passive: true });
window.addEventListener('resize', schedule, { passive: true });

/* ---------- 阅读进度（先读后写，不夹 layout 读写） ---------- */
const progress = $('.progress');
if (progress) updaters.push(() => {
  const y = window.scrollY;
  const max = (root.scrollHeight || 0) - window.innerHeight;
  progress.style.width = (max > 0 ? clamp(y / max, 0, 1) * 100 : 0).toFixed(2) + '%';
});

/* ---------- 逐节揭示：--d 由同级序号推出，错峰 60ms ---------- */
(function reveal() {
  const els = $$('.reveal');
  if (!els.length) return;
  if (RM || !('IntersectionObserver' in window)) { els.forEach((el) => el.classList.add('is-in')); return; }
  const io = new IntersectionObserver((list) => {
    list.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-in'); e.target.classList.remove('is-pending'); io.unobserve(e.target); } });
  }, { threshold: .12, rootMargin: '0px 0px -4% 0px' });
  els.forEach((el) => {
    const kids = el.parentElement
      ? Array.prototype.filter.call(el.parentElement.children, (c) => c.classList.contains('reveal'))
      : [el];
    el.style.setProperty('--d', (Math.min(kids.indexOf(el), 8) * 60) + 'ms');
    if (el.getBoundingClientRect().top >= innerHeight) el.classList.add('is-pending');
    io.observe(el);
  });
})();

/* A reversible footer reveal follows the visitor's scroll, not a timer. */
(function footerLetters(){
  const word=$('.foot-wordmark'),reduced=mq('(prefers-reduced-motion: reduce)');
  if(!word || reduced.matches)return;
  const text=word.textContent;word.textContent='';
  const letters=Array.from(text).map(char=>{const span=document.createElement('span');span.className='foot-glyph';span.textContent=char;word.appendChild(span);return span;});
  let previous=-1;
  updaters.push(()=>{
    const box=word.getBoundingClientRect();
    const progress=motionPaused||reduced.matches?1:clamp((innerHeight-box.top)/Math.max(1,Math.min(innerHeight*.65,box.height)),0,1);
    if(progress===previous)return;previous=progress;
    letters.forEach((letter,i)=>{const p=clamp(progress*1.4-i*.06,0,1);letter.style.transform=`translateY(${(1-p)*125}%)`;});
  });
  reduced.addEventListener('change',schedule);schedule();
})();

/* 场强基准：必须先声明再用——bootField 里那句 initField({energy: FIELD_BASE})
   靠 await import() 的延迟侥幸躲过了暂时性死区，但读代码的人不该靠运气。 */
const FIELD_BASE = .34;

/* The reference opens with construction circles before revealing the object.
   This overlay never owns layout or blocks access to the underlying page. */
(function openingDrawing(){
  const hero=$('.hero'),target=$('.hero-visual'),reduced=mq('(prefers-reduced-motion: reduce)');
  if(!hero || !target || reduced.matches || location.hash || scrollY>0) return;
  const panel=document.createElement('div');panel.className='opening-drawing';
  const canvas=document.createElement('canvas');canvas.setAttribute('aria-hidden','true');
  const skip=document.createElement('button');skip.type='button';skip.textContent=LANG==='en'?'Skip intro':'跳过开场';
  panel.append(canvas,skip);document.body.appendChild(panel);
  const ctx=canvas.getContext('2d');if(!ctx){panel.remove();return;}
  const style=getComputedStyle(document.body),sand=style.getPropertyValue('--sand').trim(),orange=style.getPropertyValue('--orange').trim();
  let raf=0,done=false,exitAt=null,w=innerWidth,h=innerHeight;
  const start=performance.now();
  const abort=new AbortController(),options={signal:abort.signal,passive:true};
  function resize(){w=innerWidth;h=innerHeight;const d=Math.min(devicePixelRatio||1,2);canvas.width=w*d;canvas.height=h*d;ctx.setTransform(d,0,0,d,0,0);}
  function finish(){if(done)return;done=true;cancelAnimationFrame(raf);clearTimeout(deadline);abort.abort();panel.remove();}
  const deadline=setTimeout(finish,3200);
  function frame(now){
    if(done)return;
    const age=now-start,ready=['ready','off','lost'].includes(hero.dataset.field)||hero.dataset.earth==='error';
    if(exitAt===null && age>=850 && (ready||age>=2300))exitAt=now;
    const p=exitAt===null?0:clamp((now-exitAt)/650,0,1),ease=p*p*(3-2*p);
    if(p===1){
      finish();
      const arrivals=$$('.hero .motto,.hero .hero-sub,.hero .hero-cta').map((el,i)=>el.animate?.([{opacity:0,translate:'0 18px'},{opacity:1,translate:'0 0'}],{duration:500,delay:i*65,fill:'backwards',easing:'cubic-bezier(.22,1,.36,1)'})).filter(Boolean);
      const stop=()=>arrivals.forEach(a=>a.cancel());
      reduced.addEventListener('change',stop,{once:true});
      Promise.allSettled(arrivals.map(a=>a.finished)).then(()=>reduced.removeEventListener('change',stop));
      return;
    }
    const rect=target.getBoundingClientRect(),radius=Math.min(w*.28,h*.225,215);
    const x=w/2+(rect.left+rect.width/2-w/2)*ease,y=h/2+(rect.top+rect.height/2-h/2)*ease;
    const r=radius+(Math.min(rect.width,rect.height)*.3-radius)*ease;
    panel.style.backgroundColor=`color-mix(in srgb, var(--olive) ${(1-ease)*100}%, transparent)`;
    ctx.clearRect(0,0,w,h);ctx.globalAlpha=1-ease;
    ctx.strokeStyle=sand;ctx.lineWidth=1;ctx.setLineDash([3,5]);
    ctx.globalAlpha=(1-ease)*.12;
    for(const offset of [-1,-.45,0,.45,1]){
      ctx.beginPath();ctx.moveTo(x+r*offset,0);ctx.lineTo(x+r*offset,h);ctx.stroke();
      ctx.beginPath();ctx.moveTo(0,y+r*offset);ctx.lineTo(w,y+r*offset);ctx.stroke();
    }
    ctx.globalAlpha=1-ease;ctx.lineWidth=1.5;
    const sweep=clamp(age/700,0,1)*Math.PI*2;
    for(const ratio of [1,.45]){
      const a=r*ratio;ctx.strokeStyle=sand;ctx.setLineDash([3,4]);
      ctx.beginPath();ctx.ellipse(x,y,a,a*(1-ease*.2),ease*-.22,-Math.PI/2,sweep-Math.PI/2);ctx.stroke();
      ctx.strokeStyle=orange;ctx.fillStyle=orange;ctx.setLineDash([]);
      for(let i=0;i<4;i++){
        const angle=i*Math.PI/2,cx=x+Math.cos(angle)*a,cy=y+Math.sin(angle)*a;
        const dx=-Math.sin(angle)*a*.55,dy=Math.cos(angle)*a*.55;
        ctx.beginPath();ctx.moveTo(cx-dx,cy-dy);ctx.lineTo(cx+dx,cy+dy);ctx.stroke();
        ctx.fillRect(cx-3,cy-3,6,6);
        for(const sign of [-1,1]){ctx.beginPath();ctx.arc(cx+sign*dx,cy+sign*dy,3,0,Math.PI*2);ctx.fill();}
      }
    }
    raf=requestAnimationFrame(frame);
  }
  skip.addEventListener('click',finish,{signal:abort.signal});
  window.addEventListener('wheel',finish,options);window.addEventListener('touchstart',finish,options);
  window.addEventListener('scroll',finish,options);
  window.addEventListener('keydown',finish,{signal:abort.signal});
  window.addEventListener('resize',resize,options);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)finish();},options);
  reduced.addEventListener('change',finish,{signal:abort.signal});
  resize();raf=requestAnimationFrame(frame);
})();

/* ---------- 首屏粒子场：失败只降级，不影响本文件其余部分 ---------- */
/* 资源指纹跟着 HTML 里 main.js 的 ?v= 走：import.meta.url 就是本文件被取回时的地址。 */
const VER = (import.meta.url.match(/[?&]v=([0-9a-z]{4,8})/) || [])[1] || 'dev';
function permitsHints() {
  const conn=navigator.connection;
  return !conn || (!conn.saveData && !/^(slow-2g|2g)$/.test(conn.effectiveType||''));
}
const hinted=new Set();
function resourceHint(path,rel,as) {
  const href=new URL(path,import.meta.url).href,key=rel+href;
  if(hinted.has(key))return;hinted.add(key);
  const link=document.createElement('link');link.rel=rel;link.href=href;
  if(as)link.as=as;
  if(as==='image')link.crossOrigin='anonymous'; // Match Three.js ImageLoader's request mode.
  document.head.appendChild(link);
}
let scene = null;
let motionPaused = RM;
(async function bootField() {
  const canvas = $('#field');
  if (!canvas) return;
  /* Three.js 本体 gzip 约 180 KB：省流量模式或慢链路下不拉它，直接走 CSS 静态底纹 */
  const conn = navigator.connection;
  if (conn && (conn.saveData || /^(slow-2g|2g)$/.test(conn.effectiveType || ''))) {
    const hero = $('.hero');
    if (hero) hero.dataset.field = 'off';
    return;
  }
  try {
    // Discover independent dependencies together, without bypassing the data-saving fallback.
    for(const name of ['three.module.min.js','three.core.min.js'])resourceHint('../vendor/three-0.180.0/'+name,'modulepreload');
    resourceHint('../images/earth-200408-'+(mq('(max-width: 600px)').matches?'1024':'2048')+'.webp?v='+VER,'preload','image');
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const mod = await import('./scene.js?v=' + VER);
    if (typeof mod.initField !== 'function') throw new TypeError('scene.js 未导出 initField');
    scene = mod.initField(canvas, { reducedMotion: RM, energy: FIELD_BASE });
    scene.setPaused(motionPaused);   /* 句柄上有 setEnergy */
  } catch (e) {
    const hero = $('.hero');
    if (hero) hero.dataset.field = 'off';   /* CSS 据 data-field=off 退回静态发丝底纹 */
  }
})();


/* ---------- 弹性跟随（磁吸与卡片倾斜共用一个写入器） ---------- */
const springs = [];
function spring(el, read, write) {
  if (!el) return;
  const it = { el, read, write, t: [0, 0], c: [0, 0], live: false };
  el.addEventListener('pointermove', (ev) => {
    const v = it.read(ev, it.el.getBoundingClientRect());
    if (!v) return;
    it.t = v; it.live = true; schedule();
  }, { passive: true });
  el.addEventListener('pointerleave', () => { it.t = [0, 0]; it.live = true; schedule(); }, { passive: true });
  springs.push(it);
}
updaters.push(() => {
  for (const it of springs) {
    if (!it.live) continue;
    let moving = false;
    for (let i = 0; i < 2; i++) {
      const d = it.t[i] - it.c[i];
      if (Math.abs(d) > .05) { it.c[i] += d * .2; moving = true; } else it.c[i] = it.t[i];
    }
    if (moving) { it.write(it.el, it.c[0], it.c[1]); keep(); }
    /* 收敛之后必须写**当前值**而不是 0。原来这里写死 (0,0)，于是弹簧一停下就把
       元素弹回原点：鼠标还停在卡片上，倾斜却已经塌平——实测 --rx/--ry 稳定在 0.00deg。
       pointerleave 时目标本来就是 [0,0]，所以离开归零仍然成立。 */
    else { it.live = false; it.write(it.el, it.c[0], it.c[1]); }
  }
});

/* 边界事件会漏，而漏一次就永久停在旧倾角上。
   锚点平滑滚动会把页面从一只静止的光标底下抽走（本文件末尾那条 #nav 跳转就会）；
   指针也可能从窗口外离开而收不到 pointerleave。收敛之后 it.live=false，
   这个元素再也不会被写第二次——旧的 (0,0) 写法虽然有其他毛病，却会自愈。
   所以显式补一个复位：滚动与失焦时把所有弹簧的目标压回原点。 */
function releaseSprings() {
  let any = false;
  for (const it of springs) {
    if (it.live || it.c[0] || it.c[1]) { it.t = [0, 0]; it.live = true; any = true; }
  }
  if (any) schedule();
}
window.addEventListener('scroll', releaseSprings, { passive: true });
window.addEventListener('blur', releaseSprings);

/* 磁吸：只写 --mx/--my（px），交给 CSS 的独立 translate 属性去用，
   这样卡片的 transform 倾斜可以各自占着自己的通道、互不覆盖。 */
if (HOVER && !RM) $$('[data-magnetic]').forEach((el) => spring(el, (ev, r) => [
  clamp((ev.clientX - r.left - r.width / 2) / (r.width / 2 || 1), -1, 1) * 6,   /* 位移上限 6px */
  clamp((ev.clientY - r.top - r.height / 2) / (r.height / 2 || 1), -1, 1) * 6
], (node, x, y) => {
  node.style.setProperty('--mx', x.toFixed(2) + 'px');
  node.style.setProperty('--my', y.toFixed(2) + 'px');
}));

/* 触屏与 reduced-motion 一律不绑定倾斜；nx/ny∈[-.5,.5]，×10 后正好落在 ±5deg */
if (FINE && !COARSE && !RM) $$('.work-card').forEach((card) => spring(card, (ev, r) => {
  const nx = clamp((ev.clientX - r.left) / (r.width || 1) - .5, -.5, .5);
  const ny = clamp((ev.clientY - r.top) / (r.height || 1) - .5, -.5, .5);
  return [-ny * 10, nx * 10];
}, (node, x, y) => {
  /* 只写 --rx/--ry；透视写在 CSS 的 .work-card 的 transform 里（perspective(1200px) rotateX…），
     不放 #works 那一层：给祖先设 perspective 会让位移被放大 1.69 倍、还顺带平移整张卡。
     早先这里是直接覆盖 style.transform、还自带一个 perspective(720px)——
     于是 CSS 里那条 rotateX(var(--rx)) 永远不生效，卡片同时受三份透视，
     而 --rx/--ry 成了没人写的死变量。 */
  node.style.setProperty('--rx', x.toFixed(2) + 'deg');
  node.style.setProperty('--ry', y.toFixed(2) + 'deg');
}));

/* ---------- 语言菜单：menu/menuitem 语义（与纪念册一致）+ 记忆，但绝不自动跳转 ---------- */
(function langMenu() {
  /* 只认这一种结构：.lang > button[aria-haspopup] + ul[role=menu]，两页都是这么写的。
     早先这里还兜着 listbox / option / .lang-item 几套别名，而且后两个是**全文档**查询——
     一旦 .lang 被改名，脚本就会去劫持页面上另一个不相干的下拉控件。
     结构对不上就整块不启用（这是渐进增强，不是失败），比猜错目标安全。 */
  const box = $('.lang');
  if (!box) return;
  const btn = $('[aria-haspopup]', box);
  const menu = $('.lang-menu', box) || (btn && btn.nextElementSibling);
  if (!btn || !menu) return;
  const wrap = box;
  const items = $$('[role="menuitem"]', menu);
  if (!items.length) return;

  const optionOf = (node) => {
    if (!node || !node.closest) return null;
    return node.matches('[role="menuitem"]') ? node : node.closest('[role="menuitem"]');
  };
  const anchorOf = (o) => (o.matches && o.matches('a[href]')) ? o : $('a[href]', o);
  const isOpen = () => !menu.hidden;
  function open(idx) {
    menu.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
    if(permitsHints()){
      const other=items.find(item=>codeOf(item)!==LANG),anchor=other&&anchorOf(other);
      if(anchor){
        const url=new URL(anchor.href,location.href);
        if(url.origin===location.origin && url.pathname===(LANG==='en'?'/':'/en/') && !url.search && !url.hash)resourceHint(url.href,'prefetch','document');
      }
    }
    if (typeof idx === 'number') focusItem(items[idx]);
  }
  function close(refocus) {
    if (isOpen()) { menu.hidden = true; menu.classList.remove('is-open'); btn.setAttribute('aria-expanded', 'false'); }
    if (refocus && btn.focus) btn.focus();
  }
  function focusItem(o) {
    if (!o) return;
    const t = anchorOf(o) || o;
    if (t.focus) { try { t.focus(); } catch (e) { } }
  }
  const codeOf = (o) => {
    const a = anchorOf(o);
    const raw = ((o.getAttribute && (o.getAttribute('data-lang') || o.getAttribute('lang'))) ||
      (a && (a.getAttribute('data-lang') || a.getAttribute('lang') || a.getAttribute('hreflang'))) || '').toLowerCase();
    if (raw.indexOf('en') === 0) return 'en';
    if (raw.indexOf('zh') === 0) return 'zh';
    const href = (a ? a.getAttribute('href') : o.getAttribute('href')) || '';
    return /(^|[/#.])en([/.#]|$)/i.test(href) ? 'en' : 'zh';
  };

  items.forEach((o) => { if (!o.setAttribute) return; const on = codeOf(o) === LANG; o.setAttribute('aria-current', on ? 'true' : 'false'); });

  btn.addEventListener('click', () => { isOpen() ? close(false) : open(); });
  items.forEach((o) => {
    const a = anchorOf(o);
    (a || o).addEventListener('click', () => remember(codeOf(o)));
  });
  document.addEventListener('click', (ev) => { if (isOpen() && !wrap.contains(ev.target) && !menu.contains(ev.target)) close(false); }, { passive: true });
  document.addEventListener('keydown', (ev) => {
    const inBox = wrap.contains(ev.target) || menu.contains(ev.target);
    if (ev.key === 'Escape') { if (isOpen()) { ev.preventDefault(); close(true); } return; }
    if (!isOpen() && !inBox) return;
    if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
      ev.preventDefault();
      if (!isOpen()) { open(ev.key === 'ArrowDown' ? 0 : items.length - 1); return; }
      const cur = items.indexOf(optionOf(ev.target));
      /* 焦点还在触发按钮上时 indexOf 是 -1：早先这里算成 (-1-1+2)%2 === 0，
         于是从按钮按 ArrowUp 会跳到**第一项**而不是最后一项。 */
      const n = cur < 0
        ? (ev.key === 'ArrowDown' ? 0 : items.length - 1)
        : (cur + (ev.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
      focusItem(items[n]);
    } else if (ev.key === 'Home') { if (isOpen()) { ev.preventDefault(); focusItem(items[0]); } }
    else if (ev.key === 'End') { if (isOpen()) { ev.preventDefault(); focusItem(items[items.length - 1]); } }
    else if (ev.key === 'Enter' || ev.key === ' ') {
      /* role="menuitem" 的键盘约定是 Enter **和** Space；链接原生只认 Enter。 */
      if (!isOpen()) return;
      const o = optionOf(ev.target);
      if (o) { ev.preventDefault(); select(o); }
    }

  });

  /* 关闭只由「焦点离开整个控件」触发。早先这里是 Tab 就 close()：
     Tab 从按钮走进菜单后菜单立刻被隐藏、焦点掉回 <body>，
     菜单项因此永远无法被键盘到达（WCAG 2.4.3 / 2.4.7）。
     这段必须待在初始化作用域——挂在 keydown 回调里的话，它要等第一次按键才注册，
     而且每按一次键就多挂一个监听器。 */
  wrap.addEventListener('focusout', (ev) => {
    if (!isOpen()) return;
    const to = ev.relatedTarget;
    if (to && (wrap.contains(to) || menu.contains(to))) return;
    close(false);
  });

  function select(o) {
    const a = anchorOf(o);
    remember(codeOf(o));
    if (a && a.href) { close(false); location.href = a.href; }
    else if (a && a.click) a.click();
  }

  /* 记住的是「访客主动切过一次语言」这个事实；下次进店只提示、不代跳：
     分享出去的链接必须以中文默认页落地，自动重定向会破坏这一点。 */
  const KEY = 'intro-lang';
  function remember(code) { try { localStorage.setItem(KEY, code); } catch (e) { } }
  function stored() { try { return localStorage.getItem(KEY) || ''; } catch (e) { return ''; } }

  const saved = stored();
  if (!saved || saved === LANG) return;
  const target = items.filter((o) => codeOf(o) === saved)[0];
  const link = target && anchorOf(target);
  if (!link || !link.href) return;
  const hint = document.createElement('div');
  hint.className = 'lang-hint';
  hint.setAttribute('role', 'status');   /* 事后出现的横幅：播报给读屏，但不抢焦点 */
  const say = document.createElement('span');
  say.textContent = LANG === 'en' ? 'You last read this site in Chinese.' : '你上次看的是中文版。';
  const go = document.createElement('a');
  go.textContent = LANG === 'en' ? 'Switch →' : '切过去 →';
  go.href = link.href;
  go.addEventListener('click', () => remember(saved));
  const off = document.createElement('button');
  off.type = 'button'; off.setAttribute('aria-label', LANG === 'en' ? 'Dismiss' : '关闭提示');
  off.textContent = '×';
  off.addEventListener('click', () => hint.remove());
  hint.appendChild(say); hint.appendChild(go); hint.appendChild(off);
  /* 插在语言控件**之后**而不是 </body> 之前：这块横幅画在页面顶部，
     若 DOM 顺序排到最后，键盘用户要 Tab 完整张页才够到它的「切过去」链接（WCAG 2.4.3）。
     用 insertAdjacentElement 搬的是已建好的节点，不解析 HTML。 */
  if (wrap.insertAdjacentElement) wrap.insertAdjacentElement('afterend', hint);
  else document.body.appendChild(hint);
  requestAnimationFrame(() => {
    /* 纵向基准取整条 topbar 的下沿，不取语言按钮的下沿。
       按钮在顶栏第一行，而 ≤768px 时导航折到第二行（order:3 / flex:1 1 100%），
       按按钮定位就会把这块 fixed 横幅直接压在导航第一行上——
       链接的 computed 仍是 visibility:visible、opacity:1，肉眼却完全看不见它们
       （实测横幅 y 56-94 正盖住导航第一行 y 58-106）。
       横幅只在「访客上次换过语言」时才出现，所以常规巡检路径碰不到它。 */
    const bar = (wrap.closest('.topbar') || wrap).getBoundingClientRect();
    const r = btn.getBoundingClientRect();
    const w = hint.offsetWidth || 240;
    hint.style.left = clamp(r.left + w > window.innerWidth - 8 ? window.innerWidth - w - 8 : r.left, 8, window.innerWidth - w - 8) + 'px';
    hint.style.top = (bar.bottom + 6) + 'px';
  });
})();


/* ---------- 当前节高亮 ---------- */
(function activeNav() {
  const nav = $('#nav') || $('nav');
  if (!nav || !('IntersectionObserver' in window)) return;
  const links = $$('a[href^="#"]', nav);
  const map = new Map();
  links.forEach((a) => {
    const sec = document.getElementById(a.getAttribute('href').slice(1));
    if (sec) map.set(sec, a);
  });
  if (!map.size) return;
  const intro = $('.hero');
  if (intro) map.set(intro, links[0]);
  links[0].setAttribute('aria-current', 'true');
  function mark(link) {
    links.forEach((a) => { a === link ? a.setAttribute('aria-current', 'true') : a.removeAttribute('aria-current'); });
  }
  const io = new IntersectionObserver((list) => {
    list.forEach((e) => { if (e.isIntersecting) { const a = map.get(e.target); if (a) mark(a); } });
  }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });
  map.forEach((a, sec) => io.observe(sec));
})();

/* ---------- Copy contact details and the canonical public URL ---------- */
function enableCopy(btn,value) {
  if(!btn || !value)return;
  btn.hidden=false;
  const say = document.createElement('span');
  say.className = 'copy-status';
  say.setAttribute('aria-live', 'polite');
  say.textContent = '';
  if (btn.nextSibling) btn.parentNode.insertBefore(say, btn.nextSibling); else btn.parentNode.appendChild(say);
  let timer = 0,manual=null;

  function legacy(text) {
    const ta = document.createElement('textarea');
    ta.value = text; ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;top:-9999px;left:-9999px;height:1px;width:1px;opacity:0';
    document.body.appendChild(ta);
    try { ta.select(); return document.execCommand('copy'); } catch (e) { return false; }
    finally { ta.remove(); }
  }
  function flash(ok) {
    say.textContent = ok ? (LANG === 'en' ? 'Copied / 已复制' : '已复制 / Copied')
      : (LANG === 'en' ? 'Text selected. Copy it with your keyboard or touch menu.' : '已选中下方内容，可用键盘或长按菜单复制。');
    btn.dataset.state = ok ? 'copied' : 'manual';
    clearTimeout(timer);
    if(ok)timer=setTimeout(()=>{say.textContent='';delete btn.dataset.state;},2200);
    else {
      manual=document.createElement('input');manual.className='copy-fallback';manual.readOnly=true;manual.value=value;
      manual.setAttribute('aria-label',LANG==='en'?'Text to copy':'要复制的内容');
      say.after(manual);manual.focus({preventScroll:true});manual.select();
    }
  }
  btn.addEventListener('click', async () => {
    btn.disabled=true;manual?.remove();manual=null;clearTimeout(timer);
    let ok=false;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(value);ok=true;
      }
    } catch { }
    if(!ok)ok=legacy(value);
    btn.disabled=false;flash(ok);
  });
}
enableCopy($('.copy-mail'),'xxc200707@gmail.com');
enableCopy($('.copy-url'),$('link[rel="canonical"]')?.href);

/* Load the existing film only after an explicit play action. */
(function filmPlayer(){
  const entry=$('.film-entry'),dialog=$('.film-dialog'),video=$('.film-dialog video');
  if(!entry || !dialog || !video || !dialog.showModal)return;
  const note=$('.film-note'),originalNote=note.textContent;let overflow='',released=true;
  entry.addEventListener('click',e=>{
    if(e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;
    e.preventDefault();released=false;overflow=document.body.style.overflow;document.body.style.overflow='hidden';
    note.textContent=originalNote;dialog.showModal();video.src=entry.href;
    video.play().catch(()=>{});
  });
  function release(){
    if(released)return;released=true;
    video.pause();video.removeAttribute('src');video.load();document.body.style.overflow=overflow;entry.focus({preventScroll:true});
  }
  function close(){video.pause();dialog.close();release();}
  $('.film-close',dialog).addEventListener('click',close);
  dialog.addEventListener('click',e=>{if(e.target===dialog)close();});
  dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
  dialog.addEventListener('close',release);
  video.addEventListener('error',()=>{note.textContent=LANG==='en'?'The film could not load. Try the download link below.':'影片加载失败，可尝试下方下载链接。';});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)video.pause();});
})();

/* ---------- 锚点平滑滚动（含 #top 回顶） ---------- */
document.addEventListener('click', (ev) => {
  if (ev.defaultPrevented || ev.button > 0 || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;
  const t = ev.target;
  const a = t && t.closest ? t.closest('a[href^="#"]') : null;
  if (!a) return;
  const id = a.getAttribute('href').slice(1);
  const node = id ? document.getElementById(id) : null;
  if (!node && id !== 'top') return;
  ev.preventDefault();
  const opt = { behavior: RM ? 'auto' : 'smooth', block: 'start' };
  if (node) node.scrollIntoView(opt); else window.scrollTo({ top: 0, left: 0, behavior: opt.behavior });
  try { history.replaceState(null, '', '#' + id); } catch (e) { }       /* file:// 下静默失败 */
  if (node && !node.hasAttribute('tabindex')) node.setAttribute('tabindex', '-1');
  if (node && node.focus) { try { node.focus({ preventScroll: true }); } catch (e) { } }
  schedule();
});

schedule();


/* Match anchor offsets and sticky scenes to the naturally wrapped header. */
(function navigationHeight(){
  const bar=$('.topbar');if(!bar)return;
  const observer=new ResizeObserver(()=>{
    const height=Math.ceil(bar.getBoundingClientRect().height);
    if(height&&innerWidth<=1000){root.style.setProperty('--bar',`${height}px`);document.body.style.setProperty('--bar',`${height}px`);}
    else{root.style.removeProperty('--bar');document.body.style.removeProperty('--bar');}
  });
  observer.observe(bar);
})();

/* Mobile navigation uses real buttons and restores focus when dismissed. */
(function navigationDrawer() {
  const toggle = $('.menu-toggle'), nav = $('#nav');
  if (!toggle || !nav) return;
  function close(restore = false) {
    if(!nav.classList.contains('is-open'))return;
    nav.classList.remove('is-open'); toggle.setAttribute('aria-expanded', 'false');
    toggle.textContent = LANG === 'en' ? 'Menu' : '菜单';
    document.body.style.overflow = '';
    $$('main, .foot').forEach(el => el.inert = false);
    if (restore) toggle.focus();
    schedule();
  }
  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') !== 'true';
    if (!open) {close(true);return;}
    toggle.setAttribute('aria-expanded', 'true');nav.classList.add('is-open');
    toggle.textContent = LANG === 'en' ? 'Close' : '关闭';
    document.body.style.overflow = 'hidden';
    $$('main, .foot').forEach(el => el.inert = true);
    schedule();
  });
  nav.addEventListener('click', e => { if (e.target.closest('a')) close(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && nav.classList.contains('is-open')) close(true); });
  document.addEventListener('click', e => { if (!e.target.closest('.topbar')) close(); });
  window.addEventListener('resize', () => {if(innerWidth > 1000 && nav.classList.contains('is-open')) close();}, {passive:true});

})();
(function motionControl() {
  const button = $('.motion-toggle'); if (!button) return;
  function label() {
    button.setAttribute('aria-pressed', String(motionPaused));
    button.textContent = LANG === 'en' ? (motionPaused ? 'Resume motion' : 'Pause motion') : (motionPaused ? '继续动效' : '暂停动效');
  }
  label();
  if (RM) {button.textContent = LANG === 'en' ? 'Reduced motion' : '已减弱动效';button.disabled = true;}
  button.addEventListener('click', () => {motionPaused=!motionPaused;scene?.setPaused(motionPaused);label();schedule();});
})();

/* Both projects remain readable without JavaScript. */
(function projectShowcase() {
  const buttons = $$('.project-switch button'), cards = $$('#works .work-card');
  if (!buttons.length || cards.length !== buttons.length) return;
  const stage=$('.project-stage'), reduced=mq('(prefers-reduced-motion: reduce)');
  let active=-1, animations=[], measuredWidth=0;
  const stop=()=>{animations.forEach(animation=>animation.cancel());animations=[];};
  function reserveHeight() {
    if(!stage) return;
    const width=stage.clientWidth;
    if(!width) return;
    measuredWidth=width;
    // Measure both existing articles synchronously without changing their reading order.
    const heights=cards.map(card=>{
      const hidden=card.hidden,style=card.style.cssText;
      card.style.cssText+=`;position:absolute;visibility:hidden;width:${width}px;`;
      card.hidden=false;
      const height=card.getBoundingClientRect().height;
      card.hidden=hidden;card.style.cssText=style;
      return height;
    });
    stage.style.minHeight=`${Math.ceil(Math.max(...heights))}px`;
  }
  function select(index,animate=true) {
    if(index===active) return;
    const direction=index>active?1:-1;stop();active=index;
    cards.forEach((card, i) => {card.hidden = i !== index; if(i === index) card.classList.add('is-in');});
    buttons.forEach((button, i) => button.setAttribute('aria-pressed', String(i === index)));
    if(animate && !motionPaused && !reduced.matches){
      const card=cards[index],shot=$('.shot',card);
      if(shot?.animate) animations.push(shot.animate([
        {opacity:.2,transform:`perspective(1200px) translateX(${direction*28}px) rotateY(${direction*-7}deg) scale(.96)`},
        {opacity:1,transform:'perspective(1200px) translateX(0) rotateY(0) scale(1)'}
      ],{duration:650,easing:'cubic-bezier(.22,1,.36,1)'}));
      $$('h3,.lede,.facts',card).forEach((el,i)=>{
        if(el.animate) animations.push(el.animate([{opacity:0,translate:`${direction*20}px 0`},{opacity:1,translate:'0 0'}],{duration:450,delay:i*45,fill:'backwards',easing:'cubic-bezier(.22,1,.36,1)'}));
      });
    }
  }
  buttons.forEach((button, i) => {
    button.setAttribute('aria-controls',cards[i].id);
    button.addEventListener('click', () => select(i));
    button.addEventListener('keydown',e=>{
      const next=e.key==='ArrowRight'?(i+1)%buttons.length:e.key==='ArrowLeft'?(i+buttons.length-1)%buttons.length:e.key==='Home'?0:e.key==='End'?buttons.length-1:null;
      if(next===null)return;e.preventDefault();buttons[next].focus();select(next);
    });
  });
  select(0,false);reserveHeight();
  if(stage){new ResizeObserver(()=>{if(stage.clientWidth!==measuredWidth)reserveHeight();}).observe(stage);}
  document.fonts?.ready.then(reserveHeight);
  cards.forEach(card=>$('.shot',card)?.addEventListener('load',reserveHeight));
  // Warm the alternate preview only near this section, before a user switches.
  if(stage){const warm=new IntersectionObserver(([entry])=>{
    if(!entry.isIntersecting)return;
    cards.forEach(card=>{const shot=$('.shot',card);if(shot)shot.loading='eager';});warm.disconnect();
  },{rootMargin:'400px'});warm.observe(stage);}
  reduced.addEventListener('change',()=>{if(reduced.matches)stop();});
  const pause=$('.motion-toggle');
  if(pause)new MutationObserver(()=>{if(motionPaused)stop();}).observe(pause,{attributes:true,attributeFilter:['aria-pressed']});
})();

/* Restore scroll-linked typography inside the existing, separate hero cells. */
if (!RM) {
  const hero = $('.hero'), copy = $('.hero-copy'), title = $('.hero h1');
  if (hero && copy && title) updaters.push(() => {
    if (motionPaused) return;
    const p = clamp(-hero.getBoundingClientRect().top / Math.max(1, hero.offsetHeight * .65), 0, 1);
    copy.style.transform = `translateY(${-p * 36}px)`;
    copy.style.opacity = String(1 - p * .35);

  });
}

/* Keep the transparent navigation readable over the existing section backgrounds. */
(function navigationTone() {
  const bar = $('.topbar'), sections = $$('main > section');
  if (!bar) return;
  updaters.push(() => {
    const y = bar.getBoundingClientRect().height / 2;
    const section = sections.find(el => {const box=el.getBoundingClientRect();return box.top<=y && box.bottom>y;});
    bar.dataset.section = section?.id || 'hero';
    bar.dataset.tone = section && ['about','how','contact'].includes(section.id) ? 'ink' : 'sand';
  });
  schedule();
})();

/* Letter-roll feedback observed on the reference navigation. */
(function navigationLetters() {
  $$('#nav a').forEach(link => {
    const label = link.textContent.trim();
    link.setAttribute('aria-label', label);
    const fragment = document.createDocumentFragment();
    Array.from(label).forEach((character, index) => {
      const window = document.createElement('span'), roll = document.createElement('span');
      window.className = 'nav-glyph'; window.setAttribute('aria-hidden', 'true');
      roll.className = 'nav-roll'; roll.textContent = character === ' ' ? '\u00a0' : character;
      roll.dataset.glyph = roll.textContent;
      roll.style.setProperty('--nav-delay', `${index * 14}ms`);
      window.appendChild(roll); fragment.appendChild(window);
    });
    link.replaceChildren(fragment);
  });
})();

/* A local four-chapter stage; no document-wide scroll interception. */
(function processChapters() {
  const section=$('#how'), runway=$('.process-runway'), cards=$$('.steps li'), buttons=$$('.process-controls button');
  if(!section || !runway || cards.length!==4 || RM) return;
  section.classList.add('process-enabled');
  let active=-1, visual=null, loading=false, short=innerHeight<=700;
  const tuning=document.createElement('div');tuning.className='process-tuning';
  const label=document.createElement('label'), slider=document.createElement('input');
  slider.type='range';slider.id='process-spread';slider.min='0';slider.max='100';slider.value='100';slider.disabled=true;
  label.htmlFor=slider.id;
  label.textContent=LANG==='en'?'Explore the layers':'拆开看看';
  const value=document.createElement('output');value.htmlFor=slider.id;
  const updateSpread=()=>{
    const amount=Number(slider.value),text=LANG==='en'?`Expanded ${amount}%`:`展开 ${amount}%`;
    value.textContent=text;slider.setAttribute('aria-valuetext',text);visual?.setSpread(amount/100);
  };
  updateSpread();slider.addEventListener('input',updateSpread);
  tuning.append(label,value,slider);
  const visualHost=$('.process-visual');visualHost.removeAttribute('aria-hidden');
  $$('.process-fallback, #process-field',visualHost).forEach(el=>el.setAttribute('aria-hidden','true'));
  visualHost.appendChild(tuning);
  new MutationObserver(()=>{slider.disabled=section.dataset.processRender!=='ready';}).observe(section,{attributes:true,attributeFilter:['data-process-render']});
  function select(index) {
    if(active===index) return;
    active=index;section.dataset.processStep=String(index);
    tuning.hidden=index!==1;
    cards.forEach((card,i)=>{card.classList.toggle('is-current',i===index);card.setAttribute('aria-hidden',String(i!==index));});
    buttons.forEach((button,i)=>button.setAttribute('aria-pressed',String(i===index)));
  }
  select(0);
  function progress() {
    if(short) return active;
    const top=runway.getBoundingClientRect().top, stage=$('.process-stage');
    const bar=parseFloat(getComputedStyle(document.body).getPropertyValue('--bar'))||84;
    return clamp((bar-top)/Math.max(1,runway.offsetHeight-stage.offsetHeight)*3,0,3);
  }
  updaters.push(()=>{
    short=innerHeight<=700;
    const p=progress();if(!short) select(Math.min(3,Math.floor(p+.5)));
    visual?.setProgress(p,motionPaused);
  });
  buttons.forEach((button,index)=>button.addEventListener('click',()=>{
    if(short){select(index);visual?.setProgress(index,motionPaused);return;}
    const stage=$('.process-stage'), bar=parseFloat(getComputedStyle(document.body).getPropertyValue('--bar'))||84;
    window.scrollTo({top:scrollY+runway.getBoundingClientRect().top-bar+index/3*(runway.offsetHeight-stage.offsetHeight),behavior:motionPaused?'auto':'smooth'});
  }));
  const observer=new IntersectionObserver(async ([entry])=>{
    if(!entry.isIntersecting || loading) return;loading=true;observer.disconnect();
    try {
      const mod=await import('./process-scene.js?v='+VER);
      visual=mod.initProcess($('#process-field'),$('.work-card .shot').src);
      visual.setProgress(progress(),motionPaused);
    } catch {section.dataset.processRender='fallback';}
  },{rootMargin:'500px'});
  observer.observe(runway);
  schedule();
})();

/* Transfer the existing heading into the header without moving layout boxes.
   Per-character geometry preserves both Chinese and wrapped English source text. */
(function brandTransfer() {
  const title=$('.hero h1'), brand=$('.brand b'), header=$('.topbar');
  if(!title || !brand || RM || title.textContent.trim()!==brand.textContent.trim()) return;
  const source=title.firstChild,destination=brand.firstChild;
  if(source?.nodeType!==Node.TEXT_NODE || destination?.nodeType!==Node.TEXT_NODE) return;
  const layer=document.createElement('div');layer.className='brand-flight';layer.setAttribute('aria-hidden','true');
  const letters=Array.from(title.textContent),spans=letters.map(letter=>{
    const span=document.createElement('span');span.textContent=letter;layer.appendChild(span);return span;
  });
  document.body.appendChild(layer);
  let geometry=null,dirty=true;
  const measureText=node=>{
    let offset=0;
    return letters.map(letter=>{
      const range=document.createRange();range.setStart(node,offset);offset+=letter.length;range.setEnd(node,offset);
      const box=range.getBoundingClientRect();return {x:box.left,y:box.top+scrollY};
    });
  };
  function metric(style) {
    const probe=spans[0];probe.style.cssText='left:0;top:0;';
    Object.assign(probe.style,{fontFamily:style.fontFamily,fontSize:style.fontSize,fontWeight:style.fontWeight,lineHeight:style.lineHeight,letterSpacing:style.letterSpacing});
    const range=document.createRange();range.selectNodeContents(probe);
    const box=range.getBoundingClientRect(),outer=probe.getBoundingClientRect();
    return {x:box.left-outer.left,y:box.top-outer.top};
  }
  function measure() {
    const fromStyle=getComputedStyle(title),toStyle=getComputedStyle(brand),sourceBox=title.getBoundingClientRect();
    const startTop=header.getBoundingClientRect().height+100;
    const start=Math.max(0,sourceBox.top+scrollY-startTop);
    geometry={from:measureText(source),to:measureText(destination),start,distance:Math.min(360,sourceBox.height*.75+60),fromStyle:{size:parseFloat(fromStyle.fontSize),height:parseFloat(fromStyle.lineHeight)||parseFloat(fromStyle.fontSize)*1.2,weight:parseFloat(fromStyle.fontWeight),spacing:parseFloat(fromStyle.letterSpacing)||0,color:fromStyle.color,family:fromStyle.fontFamily},toStyle:{size:parseFloat(toStyle.fontSize),height:parseFloat(toStyle.lineHeight)||parseFloat(toStyle.fontSize)*1.2,weight:parseFloat(toStyle.fontWeight),spacing:parseFloat(toStyle.letterSpacing)||0},fromOffset:metric(fromStyle),toOffset:metric(toStyle)};
    geometry.to.forEach(point=>point.y-=scrollY);
    dirty=false;
  }
  const mix=(a,b,t)=>a+(b-a)*t;
  function reset(){layer.style.visibility='hidden';title.style.opacity='';brand.style.opacity='';layer.dataset.progress='0';}
  updaters.push(()=>{
    if(motionPaused || mq('(prefers-reduced-motion: reduce)').matches || $('#nav')?.classList.contains('is-open')){reset();return;}
    if(dirty)measure();
    const g=geometry,p=clamp((scrollY-g.start)/g.distance,0,1);
    layer.dataset.progress=p.toFixed(4);
    if(p===0){reset();return;}
    title.style.opacity='0';
    brand.style.opacity=p===1?'1':'0';
    if(p===1){layer.style.visibility='hidden';return;}
    layer.style.visibility='visible';layer.style.opacity='1';layer.style.color=g.fromStyle.color;
    // Shrink and move together; the source stays below the globe throughout the transfer.
    const t=p*p*(3-2*p);
    spans.forEach((span,i)=>Object.assign(span.style,{
      left:`${mix(g.from[i].x-g.fromOffset.x,g.to[i].x-g.toOffset.x,t)}px`,
      top:`${mix(g.from[i].y-g.start-g.fromOffset.y,g.to[i].y-g.toOffset.y,t)}px`,
      fontFamily:g.fromStyle.family,fontSize:`${mix(g.fromStyle.size,g.toStyle.size,t)}px`,
      lineHeight:`${mix(g.fromStyle.height,g.toStyle.height,t)}px`,
      fontWeight:String(mix(g.fromStyle.weight,g.toStyle.weight,t)),letterSpacing:`${mix(g.fromStyle.spacing,g.toStyle.spacing,t)}px`
    }));
  });
  const observer=new ResizeObserver(()=>{dirty=true;schedule();});observer.observe(title);observer.observe(brand);observer.observe(header);
  document.fonts?.ready.then(()=>{dirty=true;schedule();});
  mq('(prefers-reduced-motion: reduce)').addEventListener('change',schedule);
  schedule();
})();
