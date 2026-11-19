# ONDA 0 — Snapshot Baseline, Desarmamento de Falsos Verdes, Mapa `tsc`, Donos Únicos & DAG (`W1`–`W7`)

## 1. Preflight & Estado do Repositório (Zero Exclusões Executadas na W0)

- Data/hora: `2026-11-16T21:52:00-03:00`
- Branch: `release/prod-20261113-fullpage-chat-copilot`
- Commit `HEAD`: `c0e1d351` (`chore(lint): update design-lint report and dashboard after vertical landings wave (DEC-508)`)
- Base remota comparada (`origin/main`): `c953684d023d1f8c55e7c8c8d1e559a0c02263b5`
- Worktree preservado: `280` paths preexistentes alterados/não rastreados mantidos intactos (sem `git add -A`, sem exclusões nesta onda).
- Ferramentas desarmadas e corrigidas em W0:
  - `scripts/audit/forensic-repo-audit.mjs` + `scripts/audit/forensic-repo-audit.test.mjs` (`4/4` PASS)
  - `scripts/audit/run-checks.mjs`, `scripts/audit/audit-all.mjs`, `scripts/audit/generate-baseline.mjs` (removidas constantes falsas `C26=8`, `C41=12`, `C42=0`, `C43=0`, strings históricas de `2026-10-01`/`38.378`/`0 tsc errors`, e separados checks realmente avaliados de `NAO AVALIADO`)
  - `scripts/check-duplication.mjs` (corrigido para checar declarações reais `const`/`function`/`export` em vez de falsos positivos em `import`, adicionada watchlist real `W01`–`W04`)
  - `scripts/audit-silent-subactions-and-dead-code.mjs` (corrigida regex `\Z` inválida em JS + busca recursiva)
  - `scripts/bigtech-scale-budget-s05.mjs` (corrigido tamanho recursivo do diretório `dist/_worker.js`)
  - `scripts/audit-system-completion.mjs:41` (corrigida checagem POSIX de `src/routes/api.`)
  - `src/components/tourism/index.ts:2` (corrigido re-export quebrado `NewGroupTourSheet` -> `NewGroupTourWizard`)

---

## 2. Mapa Completo de Erros Reais `tsc --noEmit` (`.audit/tsc-baseline.txt` — `20` erros em `12` arquivos)

| # | Arquivo & Linha | Código | Erro Exato | Causa-Raiz | Onda Alvo |
|---:|---|---|---|---|---|
| 1 | `src/components/branded-app/branded-app-workspace-editor.tsx:545` | `TS2345` | `Property 'product_ids' is missing in '{ id, name, slug }' vs BrandedAppCollectionDTO` | Projecão em query/editor omite `product_ids` | W3.3 |
| 2 | `src/components/chat/ChatQuickComposerModals.tsx:1002` | `TS2322` | `'"normal"'` não atribuível a `"low" \| "high" \| "urgent" \| "medium"` | Enum de prioridade diverge do contrato BFF | W3.4 |
| 3 | `src/components/chat/ChatQuickComposerModals.tsx:1755` | `TS2322` | Union com propriedades opcionais `undefined` incompatível com `Record<string, number>` | Objeto de contagem tipado de forma esparsa | W3.4 |
| 4 | `src/routes/viajante.viagem.$id.tsx:1660` | `TS2367` | Comparação sem sobreposição entre `'pending' \| 'overdue' \| 'waived'` e `'in_verification'` | Status retornado por DTO diverge do status exibido | W3.2 |
| 5–6 | `src/routes/workspace.turismo.cotacoes.tsx:149-150` | `TS2339` | `Property 'protocol_number' does not exist on type 'TravelQuoteRequestDTO'` | DTO não declara `protocol_number` | W3.2 |
| 7–8 | `src/routes/workspace.turismo.cotacoes.tsx:1576` (2x) | `TS2339` | `Property 'customerRoomsSummary' does not exist on type 'RadarMatchLeadPreview'` | Campo ausente no tipo `RadarMatchLeadPreview` | W3.2 |
| 9 | `src/routes/workspace.turismo.oportunidades.tsx:258` | `TS2322` | `'"new"'` não atribuível a `"reviewed" \| "approached" \| "promoted_to_crm" \| "dismissed" \| "engaged"` | Filtro/status usa `"new"` fora da máquina canônica | W3.4 |
| 10 | `src/routes/workspace.turismo.oportunidades.tsx:2095` | `TS2339` | `Property 'customerRoomsSummary' does not exist on type 'RadarMatchLeadPreview'` | Mesmo drift de DTO em `cotacoes.tsx` | W3.4 |
| 11 | `src/services/opportunity-radar.functions.ts:716` | `TS2345` | `Argument of type 'string' is not assignable to parameter of type 'CanonicalSupplyOffer'` | Chamada passa string em vez do objeto tipado | W3.4 |
| 12–13 | `src/services/tourism-incidents.functions.ts:254-255` | `TS18047` | `'tripRow' is possibly 'null'` | Uso de `Boolean(tripRow)` não estreita tipo TS | W3.2 |
| 14 | `src/services/tourism.functions.ts:875` | `TS2353` | `'paxAges' does not exist in type 'OmnichannelLeadInput'` | Contrato Zod/tipo omite `paxAges` | W3.2 |
| 15 | `src/services/travel-lifecycle.functions.ts:3204` | `TS2551` | `Property 'full_name' does not exist on type 'ServerIdentity'` | Campo canônico é `identity.fullName` | W3.2 |
| 16–17 | `src/services/travel-proposal.functions.ts:1689-1690` | `TS2552` | `Cannot find name 'normalizedTransfers'` (2x) | Bug ativo de runtime em `createTravelProposal` | W3.2 |
| 18–19 | `src/services/travel-reaccommodation.functions.ts:165-166` | `TS18047` | `'tripRow' is possibly 'null'` | Mesmo padrão `Boolean(tripRow)` sem narrowing | W3.2 |
| 20 | `src/services/whatsapp-channel-instances.functions.ts:2125` | `TS18048` | `'data.departments' is possibly 'undefined'` | Falta guarda antes de iterar/acessar `.departments` | W3.4 |

---

## 3. Mapa de Divergências de Lint Visual & Checkers (`design-lint` + `audit-all` + `check-duplication`)

1. **`design-lint.mjs` (`21` violações pré-existentes fora de baseline congelada em `0`):**
   - `DL-15` (P0): `src/components/tourism/studio/proposal-share-whatsapp-modal.tsx:224` (`onClick` sem `focus-visible`)
   - `DL-28` (P1): `src/components/ui/airport-combobox.tsx:1` (`animate-*` sem `motion-reduce`)
   - `DL-03` (P1, `19x`): `SmartTravelBookingModal.tsx:384`, `TourismPipeCardDossier.tsx:2912`, `unified-proposal-workspace.tsx:2913,5133`, `workspace.clientes.$id.tsx:977,1018`, `workspace.turismo.oportunidades.tsx` (`13` linhas `space-y-1.5` / `mr-1.5`)
2. **Desvio entre `docs/design/DESIGN-LINT.md` e `scripts/design-lint.mjs`:**
   - `DL-10`, `DL-20`, `DL-22` estão declaradas e habilitadas em `.designlintrc.json`, porém sem detector em `lintSource()`.
   - `DL-24`, `DL-25`, `DL-30` medem regras diferentes daquelas documentadas em `DESIGN-LINT.md` (documentação precisa alinhar ou os testes em `design-lint.test.mjs` precisam migrar IDs coordenadamente em onda própria sem quebrar o CI).
3. **`audit-all.mjs` + `run-checks.mjs` pós-desarmamento (`18` checks avaliados, `25` marcados explicitamente `NAO AVALIADO`):**
   - Abertos reais: `C01(1316)`, `C06(541)`, `C07(47)`, `C08(10)`, `C09(9)`, `C18(143)`, `C22(22)`, `C23(10789)`, `C26(30)`, `C27(6)`, `C28(2)`, `C37(149)`, `C40(35)`.
   - Conformes reais: `C02(0)`, `C03(0)`, `C29(0)`, `C42(0)`, `C43(0)`.

---

## 4. Mapa de Donos Únicos por Domínio

| Domínio / Capacidade | Implementações Concorrentes Atuais | Dono Único Escolhido | Capacidades Avançadas a Absorver Antes de Aposentar |
|---|---|---|---|
| **Anúncios / Classificados** | `src/routes/_store.conta.classificados.novo.tsx` (11.791 LOC), `src/components/ad-engine/*` (dormente), `src/components/classifieds/*` | `src/components/ad-engine/` + `UniversalClassifiedShowcase` (`editorial-showcase-view.tsx`) decompondo a rota para `<=300 LOC` | FIPE, lotes/validade, eventos/ingressos/palestrantes, pacotes viagem, arquivos digitais, CNPJ, IA |
| **Propostas, Docs & Vouchers Turismo** | `unified-proposal-workspace.tsx` (5.620 LOC), `studio-sidebar-editor.tsx` (3.985 LOC), `workspace.orcamentos.novo.tsx` (2.991 LOC), `UniversalDocumentStudio.tsx` (2.388 LOC), `VoucherStudio.tsx`, `src/services/proposals.ts` | `UniversalDocumentStudio` + `travel-proposal.functions.ts` / `proposal_web_pages` | PassHub/Wooba live quoter, InfoTravel OCR, split-stay/multi-hotel, multi-transfer nomeado, `ProposalWebPageBuilder`, cartões voucher A4/Story canônicos |
| **Contratos & Assinatura Digital** | `contracts.functions.ts` (2.445 LOC) + `contract-workspace-studio.tsx` vs `travel-contract.functions.ts` (1.052 LOC) + `new-travel-contract-sheet.tsx` + `office/contract-editor-sheet.tsx` | `contracts.functions.ts` + `contract-workspace-studio.tsx` | Cláusulas de agência, espelho de viajantes/viagem, aditivos, multi-pagador e assinatura pública tokenizada |
| **Builder, Vitrine CMS & Branded App** | `OmniEditor.tsx` (5.247 LOC), `builder.functions.ts` (4.360 LOC) vs `omni-builder.functions.ts` (1.254 LOC); `lib/builder/builder-registry.ts` (2.886 LOC) vs `components/builder/registry.ts` (2.415 LOC); `OmniPageRenderer` vs `experience-renderer`; `admin/builder/*`; `pwa` vs `branded-app` | `OmniEditor` modular + único `builder-registry` unificado + `OmniPageRenderer` / `BrandedAppShell` | Presets multi-nicho, blocos dinâmicos CMS, popups globais, inspector unificado, preview live SSR-safe |
| **CRM, Atendimento & Chat** | `chat.functions.ts` (6.969 LOC), `AtendimentoChatWorkspace.tsx` (5.695 LOC), `TourismPipeCardDossier.tsx` (5.209 LOC), `legacy_quarantine/tourism_crm/*` | `crm.functions.ts` + módulos fatiados de `AtendimentoChatWorkspace` e `TourismPipeCardDossier` | AI Hunter insights (`AIHunterPanel`), lead qualification/360, quick actions WhatsApp Evolution |
| **Mining & Radar** | `mining.functions.ts` (4.670 LOC com 2 gerações in-file); `workspace.turismo.radar.tsx` vs `workspace.inteligencia.radar.tsx`; `hotel-mining.functions.ts` | `mining.functions.ts` modularizado + `opportunity-radar.functions.ts` + rota única consolidada de Radar | Receitas de coleta, deduplicação de feeds, matching hoteleiro |
| **Gateway IA & Copilot** | `api-orchestrator.functions.ts` (1.997 LOC) vs `ai-core-gateway.functions.ts` (1.647 LOC) vs `ai.functions.ts` / `ai/openrouter.ts`; `copilot-react-orchestrator.ts` vs `autonomous-copilot-orchestrator.ts`; `workspace.configuracoes.ai` vs `inteligencia-artificial` | `ai-core-gateway.functions.ts` + único orquestrador ReAct + rota única de config IA | Pool multi-provider, quota `$WZ`, aprovação humana, rastreamento de steps |
| **Primitivas UI & Tokens** | `src/design-system/primitives/` (2 callers) vs `src/components/ui/canonical/` (4 callers prod) vs `src/components/ui/` | Família única em `src/components/ui/` ancorada em `tokens.json` + `src/styles.css` | Variantes squircle Apple HIG, contratos `44px`, safe-area, focus-visible |
| **Helpers Transversais Puros** | `isVideoUrl` (7x), `slugify` (5x), `escapeHtml` (4x), `maskCpf` (2x), `formatCurrency`/`formatBRL` (2+2x), `isUuid` (37x prévio) | `src/lib/{formatters,slug-utils,media-utils,sanitize,validators}.ts` | Validações estritas Zod/CPF/UUID e sanitização anti-XSS homogênea |
| **Rotas & Navegação** | `src/lib/routes.ts` (3.556 LOC) + `src/config/route-registry.ts` + redirects pesados (`pedidos.gestor`, `reservas`, `design-system`, `moderacao`) | `src/lib/routes.ts` fatiado + `workspace-navigation.ts` verificado com rotas finais sem redirect acoplado | Permissões RBAC e matriz desktop/mobile |

---

## 5. Plano Incremental de Rigor Estático (`tsconfig.json` & `eslint.config.js`)

1. **Etapa A (Onda 2, pós-helpers/imports):** Habilitar `--noUnusedLocals` via `tsconfig.strict-check.json` nas pastas já limpas (`src/lib/`, `scripts/audit/`) + remover `"@typescript-eslint/no-unused-vars": "off"` progressivamente com `eslint --rule` por pacote.
2. **Etapa B (Onda 3–5, pós-modularização de monólitos e redução de `any`):** Erradicar `noUnusedParameters: false` e elevar `react-hooks/rules-of-hooks` e `no-empty` de `"warn"` para `"error"`.
3. **Etapa C (Onda 7, pré-CI):** Consolidar flags estritas diretamente no `tsconfig.json` e `eslint.config.js` principais sem exceções.

---

## 6. Backlog DAG Ordenado de Execução (`W1`–`W7`)

| Onda | Depende de | Escopo / Arquivos Autorizados | Risco | Critério de Pronto (Go/No-Go) |
|---|---|---|---|---|
| **W1** | W0 | `legacy_quarantine/**` (`106` arq), lista dos `211` dormentes | Alto (perda funcional se apressada) | 100% de `legacy_quarantine/` auditada item a item; lógicas únicas extraídas; somente itens 100% cobertos removidos |
| **W2** | W1 | `src/lib/*`, `25` arquivos `@deprecated`, `6` redirect traps, `36` violações de camada, `isVideoUrl`/`slugify`/`escapeHtml`/`maskCpf`/`isUuid` | Médio | `audit:forensic` com `0` broken imports, `0` violações de camada, `0` `@deprecated` sem callers críticos |
| **W3** | W2 | Domínios W3.1 Anúncios (`_store.conta.classificados.novo` + `ad-engine`), W3.2 Turismo/Contratos (`20` erros `tsc` incluídos), W3.3 Builder/BrandedApp, W3.4 Chat/CRM/Mining/IA | Alto | Zero erro em `npm run typecheck`; cada monólito top-20 fatiado sem regressão de funcionalidade; testes E2E por domínio |
| **W4** | W2, W3 | `package.json`, `vite.config.ts`, `lucide-react` vs `@phosphor-icons/react`, `framer-motion`, `pg`/`postgres`, chunks lazy (`jspdf`, `maplibre`, `recharts`) | Médio | Build único verde; Worker `< 22 MB` (margem real vs `25 MB`); redução medida de `index-*.js` (`< 1 MB`) |
| **W5** | W3 | `supabase/migrations/`, `supabase/reference-migrations/`, RLS/RPCs, redução `as any` (`C23`), `mcp-tool-registry.ts` | Alto (dados/segurança) | Testes multi-JWT reais aprovados em Postgres; tipos regenerados sem drift |
| **W6** | W3, W4 | Rotas `_store.*`, `viajante.*`, `workspace.*`, `admin-master.*`, `design-lint` (`21 -> 0`) | Médio | Capturas e fluxos validados Desktop (`1280x800`) + Mobile (`390x844`) pós-reload, `0` P0/P1 visual |
| **W7** | W0–W6 | `tsconfig.json`, `eslint.config.js`, `.github/workflows/ci.yml`, `docs/design/DECISIONS.md` | Baixo | `check:canonical`, `audit:forensic --strict-broken`, `typecheck`, `lint`, `build`, `route-budget-guard` e smoke browser aprovados no SHA final |
