const http = require('http');
const port = process.env.PORT || 3000;
const htmlWhite = `<!doctype html><html><head><meta charset="utf-8"><title>White Page</title><style>html,body{height:100%;margin:0;background:#fff}</style></head><body></body></html>`;
const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, {'Content-Type':'application/json; charset=utf-8'});
    res.end(JSON.stringify({status:'healthy'}));
    return;
  }
  res.writeHead(200, {'Content-Type':'text/html; charset=utf-8'});
  res.end(htmlWhite);
});
server.listen(port, () => { console.log(`White page listening on ${port}`); });
