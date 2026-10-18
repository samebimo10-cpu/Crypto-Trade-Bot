/* =====================================================================
   UTILITIES
   ===================================================================== */
const U = {
  limit:(v,a,b)=>Math.max(a,Math.min(b,v)),
  interp:(a,b,t)=>a+(b-a)*t,
  easeIn:(a,b,t)=>a+(b-a)*t*t,
  easeInOut:(a,b,t)=>a+(b-a)*((-Math.cos(t*Math.PI)/2)+.5),
  pctRem:(n,total)=>(n%total)/total,
  accel:(v,a,dt)=>v+a*dt,
  increase(start,inc,max){let r=start+inc; while(r>=max) r-=max; while(r<0) r+=max; return r;},
  overlap(x1,w1,x2,w2,p=1){const h=p/2; return !((x1+w1*h)<(x2-w2*h)||(x1-w1*h)>(x2+w2*h));},
  fog:(d,den)=>1/Math.pow(Math.E,d*d*den)
};
function rng(seed){let s=(seed>>>0)||1; return ()=>{s^=s<<13; s>>>=0; s^=s>>>17; s^=s<<5; s>>>=0; return s/4294967296;};}
const pick=(R,a)=>a[Math.floor(R()*a.length)];
function hex(c){c=c.replace('#',''); if(c.length===3)c=c.split('').map(x=>x+x).join(''); const n=parseInt(c,16); return [n>>16&255,n>>8&255,n&255];}
function mix(a,b,t){const A=hex(a),B=hex(b); return '#'+A.map((v,i)=>Math.round(v+(B[i]-v)*t).toString(16).padStart(2,'0')).join('');}
function shade(c,t){return t>=0?mix(c,'#ffffff',t):mix(c,'#000000',-t);}
function rgba(c,a){const [r,g,b]=hex(c); return `rgba(${r},${g},${b},${a})`;}
function mk(w,h,fn){const c=document.createElement('canvas'); c.width=w; c.height=h; const g=c.getContext('2d'); fn(g,w,h); return c;}
function rr(g,x,y,w,h,r){r=Math.min(r,w/2,h/2); g.beginPath(); g.moveTo(x+r,y); g.arcTo(x+w,y,x+w,y+h,r); g.arcTo(x+w,y+h,x,y+h,r); g.arcTo(x,y+h,x,y,r); g.arcTo(x,y,x+w,y,r); g.closePath();}
function ell(g,x,y,rx,ry){g.beginPath(); g.ellipse(x,y,Math.max(.1,rx),Math.max(.1,ry),0,0,Math.PI*2);}
function lg(g,x0,y0,x1,y1,stops){const gr=g.createLinearGradient(x0,y0,x1,y1); stops.forEach(([o,c])=>gr.addColorStop(o,c)); return gr;}
function poly(g,pts,fill){g.beginPath(); g.moveTo(pts[0],pts[1]); for(let i=2;i<pts.length;i+=2) g.lineTo(pts[i],pts[i+1]); g.closePath(); if(fill){g.fillStyle=fill; g.fill();}}
function nightTint(g,w,h,a=.58){g.save(); g.globalCompositeOperation='source-atop'; g.fillStyle=`rgba(6,10,32,${a})`; g.fillRect(0,0,w,h); g.restore();}
const FD='"Big Shoulders Display","Arial Narrow","Roboto Condensed",Impact,sans-serif';
const FB='Spectral,Georgia,"Times New Roman",serif';
const reduceMotion = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

/* =====================================================================
   SPRITE ART — everything is painted procedurally, so no downloads
   ===================================================================== */
function leaf(g,x,y,a,len,droop,c1,c2){
  const ex=x+Math.cos(a)*len, ey=y+Math.sin(a)*len*.5+droop;
  const mx=x+Math.cos(a)*len*.5, my=y+Math.sin(a)*len*.5-len*.16;
  const nx=-Math.sin(a), ny=Math.cos(a), wd=len*.13;
  g.beginPath(); g.moveTo(x,y); g.quadraticCurveTo(mx+nx*wd,my+ny*wd,ex,ey); g.quadraticCurveTo(mx-nx*wd,my-ny*wd,x,y);
  g.fillStyle=lg(g,x,y,ex,ey,[[0,c2],[1,c1]]); g.fill();
  g.strokeStyle='rgba(15,40,15,.45)'; g.lineWidth=1.5;
  for(let t=.15;t<.95;t+=.08){ // leaflet cuts
    const px=(1-t)*(1-t)*x+2*(1-t)*t*mx+t*t*ex, py=(1-t)*(1-t)*y+2*(1-t)*t*my+t*t*ey;
    g.beginPath(); g.moveTo(px,py); g.lineTo(px+nx*wd*.9*(1-t*.6),py+ny*wd*.9*(1-t*.6)); g.stroke();
    g.beginPath(); g.moveTo(px,py); g.lineTo(px-nx*wd*.9*(1-t*.6),py-ny*wd*.9*(1-t*.6)); g.stroke();
  }
}
const ART = {
  palm(g,w,h,o){
    const R=o.r, lean=(R()-.5)*.35, bx=w/2, by=h-4, tx=w/2+lean*w, ty=h*.24, cx=w/2-lean*w*.5, cy=h*.62;
    const P=t=>[(1-t)*(1-t)*bx+2*(1-t)*t*cx+t*t*tx,(1-t)*(1-t)*by+2*(1-t)*t*cy+t*t*ty];
    const N=28;
    for(let i=0;i<N;i++){const t=i/N,[x1,y1]=P(t),[x2,y2]=P((i+1)/N);
      g.strokeStyle=i%2?'#76563a':'#8f6c4a'; g.lineWidth=(w*.08)*(1-t*.5); g.lineCap='butt';
      g.beginPath(); g.moveTo(x1,y1); g.lineTo(x2,y2+1); g.stroke();}
    const n=10;
    for(let k=0;k<n;k++){const a=-Math.PI/2+(k/(n-1)-.5)*Math.PI*1.95+(R()-.5)*.2;
      leaf(g,tx,ty,a,w*(.42+R()*.1),h*.09*(Math.abs(Math.cos(a))+.25),'#64ad4c','#2b6531');}
    g.fillStyle='#4a3220'; [[-.025,.02],[.02,.025],[0,.04]].forEach(([dx,dy])=>{ell(g,tx+dx*w,ty+dy*w,w*.028,w*.028); g.fill();});
  },
  pine(g,w,h,o){
    const c=o.c||'#2f5a3a';
    g.fillStyle='#4a3020'; g.fillRect(w*.46,h*.8,w*.08,h*.2);
    const tiers=7;
    for(let i=0;i<tiers;i++){const t=i/tiers, yb=h*.9-t*h*.76, half=w*(.48-t*.38), yt=yb-h*.24;
      g.beginPath(); g.moveTo(w/2,yt); g.quadraticCurveTo(w/2+half*.45,yb-h*.08,w/2+half,yb);
      for(let k=8;k>=-8;k--) g.lineTo(w/2+half*k/8,yb+(k%2?h*.012:-h*.012));
      g.quadraticCurveTo(w/2-half*.45,yb-h*.08,w/2,yt); g.closePath();
      g.fillStyle=lg(g,w/2-half,0,w/2+half,0,[[0,shade(c,-.4)],[.55,c],[1,shade(c,.15)]]); g.fill();}
  },
  poplar(g,w,h,o){
    const R=o.r; g.fillStyle='#4b3a2a'; g.fillRect(w*.47,h*.72,w*.06,h*.28);
    const cols=o.cols||['#c98a2e','#e0a845','#a8642a','#e8c25a','#8a7a2e'];
    for(let i=0;i<340;i++){const a=R()*Math.PI*2, d=Math.sqrt(R()); const x=w/2+Math.cos(a)*d*w*.36, y=h*.42+Math.sin(a)*d*h*.38;
      const side=(x-w/2)/(w*.36);
      g.fillStyle=shade(pick(R,cols),side*.18-(y>h*.6?.12:0)); ell(g,x,y,w*.055,w*.07); g.fill();}
  },
  baobab(g,w,h,o){
    const R=o.r;
    g.lineCap='round';
    const tops=[[.28,.18],[.4,.08],[.55,.1],[.7,.16],[.82,.28],[.15,.3]];
    tops.forEach(([x,y])=>{g.strokeStyle='#6d5d4f'; g.lineWidth=w*.03; g.beginPath(); g.moveTo(w*.5,h*.4); g.quadraticCurveTo(w*(x+.5)/2,h*.3,w*x,h*y); g.stroke();});
    tops.forEach(([x,y])=>{for(let i=0;i<7;i++){g.fillStyle=pick(R,['#5d7a3a','#4e6a32','#6f8a44']); ell(g,w*x+(R()-.5)*w*.1,h*y+(R()-.5)*h*.06,w*.05,h*.035); g.fill();}});
    g.beginPath(); g.moveTo(w*.33,h); g.bezierCurveTo(w*.22,h*.75,w*.3,h*.5,w*.4,h*.36); g.lineTo(w*.6,h*.36);
    g.bezierCurveTo(w*.7,h*.5,w*.78,h*.75,w*.67,h); g.closePath();
    g.fillStyle=lg(g,w*.25,0,w*.75,0,[[0,'#5a4a3e'],[.45,'#9a8a78'],[1,'#5f4f42']]); g.fill();
    g.strokeStyle='rgba(50,35,25,.35)'; g.lineWidth=2;
    for(let i=0;i<9;i++){const x=w*(.36+i*.035); g.beginPath(); g.moveTo(x,h*.4); g.quadraticCurveTo(x+(R()-.5)*20,h*.7,x+(x-w/2)*.3,h); g.stroke();}
  },
  acacia(g,w,h,o){
    g.strokeStyle='#4a3628'; g.lineCap='round'; g.lineWidth=w*.025;
    g.beginPath(); g.moveTo(w*.5,h); g.lineTo(w*.48,h*.6); g.lineTo(w*.3,h*.35); g.moveTo(w*.48,h*.6); g.lineTo(w*.7,h*.32); g.moveTo(w*.49,h*.7); g.lineTo(w*.56,h*.38); g.stroke();
    const R=o.r;
    for(let i=0;i<60;i++){const x=w*(.1+R()*.8), y=h*(.22+R()*.14)+Math.abs(x-w/2)*.06;
      g.fillStyle=pick(R,['#6f7f3a','#5f6f30','#80903f']); ell(g,x,y,w*.07,h*.05); g.fill();}
    g.fillStyle='rgba(30,30,10,.25)'; ell(g,w/2,h*.37,w*.38,h*.03); g.fill();
  },
  bush(g,w,h,o){
    const R=o.r, c=o.c||'#6a7a36';
    for(let i=0;i<14;i++){const x=w*(.18+R()*.64), y=h*(.45+R()*.35); g.fillStyle=shade(c,(R()-.6)*.4); ell(g,x,y,w*.16,h*.26); g.fill();}
  },
  tree(g,w,h,o){
    const R=o.r; g.fillStyle='#5a4030'; g.fillRect(w*.46,h*.55,w*.08,h*.45);
    for(let i=0;i<40;i++){const a=R()*Math.PI*2,d=Math.sqrt(R()); const x=w/2+Math.cos(a)*d*w*.36,y=h*.36+Math.sin(a)*d*h*.28;
      g.fillStyle=shade('#4f7a32',(x-w/2)/(w*.36)*.15+(y<h*.3?.1:-.1)); ell(g,x,y,w*.13,h*.1); g.fill();}
  },
  dunegrass(g,w,h,o){
    const R=o.r; g.lineCap='round';
    for(let i=0;i<46;i++){const x=w*(.15+R()*.7), ht=h*(.4+R()*.55), bend=(R()-.5)*w*.3;
      g.strokeStyle=pick(R,['#8a8a5a','#a69a62','#6f7448']); g.lineWidth=2+R()*2;
      g.beginPath(); g.moveTo(x,h); g.quadraticCurveTo(x,h-ht*.6,x+bend,h-ht); g.stroke();}
  },
  wheat(g,w,h,o){
    const R=o.r; g.lineCap='round';
    for(let i=0;i<60;i++){const x=w*(.05+R()*.9), ht=h*(.5+R()*.45), bend=(R()-.3)*w*.08;
      g.strokeStyle='#b89a48'; g.lineWidth=2; g.beginPath(); g.moveTo(x,h); g.quadraticCurveTo(x,h-ht*.5,x+bend,h-ht); g.stroke();
      g.fillStyle=pick(R,['#e2c060','#d4ae4c','#f0d27a']); ell(g,x+bend,h-ht,3,9); g.fill();}
  },
  pole(g,w,h){
    g.fillStyle=lg(g,w*.44,0,w*.56,0,[[0,'#4a3424'],[1,'#7a5a3e']]); g.fillRect(w*.45,h*.04,w*.1,h*.96);
    g.fillStyle='#5a4030'; g.fillRect(w*.1,h*.1,w*.8,h*.03); g.fillRect(w*.18,h*.2,w*.64,h*.025);
    g.fillStyle='#9ab8c0'; [.14,.3,.7,.86].forEach(x=>{ell(g,w*x,h*.095,w*.03,h*.015); g.fill();});
  },
  lamp(g,w,h,o){
    if(o.night){const gr=g.createRadialGradient(w/2,h*.1,2,w/2,h*.1,w*.5); gr.addColorStop(0,'rgba(255,220,150,.9)'); gr.addColorStop(.35,'rgba(255,190,110,.35)'); gr.addColorStop(1,'rgba(255,190,110,0)'); g.fillStyle=gr; g.fillRect(0,0,w,h*.3);}
    g.fillStyle='#1d2024'; g.fillRect(w*.46,h*.16,w*.08,h*.84); g.fillRect(w*.38,h*.94,w*.24,h*.06);
    rr(g,w*.4,h*.85,w*.2,h*.06,4); g.fill();
    g.beginPath(); g.moveTo(w*.34,h*.08); g.lineTo(w*.66,h*.08); g.lineTo(w*.6,h*.16); g.lineTo(w*.4,h*.16); g.closePath(); g.fill();
    g.fillStyle=o.night?'#ffe7a8':'#d9d2b8'; g.fillRect(w*.41,h*.1,w*.18,h*.05);
    g.fillStyle='#1d2024'; poly(g,[w*.3,h*.08,w*.5,h*.03,w*.7,h*.08]);
  },
  /* ---------- buildings ---------- */
  adobe(g,w,h,o){
    const R=o.r, base=o.i%2?'#c98a52':'#b9744a', top=h*.28;
    g.fillStyle=lg(g,0,top,0,h,[[0,shade(base,.12)],[1,shade(base,-.18)]]); g.fillRect(w*.06,top,w*.88,h-top);
    for(let i=0;i<260;i++){g.fillStyle=`rgba(80,40,20,${R()*.12})`; g.fillRect(w*.06+R()*w*.88,top+R()*(h-top),3,2);}
    g.fillStyle=shade(base,.05);
    [[.06,.16],[.94,.16],[.5,.12]].forEach(([x,s])=>{g.beginPath(); g.moveTo(w*x-w*.05,top+2); g.quadraticCurveTo(w*x-w*.015,top-h*s*.6,w*x+(x>.6?w*.03:x<.4?-w*.03:0),top-h*s); g.quadraticCurveTo(w*x+w*.015,top-h*s*.5,w*x+w*.05,top+2); g.fill();});
    g.fillRect(w*.06,top-h*.03,w*.88,h*.04);
    g.fillStyle='#3a2416'; g.beginPath(); g.moveTo(w*.42,h); g.lineTo(w*.42,h*.68); g.quadraticCurveTo(w*.5,h*.54,w*.58,h*.68); g.lineTo(w*.58,h); g.fill();
    g.strokeStyle='rgba(250,235,210,.75)'; g.lineWidth=3;
    g.beginPath(); for(let i=0;i<=8;i++){const x=w*(.34+i*.04); g.lineTo(x,h*(i%2?.46:.52));} g.stroke();
    g.beginPath(); g.arc(w*.5,h*.62,w*.11,Math.PI*1.05,Math.PI*1.95); g.stroke();
    [[.18,.52],[.78,.52],[.18,.75],[.78,.75]].forEach(([x,y])=>{g.fillStyle='#2e1c12'; g.fillRect(w*x-w*.035,h*y-h*.04,w*.07,h*.08); g.strokeRect(w*x-w*.05,h*y-h*.055,w*.1,h*.11);});
  },
  horreo(g,w,h){
    g.fillStyle='#9a9a92'; [.18,.4,.6,.82].forEach(x=>{g.fillRect(w*x-w*.025,h*.68,w*.05,h*.32); g.fillStyle='#b4b4aa'; g.fillRect(w*x-w*.05,h*.64,w*.1,h*.05); g.fillStyle='#9a9a92';});
    g.fillStyle=lg(g,0,h*.3,0,h*.64,[[0,'#c9c4b4'],[1,'#a39e8e']]); g.fillRect(w*.1,h*.32,w*.8,h*.32);
    g.strokeStyle='rgba(60,55,45,.5)'; g.lineWidth=2; for(let x=.14;x<.88;x+=.035){g.beginPath(); g.moveTo(w*x,h*.34); g.lineTo(w*x,h*.62); g.stroke();}
    g.fillStyle='#a64a2e'; poly(g,[w*.06,h*.33,w*.5,h*.14,w*.94,h*.33]);
    g.strokeStyle='rgba(80,20,10,.4)'; for(let i=1;i<8;i++){g.beginPath(); g.moveTo(w*(.06+i*.055),h*(.33-i*.024)); g.lineTo(w*(.94-i*.055),h*(.33-i*.024)); g.stroke();}
    g.fillStyle='#8a8a80'; g.fillRect(w*.08,h*.06,w*.025,h*.12); g.fillRect(w*.06,h*.09,w*.07,h*.02);
    g.beginPath(); g.moveTo(w*.9,h*.18); g.lineTo(w*.92,h*.05); g.lineTo(w*.94,h*.18); g.fill();
  },
  cottage(g,w,h,o){
    const wall='#efece4', top=h*.38;
    g.fillStyle=lg(g,0,top,0,h,[[0,wall],[1,'#cfcabe']]); g.fillRect(w*.1,top,w*.8,h-top);
    g.fillStyle='#9d978a'; for(let y=top;y<h;y+=h*.07){g.fillRect(w*.1,y,w*.05,h*.05); g.fillRect(w*.85,y+h*.03,w*.05,h*.05);}
    g.fillStyle='#b24a30'; poly(g,[w*.04,top+4,w*.5,h*.06,w*.96,top+4]);
    g.strokeStyle='rgba(90,20,10,.45)'; g.lineWidth=2; for(let i=1;i<9;i++){g.beginPath(); g.moveTo(w*.5,h*.06); g.lineTo(w*(.04+i*.102),top+4); g.stroke();}
    g.fillStyle='#2f6a4a'; g.fillRect(w*.44,h*.66,w*.12,h*.34);
    [[.24,.55],[.68,.55]].forEach(([x,y])=>{g.fillStyle='#fff'; g.fillRect(w*x-2,h*y-2,w*.12+4,h*.16+4); g.fillStyle='#3a5a6a'; g.fillRect(w*x,h*y,w*.12,h*.16); g.fillStyle='#2f6a4a'; g.fillRect(w*x-w*.04,h*y,w*.035,h*.16); g.fillRect(w*x+w*.125,h*y,w*.035,h*.16);});
  },
  haussmann(g,w,h,o){
    const stone=o.i%2?'#ebdfc4':'#e2d4b6', top=h*.22, floors=6, fh=(h-top)/floors;
    g.fillStyle=lg(g,0,top,0,h,[[0,shade(stone,.08)],[1,shade(stone,-.12)]]); g.fillRect(w*.04,top,w*.92,h-top);
    g.fillStyle='#5d6a80'; g.beginPath(); g.moveTo(w*.02,top); g.lineTo(w*.1,h*.06); g.lineTo(w*.9,h*.06); g.lineTo(w*.98,top); g.fill();
    g.fillStyle='#8b6a5a'; [.18,.82].forEach(x=>g.fillRect(w*x,h*.01,w*.06,h*.06));
    for(let i=0;i<4;i++){const x=w*(.2+i*.2); g.fillStyle='#e9e3d4'; poly(g,[x-w*.05,top-h*.01,x,h*.08,x+w*.05,top-h*.01]); g.fillStyle='#2a3240'; g.fillRect(x-w*.025,h*.12,w*.05,h*.07);}
    for(let f=0;f<floors;f++){const y=top+f*fh;
      g.fillStyle='rgba(120,100,70,.35)'; g.fillRect(w*.04,y,w*.92,2);
      if(f===floors-1){ // shopfronts
        g.fillStyle=o.i%2?'#7a2a2a':'#2a4a3a'; g.fillRect(w*.08,y+fh*.18,w*.84,fh*.2);
        g.fillStyle='#2a2f38'; for(let i=0;i<4;i++) g.fillRect(w*(.1+i*.21),y+fh*.42,w*.17,fh*.58); continue;}
      for(let i=0;i<5;i++){const x=w*(.1+i*.17);
        g.fillStyle=o.night?'#e9b85a':'#3b4656'; g.fillRect(x,y+fh*.18,w*.1,fh*.62);
        g.fillStyle='rgba(255,255,255,.18)'; g.fillRect(x,y+fh*.18,w*.1,fh*.08);}
      if(f===1||f===4){g.strokeStyle='#22262c'; g.lineWidth=2; g.beginPath(); g.moveTo(w*.06,y+fh*.8); g.lineTo(w*.94,y+fh*.8); g.stroke();
        for(let x=w*.07;x<w*.94;x+=8){g.beginPath(); g.moveTo(x,y+fh*.8); g.lineTo(x,y+fh*.6); g.stroke();}
        g.beginPath(); g.moveTo(w*.06,y+fh*.6); g.lineTo(w*.94,y+fh*.6); g.stroke();}
    }
  },
  colonial(g,w,h,o){
    const R=o.r, base=pick(R,['#e9c46a','#e8a0a0','#9fd0c8','#f0e0c0','#c9b0e0']), top=h*.16;
    g.fillStyle=lg(g,0,top,0,h,[[0,shade(base,.1)],[1,shade(base,-.2)]]); g.fillRect(w*.05,top,w*.9,h-top);
    g.fillStyle=shade(base,-.1); g.fillRect(w*.03,top-h*.04,w*.94,h*.05);
    for(let i=0;i<9;i++){g.fillRect(w*(.05+i*.1),top-h*.08,w*.04,h*.05);}
    const floors=4, fh=(h-top)/floors;
    for(let f=0;f<floors;f++){const y=top+f*fh;
      for(let i=0;i<4;i++){const x=w*(.12+i*.205), ww=w*.13;
        g.fillStyle='#3a2a2a'; g.beginPath(); g.moveTo(x,y+fh*.85); g.lineTo(x,y+fh*.35); g.arc(x+ww/2,y+fh*.35,ww/2,Math.PI,0); g.lineTo(x+ww,y+fh*.85); g.fill();
        g.fillStyle='rgba(255,255,255,.7)'; g.fillRect(x-2,y+fh*.85,ww+4,3);}
      if(f>0&&f<floors-1){g.strokeStyle='#5a3a2a'; g.lineWidth=2; g.strokeRect(w*.08,y+fh*.62,w*.84,fh*.24);
        for(let x=w*.1;x<w*.92;x+=10){g.beginPath(); g.moveTo(x,y+fh*.62); g.lineTo(x,y+fh*.86); g.stroke();}}
    }
  },
  tower(g,w,h,o){
    const R=o.r, top=o.i%2?h*.08:h*.14, glass=pick(R,['#1a2440','#20243a','#162a3a']);
    g.fillStyle=lg(g,w*.1,0,w*.9,0,[[0,shade(glass,-.3)],[.6,glass],[1,shade(glass,.25)]]);
    if(o.i%2){g.beginPath(); g.moveTo(w*.12,h); g.lineTo(w*.12,top+h*.1); g.lineTo(w*.5,top); g.lineTo(w*.88,top+h*.06); g.lineTo(w*.88,h); g.fill();}
    else{g.fillRect(w*.1,top,w*.8,h-top); g.fillRect(w*.2,top-h*.05,w*.6,h*.05);}
    for(let y=top+h*.06;y<h-6;y+=h*.022) for(let x=w*.15;x<w*.85;x+=w*.07){
      if(R()<.55){g.fillStyle=pick(R,['#ffe3a0','#fff0c8','#bfe0ff','#ffd27a']); g.globalAlpha=.55+R()*.45; g.fillRect(x,y,w*.045,h*.011); g.globalAlpha=1;}}
    g.strokeStyle='#8890a0'; g.lineWidth=3; g.beginPath(); g.moveTo(w*.5,top); g.lineTo(w*.5,top-h*.06); g.stroke();
    g.fillStyle='#ff4a4a'; ell(g,w*.5,top-h*.06,5,5); g.fill();
  },
  neon(g,w,h,o){
    const R=o.r, words=['HOTEL','NOODLE','TEA','DIM SUM','BAR','JADE'], word=words[o.i%words.length];
    const col=pick(R,['#ff3fa4','#3ff0ff','#ffd23f','#7aff6a','#ff6a3f']);
    g.fillStyle='#1a1424'; rr(g,w*.12,h*.04,w*.76,h*.8,10); g.fill();
    g.fillStyle='#2a2430'; g.fillRect(w*.46,h*.84,w*.08,h*.16);
    g.shadowColor=col; g.shadowBlur=18; g.strokeStyle=col; g.lineWidth=5; rr(g,w*.18,h*.07,w*.64,h*.74,8); g.stroke();
    g.fillStyle='#fff'; g.font=`900 ${w*.34}px ${FD}`; g.textAlign='center'; g.textBaseline='middle';
    const letters=word.replace(' ','').split(''), step=(h*.68)/letters.length;
    letters.forEach((ch,i)=>{g.fillStyle=shade(col,.6); g.fillText(ch,w/2,h*.11+step*(i+.5));});
    g.shadowBlur=0;
  },
  barn(g,w,h){
    const top=h*.36;
    g.fillStyle=lg(g,0,top,0,h,[[0,'#b43a2c'],[1,'#7e2820']]); g.fillRect(w*.08,top,w*.84,h-top);
    g.fillStyle='#5a5a60'; g.beginPath(); g.moveTo(w*.04,top+4); g.lineTo(w*.2,h*.14); g.lineTo(w*.5,h*.02); g.lineTo(w*.8,h*.14); g.lineTo(w*.96,top+4); g.fill();
    g.strokeStyle='rgba(60,10,10,.35)'; g.lineWidth=2; for(let x=w*.1;x<w*.92;x+=12){g.beginPath(); g.moveTo(x,top); g.lineTo(x,h); g.stroke();}
    g.fillStyle='#f2efe6'; g.fillRect(w*.34,h*.52,w*.32,h*.48);
    g.fillStyle='#9a2e24'; g.fillRect(w*.36,h*.54,w*.28,h*.44);
    g.strokeStyle='#f2efe6'; g.lineWidth=6; g.beginPath(); g.moveTo(w*.36,h*.54); g.lineTo(w*.64,h*.98); g.moveTo(w*.64,h*.54); g.lineTo(w*.36,h*.98); g.stroke();
    g.fillStyle='#f2efe6'; g.fillRect(w*.44,h*.24,w*.12,h*.12); g.fillStyle='#3a2a20'; g.fillRect(w*.455,h*.255,w*.09,h*.09);
  },
  silo(g,w,h){
    g.fillStyle=lg(g,w*.1,0,w*.9,0,[[0,'#7d8288'],[.4,'#d8dde2'],[1,'#8a8f95']]); g.fillRect(w*.12,h*.18,w*.76,h*.82);
    g.strokeStyle='rgba(60,60,70,.35)'; g.lineWidth=2; for(let y=h*.22;y<h;y+=h*.04){g.beginPath(); g.moveTo(w*.12,y); g.lineTo(w*.88,y); g.stroke();}
    g.fillStyle=lg(g,w*.1,0,w*.9,0,[[0,'#8a8f95'],[.4,'#eef1f4'],[1,'#8a8f95']]); g.beginPath(); g.moveTo(w*.12,h*.18); g.quadraticCurveTo(w*.5,h*.02,w*.88,h*.18); g.fill();
  },
  craftsman(g,w,h,o){
    const R=o.r, side=pick(R,['#3f5a6a','#4a6a4a','#6a4a3a','#5a5a6a']), top=h*.4;
    g.fillStyle=lg(g,0,top,0,h,[[0,side],[1,shade(side,-.25)]]); g.fillRect(w*.1,top,w*.8,h-top);
    g.strokeStyle='rgba(0,0,0,.18)'; g.lineWidth=2; for(let y=top+6;y<h;y+=9){g.beginPath(); g.moveTo(w*.1,y); g.lineTo(w*.9,y); g.stroke();}
    g.fillStyle='#2a2a30'; poly(g,[w*.02,top+6,w*.5,h*.08,w*.98,top+6]);
    g.fillStyle='#e8e2d4'; g.fillRect(w*.08,h*.66,w*.84,h*.04); [.12,.5,.86].forEach(x=>g.fillRect(w*x-6,h*.66,12,h*.34));
    [[.2,.48],[.62,.48]].forEach(([x,y])=>{g.fillStyle='#e8e2d4'; g.fillRect(w*x-3,h*y-3,w*.18+6,h*.12+6); g.fillStyle='#f5c870'; g.fillRect(w*x,h*y,w*.18,h*.12);});
    g.fillStyle='#f5c870'; g.fillRect(w*.42,h*.76,w*.1,h*.24);
  },
  hangar(g,w,h,o){
    g.fillStyle=lg(g,0,h*.1,0,h,[[0,'#d8dce4'],[1,'#8a90a0']]); g.fillRect(w*.04,h*.1,w*.92,h*.9);
    g.strokeStyle='rgba(50,55,70,.35)'; g.lineWidth=2; for(let x=w*.06;x<w*.96;x+=10){g.beginPath(); g.moveTo(x,h*.1); g.lineTo(x,h); g.stroke();}
    if(o.night) nightTint(g,w,h,.55);
    g.fillStyle='#ffe9b8'; g.fillRect(w*.3,h*.22,w*.4,h*.78);
    g.fillStyle='rgba(180,190,210,.85)'; g.fillRect(w*.44,h*.28,w*.12,h*.72);
    g.fillStyle='#1a1e28'; g.font=`900 ${w*.07}px ${FD}`; g.textAlign='center'; g.fillText('HIGH BAY',w*.5,h*.18);
    g.fillStyle='#ff5a5a'; [.06,.94].forEach(x=>{ell(g,w*x,h*.11,6,6); g.fill();});
  },
  /* ---------- landmarks ---------- */
  kanoGate(g,w,h){
    const wall='#b8784a', top=h*.3;
    g.fillStyle=lg(g,0,top,0,h,[[0,shade(wall,.15)],[1,shade(wall,-.25)]]);
    g.beginPath(); g.moveTo(0,h); g.lineTo(0,h*.5); g.lineTo(w*.28,h*.42); g.lineTo(w*.28,top); g.lineTo(w*.72,top); g.lineTo(w*.72,h*.42); g.lineTo(w,h*.5); g.lineTo(w,h); g.fill();
    g.fillStyle=shade(wall,.1);
    [[.28,.2],[.4,.13],[.5,.22],[.6,.13],[.72,.2]].forEach(([x,s])=>{g.beginPath(); g.moveTo(w*x-w*.035,top+2); g.quadraticCurveTo(w*x,top-h*s*.4,w*x+(x<.5?-w*.02:x>.5?w*.02:0),top-h*s); g.quadraticCurveTo(w*x+w*.01,top-h*s*.4,w*x+w*.035,top+2); g.fill();});
    for(let x=0;x<w*.28;x+=w*.04){g.fillRect(x,h*.5-(x/(w*.28))*h*.08-h*.04,w*.022,h*.05);} for(let x=w*.72;x<w;x+=w*.04){g.fillRect(x,h*.42+((x-w*.72)/(w*.28))*h*.08-h*.04,w*.022,h*.05);}
    g.fillStyle='#24140c'; g.beginPath(); g.moveTo(w*.4,h); g.lineTo(w*.4,h*.6); g.quadraticCurveTo(w*.5,h*.38,w*.6,h*.6); g.lineTo(w*.6,h); g.fill();
    g.strokeStyle='rgba(255,240,215,.75)'; g.lineWidth=5;
    g.beginPath(); g.moveTo(w*.37,h); g.lineTo(w*.37,h*.6); g.quadraticCurveTo(w*.5,h*.33,w*.63,h*.6); g.lineTo(w*.63,h); g.stroke();
    g.lineWidth=3; g.beginPath(); for(let i=0;i<=10;i++) g.lineTo(w*(.32+i*.036),h*(i%2?.36:.4)); g.stroke();
    [[.33,.5],[.67,.5]].forEach(([x,y])=>{g.beginPath(); g.arc(w*x,h*y,w*.025,0,Math.PI*2); g.stroke(); g.beginPath(); g.moveTo(w*x,h*(y+.05)); g.lineTo(w*x,h*(y+.25)); g.stroke();});
    const R=rng(5); for(let i=0;i<900;i++){g.fillStyle=`rgba(70,35,15,${R()*.14})`; g.fillRect(R()*w,top+R()*(h-top),3,2);}
  },
  hercules(g,w,h){
    const stone='#cfc6b2';
    g.fillStyle='#8a8478'; g.fillRect(w*.08,h*.92,w*.84,h*.08);
    g.fillStyle=lg(g,w*.2,0,w*.8,0,[[0,shade(stone,-.3)],[.55,stone],[1,shade(stone,.12)]]);
    g.beginPath(); g.moveTo(w*.18,h*.92); g.lineTo(w*.22,h*.24); g.lineTo(w*.78,h*.24); g.lineTo(w*.82,h*.92); g.fill();
    g.strokeStyle='rgba(80,70,55,.35)'; g.lineWidth=3;
    for(let i=0;i<9;i++){const y=h*(.3+i*.075); g.beginPath(); g.moveTo(w*.2,y+h*.05); g.lineTo(w*.8,y); g.stroke();}
    g.fillStyle='rgba(60,55,45,.6)'; for(let i=0;i<6;i++){g.fillRect(w*(.46),h*(.32+i*.1),w*.06,h*.035);}
    g.fillStyle=shade(stone,.05); g.fillRect(w*.2,h*.2,w*.6,h*.05);
    g.fillStyle=lg(g,w*.3,0,w*.7,0,[[0,'#9a9282'],[.5,'#e2dac8'],[1,'#9a9282']]); g.fillRect(w*.3,h*.1,w*.4,h*.1);
    g.fillStyle='#e2dac8'; g.fillRect(w*.37,h*.04,w*.26,h*.06);
    g.fillStyle='#3a4a5a'; for(let i=0;i<3;i++) g.fillRect(w*(.4+i*.08),h*.05,w*.04,h*.04);
    const gr=g.createRadialGradient(w*.5,h*.07,2,w*.5,h*.07,w*.3); gr.addColorStop(0,'rgba(255,240,180,.8)'); gr.addColorStop(1,'rgba(255,240,180,0)'); g.fillStyle=gr; g.fillRect(0,0,w,h*.2);
    g.fillStyle='#5a5a52'; poly(g,[w*.36,h*.04,w*.5,0,w*.64,h*.04]);
  },
  eiffel(g,w,h,o){
    const iron='#7a5a3e';
    g.save();
    g.beginPath();
    g.moveTo(w*.04,h); g.quadraticCurveTo(w*.3,h*.72,w*.4,h*.34); g.lineTo(w*.46,h*.08); g.lineTo(w*.54,h*.08); g.lineTo(w*.6,h*.34); g.quadraticCurveTo(w*.7,h*.72,w*.96,h);
    g.lineTo(w*.76,h); g.quadraticCurveTo(w*.5,h*.74,w*.24,h); g.closePath();
    g.fillStyle=lg(g,0,0,w,0,[[0,shade(iron,-.35)],[.5,iron],[1,shade(iron,-.15)]]); g.fill();
    g.clip();
    g.strokeStyle='rgba(30,18,10,.55)'; g.lineWidth=2;
    for(let i=-40;i<40;i++){g.beginPath(); g.moveTo(w*.5+i*14,0); g.lineTo(w*.5+i*14+h*.35,h); g.stroke(); g.beginPath(); g.moveTo(w*.5+i*14,0); g.lineTo(w*.5+i*14-h*.35,h); g.stroke();}
    g.restore();
    g.fillStyle=shade(iron,-.2); g.fillRect(w*.2,h*.7,w*.6,h*.03); g.fillRect(w*.36,h*.42,w*.28,h*.025); g.fillRect(w*.44,h*.08,w*.12,h*.025);
    g.fillStyle=iron; g.fillRect(w*.485,h*.01,w*.03,h*.07);
    if(o&&o.lights){g.fillStyle='rgba(255,230,160,.9)'; const R=rng(3); for(let i=0;i<120;i++){const y=h*(.1+R()*.88), spread=(y/h)*(y/h)*.46+.03; g.fillRect(w*(.5+(R()-.5)*2*spread),y,2,2);}}
  },
  gateway(g,w,h){
    const st='#d9b77a', base=h*.18;
    g.fillStyle=lg(g,0,base,0,h,[[0,shade(st,.15)],[1,shade(st,-.25)]]); g.fillRect(w*.04,base,w*.92,h-base);
    g.fillStyle=shade(st,.05); [.04,.26,.62,.84].forEach(x=>{g.fillRect(w*x,h*.06,w*.12,h*.14); g.beginPath(); g.arc(w*(x+.06),h*.06,w*.06,Math.PI,0); g.fill(); g.fillRect(w*(x+.055),h*-.02,w*.01,h*.05);});
    g.fillStyle=shade(st,.1); g.fillRect(w*.02,base-h*.02,w*.96,h*.04);
    g.fillStyle='#3a2a20'; g.beginPath(); g.moveTo(w*.36,h); g.lineTo(w*.36,h*.48); g.quadraticCurveTo(w*.5,h*.22,w*.64,h*.48); g.lineTo(w*.64,h); g.fill();
    g.strokeStyle=shade(st,-.3); g.lineWidth=3; g.beginPath(); g.moveTo(w*.33,h); g.lineTo(w*.33,h*.48); g.quadraticCurveTo(w*.5,h*.18,w*.67,h*.48); g.lineTo(w*.67,h); g.stroke();
    [.15,.85].forEach(x=>{g.fillStyle='#4a3828'; g.beginPath(); g.moveTo(w*(x-.06),h); g.lineTo(w*(x-.06),h*.62); g.quadraticCurveTo(w*x,h*.48,w*(x+.06),h*.62); g.lineTo(w*(x+.06),h); g.fill();
      g.fillStyle='#4a3828'; for(let i=0;i<3;i++) g.fillRect(w*(x-.05+i*.04),h*.3,w*.025,h*.1);});
    g.strokeStyle='rgba(120,80,40,.4)'; g.lineWidth=2; for(let y=base+h*.04;y<h;y+=h*.05){g.beginPath(); g.moveTo(w*.04,y); g.lineTo(w*.96,y); g.stroke();}
  },
  hkTower(g,w,h){
    g.fillStyle=lg(g,0,0,w,0,[[0,'#10182e'],[.5,'#2a3a5a'],[1,'#0c1428']]);
    g.beginPath(); g.moveTo(w*.15,h); g.lineTo(w*.15,h*.4); g.lineTo(w*.5,h*.08); g.lineTo(w*.85,h*.28); g.lineTo(w*.85,h); g.fill();
    g.strokeStyle='rgba(220,235,255,.85)'; g.lineWidth=3; g.shadowColor='#bfe0ff'; g.shadowBlur=10;
    g.beginPath(); g.moveTo(w*.15,h); g.lineTo(w*.15,h*.4); g.lineTo(w*.5,h*.08); g.lineTo(w*.85,h*.28); g.lineTo(w*.85,h); g.stroke();
    const seg=[[h*.4,h*.6],[h*.6,h*.8],[h*.8,h]];
    seg.forEach(([a,b])=>{g.beginPath(); g.moveTo(w*.15,a); g.lineTo(w*.85,b); g.moveTo(w*.85,a); g.lineTo(w*.15,b); g.moveTo(w*.15,b); g.lineTo(w*.85,b); g.stroke();});
    g.beginPath(); g.moveTo(w*.5,h*.08); g.lineTo(w*.5,h); g.stroke();
    g.shadowBlur=0;
    g.strokeStyle='#c0c8d8'; g.lineWidth=4; g.beginPath(); g.moveTo(w*.42,h*.15); g.lineTo(w*.42,0); g.moveTo(w*.58,h*.14); g.lineTo(w*.58,h*.02); g.stroke();
    g.fillStyle='#ff4a4a'; ell(g,w*.42,4,6,6); g.fill();
    const R=rng(9); for(let i=0;i<260;i++){const x=w*(.18+R()*.64), y=h*(.42+R()*.56); g.fillStyle=`rgba(255,230,170,${R()*.6})`; g.fillRect(x,y,4,3);}
  },
  locomotive(g,w,h){
    for(let i=0;i<9;i++){g.fillStyle=`rgba(${220-i*8},${220-i*8},${225-i*8},${.55-i*.05})`; ell(g,w*(.24+i*.07),h*(.2-i*.02),w*(.05+i*.012),h*(.07+i*.01)); g.fill();}
    g.fillStyle='#4a4038'; g.fillRect(0,h*.92,w,h*.03); g.fillStyle='#6a5a48'; for(let x=0;x<w;x+=w*.04) g.fillRect(x,h*.95,w*.025,h*.05);
    g.fillStyle=lg(g,0,h*.35,0,h*.75,[[0,'#3a3a40'],[.4,'#1a1a1e'],[1,'#0e0e10']]);
    rr(g,w*.12,h*.4,w*.5,h*.3,h*.15); g.fill();
    g.fillRect(w*.58,h*.22,w*.2,h*.5);
    g.fillStyle='#222'; g.fillRect(w*.56,h*.18,w*.24,h*.05);
    g.fillStyle='#e8c25a'; g.fillRect(w*.61,h*.3,w*.07,h*.1);
    g.fillStyle='#141416'; g.fillRect(w*.22,h*.24,w*.06,h*.18); g.fillRect(w*.2,h*.22,w*.1,h*.04);
    g.fillStyle='#2a2a30'; ell(g,w*.42,h*.38,w*.04,h*.04); g.fill();
    g.fillStyle='#e8c25a'; g.fillRect(w*.12,h*.52,w*.5,h*.02);
    g.fillStyle='#1a1a1e'; poly(g,[w*.12,h*.7,w*.04,h*.88,w*.12,h*.88]);
    g.fillStyle='#e8d090'; ell(g,w*.11,h*.46,w*.02,h*.04); g.fill();
    g.fillStyle='#24242a'; g.fillRect(w*.8,h*.42,w*.18,h*.36);
    [[.2,.11],[.33,.11],[.46,.11],[.65,.07],[.86,.06],[.95,.06]].forEach(([x,r])=>{g.fillStyle='#9a2a22'; ell(g,w*x,h*.84,w*r*.55,w*r*.55); g.fill(); g.strokeStyle='#d8c8a8'; g.lineWidth=3; ell(g,w*x,h*.84,w*r*.55,w*r*.55); g.stroke();
      g.fillStyle='#d8c8a8'; ell(g,w*x,h*.84,w*.012,w*.012); g.fill();});
    g.strokeStyle='#c8c0b0'; g.lineWidth=6; g.beginPath(); g.moveTo(w*.2,h*.84); g.lineTo(w*.46,h*.84); g.stroke();
    g.fillStyle='#e8c25a'; g.font=`900 ${h*.07}px ${FD}`; g.textAlign='center'; g.fillText('UNION PACIFIC',w*.89,h*.56);
  },
  needle(g,w,h){
    g.strokeStyle='#e8e4dc'; g.lineWidth=w*.03; g.lineCap='round';
    g.beginPath(); g.moveTo(w*.2,h); g.quadraticCurveTo(w*.47,h*.55,w*.47,h*.3); g.moveTo(w*.8,h); g.quadraticCurveTo(w*.53,h*.55,w*.53,h*.3); g.stroke();
    g.lineWidth=w*.02; g.beginPath(); g.moveTo(w*.38,h); g.quadraticCurveTo(w*.49,h*.6,w*.49,h*.3); g.moveTo(w*.62,h); g.quadraticCurveTo(w*.51,h*.6,w*.51,h*.3); g.stroke();
    g.lineWidth=w*.012; g.beginPath(); g.moveTo(w*.34,h*.72); g.lineTo(w*.66,h*.72); g.stroke();
    g.fillStyle=lg(g,0,h*.18,0,h*.3,[[0,'#f4f0e8'],[1,'#a8a49c']]);
    g.beginPath(); g.moveTo(w*.08,h*.23); g.quadraticCurveTo(w*.5,h*.16,w*.92,h*.23); g.lineTo(w*.7,h*.3); g.lineTo(w*.3,h*.3); g.closePath(); g.fill();
    g.fillStyle='#f5c870'; g.fillRect(w*.2,h*.24,w*.6,h*.02);
    g.fillStyle='#e8e4dc'; g.beginPath(); g.moveTo(w*.18,h*.2); g.quadraticCurveTo(w*.5,h*.13,w*.82,h*.2); g.lineTo(w*.18,h*.2); g.fill();
    g.fillStyle='#e8e4dc'; g.fillRect(w*.49,h*.03,w*.02,h*.12);
    g.fillStyle='#ff4a4a'; ell(g,w*.5,h*.03,4,4); g.fill();
    g.fillStyle='#d4a020'; g.fillRect(w*.44,h*.14,w*.12,h*.02);
  },
  starship(g,w,h){
    // tower
    g.strokeStyle='#5a6070'; g.lineWidth=3;
    const tx=w*.08, tw=w*.22;
    g.fillStyle='#2a2e38'; g.fillRect(tx,h*.08,tw,h*.92);
    for(let y=h*.08;y<h;y+=h*.035){g.beginPath(); g.moveTo(tx,y); g.lineTo(tx+tw,y+h*.035); g.moveTo(tx+tw,y); g.lineTo(tx,y+h*.035); g.stroke();}
    g.strokeStyle='#7a8090'; g.lineWidth=8; g.beginPath(); g.moveTo(tx+tw,h*.36); g.lineTo(w*.6,h*.33); g.moveTo(tx+tw,h*.42); g.lineTo(w*.6,h*.45); g.stroke();
    g.fillStyle='#ff4040'; ell(g,tx+tw/2,h*.075,6,6); g.fill();
    // booster + ship (stainless)
    const steel=lg(g,w*.42,0,w*.78,0,[[0,'#6a707c'],[.35,'#e8ecf2'],[.6,'#b8bec8'],[1,'#5a606c']]);
    g.fillStyle=steel; g.fillRect(w*.44,h*.4,w*.32,h*.56);
    g.fillRect(w*.44,h*.1,w*.32,h*.29);
    g.beginPath(); g.moveTo(w*.44,h*.1); g.quadraticCurveTo(w*.44,0,w*.6,0); g.quadraticCurveTo(w*.76,0,w*.76,h*.1); g.fill();
    g.fillStyle='#2a2e38'; g.fillRect(w*.44,h*.39,w*.32,h*.012);
    g.fillStyle='#3a3e48'; poly(g,[w*.44,h*.04,w*.38,h*.1,w*.44,h*.12]); poly(g,[w*.76,h*.04,w*.82,h*.1,w*.76,h*.12]);
    poly(g,[w*.44,h*.3,w*.36,h*.39,w*.44,h*.39]); poly(g,[w*.76,h*.3,w*.84,h*.39,w*.76,h*.39]);
    g.strokeStyle='rgba(40,45,55,.25)'; g.lineWidth=1.5; for(let y=h*.12;y<h*.96;y+=h*.02){g.beginPath(); g.moveTo(w*.44,y); g.lineTo(w*.76,y); g.stroke();}
    g.fillStyle='#3a3e48'; g.fillRect(w*.38,h*.95,w*.44,h*.05);
    nightTint(g,w,h,.35);
    const gr=g.createRadialGradient(w*.6,h,10,w*.6,h,w*.6); gr.addColorStop(0,'rgba(255,220,170,.55)'); gr.addColorStop(1,'rgba(255,220,170,0)'); g.fillStyle=gr; g.fillRect(0,h*.5,w,h*.5);
    g.fillStyle='#ffe0a0'; for(let y=h*.12;y<h;y+=h*.07){ell(g,tx+tw+4,y,3,3); g.fill();}
  }
};

