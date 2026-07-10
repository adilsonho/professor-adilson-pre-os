# Modelo de dados

3 tabelas. Sem `CheckoutSessions` (o `Payment` já nasce em `POST /checkout` com `status: pending`), sem `Logs` (Pino/console/Railway — ver `src/utils/logger.js`), sem `Leads` separado (é só um `Student.status`).

## Student

| Campo | Tipo | Nota |
|---|---|---|
| id | uuid | PK |
| name, email, phone | string | `email` é único — chave de upsert |
| status | enum | `lead`, `checkout_started`, `paid`, `cancelled`, `inactive`, `refunded`. Só `checkout_started`/`paid`/`cancelled`/`refunded` são escritos automaticamente hoje; `lead`/`inactive` reservados pra uso futuro/manual |
| origin, utm_*, fbclid, gclid | string? | Atribuição de primeiro toque — capturada no primeiro `POST /checkout` |
| createdAt, updatedAt | datetime | |

## Payment (1 Student : N Payments)

O plano pertence ao pagamento, não ao aluno — histórico completo preservado.

| Campo | Tipo | Nota |
|---|---|---|
| id | uuid | PK |
| studentId | uuid | FK → Student |
| plan | enum | `starter` \| `fluencia` \| `imersao` — precisa ficar em sincronia manual com `src/config/plans.js` |
| value | decimal(10,2) | Copiado de `plans.js` no momento da criação — não muda se o preço mudar depois |
| status | enum | `pending` \| `approved` \| `rejected` \| `cancelled` \| `refunded` |
| provider | string | `"mercado_pago"` por padrão — permite trocar/adicionar gateway sem migration |
| paymentMethod | string? | `pix`, `credit_card`, etc. — vem do Mercado Pago |
| externalReference | string, único | Gerado por nós no checkout, usado no `back_url` |
| preferenceId | string? | Devolvido pelo Mercado Pago |
| mpPaymentId | string?, único | Só existe depois que o webhook confirma |
| fbEventId | string, único | Mesmo `event_id` usado no Pixel (browser) e no CAPI (servidor) — chave da deduplicação |
| fbp, fbc, ip, userAgent | string? | Capturados no checkout, reaproveitados pelo webhook pro `user_data` do CAPI |
| approvedAt | datetime? | |
| createdAt, updatedAt | datetime | |

## AnalyticsEvent

Funil próprio — relatórios sem depender do Meta Ads Manager.

| Campo | Tipo | Nota |
|---|---|---|
| id | uuid | PK |
| eventId | string? | Mesmo `fbEventId`, quando aplicável |
| eventName | enum | `PageView`, `ViewContent`, `ViewPricing`, `SelectPlan` (gravados via `POST /analytics`, Módulo 5 — só o frontend os dispara), `InitiateCheckout` (gravado por `checkout.service.js`), `Purchase`/`Lead` (gravados por `webhook.service.js`, só quando `approved`) |
| studentId, paymentId | uuid? | FK opcionais — nem todo evento tem os dois (ex: eventos de topo de funil não têm nenhum) |
| plan, value, currency | | |
| utm_*, fbclid, fbp, fbc, ip, userAgent | string? | |
| createdAt | datetime | |

## Migration

`prisma/migrations/20260709000000_init/` — gerada via `prisma migrate diff --from-empty` (diff puro de schema, não precisou de um Postgres vivo, porque o Docker local não estava disponível no momento). Ainda não foi **aplicada** em nenhum banco real. Rodar `npx prisma migrate deploy` assim que houver uma `DATABASE_URL` válida apontando pra um Postgres de verdade.
