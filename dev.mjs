#!/usr/bin/env node
/**
 * 开发服务器：静态服务 dist/，监听 terms/ 变更后重编译并推送刷新。
 * 用法：node dev.mjs [port]
 */
import { createServer } from 'node:http';
import { readFileSync, existsSync, watch } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { networkInterfaces } from 'node:os';
import { build } from './build.mjs';

const root = dirname(fileURLToPath(import.meta.url));
const distDir = join(root, 'dist');
const termsDir = join(root, 'terms');
const port = Number(process.argv[2] || process.env.PORT || 4173);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
};

const clients = new Set();

function compile() {
  try {
    const { count } = build({ dev: true });
    console.log(`[build] ${count} 条词条`);
    return true;
  } catch (e) {
    console.error(`[build] 失败：${e.message}`);
    return false;
  }
}

compile();

const server = createServer((req, res) => {
  const path = req.url.split('?')[0];

  if (path === '/__reload') {
    res.writeHead(200, {
      'content-type': 'text/event-stream',
      'cache-control': 'no-cache',
      connection: 'keep-alive',
    });
    res.write(': connected\n\n');
    clients.add(res);
    req.on('close', () => clients.delete(res));
    return;
  }

  const file = join(distDir, path === '/' ? 'index.html' : path.replace(/^\/+/, ''));
  if (!file.startsWith(distDir) || !existsSync(file)) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('404');
    return;
  }

  const ext = file.slice(file.lastIndexOf('.'));
  res.writeHead(200, {
    'content-type': MIME[ext] || 'application/octet-stream',
    'cache-control': 'no-store',
  });
  res.end(readFileSync(file));
});

let timer;
function onChange() {
  clearTimeout(timer);
  timer = setTimeout(() => {
    if (compile()) for (const c of clients) c.write('data: reload\n\n');
  }, 120);
}
watch(termsDir, onChange);
watch(join(root, 'assets'), { recursive: true }, onChange);

server.listen(port, '0.0.0.0', () => {
  const ips = Object.values(networkInterfaces())
    .flat()
    .filter((i) => i.family === 'IPv4' && !i.internal)
    .map((i) => i.address);
  console.log(`AI 黑话的怪兽图鉴 dev server:`);
  console.log(`  http://localhost:${port}`);
  for (const ip of ips) console.log(`  http://${ip}:${port}`);
  console.log(`监听 terms/ 变更，改完存盘浏览器自动刷新`);
});
