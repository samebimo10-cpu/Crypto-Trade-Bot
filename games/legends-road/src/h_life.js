
/* =====================================================================
   STREET LIFE — pedestrians, cyclists, okadas, kekes, roadside kit,
   power lines and side streets.
   ===================================================================== */
const SKIN=['#5a3a26','#4a2e1e','#6e4630','#3e2618','#7a5238','#8a6040','#c89070','#e0b090'];
const CLOTH=['#c8321f','#2f6fb0','#2a8a4a','#e8a020','#7a4a9a','#f4f4f4','#1d1f24','#d86a1f','#3aa0a0','#e85a8a'];

const LIFEGEO={};
function mergedModel(key,build){
  if(!LIFEGEO[key]){const parts=[]; build(parts); const by={}; parts.forEach(([k,g])=>(by[k]||(by[k]=[])).push(g));
    LIFEGEO[key]={}; for(const k in by){LIFEGEO[key][k]=gMerge(by[k]); by[k].forEach(g=>g.dispose());}}
  const G=new TH.Group(), body=new TH.Group(); G.add(body);
  for(const k in LIFEGEO[key]){const m=new TH.Mesh(LIFEGEO[key][k],lifeMat(k)); m.castShadow=true; body.add(m);}
  G.userData={wheels:[],body,L:2}; return G;
}
const LIFEMAT={};
function lifeMat(k){
  if(LIFEMAT[k]) return LIFEMAT[k];
  const o={cloth:{roughness:.85},skin:{roughness:.7},metalDark:{color:C3('#2a2d33'),metalness:.6,roughness:.4},tyre:{color:C3('#111'),roughness:.9},
    chrome:{color:C3('#d8dce2'),metalness:1,roughness:.2},glass:{color:C3('#1c2733'),roughness:.05,metalness:.2},paint:{metalness:.3,roughness:.35},
    canopy:{roughness:.8,side:TH.DoubleSide},light:{color:C3('#5a0a06'),emissive:C3('#ff2a14'),emissiveIntensity:1.8},
    lamp:{color:C3('#fff6e0'),emissive:C3('#fff6e0'),emissiveIntensity:1.4},white:{color:C3('#f2f2ee'),roughness:.5},metal:{metalness:.7,roughness:.35}}[k]||{};
  return LIFEMAT[k]=new TH.MeshStandardMaterial(Object.assign({vertexColors:true},o));
}
/* ---------- people: capsule bodies with faces, hair, head ties, wrappers and shoes ---------- */
const HAIR=['#120d0a','#1a120c','#0e0b09','#2a1a10'], WRAP=['#d6402a','#1f6fb8','#f0b020','#2a8a4a','#8a2a7a','#e86a2a','#1aa0a0','#c81e5a'];
const _Y=TH?new TH.Vector3(0,1,0):null;
function limb(P,k,col,a,b,r){ // a capsule from point a to point b
  const A=new TH.Vector3(...a), Bv=new TH.Vector3(...b), d=Bv.clone().sub(A), L=d.length();
  const g=new TH.CapsuleGeometry(r,Math.max(.01,L),2,6); g.applyQuaternion(new TH.Quaternion().setFromUnitVectors(_Y,d.normalize()));
  g.translate((A.x+Bv.x)/2,(A.y+Bv.y)/2,(A.z+Bv.z)/2); P.push([k,gPrep(g,C3(col))]);
}
function bpart(P,k,col,geo,x,y,z,sx,sy,sz,rx){if(sx) geo.scale(sx,sy,sz); if(rx) geo.rotateX(rx); geo.translate(x,y,z); P.push([k,gPrep(geo,C3(col))]);}
function headParts(P,o,x,y,z){ // y = centre of the head; the figure faces -Z
  bpart(P,'cloth',o.skin,new TH.SphereGeometry(.105,10,8),x,y,z,1,1.14,1.06);
  limb(P,'cloth',o.skin,[x,y-.2,z+.01],[x,y-.08,z],.048);
  bpart(P,'cloth',o.skin,new TH.BoxGeometry(.03,.045,.04),x,y-.015,z-.108);
  [-1,1].forEach(s=>bpart(P,'cloth',o.skin,new TH.SphereGeometry(.026,6,5),x+s*.104,y,z+.01));
  [-1,1].forEach(s=>bpart(P,'cloth','#f4f0e8',new TH.SphereGeometry(.014,6,5),x+s*.037,y+.02,z-.098));
  if(o.helmet) {bpart(P,'metalDark',o.helmet,new TH.SphereGeometry(.14,14,10,0,Math.PI*2,0,Math.PI/1.75),x,y+.01,z+.01);
    bpart(P,'glass','#1c2733',new TH.SphereGeometry(.141,12,6,Math.PI*1.25,Math.PI*.5,Math.PI*.38,Math.PI*.22),x,y+.01,z+.01);}
  else if(o.gele){bpart(P,'cloth',o.gele,new TH.SphereGeometry(.15,12,8,0,Math.PI*2,0,Math.PI*.6),x,y+.04,z+.02,1.25,.85,1.15);
    bpart(P,'cloth',o.gele,new TH.ConeGeometry(.12,.16,8),x,y+.17,z+.06,1.6,1,.5,-.5);}
  else bpart(P,'cloth',o.hair,new TH.SphereGeometry(.112,12,8,0,Math.PI*2,0,Math.PI*(o.female?.62:.42)),x,y+.012,z+.008,1,1.12,1.06);
  if(o.load) bpart(P,'metal',o.load,new TH.CylinderGeometry(.26,.17,.13,16),x,y+.18,z);
}
function torsoParts(P,o,x,y,z,lean){ // y = centre of the chest
  const g=new TH.CapsuleGeometry(.15,.24,3,9); g.scale(1.22,1,.7); if(lean) g.rotateX(lean); g.translate(x,y,z); P.push(['cloth',gPrep(g,C3(o.col))]);
  const ly=Math.cos(lean||0)*.12, lz=-Math.sin(lean||0)*.12;
  [-1,1].forEach(s=>limb(P,'cloth',o.col,[x+s*.17,y+ly,z+lz],[x+s*.23,y+ly-.11,z+lz],.066));
}
// pose: 'stand' (feet at y), 'ride' (hips at y, hands to grips), 'sit' (hips at y, feet on the floor at y-.45)
function figure(P,o,x,y,z){
  const sk=o.skin;
  if(o.pose==='stand'){
    const legC=o.female?sk:o.pants;
    [-1,1].forEach(s=>{limb(P,'cloth',legC,[x+s*.085,y+.86,z],[x+s*.08,y+.12,z],.064); bpart(P,'cloth','#1a1614',new TH.BoxGeometry(.1,.07,.23),x+s*.08,y+.035,z-.04);});
    if(o.female) bpart(P,'cloth',o.wrap,new TH.CylinderGeometry(.17,.25,.66,14),x,y+.6,z);
    else bpart(P,'cloth',o.pants,new TH.CylinderGeometry(.16,.16,.16,12),x,y+.86,z,1.12,1,.75);
    torsoParts(P,o,x,y+1.17,z,0);
    [-1,1].forEach(s=>{const up=o.load&&s>0; limb(P,'cloth',sk,[x+s*.22,y+1.31,z],up?[x+s*.24,y+1.95,z]:[x+s*.25,y+.87,z+.02],.043); bpart(P,'cloth',sk,new TH.SphereGeometry(.05,8,6),x+s*.25,up?y+1.98:y+.84,z+.02);});
    headParts(P,o,x,y+1.62,z);
  } else if(o.pose==='ride'){
    const g=o.grip||[.32,y+.3,z-.55];
    [-1,1].forEach(s=>{limb(P,'cloth',o.pants,[x+s*.1,y+.05,z],[x+s*.17,y+.12,z-.4],.07); limb(P,'cloth',o.pants,[x+s*.17,y+.12,z-.4],[x+s*.19,y-.36,z-.32],.06);
      bpart(P,'cloth','#1a1614',new TH.BoxGeometry(.1,.07,.22),x+s*.19,y-.41,z-.37);});
    torsoParts(P,o,x,y+.36,z-.07,-.28);
    [-1,1].forEach(s=>{limb(P,'cloth',sk,[x+s*.2,y+.5,z-.17],[x+s*g[0],g[1],g[2]],.043); bpart(P,'cloth',sk,new TH.SphereGeometry(.05,8,6),x+s*g[0],g[1],g[2]);});
    headParts(P,o,x,y+.8,z-.22);
  } else { // sit
    [-1,1].forEach(s=>{limb(P,'cloth',o.female?o.wrap:o.pants,[x+s*.09,y+.04,z],[x+s*.1,y+.08,z-.42],.072); limb(P,'cloth',o.female?sk:o.pants,[x+s*.1,y+.06,z-.42],[x+s*.1,y-.38,z-.46],.06);
      bpart(P,'cloth','#1a1614',new TH.BoxGeometry(.1,.07,.22),x+s*.1,y-.43,z-.5);});
    torsoParts(P,o,x,y+.36,z+.02,.06);
    [-1,1].forEach(s=>{limb(P,'cloth',sk,[x+s*.21,y+.5,z+.02],[x+s*.17,y+.16,z-.3],.042);});
    headParts(P,o,x,y+.82,z+.03);
  }
}
function randomLook(R,female){
  const naija=stage&&stage.theme&&stage.theme.naija;
  return {female,skin:pick(R,naija?SKIN.slice(0,6):SKIN),col:pick(R,CLOTH),pants:pick(R,['#1d1f24','#2a3a5a','#5a4a3a','#3a3a3a','#e8e4da']),
    wrap:pick(R,WRAP),hair:pick(R,HAIR),gele:female&&naija&&R()<.35?pick(R,WRAP):null};
}
function wheelParts(P,x,y,z,R,spokes){
  const t=new TH.TorusGeometry(R,R*.24,8,20); t.rotateY(Math.PI/2); t.translate(x,y,z); P.push(['tyre',gPrep(t)]);
  const hub=new TH.CylinderGeometry(R*.18,R*.18,.12,10); hub.rotateZ(Math.PI/2); hub.translate(x,y,z); P.push(['chrome',gPrep(hub)]);
  if(spokes) for(let i=0;i<spokes/2;i++){const g=new TH.BoxGeometry(.008,R*1.6,.008); g.rotateX(i/(spokes/2)*Math.PI); g.translate(x,y,z); P.push(['chrome',gPrep(g)]);}
  else{const rim=new TH.CylinderGeometry(R*.62,R*.62,.1,14); rim.rotateZ(Math.PI/2); rim.translate(x,y,z); P.push(['chrome',gPrep(rim)]);}
}
/* ---------- okada (motorcycle taxi), modelled on the common 100-150cc commuter bike ---------- */
function okadaModel(col){
  return mergedModel('okada'+col,P=>{
    const R=Math.random, add=(k,g,x,y,z,c)=>{g.translate(x,y,z); P.push([k,gPrep(g,c?C3(c):null)]);};
    wheelParts(P,0,.31,-.66,.3,10); wheelParts(P,0,.31,.62,.3,10);
    [-1,1].forEach(s=>limb(P,'chrome','#c8ccd2',[s*.09,.31,-.66],[s*.08,1.0,-.5],.022));
    const mg=new TH.TorusGeometry(.33,.05,6,14,Math.PI*.8); mg.rotateY(Math.PI/2); mg.rotateX(-.3); add('paint',mg,0,.31,-.66,col);
    add('chrome',new TH.CylinderGeometry(.09,.1,.09,14).rotateX(Math.PI/2),0,.98,-.6); add('lamp',new TH.CircleGeometry(.075,14).rotateY(Math.PI),0,.98,-.648);
    add('paint',new TH.BoxGeometry(.26,.18,.12),0,1.0,-.53,col);
    limb(P,'metalDark','#1a1c20',[-.36,1.12,-.47],[.36,1.12,-.47],.016);
    [-1,1].forEach(s=>{limb(P,'metalDark','#1a1c20',[s*.33,1.12,-.47],[s*.38,1.36,-.47],.008); add('glass',new TH.CylinderGeometry(.05,.05,.015,10).rotateX(Math.PI/2),s*.38,1.39,-.47);});
    const tank=new TH.CapsuleGeometry(.13,.22,4,10); tank.rotateX(Math.PI/2); tank.scale(.95,.85,1); add('paint',tank,0,.88,-.22,col);
    add('metalDark',new TH.BoxGeometry(.27,.1,.66),0,.9,.2,'#141414');
    add('paint',new TH.BoxGeometry(.25,.2,.32),0,.7,.12,col);
    add('metalDark',new TH.BoxGeometry(.24,.26,.3),0,.46,-.12); for(let i=0;i<4;i++) add('metalDark',new TH.BoxGeometry(.3,.02,.22),0,.62+i*.035,-.22);
    limb(P,'chrome','#d0d4da',[.15,.36,-.1],[.17,.44,.66],.035);
    limb(P,'metalDark','#1a1c20',[0,1.0,-.5],[0,.62,.55],.03);
    add('metalDark',new TH.BoxGeometry(.3,.03,.3),0,.95,.62); add('light',new TH.BoxGeometry(.14,.07,.04),0,.86,.76);
    add('paint',new TH.BoxGeometry(.24,.04,.4),0,.66,.66,col);
    const rider=randomLook(R,false); rider.pose='ride'; rider.helmet=R()<.6?pick(R,['#1a1c20','#c8321f','#e8e8e8','#2a5aa8']):null; rider.grip=[.33,1.12,-.47];
    figure(P,rider,0,.95,.08);
    if(col!=='#2f5f9e'){const pas=randomLook(R,R()<.5); pas.pose='ride'; pas.grip=[.22,1.2,.0]; figure(P,pas,0,1.0,.46);}
  });
}
/* ---------- keke napep (auto-rickshaw): rounded nose, canvas roof, open sides, bench seat ---------- */
function kekeModel(col){
  return mergedModel('keke'+col,P=>{
    const R=Math.random, add=(k,g,x,y,z,c)=>{g.translate(x,y,z); P.push([k,gPrep(g,c?C3(c):null)]);}, stripe=col==='#f2c21b'?'#1f7a3a':'#16181c';
    wheelParts(P,0,.26,-1.02,.25,0); [-.6,.6].forEach(x=>wheelParts(P,x,.26,.82,.25,0));
    const mg=new TH.TorusGeometry(.29,.05,6,14,Math.PI); mg.rotateY(Math.PI/2); add('metalDark',mg,0,.26,-1.02);
    const nose=new TH.CylinderGeometry(.55,.55,.62,20,1,false,Math.PI/2,Math.PI); nose.scale(1,1,.62); add('paint',nose,0,.82,-.78,col);
    add('paint',new TH.BoxGeometry(1.1,.62,.36),0,.82,-.6,col);
    add('lamp',new TH.CircleGeometry(.08,14).rotateY(Math.PI),0,.94,-1.125); add('chrome',new TH.TorusGeometry(.085,.015,6,14),0,.94,-1.12);
    [-1,1].forEach(s=>add('light',new TH.BoxGeometry(.08,.05,.03),s*.4,.98,-1.0,'#ff9a20'));
    add('paint',new TH.BoxGeometry(1.28,.36,1.86),0,.46,.12,col); add('paint',new TH.BoxGeometry(1.32,.07,1.9),0,.6,.12,stripe);
    add('paint',new TH.BoxGeometry(1.32,.6,.56),0,.62,1.02,col); add('paint',new TH.BoxGeometry(1.34,.07,.58),0,.62,1.02,stripe);
    [-1,1].forEach(s=>add('light',new TH.BoxGeometry(.16,.12,.03),s*.48,.7,1.31));
    add('white',new TH.BoxGeometry(.34,.12,.02),0,.5,1.31);
    const sp=new TH.TorusGeometry(.2,.07,6,16); add('tyre',sp,0,.98,1.38); add('chrome',new TH.CylinderGeometry(.12,.12,.06,12).rotateX(Math.PI/2),0,.98,1.38);
    const ws=new TH.BoxGeometry(1.08,.7,.02); ws.rotateX(-.22); add('glass',ws,0,1.5,-.72);
    limb(P,'metalDark','#1a1c20',[-.56,1.12,-.78],[-.6,1.86,-.6],.025); limb(P,'metalDark','#1a1c20',[.56,1.12,-.78],[.6,1.86,-.6],.025);
    [.3,1.25].forEach(z=>[-1,1].forEach(s=>limb(P,'metalDark','#1a1c20',[s*.64,.8,z],[s*.65,1.85,z],.02)));
    add('canopy',new TH.BoxGeometry(1.36,.06,2.1),0,1.9,.28,'#18191c');
    [-1,1].forEach(s=>{const e=new TH.CylinderGeometry(.04,.04,2.1,8); e.rotateX(Math.PI/2); add('canopy',e,s*.68,1.88,.28,'#18191c');
      const cur=new TH.CylinderGeometry(.06,.06,1.5,8); cur.rotateX(Math.PI/2); add('canopy',cur,s*.66,1.78,.45,pick(R,['#2a3a5a','#5a1a1a','#1a1c20']));});
    const fr=new TH.CylinderGeometry(.2,.2,1.36,10,1,false,0,Math.PI/2); fr.rotateZ(Math.PI/2); add('canopy',fr,0,1.7,-.6,'#18191c');
    add('canopy',new TH.BoxGeometry(1.34,1.05,.04),0,1.37,1.3,'#18191c'); add('glass',new TH.BoxGeometry(.6,.26,.02),0,1.55,1.33);
    add('metalDark',new TH.BoxGeometry(.44,.1,.4),0,.76,-.3,'#202226'); add('metalDark',new TH.BoxGeometry(.44,.36,.08),0,.95,-.1,'#202226');
    limb(P,'metalDark','#1a1c20',[-.3,1.1,-.62],[.3,1.1,-.62],.016); limb(P,'metalDark','#1a1c20',[0,1.1,-.62],[0,.75,-.9],.025);
    add('metalDark',new TH.BoxGeometry(1.16,.14,.45),0,.72,.6,'#3a2a22'); add('metalDark',new TH.BoxGeometry(1.16,.5,.1),0,1.0,.86,'#3a2a22');
    const d=randomLook(R,false); d.pose='ride'; d.grip=[.3,1.1,-.62]; figure(P,d,0,.82,-.22);
    const n=1+Math.floor(R()*3); for(let i=0;i<n;i++){const p=randomLook(R,R()<.55); p.pose='sit'; figure(P,p,[-.36,.36,0][i],.8,.62);}
  });
}

/* ---------- roadside kit (models face +X; placed facing the road) ---------- */
const KIT={
  kiosk(B,o){const M=o.M, R=o.R, col=C3(pick(R,['#2f6fb0','#c8321f','#2a8a4a','#e0a82a','#7a4a9a']));
    B.add('corr',gPrep(tr(new TH.BoxGeometry(2.4,2.6,6),0,1.3,0)),M,col);
    B.add('metalDark',gPrep(tr(new TH.BoxGeometry(.06,2.0,5.2),1.21,1.1,0),C3('#141518')),M);
    for(let y=.6;y<2;y+=.45) B.add('cloth',gPrep(tr(new TH.BoxGeometry(.3,.12,5),1.0,y,0),C3(pick(R,CLOTH))),M);
    B.add('corr',gPrep(tr(new TH.BoxGeometry(1.6,.08,6.4),1.9,2.55,0)),M,col);
    if(R()<.6) addPerson(B,M,2.4,0,(R()-.5)*3,R);},
  stall(B,o){const M=o.M, R=o.R;
    const u=new TH.ConeGeometry(1.5,.55,10,1,true); B.add('canopyMat',gPrep(tr(u,0,2.35,0),C3(pick(R,['#e8322a','#2f6fb0','#2a8a4a','#f4c21b']))),M);
    B.add('metalDark',gPrep(tr(new TH.CylinderGeometry(.03,.03,2.3,6),0,1.15,0)),M);
    B.add('wood',gPrep(tr(new TH.BoxGeometry(1.0,.08,1.6),.3,.85,0)),M); B.add('wood',gPrep(tr(new TH.BoxGeometry(.9,.8,.06),.3,.42,.7)),M);
    for(let i=0;i<7;i++) B.add('cloth',gPrep(tr(new TH.SphereGeometry(.1,6,5),.3+(R()-.5)*.6,.97,(R()-.5)*1.3),C3(pick(R,['#e8a020','#c83a22','#5aa03a','#f0d050','#7a3a1a']))),M);
    addPerson(B,M,-.5,0,0,R);},
  compound(B,o){const M=o.M, R=o.R, wall=C3(pick(R,['#efe6d2','#e2d6be','#d8e2d0','#e8dcd0']));
    const W2=o.w, D=o.w*.9;
    B.add('concrete',gPrep(tr(new TH.BoxGeometry(.25,2.3,D),W2/2,1.15,0),wall),M);
    [[-1],[1]].forEach(([s])=>B.add('concrete',gPrep(tr(new TH.BoxGeometry(W2,2.3,.25),0,1.15,s*D/2),wall),M));
    B.add('concrete',gPrep(tr(new TH.BoxGeometry(.25,2.3,D),-W2/2,1.15,0),wall),M);
    B.add('metalDark',gPrep(tr(new TH.BoxGeometry(.12,2.1,3.2),W2/2+.08,1.05,0),C3(pick(R,['#1f4a2a','#1a1c20','#5a1a1a']))),M);
    addBuilding(B,'phhouse',o.x,o.y,o.z,o.ry,W2*.62,R,o.night);},
  frame(B,o){const M=o.M, R=o.R, w=o.w, d=w*.8, floors=2+Math.floor(R()*2), c=C3('#a8a49c');
    for(let f=0;f<=floors;f++) B.add('concrete',gPrep(tr(new TH.BoxGeometry(w,.25,d),0,f*3.2+.12,0),c),M);
    for(let f=0;f<floors;f++) for(const x of [-w/2+.2,0,w/2-.2]) for(const z of [-d/2+.2,d/2-.2]) B.add('concrete',gPrep(tr(new TH.BoxGeometry(.32,3.0,.32),x,f*3.2+1.7,z),c),M);
    for(const x of [-w/2+.2,0,w/2-.2]) for(const z of [-d/2+.2,d/2-.2]) B.add('metalDark',gPrep(tr(new TH.BoxGeometry(.04,1.2,.04),x,floors*3.2+.8,z),C3('#5a3a2a')),M);
    B.add('concrete',gPrep(tr(new TH.BoxGeometry(w*.6,1.6,.22),-w*.1,1.05,d/2-.2),C3('#c0bcb2')),M);},
  fuel(B,o){const M=o.M, R=o.R, brand=C3(pick(R,['#2a5aa8','#c8321f','#2a8a4a','#e8a020']));
    B.add('concrete',gPrep(tr(new TH.BoxGeometry(14,.1,10),0,.05,0),C3('#bdbab2')),M);
    B.add('roof',gPrep(tr(new TH.BoxGeometry(14,.5,9),0,5.4,0),C3('#f0f0f0')),M); B.add('cloth',gPrep(tr(new TH.BoxGeometry(14.1,.45,9.1),0,5.0,0),brand),M);
    for(const x of [-5,5]) for(const z of [-3,3]) B.add('concrete',gPrep(tr(new TH.BoxGeometry(.4,5,.4),x,2.6,z),C3('#e8e8e8')),M);
    for(const z of [-2.5,0,2.5]) B.add('cloth',gPrep(tr(new TH.BoxGeometry(.6,1.6,.9),0,.8,z),brand),M);
    B.add('concrete',gPrep(tr(new TH.BoxGeometry(.3,7,.3),6,3.5,-4.5),C3('#e8e8e8')),M); B.add('cloth',gPrep(tr(new TH.BoxGeometry(.3,2.4,1.6),6,6.2,-4.5),brand),M);}
};
function addPerson(B,M,x,y,z,R){ // a standing figure merged into the chunk
  const P=[], o=randomLook(R,R()<.5); o.pose='stand'; o.load=o.female&&R()<.25?pick(R,['#c8ccd2','#2a8ad8','#e8302a']):null;
  figure(P,o,0,0,0); const m=M.clone().multiply(new TH.Matrix4().makeTranslation(x,y,z)).multiply(new TH.Matrix4().makeRotationY(-Math.PI/2));
  P.forEach(([k,g])=>B.add(MAT[k]?k:'cloth',g,m));
}

/* ---------- power lines, side streets, Niger Bridge trusses ---------- */
function streetFurniture(B,C,city,night,dual,SH){
  const {i0,i1}=C, segs=segments, th=stage.theme, wires=[];
  // concrete power poles with sagging wires on Nigerian streets
  if(th.naija){
    const sd=1, lat=HW+(city?4.6:2.6);
    let prev=null;
    for(let i=i0-(i0%32);i<i1;i+=32){ if(i<i0) continue; const sg=segs[i]; if(!sg||sg.water||sg.fly||sg.street===sd){prev=null; continue;}
      const p=pose(i), x=p.x+Math.cos(p.h)*lat, z=p.z+Math.sin(p.h)*lat, y=p.y+(city?.16:terrainY(lat));
      B.add('concrete',gPrep(tr(new TH.CylinderGeometry(.12,.18,9.5,8),0,4.75,0),C3('#b8b4ac')),mat4(x,y,z,-p.h,1));
      B.add('metalDark',gPrep(tr(new TH.BoxGeometry(.12,.12,2.2),0,9.0,0)),mat4(x,y,z,-p.h+Math.PI/2,1));
      if(i%96===0) B.add('metalDark',gPrep(tr(new TH.BoxGeometry(.9,1.1,.7),.35,7.6,0),C3('#6a7076')),mat4(x,y,z,-p.h+Math.PI/2,1));
      const pts=[-.9,0,.9].map(o=>new TH.Vector3(x+Math.cos(p.h)*o, y+9.05, z+Math.sin(p.h)*o));
      if(prev) for(let w=0;w<3;w++){const a=prev[w], b=pts[w]; let last=a; for(let k=1;k<=6;k++){const t=k/6, q=a.clone().lerp(b,t); q.y-=Math.sin(Math.PI*t)*.9; wires.push(last.x,last.y,last.z,q.x,q.y,q.z); last=q;}}
      prev=pts;}
  }
  // side streets at junctions, with houses and traffic lights
  for(let i=i0;i<i1;i++){const sd=segs[i].streetC; if(!sd) continue;
    const p=pose(i), off=(dual&&sd<0)?SH:0, d0=HW+.7+off, len=70, hwS=4.2, f={x:Math.sin(p.h),z:-Math.cos(p.h)}, r={x:Math.cos(p.h),z:Math.sin(p.h)};
    const pos=[],uv=[],idx=[]; const rows=10;
    for(let k=0;k<=rows;k++){const d=d0+len*k/rows, y=p.y+Math.min(.03,terrainY(d-off)+.03)+.02;
      for(const s of [-1,1]){pos.push(p.x+r.x*sd*d+f.x*s*hwS, y, p.z+r.z*sd*d+f.z*s*hwS); uv.push(s<0?0:1,(d-d0)/11);}
      if(k<rows){const a=k*2; idx.push(a,a+1,a+2,a+1,a+3,a+2);}}
    const g=new TH.BufferGeometry(); g.setAttribute('position',new TH.Float32BufferAttribute(pos,3)); g.setAttribute('uv',new TH.Float32BufferAttribute(uv,2)); g.setIndex(idx); g.computeVertexNormals();
    B.raw('road',gPrep(g));
    const R=rng(i*7+3);
    for(let k=0;k<4;k++){const d=d0+14+k*14; for(const s of [-1,1]){const w=8+R()*5, c=d+0, ox=p.x+r.x*sd*c+f.x*s*(hwS+3.5+w*.5), oz=p.z+r.z*sd*c+f.z*s*(hwS+3.5+w*.5);
      addBuilding(B,R()<.25&&th.scenery.includes('office')?'office':'phhouse',ox,p.y+terrainY(d-off),oz,-p.h,w,R,night);}}
    for(const s of [-1,1]){const cx=p.x+r.x*sd*(d0+.6)+f.x*s*(hwS+.6), cz=p.z+r.z*sd*(d0+.6)+f.z*s*(hwS+.6), M=mat4(cx,p.y+.16,cz,-p.h,1);
      B.add('metalDark',gPrep(tr(new TH.CylinderGeometry(.08,.1,3.4,8),0,1.7,0)),M); B.add('metalDark',gPrep(tr(new TH.BoxGeometry(.32,.9,.3),0,3.6,0)),M);
      [['tlRed',3.9],['tlAmber',3.6],['tlGreen',3.3]].forEach(([k,y])=>B.add(k,gPrep(tr(new TH.SphereGeometry(.09,8,6),0,y,-.16)),M));}
  }
  // Niger Bridge: steel through-trusses along the river crossing
  if(th.landmark==='nigerBridge') for(let i=i0;i<i1;i++){ if(!segs[i].water) continue;
    if(i%2===0) for(const s of [-1,1]){const L=s*(HW+.75); B.raw('truss',ribbon(i,Math.min(i+2,i1),L,L,1,8.5,0,1,6));}
    if(i%12===0){const p=pose(i); B.add('truss',gPrep(tr(new TH.BoxGeometry(2*HW+1.6,.5,.5),0,8.4,0)),mat4(p.x,p.y,p.z,-p.h,1));}}
  if(wires.length){const lg=new TH.BufferGeometry(); lg.setAttribute('position',new TH.Float32BufferAttribute(wires,3));
    C.group.add(new TH.LineSegments(lg,new TH.LineBasicMaterial({color:0x1a1c20})));}
}

/* ---------- pedestrians and cyclists (instanced, animated) ---------- */
function crowdGeo(){
  if(LIFEGEO.crowd) return LIFEGEO.crowd;
  const M=(list)=>{const g=gMerge(list.map(([k,geo])=>geo)); list.forEach(([k,geo])=>geo.dispose()); return g;};
  const P0=()=>[];
  const torso=P0(); torsoParts(torso,{col:'#ffffff'},0,0,0,0);
  const head=P0(); {const o={skin:'#ffffff'}; bpart(head,'c','#ffffff',new TH.SphereGeometry(.105,10,8),0,0,0,1,1.14,1.06); limb(head,'c','#ffffff',[0,-.2,.01],[0,-.08,0],.048);
    bpart(head,'c','#ffffff',new TH.BoxGeometry(.03,.045,.04),0,-.015,-.108); [-1,1].forEach(s=>bpart(head,'c','#ffffff',new TH.SphereGeometry(.026,6,5),s*.104,0,.01));}
  const hair=P0(); bpart(hair,'c','#ffffff',new TH.SphereGeometry(.113,12,8,0,Math.PI*2,0,Math.PI*.5),0,.012,.008,1,1.12,1.06);
  const gele=P0(); bpart(gele,'c','#ffffff',new TH.SphereGeometry(.15,12,8,0,Math.PI*2,0,Math.PI*.6),0,.04,.02,1.25,.85,1.15); bpart(gele,'c','#ffffff',new TH.ConeGeometry(.12,.16,8),0,.17,.06,1.6,1,.5,-.5);
  const load=P0(); bpart(load,'c','#ffffff',new TH.CylinderGeometry(.26,.17,.13,16),0,.18,0); bpart(load,'c','#e8a020',new TH.SphereGeometry(.1,8,6),.06,.26,.04); bpart(load,'c','#d84a1a',new TH.SphereGeometry(.09,8,6),-.07,.26,-.03);
  const skirt=P0(); bpart(skirt,'c','#ffffff',new TH.CylinderGeometry(.17,.25,.66,14),0,0,0);
  const hips=P0(); bpart(hips,'c','#ffffff',new TH.CylinderGeometry(.16,.15,.2,12),0,0,0,1.12,1,.75);
  const leg=P0(); limb(leg,'c','#ffffff',[0,0,0],[0,-.74,.01],.064); bpart(leg,'c','#262220',new TH.BoxGeometry(.1,.07,.23),0,-.825,-.04);
  const arm=P0(); limb(arm,'c','#ffffff',[0,0,0],[.02,-.46,.02],.043); bpart(arm,'c','#ffffff',new TH.SphereGeometry(.05,8,6),.02,-.5,.02);
  const bike=P0(); [-.52,.52].forEach(z=>{const t=new TH.TorusGeometry(.33,.035,6,20); t.rotateY(Math.PI/2); t.translate(0,.35,z); bike.push(['c',gPrep(t,C3('#141414'))]);
    for(let i=0;i<4;i++){const g=new TH.BoxGeometry(.006,.62,.006); g.rotateX(i/4*Math.PI); g.translate(0,.35,z); bike.push(['c',gPrep(g,C3('#b8bcc2'))]);}});
  [[[0,.35,.52],[0,.62,.05]],[[0,.62,.05],[0,.9,-.4]],[[0,.4,0],[0,.88,.1]],[[0,.4,0],[0,.35,.52]],[[0,.88,.1],[0,.9,-.4]],[[0,.9,-.4],[0,.35,-.52]]].forEach(([a,b])=>limb(bike,'c','#ffffff',a,b,.022));
  bpart(bike,'c','#141414',new TH.BoxGeometry(.12,.05,.24),0,.95,.12); limb(bike,'c','#202020',[-.27,1.02,-.44],[.27,1.02,-.44],.014); limb(bike,'c','#202020',[0,.9,-.4],[0,1.02,-.44],.014);
  bpart(bike,'c','#202020',new TH.BoxGeometry(.3,.02,.06),0,.4,0);
  return LIFEGEO.crowd={torso:M(torso),head:M(head),hair:M(hair),gele:M(gele),load:M(load),skirt:M(skirt),hips:M(hips),leg:M(leg),arm:M(arm),bike:M(bike)};
}
function initCrowd(){
  const th=stage.theme, city=th.scenery.some(s=>['office','haussmann','colonial','tower','craftsman','phhouse'].includes(s));
  const N=(R3.quality==='high'?70:R3.quality==='medium'?50:34)*(city?1:.5)|0, NC=th.naija?(R3.quality==='high'?10:5):4, total=N+NC;
  const G=crowdGeo(), mat=new TH.MeshStandardMaterial({roughness:.75,vertexColors:true});
  const mk=(geo,n)=>{const m=new TH.InstancedMesh(geo,mat,n); m.instanceMatrix.setUsage(TH.DynamicDrawUsage); m.castShadow=true; m.frustumCulled=false; m.userData.shared=true; R3.world.add(m); return m;};
  const C={torso:mk(G.torso,total),head:mk(G.head,total),hair:mk(G.hair,total),gele:mk(G.gele,total),load:mk(G.load,total),skirt:mk(G.skirt,total),hips:mk(G.hips,total),
    legL:mk(G.leg,total),legR:mk(G.leg,total),armL:mk(G.arm,total),armR:mk(G.arm,total),bike:mk(G.bike,Math.max(1,NC))};
  const peds=[], col=h=>new TH.Color(C3(h));
  for(let k=0;k<total;k++){const cyc=k>=N, L=randomLook(Math.random,!cyc&&Math.random()<.5);
    const load=L.female&&th.naija&&Math.random()<.22;
    C.torso.setColorAt(k,col(L.col)); C.head.setColorAt(k,col(L.skin)); C.hair.setColorAt(k,col(L.hair)); C.gele.setColorAt(k,col(L.gele||L.wrap));
    C.load.setColorAt(k,col(pick(Math.random,['#c8ccd2','#2a8ad8','#e8302a','#f0f0f0']))); C.skirt.setColorAt(k,col(L.wrap)); C.hips.setColorAt(k,col(L.pants));
    const lc=col(L.female?L.skin:L.pants); C.legL.setColorAt(k,lc); C.legR.setColorAt(k,lc); C.armL.setColorAt(k,col(L.skin)); C.armR.setColorAt(k,col(L.skin));
    if(cyc) C.bike.setColorAt(k-N,col(pick(Math.random,['#1a1c20','#c8321f','#2f6fb0','#2a8a4a','#e8e8e8'])));
    peds.push({cyc,female:L.female,gele:!!L.gele,load,sc:.9+Math.random()*.16,s:0,side:1,lat:0,dir:1,v:0,ph:Math.random()*6,alive:false,stand:false,crosser:!cyc&&k>=N-2,down:0});}
  Object.values(C).forEach(m=>{if(m.instanceColor) m.instanceColor.needsUpdate=true;});
  // crossing points: some of the zebra crossings, and the odd jaywalking spot on busy Nigerian streets
  const xs=[]; places.forEach(p=>{const sg=segments[p.seg]; if(sg&&!sg.water&&!sg.fly&&!sg.branch&&p.seg>startLine+60) xs.push({seg:p.seg+1.5,zebra:!!th.dual,skip:Math.random()>.4});});
  if(th.naija) for(let i=startLine+900;i<finishIdx-200;i+=1400+Math.floor(Math.random()*900)){const sg=segments[i]; if(sg&&!sg.water&&!sg.fly&&!sg.branch&&!sg.street) xs.push({seg:i+.5,zebra:false,skip:Math.random()>.5});}
  xs.sort((a,b)=>a.seg-b.seg);
  R3.crowd={C,peds,N,NC,city,xs:(city||th.naija)?xs:[],watch:[]};
}
const _m1=TH?new TH.Matrix4():null, _m2=TH?new TH.Matrix4():null, _m3=TH?new TH.Matrix4():null, _q1=TH?new TH.Quaternion():null, _p1=TH?new TH.Vector3():null, _s1=TH?new TH.Vector3(1,1,1):null, _eu=TH?new TH.Euler():null, _hide=TH?new TH.Matrix4().makeScale(0,0,0):null;
function spawnPed(o,pIdx,anywhere){
  const segs=segments, th=stage.theme, dual=!!th.dual, SH=dual?MW+2*HW+1.4:0, city=R3.crowd.city;
  for(let tries=0;tries<12;tries++){
    const i=Math.floor(pIdx+(anywhere?-20+Math.random()*R3.view:R3.view*.55+Math.random()*R3.view*.4));
    const sg=segs[i]; if(!sg||sg.water||sg.fly||sg.branch||i<startLine) continue;
    const side=Math.random()<.5?-1:1; if(sg.street===side) continue;
    o.side=side; o.s=i+Math.random(); o.dir=Math.random()<.5?1:-1; o.hurt=false; o.down=0;
    const base=o.cyc?HW+1.1:city?HW+1.4+Math.random()*2:HW+2+Math.random()*2.5;
    o.lat=side*(base+(side<0?SH:0)); if(CINEMA.on&&cinemaBlocked(o.s,o.lat)) continue; o.v=o.cyc?4+Math.random()*2:(Math.random()<.15?0:1.1+Math.random()*.6); o.stand=o.v===0; o.alive=true; return;}
  o.alive=false;
}
// is a person on the road just ahead of this car? (rivals and traffic stop for them too)
function pedAhead(z,off){
  const cr=R3.crowd; if(!cr||!R3.on||!cr.watch.length) return false; const s=(z/SEG)%segments.length, l=off*HW;
  for(const o of cr.watch){const d=o.s-s; if(d>0&&d<24&&Math.abs(o.lat-l)<2.4) return true;} return false;
}
// the horn: people crossing hurry to the side
function hornCrowd(){const cr=R3.crowd; if(!cr) return; const pS=(position+playerZ)/SEG; for(const o of cr.peds) if(o.alive&&o.cross&&o.s-pS>0&&o.s-pS<120){o.v=Math.max(o.v,2.8);}}
const PARTS=['torso','head','hair','gele','load','skirt','hips','legL','legR','armL','armR'];
function updateCrowd(dt,pIdx){
  const cr=R3.crowd; if(!cr) return; const C=cr.C, city=cr.city;
  const pz=position+playerZ, pS=(pz/SEG)%segments.length, pxm=playerX*HW, racing=mode==='race';
  cr.watch.length=0;
  cr.peds.forEach((o,k)=>{
    if(o.crosser){
      if(o.alive&&(o.s<pIdx-30||o.s>pIdx+R3.view+40)) o.alive=false;
      if(!o.alive&&racing&&!CINEMA.on){const x=cr.xs.find(x=>!x.used&&x.seg-pIdx>60&&x.seg-pIdx<Math.min(R3.view*.9,300));
        if(x){x.used=true; if(!x.skip){const side=Math.random()<.5?-1:1;
          o.alive=true; o.cross=false; o.wait=true; o.down=0; o.hurt=false; o.s=x.seg+(Math.random()-.5)*(x.zebra?1.6:.6); o.v=1.25+Math.random()*.35; o.stand=true;
          o.cdir=-side; o.lat=side*(HW+1.3); o.dir=1;}}}
    } else if(!o.alive||o.s<pIdx-40||o.s>pIdx+R3.view) spawnPed(o,pIdx,!o.alive&&!o.seen);
    o.seen=true;
    const hide=n=>C[n].setMatrixAt(k,_hide);
    if(!o.alive){PARTS.forEach(hide); if(o.cyc) C.bike.setMatrixAt(k-cr.N,_hide); return;}
    // waiting at the kerb: only step out when the player's car is far away (or has passed)
    if(o.wait&&mode!=='intro'){const ahead=o.s-pS, tArr=ahead*SEG/Math.max(speed,MAXSPEED*.03), need=(2*HW+2.6)/o.v+4;
      if(ahead<-4||tArr>need){o.wait=false; o.cross=true; o.stand=false; if(ahead>0&&ahead<R3.view) event('peds');}}
    if(o.down>0){o.down-=dt; if(o.down<=0){o.hurt=true; if(o.cross){o.v=.55;} else {o.v=o.cyc?0:.5; o.stand=o.cyc;}}}
    else if(mode!=='intro'&&!o.wait){
      if(o.cross){o.lat+=o.cdir*o.v*dt; if(o.cdir*o.lat>HW+1.3){o.cross=false; o.v=0; o.stand=true;}}
      else{const ns=o.s+o.dir*o.v*dt/SL; if(CINEMA.on&&cinemaBlocked(ns,o.lat)) o.dir*=-1; else o.s=ns;}}
    if(o.cross||o.down>0) cr.watch.push(o);
    if(racing&&o.down<=0&&!o.hurt&&speed>MAXSPEED*.05){ // the player's car hits this person or cyclist
      const dzm=(o.s-pS)*SL; if(dzm>-2.4&&dzm<2.6&&Math.abs(o.lat-pxm)<1.15){
        const at=poseAt(o.s*SEG,o.lat/HW);
        if(hitRoadUser(o.cyc?'cyclist':'person',at)){o.down=4.5; o.lat+=(o.lat>=pxm?1:-1)*1.8; position=U.increase(position,-SEG*9,trackLength);}}}
    o.ph+=dt*(o.cyc?(o.stand?0:7):o.v*5.2*(o.hurt?.6:1));
    const p=poseAt(o.s*SEG,o.lat/HW), d=Math.abs(o.lat)-(o.lat<-HW-1&&stage.theme.dual?MW+2*HW+1.4:0);
    const gy=p.y+(o.cyc?.04:(Math.abs(o.lat)<HW+.3?0:city&&d<HW+4.1?.16:terrainY(Math.max(0,d))));
    const yaw=(o.cross||o.wait)&&o.down<=0?-p.h+(o.cdir>0?-Math.PI/2:Math.PI/2):-p.h+(o.dir>0?0:Math.PI);
    if(o.down>0){_eu.set(-Math.PI/2,yaw,0,'YXZ'); _p1.set(p.x,gy+.16,p.z);} else {_eu.set(0,yaw,0,'YXZ'); _p1.set(p.x,gy+(o.stand?0:Math.abs(Math.sin(o.ph))*.025),p.z);}
    _q1.setFromEuler(_eu); _s1.setScalar(o.sc); _m1.compose(_p1,_q1,_s1);
    const swing=(o.stand||o.down>0)?0:Math.sin(o.ph)*(o.cyc?.9:.5);
    const part=(n,x,y,z,rx)=>{_m2.makeRotationX(rx||0); _m3.makeTranslation(x,y,z).multiply(_m2); C[n].setMatrixAt(k,_m2.copy(_m1).multiply(_m3));};
    const ride=o.cyc&&o.down<=0, hip=ride?1.0:.86;
    if(ride){part('torso',0,hip+.36,-.07,-.28); part('head',0,hip+.8,-.22,0); part('hair',0,hip+.8,-.22,0);
      part('hips',0,hip+.02,0,0); part('legL',.1,hip,0,-1.25+swing*.55); part('legR',-.1,hip,0,-1.25-swing*.55); part('armL',.21,hip+.5,-.17,-1.05); part('armR',-.21,hip+.5,-.17,-1.05);
      C.bike.setMatrixAt(k-cr.N,_m1);}
    else{
      const sway=o.stand?0:Math.sin(o.ph*2)*.015;
      part('torso',sway,hip+.31,0,0); part('head',sway,hip+.76,0,0);
      if(o.gele) {part('gele',sway,hip+.76,0,0); hide('hair');} else {part('hair',sway,hip+.76,0,0); hide('gele');}
      if(o.load) part('load',sway,hip+.76,0,0); else hide('load');
      if(o.female){part('skirt',0,hip-.26,0,0); hide('hips');} else {part('hips',0,hip,0,0); hide('skirt');}
      part('legL',.085,hip,0,swing); part('legR',-.085,hip,0,-swing);
      part('armL',.22,hip+.45,0,-swing*.8); part('armR',-.22,hip+.45,0,o.load?-2.95:swing*.8);
      if(o.cyc){_eu.set(0,yaw,Math.PI/2,'YXZ'); _q1.setFromEuler(_eu); _p1.set(p.x+Math.cos(p.h)*1.1,gy+.05,p.z+Math.sin(p.h)*1.1); _s1.setScalar(1); C.bike.setMatrixAt(k-cr.N,_m3.compose(_p1,_q1,_s1));}
    }
    if(ride){hide('gele'); hide('load'); hide('skirt');}
  });
  Object.values(C).forEach(m=>m.instanceMatrix.needsUpdate=true);
}
