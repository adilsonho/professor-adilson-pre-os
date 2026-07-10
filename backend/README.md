# Teacher Adilson — Backend

Backend exclusivo do negócio de aulas particulares de inglês do Teacher Adilson. Responsável por: checkout via Mercado Pago (API oficial, sem links `mpago.la`), confirmação de pagamento via webhook (assinatura verificada, idempotente), e envio de eventos server-side pra Meta Conversion API (deduplicados com o Pixel do browser).

Não é um SaaS, não é multi-tenant, não tem autenticação/painel administrativo — uso interno de um único negócio.

## Stack

Node.js + Express, PostgreSQL + Prisma, Mercado Pago SDK oficial, Meta Conversion API (via Axios), Pino + pino-http (logs estruturados), Helmet + CORS + rate-limit + sanitização (segurança).

## Arquitetura

```
routes → rate limit → validators → controllers → services → repositories → Prisma → PostgreSQL
                                                            → providers → Mercado Pago SDK / Meta Graph API
```

- **controllers/**: tradução HTTP ↔ service. Sem regra de negócio.
- **services/**: regra de negócio. Não importa o Prisma Client diretamente.
- **repositories/**: única camada que acessa o banco.
- **providers/**: única camada que acessa SDKs/APIs externas (Mercado Pago, Meta).
- **webhooks/**: parsing e verificação de assinatura dos webhooks recebidos.
- **middlewares/**, **validators/**, **utils/**: cross-cutting concerns (rate limit, sanitização, erro, logger).

Detalhes completos em [`docs/`](docs/):
- [`architecture.md`](docs/architecture.md) — diagrama, camadas, regra de ouro do Purchase
- [`data-model.md`](docs/data-model.md) — schema completo (Student, Payment, AnalyticsEvent)
- [`meta-capi.md`](docs/meta-capi.md) — como o evento é montado, hashing, dedup
- [`deploy.md`](docs/deploy.md) — runbook de deploy na Railway

## Endpoints

| Método | Rota | O que faz |
|---|---|---|
| `GET` | `/health` | Liveness check |
| `GET` | `/plans` | Planos e preços (fonte: `config/plans.js`) |
| `POST` | `/checkout` | Cria Student + Payment (pending) + Preference no Mercado Pago |
| `GET` | `/payment/:ref` | Status real de um pagamento (nunca confiar em query param de URL) |
| `POST` | `/analytics` | Funil próprio — só `PageView`/`ViewContent`/`ViewPricing`/`SelectPlan` |
| `POST` | `/webhook/mercadopago` | Confirmação de pagamento (assinatura verificada, idempotente) |

## Setup local

Pré-requisitos: Node 20+, Docker (pro Postgres local) — ou um Postgres já rodando em outro lugar.

```bash
cp .env.example .env
# preencha .env com os valores reais (Mercado Pago, Meta, etc.)

npm install
docker compose up -d postgres
npm run prisma:migrate
npm run dev
```

`GET http://localhost:3000/health` deve responder `{ "status": "ok" }`.

## Scripts

| Script | O que faz |
|---|---|
| `npm run dev` | Sobe o servidor com reload automático (`node --watch`) |
| `npm start` | Sobe o servidor em modo produção |
| `npm run prisma:migrate` | Cria/aplica migration em dev |
| `npm run prisma:deploy` | Aplica migrations pendentes em produção (roda automaticamente no deploy — ver `docs/deploy.md`) |
| `npm run prisma:studio` | Abre o Prisma Studio (inspeção visual do banco) |

## Variáveis de ambiente

Ver [`.env.example`](.env.example) — todas são validadas no boot (`src/config/env.js`); o processo não sobe se faltar alguma.

## Docker

```bash
docker compose up --build
```

Sobe Postgres + API pra dev local. Em produção (Railway), o `Dockerfile` roda sozinho — Postgres é provisionado pela plataforma, migrations aplicam automaticamente no start do container. Detalhes em [`docs/deploy.md`](docs/deploy.md).

## Segurança

- Assinatura HMAC do webhook do Mercado Pago verificada (`src/webhooks/mercadopago.webhook.js`) — nunca processa notificação sem isso.
- Rate limiting por rota, calibrado por custo/risco de cada endpoint (`src/middlewares/rateLimiters.js`).
- PII do Meta CAPI (e-mail, telefone) sempre hasheada (SHA-256) antes de sair do servidor.
- Nunca loga access token, secrets, CPF ou dados de cartão.
- `helmet()`, CORS restrito a `FRONTEND_URL`, limite explícito de tamanho de payload.

## Status do projeto

Todos os módulos concluídos: estrutura/config, banco de dados, checkout Mercado Pago, webhook, Meta Conversion API, integração frontend, segurança, deploy. Integração com Mercado Pago e Meta CAPI validadas contra as APIs reais (não só com mocks).
