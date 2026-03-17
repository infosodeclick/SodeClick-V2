async function handleAuthRoutes(ctx) {
  const { req, res, url, deps } = ctx;
  const {
    parseForm,
    readJson,
    writeJson,
    usersFile,
    pendingFile,
    userSessions,
    renderRegisterPage,
    renderVerifyPage,
    renderLoginPage,
    forgotPasswordPage,
    createUserId,
  } = deps;

  if (url.pathname === '/register' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(renderRegisterPage());
    return true;
  }

  if (url.pathname === '/verify' && req.method === 'GET') {
    const email = url.searchParams.get('email') || '';
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(renderVerifyPage(email));
    return true;
  }

  if (url.pathname === '/login' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(renderLoginPage());
    return true;
  }

  if (url.pathname === '/logout' && req.method === 'GET') {
    const sid = deps.parseCookies(req).sid;
    if (sid) userSessions.delete(sid);
    res.writeHead(302, { Location: '/login', 'Set-Cookie': 'sid=; Path=/; HttpOnly; Max-Age=0' });
    res.end();
    return true;
  }

  if (url.pathname === '/forgot-password' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(forgotPasswordPage());
    return true;
  }

  if (url.pathname === '/auth/google' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(renderLoginPage('', 'Google login (demo) พร้อมเชื่อม OAuth ในรอบถัดไป'));
    return true;
  }

  if (url.pathname === '/register' && req.method === 'POST') {
    const body = parseForm(await deps.parseBody(req));
    const username = String(body.username || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '').trim();
    if (!username || !email || !password) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(renderRegisterPage('กรอกข้อมูลไม่ครบ'));
      return true;
    }

    const users = readJson(usersFile);
    if (users.find((u) => u.email === email || u.username === username)) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(renderRegisterPage('อีเมลหรือ Username นี้ถูกใช้แล้ว'));
      return true;
    }

    const pending = readJson(pendingFile).filter((x) => x.email !== email);
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    pending.push({
      userId: createUserId(),
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
    res.end(renderVerifyPage(email, '', `OTP สำหรับเดโม: ${otp}`));
    return true;
  }

  if (url.pathname === '/verify' && req.method === 'POST') {
    const body = parseForm(await deps.parseBody(req));
    const email = String(body.email || '').trim().toLowerCase();
    const otp = String(body.otp || '').trim();
    const pending = readJson(pendingFile);
    const row = pending.find((x) => x.email === email);
    if (!row || row.otp !== otp) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(renderVerifyPage(email, 'OTP ไม่ถูกต้อง'));
      return true;
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
      bio: '', interests: '', status: 'online', coins: 0,
      vipStatus: false, verifiedBadge: false, emailVerified: true, phoneVerified: false,
      occupation: '', relationshipGoal: 'friend', framesOwned: ['F001'], activeFrame: '',
      role: 'member',
      createdAt: Date.now(),
    });
    writeJson(usersFile, users);
    writeJson(pendingFile, pending.filter((x) => x.email !== email));

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(renderLoginPage('', 'สมัครสมาชิกสำเร็จแล้ว กรุณาเข้าสู่ระบบ'));
    return true;
  }

  if (url.pathname === '/login' && req.method === 'POST') {
    const body = parseForm(await deps.parseBody(req));
    const login = String(body.login || '').trim();
    const password = String(body.password || '').trim();
    const users = readJson(usersFile);
    const user = users.find((u) => (u.email === login.toLowerCase() || u.username === login) && u.password === password);
    if (!user) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(renderLoginPage('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง'));
      return true;
    }

    const sid = require('crypto').randomBytes(24).toString('hex');
    userSessions.set(sid, { email: user.email, username: user.username, createdAt: Date.now() });
    res.writeHead(302, { Location: '/profile', 'Set-Cookie': `sid=${sid}; Path=/; HttpOnly; SameSite=Lax; Max-Age=28800` });
    res.end();
    return true;
  }

  if (url.pathname === '/forgot-password' && req.method === 'POST') {
    const body = parseForm(await deps.parseBody(req));
    const email = String(body.email || '').trim().toLowerCase();
    const users = readJson(usersFile);
    const idx = users.findIndex((u) => u.email === email);
    if (idx < 0) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(forgotPasswordPage('ไม่พบอีเมลนี้ในระบบ'));
      return true;
    }
    const temp = Math.random().toString(36).slice(2, 10);
    users[idx].password = temp;
    users[idx].updatedAt = Date.now();
    writeJson(usersFile, users);
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(forgotPasswordPage('', `รีเซ็ตสำเร็จ (demo) รหัสใหม่: ${temp}`));
    return true;
  }

  return false;
}

module.exports = { handleAuthRoutes };
