const prisma = require('../config/prisma');

// Único ponto onde `$transaction` é chamado. Services usam isso pra
// agrupar escritas em mais de um repository (ex: Student + Payment no
// checkout) numa transação atômica, sem precisar importar o Prisma
// Client diretamente — services não tocam no Prisma (ver README).
function runInTransaction(callback) {
  return prisma.$transaction(callback);
}

module.exports = { runInTransaction };
