# syntax=docker/dockerfile:1
FROM node:24-alpine AS build
WORKDIR /app
RUN corepack enable
COPY . .
RUN pnpm install --frozen-lockfile --prod=false \
  && pnpm build

FROM node:24-alpine
WORKDIR /app
ENV HOST=0.0.0.0 \
    PORT=8080 \
    NODE_ENV=production
COPY --from=build /app/.output ./.output
CMD ["node", ".output/server/index.mjs"]
