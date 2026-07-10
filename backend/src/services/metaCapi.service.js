const logger = require('../utils/logger');
const env = require('../config/env');
const metaProvider = require('../providers/meta.provider');
const studentRepository = require('../repositories/student.repository');
const { hashEmail, hashPhone, hashExternalId } = require('../utils/hash');

function toNumber(value) {
  if (value && typeof value.toNumber === 'function') return value.toNumber();
  return Number(value);
}

// em/ph/external_id vão hasheados (SHA-256); client_ip_address,
// client_user_agent, fbp e fbc vão em texto puro — é assim que a
// Meta espera esses dois grupos. fbp/fbc/ip/userAgent vêm do Payment
// (capturados no checkout, Módulo 2) porque o webhook não tem
// contexto de browser quando isso é enviado.
function buildUserData(student, payment) {
  return {
    em: [hashEmail(student.email)].filter(Boolean),
    ph: [hashPhone(student.phone)].filter(Boolean),
    external_id: [hashExternalId(student.id)].filter(Boolean),
    client_ip_address: payment.ip || undefined,
    client_user_agent: payment.userAgent || undefined,
    fbp: payment.fbp || undefined,
    fbc: payment.fbc || undefined,
  };
}

function eventTimeFromPayment(payment) {
  const date = payment.approvedAt || payment.updatedAt || new Date();
  return Math.floor(new Date(date).getTime() / 1000);
}

async function buildAndSendEvent(eventName, payment) {
  const student = await studentRepository.findById(payment.studentId);
  if (!student) {
    // Não deveria acontecer (FK garante a referência), mas se
    // acontecer não é motivo pra derrubar o webhook — só não há
    // e-mail/telefone pra hashear.
    logger.warn({ paymentId: payment.id, eventName }, 'Meta CAPI: Student não encontrado — evento não enviado');
    return;
  }

  const event = {
    event_name: eventName,
    event_time: eventTimeFromPayment(payment),
    // Mesmo event_id que o Pixel do browser vai usar (Módulo 5) —
    // é a chave de deduplicação entre os dois envios do mesmo evento.
    event_id: payment.fbEventId,
    event_source_url: `${env.FRONTEND_URL}/obrigado.html`,
    action_source: 'website',
    user_data: buildUserData(student, payment),
    custom_data: {
      currency: 'BRL',
      value: toNumber(payment.value),
      content_name: payment.plan,
    },
  };

  await metaProvider.sendEvents([event]);
  logger.info({ paymentId: payment.id, fbEventId: payment.fbEventId, eventName }, `${eventName} enviado ao Meta CAPI`);
}

async function sendPurchase(payment) {
  return buildAndSendEvent('Purchase', payment);
}

async function sendLead(payment) {
  return buildAndSendEvent('Lead', payment);
}

module.exports = { sendPurchase, sendLead };
