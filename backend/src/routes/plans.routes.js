const { Router } = require('express');
const { getPlans } = require('../controllers/plans.controller');

const router = Router();

router.get('/plans', getPlans);

module.exports = router;
