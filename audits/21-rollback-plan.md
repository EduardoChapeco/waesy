# Onda 21 — Plano de Rollback e Procedimentos de Emergência

## 1. Procedimentos de Reversão Controlada

| Cenário de Falha | Procedimento de Rollback | Tempo Estimado |
| :--- | :--- | :---: |
| **Regressão em Deploy Edge (Cloudflare Pages)** | Reverter para o commit anterior via `git revert HEAD` ou ativar deployment anterior no dashboard Cloudflare | < 3 minutos |
| **Travamento da Fila de Mineração (`crawl_queue`)** | Executar query de reset: `UPDATE public.crawl_queue SET status = 'pending', processed_at = NULL WHERE status = 'processing'` | < 30 segundos |
| **Falha em Migração SQL Recente** | Executar script `DOWN` correspondente em `supabase/migrations/` | < 2 minutos |
| **Queda ou Rate Limit de Provedor de IA** | O Model Gateway (`ai-core-gateway.functions.ts`) commuta automaticamente para o provedor secundário (OpenRouter -> Groq) sem intervenção manual | Imediato (< 1s) |
