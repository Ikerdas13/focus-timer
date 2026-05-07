'use strict';

// ── Inyección en pestañas ──────────────────────────────────────────────────
async function injectTab(tabId, reset) {
  try {
    if (reset) {
      await chrome.scripting.executeScript({
        target: { tabId: tabId },
        world: 'ISOLATED',
        func: function() {
          window.__pomoActive = false;
          var el = document.getElementById('__pomo_host__');
          if (el) el.remove();
        }
      });
    }
    await chrome.scripting.executeScript({ target: { tabId: tabId }, files: ['content.js'] });
  } catch (e) {}
}

async function injectAllTabs() {
  var tabs = await chrome.tabs.query({ url: ['http://*/*', 'https://*/*'] });
  for (var i = 0; i < tabs.length; i++) {
    await injectTab(tabs[i].id, true);
  }
}

chrome.runtime.onInstalled.addListener(function() {
  injectAllTabs();
});

chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
  if (changeInfo.status !== 'complete') return;
  if (!tab.url || (!tab.url.startsWith('http://') && !tab.url.startsWith('https://'))) return;
  injectTab(tabId, false);
});

// ── Notificaciones del sistema ─────────────────────────────────────────────
chrome.runtime.onMessage.addListener(function(msg) {
  if (msg.type !== 'pomo_notify') return;
  chrome.notifications.create('pomo_' + Date.now(), {
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: msg.title,
    message: msg.body,
    priority: 1,
    silent: false
  });
});
