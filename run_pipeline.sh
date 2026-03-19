#!/bin/bash
# SMS Automation Pipeline
# Runs on MacBook — pulls latest CRM from Mini, blasts new leads
# Set up as cron: 0 9 * * * /bin/bash ~/SMS-Blast_cloud/run_pipeline.sh

set -e
DIR="$(cd "$(dirname "$0")" && pwd)"
LOG="$DIR/pipeline.log"
MINI_USER="marge"
MINI_HOST="192.168.1.25"  # UPDATE THIS with Mini's actual IP
CRM_REMOTE="/Users/marge/.openclaw/workspace-s7ssl/website_crm/crm.json"

echo "[$(date)] Starting pipeline..." | tee -a "$LOG"

# 1. Pull latest scripts
git -C "$DIR" pull --quiet

# 2. Sync CRM from Mini
echo "[$(date)] Syncing CRM from Mini..." | tee -a "$LOG"
scp "$MINI_USER@$MINI_HOST:$CRM_REMOTE" "$DIR/crm.json" && echo "[$(date)] CRM synced" | tee -a "$LOG"

# 3. Run blast
echo "[$(date)] Running SMS blast..." | tee -a "$LOG"
node "$DIR/sms_blast_mac.js" 2>&1 | tee -a "$LOG"

echo "[$(date)] Pipeline complete." | tee -a "$LOG"
