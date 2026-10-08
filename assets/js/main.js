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
    list.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
  }, { threshold: .12, rootMargin: '0px 0px -4% 0px' });
  els.forEach((el) => {
    const kids = el.parentElement
      ? Array.prototype.filter.call(el.parentElement.children, (c) => c.classList.contains('reveal'))
      : [el];
    el.style.setProperty('--d', (Math.min(kids.indexOf(el), 8) * 60) + 'ms');
    io.observe(el);
  });
})();

/* 场强基准：必须先声明再用——bootField 里那句 initField({energy: FIELD_BASE})
   靠 await import() 的延迟侥幸躲过了暂时性死区，但读代码的人不该靠运气。 */
const FIELD_BASE = .34;

/* ---------- 首屏粒子场：失败只降级，不影响本文件其余部分 ---------- */
/* 资源指纹跟着 HTML 里 main.js 的 ?v= 走：import.meta.url 就是本文件被取回时的地址。 */
const VER = (import.meta.url.match(/[?&]v=([0-9a-z]{4,8})/) || [])[1] || 'dev';
let scene = null;
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
    const mod = await import('./scene.js?v=' + VER);
    if (typeof mod.initField !== 'function') throw new TypeError('scene.js 未导出 initField');
    scene = mod.initField(canvas, { reducedMotion: RM, energy: FIELD_BASE });   /* 句柄上有 setEnergy */
  } catch (e) {
    const hero = $('.hero');
    if (hero) hero.dataset.field = 'off';   /* CSS 据 data-field=off 退回静态发丝底纹 */
  }
})();


/* ---------- 场强跟随滚动：滑得越快纸屑越活跃，停下后回落到基准 ---------- */
(function fieldDrive() {
  if (RM) return;                    /* 减弱动效：既不绑滚动，也不该被驱动——见 scene.js 的 setEnergy */
  let cur = FIELD_BASE, target = FIELD_BASE, idle = 0;
  let lastY = window.scrollY, lastT = performance.now();

  window.addEventListener('scroll', () => {
    const now = performance.now(), dt = Math.max(8, now - lastT);
    const speed = Math.abs(window.scrollY - lastY) / dt;   /* px/ms */
    lastY = window.scrollY; lastT = now;
    target = Math.min(1, FIELD_BASE + speed * .62);
    clearTimeout(idle);
    idle = setTimeout(() => { target = FIELD_BASE; }, 90);
    schedule();
  }, { passive: true });

  /* 缓动搭全站那条 rAF 链，不再自己开第二个 requestAnimationFrame 循环。 */
  updaters.push(() => {
    const d = target - cur;
    if (Math.abs(d) < .004) { cur = target; }
    else cur += d * .12;
    if (scene && typeof scene.setEnergy === 'function') { try { scene.setEnergy(cur); } catch (e) { } }
    if (cur !== target) keep();
  });
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
  function mark(link) {
    links.forEach((a) => { a === link ? a.setAttribute('aria-current', 'true') : a.removeAttribute('aria-current'); });
  }
  const io = new IntersectionObserver((list) => {
    list.forEach((e) => { if (e.isIntersecting) { const a = map.get(e.target); if (a) mark(a); } });
  }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });
  map.forEach((a, sec) => io.observe(sec));
})();

/* ---------- 复制邮箱 ---------- */
(function copyMail() {
  const btn = $('.copy-mail');
  if (!btn) return;
  const MAIL = 'xxc200707@gmail.com';
  const say = document.createElement('span');
  say.className = 'copy-status';
  say.setAttribute('aria-live', 'polite');
  say.textContent = '';
  if (btn.nextSibling) btn.parentNode.insertBefore(say, btn.nextSibling); else btn.parentNode.appendChild(say);
  let timer = 0;

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
      : (LANG === 'en' ? 'Press Ctrl+C after selecting' : '已选中，按 Ctrl+C 复制');
    btn.dataset.state = ok ? 'copied' : 'manual';
    clearTimeout(timer); timer = setTimeout(() => { say.textContent = ''; delete btn.dataset.state; }, 1800);
  }
  btn.addEventListener('click', () => {
    let done = false;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(MAIL).then(() => { done = true; flash(true); }, () => { if (!done) flash(legacy(MAIL)); });
        return;
      }
    } catch (e) { }
    flash(legacy(MAIL));
  });
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
