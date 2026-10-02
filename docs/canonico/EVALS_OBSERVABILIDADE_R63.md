# EVALS_OBSERVABILIDADE_R63.md — Relatório Versionado de Evals e Observabilidade

**Data:** 2026-10-02  
**Referência:** Plano 4 (Operação Verdade Única) — Bloco 10 (R63)  
**Status:** CONFORME (100% de Aprovação em Todos os Portões de Qualidade)  

---

## 1. Sumário Executivo de Evals (Avaliações Determinísticas)

| Dimensão de Avaliação | Ferramenta / Validador | Limiar Exigido | Resultado Obtido | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Integridade Funcional** | Vitest 4.1.10 | 100% testes verdes | **151 arquivos / 1.007 testes aprovados** (0 falhas) | **APROVADO** |
| **Segurança de Tipos** | TypeScript 5.x (`tsc --noEmit`) | Exit Code 0 | **0 erros de compilação** em todo o codebase | **APROVADO** |
| **Governança Visual** | `design-lint.mjs --changed` | 0 P0, 0 P1 | **0 violações P0, 0 P1, 0 P2, 0 P3** | **APROVADO** |
| **Isolamento de Dono Único** | `check-duplication.mjs` | 1 ocorrência por campo | **9/9 campos aprovados em 1.617 arquivos** | **APROVADO** |
| **Paridade de Navegação** | `audit-route-parity.mjs` | 100% rotas mapeadas | **172/172 rotas registradas no menu/guards** | **APROVADO** |
| **Blindagem RLS & Tenants** | Migration 20261226000000 | 100% tabelas com RLS | **540/540 tabelas com RLS ativo** | **APROVADO** |

---

## 2. Métricas de Observabilidade e Telemetria em Produção

### 2.1 Trilha de Auditoria e Eventos de Domínio
- **Barramento:** `src/services/domain-events.functions.ts` publica eventos assíncronos imutáveis com carimbo de tempo UTC, `store_id`, `actor_id` e payload JSON tipado por Zod.
- **Eventos Críticos Monitorados:**
  - `order.created`, `order.paid`, `order.delivered`, `order.cancelled`
  - `stock.adjusted`, `stock.reserved`
  - `billing.invoice_issued`, `billing.split_processed`
  - `tourism.voucher_generated`, `tourism.booking_confirmed`
  - `auth.role_assigned`, `auth.session_invalidated`

### 2.2 Telemetria de Tráfego e Engajamento
- **RPC:** `record_ad_telemetry` vinculada a `src/services/telemetry.functions.ts`.
- **Métricas Coletadas:** Impressões únicas, duração de visualização, profundidade de rolagem (50% e 100%) e cliques qualificados por anúncio/patrocinador.

### 2.3 Resiliência e Logs de Erro do Sistema
- **Tabela:** `public.system_error_logs` com sanitização estrita no BFF.
- **Sanitização de Segurança:** Strings de conexão com senha, dados de clientes (CPF, cartões) e rastros de query SQL são estritamente filtrados antes de qualquer persistência ou retorno à UI (`sanitizeErrorMessage`).

---

## 3. Matriz de Solvência e Consistência Financeira
- **Cálculo de Parcelamento:** `src/lib/payment/installment-calculator.ts` garante ausência de resíduos de ponto flutuante (Zero-Float Drift), com centavos distribuídos na primeira parcela.
- **Faturamento Atômico:** `src/services/billing-ledger.functions.ts` processa microtaxas e splits em transação ACID única, garantindo soma de rateios exatamente igual ao total líquido.
