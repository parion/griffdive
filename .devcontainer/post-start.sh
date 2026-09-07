#!/usr/bin/env bash
set -euo pipefail

HEALTH=http://127.0.0.1:6767/api/health

# The dev container runner bypasses the image entrypoint, so the daemon starts here.
# /api/health is auth-exempt, so it doubles as a reliable "already running" probe
# (paseo daemon status exits 0 even when the daemon is stopped).
if ! curl -fsS "$HEALTH" >/dev/null 2>&1; then
  # Persist relay-on for the daemon (PASEO_RELAY_ENABLED only covers this launch).
  node -e '
    const fs = require("fs");
    const path = process.env.PASEO_HOME + "/config.json";
    const c = JSON.parse(fs.existsSync(path) ? fs.readFileSync(path, "utf8") || "{}" : "{}");
    c.daemon = { ...(c.daemon ?? {}), relay: { ...(c.daemon?.relay ?? {}), enabled: true } };
    fs.writeFileSync(path, JSON.stringify(c, null, 2) + "\n");
  '
  paseo daemon start >/tmp/paseo-daemon-start.log 2>&1
  for _ in $(seq 1 30); do
    curl -fsS "$HEALTH" >/dev/null 2>&1 && break
    sleep 1
  done
fi

if ! curl -fsS "$HEALTH" >/dev/null 2>&1; then
  echo "Paseo daemon failed to start — see $PASEO_HOME/daemon.log" >&2
  exit 1
fi

paseo project create >/dev/null 2>&1 || true

echo
echo "Paseo daemon up — web UI: http://localhost:6767"
echo "Pair a device (relay, E2E-encrypted): paseo daemon pair"
echo "Agents: paseo run \"task\" · opencode (Context7 MCP preconfigured via opencode.json)"
