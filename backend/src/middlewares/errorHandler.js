const logger = require('../utils/logger');
const env = require('../config/env');

// Handler central de erros — versão base. Módulo 6 (Segurança) entra
// aqui de novo pra tratar classes de erro mais específicas
// (validação, rate limit, etc). Por enquanto: nunca vaza stack trace
// em produção, sempre loga o erro completo no servidor.
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;

  logger.error({ err, path: req.originalUrl, method: req.method }, err.message);

  res.status(statusCode).json({
    error: statusCode === 500 && env.isProduction ? 'Erro interno do servidor.' : err.message,
  });
}

module.exports = errorHandler;
