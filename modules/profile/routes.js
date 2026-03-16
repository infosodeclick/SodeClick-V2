async function handleProfileRoutes(ctx) {
  const { req, res, url, deps } = ctx;
  const { getSessionUser, parseForm, readJson, writeJson, usersFile, profilePage } = deps;

  if (url.pathname === '/profile' && req.method === 'GET') {
    const user = getSessionUser(req);
    if (!user) {
      res.writeHead(302, { Location: '/login' });
      res.end();
      return true;
    }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(profilePage(user));
    return true;
  }

  if (url.pathname === '/profile' && req.method === 'POST') {
    const sessionUser = getSessionUser(req);
    if (!sessionUser) {
      res.writeHead(302, { Location: '/login' });
      res.end();
      return true;
    }

    const body = parseForm(await deps.parseBody(req));
    const users = readJson(usersFile);
    const idx = users.findIndex((u) => u.email === sessionUser.email || u.username === sessionUser.username);
    if (idx < 0) {
      res.writeHead(302, { Location: '/login' });
      res.end();
      return true;
    }

    users[idx].displayName = String(body.displayName || users[idx].displayName || users[idx].username).trim();
    users[idx].status = ['online', 'busy', 'offline'].includes(body.status) ? body.status : 'online';
    users[idx].location = String(body.location || '').trim();
    users[idx].occupation = String(body.occupation || '').trim();
    users[idx].interests = String(body.interests || '').trim();
    users[idx].relationshipGoal = ['friend', 'dating', 'serious'].includes(body.relationshipGoal) ? body.relationshipGoal : 'friend';
    users[idx].bio = String(body.bio || '').trim();
    users[idx].updatedAt = Date.now();
    writeJson(usersFile, users);

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(profilePage(users[idx], 'บันทึกโปรไฟล์เรียบร้อยแล้ว'));
    return true;
  }

  return false;
}

module.exports = { handleProfileRoutes };
