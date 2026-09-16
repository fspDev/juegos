/* ==========================================================================
   Cajas Sorpresa. El premio se sortea recién en el momento en que se toca
   una caja (Prizes.pick()) — ninguna caja "tiene" un premio asignado de
   antemano, así no hay forma de detectar un patrón mirando jugar a otros.
   ========================================================================== */
(function () {
  'use strict';

  const boxes = Array.from(document.querySelectorAll('.giftbox'));
  const reveal = document.getElementById('boxes-reveal');
  const revealCard = reveal.querySelector('.prize-reveal-card');
  const revealLogo = document.getElementById('boxes-reveal-logo');
  const revealTitle = document.getElementById('boxes-reveal-title');

  let resolved = false;
  // La secuencia dura varios segundos: si alguien toca "Volver" (o salta el
  // timeout de inactividad) en el medio, hay que cancelar lo que quedó
  // pendiente, si no la caja se abre sola sobre el menú del próximo visitante.
  let pending = [];

  function later(fn, delay) {
    pending.push(setTimeout(fn, delay));
  }

  function resetBoxes() {
    pending.forEach(clearTimeout);
    pending = [];
    resolved = false;
    reveal.classList.remove('show');
    revealCard.className = 'prize-reveal-card';
    boxes.forEach((box) => {
      box.disabled = false;
      box.className = 'giftbox';
      box.querySelector('.giftbox-prize').innerHTML = '';
    });
  }

  function chooseBox(box) {
    if (resolved) return;
    resolved = true;
    boxes.forEach((b) => { b.disabled = true; });
    boxes.forEach((b) => { if (b !== box) b.classList.add('not-chosen'); });

    const prize = window.Prizes.pick();
    box.classList.add('shaking');
    // Un golpe de sonido cada tanto mientras se carga el halo, para que el
    // suspenso no quede mudo.
    [0, 500, 1000].forEach((t) => later(() => window.Games.sound.boxShake(), t));

    // Tiempos alargados a propósito: el halo circular se carga un buen rato
    // (es el momento de suspenso, con la caja temblando) y recién después
    // abre; y queda aire para disfrutar la apertura antes de tapar todo con
    // la tarjeta de premio.
    later(() => {
      box.classList.remove('shaking');
      box.classList.add('opening', prize.className);
      box.querySelector('.giftbox-prize').innerHTML = prize.symbol;
      window.Games.sound.win(prize.tier);
      if (prize.tier >= 2) window.Games.confetti(prize.tier);
    }, 1500);

    later(() => {
      revealLogo.innerHTML = prize.symbol;
      revealTitle.textContent = prize.text;
      revealCard.className = 'prize-reveal-card ' + prize.className;
      reveal.classList.add('show');
    }, 3600);
  }

  boxes.forEach((box) => {
    box.addEventListener('click', () => chooseBox(box));
  });

  document.addEventListener('gameenter', (e) => {
    if (e.detail === 'boxes') resetBoxes();
  });
  document.addEventListener('resetgames', resetBoxes);

  resetBoxes();
})();
