async function handleMatchRoutes(ctx) {
  const { req, res, url, deps } = ctx;
  const {
    getSessionUser,
    parseBody,
    parseForm,
    readJson,
    writeJson,
    usersFile,
    likesFile,
    matchesFile,
    coinTxFile,
    renderMatchPage,
  } = deps;

  if (url.pathname === '/match' && req.method === 'GET') {
    const me = getSessionUser(req);
    if (!me) {
      res.writeHead(302, { Location: '/login' });
      res.end();
      return true;
    }
    const query = Object.fromEntries(url.searchParams.entries());
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(renderMatchPage(me, query));
    return true;
  }

  if (url.pathname === '/match/action' && req.method === 'POST') {
    const me = getSessionUser(req);
    if (!me) {
      res.writeHead(302, { Location: '/login' });
      res.end();
      return true;
    }

    const body = parseForm(await parseBody(req));
    const target = String(body.target || '').trim();
    const type = String(body.type || 'like').trim();
    if (!target || target === me.username) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(renderMatchPage(me, {}, 'ข้อมูลไม่ถูกต้อง'));
      return true;
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
        return true;
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
    return true;
  }

  if (url.pathname === '/match/boost' && req.method === 'POST') {
    const me = getSessionUser(req);
    if (!me) {
      res.writeHead(302, { Location: '/login' });
      res.end();
      return true;
    }

    const users = readJson(usersFile);
    const idx = users.findIndex((u) => u.email === me.email || u.username === me.username);
    if (idx >= 0) {
      const boostCost = 30;
      if ((users[idx].coins || 0) < boostCost) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(renderMatchPage(users[idx] || me, {}, 'เหรียญไม่พอสำหรับ Boost (ต้องใช้ 30)'));
        return true;
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
    return true;
  }

  return false;
}

module.exports = { handleMatchRoutes };
