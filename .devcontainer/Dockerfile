# syntax=docker/dockerfile:1

# Griffdive dev container. Stays on the official Paseo image (node:22-bookworm-slim, non-root
# `paseo` uid 1000) so the Paseo daemon runs as designed; post-start.sh owns service startup.
# Agent CLIs: opencode (v1), opencode2 (v2), claude.
FROM ghcr.io/getpaseo/paseo:latest

USER root

# sudo for the dev-container user; build-essential + python3 are the safety net for any
# dependency that needs to compile natively.
RUN printf '#!/bin/sh\nexit 101\n' > /usr/sbin/policy-rc.d \
    && chmod +x /usr/sbin/policy-rc.d \
    && apt-get update \
    && apt-get install -y --no-install-recommends \
        sudo build-essential python3 \
    && rm -rf /var/lib/apt/lists/* \
    && rm -f /usr/sbin/policy-rc.d \
    && echo 'paseo ALL=(ALL) NOPASSWD:ALL' > /etc/sudoers.d/paseo \
    && chmod 440 /etc/sudoers.d/paseo

# pnpm for the project (packageManager pins the version); OpenCode v1/v2 as the npm agent
# CLIs. The pins are deliberate: an unpinned `npm install -g` only re-resolves when this
# layer rebuilds, so it silently freezes rather than upgrading. Claude Code is NOT installed
# here — npm would make it root-owned, which is what broke `claude upgrade`; it installs
# natively into the home volume at runtime (see post-start.sh).
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable \
    && corepack prepare pnpm@11.18.0 --activate \
    && npm install -g opencode-ai@1.18.33 @opencode/cli@2.0.20 \
    && npm cache clean --force

# opencode-ai (v1) and @opencode/cli (v2) both declare an `opencode` bin, so npm points both
# shims at whichever linked last — pin them: v1 keeps `opencode`, v2 is `opencode2`. v2 gets
# this launcher instead of npm's symlink (it redirects v2's XDG roots into the persisted
# volume; OpenCode shares those dirs across versions). Installed to lib/ then linked, because
# COPYing onto npm's bin/opencode2 symlink would write through it and clobber v2's binary.
COPY opencode2.sh /usr/local/lib/opencode2-launch.sh
RUN chmod 0755 /usr/local/lib/opencode2-launch.sh \
    && rm -f /usr/local/bin/opencode2 \
    && ln -sfn ../lib/opencode2-launch.sh /usr/local/bin/opencode2 \
    && ln -sfn ../lib/node_modules/opencode-ai/bin/opencode.exe /usr/local/bin/opencode \
    && test -x /usr/local/lib/node_modules/@opencode/cli/bin/opencode.exe \
    && readlink -f /usr/local/bin/opencode | grep -q opencode-ai

# Claude Code installs natively into ~/.local/bin (inside the home volume), so it
# self-updates in place and survives rebuilds; post-start.sh installs the binary, since the
# volume only mounts at runtime. The link sits in /usr/local/bin, which is on every shell's
# PATH. The updater classifies by resolved path, so upgrading through this link writes into
# the volume.
RUN ln -sfn /home/paseo/.local/bin/claude /usr/local/bin/claude

# The workspace is a bind mount from the host; trust it for git operations.
RUN git config --system --add safe.directory /workspace

# Playwright system deps for the E2E suite, pinned to the project's @playwright/test version
# and baked in so rebuilds don't re-apt them.
RUN npx -y playwright@1.62.1 install-deps chromium

# MUST stay the last root RUN: the tooling above runs as root with HOME=/home/paseo and
# leaves root-owned npm caches (`_cacache`, `_npx`) that the paseo user cannot write —
# reclaiming earlier let the npx step re-create them, and builds then died with EACCES.
# post-start.sh also self-heals legacy ownership.
RUN chown -R paseo:paseo /home/paseo

USER paseo
