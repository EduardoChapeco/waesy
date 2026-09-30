# 04-schema-mapa.md — Mapeamento de Schemas Legados para o Waesy Canônico

## 1. Mapeamento de Schemas (Legado → Waesy)

### 1.1. Brand Kit & Identidade de Marca
- **Origem Legada:** `simwork.brand_kits` + `ENGIOS.engios_brand_kits` + `brand-builder-ai.extract-brand-identity`
- **Destino no Waesy:** Tabela `public.brand_dna_profiles` (estendida via migration `20261213000000`)

| Campo Legado (simwork/ENGIOS) | Tipo Legado | Campo Waesy Canônico | Tipo Waesy | Normalização / Regra de Negócio |
| :--- | :--- | :--- | :--- | :--- |
| `brand_kits.workspace_id` | `UUID` | `store_id` | `UUID NOT NULL` | Vinculação estrita ao tenant `stores(id)` com RLS |
| `brand_kits.colors` | `JSONB` | `color_palette` | `JSONB NOT NULL` | `{ primary, secondary, accent, background, text, palette: [] }` |
| `brand_kits.fonts` | `JSONB` | `typography` | `JSONB NOT NULL` | `{ heading, body, mono, display }` com Google Fonts canônicas |
| `brand_kits.logos` | `JSONB` | `logos` | `JSONB NOT NULL` | `{ main_url, dark_url, icon_url, light_url }` em storage protegido |
| `brand_kits.voice` | `JSONB` | `tone_of_voice` + `tone_rules` | `TEXT` + `TEXT[]` | Desnormalizado em colunas de alto desempenho para prompts |
| `extract-brand.deep_dna.archetype` | `TEXT` | `archetype` | `TEXT NOT NULL` | 12 Arquétipos canônicos de Carl Jung |
| `extract-brand.deep_dna.content_pillars` | `TEXT[]` | `content_pillars` | `TEXT[] NOT NULL` | 3 a 5 pilares estratégicos de conteúdo |
| `extract-brand.deep_dna.hook_patterns` | `TEXT[]` | `seven_sins_triggers` | `JSONB NOT NULL` | Ganchos vinculados aos 7 Pecados Capitais |
| `Novo` | N/A | `generated_by_job_id` | `TEXT` | ID de rastreabilidade de IA |
| `Novo` | N/A | `ai_model` | `TEXT` | Modelo de IA gerador |
| `Novo` | N/A | `confidence` | `NUMERIC(3, 2)` | Índice de confiança (0.00 a 1.00) |
| `Novo` | N/A | `edited_by_human` | `BOOLEAN` | Sinalizador de validação humana (HITL) |

---

### 1.2. Business Model Canvas (BMC de 9 Blocos)
- **Origem Legada:** `lean-canvas-creator` + `wider-669929d7`
- **Destino no Waesy:** Tabela nova `public.store_business_model_canvas`

| Bloco BMC | Campo Waesy | Tipo | Descrição Semântica |
| :--- | :--- | :--- | :--- |
| **Parceiros-Chave** | `key_partners` | `JSONB NOT NULL` | Lista de alianças estratégicas, fornecedores e canais complementares |
| **Atividades-Chave** | `key_activities` | `JSONB NOT NULL` | Ações operacionais centrais para entrega da proposta de valor |
| **Recursos Principais** | `key_resources` | `JSONB NOT NULL` | Ativos físicos, humanos, intelectuais e tecnológicos indispensáveis |
| **Proposta de Valor** | `value_propositions` | `JSONB NOT NULL` | Conjunto de produtos e serviços que resolvem dores do cliente |
| **Relacionamento** | `customer_relationships` | `JSONB NOT NULL` | Tipos de relação estabelecida (pessoal, automatizada, comunidade) |
| **Canais** | `channels` | `JSONB NOT NULL` | Pontos de contato e entrega (WhatsApp, PDV, Vitrine, Redes) |
| **Segmentos** | `customer_segments` | `JSONB NOT NULL` | Grupos de pessoas/empresas que a loja visa alcançar |
| **Estrutura de Custos** | `cost_structure` | `JSONB NOT NULL` | Principais direcionadores de custos da operação |
| **Fontes de Receita** | `revenue_streams` | `JSONB NOT NULL` | Formas pelas quais a loja monetiza (venda direta, assinatura, taxa) |

---

### 1.3. Populações Sintéticas Calibradas (SimLab V2)
- **Origem Legada:** `simwork/simlab/simlab/personas/seed_personas.json`
- **Destino no Waesy:** Tabela nova `public.synthetic_population_archetypes`

| Campo Legado (`seed_personas.json`) | Campo Waesy Canônico | Tipo | Descrição |
| :--- | :--- | :--- | :--- |
| `id` | `code` | `TEXT UNIQUE` | Código do arquétipo (ex.: `BR_F_52_INTERIOR_CONSERVADORA`) |
| `name` | `display_name` | `TEXT NOT NULL` | Nome representativo (ex.: `Vera`) |
| `demographic.gender` | `gender` | `TEXT NOT NULL` | Gênero sociológico |
| `demographic.age` | `age` | `INT NOT NULL` | Idade em anos |
| `demographic.city` | `city` | `TEXT NOT NULL` | Cidade (Chapecó, São Miguel do Oeste, etc.) |
| `demographic.state` | `state` | `TEXT NOT NULL` | Unidade federativa (SC, RS, PR, etc.) |
| `demographic.income` | `median_income_brl` | `NUMERIC(10, 2)` | Renda média mensal em reais |
| `demographic.occupation` | `occupation` | `TEXT NOT NULL` | Ocupação / profissão |
| `psychography` | `psychography` | `JSONB NOT NULL` | Valores, medos e aspirações de vida |
| `digital_behavior` | `digital_behavior` | `JSONB NOT NULL` | Canais, formatos e meios de pagamento habituais |
| `trigger_scores` | `trigger_scores` | `JSONB NOT NULL` | Pontuação de gatilhos (urgência, prova social, desconto, etc.) |
| `calibration` | `calibration` | `JSONB NOT NULL` | Nível de cinismo, necessidade cognitiva e controle financeiro |
