# Arquitetura

## Diagrama

```
Browser (site estático)
 ├─ Meta Pixel (client-side, direto pra Meta):
 │  PageView → ViewContent → ViewPricing → SelectPlan → InitiateCheckout
 │  Purchase só dispara após confirmação real do backend (ver meta-capi.md)
 │
 ├─ GET /plans          → fonte única de preço
 ├─ POST /checkout      → cria Student + Payment(pending) + Preference no MP
 ├─ GET /payment/:ref   → status real, vindo do banco (nunca de query param)
 └─ POST /analytics     → grava eventos de funil próprios (nunca fala com a Meta)

Backend (Express)
 routes → validators → controllers → services → repositories → Prisma → PostgreSQL
                                    → providers → Mercado Pago SDK / Meta Graph API

Mercado Pago
 └─ Webhook oficial → POST /webhook/mercadopago
       → consulta pagamento real via SDK (nunca confia só na notificação)
       → atualiza Payment + Student
       → se approved: MetaCapiService.sendPurchase() + sendLead() (chamada
         de função interna — nunca uma rota HTTP)
       → grava AnalyticsEvents
```

## Camadas

| Camada | Responsabilidade |
|---|---|
| `routes/` | Mapeamento método+path → controller. Zero lógica. |
| `validators/` | Forma do payload (`express-validator`). |
| `controllers/` | Tradução HTTP ↔ service. Sem regra de negócio, sem acesso ao Prisma. |
| `services/` | Regra de negócio pura. Não importa o Prisma Client diretamente. |
| `repositories/` | Única camada que acessa o Prisma/banco. |
| `providers/` | Única camada que acessa SDKs/APIs externas (Mercado Pago, Meta). Isola o vendor do resto do sistema. |
| `webhooks/` | Parsing e verificação de assinatura de webhooks recebidos, antes de qualquer decisão de negócio. |
| `middlewares/` | Cross-cutting: segurança, log de request, tratamento de erro. |
| `utils/` | Funções puras sem estado (hash, geração de event ID, logger). |

## Modelo de dados

3 tabelas: `Student`, `Payment` (histórico 1:N — o plano pertence ao pagamento, não ao aluno), `AnalyticsEvents`. Detalhado em [`data-model.md`](data-model.md) (Módulo 1).

## Regra de ouro do Purchase

`Purchase` só nasce depois que o webhook confirma `approved` consultando o Mercado Pago diretamente. O browser pode disparar o mesmo evento via Pixel, mas só depois de perguntar pro nosso próprio backend (`GET /payment/:ref`) — nunca a partir de parâmetro de URL do Mercado Pago. Os dois lados reusam o mesmo `event_id` (campo `fbEventId` no `Payment`) para a Meta deduplicar. Detalhado em [`meta-capi.md`](meta-capi.md) (Módulo 4).
