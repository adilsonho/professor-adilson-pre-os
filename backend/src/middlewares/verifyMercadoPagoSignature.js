const logger = require('../utils/logger');
const { verifySignature, InvalidWebhookSignatureError } = require('../webhooks/mercadopago.webhook');

// Roda antes do controller — se a assinatura não bate, a requisição
// nunca chega perto de consultar o Mercado Pago ou tocar no banco.
function verifyMercadoPagoSignature(req, res, next) {
  const dataId = req.query['data.id'] || (req.body && req.body.data && req.body.data.id);

  try {
    verifySignature({
      xSignature: req.get('x-signature'),
      xRequestId: req.get('x-request-id'),
      dataId,
    });
    next();
  } catch (err) {
    if (err instanceof InvalidWebhookSignatureError) {
      logger.warn(
        { reason: err.reason, requestId: err.requestId, ip: req.ip },
        'Webhook do Mercado Pago rejeitado — assinatura inválida'
      );
      return res.status(401).json({ error: 'Assinatura inválida.' });
    }
    next(err);
  }
}

module.exports = verifyMercadoPagoSignature;
