'use strict';

var toggleEl  = document.getElementById('toggle');
var statusEl  = document.getElementById('status');
var hintEl    = document.getElementById('hint');
var modeLbl   = document.getElementById('mode-lbl');
var timeVal   = document.getElementById('time-val');
var sessInfo  = document.getElementById('sess-info');
var dotEl     = document.getElementById('dot');
var timerSect = document.getElementById('timer-sect');

function fmt(s) {
  return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
}

function calcTimeLeft(state, settings) {
  var work    = ((settings && settings.work)         || 25) * 60;
  var brk     = ((settings && settings.break)        || 5)  * 60;
  var longBrk = ((settings && settings.longBreakDur) || 15) * 60;
  var total   = state.mode === 'work' ? work : (state.isLongBreak ? longBrk : brk);
  var elapsed = state.offset || 0;
  if (state.isRunning && state.startTime) {
    elapsed += Math.floor((Date.now() - state.startTime) / 1000);
  }
  return Math.max(0, total - elapsed);
}

function setToggleUI(visible) {
  toggleEl.checked     = visible;
  statusEl.textContent = visible ? 'Visible' : 'Hidden';
  statusEl.className   = 'status' + (visible ? ' on' : '');
  hintEl.textContent   = visible
    ? 'Drag the timer to any corner'
    : 'Enable to show the timer on every tab';
}

function setTimerUI(state, settings) {
  if (!state || !state.mode) {
    modeLbl.textContent  = 'NOT STARTED';
    timeVal.textContent  = '—';
    timeVal.className    = 'time-val idle';
    sessInfo.textContent = '';
    timerSect.style.removeProperty('--c');
    dotEl.classList.remove('pulse');
    return;
  }

  var isWork  = state.mode === 'work';
  var isLong  = !isWork && state.isLongBreak;
  var color   = isWork ? '#ff6b6b' : '#4dd9ac';
  var modeStr = isWork ? 'WORK' : (isLong ? 'LONG BREAK' : 'BREAK');
  var tl      = calcTimeLeft(state, settings);

  timerSect.style.setProperty('--c', color);
  modeLbl.textContent  = modeStr;
  timeVal.textContent  = fmt(tl);
  timeVal.className    = 'time-val';
  sessInfo.textContent = 'Session ' + (state.session || 1) + ' · ' + (state.completed || 0) + ' completed';

  if (state.isRunning) {
    dotEl.classList.add('pulse');
  } else {
    dotEl.classList.remove('pulse');
  }
}

chrome.storage.local.get(['pomoVisible', 'pomoState', 'pomoSettings'], function(data) {
  setToggleUI(data.pomoVisible === true);
  setTimerUI(data.pomoState || null, data.pomoSettings || null);
});

toggleEl.addEventListener('change', function() {
  var visible = toggleEl.checked;
  setToggleUI(visible);
  chrome.storage.local.set({ pomoVisible: visible });
  if (!visible) chrome.storage.local.remove('pomoState');
});
