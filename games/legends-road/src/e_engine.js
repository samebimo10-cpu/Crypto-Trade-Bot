
/* =====================================================================
   ART CACHES
   ===================================================================== */
const SCEN = {
  palm:{fn:'palm',w:320,h:560,wW:1500,min:1.25,spread:1.8,n:3},
  pine:{fn:'pine',w:300,h:560,wW:1300,min:1.25,spread:2.2,n:3},
  poplar:{fn:'poplar',w:240,h:640,wW:1050,min:1.2,spread:1.5,n:3},
  baobab:{fn:'baobab',w:520,h:560,wW:2600,min:1.6,spread:2.4,n:2},
  acacia:{fn:'acacia',w:560,h:400,wW:2600,min:1.5,spread:2.2,n:2},
  bush:{fn:'bush',w:300,h:200,wW:900,min:1.15,spread:1.6,n:3},
  tree:{fn:'tree',w:400,h:480,wW:1800,min:1.3,spread:2.2,n:2},
  dunegrass:{fn:'dunegrass',w:300,h:180,wW:950,min:1.15,spread:1.6,n:3},
  wheat:{fn:'wheat',w:300,h:160,wW:900,min:1.15,spread:2,n:2},
  pole:{fn:'pole',w:200,h:600,wW:700,min:1.25,spread:.15,n:1},
  lamp:{fn:'lamp',w:160,h:600,wW:520,min:1.12,spread:.08,n:1},
  adobe:{fn:'adobe',w:520,h:380,wW:3300,min:1.7,spread:2.4,n:2},
  horreo:{fn:'horreo',w:600,h:360,wW:2900,min:1.6,spread:2,n:1},
  cottage:{fn:'cottage',w:520,h:440,wW:2800,min:1.7,spread:2.2,n:2},
  haussmann:{fn:'haussmann',w:600,h:720,wW:4200,min:1.8,spread:1.2,n:2},
  colonial:{fn:'colonial',w:520,h:600,wW:3600,min:1.8,spread:1.5,n:3},
  office:{fn:'office',w:420,h:1000,wW:3400,min:1.9,spread:2.2,n:3},
  kiosk:{fn:'kiosk',w:420,h:300,wW:1500,min:1.3,spread:.8,n:3},
  stall:{fn:'stall',w:300,h:330,wW:1100,min:1.25,spread:.6,n:3},
  compound:{fn:'compound',w:620,h:420,wW:3600,min:1.7,spread:2.2,n:2},
  frame:{fn:'frame',w:520,h:520,wW:3200,min:1.9,spread:2.4,n:2},
  fuel:{fn:'fuel',w:700,h:420,wW:5200,min:2.2,spread:1.2,n:1},
  phhouse:{fn:'cottage',w:520,h:440,wW:2700,min:1.7,spread:3.4,n:3},
  tower:{fn:'tower',w:400,h:1200,wW:3200,min:1.9,spread:2.2,n:3,lit:true},
  neon:{fn:'neon',w:160,h:540,wW:700,min:1.2,spread:.5,n:4,emissive:true},
  barn:{fn:'barn',w:600,h:460,wW:4200,min:2.0,spread:2.5,n:1},
  silo:{fn:'silo',w:220,h:640,wW:1500,min:2.0,spread:2.5,n:1},
  craftsman:{fn:'craftsman',w:520,h:440,wW:3300,min:1.7,spread:1.8,n:3,lit:true},
  hangar:{fn:'hangar',w:700,h:640,wW:6000,min:2.6,spread:2.2,n:1,lit:true}
};
const LANDMARK = {
  kanoGate:{w:900,h:620,wW:9500}, hercules:{w:420,h:1100,wW:4800}, eiffel:{w:620,h:1200,wW:8200},
  gateway:{w:1000,h:720,wW:10000}, hkTower:{w:420,h:1300,wW:5000}, locomotive:{w:1100,h:520,wW:9000},
  needle:{w:520,h:1300,wW:5600}, starship:{w:640,h:1400,wW:6800},
  derrick:{w:500,h:1100,wW:5000}, nigerBridge:{w:1400,h:500,wW:16000},
  linkBridge:{w:900,h:900,wW:9000}, portCranes:{w:1100,h:700,wW:11000}
};
const RIVAL_STYLE = {okafor:'muscle', laurent:'gt', chen:'coupe', muller:'rally', sharma:'roadster'};
const SLOGANS = ['NO FOOD FOR LAZY MAN','GOD\'S TIME IS THE BEST','NO KING AS GOD','EKO O NI BAJE','HUSTLE NO DEY SLEEP'];
const artCache = {};
let carArt = null, playerArt = null;
const mkCar=(o,w=360,h=220)=>mk(w,h,(g,W2,H2)=>drawCar(g,W2,H2,o));
function buildCarArt(){
  carArt = {
    rivals:TEAMS.map(t=>mkCar({col:t.color,kind:'rival',style:RIVAL_STYLE[t.id],accent:'#f4ead6',plate:t.name.toUpperCase()})),
    traffic:['#6a7a8a','#8a6a4a','#4a6a5a','#9a9aa0','#5a4a6a'].map(c=>Object.assign(mkCar({col:c,kind:'traffic'}),{_col:c})),
    trucks:['#e8e4dc','#c84a2a','#3a5a8a'].map(c=>Object.assign(mkCar({col:c,kind:'truck'},300,300),{_col:c})),
    danfo:SLOGANS.map(s=>Object.assign(mkCar({kind:'danfo',slogan:s},300,300),{_danfo:s})),
    okada:['#c8321f','#1d1f24','#2f5f9e'].map(c=>Object.assign(mk(200,260,(g,w,h)=>drawTwoWheeler(g,w,h,c)),{_okada:c})),
    keke:['#f2c21b','#2a8a4a'].map(c=>Object.assign(mk(300,300,(g,w,h)=>drawKeke(g,w,h,c)),{_keke:c}))
  };
}
function drawTwoWheeler(g,w,h,col){
  g.fillStyle='rgba(0,0,0,.4)'; ell(g,w/2,h*.95,w*.3,h*.04); g.fill();
  g.fillStyle='#111'; rr(g,w*.43,h*.62,w*.14,h*.34,8); g.fill();
  g.fillStyle=col; rr(g,w*.32,h*.5,w*.36,h*.18,10); g.fill();
  g.fillStyle='#ff3a2a'; g.fillRect(w*.44,h*.6,w*.12,h*.04);
  [[.5,.16,'#2a2c30'],[.5,.02,'#d8dcde']].forEach(([x,y,c],k)=>{g.fillStyle=k?'#3a3d42':'#2f5f9e'; rr(g,w*(x-.17),h*(y+.14),w*.34,h*.24,12); g.fill(); g.fillStyle=c; ell(g,w*x,h*(y+.1),w*.11,w*.11); g.fill();});
}
function drawKeke(g,w,h,col){
  g.fillStyle='rgba(0,0,0,.4)'; ell(g,w/2,h*.94,w*.42,h*.05); g.fill();
  g.fillStyle='#111'; rr(g,w*.12,h*.74,w*.12,h*.2,6); g.fill(); rr(g,w*.76,h*.74,w*.12,h*.2,6); g.fill();
  g.fillStyle=col; rr(g,w*.14,h*.42,w*.72,h*.36,10); g.fill();
  g.fillStyle='#1a1c20'; rr(g,w*.1,h*.08,w*.8,h*.12,10); g.fill(); g.fillRect(w*.14,h*.18,w*.05,h*.26); g.fillRect(w*.81,h*.18,w*.05,h*.26);
  g.fillStyle='#2a3240'; g.fillRect(w*.24,h*.24,w*.52,h*.18);
  g.fillStyle='#ff3a2a'; g.fillRect(w*.18,h*.62,w*.1,h*.05); g.fillRect(w*.72,h*.62,w*.1,h*.05);
}
function buildPlayerArt(c){
  const o=t=>({col:c.color,turn:t,kind:'player',style:c.style,accent:c.accent,plate:'ADEYEMI'});
  playerArt={s:mkCar(o(0)),l:mkCar(o(-1)),r:mkCar(o(1))};
}
function buildArt(idx,th0,key){
  const ck=idx+'|'+(key||'base');
  if(artCache[ck]) return artCache[ck];
  const st=STAGES[idx], th=th0||st.theme, night=!!th.night, R=rng(77+idx*131);
  const scen={};
  [...new Set(th.scenery.concat(['lamp']))].forEach(name=>{
    const d=SCEN[name], imgs=[];
    for(let i=0;i<d.n;i++) imgs.push(mk(d.w,d.h,(g,w,h)=>{
      ART[d.fn](g,w,h,{r:R,night,i,c:name==='pine'&&idx===3?'#2f6a3e':undefined});
      if(night && !d.emissive && !d.lit && name!=='lamp') nightTint(g,w,h,.6);
    }));
    imgs.forEach((c,i)=>{c._k=name; c._v=i;});
    scen[name]={imgs,wW:d.wW,min:d.min,spread:d.spread};
  });
  const L=LANDMARK[th.landmark];
  const landmark=mk(L.w,L.h,(g,w,h)=>{ART[th.landmark](g,w,h,{lights:night||st.id==='paris'}); if(night&&th.landmark!=='hkTower'&&th.landmark!=='starship') nightTint(g,w,h,.45);});
  const accent=th.rumble[1];
  const a={
    scen, landmark, landmarkW:L.wW,
    rail: mk(300,120,(g,w,h)=>{ART.rail(g,w,h); if(night) nightTint(g,w,h,.5);}),
    welcome: billboard(st.place.toUpperCase(), st.era, shade(accent,-.2), shade(accent,-.55)),
    mid: billboard(st.person.name.toUpperCase(), 'The legend of '+st.place, '#1d2a44', '#0c1424'),
    start: banner('EPISODE '+(idx+1)+' · DEPARTURE', shade(accent,-.25)),
    finish: banner('ARRIVAL · '+st.place.toUpperCase(), '#a2341f'),
    far: buildLayer(th.far, th, idx, 0),
    near: buildLayer(th.mid, th, idx, 1),
    signs:{}, placeBoards:{}
  };
  a.landmark._k='landmark'; a.rail._k='rail'; a.welcome._k=a.mid._k='board'; a.start._k=a.finish._k='banner';
  artCache[ck]=a;
  return a;
}

/* =====================================================================
   ROAD, MAP AND RACE STATE
   ===================================================================== */
const FPS=60, STEP=1/FPS, SEG=200, RUMBLE=3, ROADW=2000, LANES=3, FOV=100, CAMH=1000, DRAWD=300, FOGD=5;
const camDepth=1/Math.tan((FOV/2)*Math.PI/180), playerZ=CAMH*camDepth;
const MAXSPEED=SEG/STEP, ACCEL=MAXSPEED/5, BRAKE=-MAXSPEED, DECEL=-MAXSPEED/5, OFF_DECEL=-MAXSPEED/2, OFF_LIMIT=MAXSPEED/4;
const CENTRIFUGAL=.22, NITRO_MAX=1.32, CAR_W=560, PLAYER_W=CAR_W/ROADW;
const DUAL_SHIFT=21.4/5.5; // median (9 m) + opposite road (11 m) + kerbs, in road half-widths
const START_SEG=40, K_MAP=.0045, K_GEO=.01, BL=70, BW=.34;

const cv=document.getElementById('game'), ctx=cv.getContext('2d');
let W=0,H=0,UI=1;
let segments=[], trackLength=0, finishZ=0, finishIdx=0, startLine=0;
let stageIdx=0, stage=STAGES[0], art=null, pal=null, mapInfo=null, branches=[], places=[];
let position=0, speed=0, playerX=0, playerY=0, nitro=1, nitroCap=1, nitroOn=false, steerDir=0, onBranch=false;
let cars=[], rivals=[], raceTime=0, countdown=0, mode='title', modeT=0, rank=6, lastRank=6, fortune=0, finalTime=0;
let farOff=0, nearOff=0, skyOff=0, shake=0, flash=0, flashCol='255,255,255', tNow=0, autoLane=0, offroad=false;
let penaltyT=0, strikes=0, fines=0, hitCD=0, banned=false;
let storyShown=false, factIdx=0, placeIdx=1, cine=0, introDur=0, launchT=0, shield=0, boostT=0, perkBoost=false, finalSaid=false, ledOnce=false, legOrder=[];
let activeCar=CARS[0], miniRect=null;
const particles=[], weather=[], stars=[], clouds=[];
const keys={left:false,right:false,up:false,down:false,nitro:false};
let touchMode=false, paused=false;
const AUTODRIVE=/[?&]autodrive\b/.test(location.search); // demo mode: the car drives itself

function resize(){
  const dpr=Math.min(window.devicePixelRatio||1,2), w=innerWidth, h=innerHeight;
  let s=dpr; const maxPix=1600*1000; if(w*h*s*s>maxPix) s=Math.sqrt(maxPix/(w*h));
  W=cv.width=Math.max(320,Math.round(w*s)); H=cv.height=Math.max(240,Math.round(h*s));
  UI=Math.min(W,H)/720;
  if(typeof R3!=='undefined'&&R3.on) resize3D();
}
addEventListener('resize',resize);

function lastY(){return segments.length?segments[segments.length-1].p2.world.y:0;}
function addSegment(curve,y){const n=segments.length;
  segments.push({index:n,p1:{world:{y:lastY(),z:n*SEG},camera:{},screen:{}},p2:{world:{y,z:(n+1)*SEG},camera:{},screen:{}},
    curve,sprites:[],cars:[],coins:[],clip:0,fog:1,looped:false,stripe:Math.floor(n/RUMBLE)%2,mark:null,water:false,branch:null});}
function addRoad(enter,hold,leave,curve,y){
  const sY=lastY(), eY=sY+Math.round(y)*SEG, total=Math.max(1,enter+hold+leave);
  for(let n=0;n<enter;n++) addSegment(U.easeIn(0,curve,n/enter),U.easeInOut(sY,eY,n/total));
  for(let n=0;n<hold;n++)  addSegment(curve,U.easeInOut(sY,eY,(enter+n)/total));
  for(let n=0;n<leave;n++) addSegment(U.easeInOut(curve,0,n/leave),U.easeInOut(sY,eY,(enter+hold+n)/total));
}
function findSeg(z){return segments[Math.floor(z/SEG)%segments.length];}
function addSprite(i,img,wW,offset,extra){if(i<0||i>=segments.length) return; segments[i].sprites.push(Object.assign({img,wW,offset,collide:true},extra||{}));}
function branchOff(br,i){const t=U.limit((i-br.b0)/BL,0,1); return .72+2.1*t*t;}
function geoXY(lat,lon,lat0,lon0){return [(lon-lon0)*111320*Math.cos(lat0*Math.PI/180), -(lat-lat0)*110540];}

/* Builds the road for a stage with real coordinates: each leg's length and each turn's angle come from the map. */
function buildGeoRoad(st,R){
  const lat0=st.route.reduce((a,p)=>a+p.lat,0)/st.route.length, lon0=st.route.reduce((a,p)=>a+p.lon,0)/st.route.length;
  const P=st.route.map(p=>geoXY(p.lat,p.lon,lat0,lon0));
  const legs=[]; let total=0;
  for(let k=0;k<P.length-1;k++){const dx=P[k+1][0]-P[k][0], dy=P[k+1][1]-P[k][1], L=Math.hypot(dx,dy); legs.push({L,ang:Math.atan2(dx,-dy)}); total+=L;}
  const mps=total/3300, wp=[startLine];
  for(let k=0;k<legs.length;k++){
    if(k>0){
      let d=legs[k].ang-legs[k-1].ang; while(d>Math.PI) d-=2*Math.PI; while(d<-Math.PI) d+=2*Math.PI;
      const e=14,l=14,base=e/3+l/2,S=Math.abs(d)/K_GEO; let c,hold;
      if(S/5>base){c=5; hold=Math.round(S/5-base);} else {c=Math.max(.4,S/base); hold=0;}
      wp.push(segments.length+Math.round((e+hold+l)/2));
      addRoad(e,hold,l,Math.sign(d)*c,0);
    }
    const bridge=!!st.route[k+1].bridgeIn, s0=segments.length;
    let remain=Math.max(50,Math.round(legs[k].L/mps));
    while(remain>0){
      const L=Math.min(remain,30+Math.floor(R()*50)), q=Math.max(1,Math.floor(L/3));
      const c=bridge?(R()<.5?-1:1)*(.3+R()*.6):(R()<.6?(R()<.5?-1:1)*(1+R()*2.2):0);
      let hill=bridge?0:(R()<.55?(R()<.5?-1:1)*Math.round(4+R()*16):0);
      if(Math.abs(lastY()/SEG+hill)>60) hill=-hill;
      addRoad(q,Math.max(0,L-2*q),q,c,hill); remain-=L;
    }
    if(bridge) for(let i=s0;i<segments.length;i++) segments[i].water=true;
  }
  addRoad(30,40,30,0,-lastY()/SEG);
  return {P,wp,mps,lat0,lon0};
}

function buildTrack(idx){
  const st=stage, th=stage.theme, R=rng(1000+idx*7919), diff=.85+idx*.04;
  art=buildArt(idx,th,condKey);
  segments=[]; branches=[]; places=[];
  startLine=START_SEG+8;
  addRoad(0,START_SEG+30,0,0,0);
  let geo=null;
  if(st.route) geo=buildGeoRoad(st,R);
  else{
    const target=3000+idx*110;
    while(segments.length<target){
      const L=pick(R,[20,30,45,60]);
      const curve=R()<.8?(R()<.5?-1:1)*(1.5+R()*3.5)*diff:0;
      let hill=R()<.65?(R()<.5?-1:1)*Math.round(10+R()*45):0;
      const yNow=lastY()/SEG; if(yNow+hill>110||yNow+hill<-110) hill=-hill;
      if(R()<.18){addRoad(L,L,L,curve,hill/2); addRoad(L,L,L,-curve,-hill/2);}
      else addRoad(L,Math.round(L*(.5+R())),L,curve,hill);
    }
    addRoad(50,60,50,0,-lastY()/SEG);
  }
  finishIdx=segments.length+30;
  addRoad(0,30+DRAWD+160,0,0,0);
  trackLength=segments.length*SEG; finishZ=finishIdx*SEG;
  if(geo) geo.wp.push(finishIdx);

  for(let i=0;i<2;i++) segments[startLine+i].mark='check';
  for(let i=0;i<3;i++) segments[finishIdx+i].mark='check';
  addSprite(startLine+1,art.start,ROADW*2.7,0,{center:true,collide:false});
  addSprite(finishIdx,art.finish,ROADW*2.7,0,{center:true,collide:false});

  // places along the road
  if(geo) st.route.forEach((p,k)=>places.push({seg:geo.wp[k],name:p.n,desc:p.d}));
  else{const n=st.places.length; st.places.forEach((name,j)=>places.push({seg:Math.round(startLine+(finishIdx-startLine)*(j+1)/(n+1)),name,desc:''}));}

  mapInfo=buildMap(st,geo);
  findShortcuts(R);
  mapInfo.small=mk(360,360,g=>drawMap(g,360,mapInfo,st,false));
  // flyovers: the road rises on a viaduct around these places
  (th.flyovers||[]).forEach(name=>{const p=places.find(q=>q.name===name); if(!p) return;
    for(let i=p.seg-70;i<p.seg+110;i++){const sg=segments[i]; if(sg&&!sg.water&&!sg.branch) sg.fly=true;}});

  // side streets at junctions, like a normal city grid
  const urban=th.naija||th.scenery.some(x=>['office','haussmann','colonial','tower','craftsman'].includes(x));
  if(urban) for(let i=startLine+120;i<finishIdx-60;i+=150+Math.floor(R()*120)){
    if(segments.slice(i-10,i+10).some(sg=>sg.water||sg.fly||sg.branch)) continue;
    const side=R()<.5?-1:1; for(let k=i-7;k<=i+7;k++) segments[k].street=side; segments[i].streetC=side;}
  // scenery (kept clear of bridges and shortcut lanes)
  const names=th.scenery, end=finishIdx+DRAWD;
  const blocked=(i,side)=>{const s=segments[i]; if(!s) return true; if(s.water||s.fly||s.street===side) return true;
    for(const br of branches) if(br.side===side&&i>=br.b0-6&&i<=br.b0+BL+12) return true; return false;};
  for(let i=startLine+6;i<end;i+=2+Math.floor(R()*3)){
    const sides=R()<.4?[-1,1]:[R()<.5?-1:1];
    sides.forEach(side=>{ if(blocked(i,side)) return; const d=art.scen[pick(R,names)];
      addSprite(i,pick(R,d.imgs),d.wW*(.85+R()*.3),side*(d.min+R()*d.spread));});
  }
  for(let i=0;i<end;i++){const s=segments[i]; if(!s.water&&!s.fly) continue;
    if(i%2===0){addSprite(i,art.rail,700,-1.1,{collide:false}); addSprite(i,art.rail,700,1.1,{collide:false});}
    if(i%20===0){addSprite(i,art.scen.lamp.imgs[0],520,-1.35,{collide:false}); addSprite(i+10,art.scen.lamp.imgs[0],520,1.35,{collide:false});}}
  if(names.includes('lamp')) for(let i=startLine+12;i<end;i+=24){if(!blocked(i,-1)) addSprite(i,art.scen.lamp.imgs[0],520,-1.12); if(!blocked(i+12,1)) addSprite(i+12,art.scen.lamp.imgs[0],520,1.12);}
  addSprite(startLine+30,art.welcome,2600,-1.4);
  addSprite(Math.floor(startLine+(finishIdx-startLine)*.55),art.mid,2600,blocked(Math.floor(startLine+(finishIdx-startLine)*.55),1)?-1.4:1.4);
  places.forEach((p,k)=>{ if(k===0) return; const side=k%2?1:-1, i=p.seg-40;
    const key=p.name; if(!art.placeBoards[key]) {art.placeBoards[key]=billboard(p.name.toUpperCase(),st.place+(geo?' · street '+(k+1):''),'#1f4a6e','#0c2236'); art.placeBoards[key]._k='board';}
    addSprite(i,art.placeBoards[key],2400,blocked(i,side)?-side*1.45:side*1.45);});
  branches.forEach(br=>{const key=br.name+br.side; if(!art.signs[key]){art.signs[key]=shortcutSign('to '+br.name,br.side); art.signs[key]._k='sign';}
    addSprite(br.b0-45,art.signs[key],2300,br.side*1.3);});
  const at=th.landmarkAt&&places.find(p=>p.name===th.landmarkAt);
  const mid=at?at.seg+12:Math.floor(startLine+(finishIdx-startLine)*.5);
  addSprite(mid,art.landmark,art.landmarkW*.8,at?2.6:(blocked(mid,-1)?3.4:-3.4),{collide:!at});
  addSprite(finishIdx-60,art.landmark,art.landmarkW,-2.1);
  addSprite(finishIdx+25,art.landmark,art.landmarkW*1.1,2.2);

  // dual carriageway: the left side becomes a median and the opposite road, so roadside things move further out
  if(th.dual) for(const sg of segments){ if(sg.water) continue;
    sg.sprites=sg.sprites.filter(sp=>!(sg.fly&&sp.img._k==='lamp'&&sp.offset<0));
    for(const sp of sg.sprites){ if(sp.center||sp.offset>=0||sp.img._k==='rail') continue;
      if(sp.img._k==='lamp'){sp.offset=-1.945; sp.collide=false; sp.median=true;} else sp.offset-=DUAL_SHIFT;}}
  // coins and nitro
  for(let i=startLine+80;i<finishIdx-60;i+=70+Math.floor(R()*60)){
    const lane=pick(R,[-.62,0,.62]), n=6+Math.floor(R()*5), wob=R()<.4?.5:0;
    for(let k=0;k<n;k++) segments[i+k*3].coins.push({offset:U.limit(lane+Math.sin(k/n*Math.PI*2)*wob*.6,-.8,.8),taken:false});
  }
  for(let i=startLine+220;i<finishIdx-60;i+=300+Math.floor(R()*120)) segments[i].coins.push({offset:pick(R,[-.62,0,.62]),nitro:true,taken:false});
  branches.forEach(br=>{for(let i=br.b0+10;i<br.b0+BL-6;i+=5) segments[i].coins.push({offset:br.side*branchOff(br,i),taken:false});});

  stars.length=0; const SR=rng(idx+9);
  for(let i=0;i<260;i++) stars.push({x:SR(),y:SR()*.55,r:SR()*1.4+.3,p:SR()*6});
  clouds.length=0; const nC=Math.round(6*(th.clouds||0));
  for(let i=0;i<nC;i++) clouds.push({x:SR(),y:.06+SR()*.28,s:.5+SR()*.9,v:.002+SR()*.006,d:.4+SR()*.6});
  const wtr=th.water||['#2f7fae','#2a76a3'];
  pal={light:{grass:th.grass[0],road:th.road[0],rumble:th.rumble[0],lane:th.lane,water:wtr[0]},
       dark:{grass:th.grass[1],road:th.road[1],rumble:th.rumble[1],lane:null,water:wtr[1]},
       fog:th.fog, branch:shade(th.road[0],.12)};
}

/* Map: one point per road segment, real coordinates where the stage has them. */
function buildMap(st,geo){
  const n=segments.length, rx=new Float64Array(n), ry=new Float64Array(n);
  if(geo){
    const {P,wp}=geo;
    for(let i=0;i<n;i++){
      let k=0; while(k<wp.length-2&&i>=wp[k+1]) k++;
      const t=U.limit((i-wp[k])/Math.max(1,wp[k+1]-wp[k]),0,1);
      rx[i]=U.interp(P[k][0],P[k+1][0],t); ry[i]=U.interp(P[k][1],P[k+1][1],t);
    }
  } else {
    let h=0,x=0,y=0;
    for(let i=0;i<n;i++){rx[i]=x; ry[i]=y; if(i>=startLine){h+=segments[i].curve*K_MAP; x+=Math.sin(h); y-=Math.cos(h);}}
  }
  let x0=1e18,x1=-1e18,y0=1e18,y1=-1e18;
  for(let i=startLine;i<=finishIdx;i++){x0=Math.min(x0,rx[i]); x1=Math.max(x1,rx[i]); y0=Math.min(y0,ry[i]); y1=Math.max(y1,ry[i]);}
  const size=420, pad=.11, s=size*(1-2*pad)/Math.max(x1-x0,y1-y0,1e-6), ox=size/2-(x0+x1)/2*s, oy=size/2-(y0+y1)/2*s;
  const mx=new Float32Array(n), my=new Float32Array(n);
  for(let i=0;i<n;i++){mx[i]=rx[i]*s+ox; my[i]=ry[i]*s+oy;}
  const info={size,mx,my,rx,ry,geo,unit:geo?geo.mps:1,metersPerSeg:geo?geo.mps:5,
    toMap:geo?((lat,lon)=>{const [x,y]=geoXY(lat,lon,geo.lat0,geo.lon0); return [x*s+ox,y*s+oy];}):null, scale:s};
  return info;
}
function drawMap(g,S,info,st,labels){
  const k=S/info.size;
  g.fillStyle='#132238'; g.fillRect(0,0,S,S);
  g.strokeStyle='rgba(255,255,255,.045)'; g.lineWidth=1;
  for(let i=1;i<10;i++){g.beginPath(); g.moveTo(i*S/10,0); g.lineTo(i*S/10,S); g.moveTo(0,i*S/10); g.lineTo(S,i*S/10); g.stroke();}
  if(info.toMap){
    g.fillStyle='#2b5d8a';
    (st.water||[]).forEach(poly2=>{g.beginPath(); poly2.forEach(([la,lo],j)=>{const [x,y]=info.toMap(la,lo); j?g.lineTo(x*k,y*k):g.moveTo(x*k,y*k);}); g.closePath(); g.fill();});
    if(st.river){const [pts,wm]=st.river; g.strokeStyle='#2b5d8a'; g.lineCap='round'; g.lineJoin='round'; g.lineWidth=Math.max(3,wm*info.scale*k);
      g.beginPath(); pts.forEach(([la,lo],j)=>{const [x,y]=info.toMap(la,lo); j?g.lineTo(x*k,y*k):g.moveTo(x*k,y*k);}); g.stroke();}
  }
  g.lineCap='round'; g.lineJoin='round';
  g.strokeStyle='rgba(10,19,34,.9)'; g.lineWidth=Math.max(4,S*.022);
  g.beginPath(); for(let i=startLine;i<=finishIdx;i+=2) i===startLine?g.moveTo(info.mx[i]*k,info.my[i]*k):g.lineTo(info.mx[i]*k,info.my[i]*k); g.stroke();
  g.strokeStyle='#f4ead6'; g.lineWidth=Math.max(2,S*.011); g.stroke();
  g.setLineDash([S*.02,S*.015]); g.strokeStyle='#7fd3ff'; g.lineWidth=Math.max(2,S*.009);
  branches.forEach(br=>{g.beginPath(); g.moveTo(info.mx[br.b0]*k,info.my[br.b0]*k); g.lineTo(info.mx[br.r]*k,info.my[br.r]*k); g.stroke();});
  g.setLineDash([]);
  const boxes=[], dr=labels?S*.022:S*.012;
  places.forEach(p=>{const x=info.mx[p.seg]*k, y=info.my[p.seg]*k; boxes.push([x-dr,y-dr,x+dr,y+dr]);});
  places.forEach((p,j)=>{const x=info.mx[p.seg]*k, y=info.my[p.seg]*k;
    g.fillStyle='#f4ead6'; g.strokeStyle='#0a1322'; g.lineWidth=2; ell(g,x,y,dr,dr); g.fill(); g.stroke();
    if(!labels) return;
    g.fillStyle='#0a1322'; g.font=`900 ${dr*1.15}px ${FD}`; g.textAlign='center'; g.textBaseline='middle'; g.fillText(String(j+1),x,y+1);
    const fs=Math.max(11,S*.024); g.font=`800 ${fs}px ${FD}`; const t=p.name.toUpperCase(), tw=g.measureText(t).width, gap=dr+S*.008;
    const opts=[[x+gap,y-fs/2,'left'],[x-gap-tw,y-fs/2,'right'],[x-tw/2,y-gap-fs,'center'],[x-tw/2,y+gap,'center']];
    for(const [bx,by,al] of opts){const box=[bx,by,bx+tw,by+fs];
      if(box[0]<2||box[2]>S-2||box[1]<2||box[3]>S-2) continue;
      if(boxes.some(o=>!(box[2]<o[0]||box[0]>o[2]||box[3]<o[1]||box[1]>o[3]))) continue;
      boxes.push(box); const tx=al==='left'?bx:al==='right'?bx+tw:bx+tw/2;
      g.textAlign=al; g.textBaseline='top'; g.lineWidth=4; g.strokeStyle='rgba(10,19,34,.9)'; g.strokeText(t,tx,by); g.fillStyle='#f4ead6'; g.fillText(t,tx,by); break;}});
  const fx=info.mx[finishIdx]*k, fy=info.my[finishIdx]*k, cs=S*.012;
  for(let a=0;a<3;a++) for(let b=0;b<3;b++){g.fillStyle=(a+b)%2?'#111':'#fff'; g.fillRect(fx-cs*1.5+a*cs,fy-cs*1.5+b*cs,cs,cs);}
}

/* Shortcuts cut across the biggest bends: the rejoin point is close on the map but far along the road. */
function findShortcuts(R){
  const {rx,ry,unit}=mapInfo, cands=[];
  const wet=(a,b)=>{for(let i=a;i<=b;i++) if(segments[i]&&segments[i].water) return true; return false;};
  for(let i=startLine+180;i<finishIdx-400;i+=8){
    for(let N=200;N<=480;N+=20){
      if(i+N>finishIdx-120) break;
      const chord=Math.hypot(rx[i+N]-rx[i],ry[i+N]-ry[i])/unit;
      if(chord<N*.42) cands.push({i,N,save:N-Math.max(BL,chord)});
    }
  }
  cands.sort((a,b)=>b.save-a.save);
  const chosen=[];
  for(const c of cands){
    if(chosen.length>=3) break;
    if(wet(c.i-10,c.i+BL+10)||wet(c.i+c.N-5,c.i+c.N+5)) continue;
    if(chosen.some(o=>!(c.i>o.i+o.N+80||c.i+c.N<o.i-80))) continue;
    chosen.push(c);
  }
  if(!chosen.length){const i=Math.floor(startLine+(finishIdx-startLine)*.4); if(!wet(i-10,i+BL+10)&&!wet(i+255,i+265)) chosen.push({i,N:260});}
  chosen.sort((a,b)=>a.i-b.i).forEach(c=>{
    const i=c.i, r=c.i+c.N;
    const dx=rx[i+6]-rx[i], dy=ry[i+6]-ry[i], tx=rx[r]-rx[i], ty=ry[r]-ry[i];
    const side=(dx*ty-dy*tx)>=0?1:-1;
    const nxt=places.find(p=>p.seg>=r);
    const br={b0:i,r,side,name:nxt?nxt.name:'the finish',used:false,announced:false};
    branches.push(br);
    for(let s=i;s<i+BL;s++) segments[s].branch=br;
  });
}

function spawnCars(idx){
  cars=[]; rivals=[];
  const R=rng(500+idx*3), danfo=stage.theme.traffic==='danfo';
  TEAMS.forEach((t,k)=>{
    const z=position+playerZ+SEG*(4+k*5);
    const c={rival:true,team:t,offset:k%2?.5:-.5,z,speed:0,base:MAXSPEED*Math.min(.94,.8+idx*.015+t.skill),
      img:carArt.rivals[k],wW:CAR_W,percent:0,finished:false,time:0};
    rivals.push(c); cars.push(c);
  });
  if(danfo){ // okadas weave through traffic near the kerb; kekes trundle in the slow lane
    for(let i=0;i<12;i++){const ok=i<8, z=(startLine+120+R()*(finishIdx-startLine-200))*SEG;
      cars.push({rival:false,offset:ok?pick(R,[-.82,.82,.3,-.3]):pick(R,[.7,-.7]),z,speed:MAXSPEED*(ok?.4+R()*.15:.28+R()*.08),
        img:ok?pick(R,carArt.okada):pick(R,carArt.keke),wW:ok?280:460,percent:0});}}
  const n=16+idx*3;
  for(let i=0;i<n;i++){
    const big=R()<.32, z=(startLine+90+R()*(finishIdx-startLine-160))*SEG;
    const img=big?(danfo?pick(R,carArt.danfo):pick(R,carArt.trucks)):pick(R,carArt.traffic);
    cars.push({rival:false,offset:pick(R,[-.62,0,.62])+(R()-.5)*.15,z,speed:MAXSPEED*(.3+R()*.22),img,wW:big?700:CAR_W,percent:0});
  }
  cars.forEach(c=>findSeg(c.z).cars.push(c));
}

let condKey='base';
/* Builds the theme for the chosen time of day and weather. */
function variantTheme(th){
  let t=Object.assign({},th); const tod=save.tod||'story', wx=save.wx||'story';
  if(tod!=='story'){t=Object.assign(t,TOD[tod]);
    if(tod==='night'){t.night=true; delete t.sun; t.grass=th.grass.map(c=>shade(c,-.5)); t.road=th.road.map(c=>shade(c,-.2));}
    else {t.night=false; delete t.moon; t.stars=0; if(th.night){t.grass=th.grass.map(c=>shade(c,.35)); t.road=th.road.map(c=>shade(c,.15));}}}
  if(wx==='rain'){t.weather='rain'; t.clouds=1.6; if(!t.night){t.sky=['#3a4450','#6a7682','#9aa6b0']; delete t.sun; t.fog='#8e9aa4';} else t.fog='#141a2a';}
  else if(wx==='cloudy'){t.clouds=1.9; if(t.weather==='rain') t.weather='none';
    if(!t.night){t.sky=t.sky.map(c=>mix(c,'#9aa4ae',.45)); t.fog=mix(t.fog,'#b8c0c6',.4); if(t.sun) t.sun=Object.assign({},t.sun,{glow:'rgba(255,255,255,.18)'});}}
  else if(wx==='clear'){if(t.weather==='rain') t.weather='none'; t.clouds=Math.min(t.clouds||.5,.5);}
  return t;
}
function condText(){const a=[]; if((save.tod||'story')!=='story') a.push(COND_LABEL[save.tod]); if((save.wx||'story')!=='story') a.push(COND_LABEL[save.wx]); return a.join(' · ');}
function startStage(idx,attract){
  stageIdx=idx; const base=STAGES[idx];
  condKey=attract?'base':(save.tod||'story')+'-'+(save.wx||'story');
  stage=Object.assign({},base,{theme:attract?base.theme:variantTheme(base.theme)}); buildSerial++;
  position=START_SEG*SEG; speed=0; playerX=0; raceTime=0; fortune=0; rank=6; lastRank=6; factIdx=0; placeIdx=1;
  storyShown=false; farOff=nearOff=skyOff=0; particles.length=0; weather.length=0; autoLane=0; launchT=0; flash=0; finalSaid=false; ledOnce=false;
  buildTrack(idx); spawnCars(idx);
  nitroCap=1; shield=0; perkBoost=false; boostT=0; penaltyT=0; strikes=0; fines=0; hitCD=0; banned=false;
  clearSubs();
  if(attract){mode='title'; modeT=0; rivals.forEach(r=>r.speed=r.base*.9);}
  else{
    const p=save.perks||{};
    if(p.nitro) nitroCap=1.5; if(p.shield) shield=1; if(p.boost) perkBoost=true;
    save.perks={}; persist();
    mode='intro'; modeT=0;
    introDur=1.2; stage.script.intro.forEach(([who,text])=>{const d=Math.max(2.3,text.length*.055); say(who,text,d); introDur+=d;});
    el.skip.hidden=false;
  }
  nitro=nitroCap;
}
function startCountdown(){
  mode='countdown'; modeT=0; countdown=3.99; el.skip.hidden=true; clearSubs(); Sound.countBeep(false);
  const perks=[nitroCap>1?'nitro':null,shield?'shield':null,perkBoost?'boost':null].filter(Boolean);
  if(perks.length) showToast('Lucky spin perk',perks.map(p=>PERK_TEXT[p]).join(' · '));
}

/* =====================================================================
   DIALOGUE
   ===================================================================== */
const LINES={
  overtake:[['Tobi','Passed the {team}s! Keep it up!'],['Kemi','Sorry, {pair}. The road is ours.'],['Tobi','{team}s in the mirror now.']],
  overtaken:[['Tobi','The {team}s just got past us!'],['Kemi','Not for long, {team}s.'],['RIVAL','See you at the finish, Adeyemis!']],
  crash:[['Tobi','Easy! That\'s coming out of our prize money.'],['Kemi','I\'m fine. The car\'s fine. Mostly.'],['Tobi','Kemi! Eyes on the road!']],
  shortcut:[['Tobi','Shortcut coming up on the {side}, to {name}! Take it!'],['Tobi','There\'s a cut-through on the {side}. Your call, Kemi.']],
  took:[['Kemi','Hold tight, we\'re cutting through!'],['Tobi','Ha! Straight past them!']],
  nitro:[['Tobi','Nitro canister! Nice grab.']],
  lead:[['Tobi','We\'re leading, Kemi! We\'re actually leading!']],
  final:[['Tobi','Final stretch! I can see the arrival arch!']],
  offroad:[['Tobi','Road\'s that way, Kemi.']],
  peds:[['Tobi','People crossing ahead! Slow down, Kemi!'],['Kemi','Pedestrians on the road. Easy, easy...'],['Tobi','Watch the crossing! Brake!']]
};
/* ---------- road safety: hitting a person or a rider has consequences ---------- */
const ROAD_FINE={person:15,cyclist:10,okada:10,keke:8}, ROAD_NAME={person:'pedestrian',cyclist:'cyclist',okada:'okada rider',keke:'keke'};
const ROAD_LINES={
  person:[['Kemi','Oh no! Tobi, we hit someone! Stop, stop!'],['Tobi','Kemi! Someone\'s down! Pull over!']],
  cyclist:[['Kemi','The cyclist! Is the rider okay?'],['Tobi','You knocked the cyclist off! Stop the car!']],
  okada:[['Tobi','The okada! Kemi, the rider went down!'],['Kemi','I didn\'t see the bike! Is the rider alright?']],
  keke:[['Tobi','We hit the keke! The passengers!'],['Kemi','Oh no, the keke! Everyone okay in there?']]
};
function hitRoadUser(kind,at){
  if(mode!=='race'||hitCD>0||banned) return false;
  hitCD=3; strikes++; const fine=ROAD_FINE[kind]; fortune-=fine; fines+=fine;
  speed=0; shake=1.3; flash=.6; flashCol='255,70,60'; Sound.crash(); setTimeout(()=>Sound.siren(),300);
  if(at&&save.blood!==false&&typeof spawnBlood==='function'&&R3.on) spawnBlood(at,kind);
  clearSubs(); const [who,text]=pick(Math.random,ROAD_LINES[kind]); say(who,text,2.6);
  if(strikes>=3){
    banned=true; penaltyT=7;
    say('Narrator','Three road users hurt. The police suspend your licence and stop the race.',4);
    showToast('Licence suspended','Three strikes: the police have ended your race. The episode restarts.');
    const at=stageIdx; setTimeout(()=>{if(banned&&mode==='race'&&stageIdx===at) beginRace(at);},7000);
  } else {
    penaltyT=5;
    say('Narrator',`Police stop. The ${ROAD_NAME[kind]} gets help, you pay a $${fine}M fine. Strike ${strikes} of 3.`,3.6);
    say(strikes===2?'Tobi':'Kemi',strikes===2?'One more and they take your licence. Please, slow down.':'We drive carefully from here. Nobody else gets hurt.',3);
    showToast(`Police stop · strike ${strikes} of 3`,`You hit a ${ROAD_NAME[kind]}: $${fine}M fine and held for 5 seconds. Three strikes ends your race.`);
  }
  return true;
}
let hornCD=0;
function honk(){
  if(mode!=='race'||hornCD>0) return; hornCD=.6; Sound.init(); Sound.horn();
  if(typeof hornCrowd==='function'&&R3.on) hornCrowd();
  const pz=position+playerZ;
  for(const c of cars){const d=(c.z-pz)/SEG; if(!c.rival&&d>0&&d<45&&Math.abs(c.offset-playerX)<.5){c.dodge=1.2; c.dodgeDir=c.offset>playerX||(c.offset===playerX&&playerX<0)?1:-1;}}
}
function setView(v){save.view=v; persist(); syncToggles(); showToast('View',v==='cockpit'?'Inside the car: dashboard, mirror and wipers. Press V to switch.':'Outside the car, chase camera. Press V to switch.');}
const money=v=>(v<0?'−$'+(-v):'$'+v)+'M';
let subQ=[], subCur=null, subT=0, eventCD=0;
function say(who,text,dur){subQ.push({who,text,dur:dur||Math.max(2.3,text.length*.055)});}
function clearSubs(){subQ=[]; subCur=null; el.subs.style.opacity=0;}
function event(kind,vars,force){
  if(mode!=='race') return;
  if(!force&&(subCur||subQ.length||eventCD>0)) return;
  let [who,text]=pick(Math.random,LINES[kind]);
  if(who==='RIVAL') who=vars&&vars.voice?pick(Math.random,vars.voice):'Ada';
  text=text.replace(/\{(\w+)\}/g,(_,k)=>vars&&vars[k]!=null?vars[k]:'');
  if(force){subQ=[]; subCur=null;}
  say(who,text); eventCD=6;
}
function updateSubs(dt){
  eventCD-=dt;
  if(subCur){subT-=dt; if(subT<=0){subCur=null; el.subs.style.opacity=0;}}
  if(!subCur&&subQ.length){
    subCur=subQ.shift(); subT=subCur.dur;
    el.subs.innerHTML=''; const b=document.createElement('b'); b.textContent=subCur.who; b.style.color=SPEAKER_COLOR[subCur.who]||'#f4ead6';
    el.subs.append(b,document.createTextNode(subCur.text)); el.subs.className=subCur.who==='Narrator'?'narr':''; el.subs.style.opacity=1;
  }
}

/* =====================================================================
   UPDATE
   ===================================================================== */
function updateCarOffset(car,carSeg,playerSeg){
  const carW=car.wW/ROADW;
  if(Math.abs(carSeg.index-playerSeg.index)>DRAWD) return 0;
  for(let i=1;i<20;i++){
    const seg=segments[(carSeg.index+i)%segments.length];
    if(seg===playerSeg && car.speed>speed && U.overlap(playerX,PLAYER_W,car.offset,carW,1.2)){
      const dir=playerX>.5?-1:playerX<-.5?1:(car.offset>playerX?1:-1); return dir/i*(car.speed-speed)/MAXSPEED;}
    for(const o of seg.cars){if(o!==car && car.speed>o.speed && U.overlap(car.offset,carW,o.offset,o.wW/ROADW,1.2)){
      const dir=o.offset>.5?-1:o.offset<-.5?1:(car.offset>o.offset?1:-1); return dir/i*(car.speed-o.speed)/MAXSPEED;}}
  }
  if(car.offset<-.9) return .1; if(car.offset>.9) return -.1; return 0;
}
function updateCars(dt,playerSeg){
  for(const car of cars){
    if(car.rival){
      if(mode==='intro'||mode==='countdown') continue;
      const gap=car.z-(position+playerZ);
      let target=car.base; if(gap>55*SEG) target*=.9; else if(gap<-35*SEG) target*=1.08;
      if(car.finished) target=car.base*.55;
      if(car.z>trackLength-SEG*(DRAWD+20)) target=0;
      car.speed+=(target-car.speed)*Math.min(1,dt*.6);
    }
    if(car.v0==null&&!car.rival) car.v0=car.speed;
    if(mode!=='title'&&R3.on&&R3.crowd&&pedAhead(car.z,car.offset)) car.speed*=Math.max(0,1-dt*4); // stop for people on the road
    else if(!car.rival&&car.speed<car.v0) car.speed=Math.min(car.v0,car.speed+MAXSPEED*.15*dt);
    if(car.dodge>0){car.dodge-=dt; car.offset=U.limit(car.offset+car.dodgeDir*dt*.9,-1.05,1.05);}
    const oldSeg=findSeg(car.z);
    car.offset=U.limit(car.offset+updateCarOffset(car,oldSeg,playerSeg),-1.05,1.05);
    car.z=car.rival?Math.min(car.z+dt*car.speed,trackLength-SEG*2):U.increase(car.z,dt*car.speed,trackLength);
    car.percent=U.pctRem(car.z,SEG);
    const newSeg=findSeg(car.z);
    if(oldSeg!==newSeg){const i=oldSeg.cars.indexOf(car); if(i>=0) oldSeg.cars.splice(i,1); newSeg.cars.push(car);}
    if(car.rival && !car.finished && car.z>=finishZ && mode!=='title'){car.finished=true; car.time=raceTime;}
  }
}
function upcomingBranch(idx){return branches.find(b=>!b.used&&idx>=b.b0-25&&idx<b.b0+BL);}
function autopilot(pSeg){
  const br=(AUTODRIVE&&mode==='race')?upcomingBranch(pSeg.index):null;
  if(br){autoLane=br.side*branchOff(br,Math.max(pSeg.index+2,br.b0));}
  else{
    if(Math.abs(autoLane)>.7) autoLane=.62*Math.sign(autoLane);
    for(let i=1;i<14;i++){const seg=segments[(pSeg.index+i)%segments.length];
      for(const c of seg.cars) if(c.speed<speed && Math.abs(c.offset-autoLane)<.45){autoLane=autoLane>=0?(autoLane>.3?0:-.62):.62; if(Math.abs(c.offset-autoLane)<.45) autoLane=c.offset>0?-.62:.62; break;}}
  }
  const err=autoLane-playerX+pSeg.curve*.05;
  keys.left=err<-.04; keys.right=err>.04; keys.up=true; keys.down=false; keys.nitro=false;
  if(typeof R3!=='undefined'&&R3&&R3.crowd&&save.gfx!=='2d') for(const o of R3.crowd.peds){const di=o.s-pSeg.index; // stop for people crossing
    if(o.alive&&o.cross&&di>1&&di<40+speed/MAXSPEED*50&&Math.abs(o.lat)<HW+.6){keys.up=false; keys.down=speed>MAXSPEED*.02; break;}}
}
function doShortcut(br){
  br.used=true; flash=1; flashCol='255,255,255';
  const saved=((br.r-br.b0-BL)*mapInfo.metersPerSeg/1000);
  position=U.increase(br.r*SEG,-playerZ,trackLength); playerX=br.side*.62; speed=Math.max(speed,MAXSPEED*.6);
  while(placeIdx<places.length&&places[placeIdx].seg<br.r) placeIdx++;
  showToast('Shortcut · '+br.name,`You cut about ${saved.toFixed(1)} km off the route.`);
  Sound.whoosh(); event('took',null,true);
}
function update(dt){
  tNow+=dt; modeT+=dt;
  if(mode==='finish'&&modeT<1.6) dt*=.4; // slow motion as you cross the line
  const pSeg=findSeg(position+playerZ), sp=speed/MAXSPEED, startPos=position, C=activeCar, assist=save.assist;
  updateSubs(dt);
  cine+=(((mode==='intro'||mode==='finish')?1:0)-cine)*Math.min(1,dt*3);
  if(mode==='intro'&&modeT>=introDur) startCountdown();
  if(mode==='title'||mode==='finish'||(AUTODRIVE&&mode==='race')) autopilot(pSeg);
  if(mode==='countdown'){
    const prev=Math.ceil(countdown); countdown-=dt;
    if(Math.ceil(countdown)!==prev && countdown>0) Sound.countBeep(false);
    if(countdown<=0){mode='race'; modeT=0; Sound.countBeep(true); if(perkBoost) boostT=2.5;
      const p=places[0]; if(p) showToast('Starting at · '+p.name,p.desc||stage.tag);}
  }
  hornCD=Math.max(0,hornCD-dt);
  if(mode==='race'){hitCD=Math.max(0,hitCD-dt);
    if(penaltyT>0){penaltyT-=dt;
      if(penaltyT<=0&&!banned){showToast('Back on the road','Drive with care: people walk and ride on these streets.');}}}
  const frozen=mode==='intro'||mode==='countdown'||penaltyT>0;
  updateCars(dt,pSeg);
  if(!frozen) position=U.increase(position,dt*speed,trackLength);
  steerDir=0;
  if(!frozen){
    const rate=dt*2.3*Math.min(1,sp+.05)*(.85+.15*C.grip);
    if(keys.left){playerX-=rate; steerDir=-1;} else if(keys.right){playerX+=rate; steerDir=1;}
    playerX-=dt*2*sp*sp*pSeg.curve*CENTRIFUGAL*(assist?.4:1)/C.grip;
  }
  const br=pSeg.branch; onBranch=false;
  if(br) onBranch=Math.abs(playerX-br.side*branchOff(br,pSeg.index))<BW+.08;
  if(assist&&!frozen&&!keys.left&&!keys.right&&!onBranch){
    const ax=Math.abs(playerX); if(ax>.8&&ax<1.8) playerX-=Math.sign(playerX)*dt*(ax>1?1.5:.6);
  }
  const gas=touchMode&&mode==='race'?!keys.down:keys.up, top=MAXSPEED*C.top;
  let limit=top;
  if(boostT>0) boostT-=dt;
  nitroOn=(keys.nitro||boostT>0)&&(nitro>0||boostT>0)&&mode==='race'&&speed>MAXSPEED*.15;
  if(frozen) speed=0;
  else{
    if(nitroOn){speed=U.accel(speed,ACCEL*2.2*C.acc,dt); if(boostT<=0) nitro=Math.max(0,nitro-dt*.28/C.nitro); limit=top*NITRO_MAX;}
    else if(gas&&!keys.down) speed=U.accel(speed,ACCEL*C.acc,dt);
    else if(keys.down) speed=U.accel(speed,BRAKE,dt);
    else speed=U.accel(speed,DECEL,dt);
    if(mode==='finish') limit=top*Math.max(.25,1-modeT*.3);
    if(speed>limit) speed=U.accel(speed,DECEL*2.5,dt);
  }
  if((pSeg.water||pSeg.fly)&&!frozen&&Math.abs(playerX)>1){ // bridge barrier: scrape along the rail instead of stopping dead
    playerX=Math.sign(playerX); speed*=.985; if(speed>MAXSPEED*.3&&Math.random()<.3) sparks(2);}
  offroad=!onBranch&&(playerX<-1.05||playerX>1.05);
  if(offroad&&!frozen){
    if(speed>OFF_LIMIT) speed=U.accel(speed,OFF_DECEL,dt);
    if(speed>MAXSPEED*.1&&Math.random()<.7) spawnDust();
    if(speed>MAXSPEED*.3&&Math.random()<.004) event('offroad');
    for(const s of pSeg.sprites){ if(!s.collide) continue;
      const sw=s.wW/ROADW*.7, sx=s.center?s.offset:s.offset+sw/2*(s.offset>0?1:-1);
      if(U.overlap(playerX,PLAYER_W,sx,sw)){ if(speed>MAXSPEED*.25){Sound.crash(); shake=1; sparks(10); event('crash');} speed=MAXSPEED/6; position=U.increase(pSeg.p1.world.z,-playerZ,trackLength); break; }
    }
  }
  if(!frozen) for(const car of pSeg.cars){
    if(speed>car.speed && U.overlap(playerX,PLAYER_W,car.offset,car.wW/ROADW,.8)){
      if(car.img&&(car.img._okada||car.img._keke)&&speed>MAXSPEED*.08&&hitRoadUser(car.img._okada?'okada':'keke',R3.on?poseAt(car.z,car.offset):null)){ // a shield protects the car, not people
        position=U.increase(car.z,-playerZ-SEG*3,trackLength); car.speed*=.3; break;}
      if(shield>0){shield--; flash=.8; flashCol='127,211,255'; Sound.power(); position=U.increase(car.z,-playerZ,trackLength); showToast('Shield used','Your Lucky spin shield took that hit.'); break;}
      const after=car.speed*(car.speed/speed);
      speed=C.tough?Math.max(after,speed*.62):after; position=U.increase(car.z,-playerZ,trackLength);
      Sound.crash(); shake=.7; sparks(14); event('crash'); break;}
  }
  for(let k=0;k<2;k++){const seg=segments[(pSeg.index+k)%segments.length];
    for(const c of seg.coins) if(!c.taken && Math.abs(c.offset-playerX)<.24 && !frozen){c.taken=true;
      if(c.nitro){nitro=Math.min(nitroCap,nitro+.45*nitroCap); Sound.power(); burst('#7fd3ff',18); event('nitro');} else {fortune+=1; Sound.coin(); burst('#ffd27a',8);}}}
  if(br&&onBranch&&!br.used&&pSeg.index-br.b0>=BL-4&&mode==='race') doShortcut(br);
  if(mode==='race') for(const b of branches) if(!b.announced&&pSeg.index>b.b0-150&&pSeg.index<b.b0-20){b.announced=true; event('shortcut',{side:b.side>0?'right':'left',name:b.name},true);}
  playerX=U.limit(playerX,-3.3,3.3);
  speed=U.limit(speed,0,top*NITRO_MAX);
  if(mode==='race'&&!nitroOn) nitro=Math.min(nitroCap,nitro+dt*.012);
  const moved=(position-startPos+trackLength)%trackLength;
  skyOff+=pSeg.curve*moved/SEG*.0006; farOff+=pSeg.curve*moved/SEG*.0012; nearOff+=pSeg.curve*moved/SEG*.0024;
  shake=Math.max(0,shake-dt*2.5); flash=Math.max(0,flash-dt*1.6);
  const pz=position+playerZ;
  if(mode==='race'){
    raceTime+=dt;
    rank=1+rivals.filter(r=>r.z>pz).length;
    if(rank<lastRank){const r=rivals.filter(r=>r.z<=pz).sort((a,b)=>b.z-a.z)[0]; if(r) event('overtake',{team:r.team.name,pair:r.team.pair});}
    else if(rank>lastRank){const r=rivals.filter(r=>r.z>pz).sort((a,b)=>a.z-b.z)[0]; if(r) event('overtaken',{team:r.team.name,voice:r.team.voice});}
    if(rank===1&&!ledOnce&&raceTime>5){ledOnce=true; event('lead',null,true);}
    lastRank=rank;
    const segIdx=Math.floor(pz/SEG);
    if(placeIdx<places.length&&segIdx>=places[placeIdx].seg){const p=places[placeIdx]; showToast('Now passing · '+p.name,p.desc||stage.place); placeIdx++;}
    const prog=(pz-startLine*SEG)/((finishIdx-startLine)*SEG);
    if(!stage.route&&factIdx<stage.facts.length&&prog>[.3,.5,.7][factIdx]){showToast('On this road',stage.facts[factIdx]); factIdx++;}
    if(!finalSaid&&finishIdx-segIdx<160){finalSaid=true; event('final',null,true);}
    if(pz>=finishZ) finishRace();
  } else if(mode==='finish'){
    if(stage.id==='starbase'&&modeT>1) launchT+=dt;
    if(!storyShown&&modeT>3.4){storyShown=true; showStory();}
  } else if(mode==='title'){
    if(pz>finishZ-SEG*50) startStage((stageIdx+1)%STAGES.length,true);
  }
  updateParticles(dt);
  Sound.engine(speed/MAXSPEED,nitroOn,offroad,mode);
}

/* ---------- particles & weather ---------- */
function spawnDust(){particles.push({x:W/2+(Math.random()-.5)*W*.22,y:H*.95,vx:(Math.random()-.5)*W*.3,vy:-Math.random()*H*.25,life:.8,max:.8,r:(6+Math.random()*16)*UI,c:stage.theme.grass[0],a:.55});}
function sparks(n){for(let i=0;i<n;i++) particles.push({x:W/2+(Math.random()-.5)*W*.18,y:H*.82,vx:(Math.random()-.5)*W*.9,vy:-Math.random()*H*.6,life:.5,max:.5,r:3*UI,c:'#ffd27a',a:1,g:true});}
function burst(c,n){for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2, s=(.2+Math.random()*.5)*H; particles.push({x:W/2,y:H*.7,vx:Math.cos(a)*s,vy:Math.sin(a)*s-H*.2,life:.6,max:.6,r:4*UI,c,a:1,g:true});}}
function updateParticles(dt){
  for(let i=particles.length-1;i>=0;i--){const p=particles[i]; p.life-=dt; if(p.life<=0){particles.splice(i,1); continue;}
    p.x+=p.vx*dt; p.y+=p.vy*dt; p.vy+=H*1.2*dt*(p.g?1:.2);}
  const wt=stage.theme.weather, sp=speed/MAXSPEED;
  const want=reduceMotion?0:wt==='rain'?220:wt==='dust'?60:wt==='leaves'?40:0;
  while(weather.length<want) weather.push(newWeather(wt,true));
  if(weather.length>want) weather.length=want;
  for(const p of weather){
    if(wt==='rain'){p.y+=(H*1.6+sp*H*.8)*dt*p.z; p.x+=(-steerDir*W*.2-W*.1)*dt*p.z;}
    else if(wt==='dust'){p.x+=p.vx*dt+Math.sin(tNow+p.p)*.3; p.y+=p.vy*dt;}
    else {p.y+=p.vy*dt*(1+sp); p.x+=(Math.sin(tNow*2+p.p)*W*.05+(p.x-W/2)*sp*1.5)*dt; p.rot+=dt*3;}
    if(p.y>H+20||p.x<-40||p.x>W+40) Object.assign(p,newWeather(wt,false));
  }
}
function newWeather(wt,any){
  if(wt==='rain') return {x:Math.random()*W*1.2,y:any?Math.random()*H:-20,z:.5+Math.random()*.8};
  if(wt==='dust') return {x:Math.random()*W,y:H*(.4+Math.random()*.6),vx:(Math.random()-.5)*60,vy:(Math.random()-.5)*20,p:Math.random()*6,r:1+Math.random()*2.5};
  return {x:Math.random()*W,y:any?Math.random()*H:-20,vy:H*(.12+Math.random()*.15),p:Math.random()*6,rot:Math.random()*6,c:pick(Math.random,['#d8892a','#c45a22','#e8b040','#a8642a'])};
}

/* =====================================================================
   RENDER
   ===================================================================== */
function project(p,camX,camY,camZ){
  p.camera.x=-camX; p.camera.y=(p.world.y||0)-camY; p.camera.z=p.world.z-camZ;
  p.screen.scale=camDepth/p.camera.z;
  p.screen.x=Math.round(W/2+p.screen.scale*p.camera.x*W/2);
  p.screen.y=Math.round(H/2-p.screen.scale*p.camera.y*H/2);
  p.screen.w=Math.round(p.screen.scale*ROADW*W/2);
}
function quad(x1,y1,x2,y2,x3,y3,x4,y4,c){ctx.fillStyle=c; ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.lineTo(x3,y3); ctx.lineTo(x4,y4); ctx.closePath(); ctx.fill();}
function drawSegment(seg){
  // y1 is pushed down 1px so each farther strip overlaps the nearer one and no anti-aliased seam shows
  const c=seg.stripe?pal.dark:pal.light, x1=seg.p1.screen.x, y1=seg.p1.screen.y+1, w1=seg.p1.screen.w, x2=seg.p2.screen.x, y2=seg.p2.screen.y, w2=seg.p2.screen.w;
  ctx.fillStyle=seg.water?c.water:c.grass; ctx.fillRect(0,y2,W,y1-y2);
  if(seg.water&&!seg.stripe){ctx.fillStyle='rgba(255,255,255,.12)'; ctx.fillRect(0,y2,W,Math.max(1,(y1-y2)*.3));}
  const r1=w1/7, r2=w2/7;
  quad(x1-w1-r1,y1,x1-w1,y1,x2-w2,y2,x2-w2-r2,y2,c.rumble);
  quad(x1+w1+r1,y1,x1+w1,y1,x2+w2,y2,x2+w2+r2,y2,c.rumble);
  quad(x1-w1,y1,x1+w1,y1,x2+w2,y2,x2-w2,y2,c.road);
  const e1=w1/36, e2=w2/36;
  quad(x1-w1+e1,y1,x1-w1+e1*2,y1,x2-w2+e2*2,y2,x2-w2+e2,y2,'rgba(255,255,255,.75)');
  quad(x1+w1-e1*2,y1,x1+w1-e1,y1,x2+w2-e2,y2,x2+w2-e2*2,y2,'rgba(255,255,255,.75)');
  if(seg.mark==='check'){
    const n=12; for(let i=0;i<n;i++){ if((i+seg.index)%2) continue;
      const a1=x1-w1+2*w1*i/n, b1=x1-w1+2*w1*(i+1)/n, a2=x2-w2+2*w2*i/n, b2=x2-w2+2*w2*(i+1)/n; quad(a1,y1,b1,y1,b2,y2,a2,y2,'#f4f4f4');}
  } else if(c.lane){
    const l1=w1/32, l2=w2/32, lw1=2*w1/LANES, lw2=2*w2/LANES;
    for(let l=1;l<LANES;l++){const lx1=x1-w1+lw1*l, lx2=x2-w2+lw2*l; quad(lx1-l1/2,y1,lx1+l1/2,y1,lx2+l2/2,y2,lx2-l2/2,y2,c.lane);}
  }
  const br=seg.branch;
  if(br){
    const s=br.side, o1=branchOff(br,seg.index), o2=branchOff(br,seg.index+1);
    const bx1=x1+s*o1*w1, bx2=x2+s*o2*w2, bw1=BW*w1, bw2=BW*w2;
    quad(bx1-bw1-r1*.5,y1,bx1+bw1+r1*.5,y1,bx2+bw2+r2*.5,y2,bx2-bw2-r2*.5,y2,c.rumble);
    quad(bx1-bw1,y1,bx1+bw1,y1,bx2+bw2,y2,bx2-bw2,y2,pal.branch);
    if(!seg.stripe) quad(bx1-bw1*.25,y1,bx1+bw1*.25,y1,bx2+bw2*.04,y2,bx2-bw2*.04,y2,'#7fd3ff');
  }
  if(stage.theme.weather==='rain'){ctx.globalAlpha=.06; quad(x1-w1*.15,y1,x1+w1*.15,y1,x2+w2*.15,y2,x2-w2*.15,y2,'#cfe0f0'); ctx.globalAlpha=1;}
  if(seg.fog<1){ctx.globalAlpha=1-seg.fog; ctx.fillStyle=pal.fog; ctx.fillRect(0,y2,W,y1-1-y2); ctx.globalAlpha=1;}
}
function drawSprite(img,wW,scale,x,y,ox,oy,clipY,stretch){
  const destW=wW*scale*W/2*(stretch||1), destH=wW*scale*W/2*img.height/img.width;
  if(destW<1||destH<1||destW>W*8) return;
  const dx=x+destW*ox, dy=y+destH*oy;
  const clipH=clipY?Math.max(0,dy+destH-clipY):0;
  if(clipH<destH) ctx.drawImage(img,0,0,img.width,img.height-(img.height*clipH/destH),dx,dy,destW,destH-clipH);
}
function tileLayer(img,off,bottom,height){
  const sc=height/img.height, dw=img.width*sc; let x=-(((off*dw)%dw)+dw)%dw;
  for(;x<W;x+=dw) ctx.drawImage(img,0,0,img.width,img.height,Math.floor(x),bottom-height,Math.ceil(dw)+1,height);
}
function drawSky(){
  const th=stage.theme, hz=H*.5;
  const gr=ctx.createLinearGradient(0,0,0,hz); gr.addColorStop(0,th.sky[0]); gr.addColorStop(.6,th.sky[1]); gr.addColorStop(1,th.sky[2]);
  ctx.fillStyle=gr; ctx.fillRect(0,0,W,hz+2);
  ctx.fillStyle=th.grass[1]; ctx.fillRect(0,hz,W,H-hz);
  if(th.stars){for(const s of stars){const tw=.55+.45*Math.sin(tNow*2+s.p); ctx.fillStyle=`rgba(255,255,255,${tw*th.stars})`; const x=((s.x-skyOff*.4)%1+1)%1*W; ctx.fillRect(x,s.y*H,s.r*UI*1.4,s.r*UI*1.4);}}
  const sun=th.sun, moon=th.moon;
  if(sun){const x=(((sun.x-skyOff*.5)%1)+1)%1*W, y=sun.y*hz, r=sun.r*Math.min(W,H*1.6);
    const gl=ctx.createRadialGradient(x,y,r*.5,x,y,r*6); gl.addColorStop(0,sun.glow); gl.addColorStop(1,'rgba(255,200,150,0)');
    ctx.fillStyle=gl; ctx.fillRect(0,0,W,hz+2); ctx.fillStyle=sun.c; ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill();}
  if(moon){const x=(((moon.x-skyOff*.5)%1)+1)%1*W, y=moon.y*H, r=moon.r*Math.min(W,H*1.6);
    const gl=ctx.createRadialGradient(x,y,r,x,y,r*5); gl.addColorStop(0,'rgba(200,215,255,.28)'); gl.addColorStop(1,'rgba(200,215,255,0)'); ctx.fillStyle=gl; ctx.fillRect(x-r*5,y-r*5,r*10,r*10);
    ctx.fillStyle='#eef0f8'; ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='rgba(150,160,190,.35)'; [[-.3,-.2,.25],[.25,.2,.18],[.1,-.35,.12]].forEach(([dx,dy,r2])=>{ctx.beginPath(); ctx.arc(x+dx*r,y+dy*r,r2*r,0,Math.PI*2); ctx.fill();});}
  if(launchT>0){ // Starship lifting off behind the finish
    const t=launchT, rx=W*.68, ry=hz-H*.02-t*t*H*.018, s=H*.06;
    if(ry>-s*3){
      const gl=ctx.createRadialGradient(rx,ry+s*1.6,2,rx,ry+s*1.6,s*4); gl.addColorStop(0,'rgba(255,230,180,.9)'); gl.addColorStop(.3,'rgba(255,150,60,.5)'); gl.addColorStop(1,'rgba(255,120,40,0)');
      ctx.fillStyle=gl; ctx.fillRect(rx-s*4,ry-s*2,s*8,s*8);
      ctx.fillStyle='rgba(255,200,140,.35)'; ctx.fillRect(rx-s*.08,ry+s*1.5,s*.16,hz-ry);
      ctx.fillStyle='#d8dde6'; ctx.fillRect(rx-s*.18,ry-s*1.2,s*.36,s*2.6); ctx.beginPath(); ctx.arc(rx,ry-s*1.2,s*.18,Math.PI,0); ctx.fill();
    }
  }
  ctx.globalAlpha=th.night?.18:th.weather==='rain'?.75:.8;
  for(const c of clouds){const cw=W*.38*c.s, x=((((c.x-skyOff*c.d+tNow*c.v*.1)%1)+1)%1)*(W+cw)-cw; ctx.drawImage(cloudImg,x,c.y*H,cw,cw*.39);}
  ctx.globalAlpha=1;
}
function drawBackdrop(){
  const hz=H*.5, bob=-playerY*.00002*H;
  tileLayer(art.far,farOff,hz+H*.03+bob*.5,H*.32);
  tileLayer(art.near,nearOff,hz+H*.05+bob,H*.24);
  const fg=ctx.createLinearGradient(0,hz-H*.12,0,hz+H*.05); fg.addColorStop(0,rgba(stage.theme.fog,0)); fg.addColorStop(1,rgba(stage.theme.fog,.55));
  ctx.fillStyle=fg; ctx.fillRect(0,hz-H*.12,W,H*.17);
}
function drawPlayer(pSeg,pPct){
  const sc=camDepth/playerZ, destW=CAR_W*sc*W/2, img=steerDir<0?playerArt.l:steerDir>0?playerArt.r:playerArt.s;
  const destH=destW*img.height/img.width;
  const y=H/2-sc*U.interp(pSeg.p1.camera.y,pSeg.p2.camera.y,pPct)*H/2;
  const bounce=(mode==='countdown'?Math.sin(tNow*40)*.8:(Math.random()-.5)*speed/MAXSPEED*(offroad?6:2))*UI;
  const x=W/2-destW/2, top=y-destH+bounce;
  if(stage.theme.night){
    ctx.save(); ctx.globalCompositeOperation='lighter';
    const g=ctx.createRadialGradient(W/2,y-destH*1.6,destW*.1,W/2,y-destH*1.6,destW*1.6);
    g.addColorStop(0,'rgba(255,230,170,.22)'); g.addColorStop(1,'rgba(255,230,170,0)'); ctx.fillStyle=g;
    ctx.beginPath(); ctx.moveTo(x+destW*.15,y-destH*.6); ctx.lineTo(W/2-destW*1.4,H*.5+destH*.2); ctx.lineTo(W/2+destW*1.4,H*.5+destH*.2); ctx.lineTo(x+destW*.85,y-destH*.6); ctx.fill(); ctx.restore();
  }
  ctx.drawImage(img,x,top,destW,destH);
  if(shield>0){ctx.save(); ctx.globalCompositeOperation='lighter'; ctx.strokeStyle=`rgba(127,211,255,${.25+.15*Math.sin(tNow*5)})`; ctx.lineWidth=4*UI; ctx.beginPath(); ctx.ellipse(W/2,top+destH*.55,destW*.62,destH*.62,0,0,Math.PI*2); ctx.stroke(); ctx.restore();}
  if(nitroOn){
    ctx.save(); ctx.globalCompositeOperation='lighter';
    [.26,.74].forEach(px=>{const fx=x+destW*px, fy=top+destH*.77, len=destH*(.35+Math.random()*.25);
      const g=ctx.createRadialGradient(fx,fy+len*.4,1,fx,fy+len*.4,len); g.addColorStop(0,'rgba(200,240,255,.95)'); g.addColorStop(.35,'rgba(90,170,255,.7)'); g.addColorStop(1,'rgba(60,90,255,0)');
      ctx.fillStyle=g; ctx.beginPath(); ctx.ellipse(fx,fy+len*.4,destW*.06,len,0,0,Math.PI*2); ctx.fill();});
    ctx.restore();
  }
  if(keys.down&&speed>0&&mode==='race'){ctx.save(); ctx.globalCompositeOperation='lighter'; ctx.fillStyle='rgba(255,60,40,.35)'; [.18,.82].forEach(px=>{ctx.beginPath(); ctx.arc(x+destW*px,top+destH*.535,destW*.12,0,Math.PI*2); ctx.fill();}); ctx.restore();}
}
const smooth=t=>t*t*(3-2*t);
function render(){
  if(cv.style.background) cv.style.background='';
  let camZ=position, camH=CAMH, camXo=0, worldPlayer=false;
  if(mode==='intro'){const t=1-smooth(U.limit(modeT/Math.max(1,introDur-.4),0,1)); camZ=position-t*30*SEG; camH=CAMH*(1+t*4.5); camXo=Math.sin(t*1.6)*ROADW*1.3*t; worldPlayer=true;}
  else if(mode==='finish'){camH=CAMH*(1+smooth(Math.min(1,modeT/2.2))*.9);}
  const base=findSeg(camZ), basePct=U.pctRem(camZ,SEG), pSeg=findSeg(position+playerZ), pPct=U.pctRem(position+playerZ,SEG);
  playerY=U.interp(pSeg.p1.world.y,pSeg.p2.world.y,pPct);
  ctx.save();
  if(shake>0&&!reduceMotion) ctx.translate((Math.random()-.5)*shake*14*UI,(Math.random()-.5)*shake*10*UI);
  drawSky(); drawBackdrop();
  let maxy=H, x=0, dx=-(base.curve*basePct);
  const len=segments.length;
  for(let n=0;n<DRAWD;n++){
    const seg=segments[(base.index+n)%len];
    seg.looped=seg.index<base.index; seg.fog=U.fog(n/DRAWD,FOGD); seg.clip=maxy;
    const cz=camZ-(seg.looped?trackLength:0);
    project(seg.p1,(playerX*ROADW+camXo)-x,playerY+camH,cz);
    project(seg.p2,(playerX*ROADW+camXo)-x-dx,playerY+camH,cz);
    x+=dx; dx+=seg.curve;
    if(seg.p1.camera.z<=camDepth||seg.p2.screen.y>=seg.p1.screen.y||seg.p2.screen.y>=maxy) continue;
    drawSegment(seg); maxy=seg.p1.screen.y;
  }
  const spin=Math.abs(Math.cos(tNow*4));
  for(let n=DRAWD-1;n>0;n--){
    const seg=segments[(base.index+n)%len];
    const a=Math.min(1,seg.fog*1.2+.05); ctx.globalAlpha=a;
    for(const s of seg.sprites){const sc=seg.p1.screen.scale, sx=seg.p1.screen.x+sc*s.offset*ROADW*W/2;
      drawSprite(s.img,s.wW,sc,sx,seg.p1.screen.y,s.center?-.5:(s.offset<0?-1:0),-1,seg.clip);}
    for(const c of seg.coins){ if(c.taken) continue; const sc=seg.p1.screen.scale, cx=seg.p1.screen.x+sc*c.offset*ROADW*W/2, lift=sc*(160+Math.sin(tNow*5+seg.index)*40)*H/2;
      drawSprite(c.nitro?nitroImg:coinImg,c.nitro?240:260,sc,cx,seg.p1.screen.y-lift,c.nitro?-.5:-.5*Math.max(.15,spin),-1,seg.clip,c.nitro?1:Math.max(.15,spin));}
    for(const car of seg.cars){const sc=U.interp(seg.p1.screen.scale,seg.p2.screen.scale,car.percent);
      const sx=U.interp(seg.p1.screen.x,seg.p2.screen.x,car.percent)+sc*car.offset*ROADW*W/2, sy=U.interp(seg.p1.screen.y,seg.p2.screen.y,car.percent);
      drawSprite(car.img,car.wW,sc,sx,sy,-.5,-1,seg.clip);
      if(car.rival&&mode!=='title'&&n<90&&sc>0){ctx.globalAlpha=Math.min(a,1-n/90); const fs=Math.max(10,car.wW*sc*W/2*.15); ctx.font=`800 ${fs}px ${FD}`; ctx.textAlign='center'; ctx.fillStyle='#fff8ea'; ctx.fillText(car.team.name.toUpperCase(),sx,sy-car.wW*sc*W/2*.66-4); ctx.globalAlpha=a;}}
    if(worldPlayer&&seg===pSeg){const sc=U.interp(seg.p1.screen.scale,seg.p2.screen.scale,pPct);
      drawSprite(playerArt.s,CAR_W,sc,U.interp(seg.p1.screen.x,seg.p2.screen.x,pPct)+sc*playerX*ROADW*W/2,U.interp(seg.p1.screen.y,seg.p2.screen.y,pPct),-.5,-1,seg.clip);}
    ctx.globalAlpha=1;
    if(!worldPlayer&&seg===pSeg) drawPlayer(pSeg,pPct);
  }
  drawEffects();
  ctx.restore();
  if(flash>0){ctx.fillStyle=`rgba(${flashCol},${flash*.7})`; ctx.fillRect(0,0,W,H);}
  if(cine>.01){const bh=H*.12*cine; ctx.fillStyle='#000'; ctx.fillRect(0,0,W,bh); ctx.fillRect(0,H-bh,W,bh);}
  if(mode==='intro') drawTitleCard();
  if(mode==='race'||mode==='countdown'||mode==='finish') drawHUD();
}
function drawEffects(){
  ctx.save(); ctx.globalCompositeOperation='lighter';
  for(const p of particles){ctx.globalAlpha=Math.max(0,p.life/p.max)*p.a; ctx.fillStyle=p.c; ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fill();}
  ctx.restore(); ctx.globalAlpha=1;
  const wt=stage.theme.weather;
  if(wt==='rain'){ctx.strokeStyle='rgba(200,215,235,.45)'; ctx.lineWidth=1.2*UI; ctx.beginPath(); for(const p of weather){ctx.moveTo(p.x,p.y); ctx.lineTo(p.x-6*UI*p.z,p.y+26*UI*p.z);} ctx.stroke();
    ctx.fillStyle='rgba(30,40,55,.18)'; ctx.fillRect(0,0,W,H);}
  else if(wt==='dust'){ctx.fillStyle='rgba(255,220,170,.5)'; for(const p of weather) ctx.fillRect(p.x,p.y,p.r*UI,p.r*UI);
    const g=ctx.createLinearGradient(0,0,0,H); g.addColorStop(0,'rgba(255,170,90,.06)'); g.addColorStop(1,'rgba(200,120,60,.12)'); ctx.fillStyle=g; ctx.fillRect(0,0,W,H);}
  else if(wt==='leaves'){for(const p of weather){ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.rot); ctx.fillStyle=p.c; ctx.beginPath(); ctx.ellipse(0,0,7*UI,3.5*UI,0,0,Math.PI*2); ctx.fill(); ctx.restore();}}
  if(nitroOn&&!reduceMotion){ctx.strokeStyle='rgba(255,255,255,.35)'; ctx.lineWidth=2*UI; ctx.beginPath();
    for(let i=0;i<26;i++){const a=Math.random()*Math.PI*2, r1=Math.min(W,H)*(.35+Math.random()*.2), r2=r1+Math.min(W,H)*(.2+Math.random()*.3);
      ctx.moveTo(W/2+Math.cos(a)*r1,H*.48+Math.sin(a)*r1*.6); ctx.lineTo(W/2+Math.cos(a)*r2,H*.48+Math.sin(a)*r2*.6);} ctx.stroke();}
  const v=ctx.createRadialGradient(W/2,H*.55,Math.min(W,H)*.35,W/2,H*.55,Math.max(W,H)*.75);
  v.addColorStop(0,'rgba(0,0,0,0)'); v.addColorStop(1,stage.theme.night?'rgba(0,0,10,.6)':'rgba(10,8,20,.38)'); ctx.fillStyle=v; ctx.fillRect(0,0,W,H);
}
function drawTitleCard(){
  const a=U.limit(Math.min((modeT-.3)/.8,(introDur-modeT)/.8),0,1); if(a<=0) return;
  const s=UI, x=Math.max(24*s,W*.06), y=H*.6;
  ctx.save(); ctx.globalAlpha=a; ctx.textAlign='left'; ctx.shadowColor='rgba(0,0,0,.6)'; ctx.shadowBlur=20*s;
  ctx.fillStyle='#e8b04b'; ctx.font=`800 ${18*s}px ${FD}`; ctx.fillText('THE FORTUNE TRAIL · SEASON ONE · EPISODE '+(stageIdx+1),x,y-96*s);
  let fs=96*s; ctx.font=`900 ${fs}px ${FD}`; const t=stage.ep.toUpperCase(); while(ctx.measureText(t).width>W-x*2&&fs>20){fs-=4; ctx.font=`900 ${fs}px ${FD}`;}
  ctx.fillStyle='#fff8ea'; ctx.fillText(t,x,y);
  ctx.font=`italic 400 ${24*s}px ${FB}`; ctx.fillStyle='#e7dcc6'; ctx.fillText(stage.place+', '+stage.country+' — '+stage.tag,x,y+38*s);
  const ct=condText(); if(ct){ctx.font=`800 ${16*s}px ${FD}`; ctx.fillStyle='#7fd3ff'; ctx.fillText(ct.toUpperCase(),x,y+70*s);}
  ctx.restore();
}
function ordinal(n){return n+(n===1?'st':n===2?'nd':n===3?'rd':'th');}
function fmtTime(t){const m=Math.floor(t/60), s=t-m*60; return m+':'+(s<10?'0':'')+s.toFixed(2);}
function drawMiniMap(){
  if(!mapInfo) return;
  const css=W/innerWidth, ms=Math.round(Math.min(W,H)*(touchMode?.3:.27)), mx=W-ms-12*css, my=62*css, k=ms/mapInfo.size;
  miniRect={x:mx/css,y:my/css,w:ms/css,h:ms/css};
  const pIdx=Math.floor((position+playerZ)/SEG);
  ctx.save(); ctx.shadowColor='rgba(0,0,0,.5)'; ctx.shadowBlur=14*css; rr(ctx,mx,my,ms,ms,10*css); ctx.fillStyle='#132238'; ctx.fill(); ctx.restore();
  ctx.save(); rr(ctx,mx,my,ms,ms,10*css); ctx.clip(); ctx.globalAlpha=.95; ctx.drawImage(mapInfo.small,mx,my,ms,ms); ctx.globalAlpha=1;
  ctx.strokeStyle='#e8b04b'; ctx.lineWidth=Math.max(2,3*css); ctx.lineCap='round'; ctx.beginPath();
  for(let i=startLine;i<=Math.min(pIdx,finishIdx);i+=3) i===startLine?ctx.moveTo(mx+mapInfo.mx[i]*k,my+mapInfo.my[i]*k):ctx.lineTo(mx+mapInfo.mx[i]*k,my+mapInfo.my[i]*k); ctx.stroke();
  for(const r of rivals){const i=Math.min(finishIdx,Math.floor(r.z/SEG)); ctx.fillStyle=r.team.color; ctx.beginPath(); ctx.arc(mx+mapInfo.mx[i]*k,my+mapInfo.my[i]*k,3.5*css,0,Math.PI*2); ctx.fill();}
  const i0=Math.min(finishIdx,pIdx), i1=Math.min(finishIdx+5,i0+6), px=mx+mapInfo.mx[i0]*k, py=my+mapInfo.my[i0]*k;
  const ang=Math.atan2(mapInfo.my[i1]-mapInfo.my[i0],mapInfo.mx[i1]-mapInfo.mx[i0]);
  ctx.save(); ctx.translate(px,py); ctx.rotate(ang); ctx.fillStyle='#ffd27a'; ctx.strokeStyle='#0a1322'; ctx.lineWidth=2*css;
  ctx.beginPath(); ctx.moveTo(9*css,0); ctx.lineTo(-6*css,-6*css); ctx.lineTo(-3*css,0); ctx.lineTo(-6*css,6*css); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
  ctx.restore();
  ctx.strokeStyle='rgba(244,234,214,.5)'; ctx.lineWidth=1.5*css; rr(ctx,mx,my,ms,ms,10*css); ctx.stroke();
  const nxt=places.find(p=>p.seg>pIdx), dist=((nxt?nxt.seg:finishIdx)-pIdx)*mapInfo.metersPerSeg;
  ctx.save(); ctx.textAlign='right'; ctx.shadowColor='rgba(0,0,0,.7)'; ctx.shadowBlur=6*css; ctx.fillStyle='#fff8ea';
  ctx.font=`800 ${Math.max(11,12*css)}px ${FD}`; ctx.fillText((nxt?'NEXT · '+nxt.name.toUpperCase():'ARRIVAL')+' · '+(dist/1000).toFixed(1)+' KM',mx+ms,my+ms+16*css);
  ctx.font=`700 ${Math.max(10,10*css)}px ${FD}`; ctx.fillStyle='#a9b8cf'; ctx.fillText(touchMode?'TAP MAP TO ENLARGE':'N · FULL MAP',mx+ms,my+ms+30*css);
  ctx.restore();
}
function drawHUD(){
  const s=UI, pad=18*s, css=W/innerWidth;
  ctx.save(); ctx.textBaseline='alphabetic';
  ctx.fillStyle='#fff8ea'; ctx.shadowColor='rgba(0,0,0,.55)'; ctx.shadowBlur=10*s;
  const cy0=pad+(cine>.5?H*.12:0);
  ctx.font=`900 ${78*s}px ${FD}`; ctx.textAlign='left'; ctx.fillText(String(rank),pad,cy0+62*s);
  const rw=ctx.measureText(String(rank)).width;
  ctx.font=`800 ${26*s}px ${FD}`; ctx.fillStyle='#ffd27a'; ctx.fillText((rank===1?'ST':rank===2?'ND':rank===3?'RD':'TH')+' / 6',pad+rw+6*s,cy0+30*s);
  ctx.fillStyle='#fff8ea'; ctx.font=`700 ${20*s}px ${FD}`; ctx.fillText(fmtTime(raceTime),pad+rw+6*s,cy0+60*s);
  if(strikes){ctx.font=`800 ${15*s}px ${FD}`; ctx.fillStyle='#ff6a5a'; ctx.fillText('STRIKES '+'●'.repeat(strikes)+'○'.repeat(Math.max(0,3-strikes)),pad,cy0+(touchMode?128:86)*s);}
  if(penaltyT>0&&mode==='race'){ // flashing police lights at the screen edges
    const ph=(tNow*5|0)%2, a=.2+.1*Math.sin(tNow*30);
    [[0,ph?'255,40,40':'40,90,255'],[W,ph?'40,90,255':'255,40,40']].forEach(([x,c])=>{const g=ctx.createRadialGradient(x,H*.45,0,x,H*.45,W*.28);
      g.addColorStop(0,`rgba(${c},${a})`); g.addColorStop(1,`rgba(${c},0)`); ctx.fillStyle=g; ctx.fillRect(0,0,W,H);});}
  if(penaltyT>0&&mode==='race'){ctx.save(); ctx.textAlign='center'; ctx.font=`900 ${46*s}px ${FD}`; ctx.fillStyle=banned?'#ff6a5a':'#fff8ea'; ctx.shadowBlur=16*s;
    ctx.fillText(banned?'LICENCE SUSPENDED':'POLICE STOP',W/2,H*.36); ctx.font=`800 ${20*s}px ${FD}`; ctx.fillStyle='#ffd27a';
    ctx.fillText(banned?'Three strikes. The race is over.':'Held for '+Math.ceil(penaltyT)+' s · strike '+strikes+' of 3',W/2,H*.36+34*s); ctx.restore();}
  const kmh=Math.round(speed/MAXSPEED*240), gear=speed<1?'N':String(Math.min(6,1+Math.floor(Math.min(speed/MAXSPEED,1.3)*4.6)));
  if(touchMode){ctx.font=`900 ${34*s}px ${FD}`; ctx.fillStyle=nitroOn?'#9fe4ff':'#fff8ea'; ctx.fillText(kmh+' KM/H',pad,cy0+104*s);
    const tw=ctx.measureText(kmh+' KM/H ').width; ctx.fillStyle='#e8b04b'; ctx.fillText(gear,pad+tw+6*s,cy0+104*s);}
  // progress
  const bw=Math.min(W*.4,520*s), bx=(W-bw)/2-(W>900*css?0:W*.06), by=cy0+14*s, prog=U.limit((position+playerZ-startLine*SEG)/((finishIdx-startLine)*SEG),0,1);
  ctx.shadowBlur=0; ctx.fillStyle='rgba(10,19,34,.55)'; ctx.fillRect(bx,by,bw,6*s);
  ctx.fillStyle='#e8b04b'; ctx.fillRect(bx,by,bw*prog,6*s);
  for(const r of rivals){ctx.fillStyle=r.team.color; ctx.beginPath(); ctx.arc(bx+bw*U.limit((r.z-startLine*SEG)/((finishIdx-startLine)*SEG),0,1),by+3*s,5*s,0,Math.PI*2); ctx.fill();}
  ctx.fillStyle='#ffd27a'; ctx.strokeStyle='#0a1322'; ctx.lineWidth=2*s; ctx.beginPath(); ctx.arc(bx+bw*prog,by+3*s,8*s,0,Math.PI*2); ctx.fill(); ctx.stroke();
  ctx.font=`800 ${15*s}px ${FD}`; ctx.fillStyle='#fff8ea'; ctx.shadowBlur=8*s; ctx.textAlign='left'; ctx.fillText(bw>300*css?'EP '+(stageIdx+1)+' · '+stage.place.toUpperCase():'EP '+(stageIdx+1),bx,by+26*s);
  const kmLeft=(Math.max(0,(finishIdx*SEG-position-playerZ)/SEG*mapInfo.metersPerSeg)/1000).toFixed(1);
  if(bw>300*css){ctx.textAlign='right'; ctx.fillText(kmLeft+' KM TO ARRIVAL',bx+bw,by+26*s);}
  else{ctx.textAlign='right'; ctx.fillText(kmLeft+' KM',bx+bw,by+26*s);}
  ctx.restore();
  if(mode!=='finish') drawMiniMap();
  ctx.save();
  if(!touchMode){
    const R=Math.min(W,H)*.12, cx=W-R*1.1-pad*1.4, cy=H-R*.85-pad;
    ctx.fillStyle='rgba(10,19,34,.6)'; ctx.beginPath(); ctx.arc(cx,cy,R*1.08,0,Math.PI*2); ctx.fill();
    const a0=Math.PI*.75, a1=Math.PI*2.25;
    ctx.lineWidth=R*.08; ctx.strokeStyle='rgba(255,255,255,.15)'; ctx.beginPath(); ctx.arc(cx,cy,R*.9,a0,a1); ctx.stroke();
    ctx.strokeStyle=nitroOn?'#7fd3ff':'#e8b04b'; ctx.beginPath(); ctx.arc(cx,cy,R*.9,a0,a0+(a1-a0)*U.limit(kmh/330,0,1)); ctx.stroke();
    ctx.lineWidth=2*s; ctx.strokeStyle='rgba(255,248,234,.7)';
    for(let i=0;i<=8;i++){const a=a0+(a1-a0)*i/8; ctx.beginPath(); ctx.moveTo(cx+Math.cos(a)*R*.72,cy+Math.sin(a)*R*.72); ctx.lineTo(cx+Math.cos(a)*R*.8,cy+Math.sin(a)*R*.8); ctx.stroke();}
    ctx.fillStyle='#fff8ea'; ctx.textAlign='center'; ctx.font=`900 ${R*.5}px ${FD}`; ctx.fillText(String(kmh),cx,cy+R*.15);
    ctx.font=`800 ${R*.15}px ${FD}`; ctx.fillStyle='#a9b8cf'; ctx.fillText('KM/H',cx,cy+R*.38);
    ctx.font=`900 ${R*.26}px ${FD}`; ctx.fillStyle=nitroOn?'#7fd3ff':'#e8b04b'; ctx.fillText(gear,cx,cy-R*.36);
  }
  // nitro + fortune
  const nx=pad, ny=H-pad-(touchMode?96*css:0)-(cine>.5?H*.12:0), nw=Math.min(240*s,W*.32);
  ctx.textAlign='left'; ctx.font=`800 ${15*s}px ${FD}`; ctx.fillStyle='#bfeaff'; ctx.shadowColor='rgba(0,0,0,.55)'; ctx.shadowBlur=8*s;
  ctx.fillText('NITRO'+(nitroCap>1?' +':'')+(shield?'   · SHIELD READY':''),nx,ny-22*s);
  ctx.shadowBlur=0; ctx.fillStyle='rgba(10,19,34,.6)'; ctx.fillRect(nx,ny-16*s,nw,12*s);
  const ng=ctx.createLinearGradient(nx,0,nx+nw,0); ng.addColorStop(0,'#2a7fd8'); ng.addColorStop(1,'#9fe4ff'); ctx.fillStyle=ng; ctx.fillRect(nx,ny-16*s,nw*U.limit(nitro/nitroCap,0,1),12*s);
  ctx.font=`900 ${30*s}px ${FD}`; ctx.fillStyle='#ffd27a'; ctx.shadowBlur=10*s; ctx.fillText(money(fortune),nx,ny-40*s);
  ctx.font=`700 ${13*s}px ${FD}`; ctx.fillStyle='#fff8ea'; ctx.fillText('FORTUNE COLLECTED',nx,ny-72*s);
  if(mode==='countdown'||(mode==='race'&&raceTime<.8)){
    const txt=mode==='countdown'?String(Math.ceil(countdown)):'GO!', t=mode==='countdown'?countdown%1:1-raceTime/.8;
    ctx.globalAlpha=U.limit(t*1.5,0,1); ctx.font=`900 ${(160+80*(1-t))*s}px ${FD}`; ctx.textAlign='center'; ctx.fillStyle=mode==='countdown'?'#fff8ea':'#ffd27a';
    ctx.shadowBlur=30*s; ctx.fillText(txt,W/2,H*.42); ctx.globalAlpha=1;
  }
  if(mode==='finish'){ctx.font=`900 ${110*s}px ${FD}`; ctx.textAlign='center'; ctx.fillStyle='#ffd27a'; ctx.shadowBlur=30*s; ctx.fillText(ordinal(rank).toUpperCase(),W/2,H*.4);
    ctx.font=`800 ${30*s}px ${FD}`; ctx.fillStyle='#fff8ea'; ctx.fillText('ARRIVED IN '+stage.place.toUpperCase(),W/2,H*.4+44*s);}
  if(mode==='race'&&onBranch){ctx.font=`800 ${20*s}px ${FD}`; ctx.textAlign='center'; ctx.fillStyle='#7fd3ff'; ctx.shadowBlur=8*s; ctx.fillText('ON THE SHORTCUT · STAY IN THE LANE',W/2,H*.62);}
  else if(offroad&&mode==='race'&&speed>0){ctx.font=`800 ${18*s}px ${FD}`; ctx.textAlign='center'; ctx.fillStyle='#ffd27a'; ctx.shadowBlur=8*s; ctx.fillText('OFF ROAD · STEER BACK',W/2,H*.62);}
  ctx.restore();
}

/* =====================================================================
   SOUND — synthesised live, no audio files
   ===================================================================== */
const Sound = {
  ac:null, master:null, eng:null, muted:false,
  init(){
    if(this.ac){if(this.ac.state==='suspended') this.ac.resume(); return;}
    try{
      const AC=window.AudioContext||window.webkitAudioContext; if(!AC) return;
      const ac=this.ac=new AC(); this.master=ac.createGain(); this.master.gain.value=this.muted?0:.55; this.master.connect(ac.destination);
      const o1=ac.createOscillator(), o2=ac.createOscillator(), f=ac.createBiquadFilter(), g=ac.createGain();
      o1.type='sawtooth'; o2.type='square'; o2.detune.value=-1200+7; f.type='lowpass'; f.frequency.value=600; f.Q.value=4; g.gain.value=0;
      o1.connect(f); o2.connect(f); f.connect(g); g.connect(this.master); o1.start(); o2.start();
      const nb=ac.createBuffer(1,ac.sampleRate*2,ac.sampleRate), d=nb.getChannelData(0); for(let i=0;i<d.length;i++) d[i]=Math.random()*2-1;
      const ns=ac.createBufferSource(); ns.buffer=nb; ns.loop=true; const nf=ac.createBiquadFilter(); nf.type='bandpass'; nf.frequency.value=800; const ng=ac.createGain(); ng.gain.value=0;
      ns.connect(nf); nf.connect(ng); ng.connect(this.master); ns.start();
      this.eng={o1,o2,f,g,nf,ng}; this.noise=nb;
    }catch(e){this.ac=null;}
  },
  setMuted(m){this.muted=m; if(this.master) this.master.gain.value=m?0:.55;},
  engine(p,nitro,off,m){
    if(!this.eng) return; const t=this.ac.currentTime, e=this.eng;
    const gears=5, gp=Math.min(p,1.4)*gears, gear=Math.min(gears-1,Math.floor(gp)), rpm=gp-gear;
    const freq=(m==='countdown'||m==='intro')?70+Math.abs(Math.sin(tNow*3))*40:55+rpm*95+gear*14+(nitro?30:0);
    e.o1.frequency.setTargetAtTime(freq,t,.05); e.o2.frequency.setTargetAtTime(freq*1.002,t,.05);
    e.f.frequency.setTargetAtTime(400+p*1400+(nitro?900:0),t,.08);
    const vol=(m==='title'?.04:m==='finish'?.08:.12+p*.08)*(save.music!==false?.6:1); e.g.gain.setTargetAtTime(paused?0:vol,t,.1);
    e.nf.frequency.setTargetAtTime(off?300:nitro?2500:1200,t,.1);
    e.ng.gain.setTargetAtTime(paused?0:(off?.25*p+.05:nitro?.18:.03*p)*(m==='title'?.3:1),t,.1);
  },
  tone(freq,dur,type,vol,slide){
    if(!this.ac||this.muted) return; const t=this.ac.currentTime, o=this.ac.createOscillator(), g=this.ac.createGain();
    o.type=type||'sine'; o.frequency.setValueAtTime(freq,t); if(slide) o.frequency.exponentialRampToValueAtTime(slide,t+dur);
    g.gain.setValueAtTime(vol||.2,t); g.gain.exponentialRampToValueAtTime(.001,t+dur); o.connect(g); g.connect(this.master); o.start(t); o.stop(t+dur+.02);
  },
  coin(){this.tone(1320,.08,'square',.06); setTimeout(()=>this.tone(1760,.14,'square',.06),60);},
  power(){this.tone(300,.4,'sawtooth',.12,1600);},
  tick(){this.tone(1800,.03,'square',.05);},
  whoosh(){
    if(!this.ac||this.muted) return; const t=this.ac.currentTime, s=this.ac.createBufferSource(), f=this.ac.createBiquadFilter(), g=this.ac.createGain();
    s.buffer=this.noise; f.type='bandpass'; f.frequency.setValueAtTime(400,t); f.frequency.exponentialRampToValueAtTime(3000,t+.6); g.gain.setValueAtTime(.4,t); g.gain.exponentialRampToValueAtTime(.001,t+.7);
    s.connect(f); f.connect(g); g.connect(this.master); s.start(t); s.stop(t+.75);
  },
  countBeep(go){this.tone(go?880:440,go?.5:.18,'square',.12);},
  crash(){
    if(!this.ac||this.muted) return; const t=this.ac.currentTime, s=this.ac.createBufferSource(), f=this.ac.createBiquadFilter(), g=this.ac.createGain();
    s.buffer=this.noise; f.type='lowpass'; f.frequency.value=500; g.gain.setValueAtTime(.5,t); g.gain.exponentialRampToValueAtTime(.001,t+.45);
    s.connect(f); f.connect(g); g.connect(this.master); s.start(t); s.stop(t+.5); this.tone(90,.3,'sine',.3,40);
  },
  horn(){[415,523].forEach(f=>this.tone(f,.42,'sawtooth',.07));},
  siren(){for(let i=0;i<8;i++) setTimeout(()=>this.tone(i%2?660:880,.4,'triangle',.08),i*420);},
  fanfare(){[523,659,784,1047].forEach((f,i)=>setTimeout(()=>this.tone(f,.35,'triangle',.14),i*130));}
};

/* =====================================================================
   SAVE DATA (local only)
   ===================================================================== */
const SAVE_KEY='legends-road.v2';
let save={unlocked:1,best:{},bank:0,owned:['eko'],car:'eko',spins:0,perks:{},assist:true,muted:false,results:{}};
try{const s=JSON.parse(localStorage.getItem(SAVE_KEY)||'null'); if(s&&typeof s==='object') save=Object.assign(save,s);}catch(e){}
function persist(){try{localStorage.setItem(SAVE_KEY,JSON.stringify(save));}catch(e){}}
Sound.muted=!!save.muted;
save.owned=(save.owned||[]).filter(id=>CARS.some(c=>c.id===id)); if(!save.owned.includes('saloon')) save.owned.unshift('saloon');
if(!CARS.some(c=>c.id===save.car)) save.car='saloon';
activeCar=CARS.find(c=>c.id===save.car)||CARS[0];

/* =====================================================================
   SCREENS
   ===================================================================== */
const $=id=>document.getElementById(id);
const el={title:$('title'),select:$('select'),garage:$('garage'),spin:$('spin'),standings:$('standings'),bigmap:$('bigmap'),
  story:$('story'),pause:$('pause'),corner:$('corner'),touch:$('touch'),toast:$('toast'),subs:$('subs'),skip:$('skip')};
const MENUS=['title','select','garage','spin','standings','bigmap','story','pause'];
function hideAll(){MENUS.forEach(k=>el[k].hidden=true);}
function syncToggles(){
  ['tgAssist','tgAssist2'].forEach(id=>$(id).setAttribute('aria-pressed',String(!!save.assist)));
  $('tgSound').setAttribute('aria-pressed',String(!Sound.muted));
  $('btnMute').textContent=Sound.muted?'OFF':'SND';
  $('tgBlood').setAttribute('aria-pressed',String(save.blood!==false));
  ['tgMusic','tgMusic2'].forEach(id=>$(id).setAttribute('aria-pressed',String(save.music!==false)));
  $('btnView').textContent=save.view==='cockpit'?'IN':'OUT'; let on3=false; try{on3=R3.on;}catch(_){ } $('btnView').hidden=!on3;
  [$('spinBadge'),$('spinBadge2')].forEach(b=>{b.textContent=save.spins; b.hidden=!save.spins;});
  const gl={high:'3D · High',low:'3D · Fast',['2d']:'Classic 2D'}[save.gfx||'high']; $('btnGfx').textContent='Graphics: '+gl;
}
syncToggles();
function showToast(title,txt){
  el.toast.innerHTML=''; const b=document.createElement('b'); b.textContent=title; el.toast.append(b,document.createTextNode(txt||''));
  el.toast.hidden=false; el.toast.classList.remove('show'); void el.toast.offsetWidth; el.toast.classList.add('show');
  clearTimeout(showToast.t); showToast.t=setTimeout(()=>{el.toast.hidden=true;},5100);
}
function beginRace(idx){
  Sound.init(); hideAll(); paused=false;
  activeCar=CARS.find(c=>c.id===save.car)||CARS[0]; buildPlayerArt(activeCar);
  el.corner.hidden=false; el.touch.hidden=!touchMode;
  for(const k in keys) keys[k]=false;
  startStage(idx,false);
}
function finishRace(){
  mode='finish'; modeT=0; finalTime=raceTime;
  const pz=position+playerZ;
  const done=rivals.filter(r=>r.finished).sort((a,b)=>a.time-b.time), behind=rivals.filter(r=>!r.finished).sort((a,b)=>b.z-a.z);
  legOrder=[...done.map(r=>r.team.id),'you',...behind.map(r=>r.team.id)];
  rank=done.length+1; void pz;
  const prev=save.best[stage.id];
  if(!prev||rank<prev.rank||(rank===prev.rank&&finalTime<prev.time)) save.best[stage.id]={rank,time:finalTime,fortune};
  save.results[stage.id]=legOrder;
  save.unlocked=Math.max(save.unlocked,Math.min(STAGES.length,stageIdx+2));
  save.spins+=rank===1?2:1; save.bank=Math.max(0,save.bank+fortune); persist(); syncToggles();
  Sound.fanfare(); burst('#ffd27a',40); el.toast.hidden=true;
  clearSubs(); say(stage.script.outro[0],stage.script.outro[1],3.4);
}
function showStory(){
  const st=stage, p=st.person, o=st.script.outro;
  $('stEp').textContent=`Episode ${stageIdx+1} of ${STAGES.length} · ${st.place}`; $('stEpTitle').textContent=st.ep;
  const sc=$('stScene'); sc.innerHTML=''; const b=document.createElement('b'); b.textContent=o[0]; sc.append(b,document.createTextNode('“'+o[1]+'”'));
  $('stStampPlace').textContent=st.place; $('stStampDate').textContent=ordinal(rank)+' · Arrived';
  $('stEra').textContent=st.era; $('stPlace').textContent=st.place; $('stCountry').textContent=st.country;
  $('stHistory').textContent=st.history; $('stRank').textContent=ordinal(rank); $('stTime').textContent=fmtTime(finalTime); $('stFortune').textContent=money(fortune)+(fines?` (after $${fines}M in fines)`:'');
  $('stInitials').textContent=p.initials; $('stName').textContent=p.name; $('stRole').textContent=p.role; $('stStory').textContent=p.story; $('stFact').textContent=' '+p.fact;
  const tr=$('stTrail'); tr.innerHTML=''; STAGES.forEach((s,i)=>{const li=document.createElement('li'); li.className=i===stageIdx?'here':(save.best[s.id]?'done':''); li.title=s.place; tr.append(li);});
  el.story.hidden=false; el.touch.hidden=true; el.corner.hidden=true; clearSubs();
  setTimeout(()=>$('btnContinue').focus({preventScroll:true}),400);
}
function seasonTable(){
  const teams=[YOU,...TEAMS].map(t=>({t,pts:0}));
  Object.values(save.results).forEach(order=>order.forEach((id,i)=>{const r=teams.find(x=>x.t.id===id); if(r) r.pts+=POINTS[i]||0;}));
  return teams.sort((a,b)=>b.pts-a.pts||(a.t.id==='you'?-1:1));
}
function showStandings(){
  hideAll(); el.standings.hidden=false;
  const table=seasonTable(), order=save.results[stage.id]||[], last=stageIdx===STAGES.length-1, played=Object.keys(save.results).length;
  $('stdEyebrow').textContent=`Season standings · after episode ${stageIdx+1} · ${played} of ${STAGES.length} raced`;
  const champ=table[0].t;
  $('stdTitle').textContent=last?(champ.id==='you'?'Champions of the Fortune Trail':'Season One complete'):'The Fortune Trail';
  const body=$('stdBody'); body.innerHTML='';
  table.forEach((r,i)=>{const tr=document.createElement('tr'); if(r.t.id==='you') tr.className='you';
    const pos=order.indexOf(r.t.id);
    tr.innerHTML='<td class="pos"></td><td><span class="dot"></span><span class="nm"></span><small></small></td><td class="lr"></td><td class="pts"></td>';
    tr.querySelector('.pos').textContent=i+1; tr.querySelector('.dot').style.background=r.t.color;
    tr.querySelector('.nm').textContent=r.t.id==='you'?'The Adeyemis (you)':'The '+r.t.name+'s'; tr.querySelector('small').textContent=r.t.pair;
    tr.querySelector('.lr').textContent=pos>=0?ordinal(pos+1)+' · +'+POINTS[pos]:'—'; tr.querySelector('.pts').textContent=r.pts;
    body.append(tr);});
  $('stdTeaser').textContent=last?(champ.id==='you'?'Kemi and Tobi win the Fortune Trail. Adeyemi Motors opens its doors again. ':'The Adeyemis finished the season. Race any episode again to chase the title. ')+stage.script.next:stage.script.next;
  $('btnNextEp').textContent=last?'Back to title':'Next: Episode '+(stageIdx+2)+' · '+STAGES[stageIdx+1].place;
  syncToggles(); $('btnStdSpin').disabled=!save.spins;
  setTimeout(()=>$('btnNextEp').focus({preventScroll:true}),100);
}
function toTitle(){
  hideAll(); el.title.hidden=false; el.corner.hidden=true; el.touch.hidden=true; el.toast.hidden=true; el.skip.hidden=true; paused=false;
  clearSubs(); syncToggles();
  startStage(Math.floor(Math.random()*STAGES.length),true);
}
function postcard(idx){
  const a=buildArt(idx), th=STAGES[idx].theme;
  return mk(480,300,(g,w,h)=>{
    const gr=g.createLinearGradient(0,0,0,h*.62); gr.addColorStop(0,th.sky[0]); gr.addColorStop(.6,th.sky[1]); gr.addColorStop(1,th.sky[2]); g.fillStyle=gr; g.fillRect(0,0,w,h);
    if(th.sun){const x=th.sun.x*w,y=th.sun.y*h*.62,r=th.sun.r*w*.7; const gl=g.createRadialGradient(x,y,r*.5,x,y,r*5); gl.addColorStop(0,th.sun.glow); gl.addColorStop(1,'rgba(255,200,150,0)'); g.fillStyle=gl; g.fillRect(0,0,w,h); g.fillStyle=th.sun.c; ell(g,x,y,r,r); g.fill();}
    if(th.stars){const R=rng(idx); for(let i=0;i<70;i++){g.fillStyle=`rgba(255,255,255,${R()*th.stars})`; g.fillRect(R()*w,R()*h*.5,1.5,1.5);}}
    if(th.moon){g.fillStyle='#eef0f8'; ell(g,th.moon.x*w,th.moon.y*h,8,8); g.fill();}
    g.drawImage(a.far,0,0,a.far.width*.5,a.far.height,0,h*.62-h*.4,w,h*.42);
    g.drawImage(a.near,0,0,a.near.width*.5,a.near.height,0,h*.66-h*.3,w,h*.3);
    g.fillStyle=th.water?th.water[0]:th.grass[0]; g.fillRect(0,h*.64,w,h*.36);
    g.fillStyle=th.road[0]; poly(g,[w*.46,h*.64,w*.54,h*.64,w*.85,h,w*.15,h]);
    g.fillStyle=th.lane; poly(g,[w*.497,h*.66,w*.503,h*.66,w*.508,h*.8,w*.492,h*.8]);
    const lm=a.landmark, fw0=h*.72*lm.width/lm.height, fw=Math.min(fw0,w*.55), fh=fw*lm.height/lm.width;
    g.drawImage(lm,w*.94-fw,h*.74-fh,fw,fh);
    if(playerArt) g.drawImage(playerArt.s,w*.37,h*.8,w*.26,w*.26*220/360);
  });
}
function openAtlas(){
  hideAll(); el.select.hidden=false;
  $('selTod').value=save.tod||'story'; $('selWx').value=save.wx||'story';
  if(!playerArt) buildPlayerArt(activeCar);
  const wrap=$('cards'); wrap.innerHTML=''; let done=0;
  STAGES.forEach((st,i)=>{
    const locked=i>=save.unlocked, best=save.best[st.id]; if(best) done++;
    const b=document.createElement('button'); b.className='card'+(locked?' locked':''); b.type='button';
    b.setAttribute('aria-label',locked?`Episode ${i+1}, ${st.place}, locked`:`Play episode ${i+1}, ${st.place}`);
    b.append(postcard(i));
    const m=document.createElement('div'); m.className='meta';
    m.innerHTML='<span class="leg"></span><h3></h3><p class="ept"></p><p class="who"></p>';
    m.querySelector('.leg').textContent=`Episode ${i+1} · ${st.place}`; m.querySelector('h3').textContent=st.ep;
    m.querySelector('.ept').textContent=st.country+(st.route?' · street map':'');
    m.querySelector('.who').textContent=locked?'Finish the previous episode to unlock':`Legend: ${st.person.name}`;
    b.append(m);
    if(best){const md=document.createElement('span'); md.className='medal'; md.textContent=ordinal(best.rank)+' · '+fmtTime(best.time); b.append(md);}
    if(!locked) b.addEventListener('click',()=>beginRace(i));
    wrap.append(b);
  });
  $('atlasSum').textContent=`${done} of ${STAGES.length} episodes raced. Finish an episode to unlock the next.`;
}
function statPct(v,lo,hi){return Math.round(U.limit((v-lo)/(hi-lo),0,1)*85+15);}
function openGarage(){
  hideAll(); el.garage.hidden=false;
  $('bank').textContent='Bank: $'+save.bank+'M';
  const wrap=$('carCards'); wrap.innerHTML='';
  const lu=$('lineup'); if(lu&&!lu.firstChild&&typeof TH!=='undefined'&&TH&&save.gfx!=='2d'){const shot=lineupShot(); if(shot){shot.setAttribute('role','img'); shot.setAttribute('aria-label','The garage line-up of everyday cars'); lu.append(shot);}}
  CARS.forEach((c,ci)=>{
    if(ci===0||c.concept!==CARS[ci-1].concept){const hd=document.createElement('h3'); hd.className='cards-h'; hd.textContent=c.concept?'Concept collection':'Everyday cars'; wrap.append(hd);}
    const owned=save.owned.includes(c.id), sel=save.car===c.id;
    const d=document.createElement('div'); d.className='car'+(sel?' selected':'');
    const pv=(typeof TH!=='undefined'&&TH&&save.gfx!=='2d')?carPreview(c):null;
    d.append(pv||mk(480,270,(g,w,h)=>{g.drawImage(mk(360,220,(g2,w2,h2)=>drawCar(g2,w2,h2,{col:c.color,kind:'player',style:c.style,accent:c.accent,plate:'ADEYEMI'})),w*.14,h*.12,w*.72,w*.72*220/360);}));
    const m=document.createElement('div'); m.className='meta';
    m.innerHTML='<h3></h3><p></p><div class="stats"></div><button class="btn" type="button"></button>';
    m.querySelector('h3').textContent=c.name; m.querySelector('p').textContent=c.desc;
    const stats=m.querySelector('.stats');
    [['Top speed',statPct(c.top,.88,1.1)],['Acceleration',statPct(c.acc,.95,1.2)],['Handling',statPct(c.grip,.95,1.32)],['Nitro',statPct(c.nitro,.92,1.3)]].forEach(([n,v])=>{
      const l=document.createElement('span'); l.textContent=n; const bar=document.createElement('span'); bar.className='bar'; const i=document.createElement('i'); i.style.width=v+'%'; bar.append(i); stats.append(l,bar);});
    const btn=m.querySelector('button');
    if(sel){btn.textContent='Selected'; btn.disabled=true; btn.className='btn primary';}
    else if(owned){btn.textContent='Drive this car'; btn.onclick=()=>{save.car=c.id; persist(); activeCar=c; buildPlayerArt(c); openGarage();};}
    else{btn.textContent='Buy · $'+c.price+'M'; btn.disabled=save.bank<c.price; btn.onclick=()=>{if(save.bank<c.price) return; save.bank-=c.price; save.owned.push(c.id); save.car=c.id; persist(); activeCar=c; buildPlayerArt(c); Sound.init(); Sound.fanfare(); openGarage();};}
    d.append(m); wrap.append(d);
  });
  setTimeout(()=>$('btnGarageBack').focus({preventScroll:true}),50);
}
let garageReturn='title', spinReturn='title', wheelAng=0, spinning=false;
function drawWheel(){
  const c=$('wheel'), g=c.getContext('2d'), S=c.width, R=S*.44, cx=S/2, cy=S/2, n=PRIZES.length;
  g.clearRect(0,0,S,S);
  g.save(); g.translate(cx,cy); g.rotate(wheelAng);
  PRIZES.forEach((p,i)=>{const a0=-Math.PI/2+i*2*Math.PI/n-Math.PI/n, a1=a0+2*Math.PI/n;
    g.beginPath(); g.moveTo(0,0); g.arc(0,0,R,a0,a1); g.closePath(); g.fillStyle=i%2?shade(p.c,-.15):p.c; g.fill();
    g.strokeStyle='#0a1322'; g.lineWidth=4; g.stroke();
    g.save(); g.rotate((a0+a1)/2); g.fillStyle='#fff8ea'; g.font=`900 ${S*.045}px ${FD}`; g.textAlign='right'; g.textBaseline='middle'; g.fillText(p.label,R-S*.04,0); g.restore();});
  g.beginPath(); g.arc(0,0,R,0,Math.PI*2); g.strokeStyle='#f4ead6'; g.lineWidth=S*.02; g.stroke();
  for(let i=0;i<n*2;i++){const a=i*Math.PI/n; g.fillStyle='#ffd27a'; ell(g,Math.cos(a)*R,Math.sin(a)*R,S*.012,S*.012); g.fill();}
  g.restore();
  g.fillStyle='#0a1322'; ell(g,cx,cy,S*.08,S*.08); g.fill(); g.strokeStyle='#e8b04b'; g.lineWidth=S*.012; g.stroke();
  g.fillStyle='#e8b04b'; g.font=`900 ${S*.035}px ${FD}`; g.textAlign='center'; g.textBaseline='middle'; g.fillText('SPIN',cx,cy);
  g.fillStyle='#f4ead6'; g.strokeStyle='#0a1322'; g.lineWidth=4; poly(g,[cx-S*.035,S*.02,cx+S*.035,S*.02,cx,S*.11]); g.stroke();
}
function openSpin(from){
  spinReturn=from; hideAll(); el.spin.hidden=false; $('prize').textContent='';
  $('spinSum').textContent=save.spins?`You have ${save.spins} spin${save.spins>1?'s':''}. Win cash for the garage, a perk for your next race, or a new car.`:'No spins left. Finish an episode to earn one (two if you win).';
  $('btnDoSpin').disabled=!save.spins; drawWheel();
  setTimeout(()=>$(save.spins?'btnDoSpin':'btnSpinDone').focus({preventScroll:true}),50);
}
function doSpin(){
  if(spinning||!save.spins) return; Sound.init();
  spinning=true; save.spins--; persist(); syncToggles(); $('btnDoSpin').disabled=true; $('prize').textContent='';
  const n=PRIZES.length, k=Math.floor(Math.random()*n);
  const start=wheelAng, target=Math.ceil(start/(2*Math.PI))*2*Math.PI+2*Math.PI*5-k*2*Math.PI/n+(Math.random()-.5)*(Math.PI/n)*.7;
  const dur=reduceMotion?300:4200, t0=performance.now(); let lastTick=Math.floor(start/(2*Math.PI/n));
  const step=now=>{const t=Math.min(1,(now-t0)/dur), e=1-Math.pow(1-t,4); wheelAng=start+(target-start)*e;
    const tk=Math.floor(wheelAng/(2*Math.PI/n)); if(tk!==lastTick){lastTick=tk; Sound.tick();}
    drawWheel(); if(t<1) requestAnimationFrame(step); else{spinning=false; awardPrize(PRIZES[k]);}};
  requestAnimationFrame(step);
}
function awardPrize(p){
  let text='';
  if(p.type==='cash'){save.bank+=p.v; text=`+$${p.v}M for the garage`;}
  else if(p.type==='perk'){save.perks=save.perks||{}; save.perks[p.v]=true; text=PERK_TEXT[p.v];}
  else{const locked=CARS.filter(c=>!save.owned.includes(c.id)).sort((a,b)=>a.price-b.price);
    if(locked.length){save.owned.push(locked[0].id); text='New car: '+locked[0].name+'! Pick it in the garage.';}
    else{save.bank+=40; text='Every car is already yours: +$40M instead';}}
  persist(); syncToggles(); Sound.fanfare();
  $('prize').textContent=text; $('btnDoSpin').disabled=!save.spins;
  $('spinSum').textContent=save.spins?`${save.spins} spin${save.spins>1?'s':''} left.`:'No spins left.';
}
let mapReturn=null;
function openBigMap(from){
  if(!mapInfo||mode==='title') return;
  mapReturn=from; paused=true; hideAll(); el.bigmap.hidden=false; el.touch.hidden=true; el.corner.hidden=true;
  $('mapEyebrow').textContent=`Episode ${stageIdx+1} · ${stage.route?'Stylised street map from real coordinates':'Route map'}`;
  $('mapTitle').textContent=stage.place+', '+stage.country;
  const c=$('mapCanvas'), S=Math.round(Math.min(900,Math.max(320,Math.min(innerWidth,innerHeight)*.9))*Math.min(2,devicePixelRatio||1));
  c.width=S; c.height=S; const g=c.getContext('2d'); drawMap(g,S,mapInfo,stage,true);
  const k=S/mapInfo.size, pIdx=Math.min(finishIdx,Math.floor((position+playerZ)/SEG));
  g.strokeStyle='#e8b04b'; g.lineWidth=Math.max(3,S*.012); g.lineCap='round'; g.beginPath();
  for(let i=startLine;i<=pIdx;i+=2) i===startLine?g.moveTo(mapInfo.mx[i]*k,mapInfo.my[i]*k):g.lineTo(mapInfo.mx[i]*k,mapInfo.my[i]*k); g.stroke();
  rivals.forEach(r=>{const i=Math.min(finishIdx,Math.floor(r.z/SEG)); g.fillStyle=r.team.color; ell(g,mapInfo.mx[i]*k,mapInfo.my[i]*k,S*.012,S*.012); g.fill();});
  g.fillStyle='#ffd27a'; g.strokeStyle='#0a1322'; g.lineWidth=3; ell(g,mapInfo.mx[pIdx]*k,mapInfo.my[pIdx]*k,S*.018,S*.018); g.fill(); g.stroke();
  const list=$('placeList'); list.innerHTML='';
  places.forEach((p,i)=>{const li=document.createElement('li'); if(p.seg<=pIdx) li.className='done';
    li.innerHTML='<span class="n"></span><div><b></b><span></span></div>'; li.querySelector('.n').textContent=i+1; li.querySelector('b').textContent=p.name;
    li.querySelector('div span').textContent=p.desc||('A landmark of '+stage.place+' on today\'s route.'); list.append(li);});
  branches.forEach(br=>{const li=document.createElement('li'); li.innerHTML='<span class="n" style="background:#7fd3ff">↗</span><div><b></b><span></span></div>';
    li.querySelector('b').textContent='Shortcut to '+br.name; li.querySelector('div span').textContent=`Turn off to the ${br.side>0?'right':'left'} and stay in the blue-marked lane. Saves about ${((br.r-br.b0-BL)*mapInfo.metersPerSeg/1000).toFixed(1)} km.`; list.append(li);});
  setTimeout(()=>$('btnMapClose').focus({preventScroll:true}),50);
}
function closeBigMap(){
  el.bigmap.hidden=true; el.corner.hidden=false;
  if(mapReturn==='pause'){el.pause.hidden=false;}
  else{paused=false; el.touch.hidden=!touchMode;}
}
function setPaused(p){
  if(CINEMA.on) return;
  if(mode==='title'||mode==='finish'||!el.story.hidden||!el.bigmap.hidden) return;
  paused=p; el.pause.hidden=!p; syncToggles();
  if(p) setTimeout(()=>$('btnResume').focus({preventScroll:true}),50);
}
function skipIntro(){if(mode==='intro') startCountdown();}
function toggleAssist(){save.assist=!save.assist; persist(); syncToggles(); showToast('Steering assist',save.assist?'On: the car stays on the road and resists drifting in bends.':'Off: full control, more drift at high speed.');}
function toggleSound(){Sound.init(); Sound.setMuted(!Sound.muted); save.muted=Sound.muted; persist(); syncToggles();}

$('btnPlay').addEventListener('click',()=>beginRace(Math.min(save.unlocked-1,STAGES.length-1)));
$('btnMap').addEventListener('click',()=>{Sound.init(); openAtlas();});
$('btnGarage').addEventListener('click',()=>{garageReturn='title'; openGarage();});
$('btnSpinT').addEventListener('click',()=>openSpin('title'));
$('btnBack').addEventListener('click',toTitle);
$('selTod').addEventListener('change',e=>{save.tod=e.target.value; persist();});
$('selWx').addEventListener('change',e=>{save.wx=e.target.value; persist();});
$('btnGarageBack').addEventListener('click',()=>garageReturn==='standings'?showStandings():toTitle());
$('btnDoSpin').addEventListener('click',doSpin);
$('btnSpinDone').addEventListener('click',()=>{if(spinning) return; spinReturn==='standings'?showStandings():toTitle();});
$('btnContinue').addEventListener('click',showStandings);
$('btnNextEp').addEventListener('click',()=>stageIdx===STAGES.length-1?toTitle():beginRace(stageIdx+1));
$('btnStdSpin').addEventListener('click',()=>openSpin('standings'));
$('btnStdGarage').addEventListener('click',()=>{garageReturn='standings'; openGarage();});
$('btnStdTitle').addEventListener('click',toTitle);
$('btnRetry').addEventListener('click',()=>beginRace(stageIdx));
$('btnAtlas').addEventListener('click',openAtlas);
$('btnResume').addEventListener('click',()=>setPaused(false));
$('btnPauseMap').addEventListener('click',()=>{el.pause.hidden=true; openBigMap('pause');});
$('btnRestart').addEventListener('click',()=>beginRace(stageIdx));
$('btnCinema').addEventListener('click',()=>{setPaused(false); enterCinema();});
$('cbReplay').addEventListener('click',()=>restartCinema(false));
$('cbRec').addEventListener('click',()=>startRecording());
$('cbExit').addEventListener('click',()=>exitCinema());
{let t=0; const wake=()=>{$('cineBar').classList.remove('idle'); clearTimeout(t); t=setTimeout(()=>$('cineBar').classList.add('idle'),3000);}; addEventListener('pointermove',wake,{passive:true}); addEventListener('pointerdown',wake,{passive:true});}
$('btnQuit').addEventListener('click',toTitle);
$('btnPause').addEventListener('click',()=>setPaused(!paused));
$('btnMute').addEventListener('click',toggleSound);
$('btnMapClose').addEventListener('click',closeBigMap);
$('skip').addEventListener('click',skipIntro);
['tgAssist','tgAssist2'].forEach(id=>$(id).addEventListener('click',toggleAssist));
$('tgSound').addEventListener('click',toggleSound);
function toggleMusic(){Sound.init(); save.music=save.music===false; persist(); syncToggles(); if(save.music) showToast('Radio · '+Music.cur().name,Music.cur().genre+'. Press R or tap FM to change station.');}
function changeStation(){Sound.init(); if(save.music===false){save.music=true; syncToggles();} Music.nextStation(1); const s=Music.cur(); showToast('Radio · '+s.name,s.genre);}
['tgMusic','tgMusic2'].forEach(id=>$(id).addEventListener('click',toggleMusic));
$('btnRadio').addEventListener('click',changeStation);
addEventListener('pointerdown',()=>Sound.init(),{once:true}); addEventListener('keydown',()=>Sound.init(),{once:true});
$('tgBlood').addEventListener('click',()=>{save.blood=save.blood===false; persist(); syncToggles();});
$('btnView').addEventListener('click',()=>{if(R3.on) setView(save.view==='cockpit'?'chase':'cockpit');});
$('tbHorn').addEventListener('pointerdown',e=>{e.preventDefault(); honk();});
['rgBright','rgBright2'].forEach(id=>$(id).addEventListener('input',e=>{save.bright=Math.max(.6,Math.min(1.4,e.target.value/100)); persist(); applyBrightness();}));
$('btnGfx').addEventListener('click',()=>{const order=['high','low','2d'], next=order[(order.indexOf(save.gfx||'high')+1)%3];
  setGraphics(next); syncToggles(); applyBrightness();
  if(save.gfx!==next) showToast('Graphics','3D is not available on this device, so the classic 2D view stays on.');
  else showToast('Graphics',{high:'3D with shadows and full detail.',low:'3D with fewer trees and no shadows, for phones.',['2d']:'The classic painted 2D road.'}[next]);});

/* ---------- input ---------- */
const KEYMAP={ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',ArrowUp:'up',KeyW:'up',ArrowDown:'down',KeyS:'down',Space:'nitro',ShiftLeft:'nitro',ShiftRight:'nitro'};
const racing=()=>mode==='race'||mode==='countdown'||mode==='intro';
addEventListener('keydown',e=>{
  if(CINEMA.on){ // cinema mode: only its own keys
    if(e.code==='KeyC'||e.code==='Escape'){e.preventDefault(); exitCinema();}
    else if(e.code==='KeyK'){e.preventDefault(); CINEMA.rec?stopRecording(true):startRecording();}
    else if(e.code==='Space'){e.preventDefault(); restartCinema(false);}
    return;}
  if(e.code==='KeyC'&&(racing()||mode==='title')&&!paused&&el.story.hidden&&!document.querySelector('.screen:not([hidden])')){e.preventDefault(); enterCinema(); return;}
  if(!el.bigmap.hidden){if(e.code==='KeyN'||e.code==='Escape'){e.preventDefault(); closeBigMap();} return;}
  if(mode==='intro'&&(e.code==='Enter'||e.code==='Escape'||e.code==='Space')&&el.pause.hidden){e.preventDefault(); skipIntro(); return;}
  const k=KEYMAP[e.code];
  if(k&&racing()&&el.story.hidden){keys[k]=true; e.preventDefault(); if(touchMode){touchMode=false; el.touch.hidden=true;}}
  if(e.code==='KeyN'&&racing()&&!paused) openBigMap('race');
  if(e.code==='KeyP'||(e.code==='Escape'&&racing())) setPaused(!paused);
  if(e.code==='KeyM') toggleSound();
  if(e.code==='KeyR'&&!paused) changeStation();
  if(e.code==='KeyH'&&mode==='race'&&!paused) honk();
  if(e.code==='KeyV'&&racing()&&!paused&&R3.on) setView(save.view==='cockpit'?'chase':'cockpit');
});
addEventListener('keyup',e=>{const k=KEYMAP[e.code]; if(k&&mode!=='title'&&mode!=='finish') keys[k]=false;});
addEventListener('blur',()=>{if(racing()) for(const k in keys) keys[k]=false;});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&racing()) setPaused(true);});
addEventListener('pointerdown',e=>{if(e.pointerType==='touch'&&!touchMode){touchMode=true; if(racing()&&el.story.hidden) el.touch.hidden=false;}},{passive:true});
document.querySelectorAll('#touch .tb[data-k]').forEach(b=>{
  const k=b.dataset.k;
  const on=e=>{e.preventDefault(); keys[k]=true; b.classList.add('on'); try{b.setPointerCapture(e.pointerId);}catch(_){}};
  const off=()=>{keys[k]=false; b.classList.remove('on');};
  b.addEventListener('pointerdown',on); b.addEventListener('pointerup',off); b.addEventListener('pointercancel',off); b.addEventListener('lostpointercapture',off);
  b.addEventListener('contextmenu',e=>e.preventDefault());
});
let swipe=null;
cv.addEventListener('pointerdown',e=>{
  if(miniRect&&racing()&&e.clientX>=miniRect.x&&e.clientX<=miniRect.x+miniRect.w&&e.clientY>=miniRect.y&&e.clientY<=miniRect.y+miniRect.h){openBigMap('race'); return;}
  if(e.pointerType!=='touch'||mode!=='race') return; swipe={x:e.clientX,id:e.pointerId};});
cv.addEventListener('pointermove',e=>{if(!swipe||e.pointerId!==swipe.id) return; const d=e.clientX-swipe.x; keys.left=d<-18; keys.right=d>18;});
cv.addEventListener('pointerup',()=>{if(swipe){keys.left=keys.right=false; swipe=null;}});

