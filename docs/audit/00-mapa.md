# Mapa do Ecossistema de Onboarding IA — Waesy

**Data:** 2026-09-30  
**Status:** Mapeamento Forense Completo (Fase 0)  
**Metodologia:** Inspeção estrita de código-fonte, esquemas SQL e repositórios de referência. Sem opiniões, apenas fatos com caminhos e linhas.

---

## 1. Fluxo de Onboarding no Repositório Local (Waesy)

O fluxo de Onboarding Inteligente / Mágico local é composto pela seguinte cadeia de arquivos:

### 1.1 Interface de Usuário (UI)
- [`src/components/onboarding/magic-onboarding-card.tsx`](file:///c:/Users/Excelência Tour SMO/Documents/waesy/src/components/onboarding/magic-onboarding-card.tsx#L1-L187): Cartão de ativação do Onboarding Mágico. Apresenta formulário de entrada para URL/Instagram e dispara a Server Function.
- [`src/routes/workspace.configuracoes.identidade.tsx`](file:///c:/Users/Excelência Tour SMO/Documents/waesy/src/routes/workspace.configuracoes.identidade.tsx): Página de gestão de identidade visual e dados cadastrais da loja.
- [`src/routes/workspace.marketing.canvas-pecados.tsx`](file:///c:/Users/Excelência Tour SMO/Documents/waesy/src/routes/workspace.marketing.canvas-pecados.tsx#L1-L530): Interface de visualização e geração de ganchos do Canvas dos 7 Pecados Capitais.
- [`src/routes/workspace.onboarding.multimodal.tsx`](file:///c:/Users/Excelência Tour SMO/Documents/waesy/src/routes/workspace.onboarding.multimodal.tsx): Rota de upload e ingestão multimodal (cardápios e fotos).

### 1.2 Camada BFF / Server Functions
- [`src/services/magic-onboarding.functions.ts`](file:///c:/Users/Excelência Tour SMO/Documents/waesy/src/services/magic-onboarding.functions.ts#L1-L246): Ponto de entrada do onboarding via URL. Realiza raspagem, chama IA e cadastra na loja.
- [`src/services/multimodal-onboarding.functions.ts`](file:///c:/Users/Excelência Tour SMO/Documents/waesy/src/services/multimodal-onboarding.functions.ts#L1-L708): Ingestão de cardápios e OCR multimodal para restaurantes.
- [`src/services/seven-sins-simlab.functions.ts`](file:///c:/Users/Excelência Tour SMO/Documents/waesy/src/services/seven-sins-simlab.functions.ts#L1-L474): Geração de ganchos persuasivos baseados nos 7 Pecados Capitais e SimLab.
- [`src/services/market-radar.functions.ts`](file:///c:/Users/Excelência Tour SMO/Documents/waesy/src/services/market-radar.functions.ts#L1-L700): Monitoramento de concorrentes, chamadas Firecrawl e Steel.dev.

### 1.3 Camada de Extração & Web Crawling
- [`src/services/mining/mechanical-extractor.ts`](file:///c:/Users/Excelência Tour SMO/Documents/waesy/src/services/mining/mechanical-extractor.ts): Extrator mecânico via cheerio/fetch simples.
- [`src/lib/mining/firecrawl-client.ts`](file:///c:/Users/Excelência Tour SMO/Documents/waesy/src/lib/mining/firecrawl-client.ts#L1-L211): Cliente integrado com API oficial do Firecrawl (`https://api.firecrawl.dev/v1/scrape`) e fallback com screenshot Steel.dev (`https://api.steel.dev/v1/screenshot`).

### 1.4 Orquestração e Provedores de IA
- [`src/services/ai-core-gateway.functions.ts`](file:///c:/Users/Excelência Tour SMO/Documents/waesy/src/services/ai-core-gateway.functions.ts#L1-L890): Gateway canônico com Roteamento por Tarefa, Circuit Breakers, Verificação de Prompt Injection, Cache de Respostas (`ai_response_cache`) e Telemetria de Custo real em USD (`ai_telemetry_logs`).
- [`src/services/api-orchestrator.functions.ts`](file:///c:/Users/Excelência Tour SMO/Documents/waesy/src/services/api-orchestrator.functions.ts#L1-L1348): Pool de chaves com failover automático (`api_key_pools`), suporte a BYOK do usuário e função `executeUnifiedAiCall`.

### 1.5 Tarifação e Moeda da Plataforma
- [`src/lib/token-tollbooth.server.ts`](file:///c:/Users/Excelência Tour SMO/Documents/waesy/src/lib/token-tollbooth.server.ts#L1-L172): Interceptador central pré-voo (`requireTokensOrTollbooth`). Efetua débito transacional atômico no Postgres via RPC `charge_token_tollbooth`, valida idempotência e executa estorno criptográfico automático (`credit_store_tokens_strict`) em caso de falha a jusante.

---

## 2. Repositórios Locais de Referência (Projetos-Referências)

Localização no disco: `c:\Users\Excelência Tour SMO\Documents\projetos-referencias\`

| Repositório | Módulos & Arquivos Relevantes | Capacidades Identificadas |
|---|---|---|
| **ENGIOS** | `app/lib/squads/agents/brand.agent.ts`<br>`app/lib/squads/agents/sherlock.agent.ts`<br>`app/lib/squads/core/frameworks.ts`<br>`app/lib/squads/core/orchestrator.ts`<br>`app/lib/verification/catalog/market-research.ts` | **Brand Strategy PhD:** Metodologias Kapferer, Aaker, Google Ventures Sprint, Arquétipos Junguianos, Paleta Semântica, Tom de Voz (Do/Don't).<br>**Sherlock OSINT:** Inteligência competitiva, auditoria de redes sociais, extração de lacunas.<br>**Frameworks Estratégicos:** AIDA, PAS, Storybrand, SWOT, Blue Ocean, Porter 5 Forces, Pirate Metrics (AARRR), JTBD. |
| **brand-builder-ai** | `src/pages/BriefingPage.tsx`<br>`src/pages/BrandKitPage.tsx`<br>`src/pages/OnboardingPage.tsx`<br>`src/lib/canvasEngine.ts`<br>`supabase/functions/sw-briefing-generate/index.ts` | **Briefing & DNA:** Estruturação de DNA de marca, diferenciais competitivos, pilares de conteúdo, score de completude.<br>**Brand Kit:** Paletas, tipografia, logos, manifesto.<br>**Prompt LLaMA 70B:** Expansão automatizada de fragmentos para DNA estruturado. |
| **classificadoswaesy** | `supabase/functions/google-business/index.ts`<br>`src/hooks/useGoogleBusiness.ts`<br>`src/components/integrations/GoogleBusinessConnect.tsx` | **Google Meu Negócio:** Integração oficial com `mybusinessbusinessinformation.googleapis.com` e `mybusinessreviews.googleapis.com`. Gestão de conexões em `google_business_connections`. |
| **turisagencias** | `src/features/meta-editor/canvas`<br>`supabase/functions/google-business-post/index.ts` | Publicação de posts no Google Business e manipuladores visuais de canvas. |

---

## 3. Camada de IA do Waesy (Pool, Orquestrador, Roteador)

### 3.1 Localização do Orquestrador
- [`src/services/ai-core-gateway.functions.ts`](file:///c:/Users/Excelência Tour SMO/Documents/waesy/src/services/ai-core-gateway.functions.ts): Porta única canônica.
- [`src/services/api-orchestrator.functions.ts`](file:///c:/Users/Excelência Tour SMO/Documents/waesy/src/services/api-orchestrator.functions.ts): Gerenciador da pool `api_key_pools` e failover multimodelo.

### 3.2 Como Escolhe o Modelo e Regras de Fallback
1. **Prioridade de Provedores:**
   - Tarefas de texto/extração sem visão: `groq` (Qwen 3.8/Llama-3.3-70b ~200ms) → `gemini` (`gemini-2.5-flash`) → `openrouter` (`llama-3.3-70b-instruct`) → `openai` (`gpt-4o-mini`) → `anthropic`.
   - Tarefas multimodais com imagens/screenshots: `gemini` (`gemini-2.5-flash`) → `openai` (`gpt-4o-mini`) → `openrouter` → `anthropic`.
2. **Prioridade de Chaves:**
   - Chave manual (`overrideApiKey`).
   - BYOK do lojista (`secret_vault` / `tenant_ai_providers`).
   - Pool gerenciada da plataforma (`api_key_pools` ordenada por prioridade ASC).
   - Variáveis de ambiente (`GROQ_API_KEY`, `GEMINI_API_KEY`, `OPENROUTER_API_KEY`, `OPENAI_API_KEY`).
3. **Mecanismo de Falha e Circuit Breaker:**
   - Se um provedor/chave retornar HTTP 429, 401, 500 ou timeout, a função `markKeyError` registra o erro no banco e o loop avança imediatamente para o próximo provedor da cascata.
   - O Circuit Breaker em memória (`ProviderCircuit`) abre após 3 falhas consecutivas com cooldown de 60 segundos.

### 3.3 Logging de Custo Real e Margem
- Cada chamada executada via `executeAIGatewayCall` calcula o custo bruto em USD baseado no consumo de tokens de entrada e saída conforme tabela `MODEL_PRICING` (ex: Groq US$ 0.59 / US$ 0.79 por milhão; Gemini US$ 0.075 / US$ 0.30 por milhão).
- O registro é gravado em `public.ai_telemetry_logs`:
  `call_id`, `provider`, `model`, `input_tokens`, `output_tokens`, `cost_usd`, `latency_ms`, `user_id`, `store_id`, `created_at`.

---

## 4. Esquema de Banco de Dados Existente

### 4.1 Moeda da Plataforma & Ledger
- [`supabase/migrations/20260827200000_store_token_wallets_and_ledger.sql`](file:///c:/Users/Excelência Tour SMO/Documents/waesy/supabase/migrations/20260827200000_store_token_wallets_and_ledger.sql): Criação de `public.store_token_wallets` e `public.token_ledger_transactions`.
- [`supabase/migrations/20261117000000_bank_grade_token_ledger_and_tollbooth.sql`](file:///c:/Users/Excelência Tour SMO/Documents/waesy/supabase/migrations/20261117000000_bank_grade_token_ledger_and_tollbooth.sql): Implementação das RPCs `charge_token_tollbooth` (débito com lock de linha) e `credit_store_tokens_strict` (estorno transacional com idempotência e trilha criptográfica).

### 4.2 Brand Kits & Briefings
- [`supabase/migrations/20260907200000_bigtech_schema_harmonization_and_hardening.sql:82`](file:///c:/Users/Excelência Tour SMO/Documents/waesy/supabase/migrations/20260907200000_bigtech_schema_harmonization_and_hardening.sql#L82):
  - Tabela `public.brand_kits`: `id`, `store_id`, `brand_name`, `tagline`, `mission`, `vision`, `values`, `tone_of_voice`, `target_audience`, `primary_color`, `secondary_color`, `accent_color`, `typography`, `logo_url`, `icon_url`, `archetype`.
  - Tabela `public.briefings`: `id`, `store_id`, `title`, `business_model`, `swot_strengths`, `swot_weaknesses`, `swot_opportunities`, `swot_threats`, `competitors`, `ideal_customer_profile`.

### 4.3 DNA de Marca, 7 Pecados Capitais & SWOT
- [`supabase/migrations/20260911000000_squads_agentic_multimodal_master_catalog.sql:121`](file:///c:/Users/Excelência Tour SMO/Documents/waesy/supabase/migrations/20260911000000_squads_agentic_multimodal_master_catalog.sql#L121):
  - Tabela `public.brand_dna_profiles`: `store_id`, `archetype`, `archetype_justification`, `tone_of_voice`, `tone_rules`, `content_pillars`, `forbidden_words`, `color_palette`, `seven_sins_triggers` (JSONB com gatilhos para Orgulho, Ganância, Luxúria, Inveja, Gula, Ira, Preguiça), `swot_analysis` (JSONB com strengths, weaknesses, opportunities, threats).

### 4.4 Filas de Jobs Assíncronos
- [`supabase/migrations/20261206000000_v142_ai_core_gateway_pools_and_telemetry.sql:108`](file:///c:/Users/Excelência Tour SMO/Documents/waesy/supabase/migrations/20261206000000_v142_ai_core_gateway_pools_and_telemetry.sql#L108):
  - Tabela `public.ai_async_jobs`: `id`, `task`, `user_id`, `workspace_id`, `store_id`, `status`, `payload`, `result`, `error_message`, `progress_percent`, `started_at`, `finished_at`.

---

## 5. Comparativo Git Log / Diff: Pedido vs Realidade

1. **Pedido:** Pipeline de extração assíncrono real via Steel / Firecrawl / Groq com captura de screenshots, salvamento em storage e fallback público do Google Meu Negócio.
   **Realidade:** `magic-onboarding.functions.ts:65` chama apenas `extractContentMechanically` (cheerio básico via HTTP fetch). Zero chamadas a Firecrawl, zero capturas Steel, zero capturas salvas em storage.
2. **Pedido:** Concílio de IAs em 4 etapas (Visual, Copy, PR, Estratégia de Negócios/SWOT/BMC/Pecados, Mercado, Juiz) com persistência em `brand_kits`, `brand_dna_profiles` e `briefings`.
   **Realidade:** Executa um único prompt de 35 linhas que gera bio e 3 produtos simples. Tabelas `brand_kits`, `briefings` e `brand_dna_profiles` não são populadas durante o onboarding.
3. **Pedido:** Cobrança centralizada de 20.000 tokens da plataforma (`ONBOARDING_AI_COST`), estorno atômico em falha, erradicação do valor legado 300.
   **Realidade:** Hardcoded em `300` tokens em `magic-onboarding.functions.ts:228` e `magic-onboarding-card.tsx:96,127`.
4. **Pedido:** Progresso real baseado em jobs assíncronos e design silencioso sem animações fingidas.
   **Realidade:** `magic-onboarding-card.tsx:52` usa `setInterval` de 1800ms fingindo etapas de progresso no cliente.
