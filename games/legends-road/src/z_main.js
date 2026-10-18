/* ---------- main loop ---------- */
let last=performance.now(), acc=0;
function frame(now){
  const dt=Math.max(0,Math.min(1,(now-last)/1000)); last=now; // CCapture swaps in its own clock while recording
  if(paused) Sound.engine(0,false,false,mode);
  Music.update();
  if(CINEMA.on) cinemaUpdate(dt);
  else if(!paused){acc+=dt; let steps=0; while(acc>=STEP&&steps<5){update(STEP); acc-=STEP; steps++;} if(steps===5) acc=0;}
  if(R3.on){try{render3D(Math.min(dt,.1));}catch(e){console.error(e); setGraphics('2d'); syncToggles(); render();}} else render();
  requestAnimationFrame(frame);
}
function boot(){
  resize(); buildCarArt(); buildPlayerArt(activeCar);
  setGraphics(save.gfx||(matchMedia&&matchMedia('(pointer:coarse)').matches?'low':'high')); syncToggles(); applyBrightness();
  startStage(Math.floor(Math.random()*STAGES.length),true);
  requestAnimationFrame(t=>{last=t; frame(t);});
}
const fontsReady=document.fonts&&document.fonts.ready?Promise.race([document.fonts.ready,new Promise(r=>setTimeout(r,1500))]):Promise.resolve();
fontsReady.then(boot);

/* ---------- offline install (only when served over http/https) ---------- */
/* ---------- let the phone rotate freely (an older install may still carry a landscape lock) ---------- */
function freeRotation(){try{const o=screen.orientation; if(o&&o.lock) o.lock('any').catch(()=>{});}catch(_){}}
freeRotation(); addEventListener('pointerdown',freeRotation,{once:true});
/* ---------- install as an app on a phone ---------- */
const PAGES_URL='https://samebimo10-cpu.github.io/Crypto-Trade-Bot/';
let installEvt=null;
const installed=()=>matchMedia('(display-mode: standalone)').matches||matchMedia('(display-mode: fullscreen)').matches||navigator.standalone===true;
function syncInstall(){const b=$('btnInstall'); if(installed()){b.textContent='Installed ✓'; b.disabled=true;} else if(installEvt) b.textContent='Install app';}
addEventListener('beforeinstallprompt',e=>{e.preventDefault(); installEvt=e; syncInstall();});
addEventListener('appinstalled',()=>{installEvt=null; syncInstall(); showToast('Installed','Legends Road is on your home screen and plays offline.');});
$('btnInstall').addEventListener('click',async()=>{
  const help=$('installHelp'); help.hidden=false;
  if(installEvt){installEvt.prompt(); const r=await installEvt.userChoice.catch(()=>null); installEvt=null; help.hidden=true; if(r&&r.outcome==='accepted') syncInstall(); return;}
  const onPages=location.href.startsWith(PAGES_URL), ios=/iphone|ipad|ipod/i.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  if(!onPages&&!/^https:$/.test(location.protocol)||/claude\.ai|claudeusercontent/.test(location.hostname)) help.textContent='To install, open '+PAGES_URL+' on your phone (tap “Play online”), wait for the title screen, then press Install on phone there.';
  else if(ios) help.textContent='On iPhone or iPad: tap the Share button in Safari, then “Add to Home Screen”. The game then opens from its icon and plays offline.';
  else help.textContent='Open your browser menu (⋮) and choose “Install app” or “Add to Home screen”. The game then opens from its icon and plays offline.';
});
syncInstall();
if('serviceWorker' in navigator && /^https?:$/.test(location.protocol)){
  addEventListener('load',()=>{navigator.serviceWorker.register('sw.js').catch(()=>{});});
}
})();
</script>
</body>
</html>
