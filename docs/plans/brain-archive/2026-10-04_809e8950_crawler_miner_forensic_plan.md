# Plano de Implementação: Industrialização do Omni-Crawler & Mineradores Autônomos (Waesy)

## 1. Descrição do Objetivo & Arquitetura Alvo

Transformar a infraestrutura de mineração e crawlers da Waesy de uma estrutura estática/teórica para uma **esteira de indexação massiva, autônoma e 100% funcional**, eliminando crons fantasmas, mocks hardcoded e filas inertes.

### Principais Entregáveis:
1. **Endpoint de Worker Híbrido (`/api/cron/mining-worker`):** Recebe o acionamento agendado ou sob demanda, lê lotes pequenos (5 a 10 itens) de `crawl_queue` e executa a esteira sem estourar limites de timeout de serverless.
2. **Conexão Real do `pg_cron` via `pg_net`:** Atualização da stored procedure `dispatch_mining_cron` para invocar o worker HTTP com Bearer Token seguro.
3. **Roteador Polimórfico de Entidades:** Consumidor da fila com extração e tipagem especializada para:
   - `news_articles` (Notícias reais com imagens originais e curadoria editorial)
   - `jobs` (Vagas reais com empresa, salários em centavos, localização e WhatsApp/URL de candidatura)
   - `public_tenders` / compras públicas (Integração oficial REST com o PNCP)
   - `directory_listings` (Lugares reais via Nominatim com rating e reviews honestos, sem fake scores)
   - `economic_indicators` (Séries oficiais do Banco Central persistidas no banco)
4. **Erradicação Total de Mocks e Fallbacks Sintéticos:**
   - Remoção de `buildFallbackLawsuit` de `datajud-harvester.ts`.
   - Remoção de ratings fixos em `places-harvester.ts`.
   - Persistência real dos indicadores do BCB em vez de descartar dados.
5. **Higienização de Dados e Execução de Teste E2E Real:** Purgar processos jurídicos mock, resetar filas e validar a inserção de registros autênticos nas tabelas de produção.

---

## 2. Decisões Arquiteturais Alinhadas no Grill-Me

> [!IMPORTANT]
> **Decisões Homologadas com o Usuário:**
> - **Execução:** Arquitetura Híbrida (`pg_cron` chamando `/api/cron/mining-worker` via `pg_net` com token de segurança).
> - **Escopo:** Omni-Suite completa com extratores polimórficos para todas as 5 verticais ativas simultaneamente.
> - **Anti-Bot & Rate Limits:** Circuit Breaker com headers stealth, rotação de chaves Firecrawl/Steel, cooldown por domínio e **tolerância zero para dados sintéticos**.
> - **Higienização:** Remoção de mocks legados e reprocessamento das 121 URLs pendentes na `crawl_queue`.

---

## 3. Mudanças Propostas no Código & Banco de Dados

```
├── supabase/migrations/
│   └── [NEW] 20261231120000_industrialize_mining_cron_and_net.sql
├── src/routes/
│   └── [NEW] api.cron.mining-worker.ts
├── src/services/
│   ├── [MODIFY] mining.functions.ts
│   ├── [MODIFY] crawler-sources.functions.ts
│   └── mining/
│       ├── [MODIFY] datajud-harvester.ts
│       ├── [MODIFY] places-harvester.ts
│       ├── [NEW] job-opportunity-extractor.ts
│       └── [NEW] economic-indicators-persister.ts
└── scripts/
    └── [NEW] run_omni_crawler_batch.ts
```

---

### Componente 1: Banco de Dados & Conexão `pg_net`

#### [NEW] `supabase/migrations/20261231120000_industrialize_mining_cron_and_net.sql`
- Criação da tabela `economic_indicators` (se não existir) para armazenar os indicadores diários do Banco Central (IPCA, SELIC, CDI, Câmbio PTAX).
- Atualização da função `dispatch_mining_cron(p_job_type text)`:
  - Utiliza `net.http_post()` para acionar a URL da aplicação com o cabeçalho `Authorization: Bearer <CRON_SECRET>`.
  - Registra o status do disparo e a resposta HTTP no `scraper_audit_log`.
- Limpeza do registro mock em `mined_lawsuits` (`0001234-56.2024.8.24.0018`).

```sql
-- Exemplo de atualização de dispatch_mining_cron com pg_net:
CREATE OR REPLACE FUNCTION public.dispatch_mining_cron(p_job_type text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_schedule RECORD;
  v_app_url TEXT;
  v_cron_secret TEXT;
  v_request_id BIGINT;
BEGIN
  SELECT * INTO v_schedule FROM public.mining_schedules WHERE job_type = p_job_type AND is_active = true;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Job inativo ou inexistente: ' || p_job_type);
  END IF;

  -- Dispara worker HTTP via pg_net de forma assíncrona
  SELECT current_setting('app.settings.app_url', true) INTO v_app_url;
  IF v_app_url IS NULL OR v_app_url = '' THEN
    v_app_url := 'https://usewaesy.com';
  END IF;

  SELECT current_setting('app.settings.cron_secret', true) INTO v_cron_secret;

  SELECT net.http_post(
    url := v_app_url || '/api/cron/mining-worker',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || COALESCE(v_cron_secret, 'waesy_cron_internal_secret_2026')
    ),
    body := jsonb_build_object(
      'jobType', p_job_type,
      'triggeredAt', now()
    )
  ) INTO v_request_id;

  UPDATE public.mining_schedules SET last_run_at = now(), updated_at = now() WHERE job_type = p_job_type;

  INSERT INTO public.scraper_audit_log (scraper_name, status, metadata)
  VALUES (p_job_type || '-cron', 'dispatched_pg_net', jsonb_build_object('net_request_id', v_request_id));

  RETURN jsonb_build_object('success', true, 'net_request_id', v_request_id);
END;
$$;
```

---

### Componente 2: Endpoint HTTP do Worker em Segundo Plano

#### [NEW] `src/routes/api.cron.mining-worker.ts`
- Endpoint HTTP seguro (compatível com Cloudflare Pages / Nitro).
- Validação de Bearer Token (`CRON_SECRET` ou autorização de serviço).
- Orquestra a execução das 4 frentes conforme o `jobType`:
  - `continuous-crawler`: consome lote de 5 a 10 itens da `crawl_queue` usando o roteador polimórfico.
  - `rss-fetcher`: varre os feeds RSS ativos e enfileira novas matérias com deduplicação SHA-256.
  - `market-data`: busca os dados do Banco Central do Brasil e persiste em `economic_indicators`.
  - `cnpj-enrichment`: atualiza dados de empresas com score alto.

---

### Componente 3: Roteador Polimórfico de Entidades

#### [NEW] `src/services/mining/job-opportunity-extractor.ts`
- Parser especializado para portais de vagas (Balcão de Empregos, Sine, Vagas, InfoJobs).
- Extração de microdados `schema.org/JobPosting`:
  - Título da vaga (`title`)
  - Empresa contratante (`hiringOrganization.name`)
  - Salário (`baseSalary`, `minValue`, `maxValue`) convertido para centavos (`salary_min_cents`, `salary_max_cents`)
  - Tipo de contrato (`employmentType`: CLT, PJ, Estágio)
  - Modalidade (`workplace_type`: Presencial, Híbrido, Remoto)
  - Contato WhatsApp e link de inscrição (`apply_url`)
- Inserção atômica e deduplicada na tabela `jobs`.

#### [NEW] `src/services/mining/economic-indicators-persister.ts`
- Coleta as séries oficiais do BCB (IPCA, Selic, CDI, PTAX) e executa `upsert` na tabela `economic_indicators`.
- Elimina o descarte silencioso de dados em `dispatchScheduledMiningJobFn`.

#### [MODIFY] `src/services/mining.functions.ts`
- Refatoração de `processCrawlQueueBatch`:
  - Lê a coluna `entity_type` de cada item da `crawl_queue`.
  - Roteia `jobs_portal` $\rightarrow$ `job-opportunity-extractor` $\rightarrow$ `jobs`.
  - Roteia `tenders` $\rightarrow$ `pncp-extractor` $\rightarrow$ `public_tenders`.
  - Roteia `news` $\rightarrow$ `mechanical-extractor` + `editorial-squad` $\rightarrow$ `news_articles`.
  - Roteia `places` $\rightarrow$ `places-harvester` $\rightarrow$ `directory_listings`.
- Atualização de `dispatchScheduledMiningJobFn` para implementar os ramos `continuous-crawler` e `cnpj-enrichment`.

---

### Componente 4: Erradicação de Mocks e Tratamento Transparente de Erros

#### [MODIFY] `src/services/mining/datajud-harvester.ts`
- **Eliminar `buildFallbackLawsuit`**:
  - Quando a API pública do DataJud retornar 429 ou falha de rede e não houver dados reais, retornar `{ success: false, lawsuit: null, error: "DataJud temporariamente indisponível. Domínio em cooldown." }`.
  - NUNCA inserir `"Consumidor Requerente"`, `"Empresa Requerida S/A"` ou dados falsos.

#### [MODIFY] `src/services/mining/places-harvester.ts`
- Remover o valor fixo `rating: 4.5` e `reviewsCount: 15`.
- Se o OpenStreetMap Nominatim não trouxer rating, gravar `rating: null` e `reviews_count: 0`.

---

## 4. Plano de Verificação & Evidências

### 4.1 Testes Automatizados Locais
- `npm run test`: Execução da suíte completa de testes para garantir 0 regressões.
- `npm run typecheck`: Validação estrita de tipos TypeScript (Exit Code 0).
- `npm run build`: Build de produção (Vite + Cloudflare Pages Worker) sem erros.

### 4.2 Prova de Banco de Dados Supabase (Live)
- Executar um lote real do worker via script `run_omni_crawler_batch.ts`.
- Verificar no Supabase via MCP:
  - `jobs`: contagem de vagas reais $> 0$.
  - `news_articles`: publicação incremental de matérias reais com imagem original.
  - `economic_indicators`: tabela populada com séries reais do BCB.
  - `crawl_queue`: redução dos itens em `pending` e transição para `completed` com métricas reais.
  - `mined_lawsuits`: 0 registros fictícios/mocks.
