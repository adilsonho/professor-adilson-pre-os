const checkoutService = require('../services/checkout.service');

// Só traduz HTTP ↔ service. ip/userAgent são coisas de requisição —
// são extraídos aqui, não em qualquer camada mais funda.
async function postCheckout(req, res, next) {
  try {
    const input = {
      planId: req.body.planId,
      name: req.body.name,
      email: req.body.email,
      phone: req.body.phone,
      origin: req.body.origin,
      utmSource: req.body.utmSource,
      utmMedium: req.body.utmMedium,
      utmCampaign: req.body.utmCampaign,
      utmTerm: req.body.utmTerm,
      utmContent: req.body.utmContent,
      fbclid: req.body.fbclid,
      gclid: req.body.gclid,
      fbp: req.body.fbp,
      fbc: req.body.fbc,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    };

    const result = await checkoutService.createCheckout(input);

    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = { postCheckout };
