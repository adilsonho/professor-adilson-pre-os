const { body } = require('express-validator');
const { PLANS } = require('../config/plans');
const validate = require('../middlewares/validate');
const { stripControlChars } = require('../utils/sanitize');

// `.bail()` depois de cada checagem — sem isso, um campo ausente
// falha em todo validator da cadeia e devolve várias mensagens
// genéricas repetidas pro mesmo campo em vez de uma só, clara.
//
// `.customSanitizer(stripControlChars)` em todo campo de texto livre
// — remove caracteres de controle/null bytes antes de qualquer outra
// checagem. Não escapa HTML de propósito (ver utils/sanitize.js).
//
// Só forma do payload. O preço nunca entra aqui — quem decide o
// preço é o service, lendo config/plans.js a partir do planId.
const checkoutValidator = [
  body('planId')
    .isString().withMessage('Plano inválido.').bail()
    .trim()
    .isIn(Object.keys(PLANS)).withMessage('Plano inválido.'),

  body('name')
    .isString().withMessage('Nome inválido.').bail()
    .trim()
    .customSanitizer(stripControlChars)
    .isLength({ min: 2, max: 120 }).withMessage('Nome inválido.'),

  body('email')
    .isString().withMessage('E-mail inválido.').bail()
    .trim()
    .isEmail().withMessage('E-mail inválido.').bail()
    .normalizeEmail(),

  body('phone')
    .isString().withMessage('Telefone inválido.').bail()
    .trim()
    .customSanitizer(stripControlChars)
    .isLength({ min: 8, max: 20 }).withMessage('Telefone inválido.'),

  body('origin').optional({ values: 'falsy' }).isString().trim().customSanitizer(stripControlChars).isLength({ max: 255 }),
  body('utmSource').optional({ values: 'falsy' }).isString().trim().customSanitizer(stripControlChars).isLength({ max: 255 }),
  body('utmMedium').optional({ values: 'falsy' }).isString().trim().customSanitizer(stripControlChars).isLength({ max: 255 }),
  body('utmCampaign').optional({ values: 'falsy' }).isString().trim().customSanitizer(stripControlChars).isLength({ max: 255 }),
  body('utmTerm').optional({ values: 'falsy' }).isString().trim().customSanitizer(stripControlChars).isLength({ max: 255 }),
  body('utmContent').optional({ values: 'falsy' }).isString().trim().customSanitizer(stripControlChars).isLength({ max: 255 }),
  body('fbclid').optional({ values: 'falsy' }).isString().trim().customSanitizer(stripControlChars).isLength({ max: 255 }),
  body('gclid').optional({ values: 'falsy' }).isString().trim().customSanitizer(stripControlChars).isLength({ max: 255 }),

  // Cookies _fbp/_fbc lidos pelo frontend e reenviados aqui — usados
  // pelo Meta CAPI (Módulo 4) pra casar com o evento do Pixel.
  body('fbp').optional({ values: 'falsy' }).isString().trim().customSanitizer(stripControlChars).isLength({ max: 255 }),
  body('fbc').optional({ values: 'falsy' }).isString().trim().customSanitizer(stripControlChars).isLength({ max: 255 }),

  validate,
];

module.exports = checkoutValidator;
