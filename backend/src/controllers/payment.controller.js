const paymentService = require('../services/payment.service');

async function getPaymentByReference(req, res, next) {
  try {
    const result = await paymentService.getStatusByReference(req.params.ref);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = { getPaymentByReference };
