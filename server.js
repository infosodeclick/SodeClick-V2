const http = require('http');

const port = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ status: 'healthy', service: 'sodeclick-v2' }));
    return;
  }

  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(`<!doctype html><html lang="th"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>SodeClick V2 (Starter)</title></head><body style="font-family:system-ui;padding:24px"><h1>SodeClick V2 — Blank Starter</h1><p>ระบบเริ่มต้นใหม่เรียบร้อย</p><p><a href="/health">/health</a></p></body></html>`);
});

server.listen(port, () => {
  console.log(`SodeClick V2 listening on ${port}`);
});
