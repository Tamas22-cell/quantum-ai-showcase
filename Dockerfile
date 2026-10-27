# Reproducible TanStack Start / Nitro container build
FROM oven/bun:1.3.6 AS build
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
ENV NODE_ENV=production
RUN bun run build

FROM oven/bun:1.3.6-alpine AS runtime
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000
ENV NITRO_HOST=0.0.0.0
ENV NITRO_PORT=3000
WORKDIR /app
COPY --from=build --chown=bun:bun /app/dist ./dist
USER bun
EXPOSE 3000
CMD ["bun", "dist/server/index.mjs"]
