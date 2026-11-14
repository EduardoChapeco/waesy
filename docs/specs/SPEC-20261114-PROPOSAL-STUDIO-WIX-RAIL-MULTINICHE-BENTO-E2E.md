# SPEC-20261114-PROPOSAL-STUDIO-WIX-RAIL-MULTINICHE-BENTO-E2E

## 1. Contexto e Objetivo
Unificar e concluir de ponta a ponta (Banco/DTO -> BFF -> Criador de Propostas -> Criador de Pacotes -> Studio de Propostas -> Templates Visuais -> Página Pública `/_store/proposta/$token` -> Exportação PDF/PNG) a experiência do **Studio de Propostas, Orçamentos Multi-Nicho, Identidade Visual com Recorte Adaptativo, Precificação por Pessoa/Quarto, Upload de Mídias em Roteiro/Hotéis/Passeios e Layout Bento Grid**.

## 2. Requisitos em Sintaxe EARS

### R1 — Barra Lateral Fina Estilo Wix / Workspace (`StudioSidebarEditor` & Editores Correlatos)
- **WHEN** o operador abrir o `StudioSidebarEditor` no Studio de Propostas (`/workspace/turismo/propostas/$id`) em desktop ou mobile, **THE SYSTEM SHALL** substituir a grade superior de 3x3 abas por uma barra vertical fina de navegação lateral (`w-14 sm:w-16`) estilo Wix / `BuilderDockedRail` com ícones semânticos, rótulos curtos, alvos de toque de no mínimo `44x44px` (`min-h-11 min-w-11`) e `:focus-visible:ring-2`, posicionada ao lado do painel inspetor de conteúdo.
- **WHEN** o operador alternar entre seções na barra vertical fina, **THE SYSTEM SHALL** exibir cabeçalho contextual da seção ativa no topo do painel inspetor com rolagem independente e zero compressão horizontal.

### R2 — Módulo Completo de Identidade Visual, Recorte de Logo, Enquadramento Adaptativo e Tipografia Real
- **WHEN** o operador configurar a identidade da agência/empresa no Studio, **THE SYSTEM SHALL** permitir upload/edição direta de `agency_logo_url` (com suporte ao `PhotoStudioModal` de recorte), seleção de formato (`contain`, `square`, `circle`, `wide`), tamanho (`sm`, `md`, `lg`, `xl`), posição (`left`, `center`, `right`, `badge`), ponto focal (`logo_object_position`) e escala (`logo_scale`), persistindo e refletindo em todos os templates e na visão pública.
- **WHEN** o operador configurar imagens de capa, hotéis, roteiro ou passeios e alternar entre modelos (`editorial-flat`, `dark-premium`, `executivo-b2b`, `landscape-presentation`, `vertical-premium`, `group-catalog`, `bento-grid`), **THE SYSTEM SHALL** aplicar enquadramento adaptativo (`cover_object_position`, `cover_scale`, `cover_aspect_mode` e `image_crop` por item) evitando distorção ou espaços vazios.
- **WHEN** o operador selecionar um par tipográfico em `FONT_PRESET_OPTIONS`, **THE SYSTEM SHALL** aplicar fontes distintas e reais (`editorial` com Playfair Display + Inter, `modern` com Plus Jakarta Sans + Inter, `corporate` com IBM Plex Sans, `luxury` com Cormorant Garamond + DM Sans, `geometric` com Outfit + Inter) nas variáveis CSS `--p-heading-font` e `--p-body-font`.

### R3 — Precificação Completa por Adulto/Pessoa e por Quarto (Fim do Resumo Concatenado na Capa)
- **WHEN** uma proposta for gerada a partir de `UnifiedProposalWorkspace`, **THE SYSTEM SHALL** persistir um subtítulo/resumo editorial limpo sem despejar blocos concatenados (`Divisão por Quartos:`, `Itens Inclusos:`, `Logística Regional de Aeroporto Gateway:`) em `initialNotes` / `subtitle`, salvando os valores individuais por quarto diretamente em `rooms[].price_cents` e a logística de gateway em `transfers` / `custom_fields.gateway_logistics`.
- **WHEN** uma proposta legada já salva contiver o resumo técnico concatenado em `special_notes` / `subtitle`, **THE SYSTEM SHALL** higienizar automaticamente o subtítulo da capa em `normalizeProposalForCanvas` e `proposalToEditorialClassified`, extraindo os valores de `Quarto 1`, `Quarto 2`, etc. para a estrutura visual de quartos.
- **WHEN** a seção financeira da proposta for renderizada nos templates ou na página pública, **THE SYSTEM SHALL** exibir claramente o Valor Total (PIX, Cartão e Boleto), o **Valor por Adulto / por Pessoa** (calculado pelos pagantes ou customizável, com toggle de exibição) e os **Cards/Tabela de Preço por Quarto** (com ocupação de adultos/crianças, tipo de acomodação, valor total do quarto e valor por pessoa no quarto).

### R4 — Upload e Renderização Completa de Mídias (Hotel, Passeios, Destino e Roteiro Dia a Dia)
- **WHEN** o operador editar Hotéis, Roteiro Dia a Dia, Passeios/Experiências ou Galeria do Destino no `StudioSidebarEditor`, **THE SYSTEM SHALL** disponibilizar componente `<ImageUpload>` (com upload direto, URL ou recorte no Photo Studio), múltiplas fotos de galeria e ajuste de ponto focal.
- **WHILE** houver mídias cadastradas em Hotéis (`h.images`), Roteiro Dia a Dia (`d.images` / `d.image_url`), Passeios (`tour.image_url`) ou Galeria do Destino, **THE SYSTEM SHALL** renderizá-las em todos os templates (`TemplateEditorialFlat`, `TemplateDarkPremium`, `TemplateVerticalPremium`, `TemplateLandscape`, `TemplateExecutivo`, `TemplateGroupCatalog`, `TemplateBentoGrid`) e no mapeador editorial público (`proposalToEditorialClassified`), omitindo contêineres vazios quando não houver mídia (conformidade estrita com B.33 Anti-Fake).

### R5 — Novo Layout Bento Grid Visual (`bento-grid`) e Ocupação Harmônica Sem Espaços Vazios
- **WHEN** o operador selecionar o modelo `bento-grid` (`Bento Grid Visual`) no catálogo de templates, **THE SYSTEM SHALL** renderizar `TemplateBentoGrid` com grade modular densa (`grid-flow-dense`), adaptando automaticamente 1, 2, 3 ou 4+ fotos/blocos de informação para ocupar 100% da largura da grade sem buracos brancos.

### R6 — Adaptação Semântica Multi-Nicho End-to-End (`tourism`, `real_estate`, `automotive`, `services`, `projects`, `events`, `retail`)
- **WHEN** o operador selecionar ou importar o nicho da proposta (`proposal_niche`: Turismo, Imóveis, Veículos, Projetos & Engenharia, Serviços & Consultoria, Eventos ou Varejo/Comércio), **THE SYSTEM SHALL** adaptar dinamicamente os itens da barra lateral fina, os rótulos dos campos no editor, os títulos das seções nos templates e os blocos de especificações técnicas (ex.: Imóvel -> Características do Imóvel, Área m², Dormitórios/Suítes/Vagas, Condomínio/IPTU, Localização/Planta; Veículo -> Ficha Técnica, Ano/KM/Câmbio/Combustível/FIPE, Vistoria; Projeto/Serviço -> Escopo, Entregáveis, Cronograma de Etapas, SLA/Garantia), ocultando jargões exclusivos de aviação/hotelaria (`Malha Aérea`, `PNR`, `Regime Alimentar`) quando não aplicáveis ao nicho.

### R7 — Sincronia Total entre CMS, Criador de Pacotes, Studio e Página Pública (`/_store/proposta/$token`)
- **WHEN** uma proposta for publicada ou visualizada em `/_store/proposta/$token` (tanto na aba Editorial quanto na Lâmina PDF), **THE SYSTEM SHALL** preservar em `toPublicTravelProposalDTO` os quartos comerciais sanitizados (`publicRooms`), as galerias de hotéis e roteiro (`images`), os metadados de identidade visual/logo/tipografia/nicho/precificação em `PUBLIC_STUDIO_CUSTOM_FIELD_KEYS` e os campos extras do CMS (`custom_fields`).

## 3. Escopo de Arquivos Autorizados
- `src/services/travel-proposal.functions.ts`
- `src/lib/tourism/proposal-theme-palettes.ts`
- `src/lib/tourism/pricing.ts`
- `src/lib/tourism/adapters.ts`
- `src/lib/tourism/proposal-editorial-mapper.ts`
- `src/components/ui/image-upload.tsx`
- `src/components/tourism/studio/proposal-canvas-renderer.tsx`
- `src/components/tourism/studio/studio-sidebar-editor.tsx`
- `src/components/tourism/unified-proposal-workspace.tsx`
- `src/components/tourism/vouchers/VoucherStudio.tsx`
- `src/components/tourism/boarding/PreBoardingPresentationStudio.tsx`
- `src/components/tourism/proposals/templates/blocks/UI.tsx`
- `src/components/tourism/proposals/templates/index.ts`
- `src/components/tourism/proposals/templates/TemplateBentoGrid.tsx` (novo)
- `src/components/tourism/proposals/templates/TemplateEditorialFlat.tsx`
- `src/components/tourism/proposals/templates/TemplateDarkPremium.tsx`
- `src/components/tourism/proposals/templates/TemplateVerticalPremium.tsx`
- `src/components/tourism/proposals/templates/TemplateLandscape.tsx`
- `src/components/tourism/proposals/templates/TemplateExecutivo.tsx`
- `src/components/tourism/proposals/templates/TemplateGroupCatalog.tsx`
- `src/components/commerce/travel/travel-package-form.tsx`
- `src/components/classifieds/editorial-showcase-view.tsx`
- `src/routes/workspace.turismo.propostas.$id.tsx`
- `src/routes/workspace.orcamentos.novo.tsx`
- `src/routes/_store.proposta.$token.tsx`
- `src/types/travel-package.ts`
- `src/styles.css`
- `src/services/__tests__/proposal-studio-multiniche-bento-e2e.test.ts` (novo)
- `docs/design/DECISIONS.md`

## 4. Invariantes e Gates de Design (B.4 / B.8 / B.33)
- Zero `!important` (DL-04), zero cores hex/rgb literais em componentes TSX (DL-01), zero classes com colchetes arbitrários (DL-02), grade de 4px (DL-03), alvos de toque `>= 44px` (`h-11` / `size-11`) com `:focus-visible:ring-2` (DL-14/DL-15), zero containeritis (DL-31) e zero imagens fake de fallback (B.33).
