const { Router } = require('express');
const { analyticsLimiter } = require('../middlewares/rateLimiters');
const analyticsValidator = require('../validators/analytics.validator');
const { postAnalytics } = require('../controllers/analytics.controller');

const router = Router();

router.post('/analytics', analyticsLimiter, analyticsValidator, postAnalytics);

module.exports = router;
