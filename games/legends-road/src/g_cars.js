
/* =====================================================================
   VEHICLES — original 3D designs of 13 body types (pickup, off-roader,
   coupe-crossover, fastback, roadster, micro car, van, shuttle pod, SUVs,
   crossover, sedan). Each body is lofted through stations along its
   length: [u along length 0=rear..1=front, bottom y, shoulder y, half-width].
   ===================================================================== */
const VEH = {
  pickup:{L:5.4,W:2.0,R:.42,ax:[.17,.8],k:.55,clad:true,
    body:[[0,.55,1.02,.9],[.04,.5,1.08,.97],[.2,.5,1.1,1],[.55,.5,1.12,1],[.85,.5,1.1,1],[.95,.5,1.02,.98],[1,.55,.88,.9]],
    cab:{u0:.4,u1:.76,top:.84,keys:[[.4,1.12],[.43,1.86],[.65,1.9],[.76,1.12]],roofU:[.44,.65]},bed:[.02,.38]},
  cruiser:{L:4.3,W:1.86,R:.38,ax:[.18,.82],k:.35,clad:true,
    body:[[0,.42,1.0,.93],[.03,.42,1.05,.99],[.5,.42,1.06,1],[.94,.42,1.05,.99],[1,.45,.98,.93]],
    cab:{u0:.05,u1:.8,top:.92,keys:[[.05,1.06],[.08,1.74],[.69,1.76],[.8,1.06]],roofU:[.08,.69]}},
  coupex:{L:4.4,W:1.84,R:.37,ax:[.19,.8],k:1,clad:true,
    body:[[0,.36,.98,.86],[.05,.32,1.02,.95],[.25,.3,1.0,1],[.6,.3,.94,1],[.85,.3,.86,.97],[.96,.32,.78,.9],[1,.38,.68,.8]],
    cab:{u0:.1,u1:.74,top:.72,keys:[[.1,1.0],[.3,1.5],[.52,1.53],[.74,.93]],roofU:[.3,.53]}},
  fastback:{L:4.9,W:1.88,R:.4,ax:[.18,.79],k:1,clad:false,
    body:[[0,.42,1.0,.86],[.05,.38,1.04,.96],[.3,.36,1.02,1],[.6,.36,.98,1],[.88,.38,.9,.96],[1,.44,.72,.82]],
    cab:{u0:.06,u1:.74,top:.74,keys:[[.06,1.03],[.3,1.52],[.55,1.55],[.74,.97]],roofU:[.3,.56]}},
  sports:{L:4.25,W:1.92,R:.34,ax:[.19,.79],k:1,clad:false,
    body:[[0,.22,.86,.88],[.06,.2,.9,.98],[.35,.18,.82,1],[.6,.18,.74,.98],[.85,.18,.62,.95],[1,.22,.5,.85]],
    cab:{u0:.36,u1:.66,top:.62,keys:[[.36,.84],[.44,1.14],[.55,1.15],[.66,.74]],roofU:[.45,.55]}},
  micro:{L:2.5,W:1.32,R:.3,ax:[.16,.84],k:.4,clad:true,
    body:[[0,.3,.85,.95],[.05,.28,.88,1],[.95,.28,.86,1],[1,.3,.8,.95]],
    cab:{u0:.03,u1:.97,top:.93,keys:[[.03,.88],[.06,1.6],[.88,1.62],[.97,.86]],roofU:[.06,.86]}},
  van:{L:4.6,W:1.84,R:.35,ax:[.14,.84],k:.4,clad:true,
    body:[[0,.35,.95,.96],[.03,.33,1.0,1],[.85,.33,1.0,1],[.95,.35,.92,.96],[1,.4,.78,.9]],
    cab:{u0:0,u1:.88,top:.95,keys:[[0,1.0],[.012,2.08],[.74,2.1],[.88,1.0]],roofU:[.012,.73],paintTo:.6}},
  pod:{L:5.2,W:2.06,R:.38,ax:[.12,.88],k:.35,clad:true,
    body:[[0,.3,.6,.96],[.02,.28,.62,1],[.98,.28,.62,1],[1,.3,.6,.96]],
    cab:{u0:0,u1:1,top:.95,keys:[[0,.62],[.025,2.55],[.975,2.55],[1,.62]],roofU:[.03,.97]}},
  suv:{L:4.7,W:1.86,R:.4,ax:[.18,.8],k:.9,clad:true,
    body:[[0,.42,1.04,.88],[.05,.4,1.08,.97],[.4,.4,1.06,1],[.75,.4,1.02,1],[.92,.42,.96,.96],[1,.46,.84,.86]],
    cab:{u0:.07,u1:.78,top:.76,keys:[[.07,1.07],[.22,1.6],[.62,1.64],[.78,1.03]],roofU:[.22,.62]}},
  cross:{L:4.3,W:1.82,R:.38,ax:[.19,.8],k:1,clad:true,
    body:[[0,.38,1.0,.88],[.05,.36,1.04,.97],[.4,.34,1.02,1],[.8,.34,.94,.98],[1,.4,.76,.84]],
    cab:{u0:.09,u1:.75,top:.74,keys:[[.09,1.02],[.27,1.5],[.6,1.53],[.75,.96]],roofU:[.27,.6]}},
  smallsuv:{L:4.2,W:1.8,R:.38,ax:[.18,.81],k:.75,clad:true,
    body:[[0,.4,1.02,.9],[.05,.38,1.06,.98],[.5,.38,1.04,1],[.9,.4,.98,.97],[1,.44,.86,.88]],
    cab:{u0:.06,u1:.78,top:.8,keys:[[.06,1.05],[.16,1.62],[.66,1.64],[.78,1.0]],roofU:[.16,.66]}},
  sedan:{L:4.8,W:1.84,R:.37,ax:[.19,.78],k:1,clad:false,
    body:[[0,.34,.9,.86],[.05,.3,.94,.96],[.3,.28,.92,1],[.7,.28,.88,1],[.9,.3,.8,.95],[1,.36,.66,.82]],
    cab:{u0:.06,u1:.74,top:.72,keys:[[.06,.94],[.26,1.42],[.55,1.45],[.74,.88]],roofU:[.26,.55]}},
  bigsuv:{L:5.05,W:1.96,R:.42,ax:[.17,.8],k:.85,clad:true,
    body:[[0,.44,1.08,.9],[.04,.42,1.12,.98],[.5,.42,1.1,1],[.88,.44,1.04,.98],[1,.48,.9,.88]],
    cab:{u0:.03,u1:.79,top:.82,keys:[[.03,1.12],[.12,1.76],[.68,1.8],[.79,1.07]],roofU:[.12,.68]}}
};
/* Everyday cars: the body types common on Nigerian roads (no makes or badges). */
Object.assign(VEH,{
  saloon:{drop:0.1,L:4.75,W:1.82,R:.33,ax:[.2,.79],k:.95,real:true,grille:'wide',lights:'saloon',
    body:[[0,.36,.95,.86],[.04,.33,.99,.95],[.2,.31,1.0,.99],[.5,.3,.97,1],[.78,.31,.93,.99],[.93,.33,.84,.95],[1,.38,.7,.86]],
    cab:{u0:.17,u1:.76,top:.74,keys:[[.17,1.0],[.3,1.42],[.6,1.44],[.76,.94]],roofU:[.31,.59]},pillars:[[.45,.09,'dark'],[.29,.07,'paint']],doors:[.32,.47,.62]},
  exec:{drop:0.1,L:4.95,W:1.85,R:.34,ax:[.19,.79],k:.9,real:true,grille:'chromeTall',lights:'exec',chrome:true,
    body:[[0,.36,.96,.86],[.04,.33,1.0,.95],[.3,.31,1.0,1],[.7,.31,.97,1],[.93,.33,.9,.97],[1,.38,.82,.9]],
    cab:{u0:.16,u1:.72,top:.74,keys:[[.16,.99],[.29,1.42],[.57,1.44],[.72,.95]],roofU:[.3,.56]},pillars:[[.44,.08,'dark'],[.28,.08,'paint']],doors:[.3,.45,.6]},
  estate:{drop:0.09,L:4.95,W:1.86,R:.35,ax:[.17,.79],k:.8,real:true,grille:'slats',lights:'tall',rails:true,
    body:[[0,.38,1.0,.92],[.03,.35,1.03,.97],[.4,.33,1.0,1],[.78,.33,.96,1],[.93,.35,.88,.96],[1,.4,.76,.88]],
    cab:{u0:.03,u1:.74,top:.82,keys:[[.03,1.02],[.07,1.47],[.6,1.49],[.74,.95]],roofU:[.06,.6]},pillars:[[.44,.08,'dark'],[.2,.09,'paint'],[.05,.05,'paint']],doors:[.29,.44,.6]},
  hatch:{drop:0.09,L:3.95,W:1.72,R:.31,ax:[.16,.8],k:.95,real:true,grille:'wide',lights:'saloon',
    body:[[0,.38,.98,.9],[.04,.35,1.0,.97],[.5,.32,.96,1],[.85,.33,.86,.96],[1,.38,.72,.86]],
    cab:{u0:.05,u1:.74,top:.8,keys:[[.05,1.0],[.12,1.46],[.55,1.48],[.74,.92]],roofU:[.12,.55]},pillars:[[.42,.09,'dark'],[.1,.1,'paint']],doors:[.26,.43,.62]},
  suvmid:{drop:0.04,L:4.85,W:1.9,R:.38,ax:[.18,.8],k:.85,real:true,grille:'chromeWide',lights:'saloon',clad:true,rails:true,
    body:[[0,.44,1.06,.9],[.04,.41,1.1,.97],[.5,.4,1.08,1],[.86,.42,1.02,.98],[1,.46,.9,.88]],
    cab:{u0:.06,u1:.76,top:.8,keys:[[.06,1.08],[.16,1.62],[.62,1.66],[.76,1.04]],roofU:[.16,.62]},pillars:[[.44,.08,'dark'],[.2,.1,'paint']],doors:[.28,.45,.62]},
  offroad:{L:4.95,W:1.98,R:.41,ax:[.17,.8],k:.45,real:true,grille:'chromeWide',lights:'square',clad:true,rails:true,
    body:[[0,.48,1.08,.95],[.03,.46,1.12,.99],[.5,.46,1.12,1],[.95,.46,1.1,.99],[1,.5,1.0,.95]],
    cab:{u0:.04,u1:.74,top:.9,keys:[[.04,1.12],[.07,1.86],[.66,1.88],[.74,1.12]],roofU:[.07,.66]},pillars:[[.44,.08,'dark'],[.2,.09,'paint'],[.06,.05,'paint']],doors:[.28,.45,.62]},
  hilux:{L:5.3,W:1.86,R:.38,ax:[.17,.8],k:.7,real:true,grille:'chromeWide',lights:'saloon',clad:true,
    body:[[0,.5,1.0,.92],[.04,.47,1.04,.97],[.5,.46,1.06,1],[.88,.47,1.04,.98],[1,.5,.92,.9]],
    cab:{u0:.36,u1:.75,top:.84,keys:[[.36,1.06],[.39,1.76],[.66,1.8],[.75,1.06]],roofU:[.39,.66]},pillars:[[.53,.06,'dark']],doors:[.4,.53,.66],bed:[.02,.35]},
  minivan:{drop:0.07,L:5.1,W:1.98,R:.36,ax:[.15,.8],k:.8,real:true,grille:'wide',lights:'tall',
    body:[[0,.4,1.0,.92],[.03,.37,1.03,.98],[.5,.36,1.02,1],[.86,.37,.95,.98],[1,.42,.8,.88]],
    cab:{u0:.02,u1:.8,top:.86,keys:[[.02,1.03],[.05,1.74],[.6,1.78],[.8,.98]],roofU:[.05,.6]},pillars:[[.5,.07,'dark'],[.27,.06,'dark'],[.06,.05,'paint']],doors:[.29,.5,.66]},
  bus:{L:7,W:2.05,R:.42,ax:[.15,.75],k:.45,real:true,grille:'wide',lights:'square',
    body:[[0,.45,1.05,.97],[.02,.43,1.08,1],[.98,.43,1.08,1],[1,.45,1.0,.97]],
    cab:{u0:.01,u1:.99,top:.95,keys:[[.01,1.08],[.02,2.6],[.95,2.62],[.99,1.08]],roofU:[.02,.95]},pillars:[[.16,.03,'paint'],[.3,.03,'paint'],[.44,.03,'paint'],[.58,.03,'paint'],[.72,.03,'paint'],[.86,.03,'paint']],doors:[]}
});
const ROOFCOL={black:'#0e1013',white:'#f2f3f5'};
function kInterp(keys,u,idx){
  if(u<=keys[0][0]) return keys[0][idx]; const n=keys.length; if(u>=keys[n-1][0]) return keys[n-1][idx];
  for(let k=0;k<n-1;k++){const a=keys[k],b=keys[k+1]; if(u<=b[0]){const t=(u-a[0])/(b[0]-a[0]), s=t*t*(3-2*t); return a[idx]+(b[idx]-a[idx])*s;}}
  return keys[n-1][idx];
}
function stationsU(u0,u1,n){const out=[]; for(let i=0;i<n;i++){const t=i/(n-1); out.push(u0+(u1-u0)*(.5-.5*Math.cos(Math.PI*t)));} return out;}
/* Builds a lofted surface. ringFn(u) returns the right half of a section as [z,y] from bottom to top centre; it is mirrored to the left. */
function loftGeo(V,us,ringFn,closed,caps){
  const rings=us.map(u=>{const r=ringFn(u), full=r.slice(); for(let j=r.length-2;j>=0;j--) full.push([-r[j][0],r[j][1]]); if(!closed) {} return full;});
  const m=rings[0].length, pos=[], idx=[];
  rings.forEach((r,i)=>{const x=us[i]*V.L; r.forEach(([z,y])=>pos.push(x,y,z));});
  for(let i=0;i<rings.length-1;i++) for(let j=0;j<m-1;j++){const a=i*m+j,b=(i+1)*m+j; idx.push(a,b,a+1, b,b+1,a+1);}
  const g=new TH.BufferGeometry(); g.setAttribute('position',new TH.Float32BufferAttribute(pos,3)); g.setIndex(idx); g.computeVertexNormals();
  const parts=[gPrep(g)];
  if(caps){[0,rings.length-1].forEach(i=>{const r=rings[i], x=us[i]*V.L; let cy=0; r.forEach(p=>cy+=p[1]); cy/=r.length;
    const cp=[], ci=[]; cp.push(x,cy,0); r.forEach(([z,y])=>cp.push(x,y,z)); for(let j=1;j<r.length;j++) ci.push(0,j,j+1);
    const cg=new TH.BufferGeometry(); cg.setAttribute('position',new TH.Float32BufferAttribute(cp,3)); cg.setIndex(ci); cg.computeVertexNormals(); parts.push(gPrep(cg));});}
  return parts;
}
const VEHGEO={};
function vehicleGeometry(id){
  if(VEHGEO[id]) return VEHGEO[id];
  const V=VEH[id], drop=V.drop||0, hw=u=>kInterp(V.body,u,3)*V.W/2, yB=u=>kInterp(V.body,u,1)-drop, yS=u=>kInterp(V.body,u,2), K=V.k, C=V.cab;
  const parts={paint:[],glass:[],roof:[],dark:[],chrome:[],red:[],white:[],liner:[]};
  // wheel arches: the body's lower edge rises in a circle over each wheel, so the tyres show like a real car's
  const Ra=V.R*1.2, archY=u=>{let y=-1; for(const a of V.ax){const dx=(u-a)*V.L; if(Math.abs(dx)<Ra) y=Math.max(y,V.R+Math.sqrt(Ra*Ra-dx*dx));} return y;};
  const bodyU=V.real?[...new Set([...stationsU(0,1,34),...V.ax.flatMap(a=>Array.from({length:17},(_,i)=>a+(i/16-.5)*2.2*Ra/V.L))].filter(u=>u>=0&&u<=1).map(u=>+u.toFixed(5)))].sort((a,b)=>a-b):stationsU(0,1,30);
  // lower body
  parts.paint.push(...loftGeo(V,bodyU,u=>{const w=hw(u), s=yS(u), b=V.real?Math.min(s-.16,Math.max(yB(u),archY(u))):yB(u), H=s-b;
    return [[0,b],[w*.82,b],[w*.97,b+.06],[w,b+H*.35],[w,b+H*.7],[w*(1-.025*K),s-.1*K-.02],[w*(1-.09*K),s-.02],[w*.6,s+.012],[0,s+.025]];},false,true));
  // cabin: glass greenhouse (vans keep painted panels behind the doors)
  const yR=u=>kInterp(C.keys,u,1);
  const cabRing=u=>{const w=hw(u), hb=w*.94, ht=w*C.top, b=yS(u)-.01, r=Math.max(yR(u),b+.02);
    return [[hb,b],[hb-(hb-ht)*.55,b+(r-b)*.55],[ht,r-.05],[ht*.7,r],[0,r+.015]];};
  if(C.paintTo){parts.paint.push(...loftGeo(V,stationsU(C.u0,C.paintTo,10),cabRing,false,true)); parts.glass.push(...loftGeo(V,stationsU(C.paintTo,C.u1,12),cabRing,false,true));}
  else parts.glass.push(...loftGeo(V,stationsU(C.u0,C.u1,22),cabRing,false,true));
  // roof panel
  parts.roof.push(...loftGeo(V,stationsU(C.roofU[0],C.roofU[1],12),u=>{const ht=hw(u)*C.top, r=yR(u); return [[ht*1.012,r-.06],[ht*.72,r+.01],[0,r+.026]];},false,true));
  const L=V.L;
  // lights, grille, bumpers, mirrors
  const box=(k,w,h,d,x,y,z)=>{const g=new TH.BoxGeometry(w,h,d); g.translate(x,y,z); parts[k].push(gPrep(g));};
  const uf=.995, ur=.005;
  if(!V.real){
  box('white',.05,.045,hw(uf)*1.7,L*uf+.01,yS(uf)-.09,0);
  [-1,1].forEach(s=>box('white',.05,.09,.32,L*uf,yS(uf)-.16,s*hw(uf)*.66));
  box('red',.05,.06,hw(ur)*1.8,L*ur-.012,yS(ur)-.12,0);
  box('dark',.08,.22,hw(uf)*1.35,L-.02,yB(1)+.16,0);
  } else {
    // headlights and tail lights as separate lamps at the corners
    const hl=V.lights==='square'?[.08,.2,.3]:V.lights==='exec'?[.06,.11,.42]:[.06,.12,.4];
    [-1,1].forEach(s=>{const y=yS(uf)-.14, z=s*hw(uf)*.66; // lamp: dark housing, clear lens, two projector lamps
      box('dark',hl[0],hl[1]+.03,hl[2]+.03,L*uf-.012,y,z); box('white',hl[0]*.6,hl[1]*.28,hl[2]*.92,L*uf+.008,y+hl[1]*.36,z);
      [-.22,.22].forEach(o=>{const c=new TH.CylinderGeometry(Math.min(hl[1]*.36,.05),Math.min(hl[1]*.36,.05),.03,14); c.rotateZ(Math.PI/2); c.translate(L*uf+.006,y-hl[1]*.08,z+o*hl[2]); parts.white.push(gPrep(c));});
      box('chrome',.03,hl[1]+.05,hl[2]+.05,L*uf-.02,y,z);});
    if(V.lights==='tall') [-1,1].forEach(s=>box('red',.06,.5,.12,L*ur-.02,yS(ur)-.12,s*hw(ur)*.88));
    else [-1,1].forEach(s=>box('red',.06,.14,.44,L*ur-.02,yS(ur)-.1,s*hw(ur)*.68));
    const gy=yS(uf)-.26, gw=hw(uf);
    if(V.grille==='chromeTall'){box('chrome',.05,.36,gw*.6,L-.005,gy+.02,0); box('dark',.06,.3,gw*.52,L,gy+.02,0); box('chrome',.065,.3,.02,L+.003,gy+.02,0);}
    else if(V.grille==='slats'){box('dark',.05,.26,gw*.9,L-.005,gy,0); for(let k=-4;k<=4;k++) box('chrome',.06,.24,.025,L,gy,k*gw*.1); box('chrome',.065,.28,gw*.92,L-.01,gy,0);}
    else if(V.grille==='chromeWide'){box('chrome',.05,.34,gw*1.3,L-.005,gy,0); box('dark',.06,.28,gw*1.22,L,gy,0); [-1,0,1].forEach(k=>box('chrome',.065,.03,gw*1.22,L+.002,gy+k*.08,0));}
    else box('dark',.05,.2,gw*1.1,L-.005,gy,0);
    box('dark',.08,.16,hw(uf)*1.2,L-.02,yB(1)+.14,0);
    // doors: shut lines and handles
    (V.doors||[]).forEach(u=>[-1,1].forEach(s=>box('dark',.012,(yS(u)-yB(u))*.62,.012,L*u,yB(u)+(yS(u)-yB(u))*.5,s*(hw(u)+.004))));
    (V.doors||[]).slice(0,-1).forEach((u,i)=>[-1,1].forEach(s=>box('chrome',.14,.03,.03,L*(u+((V.doors[i+1]||u)-u)*.75),yS(u)-.14,s*(hw(u)+.01))));
    // window pillars over the glass
    (V.pillars||[]).forEach(([u,w,c])=>[-1,1].forEach(s=>{const yb=yS(u), yr=kInterp(C.keys,u,1), hb=hw(u)*.94, ht=hw(u)*C.top;
      const pg=new TH.BufferGeometry(), x0=L*(u-w/2), x1=L*(u+w/2), o=1.015;
      pg.setAttribute('position',new TH.Float32BufferAttribute([x0,yb,s*hb*o, x1,yb,s*hb*o, x1,yr-.04,s*ht*o, x0,yb,s*hb*o, x1,yr-.04,s*ht*o, x0,yr-.04,s*ht*o],3)); pg.computeVertexNormals();
      parts[c==='paint'?'paint':'dark'].push(gPrep(pg));}));
    if(V.chrome) [-1,1].forEach(s=>box('chrome',L*(C.u1-C.u0)*.92,.025,.02,L*(C.u0+C.u1)/2,yS((C.u0+C.u1)/2)+.005,s*hw(.5)*.95));
    if(V.rails) [-1,1].forEach(s=>{const u=(C.roofU[0]+C.roofU[1])/2; box('dark',L*(C.roofU[1]-C.roofU[0])*.95,.05,.05,L*u,kInterp(C.keys,u,1)+.06,s*hw(u)*C.top*.85);});
  }
  box('dark',.08,.16,hw(0)*1.6,.0,yB(0)+.12,0);
  box('white',.03,.12,.42,-.03,yB(0)+.33,0);
  [-1,1].forEach(s=>{const u=C.u1-.03; box('paint',.18,.1,.22,L*u,yS(u)+.1,s*(hw(u)*.96+.12)); box('glass',.04,.07,.18,L*u-.09,yS(u)+.1,s*(hw(u)*.96+.12));});
  // side skirts and wheel-arch cladding on crossovers, SUVs and trucks
  const arch=(x,s)=>{const t=new TH.TorusGeometry(Ra,.07,6,18,Math.PI); t.translate(x,V.R,s*(hw(x/L)*1.0)); parts.dark.push(gPrep(t));};
  V.ax.forEach(a=>[-1,1].forEach(s=>{ if(V.clad) arch(a*L,s);
    if(V.real){const tub=new TH.CylinderGeometry(Ra*.98,Ra*.98,.42,18,1,true,Math.PI/2,Math.PI); tub.rotateX(Math.PI/2); tub.translate(a*L,V.R,s*(hw(a)-.2)); parts.liner.push(gPrep(tub));}}));
  if(V.real&&!V.clad&&id!=='bus'){ // rear bumper detail: wrap-around lamps, diffuser, exhausts
    [-1,1].forEach(s=>{box('red',.2,.1,.03,L*.02+.1,yS(.02)-.1,s*(hw(.02)+.004)); box('dark',.03,.06,.1,.005,yB(0)+.1,s*hw(0)*.82);});
    [-1,1].forEach(s=>{const e=new TH.CylinderGeometry(.04,.04,.14,12); e.rotateZ(Math.PI/2); e.translate(-.03,yB(0)+.06,s*hw(0)*.5); parts.chrome.push(gPrep(e));});}
  if(V.clad) [-1,1].forEach(s=>box('dark',L*(V.ax[1]-V.ax[0])-V.R*2.3,.12,.06,L*(V.ax[0]+V.ax[1])/2,yB(.5)+.08,s*hw(.5)*1.0));
  if(V.bed){[-1,1].forEach(s=>box('dark',L*(V.bed[1]-V.bed[0]),.05,.08,L*(V.bed[0]+V.bed[1])/2,yS(.2)+.04,s*hw(.2)*.94)); box('dark',.06,.05,hw(.2)*1.9,L*V.bed[1],yS(.2)+.04,0);}
  if(id==='sports'){[-1,1].forEach(s=>box('dark',.5,.18,.12,L*.42,yS(.42)+.08,s*hw(.42)*.62));}
  const out={L,W:V.W,R:V.R,ax:V.ax.map(a=>a*L),hwAx:V.ax.map(a=>hw(a))};
  for(const k in parts){ if(!parts[k].length) continue; const g=gMerge(parts[k]); parts[k].forEach(p=>p.dispose()); g.translate(-L/2,0,0); g.rotateY(Math.PI/2); out[k]=g; }
  return VEHGEO[id]=out;
}
const VWHEEL={};
function vehWheel(R){
  const key=R.toFixed(2); if(VWHEEL[key]) return VWHEEL[key];
  const w=R*.72, tire=new TH.CylinderGeometry(R,R,w,26); tire.rotateZ(Math.PI/2);
  const side=new TH.TorusGeometry(R*.86,R*.14,8,26); side.rotateY(Math.PI/2);
  const s1=side.clone(); s1.translate(w*.38,0,0); side.translate(-w*.38,0,0);
  const rim=new TH.CylinderGeometry(R*.64,R*.64,w*.9,22); rim.rotateZ(Math.PI/2);
  const spokes=[]; for(let i=0;i<5;i++){const b=new TH.BoxGeometry(w*.2,R*1.1,R*.13); b.rotateX(i/5*Math.PI*2); b.translate(w*.47,0,0); spokes.push(gPrep(b));}
  const hub=new TH.CylinderGeometry(R*.14,R*.14,w*.98,10); hub.rotateZ(Math.PI/2);
  return VWHEEL[key]={tire:gMerge([gPrep(tire),gPrep(side),gPrep(s1)]),rim:gPrep(rim),spokes:gMerge([...spokes,gPrep(hub)])};
}
function vehicleModel(o){
  const V=VEH[o.model], geo=vehicleGeometry(o.model), mats=carMats(o.color||'#9aa0a8',o.accent,o.finish||'gloss',o.tint||'none');
  if(!mats.roofB){mats.roofB=new TH.MeshPhysicalMaterial({color:C3(ROOFCOL.black),metalness:.4,roughness:.25,clearcoat:1,clearcoatRoughness:.05,side:TH.DoubleSide});
    mats.roofW=new TH.MeshPhysicalMaterial({color:C3(ROOFCOL.white),metalness:.3,roughness:.3,clearcoat:1,side:TH.DoubleSide});
    mats.paint.side=TH.DoubleSide; mats.glass.side=TH.DoubleSide;}
  const G=new TH.Group(), body=new TH.Group(); G.add(body);
  for(const k of ['paint','glass','roof','dark','chrome','red','white','liner']) if(geo[k]){
    const mat=k==='roof'?(o.roof==='black'?mats.roofB:o.roof==='white'?mats.roofW:mats.paint):mats[k];
    const m=new TH.Mesh(geo[k],mat); m.castShadow=k==='paint'||k==='glass'||k==='roof'; body.add(m);}
  const wg=vehWheel(V.R), wheels=[], tm=wheelGeo();
  if(!mats.rimDark) mats.rimDark=new TH.MeshStandardMaterial({color:C3('#2a2d33'),metalness:.8,roughness:.35});
  geo.ax.forEach((ax,i)=>[-1,1].forEach(s=>{
    const w=new TH.Group(), t=new TH.Mesh(wg.tire,tm.tireM); t.castShadow=true;
    const rim=new TH.Mesh(wg.rim,mats.rimDark), sp=new TH.Mesh(wg.spokes,rimMat(o.rim)||tm.rimM);
    if(s<0){rim.scale.x=-1; sp.scale.x=-1;}
    w.add(t,rim,sp); w.position.set(s*(geo.hwAx[i]-V.R*.3),V.R,-(ax-geo.L/2)); G.add(w); wheels.push({w,front:i===1});}));
  const ordered=wheels.filter(x=>x.front).map(x=>x.w).concat(wheels.filter(x=>!x.front).map(x=>x.w));
  const sh=new TH.Mesh(new TH.PlaneGeometry(geo.W*1.5,geo.L*1.25),new TH.MeshBasicMaterial({map:shadowTex(),transparent:true,depthWrite:false,opacity:.85}));
  sh.rotation.x=-Math.PI/2; sh.position.y=.03; sh.renderOrder=1; G.add(sh);
  G.userData={wheels:ordered,body,L:geo.L};
  if(o.damage) addDamage(G,body,o.damage,geo);
  return G;
}

/* ---------- garage options: wheel colour and staged damage ---------- */
const RIMMAT={};
function rimMat(k){ if(!k||k==='silver') return null;
  return RIMMAT[k]||(RIMMAT[k]=new TH.MeshStandardMaterial(k==='gold'?{color:C3('#c9a243'),metalness:1,roughness:.22}:{color:C3('#1b1c20'),metalness:.7,roughness:.3}));}
let SCUFF=null, CRACK=null;
function addDamage(G,body,lvl,geo){ // decals projected onto the body by ray casts, so they sit on any body shape
  if(!SCUFF){const c=mk(128,64,(g,w,h)=>{const R=rng(7); for(let i=0;i<26;i++){const x=w*(.1+R()*.8), y=h*(.2+R()*.6), l=10+R()*40;
      g.strokeStyle=`rgba(${R()<.5?'230,230,225':'40,40,40'},${.35+R()*.45})`; g.lineWidth=.8+R()*1.8; g.beginPath(); g.moveTo(x,y); g.lineTo(x+l,y+(R()-.5)*8); g.stroke();}
      const gr=g.createRadialGradient(w/2,h/2,2,w/2,h/2,w*.4); gr.addColorStop(0,'rgba(20,20,20,.45)'); gr.addColorStop(1,'rgba(20,20,20,0)'); g.fillStyle=gr; g.fillRect(0,0,w,h);});
    SCUFF=new TH.MeshStandardMaterial({map:canvasTex(c,true,false),transparent:true,depthWrite:false,roughness:.9,polygonOffset:true,polygonOffsetFactor:-4,polygonOffsetUnits:-4});
    CRACK=new TH.MeshStandardMaterial({color:C3('#9a9a92'),emissive:C3('#fff6e0'),emissiveIntensity:.25,roughness:.7});}
  G.updateMatrixWorld(true);
  const paint=body.children.filter(m=>m.isMesh&&m.material===body.children[0].material), ray=new TH.Raycaster(), L=geo.L;
  const spots=[[1,.32,.55],[-1,-.3,.5],[1,-.38,.45],[-1,.36,.6],[1,0,.6],[-1,.05,.42]].slice(0,lvl*2);
  spots.forEach(([s,f,yf])=>{const y=.25+yf*1.1, z=f*L; ray.set(new TH.Vector3(s*4,y,z),new TH.Vector3(-s,0,0));
    const hit=ray.intersectObjects(paint,false)[0]; if(!hit||!hit.face) return;
    const n=hit.face.normal.clone().transformDirection(hit.object.matrixWorld), m=new TH.Mesh(new TH.PlaneGeometry(.7,.34),SCUFF);
    m.position.copy(hit.point).addScaledVector(n,.012); m.lookAt(hit.point.clone().add(n)); m.rotation.z+=(f*3)%1-.5; body.add(m);});
  if(lvl>=2) body.children.forEach(m=>{if(m.isMesh&&m.material&&m.material.emissive&&m.material.emissive.r>.9&&m.material.emissive.b>.8&&m.material.emissiveIntensity>1){m.material=CRACK;}}); // cracked, dim headlights
}

/* ---------- studio renders for the garage ---------- */
const STUDIO={};
function studio(){
  if(STUDIO.r!==undefined) return STUDIO.r?STUDIO:null;
  try{
    const c=document.createElement('canvas');
    const r=new TH.WebGLRenderer({canvas:c,antialias:true,preserveDrawingBuffer:true});
    r.outputEncoding=TH.sRGBEncoding; r.toneMapping=TH.ACESFilmicToneMapping; r.toneMappingExposure=1.05;
    r.shadowMap.enabled=true; r.shadowMap.type=TH.PCFSoftShadowMap;
    const sc=new TH.Scene(); sc.background=C3('#4a4d52');
    const env=new TH.Scene(); env.add(new TH.Mesh(new TH.SphereGeometry(50,24,12),new TH.MeshBasicMaterial({color:C3('#55585e'),side:TH.BackSide})));
    [[0,30,0,40,40],[30,12,-10,20,30],[-30,14,10,20,30]].forEach(([x,y,z,w,h])=>{const p=new TH.Mesh(new TH.PlaneGeometry(w,h),new TH.MeshBasicMaterial({color:0xffffff,side:TH.DoubleSide})); p.position.set(x,y,z); p.lookAt(0,0,0); env.add(p);});
    const pm=new TH.PMREMGenerator(r); sc.environment=pm.fromScene(env,.04).texture;
    const floor=new TH.Mesh(new TH.PlaneGeometry(200,200),new TH.MeshStandardMaterial({color:C3('#3f4247'),roughness:.2,metalness:.25}));
    floor.rotation.x=-Math.PI/2; floor.receiveShadow=true; sc.add(floor);
    const wall=new TH.Mesh(new TH.PlaneGeometry(200,60),new TH.MeshStandardMaterial({color:C3('#4b4e54'),roughness:.8}));
    wall.position.set(0,30,-26); sc.add(wall);
    sc.add(new TH.HemisphereLight(0xffffff,0x3a3c40,.7));
    const sun=new TH.DirectionalLight(0xffffff,2.2); sun.position.set(-12,22,14); sun.castShadow=true; sun.shadow.mapSize.set(2048,2048);
    const s=sun.shadow.camera; s.left=-30; s.right=30; s.top=30; s.bottom=-30; s.far=80; sun.shadow.bias=-.0004; sc.add(sun);
    Object.assign(STUDIO,{r,c,sc,cam:new TH.PerspectiveCamera(30,16/9,.1,300)});
    return STUDIO;
  }catch(e){STUDIO.r=null; return null;}
}
function studioShot(cars,w,h,camPos,look){
  const S=studio(); if(!S) return null;
  const group=new TH.Group(); cars.forEach(([m,x,z,yaw])=>{m.position.set(x,0,z); m.rotation.y=yaw; group.add(m);}); S.sc.add(group);
  S.r.setPixelRatio(1); S.r.setSize(w,h,false); S.cam.aspect=w/h; S.cam.position.set(...camPos); S.cam.lookAt(...look); S.cam.updateProjectionMatrix();
  S.r.render(S.sc,S.cam); S.sc.remove(group);
  const out=document.createElement('canvas'); out.width=w; out.height=h; out.getContext('2d').drawImage(S.c,0,0); return out;
}
function carPreview(c){
  const key='pv_'+c.id; if(STUDIO[key]) return STUDIO[key];
  const m=vehicleModel({model:c.id,color:c.color,roof:c.roof});
  const V=VEH[c.id], d=Math.max(6.4,V.L*1.55)+(V.cab.keys[1][1]>2?2:0);
  return STUDIO[key]=studioShot([[m,0,0,Math.PI-.5]],560,315,[d*.5,1.55+d*.08,d*.86],[0,.72,0]);
}
function lineupShot(){
  if(STUDIO.lineup) return STUDIO.lineup;
  // arranged like a manufacturer line-up photo: utility vehicles at the back, cars at the front
  const back=[['bus',-12.5,-9.4,.35],['offroad',-6.8,-7,.2],['hilux',-1.6,-6.2,0],['minivan',3.6,-6.4,-.1],['suvmid',8.6,-7,-.2],['estate',13.4,-8.6,-.3]];
  const front=[['hatch',-9.6,1.6,.32],['saloon',-3.4,2.8,.15],['exec',3,2.8,-.15],['coupex',9.4,1.6,-.32]];
  const cars=back.concat(front).map(([id,x,z,yaw])=>{const c=CARS.find(k=>k.id===id)||{color:'#e8eaee',roof:'body'}; return [vehicleModel({model:id,color:c.color,roof:c.roof}),x,z,Math.PI-(x/15)*.75];});
  return STUDIO.lineup=studioShot(cars,1280,620,[0,8.5,23],[0,.4,-3.4]);
}
