# SPEC-GLOBAL-IATA-AIRPORTS — Unificação do Catálogo Global de Aeroportos (IATA/ICAO) e Autocomplete Universal

## 1. Contexto e Problema
Durante a criação de anúncios de viagens em `/_store/conta/classificados/novo` e em formulários de pacotes/emissões aéreas, a seleção de códigos IATA utilizava um `<Select>` estático sem campo de busca/autofiltro e apresentava códigos duplicados no catálogo base (`GLOBAL_AIRPORTS_CATALOG`), provocando falhas de seleção no Radix Select e ausência de centenas de aeroportos regionais e internacionais. Além disso, múltiplos módulos mantinham listas parciais e desconectadas de aeroportos.

## 2. Requisitos em Sintaxe EARS
- **REQ-01 (Unificação SSOT Global):** Ubiquitous — O sistema DEVE manter uma Fonte Única da Verdade (SSOT) deduplicada de 7.300+ aeroportos comerciais, regionais e hubs do Brasil e do mundo em `src/lib/data/airports-catalog.ts` (`GLOBAL_AIRPORTS_CATALOG`), sincronizada com as tabelas `public.airports_global` e `public.ck_airports`.
- **REQ-02 (Busca e Autofiltro Instantâneo):** When o usuário interagir com qualquer seletor de aeroporto (origem, destino ou gateway IATA), o componente `AirportCombobox` DEVE abrir um painel com campo de busca focalizado e autofiltrar instantaneamente por código IATA, código ICAO, cidade, estado/província, país ou nome do aeroporto (insensível a acentos e caixa).
- **REQ-03 (Propagação Transversal):** Ubiquitous — Todos os módulos que consomem códigos IATA (Classificados de Viagens, Pacotes Turísticos, Cotação de Viagens, Emissões Aéreas, Cadastro de Destinos, Orçamentos, Grade de Voos de Leads, Vouchers, Studio de Viagens, Cartão de Itinerário de Voo e Motor de Pré-Embarque) DEVEM consumir a SSOT unificada e/ou as Server Functions conectadas ao banco.
- **REQ-04 (Resiliência BFF e Banco de Dados):** If a consulta ao banco de dados (`airports_global` ou `ck_airports`) retornar vazio ou indisponibilidade parcial, as Server Functions `searchGlobalAirports` e `searchAirports` DEVEM mesclar e garantir fallback determinístico a partir do catálogo global `GLOBAL_AIRPORTS_CATALOG`.
- **REQ-05 (Conformidade Visual e Acessibilidade):** Ubiquitous — O seletor `AirportCombobox` DEVE respeitar altura mínima tátil de 44px (`h-11 min-h-11`), anel de foco `:focus-visible:ring-2`, bifurcação responsiva (Drawer no mobile com safe-area e Popover no desktop) e zero violações de Design Lint (DL-01 a DL-30).
- **REQ-06 (Inteligência Operacional, Órgãos Públicos e Taxas):** Ubiquitous — O sistema DEVE manter motor de inteligência aeronáutica (`airport-intelligence.ts`) com perfis curados e síntese determinística para todos os aeroportos, contemplando terminais, horários de funcionamento, postos de órgãos públicos (Receita Federal, Polícia Federal, ANVISA, Vigiagro, ANAC, Achados e Perdidos), taxas locais/trânsito (ex: TUUA em Lima LIM), comodidades (lounges VIP, câmbio, guarda-volumes), transporte terrestre oficial e guia de direitos do passageiro (Resolução 400 ANAC).
- **REQ-07 (Página Pública Canônica Indexável e CMS Master):** Ubiquitous — Cada aeroporto DEVE possuir página pública indexável sob a rota dinâmica `/_store/aeroporto/$iata` alimentada por SSR e TanStack Router sem geração estática de 7k+ páginas físicas, com SEO dinâmico, telemetria de visitas (`airport_page_views`), régua horizontal contínua de 7 abas (Invariante B.39) e suporte a personalização/edição pelo Admin Master via tabela `airport_cms_profiles` e Server Function `getAirportDetailedProfile`.

## 3. Entradas, Saídas e Invariantes
- **Entradas:** Query textual (IATA 3 letras, ICAO 4 letras, cidade, estado, país ou nome do terminal), filtro opcional de país/região e código IATA selecionado.
- **Saídas:** Registro canônico `AirportRecord` (`iata_code`, `icao_code`, `name`, `city`, `state_province`, `country`, `country_code`, `latitude`, `longitude`, `timezone`, `is_commercial`).
- **Invariantes:**
  - Unicidade estrita de `iata_code` em `GLOBAL_AIRPORTS_CATALOG` e `CANONICAL_AIRPORTS` (0 duplicatas).
  - Compatibilidade retroativa com testes existentes de `travel-pre-boarding-and-commissions` e `central-knowledge`.

## 4. Evidências de Aceite
- Testes unitários validando unicidade de IATA, cobertura nacional/internacional, busca por autofiltro e resolução de nomes de aeroportos.
- `npm run typecheck` com Exit Code 0.
- `node scripts/design-lint.mjs` com 0 violações P0/P1.
- `npm run build` com Exit Code 0.
