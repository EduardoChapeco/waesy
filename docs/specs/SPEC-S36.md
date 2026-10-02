# SPEC-S36: Contabilização Sistemática de Erros de Negócio

## 1. Contexto e Motivação
Na operação de uma plataforma de comércio e serviços locais, falhas de negócio (recusa de pagamento, ruptura de estoque, estouro de cotas de plano) não constituem falhas técnicas de infraestrutura (500), mas afetam diretamente o faturamento, a satisfação do cliente e a integridade operacional.

A Fase S36 do Plano 5 (Bloco E - Telemetria Real) institui o subsistema canônico para captura, tipagem, contagem e agregação sistemática de erros de negócio em tempo real, permitindo visibilidade forense e prevenção de atrito transacional.

---

## 2. Requisitos em Sintaxe EARS

### [REQ-S36-01] Tipagem e Catálogo Canônico de Erros de Negócio
- **EARS (Ubíquo):** O módulo `src/lib/telemetry/business-errors.ts` deve definir a taxonomia estrita de erros de negócio da plataforma Waesy (`BusinessErrorCode`):
  - `PAYMENT_REJECTED`
  - `STOCK_DEPLETED`
  - `PLAN_QUOTA_EXCEEDED`
  - `INVALID_STATE_TRANSITION`
  - `TENANT_ACCESS_DENIED`
  - `SCHEMA_VALIDATION_ERROR`
  - `CONCURRENCY_COLLISION`
  - `PROMO_CODE_INVALID`

### [REQ-S36-02] Registro Estruturado com Contexto Multi-Tenant
- **EARS (Quando evento ocorre):** Quando uma falha de negócio for disparada pela camada BFF ou serviços de domínio, o helper `recordBusinessError(params)` deve registrar um evento com `code`, `tenantId`, `userId`, `traceId`, `context` estruturado e timestamp ISO.

### [REQ-S36-03] Contadores e Métricas de Incidência em Tempo Real
- **EARS (Ubíquo):** O registro em memória `businessErrorsRegistry` deve manter contadores acumulados de frequência por código de erro e por tenant, permitindo extrair sumários de taxa de incidência sem necessidade de varredura completa.

### [REQ-S36-04] Sanitização Estrita de PII em Contextos de Negócio
- **EARS (Ubíquo):** Todo contexto associado ao erro de negócio deve ser automaticamente higienizado para impedir a gravação inadvertida de senhas, chaves de API ou dados de cartão de crédito.

---

## 3. Invariantes
1. Erros de negócio nunca devem disparar exceções não tratadas 500 no servidor.
2. Todo registro de erro de negócio deve possuir código canônico pertencente à enumeração `BusinessErrorCode`.
3. Contenção de memória com teto máximo de eventos em memória e desalocação FIFO.

---

## 4. Critérios de Aceite
- [ ] `src/lib/telemetry/business-errors.ts` implementado com tipos, catalogação e registro agregador.
- [ ] Suíte de testes unitários com 100% de cobertura em `src/lib/telemetry/business-errors.test.ts`.
- [ ] `npm run typecheck` Exit Code 0.
- [ ] `node scripts/design-lint.mjs --ratchet` Exit Code 0.
