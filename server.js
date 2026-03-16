const http = require('http');

const port = process.env.PORT || 3000;

const html = `<!doctype html>
<html lang="th">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>SodeClick V2</title>
  <style>
    body{margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#f8fafc;color:#0f172a}
    .wrap{max-width:900px;margin:18vh auto 0;padding:16px}
    .card{background:#fff;border:1px solid #e5e7eb;border-radius:16px;padding:24px;box-shadow:0 10px 24px rgba(15,23,42,.06)}
    .title{margin:0 0 6px;font-size:28px}
    .muted{color:#64748b}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <h1 class="title">SodeClick V2</h1>
      <p class="muted">หน้าเว็บว่างเริ่มต้นพร้อมใช้งาน</p>
    </div>
  </div>
</body>
</html>`;

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'healthy', service: 'sodeclick-v2' }));
    return;
  }

  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
});

server.listen(port, () => {
  console.log(`SodeClick V2 listening on ${port}`);
});
