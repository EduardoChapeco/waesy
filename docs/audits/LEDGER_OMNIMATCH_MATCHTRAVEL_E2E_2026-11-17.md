# Ledger de Evidências — Missão OmniMatch / MatchTravel & Auditoria E2E

- **Data/hora (ISO, fuso):** 2026-11-17T18:27:00-03:00
- **Repositório:** `EduardoChapeco/waesy`
- **Branch/HEAD:** `release/prod-20261113-fullpage-chat-copilot` (`c0e1d351e1ac5feaeb77d0f88cc19df83f14267c`)
- **Base remota comparada:** `origin/main`
- **Ambiente:** Node.js v22+ / Windows PowerShell / Vite / TanStack Router + Start / Supabase Postgres + pgvector
- **Escopo incluído:**
  1. Auditoria e comprovação integral dos 3 blocos prévios:
     - Bloco 1: Propostas Web, Studio & Lâmina PDF/PNG
     - Bloco 2: Construtor de Apps PWA, Isolamento Multi-Tenant & Domínios Próprios
     - Bloco 3: WhatsApp CRM, Grupos, Hot Ofertas & Copilot `@oferta`
  2. Implementação e ativação BigTech do Submódulo Multi-Nicho OmniMatch / MatchTravel Engine:
     - Fase M1: Schema Postgres + pgvector + Decks Multi-Nicho + RLS Deny-by-Default
     - Fase M2: Backend Match Engine Neural, Algoritmo Adaptativo & Identity Stitching
     - Fase M3: UI Tinder Nativa in-app (`OmniMatchDeckView`) + Studio Administrativo (`/workspace/match-time`) + Integração PWA / Copilot
     - Fase M4: Auditoria de Design (DL-01..DL-32), 8 Níveis de Prova e Fechamento

---

## Preflight de Leitura por Bloco / Fase

| Fase | Paths Inspecionados | Hash Inicial | Status Leitura |
|---|---|---|---|
| **Auditoria Bloco 1** | `proposal-web-showcase.tsx`, `proposal-web-page-builder.tsx`, `_store.proposta.$token.tsx`, `proposal-canvas-renderer.tsx`, `travel-flight-itinerary-card.tsx`, `media-gallery-field.tsx`, `proposal-normalization.ts`, `travel-proposal.functions.ts` | `c0e1d351` | Concluída |
| **Auditoria Bloco 2** | `workspace.configuracoes.pwa.tsx`, `branded-app-workspace-editor.tsx`, `branded-app-shell.tsx`, `app-sections-renderer.tsx`, `app-client-portal-tab.tsx`, `app.$slug.tsx`, `api.pwa.manifest[.]json.ts`, `server.ts`, `public/sw.js`, `tourism-dynamic-search-panel.tsx`, `pixels.functions.ts` | `c0e1d351` | Concluída |
| **Auditoria Bloco 3** | `crm.functions.ts`, `whatsapp-provider-webhook.server.ts`, `whatsapp-evolution-sync.server.ts`, `hot-offers.functions.ts`, `omnichannel-ai-copilot.server.ts` | `c0e1d351` | Concluída |
| **M1: Schema** | `supabase/migrations/20270609000000_b2b_rotary_crm_gps_routes_and_omnimatch_engine.sql` | `c0e1d351` | Concluída |
| **M2: Backend** | `src/services/match-engine.functions.ts`, `src/services/match-time.functions.ts` | `c0e1d351` | Concluída |
| **M3: UI & Studio** | `src/components/branded-app/omni-match-deck-view.tsx`, `src/routes/workspace.match-time.tsx`, `src/components/branded-app/branded-app-shell.tsx`, `src/components/admin/tenant-switcher.tsx`, `src/lib/routes.ts` | `c0e1d351` | Concluída |
| **M4: Verificação** | Scripts design-lint, check-type-duplications, vitest, typecheck, build | `c0e1d351` | Concluída |

---

## Matriz de Achados da Auditoria & Resolução E2E

| ID | Módulo | Descrição do Achado | Severidade | Status | Resolução Comprovada |
|---|---|---|---|---|---|
| GAP-AUD-01 | Propostas Web | Presets visuais, capas, recortes foto/vídeo, Card de Investimento rico, mapa IATA SVG/Canvas e exportação PDF sem CORS | P1 | Concluído | Inspecionados e validados `proposal-web-showcase.tsx`, `proposal-web-page-builder.tsx`, `proposal-canvas-renderer.tsx` e `travel-proposal.functions.ts`. |
| GAP-AUD-02 | Branded App PWA | Consolidar Studio único em `workspace.configuracoes.pwa.tsx`, isolamento 100% in-app e domínio próprio Edge/SSR | P1 | Concluído | Rota delegando diretamente ao `BrandedAppWorkspaceEditor`, drawers modais inline eliminando fugas para rotas globais. |
| GAP-AUD-03 | WhatsApp & Copilot | Dedupe CRM, grupos `internal_team` silenciados, Hot Ofertas sanitizadas (zero PII) e plugin `@oferta` | P1 | Concluído | Verificado em `crm.functions.ts`, `whatsapp-provider-webhook.server.ts` e suíte de testes passando. |
| GAP-ISOL-01 | Contexto Tenant | Switcher do Workspace permitia selecionar "Perfil Pessoal (Física)" (`store_id = null`), corrompendo queries | P0 | Concluído | `tenant-switcher.tsx` refatorado para listar estritamente lojas com link de saída explícito para `/conta`. |
| GAP-ISOL-02 | Mini-Painel Civil | `_store.conta.empresa.tsx` e `_store.conta.index.tsx` duplicavam telas de gestão de empresa sob URL civil | P1 | Concluído | Redirecionamento automático adicionado em `beforeLoad` para `/workspace` e links apontando para Workspace. |
| GAP-ROUT-01 | Rotas Workspace | 24 submódulos do Workspace ausentes de `ROUTES` em `src/lib/routes.ts`, bloqueando role checks | P1 | Concluído | Registradas todas as 24 rotas em `WORKSPACE_ROUTES`, zerando missing count no auditor. |
| GAP-MATCH-01 | OmniMatch Neural | Motor de descoberta multi-nicho, física PointerEvents 60fps, RLS Deny-by-Default e stitch para WhatsApp | P1 | Concluído | `omni-match-deck-view.tsx` implementado, migration atualizada com RPC `match_next_cards_batch` e 7 testes E2E aprovados. |
| GAP-B2B-01 | Hub B2B & Rotas | Unificação de compras por atacado e rotas GPS com geofence de 200m sob `/workspace/b2b` | P1 | Concluído | `workspace.b2b.index.tsx` integrado com sub-abas canônicas, fragment JSX estritamente fechado e design-lint aprovado. |
| GAP-PWA-01 | Editor PWA & Match | Habilitar lojistas a configurar, reordenar e ativar aba de OmniMatch no app próprio | P1 | Concluído | `branded-app-workspace-editor.tsx` atualizado com seletor interativo de tipo de aba, rótulo canônico e starter template. |
| GAP-PORTAL-01 | Seletor de Portais | Fim do redirecionamento cego para vitrine civil; rota de seleção multi-empresa | P0 | Concluído | Implementada rota `/auth/portal-selector` com listagem de lojas, chaveamento atômico e integração nos fluxos de login. |
| GAP-ONBOARD-01 | Onboarding B2B | Credenciamento autônomo de empresas e titular com validação legal sem perfil civil | P1 | Concluído | Implementados `/onboarding/empresa` e `registerEnterpriseOnboardingFn` com validação de CPF Mod11, maioridade e CNPJ. |

---

## Métricas de Validação Final

| Gate | Alvo | Resultado | Status |
|---|---|---|---|
| Design Lint Ratchet | 0 violações P0/P1/P2/P3 | 0 violações em 2391 arquivos | APROVADO |
| Duplicação de Tipos | 0 tipos duplicados | 0 tipos duplicados em 2971 arquivos | APROVADO |
| Testes Unitários/E2E | Suíte central de B2B, OmniMatch, Tenant e Onboarding | 30 testes executados em 5 suítes, 30 aprovados (100%) | APROVADO |
| BFF Table Contracts | 0 tabelas sem declaração local | 705 tabelas referenciadas com declaração local | APROVADO |
| Token Sync | 100% paridade tokens.json / styles.css | 173 tokens carregados, 0 ausentes | APROVADO |
| Rotas Faltantes | 0 rotas desregistradas em `src/lib/routes.ts` | 0 rotas faltantes no catálogo | APROVADO |

