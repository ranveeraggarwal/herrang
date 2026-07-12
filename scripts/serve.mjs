// Tiny static server for local development: `npm run build && npm run serve`.
// No dependencies; serves dist/ on http://localhost:4173.

import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const PORT = Number(process.env.PORT || 4173);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
};

http
  .createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    let file = path.join(DIST, path.normalize(url.pathname));
    if (!file.startsWith(DIST)) file = path.join(DIST, 'index.html');
    if (url.pathname === '/' || !fs.existsSync(file)) file = path.join(DIST, 'index.html');
    res.setHeader('Content-Type', TYPES[path.extname(file)] ?? 'application/octet-stream');
    res.end(fs.readFileSync(file));
  })
  .listen(PORT, () => console.log(`Serving dist/ on http://localhost:${PORT}`));
