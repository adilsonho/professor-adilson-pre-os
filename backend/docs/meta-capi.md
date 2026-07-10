# Meta Conversion API

## Quando dispara

Só a partir do webhook (`src/services/webhook.service.js`), quando um `Payment` transiciona pra `approved` — nunca em outro momento, nunca por chamada HTTP externa. `Lead` é enviado exclusivamente pelo servidor (nunca pelo frontend — ver `docs/architecture.md`).

```
webhook.service.js (approved)
  → metaCapiService.sendPurchase(payment)
  → metaCapiService.sendLead(payment)
      → busca o Student (studentRepository.findById)
      → monta o evento (hash de PII, dados em texto puro)
      → metaProvider.sendEvents([evento])  →  POST /{pixel_id}/events (Graph API v22.0)
```

## Deduplicação com o Pixel do browser

`event_id` = `Payment.fbEventId`, gerado uma única vez no checkout (`checkout.service.js`) e nunca regenerado. O mesmo valor é devolvido pelo browser via `GET /payment/:ref` (Módulo 5) e usado no `fbq('track', 'Purchase', ..., { eventID })`. A Meta deduplica por `(pixel_id, event_name, event_id)` — como `Purchase` e `Lead` são `event_name` diferentes, reusar o mesmo `fbEventId` nos dois não causa colisão entre eles.

## user_data — o que é hasheado e o que não é

| Campo | Hasheado? | Fonte |
|---|---|---|
| `em` (email) | Sim (SHA-256, lowercase+trim antes) | `Student.email` |
| `ph` (telefone) | Sim (SHA-256, só dígitos com DDI antes) | `Student.phone` |
| `external_id` | Sim (SHA-256) | `Student.id` |
| `client_ip_address` | Não — texto puro | `Payment.ip` (capturado no checkout) |
| `client_user_agent` | Não — texto puro | `Payment.userAgent` |
| `fbp`, `fbc` | Não — texto puro | `Payment.fbp`/`fbc` (cookies lidos pelo frontend no checkout) |

Normalização de telefone (`src/utils/hash.js`): decide se falta o DDI (55) pelo **tamanho** do número (10/11 dígitos = sem DDI, 12/13 = já tem), não por já começar com "55" — evita prefixar errado um número cujo DDD real é 55 (região de Santa Maria/RS).

## Erros

`src/providers/meta.provider.js` nunca loga o erro cru do axios (o `.config`/`.request` carregam a URL completa da chamada, que inclui o `access_token` como query param) — só os campos já parseados e seguros (`status`, corpo do erro da Meta, código). Falha no envio é capturada em `webhook.service.js` e só logada — nunca desfaz o que já foi confirmado localmente, nem faz o Mercado Pago reenviar o webhook à toa.

## Validado contra a API real

Testado com token de produção real (`META_ACCESS_TOKEN`) + `META_TEST_EVENT_CODE` (isola o evento no simulador do Events Manager, sem afetar dados reais de anúncios) — `Purchase` e `Lead` confirmados chegando corretamente formatados.
