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
  const revealTitle = document.getElementById('boxes-reveal-title');

  let resolved = false;

  function resetBoxes() {
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
    window.Games.sound.boxShake();
    box.classList.add('shaking');

    setTimeout(() => {
      box.classList.remove('shaking');
      box.classList.add('opening', prize.className);
      box.querySelector('.giftbox-prize').innerHTML = prize.symbol;
      window.Games.sound.win(prize.tier);
      if (prize.tier >= 2) window.Games.confetti(prize.tier);
    }, 650);

    setTimeout(() => {
      revealTitle.textContent = prize.label;
      revealCard.className = 'prize-reveal-card ' + prize.className;
      reveal.classList.add('show');
    }, 1600);
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
