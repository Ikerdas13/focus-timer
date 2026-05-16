# Focus Timer — Pomodoro

A premium floating Pomodoro timer that stays visible on every Chrome tab.  
Designed by **Iker G.**

---

## Install from source (Developer Mode)

1. Download or clone this repository
2. Open Chrome → `chrome://extensions/`
3. Enable **Developer mode** (top-right toggle)
4. Click **Load unpacked** and select the `extension` folder
5. The timer appears on every page immediately

---

## Features

- **Always visible** — floats over every website, draggable to any corner
- **Works across all tabs** — one timer, synchronized everywhere
- **Customizable durations** — set your own work / break minutes
- **3 custom colors** — independent pickers for menu accent, work and break
- **3 sizes** — S / M / L including circle / pill mode
- **Custom background image** — pick any photo from your computer
- **Opacity control** — set idle transparency (50–100%)
- **Live clock** — 12h / 24h / off
- **Study time tracking** — daily, weekly and monthly stats, updated in real time
- **Site blocker** — block distracting domains during work sessions
- **Long breaks** — automatic extended rest after every 4 work sessions
- **Bilingual** — switch between Spanish and English from the widget
- **Persistent state** — timer keeps running even when you switch tabs

---

## Project structure

```
focus-timer/
├── extension/          ← load this folder in Chrome
│   ├── background.js   service worker (notifications, state sync)
│   ├── content.js      floating widget (Shadow DOM)
│   ├── manifest.json   Manifest V3
│   ├── popup.html/js   extension popup
│   └── icons/
├── index.html          landing page (GitHub Pages)
├── privacy.html        privacy policy page
├── STORE_LISTING.md    Chrome Web Store copy (EN + ES)
└── LICENSE
```

---

## Tech

Manifest V3 · Shadow DOM · Background service worker · `chrome.storage.onChanged` for real-time cross-tab sync · No dependencies · No build step

---

## Privacy

All data is stored **locally in the browser** via `chrome.storage.local`. Nothing is sent to any server. No tracking. No analytics.

| Key | What is stored |
|---|---|
| `pomoState` | Timer state (mode, elapsed time, session count) |
| `pomoSettings` | User preferences (durations, theme, size, language, alarm) |
| `pomoBg` | Custom background image (compressed JPEG, max 640 px) |
| `pomoStats` | Daily study minutes (date-keyed, auto-pruned after 1 year) |
| `pomoVisible` | Whether the widget is shown or hidden |
| `pomoPosition` | Widget corner position |
| `pomoBlacklist` | Domains blocked during work sessions |

---

## Permissions

| Permission | Reason |
|---|---|
| `storage` | Persist timer state and settings across tabs |
| `scripting` | Inject the widget into already-open tabs on install |
| `tabs` | Re-inject the widget when a new tab finishes loading |
| `notifications` | Desktop alerts when a session ends |
| `http://*/*` `https://*/*` | Allow injection on all web pages |

---

## Changelog

### v1.3.0
- 3 independent color pickers: Menu accent, Work, Break — with Reset button
- Appearance panel reorganized into sections: Colors · Widget · Display
- Opacity slider (0% = 50% real opacity, 100% = full)
- Border toggle: sharp / rounded / circle
- Live clock: 12h / 24h / off
- Session info toggle
- Scroll in settings no longer bleeds through to the page
- Exact pixel-level mouse detection for opacity fade

### v1.2.0
- Settings redesigned with tab navigation (Sesión · Aspecto · Stats · Bloqueos)
- All settings panels fixed height with minimal scrollbar
- Gear button hides while settings are open
- "Guardar" renamed to "Volver", visible in all sections
- New cycle button (text, rectangle border) below controls
- Session info moved above the timer clock
- Compacted layout and increased idle opacity
- Rating prompt after 3 completed sessions
- Timer resets when the widget is toggled off or Chrome is reopened

---

## License

MIT
