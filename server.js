const http = require('http');

const port = process.env.PORT || 3000;

const html = `<!doctype html>
<html lang="th">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>SodeClick V2</title>
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
      min-height: 100vh;
      font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
      color: var(--text);
      background: linear-gradient(140deg, #ffffff 0%, #eff6ff 40%, #fdf2f8 100%);
      padding: clamp(12px, 2.5vw, 28px);
      display: flex;
      justify-content: center;
      align-items: flex-start;
    }

    .page {
      width: 100%;
      max-width: 980px;
      min-height: calc(100vh - clamp(24px, 5vw, 56px));
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
    }

    .card {
      width: 100%;
      border-radius: clamp(16px, 2vw, 24px);
      background: rgba(255,255,255,.94);
      border: 1px solid #e5e7eb;
      box-shadow: 0 18px 42px rgba(96,165,250,.16);
      overflow: hidden;
      flex: 1;
    }

    .hero {
      position: relative;
      padding: clamp(18px, 3.5vw, 42px) clamp(16px, 3vw, 34px) clamp(16px, 2.5vw, 30px);
      background: linear-gradient(135deg, var(--blue-soft), var(--pink-soft));
      border-bottom: 1px solid #e5e7eb;
    }

    .login-top {
      position: absolute;
      top: clamp(12px, 2vw, 18px);
      right: clamp(12px, 2vw, 18px);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      text-decoration: none;
      border-radius: 12px;
      padding: 9px 14px;
      font-weight: 700;
      font-size: 14px;
      color: #1e3a8a;
      background: #fff;
      border: 1px solid #bfdbfe;
      box-shadow: 0 6px 14px rgba(96,165,250,.18);
    }

    .badge {
      display: inline-block;
      background: #fff;
      border: 1px solid #bfdbfe;
      color: #2563eb;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 700;
      padding: 6px 12px;
      margin-bottom: 12px;
      max-width: calc(100% - 96px);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    h1 {
      margin: 0;
      font-size: clamp(26px, 4.5vw, 44px);
      line-height: 1.12;
      color: #1e3a8a;
      padding-right: 92px;
    }

    .sub {
      margin-top: 10px;
      font-size: clamp(14px, 2.2vw, 16px);
      line-height: 1.5;
      color: #374151;
      max-width: 70ch;
    }

    .content {
      padding: clamp(14px, 2.8vw, 34px);
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 12px;
      margin: 0;
    }

    .item {
      background: #fff;
      border: 1px solid #e5e7eb;
      border-radius: 14px;
      padding: 12px;
      font-size: 14px;
      min-height: 56px;
      display: flex;
      align-items: center;
    }

    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }

    .btn {
      text-decoration: none;
      border-radius: 12px;
      padding: 11px 16px;
      font-weight: 700;
      font-size: 14px;
      border: 1px solid transparent;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    .btn-primary {
      background: linear-gradient(135deg, var(--blue), var(--pink));
      color: var(--white);
      box-shadow: 0 10px 24px rgba(96,165,250,.28);
    }

    .btn-secondary {
      background: #fff;
      border-color: #cbd5e1;
      color: #334155;
    }

    @media (max-width: 640px) {
      body {
        padding: 0;
        align-items: stretch;
      }

      .page {
        max-width: none;
        min-height: 100vh;
      }

      .card {
        border-radius: 0;
        border-left: 0;
        border-right: 0;
        box-shadow: none;
      }

      .hero {
        padding-top: 64px;
      }

      .badge {
        max-width: 100%;
      }

      h1 {
        padding-right: 0;
      }

      .actions .btn {
        flex: 1 1 100%;
      }
    }
  </style>
</head>
<body>
  <div class="page">
    <main class="card">
      <section class="hero">
        <a class="login-top" href="/login">Login</a>
        <span class="badge">SodeClick V2 • Preview</span>
        <h1>เริ่มต้น SodeClick V2</h1>
        <p class="sub">ธีมหลัก: ขาว • ฟ้า • ชมพูอ่อน พร้อมเริ่มพัฒนาฟีเจอร์จริง โดยปรับขนาดตามหน้าจออุปกรณ์อัตโนมัติ</p>
      </section>
      <section class="content">
        <div class="grid">
          <div class="item">✅ โครงระบบ V2 พร้อม</div>
          <div class="item">✅ Health check ใช้งานได้</div>
          <div class="item">🎨 ธีมใหม่ถูกนำมาใช้แล้ว</div>
          <div class="item">📱 รองรับหน้าจอมือถือ/แท็บเล็ต/เดสก์ท็อป</div>
        </div>
        <div class="actions">
          <a class="btn btn-primary" href="/health">ดูสถานะระบบ (/health)</a>
          <a class="btn btn-secondary" href="https://github.com/infosodeclick/SodeClick-V2" target="_blank" rel="noreferrer">เปิด GitHub Repo</a>
        </div>
      </section>
    </main>
  </div>
</body>
</html>`;

const loginHtml = `<!doctype html>
<html lang="th">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Login - SodeClick V2</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: system-ui, sans-serif;
      background:#f8fbff;
      margin:0;
      min-height: 100vh;
      display: flex;
      align-items: flex-start;
      justify-content: center;
      padding: clamp(16px, 3vw, 28px);
    }
    .box {
      width: 100%;
      max-width: 420px;
      margin-top: clamp(8px, 6vh, 90px);
      background:#fff;
      border:1px solid #dbeafe;
      border-radius:16px;
      padding:22px;
      box-shadow: 0 12px 32px rgba(96,165,250,.12);
    }
    h2 { margin-top: 0; font-size: clamp(22px, 5vw, 26px); }
    input {
      width:100%;
      padding:11px;
      border:1px solid #cbd5e1;
      border-radius:10px;
      margin-bottom:10px;
      font-size: 16px;
    }
    button {
      width:100%;
      padding:12px;
      border:0;
      border-radius:10px;
      background:linear-gradient(135deg,#60a5fa,#f9a8d4);
      color:#fff;
      font-weight:700;
      font-size: 15px;
    }
    a { display:inline-block; margin-top:12px; color:#2563eb; text-decoration:none; }
  </style>
</head>
<body>
  <div class="box">
    <h2>เข้าสู่ระบบ SodeClick V2</h2>
    <input placeholder="อีเมล" />
    <input placeholder="รหัสผ่าน" type="password" />
    <button>Login</button>
    <a href="/">← กลับหน้าแรก</a>
  </div>
</body>
</html>`;

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'healthy', service: 'sodeclick-v2' }));
    return;
  }

  if (req.url === '/login') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(loginHtml);
    return;
  }

  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
});

server.listen(port, () => {
  console.log(`SodeClick V2 listening on ${port}`);
});
