const prisma = require('../config/prisma');

// `client` opcional (default: o singleton) pra poder rodar dentro de
// uma transação — ver transaction.repository.js.

function create(data, client = prisma) {
  return client.analyticsEvent.create({ data });
}

function findByEventId(eventId, client = prisma) {
  return client.analyticsEvent.findFirst({ where: { eventId } });
}

module.exports = { create, findByEventId };
