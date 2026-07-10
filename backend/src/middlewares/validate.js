const { validationResult } = require('express-validator');

// Roda depois de uma cadeia de validators do express-validator. Só
// verifica forma de payload (tipos, presença, formato) — nunca regra
// de negócio.
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Dados inválidos.',
      details: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  next();
}

module.exports = validate;
