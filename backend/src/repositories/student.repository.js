const prisma = require('../config/prisma');

// Acesso direto ao Prisma fica só aqui. Nenhuma regra de negócio —
// isso é trabalho dos services (Módulo 2+).
//
// Todo método aceita um `client` opcional (default: o singleton) pra
// poder rodar dentro de uma transação — ver transaction.repository.js.

function findById(id, client = prisma) {
  return client.student.findUnique({ where: { id } });
}

function findByEmail(email, client = prisma) {
  return client.student.findUnique({ where: { email } });
}

function create(data, client = prisma) {
  return client.student.create({ data });
}

function update(id, data, client = prisma) {
  return client.student.update({ where: { id }, data });
}

// Cria o Student na primeira vez que o email aparece; nas próximas
// (ex: aluno comprando um segundo plano depois), atualiza os dados
// de contato/atribuição em vez de duplicar o registro.
function upsertByEmail(email, data, client = prisma) {
  return client.student.upsert({
    where: { email },
    create: { email, ...data },
    update: data,
  });
}

module.exports = { findById, findByEmail, create, update, upsertByEmail };
