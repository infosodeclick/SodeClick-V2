const http = require('http');

const port = process.env.PORT || 3000;

function htmlPage(title, body) {
  return `<!doctype html>
<html lang="th">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${title}</title>
  <style>
    :root { --bg:#f8fafc; --card:#ffffff; --text:#1f2937; --muted:#6b7280; --blue:#60a5fa; --pink:#f9a8d4; }
    * { box-sizing:border-box; }
    body { margin:0; font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif; background:var(--bg); color:var(--text); }
    .wrap { max-width:900px; margin:10vh auto 0; padding:16px; }
    .card { background:var(--card); border:1px solid #e5e7eb; border-radius:16px; padding:22px; box-shadow:0 10px 28px rgba(15,23,42,.06); }
    .title { margin:0 0 8px; font-size:28px; }
    .muted { color:var(--muted); }
    .pill { display:inline-block; margin-top:12px; padding:6px 10px; border-radius:999px; color:#fff; background:linear-gradient(135deg,var(--blue),var(--pink)); font-size:13px; }
  </style>
</head>
<body>
  <div class="wrap">${body}</div>
</body>
</html>`;
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${port}`);
  const path = url.pathname;

  if (path === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'healthy', service: 'sodeclick-v2', mode: 'blank-starter' }));
    return;
  }

  if (path === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(htmlPage('SodeClick V2', `
      <main class="card">
        <h1 class="title">SodeClick V2</h1>
        <p class="muted">หน้าเว็บถูกรีเซ็ตเป็นหน้าเปล่าเรียบร้อยแล้ว</p>
        <span class="pill">Blank Starter</span>
      </main>
    `));
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(htmlPage('404', '<main class="card"><h2>404 - Not Found</h2></main>'));
});

server.listen(port, () => {
  console.log(`SodeClick V2 listening on ${port}`);
});
