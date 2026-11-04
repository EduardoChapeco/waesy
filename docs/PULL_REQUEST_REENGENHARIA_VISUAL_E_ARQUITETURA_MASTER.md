# PR: Reengenharia Visual Ultraminimalista, Arquitetura de Informação e Implementação Ponta a Ponta Waesy

## 1. Visão Geral do Pull Request

Este Pull Request consolida a maior reestruturação visual, ergonômica e arquitetural da plataforma Waesy, transformando um sistema com alta densidade funcional (10 domínios, 38 módulos, 128 submódulos e 443 rotas) em uma experiência **ultraminimalista, espaçosa, silenciosa e nativa** inspirada nos benchmarks **Belasis, Avec, Trello, Linear e Notion**.

### Objetivos Alcançados:
- **Zero Perda Funcional:** 100% das 446 rotas, fluxos e contratos foram mantidos íntegros.
- **Erradicação do Containeritis (DL-31):** Eliminação de cards dentro de cards com a introdução do padrão *Single Sovereign Surface*.
- **Piso Ergonômico de 44px (DL-14 & Regra B.26):** Todos os alvos de toque interativos em cabeçalhos, barras e tabs móveis elevados para `h-11 min-h-11`.
- **Alternância Universal de Visualização (Requisito R2):** Criação das primitivas polimórficas `UniversalViewManager` e `ViewModeSwitcher` (Tabela / Kanban / Cards) com persistência em banco via RLS multi-tenant.
- **Harness Automatizado E2E:** 145 testes automatizados em 10 arquivos (`tests/e2e/`) cobrindo Tiers 1 a 4 com 100% de taxa de sucesso.
- **Blindagem Transacional e Idempotência:** Implementação da máquina de estados "Carimbou PAGO", prevenção de sangrias negativas e zero duplo-agendamento via advisory locks.

---

## 2. Mapa das Mudanças por Domínio

### 2.1 Design System & Fundações Visuais (Marco M1)
- [`src/components/workspace/kpi-metric-card.tsx`](file:///c:/Users/Eduardo%20Antônio%20Ramo/Documents/waesy/src/components/workspace/kpi-metric-card.tsx): Card soberano de indicadores de desempenho sem ruído visual, com badge semântico e sparkline integrado.
- [`src/components/workspace/mini-sparkline.tsx`](file:///c:/Users/Eduardo%20Antônio%20Ramo/Documents/waesy/src/components/workspace/mini-sparkline.tsx): Micro-gráfico vetorial SVG sem eixos decorativos, renderizando tendências fluidas de dados.
- [`src/components/workspace/view-modes/`](file:///c:/Users/Eduardo%20Antônio%20Ramo/Documents/waesy/src/components/workspace/view-modes): Primitivos `UniversalViewManager`, `ViewModeSwitcher` e hook `useWorkspaceViewMode` com atalhos de teclado (`1`, `2`, `3`) e suporte nativo a Tabela, Kanban e Cards.

### 2.2 Persistência de Dados & Server Functions (BFF)
- [`supabase/migrations/20270220030000_workspace_user_view_preferences.sql`](file:///c:/Users/Eduardo%20Antônio%20Ramo/Documents/waesy/supabase/migrations/20270220030000_workspace_user_view_preferences.sql): Tabela `workspace_user_view_preferences` com políticas RLS por tenant/user, restrição de unicidade e índices de consulta rápida.
- [`src/services/workspace-view-preferences.functions.ts`](file:///c:/Users/Eduardo%20Antônio%20Ramo/Documents/waesy/src/services/workspace-view-preferences.functions.ts): Contrato BFF com validação Zod estrita (Invariante B.25) para salvar e recuperar o modo de visão preferido do usuário.
- [`src/services/__tests__/workspace-view-preferences.test.ts`](file:///c:/Users/Eduardo%20Antônio%20Ramo/Documents/waesy/src/services/__tests__/workspace-view-preferences.test.ts): 15 testes unitários cobrindo upsert, fallbacks, validação e isolamento multi-tenant.

### 2.3 Saneamento de Cores & Vitrines Dinâmicas
- [`src/components/commerce/dynamic-sections/countdown-timer.tsx`](file:///c:/Users/Eduardo%20Antônio%20Ramo/Documents/waesy/src/components/commerce/dynamic-sections/countdown-timer.tsx): Erradicação de cores literais `#ffffff`, `#09090b` e estilos inline proibidos.
- [`src/components/commerce/dynamic-sections/flash-sale-hero.tsx`](file:///c:/Users/Eduardo%20Antônio%20Ramo/Documents/waesy/src/components/commerce/dynamic-sections/flash-sale-hero.tsx): Remoção de gradiente utilitário arbitrário em botão e substituição de `#f59e0b`/`#f97316` por tokens semânticos.
- [`src/components/commerce/dynamic-sections/hero-carousel.tsx`](file:///c:/Users/Eduardo%20Antônio%20Ramo/Documents/waesy/src/components/commerce/dynamic-sections/hero-carousel.tsx): Remoção de `aspect-[2.4/1]` e `from-[#1a1a2e]`, botão móvel elevado para 44px.
- [`src/components/commerce/banner-hero-carousel.tsx`](file:///c:/Users/Eduardo%20Antônio%20Ramo/Documents/waesy/src/components/commerce/banner-hero-carousel.tsx): Substituição de `bg-black/60` e literais de cor por `bg-background/80` e `hover:bg-muted`.

### 2.4 Operações de Pedidos & KDS de Cozinha
- [`src/routes/workspace.pedidos.index.tsx`](file:///c:/Users/Eduardo%20Antônio%20Ramo/Documents/waesy/src/routes/workspace.pedidos.index.tsx): Harmonização de controles de cabeçalho, botão de som e botões de visualização para `h-11 min-h-11` (44px); conversão de cores `emerald-*` para `success`.
- [`src/routes/workspace.pedidos.gestor.tsx`](file:///c:/Users/Eduardo%20Antônio%20Ramo/Documents/waesy/src/routes/workspace.pedidos.gestor.tsx): Alvos de toque táteis em chips omnichannel, abas operacionais (Agora/Agendados) e campo de busca.

---

## 3. Evidências Automatizadas de Qualidade

| Gate de Verificação | Comando de Execução | Resultado |
| :--- | :--- | :--- |
| **Suíte E2E Completa (Tiers 1 a 4)** | `npx vitest run tests/` | **145/145 testes aprovados (100%)** em 4,13s |
| **Persistência de Visões Multi-Tenant** | `npx vitest run src/services/__tests__/workspace-view-preferences.test.ts` | **15/15 testes aprovados (100%)** |
| **Máquina de Estados & Idempotência** | `npx vitest run src/services/__tests__/universal-idempotency-and-state-machine.test.ts` | **8/8 testes aprovados (100%)** |
| **Catraca do Design Lint** | `node scripts/design-lint.mjs --ratchet` | **Zero violações P0 / Teto reduzido em 37 violações (694)** |
| **Build de Produção** | `npm run build` | **Assets gerados e worker Cloudflare Pages empacotado** |

---

## 4. Guia de Continuidade para Outros Computadores

Para dar continuidade à execução do plano mestre em qualquer outra estação de trabalho, siga o guia normativo registrado em:
📄 [`docs/specs/WAESY_MASTER_REENGENHARIA_VISUAL_E_ARQUITETURA_EXECUCAO.md`](file:///c:/Users/Eduardo%20Antônio%20Ramo/Documents/waesy/docs/specs/WAESY_MASTER_REENGENHARIA_VISUAL_E_ARQUITETURA_EXECUCAO.md)

### Próximos Marcos:
- **Marco M2:** Propagação da alternância de visualizações (Tabela, Kanban, Lista) nos módulos `Agenda`, `Clientes/CRM`, `Pedidos` e `Tarefas`.
- **Marco M3:** Saneamento de componentes estáticos, vitrines dinâmicas e persistência real de WMS/KDS.
- **Marco M4:** Refinamento mobile-native, bottom sheets 100dvh e eliminação de nós redundantes de DOM via `useWindowSizeClass()`.
- **Marco M5:** Quality Gates finais de produção e homologação.
