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
      grid-template-columns: 1fr 180px 180px auto;
      gap:8px;
      align-items:end;
    }
    .log-row { display:grid; grid-template-columns: 180px 160px 1fr; gap:8px; padding:10px; border-bottom:1px solid #e5e7eb; font-size:14px; }
    @media (max-width: 760px) {
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
        <a class="btn btn-primary" href="/admin/login">Login</a>
      </div>
      <p>ระบบหลังบ้าน V2 พร้อมใช้งานเบื้องต้นแล้ว</p>
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
  const range = (queryParams.get('range') || 'month').trim(); // day|week|month|year
  const status = (queryParams.get('status') || 'all').trim(); // all|active|blocked
  const gender = (queryParams.get('gender') || 'all').trim(); // all|male|female|other

  const now = new Date();
  const day = startOfDay(now);
  const week = new Date(day); week.setDate(week.getDate() - 7);
  const month = new Date(day); month.setMonth(month.getMonth() - 1);
  const year = new Date(day); year.setFullYear(year.getFullYear() - 1);

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

  const selectedMap = {
    day: { label: 'ช่วงที่เลือก: รายวัน', value: daily },
    week: { label: 'ช่วงที่เลือก: รายสัปดาห์', value: weekly },
    month: { label: 'ช่วงที่เลือก: รายเดือน', value: monthly },
    year: { label: 'ช่วงที่เลือก: รายปี', value: yearly },
  };
  const selectedMetric = selectedMap[range] || selectedMap.month;

  const buildSeries = () => {
    const labels = [];
    const values = [];

    if (range === 'day') {
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

      <form method="GET" action="/admin/dashboard" class="filters" style="margin-bottom:12px">
        <div>
          <label class="muted">ช่วงเวลาแสดงกราฟ</label>
          <select name="range">
            <option value="day" ${range === 'day' ? 'selected' : ''}>รายวัน (1 วัน)</option>
            <option value="week" ${range === 'week' ? 'selected' : ''}>รายสัปดาห์</option>
            <option value="month" ${range === 'month' ? 'selected' : ''}>รายเดือน</option>
            <option value="year" ${range === 'year' ? 'selected' : ''}>รายปี</option>
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
        <button class="btn btn-primary" type="submit">Apply Filter</button>
      </form>

      <div class="grid" style="margin-bottom:14px">
        <div class="stat"><div class="k">สมาชิกทั้งหมด (ตาม filter)</div><div class="v">${total}</div></div>
        <div class="stat"><div class="k">${selectedMetric.label}</div><div class="v">${selectedMetric.value}</div></div>
        <div class="stat"><div class="k">เงื่อนไขที่เลือก</div><div class="v" style="font-size:16px">${status}/${gender}</div></div>
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
  `);
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

  return htmlPage('Members - Admin', `
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
  `);
}

function renderAuditPage(session) {
  const rows = auditLogs.map((log) => `
    <div class="log-row">
      <div>${log.at.toLocaleString('th-TH')}</div>
      <div><strong>${log.actor}</strong></div>
      <div>${log.action} ${log.details ? `- ${log.details}` : ''}</div>
    </div>
  `).join('');

  return htmlPage('Audit Log - Admin', `
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
    const found = adminAccounts.find((u) => u.username === body.username && u.password === body.password);

    if (found) {
      const sid = crypto.randomBytes(24).toString('hex');
      sessions.set(sid, { username: found.username, role: found.role, displayName: found.displayName, createdAt: Date.now() });
      addAudit('login', found.username, `role=${found.role}`);
      redirect(res, '/admin/dashboard', `sid=${sid}; HttpOnly; Path=/; SameSite=Lax; Max-Age=28800`);
      return;
    }

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(renderAdminLogin('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง'));
    return;
  }

  if (path === '/admin/logout') {
    const session = getSession(req);
    const sid = parseCookies(req).sid;
    if (session) addAudit('logout', session.username, `role=${session.role}`);
    if (sid) sessions.delete(sid);
    redirect(res, '/admin/login', 'sid=; HttpOnly; Path=/; Max-Age=0');
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
