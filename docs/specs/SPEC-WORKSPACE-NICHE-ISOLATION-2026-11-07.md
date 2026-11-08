# SPEC-WORKSPACE-NICHE-ISOLATION-2026-11-07 — Isolamento Semântico Total de Workspaces por Nicho e Remoção de Atalhos Master Intrusivos

## 1. Contexto e Objetivo
Cada Workspace (`/workspace/*`) representa a estação operacional dedicada de uma empresa específica (`activeStore`) e deve refletir exclusivamente os módulos, pilares da barra lateral (rail + sub-sidebar), cabeçalho operacional, barra inferior móvel, diálogo de ferramentas (`Cmd+K`) e visão geral correspondentes ao nicho real daquele negócio. Botões globais de administração da plataforma (`Painel Global Master`, `Admin Master` e o alternador `Filtrar por Nicho da Loja` / `Modo Master: Todas as Verticais`) poluíam a casca operacional da loja e causavam mistura de verticais desconexas.

## 2. Requisitos Estruturados (Sintaxe EARS)
- **REQ-01 (Ubiquitous — Purga de Botões Master/Filtro no WorkspaceShell):** O sistema `WorkspaceShell` NÃO DEVE renderizar os controles `Painel Global Master`, `Filtrar por Nicho da Loja` (`Modo Master: Todas as Verticais`) ou o botão `Admin Master` na sidebar desktop, no menu móvel ou no cabeçalho do Workspace.
- **REQ-02 (Event-Driven — Resolução Pura por Nicho Ativo):** QUANDO uma empresa for carregada ou alternada no Workspace, o sistema DEVE derivar 100% dos pilares (`getMasterSidebarPillars`), submódulos (`getSidebarConfig`), ações de topo (`getStoreContextualAction`, `getStoreHeaderOperationalAction`), barra móvel inferior e ferramentas (`WorkspaceAllToolsDialog`) estritamente a partir do nicho semântico da empresa ativa (`getNicheSemantics(activeStore)`).
- **REQ-03 (Unwanted Behavior — Isolamento Anti-Vazamento entre as 17 Verticais):** SE o nicho ativo da empresa pertencer a uma vertical especializada (ex.: `tourism`, `legal`, `services`, `real_estate`, `jobs`, `education`, `news`, `events`, `vehicles`, `rental`, `tech_repair`, `pet`, `gastronomy`, `pharmacy`, `supermarket`, `wholesale`, `retail`), ENTÃO o sistema NÃO DEVE expor submódulos exclusivos de outras verticais (ex.: `Receitas` culinárias fora de gastronomia/supermercado; `CT-e` e `Pontos PUDO` em advocacia, turismo, educação, RH, redação ou clínicas; `PDV` e `Separação & WMS` em escritórios jurídicos, portais de notícias ou recrutamento; `Cozinha KDS` e `Mesas` fora de gastronomia/eventos).
- **REQ-04 (Ubiquitous — Completude dos 10 Pilares Operacionais por Nicho):** O motor `workspace-navigation.ts` DEVE prover para cada um dos 17 nichos canônicos os 10 pilares operacionais com rótulos, ícones, descrições e submódulos fiéis à operação real do segmento, mantendo zero rotas estáticas órfãs no catálogo mestre de auditoria.
- **REQ-05 (Ubiquitous — Cobertura Integral do Dicionário e Dashboard Polimórfico):** O dicionário `niche-dictionary.ts`, o guarda `NicheOperationalGuard` e o renderizador `PolymorphicDashboardRenderer` DEVEM cobrir integralmente os 17 nichos canônicos em português, sem fallback indevido para termos de varejo físico em negócios de serviços, jurídico, mídia, educação ou RH.
- **REQ-06 (Ubiquitous — Ergonomia Anti-Truncate e Design System):** Os rótulos curtos do trilho lateral (`MasterPillar.shortLabel`) DEVEM acomodar o texto sem corte por reticências (`...`), respeitando o piso tátil de 44px (`min-h-11`), foco visível (`:focus-visible:ring-2`) e proibição do ícone `Sparkles` (Regra B.50).

## 3. Escopo Atômico Autorizado
- `src/lib/niches/niche-dictionary.ts`
- `src/lib/workspace-navigation.ts`
- `src/components/workspace/workspace-shell.tsx`
- `src/components/workspace/workspace-all-tools-dialog.tsx`
- `src/components/workspace/niche-operational-guard.tsx`
- `src/components/workspace/dashboard/PolymorphicDashboardRenderer.tsx`
- `src/routes/workspace.index.tsx`
- `src/lib/__tests__/workspace-navigation-pillars.test.ts`
- `docs/design/DECISIONS.md`

## 4. Invariantes e Evidências de Aceite
- Zero ocorrências de `Filtrar por Nicho da Loja`, `Modo Master: Todas as Verticais`, `Painel Global Master` ou botão `Admin Master` em `src/components/workspace/workspace-shell.tsx`.
- Aprovação integral nas suítes Vitest (`workspace-navigation-pillars.test.ts`, `niche-isolation-and-routing.test.ts`, `anti-ai-and-semantic-purity.test.ts`, `business-ma-and-subniches.test.ts`, `route-integrity-w10.test.ts`).
- `npm run typecheck` com Exit Code 0.
- `node scripts/design-lint.mjs --ratchet` aprovado sem novas violações P0/P1.
- `npm run build` com Exit Code 0.
