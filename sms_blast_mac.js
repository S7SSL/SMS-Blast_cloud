#!/usr/bin/env node
// SMS Blast — MacBook Messages.app via AppleScript
// Reads from crm.json dynamically — run after pulling latest from GitHub
// Usage: node sms_blast_mac.js [--dry-run]

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const DRY_RUN = process.argv.includes('--dry-run');
const CRM_PATH = path.join(__dirname, 'crm.json');
const LOG_PATH = path.join(__dirname, 'sms_log.txt');
const DELAY_MS = 20000;

function loadLeads() {
  if (!fs.existsSync(CRM_PATH)) {
    console.error('❌ crm.json not found — run scraper first or copy from Mini');
    process.exit(1);
  }
  let data = JSON.parse(fs.readFileSync(CRM_PATH, 'utf8'));
  if (!Array.isArray(data)) data = data.leads || data.companies || [];
  return data.filter(l =>
    String(l.hasWebsite || '').toUpperCase() === 'NO' &&
    l.mobile &&
    l.status === 'new'
  );
}

function markSent(lead) {
  let data = JSON.parse(fs.readFileSync(CRM_PATH, 'utf8'));
  let arr = Array.isArray(data) ? data : (data.leads || data.companies || []);
  arr = arr.map(l => l.mobile === lead.mobile ? { ...l, status: 'texted', textedAt: new Date().toISOString() } : l);
  const out = Array.isArray(data) ? arr : { ...data, leads: arr };
  fs.writeFileSync(CRM_PATH, JSON.stringify(out, null, 2));
}

function buildMessage(name) {
  return `Hi, I noticed ${name} doesn't have a website. We'll build one FREE + make it AI-ready for 24/7 bookings. Takes 48hrs. Interested? Reply YES`;
}

function sendSMS(phone, message) {
  const safeMsg = message.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/'/g, "\\'");
  const script = `tell application "Messages"
    set targetService to 1st service whose service type = SMS
    set targetBuddy to buddy "${phone}" of targetService
    send "${safeMsg}" to targetBuddy
  end tell`;
  execSync(`osascript << 'APPLESCRIPT'\n${script}\nAPPLESCRIPT`);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function blast() {
  const leads = loadLeads();
  if (leads.length === 0) {
    console.log('✅ No new leads to text. CRM is up to date.');
    return;
  }

  const log = fs.createWriteStream(LOG_PATH, { flags: 'a' });
  console.log(`${DRY_RUN ? '[DRY RUN] ' : ''}Starting blast — ${leads.length} leads`);

  for (let i = 0; i < leads.length; i++) {
    const lead = leads[i];
    const msg = buildMessage(lead.name);
    const ts = new Date().toISOString();

    if (DRY_RUN) {
      console.log(`[${i+1}/${leads.length}] DRY: ${lead.name} (${lead.mobile})`);
      console.log(`   MSG: ${msg}`);
      continue;
    }

    try {
      sendSMS(lead.mobile, msg);
      markSent(lead);
      const line = `[${ts}] ✅ SENT — ${lead.name} (${lead.mobile})`;
      console.log(`[${i+1}/${leads.length}] ${line}`);
      log.write(line + '\n');
    } catch (e) {
      const line = `[${ts}] ❌ FAILED — ${lead.name} (${lead.mobile}): ${e.message}`;
      console.log(`[${i+1}/${leads.length}] ${line}`);
      log.write(line + '\n');
    }

    if (i < leads.length - 1) {
      console.log(`   Waiting 20s...`);
      await sleep(DELAY_MS);
    }
  }

  console.log('\nBlast complete! See sms_log.txt for results.');
  log.end();
}

blast();
