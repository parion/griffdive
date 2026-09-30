#!/bin/sh
# OpenCode v2 (`@opencode/cli`) entry point for this dev container.
#
# OpenCode keeps config, data, cache and state in XDG directories that are shared by
# every OpenCode version and channel, so v2 would otherwise read the v1 CLI's
# opencode.json and session database. Redirect all four roots into a dedicated volume
# (see devcontainer.json) — the analogue of CLAUDE_CONFIG_DIR for Claude Code — so v2
# keeps its own state and survives container rebuilds.
set -eu

OPENCODE_V2_HOME="${OPENCODE_V2_HOME:-$HOME/.opencode2}"
export XDG_CONFIG_HOME="$OPENCODE_V2_HOME/config"
export XDG_DATA_HOME="$OPENCODE_V2_HOME/data"
export XDG_STATE_HOME="$OPENCODE_V2_HOME/state"
export XDG_CACHE_HOME="$OPENCODE_V2_HOME/cache"

# Optional v2-only environment (e.g. CONTEXT7_API_KEY for the Context7 MCP server),
# persisted inside the volume so it also reaches SSH sessions, which the devcontainer's
# remoteEnv does not cover. `set -a` exports what the file sets — without it the values
# would stay shell-local and the exec'd binary would never see them.
if [ -f "$OPENCODE_V2_HOME/env" ]; then
  set -a
  . "$OPENCODE_V2_HOME/env"
  set +a
fi

BIN=/usr/local/lib/node_modules/@opencode/cli/bin/opencode.exe
if [ ! -x "$BIN" ]; then
  echo "opencode2: v2 binary missing at $BIN — rebuild the dev container" >&2
  exit 127
fi

exec "$BIN" "$@"
