// Edit bilingual copy and layout in spec; run: node docs/architecture/render.mjs
const spec = {
  "title": [
    "个人展示网站 · 从访问到交互",
    "Personal website · From request to interaction"
  ],
  "subtitle": [
    "静态页面为基础，按需增强；每条分支对应一次真实的浏览行为。",
    "Static pages, enhanced on demand. Follow each branch through a browsing action."
  ],
  "height": 1220,
  "nodes": [
    [
      "entry",
      600,
      215,
      "访问 xxc2007.me",
      "Visit xxc2007.me"
    ],
    [
      "html",
      600,
      350,
      "选择中文 / 或英文 /en/\n独立 HTML 与 SEO，共享 CSS / JS",
      "Choose Chinese / or English /en/\nSeparate HTML and SEO; shared CSS / JS"
    ],
    [
      "base",
      600,
      485,
      "先呈现正文、导航与作品入口\n浏览器加载 main.js，渐进增强",
      "Show text, navigation and project links\nLoad main.js for progressive enhancement"
    ],
    [
      "earth",
      220,
      665,
      "进入首屏地球\n动态导入 scene.js 与本地 Three.js",
      "Enter the Earth section\nImport scene.js and local Three.js"
    ],
    [
      "process",
      600,
      665,
      "滚动接近制作过程\n动态导入 process-scene.js",
      "Scroll near the process section\nImport process-scene.js"
    ],
    [
      "film",
      980,
      665,
      "点击宣传片\n设置 video.src，请求当前语言影片",
      "Activate the film\nSet video.src for the current language"
    ],
    [
      "gpu",
      220,
      830,
      "WebGL 可用？",
      "WebGL available?",
      "decision"
    ],
    [
      "scene",
      600,
      830,
      "滚动进度驱动分镜\n共用页面动画调度",
      "Scroll progress drives the scenes\nUse the page animation scheduler"
    ],
    [
      "play",
      980,
      830,
      "对话框内播放\n关闭后暂停并释放影片资源",
      "Play inside the dialog\nPause and release media on close"
    ],
    [
      "drag",
      220,
      1020,
      "支持拖动、键盘与连续翻转\n离屏时暂停绘制",
      "Drag, use keys and tumble freely\nPause drawing when off screen",
      "result"
    ],
    [
      "fallback",
      600,
      1020,
      "图形不可用时保留后备内容\n正文与作品链接仍可阅读",
      "Retain fallback content if graphics fail\nText and project links remain readable",
      "guard"
    ],
    [
      "mediafail",
      980,
      1020,
      "加载失败显示下载入口\n不支持对话框时走原影片链接",
      "Offer a download link on media failure\nUse the film link without dialog support",
      "guard"
    ]
  ],
  "edges": [
    [
      "entry",
      "html"
    ],
    [
      "html",
      "base"
    ],
    [
      "base",
      "earth",
      "地球",
      "Earth"
    ],
    [
      "base",
      "process",
      "制作过程",
      "Process"
    ],
    [
      "base",
      "film",
      "宣传片",
      "Film"
    ],
    [
      "earth",
      "gpu"
    ],
    [
      "gpu",
      "drag",
      "是",
      "Yes"
    ],
    [
      "gpu",
      "fallback",
      "否 / 加载失败",
      "No / load failure"
    ],
    [
      "process",
      "scene"
    ],
    [
      "scene",
      "fallback",
      "不可用",
      "Unavailable"
    ],
    [
      "film",
      "play"
    ],
    [
      "play",
      "mediafail",
      "失败 / 后备路径",
      "Failure / fallback"
    ]
  ],
  "notes": [],
  "sources": [
    "assets/js/main.js",
    "assets/js/scene.js",
    "assets/js/process-scene.js",
    "index.html",
    "en/index.html"
  ],
  "intro": [
    "从一次访问开始，图中分别展开地球、制作分镜和影片的加载路径，以及图形或媒体不可用时的处理。灰色表示处理步骤，菱形表示判断，绿色表示可见结果，橙色表示后备路径或约束。",
    "Starting with a visit, the diagram follows Earth rendering, process scenes and film loading, including graphics and media fallbacks. Grey boxes are processing steps, diamonds are decisions, green boxes are visible results, and amber boxes mark fallbacks or constraints."
  ],
  "anchor": [
    "## 技术实现",
    "## Implementation"
  ]
};


import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const directory = path.dirname(fileURLToPath(import.meta.url));
const escape = s => String(s).replace(/[&<>\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const height = n => n[5] === 'decision' ? (n[3].includes('\n') || n[4].includes('\n') ? 156 : 104) : 86;
const units = line => Array.from(line).reduce((sum,c)=>sum+(/[^\u0000-\u00ff]/.test(c)?1:.56),0);
for (let lang=0; lang<2; lang++) {
 const language=lang?'en':'zh', elements=[], labels=[];
 const text=(x,y,lines,size=20,weight=400,anchor='middle',fill='#252a2e',attrs='')=>{
   const rows=String(lines).split('\n');
   elements.push('<text '+attrs+' x="'+x+'" y="'+y+'" text-anchor="'+anchor+'" font-size="'+size+'" font-weight="'+weight+'" fill="'+fill+'">'+rows.map((s,i)=>'<tspan x="'+x+'" dy="'+(i?27:0)+'">'+escape(s)+'</tspan>').join('')+'</text>');
 };
 const nodes=new Map(spec.nodes.map(n=>[n[0],n]));
 const colors={result:['#edf6ee','#267349'],guard:['#fff5e9','#aa681f'],decision:['#ffffff','#68737b']};
 for (const [from,to,zh,en,kind] of spec.edges) {
  const a=nodes.get(from),b=nodes.get(to); let d,lx,ly,anchor='middle';
  const fork=['base','shared','pub'].includes(from);
  if(kind==='side') {
   d='M '+(a[1]+165)+' '+a[2]+' H '+(b[1]-165);lx=(a[1]+b[1])/2;ly=a[2]-height(a)/2-16;
  } else if(kind==='gutter') {
   d='M '+(a[1]-165)+' '+a[2]+' H 790 V '+(b[2]-90)+' H '+b[1]+' V '+(b[2]-height(b)/2);lx=774;ly=1065;anchor='end';
  } else if(kind==='outer') {
   const x=1182; d='M '+(a[1]+165)+' '+a[2]+' H '+x+' V '+b[2]+' H '+(b[1]+165);lx=x-16;ly=1080;anchor='end';
  } else {
   const y1=a[2]+height(a)/2,y2=b[2]-height(b)/2,mid=(y1+y2)/2;
   d='M '+a[1]+' '+y1+' V '+mid+' H '+b[1]+' V '+y2;
   lx=fork?b[1]:a[1]===b[1]?a[1]+18:(a[1]+b[1])/2;ly=mid-12;
   if(a[1]===b[1]){anchor='start';if(fork)lx=b[1]+18;else if(y2-y1<60)ly=mid+5;}
   // This horizontal label shares a gutter with the read path; keep it entirely to its left.
   if(from==='moderate' && to==='readwall'){lx=768;anchor='end';}
  }
  elements.push('<path data-edge="'+from+'-'+to+'" d="'+d+'" fill="none" stroke="#4e585f" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" marker-end="url(#arrow)"/>');
  if(zh)labels.push({from,to,x:lx,y:ly,copy:lang?en:zh,anchor});
 }
 elements.push('<circle cx="600" cy="146" r="7" fill="#252a2e"/><path d="M 600 153 V 172" stroke="#4e585f" stroke-width="1.7" marker-end="url(#arrow)"/>');
 for (const n of spec.nodes) {
   const [id,x,y,zh,en,type]=n,[fill,stroke]=colors[type]||['#f4f5f6','#899198'],half=height(n)/2;
   elements.push('<g data-node="'+id+'" data-kind="'+(type||'process')+'" data-cx="'+x+'" data-cy="'+y+'" data-half-height="'+half+'">');
   if(type==='decision')elements.push('<path d="M '+x+' '+(y-half)+' L '+(x+165)+' '+y+' L '+x+' '+(y+half)+' L '+(x-165)+' '+y+' Z" fill="'+fill+'" stroke="'+stroke+'" stroke-width="1.7"/>');
   else elements.push('<rect x="'+(x-165)+'" y="'+(y-half)+'" width="330" height="'+height(n)+'" rx="7" fill="'+fill+'" stroke="'+stroke+'" stroke-width="'+(type?2:1.5)+'"/>');
   const copy=lang?en:zh,lines=copy.split('\n');
   let size=lang?17:20;
   // Fit every line to the available diamond width at its top AND bottom, with padding.
   // A rectangle-width check alone misses text touching the diagonal border.
   for(;size>10;size-=.25){
    const fits=lines.every((line,i)=>{
     const baseline=(i-(lines.length-1)/2)*27+size*.32;
     const edge=Math.max(Math.abs(baseline-size*.9),Math.abs(baseline+size*.3));
     const available=type==='decision'?330*(1-edge/half)-28:300;
     return units(line)*size<=available;
    });
    if(fits)break;
   }
   text(x,y-(lines.length-1)*13.5+size*.32,copy,size,type==='decision'?500:400,'middle','#252a2e','data-node-label="'+id+'"');
   elements.push('</g>');
 }
 // Labels are placed in clear gutters with explicit anchors; no line runs through their text.
 for(const label of labels)text(label.x,label.y,label.copy,16,400,label.anchor,'#252a2e','data-edge-label="'+label.from+'-'+label.to+'"');
 for(const [id,zh,en] of spec.notes||[]) { const n=nodes.get(id);text(600,n[2]-64,lang?en:zh,16,400,'middle','#626c74'); }
 text(600,45,spec.title[lang],30,600);
 text(600,82,spec.subtitle[lang],18,400,'middle','#59646c');
 const legend=lang?['Process','Decision','Visible result','Guard / fallback']:['处理步骤','条件判断','可见结果','约束 / 后备路径'];
 for(let i=0;i<4;i++){
  const x=190+i*245,[fill,stroke]=i===2?colors.result:i===3?colors.guard:['#f4f5f6','#899198'];
  if(i===1)elements.push('<path d="M '+x+' 102 l 13 11 l -13 11 l -13 -11 Z" fill="white" stroke="'+stroke+'"/>');
  else elements.push('<rect x="'+(x-13)+'" y="103" width="26" height="21" rx="3" fill="'+fill+'" stroke="'+stroke+'"/>');
  text(x+23,119,legend[i],16,400,'start','#59646c');
 }
 // The Chinese editions omit the bottom annotations requested for removal.
 const outputHeight=lang?spec.height:Math.max(...spec.nodes.map(n=>n[2]+height(n)/2))+55;
 if(lang){
  text(600,outputHeight-67,spec.foot?.[1]||'Logical flow based on repository source. Each website has its own release boundary.',16,400,'middle','#626c74');
  text(600,outputHeight-35,'Documentation illustration · 22 October 2026 · SVG, editable text and paths',15,400,'middle','#78838b');
 }
 const svg='<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="'+outputHeight+'" viewBox="0 0 1200 '+outputHeight+'" role="img" aria-labelledby="title description" xml:lang="'+language+'"><title id="title">'+escape(spec.title[lang])+'</title><desc id="description">'+escape(spec.intro[lang])+'</desc><defs><marker id="arrow" markerWidth="9" markerHeight="7" refX="8" refY="3.5" orient="auto"><path d="M 0 0 L 9 3.5 L 0 7 L 2 3.5 Z" fill="#4e585f"/></marker></defs><rect width="1200" height="'+outputHeight+'" fill="#ffffff"/><g font-family="Segoe UI, Microsoft YaHei, Noto Sans CJK SC, Arial, sans-serif">'+elements.join('')+'</g></svg>\n';
 fs.writeFileSync(path.join(directory,'flow.'+language+'.svg'),svg);
 console.log('Rendered flow.'+language+'.svg');
}
