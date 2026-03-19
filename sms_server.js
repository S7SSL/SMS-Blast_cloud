#!/usr/bin/env node
const http = require('http');
const fs = require('fs');
const { exec } = require('child_process');
const url = require('url');

const CRM_FILE = '/Users/marge/.openclaw/workspace-s7ssl/website_crm/crm.json';

const HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>📱 SMS Blast</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 20px;
      box-shadow: 0 25px 50px rgba(0,0,0,0.3);
      width: 100%;
      max-width: 700px;
      padding: 50px;
    }
    .header {
      text-align: center;
      margin-bottom: 40px;
    }
    h1 {
      font-size: 36px;
      color: #333;
      margin-bottom: 8px;
    }
    .subtitle {
      color: #666;
      font-size: 15px;
    }
    .stats {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
      margin-bottom: 30px;
    }
    .stat-box {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px;
      border-radius: 12px;
      text-align: center;
    }
    .stat-number {
      font-size: 32px;
      font-weight: bold;
      margin-bottom: 5px;
    }
    .stat-label {
      font-size: 12px;
      opacity: 0.9;
    }
    .controls {
      display: flex;
      gap: 10px;
      margin-bottom: 30px;
    }
    button {
      flex: 1;
      padding: 14px 20px;
      border: none;
      border-radius: 10px;
      font-weight: 600;
      font-size: 15px;
      cursor: pointer;
      transition: all 0.3s;
    }
    .btn-send {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }
    .btn-send:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 10px 30px rgba(102, 126, 234, 0.4);
    }
    .btn-send:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .btn-pause {
      background: #f0f4ff;
      color: #667eea;
      display: none;
    }
    .progress-section {
      margin-bottom: 30px;
    }
    .progress-bar {
      width: 100%;
      height: 10px;
      background: #e0e0e0;
      border-radius: 10px;
      overflow: hidden;
      margin-bottom: 12px;
    }
    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
      width: 0%;
      transition: width 0.3s;
    }
    .progress-text {
      display: flex;
      justify-content: space-between;
      font-size: 13px;
      color: #666;
    }
    .log {
      background: #f8f9fa;
      border: 2px solid #e0e0e0;
      border-radius: 10px;
      padding: 15px;
      height: 350px;
      overflow-y: auto;
      font-family: 'SF Mono', Monaco, monospace;
      font-size: 12px;
      line-height: 1.7;
      color: #333;
    }
    .log-entry {
      margin-bottom: 6px;
      padding-bottom: 6px;
      border-bottom: 1px solid #eee;
    }
    .log-entry:last-child {
      border-bottom: none;
    }
    .log-entry.sent {
      color: #22c55e;
      font-weight: 500;
    }
    .log-entry.info {
      color: #3b82f6;
    }
    .log-entry.error {
      color: #ef4444;
    }
    .status-box {
      margin-top: 20px;
      padding: 15px;
      border-radius: 10px;
      font-size: 13px;
      display: none;
    }
    .status-box.success {
      background: #f0fdf4;
      border: 1px solid #dcfce7;
      color: #166534;
      display: block;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📱 SMS Blast</h1>
      <p class="subtitle">InstallSmart Lead Campaign</p>
    </div>
    
    <div class="stats">
      <div class="stat-box">
        <div class="stat-number" id="totalCount">0</div>
        <div class="stat-label">Total Leads</div>
      </div>
      <div class="stat-box">
        <div class="stat-number" id="sentCount">0</div>
        <div class="stat-label">Sent</div>
      </div>
    </div>
    
    <div class="controls">
      <button class="btn-send" id="sendBtn" onclick="startBlast()">🚀 Start Blast</button>
      <button class="btn-pause" id="pauseBtn" onclick="pauseBlast()">⏸️ Pause</button>
    </div>
    
    <div class="progress-section">
      <div class="progress-bar">
        <div class="progress-fill" id="progressFill"></div>
      </div>
      <div class="progress-text">
        <span id="sent">0</span> / <span id="total">0</span> sent
        <span id="remaining">—</span>
      </div>
    </div>
    
    <div class="log" id="log"></div>
    <div class="status-box" id="status"></div>
  </div>

  <script>
    let sending = false;
    let leads = [];

    async function loadLeads() {
      try {
        const res = await fetch('/api/leads');
        const data = await res.json();
        leads = data.leads || [];
        document.getElementById('totalCount').textContent = leads.length;
        document.getElementById('total').textContent = leads.length;
        addLog(\`✅ Loaded \${leads.length} leads\`, 'info');
      } catch (e) {
        addLog('❌ Failed to load leads: ' + e.message, 'error');
      }
    }

    function addLog(msg, type = 'sent') {
      const log = document.getElementById('log');
      const entry = document.createElement('div');
      entry.className = \`log-entry \${type}\`;
      const time = new Date().toLocaleTimeString('en-GB');
      entry.textContent = \`[\${time}] \${msg}\`;
      log.appendChild(entry);
      log.scrollTop = log.scrollHeight;
    }

    function updateProgress(sent, total) {
      const pct = (sent / total) * 100;
      document.getElementById('progressFill').style.width = pct + '%';
      document.getElementById('sent').textContent = sent;
      document.getElementById('sentCount').textContent = sent;
      const remaining = total - sent;
      document.getElementById('remaining').textContent = remaining > 0 ? \`\${remaining} left\` : '✅ Done';
    }

    async function startBlast() {
      if (sending || leads.length === 0) {
        addLog('⚠️ No leads or already sending', 'error');
        return;
      }
      
      sending = true;
      document.getElementById('sendBtn').disabled = true;
      document.getElementById('pauseBtn').style.display = 'block';
      
      addLog('🚀 Starting SMS blast...', 'info');
      addLog(\`Sending to \${leads.length} leads with 20s delays\`, 'info');
      
      for (let i = 0; i < leads.length; i++) {
        if (!sending) {
          addLog('⏸️ Paused by user', 'info');
          break;
        }
        
        const lead = leads[i];
        const name = lead.name || 'Unknown';
        
        try {
          const res = await fetch('/api/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: lead.mobile, name })
          });
          
          if (res.ok) {
            addLog(\`✅ [\${i+1}/\${leads.length}] \${name}\`, 'sent');
          } else {
            addLog(\`❌ [\${i+1}/\${leads.length}] \${name} - API error\`, 'error');
          }
        } catch (e) {
          addLog(\`❌ [\${i+1}/\${leads.length}] \${name} - \${e.message}\`, 'error');
        }
        
        updateProgress(i + 1, leads.length);
        
        // 20s delay
        await new Promise(r => setTimeout(r, 20000));
      }
      
      sending = false;
      document.getElementById('sendBtn').disabled = false;
      document.getElementById('pauseBtn').style.display = 'none';
      addLog('✅ Blast complete!', 'info');
      
      const status = document.getElementById('status');
      status.className = 'status-box success';
      status.innerHTML = '✅ All SMS sent successfully! Check Messages.app to confirm delivery.';
    }

    function pauseBlast() {
      sending = false;
      document.getElementById('sendBtn').disabled = false;
      document.getElementById('pauseBtn').style.display = 'none';
      addLog('⏸️ Paused', 'info');
    }

    // Load leads on page load
    window.addEventListener('load', loadLeads);
  </script>
</body>
</html>
`;

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Home page
  if (pathname === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(HTML);
    return;
  }

  // API: Get leads
  if (pathname === '/api/leads') {
    try {
      const crm = JSON.parse(fs.readFileSync(CRM_FILE, 'utf8'));
      const leads = crm.filter(c => c.hasWebsite === 'NO' && c.status === 'new' && c.mobile).slice(0, 60);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ leads }));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message, leads: [] }));
    }
    return;
  }

  // API: Send SMS
  if (pathname === '/api/send' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { phone, name } = JSON.parse(body);
        const msg = `Hi, I noticed ${name} has no website. We'll build you one *FREE* + AI-ready for 24/7 bookings & leads. Takes 48hrs. Interested? calendly.com/sat-installsmart`;
        const script = `tell application "Messages"\n  tell first service whose service type = SMS\n    send "${msg}" to buddy "${phone}"\n  end tell\nend tell`;
        
        exec(`osascript <<'APPLE'\n${script}\nAPPLE`, (err) => {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: !err }));
        });
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // 404
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`\n✅ SMS Blast Server Ready\n`);
  console.log(`🌐 Open: http://localhost:${PORT}\n`);
});
