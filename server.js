const http = require("http");
const port = process.env.PORT || 3000;
const blankHtml = \<!doctype html><html><head><meta charset="utf-8"><title>Blank</title></head><body style="margin:0;background:#fff"></body></html>\;
const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, {'Content-Type':'application/json; charset=utf-8'});
    res.end(JSON.stringify({status:'healthy'}));
    return;
  }
  res.writeHead(200, {'Content-Type':'text/html; charset=utf-8'});
  res.end(blankHtml);
});
server.listen(port, () => { console.log(\Blank starter listening on \\); });
