#!/usr/bin/env bash
set -euo pipefail

# Fresh named volumes mount as root-owned; claim them before pnpm writes into them.
for dir in /workspace/node_modules /workspace/.pnpm-store; do
  if [ ! -w "$dir" ]; then
    sudo mkdir -p "$dir"
    sudo chown paseo:paseo "$dir"
  fi
done

# CI=true keeps pnpm non-interactive (it may purge a stale modules dir in the volume).
CI=true pnpm install --frozen-lockfile
pnpm exec playwright install --with-deps chromium
