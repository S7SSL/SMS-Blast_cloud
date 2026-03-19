#!/usr/bin/env node
// SMS Blast — MacBook Messages.app via AppleScript
// Reads leads below, sends via iPhone SMS, 20-second delay between each
// Run: node sms_blast_mac.js

const { execSync } = require('child_process');
const fs = require('fs');

const LEADS = [{"name": "Lighten Joinery and Handyman Services", "mobile": "+447772177812"}, {"name": "TMC Plastering and Building Services Manchester", "mobile": "+447834891135"}, {"name": "DKRoofingSolutionsUK", "mobile": "+447887479143"}, {"name": "Jdphandyman", "mobile": "+447591047001"}, {"name": "MN Handyman Services", "mobile": "+447733312924"}, {"name": "Best Buys Home Goods and Students discount store", "mobile": "+447305231981"}, {"name": "HandyAdam", "mobile": "+447854799425"}, {"name": "JL PLASTERING SERVICES", "mobile": "+447834996664"}, {"name": "ALEADS_PLACEHOLDERO Roofing Ltd", "mobile": "+447583904462"}, {"name": "James Lucas Roofing Services", "mobile": "+447764940522"}, {"name": "James Pollock Plumbing", "mobile": "+447595544898"}, {"name": "Odd Job John", "mobile": "+447884280208"}, {"name": "AKA Plumbing , Heating LEADS_PLACEHOLDER Drainage North East", "mobile": "+447939916109"}, {"name": "Parkers Electrical Services", "mobile": "+447943841146"}, {"name": "ASK Electrical NE Ltd", "mobile": "+447725988475"}, {"name": "Heads Plastering Services", "mobile": "+447983336064"}, {"name": "V Handy 1", "mobile": "+447880246890"}, {"name": "Watts property services", "mobile": "+447473881849"}, {"name": "DAN services", "mobile": "+447534909408"}, {"name": "TNA Plastering", "mobile": "+447981122344"}, {"name": "South notts Plastering", "mobile": "+447449742918"}, {"name": "GTB construction ltd", "mobile": "+447397539639"}, {"name": "MJ Handyman Services", "mobile": "+447411306391"}, {"name": "JD Rendering", "mobile": "+447597969262"}, {"name": "LLEADS_PLACEHOLDERF Plastering Contractors Limited", "mobile": "+447432351537"}, {"name": "Keith Handyman Chaplin", "mobile": "+447877424453"}, {"name": "Central Tyres", "mobile": "+447572064616"}, {"name": "Approved LDR Electrical Ltd", "mobile": "+447961579064"}, {"name": "T Greenwood LEADS_PLACEHOLDER Sons Roofing", "mobile": "+447946481894"}, {"name": "Clayton Heights Plastering", "mobile": "+447752520721"}, {"name": "Prestige Plastering", "mobile": "+447780700036"}, {"name": "Adams Plastering", "mobile": "+447852310419"}, {"name": "Valley Roofing South Wales", "mobile": "+447341721241"}, {"name": "Key-start auto locksmith", "mobile": "+447891174636"}, {"name": "Glasgow Southside Plasterers", "mobile": "+447789917557"}, {"name": "Phoenix Electrical (Southern) LTD", "mobile": "+447584306361"}, {"name": "Home Builders Hampshire", "mobile": "+447342348668"}, {"name": "RJ THIND BUILDERS Ltd", "mobile": "+447737827531"}, {"name": "H.G.A Property Services", "mobile": "+447469715888"}, {"name": "ProBuild Flatpack Assembly Service", "mobile": "+447555498314"}, {"name": "JMR Roofing Services", "mobile": "+447522456345"}, {"name": "Ua Gas Service", "mobile": "+447824698268"}, {"name": "Handyman Services Carlisle", "mobile": "+447724712321"}, {"name": "Keyhole surgery locksmith Auto surgery locksmith", "mobile": "+447379922199"}, {"name": "Alta Electrical", "mobile": "+447835413626"}, {"name": "BR Plumbing and Heating", "mobile": "+447807323699"}, {"name": "Handy man", "mobile": "+447711939704"}, {"name": "DK Property Maintenance", "mobile": "+447708727210"}, {"name": "Hands on Derby", "mobile": "+447867572057"}, {"name": "Adam's Property Maintenance LEADS_PLACEHOLDER Repair", "mobile": "+447366299636"}, {"name": "SGS Plastering Services", "mobile": "+447860878943"}, {"name": "RLM PLASTERING", "mobile": "+447748173211"}, {"name": "Lizard Electrical", "mobile": "+447999288666"}, {"name": "Pro Roof and Gutter Solutions", "mobile": "+447487377137"}, {"name": "Willenhall Handyman", "mobile": "+447946303107"}, {"name": "Golden Touch Renovators LTD", "mobile": "+447475081779"}, {"name": "Centurion Locksmith LEADS_PLACEHOLDER Secure", "mobile": "+447451261509"}, {"name": "Green Swan Plumbing", "mobile": "+447973904934"}, {"name": "SDCS Plumbing and Heating", "mobile": "+447568531978"}, {"name": "Lockstation Locksmiths", "mobile": "+447446207568"}];

const MSG_TEMPLATE = (name) => {
  // Use first word of company name as short reference
  const short = name.split(' ')[0];
  return `Hi, I noticed ${name} doesn't have a website. We'll build one FREE + make it AI-ready for 24/7 bookings. Takes 48hrs. Interested? Reply YES`;
};

const DELAY_MS = 20000; // 20 seconds between sends

function sendSMS(phone, message) {
  // Escape for AppleScript
  const safeMsg = message.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  const script = `
    tell application "Messages"
      set targetService to 1st service whose service type = SMS
      set targetBuddy to buddy "${phone}" of targetService
      send "${safeMsg}" to targetBuddy
    end tell
  `;
  execSync(`osascript -e '${script.replace(/'/g, "'\\''")}'`);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function blast() {
  const log = fs.createWriteStream('sms_log.txt', { flags: 'a' });
  console.log(`Starting blast — ${LEADS.length} leads`);
  
  for (let i = 0; i < LEADS.length; i++) {
    const lead = LEADS[i];
    const msg = MSG_TEMPLATE(lead.name);
    const ts = new Date().toISOString();
    
    try {
      sendSMS(lead.mobile, msg);
      const line = `[${ts}] ✅ SENT to ${lead.name} (${lead.mobile})`;
      console.log(`[${i+1}/${LEADS.length}] ${line}`);
      log.write(line + '\n');
    } catch (e) {
      const line = `[${ts}] ❌ FAILED ${lead.name} (${lead.mobile}): ${e.message}`;
      console.log(`[${i+1}/${LEADS.length}] ${line}`);
      log.write(line + '\n');
    }

    if (i < LEADS.length - 1) {
      console.log(`   Waiting 20s...`);
      await sleep(DELAY_MS);
    }
  }

  console.log('\nBlast complete! See sms_log.txt for results.');
  log.end();
}

blast();
