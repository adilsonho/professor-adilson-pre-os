const { param } = require('express-validator');
const validate = require('../middlewares/validate');

const paymentRefValidator = [
  param('ref').isUUID().withMessage('Referência inválida.'),
  validate,
];

module.exports = paymentRefValidator;
