#!/bin/sh
# OpenCode v2 (`@opencode/cli`) entry point.
#
# OpenCode keeps config/data/cache/state in XDG dirs shared by every version, so v2 would
# otherwise read the v1 CLI's config and session database. Redirect all four roots into the
# dedicated volume (see devcontainer.json) — the CLAUDE_CONFIG_DIR analogue.
set -eu

OPENCODE_V2_HOME="${OPENCODE_V2_HOME:-$HOME/.opencode2}"
export XDG_CONFIG_HOME="$OPENCODE_V2_HOME/config"
export XDG_DATA_HOME="$OPENCODE_V2_HOME/data"
export XDG_STATE_HOME="$OPENCODE_V2_HOME/state"
export XDG_CACHE_HOME="$OPENCODE_V2_HOME/cache"

# Optional v2-only environment (e.g. CONTEXT7_API_KEY), kept in the volume because SSH
# sessions never see the devcontainer's remoteEnv. `set -a` exports it — otherwise the
# values stay shell-local and the exec'd binary never sees them.
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
