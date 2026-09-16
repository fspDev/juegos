/* ==========================================================================
   Shell de la app: menú, ruteo de pantallas y utilidades compartidas por los
   dos juegos (confetti y sonido). La lógica de cada juego vive en slot.js y
   boxes.js; se comunican con este archivo por eventos de DOM, no por llamadas
   directas, así cada juego se puede leer y tocar por separado.
   ========================================================================== */
(function () {
  'use strict';

  const screens = {
    menu: document.getElementById('menu-screen'),
    slot: document.getElementById('slot-screen'),
    boxes: document.getElementById('boxes-screen'),
  };

  let currentScreen = 'menu';

  function showScreen(name) {
    Object.values(screens).forEach((s) => s.classList.remove('active'));
    screens[name].classList.add('active');
    currentScreen = name;
  }

  /* ---------- Posición del logo --------------------------------------------
     En el menú el logo, el título y las tarjetas se leen como un solo bloque y
     tienen que quedar centrados en la pantalla completa. El título y las
     tarjetas ya caen solos en su lugar (el padding-top del menú reserva la
     franja del logo); lo único que hay que calcular es cuánto baja el logo,
     que es el espacio libre que el centrado dejó por encima del contenido.
     Se mide en vez de hardcodearse: si mañana se agrega una tercera tarjeta,
     el bloque se recentra solo.
     Ese mismo valor queda publicado en :root y lo usan las pantallas de juego
     para arrancar su contenido más abajo, así el logo NO se mueve al entrar a
     un juego: está en el mismo lugar en las tres pantallas. */
  const menuContent = document.querySelector('.menu-content');

  function layoutHeader() {
    const padTop = parseFloat(getComputedStyle(screens.menu).paddingTop) || 0;
    const shift = Math.max(0, menuContent.offsetTop - padTop);
    document.documentElement.style.setProperty('--header-shift', shift + 'px');
  }

  window.addEventListener('resize', layoutHeader);
  window.addEventListener('orientationchange', layoutHeader);
  window.addEventListener('load', layoutHeader);
  layoutHeader();

  document.querySelectorAll('.game-card').forEach((btn) => {
    btn.addEventListener('click', () => {
      const game = btn.dataset.game;
      showScreen(game);
      document.dispatchEvent(new CustomEvent('gameenter', { detail: game }));
    });
  });

  document.querySelectorAll('[data-back]').forEach((btn) => {
    btn.addEventListener('click', resetToMenu);
  });

  function resetToMenu() {
    showScreen('menu');
    document.dispatchEvent(new Event('resetgames'));
  }

  /* ---------- Confetti -----------------------------------------------------
     La cantidad y el brillo escalan con el "tier" del premio: la Mochila
     Tridex Zero (más escasa) tiene que sentirse más importante que el resto. */
  const TIER_CONFETTI = { 1: 30, 2: 55, 3: 90 };
  const CONFETTI_COLORS = ['#FFD54A', '#FFFFFF', '#FF8A5C', '#1B3568', '#FFB03B'];

  function launchConfetti(tier) {
    const container = document.getElementById('app');
    const count = TIER_CONFETTI[tier] || 40;
    for (let i = 0; i < count; i++) {
      const piece = document.createElement('div');
      piece.className = 'confetti';
      piece.style.left = Math.random() * 100 + 'vw';
      piece.style.background = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
      piece.style.animationDuration = 2000 + Math.random() * 1800 + 'ms';
      piece.style.animationDelay = Math.random() * 350 + 'ms';
      container.appendChild(piece);
      piece.addEventListener('animationend', () => piece.remove());
    }
  }

  /* ---------- Sonido --------------------------------------------------------
     Todo sintetizado con Web Audio: cero archivos de audio, cero red. El
     AudioContext se crea recién al primer sonido (requiere un gesto del
     usuario, que ya tenemos porque todo arranca con un toque). */
  let ctx = null;
  function getCtx() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  }

  function tone(freq, start, duration, type, gain) {
    const c = getCtx();
    if (!c) return;
    const osc = c.createOscillator();
    const amp = c.createGain();
    osc.type = type || 'sine';
    osc.frequency.value = freq;
    amp.gain.setValueAtTime(0, c.currentTime + start);
    amp.gain.linearRampToValueAtTime(gain || 0.18, c.currentTime + start + 0.015);
    amp.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + start + duration);
    osc.connect(amp).connect(c.destination);
    osc.start(c.currentTime + start);
    osc.stop(c.currentTime + start + duration + 0.05);
  }

  const SoundFX = {
    tick() { tone(520, 0, 0.06, 'square', 0.08); },
    reelStop(index) { tone(300 + index * 60, 0, 0.12, 'triangle', 0.15); },
    boxShake() { tone(180, 0, 0.18, 'sawtooth', 0.05); },
    win(tier) {
      const notes = tier === 3 ? [523, 659, 784, 1047] : tier === 2 ? [523, 659, 784] : [523, 659];
      notes.forEach((f, i) => tone(f, i * 0.09, 0.28, 'triangle', 0.16));
    },
  };

  window.Games = {
    showScreen,
    resetToMenu,
    isIdle: () => currentScreen !== 'menu',
    confetti: launchConfetti,
    sound: SoundFX,
  };

  showScreen('menu');
})();
