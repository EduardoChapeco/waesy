# DATABASE_MODEL_AUDIT.md — Auditoria do Modelo de Dados e RLS
## Normalização, Denormalização Intencional, Índices e Políticas de Isolamento
**Data:** 2026-10-21  
**Módulo:** Turismo, Viagens & Lazer / Waesy  
**Status:** Auditado com Evidências de Migrations SQL  

---

### 1. Inventário de Tabelas do Domínio de Turismo

| Tabela | Chave Primária | Chaves Estrangeiras (FK) | Índices Principais | Políticas RLS Ativas |
| :--- | :--- | :--- | :--- | :--- |
| `travel_commercial_contacts` | `id UUID` | `store_id → stores(id)` | `(store_id, phone)`, `(store_id, status)` | Staff isolado por `store_id`; anônimo bloqueado. |
| `travel_interests` | `id UUID` | `contact_id → travel_commercial_contacts(id)`, `store_id → stores(id)` | GIN em `destinations`, GIN em `inclusions_wanted`, B-Tree `(store_id, status)` | Staff isolado por `store_id`; anônimo bloqueado. |
| `travel_opportunity_matches` | `id UUID` | `interest_id → travel_interests(id)`, `offer_id → classifieds(id)` | B-Tree `(store_id, match_score DESC)`, UNIQUE `(interest_id, offer_id)` | Staff isolado por `store_id`; anônimo bloqueado. |
| `travel_quotes` | `id UUID` | Nenhuma (suporta leads anônimos de vitrine) | `(status)`, `(created_at DESC)` | Insert público permitido; Select/Update restrito a autenticados. |
| `travel_proposals` | `id UUID` | `store_id → stores(id)`, `lead_id → leads_crm(id)` | `(store_id, status)`, `(proposal_number)` | Staff isolado por `store_id`; anônimo bloqueado. |
| `global_hotels` | `id UUID` | `destination_id → destinations(id)` | Trigram em `name`, GIN em `aliases` | Leitura pública global; gravação restrita a Staff/Admin. |
| `destinations` | `id UUID` | Nenhuma | `(slug)`, `(country_code)` | Leitura pública global; gravação restrita a Staff/Admin. |
| `tourism_trips` | `id UUID` | `store_id → stores(id)`, `bus_layout_id → vehicle_layouts(id)` | `(store_id, departure_date)` | Staff isolado por `store_id`; anônimo bloqueado. |
| `contracts` | `id UUID` | `store_id → stores(id)`, `customer_id → customers(id)` | `(contract_number)`, `(store_id, status)` | Staff isolado por `store_id`; signatário via token seguro. |
| `classifieds` | `id UUID` | `store_id → stores(id)` | GIN em `attributes`, B-Tree `(category, status, created_at DESC)` | Leitura pública para ativos; gravação restrita ao proprietário. |

---

### 2. Justificativa de Denormalização Intencional (`JSONB`)

O banco de dados utiliza denormalização intencional em 4 pontos estratégicos:
1. **`classifieds.attributes.excelencia_offer` (`JSONB`):**
   - *Por quê:* O pacote turístico é um snapshot comercial imutável no momento da publicação. Congelar hotel, voos, taxas e parcelamento em JSONB evita que mutações em cadastros mestres corrompam ofertas já divulgadas.
2. **`classifieds.attributes.story_document` (`JSONB`):**
   - *Por quê:* O scene graph do Story 9:16 contém elementos gráficos, camadas, overrides tipográficos e superfícies Liquid Glass que variam livremente sem necessidade de tabelas relacionais rígidas.
3. **`travel_interests.dates` e `party` (`JSONB`):**
   - *Por quê:* A flexibilidade de datas do passageiro pode assumir 4 formas distintas (`exact_dates`, `specific_month`, `specific_season`, `flexible_anytime`) e o grupo pode conter listas dinâmicas de idades de crianças.
4. **`travel_opportunity_matches.dimensions` (`JSONB`):**
   - *Por quê:* Preserva a decomposição algébrica do score (5 dimensões com pesos e justificativas) para visualização explicável instantânea sem recalcular.

---

### 3. Integridade e Cláusula Pétrea de Banco de Dados

- **Zero Comandos Destrutivos:** Todas as migrations utilizam `CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS` e `CREATE INDEX IF NOT EXISTS`.
- **Zero Risco de Perda de Dados:** Nenhum `DROP TABLE`, `DROP COLUMN` ou `TRUNCATE` é utilizado em todo o repositório.
