const prisma = require('../config/prisma');

// Todo método aceita um `client` opcional (default: o singleton) pra
// poder rodar dentro de uma transação — ver transaction.repository.js.

function findById(id, client = prisma) {
  return client.payment.findUnique({ where: { id } });
}

function findByExternalReference(externalReference, client = prisma) {
  return client.payment.findUnique({ where: { externalReference } });
}

function findByMpPaymentId(mpPaymentId, client = prisma) {
  return client.payment.findUnique({ where: { mpPaymentId } });
}

function create(data, client = prisma) {
  return client.payment.create({ data });
}

function update(id, data, client = prisma) {
  return client.payment.update({ where: { id }, data });
}

function updateByExternalReference(externalReference, data, client = prisma) {
  return client.payment.update({ where: { externalReference }, data });
}

module.exports = {
  findById,
  findByExternalReference,
  findByMpPaymentId,
  create,
  update,
  updateByExternalReference,
};
