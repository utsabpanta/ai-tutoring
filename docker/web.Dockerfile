FROM node:22-bookworm-slim

RUN corepack enable && corepack prepare pnpm@10.15.1 --activate

WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY web/package.json ./web/
RUN pnpm install --filter web --frozen-lockfile

COPY web ./web

ENV NODE_ENV=development
EXPOSE 3000

WORKDIR /app/web
CMD ["pnpm", "dev"]
