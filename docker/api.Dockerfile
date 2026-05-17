FROM node:22-bookworm-slim

# Tools needed to compile better-sqlite3 if a prebuild is unavailable.
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ ca-certificates \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@10.15.1 --activate

WORKDIR /app

# Workspace skeleton — install only the server's deps.
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY server/package.json ./server/
RUN pnpm install --filter server --frozen-lockfile

COPY server ./server
COPY prompts ./prompts

ENV NODE_ENV=development
EXPOSE 8787

WORKDIR /app/server
CMD ["pnpm", "dev"]
