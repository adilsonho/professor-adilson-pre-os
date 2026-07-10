const webhookService = require('../services/webhook.service');

// 200 = "recebi, pode parar de reenviar". Qualquer coisa != 2xx faz o
// Mercado Pago tentar de novo mais tarde — e o processamento é
// idempotente, então um retry nunca causa duplicação.
async function postMercadoPagoWebhook(req, res, next) {
  try {
    const dataId = req.query['data.id'] || (req.body && req.body.data && req.body.data.id);
    await webhookService.processNotification(dataId);
    res.status(200).json({ received: true });
  } catch (err) {
    next(err);
  }
}

module.exports = { postMercadoPagoWebhook };
