async function handleChatRoutes(ctx) {
  const { req, res, url, deps } = ctx;
  const {
    getSessionUser,
    parseBody,
    parseForm,
    readJson,
    writeJson,
    usersFile,
    messagesFile,
    giftsFile,
    coinTxFile,
    matchesFile,
    blocksFile,
    reportsFile,
    renderChatPage,
    isSpamAction,
    containsBlockedWords,
  } = deps;

  if (url.pathname.startsWith('/chat/') && req.method === 'GET') {
    const me = getSessionUser(req);
    if (!me) { res.writeHead(302, { Location: '/login' }); res.end(); return true; }
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
    return true;
  }

  if (url.pathname.startsWith('/chat/') && req.method === 'POST' && !url.pathname.endsWith('/gift') && !url.pathname.endsWith('/block') && !url.pathname.endsWith('/report')) {
    const me = getSessionUser(req);
    if (!me) { res.writeHead(302, { Location: '/login' }); res.end(); return true; }
    const matchId = url.pathname.replace('/chat/', '').trim();
    const body = parseForm(await parseBody(req));
    const txt = String((body.quick || '') + (body.message || '')).trim();
    if (!txt) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(renderChatPage(me, matchId, 'กรุณาพิมพ์ข้อความก่อนส่ง'));
      return true;
    }
    if (isSpamAction(`chat:send:${me.username}`, 1200)) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(renderChatPage(me, matchId, 'ส่งข้อความเร็วเกินไป กรุณารอสักครู่'));
      return true;
    }
    if (containsBlockedWords(txt)) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(renderChatPage(me, matchId, 'ข้อความมีเนื้อหาที่ไม่เหมาะสม'));
      return true;
    }
    const messages = readJson(messagesFile);
    messages.push({ id: `MSG${Date.now()}`, matchId, sender: me.username, text: txt, at: Date.now(), read: false });
    writeJson(messagesFile, messages);
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(renderChatPage(me, matchId, 'ส่งข้อความสำเร็จ'));
    return true;
  }

  if (url.pathname.startsWith('/chat/') && url.pathname.endsWith('/gift') && req.method === 'POST') {
    const me = getSessionUser(req);
    if (!me) { res.writeHead(302, { Location: '/login' }); res.end(); return true; }
    const matchId = url.pathname.replace('/chat/', '').replace('/gift', '').trim();
    const body = parseForm(await parseBody(req));
    const price = Number(body.price || 0);
    const giftId = String(body.giftId || '').trim();
    const users = readJson(usersFile);
    const idx = users.findIndex((u) => u.username === me.username);
    if (idx < 0 || (users[idx].coins || 0) < price) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(renderChatPage(me, matchId, 'เหรียญไม่พอสำหรับส่งของขวัญ'));
      return true;
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
    return true;
  }

  if (url.pathname.startsWith('/chat/') && url.pathname.endsWith('/block') && req.method === 'POST') {
    const me = getSessionUser(req);
    if (!me) { res.writeHead(302, { Location: '/login' }); res.end(); return true; }
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
    return true;
  }

  if (url.pathname.startsWith('/chat/') && url.pathname.endsWith('/report') && req.method === 'POST') {
    const me = getSessionUser(req);
    if (!me) { res.writeHead(302, { Location: '/login' }); res.end(); return true; }
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
    return true;
  }

  return false;
}

module.exports = { handleChatRoutes };
