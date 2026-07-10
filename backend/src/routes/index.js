const { Router } = require('express');
const healthRoutes = require('./health.routes');
const checkoutRoutes = require('./checkout.routes');
const webhookRoutes = require('./webhook.routes');
const plansRoutes = require('./plans.routes');
const paymentRoutes = require('./payment.routes');
const analyticsRoutes = require('./analytics.routes');

// Agregador único de rotas. Cada módulo novo soma uma linha aqui —
// app.js não muda mais depois deste ponto.
const router = Router();

router.use(healthRoutes);
router.use(checkoutRoutes);
router.use(webhookRoutes);
router.use(plansRoutes);
router.use(paymentRoutes);
router.use(analyticsRoutes);

module.exports = router;
