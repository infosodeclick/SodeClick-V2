const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const port = process.env.PORT || 3000;
const dataDir = path.join(__dirname, 'data');
const usersFile = path.join(dataDir, 'users.json');
const pendingFile = path.join(dataDir, 'pending.json');

const userSessions = new Map(); // sid -> { email, username }

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

function parseCookies(req) {
  const h = req.headers.cookie || '';
  const out = {};
  h.split(';').forEach((chunk) => {
    const [k, ...rest] = chunk.trim().split('=');
    if (!k) return;
    out[k] = decodeURIComponent(rest.join('='));
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
    input,select,textarea{width:100%;border:1px solid #d1d5db;border-radius:10px;padding:10px}
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
      <p class="muted">โมดูล 1–2: สมัครสมาชิก + โปรไฟล์ผู้ใช้</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">
        <a class="btn btn-primary" href="/register">สมัครสมาชิก</a>
        <a class="btn" href="/login">เข้าสู่ระบบ</a>
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

function loginPage(error = '', info = '') {
  return htmlPage('เข้าสู่ระบบ', `
    <main class="card" style="display:grid;gap:12px;max-width:560px">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><h2 style="margin:0">เข้าสู่ระบบ</h2><a class="btn" href="/">กลับหน้าแรก</a></div>
      ${error ? `<div class="err">${error}</div>` : ''}
      ${info ? `<div class="ok">${info}</div>` : ''}
      <form method="POST" action="/login" style="display:grid;gap:10px">
        <div><label>Email หรือ Username</label><input name="login" required /></div>
        <div><label>Password</label><input type="password" name="password" required /></div>
        <div style="display:flex;justify-content:flex-end"><button class="btn btn-primary" type="submit">เข้าสู่ระบบ</button></div>
      </form>
    </main>
  `);
}

function profilePage(user, message = '') {
  return htmlPage('โปรไฟล์ผู้ใช้', `
    <main class="card" style="display:grid;gap:12px">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px">
        <h2 style="margin:0">โปรไฟล์ผู้ใช้</h2>
        <div style="display:flex;gap:8px"><a class="btn" href="/">หน้าแรก</a><a class="btn" href="/logout">Logout</a></div>
      </div>
      ${message ? `<div class="ok">${message}</div>` : ''}
      <section class="card" style="padding:14px;border-radius:12px">
        <div style="font-size:24px;font-weight:800">${user.displayName || user.username}</div>
        <div class="muted">@${user.username} • ${user.email}</div>
      </section>
      <form method="POST" action="/profile" style="display:grid;gap:10px">
        <div class="grid">
          <div><label>ชื่อแสดงผล</label><input name="displayName" value="${user.displayName || user.username}" /></div>
          <div><label>สถานะ</label><select name="status"><option value="online" ${user.status === 'online' ? 'selected' : ''}>online</option><option value="busy" ${user.status === 'busy' ? 'selected' : ''}>busy</option><option value="offline" ${user.status === 'offline' ? 'selected' : ''}>offline</option></select></div>
          <div><label>จังหวัด</label><input name="location" value="${user.location || ''}" /></div>
          <div><label>ความสนใจ</label><input name="interests" value="${user.interests || ''}" /></div>
        </div>
        <div><label>Bio</label><textarea name="bio" rows="4">${user.bio || ''}</textarea></div>
        <div style="display:flex;justify-content:flex-end"><button class="btn btn-primary" type="submit">บันทึกโปรไฟล์</button></div>
      </form>
    </main>
  `);
}

function getSessionUser(req) {
  const sid = parseCookies(req).sid;
  if (!sid) return null;
  const s = userSessions.get(sid);
  if (!s) return null;
  const users = readJson(usersFile);
  return users.find((u) => u.email === s.email || u.username === s.username) || null;
}

ensureData();

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${port}`);

  if (url.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'healthy', service: 'sodeclick-v2', module: 'registration+profile' }));
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

  if (url.pathname === '/login' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(loginPage());
    return;
  }

  if (url.pathname === '/logout' && req.method === 'GET') {
    const sid = parseCookies(req).sid;
    if (sid) userSessions.delete(sid);
    res.writeHead(302, { Location: '/login', 'Set-Cookie': 'sid=; Path=/; HttpOnly; Max-Age=0' });
    res.end();
    return;
  }

  if (url.pathname === '/profile' && req.method === 'GET') {
    const user = getSessionUser(req);
    if (!user) {
      res.writeHead(302, { Location: '/login' });
      res.end();
      return;
    }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(profilePage(user));
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
        bio: '',
        interests: '',
        status: 'online',
        coins: 0,
        vipStatus: false,
        createdAt: Date.now(),
      });
      writeJson(usersFile, users);
      writeJson(pendingFile, pending.filter((x) => x.email !== email));

      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(loginPage('', 'สมัครสมาชิกสำเร็จแล้ว กรุณาเข้าสู่ระบบ'));
    });
    return;
  }

  if (url.pathname === '/login' && req.method === 'POST') {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      const body = parseForm(raw);
      const login = String(body.login || '').trim();
      const password = String(body.password || '').trim();
      const users = readJson(usersFile);
      const user = users.find((u) => (u.email === login.toLowerCase() || u.username === login) && u.password === password);
      if (!user) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(loginPage('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง'));
        return;
      }

      const sid = crypto.randomBytes(24).toString('hex');
      userSessions.set(sid, { email: user.email, username: user.username, createdAt: Date.now() });
      res.writeHead(302, { Location: '/profile', 'Set-Cookie': `sid=${sid}; Path=/; HttpOnly; SameSite=Lax; Max-Age=28800` });
      res.end();
    });
    return;
  }

  if (url.pathname === '/profile' && req.method === 'POST') {
    const sessionUser = getSessionUser(req);
    if (!sessionUser) {
      res.writeHead(302, { Location: '/login' });
      res.end();
      return;
    }

    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      const body = parseForm(raw);
      const users = readJson(usersFile);
      const idx = users.findIndex((u) => u.email === sessionUser.email || u.username === sessionUser.username);
      if (idx < 0) {
        res.writeHead(302, { Location: '/login' });
        res.end();
        return;
      }

      users[idx].displayName = String(body.displayName || users[idx].displayName || users[idx].username).trim();
      users[idx].status = ['online', 'busy', 'offline'].includes(body.status) ? body.status : 'online';
      users[idx].location = String(body.location || '').trim();
      users[idx].interests = String(body.interests || '').trim();
      users[idx].bio = String(body.bio || '').trim();
      users[idx].updatedAt = Date.now();
      writeJson(usersFile, users);

      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(profilePage(users[idx], 'บันทึกโปรไฟล์เรียบร้อยแล้ว'));
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(htmlPage('404', '<main class="card"><h2>404 - Not Found</h2></main>'));
});

server.listen(port, () => {
  console.log(`SodeClick V2 listening on ${port}`);
});
