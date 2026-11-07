# Inventário de Design Lint — 2026-11-03

Fonte: `lintSource` de `scripts/design-lint.mjs` sobre 2592 arquivos de `src/`. Detalhe completo em `design-lint-inventory.csv`.

## Totais

| Total | P0 | P1 | P2 | P3 | Arquivos com débito |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 754 | 0 | 730 | 22 | 2 | 248 |

## Por regra

| Regra | Sev | Ocorrências | Descrição | Arquivos |
| :--- | :--- | :--- | :--- | :--- |
| DL-01 | P1 | 436 | Cor hexadecimal literal "…" fora da camada de token. | 110 |
| DL-02 | P1 | 140 | Classe arbitrária com colchetes "…". Use tokens canônicos. | 72 |
| DL-05 | P1 | 51 | Atributo style inline contendo propriedades visuais proibidas. | 27 |
| DL-18 | P1 | 47 | Cor literal hardcoded "…". Use tokens semânticos text-foreground/bg-background. | 36 |
| DL-12 | P1 | 27 | Listagem de dados sem renderização condicional de estado vazio (Empty State). | 27 |
| DL-11 | P1 | 15 | Superfície de consulta assíncrona sem verificação de isLoading ou componente Skeleton. | 15 |
| DL-07 | P2 | 9 | Sombra decorativa "…" em superfície de aplicação. Sombras restritas a overlays. | 2 |
| DL-13 | P1 | 9 | Superfície assíncrona sem captura e diagnóstico de erro (isError / ErrorBoundary). | 9 |
| DL-29 | P2 | 6 | Grid de 3 ou mais colunas "…" aplicado sem prefixo responsivo (sm:/md:/lg:), quebrando telas móveis. | 5 |
| DL-08 | P2 | 6 | Gradiente decorativo "…" em superfície utilitária de aplicação. | 5 |
| DL-33 | P1 | 5 | Paleta Tailwind crua "…". Use os tokens semânticos warning e warning-strong. | 3 |
| DL-30 | P3 | 2 | Overflow horizontal "…" em superfície de aplicação fora de tabela/carrossel. | 2 |
| DL-24 | P2 | 1 | Barra fixa inferior sem folga de conteúdo (pb-16+ / paddingBottom) para evitar sobreposição. | 1 |

## Por módulo

| Módulo | Ocorrências |
| :--- | :--- |
| components/app | 268 |
| services | 170 |
| lib | 82 |
| routes/workspace | 54 |
| components/tourism | 49 |
| components/ui | 46 |
| routes/store | 37 |
| routes/admin | 14 |
| components/builder | 8 |
| hooks | 7 |
| routes/api | 6 |
| styles | 6 |
| routes/other | 4 |
| core | 2 |
| components/chat | 1 |

## Top 60 arquivos

| Arquivo | Ocorrências |
| :--- | :--- |
| `src/services/kanban-config.functions.ts` | 20 |
| `src/services/machine.functions.ts` | 18 |
| `src/lib/agency-context.tsx` | 15 |
| `src/lib/financial-receipt-canvas.ts` | 15 |
| `src/components/commerce/dynamic-sections/countdown-timer.tsx` | 13 |
| `src/services/theme-factory.test.ts` | 13 |
| `src/components/social-templates/imoveis/RealEstateSeasonRentalGrid.tsx` | 12 |
| `src/components/workspace/kanban/kanban-column-customizer-modal.tsx` | 12 |
| `src/services/master.functions.ts` | 12 |
| `src/components/social-templates/turismo/TravelPassportBoarding.tsx` | 11 |
| `src/components/tourism/proposals/templates/TemplateEditorialFlat.tsx` | 11 |
| `src/lib/builder/home-templates-library.ts` | 11 |
| `src/services/squad-content.functions.ts` | 11 |
| `src/components/commerce/dynamic-sections/flash-sale-hero.tsx` | 10 |
| `src/components/ui/sonner.tsx` | 9 |
| `src/routes/workspace.contratos.$id.editor.tsx` | 9 |
| `src/services/onboarding-e2e-verification.test.ts` | 9 |
| `src/components/social-templates/varejo/RetailSupermarket2x1Promo.tsx` | 8 |
| `src/components/social-templates/varejo/RetailSupermarketMeatPromo.tsx` | 8 |
| `src/components/tourism/promotional-flyer/travel-promo-flyer-modal.tsx` | 8 |
| `src/components/ui/sidebar.tsx` | 8 |
| `src/lib/error-page.ts` | 8 |
| `src/routes/workspace.estudio.index.tsx` | 8 |
| `src/services/ai-builder-generator.ts` | 8 |
| `src/components/studio/slide-renderer.tsx` | 7 |
| `src/components/tourism/proposals/templates/TemplateExecutivo.tsx` | 7 |
| `src/lib/builder/builder-registry.ts` | 7 |
| `src/lib/builder/section-templates.ts` | 7 |
| `src/services/builder-project-generator.ts` | 7 |
| `src/services/seven-sins-simlab.functions.ts` | 7 |
| `src/components/builder/omni-builder.test.ts` | 6 |
| `src/components/contracts/signature-positioner-canvas.tsx` | 6 |
| `src/components/tourism/proposals/templates/index.ts` | 6 |
| `src/components/tourism/proposals/templates/TemplateGroupCatalog.tsx` | 6 |
| `src/components/ui/chart.tsx` | 6 |
| `src/routes/admin-master.integracoes.tsx` | 6 |
| `src/routes/api.pwa.manifest[.]json.ts` | 6 |
| `src/routes/workspace.configuracoes.pwa.tsx` | 6 |
| `src/services/pwa.functions.ts` | 6 |
| `src/styles.css` | 6 |
| `src/components/commerce/dynamic-sections/hero-carousel.tsx` | 5 |
| `src/components/pwa/PwaSplashPreview.tsx` | 5 |
| `src/components/social-templates/turismo/TravelCurvedEditorial.tsx` | 5 |
| `src/components/ui/image-cropper-dialog.tsx` | 5 |
| `src/routes/workspace.marketing.fidelidade.tsx` | 5 |
| `src/routes/_store.cadastro.tsx` | 5 |
| `src/routes/_store.pedido.$publicToken.confirmacao.tsx` | 5 |
| `src/services/market-radar.test.ts` | 5 |
| `src/services/multimodal-onboarding.test.ts` | 5 |
| `src/services/personal-finance.functions.ts` | 5 |
| `src/services/tasks.functions.ts` | 5 |
| `src/services/__tests__/financial-ledger-and-unified-feed.test.ts` | 5 |
| `src/components/classifieds/convenience-showcase-view.tsx` | 4 |
| `src/components/commerce/request-quote-modal.tsx` | 4 |
| `src/components/finance/financial-cards-loans.test.tsx` | 4 |
| `src/components/monetization/pro-upgrade-paywall-modal.tsx` | 4 |
| `src/components/pwa/AppHomeFeed.tsx` | 4 |
| `src/components/state/loading.tsx` | 4 |
| `src/components/studio/video-studio-timeline.tsx` | 4 |
| `src/components/ui/alert-dialog.tsx` | 4 |

## Top 10 arquivos por regra

### DL-01 (P1) — Cor hexadecimal literal "…" fora da camada de token.

| Arquivo | Ocorrências |
| :--- | :--- |
| `src/services/kanban-config.functions.ts` | 20 |
| `src/services/machine.functions.ts` | 18 |
| `src/lib/agency-context.tsx` | 15 |
| `src/lib/financial-receipt-canvas.ts` | 15 |
| `src/services/theme-factory.test.ts` | 13 |
| `src/services/master.functions.ts` | 12 |
| `src/components/workspace/kanban/kanban-column-customizer-modal.tsx` | 11 |
| `src/lib/builder/home-templates-library.ts` | 11 |
| `src/services/squad-content.functions.ts` | 11 |
| `src/routes/workspace.contratos.$id.editor.tsx` | 9 |

### DL-02 (P1) — Classe arbitrária com colchetes "…". Use tokens canônicos.

| Arquivo | Ocorrências |
| :--- | :--- |
| `src/components/ui/sonner.tsx` | 9 |
| `src/components/ui/sidebar.tsx` | 8 |
| `src/components/social-templates/imoveis/RealEstateSeasonRentalGrid.tsx` | 6 |
| `src/components/social-templates/turismo/TravelPassportBoarding.tsx` | 4 |
| `src/components/social-templates/varejo/RetailSupermarket2x1Promo.tsx` | 4 |
| `src/components/social-templates/varejo/RetailSupermarketMeatPromo.tsx` | 4 |
| `src/components/state/loading.tsx` | 4 |
| `src/components/ui/alert-dialog.tsx` | 4 |
| `src/routes/_store.cadastro.tsx` | 4 |
| `src/routes/_store.match-time.tsx` | 4 |

### DL-05 (P1) — Atributo style inline contendo propriedades visuais proibidas.

| Arquivo | Ocorrências |
| :--- | :--- |
| `src/components/commerce/dynamic-sections/countdown-timer.tsx` | 5 |
| `src/components/pwa/PwaSplashPreview.tsx` | 5 |
| `src/components/tourism/proposals/templates/TemplateEditorialFlat.tsx` | 5 |
| `src/components/commerce/dynamic-sections/flash-sale-hero.tsx` | 4 |
| `src/components/studio/slide-renderer.tsx` | 4 |
| `src/components/tourism/proposals/templates/TemplateGroupCatalog.tsx` | 3 |
| `src/components/commerce/post-theme-selector.tsx` | 2 |
| `src/components/contracts/signature-positioner-canvas.tsx` | 2 |
| `src/components/pwa/AppHomeFeed.tsx` | 2 |
| `src/components/pwa/MobileBottomNav.tsx` | 2 |

### DL-18 (P1) — Cor literal hardcoded "…". Use tokens semânticos text-foreground/bg-background.

| Arquivo | Ocorrências |
| :--- | :--- |
| `src/components/classifieds/convenience-showcase-view.tsx` | 4 |
| `src/routes/admin-master.usuarios.tsx` | 3 |
| `src/routes/_store.mercado.tsx` | 3 |
| `src/components/events/event-story-viewer-modal.tsx` | 2 |
| `src/routes/_store.criar-negocio.avancado.tsx` | 2 |
| `src/routes/_store.criar-negocio.tsx` | 2 |
| `src/routes/_store.explorar.tsx` | 2 |
| `src/components/admin/builder/BuilderCodeExplorerModal.tsx` | 1 |
| `src/components/booking/booking-detail-mobile.tsx` | 1 |
| `src/components/commerce/banner-hero-carousel.tsx` | 1 |

### DL-12 (P1) — Listagem de dados sem renderização condicional de estado vazio (Empty State).

| Arquivo | Ocorrências |
| :--- | :--- |
| `src/components/builder/blocks/vitrine-app-blocks.tsx` | 1 |
| `src/components/commerce/dynamic-sections/store-contact.tsx` | 1 |
| `src/components/commerce/dynamic-sections/store-hours.tsx` | 1 |
| `src/components/commerce/product-telemetry.tsx` | 1 |
| `src/components/community/media-lightbox-modal.tsx` | 1 |
| `src/components/community/post-card.tsx` | 1 |
| `src/components/jobs/job-apply-sheet.tsx` | 1 |
| `src/components/notifications/notifications-popover.tsx` | 1 |
| `src/components/pos/product-modifiers-modal.tsx` | 1 |
| `src/components/tourism/vouchers/templates/template-voucher-story.tsx` | 1 |

### DL-11 (P1) — Superfície de consulta assíncrona sem verificação de isLoading ou componente Skeleton.

| Arquivo | Ocorrências |
| :--- | :--- |
| `src/components/commerce/product-telemetry.tsx` | 1 |
| `src/components/commerce/publish-sheet.tsx` | 1 |
| `src/components/community/media-lightbox-modal.tsx` | 1 |
| `src/components/landing/enterprise-landing-view.tsx` | 1 |
| `src/components/notifications/company-notifications-bell.tsx` | 1 |
| `src/components/shell/utility-cluster.tsx` | 1 |
| `src/components/suppliers/SupplierAutocomplete.tsx` | 1 |
| `src/components/tourism/studio/studio-sidebar-editor.tsx` | 1 |
| `src/components/tourism/studio/StudioMapWidget.tsx` | 1 |
| `src/routes/admin-master.portal-completo.tsx` | 1 |

### DL-07 (P2) — Sombra decorativa "…" em superfície de aplicação. Sombras restritas a overlays.

| Arquivo | Ocorrências |
| :--- | :--- |
| `src/styles.css` | 6 |
| `src/components/admin/builder/animation-inspector-phase7.test.ts` | 3 |

### DL-13 (P1) — Superfície assíncrona sem captura e diagnóstico de erro (isError / ErrorBoundary).

| Arquivo | Ocorrências |
| :--- | :--- |
| `src/components/commerce/dynamic-sections/booking-calendar.tsx` | 1 |
| `src/components/commerce/publish-sheet.tsx` | 1 |
| `src/components/common/protected-contact-button.tsx` | 1 |
| `src/components/notifications/company-notifications-bell.tsx` | 1 |
| `src/components/pos/product-modifiers-modal.tsx` | 1 |
| `src/components/stories/contextual-stories-rail.tsx` | 1 |
| `src/components/suppliers/SupplierAutocomplete.tsx` | 1 |
| `src/components/tourism/proposals/ProposalStudio.tsx` | 1 |
| `src/components/workspace/crm/store-personas-matrix.tsx` | 1 |

### DL-29 (P2) — Grid de 3 ou mais colunas "…" aplicado sem prefixo responsivo (sm:/md:/lg:), quebrando telas móveis.

| Arquivo | Ocorrências |
| :--- | :--- |
| `src/components/commerce/supermarket/ProductCatalogPricingSheet.tsx` | 2 |
| `src/components/admin/builder/PhotoStudioModal.tsx` | 1 |
| `src/components/commerce/supermarket/SupermarketBottomNav.tsx` | 1 |
| `src/components/home/HomeMobileNativeApp.tsx` | 1 |
| `src/routes/_store.conta.pedidos.index.tsx` | 1 |

### DL-08 (P2) — Gradiente decorativo "…" em superfície utilitária de aplicação.

| Arquivo | Ocorrências |
| :--- | :--- |
| `src/components/social-templates/turismo/TravelPassportBoarding.tsx` | 2 |
| `src/components/commerce/supermarket/SupermarketHeroContinuousCarousel.tsx` | 1 |
| `src/components/social-templates/RetailPromoTemplate.tsx` | 1 |
| `src/components/social-templates/turismo/TravelCurvedEditorial.tsx` | 1 |
| `src/components/social-templates/turismo/TravelImmersiveStory.tsx` | 1 |

### DL-33 (P1) — Paleta Tailwind crua "…". Use os tokens semânticos warning e warning-strong.

| Arquivo | Ocorrências |
| :--- | :--- |
| `src/services/cross-module-crm-integrations.test.ts` | 2 |
| `src/services/destination-intelligence.test.ts` | 2 |
| `src/components/community/community-feed-experience.test.tsx` | 1 |

### DL-30 (P3) — Overflow horizontal "…" em superfície de aplicação fora de tabela/carrossel.

| Arquivo | Ocorrências |
| :--- | :--- |
| `src/components/builder/vitrine-blocks.test.tsx` | 1 |
| `src/services/cross-module-crm-integrations.test.ts` | 1 |

### DL-24 (P2) — Barra fixa inferior sem folga de conteúdo (pb-16+ / paddingBottom) para evitar sobreposição.

| Arquivo | Ocorrências |
| :--- | :--- |
| `src/components/commerce/supermarket/SupermarketBottomNav.tsx` | 1 |

## P0 (bloqueia entrega)

Nenhuma ocorrência.
