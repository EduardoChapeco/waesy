# SPEC: Reengenharia End-to-End do Modulo de Oportunidades, Matching Deterministico, Cadastro Estruturado e IA (Producao Zero-Loss)

**Codigo:** `SPEC-20261116-OPPORTUNITY-RADAR-AND-STRUCTURED-LEADS-E2E`
**Data:** 2026-11-16
**Status:** IMPLEMENTADO E VERIFICADO EM ESCOPO em 2026-11-16 (`DEC-506`; migration `20270526000000` aguardando `supabase db push` no banco remoto)
**Repositorio:** `EduardoChapeco/waesy`
**Branch/HEAD de Referencia:** `release/prod-20261113-fullpage-chat-copilot` (`c0e1d351e1ac5feaeb77d0f88cc19df83f14267c`)
**Estende:** `SPEC-INFOTRAVEL-QUOTE-CAPTURE-AND-OPPORTUNITY-RADAR`, `SPEC-TURISMO-UNIFIED-PIPELINE-AND-BUILDER-CONSOLIDATION`

---

## 1. Snapshot de Baseline e Ledger de Evidencias (W0)

- **Worktree preexistente preservado:** existem alteracoes locais nao commitadas de frentes paralelas (`SPEC-20261116-WHATSAPP-REALTIME-SYNC-E2E.md`, `SPEC-PROPOSAL-STUDIO-V2.md`, `travel-proposal.functions.ts`, `unified-proposal-workspace.tsx`, `travel-operator-ocr.functions.ts`, etc.). Nenhuma alteracao preexistente foi tocada nesta auditoria.
- **Testes baseline executados em 2026-11-16 (`c0e1d351`):**
  - `node ./node_modules/vitest/vitest.mjs run src/lib/travel-opportunity-matcher.test.ts src/lib/travel/travel-commercial-intelligence.test.ts src/services/travel-commercial-intelligence.functions.test.ts src/services/travel-quote-capture.test.ts` -> **Exit Code 0** (4 arquivos, 21 testes aprovados; cobrem apenas payloads sinteticos isolados/mockados, sem detectar falsos positivos de destino ausente ou fallback de propostas).

---

## 2. Inventario Arquitetural Atual (Como Funciona Hoje)

Hoje o ecossistema possui **3 motores paralelos e parcialmente desconexos** para Oportunidades, Cadastration de Leads/Interesses e Matching:

| Eixo | Tabelas Supabase | Logica de Matching | Servico BFF / API | Superficie UI |
|---|---|---|---|---|
| **Motor 1: Radar Comercial & Memoria Anual** | `travel_commercial_contacts`, `travel_interests`, `travel_opportunity_matches` | `computeOfferInterestMatch()` em `src/lib/travel/travel-commercial-intelligence.ts` | `src/services/travel-commercial-intelligence.functions.ts` (`internalEvaluateOfferMatches`, `evaluateOfferMatchesFn`, `listOpportunityMatchesFn`, `promoteOpportunityToCrmLeadFn`) | `src/routes/workspace.turismo.oportunidades.tsx` |
| **Motor 2: Captura InfoTravel & Demandas** | `travel_client_demands`, `travel_quote_captures`, `travel_quote_capture_items`, `travel_price_observations`, `travel_opportunities` | `matchQuoteWithDemand()` em `src/lib/travel-opportunity-matcher.ts` | `src/services/travel-quote-capture.functions.ts` (`ingestTravelQuoteCapture`, `evaluateRadarForCapture`, `listTravelOpportunities`), `src/routes/api.v1.ingest.infotravel-quotes.ts` | Sem rota propria em `/workspace/turismo/oportunidades`; exibicao parcial em `TourismPipeCardDossier.tsx` via `getCustomer360Profile` |
| **Motor 3: Funil CRM & Dossie do Lead** | `leads_crm`, `travel_leads_qualification`, `travel_proposals`, `travel_quotes` | Filtro inline de substring no frontend (`TourismPipeCardDossier.tsx:661-684`) | `src/services/crm.functions.ts` (`createLead`, `updateLeadDetails`, `getCustomer360Profile`, `getCustomer360`), `src/services/travel-proposal.functions.ts`, `src/services/travel-continuous-flow.functions.ts` | `workspace.turismo.index.tsx`, `workspace.comercial.tsx`, `TourismPipeCardDossier.tsx`, `UnifiedProposalWorkspace.tsx`, `workspace.clientes.$id.tsx` |

### Fontes de Catalogo Geografico e Ocupacao Existentes

| Dominio | Fonte no Banco (`supabase/migrations/`) | Catalogo / Servico Existente | Situacao Atual no Cadastro de Leads/Interesses |
|---|---|---|---|
| Destinos Turisticos | `public.destinations` (`20260903090000`) | `listDestinations()` (`travel-catalog.functions.ts:215`), `CANONICAL_DESTINATIONS` (`src/lib/tourism/destinations-catalog.ts:72`) | Nao conectado aos formularios de Lead (`leads_crm`) nem ao Radar (`travel_interests`). |
| Gateways Regionais | `public.travel_destination_gateways` (`20270211000000:84`) | Liga destinos sem aeroporto (ex: Gramado -> POA, Penha -> NVT) | Usado apenas na proposta (`UnifiedProposalWorkspace`), ignorado no matcher de oportunidades. |
| Cidades IBGE | `public.cities_global` (`20261102000000:51`) | `searchCentralCities()` (`central-knowledge.functions.ts:153`), `GLOBAL_BRAZIL_CITIES_CATALOG` | Nao usado em nenhum seletor de destino de lead ou interesse. |
| Aeroportos IATA | `public.airports_global`, `public.ck_airports` (`20270225000000`) | `searchGlobalAirports()` (`tourism-airports.functions.ts:25`), `AirportCombobox` (`src/components/ui/airport-combobox.tsx`), `GLOBAL_AIRPORTS_CATALOG` (7.314 aeroportos) | Usado apenas em cotadores aereos, ausente no cadastro de leads/interesses. |
| Quartos & Idades | `travel_proposals.rooms` (`jsonb`), `travel_quotes.room_occupancies` / `children_ages`, `travel_leads_qualification.pax_children_ages` (`INT[]`) | `normalizeInfoTravelRoomOccupancies()` (`infotravel.ts`), `PassHubLiveQuoterPanel.tsx` (contagem por quarto), `SmartTravelBookingModal.tsx` (idades 0-11 flat) | `leads_crm` e `travel_interests` nao possuem estrutura de quartos; `pax_ages` e digitado como texto livre separado por virgula em `workspace.turismo.index.tsx:2084` e `workspace.comercial.tsx:1452`, e nem existe em `TourismPipeCardDossier.tsx` nem em `NewInterestSheet`. Mesmo `UnifiedProposalWorkspace.tsx:3284` fixa `childrenAges: [...room.childrenAges, 5]` sem seletor de idade por crianca. |

---

## 3. Causas-Raiz Confirmadas (Achados de Auditoria)

| ID | Sev. | Arquivo e Linha (Prova) | Comportamento Defeituoso Observado | Impacto em Producao |
|---|---|---|---|---|
| **F-OPP-01** | P0 | `src/components/tourism/crm/TourismPipeCardDossier.tsx:683` | `return destMatches.length > 0 ? destMatches.slice(0, 6) : otherProposals.slice(0, 6);` | Quando nenhuma proposta bate com o destino do lead, exibe as ultimas 6 propostas aleatorias de outros clientes. |
| **F-OPP-02** | P0 | `src/services/crm.functions.ts:3623-3654` | `getCustomer360Profile` consulta as ultimas 15 linhas de `travel_quote_captures` e `travel_opportunities` filtrando apenas por `store_id` (sem filtrar por `lead_id`, destino, datas ou pax) e sobrescreve `destination: lead.destination || "Rota Monitorada"` na linha 3650. | Toda ficha de lead no Kanban exibe capturas e oportunidades da loja inteira como se fossem daquele lead. |
| **F-OPP-03** | P0 | `src/lib/travel/travel-commercial-intelligence.ts:368-378` | `computeOfferInterestMatch` corta apenas em `totalScore < 45` sem exigir `destMatch.score > 0`. Orcamento nao definido soma `20/25`, data flexivel soma `20/20` (ou divergente `8/20`), pax soma `5..10/10`, inclusoes vazias somam `10/10`. | Oferta de destino completamente diferente atinge `0 + 20 + 20 + 10 + 10 = 60 pts >= 45` (e passa o `minScore: 60` do BFF), gerando falsos positivos persistidos em `travel_opportunity_matches`. |
| **F-OPP-04** | P0 | `src/services/travel-proposal.functions.ts:1179-1993` | `createTravelProposal` e `updateTravelProposal` nao disparam nenhuma avaliacao de radar contra outros leads/interesses ativos. | Ao montar ou enviar uma proposta/orcamento para o Lead A, o sistema nao identifica nem notifica outros leads compatíveis (Lead B, Lead C). |
| **F-OPP-05** | P1 | `src/services/travel-quote-capture.functions.ts:285-317` | `evaluateRadarForCapture` usa `earliest = lead.travel_start || lead.departure_date || captureData.startDate` (forcando match de data quando o lead nao tem data) e passa `budgetMaxCents: Number(lead.budget_cents || lead.estimated_value_cents || 0)` (rejeitando toda cotacao quando `budget = 0`). | Falsos positivos de data em leads sem data definida e falsos negativos totais em leads sem orcamento preenchido. |
| **F-OPP-06** | P1 | `src/lib/travel-opportunity-matcher.ts:185-189` e `src/lib/travel/travel-commercial-intelligence.ts:299-318` | Ambos os matchers ignoram `rooms` e `childrenAges` (0-17). Em `workspace.turismo.oportunidades.tsx:878` e `travel-commercial-intelligence.functions.ts:644`, `childrenAges` e gravado como `[]` hardcoded. | Impossivel distinguir crianca colo (0-1a), crianca tarifada (2-11a) ou adolescente tarifa adulto (12-17a), nem validar capacidade por quarto. |
| **F-OPP-07** | P1 | `workspace.turismo.index.tsx:1980`, `workspace.comercial.tsx:1352`, `TourismPipeCardDossier.tsx:2066`, `workspace.turismo.oportunidades.tsx:958` | Destinos e periodos sao `<Input>` de texto solto (sem tag picker conectado a `destinations`/`cities_global`/`airports_global`); `TourismPipeCardDossier` nem exibe/edita `pax_ages` ou `interest_period`. | Dados entram heterogeneos ("porto seguro bahia", "Julho", "2 cr 5 e 11a" em notas), quebrando normalizacao e cruzamento. |
| **F-OPP-08** | P1 | `src/services/travel-quote-capture.functions.ts:339-346` e `supabase/migrations/20270320000000` vs `20270327000000` | `evaluateRadarForCapture` sobrescreve `leads_crm.custom_fields.infotravel_opportunity` com objeto unico; `travel_client_demands` referencia `crm_leads` enquanto `travel_opportunities` ganhou FK para `leads_crm`. | Sobrescreve historico de matches no lead e fragmenta oportunidades entre `travel_opportunities` (nao visivel em `/workspace/turismo/oportunidades`) e `travel_opportunity_matches`. |
| **F-OPP-09** | P1 | `src/services/travel-ai-extractor.functions.ts`, `src/services/travel-operator-ocr.functions.ts` | Extratores atuais leem apenas flyers de oferta ou PDF de operadora; nao existe parser IA/Markdown de intencao do lead nem normalizador semantico para propostas/orcamentos recebidos alimentarem o Radar. | Leads colados de WhatsApp/Markdown/briefings permanecem presos em `notes` sem estruturar destinos, periodos, quartos e idades. |

---

## 4. Requisitos EARS da Arquitetura Unificada

### 4.1 Hard-Gates, Simulacao de Criancas (0-17) e Matching Deterministico Real (Zero Falsos Positivos)

- **REQ-M01 (Gate de Destino/Gateway):** QUANDO o motor unificado avaliar compatibilidade entre uma Oferta (proposta enviada, cotacao capturada, pacote `classifieds` ou oferta OCR) e uma Demanda/Lead (`leads_crm`, `travel_interests`, `travel_client_demands`), o motor DEVE exigir correspondencia positiva de destino via (a) cidade normalizada, (b) codigo IATA exato ou (c) aeroporto gateway mapeado em `travel_destination_gateways` (ex: Gramado <-> POA, Penha <-> NVT). SE nenhum destino da demanda corresponder ao destino ou gateway da oferta (`destinationScore === 0`), ENTÃO o motor DEVE retornar `isMatch: false` e `matchScore: 0`, independentemente da pontuacao das demais dimensoes.
- **REQ-M02 (Gate de Periodo/Datas):** QUANDO a demanda possuir janela de datas (`travel_start`/`travel_end`), meses alvo (`target_months: YYYY-MM[]`) ou temporadas (`period_tags`), o motor DEVE exigir intersecao valida dentro da tolerancia configuravel (`flexibility_days`, padrao 3 dias para datas exatas ou mesmo mes para `target_months`). SE a oferta cair fora da janela e a demanda NAO estiver marcada explicitamente como `flexible_anytime`, ENTÃO o motor DEVE retornar `isMatch: false`. SE o lead/demanda nao tiver datas nem flexibilidade declarada, ENTÃO o sistema NAO DEVE inventar data igual a oferta; deve rejeitar match automatico estrito sem inventar compatibilidade temporal.
- **REQ-M03 (Gate de Passageiros, Quartos, Idades 0-17 e Simulacao Tarifaria de Criancas):** QUANDO a oferta possuir composicao de quartos e/ou contagem de adultos/criancas/idades, o motor DEVE classificar as idades de `0` a `17` anos em tres faixas operacionais:
  - `0 a 1 ano` (ate 1 ano, 11 meses e 29 dias / `< 2 anos`): **Colo / Infante** (taxa minima/colo aerea, sem custo integral de hotel/assento).
  - `2 a 11 anos` (2 anos completos ate 11 anos, 11 meses e 29 dias / `< 12 anos incompletos`): **CHD** — quando a oferta foi cotada somente para adultos ou sem preco explicito de crianca, o backend DEVE simular o custo por crianca somando **tarifa aerea por adulto + transfer por adulto** (valores reais da cotacao/voo/transfer quando discriminados na proposta/captura, ou estimativa calibrada da fracao aereo+transfer quando pacote fechado sem abertura), sinalizando `requiresChildRequote: true` e classificando como `conditional_child_requote`.
  - `12 a 17 anos`: **Adolescente / Tarifa Adulto** — tratado como assento/hospedagem tarifa adulto integral (`100%` da base por adulto) tanto no calculo de ocupacao quanto na simulacao orçamentaria.
  - Quando ambos informarem `rooms`, o motor valida compatibilidade de quantidade e distribuicao de quartos; divergencias aparecem explicitamente em `dimensions` e `warnings`.
- **REQ-M04 (Gate Orcamentario + Comparativo Historico de Vantagem):** QUANDO a demanda possuir teto orcamentario (`budget_max_cents > 0` ou `max_installment_cents > 0`), o motor DEVE comparar contra `simulatedTotalCents` (quando houver simulacao de criancas/quartos) ou `offer.totalCents`, rejeitando ofertas acima do teto + tolerancia configuravel (`budgetTolerancePct`, padrao 10%). QUANDO a demanda nao tiver orcamento informado (`null` ou `0`), o motor NAO DEVE atribuir pontos cheios nem rejeitar silenciosamente por `0`: deve sinalizar `budgetStatus: "open_to_validate"` ("Orcamento aberto — validar teto") e pontuar com base em Destino + Datas + Passageiros/Quartos. Alem disso, o motor DEVE cruzar a tarifa por adulto/total com o historico de cotações e observações (`travel_price_observations`, `travel_proposals`, `travel_quotes`) do mesmo destino para calcular `historicalMedianCents`, `historicalSavingsPct` e `historicalVerdict` (`great_deal`, `fair_price`, `above_market`, `insufficient_history`), indicando se a tarifa promocional compensa mesmo apos simular criancas.
- **REQ-M05 (Eliminacao de Fallbacks Aleatorios no Dossie):** No `getCustomer360Profile` (`src/services/crm.functions.ts`) e no `TourismPipeCardDossier.tsx`:
  - É PROIBIDO retornar propostas, capturas InfoTravel ou oportunidades de outros destinos/leads via `.slice(0, 6)` quando nao houver match real.
  - Cada item exibido na aba `Oportunidades` do lead DEVE exibir `match_score`, motivos objetivos (`match_reasons`) e divergencias/alertas (ex: "Diferenca de 1 crianca", "+6% do teto"). Se nao houver matches validos, renderizar estado vazio honesto.

### 4.2 Disparo Bidirecional em Propostas, Orcamentos, Capturas e Leads

- **REQ-B01 (Ao Criar ou Enviar Proposta/Orcamento):** QUANDO um agente criar ou atualizar uma proposta para `status = 'sent'` (`createTravelProposal`, `updateTravelProposal`) OU registrar uma cotacao em `travel_quotes` OU capturar uma cotacao via extensao (`/api/v1/ingest/infotravel-quotes`) OU publicar oferta via OCR (`publishExtractedTravelPackageToCatalogAndMatchRadar`), o BFF DEVE avaliar automaticamente todos os leads ativos (`leads_crm`), interesses (`travel_interests`) e demandas (`travel_client_demands`) do mesmo `store_id` (excluindo o proprio lead/cliente destinatario da proposta e leads em `won`/`lost`/`opted_out`).
- **REQ-B02 (Anti-Repeticao / Cooldown):** SE um lead candidato ja recebeu proposta equivalente (mesmo destino normalizado e mesma janela de mes/datas) nos ultimos 30 dias, ENTÃO o match gerado DEVE incluir flag `alreadyProposedRecently: true` com data/titulo da proposta anterior para evitar abordagem duplicada.
- **REQ-B03 (Retorno Imediato no Workspace da Proposta):** QUANDO `createTravelProposal` ou `updateTravelProposal` concluir o envio, o retorno BFF DEVE incluir `matchedLeadsCount` e resumo dos matches qualificados para exibicao imediata de toast/drawer "Outros leads compativeis encontrados" com link direto para `/workspace/turismo/oportunidades` ou para cada lead.
- **REQ-B04 (Ao Cadastrar ou Atualizar Lead/Interesse):** QUANDO um lead for criado ou atualizado (`createLead`, `updateLeadDetails`, `upsertTravelInterestFn`, `upsertLeadQualification`), o BFF DEVE reavaliar as ofertas/propostas/capturas recentes e ativas da loja para popular oportunidades reais imediatamente (sem exigir espera por nova captura).

### 4.3 Cadastro Estruturado: Destinos, Periodos e Quartos/Idades (0-17)

- **REQ-U01 (Multi-Select Tag Picker de Destinos Conectado ao DB):** Todos os pontos de cadastro/edicao de Lead e Interesse DEVEM oferecer um componente canonico reutilizavel (`DestinationTagsPicker`) com busca instantanea unificada em `destinations`, `travel_destination_gateways`, `cities_global` e `airports_global` (com fallback in-memory `CANONICAL_DESTINATIONS` e `GLOBAL_AIRPORTS_CATALOG`), permitindo selecionar 1 ou mais destinos/cidades/aeroportos como tags estruturadas (`{ label, normalized, iata?, destinationId?, cityIbge?, country? }`), preservando texto livre legado quando ja existir no banco.
- **REQ-U02 (Seletor Estruturado de Periodos e Flexibilidade):** Todos os formularios de Lead e Interesse DEVEM oferecer `TravelPeriodPicker` permitindo escolher:
  - Modo de data: `Datas exatas` (`travel_start`, `travel_end` + `flexibility_days`), `Mes(es) alvo` (multi-select de chips `YYYY-MM`, ex: `2026-07`, `2026-08`), `Temporada/Feriado` (multi-select tags: `Ferias de Julho`, `Reveillon`, `Carnaval`, `Natal Luz`, `Baixa Temporada`, `Feriados`), ou `Totalmente flexivel`.
  - Mantem `interest_period` sincronizado como resumo legivel para cards do Kanban e exportacoes.
- **REQ-U03 (Construtor Estruturado de Quartos e Idades 0-17):** Todos os formularios de Lead, Interesse, Cotacao e Proposta DEVEM compartilhar um componente canonico (`RoomOccupancyBuilder`):
  - O usuario adiciona/remove Quartos (`Quarto 1`, `Quarto 2`, ...).
  - Dentro de cada quarto, define numero de Adultos (`1..10`) e numero de Criancas/Adolescentes ate 17 anos (`0..6`).
  - Para cada crianca adicionada, renderiza obrigatoriamente um `<Select>` individual de idade de `0` ("Menor de 1 ano (colo)") a `17` ("17 anos") — ex: `Crianca 1: 5 anos`, `Crianca 2: 11 anos`.
  - O estado estruturado `rooms: RoomOccupancySpec[]` deriva automaticamente e de forma deterministica: `pax_adults`, `pax_children`, `pax_infants` (calculado para `< 2` anos quando aplicavel em aereo/relatorios), `pax_ages` / `children_ages` (array plano ordenado) e `rooms_count`.
  - Deve ser aplicado também no `UnifiedProposalWorkspace.tsx` (que hoje nao possui seletor de idade das criancas no card de quarto!) e no `TourismPipeCardDossier.tsx` (que hoje nao possui campos de `pax_ages` nem quartos!).

### 4.4 Parser Inteligente por IA (Markdown / Texto Livre -> Dados Estruturados)

- **REQ-AI01 (Leitura de Markdown / Mensagem de Lead):** QUANDO o atendente colar um resumo em Markdown, conversa de WhatsApp ou briefing livre em um modal/lead/interesse e acionar "Extrair com IA", uma Server Function BFF (`parseTravelIntentFromTextAI` usando `executeUnifiedAiCall`) DEVE extrair e validar com Zod:
  - `contact` (nome, telefone, e-mail, cidade de origem se houver);
  - `destinations` reconciliados contra `destinations` / `cities_global` / `airports_global` / `travel_destination_gateways`;
  - `periods` (datas exatas, meses `YYYY-MM`, temporadas, `flexibility_days`);
  - `rooms` com `adults` e `childrenAges` (`0..17`);
  - `budget` (`maxTotalBudgetCents`, `maxInstallmentCents`, `preferredInstallments`, `priceBasis`);
  - `productType`, `inclusionsWanted`, `hotelStarsMin`, `mealPlan`, `confidenceScore`, `reviewFlags`.
  - O texto original (Markdown/WhatsApp) DEVE permanecer salvo intacto em `source_inquiry_text` / `notes` / `custom_fields.raw_intent_markdown` para nunca perder contexto humano.
- **REQ-AI02 (Enriquecimento de Propostas/Orcamentos Recebidos):** QUANDO um orcamento em texto/PDF/print for processado (ou uma proposta for salva sem campos canonicos completos), o normalizador de oferta DEVE resolver `destination_city` + `destination_iata` + `rooms`/`childrenAges` + `dates` + `total_cents` antes de rodar o motor de oportunidades, sem nunca inventar campos ausentes (campos nao encontrados permanecem `null` com `requiresReview: true`).

---

## 5. Estrategia de Seguranca para Producao (Zero Perda de Dados / Zero Downtime)

1. **Migrations 100% Aditivas e Idempotentes:**
   - Nenhuma tabela ou coluna existente sera removida ou renomeada (`leads_crm`, `travel_interests`, `travel_commercial_contacts`, `travel_opportunity_matches`, `travel_client_demands`, `travel_quote_captures`, `travel_opportunities`, `travel_proposals`, `travel_quotes`).
   - Novas colunas estruturadas em `leads_crm` (ex: `destination_tags JSONB`, `period_tags JSONB`, `target_months TEXT[]`, `flexibility_days INT`, `room_occupancies JSONB`, `intent_profile JSONB`, `raw_intent_markdown TEXT`, `last_matched_at TIMESTAMPTZ`) e em `travel_interests` / `travel_proposals` / `travel_opportunities` (ex: `source_proposal_id UUID`, `source_type TEXT`, `rooms JSONB`, `target_lead_id UUID`, `match_version TEXT`, `warnings TEXT[]`) usam `ADD COLUMN IF NOT EXISTS` com defaults seguros (`'[]'::jsonb`, `'{}'::jsonb`, `NULL`).
2. **Leitura Retrocompativel (Dual-Read / Lazy Normalization):**
   - Leads, interesses e propostas ja gravados em producao com `destination` string simples, `interest_period` texto livre ou `pax_ages` legado continuam 100% visiveis e legiveis por um normalizador deterministico (`normalizeLegacyLeadIntent()`), que preenche a camada estruturada em memoria na leitura e atualiza progressivamente no proximo save ou via job/botao opcional de reindexacao segura.
3. **Compatibilizacao e Nativizacao Integral de Dados em `travel_opportunity_matches` e `travel_opportunities`:**
   - Todos os registros ja gravados em producao (`leads_crm`, `travel_interests`, `travel_client_demands`, `travel_opportunity_matches`, `travel_opportunities`, `travel_quotes`, `travel_proposals`) serao **preservados e compatibilizados nativamente**, sem ocultar dados nem criar "modo legado/deprecado".
   - Ao executar reavaliacao ou carga, leads e interesses antigos tem seus textos (`destination`, `interest_period`, `pax_adults`/`pax_children`/`pax_ages`) normalizados automaticamente para o contrato canonico; matches ja abordados/promovidos permanecem preservados na integra, e matches abertos podem ser recalculados/enriquecidos com simulacao tarifaria, motivos objetivos e comparativo historico.
4. **Isolamento Multi-Tenant e BFF Integrity:**
   - Toda consulta e mutacao continua exigindo `requireStaff()` / `assertStoreAccess()` e filtro estrito por `store_id`, alem de RLS ativa.
   - Todo payload Zod desestrutura 100% dos campos e cobre branches presentes e ausentes em testes unitarios (invariante B.25).

---

## 6. Decisoes de Produto Aprovadas pelo Usuario (2026-11-16)

1. **Unificacao da Visao de Oportunidades (`/workspace/turismo/oportunidades`):** Motor Unico (`src/lib/travel/opportunity-matching-engine.ts`) unificando todas as fontes (`Proposta Enviada`, `Captura InfoTravel`, `Pacote/OCR`, `Cotacao Salva`) em uma unica superficie sem perda de registros antigos.
2. **Simulacao Tarifaria de Criancas (0-17) no Backend:** Quando oferta for cotada so para adultos e o lead possuir criancas de `2 a 11 anos` (2 anos completos ate 11a 11m 29d), o backend simula o custo usando **tarifa aerea + transfer por adulto** (real quando discriminado ou fracao calibrada quando pacote fechado), trata `0 a 1 ano` como colo e `12 a 17 anos` como tarifa adulto, valida se cabe no orcamento e cruza com o historico de cotações para indicar vantagem tarifaria.
3. **Datas e Orcamentos Abertos:** Exige intersecao real de datas/meses/temporada ou flag `flexible_anytime` (nunca inventa data atual); orcamento ausente (`0/null`) nao gera pontuacao falsa nem bloqueia silenciosamente, sendo sinalizado como `Aberto (validar teto)` apenas quando Destino + Periodo + Ocupacao baterem.
4. **Zero Deprecacao / Nativizacao Completa:** Todos os registros de producao existentes sao compatibilizados e enriquecidos de forma nao destrutiva, sem mascaras ou ocultamento.

---

## 7. Plano de Ondas e Propagacao End-to-End

| Onda | Escopo e Arquivos Alvo | Criterio de Aceite e Prova |
|---|---|---|
| **Onda 1: Motor Deterministico Unificado + Testes de Regressao** | `src/lib/travel/opportunity-matching-engine.ts` (novo SSOT puro), adaptadores em `travel-commercial-intelligence.ts` e `travel-opportunity-matcher.ts`, testes unitarios com casos negativos rigorosos (destino diferente nunca passa, data divergente nunca passa, crianca/idade/quarto validado, budget 0 tratado). | Testes reproduzem os falsos positivos atuais na baseline e passam com 0 falsos positivos apos correcao. |
| **Onda 2: Schema Aditivo Zero-Loss + Unificacao BFF** | Nova migration aditiva (`leads_crm`, `travel_interests`, `travel_opportunities`, `travel_opportunity_matches`), reavaliacao bidirecional em `createTravelProposal`, `updateTravelProposal`, `createLead`, `updateLeadDetails`, `ingestTravelQuoteCapture`, e correcao de `getCustomer360Profile` (`crm.functions.ts`). | Sem drop/hide de dados; proposta enviada para Lead A detecta Lead B; `getCustomer360Profile` retorna apenas matches reais do lead. |
| **Onda 3: Componentes Canonicos Reutilizaveis de Cadastro Estruturado** | `DestinationTagsPicker` (busca `destinations` + `cities_global` + `airports_global` + gateways), `TravelPeriodTagsPicker` (datas, meses `YYYY-MM`, temporadas, flexibilidade), `RoomOccupancyBuilder` (quartos + adultos + seletor de idade 0-17 por crianca). | Conformidade total `design-lint` (44px touch target, `:focus-visible`, zero cores literais/colchetes, zero containeritis). |
| **Onda 4: Motor IA Markdown/Texto -> Lead Estruturado & Oferta** | Server function `parseTravelIntentFromTextAI` + UI "Colar Markdown / WhatsApp e Preencher com IA" com preview revisavel e preservacao integral do texto bruto. | Testes com fixtures reais de mensagens Markdown/WhatsApp; fallback honesto se provider falhar. |
| **Onda 5: Propagacao Integral em Todas as Telas do Sistema** | `workspace.turismo.oportunidades.tsx`, `workspace.turismo.index.tsx`, `workspace.comercial.tsx`, `TourismPipeCardDossier.tsx`, `UnifiedProposalWorkspace.tsx` (adicionar seletor de idade 0-17 nos quartos + alerta de outros leads compativeis ao enviar proposta), `workspace.turismo.cotacoes.tsx`, `workspace.clientes.$id.tsx`, `m.lead.$leadId.tsx`, `LeadImportModal.tsx`, `omnichannel-lead-ingestion.ts`. | `npm run typecheck`, `npm test`, `npm run lint:design`, `npm run build` Exit Code 0; verificacao E2E de browser e reload. |

---

## 8. Evidencias de Verificacao Final e DoD (2026-11-16)

| Gate / Comando | Resultado Observado | Escopo / Ressalva Real |
| :--- | :--- | :--- |
| `vitest` (6 arquivos travel/radar) | **36/36 testes PASS (Exit 0)** | `opportunity-matching-engine.test.ts` (10), `opportunity-radar-e2e.test.ts` (5), `travel-commercial-intelligence.functions.test.ts` (8), `travel-opportunity-matcher.test.ts` (7), `travel-commercial-intelligence.test.ts` (4), `travel-quote-capture.test.ts` (2). Mocks locais Supabase na BFF E2E. |
| `tsc --noEmit --project tsconfig.json` | **0 erros no escopo** (Exit 2 global) | 0 erros em todos os 23 arquivos deste escopo; 124 linhas de erro preexistentes exclusivamente fora do escopo (`branded-app/*`, `app.$slug.tsx`, `ChatQuickComposerModals.tsx`, `fast-company-onboarding.tsx`, `components/tourism/index.ts`, `lib/tourism/travel-blueprint.ts`, `whatsapp-channel-instances.functions.ts`). |
| `vite build` (cliente + SSR) + `check-client-server-leak` | Cliente + Leak **PASS (Exit 0)**; SSR barrado em arquivo externo | Cliente (`10.931` modulos -> `dist/assets/`) + `check-client-server-leak` (`670` chunks, Exit 0) + `route-budget-guard` (Exit 0). Fase SSR (`2.623` modulos) falhou em export ausente preexistente `branded-app.functions.ts:8` (`getSSRClient`). |
| `eslint` (arquivos novos e alterados) | **0 erros** (Exit 0) | 0 erros e 0 warnings em `opportunity-matching-engine.ts`, `travel-intent-parser.ts`, `travel-intent-ai.functions.ts`, `opportunity-radar.functions.ts`; 0 erros (372 warnings preexistentes `no-explicit-any`/`no-empty`) nos 6 workspaces/BFFs maiores. |
| `design-lint --ratchet` & `audit:buttons` | **PASS (Exit 0)** | **0 violações** (`P0=0`, `P1=0`, `P2=0`, `P3=0`) nos `2.359` arquivos inspecionados (`CATRACA APROVADA`). `audit-interactive-buttons`: `9.860` controles (`P0=0`, `P1=0`, `P2=0`). |
| `check-type-duplications` / `check-naming` / `check-circular-deps` / `check-schema` / `check-bff` / `validate-migration-inventory` / `token-sync` / `contrast-audit` / `scan-secrets` / `dead-code-detector` | **TODOS Exit 0** | 0 tipos duplicados, 0 ciclos (`2.915` arquivos), 0 violações naming, `635` migrations em `check-schema`/`check-bff` (`0` tabelas BFF ausentes; `634` no momento do `validate-migration-inventory` anterior), 100% paridade tokens/contraste WCAG AA, 0 segredos (`6.714` arquivos), 0 orfaos no escopo. |

- **Pendencia operacional de producao:** aplicar `supabase/migrations/20270526000000_unified_opportunity_radar_and_structured_leads.sql` via `supabase db push` no ambiente remoto (ATE la, as funcoes BFF preservam operacao zero-downtime via retry defensivo `42703`/`PGRST204`), e executar smoke E2E em browser autenticado com banco remoto ativo apos o push.
