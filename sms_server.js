#!/usr/bin/env node
const http = require('http');
const fs = require('fs');
const url = require('url');

let realLeads = [{ mobile: '+447700000001', name: 'Test Lead' }];
try {
  const crm = JSON.parse(fs.readFileSync('/Users/marge/.openclaw/workspace-s7ssl/website_crm/crm.json'));
  realLeads = crm.filter(c => c.hasWebsite === 'NO' && c.status === 'new' && c.mobile).slice(0, 60);
} catch (e) {}

const HTML = `<!DOCTYPE html><html><head><title>SMS Blast</title><style>body{font-family:sans-serif;background:#667eea;display:flex;justify-content:center;align-items:center;height:100vh}div{background:white;padding:40px;border-radius:10px;text-align:center}button{padding:10px 20px;background:#667eea;color:white;border:none;border-radius:5px;cursor:pointer}</style></head><body><div><h1>📱 SMS Blast</h1><p id="count">0 leads</p><button onclick="fetch('/api/send',{method:'POST'})">Send</button><div id="log" style="margin-top:20px;text-align:left"></div></div><script>fetch('/api/leads').then(r=>r.json()).then(d=>{document.getElementById('count').textContent=d.leads.length+' leads'})</script></body></html>`;

const server = http.createServer((req, res) => {
  const pathname = new URL(req.url, `http://${req.headers.host}`).pathname;

  res.setHeader('Access-Control-Allow-Origin', '*');

  if (pathname === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(HTML);
  } else if (pathname === '/api/leads') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ leads: realLeads }));
  } else if (pathname === '/api/send') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true }));
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => console.log(`Running on ${PORT}`));
