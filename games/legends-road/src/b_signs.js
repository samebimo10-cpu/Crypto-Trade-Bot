function billboard(title,sub,colA,colB){
  return mk(800,480,(g,w,h)=>{
    g.fillStyle='#2a2a2e'; g.fillRect(w*.18,h*.55,w*.04,h*.45); g.fillRect(w*.78,h*.55,w*.04,h*.45);
    g.fillStyle=lg(g,0,0,w,h*.6,[[0,colA],[1,colB]]); rr(g,w*.02,h*.02,w*.96,h*.58,8); g.fill();
    g.strokeStyle='rgba(255,255,255,.7)'; g.lineWidth=4; rr(g,w*.04,h*.05,w*.92,h*.52,6); g.stroke();
    g.fillStyle='#fff8ea'; g.textAlign='center'; g.textBaseline='middle';
    let fs=h*.2; g.font=`900 ${fs}px ${FD}`; while(g.measureText(title).width>w*.86&&fs>10){fs-=2; g.font=`900 ${fs}px ${FD}`;}
    g.fillText(title,w/2,h*.24);
    let ss=h*.075; g.font=`italic 400 ${ss}px ${FB}`; while(g.measureText(sub).width>w*.86&&ss>8){ss-=1; g.font=`italic 400 ${ss}px ${FB}`;}
    g.fillText(sub,w/2,h*.44);
  });
}
function banner(text,colA){
  return mk(1400,620,(g,w,h)=>{
    const pw=w*.035;
    [0,w-pw].forEach(x=>{g.fillStyle=lg(g,x,0,x+pw,0,[[0,'#2a2c32'],[.5,'#6a6e78'],[1,'#2a2c32']]); g.fillRect(x,0,pw,h);});
    g.fillStyle=colA; g.fillRect(pw,h*.04,w-pw*2,h*.2);
    const cs=h*.04; for(let x=pw;x<w-pw;x+=cs) for(let r=0;r<2;r++){g.fillStyle=((x/cs|0)+r)%2?'#111':'#f4f4f4'; g.fillRect(x,h*.24+r*cs,cs,cs);}
    g.fillStyle='#fff8ea'; g.font=`900 ${h*.13}px ${FD}`; g.textAlign='center'; g.textBaseline='middle'; g.fillText(text,w/2,h*.145);
  });
}
const coinImg = mk(128,128,(g,w,h)=>{
  const gr=g.createRadialGradient(w*.38,h*.35,4,w/2,h/2,w*.5); gr.addColorStop(0,'#fff6c8'); gr.addColorStop(.45,'#f1c24e'); gr.addColorStop(1,'#a8721a');
  g.fillStyle=gr; ell(g,w/2,h/2,w*.46,h*.46); g.fill();
  g.strokeStyle='rgba(120,80,10,.6)'; g.lineWidth=5; ell(g,w/2,h/2,w*.36,h*.36); g.stroke();
  g.fillStyle='#8a5a10'; g.font=`900 ${h*.48}px ${FD}`; g.textAlign='center'; g.textBaseline='middle'; g.fillText('$',w/2,h*.53);
});
const nitroImg = mk(110,170,(g,w,h)=>{
  const gr=g.createRadialGradient(w/2,h/2,4,w/2,h/2,w*.9); gr.addColorStop(0,'rgba(110,210,255,.55)'); gr.addColorStop(1,'rgba(110,210,255,0)'); g.fillStyle=gr; g.fillRect(0,0,w,h);
  g.fillStyle=lg(g,w*.2,0,w*.8,0,[[0,'#1a5fa8'],[.45,'#6fd0ff'],[1,'#1a4a88']]); rr(g,w*.22,h*.2,w*.56,h*.72,14); g.fill();
  g.fillStyle='#c8d0d8'; g.fillRect(w*.38,h*.08,w*.24,h*.14);
  g.fillStyle='#fff'; poly(g,[w*.55,h*.32,w*.36,h*.58,w*.5,h*.58,w*.44,h*.8,w*.64,h*.5,w*.5,h*.5]);
});
const cloudImg = mk(512,200,(g,w,h)=>{
  const R=rng(42);
  for(let i=0;i<26;i++){const x=w*(.15+R()*.7), y=h*(.45+R()*.25), r=w*(.06+R()*.09);
    const gr=g.createRadialGradient(x,y-r*.3,r*.1,x,y,r); gr.addColorStop(0,'rgba(255,255,255,.85)'); gr.addColorStop(1,'rgba(255,255,255,0)');
    g.fillStyle=gr; g.fillRect(x-r,y-r,r*2,r*2);}
});

