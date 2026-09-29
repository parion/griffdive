# syntax=docker/dockerfile:1

# Griffdive dev container image. It stays on the official Paseo image (node:22-bookworm-slim,
# non-root `paseo` user, uid 1000) because the Paseo daemon remains a supported fallback, but
# the primary remote path is Orca over SSH: openssh-server makes this container an SSH target
# and post-start.sh owns service startup. OpenCode and Claude Code are the agent CLIs.
FROM ghcr.io/getpaseo/paseo:latest

USER root

# sudo for the dev-container user. openssh-server turns the container into an SSH
# target for Orca (https://www.onorca.dev/docs/ssh — Orca is the client, we are the
# host), with openssh-sftp-server backing Orca's file transfers. build-essential +
# python3 are what Orca's remote relay compiles node-pty with: without them Orca
# connects but remote terminals stay dead. policy-rc.d stops the package postinst
# from launching sshd at build time — post-start.sh owns service startup.
RUN printf '#!/bin/sh\nexit 101\n' > /usr/sbin/policy-rc.d \
    && chmod +x /usr/sbin/policy-rc.d \
    && apt-get update \
    && apt-get install -y --no-install-recommends \
        sudo openssh-server openssh-sftp-server build-essential python3 \
    && rm -rf /var/lib/apt/lists/* \
    && rm -f /usr/sbin/policy-rc.d \
    && echo 'paseo ALL=(ALL) NOPASSWD:ALL' > /etc/sudoers.d/paseo \
    && chmod 440 /etc/sudoers.d/paseo

# Host keys belong to the container instance, not a shared image layer; ssh-setup.sh
# generates them into the Orca volume and symlinks them into /etc/ssh.
RUN rm -f /etc/ssh/ssh_host_*

# pnpm for the project (packageManager pins the version); OpenCode and Claude Code as
# agent CLIs.
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable \
    && corepack prepare pnpm@11.18.0 --activate \
    && npm install -g opencode-ai @anthropic-ai/claude-code \
    && npm cache clean --force

# The workspace is a bind mount from the host; trust it for git operations.
RUN git config --system --add safe.directory /workspace

# Playwright system dependencies for the E2E suite (pinned to the project's
# @playwright/test version); baked into the image so rebuilds don't re-apt them
# through post-create.sh and every restart/rebuild can run pnpm test:e2e.
RUN npx -y playwright@1.62.1 install-deps chromium

# Build-time tooling (npm/corepack/opencode/claude, the npx above) runs as root with
# HOME pointed at /home/paseo, so it leaves root-owned caches behind — `_cacache` and
# `_npx` under /home/paseo/.npm. This MUST stay after the last root RUN: reclaiming
# the home directory earlier let the npx above re-create root-owned files, which the
# paseo user then could not write, and Orca's remote relay install died with EACCES
# on /home/paseo/.npm/_cacache.
RUN chown -R paseo:paseo /home/paseo

USER paseo
