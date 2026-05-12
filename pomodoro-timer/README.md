# Focus Timer — Pomodoro

A premium floating Pomodoro timer that stays visible on every Chrome tab.  
Designed by **Iker G.**

---

## Features

- **Always visible** — floats over every website, draggable to any corner
- **Works across all tabs** — one timer, synchronized everywhere
- **Customizable durations** — set your own work / break minutes
- **4 color themes** — Obsidian, Ocean, Sunset, Cosmic
- **3 sizes** — S / M / L to fit your workflow
- **Custom background image** — pick any photo from your computer
- **Study time tracking** — daily, weekly and monthly stats, updated in real time
- **Persistent state** — timer keeps running even when you switch tabs

---

## Install from source (Developer Mode)

1. Download or clone this repository
2. Open Chrome → `chrome://extensions/`
3. Enable **Developer mode** (top-right toggle)
4. Click **Load unpacked** and select the `pomodoro-timer` folder
5. The timer appears on every page immediately

---

## Chrome Web Store — submission checklist

- [ ] 440×280 px promotional tile (small)
- [ ] 1280×800 px screenshot (or 640×400 px) of the extension in action
- [ ] Short description (≤ 132 characters) + full description
- [ ] Privacy policy URL (required — this extension stores user data locally)

---

## Privacy

All data is stored **locally in the browser** via `chrome.storage.local`.  
Nothing is sent to any server. No tracking. No analytics.

| Key | What is stored |
|---|---|
| `pomoState` | Timer state (mode, elapsed time, session count) |
| `pomoSettings` | User preferences (durations, theme, size) |
| `pomoBg` | Custom background image (compressed JPEG, max 640 px) |
| `pomoStats` | Daily study minutes (date-keyed, auto-pruned after 1 year) |
| `pomoVisible` | Whether the widget is shown or hidden |

---

## Permissions

| Permission | Reason |
|---|---|
| `storage` | Persist timer state and settings across tabs |
| `scripting` | Inject the widget into already-open tabs on install |
| `tabs` | Re-inject the widget when a new tab finishes loading |
| `http://*/*` `https://*/*` | Allow injection on all web pages |

---

## Tech

Manifest V3 · Shadow DOM · Background service worker · `chrome.storage.onChanged` for real-time cross-tab sync · No dependencies · No build step

---

## Changelog

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
