# Project: Waesy Ecosystem Platform Engineering (Run 5 — Hiper Master Plan)

## Architecture
- **Git Branch Unification**: Reconciliação forense e unificação de `origin/feat/system-merge-improvements-and-classifieds-copilot` (+9.182 linhas, DEC-198 a DEC-206) e `origin/perf/login-latency-and-route-caching` (+1.185 linhas, DEC-196) com `main` (`8261f77a`), resolvendo pontualmente os 5 arquivos de conflito (`src/lib/identity.server.ts`, `src/services/builder.functions.ts`, `design-lint.baseline.json`, `design-lint.report.json`, `docs/design/DECISIONS.md`) mantendo integridade multi-tenant estrita e zero regressões.
- **Mobile Native HIG Ergonomics (<640px)**: Experiência de App Nativo Anti-Jank: dock de navegação inferior (`mobile-nav.tsx`), cabeçalhos nativos com altura canônica `h-11 min-h-11` (B.26), eliminação do bug de cabeçalho duplo no `app-shell.tsx`, pareamento inpage no desktop, conversão de diálogos desktop para bottom sheets modais (`<Sheet side="bottom">`), alvos táteis mínimos de 44x44px (DL-14), piso tipográfico >= 12px (`text-xs`), borda 1px sem dead space lateral e erradicação de AI-smell.
- **Segurança, RLS & Governança Zero-Trust**: RLS Deny-by-Default nas 604 tabelas do banco de dados (sanando as 12 tabelas pendentes), proteção de 126 funções `SECURITY DEFINER` com `SET search_path = public` contra CWE-426, barreira `ActionAuthGuardModal` com `returnUrl` exato em 19 rotas públicas transacionais, governança tripla de mídia (Upload + URL + Ctrl+V) e proteção defensiva de imagens com `onError` neutral SVG fallback.
- **BFF Server Functions & Invariante B.25**: 100% de parâmetros tipados Zod consumidos ou protegidos com coalescência defensiva nos 156 endpoints identificados, eliminando desestruturações parciais ou fallbacks arbitrários.
- **Matriz de 4 Estados**: Cobertura integral dos 4 estados (dados, carregamento/skeleton, vazio/empty state honesto e erro) nas 88 rotas pendentes.

---

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Git Forensics & Remote Branches Merge | Unificar branches `origin/feat/...` e `origin/perf/...` com a `main` atualizada | M1 | Survey 1 (Explorer 1) |
| 2 | Resolution of 5 Conflict Files | Resolver conflitos em `identity.server.ts`, `builder.functions.ts`, baseline, report e `DECISIONS.md` | M1 | Survey 1 (Explorer 1) |
| 3 | Reconcile 10 Overlapping Files | Sintetizar alterações complementares em `app-shell.tsx`, `_store.conta.perfil.tsx`, `_store.eventos.tsx`, `_store.marketplace.index.tsx` | M1 | Survey 1 (Explorer 1) |
| 4 | Mobile Nav Bar Ergonomics & Safe Area | Refatorar `mobile-nav.tsx` com `text-xs font-semibold`, `:focus-visible:ring-2` e classes safe-area | M2 | Survey 2 (Explorer 2) |
| 5 | Native Mobile Header Canonical Height (B.26) | Refatorar `native-mobile-header.tsx` para altura `h-11`, input `h-11`, close `size-11` e `:focus-visible` | M2 | Survey 2 (Explorer 2) |
| 6 | Double Header Eradication & Inpage Pairing | Sanear lista em `app-shell.tsx` eliminando cabeçalhos duplicados e parear títulos inpage no desktop | M2 | Survey 2 (Explorer 2) |
| 7 | Bottom Sheets Conversion & Dead Filter Fix | Converter diálogos para `<Sheet side="bottom">` no mobile e conectar filtro inerte em `_store.buscar.tsx` | M2 | Survey 2 (Explorer 2) |
| 8 | Typographic Floor (>=12px) & Dead Space Purge | Sanear microfonts `text-[8px]..[11px]` e remover margem lateral aninhada dupla em rotas mobile | M2 | Survey 2 (Explorer 2) |
| 9 | Supabase RLS Deny-by-Default Enablement | Criar migration habilitando RLS e políticas nas 12 tabelas omitidas (turismo, viagens, canônicas) | M3 | Survey 3 (Explorer 3) |
| 10 | SECURITY DEFINER search_path Hardening | Criar migration com `SET search_path = public` para as 126 funções (50 críticas financeiras/estoque) | M3 | Survey 3 (Explorer 3) |
| 11 | Public Routes ActionAuthGuardModal Wiring | Plugar `ActionAuthGuardModal` com `returnUrl` exato nas 19 rotas públicas transacionais | M3 | Survey 3 (Explorer 3) |
| 12 | Storage Triple Governance & onError Fallback | Implementar Upload + URL + Paste nos 6 uploaders e fallback defensivo `onError` em imagens | M3 | Survey 3 (Explorer 3) |
| 13 | BFF Parameter Parity (Invariant B.25) | Saneamento dos 156 endpoints BFF com parâmetros não consumidos ou descartados | M4 | Survey 3 (Explorer 3) |
| 14 | 4-State UI Matrix Completeness | Implementar estados de Loading/Skeleton e Empty State honesto nas 88 rotas identificadas | M4 | Survey 3 (Explorer 3) |
| 15 | Quality Gate Final, Tests & Victory Audit | Executar typecheck, build, design-lint ratchet, vitest e prova forense final | M5 | Survey 1, 2, 3 |

---

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | M1: Reconciliação Forense e Unificação de Branches Remotas | Features 1, 2, 3: Reconciliar origin/feat e origin/perf com main, resolver 5 arquivos de conflito e 10 sobreposições sem regressão | none | DONE |
| 2 | M2: Nativização Mobile e Ergonomia de App HIG | Features 4, 5, 6, 7, 8: mobile-nav.tsx, native-mobile-header.tsx, app-shell double header, bottom sheets, filtro /buscar, piso tipográfico >= 12px | M1 | PLANNED |
| 3 | M3: Auditoria de Segurança, RLS, Rotas Públicas e Proteção de Dados | Features 9, 10, 11, 12: Migration RLS 12 tabelas, search_path 126 RPCs, ActionAuthGuardModal em 19 rotas, governança de storage e onError | M1 | PLANNED |
| 4 | M4: Saneamento Arquitetural BFF e Matriz de 4 Estados | Features 13, 14: Invariante B.25 em 156 endpoints BFF, preenchimento da matriz de 4 estados em 88 rotas | M2, M3 | PLANNED |
| 5 | M5: Verificação Final, Quality Gate e Victory Audit | Feature 15: Execução de testes vitest, typecheck, build, design-lint ratchet e auditoria de integridade | M1, M2, M3, M4 | PLANNED |

---

## Interface Contracts
### Auth & Identity Server Contract (`src/lib/identity.server.ts`)
- Zero-Trust Civil Root Isolation:
  ```ts
  if (activeContext === "civil") {
    activeStoreId = null;
  }
  ```
- Strict Membership Check:
  Membros são vinculados exclusivamente pela tabela `workspace_members`. Nunca inferir ownership por email/settings nem criar fallback arbitrário para primeira loja (`.limit(1)`).

### Builder Experience Contract (`src/services/builder.functions.ts`)
- Strict Tenant Barrier:
  Lançar erro imediato se nenhum tenant de loja for resolvido para operações do builder.
- Modern Omni-Builder Documents:
  ```ts
  const omniDoc = (doc.settings as any)?.omni_page;
  if (omniDoc?.blocks && Array.isArray(omniDoc.blocks) && omniDoc.blocks.length > 0) {
    return { status: "ok" as const, data: { document: doc as ExperienceDocument, tree: [] } };
  }
  ```

### Header Control Contract (Invariant B.26)
- Altura canônica compartilhada de 44px (`h-11 min-h-11`).
- Alvos de toque de 44x44px (`size-11`) e anéis de foco `:focus-visible:ring-2 focus-visible:ring-primary`.

### Action Auth Guard Modal Contract
- Props: `isOpen: boolean`, `onOpenChange: (open: boolean) => void`, `title: string`, `description?: string`, `actionContext?: string`, `returnUrl: string`.
- Preserva query string e path completo do usuário para retorno transparente após autenticação.

---

## Code Layout
- `src/lib/`: Utilitários puros, formatadores e `identity.server.ts`.
- `src/services/`: Server Functions BFF (`builder.functions.ts`, `addresses.functions.ts`, etc.).
- `src/components/shell/`: `mobile-nav.tsx`, `app-shell.tsx`, `top-bar.tsx`.
- `src/components/navigation/`: `native-mobile-header.tsx`.
- `src/components/common/`: `action-auth-guard-modal.tsx`, `share-modal.tsx`.
- `src/routes/`: 418 rotas TanStack Router (`_store.*`, `workspace.*`, `admin-master.*`).
- `supabase/migrations/`: Migrações SQL e definições de RLS e RPCs.
- `docs/design/DECISIONS.md`: Registro cronológico unificado de decisões arquiteturais.
