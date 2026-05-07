(function () {
  'use strict';

  if (window.__pomoActive) return;
  window.__pomoActive = true;

  var old = document.getElementById('__pomo_host__');
  if (old) old.remove();

  var WORK = 25 * 60, BREAK = 5 * 60;
  var mode = 'work', isRunning = false, offset = 0, startTime = null;
  var completed = 0, session = 1;
  var currentTheme = 0;
  var currentSize  = 1;
  var currentBg    = null;
  var cachedStats  = {};

  // ── Host & Shadow DOM ──────────────────────────────────────────────────────
  var host = document.createElement('div');
  host.id = '__pomo_host__';
  Object.assign(host.style, {
    position: 'fixed', bottom: '24px', right: '24px',
    zIndex: '2147483647', userSelect: 'none',
    fontSize: '16px', lineHeight: 'normal',
  });
  var shadow = host.attachShadow({ mode: 'open' });
  document.documentElement.appendChild(host);

  shadow.innerHTML = '<style>' +
    '* { box-sizing:border-box; margin:0; padding:0; }' +

    // Tamaños
    '.w.sz0 { width:172px; }' +
    '.w.sz0 .time { font-size:40px; letter-spacing:-1.5px; padding:12px 0 6px; }' +
    '.w.sz0 .playbtn { width:40px; height:40px; }' +
    '.w.sz0 .btn { width:30px; height:30px; }' +
    '.w.sz0 .btns { gap:6px; padding:10px 10px 9px; }' +
    '.w.sz0 .badge { font-size:8.5px; }' +
    '.w.sz2 { width:246px; }' +
    '.w.sz2 .time { font-size:64px; letter-spacing:-2.5px; padding:18px 0 10px; }' +
    '.w.sz2 .playbtn { width:56px; height:56px; }' +
    '.w.sz2 .btn { width:40px; height:40px; }' +
    '.w.sz2 .btns { gap:10px; padding:13px 14px 12px; }' +
    '.w.sz2 .badge { font-size:10.5px; }' +

    // Temas
    '.w     { --cw:#ff6b6b; --cb:#4dd9ac; --bg1:#17172b; --bg2:#0f0f1e; }' +
    '.w.t0  { --cw:#ff6b6b; --cb:#4dd9ac; --bg1:#17172b; --bg2:#0f0f1e; }' +
    '.w.t1  { --cw:#60a5fa; --cb:#34d399; --bg1:#071828; --bg2:#040e1a; }' +
    '.w.t2  { --cw:#fb923c; --cb:#fbbf24; --bg1:#1a1008; --bg2:#0f0904; }' +
    '.w.t3  { --cw:#c084fc; --cb:#f472b6; --bg1:#180828; --bg2:#0e0418; }' +

    // Widget base
    '.w { font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI",system-ui,sans-serif; position:relative; background:linear-gradient(160deg,var(--bg1) 0%,var(--bg2) 100%); border-radius:20px; box-shadow:0 24px 64px rgba(0,0,0,.8),0 8px 24px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,.07); width:204px; border:1px solid rgba(255,255,255,.08); transition:border-color .5s,box-shadow .5s; overflow:hidden; }' +
    '.w.work  { border-color:rgb(from var(--cw) r g b/.35); box-shadow:0 24px 64px rgba(0,0,0,.8),0 8px 24px rgba(0,0,0,.5),0 0 48px rgb(from var(--cw) r g b/.1),inset 0 1px 0 rgba(255,255,255,.07); }' +
    '.w.break { border-color:rgb(from var(--cb) r g b/.35); box-shadow:0 24px 64px rgba(0,0,0,.8),0 8px 24px rgba(0,0,0,.5),0 0 48px rgb(from var(--cb) r g b/.1),inset 0 1px 0 rgba(255,255,255,.07); }' +

    // Imagen de fondo
    '#bgol { position:absolute; inset:0; background-size:cover; background-position:center; opacity:0; transition:opacity .45s; z-index:0; pointer-events:none; }' +
    '#bgol.on { opacity:1; }' +
    '#bgol::after { content:""; position:absolute; inset:0; background:linear-gradient(160deg,rgb(from var(--bg1) r g b/.82),rgb(from var(--bg2) r g b/.88)); }' +
    '.hdr,#main,#sett { position:relative; z-index:1; }' +

    // Header
    '.hdr { padding:10px 10px 9px; display:flex; align-items:center; justify-content:space-between; cursor:grab; border-bottom:1px solid rgba(255,255,255,.05); background:rgba(255,255,255,.02); }' +
    '.hdr:active { cursor:grabbing; }' +
    '.badge { font-size:9.5px; font-weight:700; letter-spacing:.12em; text-transform:uppercase; display:flex; align-items:center; gap:6px; }' +
    '.w.work  .badge { color:var(--cw); }' +
    '.w.break .badge { color:var(--cb); }' +
    '.dot { width:6px; height:6px; border-radius:50%; background:currentColor; box-shadow:0 0 6px currentColor; }' +
    '.w.run .dot { animation:pulse 1.4s ease-in-out infinite; }' +
    '@keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.3;transform:scale(.8)} }' +
    '.hdr-r { display:flex; align-items:center; gap:1px; }' +
    '.icon-btn { background:none; border:none; color:rgba(255,255,255,.2); cursor:pointer; display:flex; align-items:center; justify-content:center; width:24px; height:24px; border-radius:5px; transition:color .2s,background .2s; padding:0; }' +
    '.icon-btn:hover { color:rgba(255,255,255,.75); background:rgba(255,255,255,.08); }' +
    '.xbtn { background:none; border:none; color:rgba(255,255,255,.18); cursor:pointer; font-size:15px; line-height:1; padding:2px 4px; border-radius:4px; transition:color .2s,background .2s; }' +
    '.xbtn:hover { color:rgba(255,255,255,.75); background:rgba(255,255,255,.08); }' +

    // Timer
    '.time { text-align:center; font-size:50px; font-weight:800; padding:16px 0 8px; letter-spacing:-2px; font-variant-numeric:tabular-nums; line-height:1; transition:color .4s,text-shadow .4s; }' +
    '.w.work  .time { color:var(--cw); text-shadow:0 0 32px rgb(from var(--cw) r g b/.45); }' +
    '.w.break .time { color:var(--cb); text-shadow:0 0 32px rgb(from var(--cb) r g b/.45); }' +

    // Barra
    '.bar-wrap { padding:0 14px 4px; }' +
    '.bar-track { height:3px; background:rgba(255,255,255,.06); border-radius:3px; overflow:hidden; }' +
    '.bar-fill { height:100%; border-radius:3px; transition:width .8s linear; }' +
    '.w.work  .bar-fill { background:linear-gradient(90deg,rgb(from var(--cw) r g b/.55),var(--cw)); box-shadow:0 0 8px rgb(from var(--cw) r g b/.6); }' +
    '.w.break .bar-fill { background:linear-gradient(90deg,rgb(from var(--cb) r g b/.55),var(--cb)); box-shadow:0 0 8px rgb(from var(--cb) r g b/.6); }' +

    // Botones
    '.btns { display:flex; align-items:center; justify-content:center; gap:8px; padding:12px 12px 10px; }' +
    '.btn { background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.09); border-radius:10px; color:rgba(255,255,255,.45); cursor:pointer; width:34px; height:34px; display:flex; align-items:center; justify-content:center; transition:all .15s; flex-shrink:0; box-shadow:inset 0 1px 0 rgba(255,255,255,.04); }' +
    '.btn:hover  { background:rgba(255,255,255,.12); color:rgba(255,255,255,.85); transform:scale(1.08); }' +
    '.btn:active { transform:scale(.93); }' +
    '.playbtn { width:46px; height:46px; border-radius:50%; }' +
    '.w.work  .playbtn { background:rgb(from var(--cw) r g b/.12); border-color:rgb(from var(--cw) r g b/.4); color:var(--cw); box-shadow:0 0 18px rgb(from var(--cw) r g b/.18),inset 0 1px 0 rgba(255,255,255,.06); }' +
    '.w.break .playbtn { background:rgb(from var(--cb) r g b/.12); border-color:rgb(from var(--cb) r g b/.4); color:var(--cb); box-shadow:0 0 18px rgb(from var(--cb) r g b/.18),inset 0 1px 0 rgba(255,255,255,.06); }' +
    '.w.work  .playbtn:hover { background:rgb(from var(--cw) r g b/.26); box-shadow:0 0 28px rgb(from var(--cw) r g b/.28),inset 0 1px 0 rgba(255,255,255,.06); }' +
    '.w.break .playbtn:hover { background:rgb(from var(--cb) r g b/.26); box-shadow:0 0 28px rgb(from var(--cb) r g b/.28),inset 0 1px 0 rgba(255,255,255,.06); }' +

    // Info y crédito
    '.info { text-align:center; font-size:10px; color:rgba(255,255,255,.22); padding-bottom:5px; letter-spacing:.05em; }' +
    '.credit { text-align:center; font-size:9.5px; color:rgba(255,255,255,.35); padding:7px 0 11px; letter-spacing:.1em; border-top:1px solid rgba(255,255,255,.07); margin:0 14px; }' +
    '.sig { color:#38bdf8; font-weight:800; letter-spacing:.05em; text-shadow:0 0 12px rgba(56,189,248,.7),0 0 24px rgba(56,189,248,.35); }' +

    // Panel de ajustes
    '#sett { padding:14px 14px 14px; display:flex; flex-direction:column; gap:11px; }' +
    '.s-title { font-size:10px; font-weight:700; letter-spacing:.14em; text-transform:uppercase; color:rgba(255,255,255,.3); text-align:center; }' +
    '.s-row { display:flex; align-items:center; justify-content:space-between; }' +
    '.s-lbl { font-size:11px; color:rgba(255,255,255,.45); letter-spacing:.04em; }' +
    '.s-inp-wrap { display:flex; align-items:center; gap:5px; }' +
    '.s-inp { background:rgba(255,255,255,.07); border:1px solid rgba(255,255,255,.12); border-radius:8px; color:#fff; font-size:15px; font-weight:700; width:52px; text-align:center; padding:6px 4px; outline:none; font-family:inherit; -moz-appearance:textfield; transition:border-color .2s,box-shadow .2s; }' +
    '.s-inp::-webkit-outer-spin-button,.s-inp::-webkit-inner-spin-button { -webkit-appearance:none; margin:0; }' +
    '.s-inp:focus { border-color:rgb(from var(--cw) r g b/.8); box-shadow:0 0 0 2px rgb(from var(--cw) r g b/.2); }' +
    '.s-unit { font-size:10px; color:rgba(255,255,255,.28); }' +
    '.s-sep { height:1px; background:rgba(255,255,255,.06); }' +
    '.s-themes { display:flex; align-items:center; justify-content:space-between; }' +
    '.s-swatches { display:flex; gap:8px; }' +
    '.swatch { width:20px; height:20px; border-radius:50%; cursor:pointer; border:2px solid transparent; transition:transform .15s,border-color .2s; flex-shrink:0; }' +
    '.swatch:hover { transform:scale(1.2); }' +
    '.swatch.active { border-color:rgba(255,255,255,.7); transform:scale(1.1); }' +
    '.swatch.t0 { background:linear-gradient(135deg,#ff6b6b,#4dd9ac); }' +
    '.swatch.t1 { background:linear-gradient(135deg,#60a5fa,#34d399); }' +
    '.swatch.t2 { background:linear-gradient(135deg,#fb923c,#fbbf24); }' +
    '.swatch.t3 { background:linear-gradient(135deg,#c084fc,#f472b6); }' +

    // Selector de tamaño
    '.s-sizes { display:flex; gap:4px; }' +
    '.s-sz { background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.1); border-radius:7px; color:rgba(255,255,255,.38); font-size:10px; font-weight:700; width:28px; height:26px; cursor:pointer; transition:all .15s; font-family:inherit; letter-spacing:.05em; padding:0; }' +
    '.s-sz:hover { background:rgba(255,255,255,.12); color:rgba(255,255,255,.75); }' +
    '.s-sz.active { background:rgb(from var(--cw) r g b/.18); border-color:rgb(from var(--cw) r g b/.5); color:var(--cw); }' +

    // Fondo personalizado
    '.s-bg-row { display:flex; align-items:center; gap:6px; }' +
    '.s-file-btn { display:inline-flex; align-items:center; background:rgba(255,255,255,.07); border:1px solid rgba(255,255,255,.12); border-radius:7px; color:rgba(255,255,255,.6); font-size:10px; font-weight:600; letter-spacing:.06em; padding:5px 9px; cursor:pointer; transition:all .15s; font-family:inherit; }' +
    '.s-file-btn:hover { background:rgba(255,255,255,.14); color:#fff; }' +
    '.s-clear-btn { background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.1); border-radius:7px; color:rgba(255,255,255,.32); font-size:10px; font-weight:600; padding:5px 9px; cursor:pointer; transition:all .15s; font-family:inherit; letter-spacing:.06em; }' +
    '.s-clear-btn:hover { background:rgba(255,80,80,.15); border-color:rgba(255,80,80,.3); color:#ff8080; }' +
    '#s-thumb { width:100%; height:44px; border-radius:8px; background-size:cover; background-position:center; border:1px solid rgba(255,255,255,.1); display:none; }' +

    // Estadísticas
    '.s-stats { display:flex; flex-direction:column; gap:6px; }' +
    '.s-stat { display:flex; justify-content:space-between; align-items:baseline; }' +
    '.s-stat-l { font-size:11px; color:rgba(255,255,255,.38); }' +
    '.s-stat-v { font-size:12px; font-weight:700; color:var(--cw); font-variant-numeric:tabular-nums; }' +

    // Guardar
    '.s-save { background:rgb(from var(--cw) r g b/.14); border:1px solid rgb(from var(--cw) r g b/.4); border-radius:10px; color:var(--cw); font-size:11px; font-weight:700; letter-spacing:.1em; text-transform:uppercase; padding:9px; cursor:pointer; transition:all .15s; font-family:inherit; width:100%; box-shadow:0 0 12px rgb(from var(--cw) r g b/.1); }' +
    '.s-save:hover { background:rgb(from var(--cw) r g b/.26); box-shadow:0 0 18px rgb(from var(--cw) r g b/.2); }' +
    '.s-save:active { transform:scale(.97); }' +

    '@keyframes pop { 0%{transform:scale(1)} 40%{transform:scale(1.06)} 100%{transform:scale(1)} }' +
    '.pop .time { animation:pop .4s cubic-bezier(.34,1.56,.64,1); }' +
    '</style>' +

    '<div class="w work t0" id="w">' +
    '  <div id="bgol"></div>' +
    '  <div class="hdr" id="hdr">' +
    '    <div class="badge"><div class="dot"></div><span id="lbl">TRABAJO</span></div>' +
    '    <div class="hdr-r">' +
    '      <button class="icon-btn" id="gbtn" title="Ajustes"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg></button>' +
    '      <button class="xbtn" id="xbtn">×</button>' +
    '    </div>' +
    '  </div>' +

    '  <div id="main">' +
    '    <div class="time" id="t">25:00</div>' +
    '    <div class="bar-wrap"><div class="bar-track"><div class="bar-fill" id="bar" style="width:100%"></div></div></div>' +
    '    <div class="btns">' +
    '      <button class="btn" id="rbtn"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg></button>' +
    '      <button class="btn playbtn" id="pbtn"><svg id="pi" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg><svg id="pai" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="display:none"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg></button>' +
    '      <button class="btn" id="cbtn"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg></button>' +
    '    </div>' +
    '    <div class="info" id="inf">Sesión 1 · 0 completadas</div>' +
    '    <div class="credit">Designed by <span class="sig">Iker G.</span></div>' +
    '  </div>' +

    '  <div id="sett" style="display:none">' +
    '    <div class="s-title">Ajustes</div>' +
    '    <div class="s-row"><span class="s-lbl">Trabajo</span><div class="s-inp-wrap"><input class="s-inp" id="s-work" type="number" min="1" max="99" value="25"><span class="s-unit">min</span></div></div>' +
    '    <div class="s-row"><span class="s-lbl">Descanso</span><div class="s-inp-wrap"><input class="s-inp" id="s-break" type="number" min="1" max="99" value="5"><span class="s-unit">min</span></div></div>' +
    '    <div class="s-sep"></div>' +
    '    <div class="s-themes"><span class="s-lbl">Tema</span><div class="s-swatches"><div class="swatch t0 active" data-t="0"></div><div class="swatch t1" data-t="1"></div><div class="swatch t2" data-t="2"></div><div class="swatch t3" data-t="3"></div></div></div>' +
    '    <div class="s-row"><span class="s-lbl">Tamaño</span><div class="s-sizes"><button class="s-sz" data-sz="0">S</button><button class="s-sz active" data-sz="1">M</button><button class="s-sz" data-sz="2">L</button></div></div>' +
    '    <div class="s-sep"></div>' +
    '    <div class="s-row"><span class="s-lbl">Fondo</span><div class="s-bg-row"><label class="s-file-btn" id="s-file-label">Elegir imagen<input type="file" id="s-file" accept="image/*" style="display:none"></label><button class="s-clear-btn" id="s-clear-bg" style="display:none">Quitar</button></div></div>' +
    '    <div id="s-thumb"></div>' +
    '    <div class="s-sep"></div>' +
    '    <div class="s-row"><span class="s-lbl">Estudio</span></div>' +
    '    <div class="s-stats"><div class="s-stat"><span class="s-stat-l">Hoy</span><span class="s-stat-v" id="s-today">—</span></div><div class="s-stat"><span class="s-stat-l">Semana</span><span class="s-stat-v" id="s-week">—</span></div><div class="s-stat"><span class="s-stat-l">Mes</span><span class="s-stat-v" id="s-month">—</span></div></div>' +
    '    <button class="s-save" id="s-save">Guardar</button>' +
    '  </div>' +
    '</div>';

  // ── Referencias DOM ────────────────────────────────────────────────────────
  var w       = shadow.getElementById('w');
  var lbl     = shadow.getElementById('lbl');
  var t       = shadow.getElementById('t');
  var bar     = shadow.getElementById('bar');
  var pbtn    = shadow.getElementById('pbtn');
  var pi      = shadow.getElementById('pi');
  var pai     = shadow.getElementById('pai');
  var rbtn    = shadow.getElementById('rbtn');
  var cbtn    = shadow.getElementById('cbtn');
  var xbtn    = shadow.getElementById('xbtn');
  var gbtn    = shadow.getElementById('gbtn');
  var hdr     = shadow.getElementById('hdr');
  var inf     = shadow.getElementById('inf');
  var main    = shadow.getElementById('main');
  var sett    = shadow.getElementById('sett');
  var bgOl    = shadow.getElementById('bgol');
  var sWork   = shadow.getElementById('s-work');
  var sBreak  = shadow.getElementById('s-break');
  var sSave   = shadow.getElementById('s-save');
  var sFile   = shadow.getElementById('s-file');
  var sClearBg= shadow.getElementById('s-clear-bg');
  var sThumb  = shadow.getElementById('s-thumb');
  var swatches= shadow.querySelectorAll('.swatch');

  // ── Utilidades ─────────────────────────────────────────────────────────────
  function fmt(s) { return String(Math.floor(s/60)).padStart(2,'0') + ':' + String(s%60).padStart(2,'0'); }
  function totalFor(m) { return m === 'work' ? WORK : BREAK; }
  function calcTimeLeft() {
    var el = (isRunning && startTime) ? offset + Math.floor((Date.now() - startTime) / 1000) : offset;
    return Math.max(0, totalFor(mode) - el);
  }
  function fmtDate(d) {
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
  }
  function fmtMin(m) {
    if (!m) return '—';
    if (m < 60) return m + ' min';
    var h = Math.floor(m/60), mn = m % 60;
    return h + 'h' + (mn ? ' ' + mn + 'm' : '');
  }
  function elapsedWorkMin() {
    if (mode !== 'work') return 0;
    var el = (isRunning && startTime) ? offset + Math.floor((Date.now() - startTime) / 1000) : offset;
    return Math.floor(el / 60);
  }

  // ── Temas ──────────────────────────────────────────────────────────────────
  function applyTheme(idx) {
    currentTheme = idx;
    w.className = 'w ' + mode + (isRunning ? ' run' : '') + ' t' + idx + ' sz' + currentSize;
    swatches.forEach(function(s) { s.classList.toggle('active', parseInt(s.dataset.t) === idx); });
  }

  var szBtns = shadow.querySelectorAll('.s-sz');
  function applySize(sz) {
    currentSize = sz;
    w.className = 'w ' + mode + (isRunning ? ' run' : '') + ' t' + currentTheme + ' sz' + sz;
    szBtns.forEach(function(b) { b.classList.toggle('active', parseInt(b.dataset.sz) === sz); });
  }

  // ── Imagen de fondo ────────────────────────────────────────────────────────
  function applyBg(dataUrl) {
    currentBg = dataUrl;
    bgOl.style.backgroundImage = 'url(' + dataUrl + ')';
    bgOl.classList.add('on');
    sThumb.style.backgroundImage = 'url(' + dataUrl + ')';
    sThumb.style.display = 'block';
    sClearBg.style.display = '';
  }
  function clearBg() {
    currentBg = null;
    bgOl.style.backgroundImage = '';
    bgOl.classList.remove('on');
    sThumb.style.backgroundImage = '';
    sThumb.style.display = 'none';
    sClearBg.style.display = 'none';
  }
  function compressImage(file, cb) {
    var reader = new FileReader();
    reader.onload = function(e) {
      var img = new Image();
      img.onload = function() {
        var MAX = 640;
        var ratio = Math.min(MAX / img.width, MAX / img.height, 1);
        var cw = Math.round(img.width * ratio);
        var ch = Math.round(img.height * ratio);
        var canvas = document.createElement('canvas');
        canvas.width = cw; canvas.height = ch;
        canvas.getContext('2d').drawImage(img, 0, 0, cw, ch);
        cb(canvas.toDataURL('image/jpeg', 0.78));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  // ── Estadísticas de estudio ────────────────────────────────────────────────
  function addStudyMinutes(mins) {
    if (!mins || mins < 1) return;
    var key = fmtDate(new Date());
    chrome.storage.local.get('pomoStats', function(data) {
      var stats = data.pomoStats || {};
      stats[key] = (stats[key] || 0) + mins;
      var cutoff = fmtDate(new Date(Date.now() - 365 * 86400000));
      Object.keys(stats).forEach(function(k) { if (k < cutoff) delete stats[k]; });
      chrome.storage.local.set({ pomoStats: stats });
      cachedStats = stats;
    });
  }

  // Lee storage y actualiza la caché (solo al abrir ajustes)
  function updateStats() {
    chrome.storage.local.get('pomoStats', function(data) {
      cachedStats = data.pomoStats || {};
      renderStats();
    });
  }

  // Renderiza con datos en caché + tiempo vivo actual (sin tocar storage)
  function renderStats() {
    var now = new Date();
    var liveMin = (mode === 'work' && isRunning) ? elapsedWorkMin() : 0;

    var daily = (cachedStats[fmtDate(now)] || 0) + liveMin;

    var weekly = liveMin;
    var dow = now.getDay();
    var daysFromMon = (dow === 0) ? 6 : dow - 1;
    for (var i = 0; i <= daysFromMon; i++) {
      var d = new Date(now); d.setDate(now.getDate() - i);
      weekly += cachedStats[fmtDate(d)] || 0;
    }

    var monthly = liveMin;
    var dom = now.getDate();
    for (var i = 0; i < dom; i++) {
      var d = new Date(now); d.setDate(now.getDate() - i);
      monthly += cachedStats[fmtDate(d)] || 0;
    }

    shadow.getElementById('s-today').textContent = fmtMin(daily);
    shadow.getElementById('s-week').textContent  = fmtMin(weekly);
    shadow.getElementById('s-month').textContent = fmtMin(monthly);
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  function render() {
    var tl = calcTimeLeft();
    t.textContent   = fmt(tl);
    bar.style.width = (tl / totalFor(mode) * 100) + '%';
    w.className     = 'w ' + mode + (isRunning ? ' run' : '') + ' t' + currentTheme + ' sz' + currentSize;
    lbl.textContent = mode === 'work' ? 'TRABAJO' : 'DESCANSO';
    pi.style.display  = isRunning ? 'none'  : 'block';
    pai.style.display = isRunning ? 'block' : 'none';
    inf.textContent   = 'Sesión ' + session + ' · ' + completed + ' completada' + (completed !== 1 ? 's' : '');

    if (isRunning && tl === 0) {
      if (mode === 'work') {
        addStudyMinutes(Math.round(WORK / 60));
        completed++; session++;
        chrome.runtime.sendMessage({ type: 'pomo_notify', title: '¡Tiempo de descanso! ☕', body: 'Completaste una sesión de trabajo. Tómate un respiro bien merecido.' });
      } else {
        chrome.runtime.sendMessage({ type: 'pomo_notify', title: '¡A trabajar! 🎯', body: 'El descanso ha terminado. ¡Hora de enfocarse!' });
      }
      mode = mode === 'work' ? 'break' : 'work';
      offset = 0; startTime = Date.now();
      w.classList.add('pop');
      setTimeout(function() { w.classList.remove('pop'); }, 400);
      saveState();
    }
  }

  function saveState() {
    chrome.storage.local.set({ pomoState: { mode: mode, isRunning: isRunning, offset: offset, startTime: startTime, completed: completed, session: session } });
  }
  function loadState(s) {
    if (!s) return;
    mode      = s.mode      || 'work';
    completed = s.completed || 0;
    session   = s.session   || 1;
    isRunning = !!s.isRunning;
    startTime = s.startTime || null;
    offset    = s.offset    || 0;
  }

  // ── Panel de ajustes ───────────────────────────────────────────────────────
  function openSettings() {
    sWork.value  = Math.round(WORK  / 60);
    sBreak.value = Math.round(BREAK / 60);
    szBtns.forEach(function(b) { b.classList.toggle('active', parseInt(b.dataset.sz) === currentSize); });
    if (currentBg) { sThumb.style.display = 'block'; sClearBg.style.display = ''; }
    main.style.display = 'none';
    sett.style.display = '';
    updateStats();
  }
  function closeSettings() {
    main.style.display = '';
    sett.style.display = 'none';
  }

  gbtn.addEventListener('click', function(e) {
    e.stopPropagation();
    if (sett.style.display === 'none') openSettings(); else closeSettings();
  });

  swatches.forEach(function(sw) {
    sw.addEventListener('click', function(e) {
      e.stopPropagation();
      applyTheme(parseInt(sw.dataset.t));
      chrome.storage.local.set({ pomoSettings: { work: Math.round(WORK/60), break: Math.round(BREAK/60), theme: currentTheme, size: currentSize } });
    });
  });

  szBtns.forEach(function(b) {
    b.addEventListener('click', function(e) {
      e.stopPropagation();
      applySize(parseInt(b.dataset.sz));
      chrome.storage.local.set({ pomoSettings: { work: Math.round(WORK/60), break: Math.round(BREAK/60), theme: currentTheme, size: currentSize } });
    });
  });

  sFile.addEventListener('change', function() {
    if (!sFile.files || !sFile.files[0]) return;
    compressImage(sFile.files[0], function(dataUrl) {
      applyBg(dataUrl);
      chrome.storage.local.set({ pomoBg: dataUrl });
    });
    sFile.value = '';
  });

  sClearBg.addEventListener('click', function(e) {
    e.stopPropagation();
    clearBg();
    chrome.storage.local.remove('pomoBg');
  });

  sSave.addEventListener('click', function(e) {
    e.stopPropagation();
    var nw = Math.max(1, Math.min(99, parseInt(sWork.value)  || 25));
    var nb = Math.max(1, Math.min(99, parseInt(sBreak.value) || 5));
    WORK  = nw * 60;
    BREAK = nb * 60;
    chrome.storage.local.set({ pomoSettings: { work: nw, break: nb, theme: currentTheme, size: currentSize } });
    saveState();
    closeSettings();
    render();
  });

  // ── Cargar estado + ajustes ────────────────────────────────────────────────
  chrome.storage.local.get(['pomoState', 'pomoVisible', 'pomoSettings', 'pomoBg'], function(data) {
    if (data.pomoSettings) {
      WORK  = (data.pomoSettings.work  || 25) * 60;
      BREAK = (data.pomoSettings.break || 5)  * 60;
      currentTheme = data.pomoSettings.theme || 0;
      currentSize  = data.pomoSettings.size  != null ? data.pomoSettings.size : 1;
    }
    loadState(data.pomoState);
    if (data.pomoVisible === false) host.style.display = 'none';
    if (data.pomoBg) applyBg(data.pomoBg);
    applyTheme(currentTheme);
    render();
  });

  // ── Sincronización entre pestañas ──────────────────────────────────────────
  chrome.storage.onChanged.addListener(function(changes, area) {
    if (area !== 'local') return;
    if (changes.pomoState)    { loadState(changes.pomoState.newValue); render(); }
    if (changes.pomoVisible)  { host.style.display = changes.pomoVisible.newValue === false ? 'none' : ''; }
    if (changes.pomoBg)       { if (changes.pomoBg.newValue) applyBg(changes.pomoBg.newValue); else clearBg(); }
    if (changes.pomoSettings) {
      var s = changes.pomoSettings.newValue;
      if (s) { WORK = (s.work||25)*60; BREAK = (s.break||5)*60; currentSize = s.size != null ? s.size : 1; applyTheme(s.theme||0); applySize(currentSize); render(); }
    }
  });

  // ── Tick ───────────────────────────────────────────────────────────────────
  var poll = setInterval(function() {
    if (!chrome.runtime || !chrome.runtime.id) { clearInterval(poll); host.remove(); return; }
    render();
    if (sett.style.display !== 'none') renderStats();
  }, 500);

  // ── Botones ────────────────────────────────────────────────────────────────
  pbtn.addEventListener('click', function(e) {
    e.stopPropagation();
    if (isRunning) {
      offset += Math.floor((Date.now() - startTime) / 1000);
      startTime = null; isRunning = false;
    } else {
      startTime = Date.now(); isRunning = true;
    }
    saveState(); render();
  });

  rbtn.addEventListener('click', function(e) {
    e.stopPropagation();
    addStudyMinutes(elapsedWorkMin());
    isRunning = false; startTime = null; offset = 0;
    saveState(); render();
  });

  cbtn.addEventListener('click', function(e) {
    e.stopPropagation();
    addStudyMinutes(elapsedWorkMin());
    isRunning = false; startTime = null; offset = 0;
    mode = mode === 'work' ? 'break' : 'work';
    saveState(); render();
  });

  xbtn.addEventListener('click', function(e) {
    e.stopPropagation();
    host.style.display = 'none';
  });

  // ── Drag ───────────────────────────────────────────────────────────────────
  var drag = false, sx, sy, ox, oy;
  hdr.addEventListener('mousedown', function(e) {
    if (xbtn.contains(e.target) || gbtn.contains(e.target)) return;
    drag = true; sx = e.clientX; sy = e.clientY;
    var r = host.getBoundingClientRect();
    ox = r.left; oy = r.top;
    host.style.right = 'auto'; host.style.bottom = 'auto';
    host.style.left = ox + 'px'; host.style.top = oy + 'px';
    e.preventDefault();
  });
  document.addEventListener('mousemove', function(e) {
    if (!drag) return;
    host.style.left = Math.max(0, Math.min(window.innerWidth  - host.offsetWidth,  ox + e.clientX - sx)) + 'px';
    host.style.top  = Math.max(0, Math.min(window.innerHeight - host.offsetHeight, oy + e.clientY - sy)) + 'px';
  });
  document.addEventListener('mouseup', function() { drag = false; });
})();
