#!/usr/bin/env bash
set -euo pipefail

HEALTH=http://127.0.0.1:6767/api/health

# Build-time tooling runs as root with HOME=$HOME, so npm/npx caches it wrote are
# root-owned (see the chown ordering in the Dockerfile), and the home volume can carry
# that ownership over from an older image. Repair before anything needs to write:
# Orca's remote relay install otherwise dies with EACCES on .npm/_cacache, and Claude
# Code and OpenCode v2 cannot write their config volumes.
repair_ownership() {
  local dir
  for dir in "$HOME"/.npm "$HOME"/.cache "$HOME"/.config "$HOME"/.local "$HOME"/.claude "$HOME"/.opencode2 "$HOME"/.orca-remote; do
    [ -d "$dir" ] || continue
    if find "$dir" ! -uid "$(id -u)" -print -quit 2>/dev/null | grep -q .; then
      echo "Repairing root-owned files in $dir"
      sudo chown -R "$(id -u):$(id -g)" "$dir"
    fi
  done
}
repair_ownership

# Seed OpenCode v2's global config. Its volume mounts empty and the config lives inside
# it (see .devcontainer/opencode2.sh), so the Context7 MCP wiring has to be copied in.
# Only ever created, never overwritten — the CLI and the user own that file afterwards.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
V2_CONFIG="$HOME/.opencode2/config/opencode/opencode.json"
if [ ! -f "$V2_CONFIG" ] && [ -f "$SCRIPT_DIR/opencode-v2.json" ]; then
  mkdir -p "$(dirname "$V2_CONFIG")"
  cp "$SCRIPT_DIR/opencode-v2.json" "$V2_CONFIG"
  echo "Seeded OpenCode v2 config at $V2_CONFIG"
fi

# Orca creates each worktree beside the project (/workspace -> /workspace-<name>), and
# the container root is read-only for the paseo user, which fails the create with
# "could not create leading directories ... Permission denied". Root is the writable
# overlay layer, so this is lost on every rebuild and must be reapplied here. The
# sticky bit is the /tmp idiom for a shared writable directory — anyone may create
# entries, only the owner may delete them.
WORKSPACE_DIR=/workspace
if [ -d "$WORKSPACE_DIR" ] && [ ! -w "$(dirname "$WORKSPACE_DIR")" ]; then
  echo "Allowing Orca worktree creation in $(dirname "$WORKSPACE_DIR")"
  sudo chmod 1777 "$(dirname "$WORKSPACE_DIR")"
fi

# SSH target for Orca is the primary remote path. Non-fatal: losing Orca access must
# not block the container.
bash "$(dirname "${BASH_SOURCE[0]}")/ssh-setup.sh" \
  || echo "Orca SSH setup failed — see /var/log/sshd.log" >&2

# The Paseo daemon stays available as a fallback. The dev-container runner bypasses the
# image entrypoint, so it starts here. /api/health is auth-exempt, so it doubles as a
# reliable "already running" probe (paseo daemon status exits 0 even when stopped).
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
  # Orca is the primary path, so a daemon hiccup must not mark the container start as
  # failed — warn and carry on.
  echo "Paseo daemon failed to start — see $PASEO_HOME/daemon.log" >&2
fi

paseo project create >/dev/null 2>&1 || true

echo
echo "Orca SSH target: localhost:2222 (forwarded, see .devcontainer/ssh-setup.sh)"
echo "Agents: opencode (v1) · opencode2 (v2) · claude (Context7 MCP preconfigured)"
echo "Paseo daemon (fallback): http://localhost:6767 · pair a device: paseo daemon pair"
