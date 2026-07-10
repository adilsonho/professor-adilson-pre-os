const { MercadoPagoConfig, Preference, Payment } = require('mercadopago');
const env = require('../config/env');
const logger = require('../utils/logger');

const client = new MercadoPagoConfig({
  accessToken: env.MERCADOPAGO_ACCESS_TOKEN,
  options: { timeout: 8000 },
});

const preferenceClient = new Preference(client);
const paymentClient = new Payment(client);

// Erro já traduzido pra algo seguro de devolver pro cliente HTTP —
// nunca a mensagem/corpo cru do Mercado Pago (pode conter detalhes
// internos da conta/integração).
class MercadoPagoProviderError extends Error {
  constructor(message, { statusCode = 502, cause } = {}) {
    super(message);
    this.name = 'MercadoPagoProviderError';
    this.statusCode = statusCode;
    this.isOperational = true;
    this.cause = cause;
  }
}

// O SDK do Mercado Pago tem duas formas de falhar:
// 1) resposta HTTP não-2xx → lança o corpo JSON do erro já parseado
//    (um objeto plano, NÃO uma instância de Error — sem `.stack`);
// 2) falha de rede/timeout/DNS → lança um Error de verdade, sem `status`.
// As duas precisam ser tratadas, porque `err.message`/`err.status`
// significam coisas diferentes em cada caso.
function normalizeError(err) {
  const isApiError = Boolean(err) && typeof err === 'object' && !(err instanceof Error);
  const status = isApiError ? err.status : undefined;
  return { isApiError, status, mpMessage: err && err.message };
}

async function createPreference(body) {
  try {
    return await preferenceClient.create({ body });
  } catch (err) {
    const { isApiError, status, mpMessage } = normalizeError(err);

    logger.error(
      { err, isApiError, status, mpMessage },
      'Falha ao criar Preference no Mercado Pago'
    );

    // 4xx do Mercado Pago = nós (ou o payload) mandamos algo que a API
    // rejeitou — não adianta tentar de novo sem mudar o pedido.
    if (status >= 400 && status < 500) {
      throw new MercadoPagoProviderError(
        'Não foi possível iniciar o pagamento — verifique os dados e tente novamente.',
        { statusCode: 422, cause: err }
      );
    }

    // 5xx, timeout, rede fora do ar, etc — problema do lado do
    // Mercado Pago ou da nossa conexão com ele.
    throw new MercadoPagoProviderError(
      'O Mercado Pago está indisponível no momento. Tente novamente em instantes.',
      { statusCode: 502, cause: err }
    );
  }
}

// Fonte de verdade sobre o estado real de um pagamento — o webhook
// (Módulo 3) nunca decide nada a partir do payload que o Mercado
// Pago envia; sempre chama isso primeiro.
async function getPayment(paymentId) {
  try {
    return await paymentClient.get({ id: paymentId });
  } catch (err) {
    const { isApiError, status, mpMessage } = normalizeError(err);

    logger.error(
      { err, isApiError, status, mpMessage, paymentId },
      'Falha ao consultar pagamento no Mercado Pago'
    );

    if (status >= 400 && status < 500) {
      throw new MercadoPagoProviderError(
        'Não foi possível confirmar o pagamento junto ao Mercado Pago.',
        { statusCode: 422, cause: err }
      );
    }

    throw new MercadoPagoProviderError(
      'O Mercado Pago está indisponível no momento.',
      { statusCode: 502, cause: err }
    );
  }
}

module.exports = { createPreference, getPayment, MercadoPagoProviderError };
