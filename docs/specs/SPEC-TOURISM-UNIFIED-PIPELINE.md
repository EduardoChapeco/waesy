# SPEC-TOURISM-UNIFIED-PIPELINE — Unificação Canônica de Turismo (Pacotes, Excursões, Orçamentos, Propostas e Páginas Web)

Status: CONCLUÍDA (Fases T0–T6 implementadas e verificadas end-to-end).

## 1. Diagnóstico Forense (Silos Identificados no Código Real)

| Domínio | Pontos de Entrada Atuais | Divergência / Quebra de Sincronização Observada |
|---|---|---|
| **1. Pacote / Roteiro (Catálogo)** | `src/routes/workspace.catalogo.produtos.novo.tsx`, `workspace.catalogo.produtos.$id.tsx`, `src/components/commerce/travel/travel-package-form.tsx`, `src/types/travel-package.ts` | Usa `TravelPackageData` (`destination` único, `resort` único ou `lodgings[]`, `flight_details` plano) sem `hotels[]` multi-estadia com galeria/vídeo por hotel, `flights[]` multi-trecho, `transfers[]` nomeados com preço/veículo, `tours[]` estruturados, nem configuração persistida de Página Web (`web_page`). |
| **2. Excursões / Grupos Terrestres** | **Dois** criadores concorrentes em `src/routes/workspace.turismo.grupos.index.tsx` (`NewGroupTourWizard` vs `NewGroupTourSheet`), `src/routes/workspace.turismo.grupos.$id.tsx`, `src/services/group-tours.functions.ts` | `NewGroupTourSheet` omite hotel, galeria múltipla, vídeo, itinerário e tarifas de quarto que existem no `NewGroupTourWizard`. `createGroupTour` grava metadados editoriais em string JSON dentro de `tourism_experiences.description`. Pós-criação (`workspace.turismo.grupos.$id.tsx`) só edita alocações/ônibus, não edita o conteúdo da página. `getPublicTourismById` (`src/services/tourism.functions.ts`) **omite** `seats`, `excluded_items`, `bus_company_name`, `departure_time`, `return_time`. Não há importação de Excursões para Orçamento/Proposta nem vínculo com `web_page`. |
| **3. Orçamento & Proposta** | **Dois** fluxos paralelos (`src/routes/workspace.orcamentos.novo.tsx` modo `travelos` vs `src/components/tourism/unified-proposal-workspace.tsx` + `StudioSidebarEditor`), `src/lib/niches/unified-field-bridge.ts` | `extractNormalizedCatalogContext` e `handleApplyStoreCatalogItem` ignoram `transfers[]`, `tours[]`, galerias/vídeos por hotel e excursões (`tourism_experiences`), obrigando retrabalho manual ao cotar um pacote publicado ou excursão. |
| **4. Página Web Pública** | 3 visões públicas distintas além de `_store.proposta.$token.tsx`: `_store.produto.$slug.tsx` (`TravelPackageDetailView`), `_store.turismo.$id.tsx` (`InstagramTravelView` + JSX padrão), `_store.classificados.$id.tsx` (`EditorialShowcaseView`) | Cada URL exibe layout, abas e mídia incompatíveis. Excursões em `_store.turismo.$id.tsx` não mostram poltronas disponíveis em tempo real, pontos de embarque estruturados, múltiplas fotos/vídeos de hotel e não herdam os blocos customizáveis do `ProposalWebPageBuilder`. Pacotes em `_store.produto.$slug.tsx` exibem abas fixas sem edição modular web nem suporte a múltiplos transfers/tours/galerias por hotel. |
| **5. Pós-Compra ("Minhas Viagens" & Portal do Viajante)** | `src/routes/_store.conta.viagens.tsx`, `src/routes/viajante.viagem.$id.tsx`, `src/routes/workspace.turismo.viagens.$id.tsx`, `src/services/travel-lifecycle.functions.ts`, `src/components/tourism/boarding/PreBoardingPresentationStudio.tsx` | **Em `_store.conta.viagens.tsx`:** embora `listCustomerAgencyTrips` selecione `cover_image_url`, os cards de reserva renderizam somente texto e badges (zero miniatura visual de capa/galeria e passeios `tourism_bookings` não abrem o Portal do Viajante). **Em `viajante.viagem.$id.tsx`:** falta estética editorial minimalista unificada com a Página Web (sem hero visual com fotos/vídeos, exibe apenas 1 hotel isolado ignorando múltiplos hotéis/galerias, omite cards visuais de `transfers[]`/`tours[]`, não renderiza `images[]`/`video_url` no roteiro dia a dia, possui botões WhatsApp hardcoded `5549999991372` nas linhas 720/734/747 em vez do telefone real da agência e não possui seção/blocos customizáveis de **Dicas de Viagem, Vídeos e Fotos** editáveis pela agência). **Em `workspace.turismo.viagens.$id.tsx`:** a agência gerencia PNR/passageiros/financeiro, mas não possui aba/editor de **Experiência do Cliente (Fotos, Vídeos, Dicas & Pré-Embarque)** nem preview direto de `/viajante/viagem/${trip.id}`. |

## 2. Arquitetura Alvo ("Linha Única Sincronizada")

```
  [ Núcleo SSOT: CanonicalTravelBlueprint (`src/lib/tourism/travel-blueprint.ts`) ]
        ▲                         ▲                           ▲
        │ 1:1 (mesmo contrato)    │ 1:1 (+ mapa de ônibus)    │ 1:1 (+ cliente/valores/PNG/PDF)
        │                         │                           │
[Pacote / Roteiro] ─────▶ [Excursão Terrestre] ─────▶ [Orçamento / Proposta]
  (TravelPackageForm)     (ExcursionFormUnificado)    (UnifiedProposal + Studio)
        │                         │                           │
        └─────────────────────────┴─────────────┬─────────────┘
                                                ▼
                     [ Vitrine Web Editorial Universal (`TravelEditorialShowcase`) ]
                      + Mapa de Assentos Real (Excursões) + Blocos `WebPageBuilder`
```

## 3. Requisitos Formais (Sintaxe EARS)

### EARS-U1 — Contrato Canônico Único (`CanonicalTravelBlueprint`)
- O repositório SHALL definir um tipo e normalizador único (`CanonicalTravelBlueprint` e adaptadores em `src/lib/tourism/travel-blueprint.ts`) compartilhado entre Pacotes (`TravelPackageData`), Excursões (`GroupTourDTO` / `tourism_experiences`), Ponte de Catálogo (`UnifiedBridgeCatalogContext`) e Propostas (`TravelProposalDTO`).
- Todo item de viagem SHALL suportar de forma idêntica: `flights[]` multi-trecho, `hotels[]` multi-hospedagem com `media[]` individual (imagens + vídeos + crop), `transfers[]` nomeados com `kind`, `vehicle`, `price_cents`, `tours[]` com `date`, `duration`, `included`, `media[]`, `itinerary[]` com `media[]`/`video_url`, `boarding_points[]`, `includes[]`, `excludes[]`, `important_notes`, `cancellation_policy`, `payment_conditions`, e `web_page_config` (`ProposalWebPageDTO`).

### EARS-U2 — Paridade 1:1 no CRUD de Pacote / Roteiro
- `TravelPackageForm` (`src/components/commerce/travel/travel-package-form.tsx`) SHALL oferecer os mesmos campos estruturados do Editor de Propostas: múltiplos hotéis com `MediaGalleryField`, múltiplos transfers nomeados, múltiplos passeios (`tours[]`), malha aérea multi-trecho, pontos de embarque, calendário de saídas (`departure_options[]`) e aba "Página Web" (`WebPageBuilder`) sincronizada.
- WHEN um usuário editar ou criar um Pacote em `workspace.catalogo.produtos.novo.tsx` ou `$id.tsx`, o payload salvo em `products.attributes.travel` SHALL preservar integralmente `hotels[]`, `flights[]`, `transfers[]`, `tours[]`, `media[]` e `web_page_config` com retrocompatibilidade automática para `destination`/`resort`/`flight_details` legados.

### EARS-U3 — Unificação de Excursões / Viagens em Grupo Terrestres
- O fluxo duplicado de criação em `workspace.turismo.grupos.index.tsx` SHALL ser consolidado em um **único editor completo reutilizável** (criação + edição de conteúdo editorial, ônibus, frota 2D, pontos de embarque, hotel multi-mídia, tarifas, passeios inclusos, roteiro dia a dia, vídeo e configuração de Página Web).
- `group-tours.functions.ts` SHALL persistir e retornar dados estruturados em campos explícitos (inclusive `media[]`, `hotels[]`, `transfers[]`, `tours[]`, `boarding_points[]`, `web_page_config`) sem depender apenas de JSON string em `description`, e `getPublicTourismById` SHALL expor todos os campos públicos não-PII (`seats` agregados livres/ocupados sem expor CPF/telefone de terceiros, `excluded_items`, `bus_company_name`, `departure_time`, `return_time`, `boarding_points`, `pricing_tiers`, `extra_options`, `hotels`, `transfers`, `tours`, `web_page_config`).
- A rota `workspace.turismo.grupos.$id.tsx` SHALL incluir aba "Conteúdo & Página Web" para edição completa da excursão e botão direto "Ver Página Web" (`/turismo/${id}`).

### EARS-U4 — Ponte Bidirecional 1:1 para Orçamentos & Propostas
- `listStoreCatalogItemsForProposal` (`src/services/travel-proposal.functions.ts`) SHALL listar Pacotes (`products`), Classificados de Viagem (`classifieds`) **e Excursões em Grupo (`tourism_experiences`)** através de `extractNormalizedCatalogContext`.
- WHEN uma agência importar qualquer Pacote ou Excursão em `UnifiedProposalWorkspace` ou `workspace.orcamentos.novo.tsx`, TODOS os campos estruturados (`hotels[]` com mídias, `flights[]`, `transfers[]`, `tours[]`, `itinerary[]` com mídias, `boarding_points[]`, `includes[]`, `excludes[]`, `payment_conditions`, `web_page_config`) SHALL ser transferidos sem perdas em um único clique.
- `workspace.orcamentos.novo.tsx` (modo `travelos`) SHALL convergir os componentes de formulário compartilhados em vez de manter campos paralelos reduzidos.

### EARS-U5 — Página Web Editorial Unificada (`ProposalWebShowcase` Extensível)
- A vitrine pública de Pacotes (`_store.produto.$slug.tsx`), Excursões (`_store.turismo.$id.tsx`) e Propostas (`_store.proposta.$token.tsx`) SHALL compartilhar o mesmo motor editorial modular (`ProposalWebShowcase` + blocos especializados para **Mapa Interativo de Poltronas Real-Time / Vagas Restantes**, **Pontos & Horários de Embarque**, **Datas de Saída Selecionáveis** e **Tarifas por Acomodação/Opcional**).
- Em excursões públicas, dados sensíveis de outros passageiros (`passenger_document`, `passenger_phone`, `passenger_name`) SHALL NEVER ser expostos na rota anônima — apenas o mapa visual de status (`free` | `reserved` | `blocked`) e `seat_number`/`floor`.

### EARS-U6 — Experiência Pós-Compra Unificada ("Minhas Viagens" & Portal do Viajante Customizável)
- `_store.conta.viagens.tsx` SHALL exibir cards visuais limpos (usando `cover_image_url` real ou omissão honesta per B.33), indicadores claros de embarque/voucher e acesso direto ao Portal da Viagem (`/viajante/viagem/${id}`) tanto para viagens convertidas de propostas quanto para reservas de pacotes/excursões (`tourism_bookings` quando vinculadas).
- `viajante.viagem.$id.tsx` SHALL adotar a mesma arquitetura editorial minimalista de blocos do `ProposalWebShowcase`, exibindo: capa/galeria multi-mídia (fotos e vídeos `.mp4`/YouTube/Vimeo), múltiplos hotéis com suas galerias e endereços, todos os voos/transfers/passeios com status e localizadores PNR, roteiro dia a dia com mídias e mapas, checklists, documentos/vouchers e seção estruturada **"Dicas de Viagem & Orientações da Agência"** (clima, bagagem, moeda, tomadas, vestimenta, vídeos explicativos).
- `tourism_trips` SHALL suportar persistência dedicada de conteúdo editorial pós-venda (`trip_portal_content` / `web_page_config` + `travel_tips[]` + `portal_media[]`), herdando automaticamente fotos, vídeos e roteiro da Proposta/Pacote na conversão (`convertProposalToTrip`) e permitindo personalização completa pós-emissão pela agência em nova aba de `workspace.turismo.viagens.$id.tsx` ("Portal & Mídias do Cliente").
- Os links de suporte WhatsApp em `viajante.viagem.$id.tsx` SHALL utilizar exclusivamente `agency.phone` dinâmico da loja emissora, removendo números hardcoded.

## 4. Plano de Execução por Fases (Pós-Aprovação)

| Fase | Escopo | Arquivos Principais |
|---|---|---|
| **T0** | Migration SQL (`tourism_experiences` campos estruturados + `tourism_trips.portal_config` JSONB) + testes de contrato reproduzindo perdas no bridge, na exposição de excursões e no portal pós-venda | `supabase/migrations/*`, `src/lib/tourism/__tests__/travel-blueprint.test.ts` |
| **T1** | Criação do SSOT `CanonicalTravelBlueprint` e atualizações em `src/types/travel-package.ts` e `src/lib/niches/unified-field-bridge.ts` | `src/lib/tourism/travel-blueprint.ts`, `travel-package.ts`, `unified-field-bridge.ts` |
| **T2** | Upgrade do CRUD de Excursões (unificação `NewGroupTourWizard` + `NewGroupTourSheet` + edição em `workspace.turismo.grupos.$id.tsx` + `group-tours.functions.ts` + `getPublicTourismById` sem PII) | `group-tours.functions.ts`, `tourism.functions.ts`, `workspace.turismo.grupos.*`, `NewGroupTourWizard.tsx` |
| **T3** | Upgrade do CRUD de Pacotes (`TravelPackageForm` com `MediaGalleryField`, multi-hotel, multi-transfer, multi-tour, multi-voo, aba Página Web + bloco Dicas Padrão) | `travel-package-form.tsx`, `use-product-editor.ts`, `use-product-edit.ts` |
| **T4** | Convergência completa no Gerador de Orçamento/Proposta (`listStoreCatalogItemsForProposal` incluindo Excursões, `UnifiedProposalWorkspace`, `workspace.orcamentos.novo.tsx`) | `travel-proposal.functions.ts`, `unified-proposal-workspace.tsx`, `workspace.orcamentos.novo.tsx` |
| **T5** | Unificação da Página Web Editorial para Pacotes (`_store.produto.$slug.tsx`), Excursões (`_store.turismo.$id.tsx`) e Propostas sobre `ProposalWebShowcase` com bloco de Poltronas/Saídas/Embarques | `proposal-web-showcase.tsx`, `_store.produto.$slug.tsx`, `_store.turismo.$id.tsx`, `travel-package-detail-view.tsx` |
| **T6** | Refatoração E2E Pós-Compra: cards visuais em `_store.conta.viagens.tsx`, redesenho editorial de `viajante.viagem.$id.tsx` (Hero vídeo/fotos + multi-hotel/transfers/tours + Dicas/Checklist + WhatsApp dinâmico) e aba `"Portal & Mídias do Cliente"` em `workspace.turismo.viagens.$id.tsx` | `_store.conta.viagens.tsx`, `viajante.viagem.$id.tsx`, `workspace.turismo.viagens.$id.tsx`, `travel-lifecycle.functions.ts` |
| **T7** | Auditoria final: `typecheck` escopado (35 arquivos), `vitest` (21 suítes / 166 testes), `design-lint --ratchet`, `audit:buttons`, `check:bff`, `check:schema`, `check:types-ssot`, `check:cycles`, `check:naming` e registro `DEC-505` em `docs/design/DECISIONS.md` | `docs/design/DECISIONS.md` |

## 5. Implementação Entregue (Linha Única T0–T7)
- **T0 (`20270529000000_tourism_unified_experiences_fields.sql`):** Colunas estruturadas explícitas em `tourism_experiences` (`hotels`, `transfers`, `tours`, `itinerary`, `media`, `boarding_points`, `pricing_tiers`, `extra_options`, `web_page_config`, `payment_conditions`, `vehicle_layout_name`) com backfill idempotente a partir de `description` JSON legado.
- **T1 (`src/lib/tourism/travel-blueprint.ts` + `src/types/travel-package.ts`):** Núcleo SSOT `CanonicalTravelBlueprint` acíclico convertendo Pacotes (`blueprintFromPackage`) e Excursões (`blueprintFromGroupTour`) para `ProposalWebShowcase` (`blueprintToTravelProposalDTO`) com stripping estrito de PII em assentos (`sanitizePublicBusSeats`).
- **T2 (`group-tours.functions.ts`, `tourism.functions.ts`, `group-tour-content-editor.tsx`, `workspace.turismo.grupos.$id.tsx`, `workspace.turismo.grupos.index.tsx`):** Aposentado import morto `NewGroupTourSheet`, persistência dual em colunas estruturadas, `updateGroupTourContent` multi-tenant + B.25, aba `"Conteúdo & Web"` pós-criação e exposição pública não-PII em `getPublicTourismById` + `summary` limpo em `listPublicTourism`.
- **T3 (`travel-package-unified-extensions.tsx`, `travel-package-form.tsx`):** Paridade 1:1 com múltiplas hospedagens + `MediaGalleryField`, trechos aéreos múltiplos, traslados nomeados, passeios com galeria/vídeo, pontos de embarque e `ProposalWebPageBuilder` sincronizado em `web_page_config`.
- **T4 (`unified-field-bridge.ts`, `listStoreCatalogItemsForProposal`, `UnifiedProposalWorkspace`, `workspace.orcamentos.novo.tsx`):** Ponte bidirecional 1:1 incluindo `tourism_experiences` (`origin: "experience"`) e propagação integral para Orçamentos/Propostas (incluindo `NovoOrcamentoTravelosPage` + herança de `webPageConfig`).
- **T5 & T6 (`excursion-and-package-blocks.tsx`, `ProposalWebShowcase`, `_store.turismo.$id.tsx`, `TravelPackageDetailView`, `_store.conta.viagens.tsx`, `viajante.viagem.$id.tsx`):** Vitrine editorial unificada com disponibilidade de poltronas sem PII, pontos de embarque, datas de saída selecionáveis, tarifas/opcionais, link direto para roteiro em vouchers de experiência e portal pós-compra completo em `/viajante/viagem/$id`.
