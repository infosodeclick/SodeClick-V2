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
        <h2>403 - ไม่มีสิทธิ์เข้าถึง</h2>
        <p>บัญชีของคุณ (${session.username}) ไม่มีสิทธิ์สำหรับคำสั่งนี้</p>
        <a class="btn" href="/admin/dashboard">กลับแดชบอร์ด</a>
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
        <div class="side-title">เมนูหลังบ้าน</div>
        ${item('dashboard', '/admin/dashboard', 'ภาพรวม')}
        ${item('members', '/admin/members', 'สมาชิก')}
        ${item('revenue', '/admin/revenue', 'รายได้')}
        ${item('promotions', '/admin/promotions', 'โปรโมชั่น')}
        ${item('activities', '/admin/activities', 'กิจกรรม')}
        <a class="side-link" href="/admin/logout">ออกจากระบบ</a>
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
      <p>ใช้ Login เดียว ระบบจะตรวจสิทธิ์อัตโนมัติ (ผู้มีสิทธิ์เข้าหลังบ้านได้ทันที)</p>
      <div class="grid" style="margin-top:12px">
        <div class="stat"><div class="k">โครงระบบ</div><div class="v">พร้อม</div></div>
        <div class="stat"><div class="k">Health</div><div class="v">OK</div></div>
      </div>
    </main>
  `);
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
      <p class="muted">บัญชีทดสอบ: admin/123456, manager/123456, staff/123456</p>
    </div>
  `);
}

function renderUserLogin(error = '') {
  return htmlPage('Login - SodeClick V2', `
    <div class="login">
      <h2 style="margin-top:0">เข้าสู่ระบบผู้ใช้งาน</h2>
      ${error ? `<p style="color:#dc2626;font-weight:700">${error}</p>` : ''}
      <form method="POST" action="/login">
        <label>Username</label>
        <input name="username" required />
        <label style="margin-top:8px;display:block">Password</label>
        <input name="password" type="password" required />
        <button class="btn btn-primary" style="width:100%;margin-top:12px" type="submit">เข้าสู่ระบบ</button>
      </form>
      <p class="muted">บัญชีตัวอย่างเดโม: user / 123456 และ admin / 123456</p>
    </div>
  `);
}

function renderUserApp(session) {
  return `<!doctype html>
<html lang="th">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>หน้าบ้าน - SodeClick V2</title>
  <style>
    * { box-sizing:border-box; }
    body { margin:0; font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif; background:#f3f4f6; color:#111827; }
    .topbar { height:56px; background:#3b82f6; color:#fff; display:flex; align-items:center; padding:0 14px; gap:16px; }
    .brand { font-weight:800; }
    .top-menu { display:flex; gap:18px; font-weight:600; font-size:14px; opacity:.95; }
    .shell { display:grid; grid-template-columns: 220px 1fr 250px; min-height: calc(100vh - 56px); }
    .left { background:#fff; border-right:1px solid #e5e7eb; padding:14px; }
    .left a { display:block; padding:10px 8px; border-radius:8px; text-decoration:none; color:#374151; font-weight:600; }
    .left a:hover { background:#f3f4f6; }
    .center { padding:14px; }
    .board { background:#fff; border:1px solid #e5e7eb; border-radius:14px; overflow:hidden; }
    .toolbar { padding:10px; border-bottom:1px solid #e5e7eb; display:flex; gap:8px; align-items:center; }
    .tool { border:1px solid #d1d5db; background:#fff; border-radius:8px; padding:8px 10px; font-size:14px; cursor:pointer; }
    .composer { padding:10px; border-bottom:1px solid #e5e7eb; display:grid; gap:8px; }
    .composer textarea { width:100%; border:1px solid #d1d5db; border-radius:10px; padding:10px; min-height:72px; font-family:inherit; }
    .row { display:flex; flex-wrap:wrap; gap:8px; align-items:center; }
    .btn { border:1px solid #cbd5e1; background:#fff; border-radius:10px; padding:8px 12px; font-weight:700; cursor:pointer; }
    .btn-primary { background:linear-gradient(135deg,#60a5fa,#f9a8d4); color:#fff; border:0; }
    .feed { padding:8px 10px 14px; display:grid; gap:10px; }
    .post { border:1px solid #e5e7eb; border-radius:10px; padding:10px; background:#fff; }
    .post-head { display:flex; gap:10px; align-items:center; margin-bottom:6px; }
    .avatar-sm { width:40px; height:40px; border-radius:999px; background:linear-gradient(135deg,#bfdbfe,#fbcfe8); }
    .u { font-weight:700; }
    .t { font-size:12px; color:#6b7280; }
    .msg { margin:6px 0; font-size:16px; white-space:pre-wrap; }
    .msg img { margin-top:8px; max-width:100%; border-radius:8px; border:1px solid #e5e7eb; }
    .post-actions { color:#6b7280; font-size:13px; margin-bottom:6px; display:flex; gap:12px; }
    .reply { width:100%; border:1px solid #dbeafe; border-radius:8px; padding:8px; }
    .replies { margin-top:8px; display:grid; gap:6px; }
    .reply-item { background:#f8fafc; border:1px solid #e5e7eb; border-radius:8px; padding:7px 8px; font-size:14px; }
    .right { background:#fff; border-left:1px solid #e5e7eb; padding:14px; }
    .profile-card { border:1px solid #e5e7eb; border-radius:10px; padding:12px; background:#f8fafc; }
    .hidden { display:none; }
    @media (max-width: 980px) { .shell { grid-template-columns: 1fr; } .left,.right { border:0; } }
  </style>
</head>
<body>
  <header class="topbar">
    <div class="brand">SodeClick</div>
    <nav class="top-menu">
      <span>กระดาน</span><span>ออนไลน์</span><span>ดีเจ</span><span>ซุปตาร์</span><span>เกมส์</span>
    </nav>
    <div style="margin-left:auto"><a href="/logout" style="color:#fff;text-decoration:none;font-weight:700">ออกจากระบบ</a></div>
  </header>

  <main class="shell">
    <aside class="left">
      <a href="#">หน้าหลัก</a>
      <a href="#">กระดานโต้ตอบ</a>
      <a href="#">ห้องแชท</a>
      <a href="#">เพื่อนออนไลน์</a>
      <a href="#">โปรไฟล์ฉัน</a>
    </aside>

    <section class="center">
      <div class="board">
        <div class="toolbar">
          <button class="tool" id="pickImageBtn">📷 รูป</button>
          <button class="tool emoji-insert" data-emoji="😊">😊</button>
          <button class="tool emoji-insert" data-emoji="❤️">❤️</button>
          <button class="tool emoji-insert" data-emoji="😂">😂</button>
          <button class="tool">ออโต้ ▾</button>
          <input id="imageInput" type="file" accept="image/*" class="hidden" />
        </div>
        <div class="composer">
          <textarea id="postText" placeholder="โพสต์อะไรดีวันนี้..."></textarea>
          <div class="row">
            <div id="imagePreviewBox" class="hidden"></div>
            <button class="btn btn-primary" id="postBtn">โพสต์</button>
          </div>
        </div>
        <div class="feed" id="feed"></div>
      </div>
    </section>

    <aside class="right">
      <div class="profile-card">
        <div style="font-weight:800">${session.displayName || session.username}</div>
        <div style="color:#6b7280;font-size:13px">สถานะ: ออนไลน์</div>
      </div>
    </aside>
  </main>

  <script>
    const STORAGE_KEY = 'sodeclick_v2_posts';
    const username = ${JSON.stringify(session.displayName || session.username)};

    const defaultPosts = [
      { id: Date.now()-3, user:'GN', text:'คิดถึงมากไหมคะ 😂', image:null, likes:1, replies:[], at: new Date().toISOString() },
      { id: Date.now()-2, user:'นกฮูกปลดแอก', text:'เขาอาจจะคิดว่าพี่ขำหมดทุกคนก็ได้', image:null, likes:3, replies:['จริงเลย 😂'], at: new Date().toISOString() },
    ];

    let posts = [];
    let pendingImage = null;

    function loadPosts() {
      try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
        posts = Array.isArray(saved) && saved.length ? saved : defaultPosts;
      } catch {
        posts = defaultPosts;
      }
      savePosts();
    }

    function savePosts() {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
    }

    function renderFeed() {
      const feed = document.getElementById('feed');
      feed.innerHTML = posts.map((p, idx) => {
        const replies = (p.replies || []).map(r => `<div class="reply-item">${r}</div>`).join('');
        const img = p.image ? `<img src="${p.image}" alt="post-image" />` : '';
        return `
          <article class="post">
            <div class="post-head">
              <div class="avatar-sm"></div>
              <div>
                <div class="u">${p.user}</div>
                <div class="t">${new Date(p.at).toLocaleString('th-TH')}</div>
              </div>
            </div>
            <div class="msg">${p.text || ''}${img}</div>
            <div class="post-actions">
              <button class="btn" onclick="likePost(${idx})">👍 Like (${p.likes || 0})</button>
            </div>
            <input class="reply" id="reply-${idx}" placeholder="เขียนตอบกลับ..." />
            <div class="row" style="margin-top:6px"><button class="btn" onclick="replyPost(${idx})">ตอบกลับ</button></div>
            <div class="replies">${replies}</div>
          </article>
        `;
      }).join('');
    }

    function likePost(i) {
      posts[i].likes = (posts[i].likes || 0) + 1;
      savePosts();
      renderFeed();
    }

    function replyPost(i) {
      const input = document.getElementById('reply-' + i);
      const val = (input.value || '').trim();
      if (!val) return;
      posts[i].replies = posts[i].replies || [];
      posts[i].replies.push(username + ': ' + val);
      input.value = '';
      savePosts();
      renderFeed();
    }

    function resetPendingImage() {
      pendingImage = null;
      const box = document.getElementById('imagePreviewBox');
      box.classList.add('hidden');
      box.innerHTML = '';
    }

    document.getElementById('pickImageBtn').addEventListener('click', () => {
      document.getElementById('imageInput').click();
    });

    document.getElementById('imageInput').addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        pendingImage = reader.result;
        const box = document.getElementById('imagePreviewBox');
        box.classList.remove('hidden');
        box.innerHTML = `<img src="${pendingImage}" style="max-width:120px;border:1px solid #e5e7eb;border-radius:8px" /> <button class="btn" id="clearImgBtn">ลบรูป</button>`;
        document.getElementById('clearImgBtn').addEventListener('click', resetPendingImage);
      };
      reader.readAsDataURL(file);
    });

    document.querySelectorAll('.emoji-insert').forEach((btn) => {
      btn.addEventListener('click', () => {
        const ta = document.getElementById('postText');
        ta.value += btn.dataset.emoji;
        ta.focus();
      });
    });

    document.getElementById('postBtn').addEventListener('click', () => {
      const ta = document.getElementById('postText');
      const text = (ta.value || '').trim();
      if (!text && !pendingImage) return;
      posts.unshift({
        id: Date.now(),
        user: username,
        text,
        image: pendingImage,
        likes: 0,
        replies: [],
        at: new Date().toISOString(),
      });
      ta.value = '';
      resetPendingImage();
      savePosts();
      renderFeed();
    });

    loadPosts();
    renderFeed();

    window.likePost = likePost;
    window.replyPost = replyPost;
  </script>
</body>
</html>`;
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
    .map((m) => `<tr><td>${m.id}</td><td>${m.name}</td><td>${m.status === 'blocked' ? 'บล็อก' : 'ปกติ'}</td><td>${m.createdAt.toLocaleDateString('th-TH')}</td></tr>`)
    .join('');

  const recentLogs = auditLogs
    .slice(0, 6)
    .map((log) => `<tr><td>${log.at.toLocaleString('th-TH')}</td><td>${log.actor}</td><td>${log.action}</td><td>${log.details || '-'}</td></tr>`)
    .join('');

  return htmlPage('Dashboard - Admin', `
    <main class="card">
      <div class="head">
        <div class="topline">
          <h2 style="margin:0">แดชบอร์ดหลังบ้าน</h2>
          <span class="pill">ผู้ใช้: ${session.username}</span>
          <span class="pill">สิทธิ์: ${session.role}</span>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <a class="btn" href="/admin/members">จัดการสมาชิก</a>
          <a class="btn" href="/admin/audit">Audit Log</a>
          <a class="btn" href="/admin/logout">ออกจากระบบ</a>
        </div>
      </div>

      <div class="grid" style="margin-bottom:14px">
        <div class="stat"><div class="k">สมาชิกทั้งหมด</div><div class="v">${total}</div></div>
        <div class="stat"><div class="k">รายวัน</div><div class="v">${daily}</div></div>
        <div class="stat"><div class="k">รายสัปดาห์</div><div class="v">${weekly}</div></div>
        <div class="stat"><div class="k">รายเดือน</div><div class="v">${monthly}</div></div>
        <div class="stat"><div class="k">รายปี</div><div class="v">${yearly}</div></div>
      </div>

      <div class="grid" style="grid-template-columns: 1.2fr 1fr; gap:12px; align-items:start;">
        <section class="stat" style="padding:0;overflow:hidden;">
          <div style="padding:12px 12px 0"><strong>สมาชิกสมัครล่าสุด</strong></div>
          <div style="overflow:auto; padding:8px 12px 12px;">
            <table>
              <thead><tr><th>ID</th><th>ชื่อ</th><th>สถานะ</th><th>วันที่สมัคร</th></tr></thead>
              <tbody>${latestMembers || '<tr><td colspan="4">ยังไม่มีข้อมูล</td></tr>'}</tbody>
            </table>
          </div>
        </section>

        <section class="stat" style="padding:0;overflow:hidden;">
          <div style="padding:12px 12px 0"><strong>กิจกรรมล่าสุด (Audit)</strong></div>
          <div style="overflow:auto; padding:8px 12px 12px;">
            <table>
              <thead><tr><th>เวลา</th><th>ผู้ใช้</th><th>เหตุการณ์</th><th>รายละเอียด</th></tr></thead>
              <tbody>${recentLogs || '<tr><td colspan="4">ยังไม่มีประวัติ</td></tr>'}</tbody>
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
    day: { label: 'ช่วงที่เลือก: รายวัน', value: daily },
    week: { label: 'ช่วงที่เลือก: รายสัปดาห์', value: weekly },
    month: { label: 'ช่วงที่เลือก: รายเดือน', value: monthly },
    year: { label: 'ช่วงที่เลือก: รายปี', value: yearly },
    custom: { label: 'ช่วงที่เลือก: วันที่กำหนดเอง', value: customCount },
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
        labels.push('ไม่มีข้อมูล');
        values.push(0);
      }
    } else if (range === 'day') {
      const s = new Date(day);
      const e = new Date(s); e.setDate(s.getDate() + 1);
      labels.push('วันนี้');
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
    .map((m) => `<tr><td>${m.id}</td><td>${m.name}</td><td>${m.gender || '-'}</td><td>${m.status === 'blocked' ? 'บล็อก' : 'ปกติ'}</td><td>${m.createdAt.toLocaleDateString('th-TH')}</td></tr>`)
    .join('');

  const recentLogs = auditLogs
    .slice(0, 6)
    .map((log) => `<tr><td>${log.at.toLocaleString('th-TH')}</td><td>${log.actor}</td><td>${log.action}</td><td>${log.details || '-'}</td></tr>`)
    .join('');

  return htmlPage('Dashboard - Admin', adminShell(session, 'dashboard', `
    <main class="card">
      <div class="head">
        <div class="topline">
          <h2 style="margin:0">แดชบอร์ดหลังบ้าน</h2>
          <span class="pill">ผู้ใช้: ${session.username}</span>
          <span class="pill">สิทธิ์: ${session.role}</span>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <a class="btn" href="/admin/members">จัดการสมาชิก</a>
          <a class="btn" href="/admin/audit">Audit Log</a>
          <a class="btn" href="/admin/logout">ออกจากระบบ</a>
        </div>
      </div>

      <form method="GET" action="/admin/dashboard" class="filters" style="margin-bottom:12px">
        <div>
          <label class="muted">ช่วงเวลาแสดงกราฟ</label>
          <select name="range">
            <option value="day" ${range === 'day' ? 'selected' : ''}>รายวัน (1 วัน)</option>
            <option value="week" ${range === 'week' ? 'selected' : ''}>รายสัปดาห์</option>
            <option value="month" ${range === 'month' ? 'selected' : ''}>รายเดือน</option>
            <option value="year" ${range === 'year' ? 'selected' : ''}>รายปี</option>
            <option value="custom" ${range === 'custom' ? 'selected' : ''}>กำหนดช่วงวันเอง</option>
          </select>
        </div>
        <div>
          <label class="muted">กรองสถานะสมาชิก</label>
          <select name="status">
            <option value="all" ${status === 'all' ? 'selected' : ''}>ทั้งหมด</option>
            <option value="active" ${status === 'active' ? 'selected' : ''}>ปกติ</option>
            <option value="blocked" ${status === 'blocked' ? 'selected' : ''}>บล็อก</option>
          </select>
        </div>
        <div>
          <label class="muted">กรองเพศ</label>
          <select name="gender">
            <option value="all" ${gender === 'all' ? 'selected' : ''}>ทั้งหมด</option>
            <option value="male" ${gender === 'male' ? 'selected' : ''}>ชาย</option>
            <option value="female" ${gender === 'female' ? 'selected' : ''}>หญิง</option>
            <option value="other" ${gender === 'other' ? 'selected' : ''}>อื่นๆ</option>
          </select>
        </div>
        <div>
          <label class="muted">เริ่มวันที่ (Custom)</label>
          <input type="date" name="from" value="${fromDateStr}" />
        </div>
        <div>
          <label class="muted">ถึงวันที่ (Custom)</label>
          <input type="date" name="to" value="${toDateStr}" />
        </div>
        <button class="btn btn-primary" type="submit">Apply Filter</button>
      </form>

      <div class="grid" style="margin-bottom:14px">
        <div class="stat"><div class="k">สมาชิกทั้งหมด (ตาม filter)</div><div class="v">${total}</div></div>
        <div class="stat"><div class="k">${selectedMetric.label}</div><div class="v">${selectedMetric.value}</div></div>
        <div class="stat"><div class="k">เงื่อนไขที่เลือก</div><div class="v" style="font-size:16px">${status}/${gender}${range === 'custom' && fromDateStr && toDateStr ? ` (${fromDateStr} ถึง ${toDateStr})` : ''}</div></div>
      </div>

      <section class="stat" style="margin-bottom:12px;">
        <div class="k" style="margin-bottom:8px">กราฟจำนวนสมาชิกตามช่วงเวลา</div>
        <div style="display:flex;align-items:flex-end;gap:10px;overflow:auto;padding:8px 2px 2px;min-height:190px;">${bars}</div>
      </section>

      <div class="grid" style="grid-template-columns: 1.2fr 1fr; gap:12px; align-items:start;">
        <section class="stat" style="padding:0;overflow:hidden;">
          <div style="padding:12px 12px 0"><strong>สมาชิกล่าสุด (ตาม filter)</strong></div>
          <div style="overflow:auto; padding:8px 12px 12px;">
            <table>
              <thead><tr><th>ID</th><th>ชื่อ</th><th>เพศ</th><th>สถานะ</th><th>วันที่สมัคร</th></tr></thead>
              <tbody>${latestMembers || '<tr><td colspan="5">ยังไม่มีข้อมูล</td></tr>'}</tbody>
            </table>
          </div>
        </section>

        <section class="stat" style="padding:0;overflow:hidden;">
          <div style="padding:12px 12px 0"><strong>กิจกรรมล่าสุด (Audit)</strong></div>
          <div style="overflow:auto; padding:8px 12px 12px;">
            <table>
              <thead><tr><th>เวลา</th><th>ผู้ใช้</th><th>เหตุการณ์</th><th>รายละเอียด</th></tr></thead>
              <tbody>${recentLogs || '<tr><td colspan="4">ยังไม่มีประวัติ</td></tr>'}</tbody>
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
          <button class="btn" type="submit" ${canEdit ? '' : 'disabled'}>บันทึก</button>
        </form>
      </td>
      <td>${m.createdAt.toLocaleDateString('th-TH')}</td>
      <td>${m.status === 'blocked' ? 'บล็อก' : 'ปกติ'}</td>
      <td>
        <div class="actions">
          <form method="POST" action="/admin/members/${m.id}/toggle-block">
            <button class="btn" type="submit" ${canBlock ? '' : 'disabled'}>${m.status === 'blocked' ? 'ปลดบล็อก' : 'บล็อก'}</button>
          </form>
          <form method="POST" action="/admin/members/${m.id}/delete" onsubmit="return confirm('ยืนยันลบสมาชิก?')">
            <button class="btn" type="submit" style="color:#dc2626;border-color:#fecaca" ${canDelete ? '' : 'disabled'}>ลบ</button>
          </form>
        </div>
      </td>
    </tr>
  `).join('');

  return htmlPage('Members - Admin', adminShell(session, 'members', `
    <main class="card">
      <div class="head">
        <div class="topline">
          <h2 style="margin:0">รายชื่อสมาชิกทั้งหมด</h2>
          <span class="pill">ผลลัพธ์ ${filtered.length} / ${members.length}</span>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <a class="btn" href="/admin/dashboard">กลับแดชบอร์ด</a>
          <a class="btn" href="/admin/audit">Audit Log</a>
          <a class="btn" href="/admin/logout">ออกจากระบบ</a>
        </div>
      </div>

      <form method="GET" action="/admin/members" class="filters" style="margin-bottom:12px">
        <div>
          <label class="muted">ค้นหา (ชื่อ/อีเมล/ID)</label>
          <input name="q" value="${q}" placeholder="เช่น nina หรือ U001" />
        </div>
        <div>
          <label class="muted">สถานะ</label>
          <select name="status">
            <option value="all" ${status === 'all' ? 'selected' : ''}>ทั้งหมด</option>
            <option value="active" ${status === 'active' ? 'selected' : ''}>ปกติ</option>
            <option value="blocked" ${status === 'blocked' ? 'selected' : ''}>บล็อก</option>
          </select>
        </div>
        <button class="btn btn-primary" type="submit">ค้นหา/กรอง</button>
      </form>

      <div style="overflow:auto">
        <table>
          <thead>
            <tr><th>ID</th><th>ข้อมูลสมาชิก (แก้ไขได้)</th><th>วันที่สมัคร</th><th>สถานะ</th><th>จัดการ</th></tr>
          </thead>
          <tbody>${rows || '<tr><td colspan="5">ไม่พบข้อมูลสมาชิกตามเงื่อนไข</td></tr>'}</tbody>
        </table>
      </div>
      <p class="muted" style="margin-top:8px">สิทธิ์ปัจจุบัน: ${session.role} | staff=ดูอย่างเดียว, admin=แก้ไข/บล็อก, super_admin=ลบได้</p>
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
          <a class="btn" href="/admin/dashboard">กลับแดชบอร์ด</a>
          <a class="btn" href="/admin/members">จัดการสมาชิก</a>
        </div>
      </div>

      <div style="border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;background:#fff">
        <div class="log-row" style="font-weight:700;background:#f8fafc">
          <div>เวลา</div><div>ผู้ใช้งาน</div><div>เหตุการณ์</div>
        </div>
        ${rows || '<div class="log-row"><div>-</div><div>-</div><div>ยังไม่มีประวัติ</div></div>'}
      </div>
    </main>
  `));
}

function renderRevenuePage(session) {
  return htmlPage('Revenue - Admin', adminShell(session, 'revenue', `
    <main class="card">
      <div class="head">
        <h2 style="margin:0">รายได้</h2>
        <a class="btn" href="/admin/dashboard">กลับภาพรวม</a>
      </div>
      <p>หน้านี้เป็นโครงสำหรับระบบรายได้ (Revenue) พร้อมต่อยอดเชื่อม Payment/รายงานจริง</p>
    </main>
  `));
}

function renderPromotionsPage(session) {
  return htmlPage('Promotions - Admin', adminShell(session, 'promotions', `
    <main class="card">
      <div class="head">
        <h2 style="margin:0">โปรโมชั่น</h2>
        <a class="btn" href="/admin/dashboard">กลับภาพรวม</a>
      </div>
      <p>หน้านี้เป็นโครงสำหรับจัดการโปรโมชั่น เช่น คูปอง แคมเปญ และส่วนลด</p>
    </main>
  `));
}

function renderActivitiesPage(session) {
  return htmlPage('Activities - Admin', adminShell(session, 'activities', `
    <main class="card">
      <div class="head">
        <h2 style="margin:0">กิจกรรม</h2>
        <a class="btn" href="/admin/audit">เปิด Audit Log</a>
      </div>
      <p>หน้านี้เป็นโครงกิจกรรมระบบ/ผู้ใช้งาน สามารถต่อยอด Timeline หรือ Event Monitor ได้</p>
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
      userSessions.set(sid, { username: body.username, displayName: 'พล' });
      redirect(res, '/app', `user_sid=${sid}; HttpOnly; Path=/; SameSite=Lax; Max-Age=28800`);
      return;
    }

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(renderUserLogin('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง'));
    return;
  }

  if (path === '/app') {
    const userSession = requireUserAuth(req, res);
    if (!userSession) return;
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(renderUserApp(userSession));
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
