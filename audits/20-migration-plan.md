# Onda 20 — Plano de Migração Incremental e Segura

## 1. Princípios de Migração Sem Indisponibilidade (Zero-Downtime)

1. **Expansão antes de Contração (Expand & Contract Pattern):**
   - Ao adicionar novos campos ou refatorar tabelas (ex: `city` e `state` em `news_articles`), novas colunas são criadas primeiro com valores default ou nullable.
   - Os escritores (`crawlers`, forms) passam a gravar em ambas as colunas.
   - Um script de backfill popula os dados históricos.
   - Os leitores (`BFF`, queries) são migrados para a nova coluna.
   - A coluna antiga só é descontinuada após confirmação de zero consumidores ativos.

2. **Migrações Reversíveis:**
   - Toda migração em `supabase/migrations/` deve possuir sua contrapartida de rollback documentada no respectivo cabeçalho SQL.
