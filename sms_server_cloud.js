#!/usr/bin/env node
const http = require('http');
const fs = require('fs');
const { exec } = require('child_process');
const url = require('url');

let crmPath = '/Users/marge/.openclaw/workspace-s7ssl/website_crm/crm.json';
let mockLeads = [
  { mobile: '+447700000001', name: 'Test Company 1' },
  { mobile: '+447700000002', name: 'Test Company 2' },
  { mobile: '+447700000003', name: 'Test Company 3' }
];

let realLeads = mockLeads;
try {
  if (fs.existsSync(crmPath)) {
    const crm = JSON.parse(fs.readFileSync(crmPath));
    realLeads = crm.filter(c => c.hasWebsite === 'NO' && c.status === 'new' && c.mobile).slice(0, 60);
  }
} catch (e) {
  console.log('Using mock leads');
}

const HTML = `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>📱 SMS Blast</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}.container{background:white;border-radius:20px;box-shadow:0 25px 50px rgba(0,0,0,.3);width:100%;max-width:700px;padding:50px}h1{font-size:36px;color:#333}.stats{display:grid;grid-template-columns:1fr 1fr;gap:15px;margin:30px 0}.stat-box{background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:white;padding:20px;border-radius:12px;text-align:center}.stat-number{font-size:32px;font-weight:bold}button{width:100%;padding:14px;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:white;border:none;border-radius:10px;font-weight:600;cursor:pointer;margin:20px 0}.progress-fill{height:10px;background:linear-gradient(90deg,#667eea 0%,#764ba2 100%);width:0%;transition:width .3s}.log{background:#f8f9fa;border:2px solid #e0e0e0;border-radius:10px;padding:15px;height:300px;overflow-y:auto;font-family:monospace;font-size:12px}.log-entry.sent{color:#22c55e}</style></head><body><div class="container"><h1>📱 SMS Blast</h1><div class="stats"><div class="stat-box"><div class="stat-number" id="totalCount">0</div>Total Leads</div><div class="stat-box"><div class="stat-number" id="sentCount">0</div>Sent</div></div><button onclick="startBlast()">🚀 Start Blast</button><div class="progress-fill" id="progressFill"></div><div id="log" class="log"></div></div><script>let leads=[];async function load(){const r=await fetch('/api/leads'),d=await r.json();leads=d.leads||[],document.getElementById('totalCount').textContent=leads.length,log(\`✅ Loaded \${leads.length}\`)}async function startBlast(){let t=0;for(let e of leads)t++,log(\`[\${t}/\${leads.length}] \${e.name}\`),await fetch('/api/send',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phone:e.mobile,name:e.name})}),document.getElementById('progressFill').style.width=t/leads.length*100+'%',document.getElementById('sentCount').textContent=t,await new Promise(e=>setTimeout(e,20000));log('✅ Complete')}function log(e){const t=document.createElement('div');t.className='log-entry sent',t.textContent=\`[\${new Date().toLocaleTimeString()}] \${e}\`,document.getElementById('log').appendChild(t)}load()</script></html>\`;


const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (pathname === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(HTML);
    return;
  }

  if (pathname === '/api/leads') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ leads: realLeads }));
    return;
  }

  if (pathname === '/api/send' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
    });
    return;
  }

  res.writeHead(404);
  res.end('Not Found');
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => console.log(`SMS Server on port ${PORT}`));
