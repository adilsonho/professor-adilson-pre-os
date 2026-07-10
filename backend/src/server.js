const app = require('./app');
const env = require('./config/env');
const prisma = require('./config/prisma');
const logger = require('./utils/logger');

const server = app.listen(env.PORT, () => {
  logger.info(`Servidor rodando na porta ${env.PORT} [${env.NODE_ENV}]`);
});

async function shutdown(signal) {
  logger.info(`${signal} recebido — encerrando servidor...`);
  server.close(async () => {
    await prisma.$disconnect();
    logger.info('Conexões encerradas. Bye.');
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.error({ err: reason }, 'unhandledRejection');
});

process.on('uncaughtException', (err) => {
  logger.error({ err }, 'uncaughtException');
  process.exit(1);
});
