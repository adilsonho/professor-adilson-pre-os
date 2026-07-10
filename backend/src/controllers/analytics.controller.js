const analyticsService = require('../services/analytics.service');

async function postAnalytics(req, res, next) {
  try {
    await analyticsService.recordEvent({
      eventName: req.body.eventName,
      eventId: req.body.eventId,
      planId: req.body.planId,
      utmSource: req.body.utmSource,
      utmMedium: req.body.utmMedium,
      utmCampaign: req.body.utmCampaign,
      fbclid: req.body.fbclid,
      fbp: req.body.fbp,
      fbc: req.body.fbc,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
    res.status(201).json({ recorded: true });
  } catch (err) {
    next(err);
  }
}

module.exports = { postAnalytics };
