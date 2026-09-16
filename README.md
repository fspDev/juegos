# Juegos y Premios

Dos juegos para el stand — **Tragamonedas** y **Cajas Sorpresa** — que reparten
premios con probabilidad configurable. Corre en un **TV táctil vertical de
55"** (overlay táctil), servida desde **localhost**, **sin internet**.

Es HTML/CSS/JS plano: no hay build, no hay dependencias, no hay llamadas a red.

## Levantarla en el equipo del stand

```bash
node serve.js
```

Después abrir `http://localhost:8080` en Chrome. El puerto se puede cambiar con
la variable `PORT`.

Para que arranque sola al prender el equipo, poner ese comando en el arranque
del sistema y abrir Chrome en modo kiosco:

```bash
chrome --kiosk --disable-pinch --overscroll-history-navigation=0 http://localhost:8080
```

La app igual pide pantalla completa sola en el primer toque, así que el flag
`--kiosk` es un refuerzo, no un requisito.

## Cómo se comporta en el stand

- **Vuelve sola al menú a los 45 segundos sin que nadie toque la pantalla**,
  así el próximo visitante nunca encuentra una partida a medio jugar.
- **Pide pantalla completa** en el primer toque.
- **Mantiene la pantalla despierta** (Wake Lock).
- **Bloquea el pinch-zoom, el doble tap y el menú del long-press**.
- **Corre el lienzo unos píxeles cada 4 minutos** para no marcar el panel.

Estos parámetros están arriba de todo en `kiosk.js` (`IDLE_SECONDS`,
`SHIFT_MINUTES`).

## Resoluciones

El diseño está hecho sobre un lienzo de **1080 x 1920**, igual que el resto de
los kioscos del stand. El TV tiene que estar **rotado a vertical a nivel
sistema operativo**.

## Offline

Todos los archivos son locales — no hay CDN, ni fuentes remotas. Los 4 logos
de producto son los SVG que están en `LOGOS/` (provistos por Covidex); el
resto de los íconos son emoji del sistema. Hay un service worker (`sw.js`)
que cachea la app entera, logos incluidos.

> **Al editar archivos:** el cambio aparece **en el segundo arranque**. Si lo
> necesitás al toque, recargá dos veces, o subí el número de `CACHE_NAME` en
> `sw.js` (`juegos-premios-v2` → `v3`).

## Cómo funciona el sorteo de premios

Todo está documentado con detalle arriba de **`prizes.js`** — esto es el
resumen. Los dos juegos (Tragamonedas y Cajas Sorpresa) reparten el mismo
pool de 4 productos, con el mismo stock compartido entre ambos:

| Producto (logo)     | Premio                  | Stock total |
|----------------------|--------------------------|:-----------:|
| Tridex Zero           | Mochila                  | 50           |
| LH3                    | Botella                  | 150          |
| Surfadex Premium       | Cooler                   | 150          |
| Viodex                 | Lapicera / porta celu    | 300          |

Además existe el **Premio Sorpresa**: no es uno de los 4 productos, no
descuenta stock, y se entrega aparte (lo que el stand tenga previsto para
eso). Es el resultado cuando no tocó ninguno de los 4 productos.

### Los números del evento

500 personas esperadas en total, repartidas en 2 días (~250 por día), contra
650 unidades de stock. **Hay más premios que gente:** como cada jugada
entrega un premio como máximo, es imposible repartir las 650 unidades entre
500 personas — aun ganando el 100% de las jugadas sobrarían 150. Por eso la
única perilla real es `NO_PRIZE_RATE`: qué parte se va con producto y qué
parte con el premio sorpresa. Está en **20%**, o sea ~400 productos
entregados y ~100 premios sorpresa sobre 500 jugadas.

### Cómo se garantiza que alcance para los dos días

El stock se parte en **cupos diarios**: cada jornada puede repartir como
mucho la mitad (25 / 75 / 75 / 150). Si el día 1 viene mucha más gente de la
esperada, igual no puede comerse lo del día 2 — cuando se agota el cupo del
día, ese producto deja de salir hasta la jornada siguiente y esas jugadas
pasan a premio sorpresa. El cambio de jornada se detecta solo por fecha de
calendario.

Dentro del día cada producto pesa lo que le queda de cupo, así se reparten
proporcionalmente a su cantidad (la mochila, la más escasa, sale más
salteada) y ninguno se agota antes que los otros. Proyección para todo el
evento: ~31 mochilas, ~92 botellas, ~92 coolers, ~185 lapiceras.

**El stock se guarda en el equipo** (localStorage del navegador) y sobrevive
a que se reinicie o se cierre Chrome. Para el staff, con la consola del
navegador abierta (F12) en la app:

```js
Prizes.getRemaining()   // cupo de hoy y total entregado en el evento
Prizes.resetStock()     // reinicia todo el evento (usar antes del día 1)
Prizes.setDay(2)        // forzar jornada a mano, si las fechas no son días corridos
```

### Para ajustar los números

Todo se edita en `prizes.js`:

- **Cambiar el stock de un producto:** los números en `TOTAL_STOCK`, arriba
  del todo (el cupo diario se recalcula solo). Ojo: si el equipo ya arrancó
  el evento, el stock guardado manda sobre estos números hasta que alguien
  corra `Prizes.resetStock()`.
- **Cambiar cuánta gente se va con producto:** `NO_PRIZE_RATE`. Más bajo =
  se reparte más producto; más alto = ganar es más difícil.
- **Cambiar la cantidad de días:** `EVENT_DAYS`.
- **Cambiar nombre/producto de un premio:** `brand` y `product` en cada
  entrada de `PRIZE_DEFS`.
- **Cambiar el logo:** `logoHTML` — apunta a un archivo de `LOGOS/`. Para
  reemplazar un logo, pisá el SVG correspondiente en esa carpeta (mismo
  nombre de archivo) o cambiá la ruta acá.

Los dos juegos sortean el premio en el momento de jugar (al girar, o al tocar
una caja), no antes: no hay forma de "ver" qué va a salir mirando jugar a
otra persona.

**Importante — no hay botón de "jugar de nuevo":** después de un premio sólo
queda "Volver al inicio". Es a propósito: con stock real y finito, un solo
visitante repitiendo "jugar de nuevo" a mano podría vaciarlo. El staff
controla cuándo el próximo visitante vuelve a tocar Tragamonedas / Cajas
Sorpresa desde el menú.

## Juegos

**Tragamonedas** (`slot.js`): los tres rodillos siempre terminan en el mismo
logo (3 en línea, siempre se gana algo) — lo que varía es qué tan seguido
cae cada uno, según el stock que le quede.

**Cajas Sorpresa** (`boxes.js`): se muestran 3 cajas, el visitante elige una,
se sortea el premio recién al tocarla y se anima la apertura.
