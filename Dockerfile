FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build:local

FROM node:24-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000 DATABASE_PATH=/app/data/campusslot.sqlite
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund \
  && mkdir -p /app/data \
  && chown -R node:node /app
COPY --from=build --chown=node:node /app/dist-local ./dist-local
COPY --chown=node:node scripts/serve-local.ts scripts/setup-local.ts scripts/
COPY --chown=node:node lib ./lib
COPY --chown=node:node drizzle ./drizzle
COPY --chown=node:node public/favicon.svg public/favicon.svg
USER node
VOLUME ["/app/data"]
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "scripts/serve-local.ts"]
