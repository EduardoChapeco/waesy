# SPEC-OMNI-MINING-AND-INDUSTRIAL-SCRAPING-REENGINEERING: Reengenharia Industrial do Ecossistema Omni-Mining & Orquestração de Pools de IA

## 1. Contexto e Motivação
A plataforma Waesy opera uma malha distribuída de mineração e agregação contínua de dados urbanos, regionais e governamentais (vagas de emprego, notícias, diretório de empresas, licitações PNCP, processos judiciais e leilões).
A auditoria forense identificou oportunidades críticas de elevação para padrão industrial militar:
1. **Governança do Pool de Chaves de IA Gratuitas (FinOps & Resiliência):**
   A plataforma possui múltiplas chaves cadastradas em `api_key_pools` (Groq `eusouedu` e `excelenciatour.smo`, Firecrawl `excelenciatour.smo` e `eusouedu`, Gemini `eusoueduoficial`, Steel.dev). O orquestrador anteriormente selecionava apenas uma chave unitária por provedor, falhando precocemente sem alternar entre as chaves irmãs do mesmo provedor para exaurir os limites gratuitos antes de recorrer a provedores pagos ou com custos adicionais.
2. **Distribuição Inteligente por Afinidade de Carga:**
   - Groq (`qwen/qwen3.8-27b` e `llama-3.3-70b-versatile`): tarefas textuais de alta velocidade (200ms), curadoria editorial, parsing JSON e sanitização de empregos (30 RPM grátis).
   - Firecrawl: extração profunda de DOM para Markdown com rotação entre as 2 contas ativas (1.000 requisições/mês gratuitas).
   - Gemini (`gemini-2.5-flash`): multimodalidade, visão computacional, extração de imagens e OCR de documentos.
   - Steel.dev: headless browser para bypass anti-bot quando native-fetch e Firecrawl sofrerem bloqueios Cloudflare 403.
   - OpenRouter: gateway universal de contingência.
3. **Transporte Resiliente & Anti-Bot Fingerprinting:**
   Headers estáticos defasados devem ser atualizados para padrões modernos Chrome 134+ com Client Hints (`sec-ch-ua`, `sec-ch-ua-mobile`, `sec-ch-ua-platform`), controle de taxa com Token Bucket e Cooldown dinâmico com jitter exponencial.
4. **Autocura da Fila (Crawler Reaper) & Telemetria ACID:**
   Itens presos em `processing` há mais de 10 minutos devem ser automaticamente restaurados para `pending` com contadores de retry e todas as inferências de IA devem registrar telemetria granular em `ai_telemetry_logs`.

---

## 2. Requisitos em Sintaxe EARS

### 2.1 Orquestração Multi-Key com Rotação de Limites Gratuitos (Vetor C)
- **WHEN** qualquer serviço solicitar inferência generativa de IA (`executeUnifiedAiCall`) ou scraping web (`scrapeUrl`):
  - **THE SYSTEM SHALL** consultar todas as chaves ativas do provedor em `api_key_pools`, ordenando por menor `daily_request_count` e `last_used_at` mais antigo (`getAllActiveKeysForProvider`), balanceando o consumo entre as cotas gratuitas.
  - **THE SYSTEM SHALL** filtrar chaves que sofreram erro 429 (`rate_limit_exceeded`) nos últimos 5 minutos, salvo se todas as chaves do pool estiverem em cooldown.
  - **WHEN** uma chave de API falhar com status HTTP 429 ou 503:
    - **THE SYSTEM SHALL** registrar o erro com timestamp via `markKeyError` e imediatamente tentar a próxima chave ativa do mesmo provedor antes de acionar o próximo provedor da cascata.
  - **THE SYSTEM SHALL** registrar assincronamente em `ai_telemetry_logs` a latência, estimativa de tokens, provedor, modelo, tentativas e status de cada chamada.

### 2.2 Camada de Ingestão e Transporte Resiliente (Vetor A)
- **UBIQUITOUS**: Toda requisição HTTP executada por `fetchWithRetry` ou `fetchHtmlWithStealth` DEVE conter headers modernos de navegador (User-Agent Chrome 134+, `sec-ch-ua`, `accept-language: pt-BR,pt;q=0.9`, `priority: u=0, i`).
- **WHEN** uma requisição a um domínio retornar HTTP 429 ou 403 com desafio de bot (Cloudflare Ray, Turnstile, DataDome):
  - **THE SYSTEM SHALL** registrar cooldown progressivo no domínio com jitter exponencial e acionar o provedor subsequente da cascata (Native Fetch -> Firecrawl Pool -> Steel.dev Headless).

### 2.3 Integridade Mecânica & Anti-Shallow Gate (Vetor B)
- **UBIQUITOUS**: Nenhum extrator deve utilizar text-slicing ingênuo para derivar salários, datas ou títulos. Valores ausentes devem ser estritamente tipados como `null` ou `"A combinar"`.
- **WHEN** um artigo de notícia for processado para promoção em `news_articles`:
  - **THE SYSTEM SHALL** exigir densidade textual mínima de 3 seções ou parágrafos substantivos (>60 caracteres cada) e imagem de capa saudável e legítima, proibindo categoricamente placeholders sintéticos ou fotos de estoque genéricas (Truth Engine Invariant).

### 2.4 Enriquecimento Cruzado de Entidades e Estabelecimentos (Vetor D)
- **WHEN** um estabelecimento em `directory_listings` possuir `website_url` e CNPJ ausente:
  - **THE SYSTEM SHALL** varrer o website em busca de padrões fiscais de CNPJ (`\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}` ou 14 dígitos com validação algorítmica de Módulo 11).
  - **WHEN** o CNPJ for validado com sucesso, **THE SYSTEM SHALL** consultar a BrasilAPI para enriquecer Razão Social, CNAE Primário/Secundário, Sócios (QSA) e Endereço Fiscal.
  - **THE SYSTEM SHALL** assegurar que 100% dos estabelecimentos sem logotipo recebam favicon de alta resolução (128px) via endpoint canônico de domínio do Google.

### 2.5 Autocura de Fila e Polling Periódico (Vetor E)
- **UBIQUITOUS**: A rotina `reapStalledProcessingQueueItems` DEVE identificar itens em `crawl_queue` com status `processing` há mais de 10 minutos e restaurá-los deterministicamente para `pending` com incremento de contadores.
- **WHEN** `dispatchScheduledMiningJobFn` for acionada:
  - **THE SYSTEM SHALL** suportar os tipos `rss-fetcher`, `continuous-crawler`, `cnpj-enrichment`, `market-data`, `datajud-sync` e `queue-reaper`, atualizando a tabela `mining_schedules` com telemetria de execução.

---

## 3. Critérios de Aceite e Verificação
1. Suíte de testes unitários em Vitest cobrindo:
   - Rotação inteligente de chaves e failover multi-key.
   - Detecção de catálogo e spidering de links filhos.
   - Parsers estritos de salários e normalização BRL.
   - Validador algorítmico de CNPJ (Módulo 11).
2. Zero regressões no Design Lint (`node scripts/design-lint.mjs --ratchet` com Exit Code 0).
3. Compilação TypeScript limpa (`cmd /c "npm run typecheck"` com Exit Code 0).
4. Registro de decisão técnica DEC-217 em `docs/design/DECISIONS.md`.
