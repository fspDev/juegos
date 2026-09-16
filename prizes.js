/* ==========================================================================
   Pool de premios — compartido entre el Tragamonedas y las Cajas Sorpresa.
   Acá vive TODO lo que hace falta tocar para ajustar el sorteo.

   ---------------------------------------------------------------------
   CÓMO FUNCIONA EL SORTEO
   ---------------------------------------------------------------------
   Está calibrado para el evento real: 300 visitantes por día, dos días.

   1) De cada 4 personas que juegan, 3 se llevan un producto de marca y 1 se
      lleva el Premio Sorpresa. Ese 75% es fijo (PRODUCT_SHARE) y NO se
      desgasta con el correr del día: el último visitante tiene la misma
      chance que el primero.

   2) Qué producto toca, dentro de ese 75%, es proporcional a lo que queda de
      cada uno. Un producto con 150 unidades sale 3 veces más seguido que uno
      con 50. Como cada unidad en existencia tiene la misma chance, los cuatro
      productos se van gastando al mismo ritmo porcentual: ninguno se termina
      mucho antes que otro. Si igual uno se agota, deja de salir y su parte se
      reparte entre los demás — el 75% total no se mueve.

   3) EL DÍA 1 SÓLO PUEDE USAR LA MITAD DEL STOCK. La otra mitad queda
      congelada para el día 2. Si el día 1 viene mucha más gente de la
      esperada y se agota su mitad, a partir de ahí todos se llevan Premio
      Sorpresa — pero el día 2 arranca con su mitad intacta. El día 2 puede
      usar todo lo que haya quedado (su mitad + lo que sobró del día 1).

   Con 300 personas por día esto reparte unos 225 productos por día (~450 en
   total) y deja ~200 unidades de colchón.

   ---------------------------------------------------------------------
   EL CAMBIO DE DÍA ES AUTOMÁTICO
   ---------------------------------------------------------------------
   El equipo mira la fecha: cuando cambia el día del calendario pasa solo al
   día 2, sin que nadie toque nada (se chequea en cada jugada, así que sirve
   igual si el TV queda prendido toda la noche). Para forzarlo a mano, desde
   la consola del navegador (F12):

     Prizes.startDay(2)   // habilitar la mitad reservada
     Prizes.startDay(1)   // volver al día 1, sin tocar el stock

   ---------------------------------------------------------------------
   COMANDOS PARA EL STAFF (consola del navegador, F12)
   ---------------------------------------------------------------------
     Prizes.getRemaining()   // qué queda de cada producto y en qué día está
     Prizes.resetStock()     // stock lleno y vuelta al día 1 (al empezar)

   El stock se guarda en el equipo (localStorage) y sobrevive a que se
   reinicie o se cierre Chrome.

   ---------------------------------------------------------------------
   CÓMO EDITAR
   ---------------------------------------------------------------------
   - Cantidades de cada producto: INITIAL_STOCK.
   - Cuánta gente se lleva producto: PRODUCT_SHARE (0.75 = 3 de cada 4).
   - Nombre o producto de un premio: brand y product en PRIZE_DEFS.
   - Logo: logoHTML apunta a un archivo de LOGOS/.

   Ojo: si cambiás INITIAL_STOCK DESPUÉS de arrancar el evento, manda el
   stock guardado hasta que alguien corra Prizes.resetStock().
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

  // Proporción de jugadas que se lleva un producto de marca; el resto se
  // lleva el Premio Sorpresa. 0.75 = 3 de cada 4 personas.
  const PRODUCT_SHARE = 0.75;

  const PRIZE_DEFS = [
    {
      id: 'tridex',
      tier: 3, // el más escaso -> el que más celebración/brillo tiene
      brand: 'Tridex Zero',
      product: 'Mochila',
      article: 'una', // para armar "ganaste una Mochila" sin mencionar la marca
      logoHTML: '<img src="LOGOS/TRIDEX.svg" alt="Tridex Zero">',
      className: 'tier-mayor',
    },
    {
      id: 'lh3',
      tier: 2,
      brand: 'LH3',
      product: 'Botella',
      article: 'una',
      logoHTML: '<img src="LOGOS/LH3.svg" alt="LH3">',
      className: 'tier-medio',
    },
    {
      id: 'surfadex',
      tier: 2,
      brand: 'Surfadex Premium',
      product: 'Cooler',
      article: 'un',
      logoHTML: '<img src="LOGOS/SURFADEX.svg" alt="Surfadex Premium">',
      className: 'tier-medio',
    },
    {
      id: 'viodex',
      tier: 1,
      brand: 'Viodex',
      product: 'Lapicera / Porta celu',
      article: 'una',
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
    article: '',
    logoHTML: '🎁',
    className: 'tier-consolation',
  };

  const STATE_KEY = 'covidex-premios-v2';

  function todayKey() {
    const d = new Date();
    return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  }

  function freshState() {
    return { stock: Object.assign({}, INITIAL_STOCK), day: 1, date: todayKey() };
  }

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STATE_KEY));
      const ids = Object.keys(INITIAL_STOCK);
      const stockOk = saved && saved.stock && ids.every((id) =>
        Number.isInteger(saved.stock[id]) && saved.stock[id] >= 0 && saved.stock[id] <= INITIAL_STOCK[id]);
      if (stockOk && (saved.day === 1 || saved.day === 2) && typeof saved.date === 'string') return saved;
    } catch (e) { /* storage deshabilitado o dato corrupto: arrancamos de cero */ }
    return freshState();
  }

  let state = loadState();

  function saveState() {
    try { localStorage.setItem(STATE_KEY, JSON.stringify(state)); } catch (e) { /* sin storage el stock vive sólo en memoria */ }
  }

  // Si cambió la fecha del calendario, arrancó el día 2. Se chequea en cada
  // sorteo y no sólo al cargar la página, porque el TV del stand puede quedar
  // prendido toda la noche sin que nadie lo recargue.
  function syncDay() {
    const today = todayKey();
    if (state.date === today) return;
    state.date = today;
    state.day = 2;
    saveState();
  }

  // El día 1 tiene congelada la mitad de cada producto; el día 2 puede usar
  // todo lo que haya quedado.
  function availableOf(id) {
    const reserved = state.day === 1 ? Math.floor(INITIAL_STOCK[id] / 2) : 0;
    return Math.max(0, state.stock[id] - reserved);
  }

  function buildOutcome(def) {
    // "text" es lo que se lee en la tarjeta de premio: felicita por el
    // PRODUCTO, nunca menciona la marca (esa sólo se ve en el logo).
    const text = def.brand
      ? '¡Felicitaciones, ganaste ' + def.article + ' ' + def.product + '!'
      : '¡Felicitaciones, ganaste tu Premio Sorpresa!';
    return {
      id: def.id,
      tier: def.tier,
      text: text,
      symbol: def.logoHTML,
      className: def.className,
    };
  }

  function pickPrize() {
    syncDay();

    let available = 0;
    PRIZE_DEFS.forEach((def) => { available += availableOf(def.id); });
    if (available <= 0) return buildOutcome(CONSOLATION);

    // El peso del Premio Sorpresa se recalcula en cada jugada a partir de lo
    // que queda disponible, así la chance de llevarse producto queda clavada
    // en PRODUCT_SHARE de punta a punta del evento.
    const consolationWeight = available * (1 - PRODUCT_SHARE) / PRODUCT_SHARE;

    let r = Math.random() * (available + consolationWeight);
    for (let i = 0; i < PRIZE_DEFS.length; i++) {
      const def = PRIZE_DEFS[i];
      const weight = availableOf(def.id);
      if (r < weight) {
        state.stock[def.id] = Math.max(0, state.stock[def.id] - 1);
        saveState();
        return buildOutcome(def);
      }
      r -= weight;
    }
    return buildOutcome(CONSOLATION);
  }

  function getRemaining() {
    syncDay();
    const out = {};
    PRIZE_DEFS.forEach((def) => {
      out[def.brand + ' (' + def.product + ')'] = {
        'queda en total': state.stock[def.id] + ' / ' + INITIAL_STOCK[def.id],
        'se puede entregar hoy': availableOf(def.id),
      };
    });
    console.log(state.day === 1
      ? 'DÍA 1 — la mitad del stock está reservada para mañana.'
      : 'DÍA 2 — todo el stock que quedó está disponible.');
    console.table(out);
    return Object.assign({}, state.stock);
  }

  function resetStock() {
    state = freshState();
    saveState();
    console.log('Stock lleno y de vuelta en el día 1.');
    return Object.assign({}, state.stock);
  }

  function startDay(day) {
    if (day !== 1 && day !== 2) {
      console.warn('Usá Prizes.startDay(1) o Prizes.startDay(2).');
      return state.day;
    }
    state.day = day;
    state.date = todayKey();
    saveState();
    console.log('Ahora el equipo está en el día ' + day + '.');
    return day;
  }

  // Caras posibles del rodillo mientras gira: siempre logos reales (con blur
  // de movimiento, no hace falta que se lean), nunca letras sueltas.
  const REEL_FILLERS = PRIZE_DEFS.map((def) => def.logoHTML).concat(CONSOLATION.logoHTML);

  window.Prizes = {
    pick: pickPrize,
    getRemaining,
    resetStock,
    startDay,
    REEL_FILLERS,
  };
})();
