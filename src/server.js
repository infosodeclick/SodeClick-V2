const http = require('http');
const crypto = require('crypto');

const port = process.env.PORT || 3000;

// ===== Admin Accounts (MVP in-memory) =====
// NOTE: For production should move to DB + password hash
const adminAccounts = [
  { username: 'admin', password: '123456', role: 'super_admin', displayName: 'Super Admin' },
  { username: 'manager', password: '123456', role: 'admin', displayName: 'Admin Manager' },
  { username: 'staff', password: '123456', role: 'staff', displayName: 'Staff' },
];

const sessions = new Map();
const userSessions = new Map();

let members = [
  { id: 'U001', name: 'Nina', email: 'nina@example.com', gender: 'female', status: 'active', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3) },
  { id: 'U002', name: 'Mild', email: 'mild@example.com', gender: 'female', status: 'active', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2) },
  { id: 'U003', name: 'Beam', email: 'beam@example.com', gender: 'male', status: 'blocked', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7) },
  { id: 'U004', name: 'Fah', email: 'fah@example.com', gender: 'female', status: 'active', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 40) },
  { id: 'U005', name: 'Pear', email: 'pear@example.com', gender: 'female', status: 'active', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 200) },
  { id: 'U006', name: 'Ton', email: 'ton@example.com', gender: 'male', status: 'active', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 15) },
  { id: 'U007', name: 'Mint', email: 'mint@example.com', gender: 'other', status: 'active', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1) },
];

let auditLogs = [];

function addAudit(action, actor, details = '') {
  auditLogs.unshift({
    id: crypto.randomBytes(4).toString('hex'),
    action,
    actor: actor || 'system',
    details,
    at: new Date(),
  });

  if (auditLogs.length > 500) {
    auditLogs = auditLogs.slice(0, 500);
  }
}

function parseCookies(req) {
  const cookie = req.headers.cookie || '';
  return cookie.split(';').reduce((acc, part) => {
    const [k, ...v] = part.trim().split('=');
    if (!k) return acc;
    acc[k] = decodeURIComponent(v.join('='));
    return acc;
  }, {});
}

function parseBody(req) {
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 1e6) req.destroy();
    });
    req.on('end', () => {
      const params = new URLSearchParams(raw);
      const data = {};
      for (const [k, v] of params.entries()) data[k] = v;
      resolve(data);
    });
  });
}

function getSession(req) {
  const sid = parseCookies(req).sid;
  if (!sid) return null;
  return sessions.get(sid) || null;
}

function requireAuth(req, res) {
  const session = getSession(req);
  if (!session) {
    redirect(res, '/admin/login');
    return null;
  }
  return session;
}

function getUserSession(req) {
  const sid = parseCookies(req).user_sid;
  if (!sid) return null;
  return userSessions.get(sid) || null;
}

function requireUserAuth(req, res) {
  const session = getUserSession(req);
  if (!session) {
    redirect(res, '/login');
    return null;
  }
  return session;
}

function hasPermission(role, action) {
  const matrix = {
    super_admin: ['view_dashboard', 'view_members', 'edit_member', 'block_member', 'delete_member', 'view_audit'],
    admin: ['view_dashboard', 'view_members', 'edit_member', 'block_member', 'view_audit'],
    staff: ['view_dashboard', 'view_members'],
  };

  return matrix[role]?.includes(action);
}

function requirePermission(session, action, res) {
  if (!hasPermission(session.role, action)) {
    res.writeHead(403, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(htmlPage('403 - Forbidden', `
      <main class="card">
        <h2>403 - à¹„à¸¡à¹ˆà¸¡à¸µà¸ªà¸´à¸—à¸˜à¸´à¹Œà¹€à¸‚à¹‰à¸²à¸–à¸¶à¸‡</h2>
        <p>à¸šà¸±à¸à¸Šà¸µà¸‚à¸­à¸‡à¸„à¸¸à¸“ (${session.username}) à¹„à¸¡à¹ˆà¸¡à¸µà¸ªà¸´à¸—à¸˜à¸´à¹Œà¸ªà¸³à¸«à¸£à¸±à¸šà¸„à¸³à¸ªà¸±à¹ˆà¸‡à¸™à¸µà¹‰</p>
        <a class="btn" href="/admin/dashboard">à¸à¸¥à¸±à¸šà¹à¸”à¸Šà¸šà¸­à¸£à¹Œà¸”</a>
      </main>
    `));
    return false;
  }
  return true;
}

function htmlPage(title, body) {
  return `<!doctype html>
<html lang="th">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${title}</title>
  <style>
    :root {
      --blue: #60a5fa;
      --blue-soft: #dbeafe;
      --pink: #f9a8d4;
      --pink-soft: #fce7f3;
      --text: #1f2a44;
      --white: #ffffff;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
      color: var(--text);
      background: linear-gradient(140deg, #ffffff 0%, #eff6ff 45%, #fdf2f8 100%);
      min-height: 100vh;
      padding: clamp(12px, 2.5vw, 24px);
    }
    .wrap { max-width: 1160px; margin: 0 auto; }
    .admin-layout {
      display: grid;
      grid-template-columns: 220px 1fr;
      gap: 12px;
      align-items: start;
    }
    .sidebar {
      position: sticky;
      top: 12px;
      background:#fff;
      border:1px solid #e5e7eb;
      border-radius: 16px;
      box-shadow: 0 12px 28px rgba(96,165,250,.08);
      padding: 10px;
    }
    .side-title { font-size: 12px; color:#64748b; margin: 4px 8px 8px; }
    .side-link {
      display:flex;
      align-items:center;
      gap:8px;
      border-radius:10px;
      padding:10px 10px;
      text-decoration:none;
      color:#334155;
      font-weight:700;
      margin-bottom:4px;
    }
    .side-link:hover { background:#f8fafc; }
    .side-link.active {
      background: linear-gradient(135deg,var(--blue-soft),var(--pink-soft));
      color:#1e3a8a;
      border:1px solid #bfdbfe;
    }
    .card {
      background: #fff;
      border: 1px solid #e5e7eb;
      border-radius: 16px;
      box-shadow: 0 12px 28px rgba(96,165,250,.12);
      padding: 16px;
      margin-bottom: 12px;
    }
    .head {
      display:flex; justify-content:space-between; align-items:center; gap:10px;
      margin-bottom: 12px;
      flex-wrap: wrap;
    }
    .btn {
      display:inline-flex; align-items:center; justify-content:center;
      border:1px solid #cbd5e1; background:#fff; color:#334155;
      border-radius:10px; padding:8px 12px; text-decoration:none; font-weight:700;
      cursor:pointer;
    }
    .btn[disabled] { opacity:.5; cursor:not-allowed; }
    .btn-primary { background: linear-gradient(135deg,var(--blue),var(--pink)); color:#fff; border:0; }
    .grid { display:grid; grid-template-columns: repeat(auto-fit,minmax(180px,1fr)); gap:10px; }
    .stat { border:1px solid #e5e7eb; border-radius:12px; background:#fff; padding:12px; }
    .k { font-size: 12px; color:#64748b; }
    .v { font-size: 24px; font-weight:800; color:#1e3a8a; }
    .topline { display:flex; flex-wrap:wrap; gap:8px; align-items:center; }
    .pill { background:#eef2ff; color:#3730a3; border-radius:999px; padding:4px 10px; font-size:12px; font-weight:700; }
    table { width:100%; border-collapse: collapse; min-width: 760px; }
    th,td { border-bottom:1px solid #e5e7eb; text-align:left; padding:10px 8px; font-size:14px; vertical-align: top; }
    .actions { display:flex; gap:6px; flex-wrap:wrap; }
    input, select {
      width:100%; padding:8px; border:1px solid #cbd5e1; border-radius:8px;
      font-size: 14px;
    }
    .login {
      max-width: 420px; margin: 8vh auto 0; background:#fff; border:1px solid #dbeafe;
      border-radius: 16px; padding:20px; box-shadow: 0 12px 30px rgba(96,165,250,.14);
    }
    .muted { color:#64748b; font-size:13px; }
    .filters {
      display:grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap:8px;
      align-items:end;
    }
    .log-row { display:grid; grid-template-columns: 180px 160px 1fr; gap:8px; padding:10px; border-bottom:1px solid #e5e7eb; font-size:14px; }
    @media (max-width: 760px) {
      .admin-layout { grid-template-columns: 1fr; }
      .sidebar { position: static; }
      .filters { grid-template-columns: 1fr; }
      .log-row { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <div class="wrap">${body}</div>
</body>
</html>`;
}

function adminShell(session, activeKey, content) {
  const item = (key, href, label) => `<a class="side-link ${activeKey === key ? 'active' : ''}" href="${href}">${label}</a>`;
  return `
    <div class="admin-layout">
      <aside class="sidebar">
        <div class="side-title">à¹€à¸¡à¸™à¸¹à¸«à¸¥à¸±à¸‡à¸šà¹‰à¸²à¸™</div>
        ${item('dashboard', '/admin/dashboard', 'à¸ à¸²à¸žà¸£à¸§à¸¡')}
        ${item('members', '/admin/members', 'à¸ªà¸¡à¸²à¸Šà¸´à¸')}
        ${item('revenue', '/admin/revenue', 'à¸£à¸²à¸¢à¹„à¸”à¹‰')}
        ${item('promotions', '/admin/promotions', 'à¹‚à¸›à¸£à¹‚à¸¡à¸Šà¸±à¹ˆà¸™')}
        ${item('activities', '/admin/activities', 'à¸à¸´à¸ˆà¸à¸£à¸£à¸¡')}
        <a class="side-link" href="/admin/logout">à¸­à¸­à¸à¸ˆà¸²à¸à¸£à¸°à¸šà¸š</a>
      </aside>
      <section>${content}</section>
    </div>
  `;
}

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function countSince(date) {
  return members.filter((m) => m.createdAt >= date).length;
}

function renderHome() {
  return htmlPage('SodeClick V2', `
    <main class="card">
      <div class="head">
        <h2 style="margin:0">SodeClick V2</h2>
        <a class="btn btn-primary" href="/login">Login</a>
      </div>
      <p>à¹ƒà¸Šà¹‰ Login à¹€à¸”à¸µà¸¢à¸§ à¸£à¸°à¸šà¸šà¸ˆà¸°à¸•à¸£à¸§à¸ˆà¸ªà¸´à¸—à¸˜à¸´à¹Œà¸­à¸±à¸•à¹‚à¸™à¸¡à¸±à¸•à¸´ (à¸œà¸¹à¹‰à¸¡à¸µà¸ªà¸´à¸—à¸˜à¸´à¹Œà¹€à¸‚à¹‰à¸²à¸«à¸¥à¸±à¸‡à¸šà¹‰à¸²à¸™à¹„à¸”à¹‰à¸—à¸±à¸™à¸—à¸µ)</p>
      <div class="grid" style="margin-top:12px">
        <div class="stat"><div class="k">à¹‚à¸„à¸£à¸‡à¸£à¸°à¸šà¸š</div><div class="v">à¸žà¸£à¹‰à¸­à¸¡</div></div>
        <div class="stat"><div class="k">Health</div><div class="v">OK</div></div>
      </div>
    </main>
  `);
}

function renderAdminLogin(error = '') {
  return htmlPage('Admin Login - SodeClick V2', `
    <div class="login">
      <h2 style="margin-top:0">à¹€à¸‚à¹‰à¸²à¸ªà¸¹à¹ˆà¸£à¸°à¸šà¸šà¸«à¸¥à¸±à¸‡à¸šà¹‰à¸²à¸™</h2>
      ${error ? `<p style="color:#dc2626;font-weight:700">${error}</p>` : ''}
      <form method="POST" action="/admin/login">
        <label>Username</label>
        <input name="username" required />
        <label style="margin-top:8px;display:block">Password</label>
        <input name="password" type="password" required />
        <button class="btn btn-primary" style="width:100%;margin-top:12px" type="submit">Login</button>
      </form>
      <p class="muted">à¸šà¸±à¸à¸Šà¸µà¸—à¸”à¸ªà¸­à¸š: admin/123456, manager/123456, staff/123456</p>
    </div>
  `);
}

function renderUserLogin(error = '') {
  return htmlPage('Login - SodeClick V2', `
    <div class="login">
      <h2 style="margin-top:0">à¹€à¸‚à¹‰à¸²à¸ªà¸¹à¹ˆà¸£à¸°à¸šà¸šà¸œà¸¹à¹‰à¹ƒà¸Šà¹‰à¸‡à¸²à¸™</h2>
      ${error ? `<p style="color:#dc2626;font-weight:700">${error}</p>` : ''}
      <form method="POST" action="/login">
        <label>Username</label>
        <input name="username" required />
        <label style="margin-top:8px;display:block">Password</label>
        <input name="password" type="password" required />
        <button class="btn btn-primary" style="width:100%;margin-top:12px" type="submit">à¹€à¸‚à¹‰à¸²à¸ªà¸¹à¹ˆà¸£à¸°à¸šà¸š</button>
      </form>
      <p class="muted">à¸šà¸±à¸à¸Šà¸µà¸•à¸±à¸§à¸­à¸¢à¹ˆà¸²à¸‡à¹€à¸”à¹‚à¸¡: user / 123456 à¹à¸¥à¸° admin / 123456</p>
    </div>
  `);
}

function renderUserApp(session) {
  return htmlPage('หน้าบ้าน - SodeClick V2', `
    <main class="card">
      <div class="head">
        <h2 style="margin:0">กระดานโต้ตอบ</h2>
        <a class="btn" href="/logout">ออกจากระบบ</a>
      </div>

      <section class="stat" style="margin-bottom:12px">
        <strong>ยินดีต้อนรับ, ${session.displayName || session.username}</strong>
        <p class="muted" style="margin:6px 0 0">ตอนนี้ระบบกลับมาใช้งานได้ปกติแล้ว</p>
      </section>

      <section class="stat" style="margin-bottom:12px">
        <strong>โพสต์ใหม่</strong>
        <form method="GET" action="/app" style="display:grid;gap:8px;margin-top:8px">
          <textarea placeholder="โพสต์อะไรดีวันนี้..." style="width:100%;min-height:90px;border:1px solid #d1d5db;border-radius:10px;padding:10px"></textarea>
          <div style="display:flex;justify-content:flex-end">
            <button class="btn btn-primary" type="submit">โพสต์</button>
          </div>
        </form>
      </section>

      <section class="stat">
        <strong>ฟีดตัวอย่าง</strong>
        <div style="margin-top:8px;display:grid;gap:8px">
          <div style="border:1px solid #e5e7eb;border-radius:10px;padding:10px">GN: คิดถึงมากไหมคะ 😂</div>
          <div style="border:1px solid #e5e7eb;border-radius:10px;padding:10px">นกฮูกปลดแอก: เขาอาจจะคิดว่าพี่ขำหมดทุกคนก็ได้</div>
        </div>
      </section>
    </main>
  `);
}
function renderAdminDashboard(session) {
  const now = new Date();
  const day = startOfDay(now);
  const week = new Date(day); week.setDate(week.getDate() - 7);
  const month = new Date(day); month.setMonth(month.getMonth() - 1);
  const year = new Date(day); year.setFullYear(year.getFullYear() - 1);

  const total = members.length;
  const daily = countSince(day);
  const weekly = countSince(week);
  const monthly = countSince(month);
  const yearly = countSince(year);

  const latestMembers = [...members]
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 5)
    .map((m) => `<tr><td>${m.id}</td><td>${m.name}</td><td>${m.status === 'blocked' ? 'à¸šà¸¥à¹‡à¸­à¸' : 'à¸›à¸à¸•à¸´'}</td><td>${m.createdAt.toLocaleDateString('th-TH')}</td></tr>`)
    .join('');

  const recentLogs = auditLogs
    .slice(0, 6)
    .map((log) => `<tr><td>${log.at.toLocaleString('th-TH')}</td><td>${log.actor}</td><td>${log.action}</td><td>${log.details || '-'}</td></tr>`)
    .join('');

  return htmlPage('Dashboard - Admin', `
    <main class="card">
      <div class="head">
        <div class="topline">
          <h2 style="margin:0">à¹à¸”à¸Šà¸šà¸­à¸£à¹Œà¸”à¸«à¸¥à¸±à¸‡à¸šà¹‰à¸²à¸™</h2>
          <span class="pill">à¸œà¸¹à¹‰à¹ƒà¸Šà¹‰: ${session.username}</span>
          <span class="pill">à¸ªà¸´à¸—à¸˜à¸´à¹Œ: ${session.role}</span>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <a class="btn" href="/admin/members">à¸ˆà¸±à¸”à¸à¸²à¸£à¸ªà¸¡à¸²à¸Šà¸´à¸</a>
          <a class="btn" href="/admin/audit">Audit Log</a>
          <a class="btn" href="/admin/logout">à¸­à¸­à¸à¸ˆà¸²à¸à¸£à¸°à¸šà¸š</a>
        </div>
      </div>

      <div class="grid" style="margin-bottom:14px">
        <div class="stat"><div class="k">à¸ªà¸¡à¸²à¸Šà¸´à¸à¸—à¸±à¹‰à¸‡à¸«à¸¡à¸”</div><div class="v">${total}</div></div>
        <div class="stat"><div class="k">à¸£à¸²à¸¢à¸§à¸±à¸™</div><div class="v">${daily}</div></div>
        <div class="stat"><div class="k">à¸£à¸²à¸¢à¸ªà¸±à¸›à¸”à¸²à¸«à¹Œ</div><div class="v">${weekly}</div></div>
        <div class="stat"><div class="k">à¸£à¸²à¸¢à¹€à¸”à¸·à¸­à¸™</div><div class="v">${monthly}</div></div>
        <div class="stat"><div class="k">à¸£à¸²à¸¢à¸›à¸µ</div><div class="v">${yearly}</div></div>
      </div>

      <div class="grid" style="grid-template-columns: 1.2fr 1fr; gap:12px; align-items:start;">
        <section class="stat" style="padding:0;overflow:hidden;">
          <div style="padding:12px 12px 0"><strong>à¸ªà¸¡à¸²à¸Šà¸´à¸à¸ªà¸¡à¸±à¸„à¸£à¸¥à¹ˆà¸²à¸ªà¸¸à¸”</strong></div>
          <div style="overflow:auto; padding:8px 12px 12px;">
            <table>
              <thead><tr><th>ID</th><th>à¸Šà¸·à¹ˆà¸­</th><th>à¸ªà¸–à¸²à¸™à¸°</th><th>à¸§à¸±à¸™à¸—à¸µà¹ˆà¸ªà¸¡à¸±à¸„à¸£</th></tr></thead>
              <tbody>${latestMembers || '<tr><td colspan="4">à¸¢à¸±à¸‡à¹„à¸¡à¹ˆà¸¡à¸µà¸‚à¹‰à¸­à¸¡à¸¹à¸¥</td></tr>'}</tbody>
            </table>
          </div>
        </section>

        <section class="stat" style="padding:0;overflow:hidden;">
          <div style="padding:12px 12px 0"><strong>à¸à¸´à¸ˆà¸à¸£à¸£à¸¡à¸¥à¹ˆà¸²à¸ªà¸¸à¸” (Audit)</strong></div>
          <div style="overflow:auto; padding:8px 12px 12px;">
            <table>
              <thead><tr><th>à¹€à¸§à¸¥à¸²</th><th>à¸œà¸¹à¹‰à¹ƒà¸Šà¹‰</th><th>à¹€à¸«à¸•à¸¸à¸à¸²à¸£à¸“à¹Œ</th><th>à¸£à¸²à¸¢à¸¥à¸°à¹€à¸­à¸µà¸¢à¸”</th></tr></thead>
              <tbody>${recentLogs || '<tr><td colspan="4">à¸¢à¸±à¸‡à¹„à¸¡à¹ˆà¸¡à¸µà¸›à¸£à¸°à¸§à¸±à¸•à¸´</td></tr>'}</tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  `);
}

function renderAdminDashboardV2(session, queryParams) {
  const range = (queryParams.get('range') || 'month').trim(); // day|week|month|year|custom
  const status = (queryParams.get('status') || 'all').trim(); // all|active|blocked
  const gender = (queryParams.get('gender') || 'all').trim(); // all|male|female|other
  const fromDateStr = (queryParams.get('from') || '').trim();
  const toDateStr = (queryParams.get('to') || '').trim();

  const now = new Date();
  const day = startOfDay(now);
  const week = new Date(day); week.setDate(week.getDate() - 7);
  const month = new Date(day); month.setMonth(month.getMonth() - 1);
  const year = new Date(day); year.setFullYear(year.getFullYear() - 1);

  let customFrom = null;
  let customTo = null;
  if (fromDateStr) {
    const f = new Date(fromDateStr);
    if (!Number.isNaN(f.getTime())) customFrom = startOfDay(f);
  }
  if (toDateStr) {
    const t = new Date(toDateStr);
    if (!Number.isNaN(t.getTime())) {
      customTo = startOfDay(t);
      customTo.setDate(customTo.getDate() + 1);
    }
  }

  const scopedMembers = members.filter((m) => {
    const statusPass = status === 'all' ? true : m.status === status;
    const genderPass = gender === 'all' ? true : m.gender === gender;
    return statusPass && genderPass;
  });
  const countSinceScoped = (date) => scopedMembers.filter((m) => m.createdAt >= date).length;

  const total = scopedMembers.length;
  const daily = countSinceScoped(day);
  const weekly = countSinceScoped(week);
  const monthly = countSinceScoped(month);
  const yearly = countSinceScoped(year);

  const customCount = (customFrom && customTo)
    ? scopedMembers.filter((m) => m.createdAt >= customFrom && m.createdAt < customTo).length
    : 0;

  const selectedMap = {
    day: { label: 'à¸Šà¹ˆà¸§à¸‡à¸—à¸µà¹ˆà¹€à¸¥à¸·à¸­à¸: à¸£à¸²à¸¢à¸§à¸±à¸™', value: daily },
    week: { label: 'à¸Šà¹ˆà¸§à¸‡à¸—à¸µà¹ˆà¹€à¸¥à¸·à¸­à¸: à¸£à¸²à¸¢à¸ªà¸±à¸›à¸”à¸²à¸«à¹Œ', value: weekly },
    month: { label: 'à¸Šà¹ˆà¸§à¸‡à¸—à¸µà¹ˆà¹€à¸¥à¸·à¸­à¸: à¸£à¸²à¸¢à¹€à¸”à¸·à¸­à¸™', value: monthly },
    year: { label: 'à¸Šà¹ˆà¸§à¸‡à¸—à¸µà¹ˆà¹€à¸¥à¸·à¸­à¸: à¸£à¸²à¸¢à¸›à¸µ', value: yearly },
    custom: { label: 'à¸Šà¹ˆà¸§à¸‡à¸—à¸µà¹ˆà¹€à¸¥à¸·à¸­à¸: à¸§à¸±à¸™à¸—à¸µà¹ˆà¸à¸³à¸«à¸™à¸”à¹€à¸­à¸‡', value: customCount },
  };
  const selectedMetric = selectedMap[range] || selectedMap.month;

  const buildSeries = () => {
    const labels = [];
    const values = [];

    if (range === 'custom' && customFrom && customTo && customFrom < customTo) {
      const maxDays = 31;
      const cursor = new Date(customFrom);
      let guard = 0;
      while (cursor < customTo && guard < maxDays) {
        const s = new Date(cursor);
        const e = new Date(s); e.setDate(s.getDate() + 1);
        labels.push(s.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit' }));
        values.push(scopedMembers.filter((m) => m.createdAt >= s && m.createdAt < e).length);
        cursor.setDate(cursor.getDate() + 1);
        guard += 1;
      }
      if (labels.length === 0) {
        labels.push('à¹„à¸¡à¹ˆà¸¡à¸µà¸‚à¹‰à¸­à¸¡à¸¹à¸¥');
        values.push(0);
      }
    } else if (range === 'day') {
      const s = new Date(day);
      const e = new Date(s); e.setDate(s.getDate() + 1);
      labels.push('à¸§à¸±à¸™à¸™à¸µà¹‰');
      values.push(scopedMembers.filter((m) => m.createdAt >= s && m.createdAt < e).length);
    } else if (range === 'week') {
      for (let i = 7; i >= 0; i--) {
        const s = new Date(day); s.setDate(day.getDate() - (i * 7));
        const e = new Date(s); e.setDate(s.getDate() + 7);
        labels.push(`W-${8 - i}`);
        values.push(scopedMembers.filter((m) => m.createdAt >= s && m.createdAt < e).length);
      }
    } else if (range === 'year') {
      for (let i = 11; i >= 0; i--) {
        const s = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const e = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
        labels.push(s.toLocaleDateString('th-TH', { month: 'short' }));
        values.push(scopedMembers.filter((m) => m.createdAt >= s && m.createdAt < e).length);
      }
    } else {
      // month = last 30 days split by 5-day buckets
      for (let i = 5; i >= 0; i--) {
        const s = new Date(day); s.setDate(day.getDate() - (i * 5));
        const e = new Date(s); e.setDate(s.getDate() + 5);
        labels.push(`${s.getDate()}/${s.getMonth() + 1}`);
        values.push(scopedMembers.filter((m) => m.createdAt >= s && m.createdAt < e).length);
      }
    }

    return { labels, values };
  };

  const { labels, values } = buildSeries();
  const maxVal = Math.max(...values, 1);
  const bars = labels.map((label, i) => {
    const h = Math.max(12, Math.round((values[i] / maxVal) * 140));
    return `<div style="display:flex;flex-direction:column;align-items:center;gap:6px;min-width:44px">
      <div title="${values[i]}" style="width:28px;height:${h}px;border-radius:8px 8px 4px 4px;background:linear-gradient(180deg,#60a5fa,#f9a8d4);"></div>
      <div style="font-size:11px;color:#64748b">${label}</div>
      <div style="font-size:12px;font-weight:700;color:#1e3a8a">${values[i]}</div>
    </div>`;
  }).join('');

  const latestMembers = [...scopedMembers]
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 5)
    .map((m) => `<tr><td>${m.id}</td><td>${m.name}</td><td>${m.gender || '-'}</td><td>${m.status === 'blocked' ? 'à¸šà¸¥à¹‡à¸­à¸' : 'à¸›à¸à¸•à¸´'}</td><td>${m.createdAt.toLocaleDateString('th-TH')}</td></tr>`)
    .join('');

  const recentLogs = auditLogs
    .slice(0, 6)
    .map((log) => `<tr><td>${log.at.toLocaleString('th-TH')}</td><td>${log.actor}</td><td>${log.action}</td><td>${log.details || '-'}</td></tr>`)
    .join('');

  return htmlPage('Dashboard - Admin', adminShell(session, 'dashboard', `
    <main class="card">
      <div class="head">
        <div class="topline">
          <h2 style="margin:0">à¹à¸”à¸Šà¸šà¸­à¸£à¹Œà¸”à¸«à¸¥à¸±à¸‡à¸šà¹‰à¸²à¸™</h2>
          <span class="pill">à¸œà¸¹à¹‰à¹ƒà¸Šà¹‰: ${session.username}</span>
          <span class="pill">à¸ªà¸´à¸—à¸˜à¸´à¹Œ: ${session.role}</span>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <a class="btn" href="/admin/members">à¸ˆà¸±à¸”à¸à¸²à¸£à¸ªà¸¡à¸²à¸Šà¸´à¸</a>
          <a class="btn" href="/admin/audit">Audit Log</a>
          <a class="btn" href="/admin/logout">à¸­à¸­à¸à¸ˆà¸²à¸à¸£à¸°à¸šà¸š</a>
        </div>
      </div>

      <form method="GET" action="/admin/dashboard" class="filters" style="margin-bottom:12px">
        <div>
          <label class="muted">à¸Šà¹ˆà¸§à¸‡à¹€à¸§à¸¥à¸²à¹à¸ªà¸”à¸‡à¸à¸£à¸²à¸Ÿ</label>
          <select name="range">
            <option value="day" ${range === 'day' ? 'selected' : ''}>à¸£à¸²à¸¢à¸§à¸±à¸™ (1 à¸§à¸±à¸™)</option>
            <option value="week" ${range === 'week' ? 'selected' : ''}>à¸£à¸²à¸¢à¸ªà¸±à¸›à¸”à¸²à¸«à¹Œ</option>
            <option value="month" ${range === 'month' ? 'selected' : ''}>à¸£à¸²à¸¢à¹€à¸”à¸·à¸­à¸™</option>
            <option value="year" ${range === 'year' ? 'selected' : ''}>à¸£à¸²à¸¢à¸›à¸µ</option>
            <option value="custom" ${range === 'custom' ? 'selected' : ''}>à¸à¸³à¸«à¸™à¸”à¸Šà¹ˆà¸§à¸‡à¸§à¸±à¸™à¹€à¸­à¸‡</option>
          </select>
        </div>
        <div>
          <label class="muted">à¸à¸£à¸­à¸‡à¸ªà¸–à¸²à¸™à¸°à¸ªà¸¡à¸²à¸Šà¸´à¸</label>
          <select name="status">
            <option value="all" ${status === 'all' ? 'selected' : ''}>à¸—à¸±à¹‰à¸‡à¸«à¸¡à¸”</option>
            <option value="active" ${status === 'active' ? 'selected' : ''}>à¸›à¸à¸•à¸´</option>
            <option value="blocked" ${status === 'blocked' ? 'selected' : ''}>à¸šà¸¥à¹‡à¸­à¸</option>
          </select>
        </div>
        <div>
          <label class="muted">à¸à¸£à¸­à¸‡à¹€à¸žà¸¨</label>
          <select name="gender">
            <option value="all" ${gender === 'all' ? 'selected' : ''}>à¸—à¸±à¹‰à¸‡à¸«à¸¡à¸”</option>
            <option value="male" ${gender === 'male' ? 'selected' : ''}>à¸Šà¸²à¸¢</option>
            <option value="female" ${gender === 'female' ? 'selected' : ''}>à¸«à¸à¸´à¸‡</option>
            <option value="other" ${gender === 'other' ? 'selected' : ''}>à¸­à¸·à¹ˆà¸™à¹†</option>
          </select>
        </div>
        <div>
          <label class="muted">à¹€à¸£à¸´à¹ˆà¸¡à¸§à¸±à¸™à¸—à¸µà¹ˆ (Custom)</label>
          <input type="date" name="from" value="${fromDateStr}" />
        </div>
        <div>
          <label class="muted">à¸–à¸¶à¸‡à¸§à¸±à¸™à¸—à¸µà¹ˆ (Custom)</label>
          <input type="date" name="to" value="${toDateStr}" />
        </div>
        <button class="btn btn-primary" type="submit">Apply Filter</button>
      </form>

      <div class="grid" style="margin-bottom:14px">
        <div class="stat"><div class="k">à¸ªà¸¡à¸²à¸Šà¸´à¸à¸—à¸±à¹‰à¸‡à¸«à¸¡à¸” (à¸•à¸²à¸¡ filter)</div><div class="v">${total}</div></div>
        <div class="stat"><div class="k">${selectedMetric.label}</div><div class="v">${selectedMetric.value}</div></div>
        <div class="stat"><div class="k">à¹€à¸‡à¸·à¹ˆà¸­à¸™à¹„à¸‚à¸—à¸µà¹ˆà¹€à¸¥à¸·à¸­à¸</div><div class="v" style="font-size:16px">${status}/${gender}${range === 'custom' && fromDateStr && toDateStr ? ` (${fromDateStr} à¸–à¸¶à¸‡ ${toDateStr})` : ''}</div></div>
      </div>

      <section class="stat" style="margin-bottom:12px;">
        <div class="k" style="margin-bottom:8px">à¸à¸£à¸²à¸Ÿà¸ˆà¸³à¸™à¸§à¸™à¸ªà¸¡à¸²à¸Šà¸´à¸à¸•à¸²à¸¡à¸Šà¹ˆà¸§à¸‡à¹€à¸§à¸¥à¸²</div>
        <div style="display:flex;align-items:flex-end;gap:10px;overflow:auto;padding:8px 2px 2px;min-height:190px;">${bars}</div>
      </section>

      <div class="grid" style="grid-template-columns: 1.2fr 1fr; gap:12px; align-items:start;">
        <section class="stat" style="padding:0;overflow:hidden;">
          <div style="padding:12px 12px 0"><strong>à¸ªà¸¡à¸²à¸Šà¸´à¸à¸¥à¹ˆà¸²à¸ªà¸¸à¸” (à¸•à¸²à¸¡ filter)</strong></div>
          <div style="overflow:auto; padding:8px 12px 12px;">
            <table>
              <thead><tr><th>ID</th><th>à¸Šà¸·à¹ˆà¸­</th><th>à¹€à¸žà¸¨</th><th>à¸ªà¸–à¸²à¸™à¸°</th><th>à¸§à¸±à¸™à¸—à¸µà¹ˆà¸ªà¸¡à¸±à¸„à¸£</th></tr></thead>
              <tbody>${latestMembers || '<tr><td colspan="5">à¸¢à¸±à¸‡à¹„à¸¡à¹ˆà¸¡à¸µà¸‚à¹‰à¸­à¸¡à¸¹à¸¥</td></tr>'}</tbody>
            </table>
          </div>
        </section>

        <section class="stat" style="padding:0;overflow:hidden;">
          <div style="padding:12px 12px 0"><strong>à¸à¸´à¸ˆà¸à¸£à¸£à¸¡à¸¥à¹ˆà¸²à¸ªà¸¸à¸” (Audit)</strong></div>
          <div style="overflow:auto; padding:8px 12px 12px;">
            <table>
              <thead><tr><th>à¹€à¸§à¸¥à¸²</th><th>à¸œà¸¹à¹‰à¹ƒà¸Šà¹‰</th><th>à¹€à¸«à¸•à¸¸à¸à¸²à¸£à¸“à¹Œ</th><th>à¸£à¸²à¸¢à¸¥à¸°à¹€à¸­à¸µà¸¢à¸”</th></tr></thead>
              <tbody>${recentLogs || '<tr><td colspan="4">à¸¢à¸±à¸‡à¹„à¸¡à¹ˆà¸¡à¸µà¸›à¸£à¸°à¸§à¸±à¸•à¸´</td></tr>'}</tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  `));
}

function renderMembersPage(session, queryParams) {
  const q = (queryParams.get('q') || '').trim().toLowerCase();
  const status = (queryParams.get('status') || 'all').trim();

  let filtered = [...members];
  if (q) {
    filtered = filtered.filter((m) =>
      m.name.toLowerCase().includes(q) ||
      m.email.toLowerCase().includes(q) ||
      m.id.toLowerCase().includes(q)
    );
  }
  if (status !== 'all') {
    filtered = filtered.filter((m) => m.status === status);
  }

  const canEdit = hasPermission(session.role, 'edit_member');
  const canBlock = hasPermission(session.role, 'block_member');
  const canDelete = hasPermission(session.role, 'delete_member');

  const rows = filtered.map((m) => `
    <tr>
      <td>${m.id}</td>
      <td>
        <form method="POST" action="/admin/members/${m.id}/update" style="display:grid;gap:6px">
          <input name="name" value="${m.name}" ${canEdit ? '' : 'disabled'} />
          <input name="email" value="${m.email}" ${canEdit ? '' : 'disabled'} />
          <button class="btn" type="submit" ${canEdit ? '' : 'disabled'}>à¸šà¸±à¸™à¸—à¸¶à¸</button>
        </form>
      </td>
      <td>${m.createdAt.toLocaleDateString('th-TH')}</td>
      <td>${m.status === 'blocked' ? 'à¸šà¸¥à¹‡à¸­à¸' : 'à¸›à¸à¸•à¸´'}</td>
      <td>
        <div class="actions">
          <form method="POST" action="/admin/members/${m.id}/toggle-block">
            <button class="btn" type="submit" ${canBlock ? '' : 'disabled'}>${m.status === 'blocked' ? 'à¸›à¸¥à¸”à¸šà¸¥à¹‡à¸­à¸' : 'à¸šà¸¥à¹‡à¸­à¸'}</button>
          </form>
          <form method="POST" action="/admin/members/${m.id}/delete" onsubmit="return confirm('à¸¢à¸·à¸™à¸¢à¸±à¸™à¸¥à¸šà¸ªà¸¡à¸²à¸Šà¸´à¸?')">
            <button class="btn" type="submit" style="color:#dc2626;border-color:#fecaca" ${canDelete ? '' : 'disabled'}>à¸¥à¸š</button>
          </form>
        </div>
      </td>
    </tr>
  `).join('');

  return htmlPage('Members - Admin', adminShell(session, 'members', `
    <main class="card">
      <div class="head">
        <div class="topline">
          <h2 style="margin:0">à¸£à¸²à¸¢à¸Šà¸·à¹ˆà¸­à¸ªà¸¡à¸²à¸Šà¸´à¸à¸—à¸±à¹‰à¸‡à¸«à¸¡à¸”</h2>
          <span class="pill">à¸œà¸¥à¸¥à¸±à¸žà¸˜à¹Œ ${filtered.length} / ${members.length}</span>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <a class="btn" href="/admin/dashboard">à¸à¸¥à¸±à¸šà¹à¸”à¸Šà¸šà¸­à¸£à¹Œà¸”</a>
          <a class="btn" href="/admin/audit">Audit Log</a>
          <a class="btn" href="/admin/logout">à¸­à¸­à¸à¸ˆà¸²à¸à¸£à¸°à¸šà¸š</a>
        </div>
      </div>

      <form method="GET" action="/admin/members" class="filters" style="margin-bottom:12px">
        <div>
          <label class="muted">à¸„à¹‰à¸™à¸«à¸² (à¸Šà¸·à¹ˆà¸­/à¸­à¸µà¹€à¸¡à¸¥/ID)</label>
          <input name="q" value="${q}" placeholder="à¹€à¸Šà¹ˆà¸™ nina à¸«à¸£à¸·à¸­ U001" />
        </div>
        <div>
          <label class="muted">à¸ªà¸–à¸²à¸™à¸°</label>
          <select name="status">
            <option value="all" ${status === 'all' ? 'selected' : ''}>à¸—à¸±à¹‰à¸‡à¸«à¸¡à¸”</option>
            <option value="active" ${status === 'active' ? 'selected' : ''}>à¸›à¸à¸•à¸´</option>
            <option value="blocked" ${status === 'blocked' ? 'selected' : ''}>à¸šà¸¥à¹‡à¸­à¸</option>
          </select>
        </div>
        <button class="btn btn-primary" type="submit">à¸„à¹‰à¸™à¸«à¸²/à¸à¸£à¸­à¸‡</button>
      </form>

      <div style="overflow:auto">
        <table>
          <thead>
            <tr><th>ID</th><th>à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸ªà¸¡à¸²à¸Šà¸´à¸ (à¹à¸à¹‰à¹„à¸‚à¹„à¸”à¹‰)</th><th>à¸§à¸±à¸™à¸—à¸µà¹ˆà¸ªà¸¡à¸±à¸„à¸£</th><th>à¸ªà¸–à¸²à¸™à¸°</th><th>à¸ˆà¸±à¸”à¸à¸²à¸£</th></tr>
          </thead>
          <tbody>${rows || '<tr><td colspan="5">à¹„à¸¡à¹ˆà¸žà¸šà¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸ªà¸¡à¸²à¸Šà¸´à¸à¸•à¸²à¸¡à¹€à¸‡à¸·à¹ˆà¸­à¸™à¹„à¸‚</td></tr>'}</tbody>
        </table>
      </div>
      <p class="muted" style="margin-top:8px">à¸ªà¸´à¸—à¸˜à¸´à¹Œà¸›à¸±à¸ˆà¸ˆà¸¸à¸šà¸±à¸™: ${session.role} | staff=à¸”à¸¹à¸­à¸¢à¹ˆà¸²à¸‡à¹€à¸”à¸µà¸¢à¸§, admin=à¹à¸à¹‰à¹„à¸‚/à¸šà¸¥à¹‡à¸­à¸, super_admin=à¸¥à¸šà¹„à¸”à¹‰</p>
    </main>
  `));
}

function renderAuditPage(session) {
  const rows = auditLogs.map((log) => `
    <div class="log-row">
      <div>${log.at.toLocaleString('th-TH')}</div>
      <div><strong>${log.actor}</strong></div>
      <div>${log.action} ${log.details ? `- ${log.details}` : ''}</div>
    </div>
  `).join('');

  return htmlPage('Audit Log - Admin', adminShell(session, 'activities', `
    <main class="card">
      <div class="head">
        <h2 style="margin:0">Audit Log</h2>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <a class="btn" href="/admin/dashboard">à¸à¸¥à¸±à¸šà¹à¸”à¸Šà¸šà¸­à¸£à¹Œà¸”</a>
          <a class="btn" href="/admin/members">à¸ˆà¸±à¸”à¸à¸²à¸£à¸ªà¸¡à¸²à¸Šà¸´à¸</a>
        </div>
      </div>

      <div style="border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;background:#fff">
        <div class="log-row" style="font-weight:700;background:#f8fafc">
          <div>à¹€à¸§à¸¥à¸²</div><div>à¸œà¸¹à¹‰à¹ƒà¸Šà¹‰à¸‡à¸²à¸™</div><div>à¹€à¸«à¸•à¸¸à¸à¸²à¸£à¸“à¹Œ</div>
        </div>
        ${rows || '<div class="log-row"><div>-</div><div>-</div><div>à¸¢à¸±à¸‡à¹„à¸¡à¹ˆà¸¡à¸µà¸›à¸£à¸°à¸§à¸±à¸•à¸´</div></div>'}
      </div>
    </main>
  `));
}

function renderRevenuePage(session) {
  return htmlPage('Revenue - Admin', adminShell(session, 'revenue', `
    <main class="card">
      <div class="head">
        <h2 style="margin:0">à¸£à¸²à¸¢à¹„à¸”à¹‰</h2>
        <a class="btn" href="/admin/dashboard">à¸à¸¥à¸±à¸šà¸ à¸²à¸žà¸£à¸§à¸¡</a>
      </div>
      <p>à¸«à¸™à¹‰à¸²à¸™à¸µà¹‰à¹€à¸›à¹‡à¸™à¹‚à¸„à¸£à¸‡à¸ªà¸³à¸«à¸£à¸±à¸šà¸£à¸°à¸šà¸šà¸£à¸²à¸¢à¹„à¸”à¹‰ (Revenue) à¸žà¸£à¹‰à¸­à¸¡à¸•à¹ˆà¸­à¸¢à¸­à¸”à¹€à¸Šà¸·à¹ˆà¸­à¸¡ Payment/à¸£à¸²à¸¢à¸‡à¸²à¸™à¸ˆà¸£à¸´à¸‡</p>
    </main>
  `));
}

function renderPromotionsPage(session) {
  return htmlPage('Promotions - Admin', adminShell(session, 'promotions', `
    <main class="card">
      <div class="head">
        <h2 style="margin:0">à¹‚à¸›à¸£à¹‚à¸¡à¸Šà¸±à¹ˆà¸™</h2>
        <a class="btn" href="/admin/dashboard">à¸à¸¥à¸±à¸šà¸ à¸²à¸žà¸£à¸§à¸¡</a>
      </div>
      <p>à¸«à¸™à¹‰à¸²à¸™à¸µà¹‰à¹€à¸›à¹‡à¸™à¹‚à¸„à¸£à¸‡à¸ªà¸³à¸«à¸£à¸±à¸šà¸ˆà¸±à¸”à¸à¸²à¸£à¹‚à¸›à¸£à¹‚à¸¡à¸Šà¸±à¹ˆà¸™ à¹€à¸Šà¹ˆà¸™ à¸„à¸¹à¸›à¸­à¸‡ à¹à¸„à¸¡à¹€à¸›à¸ à¹à¸¥à¸°à¸ªà¹ˆà¸§à¸™à¸¥à¸”</p>
    </main>
  `));
}

function renderActivitiesPage(session) {
  return htmlPage('Activities - Admin', adminShell(session, 'activities', `
    <main class="card">
      <div class="head">
        <h2 style="margin:0">à¸à¸´à¸ˆà¸à¸£à¸£à¸¡</h2>
        <a class="btn" href="/admin/audit">à¹€à¸›à¸´à¸” Audit Log</a>
      </div>
      <p>à¸«à¸™à¹‰à¸²à¸™à¸µà¹‰à¹€à¸›à¹‡à¸™à¹‚à¸„à¸£à¸‡à¸à¸´à¸ˆà¸à¸£à¸£à¸¡à¸£à¸°à¸šà¸š/à¸œà¸¹à¹‰à¹ƒà¸Šà¹‰à¸‡à¸²à¸™ à¸ªà¸²à¸¡à¸²à¸£à¸–à¸•à¹ˆà¸­à¸¢à¸­à¸” Timeline à¸«à¸£à¸·à¸­ Event Monitor à¹„à¸”à¹‰</p>
    </main>
  `));
}

function redirect(res, location, cookie = null) {
  const headers = { Location: location };
  if (cookie) headers['Set-Cookie'] = cookie;
  res.writeHead(302, headers);
  res.end();
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${port}`);
  const path = url.pathname;

  if (path === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'healthy', service: 'sodeclick-v2' }));
    return;
  }

  if (path === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(renderHome());
    return;
  }

  if (path === '/login' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(renderUserLogin());
    return;
  }

  if (path === '/login' && req.method === 'POST') {
    const body = await parseBody(req);

    const foundAdmin = adminAccounts.find((u) => u.username === body.username && u.password === body.password);
    if (foundAdmin) {
      const sid = crypto.randomBytes(24).toString('hex');
      sessions.set(sid, { username: foundAdmin.username, role: foundAdmin.role, displayName: foundAdmin.displayName, createdAt: Date.now() });
      addAudit('login', foundAdmin.username, `role=${foundAdmin.role}`);
      redirect(res, '/admin/dashboard', `sid=${sid}; HttpOnly; Path=/; SameSite=Lax; Max-Age=28800`);
      return;
    }

    if (body.username === 'user' && body.password === '123456') {
      const sid = crypto.randomBytes(24).toString('hex');
      userSessions.set(sid, { username: body.username, displayName: 'à¸žà¸¥' });
      redirect(res, '/app', `user_sid=${sid}; HttpOnly; Path=/; SameSite=Lax; Max-Age=28800`);
      return;
    }

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(renderUserLogin('à¸Šà¸·à¹ˆà¸­à¸œà¸¹à¹‰à¹ƒà¸Šà¹‰à¸«à¸£à¸·à¸­à¸£à¸«à¸±à¸ªà¸œà¹ˆà¸²à¸™à¹„à¸¡à¹ˆà¸–à¸¹à¸à¸•à¹‰à¸­à¸‡'));
    return;
  }

  if (path === '/app') {
    const userSession = requireUserAuth(req, res);
    if (!userSession) return;
    try {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(renderUserApp(userSession));
    } catch (err) {
      console.error('[user-app-render-error]', err);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(htmlPage('SodeClick V2', `
        <main class="card">
          <h2 style="margin-top:0">à¸«à¸™à¹‰à¸²à¸«à¸¥à¸±à¸à¸œà¸¹à¹‰à¹ƒà¸Šà¹‰</h2>
          <p class="muted">à¹€à¸à¸´à¸”à¸‚à¹‰à¸­à¸œà¸´à¸”à¸žà¸¥à¸²à¸”à¸Šà¸±à¹ˆà¸§à¸„à¸£à¸²à¸§à¹ƒà¸™à¸«à¸™à¹‰à¸²à¹à¸­à¸› à¸£à¸°à¸šà¸šà¸ªà¸¥à¸±à¸šà¹€à¸›à¹‡à¸™à¹‚à¸«à¸¡à¸”à¸ªà¸³à¸£à¸­à¸‡à¹ƒà¸«à¹‰à¹ƒà¸Šà¹‰à¸‡à¸²à¸™à¹„à¸”à¹‰à¸à¹ˆà¸­à¸™</p>
          <p><a class="btn btn-primary" href="/login">à¸à¸¥à¸±à¸šà¸«à¸™à¹‰à¸² Login</a></p>
        </main>
      `));
    }
    return;
  }

  if (path === '/logout') {
    const sid = parseCookies(req).user_sid;
    if (sid) userSessions.delete(sid);
    redirect(res, '/login', 'user_sid=; HttpOnly; Path=/; Max-Age=0');
    return;
  }

  if (path === '/admin/login' && req.method === 'GET') {
    redirect(res, '/login');
    return;
  }

  if (path === '/admin/login' && req.method === 'POST') {
    redirect(res, '/login');
    return;
  }

  if (path === '/admin/logout') {
    const session = getSession(req);
    const sid = parseCookies(req).sid;
    if (session) addAudit('logout', session.username, `role=${session.role}`);
    if (sid) sessions.delete(sid);
    redirect(res, '/login', 'sid=; HttpOnly; Path=/; Max-Age=0');
    return;
  }

  if (path === '/admin/dashboard') {
    const session = requireAuth(req, res);
    if (!session) return;
    if (!requirePermission(session, 'view_dashboard', res)) return;

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(renderAdminDashboardV2(session, url.searchParams));
    return;
  }


  if (path === '/admin/revenue') {
    const session = requireAuth(req, res);
    if (!session) return;
    if (!requirePermission(session, 'view_dashboard', res)) return;

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(renderRevenuePage(session));
    return;
  }

  if (path === '/admin/promotions') {
    const session = requireAuth(req, res);
    if (!session) return;
    if (!requirePermission(session, 'view_dashboard', res)) return;

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(renderPromotionsPage(session));
    return;
  }

  if (path === '/admin/activities') {
    const session = requireAuth(req, res);
    if (!session) return;
    if (!requirePermission(session, 'view_dashboard', res)) return;

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(renderActivitiesPage(session));
    return;
  }

  if (path === '/admin/members') {
    const session = requireAuth(req, res);
    if (!session) return;
    if (!requirePermission(session, 'view_members', res)) return;

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(renderMembersPage(session, url.searchParams));
    return;
  }

  if (path === '/admin/audit') {
    const session = requireAuth(req, res);
    if (!session) return;
    if (!requirePermission(session, 'view_audit', res)) return;

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(renderAuditPage(session));
    return;
  }

  const updateMatch = path.match(/^\/admin\/members\/(U\d+)\/update$/);
  const toggleMatch = path.match(/^\/admin\/members\/(U\d+)\/toggle-block$/);
  const deleteMatch = path.match(/^\/admin\/members\/(U\d+)\/delete$/);

  if (updateMatch && req.method === 'POST') {
    const session = requireAuth(req, res);
    if (!session) return;
    if (!requirePermission(session, 'edit_member', res)) return;

    const id = updateMatch[1];
    const body = await parseBody(req);
    members = members.map((m) => (m.id === id ? { ...m, name: body.name || m.name, email: body.email || m.email } : m));
    addAudit('member_update', session.username, `member=${id}`);
    redirect(res, '/admin/members');
    return;
  }

  if (toggleMatch && req.method === 'POST') {
    const session = requireAuth(req, res);
    if (!session) return;
    if (!requirePermission(session, 'block_member', res)) return;

    const id = toggleMatch[1];
    let changedTo = 'active';
    members = members.map((m) => {
      if (m.id !== id) return m;
      changedTo = m.status === 'blocked' ? 'active' : 'blocked';
      return { ...m, status: changedTo };
    });
    addAudit('member_toggle_block', session.username, `member=${id}, status=${changedTo}`);
    redirect(res, '/admin/members');
    return;
  }

  if (deleteMatch && req.method === 'POST') {
    const session = requireAuth(req, res);
    if (!session) return;
    if (!requirePermission(session, 'delete_member', res)) return;

    const id = deleteMatch[1];
    members = members.filter((m) => m.id !== id);
    addAudit('member_delete', session.username, `member=${id}`);
    redirect(res, '/admin/members');
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Not Found');
});

server.listen(port, () => {
  console.log(`SodeClick V2 listening on ${port}`);
});

