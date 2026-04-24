#!/usr/bin/env bash
# ════════════════════════════════════════════════════════════════════════════
# Host-level egress deny rules for the lab subnets (Linux / iptables).
#
# Phase 5.1 remediation of F-04 — No host-level egress deny rule.
#
# Idempotent: safe to run multiple times. Restart-safe on systems where
# iptables rules are restored at boot (`iptables-persistent`, `netfilter-persistent`,
# or equivalent). On systems that drop iptables state at boot, invoke this
# script from a systemd unit at start.
#
# Usage:
#   sudo bash infra/isolation/lab_isolation.sh apply     # install rules
#   sudo bash infra/isolation/lab_isolation.sh verify    # print current rules
#   sudo bash infra/isolation/lab_isolation.sh remove    # uninstall rules
# ════════════════════════════════════════════════════════════════════════════
set -euo pipefail

LAB_SUBNETS=(
  "10.10.10.0/24"   # dmz
  "10.10.20.0/24"   # corp
  "10.10.30.0/24"   # data
)
CHAIN="LAB_ISOLATION"

ensure_chain() {
  iptables -N "$CHAIN" 2>/dev/null || true
  iptables -C FORWARD -j "$CHAIN" 2>/dev/null || iptables -I FORWARD 1 -j "$CHAIN"
}

add_rules() {
  ensure_chain
  iptables -F "$CHAIN"
  for subnet in "${LAB_SUBNETS[@]}"; do
    # Allow intra-subnet and intra-lab traffic.
    iptables -A "$CHAIN" -s "$subnet" -d "$subnet" -j RETURN
    for peer in "${LAB_SUBNETS[@]}"; do
      iptables -A "$CHAIN" -s "$subnet" -d "$peer" -j RETURN
    done
    # Drop everything else originating from the lab subnet.
    iptables -A "$CHAIN" -s "$subnet" -j DROP
  done
}

remove_rules() {
  iptables -D FORWARD -j "$CHAIN" 2>/dev/null || true
  iptables -F "$CHAIN" 2>/dev/null || true
  iptables -X "$CHAIN" 2>/dev/null || true
}

verify() {
  echo "── FORWARD chain ──"
  iptables -S FORWARD | grep -F "$CHAIN" || echo "(LAB_ISOLATION not hooked into FORWARD)"
  echo "── $CHAIN chain ──"
  iptables -S "$CHAIN" 2>/dev/null || echo "(chain $CHAIN does not exist)"
}

case "${1:-apply}" in
  apply)  add_rules; verify ;;
  verify) verify ;;
  remove) remove_rules ;;
  *)      echo "usage: $0 {apply|verify|remove}" >&2; exit 2 ;;
esac
