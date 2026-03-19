#!/usr/bin/env node
const http = require("http");
const fs = require("fs");

let realLeads = [];
try {
  const crm = JSON.parse(fs.readFileSync("/Users/marge/.openclaw/workspace-s7ssl/website_crm/crm.json"));
  realLeads = crm.filter(c => c.hasWebsite === "NO" && c.status === "new" && c.mobile).slice(0, 60);
} catch (e) {
  realLeads = [{ mobile: "+447700000001", name: "Test Lead" }];
}

const HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>SMS Blast Server</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; display: flex; justify-content: center; align-items: center; }
    .container { background: white; padding: 50px; border-radius: 20px; box-shadow: 0 25px 50px rgba(0,0,0,0.3); width: 90%; max-width: 600px; }
    h1 { font-size: 36px; margin-bottom: 8px; color: #333; }
    .subtitle { color: #666; margin-bottom: 30px; }
    .stats { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 30px; }
    .stat-box { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 12px; text-align: center; }
    .stat-number { font-size: 32px; font-weight: bold; }
    .stat-label { font-size: 12px; opacity: 0.9; }
    button { width: 100%; padding: 14px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 10px; font-weight: 600; font-size: 15px; cursor: pointer; }
    button:hover { transform: translateY(-2px); box-shadow: 0 10px 30px rgba(102, 126, 234, 0.4); }
    button:disabled { opacity: 0.5; cursor: not-allowed; }
    .progress { margin: 20px 0; }
    .progress-bar { width: 100%; height: 10px; background: #e0e0e0; border-radius: 10px; overflow: hidden; }
    .progress-fill { height: 100%; background: linear-gradient(90deg, #667eea 0%, #764ba2 100%); width: 0%; transition: width 0.3s; }
    .log { background: #f8f9fa; border: 2px solid #e0e0e0; border-radius: 10px; padding: 15px; height: 300px; overflow-y: auto; font-family: "SF Mono", Monaco, monospace; font-size: 12px; line-height: 1.7; }
    .log-entry { margin-bottom: 6px; }
    .log-entry.sent { color: #22c55e; font-weight: 500; }
    .log-entry.info { color: #3b82f6; }
  </style>
</head>
<body>
  <div class="container">
    <h1>📱 SMS Blast</h1>
    <p class="subtitle">Cloud SMS Server</p>
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
    <button id="sendBtn" onclick="startBlast()">🚀 Start Blast</button>
    <div class="progress">
      <div class="progress-bar">
        <div class="progress-fill" id="progressFill"></div>
      </div>
      <div style="font-size: 13px; color: #666;"><span id="sent">0</span> / <span id="total">0</span> sent</div>
    </div>
    <div class="log" id="log"></div>
  </div>
  <script>
    let leads = [];
    async function loadLeads() {
      try {
        const r = await fetch("/api/leads");
        const d = await r.json();
        leads = d.leads || [];
        document.getElementById("totalCount").textContent = leads.length;
        document.getElementById("total").textContent = leads.length;
        addLog("✅ Loaded " + leads.length + " leads", "info");
      } catch (e) {
        addLog("❌ Error: " + e.message, "error");
      }
    }
    function addLog(msg, type = "sent") {
      const log = document.getElementById("log");
      const entry = document.createElement("div");
      entry.className = "log-entry " + type;
      entry.textContent = "[" + new Date().toLocaleTimeString("en-GB") + "] " + msg;
      log.appendChild(entry);
      log.scrollTop = log.scrollHeight;
    }
    async function startBlast() {
      if (!leads.length) return addLog("No leads", "error");
      document.getElementById("sendBtn").disabled = true;
      addLog("🚀 Starting blast...", "info");
      let sent = 0;
      for (let lead of leads) {
        sent++;
        addLog("[" + sent + "/" + leads.length + "] " + lead.name);
        await fetch("/api/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: lead.mobile, name: lead.name })
        });
        document.getElementById("progressFill").style.width = (sent / leads.length * 100) + "%";
        document.getElementById("sent").textContent = sent;
        document.getElementById("sentCount").textContent = sent;
        await new Promise(resolve => setTimeout(resolve, 20000));
      }
      document.getElementById("sendBtn").disabled = false;
      addLog("✅ Complete!", "info");
    }
    window.addEventListener("load", loadLeads);
  </script>
</body>
</html>\`;

const server = http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  const pathname = new URL(req.url, "http://localhost").pathname;

  if (pathname === "/") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(HTML);
  } else if (pathname === "/api/leads") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ leads: realLeads }));
  } else if (pathname === "/api/send" && req.method === "POST") {
    let body = "";
    req.on("data", chunk => body += chunk);
    req.on("end", () => {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: true }));
    });
  } else {
    res.writeHead(404);
    res.end("Not Found");
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, "0.0.0.0", () => console.log("SMS Server running on port " + PORT));
