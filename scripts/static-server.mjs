import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';

const root = join(process.cwd(), 'dist');
const port = Number(process.argv[2] || process.env.PORT || 4173);

const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.json': 'application/json; charset=utf-8',
};

createServer((request, response) => {
  const url = new URL(request.url || '/', `http://${request.headers.host}`);
  const requestPath = decodeURIComponent(url.pathname);
  const safePath = normalize(requestPath).replace(/^(\.\.[/\\])+/, '');
  let filePath = join(root, safePath);

  if (!existsSync(filePath) || statSync(filePath).isDirectory()) {
    filePath = join(root, 'index.html');
  }

  response.setHeader('Content-Type', types[extname(filePath)] || 'application/octet-stream');
  createReadStream(filePath).pipe(response);
}).listen(port, '127.0.0.1', () => {
  console.log(`Static server ready at http://127.0.0.1:${port}/`);
});
