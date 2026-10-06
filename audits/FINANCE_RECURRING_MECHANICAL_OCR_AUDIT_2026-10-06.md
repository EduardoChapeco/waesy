# Auditoria financeira, recorrência e extração mecânica — 2026-10-06

## Escopo executado

- Auditoria dos handlers de parcelas, conciliação e assinaturas recorrentes.
- Correção de baixas diretas que marcavam parcelas como `paid` sem conciliação.
- Criação de uma fila persistente e idempotente para cobranças recorrentes vencidas.
- Endurecimento do OCR documental com allowlist de MIME, limite de tamanho/páginas e idempotência por conteúdo.
- Roteamento para Groq quando a extração mecânica já produziu texto legível; visão Gemini permanece apenas quando necessária.

## Correções aplicadas

| Área | Evidência anterior | Correção | Validação |
|---|---|---|---|
| Carnês P2P | `registerInstallmentPayment` alterava `status` para `paid` diretamente | Cliente agora envia comprovante e grava `conciliation_status = pending`; somente aprovação usa a RPC atômica | Typecheck, testes focados e gate sem `status: "paid"` nos handlers |
| Carnês da loja | `payInstallment` atualizava `installments` diretamente e não registrava liquidação atômica | Chamada substituída por `settle_installment_atomic` | Typecheck e build |
| Liquidação | Não havia contrato único para a baixa legada | Migration `20270111000000_financial_settlement_and_recurring_billing.sql` adiciona RPC com identidade, loja, lock e idempotência de parcela | Checagem estrutural da migration |
| Recorrência | Assinatura só avançava `next_billing_date`; não havia fila persistida de cobrança | `recurring_billing_attempts` com chave idempotente e `enqueue_due_recurring_billing(date)` para worker/service role | Checagem estrutural da migration |
| OCR | MIME livre, payload sem limite e cobrança com `Date.now + Math.random` | MIME allowlist, base64 limitado, 25 MB, máximo de 100 páginas e fingerprint SHA-256 determinístico | Typecheck, lint, build |
| Custos de IA | Texto extraído mecanicamente ainda preferia Gemini | Texto legível usa Groq `llama-3.1-8b-instant`; imagens/PDFs sem texto seguem visão Gemini | Testes de OCR/onboarding e build |

## Gates executados

- `npm run typecheck`: **passou, 0 erros**.
- Testes focados de onboarding, checkout e fronteiras do Copilot: **20 testes passaram**.
- ESLint dos arquivos alterados: **0 erros**, somente warnings preexistentes de `no-explicit-any`.
- `npm run audit:buttons`: **P0 0 / P1 0 / P2 0**, 6.145 controles verificados.
- Scanner client leak: **passou**, 494 chunks de boot sem runtime de servidor.
- Scanner de uso de Sparkles: **passou**.
- `git diff --check`: **passou**.
- Build de produção Cloudflare/Nitro: **passou**.

## Limite importante

A migration foi criada e validada estruturalmente no repositório. A aplicação no Supabase remoto depende do conector/credencial de banco autorizado; nenhum segredo foi inventado nem usado para executar uma migração remota fora do fluxo autorizado.

A fila recorrente agora é persistente e idempotente, mas o worker que consome `recurring_billing_attempts` deve ser executado por um job service-role e chamar o gateway real. A implementação deliberadamente não simula cobranças nem marca pagamentos como pagos sem confirmação do gateway.
