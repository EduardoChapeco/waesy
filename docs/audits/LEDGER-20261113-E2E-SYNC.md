# Ledger de Evidencias — Sincronizacao E2E Multi-Nicho & Contratos Tabulados

## Snapshot e escopo

- Data/hora (ISO, fuso): `2026-11-13T13:17:00-03:00`
- Repositorio: `EduardoChapeco/waesy`
- Branch/HEAD: `release/prod-20261113-fullpage-chat-copilot` @ `44fd7076c5010c6b0a15064170493ff64fcbbb1a`
- Base remota comparada: `HEAD` local com worktree preexistente (SSOT nichos wave + copilot) integralmente preservado
- PR(s) e estado/checks: Execucao local pre-PR no repositorio Waesy
- Worktree inicial e paths preexistentes preservados: Todos os arquivos modificados/nao rastreados preexistentes (`niche-ssot.ts`, `crm.functions.ts`, `builder.functions.ts`, `company-mvp.functions.ts`, `DECISIONS.md`, etc.) mantidos intactos; edicoes apenas cirurgicas via `edit_file`
- Ambiente e versoes: Windows, PowerShell, Node (`vitest@4.1.10`, `tsc@5.8.3`, `vite@8.0.16`, `react-markdown@10.1.0`)
- Escopo explicitamente incluido/excluido:
  - Incluido: Ingestao omnichannel (`leads_crm` + `customers_crm`), ponte de campos dinamicos multi-nicho, catalogo CMS -> Propostas/Orcamentos, adaptacao de Kanban comercial por nicho, compilador unificado de contratos tabulados GFM + template/secoes customizaveis, correcao de `/workspace/orcamentos/$id`, renderizacao de tabelas GFM em todos os visualizadores e migration SQL aditiva `20270405000000`.
  - Excluido: Push remoto de migrations/deploy sem autorizacao humana explicita; reescrita integral de rotas ou arquivos existentes.

## Preflight de leitura por microfase

| Onda.microfase | AGENTS/skill/plano lidos | Paths de implementacao lidos (UI/rota, BFF, DTO, SQL, teste) | Hash/commit inicial | Acao autorizada | Leitura concluida antes de mutar? |
|---|---|---|---|---|---|
| W0.0 | `AGENTS.md`, `waesy-integrity-auditor`, `MASTERPLAN`, `SPEC-20261113-FORENSIC-NICHE-SSOT` | `niche-ssot.ts`, `builder.functions.ts`, `lead-forms.functions.ts`, `deals.functions.ts`, `company-mvp.functions.ts`, `tourism.functions.ts`, `crm.functions.ts`, `travel-proposal.functions.ts`, `quotes.functions.ts`, `commercial-invoices.functions.ts`, `travel-contract.functions.ts`, `contracts.functions.ts`, `unified-proposal-workspace.tsx`, rotas `workspace.*` e `_store.*`, migrations `0047`..`20270404000000`, testes de contratos | `44fd7076` | Registrar spec e ledger + rodar testes baseline | Sim |

## Finding e estado de prova

| ID | Severidade | Estado | Path(s)/linha(s) | Reproducao antes | Causa-raiz | Correcao/path(s) | Prova depois | Revisao adversarial |
|---|---|---|---|---|---|---|---|---|
| F-E2E-01 | P0 | validado (local) | `src/services/builder.functions.ts:4268-4345` | Insert usa `name`/`metadata`/`email:null` em `leads_crm` e falha em catch | Drift de schema vs `0047`/`20260904130000` | `omnichannel-lead-ingestion.ts` + `builder.functions.ts` | `omnichannel-e2e-sync.test.ts` PASS (10/10) + `npm.cmd run build` PASS (exit 0) | Payload opcional/nulo normalizado para schema `leads_crm` + `customers_crm` |
| F-E2E-02 | P0 | validado (local) | `src/services/lead-forms.functions.ts:325-436, 1088-1128` | Novo envio em `/f/$slug` ou civil nao insere card em `leads_crm` e perde `raw_answers` | Fluxo apenas fazia `.update` condicional | `omnichannel-lead-ingestion.ts` + `lead-forms.functions.ts` | `omnichannel-e2e-sync.test.ts` PASS (10/10) | Insercao idempotente + preservacao integral de `custom_fields` |
| F-E2E-03 | P0 | validado (local) | `src/services/tourism.functions.ts:228-390, 658-751` | `requestTravelQuote` / `bookTourismExperience` nao criam lead em `leads_crm` | Gravacao isolada em `travel_quotes`/`tourism_inquiries` | `omnichannel-lead-ingestion.ts` + `tourism.functions.ts` | `omnichannel-e2e-sync.test.ts` + `travel-pipeline-e2e.test.ts` PASS (12/12) | Espelhamento CRM preserva origem e respostas dinamicas |
| F-E2E-04 | P0 | validado (local) | `deals.functions.ts`, `company-mvp.functions.ts`, `use-classified-detail.ts`, `_store.produto.$slug.tsx`, `workspace.comercial.tsx` | Silo de `deals`, `terms` em texto corrido e `?dealId=` ignorado | Falta de ponte deals/vitrine -> `leads_crm` | Estruturar `customAnswers` + espelhar `leads_crm` + tratar `?dealId=` | `company-mvp.test.ts` PASS (8/8) + `tsc` 0 erros no escopo | Rastreamento `?dealId=`/`?leadId=` bifurca por nicho sem vazamento |
| F-E2E-05 | P0 | validado (local) | `unified-proposal-workspace.tsx`, `workspace.turismo.index.tsx`, `workspace.comercial.tsx`, `travel-proposal.functions.ts` | Catalogo estatico; Kanban perde `custom_fields`/`sourceListingId` | Sem endpoint CMS -> Studio nem ponte de contexto | `listStoreCatalogItemsForProposal` + `unified-field-bridge.ts` | `omnichannel-e2e-sync.test.ts` + `tsc` 0 erros no escopo + `build` PASS | Catalogo real `products`+`classifieds` e `destination_city` sem colisao com `title` |
| F-E2E-06 | P0 | validado (local) | `src/routes/workspace.orcamentos.$id.tsx:10,97-105` | Chama RPC de turismo para orcamento multi-nicho | Conflito de engine contratual | `compileContractFromQuote` + Studio Dialog + `QuoteItemDTO` alinhado | `omnichannel-e2e-sync.test.ts` + `tsc` 0 erros + `design-lint --ratchet` PASS | Customizador por template e toggles de secao sem regressao P0/P1 |
| F-E2E-07 | P0 | validado local (migration nao aplicada no remoto) | `20270115000002`, `crm.functions.ts`, `contracts.functions.ts`, `travel-contract.functions.ts` | Contratos sem tabelas GFM, sem template customizado nem variaveis `custom.*` | Geracao por strings estaticas / bullets | `contract-compiler.ts` + `contract-compiler.functions.ts` + `commercial-invoices.functions.ts` + `20270405000000` | `contract-compiler.test.ts` (7/7), `commercial-invoices.test.ts` (5/5), `contracts-order-security.test.ts` (3/3), `travel-contract-public-access.test.ts` (7/7) PASS | RPC `create_staff_travel_contract_from_proposal` alinhada as colunas reais de `quote_items`; testes de seguranca P0 mantidos |
| F-E2E-08 | P0 | validado (local) | `workspace.contratos.novo.tsx`, `$id.editor.tsx`, `assinar.$token.tsx`, `_store.contrato.$token.tsx` | `ReactMarkdown` sem GFM exibe `\| col \|` literal | Ausencia de parser GFM + container de tabela | `<ContractMarkdownRenderer />` + `<table>` de passageiros | `build` PASS + `design-lint --ratchet` PASS (746 vs 747) + `contrast-audit.mjs` PASS | Wrapper `.scroll-area` conforme DL-30 e safe rendering sem HTML cru |
| F-E2E-09 | P1 | validado (local) | `niche-ssot.ts`, `contract-semantic-dictionary.ts` | Campos dinamicos desconexos por vertical | Sem ponte semantica unica | `unified-field-bridge.ts` + 45 variaveis compostas em `contract-compiler.ts` | `contract-compiler.test.ts` (7/7) + `omnichannel-e2e-sync.test.ts` (10/10) PASS | Zero placeholders `{{...}}` nao resolvidos e suporte multi-nicho uniforme |

## Gates e resultados

| Comando/ambiente | SHA exato | Resultado/exit code | Evidencia/log | O que NAO prova |
|---|---|---|---|---|
| `vitest run travel-contract-public-access commercial-invoices company-mvp` (baseline) | `44fd7076` | PASS (3 files, 20 tests, exit 0) | Executado em `2026-11-13T13:15` | Cobertura das novas integracoes E2E |
| `node scripts/check-bff-table-contracts.mjs` (baseline) | `44fd7076` | PASS (exit 0, 0 missing tables) | 606 migrations, 829 tables | Estado remoto do banco |
| `node scripts/audit/validate-migration-inventory.mjs` (baseline) | `44fd7076` | PASS (exit 0, 606 migrations) | Nomes e versoes unicos | Aplicacao em producao |
| `tsc --noEmit --incremental false --project tsconfig.json` (pos-ultima edicao de codigo) | `44fd7076` + worktree | Exit 1 (`task-891`): **0 erros nos arquivos modificados/criados nesta entrega** | Somente 3 erros preexistentes fora de escopo (`admin-master.lojas.tsx:74`, `workspace.configuracoes.planos.tsx:342,412`) | Nao substitui runtime com Supabase remoto |
| `npm.cmd run build` (pos-ultima edicao de codigo) | `44fd7076` + worktree | PASS (`task-897`, exit 0) | `build-extensions-bundle`, `vite build`, `check-client-server-leak`, `wrap-worker` (`dist/_worker.js/index.js` + `dist/_routes.json`) | Nao executa testes funcionais ou banco remoto |
| `vitest run` suite completa E2E + seguranca (7 arquivos, pos-ultima edicao de codigo) | `44fd7076` + worktree | PASS (`task-902`, 7/7 files, 52/52 tests, exit 0) | `contract-compiler` (7), `omnichannel-e2e-sync` (10), `travel-contract-public-access` (7), `contracts-order-security` (3), `commercial-invoices` (5), `travel-pipeline-e2e` (12), `company-mvp` (8) | Suites unitarias/integracao com mocks onde aplicavel; nao substitui push SQL em producao |
| `node scripts/design-lint.mjs --ratchet` (pos-ultima edicao de codigo) | `44fd7076` + worktree | PASS (`task-903`, exit 0) | `2728` arquivos; `0` P0; `746` total vs baseline `747` (-1 violacao) | UI nao inspecionada visualmente em navegador vivo apos ultimo build |
| `node scripts/contrast-audit.mjs` (pos-ultima edicao de codigo) | `44fd7076` + worktree | PASS (`task-903`, exit 0) | Todos os pares `light` e `dark` aprovados (WCAG DL-16/17) | Contraste apenas dos tokens CSS canonicos |
| Gates estruturais e inventario SQL (pos-ultima edicao de codigo) | `44fd7076` + worktree | PASS (`task-908`: BFF/Deps/Schema/Inventory exit 0) | BFF contracts: 607 migrations / 829 tabelas / 0 faltantes; Cycles: 0; Schema: 607 migrations; Inventory SHA256 `764140...`; Type dup: apenas 3 preexistentes (`WorkspaceViewMode`, `SalaryBreakdownItem`, `TravelerDocumentType`) | Migration `20270405000000_e2e_multiniche_sync_tabular_contracts.sql` permanece local aguardando confirmacao humana antes de push remoto |

---

## Wave 5 — Refatoracao Estrutural & Purga Completa de Legados (Preflight)

- **Branch:** `release/prod-20261113-fullpage-chat-copilot`
- **Base / HEAD SHA:** `44fd7076c5010c6b0a15064170493ff64fcbbb1a`
- **Worktree no preflight W5:** 131 caminhos modificados/novos preexistentes (W1-W4 + frentes anteriores preservadas)
- **Spec normativa:** [SPEC-20261113-LEGACY-PURGE-E2E-UNIFICATION.md](file:///c:/Users/Excelência%20Tour%20SMO/Documents/waesy/docs/specs/SPEC-20261113-LEGACY-PURGE-E2E-UNIFICATION.md)
- **Escopo exato W5:** `supabase/migrations/20270406000000_legacy_purge_quotes_and_tabular_travel_contracts.sql`, `src/lib/niches/unified-field-bridge.ts`, `src/services/travel-contract.functions.ts`, `src/services/crm.functions.ts`, `src/services/contracts.functions.ts`, `src/services/quotes.functions.ts`, `src/services/commercial-invoices.functions.ts`, `src/components/tourism/contract/new-travel-contract-sheet.tsx`, `src/components/tourism/studio/studio-sidebar-editor.tsx`, `src/components/tourism/studio/proposal-canvas-renderer.tsx`, `src/components/commerce/dynamic-sections/office-contract-viewer.tsx`, `src/components/office/contract-editor-sheet.tsx`, `src/components/office/contract-clause-library.tsx`, `src/routes/workspace.orcamentos.novo.tsx`, `src/routes/workspace.orcamentos.$id.tsx`, `src/routes/_store.fatura.$token.tsx`, `src/routes/workspace.contratos.novo.tsx`, `src/routes/workspace.turismo.cotacoes.tsx`, `src/components/tourism/CarRentalOfferCard.tsx`, `src/components/workspace/view-modes/*`, `src/lib/payroll-calculator.ts`, `src/types/travel-dossier.ts`, testes de regressao (`src/lib/contracts/contract-compiler.test.ts`, `src/services/omnichannel-e2e-sync.test.ts`, `src/services/travel-contract-public-access.test.ts`).

| Finding | Reproducao Baseline | Evidencia Verificada Antes da Mutacao |
|---|---|---|
| **L1** | `travel-contract.functions.ts:325-339, 537-600, 788-819`, `NewTravelContractSheet` | Invoca `create_staff_travel_contract` SQL sem tabelas GFM e sem `signature_envelopes`; `listAgencyTravelContracts` filtra `.eq("category", "tourism")`; retorno morto `return null` |
| **L2** | `crm.functions.ts:391-465, 2868-2958`, `contracts.functions.ts:912-960` | `createContractFromLead` insere em `travel_contracts` e omite `signature_envelopes`; `getCustomer360` nao retorna `quotes`; `getContractById` faz fallback texto plano |
| **L3** | `workspace.orcamentos.novo.tsx`, `workspace.orcamentos.$id.tsx`, `quotes.functions.ts` | Sem `?leadId=`/`?dealId=`, sem `listStoreCatalogItemsForProposal`, `create_quote` sem `lead_id`/`source_listing_id`/`niche_id`/`custom_fields`, `requestPublicQuote` fora de `ingestOmnichannelLead`, nav errada de `travel_proposals` para `/workspace/orcamentos/$id` |
| **L4** | `src/routes/_store.fatura.$token.tsx:223-233` | Botao publico "Ver Contrato" aponta para `/workspace/contratos/$id/editor` (privado) |
| **L5** | `workspace.contratos.novo.tsx`, `office-contract-viewer.tsx`, `contract-editor-sheet.tsx`, `contract-clause-library.tsx` | Templates em bullets, sem importador de origem unificado, `whitespace-pre-wrap` sem GFM, `replaceContractVariables` limitado a 5 chaves |
| **L6** | `workspace.turismo.cotacoes.tsx:222-227`, `unified-field-bridge.ts:478-484`, `studio-sidebar-editor.tsx` | `base_price_per_person`/`total_price` ignorados por DTO (`_cents`); `extractNormalizedCatalogContext` nao le `attributes.travel`; Studio sem aba/bloco de `custom_fields` |
| **L7** | `check-type-duplications.mjs`, `CarRentalOfferCard.tsx` | 3 tipos duplicados (`WorkspaceViewMode`, `SalaryBreakdownItem`, `TravelerDocumentType`); arrays `_LEGACY_*_UNUSED` |

