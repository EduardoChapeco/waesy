# SPEC-CANONICAL-HOTELS-AND-DESTINATIONS-ECOSYSTEM — Ecossistema Canônico de Hotéis, Resorts e Destinos

## 1. Contexto e Problema
O ecossistema Waesy necessita de um Banco Central Canônico de Hotéis, Resorts, Pousadas e Destinos Turísticos para servir como Fonte Única da Verdade (SSOT). Atualmente:
1. Em `travel-package-form.tsx`, a seleção de hotéis dependia de um `<Select>` estático carregando toda a base em memória sem busca por texto, prejudicando a experiência de criação de pacotes turísticos quando há centenas de cadastros.
2. Agências no workspace podiam recadastrar os mesmos hotéis sem deduplicação prévia ou resolução de sinônimos/aliases, gerando fragmentação e risco de vazamento de dados contextuais entre contas.
3. Não existiam páginas públicas canônicas indexáveis para hotéis (`/_store/turismo/hoteis/$slug`) e destinos (`/_store/turismo/destinos/$slug`), limitando a autoridade de SEO da plataforma a pacotes comerciais isolados.
4. Faltava uma esteira de extração e mineração estruturada capaz de converter informações de sites oficiais, prefeituras e canais turísticos em dados estruturados (políticas de check-in/out, tipos de quarto, metragens, comodidades e complexo de lazer) sem fallbacks sintéticos nem valores hardcoded.

## 2. Requisitos em Sintaxe EARS
- **REQ-01 (Autocomplete Universal & Combobox Tátil):** When o operador ou agente interagir com a seleção de hospedagem na criação de pacotes (`travel-package-form.tsx`), cotações ou propostas, o componente `HotelCombobox` DEVE oferecer busca em tempo real (nome, cidade, estado, país e regime) com piso tátil de 44px (`h-11 min-h-11`), anel de foco `:focus-visible:ring-2`, e suporte a teclado.
- **REQ-02 (Autopreenchimento Inteligente em Lote):** When um hotel canônico for selecionado no criador de pacotes, o sistema DEVE preencher automaticamente o destino (cidade, estado, país), regime padrão de alimentação, inclusões automáticas de hospedagem, fotos oficiais de capa/galeria e opções de quarto.
- **REQ-03 (Deduplicação Rigorosa e Preflight Matcher):** Ubiquitous — O cadastro de hotéis no workspace DEVE executar verificação de similaridade e sinônimos contra `global_hotels` e `hotel_aliases` (`pg_trgm` e slugs normalizados), alertando a agência sobre registros canônicos existentes antes de criar novas instâncias em `hotels_bank`.
- **REQ-04 (Páginas Públicas Canônicas Indexáveis - SEO):** Ubiquitous — O sistema DEVE disponibilizar rotas públicas canônicas `/_store/turismo/hoteis/$slug` e `/_store/turismo/destinos/$slug` com metadados SEO, Schema.org (JSON-LD), fotos profissionais em alta resolução, suporte a vídeos reais `<video>`, políticas detalhadas (check-in, check-out, pets, cancelamento) e autovinculação de praias e atrações no raio de até 30 km.
- **REQ-05 (Mineração Estruturada Hoteleira):** Where o operador fornecer URL oficial, texto ou dados de um hotel/destino, o serviço de mineração `hotel-mining.functions.ts` DEVE extrair e estruturar dados canônicos (quartos com capacidade/m², estrutura de piscinas/kids club/spa, e políticas completas) utilizando a infraestrutura unificada de IA (`executeUnifiedAiCall`), salvando-os de forma idêntica ao preenchimento humano.
- **REQ-06 (Conformidade Design System & Zero Fakes):** Ubiquitous — Todas as interfaces DEVEM cumprir estritamente os gates DL-01 a DL-30, piso tátil de 44px, tokenização total de cores, e proibir terminantemente o uso de imagens de estoque aleatórias ou avatares sintéticos (Invariantes B.8 e B.33).

## 3. Entradas, Saídas e Invariantes
- **Entradas:** Query de busca de hotel, slug canônico, payload de criação/atualização de hotel/destino, URLs para mineração.
- **Saídas:** Objetos tipados `GlobalHotelDTO`, `HotelBankDTO`, `DestinationDTO`, com dados estruturados de quartos, políticas, estrutura e atrações vinculadas.
- **Invariantes:**
  - Isolamento estrito de `store_id` em `hotels_bank` com vínculo canônico `global_hotel_id`.
  - Proibido qualquer truncamento de nomes de quartos ou políticas em fichas técnicas.
  - Zero duplicação de slugs canônicos (`canonical_slug` UNIQUE).
  - Rotas públicas devem renderizar estado completo: carregamento, dados, estado vazio honesto e tratamento de erro.

## 4. Evidências de Aceite
- Teste unitário e de integração em `src/services/__tests__/canonical-hotels-and-destinations.test.ts`.
- `npm run typecheck` com Exit Code 0.
- `node scripts/design-lint.mjs` com 0 violações P0/P1.
- `npm run build` com Exit Code 0.
