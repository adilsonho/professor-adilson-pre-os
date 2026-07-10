# Deploy (Railway)

## Visão geral

O **backend** (esta pasta) sobe como um serviço Docker na Railway, com Postgres também provisionado lá. O **site estático** (`index.html`, `obrigado.html`, `metaPixel.js`, na raiz do repo, fora de `backend/`) não faz parte deste deploy — pode ficar em qualquer host de arquivo estático (Netlify, GitHub Pages, Vercel, etc). As duas metades só precisam saber a URL pública uma da outra.

## 1. Banco de dados

Na Railway: **New → Database → PostgreSQL**. A `DATABASE_URL` gerada automaticamente é o que vai na variável de ambiente do serviço do backend (Railway consegue referenciar isso direto entre serviços do mesmo projeto).

## 2. Serviço do backend

**New → GitHub Repo** → aponte pro repositório. Como o backend fica em `backend/` (não na raiz do repo), configure em **Settings → Root Directory**: `backend`. A Railway detecta o `Dockerfile` automaticamente (`railway.json` já fixa isso explicitamente).

## 3. Variáveis de ambiente

Configurar em **Settings → Variables** (mesmas do `.env.example`, com valores reais):

| Variável | Valor em produção |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | Não precisa setar — a Railway injeta a própria |
| `FRONTEND_URL` | URL pública do site estático (onde `index.html` está hospedado) |
| `BACKEND_URL` | URL pública deste serviço na Railway (ou domínio customizado) |
| `DATABASE_URL` | Referência à `DATABASE_URL` do Postgres do passo 1 |
| `MERCADOPAGO_ACCESS_TOKEN` | Token de **produção** (`APP_USR-...`) — nunca o de teste aqui |
| `MERCADOPAGO_WEBHOOK_SECRET` | Ver passo 4 |
| `META_PIXEL_ID` | `871942722527879` |
| `META_ACCESS_TOKEN` | Token de produção do Meta CAPI |
| `META_TEST_EVENT_CODE` | Deixar vazio em produção (só usar durante testes pontuais no Events Manager) |
| `LOG_LEVEL` | `info` |

O processo **não sobe** se faltar qualquer uma das obrigatórias (`src/config/env.js` valida no boot e derruba o processo com uma mensagem clara).

## 4. Webhook do Mercado Pago — assinatura

`MERCADOPAGO_WEBHOOK_SECRET` **não é o mesmo token de acesso** — é gerado à parte:

1. Mercado Pago → **Suas integrações** → sua aplicação → **Webhooks**.
2. Cadastre a URL: `https://<BACKEND_URL>/webhook/mercadopago`.
3. Copie a **assinatura secreta** gerada ali — é isso que vai em `MERCADOPAGO_WEBHOOK_SECRET`.

Sem isso, todo webhook real chega e é rejeitado com 401 (assinatura inválida) — comportamento correto e intencional (ver `docs/architecture.md`), mas o pagamento nunca vai ser confirmado se essa variável estiver errada ou ausente.

O `notification_url` que vai em cada `Preference` (`${BACKEND_URL}/webhook/mercadopago`) é setado automaticamente pelo código (`checkout.service.js`) — não precisa configurar isso de novo em lugar nenhum.

## 5. Migrations

Rodam **automaticamente** a cada deploy — o `CMD` do `Dockerfile` executa `npx prisma migrate deploy` antes de iniciar o servidor. Se a migration falhar, o container falha ao subir (intencional: falhar rápido em vez de servir com schema desatualizado). `railway.json` configura `healthcheckPath: /health` e restart automático em caso de falha.

## 6. Site estático

Depois que o backend estiver no ar com uma URL definitiva:

1. Editar `metaPixel.js` → `API_BASE_URL` (linha comentada `// ALTERAR AQUI ANTES DO DEPLOY`) pra apontar pro `BACKEND_URL` real.
2. Fazer o deploy do site (Netlify/Vercel/GitHub Pages/etc) — qualquer host de arquivo estático simples serve.
3. Confirmar que a URL final do site é exatamente o que está em `FRONTEND_URL` na Railway (CORS depende disso — um mismatch aqui faz todo `fetch()` do site falhar silenciosamente no browser).

## 7. Checklist pós-deploy

- [ ] `GET https://<BACKEND_URL>/health` → `{ "status": "ok" }`
- [ ] `GET https://<BACKEND_URL>/plans` → os 3 planos
- [ ] Um checkout de teste real (valor baixo, ou usar o modo sandbox do Mercado Pago) → confirma que `POST /checkout` cria a Preference e redireciona
- [ ] Completar esse pagamento de teste → confirma que o webhook chega, a assinatura passa, `obrigado.html` mostra sucesso e o Purchase aparece no Meta Events Manager (Test Events, se `META_TEST_EVENT_CODE` estiver setado nesse momento)
- [ ] Verificar nos logs da Railway (`pino-http`, um JSON por requisição) que nada de sensível (token, secret) está aparecendo

## Rollback

A Railway mantém deploys anteriores — reverter é um clique no dashboard (**Deployments → ⋮ → Redeploy** numa versão anterior). Migrations do Prisma não têm rollback automático; se uma migration precisar ser desfeita, é uma migration nova que reverte a anterior (nunca editar uma migration já aplicada).
