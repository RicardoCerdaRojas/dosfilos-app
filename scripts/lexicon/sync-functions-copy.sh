#!/usr/bin/env bash
#
# Pastoral Fidelity Phase 1.5 — keeps the duplicated curated lexicon
# inside `packages/functions/src/data/` in sync with the canonical copy
# under `packages/infrastructure/src/data/`. The duplication exists
# because Firebase Functions only ships the `functions/` package.
#
# Usage:
#   scripts/lexicon/sync-functions-copy.sh         # copies infra → functions
#   scripts/lexicon/sync-functions-copy.sh --check # exits non-zero if drift
#
# CI should call with --check. Local devs run without flags to sync.
set -euo pipefail

SRC="$(git rev-parse --show-toplevel)/packages/infrastructure/src/data/lexicon-curated-v1.json"
DST="$(git rev-parse --show-toplevel)/packages/functions/src/data/lexicon-curated-v1.json"

if [[ ! -f "$SRC" ]]; then
    echo "✗ Source not found: $SRC"
    exit 1
fi

if [[ "${1:-}" == "--check" ]]; then
    if ! diff -q "$SRC" "$DST" >/dev/null 2>&1; then
        echo "✗ Curated lexicon drift between infrastructure and functions copies."
        echo "  Run scripts/lexicon/sync-functions-copy.sh to fix."
        exit 1
    fi
    echo "✓ Curated lexicon copies in sync."
    exit 0
fi

cp "$SRC" "$DST"
echo "✓ Synced curated lexicon: infrastructure → functions"
