# syntax=docker/dockerfile:1
#
# SeamFlow API — production image.
#
# IMPORTANT: the build context is the REPO ROOT, not this folder, because the
# API imports workspace packages (@seamflow/schemas, @seamflow/types,
# @seamflow/utils) that live outside apps/seamflow-api. Deploy from the repo
# root with:
#
#   fly deploy . \
#     --config apps/seamflow-api/fly.toml \
#     --dockerfile apps/seamflow-api/Dockerfile \
#     --remote-only
#
# `--remote-only` builds on Fly's builders (no local Docker/disk needed).

# ---------- builder ----------
FROM node:22-slim AS builder
RUN corepack enable
WORKDIR /repo

# Bring in the whole workspace (node_modules / dist / native build dirs are
# excluded by the repo-root .dockerignore) and install just the API's subtree.
COPY . .
RUN pnpm install --frozen-lockfile --filter "seamflow-api..."

# Build the workspace deps first, then compile the API.
RUN pnpm --filter "@seamflow/schemas" --filter "@seamflow/types" --filter "@seamflow/utils" build \
 && pnpm --filter "seamflow-api" build

# ---------- runner ----------
FROM node:22-slim AS runner
ENV NODE_ENV=production
ENV PORT=8080
WORKDIR /repo

# node-linker=hoisted → node_modules is a flat, real-file tree, so copying the
# built workspace across stages keeps every dependency resolvable.
COPY --from=builder /repo ./

EXPOSE 8080
WORKDIR /repo/apps/seamflow-api
CMD ["node", "dist/main.js"]
