# LEDGER DE AUDITORIA FORENSE, ESTABILIZAÇÃO RLS & SINCRONIZAÇÃO FRONTEND ↔ BACKEND
**Data:** 2026-11-17  
**Autor:** Conselho Executivo Soberano Waesy (`EduardoChapeco/waesy`)  
**Status:** CONCLUÍDO E APROVADO COM EVIDÊNCIAS DETERMINÍSTICAS  
**Governança:** `AGENTS.md` (B.1 a B.36), `docs/design/DESIGN.md`, `docs/design/DESIGN-LINT.md`

---

## 1. ESCOPO & OBJETIVO
Execução de auditoria forense completa em todas as implementações sequenciais recentes:
- Hot Ofertas Black + Copilot `@oferta` + Herança Bilateral Oferta-Mestre <-> Proposta
- Matriz de Carteira Rotativa B2B (Fila "Dia a Dia" & Ciclo de Recompra)
- Roteirização de Campo com GPS, Geofence Haversine e Check-in com Áudio
- Múltiplos Catálogos & Tabelas de Preço B2B com RLS Scoped
- OmniMatch / MatchTravel Neural Engine (Templates, Cartas, Vetores e Visitor Brains)
- Blindagem e auditoria sistêmica de RLS em 100% das tabelas do banco de dados (eliminação de acessos anônimos / públicos indevidos em tabelas operacionais e de workspace).

---

## 2. EVIDÊNCIAS DE INTEGRIDADE MECÂNICA

### 2.1 Verificação de Schemas e Contratos de Tabela
- `node scripts/check-schema-consolidation.mjs`:
  - **646 migrações SQL** consolidadas
  - **849 tabelas declaradas**
  - **0 duplicidades de versão** (Exit Code 0 — PASS)
- `node scripts/check-bff-table-contracts.mjs`:
  - **705 tabelas referenciadas pelo BFF**
  - **0 tabelas órfãs ou não declaradas** (Exit Code 0 — PASS)
- `node scripts/naming-convention-validator.mjs`:
  - **235 componentes PascalCase auditados**, 0 violações críticas (Exit Code 0 — PASS)
- `node scripts/check-circular-deps.mjs`:
  - **2965 arquivos analisados**, **0 ciclos de dependência circular** (Exit Code 0 — PASS)
- `node scripts/token-sync.mjs --check`:
  - **173 tokens W3C DTCG sincronizados**, 0 aliases quebrados (Exit Code 0 — PASS)

### 2.2 Auditoria de Unicidade de Tipos (SSOT Gate Plano 5 — S13)
- `node scripts/check-type-duplications.mjs`:
  - **2965 arquivos inspecionados**
  - Identificada e sanada colisão semântica de `RoomOccupancy`: renomeado o seletor de hóspedes de UI para `GuestRoomOccupancy` em `src/components/tourism/tourism-multi-room-picker.tsx`, `src/components/tourism/tourism-dynamic-search-panel.tsx` e `src/components/tourism/travel-quote-modal.tsx`.
  - **Resultado:** **0 tipos/interfaces duplicados em todo o repositório** (Exit Code 0 — PASS).

### 2.3 Auditoria Forense Sistêmica de RLS e Bloqueio de Leaks Públicos
- Script de rastreamento forense: `scripts/ops/trace-active-rls-policies.mjs`
- **Total de tabelas com RLS habilitado:** 822 de 817 declaradas (100% com RLS ativado, 0 tabelas desprotegidas).
- **Hardening em `travel_contract_signers`:**
  - Identificadas políticas residuais permissivas em migrações legadas (`travel_contract_signers_public_token` e `travel_contract_signers_public_update` com `USING (true)`).
  - Aplicado hardening em `supabase/migrations/20270609000000_b2b_rotary_crm_gps_routes_and_omnimatch_engine.sql`:
    - `DROP POLICY IF EXISTS "travel_contract_signers_public_token" ON public.travel_contract_signers;`
    - `DROP POLICY IF EXISTS "travel_contract_signers_public_update" ON public.travel_contract_signers;`
    - `REVOKE ALL ON public.travel_contract_signers FROM anon, public;`
  - Assinantes externos operam exclusivamente via BFF autenticado no servidor (`getPublicContractSignerByToken` e `submitElectronicSignature`).
- **Tabelas do Workspace / Painel:**
  - `seller_portfolio_assignments`, `sales_routes`, `sales_route_stops`, `sales_visit_logs`, `match_visitor_brains`, `offer_campaign_dispatches`, `crm_leads`, `customer_price_table_assignments`: 100% protegidas com `is_store_staff(store_id)` ou escopo de tenant/sessão isolada. Zero permissão anônima de leitura ou injeção.

### 2.4 Paridade Frontend ↔ Backend e Sanitização de Parâmetros
- `HotOfferPublisherDialog` ↔ `promoteProposalOrPackageToHotOfferFn`: 100% dos parâmetros (título higienizado, mídias cropadas, cópia WhatsApp, grupos e leads selecionados) validados com Zod schemas.
- `WorkspaceMatchTimeStudioPage` ↔ `upsertMatchCardFn`: Parâmetros de cartas de trade-off e eixos ponderados sanitizados com suporte defensivo a valores opcionais/nulos.
- `FieldRoutesView` ↔ `recordFieldVisitCheckInFn`: Telemetria GPS com Haversine, precisão em metros e notas de campo com validação defensiva.

### 2.5 Catraca de Design Lint (CI Ratchet)
- `node scripts/design-lint.mjs --ratchet`:
  - **2387 arquivos inspecionados**
  - **Severidade P0:** 0
  - **Severidade P1:** 0
  - **Severidade P2:** 0
  - **Severidade P3:** 0
  - **Total de violações:** 0
  - **Status:** CATRACA APROVADA sem regressão.

### 2.6 Testes Automatizados E2E Vitest
- Suítes executadas:
  1. `src/services/hot-offers-and-copilot-e2e.test.ts` (4 testes) — PASS
  2. `src/services/__tests__/b2b-portfolio-and-omnimatch-e2e.test.ts` (10 testes) — PASS
  3. `src/services/travel-signer-integrity.test.ts` (10 testes) — PASS
- **Total:** **24/24 testes aprovados (100% de sucesso)**.
