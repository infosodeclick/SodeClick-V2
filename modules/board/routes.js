async function handleBoardRoutes(ctx) {
  const { req, res, url, deps } = ctx;
  const {
    getSessionUser,
    parseBody,
    parseForm,
    readJson,
    writeJson,
    boardPostsFile,
    renderBoardPage,
    isSpamAction,
    containsBlockedWords,
  } = deps;

  if (url.pathname === '/board' && req.method === 'GET') {
    const me = getSessionUser(req);
    if (!me) { res.writeHead(302, { Location: '/login' }); res.end(); return true; }
    const query = Object.fromEntries(url.searchParams.entries());
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(renderBoardPage(me, query));
    return true;
  }

  if (url.pathname === '/board/new' && req.method === 'POST') {
    const me = getSessionUser(req);
    if (!me) { res.writeHead(302, { Location: '/login' }); res.end(); return true; }
    const body = parseForm(await parseBody(req));
    const title = String(body.title || '').trim();
    const content = String(body.content || '').trim();
    const category = String(body.category || 'general').trim();
    if (!title || !content) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(renderBoardPage(me, {}, 'กรอกหัวข้อและเนื้อหาให้ครบ'));
      return true;
    }
    if (isSpamAction(`board:new:${me.username}`, 3000)) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(renderBoardPage(me, {}, 'คุณโพสต์ถี่เกินไป กรุณารอสักครู่'));
      return true;
    }
    if (containsBlockedWords(title) || containsBlockedWords(content)) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(renderBoardPage(me, {}, 'เนื้อหามีคำที่ไม่เหมาะสม ระบบไม่อนุญาตให้โพสต์'));
      return true;
    }
    const posts = readJson(boardPostsFile);
    posts.push({ id: `P${Date.now()}`, author: me.username, title, content, category, likes: 0, comments: [], reports: 0, pinned: false, createdAt: Date.now() });
    writeJson(boardPostsFile, posts);
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(renderBoardPage(me, {}, 'โพสต์กระทู้สำเร็จ'));
    return true;
  }

  if (url.pathname === '/board/comment' && req.method === 'POST') {
    const me = getSessionUser(req);
    if (!me) { res.writeHead(302, { Location: '/login' }); res.end(); return true; }
    const body = parseForm(await parseBody(req));
    const postId = String(body.postId || '').trim();
    const comment = String(body.comment || '').trim();
    const posts = readJson(boardPostsFile);
    const idx = posts.findIndex((p) => p.id === postId);
    if (idx >= 0 && comment) {
      if (isSpamAction(`board:comment:${me.username}`, 2000) || containsBlockedWords(comment)) {
        res.writeHead(302, { Location: '/board' });
        res.end();
        return true;
      }
      posts[idx].comments = Array.isArray(posts[idx].comments) ? posts[idx].comments : [];
      posts[idx].comments.push({ by: me.username, text: comment, at: Date.now() });
      writeJson(boardPostsFile, posts);
    }
    res.writeHead(302, { Location: '/board' });
    res.end();
    return true;
  }

  if (url.pathname === '/board/like' && req.method === 'POST') {
    const me = getSessionUser(req);
    if (!me) { res.writeHead(302, { Location: '/login' }); res.end(); return true; }
    const body = parseForm(await parseBody(req));
    const postId = String(body.postId || '').trim();
    const posts = readJson(boardPostsFile);
    const idx = posts.findIndex((p) => p.id === postId);
    if (idx >= 0) {
      posts[idx].likes = (posts[idx].likes || 0) + 1;
      writeJson(boardPostsFile, posts);
    }
    res.writeHead(302, { Location: '/board' });
    res.end();
    return true;
  }

  if (url.pathname === '/board/report' && req.method === 'POST') {
    const me = getSessionUser(req);
    if (!me) { res.writeHead(302, { Location: '/login' }); res.end(); return true; }
    const body = parseForm(await parseBody(req));
    const postId = String(body.postId || '').trim();
    const posts = readJson(boardPostsFile);
    const idx = posts.findIndex((p) => p.id === postId);
    if (idx >= 0) {
      posts[idx].reports = (posts[idx].reports || 0) + 1;
      writeJson(boardPostsFile, posts);
    }
    res.writeHead(302, { Location: '/board' });
    res.end();
    return true;
  }

  if (url.pathname === '/board/pin' && req.method === 'POST') {
    const me = getSessionUser(req);
    if (!me || me.username !== 'admin') { res.writeHead(302, { Location: '/board' }); res.end(); return true; }
    const body = parseForm(await parseBody(req));
    const postId = String(body.postId || '').trim();
    const posts = readJson(boardPostsFile);
    const idx = posts.findIndex((p) => p.id === postId);
    if (idx >= 0) {
      posts[idx].pinned = !posts[idx].pinned;
      writeJson(boardPostsFile, posts);
    }
    res.writeHead(302, { Location: '/board' });
    res.end();
    return true;
  }

  return false;
}

module.exports = { handleBoardRoutes };
