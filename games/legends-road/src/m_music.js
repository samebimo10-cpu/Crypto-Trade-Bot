/* =====================================================================
   CAR RADIO — original beats synthesised live (no recordings, works
   offline): Afrobeats, Amapiano, Afro-house, Highlife and a heavy 808
   station. A 16-step sequencer with a look-ahead scheduler; every bass
   is a sine sub plus a driven harmonic so it still thumps on phone speakers.
   ===================================================================== */
const MUSIC_STATIONS=[
  {name:'Afro Wave 99.3',genre:'Afrobeats',bpm:104,root:55,prog:[[0,3,7,10],[-4,0,3,7],[3,7,10,14],[-2,2,5,10]],style:'afro'},
  {name:'Lagos Groove 97.1',genre:'Amapiano',bpm:112,root:49,prog:[[0,3,7,10,14],[5,8,12,15],[-2,2,5,9],[3,7,10,14]],style:'piano'},
  {name:'Creek Radio 94.5',genre:'Afro-house',bpm:122,root:52,prog:[[0,3,7],[-4,0,3],[-2,2,5],[-5,-2,2]],style:'house'},
  {name:'Road FM 101.5',genre:'Highlife',bpm:118,root:49,prog:[[0,4,7],[5,9,12],[7,11,14],[0,4,7]],style:'highlife'},
  {name:'Bass FM 88.8',genre:'Afro-trap · 808',bpm:140,root:46,prog:[[0,3,7],[0,3,7],[-4,0,3],[-2,2,5]],style:'trap'}
];
const Music={
  bus:null,drums:null,keys:null,next:0,step:0,bar:0,timer:null,R:null,lastSt:-1,
  cur(){return MUSIC_STATIONS[(save.station||0)%MUSIC_STATIONS.length];},
  label(){const s=this.cur(); return s.name+' · '+s.genre;},
  init(){
    const ac=Sound.ac; if(!ac||this.bus) return !!this.bus;
    const shelf=ac.createBiquadFilter(); shelf.type='lowshelf'; shelf.frequency.value=110; shelf.gain.value=7; // the heavy bass
    const comp=ac.createDynamicsCompressor(); comp.threshold.value=-16; comp.ratio.value=4; comp.attack.value=.004; comp.release.value=.18;
    this.bus=ac.createGain(); this.bus.gain.value=0; this.bus.connect(shelf); shelf.connect(comp); comp.connect(Sound.mus||Sound.master);
    this.drums=ac.createGain(); this.drums.connect(this.bus);
    this.keys=ac.createGain(); this.keys.connect(this.bus); // ducked by every kick (side-chain pump)
    const n=1024, curve=new Float32Array(n); for(let i=0;i<n;i++){const x=i/(n-1)*2-1; curve[i]=Math.tanh(x*2.4);}
    this.drive=curve; return true;
  },
  start(){ if(!this.init()||this.timer) return; this.next=Sound.ac.currentTime+.08; this.step=0; this.bar=0; this.timer=setInterval(()=>this.tick(),25); },
  stop(){ clearInterval(this.timer); this.timer=null; },
  nextStation(d=1){ save.station=((save.station||0)+d+MUSIC_STATIONS.length)%MUSIC_STATIONS.length; persist(); this.step=0; this.bar=0; if(this.timer) this.next=Sound.ac.currentTime+.06; Sound.tone&&Sound.tone(1400,.05,'square',.03); },
  update(){ // called every frame: volume follows the game state
    if(!Sound.ac) return;
    const want=save.music!==false&&!Sound.muted;
    if(want&&!this.timer) this.start(); else if(!want&&this.timer) this.stop();
    if(!this.bus) return;
    const v=!want?0:CINEMA.on?.22:paused?.25:(mode==='race'||mode==='countdown'||mode==='finish')?.95:mode==='intro'?.6:.55;
    this.bus.gain.setTargetAtTime(v,Sound.ac.currentTime,.25);
  },
  tick(){
    const ac=Sound.ac, st=this.cur(), sp=60/st.bpm/4, sw=st.style==='highlife'||st.style==='afro'?.12:0;
    if(this.lastSt!==save.station){this.lastSt=save.station; this.R=rng(7+(save.station||0)*31);}
    while(this.next<ac.currentTime+.15){
      const s=this.step%16, t=this.next+(s%2?sp*sw:0);
      this.play(st,s,this.bar,t,sp);
      this.next+=sp; this.step++; if(this.step%16===0) this.bar++;
    }
  },
  /* ---------- voices ---------- */
  env(g,t,a,peak,d){g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(peak,t+a); g.gain.exponentialRampToValueAtTime(0.0001,t+a+d);},
  osc(type,f,t,dur,out,peak,a=.004,f2,glide){const ac=Sound.ac, o=ac.createOscillator(), g=ac.createGain(); o.type=type; o.frequency.setValueAtTime(f,t);
    if(f2) o.frequency.exponentialRampToValueAtTime(f2,t+(glide||dur*.6)); this.env(g,t,a,peak,dur); o.connect(g); g.connect(out); o.start(t); o.stop(t+a+dur+.05); return o;},
  noise(t,dur,type,freq,q,peak,out){const ac=Sound.ac, s=ac.createBufferSource(), f=ac.createBiquadFilter(), g=ac.createGain(); s.buffer=Sound.noise;
    f.type=type; f.frequency.value=freq; f.Q.value=q||1; this.env(g,t,.002,peak,dur); s.connect(f); f.connect(g); g.connect(out||this.drums); s.start(t,Math.random()*1.5); s.stop(t+dur+.05);},
  kick(t,amt=1){this.osc('sine',160,t,.42,this.drums,1.0*amt,.002,42,.11); this.noise(t,.02,'highpass',2500,1,.25*amt);
    const g=this.keys.gain; g.cancelScheduledValues(t); g.setValueAtTime(.35,t); g.linearRampToValueAtTime(1,t+.22);},
  bass(t,f,dur,peak=.9,glideTo){ // sub sine + driven upper harmonic, so it is felt and heard
    const ac=Sound.ac, ws=ac.createWaveShaper(), lp=ac.createBiquadFilter(), g=ac.createGain(); ws.curve=this.drive; lp.type='lowpass'; lp.frequency.value=900;
    ws.connect(lp); lp.connect(g); g.connect(this.bus); g.gain.value=.35;
    this.osc('sine',f,t,dur,this.bus,peak,.006,glideTo,dur*.5);
    this.osc('sine',f,t,dur,ws,.9,.006,glideTo,dur*.5);},
  logdrum(t,f,peak=.9){ // the Amapiano log drum: a pitched, overdriven thump
    const ac=Sound.ac, ws=ac.createWaveShaper(), lp=ac.createBiquadFilter(), g=ac.createGain(); ws.curve=this.drive; lp.type='lowpass'; lp.frequency.value=1200;
    ws.connect(lp); lp.connect(g); g.connect(this.bus); g.gain.value=.55;
    this.osc('sine',f*1.9,t,.5,ws,1,.003,f,.05); this.osc('sine',f,t,.45,this.bus,peak*.8,.003);},
  clap(t,p=.5){[0,.012,.024].forEach(d=>this.noise(t+d,.07,'bandpass',1500,.8,p));},
  rim(t,p=.35){this.osc('square',1750,t,.03,this.drums,p*.5,.001); this.osc('triangle',420,t,.05,this.drums,p,.001);},
  hat(t,open,p=.18){this.noise(t,open?.22:.04,'highpass',7500,.7,p);},
  shaker(t,acc){this.noise(t,.05,'bandpass',6200,1.2,acc?.13:.06);},
  conga(t,f,p=.45,bend){this.osc('sine',f,t,.22,this.drums,p,.002,bend?f*1.5:f*.9,.08);},
  bell(t,f,p=.12){this.osc('sine',f,t,.35,this.keys,p,.002); this.osc('sine',f*2.76,t,.12,this.keys,p*.35,.002);},
  pluck(t,f,p=.16,dur=.28){const ac=Sound.ac, lp=ac.createBiquadFilter(); lp.type='lowpass'; lp.frequency.setValueAtTime(3200,t); lp.frequency.exponentialRampToValueAtTime(500,t+dur); lp.connect(this.keys);
    this.osc('sawtooth',f,t,dur,lp,p,.003); this.osc('triangle',f*2,t,dur*.6,lp,p*.5,.003);},
  pad(t,fs,dur,p=.05){const ac=Sound.ac, lp=ac.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=1500; lp.connect(this.keys);
    fs.forEach(f=>[-6,6].forEach(c=>{const o=this.osc('sawtooth',f,t,dur,lp,p,.08); o.detune.value=c;}));},
  keysChord(t,fs,dur,p=.07){fs.forEach(f=>{this.osc('triangle',f,t,dur,this.keys,p,.004); this.osc('sine',f*2,t,dur*.5,this.keys,p*.3,.004);});},
  /* ---------- the five stations ---------- */
  play(st,s,bar,t,sp){
    const R=this.R, ch=st.prog[bar%4], hz=n=>st.root*Math.pow(2,n/12), r=hz(ch[0]), fill=bar%8===7&&s>=12;
    const chord=o=>ch.map(n=>hz(n+o));
    switch(st.style){
      case 'afro':{ // Afrobeats: 3-3-2 rim, offbeat claps, rolling 808, plucked chord stabs and a marimba hook
        if(s===0||s===7||s===8||(s===14&&bar%2)) this.kick(t,s===0?1:.8);
        if([0,3,6,10,12].includes(s)) this.rim(t);
        if(s===4||s===12) this.clap(t,.45);
        this.shaker(t,s%2===1); if(s%4===2) this.hat(t,false,.12);
        if(s===0) this.bass(t,r,sp*5); if(s===6) this.bass(t,r*2,sp*2,.6); if(s===10) this.bass(t,r,sp*3,.8,r*1.5); if(s===14) this.bass(t,hz(ch[1]),sp*2,.7);
        if([2,5,9,11,14].includes(s)) chord(24).forEach(f=>this.pluck(t,f,.07,.18));
        if(s%2===0&&R()<.42) this.bell(t,hz(ch[Math.floor(R()*ch.length)]+36),.1);
        if(s===3||s===11) this.conga(t,330,.3,true);
        if(fill) this.conga(t,220+s*12,.35,true);
        break;}
      case 'piano':{ // Amapiano: soft four-on-the-floor, the log drum, shakers and jazzy sustained keys
        if(s%4===0) this.kick(t,.7);
        this.shaker(t,s%4===2); if(s===4||s===12) this.clap(t,.35);
        if(s%8===6) this.hat(t,true,.08);
        const ld={3:0,6:12,7:0,10:7,11:0,14:12}[s]; if(ld!==undefined) this.logdrum(t,r*Math.pow(2,ld/12)*.5,.95);
        if(s===0) this.keysChord(t,chord(12),sp*7,.05); if(s===8&&bar%2) this.keysChord(t,chord(12),sp*6,.04);
        if(s===2&&R()<.6) this.bell(t,hz(ch[2]+36),.07);
        break;}
      case 'house':{ // Afro-house: driving kick, open hats, congas, offbeat bass, wide pads
        if(s%4===0) this.kick(t,1);
        if(s%4===2){this.hat(t,true,.14); this.bass(t,r,sp*1.6,.8);}
        if(s===4||s===12) this.clap(t,.4); this.shaker(t,s%2===1);
        if([3,6,9,13,15].includes(s)) this.conga(t,[260,330,390][s%3],.35,s===13);
        if(s===0) this.pad(t,chord(12),sp*16,.035);
        if(s%4===3&&R()<.5) this.bell(t,hz(ch[1]+24),.08);
        break;}
      case 'highlife':{ // Highlife: bell pattern, walking bass, bright guitar arpeggios
        if(s===0||s===8) this.kick(t,.7); if(s===4||s===12) this.rim(t,.4);
        if([0,2,4,5,7,9,11].includes(s)) this.bell(t,1320,.06);
        this.shaker(t,s%2===1);
        const walk={0:0,6:7,8:12,12:7,14:4}[s]; if(walk!==undefined) this.bass(t,r*Math.pow(2,walk/12),sp*2.2,.75);
        const arp=chord(24); this.pluck(t,arp[s%arp.length]*(s%8>=4?2:1),.09,.2);
        break;}
      case 'trap':{ // Afro-trap: half-time, long gliding 808s, hat rolls
        if(s===0||(s===10&&bar%2===0)||s===11) this.kick(t,1);
        if(s===8) this.clap(t,.55);
        this.hat(t,false,.1); if((s===14||s===15)&&bar%2) {this.hat(t+sp/3,false,.08); this.hat(t+sp*2/3,false,.08);}
        if(s===0) this.bass(t,r,sp*7,1); if(s===10) this.bass(t,r*1.5,sp*5,.9,r);
        if(s===0) this.pad(t,chord(12),sp*16,.03);
        if(s%4===2&&R()<.35) this.bell(t,hz(ch[0]+36),.08);
        break;}
    }
  }
};
