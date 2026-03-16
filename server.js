const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const port = process.env.PORT || 3000;
const dataDir = path.join(__dirname, 'data');
const usersFile = path.join(dataDir, 'users.json');
const pendingFile = path.join(dataDir, 'pending.json');
const likesFile = path.join(dataDir, 'likes.json');
const matchesFile = path.join(dataDir, 'matches.json');
const messagesFile = path.join(dataDir, 'messages.json');
const blocksFile = path.join(dataDir, 'blocks.json');
const reportsFile = path.join(dataDir, 'reports.json');
const giftsFile = path.join(dataDir, 'gift-transactions.json');

const userSessions = new Map(); // sid -> { email, username }

function ensureData() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(usersFile)) fs.writeFileSync(usersFile, '[]', 'utf8');
  if (!fs.existsSync(pendingFile)) fs.writeFileSync(pendingFile, '[]', 'utf8');
  if (!fs.existsSync(likesFile)) fs.writeFileSync(likesFile, '[]', 'utf8');
  if (!fs.existsSync(matchesFile)) fs.writeFileSync(matchesFile, '[]', 'utf8');
  if (!fs.existsSync(messagesFile)) fs.writeFileSync(messagesFile, '[]', 'utf8');
  if (!fs.existsSync(blocksFile)) fs.writeFileSync(blocksFile, '[]', 'utf8');
  if (!fs.existsSync(reportsFile)) fs.writeFileSync(reportsFile, '[]', 'utf8');
  if (!fs.existsSync(giftsFile)) fs.writeFileSync(giftsFile, '[]', 'utf8');
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
    <main class="card" style="display:grid;gap:12px">
      <nav class="card" style="padding:12px;border-radius:12px;display:flex;gap:8px;flex-wrap:wrap;align-items:center;justify-content:space-between">
        <div style="font-weight:800">SodeClick V2</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <a class="btn btn-primary" href="/register">สมัครสมาชิก</a>
          <a class="btn" href="/login">เข้าสู่ระบบ</a>
          <a class="btn" href="/forgot-password">ลืมรหัสผ่าน</a>
          <a class="btn" href="/auth/google">Google Login</a>
        </div>
      </nav>
      <section class="card" style="padding:16px;border-radius:12px">
        <h1 class="title">SodeClick V2</h1>
        <p class="muted">Phase A เริ่มแล้ว: ระบบสมาชิก + โปรไฟล์ (Responsive / Horizontal Navbar / Card UI)</p>
      </section>
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
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap">
          <a class="btn" href="/forgot-password">ลืมรหัสผ่าน</a>
          <button class="btn btn-primary" type="submit">เข้าสู่ระบบ</button>
        </div>
      </form>
      <a class="btn" href="/auth/google">เข้าสู่ระบบด้วย Google (demo)</a>
    </main>
  `);
}

function forgotPasswordPage(error = '', info = '') {
  return htmlPage('ลืมรหัสผ่าน', `
    <main class="card" style="display:grid;gap:12px;max-width:560px">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><h2 style="margin:0">ลืมรหัสผ่าน</h2><a class="btn" href="/login">กลับหน้าเข้าสู่ระบบ</a></div>
      ${error ? `<div class="err">${error}</div>` : ''}
      ${info ? `<div class="ok">${info}</div>` : ''}
      <form method="POST" action="/forgot-password" style="display:grid;gap:10px">
        <div><label>Email</label><input type="email" name="email" required /></div>
        <div style="display:flex;justify-content:flex-end"><button class="btn btn-primary" type="submit">รีเซ็ตรหัสผ่าน (demo)</button></div>
      </form>
    </main>
  `);
}

function profilePage(user, message = '') {
  return htmlPage('โปรไฟล์ผู้ใช้', `
    <main class="card" style="display:grid;gap:12px">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px">
        <h2 style="margin:0">โปรไฟล์ผู้ใช้</h2>
        <div style="display:flex;gap:8px"><a class="btn" href="/match">Match</a><a class="btn" href="/">หน้าแรก</a><a class="btn" href="/logout">Logout</a></div>
      </div>
      ${message ? `<div class="ok">${message}</div>` : ''}
      <section class="card" style="padding:14px;border-radius:12px">
        <div style="font-size:24px;font-weight:800">${user.displayName || user.username}</div>
        <div class="muted">@${user.username} • ${user.email}</div>
        <div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap">
          ${user.verifiedBadge ? '<span class="ok" style="padding:4px 8px">Verified</span>' : ''}
          ${user.vipStatus ? '<span class="ok" style="padding:4px 8px">VIP</span>' : ''}
          ${user.emailVerified ? '<span class="ok" style="padding:4px 8px">Email Verified</span>' : '<span class="err" style="padding:4px 8px">Email Not Verified</span>'}
          ${user.phoneVerified ? '<span class="ok" style="padding:4px 8px">Phone Verified</span>' : '<span class="err" style="padding:4px 8px">Phone Not Verified</span>'}
        </div>
      </section>
      <form method="POST" action="/profile" style="display:grid;gap:10px">
        <div class="grid">
          <div><label>ชื่อแสดงผล</label><input name="displayName" value="${user.displayName || user.username}" /></div>
          <div><label>สถานะ</label><select name="status"><option value="online" ${user.status === 'online' ? 'selected' : ''}>online</option><option value="busy" ${user.status === 'busy' ? 'selected' : ''}>busy</option><option value="offline" ${user.status === 'offline' ? 'selected' : ''}>offline</option></select></div>
          <div><label>จังหวัด</label><input name="location" value="${user.location || ''}" /></div>
          <div><label>อาชีพ</label><input name="occupation" value="${user.occupation || ''}" /></div>
          <div><label>ความสนใจ</label><input name="interests" value="${user.interests || ''}" /></div>
          <div><label>เป้าหมายความสัมพันธ์</label><select name="relationshipGoal"><option value="friend" ${user.relationshipGoal==='friend'?'selected':''}>friend</option><option value="dating" ${user.relationshipGoal==='dating'?'selected':''}>dating</option><option value="serious" ${user.relationshipGoal==='serious'?'selected':''}>serious</option></select></div>
        </div>
        <div><label>Bio</label><textarea name="bio" rows="4">${user.bio || ''}</textarea></div>
        <div style="display:flex;justify-content:flex-end"><button class="btn btn-primary" type="submit">บันทึกโปรไฟล์</button></div>
      </form>
    </main>
  `);
}

function renderMatchPage(me, query, info = '') {
  const blocks = readJson(blocksFile);
  const blockedByMe = new Set(blocks.filter((b) => b.owner === me.username).map((b) => b.target));
  const users = readJson(usersFile).filter((u) => u.username !== me.username && !blockedByMe.has(u.username));
  const likes = readJson(likesFile);
  const matches = readJson(matchesFile);

  const minAge = Number(query.minAge || 18);
  const maxAge = Number(query.maxAge || 99);
  const gender = (query.gender || 'all').toLowerCase();
  const province = (query.province || '').trim().toLowerCase();
  const goal = (query.goal || 'all').toLowerCase();

  const filtered = users.filter((u) => {
    if ((u.age || 0) < minAge || (u.age || 0) > maxAge) return false;
    if (gender !== 'all' && (u.gender || '').toLowerCase() !== gender) return false;
    if (province && !(u.location || '').toLowerCase().includes(province)) return false;
    if (goal !== 'all' && (u.relationshipGoal || '').toLowerCase() !== goal) return false;
    return true;
  });

  const cards = filtered.map((u) => `
    <div class="card" style="padding:14px;border-radius:12px">
      <div style="display:flex;justify-content:space-between;gap:8px;align-items:center">
        <strong>${u.displayName || u.username}</strong>
        <span class="muted">${u.location || '-'}</span>
      </div>
      <div class="muted" style="margin-top:4px">@${u.username} • ${u.gender || 'other'} • ${u.age || '-'}</div>
      <div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap">
        <form method="POST" action="/match/action"><input type="hidden" name="target" value="${u.username}"/><input type="hidden" name="type" value="like"/><button class="btn btn-primary" type="submit">❤️ Like</button></form>
        <form method="POST" action="/match/action"><input type="hidden" name="target" value="${u.username}"/><input type="hidden" name="type" value="super_like"/><button class="btn" type="submit">⭐ Super Like</button></form>
        <form method="POST" action="/match/action"><input type="hidden" name="target" value="${u.username}"/><input type="hidden" name="type" value="pass"/><button class="btn" type="submit">❌ Pass</button></form>
      </div>
    </div>
  `).join('');

  const likedMe = likes.filter((x) => x.to === me.username && (x.type === 'like' || x.type === 'super_like'));
  const myMatches = matches.filter((m) => m.userA === me.username || m.userB === me.username);

  return htmlPage('ค้นหาและแมตช์', `
    <main class="card" style="display:grid;gap:12px">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><h2 style="margin:0">ค้นหาและแมตช์</h2><div style="display:flex;gap:8px"><a class="btn" href="/profile">โปรไฟล์</a><a class="btn" href="/logout">Logout</a></div></div>
      ${info ? `<div class="ok">${info}</div>` : ''}
      <section class="card" style="padding:12px;border-radius:12px">
        <form method="GET" action="/match" class="grid">
          <div><label>อายุต่ำสุด</label><input type="number" name="minAge" value="${minAge}"/></div>
          <div><label>อายุสูงสุด</label><input type="number" name="maxAge" value="${maxAge}"/></div>
          <div><label>เพศ</label><select name="gender"><option value="all" ${gender==='all'?'selected':''}>all</option><option value="male" ${gender==='male'?'selected':''}>male</option><option value="female" ${gender==='female'?'selected':''}>female</option><option value="other" ${gender==='other'?'selected':''}>other</option></select></div>
          <div><label>จังหวัด</label><input name="province" value="${query.province || ''}"/></div>
          <div><label>เป้าหมาย</label><select name="goal"><option value="all" ${goal==='all'?'selected':''}>all</option><option value="friend" ${goal==='friend'?'selected':''}>friend</option><option value="dating" ${goal==='dating'?'selected':''}>dating</option><option value="serious" ${goal==='serious'?'selected':''}>serious</option></select></div>
          <div style="display:flex;align-items:flex-end"><button class="btn btn-primary" type="submit">ค้นหา</button></div>
        </form>
      </section>
      <section class="grid">${cards || '<div class="muted">ไม่พบผู้ใช้ตามเงื่อนไข</div>'}</section>
      <section class="card" style="padding:12px;border-radius:12px"><strong>คนที่กดไลก์เรา</strong><div class="muted" style="margin-top:6px">${likedMe.length ? likedMe.map((x) => x.from).join(', ') : 'ยังไม่มี'}</div></section>
      <section class="card" style="padding:12px;border-radius:12px"><strong>Match ของฉัน</strong><div style="margin-top:6px;display:flex;gap:8px;flex-wrap:wrap">${myMatches.length ? myMatches.map((m) => `<a class=\"btn\" href=\"/chat/${m.id}\">💬 ${m.userA===me.username?m.userB:m.userA}</a>`).join(' ') : '<span class="muted">ยังไม่มี match</span>'}</div></section>
      <section class="card" style="padding:12px;border-radius:12px">
        <strong>Boost Profile</strong>
        <form method="POST" action="/match/boost" style="margin-top:8px"><button class="btn btn-primary" type="submit">🚀 Boost โปรไฟล์ (demo)</button></form>
      </section>
    </main>
  `);
}

function renderChatPage(me, matchId, info = '') {
  const matches = readJson(matchesFile);
  const m = matches.find((x) => x.id === matchId && (x.userA === me.username || x.userB === me.username));
  if (!m) return htmlPage('ไม่พบแชท', '<main class="card"><h2>ไม่พบห้องแชท</h2><a class="btn" href="/match">กลับ Match</a></main>');

  const partner = m.userA === me.username ? m.userB : m.userA;
  const msgs = readJson(messagesFile).filter((x) => x.matchId === matchId).slice(-80);
  const rows = msgs.map((x) => `<div class="card" style="padding:10px;border-radius:10px;background:${x.sender===me.username?'#eff6ff':'#fff'}"><strong>${x.sender}</strong> <span class="muted">${new Date(x.at).toLocaleString('th-TH')}</span><div style="margin-top:6px">${x.text}</div><div class="muted" style="margin-top:4px">${x.read ? 'read' : 'sent'}</div></div>`).join('');

  const giftBtns = [
    { id:'flower', name:'🌹 ดอกไม้', price:10 },
    { id:'heart', name:'❤️ หัวใจ', price:20 },
    { id:'ring', name:'💍 แหวน', price:100 },
  ].map((g)=>`<form method="POST" action="/chat/${matchId}/gift" style="display:inline-block"><input type="hidden" name="giftId" value="${g.id}"/><input type="hidden" name="price" value="${g.price}"/><button class="btn" type="submit">${g.name} (${g.price})</button></form>`).join(' ');

  return htmlPage('แชท', `
    <main class="card" style="display:grid;gap:12px">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><h2 style="margin:0">แชทกับ ${partner}</h2><div style="display:flex;gap:8px"><a class="btn" href="/match">กลับ Match</a><a class="btn" href="/logout">Logout</a></div></div>
      ${info ? `<div class="ok">${info}</div>` : ''}
      <div style="display:grid;gap:8px">${rows || '<div class="muted">ยังไม่มีข้อความ</div>'}</div>
      <div class="card" style="padding:10px;border-radius:10px"><strong>ส่งของขวัญ</strong><div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap">${giftBtns}</div></div>
      <form method="POST" action="/chat/${matchId}" style="display:grid;gap:8px">
        <textarea name="message" rows="4" placeholder="พิมพ์ข้อความ... (รองรับ emoji 😊)"></textarea>
        <div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap">
          <div style="display:flex;gap:8px"><button class="btn" name="quick" value="😊" type="submit">😊</button><button class="btn" name="quick" value="❤️" type="submit">❤️</button><button class="btn" name="quick" value="🔥" type="submit">🔥</button></div>
          <button class="btn btn-primary" type="submit">ส่งข้อความ</button>
        </div>
      </form>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <form method="POST" action="/chat/${matchId}/block"><button class="btn" type="submit">⛔ Block</button></form>
        <form method="POST" action="/chat/${matchId}/report"><button class="btn" type="submit">🚩 Report</button></form>
      </div>
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

  if (url.pathname === '/forgot-password' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(forgotPasswordPage());
    return;
  }

  if (url.pathname === '/auth/google' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(loginPage('', 'Google login (demo) พร้อมเชื่อม OAuth ในรอบถัดไป'));
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
        verifiedBadge: false,
        emailVerified: true,
        phoneVerified: false,
        occupation: '',
        relationshipGoal: 'friend',
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
      users[idx].occupation = String(body.occupation || '').trim();
      users[idx].interests = String(body.interests || '').trim();
      users[idx].relationshipGoal = ['friend', 'dating', 'serious'].includes(body.relationshipGoal) ? body.relationshipGoal : 'friend';
      users[idx].bio = String(body.bio || '').trim();
      users[idx].updatedAt = Date.now();
      writeJson(usersFile, users);

      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(profilePage(users[idx], 'บันทึกโปรไฟล์เรียบร้อยแล้ว'));
    });
    return;
  }

  if (url.pathname === '/forgot-password' && req.method === 'POST') {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      const body = parseForm(raw);
      const email = String(body.email || '').trim().toLowerCase();
      const users = readJson(usersFile);
      const idx = users.findIndex((u) => u.email === email);
      if (idx < 0) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(forgotPasswordPage('ไม่พบอีเมลนี้ในระบบ'));
        return;
      }
      const temp = Math.random().toString(36).slice(2, 10);
      users[idx].password = temp;
      users[idx].updatedAt = Date.now();
      writeJson(usersFile, users);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(forgotPasswordPage('', `รีเซ็ตสำเร็จ (demo) รหัสใหม่: ${temp}`));
    });
    return;
  }

  if (url.pathname === '/match' && req.method === 'GET') {
    const me = getSessionUser(req);
    if (!me) {
      res.writeHead(302, { Location: '/login' });
      res.end();
      return;
    }
    const query = Object.fromEntries(url.searchParams.entries());
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(renderMatchPage(me, query));
    return;
  }

  if (url.pathname === '/match/action' && req.method === 'POST') {
    const me = getSessionUser(req);
    if (!me) {
      res.writeHead(302, { Location: '/login' });
      res.end();
      return;
    }
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      const body = parseForm(raw);
      const target = String(body.target || '').trim();
      const type = String(body.type || 'like').trim();
      if (!target || target === me.username) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(renderMatchPage(me, {}, 'ข้อมูลไม่ถูกต้อง'));
        return;
      }

      const likes = readJson(likesFile);
      likes.unshift({ id: `L${Date.now()}`, from: me.username, to: target, type, at: Date.now() });
      writeJson(likesFile, likes);

      let info = `ส่ง ${type} ไปยัง ${target} แล้ว`;
      if (type !== 'pass') {
        const reciprocal = likes.find((x) => x.from === target && x.to === me.username && (x.type === 'like' || x.type === 'super_like'));
        if (reciprocal) {
          const matches = readJson(matchesFile);
          const exists = matches.find((m) => [m.userA, m.userB].sort().join('|') === [me.username, target].sort().join('|'));
          if (!exists) {
            matches.unshift({ id: `M${Date.now()}`, userA: me.username, userB: target, at: Date.now() });
            writeJson(matchesFile, matches);
          }
          info = `🎉 Match สำเร็จกับ ${target}`;
        }
      }

      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(renderMatchPage(me, {}, info));
    });
    return;
  }

  if (url.pathname === '/match/boost' && req.method === 'POST') {
    const me = getSessionUser(req);
    if (!me) {
      res.writeHead(302, { Location: '/login' });
      res.end();
      return;
    }
    const users = readJson(usersFile);
    const idx = users.findIndex((u) => u.email === me.email || u.username === me.username);
    if (idx >= 0) {
      users[idx].boostUntil = Date.now() + 30 * 60 * 1000;
      writeJson(usersFile, users);
    }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(renderMatchPage(users[idx] || me, {}, 'Boost โปรไฟล์แล้ว (30 นาที demo)'));
    return;
  }

  if (url.pathname.startsWith('/chat/') && req.method === 'GET') {
    const me = getSessionUser(req);
    if (!me) {
      res.writeHead(302, { Location: '/login' });
      res.end();
      return;
    }
    const matchId = url.pathname.replace('/chat/', '').trim();
    const messages = readJson(messagesFile);
    let changed = false;
    messages.forEach((m) => {
      if (m.matchId === matchId && m.sender !== me.username && !m.read) {
        m.read = true;
        changed = true;
      }
    });
    if (changed) writeJson(messagesFile, messages);
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(renderChatPage(me, matchId));
    return;
  }

  if (url.pathname.startsWith('/chat/') && req.method === 'POST' && !url.pathname.endsWith('/gift') && !url.pathname.endsWith('/block') && !url.pathname.endsWith('/report')) {
    const me = getSessionUser(req);
    if (!me) {
      res.writeHead(302, { Location: '/login' });
      res.end();
      return;
    }
    const matchId = url.pathname.replace('/chat/', '').trim();
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      const body = parseForm(raw);
      const txt = String((body.quick || '') + (body.message || '')).trim();
      if (!txt) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(renderChatPage(me, matchId, 'กรุณาพิมพ์ข้อความก่อนส่ง'));
        return;
      }
      const messages = readJson(messagesFile);
      messages.push({ id: `MSG${Date.now()}`, matchId, sender: me.username, text: txt, at: Date.now(), read: false });
      writeJson(messagesFile, messages);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(renderChatPage(me, matchId, 'ส่งข้อความสำเร็จ'));
    });
    return;
  }

  if (url.pathname.startsWith('/chat/') && url.pathname.endsWith('/gift') && req.method === 'POST') {
    const me = getSessionUser(req);
    if (!me) {
      res.writeHead(302, { Location: '/login' });
      res.end();
      return;
    }
    const matchId = url.pathname.replace('/chat/', '').replace('/gift', '').trim();
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      const body = parseForm(raw);
      const price = Number(body.price || 0);
      const giftId = String(body.giftId || '').trim();
      const users = readJson(usersFile);
      const idx = users.findIndex((u) => u.username === me.username);
      if (idx < 0 || (users[idx].coins || 0) < price) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(renderChatPage(me, matchId, 'เหรียญไม่พอสำหรับส่งของขวัญ'));
        return;
      }
      users[idx].coins = (users[idx].coins || 0) - price;
      writeJson(usersFile, users);
      const gifts = readJson(giftsFile);
      gifts.push({ id: `GTR${Date.now()}`, matchId, from: me.username, giftId, price, at: Date.now() });
      writeJson(giftsFile, gifts);
      const messages = readJson(messagesFile);
      messages.push({ id: `MSG${Date.now()}`, matchId, sender: me.username, text: `ส่งของขวัญ ${giftId}`, at: Date.now(), read: false });
      writeJson(messagesFile, messages);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(renderChatPage(users[idx], matchId, 'ส่งของขวัญสำเร็จ'));
    });
    return;
  }

  if (url.pathname.startsWith('/chat/') && url.pathname.endsWith('/block') && req.method === 'POST') {
    const me = getSessionUser(req);
    if (!me) {
      res.writeHead(302, { Location: '/login' });
      res.end();
      return;
    }
    const matchId = url.pathname.replace('/chat/', '').replace('/block', '').trim();
    const matches = readJson(matchesFile);
    const m = matches.find((x) => x.id === matchId && (x.userA === me.username || x.userB === me.username));
    if (m) {
      const target = m.userA === me.username ? m.userB : m.userA;
      const blocks = readJson(blocksFile);
      if (!blocks.find((b) => b.owner === me.username && b.target === target)) {
        blocks.push({ id: `BLK${Date.now()}`, owner: me.username, target, at: Date.now() });
        writeJson(blocksFile, blocks);
      }
    }
    res.writeHead(302, { Location: '/match' });
    res.end();
    return;
  }

  if (url.pathname.startsWith('/chat/') && url.pathname.endsWith('/report') && req.method === 'POST') {
    const me = getSessionUser(req);
    if (!me) {
      res.writeHead(302, { Location: '/login' });
      res.end();
      return;
    }
    const matchId = url.pathname.replace('/chat/', '').replace('/report', '').trim();
    const matches = readJson(matchesFile);
    const m = matches.find((x) => x.id === matchId && (x.userA === me.username || x.userB === me.username));
    if (m) {
      const target = m.userA === me.username ? m.userB : m.userA;
      const reports = readJson(reportsFile);
      reports.push({ id: `RPT${Date.now()}`, reporter: me.username, target, reason: 'chat-report', at: Date.now() });
      writeJson(reportsFile, reports);
    }
    res.writeHead(302, { Location: '/match' });
    res.end();
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(htmlPage('404', '<main class="card"><h2>404 - Not Found</h2></main>'));
});

server.listen(port, () => {
  console.log(`SodeClick V2 listening on ${port}`);
});
