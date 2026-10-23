# TEMPLATE_PREVIEW_BUG_MAP.md — Mapa Forense de Bugs (Template Engine, Niche Engine, Preview & Public Parity)

**Data:** 2026-10-21
**Branch:** `main`
**Baseline SHA:** `58799c00f496dfc2de8e24f2bee9a39892929672`

---

## Sumário Executivo

Esta auditoria forense investigou ponta a ponta a cadeia **UI → STATE → CONTRACT → BFF → SERVICE → DB → RESPONSE → UI → REFRESH → REOPEN** em todas as superfícies de criação, seleção de templates, mudança de nichos, preview Desktop/Mobile, TeteterisGrid e renderização pública:

1. **Classificados Unificados (`/_store/conta/classificados/novo` → `/_store/classificados/$id`)**
2. **Motor Unificado de Anúncios (`ListingFullEditor` / `UnifiedListingEditor` / `ListingTemplateSelector` / `CanonicalListingPreviewFrame` / `CanonicalListingView`)**
3. **Catálogo de Produtos (`workspace.catalogo.produtos.novo` / `ProductPreviewPane` → `/_store/produto/$slug`)**
4. **Omni Builder / Studio Template Factory (`OmniEditor` / `LiveTemplatePreviewModal` / `OmniPageRenderer`)**

---

## Catálogo Detalhado de Bugs

### BUG-01 — Poluição Incondicional de Atributos de Turismo em `livePreviewClassified` e `handlePublish` (Sequestro por `EditorialShowcaseView`)
- **BUG-ID:** `BUG-01`
- **SEVERITY:** `P0`
- **DESCRIPTION:** O objeto `livePreviewClassified` no editor de classificados injeta incondicionalmente `destination_city` (com fallback `"Chapecó"`) e `flight_details` (objeto sempre truthy) em `attributes` para todos os 17 nichos. Além disso, `handlePublish` injeta `story_highlights`, `itinerary_days` e `bio_bullets` na raiz de `attributes` para qualquer nicho. Como `UniversalClassifiedShowcase` e `resolveClassifiedDetailedSpecs` verificam `Boolean(attrs.destination_city || attrs.flight_details)` antes de checar o nicho real, todos os classificados (veículos, imóveis, serviços, vagas, desapego) são interceptados como `viagem/editorial` e renderizam `EditorialShowcaseView` no preview.
- **REPRODUCTION:**
  1. Abrir `/_store/conta/classificados/novo`.
  2. Selecionar o nicho `Veículos` (`veiculo`) ou `Imóveis` (`imovel`).
  3. Observar o painel de Preview Ao Vivo à direita ou no Passo 5.
  4. Clicar nos botões de template (`Auto`, `Imóvel`, `Padrão`).
- **EXPECTED:** O preview deve renderizar a ficha automotiva (`automotivo`), imobiliária (`imobiliario`) ou padrão (`standard`), exibindo especificações do nicho selecionado.
- **ACTUAL:** O preview renderiza sempre `EditorialShowcaseView` (layout de pacote de viagem com "Chapecó", voo e roteiro), ignorando completamente o seletor de templates e suprimindo especificações de veículos/imóveis/serviços.
- **ROOT CAUSE:**
  - `src/routes/_store.conta.classificados.novo.tsx:3653-3692`: `destination_city: travelDestinationCity || locationName || "Chapecó"` e `flight_details: { transport_type: travelTransportType, ... }` atribuídos sem guarda `niche.id === "viagem"`.
  - `src/routes/_store.conta.classificados.novo.tsx:2810-2812`: `story_highlights`, `itinerary_days`, `bio_bullets` atribuídos fora do bloco `if (niche.id === "viagem")`.
  - `src/components/classifieds/universal-classified-showcase.tsx:66-79`: `isTravelOrEditorial` avalia `Boolean(attrs.destination_city || attrs.flight_details)` mesmo quando `niche` é explícito (`veiculo`, `imovel`, `servico`, etc.) ou quando o usuário selecionou outro `template_style`.
  - `src/lib/classifieds/canonical-specs-resolver.ts:83-99`: `isTravel` avalia `Boolean(attrs.destination_city || attrs.flight_details)` sem verificar se `rawNiche` pertence a outro domínio.
- **FILES:**
  - `src/routes/_store.conta.classificados.novo.tsx`
  - `src/components/classifieds/universal-classified-showcase.tsx`
  - `src/lib/classifieds/canonical-specs-resolver.ts`
- **STATE OWNER:** `CreateClassifiedPage` (`niche`, `templateStyle`, `livePreviewClassified`)
- **API:** `upsertClassified` (`src/services/classifieds.functions.ts`)
- **DB:** `public.classifieds.attributes` (JSONB)
- **AFFECTED MODULES:** Editor de Classificados, Preview Lateral, Passo 5 de Revisão, Vitrine Pública `/_store/classificados/$id`, Resolvedor Canônico de Especificações.
- **REGRESSION TEST:** `src/lib/classifieds/template-niche-preview.test.ts` (Casos 1, 2, 3, 6, 7).

---

### BUG-02 — `template_style` Ignorado pelos Renderers Canônicos (`ClassifiedDetailDesktop`, `ClassifiedDetailMobile`, `UniversalClassifiedShowcase`, `CanonicalListingView`)
- **BUG-ID:** `BUG-02`
- **SEVERITY:** `P0`
- **DESCRIPTION:** Ao alternar entre templates (`standard`, `editorial`, `automotivo`, `imobiliario`, `resort_hotel`, `servicos_agenda`, `conveniencia`) no editor ou ao carregar um anúncio salvo, `ClassifiedDetailDesktop` e `ClassifiedDetailMobile` leem `const templateStyle = (classified.attributes?.template_style as string) || "standard"`, mas nunca utilizam `templateStyle` para alterar a estrutura visual, cabeçalho de destaque, ordem de seções ou densidade. Já em `UniversalClassifiedShowcase`, anúncios de `viagem` forçam `EditorialShowcaseView` mesmo quando `template_style === "standard"` ou `"resort_hotel"`. No Motor Unificado (`CanonicalListingView`), `listing.template` não é sequer lido.
- **REPRODUCTION:**
  1. Selecionar nicho `Imóveis` (`imovel`).
  2. Selecionar Template A (`standard`) → observar mockup.
  3. Selecionar Template B (`imobiliario`) → observar mockup.
  4. Voltar para Template A (`standard`).
- **EXPECTED:** Mudança imediata de composição visual entre `standard` (layout clássico balanceado), `imobiliario` (destaque arquitetônico de planta/metragem/custos fixos), `automotivo` (cockpit de telemetria veicular/FIPE/procedência), `resort_hotel` (hospitalidade/check-in/comodidades), `servicos_agenda` (agenda profissional/SLA/credenciais) e `editorial` (narrativa imersiva), sem estado residual ao retornar para `standard`.
- **ACTUAL:** Nenhuma mudança visual entre `standard`, `automotivo`, `imobiliario`, `resort_hotel` e `servicos_agenda`.
- **ROOT CAUSE:**
  - `src/components/classifieds/classified-detail-desktop.tsx:65`: `templateStyle` extraído mas não utilizado na renderização.
  - `src/components/classifieds/classified-detail-mobile.tsx:66`: `templateStyle` extraído mas não utilizado na renderização.
  - `src/components/classifieds/universal-classified-showcase.tsx:66-79`: roteamento ignora `templateStyle` explícito quando `niche === "viagem"` e não propaga variações de template.
  - `src/components/ad-engine/public/canonical-listing-view.tsx`: ignora `listing.template`.
- **FILES:**
  - `src/components/classifieds/universal-classified-showcase.tsx`
  - `src/components/classifieds/classified-detail-desktop.tsx`
  - `src/components/classifieds/classified-detail-mobile.tsx`
  - `src/components/ad-engine/public/canonical-listing-view.tsx`
- **STATE OWNER:** `templateStyle` em `_store.conta.classificados.novo.tsx` / `listing.template` em `UnifiedListing`.
- **API:** `upsertClassified`, `getPublicClassifiedById`, `createUnifiedListing`, `updateUnifiedListing`.
- **DB:** `classifieds.attributes.template_style`, `classifieds.attributes.template_id`, `products.metadata.template_id`.
- **AFFECTED MODULES:** Showcase Público e Preview de Classificados e Ad Engine.
- **REGRESSION TEST:** `src/lib/classifieds/template-niche-preview.test.ts` (Casos 1, 2, 3, 7, 11).

---

### BUG-03 — Dessincronia de Chaves e Catálogo no Motor Unificado (`NICHE_TAXONOMY_REGISTRY` vs `CANONICAL_TEMPLATES_CATALOG`)
- **BUG-ID:** `BUG-03`
- **SEVERITY:** `P0`
- **DESCRIPTION:** Em `src/lib/ad-engine/niche-taxonomy-manifest.ts`, `NICHE_TAXONOMY_REGISTRY` usa chaves no singular (`servico`, `imovel`, `veiculo`, `varejo`, `mercado`, `turismo`) e não inclui `digital` nem `gastronomia`. Porém, `NICHE_KEY_MAP` mapeia aliases para o plural (`servicos`, `imoveis`, `veiculos`, `gastronomia`), que não existem no próprio registry. Além disso, os `allowed_templates` no registry (`retail_ecommerce`, `service_booking`, `real_estate_property`, `vehicle_showroom`) não existem em `CANONICAL_TEMPLATES_CATALOG` (`retail_standard`, `service_schedule`, `real_estate_luxury`, `automotive_deal`, `digital_access`). Como consequência, `listAllowedTemplatesForNiche()` retorna `[]` (array vazio) para `varejo`, `servico`, `imovel` e `veiculo`! Adicionalmente, `nicheConfig.label` é `undefined` em todos os nichos porque o registry define apenas `name`.
- **REPRODUCTION:**
  1. Chamar `listAllowedTemplatesForNiche("varejo")`, `listAllowedTemplatesForNiche("servico")`, `listAllowedTemplatesForNiche("imovel")` ou `listAllowedTemplatesForNiche("veiculo")`.
  2. Renderizar `ListingTemplateSelector` ou `ListingFullEditor` com `niche="retail"` ou `"veiculo"`.
- **EXPECTED:** `listAllowedTemplatesForNiche` deve retornar os templates compatíveis do catálogo para todos os nichos, `normalizeNicheKey` deve resolver qualquer alias (`retail`, `servicos`, `imoveis`, `veiculos`, `travel`, `digital`, `gastronomia`) para uma chave válida do registry, e `label` deve estar presente em 100% dos nichos.
- **ACTUAL:** `listAllowedTemplatesForNiche` retorna `[]` para 4 dos 6 nichos; `NICHE_TAXONOMY_REGISTRY[normalizeNicheKey("services")]` retorna `undefined`; `nicheConfig.label` é `undefined`.
- **ROOT CAUSE:**
  - `src/lib/ad-engine/niche-taxonomy-manifest.ts:39-242`
  - `src/lib/ad-engine/template-metamorphosis.ts:15-103`
  - `src/components/ad-engine/editor/sections/listing-template-selector.tsx:41-125`
  - `src/components/ad-engine/editor/listing-full-editor.tsx:39-145`
- **FILES:**
  - `src/lib/ad-engine/niche-taxonomy-manifest.ts`
  - `src/lib/ad-engine/template-metamorphosis.ts`
  - `src/components/ad-engine/editor/sections/listing-template-selector.tsx`
  - `src/components/ad-engine/editor/listing-full-editor.tsx`
- **STATE OWNER:** `UnifiedListingEditor` / `ListingFullEditor`
- **API:** `createUnifiedListing`, `updateUnifiedListing`
- **DB:** `classifieds.attributes`, `products.metadata`
- **AFFECTED MODULES:** Ad Engine Taxonomy, Template Metamorphosis, Listing Template Selector, Listing Full Editor.
- **REGRESSION TEST:** `src/components/ad-engine/preview/preview.test.ts` (Casos 1, 2, 3, 6, 7, 8).

---

### BUG-04 — Seletor de Templates Sem Filtro por Nicho e Sem Resolução de Incompatibilidade / Sobrescrita na Hidratação
- **BUG-ID:** `BUG-04`
- **SEVERITY:** `P1`
- **DESCRIPTION:** No editor de classificados (`_store.conta.classificados.novo.tsx`), a barra de seleção de templates exibe todos os 6 templates (`Padrão`, `Editorial`, `Auto`, `Imóvel`, `Resort`, `Serviço`) simultaneamente para qualquer nicho, permitindo selecionar `automotivo` em um anúncio de `imovel` ou `vaga`. Além disso, o `useEffect([niche.id])` (linhas 1612–1621) sobrescreve incondicionalmente `templateStyle` na montagem inicial antes ou durante a hidratação de `initialData.attributes.template_style`, ou falha em preservar um template compatível quando o usuário edita um anúncio existente.
- **REPRODUCTION:**
  1. Selecionar nicho `Veículos`, escolher template `Auto` (`automotivo`).
  2. Trocar o nicho para `Imóveis` (`imovel`).
  3. Editar um anúncio salvo de `viagem` que foi salvo com `template_style = "standard"` ou `"resort_hotel"`.
- **EXPECTED:**
  - Cada nicho exibe apenas os templates compatíveis com sua semântica (ex.: `veiculo` → `automotivo`, `standard`, `editorial`; `imovel` → `imobiliario`, `standard`, `editorial`; `viagem` → `editorial`, `resort_hotel`, `standard`).
  - Ao trocar de nicho mantendo um template compatível (ex.: `standard` ou `editorial`), o template é preservado; se o template anterior for incompatível (ex.: `automotivo` ao mudar para `imovel`), a engine resolve deterministicamente para o template canônico do novo nicho (`imobiliario`).
  - Ao reabrir um anúncio salvo (`initialData`), o `template_style` persistido no banco nunca é sobrescrito pelo `useEffect` de default de nicho.
- **ACTUAL:** Templates incompatíveis ficam disponíveis na UI; o `useEffect([niche.id])` reseta `templateStyle` na montagem inicial.
- **ROOT CAUSE:** `src/routes/_store.conta.classificados.novo.tsx:1612-1621, 4108-4130, 11227-11250, 11271-11294`.
- **FILES:** `src/routes/_store.conta.classificados.novo.tsx`, `src/lib/classifieds/canonical-taxonomy.ts`.
- **STATE OWNER:** `CreateClassifiedPage` (`niche`, `templateStyle`).
- **API:** `upsertClassified`.
- **DB:** `classifieds.attributes.template_style`.
- **AFFECTED MODULES:** Editor de Classificados, Persistência de Preferência de Template.
- **REGRESSION TEST:** `src/lib/classifieds/template-niche-preview.test.ts` (Casos 6, 7, 8, 9, 10).

---

### BUG-05 — Toggle Desktop/Mobile Não Altera Composição Real do Renderer (Vazamento de `@media` da Janela Principal)
- **BUG-ID:** `BUG-05`
- **SEVERITY:** `P0`
- **DESCRIPTION:** O toggle `Desktop / Mobile` nas 3 superfícies de preview (`_store.conta.classificados.novo.tsx`, `CanonicalListingPreviewFrame.tsx` e `LiveTemplatePreviewModal.tsx` / `OmniEditor.tsx`) altera apenas um estado local (`previewDevice` ou `viewport`) ou a largura CSS externa (`max-w-[390px]`), mas:
  1. No painel lateral de `_store.conta.classificados.novo.tsx` (linha 11325), nem a largura do chassi nem `previewViewport` são aplicados em `EditorialShowcaseView` ou `EventClassifiedShowcaseView`.
  2. Em `EditorialShowcaseView`, `EventClassifiedShowcaseView` e `CanonicalListingView`, o layout usa classes `@media` (`lg:grid-cols-12`, `md:grid-cols-2`), que consultam a largura do monitor (`window.innerWidth = 1440px`) e não o `previewViewport` selecionado! Assim, em um monitor desktop, o modo Mobile renderiza o layout Desktop de 12 colunas espremido dentro de 390px.
  3. Em `CanonicalListingPreviewFrame.tsx`, o estado `viewport` (`"mobile" | "tablet" | "desktop"`) nem sequer é passado como prop para `<CanonicalListingView />`.
- **REPRODUCTION:**
  1. Abrir o preview em um monitor Desktop (`>= 1024px`).
  2. Alternar de `Mobile` para `Desktop` e de `Desktop` para `Mobile`.
- **EXPECTED:**
  - `Mobile` renderiza composição **Mobile Native** (1 coluna vertical, barra de ação inferior tátil, abas horizontais contínuas, hero compacto, chassi 390px isolado).
  - `Desktop` renderiza composição **Desktop Native** (grid assimétrico 8+4 colunas, sidebar sticky de conversão/vendedor, galeria expandida).
- **ACTUAL:** Em `CanonicalListingPreviewFrame` e `EditorialShowcaseView`, o layout de 12 colunas do desktop permanece ativo mesmo quando `viewport === "mobile"`, ficando comprimido/quebrado. No painel direito de `_store.conta.classificados.novo.tsx`, o chassi não muda de geometria quando `EditorialShowcaseView` está ativo.
- **ROOT CAUSE:**
  - `src/components/ad-engine/preview/canonical-listing-preview-frame.tsx:202`: não passa `previewViewport={viewport}` para `CanonicalListingView`.
  - `src/components/ad-engine/public/canonical-listing-view.tsx:214`: usa `lg:grid-cols-12` fixo sem respeitar `previewViewport`.
  - `src/components/classifieds/editorial-showcase-view.tsx:100`: não recebe nem aplica `previewViewport?: "mobile" | "desktop"`.
  - `src/routes/_store.conta.classificados.novo.tsx:4238, 11325, 11393`: não passa `previewViewport={previewDevice}` para `EditorialShowcaseView` e não aplica chassi mobile de 390px no painel lateral.
- **FILES:**
  - `src/components/ad-engine/preview/canonical-listing-preview-frame.tsx`
  - `src/components/ad-engine/public/canonical-listing-view.tsx`
  - `src/components/classifieds/editorial-showcase-view.tsx`
  - `src/routes/_store.conta.classificados.novo.tsx`
- **STATE OWNER:** `previewDevice` (`_store.conta.classificados.novo.tsx`), `viewport` (`CanonicalListingPreviewFrame`).
- **API:** N/A (UI/Renderer contract).
- **DB:** N/A.
- **AFFECTED MODULES:** Preview Bidirecional Desktop/Mobile em Classificados e Ad Engine.
- **REGRESSION TEST:** `src/components/ad-engine/preview/preview.test.ts` & `src/lib/classifieds/template-niche-preview.test.ts` (Casos 4, 5).

---

### BUG-06 — Divergência Crítica Preview × Página Pública (`sanitizePublicClassifiedAttributes` Remove Atributos de Nicho para Visitantes)
- **BUG-ID:** `BUG-06`
- **SEVERITY:** `P0`
- **DESCRIPTION:** Em `src/services/classifieds.functions.ts`, quando o dono do anúncio visualiza `/_store/classificados/$id` (`canManage === true`), `getPublicClassifiedById` retorna `classifiedData` intacto. Porém, quando qualquer visitante público ou anônimo (`canManage === false`) acessa a mesma URL, `getPublicClassifiedById` filtra `classifiedData.attributes` através de `sanitizePublicClassifiedAttributes`. Como `CLASSIFIED_PUBLIC_ALLOWLIST_EXTRA` e `PUBLIC_SPEC_ALLOWLIST` não incluem as chaves reais salvas por `upsertClassified` (`destination_city`, `flight_details`, `lodgings`, `itinerary_days`, `story_highlights`, `bio_bullets`, `departure_options`, `year_fab`, `year_model`, `mileage_km`, `area_sqm`, `parking_spots`, `condo_cents`, `iptu_cents`, `furnished`, `deal_type`, `property_type`, `role`, `work_model`, `regime`, `salary_range`, `benefits`, `skills`, `modality`, `service_area`, `grocery_fresh_pricing`, `grocery_ripeness_config`, `progressive_discount_tiers`, `order_bump_offer`, `pricing_type`, `price_min_cents`, `price_max_cents`, `price_disclaimer`, `niche`, `template_id`, etc.), todos esses atributos são **apagados** da resposta pública!
- **REPRODUCTION:**
  1. Publicar um anúncio de Viagem (com roteiro, voos, hotel), Veículo (com `year_fab`, `year_model`, `mileage_km`), Imóvel (com `area_sqm`, `condo_cents`, `iptu_cents`) ou Mercado (com `grocery_fresh_pricing`).
  2. Abrir `/_store/classificados/$id` em aba anônima (ou com outro usuário não-autor).
- **EXPECTED:** Visitantes públicos devem ver exatamente o mesmo template, ficha técnica, roteiro, comodidades e condições comerciais exibidos no preview (ocultando apenas dados sensíveis internos como `cost_cents`, `margin_percent`, `fiscal_profile`, `pix_key` bruto, `restricted_documents`, `company_cnpj` e endereço quando `hide_location === true`).
- **ACTUAL:** Visitantes públicos recebem `attributes` esvaziado, causando desaparecimento de fichas técnicas, roteiros de viagem, hotéis, quilometragem/ano de veículos, condomínio/IPTU de imóveis e precificação de mercado, além de trocar o template de viagem para classificado genérico!
- **ROOT CAUSE:**
  - `src/services/classifieds.functions.ts:20-100`: `CLASSIFIED_PUBLIC_ALLOWLIST_EXTRA` incompleta.
  - `src/services/unified-listing.functions.ts:29-124, 140-250`: `PUBLIC_SPEC_ALLOWLIST` incompleta e `mapDatabaseRowToUnifiedListing` não mapeia `template: rawAttrs.template_id || rawAttrs.template_style`.
- **FILES:**
  - `src/services/classifieds.functions.ts`
  - `src/services/unified-listing.functions.ts`
- **STATE OWNER:** BFF Serializer (`sanitizePublicClassifiedAttributes`, `sanitizePublicProductAttributes`, `mapDatabaseRowToUnifiedListing`).
- **API:** `getPublicClassifiedById`, `getPublicClassifieds`, `getAdsByStoreId`, `getPublicListingBySlug`.
- **DB:** `public.classifieds.attributes`.
- **AFFECTED MODULES:** Vitrine Pública `/_store/classificados/$id`, Trilhos de Classificados, Ad Engine Public View.
- **REGRESSION TEST:** `src/lib/classifieds/template-niche-preview.test.ts` (Caso 11 — Paridade Preview × Público).

---

### BUG-07 — Vazamento de Colunas Default de Banco em `upsertClassified` (`deal_type = "venda"`, `delivery_mode = "pickup"`, `max_guests = 1`, `rental_period = "mensal"`)
- **BUG-ID:** `BUG-07`
- **SEVERITY:** `P1`
- **DESCRIPTION:** Em `src/services/classifieds.functions.ts` (linhas 1108–1148), `upsertClassified` preenche defaults de colunas da tabela `classifieds` sem verificar a categoria/nicho:
  - `deal_type` recebe `"venda"` mesmo para `travel`, `service`, `job`, `event`, `donation`.
  - `delivery_mode` e `delivery_type` recebem `"pickup"` mesmo para `travel`, `service`, `real_estate`, `job`, `event`.
  - `max_guests` recebe `1` e `rental_period` recebe `"mensal"` mesmo para carros, celulares e vagas de emprego.
  Quando o registro é relido do banco em `resolveClassifiedDetailedSpecs` ou nos cards públicos, esses valores default nas colunas da tabela podem vazar como badges ("Finalidade: Venda", "Retirada no Local") em nichos incompatíveis (violando `AGENTS.md` B.37).
- **REPRODUCTION:**
  1. Salvar um anúncio de Serviço ou Viagem via `upsertClassified`.
  2. Inspecionar as colunas `deal_type`, `delivery_mode`, `rental_period`, `max_guests` gravadas e a resolução de especificações.
- **EXPECTED:** `deal_type`, `rental_period` e `max_guests` só devem assumir defaults imobiliários/hoteleiros quando `category === "real_estate"`; `delivery_mode` só deve assumir `"pickup"` em categorias de produtos físicos (`sale`, `food`, `equipment`, `donation`).
- **ACTUAL:** Todos os nichos recebem defaults de produto físico e imóvel na linha do banco.
- **ROOT CAUSE:** `src/services/classifieds.functions.ts:1108-1148, 1214-1215`.
- **FILES:** `src/services/classifieds.functions.ts`, `src/lib/classifieds/canonical-specs-resolver.ts`.
- **STATE OWNER:** BFF `upsertClassified`.
- **API:** `upsertClassified`.
- **DB:** `public.classifieds` (`deal_type`, `delivery_mode`, `delivery_type`, `max_guests`, `rental_period`).
- **AFFECTED MODULES:** BFF de Classificados, Cards e Detalhes Públicos.
- **REGRESSION TEST:** `src/lib/classifieds/template-niche-preview.test.ts` (Casos 6, 9, 10, 11).

---

### BUG-08 — Falha de Autorização Multi-Tenant (`store_id` Spoofing & Sobrescrita de `author_profile_id`) em `upsertClassified`
- **BUG-ID:** `BUG-08`
- **SEVERITY:** `P0`
- **DESCRIPTION:** Em `src/services/classifieds.functions.ts`:
  1. Na criação (`!isUpdating`), se o cliente enviar um `store_id` arbitrário, `upsertClassified` não verifica se `identity.id` é membro ou proprietário daquela loja (`store_id`) e ainda pula o limite anti-spam (`if (!isUpdating && !rest.store_id)` na linha 1087).
  2. Na atualização (`isUpdating`), o `payload` define incondicionalmente `author_profile_id: identity.id` e `store_id: rest.store_id || null` (linhas 1216–1217), permitindo que um gestor altere o `author_profile_id` original ou vincule o anúncio a um `store_id` ao qual não pertence.
- **REPRODUCTION:**
  1. Chamar `upsertClassified` com `store_id` de outra loja da qual o usuário autenticado não é membro.
- **EXPECTED:** O BFF deve validar estritamente a associação do usuário com `rest.store_id` (via `identity.store_id`, `identity.memberships`, `workspace_members` ou `stores.owner_id`) antes de permitir criação ou atualização vinculada a uma loja, e preservar `existingAd.author_profile_id` em edições por co-gestores.
- **ACTUAL:** `store_id` não é validado na criação nem na troca de loja durante edição.
- **ROOT CAUSE:** `src/services/classifieds.functions.ts:1086-1285`.
- **FILES:** `src/services/classifieds.functions.ts`.
- **STATE OWNER:** BFF `upsertClassified`.
- **API:** `upsertClassified`.
- **DB:** `public.classifieds` (`store_id`, `author_profile_id`).
- **AFFECTED MODULES:** Segurança Multi-Tenant de Classificados.
- **REGRESSION TEST:** `src/lib/classifieds/template-niche-preview.test.ts` (Teste de Segurança BFF Multi-Tenant).

---

### BUG-09 — Reset Acidental de `needsMarketingBanners` em `hydrateBindings` do Builder (`src/services/builder.functions.ts`)
- **BUG-ID:** `BUG-09`
- **SEVERITY:** `P1`
- **DESCRIPTION:** Em `src/services/builder.functions.ts`, `hydrateBindings` percorre `nodes.forEach(...)` e atribui `needsMarketingBanners = true` na linha 136 quando um bloco possui `bindingSource === "marketing_banners"`. Porém, na linha 171 (após o `forEach`), declara `let needsMarketingBanners = false;`, zerando a flag e impedindo o carregamento real de banners do banco para blocos do Builder!
- **REPRODUCTION:**
  1. Criar um documento no Builder com um bloco vinculado a `source: "marketing_banners"`.
  2. Hidratar o documento via `hydrateBindings`.
- **EXPECTED:** `needsMarketingBanners` permanece `true` e busca os banners ativos da loja.
- **ACTUAL:** `needsMarketingBanners` é sobrescrito para `false` na linha 171.
- **ROOT CAUSE:** `src/services/builder.functions.ts:136, 171`.
- **FILES:** `src/services/builder.functions.ts`.
- **STATE OWNER:** `hydrateBindings`.
- **API:** `getExperienceForEditor`, `getPublishedExperience`.
- **DB:** `public.marketing_banners`.
- **AFFECTED MODULES:** Builder Data Hydration.
- **REGRESSION TEST:** Teste unitário de hidratação/contratos.

---

### BUG-10 — `TeteterisGridView` e `CanonicalListingView` com Truncamento / Falta de Adaptação em Containers de Preview Mobile
- **BUG-ID:** `BUG-10`
- **SEVERITY:** `P1`
- **DESCRIPTION:**
  1. Em `src/components/ad-engine/public/canonical-listing-view.tsx:246`, os valores de especificações técnicas usam a classe `truncate` (`<p className="text-sm font-semibold text-foreground truncate">`), violando a Invariante B.38 (`AGENTS.md`: proibido truncar rótulos/valores de especificações com `truncate`).
  2. Em `src/components/common/teteterisgrid-view.tsx:52`, o grid usa breakpoints de janela (`xl:grid-cols-4`, `lg:grid-cols-6`) sem suporte a prop `forceCompact` / container query, fazendo com que dentro de um preview mobile em monitor desktop os colSpans de 4/6 colunas colidam com a largura de 390px.
- **REPRODUCTION:**
  1. Inserir especificações com textos longos (> 40 caracteres) em `CanonicalListingView` ou `NicheSpecificationsDisplay`.
  2. Renderizar `TeteterisGridView` com 1, 3 e 8 cards em modo mobile preview (`390px`).
- **EXPECTED:** Zero truncamento de especificações (`break-words leading-snug`), fechamento matemático 100% sem buracos em `computeTeteterisGrid` (para 1, 2, 3, 4, 5, 6, 7, 8+ cards) e adaptação limpa a 1–2 colunas quando em preview mobile compacto.
- **ACTUAL:** `CanonicalListingView` trunca especificações com reticências (`truncate`).
- **ROOT CAUSE:** `src/components/ad-engine/public/canonical-listing-view.tsx:246`, `src/components/common/teteterisgrid-view.tsx:50-68`.
- **FILES:** `src/components/ad-engine/public/canonical-listing-view.tsx`, `src/components/common/teteterisgrid-view.tsx`.
- **STATE OWNER:** Componentes de renderização de especificações e grade.
- **API:** N/A.
- **DB:** N/A.
- **AFFECTED MODULES:** `CanonicalListingView`, `TeteterisGridView`.
- **REGRESSION TEST:** `src/components/ad-engine/preview/preview.test.ts` (Casos 12, 14).
