FROM node:25-alpine AS build
RUN apk add --no-cache openssl && corepack enable && corepack prepare pnpm@10.17.1 --activate
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/domain/package.json packages/domain/package.json
RUN pnpm install --frozen-lockfile
COPY apps/api apps/api
COPY packages/domain packages/domain
RUN pnpm --filter @financas/domain build && pnpm --filter @financas/api prisma:generate && pnpm --filter @financas/api build

FROM node:25-alpine AS runtime
RUN apk add --no-cache openssl && corepack enable && corepack prepare pnpm@10.17.1 --activate
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/prisma ./apps/api/prisma
COPY --from=build /app/apps/api/package.json ./apps/api/package.json
COPY --from=build /app/packages/domain ./packages/domain
WORKDIR /app/apps/api
USER node
CMD ["sh", "-c", "node node_modules/prisma/build/index.js migrate deploy && node dist/main.js"]
