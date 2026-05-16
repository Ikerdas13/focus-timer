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
  var cachedStats       = {};
  var alarmEnabled      = true;
  var longBreakEnabled  = false;
  var LONG_BREAK        = 15 * 60;
  var isLongBreak       = false;
  var blacklist         = [];
  var ratingDismissed   = false;
  var RATING_THRESHOLD  = 3;
  var STORE_URL = 'https://chromewebstore.google.com/detail/focus-timer-%E2%80%94-pomodoro-pr/gdidicppaicpkamdlnljeakdefkknikh/reviews';
  var lang = (navigator.language || 'es').toLowerCase().startsWith('en') ? 'en' : 'es';

  var currentOpacity  = 100;
  var currentRadius   = 1;
  var clockFmt        = 'off';
  var showSessionInfo = true;
  var customAccent    = null;
  var currentlyIdle   = false;
  var settVisible     = false;

  var STRINGS = {
    es: {
      work: 'TRABAJO', brk: 'DESCANSO',
      sessionFmt: function(s, c) { return 'Sesión ' + s + ' · ' + c + ' completada' + (c !== 1 ? 's' : ''); },
      settings: 'Ajustes', workLbl: 'Trabajo', breakLbl: 'Descanso',
      theme: 'Tema', size: 'Tamaño', bg: 'Fondo',
      chooseImg: 'Elegir imagen', removeImg: 'Quitar',
      study: 'Estudio', today: 'Hoy', week: 'Semana', month: 'Mes', save: 'Volver',
      language: 'Idioma',
      notifyWorkTitle: '¡Tiempo de descanso! ☕', notifyWorkBody: 'Completaste una sesión de trabajo. Tómate un respiro.',
      notifyBreakTitle: '¡A trabajar! 🎯', notifyBreakBody: 'El descanso terminó. ¡Hora de enfocarse!',
      min: ' min', alarm: 'Alarma', newCycle: 'Nuevo ciclo',
      longBreakLbl: 'Desc. largo', longBreakDurLbl: 'Duración', longBreak: 'LARGO',
      notifyLongStart: '¡Descanso largo! 🏖️', notifyLongStartBody: '4 sesiones completadas. ¡Recarga bien!',
      notifyLongEnd: '¡Nueva ronda! 🔥', notifyLongEndBody: 'Descanso largo terminado. ¡A por otras 4!',
      blockLbl: 'Bloqueos', blockPlaceholder: 'youtube.com', blockEmpty: 'Sin bloqueos',
      blockTitle: 'BLOQUEADO', blockMode: 'Modo trabajo',
      blockMsg: 'Termina la sesión para acceder durante el descanso',
      tabSession: 'Sesión', tabAppearance: 'Aspecto', tabStats: 'Stats', tabBlocks: 'Bloqueos',
      ratingMsg: '¿Te está ayudando?', ratingCta: 'Valórala ⭐',
      opacity: 'Opacidad', radius: 'Bordes del widget', clockLbl: 'Reloj', showSess: 'Info sesión'
    },
    en: {
      work: 'WORK', brk: 'BREAK',
      sessionFmt: function(s, c) { return 'Session ' + s + ' · ' + c + ' session' + (c !== 1 ? 's' : '') + ' done'; },
      settings: 'Settings', workLbl: 'Work', breakLbl: 'Break',
      theme: 'Theme', size: 'Size', bg: 'Background',
      chooseImg: 'Choose image', removeImg: 'Remove',
      study: 'Study time', today: 'Today', week: 'Week', month: 'Month', save: 'Back',
      language: 'Language',
      notifyWorkTitle: 'Break time! ☕', notifyWorkBody: 'Work session complete. Take a well-deserved rest.',
      notifyBreakTitle: 'Back to work! 🎯', notifyBreakBody: 'Break is over. Time to focus!',
      min: ' min', alarm: 'Alarm', newCycle: 'New cycle',
      longBreakLbl: 'Long break', longBreakDurLbl: 'Duration', longBreak: 'LONG',
      notifyLongStart: 'Long break! 🏖️', notifyLongStartBody: '4 sessions done. Recharge properly!',
      notifyLongEnd: 'New round! 🔥', notifyLongEndBody: 'Long break over. Go for 4 more!',
      blockLbl: 'Block list', blockPlaceholder: 'youtube.com', blockEmpty: 'No blocks',
      blockTitle: 'BLOCKED', blockMode: 'Focus mode',
      blockMsg: 'Finish the session to access this during the break',
      tabSession: 'Session', tabAppearance: 'Style', tabStats: 'Stats', tabBlocks: 'Blocks',
      ratingMsg: 'Is it helping you?', ratingCta: 'Rate it ⭐',
      opacity: 'Opacity', radius: 'Widget corners', clockLbl: 'Clock', showSess: 'Session info'
    }
  };
  function T(k) { return STRINGS[lang][k]; }

  // ── Host & Shadow DOM ──────────────────────────────────────────────────────
  var host = document.createElement('div');
  host.id = '__pomo_host__';
  Object.assign(host.style, {
    position: 'fixed', bottom: '24px', right: '24px',
    zIndex: '2147483647', userSelect: 'none',
    fontSize: '16px', lineHeight: 'normal',
    display: 'none',
  });
  var shadow = host.attachShadow({ mode: 'open' });
  document.documentElement.appendChild(host);

  // ── Blocker (pantalla completa) ────────────────────────────────────────────
  var blockerHost = document.createElement('div');
  blockerHost.id  = '__pomo_block__';
  Object.assign(blockerHost.style, { position: 'fixed', inset: '0', zIndex: '2147483646', display: 'none' });
  var bShadow = blockerHost.attachShadow({ mode: 'open' });
  document.documentElement.appendChild(blockerHost);
  var BLOCKER_CSS = `
    * { box-sizing:border-box; margin:0; padding:0; }
    .blk { width:100%; height:100%; background:rgba(8,8,18,.97); display:flex; flex-direction:column; align-items:center; justify-content:center; gap:10px; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif; color:#fff; text-align:center; padding:40px; }
    .blk-icon { font-size:52px; margin-bottom:4px; }
    .blk-title { font-size:11px; font-weight:700; letter-spacing:.22em; text-transform:uppercase; color:rgba(255,255,255,.3); }
    .blk-domain { font-size:26px; font-weight:800; letter-spacing:-.5px; color:#ff6b6b; margin:6px 0; max-width:640px; word-break:break-all; text-shadow:0 0 32px rgba(255,107,107,.4); }
    .blk-mode { font-size:11px; color:rgba(255,255,255,.3); letter-spacing:.12em; text-transform:uppercase; }
    .blk-time { font-size:56px; font-weight:800; letter-spacing:-2px; color:#ff6b6b; font-variant-numeric:tabular-nums; text-shadow:0 0 40px rgba(255,107,107,.35); line-height:1; }
    .blk-msg { font-size:13px; color:rgba(255,255,255,.25); max-width:360px; line-height:1.7; margin-top:6px; }
  `;
  var BLOCKER_HTML = `
    <div class="blk">
      <div class="blk-icon">🔒</div>
      <div class="blk-title" id="blk-title">BLOQUEADO</div>
      <div class="blk-domain" id="blk-domain"></div>
      <div class="blk-mode" id="blk-mode">Modo trabajo</div>
      <div class="blk-time" id="blk-time">25:00</div>
      <div class="blk-msg" id="blk-msg">Termina la sesión para acceder durante el descanso</div>
    </div>
  `;
  bShadow.innerHTML = '<style>' + BLOCKER_CSS + '</style>' + BLOCKER_HTML;

  var WIDGET_CSS = `
    * { box-sizing:border-box; margin:0; padding:0; }
    .w.sz0 { width:172px; }
    .w.sz0 .time { font-size:40px; letter-spacing:-1.5px; padding:4px 0 4px; }
    .w.sz0 .playbtn { width:40px; height:40px; }
    .w.sz0 .btn { width:30px; height:30px; }
    .w.sz0 .btns { gap:6px; padding:7px 10px 7px; }
    .w.sz0 .badge { font-size:8.5px; }
    .w.sz2 { width:246px; }
    .w.sz2 .time { font-size:64px; letter-spacing:-2.5px; padding:8px 0 6px; }
    .w.sz2 .playbtn { width:56px; height:56px; }
    .w.sz2 .btn { width:40px; height:40px; }
    .w.sz2 .btns { gap:10px; padding:8px 14px 8px; }
    .w.sz2 .badge { font-size:10.5px; }
    .w     { --cw:#ff6b6b; --cb:#4dd9ac; --bg1:#17172b; --bg2:#0f0f1e; }
    .w.t0  { --cw:#ff6b6b; --cb:#4dd9ac; --bg1:#17172b; --bg2:#0f0f1e; }
    .w.t1  { --cw:#60a5fa; --cb:#34d399; --bg1:#071828; --bg2:#040e1a; }
    .w.t2  { --cw:#fb923c; --cb:#fbbf24; --bg1:#1a1008; --bg2:#0f0904; }
    .w.t3  { --cw:#c084fc; --cb:#f472b6; --bg1:#180828; --bg2:#0e0418; }
    .w.t4  { --cw:#22c55e; --cb:#6ee7b7; --bg1:#0a1810; --bg2:#050e08; }
    .w.t5  { --cw:#f43f5e; --cb:#fb923c; --bg1:#1a080c; --bg2:#0a0408; }
    .w { font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI",system-ui,sans-serif; position:relative; background:linear-gradient(160deg,var(--bg1) 0%,var(--bg2) 100%); border-radius:20px; box-shadow:0 24px 64px rgba(0,0,0,.8),0 8px 24px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,.07); width:204px; border:1px solid rgba(255,255,255,.08); transition:border-color .5s,box-shadow .5s,opacity 0.35s ease; overflow:hidden; }
    .w.work  { border-color:rgb(from var(--cw) r g b/.35); box-shadow:0 24px 64px rgba(0,0,0,.8),0 8px 24px rgba(0,0,0,.5),0 0 48px rgb(from var(--cw) r g b/.1),inset 0 1px 0 rgba(255,255,255,.07); }
    .w.break { border-color:rgb(from var(--cb) r g b/.35); box-shadow:0 24px 64px rgba(0,0,0,.8),0 8px 24px rgba(0,0,0,.5),0 0 48px rgb(from var(--cb) r g b/.1),inset 0 1px 0 rgba(255,255,255,.07); }
    #bgol { position:absolute; inset:0; background-size:cover; background-position:center; opacity:0; transition:opacity .45s; z-index:0; pointer-events:none; }
    #bgol.on { opacity:1; }
    #bgol::after { content:""; position:absolute; inset:0; background:linear-gradient(160deg,rgb(from var(--bg1) r g b/.82),rgb(from var(--bg2) r g b/.88)); }
    .hdr,#main,#sett { position:relative; z-index:1; }
    .hdr { padding:10px 10px 9px; display:flex; align-items:center; justify-content:space-between; cursor:grab; border-bottom:1px solid rgba(255,255,255,.05); background:rgba(255,255,255,.02); }
    .hdr:active { cursor:grabbing; }
    .badge { font-size:9.5px; font-weight:700; letter-spacing:.12em; text-transform:uppercase; display:flex; align-items:center; gap:6px; }
    .w.work  .badge { color:var(--cw); }
    .w.break .badge { color:var(--cb); }
    .dot { width:6px; height:6px; border-radius:50%; background:currentColor; box-shadow:0 0 6px currentColor; }
    .w.run .dot { animation:pulse 1.4s ease-in-out infinite; }
    @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.3;transform:scale(.8)} }
    .hdr-r { display:flex; align-items:center; gap:1px; }
    .icon-btn { background:none; border:none; color:rgba(255,255,255,.2); cursor:pointer; display:flex; align-items:center; justify-content:center; width:24px; height:24px; border-radius:5px; transition:color .2s,background .2s; padding:0; }
    .icon-btn:hover { color:rgba(255,255,255,.75); background:rgba(255,255,255,.08); }
    .xbtn { background:none; border:none; color:rgba(255,255,255,.18); cursor:pointer; font-size:15px; line-height:1; padding:2px 4px; border-radius:4px; transition:color .2s,background .2s; }
    .xbtn:hover { color:rgba(255,255,255,.75); background:rgba(255,255,255,.08); }
    .time { text-align:center; font-size:50px; font-weight:800; padding:6px 0 5px; letter-spacing:-2px; font-variant-numeric:tabular-nums; line-height:1; transition:color .4s,text-shadow .4s; }
    .w.work  .time { color:var(--cw); text-shadow:0 0 32px rgb(from var(--cw) r g b/.45); }
    .w.break .time { color:var(--cb); text-shadow:0 0 32px rgb(from var(--cb) r g b/.45); }
    .bar-wrap { padding:0 14px 4px; }
    .bar-track { height:3px; background:rgba(255,255,255,.06); border-radius:3px; overflow:hidden; }
    .bar-fill { height:100%; border-radius:3px; transition:width .8s linear; }
    .w.work  .bar-fill { background:linear-gradient(90deg,rgb(from var(--cw) r g b/.55),var(--cw)); box-shadow:0 0 8px rgb(from var(--cw) r g b/.6); }
    .w.break .bar-fill { background:linear-gradient(90deg,rgb(from var(--cb) r g b/.55),var(--cb)); box-shadow:0 0 8px rgb(from var(--cb) r g b/.6); }
    .btns { display:flex; align-items:center; justify-content:center; gap:8px; padding:8px 12px 8px; }
    .btn { background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.09); border-radius:10px; color:rgba(255,255,255,.45); cursor:pointer; width:34px; height:34px; display:flex; align-items:center; justify-content:center; transition:all .15s; flex-shrink:0; box-shadow:inset 0 1px 0 rgba(255,255,255,.04); }
    .btn:hover  { background:rgba(255,255,255,.12); color:rgba(255,255,255,.85); transform:scale(1.08); }
    .btn:active { transform:scale(.93); }
    .playbtn { width:46px; height:46px; border-radius:50%; }
    .w.work  .playbtn { background:rgb(from var(--cw) r g b/.12); border-color:rgb(from var(--cw) r g b/.4); color:var(--cw); box-shadow:0 0 18px rgb(from var(--cw) r g b/.18),inset 0 1px 0 rgba(255,255,255,.06); }
    .w.break .playbtn { background:rgb(from var(--cb) r g b/.12); border-color:rgb(from var(--cb) r g b/.4); color:var(--cb); box-shadow:0 0 18px rgb(from var(--cb) r g b/.18),inset 0 1px 0 rgba(255,255,255,.06); }
    .w.work  .playbtn:hover { background:rgb(from var(--cw) r g b/.26); box-shadow:0 0 28px rgb(from var(--cw) r g b/.28),inset 0 1px 0 rgba(255,255,255,.06); }
    .w.break .playbtn:hover { background:rgb(from var(--cb) r g b/.26); box-shadow:0 0 28px rgb(from var(--cb) r g b/.28),inset 0 1px 0 rgba(255,255,255,.06); }
    .info { text-align:center; font-size:10px; color:rgba(255,255,255,.22); padding:6px 0 0; letter-spacing:.05em; }
    .credit { text-align:center; font-size:9.5px; color:rgba(255,255,255,.35); padding:7px 0 11px; letter-spacing:.1em; border-top:1px solid rgba(255,255,255,.07); margin:0 14px; }
    .sig { color:#38bdf8; font-weight:800; letter-spacing:.05em; text-shadow:0 0 12px rgba(56,189,248,.7),0 0 24px rgba(56,189,248,.35); }
    #sett { padding:14px 14px 14px; display:flex; flex-direction:column; gap:11px; }
    .s-tabs { display:flex; border-bottom:1px solid rgba(255,255,255,.06); margin-bottom:2px; }
    .s-tab { flex:1; padding:7px 2px 8px; font-size:9px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:rgba(255,255,255,.25); background:none; border:none; border-bottom:2px solid transparent; margin-bottom:-1px; cursor:pointer; transition:color .2s,border-color .2s; font-family:inherit; }
    .s-tab:hover { color:rgba(255,255,255,.55); }
    .s-tab.active { color:var(--cw); border-bottom-color:var(--cw); }
    .s-panel { display:flex; flex-direction:column; gap:10px; height:158px; overflow-y:auto; overflow-x:hidden; padding-right:2px; scrollbar-width:thin; scrollbar-color:rgba(255,255,255,.18) rgba(255,255,255,.03); }
    .s-panel::-webkit-scrollbar { width:2px; }
    .s-panel::-webkit-scrollbar-track { background:rgba(255,255,255,.03); border-radius:99px; }
    .s-panel::-webkit-scrollbar-thumb { background:rgba(255,255,255,.18); border-radius:99px; }
    .s-row { display:flex; align-items:center; justify-content:space-between; }
    .s-lbl { font-size:11px; color:rgba(255,255,255,.45); letter-spacing:.04em; }
    .s-inp-wrap { display:flex; align-items:center; gap:5px; }
    .s-inp { background:rgba(255,255,255,.07); border:1px solid rgba(255,255,255,.12); border-radius:8px; color:#fff; font-size:15px; font-weight:700; width:52px; text-align:center; padding:6px 4px; outline:none; font-family:inherit; -moz-appearance:textfield; transition:border-color .2s,box-shadow .2s; }
    .s-inp::-webkit-outer-spin-button,.s-inp::-webkit-inner-spin-button { -webkit-appearance:none; margin:0; }
    .s-inp:focus { border-color:rgb(from var(--cw) r g b/.8); box-shadow:0 0 0 2px rgb(from var(--cw) r g b/.2); }
    .s-unit { font-size:10px; color:rgba(255,255,255,.28); }
    .s-sep { height:1px; background:rgba(255,255,255,.06); }
    .s-themes { display:flex; flex-direction:column; gap:6px; }
    .s-themes-top { display:flex; align-items:center; justify-content:space-between; }
    .s-swatches { display:flex; gap:8px; }
    .swatch { width:20px; height:20px; border-radius:50%; cursor:pointer; border:2px solid transparent; transition:transform .15s,border-color .2s; flex-shrink:0; }
    .swatch:hover { transform:scale(1.2); }
    .swatch.active { border-color:rgba(255,255,255,.7); transform:scale(1.1); }
    .swatch.t0 { background:linear-gradient(135deg,#ff6b6b,#4dd9ac); }
    .swatch.t1 { background:linear-gradient(135deg,#60a5fa,#34d399); }
    .swatch.t2 { background:linear-gradient(135deg,#fb923c,#fbbf24); }
    .swatch.t3 { background:linear-gradient(135deg,#c084fc,#f472b6); }
    .swatch.t4 { background:linear-gradient(135deg,#22c55e,#6ee7b7); }
    .swatch.t5 { background:linear-gradient(135deg,#f43f5e,#fb923c); }
    .s-color-label { cursor:pointer; position:relative; display:flex; }
    .s-color-label input[type="color"] { position:absolute; opacity:0; width:1px; height:1px; overflow:hidden; }
    .s-color-dot { width:18px; height:18px; border-radius:50%; border:2px solid rgba(255,255,255,.18); cursor:pointer; transition:transform .15s,border-color .2s; background:conic-gradient(#ff6b6b,#fbbf24,#4dd9ac,#60a5fa,#c084fc,#ff6b6b); flex-shrink:0; }
    .s-color-dot:hover { transform:scale(1.2); border-color:rgba(255,255,255,.5); }
    .s-color-dot.active { border-color:rgba(255,255,255,.7); transform:scale(1.1); }
    .s-br { width:22px; height:22px; padding:0; display:flex; align-items:center; justify-content:center; }
    .s-br[data-br="0"] { border-radius:3px; }
    .s-br[data-br="2"] { border-radius:50%; }
    .s-br::before { content:''; display:block; background:currentColor; opacity:.6; }
    .s-br[data-br="0"]::before { width:10px; height:10px; border-radius:1px; }
    .s-br[data-br="1"]::before { width:10px; height:10px; border-radius:4px; }
    .s-br[data-br="2"]::before { width:10px; height:10px; border-radius:50%; }
    /* Widget border-radius modes */
    .w.br0 { border-radius:4px; }
    /* br1 inherits default 20px from .w */
    .w.br2 { border-radius:50%; height:204px; display:flex; flex-direction:column; }
    .w.br2.sz0 { height:172px; }
    .w.br2.sz2 { height:246px; }
    /* Header: 3-col grid so badge is truly centred regardless of gear+close width */
    .w.br2 .hdr { background:transparent; border-bottom:none; padding:18px 28px 0; display:grid; grid-template-columns:1fr auto 1fr; align-items:center; }
    .w.br2 .badge { grid-column:2; }
    .w.br2 .hdr-r { grid-column:3; justify-self:end; }
    /* Main fills the rest, all content centred */
    .w.br2 #main { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:0 0 14px; }
    /* Hide elements that don't fit in a circle */
    .w.br2 .info { display:none !important; }
    .w.br2 #clock { display:none !important; }
    .w.br2 .bar-wrap { display:none; }
    .w.br2 .new-cyc { display:none; }
    .w.br2 .alarm-row { display:none; }
    .w.br2 .rating-bar { display:none; }
    .w.br2 .credit { display:none; }
    /* All 3 action buttons visible, compact */
    .w.br2 .btns { padding:10px 0 0; gap:8px; }
    .w.br2 .btn { width:30px; height:30px; }
    .w.br2 .playbtn { width:42px; height:42px; border-radius:50%; }
    /* S: smaller so 3 buttons fit in the narrower circle */
    .w.br2.sz0 .btn { width:26px; height:26px; }
    .w.br2.sz0 .playbtn { width:36px; height:36px; }
    /* Settings open → always rounded, regardless of selected border mode */
    .w.sett-open { border-radius:20px; }
    /* Circle mode also needs height and display restored */
    .w.br2.sett-open { height:auto; display:block; }
    .w.br2.sett-open .hdr { background:rgba(255,255,255,.02); border-bottom:1px solid rgba(255,255,255,.05); padding:10px 10px 9px; }
    /* Timer font scaled down to avoid horizontal clipping */
    .w.br2 .time { font-size:42px; letter-spacing:-1.5px; padding:4px 0 2px; }
    .w.br2.sz0 .time { font-size:32px; letter-spacing:-1px; padding:2px 0 1px; }
    .w.br2.sz2 .time { font-size:54px; letter-spacing:-2px; padding:6px 0 4px; }
    .s-slider { -webkit-appearance:none; appearance:none; width:100%; height:3px; background:rgba(255,255,255,.1); border-radius:3px; outline:none; cursor:pointer; margin:0; }
    .s-slider::-webkit-slider-thumb { -webkit-appearance:none; width:14px; height:14px; border-radius:50%; background:var(--cw); cursor:pointer; box-shadow:0 0 6px rgba(0,0,0,.5); }
    .s-slider::-moz-range-thumb { width:14px; height:14px; border-radius:50%; background:var(--cw); cursor:pointer; border:none; }
    .s-opacity-row { display:flex; flex-direction:column; gap:4px; }
    .live-time { text-align:center; font-size:9.5px; color:rgba(255,255,255,.22); padding:2px 0 0; letter-spacing:.08em; font-variant-numeric:tabular-nums; }
    .s-sizes { display:flex; gap:4px; }
    .s-sz { background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.1); border-radius:7px; color:rgba(255,255,255,.38); font-size:10px; font-weight:700; width:28px; height:26px; cursor:pointer; transition:all .15s; font-family:inherit; letter-spacing:.05em; padding:0; }
    .s-sz:hover { background:rgba(255,255,255,.12); color:rgba(255,255,255,.75); }
    .s-sz.active { background:rgb(from var(--cw) r g b/.18); border-color:rgb(from var(--cw) r g b/.5); color:var(--cw); }
    .s-bg-row { display:flex; align-items:center; gap:6px; }
    .s-file-btn { display:inline-flex; align-items:center; background:rgba(255,255,255,.07); border:1px solid rgba(255,255,255,.12); border-radius:7px; color:rgba(255,255,255,.6); font-size:10px; font-weight:600; letter-spacing:.06em; padding:5px 9px; cursor:pointer; transition:all .15s; font-family:inherit; }
    .s-file-btn:hover { background:rgba(255,255,255,.14); color:#fff; }
    .s-clear-btn { background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.1); border-radius:7px; color:rgba(255,255,255,.32); font-size:10px; font-weight:600; padding:5px 9px; cursor:pointer; transition:all .15s; font-family:inherit; letter-spacing:.06em; }
    .s-clear-btn:hover { background:rgba(255,80,80,.15); border-color:rgba(255,80,80,.3); color:#ff8080; }
    #s-thumb { width:100%; height:44px; border-radius:8px; background-size:cover; background-position:center; border:1px solid rgba(255,255,255,.1); display:none; }
    .s-stats { display:flex; flex-direction:column; gap:6px; }
    .s-stat { display:flex; justify-content:space-between; align-items:baseline; }
    .s-stat-l { font-size:11px; color:rgba(255,255,255,.38); }
    .s-stat-v { font-size:12px; font-weight:700; color:var(--cw); font-variant-numeric:tabular-nums; }
    .s-save { background:rgb(from var(--cw) r g b/.1); border:1px solid rgb(from var(--cw) r g b/.3); border-radius:8px; color:var(--cw); font-size:10px; font-weight:700; letter-spacing:.1em; text-transform:uppercase; padding:6px; cursor:pointer; transition:all .15s; font-family:inherit; width:100%; }
    .s-save:hover { background:rgb(from var(--cw) r g b/.26); box-shadow:0 0 18px rgb(from var(--cw) r g b/.2); }
    .s-save:active { transform:scale(.97); }
    @keyframes pop { 0%{transform:scale(1)} 40%{transform:scale(1.06)} 100%{transform:scale(1)} }
    .pop .time { animation:pop .4s cubic-bezier(.34,1.56,.64,1); }
    .s-blk-wrap { display:flex; flex-direction:column; gap:6px; }
    .s-blk-add { display:flex; gap:5px; }
    .s-blk-inp { flex:1; min-width:0; background:rgba(255,255,255,.07); border:1px solid rgba(255,255,255,.12); border-radius:8px; color:#fff; font-size:11px; padding:6px 8px; outline:none; font-family:inherit; }
    .s-blk-inp::placeholder { color:rgba(255,255,255,.2); }
    .s-blk-inp:focus { border-color:rgb(from var(--cw) r g b/.8); box-shadow:0 0 0 2px rgb(from var(--cw) r g b/.2); }
    .s-blk-btn { background:rgb(from var(--cw) r g b/.14); border:1px solid rgb(from var(--cw) r g b/.4); border-radius:8px; color:var(--cw); font-size:18px; font-weight:700; width:30px; height:30px; cursor:pointer; font-family:inherit; display:flex; align-items:center; justify-content:center; flex-shrink:0; transition:all .15s; padding:0; }
    .s-blk-btn:hover { background:rgb(from var(--cw) r g b/.26); }
    .s-blk-list { display:flex; flex-direction:column; gap:4px; max-height:80px; overflow-y:auto; }
    .s-blk-item { display:flex; align-items:center; gap:6px; background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.07); border-radius:6px; padding:5px 8px; }
    .s-blk-url { font-size:10px; color:rgba(255,255,255,.6); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex:1; }
    .s-blk-del { background:none; border:none; color:rgba(255,255,255,.25); cursor:pointer; font-size:14px; line-height:1; padding:1px 3px; border-radius:4px; transition:all .15s; flex-shrink:0; }
    .s-blk-del:hover { color:#ff6b6b; background:rgba(255,80,80,.1); }
    .s-blk-empty { font-size:10px; color:rgba(255,255,255,.18); text-align:center; padding:4px 0; }
    .new-cyc { display:block; background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.1); border-radius:8px; color:rgba(255,255,255,.35); font-size:9.5px; font-weight:600; letter-spacing:.1em; text-transform:uppercase; cursor:pointer; width:calc(100% - 28px); margin:2px 14px 4px; padding:7px 0; transition:all .15s; font-family:inherit; }
    .new-cyc:hover { background:rgba(255,255,255,.09); border-color:rgba(255,255,255,.2); color:rgba(255,255,255,.7); }
    .rating-bar { display:none; align-items:center; justify-content:space-between; gap:8px; padding:7px 14px; background:rgba(255,210,0,.05); border-top:1px solid rgba(255,210,0,.1); border-bottom:1px solid rgba(255,210,0,.08); }
    .rating-lbl { font-size:10px; color:rgba(255,255,255,.4); white-space:nowrap; }
    .rating-cta { font-size:10px; font-weight:700; color:rgba(255,210,0,.8); text-decoration:none; letter-spacing:.04em; white-space:nowrap; transition:color .15s; }
    .rating-cta:hover { color:#ffd700; }
    .rating-x { background:none; border:none; color:rgba(255,255,255,.2); font-size:15px; line-height:1; cursor:pointer; padding:0; flex-shrink:0; transition:color .15s; }
    .rating-x:hover { color:rgba(255,255,255,.6); }
    .alarm-row { display:flex; align-items:center; justify-content:space-between; padding:0 14px 7px; }
    .alarm-lbl { font-size:10px; color:rgba(255,255,255,.28); display:flex; align-items:center; gap:5px; letter-spacing:.04em; }
    .alarm-sw { position:relative; width:32px; height:18px; flex-shrink:0; cursor:pointer; }
    .alarm-sw input { display:none; }
    .alarm-trk { position:absolute; inset:0; background:rgba(255,255,255,.1); border-radius:9px; cursor:pointer; transition:background .25s; border:1px solid rgba(255,255,255,.08); }
    .alarm-trk::before { content:""; position:absolute; width:14px; height:14px; left:1px; top:1px; background:rgba(255,255,255,.4); border-radius:50%; transition:transform .25s,background .25s; box-shadow:0 1px 3px rgba(0,0,0,.4); }
    .alarm-sw input:checked + .alarm-trk { background:rgb(from var(--cw) r g b/.5); border-color:rgb(from var(--cw) r g b/.4); }
    .alarm-sw input:checked + .alarm-trk::before { transform:translateX(14px); background:#fff; }
  `;

  var WIDGET_HTML = `
    <div class="w work t0" id="w">
      <div id="bgol"></div>
      <div class="hdr" id="hdr">
        <div class="badge"><div class="dot"></div><span id="lbl">TRABAJO</span></div>
        <div class="hdr-r">
          <button class="icon-btn" id="gbtn" title="Settings"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg></button>
          <button class="xbtn" id="xbtn">×</button>
        </div>
      </div>
      <div id="main">
        <div class="info" id="inf">Sesión 1 · 0 completadas</div>
        <div class="live-time" id="clock" style="display:none"></div>
        <div class="time" id="t">25:00</div>
        <div class="bar-wrap"><div class="bar-track"><div class="bar-fill" id="bar" style="width:100%"></div></div></div>
        <div class="btns">
          <button class="btn" id="rbtn"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg></button>
          <button class="btn playbtn" id="pbtn"><svg id="pi" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg><svg id="pai" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="display:none"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg></button>
          <button class="btn" id="cbtn"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg></button>
        </div>
        <button class="new-cyc" id="nwbtn">Nuevo ciclo</button>
        <div class="alarm-row"><span class="alarm-lbl"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg><span id="alarm-lbl-txt">Alarma</span></span><label class="alarm-sw"><input type="checkbox" id="alarm-chk" checked><div class="alarm-trk"></div></label></div>
        <div class="rating-bar" id="rating-bar"><span class="rating-lbl" id="rating-msg">¿Te está ayudando?</span><a class="rating-cta" id="rating-cta" href="#" target="_blank">Valórala ⭐</a><button class="rating-x" id="rating-x">×</button></div>
        <div class="credit">Designed by <span class="sig">Iker G.</span></div>
      </div>
      <div id="sett" style="display:none">
        <div class="s-tabs">
          <button class="s-tab active" data-tab="session" id="s-tab-session">Sesión</button>
          <button class="s-tab" data-tab="appearance" id="s-tab-appearance">Aspecto</button>
          <button class="s-tab" data-tab="stats" id="s-tab-stats">Stats</button>
          <button class="s-tab" data-tab="blocks" id="s-tab-blocks">Bloqueos</button>
        </div>
        <div class="s-panel" id="s-panel-session">
          <div class="s-row"><span class="s-lbl" id="s-lang-lbl">Idioma</span><div class="s-sizes"><button class="s-sz active" id="s-lang-es">ES</button><button class="s-sz" id="s-lang-en">EN</button></div></div>
          <div class="s-sep"></div>
          <div class="s-row"><span class="s-lbl" id="s-work-lbl">Trabajo</span><div class="s-inp-wrap"><input class="s-inp" id="s-work" type="number" min="1" max="99" value="25"><span class="s-unit">min</span></div></div>
          <div class="s-row"><span class="s-lbl" id="s-break-lbl">Descanso</span><div class="s-inp-wrap"><input class="s-inp" id="s-break" type="number" min="1" max="99" value="5"><span class="s-unit">min</span></div></div>
          <div class="s-row"><span class="s-lbl" id="s-long-lbl">Desc. largo</span><label class="alarm-sw"><input type="checkbox" id="s-long-chk"><div class="alarm-trk"></div></label></div>
          <div class="s-row" id="s-long-row" style="display:none"><span class="s-lbl" id="s-long-dur-lbl">Duración</span><div class="s-inp-wrap"><input class="s-inp" id="s-long-dur" type="number" min="5" max="60" value="15"><span class="s-unit">min</span></div></div>
        </div>
        <div class="s-panel" id="s-panel-appearance" style="display:none">
          <div class="s-themes"><div class="s-themes-top"><span class="s-lbl" id="s-theme-lbl">Tema</span><label class="s-color-label" title="Custom"><input type="color" id="s-accent" value="#ff6b6b"><div class="s-color-dot" id="s-color-dot"></div></label></div><div class="s-swatches"><div class="swatch t0 active" data-t="0"></div><div class="swatch t1" data-t="1"></div><div class="swatch t2" data-t="2"></div><div class="swatch t3" data-t="3"></div><div class="swatch t4" data-t="4"></div><div class="swatch t5" data-t="5"></div></div></div>
          <div class="s-row"><span class="s-lbl" id="s-size-lbl">Tamaño</span><div class="s-sizes"><button class="s-sz" data-sz="0">S</button><button class="s-sz active" data-sz="1">M</button><button class="s-sz" data-sz="2">L</button></div></div>
          <div class="s-row"><span class="s-lbl" id="s-radius-lbl">Bordes</span><div class="s-sizes"><button class="s-sz s-br" data-br="0"></button><button class="s-sz s-br active" data-br="1"></button><button class="s-sz s-br" data-br="2"></button></div></div>
          <div class="s-opacity-row"><div class="s-row"><span class="s-lbl" id="s-opacity-lbl">Opacidad</span><span class="s-stat-v" id="s-opacity-val">100%</span></div><input type="range" class="s-slider" id="s-opacity" min="30" max="100" value="100" step="5"></div>
          <div class="s-row"><span class="s-lbl" id="s-clock-lbl">Reloj</span><div class="s-sizes"><button class="s-sz s-fmt active" data-fmt="off">—</button><button class="s-sz s-fmt" data-fmt="24">24h</button><button class="s-sz s-fmt" data-fmt="12">12h</button></div></div>
          <div class="s-sep"></div>
          <div class="s-row"><span class="s-lbl" id="s-show-sess-lbl">Info sesión</span><label class="alarm-sw"><input type="checkbox" id="s-show-sess" checked><div class="alarm-trk"></div></label></div>
          <div class="s-row"><span class="s-lbl" id="s-bg-lbl">Fondo</span><div class="s-bg-row"><label class="s-file-btn" id="s-file-label"><span id="s-file-label-txt">Elegir imagen</span><input type="file" id="s-file" accept="image/*" style="display:none"></label><button class="s-clear-btn" id="s-clear-bg" style="display:none">Quitar</button></div></div>
          <div id="s-thumb"></div>
        </div>
        <div class="s-panel" id="s-panel-stats" style="display:none">
          <div class="s-stats"><div class="s-stat"><span class="s-stat-l" id="s-today-lbl">Hoy</span><span class="s-stat-v" id="s-today">—</span></div><div class="s-stat"><span class="s-stat-l" id="s-week-lbl">Semana</span><span class="s-stat-v" id="s-week">—</span></div><div class="s-stat"><span class="s-stat-l" id="s-month-lbl">Mes</span><span class="s-stat-v" id="s-month">—</span></div></div>
        </div>
        <div class="s-panel" id="s-panel-blocks" style="display:none">
          <div class="s-blk-wrap"><div class="s-blk-add"><input class="s-blk-inp" id="s-blk-inp" type="text" placeholder="youtube.com" autocomplete="off" spellcheck="false"><button class="s-blk-btn" id="s-blk-add">+</button></div><div class="s-blk-list" id="s-blk-list"></div></div>
        </div>
        <button class="s-save" id="s-save">Volver</button>
      </div>
    </div>
  `;

  shadow.innerHTML = '<style>' + WIDGET_CSS + '</style>' + WIDGET_HTML;

  // ── Referencias DOM ────────────────────────────────────────────────────────
  var w       = shadow.getElementById('w');
  var lbl     = shadow.getElementById('lbl');
  var t       = shadow.getElementById('t');
  var bar     = shadow.getElementById('bar');
  var pbtn    = shadow.getElementById('pbtn');
  var pi      = shadow.getElementById('pi');
  var pai     = shadow.getElementById('pai');
  var nwbtn   = shadow.getElementById('nwbtn');
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
  var sLangEs  = shadow.getElementById('s-lang-es');
  var sLangEn  = shadow.getElementById('s-lang-en');
  var alarmChk = shadow.getElementById('alarm-chk');
  var sLongChk  = shadow.getElementById('s-long-chk');
  var sLongDur  = shadow.getElementById('s-long-dur');
  var sLongRow  = shadow.getElementById('s-long-row');
  var sBlkInp   = shadow.getElementById('s-blk-inp');
  var sBlkAdd   = shadow.getElementById('s-blk-add');
  var sBlkList  = shadow.getElementById('s-blk-list');
  var sTabs      = shadow.querySelectorAll('.s-tab');
  var currentTab  = 'session';
  var ratingBar   = shadow.getElementById('rating-bar');
  var ratingCta   = shadow.getElementById('rating-cta');
  var ratingX     = shadow.getElementById('rating-x');
  var sOpacity    = shadow.getElementById('s-opacity');
  var sOpacityVal = shadow.getElementById('s-opacity-val');
  var sBrBtns     = shadow.querySelectorAll('.s-br');
  var sFmtBtns    = shadow.querySelectorAll('.s-fmt');
  var sShowSess   = shadow.getElementById('s-show-sess');
  var sAccent     = shadow.getElementById('s-accent');
  var sColorDot   = shadow.getElementById('s-color-dot');
  var clock       = shadow.getElementById('clock');

  // ── Utilidades ─────────────────────────────────────────────────────────────
  function fmt(s) { return String(Math.floor(s/60)).padStart(2,'0') + ':' + String(s%60).padStart(2,'0'); }
  function totalFor(m) { return m === 'work' ? WORK : (isLongBreak ? LONG_BREAK : BREAK); }
  function calcTimeLeft() {
    var el = (isRunning && startTime) ? offset + Math.floor((Date.now() - startTime) / 1000) : offset;
    return Math.max(0, totalFor(mode) - el);
  }
  function fmtDate(d) {
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
  }
  function fmtMin(m) {
    if (!m) return '—';
    if (m < 60) return m + T('min');
    var h = Math.floor(m/60), mn = m % 60;
    return h + 'h' + (mn ? ' ' + mn + 'm' : '');
  }
  function elapsedWorkMin() {
    if (mode !== 'work') return 0;
    var el = (isRunning && startTime) ? offset + Math.floor((Date.now() - startTime) / 1000) : offset;
    return Math.floor(el / 60);
  }

  // ── Blacklist ──────────────────────────────────────────────────────────────
  function isBlocked() {
    if (!isRunning || mode !== 'work' || !blacklist.length) return false;
    var cur = (location.hostname + location.pathname).replace(/^www\./, '').replace(/\/$/, '');
    return blacklist.some(function(p) {
      var pat = p.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '');
      return cur === pat || cur.startsWith(pat + '/');
    });
  }

  function renderBlacklist() {
    sBlkList.innerHTML = '';
    if (!blacklist.length) {
      var empty = document.createElement('div');
      empty.className = 's-blk-empty';
      empty.textContent = T('blockEmpty');
      sBlkList.appendChild(empty);
      return;
    }
    blacklist.forEach(function(p, i) {
      var item = document.createElement('div');
      item.className = 's-blk-item';
      var span = document.createElement('span');
      span.className = 's-blk-url'; span.textContent = p;
      var del = document.createElement('button');
      del.className = 's-blk-del'; del.textContent = '×';
      del.addEventListener('click', function(e) {
        e.stopPropagation();
        blacklist.splice(i, 1);
        chrome.storage.local.set({ pomoBlacklist: blacklist });
        renderBlacklist();
      });
      item.appendChild(span); item.appendChild(del);
      sBlkList.appendChild(item);
    });
  }

  // ── Alarma ─────────────────────────────────────────────────────────────────
  function playAlarm() {
    if (!alarmEnabled) return;
    try {
      var ctx = new (window.AudioContext || window.webkitAudioContext)();
      [[880, 0], [1100, 0.22], [1320, 0.44]].forEach(function(p) {
        var osc = ctx.createOscillator(), gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'sine'; osc.frequency.value = p[0];
        gain.gain.setValueAtTime(0.28, ctx.currentTime + p[1]);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + p[1] + 0.22);
        osc.start(ctx.currentTime + p[1]);
        osc.stop(ctx.currentTime + p[1] + 0.22);
      });
    } catch(e) {}
  }

  // ── Temas ──────────────────────────────────────────────────────────────────
  function applyTheme(idx) {
    currentTheme = idx;
    customAccent = null;
    w.style.removeProperty('--cw');
    w.style.removeProperty('--cb');
    w.className = 'w ' + mode + (isRunning ? ' run' : '') + ' t' + idx + ' sz' + currentSize + ' br' + currentRadius + (settVisible ? ' sett-open' : '');
    swatches.forEach(function(s) { s.classList.toggle('active', parseInt(s.dataset.t) === idx); });
    sColorDot.style.background = '';
    sColorDot.classList.remove('active');
  }

  var szBtns = shadow.querySelectorAll('.s-sz[data-sz]');
  function applySize(sz) {
    currentSize = sz;
    w.className = 'w ' + mode + (isRunning ? ' run' : '') + ' t' + currentTheme + ' sz' + sz + ' br' + currentRadius + (settVisible ? ' sett-open' : '');
    szBtns.forEach(function(b) { b.classList.toggle('active', parseInt(b.dataset.sz) === sz); });
  }

  // ── Idioma ─────────────────────────────────────────────────────────────────
  function applyLang(l) {
    lang = l;
    sLangEs.classList.toggle('active', l === 'es');
    sLangEn.classList.toggle('active', l === 'en');
    shadow.getElementById('s-tab-session').textContent    = T('tabSession');
    shadow.getElementById('s-tab-appearance').textContent = T('tabAppearance');
    shadow.getElementById('s-tab-stats').textContent      = T('tabStats');
    shadow.getElementById('s-tab-blocks').textContent     = T('tabBlocks');
    shadow.getElementById('s-lang-lbl').textContent       = T('language');
    shadow.getElementById('s-work-lbl').textContent       = T('workLbl');
    shadow.getElementById('s-break-lbl').textContent      = T('breakLbl');
    shadow.getElementById('s-theme-lbl').textContent      = T('theme');
    shadow.getElementById('s-size-lbl').textContent       = T('size');
    shadow.getElementById('s-bg-lbl').textContent         = T('bg');
    shadow.getElementById('s-file-label-txt').textContent = T('chooseImg');
    sClearBg.textContent                                  = T('removeImg');
    shadow.getElementById('s-today-lbl').textContent      = T('today');
    shadow.getElementById('s-week-lbl').textContent       = T('week');
    shadow.getElementById('s-month-lbl').textContent      = T('month');
    sSave.textContent                                     = T('save').toUpperCase();
    shadow.getElementById('alarm-lbl-txt').textContent    = T('alarm');
    shadow.getElementById('nwbtn').textContent            = T('newCycle');
    shadow.getElementById('rating-msg').textContent       = T('ratingMsg');
    shadow.getElementById('rating-cta').textContent       = T('ratingCta');
    shadow.getElementById('s-long-lbl').textContent       = T('longBreakLbl');
    shadow.getElementById('s-long-dur-lbl').textContent   = T('longBreakDurLbl');
    sBlkInp.placeholder                                   = T('blockPlaceholder');
    shadow.getElementById('s-opacity-lbl').textContent    = T('opacity');
    shadow.getElementById('s-radius-lbl').textContent     = T('radius');
    shadow.getElementById('s-clock-lbl').textContent      = T('clockLbl');
    shadow.getElementById('s-show-sess-lbl').textContent  = T('showSess');
    renderBlacklist();
    render();
  }

  // ── Nuevas opciones de apariencia ─────────────────────────────────────────
  function refreshOpacity() {
    var settOpen = sett.style.display !== 'none';
    var shouldFade = currentlyIdle && !settOpen;
    w.style.opacity = shouldFade ? (currentOpacity / 100).toFixed(2) : '1';
  }
  function applyOpacity(val) {
    currentOpacity = val;
    sOpacityVal.textContent = val + '%';
    sOpacity.value = val;
    refreshOpacity();
  }
  function applyRadius(idx) {
    currentRadius = idx;
    w.style.removeProperty('border-radius');
    render();
    sBrBtns.forEach(function(b) { b.classList.toggle('active', parseInt(b.dataset.br) === idx); });
  }
  function applyClockFmt(fmt) {
    clockFmt = fmt;
    clock.style.display = fmt === 'off' ? 'none' : '';
    sFmtBtns.forEach(function(b) { b.classList.toggle('active', b.dataset.fmt === fmt); });
    updateClock();
  }
  function updateClock() {
    if (clockFmt === 'off') return;
    var now = new Date();
    var h = now.getHours(), m = now.getMinutes();
    if (clockFmt === '12') {
      var ampm = h >= 12 ? 'PM' : 'AM';
      h = h % 12 || 12;
      clock.textContent = h + ':' + String(m).padStart(2,'0') + ' ' + ampm;
    } else {
      clock.textContent = String(h).padStart(2,'0') + ':' + String(m).padStart(2,'0');
    }
  }
  function applyShowSess(show) {
    showSessionInfo = show;
    inf.style.display = show ? '' : 'none';
    sShowSess.checked = show;
  }
  function applyAccent(color) {
    customAccent = color;
    if (color) {
      w.style.setProperty('--cw', color);
      w.style.setProperty('--cb', 'color-mix(in srgb, ' + color + ', #fff 30%)');
      sColorDot.style.background = color;
      sColorDot.classList.add('active');
      swatches.forEach(function(s) { s.classList.remove('active'); });
    } else {
      w.style.removeProperty('--cw');
      w.style.removeProperty('--cb');
      sColorDot.style.background = '';
      sColorDot.classList.remove('active');
    }
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

  // ── Estadísticas ───────────────────────────────────────────────────────────
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

  function updateStats() {
    chrome.storage.local.get('pomoStats', function(data) {
      cachedStats = data.pomoStats || {};
      renderStats();
    });
  }

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
    w.className     = 'w ' + mode + (isRunning ? ' run' : '') + ' t' + currentTheme + ' sz' + currentSize + ' br' + currentRadius + (settVisible ? ' sett-open' : '');
    lbl.textContent = mode === 'work' ? T('work') : (isLongBreak ? T('longBreak') : T('brk'));
    pi.style.display  = isRunning ? 'none'  : 'block';
    pai.style.display = isRunning ? 'block' : 'none';
    inf.textContent   = T('sessionFmt')(session, completed);

    if (isRunning && tl === 0) completeSession();

    ratingBar.style.display = (!ratingDismissed && completed >= RATING_THRESHOLD) ? 'flex' : 'none';
    var blocked = isBlocked();
    blockerHost.style.display = blocked ? 'flex' : 'none';
    if (blocked) {
      bShadow.getElementById('blk-title').textContent  = T('blockTitle');
      bShadow.getElementById('blk-mode').textContent   = T('blockMode');
      bShadow.getElementById('blk-msg').textContent    = T('blockMsg');
      bShadow.getElementById('blk-time').textContent   = fmt(tl);
      bShadow.getElementById('blk-domain').textContent = location.hostname.replace(/^www\./, '');
    }
  }

  function saveState() {
    chrome.storage.local.set({ pomoState: { mode: mode, isRunning: isRunning, offset: offset, startTime: startTime, completed: completed, session: session, isLongBreak: isLongBreak } });
  }
  function loadState(s) {
    if (!s) return;
    mode      = s.mode      || 'work';
    completed = s.completed || 0;
    session   = s.session   || 1;
    isRunning = !!s.isRunning;
    startTime = s.startTime || null;
    offset      = s.offset      || 0;
    isLongBreak = !!s.isLongBreak;
  }

  function saveSettings() {
    chrome.storage.local.set({ pomoSettings: {
      work: Math.round(WORK / 60), break: Math.round(BREAK / 60),
      theme: currentTheme, size: currentSize, lang: lang,
      alarm: alarmEnabled, longBreak: longBreakEnabled,
      longBreakDur: Math.round(LONG_BREAK / 60),
      opacity: currentOpacity, radius: currentRadius,
      clockFmt: clockFmt, showSess: showSessionInfo,
      accent: customAccent
    }});
  }

  function completeSession() {
    if (mode === 'work') {
      addStudyMinutes(Math.round(WORK / 60));
      completed++; session++;
      if (longBreakEnabled && completed % 4 === 0) {
        isLongBreak = true;
        chrome.runtime.sendMessage({ type: 'pomo_notify', title: T('notifyLongStart'), body: T('notifyLongStartBody') });
      } else {
        isLongBreak = false;
        chrome.runtime.sendMessage({ type: 'pomo_notify', title: T('notifyWorkTitle'), body: T('notifyWorkBody') });
      }
    } else {
      var wasLong = isLongBreak;
      isLongBreak = false;
      chrome.runtime.sendMessage({ type: 'pomo_notify',
        title: wasLong ? T('notifyLongEnd')  : T('notifyBreakTitle'),
        body:  wasLong ? T('notifyLongEndBody') : T('notifyBreakBody') });
    }
    playAlarm();
    mode = mode === 'work' ? 'break' : 'work';
    offset = 0; startTime = Date.now();
    w.classList.add('pop');
    setTimeout(function() { w.classList.remove('pop'); }, 400);
    saveState();
  }

  // ── Panel de ajustes ───────────────────────────────────────────────────────
  function openSettings() {
    settVisible = true;
    sWork.value  = Math.round(WORK  / 60);
    sBreak.value = Math.round(BREAK / 60);
    sLongChk.checked = longBreakEnabled;
    sLongDur.value   = Math.round(LONG_BREAK / 60);
    sLongRow.style.display = longBreakEnabled ? '' : 'none';
    renderBlacklist();
    szBtns.forEach(function(b) { b.classList.toggle('active', parseInt(b.dataset.sz) === currentSize); });
    sBrBtns.forEach(function(b) { b.classList.toggle('active', parseInt(b.dataset.br) === currentRadius); });
    sFmtBtns.forEach(function(b) { b.classList.toggle('active', b.dataset.fmt === clockFmt); });
    sOpacity.value = currentOpacity;
    sOpacityVal.textContent = currentOpacity + '%';
    sShowSess.checked = showSessionInfo;
    if (customAccent) { sAccent.value = customAccent; sColorDot.style.background = customAccent; sColorDot.classList.add('active'); }
    else { sColorDot.style.background = ''; sColorDot.classList.remove('active'); }
    if (currentBg) { sThumb.style.display = 'block'; sClearBg.style.display = ''; }
    main.style.display = 'none';
    sett.style.display = '';
    gbtn.style.display = 'none';
    refreshOpacity();
    switchTab(currentTab);
    applyLang(lang);
    updateStats();
  }
  function closeSettings() {
    settVisible = false;
    main.style.display = '';
    sett.style.display = 'none';
    gbtn.style.display = '';
    render();
    refreshOpacity();
  }

  function switchTab(name) {
    currentTab = name;
    sTabs.forEach(function(t) { t.classList.toggle('active', t.dataset.tab === name); });
    ['session', 'appearance', 'stats', 'blocks'].forEach(function(p) {
      shadow.getElementById('s-panel-' + p).style.display = p === name ? '' : 'none';
    });
  }

  gbtn.addEventListener('click', function(e) {
    e.stopPropagation();
    if (sett.style.display === 'none') openSettings(); else closeSettings();
  });

  sTabs.forEach(function(tab) {
    tab.addEventListener('click', function(e) { e.stopPropagation(); switchTab(tab.dataset.tab); });
  });

  ratingX.addEventListener('click', function(e) {
    e.stopPropagation();
    ratingDismissed = true;
    chrome.storage.local.set({ pomoRatingDismissed: true });
    ratingBar.style.display = 'none';
  });

  ratingCta.addEventListener('click', function() {
    ratingDismissed = true;
    chrome.storage.local.set({ pomoRatingDismissed: true });
  });

  swatches.forEach(function(sw) {
    sw.addEventListener('click', function(e) {
      e.stopPropagation();
      applyTheme(parseInt(sw.dataset.t));
      saveSettings();
    });
  });

  szBtns.forEach(function(b) {
    b.addEventListener('click', function(e) {
      e.stopPropagation();
      applySize(parseInt(b.dataset.sz));
      saveSettings();
    });
  });

  sLangEs.addEventListener('click', function(e) {
    e.stopPropagation();
    applyLang('es');
    saveSettings();
  });

  sLangEn.addEventListener('click', function(e) {
    e.stopPropagation();
    applyLang('en');
    saveSettings();
  });

  alarmChk.addEventListener('change', function(e) {
    e.stopPropagation();
    alarmEnabled = alarmChk.checked;
    saveSettings();
  });

  sLongChk.addEventListener('change', function(e) {
    e.stopPropagation();
    longBreakEnabled = sLongChk.checked;
    sLongRow.style.display = longBreakEnabled ? '' : 'none';
    saveSettings();
  });

  function addToBlacklist() {
    var val = sBlkInp.value.trim().replace(/^https?:\/\//, '').replace(/\/$/, '');
    if (!val || blacklist.indexOf(val) !== -1) return;
    blacklist.push(val);
    chrome.storage.local.set({ pomoBlacklist: blacklist });
    renderBlacklist();
    sBlkInp.value = '';
  }
  sBlkAdd.addEventListener('click', function(e) { e.stopPropagation(); addToBlacklist(); });
  sBlkInp.addEventListener('keydown', function(e) { if (e.key === 'Enter') { e.stopPropagation(); addToBlacklist(); } });

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

  sOpacity.addEventListener('input', function(e) {
    e.stopPropagation();
    applyOpacity(parseInt(sOpacity.value));
    saveSettings();
  });

  sBrBtns.forEach(function(b) {
    b.addEventListener('click', function(e) {
      e.stopPropagation();
      applyRadius(parseInt(b.dataset.br));
      saveSettings();
    });
  });

  sFmtBtns.forEach(function(b) {
    b.addEventListener('click', function(e) {
      e.stopPropagation();
      applyClockFmt(b.dataset.fmt);
      saveSettings();
    });
  });

  sShowSess.addEventListener('change', function(e) {
    e.stopPropagation();
    applyShowSess(sShowSess.checked);
    saveSettings();
  });

  sAccent.addEventListener('input', function(e) {
    e.stopPropagation();
    applyAccent(sAccent.value);
    saveSettings();
  });

  sSave.addEventListener('click', function(e) {
    e.stopPropagation();
    var nw = Math.max(1,  Math.min(99, parseInt(sWork.value)    || 25));
    var nb = Math.max(1,  Math.min(99, parseInt(sBreak.value)   || 5));
    var nl = Math.max(5,  Math.min(60, parseInt(sLongDur.value) || 15));
    WORK       = nw * 60;
    BREAK      = nb * 60;
    LONG_BREAK = nl * 60;
    longBreakEnabled = sLongChk.checked;
    saveSettings();
    saveState();
    closeSettings();
    render();
  });

  // ── Cargar estado + ajustes ────────────────────────────────────────────────
  chrome.storage.local.get(['pomoState', 'pomoVisible', 'pomoSettings', 'pomoBg', 'pomoPosition', 'pomoBlacklist', 'pomoRatingDismissed'], function(data) {
    if (data.pomoSettings) {
      WORK  = (data.pomoSettings.work  || 25) * 60;
      BREAK = (data.pomoSettings.break || 5)  * 60;
      currentTheme = data.pomoSettings.theme || 0;
      currentSize  = data.pomoSettings.size  != null ? data.pomoSettings.size : 1;
      if (data.pomoSettings.lang) lang = data.pomoSettings.lang;
      if (data.pomoSettings.alarm != null) { alarmEnabled = data.pomoSettings.alarm; alarmChk.checked = alarmEnabled; }
      if (data.pomoSettings.longBreak != null) longBreakEnabled = data.pomoSettings.longBreak;
      if (data.pomoSettings.longBreakDur) LONG_BREAK = data.pomoSettings.longBreakDur * 60;
      if (data.pomoSettings.opacity != null) applyOpacity(data.pomoSettings.opacity);
      if (data.pomoSettings.radius  != null) applyRadius(data.pomoSettings.radius);
      if (data.pomoSettings.clockFmt)        applyClockFmt(data.pomoSettings.clockFmt);
      if (data.pomoSettings.showSess != null) applyShowSess(data.pomoSettings.showSess);
      if (data.pomoSettings.accent)           applyAccent(data.pomoSettings.accent);
    }
    loadState(data.pomoState);
    if (data.pomoBg) applyBg(data.pomoBg);
    if (data.pomoPosition)  applyPosition(data.pomoPosition.l, data.pomoPosition.t);
    if (data.pomoBlacklist) blacklist = data.pomoBlacklist;
    if (data.pomoRatingDismissed) ratingDismissed = true;
    ratingCta.href = STORE_URL;
    applyTheme(currentTheme);
    render();
    if (data.pomoVisible === true) host.style.display = '';
  });

  // ── Sincronización entre pestañas ──────────────────────────────────────────
  chrome.storage.onChanged.addListener(function(changes, area) {
    if (area !== 'local') return;
    if (changes.pomoState)    { loadState(changes.pomoState.newValue); render(); }
    if (changes.pomoVisible)  {
      if (changes.pomoVisible.newValue === true) {
        host.style.display = '';
      } else {
        host.style.display = 'none';
        isRunning = false; startTime = null; offset = 0;
        mode = 'work'; completed = 0; session = 1; isLongBreak = false;
        render();
      }
    }
    if (changes.pomoBg)       { if (changes.pomoBg.newValue) applyBg(changes.pomoBg.newValue); else clearBg(); }
    if (changes.pomoPosition)  { var p = changes.pomoPosition.newValue; if (p) applyPosition(p.l, p.t); }
    if (changes.pomoBlacklist) { blacklist = changes.pomoBlacklist.newValue || []; render(); }
    if (changes.pomoSettings) {
      var s = changes.pomoSettings.newValue;
      if (s) {
        WORK = (s.work||25)*60; BREAK = (s.break||5)*60;
        currentSize = s.size != null ? s.size : 1;
        if (s.lang) lang = s.lang;
        if (s.alarm != null) { alarmEnabled = s.alarm; alarmChk.checked = alarmEnabled; }
        if (s.longBreak != null) longBreakEnabled = s.longBreak;
        if (s.longBreakDur) LONG_BREAK = s.longBreakDur * 60;
        applyTheme(s.theme||0); applySize(currentSize); render();
        if (s.opacity != null) applyOpacity(s.opacity);
        if (s.radius  != null) applyRadius(s.radius);
        if (s.clockFmt)        applyClockFmt(s.clockFmt);
        if (s.showSess != null) applyShowSess(s.showSess);
        if (s.accent)          applyAccent(s.accent);
        else if ('accent' in s && !s.accent) applyAccent(null);
      }
    }
  });

  // ── Tick ───────────────────────────────────────────────────────────────────
  var poll = setInterval(function() {
    if (!chrome.runtime || !chrome.runtime.id) { clearInterval(poll); host.remove(); return; }
    render();
    updateClock();
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

  nwbtn.addEventListener('click', function(e) {
    e.stopPropagation();
    addStudyMinutes(elapsedWorkMin());
    isRunning = false; startTime = null; offset = 0;
    mode = 'work'; completed = 0; session = 1; isLongBreak = false;
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
    isLongBreak = false;
    mode = mode === 'work' ? 'break' : 'work';
    saveState(); render();
  });

  xbtn.addEventListener('click', function(e) {
    e.stopPropagation();
    host.style.display = 'none';
  });

  // ── Drag + Snap to corners ─────────────────────────────────────────────────
  var drag = false, sx, sy, ox, oy;

  function applyPosition(goLeft, goTop) {
    var margin = 24;
    host.style.left   = goLeft ? margin + 'px' : 'auto';
    host.style.right  = goLeft ? 'auto' : margin + 'px';
    host.style.top    = goTop  ? margin + 'px' : 'auto';
    host.style.bottom = goTop  ? 'auto' : margin + 'px';
  }

  function snapToCorner() {
    var r      = host.getBoundingClientRect();
    var goLeft = (r.left + r.width  / 2) < window.innerWidth  / 2;
    var goTop  = (r.top  + r.height / 2) < window.innerHeight / 2;
    host.style.transition = 'left .28s cubic-bezier(.34,1.56,.64,1),top .28s cubic-bezier(.34,1.56,.64,1),right .28s,bottom .28s';
    applyPosition(goLeft, goTop);
    setTimeout(function() { host.style.transition = ''; }, 320);
    chrome.storage.local.set({ pomoPosition: { l: goLeft, t: goTop } });
  }

  hdr.addEventListener('mousedown', function(e) {
    if (xbtn.contains(e.target) || gbtn.contains(e.target)) return;
    drag = true; sx = e.clientX; sy = e.clientY;
    host.style.transition = 'none';
    var r = host.getBoundingClientRect();
    ox = r.left; oy = r.top;
    host.style.right = 'auto'; host.style.bottom = 'auto';
    host.style.left = ox + 'px'; host.style.top = oy + 'px';
    e.preventDefault();
  });

  document.addEventListener('mousemove', function(e) {
    if (drag) {
      host.style.left = Math.max(0, Math.min(window.innerWidth  - host.offsetWidth,  ox + e.clientX - sx)) + 'px';
      host.style.top  = Math.max(0, Math.min(window.innerHeight - host.offsetHeight, oy + e.clientY - sy)) + 'px';
    }
    if (host.style.display === 'none') return;
    var r  = host.getBoundingClientRect();
    var dx = Math.max(0, Math.max(r.left - e.clientX, e.clientX - r.right));
    var dy = Math.max(0, Math.max(r.top  - e.clientY, e.clientY - r.bottom));
    var idle = Math.sqrt(dx * dx + dy * dy) > 80;
    if (idle !== currentlyIdle) { currentlyIdle = idle; refreshOpacity(); }
  });

  document.addEventListener('mouseleave', function() {
    if (host.style.display !== 'none') { currentlyIdle = true; refreshOpacity(); }
  });

  document.addEventListener('mouseup', function() {
    if (!drag) return;
    drag = false;
    snapToCorner();
  });
})();
