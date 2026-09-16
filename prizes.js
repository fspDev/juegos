/* ==========================================================================
   Pool de premios — compartido entre el Tragamonedas y las Cajas Sorpresa.
   Acá vive TODO lo que hay que tocar para ajustar el sorteo.

   ---------------------------------------------------------------------
   LOS NÚMEROS DEL EVENTO
   ---------------------------------------------------------------------
   - 500 personas esperadas en total, repartidas en 2 días (~250 por día).
   - Stock total: 50 + 150 + 150 + 300 = 650 unidades.

   Ojo con esto: hay MÁS premios que gente. Como cada jugada entrega un
   premio como máximo, es imposible repartir las 650 unidades entre 500
   personas — aun ganando el 100% de las jugadas sobrarían 150. Por eso la
   única perilla real es NO_PRIZE_RATE: cuánta gente se va con producto y
   cuánta con el premio sorpresa.

   ---------------------------------------------------------------------
   CÓMO SE GARANTIZA QUE ALCANCE PARA LOS DOS DÍAS
   ---------------------------------------------------------------------
   El stock se parte en CUPOS DIARIOS: cada jornada puede repartir como
   mucho la mitad del stock (25 / 75 / 75 / 150). Si el día 1 viene mucho
   más gente de la esperada, igual no puede comerse lo del día 2: cuando
   se agota el cupo del día, ese producto deja de salir hasta la jornada
   siguiente. El cambio de jornada se detecta solo por fecha de calendario.

   Dentro de cada día, cada producto pesa lo que le queda de cupo, así se
   reparten proporcionalmente a su cantidad (la mochila, que es la más
   escasa, sale más salteada) y ninguno se agota antes que los otros.

   ---------------------------------------------------------------------
   PROYECCIÓN CON LOS VALORES DE ABAJO (NO_PRIZE_RATE = 0.20)
   ---------------------------------------------------------------------
   Sobre 500 jugadas: ~400 se llevan producto y ~100 premio sorpresa.
     Mochila (Tridex Zero)        ~31 de 50
     Botella (LH3)                ~92 de 150
     Cooler (Surfadex Premium)    ~92 de 150
     Lapicera/porta celu (Viodex) ~185 de 300
   Es decir ~15 / ~46 / ~46 / ~92 por día. Para repartir más producto,
   bajá NO_PRIZE_RATE; para que sea más difícil ganar, subilo.

   ---------------------------------------------------------------------
   COMANDOS PARA EL STAFF (consola del navegador, F12)
   ---------------------------------------------------------------------
     Prizes.getRemaining()   ver cupo de hoy y total del evento
     Prizes.resetStock()     reiniciar todo el evento (usar antes del día 1)
     Prizes.setDay(2)        forzar jornada a mano (si las fechas no son
                             días de calendario consecutivos)
   ========================================================================== */
(function () {
  'use strict';

  // ---- Perillas del evento -------------------------------------------------

  const EVENT_DAYS = 2;
  const EXPECTED_PLAYERS = 500; // total, los dos días juntos

  // Porción de jugadas que NO se lleva uno de los 4 productos (se lleva el
  // premio sorpresa, que se entrega aparte y no descuenta stock).
  const NO_PRIZE_RATE = 0.20;

  // Unidades disponibles de cada producto para TODO el evento.
  const TOTAL_STOCK = {
    tridex: 50,    // Tridex Zero      -> Mochila
    lh3: 150,      // LH3              -> Botella
    surfadex: 150, // Surfadex Premium -> Cooler
    viodex: 300,   // Viodex           -> Lapicera / porta celu
  };

  // ---- Catálogo ------------------------------------------------------------

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

  const CONSOLATION = {
    id: 'sorpresa',
    tier: 0,
    brand: '',
    product: 'Premio Sorpresa',
    logoHTML: '🎁',
    className: 'tier-consolation',
  };

  const IDS = PRIZE_DEFS.map((def) => def.id);

  // Cupo de cada producto por jornada.
  const DAILY_STOCK = {};
  IDS.forEach((id) => { DAILY_STOCK[id] = Math.floor(TOTAL_STOCK[id] / EVENT_DAYS); });

  // ---- Estado persistido ---------------------------------------------------

  const STOCK_KEY = 'covidex-premios-stock-v2';

  function today() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function freshState(day) {
    return {
      date: today(),
      day: day || 1,
      daily: Object.assign({}, DAILY_STOCK),
      given: IDS.reduce((acc, id) => { acc[id] = 0; return acc; }, {}),
    };
  }

  function isValid(s) {
    if (!s || typeof s !== 'object' || typeof s.date !== 'string' || !Number.isInteger(s.day)) return false;
    if (!s.daily || !s.given) return false;
    return IDS.every((id) =>
      Number.isInteger(s.daily[id]) && s.daily[id] >= 0 && s.daily[id] <= DAILY_STOCK[id] &&
      Number.isInteger(s.given[id]) && s.given[id] >= 0 && s.given[id] <= TOTAL_STOCK[id]);
  }

  function loadState() {
    let saved = null;
    try {
      saved = JSON.parse(localStorage.getItem(STOCK_KEY));
    } catch (e) { /* storage deshabilitado o dato corrupto */ }

    if (!isValid(saved)) return freshState(1);

    // Cambió el día de calendario -> nueva jornada con el cupo renovado,
    // pero arrastrando lo ya entregado en todo el evento.
    if (saved.date !== today()) {
      const next = freshState(saved.day + 1);
      next.given = saved.given;
      return next;
    }
    return saved;
  }

  let state = loadState();

  function saveState() {
    try { localStorage.setItem(STOCK_KEY, JSON.stringify(state)); } catch (e) { /* sin storage vive en memoria */ }
  }

  // Lo que realmente se puede entregar de un producto ahora mismo: lo que
  // queda del cupo de hoy, y nunca más que el stock físico del evento.
  function availableOf(id) {
    return Math.max(0, Math.min(state.daily[id], TOTAL_STOCK[id] - state.given[id]));
  }

  // ---- Sorteo --------------------------------------------------------------

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
    const weights = PRIZE_DEFS.map((def) => availableOf(def.id));
    const productWeight = weights.reduce((a, b) => a + b, 0);

    // Sin stock disponible hoy, todo el mundo se lleva el premio sorpresa.
    if (productWeight <= 0) return buildOutcome(CONSOLATION);

    // Peso del "sin producto" calculado para que su probabilidad sea
    // exactamente NO_PRIZE_RATE mientras quede stock.
    const noPrizeWeight = productWeight * NO_PRIZE_RATE / (1 - NO_PRIZE_RATE);

    let r = Math.random() * (productWeight + noPrizeWeight);
    for (let i = 0; i < PRIZE_DEFS.length; i++) {
      if (r < weights[i]) {
        const def = PRIZE_DEFS[i];
        state.daily[def.id] -= 1;
        state.given[def.id] += 1;
        saveState();
        return buildOutcome(def);
      }
      r -= weights[i];
    }
    return buildOutcome(CONSOLATION);
  }

  // ---- Herramientas para el staff -----------------------------------------

  function getRemaining() {
    const table = {};
    PRIZE_DEFS.forEach((def) => {
      table[def.product + ' (' + def.brand + ')'] = {
        'cupo de hoy': availableOf(def.id) + ' / ' + DAILY_STOCK[def.id],
        'entregado en el evento': state.given[def.id] + ' / ' + TOTAL_STOCK[def.id],
      };
    });
    console.log('Jornada ' + state.day + ' de ' + EVENT_DAYS + '  (' + state.date + ')');
    console.table(table);
    return { day: state.day, date: state.date, daily: Object.assign({}, state.daily), given: Object.assign({}, state.given) };
  }

  function resetStock() {
    state = freshState(1);
    saveState();
    console.log('Evento reiniciado: jornada 1, cupos completos.');
    return getRemaining();
  }

  function setDay(day) {
    if (!Number.isInteger(day) || day < 1) {
      console.warn('Usá un número de jornada entero, por ejemplo: Prizes.setDay(2)');
      return null;
    }
    const given = state.given;
    state = freshState(day);
    state.given = given;
    saveState();
    console.log('Jornada forzada a ' + day + ', cupo diario renovado.');
    return getRemaining();
  }

  // Caras posibles del rodillo mientras gira: siempre logos reales (con blur
  // de movimiento, no hace falta que se lean), nunca letras sueltas.
  const REEL_FILLERS = PRIZE_DEFS.map((def) => def.logoHTML).concat(CONSOLATION.logoHTML);

  window.Prizes = {
    pick: pickPrize,
    getRemaining,
    resetStock,
    setDay,
    REEL_FILLERS,
    EXPECTED_PLAYERS,
  };
})();
