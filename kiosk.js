/* ==========================================================================
   Modo kiosco — mismo esquema que el resto de los stands: cada bloque es
   independiente, si el equipo no soporta alguna API simplemente se ignora.
   ========================================================================== */
(function () {
  'use strict';

  // Segundos sin tocar la pantalla antes de volver solo al menú.
  const IDLE_SECONDS = 45;
  // Cada cuánto se corre el lienzo unos píxeles para no quemar el panel.
  const SHIFT_MINUTES = 4;

  /* ---------- 1. Volver al menú por inactividad ---------------------------
     Si alguien se va a mitad de una partida, el próximo visitante tiene que
     encontrar el menú, no la partida ajena a medio jugar. */
  let idleTimer = null;

  function armIdleTimer() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      if (window.Games && window.Games.isIdle()) {
        window.Games.resetToMenu();
      }
    }, IDLE_SECONDS * 1000);
  }

  ['pointerdown', 'touchstart', 'click'].forEach((evt) => {
    window.addEventListener(evt, armIdleTimer, { passive: true, capture: true });
  });
  armIdleTimer();

  /* ---------- 2. Pantalla completa ----------------------------------------
     requestFullscreen sólo funciona dentro de un gesto del usuario, así que
     lo pedimos en el primer toque y no insistimos más. */
  let fullscreenTried = false;

  function goFullscreen() {
    if (fullscreenTried) return;
    fullscreenTried = true;
    const el = document.documentElement;
    const req = el.requestFullscreen || el.webkitRequestFullscreen;
    if (req) {
      try {
        const p = req.call(el, { navigationUI: 'hide' });
        if (p && p.catch) p.catch(() => {});
      } catch (e) { /* el navegador no lo permite: seguimos igual */ }
    }
  }

  window.addEventListener('pointerdown', goFullscreen, { once: true });

  /* ---------- 3. Mantener la pantalla despierta ---------------------------- */
  let wakeLock = null;

  async function requestWakeLock() {
    if (!('wakeLock' in navigator)) return;
    try {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => { wakeLock = null; });
    } catch (e) { /* batería baja o permiso denegado */ }
  }

  requestWakeLock();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && wakeLock === null) requestWakeLock();
  });

  /* ---------- 4. Bloquear gestos que rompen el kiosco ---------------------
     Chrome ignora user-scalable=no desde la v48, así que el pinch-zoom hay
     que frenarlo a mano. */
  document.addEventListener('touchstart', (e) => {
    if (e.touches.length > 1) e.preventDefault();
  }, { passive: false });

  ['gesturestart', 'gesturechange', 'gestureend'].forEach((evt) => {
    document.addEventListener(evt, (e) => e.preventDefault());
  });

  document.addEventListener('wheel', (e) => {
    if (e.ctrlKey) e.preventDefault();
  }, { passive: false });

  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && ['+', '-', '=', '0'].indexOf(e.key) !== -1) e.preventDefault();
  });

  document.addEventListener('contextmenu', (e) => e.preventDefault());
  document.addEventListener('dragstart', (e) => e.preventDefault());

  /* ---------- 5. Anti burn-in ----------------------------------------------
     El menú es la pantalla que más horas por día queda quieta en el mismo
     lugar: es la que más necesita este desplazamiento. */
  const OFFSETS = [[0, 0], [3, 2], [0, 4], [-3, 2], [-2, -3], [2, -2]];
  let shiftIndex = 0;

  setInterval(() => {
    shiftIndex = (shiftIndex + 1) % OFFSETS.length;
    const [x, y] = OFFSETS[shiftIndex];
    const root = document.getElementById('app');
    root.style.setProperty('--shift-x', x + 'px');
    root.style.setProperty('--shift-y', y + 'px');
  }, SHIFT_MINUTES * 60 * 1000);

  /* ---------- 6. Service worker --------------------------------------------
     Con el SW registrado la app arranca aunque el servidor local no haya
     levantado todavía (o se haya caído). */
  if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    });
  }
})();
