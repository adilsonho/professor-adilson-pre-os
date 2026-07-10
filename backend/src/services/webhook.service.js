const logger = require('../utils/logger');
const mercadoPagoProvider = require('../providers/mercadopago.provider');
const paymentRepository = require('../repositories/payment.repository');
const studentRepository = require('../repositories/student.repository');
const analyticsEventRepository = require('../repositories/analyticsEvent.repository');
const { runInTransaction } = require('../repositories/transaction.repository');
const metaCapiService = require('./metaCapi.service');

// Único conjunto de status que o Mercado Pago pode reportar e que
// este sistema sabe tratar. Qualquer outro valor (in_process,
// authorized, in_mediation, charged_back, ...) é ignorado com log —
// nunca inventamos um mapeamento que não foi definido explicitamente.
const VALID_PAYMENT_STATUSES = ['approved', 'pending', 'rejected', 'cancelled', 'refunded'];

// rejected/pending não têm entrada aqui de propósito: um pagamento
// recusado não decide que o aluno deixou de ser lead — ele pode
// tentar de novo. Só approved/cancelled/refunded mudam o Student.
const STUDENT_STATUS_BY_PAYMENT_STATUS = {
  approved: 'paid',
  cancelled: 'cancelled',
  refunded: 'refunded',
};

// Uma vez num desses estados o pagamento é definitivo — o Mercado
// Pago reenvia o mesmo webhook várias vezes, e reenvios não devem
// reprocessar nada nem reenviar eventos pra Meta de novo.
const TERMINAL_PAYMENT_STATUSES = ['approved', 'refunded', 'cancelled'];

const STATUS_LOG_MESSAGE = {
  approved: 'Pagamento aprovado',
  pending: 'Pagamento pendente',
  rejected: 'Pagamento recusado',
  cancelled: 'Pagamento cancelado',
  refunded: 'Pagamento estornado',
};

async function processNotification(dataId) {
  if (!dataId) {
    logger.warn('Webhook do Mercado Pago sem data.id — ignorado');
    return;
  }

  logger.info({ dataId }, 'Webhook do Mercado Pago recebido');

  // Gatilho == só o dataId. Toda decisão vem desta consulta — nunca
  // de action/status/topic do payload do webhook.
  const mpPayment = await mercadoPagoProvider.getPayment(dataId);

  logger.info(
    { dataId, mpStatus: mpPayment.status, mpPaymentId: mpPayment.id },
    'Pagamento consultado no Mercado Pago'
  );

  const externalReference = mpPayment.external_reference;
  if (!externalReference) {
    logger.warn({ dataId }, 'Pagamento do Mercado Pago sem external_reference — webhook ignorado');
    return;
  }

  const payment = await paymentRepository.findByExternalReference(externalReference);
  if (!payment) {
    // Não lança exceção nem responde 500 — evita loop de reenvio do
    // Mercado Pago pra uma referência que nunca vai existir.
    logger.warn({ dataId, externalReference }, 'externalReference não encontrado — webhook ignorado');
    return;
  }

  if (TERMINAL_PAYMENT_STATUSES.includes(payment.status)) {
    logger.info(
      { externalReference, status: payment.status },
      'Webhook duplicado — pagamento já em estado final, nada a fazer'
    );
    return;
  }

  if (!VALID_PAYMENT_STATUSES.includes(mpPayment.status)) {
    logger.warn(
      { externalReference, mpStatus: mpPayment.status },
      'Status retornado pelo Mercado Pago não é um dos mapeados — webhook ignorado'
    );
    return;
  }

  if (
    mpPayment.transaction_amount !== undefined &&
    Number(mpPayment.transaction_amount) !== payment.value.toNumber()
  ) {
    // Só um alerta — o Mercado Pago é a fonte de verdade sobre o que
    // foi de fato cobrado; não rejeitamos um pagamento real por causa
    // disso, mas vale saber se algum dia isso divergir.
    logger.warn(
      { externalReference, expected: payment.value, received: mpPayment.transaction_amount },
      'Valor retornado pelo Mercado Pago diverge do valor registrado no checkout'
    );
  }

  const newStatus = mpPayment.status;
  const studentStatus = STUDENT_STATUS_BY_PAYMENT_STATUS[newStatus];

  const paymentUpdateData = {
    status: newStatus,
    mpPaymentId: String(mpPayment.id),
    paymentMethod: mpPayment.payment_method_id || null,
  };
  if (newStatus === 'approved') {
    paymentUpdateData.approvedAt = mpPayment.date_approved ? new Date(mpPayment.date_approved) : new Date();
  }

  const { updatedPayment } = await runInTransaction(async (tx) => {
    const updatedPayment = await paymentRepository.updateByExternalReference(externalReference, paymentUpdateData, tx);

    let student = null;
    if (studentStatus) {
      student = await studentRepository.update(payment.studentId, { status: studentStatus }, tx);
    }

    if (newStatus === 'approved') {
      const analyticsBase = {
        studentId: payment.studentId,
        paymentId: payment.id,
        plan: payment.plan,
        value: payment.value,
        currency: 'BRL',
        utmSource: student.utmSource,
        utmMedium: student.utmMedium,
        utmCampaign: student.utmCampaign,
        fbclid: student.fbclid,
        fbp: payment.fbp,
        fbc: payment.fbc,
        ip: payment.ip,
        userAgent: payment.userAgent,
      };

      // Mesmo fbEventId reaproveitado nos dois — nunca gerado de
      // novo aqui. O dedup da Meta é por (pixel, event_name,
      // event_id), então reusar entre Purchase e Lead não colide.
      await analyticsEventRepository.create(
        { ...analyticsBase, eventId: payment.fbEventId, eventName: 'Purchase' },
        tx
      );
      await analyticsEventRepository.create(
        { ...analyticsBase, eventId: payment.fbEventId, eventName: 'Lead' },
        tx
      );
    }

    return { updatedPayment };
  });

  logger.info({ externalReference, status: newStatus }, STATUS_LOG_MESSAGE[newStatus] || `Pagamento atualizado: ${newStatus}`);

  // Fora da transação de propósito — chamada de rede externa. Se
  // falhar, o pagamento já está corretamente confirmado localmente;
  // não faz sentido derrubar a resposta do webhook (o Mercado Pago
  // reenviaria e caíamos direto no bloqueio de "já em estado final").
  if (newStatus === 'approved') {
    try {
      await metaCapiService.sendPurchase(updatedPayment);
      await metaCapiService.sendLead(updatedPayment);
    } catch (err) {
      logger.error({ err, externalReference }, 'Falha ao notificar Meta CAPI — pagamento já confirmado localmente');
    }
  }
}

module.exports = { processNotification };
