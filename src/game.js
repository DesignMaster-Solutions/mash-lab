// Mash Lab: stitch monsters from parts to fill the Night Parade's orders before the lantern burns out.
import { boardLines } from './board.mjs';
import { BPM, midiFreq, patternAt } from './music.mjs';
(() => {
  const W = 400, H = 720;
  const cv = document.getElementById('c');
  const g = cv.getContext('2d');
  let scale = 1, ox = 0, oy = 0;

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    cv.width = innerWidth * dpr; cv.height = innerHeight * dpr;
    scale = Math.min(innerWidth / W, innerHeight / H) * dpr;
    ox = (cv.width - W * scale) / 2; oy = (cv.height - H * scale) / 2;
  }
  addEventListener('resize', resize); resize();

  // ---------- traits & parts ----------
  const T = {
    GLOW: { label: 'glows', col: '#c6ff4a' },
    FLY: { label: 'flies', col: '#8fd3ff' },
    SLIME: { label: 'slimy', col: '#4ee08a' },
    BONES: { label: 'bony', col: '#f1ead8' },
    FUR: { label: 'furry', col: '#c9925b' },
    EYES: { label: 'many eyes', col: '#ff8fd0' },
    HORNS: { label: 'horned', col: '#ff6b5b' },
    FIRE: { label: 'fiery', col: '#ffad33' },
  };
  const HEADS = [
    { name: 'Three-Eye', traits: ['EYES'], draw: headEyes },
    { name: 'Jack', traits: ['GLOW', 'FIRE'], draw: headJack },
    { name: 'Skull', traits: ['BONES'], draw: headSkull },
    { name: 'Imp', traits: ['HORNS', 'FIRE'], draw: headImp },
  ];
  const BODIES = [
    { name: 'Ooze', traits: ['SLIME', 'GLOW'], draw: bodySlime },
    { name: 'Shag', traits: ['FUR'], draw: bodyFur },
    { name: 'Ribs', traits: ['BONES'], draw: bodyRibs },
    { name: 'Magma', traits: ['FIRE'], draw: bodyMagma },
  ];
  const EXTRAS = [
    { name: 'Bat wings', traits: ['FLY'], draw: exBat },
    { name: 'Tentacles', traits: ['SLIME'], draw: exTent },
    { name: 'Eyestalks', traits: ['EYES'], draw: exStalks },
    { name: 'Moth wings', traits: ['FLY', 'GLOW'], draw: exMoth },
    { name: 'Antlers', traits: ['HORNS', 'FUR'], draw: exAntlers },
  ];
  const ROWS = [HEADS, BODIES, EXTRAS];
  const VILLAGERS = ['Mayor Gourd', 'Granny Hex', 'Count Dribble', 'Little Wisp', 'The Lamplighter', 'Baron Bog', 'Madame Moth', 'Old Tom Crow'];
  const WANTS = ['for the parade', 'to guard the crypt', 'to scare the tax man', 'for a birthday', 'to mind the pumpkins', 'to win the fair', 'as a night-light', 'to haunt the library'];

  // ---------- state ----------
  let state = 'title', t = 0, last = performance.now();
  let pick = [0, 0, 0], order = null, score = 0, lives = 3, streak = 0, served = 0;
  // Browser storage can throw SecurityError inside the host's partitioned iframe: never let it take the game down.
  const store = { get: (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* sandboxed */ } } };
  let best = +(store.get('mashlab_best') || 0);
  let shake = 0, flash = null, particles = [], wobble = 0, popups = [];
  let board = [], runStart = 0;

  const rnd = (n) => Math.floor(Math.random() * n);
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  function newOrder() {
    // Build from a real combination so every order is solvable.
    const combo = ROWS.map(r => r[rnd(r.length)]);
    const pool = [...new Set(combo.flatMap(p => p.traits))];
    const need = Math.min(pool.length, served < 3 ? 2 : served < 10 ? 3 : 4);
    const traits = shuffle(pool).slice(0, need);
    const time = Math.max(7, 16 - served * 0.6);
    order = { who: VILLAGERS[rnd(VILLAGERS.length)], why: WANTS[rnd(WANTS.length)], traits, time, left: time };
  }
  function currentTraits() { return new Set(ROWS.flatMap((r, i) => r[pick[i]].traits)); }
  function start() { state = 'play'; score = 0; lives = 3; streak = 0; served = 0; pick = [0, 0, 0]; board = []; runStart = performance.now(); newOrder(); beep(440, .08); }

  function submit() {
    const have = currentTraits();
    const ok = order.traits.every(k => have.has(k));
    if (ok) {
      streak++; served++;
      const extra = [...have].filter(k => !order.traits.includes(k)).length;
      const gain = Math.round((100 + order.left * 10) * Math.min(streak, 5) * (extra === 0 ? 1.5 : 1));
      score += gain;
      popups.push({ text: (extra === 0 ? 'PERFECT MASH ' : '') + '+' + gain, y: 300, life: 1.2 });
      for (let i = 0; i < 40; i++) particles.push({ x: 200, y: 330, vx: (Math.random() - .5) * 9, vy: -Math.random() * 9, life: 1, col: T[order.traits[i % order.traits.length]].col });
      flash = { col: 'rgba(198,255,74,', a: .35 };
      chord([523, 659, 784]);
      newOrder();
    } else miss('Not quite. They wanted ' + order.traits.filter(k => !have.has(k)).map(k => T[k].label).join(' + '));
  }
  function miss(msg) {
    lives--; streak = 0; shake = 14; flash = { col: 'rgba(255,80,80,', a: .4 };
    popups.push({ text: msg, y: 300, life: 1.8, small: true });
    beep(140, .25, 'sawtooth');
    if (lives <= 0) {
      state = 'over';
      if (score > best) { best = score; store.set('mashlab_best', best); }
      postScore();
    } else newOrder();
  }

  // RUN leaderboard, loaded only here: the SDK awaits the host handshake while it imports, and 1.0.1 proved that a static
  // import keeps the whole game from starting when that handshake never answers. Every call can reject, so a failure
  // (or the 8 s timeout) just leaves the board empty.
  const sdk = () => import('@series-inc/rundot-game-sdk/api').then((m) => m.default);
  async function postScore() {
    const myRun = runStart; board = ['Posting score...'];
    try {
      const lb = await Promise.race([sdk().then((api) => api.leaderboard), new Promise((_, rej) => setTimeout(() => rej(new Error('sdk timeout')), 8000))]);
      const duration = Math.max(10, Math.round((performance.now() - runStart) / 1000));
      await lb.submitScore({ score, duration, metadata: { served } });
      const top = await lb.getPagedScores({ limit: 5 });
      if (runStart === myRun) board = boardLines({ rank: top.playerRank, totalPlayers: top.totalEntries }, top.entries);
    } catch (e) { if (runStart === myRun) board = []; }
  }

  // ---------- audio ----------
  let ac = null;
  const ctx = () => (ac = ac || new (window.AudioContext || window.webkitAudioContext)());
  function tone(f, at, d, type = 'square', gain = .06) {
    try {
      const o = ctx().createOscillator(), v = ac.createGain();
      o.type = type; o.frequency.value = f; v.gain.setValueAtTime(gain, at);
      v.gain.exponentialRampToValueAtTime(.0001, at + d);
      o.connect(v).connect(ac.destination); o.start(at); o.stop(at + d);
    } catch (e) { /* audio is optional */ }
  }
  const beep = (f, d, type) => { try { tone(f, ctx().currentTime, d, type); } catch (e) { /* audio is optional */ } };
  const chord = (fs) => fs.forEach((f, i) => setTimeout(() => beep(f, .15, 'triangle'), i * 70));
  // music: the E minor march from music.mjs, scheduled 0.2 s ahead each frame (the context only exists after a tap, so
  // autoplay rules are respected); it quickens while the lantern is about to go out. Tap the note or press M to mute.
  let musicOn = store.get('mashlab_music') !== 'off', nextStep = 0, nextTime = 0;
  const MUTE = { x: 10, y: 174, w: 42, h: 40 };
  function music() {
    if (!musicOn || !ac || ac.state !== 'running') { nextTime = 0; return; }
    if (!nextTime) nextTime = ac.currentTime + .05;
    const stepDur = 30 / BPM * (state === 'play' && order.left < 3 ? .8 : 1);
    while (nextTime < ac.currentTime + .2) {
      const { bass, lead } = patternAt(nextStep);
      if (bass) tone(midiFreq(bass), nextTime, stepDur * 1.8, 'sawtooth', .045);
      if (lead) tone(midiFreq(lead), nextTime, stepDur * .9, 'triangle', .07);
      nextTime += stepDur; nextStep++; cv.dataset.music = 'on:' + nextStep;
    }
  }
  function toggleMusic() { musicOn = !musicOn; store.set('mashlab_music', musicOn ? 'on' : 'off'); if (!musicOn) cv.dataset.music = 'off'; beep(musicOn ? 660 : 220, .08); }

  // ---------- layout ----------
  const ROW_Y = [448, 522, 596], ROW_H = 56;
  const BTN = { x: 60, y: 664, w: 280, h: 46 };
  function rowBoxes(i) {
    const n = ROWS[i].length, w = (W - 20) / n;
    return ROWS[i].map((p, j) => ({ x: 10 + j * w, y: ROW_Y[i], w: w - 6, h: ROW_H }));
  }

  // ---------- input ----------
  cv.addEventListener('pointerdown', (e) => {
    const r = cv.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
    const x = ((e.clientX - r.left) * dpr - ox) / scale, y = ((e.clientY - r.top) * dpr - oy) / scale;
    try { ctx().resume(); } catch (e) { /* audio is optional */ }
    if (x > MUTE.x && x < MUTE.x + MUTE.w && y > MUTE.y && y < MUTE.y + MUTE.h) { toggleMusic(); return; }
    if (state !== 'play') { start(); return; }
    for (let i = 0; i < 3; i++) rowBoxes(i).forEach((b, j) => {
      if (x > b.x && x < b.x + b.w && y > b.y && y < b.y + b.h) { pick[i] = j; wobble = 1; beep(300 + i * 120 + j * 40, .06); }
    });
    if (x > BTN.x && x < BTN.x + BTN.w && y > BTN.y && y < BTN.y + BTN.h) submit();
  });
  addEventListener('keydown', (e) => { if (e.key === ' ' || e.key === 'Enter') state === 'play' ? submit() : start(); else if (e.key === 'm' || e.key === 'M') toggleMusic(); });

  // ---------- drawing helpers ----------
  function circle(x, y, r, fill, stroke) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = 3; g.stroke(); } }
  function eye(x, y, r, look = 0) { circle(x, y, r, '#fff', '#1b1026'); circle(x + look * r * .3, y + r * .15, r * .5, '#1b1026'); circle(x + look * r * .3 - r * .15, y, r * .15, '#fff'); }
  function rr(x, y, w, h, rad, fill, stroke) { g.beginPath(); g.roundRect(x, y, w, h, rad); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = 2; g.stroke(); } }
  function text(s, x, y, size, col, align = 'center', weight = 800) { g.font = `${weight} ${size}px system-ui, -apple-system, Segoe UI, sans-serif`; g.fillStyle = col; g.textAlign = align; g.textBaseline = 'middle'; g.fillText(s, x, y); }

  // parts are drawn around (0,0) = body center, unit ~ 1px at scale 1
  function headEyes() { circle(0, -70, 42, '#9b7bff', '#1b1026'); eye(-18, -78, 11, Math.sin(t * 2)); eye(18, -78, 11, Math.sin(t * 2)); eye(0, -96, 9, Math.cos(t * 2)); g.strokeStyle = '#1b1026'; g.lineWidth = 3; g.beginPath(); g.arc(0, -55, 14, .2, Math.PI - .2); g.stroke(); }
  function headJack() {
    g.save(); g.shadowColor = '#ffad33'; g.shadowBlur = 25 + Math.sin(t * 6) * 8;
    g.beginPath(); g.ellipse(0, -70, 50, 40, 0, 0, Math.PI * 2); g.fillStyle = '#ff8a1f'; g.fill(); g.restore();
    g.strokeStyle = '#1b1026'; g.lineWidth = 3; g.beginPath(); g.ellipse(0, -70, 50, 40, 0, 0, Math.PI * 2); g.stroke();
    g.strokeStyle = '#c45f10'; g.beginPath(); g.ellipse(0, -70, 20, 40, 0, 0, Math.PI * 2); g.stroke();
    rr(-5, -120, 10, 16, 3, '#4c8c2b', '#1b1026');
    const glow = `rgba(255,${220 + Math.sin(t * 8) * 30},90,1)`; g.fillStyle = glow;
    [[-20, -80], [20, -80]].forEach(([x, y]) => { g.beginPath(); g.moveTo(x - 10, y + 6); g.lineTo(x, y - 9); g.lineTo(x + 10, y + 6); g.fill(); });
    g.beginPath(); g.moveTo(-28, -58); for (let i = 0; i <= 6; i++) g.lineTo(-28 + i * 9.3, i % 2 ? -48 : -58); g.lineTo(28, -52); g.lineTo(-28, -52); g.fill();
  }
  function headSkull() {
    circle(0, -76, 40, '#f1ead8', '#1b1026'); rr(-22, -50, 44, 22, 6, '#f1ead8', '#1b1026');
    circle(-15, -78, 11, '#1b1026'); circle(15, -78, 11, '#1b1026'); circle(-15, -78, 3, '#ff4fd8'); circle(15, -78, 3, '#ff4fd8');
    g.fillStyle = '#1b1026'; g.beginPath(); g.moveTo(0, -66); g.lineTo(-5, -58); g.lineTo(5, -58); g.fill();
    for (let i = -2; i <= 2; i++) { g.fillRect(i * 8 - 1, -46, 2, 14); }
  }
  function headImp() {
    g.fillStyle = '#ff6b5b'; g.strokeStyle = '#1b1026'; g.lineWidth = 3;
    [[-1], [1]].forEach(([s]) => { g.beginPath(); g.moveTo(s * 22, -100); g.quadraticCurveTo(s * 50, -130, s * 40, -150); g.quadraticCurveTo(s * 34, -118, s * 8, -108); g.fill(); g.stroke(); });
    circle(0, -72, 40, '#e8483a', '#1b1026');
    g.fillStyle = '#ffe14f'; [[-15, -78], [15, -78]].forEach(([x, y]) => { g.beginPath(); g.ellipse(x, y, 9, 6, x > 0 ? -.3 : .3, 0, Math.PI * 2); g.fill(); });
    circle(-15, -78, 3, '#1b1026'); circle(15, -78, 3, '#1b1026');
    g.strokeStyle = '#1b1026'; g.beginPath(); g.moveTo(-16, -55); g.quadraticCurveTo(0, -45, 16, -55); g.stroke();
    g.fillStyle = '#fff'; g.beginPath(); g.moveTo(-8, -52); g.lineTo(-4, -44); g.lineTo(-1, -51); g.fill(); g.beginPath(); g.moveTo(8, -52); g.lineTo(4, -44); g.lineTo(1, -51); g.fill();
  }
  function bodySlime() {
    g.save(); g.shadowColor = '#c6ff4a'; g.shadowBlur = 30;
    g.beginPath(); g.moveTo(-60, 70); g.quadraticCurveTo(-70, -30, 0, -30); g.quadraticCurveTo(70, -30, 60, 70);
    for (let i = 0; i < 6; i++) g.quadraticCurveTo(60 - i * 20 - 10, 90 + Math.sin(t * 3 + i) * 6, 60 - (i + 1) * 20, 70);
    g.fillStyle = '#4ee08a'; g.fill(); g.restore(); g.strokeStyle = '#1b1026'; g.lineWidth = 3; g.stroke();
    circle(-25, 10, 8, 'rgba(255,255,255,.35)'); circle(20, 35, 5, 'rgba(255,255,255,.3)');
  }
  function bodyFur() {
    g.fillStyle = '#a8703f'; g.strokeStyle = '#1b1026'; g.lineWidth = 3; g.beginPath();
    for (let i = 0; i <= 28; i++) { const a = i / 28 * Math.PI * 2, r = 60 + (i % 2 ? 10 : 0); g.lineTo(Math.cos(a) * r, 20 + Math.sin(a) * r * .9); }
    g.closePath(); g.fill(); g.stroke(); circle(0, 25, 34, '#d9a873');
  }
  function bodyRibs() {
    rr(-6, -32, 12, 110, 5, '#f1ead8', '#1b1026');
    for (let i = 0; i < 5; i++) { g.strokeStyle = '#f1ead8'; g.lineWidth = 9; g.beginPath(); g.arc(0, -10 + i * 18, 44 - i * 4, Math.PI * .15, Math.PI * .85, true); g.stroke(); g.strokeStyle = '#1b1026'; g.lineWidth = 2; g.stroke(); }
    circle(0, 82, 16, '#f1ead8', '#1b1026');
  }
  function bodyMagma() {
    g.save(); g.shadowColor = '#ff5a1f'; g.shadowBlur = 30; rr(-58, -30, 116, 110, 34, '#3a1a1a', '#1b1026'); g.restore();
    g.strokeStyle = `rgba(255,${150 + Math.sin(t * 5) * 60},40,1)`; g.lineWidth = 4;
    [[-40, -10, -10, 30, -30, 60], [10, -20, 40, 20, 20, 70], [-10, 40, 10, 60, 0, 75]].forEach(([a, b, c, d, e, f]) => { g.beginPath(); g.moveTo(a, b); g.lineTo(c, d); g.lineTo(e, f); g.stroke(); });
  }
  function exBat() {
    g.fillStyle = '#3b2a55'; g.strokeStyle = '#1b1026'; g.lineWidth = 3; const flap = Math.sin(t * 9) * 14;
    [-1, 1].forEach(s => { g.beginPath(); g.moveTo(s * 45, -10); g.lineTo(s * 130, -60 + flap); g.lineTo(s * 115, -20 + flap); g.lineTo(s * 100, -35 + flap); g.lineTo(s * 85, 0 + flap / 2); g.lineTo(s * 70, -15 + flap / 2); g.lineTo(s * 50, 20); g.closePath(); g.fill(); g.stroke(); });
  }
  function exMoth() {
    g.save(); g.shadowColor = '#c6ff4a'; g.shadowBlur = 25; const flap = Math.sin(t * 6) * .25;
    [-1, 1].forEach(s => { g.save(); g.translate(s * 45, -5); g.rotate(s * flap); g.beginPath(); g.ellipse(s * 50, -25, 55, 35, s * -.4, 0, Math.PI * 2); g.fillStyle = 'rgba(220,255,140,.85)'; g.fill(); g.strokeStyle = '#1b1026'; g.lineWidth = 3; g.stroke(); circle(s * 55, -28, 12, '#7a5bd6'); g.restore(); });
    g.restore();
  }
  function exTent() {
    g.strokeStyle = '#2fb36a'; g.lineCap = 'round';
    for (let i = 0; i < 4; i++) { const x0 = -36 + i * 24; g.lineWidth = 13; g.beginPath(); g.moveTo(x0, 70); g.bezierCurveTo(x0 + Math.sin(t * 3 + i) * 30, 110, x0 - Math.cos(t * 3 + i) * 30, 130, x0 + Math.sin(t * 2 + i) * 20, 150); g.stroke(); }
    g.lineCap = 'butt';
  }
  function exStalks() {
    [[-1, 0], [1, 1]].forEach(([s, k]) => { const sw = Math.sin(t * 3 + k) * 8; g.strokeStyle = '#7a5bd6'; g.lineWidth = 6; g.beginPath(); g.moveTo(s * 30, -100); g.quadraticCurveTo(s * 50, -130, s * 55 + sw, -160); g.stroke(); eye(s * 55 + sw, -165, 12, s); });
  }
  function exAntlers() {
    g.strokeStyle = '#8a5a2b'; g.lineWidth = 7; g.lineCap = 'round';
    [-1, 1].forEach(s => { g.beginPath(); g.moveTo(s * 20, -105); g.lineTo(s * 55, -150); g.lineTo(s * 85, -160); g.moveTo(s * 42, -133); g.lineTo(s * 40, -170); g.moveTo(s * 62, -152); g.lineTo(s * 75, -185); g.stroke(); });
    g.lineCap = 'butt';
  }

  function drawMonster(x, y, s) {
    g.save(); g.translate(x, y); const w = 1 + Math.sin(wobble * 12) * wobble * .12; g.scale(s * w, s / w);
    const [h, b, e] = [HEADS[pick[0]], BODIES[pick[1]], EXTRAS[pick[2]]];
    const behind = e.draw === exBat || e.draw === exMoth;
    if (behind) e.draw();
    b.draw(); h.draw();
    if (!behind) e.draw();
    g.restore();
  }
  function pill(k, x, y, ok) {
    g.font = '800 15px system-ui, sans-serif'; const w = g.measureText(T[k].label).width + 26;
    rr(x - w / 2, y - 14, w, 28, 14, ok ? T[k].col : 'rgba(255,255,255,.08)', ok ? null : T[k].col);
    text(T[k].label, x, y + 1, 15, ok ? '#1b1026' : T[k].col);
    return w;
  }

  // ---------- frame ----------
  function frame(now) {
    const dt = Math.min(.05, (now - last) / 1000); last = now; t += dt;
    // the host iframe can be sized after load and never fire resize: follow the viewport every frame
    if (cv.width !== Math.round(innerWidth * (window.devicePixelRatio || 1)) || cv.height !== Math.round(innerHeight * (window.devicePixelRatio || 1))) resize();
    if (state === 'play') { order.left -= dt; if (order.left <= 0) miss('Too slow! ' + order.who + ' left.'); }
    if (state === 'play' && order.left < 3 && Math.floor(order.left * 2) !== Math.floor((order.left + dt) * 2)) beep(880, .04); // lantern about to go out
    wobble = Math.max(0, wobble - dt * 2); shake = Math.max(0, shake - dt * 40);
    music();

    g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = '#120c1c'; g.fillRect(0, 0, cv.width, cv.height);
    g.setTransform(scale, 0, 0, scale, ox + (Math.random() - .5) * shake * scale, oy + (Math.random() - .5) * shake * scale);
    // backdrop: moon, hills, lab glow
    const sky = g.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#2a1a45'); sky.addColorStop(.6, '#1a1030'); sky.addColorStop(1, '#0d0816');
    g.fillStyle = sky; g.fillRect(0, 0, W, H);
    circle(338, 222, 30, '#fff4c9'); circle(349, 214, 26, '#22153a');
    for (let i = 0; i < 30; i++) circle((i * 97) % W, (i * 53) % 260, (i % 3) * .6 + .6, `rgba(255,255,255,${.3 + .3 * Math.sin(t * 2 + i)})`);
    g.fillStyle = '#160d26'; g.beginPath(); g.moveTo(0, 430); for (let x = 0; x <= W; x += 20) g.lineTo(x, 400 + Math.sin(x / 60) * 18); g.lineTo(W, 460); g.lineTo(0, 460); g.fill();
    // music toggle (top left, under the score; the moon lives top right)
    circle(31, 194, 17, musicOn ? 'rgba(198,255,74,.18)' : 'rgba(255,255,255,.06)', musicOn ? '#c6ff4a' : 'rgba(255,255,255,.3)');
    text('\u266a', 31, 195, 20, musicOn ? '#c6ff4a' : 'rgba(255,255,255,.4)');
    if (!musicOn) { g.strokeStyle = '#ff6b8b'; g.lineWidth = 3; g.beginPath(); g.moveTo(20, 205); g.lineTo(42, 183); g.stroke(); }

    if (state === 'title') {
      text('MASH LAB', 200, 120, 54, '#c6ff4a'); text('Stitch a monster. Fill the order.', 200, 165, 17, '#e8dcff', 'center', 600);
      pick = [Math.floor(t * .8) % 4, Math.floor(t * .8 + 1) % 4, Math.floor(t * .8 + 2) % 5]; drawMonster(200, 340, 1);
      text('Tap a head, a body and an extra', 200, 500, 16, '#e8dcff', 'center', 600);
      text('so the monster has every trait asked for.', 200, 524, 16, '#e8dcff', 'center', 600);
      text('Exact match = PERFECT MASH x1.5', 200, 560, 15, '#ffad33', 'center', 700);
      rr(BTN.x, 620, BTN.w, 56, 28, '#c6ff4a'); text('TAP TO OPEN THE LAB', 200, 649, 20, '#1b1026');
      if (best) text('Best: ' + best, 200, 700, 14, '#9f8cc4', 'center', 600);
    } else {
      // order card
      rr(14, 14, 372, 120, 18, 'rgba(255,255,255,.07)', 'rgba(198,255,74,.4)');
      text(order.who + ' needs a monster', 200, 36, 17, '#fff4c9'); text(order.why + ':', 200, 58, 14, '#b9a6e0', 'center', 600);
      const have = currentTraits(); const ws = order.traits.map(k => { g.font = '800 15px system-ui'; return g.measureText(T[k].label).width + 34; });
      let px = 200 - ws.reduce((a, b) => a + b, 0) / 2; order.traits.forEach((k, i) => { pill(k, px + ws[i] / 2 - 4, 92, have.has(k)); px += ws[i]; });
      const frac = Math.max(0, order.left / order.time); rr(30, 118, 340 * frac, 6, 3, frac > .3 ? '#ffad33' : '#ff4f4f');
      // hud
      text('Score ' + score, 20, 156, 16, '#fff', 'left'); text('x' + Math.min(Math.max(streak, 1), 5), 200, 156, 16, '#ffad33');
      for (let i = 0; i < 3; i++) text('\u2665', 380 - i * 20, 156, 20, i < lives ? '#ff6b8b' : 'rgba(255,107,139,.2)', 'right');
      // lab table + monster
      g.save(); g.shadowColor = '#7a5bd6'; g.shadowBlur = 40; rr(90, 392, 220, 18, 9, '#3b2a55'); g.restore();
      drawMonster(200, 300, .92);
      // part rows
      const labels = ['HEAD', 'BODY', 'EXTRA'];
      for (let i = 0; i < 3; i++) {
        text(labels[i], 14, ROW_Y[i] - 9, 11, '#9f8cc4', 'left', 800);
        rowBoxes(i).forEach((b, j) => {
          const sel = pick[i] === j, p = ROWS[i][j];
          rr(b.x, b.y, b.w, b.h, 12, sel ? 'rgba(198,255,74,.18)' : 'rgba(255,255,255,.06)', sel ? '#c6ff4a' : 'rgba(255,255,255,.12)');
          text(p.name, b.x + b.w / 2, b.y + 18, ROWS[i].length > 4 ? 12 : 14, sel ? '#fff' : '#ddd0f5', 'center', 800);
          p.traits.forEach((k, m) => { const n = p.traits.length; circle(b.x + b.w / 2 + (m - (n - 1) / 2) * 16, b.y + 40, 6, T[k].col); });
        });
      }
      rr(BTN.x, BTN.y, BTN.w, BTN.h, 20, '#c6ff4a'); text('UNLEASH IT!', 200, BTN.y + 24, 18, '#1b1026');
      if (state === 'over') {
        g.fillStyle = 'rgba(10,6,18,.85)'; g.fillRect(0, 0, W, H);
        text('THE LAB IS CLOSED', 200, 200, 30, '#ff6b8b'); text('Score ' + score, 200, 250, 26, '#fff'); text('Monsters delivered: ' + served, 200, 288, 17, '#e8dcff', 'center', 600);
        text(score >= best && score > 0 ? 'New best!' : 'Best: ' + best, 200, 320, 17, '#ffad33', 'center', 700);
        if (board.length) { text('NIGHT PARADE BOARD', 200, 368, 13, '#9f8cc4'); board.forEach((s, i) => { const me = s.startsWith('You'); text(s, 200, 395 + i * 24, me ? 17 : 15, me ? '#c6ff4a' : '#e8dcff', 'center', 700); }); }
        rr(BTN.x, 560, BTN.w, 56, 28, '#c6ff4a'); text('MASH AGAIN', 200, 589, 20, '#1b1026');
      }
    }
    // fx
    particles = particles.filter(p => (p.life -= dt) > 0); particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += .35; circle(p.x, p.y, 4 * p.life + 1, p.col); });
    popups = popups.filter(p => (p.life -= dt) > 0); popups.forEach(p => { p.y -= dt * 30; g.globalAlpha = Math.min(1, p.life * 2); text(p.text, 200, p.y, p.small ? 15 : 24, p.small ? '#ffb3c1' : '#c6ff4a'); g.globalAlpha = 1; });
    if (flash) { g.fillStyle = flash.col + flash.a + ')'; g.fillRect(0, 0, W, H); flash.a -= dt; if (flash.a <= 0) flash = null; }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // self-check: every generated order is solvable by some combination
  for (let i = 0; i < 200; i++) { served = i % 15; newOrder(); const ok = HEADS.some((h) => BODIES.some((b) => EXTRAS.some((e) => order.traits.every(k => [...h.traits, ...b.traits, ...e.traits].includes(k))))); if (!ok) console.error('unsolvable order', order); }
  served = 0; order = null;
})();
