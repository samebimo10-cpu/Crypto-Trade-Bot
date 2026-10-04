/* High Seas — people: captains, portraits, dialogue and voices. */
(function () {
  const HS = (window.HS = window.HS || {});

  const SKIN = ['#f1d0b5', '#e8b996', '#d49a73', '#b97a52', '#8d5a3b', '#6b412a', '#4a2c1d', '#f3d7c0'];
  const HAIR = ['#1b1410', '#3a2414', '#5c3a1e', '#8a5a2b', '#b07a3c', '#c9a46a', '#7a7a7a', '#d9d4c8', '#8b2f1c'];

  HS.makeCaptain = (role, nation, opts = {}) => {
    const r = Math.random;
    const female = opts.gender ? opts.gender === 'f' : r() < (role === 'pirate' ? 0.2 : 0.12);
    const femaleNames = ['Anne', 'Mary', 'Grace', 'Isabel', 'Catalina', 'Marie', 'Ching', 'Rachel', 'Elena', 'Amara', 'Charlotte', 'Jacquotte', 'Sadie'];
    const first = female ? HS.pick(femaleNames) : HS.pick(HS.NAMES.first.filter((n) => !femaleNames.includes(n)));
    const last = HS.pick(HS.NAMES.last);
    let title = 'Master', display = `${first} ${last}`;
    if (role === 'navy') title = HS.pick(['Captain', 'Commodore', 'Post-Captain']);
    else if (role === 'coastguard') title = HS.pick(['Lieutenant', 'Commander']);
    else if (role === 'pirate' || role === 'hunter') { title = 'Captain'; display = `"${HS.pick(HS.NAMES.nick)}" ${first} ${last}`; }
    else if (role === 'merchant') title = HS.pick(['Master', 'Captain', 'Skipper']);
    return { name: display, title, seed: (Math.random() * 1e9) | 0, female, role, nation, pitch: female ? HS.rand(1.15, 1.45) : HS.rand(0.6, 1.0), rate: HS.rand(0.92, 1.08) };
  };
  HS.makeNPC = (kind, port) => {
    const seed = HS.strHash(port.name + kind);
    const rnd = HS.rng(seed);
    const female = rnd() < (kind === 'tavern' ? 0.5 : kind === 'merchant' ? 0.3 : 0.15);
    const fn = female ? HS.pick(['Anne', 'Mary', 'Grace', 'Isabel', 'Marie', 'Elena', 'Amara', 'Sofia', 'Mei', 'Leila', 'Ingrid'], rnd) : HS.pick(HS.NAMES.first, rnd);
    const ln = HS.pick(HS.NAMES.last, rnd);
    const titles = {
      harbour: 'Harbour Master', merchant: 'Merchant Factor', shipwright: 'Master Shipwright', tavern: 'Tavern Keeper',
      governor: port.nation === 'pirate' ? 'Pirate Lord of ' + port.name : 'Governor of ' + port.name, oldsalt: 'Old Salt', smuggler: 'Smuggler',
    };
    const role = kind === 'governor' && port.nation === 'pirate' ? 'pirate' : kind;
    return { name: `${fn} ${ln}`, title: titles[kind] || kind, seed, female, role, nation: port.nation, pitch: female ? 1.2 + rnd() * 0.25 : 0.65 + rnd() * 0.35, rate: 0.92 + rnd() * 0.15 };
  };

  // ---------------------------------------------------------------- portraits
  HS.drawPortrait = (ctx, who, w, h, anim = {}) => {
    const rnd = HS.rng(who.seed);
    const role = who.role;
    const skin = HS.pick(SKIN, rnd), hair = HS.pick(HAIR, rnd);
    const female = !!who.female;
    const t = anim.t || 0;
    ctx.save();
    ctx.clearRect(0, 0, w, h);
    // backdrop
    const bgCols = { pirate: ['#3b1d1d', '#120909'], hunter: ['#3b1d1d', '#120909'], navy: ['#1d2b44', '#0b1220'], coastguard: ['#1d3340', '#0a161d'], governor: ['#4a3a1a', '#1a1408'], tavern: ['#4a2e18', '#1c1009'], oldsalt: ['#2a3a3a', '#0e1616'], smuggler: ['#2a2a1a', '#0d0d08'] };
    const [b1, b2] = bgCols[role] || ['#3a3226', '#14110c'];
    const bg = ctx.createRadialGradient(w / 2, h * 0.4, 10, w / 2, h / 2, w * 0.8);
    bg.addColorStop(0, b1); bg.addColorStop(1, b2);
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
    ctx.translate(w / 2, h * 0.52);
    const s = w / 160;
    ctx.scale(s, s);
    const breath = Math.sin(t * 1.6) * 1.2;

    // coat & shoulders
    const coats = {
      navy: ['#1b2a4a', '#d4af37'], coastguard: ['#24405a', '#c0c0c0'], pirate: [HS.pick(['#6b1515', '#3a2a1a', '#1d1d1d', '#2a3d2a'], rnd), '#b8962e'],
      hunter: ['#1a1a1a', '#8a1a1a'], merchant: [HS.pick(['#5a4030', '#3d4a3a', '#4a3a55'], rnd), '#c9b07a'], governor: ['#5a1525', '#e8c75a'],
      tavern: ['#6a5a40', '#e0d6c0'], harbour: ['#2d3b4a', '#c9b07a'], shipwright: ['#5a4a35', '#8a7a5a'], oldsalt: ['#3a4a50', '#9aa8a8'],
      smuggler: ['#2d2a22', '#6a6040'], player: ['#2a2a3a', '#d4af37'],
    };
    const [coat, trim] = coats[role] || coats.merchant;
    ctx.fillStyle = coat;
    ctx.beginPath(); ctx.moveTo(-75, 90); ctx.quadraticCurveTo(-70, 30 + breath, -30, 22 + breath); ctx.lineTo(30, 22 + breath); ctx.quadraticCurveTo(70, 30 + breath, 75, 90); ctx.fill();
    // shirt / cravat
    ctx.fillStyle = role === 'pirate' || role === 'hunter' ? '#d8cfb8' : '#f2efe6';
    ctx.beginPath(); ctx.moveTo(-16, 22 + breath); ctx.lineTo(0, 62); ctx.lineTo(16, 22 + breath); ctx.fill();
    if (role === 'tavern') { ctx.fillStyle = '#e8e2d4'; ctx.fillRect(-28, 45, 56, 50); }
    // lapels & epaulettes
    ctx.strokeStyle = trim; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-18, 24 + breath); ctx.lineTo(-6, 80); ctx.moveTo(18, 24 + breath); ctx.lineTo(6, 80); ctx.stroke();
    if (role === 'navy' || role === 'governor' || role === 'coastguard') {
      ctx.fillStyle = trim;
      for (const sx of [-1, 1]) { ctx.beginPath(); ctx.ellipse(sx * 52, 32 + breath, 16, 6, sx * 0.25, 0, HS.TAU); ctx.fill(); for (let i = 0; i < 5; i++) ctx.fillRect(sx * 52 - 12 + i * 5, 36 + breath, 2, 8); }
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(-10, 50 + i * 12, 2.2, 0, HS.TAU); ctx.arc(10, 50 + i * 12, 2.2, 0, HS.TAU); ctx.fill(); }
    }
    if (role === 'pirate' || role === 'hunter') { ctx.fillStyle = '#8a1a1a'; ctx.fillRect(-40, 70, 80, 9); }

    // neck & head
    ctx.fillStyle = HS.shade(skin, -18);
    ctx.fillRect(-12, 0, 24, 26 + breath);
    const faceW = female ? 33 : 35 + rnd() * 5, faceH = 44 + rnd() * 4;
    // long hair behind
    if (female || rnd() < 0.25) {
      ctx.fillStyle = hair;
      ctx.beginPath(); ctx.ellipse(0, -18, faceW + 8, faceH + (female ? 18 : 6), 0, 0, HS.TAU); ctx.fill();
      if (female) ctx.fillRect(-faceW - 8, -18, faceW * 2 + 16, 50);
    }
    ctx.fillStyle = skin;
    ctx.beginPath(); ctx.ellipse(0, -22, faceW, faceH, 0, 0, HS.TAU); ctx.fill();
    // ears
    ctx.beginPath(); ctx.ellipse(-faceW + 1, -20, 6, 10, 0, 0, HS.TAU); ctx.ellipse(faceW - 1, -20, 6, 10, 0, 0, HS.TAU); ctx.fill();
    if (rnd() < (role === 'pirate' ? 0.6 : 0.1)) { ctx.strokeStyle = '#e8c55a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(faceW - 1, -8, 4, 0, HS.TAU); ctx.stroke(); }
    // shading
    const fg = ctx.createLinearGradient(-faceW, 0, faceW, 0);
    fg.addColorStop(0, 'rgba(0,0,0,0.18)'); fg.addColorStop(0.5, 'rgba(0,0,0,0)'); fg.addColorStop(1, 'rgba(0,0,0,0.22)');
    ctx.fillStyle = fg; ctx.beginPath(); ctx.ellipse(0, -22, faceW, faceH, 0, 0, HS.TAU); ctx.fill();

    // eyes (blink every few seconds)
    const blink = (t + (who.seed % 7)) % 4.2 < 0.12;
    const eyeY = -28, eyeX = 13;
    const irisCol = HS.pick(['#3b2a1a', '#2a4a6a', '#3a5a3a', '#5a4020', '#1a1a1a'], rnd);
    const patch = (role === 'pirate' || role === 'hunter') && rnd() < 0.35;
    for (const sx of [-1, 1]) {
      if (patch && sx === 1) continue;
      if (blink) { ctx.strokeStyle = '#2a1a10'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(sx * eyeX - 6, eyeY); ctx.lineTo(sx * eyeX + 6, eyeY); ctx.stroke(); continue; }
      ctx.fillStyle = '#f6f2ea'; ctx.beginPath(); ctx.ellipse(sx * eyeX, eyeY, 7, 4.5, 0, 0, HS.TAU); ctx.fill();
      const look = Math.sin(t * 0.7 + who.seed) * 1.5;
      ctx.fillStyle = irisCol; ctx.beginPath(); ctx.arc(sx * eyeX + look, eyeY, 3.2, 0, HS.TAU); ctx.fill();
      ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(sx * eyeX + look, eyeY, 1.5, 0, HS.TAU); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.fillRect(sx * eyeX + look + 0.5, eyeY - 1.8, 1.2, 1.2);
    }
    if (patch) {
      ctx.fillStyle = '#111'; ctx.beginPath(); ctx.ellipse(eyeX, eyeY, 9, 7, 0, 0, HS.TAU); ctx.fill();
      ctx.strokeStyle = '#111'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-faceW, -40); ctx.lineTo(eyeX + 8, eyeY - 4); ctx.lineTo(faceW, -18); ctx.stroke();
    }
    // brows
    ctx.strokeStyle = HS.shade(hair, -10); ctx.lineWidth = female ? 2 : 3.2; ctx.lineCap = 'round';
    const browTilt = role === 'pirate' || role === 'hunter' ? 3 : role === 'navy' ? 1 : -1;
    ctx.beginPath(); ctx.moveTo(-eyeX - 8, eyeY - 9 - browTilt); ctx.lineTo(-eyeX + 7, eyeY - 8 + browTilt); ctx.moveTo(eyeX + 8, eyeY - 9 - browTilt); ctx.lineTo(eyeX - 7, eyeY - 8 + browTilt); ctx.stroke();
    // nose
    ctx.strokeStyle = HS.shade(skin, -45); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-1, -24); ctx.quadraticCurveTo(-6 - rnd() * 3, -8, -1, -6); ctx.lineTo(4, -7); ctx.stroke();
    // scar
    if (rnd() < (role === 'pirate' ? 0.4 : 0.08)) { ctx.strokeStyle = 'rgba(140,50,40,0.8)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-24, -36); ctx.lineTo(-12, -8); ctx.stroke(); }
    // cheeks
    ctx.fillStyle = 'rgba(200,80,70,0.12)'; ctx.beginPath(); ctx.arc(-20, -10, 8, 0, HS.TAU); ctx.arc(20, -10, 8, 0, HS.TAU); ctx.fill();

    // beard
    const beard = !female && rnd() < (role === 'pirate' || role === 'oldsalt' ? 0.85 : role === 'navy' ? 0.25 : 0.5);
    const beardStyle = Math.floor(rnd() * 3);
    // mouth (animated while speaking)
    const talk = anim.talking ? Math.abs(Math.sin(t * 13)) * 0.7 + Math.abs(Math.sin(t * 7.3)) * 0.3 : 0;
    const smile = role === 'tavern' || role === 'merchant' ? 2 : role === 'pirate' ? 1 : 0;
    ctx.fillStyle = '#4a1a14';
    ctx.beginPath(); ctx.ellipse(0, 4, 9, 1.5 + talk * 5, 0, 0, HS.TAU); ctx.fill();
    if (talk > 0.3) { ctx.fillStyle = '#efe9dc'; ctx.fillRect(-6, 1.5, 12, 2); }
    ctx.strokeStyle = female ? '#a5443e' : HS.shade(skin, -55); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-10, 4 - smile); ctx.quadraticCurveTo(0, 5.5 + smile, 10, 4 - smile); ctx.stroke();
    if (beard) {
      ctx.fillStyle = hair;
      if (beardStyle === 0) { // full beard
        ctx.beginPath(); ctx.moveTo(-faceW + 2, -14); ctx.quadraticCurveTo(-faceW, 24, 0, 32 + talk * 3); ctx.quadraticCurveTo(faceW, 24, faceW - 2, -14);
        ctx.quadraticCurveTo(faceW - 10, 8, 12, 7); ctx.quadraticCurveTo(0, 13 + talk * 4, -12, 7); ctx.quadraticCurveTo(-faceW + 10, 8, -faceW + 2, -14); ctx.fill();
      } else if (beardStyle === 1) { // goatee
        ctx.beginPath(); ctx.moveTo(-8, 10 + talk * 3); ctx.lineTo(8, 10 + talk * 3); ctx.lineTo(0, 26 + talk * 3); ctx.fill();
      }
      // moustache
      ctx.beginPath(); ctx.moveTo(0, -3); ctx.quadraticCurveTo(-12, -6, -16, 4); ctx.quadraticCurveTo(-8, 0, 0, 0); ctx.quadraticCurveTo(8, 0, 16, 4); ctx.quadraticCurveTo(12, -6, 0, -3); ctx.fill();
    }

    // hair on top & hats
    const hats = {
      navy: ['bicorne', 'bicorne', 'tricorn'], coastguard: ['tricorn', 'cap'], pirate: ['tricorn', 'bandana', 'tricorn', 'wide', 'none'], hunter: ['tricorn', 'bandana'],
      merchant: ['wide', 'none', 'tricorn'], governor: ['wig'], tavern: ['none', 'none', 'bandana'], harbour: ['tricorn', 'cap'],
      shipwright: ['cap', 'none'], oldsalt: ['cap', 'bandana', 'none'], smuggler: ['wide', 'bandana'], player: ['tricorn'],
    };
    let hat = HS.pick(hats[role] || ['none'], rnd);
    if (['ottoman', 'omani'].includes(who.nation) && role !== 'pirate' && rnd() < 0.8) hat = 'turban';
    if (['qing', 'japanese'].includes(who.nation) && role !== 'pirate' && rnd() < 0.7) hat = 'asian';
    if (female && hat === 'wig') hat = 'none';
    ctx.fillStyle = hair;
    if (hat !== 'wig' && hat !== 'turban') { ctx.beginPath(); ctx.ellipse(0, -52, faceW + 2, 22, 0, Math.PI, HS.TAU); ctx.fill(); }
    switch (hat) {
      case 'tricorn':
        ctx.fillStyle = '#1a1a1a';
        ctx.beginPath(); ctx.moveTo(-faceW - 18, -50); ctx.quadraticCurveTo(0, -40, faceW + 18, -50); ctx.lineTo(faceW + 4, -72); ctx.quadraticCurveTo(0, -92, -faceW - 4, -72); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = role === 'navy' || role === 'player' ? '#d4af37' : '#3a3a3a'; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(-faceW - 18, -50); ctx.quadraticCurveTo(0, -40, faceW + 18, -50); ctx.stroke();
        if (role === 'pirate' || role === 'hunter') { ctx.fillStyle = '#eee'; ctx.beginPath(); ctx.arc(0, -64, 5, 0, HS.TAU); ctx.fill(); ctx.fillStyle = '#111'; ctx.fillRect(-2.5, -65, 2, 2); ctx.fillRect(0.5, -65, 2, 2); }
        break;
      case 'bicorne':
        ctx.fillStyle = '#121212';
        ctx.beginPath(); ctx.moveTo(-faceW - 26, -52); ctx.quadraticCurveTo(0, -112, faceW + 26, -52); ctx.quadraticCurveTo(0, -60, -faceW - 26, -52); ctx.fill();
        ctx.strokeStyle = '#d4af37'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(-faceW - 26, -52); ctx.quadraticCurveTo(0, -112, faceW + 26, -52); ctx.stroke();
        ctx.fillStyle = HS.NATIONS[who.nation] ? HS.NATIONS[who.nation].color : '#c00'; ctx.beginPath(); ctx.arc(14, -70, 6, 0, HS.TAU); ctx.fill();
        break;
      case 'bandana':
        ctx.fillStyle = HS.pick(['#8a1a1a', '#1a3a8a', '#2a2a2a', '#7a5a1a'], rnd);
        ctx.beginPath(); ctx.ellipse(0, -55, faceW + 3, 22, 0, Math.PI, HS.TAU); ctx.fill();
        ctx.fillRect(-faceW - 3, -56, faceW * 2 + 6, 8);
        ctx.beginPath(); ctx.moveTo(faceW, -52); ctx.lineTo(faceW + 16, -40 + Math.sin(t * 3) * 2); ctx.lineTo(faceW + 6, -44); ctx.fill();
        break;
      case 'wide':
        ctx.fillStyle = '#3a2a1a';
        ctx.beginPath(); ctx.ellipse(0, -52, faceW + 26, 10, 0, 0, HS.TAU); ctx.fill();
        ctx.beginPath(); ctx.ellipse(0, -62, faceW - 2, 18, 0, Math.PI, HS.TAU); ctx.fill();
        ctx.fillStyle = '#5a1a1a'; ctx.fillRect(-faceW + 2, -60, faceW * 2 - 4, 5);
        break;
      case 'cap':
        ctx.fillStyle = role === 'coastguard' || role === 'harbour' ? '#1d2b44' : '#4a4a4a';
        ctx.beginPath(); ctx.ellipse(0, -58, faceW + 2, 18, 0, Math.PI, HS.TAU); ctx.fill();
        ctx.fillStyle = '#111'; ctx.beginPath(); ctx.ellipse(-6, -56, faceW, 6, 0, 0, Math.PI); ctx.fill();
        break;
      case 'wig':
        ctx.fillStyle = '#ebe6dc';
        ctx.beginPath(); ctx.ellipse(0, -50, faceW + 6, 26, 0, Math.PI, HS.TAU); ctx.fill();
        for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(sx * (faceW + 4), -40 + i * 12, 8, 0, HS.TAU); ctx.fill(); }
        break;
      case 'turban':
        ctx.fillStyle = HS.pick(['#efe9dc', '#c9a24a', '#2a5a8a', '#8a1a1a'], rnd);
        ctx.beginPath(); ctx.ellipse(0, -60, faceW + 8, 28, 0, Math.PI * 0.95, HS.TAU * 1.02); ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.2)'; ctx.lineWidth = 2;
        for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(0, -60 + i * 6, faceW + 6 - i * 2, 20 - i * 4, 0.2, Math.PI, HS.TAU); ctx.stroke(); }
        ctx.fillStyle = '#c0392b'; ctx.beginPath(); ctx.arc(0, -70, 4, 0, HS.TAU); ctx.fill();
        break;
      case 'asian':
        ctx.fillStyle = '#1a1a1a';
        ctx.beginPath(); ctx.ellipse(0, -58, faceW + 2, 18, 0, Math.PI, HS.TAU); ctx.fill();
        ctx.fillStyle = '#2a2a2a'; ctx.beginPath(); ctx.moveTo(-faceW - 14, -56); ctx.lineTo(0, -82); ctx.lineTo(faceW + 14, -56); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#c0392b'; ctx.beginPath(); ctx.arc(0, -80, 3.5, 0, HS.TAU); ctx.fill();
        break;
    }
    // parrot on a pirate's shoulder
    if ((role === 'pirate' || role === 'oldsalt') && rnd() < 0.4) {
      ctx.save(); ctx.translate(56, 18 + breath); ctx.rotate(Math.sin(t * 2) * 0.06);
      ctx.fillStyle = '#1e9e3e'; ctx.beginPath(); ctx.ellipse(0, 0, 10, 18, -0.2, 0, HS.TAU); ctx.fill();
      ctx.fillStyle = '#d42a2a'; ctx.beginPath(); ctx.arc(-2, -18, 8, 0, HS.TAU); ctx.fill();
      ctx.fillStyle = '#f2c200'; ctx.beginPath(); ctx.moveTo(-9, -17); ctx.lineTo(-15, -13); ctx.lineTo(-8, -12); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-4, -20, 2.5, 0, HS.TAU); ctx.fill(); ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(-4.5, -20, 1.2, 0, HS.TAU); ctx.fill();
      ctx.fillStyle = '#1a5aa8'; ctx.beginPath(); ctx.moveTo(2, 14); ctx.lineTo(8, 34); ctx.lineTo(-2, 16); ctx.fill();
      ctx.restore();
    }
    ctx.restore();
    // vignette
    const vg = ctx.createRadialGradient(w / 2, h / 2, w * 0.3, w / 2, h / 2, w * 0.75);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, w, h);
  };

  // ---------------------------------------------------------------- voices
  const Voice = (HS.Voice = {
    on: true, voices: [], speaking: false,
    init() {
      if (!('speechSynthesis' in window)) { this.on = false; return; }
      const load = () => { this.voices = speechSynthesis.getVoices().filter((v) => /^en/i.test(v.lang)); };
      load();
      speechSynthesis.onvoiceschanged = load;
    },
    pick(who) {
      if (!this.voices.length) return null;
      const pref = this.voices.filter((v) => (who.female ? /female|samantha|victoria|karen|moira|tessa|fiona|zira|susan|serena|libby|sonia|hazel/i : /male|daniel|david|george|alex|fred|arthur|oliver|ryan|guy|thomas|mark|james/i).test(v.name) && !(who.female ? /\bmale/i : /female/i).test(v.name));
      const gb = pref.filter((v) => /GB|IE|AU|scot/i.test(v.lang + v.name));
      const pool = gb.length ? gb : pref.length ? pref : this.voices;
      return pool[who.seed % pool.length];
    },
    speak(text, who, onEnd) {
      if (!this.on || !('speechSynthesis' in window)) { if (onEnd) setTimeout(onEnd, Math.min(6000, text.length * 45)); return; }
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text.replace(/[“”"*_]/g, '').replace(/—/g, ', '));
      const v = this.pick(who);
      if (v) u.voice = v;
      u.pitch = who.pitch || 1; u.rate = (who.rate || 1) * 0.98; u.volume = 0.95;
      this.speaking = true;
      u.onend = u.onerror = () => { this.speaking = false; if (onEnd) onEnd(); };
      speechSynthesis.speak(u);
    },
    stop() { if ('speechSynthesis' in window) speechSynthesis.cancel(); this.speaking = false; },
    toggle() { this.on = !this.on; if (!this.on) this.stop(); return this.on; },
  });

  // ---------------------------------------------------------------- dialogue box
  const Dialog = (HS.Dialog = {
    open: false, who: null, typed: 0, full: '', t: 0, raf: 0, opts: [], talking: false, onClose: null,
    el: null,
    init() {
      this.el = document.getElementById('dialog');
      this.canvas = this.el.querySelector('canvas');
      this.nameEl = this.el.querySelector('.dlg-name');
      this.titleEl = this.el.querySelector('.dlg-title');
      this.textEl = this.el.querySelector('.dlg-text');
      this.optEl = this.el.querySelector('.dlg-options');
      this.el.addEventListener('click', (e) => { if (!e.target.closest('button')) this.typed = this.full.length; });
      window.addEventListener('keydown', (e) => {
        if (!this.open) return;
        const n = parseInt(e.key, 10);
        if (n >= 1 && n <= this.opts.length) { e.preventDefault(); e.stopPropagation(); this._choose(n - 1); }
        else if ((e.key === 'Enter' || e.key === ' ') && this.opts.length === 1) { e.preventDefault(); e.stopPropagation(); this._choose(0); }
        else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.typed = this.full.length; }
      }, true);
    },
    /** who: captain/npc; text: string; options: [{label, fn, cls}] */
    show(who, text, options) {
      this.who = who; this.full = text; this.typed = 0; this.t = 0;
      this.opts = options && options.length ? options : [{ label: 'Aye.', fn: null }];
      this.nameEl.textContent = who.name;
      this.titleEl.textContent = who.title || '';
      this.optEl.innerHTML = '';
      this.opts.forEach((o, i) => {
        const b = document.createElement('button');
        b.className = 'btn ' + (o.cls || '');
        b.innerHTML = `<span class="key">${i + 1}</span> ${o.label}`;
        if (o.disabled) b.disabled = true;
        b.onclick = () => this._choose(i);
        this.optEl.appendChild(b);
      });
      this.el.classList.remove('hidden');
      this.open = true;
      this.talking = true;
      HS.Voice.speak(text, who, () => { this.talking = false; });
      if (!HS.Voice.on) setTimeout(() => { this.talking = false; }, Math.min(5000, text.length * 40));
      cancelAnimationFrame(this.raf);
      let last = performance.now();
      const step = (now) => {
        const dt = Math.min(0.05, (now - last) / 1000); last = now;
        this.t += dt;
        if (this.typed < this.full.length) this.typed = Math.min(this.full.length, this.typed + dt * 55);
        this.textEl.textContent = this.full.slice(0, Math.floor(this.typed));
        const ctx = this.canvas.getContext('2d');
        HS.drawPortrait(ctx, this.who, this.canvas.width, this.canvas.height, { t: this.t, talking: this.talking && (this.typed < this.full.length || HS.Voice.speaking) });
        if (this.open) this.raf = requestAnimationFrame(step);
      };
      this.raf = requestAnimationFrame(step);
    },
    _choose(i) {
      const o = this.opts[i];
      if (!o || o.disabled) return;
      HS.Audio.click();
      this.close();
      if (o.fn) o.fn();
    },
    close() {
      this.open = false;
      this.el.classList.add('hidden');
      cancelAnimationFrame(this.raf);
      HS.Voice.stop();
    },
  });
})();
