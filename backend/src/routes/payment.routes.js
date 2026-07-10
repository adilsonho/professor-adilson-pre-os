const { Router } = require('express');
const { paymentStatusLimiter } = require('../middlewares/rateLimiters');
const paymentRefValidator = require('../validators/payment.validator');
const { getPaymentByReference } = require('../controllers/payment.controller');

const router = Router();

router.get('/payment/:ref', paymentStatusLimiter, paymentRefValidator, getPaymentByReference);

module.exports = router;
