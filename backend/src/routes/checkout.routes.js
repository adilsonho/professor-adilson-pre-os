const { Router } = require('express');
const { checkoutLimiter } = require('../middlewares/rateLimiters');
const checkoutValidator = require('../validators/checkout.validator');
const { postCheckout } = require('../controllers/checkout.controller');

const router = Router();

router.post('/checkout', checkoutLimiter, checkoutValidator, postCheckout);

module.exports = router;
