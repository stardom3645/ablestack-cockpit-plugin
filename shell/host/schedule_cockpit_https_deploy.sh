#!/usr/bin/env bash
#########################################
# Cockpit HTTPS/19100 delayed deployment scheduler
#########################################

set -u

LOGFILE="/var/log/cloud_install.log"
BOOTSTRAP_DIR="/usr/share/cockpit/ablestack/python/deploy_https"
CUBE_HTTPS_SCRIPT="$BOOTSTRAP_DIR/deploy_cockpit_https_all.py"
DELAY_SECONDS="${1:-10}"
UNIT_NAME="ablestack-cockpit-https-$(date +%Y%m%d%H%M%S)"

log() {
  echo "$1" | tee -a "$LOGFILE" >&2
}

fail() {
  log "Cockpit HTTPS/19100 전환 작업 예약 실패: $1"
  exit 1
}

if [ ! -f "$CUBE_HTTPS_SCRIPT" ]; then
  fail "script not found: $CUBE_HTTPS_SCRIPT"
fi

if ! command -v systemd-run >/dev/null 2>&1; then
  fail "systemd-run command not found"
fi

JOB_CMD="if command -v flock >/dev/null 2>&1; then exec 9>/run/ablestack-cockpit-https.lock; if flock -n 9; then /usr/bin/python3 '$CUBE_HTTPS_SCRIPT'; else echo 'Cockpit HTTPS/19100 deployment is already running. skip.'; fi; else /usr/bin/python3 '$CUBE_HTTPS_SCRIPT'; fi"

OUTPUT=$(
  systemd-run \
    --unit="$UNIT_NAME" \
    --description="ABLESTACK Cockpit HTTPS 19100 deployment" \
    --on-active="${DELAY_SECONDS}s" \
    /usr/bin/bash -lc "$JOB_CMD" 2>&1
)
RC=$?

log "$OUTPUT"

if [ $RC -ne 0 ]; then
  fail "unit=$UNIT_NAME rc=$RC"
fi

log "bootstrap 완료 후 Cockpit HTTPS/19100 전환 작업이 예약됨: unit=$UNIT_NAME, delay=${DELAY_SECONDS}s"
log "후속 작업 로그 확인: journalctl -u $UNIT_NAME --no-pager -l"

echo "{\"code\":200,\"val\":{\"unit\":\"$UNIT_NAME\",\"delay_seconds\":$DELAY_SECONDS,\"log\":\"journalctl -u $UNIT_NAME --no-pager -l\"}}"
