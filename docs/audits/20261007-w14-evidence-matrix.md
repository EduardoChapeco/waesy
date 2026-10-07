# Matriz de evidências W14 — 2026-10-07

## Escopo

Esta matriz cobre as correções executadas nas ondas W8–W13 no branch `execute/waesy-resumption-2026-10-07`. Ela separa o que foi provado por teste em memória do que ainda exige Supabase, provider, navegador ou ambiente de produção.

| Gap/correção | Evidência unit/contract | Falha negativa coberta | Nível comprovado | Limite não inferido |
|---|---|---|---|---|
| Editor Builder canônico e isolamento Omni | `builder.functions.test.ts`, `omni-builder.functions.test.ts` | tenant divergente, draft/publicado, idempotência | Unit + contract harness | RPC/RLS real não executado nesta sessão |
| Geração de imagem real/provenance | `ai-core-gateway.test.ts`, `wave4-creative-studio.test.ts` | provider 4xx/5xx, fallback determinístico explícito | Unit + provider boundary mock | Provider externo real e storage real pendentes |
| Upload de mídia tenant-safe | `storage.functions.test.ts` | MIME/bytes/dimensão/path cross-tenant/download expirado | Unit + contract harness | Bucket/RLS/URL assinada reais pendentes |
| Jobs de mídia/quota | `ai-media-jobs.functions.test.ts` | duplicata, retry, cancelamento, cobrança única | Unit + contract harness | Worker/clock/DB concorrente real pendente |
| Rotas W10 | `route-integrity-w10.test.ts` + auditores de route/navigation/parity | rota órfã, deep-link fora do catálogo, layout sem auth | Static contract + route audit | Browser navigation real pendente |
| WhatsApp inbound | `whatsapp-w11-webhook.test.ts`, `whatsapp-provider-webhook.test.ts` | HMAC ausente/inválido, replay, payload duplicado | Unit + provider contract harness | Provider e Postgres real pendentes |
| WhatsApp outbox/status | `whatsapp-wave8-security.test.ts`, adapters, W11 | 4xx/5xx, reordenação de callbacks, dead-letter | Unit + adapter harness | Lease concorrente no DB real pendente |
| OCR/reconciliação turística | `travel-w12-integrity.test.ts`, conflitos, pipeline | provider vazio, conflito crítico, aplicação repetida | Unit + contract harness | OCR/provider/storage/DB real pendentes |
| Checkout turístico | `travel-w12-integrity.test.ts` | preço ausente e Pix não configurado não geram cobrança fictícia | Static contract + typecheck | Gateway de pagamento real não conectado |
| Design system | design lint `--changed`, token sync, a11y tests | P0/P1 novos, token ausente, CSS divergente | Static lint + unit | Screenshot/browser visual real pendente |

## Fault injection executado

- Assinatura WhatsApp ausente, inválida e fora da janela de replay: rejeitada sem efeitos.
- Provider WhatsApp HTTP 4xx/5xx e timeout-classification: classificado como permanente/retryable.
- Duplicata concorrente simulada por `upsert(... ignoreDuplicates)` retornando `data: null`: não reexecuta efeitos.
- Callback de entrega fora de ordem: não regride status de campanha/conversa.
- OCR sem resposta estruturada: não produz preço, inclusões, confiança ou Pix fictícios.
- Conflito crítico de documento: aplicação é bloqueada.
- Tokens/classes visuais fora do contrato: design lint detecta; depois da remediação o escopo alterado ficou em P0=0/P1=0.

## Classificação de evidência

- **Unit:** função/schema/normalizador isolado.
- **Contract harness:** adapters e repositórios em memória/mocks de fronteira; não é integração real.
- **Integration DB:** não executado nesta sessão; migrations não foram aplicadas a um banco vivo.
- **Browser E2E:** não executado nesta sessão.
- **CI:** typecheck, Vitest e linters locais executados no mesmo working tree; build completo ainda é gate W14.5.
- **Production smoke:** não executado; deploy/publicação não foi autorizado nesta retomada.

## Regra de honestidade

Nenhum teste acima deve ser descrito como E2E de produção. A ausência de Supabase CLI/ambiente de banco vivo nesta sessão mantém W12.1, parte de W14.3 e a prova operacional como **bloqueadas**, não concluídas por inferência.
