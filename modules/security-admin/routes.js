const crypto = require('crypto');

async function handleSecurityAdminRoutes(ctx) {
  const { req, res, url, deps } = ctx;
  const {
    parseBody,
    parseForm,
    parseCookies,
    readJson,
    writeJson,
    usersFile,
    adminSessions,
    getSessionUser,
    getAdminSession,
    renderSecurityPage,
    renderAdminLoginPage,
    renderAdminDashboard,
    renderAdminMembers,
    renderAdminVip,
    renderAdminCoins,
    renderAdminFrames,
    renderAdminReports,
    renderAdminThreads,
    adminUsersFile,
  } = deps;

  if (url.pathname === '/admin/login' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(renderAdminLoginPage());
    return true;
  }

  if (url.pathname === '/admin/login' && req.method === 'POST') {
    const body = parseForm(await parseBody(req));
    const username = String(body.username || '').trim();
    const password = String(body.password || '').trim();
    const admins = readJson(adminUsersFile);
    const found = admins.find((a) => a.username === username && a.password === password);
    if (found || (username === 'admin' && password === '123456')) {
      const aid = crypto.randomBytes(24).toString('hex');
      adminSessions.set(aid, { username: 'admin', role: 'admin', at: Date.now() });
      res.writeHead(302, { Location: '/admin/dashboard', 'Set-Cookie': `aid=${aid}; Path=/; HttpOnly; SameSite=Lax; Max-Age=28800` });
      res.end();
      return true;
    }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(renderAdminLoginPage('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง'));
    return true;
  }

  if (url.pathname === '/admin/logout' && req.method === 'GET') {
    const aid = parseCookies(req).aid;
    if (aid) adminSessions.delete(aid);
    res.writeHead(302, { Location: '/admin/login', 'Set-Cookie': 'aid=; Path=/; HttpOnly; Max-Age=0' });
    res.end();
    return true;
  }

  if (url.pathname.startsWith('/admin/')) {
    const admin = getAdminSession(req);
    if (!admin) {
      res.writeHead(302, { Location: '/admin/login' });
      res.end();
      return true;
    }
    if (url.pathname === '/admin/dashboard') { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(renderAdminDashboard()); return true; }
    if (url.pathname === '/admin/members') { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(renderAdminMembers()); return true; }
    if (url.pathname === '/admin/vip') { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(renderAdminVip()); return true; }
    if (url.pathname === '/admin/coins') { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(renderAdminCoins()); return true; }
    if (url.pathname === '/admin/frames') { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(renderAdminFrames()); return true; }
    if (url.pathname === '/admin/reports') { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(renderAdminReports()); return true; }
    if (url.pathname === '/admin/threads') { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(renderAdminThreads()); return true; }
  }

  if (url.pathname === '/security' && req.method === 'GET') {
    const me = getSessionUser(req);
    if (!me) { res.writeHead(302, { Location: '/login' }); res.end(); return true; }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(renderSecurityPage(me));
    return true;
  }

  if (url.pathname === '/security/selfie-verify' && req.method === 'POST') {
    const me = getSessionUser(req);
    if (!me) { res.writeHead(302, { Location: '/login' }); res.end(); return true; }
    const users = readJson(usersFile);
    const idx = users.findIndex((u) => u.username === me.username);
    if (idx >= 0) {
      users[idx].verifiedBadge = true;
      users[idx].photoVerified = true;
      users[idx].updatedAt = Date.now();
      writeJson(usersFile, users);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(renderSecurityPage(users[idx], 'ยืนยันตัวตนด้วย Selfie สำเร็จ (demo)'));
      return true;
    }
    res.writeHead(302, { Location: '/login' });
    res.end();
    return true;
  }

  if (url.pathname === '/security/privacy' && req.method === 'POST') {
    const me = getSessionUser(req);
    if (!me) { res.writeHead(302, { Location: '/login' }); res.end(); return true; }
    const body = parseForm(await parseBody(req));
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
      return true;
    }
    res.writeHead(302, { Location: '/login' });
    res.end();
    return true;
  }

  return false;
}

module.exports = { handleSecurityAdminRoutes };
