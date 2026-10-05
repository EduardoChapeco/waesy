# Onda 14 — Gaps de Observabilidade e Telemetria

## 1. Estado Atual da Observabilidade

O Waesy possui telemetria forense em camadas consolidadas:
- **Scraper Audit Log (`public.scraper_audit_log`):** Registra URL, latência (ms), tamanho retornado (bytes), código HTTP e total de registros gerados por execução de extração.
- **System Audit Log (`public.system_audit_logs`):** Ações administrativas e mutações de dados sensíveis.
- **AI Telemetry Logs (`public.ai_telemetry_logs`):** Consumo de tokens, latência de inferência e taxa de acerto do cache dinâmico.

---

## 2. Gaps Identificados para Evolução Futura

| Gap | Impacto Técnico | Mitigação Proposta | Prioridade |
| :--- | :--- | :--- | :---: |
| **Rastreamento de Tracing Distribuído (W3C TraceContext)** | Dificulta correlacionar uma requisição do frontend com o worker da Cloudflare e a query do Postgres | Inserção do header `traceparent` no client do TanStack Query propagado para `createServerFn` | P2 |
| **Métricas Agregadas de Circuit Breaker** | O estado do circuit breaker por domínio é volátil em memória | Persistência do estado do disjuntor na tabela `crawler_sources` (`is_blocked`, `cooldown_until`) | P2 |
| **Alerta em Tempo Real de Esgotamento de Fila** | Se o cron parar de disparar, a fila cresce sem notificação ativa | Alerta via Telegram / Webhook Discord quando `pending > 10.000` | P3 |
