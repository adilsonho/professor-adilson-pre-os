const { PrismaClient } = require('@prisma/client');
const env = require('./env');

// Singleton — em dev, o `--watch` recarrega o módulo a cada mudança e
// cada recarga criaria um PrismaClient novo (e uma conexão nova) se
// não guardássemos a instância em `global`. Em produção o processo
// só sobe uma vez, então isso é um no-op inofensivo.
const prisma = global.__prisma || new PrismaClient({
  log: env.isProduction ? ['error', 'warn'] : ['error', 'warn', 'query'],
});

if (!env.isProduction) {
  global.__prisma = prisma;
}

module.exports = prisma;
