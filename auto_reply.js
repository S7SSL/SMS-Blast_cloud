#!/usr/bin/env node
// Auto-reply monitor — watches Messages.app for YES replies from leads
// Run on MacBook: node auto_reply.js
// Polls every 60 seconds

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const CRM_PATH = path.join(__dirname, 'crm.json');
const STATE_PATH = path.join(__dirname, 'auto_reply_state.json');
const LOG_PATH = path.join(__dirname, 'auto_reply.log');
const MESSAGES_DB = path.join(process.env.HOME, 'Library/Messages/chat.db');
const POLL_MS = 60000;
const ONEDRIVE_CRM = path.join(process.env.HOME, 'Library/CloudStorage/OneDrive-Personal/Marge-Backup/crm.json');

const REPLY_MSG = `Great! Here's an example site we built for a client earlier this week: s7ssl.github.io/sparkle-clean-london

That's the kind of thing we'd build for you — free, AI-ready, 48hrs.

Drop me your email and we'll get started. Or book a quick call: calendly.com/sat-installsmart/30min`;

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  fs.appendFileSync(LOG_PATH, line + '\n');
}

function loadCRM() {
  if (!fs.existsSync(CRM_PATH)) {
    if (fs.existsSync(ONEDRIVE_CRM)) {
      fs.copyFileSync(ONEDRIVE_CRM, CRM_PATH);
    } else {
      return [];
    }
  }
  return JSON.parse(fs.readFileSync(CRM_PATH, 'utf8'));
}

function saveCRM(data) {
  fs.writeFileSync(CRM_PATH, JSON.stringify(data, null, 2));
  // Sync back to OneDrive
  if (fs.existsSync(path.dirname(ONEDRIVE_CRM))) {
    fs.copyFileSync(CRM_PATH, ONEDRIVE_CRM);
  }
}

function loadState() {
  if (!fs.existsSync(STATE_PATH)) return { lastChecked: 0, replied: [] };
  return JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
}

function saveState(state) {
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
}

function norm(n) {
  if (!n) return '';
  n = String(n).replace(/\s|\(|\)|-/g, '');
  if (n.startsWith('+44')) return '0' + n.slice(3);
  if (n.startsWith('44') && n.length === 12) return '0' + n.slice(2);
  return n;
}

function getRecentMessages(sinceDate) {
  const sinceEpoch = (new Date(sinceDate).getTime() / 1000) - 978307200; // Apple epoch offset
  try {
    const result = execSync(`sqlite3 "${MESSAGES_DB}" "
      SELECT 
        h.id as phone,
        m.text,
        datetime(m.date/1000000000 + 978307200, 'unixepoch') as sent_at,
        m.is_from_me
      FROM message m
      JOIN handle h ON m.handle_id = h.rowid
      WHERE m.date/1000000000 > ${sinceEpoch}
        AND m.is_from_me = 0
        AND m.text IS NOT NULL
      ORDER BY m.date ASC
    " 2>/dev/null`, { encoding: 'utf8' });
    
    return result.trim().split('\n').filter(Boolean).map(line => {
      const parts = line.split('|');
      return { phone: parts[0], text: parts[1], sentAt: parts[2] };
    });
  } catch (e) {
    return [];
  }
}

function sendSMS(phone, message) {
  const tmpScript = `/tmp/sms_reply_${Date.now()}.applescript`;
  const escaped = message.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  const script = `tell application "Messages"
    set targetService to 1st service whose service type = SMS
    set targetBuddy to buddy "${phone}" of targetService
    send "${escaped}" to targetBuddy
  end tell`;
  fs.writeFileSync(tmpScript, script);
  try {
    execSync(`osascript "${tmpScript}"`);
    return true;
  } catch (e) {
    return false;
  } finally {
    try { fs.unlinkSync(tmpScript); } catch {}
  }
}

async function poll() {
  const state = loadState();
  const crm = loadCRM();
  
  // Build lookup: normalised phone → lead
  const leadMap = {};
  crm.forEach(l => {
    if (l.mobile) leadMap[norm(l.mobile)] = l;
  });

  const sinceDate = state.lastChecked ? new Date(state.lastChecked) : new Date(Date.now() - 86400000);
  const messages = getRecentMessages(sinceDate);
  
  let updated = false;
  const newReplied = [];

  for (const msg of messages) {
    const normPhone = norm(msg.phone);
    const lead = leadMap[normPhone];
    
    if (!lead) continue; // Not one of our leads
    if (state.replied.includes(normPhone)) continue; // Already replied
    
    const text = (msg.text || '').trim().toUpperCase();
    const isYes = /^YES\b|^Y\b|^YEAH|^YEP|^INTERESTED|^SURE|^OK$|^OKAY/.test(text);
    
    if (isYes) {
      log(`✅ YES reply from ${lead.name} (${lead.mobile}): "${msg.text}"`);
      const sent = sendSMS(lead.mobile, REPLY_MSG);
      
      if (sent) {
        log(`📤 Auto-reply sent to ${lead.name}`);
        newReplied.push(normPhone);
        
        // Update CRM status
        const idx = crm.findIndex(l => norm(l.mobile) === normPhone);
        if (idx !== -1) {
          crm[idx].status = 'replied';
          crm[idx].repliedAt = new Date().toISOString();
          updated = true;
        }
      } else {
        log(`❌ Failed to send auto-reply to ${lead.name}`);
      }
    }
  }

  if (updated) saveCRM(crm);
  
  state.lastChecked = Date.now();
  state.replied = [...new Set([...state.replied, ...newReplied])];
  saveState(state);
  
  if (messages.length > 0) {
    log(`Checked ${messages.length} new messages, ${newReplied.length} auto-replies sent`);
  }
}

async function main() {
  log('🚀 Auto-reply monitor started');
  log(`Polling every ${POLL_MS / 1000}s for YES replies...`);
  
  await poll();
  setInterval(poll, POLL_MS);
}

main().catch(e => log(`Fatal error: ${e.message}`));
