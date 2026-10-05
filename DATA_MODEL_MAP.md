# DATA_MODEL_MAP.md — Mapa do Modelo de Dados e Relacionamentos Canônicos

## 1. Principais Relações de Dados

- **`stores`** (1) ---> (N) **`products`**
- **`stores`** (1) ---> (N) **`news_articles`** (slug único por loja: `(store_id, slug)`)
- **`stores`** (1) ---> (N) **`events`**
- **`stores`** (1) ---> (N) **`jobs`**
- **`users`** (1) ---> (N) **`orders`** ---> (N) **`order_items`**
- **`directory_listings`** (1) <---> (1) **`cnpj_market_audits`** (via CNPJ normalizado)
- **`crawl_queue`** (1) ---> (0..1) **`mined_articles`** ---> (0..1) **`news_articles`**

## 2. Índices de Indexação Contextual por Cidade
- `idx_news_articles_city_pub` (`city`, `status`, `published_at DESC`)
- `idx_directory_listings_cat_city` (`category`, `city`, `status`)
- `idx_mined_tenders_city_date` (`city`, `opening_date DESC`)
