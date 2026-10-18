#!/usr/bin/env bash
# Retired: this one-time route migration completed on 2026-10-07.
# The historical rollback would replace newer security and GEOHOT routing settings.
set -euo pipefail
printf '%s\n' '已停用 / retired: legacy route migration must not be rerun.' 'Use the current scripts/deploy.sh and reviewed release rollback records.' >&2
exit 1
