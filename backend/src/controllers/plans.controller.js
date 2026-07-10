const { listPlans } = require('../config/plans');

// Sem service — não há regra de negócio aqui, só expõe a fonte única
// de preços (config/plans.js) como JSON, igual ao health check.
function getPlans(req, res) {
  res.status(200).json(listPlans());
}

module.exports = { getPlans };
