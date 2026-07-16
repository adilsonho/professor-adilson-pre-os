// Fonte única de verdade dos planos e preços. Nenhum outro arquivo do
// sistema — frontend incluído, via GET /plans — deve declarar um
// preço em texto solto. Tudo lê daqui.
//
// Reposicionamento (jul/2026): de mensalidade avulsa pra Programa de
// Desenvolvimento em Inglês de 6 meses, cobrado uma vez (parcelável
// em até 12x no cartão pelo próprio checkout do Mercado Pago — isso é
// nativo da Preference, não precisa de nada extra aqui). IDs
// (starter/fluencia/imersao) e toda a integração continuam as mesmas
// — só o valor e a comunicação do que ele representa mudaram.

const PLANS = Object.freeze({
  starter: Object.freeze({
    id: 'starter',
    name: 'Starter',
    price: 997,
    currency: 'BRL',
    // Reaproveitada como items.description na Preference do Mercado
    // Pago — eles recomendam preencher pra melhorar o índice de
    // aprovação (reduz falso-positivo do antifraude).
    description: 'Programa de Desenvolvimento em Inglês — 6 meses, 24 aulas particulares de 60 minutos.',
  }),
  fluencia: Object.freeze({
    id: 'fluencia',
    name: 'Fluência',
    price: 1797,
    currency: 'BRL',
    description: 'Programa de Desenvolvimento em Inglês — 6 meses, 48 aulas particulares de 60 minutos.',
  }),
  imersao: Object.freeze({
    id: 'imersao',
    name: 'Imersão',
    price: 2397,
    currency: 'BRL',
    description: 'Programa de Desenvolvimento em Inglês — 6 meses, 72 aulas particulares de 60 minutos.',
  }),
});

function listPlans() {
  return Object.values(PLANS);
}

function getPlan(planId) {
  return PLANS[planId] || null;
}

module.exports = { PLANS, listPlans, getPlan };
