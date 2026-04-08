# syntax=docker/dockerfile:1

ARG NODE_VERSION=24

FROM node:${NODE_VERSION}-slim AS base
WORKDIR /usr/src/app

# Prisma recommends ensuring OpenSSL is available on slim images.
RUN apt-get update -y \
  && apt-get install -y --no-install-recommends openssl chromium fonts-liberation \
  && rm -rf /var/lib/apt/lists/*

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS build
COPY nest-cli.json tsconfig.json tsconfig.build.json ./
COPY prisma ./prisma
COPY src ./src
RUN npm run prisma:generate \
  && npm run build \
  && npm prune --omit=dev

FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
ENV RECEIPT_PDF_EXECUTABLE_PATH=/usr/bin/chromium

COPY --from=build /usr/src/app/package.json ./package.json
COPY --from=build /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/dist ./dist

EXPOSE 3000
USER node

CMD ["node", "dist/main"]
