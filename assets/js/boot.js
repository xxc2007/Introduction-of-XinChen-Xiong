/* xxc2007.me · 启动分流：http(s) 注入模块主脚本，file:// 兜底语言切换器
   两页各留一个经典脚本入口（本文件）。为什么不用 <script type="module"> 直挂 main.js：
   file:// 直开时 Chromium 把模块脚本一律按 origin 'null' 强制 CORS——外链标签、动态 import()
   全部被拦，整个模块图（main.js → scene.js / process-scene.js → three.vendor）一张都取不回，
   而脚本引擎又是开着的，html.no-js 与 @media(scripting:none) 两套降级都不成立，页面成了死区。
   经典脚本不受这道 CORS 管制，file:// 下照常执行，所以入口必须是经典脚本。 */
(function (doc) {

  /* ---------- http(s)：注入模块主脚本，时序与原先的模块标签等价 ---------- */
  if (/^https?:$/.test(location.protocol)) {
    /* 模块地址放在 data-module 里按页面解析（en 页带 ../ 前缀），?v= 指纹随值带走，
       main.js 里 import.meta.url 的取指纹逻辑因此原样可用。 */
    const mod = doc.currentScript && doc.currentScript.getAttribute('data-module');
    if (!mod) return;
    const s = doc.createElement('script');
    s.type = 'module';
    /* async=false 把它送进「按序执行」队列：仍在 DOMContentLoaded 之前跑，
       与原先静态模块标签的时序一致（main.js 顶层没有任何 DCL 钩子）。 */
    s.async = false;
    s.src = mod;
    (doc.body || doc.head).appendChild(s);
    return;
  }

  /* ---------- file://：只接管语言切换器 ---------- */
  /* 复刻 main.js 的 langMenu 段（行为逐行对齐，差异仅两处：省略 permitsHints/resourceHint
     的 prefetch——那是 http 的网络优化，file:// 没有语义；文件头注释说明的加载方式）。
     交互逻辑一旦改动，必须与 main.js 同步两处，否则 http 与 file 的切换器行为会分叉。
     其余渐进增强（揭示、进度条、移动端菜单、影片弹层等）在 file:// 下保持无脚本静态态：
     .portfolio 的 .reveal 静止态本就是可见的，页面照常读，这是取舍不是缺陷。 */
  doc.documentElement.classList.replace('no-js', 'js');
  const $ = (s, r) => (r || doc).querySelector(s);
  const $$ = (s, r) => Array.prototype.slice.call((r || doc).querySelectorAll(s));
  const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
  const LANG = ((doc.documentElement.lang || 'zh').toLowerCase().indexOf('en') === 0) ? 'en' : 'zh';

  (function langMenu() {
    /* 只认这一种结构：.lang > button[aria-haspopup] + ul[role=menu]，两页都是这么写的。
       结构对不上就整块不启用（渐进增强，不是失败）。 */
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
        /* 焦点还在触发按钮上时 indexOf 是 -1：此时 ArrowDown 落第一项、ArrowUp 落最后一项 */
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

    /* 关闭只由「焦点离开整个控件」触发，Tab 穿进菜单不会被中途藏掉（WCAG 2.4.3 / 2.4.7）。 */
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

    /* 记住的是「访客主动切过一次语言」这个事实；下次进店只提示、不代跳。 */
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
    /* 插在语言控件之后：横幅画在页面顶部，排最后会让键盘用户 Tab 完整张页才够到它 */
    if (wrap.insertAdjacentElement) wrap.insertAdjacentElement('afterend', hint);
    else document.body.appendChild(hint);
    requestAnimationFrame(() => {
      /* 纵向基准取整条 topbar 的下沿，不取语言按钮的下沿（窄屏导航折到第二行会压住横幅） */
      const bar = (wrap.closest('.topbar') || wrap).getBoundingClientRect();
      const r = btn.getBoundingClientRect();
      const w = hint.offsetWidth || 240;
      hint.style.left = clamp(r.left + w > window.innerWidth - 8 ? window.innerWidth - w - 8 : r.left, 8, window.innerWidth - w - 8) + 'px';
      hint.style.top = (bar.bottom + 6) + 'px';
    });
  })();

})(document);
