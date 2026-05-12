'use strict';

var toggleEl = document.getElementById('toggle');
var statusEl = document.getElementById('status');
var hintEl   = document.getElementById('hint');

function setUI(visible) {
  toggleEl.checked     = visible;
  statusEl.textContent = visible ? 'Visible' : 'Oculto';
  statusEl.className   = 'status' + (visible ? ' on' : '');
  hintEl.textContent   = visible
    ? 'Arrastra el timer a cualquier esquina'
    : 'El timer sigue corriendo en segundo plano';
}

chrome.storage.local.get('pomoVisible', function(data) {
  setUI(data.pomoVisible === true);
});

toggleEl.addEventListener('change', function() {
  var visible = toggleEl.checked;
  setUI(visible);
  chrome.storage.local.set({ pomoVisible: visible });
  if (!visible) chrome.storage.local.remove('pomoState');
});
