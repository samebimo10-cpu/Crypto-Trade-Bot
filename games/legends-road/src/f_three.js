
/* =====================================================================
   3D RENDERER (three.js)
   The race logic above is unchanged: every segment, sprite, car and coin
   is turned into a real 3D world, and the 2D canvas becomes the HUD layer.
   ===================================================================== */
const TH = window.THREE;
const R3 = {on:false, ok:false, quality:'high', builtFor:-1, snap:true, chunks:[], view:480};
let buildSerial = 0;
const MW=9, HW=5.5, LS=HW/ROADW, SL=1.1, YS=.003, K3=.003, CHUNK=60;
const C3 = hex => new TH.Color(hex).convertSRGBToLinear();
const T3 = cls => TH ? new TH[cls]() : null;

function init3D(){
  if(R3.ok) return true;
  if(!TH) return false;
  try{
    const c=document.createElement('canvas'); c.id='gl'; c.setAttribute('aria-hidden','true');
    document.body.insertBefore(c,cv);
    const r=new TH.WebGLRenderer({canvas:c,antialias:true,powerPreference:'high-performance'});
    if(!r.getContext()) throw new Error('no webgl');
    r.outputEncoding=TH.sRGBEncoding; r.toneMapping=TH.ACESFilmicToneMapping; r.toneMappingExposure=.85;
    r.shadowMap.type=TH.PCFSoftShadowMap;
    R3.r=r; R3.canvas=c;
  }catch(e){ const c=document.getElementById('gl'); if(c) c.remove(); return false; }
  R3.scene=new TH.Scene();
  R3.cam=new TH.PerspectiveCamera(62,1,.3,3200);
  R3.aniso=Math.min(16,R3.r.capabilities.getMaxAnisotropy());
  R3.hemi=new TH.HemisphereLight(0xffffff,0x444444,.8); R3.scene.add(R3.hemi);
  const sun=R3.sun=new TH.DirectionalLight(0xffffff,2.4); sun.castShadow=true;
  sun.shadow.mapSize.set(2048,2048); const sc=sun.shadow.camera; sc.left=-70; sc.right=70; sc.top=70; sc.bottom=-70; sc.near=1; sc.far=400;
  sun.shadow.bias=-.0004; sun.shadow.normalBias=.03;
  R3.scene.add(sun,sun.target);
  R3.head=new TH.SpotLight(0xfff0d8,0,110,.42,.55,1.1); R3.scene.add(R3.head,R3.head.target);
  R3.pmrem=new TH.PMREMGenerator(R3.r);
  R3.ok=true; resize3D(); initPost(); return true;
}
function resize3D(){
  if(!R3.ok) return;
  const pr=Math.min(devicePixelRatio||1,R3.quality==='high'?2:1.5);
  const fw=R3.force?R3.force.w:innerWidth, fh=R3.force?R3.force.h:innerHeight; // R3.force: fixed 1920x1080 while recording
  R3.r.setPixelRatio(R3.force?1:pr); R3.r.setSize(fw,fh,false);
  R3.cam.aspect=fw/fh; R3.cam.updateProjectionMatrix();
  R3.r.shadowMap.enabled=true;
  const sz=R3.quality==='high'?2048:1024, sc=R3.sun.shadow.camera, ext=R3.quality==='high'?70:45;
  if(R3.sun.shadow.mapSize.x!==sz){R3.sun.shadow.mapSize.set(sz,sz); if(R3.sun.shadow.map){R3.sun.shadow.map.dispose(); R3.sun.shadow.map=null;}}
  sc.left=-ext; sc.right=ext; sc.top=ext; sc.bottom=-ext; sc.updateProjectionMatrix();
  R3.view=R3.quality==='high'?480:320;
  if(POST.on) sizePost();
}

/* ---------- textures, all generated in code ---------- */
const TEX={};
function canvasTex(c,srgb=true,rep=true){
  const t=new TH.CanvasTexture(c); if(rep){t.wrapS=t.wrapT=TH.RepeatWrapping;}
  if(srgb) t.encoding=TH.sRGBEncoding; t.anisotropy=R3.aniso||4; return t;
}
function normalMap(height,strength){
  const w=height.width,h=height.height, src=height.getContext('2d').getImageData(0,0,w,h).data;
  const out=document.createElement('canvas'); out.width=w; out.height=h; const og=out.getContext('2d'), img=og.createImageData(w,h), d=img.data;
  const L=(x,y)=>src[(((y+h)%h)*w+((x+w)%w))*4]/255;
  for(let y=0;y<h;y++) for(let x=0;x<w;x++){
    const dx=(L(x-1,y)-L(x+1,y))*strength, dy=(L(x,y-1)-L(x,y+1))*strength, nz=1/Math.sqrt(dx*dx+dy*dy+1), i=(y*w+x)*4;
    d[i]=(dx*nz*.5+.5)*255; d[i+1]=(dy*nz*.5+.5)*255; d[i+2]=(nz*.5+.5)*255; d[i+3]=255;}
  og.putImageData(img,0,0); return canvasTex(out,false);
}
function speckle(g,w,h,R,n,cols,smin,smax,alpha){
  for(let i=0;i<n;i++){g.globalAlpha=alpha*(.4+R()*.6); g.fillStyle=cols[Math.floor(R()*cols.length)]; const s=smin+R()*(smax-smin); g.fillRect(R()*w,R()*h,s,s);}
  g.globalAlpha=1;
}
function roadTextures(th){
  const R=rng(11), base=mix(th.road[0],'#3a3b3e',.65);
  const height=mk(512,512,(g,w,h)=>{g.fillStyle='#808080'; g.fillRect(0,0,w,h); speckle(g,w,h,R,26000,['#ffffff','#000000','#a0a0a0','#505050'],1,2.6,.55);});
  const map=mk(512,512,(g,w,h)=>{
    g.fillStyle=base; g.fillRect(0,0,w,h);
    speckle(g,w,h,R,20000,[shade(base,.22),shade(base,-.22),shade(base,.1),shade(base,-.12)],1,1.8,.32);
    for(let i=0;i<30;i++){g.globalAlpha=.05; g.fillStyle=R()<.5?shade(base,.15):shade(base,-.15); ell(g,R()*w,R()*h,40+R()*120,40+R()*120); g.fill();} g.globalAlpha=1;
    for(let i=0;i<14;i++){g.globalAlpha=.08+R()*.08; g.fillStyle=shade(base,-.4); ell(g,R()*w,R()*h,20+R()*70,10+R()*40); g.fill();}
    g.globalAlpha=.06; g.fillStyle='#000'; g.fillRect(w*.16,0,w*.08,h); g.fillRect(w*.76,0,w*.08,h); g.fillRect(w*.43,0,w*.14,h); // tyre wear
    g.globalAlpha=.25; g.strokeStyle=shade(base,-.5); g.lineWidth=1.2;
    for(let i=0;i<6;i++){g.beginPath(); let x=R()*w,y=R()*h; g.moveTo(x,y); for(let k=0;k<6;k++){x+=(R()-.5)*40; y+=R()*30; g.lineTo(x,y);} g.stroke();}
    g.globalAlpha=.92; g.fillStyle='#f2f2ee';
    g.fillRect(w*.022,0,w*.016,h); g.fillRect(w*.962,0,w*.016,h);
    g.fillStyle=th.lane; [1/3,2/3].forEach(u=>g.fillRect(w*u-w*.008,0,w*.016,h*.27));
    g.globalCompositeOperation='destination-out'; speckle(g,w,h,R,3000,['#000'],1,3,.35); g.globalCompositeOperation='source-over';
    g.globalCompositeOperation='destination-over'; g.fillStyle=base; g.fillRect(0,0,w,h); g.globalCompositeOperation='source-over'; g.globalAlpha=1;
  });
  const branch=mk(256,256,(g,w,h)=>{g.drawImage(map,0,0,w,h); g.fillStyle='rgba(127,211,255,.85)';
    poly(g,[w*.35,h*.7,w*.5,h*.45,w*.65,h*.7,w*.58,h*.7,w*.5,h*.58,w*.42,h*.7]);});
  const check=mk(256,64,(g,w,h)=>{for(let x=0;x<16;x++) for(let y=0;y<4;y++){g.fillStyle=(x+y)%2?'#151515':'#f4f4f4'; g.fillRect(x*16,y*16,16,16);}});
  const curb=mk(64,128,(g,w,h)=>{g.fillStyle=th.rumble[0]; g.fillRect(0,0,w,h/2); g.fillStyle=th.rumble[1]; g.fillRect(0,h/2,w,h/2); speckle(g,w,h,R,600,['#000','#fff'],1,2,.15);});
  return {map:canvasTex(map),normal:normalMap(height,1.2),branch:canvasTex(branch),check:canvasTex(check),curb:canvasTex(curb)};
}
function groundTextures(th,sandy){
  const R=rng(23), g0=th.grass[0], g1=th.grass[1];
  const height=mk(512,512,(g,w,h)=>{g.fillStyle='#808080'; g.fillRect(0,0,w,h);
    if(sandy){for(let y=0;y<h;y+=6){g.strokeStyle=y%12?'#a0a0a0':'#606060'; g.lineWidth=2; g.beginPath(); for(let x=0;x<=w;x+=8) g.lineTo(x,y+Math.sin(x*.05+y*.3)*3); g.stroke();}}
    speckle(g,w,h,R,16000,['#fff','#000'],1,2.5,.35);});
  const map=mk(512,512,(g,w,h)=>{
    g.fillStyle=g0; g.fillRect(0,0,w,h);
    for(let i=0;i<60;i++){g.globalAlpha=.12; g.fillStyle=R()<.5?g1:shade(g0,.12); ell(g,R()*w,R()*h,30+R()*80,30+R()*80); g.fill();}
    g.globalAlpha=1;
    if(sandy) speckle(g,w,h,R,22000,[shade(g0,.2),shade(g0,-.2),shade(g1,-.1)],1,2,.5);
    else{ for(let i=0;i<9000;i++){const x=R()*w,y=R()*h,l=3+R()*7; g.strokeStyle=pick(R,[shade(g0,.25),shade(g0,-.25),shade(g1,-.15),shade(g0,.1)]); g.globalAlpha=.55; g.lineWidth=1.3; g.beginPath(); g.moveTo(x,y); g.lineTo(x+(R()-.5)*3,y-l); g.stroke();} g.globalAlpha=1;}
  });
  const walk=mk(256,256,(g,w,h)=>{g.fillStyle='#b9b6ae'; g.fillRect(0,0,w,h); speckle(g,w,h,R,5000,['#d6d3cb','#8f8c85'],1,2,.5);
    g.strokeStyle='rgba(70,68,64,.55)'; g.lineWidth=2; for(let i=0;i<=4;i++){g.beginPath(); g.moveTo(i*w/4,0); g.lineTo(i*w/4,h); g.moveTo(0,i*h/4); g.lineTo(w,i*h/4); g.stroke();}});
  const water=mk(256,256,(g,w,h)=>{const img=g.createImageData(w,h), d=img.data;
    for(let y=0;y<h;y++) for(let x=0;x<w;x++){const v=Math.sin(x/w*Math.PI*8+Math.sin(y/h*Math.PI*6)*1.5)*.5+Math.sin((x+y)/w*Math.PI*12)*.3+Math.sin(y/h*Math.PI*18+x/w*Math.PI*4)*.2; const c=128+v*90, i=(y*w+x)*4; d[i]=d[i+1]=d[i+2]=c; d[i+3]=255;}
    g.putImageData(img,0,0);});
  return {map:canvasTex(map),normal:normalMap(height,sandy?3:2),walk:canvasTex(walk),water:normalMap(water,3)};
}
/* Facades: one tile = a couple of floors and bays at real scale, tinted per building by vertex colour. */
const FACADE={
  office:{w:6,h:7.2}, stucco:{w:6,h:6}, haussmann:{w:6,h:6.4}, adobe:{w:6,h:6}, cottage:{w:6,h:6},
  wood:{w:6,h:6}, barn:{w:6,h:6}, metal:{w:6,h:6}, tower:{w:12,h:14.4}
};
function facadePaint(style,emit,v=0){ // v: layout variant 0-2, so neighbouring buildings differ
  const R=rng(style.length*977+3+v*131);
  return mk(512,512,(g,w,h)=>{
    const glass=(x,y,ww,hh,arch)=>{
      if(emit){ if(R()<.5){g.fillStyle=pick(R,['#ffd890','#ffe7b8','#fff0d0','#ffc870']); g.globalAlpha=.6+R()*.4; g.fillRect(x,y,ww,hh); g.globalAlpha=1;} return; }
      const gr=g.createLinearGradient(x,y,x+ww,y+hh); gr.addColorStop(0,'#5f7387'); gr.addColorStop(.45,'#26313d'); gr.addColorStop(1,'#1a222b');
      g.fillStyle=gr; g.beginPath(); if(arch){g.moveTo(x,y+hh); g.lineTo(x,y+ww/2); g.arc(x+ww/2,y+ww/2,ww/2,Math.PI,0); g.lineTo(x+ww,y+hh);} else g.rect(x,y,ww,hh); g.fill();
      g.fillStyle='rgba(255,255,255,.12)'; poly(g,[x+ww*.1,y+hh,x+ww*.5,y,x+ww*.7,y,x+ww*.3,y+hh]);
      if(R()<.5){g.fillStyle=pick(R,['rgba(230,220,200,.55)','rgba(180,150,120,.5)','rgba(240,240,240,.5)']); g.fillRect(x,y,ww*(.2+R()*.3),hh);}
    };
    if(emit){g.fillStyle='#000'; g.fillRect(0,0,w,h);}
    switch(style){
      case 'office': case 'tower':{
        if(v===1&&style==='office'){ // vertical concrete fins over dark glass
          if(!emit){g.fillStyle='#2a3440'; g.fillRect(0,0,w,h); for(let f=0;f<3;f++){g.fillStyle='rgba(120,150,180,.25)'; g.fillRect(0,f*h/3+8,w,h/3-16);}
            g.fillStyle='#d8d4cc'; for(let b=0;b<=8;b++) g.fillRect(b*w/8-7,0,14,h); g.fillStyle='rgba(0,0,0,.18)'; for(let b=0;b<=8;b++) g.fillRect(b*w/8+7,0,5,h);
            g.fillStyle='#c8c4bc'; for(let f=0;f<=3;f++) g.fillRect(0,f*h/3-5,w,10);}
          else for(let f=0;f<3;f++) for(let b=0;b<8;b++) if(R()<.4){g.fillStyle=pick(R,['#ffe2a6','#fff3d6','#cfe6ff']); g.globalAlpha=.4+R()*.6; g.fillRect(b*w/8+8,f*h/3+10,w/8-16,h/3-20); g.globalAlpha=1;}
          break;}
        if(v===2&&style==='office'){ // ribbon windows between concrete spandrels
          if(!emit){g.fillStyle='#e6e1d6'; g.fillRect(0,0,w,h); speckle(g,w,h,R,2500,['#d8d2c4','#f2eee4'],1,2,.4);
            for(let f=0;f<2;f++){const y=f*h/2+h*.14, gr=g.createLinearGradient(0,y,0,y+h*.24); gr.addColorStop(0,'#86a6c2'); gr.addColorStop(1,'#34485c'); g.fillStyle=gr; g.fillRect(0,y,w,h*.24);
              g.fillStyle='#55606a'; for(let b=0;b<=6;b++) g.fillRect(b*w/6-2,y,4,h*.24);}}
          else for(let f=0;f<2;f++) for(let b=0;b<6;b++) if(R()<.45){g.fillStyle=pick(R,['#ffe2a6','#fff3d6']); g.globalAlpha=.5+R()*.5; g.fillRect(b*w/6+3,f*h/2+h*.14,w/6-6,h*.24); g.globalAlpha=1;}
          break;}
        if(!emit){const tw=style==='tower'; g.fillStyle=tw?['#1b2534','#1a3230','#2e2418'][v]:'#7e95ab'; g.fillRect(0,0,w,h);}
        const FL=style==='tower'?4:2, BY=style==='tower'?6:4;
        for(let f=0;f<FL;f++) for(let b=0;b<BY;b++){const x=b*w/BY, y=f*h/FL;
          if(emit){ if(R()<.38){g.fillStyle=pick(R,['#ffe2a6','#fff3d6','#cfe6ff','#ffd27a']); g.globalAlpha=.25+R()*.75; g.fillRect(x+4,y+h/FL*.16,w/BY-8,h/FL*.72); g.globalAlpha=1;} continue; }
          const gr=g.createLinearGradient(x,y,x,y+h/FL); const tw=style==='tower';
          const TG=[['#2a3a52','#162030','#101826'],['#2c5a56','#163a38','#0e2624'],['#6a5232','#3a2c1a','#24190e']][v];
          gr.addColorStop(0,tw?TG[0]:'#bcd3e6'); gr.addColorStop(.6,tw?TG[1]:'#6f8aa3'); gr.addColorStop(1,tw?TG[2]:'#526b84');
          g.fillStyle=gr; g.fillRect(x+3,y+h/FL*.16,w/BY-6,h/FL*.8);
          g.fillStyle=`rgba(255,255,255,${.03+R()*.08})`; g.fillRect(x+3,y+h/FL*.16,w/BY-6,h/FL*.8);}
        if(!emit){g.fillStyle=style==='tower'?'#0e141e':'#5b6876'; for(let f=0;f<FL;f++) g.fillRect(0,f*h/FL,w,h/FL*.16); g.fillStyle=style==='tower'?'#3a4250':'#c9d1d9'; for(let b=0;b<=BY;b++) g.fillRect(b*w/BY-2,0,4,h);}
        break;}
      case 'stucco':{
        if(v===1){ // louvred shutters and security bars, the most common Nigerian house window
          if(!emit){g.fillStyle='#f3efe6'; g.fillRect(0,0,w,h); speckle(g,w,h,R,5000,['#e0d9cc','#fffaf0'],1,3,.5);}
          for(let f=0;f<2;f++) for(let b=0;b<2;b++){const x=b*w/2+w*.12, y=f*h/2+h*.14, ww=w*.26, hh=h*.26;
            if(emit){if(R()<.5){g.fillStyle=pick(R,['#ffd890','#ffe7b8']); g.globalAlpha=.5+R()*.4; g.fillRect(x,y,ww,hh); g.globalAlpha=1;} continue;}
            g.fillStyle='#e9e3d6'; g.fillRect(x-10,y-10,ww+20,hh+20); g.fillStyle='#2c343c'; g.fillRect(x,y,ww,hh);
            const sc=pick(R,['#3f6f8f','#6a4a32','#4a7a52','#8a8a86']); g.fillStyle=sc; g.fillRect(x,y,ww*.48,hh); g.fillRect(x+ww*.52,y,ww*.48,hh);
            g.fillStyle='rgba(0,0,0,.35)'; for(let k=y+6;k<y+hh;k+=9) {g.fillRect(x,k,ww*.48,3); g.fillRect(x+ww*.52,k,ww*.48,3);}
            g.strokeStyle='#24272b'; g.lineWidth=3; for(let k=x+6;k<x+ww;k+=12){g.beginPath(); g.moveTo(k,y); g.lineTo(k,y+hh); g.stroke();}
            g.fillStyle='rgba(60,50,40,.25)'; g.fillRect(x-10,y+hh+10,ww+20,5);}
          break;}
        if(v===2){ // wide aluminium sliding windows with a painted balcony band
          if(!emit){g.fillStyle='#efe9dc'; g.fillRect(0,0,w,h); speckle(g,w,h,R,4000,['#ddd4c4','#fbf6ea'],1,3,.5);
            g.fillStyle=pick(R,['#c86a3a','#3a7a8a','#8a5aa0','#5a8a3a']); g.globalAlpha=.85; g.fillRect(0,h*.46,w,h*.06); g.globalAlpha=1;}
          for(let f=0;f<2;f++){const y=f*h/2+h*.12, x=w*.08, ww=w*.84, hh=h*.24;
            if(emit){if(R()<.55){g.fillStyle=pick(R,['#ffd890','#fff0d0']); g.globalAlpha=.5+R()*.4; g.fillRect(x,y,ww,hh); g.globalAlpha=1;} continue;}
            const gr=g.createLinearGradient(x,y,x+ww,y+hh); gr.addColorStop(0,'#6f8597'); gr.addColorStop(1,'#26313d'); g.fillStyle=gr; g.fillRect(x,y,ww,hh);
            g.fillStyle='#b9bec4'; g.fillRect(x-4,y-4,ww+8,6); g.fillRect(x-4,y+hh-2,ww+8,6); for(let k=0;k<=4;k++) g.fillRect(x+k*ww/4-3,y,6,hh);
            if(R()<.6){g.fillStyle=pick(R,['rgba(220,200,170,.6)','rgba(180,60,60,.5)','rgba(60,90,160,.5)']); g.fillRect(x+ww*.55,y,ww*.2,hh);}}
          break;}
        if(!emit){g.fillStyle='#f3efe6'; g.fillRect(0,0,w,h); speckle(g,w,h,R,5000,['#e0d9cc','#fffaf0'],1,3,.5);
          g.fillStyle='rgba(120,100,80,.08)'; for(let i=0;i<6;i++) g.fillRect(R()*w,0,3+R()*8,h);}
        for(let f=0;f<2;f++) for(let b=0;b<2;b++){const x=b*w/2+w*.14, y=f*h/2+h*.12, ww=w*.22, hh=h*.3;
          if(!emit){g.fillStyle='#fbf8f2'; g.fillRect(x-8,y-8,ww+16,hh+14);}
          glass(x,y,ww,hh,true);
          if(!emit){g.fillStyle='#e8e2d6'; g.fillRect(x-10,y+hh,ww+20,8); g.fillStyle='rgba(60,50,40,.18)'; g.fillRect(x-10,y+hh+8,ww+20,4);
            if(f===0){g.strokeStyle='#3a3530'; g.lineWidth=3; g.strokeRect(x-14,y+hh*.62,ww+28,hh*.38); for(let k=x-14;k<x+ww+14;k+=9){g.beginPath(); g.moveTo(k,y+hh*.62); g.lineTo(k,y+hh); g.stroke();}}}}
        if(!emit){g.fillStyle='rgba(0,0,0,.06)'; g.fillRect(0,h/2-6,w,6);}
        break;}
      case 'haussmann':{
        if(!emit){g.fillStyle='#ece4d2'; g.fillRect(0,0,w,h); speckle(g,w,h,R,4000,['#d9cfba','#f8f2e4'],1,3,.5);
          g.strokeStyle='rgba(120,105,80,.35)'; g.lineWidth=1.5; for(let y=0;y<h;y+=h/12){g.beginPath(); g.moveTo(0,y); g.lineTo(w,y); g.stroke();}}
        for(let f=0;f<2;f++) for(let b=0;b<3;b++){const x=b*w/3+w*.08, y=f*h/2+h*.08, ww=w*.17, hh=h*.36;
          if(!emit){g.fillStyle='#f6f0e2'; g.fillRect(x-6,y-10,ww+12,10);}
          glass(x,y,ww,hh,false);
          if(!emit){g.strokeStyle='#1e2124'; g.lineWidth=2; g.strokeRect(x-4,y+hh*.66,ww+8,hh*.34); for(let k=x-4;k<x+ww+4;k+=6){g.beginPath(); g.moveTo(k,y+hh*.66); g.lineTo(k,y+hh); g.stroke();}}}
        if(!emit){g.fillStyle='rgba(90,80,60,.22)'; g.fillRect(0,h/2-8,w,8);}
        break;}
      case 'adobe':{
        if(!emit){g.fillStyle='#ead8bd'; g.fillRect(0,0,w,h); speckle(g,w,h,R,9000,['#d8c09c','#f6e8d2','#c9ae86'],1,4,.5);
          g.strokeStyle='rgba(120,80,50,.15)'; for(let i=0;i<12;i++){g.lineWidth=2+R()*4; g.beginPath(); const x=R()*w; g.moveTo(x,R()*h*.3); g.lineTo(x+(R()-.5)*20,h); g.stroke();}}
        for(let f=0;f<2;f++){const x=w*(.3+f*.15), y=f*h/2+h*.16, ww=w*.14, hh=h*.17;
          glass(x,y,ww,hh,false);
          if(!emit){g.strokeStyle='rgba(255,250,240,.85)'; g.lineWidth=4; g.strokeRect(x-12,y-12,ww+24,hh+24); g.beginPath(); for(let k=0;k<=8;k++) g.lineTo(x-12+k*(ww+24)/8,y-22-(k%2)*10); g.stroke();}}
        break;}
      case 'cottage': case 'wood':{
        if(!emit){g.fillStyle=style==='wood'?'#e8e4dc':'#f4f2ec'; g.fillRect(0,0,w,h); speckle(g,w,h,R,3000,['#d8d4cc','#ffffff'],1,3,.5);
          if(style==='wood'){g.strokeStyle='rgba(0,0,0,.16)'; g.lineWidth=2; for(let y=0;y<h;y+=14){g.beginPath(); g.moveTo(0,y); g.lineTo(w,y); g.stroke();}}}
        for(let f=0;f<2;f++){const x=w*.32, y=f*h/2+h*.14, ww=w*.36, hh=h*.24;
          if(!emit){g.fillStyle='#ffffff'; g.fillRect(x-8,y-8,ww+16,hh+16);}
          glass(x,y,ww,hh,false);
          if(!emit){g.fillStyle=style==='wood'?'#ffffff':'#2f6a4a'; g.fillRect(x-w*.1,y,w*.08,hh); g.fillRect(x+ww+w*.02,y,w*.08,hh); g.fillStyle='#ffffff'; g.fillRect(x+ww/2-2,y,4,hh);}}
        break;}
      case 'barn':{
        if(!emit){g.fillStyle='#e9e2dc'; g.fillRect(0,0,w,h); speckle(g,w,h,R,4000,['#d0c8c0','#ffffff'],1,3,.5);
          g.strokeStyle='rgba(0,0,0,.25)'; g.lineWidth=2; for(let x=0;x<w;x+=18){g.beginPath(); g.moveTo(x,0); g.lineTo(x,h); g.stroke();}}
        break;}
      case 'metal':{
        if(!emit){g.fillStyle='#d4d8de'; g.fillRect(0,0,w,h); for(let x=0;x<w;x+=10){const gr=g.createLinearGradient(x,0,x+10,0); gr.addColorStop(0,'#aab0b8'); gr.addColorStop(.5,'#eef1f4'); gr.addColorStop(1,'#9aa0a8'); g.fillStyle=gr; g.fillRect(x,0,10,h);}
          g.fillStyle='rgba(120,90,60,.12)'; for(let i=0;i<8;i++) g.fillRect(R()*w,R()*h,4,30+R()*60);}
        break;}
    }
  });
}
function facadeMat(style,night,v=0){
  const key='fac_'+style+v+(night?'_n':'');
  if(TEX[key]) return TEX[key];
  const map=canvasTex(facadePaint(style,false,v));
  const opts={map,vertexColors:true,roughness:style==='office'?.12:style==='tower'?.2:style==='metal'?.45:.88,metalness:style==='office'?.55:style==='tower'?.6:style==='metal'?.5:0};
  if(night||style==='tower'){opts.emissiveMap=canvasTex(facadePaint(style,true,v)); opts.emissive=new TH.Color(1,1,1); opts.emissiveIntensity=night?(style==='tower'||style==='office'?.85:1.1):.0;}
  return TEX[key]=new TH.MeshStandardMaterial(opts);
}
function leafCard(kind){
  const key='leaf_'+kind; if(TEX[key]) return TEX[key];
  const R=rng(kind.length*13);
  const c=mk(256,512,(g,w,h)=>{
    if(kind==='palm'){
      g.strokeStyle='#6f7a3a'; g.lineWidth=6; g.beginPath(); g.moveTo(w/2,h); g.lineTo(w/2,0); g.stroke();
      for(let y=h*.98;y>4;y-=7){const t=1-y/h, L=w*.48*Math.sin(Math.PI*Math.min(1,(1-t)*1.05+.05));
        [-1,1].forEach(s=>{g.strokeStyle=pick(R,['#3f7a2e','#4f8a36','#356b28','#5a963c']); g.lineWidth=5; g.beginPath(); g.moveTo(w/2,y); g.quadraticCurveTo(w/2+s*L*.5,y-10,w/2+s*L,y-22-R()*8); g.stroke();});}
    } else if(kind==='cluster'){
      for(let i=0;i<260;i++){const a=R()*Math.PI*2, d=Math.sqrt(R())*w*.46, x=w/2+Math.cos(a)*d, y=h/2+Math.sin(a)*d*1.9, s=7+R()*9, rot=R()*Math.PI;
        const v=170+Math.floor(R()*85); g.fillStyle=`rgb(${v-30},${v},${v-60})`;
        g.save(); g.translate(x,y); g.rotate(rot); g.beginPath(); g.ellipse(0,0,s,s*.48,0,0,Math.PI*2); g.fill(); g.restore();}
    } else {
      for(let i=0;i<70;i++){const x=w*(.15+R()*.7), y=h*(.05+R()*.95), l=h*(.25+R()*.55);
        g.strokeStyle=pick(R,kind==='wheat'?['#c9a74e','#e0c060','#b8963e']:['#8a8a52','#a3995e','#6d7347']); g.lineWidth=3; g.beginPath(); g.moveTo(x,h); g.quadraticCurveTo(x,h-l*.6,x+(R()-.5)*60,h-l); g.stroke();
        if(kind==='wheat'){g.fillStyle='#e8c86a'; ell(g,x+(R()-.5)*20,h-l,4,12); g.fill();}}
    }
  });
  const m=new TH.MeshStandardMaterial({map:canvasTex(c,true,false),alphaTest:.5,side:TH.DoubleSide,roughness:.9,vertexColors:true});
  return TEX[key]=m;
}

/* ---------- geometry helpers ---------- */
const WHITE=TH?new TH.Color(1,1,1):null;
function gPrep(geo,col){
  const g=geo.index?geo.toNonIndexed():geo, n=g.attributes.position.count;
  if(!g.attributes.uv) g.setAttribute('uv',new TH.BufferAttribute(new Float32Array(n*2),2));
  if(!g.attributes.normal) g.computeVertexNormals();
  const c=new Float32Array(n*3), cc=col||WHITE; for(let i=0;i<n;i++){c[i*3]=cc.r; c[i*3+1]=cc.g; c[i*3+2]=cc.b;}
  g.setAttribute('color',new TH.BufferAttribute(c,3));
  if(geo!==g) geo.dispose();
  return g;
}
function gMerge(list){
  let n=0; for(const g of list) n+=g.attributes.position.count;
  const P=new Float32Array(n*3),N=new Float32Array(n*3),U=new Float32Array(n*2),Cc=new Float32Array(n*3); let o=0;
  for(const g of list){const k=g.attributes.position.count; P.set(g.attributes.position.array,o*3); N.set(g.attributes.normal.array,o*3); U.set(g.attributes.uv.array,o*2); Cc.set(g.attributes.color.array,o*3); o+=k;}
  const m=new TH.BufferGeometry();
  m.setAttribute('position',new TH.BufferAttribute(P,3)); m.setAttribute('normal',new TH.BufferAttribute(N,3));
  m.setAttribute('uv',new TH.BufferAttribute(U,2)); m.setAttribute('color',new TH.BufferAttribute(Cc,3));
  m.computeBoundingSphere(); return m;
}
const _q=T3('Quaternion'), _e=T3('Euler');
function mat4(x,y,z,ry,s,sy){_e.set(0,ry,0); _q.setFromEuler(_e); return new TH.Matrix4().compose(new TH.Vector3(x,y,z),_q,new TH.Vector3(s,sy==null?s:sy,s));}
class Bucket{
  constructor(){this.m={};}
  add(key,geo,matrix,tint){const g=geo.clone(); if(matrix) g.applyMatrix4(matrix);
    if(tint){const c=g.attributes.color.array; for(let i=0;i<c.length;i+=3){c[i]*=tint.r; c[i+1]*=tint.g; c[i+2]*=tint.b;}}
    (this.m[key]||(this.m[key]=[])).push(g);}
  raw(key,geo){(this.m[key]||(this.m[key]=[])).push(geo);}
  addParts(parts,matrix,tint){for(const [k,g,noTint] of parts) this.add(k,g,matrix,noTint?null:tint);}
  build(group){for(const key in this.m){const list=this.m[key], mat=MAT[key]; if(!mat||!list.length) continue;
    const mesh=new TH.Mesh(gMerge(list),mat); mesh.castShadow=!NOSHADOW.has(key)&&R3.quality==='high'; /* on Fast, scenery receives shadows but does not cast them */ mesh.receiveShadow=true; mesh.matrixAutoUpdate=false; group.add(mesh); list.forEach(g=>g.dispose());}}
}
const RIVAL_MODEL={okafor:'exec',laurent:'estate',chen:'hatch',muller:'offroad',sharma:'suvmid'};
const TRAFFIC_MODELS=['saloon','saloon','hatch','minivan','suvmid','hilux','estate','exec','offroad','saloon','bus','hatch'];
const TRAFFIC_COLS=['#c8ccd2','#1d1f24','#8a8f96','#e8e8ea','#c9a24a','#5a1a22','#2a3a5a','#f0f0ee','#6a6e72'];
const NOSHADOW=new Set(['zebra','kerbBW','kerbMulti','leafCard','road','curb','walk','ground','groundFar','water','branch','check','bulb','glow','neonCut','tlRed','tlAmber','tlGreen','shopSign']);
function hash3(x,y,z){const s=Math.sin(x*12.9898+y*78.233+z*37.719)*43758.5453; return s-Math.floor(s);}
function blob(r,col,R,squash=1,lumpy=.3){
  const g=new TH.IcosahedronGeometry(r,2), p=g.attributes.position, nrm=new Float32Array(p.count*3);
  for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i), l=Math.hypot(x,y,z)||1, k=1+(hash3(Math.round(x*50),Math.round(y*50),Math.round(z*50))-.5)*lumpy;
    nrm[i*3]=x/l; nrm[i*3+1]=y/l; nrm[i*3+2]=z/l; p.setXYZ(i,x*k,y*k*squash,z*k);}
  g.setAttribute('normal',new TH.BufferAttribute(nrm,3));
  const out=gPrep(g,col), c=out.attributes.color.array, pp=out.attributes.position;
  for(let i=0;i<pp.count;i++){const t=(pp.getY(i)/(r*squash)+1)/2, v=.62+t*.5+(hash3(pp.getX(i),pp.getY(i)*3,pp.getZ(i))-.5)*.25; c[i*3]*=v; c[i*3+1]*=v; c[i*3+2]*=v;}
  return out;
}
const tr=(g,x,y,z)=>{g.translate(x,y,z); return g;};

/* ---------- tree and prop templates (built at the 2D sprite's nominal size) ---------- */
const TPL={};
function templates(kind,variants){
  const key=kind; if(TPL[key]) return TPL[key];
  const out=[], R=rng(kind.length*101+7);
  for(let v=0;v<variants;v++) out.push(makeTemplate(kind,R,v));
  return TPL[key]=out;
}
function leafCards(P,cx,cy,cz,r,col,R,n,squash=1){ // crossed cards of small leaves that break up the canopy outline
  for(let i=0;i<n;i++){const s=r*(1.3+R()*.6), g=new TH.PlaneGeometry(s,s*squash);
    g.rotateY(R()*Math.PI); g.rotateX((R()-.5)*1.2);
    g.translate(cx+(R()-.5)*r*1.1,cy+(R()-.5)*r*.9*squash,cz+(R()-.5)*r*1.1);
    P.push(['leafCard',gPrep(g,col)]);}
}
function makeTemplate(kind,R,v){
  const P=[]; const bark=C3('#5d4a3a'), cards=R3.quality==='high'?7:4;
  switch(kind){
    case 'tree':{const h=2.6+R()*.8; P.push(['bark',gPrep(tr(new TH.CylinderGeometry(.15,.28,h+1,7),0,(h+1)/2,0),bark)]);
      for(let i=0;i<5;i++){const r=1.15+R()*.6, x=(R()-.5)*2, y=h+.8+R()*1.6, z=(R()-.5)*2, col=C3(pick(R,['#4f8f2a','#5fa232','#3f7d24','#6aa83a']));
        P.push(['leaf',tr(blob(r,col,R),x,y,z)]); leafCards(P,x,y,z,r,col,R,cards);} break;}
    case 'pine':{const h=9+R()*3; P.push(['bark',gPrep(tr(new TH.CylinderGeometry(.12,.25,h*.4,6),0,h*.2,0),bark)]);
      for(let i=0;i<6;i++){const t=i/6, r=2.2*(1-t*.8)+.3, g=new TH.ConeGeometry(r,h*.28,9,1,true); const p=g.attributes.position;
        for(let k=0;k<p.count;k++){p.setX(k,p.getX(k)*(1+(hash3(k,i,1)-.5)*.25)); p.setZ(k,p.getZ(k)*(1+(hash3(k,i,2)-.5)*.25));}
        g.computeVertexNormals(); P.push(['leaf',tr(gPrep(g,C3(pick(R,['#2d5238','#24452f','#355c3f']))),0,h*(.25+t*.68),0)]);}
      break;}
    case 'poplar':{const h=10+R()*3; P.push(['bark',gPrep(tr(new TH.CylinderGeometry(.1,.2,h*.5,6),0,h*.25,0),bark)]);
      for(let i=0;i<3;i++){const col=C3(pick(R,['#c98a2e','#d9a240','#a8642a','#8a7a2e'])), y=h*(.45+i*.12);
        P.push(['leaf',tr(blob(1.25,col,R,2.4),(R()-.5)*.5,y,(R()-.5)*.5)]); leafCards(P,0,y,0,1.2,col,R,cards,2);} break;}
    case 'palm':{const h=7+R()*2.5, lean=(R()-.5)*1.4; let px=0,py=0;
      for(let i=0;i<9;i++){const t=i/9, nx=lean*t*t, ny=h*(i+1)/9, len=Math.hypot(nx-px,ny-py);
        const g=new TH.CylinderGeometry(.17-t*.05,.2-t*.05,len,7); const ang=Math.atan2(nx-px,ny-py);
        g.rotateZ(-ang); g.translate((px+nx)/2,(py+ny)/2,0); P.push(['bark',gPrep(g,C3(i%2?'#7a6248':'#8d735a'))]); px=nx; py=ny;}
      const leafMat='palmLeaf';
      for(let k=0;k<11;k++){const L=3.2+R()*1.2, rows=7, pos=[], uv=[];
        for(let r=0;r<=rows;r++){const t=r/rows, x=t*L, y=t*L*.3-t*t*L*.62, hw=(.12+.45*Math.sin(Math.PI*Math.min(1,t*1.05)))*.9;
          pos.push(x,y,-hw, x,y+.08,0, x,y,hw); uv.push(0,1-t,.5,1-t,1,1-t);}
        const idx=[]; for(let r=0;r<rows;r++){const a=r*3; idx.push(a,a+1,a+3, a+1,a+4,a+3, a+1,a+2,a+4, a+2,a+5,a+4);}
        const g=new TH.BufferGeometry(); g.setAttribute('position',new TH.Float32BufferAttribute(pos,3)); g.setAttribute('uv',new TH.Float32BufferAttribute(uv,2)); g.setIndex(idx); g.computeVertexNormals();
        g.rotateZ(.25-R()*.35); g.rotateY(k/11*Math.PI*2+R()*.3); g.translate(px,py,0); P.push([leafMat,gPrep(g)]);}
      for(let k=0;k<3;k++) P.push(['bark',gPrep(tr(new TH.SphereGeometry(.16,6,5),px+Math.cos(k*2)*.22,py-.25,Math.sin(k*2)*.22),C3('#4a3420'))]);
      break;}
    case 'baobab':{const prof=[]; for(let i=0;i<=8;i++){const t=i/8; prof.push(new TH.Vector2(1.6*Math.sin(Math.PI*(.15+t*.7))*(1-t*.35)+.3,t*6));}
      P.push(['bark',gPrep(new TH.LatheGeometry(prof,10),C3('#8a7b6c'))]);
      for(let i=0;i<6;i++){const a=i/6*Math.PI*2, g=new TH.CylinderGeometry(.12,.3,3,6); g.rotateZ(.9); g.rotateY(a); g.translate(Math.cos(a)*1.1,6.6,-Math.sin(a)*1.1); P.push(['bark',gPrep(g,C3('#7a6b5c'))]);
        P.push(['leaf',tr(blob(.9,C3('#5d7a3a'),R,.7),Math.cos(a)*2.3,7.6,-Math.sin(a)*2.3)]);}
      break;}
    case 'acacia':{[[-.4,.5],[.5,-.4]].forEach(([a,b])=>{const g=new TH.CylinderGeometry(.08,.16,4.2,6); g.rotateZ(a*.6); g.rotateX(b*.4); g.translate(a,2,b*.5); P.push(['bark',gPrep(g,bark)]);});
      P.push(['leaf',tr(blob(3.4,C3('#6f7f3a'),R,.22,.4),0,4.4,0)]); P.push(['leaf',tr(blob(2.2,C3('#7d8d44'),R,.25,.4),.8,4.8,.6)]);
      leafCards(P,0,4.5,0,2.6,C3('#76863e'),R,cards,.35); break;}
    case 'bush':{for(let i=0;i<4;i++){const col=C3(pick(R,['#4f7a2a','#5f8a32','#46702a'])), x=(R()-.5)*1.4, z=(R()-.5)*1.4;
      P.push(['leaf',tr(blob(.6+R()*.4,col,R,.8),x,.45,z)]); if(i<2) leafCards(P,x,.5,z,.7,col,R,2,.8);} break;}
    case 'hedge':{const col=C3(pick(R,['#2c5a22','#336628','#28501f'])); P.push(['leaf',tr(blob(.75,col,R,.8,.18),0,.55,0)]); break;}
    case 'lamp2':{P.push(['metalDark',gPrep(tr(new TH.CylinderGeometry(.08,.13,8,8),0,4,0))]);
      for(const sd of [-1,1]){P.push(['metalDark',gPrep(tr(new TH.BoxGeometry(.08,.08,1.8),0,7.9,sd*.85))]); P.push(['metalDark',gPrep(tr(new TH.BoxGeometry(.32,.16,.6),0,7.8,sd*1.7))]); P.push(['bulb',gPrep(tr(new TH.BoxGeometry(.26,.04,.5),0,7.71,sd*1.7))]);}
      break;}
    case 'grassTuft':{for(let i=0;i<3;i++){const g=new TH.PlaneGeometry(1.1,.7); g.translate(0,.35,0); g.rotateY(i*Math.PI/3); P.push(['grassCard',gPrep(g,C3('#9fbf6a'))]);} break;}
    case 'stone':{const g=new TH.DodecahedronGeometry(.35+R()*.3,0), p=g.attributes.position; for(let k=0;k<p.count;k++) p.setY(k,p.getY(k)*.55); g.computeVertexNormals(); P.push(['rock',tr(gPrep(g,C3(pick(R,['#8a857c','#9a958c','#7a766e']))),0,.08,0)]); break;}
    case 'dunegrass': case 'wheat':{for(let i=0;i<3;i++){const g=new TH.PlaneGeometry(1.6,1.1); g.translate(0,.55,0); g.rotateY(i*Math.PI/3); P.push([kind==='wheat'?'wheatCard':'grassCard',gPrep(g)]);} break;}
    case 'lamp':{P.push(['metalDark',gPrep(tr(new TH.CylinderGeometry(.07,.11,7.5,8),0,3.75,0))]);
      P.push(['metalDark',gPrep(tr(new TH.BoxGeometry(.08,.08,1.8),0,7.4,-.85))]);
      P.push(['metalDark',gPrep(tr(new TH.BoxGeometry(.32,.16,.6),0,7.3,-1.7))]);
      P.push(['bulb',gPrep(tr(new TH.BoxGeometry(.26,.04,.5),0,7.21,-1.7))]); break;}
    case 'pole':{P.push(['wood',gPrep(tr(new TH.CylinderGeometry(.12,.16,9,7),0,4.5,0))]); P.push(['wood',gPrep(tr(new TH.BoxGeometry(2.2,.12,.12),0,8.4,0))]);
      [-.9,-.3,.3,.9].forEach(x=>P.push(['glassLow',gPrep(tr(new TH.CylinderGeometry(.05,.05,.18,6),x,8.55,0),C3('#8fb4bf'))]));
      break;}
  }
  return P;
}

/* ---------- buildings ---------- */
const STYLE_OF={phhouse:'stucco',adobe:'adobe',horreo:'cottage',cottage:'cottage',haussmann:'haussmann',colonial:'stucco',office:'office',tower:'tower',barn:'barn',silo:'metal',craftsman:'wood',hangar:'metal'};
function quadsBox(w,d,h,tw,th){ // four walls with real-scale UVs, open top/bottom
  const pos=[],nrm=[],uv=[], hw=w/2, hd=d/2;
  const face=(ax,az,bx,bz,nx,nz,len)=>{const u1=len/tw, v1=h/th;
    pos.push(ax,0,az, bx,0,bz, bx,h,bz, ax,0,az, bx,h,bz, ax,h,az); for(let i=0;i<6;i++) nrm.push(nx,0,nz);
    uv.push(0,0, u1,0, u1,v1, 0,0, u1,v1, 0,v1);};
  face(-hw,hd,hw,hd,0,1,w); face(hw,hd,hw,-hd,1,0,d); face(hw,-hd,-hw,-hd,0,-1,w); face(-hw,-hd,-hw,hd,-1,0,d);
  const g=new TH.BufferGeometry(); g.setAttribute('position',new TH.Float32BufferAttribute(pos,3)); g.setAttribute('normal',new TH.Float32BufferAttribute(nrm,3)); g.setAttribute('uv',new TH.Float32BufferAttribute(uv,2));
  return gPrep(g);
}
function prism(w,d,h,y0){ // gable roof along x
  const g=new TH.BufferGeometry(), hw=w/2, hd=d/2;
  const v=[-hw,y0,hd, hw,y0,hd, hw,y0+h,0, -hw,y0,hd, hw,y0+h,0, -hw,y0+h,0,  hw,y0,-hd, -hw,y0,-hd, -hw,y0+h,0, hw,y0,-hd, -hw,y0+h,0, hw,y0+h,0,
    -hw,y0,-hd, -hw,y0,hd, -hw,y0+h,0,  hw,y0,hd, hw,y0,-hd, hw,y0+h,0];
  g.setAttribute('position',new TH.Float32BufferAttribute(v,3)); g.computeVertexNormals(); return gPrep(g);
}
const SHOP_NAMES=['MAMA BISI PROVISIONS','GLORY PHARMACY','EKO PHONES','BLESSED HAIR SALON','CHUKS AUTO PARTS','NEW DAWN BAKERY','ADE & SONS TAILORS','FAITH SUPERMART',
  'GOLDEN SPOON KITCHEN','BRIGHT FUTURE SCHOOL','OKON ELECTRICALS','SWEET HOME FURNITURE','SPEEDY PRINTS','UNITY MOTORS','ROYAL FABRICS','FRESH FARM FOODS'];
function signAtlas(){ if(TEX.signAtlas) return TEX.signAtlas; // original fictional shop names, 4x4 cells
  const c=mk(1024,256,(g,w,h)=>{const cw=w/4, ch=h/4, BG=['#1f5fa8','#c8321f','#1f7a3a','#e0a020','#5a2a8a','#1a1c20','#0f6a7a','#b0442a'];
    SHOP_NAMES.forEach((n,i)=>{const x=(i%4)*cw, y=Math.floor(i/4)*ch, bg=BG[i%BG.length]; g.fillStyle=bg; g.fillRect(x,y,cw,ch); g.fillStyle='rgba(255,255,255,.18)'; g.fillRect(x,y,cw,6);
      g.fillStyle=bg==='#e0a020'?'#1a1c20':'#ffffff'; g.font='bold 30px sans-serif'; g.textAlign='center'; g.textBaseline='middle';
      let fs=30; while(g.measureText(n).width>cw-18&&fs>14){fs-=2; g.font=`bold ${fs}px sans-serif`;} g.fillText(n,x+cw/2,y+ch/2+2);});});
  return TEX.signAtlas=canvasTex(c,true,false);}
function shopSignGeo(i,len,hgt){ // a sign board whose UVs point at one atlas cell
  const g=new TH.PlaneGeometry(len,hgt), u=g.attributes.uv, cx=(i%4)/4, cy=1-(Math.floor(i/4)+1)/4;
  for(let k=0;k<u.count;k++) u.setXY(k,cx+u.getX(k)/4,cy+u.getY(k)/4); return g;}
function addBuilding(B,kind,x,y,z,ry,w,R,night,face=0){ // face: +1/-1 = which local x side looks onto the road (0 = far from the road, keep simple)
  const style=STYLE_OF[kind], F=FACADE[style], v=(style==='stucco'||style==='office'||style==='tower')?Math.floor(R()*3):0, matKey='fac_'+style+v;
  if(!MAT[matKey]) MAT[matKey]=facadeMat(style,night,v);
  let d=w*(.7+R()*.3), h;
  switch(kind){case 'phhouse': h=(1+Math.floor(R()*3))*3.2+.4; d=w*(.75+R()*.3); break; case 'adobe': h=w*.55+R()*1.5; break; case 'cottage': case 'horreo': h=w*.5; break; case 'haussmann': h=Math.max(17,w*1.4); break;
    case 'colonial': h=w*(.9+R()*.4); break; case 'office': h=w*(2+R()*1.8); break; case 'tower': h=w*(3.5+R()*2.5); break;
    case 'barn': h=w*.55; break; case 'craftsman': h=w*.45; break; case 'hangar': h=w*.9; d=w*1.2; break; default: h=w;}
  const M=mat4(x,y,z,ry,1);
  const tints={adobe:['#e8c49a','#d9a878','#f0d4b0'],cottage:['#ffffff','#f4efe6'],haussmann:['#fff6e6','#f4e8d0'],
    stucco:['#f2c46a','#e89a9a','#9fd0c8','#f4e4c8','#c9b0e0','#f6f0e4','#a8d8a8'],office:['#bcd6f0','#a6e0e0','#d0d8e0','#9ec2e8'],tower:['#ffffff'],
    barn:['#b8382a','#a83226'],metal:['#ffffff','#e8ecf0'],wood:['#5f7f8f','#6a8a5a','#8a6a4a','#7a7a8a','#d8d0c0']}[style];
  const tint=C3(pick(R,tints));
  if(kind==='silo'){const g=new TH.CylinderGeometry(w*.42,w*.42,w*2.6,16,1,true); g.translate(0,w*1.3,0);
    const uvs=g.attributes.uv; for(let i=0;i<uvs.count;i++) uvs.setXY(i,uvs.getX(i)*w*2.64/F.w,uvs.getY(i)*w*2.6/F.h);
    B.add(matKey,gPrep(g),M,tint); B.add('metal',gPrep(tr(new TH.SphereGeometry(w*.42,16,6,0,Math.PI*2,0,Math.PI/2),0,w*2.6,0)),M); return;}
  B.add(matKey,quadsBox(w,d,h,F.w,F.h),M,tint);
  B.add('concrete',gPrep(tr(new TH.BoxGeometry(w+.1,.6,d+.1),0,.3,0),C3('#8a8a86')),M);
  if(face&&(kind==='phhouse'||kind==='colonial'||kind==='office')) streetFront(B,M,kind,w,d,h,face,R);
  if(kind==='office'&&h>16&&R()<.5){const s2=.62+R()*.15, h2=h*(.25+R()*.2); B.add(matKey,quadsBox(w*s2,d*s2,h2,F.w,F.h),mat4(0,h,0,0,1).premultiply(M),tint); // set-back upper storeys
    B.add('roof',gPrep(tr(new TH.BoxGeometry(w*s2+.3,.5,d*s2+.3),0,h+h2+.25,0)),M);}
  switch(kind){
    case 'cottage': case 'horreo': case 'craftsman': B.add('tile',prism(w+.8,d+.8,w*.32,h),M,kind==='craftsman'?C3('#3a3a40'):null); break;
    case 'barn': B.add('roofDark',prism(w+.6,d+.6,w*.4,h),M); break;
    case 'phhouse':{
      if(R()<.72){const g=new TH.CylinderGeometry(.16,Math.SQRT1_2*1.06,1,4,1); g.rotateY(Math.PI/4); const rh=1.3+R()*.9; g.scale(w+.8,rh,d+.8); g.translate(0,h+rh/2,0);
        B.add('corr',gPrep(g),M,C3(pick(R,['#8a4a2a','#6e4a34','#2f5f9e','#9a2e24','#2f7a4a','#7a7a7a','#a0562c'])));}
      else{B.add('roof',gPrep(tr(new TH.BoxGeometry(w+.3,.6,d+.3),0,h+.3,0)),M);
        B.add('metalDark',gPrep(tr(new TH.CylinderGeometry(.7,.7,1.5,12),w*.2,h+1.95,d*.15),C3('#1a1c20')),M);
        for(const sx of [-1,1]) for(const sz of [-1,1]) B.add('metalDark',gPrep(tr(new TH.BoxGeometry(.1,.8,.1),w*.2+sx*.5,h+.8,d*.15+sz*.5)),M);}
      break;}
    case 'haussmann':{const g=new TH.CylinderGeometry(Math.SQRT1_2*.82,Math.SQRT1_2,1,4,1); g.rotateY(Math.PI/4); g.scale(w,3.2,d); g.translate(0,h+1.6,0); B.add('slate',gPrep(g),M);
      for(let i=-1;i<=1;i++) B.add('slate',gPrep(tr(new TH.BoxGeometry(1,1.2,1),i*w/3.2,h+2,d*.42)),M);
      B.add('brick',gPrep(tr(new TH.BoxGeometry(1.2,2,.8),w*.3,h+3.6,0)),M); break;}
    case 'hangar':{const g=new TH.CylinderGeometry(d*.6,d*.6,w,16,1,false,0,Math.PI); g.rotateZ(Math.PI/2); g.rotateY(Math.PI/2); g.scale(1,.35,1); g.translate(0,h,0); B.add('metal',gPrep(g),M);
      B.add('bulb',gPrep(tr(new TH.BoxGeometry(w*.4,h*.75,.1),0,h*.375,d/2+.06)),M); break;}
    default:{B.add('roof',gPrep(tr(new TH.BoxGeometry(w+.3,.5,d+.3),0,h+.25,0)),M);
      if(kind==='adobe'){[[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([a,b])=>B.add(matKey,gPrep(tr(new TH.ConeGeometry(.35,1.6,6),a*w/2,h+1.2,b*d/2)),M,tint));}
      if(kind==='office'||kind==='tower'){B.add('concrete',gPrep(tr(new TH.BoxGeometry(w*.35,2.4,d*.35),w*.15,h+1.7,0),C3('#9a9a9a')),M);
        if(R()<.6) B.add('metalDark',gPrep(tr(new TH.CylinderGeometry(.06,.06,8,5),-w*.2,h+4.5,d*.2)),M);}
      if(kind==='colonial'){B.add('roof',gPrep(tr(new TH.BoxGeometry(w+.6,1,.4),0,h+.5,d/2)),M,tint);}}
  }
}

function streetFront(B,M,kind,w,d,h,face,R){ // shopfront, awning and sign on the ground floor; balconies, AC units and tanks above
  const fx=face*w/2, floors=Math.max(1,Math.round(h/3.2)), shop=kind!=='office'?R()<.75:R()<.5;
  const sideBox=(key,sx,sy,sz,ox,oy,oz,col)=>B.add(key,gPrep(tr(new TH.BoxGeometry(sx,sy,sz),fx+face*ox,oy,oz),col?C3(col):null),M);
  if(shop){const len=d*(.62+R()*.25);
    sideBox('shopGlass',.06,2.4,len,.03,1.85,0); sideBox('metalDark',.1,.12,len+.2,.05,3.1,0);
    const aw=new TH.BoxGeometry(1.3,.05,len+.3); aw.rotateZ(face*.32); aw.translate(fx+face*.62,3.25,0); B.add('canopyMat',gPrep(aw,C3(pick(R,['#c8321f','#1f5fa8','#1f7a3a','#e0a020','#e8e4dc','#7a3a8a']))),M);
    const sg=shopSignGeo(Math.floor(R()*SHOP_NAMES.length),Math.min(len,5.5),.8); sg.rotateY(face*Math.PI/2); sg.translate(fx+face*.08,3.85,0); B.add('shopSign',gPrep(sg),M);}
  if(floors>=2&&kind!=='office'&&R()<.55) for(let f=1;f<floors;f++){const len=d*(.35+R()*.2), oz=(R()-.5)*d*.3;
    sideBox('concrete',.95,.14,len,.47,f*3.2+.35,oz,'#c8c2b6'); sideBox('metalDark',.05,.95,len,.94,f*3.2+.88,oz); sideBox('metalDark',.9,.05,.05,.47,f*3.2+1.33,oz-len/2); sideBox('metalDark',.9,.05,.05,.47,f*3.2+1.33,oz+len/2);}
  for(let f=1;f<floors;f++) if(R()<.5) sideBox('metal',.55,.45,.75,.28,f*3.2+.9,(R()-.5)*d*.6,'#d8dadc');
  if(kind!=='office'&&R()<.6){const t=new TH.CylinderGeometry(.62,.62,1.35,14); t.translate((R()-.5)*w*.4,h+.68+(kind==='phhouse'?1.4:0),(R()-.5)*d*.4); B.add('metalDark',gPrep(t,C3(pick(R,['#141518','#1a1c20','#2a4a8a']))),M);}
}

/* ---------- landmarks (real scale, placed well back from the road) ---------- */
function lmMat(hex,o={}){return new TH.MeshStandardMaterial(Object.assign({color:C3(hex),roughness:.75,metalness:0},o));}
function latticeTex(){if(TEX.lattice) return TEX.lattice;
  const c=mk(128,128,(g,w,h)=>{g.strokeStyle='#fff'; g.lineWidth=7; g.strokeRect(0,0,w,h); g.lineWidth=5; g.beginPath(); g.moveTo(0,0); g.lineTo(w,h); g.moveTo(w,0); g.lineTo(0,h); g.stroke();});
  return TEX.lattice=canvasTex(c,false);}
function landmark3D(kind,night){
  const G=new TH.Group(); let size=40;
  const add=(geo,mat,x=0,y=0,z=0)=>{const m=new TH.Mesh(geo,mat); m.position.set(x,y,z); m.castShadow=true; m.receiveShadow=true; G.add(m); return m;};
  switch(kind){
    case 'eiffel':{const iron=lmMat('#6e5640',{alphaMap:latticeTex(),alphaTest:.4,side:TH.DoubleSide,metalness:.4,roughness:.6}); const solid=lmMat('#5e4834',{metalness:.4});
      const leg=(x,z)=>{const g=new TH.CylinderGeometry(2.2,5.5,62,4,1,true); g.rotateY(Math.PI/4); g.translate(0,31,0); const m=add(g,iron,x,0,z); m.rotation.z=x>0?.23:-.23; m.rotation.x=z>0?-.23:.23; m.position.set(x*.86,0,z*.86);};
      [[-26,-26],[26,-26],[-26,26],[26,26]].forEach(([x,z])=>leg(x,z));
      add(new TH.BoxGeometry(44,3,44),solid,0,58,0);
      const g2=new TH.CylinderGeometry(4,15,60,4,1,true); g2.rotateY(Math.PI/4); add(g2,iron,0,90,0);
      add(new TH.BoxGeometry(16,2,16),solid,0,118,0);
      const g3=new TH.CylinderGeometry(1.2,4,95,4,1,true); g3.rotateY(Math.PI/4); add(g3,iron,0,166,0);
      add(new TH.BoxGeometry(5,4,5),solid,0,214,0); add(new TH.CylinderGeometry(.4,.6,14,6),solid,0,223,0);
      if(night){const lights=new TH.Points(new TH.BufferGeometry().setFromPoints(Array.from({length:600},(_,i)=>{const y=Math.random()*215, s=y<60?27-y*.3:y<120?15-(y-60)*.18:4-(y-120)*.03; return new TH.Vector3((Math.random()-.5)*2*s,y,(Math.random()-.5)*2*s);})),new TH.PointsMaterial({color:0xffe6a0,size:1.2,fog:false})); G.add(lights);}
      size=70; break;}
    case 'linkBridge':{const white=lmMat('#eef1f4',{roughness:.5});
      const g=new TH.CylinderGeometry(1.1,1.8,88,8); add(g,white,0,44,0);
      const cable=lmMat('#dfe4ea',{roughness:.4,metalness:.6});
      for(let i=1;i<=12;i++) for(const s of [-1,1]){const zEnd=s*i*9, yTop=86-i*2.6, len=Math.hypot(zEnd,yTop-1.5), cg=new TH.CylinderGeometry(.08,.08,len,4);
        const m=add(cg,cable,0,(yTop+1.5)/2,zEnd/2); m.rotation.x=-Math.atan2(zEnd,yTop-1.5); m.position.x=-3;}
      size=20; break;}
    case 'portCranes':{const red=lmMat('#c8321f',{roughness:.6}), white=lmMat('#eef0f2');
      [-22,22].forEach(cx=>{[[-7,-6],[7,-6],[-7,6],[7,6]].forEach(([x,z])=>add(new TH.BoxGeometry(1.3,40,1.3),red,cx+x,20,z));
        add(new TH.BoxGeometry(16,2.4,14),red,cx,40,0); add(new TH.BoxGeometry(3,2.6,70),white,cx,44,-14); add(new TH.BoxGeometry(5,4,5),white,cx,47,0);});
      const cols=['#c8321f','#2a64c8','#e8b04b','#2d9a5a','#e7e7ea','#8a3fd0','#d86a1f'];
      for(let i=0;i<40;i++){const c=lmMat(cols[i%cols.length],{roughness:.7}); add(new TH.BoxGeometry(12,2.6,2.4),c,-30+(i%5)*13,1.3+Math.floor(i/20)*2.6,18+Math.floor(i%20/5)*2.6);}
      size=70; break;}
    case 'needle':{const w=lmMat('#e8e4dc',{roughness:.5});
      for(let i=0;i<3;i++){const a=i/3*Math.PI*2; const g=new TH.CylinderGeometry(.9,1.4,140,6); const m=add(g,w,Math.cos(a)*9,70,Math.sin(a)*9); m.rotation.z=-Math.cos(a)*.065; m.rotation.x=Math.sin(a)*.065;}
      add(new TH.CylinderGeometry(22,10,8,24),w,0,142,0); add(new TH.CylinderGeometry(19,19,3,24),lmMat('#f5c870',{emissive:C3('#f5c870'),emissiveIntensity:night?1:.1}),0,146,0);
      add(new TH.CylinderGeometry(14,20,3,24),w,0,149,0); add(new TH.CylinderGeometry(.5,1,35,6),w,0,168,0);
      size=50; break;}
    case 'starship':{const steel=new TH.MeshPhysicalMaterial({color:C3('#cfd4da'),metalness:1,roughness:.28,clearcoat:.3}), dark=lmMat('#2a2e38',{metalness:.5});
      const tower=lmMat('#3a3f4a',{alphaMap:latticeTex(),alphaTest:.4,side:TH.DoubleSide,metalness:.5});
      add(new TH.BoxGeometry(12,145,12),tower,-22,72.5,0);
      add(new TH.BoxGeometry(14,3,4),dark,-12,95,-6); add(new TH.BoxGeometry(14,3,4),dark,-12,95,6);
      add(new TH.CylinderGeometry(4.5,4.5,71,24),steel,0,36+20,0); add(new TH.BoxGeometry(14,20,14),dark,0,10,0);
      const ship=new TH.Group(); const s1=new TH.Mesh(new TH.CylinderGeometry(4.5,4.5,40,24),steel); s1.position.y=20; const nose=new TH.Mesh(new TH.SphereGeometry(4.5,24,12,0,Math.PI*2,0,Math.PI/2),steel); nose.scale.y=2; nose.position.y=40;
      ship.add(s1,nose); ship.position.y=91.5; G.add(ship); R3.ship=ship;
      size=45; break;}
    case 'gateway':{const st=lmMat('#c9a874',{roughness:.85});
      const shape=new TH.Shape(); shape.moveTo(-15,0); shape.lineTo(15,0); shape.lineTo(15,20); shape.lineTo(-15,20); shape.lineTo(-15,0);
      const hole=new TH.Path(); hole.moveTo(-5,0); hole.lineTo(-5,10); hole.absarc(0,10,5,Math.PI,0,true); hole.lineTo(5,0); hole.lineTo(-5,0); shape.holes.push(hole);
      const g=new TH.ExtrudeGeometry(shape,{depth:10,bevelEnabled:false}); g.translate(0,0,-5); add(g,st);
      [-12,-4,4,12].forEach(x=>{add(new TH.CylinderGeometry(2,2,6,12),st,x,23,0); add(new TH.SphereGeometry(2.2,12,8,0,Math.PI*2,0,Math.PI/2),st,x,26,0);});
      size=34; break;}
    case 'kanoGate':{const mud=lmMat('#b8784a',{roughness:.95});
      const shape=new TH.Shape(); shape.moveTo(-22,0); shape.lineTo(22,0); shape.lineTo(22,9); shape.lineTo(8,10); shape.lineTo(8,14); shape.lineTo(-8,14); shape.lineTo(-8,10); shape.lineTo(-22,9); shape.lineTo(-22,0);
      const hole=new TH.Path(); hole.moveTo(-3.2,0); hole.lineTo(-3.2,6); hole.absarc(0,6,3.2,Math.PI,0,true); hole.lineTo(3.2,0); hole.lineTo(-3.2,0); shape.holes.push(hole);
      const g=new TH.ExtrudeGeometry(shape,{depth:5,bevelEnabled:false}); g.translate(0,0,-2.5); add(g,mud);
      [-8,-3,3,8].forEach(x=>add(new TH.ConeGeometry(.9,4,6),mud,x,16,0));
      size=46; break;}
    case 'hercules':{const st=lmMat('#cfc6b2',{roughness:.9});
      add(new TH.BoxGeometry(14,40,14),st,0,20,0); add(new TH.BoxGeometry(11,8,11),st,0,44,0); add(new TH.BoxGeometry(8,5,8),st,0,50.5,0);
      add(new TH.CylinderGeometry(3,3,4,8),lmMat('#fff5c0',{emissive:C3('#ffe9a0'),emissiveIntensity:.8}),0,55,0);
      size=20; break;}
    case 'hkTower':{const glass=new TH.MeshStandardMaterial({color:C3('#1a2a44'),metalness:.8,roughness:.15});
      const g=new TH.CylinderGeometry(4,16,200,3); add(g,glass,0,100,0);
      const edge=new TH.LineSegments(new TH.EdgesGeometry(g),new TH.LineBasicMaterial({color:0xcfe6ff})); edge.position.y=100; G.add(edge);
      add(new TH.CylinderGeometry(.3,.5,40,6),lmMat('#c0c8d8'),0,220,0);
      size=34; break;}
    case 'derrick':{const steel=lmMat('#c8cdd2',{alphaMap:latticeTex(),alphaTest:.4,side:TH.DoubleSide,metalness:.6,roughness:.4}), solid=lmMat('#9aa0a6',{metalness:.6,roughness:.4});
      const red=lmMat('#c8321f',{roughness:.5}), conc=lmMat('#bdbab2',{roughness:.95});
      add(new TH.BoxGeometry(18,1,18),conc,0,.5,0);
      const g=new TH.CylinderGeometry(1.2,6.5,40,4,4,true); g.rotateY(Math.PI/4); add(g,steel,0,21,0);
      add(new TH.BoxGeometry(3.4,1.2,3.4),red,0,41.5,0); add(new TH.BoxGeometry(12,4.5,.4),solid,0,3.4,-6.2);
      add(new TH.BoxGeometry(9,.4,9),solid,0,9,0);
      const tree=[[0,1.6,.5],[0,3.0,.42]]; tree.forEach(([x,y,r])=>add(new TH.CylinderGeometry(r,r,1.2,10),red,x,y,0));
      add(new TH.CylinderGeometry(.18,.18,2,8),solid,0,2.5,1.4).rotation.x=Math.PI/2;
      add(new TH.BoxGeometry(3,1.6,.2),lmMat('#f4f4f4'),5,1.8,6);
      if(night){const lights=new TH.Points(new TH.BufferGeometry().setFromPoints(Array.from({length:40},(_,i)=>new TH.Vector3((Math.random()-.5)*(7-i*.12),i,(Math.random()-.5)*(7-i*.12)))),new TH.PointsMaterial({color:0xffd080,size:1.1,fog:false})); G.add(lights);}
      size=20; break;}
    case 'nigerBridge':{size=4; break;} // trusses are built along the river crossing
    case 'locomotive':{const black=lmMat('#1a1a1e',{metalness:.5,roughness:.4}), red=lmMat('#9a2a22');
      const b=new TH.CylinderGeometry(1.4,1.4,11,16); b.rotateZ(Math.PI/2); add(b,black,0,2.9,0);
      add(new TH.BoxGeometry(4,4.2,3.4),black,7,3.6,0); add(new TH.CylinderGeometry(.5,.7,2.2,10),black,-4,5,0);
      for(let i=0;i<4;i++) for(const z of [-1.3,1.3]){const w=new TH.CylinderGeometry(1,1,.3,16); w.rotateX(Math.PI/2); add(w,red,-3+i*2.6,1,z);}
      add(new TH.BoxGeometry(30,.3,.3),lmMat('#6a6a6a',{metalness:.8}),0,.15,-1.4); add(new TH.BoxGeometry(30,.3,.3),lmMat('#6a6a6a',{metalness:.8}),0,.15,1.4);
      size=16; break;}
  }
  G.userData.size=size; return G;
}

/* ---------- cars ---------- */
const CARGEO={};
function bodyShape(g,L,top){ // pull the sides in toward the roof and round the corners in plan view
  const p=g.attributes.position;
  for(let i=0;i<p.count;i++){const x=p.getX(i), y=p.getY(i), z=p.getZ(i);
    const tumble=1-smooth01(U.limit((y-.7)/.75,0,1))*top, end=1-Math.pow(Math.abs(x-L/2)/(L/2+.05),6)*.16;
    p.setZ(i,z*tumble*end);}
  p.needsUpdate=true; return g;
}
function extrudeProfile(pts,width,bevel=.05){
  const s=new TH.Shape(); pts.forEach(([x,y],i)=>i?s.lineTo(x,y):s.moveTo(x,y)); s.closePath();
  const g=new TH.ExtrudeGeometry(s,{depth:width-bevel*2,bevelEnabled:true,bevelThickness:bevel,bevelSize:bevel,bevelSegments:3,curveSegments:6});
  g.translate(0,0,-(width-bevel*2)/2); return g;
}
const L0=pr=>pr.body.reduce((a,p)=>Math.max(a,p[0]),0);
function carGeometry(style){
  if(CARGEO[style]) return CARGEO[style];
  const parts={paint:[],glass:[],dark:[],chrome:[],red:[],white:[]};
  let L=4.5, W=1.86;
  const P=(k,g,x=0,y=0,z=0)=>{g.translate(x,y,z); parts[k].push(gPrep(g));};
  if(style==='danfo'||style==='truck'){
    L=style==='danfo'?4.9:6.5; W=2.05; const H=style==='danfo'?2.25:3.1;
    P('paint',new TH.BoxGeometry(L,H-.45,W),L/2,.45+(H-.45)/2,0);
    P('glass',new TH.BoxGeometry(.06,(H-.45)*.38,W*.82),L-.0,.45+(H-.45)*.68,0);
    P('glass',new TH.BoxGeometry(.06,(H-.45)*.3,W*.8),0,.45+(H-.45)*.72,0);
    P('dark',new TH.BoxGeometry(L+.1,.18,W+.06),L/2,.42,0);
    P('red',new TH.BoxGeometry(.06,.22,.3),-.01,.85,W*.38); P('red',new TH.BoxGeometry(.06,.22,.3),-.01,.85,-W*.38);
    P('white',new TH.BoxGeometry(.06,.18,.3),L+.01,.85,W*.36); P('white',new TH.BoxGeometry(.06,.18,.3),L+.01,.85,-W*.36);
  } else {
    const prof={
      coupe:{body:[[0,.3],[-.05,.62],[.05,.92],[.6,1.0],[1.3,1.0],[3.1,.98],[4.15,.84],[4.5,.64],[4.45,.34],[4.1,.28],[.35,.28]], glass:[[1.08,.98],[1.5,1.34],[2.7,1.36],[3.32,.98]], roof:[[1.46,1.32],[1.52,1.4],[2.72,1.41],[2.78,1.32]]},
      gt:{body:[[0,.28],[-.05,.58],[.05,.86],[.7,.92],[1.4,.92],[3.2,.88],[4.3,.72],[4.6,.5],[4.55,.3],[4.2,.24],[.35,.24]], glass:[[1.3,.9],[1.75,1.2],[2.7,1.22],[3.35,.9]], roof:[[1.72,1.18],[1.78,1.25],[2.68,1.26],[2.74,1.18]]},
      rally:{body:[[0,.34],[-.04,.7],[.05,1.0],[.35,1.06],[1.0,1.06],[2.9,1.02],[3.9,.9],[4.15,.66],[4.1,.38],[3.8,.32],[.3,.32]], glass:[[.3,1.04],[.55,1.48],[2.3,1.5],[2.95,1.02]], roof:[[.5,1.46],[.56,1.55],[2.3,1.56],[2.36,1.46]]},
      roadster:{body:[[0,.3],[-.05,.6],[.05,.9],[.6,.96],[1.3,.96],[3.0,.94],[4.0,.8],[4.3,.6],[4.25,.33],[3.9,.28],[.35,.28]], glass:[[2.75,.95],[2.95,1.22],[3.0,1.22],[3.25,.95]], roof:null},
      muscle:{body:[[0,.34],[-.05,.66],[.05,1.0],[.8,1.04],[1.4,1.04],[3.3,1.02],[4.6,.94],[4.75,.7],[4.7,.36],[4.4,.3],[.35,.3]], glass:[[1.3,1.02],[1.75,1.36],[2.75,1.37],[3.4,1.02]], roof:[[1.72,1.34],[1.78,1.42],[2.74,1.43],[2.8,1.34]]},
      sedan:{body:[[0,.32],[-.05,.66],[.05,.98],[.8,1.02],[1.2,1.02],[3.0,1.0],[4.1,.88],[4.45,.66],[4.4,.36],[4.1,.3],[.35,.3]], glass:[[.9,1.0],[1.3,1.44],[2.8,1.46],[3.3,1.0]], roof:[[1.26,1.42],[1.32,1.5],[2.8,1.51],[2.86,1.42]]}
    }[style]||null;
    const pr=prof;
    L=pr.body.reduce((a,p)=>Math.max(a,p[0]),0);
    parts.paint.push(gPrep(bodyShape(extrudeProfile(pr.body,W,.12),L0(pr),.1)));
    parts.glass.push(gPrep(bodyShape(extrudeProfile(pr.glass,W*.86,.04),L0(pr),.2)));
    if(pr.roof) parts.paint.push(gPrep(bodyShape(extrudeProfile(pr.roof,W*.8,.04),L0(pr),.05)));
    [[.35,1],[-.35,1]].forEach(([s])=>P('paint',new TH.BoxGeometry(.18,.1,.22),(pr.glass[3][0]-.15),1.02,Math.sign(s)*W*.52));
    if(style==='roadster'){[1.6,2.3].forEach(x=>{}); P('dark',new TH.BoxGeometry(.25,.42,.45),1.95,1.15,.38); P('dark',new TH.BoxGeometry(.25,.42,.45),1.95,1.15,-.38); P('dark',new TH.BoxGeometry(1.6,.05,1.5),1.9,.97,0);}
    if(style==='gt'){P('dark',new TH.BoxGeometry(.35,.05,W*1.02),.12,1.22,0); P('dark',new TH.BoxGeometry(.12,.3,.08),.2,1.06,.6); P('dark',new TH.BoxGeometry(.12,.3,.08),.2,1.06,-.6);}
    if(style==='coupe') P('dark',new TH.BoxGeometry(.25,.04,W*.92),.12,1.06,0);
    if(style==='rally'){P('dark',new TH.BoxGeometry(.25,.12,1.2),2.0,1.62,0); for(let i=0;i<4;i++) P('white',new TH.CylinderGeometry(.08,.08,.06,10).rotateZ(Math.PI/2),2.13,1.62,-.45+i*.3);}
    P('dark',new TH.BoxGeometry(.12,.22,W*.8),-.02,.42,0); P('dark',new TH.BoxGeometry(.1,.2,W*.7),L+.0,.38,0);
    P('red',new TH.BoxGeometry(.06,.17,W*.3),-.04,.78,W*.32); P('red',new TH.BoxGeometry(.06,.17,W*.3),-.04,.78,-W*.32);
    P('red',new TH.BoxGeometry(.05,.05,W*.36),-.04,.78,0);
    P('dark',new TH.BoxGeometry(.04,.3,W*.98),-.01,.78,0);
    P('dark',new TH.BoxGeometry(.14,.16,W*.92),-.03,.3,0);
    P('white',new TH.BoxGeometry(.03,.13,.42),-.07,.56,0);
    P('chrome',new TH.CylinderGeometry(.05,.05,.12,8).rotateZ(Math.PI/2),-.06,.36,-W*.3);
    P('white',new TH.BoxGeometry(.06,.1,W*.26),L-.02,.68,W*.3); P('white',new TH.BoxGeometry(.06,.1,W*.26),L-.02,.68,-W*.3);
    P('chrome',new TH.CylinderGeometry(.05,.05,.12,8).rotateZ(Math.PI/2),-.06,.36,W*.3);
  }
  const out={L,W};
  for(const k in parts){ if(!parts[k].length) continue; const g=gMerge(parts[k]); parts[k].forEach(p=>p.dispose());
    g.translate(-L/2,0,0); g.rotateY(Math.PI/2); out[k]=g; }
  return CARGEO[style]=out;
}
const CARMAT={};
function carMats(color,accent){
  const key=color+(accent||''); if(CARMAT[key]) return CARMAT[key];
  return CARMAT[key]={
    paint:new TH.MeshPhysicalMaterial({color:C3(color),metalness:.55,roughness:.32,clearcoat:1,clearcoatRoughness:.06,envMapIntensity:1.2}),
    glass:new TH.MeshPhysicalMaterial({color:C3('#1c2733'),metalness:0,roughness:.04,clearcoat:1,clearcoatRoughness:.02,envMapIntensity:2.2}),
    dark:new TH.MeshStandardMaterial({color:C3('#141518'),roughness:.6}),
    chrome:new TH.MeshStandardMaterial({color:C3('#d8dce2'),metalness:1,roughness:.18}),
    red:new TH.MeshStandardMaterial({color:C3('#5a0a06'),emissive:C3('#ff2a14'),emissiveIntensity:2.4}),
    white:new TH.MeshStandardMaterial({color:C3('#e8e8e0'),emissive:C3('#fff6e0'),emissiveIntensity:1.2}),
    liner:new TH.MeshStandardMaterial({color:C3('#0c0d0f'),roughness:.95,side:TH.DoubleSide})
  };
}
let WHEEL=null;
function wheelGeo(){ if(WHEEL) return WHEEL;
  const tire=new TH.CylinderGeometry(.34,.34,.26,18); tire.rotateZ(Math.PI/2);
  const rim=new TH.CylinderGeometry(.22,.22,.27,10); rim.rotateZ(Math.PI/2);
  return WHEEL={tire,rim,tireM:new TH.MeshStandardMaterial({color:C3('#111111'),roughness:.85}),rimM:new TH.MeshStandardMaterial({color:C3('#b8bec6'),metalness:1,roughness:.25})};
}
function shadowTex(){ if(TEX.carShadow) return TEX.carShadow;
  const c=mk(128,256,(g,w,h)=>{const gr=g.createRadialGradient(w/2,h/2,4,w/2,h/2,w*.6); gr.addColorStop(0,'rgba(0,0,0,.75)'); gr.addColorStop(1,'rgba(0,0,0,0)'); g.fillStyle=gr; g.fillRect(0,0,w,h);});
  return TEX.carShadow=canvasTex(c,false,false);}
function danfoTex(slogan){ const key='danfo_'+slogan; if(TEX[key]) return TEX[key];
  const c=mk(512,256,(g,w,h)=>{g.fillStyle='#f2c21b'; g.fillRect(0,0,w,h); g.fillStyle='#16181c'; g.fillRect(0,h*.55,w,h*.06); g.fillRect(0,h*.66,w,h*.06);
    g.font=`900 ${h*.11}px ${FD}`; g.textAlign='center'; g.fillText(slogan,w/2,h*.42);});
  return TEX[key]=new TH.MeshPhysicalMaterial({map:canvasTex(c,true,false),metalness:.2,roughness:.45,clearcoat:.5});
}
function carModel(o){
  if(o.model&&VEH[o.model]) return vehicleModel(o);
  const style=o.kind==='danfo'?'danfo':o.kind==='truck'?'truck':(o.style||'sedan');
  const geo=carGeometry(style), mats=carMats(o.color||'#888888',o.accent);
  const G=new TH.Group(), body=new TH.Group(); G.add(body);
  for(const k of ['paint','glass','dark','chrome','red','white']) if(geo[k]){
    const mat=(k==='paint'&&style==='danfo')?danfoTex(o.slogan||'NO FOOD FOR LAZY MAN'):mats[k];
    const m=new TH.Mesh(geo[k],mat); m.castShadow=k==='paint'||k==='glass'; body.add(m);}
  if(o.stripes){const s=new TH.MeshStandardMaterial({color:C3(o.accent||'#ff8a1f'),roughness:.4});
    [-.18,.18].forEach(x=>{const m=new TH.Mesh(new TH.BoxGeometry(.16,.02,geo.L*.9),s); m.position.set(x,1.06,0); body.add(m);});}
  const wg=wheelGeo(), wheels=[]; const ax=geo.W/2-.08, zf=-(geo.L/2-.95), zr=geo.L/2-.95;
  [[ax,zf],[-ax,zf],[ax,zr],[-ax,zr]].forEach(([x,z])=>{const w=new TH.Group(); w.add(new TH.Mesh(wg.tire,wg.tireM),new TH.Mesh(wg.rim,wg.rimM)); w.position.set(x,.34,z); w.children[0].castShadow=true; G.add(w); wheels.push(w);});
  const sh=new TH.Mesh(new TH.PlaneGeometry(geo.W*1.5,geo.L*1.25),new TH.MeshBasicMaterial({map:shadowTex(),transparent:true,depthWrite:false,opacity:.85}));
  sh.rotation.x=-Math.PI/2; sh.position.y=.03; sh.renderOrder=1; G.add(sh);
  G.userData={wheels,body,L:geo.L};
  return G;
}

/* ---------- per-stage materials ---------- */
let MAT={};
function stageMaterials(th,night){
  const sandy=th.scenery.some(s=>s==='adobe'||s==='dunegrass');
  const rt=roadTextures(th), gt=groundTextures(th,sandy);
  const wcol=(th.water||['#2f7fae'])[0];
  MAT={
    road:new TH.MeshStandardMaterial({map:rt.map,normalMap:rt.normal,normalScale:new TH.Vector2(.5,.5),envMapIntensity:th.weather==='rain'?1:.35,roughness:th.weather==='rain'?.35:.88,metalness:th.weather==='rain'?.25:0,vertexColors:true}),
    branch:new TH.MeshStandardMaterial({map:rt.branch,roughness:.85,vertexColors:true,polygonOffset:true,polygonOffsetFactor:-2}),
    check:new TH.MeshStandardMaterial({map:rt.check,roughness:.7,vertexColors:true,polygonOffset:true,polygonOffsetFactor:-2}),
    curb:new TH.MeshStandardMaterial({map:rt.curb,roughness:.7,vertexColors:true}),
    walk:new TH.MeshStandardMaterial({map:gt.walk,roughness:.9,vertexColors:true}),
    ground:new TH.MeshStandardMaterial({map:gt.map,normalMap:gt.normal,roughness:1,vertexColors:true}),
    water:new TH.MeshStandardMaterial({color:C3(wcol),normalMap:gt.water,normalScale:new TH.Vector2(.5,.5),roughness:.06,metalness:.35,vertexColors:true}),
    bark:new TH.MeshStandardMaterial({roughness:.95,vertexColors:true}),
    rock:new TH.MeshStandardMaterial({roughness:.95,vertexColors:true}),
    corr:new TH.MeshStandardMaterial({map:corrTex(),roughness:.55,metalness:.45,vertexColors:true,side:TH.DoubleSide}),
    kerbBW:new TH.MeshStandardMaterial({map:stripeTex(['#f4f4f4','#1d4fa8'],'bw'),roughness:.6,vertexColors:true,side:TH.DoubleSide}),
    kerbMulti:new TH.MeshStandardMaterial({map:stripeTex(['#2f9a4a','#f4c21b','#1d4fa8','#d9322a','#f4f4f4'],'multi'),roughness:.6,vertexColors:true,side:TH.DoubleSide}),
    zebra:new TH.MeshStandardMaterial({map:zebraTex(),transparent:true,roughness:.7,vertexColors:true,polygonOffset:true,polygonOffsetFactor:-3,depthWrite:false}),
    bronze:new TH.MeshStandardMaterial({color:C3('#8a6a3a'),metalness:.8,roughness:.35,vertexColors:true}),
    leaf:new TH.MeshStandardMaterial({roughness:.85,vertexColors:true}),
    palmLeaf:leafCard('palm'), grassCard:leafCard('grass'), wheatCard:leafCard('wheat'), leafCard:leafCard('cluster'),
    rail:new TH.MeshStandardMaterial({map:railTex(),color:C3('#c8ccd0'),metalness:.75,roughness:.32,side:TH.DoubleSide,vertexColors:true}),
    truss:new TH.MeshStandardMaterial({color:C3('#b9bec4'),alphaMap:latticeTex(),alphaTest:.4,metalness:.7,roughness:.35,side:TH.DoubleSide,vertexColors:true}),
    wood:new TH.MeshStandardMaterial({color:C3('#5a4030'),roughness:.9,vertexColors:true}),
    metalDark:new TH.MeshStandardMaterial({color:C3('#2a2d33'),roughness:.4,metalness:.7,vertexColors:true}),
    metal:new TH.MeshStandardMaterial({color:C3('#c8ccd2'),roughness:.4,metalness:.7,vertexColors:true}),
    concrete:new TH.MeshStandardMaterial({color:C3('#b0aea8'),roughness:.95,vertexColors:true,side:TH.DoubleSide}),
    roof:new TH.MeshStandardMaterial({color:C3('#6e6a64'),roughness:.95,vertexColors:true}),
    tile:new TH.MeshStandardMaterial({color:C3('#a8442e'),roughness:.8,vertexColors:true,side:TH.DoubleSide}),
    roofDark:new TH.MeshStandardMaterial({color:C3('#4a4c52'),roughness:.7,metalness:.3,vertexColors:true,side:TH.DoubleSide}),
    slate:new TH.MeshStandardMaterial({color:C3('#56607a'),roughness:.6,metalness:.2,vertexColors:true}),
    brick:new TH.MeshStandardMaterial({color:C3('#8a5a48'),roughness:.9,vertexColors:true}),
    glassLow:new TH.MeshStandardMaterial({roughness:.3,vertexColors:true}),
    cloth:new TH.MeshStandardMaterial({roughness:.85,vertexColors:true}),
    canopyMat:new TH.MeshStandardMaterial({roughness:.8,vertexColors:true,side:TH.DoubleSide}),
    shopSign:new TH.MeshStandardMaterial({map:signAtlas(),roughness:.6,emissive:new TH.Color(1,1,1),emissiveMap:signAtlas(),emissiveIntensity:night?.55:0}),
    shopGlass:new TH.MeshStandardMaterial({color:C3('#1e2830'),roughness:.15,metalness:.4,vertexColors:true,emissive:C3('#ffcf8a'),emissiveIntensity:night?.35:0}),
    tlRed:new TH.MeshStandardMaterial({color:C3('#3a0806'),emissive:C3('#ff2a14'),emissiveIntensity:night?3:1.6}),
    tlAmber:new TH.MeshStandardMaterial({color:C3('#2a1a04'),emissive:C3('#ffa020'),emissiveIntensity:.25}),
    tlGreen:new TH.MeshStandardMaterial({color:C3('#062a0e'),emissive:C3('#20ff70'),emissiveIntensity:.25}),
    bulb:new TH.MeshStandardMaterial({color:C3('#fff3d0'),emissive:C3('#ffe2a0'),emissiveIntensity:night?3:.4,vertexColors:true})
  };
  MAT.waterTex=gt.water;
  for(const k of Object.keys(MAT)) if(k.startsWith('fac_')) delete MAT[k];
}

/* ---------- sky ---------- */
function skyDome(th){
  const night=!!th.night, overcast=!th.sun&&!th.moon;
  const sunDir=new TH.Vector3();
  if(th.sun){const el=(3+(1-th.sun.y)*48)*Math.PI/180, az=(200+(th.sun.x-.5)*140)*Math.PI/180; sunDir.set(Math.cos(el)*Math.sin(az),Math.sin(el),Math.cos(el)*Math.cos(az));}
  else if(th.moon) sunDir.set(-.4,.55,-.7).normalize();
  else sunDir.set(.3,.8,-.4).normalize();
  const sunC=th.sun?C3(th.sun.c):C3('#e8eef8');
  const mat=new TH.ShaderMaterial({side:TH.BackSide,depthWrite:false,fog:false,
    uniforms:{top:{value:C3(th.sky[0])},mid:{value:C3(th.sky[1])},hor:{value:C3(th.sky[2])},fogc:{value:C3(th.fog)},sunDir:{value:sunDir},sunC:{value:sunC},showSun:{value:th.sun?1:th.moon?.6:0},night:{value:night?1:0}},
    vertexShader:'varying vec3 vDir; void main(){ vDir=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader:`uniform vec3 top,mid,hor,fogc,sunC,sunDir; uniform float showSun,night; varying vec3 vDir;
      void main(){ float h=vDir.y; vec3 c=mix(hor,mid,smoothstep(0.0,.22,h)); c=mix(c,top,smoothstep(.22,.85,h)); c=mix(c,fogc,1.0-smoothstep(-.02,.06,h));
        float d=max(dot(normalize(vDir),normalize(sunDir)),0.0);
        c+=sunC*(pow(d,12.0)*.35+pow(d,90.0)*.6)*showSun*(1.0-night*.7);
        c+=sunC*smoothstep(.9993,.9997,d)*showSun*6.0;
        gl_FragColor=vec4(c,1.0);
        #include <tonemapping_fragment>
        #include <encodings_fragment>
      }`});
  const dome=new TH.Mesh(new TH.SphereGeometry(2800,32,16),mat); dome.renderOrder=-10;
  return {dome,sunDir,overcast};
}
function ringLayer(canvas,radius,height,tint,opacity){
  const t=canvasTex(canvas); t.repeat.set(5,1); t.wrapT=TH.ClampToEdgeWrapping;
  const m=new TH.Mesh(new TH.CylinderGeometry(radius,radius,height,64,1,true),new TH.MeshBasicMaterial({map:t,transparent:true,side:TH.BackSide,depthWrite:false,fog:false,color:tint,opacity}));
  m.renderOrder=-9; return m;
}
function hazeRing(fog){
  const c=mk(4,256,(g,w,h)=>{const gr=g.createLinearGradient(0,0,0,h); gr.addColorStop(0,rgba(fog,0)); gr.addColorStop(.6,rgba(fog,.55)); gr.addColorStop(1,rgba(fog,1)); g.fillStyle=gr; g.fillRect(0,0,w,h);});
  const m=new TH.Mesh(new TH.CylinderGeometry(1100,1100,220,48,1,true),new TH.MeshBasicMaterial({map:canvasTex(c,true,false),transparent:true,side:TH.BackSide,depthWrite:false,fog:false}));
  m.renderOrder=-8; return m;
}

/* ---------- world build ---------- */
function clearWorld(){
  if(!R3.world) return;
  R3.scene.remove(R3.world);
  R3.world.traverse(o=>{if(o.isMesh||o.isPoints||o.isLineSegments){ if(o.geometry&&!o.userData.shared) o.geometry.dispose(); }});
  R3.world=null; R3.chunks=[];
}
function ribbon(i0,i1,a,b,ya,yb,ua,ub,vLen,o={}){
  const pos=[],uv=[],idx=[]; let rows=0; const step=o.step||1;
  for(let i=i0;;i+=step){const ii=Math.min(i,i1), off=o.off?o.off(ii):0, h=R3.ch[ii], rx=Math.cos(h), rz=Math.sin(h), A=a+off, B=b+off;
    const dy=o.dy?o.dy(ii):0;
    pos.push(R3.cx[ii]+rx*A,(o.absA?ya:R3.cy[ii]+ya+dy),R3.cz[ii]+rz*A, R3.cx[ii]+rx*B,(o.absB?yb:R3.cy[ii]+yb+dy),R3.cz[ii]+rz*B);
    const v=ii*SL/vLen; uv.push(ua,v,ub,v); rows++; if(ii>=i1) break;}
  for(let r=0;r<rows-1;r++){const a0=r*2; idx.push(a0,a0+1,a0+2, a0+1,a0+3,a0+2);}
  const g=new TH.BufferGeometry(); g.setAttribute('position',new TH.Float32BufferAttribute(pos,3)); g.setAttribute('uv',new TH.Float32BufferAttribute(uv,2)); g.setIndex(idx); g.computeVertexNormals();
  return gPrep(g);
}
function terrainY(d){ // ground height (relative to road) at lateral distance d metres
  const e=HW+.7; if(d<e) return 0; if(d<HW+40) return U.interp(-.05,-1.2,(d-e)/(40-.7)); return -1.2;
}
function pose(i){return {x:R3.cx[i],y:R3.cy[i],z:R3.cz[i],h:R3.ch[i]};}
function poseAt(zU,off){
  const n=segments.length; let f=zU/SEG; f=((f%n)+n)%n; const i=Math.floor(f), t=f-i, j=Math.min(i+1,n);
  const h=U.interp(R3.ch[i],R3.ch[j],t), L=(off||0)*HW;
  return {x:U.interp(R3.cx[i],R3.cx[j],t)+Math.cos(h)*L, y:U.interp(R3.cy[i],R3.cy[j],t), z:U.interp(R3.cz[i],R3.cz[j],t)+Math.sin(h)*L, h};
}
function build3DWorld(){
  const t0=performance.now();
  clearWorld();
  const st=stage, th=st.theme, n=segments.length, night=!!th.night, city=th.scenery.some(s=>['office','haussmann','colonial','tower','craftsman'].includes(s));
  const cx=new Float32Array(n+1), cy=new Float32Array(n+1), cz=new Float32Array(n+1), ch=new Float32Array(n+1);
  let h=0,x=0,z=0, minY=1e9;
  for(let i=0;i<=n;i++){const s=segments[Math.min(i,n-1)]; cx[i]=x; cz[i]=z; cy[i]=(i<n?s.p1.world.y:s.p2.world.y)*YS; ch[i]=h; minY=Math.min(minY,cy[i]);
    if(i<n){x+=Math.sin(h)*SL; z-=Math.cos(h)*SL; h+=s.curve*K3;}}
  Object.assign(R3,{cx,cy,cz,ch,baseY:minY-10});
  stageMaterials(th,night);
  const W3=R3.world=new TH.Group(); R3.scene.add(W3);
  // sky, backdrop rings, lights, fog
  const sky=skyDome(th); R3.sky=sky; W3.add(sky.dome);
  const fogC=C3(th.fog); R3.scene.fog=new TH.Fog(fogC,R3.view*SL*.3,R3.view*SL*1.02);
  R3.rings=[ringLayer(art.far,2200,560,C3(mix(th.fog,'#ffffff',.0)),.9),ringLayer(art.near,1600,300,C3(mix(th.fog,'#ffffff',0)),.95),hazeRing(th.fog)];
  R3.rings.forEach(r=>W3.add(r));
  const env=new TH.Scene(); env.add(new TH.Mesh(new TH.SphereGeometry(100,32,16),sky.dome.material));
  if(R3.envRT) R3.envRT.dispose(); R3.envRT=R3.pmrem.fromScene(env,.02); R3.scene.environment=R3.envRT.texture;
  R3.sunDir=sky.sunDir.clone();
  R3.sun.color.copy(th.sun?C3(th.sun.c):C3(night?'#9fb4ff':'#dfe6ee'));
  R3.sun.intensity=night?.35:sky.overcast?.9:(th.sun.y>.6?2.2:2.8);
  R3.hemi.color.copy(C3(night?'#5a6a9a':mix(th.sky[1],'#ffffff',.55))); R3.hemi.groundColor.copy(C3(night?'#141420':th.grass[1])); R3.hemi.intensity=night?.9:sky.overcast?1.6:1.35;
  if(!R3.fill){R3.fill=new TH.PointLight(0xffe8d0,0,14,1.5); R3.scene.add(R3.fill);} R3.fill.intensity=night?2.2:0;
  R3.baseExposure=night?1.15:sky.overcast?.9:.82; applyBrightness();
  R3.head.intensity=night?9:0;
  if(night){const g=new TH.BufferGeometry(), p=[]; const SR=rng(stageIdx*7+1); for(let i=0;i<1500;i++){const a=SR()*Math.PI*2, e=Math.asin(SR()*.95+.03); p.push(Math.cos(e)*Math.sin(a)*2500,Math.sin(e)*2500,Math.cos(e)*Math.cos(a)*2500);}
    g.setAttribute('position',new TH.Float32BufferAttribute(p,3)); R3.stars=new TH.Points(g,new TH.PointsMaterial({color:0xffffff,size:1.6,sizeAttenuation:false,fog:false,transparent:true,opacity:(th.stars||.4)})); W3.add(R3.stars);}
  else R3.stars=null;
  R3.clouds=[];
  if(!night){const cm=new TH.SpriteMaterial({map:canvasTex(cloudImg,true,false),fog:false,transparent:true,opacity:th.weather==='rain'?.9:.85,depthWrite:false,color:C3(th.weather==='rain'?'#c8ccd0':'#ffffff')});
    const SR=rng(stageIdx+5), nC=Math.round(14*(th.clouds||.4));
    for(let i=0;i<nC;i++){const s=new TH.Sprite(cm); const a=SR()*Math.PI*2, r=700+SR()*900; s.userData={x:Math.sin(a)*r,y:160+SR()*260,z:Math.cos(a)*r}; s.scale.set(500+SR()*500,190+SR()*160,1); s.renderOrder=-7; W3.add(s); R3.clouds.push(s);}}
  // base ground
  const gTex=MAT.ground.map; const base=new TH.Mesh(new TH.PlaneGeometry(14000,14000),new TH.MeshStandardMaterial({map:gTex,color:C3('#b8b8b8'),roughness:1}));
  base.material.map=gTex.clone(); base.material.map.repeat.set(1400,1400); base.material.map.needsUpdate=true;
  base.rotation.x=-Math.PI/2; base.position.set(cx[Math.floor(n/2)],R3.baseY,cz[Math.floor(n/2)]); base.receiveShadow=true; W3.add(base);
  // motorway furniture positions (kept clear of bridges, shortcuts and the start/finish)
  const clear=i=>i>startLine+60&&i<finishIdx-120&&!segments.slice(i-30,i+30).some(s=>s.water||s.branch||s.fly);
  R3.gantries=[]; R3.overpasses=[];
  for(let i=startLine+260;i<finishIdx-150;i+=620){ if(!clear(i)) continue;
    const nxt=places.find(pl=>pl.seg>i+20), dist=((nxt?nxt.seg:finishIdx)-i)*mapInfo.metersPerSeg/1000;
    R3.gantries.push({i,top:(nxt?nxt.name:'Arrival · '+st.place).toUpperCase(),bottom:dist.toFixed(1)+' km · '+st.place.toUpperCase()});}
  if(!city) for(let i=startLine+560;i<finishIdx-200;i+=1150){ if(clear(i)&&!R3.gantries.some(g=>Math.abs(g.i-i)<80)) R3.overpasses.push({i}); }
  // chunks
  for(let c0=0;c0<n;c0+=CHUNK){const ch2={i0:c0,i1:Math.min(n,c0+CHUNK),group:new TH.Group()}; buildChunk(ch2,city,night); W3.add(ch2.group); R3.chunks.push(ch2);}
  // landmarks
  const lms=[]; segments.forEach((s,i)=>s.sprites.forEach(sp=>{if(sp.img._k==='landmark') lms.push([sp,i]);}));
  R3.ship=null;
  const pickLm=th.landmarkAt?lms[0]:lms.filter(([,i])=>i<=finishIdx).pop()||lms[0];
  if(pickLm) placeLandmark(pickLm[0],pickLm[1],th,night);
  // coins
  buildCoins();
  // cars
  R3.player=null; R3.playerCarId=null;
  cars.forEach(c=>{
    let m;
    if(c.rival) m=carModel({model:RIVAL_MODEL[c.team.id],color:c.team.color,roof:'black'});
    else if(c.wW>600) m=carModel(c.img._danfo?{kind:'danfo',slogan:c.img._danfo}:{kind:'truck',color:c.img._col||'#e8e4dc'});
    else if(c.img._okada) m=okadaModel(c.img._okada);
    else if(c.img._keke) m=kekeModel(c.img._keke);
    else {const k=(c.z/SEG|0); m=carModel({model:TRAFFIC_MODELS[k%TRAFFIC_MODELS.length],color:TRAFFIC_COLS[(k>>2)%TRAFFIC_COLS.length],roof:'body'});}
    c.m3=m; m.visible=false; W3.add(m);
  });
  (th.towers||[]).forEach((name,k)=>{const pl=places.find(p=>p.name===name); if(!pl) return; const p=pose(Math.min(pl.seg+20,segments.length-1)), sd=1, d=HW+46+k*8;
    const T=phTower(night); T.position.set(p.x+Math.cos(p.h)*sd*d,p.y-1.2,p.z+Math.sin(p.h)*sd*d); T.rotation.y=-p.h+.3; W3.add(T);});
  R3.oncoming=[];
  if(th.dual){for(let k=0;k<10;k++){const m=th.naija&&k%4===3?okadaModel(['#c8321f','#1d1f24'][k%2]):carModel({model:TRAFFIC_MODELS[k%TRAFFIC_MODELS.length],color:TRAFFIC_COLS[k%TRAFFIC_COLS.length],roof:'body'});
    m.visible=false; W3.add(m); R3.oncoming.push({m,z:position+playerZ+(60+k*55)*SEG,lane:k%2?-3.224:-4.558,v:MAXSPEED*(.45+(k%4)*.06)});}}
  initSmoke(); initCrowd();
  R3.builtFor=buildSerial; R3.snap=true;
  R3.buildMs=performance.now()-t0;
}
function placeLandmark(sp,i,th,night){
  if(th.landmark==='nigerBridge') return;
  const key='lm_'+stageIdx; let proto=R3[key];
  if(!proto) proto=R3[key]=landmark3D(th.landmark,night);
  const G=proto.clone(); G.traverse(o=>{if(o.isMesh) o.userData.shared=true;});
  const side=sp.offset<0?-1:1, size=proto.userData.size, d=Math.max(Math.abs(sp.offset)*HW+size/2+6,HW+12+size/2);
  const p=pose(i); G.position.set(p.x+Math.cos(p.h)*side*d, p.y+(th.landmark==='linkBridge'?-6:terrainY(d)), p.z+Math.sin(p.h)*side*d);
  G.rotation.y=-p.h+(th.landmark==='locomotive'||th.landmark==='linkBridge'?Math.PI/2:0);
  if(th.landmark==='linkBridge'){G.position.set(p.x+Math.cos(p.h)*side*(HW+4),p.y-6,p.z+Math.sin(p.h)*side*(HW+4)); G.rotation.y=-p.h;}
  if(th.landmark==='starship'){R3.shipBase=R3.ship; }
  R3.world.add(G);
}
const th3=()=>stage.theme;
function buildChunk(C,city,night){
  const B=new Bucket(), {i0,i1}=C, R=rng(9000+i0), segs=segments;
  B.raw('road',ribbon(i0,i1,-HW,HW,0,0,0,1,11));
  const SG=i=>segs[Math.min(i,segs.length-1)], dual=!!stage.theme.dual, SH=dual?MW+2*HW+1.4:0;
  const leftBr=i=>branches.some(br=>br.side<0&&i>=br.b0-4&&i<=br.b0+BL+4);
  const kind=i=>SG(i).water?2:SG(i).fly?1:(dual&&leftBr(i)?3:0);
  const nearPlace=i=>places.some(p=>Math.abs(p.seg-i)<26);
  // fly drop: ground falls away under a viaduct, easing in and out over 40 segments
  const flyDrop=i=>{if(!SG(i).fly) return 0; let a0=i,b0=i; while(a0>0&&SG(a0-1).fly) a0--; while(b0<segs.length-1&&SG(b0+1).fly) b0++;
    return -7.5*Math.min(1,(i-a0)/40,(b0-i)/40);};
  R3.flyDrop=flyDrop;
  const oppL=-(HW+1.4+MW), oppR=-(3*HW+1.4+MW); // opposite carriageway edges (metres)
  const deck=(a,e,L0,R0)=>{ // a raised deck: barriers, fascia, underside, piers
    for(const [L,s] of [[L0,-1],[R0,1]]){const X=L+s*.05;
      B.raw('kerbBW',ribbon(a,e,X,X,0,1.05,0,1,2)); B.raw('concrete',ribbon(a,e,Math.min(X,X-s*.3),Math.max(X,X-s*.3),1.05,1.05,0,.1,3));
      B.raw('concrete',ribbon(a,e,X,X,0,-1.5,0,1,3));}
    B.raw('concrete',ribbon(a,e,L0,R0,-1.5,-1.5,0,1,6));
    for(let i=a;i<e;i++) if(i%24===0){const p=pose(i), hgt=1.5-flyDrop(i)-.2+.5; if(hgt>2.2){const c=(L0+R0)/2; B.add('concrete',gPrep(tr(new TH.BoxGeometry(2.6,hgt,2),0,-hgt/2,0)),mat4(p.x+Math.cos(p.h)*c,p.y-1.5,p.z+Math.sin(p.h)*c,-p.h,1));}}
  };
  let a=i0;
  while(a<i1){let b=a; const k=kind(a); while(b<i1&&kind(b)===k) b++;
    const e=Math.min(b,i1);
    if(k===0||k===3){
      B.raw('curb',ribbon(a,e,-HW-.7,-HW,.04,.04,0,1,4)); B.raw('curb',ribbon(a,e,HW,HW+.7,.04,.04,0,1,4));
      const sw=city?3.4:0;
      if(city){B.raw('walk',ribbon(a,e,HW+.7,HW+.7+sw,.16,.16,0,sw/2,2)); B.raw('walk',ribbon(a,e,-HW-.7-sw-SH,-HW-.7-SH,.16,.16,0,sw/2,2));
        B.raw('concrete',ribbon(a,e,HW+.7,HW+.7,.04,.16,0,1,2)); B.raw('concrete',ribbon(a,e,-HW-.7-SH,-HW-.7-SH,.16,.04,0,1,2));}
      const g0=HW+.7+sw;
      B.raw('ground',ribbon(a,e,g0,HW+40,city?.16:-.05,-1.2,g0/6,(HW+40)/6,6,{step:2}));
      B.raw('ground',ribbon(a,e,-HW-40-SH,-g0-SH,-1.2,city?.16:-.05,-(HW+40)/6,-g0/6,6,{step:2}));
      B.raw('ground',ribbon(a,e,HW+40,HW+170,-1.2,R3.baseY,(HW+40)/6,(HW+170)/6,6,{step:3,absB:true}));
      B.raw('ground',ribbon(a,e,-HW-170-SH,-HW-40-SH,R3.baseY,-1.2,-(HW+170)/6,-(HW+40)/6,6,{step:3,absA:true}));
      if(dual){
        const my=k===3?.01:.22;
        B.raw('ground',ribbon(a,e,-HW-.7-MW,-HW-.7,my,my,-(HW+MW)/6,-HW/6,6,{step:2}));
        if(k===0){ // painted kerbs on the median, multicolour near junctions
          for(let s0=a;s0<e;){const np=nearPlace(s0); let s1=s0; while(s1<e&&nearPlace(s1)===np) s1++;
            const km=np?'kerbMulti':'kerbBW';
            B.raw(km,ribbon(s0,s1,-HW-.7,-HW-.7,.04,.22,0,1,2)); B.raw(km,ribbon(s0,s1,-HW-.7-MW,-HW-.7-MW,.22,.04,0,1,2)); s0=s1;}
          // clipped hedges in curving rows, palms and the odd monument
          const hedge=templates('hedge',3), palm=templates('palm',4);
          for(let i=a;i<e;i+=2){const p=pose(i), c=-(HW+.7+MW/2);
            for(const r of [-1,1]){const lat=c+Math.sin(i*.045+(r>0?Math.PI:0))*MW*.26+r*.9, px=p.x+Math.cos(p.h)*lat, pz=p.z+Math.sin(p.h)*lat;
              B.addParts(hedge[(i>>1)%3],mat4(px,p.y+.2,pz,i*.7,.95),null);}
            if(i%46===0){const px=p.x+Math.cos(p.h)*c, pz=p.z+Math.sin(p.h)*c; B.addParts(palm[i%4],mat4(px,p.y+.2,pz,i,1),null);}
            if(i%260===0&&i>startLine+40){const px=p.x+Math.cos(p.h)*c, pz=p.z+Math.sin(p.h)*c, M=mat4(px,p.y+.2,pz,-p.h,1);
              B.add('concrete',gPrep(tr(new TH.BoxGeometry(2.4,2.6,2.4),0,1.3,0),C3('#d8d4cc')),M);
              B.add('bronze',gPrep(tr(new TH.CapsuleGeometry(.42,1.5,4,10),0,3.75,0)),M); B.add('bronze',gPrep(tr(new TH.SphereGeometry(.34,10,8),0,4.95,0)),M);}
          }
        }
        B.raw('curb',ribbon(a,e,-HW-1.4-MW,-HW-.7-MW,.04,.04,0,1,4));
        B.raw('road',ribbon(a,e,oppR,oppL,0,0,1,0,11));
        B.raw('curb',ribbon(a,e,oppR-.7,oppR,.04,.04,0,1,4));
      }
      if(k===0&&dual) for(const p of places){ if(p.seg>=a&&p.seg<e-3&&!SG(p.seg).branch){ // zebra crossings at junctions
        B.raw('zebra',ribbon(p.seg,p.seg+3,-HW,HW,.02,.02,0,1,3.3)); B.raw('zebra',ribbon(p.seg,p.seg+3,oppR,oppL,.02,.02,0,1,3.3));}}
    } else if(k===1){ // flyover
      deck(a,e,-HW-.6,HW+.6);
      if(dual){B.raw('road',ribbon(a,e,oppR,oppL,0,0,1,0,11)); deck(a,e,oppR-.6,oppL+.6);}
      const dy={step:2,dy:flyDrop};
      B.raw('ground',ribbon(a,e,HW+.6,HW+4,-.05,-.05,0,.6,6,dy)); B.raw('road',ribbon(a,e,HW+4,HW+11.5,0,0,0,1,11,{dy:flyDrop}));
      B.raw('ground',ribbon(a,e,HW+11.5,HW+40,-.05,-1.2,(HW+11.5)/6,(HW+40)/6,6,dy));
      B.raw('ground',ribbon(a,e,HW+40,HW+170,-1.2,R3.baseY,(HW+40)/6,(HW+170)/6,6,{step:3,absB:true,dy:flyDrop}));
      const Lx=dual?oppR-.6:-HW-.6;
      B.raw('ground',ribbon(a,e,Lx,-HW-.6,-.05,-.05,0,1,6,dy));
      B.raw('road',ribbon(a,e,Lx-11.5,Lx-4,0,0,0,1,11,{dy:flyDrop})); B.raw('ground',ribbon(a,e,Lx-4,Lx,-.05,-.05,0,.6,6,dy));
      B.raw('ground',ribbon(a,e,Lx-40,Lx-11.5,-1.2,-.05,(Lx-40)/6,(Lx-11.5)/6,6,dy));
      B.raw('ground',ribbon(a,e,Lx-170,Lx-40,R3.baseY,-1.2,(Lx-170)/6,(Lx-40)/6,6,{step:3,absA:true,dy:flyDrop}));
    } else {
      let wy=1e9; for(let i=Math.max(0,a-200);i<Math.min(segs.length,e+200);i++) if(segs[i].water) wy=Math.min(wy,R3.cy[i]); wy-=7;
      B.raw('water',ribbon(a,e,HW+.6,HW+320,wy,wy,0,30,30,{step:2,absA:true,absB:true}));
      B.raw('water',ribbon(a,e,-HW-320,-HW-.6,wy,wy,0,30,30,{step:2,absA:true,absB:true}));
      for(const s of [-1,1]){const L=s*(HW+.55);
        B.raw('concrete',ribbon(a,e,L,L,0,1.05,0,1,3)); B.raw('concrete',ribbon(a,e,L-s*.3,L,1.05,1.05,0,.1,3));
        B.raw('concrete',ribbon(a,e,L,L,0,-1.5,0,1,3));}
      B.raw('concrete',ribbon(a,e,-HW-.6,HW+.6,-1.5,-1.5,0,1,6));
      for(let i=a;i<e;i++) if(i%24===0){const p=pose(i), hgt=p.y-1.5-(wy-2); B.add('concrete',gPrep(tr(new TH.BoxGeometry(3,hgt,2.2),0,-hgt/2,0)),mat4(p.x,p.y-1.5,p.z,-p.h,1));}
    }
    a=b;
  }
  if(!city) for(const sd of [-1,1]){ // steel guardrails, with gaps where a shortcut leaves the road
    const gap=i=>segs[i].water||branches.some(br=>br.side===sd&&i>=br.b0-6&&i<=br.b0+BL+4)||i<startLine-20;
    let s0=i0;
    while(s0<i1){ if(gap(s0)){s0++; continue;} let s1=s0; while(s1<i1&&!gap(s1)) s1++;
      const L=sd*(HW+1.7); B.raw('rail',ribbon(s0,Math.min(s1,i1),L,L,sd>0?.48:.82,sd>0?.82:.48,0,1,4,{step:2}));
      for(let i=s0;i<s1;i+=4){const p=pose(i); B.add('metalDark',gPrep(tr(new TH.BoxGeometry(.12,.85,.12),0,.42,0)),mat4(p.x+Math.cos(p.h)*(L+sd*.12),p.y,p.z+Math.sin(p.h)*(L+sd*.12),-p.h,1));}
      s0=s1;}
  }
  for(const g of R3.gantries||[]) if(g.i>=i0&&g.i<i1){ // overhead sign gantry naming the next real place
    const p=pose(g.i), span=HW+2.4, M=mat4(p.x,p.y,p.z,-p.h,1);
    [-1,1].forEach(sd=>B.add('truss',gPrep(tr(new TH.BoxGeometry(.7,8,.7),sd*span,4,0)),M));
    B.add('truss',gPrep(tr(new TH.BoxGeometry(span*2+.7,1.1,.9),0,7.9,0)),M);
    const key='gantry_'+g.i; if(!MAT[key]) MAT[key]=new TH.MeshStandardMaterial({map:canvasTex(gantrySign(g.top,g.bottom),true,false),roughness:.6,emissive:new TH.Color(1,1,1),emissiveMap:null,emissiveIntensity:0});
    const sg=new TH.PlaneGeometry(6.4,2.4); sg.translate(-HW*.45,6.6,.5); B.add(key,gPrep(sg),M);
    B.add('metalDark',gPrep(tr(new TH.BoxGeometry(6.6,2.6,.12),-HW*.45,6.6,.42)),M);}
  for(const o of R3.overpasses||[]) if(o.i>=i0&&o.i<i1){ // concrete bridge crossing over the road
    const p=pose(o.i), M=mat4(p.x,p.y,p.z,-p.h,1);
    B.add('concrete',gPrep(tr(new TH.BoxGeometry(70,1.4,11),0,8.2,0)),M);
    B.add('concrete',gPrep(tr(new TH.BoxGeometry(70,1,.25),0,9.4,5.4)),M); B.add('concrete',gPrep(tr(new TH.BoxGeometry(70,1,.25),0,9.4,-5.4)),M);
    [-1,1].forEach(sd=>{B.add('concrete',gPrep(tr(new TH.BoxGeometry(1.4,7.6,8),sd*(HW+3.4),3.8,0)),M); B.add('concrete',gPrep(tr(new TH.BoxGeometry(6,7.6,10),sd*32,3.8,0)),M);});}
  for(const br of branches){const s0=Math.max(i0,br.b0), s1=Math.min(i1,br.b0+BL); if(s1<=s0) continue;
    B.raw(city?'road':'branch',ribbon(s0,s1,-BW*HW,BW*HW,.05,.05,0,1,6,{off:i=>br.side*branchOff(br,i)*HW}));}
  [[startLine,2],[finishIdx,3]].forEach(([s,len])=>{const s0=Math.max(i0,s), s1=Math.min(i1,s+len); if(s1>s0) B.raw('check',ribbon(s0,s1,-HW,HW,.02,.02,0,4,1.1));});
  // scenery
  const glows=[]; const cut=new TH.Group();
  const step=R3.quality==='high'?1:2; let cnt=0;
  for(let i=i0;i<i1;i++) for(const s of segs[i].sprites){
    const k=s.img._k; if(!k||k==='rail'||k==='landmark') continue;
    if(TREES.has(k)&&(cnt++%step)) continue;
    const side=s.offset<0?-1:1, wo=s.wW/ROADW;
    const latU=s.center?0:(k==='lamp'||k==='pole'?s.offset:s.offset+side*wo/2);
    const lat=latU*HW, d=Math.abs(lat), p=pose(i);
    const dd=(stage.theme.dual&&lat<-HW-1&&!s.median)?Math.max(0,d-(MW+2*HW+1.4)):d;
    const px=p.x+Math.cos(p.h)*lat, pz=p.z+Math.sin(p.h)*lat, py=p.y+(s.median?.2:(dd<HW+4.1&&city?.16:terrainY(dd)))+(dd>HW+1&&R3.flyDrop?R3.flyDrop(i):0);
    if(TREES.has(k)){const v=templates(k,k==='palm'?4:3), sc=s.wW/SCEN[k].wW; B.addParts(v[(s.img._v||0)%v.length],mat4(px,py-.05,pz,R()*6.28,sc),null);}
    else if(KIT[k]){KIT[k](B,{M:mat4(px,py,pz,-p.h+(side>0?Math.PI:0),1),R,w:s.wW*LS,x:px,y:py,z:pz,ry:-p.h,night});}
    else if(STYLE_OF[k]){addBuilding(B,k,px,py,pz,-p.h+(R()-.5)*.08,s.wW*LS,R,night,dd<38?-side:0);}
    else if(k==='lamp'&&s.median){B.addParts(templates('lamp2',1)[0],mat4(px,py,pz,-p.h+Math.PI/2,1),null);
      if(night) for(const sd of [-1,1]) glows.push(px+Math.cos(p.h)*sd*1.7,py+7.1,pz+Math.sin(p.h)*sd*1.7);}
    else if(k==='lamp'||k==='pole'){B.addParts(templates(k,1)[0],mat4(px,py,pz,-p.h+(side>0?Math.PI/2:-Math.PI/2),1),null);
      if(k==='lamp'&&night){const bx=px-Math.cos(p.h)*side*1.7, bz=pz-Math.sin(p.h)*side*1.7; glows.push(bx,py+7.1,bz);}}
    else if(k==='neon'||k==='board'||k==='banner'||k==='sign'){
      const wM=s.wW*LS, hM=wM*s.img.height/s.img.width;
      const key='cut_'+(s.img._id||(s.img._id=Math.random().toString(36).slice(2)));
      if(!MAT[key]) MAT[key]=new TH.MeshStandardMaterial({map:canvasTex(s.img,true,false),alphaTest:.5,side:TH.DoubleSide,roughness:.7,
        emissive:k==='neon'?new TH.Color(1,1,1):new TH.Color(0,0,0),emissiveMap:k==='neon'?canvasTex(s.img,true,false):null,emissiveIntensity:k==='neon'?1.4:0});
      const g=new TH.PlaneGeometry(wM,hM); g.translate(0,hM/2,0);
      B.add(key,gPrep(g),mat4(px,py,pz,-p.h,1));
    }
  }
  if(!city&&R3.quality==='high'){
    const sandy=th3().scenery.some(s=>s==='adobe'||s==='dunegrass'), tuft=templates(sandy?'dunegrass':'grassTuft',3), bush=templates('bush',3), stone=templates('stone',3);
    for(let i=i0;i<i1;i+=2) for(const sd of [-1,1]){ if(segs[i].water||segs[i].branch) continue;
      const k=R(); const d=HW+2+R()*30, p=pose(i), lat=sd*d, px=p.x+Math.cos(p.h)*lat, pz=p.z+Math.sin(p.h)*lat, py=p.y+terrainY(d);
      const set=k<.55?tuft:k<.8?stone:bush;
      B.addParts(set[Math.floor(R()*set.length)],mat4(px,py-.03,pz,R()*6.28,(set===bush?.55:.7)+R()*.6),null);}
  }
  streetFurniture(B,C,city,night,dual,SH);
  B.build(C.group);
  if(glows.length){const gm=new TH.Points(new TH.BufferGeometry(),new TH.PointsMaterial({map:glowTex(),size:6,transparent:true,depthWrite:false,blending:TH.AdditiveBlending,color:0xffd8a0}));
    gm.geometry.setAttribute('position',new TH.Float32BufferAttribute(glows,3)); C.group.add(gm);}
}
function corrTex(){ if(TEX.corr) return TEX.corr;
  const R=rng(31), c=mk(128,128,(g,w,h)=>{for(let x=0;x<w;x+=8){const gr=g.createLinearGradient(x,0,x+8,0); gr.addColorStop(0,'#a8a8a8'); gr.addColorStop(.5,'#f4f4f4'); gr.addColorStop(1,'#9a9a9a'); g.fillStyle=gr; g.fillRect(x,0,8,h);}
    for(let i=0;i<40;i++){g.fillStyle=`rgba(120,60,20,${.15+R()*.25})`; ell(g,R()*w,R()*h,3+R()*14,3+R()*10); g.fill();}});
  return TEX.corr=canvasTex(c);}
function stripeTex(cols,key){ if(TEX['st_'+key]) return TEX['st_'+key];
  const c=mk(16,32*cols.length,(g,w,h)=>{cols.forEach((col,i)=>{g.fillStyle=col; g.fillRect(0,i*32,w,32);});});
  return TEX['st_'+key]=canvasTex(c);}
function zebraTex(){ if(TEX.zebra) return TEX.zebra;
  const c=mk(256,32,(g,w,h)=>{g.clearRect(0,0,w,h); g.fillStyle='rgba(245,245,240,.92)'; for(let i=0;i<10;i++) g.fillRect(i*w/10+w/40,0,w/20,h);});
  return TEX.zebra=canvasTex(c,true,false);}
function railTex(){ if(TEX.rail) return TEX.rail;
  const c=mk(64,64,(g,w,h)=>{const gr=g.createLinearGradient(0,0,0,h); gr.addColorStop(0,'#9aa0a6'); gr.addColorStop(.2,'#f2f4f6'); gr.addColorStop(.45,'#8a9096'); gr.addColorStop(.55,'#8a9096'); gr.addColorStop(.8,'#f2f4f6'); gr.addColorStop(1,'#9aa0a6'); g.fillStyle=gr; g.fillRect(0,0,w,h);});
  return TEX.rail=canvasTex(c);}
function gantrySign(top,bottom){
  return mk(1024,384,(g,w,h)=>{g.fillStyle='#14633a'; rr(g,6,6,w-12,h-12,18); g.fill(); g.strokeStyle='#f4f4f4'; g.lineWidth=10; rr(g,20,20,w-40,h-40,12); g.stroke();
    g.fillStyle='#f4f4f4'; g.textAlign='left'; g.textBaseline='middle';
    let fs=110; g.font=`800 ${fs}px ${FD}`; while(g.measureText(top).width>w*.78&&fs>30){fs-=4; g.font=`800 ${fs}px ${FD}`;} g.fillText(top,70,h*.38);
    g.font=`700 70px ${FD}`; g.fillStyle='#ffd84a'; g.fillText(bottom,70,h*.74);
    poly(g,[w-120,h*.25,w-60,h*.5,w-120,h*.75,w-120,h*.6,w-170,h*.6,w-170,h*.4,w-120,h*.4],'#f4f4f4');});
}
const TREES=new Set(['palm','pine','poplar','baobab','acacia','bush','tree','dunegrass','wheat']);
function glowTex(){if(TEX.glow) return TEX.glow; const c=mk(64,64,(g,w,h)=>{const gr=g.createRadialGradient(w/2,h/2,1,w/2,h/2,w/2); gr.addColorStop(0,'rgba(255,240,210,1)'); gr.addColorStop(.25,'rgba(255,210,150,.6)'); gr.addColorStop(1,'rgba(255,200,140,0)'); g.fillStyle=gr; g.fillRect(0,0,w,h);}); return TEX.glow=canvasTex(c,true,false);}
function buildCoins(){
  const list=[]; segments.forEach((s,i)=>s.coins.forEach(c=>list.push({c,i})));
  R3.coinList=list;
  const cg=new TH.CylinderGeometry(.42,.42,.09,20); cg.rotateX(Math.PI/2);
  const ng=new TH.CapsuleGeometry(.28,.6,4,10);
  const cm=new TH.MeshPhysicalMaterial({color:C3('#f1c24e'),metalness:1,roughness:.22,emissive:C3('#5a3a00'),emissiveIntensity:.5});
  const nm=new TH.MeshStandardMaterial({color:C3('#3aa0ff'),metalness:.3,roughness:.2,emissive:C3('#2a7fd8'),emissiveIntensity:1.2});
  const nc=list.filter(o=>!o.c.nitro).length, nn=list.length-nc;
  R3.coinMesh=new TH.InstancedMesh(cg,cm,Math.max(1,nc)); R3.nitroMesh=new TH.InstancedMesh(ng,nm,Math.max(1,nn));
  R3.coinMesh.count=nc; R3.nitroMesh.count=nn;
  let a=0,b=0; list.forEach(o=>{o.slot=o.c.nitro?b++:a++; const p=poseAt(o.i*SEG,o.c.offset); o.p=p;
    _o.position.set(p.x,p.y+1,p.z); _o.rotation.set(0,o.i,0); _o.scale.setScalar(1); _o.updateMatrix(); (o.c.nitro?R3.nitroMesh:R3.coinMesh).setMatrixAt(o.slot,_o.matrix);});
  [R3.coinMesh,R3.nitroMesh].forEach(m=>{m.castShadow=true; m.frustumCulled=false; R3.world.add(m);});
}

/* ---------- per-frame ---------- */
const _o=T3('Object3D'), _vec=T3('Vector3');
function placeCar(m,zU,off,steer){
  const p=poseAt(zU,off), p2=poseAt(zU+SEG*2,off);
  m.position.set(p.x,p.y,p.z);
  const pitch=Math.atan2(p2.y-p.y,SL*2);
  m.rotation.set(pitch,-p.h-(steer||0),0,'YXZ');
  return p;
}
function render3D(dt){
  if(R3.builtFor!==buildSerial) build3DWorld();
  const pz=position+playerZ, pIdx=Math.floor(pz/SEG)%segments.length;
  if(!R3.player||R3.playerCarId!==activeCar.id){
    if(R3.player) R3.world.remove(R3.player);
    R3.player=carModel({model:activeCar.id,color:activeCar.color,roof:activeCar.roof}); R3.playerCarId=activeCar.id; R3.world.add(R3.player);}
  const steer=steerDir*.12*Math.min(1,speed/MAXSPEED+.2);
  const P=placeCar(R3.player,pz,playerX,steer);
  R3.player.position.y+=(offroad?(Math.random()-.5)*.06*speed/MAXSPEED:0);
  R3.player.userData.body.rotation.z=-steerDir*.03*speed/MAXSPEED;
  const spin=speed/MAXSPEED*60*dt/.34*SL; R3.player.userData.wheels.forEach((w,i)=>{w.rotation.x-=spin; if(i<2) w.rotation.y=-steer*2.2;});
  // cars
  for(const c of cars){const di=Math.floor(c.z/SEG)-pIdx, vis=di>-40&&di<R3.view;
    c.m3.visible=vis; if(vis){placeCar(c.m3,c.z,c.offset,0); const ws=c.speed/MAXSPEED*60*dt/.34*SL; c.m3.userData.wheels.forEach(w=>w.rotation.x-=ws);}}
  updateCrowd(dt,pIdx);
  // coins
  const spinA=tNow*3; let dc=false, dn=false;
  for(const o of R3.coinList){const di=o.i-pIdx; if(di<-20||di>R3.view) continue;
    const m=o.c.nitro?R3.nitroMesh:R3.coinMesh;
    _o.position.set(o.p.x,o.p.y+1+Math.sin(tNow*3+o.i)*.15,o.p.z); _o.rotation.set(0,spinA+o.i,0); _o.scale.setScalar(o.c.taken?0:1); _o.updateMatrix();
    m.setMatrixAt(o.slot,_o.matrix); if(o.c.nitro) dn=true; else dc=true;}
  if(dc) R3.coinMesh.instanceMatrix.needsUpdate=true; if(dn) R3.nitroMesh.instanceMatrix.needsUpdate=true;
  // oncoming traffic on the far carriageway
  for(const o of R3.oncoming||[]){ if(mode!=='intro'&&mode!=='countdown'&&!(CINEMA.on&&cinemaBlocked((o.z-o.v*dt)/SEG,o.lane*HW))) o.z-=o.v*dt;
    if(o.z<pz-40*SEG||o.z>pz+700*SEG) o.z=pz+(260+Math.random()*320)*SEG;
    const sg=segments[Math.floor(o.z/SEG)%segments.length], vis=!sg.water&&mode!=='title'||(!sg.water&&mode==='title');
    o.m.visible=vis; if(vis){const pp=placeCar(o.m,o.z,o.lane,0); o.m.rotation.y+=Math.PI; o.m.position.y+=0; const ws=o.v/MAXSPEED*60*dt/.34*SL; o.m.userData.wheels.forEach(w=>w.rotation.x+=ws);}}
  // chunks
  for(const C of R3.chunks) C.group.visible=C.i1>pIdx-30&&C.i0<pIdx+R3.view;
  // camera
  const cam=R3.cam, f=new TH.Vector3(Math.sin(P.h),0,-Math.cos(P.h)), up=new TH.Vector3(0,1,0);
  const car=new TH.Vector3(P.x,P.y,P.z);
  let want, look, smooth=1-Math.exp(-dt*7);
  if(mode==='intro'){const t=1-smooth01(U.limit(modeT/Math.max(1,introDur-.4),0,1)), ang=t*2.8+.0, rad=7+t*48, hgt=2.2+t*34;
    const dir=new TH.Vector3(-f.x,0,-f.z).applyAxisAngle(up,ang);
    want=car.clone().addScaledVector(dir,rad).addScaledVector(up,hgt); look=car.clone().addScaledVector(up,1); smooth=1;}
  else if(mode==='finish'){const ang=modeT*.5, dir=new TH.Vector3(-f.x,0,-f.z).applyAxisAngle(up,ang);
    want=car.clone().addScaledVector(dir,7.5+modeT*.6).addScaledVector(up,2.2+modeT*.25); look=car.clone().addScaledVector(up,.9); smooth=1-Math.exp(-dt*3);}
  else{ // chase camera: placed from the car's own position every frame, so it never falls behind at speed
    const portrait=innerHeight>innerWidth;
    R3.camLat=R3.camLat==null?playerX:R3.camLat+(playerX-R3.camLat)*(1-Math.exp(-dt*8));
    const back=mode==='title'?10:portrait?8.2:6.6, hgt=mode==='title'?3.4:portrait?3.1:2.2, ahead=portrait?18:12;
    const cp=poseAt(pz-back/SL*SEG,R3.camLat);
    R3.camY=R3.camY==null?cp.y:R3.camY+(Math.max(cp.y,P.y-1)-R3.camY)*(1-Math.exp(-dt*6));
    want=new TH.Vector3(cp.x,R3.camY+hgt,cp.z);
    const lp=poseAt(pz+ahead/SL*SEG,R3.camLat*.7+playerX*.3); look=new TH.Vector3(lp.x,lp.y+(portrait?.4:.9),lp.z); smooth=1;}
  if(R3.snap||!R3.camPos||R3.camPos.distanceTo(want)>60){R3.camPos=want.clone(); R3.camLook=look.clone(); R3.snap=false; R3.camY=null;}
  R3.camPos.lerp(want,smooth); R3.camLook.lerp(look,mode==='intro'||smooth===1?1:1-Math.exp(-dt*10));
  cam.position.copy(R3.camPos);
  if(shake>0&&!reduceMotion) cam.position.add(new TH.Vector3((Math.random()-.5)*shake*.25,(Math.random()-.5)*shake*.15,0));
  cam.lookAt(R3.camLook);
  if(cockpitOn()) cockpitCamera(cam,dt);
  else{const fov=(innerHeight>innerWidth?68:58)+speed/MAXSPEED*7+(nitroOn?6:0); if(Math.abs(cam.fov-fov)>.05){cam.fov+=(fov-cam.fov)*Math.min(1,dt*3); cam.updateProjectionMatrix();}}
  updateDrive(dt,P,f);
  if(CINEMA.on) cinemaCamera(cam,dt);
  // lights follow
  R3.sun.position.copy(car).addScaledVector(R3.sunDir,150); R3.sun.target.position.copy(car); R3.sun.target.updateMatrixWorld();
  if(R3.fill) R3.fill.position.copy(car).addScaledVector(up,4).addScaledVector(f,-2);
  R3.head.position.copy(car).addScaledVector(f,1.6).addScaledVector(up,.8); R3.head.target.position.copy(car).addScaledVector(f,35); R3.head.target.updateMatrixWorld();
  R3.sky.dome.position.copy(cam.position);
  R3.rings[0].position.set(cam.position.x,cam.position.y+90,cam.position.z); R3.rings[1].position.set(cam.position.x,cam.position.y+40,cam.position.z); R3.rings[2].position.set(cam.position.x,cam.position.y+20,cam.position.z);
  if(R3.stars) R3.stars.position.copy(cam.position);
  for(const s of R3.clouds){const u=s.userData; s.position.set(cam.position.x+u.x+tNow*2,cam.position.y+u.y,cam.position.z+u.z);}
  if(MAT.waterTex) MAT.waterTex.offset.set(tNow*.02,tNow*.013);
  if(R3.ship&&stage.id==='starbase'){R3.ship.position.y=91.5+launchT*launchT*6;}
  updateSmoke(dt,P,f);
  renderMirror(cam);
  renderFrame3D(cam);
  if(CINEMA.on){cinemaAfterRender(); ctx.clearRect(0,0,W,H); return;}
  // overlay
  ctx.clearRect(0,0,W,H);
  drawEffects3D();
  drawWindscreen();
  if(mode!=='title'&&mode!=='intro'){ctx.save(); ctx.textAlign='center'; ctx.font=`800 ${Math.max(11,14*UI)}px ${FD}`; ctx.shadowColor='rgba(0,0,0,.7)'; ctx.shadowBlur=6;
    for(const r of rivals){const di=Math.floor(r.z/SEG)-pIdx; if(di<2||di>80) continue; _vec.copy(r.m3.position); _vec.y+=2.1; _vec.project(cam); if(_vec.z>1) continue;
      ctx.globalAlpha=1-di/80; ctx.fillStyle='#fff8ea'; ctx.fillText(r.team.name.toUpperCase(),(_vec.x*.5+.5)*W,(-_vec.y*.5+.5)*H);}
    ctx.restore();}
  if(flash>0){ctx.fillStyle=`rgba(${flashCol},${flash*.7})`; ctx.fillRect(0,0,W,H);}
  if(cine>.01){const bh=H*.12*cine; ctx.fillStyle='#000'; ctx.fillRect(0,0,W,bh); ctx.fillRect(0,H-bh,W,bh);}
  if(mode==='intro') drawTitleCard();
  if(mode==='race'||mode==='countdown'||mode==='finish') drawHUD();
}
function smooth01(t){return t*t*(3-2*t);}
function drawEffects3D(){
  ctx.save(); ctx.globalCompositeOperation='lighter';
  for(const p of particles){ctx.globalAlpha=Math.max(0,p.life/p.max)*p.a; ctx.fillStyle=p.c; ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fill();}
  ctx.restore(); ctx.globalAlpha=1;
  const wt=stage.theme.weather;
  if(wt==='rain'){ctx.strokeStyle='rgba(200,215,235,.4)'; ctx.lineWidth=1.2*UI; ctx.beginPath(); for(const p of weather){ctx.moveTo(p.x,p.y); ctx.lineTo(p.x-6*UI*p.z,p.y+26*UI*p.z);} ctx.stroke();}
  else if(wt==='dust'){ctx.fillStyle='rgba(255,220,170,.45)'; for(const p of weather) ctx.fillRect(p.x,p.y,p.r*UI,p.r*UI);}
  else if(wt==='leaves'){for(const p of weather){ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.rot); ctx.fillStyle=p.c; ctx.beginPath(); ctx.ellipse(0,0,7*UI,3.5*UI,0,0,Math.PI*2); ctx.fill(); ctx.restore();}}
  if(nitroOn&&!reduceMotion){ctx.strokeStyle='rgba(255,255,255,.3)'; ctx.lineWidth=2*UI; ctx.beginPath();
    for(let i=0;i<22;i++){const a=Math.random()*Math.PI*2, r1=Math.min(W,H)*(.38+Math.random()*.2), r2=r1+Math.min(W,H)*(.2+Math.random()*.3);
      ctx.moveTo(W/2+Math.cos(a)*r1,H*.5+Math.sin(a)*r1*.6); ctx.lineTo(W/2+Math.cos(a)*r2,H*.5+Math.sin(a)*r2*.6);} ctx.stroke();}
  const v=ctx.createRadialGradient(W/2,H*.55,Math.min(W,H)*.4,W/2,H*.55,Math.max(W,H)*.8);
  v.addColorStop(0,'rgba(0,0,0,0)'); v.addColorStop(1,stage.theme.night?'rgba(0,0,10,.45)':'rgba(10,8,20,.22)'); ctx.fillStyle=v; ctx.fillRect(0,0,W,H);
}
function setGraphics(g){
  save.gfx=g; persist();
  if(g==='2d'){R3.on=false; if(R3.canvas) R3.canvas.hidden=true; return;}
  if(!init3D()){R3.on=false; save.gfx='2d'; persist(); return;}
  R3.on=true; R3.canvas.hidden=false; R3.quality=g==='low'?'low':'high'; resize3D(); R3.builtFor=-1;
  for(const k in TEX) if(k.startsWith('fac_')) delete TEX[k];
  for(const k in CARMAT) delete CARMAT[k];
  for(const k in R3) if(k.startsWith('lm_')) delete R3[k];
}

function applyBrightness(){
  const b=save.bright||1;
  if(R3.ok) R3.r.toneMappingExposure=(R3.baseExposure||.85)*b*(POST.on?1.12:1);
  cv.style.filter=R3.on||b===1?'':`brightness(${b})`;
  ['rgBright','rgBright2'].forEach(id=>{const e=document.getElementById(id); if(e) e.value=Math.round(b*100);});
}

/* ---------- post-processing: the look of a modern racing game ---------- */
const POST={on:false};
const PV='varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }';
function initPost(){
  if(!R3.r.capabilities.isWebGL2){POST.on=false; return;}
  POST.cam=new TH.OrthographicCamera(-1,1,1,-1,0,1); POST.scene=new TH.Scene(); POST.quad=new TH.Mesh(new TH.PlaneGeometry(2,2)); POST.quad.frustumCulled=false; POST.scene.add(POST.quad);
  const sm=(frag,uniforms)=>new TH.ShaderMaterial({vertexShader:PV,fragmentShader:frag,uniforms,depthTest:false,depthWrite:false,toneMapped:false});
  POST.bright=sm(`uniform sampler2D t; uniform float th,ex; varying vec2 vUv;
    void main(){ vec3 c=texture2D(t,vUv).rgb*ex; float l=max(max(c.r,c.g),c.b); gl_FragColor=vec4(c*smoothstep(th,th*1.8,l),1.0); }`,{t:{value:null},th:{value:1},ex:{value:1}});
  POST.blur=sm(`uniform sampler2D t; uniform vec2 d; varying vec2 vUv;
    void main(){ vec3 c=texture2D(t,vUv).rgb*.227027;
      c+=texture2D(t,vUv+d*1.3846).rgb*.316216; c+=texture2D(t,vUv-d*1.3846).rgb*.316216;
      c+=texture2D(t,vUv+d*3.2308).rgb*.070270; c+=texture2D(t,vUv-d*3.2308).rgb*.070270; gl_FragColor=vec4(c,1.0); }`,{t:{value:null},d:{value:new TH.Vector2()}});
  POST.final=sm(`uniform sampler2D t,bl; uniform float ex,bloom,blur,sat,con,vig,time; uniform vec2 res; varying vec2 vUv;
    vec3 fit(vec3 v){ vec3 a=v*(v+0.0245786)-0.000090537; vec3 b=v*(0.983729*v+0.4329510)+0.238081; return a/b; }
    vec3 aces(vec3 c){ const mat3 I=mat3(vec3(0.59719,0.07600,0.02840),vec3(0.35458,0.90834,0.13383),vec3(0.04823,0.01566,0.83777));
      const mat3 O=mat3(vec3(1.60475,-0.10208,-0.00327),vec3(-0.53108,1.10813,-0.07276),vec3(-0.07367,-0.00605,1.07602));
      return clamp(O*fit(I*(c/0.6)),0.0,1.0); }
    vec3 srgb(vec3 c){ return mix(pow(c,vec3(1.0/2.4))*1.055-0.055,c*12.92,step(c,vec3(0.0031308))); }
    void main(){ vec2 uv=vUv; vec3 c=texture2D(t,uv).rgb;
      if(blur>0.001){ vec2 dir=uv-vec2(0.5,0.52); float m=smoothstep(0.12,0.55,length(dir)); vec3 acc=c;
        for(int i=1;i<7;i++) acc+=texture2D(t,uv-dir*float(i)*blur*m*0.018).rgb; c=acc/7.0; }
      c=c*ex+texture2D(bl,uv).rgb*bloom;
      c=aces(c);
      c=c*(1.0-0.045)+0.045*vec3(0.92,0.96,1.0)*(1.0-c);
      float l=dot(c,vec3(0.2126,0.7152,0.0722)); c=mix(vec3(l),c,sat); c=clamp((c-0.5)*con+0.5,0.0,1.0);
      vec2 q=(uv-0.5)*vec2(res.x/res.y,1.0); c*=mix(1.0,smoothstep(1.25,0.35,length(q)),vig);
      c=srgb(c);
      c+=(fract(sin(dot(uv*res+time,vec2(12.9898,78.233)))*43758.5453)-0.5)/255.0;
      gl_FragColor=vec4(c,1.0); }`,
    {t:{value:null},bl:{value:null},ex:{value:1},bloom:{value:.5},blur:{value:0},sat:{value:1.15},con:{value:1.05},vig:{value:.35},time:{value:0},res:{value:new TH.Vector2(1,1)}});
  POST.on=true; sizePost();
}
function sizePost(){
  if(!POST.on) return;
  const v=R3.r.getDrawingBufferSize(new TH.Vector2()), w=Math.max(2,v.x), h=Math.max(2,v.y), hi=R3.quality==='high';
  ['main','b1','b2'].forEach(k=>{if(POST[k]) POST[k].dispose();});
  const rt=(W2,H2,s)=>{const t=new TH.WebGLRenderTarget(W2,H2,{type:TH.HalfFloatType,samples:s||0}); t.texture.minFilter=t.texture.magFilter=TH.LinearFilter; return t;};
  POST.main=rt(w,h,hi?4:0); const div=hi?4:6;
  POST.b1=rt(Math.ceil(w/div),Math.ceil(h/div)); POST.b2=rt(Math.ceil(w/div),Math.ceil(h/div));
  POST.final.uniforms.res.value.set(w,h);
}
function pass(mat,target){POST.quad.material=mat; R3.r.setRenderTarget(target); R3.r.render(POST.scene,POST.cam);}
function renderFrame3D(cam){
  if(!POST.on){R3.r.render(R3.scene,cam); return;}
  const r=R3.r, th=stage.theme, night=!!th.night, ex=R3.r.toneMappingExposure;
  r.setRenderTarget(POST.main); r.render(R3.scene,cam);
  const B=POST.bright.uniforms; B.t.value=POST.main.texture; B.th.value=night?.85:1.05; B.ex.value=ex; pass(POST.bright,POST.b1);
  const iters=R3.quality==='high'?2:1, bw=POST.b1.width, bh=POST.b1.height;
  for(let k=0;k<iters;k++){
    POST.blur.uniforms.t.value=POST.b1.texture; POST.blur.uniforms.d.value.set((k+1)/bw,0); pass(POST.blur,POST.b2);
    POST.blur.uniforms.t.value=POST.b2.texture; POST.blur.uniforms.d.value.set(0,(k+1)/bh); pass(POST.blur,POST.b1);}
  const F=POST.final.uniforms, sp=speed/MAXSPEED;
  F.t.value=POST.main.texture; F.bl.value=POST.b1.texture; F.ex.value=ex;
  F.bloom.value=night?.9:.5; F.sat.value=night?1.08:1.24; F.con.value=night?1.02:1.03; F.vig.value=.22; F.time.value=tNow%100;
  F.blur.value=reduceMotion||mode==='intro'?0:Math.max(0,sp-.6)*1.25+(nitroOn?.6:0);
  pass(POST.final,null);
}

/* ---------- tyre smoke and dust ---------- */
function smokeTex(){ if(TEX.smoke) return TEX.smoke;
  const c=mk(128,128,(g,w,h)=>{const R=rng(4); for(let i=0;i<14;i++){const x=w*(.3+R()*.4), y=h*(.3+R()*.4), r=w*(.18+R()*.18), gr=g.createRadialGradient(x,y,1,x,y,r);
    gr.addColorStop(0,'rgba(255,255,255,.55)'); gr.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle=gr; g.fillRect(0,0,w,h);}});
  return TEX.smoke=canvasTex(c,true,false);}
function initSmoke(){
  R3.smoke=[];
  for(let i=0;i<36;i++){const m=new TH.Sprite(new TH.SpriteMaterial({map:smokeTex(),transparent:true,depthWrite:false,opacity:0,color:0xffffff}));
    m.visible=false; m.userData={life:0}; R3.world.add(m); R3.smoke.push(m);}
  R3.smokeI=0;
}
function emitSmoke(pos,col,amount){
  for(let k=0;k<amount;k++){const m=R3.smoke[R3.smokeI++%R3.smoke.length], u=m.userData;
    m.position.set(pos.x+(Math.random()-.5)*.6,pos.y+.3,pos.z+(Math.random()-.5)*.6);
    u.life=1; u.max=.9+Math.random()*.6; u.vy=.6+Math.random()*.6; m.material.color.copy(col); m.visible=true;}
}
function updateSmoke(dt,P,f){
  if(!R3.smoke) return;
  const sp=speed/MAXSPEED, hard=Math.abs(steerDir)>0&&sp>.78, braking=keys.down&&sp>.45;
  if(mode==='race'&&(hard||braking||(offroad&&sp>.2))){
    const r=new TH.Vector3(Math.cos(P.h),0,Math.sin(P.h)), back=new TH.Vector3(P.x,P.y,P.z).addScaledVector(f,-1.6);
    const col=offroad?C3(stage.theme.grass[0]):C3('#e8eaee');
    if(Math.random()<(braking?.9:offroad?.8:.55)){emitSmoke(back.clone().addScaledVector(r,.8),col,1); emitSmoke(back.clone().addScaledVector(r,-.8),col,1);}
  }
  if(mode==='race'&&stage.theme.weather==='rain'&&sp>.35&&Math.random()<sp*.9){ // spray off the rear tyres
    const r=new TH.Vector3(Math.cos(P.h),0,Math.sin(P.h)), back=new TH.Vector3(P.x,P.y-.15,P.z).addScaledVector(f,-2.1);
    emitSmoke(back.clone().addScaledVector(r,(Math.random()<.5?1:-1)*.75),C3('#aab2ba'),1);}
  for(const m of R3.smoke){const u=m.userData; if(!m.visible) continue; u.life-=dt/u.max; if(u.life<=0){m.visible=false; continue;}
    m.position.y+=u.vy*dt; const s=1+(1-u.life)*4; m.scale.set(s,s,1); m.material.opacity=Math.min(.45,u.life*.55);}
}

/* ---------- Port Harcourt's glass tower with a split, angled crown ---------- */
function phTower(night){
  const G=new TH.Group();
  const glass=new TH.MeshPhysicalMaterial({color:C3('#2a4a78'),metalness:.75,roughness:.12,clearcoat:.6,
    emissive:new TH.Color(1,.85,.6),emissiveIntensity:night?.35:0,emissiveMap:night?canvasTex(facadePaint('office',true)):null});
  const H=92, w=24, d=17;
  const body=new TH.Mesh(quadsBox(w,d,H,6,7.2),glass); body.castShadow=true; G.add(body);
  const bands=[]; for(let y=3.6;y<H;y+=3.6) bands.push(gPrep(tr(new TH.BoxGeometry(w+.5,.32,d+.5),0,y,0)));
  const bm=new TH.Mesh(gMerge(bands),new TH.MeshStandardMaterial({color:C3('#e8ecf0'),roughness:.5,vertexColors:true})); bands.forEach(b=>b.dispose()); G.add(bm);
  const cg=new TH.BoxGeometry(w*.55,22,d+.2);
  [-1,1].forEach(s=>{const c=new TH.Mesh(cg,glass); c.position.set(s*w*.24,H+8.5,0); c.rotation.z=-s*.42; c.castShadow=true; G.add(c);});
  const base=new TH.Mesh(new TH.BoxGeometry(w+10,6,d+10),new TH.MeshStandardMaterial({color:C3('#d8dce2'),roughness:.6})); base.position.y=3; G.add(base);
  return G;
}
