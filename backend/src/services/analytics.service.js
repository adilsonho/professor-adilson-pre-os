const { getPlan } = require('../config/plans');
const analyticsEventRepository = require('../repositories/analyticsEvent.repository');

async function recordEvent(input) {
  const plan = input.planId ? getPlan(input.planId) : null;

  return analyticsEventRepository.create({
    eventId: input.eventId,
    eventName: input.eventName,
    plan: plan ? plan.id : undefined,
    value: plan ? plan.price : undefined,
    currency: 'BRL',
    utmSource: input.utmSource,
    utmMedium: input.utmMedium,
    utmCampaign: input.utmCampaign,
    fbclid: input.fbclid,
    fbp: input.fbp,
    fbc: input.fbc,
    ip: input.ip,
    userAgent: input.userAgent,
  });
}

module.exports = { recordEvent };
