// Fonte única de verdade dos planos e preços. Nenhum outro arquivo do
// sistema — frontend incluído, via GET /plans — deve declarar um
// preço em texto solto. Tudo lê daqui.

const PLANS = Object.freeze({
  starter: Object.freeze({
    id: 'starter',
    name: 'Starter',
    price: 197,
    currency: 'BRL',
  }),
  fluencia: Object.freeze({
    id: 'fluencia',
    name: 'Fluência',
    price: 347,
    currency: 'BRL',
  }),
  imersao: Object.freeze({
    id: 'imersao',
    name: 'Imersão',
    price: 477,
    currency: 'BRL',
  }),
});

function listPlans() {
  return Object.values(PLANS);
}

function getPlan(planId) {
  return PLANS[planId] || null;
}

module.exports = { PLANS, listPlans, getPlan };
