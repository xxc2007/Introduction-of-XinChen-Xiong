/**
 * scene.js — 首屏「纸上的纸屑」粒子场（Three.js r0.180.0，仓库内 vendor，无 CDN／无 examples 附加件）
 *
 * 两条不太显然的约束，改动前请先读：
 *
 * 1) 不用任何贴图文件。每粒纸屑都是一个「软圆盘」，由片元着色器里 gl_PointCoord 到圆心的
 *    距离做 smoothstep 衰减现算，size／alpha／闪烁相位全部走 per-point attribute。
 *    原因：本仓库禁止外部资源与 addons，贴图等于多一次网络请求和一个失效路径；
 *    而纸屑的形状只需要一个圆，用代码算比用位图更省，也不会因 DPR 变化而糊。
 *
 * 2) hero 整段划出视口时彻底停掉 RAF（IntersectionObserver 关掉循环，不是降频）。
 *    原因：粒子场滚出屏幕后一帧都不该再画——继续跑就是在白白上传 attribute、占 GPU、
 *    跟下方真正要动的内容抢主线程。这是本文件唯一的、也是硬性的性能护栏；
 *    配合 DPR 上限、分层数量上限和「60 帧均值 > 22ms 就减半」的单向降级一起用。
 */

import * as THREE from "../vendor/three.module.min.js";

/* 调色板取自 docs/build-contract.md §1，直接写 sRGB 0..1：
   自定义着色器不含 colorspace 分块，数值原样落到画布，与 CSS 变量逐位对齐。 */
const C_INK = [0x1f / 255, 0x1e / 255, 0x1d / 255];
const C_PAPER = [0xfa / 255, 0xf9 / 255, 0xf5 / 255];
const C_TERRA = [0xd9 / 255, 0x77 / 255, 0x57 / 255];
const C_LINE = 0xe4dfd3;

const DPR_CAP = 1.75;
const POINTER_MAX = 0.35; /* 指针视差的最大相机位移（世界单位） */
const FIELD_W = 12.5, FIELD_H = 7.4;
const BASE_Z = 6.6, DOLLY_Z = 1.9;
const TAU = Math.PI * 2;

export function prefersReducedMotion() {
  try {
    return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  } catch (e) {
    return false;
  }
}

/* ---------- 确定性伪随机：哈希值噪声，渲染期绝不用 Math.random ---------- */
function hash2(x, y, seed) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(seed | 0, 1274126177);
  h = Math.imul(h ^ (h >>> 15), 2246822519);
  h ^= h >>> 13;
  h = Math.imul(h, 3266489917);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
function valueNoise(x, y, seed) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi, seed), b = hash2(xi + 1, yi, seed);
  const c = hash2(xi, yi + 1, seed), d = hash2(xi + 1, yi + 1, seed);
  return a + (b - a) * u + (c - a + (a - b - c + d) * u) * v;
}
function fbm(x, y, seed, oct) {
  let s = 0, amp = 1, fr = 1, norm = 0;
  for (let i = 0; i < oct; i++) {
    s += amp * valueNoise(x * fr, y * fr, seed + i * 131);
    norm += amp; amp *= 0.5; fr *= 2;
  }
  return s / norm;
}

/* ---------- 纸屑云：一次性算好，之后只动 uniform ---------- */
function buildMotes(count, seed) {
  const pos = new Float32Array(count * 3);
  const siz = new Float32Array(count);
  const pha = new Float32Array(count);
  const alp = new Float32Array(count);
  const col = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const r1 = hash2(i, 0x11, seed), r2 = hash2(i, 0x2f, seed ^ 0x5a3);
    const r3 = hash2(i, 0x7b, seed ^ 0x1f7), r4 = hash2(i, 0x9d, seed ^ 0x77c);
    const r5 = hash2(i, 0xc4, seed ^ 0x2b9), r6 = hash2(i, 0xe8, seed ^ 0x911);
    const i3 = i * 3;
    pos[i3] = (r1 - 0.5) * FIELD_W;
    pos[i3 + 1] = (r2 - 0.5) * FIELD_H;
    pos[i3 + 2] = (r3 - 0.5) * 1.7;
    siz[i] = 1.6 + r4 * r4 * 4.2;
    pha[i] = r5 * TAU;
    /* 约 8% 赤陶，其余 92% 落在墨色与纸色之间；墨色刻意压到很低的 alpha */
    if (r6 < 0.08) {
      col[i3] = C_TERRA[0]; col[i3 + 1] = C_TERRA[1]; col[i3 + 2] = C_TERRA[2];
      alp[i] = 0.22 + r3 * 0.30;
    } else if (r6 < 0.52) {
      col[i3] = C_INK[0]; col[i3 + 1] = C_INK[1]; col[i3 + 2] = C_INK[2];
      alp[i] = 0.045 + r4 * 0.075;
    } else {
      col[i3] = C_PAPER[0]; col[i3 + 1] = C_PAPER[1]; col[i3 + 2] = C_PAPER[2];
      alp[i] = 0.10 + r4 * 0.30;
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("aSize", new THREE.BufferAttribute(siz, 1));
  g.setAttribute("aPhase", new THREE.BufferAttribute(pha, 1));
  g.setAttribute("aAlpha", new THREE.BufferAttribute(alp, 1));
  g.setAttribute("aColor", new THREE.BufferAttribute(col, 3));
  return g;
}

const VERT = [
  "attribute float aSize;",
  "attribute float aPhase;",
  "attribute float aAlpha;",
  "attribute vec3 aColor;",
  "uniform float uTime, uEnergy, uFade, uDpr;",
  "varying float vA;",
  "varying vec3 vC;",
  "void main(){",
  "  vec3 p = position;",
  "  float sp = 0.04 + 0.08 * uEnergy;",           /* 漂移速度：setEnergy 只轻微提速 */
  "  p.x += sin(uTime * sp * 3.1 + aPhase) * 0.34;",
  "  p.y += cos(uTime * sp * 2.4 + aPhase * 1.7) * 0.28;",
  "  p.x += sin(uTime * 0.05 + p.y * 0.12) * 0.22;",
  "  vec4 mv = modelViewMatrix * vec4(p, 1.0);",
  "  gl_Position = projectionMatrix * mv;",
  "  float tw = 0.66 + 0.34 * sin(uTime * 0.85 + aPhase * 6.2831);",
  "  vA = aAlpha * tw * uFade * (0.74 + 0.34 * uEnergy);",
  "  vC = aColor;",
  "  gl_PointSize = aSize * uDpr * (6.5 / max(-mv.z, 0.001));",
  "}"
].join("\n");

/* 无贴图：圆内 smoothstep 衰减，靠边归零；输出预乘 alpha 以匹配 premultipliedAlpha */
const FRAG = [
  "varying float vA;",
  "varying vec3 vC;",
  "void main(){",
  "  vec2 d = gl_PointCoord - vec2(0.5);",
  "  float r2 = dot(d, d);",
  "  if (r2 > 0.25) discard;",
  "  float f = smoothstep(0.25, 0.0, r2);",
  "  float a = f * f * vA;",
  "  gl_FragColor = vec4(vC * a, a);",
  "}"
].join("\n");

/* ---------- 发丝等高线：嵌套环，环半径由种子噪声沿圆周采样 ---------- */
function buildContours(seed) {
  const rings = 10, steps = 96;
  const pts = new Float32Array(rings * steps * 2 * 3);
  let w = 0;
  for (let k = 0; k < rings; k++) {
    const base = 0.9 + k * 0.5;
    const ox = k * 3.7 + seed * 0.011, oy = k * 1.9 + seed * 0.017;
    for (let s = 0; s < steps; s++) {
      for (let e = 0; e < 2; e++) {
        const th = ((s + e) / steps) * TAU;
        /* 在噪声空间里沿圆采样 ⇒ 对 theta 天然闭合，环与环不同形 */
        const nx = Math.cos(th) * 1.25 + ox, ny = Math.sin(th) * 1.25 + oy;
        const rr = base * (1 + 0.17 * (fbm(nx, ny, seed + k * 17, 3) - 0.5) * 2);
        pts[w++] = Math.cos(th) * rr * 1.6;
        pts[w++] = Math.sin(th) * rr * 0.95;
        pts[w++] = -1.2 - k * 0.03;
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pts.subarray(0, w), 3));
  return g;
}

function tierCount(opts) {
  const mm = (q) => { try { return !!(window.matchMedia && window.matchMedia(q).matches); } catch (e) { return false; } };
  const wide = window.innerWidth || 1280;
  let cap = mm("(pointer:coarse)") || wide < 768 ? 400 : wide < 1200 ? 700 : 1200;
  const want = typeof opts.count === "number" && opts.count > 0 ? opts.count : cap;
  return Math.max(64, Math.min(want, cap));
}

export function initField(canvas, opts = {}) {
  if (!canvas || typeof canvas.getContext !== "function") throw new Error("no-webgl");

  /* WebGL 探测必须在建任何状态之前：r0.180 的 WebGLRenderer 只要 "webgl2" */
  let probe = null;
  try {
    probe = canvas.getContext("webgl2", {
      alpha: true, depth: true, stencil: false, antialias: false,
      premultipliedAlpha: true, powerPreference: "high-performance"
    });
  } catch (e) { probe = null; }
  if (!probe) throw new Error("no-webgl");

  const host = canvas.parentElement || canvas;
  const seed = (typeof opts.seed === "number" ? opts.seed : 0x9e3779b9) | 0;
  const reduced = typeof opts.reducedMotion === "boolean" ? opts.reducedMotion : prefersReducedMotion();
  const dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);
  const count = tierCount(opts);

  let renderer;
  try {
    /* 把探测到的那份上下文直接交给 Three 复用。同一个 canvas 同一种类型只会有一份上下文，
       早先这里重传一遍属性其实是死配置（后一次 getContext 返回既有对象、属性被忽略）。 */
    renderer = new THREE.WebGLRenderer({
      canvas, context: probe, alpha: true, antialias: false, premultipliedAlpha: true
    });
  } catch (e) {
    /* 构造失败一定要把探测到的上下文放掉：teardown() 只是被 return 出去、这里走不到，
       那个 GPU 槽位会一直占到页面卸载为止。 */
    try { const lo = probe && probe.getExtension("WEBGL_lose_context"); if (lo) lo.loseContext(); } catch (_) { }
    throw new Error("no-webgl");
  }
  renderer.setPixelRatio(dpr);
  renderer.setClearColor(0x000000, 0); /* 透明清屏，让 CSS 的 cream 透上来 */

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 60);
  camera.position.set(0, 0, BASE_Z);

  const uni = {
    uTime: { value: 0 },
    /* 与 main.js 的 FIELD_BASE 同值；调用方现在直接把 opts 传进来，不再两边各写一遍字面量。
       这条路径上 NaN/Infinity 会一路进 uniform，着色器算出 NaN 之后整片点就消失了，
       所以这里要像 setEnergy 那样先验后夹。 */
    uEnergy: { value: (typeof opts.energy === "number" && isFinite(opts.energy)) ? Math.min(1, Math.max(0, opts.energy)) : 0.34 },
    uFade: { value: 1 },
    uDpr: { value: dpr }
  };
  const mat = new THREE.ShaderMaterial({
    uniforms: uni, vertexShader: VERT, fragmentShader: FRAG,
    transparent: true, depthWrite: false, blending: THREE.NormalBlending
  });
  const motes = buildMotes(count, seed);
  const points = new THREE.Points(motes, mat);

  const lines = new THREE.LineSegments(
    buildContours(seed),
    new THREE.LineBasicMaterial({ color: C_LINE, transparent: true, opacity: 0.42, depthWrite: false })
  );
  scene.add(lines);
  scene.add(points);

  let raf = 0, destroyed = false, running = false, inView = true;
  let hidden = !!(typeof document !== "undefined" && document.hidden);
  let last = 0, t = 0, progress = 0;
  let px = 0, py = 0, tx = 0, ty = 0, parallax = false;
  let warm = 0, acc = 0, sampled = 0, degraded = false;
  let resizeTimer = 0;

  try {
    const mq = window.matchMedia("(hover:hover) and (pointer:fine)");
    parallax = !!mq.matches;
  } catch (e) { parallax = false; }

  function applySize() {
    resizeTimer = 0;
    if (destroyed) return;
    const w = host.clientWidth || canvas.clientWidth || 1;
    const h = host.clientHeight || canvas.clientHeight || 1;
    /* DPR 可能在换屏/缩放时改变，这里重读一次，否则像素比与 gl_PointSize 会失真 */
    const dprNow = Math.min(window.devicePixelRatio || 1, DPR_CAP);
    if (dprNow !== uni.uDpr.value) {
      uni.uDpr.value = dprNow;
      renderer.setPixelRatio(dprNow);
    }
    renderer.setSize(w, h, false); /* false：不覆盖 CSS 里 inset:0 的尺寸 */
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    /* 减弱动效下这一帧就是画面全部：改了尺寸必须重画，否则那张静止图会被拉伸到页面结束。
       这是补 setEnergy 不再在 reduced 下 render 之后留下的洞——那条改动是对的，
       但它把这个文件里唯一会执行的重绘路径也一起拿掉了。 */
    if (reduced) renderer.render(scene, camera);
  }

  /* 滚动进度用 section 的 rect，一次 getBoundingClientRect，不逐帧查询 */
  function readProgress() {
    const r = host.getBoundingClientRect();
    const h = r.height || 1;
    const p = Math.min(1, Math.max(0, -r.top / h));
    progress = p;
    return p;
  }

  const onPointer = (ev) => {
    const cx = ev.clientX / (window.innerWidth || 1) - 0.5;
    const cy = ev.clientY / (window.innerHeight || 1) - 0.5;
    tx = cx * 2 * POINTER_MAX;
    ty = -cy * 2 * POINTER_MAX * 0.72;
  };
  const onScroll = () => { readProgress(); };
  const onVis = () => { hidden = !!document.hidden; if (!reduced) sync(); };

  let io = null, ro = null;
  /* 两个观察器分别兜底：若 ResizeObserver 缺失时把 io 一起置 null，
     已在跑的 IntersectionObserver 就再也拿不到句柄、destroy 时无法断开 */
  try {
    io = new IntersectionObserver((es) => {
      inView = es.length ? es[es.length - 1].isIntersecting : true;
      if (!reduced) sync();
    }, { threshold: 0 });
    io.observe(host);
  } catch (e) { io = null; }
  let roSeen = false;
  /* ResizeObserver 缺席时的兜底。必须是有名字的处理函数：
     写成匿名箭头就结构上不可能在 teardown 里摘掉，
     那等于把整张场景图和一个已 dispose 的 renderer 泄漏在 window 上。 */
  const onWinResize = () => {
    if (destroyed || resizeTimer) return;
    resizeTimer = setTimeout(applySize, 120);
  };
  try {
    ro = new ResizeObserver(() => {
      if (destroyed || resizeTimer) return;
      /* 按规范 ResizeObserver 必定先回调一次、报的就是当前尺寸，而那份启动时已经
         applySize 过了。不跳过，减弱动效下启动会连画三帧，和文件头承诺的「只出一帧」不符。 */
      if (!roSeen) { roSeen = true; return; }
      resizeTimer = setTimeout(applySize, 120); /* 合并连续 resize，绝不逐帧 setSize */
    });
    ro.observe(host);
  } catch (e) { ro = null; }
  /* ResizeObserver 缺席时（ro === null）原来没有任何东西会重算尺寸：
     换外接屏、改窗口缩放、横竖屏切换都会让画布停在旧尺寸上，
     而 reduced 模式下那更是永久停在一张拉伸的静止帧。 */
  if (!ro) window.addEventListener("resize", onWinResize, { passive: true });

  function frame(now) {
    raf = requestAnimationFrame(frame);
    /* now 可能早于 start() 里取的 performance.now()（rAF 的时间戳是帧起始时刻），
       那样 dt 为负、uTime 会往回跳一步，降级采样器也会把负值累进均值里。夹到 0。 */
    const dt = Math.max(0, Math.min(0.05, (now - last) / 1000)) || 0;
    last = now;
    t += dt;

    /* 单向降级：跳过热身 10 帧，取 60 帧均值，超 22ms 只减一次 */
    if (!degraded) {
      if (warm < 10) warm++;
      else { acc += dt * 1000; if (++sampled >= 60) { if (acc / sampled > 22) { motes.setDrawRange(0, count >> 1); degraded = true; } else { acc = 0; sampled = 0; } } }
    }

    uni.uTime.value = t;
    const fade = 1 - progress * progress * (3 - 2 * progress);
    uni.uFade.value = fade * fade;

    if (parallax) { px += (tx - px) * 0.055; py += (ty - py) * 0.055; }
    camera.position.x = px;
    camera.position.y = py;
    camera.position.z = BASE_Z + progress * DOLLY_Z;
    camera.lookAt(0, 0, 0);

    lines.rotation.z += dt * 0.0055; /* 极慢：约 19 分钟一圈 */
    lines.material.opacity = 0.42 * (0.25 + 0.75 * uni.uFade.value);
    renderer.render(scene, camera);
  }

  function start() { if (running || destroyed) return; running = true; last = performance.now(); raf = requestAnimationFrame(frame); }
  function stop() { if (!running) return; running = false; if (raf) cancelAnimationFrame(raf); raf = 0; }
  function sync() { if (destroyed || reduced) return; (inView && !hidden) ? start() : stop(); }

  readProgress();
  applySize();
  if (reduced) {
    renderer.render(scene, camera); /* 降级：只出一帧，永不启动 RAF */
  } else {
    window.addEventListener("scroll", onScroll, { passive: true });
    if (parallax) window.addEventListener("pointermove", onPointer, { passive: true });
    document.addEventListener("visibilitychange", onVis);
    sync();
  }

  function onContextLost() {
    /* 这里刻意不调 ev.preventDefault()。
       preventDefault 是向浏览器申请「稍后给我一次 webglcontextrestored」，
       可我们紧接着就 teardown() 把两份几何体、两份材质和 renderer 全释放了，
       也没有任何 webglcontextrestored 处理器——申请一次永远兑现不了的恢复，
       等于让驱动重置之后的首屏永久停在一张不会再画的画布上。
       现在直接放弃这块画布，CSS 的 data-field="lost" 静态底纹接管。 */
    if (host && host.dataset) host.dataset.field = "lost";
    teardown();
  }
  canvas.addEventListener("webglcontextlost", onContextLost, false);

  function teardown() {
    if (destroyed) return;
    destroyed = true;
    stop();
    canvas.removeEventListener("webglcontextlost", onContextLost, false);
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("pointermove", onPointer);
    document.removeEventListener("visibilitychange", onVis);
    // 兜底那条 resize 监听是绑在 window 上的，teardown 不摘掉它就永远不会回收
    window.removeEventListener("resize", onWinResize);
    if (resizeTimer) { clearTimeout(resizeTimer); resizeTimer = 0; }
    if (io) { io.disconnect(); io = null; }
    if (ro) { ro.disconnect(); ro = null; }
    motes.dispose();
    lines.geometry.dispose();
    mat.dispose();
    lines.material.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
  }

  return {
    destroy: teardown,
    setEnergy(v) {
      if (destroyed || reduced) return;
      /* 减弱动效下这一帧就是最终态：文件头承诺「只出一帧、永不启动 RAF」，
         所以外部再怎么改场强都不该在这里重新 render——
         早先这里是 if (reduced) renderer.render(...)，
         于是 main.js 每次滚动缓动都会让静态画面重画一次，等于把承诺从后门漏掉了。 */
      const v2 = Math.min(1, Math.max(0, typeof v === "number" && isFinite(v) ? v : 0));
      uni.uEnergy.value = v2;
    }
  };
}
