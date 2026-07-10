const pino = require('pino');
const env = require('../config/env');

// Logger estruturado único do processo. Módulos de negócio (webhook,
// checkout, integrações) usam isso pra registrar eventos importantes
// (pagamento aprovado, erro Mercado Pago, erro Meta) — não existe
// tabela de log no banco (decisão de arquitetura), então isso é a
// fonte de verdade operacional: console em dev (formatado por
// pino-pretty), JSON em produção (consumido pelo Railway/host).
const logger = pino({
  level: env.LOG_LEVEL,
  transport: env.isProduction
    ? undefined
    : { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname' } },
});

module.exports = logger;
