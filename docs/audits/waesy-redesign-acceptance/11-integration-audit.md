# 11 — Auditoria de Integrações com Serviços Externos

## 1. Provedores de Pagamento e Fintech
- **Mercado Pago & Asaas:** Módulos em `src/services/billing-hub.functions.ts` e `asaas.functions.ts`. Webhooks protegidos com validação de assinatura criptográfica e idempotência de transação.
- **Preservação:** Nenhuma chamada ou schema de pagamento foi alterado durante as refatorações.

---

## 2. Infraestrutura e Comunicação
- **Focus NFe:** Módulo `src/services/focus-nfe.functions.ts` operacional, necessitando da blindagem de fila apontada no GAP-001.
- **Cloudflare Workers & Assets:** Deploy automatizado e compilação do bundle em `dist/` com compatibilidade total com o runtime Edge.
- **WhatsApp Gateway:** Geração de deep-links com mensagens padronizadas preservada em vitrines e orçamentos.
