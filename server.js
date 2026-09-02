import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
const PORT = 5173, ROOT = process.cwd();
const TYPES = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.json':'application/json' };
createServer(async (req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const file = join(ROOT, normalize(p).split('..').join(''));
  try {
    const data = await readFile(file);
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream' });
    res.end(data);
  } catch { res.writeHead(404); res.end('404'); }
}).listen(PORT, () => console.log('http://localhost:' + PORT));
