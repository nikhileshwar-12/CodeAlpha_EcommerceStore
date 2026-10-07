#!/usr/bin/env node
/* ==========================================================================
   Zero-dependency static file server.
   --------------------------------------------------------------------------
   Usage:
     node tools/serve.js            # http://localhost:8080
     node tools/serve.js 3000       # custom port
     PORT=3000 npm start

   Kept deliberately tiny: the project has no build step, so this is all it
   takes to run the store locally. It is also imported by the test suite.
   ========================================================================== */

const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8'
};

function createServer(root = ROOT) {
  return http.createServer((req, res) => {
    let pathname;
    try {
      pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    } catch (err) {
      res.writeHead(400).end('Bad request');
      return;
    }

    if (pathname.endsWith('/')) pathname += 'index.html';

    // Resolve inside the project root only — blocks path traversal.
    const filePath = path.join(root, pathname);
    if (!filePath.startsWith(root)) {
      res.writeHead(403).end('Forbidden');
      return;
    }

    fs.stat(filePath, (err, stat) => {
      if (err || !stat.isFile()) {
        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' })
          .end('<h1>404</h1><p>Not found: ' + pathname + '</p>');
        return;
      }
      res.writeHead(200, {
        'Content-Type': MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
        'Content-Length': stat.size,
        'Cache-Control': 'no-cache'
      });
      fs.createReadStream(filePath).pipe(res);
    });
  });
}

function start(port = Number(process.env.PORT) || 8080, host = process.env.HOST || '0.0.0.0') {
  const server = createServer();
  server.listen(port, host, () => {
    const shown = host === '0.0.0.0' ? 'localhost' : host;
    console.log(`\n  NovaCart is running →  http://${shown}:${port}\n  Press Ctrl+C to stop.\n`);
  });
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\n  Port ${port} is already in use. Try: node tools/serve.js ${port + 1}\n`);
    } else {
      console.error(err);
    }
    process.exit(1);
  });
  return server;
}

if (require.main === module) {
  start(Number(process.argv[2]) || undefined);
}

module.exports = { createServer, start, ROOT };
