/* =====================================================================
   DRIVER'S VIEW — cockpit interior with working gauges, a live rear-view
   mirror and wipers; rain and blood on the windscreen; brake lights;
   blood on the road after a hit
   ===================================================================== */
const DRV={wipe:0,wipePrev:0,wipeDir:1,wipeT:0,drops:[],splats:[],gaugeT:0,steer:0,frame:0};
const cockpitOn=()=>save.view==='cockpit'&&R3.on&&!CINEMA.on&&(mode==='race'||mode==='countdown');
function cpMat(hex,o){return new TH.MeshStandardMaterial(Object.assign({color:C3(hex),roughness:.8},o||{}));}
const LUX_LIGHT=['exec','suvmid','offroad','estate'];
function cockpitTheme(){const light=LUX_LIGHT.includes(activeCar.id);
  return light?{key:'light',leather:'#d9d5cc',top:'#c4bfb5',piano:'#0e0f12',trim:'#b8bcc2',wheel:'#dcd8cf',amb:'#ff5a7a',wood:true}
    :{key:'dark',leather:'#1d1e22',top:'#16171a',piano:'#0b0c0e',trim:'#8a9098',wheel:'#18191c',amb:'#2a6aff',wood:false};}
function woodTex(){ if(TEX.wood) return TEX.wood;
  const c=mk(256,512,(g,w,h)=>{g.fillStyle='#5a3a24'; g.fillRect(0,0,w,h); const R=rng(9);
    for(let x=0;x<w;x+=4){g.fillStyle=`rgba(${120+R()*40|0},${70+R()*30|0},${40+R()*20|0},${.25+R()*.35})`; g.fillRect(x,0,2+R()*2,h);}
    g.fillStyle='rgba(20,10,4,.5)'; for(let x=0;x<w;x+=18) g.fillRect(x,0,1.5,h);});
  return TEX.wood=canvasTex(c,true,false);}
function buildCockpit(){
  const T=cockpitTheme(), G=new TH.Group(), cx=.37, CZ=.6, R0=1.5; // the dash curves around the car's centre line, right of the driver's eye
  const M=(hex,o)=>cpMat(hex,o), leather=M(T.leather,{roughness:.7}), top=M(T.top,{roughness:.85}), piano=M(T.piano,{roughness:.12,metalness:.3}),
    trim=M(T.trim,{metalness:.85,roughness:.28}), amb=new TH.MeshBasicMaterial({color:C3(T.amb)}), wheelM=M(T.wheel,{roughness:.55}), dark=M('#141518',{roughness:.6});
  const add=(geo,mat,x,y,z,rx,P)=>{const m=new TH.Mesh(geo,mat); m.position.set(x,y,z); if(rx) m.rotation.x=rx; (P||G).add(m); return m;};
  const beam=(mat,a,b,w,d,P)=>{const A=new TH.Vector3(...a),B=new TH.Vector3(...b),dir=B.clone().sub(A),L=dir.length(); const m=new TH.Mesh(new TH.BoxGeometry(w,L,d),mat);
    m.position.copy(A).add(B).multiplyScalar(.5); m.quaternion.setFromUnitVectors(new TH.Vector3(0,1,0),dir.normalize()); (P||G).add(m); return m;};
  const arc=(r,h,a0,a1,mat,y,seg)=>{const g=new TH.CylinderGeometry(r,r,h,seg||64,1,true,Math.PI-a1,a1+a0); const m=add(g,mat,cx,y,CZ); m.material.side=TH.DoubleSide; return m;}; // a0 = angle to the left, a1 = to the right
  // the dashboard: a sweeping curved face, a padded top running to the windscreen, ambient light lines
  arc(R0+.02,.36,.92,.92,leather,-.33); arc(R0+.04,.9,.95,.95,M(T.key==='light'?'#a8a49c':'#101114',{roughness:.9}),-.95);
  add(new TH.PlaneGeometry(3.2,2).rotateX(-Math.PI/2),M('#0c0d10',{roughness:1}),cx,-1.05,-.3);
  const tg=new TH.RingGeometry(R0-.02,R0+.55,64,1,Math.PI/2-.92,1.84); tg.rotateX(-Math.PI/2); add(tg,top,cx,-.12,CZ).material.side=TH.DoubleSide;
  arc(R0-.03,.006,.9,.9,amb,-.128); arc(R0-.04,.006,.9,.9,amb,-.305);
  // the full-width curved glass screen: driver display, centre display and passenger display in one band
  arc(R0-.045,.175,.68,.72,piano,-.215);
  const sc=mk(2048,170,()=>{}), st=canvasTex(sc,true,false); st.wrapS=TH.RepeatWrapping; st.repeat.x=-1; st.offset.x=1;
  const scr=arc(R0-.05,.15,.66,.7,new TH.MeshBasicMaterial({map:st}),-.215,96); scr.renderOrder=6;
  // turbine air vents at both ends and a pair in the middle
  const vent=(x,y,z,s)=>{const v=new TH.Group(); v.position.set(x,y,z); v.lookAt(0,y,0); G.add(v);
    add(new TH.TorusGeometry(.05*s,.008*s,8,24),trim,0,0,0,0,v); add(new TH.CircleGeometry(.047*s,20),dark,0,0,-.004,0,v);
    for(let i=0;i<5;i++){const b=add(new TH.BoxGeometry(.088*s,.012*s,.004),trim,0,0,-.002,0,v); b.rotation.z=i/5*Math.PI;}
    add(new TH.CylinderGeometry(.012*s,.012*s,.01,10).rotateX(Math.PI/2),trim,0,0,.002,0,v); return v;};
  [.76,-.8].forEach(a=>vent(cx-Math.sin(a)*(R0-.05),-.215,CZ-Math.cos(a)*(R0-.05),1.15));
  // centre console: wood (or carbon) top with a light edge, sweeping down from the dash
  const cons=new TH.Group(); cons.position.set(cx,-.5,-.62); cons.rotation.x=-.35; G.add(cons);
  add(new TH.BoxGeometry(.26,.06,.6),T.wood?new TH.MeshStandardMaterial({map:woodTex(),roughness:.45}):piano,0,0,0,0,cons);
  [-1,1].forEach(s=>add(new TH.BoxGeometry(.012,.07,.6),amb,s*.135,0,0,0,cons));
  add(new TH.BoxGeometry(.22,.02,.08),piano,0,.04,.22,0,cons);
  // two-spoke steering wheel with touch pads and a plain centre emblem
  const wheel=new TH.Group(); wheel.position.set(0,-.34,-.66); wheel.rotation.x=-.3; G.add(wheel);
  const spin=new TH.Group(); wheel.add(spin);
  const rim=new TH.TorusGeometry(.17,.026,12,48); rim.scale(1,.94,1); add(rim,wheelM,0,0,0,0,spin);
  add(new TH.CylinderGeometry(.06,.06,.06,28).rotateX(Math.PI/2),wheelM,0,0,.01,0,spin);
  add(new TH.TorusGeometry(.022,.004,6,24),trim,0,0,.045,0,spin);
  [-1,1].forEach(s=>{const sp=add(new TH.BoxGeometry(.1,.045,.03),wheelM,s*.105,-.005,0,0,spin);
    add(new TH.BoxGeometry(.06,.032,.004),piano,s*.1,-.003,.017,0,spin);
    for(let k=0;k<3;k++) add(new TH.CircleGeometry(.004,8),new TH.MeshBasicMaterial({color:0xcfd8e8}),s*(.083+k*.017),-.003,.0195,0,spin);});
  beam(wheelM,[-.035,-.05,0],[-.05,-.155,0],.028,.024,spin); beam(wheelM,[.035,-.05,0],[.05,-.155,0],.028,.024,spin);
  add(new TH.CylinderGeometry(.03,.04,.12,12).rotateX(Math.PI/2),dark,0,-.34,-.74);
  // door panel with an ambient line and a speaker
  const door=new TH.Group(); door.position.set(-.72,-.38,-.42); door.rotation.y=.25; G.add(door);
  add(new TH.BoxGeometry(.06,.3,.62),leather,0,0,0,0,door); add(new TH.BoxGeometry(.065,.006,.62),amb,.003,.1,0,0,door);
  add(new TH.CylinderGeometry(.05,.05,.01,20).rotateZ(Math.PI/2),trim,.034,-.06,-.12,0,door);
  // pillars, headliner, visors and the frameless rear-view mirror
  beam(top,[-1.12,-.2,-1.15],[-.98,.6,-.8],.05,.07); beam(top,[cx*2+1.12,-.2,-1.15],[cx*2+.98,.6,-.8],.05,.07);
  add(new TH.BoxGeometry(2.2,.08,.32),M(T.key==='light'?'#d8d2c6':'#26272b',{roughness:.95}),cx,.53,-.56);
  [0,cx*2].forEach(x=>add(new TH.BoxGeometry(.46,.02,.18),leather,x,.47,-.62,-.25));
  beam(trim,[cx,.42,-.72],[cx,.34,-.74],.012,.012);
  add(new TH.BoxGeometry(.22,.062,.025),piano,cx,.31,-.76);
  const rt=new TH.WebGLRenderTarget(256,72); rt.texture.wrapS=TH.RepeatWrapping; rt.texture.repeat.x=-1; rt.texture.offset.x=1;
  add(new TH.PlaneGeometry(.205,.052),new TH.MeshBasicMaterial({map:rt.texture}),cx,.31,-.746);
  // wipers, parked low on the windscreen
  const wipers=[0,.8].map(x=>{const w=new TH.Group(); w.position.set(x,-.1,-1.3); G.add(w); beam(dark,[0,0,0],[.6,0,0],.01,.01,w); return w;});
  G.position.y=-.06;
  G.children.forEach(c=>{if(c.position.y<.1) c.position.y-=.1;}); // keep the dash low so the road fills most of the screen
  G.traverse(o=>{if(o.isMesh){o.castShadow=false; o.receiveShadow=false; o.userData.shared=true; if(!o.renderOrder) o.renderOrder=5;}});
  return {G,spin,wipers,sc,st,rt,theme:T.key,mcam:new TH.PerspectiveCamera(38,256/72,.5,900),carId:activeCar.id,piv:[[0,-.26,-1.3],[.8,-.26,-1.3]],tip:[0,.34,-1.3]};
}
function drawGauges(D){ // paints the whole screen band: driver display | centre display | passenger display
  const g=D.sc.getContext('2d'), W2=2048, H2=170, kmh=Math.round(speed/MAXSPEED*240), sp=speed/MAXSPEED, th=stage.theme, night=!!th.night;
  g.fillStyle='#050608'; g.fillRect(0,0,W2,H2);
  // far left: range and weather
  g.fillStyle='#8aa8d8'; g.font='600 15px sans-serif'; g.textAlign='center';
  const temp=th.night?24:th.weather==='rain'?25:31;
  g.fillText(temp+'°C',150,70); g.fillText(th.weather==='rain'?'☂ rain':th.night?'☾ night':'☀ clear',150,98);
  // driver display, directly behind the steering wheel
  let gr=g.createLinearGradient(0,0,0,H2); gr.addColorStop(0,'#06152e'); gr.addColorStop(1,'#020812'); g.fillStyle=gr; g.fillRect(270,0,650,H2);
  const dial=(x,val,max,label,big)=>{const r=60; g.lineWidth=6; g.strokeStyle='rgba(80,140,255,.25)'; g.beginPath(); g.arc(x,88,r,Math.PI*.75,Math.PI*2.25); g.stroke();
    g.strokeStyle='#5ab4ff'; g.shadowColor='#5ab4ff'; g.shadowBlur=12; g.beginPath(); g.arc(x,88,r,Math.PI*.75,Math.PI*.75+Math.min(1,val/max)*Math.PI*1.5); g.stroke(); g.shadowBlur=0;
    g.fillStyle='#eaf2ff'; g.textAlign='center'; g.font='700 34px sans-serif'; g.fillText(big,x,98); g.fillStyle='#8aa8d8'; g.font='600 13px sans-serif'; g.fillText(label,x,122);};
  const gp=Math.min(sp,1.3)*4.6, gear=speed<1?0:Math.min(6,1+Math.floor(gp));
  dial(400,kmh,240,'km/h',String(kmh)); dial(790,sp*100,130,'power %',String(Math.round(sp*100+(nitroOn?25:0))));
  g.fillStyle='#e8b04b'; g.font='800 30px sans-serif'; g.fillText(gear?'D'+gear:'P',595,78);
  g.fillStyle='#8aa8d8'; g.font='600 14px sans-serif'; g.fillText((Math.max(0,(finishIdx*SEG-position-playerZ)/SEG*mapInfo.metersPerSeg)/1000).toFixed(1)+' km to go',595,108);
  if(keys.down&&speed>1){g.fillStyle='#ff5a4a'; g.fillText('BRAKE',595,136);} else if(nitroOn){g.fillStyle='#7fd3ff'; g.fillText('BOOST',595,136);}
  // centre display: wallpaper of mountains at dusk, search bar, media and climate rows
  const X0=990, XW=620;
  gr=g.createLinearGradient(0,0,0,H2); gr.addColorStop(0,night?'#0a0f3a':'#1a3a8a'); gr.addColorStop(.7,night?'#2a2a7a':'#6a7ae0'); gr.addColorStop(1,'#c8b8f0'); g.fillStyle=gr; g.fillRect(X0,0,XW,H2);
  g.fillStyle=night?'#141a4a':'#2a3a8a'; g.beginPath(); g.moveTo(X0,140); [[.1,95],[.2,120],[.32,70],[.45,115],[.56,85],[.67,125],[.8,60],[.92,110],[1,90],[1,170/170*H2],[0,H2]].forEach(([x,y])=>g.lineTo(X0+x*XW,y)); g.fill();
  g.fillStyle='rgba(255,255,255,.85)'; g.beginPath(); g.moveTo(X0+.78*XW,72); g.lineTo(X0+.8*XW,60); g.lineTo(X0+.82*XW,74); g.fill();
  const now=new Date(), hh=String(now.getHours()).padStart(2,'0')+':'+String(now.getMinutes()).padStart(2,'0');
  g.fillStyle='rgba(10,16,40,.55)'; g.fillRect(X0,0,XW,24); g.fillStyle='#eaf2ff'; g.font='600 14px sans-serif'; g.textAlign='left'; g.fillText(stage.place,X0+12,17); g.textAlign='right'; g.fillText(hh+'   ▮▮▮  100%',X0+XW-10,17);
  const pill=(x,y,w,h,txt,sub)=>{g.fillStyle='rgba(20,28,60,.7)'; g.beginPath(); g.roundRect?g.roundRect(x,y,w,h,h/2):g.rect(x,y,w,h); g.fill(); g.fillStyle='#eaf2ff'; g.textAlign='left'; g.font='600 15px sans-serif'; g.fillText(txt,x+14,y+h/2+5);
    if(sub){g.fillStyle='#9ab0e0'; g.font='13px sans-serif'; g.fillText(sub,x+w-g.measureText(sub).width-14,y+h/2+5);}};
  pill(X0+30,34,230,32,'⌕  Where to?');
  const ms=Music.cur(), on=save.music!==false&&!Sound.muted;
  pill(X0+120,104,250,34,'♫  '+ms.name,on?ms.genre:'off'); pill(X0+382,104,170,34,'☎  My phone','100%');
  g.fillStyle='rgba(10,16,40,.6)'; g.fillRect(X0,146,XW,24); g.fillStyle='#eaf2ff'; g.font='600 14px sans-serif'; g.textAlign='center';
  g.fillText('22.0°    ❄ AUTO    ⌂    ◐    ≋    22.0°',X0+XW/2,163);
  // passenger display: stars, the big clock and the outside temperature
  gr=g.createLinearGradient(1630,0,2048,H2); gr.addColorStop(0,'#0a1240'); gr.addColorStop(1,'#2a1a6a'); g.fillStyle=gr; g.fillRect(1630,0,418,H2);
  const R=rng(3); g.fillStyle='rgba(255,255,255,.8)'; for(let i=0;i<50;i++) g.fillRect(1630+R()*418,R()*H2,1.5,1.5);
  g.fillStyle='#eaf2ff'; g.textAlign='right'; g.font='300 50px sans-serif'; g.fillText(hh,2010,92); g.font='600 14px sans-serif'; g.fillStyle='#b8c4f0';
  g.fillText('Ep '+(stageIdx+1)+' · '+stage.place+' · '+temp+'°C',2010,120);
  if(penaltyT>0){g.fillStyle=(tNow*4|0)%2?'#ff3a2a':'#3a6aff'; g.fillRect(0,0,W2,5);}
  D.st.needsUpdate=true;
}
function updateDrive(dt,P,f){
  if(!R3.cam.parent) R3.scene.add(R3.cam);
  const on=cockpitOn();
  if(on&&DRV.cp&&DRV.cp.theme!==cockpitTheme().key){R3.cam.remove(DRV.cp.G); DRV.cp=null;}
  if(on&&!DRV.cp){DRV.cp=buildCockpit(); R3.cam.add(DRV.cp.G);}
  const near=on?.06:.3; if(R3.cam.near!==near){R3.cam.near=near; R3.cam.updateProjectionMatrix();}
  if(DRV.cp) DRV.cp.G.visible=on;
  if(R3.player) R3.player.visible=!on;
  // brake lights on the player's car
  if(R3.player&&!R3.player.userData.brake){const m=R3.player.userData.body.children.find(c=>c.material&&c.material.emissive&&c.material.emissive.r>.9&&c.material.emissive.g<.3);
    if(m){m.material=m.material.clone(); R3.player.userData.brake=m.material;}}
  if(R3.player&&R3.player.userData.brake) R3.player.userData.brake.emissiveIntensity=(keys.down&&speed>1)||penaltyT>0||(mode==='race'&&speed<1)?3.4:1.3; // bright but still red, not blown out
  // wipers run in the rain and after a hit, until the glass is clear
  const rain=stage.theme.weather==='rain', need=rain||DRV.splats.length>0;
  DRV.wipePrev=DRV.wipe;
  if(need||DRV.wipe>.02){DRV.wipe+=DRV.wipeDir*dt*3.2; if(DRV.wipe>1.7){DRV.wipe=1.7; DRV.wipeDir=-1;} if(DRV.wipe<0){DRV.wipe=0; DRV.wipeDir=need?1:0;}}
  if(need&&DRV.wipeDir===0) DRV.wipeDir=1;
  if(rain&&on){for(let k=0;k<dt*40;k++) if(DRV.drops.length<160) DRV.drops.push({x:Math.random(),y:Math.random()*.62,r:1.5+Math.random()*3.5,a:.5+Math.random()*.4});}
  else if(!rain) DRV.drops.length=0;
  for(const b of DRV.splats) b.t+=dt;
  // blood on the road
  if(R3.blood) for(const B of R3.blood){
    if(B.dec){B.life-=dt; B.dec.material.opacity=Math.min(.95,B.life/8); if(B.life<=0){B.dec.visible=false; B.pts.visible=false;}}
    if(B.pts.visible&&B.fly>0){B.fly-=dt; const p=B.pts.geometry.attributes.position, v=B.vel;
      for(let i=0;i<p.count;i++){if(p.getY(i)<=B.gy) continue; v[i*3+1]-=9.8*dt; p.setXYZ(i,p.getX(i)+v[i*3]*dt,Math.max(B.gy,p.getY(i)+v[i*3+1]*dt),p.getZ(i)+v[i*3+2]*dt);}
      p.needsUpdate=true;}}
  if(!on) return;
  const D=DRV.cp;
  DRV.steer+=(steerDir*1.3-DRV.steer)*Math.min(1,dt*8); D.spin.rotation.z=-DRV.steer;
  D.wipers[0].rotation.z=DRV.wipe; D.wipers[1].rotation.z=DRV.wipe;
  DRV.gaugeT-=dt; if(DRV.gaugeT<=0){DRV.gaugeT=.15; drawGauges(D);}
}
// camera for the inside view: the driver's eye, looking down the road
function cockpitCamera(cam,dt){
  const m=R3.player; m.updateMatrixWorld(true);
  if(m.userData.eye==null){const b=new TH.Box3().setFromObject(m.userData.body); m.userData.eye=Math.max(1.0,b.max.y-.32);}
  const ey=m.userData.eye, sp=speed/MAXSPEED, bob=Math.sin(tNow*31)*.004*sp+(offroad?(Math.random()-.5)*.02*sp:0);
  cam.position.copy(m.localToWorld(new TH.Vector3(-.37,ey+bob,.15)));
  if(shake>0&&!reduceMotion) cam.position.add(new TH.Vector3((Math.random()-.5)*shake*.06,(Math.random()-.5)*shake*.05,0));
  cam.lookAt(m.localToWorld(new TH.Vector3(-.3,ey-1.1,-30)));
  cam.rotateZ(-steerDir*.025*sp);
  const asp=innerWidth/innerHeight, base=U.limit(2*Math.atan(1.15/asp)*180/Math.PI,52,82); // keep about 98° across on every screen shape
  const fov=base+sp*4+(nitroOn?3:0); if(Math.abs(cam.fov-fov)>.05){cam.fov+=(fov-cam.fov)*Math.min(1,dt*3); cam.updateProjectionMatrix();}
}
// the rear-view mirror: a small render looking backwards, every other frame on High
function renderMirror(cam){
  if(!cockpitOn()||!DRV.cp||(DRV.frame++%(R3.quality==='high'?2:R3.quality==='medium'?3:4))) return;
  const D=DRV.cp, mc=D.mcam, r=R3.r, f=new TH.Vector3(); cam.getWorldDirection(f);
  mc.position.copy(cam.position).addScaledVector(f,.4); mc.position.y+=.05; mc.lookAt(mc.position.clone().addScaledVector(f,-10).add(new TH.Vector3(0,-.4,0)));
  D.G.visible=false; const au=r.shadowMap.autoUpdate; r.shadowMap.autoUpdate=false;
  r.setRenderTarget(D.rt); r.render(R3.scene,mc); r.setRenderTarget(null);
  r.shadowMap.autoUpdate=au; D.G.visible=true;
}
/* ---------- blood after a hit ---------- */
function splatTex(){ if(TEX.splat) return TEX.splat;
  const c=mk(256,256,(g,w,h)=>{const R=rng(77); g.fillStyle='rgba(90,4,4,.95)';
    for(let i=0;i<14;i++){const a=R()*6.28, d=R()*40; g.beginPath(); g.ellipse(w/2+Math.cos(a)*d,h/2+Math.sin(a)*d,18+R()*30,12+R()*22,R()*3,0,6.28); g.fill();}
    for(let i=0;i<60;i++){const a=R()*6.28, d=50+R()*70; g.beginPath(); g.arc(w/2+Math.cos(a)*d,h/2+Math.sin(a)*d,1+R()*5,0,6.28); g.fill();}
    g.strokeStyle='rgba(90,4,4,.8)'; for(let i=0;i<10;i++){const a=R()*6.28; g.lineWidth=2+R()*3; g.beginPath(); g.moveTo(w/2+Math.cos(a)*40,h/2+Math.sin(a)*40); g.lineTo(w/2+Math.cos(a)*(80+R()*40),h/2+Math.sin(a)*(80+R()*40)); g.stroke();}});
  return TEX.splat=canvasTex(c,true,false);}
function spawnBlood(at,kind){
  if(!R3.blood||!R3.blood[0].dec.parent||R3.blood[0].dec.parent!==R3.world){
    R3.blood=[0,1,2].map(()=>{const dec=new TH.Mesh(new TH.PlaneGeometry(2,2),new TH.MeshStandardMaterial({map:splatTex(),transparent:true,depthWrite:false,roughness:.25,metalness:.1,polygonOffset:true,polygonOffsetFactor:-4}));
      dec.rotation.x=-Math.PI/2; dec.visible=false; R3.world.add(dec);
      const g=new TH.BufferGeometry(); g.setAttribute('position',new TH.Float32BufferAttribute(new Float32Array(90*3),3));
      const pts=new TH.Points(g,new TH.PointsMaterial({color:0x6a0404,size:.07})); pts.visible=false; pts.frustumCulled=false; R3.world.add(pts);
      return {dec,pts,vel:new Float32Array(90*3),life:0,fly:0,gy:0};}); R3.bloodI=0;}
  const B=R3.blood[R3.bloodI++%R3.blood.length], amt=kind==='keke'?.6:1;
  B.dec.position.set(at.x,at.y+.03,at.z); B.dec.rotation.z=Math.random()*6.28; B.dec.scale.setScalar(.7+amt*.5); B.dec.visible=true; B.life=40;
  const p=B.pts.geometry.attributes.position, f={x:Math.sin(at.h),z:-Math.cos(at.h)}; B.gy=at.y+.02;
  for(let i=0;i<p.count;i++){p.setXYZ(i,at.x,at.y+.7,at.z); const s=1.5+Math.random()*3.5;
    B.vel[i*3]=f.x*s+(Math.random()-.5)*2.5; B.vel[i*3+1]=1+Math.random()*3; B.vel[i*3+2]=f.z*s+(Math.random()-.5)*2.5;}
  p.needsUpdate=true; B.pts.visible=true; B.fly=3;
  if(cockpitOn()) for(let i=0;i<7+Math.random()*6;i++) DRV.splats.push({x:.25+Math.random()*.6,y:.12+Math.random()*.4,r:8+Math.random()*26,a:.92,t:0,seed:Math.random()*1000,smear:0});
}
/* ---------- the windscreen layer of the inside view: rain drops and blood, cleared by the wipers ---------- */
function drawWindscreen(){
  if(!cockpitOn()||!DRV.cp) return;
  const cam=R3.cam, proj=(x,y,z)=>{const v=new TH.Vector3(x,y,z).applyMatrix4(cam.projectionMatrix); return [(v.x*.5+.5)*W,(-v.y*.5+.5)*H];};
  const D=DRV.cp, piv=D.piv.map(v=>proj(...v)), tip=proj(...D.tip), len=Math.abs(piv[0][1]-tip[1])*1.05;
  const a0=Math.min(DRV.wipePrev,DRV.wipe)-.06, a1=Math.max(DRV.wipePrev,DRV.wipe)+.06;
  const wiped=(x,y)=>piv.some(([px,py])=>{const dx=x-px, dy=py-y, a=Math.atan2(dy,dx); return Math.hypot(dx,dy)<len&&a>=a0&&a<=a1;});
  if(a1-a0>.13){DRV.drops=DRV.drops.filter(d=>!wiped(d.x*W,d.y*H));
    DRV.splats.forEach(b=>{if(wiped(b.x*W,b.y*H)&&b.t>.5&&b.lastWipe!==DRV.wipeDir){b.a*=.45; b.smear++; b.lastWipe=DRV.wipeDir;}});
    DRV.splats=DRV.splats.filter(b=>b.a>.06);}
  ctx.save();
  for(const d of DRV.drops){const x=d.x*W, y=d.y*H, r=d.r*UI; const g=ctx.createRadialGradient(x-r*.3,y-r*.3,0,x,y,r);
    g.addColorStop(0,`rgba(255,255,255,${d.a*.55})`); g.addColorStop(.6,`rgba(190,205,225,${d.a*.18})`); g.addColorStop(1,'rgba(120,140,170,0)'); ctx.fillStyle=g; ctx.beginPath(); ctx.arc(x,y,r,0,6.28); ctx.fill();}
  for(const b of DRV.splats){const R=rng(b.seed|0), x=b.x*W, y=b.y*H, r=b.r*UI;
    ctx.fillStyle=`rgba(${110-b.smear*15},6,6,${b.a})`;
    if(b.smear){ctx.beginPath(); ctx.ellipse(x,y,r*(1.6+b.smear),r*.45,-.3,0,6.28); ctx.fill();}
    else{for(let i=0;i<6;i++){ctx.beginPath(); ctx.arc(x+(R()-.5)*r,y+(R()-.5)*r,r*(.3+R()*.5),0,6.28); ctx.fill();}
      for(let i=0;i<10;i++){const a=R()*6.28, d=r*(1+R()*1.4); ctx.beginPath(); ctx.arc(x+Math.cos(a)*d,y+Math.sin(a)*d,r*.08+R()*3,0,6.28); ctx.fill();}
      ctx.fillRect(x-r*.1,y,r*.12,Math.min(r*2.5,b.t*r*.8));}}
  ctx.restore();
}
