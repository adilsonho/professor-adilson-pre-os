const { WebhookSignatureValidator, InvalidWebhookSignatureError } = require('mercadopago');
const env = require('../config/env');

// Verificação oficial da assinatura do webhook do Mercado Pago —
// recomputa o HMAC-SHA256 sobre `id:{data.id};request-id:{x-request-id};ts:{ts};`
// e compara em tempo constante com o hash do header `x-signature`.
// Implementação da própria SDK do Mercado Pago — não reinventamos o
// HMAC na mão. Puro: não toca em req/res, só recebe os valores já
// extraídos pelo middleware.
//
// Não passamos `toleranceSeconds` (janela anti-replay): o `ts` que o
// Mercado Pago envia é em SEGUNDOS (confirmado na documentação
// oficial — ex. "ts=1704908010"), mas a checagem de tolerância desta
// versão da SDK compara esse valor direto contra `Date.now()`, que é
// em MILISSEGUNDOS — habilitar rejeitaria 100% dos webhooks
// legítimos. A verificação do HMAC em si não depende dessa unidade
// (usa a string crua do `ts`), então continua correta; só a proteção
// extra contra replay fica de fora até confirmar o formato real com
// tráfego de produção do Mercado Pago.
function verifySignature({ xSignature, xRequestId, dataId }) {
  WebhookSignatureValidator.validate({
    xSignature,
    xRequestId,
    dataId,
    secret: env.MERCADOPAGO_WEBHOOK_SECRET,
  });
}

module.exports = { verifySignature, InvalidWebhookSignatureError };
