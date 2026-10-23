# EVENT_TICKET_ENGINE_AUDIT — Auditoria do Motor de Ingressos, Gratuidade e Elegibilidade

## 1. Modelo Unificado de Ingressos (`EventTicketTierNormalized`)

| Propriedade | Tipo | Comportamento Canônico |
| :--- | :--- | :--- |
| `category` | `EventTicketCategory` | Classifica o ingresso em `publico_geral`, `associado`, `vip`, `estudante`, `cortesia`, `convidado`, `grupo` ou `custom`. |
| `lot_name` & `lot_order` | `string` / `number` | Identifica a sequência do lote (`1º Lote`, `2º Lote`, `Lote Único`) para ordenação e virada automática. |
| `price_cents` & `price` | `number` | Normalizado de forma determinística via `resolveTierPriceCents` (corrige o bug onde `price: 50` com `price_cents: 0` exibia `R$ 0,00`). |
| `is_free` & `price_display` | `boolean` / `string` | Quando `price_cents === 0`, exibe **`"GRÁTIS"`** em destaque (nunca `R$ 0,00` cru). |
| `eligibility_rule` | `string?` | Exibe a condição explícita de elegibilidade (ex.: *"Exclusivo para associados ACIC e CDL com CNPJ ativo"*). |
| `external_url` | `string?` | Unifica `purchase_url` (editor) e `external_url` (vitrine), redirecionando para bilheteria externa quando preenchido. |
| `is_purchasable` | `boolean` | Bloqueia seleção e checkout para lotes em estado `SCHEDULED`, `SOLD_OUT`, `ENDED`, `PAUSED`, `DRAFT` ou `ARCHIVED`. |

## 2. Fluxo de Emissão Criptográfica WCTS-1
- Todo ingresso emitido via `checkoutClassifiedEventTicket`, `registerClassifiedEventLead` ou `issueComplimentaryTicket` recebe assinatura HMAC-SHA256 (`signTicketPayload` em `src/lib/ticket-crypto.ts`), gerando código humano (`WSY-EVT-...` / `W-TKT-...`) e payload QR verificável na portaria (`verifyClassifiedTicketByCode` e `validateTicketCheckin`).
