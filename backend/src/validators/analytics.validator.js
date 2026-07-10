const { body } = require('express-validator');
const validate = require('../middlewares/validate');
const { stripControlChars } = require('../utils/sanitize');

// Só os eventos de topo de funil que só acontecem mesmo no browser.
// InitiateCheckout é gravado pelo checkout.service.js e Purchase/Lead
// pelo webhook.service.js — de propósito fora desta lista, pra um
// cliente não conseguir forjar esses eventos batendo direto aqui.
const ALLOWED_EVENT_NAMES = ['PageView', 'ViewContent', 'ViewPricing', 'SelectPlan'];

const analyticsValidator = [
  body('eventName').isString().isIn(ALLOWED_EVENT_NAMES).withMessage('Evento inválido.'),
  body('eventId').optional({ values: 'falsy' }).isString().trim().customSanitizer(stripControlChars).isLength({ max: 255 }),
  body('planId').optional({ values: 'falsy' }).isString().trim().customSanitizer(stripControlChars).isLength({ max: 64 }),
  body('utmSource').optional({ values: 'falsy' }).isString().trim().customSanitizer(stripControlChars).isLength({ max: 255 }),
  body('utmMedium').optional({ values: 'falsy' }).isString().trim().customSanitizer(stripControlChars).isLength({ max: 255 }),
  body('utmCampaign').optional({ values: 'falsy' }).isString().trim().customSanitizer(stripControlChars).isLength({ max: 255 }),
  body('fbclid').optional({ values: 'falsy' }).isString().trim().customSanitizer(stripControlChars).isLength({ max: 255 }),
  body('fbp').optional({ values: 'falsy' }).isString().trim().customSanitizer(stripControlChars).isLength({ max: 255 }),
  body('fbc').optional({ values: 'falsy' }).isString().trim().customSanitizer(stripControlChars).isLength({ max: 255 }),
  validate,
];

module.exports = analyticsValidator;
