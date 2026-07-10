const { Router } = require('express');
const { webhookLimiter } = require('../middlewares/rateLimiters');
const verifyMercadoPagoSignature = require('../middlewares/verifyMercadoPagoSignature');
const { postMercadoPagoWebhook } = require('../controllers/webhook.controller');

const router = Router();

router.post('/webhook/mercadopago', webhookLimiter, verifyMercadoPagoSignature, postMercadoPagoWebhook);

module.exports = router;
