// 《无名之辈》轻量服务：静态托管 + 基于 IP 的到访统计（IP 仅哈希存储，不保留原文）
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = Number(process.env.PORT || 3000);
const ROOT = __dirname;
const DATA_FILE = path.join(ROOT, '.visits.json');
// 固定盐：保证跨重启的哈希稳定性（更换盐会导致重复计数）
const SALT = 'nameless-hogwarts-1991-v1';

// ---- 到访数据 ----
// 结构: { [hash]: { first: 'YYYY-MM-DD', last: 'YYYY-MM-DD', count: n } }
let visits = {};
try {
  if (fs.existsSync(DATA_FILE)) visits = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
} catch (e) { visits = {}; }

let saveTimer = null;
function persist() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    try { fs.writeFileSync(DATA_FILE, JSON.stringify(visits)); } catch (e) { /* 磁盘异常时静默，下次再写 */ }
  }, 300);
}
function today() { return new Date().toISOString().slice(0, 10); }

function ipHash(req) {
  const fwd = String(req.headers['x-forwarded-for'] || '');
  // 反向代理场景取第一跳；本地直连场景回退到 socket 地址
  const ip = (fwd.split(',')[0].trim()) || req.socket.remoteAddress || 'unknown';
  return crypto.createHash('sha256').update(SALT + ip).digest('hex').slice(0, 24);
}

function recordVisit(req) {
  const h = ipHash(req);
  const t = today();
  if (!visits[h]) visits[h] = { first: t, last: t, count: 0 };
  visits[h].count++;
  visits[h].last = t;
  persist();
  return h;
}

function stats() {
  const t = today();
  let total = 0, todayCount = 0;
  for (const h of Object.keys(visits)) {
    total++;
    if (visits[h].last === t) todayCount++;
  }
  return { total, today: todayCount };
}

// ---- 静态文件 ----
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.json': 'application/json; charset=utf-8',
};
function serveStatic(req, res, urlPath) {
  let p = decodeURIComponent(urlPath.split('?')[0]);
  if (p === '/' || p === '') p = '/index.html';
  const file = path.normalize(path.join(ROOT, p));
  if (!file.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('Not Found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(buf);
  });
}

const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0];
  if (url === '/api/visits') {
    const h = recordVisit(req);
    const s = stats();
    const first = visits[h] && visits[h].count === 1;
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({ ok: true, total: s.total, today: s.today, firstVisit: first }));
    return;
  }
  if (url === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
    return;
  }
  serveStatic(req, res, req.url);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('nameless-hogwarts server listening on port ' + PORT);
});
