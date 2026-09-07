import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = '0.0.0.0';
const ROOT = resolve(process.cwd());

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf'
};

const server = createServer(async (req, res) => {
  let urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
  if (urlPath === '/' || urlPath === '') urlPath = '/index.html';

  // Eliminar barras iniciales y evitar path traversal
  const cleanPath = urlPath.replace(/^[/\\]+/, '');
  let filePath = resolve(ROOT, cleanPath);

  // Asegurar que la ruta resuelta esté dentro de ROOT
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('403 Prohibido');
    return;
  }

  try {
    const s = await stat(filePath);
    if (s.isDirectory()) {
      filePath = join(filePath, 'index.html');
    }
    const data = await readFile(filePath);
    const ext = extname(filePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': TYPES[ext] || 'application/octet-stream',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache'
    });
    res.end(data);
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.error(`Error sirviendo ${req.url}:`, err.message);
    }
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('404 Not Found');
  }
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n[ERROR] El puerto ${PORT} ya está siendo utilizado por otro proceso.`);
    console.error(`Cierra la aplicación que usa el puerto ${PORT} o define otra variable de entorno: PORT=3001 npm run dev\n`);
  } else {
    console.error('\n[ERROR del servidor]:', err.message);
  }
  process.exit(1);
});

server.listen(PORT, HOST, () => {
  console.log('\n==================================================');
  console.log('  JOKER WASH & PLAY 3D — Servidor Local Iniciado');
  console.log('==================================================');
  console.log(`  > Acceso local:   http://localhost:${PORT}`);
  console.log(`  > IP loopback:    http://127.0.0.1:${PORT}`);
  console.log('  Nota: No ingreses "0.0.0.0" en tu navegador,');
  console.log(`  usa http://localhost:${PORT}`);
  console.log('==================================================\n');
});

