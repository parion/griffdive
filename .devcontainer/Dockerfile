# syntax=docker/dockerfile:1

# Official Paseo daemon image: node:22-bookworm-slim base, daemon + bundled web UI,
# non-root `paseo` user (uid 1000). Dev container runners replace the image entrypoint,
# so post-start.sh launches the daemon instead.
FROM ghcr.io/getpaseo/paseo:latest

USER root

RUN apt-get update \
    && apt-get install -y --no-install-recommends sudo \
    && rm -rf /var/lib/apt/lists/* \
    && echo 'paseo ALL=(ALL) NOPASSWD:ALL' > /etc/sudoers.d/paseo \
    && chmod 440 /etc/sudoers.d/paseo

# pnpm for the project (packageManager pins the version), OpenCode as the agent CLI.
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable \
    && corepack prepare pnpm@11.18.0 --activate \
    && npm install -g opencode-ai \
    && npm cache clean --force

# The workspace is a bind mount from the host; trust it for git operations.
RUN git config --system --add safe.directory /workspace

# Build-time tooling (npm/corepack/opencode install scripts) runs as root with HOME
# pointed at /home/paseo and leaves root-owned files behind; re-claim them so the
# paseo user (and the /home/paseo volume copy-up) stays writable.
RUN chown -R paseo:paseo /home/paseo

# Playwright system dependencies for the E2E suite (pinned to the project's
# @playwright/test version); baked into the image so rebuilds don't re-apt them
# through post-create.sh and every restart/rebuild can run pnpm test:e2e.
RUN npx -y playwright@1.62.1 install-deps chromium

USER paseo
