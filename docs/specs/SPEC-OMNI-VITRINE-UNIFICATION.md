# SPEC-OMNI-VITRINE-UNIFICATION — Unificação Canônica de Vitrines no Design System e Paridade Total no Omni Builder

- **ID:** SPEC-OMNI-VITRINE-UNIFICATION
- **Data:** 2026-10-27
- **Status:** Aprovada para Execução
- **Escopo:** `src/design-system/`, `src/types/omni-builder.ts`, `src/components/builder/`, `src/lib/builder/`, `src/routes/workspace.builder.$documentId.editor.tsx`, `src/routes/workspace.marketing.vitrine.tsx`, `src/routes/_store.paginas.$slug.tsx`, `src/routes/_store.loja.$slug.tsx`, `src/components/commerce/canonical-store-profile-view.tsx`, `src/services/builder.functions.ts`

---

## 1. Contexto e Objetivo

Os elementos nativos de vitrine construídos para o aplicativo Waesy (`MetamorphicBannerSlider`, `NoorNativeCategoryDock`, `IFoodSquareCategoryButton`, `BentoGridTetris`, `PromoCouponBanner`, `DualLineFilterPills`, `CuratedVerticalRails`, `HomePostsShowcase`, `PromotionalFlyersRail`, `HotpagesRail`, `OfferCard` + `HitsLeadCard`, `StoreCard`, trilhos de classificados, vagas e eventos) operavam desacoplados do `src/design-system/` e ausentes do `Omni Builder` (`OmniEditor` / `OmniPageRenderer`).

Esta especificação estabelece:
1. **Canonicidade no Design System (`src/design-system/vitrine/`):** Todo elemento de vitrine passa a residir e ser exportado pelo Design System como primitivo parametrizável, sem valores hardcoded, reutilizável tanto pelas vitrines do App quanto pelo Omni Builder.
2. **Paridade Bloco a Bloco no Omni Builder:** Qualquer pessoa ou lojista consegue construir páginas e vitrines idênticas ao aplicativo Waesy usando o Omni Builder, com edição completa item a item.
3. **Design Bidirecional Real (Mobile vs Desktop):** Suporte a mídia dupla (`imageMobileUrl` e `imageDesktopUrl` com `BidirectionalMediaUploader`), proporções independentes por dispositivo, modos de exibição independentes (ex.: trilho horizontal no mobile e grade no desktop), visibilidade por dispositivo (`all`, `mobile_only`, `desktop_only`) e contexto de viewport real no preview móvel do `OmniEditor` (`BuilderViewportProvider`).
4. **Conexões Dinâmicas do Ecossistema:** Hidratação de dados reais no editor e nas páginas públicas para produtos, categorias, coleções, classificados (`ads`), posts sociais (`posts`), encartes (`flyers`), vagas (`jobs`), eventos (`events`), banners e diretório de lojas (`stores`), além de modo manual/curado.
5. **Templates Prontos de Paridade App:** Novos templates prontos auditáveis e livres de dados sintéticos bloqueantes (`studio-template-audit.ts`).

---

## 2. Requisitos Estruturados (Sintaxe EARS)

### R1 — Primitivos Reutilizáveis no Design System
- **WHEN** qualquer superfície da plataforma (Home do App, Perfil de Loja ou Omni Builder) renderizar banners, carrosséis de botões, grades Bento/Tetris, carrosséis verticais, prateleiras de produtos, vitrines de classificados, streams de posts sociais ou trilhos do ecossistema, **THE SYSTEM SHALL** consumir os componentes canônicos exportados por `src/design-system/index.ts` (`src/design-system/vitrine/`).
- **THE SYSTEM SHALL NOT** conter URLs hardcoded de bancos de imagem (Unsplash/Pexels), estrelas falsas, contadores fictícios ou textos de fallback enganosos (`B.8`, `B.33`).

### R2 — Paridade Bidirecional Mobile vs Desktop no Omni Builder
- **WHILE** o operador estiver com o preview do `OmniEditor` em modo `mobile`, **THE SYSTEM SHALL** prover `BuilderViewportProvider` forçando `sizeClass = "compact"` para que todos os blocos bidirecionais renderizem exatamente a geometria, proporção e mídia mobile dentro do quadro de 390px, sem duplicação de DOM (`B.42`).
- **WHERE** um bloco possuir mídia ou layout configurável por dispositivo, **THE SYSTEM SHALL** permitir editar separadamente `imageMobileUrl` e `imageDesktopUrl` (via `BidirectionalMediaUploader`), `mobileAspectRatio` e `desktopAspectRatio`, `mobileLayout` e `desktopLayout`, `mobileColumns` e `desktopColumns`, e `deviceVisibility` (`all` | `mobile_only` | `desktop_only`).

### R3 — Catálogo Completo de Blocos de Vitrine no Omni Builder
- **WHEN** o usuário abrir o catálogo de adição de seções no `OmniEditor`, **THE SYSTEM SHALL** disponibilizar e renderizar com edição 100% parametrizada os seguintes blocos canônicos:
  1. `vitrine_metamorphic_banner`: Slider/Banner metamórfico com suporte a `slim` (28:9), `ultrawide` (32:9), `ifood` (21:9), `cinema` (16:9), `duo` (2x 16:9 lado a lado no desktop), `classic` (4:3), `square` (1:1), `vertical` (4:5) e `moment` (9:16), vídeo `.mp4`, overlay opcional, badge, título, CTA e mídia dupla mobile/desktop.
  2. `vitrine_bento_tetris`: Mosaico Bento/Tetris denso (`grid-flow-dense`) com controle individual por card de `spanX` (1..4), `spanY` (1..2), mídia mobile/desktop, tag, título, subtítulo e destino (`B.32`, `B.45`).
  3. `vitrine_coupon_strip`: Faixa de cupom promocional estilo iFood/App com código copiável em 1 clique, selo, validade opcional e link de destino.
  4. `vitrine_buttons_dock`: Carrossel/Grade de botões e categorias 100% editáveis suportando modos `noor_dock` (scroll horizontal elástico), `ifood_grid` (grade 4x2 mobile / N colunas desktop), `squircle_pills` (pílulas compactas), `action_cards` (grade 2x2 estilo `TetrisActionGrid`) e `dual_filter_pills` (dupla linha de filtros), com ícone, imagem customizada mobile/desktop, cor de destaque semântica, badge, formato (`circle`, `squircle`, `pill`) e link via `DestinationPicker`.
  5. `vitrine_vertical_carousel`: Carrossel vertical (`9:16` Stories/Reels, `4:5` Retrato ou `3:4` Encartes/Tabloides) para vídeos curtos, stories interativos, destaques visuais ou encartes promocionais conectados a `flyers` da loja ou itens manuais.
  6. `vitrine_product_shelf`: Carrossel/Grade de ofertas e produtos estilo App (`OfferCard` + `HitsLeadCard` líder opcional) nos modos `horizontal_rail`, `flash_deals`, `grid_4col` e `bento_3`, conectado ao catálogo real (`products`, filtro por categoria/coleção/promoção) ou lista manual curada.
  7. `vitrine_classifieds_rail`: Carrossel/Grade de anúncios e classificados (veículos, imóveis, serviços, pacotes, desapego) conectado aos anúncios reais da loja/região (`classifieds`) com filtro de modalidade/nicho ou itens curados, respeitando isolamento semântico (`B.37`).
  8. `vitrine_social_stream`: Carrossel, Grade 3 colunas ou Stream editorial de publicações sociais (`HomePostsShowcase`), suportando posts reais do mural da loja (`posts`) ou publicações curadas, vídeo nativo `<video>`, carrossel interno 3:4 e cartão tipográfico limpo para posts sem mídia (`B.30`, `B.33`).
  9. `vitrine_ecosystem_rail`: Trilho/Grade dinâmica de módulos do ecossistema conectável a `events` (Agenda & Ingressos), `jobs` (Vagas & Carreiras), `stores` (Lojas & Parceiros com selo honesto `B.33`) ou `hotpages` (Atalhos Editoriais).

### R4 — Inspetor Completo no `OmniEditor`
- **WHEN** qualquer bloco de vitrine estiver selecionado no `OmniEditor`, **THE SYSTEM SHALL** exibir controles completos de edição para cabeçalho, modo de exibição mobile vs desktop, fonte de dados dinâmica vs manual, editor de itens em lista (adicionar, reordenar cima/baixo, duplicar, remover), `BidirectionalMediaUploader` para imagens mobile/desktop e `DestinationPicker` para rotas internas do app, produtos, WhatsApp ou links externos.

### R5 — Hidratação End-to-End e Templates Prontos
- **WHEN** `workspace.builder.$documentId.editor.tsx`, `_store.paginas.$slug.tsx` ou `_store.loja.$slug.tsx` (`CanonicalStoreProfileView`) carregarem um documento Omni, **THE SYSTEM SHALL** hidratar `products`, `categories`, `collections`, `classifieds`, `posts`, `flyers`, `jobs`, `events`, `banners` e `storeData`.
- **WHEN** `auditAllStudioTemplates()` ou `OmniPageDocumentSchema.parse()` forem executados sobre os novos templates prontos, **THE SYSTEM SHALL** aprovar 100% dos templates sem erros de schema ou bloqueios de publicação em templates `ready`.

---

## 3. Invariantes e Gates de Conformidade
- Zero `!important` (`DL-04`), zero hex/rgb literal ou `text-white`/`bg-black` em componentes (`DL-01`, `DL-18`).
- Zero classes arbitrárias entre colchetes (`DL-02`); uso exclusivo de `aspect-banner-*`, `aspect-post-*` e escala modular de 4px (`DL-03`).
- Alvos táteis mínimos de 44x44px (`h-11 min-h-11` / `size-11`, `DL-14`) e anéis `:focus-visible:ring-2` (`DL-15`).
- Nomenclatura de novos arquivos estritamente em `kebab-case` (`scripts/naming-convention-validator.mjs`).
- Zero emojis em código de UI, descrições de blocos, templates ou especificações (`DL-23`).
- Aprovação em `npm run typecheck`, `npx vitest run`, `node scripts/design-lint.mjs --ratchet` e `npm run build`.
