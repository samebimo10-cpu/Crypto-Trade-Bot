/* High Seas — menus, port screens, sea chart, captain's log and the instrument HUD. */
(function () {
  const HS = (window.HS = window.HS || {});
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const G = () => HS.Game;

  const UI = (HS.UI = {
    shakeAmt: 0, portNpc: null, portT: 0, chart: null,

    init() {
      this.menu = $('#menu'); this.modalEl = $('#modal'); this.portEl = $('#port'); this.chartEl = $('#chart');
      this.portCanvas = $('#portScene'); this.npcCanvas = $('#npcPortrait');
      document.addEventListener('pointerdown', () => HS.Audio.init(), { once: false });
      document.addEventListener('keydown', () => HS.Audio.init());
      this.modalEl.addEventListener('click', (e) => { if (e.target === this.modalEl && this.modalClosable) this.closeModal(); });
      window.addEventListener('keydown', (e) => {
        if (HS.Dialog.open) return;
        // stopPropagation keeps the same keypress from reaching the game and reopening what we just closed
        if (!this.chartEl.classList.contains('hidden') && (e.code === 'KeyM' || e.code === 'Escape')) { e.preventDefault(); e.stopPropagation(); this.hideChart(); return; }
        if (!this.modalEl.classList.contains('hidden') && this.modalClosable && (e.code === 'Escape' || (e.code === 'KeyC' && this.modalKind === 'log') || (e.code === 'KeyH' && this.modalKind === 'help') || (e.code === 'KeyP' && this.modalKind === 'pause'))) { e.preventDefault(); e.stopPropagation(); this.closeModal(); }
      }, true);
      this._initTouch();
      this._initChart();
    },
    frame(dt) {
      this.shakeAmt = Math.max(0, this.shakeAmt - dt * 25);
      if (!this.portEl.classList.contains('hidden')) this._drawPortScene(dt);
      if (this.menuCanvas && !this.menu.classList.contains('hidden')) this._drawMenuShip(dt);
    },
    shake(n) { this.shakeAmt = Math.max(this.shakeAmt, n); },
    shakeOffset() { const a = this.shakeAmt; return a ? { x: HS.rand(-a, a), y: HS.rand(-a, a) } : { x: 0, y: 0 }; },
    hideAll() {
      this.menu.classList.add('hidden'); this.portEl.classList.add('hidden'); this.chartEl.classList.add('hidden');
      this.closeModal(true);
      $('#touch').classList.toggle('hidden', !this.isTouch || G().state !== 'sea');
    },
    flagURL(nation) { return HS.flagCanvas(nation).toDataURL(); },

    // ------------------------------------------------------------ modal
    modal(html, opts = {}) {
      this.modalClosable = opts.closable !== false;
      this.modalKind = opts.kind || '';
      this.modalEl.innerHTML = `<div class="sheet parchment ${opts.wide ? 'wide' : ''}">${this.modalClosable ? '<button class="close" data-close>✕</button>' : ''}${html}</div>`;
      this.modalEl.classList.remove('hidden');
      this.modalEl.querySelectorAll('[data-close]').forEach((b) => (b.onclick = () => this.closeModal()));
      this.prevState = this.prevState || G().state;
      if (G().state === 'sea') { this.pausedFrom = 'sea'; G().state = 'paused'; }
      return this.modalEl.querySelector('.sheet');
    },
    closeModal(silent) {
      this.modalEl.classList.add('hidden');
      this.modalEl.innerHTML = '';
      if (this.pausedFrom && G().state === 'paused') G().state = this.pausedFrom;
      this.pausedFrom = null; this.prevState = null;
      if (!silent && this.onModalClose) { const f = this.onModalClose; this.onModalClose = null; f(); }
    },

    // ------------------------------------------------------------ main menu
    showMenu() {
      this.hideAll();
      const hasSave = G().hasSave();
      this.menu.innerHTML = `
        <div class="title-block">
          <div class="crest"><canvas id="menuShip" width="420" height="260"></canvas></div>
          <h1>HIGH SEAS</h1>
          <div class="subtitle">A Voyage in the Age of Sail</div>
        </div>
        <div class="menu-buttons">
          ${hasSave ? '<button class="btn big" id="mContinue">⚓ Continue Voyage</button>' : ''}
          <button class="btn big" id="mNew">🧭 New Voyage <small>Open-world campaign</small></button>
          <button class="btn big" id="mBattle">💥 Naval Battle <small>Choose a man-of-war and fight</small></button>
          <button class="btn" id="mHelp">📜 How to Play</button>
          <div class="menu-toggles"><button class="btn small" id="mMusic">♫ Music: ${HS.Audio.musicOn ? 'On' : 'Off'}</button><button class="btn small" id="mVoice">🗣 Voices: ${HS.Voice.on ? 'On' : 'Off'}</button></div>
        </div>
        <div class="menu-foot">Plays entirely offline · Trade between real ports of the world · Hunt treasure · Fight pirates & coast guards</div>`;
      this.menu.classList.remove('hidden');
      this.menuCanvas = $('#menuShip');
      if (hasSave) $('#mContinue').onclick = () => { HS.Audio.init(); G().load(); };
      $('#mNew').onclick = () => { HS.Audio.init(); this.showNewGame(); };
      $('#mBattle').onclick = () => { HS.Audio.init(); this.showSkirmish(); };
      $('#mHelp').onclick = () => this.showHelp();
      $('#mMusic').onclick = (e) => { HS.Audio.init(); e.target.textContent = `♫ Music: ${HS.Audio.toggleMusic() ? 'On' : 'Off'}`; };
      $('#mVoice').onclick = (e) => { e.target.textContent = `🗣 Voices: ${HS.Voice.toggle() ? 'On' : 'Off'}`; };
    },
    _drawMenuShip() {
      const c = this.menuCanvas, ctx = c.getContext('2d'), t = G().t;
      ctx.clearRect(0, 0, c.width, c.height);
      HS.drawShipProfile(ctx, 'frigate', 210, 200, 1.35, { t, nation: 'british' });
      ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 2;
      for (let i = 0; i < 4; i++) { ctx.beginPath(); for (let x = 0; x <= 420; x += 10) ctx.lineTo(x, 222 + i * 9 + Math.sin(x * 0.04 + t * 2 + i) * 3); ctx.stroke(); }
    },

    showNewGame() {
      const nations = [['british', 'British', 'Start at Port Royal, Jamaica. Friendly with the Royal Navy.'], ['spanish', 'Spanish', 'Start at Havana. The Spanish Main is yours.'], ['french', 'French', 'Start at Fort-de-France, Martinique.'], ['dutch', 'Dutch', 'Start at Willemstad, Curaçao — a smugglers\' paradise.'], ['portuguese', 'Portuguese', 'Start at Salvador, Brazil.'], ['pirate', 'Pirate', 'Start at Tortuga. Every navy\'s hand is against you.']];
      const sheet = this.modal(`
        <h2>A New Voyage</h2>
        <div class="form">
          <label>Captain's name <input id="ngName" maxlength="28" value="Jack Hawkins"></label>
          <label>Captain <select id="ngGender"><option value="m">Male</option><option value="f">Female</option></select></label>
          <label>Ship's name <input id="ngShip" maxlength="24" value="Fortune"></label>
        </div>
        <h3>Sail under the colours of…</h3>
        <div class="nation-grid">${nations.map(([k, n, d], i) => `<button class="nation ${i === 0 ? 'sel' : ''}" data-n="${k}"><img src="${this.flagURL(k)}"><b>${n}</b><span>${d}</span></button>`).join('')}</div>
        <p class="note">You begin with a small sloop, a few hands and a little gold. Trade, explore, hunt pirates — or turn pirate yourself.</p>
        <div class="row end"><button class="btn" data-close>Back</button><button class="btn primary" id="ngGo">Weigh Anchor ⚓</button></div>`, { kind: 'new' });
      let nation = 'british';
      sheet.querySelectorAll('.nation').forEach((b) => (b.onclick = () => { sheet.querySelectorAll('.nation').forEach((x) => x.classList.remove('sel')); b.classList.add('sel'); nation = b.dataset.n; }));
      this.onModalClose = () => this.showMenu();
      $('#ngGo').onclick = () => {
        const opts = { name: $('#ngName').value.trim() || 'Jack Hawkins', gender: $('#ngGender').value, shipName: $('#ngShip').value.trim() || 'Fortune', nation };
        this.onModalClose = null;
        this.closeModal(true);
        this.menu.classList.add('hidden');
        G().newCampaign(opts);
      };
    },

    showSkirmish() {
      const order = HS.SKIRMISH_ORDER;
      const sites = HS.BATTLE_SITES;
      const sheet = this.modal(`
        <h2>Naval Battle</h2>
        <h3>Choose your man-of-war</h3>
        <div class="ship-grid">${order.map((k, i) => { const T = HS.SHIPS[k]; return `<button class="shipcard ${i === 3 ? 'sel' : ''}" data-s="${k}"><canvas width="220" height="110" data-prof="${k}"></canvas><b>${T.name}</b><span>${T.steam ? `${T.turrets.length} turrets${T.torpedoes ? ' · ' + T.torpedoes + ' torpedoes' : ''}` : `${T.guns * 2} guns · ${T.gunCal}-pdrs`} · ${T.speed} kn</span><span>Hull ${T.hull} · Crew ${T.crewMax}${T.steam ? ' · Steam' : ''}</span></button>`; }).join('')}</div>
        <div class="form grid3">
          <label>Your colours <select id="skN">${['british', 'spanish', 'french', 'dutch', 'american', 'portuguese', 'ottoman', 'japanese'].map((n) => `<option value="${n}">${HS.NATIONS[n].navy}</option>`).join('')}</select></label>
          <label>Enemy colours <select id="skE">${['french', 'spanish', 'british', 'dutch', 'pirate', 'american', 'ottoman', 'qing'].map((n) => `<option value="${n}">${n === 'pirate' ? 'Pirates' : HS.NATIONS[n].navy}</option>`).join('')}</select></label>
          <label>Enemy ships <select id="skC"><option>1</option><option selected>2</option><option>3</option><option>4</option><option>6</option></select></label>
          <label>Enemy vessels <select id="skT"><option value="match">Same class as yours</option><option value="random">Mixed squadron</option>${order.map((k) => `<option value="${k}">${HS.SHIPS[k].name}</option>`).join('')}</select></label>
          <label>Allied ships <select id="skA"><option>0</option><option selected>1</option><option>2</option><option>3</option></select></label>
          <label>Battle site <select id="skS">${sites.map((s, i) => `<option value="${i}">${s.name}</option>`).join('')}</select></label>
          <label>Weather <select id="skW"><option value="calm">Light airs</option><option value="breeze" selected>Fresh breeze</option><option value="gale">Full gale</option></select></label>
          <label>Time <select id="skTi"><option value="day">Forenoon</option><option value="dusk">Dusk</option><option value="night">Night action</option><option value="dawn">Dawn</option></select></label>
        </div>
        <div class="row end"><button class="btn" data-close>Back</button><button class="btn primary" id="skGo">Beat to Quarters! 🥁</button></div>`, { wide: true, kind: 'skirmish' });
      sheet.querySelectorAll('canvas[data-prof]').forEach((c) => { const ctx = c.getContext('2d'); HS.drawShipProfile(ctx, c.dataset.prof, 110, 80, 0.62 * (64 / HS.SHIPS[c.dataset.prof].len), { nation: 'british' }); });
      let ship = order[3];
      sheet.querySelectorAll('.shipcard').forEach((b) => (b.onclick = () => { sheet.querySelectorAll('.shipcard').forEach((x) => x.classList.remove('sel')); b.classList.add('sel'); ship = b.dataset.s; }));
      this.onModalClose = () => this.showMenu();
      $('#skGo').onclick = () => {
        const cfg = { ship, nation: $('#skN').value, enemyNation: $('#skE').value, enemies: +$('#skC').value, enemyType: $('#skT').value, allies: +$('#skA').value, site: sites[+$('#skS').value], weather: $('#skW').value, time: $('#skTi').value };
        if (cfg.nation === cfg.enemyNation) cfg.enemyNation = cfg.nation === 'french' ? 'british' : 'french';
        this.lastSkirmish = cfg;
        this.onModalClose = null;
        this.closeModal(true);
        this.menu.classList.add('hidden');
        G().startSkirmish(cfg);
      };
    },
    showSkirmishResult(won, st) {
      const mins = Math.floor(st.time / 60), secs = Math.floor(st.time % 60);
      this.modal(`
        <h2>${won ? 'Victory!' : 'Defeat'}</h2>
        <p class="lead">${won ? 'The enemy squadron is beaten — sunk, struck or taken as prizes. The Admiralty will hear of this!' : 'Your ship has gone down with her colours flying. A gallant fight, Captain.'}</p>
        <div class="stats"><div><b>${mins}:${String(secs).padStart(2, '0')}</b><span>Duration</span></div><div><b>${st.fired}</b><span>Broadsides / salvoes</span></div><div><b>${st.hits}</b><span>Hits scored</span></div><div><b>${st.dmg}</b><span>Damage dealt</span></div></div>
        <div class="row end"><button class="btn" id="srMenu">Main Menu</button><button class="btn primary" id="srAgain">Fight Again</button></div>`, { closable: false });
      $('#srMenu').onclick = () => { this.closeModal(true); G().startMenu(); };
      $('#srAgain').onclick = () => { this.closeModal(true); G().startSkirmish(st.cfg); };
    },

    showHelp() {
      this.modal(`
        <h2>The Articles of the Sea</h2>
        <div class="help-cols">
          <div>
            <h3>Helm & canvas</h3>
            <table class="keys">
              <tr><td>A / D or ← →</td><td>Helm to larboard (port) / starboard</td></tr>
              <tr><td>W / S or ↑ ↓</td><td>Make / shorten sail (steam: engine telegraph)</td></tr>
              <tr><td>X</td><td>Rudder amidships</td></tr>
              <tr><td>Wheel, + / −</td><td>Zoom the glass in / out</td></tr>
              <tr><td>[ / ]</td><td>Slow / hasten time (campaign, when no enemy is near)</td></tr>
            </table>
            <h3>Gunnery</h3>
            <table class="keys">
              <tr><td>Q</td><td>Fire larboard (left) broadside</td></tr>
              <tr><td>E</td><td>Fire starboard (right) broadside</td></tr>
              <tr><td>Space</td><td>Fire both batteries</td></tr>
              <tr><td>1 / 2 / 3</td><td>Round shot (hull) · Chain shot (sails) · Grapeshot (crew)</td></tr>
              <tr><td>Mouse + click</td><td>Aim & fire turrets (steam warships)</td></tr>
              <tr><td>F</td><td>Launch torpedo (destroyer)</td></tr>
              <tr><td>B</td><td>Grapple & board a ship alongside</td></tr>
              <tr><td>Tab (hold)</td><td>Show firing arcs</td></tr>
            </table>
          </div>
          <div>
            <h3>Seamanship</h3>
            <table class="keys">
              <tr><td>G</td><td>Hail the nearest vessel with the speaking-trumpet</td></tr>
              <tr><td>Enter</td><td>Drop anchor in a nearby harbour</td></tr>
              <tr><td>L</td><td>Send a landing party ashore (dig for treasure)</td></tr>
              <tr><td>M</td><td>Unroll the sea chart</td></tr>
              <tr><td>C</td><td>Captain's log — ship, cargo, standing, missions</td></tr>
              <tr><td>Esc / P</td><td>Pause · N music · V voices</td></tr>
            </table>
            <h3>Sailing by the wind</h3>
            <p>A square-rigger cannot sail closer than about 50° to the wind — head into it and you'll be <i>in irons</i>. Fastest is a <i>broad</i> or <i>beam reach</i>. Fore-and-aft rigs (sloops, schooners, cutters) point higher. To go to windward, <i>tack</i> in a zig-zag. The trade winds blow from the north-east above the Equator and from the south-east below it; westerlies blow in the higher latitudes. In a gale, shorten sail or your canvas will split.</p>
            <h3>Law of the sea</h3>
            <p>Fire on merchantmen and your reputation with their nation falls, notoriety rises, and coast guards will hunt you. Revenue cutters may hail you to inspect your hold — contraband will be seized. Sink pirates for bounties and good standing. Buy rumours and treasure maps in taverns; an <b>X</b> on the chart marks the spot.</p>
          </div>
        </div>`, { wide: true, kind: 'help' });
    },
    showPause() {
      const g = G();
      this.modal(`
        <h2>Paused</h2>
        <div class="menu-buttons">
          <button class="btn big" data-close>▶ Resume</button>
          ${g.mode === 'campaign' ? '<button class="btn" id="pSave">💾 Save to ship\'s log</button><button class="btn" id="pLog">📖 Captain\'s Log</button>' : ''}
          <button class="btn" id="pHelp">📜 How to Play</button>
          <div class="menu-toggles"><button class="btn small" id="pMusic">♫ Music: ${HS.Audio.musicOn ? 'On' : 'Off'}</button><button class="btn small" id="pVoice">🗣 Voices: ${HS.Voice.on ? 'On' : 'Off'}</button></div>
          <button class="btn danger" id="pQuit">Quit to Main Menu</button>
        </div>`, { kind: 'pause' });
      if (g.mode === 'campaign') {
        $('#pSave').onclick = (e) => { e.target.textContent = g.save() ? '✔ Saved' : 'Save failed'; };
        $('#pLog').onclick = () => { this.closeModal(true); this.showLog(); };
      }
      $('#pHelp').onclick = () => { this.closeModal(true); this.showHelp(); };
      $('#pMusic').onclick = (e) => { e.target.textContent = `♫ Music: ${HS.Audio.toggleMusic() ? 'On' : 'Off'}`; };
      $('#pVoice').onclick = (e) => { e.target.textContent = `🗣 Voices: ${HS.Voice.toggle() ? 'On' : 'Off'}`; };
      $('#pQuit').onclick = () => { if (g.mode === 'campaign') g.save(true); this.closeModal(true); g.startMenu(); };
    },
    showGameOver(text, cb) {
      this.modal(`<h2>Davy Jones' Locker</h2><p class="lead">${esc(text)}</p><div class="row end"><button class="btn primary" id="goOk">Begin again</button></div>`, { closable: false });
      $('#goOk').onclick = () => { this.closeModal(true); cb(); };
    },

    // ------------------------------------------------------------ captain's log
    showLog(tab = 'ship') {
      const g = G(), pl = g.pl, p = g.player;
      if (!pl) return;
      const tabs = [['ship', 'Ship'], ['cargo', 'Hold'], ['standing', 'Standing'], ['missions', 'Missions & Maps'], ['journal', 'Journal']];
      let body = '';
      if (tab === 'ship') {
        const T = p.T;
        body = `<div class="shipinfo"><canvas id="logShip" width="360" height="200"></canvas><div>
          <h3>${esc(p.name)} <small>${T.name}</small></h3>
          <table class="kv">
            <tr><td>Hull</td><td>${Math.round(p.hull)} / ${p.hullMax}</td></tr><tr><td>Sails & rigging</td><td>${Math.round(p.sails)} / ${p.sailsMax}</td></tr>
            <tr><td>Crew</td><td>${p.crew} (min ${T.crewMin}, max ${T.crewMax})</td></tr><tr><td>Armament</td><td>${T.guns * 2} guns, ${T.gunCal}-pounders</td></tr>
            <tr><td>Best speed</td><td>${p.maxSpeed().toFixed(1)} knots</td></tr><tr><td>Rig</td><td>${T.rig >= 0.9 ? 'Fore-and-aft' : T.rig >= 0.4 ? 'Mixed (brigantine)' : 'Square-rigged'}</td></tr>
            <tr><td>Reload</td><td>${p.reloadTime().toFixed(1)} s per broadside</td></tr><tr><td>Upgrades</td><td>${HS.UPGRADES.filter((u) => p.upgrades[u.id]).map((u) => u.name).join(', ') || '—'}</td></tr>
          </table></div></div>
          <div class="stats"><div><b>${g.rank()}</b><span>Rank</span></div><div><b>${Math.round(pl.fame)}</b><span>Fame</span></div><div><b>${Math.round(pl.notoriety)}</b><span>Notoriety</span></div><div><b>${Math.round(pl.stats.nm).toLocaleString()}</b><span>Nautical miles</span></div><div><b>${pl.stats.sunk}</b><span>Ships sunk</span></div><div><b>${pl.stats.captured}</b><span>Prizes taken</span></div><div><b>${pl.stats.treasures}</b><span>Treasures</span></div><div><b>${pl.stats.isles}</b><span>Isles charted</span></div></div>`;
      } else if (tab === 'cargo') {
        const rows = Object.keys(p.cargo).map((k) => `<tr><td>${HS.GOOD[k].name}${HS.GOOD[k].illicit ? ' <i class="bad">(illicit)</i>' : ''}</td><td>${p.cargo[k]} tons</td><td>~${HS.GOOD[k].base} each</td></tr>`).join('');
        body = `<p>Hold: <b>${p.cargoUsed()}</b> / ${p.cargoCap()} tons · Purse: <b>${HS.fmtGold(pl.gold)}</b> pieces of eight · Provisions: <b>${Math.floor(pl.rations / Math.max(1, p.crew))}</b> days</p>
          <table class="tbl"><tr><th>Goods</th><th>Quantity</th><th>Typical value</th></tr>${rows || '<tr><td colspan="3"><i>The hold is empty but for rats.</i></td></tr>'}</table>`;
      } else if (tab === 'standing') {
        body = `<table class="tbl"><tr><th></th><th>Nation</th><th>Standing</th><th></th></tr>${Object.keys(HS.NATIONS).map((k) => { const v = Math.round(pl.rep[k] || 0); return `<tr><td><img class="flag" src="${this.flagURL(k)}"></td><td>${HS.NATIONS[k].name}</td><td><div class="repbar"><i style="left:${50 + v / 2}%"></i></div></td><td class="${v <= -30 ? 'bad' : v >= 25 ? 'good' : ''}">${g.repName(v)} (${v})</td></tr>`; }).join('')}</table>
          <p class="note">Notoriety ${Math.round(pl.notoriety)} / 100. Above 55 every navy hunts you; above 60 the Brethren of the Coast count you as one of their own.</p>`;
      } else if (tab === 'missions') {
        const ms = pl.missions.map((m) => `<div class="mission"><b>${esc(m.title)}</b><p>${esc(m.text || '')}</p><small>${m.type === 'delivery' ? `Due by day ${m.deadline} (today is day ${g.day()}) · ` : ''}Reward ${m.reward} gold${m.done ? ' · <span class="good">Complete — claim in port</span>' : ''}</small></div>`).join('');
        const maps = pl.maps.map((m) => `<div class="mission ${m.found ? 'done' : ''}"><b>🗺 ${esc(m.title)}</b><p>${esc(m.clue)}</p>${m.found ? '<small>Recovered.</small>' : '<small>Sail to the X on your chart and press L to send a landing party.</small>'}</div>`).join('');
        body = `<h3>Commissions</h3>${ms || '<p><i>No commissions. Visit a governor or harbour master.</i></p>'}<h3>Treasure maps</h3>${maps || '<p><i>No maps. Tavern rogues sell them; pirate captains carry them.</i></p>'}`;
      } else {
        body = `<div class="journal">${(pl.journal || []).slice().reverse().map((l) => `<p>${esc(l)}</p>`).join('')}</div>`;
      }
      this.modal(`<h2>Captain's Log <small>${g.dateString()}</small></h2><div class="tabs">${tabs.map(([k, n]) => `<button class="tab ${k === tab ? 'sel' : ''}" data-t="${k}">${n}</button>`).join('')}</div><div class="tabbody">${body}</div>`, { wide: true, kind: 'log' });
      this.modalEl.querySelectorAll('.tab').forEach((b) => (b.onclick = () => { this.closeModal(true); this.showLog(b.dataset.t); }));
      const c = $('#logShip');
      if (c) HS.drawShipProfile(c.getContext('2d'), p.type, 180, 150, 0.85 * (64 / p.T.len), { nation: p.nation === 'pirate' ? 'pirate' : p.nation, pirate: p.nation === 'pirate', t: g.t });
    },

    // ------------------------------------------------------------ port
    showPort(port, msgs) {
      this.hideAll();
      this.port = port;
      this.portT = 0;
      this.greeted = {};
      this.portEl.classList.remove('hidden');
      this.portEl.dataset.style = port.style;
      this._resizePortCanvas();
      this.portTab('harbour', msgs && msgs.length ? msgs.join(' ') : null);
    },
    _resizePortCanvas() {
      const c = this.portCanvas;
      c.width = Math.round(window.innerWidth * Math.min(1.5, window.devicePixelRatio || 1));
      c.height = Math.round(window.innerHeight * Math.min(1.5, window.devicePixelRatio || 1));
    },
    portHeader() {
      const g = G(), pl = g.pl, p = g.player, port = this.port;
      const nat = HS.NATIONS[port.nation];
      const { lon, lat } = HS.toLonLat(port.x, port.y);
      return `<div class="port-title"><img class="flag big" src="${this.flagURL(port.nation)}"><div><h1>${esc(port.name)}</h1><div class="sub">${port.haven ? 'Pirate haven' : nat.name} · ${HS.fmtLat(lat)} ${HS.fmtLon(lon)} · ${port.nation === 'pirate' ? '' : 'Standing: ' + g.repName(pl.rep[port.nation])}</div></div></div>
        <div class="port-stats"><span>💰 ${HS.fmtGold(pl.gold)}</span><span>📦 ${p.cargoUsed()}/${p.cargoCap()} t</span><span>👥 ${p.crew}/${p.T.crewMax}</span><span>🍖 ${Math.floor(pl.rations / Math.max(1, p.crew))} days</span><span>🛠 ${Math.round((p.hull / p.hullMax) * 100)}%</span><span class="date">${g.dateString()}</span></div>`;
    },
    portTab(tab, extra) {
      const g = G(), port = this.port;
      const tabs = [['harbour', '⚓ Harbour Master'], ['market', '⚖ Market'], ['shipyard', '🔨 Shipyard'], ['tavern', '🍺 Tavern'], ['governor', port.nation === 'pirate' ? '☠ Pirate Lord' : '🏛 Governor'], ['sail', '⛵ Set Sail']];
      this.tab = tab;
      const npcKind = { harbour: 'harbour', market: 'merchant', shipyard: 'shipwright', tavern: 'tavern', governor: 'governor' }[tab];
      const npc = HS.makeNPC(npcKind, port);
      this.portNpc = npc;
      const line = extra || this.greeting(tab, npc);
      let content = '';
      try { content = this['_tab_' + tab](port); } catch (e) { console.error(e); content = '<p>The clerk is out.</p>'; }
      $('#portHeader').innerHTML = this.portHeader();
      $('#portNav').innerHTML = tabs.map(([k, n]) => `<button class="tab ${k === tab ? 'sel' : ''}" data-t="${k}">${n}</button>`).join('');
      $('#npcName').textContent = npc.name;
      $('#npcTitle').textContent = npc.title;
      $('#npcSay').textContent = line;
      $('#portContent').innerHTML = content;
      $('#portNav').querySelectorAll('.tab').forEach((b) => (b.onclick = () => { HS.Audio.click(); if (b.dataset.t === 'sail') g.leavePort(); else this.portTab(b.dataset.t); }));
      this['_wire_' + tab] && this['_wire_' + tab](port);
      if (!this.greeted[tab] || extra) { this.greeted[tab] = true; this.npcTalking = true; HS.Voice.speak(line, npc, () => (this.npcTalking = false)); setTimeout(() => (this.npcTalking = HS.Voice.speaking && this.npcTalking), Math.min(6000, line.length * 50)); }
    },
    say(text) { $('#npcSay').textContent = text; this.npcTalking = true; HS.Voice.speak(text, this.portNpc, () => (this.npcTalking = false)); },
    refresh(text) { const say = $('#npcSay').textContent; this.portTab(this.tab, null); $('#npcSay').textContent = text || say; if (text) this.say(text); },
    greeting(tab, npc) {
      const g = G(), pl = g.pl, port = this.port;
      const cap = `Captain ${pl.name.split(' ').slice(-1)[0]}`;
      const lines = {
        harbour: [`Welcome to ${port.name}, ${cap}. Your berth is ready — mind the shoals off the point.`, `Ahoy, ${cap}! ${port.name} harbour, at your service. Need victuals for the voyage?`, `The tide's with you, ${cap}. Welcome to ${port.name}.`],
        market: [`Fine goods and honest prices, ${cap}! What will it be?`, `${HS.GOOD[port.produces[0]].name} is plentiful here — and cheap. Buy low, sell high, as my father used to say.`, `Trade's brisk today, ${cap}. Step into the counting-house.`],
        shipyard: [`She's taken a beating, ${cap}. Nothing a few good oak planks won't fix.`, `Looking for a new vessel? I've hulls on the slipway fit for an admiral.`, `Copper-bottomed and true — that's how we build 'em here.`],
        tavern: [`Pull up a stool, ${cap}! Rum's fresh and the gossip's fresher.`, `Looking for hands? Half the sailors in ${port.name} drink here.`, `Shhh — the old salt in the corner says he's seen buried gold...`],
        governor: port.nation === 'pirate'
          ? [`Well, well. ${cap}. The Brethren have heard of you. Sit — have a drink with a Pirate Lord.`, `In ${port.name}, there's no law but the articles. What do you want?`]
          : pl.notoriety > 40 ? [`${cap}. Your reputation precedes you — and not kindly. Speak quickly.`] : [`Ah, ${cap}! Welcome to ${port.name}. His Majesty's colony has need of capable captains.`, `Captain, the seas are thick with pirates. I may have work for a bold officer.`],
      };
      void npc;
      return HS.pick(lines[tab] || ['Good day.']);
    },

    _tab_harbour(port) {
      const g = G(), pl = g.pl, p = g.player;
      const days = Math.floor(pl.rations / Math.max(1, p.crew));
      const per = 0.3;
      const fill = Math.max(0, Math.ceil((p.crew * 60 - pl.rations) * per));
      const offers = g.offerMissions(port).filter((m) => m.type === 'delivery');
      return `<div class="cols"><div>
          <h3>Provisions</h3>
          <p>Salt beef, biscuit, water and rum: <b>${days}</b> days for ${p.crew} hands.</p>
          <div class="row"><button class="btn" data-prov="15">+15 days (${Math.ceil(p.crew * 15 * per)}g)</button><button class="btn" data-prov="30">+30 days (${Math.ceil(p.crew * 30 * per)}g)</button><button class="btn" data-prov="fill" ${fill <= 0 ? 'disabled' : ''}>Fill to 60 days (${fill}g)</button></div>
          <h3>Port intelligence</h3>
          <p>Produces: ${port.produces.map((k) => `<span class="pill good">${HS.GOOD[k].name}</span>`).join(' ')}</p>
          <p>Wants: ${port.demands.map((k) => `<span class="pill">${HS.GOOD[k].name}</span>`).join(' ')}</p>
          <p class="note">${this.windNote(port)}</p>
          <div class="row"><button class="btn" id="hmSave">💾 Write the ship's log (save)</button></div>
        </div><div>
          <h3>Cargo contracts</h3>
          ${offers.length ? offers.map((m, i) => `<div class="mission"><b>${esc(m.title)}</b><p>${esc(m.text)}</p><small>Reward ${m.reward} gold</small><div class="row end"><button class="btn small primary" data-acc="${i}">Sign the contract</button></div></div>`).join('') : '<p><i>No consignments today, Captain.</i></p>'}
          ${pl.missions.filter((m) => m.type === 'delivery').map((m) => `<div class="mission done"><b>${esc(m.title)}</b><small>Due by day ${m.deadline} · today is day ${g.day()}</small></div>`).join('')}
        </div></div>`;
    },
    _wire_harbour(port) {
      const g = G(), pl = g.pl, p = g.player;
      this.portEl.querySelectorAll('[data-prov]').forEach((b) => (b.onclick = () => {
        const v = b.dataset.prov;
        const add = v === 'fill' ? Math.max(0, p.crew * 60 - pl.rations) : p.crew * +v;
        const cost = Math.ceil(add * 0.3);
        if (cost > pl.gold) return this.say(`You can't afford that, Captain.`);
        pl.gold -= cost; pl.rations += add; HS.Audio.coins();
        this.refresh(`Stores loaded aboard. That'll keep 'em fed.`);
      }));
      const offers = g.offerMissions(port).filter((m) => m.type === 'delivery');
      this.portEl.querySelectorAll('[data-acc]').forEach((b) => (b.onclick = () => {
        const err = g.acceptMission(offers[+b.dataset.acc]);
        this.refresh(err || `Signed and sealed. The cargo's being swayed aboard now — don't be late, Captain.`);
      }));
      $('#hmSave').onclick = () => { g.save(); this.say('The log is written up, Captain.'); };
    },
    windNote(port) {
      const lat = HS.toLonLat(port.x, port.y).lat, a = Math.abs(lat);
      if (a < 5) return 'Hereabouts lie the doldrums — light, fickle airs. Many a ship has lain becalmed for weeks.';
      if (a < 30) return `The ${lat > 0 ? 'north-east' : 'south-east'} trade winds blow steadily in these latitudes.`;
      if (a < 38) return 'The horse latitudes: variable winds and calms. Keep your water casks full.';
      if (a < 62) return lat < -38 ? 'The Roaring Forties: fierce westerlies — a fast run east, but mind your canvas.' : 'Prevailing westerlies blow in these latitudes.';
      return 'Polar easterlies, and ice not far off.';
    },

    _tab_market(port) {
      const g = G(), p = g.player, E = HS.Econ;
      const goods = HS.GOODS.filter((gd) => !gd.illicit || port.haven);
      const rows = goods.map((gd) => {
        const id = gd.id, b = E.buyPrice(port, id), s = E.sellPrice(port, id), have = p.cargo[id] || 0;
        const tag = port.produces.includes(id) ? '<span class="pill good">local</span>' : port.demands.includes(id) ? '<span class="pill hot">wanted</span>' : '';
        const cmp = b < gd.base * 0.75 ? 'good' : s > gd.base * 1.3 ? 'hot' : '';
        return `<tr class="${cmp}"><td>${gd.name} ${tag}</td><td class="num">${b}</td><td class="num">${s}</td><td class="num">${have || '—'}</td>
          <td class="acts"><button class="btn tiny" data-b="${id}" data-q="1">+1</button><button class="btn tiny" data-b="${id}" data-q="10">+10</button><button class="btn tiny" data-b="${id}" data-q="9999">Max</button></td>
          <td class="acts"><button class="btn tiny" data-b="${id}" data-q="-1" ${have ? '' : 'disabled'}>−1</button><button class="btn tiny" data-b="${id}" data-q="-10" ${have ? '' : 'disabled'}>−10</button><button class="btn tiny" data-b="${id}" data-q="-9999" ${have ? '' : 'disabled'}>All</button></td></tr>`;
      }).join('');
      const illicitHeld = !port.haven && p.cargo.contraband ? `<p class="note bad">You carry ${p.cargo.contraband} tons of contraband. No honest merchant will touch it — try the smuggler in the tavern, and beware the revenue cutters.</p>` : '';
      return `<p>Hold: <b>${p.cargoUsed()}</b> / ${p.cargoCap()} tons. Prices are in pieces of eight per ton.</p>${illicitHeld}
        <table class="tbl market"><tr><th>Goods</th><th>Buy</th><th>Sell</th><th>Hold</th><th>Buy</th><th>Sell</th></tr>${rows}</table>`;
    },
    _wire_market(port) {
      this.portEl.querySelectorAll('[data-b]').forEach((b) => (b.onclick = () => {
        const q = HS.Econ.trade(port, b.dataset.b, +b.dataset.q);
        if (q) HS.Audio.coins();
        const gd = HS.GOOD[b.dataset.b];
        this.refresh(q > 0 ? `${q} tons of ${gd.name.toLowerCase()}, sold to you. A pleasure.` : q < 0 ? `${-q} tons of ${gd.name.toLowerCase()} — I'll take it.` : `Can't do that, Captain — check your purse and your hold.`);
      }));
    },

    shipyardList(port) {
      const g = G(), pl = g.pl;
      const rep = port.nation === 'pirate' ? pl.rep.pirate : pl.rep[port.nation];
      return HS.SHIPYARD_ORDER.map((k) => {
        const T = HS.SHIPS[k];
        let ok = true, why = '';
        if (T.military && !port.haven && rep < 25) { ok = false; why = 'Navy vessels are sold only to friends of the Crown'; }
        if ((k === 'shipOfLine' || k === 'firstRate') && (!port.capital || rep < 50)) { ok = false; why = 'Ships of the line: capitals only, and you must be Honoured'; }
        if (port.haven && (k === 'shipOfLine' || k === 'firstRate' || k === 'indiaman')) { ok = false; why = 'Not to be had in a pirate haven'; }
        const price = Math.round(T.price * (port.haven ? 1.15 : 1));
        return { k, T, ok, why, price };
      });
    },
    _tab_shipyard(port) {
      const g = G(), p = g.player, pl = g.pl;
      const hullCost = p.hull < p.hullMax ? Math.ceil((p.hullMax - p.hull) * p.T.price * 0.0035 + 0.5) : 0;
      const sailCost = p.sails < p.sailsMax ? Math.ceil((p.sailsMax - p.sails) * p.T.price * 0.0025 + 0.5) : 0;
      const tradeIn = Math.round(p.T.price * 0.5 * (p.hull / p.hullMax));
      const list = this.shipyardList(port);
      return `<div class="cols"><div>
          <h3>Repairs</h3>
          <p>Hull ${Math.round(p.hull)}/${p.hullMax} · Sails ${Math.round(p.sails)}/${p.sailsMax}</p>
          <div class="row"><button class="btn" id="syHull" ${p.hull >= p.hullMax ? 'disabled' : ''}>${hullCost ? `Caulk & plank the hull (${hullCost}g)` : 'Hull is sound'}</button><button class="btn" id="sySails" ${p.sails >= p.sailsMax ? 'disabled' : ''}>${sailCost ? `New canvas & cordage (${sailCost}g)` : 'Sails are whole'}</button></div>
          <h3>Improvements</h3>
          ${HS.UPGRADES.map((u) => { const c = Math.round(p.T.price * u.price + 300); return `<div class="upg"><div><b>${u.name}</b><small>${u.desc}</small></div>${p.upgrades[u.id] ? '<span class="pill good">Fitted</span>' : `<button class="btn small" data-up="${u.id}" ${pl.gold < c ? 'disabled' : ''}>${c}g</button>`}</div>`; }).join('')}
          <h3>Rename your ship</h3>
          <div class="row"><input id="syName" maxlength="24" value="${esc(p.name)}"><button class="btn small" id="syRename">Paint the new name</button></div>
        </div><div>
          <h3>Vessels for sale <small>trade-in for your ${p.T.name}: ${tradeIn}g</small></h3>
          <div class="yard">${list.map((s) => `<div class="yardship ${s.ok ? '' : 'locked'} ${s.k === p.type ? 'cur' : ''}"><canvas width="150" height="76" data-prof="${s.k}"></canvas><div><b>${s.T.name}</b><small>${s.T.guns * 2} guns · ${s.T.cargo}t · ${s.T.speed}kn · crew ${s.T.crewMax}</small>${s.ok ? `<button class="btn small" data-buy="${s.k}" ${s.k === p.type || pl.gold + tradeIn < s.price ? 'disabled' : ''}>${s.price.toLocaleString()}g</button>` : `<small class="bad">${s.why}</small>`}</div></div>`).join('')}</div>
        </div></div>`;
    },
    _wire_shipyard(port) {
      const g = G(), p = g.player, pl = g.pl;
      this.portEl.querySelectorAll('canvas[data-prof]').forEach((c) => HS.drawShipProfile(c.getContext('2d'), c.dataset.prof, 75, 56, 0.4 * (64 / HS.SHIPS[c.dataset.prof].len), { nation: p.nation === 'pirate' ? 'british' : p.nation, furled: true }));
      $('#syHull').onclick = () => { const c = Math.ceil((p.hullMax - p.hull) * p.T.price * 0.0035 + 0.5); if (pl.gold < c) { const part = Math.floor(pl.gold / (p.T.price * 0.0035)); if (part <= 0) return this.say('No coin, no planks, Captain.'); pl.gold -= Math.ceil(part * p.T.price * 0.0035); p.hull += part; return this.refresh('That\'s all your purse will stretch to — she\'s partly mended.'); } pl.gold -= c; p.hull = p.hullMax; p.onFire = 0; HS.Audio.coins(); this.refresh('Sound as a bell, Captain. Tight as a drum below the waterline.'); };
      $('#sySails').onclick = () => { const c = Math.ceil((p.sailsMax - p.sails) * p.T.price * 0.0025 + 0.5); if (pl.gold < c) return this.say('That canvas costs money, Captain.'); pl.gold -= c; p.sails = p.sailsMax; HS.Audio.coins(); this.refresh('Fresh canvas bent on and new running rigging rove. She\'ll fly.'); };
      this.portEl.querySelectorAll('[data-up]').forEach((b) => (b.onclick = () => {
        const u = HS.UPGRADES.find((x) => x.id === b.dataset.up), c = Math.round(p.T.price * u.price + 300);
        if (pl.gold < c) return;
        pl.gold -= c; p.upgrades[u.id] = true;
        if (u.id === 'oak') { const r = p.hull / p.hullMax; p.hullMax = Math.round(p.T.hull * 1.2); p.hull = p.hullMax * r; }
        HS.Audio.coins();
        this.refresh(`${u.name} fitted. You'll feel the difference, Captain.`);
      }));
      $('#syRename').onclick = () => { const n = $('#syName').value.trim(); if (n) { p.name = n; this.refresh(`The ${n} — a fine name. Bad luck to rename a ship, mind... but I'll say no more.`); } };
      this.portEl.querySelectorAll('[data-buy]').forEach((b) => (b.onclick = () => {
        const k = b.dataset.buy, item = this.shipyardList(port).find((s) => s.k === k);
        const tradeIn = Math.round(p.T.price * 0.5 * (p.hull / p.hullMax));
        if (pl.gold + tradeIn < item.price) return;
        pl.gold = pl.gold + tradeIn - item.price;
        const ns = new HS.Ship(k, { x: p.x, y: p.y, angle: p.angle, isPlayer: true, nation: p.nation, role: 'player', name: p.name, crew: Math.min(p.crew, HS.SHIPS[k].crewMax), sail: 0 });
        let room = ns.cargoCap(); ns.cargo = {};
        for (const gd in p.cargo) { const q = Math.min(room, p.cargo[gd]); if (q > 0) { ns.cargo[gd] = q; room -= q; } }
        ns.captain = p.captain;
        g.ships[g.ships.indexOf(p)] = ns; g.player = ns;
        HS.Audio.coins(); HS.Audio.bell(2);
        g.log(`Purchased the ${ns.T.name} ${ns.name}.`, '#9fe8a0');
        this.refresh(`She's yours, Captain — the finest ${ns.T.name.toLowerCase()} on the station. You'll want more hands to work her.`);
      }));
    },

    _tab_tavern(port) {
      const g = G(), pl = g.pl, p = g.player;
      const day = g.day(), week = Math.floor(day / 7);
      const pool = Math.floor(10 + HS.hash(port.id, day) * 50) - (this.hired && this.hired[`${port.id}:${day}`] || 0);
      const wage = port.haven ? 9 : 14;
      const mapAvail = HS.hash(port.id * 3, week) < 0.45 && !(pl.boughtMap && pl.boughtMap[`${port.id}:${week}`]);
      const mapPrice = Math.round(350 + HS.hash(week, port.id) * 550);
      const smuggler = port.haven || HS.hash(port.id + 5, week) < 0.4;
      const contraHeld = p.cargo.contraband || 0;
      const cBuy = Math.round(HS.GOOD.contraband.base * 0.6), cSell = HS.Econ.sellPrice(port, 'contraband');
      return `<div class="cols"><div>
          <h3>Sign on hands</h3>
          <p>${Math.max(0, pool)} able seamen are drinking here and looking for a berth. Signing bounty: ${wage}g a head. You have ${p.crew} of ${p.T.crewMax}.</p>
          <div class="row"><button class="btn" data-hire="1">+1</button><button class="btn" data-hire="10">+10</button><button class="btn" data-hire="999">All that will come</button></div>
          <h3>Drink & gossip</h3>
          <div class="row"><button class="btn" id="tvRound">Buy a round for the house (60g)</button><button class="btn" id="tvSalt">Buy the old salt a rum (15g)</button></div>
        </div><div>
          ${mapAvail ? `<div class="mission treasure"><b>🗺 A one-eyed stranger beckons…</b><p>"Psst. Cap'n. I've a map here — came off a dead man in Port Royal. Real as the sea, I swear it."</p><div class="row end"><button class="btn primary small" id="tvMap" ${pl.gold < mapPrice ? 'disabled' : ''}>Buy the map (${mapPrice}g)</button></div></div>` : ''}
          ${smuggler ? `<div class="mission"><b>🕯 A smuggler in a dark corner</b><p>"No questions asked, no duties paid."</p>
            <div class="row"><button class="btn small" id="tvCBuy" ${port.haven ? 'disabled' : ''}>Buy 10t contraband (${cBuy * 10}g)</button><button class="btn small" id="tvCSell" ${contraHeld ? '' : 'disabled'}>Sell all contraband (${cSell}g/t)</button></div>${port.haven ? '<small>In a haven, contraband trades openly in the market.</small>' : ''}</div>` : '<p class="note">No smugglers tonight — the revenue men have been sniffing about.</p>'}
        </div></div>`;
    },
    _wire_tavern(port) {
      const g = G(), pl = g.pl, p = g.player;
      const day = g.day(), week = Math.floor(day / 7);
      const wage = port.haven ? 9 : 14;
      this.hired = this.hired || {};
      this.portEl.querySelectorAll('[data-hire]').forEach((b) => (b.onclick = () => {
        const key = `${port.id}:${day}`;
        const pool = Math.floor(10 + HS.hash(port.id, day) * 50) - (this.hired[key] || 0);
        const n = Math.min(+b.dataset.hire, pool, p.T.crewMax - p.crew, Math.floor(pl.gold / wage));
        if (n <= 0) return this.say(pool <= 0 ? 'Every sailor in the house has already signed on with you!' : p.crew >= p.T.crewMax ? 'Your ship is full to the gunwales with hands already.' : 'They want their bounty in coin, Captain.');
        pl.gold -= n * wage; p.crew += n; this.hired[key] = (this.hired[key] || 0) + n;
        HS.Audio.coins();
        this.refresh(`${n} ${n === 1 ? 'hand signs' : 'hands sign'} the articles and stumble down to the boat.`);
      }));
      $('#tvRound').onclick = () => { if (pl.gold < 60) return this.say('Can\'t buy a round on credit, Captain.'); pl.gold -= 60; pl.fame += 3; HS.Audio.coins(); this.refresh(`"To Captain ${pl.name}!" — and a sailor leans in: "${g.rumour()}"`); };
      $('#tvSalt').onclick = () => { if (pl.gold < 15) return; pl.gold -= 15; const salt = HS.makeNPC('oldsalt', port); HS.Dialog.show(salt, g.rumour(), [{ label: '"Thank\'ee, old timer."' }]); this.refresh(); };
      const mapBtn = $('#tvMap');
      if (mapBtn) mapBtn.onclick = () => {
        const price = Math.round(350 + HS.hash(week, port.id) * 550);
        if (pl.gold < price) return;
        pl.gold -= price; (pl.boughtMap || (pl.boughtMap = {}))[`${port.id}:${week}`] = true;
        const m = g.newTreasureMap(true);
        HS.Audio.coins();
        this.refresh(`The stranger presses a stained parchment into your hand: "${m.title}." ${m.clue}`);
      };
      const cb = $('#tvCBuy'), cs = $('#tvCSell');
      if (cb) cb.onclick = () => { const c = Math.round(HS.GOOD.contraband.base * 0.6) * 10; if (pl.gold < c || p.cargoCap() - p.cargoUsed() < 10) return this.say('No room or no coin, friend.'); pl.gold -= c; p.cargo.contraband = (p.cargo.contraband || 0) + 10; this.refresh('Ten tons, stowed under the ballast. Mind the cutters.'); };
      if (cs) cs.onclick = () => { const q = p.cargo.contraband || 0; const v = q * HS.Econ.sellPrice(port, 'contraband'); pl.gold += v; delete p.cargo.contraband; pl.notoriety = Math.min(100, pl.notoriety + 1); HS.Audio.coins(); this.refresh(`${q} tons, ${v} gold. Pleasure doing business.`); };
    },

    _tab_governor(port) {
      const g = G(), pl = g.pl;
      const offers = g.offerMissions(port).filter((m) => m.type === 'bounty');
      const pardon = Math.round(pl.notoriety * 60 + 200);
      const active = pl.missions.filter((m) => m.type === 'bounty');
      return `<div class="cols"><div>
          <h3>${port.haven ? 'Jobs for the Brethren' : 'Commissions'}</h3>
          ${offers.length ? offers.map((m, i) => `<div class="mission"><b>${esc(m.title)}</b><p>${esc(m.text)}</p><small>Reward ${m.reward} gold · Ship: ${HS.SHIPS[m.shipType].name}</small><div class="row end"><button class="btn small primary" data-acc="${i}">Accept</button></div></div>`).join('') : '<p><i>Nothing for you this week. Come back in a few days.</i></p>'}
          ${active.map((m) => `<div class="mission done"><b>${esc(m.title)}</b><small>${m.done ? 'Complete — claim in a ' + HS.NATIONS[m.giver].adj + ' port' : 'In progress · see your chart'}</small></div>`).join('')}
        </div><div>
          <h3>Your standing</h3>
          <p>Rank: <b>${g.rank()}</b> · Fame ${Math.round(pl.fame)} · Notoriety ${Math.round(pl.notoriety)}</p>
          ${port.haven ? `<p>The Brethren regard you as: <b>${g.repName(pl.rep.pirate)}</b>.</p><p class="note">Sink pirates and the Brethren will remember. Raid merchants and they'll toast your name.</p>`
            : `<p>${HS.NATIONS[port.nation].name} regards you as: <b>${g.repName(pl.rep[port.nation])}</b>.</p>
               ${pl.notoriety > 15 ? `<div class="mission"><b>📜 A Royal Pardon</b><p>For a "donation" to the colonial treasury, the Governor will see your past… forgotten.</p><div class="row end"><button class="btn small" id="gvPardon" ${pl.gold < pardon ? 'disabled' : ''}>Purchase pardon (${pardon}g)</button></div></div>` : '<p class="note">Your record is clean, Captain.</p>'}`}
        </div></div>`;
    },
    _wire_governor(port) {
      const g = G(), pl = g.pl;
      const offers = g.offerMissions(port).filter((m) => m.type === 'bounty');
      this.portEl.querySelectorAll('[data-acc]').forEach((b) => (b.onclick = () => {
        const m = offers[+b.dataset.acc];
        g.acceptMission(m);
        this.refresh(port.haven ? `Bring back that silver and we'll drink to your health. It's marked on your chart.` : `Excellent. I've marked the scoundrel's last known position on your chart. Bring me news of his end.`);
      }));
      const pb = $('#gvPardon');
      if (pb) pb.onclick = () => {
        const pardon = Math.round(pl.notoriety * 60 + 200);
        if (pl.gold < pardon) return;
        pl.gold -= pardon; pl.notoriety = Math.max(0, pl.notoriety - 25);
        g.changeRep(port.nation, 15, true);
        for (const k in pl.rep) if (k !== 'pirate' && pl.rep[k] < -20) pl.rep[k] = Math.min(pl.rep[k] + 8, 100);
        HS.Audio.coins();
        this.refresh(`By the authority vested in me... your past misdeeds are pardoned. Don't make me regret it.`);
      };
    },

    // ------------------------------------------------------------ port scene painting
    _drawPortScene(dt) {
      this.portT += dt;
      const c = this.portCanvas, ctx = c.getContext('2d');
      if (c.width !== Math.round(window.innerWidth * Math.min(1.5, window.devicePixelRatio || 1))) this._resizePortCanvas();
      const k = c.width / window.innerWidth;
      const w = window.innerWidth, h = window.innerHeight;
      ctx.setTransform(k, 0, 0, k, 0, 0);
      const port = this.port, t = this.portT, g = G();
      const night = g.night();
      const style = port.style;
      const rnd = HS.rng(port.seed);
      // sky
      const sky = ctx.createLinearGradient(0, 0, 0, h * 0.62);
      const hr = g.hour();
      const dusk = (hr > 17 && hr < 20.5) || (hr > 5 && hr < 7.5);
      if (night > 0.8) { sky.addColorStop(0, '#060b1d'); sky.addColorStop(1, '#1b2448'); }
      else if (dusk) { sky.addColorStop(0, '#2c3a6e'); sky.addColorStop(0.6, '#d97a4a'); sky.addColorStop(1, '#f2c27a'); }
      else { sky.addColorStop(0, '#5fa8d8'); sky.addColorStop(1, '#cfe8f2'); }
      ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
      if (night > 0.6) {
        for (let i = 0; i < 120; i++) { ctx.fillStyle = `rgba(255,255,255,${0.4 + 0.5 * HS.hash(i, 3) * (0.6 + 0.4 * Math.sin(t * 2 + i))})`; ctx.fillRect(HS.hash(i, 1) * w, HS.hash(i, 2) * h * 0.5, 1.4, 1.4); }
        ctx.fillStyle = '#f4f0dc'; ctx.beginPath(); ctx.arc(w * 0.8, h * 0.14, 26, 0, HS.TAU); ctx.fill();
      } else {
        const sx = dusk ? (hr < 12 ? w * 0.15 : w * 0.85) : w * 0.72, sy = dusk ? h * 0.42 : h * 0.13;
        const sg = ctx.createRadialGradient(sx, sy, 0, sx, sy, 140);
        sg.addColorStop(0, 'rgba(255,250,220,1)'); sg.addColorStop(0.15, 'rgba(255,240,190,0.9)'); sg.addColorStop(1, 'rgba(255,220,150,0)');
        ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(sx, sy, 140, 0, HS.TAU); ctx.fill();
      }
      // clouds
      for (let i = 0; i < 6; i++) {
        const cx = ((HS.hash(i, 9) * w + t * (8 + i * 3)) % (w + 400)) - 200, cy = h * (0.08 + HS.hash(i, 4) * 0.22);
        ctx.fillStyle = night > 0.8 ? 'rgba(80,90,120,0.35)' : dusk ? 'rgba(255,200,170,0.6)' : 'rgba(255,255,255,0.75)';
        for (let j = 0; j < 5; j++) { ctx.beginPath(); ctx.ellipse(cx + j * 34, cy + Math.sin(j) * 8, 46, 20, 0, 0, HS.TAU); ctx.fill(); }
      }
      const horizon = h * 0.4;
      // far hills
      const hillCol = { euro: ['#6f8a6a', '#557055'], carib: ['#3e7a4a', '#2f6239'], asia: ['#5d7a68', '#466352'], arab: ['#c7a77a', '#a88b62'], africa: ['#7d8f4e', '#62743c'], pirate: ['#3f6e45', '#2d5434'] }[style] || ['#6f8a6a', '#557055'];
      for (let layer = 0; layer < 2; layer++) {
        ctx.fillStyle = night > 0.8 ? (layer ? '#141c2c' : '#1b2436') : hillCol[layer];
        ctx.beginPath(); ctx.moveTo(0, horizon);
        for (let x = 0; x <= w; x += 20) ctx.lineTo(x, horizon - 40 - layer * 30 - Math.sin(x * 0.004 + layer * 2 + port.seed % 7) * 50 - Math.sin(x * 0.013 + layer) * 18);
        ctx.lineTo(w, horizon); ctx.fill();
      }
      // town
      this._drawTown(ctx, w, horizon, style, rnd, t, night);
      // sea
      const sea = ctx.createLinearGradient(0, horizon, 0, h);
      sea.addColorStop(0, night > 0.8 ? '#0e1f35' : dusk ? '#5a6a8a' : '#2e7fa8'); sea.addColorStop(1, night > 0.8 ? '#050c18' : '#0d3f5f');
      ctx.fillStyle = sea; ctx.fillRect(0, horizon, w, h - horizon);
      ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 1.2;
      for (let i = 0; i < 26; i++) {
        const y = horizon + 8 + i * i * 0.9;
        ctx.beginPath();
        for (let x = -20; x <= w + 20; x += 24) ctx.lineTo(x, y + Math.sin(x * 0.03 + t * 1.5 + i) * (1 + i * 0.12));
        ctx.stroke();
      }
      // quay
      const qy = h * 0.5;
      ctx.fillStyle = '#6a4a2a'; ctx.fillRect(0, qy, w * 0.42, 16);
      ctx.fillStyle = '#4a321c'; for (let x = 10; x < w * 0.42; x += 40) ctx.fillRect(x, qy + 16, 8, h * 0.08);
      ctx.fillStyle = '#8a6a44'; ctx.fillRect(0, qy - 3, w * 0.42, 4);
      // crates & barrels
      for (let i = 0; i < 6; i++) { const x = 30 + i * 60 * (w / 1400) + (i % 2) * 14; ctx.fillStyle = i % 2 ? '#7a5532' : '#8a6a3a'; if (i % 3 === 0) { ctx.beginPath(); ctx.ellipse(x, qy - 10, 9, 11, 0, 0, HS.TAU); ctx.fill(); ctx.strokeStyle = '#3a2a14'; ctx.stroke(); } else { ctx.fillRect(x - 10, qy - 20, 20, 18); ctx.strokeStyle = '#4a321c'; ctx.strokeRect(x - 10, qy - 20, 20, 18); } }
      // people walking on the quay
      for (let i = 0; i < 7; i++) {
        const speed = 18 + HS.hash(i, 77) * 22, dir = i % 2 ? 1 : -1;
        const span = w * 0.4;
        let x = (HS.hash(i, 5) * span + t * speed * dir) % span; if (x < 0) x += span;
        this._person(ctx, x, qy - 2, i, t, dir, night);
      }
      // other ships at anchor
      HS.drawShipProfile(ctx, HS.pick(['brigantine', 'fluyt', 'schooner'], rnd), w * 0.82, horizon + 22, 0.55, { t: t + 2, nation: port.nation === 'pirate' ? 'pirate' : port.nation, pirate: port.nation === 'pirate', furled: true });
      // your ship alongside
      const p = g.player;
      const sc = HS.clamp(Math.min(w / 1400, h / 900) * (64 / p.T.len) * 1.05, 0.45, 1.4);
      HS.drawShipProfile(ctx, p.type, w * 0.62, qy + 6, sc, { t, nation: p.nation === 'pirate' ? 'pirate' : p.nation, pirate: p.nation === 'pirate', furled: true });
      // gulls
      ctx.strokeStyle = night > 0.8 ? 'rgba(200,200,220,0.5)' : '#2a2a2a'; ctx.lineWidth = 1.6;
      for (let i = 0; i < 5; i++) {
        const gx = (HS.hash(i, 11) * w + t * (30 + i * 9)) % (w + 100) - 50, gy = h * 0.15 + HS.hash(i, 12) * h * 0.2 + Math.sin(t * 1.3 + i) * 12;
        const f = Math.sin(t * 8 + i) * 5;
        ctx.beginPath(); ctx.moveTo(gx - 9, gy - f); ctx.quadraticCurveTo(gx - 4, gy - 4, gx, gy); ctx.quadraticCurveTo(gx + 4, gy - 4, gx + 9, gy - f); ctx.stroke();
      }
      if (night > 0.3) { ctx.fillStyle = `rgba(5,10,30,${night * 0.45})`; ctx.fillRect(0, 0, w, h); }
      // animated NPC portrait
      const nc = this.npcCanvas;
      if (nc && this.portNpc) HS.drawPortrait(nc.getContext('2d'), this.portNpc, nc.width, nc.height, { t, talking: this.npcTalking && HS.Voice.speaking || (this.npcTalking && !HS.Voice.on && t % 4 < 2) });
    },
    _person(ctx, x, y, i, t, dir, night) {
      const bob = Math.abs(Math.sin(t * 6 + i)) * 2;
      const coats = ['#7a2a2a', '#2a3a6a', '#4a4a3a', '#6a5a3a', '#e8e2d0', '#3a5a3a'];
      const skin = ['#e8b996', '#b97a52', '#6b412a', '#f1d0b5'][i % 4];
      ctx.save(); ctx.translate(x, y - bob);
      ctx.strokeStyle = '#2a1a10'; ctx.lineWidth = 2.5;
      const leg = Math.sin(t * 6 + i) * 4;
      ctx.beginPath(); ctx.moveTo(-2, -12); ctx.lineTo(-2 + leg, 0); ctx.moveTo(2, -12); ctx.lineTo(2 - leg, 0); ctx.stroke();
      ctx.fillStyle = coats[i % coats.length]; ctx.fillRect(-5, -27, 10, 16);
      if (i % 3 === 1) { ctx.fillStyle = '#7a5532'; ctx.beginPath(); ctx.ellipse(dir * 7, -28, 6, 7, 0, 0, HS.TAU); ctx.fill(); }
      ctx.fillStyle = skin; ctx.beginPath(); ctx.arc(0, -32, 4.5, 0, HS.TAU); ctx.fill();
      ctx.fillStyle = '#1a1a1a';
      if (i % 2) { ctx.beginPath(); ctx.moveTo(-8, -35); ctx.lineTo(8, -35); ctx.lineTo(0, -41); ctx.fill(); }
      else { ctx.fillRect(-5, -38, 10, 3); }
      ctx.restore();
      void night;
    },
    _drawTown(ctx, w, horizon, style, rnd, t, night) {
      const n = 16;
      const baseY = horizon;
      const winLit = night > 0.5;
      for (let i = 0; i < n; i++) {
        const bw = 40 + rnd() * 50, bh = 30 + rnd() * 60;
        const x = (i / n) * w * 1.05 - 20 + rnd() * 20;
        const y = baseY - 6 - rnd() * 34;
        ctx.save(); ctx.translate(x, y);
        switch (style) {
          case 'arab': {
            ctx.fillStyle = HS.pick(['#efe8d8', '#e3d7bd', '#f4efe2'], rnd); ctx.fillRect(0, -bh, bw, bh);
            if (rnd() < 0.3) { ctx.fillStyle = '#d9b44a'; ctx.beginPath(); ctx.arc(bw / 2, -bh, bw * 0.32, Math.PI, HS.TAU); ctx.fill(); }
            if (rnd() < 0.15) { ctx.fillStyle = '#efe8d8'; ctx.fillRect(bw * 0.8, -bh - 60, 8, 60); ctx.fillStyle = '#d9b44a'; ctx.beginPath(); ctx.moveTo(bw * 0.8 - 2, -bh - 60); ctx.lineTo(bw * 0.8 + 4, -bh - 74); ctx.lineTo(bw * 0.8 + 10, -bh - 60); ctx.fill(); }
            break;
          }
          case 'asia': {
            ctx.fillStyle = HS.pick(['#8a3a2a', '#e8dcc0', '#6a4a3a'], rnd); ctx.fillRect(4, -bh, bw - 8, bh);
            const tiers = rnd() < 0.2 ? 3 : 1;
            for (let k = 0; k < tiers; k++) {
              const ty = -bh - k * 18, tw = bw * (1 - k * 0.2);
              ctx.fillStyle = '#2f3537';
              ctx.beginPath(); ctx.moveTo((bw - tw) / 2 - 10, ty + 2); ctx.quadraticCurveTo(bw / 2, ty - 6, (bw + tw) / 2 + 10, ty + 2); ctx.lineTo((bw + tw) / 2 - 6, ty - 12); ctx.lineTo((bw - tw) / 2 + 6, ty - 12); ctx.fill();
              if (k < tiers - 1) { ctx.fillStyle = '#8a3a2a'; ctx.fillRect((bw - tw) / 2 + 8, ty - 22, tw - 16, 10); }
            }
            if (winLit || rnd() < 0.5) { ctx.fillStyle = '#e8402a'; ctx.beginPath(); ctx.ellipse(bw / 2, -bh * 0.5, 4, 6, 0, 0, HS.TAU); ctx.fill(); }
            break;
          }
          case 'pirate': case 'africa': {
            ctx.fillStyle = style === 'pirate' ? HS.pick(['#6b4b2e', '#5b4630', '#7a5a38'], rnd) : '#c4a46b';
            ctx.fillRect(0, -bh * 0.6, bw * 0.8, bh * 0.6);
            ctx.fillStyle = style === 'pirate' ? '#4a3220' : '#9c7c47';
            ctx.beginPath(); ctx.moveTo(-6, -bh * 0.6); ctx.lineTo(bw * 0.4, -bh * 0.6 - 22); ctx.lineTo(bw * 0.8 + 6, -bh * 0.6); ctx.fill();
            if (rnd() < 0.5) HS.World.drawPalm(ctx, bw, -bh * 0.9, 2.2, t + i);
            break;
          }
          case 'carib': {
            ctx.fillStyle = HS.pick(['#f2d27a', '#8ad0c8', '#f29a8a', '#f4efe2', '#b8d88a'], rnd); ctx.fillRect(0, -bh, bw, bh);
            ctx.fillStyle = '#b9473a'; ctx.beginPath(); ctx.moveTo(-5, -bh); ctx.lineTo(bw / 2, -bh - 20); ctx.lineTo(bw + 5, -bh); ctx.fill();
            ctx.fillStyle = '#5a3a1c'; ctx.fillRect(0, -bh * 0.5, bw, 3);
            if (rnd() < 0.4) HS.World.drawPalm(ctx, bw + 6, -bh * 0.8, 2, t + i);
            break;
          }
          default: {
            ctx.fillStyle = HS.pick(['#9a5a3a', '#cfc6b4', '#8a8a8a', '#b07050', '#d8cdb0'], rnd); ctx.fillRect(0, -bh, bw, bh);
            ctx.fillStyle = HS.pick(['#4a4a52', '#7a3a2a'], rnd);
            ctx.beginPath(); ctx.moveTo(-3, -bh); ctx.lineTo(bw / 2, -bh - 24); ctx.lineTo(bw + 3, -bh); ctx.fill();
            if (rnd() < 0.12) { ctx.fillStyle = '#6a6a6a'; ctx.fillRect(bw * 0.4, -bh - 70, 12, 50); ctx.beginPath(); ctx.moveTo(bw * 0.4 - 2, -bh - 70); ctx.lineTo(bw * 0.4 + 6, -bh - 100); ctx.lineTo(bw * 0.4 + 14, -bh - 70); ctx.fill(); }
          }
        }
        // windows
        ctx.fillStyle = winLit ? 'rgba(255,210,120,0.95)' : 'rgba(40,40,50,0.6)';
        const rows = Math.max(1, Math.floor(bh / 22));
        for (let r = 0; r < rows; r++) for (let cI = 0; cI < Math.floor(bw / 18); cI++) if (HS.hash(i * 13 + r, cI) < 0.7) ctx.fillRect(8 + cI * 16, -bh + 8 + r * 20, 5, 7);
        ctx.restore();
      }
      // fort with flag
      const fx = w * 0.88, fy = baseY - 48;
      ctx.fillStyle = '#8f887c'; ctx.fillRect(fx - 60, fy, 120, 40);
      for (let i = 0; i < 6; i++) ctx.fillRect(fx - 60 + i * 22, fy - 8, 12, 8);
      ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(fx, fy - 8); ctx.lineTo(fx, fy - 60); ctx.stroke();
      HS.drawFlag(ctx, this.port.nation, fx, fy - 60, 36, 22, t);
    },

    // ------------------------------------------------------------ sea chart
    _initChart() {
      const c = $('#chartCanvas');
      this.chart = { x: 0, y: 0, z: 0.05, drag: null, hover: null };
      c.addEventListener('wheel', (e) => { e.preventDefault(); const ch = this.chart; const before = this._chartToWorld(e.clientX, e.clientY); ch.z = HS.clamp(ch.z * (e.deltaY > 0 ? 0.85 : 1.18), 0.03, 0.6); const after = this._chartToWorld(e.clientX, e.clientY); ch.x -= HS.dxw(before.x, after.x); ch.y -= after.y - before.y; this.drawChart(); }, { passive: false });
      c.addEventListener('pointerdown', (e) => { this.chart.drag = { x: e.clientX, y: e.clientY, cx: this.chart.x, cy: this.chart.y }; c.setPointerCapture(e.pointerId); });
      c.addEventListener('pointermove', (e) => {
        const ch = this.chart;
        if (ch.drag) { ch.x = HS.wrapX(ch.drag.cx - (e.clientX - ch.drag.x) / ch.z); ch.y = ch.drag.cy - (e.clientY - ch.drag.y) / ch.z; this.drawChart(); return; }
        const wpt = this._chartToWorld(e.clientX, e.clientY);
        let hov = null;
        for (const p of HS.World.ports) if (HS.distW(p.x, p.y, wpt.x, wpt.y) * ch.z < 10) hov = p;
        if (hov !== ch.hover) { ch.hover = hov; this.drawChart(); }
      });
      c.addEventListener('pointerup', () => { this.chart.drag = null; });
      $('#chartClose').onclick = () => this.hideChart();
    },
    _chartToWorld(sx, sy) { const ch = this.chart; return { x: HS.wrapX(ch.x + (sx - window.innerWidth / 2) / ch.z), y: ch.y + (sy - window.innerHeight / 2) / ch.z }; },
    showChart() {
      const g = G();
      this.chartEl.classList.remove('hidden');
      if (g.state === 'sea') { this.chartPaused = true; g.state = 'paused'; }
      const p = g.player;
      this.chart.x = p.x; this.chart.y = p.y;
      if (!this.chart.opened) { this.chart.z = 0.06; this.chart.opened = true; }
      if (!this.sepia) {
        const W = HS.World, src = W.terrain;
        const c = document.createElement('canvas'); c.width = src.width / 2; c.height = src.height / 2;
        const x = c.getContext('2d');
        x.drawImage(src, 0, 0, c.width, c.height);
        // antique tint via a colour blend (cheaper than a CSS filter on software renderers)
        x.globalCompositeOperation = 'color'; x.fillStyle = '#a8814a'; x.fillRect(0, 0, c.width, c.height);
        x.globalCompositeOperation = 'source-atop'; x.globalAlpha = 0.18; x.fillStyle = '#f4e4c0'; x.fillRect(0, 0, c.width, c.height);
        this.sepia = c;
      }
      this.drawChart();
    },
    hideChart() {
      this.chartEl.classList.add('hidden');
      if (this.chartPaused && G().state === 'paused') G().state = 'sea';
      this.chartPaused = false;
    },
    drawChart() {
      const c = $('#chartCanvas');
      const dpr = Math.min(1.5, window.devicePixelRatio || 1);
      const w = window.innerWidth, h = window.innerHeight;
      if (c.width !== Math.round(w * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); }
      const ctx = c.getContext('2d');
      const ch = this.chart, z = ch.z, g = G(), W = HS.World, pl = g.pl;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = '#d9c8a0'; ctx.fillRect(0, 0, w, h);
      const left = ch.x - w / 2 / z;
      const offsets = [0];
      if (left < 0) offsets.push(-HS.W);
      if (ch.x + w / 2 / z > HS.W) offsets.push(HS.W);
      for (const off of offsets) {
        ctx.save();
        ctx.setTransform(z * dpr, 0, 0, z * dpr, (w / 2 - (ch.x - off) * z) * dpr, (h / 2 - ch.y * z) * dpr);
        ctx.fillStyle = '#c9e0dc'; ctx.globalAlpha = 0.5; ctx.fillRect(0, 0, HS.W, HS.H); ctx.globalAlpha = 1;
        ctx.strokeStyle = 'rgba(80,120,130,0.35)'; ctx.lineWidth = 50; ctx.stroke(W.landPath);
        ctx.save(); ctx.clip(W.landPath);
        ctx.drawImage(this.sepia, 0, 0, HS.W, HS.H);
        ctx.restore();
        ctx.strokeStyle = '#5a4020'; ctx.lineWidth = 1.4 / z; ctx.stroke(W.landPath);
        ctx.fillStyle = '#b8cfc8'; ctx.fill(W.lakePath);
        // ice
        ctx.fillStyle = 'rgba(240,245,245,0.85)'; ctx.fillRect(0, -2000, HS.W, W.iceTop + 2000); ctx.fillRect(0, W.iceBot, HS.W, 4000);
        ctx.restore();
      }
      const toS = (x, y) => ({ x: HS.dxw(ch.x, x) * z + w / 2, y: (y - ch.y) * z + h / 2 });
      // graticule
      ctx.strokeStyle = 'rgba(90,60,30,0.25)'; ctx.lineWidth = 1; ctx.font = '11px Georgia, serif'; ctx.fillStyle = 'rgba(70,45,20,0.8)';
      for (let lon = -180; lon < 180; lon += 15) { const s = toS(HS.toWorld(lon, 0).x, 0); ctx.beginPath(); ctx.moveTo(s.x, 0); ctx.lineTo(s.x, h); ctx.stroke(); ctx.fillText(HS.fmtLon(lon).replace('00′', ''), s.x + 3, 14); }
      for (let lat = -60; lat <= 75; lat += 15) { const s = toS(0, HS.toWorld(0, lat).y); ctx.beginPath(); ctx.moveTo(0, s.y); ctx.lineTo(w, s.y); ctx.stroke(); ctx.fillText(HS.fmtLat(lat).replace('00′', ''), 4, s.y - 3); }
      ctx.setLineDash([8, 6]); ctx.strokeStyle = 'rgba(150,40,30,0.4)';
      for (const lat of [0, 23.44, -23.44]) { const s = toS(0, HS.toWorld(0, lat).y); ctx.beginPath(); ctx.moveTo(0, s.y); ctx.lineTo(w, s.y); ctx.stroke(); }
      ctx.setLineDash([]);
      // prevailing winds
      ctx.strokeStyle = 'rgba(60,90,120,0.35)'; ctx.fillStyle = 'rgba(60,90,120,0.35)'; ctx.lineWidth = 1.5;
      for (let lat = -50; lat <= 55; lat += 10) for (let lon = -170; lon < 180; lon += 20) {
        const wp = HS.toWorld(lon, lat);
        if (W.isLand(wp.x, wp.y)) continue;
        const a = Math.abs(lat);
        const dir = a < 5 ? null : a < 30 ? (lat > 0 ? 2.35 : -2.35) : a < 38 ? null : (lat > 0 ? -0.3 : 0.25);
        if (dir === null) continue;
        const s = toS(wp.x, wp.y), L = 14;
        ctx.beginPath(); ctx.moveTo(s.x - Math.cos(dir) * L, s.y - Math.sin(dir) * L); ctx.lineTo(s.x + Math.cos(dir) * L, s.y + Math.sin(dir) * L); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(s.x + Math.cos(dir) * L, s.y + Math.sin(dir) * L); ctx.lineTo(s.x + Math.cos(dir + 2.6) * 6 + Math.cos(dir) * L, s.y + Math.sin(dir + 2.6) * 6 + Math.sin(dir) * L); ctx.lineTo(s.x + Math.cos(dir - 2.6) * 6 + Math.cos(dir) * L, s.y + Math.sin(dir - 2.6) * 6 + Math.sin(dir) * L); ctx.fill();
      }
      // isles
      ctx.font = 'italic 11px Georgia, serif'; ctx.textAlign = 'center';
      for (const isle of W.isles) {
        if (!isle.discovered) continue;
        const s = toS(isle.x, isle.y);
        ctx.fillStyle = '#6a4a20'; ctx.fillText(isle.name, s.x, s.y + 14);
      }
      // ports
      ctx.font = '600 11px Georgia, serif';
      for (const p of W.ports) {
        const s = toS(p.x, p.y);
        if (s.x < -50 || s.x > w + 50 || s.y < -50 || s.y > h + 50) continue;
        const hostile = g.portHostile(p);
        ctx.fillStyle = HS.NATIONS[p.nation].color;
        ctx.beginPath(); ctx.arc(s.x, s.y, 4.5, 0, HS.TAU); ctx.fill();
        ctx.strokeStyle = hostile ? '#c0261c' : '#2a1a0a'; ctx.lineWidth = hostile ? 2.5 : 1; ctx.stroke();
        if (z > 0.09 || p.capital || p === ch.hover) { ctx.fillStyle = pl && pl.visited.includes(p.id) ? '#2a1a0a' : '#6a5a40'; ctx.fillText(p.name, s.x, s.y - 8); }
      }
      // missions
      if (pl) {
        for (const m of pl.missions) {
          if (m.type === 'bounty' && !m.done) {
            const s = toS(m.x, m.y);
            ctx.strokeStyle = '#a01818'; ctx.setLineDash([5, 4]); ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(s.x, s.y, 1500 * z, 0, HS.TAU); ctx.stroke(); ctx.setLineDash([]);
            ctx.fillStyle = '#a01818'; ctx.fillText(m.role === 'merchant' ? '💰 ' + m.shipName : '☠ ' + m.shipName, s.x, s.y);
          }
          if (m.type === 'delivery') {
            const dp = W.ports[m.dest], s = toS(dp.x, dp.y);
            ctx.strokeStyle = '#c08a10'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(s.x, s.y, 10, 0, HS.TAU); ctx.stroke();
          }
        }
        for (const m of pl.maps) {
          if (m.found) continue;
          const s = toS(m.x, m.y);
          ctx.strokeStyle = '#b01c10'; ctx.lineWidth = 3.5;
          ctx.beginPath(); ctx.moveTo(s.x - 8, s.y - 8); ctx.lineTo(s.x + 8, s.y + 8); ctx.moveTo(s.x + 8, s.y - 8); ctx.lineTo(s.x - 8, s.y + 8); ctx.stroke();
        }
      }
      // ship
      const p = g.player;
      if (p) {
        const s = toS(p.x, p.y);
        ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(p.angle);
        ctx.fillStyle = '#1a1a1a'; ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(-8, -6); ctx.lineTo(-4, 0); ctx.lineTo(-8, 6); ctx.closePath(); ctx.fill();
        ctx.restore();
        ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.beginPath(); ctx.arc(s.x, s.y, 16, 0, HS.TAU); ctx.stroke();
      }
      // compass rose
      this._rose(ctx, w - 90, h - 100, 60);
      // title cartouche
      ctx.textAlign = 'left';
      ctx.fillStyle = 'rgba(70,45,20,0.9)'; ctx.font = 'italic 22px Georgia, serif';
      ctx.fillText('A New & Accurate Chart of the Known World', 20, h - 46);
      ctx.font = '12px Georgia, serif';
      ctx.fillText('Scroll to zoom · drag to pan · M or Esc to close · ✕ = buried treasure · dashed red = bounty grounds', 20, h - 24);
      // hover tooltip
      if (ch.hover) {
        const hp = ch.hover, s = toS(hp.x, hp.y);
        const lines = [`${hp.name} — ${hp.haven ? 'Pirate haven' : HS.NATIONS[hp.nation].name}`, `Produces: ${hp.produces.map((k) => HS.GOOD[k].name).join(', ')}`, `Wants: ${hp.demands.map((k) => HS.GOOD[k].name).join(', ')}`];
        if (p) { const dx = HS.dxw(p.x, hp.x), dy = hp.y - p.y; lines.push(`${Math.round(Math.hypot(dx, dy) * HS.NM_PER_PX).toLocaleString()} nm, bearing ${Math.round(HS.headingDeg(Math.atan2(dy, dx)))}°`); }
        ctx.font = '12px Georgia, serif';
        const bw = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 16;
        const bx = Math.min(s.x + 12, w - bw - 10), by = s.y + 12;
        ctx.fillStyle = 'rgba(245,235,205,0.96)'; ctx.fillRect(bx, by, bw, lines.length * 17 + 10);
        ctx.strokeStyle = '#5a4020'; ctx.strokeRect(bx, by, bw, lines.length * 17 + 10);
        ctx.fillStyle = '#2a1a0a';
        lines.forEach((l, i) => ctx.fillText(l, bx + 8, by + 18 + i * 17));
      }
      ctx.textAlign = 'left';
    },
    _rose(ctx, x, y, r) {
      ctx.save(); ctx.translate(x, y);
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * HS.TAU - Math.PI / 2, L = i % 4 === 0 ? r : i % 2 === 0 ? r * 0.65 : r * 0.4;
        ctx.fillStyle = i % 2 ? '#8a6a3a' : '#3a2a14';
        ctx.beginPath(); ctx.moveTo(Math.cos(a) * L, Math.sin(a) * L); ctx.lineTo(Math.cos(a + 0.2) * r * 0.15, Math.sin(a + 0.2) * r * 0.15); ctx.lineTo(Math.cos(a - 0.2) * r * 0.15, Math.sin(a - 0.2) * r * 0.15); ctx.fill();
      }
      ctx.fillStyle = '#3a2a14'; ctx.font = 'bold 14px Georgia, serif'; ctx.textAlign = 'center';
      ctx.fillText('N', 0, -r - 6);
      ctx.restore();
    },

    // ------------------------------------------------------------ HUD (drawn on the game canvas)
    drawHUD(ctx, g) {
      const p = g.player;
      if (!p) return;
      const w = g.w, h = g.h, pl = g.pl;
      // three layouts: desktop, phone landscape, phone portrait
      const compact = w < 760 || h < 520;
      const portrait = compact && h > w;
      const short = h < 430;
      const touch = this.isTouch;
      ctx.save();
      ctx.textAlign = 'left';

      // --- ship status panel
      const px = 10, py = 10, pw = compact ? Math.min(210, Math.floor(w * 0.6)) : 250;
      const ph = pl ? (short ? 116 : 150) : 104;
      this._panel(ctx, px, py, pw, ph);
      ctx.fillStyle = '#f2e6c4'; ctx.font = 'bold 15px Georgia, serif';
      ctx.fillText(p.name, px + 12, py + 22, pw - 24);
      ctx.font = '11px Georgia, serif'; ctx.fillStyle = '#c8b890';
      ctx.fillText(`${p.T.name}${pl ? ' · ' + g.rank() : ''}`, px + 12, py + 37, pw - 24);
      const bx0 = px + (compact ? 56 : 70);
      const bar = (y, label, v, max, col) => {
        ctx.fillStyle = '#c8b890'; ctx.font = '11px Georgia, serif'; ctx.fillText(label, px + 12, y + 8);
        const bw = px + pw - 14 - bx0;
        ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(bx0, y, bw, 9);
        ctx.fillStyle = col; ctx.fillRect(bx0, y, bw * HS.clamp(v / max, 0, 1), 9);
        ctx.fillStyle = '#fff'; ctx.font = '9px sans-serif'; ctx.textAlign = 'right'; ctx.fillText(`${Math.round(v)}/${max}`, px + pw - 16, y + 8); ctx.textAlign = 'left';
      };
      const hk = p.hull / p.hullMax;
      bar(py + 48, 'Hull', p.hull, p.hullMax, hk > 0.5 ? '#6cc35a' : hk > 0.25 ? '#e8c34a' : '#e8564a');
      bar(py + 63, p.T.steam ? 'Boilers' : 'Sails', p.sails, p.sailsMax, '#e8e2cf');
      bar(py + 78, 'Crew', p.crew, p.T.crewMax, p.crew < p.T.crewMin ? '#e8564a' : '#7aa8e8');
      if (pl) {
        let gy = py + 106;
        if (!short) { bar(py + 93, 'Hold', p.cargoUsed(), p.cargoCap(), '#c89a5a'); gy = py + 124; }
        ctx.fillStyle = '#f2d77a'; ctx.font = 'bold 13px Georgia, serif';
        ctx.fillText(`💰 ${HS.fmtGold(pl.gold)}`, px + 12, gy);
        const days = Math.floor(pl.rations / Math.max(1, p.crew));
        ctx.fillStyle = days < 4 ? '#ff8a7a' : '#d8cba8'; ctx.font = '12px Georgia, serif';
        ctx.fillText(`🍖 ${days} days`, px + (compact ? 100 : 110), gy);
        if (!short) {
          ctx.fillStyle = pl.notoriety >= 55 ? '#ff8a7a' : '#a89a78'; ctx.font = '10px Georgia, serif';
          ctx.fillText(`Fame ${Math.round(pl.fame)} · Notoriety ${Math.round(pl.notoriety)}`, px + 12, py + 141, pw - 24);
        }
      } else if (g.skirmish) {
        const foes = g.ships.filter((s) => s.team === 'B' && !s.sinking && !s.struck).length;
        ctx.fillStyle = '#ffb39a'; ctx.font = 'bold 12px Georgia, serif'; ctx.fillText(`Enemy ships remaining: ${foes}`, px + 12, py + 98, pw - 24);
      }
      const statusBottom = py + ph;

      // --- compass & navigation
      const cr = compact ? 38 : 56, cx = w - cr - 14, cy = cr + 12;
      this._compass(ctx, cx, cy, cr, p, g);
      const deg = HS.headingDeg(p.angle);
      const rel = Math.abs(p.relWind(g.wind));
      const bf = HS.beaufort(g.wind.speed);
      const fromDeg = HS.headingDeg(g.wind.dir + Math.PI);
      const { lon, lat } = HS.toLonLat(p.x, p.y);
      const sailTxt = p.T.steam ? HS.STEAM_NAMES[p.sail] : `${HS.SAIL_NAMES[p.sail]} · ${HS.pointOfSail(rel)}`;
      const sailCol = rel > 2.4 && !p.T.steam && p.sail ? '#ff9c7a' : '#d8cba8';
      let lines;
      if (compact) {
        lines = [
          [`${String(Math.round(deg)).padStart(3, '0')}° ${HS.compassPoint(deg)} · ${Math.abs(p.speed).toFixed(1)} kn`, '#f2e6c4', 'bold 12px'],
          [`Wind F${bf.force} from ${HS.compassPoint(fromDeg)}`, '#bcd8f0', '11px'],
          [sailTxt, sailCol, '11px'],
        ];
      } else {
        lines = [
          [`Heading ${String(Math.round(deg)).padStart(3, '0')}° ${HS.compassPoint(deg)}`, '#f2e6c4', 'bold 13px'],
          [`${Math.abs(p.speed).toFixed(1)} knots`, '#f2e6c4', 'bold 13px'],
          [`Wind: ${bf.name} (F${bf.force}) from ${HS.compassPoint(fromDeg)}`, '#bcd8f0', '11px'],
          [sailTxt, sailCol, '11px'],
          [`${HS.fmtLat(lat)}  ${HS.fmtLon(lon)}`, '#d8cba8', '11px'],
        ];
        if (pl) lines.push([`${g.dateString()} · ${g.watch()}`, '#a89a78', '10px']);
      }
      if (g.timeScale > 1) lines.push([`Time ×${g.timeScale}`, '#9fe8a0', 'bold 11px']);
      let navBottom;
      if (portrait) {
        // full-width strip beneath the status panel
        const ny = statusBottom + 6, nh = lines.length * 15 + 8;
        this._panel(ctx, px, ny, w - 20, nh, 0.45);
        let ty = ny + 16;
        for (const [txt, col, f] of lines) { ctx.fillStyle = col; ctx.font = `${f} Georgia, serif`; ctx.fillText(txt, px + 12, ty, w - 44); ty += 15; }
        navBottom = ny + nh;
      } else {
        const nw = compact ? Math.min(220, w * 0.34) : 258;
        const tx = compact ? w - 12 : cx - cr - 14;
        let ty = compact ? cy + cr + 22 : 26;
        ctx.textAlign = 'right';
        this._panel(ctx, tx - nw + 8, ty - 16, nw, lines.length * 16 + 10, 0.45);
        for (const [txt, col, f] of lines) { ctx.fillStyle = col; ctx.font = `${f} Georgia, serif`; ctx.fillText(txt, tx - 4, ty, nw - 16); ty += 16; }
        ctx.textAlign = 'left';
        navBottom = ty;
      }

      // --- gunnery & helm (bottom centre; clear of the touch pads)
      const bx = w / 2;
      const by = touch ? (portrait ? h - 172 : h - 6) : h - 22;
      const gw = touch && !portrait ? HS.clamp(w - 470, 230, 380) : Math.min(380, w - 16);
      const half = gw / 2, barW = Math.max(60, (gw - 150) / 2);
      this._panel(ctx, bx - half, by - 58, gw, 62, 0.55);
      if (p.T.guns > 0) {
        for (const side of [-1, 1]) {
          const x0 = side < 0 ? bx - half + 8 : bx + half - 8 - barW;
          const ready = p.reload[side] <= 0;
          ctx.fillStyle = ready ? '#9fe8a0' : '#e8b06a'; ctx.font = `bold ${compact ? 10 : 11}px Georgia, serif`;
          ctx.textAlign = side < 0 ? 'left' : 'right';
          ctx.fillText(side < 0 ? (compact ? '◀ LARBOARD' : '◀ LARBOARD (Q)') : (compact ? 'STARBOARD ▶' : 'STARBOARD (E) ▶'), side < 0 ? x0 : x0 + barW, by - 42, barW);
          ctx.textAlign = 'left';
          ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(x0, by - 36, barW, 8);
          ctx.fillStyle = ready ? '#6cc35a' : '#e8a04a';
          ctx.fillRect(x0, by - 36, barW * (ready ? 1 : 1 - p.reload[side] / p.reloadTime()), 8);
        }
        ctx.textAlign = 'center'; ctx.fillStyle = '#f2e6c4'; ctx.font = `bold ${compact ? 10 : 11}px Georgia, serif`;
        ctx.fillText(HS.AMMO[p.ammo].name, bx, by - 42, gw - 2 * barW - 20);
        ctx.font = '9px Georgia, serif'; ctx.fillStyle = '#a89a78'; ctx.fillText(touch ? 'tap to change' : '1·2·3 to change', bx, by - 30, gw - 2 * barW - 20);
      } else {
        ctx.textAlign = 'center'; ctx.fillStyle = '#f2e6c4'; ctx.font = 'bold 11px Georgia, serif';
        const rdy = p.turretReload.map((r) => (r <= 0 ? '●' : '○')).join(' ');
        ctx.fillText(`Turrets ${rdy}  ·  Torpedoes: ${p.torps}${p.torpReload > 0 ? ' (reloading)' : ''}`, bx, by - 40, gw - 16);
        ctx.font = '9px Georgia, serif'; ctx.fillStyle = '#a89a78'; ctx.fillText(touch ? 'Tap the sea to aim & fire' : 'Mouse to aim · click to fire · F torpedo', bx, by - 28, gw - 16);
      }
      this.ammoHit = { x: bx - 60, y: by - 58, w: 120, h: 34 };
      // helm
      const hw = Math.min(70, half - 30);
      ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(bx - hw, by - 12); ctx.lineTo(bx + hw, by - 12); ctx.stroke();
      ctx.fillStyle = '#e8c86a'; ctx.beginPath(); ctx.arc(bx + p.rudder * hw, by - 12, 5, 0, HS.TAU); ctx.fill();
      ctx.font = '9px Georgia, serif'; ctx.fillStyle = '#a89a78';
      ctx.fillText('helm', bx, by - 1);
      ctx.textAlign = 'left';

      // --- minimap
      const mr = compact ? 44 : 88;
      let mcx, mcy;
      if (!compact) { mcx = w - mr - 16; mcy = h - mr - 16; }
      else if (portrait) { mcx = w - mr - 12; mcy = by - 58 - mr - 10; }
      else { mcx = w / 2; mcy = mr + 10; }
      this._minimap(ctx, g, mr, mcx, mcy);

      // --- contextual prompts
      const prompts = [];
      if (g.mode === 'campaign') {
        if (g.dockable) prompts.push(g.portHostile(g.dockable) ? `${g.dockable.name} — harbour closed to you!` : `⚓ ${touch ? 'Dock' : 'ENTER'} — drop anchor at ${g.dockable.name}`);
        const near = g.nearestShip(p.L + 90, (s) => s.struck);
        if (near) prompts.push(`${touch ? 'Board' : 'B'} — board the ${near.name}`);
        if (pl && pl.maps.some((m) => !m.found && HS.distW(p.x, p.y, m.x, m.y) < 300)) prompts.push(`${touch ? 'Dig' : 'L'} — send the landing party ashore!`);
        const hailable = g.nearestShip(420);
        if (hailable && !near) prompts.push(`${touch ? 'Hail' : 'G'} — hail the ${hailable.name}`);
      } else if (g.mode === 'skirmish') {
        const near = g.nearestShip(p.L + 90, (s) => s.struck);
        if (near) prompts.push(`${touch ? 'Board' : 'B'} — board and take the ${near.name}!`);
      }
      ctx.textAlign = 'center'; ctx.font = `bold ${compact ? 12 : 14}px Georgia, serif`;
      prompts.forEach((t, i) => {
        const y = portrait ? navBottom + 22 + i * 24 : by - 74 - i * 26;
        const tw = Math.min(ctx.measureText(t).width, w - 40);
        ctx.fillStyle = 'rgba(10,14,22,0.6)'; ctx.fillRect(w / 2 - tw / 2 - 12, y - 16, tw + 24, 22);
        ctx.fillStyle = '#ffe6a0'; ctx.fillText(t, w / 2, y, w - 40);
      });
      ctx.textAlign = 'left';

      // --- messages (word-wrapped, newest at the bottom)
      let region;
      if (!compact) region = { yBottom: h - (touch ? 230 : 110), yTop: 200, maxW: w * 0.45, size: 13 };
      else if (portrait) region = { yBottom: by - 70, yTop: navBottom + 16 + prompts.length * 24, maxW: w - 2 * mr - 44, size: 11 };
      else region = { yBottom: h - (touch ? 170 : 80), yTop: statusBottom + 18, maxW: Math.min(w * 0.42, w / 2 - mr - 30), size: 11 };
      const lh = region.size + 6;
      ctx.font = `${region.size}px Georgia, serif`;
      let my = region.yBottom;
      for (let i = g.messages.length - 1; i >= 0 && my > region.yTop; i--) {
        const m = g.messages[i];
        const age = g.t - m.t;
        if (age > 9) continue;
        const a = HS.clamp(9 - age, 0, 1);
        const wrapped = this._wrap(ctx, m.text, region.maxW);
        for (let k = wrapped.length - 1; k >= 0 && my > region.yTop; k--) {
          const tw = ctx.measureText(wrapped[k]).width;
          ctx.fillStyle = `rgba(10,14,22,${0.55 * a})`; ctx.fillRect(10, my - region.size - 2, tw + 14, lh);
          ctx.globalAlpha = a; ctx.fillStyle = m.color; ctx.fillText(wrapped[k], 17, my);
          ctx.globalAlpha = 1;
          my -= lh;
        }
        my -= 4;
      }
      if (g.state === 'paused' && !this.chartPaused) { ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(0, 0, w, h); }
      ctx.restore();
    },
    _wrap(ctx, text, maxW) {
      const words = text.split(' '), out = [];
      let line = '';
      for (const wd of words) {
        const t = line ? line + ' ' + wd : wd;
        if (ctx.measureText(t).width > maxW && line) { out.push(line); line = wd; } else line = t;
      }
      if (line) out.push(line);
      return out;
    },
    _panel(ctx, x, y, w, h, a = 0.6) {
      ctx.fillStyle = `rgba(14,18,26,${a})`;
      ctx.strokeStyle = 'rgba(200,170,110,0.45)'; ctx.lineWidth = 1;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x, y, w, h, 8); else ctx.rect(x, y, w, h);
      ctx.fill(); ctx.stroke();
    },
    _compass(ctx, cx, cy, r, p, g) {
      ctx.save(); ctx.translate(cx, cy);
      const bg = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
      bg.addColorStop(0, '#f4ead0'); bg.addColorStop(1, '#c9b88a');
      ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(0, 0, r, 0, HS.TAU); ctx.fill();
      ctx.strokeStyle = '#6a5030'; ctx.lineWidth = 3; ctx.stroke();
      ctx.strokeStyle = '#b08a3a'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(0, 0, r - 5, 0, HS.TAU); ctx.stroke();
      for (let i = 0; i < 32; i++) {
        const a = (i / 32) * HS.TAU - Math.PI / 2;
        const L = i % 8 === 0 ? 12 : i % 4 === 0 ? 8 : 4;
        ctx.strokeStyle = '#4a3418'; ctx.lineWidth = i % 8 === 0 ? 2 : 1;
        ctx.beginPath(); ctx.moveTo(Math.cos(a) * (r - 5), Math.sin(a) * (r - 5)); ctx.lineTo(Math.cos(a) * (r - 5 - L), Math.sin(a) * (r - 5 - L)); ctx.stroke();
      }
      ctx.fillStyle = '#3a2a14'; ctx.font = `bold ${Math.round(r * 0.22)}px Georgia, serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      [['N', 0], ['E', 1], ['S', 2], ['W', 3]].forEach(([n, k]) => { const a = (k / 4) * HS.TAU - Math.PI / 2; ctx.fillStyle = n === 'N' ? '#a01818' : '#3a2a14'; ctx.fillText(n, Math.cos(a) * (r - 24), Math.sin(a) * (r - 24)); });
      // wind arrow (blows toward)
      const wa = g.wind.dir;
      ctx.strokeStyle = '#2a6aa8'; ctx.fillStyle = '#2a6aa8'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-Math.cos(wa) * r * 0.75, -Math.sin(wa) * r * 0.75); ctx.lineTo(Math.cos(wa) * r * 0.5, Math.sin(wa) * r * 0.5); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(Math.cos(wa) * r * 0.62, Math.sin(wa) * r * 0.62); ctx.lineTo(Math.cos(wa + 2.5) * 9 + Math.cos(wa) * r * 0.5, Math.sin(wa + 2.5) * 9 + Math.sin(wa) * r * 0.5); ctx.lineTo(Math.cos(wa - 2.5) * 9 + Math.cos(wa) * r * 0.5, Math.sin(wa - 2.5) * 9 + Math.sin(wa) * r * 0.5); ctx.fill();
      // ship needle
      ctx.rotate(p.angle);
      ctx.fillStyle = '#1a1a1a';
      ctx.beginPath(); ctx.moveTo(r * 0.55, 0); ctx.lineTo(-r * 0.35, -r * 0.14); ctx.lineTo(-r * 0.25, 0); ctx.lineTo(-r * 0.35, r * 0.14); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#c8a040'; ctx.beginPath(); ctx.arc(0, 0, 3, 0, HS.TAU); ctx.fill();
      ctx.restore();
      ctx.textBaseline = 'alphabetic';
    },
    _minimap(ctx, g, r, cx, cy) {
      const p = g.player;
      const range = 3200, k = r / range;
      ctx.save();
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, HS.TAU);
      ctx.fillStyle = 'rgba(20,70,100,0.85)'; ctx.fill();
      ctx.clip();
      const dpr = g.dpr;
      const offs = [0, -HS.W, HS.W];
      for (const off of offs) {
        if (Math.abs(p.x - off - HS.W / 2) > HS.W / 2 + range && off !== 0) continue;
        ctx.setTransform(k * dpr, 0, 0, k * dpr, (cx - (p.x - off) * k) * dpr, (cy - p.y * k) * dpr);
        ctx.fillStyle = '#9a8a5a'; ctx.fill(HS.World.landPath);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      for (const port of HS.World.ports) {
        const dx = HS.dxw(p.x, port.x) * k, dy = (port.y - p.y) * k;
        if (dx * dx + dy * dy > r * r) continue;
        ctx.fillStyle = g.portHostile(port) ? '#ff5a4a' : '#f2e6c4';
        ctx.fillRect(cx + dx - 2.5, cy + dy - 2.5, 5, 5);
      }
      for (const s of g.ships) {
        if (s.isPlayer || s.sinking) continue;
        const dx = HS.dxw(p.x, s.x) * k, dy = (s.y - p.y) * k;
        ctx.fillStyle = s.struck ? '#aaa' : s.mission ? '#ffd76a' : g.hostile(s, p) ? '#ff5a4a' : '#ffffff';
        ctx.beginPath(); ctx.arc(cx + dx, cy + dy, 2.6, 0, HS.TAU); ctx.fill();
      }
      if (g.pl) for (const m of g.pl.maps) {
        if (m.found) continue;
        const dx = HS.dxw(p.x, m.x) * k, dy = (m.y - p.y) * k;
        if (dx * dx + dy * dy > r * r) continue;
        ctx.strokeStyle = '#ff3a2a'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(cx + dx - 4, cy + dy - 4); ctx.lineTo(cx + dx + 4, cy + dy + 4); ctx.moveTo(cx + dx + 4, cy + dy - 4); ctx.lineTo(cx + dx - 4, cy + dy + 4); ctx.stroke();
      }
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(p.angle);
      ctx.fillStyle = '#ffe680'; ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(-4, -3.5); ctx.lineTo(-4, 3.5); ctx.fill();
      ctx.restore();
      ctx.restore();
      ctx.strokeStyle = 'rgba(200,170,110,0.8)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, HS.TAU); ctx.stroke();
      ctx.fillStyle = '#f2e6c4'; ctx.font = 'bold 10px Georgia, serif'; ctx.textAlign = 'center';
      ctx.fillText('N', cx, cy - r + 11);
      ctx.textAlign = 'left';
    },

    // ------------------------------------------------------------ touch
    _initTouch() {
      this.isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const el = $('#touch');
      const hold = (btn, code) => {
        const on = (e) => { e.preventDefault(); HS.Audio.init(); HS.Input.touch[code] = true; };
        const off = (e) => { e.preventDefault(); HS.Input.touch[code] = false; };
        btn.addEventListener('touchstart', on); btn.addEventListener('touchend', off); btn.addEventListener('touchcancel', off);
        btn.addEventListener('mousedown', on); btn.addEventListener('mouseup', off); btn.addEventListener('mouseleave', off);
      };
      el.querySelectorAll('[data-hold]').forEach((b) => hold(b, b.dataset.hold));
      el.querySelectorAll('[data-tap]').forEach((b) => {
        const f = (e) => { e.preventDefault(); HS.Audio.init(); HS.Input.press(b.dataset.tap); };
        b.addEventListener('touchstart', f); b.addEventListener('click', f);
      });
    },
  });

  window.addEventListener('resize', () => { if (UI.chartEl && !UI.chartEl.classList.contains('hidden')) UI.drawChart(); });
})();
