// Erro operacional — condição esperada de negócio (plano inválido,
// pagamento não encontrado, etc), não um bug. errorHandler.js lê
// `statusCode` e devolve `message` direto pro cliente (mensagens daqui
// sempre precisam ser seguras de expor).
class AppError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.isOperational = true;
  }
}

module.exports = AppError;
