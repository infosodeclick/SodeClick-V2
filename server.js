const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { handleAuthRoutes } = require('./modules/auth/routes');
const { handleProfileRoutes } = require('./modules/profile/routes');
const { handleMatchRoutes } = require('./modules/match/routes');
const { handleCommerceRoutes } = require('./modules/commerce/routes');
const { handleChatRoutes } = require('./modules/chat/routes');
const { handleBoardRoutes } = require('./modules/board/routes');
const { handleSecurityAdminRoutes } = require('./modules/security-admin/routes');

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
const storeItemsFile = path.join(dataDir, 'store-items.json');
const adminUsersFile = path.join(dataDir, 'admin-users.json');
const memberUsersFile = path.join(dataDir, 'member-users.json');

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
  const bad = ['à¸žà¸™à¸±à¸™', 'à¸¢à¸²à¹€à¸ªà¸žà¸•à¸´à¸”', 'à¸‚à¸²à¸¢à¸šà¸£à¸´à¸à¸²à¸£', 'scam', 'à¹‚à¸à¸‡'];
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
  if (!fs.existsSync(adminUsersFile)) fs.writeFileSync(adminUsersFile, '[]', 'utf8');
  if (!fs.existsSync(memberUsersFile)) fs.writeFileSync(memberUsersFile, '[]', 'utf8');

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
      role: 'member',
      createdAt: Date.now(),
    });
  }

  const hasAdminUser = users.some((u) => u.username === 'admin');
  if (!hasAdminUser) {
    users.push({
      userId: 'USRADMIN1',
      username: 'admin',
      displayName: 'Administrator',
      email: 'admin@sodeclick.local',
      password: '123456',
      gender: 'other',
      age: 30,
      location: 'Bangkok',
      lookingFor: 'all',
      bio: 'System admin',
      interests: '',
      status: 'online',
      coins: 0,
      vipStatus: false,
      verifiedBadge: true,
      emailVerified: true,
      phoneVerified: false,
      occupation: 'Admin',
      relationshipGoal: 'friend',
      framesOwned: ['F001'],
      activeFrame: '',
      role: 'admin',
      createdAt: Date.now(),
    });
  }

  // normalize role and sync split storage files every startup
  users.forEach((u) => {
    if (!u.role) u.role = u.username === 'admin' ? 'admin' : 'member';
  });
  writeJson(usersFile, users);

  const storeItems = readJson(storeItemsFile);
  if (!Array.isArray(storeItems) || storeItems.length === 0) {
    writeJson(storeItemsFile, [
      { id: 'S001', name: 'Sky Blue Frame', type: 'frame', price: 0, active: true },
      { id: 'S002', name: 'Pink Glow Frame', type: 'frame', price: 30, active: true },
      { id: 'S003', name: 'Neon Heart Frame', type: 'frame', price: 60, active: true },
      { id: 'S004', name: 'Golden VIP Frame', type: 'frame', price: 120, active: true },
      { id: 'S005', name: 'Royal Purple Frame', type: 'frame', price: 90, active: true },
      { id: 'S006', name: 'Emerald Shine Frame', type: 'frame', price: 75, active: true },
      { id: 'S007', name: 'Fire Red Frame', type: 'frame', price: 55, active: true },
      { id: 'S008', name: 'Ocean Wave Frame', type: 'frame', price: 45, active: true },
      { id: 'S009', name: 'Dark Mode Frame', type: 'frame', price: 40, active: true },
      { id: 'S010', name: 'Diamond Elite Frame', type: 'frame', price: 150, active: true },
    ]);
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

  // keep user storage organized: split admin/member snapshots from users.json
  if (file === usersFile && Array.isArray(payload)) {
    const admins = payload.filter((u) => u && (u.role === 'admin' || u.username === 'admin'));
    const members = payload.filter((u) => u && !(u.role === 'admin' || u.username === 'admin'));
    fs.writeFileSync(adminUsersFile, JSON.stringify(admins, null, 2), 'utf8');
    fs.writeFileSync(memberUsersFile, JSON.stringify(members, null, 2), 'utf8');
  }
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
    :root{--bg:#fff7fb;--card:#ffffff;--text:#0f172a;--muted:#6b7280;--line:#f3dce8;--brand1:#f9a8d4;--brand2:#fbcfe8}
    *{box-sizing:border-box}
    body{margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:linear-gradient(180deg,#fff7fb 0%,#ffeef7 45%,#fff4fa 100%);color:var(--text)}
    .wrap{max-width:1100px;margin:3vh auto 0;padding:16px}
    .card{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:20px;box-shadow:0 10px 24px rgba(15,23,42,.06)}
    .title{margin:0 0 8px;font-size:28px;line-height:1.2;letter-spacing:-.2px}
    .muted{color:var(--muted);line-height:1.5}
    .btn{display:inline-flex;align-items:center;justify-content:center;text-decoration:none;border:1px solid #d1d5db;background:#fff;padding:8px 12px;border-radius:10px;color:#111827;font-weight:700;cursor:pointer;transition:.15s ease;white-space:nowrap}
    .btn:hover{transform:translateY(-1px);box-shadow:0 6px 14px rgba(15,23,42,.1)}
    .toolbar{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
    .btn-primary{border:0;color:#fff;background:linear-gradient(135deg,var(--brand1),var(--brand2))}
    .btn-menu{background:#eef2ff;border-color:#c7d2fe;color:#3730a3}
    .btn-success{background:#ecfdf3;border-color:#86efac;color:#166534}
    .btn-danger{background:#fef2f2;border-color:#fecaca;color:#991b1b}
    .btn-warn{background:#fff7ed;border-color:#fdba74;color:#9a3412}
    .menu-dropdown{position:relative;display:inline-block}
    .menu-dropdown > summary{list-style:none}
    .menu-dropdown > summary::-webkit-details-marker{display:none}
    .menu-panel{position:absolute;right:0;top:calc(100% + 8px);min-width:220px;background:#fff;border:1px solid var(--line);border-radius:12px;padding:8px;box-shadow:0 12px 24px rgba(15,23,42,.12);display:grid;gap:6px;z-index:50}
    .menu-panel .btn{justify-content:flex-start}
    @media (max-width:700px){.menu-panel{right:auto;left:0;min-width:190px}}
    .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:10px}
    input,select,textarea{width:100%;border:1px solid #d1d5db;border-radius:10px;padding:10px;font:inherit;background:#fff}
    label{display:block;margin-bottom:6px;font-weight:600;color:#334155}
    input,select,textarea{margin-bottom:2px}
    input:focus,select:focus,textarea:focus{outline:none;border-color:#93c5fd;box-shadow:0 0 0 3px rgba(147,197,253,.25)}
    main.card{gap:14px !important}
    section.card{padding:14px !important;border-radius:12px !important}
    .ok{border:1px solid #86efac;background:#f0fdf4;color:#166534;padding:10px;border-radius:10px}
    .err{border:1px solid #fecaca;background:#fef2f2;color:#991b1b;padding:10px;border-radius:10px}
    .chip{display:inline-flex;align-items:center;padding:4px 8px;border-radius:999px;font-size:12px;font-weight:700}
    .chip-ok{background:#ecfdf3;color:#166534;border:1px solid #86efac}
    .chip-no{background:#fef2f2;color:#991b1b;border:1px solid #fecaca}
    table{width:100%;border-collapse:collapse;font-size:14px;background:#fff;border-radius:10px;overflow:hidden}
    th,td{border-bottom:1px solid #eef2f7;padding:10px;text-align:left;vertical-align:top}
    tr:hover td{background:#fafcff}
    th{background:#f8fafc;color:#334155;position:sticky;top:0}
    nav.card{position:sticky;top:10px;z-index:20}
    @media (max-width:700px){
      .wrap{margin:1.5vh auto 0;padding:10px}
      .card{padding:12px;border-radius:12px}
      .title{font-size:24px}
      .btn{padding:8px 10px;font-size:14px}
      .toolbar{gap:6px}
      .grid{grid-template-columns:1fr}
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
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
          <a class="btn btn-primary" href="/register">à¸ªà¸¡à¸±à¸„à¸£à¸ªà¸¡à¸²à¸Šà¸´à¸</a>
          <a class="btn btn-menu" href="/login">à¹€à¸‚à¹‰à¸²à¸ªà¸¹à¹ˆà¸£à¸°à¸šà¸š</a>
        </div>
      </nav>
      <section class="card" style="padding:16px;border-radius:12px;display:grid;gap:10px;justify-items:center;text-align:center">
        <div style="font-size:72px;line-height:1">ðŸ§¸</div>
        <h1 class="title">SodeClick V2</h1>
        <p class="muted">Phase A à¹€à¸£à¸´à¹ˆà¸¡à¹à¸¥à¹‰à¸§: à¸£à¸°à¸šà¸šà¸ªà¸¡à¸²à¸Šà¸´à¸ + à¹‚à¸›à¸£à¹„à¸Ÿà¸¥à¹Œ (Responsive / Horizontal Navbar / Card UI)</p>
      </section>
    </main>
  `);
}

function registerPage(error = '', info = '') {
  return htmlPage('à¸ªà¸¡à¸±à¸„à¸£à¸ªà¸¡à¸²à¸Šà¸´à¸', `
    <main class="card" style="display:grid;gap:12px">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><h2 style="margin:0">à¸ªà¸¡à¸±à¸„à¸£à¸ªà¸¡à¸²à¸Šà¸´à¸</h2><a class="btn" href="/">à¸à¸¥à¸±à¸šà¸«à¸™à¹‰à¸²à¹à¸£à¸</a></div>
      ${error ? `<div class="err">${error}</div>` : ''}
      ${info ? `<div class="ok">${info}</div>` : ''}
      <form method="POST" action="/register" style="display:grid;gap:10px">
        <div class="grid">
          <div><label>Username</label><input name="username" required /></div>
          <div><label>Email</label><input type="email" name="email" required /></div>
          <div><label>Password</label><input type="password" name="password" required /></div>
          <div><label>à¹€à¸žà¸¨</label><select name="gender"><option value="male">à¸Šà¸²à¸¢</option><option value="female">à¸«à¸à¸´à¸‡</option><option value="other">à¸­à¸·à¹ˆà¸™à¹†</option></select></div>
          <div><label>à¸­à¸²à¸¢à¸¸</label><input type="number" min="18" max="99" name="age" required /></div>
          <div><label>à¸ˆà¸±à¸‡à¸«à¸§à¸±à¸”</label><select name="province" required>
            <option value="à¸à¸£à¸¸à¸‡à¹€à¸—à¸žà¸¡à¸«à¸²à¸™à¸„à¸£">à¸à¸£à¸¸à¸‡à¹€à¸—à¸žà¸¡à¸«à¸²à¸™à¸„à¸£</option><option value="à¸™à¸™à¸—à¸šà¸¸à¸£à¸µ">à¸™à¸™à¸—à¸šà¸¸à¸£à¸µ</option><option value="à¸›à¸—à¸¸à¸¡à¸˜à¸²à¸™à¸µ">à¸›à¸—à¸¸à¸¡à¸˜à¸²à¸™à¸µ</option><option value="à¸ªà¸¡à¸¸à¸—à¸£à¸›à¸£à¸²à¸à¸²à¸£">à¸ªà¸¡à¸¸à¸—à¸£à¸›à¸£à¸²à¸à¸²à¸£</option>
            <option value="à¹€à¸Šà¸µà¸¢à¸‡à¹ƒà¸«à¸¡à¹ˆ">à¹€à¸Šà¸µà¸¢à¸‡à¹ƒà¸«à¸¡à¹ˆ</option><option value="à¹€à¸Šà¸µà¸¢à¸‡à¸£à¸²à¸¢">à¹€à¸Šà¸µà¸¢à¸‡à¸£à¸²à¸¢</option><option value="à¸‚à¸­à¸™à¹à¸à¹ˆà¸™">à¸‚à¸­à¸™à¹à¸à¹ˆà¸™</option><option value="à¸­à¸¸à¸”à¸£à¸˜à¸²à¸™à¸µ">à¸­à¸¸à¸”à¸£à¸˜à¸²à¸™à¸µ</option>
            <option value="à¸™à¸„à¸£à¸£à¸²à¸Šà¸ªà¸µà¸¡à¸²">à¸™à¸„à¸£à¸£à¸²à¸Šà¸ªà¸µà¸¡à¸²</option><option value="à¸Šà¸¥à¸šà¸¸à¸£à¸µ">à¸Šà¸¥à¸šà¸¸à¸£à¸µ</option><option value="à¸£à¸°à¸¢à¸­à¸‡">à¸£à¸°à¸¢à¸­à¸‡</option><option value="à¸ à¸¹à¹€à¸à¹‡à¸•">à¸ à¸¹à¹€à¸à¹‡à¸•</option>
            <option value="à¸ªà¸‡à¸‚à¸¥à¸²">à¸ªà¸‡à¸‚à¸¥à¸²</option><option value="à¸ªà¸¸à¸£à¸²à¸©à¸Žà¸£à¹Œà¸˜à¸²à¸™à¸µ">à¸ªà¸¸à¸£à¸²à¸©à¸Žà¸£à¹Œà¸˜à¸²à¸™à¸µ</option><option value="à¸™à¸„à¸£à¸¨à¸£à¸µà¸˜à¸£à¸£à¸¡à¸£à¸²à¸Š">à¸™à¸„à¸£à¸¨à¸£à¸µà¸˜à¸£à¸£à¸¡à¸£à¸²à¸Š</option><option value="à¸­à¸·à¹ˆà¸™à¹†">à¸­à¸·à¹ˆà¸™à¹†</option>
          </select></div>
          <div><label>à¹€à¸žà¸¨à¸—à¸µà¹ˆà¸•à¹‰à¸­à¸‡à¸à¸²à¸£à¸«à¸²</label><select name="lookingFor"><option value="male">à¸Šà¸²à¸¢</option><option value="female">à¸«à¸à¸´à¸‡</option><option value="all">à¸—à¸±à¹‰à¸‡à¸«à¸¡à¸”</option></select></div>
        </div>
        <div style="display:flex;justify-content:flex-end"><button class="btn btn-primary" type="submit">à¸ªà¸¡à¸±à¸„à¸£à¸ªà¸¡à¸²à¸Šà¸´à¸</button></div>
      </form>
    </main>
  `);
}

function verifyPage(email = '', error = '', info = '') {
  return htmlPage('à¸¢à¸·à¸™à¸¢à¸±à¸™ OTP', `
    <main class="card" style="display:grid;gap:12px;max-width:560px">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><h2 style="margin:0">à¸¢à¸·à¸™à¸¢à¸±à¸™ OTP</h2><a class="btn" href="/register">à¸à¸¥à¸±à¸šà¸ªà¸¡à¸±à¸„à¸£à¸ªà¸¡à¸²à¸Šà¸´à¸</a></div>
      ${error ? `<div class="err">${error}</div>` : ''}
      ${info ? `<div class="ok">${info}</div>` : ''}
      <form method="POST" action="/verify" style="display:grid;gap:10px">
        <div><label>Email</label><input type="email" name="email" value="${email}" required /></div>
        <div><label>OTP</label><input name="otp" required /></div>
        <div style="display:flex;justify-content:flex-end"><button class="btn btn-primary" type="submit">à¸¢à¸·à¸™à¸¢à¸±à¸™</button></div>
      </form>
      <p class="muted">à¹€à¸”à¹‚à¸¡: à¸£à¸°à¸šà¸šà¸ˆà¸°à¹à¸ªà¸”à¸‡ OTP à¸«à¸¥à¸±à¸‡à¸à¸”à¸ªà¸¡à¸±à¸„à¸£</p>
    </main>
  `);
}

function loginPage(error = '', info = '') {
  return htmlPage('à¹€à¸‚à¹‰à¸²à¸ªà¸¹à¹ˆà¸£à¸°à¸šà¸š', `
    <div style="min-height:calc(100vh - 32px);display:flex;align-items:center;justify-content:center">
    <main class="card" style="display:grid;gap:12px;max-width:560px;width:100%;margin:0 auto">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><h2 style="margin:0">à¹€à¸‚à¹‰à¸²à¸ªà¸¹à¹ˆà¸£à¸°à¸šà¸š</h2><a class="btn" href="/">à¸à¸¥à¸±à¸šà¸«à¸™à¹‰à¸²à¹à¸£à¸</a></div>
      ${error ? `<div class="err">${error}</div>` : ''}
      ${info ? `<div class="ok">${info}</div>` : ''}
      <form method="POST" action="/login" style="display:grid;gap:12px">
        <div><label>Email à¸«à¸£à¸·à¸­ Username</label><input name="login" required /></div>
        <div><label>Password</label><input type="password" name="password" required /></div>
        <div style="height:2px"></div>
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap">
          <a class="btn btn-warn" style="min-height:42px;flex:1" href="/forgot-password">à¸¥à¸·à¸¡à¸£à¸«à¸±à¸ªà¸œà¹ˆà¸²à¸™</a>
          <button class="btn btn-primary" style="min-height:42px;flex:1" type="submit">à¹€à¸‚à¹‰à¸²à¸ªà¸¹à¹ˆà¸£à¸°à¸šà¸š</button>
        </div>
      </form>
      <a class="btn btn-success" style="min-height:44px;font-weight:800" href="/auth/google">ðŸ” à¹€à¸‚à¹‰à¸²à¸ªà¸¹à¹ˆà¸£à¸°à¸šà¸šà¸”à¹‰à¸§à¸¢ Google (demo)</a>
    </main>
    </div>
  `);
}

function forgotPasswordPage(error = '', info = '') {
  return htmlPage('à¸¥à¸·à¸¡à¸£à¸«à¸±à¸ªà¸œà¹ˆà¸²à¸™', `
    <main class="card" style="display:grid;gap:12px;max-width:560px">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><h2 style="margin:0">à¸¥à¸·à¸¡à¸£à¸«à¸±à¸ªà¸œà¹ˆà¸²à¸™</h2><a class="btn" href="/login">à¸à¸¥à¸±à¸šà¸«à¸™à¹‰à¸²à¹€à¸‚à¹‰à¸²à¸ªà¸¹à¹ˆà¸£à¸°à¸šà¸š</a></div>
      ${error ? `<div class="err">${error}</div>` : ''}
      ${info ? `<div class="ok">${info}</div>` : ''}
      <form method="POST" action="/forgot-password" style="display:grid;gap:10px">
        <div><label>Email</label><input type="email" name="email" required /></div>
        <div style="display:flex;justify-content:flex-end"><button class="btn btn-primary" type="submit">à¸£à¸µà¹€à¸‹à¹‡à¸•à¸£à¸«à¸±à¸ªà¸œà¹ˆà¸²à¸™ (demo)</button></div>
      </form>
    </main>
  `);
}

function profilePage(user, message = '') {
  return htmlPage('à¹‚à¸›à¸£à¹„à¸Ÿà¸¥à¹Œà¸œà¸¹à¹‰à¹ƒà¸Šà¹‰', `
    <main class="card" style="display:grid;gap:12px">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px">
        <h2 style="margin:0">à¹‚à¸›à¸£à¹„à¸Ÿà¸¥à¹Œà¸œà¸¹à¹‰à¹ƒà¸Šà¹‰</h2>
        <div class="toolbar"><a class="btn btn-menu" href="/security">à¸„à¸§à¸²à¸¡à¸›à¸¥à¸­à¸”à¸ à¸±à¸¢</a><a class="btn btn-menu" href="/board">à¹€à¸§à¹‡à¸šà¸šà¸­à¸£à¹Œà¸”</a><a class="btn btn-success" href="/vip">VIP</a><a class="btn btn-menu" href="/wallet">à¸à¸£à¸°à¹€à¸›à¹‹à¸²</a><a class="btn btn-menu" href="/match">à¹à¸¡à¸•à¸Šà¹Œ</a><a class="btn" href="/">à¸«à¸™à¹‰à¸²à¹à¸£à¸</a><a class="btn btn-danger" href="/logout">à¸­à¸­à¸à¸ˆà¸²à¸à¸£à¸°à¸šà¸š</a></div>
      </div>
      ${message ? `<div class="ok">${message}</div>` : ''}
      <section class="card" style="padding:14px;border-radius:12px">
        <div style="font-size:24px;font-weight:800">${user.displayName || user.username}</div>
        <div class="muted">@${user.username} â€¢ ${user.email}</div>
        <div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap">
          ${user.verifiedBadge ? '<span class="chip chip-ok">à¸¢à¸·à¸™à¸¢à¸±à¸™à¸•à¸±à¸§à¸•à¸™à¹à¸¥à¹‰à¸§</span>' : ''}
          ${user.vipStatus ? '<span class="chip chip-ok">VIP</span>' : ''}
          ${user.emailVerified ? '<span class="chip chip-ok">à¸­à¸µà¹€à¸¡à¸¥à¸¢à¸·à¸™à¸¢à¸±à¸™à¹à¸¥à¹‰à¸§</span>' : '<span class="chip chip-no">à¸­à¸µà¹€à¸¡à¸¥à¸¢à¸±à¸‡à¹„à¸¡à¹ˆà¸¢à¸·à¸™à¸¢à¸±à¸™</span>'}
          ${user.phoneVerified ? '<span class="chip chip-ok">à¹€à¸šà¸­à¸£à¹Œà¸¢à¸·à¸™à¸¢à¸±à¸™à¹à¸¥à¹‰à¸§</span>' : '<span class="chip chip-no">à¹€à¸šà¸­à¸£à¹Œà¸¢à¸±à¸‡à¹„à¸¡à¹ˆà¸¢à¸·à¸™à¸¢à¸±à¸™</span>'}
        </div>
      </section>
      <form method="POST" action="/profile" style="display:grid;gap:10px">
        <div class="grid">
          <div><label>à¸Šà¸·à¹ˆà¸­à¹à¸ªà¸”à¸‡à¸œà¸¥</label><input name="displayName" value="${user.displayName || user.username}" /></div>
          <div><label>à¸ªà¸–à¸²à¸™à¸°</label><select name="status"><option value="online" ${user.status === 'online' ? 'selected' : ''}>online</option><option value="busy" ${user.status === 'busy' ? 'selected' : ''}>busy</option><option value="offline" ${user.status === 'offline' ? 'selected' : ''}>offline</option></select></div>
          <div><label>à¸ˆà¸±à¸‡à¸«à¸§à¸±à¸”</label><input name="location" value="${user.location || ''}" /></div>
          <div><label>à¸­à¸²à¸Šà¸µà¸ž</label><input name="occupation" value="${user.occupation || ''}" /></div>
          <div><label>à¸„à¸§à¸²à¸¡à¸ªà¸™à¹ƒà¸ˆ</label><input name="interests" value="${user.interests || ''}" /></div>
          <div><label>à¹€à¸›à¹‰à¸²à¸«à¸¡à¸²à¸¢à¸„à¸§à¸²à¸¡à¸ªà¸±à¸¡à¸žà¸±à¸™à¸˜à¹Œ</label><select name="relationshipGoal"><option value="friend" ${user.relationshipGoal==='friend'?'selected':''}>friend</option><option value="dating" ${user.relationshipGoal==='dating'?'selected':''}>dating</option><option value="serious" ${user.relationshipGoal==='serious'?'selected':''}>serious</option></select></div>
        </div>
        <div><label>Bio</label><textarea name="bio" rows="4">${user.bio || ''}</textarea></div>
        <div style="display:flex;justify-content:flex-end"><button class="btn btn-primary" type="submit">à¸šà¸±à¸™à¸—à¸¶à¸à¹‚à¸›à¸£à¹„à¸Ÿà¸¥à¹Œ</button></div>
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
      <div class="muted" style="margin-top:4px">@${u.username} â€¢ ${u.gender || 'other'} â€¢ ${u.age || '-'}</div>
      <div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap">
        <form method="POST" action="/match/action"><input type="hidden" name="target" value="${u.username}"/><input type="hidden" name="type" value="like"/><button class="btn btn-primary" type="submit">â¤ï¸ à¹„à¸¥à¸à¹Œ</button></form>
        <form method="POST" action="/match/action"><input type="hidden" name="target" value="${u.username}"/><input type="hidden" name="type" value="super_like"/><button class="btn btn-success" type="submit">â­ à¸‹à¸¹à¹€à¸›à¸­à¸£à¹Œà¹„à¸¥à¸à¹Œ</button></form>
        <form method="POST" action="/match/action"><input type="hidden" name="target" value="${u.username}"/><input type="hidden" name="type" value="pass"/><button class="btn btn-warn" type="submit">âŒ à¸‚à¹‰à¸²à¸¡</button></form>
      </div>
    </div>
  `).join('');

  const likedMe = likes.filter((x) => x.to === me.username && (x.type === 'like' || x.type === 'super_like'));
  const myMatches = matches.filter((m) => m.userA === me.username || m.userB === me.username);

  return htmlPage('à¸„à¹‰à¸™à¸«à¸²à¹à¸¥à¸°à¹à¸¡à¸•à¸Šà¹Œ', `
    <main class="card" style="display:grid;gap:12px">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><h2 style="margin:0">à¸„à¹‰à¸™à¸«à¸²à¹à¸¥à¸°à¹à¸¡à¸•à¸Šà¹Œ</h2><div class="toolbar"><a class="btn btn-menu" href="/profile">à¹‚à¸›à¸£à¹„à¸Ÿà¸¥à¹Œ</a><a class="btn btn-danger" href="/logout">à¸­à¸­à¸à¸ˆà¸²à¸à¸£à¸°à¸šà¸š</a></div></div>
      ${info ? `<div class="ok">${info}</div>` : ''}
      <section class="card" style="padding:12px;border-radius:12px">
        <form method="GET" action="/match" class="grid">
          <div><label>à¸­à¸²à¸¢à¸¸à¸•à¹ˆà¸³à¸ªà¸¸à¸”</label><input type="number" name="minAge" value="${minAge}"/></div>
          <div><label>à¸­à¸²à¸¢à¸¸à¸ªà¸¹à¸‡à¸ªà¸¸à¸”</label><input type="number" name="maxAge" value="${maxAge}"/></div>
          <div><label>à¹€à¸žà¸¨</label><select name="gender"><option value="all" ${gender==='all'?'selected':''}>all</option><option value="male" ${gender==='male'?'selected':''}>male</option><option value="female" ${gender==='female'?'selected':''}>female</option><option value="other" ${gender==='other'?'selected':''}>other</option></select></div>
          <div><label>à¸ˆà¸±à¸‡à¸«à¸§à¸±à¸”</label><input name="province" value="${query.province || ''}"/></div>
          <div><label>à¹€à¸›à¹‰à¸²à¸«à¸¡à¸²à¸¢</label><select name="goal"><option value="all" ${goal==='all'?'selected':''}>all</option><option value="friend" ${goal==='friend'?'selected':''}>friend</option><option value="dating" ${goal==='dating'?'selected':''}>dating</option><option value="serious" ${goal==='serious'?'selected':''}>serious</option></select></div>
          <div style="display:flex;align-items:flex-end"><button class="btn btn-primary" type="submit">à¸„à¹‰à¸™à¸«à¸²</button></div>
        </form>
      </section>
      <section class="grid">${cards || '<div class="muted">à¹„à¸¡à¹ˆà¸žà¸šà¸œà¸¹à¹‰à¹ƒà¸Šà¹‰à¸•à¸²à¸¡à¹€à¸‡à¸·à¹ˆà¸­à¸™à¹„à¸‚</div>'}</section>
      <section class="card" style="padding:12px;border-radius:12px"><strong>à¸„à¸™à¸—à¸µà¹ˆà¸à¸”à¹„à¸¥à¸à¹Œà¹€à¸£à¸²</strong><div class="muted" style="margin-top:6px">${me.vipStatus ? (likedMe.length ? likedMe.map((x) => x.from).join(', ') : 'à¸¢à¸±à¸‡à¹„à¸¡à¹ˆà¸¡à¸µ') : 'à¸Ÿà¸µà¹€à¸ˆà¸­à¸£à¹Œà¸™à¸µà¹‰à¸ªà¸³à¸«à¸£à¸±à¸š VIP'}</div></section>
      <section class="card" style="padding:12px;border-radius:12px"><strong>à¹à¸¡à¸•à¸Šà¹Œà¸‚à¸­à¸‡à¸‰à¸±à¸™</strong><div style="margin-top:6px;display:flex;gap:8px;flex-wrap:wrap">${myMatches.length ? myMatches.map((m) => `<a class=\"btn\" href=\"/chat/${m.id}\">ðŸ’¬ ${m.userA===me.username?m.userB:m.userA}</a>`).join(' ') : '<span class="muted">à¸¢à¸±à¸‡à¹„à¸¡à¹ˆà¸¡à¸µà¹à¸¡à¸•à¸Šà¹Œ</span>'}</div></section>
      <section class="card" style="padding:12px;border-radius:12px">
        <strong>Boost à¹‚à¸›à¸£à¹„à¸Ÿà¸¥à¹Œ</strong>
        <form method="POST" action="/match/boost" style="margin-top:8px"><button class="btn btn-primary" type="submit">ðŸš€ à¸šà¸¹à¸ªà¸•à¹Œà¹‚à¸›à¸£à¹„à¸Ÿà¸¥à¹Œ (à¹€à¸”à¹‚à¸¡)</button></form>
      </section>
    </main>
  `);
}

function renderChatPage(me, matchId, info = '') {
  const matches = readJson(matchesFile);
  const m = matches.find((x) => x.id === matchId && (x.userA === me.username || x.userB === me.username));
  if (!m) return htmlPage('à¹„à¸¡à¹ˆà¸žà¸šà¹à¸Šà¸—', '<main class="card"><h2>à¹„à¸¡à¹ˆà¸žà¸šà¸«à¹‰à¸­à¸‡à¹à¸Šà¸—</h2><a class="btn" href="/match">à¸à¸¥à¸±à¸š Match</a></main>');

  const partner = m.userA === me.username ? m.userB : m.userA;
  const msgs = readJson(messagesFile).filter((x) => x.matchId === matchId).slice(-80);
  const rows = msgs.map((x) => `<div class="card" style="padding:10px;border-radius:10px;background:${x.sender===me.username?'#eff6ff':'#fff'}"><strong>${x.sender}</strong> <span class="muted">${new Date(x.at).toLocaleString('th-TH')}</span><div style="margin-top:6px">${x.text}</div><div class="muted" style="margin-top:4px">${x.read ? 'read' : 'sent'}</div></div>`).join('');

  const giftBtns = [
    { id:'flower', name:'ðŸŒ¹ à¸”à¸­à¸à¹„à¸¡à¹‰', price:10 },
    { id:'heart', name:'â¤ï¸ à¸«à¸±à¸§à¹ƒà¸ˆ', price:20 },
    { id:'ring', name:'ðŸ’ à¹à¸«à¸§à¸™', price:100 },
  ].map((g)=>`<form method="POST" action="/chat/${matchId}/gift" style="display:inline-block"><input type="hidden" name="giftId" value="${g.id}"/><input type="hidden" name="price" value="${g.price}"/><button class="btn" type="submit">${g.name} (${g.price})</button></form>`).join(' ');

  return htmlPage('à¹à¸Šà¸—', `
    <main class="card" style="display:grid;gap:12px">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><h2 style="margin:0">à¹à¸Šà¸—à¸à¸±à¸š ${partner}</h2><div class="toolbar"><a class="btn btn-menu" href="/match">à¸à¸¥à¸±à¸šà¸«à¸™à¹‰à¸²à¹à¸¡à¸•à¸Šà¹Œ</a><a class="btn btn-danger" href="/logout">à¸­à¸­à¸à¸ˆà¸²à¸à¸£à¸°à¸šà¸š</a></div></div>
      ${info ? `<div class="ok">${info}</div>` : ''}
      <div style="display:grid;gap:8px">${rows || '<div class="muted">à¸¢à¸±à¸‡à¹„à¸¡à¹ˆà¸¡à¸µà¸‚à¹‰à¸­à¸„à¸§à¸²à¸¡</div>'}</div>
      <div class="card" style="padding:10px;border-radius:10px"><strong>à¸ªà¹ˆà¸‡à¸‚à¸­à¸‡à¸‚à¸§à¸±à¸</strong><div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap">${giftBtns}</div></div>
      <form method="POST" action="/chat/${matchId}" style="display:grid;gap:8px">
        <textarea name="message" rows="4" placeholder="à¸žà¸´à¸¡à¸žà¹Œà¸‚à¹‰à¸­à¸„à¸§à¸²à¸¡... (à¸£à¸­à¸‡à¸£à¸±à¸š emoji ðŸ˜Š)"></textarea>
        <div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap">
          <div style="display:flex;gap:8px"><button class="btn" name="quick" value="ðŸ˜Š" type="submit">ðŸ˜Š</button><button class="btn" name="quick" value="â¤ï¸" type="submit">â¤ï¸</button><button class="btn" name="quick" value="ðŸ”¥" type="submit">ðŸ”¥</button></div>
          <button class="btn btn-primary" type="submit">à¸ªà¹ˆà¸‡à¸‚à¹‰à¸­à¸„à¸§à¸²à¸¡</button>
        </div>
      </form>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <form method="POST" action="/chat/${matchId}/block"><button class="btn btn-warn" type="submit">â›” à¸šà¸¥à¹‡à¸­à¸</button></form>
        <form method="POST" action="/chat/${matchId}/report"><button class="btn btn-danger" type="submit">ðŸš© à¸£à¸²à¸¢à¸‡à¸²à¸™</button></form>
      </div>
    </main>
  `);
}

function renderAdminLoginPage(error = '') {
  return htmlPage('à¹€à¸‚à¹‰à¸²à¸ªà¸¹à¹ˆà¸£à¸°à¸šà¸šà¸œà¸¹à¹‰à¸”à¸¹à¹à¸¥', `
    <main class="card" style="display:grid;gap:12px;max-width:520px">
      <div style="display:flex;justify-content:space-between;align-items:center"><h2 style="margin:0">à¹€à¸‚à¹‰à¸²à¸ªà¸¹à¹ˆà¸£à¸°à¸šà¸šà¸œà¸¹à¹‰à¸”à¸¹à¹à¸¥</h2><a class="btn btn-menu" href="/">à¸«à¸™à¹‰à¸²à¹à¸£à¸</a></div>
      ${error ? `<div class="err">${error}</div>` : ''}
      <form method="POST" action="/admin/login" style="display:grid;gap:10px">
        <div><label>Username</label><input name="username" required /></div>
        <div><label>Password</label><input type="password" name="password" required /></div>
        <div style="display:flex;justify-content:flex-end"><button class="btn" type="submit">à¹€à¸‚à¹‰à¸²à¸ªà¸¹à¹ˆà¸£à¸°à¸šà¸šà¸«à¸¥à¸±à¸‡à¸šà¹‰à¸²à¸™</button></div>
      </form>
    </main>
  `);
}

function adminShell(title, body) {
  return htmlPage(title, `
    <main class="card" style="display:grid;gap:12px">
      <nav class="card" style="padding:10px;border-radius:12px;display:flex;gap:8px;flex-wrap:wrap">
        <a class="btn" href="/admin/dashboard">à¹à¸”à¸Šà¸šà¸­à¸£à¹Œà¸”</a>
        <a class="btn" href="/admin/members">à¸ªà¸¡à¸²à¸Šà¸´à¸</a>
        <a class="btn" href="/admin/vip">VIP</a>
        <a class="btn" href="/admin/coins">à¹€à¸«à¸£à¸µà¸¢à¸</a>
        <a class="btn" href="/admin/frames">à¸à¸£à¸­à¸š</a>
        <a class="btn" href="/admin/reports">à¸£à¸²à¸¢à¸‡à¸²à¸™</a>
        <a class="btn" href="/admin/threads">à¸à¸£à¸°à¸—à¸¹à¹‰</a>
        <a class="btn" href="/admin/store">à¸£à¹‰à¸²à¸™à¸„à¹‰à¸²</a>
        <a class="btn btn-danger" href="/admin/logout">à¸­à¸­à¸à¸ˆà¸²à¸à¸£à¸°à¸šà¸š</a>
      </nav>
      ${body}
    </main>
  `);
}

function renderAdminDashboard(query = {}) {
  const users = readJson(usersFile);
  const vipCount = users.filter((u) => u.vipStatus).length;
  const tx = readJson(coinTxFile);
  const reports = readJson(reportsFile);
  const posts = readJson(boardPostsFile);

  const parseDateStart = (s) => {
    if (!s) return null;
    const d = new Date(`${s}T00:00:00`);
    return Number.isNaN(d.getTime()) ? null : d.getTime();
  };
  const parseDateEnd = (s) => {
    if (!s) return null;
    const d = new Date(`${s}T23:59:59.999`);
    return Number.isNaN(d.getTime()) ? null : d.getTime();
  };

  const from = String(query.from || '').trim();
  const to = String(query.to || '').trim();
  const fromTs = parseDateStart(from);
  const toTs = parseDateEnd(to);

  const userInRange = users.filter((u) => {
    const ts = Number(u.createdAt || 0);
    if (!ts) return false;
    if (fromTs && ts < fromTs) return false;
    if (toTs && ts > toTs) return false;
    return true;
  });

  const userRows = userInRange
    .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0))
    .slice(0, 300)
    .map((u) => `<tr><td>${new Date(Number(u.createdAt || Date.now())).toLocaleString('th-TH')}</td><td>${u.username}</td><td>${u.email || '-'}</td><td>${u.role || 'member'}</td><td>${u.location || '-'}</td></tr>`)
    .join('');

  const byDay = {};
  userInRange.forEach((u) => {
    const d = new Date(Number(u.createdAt || 0));
    if (Number.isNaN(d.getTime())) return;
    const key = d.toISOString().slice(0, 10);
    byDay[key] = (byDay[key] || 0) + 1;
  });
  const dayKeys = Object.keys(byDay).sort();
  const maxDay = dayKeys.length ? Math.max(...dayKeys.map((k) => byDay[k])) : 1;
  const chartBars = dayKeys.map((k) => {
    const v = byDay[k];
    const h = Math.max(10, Math.round((v / maxDay) * 120));
    return `<div title="${k}: ${v} à¸„à¸™" style="display:grid;gap:6px;justify-items:center"><div style="width:18px;height:${h}px;background:#93c5fd;border:1px solid #60a5fa;border-radius:6px 6px 0 0"></div><div class="muted" style="font-size:11px">${k.slice(5)}</div></div>`;
  }).join('');

  return adminShell('Admin Dashboard', `
    <h2 style="margin:0">Admin Dashboard</h2>
    <section style="display:flex;gap:10px;overflow:auto;align-items:stretch">
      <div class="card" style="padding:12px;border-radius:12px;min-width:180px;flex:1"><div class="muted">à¸ªà¸¡à¸²à¸Šà¸´à¸à¸—à¸±à¹‰à¸‡à¸«à¸¡à¸”</div><div style="font-size:28px;font-weight:800">${users.length}</div></div>
      <div class="card" style="padding:12px;border-radius:12px;min-width:180px;flex:1"><div class="muted">à¸œà¸¹à¹‰à¹ƒà¸Šà¹‰ VIP</div><div style="font-size:28px;font-weight:800">${vipCount}</div></div>
      <div class="card" style="padding:12px;border-radius:12px;min-width:180px;flex:1"><div class="muted">à¸˜à¸¸à¸£à¸à¸£à¸£à¸¡à¹€à¸«à¸£à¸µà¸¢à¸</div><div style="font-size:28px;font-weight:800">${tx.length}</div></div>
      <div class="card" style="padding:12px;border-radius:12px;min-width:180px;flex:1"><div class="muted">à¸£à¸²à¸¢à¸‡à¸²à¸™à¸œà¸¹à¹‰à¹ƒà¸Šà¹‰</div><div style="font-size:28px;font-weight:800">${reports.length}</div></div>
      <div class="card" style="padding:12px;border-radius:12px;min-width:180px;flex:1"><div class="muted">à¸à¸£à¸°à¸—à¸¹à¹‰à¸—à¸±à¹‰à¸‡à¸«à¸¡à¸”</div><div style="font-size:28px;font-weight:800">${posts.length}</div></div>
    </section>

    <section class="card" style="padding:12px;border-radius:12px;display:grid;gap:10px">
      <strong>à¸Ÿà¸´à¸¥à¹€à¸•à¸­à¸£à¹Œà¸ªà¸¡à¸²à¸Šà¸´à¸à¸•à¸²à¸¡à¸Šà¹ˆà¸§à¸‡à¸§à¸±à¸™à¸—à¸µà¹ˆà¸ªà¸¡à¸±à¸„à¸£</strong>
      <form method="GET" action="/admin/dashboard" style="display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap">
        <div style="min-width:200px;flex:1"><label>à¸ˆà¸²à¸à¸§à¸±à¸™à¸—à¸µà¹ˆ</label><input type="date" name="from" value="${from}" /></div>
        <div style="min-width:200px;flex:1"><label>à¸–à¸¶à¸‡à¸§à¸±à¸™à¸—à¸µà¹ˆ</label><input type="date" name="to" value="${to}" /></div>
        <div style="display:flex;align-items:flex-end;gap:8px;white-space:nowrap"><button class="btn" type="submit">à¸à¸£à¸­à¸‡à¸‚à¹‰à¸­à¸¡à¸¹à¸¥</button><a class="btn" href="/admin/dashboard">à¸¥à¹‰à¸²à¸‡à¸„à¹ˆà¸²</a></div>
      </form>
      <div class="muted">à¸œà¸¥à¸¥à¸±à¸žà¸˜à¹Œ: à¸žà¸šà¸ªà¸¡à¸²à¸Šà¸´à¸ ${userInRange.length} à¸£à¸²à¸¢</div>
      <section class="card" style="padding:10px;border-radius:10px">
        <strong>à¸à¸£à¸²à¸Ÿà¸ˆà¸³à¸™à¸§à¸™à¸œà¸¹à¹‰à¸ªà¸¡à¸±à¸„à¸£à¸•à¸²à¸¡à¸§à¸±à¸™</strong>
        <div style="margin-top:8px;display:flex;gap:8px;align-items:flex-end;overflow:auto;padding-bottom:4px;min-height:150px">${chartBars || '<span class="muted">à¹„à¸¡à¹ˆà¸¡à¸µà¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¹ƒà¸™à¸Šà¹ˆà¸§à¸‡à¸§à¸±à¸™à¸—à¸µà¹ˆà¹€à¸¥à¸·à¸­à¸</span>'}</div>
      </section>
      <div style="overflow:auto"><table><thead><tr><th>à¸§à¸±à¸™à¸—à¸µà¹ˆà¸ªà¸¡à¸±à¸„à¸£</th><th>Username</th><th>Email</th><th>Role</th><th>à¸ˆà¸±à¸‡à¸«à¸§à¸±à¸”</th></tr></thead><tbody>${userRows || '<tr><td colspan="5">à¹„à¸¡à¹ˆà¸žà¸šà¸ªà¸¡à¸²à¸Šà¸´à¸à¹ƒà¸™à¸Šà¹ˆà¸§à¸‡à¸§à¸±à¸™à¸—à¸µà¹ˆà¹€à¸¥à¸·à¸­à¸</td></tr>'}</tbody></table></div>
    </section>
  `);
}

function renderAdminMembers(query = {}) {
  const users = readJson(usersFile);
  const gender = String(query.gender || 'all').trim().toLowerCase();
  const minAge = Number(query.minAge || 18);
  const maxAge = Number(query.maxAge || 99);
  const province = String(query.province || '').trim().toLowerCase();
  const plan = String(query.plan || 'all').trim().toLowerCase();
  const q = String(query.q || '').trim().toLowerCase();

  const filtered = users.filter((u) => {
    if (gender !== 'all' && String(u.gender || '').toLowerCase() !== gender) return false;
    const age = Number(u.age || 0);
    if (age && (age < minAge || age > maxAge)) return false;
    if (province && !String(u.location || '').toLowerCase().includes(province)) return false;
    if (plan === 'vip' && !u.vipStatus) return false;
    if (plan === 'free' && u.vipStatus) return false;
    if (q) {
      const blob = `${u.username || ''} ${u.email || ''} ${u.location || ''}`.toLowerCase();
      if (!blob.includes(q)) return false;
    }
    return true;
  });

  const rows = filtered
    .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0))
    .map((u)=>`<tr><td>${u.username}</td><td>${u.email}</td><td>${u.gender || '-'}</td><td>${u.age || '-'}</td><td>${u.vipStatus ? 'VIP':'Free'}</td><td>${u.coins||0}</td><td>${u.location||''}</td><td>${new Date(Number(u.createdAt || Date.now())).toLocaleDateString('th-TH')}</td></tr>`)
    .join('');

  return adminShell('à¸ˆà¸±à¸”à¸à¸²à¸£à¸ªà¸¡à¸²à¸Šà¸´à¸', `
    <h2 style="margin:0">à¸ˆà¸±à¸”à¸à¸²à¸£à¸ªà¸¡à¸²à¸Šà¸´à¸</h2>
    <section class="card" style="padding:12px;border-radius:12px;display:grid;gap:10px">
      <strong>à¸Ÿà¸´à¸¥à¹€à¸•à¸­à¸£à¹Œà¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸ªà¸¡à¸²à¸Šà¸´à¸</strong>
      <form method="GET" action="/admin/members" style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end">
        <div style="min-width:140px"><label>à¹€à¸žà¸¨</label><select name="gender"><option value="all" ${gender==='all'?'selected':''}>à¸—à¸±à¹‰à¸‡à¸«à¸¡à¸”</option><option value="male" ${gender==='male'?'selected':''}>à¸Šà¸²à¸¢</option><option value="female" ${gender==='female'?'selected':''}>à¸«à¸à¸´à¸‡</option><option value="other" ${gender==='other'?'selected':''}>à¸­à¸·à¹ˆà¸™à¹†</option></select></div>
        <div style="width:110px"><label>à¸­à¸²à¸¢à¸¸à¸•à¹ˆà¸³à¸ªà¸¸à¸”</label><input type="number" min="18" max="99" name="minAge" value="${minAge}" /></div>
        <div style="width:110px"><label>à¸­à¸²à¸¢à¸¸à¸ªà¸¹à¸‡à¸ªà¸¸à¸”</label><input type="number" min="18" max="99" name="maxAge" value="${maxAge}" /></div>
        <div style="min-width:160px"><label>à¸ˆà¸±à¸‡à¸«à¸§à¸±à¸”</label><input name="province" value="${query.province || ''}" placeholder="à¹€à¸Šà¹ˆà¸™ à¸à¸£à¸¸à¸‡à¹€à¸—à¸žà¸¯" /></div>
        <div style="min-width:120px"><label>à¹à¸žà¹‡à¸à¹€à¸à¸ˆ</label><select name="plan"><option value="all" ${plan==='all'?'selected':''}>à¸—à¸±à¹‰à¸‡à¸«à¸¡à¸”</option><option value="vip" ${plan==='vip'?'selected':''}>VIP</option><option value="free" ${plan==='free'?'selected':''}>Free</option></select></div>
        <div style="min-width:170px"><label>à¸„à¹‰à¸™à¸«à¸²</label><input name="q" value="${query.q || ''}" placeholder="username/email" /></div>
        <div style="display:flex;gap:8px"><button class="btn" type="submit">à¸à¸£à¸­à¸‡</button><a class="btn" href="/admin/members">à¸¥à¹‰à¸²à¸‡à¸„à¹ˆà¸²</a></div>
      </form>
      <div class="muted">à¸œà¸¥à¸¥à¸±à¸žà¸˜à¹Œ: ${filtered.length} à¸£à¸²à¸¢à¸à¸²à¸£</div>
    </section>
    <div style="overflow:auto"><table><thead><tr><th>Username</th><th>Email</th><th>à¹€à¸žà¸¨</th><th>à¸­à¸²à¸¢à¸¸</th><th>Plan</th><th>Coins</th><th>Location</th><th>à¸ªà¸¡à¸±à¸„à¸£à¹€à¸¡à¸·à¹ˆà¸­</th></tr></thead><tbody>${rows||'<tr><td colspan="8">à¹„à¸¡à¹ˆà¸¡à¸µà¸‚à¹‰à¸­à¸¡à¸¹à¸¥</td></tr>'}</tbody></table></div>
  `);
}

function renderAdminVip() {
  const users = readJson(usersFile).filter((u)=>u.vipStatus);
  const rows = users.map((u)=>`<tr><td>${u.username}</td><td>${u.email}</td><td>${u.vipUntil?new Date(u.vipUntil).toLocaleString('th-TH'):'-'}</td></tr>`).join('');
  return adminShell('à¸ˆà¸±à¸”à¸à¸²à¸£ VIP', `<h2 style="margin:0">à¸ˆà¸±à¸”à¸à¸²à¸£ VIP</h2><div style="overflow:auto"><table><thead><tr><th>Username</th><th>Email</th><th>à¸«à¸¡à¸”à¸­à¸²à¸¢à¸¸</th></tr></thead><tbody>${rows||'<tr><td colspan="3">à¹„à¸¡à¹ˆà¸¡à¸µ VIP</td></tr>'}</tbody></table></div>`);
}

function renderAdminCoins() {
  const tx = readJson(coinTxFile).slice(-100).reverse();
  const rows = tx.map((t)=>`<tr><td>${new Date(t.at).toLocaleString('th-TH')}</td><td>${t.username}</td><td>${t.type}</td><td>${t.amount}</td><td>${t.note||''}</td></tr>`).join('');
  return adminShell('à¸ˆà¸±à¸”à¸à¸²à¸£à¹€à¸«à¸£à¸µà¸¢à¸', `<h2 style="margin:0">à¸ˆà¸±à¸”à¸à¸²à¸£à¹€à¸«à¸£à¸µà¸¢à¸</h2><div style="overflow:auto"><table><thead><tr><th>à¹€à¸§à¸¥à¸²</th><th>User</th><th>Type</th><th>Amount</th><th>Note</th></tr></thead><tbody>${rows||'<tr><td colspan="5">à¹„à¸¡à¹ˆà¸¡à¸µà¸£à¸²à¸¢à¸à¸²à¸£</td></tr>'}</tbody></table></div>`);
}

function renderAdminFrames() {
  const tx = readJson(frameTxFile).slice(-100).reverse();
  const rows = tx.map((t)=>`<tr><td>${new Date(t.at).toLocaleString('th-TH')}</td><td>${t.username}</td><td>${t.type}</td><td>${t.frameId}</td><td>${t.price}</td></tr>`).join('');
  return adminShell('à¸ˆà¸±à¸”à¸à¸²à¸£à¸à¸£à¸­à¸šà¸£à¸¹à¸›', `<h2 style="margin:0">à¸ˆà¸±à¸”à¸à¸²à¸£à¸à¸£à¸­à¸šà¸£à¸¹à¸›</h2><div style="overflow:auto"><table><thead><tr><th>à¹€à¸§à¸¥à¸²</th><th>User</th><th>Type</th><th>Frame</th><th>Price</th></tr></thead><tbody>${rows||'<tr><td colspan="5">à¹„à¸¡à¹ˆà¸¡à¸µà¸£à¸²à¸¢à¸à¸²à¸£</td></tr>'}</tbody></table></div>`);
}

function renderAdminReports() {
  const reports = readJson(reportsFile).slice(-100).reverse();
  const rows = reports.map((r)=>`<tr><td>${new Date(r.at).toLocaleString('th-TH')}</td><td>${r.reporter}</td><td>${r.target}</td><td>${r.reason}</td></tr>`).join('');
  return adminShell('à¸ˆà¸±à¸”à¸à¸²à¸£à¸£à¸²à¸¢à¸‡à¸²à¸™', `<h2 style="margin:0">à¸ˆà¸±à¸”à¸à¸²à¸£à¸£à¸²à¸¢à¸‡à¸²à¸™</h2><div style="overflow:auto"><table><thead><tr><th>à¹€à¸§à¸¥à¸²</th><th>Reporter</th><th>Target</th><th>Reason</th></tr></thead><tbody>${rows||'<tr><td colspan="4">à¹„à¸¡à¹ˆà¸¡à¸µà¸£à¸²à¸¢à¸‡à¸²à¸™</td></tr>'}</tbody></table></div>`);
}

function renderAdminThreads() {
  const posts = readJson(boardPostsFile).slice(-100).reverse();
  const rows = posts.map((p)=>`<tr><td>${new Date(p.createdAt).toLocaleString('th-TH')}</td><td>${p.author}</td><td>${p.title}</td><td>${p.category}</td><td>${p.likes||0}</td><td>${(p.comments||[]).length}</td><td>${p.reports||0}</td></tr>`).join('');
  return adminShell('à¸ˆà¸±à¸”à¸à¸²à¸£à¸à¸£à¸°à¸—à¸¹à¹‰', `<h2 style="margin:0">à¸ˆà¸±à¸”à¸à¸²à¸£à¸à¸£à¸°à¸—à¸¹à¹‰</h2><div style="overflow:auto"><table><thead><tr><th>à¹€à¸§à¸¥à¸²</th><th>Author</th><th>Title</th><th>Category</th><th>Likes</th><th>Comments</th><th>Reports</th></tr></thead><tbody>${rows||'<tr><td colspan="7">à¹„à¸¡à¹ˆà¸¡à¸µà¸à¸£à¸°à¸—à¸¹à¹‰</td></tr>'}</tbody></table></div>`);
}

function renderAdminStore(info = '') {
  const items = readJson(storeItemsFile).slice().sort((a, b) => String(a.id).localeCompare(String(b.id)));
  const rows = items.map((x) => `
    <tr>
      <td>${x.id}</td><td>${x.name}</td><td>${x.type || 'frame'}</td><td>${x.price || 0}</td><td>${x.active === false ? 'à¸›à¸´à¸”à¸‚à¸²à¸¢' : 'à¹€à¸›à¸´à¸”à¸‚à¸²à¸¢'}</td>
      <td style="display:flex;gap:6px;flex-wrap:wrap">
        <form method="POST" action="/admin/store/toggle"><input type="hidden" name="id" value="${x.id}"/><button class="btn" type="submit">${x.active === false ? 'à¹€à¸›à¸´à¸”à¸‚à¸²à¸¢' : 'à¸›à¸´à¸”à¸‚à¸²à¸¢'}</button></form>
        <form method="POST" action="/admin/store/price" style="display:flex;gap:6px"><input type="hidden" name="id" value="${x.id}"/><input type="number" min="0" name="price" value="${Number(x.price || 0)}" style="width:90px"/><button class="btn" type="submit">à¸­à¸±à¸›à¹€à¸”à¸•à¸£à¸²à¸„à¸²</button></form>
      </td>
    </tr>
  `).join('');

  return adminShell('à¸ˆà¸±à¸”à¸à¸²à¸£à¸£à¹‰à¸²à¸™à¸„à¹‰à¸²', `
    <h2 style="margin:0">à¸ˆà¸±à¸”à¸à¸²à¸£à¸£à¹‰à¸²à¸™à¸„à¹‰à¸²</h2>
    ${info ? `<div class="ok">${info}</div>` : ''}
    <section class="card" style="padding:12px;border-radius:12px;display:grid;gap:10px">
      <strong>à¹€à¸žà¸´à¹ˆà¸¡à¸ªà¸´à¸™à¸„à¹‰à¸²à¹ƒà¸«à¸¡à¹ˆ</strong>
      <form method="POST" action="/admin/store/create" style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end">
        <div style="min-width:120px"><label>à¸£à¸«à¸±à¸ªà¸ªà¸´à¸™à¸„à¹‰à¸²</label><input name="id" placeholder="S011" required /></div>
        <div style="min-width:220px;flex:1"><label>à¸Šà¸·à¹ˆà¸­à¸ªà¸´à¸™à¸„à¹‰à¸²</label><input name="name" required /></div>
        <div style="min-width:120px"><label>à¸›à¸£à¸°à¹€à¸ à¸—</label><select name="type"><option value="frame">frame</option></select></div>
        <div style="min-width:110px"><label>à¸£à¸²à¸„à¸²</label><input type="number" min="0" name="price" value="0" required /></div>
        <div><button class="btn" type="submit">à¹€à¸žà¸´à¹ˆà¸¡à¸ªà¸´à¸™à¸„à¹‰à¸²</button></div>
      </form>
    </section>
    <div style="overflow:auto"><table><thead><tr><th>ID</th><th>à¸Šà¸·à¹ˆà¸­</th><th>à¸›à¸£à¸°à¹€à¸ à¸—</th><th>à¸£à¸²à¸„à¸²</th><th>à¸ªà¸–à¸²à¸™à¸°</th><th>à¸ˆà¸±à¸”à¸à¸²à¸£</th></tr></thead><tbody>${rows || '<tr><td colspan="6">à¸¢à¸±à¸‡à¹„à¸¡à¹ˆà¸¡à¸µà¸ªà¸´à¸™à¸„à¹‰à¸²</td></tr>'}</tbody></table></div>
  `);
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
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><h2 style="margin:0">Security & Privacy</h2><div style="display:flex;gap:8px"><a class="btn" href="/profile">à¹‚à¸›à¸£à¹„à¸Ÿà¸¥à¹Œ</a><a class="btn" href="/match">Match</a></div></div>
      ${info ? `<div class="ok">${info}</div>` : ''}
      <section class="card" style="padding:12px;border-radius:12px">
        <strong>Selfie Verify (Demo)</strong>
        <p class="muted">à¹ƒà¸Šà¹‰à¸ªà¸³à¸«à¸£à¸±à¸šà¸¢à¸·à¸™à¸¢à¸±à¸™à¸•à¸±à¸§à¸•à¸™à¹à¸¥à¸°à¹à¸ªà¸”à¸‡à¸›à¹‰à¸²à¸¢ verified</p>
        <form method="POST" action="/security/selfie-verify"><button class="btn btn-primary" type="submit">à¸¢à¸·à¸™à¸¢à¸±à¸™à¸•à¸±à¸§à¸•à¸™à¸”à¹‰à¸§à¸¢ Selfie</button></form>
      </section>
      <section class="card" style="padding:12px;border-radius:12px">
        <strong>Privacy Settings</strong>
        <form method="POST" action="/security/privacy" class="grid" style="margin-top:8px">
          <div><label>à¸à¸²à¸£à¸¡à¸­à¸‡à¹€à¸«à¹‡à¸™à¹‚à¸›à¸£à¹„à¸Ÿà¸¥à¹Œ</label><select name="profileVisibility"><option value="public" ${privacy.profileVisibility==='public'?'selected':''}>public</option><option value="members" ${privacy.profileVisibility==='members'?'selected':''}>members</option><option value="private" ${privacy.profileVisibility==='private'?'selected':''}>private</option></select></div>
          <div><label>à¸ªà¸´à¸—à¸˜à¸´à¹Œà¸ªà¹ˆà¸‡à¸‚à¹‰à¸­à¸„à¸§à¸²à¸¡</label><select name="messagePermission"><option value="all" ${privacy.messagePermission==='all'?'selected':''}>all</option><option value="match_only" ${privacy.messagePermission==='match_only'?'selected':''}>match_only</option><option value="none" ${privacy.messagePermission==='none'?'selected':''}>none</option></select></div>
          <div><label>à¹à¸ªà¸”à¸‡à¸ªà¸–à¸²à¸™à¸°à¸­à¸­à¸™à¹„à¸¥à¸™à¹Œ</label><select name="showOnline"><option value="true" ${privacy.showOnline?'selected':''}>true</option><option value="false" ${!privacy.showOnline?'selected':''}>false</option></select></div>
          <div style="display:flex;align-items:flex-end"><button class="btn btn-primary" type="submit">à¸šà¸±à¸™à¸—à¸¶à¸ Privacy</button></div>
        </form>
      </section>
      <section class="card" style="padding:12px;border-radius:12px">
        <strong>Moderation Rules</strong>
        <ul class="muted">
          <li>Anti-spam: à¸à¸±à¸™à¸à¸”à¸‹à¹‰à¸³à¸–à¸µà¹ˆà¸ à¸²à¸¢à¹ƒà¸™à¹„à¸¡à¹ˆà¸à¸µà¹ˆà¸§à¸´à¸™à¸²à¸—à¸µ</li>
          <li>Content moderation: à¸šà¸¥à¹‡à¸­à¸„à¸„à¸³à¹€à¸ªà¸µà¹ˆà¸¢à¸‡à¸­à¸±à¸•à¹‚à¸™à¸¡à¸±à¸•à¸´</li>
          <li>Report/Block: à¹ƒà¸Šà¹‰à¹„à¸”à¹‰à¹ƒà¸™à¸«à¸™à¹‰à¸²à¹à¸Šà¸—à¹à¸¥à¸°à¹à¸¡à¸•à¸Šà¹Œ</li>
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
    .filter((p) => (search ? (`${p.title || ''} ${p.content || ''} ${p.author || ''}`).toLowerCase().includes(search) : true))
    .sort((a, b) => (b.pinned === a.pinned ? b.createdAt - a.createdAt : (b.pinned ? 1 : -1)));

  const categories = ['general', 'dating', 'friend', 'tips', 'event'];
  const categoryOptions = categories.map((c) => `<option value="${c}" ${category === c ? 'selected' : ''}>${c}</option>`).join('');

  const rows = filtered.map((p) => {
    const comments = Array.isArray(p.comments) ? p.comments : [];
    const commentsHtml = comments.slice(-3).map((c) => `<div class="muted" style="margin-top:6px">• <strong>${c.by}</strong>: ${c.text}</div>`).join('');
    const imageHtml = p.imageUrl ? `<div class="rounded-xl overflow-hidden bg-primary/5 aspect-video w-full"><img src="${p.imageUrl}" style="width:100%;height:100%;object-fit:cover"/></div>` : '';
    const initial = (p.author || 'U').slice(0,1).toUpperCase();
    return `
      <article class="bg-white border border-primary/10 rounded-xl overflow-hidden shadow-sm">
        <div class="p-4" style="display:grid;gap:12px">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:10px">
            <div style="display:flex;align-items:center;gap:10px">
              <div style="width:40px;height:40px;border-radius:999px;background:#fde7f2;display:flex;align-items:center;justify-content:center;font-weight:800">${initial}</div>
              <div><h4 style="margin:0;font-size:14px;font-weight:700">${p.author}</h4><p class="muted" style="font-size:12px;margin:2px 0 0">${new Date(p.createdAt).toLocaleString('th-TH')}</p></div>
            </div>
            ${p.pinned ? '<span class="chip chip-ok">Pinned</span>' : ''}
          </div>
          <p style="margin:0;line-height:1.6">${p.content || ''}</p>
          ${imageHtml}
          <div style="display:flex;justify-content:space-between;align-items:center;padding-top:8px;border-top:1px solid #f3dce8;gap:8px;flex-wrap:wrap">
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              <form method="POST" action="/board/like"><input type="hidden" name="postId" value="${p.id}"/><button class="btn" type="submit">❤ ${p.likes || 0}</button></form>
              <form method="POST" action="/board/report"><input type="hidden" name="postId" value="${p.id}"/><button class="btn" type="submit">🚩 รายงาน</button></form>
              ${me.username === 'admin' ? `<form method="POST" action="/board/pin"><input type="hidden" name="postId" value="${p.id}"/><button class="btn" type="submit">${p.pinned ? 'ยกเลิกปักหมุด' : 'ปักหมุด'}</button></form>` : ''}
            </div>
          </div>
          <form method="POST" action="/board/comment" style="display:flex;gap:8px;flex-wrap:wrap">
            <input type="hidden" name="postId" value="${p.id}"/>
            <input name="comment" placeholder="เขียนความคิดเห็น..." style="flex:1"/>
            <button class="btn" type="submit">ส่ง</button>
          </form>
          <div>${commentsHtml}</div>
        </div>
      </article>
    `;
  }).join('');

  return htmlPage('กระดานสนทนา', `
    <main style="display:flex;justify-content:center;padding:10px 4px">
      <div style="display:flex;width:100%;max-width:1280px;gap:20px">
        <aside class="hidden" style="width:240px;display:none" id="left-col"></aside>

        <section style="flex:1;max-width:760px;display:grid;gap:14px">
          <div class="card" style="padding:12px;display:grid;gap:10px">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap">
              <h2 style="margin:0">กระดานสนทนา</h2>
              <div class="toolbar"><a class="btn" href="/profile">โปรไฟล์</a><a class="btn" href="/match">แมตช์</a><a class="btn btn-danger" href="/logout">ออกจากระบบ</a></div>
            </div>
            ${info ? `<div class="ok">${info}</div>` : ''}
            <form method="POST" action="/board/new" style="display:grid;gap:8px">
              <textarea name="content" rows="4" placeholder="Share your thoughts..." required></textarea>
              <div class="grid">
                <div><label>หมวดหมู่</label><select name="category">${categoryOptions}</select></div>
                <div><label>ลิงก์รูป (ไม่บังคับ)</label><input name="imageUrl" placeholder="https://..."/></div>
              </div>
              <div style="display:flex;justify-content:flex-end"><button class="btn btn-primary" type="submit">Post</button></div>
            </form>
          </div>

          <div class="card" style="padding:12px">
            <form method="GET" action="/board" style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end">
              <div style="min-width:150px"><label>หมวดหมู่</label><select name="category"><option value="all">all</option>${categoryOptions}</select></div>
              <div style="min-width:220px;flex:1"><label>ค้นหา</label><input name="search" value="${q.search || ''}" placeholder="Search community..."/></div>
              <div><button class="btn" type="submit">ค้นหา</button></div>
            </form>
          </div>

          <div style="display:grid;gap:12px">${rows || '<div class="muted">ยังไม่มีโพสต์</div>'}</div>
        </section>

        <aside style="width:280px;display:none" id="right-col"></aside>
      </div>
    </main>
  `);
}
function renderShopPage(me, info = '') {
  const catalog = readJson(storeItemsFile)
    .filter((x) => x && x.active !== false)
    .map((x) => ({ id: x.id, name: x.name, price: Number(x.price || 0) }));
  const owned = Array.isArray(me.framesOwned) ? me.framesOwned : [];
  const cards = catalog.map((f) => {
    const isOwned = owned.includes(f.id);
    const isActive = me.activeFrame === f.id;
    return `
      <div class="card" style="padding:12px;border-radius:12px">
        <strong>${f.name}</strong>
        <div class="muted" style="margin:6px 0">à¸£à¸«à¸±à¸ª ${f.id} â€¢ ${f.price === 0 ? 'à¸Ÿà¸£à¸µ' : f.price + ' coins'}</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          ${isOwned ? `<form method="POST" action="/shop/use"><input type="hidden" name="frameId" value="${f.id}"/><button class="btn" ${isActive ? 'disabled' : ''} type="submit">${isActive ? 'à¸à¸³à¸¥à¸±à¸‡à¹ƒà¸Šà¹‰à¸‡à¸²à¸™' : 'à¹ƒà¸Šà¹‰à¸à¸£à¸­à¸šà¸™à¸µà¹‰'}</button></form>` : `<form method="POST" action="/shop/buy"><input type="hidden" name="frameId" value="${f.id}"/><input type="hidden" name="price" value="${f.price}"/><button class="btn btn-primary" type="submit">à¸‹à¸·à¹‰à¸­</button></form>`}
        </div>
      </div>
    `;
  }).join('');

  const tx = readJson(frameTxFile).filter((t) => t.username === me.username).slice(-30).reverse();
  const rows = tx.map((t) => `<tr><td>${new Date(t.at).toLocaleString('th-TH')}</td><td>${t.type}</td><td>${t.frameId}</td><td>${t.price}</td></tr>`).join('');

  return htmlPage('à¸£à¹‰à¸²à¸™à¸„à¹‰à¸²à¸à¸£à¸­à¸šà¹‚à¸›à¸£à¹„à¸Ÿà¸¥à¹Œ', `
    <main class="card" style="display:grid;gap:12px">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap"><h2 style="margin:0">à¸£à¹‰à¸²à¸™à¸„à¹‰à¸²à¸à¸£à¸­à¸šà¹‚à¸›à¸£à¹„à¸Ÿà¸¥à¹Œ</h2><div style="display:flex;gap:8px"><span class="ok" style="padding:8px 10px">Coins: ${me.coins || 0}</span><a class="btn" href="/profile">à¹‚à¸›à¸£à¹„à¸Ÿà¸¥à¹Œ</a><a class="btn" href="/wallet">Wallet</a></div></div>
      ${info ? `<div class="ok">${info}</div>` : ''}
      <section class="card" style="padding:12px;border-radius:12px">
        <strong>à¸à¸£à¸­à¸šà¸—à¸µà¹ˆà¹ƒà¸Šà¹‰à¸‡à¸²à¸™:</strong> ${me.activeFrame || 'à¸›à¸´à¸”à¸à¸²à¸£à¹ƒà¸Šà¹‰à¸à¸£à¸­à¸š'}
        <form method="POST" action="/shop/disable" style="margin-top:8px"><button class="btn" type="submit">à¸›à¸´à¸”à¸à¸²à¸£à¹ƒà¸Šà¹‰à¸à¸£à¸­à¸š</button></form>
      </section>
      <section class="grid">${cards}</section>
      <section class="card" style="padding:0;border-radius:12px;overflow:hidden">
        <div style="padding:12px"><strong>à¸›à¸£à¸°à¸§à¸±à¸•à¸´à¸‹à¸·à¹‰à¸­à¸à¸£à¸­à¸š</strong></div>
        <div style="overflow:auto;padding:0 12px 12px"><table><thead><tr><th>à¹€à¸§à¸¥à¸²</th><th>à¸›à¸£à¸°à¹€à¸ à¸—</th><th>à¸à¸£à¸­à¸š</th><th>à¸£à¸²à¸„à¸²</th></tr></thead><tbody>${rows || '<tr><td colspan="4">à¸¢à¸±à¸‡à¹„à¸¡à¹ˆà¸¡à¸µà¸£à¸²à¸¢à¸à¸²à¸£</td></tr>'}</tbody></table></div>
      </section>
    </main>
  `);
}

function renderVipPage(me, info = '') {
  const plans = [
    { id: 'vip7', name: 'VIP 7 à¸§à¸±à¸™', price: 99, days: 7 },
    { id: 'vip1m', name: 'VIP 1 à¹€à¸”à¸·à¸­à¸™', price: 299, days: 30 },
    { id: 'vip3m', name: 'VIP 3 à¹€à¸”à¸·à¸­à¸™', price: 699, days: 90 },
    { id: 'vip1y', name: 'VIP 1 à¸›à¸µ', price: 1990, days: 365 },
  ];

  const cards = plans.map((p) => `
    <form method="POST" action="/vip/subscribe" class="card" style="padding:12px;border-radius:12px">
      <input type="hidden" name="planId" value="${p.id}" />
      <input type="hidden" name="days" value="${p.days}" />
      <input type="hidden" name="price" value="${p.price}" />
      <strong>${p.name}</strong>
      <div class="muted" style="margin:6px 0">à¸£à¸²à¸„à¸² ${p.price} à¸šà¸²à¸— â€¢ à¹ƒà¸Šà¹‰à¸‡à¸²à¸™ ${p.days} à¸§à¸±à¸™</div>
      <button class="btn btn-primary" type="submit">à¸ªà¸¡à¸±à¸„à¸£à¹à¸žà¹‡à¸à¹€à¸à¸ˆà¸™à¸µà¹‰</button>
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
        <div><strong>à¸ªà¸–à¸²à¸™à¸°à¸›à¸±à¸ˆà¸ˆà¸¸à¸šà¸±à¸™:</strong> ${me.vipStatus ? 'VIP âœ…' : 'Free'}</div>
        <div class="muted" style="margin-top:4px">VIP à¸«à¸¡à¸”à¸­à¸²à¸¢à¸¸: ${vipUntilText}</div>
        <div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap">
          <span class="ok" style="padding:4px 8px">à¸”à¸¹à¸§à¹ˆà¸²à¹ƒà¸„à¸£à¹„à¸¥à¸à¹Œà¹€à¸£à¸²</span>
          <span class="ok" style="padding:4px 8px">Like à¹„à¸¡à¹ˆà¸ˆà¸³à¸à¸±à¸”</span>
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
      <div class="muted" style="margin:6px 0">${p.coins} coins â€¢ ${p.price} à¸šà¸²à¸—</div>
      <button class="btn btn-primary" type="submit">à¹€à¸•à¸´à¸¡à¹à¸žà¹‡à¸à¸™à¸µà¹‰</button>
    </form>
  `).join('');

  return htmlPage('Wallet / Coins', `
    <main class="card" style="display:grid;gap:12px">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px">
        <h2 style="margin:0">Wallet / Coins</h2>
        <div style="display:flex;gap:8px"><span class="ok" style="padding:8px 10px">à¹€à¸«à¸£à¸µà¸¢à¸à¸„à¸‡à¹€à¸«à¸¥à¸·à¸­: ${me.coins || 0}</span><a class="btn" href="/shop">Shop</a><a class="btn" href="/profile">à¹‚à¸›à¸£à¹„à¸Ÿà¸¥à¹Œ</a><a class="btn" href="/match">Match</a></div>
      </div>
      ${info ? `<div class="ok">${info}</div>` : ''}
      <section><strong>à¹à¸žà¹‡à¸à¹€à¸à¸ˆà¹€à¸«à¸£à¸µà¸¢à¸</strong><div class="grid" style="margin-top:8px">${packCards}</div></section>
      <section class="card" style="padding:0;border-radius:12px;overflow:hidden">
        <div style="padding:12px"><strong>à¸›à¸£à¸°à¸§à¸±à¸•à¸´à¸˜à¸¸à¸£à¸à¸£à¸£à¸¡</strong></div>
        <div style="overflow:auto;padding:0 12px 12px"><table><thead><tr><th>à¹€à¸§à¸¥à¸²</th><th>à¸›à¸£à¸°à¹€à¸ à¸—</th><th>à¸ˆà¸³à¸™à¸§à¸™</th><th>à¸«à¸¡à¸²à¸¢à¹€à¸«à¸•à¸¸</th></tr></thead><tbody>${rows || '<tr><td colspan="4">à¸¢à¸±à¸‡à¹„à¸¡à¹ˆà¸¡à¸µà¸£à¸²à¸¢à¸à¸²à¸£</td></tr>'}</tbody></table></div>
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
    messagesFile,
    giftsFile,
    reportsFile,
    blocksFile,
    boardPostsFile,
    storeItemsFile,
    adminUsersFile,
    memberUsersFile,
    coinTxFile,
    userSessions,
    adminSessions,
    renderRegisterPage: registerPage,
    renderVerifyPage: verifyPage,
    renderLoginPage: loginPage,
    forgotPasswordPage,
    profilePage,
    renderMatchPage,
    renderChatPage,
    renderWalletPage,
    renderVipPage,
    renderShopPage,
    renderBoardPage,
    renderSecurityPage,
    renderAdminLoginPage,
    renderAdminDashboard,
    renderAdminMembers,
    renderAdminVip,
    renderAdminCoins,
    renderAdminFrames,
    renderAdminReports,
    renderAdminThreads,
    renderAdminStore,
    isSpamAction,
    containsBlockedWords,
    frameTxFile,
    getSessionUser,
    getAdminSession,
    createUserId: () => `USR${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
  };

  if (await handleAuthRoutes({ req, res, url, deps })) return;
  if (await handleProfileRoutes({ req, res, url, deps })) return;
  if (await handleMatchRoutes({ req, res, url, deps })) return;
  if (await handleChatRoutes({ req, res, url, deps })) return;
  if (await handleBoardRoutes({ req, res, url, deps })) return;
  if (await handleSecurityAdminRoutes({ req, res, url, deps })) return;
  if (await handleCommerceRoutes({ req, res, url, deps })) return;

  if (url.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'healthy', service: 'sodeclick-v2', module: 'registration+profile' }));
    return;
  }

  if (url.pathname === '/' && req.method === 'GET') {
    const admin = getAdminSession(req);
    if (admin) {
      res.writeHead(302, { Location: '/admin/dashboard' });
      res.end();
      return;
    }
    const me = getSessionUser(req);
    if (me) {
      res.writeHead(302, { Location: '/board' });
      res.end();
      return;
    }
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
    res.end(loginPage('', 'Google login (demo) à¸žà¸£à¹‰à¸­à¸¡à¹€à¸Šà¸·à¹ˆà¸­à¸¡ OAuth à¹ƒà¸™à¸£à¸­à¸šà¸–à¸±à¸”à¹„à¸›'));
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
        res.end(registerPage('à¸à¸£à¸­à¸à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¹„à¸¡à¹ˆà¸„à¸£à¸š'));
        return;
      }

      const users = readJson(usersFile);
      if (users.find((u) => u.email === email || u.username === username)) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(registerPage('à¸­à¸µà¹€à¸¡à¸¥à¸«à¸£à¸·à¸­ Username à¸™à¸µà¹‰à¸–à¸¹à¸à¹ƒà¸Šà¹‰à¹à¸¥à¹‰à¸§'));
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
      res.end(verifyPage(email, '', `OTP à¸ªà¸³à¸«à¸£à¸±à¸šà¹€à¸”à¹‚à¸¡: ${otp}`));
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
        res.end(verifyPage(email, 'OTP à¹„à¸¡à¹ˆà¸–à¸¹à¸à¸•à¹‰à¸­à¸‡'));
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
      res.end(loginPage('', 'à¸ªà¸¡à¸±à¸„à¸£à¸ªà¸¡à¸²à¸Šà¸´à¸à¸ªà¸³à¹€à¸£à¹‡à¸ˆà¹à¸¥à¹‰à¸§ à¸à¸£à¸¸à¸“à¸²à¹€à¸‚à¹‰à¸²à¸ªà¸¹à¹ˆà¸£à¸°à¸šà¸š'));
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
        res.end(loginPage('à¸Šà¸·à¹ˆà¸­à¸œà¸¹à¹‰à¹ƒà¸Šà¹‰à¸«à¸£à¸·à¸­à¸£à¸«à¸±à¸ªà¸œà¹ˆà¸²à¸™à¹„à¸¡à¹ˆà¸–à¸¹à¸à¸•à¹‰à¸­à¸‡'));
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
      res.end(profilePage(users[idx], 'à¸šà¸±à¸™à¸—à¸¶à¸à¹‚à¸›à¸£à¹„à¸Ÿà¸¥à¹Œà¹€à¸£à¸µà¸¢à¸šà¸£à¹‰à¸­à¸¢à¹à¸¥à¹‰à¸§'));
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
        res.end(forgotPasswordPage('à¹„à¸¡à¹ˆà¸žà¸šà¸­à¸µà¹€à¸¡à¸¥à¸™à¸µà¹‰à¹ƒà¸™à¸£à¸°à¸šà¸š'));
        return;
      }
      const temp = Math.random().toString(36).slice(2, 10);
      users[idx].password = temp;
      users[idx].updatedAt = Date.now();
      writeJson(usersFile, users);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(forgotPasswordPage('', `à¸£à¸µà¹€à¸‹à¹‡à¸•à¸ªà¸³à¹€à¸£à¹‡à¸ˆ (demo) à¸£à¸«à¸±à¸ªà¹ƒà¸«à¸¡à¹ˆ: ${temp}`));
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
        res.end(renderMatchPage(me, {}, 'à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¹„à¸¡à¹ˆà¸–à¸¹à¸à¸•à¹‰à¸­à¸‡'));
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
          res.end(renderMatchPage(users[meIdx], {}, 'Free à¸ˆà¸³à¸à¸±à¸” Like à¸§à¸±à¸™à¸¥à¸° 30 à¸„à¸£à¸±à¹‰à¸‡ à¸à¸£à¸¸à¸“à¸²à¸­à¸±à¸›à¹€à¸à¸£à¸” VIP'));
          return;
        }
        if (type === 'like' || type === 'super_like') users[meIdx].dailyLikeCount += 1;
        writeJson(usersFile, users);
      }

      likes.unshift({ id: `L${Date.now()}`, from: me.username, to: target, type, at: Date.now() });
      writeJson(likesFile, likes);

      let info = `à¸ªà¹ˆà¸‡ ${type} à¹„à¸›à¸¢à¸±à¸‡ ${target} à¹à¸¥à¹‰à¸§`;
      if (type !== 'pass') {
        const reciprocal = likes.find((x) => x.from === target && x.to === me.username && (x.type === 'like' || x.type === 'super_like'));
        if (reciprocal) {
          const matches = readJson(matchesFile);
          const exists = matches.find((m) => [m.userA, m.userB].sort().join('|') === [me.username, target].sort().join('|'));
          if (!exists) {
            matches.unshift({ id: `M${Date.now()}`, userA: me.username, userB: target, at: Date.now() });
            writeJson(matchesFile, matches);
          }
          info = `ðŸŽ‰ Match à¸ªà¸³à¹€à¸£à¹‡à¸ˆà¸à¸±à¸š ${target}`;
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
        res.end(renderMatchPage(users[idx] || me, {}, 'à¹€à¸«à¸£à¸µà¸¢à¸à¹„à¸¡à¹ˆà¸žà¸­à¸ªà¸³à¸«à¸£à¸±à¸š Boost (à¸•à¹‰à¸­à¸‡à¹ƒà¸Šà¹‰ 30)'));
        return;
      }
      users[idx].coins = (users[idx].coins || 0) - boostCost;
      users[idx].boostUntil = Date.now() + 30 * 60 * 1000;
      writeJson(usersFile, users);
      const tx = readJson(coinTxFile);
      tx.push({ id: `CTX${Date.now()}`, username: me.username, type: 'boost', amount: -boostCost, note: 'Boost Profile 30 à¸™à¸²à¸—à¸µ', at: Date.now() });
      writeJson(coinTxFile, tx);
    }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(renderMatchPage(users[idx] || me, {}, 'Boost à¹‚à¸›à¸£à¹„à¸Ÿà¸¥à¹Œà¹à¸¥à¹‰à¸§ (30 à¸™à¸²à¸—à¸µ)'));
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
        res.end(renderChatPage(me, matchId, 'à¸à¸£à¸¸à¸“à¸²à¸žà¸´à¸¡à¸žà¹Œà¸‚à¹‰à¸­à¸„à¸§à¸²à¸¡à¸à¹ˆà¸­à¸™à¸ªà¹ˆà¸‡'));
        return;
      }
      if (isSpamAction(`chat:send:${me.username}`, 1200)) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(renderChatPage(me, matchId, 'à¸ªà¹ˆà¸‡à¸‚à¹‰à¸­à¸„à¸§à¸²à¸¡à¹€à¸£à¹‡à¸§à¹€à¸à¸´à¸™à¹„à¸› à¸à¸£à¸¸à¸“à¸²à¸£à¸­à¸ªà¸±à¸à¸„à¸£à¸¹à¹ˆ'));
        return;
      }
      if (containsBlockedWords(txt)) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(renderChatPage(me, matchId, 'à¸‚à¹‰à¸­à¸„à¸§à¸²à¸¡à¸¡à¸µà¹€à¸™à¸·à¹‰à¸­à¸«à¸²à¸—à¸µà¹ˆà¹„à¸¡à¹ˆà¹€à¸«à¸¡à¸²à¸°à¸ªà¸¡'));
        return;
      }
      const messages = readJson(messagesFile);
      messages.push({ id: `MSG${Date.now()}`, matchId, sender: me.username, text: txt, at: Date.now(), read: false });
      writeJson(messagesFile, messages);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(renderChatPage(me, matchId, 'à¸ªà¹ˆà¸‡à¸‚à¹‰à¸­à¸„à¸§à¸²à¸¡à¸ªà¸³à¹€à¸£à¹‡à¸ˆ'));
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
        res.end(renderChatPage(me, matchId, 'à¹€à¸«à¸£à¸µà¸¢à¸à¹„à¸¡à¹ˆà¸žà¸­à¸ªà¸³à¸«à¸£à¸±à¸šà¸ªà¹ˆà¸‡à¸‚à¸­à¸‡à¸‚à¸§à¸±à¸'));
        return;
      }
      users[idx].coins = (users[idx].coins || 0) - price;
      writeJson(usersFile, users);
      const gifts = readJson(giftsFile);
      gifts.push({ id: `GTR${Date.now()}`, matchId, from: me.username, giftId, price, at: Date.now() });
      writeJson(giftsFile, gifts);
      const tx = readJson(coinTxFile);
      tx.push({ id: `CTX${Date.now()}`, username: me.username, type: 'gift', amount: -price, note: `à¸ªà¹ˆà¸‡à¸‚à¸­à¸‡à¸‚à¸§à¸±à¸ ${giftId}`, at: Date.now() });
      writeJson(coinTxFile, tx);
      const messages = readJson(messagesFile);
      messages.push({ id: `MSG${Date.now()}`, matchId, sender: me.username, text: `à¸ªà¹ˆà¸‡à¸‚à¸­à¸‡à¸‚à¸§à¸±à¸ ${giftId}`, at: Date.now(), read: false });
      writeJson(messagesFile, messages);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(renderChatPage(users[idx], matchId, 'à¸ªà¹ˆà¸‡à¸‚à¸­à¸‡à¸‚à¸§à¸±à¸à¸ªà¸³à¹€à¸£à¹‡à¸ˆ'));
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
        res.end(renderVipPage(me, 'à¹à¸žà¹‡à¸à¹€à¸à¸ˆà¹„à¸¡à¹ˆà¸–à¸¹à¸à¸•à¹‰à¸­à¸‡'));
        return;
      }
      users[idx].vipStatus = true;
      users[idx].vipUntil = Date.now() + days * 24 * 60 * 60 * 1000;
      users[idx].updatedAt = Date.now();
      writeJson(usersFile, users);
      const tx = readJson(coinTxFile);
      tx.push({ id: `CTX${Date.now()}`, username: me.username, type: 'vip_subscribe', amount: 0, note: `à¸ªà¸¡à¸±à¸„à¸£ VIP ${days} à¸§à¸±à¸™ à¸£à¸²à¸„à¸² ${price} à¸šà¸²à¸—`, at: Date.now() });
      writeJson(coinTxFile, tx);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(renderVipPage(users[idx], 'à¸ªà¸¡à¸±à¸„à¸£ VIP à¸ªà¸³à¹€à¸£à¹‡à¸ˆ'));
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
        res.end(renderShopPage(me, 'à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¹„à¸¡à¹ˆà¸–à¸¹à¸à¸•à¹‰à¸­à¸‡'));
        return;
      }
      users[idx].framesOwned = Array.isArray(users[idx].framesOwned) ? users[idx].framesOwned : ['F001'];
      if (users[idx].framesOwned.includes(frameId)) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(renderShopPage(users[idx], 'à¸„à¸¸à¸“à¸‹à¸·à¹‰à¸­à¸à¸£à¸­à¸šà¸™à¸µà¹‰à¹à¸¥à¹‰à¸§'));
        return;
      }
      if ((users[idx].coins || 0) < price) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(renderShopPage(users[idx], 'à¹€à¸«à¸£à¸µà¸¢à¸à¹„à¸¡à¹ˆà¸žà¸­'));
        return;
      }
      users[idx].coins = (users[idx].coins || 0) - price;
      users[idx].framesOwned.push(frameId);
      users[idx].updatedAt = Date.now();
      writeJson(usersFile, users);
      const tx = readJson(coinTxFile);
      tx.push({ id: `CTX${Date.now()}`, username: me.username, type: 'buy_frame', amount: -price, note: `à¸‹à¸·à¹‰à¸­à¸à¸£à¸­à¸š ${frameId}`, at: Date.now() });
      writeJson(coinTxFile, tx);
      const ftx = readJson(frameTxFile);
      ftx.push({ id: `FTX${Date.now()}`, username: me.username, type: 'buy', frameId, price, at: Date.now() });
      writeJson(frameTxFile, ftx);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(renderShopPage(users[idx], `à¸‹à¸·à¹‰à¸­à¸à¸£à¸­à¸š ${frameId} à¸ªà¸³à¹€à¸£à¹‡à¸ˆ`));
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
        res.end(renderShopPage(users[idx], 'à¸„à¸¸à¸“à¸¢à¸±à¸‡à¹„à¸¡à¹ˆà¹„à¸”à¹‰à¸‹à¸·à¹‰à¸­à¸à¸£à¸­à¸šà¸™à¸µà¹‰'));
        return;
      }
      users[idx].activeFrame = frameId;
      users[idx].updatedAt = Date.now();
      writeJson(usersFile, users);
      const ftx = readJson(frameTxFile);
      ftx.push({ id: `FTX${Date.now()}`, username: me.username, type: 'use', frameId, price: 0, at: Date.now() });
      writeJson(frameTxFile, ftx);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(renderShopPage(users[idx], `à¹€à¸›à¸¥à¸µà¹ˆà¸¢à¸™à¸¡à¸²à¹ƒà¸Šà¹‰à¸à¸£à¸­à¸š ${frameId} à¹à¸¥à¹‰à¸§`));
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
      res.end(renderShopPage(users[idx], 'à¸›à¸´à¸”à¸à¸²à¸£à¹ƒà¸Šà¹‰à¸à¸£à¸­à¸šà¹à¸¥à¹‰à¸§'));
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
      res.end(renderAdminLoginPage('à¸Šà¸·à¹ˆà¸­à¸œà¸¹à¹‰à¹ƒà¸Šà¹‰à¸«à¸£à¸·à¸­à¸£à¸«à¸±à¸ªà¸œà¹ˆà¸²à¸™à¹„à¸¡à¹ˆà¸–à¸¹à¸à¸•à¹‰à¸­à¸‡'));
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
      res.end(renderSecurityPage(users[idx], 'à¸¢à¸·à¸™à¸¢à¸±à¸™à¸•à¸±à¸§à¸•à¸™à¸”à¹‰à¸§à¸¢ Selfie à¸ªà¸³à¹€à¸£à¹‡à¸ˆ (demo)'));
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
        res.end(renderSecurityPage(users[idx], 'à¸šà¸±à¸™à¸—à¸¶à¸ Privacy Settings à¹à¸¥à¹‰à¸§'));
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
        res.end(renderBoardPage(me, {}, 'à¸à¸£à¸­à¸à¸«à¸±à¸§à¸‚à¹‰à¸­à¹à¸¥à¸°à¹€à¸™à¸·à¹‰à¸­à¸«à¸²à¹ƒà¸«à¹‰à¸„à¸£à¸š'));
        return;
      }
      if (isSpamAction(`board:new:${me.username}`, 3000)) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(renderBoardPage(me, {}, 'à¸„à¸¸à¸“à¹‚à¸žà¸ªà¸•à¹Œà¸–à¸µà¹ˆà¹€à¸à¸´à¸™à¹„à¸› à¸à¸£à¸¸à¸“à¸²à¸£à¸­à¸ªà¸±à¸à¸„à¸£à¸¹à¹ˆ'));
        return;
      }
      if (containsBlockedWords(title) || containsBlockedWords(content)) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(renderBoardPage(me, {}, 'à¹€à¸™à¸·à¹‰à¸­à¸«à¸²à¸¡à¸µà¸„à¸³à¸—à¸µà¹ˆà¹„à¸¡à¹ˆà¹€à¸«à¸¡à¸²à¸°à¸ªà¸¡ à¸£à¸°à¸šà¸šà¹„à¸¡à¹ˆà¸­à¸™à¸¸à¸à¸²à¸•à¹ƒà¸«à¹‰à¹‚à¸žà¸ªà¸•à¹Œ'));
        return;
      }
      const posts = readJson(boardPostsFile);
      posts.push({ id: `P${Date.now()}`, author: me.username, title, content, category, likes: 0, comments: [], reports: 0, pinned: false, createdAt: Date.now() });
      writeJson(boardPostsFile, posts);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(renderBoardPage(me, {}, 'à¹‚à¸žà¸ªà¸•à¹Œà¸à¸£à¸°à¸—à¸¹à¹‰à¸ªà¸³à¹€à¸£à¹‡à¸ˆ'));
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
        res.end(renderWalletPage(me, 'à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¹à¸žà¹‡à¸à¹€à¸à¸ˆà¹„à¸¡à¹ˆà¸–à¸¹à¸à¸•à¹‰à¸­à¸‡'));
        return;
      }
      users[idx].coins = (users[idx].coins || 0) + addCoins;
      users[idx].updatedAt = Date.now();
      writeJson(usersFile, users);

      const tx = readJson(coinTxFile);
      tx.push({ id: `CTX${Date.now()}`, username: me.username, type: 'topup', amount: addCoins, note: `à¹€à¸•à¸´à¸¡à¹€à¸«à¸£à¸µà¸¢à¸à¸£à¸²à¸„à¸² ${price} à¸šà¸²à¸—`, at: Date.now() });
      writeJson(coinTxFile, tx);

      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(renderWalletPage(users[idx], `à¹€à¸•à¸´à¸¡à¹€à¸«à¸£à¸µà¸¢à¸à¸ªà¸³à¹€à¸£à¹‡à¸ˆ +${addCoins}`));
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(htmlPage('404', '<main class="card"><h2>404 - Not Found</h2></main>'));
});

server.listen(port, () => {
  console.log(`SodeClick V2 listening on ${port}`);
});


