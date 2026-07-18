const { v4: uuidv4 } = require('uuid');

const env = require('../config/env');
const { getPlan } = require('../config/plans');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

const mercadoPagoProvider = require('../providers/mercadopago.provider');
const studentRepository = require('../repositories/student.repository');
const paymentRepository = require('../repositories/payment.repository');
const analyticsEventRepository = require('../repositories/analyticsEvent.repository');
const { runInTransaction } = require('../repositories/transaction.repository');

// Student só guarda um campo `name` (nunca pedimos nome/sobrenome
// separado no checkout) — o Mercado Pago recomenda mandar
// payer.last_name pra melhorar o índice de aprovação (reduz
// falso-positivo do antifraude). Split simples: primeira palavra =
// nome, resto = sobrenome. Nome de uma palavra só fica sem sobrenome.
function splitName(fullName) {
  const parts = fullName.trim().split(/\s+/);
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' ') || undefined,
  };
}

function buildPreferenceBody({ plan, student, externalReference }) {
  const { firstName, lastName } = splitName(student.name);

  return {
    items: [
      {
        id: plan.id,
        // O cliente nunca deve ver os nomes internos (starter/fluencia/
        // imersao nem seus nomes curtos) na tela do Mercado Pago —
        // mercadoPagoTitle é o texto de marca completo pra isso.
        title: plan.mercadoPagoTitle,
        // Recomendação do Mercado Pago pra melhorar índice de
        // aprovação — mesmo texto que GET /plans expõe.
        description: plan.description,
        quantity: 1,
        currency_id: plan.currency,
        // Preço sai só daqui — nunca de algo que o frontend mandou.
        unit_price: plan.price,
      },
    ],
    payer: { name: firstName, surname: lastName, email: student.email },
    external_reference: externalReference,
    notification_url: `${env.BACKEND_URL}/webhook/mercadopago`,
    auto_return: 'approved',
    back_urls: {
      // Páginas finais de redirecionamento são refinadas no Módulo 5
      // (frontend). O que importa desde já é o `ref` na URL — o status
      // real nunca vem do redirect, só de GET /payment/:ref.
      success: `${env.FRONTEND_URL}/obrigado.html?ref=${externalReference}`,
      pending: `${env.FRONTEND_URL}/obrigado.html?ref=${externalReference}`,
      failure: `${env.FRONTEND_URL}/index.html?ref=${externalReference}&payment=failed`,
    },
  };
}

async function createCheckout(input) {
  const plan = getPlan(input.planId);
  // O validator já barra planId fora da lista, mas o service não
  // confia cegamente em quem o chama — defesa em profundidade.
  if (!plan) {
    throw new AppError('Plano inválido.', 400);
  }

  const externalReference = uuidv4();
  // Mesmo event_id que o Pixel vai usar no browser (Módulo 5) e que o
  // webhook vai reenviar pro Meta CAPI (Módulo 4) — é a chave da
  // deduplicação entre os dois envios do mesmo Purchase.
  const fbEventId = uuidv4();

  const preference = await mercadoPagoProvider.createPreference(
    buildPreferenceBody({
      plan,
      student: { name: input.name, email: input.email },
      externalReference,
    })
  );

  // Só grava no banco depois que o Mercado Pago confirma a Preference.
  // Se a chamada acima falhar, nada é persistido — nenhum Payment
  // "pending" órfão sem preferenceId.
  const { payment } = await runInTransaction(async (tx) => {
    const student = await studentRepository.upsertByEmail(
      input.email,
      {
        name: input.name,
        phone: input.phone,
        status: 'checkout_started',
        origin: input.origin,
        utmSource: input.utmSource,
        utmMedium: input.utmMedium,
        utmCampaign: input.utmCampaign,
        utmTerm: input.utmTerm,
        utmContent: input.utmContent,
        fbclid: input.fbclid,
        gclid: input.gclid,
      },
      tx
    );

    const payment = await paymentRepository.create(
      {
        studentId: student.id,
        plan: plan.id,
        value: plan.price,
        status: 'pending',
        provider: 'mercado_pago',
        externalReference,
        preferenceId: preference.id,
        fbEventId,
        fbp: input.fbp,
        fbc: input.fbc,
        ip: input.ip,
        userAgent: input.userAgent,
      },
      tx
    );

    // InitiateCheckout — só é registrado aqui porque este é o único
    // momento server-side em que ele realmente acontece; ao contrário
    // de PageView/ViewContent/ViewPricing/SelectPlan (que só existem
    // no browser e chegam via POST /analytics), este tem um gatilho
    // de servidor confiável e já tem todo o contexto em mãos.
    await analyticsEventRepository.create(
      {
        eventId: fbEventId,
        eventName: 'InitiateCheckout',
        studentId: student.id,
        paymentId: payment.id,
        plan: plan.id,
        value: plan.price,
        currency: plan.currency,
        utmSource: input.utmSource,
        utmMedium: input.utmMedium,
        utmCampaign: input.utmCampaign,
        fbclid: input.fbclid,
        fbp: input.fbp,
        fbc: input.fbc,
        ip: input.ip,
        userAgent: input.userAgent,
      },
      tx
    );

    return { student, payment };
  });

  logger.info(
    { paymentId: payment.id, externalReference, preferenceId: preference.id },
    'Checkout criado'
  );

  return {
    checkoutUrl: preference.init_point,
    externalReference,
  };
}

module.exports = { createCheckout };
