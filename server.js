const http = require('http');
const fs = require('fs');
const path = require('path');

const port = process.env.PORT || 3000;
const dataDir = path.join(__dirname, 'data');
const usersFile = path.join(dataDir, 'users.json');
const pendingFile = path.join(dataDir, 'pending.json');

function ensureData() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(usersFile)) fs.writeFileSync(usersFile, '[]', 'utf8');
  if (!fs.existsSync(pendingFile)) fs.writeFileSync(pendingFile, '[]', 'utf8');
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return [];
  }
}

function writeJson(file, payload) {
  fs.writeFileSync(file, JSON.stringify(payload, null, 2), 'utf8');
}

function parseForm(body) {
  const out = {};
  String(body || '')
    .split('&')
    .forEach((p) => {
      if (!p) return;
      const [k, v] = p.split('=');
      out[decodeURIComponent(k || '')] = decodeURIComponent((v || '').replace(/\+/g, ' '));
    });
  return out;
}

function htmlPage(title, body) {
  return `<!doctype html>
<html lang="th">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${title}</title>
  <style>
    body{margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#f8fafc;color:#0f172a}
    .wrap{max-width:980px;margin:6vh auto 0;padding:16px}
    .card{background:#fff;border:1px solid #e5e7eb;border-radius:16px;padding:22px;box-shadow:0 10px 24px rgba(15,23,42,.06)}
    .title{margin:0 0 8px;font-size:28px}
    .muted{color:#64748b}
    .btn{display:inline-block;text-decoration:none;border:1px solid #d1d5db;background:#fff;padding:8px 12px;border-radius:10px;color:#111827;font-weight:700;cursor:pointer}
    .btn-primary{border:0;color:#fff;background:linear-gradient(135deg,#60a5fa,#f9a8d4)}
    .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:10px}
    input,select{width:100%;border:1px solid #d1d5db;border-radius:10px;padding:10px}
    .ok{border:1px solid #86efac;background:#f0fdf4;color:#166534;padding:10px;border-radius:10px}
    .err{border:1px solid #fecaca;background:#fef2f2;color:#991b1b;padding:10px;border-radius:10px}
  </style>
</head>
<body><div class="wrap">${body}</div></body></html>`;
}

function homePage() {
  return htmlPage('SodeClick V2', `
    <main class="card">
      <h1 class="title">SodeClick V2</h1>
      <p class="muted">เริ่มโมดูลแรก: ระบบสมัครสมาชิก</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">
        <a class="btn btn-primary" href="/register">สมัครสมาชิก</a>
        <a class="btn" href="/health">Health</a>
      </div>
    </main>
  `);
}

function registerPage(error = '', info = '') {
  return htmlPage('สมัครสมาชิก', `
    <main class="card" style="display:grid;gap:12px">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><h2 style="margin:0">สมัครสมาชิก</h2><a class="btn" href="/">กลับหน้าแรก</a></div>
      ${error ? `<div class="err">${error}</div>` : ''}
      ${info ? `<div class="ok">${info}</div>` : ''}
      <form method="POST" action="/register" style="display:grid;gap:10px">
        <div class="grid">
          <div><label>Username</label><input name="username" required /></div>
          <div><label>Email</label><input type="email" name="email" required /></div>
          <div><label>Password</label><input type="password" name="password" required /></div>
          <div><label>เพศ</label><select name="gender"><option value="male">male</option><option value="female">female</option><option value="other">other</option></select></div>
          <div><label>อายุ</label><input type="number" min="18" max="99" name="age" required /></div>
          <div><label>จังหวัด</label><input name="province" required /></div>
          <div><label>เพศที่ต้องการหา</label><select name="lookingFor"><option value="male">male</option><option value="female">female</option><option value="all">all</option></select></div>
        </div>
        <div style="display:flex;justify-content:flex-end"><button class="btn btn-primary" type="submit">สมัครสมาชิก</button></div>
      </form>
    </main>
  `);
}

function verifyPage(email = '', error = '', info = '') {
  return htmlPage('ยืนยัน OTP', `
    <main class="card" style="display:grid;gap:12px;max-width:560px">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><h2 style="margin:0">ยืนยัน OTP</h2><a class="btn" href="/register">กลับสมัครสมาชิก</a></div>
      ${error ? `<div class="err">${error}</div>` : ''}
      ${info ? `<div class="ok">${info}</div>` : ''}
      <form method="POST" action="/verify" style="display:grid;gap:10px">
        <div><label>Email</label><input type="email" name="email" value="${email}" required /></div>
        <div><label>OTP</label><input name="otp" required /></div>
        <div style="display:flex;justify-content:flex-end"><button class="btn btn-primary" type="submit">ยืนยัน</button></div>
      </form>
      <p class="muted">เดโม: ระบบจะแสดง OTP หลังกดสมัคร</p>
    </main>
  `);
}

ensureData();

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${port}`);

  if (url.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'healthy', service: 'sodeclick-v2', module: 'registration' }));
    return;
  }

  if (url.pathname === '/' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(homePage());
    return;
  }

  if (url.pathname === '/register' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(registerPage());
    return;
  }

  if (url.pathname === '/verify' && req.method === 'GET') {
    const email = url.searchParams.get('email') || '';
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(verifyPage(email));
    return;
  }

  if (url.pathname === '/register' && req.method === 'POST') {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      const body = parseForm(raw);
      const username = String(body.username || '').trim();
      const email = String(body.email || '').trim().toLowerCase();
      const password = String(body.password || '').trim();
      if (!username || !email || !password) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(registerPage('กรอกข้อมูลไม่ครบ'));
        return;
      }

      const users = readJson(usersFile);
      if (users.find((u) => u.email === email || u.username === username)) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(registerPage('อีเมลหรือ Username นี้ถูกใช้แล้ว'));
        return;
      }

      const pending = readJson(pendingFile).filter((x) => x.email !== email);
      const otp = String(Math.floor(100000 + Math.random() * 900000));
      pending.push({
        userId: `USR${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
        username,
        email,
        password,
        gender: body.gender || 'other',
        age: Number(body.age || 18),
        location: body.province || '',
        lookingFor: body.lookingFor || 'all',
        otp,
        createdAt: Date.now(),
      });
      writeJson(pendingFile, pending);

      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(verifyPage(email, '', `OTP สำหรับเดโม: ${otp}`));
    });
    return;
  }

  if (url.pathname === '/verify' && req.method === 'POST') {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      const body = parseForm(raw);
      const email = String(body.email || '').trim().toLowerCase();
      const otp = String(body.otp || '').trim();
      const pending = readJson(pendingFile);
      const row = pending.find((x) => x.email === email);
      if (!row || row.otp !== otp) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(verifyPage(email, 'OTP ไม่ถูกต้อง'));
        return;
      }

      const users = readJson(usersFile);
      users.push({
        userId: row.userId,
        username: row.username,
        displayName: row.username,
        email: row.email,
        password: row.password,
        gender: row.gender,
        age: row.age,
        location: row.location,
        lookingFor: row.lookingFor,
        coins: 0,
        vipStatus: false,
        createdAt: Date.now(),
      });
      writeJson(usersFile, users);
      writeJson(pendingFile, pending.filter((x) => x.email !== email));

      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(registerPage('', 'สมัครสมาชิกสำเร็จแล้ว (โมดูลแรกพร้อมใช้งาน)'));
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(htmlPage('404', '<main class="card"><h2>404 - Not Found</h2></main>'));
});

server.listen(port, () => {
  console.log(`SodeClick V2 listening on ${port}`);
});
