
/* ---------- extra art for the Nigerian episodes and shortcuts ---------- */
Object.assign(ART, {
  kiosk(g,w,h,o){const R=o.r, col=pick(R,['#2f6fb0','#c8321f','#2a8a4a','#e0a82a','#7a4a9a']);
    g.fillStyle=col; g.fillRect(w*.05,h*.2,w*.9,h*.78); g.strokeStyle='rgba(0,0,0,.25)'; g.lineWidth=2; for(let x=w*.05;x<w*.95;x+=8){g.beginPath(); g.moveTo(x,h*.2); g.lineTo(x,h*.98); g.stroke();}
    g.fillStyle='#1a1c20'; g.fillRect(w*.2,h*.42,w*.6,h*.56); g.fillStyle='#e8d090'; for(let y=h*.5;y<h*.92;y+=h*.12) g.fillRect(w*.22,y,w*.56,h*.03);
    g.fillStyle=shade(col,-.2); poly(g,[w*.02,h*.42,w*.98,h*.42,w*.9,h*.3,w*.1,h*.3]);
    g.fillStyle='#fff'; g.font=`900 ${h*.1}px ${FD}`; g.textAlign='center'; g.fillText(pick(R,['PROVISIONS','RECHARGE CARD','POS · TRANSFER','BUKA']),w/2,h*.27);},
  stall(g,w,h,o){const R=o.r, cols=pick(R,[['#e8322a','#f4f4f4'],['#2f6fb0','#f4c21b'],['#2a8a4a','#f4f4f4']]);
    for(let i=0;i<8;i++){g.fillStyle=cols[i%2]; g.beginPath(); g.moveTo(w/2,h*.08); g.arc(w/2,h*.34,w*.48,Math.PI+i*Math.PI/8,Math.PI+(i+1)*Math.PI/8); g.closePath(); g.fill();}
    g.fillStyle='#3a3a3a'; g.fillRect(w*.485,h*.3,w*.03,h*.7); g.fillStyle='#8a6a4a'; g.fillRect(w*.15,h*.68,w*.7,h*.08);
    for(let i=0;i<6;i++){g.fillStyle=pick(R,['#e8a020','#c83a22','#5aa03a','#f0d050']); ell(g,w*(.22+i*.11),h*.66,w*.05,w*.05); g.fill();}
    g.fillStyle='#5a3a2a'; ell(g,w*.8,h*.52,w*.06,w*.06); g.fill(); g.fillStyle=pick(R,['#2f6fb0','#c8321f','#7a4a9a']); g.fillRect(w*.75,h*.58,w*.1,h*.2);},
  compound(g,w,h,o){const R=o.r;
    g.fillStyle=pick(R,['#b8442e','#6e4a34','#2f5f9e']); poly(g,[w*.15,h*.32,w*.5,h*.06,w*.85,h*.32]);
    g.fillStyle=pick(R,['#f0e6d0','#e8d8c0','#d8e8d8']); g.fillRect(w*.2,h*.3,w*.6,h*.3);
    g.fillStyle='#e8e0cc'; g.fillRect(0,h*.55,w,h*.45); g.fillStyle='rgba(0,0,0,.12)'; g.fillRect(0,h*.55,w,h*.04);
    g.fillStyle='#1f4a2a'; g.fillRect(w*.38,h*.6,w*.24,h*.4); g.strokeStyle='#e8c25a'; g.lineWidth=3; g.strokeRect(w*.38,h*.6,w*.24,h*.4); g.beginPath(); g.moveTo(w*.5,h*.6); g.lineTo(w*.5,h); g.stroke();},
  frame(g,w,h){g.fillStyle='#9a9690';
    for(let f=0;f<3;f++){g.fillRect(w*.05,h*(.95-f*.3),w*.9,h*.05); [.08,.36,.64,.9].forEach(x=>g.fillRect(w*x-6,h*(.66-f*.3),12,h*.3));}
    g.strokeStyle='#5a3a2a'; g.lineWidth=2; [.08,.36,.64,.9].forEach(x=>{g.beginPath(); g.moveTo(w*x,h*.06); g.lineTo(w*x,h*0); g.stroke();});
    g.fillStyle='#b8b4ac'; g.fillRect(w*.1,h*.7,w*.25,h*.25);},
  fuel(g,w,h,o){g.fillStyle='#2a5aa8'; g.fillRect(w*.05,h*.1,w*.75,h*.12); g.fillStyle='#e8e8e8'; g.fillRect(w*.05,h*.22,w*.75,h*.04);
    [.12,.42,.72].forEach(x=>{g.fillStyle='#d8d8d8'; g.fillRect(w*x,h*.26,w*.04,h*.74); g.fillStyle='#e83a2a'; g.fillRect(w*x+w*.06,h*.6,w*.08,h*.4);});
    g.fillStyle='#e8e8e8'; g.fillRect(w*.86,h*.05,w*.1,h*.5); g.fillStyle='#2a5aa8'; g.fillRect(w*.87,h*.07,w*.08,h*.2); g.fillStyle='#1a1c20'; g.fillRect(w*.9,h*.55,w*.02,h*.45);
    g.fillStyle='#fff'; g.font=`900 ${h*.08}px ${FD}`; g.textAlign='center'; g.fillText('FUEL',w*.42,h*.19);},
  derrick(g,w,h){g.strokeStyle='#6a6e74'; g.lineWidth=6; g.beginPath(); g.moveTo(w*.15,h); g.lineTo(w*.45,h*.05); g.lineTo(w*.55,h*.05); g.lineTo(w*.85,h); g.stroke();
    g.lineWidth=3; for(let y=.12;y<1;y+=.1){const a=.15+(1-y)*.0+(y)*.0, xl=w*(.45-.3*y), xr=w*(.55+.3*y); g.beginPath(); g.moveTo(xl,h*y); g.lineTo(xr,h*y); g.moveTo(xl,h*y); g.lineTo(w*(.55+.3*(y+.1)),h*(y+.1)); g.stroke();}
    g.fillStyle='#c8321f'; g.fillRect(w*.42,h*.02,w*.16,h*.04); g.fillStyle='#4a4e54'; g.fillRect(w*.05,h*.92,w*.9,h*.08);},
  nigerBridge(g,w,h){g.fillStyle='#6a7078'; g.fillRect(0,h*.62,w,h*.08); g.strokeStyle='#5a6068'; g.lineWidth=7;
    for(let k=0;k<4;k++){const x0=k*w/4, x1=(k+1)*w/4; g.beginPath(); g.moveTo(x0,h*.62); g.quadraticCurveTo((x0+x1)/2,h*.1,x1,h*.62); g.stroke();
      g.lineWidth=3; for(let i=1;i<8;i++){const x=x0+(x1-x0)*i/8, t=i/8, y=h*.62-(h*.52)*4*t*(1-t); g.beginPath(); g.moveTo(x,h*.62); g.lineTo(x,y); g.stroke();} g.lineWidth=7;}
    g.fillStyle='#8a8e92'; for(let k=0;k<=4;k++) g.fillRect(k*w/4-10,h*.7,20,h*.3);},
  office(g,w,h,o){
    const R=o.r, top=h*(.04+R()*.12), tint=pick(R,[['#4f7fae','#a9c9e2','#3f6690'],['#3f6f80','#9fd0d6','#2f5a68'],['#6a7f9a','#c9d6e6','#506682']]);
    g.fillStyle=lg(g,w*.1,0,w*.9,0,[[0,tint[2]],[.55,tint[1]],[1,tint[0]]]); g.fillRect(w*.1,top,w*.8,h-top);
    g.save(); g.beginPath(); g.rect(w*.1,top,w*.8,h-top); g.clip();
    g.fillStyle='rgba(255,255,255,.18)'; poly(g,[w*.1,top+h*.5,w*.9,top+h*.05,w*.9,top+h*.2,w*.1,top+h*.65]);
    g.restore();
    g.strokeStyle='rgba(20,30,45,.35)'; g.lineWidth=2;
    for(let x=w*.1;x<=w*.9;x+=w*.08){g.beginPath(); g.moveTo(x,top); g.lineTo(x,h); g.stroke();}
    for(let y=top;y<h;y+=h*.028){g.beginPath(); g.moveTo(w*.1,y); g.lineTo(w*.9,y); g.stroke();}
    g.fillStyle='#d8dde4'; g.fillRect(w*.08,top-h*.012,w*.84,h*.014);
    g.fillStyle='#2a3240'; g.fillRect(w*.1,h*.94,w*.8,h*.06);
    if(R()<.5){g.fillStyle='#ff4a4a'; ell(g,w*.5,top-h*.02,4,4); g.fill(); g.fillStyle='#8890a0'; g.fillRect(w*.495,top-h*.02,w*.01,h*.02);}
  },
  rail(g,w,h){
    g.fillStyle=lg(g,0,0,0,h,[[0,'#d6d6d0'],[1,'#8e8e88']]); poly(g,[w*.04,h,w*.14,h*.35,w*.86,h*.35,w*.96,h]);
    g.fillStyle='#b8b8b0'; g.fillRect(w*.12,h*.3,w*.76,h*.08);
    g.fillStyle='#f2c21b'; for(let x=w*.1;x<w*.9;x+=w*.2) g.fillRect(x,h*.55,w*.08,h*.12);
  },
  linkBridge(g,w,h){
    const deckY=h*.82;
    g.strokeStyle='rgba(235,240,245,.9)'; g.lineWidth=2;
    for(let i=1;i<=14;i++){const yTop=h*.06+i*h*.03;
      g.beginPath(); g.moveTo(w*.5,yTop); g.lineTo(w*.5-i*w*.033,deckY); g.stroke();
      g.beginPath(); g.moveTo(w*.5,yTop); g.lineTo(w*.5+i*w*.033,deckY); g.stroke();}
    g.fillStyle=lg(g,w*.46,0,w*.54,0,[[0,'#c8ccd2'],[.5,'#ffffff'],[1,'#b8bcc4']]);
    poly(g,[w*.47,deckY+h*.1,w*.485,h*.02,w*.515,h*.02,w*.53,deckY+h*.1]);
    g.fillStyle='#e8ecf0'; g.fillRect(0,deckY,w,h*.05);
    g.fillStyle='#9aa2ae'; g.fillRect(0,deckY+h*.05,w,h*.015);
    g.fillStyle='#b0b6c0'; [.12,.32,.68,.88].forEach(x=>g.fillRect(w*x-w*.012,deckY+h*.06,w*.024,h*.12));
    g.fillStyle='#ffe9a8'; for(let x=w*.03;x<w;x+=w*.06){ell(g,x,deckY-3,2.5,2.5); g.fill();}
    g.fillStyle='#ff4a4a'; ell(g,w*.5,h*.02,4,4); g.fill();
  },
  portCranes(g,w,h){
    const R=rng(21), q=h*.86;
    g.fillStyle='#5a5e66'; g.fillRect(0,q,w,h-q);
    const cols=['#c8321f','#2a64c8','#e8b04b','#2d9a5a','#e7e7ea','#8a3fd0','#d86a1f'];
    for(let i=0;i<34;i++){const cw=w*.06, ch=h*.045, x=w*.02+(i%14)*cw*1.05, y=q-(Math.floor(i/14)+1)*ch;
      g.fillStyle=pick(R,cols); g.fillRect(x,y,cw,ch-2); g.strokeStyle='rgba(0,0,0,.25)'; g.lineWidth=1;
      for(let k=1;k<6;k++){g.beginPath(); g.moveTo(x+cw*k/6,y); g.lineTo(x+cw*k/6,y+ch-2); g.stroke();}}
    [[.3,1],[.72,.92]].forEach(([cx,s])=>{
      const legW=w*.16*s, top=h*(1-.78*s), boomY=top+h*.06;
      g.strokeStyle='#c8321f'; g.lineWidth=w*.012;
      g.beginPath(); g.moveTo(w*cx-legW/2,q); g.lineTo(w*cx-legW/2,boomY); g.moveTo(w*cx+legW/2,q); g.lineTo(w*cx+legW/2,boomY);
      g.moveTo(w*cx-legW/2,q-h*.25); g.lineTo(w*cx+legW/2,q-h*.25); g.moveTo(w*cx-legW/2,q-h*.25); g.lineTo(w*cx+legW/2,boomY); g.stroke();
      g.fillStyle='#e8ecf0'; g.fillRect(w*cx-legW*1.4,boomY-h*.02,legW*3.2,h*.03);
      g.strokeStyle='#e8ecf0'; g.lineWidth=w*.006; g.beginPath(); g.moveTo(w*cx,top); g.lineTo(w*cx-legW*1.4,boomY-h*.02); g.moveTo(w*cx,top); g.lineTo(w*cx+legW*1.8,boomY-h*.02); g.stroke();
      g.fillStyle='#c8321f'; g.fillRect(w*cx-w*.02,top,w*.04,boomY-top);
      g.fillStyle='#2a3240'; g.fillRect(w*cx+legW*.8,boomY,w*.04,h*.04);
      g.strokeStyle='#2a3240'; g.lineWidth=2; g.beginPath(); g.moveTo(w*cx+legW*.82,boomY+h*.04); g.lineTo(w*cx+legW*.82,boomY+h*.2); g.stroke();
    });
  }
});

function drawCar(g,w,h,o){
  const col=o.col, turn=o.turn||0, kind=o.kind, style=o.style||'coupe', acc=o.accent||'#ffffff';
  g.fillStyle='rgba(0,0,0,.42)'; ell(g,w/2,h*.93,w*.48,h*.07); g.fill();
  if(kind==='truck'||kind==='danfo'){
    g.fillStyle='#111'; rr(g,w*.08,h*.76,w*.16,h*.2,6); g.fill(); rr(g,w*.76,h*.76,w*.16,h*.2,6); g.fill();
    if(kind==='danfo'){
      g.fillStyle=lg(g,0,0,w,0,[[0,'#d9a80f'],[.5,'#f6c61d'],[1,'#d9a80f']]); rr(g,w*.06,h*.08,w*.88,h*.72,14); g.fill();
      g.fillStyle='#16181c'; g.fillRect(w*.06,h*.46,w*.88,h*.035); g.fillRect(w*.06,h*.53,w*.88,h*.035);
      g.fillStyle=lg(g,0,h*.12,0,h*.38,[[0,'#3c4c62'],[1,'#121822']]); rr(g,w*.14,h*.13,w*.72,h*.26,6); g.fill();
      g.fillStyle='rgba(255,255,255,.15)'; poly(g,[w*.2,h*.39,w*.36,h*.13,w*.44,h*.13,w*.28,h*.39]);
      g.fillStyle='#16181c'; g.font=`900 ${h*.055}px ${FD}`; g.textAlign='center'; g.textBaseline='middle'; g.fillText(o.slogan||'NO FOOD FOR LAZY MAN',w/2,h*.64);
      g.fillStyle='#222'; g.fillRect(w*.04,h*.76,w*.92,h*.06);
      g.shadowColor='#ff2a1a'; g.shadowBlur=12; g.fillStyle='#ff3a2a'; g.fillRect(w*.08,h*.68,w*.08,h*.07); g.fillRect(w*.84,h*.68,w*.08,h*.07); g.shadowBlur=0;
      return;
    }
    g.fillStyle=lg(g,0,0,w,0,[[0,shade(col,-.3)],[.5,col],[1,shade(col,-.2)]]); rr(g,w*.06,h*.02,w*.88,h*.78,6); g.fill();
    g.strokeStyle='rgba(0,0,0,.35)'; g.lineWidth=3; g.beginPath(); g.moveTo(w/2,h*.06); g.lineTo(w/2,h*.76); g.stroke();
    g.fillStyle='rgba(0,0,0,.25)'; g.fillRect(w*.06,h*.3,w*.88,h*.06);
    g.fillStyle='#222'; g.fillRect(w*.04,h*.78,w*.92,h*.06);
    g.fillStyle='#ff3a2a'; g.shadowColor='#ff2a1a'; g.shadowBlur=12; g.fillRect(w*.08,h*.66,w*.08,h*.08); g.fillRect(w*.84,h*.66,w*.08,h*.08); g.shadowBlur=0;
    return;
  }
  const sh=turn*w*.035;
  const bodyTop = style==='rally'?h*.40 : style==='gt'?h*.46 : h*.42;
  const roofY = style==='rally'?h*.07 : style==='gt'?h*.2 : style==='muscle'?h*.15 : h*.13;
  const wide = style==='muscle'||style==='gt'?.015:0;
  // tyres
  g.fillStyle='#0d0d0f'; rr(g,w*(.05-wide)-(turn<0?w*.01:0),h*.62,w*.17,h*.3,8); g.fill(); rr(g,w*(.78+wide)+(turn>0?w*.01:0),h*.62,w*.17,h*.3,8); g.fill();
  if(style==='rally'){g.fillStyle=acc; g.fillRect(w*.06,h*.86,w*.14,h*.06); g.fillRect(w*.8,h*.86,w*.14,h*.06);}
  // body
  g.beginPath(); g.moveTo(w*(.04-wide),h*.82); g.lineTo(w*(.03-wide),h*.56); g.quadraticCurveTo(w*.05,bodyTop+h*.02,w*.16,bodyTop); g.lineTo(w*.84,bodyTop);
  g.quadraticCurveTo(w*.95,bodyTop+h*.02,w*(.97+wide),h*.56); g.lineTo(w*(.96+wide),h*.82); g.closePath();
  g.fillStyle=lg(g,0,bodyTop,0,h*.84,[[0,shade(col,.3)],[.35,col],[1,shade(col,-.5)]]); g.fill();
  if(style==='roadster'){
    g.fillStyle='#14161a'; rr(g,w*.2,h*.36,w*.6,h*.08,6); g.fill();
    [.33,.67].forEach(x=>{g.fillStyle=shade(col,-.35); rr(g,w*x-w*.07,h*.18,w*.14,h*.2,14); g.fill(); g.fillStyle='rgba(255,255,255,.18)'; rr(g,w*x-w*.05,h*.2,w*.03,h*.12,6); g.fill();});
    g.strokeStyle='rgba(200,220,240,.55)'; g.lineWidth=4; g.beginPath(); g.moveTo(w*.22,h*.36); g.lineTo(w*.28,h*.22); g.lineTo(w*.72,h*.22); g.lineTo(w*.78,h*.36); g.stroke();
  } else {
    g.beginPath(); g.moveTo(w*.17+sh,bodyTop+h*.02); g.lineTo(w*.27+sh*1.4,roofY+h*.01); g.quadraticCurveTo(w*.5+sh*1.4,roofY-h*.03,w*.73+sh*1.4,roofY+h*.01); g.lineTo(w*.83+sh,bodyTop+h*.02); g.closePath();
    g.fillStyle=shade(col,-.15); g.fill();
    g.beginPath(); g.moveTo(w*.22+sh,bodyTop); g.lineTo(w*.3+sh*1.4,roofY+h*.05); g.lineTo(w*.7+sh*1.4,roofY+h*.05); g.lineTo(w*.78+sh,bodyTop); g.closePath();
    g.fillStyle=lg(g,0,roofY,0,bodyTop,[[0,'#3c4c62'],[1,'#121822']]); g.fill();
    g.save(); g.clip(); g.fillStyle='rgba(255,255,255,.16)'; poly(g,[w*.3,bodyTop,w*.45,roofY,w*.52,roofY,w*.37,bodyTop]); g.restore();
    if(style==='rally'){g.fillStyle='#16181c'; rr(g,w*.3+sh*1.4,roofY-h*.06,w*.4,h*.05,4); g.fill(); g.fillStyle='#fff6d0'; for(let i=0;i<4;i++){ell(g,w*(.35+i*.1)+sh*1.4,roofY-h*.035,w*.025,w*.025); g.fill();}}
  }
  if(style==='muscle'){g.fillStyle=acc; g.fillRect(w*.43,bodyTop,w*.05,h*.82-bodyTop); g.fillRect(w*.52,bodyTop,w*.05,h*.82-bodyTop);}
  if(style==='rally'){g.fillStyle=acc; g.fillRect(w*.04,h*.6,w*.92,h*.03);}
  // wings
  if(style==='gt'){g.fillStyle='#14161a'; rr(g,w*.02,h*.26,w*.96,h*.06,4); g.fill(); g.fillRect(w*.22,h*.31,w*.035,h*.14); g.fillRect(w*.745,h*.31,w*.035,h*.14);}
  else if(kind==='player'&&style==='coupe'){g.fillStyle='#14161a'; rr(g,w*.08,h*.38,w*.84,h*.05,4); g.fill(); g.fillRect(w*.24,h*.42,w*.03,h*.06); g.fillRect(w*.73,h*.42,w*.03,h*.06);}
  // taillights
  g.shadowColor='#ff2a1a'; g.shadowBlur=14; g.fillStyle='#ff3a2a';
  rr(g,w*.07,h*.5,w*.22,h*.07,4); g.fill(); rr(g,w*.71,h*.5,w*.22,h*.07,4); g.fill();
  g.fillStyle='rgba(255,90,70,.7)'; g.fillRect(w*.29,h*.525,w*.42,h*.02); g.shadowBlur=0;
  g.fillStyle='#fff1e8'; g.fillRect(w*.1,h*.52,w*.06,h*.025); g.fillRect(w*.84,h*.52,w*.06,h*.025);
  // diffuser, exhausts, plate
  g.fillStyle='#16181c'; rr(g,w*.12,h*.7,w*.76,h*.12,4); g.fill();
  g.fillStyle='#55585e';
  const ex=style==='muscle'?[.2,.28,.72,.8]:[.26,.74]; ex.forEach(x=>{ell(g,w*x,h*.77,w*.03,h*.03); g.fill();});
  g.fillStyle='#f2efe6'; rr(g,w*.38,h*.6,w*.24,h*.08,2); g.fill();
  g.fillStyle='#22252a'; g.font=`800 ${h*.055}px ${FD}`; g.textAlign='center'; g.textBaseline='middle'; g.fillText(o.plate||'RACE',w/2,h*.642);
  g.strokeStyle='rgba(255,255,255,.25)'; g.lineWidth=2; g.beginPath(); g.moveTo(w*.06,bodyTop+h*.06); g.lineTo(w*.94,bodyTop+h*.06); g.stroke();
}
function shortcutSign(name,side){
  return mk(800,560,(g,w,h)=>{
    g.fillStyle='#2a2a2e'; g.fillRect(w*.18,h*.6,w*.04,h*.4); g.fillRect(w*.78,h*.6,w*.04,h*.4);
    g.fillStyle='#1f6e3a'; rr(g,w*.02,h*.02,w*.96,h*.62,10); g.fill();
    g.strokeStyle='#fff'; g.lineWidth=6; rr(g,w*.04,h*.05,w*.92,h*.56,8); g.stroke();
    g.fillStyle='#fff'; g.save(); g.translate(side>0?w*.84:w*.16,h*.34); g.scale(side>0?1:-1,1);
    poly(g,[-w*.06,h*.08,-w*.06,-h*.04,-w*.1,-h*.04,0,-h*.18,w*.1,-h*.04,w*.06,-h*.04,w*.06,h*.08]); g.restore();
    g.textAlign='center'; g.textBaseline='middle';
    g.font=`900 ${h*.2}px ${FD}`; g.fillText('SHORTCUT',w/2,h*.22);
    let fs=h*.11; g.font=`800 ${fs}px ${FD}`; while(g.measureText(name).width>w*.62&&fs>10){fs-=2; g.font=`800 ${fs}px ${FD}`;}
    g.fillText(name.toUpperCase(),w/2,h*.45);
  });
}
