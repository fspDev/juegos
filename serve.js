/* ==========================================================================
   Servidor local para el stand.  node serve.js  ->  http://localhost:8080
   No necesita internet ni dependencias: sólo Node instalado en el equipo.
   ========================================================================== */

const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PORT = process.env.PORT || 8080;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
};

http.createServer((req, res) => {
  let rel = decodeURIComponent(req.url.split('?')[0]);
  if (rel === '/') rel = '/index.html';

  const file = path.join(ROOT, path.normalize(rel));
  if (!file.startsWith(ROOT)) {
    res.writeHead(403).end('403');
    return;
  }

  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('No encontrado');
      return;
    }
    const ext = path.extname(file).toLowerCase();
    // Nada de caché HTTP: servimos desde el mismo equipo, así que no ahorra
    // nada y sí genera el clásico "actualicé los archivos y sigue mostrando lo
    // viejo". La capa offline la da el service worker, no este caché.
    res.writeHead(200, {
      'Content-Type': TYPES[ext] || 'application/octet-stream',
      'Cache-Control': 'no-store',
    }).end(data);
  });
}).listen(PORT, '127.0.0.1', () => {
  console.log(`Juegos y Premios en http://localhost:${PORT}`);
});
