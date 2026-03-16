async function handleCommerceRoutes(ctx) {
  const { req, res, url, deps } = ctx;
  const {
    getSessionUser,
    parseBody,
    parseForm,
    readJson,
    writeJson,
    usersFile,
    coinTxFile,
    frameTxFile,
    renderWalletPage,
    renderVipPage,
    renderShopPage,
  } = deps;

  if (url.pathname === '/vip' && req.method === 'GET') {
    const me = getSessionUser(req);
    if (!me) { res.writeHead(302, { Location: '/login' }); res.end(); return true; }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(renderVipPage(me));
    return true;
  }

  if (url.pathname === '/vip/subscribe' && req.method === 'POST') {
    const me = getSessionUser(req);
    if (!me) { res.writeHead(302, { Location: '/login' }); res.end(); return true; }
    const body = parseForm(await parseBody(req));
    const days = Number(body.days || 0);
    const price = Number(body.price || 0);
    const users = readJson(usersFile);
    const idx = users.findIndex((u) => u.username === me.username);
    if (idx < 0 || days <= 0) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(renderVipPage(me, 'แพ็กเกจไม่ถูกต้อง'));
      return true;
    }
    users[idx].vipStatus = true;
    users[idx].vipUntil = Date.now() + days * 24 * 60 * 60 * 1000;
    users[idx].updatedAt = Date.now();
    writeJson(usersFile, users);
    const tx = readJson(coinTxFile);
    tx.push({ id: `CTX${Date.now()}`, username: me.username, type: 'vip_subscribe', amount: 0, note: `สมัคร VIP ${days} วัน ราคา ${price} บาท`, at: Date.now() });
    writeJson(coinTxFile, tx);
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(renderVipPage(users[idx], 'สมัคร VIP สำเร็จ'));
    return true;
  }

  if (url.pathname === '/wallet' && req.method === 'GET') {
    const me = getSessionUser(req);
    if (!me) { res.writeHead(302, { Location: '/login' }); res.end(); return true; }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(renderWalletPage(me));
    return true;
  }

  if (url.pathname === '/wallet/topup' && req.method === 'POST') {
    const me = getSessionUser(req);
    if (!me) { res.writeHead(302, { Location: '/login' }); res.end(); return true; }
    const body = parseForm(await parseBody(req));
    const addCoins = Number(body.coins || 0);
    const price = Number(body.price || 0);
    const users = readJson(usersFile);
    const idx = users.findIndex((u) => u.username === me.username);
    if (idx < 0 || addCoins <= 0) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(renderWalletPage(me, 'ข้อมูลแพ็กเกจไม่ถูกต้อง'));
      return true;
    }
    users[idx].coins = (users[idx].coins || 0) + addCoins;
    users[idx].updatedAt = Date.now();
    writeJson(usersFile, users);

    const tx = readJson(coinTxFile);
    tx.push({ id: `CTX${Date.now()}`, username: me.username, type: 'topup', amount: addCoins, note: `เติมเหรียญราคา ${price} บาท`, at: Date.now() });
    writeJson(coinTxFile, tx);

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(renderWalletPage(users[idx], `เติมเหรียญสำเร็จ +${addCoins}`));
    return true;
  }

  if (url.pathname === '/shop' && req.method === 'GET') {
    const me = getSessionUser(req);
    if (!me) { res.writeHead(302, { Location: '/login' }); res.end(); return true; }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(renderShopPage(me));
    return true;
  }

  if (url.pathname === '/shop/buy' && req.method === 'POST') {
    const me = getSessionUser(req);
    if (!me) { res.writeHead(302, { Location: '/login' }); res.end(); return true; }
    const body = parseForm(await parseBody(req));
    const frameId = String(body.frameId || '').trim();
    const price = Number(body.price || 0);
    const users = readJson(usersFile);
    const idx = users.findIndex((u) => u.username === me.username);
    if (idx < 0 || !frameId) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(renderShopPage(me, 'ข้อมูลไม่ถูกต้อง'));
      return true;
    }
    users[idx].framesOwned = Array.isArray(users[idx].framesOwned) ? users[idx].framesOwned : ['F001'];
    if (users[idx].framesOwned.includes(frameId)) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(renderShopPage(users[idx], 'คุณซื้อกรอบนี้แล้ว'));
      return true;
    }
    if ((users[idx].coins || 0) < price) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(renderShopPage(users[idx], 'เหรียญไม่พอ'));
      return true;
    }
    users[idx].coins = (users[idx].coins || 0) - price;
    users[idx].framesOwned.push(frameId);
    users[idx].updatedAt = Date.now();
    writeJson(usersFile, users);
    const tx = readJson(coinTxFile);
    tx.push({ id: `CTX${Date.now()}`, username: me.username, type: 'buy_frame', amount: -price, note: `ซื้อกรอบ ${frameId}`, at: Date.now() });
    writeJson(coinTxFile, tx);
    const ftx = readJson(frameTxFile);
    ftx.push({ id: `FTX${Date.now()}`, username: me.username, type: 'buy', frameId, price, at: Date.now() });
    writeJson(frameTxFile, ftx);
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(renderShopPage(users[idx], `ซื้อกรอบ ${frameId} สำเร็จ`));
    return true;
  }

  if (url.pathname === '/shop/use' && req.method === 'POST') {
    const me = getSessionUser(req);
    if (!me) { res.writeHead(302, { Location: '/login' }); res.end(); return true; }
    const body = parseForm(await parseBody(req));
    const frameId = String(body.frameId || '').trim();
    const users = readJson(usersFile);
    const idx = users.findIndex((u) => u.username === me.username);
    if (idx < 0) { res.writeHead(302, { Location: '/login' }); res.end(); return true; }
    users[idx].framesOwned = Array.isArray(users[idx].framesOwned) ? users[idx].framesOwned : ['F001'];
    if (!users[idx].framesOwned.includes(frameId)) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(renderShopPage(users[idx], 'คุณยังไม่ได้ซื้อกรอบนี้'));
      return true;
    }
    users[idx].activeFrame = frameId;
    users[idx].updatedAt = Date.now();
    writeJson(usersFile, users);
    const ftx = readJson(frameTxFile);
    ftx.push({ id: `FTX${Date.now()}`, username: me.username, type: 'use', frameId, price: 0, at: Date.now() });
    writeJson(frameTxFile, ftx);
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(renderShopPage(users[idx], `เปลี่ยนมาใช้กรอบ ${frameId} แล้ว`));
    return true;
  }

  if (url.pathname === '/shop/disable' && req.method === 'POST') {
    const me = getSessionUser(req);
    if (!me) { res.writeHead(302, { Location: '/login' }); res.end(); return true; }
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
      res.end(renderShopPage(users[idx], 'ปิดการใช้กรอบแล้ว'));
      return true;
    }
    res.writeHead(302, { Location: '/login' });
    res.end();
    return true;
  }

  return false;
}

module.exports = { handleCommerceRoutes };
