const fs = require('fs');
const path = require('path');
const http = require('http');
const next = require('next');

const port = process.env.PORT || 3000;
const hasBuild = fs.existsSync(path.join(__dirname, '.next', 'BUILD_ID'));
const dev = !hasBuild;

const app = next({ dev, hostname: '0.0.0.0', port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  http
    .createServer((req, res) => handle(req, res))
    .listen(port, () => {
      console.log(`SodeClick V2 custom server listening on ${port} (dev=${dev})`);
    });
});
