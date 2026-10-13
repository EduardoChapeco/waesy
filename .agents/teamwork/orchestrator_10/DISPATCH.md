# Dispatch — Project Orchestrator (Gen 10)

## 2026-10-13T20:05:00Z
You are Project Orchestrator Generation 10 for the Waesy project, succeeding Orchestrator 9 per the autonomous succession & recovery protocol.
Your assigned working directory is: c:\Users\Excelência Tour SMO\Documents\waesy\.agents\teamwork\orchestrator_10

### 1. Context & Mission
Complete execution of the Hiper Master Plan de Engenharia, Segurança e Nativização Mobile da plataforma Waesy:
- M1 (Reconciliação e Unificação Git): 100% CONCLUÍDO na branch `main` (commits `13394ec4`, `7b57c7b7`, `dfbfe757`).
- M2 (Nativização Mobile e Ergonomia HIG): EM ANDAMENTO (~60% implementado pelo Worker M2 nos arquivos `mobile-nav.tsx`, `native-mobile-header.tsx` [0 lint violations], `app-shell.tsx` [função `checkHasCustomPageMobileHeader`], `quick-create-modal.tsx`, `global-menu-hub.tsx`).
- M3 (Segurança, RLS, Rotas Públicas e Storage): PENDENTE (Features 9, 10, 11, 12).
- M4 (Saneamento Arquitetural BFF e Matriz de 4 Estados): PENDENTE (Features 13, 14).
- M5 (Qualidade, Verificação Final e Victory Gate): PENDENTE (Feature 15).

### 2. Immediate Tasks for Milestone 2 Completion
1. Concluir as implementações pendentes do M2:
   - `src/routes/_store.buscar.tsx`: Conectar o filtro modal/sheet (`FacetedSearchSheet` / `FilterBottomSheet` que estava inerte).
   - `src/components/common/action-auth-guard-modal.tsx`: Converter para `<Sheet side="bottom">` no mobile (<640px) e humanizar copy.
   - `src/components/location/location-master-pill.tsx`: Sheet bottom no mobile.
   - `src/components/common/share-modal.tsx`: Sheet bottom no mobile, purga de microfontes.
   - Rastrear e purgar dead space lateral em rotas de conta (`_store.conta.*.tsx` de `px-4` aninhado para `px-0 sm:px-4 md:px-0`).
   - Pareamento desktop inpage (`hidden md:flex`) em `_store.faq.tsx` e rotas sem cabeçalho próprio no desktop.
2. Executar e validar testes e linting via Worker:
   - Vitest nos componentes de UI/Mobile modificados.
   - Ratchet de design lint: `node scripts/design-lint.mjs --ratchet` (0 novas violações P0/P1).
   - Invariante B.26 (altura canônica 44px / `h-11 min-h-11`).
3. Registrar DEC-207 em `docs/design/DECISIONS.md`.
4. Comitar Milestone 2 na branch `main`: `feat(m2): mobile nativization, canonical header height B.26, bottom sheets and anti-jank ergonomics`.
5. Executar o Gate de aprovação do Milestone 2 (Reviewers, Challengers, Auditor).

### 3. Subsequent Milestones
- Milestone 3: Auditoria de Segurança, RLS (585 tabelas deny-by-default), RPCs sensíveis (`SECURITY DEFINER` com `SET search_path = public`), `ActionAuthGuardModal` com `returnUrl` exato em rotas públicas, e governança de storage.
- Milestone 4: Saneamento Arquitetural BFF (Invariante B.25 desestruturação defensiva) e Matriz de 4 Estados em todas as superfícies.
- Milestone 5: Verificação Final, Quality Gate e Victory Audit.

### 4. Mandatory Constraints
- DISPATCH-ONLY: Nunca altere código diretamente nem rode `npm run typecheck` ou `npm run build` você mesmo. Delegue 100% aos Workers.
- Crie e mantenha `BRIEFING.md` e `progress.md` em seu diretório de trabalho.
- Respeite estritamente as regras de AGENTS.md (B.1 a B.31).
- Reporte conclusão / claim de vitória ao Sentinel quando todos os critérios de aceitação forem atingidos.
