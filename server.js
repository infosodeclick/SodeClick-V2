const http = require('http');
const crypto = require('crypto');

const port = process.env.PORT || 3000;

const ADMIN_USER = 'admin';
const ADMIN_PASS = '123456';

const sessions = new Map();

let members = [
  { id: 'U001', name: 'Nina', email: 'nina@example.com', status: 'active', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3) },
  { id: 'U002', name: 'Mild', email: 'mild@example.com', status: 'active', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2) },
  { id: 'U003', name: 'Beam', email: 'beam@example.com', status: 'blocked', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7) },
  { id: 'U004', name: 'Fah', email: 'fah@example.com', status: 'active', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 40) },
  { id: 'U005', name: 'Pear', email: 'pear@example.com', status: 'active', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 200) },
];

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

function isAuthed(req) {
  const sid = parseCookies(req).sid;
  return sid && sessions.has(sid);
}

function requireAuth(req, res) {
  if (!isAuthed(req)) {
    res.writeHead(302, { Location: '/admin/login' });
    res.end();
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
    .wrap { max-width: 1100px; margin: 0 auto; }
    .card {
      background: #fff;
      border: 1px solid #e5e7eb;
      border-radius: 16px;
      box-shadow: 0 12px 28px rgba(96,165,250,.12);
      padding: 16px;
    }
    .head {
      display:flex; justify-content:space-between; align-items:center; gap:10px;
      margin-bottom: 12px;
    }
    .btn {
      display:inline-flex; align-items:center; justify-content:center;
      border:1px solid #cbd5e1; background:#fff; color:#334155;
      border-radius:10px; padding:8px 12px; text-decoration:none; font-weight:700;
      cursor:pointer;
    }
    .btn-primary { background: linear-gradient(135deg,var(--blue),var(--pink)); color:#fff; border:0; }
    .grid { display:grid; grid-template-columns: repeat(auto-fit,minmax(180px,1fr)); gap:10px; }
    .stat { border:1px solid #e5e7eb; border-radius:12px; background:#fff; padding:12px; }
    .k { font-size: 12px; color:#64748b; }
    .v { font-size: 24px; font-weight:800; color:#1e3a8a; }
    table { width:100%; border-collapse: collapse; }
    th,td { border-bottom:1px solid #e5e7eb; text-align:left; padding:10px 8px; font-size:14px; }
    .actions { display:flex; gap:6px; flex-wrap:wrap; }
    input, select { width:100%; padding:8px; border:1px solid #cbd5e1; border-radius:8px; }
    .login {
      max-width: 420px; margin: 8vh auto 0; background:#fff; border:1px solid #dbeafe;
      border-radius: 16px; padding:20px; box-shadow: 0 12px 30px rgba(96,165,250,.14);
    }
    .muted { color:#64748b; font-size:13px; }
    @media (max-width: 760px) {
      th:nth-child(3), td:nth-child(3) { display:none; }
    }
  </style>
</head>
<body>
  <div class="wrap">${body}</div>
</body>
</html>`;
}

function startOfDay(d = new Date()) { const x = new Date(d); x.setHours(0,0,0,0); return x; }
function countSince(date) { return members.filter(m => m.createdAt >= date).length; }

function renderHome() {
  return htmlPage('SodeClick V2', `
  <main class="card">
    <div class="head">
      <h2 style="margin:0">SodeClick V2</h2>
      <a class="btn btn-primary" href="/admin/login">Login</a>
    </div>
    <p>ธีมหลัก: ขาว • ฟ้า • ชมพูอ่อน พร้อมเริ่มพัฒนาฟีเจอร์จริง</p>
    <div class="grid" style="margin-top:12px">
      <div class="stat"><div class="k">โครงระบบ</div><div class="v">พร้อม</div></div>
      <div class="stat"><div class="k">Health</div><div class="v">OK</div></div>
    </div>
  </main>`);
}

function renderAdminLogin(error = '') {
  return htmlPage('Admin Login - SodeClick V2', `
    <div class="login">
      <h2 style="margin-top:0">เข้าสู่ระบบหลังบ้าน</h2>
      ${error ? `<p style="color:#dc2626;font-weight:700">${error}</p>` : ''}
      <form method="POST" action="/admin/login">
        <label>Username</label>
        <input name="username" required />
        <label style="margin-top:8px;display:block">Password</label>
        <input name="password" type="password" required />
        <button class="btn btn-primary" style="width:100%;margin-top:12px" type="submit">Login</button>
      </form>
      <p class="muted">ค่าเริ่มต้น: admin / 123456</p>
    </div>
  `);
}

function renderAdminDashboard() {
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

  return htmlPage('Dashboard - Admin', `
    <main class="card">
      <div class="head">
        <h2 style="margin:0">แดชบอร์ดหลังบ้าน</h2>
        <div style="display:flex;gap:8px">
          <a class="btn" href="/admin/members">จัดการสมาชิก</a>
          <a class="btn" href="/admin/logout">ออกจากระบบ</a>
        </div>
      </div>

      <div class="grid">
        <div class="stat"><div class="k">สมาชิกทั้งหมด</div><div class="v">${total}</div></div>
        <div class="stat"><div class="k">รายวัน</div><div class="v">${daily}</div></div>
        <div class="stat"><div class="k">รายสัปดาห์</div><div class="v">${weekly}</div></div>
        <div class="stat"><div class="k">รายเดือน</div><div class="v">${monthly}</div></div>
        <div class="stat"><div class="k">รายปี</div><div class="v">${yearly}</div></div>
      </div>
    </main>
  `);
}

function renderMembersPage() {
  const rows = members.map((m) => `
    <tr>
      <td>${m.id}</td>
      <td>
        <form method="POST" action="/admin/members/${m.id}/update" style="display:grid;gap:6px">
          <input name="name" value="${m.name}" />
          <input name="email" value="${m.email}" />
          <button class="btn" type="submit">บันทึก</button>
        </form>
      </td>
      <td>${m.createdAt.toLocaleDateString('th-TH')}</td>
      <td>${m.status === 'blocked' ? 'บล็อก' : 'ปกติ'}</td>
      <td>
        <div class="actions">
          <form method="POST" action="/admin/members/${m.id}/toggle-block">
            <button class="btn" type="submit">${m.status === 'blocked' ? 'ปลดบล็อก' : 'บล็อก'}</button>
          </form>
          <form method="POST" action="/admin/members/${m.id}/delete" onsubmit="return confirm('ยืนยันลบสมาชิก?')">
            <button class="btn" type="submit" style="color:#dc2626;border-color:#fecaca">ลบ</button>
          </form>
        </div>
      </td>
    </tr>
  `).join('');

  return htmlPage('Members - Admin', `
    <main class="card">
      <div class="head">
        <h2 style="margin:0">รายชื่อสมาชิกทั้งหมด</h2>
        <div style="display:flex;gap:8px">
          <a class="btn" href="/admin/dashboard">กลับแดชบอร์ด</a>
          <a class="btn" href="/admin/logout">ออกจากระบบ</a>
        </div>
      </div>

      <div style="overflow:auto">
        <table>
          <thead>
            <tr><th>ID</th><th>ข้อมูลสมาชิก (แก้ไขได้)</th><th>วันที่สมัคร</th><th>สถานะ</th><th>จัดการ</th></tr>
          </thead>
          <tbody>${rows || '<tr><td colspan="5">ยังไม่มีสมาชิก</td></tr>'}</tbody>
        </table>
      </div>
    </main>
  `);
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

  if (path === '/login') {
    redirect(res, '/admin/login');
    return;
  }

  if (path === '/admin/login' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(renderAdminLogin());
    return;
  }

  if (path === '/admin/login' && req.method === 'POST') {
    const body = await parseBody(req);
    if (body.username === ADMIN_USER && body.password === ADMIN_PASS) {
      const sid = crypto.randomBytes(24).toString('hex');
      sessions.set(sid, { user: body.username, createdAt: Date.now() });
      redirect(res, '/admin/dashboard', `sid=${sid}; HttpOnly; Path=/; SameSite=Lax; Max-Age=28800`);
      return;
    }

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(renderAdminLogin('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง'));
    return;
  }

  if (path === '/admin/logout') {
    const sid = parseCookies(req).sid;
    if (sid) sessions.delete(sid);
    redirect(res, '/admin/login', 'sid=; HttpOnly; Path=/; Max-Age=0');
    return;
  }

  if (path === '/admin/dashboard') {
    if (!requireAuth(req, res)) return;
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(renderAdminDashboard());
    return;
  }

  if (path === '/admin/members') {
    if (!requireAuth(req, res)) return;
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(renderMembersPage());
    return;
  }

  const updateMatch = path.match(/^\/admin\/members\/(U\d+)\/update$/);
  const toggleMatch = path.match(/^\/admin\/members\/(U\d+)\/toggle-block$/);
  const deleteMatch = path.match(/^\/admin\/members\/(U\d+)\/delete$/);

  if (updateMatch && req.method === 'POST') {
    if (!requireAuth(req, res)) return;
    const id = updateMatch[1];
    const body = await parseBody(req);
    members = members.map((m) => (m.id === id ? { ...m, name: body.name || m.name, email: body.email || m.email } : m));
    redirect(res, '/admin/members');
    return;
  }

  if (toggleMatch && req.method === 'POST') {
    if (!requireAuth(req, res)) return;
    const id = toggleMatch[1];
    members = members.map((m) => (m.id === id ? { ...m, status: m.status === 'blocked' ? 'active' : 'blocked' } : m));
    redirect(res, '/admin/members');
    return;
  }

  if (deleteMatch && req.method === 'POST') {
    if (!requireAuth(req, res)) return;
    const id = deleteMatch[1];
    members = members.filter((m) => m.id !== id);
    redirect(res, '/admin/members');
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Not Found');
});

server.listen(port, () => {
  console.log(`SodeClick V2 listening on ${port}`);
});
