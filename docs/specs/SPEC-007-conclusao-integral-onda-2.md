# SPEC-007 — Conclusão Integral da Onda 2: Reconexão e Unificação dos 39 Componentes Especializados

## 1. Metadados e Contexto
- **Data:** 2026-10-01
- **Autor:** Agente Engenheiro de Plataforma (Antigravity)
- **Status:** APROVADA
- **Escopo:** Fechamento dos 39 gaps restantes da Onda 2 (`melhoria/06-waves.md` e `melhoria/05-ledger.json`).
- **Invariantes:**
  - Zero novas violações no Design Lint (`scripts/design-lint.mjs --ratchet` <= 38.424).
  - Zero erros de compilação TypeScript (`npm run typecheck` Exit Code 0).
  - Alvos de toque móveis >= 44px (`min-h-11`).
  - Silêncio visual e conformidade estrita com `AGENTS.md` B.8 (proibido componentes duplicados, cores arbitrárias ou classes mágicas).
  - Zero mocks: todos os fluxos conectados ao banco de dados e BFF reais.

---

## 2. Requisitos em Sintaxe EARS

### 2.1 Requisitos Ubíquos (Sempre Ativos)
- **REQ-001 (Rastreabilidade e Conexão de UI):** Todos os 39 componentes especializados da biblioteca devem ser importados, re-exportados em pontos de entrada canônicos ou montados diretamente em rotas do TanStack Router.
- **REQ-002 (Preservação de Tipagem Forte):** Nenhuma integração deve degradar assinaturas TypeScript para `any` ou ignorar props requeridas.
- **REQ-003 (Conformidade com Silêncio Visual):** Toda gaveta, modal ou componente integrado deve manter estética sóbria Apple HIG / Linear, sem ruído técnico ou títulos compostos.

### 2.2 Requisitos Orientados a Eventos (When... Then...)
- **REQ-004 (Visualização de Detalhes de Embarque no Turismo):**
  - *When* o operador clicar em um cartão de embarque na visão Kanban de `workspace.turismo.embarques.tsx`;
  - *Then* o sistema deve abrir o painel lateral `CardDetailPanel`, permitindo editar checklist, passageiros, documentos e companhias aéreas com persistência em tempo real.
- **REQ-005 (Estúdio de Vouchers na Operação Turística):**
  - *When* o operador de turismo acessar a tela de vouchers (`workspace.turismo.vouchers.index.tsx`);
  - *Then* o sistema deve disponibilizar o `VoucherStudio` para pré-visualização e emissão canônica de vouchers.
- **REQ-006 (Radar de Passageiros em Tempo Real):**
  - *When* a tela de radar turístico for acessada em `workspace.turismo.radar.tsx`;
  - *Then* o componente `RadarMapWidget` deve exibir os viajantes ativos com geolocalização e status de itinerário.
- **REQ-007 (Importador Inteligente de Roteiros):**
  - *When* o gestor criar cotações de turismo em `workspace.turismo.cotacoes.tsx`;
  - *Then* o banner de importação rápida `TravelAiImporterBanner` deve ser disponibilizado para conversão de pacotes.
- **REQ-008 (Gestão de Eventos e Ingressos):**
  - *When* a rota de eventos (`workspace.eventos.index.tsx`) for carregada;
  - *Then* os módulos `EventoLoja` e `TicketPreview` devem ser integrados para configuração e pré-visualização de lotes.
- **REQ-009 (Painel de Ganhos do Entregador e Ação Rápida de Mobilidade):**
  - *When* o condutor ou prestador acessar `_store.conta.mobilidade.tsx`;
  - *Then* o painel de rendimentos `CourierEarningsPanel` e o botão de acionamento rápido `MobilityQuickButton` devem ser renderizados com métricas reais.
- **REQ-010 (Gerador de Currículo no Perfil Profissional):**
  - *When* o usuário acessar seu perfil ou aba de currículo em `_store.conta.curriculo.tsx`;
  - *Then* o `CurriculoGeneratorModal` deve permitir compor e exportar currículos formatados.
- **REQ-011 (Kanban Expandido e Cabeçalho Canônico no Workspace):**
  - *When* visões tabulares e de processo forem abertas no workspace;
  - *Then* `FullViewportKanban`, `ModuleActionHeader` e `SocialStudioModal` devem servir como primitivas estruturadas de governança.
- **REQ-012 (Laboratório de Simulação e Arquitetura de Squads):**
  - *When* os módulos de IA, squads e simulação forem carregados (`workspace.simlab.tsx` e `workspace.squads.index.tsx`);
  - *Then* os componentes `SimLabResearchPanel`, `SimlabReviewPanel` e `SquadArchitectSheet` devem compor os fluxos de desenho e teste.
- **REQ-013 (Estúdio de Motion, Carrossel e Vídeo):**
  - *When* o operador acessar o estúdio criativo em `workspace.studio.tsx`;
  - *Then* `CarouselWizardModal`, `MotionStudioPropsPanel`, `MotionStudioViewport` e `VideoStudioEditor` devem fornecer a suíte visual completa.
- **REQ-014 (Comunidade, Histórias e Docas Sociais):**
  - *When* o feed comunitário for acessado em `_store.comunidade.tsx`;
  - *Then* `FeedBannerBlock`, `FloatingCommunityDock`, `StoryRail`, `SuggestedFriendsBlock`, `ThumbnailPreviewRail` e `MomentsStatusPicker` devem gerenciar a experiência social.
- **REQ-015 (Componentes de Apresentação e Cabeçalhos Públicos):**
  - *When* o storefront ou páginas públicas forem navegadas;
  - *Then* `BottomNav`, `MasterHeroCards`, `PostThemeSelector`, `PresentationRenderer`, `ProductOptionsCustomizer`, `PublicFooter`, `PublicHeader` e `LaunchHomeView` devem ser expostos e consumidos canonicamente.
- **REQ-016 (Shell e Barra de Contexto Administrativo):**
  - *When* a área administrativa ou layout global for renderizado;
  - *Then* `AdminShell`, `AdminContextualBar`, `ContentCanvas` e `GlobalRail` devem prover a estrutura de navegação e trilhos.

---

## 3. Matriz dos 39 Gaps a Fechar

| ID | Módulo | Componente | Rota / Ponto Canônico de Integração |
|---|---|---|---|
| GAP-006 | admin | `admin-shell.tsx` | `src/routes/admin.tsx` |
| GAP-013 | commerce | `bottom-nav.tsx` | `src/components/commerce/index.ts` / storefront |
| GAP-019 | commerce | `master-hero-cards.tsx` | `src/components/commerce/index.ts` |
| GAP-022 | commerce | `post-theme-selector.tsx` | `src/components/commerce/index.ts` |
| GAP-023 | commerce | `presentation-renderer.tsx` | `src/components/commerce/index.ts` |
| GAP-024 | commerce | `product-options-customizer.tsx` | `src/components/commerce/index.ts` |
| GAP-025 | commerce | `public-footer.tsx` | `src/components/commerce/index.ts` |
| GAP-026 | commerce | `public-header.tsx` | `src/components/commerce/index.ts` |
| GAP-030 | community | `feed-banner-block.tsx` | `src/routes/_store.comunidade.tsx` |
| GAP-031 | community | `floating-community-dock.tsx` | `src/routes/_store.comunidade.tsx` |
| GAP-032 | community | `story-rail.tsx` | `src/routes/_store.comunidade.tsx` |
| GAP-033 | community | `suggested-friends-block.tsx` | `src/routes/_store.comunidade.tsx` |
| GAP-034 | community | `thumbnail-preview-rail.tsx` | `src/routes/_store.comunidade.tsx` |
| GAP-035 | courier | `courier-earnings-panel.tsx` | `src/routes/_store.conta.mobilidade.tsx` |
| GAP-037 | eventos | `evento-loja.tsx` | `src/routes/workspace.eventos.index.tsx` |
| GAP-038 | eventos | `ticket-preview.tsx` | `src/routes/workspace.eventos.index.tsx` |
| GAP-039 | landing | `launch-home-view.tsx` | `src/components/landing/index.ts` |
| GAP-041 | mobility | `mobility-quick-button.tsx` | `src/routes/_store.conta.mobilidade.tsx` |
| GAP-044 | profile | `curriculo-generator-modal.tsx` | `src/routes/_store.conta.curriculo.tsx` |
| GAP-045 | shell | `admin-contextual-bar.tsx` | `src/routes/admin.tsx` |
| GAP-046 | shell | `content-canvas.tsx` | `src/components/shell/index.ts` |
| GAP-047 | shell | `global-rail.tsx` | `src/components/shell/index.ts` |
| GAP-048 | simlab | `simlab-research-panel.tsx` | `src/routes/workspace.simlab.tsx` |
| GAP-049 | simlab | `simlab-review-panel.tsx` | `src/routes/workspace.simlab.tsx` |
| GAP-050 | social | `moments-status-picker.tsx` | `src/routes/_store.comunidade.tsx` |
| GAP-051 | squads | `squad-architect-sheet.tsx` | `src/routes/workspace.squads.index.tsx` |
| GAP-052 | studio | `carousel-wizard-modal.tsx` | `src/routes/workspace.studio.tsx` |
| GAP-053 | studio | `motion/motion-props-panel.tsx` | `src/routes/workspace.studio.tsx` |
| GAP-054 | studio | `motion/motion-viewport.tsx` | `src/routes/workspace.studio.tsx` |
| GAP-055 | studio | `video-studio-editor.tsx` | `src/routes/workspace.studio.tsx` |
| GAP-056 | tourism | `boarding/CardDetailPanel.tsx` | `src/routes/workspace.turismo.embarques.tsx` |
| GAP-057 | tourism | `groups/new-group-tour-sheet.tsx` | `src/routes/workspace.turismo.excursoes.tsx` |
| GAP-058 | tourism | `travel-ai-importer-banner.tsx` | `src/routes/workspace.turismo.cotacoes.tsx` |
| GAP-059 | tourism | `radar/radar-map-widget.tsx` | `src/routes/workspace.turismo.radar.tsx` |
| GAP-060 | tourism | `suppliers/supplier-autocomplete.tsx` | `src/routes/workspace.turismo.fornecedores.tsx` |
| GAP-061 | tourism | `vouchers/VoucherStudio.tsx` | `src/routes/workspace.turismo.vouchers.index.tsx` |
| GAP-072 | workspace | `kanban/full-viewport-kanban.tsx` | `src/routes/workspace.crm.tsx` |
| GAP-073 | workspace | `module-action-header.tsx` | `src/components/workspace/workspace-shell.tsx` |
| GAP-074 | workspace | `social-studio-modal.tsx` | `src/routes/workspace.posts.tsx` |

---

## 4. Critérios de Aceite e Evidência Esperada
- [ ] TypeScript compila com 0 erros (`npm run typecheck` Exit Code 0).
- [ ] Design Lint catraca aprovada com <= 38.424 violações.
- [ ] 100% dos 39 gaps atualizados para `RESOLVIDO` em `melhoria/05-ledger.json`.
- [ ] `melhoria/_estado.md` marcando 244/244 gaps (100% de conclusão de todas as 4 Ondas).
- [ ] Registro canônico em `docs/design/DECISIONS.md`.
