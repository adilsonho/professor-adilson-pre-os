-- AlterEnum
-- Postgres não permite remover valor de enum facilmente, então isso
-- fica no schema permanentemente — inofensivo e sem custo mesmo sem
-- uso contínuo. Ver comentário no schema.prisma sobre teste_r1.
ALTER TYPE "PlanId" ADD VALUE 'teste_r1';
