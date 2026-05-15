# Changelog — Focus Timer

Formato: [Unreleased] acumula cambios en desarrollo. Al publicar, renómbralo con la versión y crea un nuevo [Unreleased] vacío.

---

## [Unreleased]

_Cambios desde v1.2.0 — aún no publicados_

### Added
- 2 nuevos temas: Forest (verde) y Ember (rosa→naranja), total 6 temas
- Color de acento personalizado (color picker) — sobreescribe los colores del tema
- Slider de opacidad del widget (30–100%), respeta el fade de proximidad proporcionalmente
- Toggle de bordes: sharp / rounded / pill
- Reloj en tiempo real con formato 12h / 24h / desactivado
- Toggle para mostrar/ocultar la info de sesión

### Fixed

### Changed

### Removed

---

## [1.2.0] — 2026-05-12

### Added
- Settings rediseñados con navegación por pestañas: Sesión · Aspecto · Stats · Bloqueos
- Botón de nuevo ciclo (texto, borde rectangular) debajo de los controles
- Rating prompt tras 3 sesiones completadas
- Soporte de descanso largo (15–30 min automático cada 4 sesiones)
- Bloqueo de dominios durante sesiones de trabajo
- Estadísticas de estudio: diarias, semanales y mensuales
- Alarma de sonido opcional al cambiar de sesión
- Soporte bilingüe (español / inglés) desde el propio widget
- Imagen de fondo personalizada (JPEG comprimido, máx. 640 px)

### Changed
- Todos los paneles de ajustes con altura fija y scrollbar mínimo
- El botón de engranaje se oculta mientras los ajustes están abiertos
- "Guardar" renombrado a "Volver", visible en todas las secciones
- Info de sesión movida encima del reloj
- Layout compactado y opacidad idle aumentada
- El timer se resetea al desactivar el widget o al reabrir Chrome

### Fixed
- Flash de 1 ms al abrir Chrome (widget visible antes de inicializarse)

---

## [1.1.0]

### Added
- 4 temas oscuros: Obsidian, Ocean, Sunset, Cosmic
- 3 tamaños de widget: S / M / L
- Notificaciones de escritorio al terminar cada sesión
- Timer persistente entre pestañas via `chrome.storage.onChanged`

---

## [1.0.0] — Lanzamiento inicial

- Widget flotante con Pomodoro 25/5
- Arrastrable a cualquier esquina
- Sincronización entre pestañas
- Manifest V3 · Shadow DOM · Sin dependencias

---
