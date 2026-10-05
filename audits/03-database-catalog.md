# Onda 03 — Catálogo de Banco, Schemas e Tabelas

## 1. Visão Geral da Base de Dados

- **SGBD:** PostgreSQL 15/16 (Supabase Enterprise Managed)
- **Project ID:** `jfuebqmltksyznovhlwa`
- **Total de Tabelas no Schema `public`:** **537 tabelas base**
- **Migrações Aplicadas:** 256 migrações registradas em `_applied_migrations` e 52 migrações versionadas em `supabase/migrations/`
- **Políticas de Acesso:** RLS (Row Level Security) Deny-by-Default em tabelas sensíveis com leitura pública para catálogos civis.

---

## 2. Catalogação por Clusters de Domínio

### 2.1. Cluster de Ingestão, Crawling & Mineração Autônoma

| Tabela | Linhas Est. | Tamanho | Chave Primária | Finalidade Observada |
| :--- | :---: | :---: | :--- | :--- |
| `public.crawl_queue` | **7.337** | 7.352 kB | `id` (uuid) | Fila polimórfica de crawling (`status`, `priority`, `domain`, `entity_type`, `retry_count`) |
| `public.scraper_audit_log`| **945** | 584 kB | `id` (uuid) | Telemetria forense de extrações (latência, bytes, status HTTP, afetamento) |
| `public.mined_articles` | 100+ | 320 kB | `id` (uuid) | Buffer intermediário de notícias mineradas com pontuação do Integrity Gate |
| `public.mined_tenders` | **30** | 256 kB | `id` (uuid) | Editais de compras públicas e licitações do PNCP com detalhamento de itens |
| `public.economic_indicators`| **5** | 80 kB | `id` (uuid) | Séries temporais oficiais do Banco Central (Dólar, Euro, Selic, IPCA) |
| `public.crawler_sources` | **61** | 120 kB | `id` (uuid) | Catálogo de portais e feeds regionais cadastrados para ingestão |
| `public.rss_feed_items` | **99** | 304 kB | `id` (uuid) | Itens em cache capturados de feeds RSS/Atom |
| `public.mined_raw_extractions`| 3 | 152 kB | `id` (uuid) | Payloads brutos preservados (M01: Prova e imutabilidade) |

### 2.2. Cluster Cívico & Conteúdo Comunitário (100% Paridade com Criação Civil)

| Tabela | Linhas Est. | Tamanho | Índices-Chave | Relacionamento e Regras |
| :--- | :---: | :---: | :--- | :--- |
| `public.news_articles` | **49** | 520 kB | `idx_news_articles_city_pub`, `(store_id, slug)` | Notícias locais publicadas com `content_sections`, `tags` e `city` |
| `public.directory_listings`| **25** | 248 kB | `idx_directory_listings_cat_city`, `cnpj` | Empresas locais indexadas com enriquecimento oficial via BrasilAPI |
| `public.jobs` | **3** | 152 kB | `idx_jobs_status_created`, `idx_jobs_category` | Oportunidades de trabalho e vagas CLT/PJ com `location_city` |
| `public.events` | **1** | 240 kB | `external_ticket_url`, `event_date` | Agenda urbana, shows e eventos com link oficial de ingressos e RSVP |
| `public.event_news_relations`| - | 40 kB | `(event_id, news_article_id)` | Vínculo bidirecional entre evento e matéria de cobertura editorial |

### 2.3. Cluster de Inteligência de IA, Agentes & Copilot

| Tabela | Finalidade Observada |
| :--- | :--- |
| `public.chat_threads` | Sessões de chat do usuário com histórico, contexto e metadados de persona |
| `public.chat_messages` | Mensagens atômicas (role: user/assistant/tool) com payloads estruturados |
| `public.chat_artifacts` | Artefatos criados durante a conversa (código, documentos, visualizações) |
| `public.ai_agent_definitions` | Definições canônicas de agentes (prompts, papéis, restrições e ferramentas) |
| `public.ai_squad_definitions` | Composição de squads para execução de tarefas complexas |
| `public.ai_skills` | Registro de skills de IA disponíveis para o orquestrador |
| `public.ai_quality_benchmarks`| Bateria de avaliação automatizada de qualidade e groundedness |

---

## 3. Análise de Divergências: Banco Real vs. Migrações vs. Modelos Zod

- **Achado 1 (Reconciliado na Onda 00):** A tabela `news_articles` não possuía a coluna explícita `city` no schema legado, utilizando apenas arrays de `tags`. A migração `20270103000000_news_articles_city_indexation.sql` foi aplicada com sucesso, unificando a coluna `city` e os índices compostos com `directory_listings`, `jobs` e `events`.
- **Achado 2:** A tabela `crawl_queue` possui constraint `domain NOT NULL`. Todas as inserções automáticas devem obrigatoriamente computar `new URL(url).hostname`.
- **Achado 3:** Zero mocks no banco de dados. As tabelas civis de produção estão populadas exclusivamente com dados extraídos de fontes autênticas do Governo Federal, Tribunais, Banco Central e OpenStreetMap.
