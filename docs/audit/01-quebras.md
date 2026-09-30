# Relatório Forense de Quebras do Onboarding IA — Waesy

**Data:** 2026-09-30  
**Status:** Diagnóstico com Prova Material (Fase 1)  
**Metodologia:** Inspeção estrita e rastreamento de ponta a ponta do fluxo. Proibido mock, proibido suposição.

---

## 1. Tabela Normativa de Quebras Identificadas

| # | Sintoma | O que aconteceu (causa raiz) | Evidência (arquivo:linha) | Severidade | Correção planejada |
|---|---|---|---|---|---|
| **Q-01** | Extração rasa e enganosa sem visão real ou bypass | Promete Firecrawl e Steel no cabeçalho, mas executa apenas `extractContentMechanically` (HTTP fetch e cheerio simples). Sem captura de tela, sem prints no storage, sem raspagem de dados profundos. | [`src/services/magic-onboarding.functions.ts:65`](file:///c:/Users/Excelência Tour SMO/Documents/waesy/src/services/magic-onboarding.functions.ts#L65) | **P0 (Crítica)** | Integrar pipeline assíncrono real via `scrapeUrl` (`firecrawl-client.ts`), invocando Firecrawl oficial com fallback para screenshot Steel.dev, persistindo prints em Supabase Storage. |
| **Q-02** | Injeção de produtos fake (Mock) em falha de visão | Ao falhar a extração com IA da imagem do cardápio, a função injeta um cardápio estático de 5 pratos falsos (*Filé Mignon*, *Iscas de Tilápia*, *Burger Artesanal*, etc.) com scores de confiança falsos (0.94 a 0.98). | [`src/services/multimodal-onboarding.functions.ts:200-256`](file:///c:/Users/Excelência Tour SMO/Documents/waesy/src/services/multimodal-onboarding.functions.ts#L200-L256) | **P0 (Crítica)** | Erradicar completamente o array de mock. Lançar erro explícito ou retornar array vazio com diagnóstico real sem fingir sucesso. |
| **Q-03** | Vácuo de Persistência Estratégica (DNA, Brandkit e Matrizes ignorados) | O onboarding grava apenas em `stores.settings` e `directory_listings`. As tabelas centrais `brand_kits`, `brand_dna_profiles` e `briefings` (SWOT, Business Model Canvas e 7 Pecados) ficam completamente vazias. | [`src/services/magic-onboarding.functions.ts:140-212`](file:///c:/Users/Excelência Tour SMO/Documents/waesy/src/services/magic-onboarding.functions.ts#L140-L212) | **P0 (Crítica)** | Conectar a persistência ponta a ponta: salvar cores/fontes em `brand_kits`, arquétipo/tom/7 pecados em `brand_dna_profiles`, e SWOT/BMC em `briefings`. |
| **Q-04** | Cobrança hardcoded defasada (300 tokens vs 20.000 exigidos) | O valor cobrado está cravado como literal `tokens: 300` no backend e espalhado na interface do usuário, sem construtor de configuração central. | [`src/services/magic-onboarding.functions.ts:228`](file:///c:/Users/Excelência Tour SMO/Documents/waesy/src/services/magic-onboarding.functions.ts#L228)<br>[`src/components/onboarding/magic-onboarding-card.tsx:96,127`](file:///c:/Users/Excelência Tour SMO/Documents/waesy/src/components/onboarding/magic-onboarding-card.tsx#L96) | **P0 (Crítica)** | Criar constante canônica central `ONBOARDING_AI_COST = 20000` em configuração central; atualizar o débito no `requireTokensOrTollbooth` e os rótulos de UI. |
| **Q-05** | UI com Timer Artificial (`setInterval`) simulando progresso | A interface roda um timer fake que troca mensagens a cada 1800ms enquanto aguarda a requisição HTTP síncrona, violando o design silencioso e a verdade operacional. | [`src/components/onboarding/magic-onboarding-card.tsx:52-54`](file:///c:/Users/Excelência Tour SMO/Documents/waesy/src/components/onboarding/magic-onboarding-card.tsx#L52-L54) | **P1 (Alta)** | Migrar o processamento para job assíncrono em `public.ai_async_jobs`, com barra de progresso alimentada pela coluna `progress_percent` real do banco. |
| **Q-06** | Ausência de Concílio de IAs (Chamada única sem squads) | O onboarding executa um único prompt de 35 linhas, sem especialização em squads de Design, Copy, PR, Estratégia de Negócios (SWOT/BMC/Pecados) e sem juiz de validação de evidências. | [`src/services/magic-onboarding.functions.ts:74-128`](file:///c:/Users/Excelência Tour SMO/Documents/waesy/src/services/magic-onboarding.functions.ts#L74-L128) | **P1 (Alta)** | Implementar o Concílio de 4 etapas através do orquestrador unificado, com squads especializados, esquemas Zod estritos, campos de `confidence` e `evidence[]`. |
| **Q-07** | Inexistência de integração com Google Meu Negócio no Onboarding | Nenhuma verificação de conta conectada ou extração de avaliações, categoria do Google ou fotos de fachada é executada no fluxo. | [`src/services/magic-onboarding.functions.ts:1-246`](file:///c:/Users/Excelência Tour SMO/Documents/waesy/src/services/magic-onboarding.functions.ts#L1-L246) | **P1 (Alta)** | Portar rotina de integração de `classificadoswaesy/supabase/functions/google-business` para consultar conta ativa ou realizar raspagem da página pública sem inventar dados. |
| **Q-08** | Desperdício de frameworks e prompts de elite prontos no legado | Conhecimento maduro de semiótica e branding (`brand.agent.ts`), inteligência OSINT (`sherlock.agent.ts`) e frameworks estratégicos (`frameworks.ts`) em `ENGIOS` não foram aproveitados no Waesy. | `ENGIOS/app/lib/squads/agents/brand.agent.ts`<br>`ENGIOS/app/lib/squads/core/frameworks.ts` | **P2 (Média)** | Portar e integrar a expertise dos agentes e frameworks estratégicos no Concílio de IAs do Waesy. |

---

## 2. Verificação Obrigatória por Itens Normativos

### a) Extração (Steel / Firecrawl / Groq)
- **Status:** **PARCIAL / QUEBRADO**
- **Evidência:** `magic-onboarding.functions.ts:65` ignora as APIs de Steel e Firecrawl e usa apenas fetch básico.
- **Falha Crítica:** `multimodal-onboarding.functions.ts:200-256` contém mock hardcoded em caso de falha de visão.

### b) Conexão com IA (Pool / Orquestrador / Roteamento)
- **Status:** **PARCIAL**
- **Evidência:** O onboarding chama `executeUnifiedAiCall`, que respeita o pool de chaves (`api_key_pools`), mas faz apenas 1 chamada monolítica em vez de acionar os squads e registrar a telemetria em `ai_telemetry_logs`.

### c) Cobrança (Moeda da Plataforma / Tollbooth)
- **Status:** **PARCIAL**
- **Evidência:** O Tollbooth ACID com estorno automático existe (`token-tollbooth.server.ts`), mas está configurado com o valor defasado de `300` tokens em `magic-onboarding.functions.ts:228`. Não há centralização em `ONBOARDING_AI_COST`.

### d) Persistência E2E
- **Status:** **QUEBRADO**
- **Evidência:** O resultado só é gravado em `stores.settings` e `directory_listings`. As tabelas `brand_kits`, `brand_dna_profiles` e `briefings` permanecem vazias.

### e) Google Meu Negócio
- **Status:** **QUEBRADO (Inexistente no fluxo)**
- **Evidência:** Nenhuma linha de código em `magic-onboarding.functions.ts` referencia o Google Meu Negócio ou a API Places.

### f) Interface com o Usuário (UI)
- **Status:** **PARCIAL / AI-SMELL**
- **Evidência:** Presença de timer simulado (`setInterval`) em `magic-onboarding-card.tsx:52` e badges com valores antigos de 300 tokens.

### g) Reuso de Legado (ENGIOS / SimLabs)
- **Status:** **QUEBRADO (Ignorado)**
- **Evidência:** Agentes de semiótica e inteligência de mercado do `ENGIOS` não foram portados.

---

## 3. Classificação Resumida por Etapa do Fluxo

| Etapa | Classificação | Justificativa |
|---|---|---|
| **1. Entrada e Validação** | **FUNCIONA** | Validação Zod da URL de entrada é funcional. |
| **2. Cobrança de Tokens** | **PARCIAL** | Mecânica ACID e estorno funcionam, mas valor (300) está errado e descentralizado. |
| **3. Web Scraping & Captura** | **QUEBRADO** | Não chama Firecrawl nem Steel; apenas cheerio síncrono. Sem prints. |
| **4. Google Meu Negócio** | **QUEBRADO** | Ausente no fluxo. |
| **5. Síntese e Concílio de IAs** | **PARCIAL** | 1 chamada simples sem squads, sem SWOT, sem BMC, sem 7 Pecados. |
| **6. Persistência de Dados** | **QUEBRADO** | Não grava em `brand_kits`, `brand_dna_profiles` ou `briefings`. |
| **7. Feedback na UI** | **PARCIAL** | Timer visual simulado sem sincronização com job real. |
