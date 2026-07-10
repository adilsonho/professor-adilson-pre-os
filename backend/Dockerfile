# ---------- build ----------
# npm ci completo (não --omit=dev) de propósito: a CLI do `prisma`
# (devDependency) precisa estar disponível no runtime pra rodar
# `prisma migrate deploy` automaticamente no start do container — ver
# CMD no final. Pra um backend deste tamanho, a simplicidade de um
# node_modules único vale mais que economizar alguns MB excluindo
# devDependencies.
FROM node:20-alpine AS build
WORKDIR /app

# O binary engine do Prisma (Rust) precisa de libssl em tempo de
# execução — Alpine não vem com ela por padrão. Sem isso o container
# sobe e morre na primeira query com "Error loading shared library
# libssl.so": um dos erros mais comuns de Prisma + Alpine em produção.
RUN apk add --no-cache openssl

COPY package.json package-lock.json* ./
RUN npm ci
COPY prisma ./prisma
RUN npx prisma generate
COPY src ./src

# ---------- runtime ----------
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

RUN apk add --no-cache openssl
RUN addgroup -S app && adduser -S app -G app

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/src ./src
COPY package.json ./

USER app

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:'+(process.env.PORT||3000)+'/health', r => process.exit(r.statusCode===200?0:1)).on('error', () => process.exit(1))"

# Aplica migrations pendentes antes de subir o servidor — elimina a
# classe de bug "deployei código novo mas esqueci de migrar". Se a
# migration falhar, o container falha a subir (comportamento
# desejado: falhar rápido em vez de servir com schema desatualizado).
CMD ["sh", "-c", "npx prisma migrate deploy && node src/server.js"]
