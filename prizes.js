/* ==========================================================================
   Pool de premios — compartido entre el Tragamonedas y las Cajas Sorpresa.
   Acá vive TODO lo que hace falta tocar para ajustar el sorteo: qué premios
   hay, cuánto stock queda de cada uno y qué tan seguido sale "no ganaste un
   producto, tenés un premio sorpresa".

   ---------------------------------------------------------------------
   CÓMO FUNCIONA EL SORTEO (importante para entender los números de abajo)
   ---------------------------------------------------------------------
   No es una probabilidad fija: cada producto "pesa" lo que le queda de
   stock. Un producto con 50 unidades pesa 50; si ya se entregaron 30,
   pesa 20. Cuando se agota, pesa 0 y deja de poder salir.

   El "Premio Sorpresa" (consuelo, no descuenta stock) pesa siempre
   TOTAL_STOCK_INICIAL — la suma de las 4 cantidades de acá abajo. Como esa
   suma es aprox. el total de stock inicial, el primer sorteo del evento es
   ~50% para algún producto y ~50% para el premio sorpresa. A medida que se
   reparten productos y el stock restante baja, el peso del premio sorpresa
   queda fijo mientras el de los productos baja — así el % de "premio
   sorpresa" sube solo con el correr del evento, como colchón automático
   para que el stock alcance para los dos días.

   Para cambiar ese punto de partida (no tiene que ser 50/50), ajustá
   NO_PREMIO_WEIGHT más abajo a mano.
   ---------------------------------------------------------------------
   CÓMO EDITAR EL STOCK
   ---------------------------------------------------------------------
   Cambiá los números en INITIAL_STOCK. El stock restante se guarda en
   localStorage (sobrevive a un reinicio del equipo) — así que si cambiás
   estos números DESPUÉS de haber arrancado el evento, el equipo va a
   seguir usando lo que tenía guardado. Para resetear el stock (por ejemplo
   al empezar el día 1), abrí la consola del navegador (F12) en la app y
   escribí:

     Prizes.resetStock()

   Para ver cuánto queda de cada producto sin abrir la consola del todo,
   basta con escribir:

     Prizes.getRemaining()
   ========================================================================== */
(function () {
  'use strict';

  // Cantidad de unidades disponibles de cada producto para TODO el evento
  // (los dos días juntos, repartido entre los dos juegos).
  const INITIAL_STOCK = {
    tridex: 50,   // Tridex Zero   -> Mochila
    lh3: 150,     // LH3           -> Botella
    surfadex: 150, // Surfadex Premium -> Cooler
    viodex: 300,  // Viodex        -> Lapicera / porta celu
  };

  const PRIZE_DEFS = [
    {
      id: 'tridex',
      tier: 3, // el más escaso -> el que más celebración/brillo tiene
      brand: 'Tridex Zero',
      product: 'Mochila',
      logoHTML: '<img src="LOGOS/TRIDEX.svg" alt="Tridex Zero">',
      className: 'tier-mayor',
    },
    {
      id: 'lh3',
      tier: 2,
      brand: 'LH3',
      product: 'Botella',
      logoHTML: '<img src="LOGOS/LH3.svg" alt="LH3">',
      className: 'tier-medio',
    },
    {
      id: 'surfadex',
      tier: 2,
      brand: 'Surfadex Premium',
      product: 'Cooler',
      logoHTML: '<img src="LOGOS/SURFADEX.svg" alt="Surfadex Premium">',
      className: 'tier-medio',
    },
    {
      id: 'viodex',
      tier: 1,
      brand: 'Viodex',
      product: 'Lapicera / Porta celu',
      logoHTML: '<img src="LOGOS/VIODEX.svg" alt="Viodex">',
      className: 'tier-comun',
    },
  ];

  // El "premio sorpresa" no sale de stock: es el resultado cuando no toca
  // ninguno de los 4 productos. Se entrega aparte, fuera de esta lista.
  const CONSOLATION = {
    id: 'sorpresa',
    tier: 0,
    brand: '',
    product: 'Premio Sorpresa',
    logoHTML: '🎁',
    className: 'tier-consolation',
  };

  const TOTAL_INITIAL_STOCK = Object.keys(INITIAL_STOCK).reduce((sum, id) => sum + INITIAL_STOCK[id], 0);
  const NO_PREMIO_WEIGHT = TOTAL_INITIAL_STOCK;

  const STOCK_KEY = 'covidex-premios-stock-v1';

  function loadStock() {
    try {
      const saved = JSON.parse(localStorage.getItem(STOCK_KEY));
      if (saved && typeof saved === 'object') {
        const ids = Object.keys(INITIAL_STOCK);
        const allValid = ids.every((id) => Number.isInteger(saved[id]) && saved[id] >= 0 && saved[id] <= INITIAL_STOCK[id]);
        if (allValid) return saved;
      }
    } catch (e) { /* storage deshabilitado o dato corrupto: arrancamos con stock lleno */ }
    return Object.assign({}, INITIAL_STOCK);
  }

  let stock = loadStock();

  function saveStock() {
    try { localStorage.setItem(STOCK_KEY, JSON.stringify(stock)); } catch (e) { /* sin storage el stock vive sólo en memoria */ }
  }

  function buildOutcome(def) {
    return {
      id: def.id,
      tier: def.tier,
      label: def.brand ? (def.product + ' ' + def.brand) : def.product,
      symbol: def.logoHTML,
      className: def.className,
    };
  }

  function pickPrize() {
    let totalWeight = NO_PREMIO_WEIGHT;
    PRIZE_DEFS.forEach((def) => { totalWeight += stock[def.id]; });

    let r = Math.random() * totalWeight;
    for (let i = 0; i < PRIZE_DEFS.length; i++) {
      const def = PRIZE_DEFS[i];
      if (r < stock[def.id]) {
        stock[def.id] = Math.max(0, stock[def.id] - 1);
        saveStock();
        return buildOutcome(def);
      }
      r -= stock[def.id];
    }
    return buildOutcome(CONSOLATION);
  }

  function getRemaining() {
    const out = {};
    PRIZE_DEFS.forEach((def) => { out[def.brand + ' (' + def.product + ')'] = stock[def.id] + ' / ' + INITIAL_STOCK[def.id]; });
    console.table(out);
    return Object.assign({}, stock);
  }

  function resetStock() {
    stock = Object.assign({}, INITIAL_STOCK);
    saveStock();
    console.log('Stock reseteado a los valores iniciales.');
    return Object.assign({}, stock);
  }

  // Caras posibles del rodillo mientras gira: siempre logos reales (con blur
  // de movimiento, no hace falta que se lean), nunca letras sueltas.
  const REEL_FILLERS = PRIZE_DEFS.map((def) => def.logoHTML).concat(CONSOLATION.logoHTML);

  window.Prizes = {
    pick: pickPrize,
    getRemaining,
    resetStock,
    REEL_FILLERS,
  };
})();
