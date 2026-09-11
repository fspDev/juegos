/* ==========================================================================
   Pool de premios — compartido entre el Tragamonedas y las Cajas Sorpresa.
   Los dos juegos reparten los MISMOS tres premios, sólo cambia la forma de
   jugar. Así la probabilidad se configura en un solo lugar.

   Cómo cambiar la probabilidad de cada premio:
   Se juega con "weight" (peso). La chance de un premio es
   su weight dividido la suma de todos los weight.

   Con los valores de acá abajo la suma es 50 + 250 + 700 = 1000:
     Premio Mayor     -> 50/1000  =  5%
     Premio Medio     -> 250/1000 = 25%
     Premio Sorpresa  -> 700/1000 = 70%

   No hace falta que sumen 100 ni 1000: podés usar los números que quieras,
   la función pick() los normaliza sola. Para sacar un premio de circulación
   sin borrarlo, poné su weight en 0.
   ========================================================================== */
(function () {
  'use strict';

  const PRIZE_POOL = [
    {
      id: 'mayor',
      tier: 3, // 3 = el más codiciado. Se usa para escalar la fiesta (confetti, brillo, sonido).
      label: 'Premio Mayor',
      weight: 50,
      symbol: '💎',
      className: 'tier-mayor',
    },
    {
      id: 'medio',
      tier: 2,
      label: 'Premio Medio',
      weight: 250,
      symbol: '⭐',
      className: 'tier-medio',
    },
    {
      id: 'comun',
      tier: 1,
      label: 'Premio Sorpresa',
      weight: 700,
      symbol: '🎁',
      className: 'tier-comun',
    },
  ];

  function pickPrize() {
    const total = PRIZE_POOL.reduce((sum, p) => sum + p.weight, 0);
    let r = Math.random() * total;
    for (let i = 0; i < PRIZE_POOL.length; i++) {
      const p = PRIZE_POOL[i];
      if (r < p.weight) return p;
      r -= p.weight;
    }
    return PRIZE_POOL[PRIZE_POOL.length - 1];
  }

  window.Prizes = { POOL: PRIZE_POOL, pick: pickPrize };
})();
