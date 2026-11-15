# WAESY FULL E2E AUDIT & REMEDIATION LEDGER — 2026-11-14

## 0. Preflight & Scope
- **Active Branch:** `release/prod-20261113-fullpage-chat-copilot`
- **Baseline HEAD SHA:** `5cc1a511e03b98c22e5e99bf7c9581136a17ca4a`
- **Production Base (`main` / `origin/main`):** `c953684d` (GitHub branch protection `GH006` requires PR + passing CI gates)
- **Supabase Migration Parity (`jfuebqmltksyznovhlwa`):** `remoteCount: 618, localCount: 618, pendingCount: 0`
- **Governing Mandate:** `AGENTS.md`, `skills/waesy-integrity-auditor/SKILL.md`, `docs/audits/WAESY_HOLISTIC_REMEDIATION_MASTERPLAN_2026-10-06.md`, `docs/specs/SPEC-20261114-*.md`, `docs/audits/LEDGER-20261113-*.md`.

## 1. Baseline Gate Verification (`5cc1a511`, pre-mutation)
| Gate / Check | Baseline Exit | Observed Evidence | Root Cause Classification |
| :--- | :---: | :--- | :--- |
| `audit:secrets` | 0 | 6613 files, 0 findings | Clean |
| `audit:dependencies` | 0 | Passed | Clean |
| `check:release-ledger` | 0 | 18 phases | Clean |
| `check:schema` | 0 | 618 migrations, 825 tables, 276 functions | Clean |
| `check:migration-inventory` | 0 | 618 SQL files | Clean |
| `check:bff` | 0 | 839 tables declared, 681 BFF refs, 0 missing | Clean |
| `check:tokens` | 0 | 173 tokens, 0 missing | Clean |
| `audit:buttons` | 0 | 1360 files, 9431 controls, P0/P1/P2: 0 | Clean |
| `check:cycles` | 0 | 2817 files, 0 cycles | Clean |
| `typecheck` (`tsc --noEmit`) | **2** | ~135 lines TS errors across ~20 files (`steps/202/output.txt`) | Unverified commit `3f014ca5` + incomplete DTO/BFF/UI contracts |
| `npm run build` | **1** | Vite/Rolldown `[UNLOADABLE_DEPENDENCY] Could not load src/contexts/AgencyContext` (`PreBoardingPresentationStudio.tsx:14`) | Phantom context import in unbuilt studio component |
| `npm run lint` (`eslint .`) | **1** | 15 errors, 14226 warnings (`steps/239/output.txt`) | `no-constant-condition`, `no-constant-binary-expression`, `prefer-rest-params`, `no-control-regex` |
| `vitest run` | **1** | 17 failed test files / 26 failed tests of 535 files / 3692 tests (`steps/244/output.txt`) | Real BFF/storage/ecommerce/route/studio regressions & test-contract drift |
| `lint:design` | **1** | 31 violations (26 DL-03, 3 DL-18, 2 DL-25) vs baseline `0` | Non-4px spacing, `bg-white`, duplicate `variant="default"` in 3 studio/dossier files |
| `dead-code-detector.mjs --ci` | **1** | 6 orphan files flagged | 4 dead/unwired UI files (`SmartPhoneText.tsx` unwired; `theme-selector`, `beta-explanation-modal`, `theme-toggle`) + 2 `vite.config.ts` `new URL(...)` SSR shims |
| `check:types-ssot` | **1** | `WorkspaceViewMode` duplicated in `universal-view-manager.tsx` & `workspace-view-preferences.functions.ts` | Duplicate exported type instead of canonical SSOT import |

## 2. False-Positive & Discrepancy Register (Planned/Claimed vs Actual)
| ID | Claimed Source | Observed Reality on `5cc1a511` | Wave | Verification Criteria |
| :--- | :--- | :--- | :---: | :--- |
| **AUD-01** | `DEC-502` / `WAESY_E2E_REFACTOR_LEDGER_2026-11-14.md` claimed build & design-lint zero | `build` fails (`@/contexts/AgencyContext`), `typecheck` fails in 20 files, `lint:design` has 31 violations in `UniversalDocumentStudio.tsx`, `PreBoardingPresentationStudio.tsx`, `TourismPipeCardDossier.tsx` (`handleOpenUniversalDocStudio` undefined!), `document-studio-catalog.ts` uses wrong DTO properties | A / C | `typecheck`, `build`, `lint:design`, unit/render test |
| **AUD-02** | `_store.cadastro.tsx` (`m3-auth-contract`) | Renders `<GoogleLogo>` without importing it from `@phosphor-icons/react` (runtime crash!) | A | `tsc` + component render test |
| **AUD-03** | Copilot Workspace & Drawer (`SPEC-20261114-COPILOT-CHATGPT-MANUS-E2E-REFACTOR`) | `open_artifact` missing from `AIChatAction["action_type"]`, `waesy-copilot-drawer` passes stale `refreshCart`/`notifySuccess` instead of `DispatchCopilotActionOptions`, `ChatThreadItem` missing `created_at`, `onCreateProject` / `onAssignThreadHierarchy` prop signature mismatches | A / B | `tsc` + copilot tests + isolation verification |
| **AUD-04** | Omnichannel / CRM / WhatsApp (`a2b90ae9`, `LEDGER-20261113-E2E-SYNC`) | `CustomerSearchCombobox` casts array as `{ customers }`; `whatsapp-groups.functions.ts` calls `.catch()` on Supabase `PostgrestFilterBuilder`; `crm.functions.ts` omits attribution fields on no-op stage return; `customer-360-sidebar` passes `status`; `whatsapp-provider-webhook` passes raw `JsonObject`; `SmartPhoneText` unwired; `whatsapp-fase2-homologation` phone mismatch | A / B / C | `tsc` + regression tests |
| **AUD-05** | Storage & Runtime Security (`integrity-wave-20261007`, `storage.functions.test.ts`) | `storage.functions.ts` still contains `storage.createBucket` and lacks `validateMimeType`, 3600s signed URL, `extensionForMime` | B | Negative + positive unit tests |
| **AUD-06** | Commerce / ERP / GDS / Automotive (`chat-commerce`, `ifood-reconciliation`, `travel-gds-workbench`, `omnichannel-e2e-sync`) | `chat-commerce` `.filter` crash & cart totals wrong; `ifood-reconciliation` `.in(...).order` query chain & `AUTOMATICALLY_LINKED`; `travel-gds-workbench` `"first"` & `rules` missing; `omnichannel-e2e-sync` vehicle template mismatch | A / B | Reproducing tests + negative checks |
| **AUD-07** | Route & Feature Integrity (`workspace-navigation-pillars`, `route-inventory`, `pages-resolution-resilience`, `travel-proposal-security-and-e2e`) | Orphaned workspace routes vs navigation pillars; missing `omni_page_draft` on `_store.paginas.$slug`; missing `ProposalsSheetTable` on proposals route; ESLint constant-condition/rest-params/control-regex bugs | B / C | Route audit + Vitest + ESLint |
- **AUD-08** | Kanban & View-Mode SSOT + `dead-code-detector` | `NicheKanbanPreset` / `KanbanNicheStageSpec` property mismatch; duplicated `WorkspaceViewMode`; 4 unused/unwired files + `vite.config.ts` `new URL(...)` shims | A / C | `check:types-ssot` + `dead-code-detector --ci` + Kanban modal check |
| **AUD-09** | BFF Auth / Schema / Anti-Fake & Live Postgres Views | `support-tickets.functions.ts` (`guest_phone`); `geomarketing-cortex` synthetic pricing/rating & swallowed `saveViabilityCanvasAndSwot`; `company-delivery` & `travel-pre-boarding-and-commissions` fake `catch { success: true }` + hardcoded dates; `directory.functions.ts` missing `stores` cols; `ads.functions.ts` unchecked error; 4 live `security_definer_view` ERRORs | C / DB | Vitest (`wave-c3-bff-integrity`, `geomarketing-and-support-schema`) + Supabase `get_advisors` (`0` ERRORs) |

## 3. Execution Log
- **2026-11-14 Baseline Preflight (`5cc1a511`):** Ledger aberto antes das mutações Wave A.
- **Wave A & B1 (Concluído):** Remediados imports fantasmas (`AgencyContext`), erros de ESLint (`no-constant-condition`, `prefer-rest-params`, `no-control-regex`), violações de `lint:design` e incompatibilidades de assinatura Copilot/Document Studio/Storage/iFood/Gastronomy/Route Inventory (`Group A & Group B`: 17 suítes / 137 testes aprovados na verificação parcial anterior).
- **Wave C.1 (Concluído):** `dead-code-detector.mjs` atualizado para `vite.config.ts`; 3 arquivos mortos removidos (`beta-explanation-modal.tsx`, `theme-selector.tsx`, `theme-toggle.tsx`); `<SmartPhoneText>` e fluxo real `"Nova Conversa"` (`startStaffWhatsAppThread`) integrados em `AtendimentoChatWorkspace.tsx`; conflito `admin-master-isolation.test.ts` x `workspace-navigation-pillars.test.ts` reconciliado para rota read-only `/workspace/configuracoes/planos`.
- **Wave C.2 & C.3 (Concluído):** `support-tickets.functions.ts`, `geomarketing-cortex.functions.ts`, `workspace.viabilidade.tsx`, `company-delivery.functions.ts`, `travel-pre-boarding-and-commissions.functions.ts`, `PreBoardingPresentationStudio.tsx`, `UniversalCrmSpreadsheetImporterModal.tsx`, `directory.functions.ts`, `ads.functions.ts` e `travel-wooba-connector.service.ts` saneados; testes dedicados em `wave-c3-bff-integrity.test.ts`, `geomarketing-and-support-schema.test.ts` e `smart-phone-text.test.tsx`.
- **Banco Remoto Supabase (`jfuebqmltksyznovhlwa`, Concluído):** Migration `supabase/migrations/20270419000000_fix_indexed_views_security_invoker.sql` aplicada via `apply_migration`; `reloptions` confirmadas como `["security_invoker=true"]` nas 4 views (`indexed_businesses`: 554, `indexed_events`: 37, `indexed_jobs`: 10, `indexed_products`: 1); `get_advisors` (`security`) confirmado com `{ WARN: 4 }`, **0 `ERROR`**.
- **Wave D (Executado pós-edição final — `DEC-499`):**
  - `vite.config.ts` + `src/lib/server-client-noop-shim.ts`: roteamento SSR no-op para 12 modais/drawers/studios exclusivos de navegador; `SmartPhoneText.test.tsx` renomeado para `smart-phone-text.test.tsx`.
  - `npm run build` (**Exit 0**): `dist/_worker.js/index.js` = `24.935 MiB` (`26,146,759` bytes, `6.109 MiB` gzip, `< 25.00 MB` limit); `check:route-budget` **APROVADO**.
  - `npm run typecheck` (**Exit 0**): **0** erros TypeScript (`tsc --noEmit`).
  - `npm test` (`vitest run`, **Exit 0**): **538 / 538** arquivos (`3704 / 3704` testes) aprovados, incluindo `wave-c3-bff-integrity.test.ts`, `geomarketing-and-support-schema.test.ts` e `smart-phone-text.test.tsx`.
  - `npm run lint` (**Exit 0**): **0 erros** (`eslint .`, 14273 warnings pré-existentes); `lint:design` & `design-lint.mjs --ratchet` (**0** violações P0–P3 em 2288 arquivos, contraste WCAG AA aprovado); `lint:design:test` (**61/61**); `audit:buttons` (**P0:0|P1:0|P2:0**) & `audit:buttons:test` (**19/19**); `check:naming`, `check:schema` (`619` migrations / `825` tabelas / `276` funções), `check:migration-inventory` (`619`), `check:bff` (`839` declaradas / `681` refs / `0` faltantes), `check:tokens` (`173` tokens / `0` faltantes), `check:types-ssot` (`2817` arquivos / `0` duplicações), `check:cycles` (`0` ciclos), `dead-code-detector.mjs --ci` (`0` órfãos / `0` duplicatas exatas), `check:release-ledger`, `audit:secrets`, `audit:dependencies`, `check:duplication:warn` (**APROVADO**), `check:size:warn`: todos **Exit 0**.
