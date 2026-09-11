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

Todos los archivos son locales — no hay CDN, ni fuentes remotas, ni imágenes
externas (los íconos de premios y símbolos del tragamonedas son emoji del
propio sistema). Hay un service worker (`sw.js`) que cachea la app entera.

> **Al editar archivos:** el cambio aparece **en el segundo arranque**. Si lo
> necesitás al toque, recargá dos veces, o subí el número de `CACHE_NAME` en
> `sw.js` (`juegos-premios-v1` → `v2`).

## Cómo manejar la probabilidad de los premios

Todo está en **`prizes.js`**. Los dos juegos reparten el mismo pool de tres
premios — sólo cambia la mecánica para ganarlos.

```js
{ id: 'mayor', label: 'Premio Mayor', weight: 50,  symbol: '💎' }
{ id: 'medio', label: 'Premio Medio', weight: 250, symbol: '⭐' }
{ id: 'comun', label: 'Premio Sorpresa', weight: 700, symbol: '🎁' }
```

La chance de cada premio es su `weight` dividido la suma de todos los
`weight`. Con los valores de arriba (50 + 250 + 700 = 1000):

- Premio Mayor → 50/1000 = **5%**
- Premio Medio → 250/1000 = **25%**
- Premio Sorpresa → 700/1000 = **70%**

Para que un premio salga menos, bajale el número. Para sacarlo de circulación
sin borrarlo, poné `weight: 0`. No hace falta que sumen 100 ni 1000: podés
usar cualquier número, la función `pick()` los normaliza sola.

Para cambiar el nombre o el símbolo de un premio, editá `label` y `symbol` (el
`symbol` se usa tanto en los rodillos del tragamonedas como al abrir la caja y
en el cartel final). El campo `tier` (1, 2 o 3) controla qué tan grande es la
celebración — cantidad de confetti, color del brillo y del cartel — y no hace
falta tocarlo salvo que agregues un premio nuevo.

Los dos juegos sortean el premio en el momento de jugar (al tirar de la
palanca, o al tocar una caja), no antes: no hay forma de "ver" qué va a salir
mirando jugar a otra persona.

## Juegos

**Tragamonedas** (`slot.js`): los tres rodillos siempre terminan en el mismo
símbolo (3 en línea, siempre se gana algo) — lo que varía es qué tan seguido
cae cada símbolo, según su `weight`.

**Cajas Sorpresa** (`boxes.js`): se muestran 3 cajas, el visitante elige una,
se sortea el premio recién al tocarla y se anima la apertura.
