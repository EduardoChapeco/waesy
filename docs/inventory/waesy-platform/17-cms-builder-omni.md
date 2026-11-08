# 17 — Inventário do CMS Visual e Builder Omni

## 1. Princípio de Design Controlado
O Builder Omni é um **CMS visual modular de design controlado**, orientado a blocos pré-configurados de alto padrão estético. Ele rejeita coordenadas livres e posicionamento absoluto não-responsivo (estilo Webflow/Wix Studio desestruturado) em favor de uma árvore canônica serializável de blocos responsivos.

## 2. Catálogo de 103 Blocos Registrados (`src/components/builder/registry.ts`)
- **Hero & Cabeçalhos (8 blocos):** `hero_minimal_split`, `hero_fullscreen_glow`, `hero_interactive_carousel`, etc.
- **Gastronomia (7 blocos):** `gastro_menu_grid`, `gastro_highlight_card`, `gastro_category_carousel`, etc.
- **Comércio & Vitrine (8 blocos):** `commerce_products_grid`, `commerce_featured_rail`, etc.
- **Turismo & Viagens (12 blocos):** `tourism_destinations_grid`, `tourism_package_card`, `tourism_departures_strip`, etc.
- **Vitrine App & Mobile Native (16 blocos):** `vitrine_ifood_header`, `vitrine_lateral_drawer`, `vitrine_coupon_strip`, `vitrine_buttons_dock`, etc.
- **Mídia & Vídeo (11 blocos):** `media_fluid_video`, `media_story_viewer`, etc.
- **Serviços & Captura (14 blocos):** `contact_form_direct`, `interactive_quote_calculator`, `interactive_lead_quiz_flow`, etc.
- **Demais Categorias (27 blocos):** Prova social, depoimentos, preços, FAQ, rodapé e bio-links.

## 3. Matriz de 15 Templates Canônicos por Nicho
1. `template_ifood_delivery_showcase` (Delivery estilo iFood).
2. `template_waesy_super_vitrine` (Super Vitrine Multilocal).
3. `template_ifood_delivery_vitrine` (Mercado & Conveniência).
4. `template_classifieds_portal_vitrine` (Portal de Veículos e Imóveis).
5. `template_social_creator_store` (Social Commerce & Reels).
6. `template_legal_jus` (Escritórios Jurídicos e Advocacia).
7. `template_gastronomy` (Restaurantes e Gastronomia Autoral).
8. `template_tourism` (Agências de Viagens e Operadoras).
9. `template_creators` (Criadores de Conteúdo e Cursos).
10. `template_real_estate` (Imóveis e Temporada).
11. `template_services_wellness` (Saúde, Estética e Bem-estar).
12. `template_creator_biolink` (Link na Bio Pro).
13. `template_clinic_premium` (Clínicas e Consultórios).
14. `template_dark_kitchen` (Delivery e Dark Kitchens).
15. `template_editorial_news` (Portais de Notícias Regionais).

## 4. Isolamento Transacional de Rascunho vs Publicação
- **Edição:** Persiste no campo `settings.omni_page_draft` via `saveOmniPageDocumentDraft`.
- **Publicação:** Salva em `settings.omni_page_published`, gera snapshot imutável em `omni_document_versions` e aciona rollback via `restoreOmniDocumentVersion`.
