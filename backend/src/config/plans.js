// Fonte única de verdade dos planos e preços. Nenhum outro arquivo do
// sistema — frontend incluído, via GET /plans — deve declarar um
// preço em texto solto. Tudo lê daqui.

const PLANS = Object.freeze({
  starter: Object.freeze({
    id: 'starter',
    name: 'Starter',
    price: 197,
    currency: 'BRL',
    // Reaproveitada como items.description na Preference do Mercado
    // Pago — eles recomendam preencher pra melhorar o índice de
    // aprovação (reduz falso-positivo do antifraude).
    description: 'Aulas particulares de inglês — 4 aulas de 60 minutos por mês, 1x por semana.',
  }),
  fluencia: Object.freeze({
    id: 'fluencia',
    name: 'Fluência',
    price: 347,
    currency: 'BRL',
    description: 'Aulas particulares de inglês — 8 aulas de 60 minutos por mês, 2x por semana.',
  }),
  imersao: Object.freeze({
    id: 'imersao',
    name: 'Imersão',
    price: 477,
    currency: 'BRL',
    description: 'Aulas particulares de inglês — 12 aulas de 60 minutos por mês, 3x por semana.',
  }),
});

function listPlans() {
  return Object.values(PLANS);
}

function getPlan(planId) {
  return PLANS[planId] || null;
}

module.exports = { PLANS, listPlans, getPlan };
