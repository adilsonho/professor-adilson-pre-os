const paymentRepository = require('../repositories/payment.repository');
const AppError = require('../utils/AppError');

// DTO deliberadamente enxuto — nunca expõe ip/userAgent/fbp/fbc/
// mpPaymentId/preferenceId pra fora. `fbEventId` É exposto de
// propósito: é assim que o browser (obrigado.html) descobre qual
// event_id usar pra disparar o Purchase deduplicado contra o que o
// webhook já mandou pro Meta CAPI server-side (Módulo 4).
async function getStatusByReference(externalReference) {
  const payment = await paymentRepository.findByExternalReference(externalReference);
  if (!payment) {
    throw new AppError('Pagamento não encontrado.', 404);
  }

  return {
    status: payment.status,
    plan: payment.plan,
    value: payment.value.toNumber(),
    currency: 'BRL',
    fbEventId: payment.fbEventId,
  };
}

module.exports = { getStatusByReference };
