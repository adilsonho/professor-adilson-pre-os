// Fonte única de verdade dos planos e preços. Nenhum outro arquivo do
// sistema — frontend incluído, via GET /plans — deve declarar um
// preço em texto solto. Tudo lê daqui.
//
// Reposicionamento (jul/2026): de mensalidade avulsa pra Programa de
// Mentoria em Inglês de 6 meses, cobrado uma vez (parcelável em até
// 12x no cartão pelo próprio checkout do Mercado Pago — isso é nativo
// da Preference, não precisa de nada extra aqui). IDs
// (starter/fluencia/imersao) e toda a integração continuam as mesmas
// — só o valor e a comunicação do que ele representa mudaram.
//
// `price` é o valor real cobrado (bate com o total "à vista" mostrado
// no site: 582/882/1.182 = 12 × 48,50/73,50/98,50, sem arredondamento).
// `name` é o nome curto (usado no modal/telas internas). `mercadoPagoTitle`
// é o texto que o cliente vê na tela de pagamento do Mercado Pago —
// nunca os nomes internos starter/fluencia/imersao.

const PLANS = Object.freeze({
  starter: Object.freeze({
    id: 'starter',
    name: 'Career Start',
    mercadoPagoTitle: 'Career Start – Programa de Mentoria (6 meses)',
    price: 582,
    currency: 'BRL',
    // Reaproveitada como items.description na Preference do Mercado
    // Pago — eles recomendam preencher pra melhorar o índice de
    // aprovação (reduz falso-positivo do antifraude).
    description: 'Programa de Mentoria em Inglês — 6 meses, 24 sessões individuais.',
  }),
  fluencia: Object.freeze({
    id: 'fluencia',
    name: 'Career Pro',
    mercadoPagoTitle: 'Career Pro – Programa de Mentoria (6 meses)',
    price: 882,
    currency: 'BRL',
    description: 'Programa de Mentoria em Inglês — 6 meses, 48 sessões individuais.',
  }),
  imersao: Object.freeze({
    id: 'imersao',
    name: 'Global Career',
    mercadoPagoTitle: 'Global Career – Programa de Mentoria (6 meses)',
    price: 1182,
    currency: 'BRL',
    description: 'Programa de Mentoria em Inglês — 6 meses, 72 sessões individuais.',
  }),
});

function listPlans() {
  return Object.values(PLANS);
}

function getPlan(planId) {
  return PLANS[planId] || null;
}

module.exports = { PLANS, listPlans, getPlan };
