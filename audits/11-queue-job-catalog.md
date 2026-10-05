# Onda 14 — Catálogo de Filas, Jobs e Workflows Duráveis

## 1. Topologia da Fila Assíncrona Principal (`public.crawl_queue`)

A tabela `public.crawl_queue` atua como a espinha dorsal de processamento assíncrono e desacoplado do sistema.

```sql
CREATE TABLE public.crawl_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url text NOT NULL,
  domain text NOT NULL,
  entity_type text NOT NULL, -- news | job | place | event | tender | indicator | legal
  status text NOT NULL DEFAULT 'pending', -- pending | processing | completed | failed
  priority integer DEFAULT 5, -- 0 (baixa) a 10 (máxima/imediata)
  retry_count integer DEFAULT 0,
  max_retries integer DEFAULT 3,
  error_message text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  processed_at timestamptz,
  store_id uuid REFERENCES public.stores(id)
);
```

---

## 2. Catálogo de Workflows do Sistema

| Workflow | Gatilho | Consumidor | Resiliência / Idempotência |
| :--- | :--- | :--- | :--- |
| **`batch_mining_execution`** | `pg_cron` (5 min) ou `/api/cron/mining-worker` | `executeCrawlQueueBatchDirect` | Trava itens em `processing`, retries automáticos com backoff, zero drop |
| **`places_cnpj_enrichment`** | Novo listing adicionado do OSM | `enrichPlacesBatch` | Consulta BrasilAPI com cache em `cnpj_market_audits`, idempotente por CNPJ |
| **`editorial_news_promotion`** | Artigo atinge score >= 70 | `crawler-batch-engine.ts` (Branch 8) | Deduplicação por `source_url`, geração de slug com sufixo determinístico |
| **`economic_indicators_sync`** | Diário às 09:00 e 18:00 BRT | `syncEconomicIndicators` | Upsert por `(indicator_name, reference_date)` |
| **`pncp_tenders_ingestion`** | Polling a cada 6h | `harvestPncpContracts` | Upsert por `contract_number`, persistência de itens detalhados |

---

## 3. Prevenção de Bloqueios e Dead-Letter
- **Travamento de Fila:** Itens presos em `processing` por mais de 30 minutos são resetados automaticamente para `pending`.
- **Esgotamento de Tentativas:** Ao atingir `retry_count >= 3`, o item transita para `failed` com registro do erro e o domínio sofre throttling no circuit breaker.
