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
const tok = (n, fb) => { const v = getComputedStyle(root).getPropertyValue(n).trim(); return v || fb; };

/* ---------- 全站唯一的 rAF 链：滚动/墨点/磁吸/音量斜坡都搭这条 ---------- */
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

/* ---------- 横向溢出哨兵（验收脚本断言它永远不为 '1'） ---------- */
function checkOverflow() {
  if ((root.scrollWidth || 0) > window.innerWidth + 1) root.dataset.overflow = '1';
  else if (root.dataset.overflow) delete root.dataset.overflow;
}
window.addEventListener('resize', checkOverflow, { passive: true });
window.addEventListener('load', checkOverflow);
if (document.fonts && document.fonts.ready) document.fonts.ready.then(checkOverflow);
checkOverflow();

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
    scene = mod.initField(canvas);   /* setEnergy 在返回的句柄上，不在模块命名空间上 */
  } catch (e) {
    const hero = $('.hero');
    if (hero) hero.dataset.field = 'off';   /* CSS 据 data-field=off 退回静态发丝底纹 */
  }
})();


/* ---------- 场强跟随滚动：滑得越快纸屑越活跃，停下后回落到基准 ---------- */
const FIELD_BASE = .34;
(function fieldDrive() {
  let cur = FIELD_BASE, target = FIELD_BASE, raf = 0, idle = 0;
  let lastY = window.scrollY, lastT = performance.now();

  function push(v) {
    if (scene && typeof scene.setEnergy === 'function') { try { scene.setEnergy(v); } catch (e) { } }
  }
  function ease() {
    cur += (target - cur) * .12;
    push(cur);
    if (Math.abs(target - cur) < .004) { cur = target; raf = 0; return; }
    raf = requestAnimationFrame(ease);
  }
  window.addEventListener('scroll', () => {
    const now = performance.now(), dt = Math.max(8, now - lastT);
    const speed = Math.abs(window.scrollY - lastY) / dt;   /* px/ms */
    lastY = window.scrollY; lastT = now;
    target = Math.min(1, FIELD_BASE + speed * .62);
    clearTimeout(idle);
    idle = setTimeout(() => { target = FIELD_BASE; if (!raf) raf = requestAnimationFrame(ease); }, 90);
    if (!raf) raf = requestAnimationFrame(ease);
  }, { passive: true });
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
    else { it.live = false; it.write(it.el, 0, 0); }
  }
});

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
  /* 高光的跟随量用独立变量名：早先这里写的是 --mx/--my（百分比），
     而同名变量会被卡内的按钮继承去当 translate 用，指针移开后按钮就跑位。 */
  card.style.setProperty('--hl-x', ((nx + .5) * 100).toFixed(1) + '%');
  card.style.setProperty('--hl-y', ((ny + .5) * 100).toFixed(1) + '%');
  return [-ny * 10, nx * 10];
}, (node, a, b) => {
  node.style.transform = a || b
    ? 'perspective(720px) rotateX(' + a.toFixed(2) + 'deg) rotateY(' + b.toFixed(2) + 'deg)' : '';
  node.style.setProperty('--hl-x', '50%'); node.style.setProperty('--hl-y', '50%');
}));

/* ---------- 语言菜单：menu/menuitem 语义（与纪念册一致）+ 记忆，但绝不自动跳转 ---------- */
(function langMenu() {
  const box = $('.lang');
  let btn = (box && $('[aria-haspopup]', box)) || $('[aria-haspopup="listbox"]') || $('.lang-btn');
  let menu = (box && ($('.lang-menu', box) || $('[role="listbox"]', box))) || $('.lang-menu') || $('[role="listbox"]');
  if (btn && !menu && btn.nextElementSibling) menu = btn.nextElementSibling;
  if (!btn || !menu) return;
  const wrap = box || btn.parentElement || document.body;
  let items = $$('[role="menuitem"], [role="option"]', menu);
  if (!items.length) items = $$('.lang-item, a[href]', menu);
  if (!items.length) return;

  const optionOf = (node) => {
    if (!node || !node.closest) return null;
    return node.matches('[role="menuitem"], [role="option"]') ? node : node.closest('[role="menuitem"], [role="option"]');
  };
  const anchorOf = (o) => (o.matches && o.matches('a[href]')) ? o : $('a[href]', o);
  const isOpen = () => !menu.hidden;
  function open(idx) {
    menu.hidden = false; menu.classList.add('is-open');
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

  items.forEach((o) => { if (!o.setAttribute) return; const on = codeOf(o) === LANG; o.setAttribute('aria-current', on ? 'true' : 'false'); o.classList.toggle('is-current', on); });

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
      const i = items.indexOf(optionOf(ev.target));
      const n = (i + (ev.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
      focusItem(items[n]);
    } else if (ev.key === 'Home') { if (isOpen()) { ev.preventDefault(); focusItem(items[0]); } }
    else if (ev.key === 'End') { if (isOpen()) { ev.preventDefault(); focusItem(items[items.length - 1]); } }
    else if (ev.key === 'Enter' && isOpen()) {
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
  hint.style.cssText = 'position:fixed;z-index:9;left:0;bottom:0;display:flex;gap:.6rem;align-items:center;' +
    'max-width:min(92vw,30rem);padding:.4rem .7rem;border:1px solid ' + tok('--line', '#E4DFD3') + ';' +
    'border-radius:2px;background:' + tok('--paper', '#FAF9F5') + ';color:' + tok('--muted', '#6E6A5E') + ';' +
    'font:14px/1.5 ' + tok('--sans', 'system-ui,sans-serif');
  const say = document.createElement('span');
  say.textContent = LANG === 'en' ? 'You last read this site in Chinese.' : '你上次看的是中文版。';
  const go = document.createElement('a');
  go.textContent = LANG === 'en' ? 'Switch →' : '切过去 →';
  go.href = link.href;
  go.style.cssText = 'color:' + tok('--terra-ink', '#A8492A') + ';text-decoration:underline;white-space:nowrap';
  go.addEventListener('click', () => remember(saved));
  const off = document.createElement('button');
  off.type = 'button'; off.setAttribute('aria-label', LANG === 'en' ? 'Dismiss' : '关闭提示');
  off.textContent = '×';
  off.style.cssText = 'border:0;background:none;color:inherit;font:16px/1 sans-serif;cursor:pointer;' +
    'min-width:24px;min-height:24px;display:inline-flex;align-items:center;justify-content:center';
  off.addEventListener('click', () => hint.remove());
  hint.appendChild(say); hint.appendChild(go); hint.appendChild(off);
  document.body.appendChild(hint);
  requestAnimationFrame(() => {
    const r = btn.getBoundingClientRect();
    const w = hint.offsetWidth || 240;
    hint.style.left = clamp(r.left + w > window.innerWidth - 8 ? window.innerWidth - w - 8 : r.left, 8, window.innerWidth - w - 8) + 'px';
    hint.style.top = (r.bottom + 6) + 'px';
    hint.style.bottom = 'auto';
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
