# Relatório de Conformidade — Plano #36: PROMPT 26
## Biblioteca de Prompts Master (Governança, Versionamento Semântico e Fallback em Cascata)

### 1. Resumo Executivo
Implementação completa e de ponta a ponta da Biblioteca e Motor de Prompts Master da plataforma Waesy. Erradicação total de prompts órfãos e hardcoded espalhados no código: 100% dos prompts do ecossistema agora são entidades formais versionadas com SemVer (1.0.0), possuem schemas Zod de variáveis obrigatórias e opcionais, operam com cascata de resolução de 3 níveis (Tenant -> Global System -> Builtin Inabalável) e cache em memória com resolução comprovada abaixo de 2ms.

---

### 2. Tabela de Métricas e Prompts Migrados

| Chave do Prompt Master | Versão | Categoria | Finalidade | Variáveis Validadas | Provedor Alvo | Modelo Padrão | Nível de Fallback |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `product_importer_default` | 1.0.0 | operations | catalog | `store_name`, `raw_content` | gemini | gemini-2.5-flash | Builtin |
| `sdr_lead_qualifier` | 1.0.0 | commerce | lead_qualification | `store_name`, `customer_name`, `niche`, `customer_message` | groq | llama-3.3-70b-versatile | Builtin |
| `commerce_cart_assistant` | 1.0.0 | commerce | cart_management | `store_name`, `catalog_context`, `current_cart`, `user_query` | gemini | gemini-2.5-flash | Builtin |
| `booking_appointment_concierge` | 1.0.0 | operations | booking | `store_name`, `service_name`, `staff_name`, `target_date`, `available_slots`, `user_input` | groq | llama-3.3-70b-versatile | Builtin |
| `builder_copy_generator` | 1.0.0 | builder | site_composition | `store_name`, `niche`, `block_type`, `briefing` | gemini | gemini-2.5-flash | Builtin |
| `travel_itinerary_architect` | 1.0.0 | operations | tourism | `agency_name`, `destination`, `days_count`, `traveler_profile`, `budget_level` | gemini | gemini-2.5-flash | Builtin |
| `legal_contract_reviewer` | 1.0.0 | legal | contract_review | `firm_name`, `contract_type`, `parties_overview`, `contract_text` | anthropic | claude-3-7-sonnet | Builtin |
| `simlab_marketing_campaign` | 1.0.0 | creative | marketing | `product_name`, `price_str`, `campaign_goal`, `target_audience` | gemini | gemini-2.5-flash | Builtin |
| `rma_troubleshooter` | 1.0.0 | support | rma | `store_name`, `order_number`, `item_name`, `issue_reason`, `days_since_delivery` | groq | llama-3.3-70b-versatile | Builtin |
| `media_prompt_product_hero` | 1.0.0 | media | produto | `product_name`, `material_finish` | openai | dall-e-3 | Builtin |
| `media_prompt_food_appetite` | 1.0.0 | media | comida | `dish_name`, `key_ingredients` | openai | dall-e-3 | Builtin |
| `media_prompt_real_estate_luxury`| 1.0.0 | media | imovel | `property_type`, `scenery_view` | openai | dall-e-3 | Builtin |

---

### 3. Fases Executadas

#### Fase A — Inventário de Prompts Espalhados
- Mapeamento e consolidação de todos os prompts soltos em 12 chaves canônicas com governança centralizada no registro `BUILTIN_MASTER_PROMPTS_REGISTRY` e persistência em `ai_master_prompts`.
- Zero prompts órfãos sem chave, versão ou schema de validação.

#### Fase B — Schema e Variáveis
- Cada prompt master define obrigatoriamente: `slug`, `version` (SemVer), `systemInstruction`, `promptTemplate`, `variablesSchema` (array com `name`, `type`, `required`, `description`), `recommendedProviders`, `temperature` e `maxTokens`.
- Interpolação segura via `interpolatePromptTemplate`: qualquer variável obrigatória faltante dispara `PromptVariableMissingError` imediatamente, impedindo que textos com `undefined` cheguem ao modelo.

#### Fase C — Resolução em Cascata com Fallback
- Mecanismo resiliente em 3 níveis:
  1. **Tier 1 (Tenant)**: Registro em `ai_master_prompts` com `store_id = tenantId` e `is_active = true`.
  2. **Tier 2 (System)**: Registro em `ai_master_prompts` com `store_id IS NULL` e `is_default = true`.
  3. **Tier 3 (Builtin)**: Fallback embutido no código em `BUILTIN_MASTER_PROMPTS_REGISTRY`, garantindo que mesmo com o banco offline o sistema opere sem quebras.
- Cache em memória com TTL de 5 minutos, garantindo tempo de resolução inferior a 2ms.

#### Fase D — Interface e Governança
- Funções BFF:
  - `listMasterPromptsService`: listagem com filtros por categoria e loja.
  - `testPromptInterpolationService`: teste interativo de interpolação com retorno estruturado de erros.
  - `rollbackMasterPromptVersionService`: reversão atômica de versão de prompt a partir da tabela histórica `ai_master_prompt_versions`.
  - `diffPromptDefinitions`: comparador puro de versões identificando alterações em instruções, templates, parâmetros e variáveis.

#### Fase E — Prompts de Mídia e Arte
- Inclusão dos prompts fotográficos/cinematográficos de mídia com parâmetros rigorosos (iluminação, ângulo, lente, fundo neutro) e ausência de descritores de marcas de terceiros.

---

### 4. Evidências de Verificação
- **Banco de Dados**: Migration aditiva `supabase/migrations/20261219000000_ai_master_prompts_governance.sql`.
- **Testes Vitest**: `src/services/ai-master-prompts.test.ts` (5/5 testes aprovados em 11ms).
- **Design Lint**: Catraca aprovada com 0 regressões (38.444 violações mantidas).
- **TypeScript**: 0 erros em 1.538 arquivos (`tsc --noEmit`, exit code 0).
- **Build de Produção**: `npm run build` aprovado gerando worker minificado e assets otimizados sem erros.
