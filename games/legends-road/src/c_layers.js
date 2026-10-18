function ridge(R,w,base,amps){
  const ks=[1,2,3,5,7,11,17,23], ph=ks.map(()=>R()*Math.PI*2);
  return x=>{let y=base; ks.forEach((k,i)=>{y-=(amps[i]||0)*Math.sin(x/w*Math.PI*2*k+ph[i]);}); return y;};
}
function buildLayer(spec,th,idx,depth){
  const W2=2048, H2=520, R=rng(300+idx*17+depth*5), fog=th.fog, night=!!th.night;
  return mk(W2,H2,(g,w,h)=>{
    const col=spec.color;
    const fillRidge=(f,c1,c2)=>{g.beginPath(); g.moveTo(0,h); for(let x=0;x<=w;x+=4) g.lineTo(x,f(x)); g.lineTo(w,h); g.closePath(); g.fillStyle=lg(g,0,h*.2,0,h,[[0,c1],[1,c2]]); g.fill();};
    switch(spec.type){
      case 'mountains': {
        const f=ridge(R,w,h*.55,[30,40,25,18,10,6,4,2]); fillRidge(f,col,mix(col,fog,.55)); break; }
      case 'rainier': {
        const f0=ridge(R,w,h*.72,[10,14,12,8,6,4,3,2]);
        const f=x=>{const d=(x-w*.36)/(w*.11); return Math.min(f0(x), h*.92-h*.7*Math.exp(-d*d));};
        fillRidge(f,shade(col,.1),mix(col,fog,.6));
        g.save(); g.beginPath(); g.moveTo(0,h); for(let x=0;x<=w;x+=4) g.lineTo(x,f(x)); g.lineTo(w,h); g.closePath(); g.clip();
        g.fillStyle='rgba(240,244,250,.92)'; g.beginPath(); g.moveTo(w*.2,h*.5); for(let x=w*.2;x<=w*.52;x+=6) g.lineTo(x,h*.42+Math.sin(x*.07)*8+R()*10); g.lineTo(w*.52,0); g.lineTo(w*.2,0); g.fill(); g.restore();
        break; }
      case 'mesas': {
        const f=ridge(R,w,h*.8,[10,8,6,4,3,2,1,1]); fillRidge(f,mix(col,fog,.45),mix(col,fog,.7));
        for(let i=0;i<7;i++){const x=R()*w, mw=w*(.03+R()*.06), mh=h*(.12+R()*.2), y=h*.82;
          const draw=ox=>{g.beginPath(); g.moveTo(x+ox-mw,y); g.quadraticCurveTo(x+ox-mw*.8,y-mh,x+ox-mw*.3,y-mh); g.lineTo(x+ox+mw*.4,y-mh*.95); g.quadraticCurveTo(x+ox+mw*.9,y-mh*.9,x+ox+mw,y); g.fillStyle=lg(g,0,y-mh,0,y,[[0,col],[1,mix(col,fog,.5)]]); g.fill();};
          draw(0); if(x<mw) draw(w); if(x>w-mw) draw(-w);}
        break; }
      case 'dunes': {
        const f=ridge(R,w,h*.82,[14,18,8,5,2,0,0,0]); fillRidge(f,shade(col,.08),mix(col,fog,.35));
        g.strokeStyle=rgba(shade(col,.35),night?.25:.5); g.lineWidth=3; g.beginPath(); for(let x=0;x<=w;x+=4) g.lineTo(x,f(x)+2); g.stroke();
        break; }
      case 'sea': {
        const land=spec.land||shade(col,-.3);
        const f=ridge(R,w,h*.78,[16,20,10,6,3,2,1,0]);
        g.save(); g.beginPath(); g.moveTo(0,h); for(let x=0;x<=w;x+=4){const y=f(x); g.lineTo(x,Math.min(y, h*.86 - (Math.sin(x/w*Math.PI*2*2+1)>.2?h*.06:0)));} g.lineTo(w,h); g.closePath();
        g.fillStyle=lg(g,0,h*.6,0,h*.9,[[0,mix(land,fog,.35)],[1,mix(land,fog,.6)]]); g.fill(); g.restore();
        g.fillStyle=lg(g,0,h*.84,0,h,[[0,mix(col,fog,.25)],[1,shade(col,-.2)]]); g.fillRect(0,h*.84,w,h*.16);
        g.fillStyle=night?'rgba(200,210,255,.25)':'rgba(255,255,255,.4)'; for(let i=0;i<160;i++){const y=h*(.85+R()*.14); g.fillRect(R()*w,y,8+R()*30*(y/h),1.5);}
        break; }
      case 'hills': {
        const f=ridge(R,w,h*.74,[18,22,12,6,3,1,0,0]); fillRidge(f,shade(col,.06),mix(col,fog,.4));
        for(let i=0;i<220;i++){const x=R()*w, y=f(x); g.fillStyle=rgba(shade(col,-.25),.6); ell(g,x,y+4,6+R()*8,5+R()*6); g.fill();}
        break; }
      case 'plains': {
        const f=ridge(R,w,h*.88,[4,5,3,2,1,0,0,0]); fillRidge(f,mix(col,fog,.4),mix(col,fog,.7));
        for(let i=0;i<5;i++){const x=R()*w, y=f(x); g.fillStyle=mix(col,fog,.25); g.fillRect(x,y-h*.14,w*.012,h*.15); g.fillRect(x+w*.014,y-h*.11,w*.01,h*.12); g.fillRect(x-w*.004,y-h*.16,w*.02,h*.02);}
        break; }
      case 'skyline': case 'parisSkyline': {
        const paris=spec.type==='parisSkyline';
        let x=0; const base=h*.94;
        while(x<w){const bw=paris?w*(.012+R()*.02):w*(.012+R()*.03), bh=paris?h*(.08+R()*.08):h*(.12+R()*(spec.dense?.5:.32));
          const c=mix(col,fog,.25+R()*.2);
          g.fillStyle=c; g.fillRect(x,base-bh,bw+1,bh+h*.06);
          if(paris){g.beginPath(); g.moveTo(x-2,base-bh); g.lineTo(x+bw*.2,base-bh-h*.025); g.lineTo(x+bw*.8,base-bh-h*.025); g.lineTo(x+bw+2,base-bh); g.fill();
            if(R()<.07){g.beginPath(); g.arc(x+bw/2,base-bh-h*.02,bw*.7,Math.PI,0); g.fill(); g.fillRect(x+bw/2-1,base-bh-h*.02-bw*.7-h*.03,2,h*.03);}
            if(R()<.05){g.beginPath(); g.moveTo(x+bw*.3,base-bh); g.lineTo(x+bw*.5,base-bh-h*.12); g.lineTo(x+bw*.7,base-bh); g.fill();}}
          else if(R()<.2){g.fillRect(x+bw*.45,base-bh-h*.04,2,h*.04);}
          if(spec.lit) for(let wy=base-bh+6;wy<base;wy+=7) for(let wx=x+3;wx<x+bw-3;wx+=6) if(R()<spec.lit){g.fillStyle=pick(R,['rgba(255,220,150,.85)','rgba(255,240,200,.7)','rgba(180,220,255,.7)']); g.fillRect(wx,wy,3,3);}
          x+=bw+(paris?0:R()*w*.004);}
        g.fillStyle=lg(g,0,h*.7,0,h,[[0,rgba(fog,0)],[1,rgba(fog,.55)]]); g.fillRect(0,h*.7,w,h*.3);
        break; }
    }
  });
}

