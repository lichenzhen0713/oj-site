'use strict';
/**
 * LCZOJ 官网本地预览 / 静态托管（零依赖）。
 *
 *   node site/serve.js            # http://127.0.0.1:8088
 *   $env:PORT=9000; node site/serve.js
 *
 * 只读取 site/ 目录，不碰 OJ 主服务的 public/ 与 data/。
 */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = __dirname;
const PORT = Number(process.env.PORT || 8088);
const HOST = process.env.HOST || '127.0.0.1';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8'
};

function send(res, status, body, type) {
  res.writeHead(status, {
    'Content-Type': type || 'text/plain; charset=utf-8',
    'Cache-Control': 'no-cache'
  });
  res.end(body);
}

const server = http.createServer((req, res) => {
  let pathname;
  try {
    pathname = decodeURIComponent((req.url || '/').split('?')[0]);
  } catch (e) {
    return send(res, 400, 'Bad Request');
  }
  if (pathname.endsWith('/')) pathname += 'index.html';

  const file = path.resolve(ROOT, '.' + pathname);
  if (file !== ROOT && !file.startsWith(ROOT + path.sep)) {
    return send(res, 403, 'Forbidden');
  }

  fs.stat(file, (err, stat) => {
    if (!err && stat.isDirectory()) {
      const indexFile = path.join(file, 'index.html');
      if (indexFile.startsWith(ROOT + path.sep)) return sendFile(res, indexFile);
      return send(res, 403, 'Forbidden');
    }
    sendFile(res, file);
  });
});

function sendFile(res, file) {
  fs.stat(file, (err, stat) => {
    if (err || !stat.isFile()) {
      return send(res, 404, '404 Not Found');
    }
    const type = MIME[path.extname(file).toLowerCase()] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': type,
      'Content-Length': stat.size,
      'Cache-Control': 'no-cache'
    });
    fs.createReadStream(file).pipe(res);
  });
}

server.listen(PORT, HOST, () => {
  console.log(`LCZOJ 官网预览: http://${HOST}:${PORT}/`);
});
