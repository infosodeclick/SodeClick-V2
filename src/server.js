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
  const publicPosts = [
    { user: 'GN', text: 'คิดถึงมากไหมคะ 😊', at: 'เมื่อสักครู่', likes: 12, comments: 4 },
    { user: 'นกฮูกปลดแอก', text: 'เขาอาจจะคิดว่าพี่ขำหมดทุกคนก็ได้ 😂', at: '5 นาทีที่แล้ว', likes: 21, comments: 7 },
    { user: 'สมาชิกใหม่', text: 'ขอบคุณทุกคนที่ต้อนรับครับ ✨', at: '15 นาทีที่แล้ว', likes: 8, comments: 2 },
  ];

  const feed = publicPosts.map((p) => `
    <article class="stat" style="margin-bottom:10px;background:#fff">
      <div style="display:flex;justify-content:space-between;gap:8px;align-items:center">
        <strong>${p.user}</strong>
        <span class="muted">${p.at}</span>
      </div>
      <div style="margin-top:8px;white-space:pre-wrap">${p.text}</div>
      <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap">
        <a class="btn" href="/login">👍 ถูกใจ (${p.likes})</a>
        <a class="btn" href="/login">💬 คอมเมนต์ (${p.comments})</a>
      </div>
    </article>
  `).join('');

  return htmlPage('SodeClick V2', `
    <main class="card">
      <div class="head">
        <h2 style="margin:0">กระดานสาธารณะ</h2>
        <a class="btn btn-primary" href="/login">Login</a>
      </div>

      <p class="muted" style="margin-top:6px">
        หน้าแรกสามารถดูโพสต์ได้ แต่การกดถูกใจ / คอมเมนต์ / โพสต์ใหม่ ต้องเข้าสู่ระบบก่อน
      </p>

      <section style="margin-top:12px">${feed}</section>

      <div class="stat" style="margin-top:12px;border-style:dashed;background:#f8fafc">
        <strong>ต้องการมีส่วนร่วม?</strong>
        <p class="muted" style="margin:6px 0 10px">เข้าสู่ระบบเพื่อโพสต์, คอมเมนต์ และกดถูกใจได้ทันที</p>
        <a class="btn btn-primary" href="/login">เข้าสู่ระบบก่อนใช้งาน</a>
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
  return htmlPage('หน้าบ้าน - SodeClick V2', `
    <style>
      .social-wrap { display:grid; gap:12px; }
      .board-topbar { display:flex; justify-content:space-between; align-items:stretch; gap:10px; padding:0; border-radius:14px; background:linear-gradient(135deg,#60a5fa,#f9a8d4); border:1px solid #dbeafe; overflow:hidden; box-shadow:0 8px 20px rgba(96,165,250,.18); }
      .board-nav { display:flex; align-items:center; overflow:auto; }
      .board-tab { color:#ffffff; text-decoration:none; padding:13px 16px; font-weight:700; display:flex; align-items:center; gap:8px; white-space:nowrap; border-right:1px solid rgba(255,255,255,.22); transition:.2s ease; }
      .board-tab:hover { background:rgba(255,255,255,.15); }
      .board-tab.active { background:rgba(255,255,255,.2); color:#fff; border-radius:10px; margin:6px; border-right:0; }
      .top-actions { display:flex; align-items:center; gap:8px; padding:8px; }
      .top-btn { border:0; border-radius:10px; color:#fff; padding:8px 12px; font-weight:700; text-decoration:none; box-shadow:0 4px 10px rgba(96,165,250,.2); background:linear-gradient(135deg,#60a5fa,#f9a8d4); }
      .top-btn.logout { background:linear-gradient(135deg,#60a5fa,#f9a8d4); }
      .top-btn.profile { background:linear-gradient(135deg,#60a5fa,#f9a8d4); }
      .composer-box { border:1px solid #e5e7eb; border-radius:12px; background:#fff; overflow:visible; }
      .composer-head { padding:10px 12px; border-bottom:1px solid #eef2f7; color:#64748b; font-weight:700; display:flex; align-items:center; justify-content:space-between; gap:10px; }
      .composer-body { padding:10px 12px; }
      .composer-input { width:100%; min-height:92px; border:1px solid #d1d5db; border-radius:10px; padding:10px; resize:vertical; font-family:inherit; }
      .composer-actions { display:flex; justify-content:flex-end; align-items:center; margin-top:10px; gap:10px; }
      .tool-row { display:flex; flex-wrap:wrap; gap:8px; align-items:center; }
      .icon-btn { border:1px solid #dbe3f0; border-radius:10px; background:#fff; padding:7px 10px; cursor:pointer; }
      .emoji-wrap { position:relative; }
      .emoji-panel { position:absolute; bottom:42px; right:0; left:auto; width:340px; max-width:min(340px, calc(100vw - 40px)); background:#fff; border:1px solid #e5e7eb; border-radius:14px; box-shadow:0 18px 35px rgba(0,0,0,.18); padding:10px; z-index:30; overflow:hidden; }
      .emoji-head { color:#6b7280; font-size:13px; margin-bottom:6px; font-weight:700; }
      .emoji-grid { display:grid; grid-template-columns:repeat(8, minmax(0,1fr)); gap:6px; max-width:100%; overflow:hidden; }
      .emoji-chip { border:0; background:#fff; border-radius:8px; font-size:22px; line-height:1; padding:5px; cursor:pointer; width:100%; }
      .emoji-chip:hover { background:#f3f4f6; }
      .send-btn { padding:8px 14px; border:0; border-radius:10px; font-weight:700; color:#fff; background:linear-gradient(135deg,#60a5fa,#f9a8d4); cursor:pointer; }
      .feed-list { display:grid; gap:10px; }
      .post-card { border:1px solid #e5e7eb; border-radius:12px; background:#fff; padding:12px; }
      .post-top { display:flex; justify-content:space-between; gap:10px; align-items:center; }
      .post-user { font-weight:800; }
      .post-time { color:#64748b; font-size:12px; }
      .post-text { margin-top:8px; white-space:pre-wrap; }
      .post-image { margin-top:8px; max-width:100%; border-radius:10px; border:1px solid #e5e7eb; }
      .post-bar { margin-top:10px; display:flex; gap:8px; flex-wrap:wrap; }
      .small-btn { border:1px solid #dbe3f0; border-radius:8px; background:#fff; padding:6px 10px; cursor:pointer; }
      .reply-row { margin-top:8px; display:flex; gap:8px; }
      .reply-input { flex:1; border:1px solid #d1d5db; border-radius:8px; padding:8px; }
      .reply-list { margin-top:8px; display:grid; gap:6px; }
      .reply-item { border:1px solid #e5e7eb; border-radius:8px; background:#f8fafc; padding:7px 8px; font-size:14px; }
      .empty-feed { border:1px dashed #cbd5e1; border-radius:12px; background:#fff; padding:16px; color:#64748b; text-align:center; }
      .hidden { display:none; }
      @media (max-width: 640px) {
        .emoji-panel { width:300px; right:0; left:auto; }
        .emoji-grid { grid-template-columns:repeat(7, minmax(0,1fr)); }
      }
    </style>

    <main class="card social-wrap">
      <div class="board-topbar">
        <nav class="board-nav">
          <a class="board-tab active" href="/app">📋 กระดาน</a>
          <a class="board-tab" href="/app?tab=online">🟢 ออนไลน์</a>
          <a class="board-tab" href="/app?tab=dj">🎧 ดีเจ</a>
          <a class="board-tab" href="/app?tab=superstar">⭐ ซุปตาร์</a>
          <a class="board-tab" href="/app?tab=games">🎮 เกมส์</a>
        </nav>
        <div class="top-actions">
          <a class="top-btn profile" href="/app?tab=profile">โปรไฟล์</a>
          <a class="top-btn logout" href="/logout">Logout</a>
        </div>
      </div>

      <div class="composer-box">
        <div class="composer-head">
          <span>แสดงความคิดเห็นในชื่อ ${session.displayName || session.username}</span>
        </div>
        <div class="composer-body">
          <textarea id="postInput" class="composer-input" placeholder="เขียนโพสต์หรือความคิดเห็น..."></textarea>
          <div id="imagePreviewWrap" class="hidden" style="margin-top:8px"></div>
          <div class="composer-actions">
            <div class="tool-row">
              <button type="button" class="icon-btn" id="pickImageBtn">📷 รูป</button>
              <div class="emoji-wrap">
                <button type="button" class="icon-btn" id="emojiToggleBtn">😊 อีโมจิ</button>
                <div id="emojiPanel" class="emoji-panel hidden">
                  <div class="emoji-head">ใช้ล่าสุด</div>
                  <div class="emoji-grid" id="emojiGrid"></div>
                </div>
              </div>
              <input id="imageInput" type="file" accept="image/*" class="hidden" />
            </div>
            <button type="button" class="send-btn" id="postBtn">โพสต์</button>
          </div>
        </div>
      </div>

      <div id="feed" class="feed-list"></div>
      <div id="emptyFeed" class="empty-feed hidden">ยังไม่มีโพสต์ ลองโพสต์ข้อความแรกได้เลย</div>
    </main>

    <script>
      const STORAGE_KEY = 'sodeclick_v2_social_posts';
      const currentUser = ${JSON.stringify(session.displayName || session.username)};
      let pendingImage = null;

      function nowText(iso) { try { return new Date(iso).toLocaleString('th-TH'); } catch (e) { return iso; } }
      function esc(text) {
        return String(text || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\"/g,'&quot;').replace(/'/g,'&#39;');
      }
      function getDefaultPosts() {
        return [
          { id: Date.now()-2, user:'GN', text:'คิดถึงมากไหมคะ 😊', image:'', likes:1, likedBy:['GN'], replies:[], createdAt:new Date().toISOString() },
          { id: Date.now()-1, user:'นกฮูกปลดแอก', text:'เขาอาจจะคิดว่าพี่ขำหมดทุกคนก็ได้ 😂', image:'', likes:3, likedBy:['A','B','C'], replies:['เห็นด้วยเลย'], createdAt:new Date().toISOString() }
        ];
      }
      function loadPosts(){ try{ const raw=localStorage.getItem(STORAGE_KEY); const arr=raw?JSON.parse(raw):[]; if(Array.isArray(arr)&&arr.length) return arr; }catch(e){} return getDefaultPosts(); }
      function savePosts(posts){ localStorage.setItem(STORAGE_KEY, JSON.stringify(posts)); }

      let posts = loadPosts();

      function renderFeed(){
        const feed=document.getElementById('feed');
        const empty=document.getElementById('emptyFeed');
        if(!posts.length){ feed.innerHTML=''; empty.classList.remove('hidden'); return; }
        empty.classList.add('hidden');
        let html='';
        for(let i=0;i<posts.length;i+=1){
          const p=posts[i];
          const likedBy=Array.isArray(p.likedBy)?p.likedBy:[];
          const meLiked=likedBy.indexOf(currentUser)>=0;
          const replies=Array.isArray(p.replies)?p.replies:[];
          let replyHtml='';
          for(let j=0;j<replies.length;j+=1){ replyHtml += '<div class="reply-item">'+esc(replies[j])+'</div>'; }
          const imageHtml=p.image?('<img class="post-image" src="'+p.image+'" alt="post-image" />'):'';
          html += ''
            + '<article class="post-card">'
            + '  <div class="post-top"><div><div class="post-user">'+esc(p.user)+'</div><div class="post-time">'+nowText(p.createdAt)+'</div></div></div>'
            + '  <div class="post-text">'+esc(p.text)+'</div>'
            + imageHtml
            + '  <div class="post-bar"><button type="button" class="small-btn" data-like="'+i+'">'+(meLiked?'👎 Unlike':'👍 Like')+' ('+likedBy.length+')</button></div>'
            + '  <div class="reply-row"><input class="reply-input" id="reply-'+i+'" placeholder="เขียนตอบกลับ..." /><button type="button" class="small-btn" data-reply="'+i+'">ตอบกลับ</button></div>'
            + '  <div class="reply-list">'+replyHtml+'</div>'
            + '</article>';
        }
        feed.innerHTML=html;

        document.querySelectorAll('[data-like]').forEach((el)=>{
          el.addEventListener('click', function(){
            const idx=Number(this.getAttribute('data-like')); if(Number.isNaN(idx)||!posts[idx]) return;
            if(!Array.isArray(posts[idx].likedBy)) posts[idx].likedBy=[];
            const pos=posts[idx].likedBy.indexOf(currentUser);
            if(pos>=0) posts[idx].likedBy.splice(pos,1); else posts[idx].likedBy.push(currentUser);
            posts[idx].likes=posts[idx].likedBy.length;
            savePosts(posts); renderFeed();
          });
        });

        document.querySelectorAll('[data-reply]').forEach((el)=>{
          el.addEventListener('click', function(){
            const idx=Number(this.getAttribute('data-reply')); if(Number.isNaN(idx)||!posts[idx]) return;
            const input=document.getElementById('reply-'+idx); if(!input) return;
            const val=(input.value||'').trim(); if(!val) return;
            if(!Array.isArray(posts[idx].replies)) posts[idx].replies=[];
            posts[idx].replies.push(currentUser+': '+val);
            input.value=''; savePosts(posts); renderFeed();
          });
        });
      }

      function clearPreview(){
        pendingImage=null; const wrap=document.getElementById('imagePreviewWrap');
        wrap.innerHTML=''; wrap.classList.add('hidden');
      }

      document.getElementById('pickImageBtn').addEventListener('click',()=>document.getElementById('imageInput').click());
      document.getElementById('imageInput').addEventListener('change', function(e){
        const file=e.target.files && e.target.files[0]; if(!file) return;
        const reader=new FileReader();
        reader.onload=function(){
          pendingImage=String(reader.result||'');
          const wrap=document.getElementById('imagePreviewWrap');
          wrap.classList.remove('hidden');
          wrap.innerHTML='<img src="'+pendingImage+'" alt="preview" style="max-width:180px;border:1px solid #e5e7eb;border-radius:10px" /> <button type="button" class="small-btn" id="removeImageBtn">ลบรูป</button>';
          const btn=document.getElementById('removeImageBtn'); if(btn) btn.addEventListener('click', clearPreview);
        };
        reader.readAsDataURL(file);
      });

      const emojiList = ['😂','🥰','😆','🤣','😀','🤔','😍','😉','😁','😄','😅','😭','😎','😇','🙂','🙃','😘','😜','🤗','🙌','👏','🔥','👍','❤️','💙','✨','🎉','🙏','💬','🥳','🤩','😴'];
      const emojiGrid = document.getElementById('emojiGrid');
      emojiGrid.innerHTML = emojiList.map((e) => '<button type="button" class="emoji-chip" data-emoji="'+e+'">'+e+'</button>').join('');

      const emojiToggleBtn = document.getElementById('emojiToggleBtn');
      const emojiPanel = document.getElementById('emojiPanel');
      emojiToggleBtn.addEventListener('click', function(){
        emojiPanel.classList.toggle('hidden');
      });

      emojiGrid.addEventListener('click', function(ev){
        const btn = ev.target.closest('[data-emoji]');
        if (!btn) return;
        const emo = btn.getAttribute('data-emoji') || '';
        const ta = document.getElementById('postInput');
        ta.value = (ta.value || '') + emo;
        ta.focus();
        emojiPanel.classList.add('hidden');
      });

      document.addEventListener('click', function(ev){
        const wrap = ev.target.closest('.emoji-wrap');
        if (!wrap) emojiPanel.classList.add('hidden');
      });

      document.getElementById('postBtn').addEventListener('click', function(){
        const ta=document.getElementById('postInput'); const text=(ta.value||'').trim();
        if(!text && !pendingImage) return;
        posts.unshift({id:Date.now(), user:currentUser, text, image:pendingImage||'', likes:0, likedBy:[], replies:[], createdAt:new Date().toISOString()});
        ta.value=''; clearPreview(); savePosts(posts); renderFeed();
      });

      renderFeed();
    </script>
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
    try {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(renderUserApp(userSession));
    } catch (err) {
      console.error('[user-app-render-error]', err);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(htmlPage('SodeClick V2', `
        <main class="card">
          <h2 style="margin-top:0">หน้าหลักผู้ใช้</h2>
          <p class="muted">เกิดข้อผิดพลาดชั่วคราวในหน้าแอป ระบบสลับเป็นโหมดสำรองให้ใช้งานได้ก่อน</p>
          <p><a class="btn btn-primary" href="/login">กลับหน้า Login</a></p>
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
