# Auditoria Forense AST — Inventário Real de Duplicação, Monólitos, Legado & Stack

- Gerado em: `2026-11-18T18:34:08.033Z`
- Total arquivos `src/` (não-teste): `2401` (`1,098,347` linhas; top 20 monólitos = `8.8%` do código)
- Reachable em runtime a partir de rotas/worker/app: `2151` | Inalcançáveis do runtime: `252`
- Classificação anti-perda de inalcançáveis: `210` dormentes úteis (**MANTER/CONECTAR**), `27` `@deprecated`/shims, `15` duplicados/substituídos candidatos a purga
- Quebras de import/re-export: `0` | Violações de camada: `38` | Armadilhas de redirect em rotas: `0`
- Clusters de funções clone AST: `10` | Helpers watchlisted repetidos: `1`
- Quarentena (`legacy_quarantine/`): `0` arquivos | Migrations: `653` (+ `271` referências em `supabase/reference-migrations/`)

## 1. Imports / Re-exports Quebrados

_Nenhum import/re-export quebrado detectado._

## 2. Rotas Pesadas com Redirect Incondicional e Acoplamento Invertido

_Nenhuma rota pesada com redirect incondicional._

## 3. Helpers Duplicados Confirmados (AST & Watchlist)

| Helper | Ocorrências | Arquivos |
|---|---:|---|
| `formatMoney` | 5 | `src/components/tourism/CommissionAwardReceiptModal.tsx`, `src/components/tourism/EmployeeCommercialProfilePanel.tsx`, `src/components/tourism/OperatorBillingPanel.tsx`, `src/lib/money.ts`, `src/routes/workspace.turismo.minhas-vendas.tsx` |

## 4. Top 20 Monólitos >= 800 LOC

| # | Arquivo | LOC | Funções | Maior Função | Branches | Hooks | `any` |
|---:|---|---:|---:|---:|---:|---:|---:|
| 1 | `src/routes/_store.conta.classificados.novo.tsx` | 7930 | 3 | 7501 | 912 | 355 | 52 |
| 2 | `src/components/tourism/crm/TourismPipeCardDossier.tsx` | 7409 | 1 | 7144 | 432 | 85 | 101 |
| 3 | `src/services/chat.functions.ts` | 6443 | 4 | 206 | 752 | 0 | 311 |
| 4 | `src/components/atendimento/AtendimentoChatWorkspace.tsx` | 6342 | 2 | 6034 | 537 | 118 | 108 |
| 5 | `src/services/crm.functions.ts` | 5853 | 6 | 127 | 560 | 0 | 201 |
| 6 | `src/components/tourism/unified-proposal-workspace.tsx` | 5648 | 2 | 5436 | 469 | 73 | 50 |
| 7 | `src/components/builder/OmniEditor.tsx` | 5247 | 3 | 2560 | 195 | 52 | 97 |
| 8 | `src/lib/builder/omni-templates.ts` | 4805 | 4 | 198 | 6 | 0 | 0 |
| 9 | `src/services/builder.functions.ts` | 4360 | 4 | 407 | 298 | 0 | 92 |
| 10 | `src/services/mining.functions.ts` | 4287 | 2 | 113 | 262 | 0 | 33 |
| 11 | `src/services/classifieds.functions.ts` | 4159 | 3 | 436 | 310 | 0 | 57 |
| 12 | `src/components/tourism/studio/studio-sidebar-editor.tsx` | 4124 | 3 | 3861 | 256 | 16 | 42 |
| 13 | `src/services/marketplace-hub.functions.ts` | 4054 | 11 | 777 | 343 | 0 | 55 |
| 14 | `src/lib/routes.ts` | 3817 | 3 | 11 | 3 | 0 | 0 |
| 15 | `src/services/events.functions.ts` | 3817 | 24 | 202 | 270 | 0 | 55 |
| 16 | `src/services/ai-conversations.functions.ts` | 3799 | 20 | 967 | 286 | 0 | 47 |
| 17 | `src/routes/_store.membro.$id.tsx` | 3692 | 12 | 2265 | 167 | 72 | 71 |
| 18 | `src/services/travel-proposal.functions.ts` | 3626 | 29 | 291 | 436 | 0 | 49 |
| 19 | `src/components/builder/vitrine-block-inspector.tsx` | 3620 | 7 | 3272 | 119 | 1 | 51 |
| 20 | `src/registries/mcp-tool-registry.ts` | 3521 | 3 | 3 | 151 | 0 | 58 |

## 5. Arquivos `@deprecated` & Callers Reais

| Arquivo | Símbolos `@deprecated` | Callers Ativos | Ação Segura |
|---|---|---:|---|
| `src/lib/ai/openrouter.ts` | `callOpenRouter` | 2 | Migrar callers p/ canônico e remover |
| `src/services/ai-conversations.functions.ts` | `resolveAiPipelineSteps` | 9 | Migrar callers p/ canônico e remover |
| `src/lib/identity-core.ts` | `STAFF_ROLES` | 17 | Migrar callers p/ canônico e remover |
| `src/types/omni-builder.ts` | arquivo inteiro | 29 | Migrar callers p/ canônico e remover |

## 6. Inalcançáveis: Candidatos à Purga vs Dormentes Protegidos

### 6A. Candidatos à Purga / Shims / Substituídos (Top 40)

| Arquivo | LOC | Veredito | Motivo |
|---|---:|---|---|
| `src/components/ad-engine/editor/index.ts` | 12 | `DEPRECATED_OR_SHIM` | Arquivo apenas reexporta outro módulo (shim) |
| `src/components/admin/index.ts` | 4 | `DEPRECATED_OR_SHIM` | Arquivo apenas reexporta outro módulo (shim) |
| `src/components/builder/index.ts` | 8 | `DEPRECATED_OR_SHIM` | Arquivo apenas reexporta outro módulo (shim) |
| `src/components/chat/index.ts` | 13 | `DEPRECATED_OR_SHIM` | Arquivo apenas reexporta outro módulo (shim) |
| `src/components/commerce/ifood/index.ts` | 11 | `DEPRECATED_OR_SHIM` | Arquivo apenas reexporta outro módulo (shim) |
| `src/components/commerce/index.ts` | 10 | `DEPRECATED_OR_SHIM` | Arquivo apenas reexporta outro módulo (shim) |
| `src/components/community/index.ts` | 18 | `DEPRECATED_OR_SHIM` | Arquivo apenas reexporta outro módulo (shim) |
| `src/components/courier/index.ts` | 2 | `DEPRECATED_OR_SHIM` | Arquivo apenas reexporta outro módulo (shim) |
| `src/components/design-system/actions-family.tsx` | 165 | `CANDIDATE_DUPLICATE_OR_SUPERSEDED` | Símbolos/tabelas já cobertos por módulos canônicos ativos no runtime |
| `src/components/design-system/design-system-header.tsx` | 65 | `CANDIDATE_DUPLICATE_OR_SUPERSEDED` | Símbolos/tabelas já cobertos por módulos canônicos ativos no runtime |
| `src/components/design-system/ds4-showcase.tsx` | 692 | `CANDIDATE_DUPLICATE_OR_SUPERSEDED` | Símbolos/tabelas já cobertos por módulos canônicos ativos no runtime |
| `src/components/design-system/forms-family.tsx` | 197 | `CANDIDATE_DUPLICATE_OR_SUPERSEDED` | Símbolos/tabelas já cobertos por módulos canônicos ativos no runtime |
| `src/components/design-system/media-showcase-family.tsx` | 135 | `CANDIDATE_DUPLICATE_OR_SUPERSEDED` | Símbolos/tabelas já cobertos por módulos canônicos ativos no runtime |
| `src/components/design-system/navigation-family.tsx` | 174 | `CANDIDATE_DUPLICATE_OR_SUPERSEDED` | Símbolos/tabelas já cobertos por módulos canônicos ativos no runtime |
| `src/components/design-system/overlays-family.tsx` | 174 | `CANDIDATE_DUPLICATE_OR_SUPERSEDED` | Símbolos/tabelas já cobertos por módulos canônicos ativos no runtime |
| `src/components/design-system/state-card.tsx` | 52 | `CANDIDATE_DUPLICATE_OR_SUPERSEDED` | Símbolos/tabelas já cobertos por módulos canônicos ativos no runtime |
| `src/components/design-system/surfaces-family.tsx` | 197 | `CANDIDATE_DUPLICATE_OR_SUPERSEDED` | Símbolos/tabelas já cobertos por módulos canônicos ativos no runtime |
| `src/components/design-system/viewports-family.tsx` | 138 | `CANDIDATE_DUPLICATE_OR_SUPERSEDED` | Símbolos/tabelas já cobertos por módulos canônicos ativos no runtime |
| `src/components/documents/index.ts` | 7 | `DEPRECATED_OR_SHIM` | Arquivo apenas reexporta outro módulo (shim) |
| `src/components/eventos/index.ts` | 15 | `DEPRECATED_OR_SHIM` | Arquivo apenas reexporta outro módulo (shim) |
| `src/components/landing/index.ts` | 6 | `DEPRECATED_OR_SHIM` | Arquivo apenas reexporta outro módulo (shim) |
| `src/components/profile/index.ts` | 9 | `DEPRECATED_OR_SHIM` | Arquivo apenas reexporta outro módulo (shim) |
| `src/components/shell/index.ts` | 12 | `DEPRECATED_OR_SHIM` | Arquivo apenas reexporta outro módulo (shim) |
| `src/components/simlab/index.ts` | 3 | `DEPRECATED_OR_SHIM` | Arquivo apenas reexporta outro módulo (shim) |
| `src/components/social/index.ts` | 5 | `DEPRECATED_OR_SHIM` | Arquivo apenas reexporta outro módulo (shim) |
| `src/components/squads/index.ts` | 2 | `DEPRECATED_OR_SHIM` | Arquivo apenas reexporta outro módulo (shim) |
| `src/components/studio/index.ts` | 8 | `DEPRECATED_OR_SHIM` | Arquivo apenas reexporta outro módulo (shim) |
| `src/components/tourism/index.ts` | 8 | `DEPRECATED_OR_SHIM` | Arquivo apenas reexporta outro módulo (shim) |
| `src/components/tourism/studio/StudioFormatPicker.tsx` | 74 | `CANDIDATE_DUPLICATE_OR_SUPERSEDED` | Símbolos/tabelas já cobertos por módulos canônicos ativos no runtime |
| `src/components/tourism/studio/StudioTemplatePicker.tsx` | 111 | `CANDIDATE_DUPLICATE_OR_SUPERSEDED` | Símbolos/tabelas já cobertos por módulos canônicos ativos no runtime |
| `src/components/tourism/studio/StudioToolbar.tsx` | 90 | `CANDIDATE_DUPLICATE_OR_SUPERSEDED` | Símbolos/tabelas já cobertos por módulos canônicos ativos no runtime |
| `src/components/ui/canonical/index.ts` | 15 | `DEPRECATED_OR_SHIM` | Arquivo apenas reexporta outro módulo (shim) |
| `src/components/ui/chart.tsx` | 332 | `CANDIDATE_DUPLICATE_OR_SUPERSEDED` | Símbolos/tabelas já cobertos por módulos canônicos ativos no runtime |
| `src/components/ui/sidebar.tsx` | 739 | `CANDIDATE_DUPLICATE_OR_SUPERSEDED` | Símbolos/tabelas já cobertos por módulos canônicos ativos no runtime |
| `src/components/widgets/index.ts` | 27 | `DEPRECATED_OR_SHIM` | Arquivo apenas reexporta outro módulo (shim) |
| `src/components/workspace/index.ts` | 19 | `DEPRECATED_OR_SHIM` | Arquivo apenas reexporta outro módulo (shim) |
| `src/config/route-registry.ts` | 25 | `DEPRECATED_OR_SHIM` | Arquivo apenas reexporta outro módulo (shim) |
| `src/design-system/ai/index.ts` | 5 | `DEPRECATED_OR_SHIM` | Arquivo apenas reexporta outro módulo (shim) |
| `src/lib/ad-engine/content-blocks/index.ts` | 8 | `DEPRECATED_OR_SHIM` | Arquivo apenas reexporta outro módulo (shim) |
| `src/lib/ai/index.ts` | 11 | `DEPRECATED_OR_SHIM` | Arquivo apenas reexporta outro módulo (shim) |

### 6B. Capacidades Dormentes Protegidas — NÃO Excluir sem Nativizar (Top 30)

| Arquivo | LOC | ServerFns | Tabelas/RPCs Únicas |
|---|---:|---:|---|
| `src/components/ad-engine/editor/listing-full-editor.tsx` | 288 | 0 | lógica isolada |
| `src/components/ad-engine/editor/listing-precheck-dialog.tsx` | 252 | 0 | lógica isolada |
| `src/components/ad-engine/editor/listing-quick-editor.tsx` | 250 | 0 | lógica isolada |
| `src/components/ad-engine/editor/sections/listing-fiscal-section.tsx` | 166 | 0 | lógica isolada |
| `src/components/ad-engine/editor/sections/listing-media-section.tsx` | 223 | 0 | lógica isolada |
| `src/components/ad-engine/editor/sections/listing-modifiers-section.tsx` | 204 | 0 | lógica isolada |
| `src/components/ad-engine/editor/sections/listing-pricing-section.tsx` | 317 | 0 | lógica isolada |
| `src/components/ad-engine/editor/sections/listing-scope-section.tsx` | 301 | 0 | lógica isolada |
| `src/components/ad-engine/editor/sections/listing-template-selector.tsx` | 183 | 0 | lógica isolada |
| `src/components/ad-engine/editor/sections/listing-variants-section.tsx` | 290 | 0 | lógica isolada |
| `src/components/ad-engine/editor/unified-listing-editor.tsx` | 413 | 0 | lógica isolada |
| `src/components/ad-engine/preview/canonical-listing-preview-frame.tsx` | 224 | 0 | lógica isolada |
| `src/components/ad-engine/public/canonical-listing-view.tsx` | 801 | 0 | lógica isolada |
| `src/components/ad-engine/public/listing-empty-state.tsx` | 171 | 0 | lógica isolada |
| `src/components/admin/admin-shell.tsx` | 688 | 0 | lógica isolada |
| `src/components/admin/builder/builder-canvas.tsx` | 270 | 0 | lógica isolada |
| `src/components/admin/builder/builder-floating-action-bar.tsx` | 114 | 0 | lógica isolada |
| `src/components/admin/services/service-bom-card.tsx` | 246 | 0 | lógica isolada |
| `src/components/admin/tenant-switcher.tsx` | 139 | 0 | lógica isolada |
| `src/components/admin/working-hours-editor.tsx` | 37 | 0 | lógica isolada |
| `src/components/builder/GiftCardCommerceBlocks.tsx` | 172 | 0 | lógica isolada |
| `src/components/classifieds/ad-details.tsx` | 19 | 0 | lógica isolada |
| `src/components/classifieds/classified-basic-info-section.tsx` | 131 | 0 | lógica isolada |
| `src/components/classifieds/classified-editor-navigation.tsx` | 216 | 0 | lógica isolada |
| `src/components/classifieds/classified-pricing-lifecycle-section.tsx` | 291 | 0 | lógica isolada |
| `src/components/commerce/bottom-nav.tsx` | 13 | 0 | lógica isolada |
| `src/components/commerce/classified-form.tsx` | 285 | 0 | lógica isolada |
| `src/components/commerce/master-hero-cards.tsx` | 326 | 0 | lógica isolada |
| `src/components/commerce/master-squircle-hero.tsx` | 203 | 0 | lógica isolada |
| `src/components/commerce/post-theme-selector.tsx` | 75 | 0 | lógica isolada |

## 7. `legacy_quarantine/` — Itens que Exigem Extração/Verificação Antes da Purga

| Arquivo em Quarentena | LOC | Tabelas/RPCs Não Presentes em Rotas Ativas |
|---|---:|---|

## 8. Stack, Higiene & Sobreposições (`package.json` / `tsconfig.json` / `eslint.config.js`)

- `tsconfig.json`: `noUnusedLocals=false`, `noUnusedParameters=false`
- `eslint.config.js`: `no-unused-vars=off (true)`, `no-explicit-any=warn (true)`, `rules-of-hooks=warn (true)`
- Dependências em `package.json` com `0` imports diretos em `src/`: `@tailwindcss/vite`, `@tanstack/router-plugin`, `@types/canvas-confetti`, `@types/pg`, `postgres`, `tailwindcss`, `tw-animate-css`, `vite-tsconfig-paths`

| Grupo de Stack | Pacotes & Imports em `src/` |
|---|---|
| Postgres Drivers | `pg` (4 arq src / 24 scripts) vs `postgres` (0 arq src / 92 scripts) |
| Icon Libraries | `lucide-react` (1162 arq src / 9 scripts) vs `@phosphor-icons/react` (172 arq src / 2 scripts) |
| Client PDF/Rasterizers | `jspdf` (5 arq src / 2 scripts) vs `html2canvas` (2 arq src / 2 scripts) |
| Client Carousels/Sliders | `embla-carousel-react` (3 arq src / 1 scripts) vs `vaul` (4 arq src / 1 scripts) |