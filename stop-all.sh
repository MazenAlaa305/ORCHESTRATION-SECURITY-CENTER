#!/usr/bin/env bash
# ============================================================
# Found 404 — Shutdown (Linux/macOS). Stops both stacks across every
# profile so a lite- or full-started environment comes fully down.
#
#   ./stop-all.sh                  stop containers
#   ./stop-all.sh --remove-volumes also delete named volumes (data reset)
#   ./stop-all.sh --remove-network also remove the shared lab network
# ============================================================
set -uo pipefail
cd "$(dirname "$0")"
source "./scripts/_common.sh"

VOL=""
RM_NET="no"
for arg in "$@"; do
    case "$arg" in
        --remove-volumes) VOL="-v" ;;
        --remove-network) RM_NET="yes" ;;
        *) c_warn "Unknown option: $arg" ;;
    esac
done

c_hdr "Stopping Lab Environment"
docker compose -f "$LAB_COMPOSE" --profile full-lab down $VOL || true

c_hdr "Stopping Main Dashboard Stack"
docker compose --profile full down $VOL || true

if [[ "$RM_NET" == "yes" ]]; then
    c_hdr "Removing Lab Network"
    docker network rm "$LAB_NETWORK" 2>/dev/null || true
    c_ok "Removed $LAB_NETWORK (if it existed)"
fi

echo ""
c_ok "All services stopped."
[[ -n "$VOL" ]] && c_warn "Named volumes were deleted — database/lab data was reset."
