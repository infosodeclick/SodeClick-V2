const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { handleAuthRoutes } = require('./modules/auth/routes');
const { handleProfileRoutes } = require('./modules/profile/routes');
const { handleMatchRoutes } = require('./modules/match/routes');
const { handleCommerceRoutes } = require('./modules/commerce/routes');

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
const coinTxFile = path.join(dataDir, 'coin-transactions.json');
const frameTxFile = path.join(dataDir, 'frame-transactions.json');
const boardPostsFile = path.join(dataDir, 'board-posts.json');

const userSessions = new Map(); // sid -> { email, username }
const adminSessions = new Map(); // aid -> { username, role }
const actionTs = new Map(); // anti-spam in-memory

function isSpamAction(key, cooldownMs = 2500) {
  const now = Date.now();
  const last = actionTs.get(key) || 0;
  if (now - last < cooldownMs) return true;
  actionTs.set(key, now);
  return false;
}

function containsBlockedWords(text) {
  const bad = ['พนัน', 'ยาเสพติด', 'ขายบริการ', 'scam', 'โกง'];
  const t = String(text || '').toLowerCase();
  return bad.some((w) => t.includes(w.toLowerCase()));
}

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
  if (!fs.existsSync(coinTxFile)) fs.writeFileSync(coinTxFile, '[]', 'utf8');
  if (!fs.existsSync(frameTxFile)) fs.writeFileSync(frameTxFile, '[]', 'utf8');
  if (!fs.existsSync(boardPostsFile)) fs.writeFileSync(boardPostsFile, '[]', 'utf8');

  // seed test user for stable login on fresh deployments
  const users = readJson(usersFile);
  const hasDemoUser = users.some((u) => u.username === 'user' || u.email === 'user@sodeclick.local');
  if (!hasDemoUser) {
    users.push({
      userId: 'USRDEMO1',
      username: 'user',
      displayName: 'user',
      email: 'user@sodeclick.local',
      password: '123456',
      gender: 'other',
      age: 25,
      location: 'Bangkok',
      lookingFor: 'all',
      bio: '',
      interests: '',
      status: 'online',
      coins: 200,
      vipStatus: false,
      verifiedBadge: false,
      emailVerified: true,
      phoneVerified: false,
      occupation: '',
      relationshipGoal: 'friend',
      framesOwned: ['F001'],
      activeFrame: '',
      createdAt: Date.now(),
    });
    writeJson(usersFile, users);
  }
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

function parseBody(req) {
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => resolve(raw));
  });
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
    :root{--bg:#f8fafc;--card:#fff;--text:#0f172a;--muted:#64748b;--line:#e5e7eb;--brand1:#60a5fa;--brand2:#f9a8d4}
    *{box-sizing:border-box}
    body{margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:var(--bg);color:var(--text)}
    .wrap{max-width:1100px;margin:4vh auto 0;padding:16px}
    .card{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:22px;box-shadow:0 10px 24px rgba(15,23,42,.06)}
    .title{margin:0 0 8px;font-size:28px;line-height:1.2}
    .muted{color:var(--muted)}
    .btn{display:inline-flex;align-items:center;justify-content:center;text-decoration:none;border:1px solid #d1d5db;background:#fff;padding:8px 12px;border-radius:10px;color:#111827;font-weight:700;cursor:pointer;transition:.15s ease}
    .btn:hover{transform:translateY(-1px);box-shadow:0 6px 14px rgba(15,23,42,.1)}
    .btn-primary{border:0;color:#fff;background:linear-gradient(135deg,var(--brand1),var(--brand2))}
    .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:10px}
    input,select,textarea{width:100%;border:1px solid #d1d5db;border-radius:10px;padding:10px;font:inherit;background:#fff}
    input:focus,select:focus,textarea:focus{outline:none;border-color:#93c5fd;box-shadow:0 0 0 3px rgba(147,197,253,.25)}
    .ok{border:1px solid #86efac;background:#f0fdf4;color:#166534;padding:10px;border-radius:10px}
    .err{border:1px solid #fecaca;background:#fef2f2;color:#991b1b;padding:10px;border-radius:10px}
    table{width:100%;border-collapse:collapse;font-size:14px}
    th,td{border-bottom:1px solid #eef2f7;padding:8px;text-align:left;vertical-align:top}
    th{background:#f8fafc;color:#334155;position:sticky;top:0}
    nav.card{position:sticky;top:10px;z-index:20}
    @media (max-width:700px){
      .wrap{margin:2vh auto 0;padding:10px}
      .card{padding:14px;border-radius:12px}
      .title{font-size:24px}
      .btn{padding:8px 10px;font-size:14px}
      nav.card{top:6px}
    }
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
        <div style="display:flex;gap:8px"><a class="btn" href="/security">Security</a><a class="btn" href="/board">Webboard</a><a class="btn" href="/vip">VIP</a><a class="btn" href="/wallet">Wallet</a><a class="btn" href="/match">Match</a><a class="btn" href="/">หน้าแรก</a><a class="btn" href="/logout">Logout</a></div>
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
      <section class="card" style="padding:12px;border-radius:12px"><strong>คนที่กดไลก์เรา</strong><div class="muted" style="margin-top:6px">${me.vipStatus ? (likedMe.length ? likedMe.map((x) => x.from).join(', ') : 'ยังไม่มี') : 'ฟีเจอร์นี้สำหรับ VIP'}</div></section>
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

function renderAdminLoginPage(error = '') {
  return htmlPage('Admin Login', `
    <main class="card" style="display:grid;gap:12px;max-width:520px">
      <div style="display:flex;justify-content:space-between;align-items:center"><h2 style="margin:0">Admin Login</h2><a class="btn" href="/">หน้าแรก</a></div>
      ${error ? `<div class="err">${error}</div>` : ''}
      <form method="POST" action="/admin/login" style="display:grid;gap:10px">
        <div><label>Username</label><input name="username" required /></div>
        <div><label>Password</label><input type="password" name="password" required /></div>
        <div style="display:flex;justify-content:flex-end"><button class="btn btn-primary" type="submit">เข้าสู่ระบบหลังบ้าน</button></div>
      </form>
    </main>
  `);
}

function adminShell(title, body) {
  return htmlPage(title, `
    <main class="card" style="display:grid;gap:12px">
      <nav class="card" style="padding:10px;border-radius:12px;display:flex;gap:8px;flex-wrap:wrap">
        <a class="btn" href="/admin/dashboard">Dashboard</a>
        <a class="btn" href="/admin/members">สมาชิก</a>
        <a class="btn" href="/admin/vip">VIP</a>
        <a class="btn" href="/admin/coins">เหรียญ</a>
        <a class="btn" href="/admin/frames">กรอบ</a>
        <a class="btn" href="/admin/reports">รายงาน</a>
        <a class="btn" href="/admin/threads">กระทู้</a>
        <a class="btn" href="/admin/logout">Logout</a>
      </nav>
      ${body}
    </main>
  `);
}

function renderAdminDashboard() {
  const users = readJson(usersFile);
  const vipCount = users.filter((u) => u.vipStatus).length;
  const tx = readJson(coinTxFile);
  const reports = readJson(reportsFile);
  const posts = readJson(boardPostsFile);
  return adminShell('Admin Dashboard', `
    <h2 style="margin:0">Admin Dashboard</h2>
    <section class="grid">
      <div class="card" style="padding:12px;border-radius:12px"><div class="muted">สมาชิกทั้งหมด</div><div style="font-size:28px;font-weight:800">${users.length}</div></div>
      <div class="card" style="padding:12px;border-radius:12px"><div class="muted">VIP Users</div><div style="font-size:28px;font-weight:800">${vipCount}</div></div>
      <div class="card" style="padding:12px;border-radius:12px"><div class="muted">Coin Transactions</div><div style="font-size:28px;font-weight:800">${tx.length}</div></div>
      <div class="card" style="padding:12px;border-radius:12px"><div class="muted">Report Users</div><div style="font-size:28px;font-weight:800">${reports.length}</div></div>
      <div class="card" style="padding:12px;border-radius:12px"><div class="muted">กระทู้ทั้งหมด</div><div style="font-size:28px;font-weight:800">${posts.length}</div></div>
    </section>
  `);
}

function renderAdminMembers() {
  const users = readJson(usersFile);
  const rows = users.map((u)=>`<tr><td>${u.username}</td><td>${u.email}</td><td>${u.vipStatus ? 'VIP':'Free'}</td><td>${u.coins||0}</td><td>${u.location||''}</td></tr>`).join('');
  return adminShell('จัดการสมาชิก', `<h2 style="margin:0">จัดการสมาชิก</h2><div style="overflow:auto"><table><thead><tr><th>Username</th><th>Email</th><th>Plan</th><th>Coins</th><th>Location</th></tr></thead><tbody>${rows||'<tr><td colspan="5">ไม่มีข้อมูล</td></tr>'}</tbody></table></div>`);
}

function renderAdminVip() {
  const users = readJson(usersFile).filter((u)=>u.vipStatus);
  const rows = users.map((u)=>`<tr><td>${u.username}</td><td>${u.email}</td><td>${u.vipUntil?new Date(u.vipUntil).toLocaleString('th-TH'):'-'}</td></tr>`).join('');
  return adminShell('จัดการ VIP', `<h2 style="margin:0">จัดการ VIP</h2><div style="overflow:auto"><table><thead><tr><th>Username</th><th>Email</th><th>หมดอายุ</th></tr></thead><tbody>${rows||'<tr><td colspan="3">ไม่มี VIP</td></tr>'}</tbody></table></div>`);
}

function renderAdminCoins() {
  const tx = readJson(coinTxFile).slice(-100).reverse();
  const rows = tx.map((t)=>`<tr><td>${new Date(t.at).toLocaleString('th-TH')}</td><td>${t.username}</td><td>${t.type}</td><td>${t.amount}</td><td>${t.note||''}</td></tr>`).join('');
  return adminShell('จัดการเหรียญ', `<h2 style="margin:0">จัดการเหรียญ</h2><div style="overflow:auto"><table><thead><tr><th>เวลา</th><th>User</th><th>Type</th><th>Amount</th><th>Note</th></tr></thead><tbody>${rows||'<tr><td colspan="5">ไม่มีรายการ</td></tr>'}</tbody></table></div>`);
}

function renderAdminFrames() {
  const tx = readJson(frameTxFile).slice(-100).reverse();
  const rows = tx.map((t)=>`<tr><td>${new Date(t.at).toLocaleString('th-TH')}</td><td>${t.username}</td><td>${t.type}</td><td>${t.frameId}</td><td>${t.price}</td></tr>`).join('');
  return adminShell('จัดการกรอบรูป', `<h2 style="margin:0">จัดการกรอบรูป</h2><div style="overflow:auto"><table><thead><tr><th>เวลา</th><th>User</th><th>Type</th><th>Frame</th><th>Price</th></tr></thead><tbody>${rows||'<tr><td colspan="5">ไม่มีรายการ</td></tr>'}</tbody></table></div>`);
}

function renderAdminReports() {
  const reports = readJson(reportsFile).slice(-100).reverse();
  const rows = reports.map((r)=>`<tr><td>${new Date(r.at).toLocaleString('th-TH')}</td><td>${r.reporter}</td><td>${r.target}</td><td>${r.reason}</td></tr>`).join('');
  return adminShell('จัดการรายงาน', `<h2 style="margin:0">จัดการรายงาน</h2><div style="overflow:auto"><table><thead><tr><th>เวลา</th><th>Reporter</th><th>Target</th><th>Reason</th></tr></thead><tbody>${rows||'<tr><td colspan="4">ไม่มีรายงาน</td></tr>'}</tbody></table></div>`);
}

function renderAdminThreads() {
  const posts = readJson(boardPostsFile).slice(-100).reverse();
  const rows = posts.map((p)=>`<tr><td>${new Date(p.createdAt).toLocaleString('th-TH')}</td><td>${p.author}</td><td>${p.title}</td><td>${p.category}</td><td>${p.likes||0}</td><td>${(p.comments||[]).length}</td><td>${p.reports||0}</td></tr>`).join('');
  return adminShell('จัดการกระทู้', `<h2 style="margin:0">จัดการกระทู้</h2><div style="overflow:auto"><table><thead><tr><th>เวลา</th><th>Author</th><th>Title</th><th>Category</th><th>Likes</th><th>Comments</th><th>Reports</th></tr></thead><tbody>${rows||'<tr><td colspan="7">ไม่มีกระทู้</td></tr>'}</tbody></table></div>`);
}

function getAdminSession(req) {
  const aid = parseCookies(req).aid;
  if (!aid) return null;
  return adminSessions.get(aid) || null;
}

function renderSecurityPage(me, info = '') {
  const privacy = me.privacy || { profileVisibility: 'public', messagePermission: 'match_only', showOnline: true };
  return htmlPage('Security & Privacy', `
    <main class="card" style="display:grid;gap:12px">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><h2 style="margin:0">Security & Privacy</h2><div style="display:flex;gap:8px"><a class="btn" href="/profile">โปรไฟล์</a><a class="btn" href="/match">Match</a></div></div>
      ${info ? `<div class="ok">${info}</div>` : ''}
      <section class="card" style="padding:12px;border-radius:12px">
        <strong>Selfie Verify (Demo)</strong>
        <p class="muted">ใช้สำหรับยืนยันตัวตนและแสดงป้าย verified</p>
        <form method="POST" action="/security/selfie-verify"><button class="btn btn-primary" type="submit">ยืนยันตัวตนด้วย Selfie</button></form>
      </section>
      <section class="card" style="padding:12px;border-radius:12px">
        <strong>Privacy Settings</strong>
        <form method="POST" action="/security/privacy" class="grid" style="margin-top:8px">
          <div><label>การมองเห็นโปรไฟล์</label><select name="profileVisibility"><option value="public" ${privacy.profileVisibility==='public'?'selected':''}>public</option><option value="members" ${privacy.profileVisibility==='members'?'selected':''}>members</option><option value="private" ${privacy.profileVisibility==='private'?'selected':''}>private</option></select></div>
          <div><label>สิทธิ์ส่งข้อความ</label><select name="messagePermission"><option value="all" ${privacy.messagePermission==='all'?'selected':''}>all</option><option value="match_only" ${privacy.messagePermission==='match_only'?'selected':''}>match_only</option><option value="none" ${privacy.messagePermission==='none'?'selected':''}>none</option></select></div>
          <div><label>แสดงสถานะออนไลน์</label><select name="showOnline"><option value="true" ${privacy.showOnline?'selected':''}>true</option><option value="false" ${!privacy.showOnline?'selected':''}>false</option></select></div>
          <div style="display:flex;align-items:flex-end"><button class="btn btn-primary" type="submit">บันทึก Privacy</button></div>
        </form>
      </section>
      <section class="card" style="padding:12px;border-radius:12px">
        <strong>Moderation Rules</strong>
        <ul class="muted">
          <li>Anti-spam: กันกดซ้ำถี่ภายในไม่กี่วินาที</li>
          <li>Content moderation: บล็อคคำเสี่ยงอัตโนมัติ</li>
          <li>Report/Block: ใช้ได้ในหน้าแชทและแมตช์</li>
        </ul>
      </section>
    </main>
  `);
}

function renderBoardPage(me, q = {}, info = '') {
  const category = (q.category || 'all').trim();
  const search = (q.search || '').trim().toLowerCase();
  const posts = readJson(boardPostsFile);

  const filtered = posts
    .filter((p) => (category === 'all' ? true : p.category === category))
    .filter((p) => (search ? (p.title + ' ' + p.content).toLowerCase().includes(search) : true))
    .sort((a, b) => (b.pinned === a.pinned ? b.createdAt - a.createdAt : (b.pinned ? 1 : -1)));

  const categories = ['general', 'dating', 'friend', 'tips', 'event'];

  const rows = filtered.map((p) => {
    const comments = Array.isArray(p.comments) ? p.comments : [];
    const commentsHtml = comments.map((c) => `<div class="muted" style="margin-top:6px">• ${c.by}: ${c.text}</div>`).join('');
    return `
      <article class="card" style="padding:12px;border-radius:12px">
        <div style="display:flex;justify-content:space-between;gap:8px;align-items:center;flex-wrap:wrap">
          <strong>${p.pinned ? '📌 ' : ''}${p.title}</strong>
          <span class="muted">${p.category}</span>
        </div>
        <div class="muted" style="margin-top:4px">โดย ${p.author} • ${new Date(p.createdAt).toLocaleString('th-TH')}</div>
        <div style="margin-top:8px">${p.content}</div>
        <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap">
          <form method="POST" action="/board/like"><input type="hidden" name="postId" value="${p.id}"/><button class="btn" type="submit">👍 Like (${p.likes || 0})</button></form>
          <form method="POST" action="/board/report"><input type="hidden" name="postId" value="${p.id}"/><button class="btn" type="submit">🚩 Report</button></form>
          ${me.username === 'admin' ? `<form method="POST" action="/board/pin"><input type="hidden" name="postId" value="${p.id}"/><button class="btn" type="submit">${p.pinned ? 'ยกเลิกปักหมุด' : 'ปักหมุด'}</button></form>` : ''}
        </div>
        <form method="POST" action="/board/comment" style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap">
          <input type="hidden" name="postId" value="${p.id}"/>
          <input name="comment" placeholder="คอมเมนต์..." style="flex:1"/>
          <button class="btn" type="submit">ส่งคอมเมนต์</button>
        </form>
        <div style="margin-top:8px">${commentsHtml}</div>
      </article>
    `;
  }).join('');

  const categoryOptions = categories.map((c) => `<option value="${c}" ${category === c ? 'selected' : ''}>${c}</option>`).join('');

  return htmlPage('Webboard', `
    <main class="card" style="display:grid;gap:12px">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap">
        <h2 style="margin:0">เว็บบอร์ด</h2>
        <div style="display:flex;gap:8px"><a class="btn" href="/profile">โปรไฟล์</a><a class="btn" href="/match">Match</a><a class="btn" href="/logout">Logout</a></div>
      </div>
      ${info ? `<div class="ok">${info}</div>` : ''}

      <section class="card" style="padding:12px;border-radius:12px">
        <form method="GET" action="/board" class="grid">
          <div><label>หมวดหมู่</label><select name="category"><option value="all">all</option>${categoryOptions}</select></div>
          <div><label>ค้นหา</label><input name="search" value="${q.search || ''}" placeholder="ค้นหากระทู้..."/></div>
          <div style="display:flex;align-items:flex-end"><button class="btn btn-primary" type="submit">ค้นหา</button></div>
        </form>
      </section>

      <section class="card" style="padding:12px;border-radius:12px">
        <strong>ตั้งกระทู้ใหม่</strong>
        <form method="POST" action="/board/new" style="display:grid;gap:8px;margin-top:8px">
          <div class="grid">
            <div><label>หัวข้อ</label><input name="title" required/></div>
            <div><label>หมวดหมู่</label><select name="category">${categoryOptions}</select></div>
          </div>
          <div><label>เนื้อหา</label><textarea name="content" rows="4" required></textarea></div>
          <div style="display:flex;justify-content:flex-end"><button class="btn btn-primary" type="submit">โพสต์กระทู้</button></div>
        </form>
      </section>

      <section style="display:grid;gap:10px">${rows || '<div class="muted">ยังไม่มีกระทู้</div>'}</section>
    </main>
  `);
}

function renderShopPage(me, info = '') {
  const catalog = [
    { id: 'F001', name: 'Sky Blue', price: 0 },
    { id: 'F002', name: 'Pink Glow', price: 30 },
    { id: 'F003', name: 'Neon Heart', price: 60 },
    { id: 'F004', name: 'Golden VIP', price: 120 },
  ];
  const owned = Array.isArray(me.framesOwned) ? me.framesOwned : [];
  const cards = catalog.map((f) => {
    const isOwned = owned.includes(f.id);
    const isActive = me.activeFrame === f.id;
    return `
      <div class="card" style="padding:12px;border-radius:12px">
        <strong>${f.name}</strong>
        <div class="muted" style="margin:6px 0">รหัส ${f.id} • ${f.price === 0 ? 'ฟรี' : f.price + ' coins'}</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          ${isOwned ? `<form method="POST" action="/shop/use"><input type="hidden" name="frameId" value="${f.id}"/><button class="btn" ${isActive ? 'disabled' : ''} type="submit">${isActive ? 'กำลังใช้งาน' : 'ใช้กรอบนี้'}</button></form>` : `<form method="POST" action="/shop/buy"><input type="hidden" name="frameId" value="${f.id}"/><input type="hidden" name="price" value="${f.price}"/><button class="btn btn-primary" type="submit">ซื้อ</button></form>`}
        </div>
      </div>
    `;
  }).join('');

  const tx = readJson(frameTxFile).filter((t) => t.username === me.username).slice(-30).reverse();
  const rows = tx.map((t) => `<tr><td>${new Date(t.at).toLocaleString('th-TH')}</td><td>${t.type}</td><td>${t.frameId}</td><td>${t.price}</td></tr>`).join('');

  return htmlPage('ร้านค้ากรอบโปรไฟล์', `
    <main class="card" style="display:grid;gap:12px">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap"><h2 style="margin:0">ร้านค้ากรอบโปรไฟล์</h2><div style="display:flex;gap:8px"><span class="ok" style="padding:8px 10px">Coins: ${me.coins || 0}</span><a class="btn" href="/profile">โปรไฟล์</a><a class="btn" href="/wallet">Wallet</a></div></div>
      ${info ? `<div class="ok">${info}</div>` : ''}
      <section class="card" style="padding:12px;border-radius:12px">
        <strong>กรอบที่ใช้งาน:</strong> ${me.activeFrame || 'ปิดการใช้กรอบ'}
        <form method="POST" action="/shop/disable" style="margin-top:8px"><button class="btn" type="submit">ปิดการใช้กรอบ</button></form>
      </section>
      <section class="grid">${cards}</section>
      <section class="card" style="padding:0;border-radius:12px;overflow:hidden">
        <div style="padding:12px"><strong>ประวัติซื้อกรอบ</strong></div>
        <div style="overflow:auto;padding:0 12px 12px"><table><thead><tr><th>เวลา</th><th>ประเภท</th><th>กรอบ</th><th>ราคา</th></tr></thead><tbody>${rows || '<tr><td colspan="4">ยังไม่มีรายการ</td></tr>'}</tbody></table></div>
      </section>
    </main>
  `);
}

function renderVipPage(me, info = '') {
  const plans = [
    { id: 'vip7', name: 'VIP 7 วัน', price: 99, days: 7 },
    { id: 'vip1m', name: 'VIP 1 เดือน', price: 299, days: 30 },
    { id: 'vip3m', name: 'VIP 3 เดือน', price: 699, days: 90 },
    { id: 'vip1y', name: 'VIP 1 ปี', price: 1990, days: 365 },
  ];

  const cards = plans.map((p) => `
    <form method="POST" action="/vip/subscribe" class="card" style="padding:12px;border-radius:12px">
      <input type="hidden" name="planId" value="${p.id}" />
      <input type="hidden" name="days" value="${p.days}" />
      <input type="hidden" name="price" value="${p.price}" />
      <strong>${p.name}</strong>
      <div class="muted" style="margin:6px 0">ราคา ${p.price} บาท • ใช้งาน ${p.days} วัน</div>
      <button class="btn btn-primary" type="submit">สมัครแพ็กเกจนี้</button>
    </form>
  `).join('');

  const vipUntilText = me.vipUntil ? new Date(me.vipUntil).toLocaleString('th-TH') : '-';

  return htmlPage('VIP', `
    <main class="card" style="display:grid;gap:12px">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap">
        <h2 style="margin:0">VIP Package</h2>
        <div style="display:flex;gap:8px"><a class="btn" href="/match">Match</a><a class="btn" href="/wallet">Wallet</a></div>
      </div>
      ${info ? `<div class="ok">${info}</div>` : ''}
      <section class="card" style="padding:12px;border-radius:12px">
        <div><strong>สถานะปัจจุบัน:</strong> ${me.vipStatus ? 'VIP ✅' : 'Free'}</div>
        <div class="muted" style="margin-top:4px">VIP หมดอายุ: ${vipUntilText}</div>
        <div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap">
          <span class="ok" style="padding:4px 8px">ดูว่าใครไลก์เรา</span>
          <span class="ok" style="padding:4px 8px">Like ไม่จำกัด</span>
          <span class="ok" style="padding:4px 8px">Advanced Filter</span>
          <span class="ok" style="padding:4px 8px">Badge VIP</span>
        </div>
      </section>
      <section class="grid">${cards}</section>
    </main>
  `);
}

function renderWalletPage(me, info = '') {
  const tx = readJson(coinTxFile).filter((t) => t.username === me.username).slice(-50).reverse();
  const rows = tx.map((t) => `<tr><td>${new Date(t.at).toLocaleString('th-TH')}</td><td>${t.type}</td><td>${t.amount > 0 ? '+' + t.amount : t.amount}</td><td>${t.note || ''}</td></tr>`).join('');

  const packages = [
    { id: 'small', coins: 100, price: 29 },
    { id: 'medium', coins: 500, price: 99 },
    { id: 'large', coins: 1200, price: 199 },
    { id: 'mega', coins: 3000, price: 399 },
  ];

  const packCards = packages.map((p) => `
    <form method="POST" action="/wallet/topup" class="card" style="padding:12px;border-radius:12px">
      <input type="hidden" name="packageId" value="${p.id}" />
      <input type="hidden" name="coins" value="${p.coins}" />
      <input type="hidden" name="price" value="${p.price}" />
      <strong>${p.id.toUpperCase()}</strong>
      <div class="muted" style="margin:6px 0">${p.coins} coins • ${p.price} บาท</div>
      <button class="btn btn-primary" type="submit">เติมแพ็กนี้</button>
    </form>
  `).join('');

  return htmlPage('Wallet / Coins', `
    <main class="card" style="display:grid;gap:12px">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px">
        <h2 style="margin:0">Wallet / Coins</h2>
        <div style="display:flex;gap:8px"><span class="ok" style="padding:8px 10px">เหรียญคงเหลือ: ${me.coins || 0}</span><a class="btn" href="/shop">Shop</a><a class="btn" href="/profile">โปรไฟล์</a><a class="btn" href="/match">Match</a></div>
      </div>
      ${info ? `<div class="ok">${info}</div>` : ''}
      <section><strong>แพ็กเกจเหรียญ</strong><div class="grid" style="margin-top:8px">${packCards}</div></section>
      <section class="card" style="padding:0;border-radius:12px;overflow:hidden">
        <div style="padding:12px"><strong>ประวัติธุรกรรม</strong></div>
        <div style="overflow:auto;padding:0 12px 12px"><table><thead><tr><th>เวลา</th><th>ประเภท</th><th>จำนวน</th><th>หมายเหตุ</th></tr></thead><tbody>${rows || '<tr><td colspan="4">ยังไม่มีรายการ</td></tr>'}</tbody></table></div>
      </section>
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

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${port}`);

  const deps = {
    parseForm,
    parseBody,
    parseCookies,
    readJson,
    writeJson,
    usersFile,
    pendingFile,
    likesFile,
    matchesFile,
    coinTxFile,
    userSessions,
    renderRegisterPage: registerPage,
    renderVerifyPage: verifyPage,
    renderLoginPage: loginPage,
    forgotPasswordPage,
    profilePage,
    renderMatchPage,
    renderWalletPage,
    renderVipPage,
    renderShopPage,
    frameTxFile,
    getSessionUser,
    createUserId: () => `USR${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
  };

  if (await handleAuthRoutes({ req, res, url, deps })) return;
  if (await handleProfileRoutes({ req, res, url, deps })) return;
  if (await handleMatchRoutes({ req, res, url, deps })) return;
  if (await handleCommerceRoutes({ req, res, url, deps })) return;

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
        framesOwned: ['F001'],
        activeFrame: '',
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
      const users = readJson(usersFile);
      const meIdx = users.findIndex((u) => u.username === me.username);
      const today = new Date().toISOString().slice(0, 10);
      if (meIdx >= 0) {
        users[meIdx].dailyLikeDate = users[meIdx].dailyLikeDate || today;
        users[meIdx].dailyLikeCount = users[meIdx].dailyLikeCount || 0;
        if (users[meIdx].dailyLikeDate !== today) {
          users[meIdx].dailyLikeDate = today;
          users[meIdx].dailyLikeCount = 0;
        }
        if (!users[meIdx].vipStatus && (type === 'like' || type === 'super_like') && users[meIdx].dailyLikeCount >= 30) {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(renderMatchPage(users[meIdx], {}, 'Free จำกัด Like วันละ 30 ครั้ง กรุณาอัปเกรด VIP'));
          return;
        }
        if (type === 'like' || type === 'super_like') users[meIdx].dailyLikeCount += 1;
        writeJson(usersFile, users);
      }

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
      const boostCost = 30;
      if ((users[idx].coins || 0) < boostCost) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(renderMatchPage(users[idx] || me, {}, 'เหรียญไม่พอสำหรับ Boost (ต้องใช้ 30)'));
        return;
      }
      users[idx].coins = (users[idx].coins || 0) - boostCost;
      users[idx].boostUntil = Date.now() + 30 * 60 * 1000;
      writeJson(usersFile, users);
      const tx = readJson(coinTxFile);
      tx.push({ id: `CTX${Date.now()}`, username: me.username, type: 'boost', amount: -boostCost, note: 'Boost Profile 30 นาที', at: Date.now() });
      writeJson(coinTxFile, tx);
    }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(renderMatchPage(users[idx] || me, {}, 'Boost โปรไฟล์แล้ว (30 นาที)'));
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
      if (isSpamAction(`chat:send:${me.username}`, 1200)) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(renderChatPage(me, matchId, 'ส่งข้อความเร็วเกินไป กรุณารอสักครู่'));
        return;
      }
      if (containsBlockedWords(txt)) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(renderChatPage(me, matchId, 'ข้อความมีเนื้อหาที่ไม่เหมาะสม'));
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
      const tx = readJson(coinTxFile);
      tx.push({ id: `CTX${Date.now()}`, username: me.username, type: 'gift', amount: -price, note: `ส่งของขวัญ ${giftId}`, at: Date.now() });
      writeJson(coinTxFile, tx);
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

  if (url.pathname === '/vip' && req.method === 'GET') {
    const me = getSessionUser(req);
    if (!me) {
      res.writeHead(302, { Location: '/login' });
      res.end();
      return;
    }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(renderVipPage(me));
    return;
  }

  if (url.pathname === '/vip/subscribe' && req.method === 'POST') {
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
      const days = Number(body.days || 0);
      const price = Number(body.price || 0);
      const users = readJson(usersFile);
      const idx = users.findIndex((u) => u.username === me.username);
      if (idx < 0 || days <= 0) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(renderVipPage(me, 'แพ็กเกจไม่ถูกต้อง'));
        return;
      }
      users[idx].vipStatus = true;
      users[idx].vipUntil = Date.now() + days * 24 * 60 * 60 * 1000;
      users[idx].updatedAt = Date.now();
      writeJson(usersFile, users);
      const tx = readJson(coinTxFile);
      tx.push({ id: `CTX${Date.now()}`, username: me.username, type: 'vip_subscribe', amount: 0, note: `สมัคร VIP ${days} วัน ราคา ${price} บาท`, at: Date.now() });
      writeJson(coinTxFile, tx);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(renderVipPage(users[idx], 'สมัคร VIP สำเร็จ'));
    });
    return;
  }

  if (url.pathname === '/shop' && req.method === 'GET') {
    const me = getSessionUser(req);
    if (!me) {
      res.writeHead(302, { Location: '/login' });
      res.end();
      return;
    }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(renderShopPage(me));
    return;
  }

  if (url.pathname === '/shop/buy' && req.method === 'POST') {
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
      const frameId = String(body.frameId || '').trim();
      const price = Number(body.price || 0);
      const users = readJson(usersFile);
      const idx = users.findIndex((u) => u.username === me.username);
      if (idx < 0 || !frameId) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(renderShopPage(me, 'ข้อมูลไม่ถูกต้อง'));
        return;
      }
      users[idx].framesOwned = Array.isArray(users[idx].framesOwned) ? users[idx].framesOwned : ['F001'];
      if (users[idx].framesOwned.includes(frameId)) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(renderShopPage(users[idx], 'คุณซื้อกรอบนี้แล้ว'));
        return;
      }
      if ((users[idx].coins || 0) < price) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(renderShopPage(users[idx], 'เหรียญไม่พอ'));
        return;
      }
      users[idx].coins = (users[idx].coins || 0) - price;
      users[idx].framesOwned.push(frameId);
      users[idx].updatedAt = Date.now();
      writeJson(usersFile, users);
      const tx = readJson(coinTxFile);
      tx.push({ id: `CTX${Date.now()}`, username: me.username, type: 'buy_frame', amount: -price, note: `ซื้อกรอบ ${frameId}`, at: Date.now() });
      writeJson(coinTxFile, tx);
      const ftx = readJson(frameTxFile);
      ftx.push({ id: `FTX${Date.now()}`, username: me.username, type: 'buy', frameId, price, at: Date.now() });
      writeJson(frameTxFile, ftx);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(renderShopPage(users[idx], `ซื้อกรอบ ${frameId} สำเร็จ`));
    });
    return;
  }

  if (url.pathname === '/shop/use' && req.method === 'POST') {
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
      const frameId = String(body.frameId || '').trim();
      const users = readJson(usersFile);
      const idx = users.findIndex((u) => u.username === me.username);
      if (idx < 0) {
        res.writeHead(302, { Location: '/login' });
        res.end();
        return;
      }
      users[idx].framesOwned = Array.isArray(users[idx].framesOwned) ? users[idx].framesOwned : ['F001'];
      if (!users[idx].framesOwned.includes(frameId)) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(renderShopPage(users[idx], 'คุณยังไม่ได้ซื้อกรอบนี้'));
        return;
      }
      users[idx].activeFrame = frameId;
      users[idx].updatedAt = Date.now();
      writeJson(usersFile, users);
      const ftx = readJson(frameTxFile);
      ftx.push({ id: `FTX${Date.now()}`, username: me.username, type: 'use', frameId, price: 0, at: Date.now() });
      writeJson(frameTxFile, ftx);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(renderShopPage(users[idx], `เปลี่ยนมาใช้กรอบ ${frameId} แล้ว`));
    });
    return;
  }

  if (url.pathname === '/shop/disable' && req.method === 'POST') {
    const me = getSessionUser(req);
    if (!me) {
      res.writeHead(302, { Location: '/login' });
      res.end();
      return;
    }
    const users = readJson(usersFile);
    const idx = users.findIndex((u) => u.username === me.username);
    if (idx >= 0) {
      users[idx].activeFrame = '';
      users[idx].updatedAt = Date.now();
      writeJson(usersFile, users);
      const ftx = readJson(frameTxFile);
      ftx.push({ id: `FTX${Date.now()}`, username: me.username, type: 'disable', frameId: '-', price: 0, at: Date.now() });
      writeJson(frameTxFile, ftx);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(renderShopPage(users[idx], 'ปิดการใช้กรอบแล้ว'));
      return;
    }
    res.writeHead(302, { Location: '/login' });
    res.end();
    return;
  }

  if (url.pathname === '/admin/login' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(renderAdminLoginPage());
    return;
  }

  if (url.pathname === '/admin/login' && req.method === 'POST') {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      const body = parseForm(raw);
      const username = String(body.username || '').trim();
      const password = String(body.password || '').trim();
      if (username === 'admin' && password === '123456') {
        const aid = crypto.randomBytes(24).toString('hex');
        adminSessions.set(aid, { username: 'admin', role: 'admin', at: Date.now() });
        res.writeHead(302, { Location: '/admin/dashboard', 'Set-Cookie': `aid=${aid}; Path=/; HttpOnly; SameSite=Lax; Max-Age=28800` });
        res.end();
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(renderAdminLoginPage('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง'));
    });
    return;
  }

  if (url.pathname === '/admin/logout' && req.method === 'GET') {
    const aid = parseCookies(req).aid;
    if (aid) adminSessions.delete(aid);
    res.writeHead(302, { Location: '/admin/login', 'Set-Cookie': 'aid=; Path=/; HttpOnly; Max-Age=0' });
    res.end();
    return;
  }

  if (url.pathname.startsWith('/admin/')) {
    const admin = getAdminSession(req);
    if (!admin) {
      res.writeHead(302, { Location: '/admin/login' });
      res.end();
      return;
    }

    if (url.pathname === '/admin/dashboard') { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(renderAdminDashboard()); return; }
    if (url.pathname === '/admin/members') { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(renderAdminMembers()); return; }
    if (url.pathname === '/admin/vip') { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(renderAdminVip()); return; }
    if (url.pathname === '/admin/coins') { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(renderAdminCoins()); return; }
    if (url.pathname === '/admin/frames') { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(renderAdminFrames()); return; }
    if (url.pathname === '/admin/reports') { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(renderAdminReports()); return; }
    if (url.pathname === '/admin/threads') { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(renderAdminThreads()); return; }
  }

  if (url.pathname === '/security' && req.method === 'GET') {
    const me = getSessionUser(req);
    if (!me) {
      res.writeHead(302, { Location: '/login' });
      res.end();
      return;
    }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(renderSecurityPage(me));
    return;
  }

  if (url.pathname === '/security/selfie-verify' && req.method === 'POST') {
    const me = getSessionUser(req);
    if (!me) {
      res.writeHead(302, { Location: '/login' });
      res.end();
      return;
    }
    const users = readJson(usersFile);
    const idx = users.findIndex((u) => u.username === me.username);
    if (idx >= 0) {
      users[idx].verifiedBadge = true;
      users[idx].photoVerified = true;
      users[idx].updatedAt = Date.now();
      writeJson(usersFile, users);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(renderSecurityPage(users[idx], 'ยืนยันตัวตนด้วย Selfie สำเร็จ (demo)'));
      return;
    }
    res.writeHead(302, { Location: '/login' });
    res.end();
    return;
  }

  if (url.pathname === '/security/privacy' && req.method === 'POST') {
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
      const users = readJson(usersFile);
      const idx = users.findIndex((u) => u.username === me.username);
      if (idx >= 0) {
        users[idx].privacy = {
          profileVisibility: ['public', 'members', 'private'].includes(body.profileVisibility) ? body.profileVisibility : 'public',
          messagePermission: ['all', 'match_only', 'none'].includes(body.messagePermission) ? body.messagePermission : 'match_only',
          showOnline: String(body.showOnline) === 'true',
        };
        users[idx].updatedAt = Date.now();
        writeJson(usersFile, users);
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(renderSecurityPage(users[idx], 'บันทึก Privacy Settings แล้ว'));
        return;
      }
      res.writeHead(302, { Location: '/login' });
      res.end();
    });
    return;
  }

  if (url.pathname === '/board' && req.method === 'GET') {
    const me = getSessionUser(req);
    if (!me) {
      res.writeHead(302, { Location: '/login' });
      res.end();
      return;
    }
    const query = Object.fromEntries(url.searchParams.entries());
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(renderBoardPage(me, query));
    return;
  }

  if (url.pathname === '/board/new' && req.method === 'POST') {
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
      const title = String(body.title || '').trim();
      const content = String(body.content || '').trim();
      const category = String(body.category || 'general').trim();
      if (!title || !content) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(renderBoardPage(me, {}, 'กรอกหัวข้อและเนื้อหาให้ครบ'));
        return;
      }
      if (isSpamAction(`board:new:${me.username}`, 3000)) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(renderBoardPage(me, {}, 'คุณโพสต์ถี่เกินไป กรุณารอสักครู่'));
        return;
      }
      if (containsBlockedWords(title) || containsBlockedWords(content)) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(renderBoardPage(me, {}, 'เนื้อหามีคำที่ไม่เหมาะสม ระบบไม่อนุญาตให้โพสต์'));
        return;
      }
      const posts = readJson(boardPostsFile);
      posts.push({ id: `P${Date.now()}`, author: me.username, title, content, category, likes: 0, comments: [], reports: 0, pinned: false, createdAt: Date.now() });
      writeJson(boardPostsFile, posts);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(renderBoardPage(me, {}, 'โพสต์กระทู้สำเร็จ'));
    });
    return;
  }

  if (url.pathname === '/board/comment' && req.method === 'POST') {
    const me = getSessionUser(req);
    if (!me) { res.writeHead(302, { Location: '/login' }); res.end(); return; }
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      const body = parseForm(raw);
      const postId = String(body.postId || '').trim();
      const comment = String(body.comment || '').trim();
      const posts = readJson(boardPostsFile);
      const idx = posts.findIndex((p) => p.id === postId);
      if (idx >= 0 && comment) {
        if (isSpamAction(`board:comment:${me.username}`, 2000) || containsBlockedWords(comment)) {
          res.writeHead(302, { Location: '/board' });
          res.end();
          return;
        }
        posts[idx].comments = Array.isArray(posts[idx].comments) ? posts[idx].comments : [];
        posts[idx].comments.push({ by: me.username, text: comment, at: Date.now() });
        writeJson(boardPostsFile, posts);
      }
      res.writeHead(302, { Location: '/board' });
      res.end();
    });
    return;
  }

  if (url.pathname === '/board/like' && req.method === 'POST') {
    const me = getSessionUser(req);
    if (!me) { res.writeHead(302, { Location: '/login' }); res.end(); return; }
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      const body = parseForm(raw);
      const postId = String(body.postId || '').trim();
      const posts = readJson(boardPostsFile);
      const idx = posts.findIndex((p) => p.id === postId);
      if (idx >= 0) {
        posts[idx].likes = (posts[idx].likes || 0) + 1;
        writeJson(boardPostsFile, posts);
      }
      res.writeHead(302, { Location: '/board' });
      res.end();
    });
    return;
  }

  if (url.pathname === '/board/report' && req.method === 'POST') {
    const me = getSessionUser(req);
    if (!me) { res.writeHead(302, { Location: '/login' }); res.end(); return; }
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      const body = parseForm(raw);
      const postId = String(body.postId || '').trim();
      const posts = readJson(boardPostsFile);
      const idx = posts.findIndex((p) => p.id === postId);
      if (idx >= 0) {
        posts[idx].reports = (posts[idx].reports || 0) + 1;
        writeJson(boardPostsFile, posts);
      }
      res.writeHead(302, { Location: '/board' });
      res.end();
    });
    return;
  }

  if (url.pathname === '/board/pin' && req.method === 'POST') {
    const me = getSessionUser(req);
    if (!me || me.username !== 'admin') { res.writeHead(302, { Location: '/board' }); res.end(); return; }
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      const body = parseForm(raw);
      const postId = String(body.postId || '').trim();
      const posts = readJson(boardPostsFile);
      const idx = posts.findIndex((p) => p.id === postId);
      if (idx >= 0) {
        posts[idx].pinned = !posts[idx].pinned;
        writeJson(boardPostsFile, posts);
      }
      res.writeHead(302, { Location: '/board' });
      res.end();
    });
    return;
  }

  if (url.pathname === '/wallet' && req.method === 'GET') {
    const me = getSessionUser(req);
    if (!me) {
      res.writeHead(302, { Location: '/login' });
      res.end();
      return;
    }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(renderWalletPage(me));
    return;
  }

  if (url.pathname === '/wallet/topup' && req.method === 'POST') {
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
      const addCoins = Number(body.coins || 0);
      const price = Number(body.price || 0);
      const users = readJson(usersFile);
      const idx = users.findIndex((u) => u.username === me.username);
      if (idx < 0 || addCoins <= 0) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(renderWalletPage(me, 'ข้อมูลแพ็กเกจไม่ถูกต้อง'));
        return;
      }
      users[idx].coins = (users[idx].coins || 0) + addCoins;
      users[idx].updatedAt = Date.now();
      writeJson(usersFile, users);

      const tx = readJson(coinTxFile);
      tx.push({ id: `CTX${Date.now()}`, username: me.username, type: 'topup', amount: addCoins, note: `เติมเหรียญราคา ${price} บาท`, at: Date.now() });
      writeJson(coinTxFile, tx);

      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(renderWalletPage(users[idx], `เติมเหรียญสำเร็จ +${addCoins}`));
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(htmlPage('404', '<main class="card"><h2>404 - Not Found</h2></main>'));
});

server.listen(port, () => {
  console.log(`SodeClick V2 listening on ${port}`);
});
