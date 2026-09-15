/* ==========================================================================
   Tragamonedas. Los tres rodillos siempre terminan en el mismo logo (3 en
   línea): el premio se sortea ANTES de girar con Prizes.pick(), y ese premio
   define en qué logo tienen que frenar los tres rodillos. El stock y la
   rareza de cada producto se manejan en prizes.js, no acá.

   Cada rodillo no es una tira que se desplaza: es más liviano y más robusto
   en un TV de stand ir cambiando el símbolo de un solo casillero a toda
   velocidad (con blur) y frenarlo de a poco, como una ruleta que decelera.
   Mientras gira se ven letras sueltas (parpadeo, no hace falta que se lean);
   recién al frenar aparece el logo real, ya legible.
   ========================================================================== */
(function () {
  'use strict';

  const reels = [0, 1, 2].map((i) => {
    const el = document.getElementById('reel-' + i);
    return { el, symbolEl: el.querySelector('.reel-symbol') };
  });

  const spinBtn = document.getElementById('slot-spin-btn');
  const reveal = document.getElementById('slot-reveal');
  const revealCard = reveal.querySelector('.prize-reveal-card');
  const revealTitle = document.getElementById('slot-reveal-title');

  let spinning = false;

  function randomFiller() {
    const fillers = window.Prizes.REEL_FILLERS;
    return fillers[Math.floor(Math.random() * fillers.length)];
  }

  const slotWindow = document.querySelector('.slot-window');

  function resetReels() {
    spinning = false;
    reveal.classList.remove('show');
    revealCard.className = 'prize-reveal-card';
    slotWindow.classList.remove('win');
    reels.forEach((r) => {
      r.el.classList.remove('spinning', 'landed');
      r.symbolEl.innerHTML = randomFiller();
    });
    spinBtn.disabled = false;
  }

  function spinReel(reel, duration, finalSymbolHTML, onDone) {
    const start = performance.now();
    reel.el.classList.add('spinning');

    function step() {
      const elapsed = performance.now() - start;
      const remaining = duration - elapsed;
      if (remaining <= 0) {
        reel.symbolEl.innerHTML = finalSymbolHTML;
        reel.el.classList.remove('spinning');
        reel.el.classList.add('landed');
        window.Games.sound.reelStop(reels.indexOf(reel));
        setTimeout(() => reel.el.classList.remove('landed'), 480);
        onDone();
        return;
      }
      reel.symbolEl.innerHTML = randomFiller();
      const wait = remaining < 350 ? 130 : remaining < 750 ? 85 : 55;
      setTimeout(step, wait);
    }
    step();
  }

  function spin() {
    if (spinning) return;
    spinning = true;
    spinBtn.disabled = true;
    reveal.classList.remove('show');

    const prize = window.Prizes.pick();
    let done = 0;
    const durations = [900, 1350, 1850];

    reels.forEach((reel, i) => {
      spinReel(reel, durations[i], prize.symbol, () => {
        done++;
        if (done === reels.length) onReelsLanded(prize);
      });
    });
  }

  function onReelsLanded(prize) {
    // Los 3 rodillos ya muestran el logo ganador alineados: dejamos que se
    // vea un momento (con la línea de pago brillando) antes de tapar todo
    // con la tarjeta de premio.
    window.Games.sound.win(prize.tier);
    slotWindow.classList.add('win');
    setTimeout(() => revealPrize(prize), 1300);
  }

  function revealPrize(prize) {
    revealTitle.textContent = prize.label;
    revealCard.className = 'prize-reveal-card ' + prize.className;
    reveal.classList.add('show');
    if (prize.tier >= 2) window.Games.confetti(prize.tier);
    slotWindow.classList.remove('win');
    spinning = false;
    spinBtn.disabled = false;
  }

  spinBtn.addEventListener('click', spin);

  document.addEventListener('gameenter', (e) => {
    if (e.detail === 'slot') resetReels();
  });
  document.addEventListener('resetgames', resetReels);

  resetReels();
})();
