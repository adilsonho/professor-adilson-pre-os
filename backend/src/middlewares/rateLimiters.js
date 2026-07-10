const rateLimit = require('express-rate-limit');

// Store em memória (padrão) — adequado pro tamanho deste negócio (uma
// única instância). Um store distribuído (Redis) seria over-engineering
// aqui. Todos os limitadores dependem de `req.ip` refletir o IP real
// do cliente, o que só funciona com `trust proxy` configurado (app.js).

const baseOptions = {
  standardHeaders: true,
  legacyHeaders: false,
};

// Rede de segurança aplicada a toda a API.
const generalLimiter = rateLimit({
  ...baseOptions,
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { error: 'Muitas requisições. Tente novamente em alguns minutos.' },
});

// POST /checkout chama a API do Mercado Pago e escreve no banco a
// cada tentativa — o mais caro e mais sensível a abuso dos endpoints.
const checkoutLimiter = rateLimit({
  ...baseOptions,
  windowMs: 15 * 60 * 1000,
  max: 8,
  message: { error: 'Muitas tentativas de checkout. Aguarde alguns minutos e tente novamente.' },
});

// GET /payment/:ref — externalReference é um UUID (inviável de
// adivinhar por força bruta), mas limitar consultas por IP é defesa
// em profundidade barata.
const paymentStatusLimiter = rateLimit({
  ...baseOptions,
  windowMs: 5 * 60 * 1000,
  max: 30,
  message: { error: 'Muitas consultas. Aguarde um instante.' },
});

const analyticsLimiter = rateLimit({
  ...baseOptions,
  windowMs: 5 * 60 * 1000,
  max: 60,
  message: { error: 'Muitas requisições.' },
});

// Webhook é autenticado por assinatura (verifyMercadoPagoSignature),
// não por quem está do outro lado da conexão — o limite aqui é só
// uma rede de segurança generosa contra alguém martelando o endpoint
// com assinaturas inválidas, não algo pensado pra bloquear o Mercado
// Pago em uso normal (que pode legitimamente mandar rajadas de
// notificações).
const webhookLimiter = rateLimit({
  ...baseOptions,
  windowMs: 60 * 1000,
  max: 120,
  message: { error: 'Muitas requisições.' },
});

module.exports = {
  generalLimiter,
  checkoutLimiter,
  paymentStatusLimiter,
  analyticsLimiter,
  webhookLimiter,
};
