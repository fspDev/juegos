/* ==========================================================================
   Tragamonedas. Los tres rodillos siempre terminan en el mismo símbolo (3 en
   línea): el premio se sortea ANTES de girar con Prizes.pick(), y ese premio
   define en qué símbolo tienen que frenar los tres rodillos. La rareza no se
   nota en si gana o pierde (siempre gana algo), sino en qué tan seguido cae
   cada símbolo — eso lo controla el "weight" de prizes.js.

   Cada rodillo no es una tira que se desplaza: es más liviano y más robusto
   en un TV de stand ir cambiando el símbolo de un solo casillero a toda
   velocidad (con blur) y frenarlo de a poco, como una ruleta que decelera.
   ========================================================================== */
(function () {
  'use strict';

  const FILLER_SYMBOLS = ['🍒', '🍋', '🔔', '🍇', '7️⃣', '🍀', '🍉'];

  const reels = [0, 1, 2].map((i) => {
    const el = document.getElementById('reel-' + i);
    return { el, symbolEl: el.querySelector('.reel-symbol') };
  });

  const spinBtn = document.getElementById('slot-spin-btn');
  const reveal = document.getElementById('slot-reveal');
  const revealCard = reveal.querySelector('.prize-reveal-card');
  const revealSymbol = document.getElementById('slot-reveal-symbol');
  const revealTitle = document.getElementById('slot-reveal-title');
  const againBtn = document.getElementById('slot-again-btn');

  let spinning = false;

  function randomFiller() {
    return FILLER_SYMBOLS[Math.floor(Math.random() * FILLER_SYMBOLS.length)];
  }

  function resetReels() {
    spinning = false;
    reveal.classList.remove('show');
    revealCard.className = 'prize-reveal-card';
    reels.forEach((r) => {
      r.el.classList.remove('spinning', 'landed');
      r.symbolEl.textContent = randomFiller();
    });
    spinBtn.disabled = false;
  }

  function spinReel(reel, duration, finalSymbol, onDone) {
    const start = performance.now();
    reel.el.classList.add('spinning');

    function step() {
      const elapsed = performance.now() - start;
      const remaining = duration - elapsed;
      if (remaining <= 0) {
        reel.symbolEl.textContent = finalSymbol;
        reel.el.classList.remove('spinning');
        reel.el.classList.add('landed');
        window.Games.sound.reelStop(reels.indexOf(reel));
        setTimeout(() => reel.el.classList.remove('landed'), 480);
        onDone();
        return;
      }
      reel.symbolEl.textContent = randomFiller();
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
        if (done === reels.length) revealPrize(prize);
      });
    });
  }

  function revealPrize(prize) {
    window.Games.sound.win(prize.tier);
    revealSymbol.textContent = prize.symbol;
    revealTitle.textContent = prize.label;
    revealCard.className = 'prize-reveal-card ' + prize.className;
    reveal.classList.add('show');
    if (prize.tier >= 2) window.Games.confetti(prize.tier);
    spinning = false;
    spinBtn.disabled = false;
  }

  spinBtn.addEventListener('click', spin);
  againBtn.addEventListener('click', resetReels);

  document.addEventListener('gameenter', (e) => {
    if (e.detail === 'slot') resetReels();
  });
  document.addEventListener('resetgames', resetReels);

  resetReels();
})();
