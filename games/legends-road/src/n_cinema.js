/* =====================================================================
   CINEMA MODE (press C) — hides the HUD, plays a shot list from
   shots.json with hard cuts, stands two actors at a street spot with idle
   and talk animations, moves their mouths from the loudness of their
   voice lines, keeps traffic and pedestrians 10 m away, and can record
   the sequence frame by frame at 1920x1080, 30 fps with CCapture.js.

   Actors are Mixamo characters you export yourself (FBX or GLB) into
   actors/; voice lines go in voice/. Without them the mode still runs,
   with built-in stand-in actors and a synthetic mumble voice.
   ===================================================================== */
const CINEMA={on:false,cfg:null,actors:[],lines:[],clock:0,shot:-1,spot:null,saved:null,rec:null,live:[],ready:false,loading:false,uiT:0};
const CINE_RADIUS=10;
const CINE_DEFAULT={
  spot:{place:'Ikoyi',side:1,ahead:45},
  loop:true,
  actors:[
    {name:'Kemi',model:'actors/kemi.fbx',idle:'actors/kemi_idle.fbx',talk:'actors/kemi_talk.fbx',voice:'female',height:1.68,at:[0,0,-0.85]},
    {name:'Tobi',model:'actors/tobi.fbx',idle:'actors/tobi_idle.fbx',talk:'actors/tobi_talk.fbx',voice:'male',height:1.8,at:[0,0,0.85]}
  ],
  lines:[
    {actor:0,src:'voice/kemi_1.mp3',at:4.3,dur:3.0},
    {actor:1,src:'voice/tobi_1.mp3',at:8.0,dur:3.0},
    {actor:0,src:'voice/kemi_2.mp3',at:11.6,dur:2.6},
    {actor:1,src:'voice/tobi_2.mp3',at:14.6,dur:3.2}
  ],
  shots:[
    {pos:[9,4.5,-14],lookAt:[0,1.4,0],fov:50,duration:4,move:'dolly',to:{pos:[6.5,3,-9]}},
    {pos:[3.4,1.55,0],lookAt:[0,1.45,0],fov:40,duration:3.8,move:'static'},
    {pos:[0.75,1.68,2.4],lookAt:[0,1.55,-0.85],fov:30,duration:3.6,move:'handheld'},
    {pos:[0.75,1.7,-2.4],lookAt:[0,1.62,0.85],fov:30,duration:3.4,move:'handheld'},
    {pos:[1.1,1.58,0.2],lookAt:[0,1.56,-0.85],fov:24,duration:3,move:'push',distance:0.35},
    {pos:[3,1.8,0],lookAt:[0,1.4,0],fov:45,duration:4.5,move:'orbit',angle:55},
    {pos:[2,1.2,0],lookAt:[0,1.4,0],fov:42,duration:5,move:'crane',to:{pos:[7,8,-7],lookAt:[0,0.5,10],fov:55}}
  ]
};
/* ---------- loading helpers ---------- */
const CINE_CDN=()=>{const s=[...document.scripts].find(x=>/three(\.min)?\.js/.test(x.src)); return s&&/jsdelivr|unpkg/.test(s.src);};
function loadScriptOnce(local,cdn){
  const src=CINE_CDN()?cdn:local; loadScriptOnce.p=loadScriptOnce.p||{};
  return loadScriptOnce.p[src]||(loadScriptOnce.p[src]=new Promise((res,rej)=>{const s=document.createElement('script'); s.src=src; s.onload=res; s.onerror=()=>rej(new Error('could not load '+src)); document.head.append(s);}));
}
const loadLoaders=()=>loadScriptOnce('vendor/fflate.min.js','https://cdn.jsdelivr.net/npm/three@0.147.0/examples/js/libs/fflate.min.js')
  .then(()=>Promise.all([loadScriptOnce('vendor/FBXLoader.js','https://cdn.jsdelivr.net/npm/three@0.147.0/examples/js/loaders/FBXLoader.js'),
    loadScriptOnce('vendor/GLTFLoader.js','https://cdn.jsdelivr.net/npm/three@0.147.0/examples/js/loaders/GLTFLoader.js')]));
const loadCCapture=()=>loadScriptOnce('vendor/CCapture.all.min.js','https://cdn.jsdelivr.net/npm/ccapture.js@1.1.0/build/CCapture.all.min.js');
async function loadShotList(){
  const q=new URLSearchParams(location.search).get('shots')||'shots.json';
  try{const r=await fetch(q,{cache:'no-cache'}); if(!r.ok) throw 0; const j=await r.json(); return Object.assign({},CINE_DEFAULT,j);}
  catch(_){return CINE_DEFAULT;}
}
function loadModelFile(url){ // Mixamo FBX or GLB/GLTF → {scene, animations}
  return loadLoaders().then(()=>new Promise((res,rej)=>{
    if(/\.(glb|gltf)$/i.test(url)) new TH.GLTFLoader().load(url,g=>res({scene:g.scene,animations:g.animations}),undefined,rej);
    else new TH.FBXLoader().load(url,o=>res({scene:o,animations:o.animations||[]}),undefined,rej);}));
}
/* ---------- the street spot and its local frame: +x toward the road, +z along the road, +y up ---------- */
function cineSpot(cfg){
  const sp=cfg.spot||{}, side=sp.side<0?-1:1;
  let seg=null; const pl=sp.place&&places.find(p=>p.name.toLowerCase()===String(sp.place).toLowerCase());
  if(Number.isFinite(sp.segment)) seg=sp.segment; else if(pl) seg=pl.seg+(sp.offset||12);
  if(seg==null||seg<startLine+10||seg>finishIdx-60) seg=Math.floor((position+playerZ)/SEG)+(sp.ahead||45);
  seg=Math.max(10,Math.min(segments.length-30,seg));
  const dual=!!stage.theme.dual, lat=side*(HW+3.2+(side<0&&dual?MW+2*HW+1.4:0)), p=poseAt(seg*SEG,lat/HW);
  const city=R3.crowd&&R3.crowd.city, d=Math.abs(lat)-(side<0&&dual?MW+2*HW+1.4:0);
  const y=p.y+(city?.16:terrainY(d)), f=new TH.Vector3(Math.sin(p.h),0,-Math.cos(p.h)), r=new TH.Vector3(Math.cos(p.h),0,Math.sin(p.h));
  return {seg,lat,side,origin:new TH.Vector3(p.x,y,p.z),x:r.clone().multiplyScalar(-side),z:f,y:new TH.Vector3(0,1,0)};
}
function spotToWorld(v,out){const S=CINEMA.spot; return (out||new TH.Vector3()).copy(S.origin).addScaledVector(S.x,v[0]).addScaledVector(S.y,v[1]).addScaledVector(S.z,v[2]);}
// is a point (segment index, lateral metres) inside the no-go circle around the actors?
function cinemaBlocked(s,lat){
  if(!CINEMA.on||!CINEMA.spot) return false;
  for(const a of CINEMA.actors){const dz=(s-a.seg)*SL, dx=lat-a.lat; if(dz*dz+dx*dx<CINE_RADIUS*CINE_RADIUS) return true;}
  return false;
}
/* ---------- built-in stand-in actor (used until Mixamo files are added) ---------- */
function standInActor(i){
  const R=rng(40+i), look=randomLook(R,i===0); if(i===0){look.gele='#c8321f'; look.wrap='#1f6fb8'; look.col='#f0b020';} else {look.col='#2a8a4a'; look.pants='#1d1f24';}
  const root=new TH.Group(), body=new TH.Group(), torso=new TH.Group(), head=new TH.Group(), armL=new TH.Group(), armR=new TH.Group();
  root.add(body); body.add(torso); torso.add(head,armL,armR);
  const mesh=(P,G)=>{const by={}; P.forEach(([k,g])=>(by[k]||(by[k]=[])).push(g)); for(const k in by){const m=new TH.Mesh(gMerge(by[k]),lifeMat(k)); m.castShadow=true; G.add(m);}};
  const legs=[]; const legC=look.female?look.skin:look.pants;
  [-1,1].forEach(s=>{limb(legs,'cloth',legC,[s*.085,.86,0],[s*.08,.12,0],.064); bpart(legs,'cloth','#1a1614',new TH.BoxGeometry(.1,.07,.23),s*.08,.035,.04);});
  if(look.female) bpart(legs,'cloth',look.wrap,new TH.CylinderGeometry(.17,.25,.66,14),0,.6,0); else bpart(legs,'cloth',look.pants,new TH.CylinderGeometry(.16,.16,.16,12),0,.86,0,1.12,1,.75);
  mesh(legs,body);
  torso.position.y=.9; const T=[]; torsoParts(T,look,0,.27,0,0); mesh(T,torso);
  head.position.y=.62; const Hd=[]; headParts(Hd,Object.assign({},look),0,.1,0); mesh(Hd,head); head.children.forEach(m=>m.rotation.y=Math.PI);
  [[armL,1],[armR,-1]].forEach(([g,s])=>{g.position.set(s*.22,.41,0); const A=[]; limb(A,'cloth',look.skin,[0,0,0],[s*.03,-.46,.02],.043); bpart(A,'cloth',look.skin,new TH.SphereGeometry(.05,8,6),s*.03,-.5,.02); mesh(A,g);});
  const mouth=new TH.Mesh(new TH.CircleGeometry(.026,16),new TH.MeshBasicMaterial({color:0x2a0c08})); mouth.position.set(0,.05,.112); mouth.scale.set(1,.15,1); head.add(mouth);
  return {root,standIn:true,rig:{body,torso,head,armL,armR,mouth},height:1.72};
}
/* ---------- Mixamo actor ---------- */
async function mixamoActor(spec){
  const m=await loadModelFile(spec.model), obj=m.scene;
  obj.traverse(o=>{if(o.isMesh){o.castShadow=true; o.receiveShadow=true; o.frustumCulled=false; if(o.material){(Array.isArray(o.material)?o.material:[o.material]).forEach(mt=>{mt.side=TH.FrontSide;});}}});
  const box=new TH.Box3().setFromObject(obj), h=Math.max(.01,box.max.y-box.min.y), s=(spec.height||1.75)/h;
  obj.scale.multiplyScalar(s); obj.position.y=-box.min.y*s;
  const root=new TH.Group(); root.add(obj);
  const mixer=new TH.AnimationMixer(obj), clip=async u=>{if(!u) return null; try{const a=await loadModelFile(u); return a.animations[0]||null;}catch(_){return null;}};
  const idleClip=(await clip(spec.idle))||m.animations[0]||null, talkClip=(await clip(spec.talk))||null;
  const idle=idleClip&&mixer.clipAction(idleClip), talk=talkClip&&mixer.clipAction(talkClip);
  if(idle){idle.play();} if(talk){talk.play(); talk.setEffectiveWeight(0);}
  // mouth: a morph target if the character has one, else a jaw bone, else a small mouth on the head bone
  let morph=null, jaw=null, headBone=null;
  obj.traverse(o=>{if(o.morphTargetDictionary&&!morph){const k=Object.keys(o.morphTargetDictionary).find(n=>/jawopen|mouthopen|viseme_aa|mouth_open|^a$/i.test(n)); if(k) morph={mesh:o,i:o.morphTargetDictionary[k]};}
    if(o.isBone&&/jaw/i.test(o.name)&&!jaw) jaw={bone:o,rest:o.rotation.x}; if(o.isBone&&/head$/i.test(o.name)&&!headBone) headBone=o;});
  let mouth=null; if(!morph&&!jaw&&headBone){mouth=new TH.Mesh(new TH.CircleGeometry(.024,16),new TH.MeshBasicMaterial({color:0x2a0c08})); mouth.scale.set(1,.15,1);}
  return {root,mixer,idle,talk,morph,jaw,headBone,mouth,mouthAt:spec.mouth||[0,.075,.1],height:spec.height||1.75};
}
/* ---------- voices: loudness envelopes (60 per second) drive the mouths ---------- */
async function synthVoice(kind,dur,seed){ // a placeholder mumble with formants, so the scene works with no files
  const sr=22050, oc=new OfflineAudioContext(1,Math.ceil(sr*dur),sr), R=rng(seed), f0=kind==='female'?205:118;
  const o=oc.createOscillator(); o.type='sawtooth'; const g=oc.createGain(), f1=oc.createBiquadFilter(), f2=oc.createBiquadFilter(), mix=oc.createGain();
  f1.type=f2.type='bandpass'; f1.Q.value=6; f2.Q.value=8; o.connect(f1); o.connect(f2); f1.connect(mix); f2.connect(mix); mix.connect(g); g.connect(oc.destination); g.gain.value=0;
  const V=[[730,1090],[270,2290],[530,1840],[300,870],[570,840]]; let t=.05;
  while(t<dur-.15){const syl=.12+R()*.14, v=V[Math.floor(R()*V.length)];
    o.frequency.setValueAtTime(f0*(1+(R()-.5)*.25)*(1-t/dur*.12),t); f1.frequency.setValueAtTime(v[0],t); f2.frequency.setValueAtTime(v[1],t);
    g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(.5,t+.03); g.gain.linearRampToValueAtTime(.08,t+syl); t+=syl+(R()<.18?.18:.02);}
  g.gain.setValueAtTime(0,t); o.start(0); o.stop(dur); return oc.startRendering();
}
function envelopeOf(buf){
  const d=buf.getChannelData(0), hop=Math.floor(buf.sampleRate/60), n=Math.floor(d.length/hop), env=new Float32Array(n);
  for(let i=0;i<n;i++){let s=0; for(let k=i*hop;k<(i+1)*hop;k++) s+=d[k]*d[k]; env[i]=Math.sqrt(s/hop);}
  const sorted=Array.from(env).sort((a,b)=>a-b), ref=sorted[Math.floor(n*.95)]||1e-3; let v=0;
  for(let i=0;i<n;i++){const x=Math.max(0,Math.min(1,(env[i]/ref-.12)*1.3)); v+=(x-v)*(x>v?.7:.35); env[i]=v;}
  return env;
}
async function loadLine(L,actors){
  Sound.init(); let buf=null;
  if(L.src){try{const r=await fetch(L.src); if(!r.ok) throw 0; buf=await Sound.ac.decodeAudioData(await r.arrayBuffer());}catch(_){buf=null;}}
  if(!buf){const sp=actors[L.actor]||{}; buf=await synthVoice(sp.voice||(L.actor?'male':'female'),L.dur||3,11+Math.round(L.at*7));}
  return {actor:L.actor,at:L.at,buf,env:envelopeOf(buf),dur:buf.duration,placeholder:!L.src||undefined};
}
/* ---------- enter / exit ---------- */
async function enterCinema(){
  if(CINEMA.on||CINEMA.loading) return;
  if(!R3.on){showToast('Cinema Mode','Needs 3D graphics. Switch Graphics to 3D on the title screen.'); return;}
  CINEMA.loading=true; showToast('Cinema Mode','Setting up the scene…');
  const cfg=await loadShotList();
  CINEMA.saved={position,paused,mode,view:save.view}; paused=false;
  CINEMA.on=true; CINEMA.cfg=cfg; document.body.classList.add('cinema');
  CINEMA.spot=cineSpot(cfg);
  position=U.increase((CINEMA.spot.seg-40)*SEG,-playerZ,trackLength); // keep the streets around the set loaded
  if(R3.crowd) for(const o of R3.crowd.peds) if(o.alive&&cinemaBlocked(o.s,o.lat)) o.alive=false;
  // actors
  CINEMA.actors.forEach(a=>R3.world.remove(a.root)); CINEMA.actors=[];
  const specs=cfg.actors.slice(0,2); let usedStandIn=false;
  for(let i=0;i<specs.length;i++){
    let a=null; if(specs[i].model){try{a=await mixamoActor(specs[i]);}catch(_){a=null;}}
    if(!a){a=standInActor(i); usedStandIn=true;}
    const at=specs[i].at||[0,0,i?0.85:-0.85], w=spotToWorld(at); a.root.position.copy(w);
    a.seg=CINEMA.spot.seg+(at[2]||0)/SL; a.lat=CINEMA.spot.lat-CINEMA.spot.side*(at[0]||0); a.talkW=0; a.name=specs[i].name;
    R3.world.add(a.root); if(a.mouth&&!a.standIn) R3.world.add(a.mouth); CINEMA.actors.push(a);}
  // face each other, turned a little toward the road so cameras on the road side see faces
  CINEMA.actors.forEach((a,i)=>{const o=CINEMA.actors[1-i]; if(!o) return; const d=o.root.position.clone().sub(a.root.position).normalize().addScaledVector(CINEMA.spot.x,.45);
    a.root.rotation.y=Math.atan2(d.x,d.z);});
  CINEMA.lines=await Promise.all((cfg.lines||[]).map(L=>loadLine(L,specs)));
  CINEMA.loading=false; CINEMA.ready=true; restartCinema(false);
  showToast('Cinema Mode'+(usedStandIn?' · stand-in actors':''),(usedStandIn?'Add your Mixamo files to actors/ to use them. ':'')+'C or Esc to leave · K to record 1920×1080 at 30 fps.');
}
function exitCinema(){
  if(!CINEMA.on) return;
  if(CINEMA.rec) stopRecording(false);
  stopLiveLines();
  CINEMA.actors.forEach(a=>{R3.world.remove(a.root); if(a.mouth&&!a.standIn) R3.world.remove(a.mouth);}); CINEMA.actors=[];
  CINEMA.on=false; document.body.classList.remove('cinema');
  const s=CINEMA.saved; if(s){position=s.position;} R3.snap=true; if(R3.player) R3.player.visible=true;
  showToast('Cinema Mode off','Back to the game.');
}
function toggleCinema(){CINEMA.on?exitCinema():enterCinema();}
function stopLiveLines(){CINEMA.live.forEach(s=>{try{s.stop();}catch(_){}}); CINEMA.live=[];}
function restartCinema(silent){
  CINEMA.clock=0; CINEMA.shot=-1; stopLiveLines();
  if(silent||!Sound.ac||Sound.muted) return;
  const t0=Sound.ac.currentTime+.05; CINEMA.t0=t0;
  CINEMA.lines.forEach(L=>{const src=Sound.ac.createBufferSource(), g=Sound.ac.createGain(); g.gain.value=1.4; src.buffer=L.buf; src.connect(g); g.connect(Sound.master); src.start(t0+L.at); CINEMA.live.push(src);});
}
/* ---------- each frame ---------- */
function cinemaUpdate(dt){ // the race is frozen; traffic keeps moving but stops at the edge of the set
  if(!CINEMA.on) return;
  const step=Math.min(dt,.1);
  for(const c of cars){ if(c.rival) continue;
    const nz=U.increase(c.z,step*c.speed,trackLength), s=nz/SEG, lat=c.offset*HW;
    if(cinemaBlocked(s,lat)) continue;
    let blockedBy=false; for(const o of cars){ if(o===c||o.rival) continue; const d=o.z-c.z; if(d>0&&d<SEG*6&&Math.abs(o.offset-c.offset)<.5&&cinemaBlocked(o.z/SEG,o.offset*HW)){blockedBy=true; break;}}
    if(blockedBy) continue;
    const oldSeg=findSeg(c.z); c.z=nz; const newSeg=findSeg(c.z); if(oldSeg!==newSeg){const i=oldSeg.cars.indexOf(c); if(i>=0) oldSeg.cars.splice(i,1); newSeg.cars.push(c);}
  }
}
const _cv1=TH?new TH.Vector3():null, _cv2=TH?new TH.Vector3():null, _cq=TH?new TH.Quaternion():null;
function cinemaCamera(cam,dt){
  if(!CINEMA.on||!CINEMA.ready) return;
  const cfg=CINEMA.cfg, shots=cfg.shots||[]; if(!shots.length) return;
  CINEMA.clock+=dt;
  if(R3.player) R3.player.visible=false; for(const c of cars) if(c.rival&&c.m3) c.m3.visible=false;
  // which shot are we in? (hard cuts between shots)
  let t=CINEMA.clock, i=0; const total=shots.reduce((a,s)=>a+(s.duration||3),0);
  if(t>=total){ if(CINEMA.rec){stopRecording(true); return;} if(cfg.loop!==false){restartCinema(false); t=0;} else {exitCinema(); return;} }
  while(i<shots.length-1&&t>=(shots[i].duration||3)){t-=(shots[i].duration||3); i++;}
  const S=shots[i], D=S.duration||3, u=Math.min(1,t/D), e=u*u*(3-2*u);
  const P0=S.pos||[3,1.6,0], L0=S.lookAt||[0,1.5,0], to=S.to||{}, f0=S.fov||40;
  let p=spotToWorld(P0,_cv1), l=spotToWorld(L0,_cv2), fov=f0;
  const lerp3=(A,B)=>[A[0]+(B[0]-A[0])*e,A[1]+(B[1]-A[1])*e,A[2]+(B[2]-A[2])*e];
  switch(S.move){
    case 'dolly': case 'crane': case 'track':
      if(to.pos) spotToWorld(lerp3(P0,to.pos),p); if(to.lookAt) spotToWorld(lerp3(L0,to.lookAt),l); if(to.fov) fov=f0+(to.fov-f0)*e; break;
    case 'push': case 'pull':{const dir=l.clone().sub(p).normalize(); p.addScaledVector(dir,(S.move==='push'?1:-1)*(S.distance||1)*e); break;}
    case 'pan': if(to.lookAt) spotToWorld(lerp3(L0,to.lookAt),l); break;
    case 'zoom': fov=f0+((to.fov||f0*.6)-f0)*e; break;
    case 'orbit':{const ang=(S.angle||40)*Math.PI/180*e, v=p.clone().sub(l); v.applyAxisAngle(CINEMA.spot.y,ang); p.copy(l).add(v); break;}
    case 'handheld':{const k=CINEMA.clock; p.x+=(Math.sin(k*1.7)+Math.sin(k*2.9)*.5)*.012; p.y+=(Math.sin(k*2.3)+Math.sin(k*3.7)*.4)*.01; l.x+=Math.sin(k*1.3)*.015; l.y+=Math.sin(k*1.9)*.012; break;}
    default: if(to.pos||to.lookAt||to.fov){if(to.pos) spotToWorld(lerp3(P0,to.pos),p); if(to.lookAt) spotToWorld(lerp3(L0,to.lookAt),l); if(to.fov) fov=f0+(to.fov-f0)*e;}
  }
  cam.position.copy(p); cam.lookAt(l); cam.rotation.z+=(S.roll||0)*Math.PI/180;
  if(Math.abs(cam.fov-fov)>.01){cam.fov=fov; cam.updateProjectionMatrix();}
  CINEMA.shot=i;
  R3.sun.position.copy(CINEMA.spot.origin).addScaledVector(R3.sunDir,150); R3.sun.target.position.copy(CINEMA.spot.origin); R3.sun.target.updateMatrixWorld();
  R3.sky.dome.position.copy(cam.position);
  cinemaActors(dt);
}
function cinemaActors(dt){
  const clk=CINEMA.clock;
  CINEMA.actors.forEach((a,i)=>{
    let m=0, talking=false;
    for(const L of CINEMA.lines){ if(L.actor!==i) continue; const lt=clk-L.at; if(lt>=0&&lt<L.dur){talking=true; m=Math.max(m,L.env[Math.min(L.env.length-1,Math.floor(lt*60))]||0);}}
    a.talkW+=((talking?1:0)-a.talkW)*Math.min(1,dt*4);
    if(a.standIn){const g=a.rig, k=clk+i*1.7;
      g.torso.scale.y=1+Math.sin(k*1.6)*.012; g.body.rotation.z=Math.sin(k*.7)*.015;
      g.head.rotation.x=-.05+Math.sin(k*5.2)*.05*a.talkW+m*.06; g.head.rotation.y=Math.sin(k*.9)*.12*(1-a.talkW)+Math.sin(k*2.1)*.08*a.talkW;
      g.armL.rotation.x=-a.talkW*(.5+Math.sin(k*3.1)*.35); g.armL.rotation.z=.08+a.talkW*.25;
      g.armR.rotation.x=-a.talkW*(.35+Math.sin(k*2.4+1)*.3); g.armR.rotation.z=-.08-a.talkW*.15;
      g.mouth.scale.y=.15+m*1.1;}
    else{
      if(a.mixer){if(a.talk&&a.idle){a.talk.setEffectiveWeight(a.talkW); a.idle.setEffectiveWeight(1-a.talkW);} a.mixer.update(dt);}
      if(a.morph) a.morph.mesh.morphTargetInfluences[a.morph.i]=m;
      else if(a.jaw) a.jaw.bone.rotation.x=a.jaw.rest+m*.3;
      else if(a.mouth&&a.headBone){a.root.updateMatrixWorld(true); const hb=a.headBone; hb.getWorldPosition(_cv1); hb.getWorldQuaternion(_cq);
        const sc=a.height/1.75; a.mouth.position.copy(_cv1).add(new TH.Vector3(a.mouthAt[0]*sc,a.mouthAt[1]*sc,a.mouthAt[2]*sc).applyQuaternion(_cq)); a.mouth.quaternion.copy(_cq); a.mouth.scale.set(sc,(.15+m*1.1)*sc,sc);}
    }
  });
}
/* ---------- recording: CCapture.js, 1920x1080, 30 fps ---------- */
async function startRecording(){
  if(!CINEMA.on||!CINEMA.ready||CINEMA.rec) return;
  try{await loadCCapture();}catch(e){showToast('Recording','Could not load CCapture.js.'); return;}
  const webm=!!document.createElement('canvas').toDataURL('image/webp').startsWith('data:image/webp');
  R3.force={w:1920,h:1080}; resize3D();
  CINEMA.recMusic=save.music; save.music=false; Music.update(); restartCinema(true);
  CINEMA.rec=new CCapture({format:webm?'webm':'png',framerate:30,quality:95,name:'legends-road-cinema',verbose:false,display:false});
  document.body.classList.add('recording'); CINEMA.rec.start();
}
function stopRecording(save_){
  const rec=CINEMA.rec; if(!rec) return; CINEMA.rec=null;
  rec.stop(); if(save_){rec.save(); exportDialogue();}
  document.body.classList.remove('recording'); R3.force=null; resize3D();
  save.music=CINEMA.recMusic; Music.update(); restartCinema(false);
  if(save_) showToast('Recording saved','legends-road-cinema.'+(rec.format||'webm')+' and the dialogue track (WAV) are downloading. Combine them with ffmpeg (see README).');
}
async function exportDialogue(){ // the voice lines mixed on the cinema timeline, as a WAV to put under the video
  const shots=CINEMA.cfg.shots||[], total=shots.reduce((a,s)=>a+(s.duration||3),0), sr=44100;
  const oc=new OfflineAudioContext(2,Math.ceil(total*sr),sr);
  CINEMA.lines.forEach(L=>{const s=oc.createBufferSource(); s.buffer=L.buf; s.connect(oc.destination); s.start(L.at);});
  const out=await oc.startRendering(), n=out.length, data=new DataView(new ArrayBuffer(44+n*4));
  const W=(o,s)=>{for(let i=0;i<s.length;i++) data.setUint8(o+i,s.charCodeAt(i));};
  W(0,'RIFF'); data.setUint32(4,36+n*4,true); W(8,'WAVE'); W(12,'fmt '); data.setUint32(16,16,true); data.setUint16(20,1,true); data.setUint16(22,2,true);
  data.setUint32(24,sr,true); data.setUint32(28,sr*4,true); data.setUint16(32,4,true); data.setUint16(34,16,true); W(36,'data'); data.setUint32(40,n*4,true);
  const L=out.getChannelData(0), Rc=out.getChannelData(1); for(let i=0;i<n;i++){data.setInt16(44+i*4,Math.max(-1,Math.min(1,L[i]))*32767,true); data.setInt16(46+i*4,Math.max(-1,Math.min(1,Rc[i]))*32767,true);}
  const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([data],{type:'audio/wav'})); a.download='legends-road-cinema-dialogue.wav'; document.body.append(a); a.click(); a.remove();
}
function cinemaAfterRender(){ if(CINEMA.rec) CINEMA.rec.capture(R3.canvas); }
