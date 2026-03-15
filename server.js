const http = require('http');

const port = process.env.PORT || 3000;

const html = `<!doctype html>
<html lang="th">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>SodeClick V2</title>
  <style>
    :root { color-scheme: dark; }
    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
      background: #0b1020;
      color: #e9eefc;
    }
    .card {
      text-align: center;
      padding: 28px;
      border: 1px solid #26304f;
      border-radius: 14px;
      background: #121a31;
      box-shadow: 0 12px 34px rgba(0,0,0,.35);
    }
    h1 { margin: 0 0 8px; font-size: 28px; }
    p { margin: 0; opacity: .85; }
  </style>
</head>
<body>
  <div class="card">
    <h1>SodeClick V2</h1>
    <p>ระบบเริ่มต้นพร้อมใช้งาน (หน้าเปล่า)</p>
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
