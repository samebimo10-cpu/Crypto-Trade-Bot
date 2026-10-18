/* =====================================================================
   CAREER — race objectives, rival driving styles, story choices with
   later consequences, the results screen, the garage workshop (live
   orbit preview, cosmetics, upgrades, repairs), the volume mix, city
   ambience and accessibility settings.
   Currency is only ever charged when the player confirms, and each
   charge is guarded so a double tap cannot charge twice.
   ===================================================================== */
const PLACE_BONUS=[15,10,6,3,0,0], OBJ_BONUS=10, REPAIR_STAGE=6;
/* One objective per episode. Meeting it pays a bonus; missing it never blocks the next episode. */
const OBJECTIVES=[
  {type:'tokens'},             // Lagos
  {type:'duel',team:'okafor'}, // Port Harcourt: the Okafors' home ground
  {type:'clean'},              // Yenagoa
  {type:'duel',team:'okafor'}, // Asaba: depends on the roadside choice
  {type:'time'},               // Kano
  {type:'top3'},               // A Coruña
  {type:'duel',team:'laurent'},// Paris
  {type:'tokens'},             // Mumbai
  {type:'clean'},              // Hong Kong
  {type:'time'},               // Omaha
  {type:'duel',team:'sharma'}, // Seattle
  {type:'win'}                 // Starbase
];
const DRIVE_STYLE={okafor:'aggressive',laurent:'starter',chen:'steady',muller:'steady',sharma:'closer'};
const STYLE_NAME={aggressive:'aggressive, weaves to block',starter:'fast starter',steady:'steady pace',closer:'late surge',friendly:'friendly, gives way'};
/* Story choices: shown once, before the episode they belong to. */
const CHOICES={
  2:{id:'okafor_help',eyebrow:'On the East–West Road · before Yenagoa',title:'The Okafors have broken down',
    text:'Smoke pours from the Okafors’ bonnet on the hard shoulder. Chidi waves you down: the alternator has died, and the nearest part is in your boot. Ada looks away. Yesterday they called you “the garage kids”.',
    a:{label:'Stop and help',cost:10,note:'Give them the part: −$10M. The Okafors will remember.'},
    b:{label:'Keep driving',cost:0,note:'It is a race. Keep your money and your lead.'}},
  4:{id:'press',eyebrow:'Asaba · the night before Kano',title:'A reporter wants your story',
    text:'Funmi Bello from the Harbour Ledger, a fictional city paper, asks for an interview about Adeyemi Motors. It pays a small fee and the whole country will read it. It also means a late night before the long road north.',
    a:{label:'Give the interview',cost:0,note:'+$5M fee now and more reputation. New customers may follow.'},
    b:{label:'Decline and rest',cost:0,note:'Sleep instead: start the Kano race with a bigger nitro tank.'}}
};
const CUSTOM={
  paint:[{id:'',label:'Factory'},{id:'#c81e24',label:'Lagos red',price:6},{id:'#1d4f9a',label:'Lagoon blue',price:6},{id:'#1f6b45',label:'Delta green',price:6},
    {id:'#e8b04b',label:'Trail gold',price:6},{id:'#f2f2ee',label:'Pearl white',price:6},{id:'#16181c',label:'Midnight black',price:6},{id:'#6d3fa0',label:'Ankara purple',price:6}],
  finish:[{id:'gloss',label:'Factory gloss'},{id:'metallic',label:'Metallic flake',price:8},{id:'matte',label:'Satin matte',price:10}],
  rim:[{id:'silver',label:'Silver'},{id:'black',label:'Gloss black',price:4},{id:'gold',label:'Gold',price:6}],
  tint:[{id:'none',label:'Factory glass'},{id:'light',label:'Light tint',price:3},{id:'dark',label:'Limo tint',price:4}]
};
const CUSTOM_LABEL={paint:'Paint colour',finish:'Finish',rim:'Wheels',tint:'Window tint'};
const UPGRADES=[
  {k:'top',name:'Engine tune',stat:'top speed',step:.02},
  {k:'acc',name:'Turbo and gearing',stat:'acceleration',step:.04},
  {k:'grip',name:'Tyres and suspension',stat:'grip in bends',step:.04},
  {k:'nitro',name:'Nitro tank',stat:'nitro duration',step:.06}
];
const UPG_PRICE=[12,22,36];

const career={hits:0,hardHits:0,settled:false,obj:null,par:0,tokens:0,last:null};
function carCustom(id){return Object.assign({paint:'',finish:'gloss',rim:'silver',tint:'none'},(save.custom||{})[id]||{});}
function effectiveCar(c){
  const u=(save.upg||{})[c.id]||{}, cu=carCustom(c.id), dmg=(save.damage||{})[c.id]||0;
  const e=Object.assign({},c,{top:c.top*(1+.02*(u.top||0)),acc:c.acc*(1+.04*(u.acc||0)),grip:c.grip*(1+.04*(u.grip||0)),nitro:c.nitro*(1+.06*(u.nitro||0)),
    color:cu.paint||c.color,finish:cu.finish,rim:cu.rim,tint:cu.tint,damage:dmg});
  e.look=[c.id,e.color,e.finish,e.rim,e.tint,dmg].join('|');
  return e;
}
function rivalStyleName(id){
  const st=DRIVE_STYLE[id]; let s=st;
  if(id==='okafor'&&save.flags&&save.flags.okafor_help===true&&save.unlocked>3) s='friendly';
  return STYLE_NAME[s]||'';
}

/* ---------- race start: objective, rival styles, consequences of earlier choices ---------- */
function careerStart(idx){
  Object.assign(career,{hits:0,hardHits:0,settled:false,last:null});
  save.flags=save.flags||{}; save.rel=save.rel||{}; const F=save.flags;
  // rival identities
  for(const r of rivals){r.style=DRIVE_STYLE[r.team.id]||'steady'; r.weaveT=1+Math.random()*2;}
  const ok=rivals.find(r=>r.team.id==='okafor'), lines=[];
  if(ok&&idx>=3&&F.okafor_help===true){ok.style='friendly';
    if(idx===3) lines.push(['Chidi','Adeyemis! You stopped for us on the East–West Road. We don’t forget.'],['Ada','We paid back the part, with interest. And we won’t block you today.']);}
  if(ok&&idx>=3&&F.okafor_help===false){ok.style='aggressive'; if(idx===3){ok.base*=1.03; lines.push(['Ada','Remember the East–West Road, Adeyemis? You drove straight past us.'],['Chidi','Today we drive straight through you.']);}}
  if(F.okafor_help===true&&!F.okafor_paid&&idx>=3){F.okafor_paid=true; save.bank+=15; persist(); setTimeout(()=>showToast('The Okafors paid you back','+$15M for the alternator, with interest. Added to your bank.'),400);}
  if(F.press===true&&!F.press_paid&&idx>=5){F.press_paid=true; save.bank+=8; persist(); lines.push(['Tobi','Kemi, three new customers called the garage. They read the Harbour Ledger interview!']);
    setTimeout(()=>showToast('New customers','Readers of your interview booked the garage: +$8M added to your bank.'),400);}
  if(F.press===false&&idx===4){nitroCap=Math.max(nitroCap,1.3); lines.push(['Kemi','Best night’s sleep all season. I feel sharp.']);}
  lines.forEach(([w,t])=>{const d=Math.max(2.3,t.length*.055); say(w,t,d); introDur+=d;});
  // objective for this episode
  const o=OBJECTIVES[idx]||{type:'top3'}; career.obj=Object.assign({},o);
  if(o.type==='tokens'){let n=0; for(const s of segments) for(const c of s.coins) if(!c.nitro) n++; career.obj.target=Math.max(5,Math.round(n*.4));}
  if(o.type==='time'){const fast=Math.max(...rivals.map(r=>r.base)); career.obj.target=Math.ceil((finishZ-(position+playerZ))/fast*1.04);}
  if(o.type==='duel'){const t=TEAMS.find(t=>t.id===o.team); career.obj.name=t?t.name:o.team;}
  showToast('Objective · '+objTitle(),objDesc()+' Bonus: $'+OBJ_BONUS+'M. Not needed to unlock the next episode.');
  if(touchMode&&innerHeight>innerWidth&&!save.tipLand){save.tipLand=true; persist();
    setTimeout(()=>{if(mode==='intro'||mode==='countdown'||mode==='race') showToast('Tip','Turn your phone sideways for a wider view of the road. Portrait works too.');},6500);}
}
function objTitle(){const o=career.obj; if(!o) return '';
  return {tokens:'Collect $'+o.target+'M',duel:'Beat the '+o.name+'s',clean:'Clean driving',time:'Beat the clock',top3:'Finish on the podium',win:'Win the episode'}[o.type];}
function objDesc(){const o=career.obj; if(!o) return '';
  return {tokens:'Pick up at least $'+o.target+'M of fortune on the road.',duel:'Arrive ahead of the '+o.name+'s.',clean:'Arrive with no more than one hard knock and no road-safety strikes.',
    time:'Arrive in under '+fmtTime(o.target)+'.',top3:'Finish first, second or third.',win:'Finish first.'}[o.type];}
function objState(){ // {met, text} live during the race and final at the finish
  const o=career.obj; if(!o) return {met:false,text:''};
  const pz=position+playerZ;
  switch(o.type){
    case 'tokens': return {met:fortune>=o.target,text:money(Math.max(0,fortune))+' / $'+o.target+'M'};
    case 'duel': {const r=rivals.find(r=>r.team.id===o.team); const ahead=mode==='finish'?legOrder.indexOf('you')<legOrder.indexOf(o.team):!r||pz>r.z;
      return {met:ahead,text:ahead?'AHEAD':'BEHIND'};}
    case 'clean': {const ok=career.hardHits<=1&&!strikes; return {met:ok,text:'KNOCKS '+career.hardHits+' / 1'+(strikes?' · STRIKE':'')};}
    case 'time': {const t=mode==='finish'?finalTime:raceTime; return {met:t<=o.target,text:fmtTime(t)+' / '+fmtTime(o.target)};}
    case 'top3': return {met:rank<=3,text:'NOW '+ordinal(rank).toUpperCase()};
    case 'win': return {met:rank===1,text:'NOW '+ordinal(rank).toUpperCase()};
  }
  return {met:false,text:''};
}
function drawObjectiveHUD(s,x,y){
  if(!career.obj||(mode!=='race'&&mode!=='countdown')) return;
  const st=objState();
  ctx.save(); ctx.textAlign='left'; ctx.font=`800 ${12*s}px ${FD}`; ctx.shadowColor='rgba(0,0,0,.7)'; ctx.shadowBlur=6*s;
  ctx.fillStyle=st.met?'#ffd27a':'#c9d4e4'; ctx.fillText((st.met?'✓ ':'◎ ')+objTitle().toUpperCase()+' · '+st.text,x,y);
  ctx.restore();
}
/* ---------- collisions feed the clean-driving objective and staged damage ---------- */
function onCarHit(sp){career.hits++; if(sp>.35) career.hardHits++;}

/* ---------- rival driving styles (applied in updateCars) ---------- */
function rivalPace(car){
  const prog=U.limit((car.z-startLine*SEG)/((finishIdx-startLine)*SEG),0,1);
  switch(car.style){
    case 'starter': return prog<.25?1.07:prog>.6?.97:1;
    case 'closer': return prog<.3?.95:prog>.7?1.08:1;
    case 'aggressive': return 1.01;
    case 'friendly': return .98;
  }
  return 1;
}
function rivalWeave(car,dt){
  const gap=car.z-(position+playerZ);
  if(car.style==='aggressive'&&mode==='race'&&gap>0&&gap<10*SEG){car.weaveT-=dt; // sits in front of you and moves into your lane
    if(car.weaveT<=0){car.weaveT=1.4+Math.random()*1.4; car.dodge=.5; car.dodgeDir=Math.sign(playerX-car.offset)||1;}}
  if(car.style==='friendly'&&mode==='race'&&gap>0&&gap<6*SEG&&Math.abs(car.offset-playerX)<.5&&!(car.dodge>0)){car.dodge=.6; car.dodgeDir=car.offset>playerX?1:-1;}
}

/* ---------- the finish: settle rewards once ---------- */
function settleRace(){
  if(career.settled) return career.last; career.settled=true;
  save.flags=save.flags||{}; save.damage=save.damage||{}; save.rel=save.rel||{};
  const st=objState(), objBonus=st.met?OBJ_BONUS:0, placeBonus=PLACE_BONUS[rank-1]||0;
  const prevDmg=save.damage[activeCar.id]||0, add=career.hardHits?Math.min(3,Math.ceil(career.hardHits/2)):0, dmg=Math.min(3,prevDmg+add);
  save.damage[activeCar.id]=dmg;
  const repBefore=save.rep||0; let rep=0; if(rank===1) rep+=3; else if(rank<=3) rep+=1; if(st.met) rep+=2; rep-=strikes*2;
  save.rep=Math.max(0,repBefore+rep);
  const o=career.obj; if(o&&o.type==='duel'){const k=o.team; save.rel[k]=(save.rel[k]||0)+(st.met?-1:1);} // beating a couple cools the friendship a little
  save.bank+=placeBonus+objBonus;
  career.last={fortune,fines,placeBonus,objBonus,met:st.met,objText:st.text,dmgBefore:prevDmg,dmg,added:add,rep,repTotal:save.rep};
  return career.last;
}

/* ---------- results screen ---------- */
const resEl=$('results'); MENUS.push('results'); el.results=resEl;
function showResults(){
  const L=career.last||settleRace(), st=stage, next=stageIdx<STAGES.length-1?STAGES[stageIdx+1]:null;
  hideAll(); resEl.hidden=false; el.touch.hidden=true; el.corner.hidden=true; clearSubs();
  $('resEyebrow').textContent=`Episode ${stageIdx+1} of ${STAGES.length} · ${st.place}`;
  $('resTitle').textContent=rank===1?'You won in '+st.place:ordinal(rank)+' in '+st.place;
  $('resSub').textContent='Time '+fmtTime(finalTime)+' · '+(rank===1?'Kemi and Tobi lead the road.':rank<=3?'On the podium.':'The Fortune Trail goes on.');
  const led=$('resLedger'); led.innerHTML='';
  const row=(k,v,cls)=>{const d=document.createElement('div'); if(cls) d.className=cls; const a=document.createElement('dt'), b=document.createElement('dd'); a.textContent=k; b.textContent=v; d.append(a,b); led.append(d);};
  row('Fortune collected',money(L.fortune+L.fines)); if(L.fines) row('Road-safety fines',money(-L.fines),'neg');
  row('Placing bonus · '+ordinal(rank),money(L.placeBonus)); row('Objective bonus',L.objBonus?money(L.objBonus):'—');
  row('Added to bank',money(L.fortune+L.placeBonus+L.objBonus),'total'); row('Bank now',money(save.bank));
  $('resObj').textContent=(L.met?'✓ Done: ':'✗ Missed: ')+objTitle()+' ('+L.objText.toLowerCase()+').';
  $('resStory').textContent='Reputation '+(L.rep>=0?'+':'')+L.rep+' (now '+L.repTotal+').'+(storyNote()?' '+storyNote():'');
  const rb=$('btnResRepair'), cost=L.dmg*REPAIR_STAGE;
  $('resCar').textContent=L.dmg?`${activeCar.name}: damage ${L.dmg} of 3 (${L.added?'+'+L.added+' this race, ':''}scuffs${L.dmg>=2?', a cracked headlight':''}). Damage is cosmetic; it does not slow the car.`:`${activeCar.name}: no damage.`;
  rb.hidden=!L.dmg; rb.disabled=save.bank<cost; rb.textContent=save.bank<cost?`Repair · $${cost}M (not enough in the bank)`:`Repair now · $${cost}M`;
  const un=[]; if(next&&save.unlocked>=stageIdx+2) un.push('Episode '+(stageIdx+2)+' · '+next.place);
  const afford=CARS.filter(c=>!save.owned.includes(c.id)&&c.price<=save.bank); if(afford.length) un.push(afford.length+' car'+(afford.length>1?'s':'')+' you can now buy');
  if(save.spins) un.push(save.spins+' lucky spin'+(save.spins>1?'s':''));
  $('resUnlock').textContent=un.length?un.join(' · '):'Nothing new this time.';
  $('btnResNext').textContent=next?'Next: '+next.place:'Season standings';
  setTimeout(()=>$('btnResNext').focus({preventScroll:true}),100);
}
function storyNote(){const F=save.flags||{};
  if(stageIdx===3&&F.okafor_help===true) return 'The Okafors repaid their debt.';
  if(stageIdx===3&&F.okafor_help===false) return 'The Okafors have not forgiven you.';
  if(stageIdx===5&&F.press===true) return 'Your interview brought new customers to the garage.';
  return '';}
$('btnResNext').addEventListener('click',()=>{Sound.ui('ok'); stageIdx<STAGES.length-1?beginRace(stageIdx+1):showStandings();});
$('btnResGarage').addEventListener('click',()=>{garageReturn='results'; openGarage();});
$('btnResStory').addEventListener('click',()=>{hideAll(); showStory();});
$('btnResStd').addEventListener('click',showStandings);
$('btnResRetry').addEventListener('click',()=>beginRace(stageIdx));
$('btnResRepair').addEventListener('click',e=>{if(repairCar(activeCar.id)){career.last.dmg=0; career.last.added=0; showResults();} else e.target.blur();});
function repairCar(id){
  const dmg=(save.damage||{})[id]||0, cost=dmg*REPAIR_STAGE;
  if(!dmg||busyPay) return false;
  if(save.bank<cost){Sound.ui('err'); return false;}
  busyPay=true; save.bank-=cost; save.damage[id]=0; persist(); Sound.ui('buy'); busyPay=false;
  if(activeCar.id===id) activeCar=effectiveCar(CARS.find(c=>c.id===id));
  return true;
}

/* ---------- story choices ---------- */
const choiceEl=$('choice'); MENUS.push('choice'); el.choice=choiceEl;
function needChoice(idx){
  const C=CHOICES[idx]; save.flags=save.flags||{};
  if(!C||save.flags[C.id]!==undefined) return false;
  hideAll(); choiceEl.hidden=false; el.corner.hidden=true; el.touch.hidden=true;
  $('chEyebrow').textContent=C.eyebrow; $('chTitle').textContent=C.title; $('chText').textContent=C.text;
  [['a',true],['b',false]].forEach(([k,val])=>{const o=C[k], b=$('ch'+k.toUpperCase());
    b.querySelector('b').textContent=o.label; b.querySelector('span').textContent=o.note+(o.cost&&save.bank<o.cost?' You have '+money(save.bank)+', not enough.':'');
    b.disabled=!!o.cost&&save.bank<o.cost;
    b.onclick=()=>{if(save.flags[C.id]!==undefined) return; // one answer only
      if(o.cost){if(save.bank<o.cost){Sound.ui('err'); return;} save.bank-=o.cost;}
      save.flags[C.id]=val; save.rel=save.rel||{};
      if(C.id==='okafor_help'){save.rel.okafor=(save.rel.okafor||0)+(val?2:-1); save.rep=(save.rep||0)+(val?3:0);}
      if(C.id==='press'&&val){save.bank+=5; save.rep=(save.rep||0)+4;}
      persist(); Sound.ui(o.cost?'buy':'ok'); choiceEl.hidden=true; beginRace(idx);};});
  setTimeout(()=>$('chA').focus({preventScroll:true}),80);
  return true;
}

/* ---------- garage workshop ---------- */
let busyPay=false, wsTab='paint', wsPend=null, wsLoop=0, wsReset=0;
const WS={yaw:-.6,pitch:.18,dist:0,drag:null,pts:new Map(),idle:0,model:null,look:''};
function wsCar(){return CARS.find(c=>c.id===save.car)||CARS[0];}
function openWorkshop(){
  const c=wsCar(); wsPend=carCustom(c.id); $('wsName').textContent=c.name;
  WS.dist=0; WS.yaw=-.6; WS.pitch=.18; wsRender(); wsStart();
}
function wsCost(){const cur=carCustom(save.car); let n=0;
  for(const k in CUSTOM) if(wsPend[k]!==cur[k]){const o=CUSTOM[k].find(o=>o.id===wsPend[k]); n+=(o&&o.price)||0;} return n;}
function wsRender(){
  const c=wsCar(), body=$('wsBody'); body.innerHTML='';
  document.querySelectorAll('#workshop [role=tab]').forEach(t=>t.setAttribute('aria-selected',String(t.dataset.tab===wsTab)));
  $('bank').textContent='Bank: $'+save.bank+'M';
  if(wsTab==='paint'){
    for(const k in CUSTOM){const g=document.createElement('div'); g.className='opt-group'; const h=document.createElement('p'); h.className='opt-h'; h.textContent=CUSTOM_LABEL[k]; g.append(h);
      const row=document.createElement('div'); row.className='opts';
      CUSTOM[k].forEach(o=>{const b=document.createElement('button'); b.type='button'; b.className='opt'+(k==='paint'?' sw':''); b.setAttribute('aria-pressed',String(wsPend[k]===o.id));
        if(k==='paint'){const i=document.createElement('i'); i.style.background=o.id||c.color; b.append(i);}
        const t=document.createElement('span'); t.textContent=o.label+(o.price?' · $'+o.price+'M':''); b.append(t);
        b.onclick=()=>{wsPend[k]=o.id; Sound.ui('tick'); wsRender();}; row.append(b);});
      g.append(row); body.append(g);}
    const cost=wsCost(), act=document.createElement('div'); act.className='row ws-act';
    const ap=document.createElement('button'); ap.className='btn primary'; ap.type='button'; ap.id='btnWsApply';
    ap.textContent=cost?'Apply · $'+cost+'M':'Apply'; ap.disabled=!wsChanged()||cost>save.bank; ap.onclick=wsApply;
    const ca=document.createElement('button'); ca.className='btn'; ca.type='button'; ca.id='btnWsCancel'; ca.textContent='Cancel'; ca.disabled=!wsChanged();
    ca.onclick=()=>{wsPend=carCustom(save.car); wsMsg('Changes cancelled. Nothing was charged.'); wsRender();};
    const rs=document.createElement('button'); rs.className='btn ghost'; rs.type='button'; rs.id='btnWsReset'; rs.textContent=wsReset>performance.now()?'Tap again to reset':'Reset to factory';
    rs.onclick=()=>{if(wsReset<performance.now()){wsReset=performance.now()+3000; wsRender(); return;} wsReset=0;
      (save.custom=save.custom||{})[save.car]={}; persist(); wsPend=carCustom(save.car); wsMsg('Factory finish restored. Resetting is free; paid options are not refunded.'); wsRender();};
    act.append(ap,ca,rs); body.append(act);
    if(cost>save.bank){const p=document.createElement('p'); p.className='ws-note'; p.textContent='Not enough in the bank for these changes ($'+cost+'M).'; body.append(p);}
  } else if(wsTab==='up'){
    const u=(save.upg||{})[c.id]||{};
    UPGRADES.forEach(U2=>{const lv=u[U2.k]||0, price=UPG_PRICE[lv], d=document.createElement('div'); d.className='upg';
      d.innerHTML='<div><b></b><span></span><span class="pips"></span></div><button class="btn" type="button"></button>';
      d.querySelector('b').textContent=U2.name;
      d.querySelector('span').textContent=`+${Math.round(U2.step*100)}% ${U2.stat} per level · now +${Math.round(U2.step*lv*100)}%`;
      d.querySelector('.pips').textContent='●'.repeat(lv)+'○'.repeat(3-lv);
      const b=d.querySelector('button'); b.id='btnUp_'+U2.k;
      if(lv>=3){b.textContent='Maxed'; b.disabled=true;}
      else{b.textContent='Level '+(lv+1)+' · $'+price+'M'; b.disabled=save.bank<price; b.onclick=()=>wsUpgrade(U2.k);}
      body.append(d);});
    const p=document.createElement('p'); p.className='ws-note'; p.textContent='Upgrades belong to this car and apply from your next race.'; body.append(p);
  } else {
    const dmg=(save.damage||{})[c.id]||0, cost=dmg*REPAIR_STAGE, p=document.createElement('p'); p.className='ws-note';
    p.textContent=dmg?`Damage ${dmg} of 3: ${dmg>=2?'scuffed panels and a cracked headlight':'scuffed panels'}. Damage is cosmetic and does not change how the car drives. Hard knocks in a race add damage.`:'No damage. Hard knocks in a race scuff the paint and can crack a headlight.';
    body.append(p);
    if(dmg){const b=document.createElement('button'); b.className='btn primary'; b.type='button'; b.id='btnWsRepair'; b.textContent=save.bank<cost?'Repair · $'+cost+'M (not enough)':'Repair · $'+cost+'M'; b.disabled=save.bank<cost;
      b.onclick=()=>{if(repairCar(c.id)){wsMsg('Repaired. '+c.name+' looks new again.'); wsRender();}}; body.append(b);}
  }
  wsStart(); // redraw the preview (the 2D fallback only draws on change)
}
$('btnChBack').addEventListener('click',toTitle);
function wsChanged(){const cur=carCustom(save.car); return Object.keys(CUSTOM).some(k=>wsPend[k]!==cur[k]);}
function wsMsg(t){$('wsMsg').textContent=t;}
function wsApply(){
  if(busyPay||!wsChanged()) return; const cost=wsCost();
  if(cost>save.bank){Sound.ui('err'); wsMsg('Not enough in the bank.'); return;}
  busyPay=true; save.bank-=cost; (save.custom=save.custom||{})[save.car]=Object.assign({},wsPend); persist(); busyPay=false;
  Sound.ui('buy'); wsMsg(cost?'Applied. $'+cost+'M paid.':'Applied.'); wsRender();
}
function wsUpgrade(k){
  if(busyPay) return; save.upg=save.upg||{}; const u=save.upg[save.car]=save.upg[save.car]||{}, lv=u[k]||0, price=UPG_PRICE[lv];
  if(lv>=3) return; if(save.bank<price){Sound.ui('err'); return;}
  busyPay=true; save.bank-=price; u[k]=lv+1; persist(); setTimeout(()=>{busyPay=false;},700); Sound.ui('buy'); // a quick double tap buys one level, not two
  wsMsg(UPGRADES.find(x=>x.k===k).name+' level '+(lv+1)+' fitted. $'+price+'M paid.'); wsRender();
}
document.querySelectorAll('#workshop [role=tab]').forEach(t=>t.addEventListener('click',()=>{wsTab=t.dataset.tab; wsMsg(''); wsRender();}));
/* live orbit preview, drawn with the garage studio renderer */
function wsStart(){ if(!wsLoop) wsLoop=requestAnimationFrame(wsFrame); }
function wsFrame(now){
  wsLoop=0; if(el.garage.hidden){wsStop(); return;}
  const cv2=$('wsCanvas'), g=cv2.getContext('2d'), c=wsCar(), r=cv2.getBoundingClientRect();
  const w=Math.max(200,Math.round(r.width*Math.min(1.5,devicePixelRatio||1))), h=Math.round(w*9/16);
  if(cv2.width!==w||cv2.height!==h){cv2.width=w; cv2.height=h;}
  const S=(typeof TH!=='undefined'&&TH&&save.gfx!=='2d')?studio():null;
  const look=[c.id,wsPend.paint||c.color,wsPend.finish,wsPend.rim,wsPend.tint,(save.damage||{})[c.id]||0].join('|');
  if(!S){ if(WS.look!==look){WS.look=look; g.fillStyle='#1a2232'; g.fillRect(0,0,w,h);
      g.drawImage(mk(360,220,(g2,w2,h2)=>drawCar(g2,w2,h2,{col:wsPend.paint||c.color,kind:'player',style:c.style,accent:c.accent,plate:'ADEYEMI'})),w*.14,h*.1,w*.72,w*.72*220/360);}
    $('wsHint').textContent='Classic 2D mode: switch Graphics to 3D for the turntable view.'; return; }
  if(WS.look!==look){ if(WS.model) S.sc.remove(WS.model);
    WS.model=vehicleModel({model:c.id,color:wsPend.paint||c.color,roof:c.roof,finish:wsPend.finish,rim:wsPend.rim,tint:wsPend.tint,damage:(save.damage||{})[c.id]||0});
    S.sc.add(WS.model); WS.look=look; const V=VEH[c.id]; WS.min=Math.max(4.5,V.L*1.05); WS.max=Math.max(11,V.L*2.6); if(!WS.dist) WS.dist=Math.max(6.4,V.L*1.6); }
  const dt=Math.min(.1,(now-(WS.t||now))/1000); WS.t=now;
  if(!WS.drag&&!WS.pts.size&&!reduceMotion){WS.idle+=dt; if(WS.idle>1.2) WS.yaw+=dt*.25;}
  WS.dist=U.limit(WS.dist,WS.min,WS.max); WS.pitch=U.limit(WS.pitch,.04,.62);
  S.r.setPixelRatio(1); if(S.c.width!==w||S.c.height!==h) S.r.setSize(w,h,false);
  S.cam.aspect=w/h; S.cam.fov=30; S.cam.updateProjectionMatrix();
  S.cam.position.set(Math.sin(WS.yaw)*Math.cos(WS.pitch)*WS.dist,.7+Math.sin(WS.pitch)*WS.dist,Math.cos(WS.yaw)*Math.cos(WS.pitch)*WS.dist); S.cam.lookAt(0,.7,0);
  S.r.render(S.sc,S.cam); g.drawImage(S.c,0,0,w,h);
  wsLoop=requestAnimationFrame(wsFrame);
}
function wsStop(){ if(wsLoop) cancelAnimationFrame(wsLoop); wsLoop=0; const S=STUDIO.r?STUDIO:null; if(S&&WS.model) S.sc.remove(WS.model); WS.model=null; WS.look='';
  if(wsPend&&wsChanged()){wsPend=carCustom(save.car);} } // leaving without Apply discards the preview, nothing is charged
{const cv2=$('wsCanvas');
  cv2.addEventListener('pointerdown',e=>{WS.pts.set(e.pointerId,{x:e.clientX,y:e.clientY}); WS.idle=0; try{cv2.setPointerCapture(e.pointerId);}catch(_){} WS.pinch=null;});
  cv2.addEventListener('pointermove',e=>{const p=WS.pts.get(e.pointerId); if(!p) return; WS.idle=0;
    if(WS.pts.size===2){const [a,b]=[...WS.pts.values()], d0=Math.hypot(a.x-b.x,a.y-b.y); p.x=e.clientX; p.y=e.clientY; const [a2,b2]=[...WS.pts.values()], d1=Math.hypot(a2.x-b2.x,a2.y-b2.y);
      if(d0>0) WS.dist*=d0/d1; return;}
    WS.yaw-=(e.clientX-p.x)*.01; WS.pitch+=(e.clientY-p.y)*.006; p.x=e.clientX; p.y=e.clientY;});
  const up=e=>{WS.pts.delete(e.pointerId);}; cv2.addEventListener('pointerup',up); cv2.addEventListener('pointercancel',up);
  cv2.addEventListener('wheel',e=>{e.preventDefault(); WS.idle=0; WS.dist*=1+Math.sign(e.deltaY)*.08;},{passive:false});
  cv2.addEventListener('keydown',e=>{const k={ArrowLeft:[.15,0,1],ArrowRight:[-.15,0,1],ArrowUp:[0,.05,1],ArrowDown:[0,-.05,1],Equal:[0,0,.9],Minus:[0,0,1.1]}[e.code]; if(!k) return; e.preventDefault(); WS.idle=0; WS.yaw+=k[0]; WS.pitch+=k[1]; WS.dist*=k[2];});}

/* ---------- confirmation for actions that throw away a race ---------- */
function confirmTap(btn,again,fn){
  const label=btn.textContent; let t=0;
  btn.addEventListener('click',()=>{ if(t){clearTimeout(t); t=0; btn.textContent=label; fn(); return;}
    btn.textContent=again; t=setTimeout(()=>{t=0; btn.textContent=label;},3000); });
}

/* ---------- volume mix, ambience, skids and interface sounds ---------- */
save.vol=Object.assign({music:.8,fx:.9,amb:.6},save.vol||{});
function applyVolumes(){ if(!Sound.ac) return; const t=Sound.ac.currentTime;
  Sound.mus.gain.setTargetAtTime(save.vol.music,t,.05); Sound.fx.gain.setTargetAtTime(save.vol.fx,t,.05); Sound.amb.gain.setTargetAtTime(save.vol.amb,t,.05);}
document.querySelectorAll('input[data-vol]').forEach(i=>{i.value=Math.round(save.vol[i.dataset.vol]*100);
  i.addEventListener('input',()=>{save.vol[i.dataset.vol]=i.value/100; persist(); Sound.init(); applyVolumes();
    document.querySelectorAll('input[data-vol="'+i.dataset.vol+'"]').forEach(j=>{if(j!==i) j.value=i.value;});});});
Sound.ui=function(kind){
  if(!this.ac||this.muted) return;
  if(kind==='buy'){[660,880,1320].forEach((f,i)=>setTimeout(()=>this.tone(f,.12,'triangle',.1),i*70));}
  else if(kind==='err'){this.tone(180,.22,'square',.08,120);}
  else if(kind==='tick'){this.tone(1200,.04,'sine',.05);}
  else this.tone(880,.09,'triangle',.08);
};
const Amb={on:false,
  start(){ const ac=Sound.ac; if(!ac||this.on) return; this.on=true;
    const src=ac.createBufferSource(); src.buffer=Sound.noise; src.loop=true;
    const lp=ac.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=180; this.city=ac.createGain(); this.city.gain.value=0; src.connect(lp); lp.connect(this.city); this.city.connect(Sound.amb);
    const sp=ac.createBiquadFilter(); sp.type='lowpass'; sp.frequency.value=700; this.surf=ac.createGain(); this.surf.gain.value=0; src.connect(sp); sp.connect(this.surf); this.surf.connect(Sound.amb);
    const sk=ac.createBiquadFilter(); sk.type='bandpass'; sk.frequency.value=2300; sk.Q.value=6; this.skid=ac.createGain(); this.skid.gain.value=0; src.connect(sk); sk.connect(this.skid); this.skid.connect(Sound.fx);
    src.start(); this.next=0; },
  update(){
    if(!Sound.ac) return; if(!this.on) this.start(); applyVolumes.done||(applyVolumes(),applyVolumes.done=1);
    const t=Sound.ac.currentTime, th=stage.theme, live=!paused&&!CINEMA.on&&(mode==='race'||mode==='countdown'||mode==='intro'||mode==='finish'||mode==='title');
    const city=th.scenery.some(s=>['office','tower','phhouse','colonial','haussmann','stucco'].includes(s)), water=segments.length&&segments[Math.floor((position+playerZ)/SEG)%segments.length].water;
    this.city.gain.setTargetAtTime(live?(city?.5:.18):0,t,.4);
    this.surf.gain.setTargetAtTime(live&&(water||th.water)?.12+.1*Math.sin(t*.6):0,t,.5);
    const sp=speed/MAXSPEED, skid=live&&mode==='race'&&((steerDir&&sp>.62)||(offroad&&sp>.3))?Math.min(.22,(sp-.4)*.4):0;
    this.skid.gain.setTargetAtTime(skid,t,.08);
    if(live&&t>this.next){this.next=t+2+Math.random()*5; const muted=Sound.muted; if(muted) return;
      const g=Sound.ac.createGain(); g.connect(Sound.amb);
      if(th.night&&!city){for(let i=0;i<6;i++){const o=Sound.ac.createOscillator(), e=Sound.ac.createGain(), s=t+i*.09; o.type='sine'; o.frequency.value=4300+Math.random()*400;
          e.gain.setValueAtTime(0,s); e.gain.linearRampToValueAtTime(.025,s+.02); e.gain.linearRampToValueAtTime(0,s+.06); o.connect(e); e.connect(g); o.start(s); o.stop(s+.08);}}
      else if(city&&mode!=='title'){const f=[392,440,523][Math.floor(Math.random()*3)], o=Sound.ac.createOscillator(), e=Sound.ac.createGain(), lp=Sound.ac.createBiquadFilter();
        lp.type='lowpass'; lp.frequency.value=1400; o.type='sawtooth'; o.frequency.value=f; e.gain.setValueAtTime(0,t); e.gain.linearRampToValueAtTime(.05,t+.03);
        e.gain.setValueAtTime(.05,t+.18+Math.random()*.3); e.gain.linearRampToValueAtTime(0,t+.55); o.connect(lp); lp.connect(e); e.connect(g); o.start(t); o.stop(t+.6);}}
  }
};
/* ---------- reduce motion ---------- */
function syncReduce(){reduceMotion=reduceMotionSys||!!save.reduce; document.querySelectorAll('.tgReduce').forEach(b=>b.setAttribute('aria-pressed',String(reduceMotion)));}
document.querySelectorAll('.tgReduce').forEach(b=>b.addEventListener('click',()=>{
  if(reduceMotionSys){showToast('Reduce motion','Your device asks for reduced motion, so it stays on.'); return;}
  save.reduce=!save.reduce; persist(); syncReduce(); showToast('Reduce motion',save.reduce?'On: no camera shake, motion blur, speed lines or spinning wheel.':'Off.');}));
syncReduce();
