#!/usr/bin/env bash
set -euo pipefail

HEALTH=http://127.0.0.1:6767/api/health

# Baseline for a brand-new volume only — the binary self-updates in place afterwards, so a
# rebuild never downgrades it.
CLAUDE_VERSION=2.1.296

# Build-time tooling runs as root with HOME=$HOME, so the home volume can carry root-owned
# npm caches over from an older image. Repair before anything writes: builds otherwise die
# with EACCES on .npm/_cacache, and the agent CLIs cannot write their config volumes.
repair_ownership() {
  local dir
  for dir in "$HOME"/.npm "$HOME"/.cache "$HOME"/.config "$HOME"/.local "$HOME"/.claude "$HOME"/.opencode2; do
    [ -d "$dir" ] || continue
    if find "$dir" ! -uid "$(id -u)" -print -quit 2>/dev/null | grep -q .; then
      echo "Repairing root-owned files in $dir"
      sudo chown -R "$(id -u):$(id -g)" "$dir"
    fi
  done
}
repair_ownership

# Seed OpenCode v2's global config into its (empty) volume — the Context7 MCP wiring lives
# inside it. Create-only: the CLI and the user own the file afterwards.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
V2_CONFIG="$HOME/.opencode2/config/opencode/opencode.json"
if [ ! -f "$V2_CONFIG" ] && [ -f "$SCRIPT_DIR/opencode-v2.json" ]; then
  mkdir -p "$(dirname "$V2_CONFIG")"
  cp "$SCRIPT_DIR/opencode-v2.json" "$V2_CONFIG"
  echo "Seeded OpenCode v2 config at $V2_CONFIG"
fi

# Claude Code installs natively into the home volume (the Dockerfile links
# /usr/local/bin/claude at it), where it self-updates in place. Guarded self-heal, since the
# volume can be recreated independently of the image; non-fatal, so a missing agent CLI
# never blocks the container. The installer refuses to run as root.
CLAUDE_BIN="$HOME/.local/bin/claude"
if [ ! -x "$CLAUDE_BIN" ]; then
  echo "Installing Claude Code $CLAUDE_VERSION (native) into $HOME/.local ..."
  if curl -fsSL https://claude.ai/install.sh | bash -s -- "$CLAUDE_VERSION"; then
    echo "Claude Code ready: $("$CLAUDE_BIN" --version 2>/dev/null || echo 'version unknown')"
  else
    echo "Claude Code install failed — retry with:" >&2
    echo "  curl -fsSL https://claude.ai/install.sh | bash -s -- $CLAUDE_VERSION" >&2
  fi
fi

# npm's global prefix is root-owned in the base image, so `npm install -g` fails with
# EACCES — including the Paseo daemon's self-update, which runs
# `npm install -g @getpaseo/cli@latest`. Move the prefix to a user-owned directory in the
# home volume: installs then work unprivileged and survive rebuilds. The daemon must run
# from this install, since its updater refuses unless the running daemon *is* the npm
# global one — hence the absolute path used to start it below.
NPM_GLOBAL="$HOME/.npm-global"
export PATH="$NPM_GLOBAL/bin:$PATH"
npm config set prefix "$NPM_GLOBAL" >/dev/null 2>&1 || true

PASEO_CLI="$NPM_GLOBAL/bin/paseo"
if [ ! -x "$PASEO_CLI" ]; then
  echo "Installing the Paseo CLI into $NPM_GLOBAL ..."
  npm install -g @getpaseo/cli@latest >/dev/null 2>&1 || true
fi
if [ ! -x "$PASEO_CLI" ]; then
  echo "Paseo CLI unavailable — skipping daemon startup." >&2
  PASEO_CLI=""
fi

# Login shells outside VS Code (docker exec, `su -`) read ~/.profile; the devcontainer's
# remoteEnv covers the rest. Guarded, and it lives in the home volume.
if [ -n "$PASEO_CLI" ] && ! grep -q 'npm-global/bin' "$HOME/.profile" 2>/dev/null; then
  printf '\n# Added by .devcontainer/post-start.sh: user-owned npm global prefix.\nexport PATH="%s/bin:$PATH"\n' \
    "$NPM_GLOBAL" >> "$HOME/.profile"
fi

# Paseo daemon. The dev-container runner bypasses the image entrypoint, so it starts here.
# /api/health is auth-exempt, so it doubles as the "already running" probe (paseo daemon
# status exits 0 even when stopped).
PASEO_HOME="${PASEO_HOME:-$HOME/.paseo}"
if [ -n "$PASEO_CLI" ]; then
  # v0.11 moved the listen address from the PASEO_LISTEN override into daemon config, so the
  # newer daemon would otherwise silently bind its 127.0.0.1 default.
  "$PASEO_CLI" daemon config set daemon.listen "${PASEO_LISTEN:-0.0.0.0:6767}" \
    --home "$PASEO_HOME" >/dev/null 2>&1 || true

  if ! curl -fsS "$HEALTH" >/dev/null 2>&1; then
    # Persist relay-on (PASEO_RELAY_ENABLED only covers this launch).
    PASEO_HOME="$PASEO_HOME" node -e '
      const fs = require("fs");
      const path = process.env.PASEO_HOME + "/config.json";
      const c = JSON.parse(fs.existsSync(path) ? fs.readFileSync(path, "utf8") || "{}" : "{}");
      c.daemon = { ...(c.daemon ?? {}), relay: { ...(c.daemon?.relay ?? {}), enabled: true } };
      fs.writeFileSync(path, JSON.stringify(c, null, 2) + "\n");
    '
    "$PASEO_CLI" daemon start >/tmp/paseo-daemon-start.log 2>&1
    for _ in $(seq 1 30); do
      curl -fsS "$HEALTH" >/dev/null 2>&1 && break
      sleep 1
    done
  fi

  if ! curl -fsS "$HEALTH" >/dev/null 2>&1; then
    # A daemon hiccup must not fail the container start.
    echo "Paseo daemon failed to start — see $PASEO_HOME/daemon.log" >&2
  fi

  "$PASEO_CLI" project create >/dev/null 2>&1 || true
fi

echo
echo "Agents: opencode (v1) · opencode2 (v2) · claude (native, self-updating)"
echo "Paseo daemon: http://localhost:6767 · pair a device: paseo daemon pair"
