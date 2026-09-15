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

**El sorteo no usa un % fijo, usa el stock que va quedando.** Cada producto
"pesa" lo que le queda: si a Tridex Zero le quedan 30 mochilas, pesa 30. El
Premio Sorpresa pesa siempre 650 (la suma del stock inicial de los 4
productos), fijo. Como al principio el stock restante total también suma
650, el primer sorteo del evento es ~50% algún producto / ~50% premio
sorpresa — y a medida que se entregan productos y el stock baja, el % de
premio sorpresa sube solo (el peso de los productos baja, el del premio
sorpresa no se mueve). Es un colchón automático para que el stock alcance
para los dos días sin que nadie tenga que estar reajustando números a mano.

Cuando un producto llega a 0 stock, deja de poder salir — ni en el
tragamonedas ni en las cajas.

**El stock se guarda en el equipo** (localStorage del navegador) y sobrevive
a que se reinicie o se cierre Chrome. Para el staff, con la consola del
navegador abierta (F12) en la app:

```js
Prizes.getRemaining()   // cuánto queda de cada producto
Prizes.resetStock()     // vuelve todo a 50 / 150 / 150 / 300 (usar al empezar el día 1)
```

### Para ajustar los números

Todo se edita en `prizes.js`:

- **Cambiar el stock de un producto:** los números en `INITIAL_STOCK`, arriba
  del todo. Ojo: si el equipo ya arrancó el evento, el stock guardado manda
  sobre estos números hasta que alguien corra `Prizes.resetStock()`.
- **Cambiar el punto de partida del % de premio sorpresa** (no tiene que ser
  50/50): ajustá `NO_PREMIO_WEIGHT`.
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
